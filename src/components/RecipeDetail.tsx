import { useState, useMemo } from 'react';
import { Recipe, categoryColors, CATEGORIES, CookStatus } from '@/data/types';
import { findCountry } from '@/data/countries';
import { getPollinationsUrl } from '@/lib/pollinations';
import { X, Minus, Plus, Pencil, Trash2, ImageIcon, Heart, ChefHat, BookmarkPlus } from 'lucide-react';

interface Props {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavourite: (id: string) => void;
  onSetCookStatus: (id: string, status: CookStatus) => void;
}

function smartRound(val: number): string {
  if (val >= 10) return Math.round(val).toString();
  if (val >= 1) {
    const r = Math.round(val * 4) / 4;
    return r % 1 === 0 ? r.toString() : r.toFixed(r % 0.5 === 0 ? 1 : 2);
  }
  const r = Math.round(val * 4) / 4;
  if (r === 0) return '⅛';
  return r % 1 === 0 ? r.toString() : r.toFixed(2).replace(/0+$/, '');
}

function StepImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) return null;

  return (
    <div className="ml-10 rounded-lg overflow-hidden bg-muted relative">
      {!loaded && (
        <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground justify-center">
          <ImageIcon className="w-4 h-4 animate-pulse" /> Generating image…
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full max-h-48 object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

export default function RecipeDetail({ recipe, onClose, onEdit, onDelete, onToggleFavourite, onSetCookStatus }: Props) {
  const [servings, setServings] = useState(recipe.baseServings);
  const country = findCountry(recipe.country);
  const imgSrc = recipe.imageMode === 'ai'
    ? getPollinationsUrl(recipe.title, recipe.country)
    : recipe.imageUrl;
  const catLabel = CATEGORIES.find(c => c.value === recipe.category)?.label ?? '';
  const ratio = servings / recipe.baseServings;

  const scaledIngredients = useMemo(
    () => recipe.ingredients.map(i => ({ ...i, scaled: smartRound(i.amount * ratio) })),
    [recipe.ingredients, ratio]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 backdrop-blur-sm overflow-y-auto p-4 sm:p-8">
      <div className="relative w-full max-w-2xl bg-card rounded-xl shadow-2xl overflow-hidden my-4" onClick={e => e.stopPropagation()}>
        {/* Header actions */}
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <button
            onClick={() => onToggleFavourite(recipe.id)}
            className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
              recipe.favourite ? 'bg-red-500/80 text-white' : 'bg-card/80 hover:bg-card'
            }`}
            title={recipe.favourite ? 'Remove favourite' : 'Add favourite'}
          >
            <Heart className={`w-4 h-4 ${recipe.favourite ? 'fill-current' : ''}`} />
          </button>
          <button onClick={onEdit} className="p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors" title="Edit">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-full bg-destructive/80 backdrop-blur-sm hover:bg-destructive transition-colors text-destructive-foreground" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero image */}
        <div className="aspect-video overflow-hidden">
          <img src={imgSrc} alt={recipe.title} className="w-full h-full object-cover" />
        </div>

        <div className="p-6 space-y-6">
          {/* Title & meta */}
          <div>
            <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-2 ${categoryColors[recipe.category]}`}>{catLabel}</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold">{recipe.title}</h2>
            <p className="text-muted-foreground mt-1">{country?.flag ?? '🌍'} {recipe.country}</p>
          </div>

          {/* Cook status buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onSetCookStatus(recipe.id, 'cooked')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                recipe.cookStatus === 'cooked'
                  ? 'bg-green-600 text-white'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" /> {recipe.cookStatus === 'cooked' ? 'Cooked ✓' : 'Mark as Cooked'}
            </button>
            <button
              onClick={() => onSetCookStatus(recipe.id, 'want-to-cook')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                recipe.cookStatus === 'want-to-cook'
                  ? 'bg-blue-500 text-white'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              <BookmarkPlus className="w-3.5 h-3.5" /> {recipe.cookStatus === 'want-to-cook' ? 'Want to Cook ✓' : 'Want to Cook'}
            </button>
          </div>

          {/* Time chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Prep', val: `${recipe.prepTime}m` },
              { label: 'Cook', val: `${recipe.cookTime}m` },
              { label: 'Total', val: `${recipe.prepTime + recipe.cookTime}m` },
            ].map(c => (
              <span key={c.label} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm">
                {c.label}: <strong>{c.val}</strong>
              </span>
            ))}
          </div>

          {/* Serving scaler */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Servings</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold text-lg">{servings}</span>
              <button onClick={() => setServings(servings + 1)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Ingredients</h3>
            <ul className="space-y-2">
              {scaledIngredients.map((ing, i) => (
                <li key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                  <span>{ing.name}</span>
                  <span className="text-primary font-medium">{ing.scaled} {ing.unit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Method */}
          <div>
            <h3 className="font-serif text-xl font-semibold mb-3">Method</h3>
            <ol className="space-y-4">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="space-y-2">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{step}</p>
                  </div>
                  {recipe.stepImages?.[i] && (
                    <StepImage src={recipe.stepImages[i]} alt={`Step ${i + 1}`} />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
