const VULGAR: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

/** Parse "1/4", "1 1/2", "0.75", "½", "1½" into a number. Returns 0 when unparseable. */
export function parseAmount(input: string): number {
  if (!input) return 0;
  let s = input.trim().replace(/,/g, '.');
  let total = 0;

  // Pull out any vulgar fraction characters
  for (const [char, val] of Object.entries(VULGAR)) {
    if (s.includes(char)) {
      total += val;
      s = s.replace(char, ' ');
    }
  }

  s = s.trim();
  if (!s) return total;

  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return total + Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);

  const frac = s.match(/^(\d*\.?\d+)\s*\/\s*(\d*\.?\d+)$/);
  if (frac) {
    const d = Number(frac[2]);
    return total + (d ? Number(frac[1]) / d : 0);
  }

  const num = Number(s);
  return total + (Number.isFinite(num) ? num : 0);
}

const NICE: [number, string][] = [
  [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.375, '⅜'], [0.5, '½'],
  [0.625, '⅝'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞'],
];

/** Format a number for display, preferring readable fractions (0.25 -> "¼", 1.5 -> "1½"). */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '';
  if (value >= 10) return String(Math.round(value));

  const whole = Math.floor(value);
  const rest = value - whole;
  if (rest < 0.02) return String(whole);

  let best: string | null = null;
  let bestDiff = 0.03;
  for (const [val, glyph] of NICE) {
    const diff = Math.abs(rest - val);
    if (diff < bestDiff) { bestDiff = diff; best = glyph; }
  }
  if (best) return whole > 0 ? `${whole}${best}` : best;

  return Number(value.toFixed(2)).toString();
}
