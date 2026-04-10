import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Recipe, categoryPinColors, CATEGORIES } from '@/data/types';
import { findCountry } from '@/data/countries';

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

// Group recipes by country coordinates
function groupByLocation(recipes: Recipe[]) {
  const groups: Record<string, Recipe[]> = {};
  for (const r of recipes) {
    if (r.lat == null || r.lng == null) continue;
    const key = `${r.lat},${r.lng}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return Object.values(groups);
}

export default function WorldMap({ recipes, onSelectRecipe }: Props) {
  const validRecipes = recipes.filter(r => r.lat != null && r.lng != null);
  const groups = groupByLocation(validRecipes);

  return (
    <div className="w-full h-[calc(100vh-140px)] rounded-lg overflow-hidden border border-border">
      <MapContainer center={[20, 0]} zoom={2} className="w-full h-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapBounds recipes={validRecipes} />
        {groups.map(group => {
          const first = group[0];
          const country = findCountry(first.country);
          const mainCat = first.category;
          return (
            <Marker
              key={`${first.lat},${first.lng}`}
              position={[first.lat!, first.lng!]}
              icon={createPinIcon(categoryPinColors[mainCat], country?.flag ?? '🌍')}
            >
              <Popup>
                <div className="text-sm space-y-1 font-sans min-w-[140px]">
                  <p className="font-medium">{country?.flag} {first.country}</p>
                  <ul className="space-y-1">
                    {group.map(r => {
                      const catLabel = CATEGORIES.find(c => c.value === r.category)?.label ?? '';
                      return (
                        <li key={r.id}>
                          <button
                            className="text-left w-full hover:text-primary transition-colors"
                            onClick={() => onSelectRecipe(r)}
                          >
                            <strong className="font-serif">{r.title}</strong>
                            <span className="text-muted-foreground ml-1 text-xs">· {catLabel}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
