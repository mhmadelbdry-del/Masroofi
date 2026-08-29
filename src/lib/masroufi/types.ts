export type CategoryKind = "necessity" | "extra" | "unexpected";

export type Member = {
  id: string;
  name: string;
  sortOrder: number;
  claimed: boolean;
};

export type Household = {
  id: string;
  monthlyIncome: number;
  savingsGoal: number;
  joinCode: string;
};

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  monthlyLimit: number;
  sortOrder: number;
  spent: number;
};

export type Expense = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryKind: CategoryKind;
  description: string;
  amount: number;
  occurredAt: string;
  createdByMemberId: string;
  createdByName: string;
  updatedByMemberId: string;
  updatedByName: string;
};

export type MonthSnapshot = {
  household: Household | null;
  members: Member[];
  me: { memberId: string; name: string } | null;
  categories: Category[];
  expenses: Expense[];
  reflection: string;
  year: number;
  month: number;
};

export const KIND_LABEL: Record<CategoryKind, string> = {
  necessity: "ضروريات",
  extra: "كماليات",
  unexpected: "غير متوقع",
};
