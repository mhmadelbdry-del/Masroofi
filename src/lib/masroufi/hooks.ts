import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isUnauthorized } from "@/lib/utils";
import { useMonth } from "./month-store";
import {
  addExpense,
  addHomeRequest,
  archiveCategory,
  createHousehold,
  deleteExpense,
  getMonthSnapshot,
  getJoinRequestDetail,
  leaveHousehold,
  moveExpense,
  lookupJoinCode,
  requestJoinHousehold,
  resolveJoinRequest,
  saveReflection,
  setActiveMember,
  toggleHomeRequest,
  deleteHomeRequest,
  updateExpense,
  updateHousehold,
  upsertCategory,
} from "./queries";

function fail(error: unknown, fallback: string) {
  if (isUnauthorized(error)) {
    toast.error("انتهت الجلسة — سجّل الدخول مرة أخرى");
    return;
  }
  const message = error instanceof Error ? error.message : fallback;
  toast.error(message);
}

export function useSnapshot() {
  const { year, month } = useMonth();
  return useQuery({
    queryKey: ["snapshot", year, month],
    queryFn: () => getMonthSnapshot({ data: { year, month } }),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    retry: (count, error) => !isUnauthorized(error) && count < 2,
  });
}

export function useMasroufiMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["snapshot"] });

  const add = useMutation({
    mutationFn: (data: {
      description: string;
      amount: number;
      categoryId: string;
      accountingYear: number;
      accountingMonth: number;
    }) => addExpense({ data }),
    onSuccess: () => {
      toast.success("تم حفظ المصروف");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر حفظ المصروف"),
  });

  const move = useMutation({
    mutationFn: (data: { id: string; direction: "previous" | "next" }) => moveExpense({ data }),
    onSuccess: () => {
      toast.success("تم نقل المصروف مع الاحتفاظ بتاريخ تسجيله");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر نقل المصروف"),
  });

  const update = useMutation({
    mutationFn: (data: {
      id: string;
      description: string;
      amount: number;
      categoryId: string;
    }) => updateExpense({ data }),
    onSuccess: () => {
      toast.success("تم تعديل المصروف");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر التعديل"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteExpense({ data: { id } }),
    onSuccess: () => {
      toast.success("حُذف المصروف");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر الحذف"),
  });

  const saveCat = useMutation({
    mutationFn: (data: {
      id?: string;
      name: string;
      kind: "necessity" | "extra" | "unexpected";
      monthlyLimit: number;
    }) => upsertCategory({ data }),
    onSuccess: () => {
      toast.success("تم حفظ الفئة");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر حفظ الفئة"),
  });

  const hideCat = useMutation({
    mutationFn: (id: string) => archiveCategory({ data: { id } }),
    onSuccess: () => {
      toast.success("أُزيلت الفئة من القائمة");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر حذف الفئة"),
  });

  const household = useMutation({
    mutationFn: (data: {
      monthlyIncome: number;
      savingsGoal: number;
      members: { id: string; name: string }[];
    }) => updateHousehold({ data }),
    onSuccess: () => {
      toast.success("تم حفظ إعدادات البيت");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر الحفظ"),
  });

  const member = useMutation({
    mutationFn: (memberId: string) => setActiveMember({ data: { memberId } }),
    onSuccess: () => {
      toast.success("تم تثبيت المستخدم الحالي");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر التبديل"),
  });

  const homeRequestAdd = useMutation({
    mutationFn: (data: { title: string; quantity: string }) => addHomeRequest({ data }),
    onSuccess: () => {
      toast.success("تمت إضافة الطلب");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر إضافة الطلب"),
  });

  const homeRequestToggle = useMutation({
    mutationFn: (data: { id: string; completed: boolean }) => toggleHomeRequest({ data }),
    onSuccess: () => {
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر تحديث الطلب"),
  });

  const homeRequestRemove = useMutation({
    mutationFn: (id: string) => deleteHomeRequest({ data: { id } }),
    onSuccess: () => {
      toast.success("تم حذف الطلب");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر حذف الطلب"),
  });

  const reflection = useMutation({
    mutationFn: (data: { year: number; month: number; note: string }) =>
      saveReflection({ data }),
    onSuccess: () => {
      toast.success("حُفظ التأمل الشهري");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر حفظ التأمل"),
  });

  const create = useMutation({
    mutationFn: (data: {
      selfName: string;
      partnerName: string;
      monthlyIncome: number;
      savingsGoal: number;
    }) => createHousehold({ data }),
    onSuccess: () => {
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر إنشاء البيت"),
  });

  const join = useMutation({
    mutationFn: (data: { code: string; memberId: string; requesterName: string }) => requestJoinHousehold({ data }),
    onSuccess: () => {
      toast.success("تم إرسال طلب الانضمام إلى صاحب البيت");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر إرسال طلب الانضمام"),
  });

  const leave = useMutation({
    mutationFn: () => leaveHousehold(),
    onSuccess: () => {
      toast.success("تمت مغادرة الأسرة");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر مغادرة الأسرة"),
  });

  const joinResolve = useMutation({
    mutationFn: (data: { id: string; decision: "erase" | "keep" | "reject" }) => resolveJoinRequest({ data }),
    onSuccess: (result) => {
      toast.success(result.status === "rejected" ? "تم رفض الطلب" : "تم قبول الطلب");
      void invalidate();
    },
    onError: (e) => fail(e, "تعذر معالجة طلب الانضمام"),
  });

  return {
    add,
    move,
    update,
    remove,
    saveCat,
    hideCat,
    household,
    member,
    reflection,
    homeRequestAdd,
    homeRequestToggle,
    homeRequestRemove,
    create,
    join,
    leave,
    joinResolve,
    invalidate,
  };
}

export function useJoinRequestDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: ["join-request-detail", id],
    queryFn: () => getJoinRequestDetail({ data: { id: id! } }),
    enabled: Boolean(id) && enabled,
  });
}

export function useJoinLookup(code: string) {
  const trimmed = code.trim();
  return useQuery({
    queryKey: ["join", trimmed],
    queryFn: () => lookupJoinCode({ data: { code: trimmed } }),
    enabled: trimmed.length >= 4,
  });
}
