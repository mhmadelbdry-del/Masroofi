import { cn } from "@/lib/utils";

export function MemberDot({
  name,
  size = "md",
  active = false,
}: {
  name: string;
  size?: "sm" | "md";
  active?: boolean;
}) {
  const initial = name.trim().charAt(0) || "؟";
  const dim = size === "sm" ? "size-7 text-xs" : "size-9 text-sm";
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full font-semibold",
        dim,
        active ? "bg-primary text-primary-fg" : "bg-primary-soft text-primary",
      )}
      title={name}
    >
      {initial}
    </span>
  );
}
