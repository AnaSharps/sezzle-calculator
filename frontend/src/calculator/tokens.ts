// Each entry in the token sequence is exactly what one button press
// contributes to the canonical expression string. Joining the tokens is
// the canonical string sent to the backend; mapping each token through
// DISPLAY_MAP (falling back to the token itself) builds the human
// readable display, aside from the exponent superscript handled in
// buildDisplaySegments below.
const DISPLAY_MAP: Record<string, string> = {
  '*': '×', // ×
  '/': '÷', // ÷
  sqrt: '√', // √
  '-': '−', // − (minus sign, not a hyphen)
};

function displayFor(token: string): string {
  return DISPLAY_MAP[token] ?? token;
}

function isNumberPart(token: string): boolean {
  return token === '.' || (token.length === 1 && token >= '0' && token <= '9');
}

export interface DisplaySegment {
  text: string;
  superscript: boolean;
}

// Walks the token sequence and groups it into display segments, marking
// the digits and decimal points that immediately follow a "^" token as
// superscript, so 2, ^, 3 renders as 2 then a superscript 3. The "^"
// itself is shown as a literal character (2^) until the first digit of
// the exponent arrives, at which point it is replaced by the superscript
// rendering, so pressing the exponent key always gives immediate visual
// feedback instead of appearing to do nothing.
export function buildDisplaySegments(tokens: string[]): DisplaySegment[] {
  const segments: DisplaySegment[] = [];
  let superscript = false;
  let pendingCaretIndex: number | null = null;

  for (const token of tokens) {
    if (token === '^') {
      superscript = true;
      segments.push({ text: '^', superscript: false });
      pendingCaretIndex = segments.length - 1;
      continue;
    }
    if (!isNumberPart(token)) {
      superscript = false;
      pendingCaretIndex = null;
    }

    const text = displayFor(token);

    if (superscript && pendingCaretIndex !== null) {
      segments.splice(pendingCaretIndex, 1);
      pendingCaretIndex = null;
    }

    const last = segments[segments.length - 1];
    if (last && last.superscript === superscript) {
      last.text += text;
    } else {
      segments.push({ text, superscript });
    }
  }

  return segments;
}

export function toCanonicalExpression(tokens: string[]): string {
  return tokens.join('');
}

// A decimal point is only invalid within the number currently being
// typed: scan back from the end of the token sequence until an operator,
// paren, or function boundary, and reject a second "." within that run.
export function canAddDecimalPoint(tokens: string[]): boolean {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token === '.') {
      return false;
    }
    if (!isNumberPart(token)) {
      break;
    }
  }
  return true;
}

export function formatResult(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toPrecision(10)));
}
