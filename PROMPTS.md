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
cat > BRIEF.md << Build a full-stack calculator take-home assessment. [The full project brief was pasted verbatim here via a shell heredoc, specifying the Go backend, the React/TypeScript frontend, the grammar and precedence rules, the required error cases, the frontend keypad and display/canonical string behaviour, environment variables, coverage and documentation requirements, and the five-stage work order. The full text is committed as BRIEF.md rather than duplicated here.] << 'ENDOFBRIEF'
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

### Message 24

```
what does the xy button do?
```

### Message 25

```
so whats currently happening is when i type 2, then xy, nothing shows up on the input field. also, the text on xy button should be changed to ^. its better understandable. when the user types ^ button, input should show 2^, then when i type 3, input should show the superscripted text directly
```

### Message 26

```
now, another case is when i go: 2+3*8=, i get the result in my input field, however, then when i type any operation (which should be allowed, the input removes the prev result, and only takes the operation as the input, basically result should be preserved for immediate followup operations. this is a basic requirement of any calculator app
```

### Message 27

```
also, I want to add an initial design decision doc which was done before starting any implementation. Here is the text: [Design Log document, 14 sections covering language choice, arithmetic ownership, evaluation model, API shape, evaluation trigger, grammar and precedence, sqrt binding, percent semantics, display/canonical representations, input method, numeric type, error handling boundary, deliberate omissions, and operational concerns, plus a closing method note. The full text was pasted verbatim and is committed as DESIGN_LOG.md rather than duplicated here], add this too to the repo.
```

## Docker Implementation

### Message 28

```
okay, you have added the ref to prompts.md in the readme file as well right?
```

### Message 29

```
alright, we are just left with docker implementation now for both frontend and backend. lets do it quick. docker is already running
```

### Message 30

```
you dont need to use claude browser extension, i can do it manually
```

### Message 31

```
so, now with docker setup already done, we dont need manual setup instructions right? You can include them in the readme as an option, however the sequence for setups instructions should be divided into 3 alternative sections: Direct docker compose up, - 2. individually running backend / frontend for docker, 3. manuallly running the applications locally. Also, dont include too much unnecessary information, because thats clouding the reader's mind and will cost readability
```
