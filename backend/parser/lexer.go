package parser

import (
	"fmt"
	"strconv"
	"strings"
)

type tokenKind int

const (
	tokNumber tokenKind = iota
	tokPlus
	tokMinus
	tokStar
	tokSlash
	tokCaret
	tokPercent
	tokSqrt
	tokLParen
	tokRParen
	tokEOF
)

type token struct {
	kind tokenKind
	text string
	num  float64
}

func (t token) describe() string {
	if t.kind == tokEOF {
		return "end of expression"
	}
	return fmt.Sprintf("%q", t.text)
}

func lex(input string) ([]token, error) {
	tokens := make([]token, 0, len(input))
	i, n := 0, len(input)

	single := map[byte]tokenKind{
		'+': tokPlus,
		'-': tokMinus,
		'*': tokStar,
		'/': tokSlash,
		'^': tokCaret,
		'%': tokPercent,
		'(': tokLParen,
		')': tokRParen,
	}

	for i < n {
		c := input[i]
		switch {
		case c == ' ' || c == '\t' || c == '\n' || c == '\r':
			i++

		case c >= '0' && c <= '9' || c == '.':
			start := i
			dotSeen := false
			for i < n && (input[i] >= '0' && input[i] <= '9' || input[i] == '.') {
				if input[i] == '.' {
					if dotSeen {
						return nil, fmt.Errorf("invalid number %q", input[start:i+1])
					}
					dotSeen = true
				}
				i++
			}
			text := input[start:i]
			val, err := strconv.ParseFloat(text, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid number %q", text)
			}
			tokens = append(tokens, token{kind: tokNumber, text: text, num: val})

		case isLetter(c):
			start := i
			for i < n && isLetter(input[i]) {
				i++
			}
			word := input[start:i]
			if strings.EqualFold(word, "sqrt") {
				tokens = append(tokens, token{kind: tokSqrt, text: word})
			} else {
				return nil, fmt.Errorf("unexpected character %q", word)
			}

		default:
			kind, ok := single[c]
			if !ok {
				return nil, fmt.Errorf("unexpected character %q", string(c))
			}
			tokens = append(tokens, token{kind: kind, text: string(c)})
			i++
		}
	}

	tokens = append(tokens, token{kind: tokEOF})
	return tokens, nil
}

func isLetter(c byte) bool {
	return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z'
}
