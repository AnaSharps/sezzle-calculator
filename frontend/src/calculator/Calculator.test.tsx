import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('Calculator', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds the display as digits are pressed', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '3' }));

    expect(screen.getByTestId('display-value')).toHaveTextContent('123');
  });

  it('does not allow a second decimal point within the same number', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: 'decimal point' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'decimal point' }));
    await user.click(screen.getByRole('button', { name: '3' }));

    expect(screen.getByTestId('display-value')).toHaveTextContent('1.23');
  });

  it('sends the canonical expression string when equals is pressed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { result: 29 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'add' }));
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: 'multiply' }));
    await user.click(screen.getByRole('button', { name: '8' }));
    await user.click(screen.getByRole('button', { name: 'equals' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/calculate');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ expression: '5+3*8' });
  });

  it('renders the result on a mocked success response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { result: 29 })));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'equals' }));

    expect(await screen.findByTestId('display-value')).toHaveTextContent('29');
  });

  it('renders the backend error message on a mocked 400 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { error: 'division by zero' })));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'divide' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: 'equals' }));

    expect(await screen.findByTestId('display-error')).toHaveTextContent('division by zero');
  });

  it('clears tokens, result, and error when AC is pressed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { error: 'division by zero' })));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'divide' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: 'equals' }));
    expect(await screen.findByTestId('display-error')).toHaveTextContent('division by zero');

    await user.click(screen.getByRole('button', { name: 'AC' }));

    expect(screen.getByTestId('display-value')).toHaveTextContent('0');
    expect(screen.getByTestId('display-error')).toHaveTextContent('');
  });
});
