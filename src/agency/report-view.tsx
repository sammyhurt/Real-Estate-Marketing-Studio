import { fmt, KIND_LABEL, mins, monthLabel, type ReportBody } from "./data";

/** The monthly report as the client sees it (also used in the portal). Every number comes from the saved records. */
export function ReportView({ body, month }: { body: ReportBody; month: string }) {
  const n = body.numbers, s = body.summary;
  return (
    <div className="grid gap-5">
      <div>
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">{monthLabel(month)}</p>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight">{s.headline}</h3>
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
      <List title="What worked" items={s.what_worked} />
      <List title="What to change" items={s.what_to_change} />
      <List title="Next month" items={s.next_month} ordered />
      {n.results.posts.length ? (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-[11px] font-semibold tracking-[0.12em] uppercase">
                <th scope="col" className="pb-2 text-left">Post (7-day read)</th>
                <th scope="col" className="pb-2 pr-3 text-right">Views</th>
                <th scope="col" className="pb-2 pr-3 text-right">Sends / 1K</th>
                <th scope="col" className="pb-2 pr-3 text-right">Saves / 1K</th>
                <th scope="col" className="pb-2 text-right">Link taps</th>
              </tr>
            </thead>
            <tbody>
              {n.results.posts.map((p, i) => (
                <tr key={i} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-medium">{p.title}</th>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmt(p.views_7d)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{p.sends_per_1k}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{p.saves_per_1k}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(p.link_taps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
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
