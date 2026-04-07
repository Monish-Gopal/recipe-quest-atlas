import { useState, useEffect, useCallback, useMemo } from 'react';
import { Recipe, Category } from '@/data/types';
import { SEED_RECIPES } from '@/data/seedRecipes';

const STORAGE_KEY = 'my-culinary-journey-recipes';

function loadRecipes(): Recipe[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_RECIPES));
  return SEED_RECIPES;
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  }, [recipes]);

  const addRecipe = useCallback((recipe: Omit<Recipe, 'id'>) => {
    const newRecipe: Recipe = { ...recipe, id: crypto.randomUUID() };
    setRecipes(prev => [newRecipe, ...prev]);
    return newRecipe;
  }, []);

  const updateRecipe = useCallback((recipe: Recipe) => {
    setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r));
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  }, []);

  const filtered = useMemo(() => {
    let result = recipes;
    if (categoryFilter !== 'all') {
      result = result.filter(r => r.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.ingredients.some(i => i.name.toLowerCase().includes(q))
      );
    }
    return result;
  }, [recipes, search, categoryFilter]);

  const stats = useMemo(() => ({
    total: recipes.length,
    countries: new Set(recipes.map(r => r.country)).size,
  }), [recipes]);

  return { recipes, filtered, addRecipe, updateRecipe, deleteRecipe, search, setSearch, categoryFilter, setCategoryFilter, stats };
}
