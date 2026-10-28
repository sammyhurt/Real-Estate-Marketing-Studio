import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { NativeSelect } from "./bits";
import type { Client } from "./data";
import Hero, { type HeroAction } from "./hero";
import { useStore } from "./store";
import { Empty } from "./ui";

export { Bar, LeadPill, StatusPill } from "./marks";

export function ClientPicker({ allowAll = true, className }: { allowAll?: boolean; className?: string }) {
  const { d, pick, setPick } = useStore();
  const list = (d?.clients || []).filter((c) => c.status !== "removed");
  if (!list.length) return null;
  return (
    <div className={cn("bg-card/80 mt-6 flex w-full max-w-md items-center gap-3 rounded-full border py-1.5 pr-1.5 pl-4 backdrop-blur-sm", className)}>
      <span className="text-muted-foreground shrink-0 text-xs font-semibold tracking-[0.12em] uppercase">Client</span>
      <NativeSelect
        ariaLabel="Pick a client"
        value={pick}
        onChange={setPick}
        className="h-9 rounded-full border-0 bg-transparent shadow-none"
        options={[...(allowAll ? [{ value: "", label: "All clients" }] : [{ value: "", label: "Pick a client…" }]), ...list.map((c) => ({ value: c.client_key, label: c.name + (c.status !== "active" ? " (" + c.status + ")" : "") }))]}
      />
    </div>
  );
}

export function PageHead({ eyebrow, title, lead, actions, picker = true, allowAll = true }: { eyebrow: string; title: ReactNode; lead?: ReactNode; actions?: HeroAction[]; picker?: boolean; allowAll?: boolean }) {
  return (
    <Hero eyebrow={eyebrow} title={title} lead={lead} actions={actions}>
      {picker ? <ClientPicker allowAll={allowAll} /> : null}
    </Hero>
  );
}

/** Shown on tabs that work one client at a time. */
export function NeedClient({ what }: { what: string }) {
  const { d, setPick } = useStore();
  const list = (d?.clients || []).filter((c) => c.status !== "removed");
  return (
    <div className="container pb-20">
      {list.length ? (
        <div className="grid gap-3">
          <Empty>Pick a client to see {what}.</Empty>
          <div className="flex flex-wrap justify-center gap-2">
            {list.map((c) => (
              <button key={c.client_key} type="button" onClick={() => setPick(c.client_key)} className="hover:bg-accent rounded-full border px-4 py-2 text-sm font-medium">
                {c.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Empty>Add your first client on the Clients tab.</Empty>
      )}
    </div>
  );
}

export function scopeClients(all: Client[], pick: string) {
  const c = all.find((x) => x.client_key === pick);
  return c ? [c] : all.filter((x) => x.status === "active" || x.status === "paused");
}

export function Section({ title, text, action, children, className }: { title: string; text?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
          {text ? <p className="text-muted-foreground mt-1 max-w-[70ch] text-sm">{text}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
