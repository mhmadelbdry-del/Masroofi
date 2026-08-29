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

export type JoinRequest = {
  id: string;
  requesterName: string;
  targetMemberId: string;
  targetMemberName: string;
  requestedAt: string;
  sourceMemberName: string | null;
  sourceExpenseCount: number;
  sourceExpenseTotal: number;
  sourceRequestCount: number;
  status: "pending";
};

export type JoinRequestDetail = {
  id: string;
  requesterName: string;
  sourceMemberName: string | null;
  requestedAt: string;
  sourceExpenses: Array<{
    description: string;
    amount: number;
    occurredAt: string;
  }>;
  sourceRequests: Array<{
    title: string;
    quantity: string;
    completed: boolean;
    createdAt: string;
  }>;
  targetExpenseCount: number;
  targetExpenseTotal: number;
  targetRequestCount: number;
};

export type HomeRequest = {
  id: string;
  title: string;
  quantity: string;
  completed: boolean;
  createdAt: string;
  createdByMemberId: string;
  createdByName: string;
  completedAt: string | null;
  completedByMemberId: string | null;
  completedByName: string | null;
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
  isOwner: boolean;
  joinRequests: JoinRequest[];
  pendingJoinRequest: JoinRequest | null;
  categories: Category[];
  expenses: Expense[];
  homeRequests: HomeRequest[];
  reflection: string;
  year: number;
  month: number;
};

export const KIND_LABEL: Record<CategoryKind, string> = {
  necessity: "ضروريات",
  extra: "كماليات",
  unexpected: "غير متوقع",
};
