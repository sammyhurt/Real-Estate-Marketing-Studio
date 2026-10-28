import AddCircle from "@iconify-react/solar/add-circle-linear";
import TestTube from "@iconify-react/solar/test-tube-linear";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Field, Modal, NativeSelect, Pill, Spinner, useAction } from "./bits";
import { api, day, fmt, KIND_LABEL, METRIC_LABEL, type Client, type Metric, type Piece, type PostResult, type Test } from "./data";
import { NeedClient, PageHead, Section } from "./page";
import { useStore } from "./store";
import { Empty, Grid, Panel, Stat } from "./ui";

const windowFor = (h: number) => (h >= 18 && h <= 36 ? "24-hour" : h >= 134 && h <= 218 ? "7-day" : h >= 26 * 24 && h <= 35 * 24 ? "30-day" : "");
const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function CheckIn({ c, onClose, startId }: { c: Client; onClose: () => void; startId?: number }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  const posted = c.content.filter((x) => x.status === "posted" && x.posted_at).sort((a, b) => b.posted_at.localeCompare(a.posted_at));
  const [id, setId] = useState(String(startId || posted[0]?.id || ""));
  const [at, setAt] = useState(localNow());
  const [v, setV] = useState<Record<string, string>>({});
  const p = posted.find((x) => String(x.id) === id);
  const age = p ? (Date.parse(new Date(at).toISOString()) - Date.parse(p.posted_at)) / 36e5 : 0;
  const win = windowFor(age);
  const F: [string, string][] = [["views", "Views / plays"], ["reach", "Accounts reached"], ["likes", "Likes"], ["comments", "Comments"], ["shares", "Shares / sends"], ["saves", "Saves"], ["watch_avg_s", "Average watch (sec)"], ["profile_visits", "Profile visits"], ["link_taps", "Link taps"], ["follows", "Follows"]];
  return (
    <Modal open onClose={onClose} title="Add a results check-in" wide>
      {!posted.length ? (
        <Empty>Mark a piece as posted (with its link) on the Content tab first.</Empty>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              "save",
              async () => {
                if (!p) throw new Error("Pick the post.");
                await api.saveResult(c.client_key, { content_id: p.id, read_at: new Date(at).toISOString(), ...Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x])) });
                await refresh();
                onClose();
              },
              win ? "Saved as the " + win + " read." : "Saved. It is outside the 24h / 7d / 30d windows, so it won't be compared.",
            );
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Post">
              <NativeSelect value={id} onChange={setId} options={posted.map((x) => ({ value: String(x.id), label: day(x.posted_at) + " · " + x.title }))} />
            </Field>
            <Field label="When you read the numbers" hint={p ? Math.round(age) + " hours after posting" + (win ? " → counts as the " + win + " read" : " → outside the 24h / 7d / 30d windows") : undefined}>
              <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
            </Field>
          </div>
          <p className="text-muted-foreground text-sm">Copy these from the platform's insights for this one post. Every post is read at the same ages so they can be compared fairly.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {F.map(([k, label]) => (
              <Field key={k} label={label}>
                <Input inputMode="decimal" value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value.replace(/[^0-9.]/g, "") })} />
              </Field>
            ))}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!!busy}>
              {busy ? <Spinner /> : null} Save check-in
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function TestEditor({ c, onClose }: { c: Client; onClose: () => void }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  const pieces = c.content.filter((x) => x.status !== "dropped");
  const [f, setF] = useState({ title: "", variable: "hook", variant_a: "", variant_b: "", metric: "sends_per_1k" as Metric, read_h: "168", content_a: "", content_b: "" });
  const opts = [{ value: "", label: "Not picked yet" }, ...pieces.map((x) => ({ value: String(x.id), label: x.title }))];
  return (
    <Modal open onClose={onClose} title="Plan a test" wide>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            "save",
            async () => {
              await api.saveTest(c.client_key, { ...f, read_h: Number(f.read_h), content_a: Number(f.content_a) || 0, content_b: Number(f.content_b) || 0, status: f.content_a && f.content_b ? "running" : "planned" } as unknown as Partial<Test>);
              await refresh();
              onClose();
            },
            "Test saved.",
          );
        }}
      >
        <p className="text-muted-foreground text-sm">Change one thing only (the hook, the cover, the length, the time) and keep everything else the same. One test is an early sign; repeat a winner before treating it as a rule.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What you are testing" className="sm:col-span-2">
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Face-to-camera hook vs exterior shot hook" required />
          </Field>
          <Field label="The one thing that changes">
            <NativeSelect value={f.variable} onChange={(v) => setF({ ...f, variable: v })} options={["hook", "cover", "length", "format", "caption", "time", "topic"].map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))} />
          </Field>
          <Field label="Judge it by">
            <NativeSelect value={f.metric} onChange={(v) => setF({ ...f, metric: v as Metric })} options={(Object.keys(METRIC_LABEL) as Metric[]).map((m) => ({ value: m, label: METRIC_LABEL[m] }))} />
          </Field>
          <Field label="Version A">
            <Input value={f.variant_a} onChange={(e) => setF({ ...f, variant_a: e.target.value })} />
          </Field>
          <Field label="Version B">
            <Input value={f.variant_b} onChange={(e) => setF({ ...f, variant_b: e.target.value })} />
          </Field>
          <Field label="Post A">
            <NativeSelect value={f.content_a} onChange={(v) => setF({ ...f, content_a: v })} options={opts} />
          </Field>
          <Field label="Post B">
            <NativeSelect value={f.content_b} onChange={(v) => setF({ ...f, content_b: v })} options={opts} />
          </Field>
          <Field label="Compare them at">
            <NativeSelect value={f.read_h} onChange={(v) => setF({ ...f, read_h: v })} options={[{ value: "24", label: "24 hours" }, { value: "168", label: "7 days" }, { value: "720", label: "30 days" }]} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={!!busy}>
            {busy ? <Spinner /> : null} Save test
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TestRow({ c, t }: { c: Client; t: Test }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  const name = (id: number) => c.content.find((x) => x.id === id)?.title || "not picked";
  return (
    <div className="bg-card grid gap-2 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{t.title}</span>
        <Pill tone={t.status === "read" ? "ok" : t.status === "running" ? "accent" : "muted"}>{t.status}</Pill>
        <span className="text-muted-foreground text-xs">
          {METRIC_LABEL[t.metric]} at {t.read_h === 24 ? "24 hours" : t.read_h === 720 ? "30 days" : "7 days"}
        </span>
      </div>
      <p className="text-muted-foreground text-sm">
        A: {t.variant_a || "—"} ({name(t.content_a)}) · B: {t.variant_b || "—"} ({name(t.content_b)})
      </p>
      {t.result ? (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium">{t.result.verdict}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            A {t.result.a} vs B {t.result.b} ({t.metric.endsWith("_1k") ? "per 1,000 reached" : ""}) · reached {fmt(t.result.a_reach)} and {fmt(t.result.b_reach)} · chance B is better: {t.result.prob_b_better ?? "—"}%
          </p>
        </div>
      ) : null}
      {t.content_a && t.content_b ? (
        <Button
          size="sm"
          variant="outline"
          className="w-fit rounded-full"
          disabled={!!busy}
          onClick={() =>
            void run(
              "read",
              async () => {
                await api.readTest(t.id);
                await refresh();
              },
              "Test read.",
            )
          }
        >
          {busy ? <Spinner /> : <TestTube className="size-4" />} {t.result ? "Read again" : "Read the test"}
        </Button>
      ) : (
        <span className="text-muted-foreground text-xs">Pick both posts to read it.</span>
      )}
    </div>
  );
}

const sig = (r: PostResult["d7"], k: "sends_per_1k" | "saves_per_1k") => (r?.signals ? r.signals[k] : null);

export function ResultsPanel() {
  const { client } = useStore();
  const [check, setCheck] = useState<{ id?: number } | null>(null);
  const [test, setTest] = useState(false);
  const posts = client?.results.posts || [];
  const awaiting = useMemo(() => {
    if (!client) return [] as { p: Piece; need: string }[];
    const now = Date.now();
    return client.content
      .filter((x) => x.status === "posted" && x.posted_at)
      .map((p) => {
        const h = (now - Date.parse(p.posted_at)) / 36e5;
        const r = posts.find((x) => x.content_id === p.id);
        const need = h >= 18 && h <= 36 && !r?.d24 ? "24-hour" : h >= 134 && h <= 218 && !r?.d7 ? "7-day" : h >= 624 && h <= 840 && !r?.d30 ? "30-day" : "";
        return { p, need };
      })
      .filter((x) => x.need);
  }, [client, posts]);
  return (
    <>
      <PageHead eyebrow="Results" title="What each post did, measured fairly" lead="Every post is read at 24 hours, 7 days and 30 days, and judged per 1,000 people reached. Sends and saves are the strongest signs a post is working." allowAll={false} />
      {!client ? (
        <NeedClient what="their results" />
      ) : (
        <div className="container flex flex-col gap-6 pb-20">
          <Grid>
            <Panel eyebrow="Their normal (median of measured posts)" className="lg:col-span-6" pattern="lines">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Posts with a 7-day read" value={client.results.normal.n} />
                <Stat label="Typical 7-day views" value={client.results.normal.n >= 5 ? fmt(client.results.normal.views_7d) : "—"} />
                <Stat label="Typical sends per 1K" value={client.results.normal.n >= 5 ? client.results.normal.sends_per_1k ?? "—" : "—"} />
                <Stat label="Typical saves per 1K" value={client.results.normal.n >= 5 ? client.results.normal.saves_per_1k ?? "—" : "—"} />
              </div>
              {client.results.normal.n < 5 ? <p className="text-muted-foreground text-sm">The normal is set after 5 posts have a 7-day read ({client.results.normal.n} so far). Until then, posts are not called above or below normal.</p> : null}
            </Panel>
          </Grid>
          {awaiting.length ? (
            <div className="grid gap-2 rounded-xl border border-amber-500/50 bg-amber-500/5 p-4">
              <p className="font-medium">Check-ins due now</p>
              {awaiting.map(({ p, need }) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {p.title} · <span className="text-muted-foreground">{need} read</span>
                  </span>
                  <Button size="sm" className="rounded-full" onClick={() => setCheck({ id: p.id })}>
                    Add it
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          <Section
            title="Posts"
            action={
              <Button className="rounded-full" onClick={() => setCheck({})}>
                <AddCircle className="size-4" /> Add a check-in
              </Button>
            }
          >
            {!posts.length ? (
              <Empty>No check-ins yet. After a post has been up about 24 hours, add its numbers here.</Empty>
            ) : (
              <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-[11px] font-semibold tracking-[0.12em] uppercase">
                      <th scope="col" className="pb-2 text-left">Post</th>
                      <th scope="col" className="pb-2 pr-3 text-right">24h views</th>
                      <th scope="col" className="pb-2 pr-3 text-right">7d views</th>
                      <th scope="col" className="pb-2 pr-3 text-right">Sends / 1K</th>
                      <th scope="col" className="pb-2 pr-3 text-right">Saves / 1K</th>
                      <th scope="col" className="pb-2 pr-3 text-right">Link taps</th>
                      <th scope="col" className="pb-2 pr-3 text-right">30d views</th>
                      <th scope="col" className="pb-2 text-right">vs normal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((p) => (
                      <tr key={p.content_id || p.post_url} className="border-b last:border-0">
                        <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                          {p.post_url ? (
                            <a href={p.post_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {p.title || p.post_url}
                            </a>
                          ) : (
                            p.title
                          )}
                          <span className="text-muted-foreground block text-xs font-normal">
                            {KIND_LABEL[p.kind as keyof typeof KIND_LABEL] || p.kind} · {day(p.posted_at)}
                          </span>
                        </th>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{fmt(p.d24?.views)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{fmt(p.d7?.views)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{sig(p.d7, "sends_per_1k") ?? (p.d24?.signals ? <span className="text-muted-foreground">{p.d24.signals.sends_per_1k} (24h)</span> : "—")}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{sig(p.d7, "saves_per_1k") ?? (p.d24?.signals ? <span className="text-muted-foreground">{p.d24.signals.saves_per_1k} (24h)</span> : "—")}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{fmt(p.d7?.link_taps)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{fmt(p.d30?.views)}</td>
                        <td className="py-2.5 text-right tabular-nums">{p.vs_normal != null ? <Pill tone={p.vs_normal >= 1.5 ? "ok" : p.vs_normal < 0.7 ? "warn" : "muted"}>{p.vs_normal}×</Pill> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
          <Section
            title="Tests"
            text="A simple, honest read: the chance version B beats A given the counts, never called proof."
            action={
              <Button variant="outline" className="rounded-full" onClick={() => setTest(true)}>
                <TestTube className="size-4" /> Plan a test
              </Button>
            }
          >
            {!client.tests.length ? <Empty>No tests yet. Good first test: two hooks on the same topic, a week apart, same time of day.</Empty> : <div className="grid gap-3">{client.tests.map((t) => <TestRow key={t.id + ":" + (t.result?.read_at || "")} c={client} t={t} />)}</div>}
          </Section>
        </div>
      )}
      {check && client ? <CheckIn c={client} startId={check.id} onClose={() => setCheck(null)} /> : null}
      {test && client ? <TestEditor c={client} onClose={() => setTest(false)} /> : null}
    </>
  );
}
