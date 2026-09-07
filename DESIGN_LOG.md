# Design Log

This document records the design decisions taken before any code was written, along with the options considered and the reasoning for each choice. It exists because the assignment asked for the prompts used, and the prompts are only half the story. The reasoning that produced them is the other half.

The working method was to settle the design fully in conversation with an AI assistant, then hand a single specification to a coding agent. No code was written until every decision below was closed.

---

## 1. Language choice for the backend

**Decision: Go.**

The brief stated Go was preferred. Go was not a language I use daily, so the alternative was to submit a Node.js backend, which I could write faster.

I chose Go because the assignment names it and because a calculator API is close to the simplest possible Go program: standard library HTTP, a parser, table driven tests, zero external dependencies. The risk was writing Go that reads as another language wearing Go syntax. I mitigated that by constraining the specification up front: standard library only, no framework, errors returned rather than panicked, no getters and setters, no single implementation interfaces, table driven tests throughout.

---

## 2. Where the arithmetic lives

**Decision: entirely in the backend. The frontend performs no arithmetic and no precedence resolution.**

This was the single most consequential decision and it drove almost everything else.

The brief says the frontend consumes the backend API to perform the operations. A calculator that computes locally and calls an API decoratively would satisfy the visual requirement and fail the actual one.

The stronger argument is about atomicity rather than the brief. If the frontend resolves precedence and the backend evaluates individual operations, then the behaviour of a single expression is defined across two codebases in two languages. Changing how exponentiation associates would require changes in both, tested in both, with no single place that describes the truth. Keeping evaluation in one package means it is testable in isolation with no HTTP and no browser involved.

I considered and rejected the argument that this is about frontend reliability. If the frontend fails the user has no calculator regardless of where the arithmetic runs. The argument is maintainability, not availability, and the README states it that way.

---

## 3. Evaluation model: precedence, not immediate execution

**Decision: standard operator precedence.**

Two models were considered.

Immediate execution is what simple pocket calculators do. Pressing an operator evaluates whatever is pending and displays the intermediate result, so 5 + 3 x 8 gives 64 because the addition resolves the moment the multiply key is pressed.

Standard precedence treats the input as an expression, so 5 + 3 x 8 gives 29.

I verified the reference behaviour rather than assuming it. The iOS calculator and macOS Spotlight both return 29, which confirmed precedence as the expected model. An earlier assumption in the design conversation that iOS uses immediate execution was wrong and was corrected against the actual application before it reached the specification.

Precedence is also the better fit for a backend that owns evaluation, because an expression can be sent as a single unit rather than as a sequence of pending operations.

---

## 4. API shape: one expression, or one operation at a time

**Decision: `POST /api/calculate` accepting a full expression string.**

The alternative was a two operand endpoint taking `{operation, a, b}`, with the frontend firing one call per arithmetic step.

The two operand version keeps the Go trivial, roughly a switch statement, but it forces the frontend to build the precedence tree and decide the call order. That reintroduces the split defined in decision 2, just at a different seam. It also means several network round trips per calculation and an ordering problem if responses arrive out of order.

Sending the whole expression means one request per calculation, no ordering concerns, and evaluation logic in exactly one place. The cost is writing a real parser, which is the largest single piece of work in the project. That cost is accepted deliberately: it is also the most interesting code in the repository and the part most worth reviewing.

A single endpoint was chosen over one endpoint per operation for the same reason. Operation dispatch is a property of the expression, not of the URL, and one endpoint per operation would fragment validation and error handling across handlers.

---

## 5. Trigger point for evaluation

**Decision: exactly one API call, fired when equals is pressed.**

Nothing else triggers a network call. Digits, operators, parentheses, delete and clear are all local state changes.

This falls out of decision 4. Because the backend receives a complete expression, there is nothing to send until the expression is complete. It also removes an entire class of bug: with no concurrent in flight requests, there is no possibility of a stale response overwriting a newer one, and no need for either input blocking or request sequence numbers.

---

## 6. Grammar and precedence rules

**Decision: recursive descent parser over the following grammar, lowest precedence first.**

```
expression := term (("+" | "-") term)*
term       := factor (("*" | "/") factor)*
factor     := ("-" | "sqrt") factor | power
power      := postfix ("^" factor)?
postfix    := primary ("%")*
primary    := NUMBER | "(" expression ")"
```

Recursive descent was chosen over shunting yard because the precedence rules are encoded in the shape of the grammar rather than in a precedence table, which makes the code readable without a reference and makes each rule independently testable.

The specific behaviours this grammar produces, each of which is asserted in the test suite:

| Expression | Result | Rule demonstrated |
| --- | --- | --- |
| `5+3*8` | 29 | Multiplication binds tighter than addition |
| `sqrt9+4` | 7 | Square root binds to the following factor only |
| `sqrt(9+4)` | 3.6056 | Parentheses form a single factor |
| `2^3^2` | 512 | Exponentiation is right associative |
| `-2^2` | -4 | Unary minus applies to the result of the power |
| `50%` | 0.5 | Percent is postfix |
| `200%10` | parse error | Two operands with no operator between them |

---

## 7. Square root binding

**Decision: square root binds to the term immediately following it. Parentheses extend it to a group.**

`sqrt9+4` is 7. `sqrt(9+4)` is approximately 3.6056.

This is standard mathematical behaviour and it is what a physical calculator with a radical key does. It required no special casing: placing square root at the `factor` level of the grammar alongside unary minus produces exactly this binding for free.

Parentheses were added to the keypad specifically to make the grouped form reachable. Without them the second behaviour is unexpressible.

---

## 8. Percent semantics

**Decision: postfix, meaning division by one hundred. `50%` is 0.5.**

The percent key has no single agreed meaning across calculators. Three behaviours were considered.

Postfix division by one hundred is unambiguous and trivially testable.

Infix, where `200%10` means ten percent of two hundred, is what some desk calculators do. This was tested against Spotlight and the iOS calculator, both of which returned 0 rather than 20, confirming it is not the reference behaviour.

Context dependent percent is what iOS actually implements: `200 + 10%` gives 220 because the percent is read relative to the pending left operand, while `10%` alone gives 0.1. This is defensible product behaviour but the meaning of the key changes based on parser state, it is harder to test, and it surprises users who expect one consistent rule.

Postfix was chosen. Context dependent percent is recorded in the README under possible extensions rather than silently omitted.

---

## 9. Two representations of user input

**Decision: the display string and the canonical expression string are separate, with a mapping between them.**

The user sees a radical sign, a multiplication cross, a division sign, and a superscript exponent. The backend receives `sqrt`, `*`, `/` and `^`.

Writing `sqrt(9)` into the display would be accurate and unpleasant to read. Sending a radical character to the parser would mean the parser's grammar is coupled to typographic choices in the UI. Separating them means the display can change without touching the parser, and the parser has a small ASCII grammar with no Unicode handling.

The mapping is a single lookup table in one place in the frontend.

---

## 10. Input method

**Decision: click driven, with keyboard support as a convenience only.**

The application is fully usable with a mouse alone. Keyboard bindings for digits, operators, enter, escape and backspace are wired because they cost little and are expected by anyone who uses a calculator often, but no functionality depends on them.

This keeps the input surface small and makes the state model simple: the frontend holds a token sequence, and every button appends to, removes from, or clears it.

---

## 11. Numeric type

**Decision: `float64`, with the limitation documented rather than solved.**

Arbitrary precision arithmetic via `math/big` would eliminate floating point representation error, at the cost of a more complex evaluator and slower arithmetic for no benefit at the scale of a calculator.

`float64` means `0.1 + 0.2` does not produce exactly `0.3`. This is stated explicitly in the README rather than left for a reviewer to discover, and arbitrary precision is listed as a possible extension.

Results that evaluate to NaN or infinity are rejected with a 400 rather than serialised into the response, since neither is a valid JSON number and neither is a meaningful answer.

---

## 12. Error handling boundary

**Decision: every invalid input produces a 400 with a message. The endpoint never returns 500 for anything the client sent.**

The parser returns errors rather than panicking. The handler translates parser errors into status codes and messages. A panic recovery exists at the handler boundary as a safety net, not as a control flow mechanism.

Cases enumerated in advance rather than discovered during implementation: division by zero, square root of a negative number, unbalanced parentheses, unexpected characters, empty expression, missing or non string expression field, malformed JSON, oversized request body, and results that are NaN or infinite.

Listing these before writing the parser meant they became test cases rather than bug reports.

---

## 13. What was deliberately left out

Each of these was considered and rejected as out of scope for the assignment rather than overlooked.

**Calculation history and persistence.** Not requested. Would require storage, a schema and a second endpoint for no gain against the stated requirements.

**Authentication and rate limiting.** Not requested, and meaningless for an endpoint with no user data and no state.

**Docker and CI.** Listed as optional in the brief. Time was better spent on parser correctness and test coverage.

**A web framework.** The standard library covers routing, JSON, and middleware needs at this size. Adding one would be a dependency with no corresponding benefit.

**A logging library.** One line per request via the standard `log` package is sufficient at this scale.

---

## 14. Operational concerns

Configuration is read from environment variables with working defaults, so the application runs with no setup while remaining deployable without code changes. Server timeouts and a request body size limit are set explicitly rather than left at their zero values. A health endpoint and graceful shutdown on SIGINT and SIGTERM are included because a service without them is awkward to operate, regardless of how small it is.

---

## Method note

The design above was settled entirely before implementation began. The specification derived from it was handed to a coding agent in staged form, with review after each stage: parser and tests, HTTP handler and tests, frontend, coverage, documentation. Each stage was reviewed and verified by running the code before the next began.
