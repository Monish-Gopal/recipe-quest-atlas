import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Recipe, Category, CookStatus } from '@/data/types';
import { SEED_RECIPES } from '@/data/seedRecipes';

const STORAGE_KEY = 'my-culinary-journey-recipes';
const VERSION_KEY = 'my-culinary-journey-version';
const BACKUP_KEY = 'my-culinary-journey-backup';
export const STORAGE_VERSION = 1;

function loadRecipes(): Recipe[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
        return parsed as Recipe[];
      }
    }
  } catch (err) {
    console.error('Could not read saved recipes, trying backup:', err);
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) {
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as Recipe[];
      }
    } catch (backupErr) {
      console.error('Backup unreadable:', backupErr);
    }
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_RECIPES));
    localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  } catch (err) {
    console.error('Could not seed recipe storage:', err);
  }
  return SEED_RECIPES;
}

function isValidRecipe(r: unknown): r is Recipe {
  const rec = r as Partial<Recipe>;
  return !!rec && typeof rec.title === 'string' && Array.isArray(rec.ingredients) && Array.isArray(rec.instructions);
}

type StatusFilter = 'all' | 'favourites' | 'cooked' | 'want-to-cook';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const saveFailed = useRef(false);

  useEffect(() => {
    const payload = JSON.stringify(recipes);
    try {
      // Keep the last good copy around before overwriting
      const previous = localStorage.getItem(STORAGE_KEY);
      if (previous) {
        try {
          localStorage.setItem(BACKUP_KEY, previous);
        } catch {
          localStorage.removeItem(BACKUP_KEY);
        }
      }
      localStorage.setItem(STORAGE_KEY, payload);
      localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
      saveFailed.current = false;
    } catch (err) {
      console.error('Failed to save recipes:', err);
      if (!saveFailed.current) {
        saveFailed.current = true;
        toast.error('Your recipes could not be saved — browser storage is full.', {
          description: 'Export a backup, then remove some recipes or large custom photos.',
          duration: 10000,
        });
      }
    }
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

  const exportRecipes = useCallback(() => {
    const data = JSON.stringify({ version: STORAGE_VERSION, exportedAt: new Date().toISOString(), recipes }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nom-nom-mon-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded.');
  }, [recipes]);

  const importRecipes = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming: unknown[] = Array.isArray(parsed) ? parsed : parsed?.recipes;
      if (!Array.isArray(incoming)) throw new Error('Unrecognised backup file');

      const valid = incoming.filter(isValidRecipe).map(r => ({
        ...r,
        id: r.id || crypto.randomUUID(),
      }));
      if (valid.length === 0) throw new Error('No recipes found in that file');

      setRecipes(prev => {
        const byId = new Map(prev.map(r => [r.id, r]));
        valid.forEach(r => byId.set(r.id, r));
        return Array.from(byId.values());
      });
      toast.success(`Imported ${valid.length} recipe${valid.length === 1 ? '' : 's'}.`);
    } catch (err) {
      console.error('Import failed:', err);
      toast.error(err instanceof Error ? err.message : 'Could not read that backup file.');
    }
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
    exportRecipes, importRecipes,
    search, setSearch, categoryFilter, setCategoryFilter,
    statusFilter, setStatusFilter,
    stats,
  };
}
