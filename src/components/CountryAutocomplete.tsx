import { useState, useRef, useEffect } from 'react';
import { COUNTRIES } from '@/data/countries';

interface Props {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export default function CountryAutocomplete({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        className={className}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange(''); }}
        onFocus={() => setOpen(true)}
        placeholder="Type to search…"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-popover border border-border rounded-md shadow-lg text-sm">
          {filtered.map(c => (
            <li
              key={c.name}
              className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center gap-2"
              onMouseDown={() => { onChange(c.name); setQuery(c.name); setOpen(false); }}
            >
              <span>{c.flag}</span> {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
