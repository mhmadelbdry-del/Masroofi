import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
