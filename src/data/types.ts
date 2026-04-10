export type Category = 'breakfast' | 'starter' | 'mains' | 'dessert' | 'snack';

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  category: Category;
  country: string;
  lat: number | null;
  lng: number | null;
  prepTime: number;
  cookTime: number;
  baseServings: number;
  ingredients: Ingredient[];
  instructions: string[];
  imageMode: 'ai' | 'custom';
  imageUrl: string;
}

export const UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'pinch', 'unit', 'cup', 'bunch', 'handful', 'clove', 'slice', 'stick'] as const;

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'starter', label: 'Starter' },
  { value: 'mains', label: 'Mains' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'snack', label: 'Snack' },
];

export const categoryColors: Record<Category, string> = {
  breakfast: 'bg-cat-breakfast/20 text-cat-breakfast-fg',
  starter: 'bg-cat-starter/20 text-cat-starter-fg',
  mains: 'bg-cat-mains/20 text-cat-mains-fg',
  dessert: 'bg-cat-dessert/20 text-cat-dessert-fg',
  snack: 'bg-cat-snack/20 text-cat-snack-fg',
};

export const categoryPinColors: Record<Category, string> = {
  breakfast: '#d4952b',
  starter: '#c49a5c',
  mains: '#c45a3c',
  dessert: '#b07a8a',
  snack: '#7a9a6e',
};
