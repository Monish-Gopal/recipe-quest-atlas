import { useState, useEffect } from 'react';
import { Recipe, Category, CATEGORIES, UNITS, Ingredient } from '@/data/types';
import { COUNTRIES, findCountry } from '@/data/countries';
import { parseRecipeText, isVisualStep, getStepImageUrl } from '@/lib/pollinationsText';
import { X, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  recipe?: Recipe | null;
  onSave: (recipe: Omit<Recipe, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

const empty: Omit<Recipe, 'id'> = {
  title: '', category: 'mains', country: '', lat: null, lng: null,
  prepTime: 0, cookTime: 0, baseServings: 1,
  ingredients: [{ name: '', amount: 0, unit: 'g' }],
  instructions: [''],
  imageMode: 'ai', imageUrl: '',
  generateStepImages: false,
};

type Mode = 'manual' | 'ai';

export default function RecipeFormModal({ recipe, onSave, onClose }: Props) {
  const [form, setForm] = useState<Omit<Recipe, 'id'> & { id?: string }>(recipe ?? { ...empty });
  const [mode, setMode] = useState<Mode>('manual');
  const [aiText, setAiText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'country') {
        const c = findCountry(val as string);
        if (c) { next.lat = c.lat; next.lng = c.lng; }
      }
      return next;
    });
  };

  const updateIngredient = (i: number, field: keyof Ingredient, val: string | number) => {
    const ings = [...form.ingredients];
    ings[i] = { ...ings[i], [field]: val };
    set('ingredients', ings);
  };

  const addIngredient = () => set('ingredients', [...form.ingredients, { name: '', amount: 0, unit: 'g' }]);
  const removeIngredient = (i: number) => set('ingredients', form.ingredients.filter((_, j) => j !== i));

  const updateStep = (i: number, val: string) => {
    const steps = [...form.instructions];
    steps[i] = val;
    set('instructions', steps);
  };
  const addStep = () => set('instructions', [...form.instructions, '']);
  const removeStep = (i: number) => set('instructions', form.instructions.filter((_, j) => j !== i));

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setAiParsing(true);
    setAiError('');
    try {
      const parsed = await parseRecipeText(aiText);
      set('ingredients', parsed.ingredients.length > 0 ? parsed.ingredients : [{ name: '', amount: 0, unit: 'g' }]);
      set('instructions', parsed.instructions.length > 0 ? parsed.instructions : ['']);
      setMode('manual'); // switch to manual to show structured results
    } catch (err) {
      setAiError('AI parsing failed. Please try again or enter manually.');
    } finally {
      setAiParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Generate step images if toggle is on
    if (form.generateStepImages && form.title) {
      const stepImages: Record<number, string> = {};
      form.instructions.forEach((step, i) => {
        if (step.trim() && isVisualStep(step)) {
          stepImages[i] = getStepImageUrl(step, form.title);
        }
      });
      onSave({ ...form, stepImages });
    } else {
      onSave({ ...form, stepImages: undefined });
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-sm font-medium mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 backdrop-blur-sm overflow-y-auto p-4 sm:p-8" onClick={onClose}>
      <div className="relative w-full max-w-xl bg-card rounded-xl shadow-2xl overflow-hidden my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-serif text-xl font-bold">{recipe ? 'Edit Recipe' : 'Add Recipe'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className={labelClass}>Recipe Title</label>
            <input className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>

          {/* Category + Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <select className={inputClass} value={form.category} onChange={e => set('category', e.target.value as Category)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input className={inputClass} value={form.country} onChange={e => set('country', e.target.value)} list="countries-list" required />
              <datalist id="countries-list">
                {COUNTRIES.map(c => <option key={c.name} value={c.name} />)}
              </datalist>
            </div>
          </div>

          {/* Times + Servings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Prep (min)</label>
              <input type="number" min={0} className={inputClass} value={form.prepTime} onChange={e => set('prepTime', +e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Cook (min)</label>
              <input type="number" min={0} className={inputClass} value={form.cookTime} onChange={e => set('cookTime', +e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Servings</label>
              <input type="number" min={1} className={inputClass} value={form.baseServings} onChange={e => set('baseServings', +e.target.value)} />
            </div>
          </div>

          {/* Mode toggle for new recipes */}
          {!recipe && (
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${mode === 'manual' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${mode === 'ai' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Quick Create with AI
              </button>
            </div>
          )}

          {/* AI Quick Create */}
          {mode === 'ai' && !recipe && (
            <div className="space-y-3">
              <label className={labelClass}>Paste your recipe (ingredients + method in one block)</label>
              <textarea
                rows={8}
                className={`${inputClass} resize-y min-h-[120px]`}
                placeholder={"Example:\n2 cups flour, 3 eggs, 200ml milk, pinch of salt.\n\nMix flour and salt. Whisk eggs into milk. Combine wet and dry ingredients. Fry in a hot pan until golden on each side."}
                value={aiText}
                onChange={e => setAiText(e.target.value)}
              />
              {aiError && <p className="text-sm text-destructive">{aiError}</p>}
              <button
                type="button"
                onClick={handleAiParse}
                disabled={aiParsing || !aiText.trim()}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {aiParsing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Parsing with AI…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Parse Recipe</>
                )}
              </button>
            </div>
          )}

          {/* Manual ingredients + steps (always shown in manual mode or when editing) */}
          {(mode === 'manual' || recipe) && (
            <>
              {/* Ingredients */}
              <div>
                <label className={labelClass}>Ingredients</label>
                <div className="space-y-2">
                  {form.ingredients.map((ing, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input placeholder="Ingredient" className={`${inputClass} flex-1 min-w-[180px]`} value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} />
                      <input type="number" step="any" min={0} placeholder="Amt" className={`${inputClass} w-20`} value={ing.amount || ''} onChange={e => updateIngredient(i, 'amount', +e.target.value)} />
                      <select className={`${inputClass} w-24`} value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      {form.ingredients.length > 1 && (
                        <button type="button" onClick={() => removeIngredient(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addIngredient} className="mt-2 text-sm text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add ingredient
                </button>
              </div>

              {/* Method */}
              <div>
                <label className={labelClass}>Method</label>
                <div className="space-y-2">
                  {form.instructions.map((step, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-2">{i + 1}</span>
                      <textarea rows={2} className={`${inputClass} flex-1 resize-none`} value={step} onChange={e => updateStep(i, e.target.value)} />
                      {form.instructions.length > 1 && (
                        <button type="button" onClick={() => removeStep(i)} className="p-1 mt-2 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addStep} className="mt-2 text-sm text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add step
                </button>
              </div>
            </>
          )}

          {/* Step image toggle */}
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.generateStepImages ?? false}
                onChange={e => set('generateStepImages', e.target.checked)}
                className="rounded border-input"
              />
              Generate visual cooking steps (AI images)
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Only visually meaningful steps (chopping, frying, plating, etc.) will get images.
            </p>
          </div>

          {/* Photo */}
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.imageMode === 'ai'} onChange={e => set('imageMode', e.target.checked ? 'ai' : 'custom')} className="rounded border-input" />
              Generate AI photo automatically
            </label>
            {form.imageMode === 'custom' && (
              <input className={`${inputClass} mt-2`} placeholder="Custom image URL" value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} />
            )}
          </div>

          <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            {recipe ? 'Save Changes' : 'Add Recipe'}
          </button>
        </form>
      </div>
    </div>
  );
}
