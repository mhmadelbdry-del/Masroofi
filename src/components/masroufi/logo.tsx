import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  size = "md",
  withWord = false,
  invert = false,
}: {
  size?: "sm" | "md" | "lg";
  withWord?: boolean;
  invert?: boolean;
}) {
  const box = size === "lg" ? "size-12 rounded-lg" : size === "sm" ? "size-8 rounded-md" : "size-10 rounded-md";
  const icon = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "grid place-items-center",
          box,
          invert ? "bg-surface/15 text-hero-fg" : "bg-primary text-primary-fg",
        )}
      >
        <Wallet className={icon} strokeWidth={1.75} />
      </span>
      {withWord ? (
        <span className={cn("text-lg font-semibold tracking-tight", invert ? "text-hero-fg" : "text-fg")}>
          مصروفي
        </span>
      ) : null}
    </span>
  );
}
