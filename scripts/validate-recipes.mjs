import { readFileSync } from 'node:fs';

const categories = new Set(['カレー・シチュー', 'サラダ', 'デザート・ドリンク']);
const raw = readFileSync(new URL('../public/recipes.json', import.meta.url), 'utf8');
const data = JSON.parse(raw);
const errors = [];

if (data.schemaVersion !== 1) errors.push('schemaVersion must be 1');
if (!Array.isArray(data.recipes)) errors.push('recipes must be an array');
if (Object.keys(data).some((key) => !['schemaVersion', 'recipes'].includes(key))) {
  errors.push('top-level keys must be schemaVersion and recipes only');
}

const ids = new Set();
for (const [index, recipe] of (data.recipes ?? []).entries()) {
  const label = recipe?.id ?? `index ${index}`;
  if (!/^(curry|salad|dessert)-\d{3}$/.test(recipe?.id ?? '')) errors.push(`${label}: invalid id`);
  if (ids.has(recipe.id)) errors.push(`${label}: duplicate id`);
  ids.add(recipe.id);
  if (!recipe.name || typeof recipe.name !== 'string') errors.push(`${label}: name is required`);
  if (!categories.has(recipe.category)) errors.push(`${label}: invalid category`);
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) errors.push(`${label}: ingredients required`);

  let total = 0;
  for (const ingredient of recipe.ingredients ?? []) {
    if (!ingredient.name || typeof ingredient.name !== 'string') errors.push(`${label}: ingredient name is required`);
    if (!Number.isInteger(ingredient.quantity) || ingredient.quantity <= 0) {
      errors.push(`${label}: ingredient quantity must be a positive integer`);
    }
    total += ingredient.quantity ?? 0;
  }
  if (total !== recipe.totalIngredients) errors.push(`${label}: totalIngredients mismatch (${recipe.totalIngredients} != ${total})`);
  if ('source' in recipe || 'sourceUrl' in recipe || 'updatedAt' in recipe) errors.push(`${label}: forbidden source metadata`);
  if ('baseEnergy' in recipe && (!Number.isInteger(recipe.baseEnergy) || recipe.baseEnergy < 0)) {
    errors.push(`${label}: baseEnergy must be a non-negative integer`);
  }
  if ('maxEnergy' in recipe && (!Number.isInteger(recipe.maxEnergy) || recipe.maxEnergy < 0)) {
    errors.push(`${label}: maxEnergy must be a non-negative integer`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`recipes.json OK (${data.recipes.length} recipes)`);
