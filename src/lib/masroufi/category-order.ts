import type { Category } from "./types";

/** All-time household expense count, never amount; stable ties preserve list order. */
export function orderCategoriesByUsage(categories: Category[]): Category[] {
  return categories.map((category, index) => ({ category, index })).sort((a, b) => {
    const count = (category: Category) => Number.isFinite(category.usageCount) ? Math.max(0, category.usageCount ?? 0) : 0;
    return count(b.category) - count(a.category) || a.category.sortOrder - b.category.sortOrder || a.index - b.index;
  }).map(({ category }) => category);
}
