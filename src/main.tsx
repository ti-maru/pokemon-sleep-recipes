import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { CATEGORIES, DAY_LABELS, DEFAULT_SETTINGS, MEAL_LABELS, STORAGE_KEYS } from './constants';
import { countPlanMeals, createWeeklySlots, recipeMap, summarizeIngredients, unknownCountItems, unknownWeeklySlots, weeklyPlanMeals } from './calculations';
import { loadRecipes } from './recipes';
import { loadJson, saveJson } from './storage';
import type { Category, CountItem, Day, Inventory, Meal, Recipe, Settings, WeeklySlot } from './types';

const initialSlots = createWeeklySlots();

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...loadJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS) }));
  const [countItems, setCountItems] = useState<CountItem[]>(() => loadJson(STORAGE_KEYS.countItems, []));
  const [weeklySlots, setWeeklySlots] = useState<WeeklySlot[]>(() => {
    const saved = loadJson<WeeklySlot[]>(STORAGE_KEYS.weeklySlots, initialSlots);
    return initialSlots.map((slot) => saved.find((item) => item.day === slot.day && item.meal === slot.meal) ?? slot);
  });
  const [inventory, setInventory] = useState<Inventory>(() => loadJson(STORAGE_KEYS.inventory, {}));
  const [query, setQuery] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    loadRecipes().then(setRecipes).catch((error: Error) => setLoadError(error.message));
  }, []);

  useEffect(() => saveJson(STORAGE_KEYS.settings, settings), [settings]);
  useEffect(() => saveJson(STORAGE_KEYS.countItems, countItems), [countItems]);
  useEffect(() => saveJson(STORAGE_KEYS.weeklySlots, weeklySlots), [weeklySlots]);
  useEffect(() => saveJson(STORAGE_KEYS.inventory, inventory), [inventory]);

  const recipesById = useMemo(() => recipeMap(recipes), [recipes]);
  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      if (recipe.category !== settings.selectedCategory) return false;
      if (!normalizedQuery) return true;
      return recipe.name.toLowerCase().includes(normalizedQuery) || recipe.ingredients.some((ingredient) => ingredient.name.includes(query.trim()));
    });
  }, [query, recipes, settings.selectedCategory]);

  const selectedRecipeCandidate = selectedRecipeId ? recipesById.get(selectedRecipeId) ?? null : null;
  const selectedRecipe = selectedRecipeCandidate?.category === settings.selectedCategory ? selectedRecipeCandidate : filteredRecipes[0] ?? null;
  const summaries = useMemo(
    () => summarizeIngredients(settings.activeMode, recipesById, countItems, weeklySlots, inventory),
    [settings.activeMode, recipesById, countItems, weeklySlots, inventory],
  );
  const plannedMeals = settings.activeMode === 'countPlan' ? countPlanMeals(countItems, recipesById) : weeklyPlanMeals(weeklySlots, recipesById);
  const shortageKinds = summaries.filter((summary) => summary.shortage > 0).length;
  const unknownCounts = unknownCountItems(countItems, recipesById);
  const unknownSlots = unknownWeeklySlots(weeklySlots, recipesById);

  const updateSettings = (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch }));

  const addRecipeToCountPlan = (recipeId: string) => {
    setSettings((current) => ({ ...current, activeMode: 'countPlan' }));
    setCountItems((items) => {
      const existing = items.find((item) => item.recipeId === recipeId);
      if (existing) return items.map((item) => (item.recipeId === recipeId ? { ...item, count: item.count + 1 } : item));
      return [...items, { recipeId, count: 1 }];
    });
  };

  const updateCount = (recipeId: string, value: number) => {
    setCountItems((items) => items.map((item) => (item.recipeId === recipeId ? { ...item, count: Math.max(0, Math.floor(value || 0)) } : item)));
  };

  const removeCountItem = (recipeId: string) => {
    setCountItems((items) => items.filter((item) => item.recipeId !== recipeId));
  };

  const clearCountPlan = () => {
    setCountItems([]);
  };

  const updateSlot = (day: string, meal: string, recipeId: string | null) => {
    setWeeklySlots((slots) => slots.map((slot) => (slot.day === day && slot.meal === meal ? { ...slot, recipeId } : slot)));
  };

  const openWeeklyPlan = () => {
    setSettings((current) => ({ ...current, activeMode: 'weeklyPlan' }));
  };

  const applyRecipeToWeeklySlots = (recipeId: string, predicate: (slot: WeeklySlot) => boolean) => {
    setSettings((current) => ({ ...current, activeMode: 'weeklyPlan' }));
    setWeeklySlots((slots) => slots.map((slot) => (predicate(slot) ? { ...slot, recipeId } : slot)));
  };

  const clearWeeklyPlan = () => {
    setWeeklySlots((slots) => slots.map((slot) => ({ ...slot, recipeId: null })));
  };

  const updateInventory = (name: string, value: number) => {
    setInventory((current) => ({ ...current, [name]: Math.max(0, Math.floor(value || 0)) }));
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Pokemon Sleep Cooking Planner</p>
          <h1>料理素材プランナー</h1>
        </div>
        <div className="topbar-status">
          <span>{recipes.length} レシピ</span>
          <span>{settings.selectedCategory}</span>
        </div>
      </header>

      {loadError && <div className="alert">{loadError}</div>}

      <main className="layout two-column-layout">
        <div className="left-column">
        <aside className="recipe-panel panel">
          <div className="panel-header">
            <h2>料理</h2>
          </div>
          <div className="panel-body stack">
            <div className="segmented" aria-label="カテゴリ">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  className={category === settings.selectedCategory ? 'active' : ''}
                  type="button"
                  onClick={() => updateSettings({ selectedCategory: category as Category })}
                >
                  {shortCategory(category)}
                </button>
              ))}
            </div>
            <label className="field">
              <span>料理名・食材名</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="検索" />
            </label>
            <div className="recipe-list">
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  className={`recipe-card ${selectedRecipe?.id === recipe.id ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setSelectedRecipeId(recipe.id)}
                >
                  <strong>{recipe.name}</strong>
                  <span>{recipe.totalIngredients}個 / 初期 {recipe.baseEnergy?.toLocaleString('ja-JP') ?? '-'}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="planner-panel panel">
          <div className="panel-header wide-header">
            <div>
              <h2>プラン</h2>
              <p>{plannedMeals} / 21回</p>
            </div>
            <div className={plannedMeals > 21 ? 'status over' : 'status'}>
              {plannedMeals > 21 ? `${plannedMeals - 21}回超過` : `残り ${Math.max(21 - plannedMeals, 0)}回`}
            </div>
          </div>

          <div className="mode-tabs">
            <button className={settings.activeMode === 'countPlan' ? 'active' : ''} type="button" onClick={() => updateSettings({ activeMode: 'countPlan' })}>回数指定</button>
            <button className={settings.activeMode === 'weeklyPlan' ? 'active' : ''} type="button" onClick={() => updateSettings({ activeMode: 'weeklyPlan' })}>週間献立</button>
          </div>

          <div className="panel-body">
            {selectedRecipe && (
              <div className="selected-recipe">
                <div>
                  <h3>{selectedRecipe.name}</h3>
                  <p>{selectedRecipe.ingredients.map((ingredient) => `${ingredient.name}×${ingredient.quantity}`).join(' / ')}</p>
                </div>
                <div className="selected-actions">
                  <button type="button" onClick={() => addRecipeToCountPlan(selectedRecipe.id)}>回数に追加</button>
                  <button type="button" onClick={openWeeklyPlan}>献立で設定</button>
                </div>
              </div>
            )}

            {settings.activeMode === 'countPlan' ? (
              <CountPlanTable items={countItems} recipesById={recipesById} onCountChange={updateCount} onRemove={removeCountItem} onClear={clearCountPlan} />
            ) : (
              <WeeklyPlanGrid
                recipes={recipes}
                selectedCategory={settings.selectedCategory}
                selectedRecipe={selectedRecipe}
                slots={weeklySlots}
                onSlotChange={updateSlot}
                onBulkApply={applyRecipeToWeeklySlots}
                onClear={clearWeeklyPlan}
              />
            )}

            {(unknownCounts.length > 0 || unknownSlots.length > 0) && (
              <div className="deleted-box">削除済み料理が含まれています。該当料理は集計対象外です。</div>
            )}
          </div>
        </section>

        </div>

        <aside className="summary-panel panel">
          <div className="panel-header wide-header">
            <h2>食材集計</h2>
            <button
              className={`diff-toggle-button ${settings.showInventoryDiff ? 'active' : ''}`}
              type="button"
              aria-pressed={settings.showInventoryDiff}
              onClick={() => updateSettings({ showInventoryDiff: !settings.showInventoryDiff })}
            >
              <span>手持ち差分</span>
              <b>{settings.showInventoryDiff ? '表示' : '非表示'}</b>
            </button>
          </div>
          <div className="panel-body">
            <div className="summary-cards">
              <Metric label="食数" value={plannedMeals.toString()} tone={plannedMeals > 21 ? 'warn' : 'normal'} />
              <Metric label="食材" value={summaries.length.toString()} tone="normal" />
              {settings.showInventoryDiff && <Metric label="不足" value={shortageKinds.toString()} tone={shortageKinds > 0 ? 'danger' : 'ok'} />}
            </div>
            <IngredientTable summaries={summaries} showInventoryDiff={settings.showInventoryDiff} onInventoryChange={updateInventory} />
          </div>
        </aside>
      </main>
    </div>
  );
}

function CountPlanTable({ items, recipesById, onCountChange, onRemove, onClear }: {
  items: CountItem[];
  recipesById: Map<string, Recipe>;
  onCountChange: (recipeId: string, value: number) => void;
  onRemove: (recipeId: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return <div className="empty-state">料理を追加すると、必要食材が集計されます。</div>;
  return (
    <div className="count-plan-section">
      <div className="count-plan-toolbar">
        <span>{items.length}件の料理</span>
        <button className="clear-plan-button" type="button" onClick={onClear}>クリア</button>
      </div>
      <div className="table-wrap">
      <table>
        <thead>
          <tr><th>料理</th><th className="number">1回</th><th className="number">回数</th><th className="number">合計</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const recipe = recipesById.get(item.recipeId);
            return (
              <tr key={item.recipeId} className={!recipe ? 'muted-row' : ''}>
                <td><strong>{recipe?.name ?? '削除済み料理'}</strong><span>{recipe?.category ?? item.recipeId}</span></td>
                <td className="number">{recipe?.totalIngredients ?? '-'}</td>
                <td className="number"><input className="count-input" type="number" min="0" value={item.count} onChange={(event) => onCountChange(item.recipeId, Number(event.target.value))} /></td>
                <td className="number">{recipe ? recipe.totalIngredients * item.count : '-'}</td>
                <td className="action-cell"><button className="icon-button" type="button" onClick={() => onRemove(item.recipeId)} aria-label="削除">×</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function WeeklyPlanGrid({ recipes, selectedCategory, selectedRecipe, slots, onSlotChange, onBulkApply, onClear }: {
  recipes: Recipe[];
  selectedCategory: Category;
  selectedRecipe: Recipe | null;
  slots: WeeklySlot[];
  onSlotChange: (day: string, meal: string, recipeId: string | null) => void;
  onBulkApply: (recipeId: string, predicate: (slot: WeeklySlot) => boolean) => void;
  onClear: () => void;
}) {
  const choices = recipes.filter((recipe) => recipe.category === selectedCategory);
  return (
    <div className="weekly-section">
      <div className="weekly-toolbar"><span>朝・昼・夕 × 7日</span><button type="button" onClick={onClear}>クリア</button></div>
      {selectedRecipe && (
        <div className="bulk-panel">
          <div>
            <strong>{selectedRecipe.name}</strong>
            <span>選択中の料理をまとめて設定</span>
          </div>
          <div className="bulk-actions">
            <button type="button" onClick={() => onBulkApply(selectedRecipe.id, () => true)}>全21食</button>
            <button type="button" onClick={() => onBulkApply(selectedRecipe.id, (slot) => !slot.recipeId)}>空き枠</button>
            {MEAL_LABELS.map((meal) => (
              <button key={meal.key} type="button" onClick={() => onBulkApply(selectedRecipe.id, (slot) => slot.meal === meal.key)}>{meal.label}だけ</button>
            ))}
            <button type="button" onClick={() => onBulkApply(selectedRecipe.id, (slot) => ['mon', 'tue', 'wed', 'thu', 'fri'].includes(slot.day))}>平日</button>
            <button type="button" onClick={() => onBulkApply(selectedRecipe.id, (slot) => ['sat', 'sun'].includes(slot.day))}>週末</button>
          </div>
        </div>
      )}
      <div className="day-fill-grid">
        {DAY_LABELS.map((day) => (
          <button key={day.key} type="button" disabled={!selectedRecipe} onClick={() => selectedRecipe && onBulkApply(selectedRecipe.id, (slot) => slot.day === day.key)}>
            {day.label}を設定
          </button>
        ))}
      </div>
      <div className="weekly-grid">
        <div className="corner" />
        {DAY_LABELS.map((day) => <div className="grid-head" key={day.key}>{day.label}</div>)}
        {MEAL_LABELS.map((meal) => (
          <React.Fragment key={meal.key}>
            <div className="meal-head">{meal.label}</div>
            {DAY_LABELS.map((day) => {
              const slot = slots.find((item) => item.day === day.key && item.meal === meal.key);
              return (
                <select key={`${day.key}-${meal.key}`} value={slot?.recipeId ?? ''} onChange={(event) => onSlotChange(day.key, meal.key, event.target.value || null)}>
                  <option value="">未設定</option>
                  {choices.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
                  {slot?.recipeId && !choices.some((recipe) => recipe.id === slot.recipeId) && <option value={slot.recipeId}>削除済み料理</option>}
                </select>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function IngredientTable({ summaries, showInventoryDiff, onInventoryChange }: {
  summaries: Array<{ name: string; required: number; owned: number; shortage: number; contributions: Array<{ recipeId: string; recipeName: string; count: number; quantityPerCook: number; total: number }> }>;
  showInventoryDiff: boolean;
  onInventoryChange: (name: string, value: number) => void;
}) {
  if (summaries.length === 0) return <div className="empty-state">集計対象の料理がありません。</div>;
  return (
    <div className="table-wrap summary-table">
      <table>
        <thead>
          <tr>
            <th>食材</th><th className="number">必要量</th><th>内訳</th>{showInventoryDiff && <><th className="number">手持ち</th><th className="number">不足</th></>}
          </tr>
        </thead>
        <tbody>
          {summaries.map((summary) => (
            <tr key={summary.name}>
              <td><strong>{summary.name}</strong></td>
              <td className="number required-total">{summary.required}</td>
              <td>
                <div className="contribution-row">
                  {summary.contributions.map((contribution) => (
                    <div key={contribution.recipeId} className="contribution-chip">
                      <span>{contribution.recipeName}</span>
                      <b>{contribution.quantityPerCook} × {contribution.count}回 = {contribution.total}</b>
                    </div>
                  ))}
                </div>
              </td>
              {showInventoryDiff && <>
                <td className="number"><input className="count-input" type="number" min="0" value={summary.owned} onChange={(event) => onInventoryChange(summary.name, Number(event.target.value))} /></td>
                <td className={`number ${summary.shortage > 0 ? 'shortage' : 'ok'}`}>{summary.shortage}</td>
              </>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'normal' | 'warn' | 'danger' | 'ok' }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function shortCategory(category: Category): string {
  if (category === 'カレー・シチュー') return 'カレー';
  if (category === 'デザート・ドリンク') return 'デザート';
  return category;
}

createRoot(document.getElementById('root')!).render(<App />);
