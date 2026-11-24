import type { CategoryKind } from "./types";

// Keep existing defaults and budgets intact. Reference categories start with no budget.
export const REFERENCE_CATEGORIES: { name: string; kind: CategoryKind; monthlyLimit: number }[] = [
  ["فواتير", "necessity"],
  ["صدقة / زكاة", "extra"],
  ["ملابس", "extra"],
  ["تعليم", "necessity"],
  ["كهرباء", "necessity"],
  ["ترفيه", "extra"],
  ["طعام", "necessity"],
  ["غاز", "necessity"],
  ["هدايا", "extra"],
  ["بقالة", "necessity"],
  ["صحة", "necessity"],
  ["المنزل", "necessity"],
  ["إنترنت", "necessity"],
  ["أطفال", "necessity"],
  ["صيانة", "unexpected"],
  ["أخرى", "unexpected"],
  ["شخصي", "extra"],
  ["موبايل", "necessity"],
  ["إيجار", "necessity"],
  ["مطاعم", "extra"],
  ["ادخار", "extra"],
  ["تسوق", "extra"],
  ["اشتراكات", "extra"],
  ["مواصلات", "necessity"],
  ["مياه", "necessity"],
].map(([name, kind]) => ({ name, kind: kind as CategoryKind, monthlyLimit: 0 }));

// Semantic aliases avoid adding a second category while preserving existing ids/names.
export const CATEGORY_ALIASES: Record<string, string[]> = {
  صيانة: ["صيانات"],
  صحة: ["علاج"],
  مواصلات: ["مواصلات ووقود"],
  شخصي: ["عناية شخصية"],
};
