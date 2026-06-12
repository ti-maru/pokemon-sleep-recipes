import { DAY_LABELS, MEAL_LABELS } from './constants';
import type { CountItem, IngredientContribution, IngredientSummary, Inventory, PlanMode, Recipe, WeeklySlot } from './types';

export function createWeeklySlots(): WeeklySlot[] {
  return DAY_LABELS.flatMap(({ key: day }) =>
    MEAL_LABELS.map(({ key: meal }) => ({ day, meal, recipeId: null })),
  );
}

export function recipeMap(recipes: Recipe[]): Map<string, Recipe> {
  return new Map(recipes.map((recipe) => [recipe.id, recipe]));
}

export function summarizeIngredients(
  mode: PlanMode,
  recipesById: Map<string, Recipe>,
  countItems: CountItem[],
  weeklySlots: WeeklySlot[],
  inventory: Inventory,
): IngredientSummary[] {
  const required = new Map<string, number>();
  const contributions = new Map<string, Map<string, IngredientContribution>>();

  const addRecipe = (recipeId: string | null, count: number) => {
    if (!recipeId || count <= 0) return;
    const recipe = recipesById.get(recipeId);
    if (!recipe) return;
    for (const ingredient of recipe.ingredients) {
      const total = ingredient.quantity * count;
      required.set(ingredient.name, (required.get(ingredient.name) ?? 0) + total);

      const ingredientContributions = contributions.get(ingredient.name) ?? new Map<string, IngredientContribution>();
      const current = ingredientContributions.get(recipe.id);
      ingredientContributions.set(recipe.id, {
        recipeId: recipe.id,
        recipeName: recipe.name,
        count: (current?.count ?? 0) + count,
        quantityPerCook: ingredient.quantity,
        total: (current?.total ?? 0) + total,
      });
      contributions.set(ingredient.name, ingredientContributions);
    }
  };

  if (mode === 'countPlan') {
    for (const item of countItems) addRecipe(item.recipeId, item.count);
  } else {
    for (const slot of weeklySlots) addRecipe(slot.recipeId, 1);
  }

  return [...required.entries()]
    .map(([name, needed]) => {
      const owned = inventory[name] ?? 0;
      const recipeContributions = [...(contributions.get(name)?.values() ?? [])]
        .sort((a, b) => b.total - a.total || a.recipeName.localeCompare(b.recipeName, 'ja'));
      return { name, required: needed, owned, shortage: Math.max(needed - owned, 0), contributions: recipeContributions };
    })
    .sort((a, b) => b.required - a.required || a.name.localeCompare(b.name, 'ja'));
}

export function countPlanMeals(countItems: CountItem[], recipesById: Map<string, Recipe>): number {
  return countItems.reduce((sum, item) => sum + (recipesById.has(item.recipeId) ? item.count : 0), 0);
}

export function weeklyPlanMeals(weeklySlots: WeeklySlot[], recipesById: Map<string, Recipe>): number {
  return weeklySlots.filter((slot) => slot.recipeId && recipesById.has(slot.recipeId)).length;
}

export function unknownCountItems(countItems: CountItem[], recipesById: Map<string, Recipe>): CountItem[] {
  return countItems.filter((item) => !recipesById.has(item.recipeId));
}

export function unknownWeeklySlots(weeklySlots: WeeklySlot[], recipesById: Map<string, Recipe>): WeeklySlot[] {
  return weeklySlots.filter((slot) => slot.recipeId && !recipesById.has(slot.recipeId));
}
