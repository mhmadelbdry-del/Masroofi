import { create } from "zustand";
import { cairoParts } from "./format";

const now = cairoParts();

type MonthState = {
  year: number;
  month: number;
  setMonth: (year: number, month: number) => void;
};

export const useMonth = create<MonthState>((set) => ({
  year: now.year,
  month: now.month,
  setMonth: (year, month) => set({ year, month }),
}));
