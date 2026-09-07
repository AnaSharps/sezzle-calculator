import { useCallback, useState } from 'react';
import { calculate } from '../api';
import { canAddDecimalPoint, formatResult, toCanonicalExpression } from './tokens';

export interface CalculatorError {
  message: string;
  kind: 'validation' | 'network';
}

// Operators that continue naturally from a result just shown, the way
// every physical calculator behaves: 26, "=", "+" means "26 plus
// whatever comes next", not "discard 26 and start a new expression with
// a leading +". sqrt and "(" are not included: they are prefix/grouping
// tokens that don't attach to a preceding value, so they start fresh
// like a digit would.
const CHAINABLE_OPERATORS = new Set(['+', '-', '*', '/', '^', '%']);

function numberToTokens(value: number): string[] {
  return formatResult(value).split('');
}

export function useCalculator() {
  const [tokens, setTokens] = useState<string[]>([]);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<CalculatorError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [justEvaluated, setJustEvaluated] = useState(false);

  // Any button press clears a previous error. Pressing a chainable
  // operator right after a result was shown continues from that result
  // (the usual calculator behaviour); any other press discards the
  // result and starts a fresh expression.
  const pressToken = useCallback(
    (token: string) => {
      setError(null);

      if (justEvaluated) {
        setJustEvaluated(false);
        if (result !== null && CHAINABLE_OPERATORS.has(token)) {
          setTokens([...numberToTokens(result), token]);
        } else {
          setTokens([token]);
        }
        setResult(null);
        return;
      }

      setTokens((current) => {
        if (token === '.' && !canAddDecimalPoint(current)) {
          return current;
        }
        return [...current, token];
      });
    },
    [justEvaluated, result],
  );

  const clear = useCallback(() => {
    setTokens([]);
    setResult(null);
    setError(null);
    setJustEvaluated(false);
  }, []);

  const deleteLast = useCallback(() => {
    setError(null);
    if (justEvaluated) {
      setTokens([]);
      setResult(null);
      setJustEvaluated(false);
      return;
    }
    setTokens((current) => current.slice(0, -1));
  }, [justEvaluated]);

  // The only path that calls the backend. Runs once per press, never as
  // a side effect of any other button.
  const equals = useCallback(async () => {
    setIsLoading(true);
    const outcome = await calculate(toCanonicalExpression(tokens));
    setIsLoading(false);
    if (outcome.ok) {
      setResult(outcome.result);
      setError(null);
      setJustEvaluated(true);
    } else {
      setError({ message: outcome.message, kind: outcome.kind });
    }
  }, [tokens]);

  return { tokens, result, error, isLoading, pressToken, clear, deleteLast, equals };
}
