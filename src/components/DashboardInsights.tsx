import { useMemo } from 'react';
import { Recipe } from '@/data/types';
import { findCountry } from '@/data/countries';
import { BarChart3, Clock, Globe, Utensils, Heart, ChefHat } from 'lucide-react';

interface Props {
  recipes: Recipe[];
}

export default function DashboardInsights({ recipes }: Props) {
  const insights = useMemo(() => {
    if (recipes.length === 0) return null;

    // Average cooking time
    const avgTime = Math.round(
      recipes.reduce((sum, r) => sum + r.prepTime + r.cookTime, 0) / recipes.length
    );

    // Most used ingredients (top 5)
    const ingCount: Record<string, number> = {};
    recipes.forEach(r => r.ingredients.forEach(i => {
      const name = i.name.toLowerCase().trim();
      if (name) ingCount[name] = (ingCount[name] || 0) + 1;
    }));
    const topIngredients = Object.entries(ingCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Most cooked country
    const countryCount: Record<string, number> = {};
    recipes.filter(r => r.cookStatus === 'cooked').forEach(r => {
      countryCount[r.country] = (countryCount[r.country] || 0) + 1;
    });
    const topCountry = Object.entries(countryCount).sort((a, b) => b[1] - a[1])[0];

    // Recently added (last 5)
    const recentlyAdded = [...recipes]
      .filter(r => r.createdAt)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, 3);

    // Recently cooked (last 5)
    const recentlyCooked = [...recipes]
      .filter(r => r.cookedAt)
      .sort((a, b) => (b.cookedAt ?? '').localeCompare(a.cookedAt ?? ''))
      .slice(0, 3);

    // Favourites count
    const favCount = recipes.filter(r => r.favourite).length;

    // Cooked count
    const cookedCount = recipes.filter(r => r.cookStatus === 'cooked').length;

    return { avgTime, topIngredients, topCountry, recentlyAdded, recentlyCooked, favCount, cookedCount };
  }, [recipes]);

  if (!insights) return null;

  return (
    <div className="mb-6 space-y-4">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Clock className="w-4 h-4" />} label="Avg Cook Time" value={`${insights.avgTime}m`} />
        <StatCard icon={<Heart className="w-4 h-4" />} label="Favourites" value={String(insights.favCount)} />
        <StatCard icon={<ChefHat className="w-4 h-4" />} label="Cooked" value={String(insights.cookedCount)} />
        <StatCard
          icon={<Globe className="w-4 h-4" />}
          label="Top Cuisine"
          value={insights.topCountry ? `${findCountry(insights.topCountry[0])?.flag ?? '🌍'} ${insights.topCountry[0]}` : '—'}
        />
      </div>

      {/* Detail row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Top ingredients */}
        {insights.topIngredients.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Utensils className="w-4 h-4 text-primary" /> Most Used Ingredients
            </div>
            <ul className="space-y-1">
              {insights.topIngredients.map(([name, count]) => (
                <li key={name} className="text-sm flex justify-between">
                  <span className="capitalize">{name}</span>
                  <span className="text-muted-foreground">{count}×</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recently added */}
        {insights.recentlyAdded.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Recently Added
            </div>
            <ul className="space-y-1">
              {insights.recentlyAdded.map(r => (
                <li key={r.id} className="text-sm truncate">
                  {findCountry(r.country)?.flag ?? '🌍'} {r.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recently cooked */}
        {insights.recentlyCooked.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <ChefHat className="w-4 h-4 text-primary" /> Recently Cooked
            </div>
            <ul className="space-y-1">
              {insights.recentlyCooked.map(r => (
                <li key={r.id} className="text-sm truncate">
                  {findCountry(r.country)?.flag ?? '🌍'} {r.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
      <div className="p-2 rounded-full bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-sm">{value}</p>
      </div>
    </div>
  );
}
