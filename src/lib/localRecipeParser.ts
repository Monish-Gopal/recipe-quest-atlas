import { Ingredient, UNITS } from '@/data/types';
import { parseAmount } from '@/lib/fractions';
import { createIngredientSection } from '@/lib/ingredientSections';
import { toSectionTitle } from '@/lib/methodSections';

export interface ParsedRecipeText {
  ingredients: Ingredient[];
  instructions: string[];
}

const LOWER_WORDS = new Set(['and', 'or', 'of', 'with', 'in', 'the', 'a', 'to', 'for']);

export function titleCase(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word, idx) => {
      if (idx > 0 && LOWER_WORDS.has(word.toLowerCase())) return word.toLowerCase();
      return word.replace(/^([a-z])/, c => c.toUpperCase());
    })
    .join(' ');
}

const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', gr: 'g', gs: 'g',
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', milliliter: 'ml', millilitre: 'ml', milliliters: 'ml', millilitres: 'ml',
  l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp',
  pinch: 'pinch', pinches: 'pinch',
  cup: 'cup', cups: 'cup',
  bunch: 'bunch', bunches: 'bunch',
  handful: 'handful', handfuls: 'handful',
  clove: 'clove', cloves: 'clove',
  slice: 'slice', slices: 'slice',
  stick: 'stick', sticks: 'stick',
  unit: 'unit', piece: 'unit', pieces: 'unit', whole: 'unit',
};

const VULGAR: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};

function normaliseFractions(text: string): string {
  return text.replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅛⅜⅝⅞]/g, m => ` ${VULGAR[m]} `).replace(/\s+/g, ' ').trim();
}

const INGREDIENT_HEADING = /^(ingredients?|you\s+will\s+need|shopping\s+list)\s*:?\s*$/i;
const METHOD_HEADING = /^(method|instructions?|directions?|steps|preparation|how\s+to\s+make(\s+it)?)\s*:?\s*$/i;
const BULLET = /^\s*(?:[-*•–—▪]|\d+[.)]|\(\d+\))\s*/;

function stripBullet(line: string): string {
  return line.replace(BULLET, '').trim();
}

function isBulleted(line: string): boolean {
  return BULLET.test(line);
}

/** Parse "1/4 cup cashew nuts" into an ingredient. */
export function parseIngredientLine(raw: string): Ingredient | null {
  let line = normaliseFractions(stripBullet(raw)).replace(/\.$/, '').trim();
  if (!line) return null;

  // Amount: integer, decimal, fraction, mixed number, or range (take the first).
  const amountMatch = line.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*\d+(?:[.,]\d+)?(?:\/\d+)?)?/);
  let amount = 0;
  if (amountMatch) {
    amount = parseAmount(amountMatch[1].replace(',', '.')) || 0;
    line = line.slice(amountMatch[0].length).trim();
  }

  // Unit directly after the amount.
  let unit = 'unit';
  const unitMatch = line.match(/^([A-Za-z]+)\.?\b/);
  if (unitMatch) {
    const mapped = UNIT_ALIASES[unitMatch[1].toLowerCase()];
    if (mapped) {
      unit = mapped;
      line = line.slice(unitMatch[0].length).trim();
    }
  }
  if (!UNITS.includes(unit as (typeof UNITS)[number])) unit = 'unit';

  line = line.replace(/^(?:of|de)\s+/i, '').trim();
  if (!line) return null;

  return { name: titleCase(line), amount, unit };
}

/**
 * Deterministic parser for recipes pasted in the structured form:
 *
 *   Component name
 *   Ingredients:
 *   - ...
 *   Method:
 *   1. ...
 *
 * Returns null when the text has no recognisable Ingredients/Method headings,
 * so the caller can fall back to AI parsing.
 */
export function parseStructuredRecipe(rawText: string): ParsedRecipeText | null {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.replace(/\s+$/, ''))
    .filter(l => l.trim().length > 0);

  if (!lines.some(l => INGREDIENT_HEADING.test(l.trim())) || !lines.some(l => METHOD_HEADING.test(l.trim()))) {
    return null;
  }

  interface Component { title: string | null; ingredients: Ingredient[]; steps: string[] }
  const components: Component[] = [];
  let current: Component | null = null;
  let mode: 'none' | 'ingredients' | 'method' = 'none';

  const startComponent = (title: string | null) => {
    current = { title, ingredients: [], steps: [] };
    components.push(current);
    mode = 'none';
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (INGREDIENT_HEADING.test(line)) {
      if (!current) startComponent(null);
      mode = 'ingredients';
      continue;
    }
    if (METHOD_HEADING.test(line)) {
      if (!current) startComponent(null);
      mode = 'method';
      continue;
    }

    // Inline heading form: "Ingredients: 200g rice"
    const inlineIng = line.match(/^(?:ingredients?)\s*:\s*(.+)$/i);
    if (inlineIng) {
      if (!current) startComponent(null);
      mode = 'ingredients';
      const ing = parseIngredientLine(inlineIng[1]);
      if (ing) current!.ingredients.push(ing);
      continue;
    }

    const looksLikeHeading =
      !isBulleted(rawLine) &&
      line.length <= 60 &&
      !/[.;:]$/.test(line) &&
      line.split(/\s+/).length <= 8;

    // A plain short line after a method block (or before anything) starts a new component.
    if ((mode === 'none' || mode === 'method') && looksLikeHeading && !isBulleted(rawLine)) {
      if (mode === 'method' || !current) {
        startComponent(titleCase(line.replace(/[:：]$/, '')));
        continue;
      }
    }

    if (mode === 'ingredients') {
      const ing = parseIngredientLine(line);
      if (ing) current!.ingredients.push(ing);
      continue;
    }
    if (mode === 'method') {
      const step = stripBullet(line);
      if (step) current!.steps.push(step);
      continue;
    }
  }

  const filled = components.filter(c => c.ingredients.length > 0 || c.steps.length > 0);
  if (filled.length === 0) return null;

  const ingredients: Ingredient[] = [];
  const instructions: string[] = [];
  const multiple = filled.length > 1;

  filled.forEach(component => {
    if (multiple && component.title) {
      ingredients.push(createIngredientSection(component.title));
      instructions.push(toSectionTitle(component.title));
    }
    ingredients.push(...component.ingredients);
    instructions.push(...component.steps);
  });

  return { ingredients, instructions };
}
