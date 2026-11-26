package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"reflect"
	"strconv"
	"strings"
	"time"
)

type judgeResult struct {
	Token         string `json:"token"`
	Stdout        string `json:"stdout"`
	Stderr        string `json:"stderr"`
	CompileOutput string `json:"compile_output"`
	Status        struct {
		ID          int    `json:"id"`
		Description string `json:"description"`
	} `json:"status"`
}
type caseResult struct {
	Passed   bool            `json:"passed"`
	Input    json.RawMessage `json:"input"`
	Expected json.RawMessage `json:"expected"`
	Actual   string          `json:"actual"`
	Message  string          `json:"message"`
}

func (s *Server) judge(ctx context.Context, method, path string, body any, out any) error {
	var data []byte
	var err error
	if body != nil {
		data, err = json.Marshal(body)
		if err != nil {
			return err
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, s.config.JudgeURL+path, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if s.config.JudgeToken != "" {
		req.Header.Set("X-Auth-Token", s.config.JudgeToken)
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("executor status %d", resp.StatusCode)
	}
	return json.NewDecoder(io.LimitReader(resp.Body, 1024*1024)).Decode(out)
}
func output(s string) string {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return "Invalid executor output"
	}
	if len(b) > 8192 {
		return string(b[:8192]) + "\n[output truncated]"
	}
	return string(b)
}
func check(id string, input, expected json.RawMessage, actual string) bool {
	var got, want any
	if json.Unmarshal([]byte(actual), &got) != nil || json.Unmarshal(expected, &want) != nil {
		return false
	}
	if id != "two-sum" {
		return reflect.DeepEqual(got, want)
	}
	var in struct {
		Nums   []int `json:"nums"`
		Target int   `json:"target"`
	}
	if json.Unmarshal(input, &in) != nil {
		return false
	}
	var indices []int
	if json.Unmarshal([]byte(actual), &indices) != nil || len(indices) != 2 {
		return false
	}
	a, b := indices[0], indices[1]
	return a >= 0 && b >= 0 && a < len(in.Nums) && b < len(in.Nums) && a != b && in.Nums[a]+in.Nums[b] == in.Target
}
func (s *Server) run(w http.ResponseWriter, r *http.Request, user, token string) {
	var input struct {
		ProblemID string `json:"problem_id"`
		Language  string `json:"language"`
		Code      string `json:"code"`
	}
	if decode(r, &input) != nil || len(input.Code) == 0 || len(input.Code) > 64000 || s.config.Languages[input.Language] == 0 {
		fail(w, 400, "Provide a supported language and code under 64 KB.")
		return
	}
	if !s.validID(w, input.ProblemID) {
		return
	}
	if s.config.JudgeURL == "" {
		fail(w, 503, "Code execution is not connected yet. Your draft can still be saved.")
		return
	}
	if !s.allow(user+":run", 5) {
		fail(w, 429, "You have reached five runs this minute. Take a moment to review, then try again.")
		return
	}
	select {
	case s.slots <- struct{}{}:
		defer func() { <-s.slots }()
	default:
		fail(w, 503, "All execution slots are busy. Try again shortly.")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 35*time.Second)
	defer cancel()
	fixtures := s.cases[input.ProblemID]
	submissions := make([]map[string]any, len(fixtures))
	for i, c := range fixtures {
		submissions[i] = map[string]any{"source_code": base64.StdEncoding.EncodeToString([]byte(input.Code)), "language_id": s.config.Languages[input.Language], "stdin": base64.StdEncoding.EncodeToString(c.Input), "cpu_time_limit": 2, "wall_time_limit": 5, "memory_limit": 128000, "max_file_size": 64, "enable_network": false, "number_of_runs": 1}
	}
	var created []judgeResult
	if err := s.judge(ctx, "POST", "/submissions/batch?base64_encoded=true", map[string]any{"submissions": submissions}, &created); err != nil || len(created) != len(fixtures) {
		fail(w, 502, "The execution service could not start your tests. Please try again.")
		return
	}
	tokens := make([]string, len(created))
	for i, c := range created {
		if c.Token == "" {
			fail(w, 502, "The execution service rejected a test.")
			return
		}
		tokens[i] = c.Token
	}
	var batch struct {
		Submissions []judgeResult `json:"submissions"`
	}
	ticker := time.NewTicker(650 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			fail(w, 504, "Tests took too long to finish. Your code is still in the editor.")
			return
		case <-ticker.C:
		}
		path := "/submissions/batch?tokens=" + url.QueryEscape(strings.Join(tokens, ",")) + "&base64_encoded=true&fields=token,stdout,stderr,compile_output,status"
		if err := s.judge(ctx, "GET", path, nil, &batch); err != nil || len(batch.Submissions) != len(fixtures) {
			fail(w, 502, "Could not retrieve test results. Please try again.")
			return
		}
		done := true
		for _, v := range batch.Submissions {
			if v.Status.ID <= 2 {
				done = false
			}
		}
		if done {
			break
		}
	}
	// Match by token instead of depending on the executor's result ordering.
	byToken := map[string]judgeResult{}
	for _, v := range batch.Submissions {
		byToken[v.Token] = v
	}
	results := make([]caseResult, len(fixtures))
	passed := 0
	for i, c := range fixtures {
		v, ok := byToken[tokens[i]]
		if !ok {
			fail(w, 502, "The executor returned incomplete results.")
			return
		}
		actual := output(v.Stdout)
		message := v.Status.Description
		pass := v.Status.ID == 3 && check(input.ProblemID, c.Input, c.Expected, strings.TrimSpace(actual))
		if pass {
			passed++
			message = "Passed"
		} else if v.Status.ID == 3 {
			message = "Output did not match the expected result."
		}
		if v.CompileOutput != "" {
			message = output(v.CompileOutput)
		} else if v.Stderr != "" {
			message = output(v.Stderr)
		}
		results[i] = caseResult{pass, c.Input, c.Expected, actual, message}
	}
	status := "in_progress"
	if passed == len(fixtures) {
		status = "solved"
	}
	// Database function updates acceptance atomically, preserving previous successes.
	err := s.db(ctx, "POST", "rpc/record_run", token, map[string]any{"p_problem_id": input.ProblemID, "p_code": input.Code, "p_language": input.Language, "p_passed": status == "solved"}, nil)
	warning := ""
	if err != nil {
		warning = "Tests completed, but progress could not be saved. Please retry when storage is available."
	}
	write(w, 200, map[string]any{"passed": passed, "total": len(fixtures), "cases": results, "saved": err == nil, "warning": warning, "summary": strconv.Itoa(passed) + " of " + strconv.Itoa(len(fixtures)) + " tests passed"})
}
