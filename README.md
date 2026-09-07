# Sezzle Calculator

See [DESIGN_LOG.md](DESIGN_LOG.md) for the design decisions settled
before any code was written, and [PROMPTS.md](PROMPTS.md) for the
verbatim message log of how the implementation proceeded from there.

## Setup Instructions

Clone the repository, then pick one of the three ways to run it below.
Everything works with defaults out of the box: the backend expects
`PORT=8080` and `ALLOWED_ORIGIN=http://localhost:5173`, the frontend
expects `VITE_API_URL=http://localhost:8080`. Override either only by
copying the matching `.env.example` to `.env` in `backend/` or
`frontend/`.

- **Docker**: just Docker.
- **Local**: Go 1.27+, Node.js 20+, and npm.

## Running Frontend and Backend

### 1. Docker Compose (fastest)

From the repository root, with Docker running:

```
docker compose up --build
```

Backend on `http://localhost:8080`, frontend on `http://localhost:5173`.
Stop with `docker compose down`.

### 2. Docker, one side at a time

```
docker build -t sezzle-calculator-backend ./backend
docker run -p 8080:8080 sezzle-calculator-backend

docker build -t sezzle-calculator-frontend \
  --build-arg VITE_API_URL=http://localhost:8080 ./frontend
docker run -p 5173:80 sezzle-calculator-frontend
```

`VITE_API_URL` is a build argument, not a runtime one: Vite bakes it into
the bundle at build time, and the built frontend runs in the browser, so
it needs a URL the browser can reach, not one that only resolves inside
the Docker network.

### 3. Locally, without Docker

```
cd backend && go run .
```

In a second terminal:

```
cd frontend && npm install && npm run dev
```

Frontend at `http://localhost:5173`, backend at `http://localhost:8080`.

---

Tests: `go test ./...` in `backend/`, `npm test` in `frontend/`.
Coverage: `go test ./... -coverprofile=coverage.out && go tool cover -func=coverage.out`
in `backend/`, `npm run coverage` in `frontend/`. Committed summaries are at
`backend/coverage.txt` and `frontend/coverage-summary.txt`.

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

### What the frontend owns, and what it deliberately does not

- The frontend owns input handling (mapping button presses and keystrokes
  to tokens), display formatting (human readable text, the exponent
  superscript), and error rendering (validation vs. network failure). It
  is not "purely visual": it holds real state (the token sequence, the
  in-flight request, the last result or error).
- The frontend owns no arithmetic and no precedence resolution. It never
  computes `+`, `-`, `*`, `/`, `^`, `sqrt`, or `%`, and it never decides
  which operator binds tighter. It only assembles a canonical string from
  button presses and hands the whole string to `POST /api/calculate`.
- This mirrors the backend split: exactly one place owns evaluation logic
  (`backend/parser`), and exactly one place owns presentation and input
  state (`frontend/src/calculator`).

### Display string vs. canonical string

- Every button press appends one token to a `tokens: string[]` array,
  held in `useCalculator` (`frontend/src/calculator/useCalculator.ts`).
  Each token is already in canonical form: a digit, `.`, `+`, `-`, `*`,
  `/`, `^`, `%`, `(`, `)`, or the word `sqrt` for the square root button.
- `toCanonicalExpression` (`frontend/src/calculator/tokens.ts`) joins the
  tokens with no separators to build the exact string sent to
  `POST /api/calculate`. This is never generated from the display text.
- `buildDisplaySegments` (same file) walks the same token array to build
  what the user sees: it maps `*`, `/`, `sqrt`, and `-` through a single
  lookup table to `×`, `÷`, `√`, and `−`. Pressing `^` shows a literal
  `^` immediately, so the button press is never silently invisible; once
  a digit follows, that `^` is replaced by rendering the digit (and any
  further digits in that number) as a superscript, so `2`, `^`, `3`
  renders as `2^` and then `2³`, while the canonical string sent to the
  backend is `2^3` throughout.
- Two representations exist because the display needs to look like a
  calculator (operator glyphs, a raised exponent) while the backend
  grammar needs an unambiguous plain-text string. Deriving both from the
  same token array, rather than parsing the display text back into a
  request, means there is exactly one source of truth for what the user
  has typed, and the display can never drift out of sync with what gets
  sent.

### Continuing a calculation from a result

- After equals, the display shows the numeric result and the token
  sequence used to compute it is done with. Pressing a digit, `sqrt`, or
  `(` next discards that result and starts a brand new expression, since
  those tokens don't attach to a preceding value.
- Pressing a binary or postfix operator (`+ - * / ^ %`) instead
  continues from the result, the way every physical calculator behaves:
  `2+3*8`, `=` shows `26`; pressing `+` then seeds the next expression
  with the result's digits followed by `+`, so the display reads `26+`,
  and finishing with `4`, `=` sends `26+4` to the backend. This is
  implemented in `useCalculator.ts` by converting the result back into
  the same one-character-per-digit tokens a user would have typed
  (`formatResult(value).split('')`), so it behaves identically to manual
  entry for validation, superscript rendering, and everything else.

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
| `PORT` (backend) | `8080` | Port the HTTP server listens on. |
| `ALLOWED_ORIGIN` (backend) | `http://localhost:5173` | Origin permitted by CORS, the Vite dev server. |
| `VITE_API_URL` (frontend) | `http://localhost:8080` | Base URL the frontend sends `POST /api/calculate` and reads for `GET /health` against. |

- Documented in `backend/.env.example` and `frontend/.env.example`. Both
  `.env` files are gitignored.

### What was deliberately left out

- No calculation history, no persistence, no authentication, no rate
  limiting.
- The task is a stateless expression evaluator behind a single endpoint;
  none of the above are needed to satisfy that.
- Each would add surface area (a database, a session model, a limiter's
  storage) that nothing in the spec calls for. See Possible Extensions
  for what could be added if the scope changed.

### Non-test code size

Combined backend and frontend non-test code is around 1070 lines,
against the brief's target of roughly 700. The two largest contributors
are `backend/parser/parser.go` (the recursive descent parser itself,
where correctness matters more than brevity) and the frontend's
`styles.css` plus its component/type breakdown (`Display.tsx`,
`Keypad.tsx`, `Calculator.tsx`, `tokens.ts`, `useCalculator.ts`) needed
for the iOS-style UI. Nothing here is speculative abstraction; it is
kept over budget deliberately rather than trimmed at the cost of
readability or test coverage.

## Possible Extensions

- Context dependent percent (`200 + 10%` meaning ten percent of 200).
- Calculation history.
- Arbitrary precision arithmetic (`math/big` instead of `float64`).
