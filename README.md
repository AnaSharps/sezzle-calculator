# Sezzle Calculator

## Setup Instructions

(to be filled in)

## Running Frontend and Backend

(to be filled in)

## API Examples

The commands and responses below are real output, captured by running the
backend locally (`PORT=8080 ALLOWED_ORIGIN=http://localhost:5173`) and
sending each request with curl.

### Success

```
curl -s -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "5+3*8"}'
```

```
{"result":29}
```

### Division by zero

```
curl -s -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "5/0"}'
```

```
{"error":"division by zero"}
```

### Unbalanced parentheses

```
curl -s -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "(3+4"}'
```

```
{"error":"unbalanced parentheses"}
```

### Square root of a negative number

```
curl -s -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "sqrt(-4)"}'
```

```
{"error":"square root of a negative number"}
```

### Invalid character

```
curl -s -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "5&3"}'
```

```
{"error":"unexpected character \"\\u0026\""}
```

Go's JSON encoder escapes the ampersand character as `\u0026` by default.
It decodes back to a plain ampersand in any JSON parser, including the
browser's, so the frontend sees the message exactly as written.

### Health check

```
curl -s http://localhost:8080/health
```

```
{"status":"ok"}
```

### Wrong method

```
curl -s -i -X GET http://localhost:8080/api/calculate
```

```
HTTP/1.1 405 Method Not Allowed
Allow: POST
Method Not Allowed
```

## Design Decisions and Assumptions

### Grammar and precedence

All parsing and evaluation happens in `backend/parser`, a recursive descent
parser and evaluator with no HTTP awareness. It implements this grammar,
lowest precedence first:

```
expression := term (("+" | "-") term)*
term       := factor (("*" | "/") factor)*
factor     := ("-" | "sqrt") factor | power
power      := postfix ("^" factor)?
postfix    := primary ("%")*
primary    := NUMBER | "(" expression ")"
```

Each grammar rule is one function (`parseExpression`, `parseTerm`,
`parseFactor`, `parsePower`, `parsePostfix`, `parsePrimary`), and each
function evaluates directly to a `float64` as it parses rather than building
a separate AST, since the grammar has no need to be walked more than once.

This grammar produces precedence and associativity that were verified with
`go test ./...` in `backend/parser`:

- `sqrt` binds only to the factor immediately after it, not to a whole
  trailing expression, because `factor := ("-" | "sqrt") factor` recurses
  into another `factor`, not an `expression`. `sqrt9+4` parses as
  `(sqrt 9) + 4 = 7`. Parentheses group first, so `sqrt(9+4)` parses as
  `sqrt(13) ≈ 3.6056`.
- `^` is right associative because, in `parsePower`, the exponent is parsed
  by calling `parseFactor` (which can itself contain another `power`)
  rather than by looping. `2^3^2` parses as `2^(3^2) = 2^9 = 512`.
- Unary minus is a `factor`, applied after `power` has resolved any `^`
  on its operand, so `-2^2` parses as `-(2^2) = -4`, not `(-2)^2`.
- `%` is a postfix operator on `postfix := primary ("%")*`, evaluating to
  division by one hundred applied to whatever precedes it. `50%` is `0.5`.
  Because it is postfix and not an infix operator, two operands with a `%`
  between them and no operator, such as `200%10`, have nothing to combine
  the second operand with once the `%` is consumed, and the parser reports
  it as a parse error (unexpected token) rather than silently accepting it.

### Why the parser is a separate package from the HTTP layer

- `backend/parser` imports nothing from `net/http` and knows nothing about
  JSON, status codes, or requests. Its entire public surface is
  `Evaluate(expression string) (float64, error)`.
- `backend/handlers.go` is the only place that knows a 400 means "bad
  expression" and a 200 means "here is the result": it decodes the
  request, calls `parser.Evaluate`, and maps the returned error to a
  status code.
- Evaluation logic exists in exactly one place and is tested in isolation
  (the parser's table-driven tests, no HTTP server involved). Handler
  tests only need to check plumbing (status codes, JSON shape, routing),
  not re-verify arithmetic.

### Why the standard library instead of a web framework

- The API surface is two routes (`POST /api/calculate`, `GET /health`)
  with a couple of small middleware functions for logging and CORS.
- `net/http`'s method-aware `ServeMux` (`"POST /api/calculate"`) already
  provides routing and automatic 405 responses for the wrong method on a
  registered path, which is what a framework's router would otherwise do.
- A framework would add a dependency and a learning curve without
  removing any real work here.

### Why float64

- `float64` is used throughout instead of `math/big`. It is adequate for
  a calculator that displays a handful of significant digits, and it is
  what every operator in the grammar (`+ - * / ^ sqrt %`) already uses via
  the standard library's `math` package.
- Explicit limitation: `float64` has about 15 to 17 significant decimal
  digits, so expressions needing exact decimal arithmetic (currency
  totals, for example) or numbers outside its range will lose precision
  or overflow.
- Overflow to `+Inf`/`-Inf` or `NaN` is caught and rejected as an error,
  rather than returned as a wrong answer.
- Arbitrary precision arithmetic was deliberately left out; see Possible
  Extensions.

### Why a single /api/calculate endpoint

- One endpoint accepts a full expression string, rather than one endpoint
  per operation (`/add`, `/multiply`, and so on).
- Precedence and associativity stay inside the parser, where the grammar
  already encodes them.
- An endpoint-per-operation design would either need the client to
  resolve precedence itself before choosing which endpoint to call
  (reintroducing arithmetic on the frontend, which this project
  deliberately avoids), or would need to encode a whole expression tree
  as request parameters, more complex than a single string for no
  benefit.

### Why context dependent percent was not implemented

- The grammar treats `%` as a postfix operator meaning division by one
  hundred (`postfix := primary ("%")*`), verified in Stage 1's tests
  (`50%` is `0.5`).
- A context dependent percent, where `200 + 10%` means ten percent of
  200 rather than 0.1, was deliberately left out.
- Its meaning depends on which operator precedes it and differs between
  calculators, and would require the parser to special-case `%` next to
  `+`/`-` versus `*`/`/`, conflicting with treating it as a single,
  consistent postfix operator.
- See Possible Extensions.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | Port the HTTP server listens on. |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | Origin permitted by CORS, the Vite dev server. |

- Documented in `backend/.env.example`. `.env` itself is gitignored.
- The frontend's `VITE_API_URL` variable is added to this table once the
  frontend stage introduces it.

### What was deliberately left out

- No calculation history, no persistence, no authentication, no rate
  limiting.
- The task is a stateless expression evaluator behind a single endpoint;
  none of the above are needed to satisfy that.
- Each would add surface area (a database, a session model, a limiter's
  storage) that nothing in the spec calls for. See Possible Extensions
  for what could be added if the scope changed.

## Possible Extensions

- Context dependent percent (`200 + 10%` meaning ten percent of 200).
- Calculation history.
- Arbitrary precision arithmetic (`math/big` instead of `float64`).
