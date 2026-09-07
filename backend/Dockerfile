FROM golang:1.27-alpine AS builder
WORKDIR /src
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 go build -o /out/calculator .

FROM alpine:3.20
RUN adduser -D -u 10001 appuser
COPY --from=builder /out/calculator /usr/local/bin/calculator
USER appuser
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/calculator"]
