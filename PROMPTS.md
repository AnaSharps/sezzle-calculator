# PROMPTS.md

This file is a verbatim, in-order record of every message sent to the assistant while building this project. Messages are not paraphrased, summarised, tidied, or reworded. Corrections to earlier work are kept alongside the original rather than replacing it.

## Setup

### Message 1

```
touch BRIEF.md
<command-name>/login</command-name>
            <command-message>login</command-message>
            <command-args></command-args>
<local-command-stdout>Login successful</local-command-stdout>
```

### Message 2

```
cat > BRIEF.md << 'ENDOFBRIEF'
```

### Message 3

```
cat > BRIEF.md
```

### Message 4

```
cat > BRIEF.md << Build a full-stack calculator take-home assessment. Go backend, React with TypeScript frontend, one Git repo with /backend and /frontend.

Core design rule: all arithmetic and all expression parsing happen in the Go backend. The frontend performs no arithmetic and no precedence resolution of any kind. The frontend builds an expression string from button presses and sends it to the backend when equals is pressed.

Backend, in /backend

Go, standard library only. No third party dependencies, no web framework.

One endpoint: POST /api/calculate, request body {"expression": "5+3*8"}, success response {"result": 29}, error response {"error": "division by zero"} with status 400.

Return 405 for any method other than POST. Never return 500 for bad client input.

Write a recursive descent parser and evaluator in its own package with no HTTP awareness. The HTTP handler validates the request shape, calls the parser, and maps errors to status codes. This separation is the primary thing being evaluated.

Grammar, lowest precedence first:

expression := term (("+" | "-") term)*
term       := factor (("*" | "/") factor)*
factor     := ("-" | "sqrt") factor | power
power      := postfix ("^" factor)?
postfix    := primary ("%")*
primary    := NUMBER | "(" expression ")"

Consequences this grammar must produce, and which the tests must assert:

sqrt9+4 evaluates to 7, because sqrt binds to the immediately following factor only
sqrt(9+4) evaluates to approximately 3.6056, because parentheses group first
2^3^2 evaluates to 512, exponentiation is right associative
-2^2 evaluates to -4
50% evaluates to 0.5, percent is postfix and means division by one hundred
200%10 is a parse error, since two operands sit adjacent with no operator

Return 400 with a clear message for: division by zero, square root of a negative number, unbalanced parentheses, unexpected or invalid character, empty expression, a missing or non-string expression field, malformed JSON, and any result that is NaN or Infinity.

Use float64. Do not use math/big.

Add CORS headers permitting the Vite dev origin, and handle the OPTIONS preflight.

Tests: table-driven, in the parser package, covering every operator, precedence interactions, associativity, and every error case listed above. Separate handler tests using net/http/httptest asserting status codes and JSON response shape.

Idiomatic Go throughout. Errors returned, never panicked. No getters and setters. No interface with a single implementation. Recover from any parser panic at the handler boundary as a safety net, but the parser should not panic in the first place.

Frontend, in /frontend

Vite, React, TypeScript. Plain CSS in a single stylesheet. No Tailwind, no component library, no state management library.

Click driven calculator UI modelled on the iOS calculator. Vertical layout, display panel on top, button grid below. Dark background, rounded buttons, three colour groups: digits in dark grey, operators in orange down the right side, and modifiers such as AC and delete in light grey along the top. Tabular or monospaced figures in the display so digits do not shift as they change.

Keypad buttons: digits 0 to 9, decimal point, plus, minus, multiply, divide, exponent, square root, percent, open parenthesis, close parenthesis, AC, delete, equals.

Two representations of the same input. The display shows a human readable string, and a separate canonical string is what gets sent to the backend. Map between them with a single lookup:

Display    Sent to backend
×    *
÷    /
√    sqrt
superscript exponent    ^
−    -

Exponent renders in the display as a superscript using a <sup> element with a font-size rule, so pressing 2 then the exponent key then 3 displays 2³. Keep this styling minimal. The backend still receives 2^3.

State: hold the sequence of tokens the user has entered. AC clears everything. Delete removes the last token. Equals fires exactly one call to POST /api/calculate with the canonical expression string and renders the result. No other button press triggers a network call.

On a 400 response, show the backend's error message in a small line beneath the display and put the display into an error state. Any subsequent button press clears the error. Network failure shows a distinct message so the user can tell a server problem from an invalid expression.

Responsive: fills the viewport cleanly at 375px wide, centred with a max width on desktop.

Also wire keyboard input for digits, operators, Enter for equals, Escape for AC, Backspace for delete. This is a convenience only. The application must be fully usable by clicking alone.

Tests with Vitest and Testing Library, mocking fetch directly, no MSW. Cover: pressing digits builds the display correctly, the decimal point cannot be entered twice within one number, pressing equals sends the correct canonical expression string in the request body, a mocked success renders the result, a mocked 400 renders the error message, and AC clears state.

Operational concerns

Configuration via environment variables with defaults so the app runs without setup. Backend reads PORT defaulting to 8080, and ALLOWED_ORIGIN defaulting to http://localhost:5173. Frontend reads VITE_API_URL defaulting to http://localhost:8080. Commit .env.example in both directories documenting each variable. Add .env to .gitignore.

Add a root .gitignore covering node_modules, dist, .env, and coverage output.

On the Go HTTP server, set ReadTimeout, WriteTimeout and IdleTimeout. Wrap the request body in http.MaxBytesReader with a small limit, since expressions are short, and return 400 if exceeded.

Add GET /health returning 200 with {"status":"ok"}.

Implement graceful shutdown: listen for SIGINT and SIGTERM, then shut the server down with a context timeout.

Log one line per request with method, path, status and duration, using the standard log package. Do not add a logging library.

Coverage

Go: go test -coverprofile with the summary saved to a file committed in the repo. Frontend: vitest --coverage with the summary saved and committed.

Documentation maintained continuously, not at the end

Create README.md and PROMPTS.md at repo root during stage 1, before writing other code, and update both at the end of every stage.

PROMPTS.md: append every message I send you, verbatim, in order, under a heading naming the stage it belongs to. Do not paraphrase, summarise, tidy, or reword my messages. If a message contains a correction to earlier work, keep both the original and the correction rather than replacing one with the other. This file is a record of what was actually said, not a cleaned up version.

README.md: at the end of each stage, fill in the sections that stage made true. After the parser stage, write the grammar and precedence rules into Design Decisions. After the handler stage, write API Examples using the real curl output you produced while testing, not invented output. After the frontend stage, write setup and run instructions and the display versus canonical expression decision. Never write a README claim about behaviour you have not verified by running the code.

At the end of every stage, state in your response which README sections you updated and which remain empty.

README sections, exactly these: Setup Instructions, Running Frontend and Backend, API Examples, Design Decisions and Assumptions, Possible Extensions.

API Examples must show curl commands with real responses: one success, plus division by zero, unbalanced parentheses, square root of a negative, and an invalid character.

Design Decisions must cover:

All arithmetic and parsing live in the backend, so evaluation logic exists in exactly one place and is testable in isolation. Splitting it across two layers would mean one operation's behaviour is defined in two codebases.
The frontend owns input handling, display formatting, and error rendering, and owns no arithmetic. State that boundary precisely rather than describing the frontend as purely visual.
Why the parser package is separate from the HTTP layer.
Why the standard library was chosen over a web framework.
Why float64, stating the precision limitation explicitly.
Why a single /api/calculate endpoint rather than one per operation.
Percent is a postfix operator meaning division by one hundred. Context dependent percent, where 200 + 10% means ten percent of 200, was deliberately not implemented because the behaviour is ambiguous and inconsistent across calculators.
The display string and the canonical expression string are separate representations, and why.
Environment variables and their defaults.
What was deliberately left out: no calculation history, no persistence, no authentication, no rate limiting.

Possible Extensions: context dependent percent, calculation history, arbitrary precision arithmetic.

Writing style for all documentation: no em-dashes. No emoji, no badges, no feature checklists.

Scope discipline

Keep total non-test code under roughly 700 lines. Do not add a database, authentication, rate limiting, a logging library, Docker, or CI unless I ask.

Work in this order and stop for my review after each stage. Do not proceed until I say go.
Parser package and its tests
HTTP handler and its tests
Frontend
Coverage reports
README final pass << 'ENDOFBRIEF'
```

### Message 5

```
wc -l BRIEF.md
```

### Message 6

```
git init
claude
```

## Stage 1: Parser Package and Tests

### Message 7

```
Read BRIEF.md and follow it. Start with stage 1 only, the parser package and its tests, then stop for my review.
```

## Stage 2: HTTP Handler and Tests

### Message 8

```
Go, start stage 2, the HTTP handler and its tests
```

### Message 9

```
whats the issue with the text you are trying to append to ReadMe?
```

### Message 10

```
continue
```

### Message 11

```
the text you are adding in ReadMe should not be so paragraph heavy, instead structure them in bullet points so its intuitively understandable
```

## Post-Stage-2 Housekeeping

### Message 12

```
commit the changes to github first. https://github.com/AnaSharps/sezzle-calculator.git is the repo. Make sure to include details added in the commit
```

### Message 13

```
alright, since stage 1 & 2 both are complete, can you lay down the steps how can i test them properly myself? using postman / curl. dont want to rely solely on your results, can be biased since you might be overlooking a few areas / edge cases
```

## Docker (requested, deferred to the end)

### Message 14

```
have you setup docker yet?
```

### Message 15

```
i eventually want to add docker for both frotnend and backend, yes i want you to add it now
```

## Stage 3: Frontend

### Message 16

```
alright, i have tested all the cases manually, the backend looks good. We can add docker at the very end if time permits. You can start with stage 3, before that do you have any uncommitted changes?
```

### Message 17

```
retry now
```

## Post-Stage-3 Review

### Message 18

```
first of all your coverage spelling is wrong, secondly give me a detailed description of the lines that are flagged as non-test codee
```

## Stage 4: Coverage Reports

### Message 19

```
alright. These look understandable, lets first generate the unit tests and coverage reports and then see if we can reduce these non-code lines. Lets commit these changes first and proceed
```

## Post-Stage-4 Manual Exploration and Bug Fix

### Message 20

```
push the changes to git first
```

### Message 21

```
alright, run both backend and frontend now. I want to explore the application myself first
```

### Message 22

```
when i press = after any expression, it first appends itself into the text box, then the text changes to resulting value, this hinders the user experience and feels like there's something going off, can you fix this?
```

### Message 23

```
yes
```
