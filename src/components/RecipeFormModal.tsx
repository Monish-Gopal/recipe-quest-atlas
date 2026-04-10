import { useState, useEffect } from 'react';
import { Recipe, Category, CATEGORIES, UNITS, Ingredient } from '@/data/types';
import { findCountry } from '@/data/countries';
import { parseRecipeText, isVisualStep, getStepImageUrl } from '@/lib/pollinationsText';
import CountryAutocomplete from '@/components/CountryAutocomplete';
import { X, Plus, Trash2, Sparkles, Loader2, AlertTriangle, Check } from 'lucide-react';

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

interface DraftIngredient extends Ingredient {
  flagged?: boolean;
  flagReason?: string;
}

interface DraftState {
  ingredients: DraftIngredient[];
  instructions: string[];
}

export default function RecipeFormModal({ recipe, onSave, onClose }: Props) {
  const [form, setForm] = useState<Omit<Recipe, 'id'> & { id?: string }>(recipe ?? { ...empty });
  const [mode, setMode] = useState<Mode>('manual');
  const [aiText, setAiText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [draft, setDraft] = useState<DraftState | null>(null);

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

  // Clean text before AI parsing
  const cleanText = (text: string) =>
    text
      .replace(/[\u2713\u2714\u2715\u2716\u2717\u2718\u25A1\u25A0\u25CB\u25CF\u2610\u2611\u2612]/g, '')
      .replace(/[\u2192\u2190\u2191\u2193\u2794\u27A4]/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[★☆●○◆◇▪▫]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setAiParsing(true);
    setAiError('');
    try {
      const cleaned = cleanText(aiText);
      const parsed = await parseRecipeText(cleaned);

      // Flag ambiguous ingredients
      const flagged: DraftIngredient[] = parsed.ingredients.map(i => {
        const flags: Partial<DraftIngredient> = {};
        if (i.amount === 0 || !i.amount) {
          flags.flagged = true;
          flags.flagReason = 'Amount was unclear – please verify';
        }
        if (i.unit === 'unit' && i.name.toLowerCase() !== i.name) {
          // might be a guess
        }
        return { ...i, ...flags };
      });

      setDraft({
        ingredients: flagged.length > 0 ? flagged : [{ name: '', amount: 0, unit: 'g' }],
        instructions: parsed.instructions.length > 0 ? parsed.instructions : [''],
      });
    } catch (err) {
      setAiError('AI parsing failed. Try cleaning up the text or enter manually.');
    } finally {
      setAiParsing(false);
    }
  };

  const confirmDraft = () => {
    if (!draft) return;
    set('ingredients', draft.ingredients.map(({ flagged, flagReason, ...rest }) => rest));
    set('instructions', draft.instructions);
    setDraft(null);
    setMode('manual');
  };

  const updateDraftIngredient = (i: number, field: keyof Ingredient, val: string | number) => {
    if (!draft) return;
    const ings = [...draft.ingredients];
    ings[i] = { ...ings[i], [field]: val, flagged: false, flagReason: undefined };
    setDraft({ ...draft, ingredients: ings });
  };

  const updateDraftStep = (i: number, val: string) => {
    if (!draft) return;
    const steps = [...draft.instructions];
    steps[i] = val;
    setDraft({ ...draft, instructions: steps });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.country || !findCountry(form.country)) {
      setAiError('Please select a valid country from the list.');
      return;
    }
    setAiError('');
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 backdrop-blur-sm overflow-y-auto p-4 sm:p-8">
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
              <CountryAutocomplete
                value={form.country}
                onChange={val => set('country', val)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Times + Servings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Prep (min)</label>
              <input type="number" min={0} className={inputClass} value={form.prepTime || ''} onChange={e => set('prepTime', +e.target.value || 0)} placeholder="" />
            </div>
            <div>
              <label className={labelClass}>Cook (min)</label>
              <input type="number" min={0} className={inputClass} value={form.cookTime || ''} onChange={e => set('cookTime', +e.target.value || 0)} placeholder="" />
            </div>
            <div>
              <label className={labelClass}>Servings</label>
              <input type="number" min={1} className={inputClass} value={form.baseServings} onChange={e => set('baseServings', +e.target.value)} />
            </div>
          </div>

          {/* Mode toggle for new recipes */}
          {!recipe && !draft && (
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
          {mode === 'ai' && !recipe && !draft && (
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

          {/* Draft review */}
          {draft && (
            <div className="space-y-4 border border-amber-300 dark:border-amber-600 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" /> AI Draft – Review before saving
              </div>

              <div>
                <label className={labelClass}>Ingredients</label>
                <div className="space-y-2">
                  {draft.ingredients.map((ing, i) => (
                    <div key={i} className={`flex gap-2 items-center ${ing.flagged ? 'ring-2 ring-amber-400 rounded-md p-1' : ''}`}>
                      <input placeholder="Ingredient" className={`${inputClass} flex-1 min-w-[180px]`} value={ing.name} onChange={e => updateDraftIngredient(i, 'name', e.target.value)} />
                      <input type="number" step="any" min={0} placeholder="Amt" className={`${inputClass} w-20`} value={ing.amount || ''} onChange={e => updateDraftIngredient(i, 'amount', +e.target.value)} />
                      <select className={`${inputClass} w-24`} value={ing.unit} onChange={e => updateDraftIngredient(i, 'unit', e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      {ing.flagged && <span className="text-xs text-amber-600" title={ing.flagReason}>⚠️</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Steps</label>
                <div className="space-y-2">
                  {draft.instructions.map((step, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-2">{i + 1}</span>
                      <textarea rows={2} className={`${inputClass} flex-1 resize-none`} value={step} onChange={e => updateDraftStep(i, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={confirmDraft} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Confirm & Continue
                </button>
                <button type="button" onClick={() => { setDraft(null); setMode('ai'); }} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium hover:opacity-90">
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Manual ingredients + steps */}
          {(mode === 'manual' || recipe) && !draft && (
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
          {!draft && (
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
          )}

          {/* Photo */}
          {!draft && (
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.imageMode === 'ai'} onChange={e => set('imageMode', e.target.checked ? 'ai' : 'custom')} className="rounded border-input" />
                Generate AI photo automatically
              </label>
              {form.imageMode === 'custom' && (
                <input className={`${inputClass} mt-2`} placeholder="Custom image URL" value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} />
              )}
            </div>
          )}

          {aiError && !draft && mode !== 'ai' && <p className="text-sm text-destructive">{aiError}</p>}

          {!draft && (
            <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
              {recipe ? 'Save Changes' : 'Add Recipe'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
