import { useState, useEffect, useCallback, useMemo } from 'react';
import { Recipe, Category, CookStatus } from '@/data/types';
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

type StatusFilter = 'all' | 'favourites' | 'cooked' | 'want-to-cook';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  }, [recipes]);

  const addRecipe = useCallback((recipe: Omit<Recipe, 'id'>) => {
    const newRecipe: Recipe = { ...recipe, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setRecipes(prev => [newRecipe, ...prev]);
    return newRecipe;
  }, []);

  const updateRecipe = useCallback((recipe: Recipe) => {
    setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r));
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  }, []);

  const toggleFavourite = useCallback((id: string) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, favourite: !r.favourite } : r));
  }, []);

  const setCookStatus = useCallback((id: string, status: CookStatus) => {
    setRecipes(prev => prev.map(r => r.id === id ? {
      ...r,
      cookStatus: r.cookStatus === status ? 'none' : status,
      cookedAt: status === 'cooked' ? new Date().toISOString() : r.cookedAt,
    } : r));
  }, []);

  const filtered = useMemo(() => {
    let result = recipes;
    if (categoryFilter !== 'all') {
      result = result.filter(r => r.category === categoryFilter);
    }
    if (statusFilter === 'favourites') {
      result = result.filter(r => r.favourite);
    } else if (statusFilter === 'cooked') {
      result = result.filter(r => r.cookStatus === 'cooked');
    } else if (statusFilter === 'want-to-cook') {
      result = result.filter(r => r.cookStatus === 'want-to-cook');
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
  }, [recipes, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: recipes.length,
    countries: new Set(recipes.map(r => r.country)).size,
  }), [recipes]);

  return {
    recipes, filtered, addRecipe, updateRecipe, deleteRecipe,
    toggleFavourite, setCookStatus,
    search, setSearch, categoryFilter, setCategoryFilter,
    statusFilter, setStatusFilter,
    stats,
  };
}
