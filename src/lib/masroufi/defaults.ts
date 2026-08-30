import type { CategoryKind } from "./types";

export const DEFAULT_CATEGORIES: {
  name: string;
  kind: CategoryKind;
  monthlyLimit: number;
}[] = [
  { name: "مواصلات ووقود", kind: "necessity", monthlyLimit: 900 },
  { name: "بقالة", kind: "necessity", monthlyLimit: 2800 },
  { name: "لحوم ودواجن", kind: "necessity", monthlyLimit: 1200 },
  { name: "علاج", kind: "necessity", monthlyLimit: 800 },
  { name: "فواتير", kind: "necessity", monthlyLimit: 2000 },
  { name: "صيانات", kind: "unexpected", monthlyLimit: 1000 },
  { name: "جمعيات", kind: "necessity", monthlyLimit: 0 },
  { name: "عناية شخصية", kind: "extra", monthlyLimit: 700 },
];
