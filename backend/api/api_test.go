package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"

	"dsa-pattern-lab/backend/content"
)

func call(h http.Handler, method, path, body, token string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}
func TestHealthAndCatalog(t *testing.T) {
	h := New(Config{})
	for _, path := range []string{"/healthz", "/v1/catalog"} {
		w := call(h, "GET", path, "", "")
		if w.Code != 200 {
			t.Fatalf("%s: %d", path, w.Code)
		}
	}
	w := call(h, "GET", "/v1/state", "", "")
	if w.Code != 503 {
		t.Fatalf("unconfigured auth: %d", w.Code)
	}
}
func TestAuthenticationAndOwnership(t *testing.T) {
	var storageCalls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("apikey") != "public-key" {
			t.Error("missing publishable key")
		}
		if r.URL.Path == "/auth/v1/user" {
			if r.Header.Get("Authorization") != "Bearer valid" {
				w.WriteHeader(401)
				return
			}
			write(w, 200, map[string]string{"id": "user-a"})
			return
		}
		storageCalls.Add(1)
		if r.Header.Get("Authorization") != "Bearer valid" || r.URL.Query().Get("user_id") != "eq.user-a" {
			t.Error("storage request did not preserve user token and owner filter")
		}
		write(w, 200, []any{})
	}))
	defer upstream.Close()
	h := New(Config{SupabaseURL: upstream.URL, SupabaseKey: "public-key"})
	for _, token := range []string{"", "invalid"} {
		if w := call(h, "GET", "/v1/state", "", token); w.Code != 401 {
			t.Errorf("token %q: %d", token, w.Code)
		}
	}
	if storageCalls.Load() != 0 {
		t.Fatal("unauthenticated request reached storage")
	}
	w := call(h, "GET", "/v1/state", "", "valid")
	if w.Code != 200 || storageCalls.Load() != 2 {
		t.Fatalf("state: %d %s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"notes":[]`) {
		t.Fatal("empty state should contain arrays")
	}
}
func TestDraftValidationAndPreserveSolved(t *testing.T) {
	var saved progress
	var writes atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/auth/v1/user" {
			write(w, 200, map[string]string{"id": "user-a"})
			return
		}
		if r.Method == "GET" {
			write(w, 200, []map[string]string{{"status": "solved"}})
			return
		}
		writes.Add(1)
		json.NewDecoder(r.Body).Decode(&saved)
		w.WriteHeader(201)
	}))
	defer upstream.Close()
	h := New(Config{SupabaseURL: upstream.URL, SupabaseKey: "public-key", Languages: map[string]int{"go": 60}})
	for _, body := range []string{`{"status":"solved","language":"go","code":"x"}`, `{"status":"in_progress","language":"shell","code":"x"}`, `{"status":"in_progress","language":"go","code":"x","user_id":"victim"}`, `{"status":"in_progress","language":"go","code":"x"} {}`, `{"status":"in_progress","language":"go","code":"` + strings.Repeat("x", 64001) + `"}`} {
		if w := call(h, "PUT", "/v1/progress/two-sum", body, "valid"); w.Code != 400 {
			t.Fatalf("invalid draft accepted: %d", w.Code)
		}
	}
	if writes.Load() != 0 {
		t.Fatal("invalid request reached storage")
	}
	w := call(h, "PUT", "/v1/progress/two-sum", `{"status":"in_progress","language":"go","code":"my draft"}`, "valid")
	if w.Code != 200 || saved.UserID != "user-a" || saved.Status != "solved" {
		t.Fatalf("draft lost owner or solved status: %d %+v", w.Code, saved)
	}
	if w := call(h, "PUT", "/v1/notes/missing", `{"body":"x"}`, "valid"); w.Code != 404 {
		t.Fatal("unknown note problem accepted")
	}
	if w := call(h, "PUT", "/v1/notes/two-sum", `{"body":"`+strings.Repeat("x", 32001)+`"}`, "valid"); w.Code != 400 {
		t.Fatal("oversized note accepted")
	}
}
func TestCheckers(t *testing.T) {
	input := json.RawMessage(`{"nums":[2,7,11,15],"target":9}`)
	expected := json.RawMessage(`[0,1]`)
	for _, tt := range []struct {
		out  string
		want bool
	}{{`[0,1]`, true}, {`[1,0]`, true}, {`[0,0]`, false}, {`[-1,0]`, false}, {`[0,7]`, false}, {`[0.5,1]`, false}, {`[0,1,2]`, false}, {`[0,1] debug`, false}, {`null`, false}} {
		if got := check("two-sum", input, expected, tt.out); got != tt.want {
			t.Errorf("%s: got %v", tt.out, got)
		}
	}
	if !check("contains-duplicate", nil, json.RawMessage(`false`), "false\n") {
		t.Fatal("boolean mismatch")
	}
	if check("contains-duplicate", nil, json.RawMessage(`false`), `"false"`) {
		t.Fatal("string passed boolean checker")
	}
	if check("sorted-squares", nil, json.RawMessage(`[]`), `null`) {
		t.Fatal("null passed array checker")
	}
}
func TestJudgeBatchAndStorageFailure(t *testing.T) {
	for _, storageFails := range []bool{false, true} {
		t.Run(map[bool]string{false: "saved", true: "storage unavailable"}[storageFails], func(t *testing.T) {
			var stored map[string]any
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/auth/v1/user" {
					write(w, 200, map[string]string{"id": "user-a"})
					return
				}
				if r.URL.Path != "/rest/v1/rpc/record_run" {
					t.Errorf("unexpected storage path: %s", r.URL.Path)
				}
				json.NewDecoder(r.Body).Decode(&stored)
				if storageFails {
					w.WriteHeader(500)
				} else {
					w.WriteHeader(204)
				}
			}))
			defer upstream.Close()
			answers := []string{"[1,0]", "[2,1]", "[1,0]", "[2,0]"}
			executor := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Header.Get("X-Auth-Token") != "executor-key" {
					t.Error("missing executor token")
				}
				if r.Method == "POST" {
					var data struct {
						Submissions []map[string]any `json:"submissions"`
					}
					json.NewDecoder(r.Body).Decode(&data)
					if len(data.Submissions) != 4 {
						t.Fatal("unexpected fixture count")
					}
					for _, s := range data.Submissions {
						if s["enable_network"] != false || s["cpu_time_limit"] != float64(2) || s["max_file_size"] != float64(64) {
							t.Error("missing sandbox limits")
						}
					}
					write(w, 201, []map[string]string{{"token": "a"}, {"token": "b"}, {"token": "c"}, {"token": "d"}})
					return
				}
				// Return reversed order to exercise token association.
				result := []map[string]any{}
				for i := 3; i >= 0; i-- {
					result = append(result, map[string]any{"token": string(rune('a' + i)), "stdout": base64.StdEncoding.EncodeToString([]byte(answers[i])), "status": map[string]any{"id": 3, "description": "Accepted"}})
				}
				write(w, 200, map[string]any{"submissions": result})
			}))
			defer executor.Close()
			h := New(Config{SupabaseURL: upstream.URL, SupabaseKey: "public-key", JudgeURL: executor.URL, JudgeToken: "executor-key", Languages: map[string]int{"go": 60}})
			w := call(h, "POST", "/v1/run", `{"problem_id":"two-sum","language":"go","code":"source"}`, "valid")
			var result struct {
				Passed  int    `json:"passed"`
				Saved   bool   `json:"saved"`
				Warning string `json:"warning"`
			}
			json.Unmarshal(w.Body.Bytes(), &result)
			if w.Code != 200 || result.Passed != 4 || result.Saved == storageFails || stored["p_passed"] != true {
				t.Fatalf("bad run result %d %s", w.Code, w.Body.String())
			}
			if storageFails && result.Warning == "" {
				t.Fatal("storage failure should be visible")
			}
		})
	}
}
func TestExecutorFailureAndRateLimit(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { write(w, 200, map[string]string{"id": "user-a"}) }))
	defer upstream.Close()
	executor := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(503) }))
	defer executor.Close()
	h := New(Config{SupabaseURL: upstream.URL, SupabaseKey: "public-key", JudgeURL: executor.URL, Languages: map[string]int{"go": 60}})
	for i := 0; i < 6; i++ {
		w := call(h, "POST", "/v1/run", `{"problem_id":"two-sum","language":"go","code":"source"}`, "valid")
		want := 502
		if i == 5 {
			want = 429
		}
		if w.Code != want {
			t.Errorf("run %d status %d, want %d", i, w.Code, want)
		}
	}
}
func TestCatalogAndFixtureIntegrity(t *testing.T) {
	frontend, err := os.ReadFile("../../src/content/catalog.json")
	if err != nil {
		t.Fatal(err)
	}
	var frontendData, backendData any
	if err := json.Unmarshal(frontend, &frontendData); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(content.Catalog, &backendData); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(frontendData, backendData) {
		t.Fatal("frontend/backend catalog drift")
	}
	var c struct {
		Problems []struct {
			ID      string `json:"id"`
			Example struct {
				Input  json.RawMessage `json:"input"`
				Output json.RawMessage `json:"output"`
			} `json:"example"`
		} `json:"problems"`
	}
	if err := json.Unmarshal(content.Catalog, &c); err != nil {
		t.Fatal(err)
	}
	var fixtures map[string][]testCase
	json.Unmarshal(content.Cases, &fixtures)
	if len(c.Problems) != 12 || len(fixtures) != 12 {
		t.Fatal("catalog and fixtures incomplete")
	}
	for _, p := range c.Problems {
		fs := fixtures[p.ID]
		if len(fs) < 4 {
			t.Errorf("%s has too few tests", p.ID)
		}
		if !check(p.ID, p.Example.Input, p.Example.Output, string(fs[0].Expected)) {
			t.Errorf("%s example does not match first fixture", p.ID)
		}
	}
}
func TestDatabaseFailureIsNotEmptySuccess(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/auth/v1/user" {
			write(w, 200, map[string]string{"id": "user-a"})
			return
		}
		w.WriteHeader(500)
	}))
	defer upstream.Close()
	h := New(Config{SupabaseURL: upstream.URL, SupabaseKey: "public-key"})
	if w := call(h, "GET", "/v1/state", "", "valid"); w.Code != 502 {
		t.Fatalf("database failure reported as success: %d", w.Code)
	}
}
func TestDecodeRejectsOversizedAndExtraData(t *testing.T) {
	var data map[string]any
	r := httptest.NewRequest("POST", "/", strings.NewReader(`{"x":1} {"x":2}`))
	r.Header.Set("Content-Type", "application/json")
	if decode(r, &data) == nil {
		t.Fatal("extra JSON accepted")
	}
	// Verify output cap and malformed executor encoding.
	if len(output(base64.StdEncoding.EncodeToString([]byte(strings.Repeat("x", 9000))))) > 8300 {
		t.Fatal("uncapped output")
	}
	if output("%") != "Invalid executor output" {
		t.Fatal("invalid base64 accepted")
	}
}
func TestStorageUsesUserToken(t *testing.T) {
	var got string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Get("Authorization")
		io.Copy(io.Discard, r.Body)
		w.WriteHeader(204)
	}))
	defer upstream.Close()
	s := Server{config: Config{SupabaseURL: upstream.URL, SupabaseKey: "anon"}, client: upstream.Client()}
	err := s.db(context.Background(), "POST", "notes", "private-user-token", map[string]string{"body": "private"}, nil)
	if err != nil || !reflect.DeepEqual(got, "Bearer private-user-token") {
		t.Fatal("user-scoped storage auth was lost")
	}
}
