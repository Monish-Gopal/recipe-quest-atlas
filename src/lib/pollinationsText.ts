import { Ingredient } from '@/data/types';

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
      if (typeof i === 'string') return { name: i, amount: 0, unit: 'unit' };
      return {
        name: String(i.name ?? i.ingredient ?? i.item ?? ''),
        amount: Number(i.amount ?? i.quantity ?? i.qty) || 0,
        unit: String(i.unit ?? i.units ?? 'unit'),
      };
    }),
    instructions: instructionsRaw.map((s: any) =>
      typeof s === 'string' ? s : String(s.text ?? s.step ?? s.instruction ?? s)
    ),
  };
}

// Determine if a cooking step is visually meaningful
const VISUAL_KEYWORDS = [
  'chop', 'slice', 'dice', 'cut', 'mince', 'julienne', 'peel',
  'fry', 'sauté', 'saute', 'sear', 'brown', 'caramelize',
  'boil', 'simmer', 'steam', 'blanch', 'poach',
  'bake', 'roast', 'grill', 'broil', 'toast',
  'mix', 'stir', 'whisk', 'fold', 'blend', 'puree', 'grind',
  'knead', 'roll', 'shape', 'form', 'flatten',
  'plate', 'arrange', 'garnish', 'drizzle', 'sprinkle',
  'marinate', 'coat', 'dredge', 'bread',
  'pour', 'layer', 'stuff', 'fill', 'wrap',
];

export function isVisualStep(step: string): boolean {
  const lower = step.toLowerCase();
  return VISUAL_KEYWORDS.some(kw => lower.includes(kw));
}

export function stepToImagePrompt(step: string, recipeTitle: string): string {
  return `${step}, cooking step for ${recipeTitle}, close-up professional food photography, bright kitchen, warm natural lighting, editorial style`;
}

export function getStepImageUrl(step: string, recipeTitle: string): string {
  const prompt = encodeURIComponent(stepToImagePrompt(step, recipeTitle));
  return `https://image.pollinations.ai/prompt/${prompt}?width=512&height=340&nologo=true`;
}
