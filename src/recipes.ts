import type { Category, Recipe, RecipesPayload } from './types';

const categories = new Set<Category>(['カレー・シチュー', 'サラダ', 'デザート・ドリンク']);

export async function loadRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}recipes.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error('レシピデータを読み込めませんでした');
  const payload = (await response.json()) as RecipesPayload;
  validateRecipes(payload);
  return payload.recipes;
}

export function validateRecipes(payload: RecipesPayload): void {
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.recipes)) {
    throw new Error('レシピデータの形式が正しくありません');
  }

  const ids = new Set<string>();
  for (const recipe of payload.recipes) {
    if (!/^(curry|salad|dessert)-\d{3}$/.test(recipe.id)) throw new Error(`料理IDが不正です: ${recipe.id}`);
    if (ids.has(recipe.id)) throw new Error(`料理IDが重複しています: ${recipe.id}`);
    ids.add(recipe.id);
    if (!recipe.name) throw new Error(`料理名が空です: ${recipe.id}`);
    if (!categories.has(recipe.category)) throw new Error(`カテゴリが不正です: ${recipe.id}`);
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      throw new Error(`食材がありません: ${recipe.id}`);
    }
    const total = recipe.ingredients.reduce((sum, ingredient) => {
      if (!ingredient.name || !Number.isInteger(ingredient.quantity) || ingredient.quantity <= 0) {
        throw new Error(`食材データが不正です: ${recipe.id}`);
      }
      return sum + ingredient.quantity;
    }, 0);
    if (total !== recipe.totalIngredients) throw new Error(`食材合計が一致しません: ${recipe.id}`);
  }
}
