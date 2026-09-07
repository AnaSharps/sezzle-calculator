import type { ReactNode } from 'react';

type KeyVariant = 'digit' | 'operator' | 'modifier' | 'equals';

interface KeyDef {
  label: ReactNode;
  keyLabel: string;
  token?: string;
  action?: 'clear' | 'delete' | 'equals';
  variant: KeyVariant;
  wide?: boolean;
}

const KEYS: KeyDef[] = [
  { label: 'AC', keyLabel: 'AC', action: 'clear', variant: 'modifier' },
  { label: '⌫', keyLabel: 'Delete', action: 'delete', variant: 'modifier' },
  { label: '(', keyLabel: '(', token: '(', variant: 'modifier' },
  { label: ')', keyLabel: ')', token: ')', variant: 'modifier' },

  { label: '√', keyLabel: 'square root', token: 'sqrt', variant: 'operator' },
  {
    label: (
      <>
        x<sup>y</sup>
      </>
    ),
    keyLabel: 'exponent',
    token: '^',
    variant: 'operator',
  },
  { label: '%', keyLabel: 'percent', token: '%', variant: 'operator' },
  { label: '÷', keyLabel: 'divide', token: '/', variant: 'operator' },

  { label: '7', keyLabel: '7', token: '7', variant: 'digit' },
  { label: '8', keyLabel: '8', token: '8', variant: 'digit' },
  { label: '9', keyLabel: '9', token: '9', variant: 'digit' },
  { label: '×', keyLabel: 'multiply', token: '*', variant: 'operator' },

  { label: '4', keyLabel: '4', token: '4', variant: 'digit' },
  { label: '5', keyLabel: '5', token: '5', variant: 'digit' },
  { label: '6', keyLabel: '6', token: '6', variant: 'digit' },
  { label: '−', keyLabel: 'subtract', token: '-', variant: 'operator' },

  { label: '1', keyLabel: '1', token: '1', variant: 'digit' },
  { label: '2', keyLabel: '2', token: '2', variant: 'digit' },
  { label: '3', keyLabel: '3', token: '3', variant: 'digit' },
  { label: '+', keyLabel: 'add', token: '+', variant: 'operator' },

  { label: '0', keyLabel: '0', token: '0', variant: 'digit', wide: true },
  { label: '.', keyLabel: 'decimal point', token: '.', variant: 'digit' },
  { label: '=', keyLabel: 'equals', action: 'equals', variant: 'equals' },
];

interface KeypadProps {
  disabled: boolean;
  onToken: (token: string) => void;
  onClear: () => void;
  onDelete: () => void;
  onEquals: () => void;
}

export function Keypad({ disabled, onToken, onClear, onDelete, onEquals }: KeypadProps) {
  function handlePress(key: KeyDef) {
    if (key.action === 'clear') {
      onClear();
    } else if (key.action === 'delete') {
      onDelete();
    } else if (key.action === 'equals') {
      onEquals();
    } else if (key.token !== undefined) {
      onToken(key.token);
    }
  }

  return (
    <div className="keypad">
      {KEYS.map((key) => (
        <button
          key={key.keyLabel}
          type="button"
          className={`key key--${key.variant}${key.wide ? ' key--wide' : ''}`}
          onClick={() => handlePress(key)}
          disabled={disabled}
          aria-label={key.keyLabel}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
