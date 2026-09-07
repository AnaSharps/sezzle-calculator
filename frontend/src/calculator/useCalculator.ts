import { useCallback, useState } from 'react';
import { calculate } from '../api';
import { canAddDecimalPoint, toCanonicalExpression } from './tokens';

export interface CalculatorError {
  message: string;
  kind: 'validation' | 'network';
}

export function useCalculator() {
  const [tokens, setTokens] = useState<string[]>([]);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<CalculatorError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [justEvaluated, setJustEvaluated] = useState(false);

  // Any button press clears a previous error. Pressing anything right
  // after a result was shown starts a fresh expression rather than
  // appending to the number that was just displayed.
  const pressToken = useCallback(
    (token: string) => {
      setError(null);
      if (justEvaluated) {
        setResult(null);
        setJustEvaluated(false);
      }
      setTokens((current) => {
        const base = justEvaluated ? [] : current;
        if (token === '.' && !canAddDecimalPoint(base)) {
          return base;
        }
        return [...base, token];
      });
    },
    [justEvaluated],
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
