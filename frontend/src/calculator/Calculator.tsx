import { useEffect } from 'react';
import { Display } from './Display';
import { Keypad } from './Keypad';
import { useCalculator } from './useCalculator';

// Keyboard input is a convenience layer only: every one of these keys
// does exactly what clicking the matching button does, and nothing here
// is reachable by keyboard alone.
const KEY_TOKENS: Record<string, string> = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '.': '.',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '^': '^',
  '%': '%',
  '(': '(',
  ')': ')',
};

export function Calculator() {
  const { tokens, result, error, isLoading, pressToken, clear, deleteLast, equals } = useCalculator();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        event.preventDefault();
        void equals();
        return;
      }
      if (event.key === 'Escape') {
        clear();
        return;
      }
      if (event.key === 'Backspace') {
        deleteLast();
        return;
      }
      const token = KEY_TOKENS[event.key];
      if (token !== undefined) {
        pressToken(token);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pressToken, clear, deleteLast, equals]);

  return (
    <div className="calculator">
      <Display tokens={tokens} result={result} error={error} />
      <Keypad disabled={isLoading} onToken={pressToken} onClear={clear} onDelete={deleteLast} onEquals={() => void equals()} />
    </div>
  );
}
