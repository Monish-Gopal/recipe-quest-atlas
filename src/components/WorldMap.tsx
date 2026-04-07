import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Recipe, categoryPinColors, CATEGORIES } from '@/data/types';
import { findCountry } from '@/data/countries';

// Fix default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;

function createPinIcon(color: string, flag: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 28 16 28s16-16 16-28C32 7.16 24.84 0 16 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <text x="16" y="20" text-anchor="middle" font-size="14">${flag}</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -44],
  });
}

function MapBounds({ recipes }: { recipes: Recipe[] }) {
  const map = useMap();
  useEffect(() => {
    const points = recipes.filter(r => r.lat != null && r.lng != null).map(r => [r.lat!, r.lng!] as [number, number]);
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points.map(p => L.latLng(p[0], p[1]))), { padding: [50, 50], maxZoom: 5 });
    }
  }, [recipes, map]);
  return null;
}

interface Props {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
}

export default function WorldMap({ recipes, onSelectRecipe }: Props) {
  const validRecipes = recipes.filter(r => r.lat != null && r.lng != null);

  return (
    <div className="w-full h-[calc(100vh-140px)] rounded-lg overflow-hidden border border-border">
      <MapContainer center={[20, 0]} zoom={2} className="w-full h-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapBounds recipes={validRecipes} />
        {validRecipes.map(recipe => {
          const country = findCountry(recipe.country);
          const catLabel = CATEGORIES.find(c => c.value === recipe.category)?.label ?? '';
          return (
            <Marker
              key={recipe.id}
              position={[recipe.lat!, recipe.lng!]}
              icon={createPinIcon(categoryPinColors[recipe.category], country?.flag ?? '🌍')}
              eventHandlers={{ click: () => onSelectRecipe(recipe) }}
            >
              <Popup>
                <div className="text-sm space-y-1 font-sans">
                  <strong className="font-serif">{recipe.title}</strong>
                  <p>{country?.flag} {recipe.country} · {catLabel}</p>
                  <p className="text-muted-foreground">{recipe.prepTime + recipe.cookTime}m total</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
