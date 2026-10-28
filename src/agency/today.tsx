import Danger from "@iconify-react/solar/danger-triangle-linear";
import Info from "@iconify-react/solar/info-circle-linear";

import { Button } from "@/components/ui/button";

import { Pill } from "./bits";
import { fmt, mins, monthLabel, type Client } from "./data";
import { Bar, PageHead, scopeClients } from "./page";
import { useStore } from "./store";
import { Empty, Grid, Panel, Skeleton, Stat } from "./ui";

function ClientCard({ c }: { c: Client }) {
  const { goto } = useStore();
  const waiting = c.content.filter((x) => x.status === "needs_approval").length;
  const toPost = c.content.filter((x) => x.status === "approved" && !x.posted_at).length;
  const posts = c.progress.filter((p) => p.kind !== "report");
  return (
    <Panel eyebrow={c.business || c.market || "Client"} pattern="dots" className="lg:col-span-3" action={c.status !== "active" ? <Pill>{c.status}</Pill> : undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-semibold tracking-tight">{c.name}</h3>
        {c.renew_in_days != null && c.renew_in_days >= 0 && c.renew_in_days <= 45 ? <Pill tone="warn">Renews in {c.renew_in_days} days</Pill> : null}
      </div>
      {c.health.length ? (
        <ul className="grid gap-1.5">
          {c.health.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              {h.level === "warn" ? <Danger className="mt-0.5 size-4 shrink-0 text-amber-600" /> : <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />}
              {h.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Nothing needs attention right now.</p>
      )}
      {posts.length ? (
        <div className="grid gap-2.5">
          {posts.map((p) => (
            <div key={p.kind} className="grid gap-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{p.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {p.delivered} of {p.promised} posted{p.lined_up ? ` · ${p.lined_up} lined up` : ""}
                </span>
              </div>
              <Bar value={p.delivered} max={p.promised} mark={p.expected_by_now} tone={p.behind ? "warn" : "ok"} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No contract numbers yet. Add what was promised on the Clients tab.</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Leads this month" value={c.funnel.this_month} />
        <Stat label="Typical reply" value={<span className="text-2xl">{mins(c.funnel.median_response_min)}</span>} />
        <Stat label="Google rating" value={c.reviews.stats.avg != null ? c.reviews.stats.avg.toFixed(1) : "—"} />
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        {c.funnel.waiting ? (
          <Button size="sm" className="rounded-full" onClick={() => goto("leads", c.client_key)}>
            {c.funnel.waiting} lead{c.funnel.waiting === 1 ? "" : "s"} to answer
          </Button>
        ) : null}
        {toPost ? (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => goto("content", c.client_key)}>
            {toPost} approved, ready to post
          </Button>
        ) : null}
        {waiting ? (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => goto("content", c.client_key)}>
            {waiting} waiting on {c.name.split(" ")[0]}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => goto("content", c.client_key)}>
          Open calendar
        </Button>
      </div>
    </Panel>
  );
}

export function TodayPanel() {
  const { d, pick, goto } = useStore();
  const all = d?.clients || [];
  const list = scopeClients(all, pick);
  const total = (f: (c: Client) => number) => list.reduce((a, c) => a + f(c), 0);
  return (
    <>
      <PageHead
        eyebrow={d ? monthLabel(d.month) + " · " + (d.agency.name || "Meredith Brice Marketing") : "Loading…"}
        title="What needs you today"
        lead="Leads waiting, work behind plan, and pieces waiting on approval, across every client. Nothing here posts or sends on its own."
      />
      <div className="container pb-20">
        {!d ? (
          <Skeleton className="h-64" />
        ) : !all.length ? (
          <div className="grid gap-4">
            <Empty>No clients yet. Start with the realtor: add them on the Clients tab, then set what the contract promises each month.</Empty>
            <div className="flex justify-center">
              <Button className="rounded-full" onClick={() => goto("clients")}>
                Add a client
              </Button>
            </div>
          </div>
        ) : (
          <Grid>
            <Panel eyebrow={pick ? "This client" : "All active clients"} className="lg:col-span-6" pattern="lines">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Stat label="Leads waiting" value={total((c) => c.funnel.waiting)} />
                <Stat label="Leads this month" value={total((c) => c.funnel.this_month)} />
                <Stat label="Posted this month" value={total((c) => c.results.month.posts)} />
                <Stat label="Waiting on clients" value={total((c) => c.content.filter((x) => x.status === "needs_approval").length)} />
                <Stat label="7-day views (this month)" value={fmt(total((c) => c.results.month.views))} />
              </div>
            </Panel>
            {list.map((c) => (
              <ClientCard key={c.client_key} c={c} />
            ))}
          </Grid>
        )}
      </div>
    </>
  );
}
