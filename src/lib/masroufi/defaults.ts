import type { CategoryKind } from "./types";

export const DEFAULT_CATEGORIES: {
  name: string;
  kind: CategoryKind;
  monthlyLimit: number;
}[] = [
  { name: "بقالة وتموينات", kind: "necessity", monthlyLimit: 2800 },
  { name: "لحوم ودواجن", kind: "necessity", monthlyLimit: 1200 },
  { name: "علاج وصيدلية", kind: "necessity", monthlyLimit: 800 },
  { name: "مواصلات ووقود", kind: "necessity", monthlyLimit: 900 },
  { name: "كماليات ومطاعم", kind: "extra", monthlyLimit: 2000 },
  { name: "ثقافة وكتب", kind: "extra", monthlyLimit: 600 },
  { name: "طوارئ وتصليحات", kind: "unexpected", monthlyLimit: 1000 },
];

type SeedRow = {
  day: number;
  hour: number;
  minute: number;
  description: string;
  amount: number;
  categoryIndex: number;
  memberIndex: 0 | 1;
};

export const DEMO_EXPENSES: SeedRow[] = [
  { day: 3, hour: 11, minute: 20, description: "خضار وفاكهة الأسبوع", amount: 420, categoryIndex: 0, memberIndex: 1 },
  { day: 4, hour: 18, minute: 5, description: "أرز وسكر وزيت", amount: 510, categoryIndex: 0, memberIndex: 0 },
  { day: 6, hour: 16, minute: 40, description: "منظفات ومناديل", amount: 280, categoryIndex: 0, memberIndex: 1 },
  { day: 8, hour: 10, minute: 15, description: "حليب وأجبان", amount: 195, categoryIndex: 0, memberIndex: 1 },
  { day: 11, hour: 9, minute: 30, description: "مقهى ومخبوزات أسبوعية", amount: 115, categoryIndex: 4, memberIndex: 1 },
  { day: 12, hour: 14, minute: 0, description: "إصلاح مفاجئ لمكيف الصالة", amount: 650, categoryIndex: 6, memberIndex: 0 },
  { day: 13, hour: 19, minute: 10, description: "دجاج طازج", amount: 260, categoryIndex: 1, memberIndex: 0 },
  { day: 14, hour: 16, minute: 20, description: "كتب للأطفال وقصص", amount: 180, categoryIndex: 5, memberIndex: 1 },
  { day: 15, hour: 11, minute: 0, description: "شراء لحم بلدي للشهر", amount: 450, categoryIndex: 1, memberIndex: 0 },
  { day: 16, hour: 20, minute: 10, description: "عشاء مطعم مع الأهل", amount: 480, categoryIndex: 4, memberIndex: 0 },
  { day: 17, hour: 21, minute: 40, description: "صيدلية — حليب ومسكنات", amount: 120, categoryIndex: 2, memberIndex: 0 },
  { day: 18, hour: 12, minute: 15, description: "بنزين سيارة العائلة", amount: 165, categoryIndex: 3, memberIndex: 0 },
  { day: 18, hour: 17, minute: 30, description: "تموينات السوبرماركت", amount: 340.5, categoryIndex: 0, memberIndex: 1 },
  { day: 19, hour: 8, minute: 45, description: "اشتراك مواصلات", amount: 350, categoryIndex: 3, memberIndex: 0 },
  { day: 20, hour: 13, minute: 0, description: "فيتامينات وأدوية مزمنة", amount: 310, categoryIndex: 2, memberIndex: 1 },
  { day: 21, hour: 15, minute: 25, description: "كبدة ودواجن", amount: 270, categoryIndex: 1, memberIndex: 0 },
  { day: 22, hour: 19, minute: 50, description: "طلب طعام سريع", amount: 210, categoryIndex: 4, memberIndex: 1 },
  { day: 23, hour: 10, minute: 5, description: "غاز ومنزل", amount: 400, categoryIndex: 6, memberIndex: 0 },
  { day: 24, hour: 12, minute: 0, description: "وقود إضافي", amount: 220, categoryIndex: 3, memberIndex: 0 },
  { day: 25, hour: 17, minute: 15, description: "مجلة وقصص", amount: 95, categoryIndex: 5, memberIndex: 1 },
  { day: 26, hour: 20, minute: 40, description: "حلويات وضيافة", amount: 175, categoryIndex: 4, memberIndex: 1 },
  { day: 27, hour: 9, minute: 10, description: "خبز ومخبوزات", amount: 85, categoryIndex: 0, memberIndex: 0 },
];
