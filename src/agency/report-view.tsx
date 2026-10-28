import { day, fmt, KIND_LABEL, mins, monthLabel, type ReportBody } from "./data";

const dash = (v: number | null | undefined) => (v == null ? "—" : v);

/** The monthly report as the client sees it (also used in the portal). Every number comes from the saved records. */
export function ReportView({ body, month }: { body: ReportBody; month: string }) {
  const n = body.numbers, s = body.summary;
  return (
    <div className="grid gap-5">
      <div>
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">{monthLabel(month)}</p>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight">{s.headline}</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Numbers measured through {n.measured_through ? day(n.measured_through) : "the day it was made"}. The written summary is drafted by AI from these numbers only and checked by Meredith.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Box label="Posts published" value={n.posts_published} />
        <Box label="Inquiries" value={n.leads.inquiries} />
        <Box label="Typical first reply" value={mins(n.leads.median_response_min)} />
        <Box label="New reviews" value={n.reviews.new_this_month} />
      </div>
      {n.delivered.length ? (
        <div className="grid gap-1 text-sm">
          <p className="font-medium">Delivered vs the contract</p>
          {n.delivered.map((x) => (
            <p key={x.kind} className="text-muted-foreground">
              {KIND_LABEL[x.kind as keyof typeof KIND_LABEL] || x.kind}: {x.delivered} of {x.promised}
            </p>
          ))}
        </div>
      ) : null}
      {n.leads.reply_time_from_logging ? <p className="text-muted-foreground text-xs">{n.leads.reply_time_from_logging} reply time{n.leads.reply_time_from_logging === 1 ? "" : "s"} count from when the lead was logged, not when it arrived, so the real wait may be longer.</p> : null}
      <List title="What worked (early signs, not proof)" items={s.what_worked} />
      <List title="What to change" items={s.what_to_change} />
      <List title="Next month" items={s.next_month} ordered />
      {n.results.posts.length ? (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-[11px] font-semibold tracking-[0.12em] uppercase">
                <th scope="col" className="pb-2 text-left">Post (7-day read)</th>
                <th scope="col" className="pb-2 pr-3 text-right">Views</th>
                <th scope="col" className="pb-2 pr-3 text-right">Shares / 1K</th>
                <th scope="col" className="pb-2 pr-3 text-right">Saves / 1K</th>
                <th scope="col" className="pb-2 text-right">Link taps</th>
              </tr>
            </thead>
            <tbody>
              {n.results.posts.map((p, i) => (
                <tr key={i} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-medium">
                    {p.title}
                    {p.age_days != null ? <span className="text-muted-foreground block text-xs font-normal">read at {p.age_days} days</span> : null}
                  </th>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmt(p.views_7d)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{dash(p.shares_per_1k ?? p.sends_per_1k)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{dash(p.saves_per_1k)}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(p.link_taps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {n.results.pending?.length ? (
        <div className="grid gap-1 text-sm">
          <p className="font-medium">Not measured yet</p>
          {n.results.pending.map((x, i) => (
            <p key={i} className="text-muted-foreground">
              {x.title} (posted {day(x.posted)}): {x.status}
            </p>
          ))}
        </div>
      ) : null}
      {n.results.posts.length || n.results.pending?.length ? <p className="text-muted-foreground text-xs">A dash means the platform did not show that number; it is not a zero.</p> : null}
      {s.note ? <p className="text-muted-foreground border-l-2 pl-3 text-sm">{s.note}</p> : null}
    </div>
  );
}
function Box({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/60 dark:bg-muted/40 rounded-lg p-3">
      <div className="text-2xl leading-none font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground mt-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase">{label}</div>
    </div>
  );
}
function List({ title, items, ordered = false }: { title: string; items: string[]; ordered?: boolean }) {
  if (!items.length) return null;
  const L = ordered ? "ol" : "ul";
  return (
    <div className="grid gap-1.5 text-sm">
      <p className="font-medium">{title}</p>
      <L className={(ordered ? "list-decimal" : "list-disc") + " grid gap-1 pl-5"}>
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </L>
    </div>
  );
}
