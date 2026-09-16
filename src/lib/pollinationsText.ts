import { Ingredient } from '@/data/types';
import { parseAmount } from '@/lib/fractions';

const LOWER_WORDS = new Set(['and', 'or', 'of', 'with', 'in', 'the', 'a', 'to', 'for']);

/** "cashew nuts" -> "Cashew Nuts"; leaves already-capitalised text alone. */
function titleCase(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word, idx) => {
      if (idx > 0 && LOWER_WORDS.has(word.toLowerCase())) return word.toLowerCase();
      return word.replace(/^([a-z])/, c => c.toUpperCase());
    })
    .join(' ');
}

interface ParsedRecipe {
  ingredients: Ingredient[];
  instructions: string[];
}

export async function parseRecipeText(rawText: string): Promise<ParsedRecipe> {
  const prompt = `You are a recipe parser. Given the following recipe text, extract:
1. A list of ingredients with name, amount (number), and unit (one of: g, kg, ml, l, tsp, tbsp, pinch, unit, cup, bunch, handful, clove, slice, stick). If no unit matches, use "unit".
2. A list of method steps as clean, grammatical sentences.

Return ONLY valid JSON in this exact format, no other text:
{"ingredients":[{"name":"...","amount":0,"unit":"..."}],"instructions":["Step 1...","Step 2..."]}

Recipe text:
${rawText}`;

  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?json=true&model=openai`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('AI parsing failed');
  
  const text = await res.text();

  // Extract JSON from response (strip markdown fences if present)
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonStart = cleaned.search(/[\{\[]/);
  const jsonEnd = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('Could not parse AI response');
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = JSON.parse(cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/[\x00-\x1F\x7F]/g, ''));
  }

  // Unwrap common nesting patterns
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (parsed.recipe && typeof parsed.recipe === 'object') parsed = parsed.recipe;
    if (parsed.data && typeof parsed.data === 'object') parsed = parsed.data;
  }

  // Find ingredients/instructions arrays under varied key names
  const ingredientsRaw =
    parsed.ingredients ?? parsed.Ingredients ?? parsed.ingredient_list ?? [];
  const instructionsRaw =
    parsed.instructions ?? parsed.Instructions ?? parsed.steps ?? parsed.method ?? parsed.directions ?? [];

  if (!Array.isArray(ingredientsRaw) || !Array.isArray(instructionsRaw)) {
    console.error('Unexpected AI response shape:', parsed);
    throw new Error('Invalid AI response structure');
  }

  return {
    ingredients: ingredientsRaw.map((i: any) => {
      if (typeof i === 'string') return { name: titleCase(i), amount: 0, unit: 'unit' };
      const rawAmount = i.amount ?? i.quantity ?? i.qty;
      return {
        name: titleCase(String(i.name ?? i.ingredient ?? i.item ?? '')),
        amount: typeof rawAmount === 'number'
          ? rawAmount
          : parseAmount(String(rawAmount ?? '')),
        unit: String(i.unit ?? i.units ?? 'unit'),
      };
    }),
    instructions: instructionsRaw.map((s: any) =>
      typeof s === 'string' ? s : String(s.text ?? s.step ?? s.instruction ?? s)
    ),
  };
}

