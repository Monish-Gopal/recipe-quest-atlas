import { Ingredient } from '@/data/types';

export interface IngredientSection<T extends Ingredient = Ingredient> {
  title: string | null;
  ingredients: T[];
}

export function isIngredientSection(ingredient: Ingredient): boolean {
  return ingredient.isSection === true;
}

export function createIngredientSection(title = ''): Ingredient {
  return { name: title, amount: 0, unit: 'unit', isSection: true };
}

export function parseIngredients<T extends Ingredient>(ingredients: T[]): IngredientSection<T>[] {
  const sections: IngredientSection<T>[] = [];
  let current: IngredientSection<T> = { title: null, ingredients: [] };

  ingredients.forEach(ingredient => {
    if (isIngredientSection(ingredient)) {
      if (current.title !== null || current.ingredients.length > 0) sections.push(current);
      current = { title: ingredient.name.trim(), ingredients: [] };
    } else {
      current.ingredients.push(ingredient);
    }
  });

  if (current.title !== null || current.ingredients.length > 0) sections.push(current);
  return sections;
}