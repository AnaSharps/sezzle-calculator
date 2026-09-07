// Package parser implements a recursive descent parser and evaluator for
// arithmetic expressions. It has no knowledge of HTTP or JSON; it only
// turns an expression string into a float64 result or an error.
//
// Grammar, lowest precedence first:
//
//	expression := term (("+" | "-") term)*
//	term       := factor (("*" | "/") factor)*
//	factor     := ("-" | "sqrt") factor | power
//	power      := postfix ("^" factor)?
//	postfix    := primary ("%")*
//	primary    := NUMBER | "(" expression ")"
package parser

import (
	"errors"
	"fmt"
	"math"
	"strings"
)

// Evaluate parses and evaluates an arithmetic expression, returning its
// result or a descriptive error if the expression is invalid.
func Evaluate(input string) (float64, error) {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return 0, errors.New("empty expression")
	}

	tokens, err := lex(trimmed)
	if err != nil {
		return 0, err
	}

	p := &parseState{tokens: tokens}
	result, err := p.parseExpression()
	if err != nil {
		return 0, err
	}

	switch p.current().kind {
	case tokRParen:
		return 0, errors.New("unbalanced parentheses")
	case tokEOF:
		// expression fully consumed, nothing left to do
	default:
		return 0, fmt.Errorf("unexpected token %s", p.current().describe())
	}

	if math.IsNaN(result) || math.IsInf(result, 0) {
		return 0, errors.New("result is not a finite number")
	}

	return result, nil
}

type parseState struct {
	tokens []token
	pos    int
}

func (p *parseState) current() token {
	return p.tokens[p.pos]
}

func (p *parseState) advance() {
	if p.pos < len(p.tokens)-1 {
		p.pos++
	}
}

func (p *parseState) parseExpression() (float64, error) {
	left, err := p.parseTerm()
	if err != nil {
		return 0, err
	}

	for {
		switch p.current().kind {
		case tokPlus:
			p.advance()
			right, err := p.parseTerm()
			if err != nil {
				return 0, err
			}
			left += right
		case tokMinus:
			p.advance()
			right, err := p.parseTerm()
			if err != nil {
				return 0, err
			}
			left -= right
		default:
			return left, nil
		}
	}
}

func (p *parseState) parseTerm() (float64, error) {
	left, err := p.parseFactor()
	if err != nil {
		return 0, err
	}

	for {
		switch p.current().kind {
		case tokStar:
			p.advance()
			right, err := p.parseFactor()
			if err != nil {
				return 0, err
			}
			left *= right
		case tokSlash:
			p.advance()
			right, err := p.parseFactor()
			if err != nil {
				return 0, err
			}
			if right == 0 {
				return 0, errors.New("division by zero")
			}
			left /= right
		default:
			return left, nil
		}
	}
}

func (p *parseState) parseFactor() (float64, error) {
	switch p.current().kind {
	case tokMinus:
		p.advance()
		val, err := p.parseFactor()
		if err != nil {
			return 0, err
		}
		return -val, nil
	case tokSqrt:
		p.advance()
		val, err := p.parseFactor()
		if err != nil {
			return 0, err
		}
		if val < 0 {
			return 0, errors.New("square root of a negative number")
		}
		return math.Sqrt(val), nil
	default:
		return p.parsePower()
	}
}

func (p *parseState) parsePower() (float64, error) {
	base, err := p.parsePostfix()
	if err != nil {
		return 0, err
	}

	if p.current().kind != tokCaret {
		return base, nil
	}
	p.advance()

	// Right associative: the exponent is itself a factor, so a chain of
	// "^" groups from the right (2^3^2 is 2^(3^2)).
	exp, err := p.parseFactor()
	if err != nil {
		return 0, err
	}
	return math.Pow(base, exp), nil
}

func (p *parseState) parsePostfix() (float64, error) {
	val, err := p.parsePrimary()
	if err != nil {
		return 0, err
	}

	for p.current().kind == tokPercent {
		p.advance()
		val /= 100
	}
	return val, nil
}

func (p *parseState) parsePrimary() (float64, error) {
	tok := p.current()
	switch tok.kind {
	case tokNumber:
		p.advance()
		return tok.num, nil
	case tokLParen:
		p.advance()
		val, err := p.parseExpression()
		if err != nil {
			return 0, err
		}
		if p.current().kind != tokRParen {
			return 0, errors.New("unbalanced parentheses")
		}
		p.advance()
		return val, nil
	case tokEOF:
		return 0, errors.New("unexpected end of expression")
	default:
		return 0, fmt.Errorf("unexpected token %s", tok.describe())
	}
}
