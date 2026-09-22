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
  const prompt = `You are a recipe parser. The text may describe ONE dish or SEVERAL components/parts (e.g. "Peri Peri Chicken", "Spiced Rice", "Garlic Mayo"), each with its own Ingredients and Method.

Extract every component, in the order given. For each component:
- "title": the component name (short, e.g. "Peri Peri Chicken"). Use null only if the text has a single unnamed component.
- "ingredients": name, amount (number, convert fractions like 1/2 to 0.5), and unit (one of: g, kg, ml, l, tsp, tbsp, pinch, unit, cup, bunch, handful, clove, slice, stick). If no unit matches, use "unit".
- "instructions": method steps as clean, grammatical sentences. Never include the component name as a step.
Ignore emoji, headings like "Ingredients"/"Method", and commentary/tip paragraphs that are not steps.

Return ONLY valid JSON in this exact format, no other text:
{"components":[{"title":"...","ingredients":[{"name":"...","amount":0,"unit":"..."}],"instructions":["Step 1...","Step 2..."]}]}

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

  const mapIngredient = (i: any): Ingredient => {
    if (typeof i === 'string') return { name: titleCase(i), amount: 0, unit: 'unit' };
    const rawAmount = i.amount ?? i.quantity ?? i.qty;
    return {
      name: titleCase(String(i.name ?? i.ingredient ?? i.item ?? '')),
      amount: typeof rawAmount === 'number' ? rawAmount : parseAmount(String(rawAmount ?? '')),
      unit: String(i.unit ?? i.units ?? 'unit'),
    };
  };
  const mapStep = (s: any): string =>
    typeof s === 'string' ? s : String(s.text ?? s.step ?? s.instruction ?? s);

  const pickIngredients = (o: any) =>
    o?.ingredients ?? o?.Ingredients ?? o?.ingredient_list ?? [];
  const pickInstructions = (o: any) =>
    o?.instructions ?? o?.Instructions ?? o?.steps ?? o?.method ?? o?.directions ?? [];

  // Multi-component recipes: each component contributes a heading row/step.
  const componentsRaw =
    parsed.components ?? parsed.parts ?? parsed.sections ?? parsed.Components;

  if (Array.isArray(componentsRaw) && componentsRaw.length > 0) {
    const ingredients: Ingredient[] = [];
    const instructions: string[] = [];
    const multiple = componentsRaw.length > 1;

    componentsRaw.forEach((component: any) => {
      const ing = pickIngredients(component);
      const steps = pickInstructions(component);
      if (!Array.isArray(ing) && !Array.isArray(steps)) return;

      const title = String(component?.title ?? component?.name ?? '').trim();
      if (multiple && title) {
        ingredients.push(createIngredientSection(titleCase(title)));
        instructions.push(toSectionTitle(titleCase(title)));
      }
      if (Array.isArray(ing)) ingredients.push(...ing.map(mapIngredient));
      if (Array.isArray(steps)) instructions.push(...steps.map(mapStep));
    });

    if (ingredients.length > 0 || instructions.length > 0) {
      return { ingredients, instructions };
    }
  }

  // Single-component / legacy shape
  const ingredientsRaw = pickIngredients(parsed);
  const instructionsRaw = pickInstructions(parsed);

  if (!Array.isArray(ingredientsRaw) || !Array.isArray(instructionsRaw)) {
    console.error('Unexpected AI response shape:', parsed);
    throw new Error('Invalid AI response structure');
  }

  return {
    ingredients: ingredientsRaw.map(mapIngredient),
    instructions: instructionsRaw.map(mapStep),
  };
}

