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
  const box =
    size === "lg"
      ? "size-12 rounded-lg"
      : size === "sm"
        ? "size-8 rounded-md"
        : "size-10 rounded-md";
  return (
    <span className="inline-flex items-center gap-2">
      <img src="/masareef-icon.png" alt="" className={cn("object-contain", box)} />
      {withWord ? (
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            invert ? "text-hero-fg" : "text-fg",
          )}
        >
          مصاريف
        </span>
      ) : null}
    </span>
  );
}
