import AddCircle from "@iconify-react/solar/add-circle-linear";
import AltLeft from "@iconify-react/solar/alt-arrow-left-linear";
import AltRight from "@iconify-react/solar/alt-arrow-right-linear";
import CheckCircle from "@iconify-react/solar/check-circle-linear";
import Danger from "@iconify-react/solar/danger-triangle-linear";
import Magic from "@iconify-react/solar/magic-stick-3-linear";
import Shield from "@iconify-react/solar/shield-check-linear";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { CopyButton, Field, Modal, NativeSelect, Pill, Spinner, useAction, useToast, Working } from "./bits";
import {
  addMonths,
  api,
  day,
  disclosureLine,
  KIND_LABEL,
  monthLabel,
  PLATFORM_LABEL,
  STATUS_LABEL,
  when,
  type Client,
  type Compliance,
  type ContentStatus,
  type Kind,
  type Piece,
  type Platform,
} from "./data";
import { Bar, NeedClient, PageHead, StatusPill } from "./page";
import { useStore } from "./store";
import { Empty, Panel } from "./ui";

const KINDS: Kind[] = ["reel", "carousel", "post", "story", "gbp_post", "referral", "email", "listing"];
const PLATS: Platform[] = ["instagram", "facebook", "tiktok", "gbp", "youtube", "email", "other"];
const HOOK_TYPES = ["", "question", "bold claim", "list", "story", "reveal", "how-to"];

function ComplianceBox({ comp }: { comp: Compliance }) {
  const bad = comp.checks.filter((c) => !c.ok);
  return (
    <div className={cn("grid gap-2 rounded-lg border p-3 text-sm", comp.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/50 bg-amber-500/5")}>
      <p className="flex items-center gap-2 font-medium">
        {comp.ok ? <CheckCircle className="size-4 text-emerald-600" /> : <Danger className="size-4 text-amber-600" />}
        {comp.ok ? "No issues found by the checker" : bad.length + " thing" + (bad.length === 1 ? "" : "s") + " to fix or confirm before approval"}
        <span className="text-muted-foreground ml-auto text-xs font-normal">{when(comp.checked_at)}</span>
      </p>
      <ul className="grid gap-1.5">
        {comp.checks.map((c, i) => (
          <li key={i} className="flex items-start gap-2">
            {c.ok ? <CheckCircle className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> : <Danger className="mt-0.5 size-3.5 shrink-0 text-amber-600" />}
            <span>
              <span className="font-medium">{c.rule}</span>
              {c.source === "ai" ? <span className="text-muted-foreground text-xs"> · wording review</span> : c.source === "permission" ? <span className="text-muted-foreground text-xs"> · your confirmation</span> : null}
              {c.fix ? <span className="text-muted-foreground block">{c.fix}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">
        A checklist and word scan, not legal clearance. It cannot see photos, video or on-screen text. When in doubt, ask the brokerage.
        {comp.answers?.confirmed_by ? " Answers confirmed by " + String(comp.answers.confirmed_by) + " " + when(String(comp.answers.confirmed_at || "")) + "." : ""}
      </p>
    </div>
  );
}

function PieceEditor({ c, p, month, onClose }: { c: Client; p: Piece | null; month: string; onClose: () => void }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  const start = { title: p?.title || "", kind: p?.kind || "reel", platform: p?.platform || ((c.platforms[0] as Platform) || "instagram"), pillar: p?.pillar || "", plan_date: p?.plan_date || "", hook: p?.hook || "", caption: p?.caption || "", script: p?.script || "", notes: p?.notes || "", search_phrase: p?.search_phrase || "", hook_type: p?.hook_type || "", length_s: p?.length_s ? String(p.length_s) : "" };
  const [f, setF] = useState(start);
  const [id, setId] = useState<number | undefined>(p?.id);
  const [status, setStatus] = useState<ContentStatus>(p?.status || "draft");
  const [comp, setComp] = useState<Compliance | null>(p?.compliance || null);
  const a0 = p?.compliance?.answers || {};
  const [ans, setAns] = useState({ image_rights: !!(a0.image_rights || a0.photo_permission), owner_authorized: !!a0.owner_authorized, paid: !!a0.paid, other_broker_listing: !!a0.other_broker_listing, listing_broker: String(a0.listing_broker || ""), listing_broker_permission: !!a0.listing_broker_permission, broker_approved: !!a0.broker_approved });
  const [factsChecked, setFactsChecked] = useState(false);
  const needsBroker = !!c.onboarding?.broker_approval_required;
  const [postUrl, setPostUrl] = useState(p?.post_url || "");
  const [override, setOverride] = useState(false);
  const dirty = JSON.stringify(f) !== JSON.stringify(start) || !id;
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const line = disclosureLine(c);
  const hasLine = !!line && (f.caption + f.script).toLowerCase().includes(line.toLowerCase().split(" | ")[0]);

  const saveWords = async () => {
    if (!f.title.trim()) throw new Error("Give it a title first.");
    const r = await api.saveContent(c.client_key, { ...f, length_s: f.length_s ? Number(f.length_s) : null } as Partial<Piece>, id);
    if (r.id) setId(r.id);
    if (JSON.stringify(f) !== JSON.stringify(start) && comp) setComp(null); // edited words: the old check no longer applies
    return r.id || id;
  };
  const check = () =>
    run("check", async () => {
      const pid = dirty ? await saveWords() : id;
      if (!pid) throw new Error("Save the piece first.");
      const r = await api.compliance(pid, ans);
      setComp(r.compliance);
      await refresh();
      return r;
    });
  const move = (to: ContentStatus, okText: string, extra: { by?: string; post_url?: string; facts_checked?: boolean } = {}) =>
    run(
      to,
      async () => {
        const pid = dirty ? await saveWords() : id;
        if (!pid) throw new Error("Save the piece first.");
        if (to === "posted" && extra.post_url && !/^https:\/\//.test(extra.post_url)) throw new Error("The post link should start with https://");
        await api.setStatus(pid, to, extra);
        setStatus(to);
        await refresh();
      },
      okText,
    );
  const compOk = comp?.ok === true;
  return (
    <Modal open onClose={onClose} title={p ? "Edit piece" : "New piece"} wide>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={status} />
          {p?.source && p.source !== "manual" ? <Pill>Drafted by AI ({p.source})</Pill> : null}
          {p?.approved_by ? <span className="text-muted-foreground text-xs">Approved by {p.approved_by} {when(p.approved_at)}</span> : null}
          {p?.posted_at ? <span className="text-muted-foreground text-xs">Posted by {p.posted_by || "Meredith"} {when(p.posted_at)}</span> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input value={f.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Kind">
            <NativeSelect value={f.kind} onChange={(v) => set("kind", v)} options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
          </Field>
          <Field label="Platform">
            <NativeSelect value={f.platform} onChange={(v) => set("platform", v)} options={PLATS.map((k) => ({ value: k, label: PLATFORM_LABEL[k] }))} />
          </Field>
          <Field label="Planned day">
            <Input type="date" value={f.plan_date} min={month + "-01"} onChange={(e) => set("plan_date", e.target.value)} />
          </Field>
          <Field label="Pillar" hint="Neighborhood guide, buyer tips, just sold…">
            <Input value={f.pillar} onChange={(e) => set("pillar", e.target.value)} />
          </Field>
          <Field label="Hook (first 2 seconds or first line)" className="sm:col-span-2">
            <Input value={f.hook} onChange={(e) => set("hook", e.target.value)} />
          </Field>
          <Field label="Hook type" hint="Lets results compare hook styles over time">
            <NativeSelect value={f.hook_type} onChange={(v) => set("hook_type", v)} options={HOOK_TYPES.map((h) => ({ value: h, label: h ? h[0].toUpperCase() + h.slice(1) : "Not set" }))} />
          </Field>
          {f.kind === "reel" || f.kind === "story" ? (
            <Field label="Length (seconds)">
              <Input inputMode="numeric" value={f.length_s} onChange={(e) => set("length_s", e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} />
            </Field>
          ) : (
            <div />
          )}
          <Field label="Caption" className="sm:col-span-2" hint={line ? (hasLine ? "Disclosure line found." : "Ends with the disclosure line: " + line) : "Add the licensed name, title and brokerage on the Clients tab."}>
            <Textarea rows={6} value={f.caption} onChange={(e) => set("caption", e.target.value)} />
          </Field>
          <Field label="Script, shot list or slide text" className="sm:col-span-2">
            <Textarea rows={5} value={f.script} onChange={(e) => set("script", e.target.value)} />
          </Field>
          <Field label="Search phrase" hint="What someone in this market would type">
            <Input value={f.search_phrase} onChange={(e) => set("search_phrase", e.target.value)} />
          </Field>
          <Field label="Notes (private)">
            <Input value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!!busy || !dirty} onClick={() => void run("save", saveWords, "Saved.").then(() => refresh())}>
            {busy === "save" ? <Spinner /> : null} Save
          </Button>
          <CopyButton text={() => (hasLine || !line ? f.caption : (f.caption.trim() + "\n\n" + line).trim())} label="Copy caption" />
        </div>

        <div className="grid gap-3 rounded-xl border p-4">
          <p className="flex items-center gap-2 font-medium">
            <Shield className="size-4.5" /> Compliance check before the client sees it
          </p>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-[var(--primary)] size-4" checked={ans.image_rights} onChange={(e) => setAns({ ...ans, image_rights: e.target.checked })} /> We have the rights to every photo, video and song
            </label>
            {f.kind === "listing" ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-[var(--primary)] size-4" checked={ans.owner_authorized} onChange={(e) => setAns({ ...ans, owner_authorized: e.target.checked })} /> The owner authorized advertising this property
              </label>
            ) : null}
            {needsBroker ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-[var(--primary)] size-4" checked={ans.broker_approved} onChange={(e) => setAns({ ...ans, broker_approved: e.target.checked })} /> The brokerage approved this piece
              </label>
            ) : null}
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-[var(--primary)] size-4" checked={ans.paid} onChange={(e) => setAns({ ...ans, paid: e.target.checked })} /> This will run as a paid ad or boost
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-[var(--primary)] size-4" checked={ans.other_broker_listing} onChange={(e) => setAns({ ...ans, other_broker_listing: e.target.checked })} /> It shows another brokerage's listing
            </label>
            {ans.other_broker_listing ? (
              <>
                <Input className="h-8" placeholder="Listing brokerage name" value={ans.listing_broker} onChange={(e) => setAns({ ...ans, listing_broker: e.target.value })} />
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input type="checkbox" className="accent-[var(--primary)] size-4" checked={ans.listing_broker_permission} onChange={(e) => setAns({ ...ans, listing_broker_permission: e.target.checked })} /> The listing broker gave permission to advertise it (a credit line alone is not permission)
                </label>
              </>
            ) : null}
          </div>
          {ans.paid ? <p className="text-muted-foreground text-xs">Meta treats housing ads as a special category: audience age, gender and ZIP targeting are limited. Set the ad category to Housing when boosting.</p> : null}
          <Button variant="outline" className="w-fit rounded-full" disabled={!!busy} onClick={() => void check()}>
            {busy === "check" ? <Spinner /> : <Shield className="size-4" />} {comp ? "Check again" : "Run the check"}
          </Button>
          {busy === "check" ? <Working text="Checking license wording, Fair Housing language and claims…" /> : comp ? <ComplianceBox comp={comp} /> : null}
        </div>

        <div className="grid gap-3 rounded-xl border p-4">
          <p className="font-medium">Next step</p>
          {status === "idea" || status === "draft" ? (
            <>
              {!compOk && comp ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="accent-[var(--primary)] size-4" checked={override} onChange={(e) => setOverride(e.target.checked)} /> I reviewed the flags and want to send it anyway
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button className="rounded-full" disabled={!!busy || !(compOk || override)} onClick={() => void move("needs_approval", "Sent for approval. It shows in their portal now.")}>
                  Send to {c.name.split(" ")[0]} for approval
                </Button>
                <Button variant="ghost" className="rounded-full" disabled={!!busy} onClick={() => void move("dropped", "Dropped.")}>
                  Drop
                </Button>
              </div>
              {!comp ? <p className="text-muted-foreground text-xs">Run the compliance check first.</p> : null}
            </>
          ) : status === "needs_approval" ? (
            <div className="flex flex-wrap items-center gap-2">
              {c.portal_url ? <CopyButton text={c.portal_url} label="Copy their portal link" /> : <span className="text-muted-foreground text-sm">Make a portal link on the Clients tab so they can approve there.</span>}
              <Button variant="outline" className="rounded-full" disabled={!!busy} onClick={() => void move("approved", "Marked approved.", { by: c.name + " (told Meredith)" })}>
                They approved by text or call
              </Button>
              <Button variant="ghost" className="rounded-full" disabled={!!busy} onClick={() => void move("draft", "Back to draft.")}>
                Back to draft
              </Button>
            </div>
          ) : status === "approved" ? (
            <div className="grid gap-2">
              <p className="text-muted-foreground text-sm">Post it yourself on {PLATFORM_LABEL[f.platform as Platform] || f.platform}, then paste the link so results can be tracked.</p>
              {f.kind === "listing" ? (
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="accent-[var(--primary)] mt-0.5 size-4" checked={factsChecked} onChange={(e) => setFactsChecked(e.target.checked)} />
                  <span>I rechecked the price, status and open-house dates against the current listing today</span>
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Input className="max-w-sm" placeholder="https://www.instagram.com/p/…" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} />
                <Button className="rounded-full" disabled={!!busy || (f.kind === "listing" && !factsChecked)} onClick={() => void move("posted", "Marked posted. Add a check-in after 24 hours.", { by: "Meredith", post_url: postUrl.trim(), facts_checked: f.kind === "listing" ? factsChecked : undefined })}>
                  Mark posted
                </Button>
              </div>
            </div>
          ) : status === "posted" ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {p?.post_url || postUrl ? (
                <a href={p?.post_url || postUrl} target="_blank" rel="noopener noreferrer" className="text-primary dark:text-chart-1 underline">
                  Open the post
                </a>
              ) : null}
              <span className="text-muted-foreground">Add check-ins at 24 hours, 7 days and 30 days on the Results tab.</span>
            </div>
          ) : (
            <Button variant="outline" className="w-fit rounded-full" disabled={!!busy} onClick={() => void move("draft", "Back to draft.")}>
              Bring back as a draft
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ContentPanel() {
  const { d, client } = useStore();
  const [month, setMonth] = useState(() => d?.month || new Date().toISOString().slice(0, 7));
  const [open, setOpen] = useState<{ p: Piece | null } | null>(null);
  const [show, setShow] = useState<"all" | ContentStatus>("all");
  const { busy, run } = useAction();
  const { refresh } = useStore();
  const toast = useToast();
  const [ask, setAsk] = useState<{ kind: "plan" | "referral"; text: string } | null>(null);
  const pieces = useMemo(() => (client ? client.content.filter((x) => (x.plan_date || (x.posted_at || "").slice(0, 10) || x.updated_at.slice(0, 10)).slice(0, 7) === month) : []), [client, month]);
  const shown = pieces.filter((x) => (show === "all" ? x.status !== "dropped" : x.status === show));
  const byDay = shown.reduce<Record<string, Piece[]>>((m, x) => {
    const k = x.plan_date || "No date yet";
    (m[k] = m[k] || []).push(x);
    return m;
  }, {});
  const days = Object.keys(byDay).sort((a, b) => (a === "No date yet" ? 1 : b === "No date yet" ? -1 : a.localeCompare(b)));
  const draft = (kind: "plan" | "referral", confirm = false) =>
    client &&
    run(kind, async () => {
      setAsk(null);
      try {
        const r = await api.draft(client.client_key, month, kind, confirm);
        await refresh();
        toast(kind === "plan" ? "Drafts are in. Each one still needs your edit and the compliance check." : "Referral pack drafted.");
        return r;
      } catch (e) {
        const m = e instanceof Error ? e.message : "";
        // a second run for the same month would add a second full set: ask first
        if (m.startsWith("ALREADY_DRAFTED:")) {
          setAsk({ kind, text: m.replace("ALREADY_DRAFTED:", "").trim() });
          return null;
        }
        throw e;
      }
    });
  return (
    <>
      <PageHead eyebrow="Content" title="The plan, approvals and posting" lead="Draft, check, send for approval, then post it yourself and log the link. AI drafts never skip the compliance check or the client's OK." allowAll={false} />
      {!client ? (
        <NeedClient what="their content calendar" />
      ) : (
        <div className="container flex flex-col gap-6 pb-20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="rounded-full" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
                <AltLeft className="size-4" />
              </Button>
              <span className="min-w-36 text-center text-lg font-semibold">{monthLabel(month)}</span>
              <Button size="icon" variant="outline" className="rounded-full" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
                <AltRight className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-full" onClick={() => setOpen({ p: null })}>
                <AddCircle className="size-4" /> New piece
              </Button>
              <Button variant="outline" className="rounded-full" disabled={!!busy} onClick={() => void draft("plan")}>
                {busy === "plan" ? <Spinner /> : <Magic className="size-4" />} Draft the month from the contract
              </Button>
              <Button variant="outline" className="rounded-full" disabled={!!busy} onClick={() => void draft("referral")}>
                {busy === "referral" ? <Spinner /> : <Magic className="size-4" />} Referral pack
              </Button>
            </div>
          </div>
          {busy === "plan" || busy === "referral" ? <Working text="Drafting from the contract, their market and voice. About a minute…" /> : null}
          {ask ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/50 bg-amber-500/5 p-3 text-sm">
              <Danger className="size-4 shrink-0 text-amber-600" />
              <span className="min-w-0 flex-1">{ask.text}</span>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => void draft(ask.kind, true)}>
                Draft another set
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setAsk(null)}>
                Keep what is there
              </Button>
            </div>
          ) : null}
          {month === d?.month && client.progress.filter((p) => p.kind !== "report").length ? (
            <Panel eyebrow="This month vs the contract" className="lg:col-span-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {client.progress
                  .filter((p) => p.kind !== "report")
                  .map((p) => (
                    <div key={p.kind} className="grid gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{p.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {p.delivered}/{p.promised} · {p.lined_up} lined up
                        </span>
                      </div>
                      <Bar value={p.delivered} max={p.promised} mark={p.expected_by_now} tone={p.behind ? "warn" : "ok"} />
                    </div>
                  ))}
              </div>
            </Panel>
          ) : null}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
            {(["all", "draft", "needs_approval", "approved", "posted", "dropped"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setShow(s)} className={cn("rounded-full border px-3 py-1 text-sm", show === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent")}>
                {s === "all" ? "Everything" : STATUS_LABEL[s]} <span className="tabular-nums opacity-70">{s === "all" ? pieces.filter((x) => x.status !== "dropped").length : pieces.filter((x) => x.status === s).length}</span>
              </button>
            ))}
          </div>
          {!shown.length ? (
            <Empty>Nothing here for {monthLabel(month)} yet. Draft the month from the contract, or add a piece.</Empty>
          ) : (
            <div className="grid gap-5">
              {days.map((k) => (
                <div key={k} className="grid gap-2">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">{k === "No date yet" ? k : day(k)}</h3>
                  <div className="grid gap-2">
                    {byDay[k].map((x) => (
                      <button key={x.id} type="button" onClick={() => setOpen({ p: x })} className="bg-card hover:border-foreground/20 flex flex-wrap items-center gap-3 rounded-xl border p-3 text-left transition-colors">
                        <span className="text-muted-foreground w-24 shrink-0 text-xs">
                          {KIND_LABEL[x.kind] || x.kind}
                          <br />
                          {PLATFORM_LABEL[x.platform] || x.platform}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{x.title}</span>
                          {x.hook ? <span className="text-muted-foreground block truncate text-sm">{x.hook}</span> : null}
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          {x.compliance_ok === "yes" ? <Pill tone="ok">No issues found</Pill> : x.compliance_ok === "no" ? <Pill tone="warn">Needs fixes</Pill> : x.status === "draft" || x.status === "idea" ? <Pill>Not checked</Pill> : null}
                          <StatusPill status={x.status} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {open && client ? <PieceEditor key={(open.p?.id || "new") + ":" + (open.p?.updated_at || "")} c={client} p={open.p} month={month} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
