import { cn } from "@/lib/utils";

import { Pill } from "./bits";
import { STATUS_LABEL, type ContentStatus, type LeadStatus } from "./data";

export function Bar({ value, max, mark, tone = "ok" }: { value: number; max: number; mark?: number; tone?: "ok" | "warn" }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  const m = max && mark != null ? Math.min(100, (mark / max) * 100) : null;
  return (
    <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full" role="presentation">
      <div className={cn("h-full rounded-full transition-[width] duration-500", tone === "warn" ? "bg-amber-500" : "bg-chart-1")} style={{ width: pct + "%" }} />
      {m != null ? <div className="bg-foreground/50 absolute top-0 h-full w-0.5" style={{ left: m + "%" }} title="Where you'd be at an even pace" /> : null}
    </div>
  );
}

const STATUS_TONE: Record<ContentStatus, "muted" | "accent" | "warn" | "ok"> = { idea: "muted", draft: "muted", needs_approval: "warn", approved: "accent", posted: "ok", dropped: "muted" };
export function StatusPill({ status }: { status: ContentStatus }) {
  return <Pill tone={STATUS_TONE[status] || "muted"}>{STATUS_LABEL[status] || status}</Pill>;
}
const LEAD_TONE: Record<LeadStatus, "muted" | "accent" | "warn" | "ok"> = { new: "warn", contacted: "accent", appointment: "accent", client: "ok", closed: "ok", lost: "muted" };
export function LeadPill({ status, label }: { status: LeadStatus; label: string }) {
  return <Pill tone={LEAD_TONE[status] || "muted"}>{label}</Pill>;
}

