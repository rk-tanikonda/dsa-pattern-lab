package api

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"reflect"
	"strconv"
	"strings"
)

type caseResult struct {
	Passed   bool            `json:"passed"`
	Input    json.RawMessage `json:"input"`
	Expected json.RawMessage `json:"expected"`
	Actual   string          `json:"actual"`
	Message  string          `json:"message"`
}
type runInput struct {
	ProblemID string `json:"problem_id"`
	Language  string `json:"language"`
	Code      string `json:"code"`
}
type executionOutput struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exit_code"`
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

func (s *Server) validRun(w http.ResponseWriter, input runInput) bool {
	if len(input.Code) == 0 || len(input.Code) > 64000 || s.config.Languages[input.Language] == 0 {
		fail(w, 400, "Provide a supported language and code under 64 KB.")
		return false
	}
	return s.validID(w, input.ProblemID)
}
func (s *Server) prepareRun(w http.ResponseWriter, r *http.Request, user, token string) {
	var input runInput
	if decode(r, &input) != nil {
		fail(w, 400, "Invalid run request.")
		return
	}
	if !s.validRun(w, input) {
		return
	}
	var allowed bool
	if err := s.db(r.Context(), "POST", "rpc/consume_run_slot", token, map[string]any{}, &allowed); err != nil {
		fail(w, 503, "Execution limits are unavailable. Your draft can still be saved.")
		return
	}
	if !allowed {
		fail(w, 429, "Your practice run limit has been reached (5 per minute, 50 per day, 500 per month). Check Billing & usage for your allowance.")
		return
	}
	inputs := make([]json.RawMessage, len(s.cases[input.ProblemID]))
	for i, c := range s.cases[input.ProblemID] {
		inputs[i] = c.Input
	}
	write(w, 200, map[string]any{"inputs": inputs})
}
func (s *Server) completeRun(w http.ResponseWriter, r *http.Request, user, token string) {
	var input struct {
		runInput
		Outputs []executionOutput `json:"outputs"`
	}
	if decode(r, &input) != nil {
		fail(w, 400, "Invalid execution result.")
		return
	}
	if !s.validRun(w, input.runInput) {
		return
	}
	fixtures := s.cases[input.ProblemID]
	if len(input.Outputs) != len(fixtures) {
		fail(w, 400, "Incomplete execution results.")
		return
	}
	results := make([]caseResult, len(fixtures))
	passed := 0
	for i, c := range fixtures {
		v := input.Outputs[i]
		actual := output(v.Stdout)
		pass := v.ExitCode == 0 && check(input.ProblemID, c.Input, c.Expected, strings.TrimSpace(actual))
		message := "Output did not match the expected result."
		if pass {
			passed++
			message = "Passed"
		} else if v.ExitCode != 0 {
			message = "Execution failed or exceeded the time limit."
		}
		if v.Stderr != "" {
			message = output(v.Stderr)
		}
		results[i] = caseResult{pass, c.Input, c.Expected, actual, message}
	}
	err := s.db(r.Context(), "POST", "rpc/record_run", token, map[string]any{"p_problem_id": input.ProblemID, "p_code": input.Code, "p_language": input.Language, "p_passed": passed == len(fixtures)}, nil)
	warning := ""
	if err != nil {
		warning = "Tests completed, but progress could not be saved. Please retry when storage is available."
	}
	write(w, 200, map[string]any{"passed": passed, "total": len(fixtures), "cases": results, "saved": err == nil, "warning": warning, "summary": strconv.Itoa(passed) + " of " + strconv.Itoa(len(fixtures)) + " tests passed"})
}
