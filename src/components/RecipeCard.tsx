import { useState } from 'react';
import { Recipe, categoryColors, CATEGORIES } from '@/data/types';
import { findCountry } from '@/data/countries';
import { getPollinationsUrl } from '@/lib/pollinations';
import { Heart } from 'lucide-react';

interface Props {
  recipe: Recipe;
  onClick: () => void;
  onToggleFavourite: (id: string) => void;
}

export default function RecipeCard({ recipe, onClick, onToggleFavourite }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const country = findCountry(recipe.country);
  const imgSrc = recipe.imageMode === 'ai'
    ? getPollinationsUrl(recipe.title, recipe.country)
    : recipe.imageUrl;
  const catLabel = CATEGORIES.find(c => c.value === recipe.category)?.label ?? recipe.category;
  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <div className="group relative rounded-lg overflow-hidden bg-card border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavourite(recipe.id);
        }}
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-sm transition-colors ${
          recipe.favourite
            ? 'bg-red-500/80 text-white'
            : 'bg-foreground/40 text-white/80 hover:bg-foreground/60'
        }`}
        title={recipe.favourite ? 'Remove from favourites' : 'Add to favourites'}
      >
        <Heart className={`w-4 h-4 ${recipe.favourite ? 'fill-current' : ''}`} />
      </button>

      <button
        onClick={onClick}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <div className="relative aspect-[3/2] overflow-hidden">
          {!imgLoaded && <div className="absolute inset-0 skeleton-shimmer" />}
          <img
            src={imgSrc}
            alt={recipe.title}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
          />
          {recipe.imageMode === 'ai' && (
            <span className="absolute top-2 left-12 text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground/60 text-primary-foreground backdrop-blur-sm">
              AI Photo
            </span>
          )}
          <span className={`absolute top-2 left-2 text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[recipe.category]}`}>
            {catLabel}
          </span>
          {recipe.cookStatus === 'cooked' && (
            <span className="absolute bottom-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-600/80 text-white backdrop-blur-sm">
              ✓ Cooked
            </span>
          )}
          {recipe.cookStatus === 'want-to-cook' && (
            <span className="absolute bottom-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/80 text-white backdrop-blur-sm">
              Want to Cook
            </span>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-serif text-lg font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {country?.flag ?? '🌍'} {country?.name ?? recipe.country}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Prep {recipe.prepTime}m</span>
            <span className="text-border">·</span>
            <span>Cook {recipe.cookTime}m</span>
            <span className="text-border">·</span>
            <span className="font-medium text-foreground">{totalTime}m total</span>
          </div>
        </div>
      </button>
    </div>
  );
}
