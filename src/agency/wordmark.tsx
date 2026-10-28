import { cn } from "@/lib/utils";

/** Text wordmark until the agency has a logo (the name is a placeholder Meredith can change). */
export function Wordmark({ className, light = false, size = "md", label = "Marketing" }: { className?: string; light?: boolean; size?: "md" | "lg"; label?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className={cn("font-serif leading-none tracking-tight", size === "lg" ? "text-3xl" : "text-2xl", light ? "text-white" : "text-foreground")}>Meredith Brice</span>
      <span className={cn("text-[10.5px] font-semibold tracking-[0.18em] uppercase", light ? "text-white/70" : "text-chart-1")}>{label}</span>
    </span>
  );
}
