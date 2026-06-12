import type { Category, Day, Meal, Settings } from './types';

export const CATEGORIES: Category[] = ['カレー・シチュー', 'サラダ', 'デザート・ドリンク'];

export const DAY_LABELS: Array<{ key: Day; label: string }> = [
  { key: 'mon', label: '月' },
  { key: 'tue', label: '火' },
  { key: 'wed', label: '水' },
  { key: 'thu', label: '木' },
  { key: 'fri', label: '金' },
  { key: 'sat', label: '土' },
  { key: 'sun', label: '日' },
];

export const MEAL_LABELS: Array<{ key: Meal; label: string }> = [
  { key: 'breakfast', label: '朝' },
  { key: 'lunch', label: '昼' },
  { key: 'dinner', label: '夕' },
];

export const DEFAULT_SETTINGS: Settings = {
  activeMode: 'countPlan',
  selectedCategory: 'カレー・シチュー',
  showInventoryDiff: false,
};

export const STORAGE_KEYS = {
  settings: 'pokemonSleepCooking.settings.v1',
  countItems: 'pokemonSleepCooking.countItems.v1',
  weeklySlots: 'pokemonSleepCooking.weeklySlots.v1',
  inventory: 'pokemonSleepCooking.inventory.v1',
};
