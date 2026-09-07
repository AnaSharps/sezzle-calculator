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

  it('supports keyboard shortcuts for digits, backspace, operators, equals, and escape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { result: 8 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('9');
    expect(screen.getByTestId('display-value')).toHaveTextContent('9');

    await user.keyboard('{Backspace}');
    expect(screen.getByTestId('display-value')).toHaveTextContent('0');

    await user.keyboard('4+4{Enter}');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ expression: '4+4' });
    expect(await screen.findByTestId('display-value')).toHaveTextContent('8');

    await user.keyboard('{Escape}');
    expect(screen.getByTestId('display-value')).toHaveTextContent('0');
  });

  it('renders a superscript exponent and sends the canonical ^ expression', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { result: 8 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('button', { name: 'exponent' })).toHaveTextContent('^');

    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'exponent' }));

    expect(screen.getByTestId('display-value')).toHaveTextContent('2^');

    await user.click(screen.getByRole('button', { name: '3' }));

    expect(screen.getByTestId('display-value')).not.toHaveTextContent('^');
    const sup = screen.getByTestId('display-value').querySelector('sup');
    expect(sup).toHaveTextContent('3');

    await user.click(screen.getByRole('button', { name: 'equals' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ expression: '2^3' });
  });

  it('allows a new decimal point in the number after an operator', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: 'decimal point' }));
    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'add' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'decimal point' }));
    await user.click(screen.getByRole('button', { name: '5' }));

    expect(screen.getByTestId('display-value')).toHaveTextContent('1.5+2.5');
  });

  it('formats a non-integer result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { result: 3.605551275463989 })));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'square root' }));
    await user.click(screen.getByRole('button', { name: '(' }));
    await user.click(screen.getByRole('button', { name: '9' }));
    await user.click(screen.getByRole('button', { name: 'add' }));
    await user.click(screen.getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: ')' }));
    await user.click(screen.getByRole('button', { name: 'equals' }));

    expect(await screen.findByTestId('display-value')).toHaveTextContent('3.605551275');
  });

  it('deletes the last token when the delete button is pressed', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByTestId('display-value')).toHaveTextContent('1');
  });

  it('starts a fresh expression when a digit is pressed right after a result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { result: 8 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: 'add' }));
    await user.click(screen.getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: 'equals' }));
    expect(await screen.findByTestId('display-value')).toHaveTextContent('8');

    await user.click(screen.getByRole('button', { name: '9' }));
    expect(screen.getByTestId('display-value')).toHaveTextContent('9');
  });

  it('continues from the previous result when an operator is pressed right after it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { result: 26 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'add' }));
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: 'multiply' }));
    await user.click(screen.getByRole('button', { name: '8' }));
    await user.click(screen.getByRole('button', { name: 'equals' }));
    expect(await screen.findByTestId('display-value')).toHaveTextContent('26');

    await user.click(screen.getByRole('button', { name: 'add' }));
    expect(screen.getByTestId('display-value')).toHaveTextContent('26+');

    await user.click(screen.getByRole('button', { name: '4' }));
    expect(screen.getByTestId('display-value')).toHaveTextContent('26+4');

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { result: 30 }));
    await user.click(screen.getByRole('button', { name: 'equals' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ expression: '26+4' });
    expect(await screen.findByTestId('display-value')).toHaveTextContent('30');
  });

  it('clears back to 0 when delete is pressed right after a result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { result: 8 })));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: 'add' }));
    await user.click(screen.getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: 'equals' }));
    expect(await screen.findByTestId('display-value')).toHaveTextContent('8');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByTestId('display-value')).toHaveTextContent('0');
  });

  it('ignores keys that are not mapped to any action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard('5');
    await user.keyboard('a');
    await user.keyboard('{Shift}');

    expect(screen.getByTestId('display-value')).toHaveTextContent('5');
  });

  it('shows a distinct message when the request fails at the network level', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: 'equals' }));

    expect(await screen.findByTestId('display-error')).toHaveTextContent(
      'Unable to reach the server. Check your connection and try again.',
    );
  });
});
