import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { message?: string; status?: number; name?: string };
  return e.status === 401 || e.message === "Unauthorized" || e.name === "UnauthorizedError";
}
