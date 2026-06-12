export type Category = 'カレー・シチュー' | 'サラダ' | 'デザート・ドリンク';
export type PlanMode = 'countPlan' | 'weeklyPlan';
export type Meal = 'breakfast' | 'lunch' | 'dinner';
export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type Ingredient = {
  name: string;
  quantity: number;
};

export type Recipe = {
  id: string;
  name: string;
  category: Category;
  ingredients: Ingredient[];
  totalIngredients: number;
  baseEnergy?: number;
  maxEnergy?: number;
  recipeBonus?: number;
};

export type RecipesPayload = {
  schemaVersion: number;
  recipes: Recipe[];
};

export type CountItem = {
  recipeId: string;
  count: number;
};

export type WeeklySlot = {
  day: Day;
  meal: Meal;
  recipeId: string | null;
};

export type Inventory = Record<string, number>;

export type Settings = {
  activeMode: PlanMode;
  selectedCategory: Category;
  showInventoryDiff: boolean;
};

export type IngredientContribution = {
  recipeId: string;
  recipeName: string;
  count: number;
  quantityPerCook: number;
  total: number;
};

export type IngredientSummary = {
  name: string;
  required: number;
  owned: number;
  shortage: number;
  contributions: IngredientContribution[];
};
