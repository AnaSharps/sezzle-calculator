package main

import "net/http"

// newRouter wires up routes and middleware. It is separate from main so
// that tests can exercise the full request/response pipeline without
// starting a real server.
func newRouter(allowedOrigin string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/calculate", calculateHandler)
	mux.HandleFunc("GET /health", healthHandler)

	return loggingMiddleware(corsMiddleware(allowedOrigin, mux))
}
