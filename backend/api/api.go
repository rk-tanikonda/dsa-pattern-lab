package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"dsa-pattern-lab/backend/content"
)

type Config struct {
	SupabaseURL, SupabaseKey string
	Languages                map[string]int
}
type Server struct {
	config Config
	client *http.Client
	cases  map[string][]testCase
	mu     sync.Mutex
	limits map[string]quota
	slots  chan struct{}
}
type quota struct {
	started time.Time
	count   int
}
type testCase struct {
	Input    json.RawMessage `json:"input"`
	Expected json.RawMessage `json:"expected"`
}
type progress struct {
	UserID    string `json:"user_id"`
	ProblemID string `json:"problem_id"`
	Status    string `json:"status"`
	Code      string `json:"code"`
	Language  string `json:"language"`
	UpdatedAt string `json:"updated_at"`
}
type note struct {
	UserID    string `json:"user_id"`
	ProblemID string `json:"problem_id"`
	Body      string `json:"body"`
	UpdatedAt string `json:"updated_at"`
}

func Environment() Config {
	return Config{SupabaseURL: strings.TrimRight(os.Getenv("SUPABASE_URL"), "/"), SupabaseKey: os.Getenv("SUPABASE_PUBLISHABLE_KEY"), Languages: map[string]int{"go": 1, "python": 1, "javascript": 1}}
}
func New(config Config) http.Handler {
	s := &Server{config: config, client: &http.Client{Timeout: 8 * time.Second}, cases: map[string][]testCase{}, limits: map[string]quota{}, slots: make(chan struct{}, 8)}
	if err := json.Unmarshal(content.Cases, &s.cases); err != nil {
		panic(err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		write(w, 200, map[string]any{"status": "ok", "accounts_configured": config.SupabaseURL != "" && config.SupabaseKey != ""})
	})
	mux.HandleFunc("GET /v1/catalog", s.protect(func(w http.ResponseWriter, r *http.Request, user, token string) {
		w.Header().Set("Cache-Control", "private, no-store")
		w.Header().Set("Content-Type", "application/json")
		w.Write(content.Catalog)
	}))
	mux.HandleFunc("GET /v1/state", s.protect(s.state))
	mux.HandleFunc("PUT /v1/progress/{id}", s.protect(s.saveProgress))
	mux.HandleFunc("PUT /v1/notes/{id}", s.protect(s.saveNote))
	// These routes are private Vercel service endpoints, never public rewrites.
	mux.HandleFunc("POST /v1/prepare", s.protect(s.prepareRun))
	mux.HandleFunc("POST /v1/complete", s.protect(s.completeRun))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "private, no-store")
		r.Body = http.MaxBytesReader(w, r.Body, 128*1024)
		mux.ServeHTTP(w, r)
	})
}
func write(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
func fail(w http.ResponseWriter, status int, message string) {
	write(w, status, map[string]string{"error": message})
}
func decode(r *http.Request, v any) error {
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		return errors.New("expected application/json")
	}
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		return err
	}
	if err := d.Decode(&struct{}{}); err != io.EOF {
		return errors.New("expected a single JSON object")
	}
	return nil
}
func (s *Server) protect(next func(http.ResponseWriter, *http.Request, string, string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.config.SupabaseURL == "" || s.config.SupabaseKey == "" {
			fail(w, 503, "Accounts are not configured yet.")
			return
		}
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") || len(header) > 8192 {
			fail(w, 401, "Sign in to continue.")
			return
		}
		token := strings.TrimPrefix(header, "Bearer ")
		if token == "" {
			fail(w, 401, "Sign in to continue.")
			return
		}
		// Verify every identity with Supabase Auth. Never trust a client-supplied user ID.
		req, err := http.NewRequestWithContext(r.Context(), "GET", s.config.SupabaseURL+"/auth/v1/user", nil)
		if err != nil {
			fail(w, 503, "Authentication is unavailable.")
			return
		}
		req.Header.Set("apikey", s.config.SupabaseKey)
		req.Header.Set("Authorization", header)
		resp, err := s.client.Do(req)
		if err != nil {
			fail(w, 503, "Authentication is temporarily unavailable.")
			return
		}
		defer resp.Body.Close()
		var user struct {
			ID        string `json:"id"`
			Anonymous bool   `json:"is_anonymous"`
		}
		if resp.StatusCode >= 500 {
			fail(w, 503, "Authentication is temporarily unavailable.")
			return
		}
		if resp.StatusCode != 200 || json.NewDecoder(io.LimitReader(resp.Body, 64*1024)).Decode(&user) != nil || user.ID == "" {
			fail(w, 401, "Your session expired. Please sign in again.")
			return
		}
		if user.Anonymous {
			fail(w, 401, "Sign in with a permanent account to continue.")
			return
		}
		var paid bool
		if err := s.db(r.Context(), "POST", "rpc/has_paid_access", token, map[string]any{}, &paid); err != nil {
			fail(w, 503, "Membership verification is unavailable.")
			return
		}
		if !paid {
			fail(w, 402, "An active paid membership is required.")
			return
		}
		if !s.allow(user.ID+":api", 120) {
			fail(w, 429, "Too many requests. Please try again in a minute.")
			return
		}
		next(w, r, user.ID, token)
	}
}
func (s *Server) allow(key string, max int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for k, v := range s.limits {
		if now.Sub(v.started) > time.Minute {
			delete(s.limits, k)
		}
	}
	q := s.limits[key]
	if q.started.IsZero() {
		q.started = now
	}
	q.count++
	s.limits[key] = q
	return q.count <= max
}
func (s *Server) db(ctx context.Context, method, path, token string, body any, out any) error {
	var payload io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		payload = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, s.config.SupabaseURL+"/rest/v1/"+path, payload)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", s.config.SupabaseKey)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "resolution=merge-duplicates,return=minimal")
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("storage status %d", resp.StatusCode)
	}
	if out != nil {
		return json.NewDecoder(io.LimitReader(resp.Body, 4*1024*1024)).Decode(out)
	}
	return nil
}
func (s *Server) state(w http.ResponseWriter, r *http.Request, user, token string) {
	ps := []progress{}
	ns := []note{}
	// Token and explicit owner filters both apply. RLS is the final ownership boundary.
	filter := "?user_id=eq." + url.QueryEscape(user)
	if err := s.db(r.Context(), "GET", "progress"+filter+"&select=problem_id,status,code,language,updated_at", token, nil, &ps); err != nil {
		fail(w, 502, "Could not load progress. Check the database migration and try again.")
		return
	}
	if err := s.db(r.Context(), "GET", "notes"+filter+"&select=problem_id,body,updated_at", token, nil, &ns); err != nil {
		fail(w, 502, "Could not load your notebook. Please try again.")
		return
	}
	write(w, 200, map[string]any{"progress": ps, "notes": ns})
}
func (s *Server) validID(w http.ResponseWriter, id string) bool {
	if _, ok := s.cases[id]; !ok {
		fail(w, 404, "Problem not found.")
		return false
	}
	return true
}
func (s *Server) saveProgress(w http.ResponseWriter, r *http.Request, user, token string) {
	id := r.PathValue("id")
	if !s.validID(w, id) {
		return
	}
	var p struct {
		Status   string `json:"status"`
		Code     string `json:"code"`
		Language string `json:"language"`
	}
	if decode(r, &p) != nil || len(p.Code) > 64000 || (p.Status != "in_progress" && p.Status != "review") || s.config.Languages[p.Language] == 0 {
		fail(w, 400, "Choose a supported language and a valid draft (maximum 64 KB).")
		return
	}
	// Never allow a draft save to erase an already accepted solution's status.
	existing := []progress{}
	if err := s.db(r.Context(), "GET", "progress?user_id=eq."+url.QueryEscape(user)+"&problem_id=eq."+url.QueryEscape(id)+"&select=status", token, nil, &existing); err != nil {
		fail(w, 502, "Could not check existing progress. Your draft has not been changed.")
		return
	}
	if len(existing) > 0 && existing[0].Status == "solved" && p.Status == "in_progress" {
		p.Status = "solved"
	}
	row := progress{user, id, p.Status, p.Code, p.Language, time.Now().UTC().Format(time.RFC3339)}
	if err := s.db(r.Context(), "POST", "progress?on_conflict=user_id,problem_id", token, row, nil); err != nil {
		fail(w, 502, "Could not save your draft. Please try again.")
		return
	}
	write(w, 200, row)
}
func (s *Server) saveNote(w http.ResponseWriter, r *http.Request, user, token string) {
	id := r.PathValue("id")
	if !s.validID(w, id) {
		return
	}
	var input struct {
		Body string `json:"body"`
	}
	if decode(r, &input) != nil || len(input.Body) > 32000 {
		fail(w, 400, "Notes must be valid text under 32 KB.")
		return
	}
	row := note{user, id, input.Body, time.Now().UTC().Format(time.RFC3339)}
	if err := s.db(r.Context(), "POST", "notes?on_conflict=user_id,problem_id", token, row, nil); err != nil {
		fail(w, 502, "Could not save your note. Please try again.")
		return
	}
	write(w, 200, row)
}
