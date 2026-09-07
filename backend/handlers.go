package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"sezzle-calculator/backend/parser"
)

// maxRequestBytes bounds the request body size. Expressions are short, so
// there is no legitimate reason for a request to be larger than this.
const maxRequestBytes = 1 << 10 // 1 KiB

type calculateRequest struct {
	Expression interface{} `json:"expression"`
}

type calculateResponse struct {
	Result float64 `json:"result"`
}

type errorResponse struct {
	Error string `json:"error"`
}

// calculateHandler validates the request shape, hands the expression to the
// parser package, and maps the outcome to an HTTP status code and JSON
// body. It contains no arithmetic or parsing logic of its own.
func calculateHandler(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("recovered from panic handling %s: %v", r.URL.Path, rec)
			writeError(w, http.StatusBadRequest, "invalid expression")
		}
	}()

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)

	var req calculateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			writeError(w, http.StatusBadRequest, "request body too large")
			return
		}
		writeError(w, http.StatusBadRequest, "malformed JSON")
		return
	}

	expression, ok := req.Expression.(string)
	if !ok {
		writeError(w, http.StatusBadRequest, "expression must be a string")
		return
	}

	result, err := parser.Evaluate(expression)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, calculateResponse{Result: result})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, errorResponse{Error: message})
}
