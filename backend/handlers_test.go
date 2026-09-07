package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const testOrigin = "http://localhost:5173"

func TestCalculateHandler_Success(t *testing.T) {
	router := newRouter(testOrigin)

	req := httptest.NewRequest(http.MethodPost, "/api/calculate", strings.NewReader(`{"expression":"5+3*8"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body = %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var body map[string]float64
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("could not decode response body %q: %v", rec.Body.String(), err)
	}
	if body["result"] != 29 {
		t.Errorf("result = %v, want 29", body["result"])
	}

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != testOrigin {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, testOrigin)
	}
}

func TestCalculateHandler_Errors(t *testing.T) {
	tests := []struct {
		name          string
		body          string
		wantStatus    int
		wantErrSubstr string
	}{
		{"division by zero", `{"expression":"5/0"}`, http.StatusBadRequest, "division by zero"},
		{"unbalanced parentheses", `{"expression":"(3+4"}`, http.StatusBadRequest, "unbalanced parentheses"},
		{"square root of negative", `{"expression":"sqrt(-4)"}`, http.StatusBadRequest, "square root of a negative number"},
		{"invalid character", `{"expression":"5&3"}`, http.StatusBadRequest, "unexpected character"},
		{"empty expression string", `{"expression":""}`, http.StatusBadRequest, "empty expression"},
		{"missing expression field", `{}`, http.StatusBadRequest, "expression must be a string"},
		{"non-string expression field", `{"expression":5}`, http.StatusBadRequest, "expression must be a string"},
		{"malformed JSON", `{"expression":`, http.StatusBadRequest, "malformed JSON"},
		{"not a JSON object", `[1,2,3]`, http.StatusBadRequest, "malformed JSON"},
	}

	router := newRouter(testOrigin)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/calculate", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body = %s", rec.Code, tt.wantStatus, rec.Body.String())
			}

			var body map[string]string
			if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
				t.Fatalf("could not decode response body %q: %v", rec.Body.String(), err)
			}
			if !strings.Contains(body["error"], tt.wantErrSubstr) {
				t.Errorf("error = %q, want it to contain %q", body["error"], tt.wantErrSubstr)
			}
		})
	}
}

func TestCalculateHandler_BodyTooLarge(t *testing.T) {
	router := newRouter(testOrigin)

	huge := `{"expression":"` + strings.Repeat("1+", 2000) + `1"}`
	req := httptest.NewRequest(http.MethodPost, "/api/calculate", strings.NewReader(huge))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body = %s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}

	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("could not decode response body %q: %v", rec.Body.String(), err)
	}
	if !strings.Contains(body["error"], "too large") {
		t.Errorf("error = %q, want it to mention the body being too large", body["error"])
	}
}

func TestCalculateHandler_WrongMethod(t *testing.T) {
	router := newRouter(testOrigin)

	for _, method := range []string{http.MethodGet, http.MethodPut, http.MethodDelete} {
		t.Run(method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/api/calculate", nil)
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusMethodNotAllowed {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
			}
		})
	}
}

func TestCorsPreflight(t *testing.T) {
	router := newRouter(testOrigin)

	req := httptest.NewRequest(http.MethodOptions, "/api/calculate", nil)
	req.Header.Set("Origin", testOrigin)
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != testOrigin {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, testOrigin)
	}
}

func TestHealthHandler(t *testing.T) {
	router := newRouter(testOrigin)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("could not decode response body %q: %v", rec.Body.String(), err)
	}
	if body["status"] != "ok" {
		t.Errorf("status field = %q, want %q", body["status"], "ok")
	}
}

func TestCalculateHandler_RejectsNonJSONBody(t *testing.T) {
	router := newRouter(testOrigin)

	req := httptest.NewRequest(http.MethodPost, "/api/calculate", bytes.NewReader([]byte("not json at all")))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body = %s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
}
