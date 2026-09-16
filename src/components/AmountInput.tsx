import { useState, useEffect } from 'react';
import { parseAmount, formatAmount } from '@/lib/fractions';

interface Props {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Text-based amount field that accepts fractions ("1/4", "1 1/2", "½") as well as decimals.
 */
export default function AmountInput({ value, onChange, className, placeholder = 'Amt' }: Props) {
  const [text, setText] = useState(() => formatAmount(value));

  // Resync when the value changes from outside (e.g. AI draft confirmed)
  useEffect(() => {
    if (Math.abs(parseAmount(text) - value) > 0.001) setText(formatAmount(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="text"
      inputMode="text"
      className={className}
      placeholder={placeholder}
      value={text}
      onChange={e => {
        setText(e.target.value);
        onChange(parseAmount(e.target.value));
      }}
      onBlur={() => setText(formatAmount(parseAmount(text)))}
    />
  );
}
