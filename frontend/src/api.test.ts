import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculate } from './api';

describe('calculate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports a network error when fetch itself rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const outcome = await calculate('1+1');

    expect(outcome).toEqual({
      ok: false,
      kind: 'network',
      message: 'Unable to reach the server. Check your connection and try again.',
    });
  });

  it('reports a network error when the response body is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('unexpected end of input')),
      }),
    );

    const outcome = await calculate('1+1');

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.kind).toBe('network');
    }
  });

  it('falls back to a generic message when a 400 response has no string error field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ unexpected: true }),
      }),
    );

    const outcome = await calculate('1+1');

    expect(outcome).toEqual({
      ok: false,
      kind: 'validation',
      message: 'Something went wrong.',
    });
  });

  it('reports a network error when a 200 response has no numeric result field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ unexpected: true }),
      }),
    );

    const outcome = await calculate('1+1');

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.kind).toBe('network');
    }
  });
});
