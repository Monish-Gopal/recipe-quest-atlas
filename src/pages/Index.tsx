import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Search, BookOpen, Globe, Heart, ChefHat, BookmarkPlus } from 'lucide-react';
import { useRecipes } from '@/hooks/useRecipes';
import { Recipe, CATEGORIES, Category, categoryColors, CookStatus } from '@/data/types';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetail from '@/components/RecipeDetail';
import RecipeFormModal from '@/components/RecipeFormModal';
import WorldMap from '@/components/WorldMap';
import DashboardInsights from '@/components/DashboardInsights';

type View = 'dashboard' | 'map';

export default function Index() {
  const {
    recipes, filtered, addRecipe, updateRecipe, deleteRecipe,
    toggleFavourite, setCookStatus,
    search, setSearch, categoryFilter, setCategoryFilter,
    statusFilter, setStatusFilter,
    stats,
  } = useRecipes();
  const [view, setView] = useState<View>('dashboard');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [formRecipe, setFormRecipe] = useState<Recipe | null | undefined>(undefined);

  // Keep selectedRecipe in sync with latest data
  const currentSelected = selectedRecipe ? recipes.find(r => r.id === selectedRecipe.id) ?? null : null;

  const handleSave = useCallback((data: Omit<Recipe, 'id'> & { id?: string }) => {
    if (data.id) {
      updateRecipe(data as Recipe);
      toast.success('Recipe updated!');
    } else {
      addRecipe(data);
      toast.success('Recipe added!');
    }
    setFormRecipe(undefined);
    setSelectedRecipe(null);
  }, [addRecipe, updateRecipe]);

  const handleDelete = useCallback(() => {
    if (currentSelected) {
      deleteRecipe(currentSelected.id);
      toast.success('Recipe deleted.');
      setSelectedRecipe(null);
    }
  }, [currentSelected, deleteRecipe]);

  const handleEditFromDetail = useCallback(() => {
    setFormRecipe(currentSelected);
    setSelectedRecipe(null);
  }, [currentSelected]);

  const tabClass = (v: View) =>
    `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
      view === v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
    }`;

  const filterClass = (c: Category | 'all') =>
    `px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
      categoryFilter === c
        ? c === 'all'
          ? 'bg-primary text-primary-foreground'
          : categoryColors[c as Category]
        : 'bg-secondary text-secondary-foreground hover:bg-muted'
    }`;

  const statusBtnClass = (s: typeof statusFilter) =>
    `flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
      statusFilter === s
        ? 'bg-primary text-primary-foreground'
        : 'bg-secondary text-secondary-foreground hover:bg-muted'
    }`;

  return (
    <div className="relative z-10 min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight whitespace-nowrap">
            Nom Nom Mon
          </h1>
          <div className="flex items-center gap-2 bg-muted rounded-full p-1">
            <button className={tabClass('dashboard')} onClick={() => setView('dashboard')}>
              <BookOpen className="w-4 h-4" /> <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button className={tabClass('map')} onClick={() => setView('map')}>
              <Globe className="w-4 h-4" /> <span className="hidden sm:inline">World Map</span>
            </button>
          </div>
          <button
            onClick={() => setFormRecipe(null)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Recipe</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {view === 'dashboard' ? (
          <>
            {/* Insights */}
            <DashboardInsights recipes={recipes} />

            {/* Search + Filters */}
            <div className="space-y-4 mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Search recipes, countries, ingredients…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {/* Category filters */}
              <div className="flex flex-wrap items-center gap-2">
                <button className={filterClass('all')} onClick={() => setCategoryFilter('all')}>All</button>
                {CATEGORIES.map(c => (
                  <button key={c.value} className={filterClass(c.value)} onClick={() => setCategoryFilter(c.value)}>{c.label}</button>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">
                  {stats.total} recipes · {stats.countries} countries
                </span>
              </div>
              {/* Status filters */}
              <div className="flex flex-wrap items-center gap-2">
                <button className={statusBtnClass('all')} onClick={() => setStatusFilter('all')}>All</button>
                <button className={statusBtnClass('favourites')} onClick={() => setStatusFilter('favourites')}>
                  <Heart className="w-3 h-3" /> Favourites
                </button>
                <button className={statusBtnClass('cooked')} onClick={() => setStatusFilter('cooked')}>
                  <ChefHat className="w-3 h-3" /> Cooked
                </button>
                <button className={statusBtnClass('want-to-cook')} onClick={() => setStatusFilter('want-to-cook')}>
                  <BookmarkPlus className="w-3 h-3" /> Want to Cook
                </button>
              </div>
            </div>

            {/* Recipe grid */}
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {filtered.map(r => (
                <RecipeCard key={r.id} recipe={r} onClick={() => setSelectedRecipe(r)} onToggleFavourite={toggleFavourite} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-20 text-sm">No recipes found. Try adjusting your search or filters.</p>
            )}
          </>
        ) : (
          <WorldMap recipes={filtered} onSelectRecipe={setSelectedRecipe} />
        )}
      </main>

      {/* Modals */}
      {currentSelected && (
        <RecipeDetail
          recipe={currentSelected}
          onClose={() => setSelectedRecipe(null)}
          onEdit={handleEditFromDetail}
          onDelete={handleDelete}
          onToggleFavourite={toggleFavourite}
          onSetCookStatus={setCookStatus}
        />
      )}
      {formRecipe !== undefined && (
        <RecipeFormModal recipe={formRecipe} onClose={() => setFormRecipe(undefined)} onSave={handleSave} />
      )}
    </div>
  );
}
