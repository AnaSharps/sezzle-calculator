import { buildDisplaySegments, formatResult } from './tokens';
import type { CalculatorError } from './useCalculator';

interface DisplayProps {
  tokens: string[];
  result: number | null;
  error: CalculatorError | null;
}

// Deliberately ignores loading state: while a calculation is in flight the
// expression stays exactly as typed, with nothing appended to it, so
// pressing equals never shows a transient extra character before the
// result replaces it. The keypad being disabled during the request (see
// Calculator.tsx) is the only loading affordance.
export function Display({ tokens, result, error }: DisplayProps) {
  const segments = result === null ? buildDisplaySegments(tokens) : null;
  const showPlaceholder = segments !== null && segments.length === 0;

  return (
    <div className="display" data-error-kind={error?.kind}>
      <div className="display__value" aria-live="polite" data-testid="display-value">
        {result !== null && formatResult(result)}
        {showPlaceholder && '0'}
        {segments?.map((segment, index) =>
          segment.superscript ? (
            <sup key={index} className="display__sup">
              {segment.text}
            </sup>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </div>
      <div className="display__error" data-testid="display-error">
        {error?.message ?? ' '}
      </div>
    </div>
  );
}
