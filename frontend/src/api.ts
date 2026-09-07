const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Check your connection and try again.';

export type CalculateOutcome =
  | { ok: true; result: number }
  | { ok: false; message: string; kind: 'validation' | 'network' };

// The only place in the frontend that talks to the network, and the only
// place that knows the backend's request/response shape. It performs no
// arithmetic; it just forwards the canonical expression and reports back
// either a number or a message.
export async function calculate(expression: string): Promise<CalculateOutcome> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression }),
    });
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE, kind: 'network' };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE, kind: 'network' };
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : 'Something went wrong.';
    return { ok: false, message, kind: 'validation' };
  }

  const result = (body as { result?: unknown }).result;
  if (typeof result !== 'number') {
    return { ok: false, message: NETWORK_ERROR_MESSAGE, kind: 'network' };
  }
  return { ok: true, result };
}
