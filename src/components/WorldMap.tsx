import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Recipe, categoryPinColors, CATEGORIES } from '@/data/types';
import { findCountry, COUNTRIES } from '@/data/countries';

delete (L.Icon.Default.prototype as any)._getIconUrl;

const GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

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

// Match GeoJSON country names to our country list
function matchCountryName(geoName: string): string | null {
  // Direct match
  const direct = COUNTRIES.find(c => c.name.toLowerCase() === geoName.toLowerCase());
  if (direct) return direct.name;

  // Common aliases
  const aliases: Record<string, string> = {
    'united states of america': 'United States',
    'russian federation': 'Russia',
    'republic of korea': 'South Korea',
    "democratic people's republic of korea": 'North Korea',
    'republic of the congo': 'Republic of the Congo',
    'democratic republic of the congo': 'Democratic Republic of the Congo',
    'united republic of tanzania': 'Tanzania',
    'czech republic': 'Czech Republic',
    'ivory coast': "Côte d'Ivoire",
    "cote d'ivoire": "Côte d'Ivoire",
    'the bahamas': 'Bahamas',
    'united kingdom': 'United Kingdom',
    'republic of serbia': 'Serbia',
  };
  const aliased = aliases[geoName.toLowerCase()];
  if (aliased) return aliased;

  // Partial match
  const partial = COUNTRIES.find(c =>
    geoName.toLowerCase().includes(c.name.toLowerCase()) ||
    c.name.toLowerCase().includes(geoName.toLowerCase())
  );
  return partial?.name ?? null;
}

function CountryLayer({ recipes, onSelectRecipe }: { recipes: Recipe[]; onSelectRecipe: (recipe: Recipe) => void }) {
  const map = useMap();
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then(r => r.json())
      .then(data => setGeoData(data))
      .catch(err => console.warn('Failed to load GeoJSON:', err));
  }, []);

  const recipesByCountry = useMemo(() => {
    const map: Record<string, Recipe[]> = {};
    for (const r of recipes) {
      if (!map[r.country]) map[r.country] = [];
      map[r.country].push(r);
    }
    return map;
  }, [recipes]);

  if (!geoData) return null;

  return (
    <GeoJSON
      key={JSON.stringify(Object.keys(recipesByCountry))}
      data={geoData}
      style={(feature) => {
        const geoName = feature?.properties?.ADMIN || feature?.properties?.name || '';
        const matched = matchCountryName(geoName);
        const hasRecipes = matched && recipesByCountry[matched];
        return {
          fillColor: hasRecipes ? '#4ade80' : 'transparent',
          fillOpacity: hasRecipes ? 0.25 : 0,
          color: hasRecipes ? '#22c55e' : '#d1d5db',
          weight: hasRecipes ? 2 : 0.5,
        };
      }}
      onEachFeature={(feature, layer) => {
        const geoName = feature?.properties?.ADMIN || feature?.properties?.name || '';
        const matched = matchCountryName(geoName);
        const countryRecipes = matched ? recipesByCountry[matched] : null;

        if (countryRecipes && countryRecipes.length > 0) {
          const country = findCountry(matched!);
          layer.bindTooltip(
            `${country?.flag ?? '🌍'} ${matched} – ${countryRecipes.length} recipe${countryRecipes.length > 1 ? 's' : ''}`,
            { sticky: true, className: 'leaflet-tooltip-custom' }
          );

          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({ fillOpacity: 0.45, weight: 3 });
              l.bringToFront();
            },
            mouseout: (e) => {
              const l = e.target;
              l.setStyle({ fillOpacity: 0.25, weight: 2 });
            },
            click: () => {
              const bounds = layer.getBounds();
              map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });

              // Show popup with recipe list
              const popupContent = document.createElement('div');
              popupContent.className = 'text-sm space-y-1 font-sans min-w-[160px]';
              popupContent.innerHTML = `
                <p class="font-medium">${country?.flag ?? '🌍'} ${matched}</p>
                <ul class="space-y-1">${countryRecipes.map(r => {
                  const catLabel = CATEGORIES.find(c => c.value === r.category)?.label ?? '';
                  return `<li><button class="recipe-link text-left w-full hover:text-orange-600 transition-colors" data-id="${r.id}">
                    <strong style="font-family:'Playfair Display',serif">${r.title}</strong>
                    <span class="text-gray-500 ml-1 text-xs">· ${catLabel}</span>
                  </button></li>`;
                }).join('')}</ul>
              `;

              // Add click handlers
              setTimeout(() => {
                popupContent.querySelectorAll('.recipe-link').forEach(btn => {
                  btn.addEventListener('click', () => {
                    const id = (btn as HTMLElement).dataset.id;
                    const recipe = countryRecipes.find(r => r.id === id);
                    if (recipe) onSelectRecipe(recipe);
                  });
                });
              }, 50);

              L.popup()
                .setLatLng(bounds.getCenter())
                .setContent(popupContent)
                .openOn(map);
            },
          });
        }
      }}
    />
  );
}

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

interface Props {
  recipes: Recipe[];
  allRecipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
}

export default function WorldMap({ recipes, allRecipes, onSelectRecipe }: Props) {
  const validRecipes = recipes.filter(r => r.lat != null && r.lng != null);
  const groups = groupByLocation(validRecipes);

  const mapStats = useMemo(() => {
    const countriesWithRecipes = new Set(allRecipes.map(r => r.country)).size;
    const totalCountries = 195;
    const pct = Math.round((countriesWithRecipes / totalCountries) * 100);
    return { countriesWithRecipes, pct };
  }, [allRecipes]);

  return (
    <div className="space-y-3">
      {/* Map summary bar */}
      <div className="flex flex-wrap gap-4 px-1 text-sm">
        <span className="flex items-center gap-1.5">
          🌍 <strong>{mapStats.countriesWithRecipes}</strong> countries cooked
        </span>
        <span className="flex items-center gap-1.5">
          📊 <strong>{mapStats.pct}%</strong> of the world covered
        </span>
        <span className="flex items-center gap-1.5">
          📌 <strong>{validRecipes.length}</strong> recipes on map
        </span>
      </div>

      <div className="w-full h-[calc(100vh-200px)] rounded-lg overflow-hidden border border-border">
        <MapContainer center={[20, 0]} zoom={2} className="w-full h-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <CountryLayer recipes={allRecipes} onSelectRecipe={onSelectRecipe} />
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
    </div>
  );
}
