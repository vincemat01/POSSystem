import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[12px] border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,34,29,0.04)]", className)}
      {...props}
    />
  );
}
