package parser

import (
	"math"
	"strings"
	"testing"
)

func TestEvaluate_Success(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  float64
	}{
		{"addition", "5+3", 8},
		{"subtraction", "5-3", 2},
		{"multiplication", "5*3", 15},
		{"division", "6/3", 2},
		{"decimal numbers", "1.5+2.5", 4},
		{"multiplication before addition", "5+3*8", 29},
		{"division before subtraction", "10-6/2", 7},
		{"parentheses override precedence", "(5+3)*8", 64},
		{"nested parentheses", "((1+2)*(3+4))", 21},
		{"unary minus", "-5+3", -2},
		{"double unary minus", "--5", 5},
		{"unary minus with parens", "-(2+3)", -5},
		{"sqrt binds to immediate factor only", "sqrt9+4", 7},
		{"sqrt of parenthesised expression", "sqrt(9+4)", math.Sqrt(13)},
		{"sqrt of a number", "sqrt16", 4},
		{"exponent right associative", "2^3^2", 512},
		{"unary minus applies after exponent", "-2^2", -4},
		{"simple exponent", "2^3", 8},
		{"percent is division by one hundred", "50%", 0.5},
		{"percent chained", "50%%", 0.005},
		{"percent then exponent", "50%^2", 0.25},
		{"whitespace is ignored", " 5 + 3 * 8 ", 29},
		{"leading decimal point", ".5+.5", 1},
		{"trailing decimal point", "3.+2", 5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Evaluate(tt.input)
			if err != nil {
				t.Fatalf("Evaluate(%q) returned unexpected error: %v", tt.input, err)
			}
			if math.Abs(got-tt.want) > 1e-4 {
				t.Errorf("Evaluate(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

func TestEvaluate_Errors(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		wantError string
	}{
		{"division by zero", "5/0", "division by zero"},
		{"division by zero after expression", "10/(5-5)", "division by zero"},
		{"square root of negative number", "sqrt(-4)", "square root of a negative number"},
		{"square root of negative via unary minus", "sqrt-4", "square root of a negative number"},
		{"unbalanced parentheses missing close", "(3+4", "unbalanced parentheses"},
		{"unbalanced parentheses stray close", "3+4)", "unbalanced parentheses"},
		{"adjacent operands with no operator", "200%10", "unexpected token"},
		{"unexpected character", "5&3", "unexpected character"},
		{"unknown word", "5+abc", "unexpected character"},
		{"empty expression", "", "empty expression"},
		{"whitespace only expression", "   ", "empty expression"},
		{"trailing operator", "5+", "unexpected end of expression"},
		{"result is infinite", "2^2000", "not a finite number"},
		{"result is NaN", "2^2000-2^2000", "not a finite number"},
		{"malformed number", "3.4.5+1", "invalid number"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Evaluate(tt.input)
			if err == nil {
				t.Fatalf("Evaluate(%q) expected an error, got none", tt.input)
			}
			if !strings.Contains(err.Error(), tt.wantError) {
				t.Errorf("Evaluate(%q) error = %q, want it to contain %q", tt.input, err.Error(), tt.wantError)
			}
		})
	}
}
