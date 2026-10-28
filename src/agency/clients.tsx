import AddCircle from "@iconify-react/solar/add-circle-linear";
import LinkIcon from "@iconify-react/solar/link-linear";
import Pen from "@iconify-react/solar/pen-linear";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { CopyButton, Field, Modal, NativeSelect, Pill, Spinner, useAction } from "./bits";
import { api, CONTRACT_KINDS, disclosureLine, KIND_LABEL, monthLabel, PLATFORM_LABEL, PLATFORMS, type Client, type Kind, type Payment } from "./data";
import { PageHead, scopeClients, Section } from "./page";
import { useStore } from "./store";
import { Empty, Grid, Panel, Skeleton } from "./ui";

export const ONBOARDING: { key: string; label: string; hint?: string }[] = [
  { key: "access_instagram", label: "Meredith can post on Instagram", hint: "Added through Meta Business Suite, not a shared password" },
  { key: "access_facebook", label: "Meredith can post on the Facebook Page" },
  { key: "access_tiktok", label: "Meredith can post on TikTok" },
  { key: "access_gbp", label: "Meredith is a manager on the Google Business Profile" },
  { key: "gbp_verified", label: "Google Business Profile is verified" },
  { key: "license_checked", label: "License name and title checked on eAccessNY" },
  { key: "brokerage_ok", label: "Brokerage knows about the plan and its ad rules" },
  { key: "headshot", label: "Headshot, logo and brand colors received" },
  { key: "photo_rights", label: "Agreed how listing photo permission is confirmed" },
  { key: "review_link", label: "Google review link saved" },
  { key: "bio_link", label: "Inquiry form link added to every bio" },
  { key: "past_clients", label: "Agent has a past-client list for referral emails", hint: "The agent keeps it; the studio only drafts the emails" },
];

type Draft = Record<string, string | boolean | string[] | Record<string, string> | Record<string, boolean | string> | Payment[]>;
const blank = (): Draft => ({ name: "", business: "", license_name: "", license_title: "Licensed Real Estate Salesperson", brokerage: "", team_name: "", market: "", platforms: ["instagram", "facebook", "tiktok", "gbp"], handles: {}, alert_email: "", alert_leads: true, status: "active", start_date: "", renew_date: "", fee: "", voice: "", approved_claims: "", disclosures: "", notes: "", onboarding: {}, broker_contact: "", sop_url: "", fair_housing_url: "", payments: [] });
const fromClient = (c: Client): Draft => ({ ...blank(), ...Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === "string" || typeof v === "boolean")), platforms: c.platforms, handles: c.handles || {}, onboarding: c.onboarding || {}, payments: c.payments || [], fee: c.fee ? String(c.fee) : "" });
const isHttps = (u: string) => !u || /^https:\/\/\S+$/.test(u);

function Payments({ list, onChange, fee }: { list: Payment[]; onChange: (p: Payment[]) => void; fee: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const add = () => onChange([...list, { month: today.slice(0, 7), amount: Number(String(fee).replace(/[^0-9.]/g, "")) || 0, received: today }]);
  const up = (i: number, k: keyof Payment, v: string) => onChange(list.map((p, j) => (j === i ? { ...p, [k]: k === "amount" ? Number(v.replace(/[^0-9.]/g, "")) || 0 : v } : p)));
  return (
    <div className="grid gap-2">
      {list.length ? (
        list.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
            <Field label={i ? "" : "For month"}>
              <Input type="month" value={p.month} onChange={(e) => up(i, "month", e.target.value)} aria-label="Month paid for" />
            </Field>
            <Field label={i ? "" : "Amount ($)"}>
              <Input inputMode="decimal" value={String(p.amount || "")} onChange={(e) => up(i, "amount", e.target.value)} aria-label="Amount" />
            </Field>
            <Field label={i ? "" : "Received"}>
              <Input type="date" value={p.received} onChange={(e) => up(i, "received", e.target.value)} aria-label="Date received" />
            </Field>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(list.filter((_, j) => j !== i))}>
              Remove
            </Button>
          </div>
        ))
      ) : (
        <p className="text-muted-foreground text-sm">No payments recorded yet.</p>
      )}
      <Button type="button" size="sm" variant="outline" className="w-fit rounded-full" onClick={add}>
        <AddCircle className="size-4" /> Record a payment
      </Button>
    </div>
  );
}

function ClientEditor({ open, onClose, c }: { open: boolean; onClose: () => void; c: Client | null }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  const [f, setF] = useState<Draft>(() => (c ? fromClient(c) : blank()));
  const set = (k: string, v: Draft[string]) => setF((x) => ({ ...x, [k]: v }));
  const str = (k: string) => String(f[k] ?? "");
  const plats = (f.platforms as string[]) || [];
  const handles = (f.handles as Record<string, string>) || {};
  const ob = (f.onboarding as Record<string, boolean | string>) || {};
  const TITLES = ["Licensed Real Estate Salesperson", "Associate Real Estate Broker", "Licensed Real Estate Broker"];
  const save = () =>
    run(
      "save",
      async () => {
        if (!str("name").trim()) throw new Error("Add the client's name first.");
        if (!isHttps(str("sop_url")) || !isHttps(str("fair_housing_url"))) throw new Error("Website notice links must start with https://");
        const r = await api.saveClient({ ...f, id: c?.id } as never, c?.client_key);
        await refresh();
        onClose();
        return r;
      },
      c ? "Saved." : "Client added. Next: set the contract numbers.",
    );
  return (
    <Modal open={open} onClose={onClose} title={c ? "Edit " + c.name : "Add a client"} wide>
      <form
        className="grid gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Section title="The agent">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name (as you call them)">
              <Input value={str("name")} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Business or team (optional)">
              <Input value={str("business")} onChange={(e) => set("business", e.target.value)} />
            </Field>
            <Field label="Market and neighborhoods" hint="Used for content ideas and search phrases" className="sm:col-span-2">
              <Input value={str("market")} onChange={(e) => set("market", e.target.value)} placeholder="e.g. Astoria and Long Island City, Queens" />
            </Field>
          </div>
        </Section>
        <Section title="License and ad rules" text="New York requires the licensed name, the exact license title and the brokerage on real estate ads, including social posts. The compliance check uses these exact words.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name exactly as licensed">
              <Input value={str("license_name")} onChange={(e) => set("license_name", e.target.value)} />
            </Field>
            <Field label="License title">
              <NativeSelect value={TITLES.includes(str("license_title")) ? str("license_title") : TITLES[0]} onChange={(v) => set("license_title", v)} options={TITLES.map((t) => ({ value: t, label: t }))} />
            </Field>
            <Field label="Brokerage (exact name)">
              <Input value={str("brokerage")} onChange={(e) => set("brokerage", e.target.value)} />
            </Field>
            <Field label="Team name (optional)" hint='Must include "team" and appear with the brokerage'>
              <Input value={str("team_name")} onChange={(e) => set("team_name", e.target.value)} />
            </Field>
            <Field label="Brokerage office address or phone" hint="Required on ads in New York. The check looks for it in every post and email." className="sm:col-span-2">
              <Input value={str("broker_contact")} onChange={(e) => set("broker_contact", e.target.value)} placeholder="e.g. (718) 555-0100 or 12 Main St, Astoria NY" />
            </Field>
            <Field label="Disclosure line (optional)" hint="Leave blank to use name, title, brokerage and its address or phone" className="sm:col-span-2">
              <Input value={str("disclosures")} onChange={(e) => set("disclosures", e.target.value)} placeholder={disclosureLine({ disclosures: "", license_name: str("license_name"), license_title: str("license_title"), brokerage: str("brokerage"), broker_contact: str("broker_contact") })} />
            </Field>
            <label className="flex items-start gap-2.5 text-sm sm:col-span-2">
              <input type="checkbox" className="accent-[var(--primary)] mt-0.5 size-4" checked={!!ob.broker_approval_required} onChange={(e) => set("onboarding", { ...ob, broker_approval_required: e.target.checked })} />
              <span>
                The brokerage approves each post before it goes out
                <span className="text-muted-foreground block text-xs">The compliance check then asks for their OK on every piece.</span>
              </span>
            </label>
            <Field label="Claims they can back up" hint="Only these may appear in posts, e.g. sales they closed, years licensed. Anything else gets flagged." className="sm:col-span-2">
              <Textarea rows={2} value={str("approved_claims")} onChange={(e) => set("approved_claims", e.target.value)} />
            </Field>
          </div>
        </Section>
        <Section title="Website notices" text="New York requires agent websites to link the Standard Operating Procedures and the Fair Housing notice. The inquiry form shows both links when they are set.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Standard Operating Procedures link" hint={isHttps(str("sop_url")) ? "From the brokerage" : "Must start with https://"}>
              <Input value={str("sop_url")} onChange={(e) => set("sop_url", e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="Fair Housing notice link" hint={isHttps(str("fair_housing_url")) ? "The NY State notice or the brokerage copy" : "Must start with https://"}>
              <Input value={str("fair_housing_url")} onChange={(e) => set("fair_housing_url", e.target.value)} placeholder="https://…" />
            </Field>
          </div>
        </Section>
        <Section title="Platforms Meredith posts on">
          <div className="grid gap-3 sm:grid-cols-2">
            {PLATFORMS.map((p) => (
              <div key={p} className="flex items-center gap-3">
                <input type="checkbox" className="accent-[var(--primary)] size-4" checked={plats.includes(p)} onChange={(e) => set("platforms", e.target.checked ? [...plats, p] : plats.filter((x) => x !== p))} aria-label={PLATFORM_LABEL[p]} />
                <span className="w-32 text-sm">{PLATFORM_LABEL[p]}</span>
                <Input className="h-8" placeholder="@handle or link" value={handles[p] || ""} onChange={(e) => set("handles", { ...handles, [p]: e.target.value })} />
              </div>
            ))}
          </div>
        </Section>
        <Section title="Contract and alerts">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Started">
              <Input type="date" value={str("start_date")} onChange={(e) => set("start_date", e.target.value)} />
            </Field>
            <Field label="Renews">
              <Input type="date" value={str("renew_date")} onChange={(e) => set("renew_date", e.target.value)} />
            </Field>
            <Field label="Monthly fee ($)">
              <Input inputMode="decimal" value={str("fee")} onChange={(e) => set("fee", e.target.value)} />
            </Field>
            <Field label="Agent's email for new-lead alerts" className="sm:col-span-2">
              <Input type="email" value={str("alert_email")} onChange={(e) => set("alert_email", e.target.value)} />
            </Field>
            <label className="flex items-center gap-3 self-end pb-2 text-sm">
              <Switch checked={!!f.alert_leads} onCheckedChange={(v) => set("alert_leads", v)} /> Email them each new lead
            </label>
            <Field label="Status">
              <NativeSelect value={str("status")} onChange={(v) => set("status", v)} options={["active", "paused", "ended", "removed"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
            </Field>
          </div>
        </Section>
        <Section title="Payments received" text="Private to you. Never shown on the client portal.">
          <Payments list={(f.payments as Payment[]) || []} onChange={(p) => set("payments", p)} fee={str("fee")} />
        </Section>
        <Section title="Voice and notes">
          <div className="grid gap-4">
            <Field label="How they sound" hint="A few words: warm, direct, funny, luxury, first-time-buyer friendly…">
              <Textarea rows={2} value={str("voice")} onChange={(e) => set("voice", e.target.value)} />
            </Field>
            <Field label="Private notes (never shown to the client)">
              <Textarea rows={2} value={str("notes")} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
        </Section>
        <Section title="Onboarding checklist">
          <div className="grid gap-2 sm:grid-cols-2">
            {ONBOARDING.map((o) => (
              <label key={o.key} className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" className="accent-[var(--primary)] mt-0.5 size-4" checked={!!ob[o.key]} onChange={(e) => set("onboarding", { ...ob, [o.key]: e.target.checked })} />
                <span>
                  {o.label}
                  {o.hint ? <span className="text-muted-foreground block text-xs">{o.hint}</span> : null}
                </span>
              </label>
            ))}
            <Field label="Google review link" className="sm:col-span-2">
              <Input value={String(ob.review_url || "")} onChange={(e) => set("onboarding", { ...ob, review_url: e.target.value })} placeholder="https://g.page/r/…/review" />
            </Field>
          </div>
        </Section>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!!busy}>
            {busy ? <Spinner /> : null} {c ? "Save" : "Add client"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ContractEditor({ c }: { c: Client }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  const start = () => Object.fromEntries(CONTRACT_KINDS.map((k) => [k, String(c.contract.find((x) => x.kind === k)?.per_month || "")]));
  const [v, setV] = useState<Record<string, string>>(start);
  const dirty = CONTRACT_KINDS.some((k) => (Number(v[k]) || 0) !== (c.contract.find((x) => x.kind === k)?.per_month || 0));
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {CONTRACT_KINDS.map((k: Kind) => (
          <label key={k} className="flex items-center justify-between gap-2 text-sm">
            <span>{KIND_LABEL[k]}</span>
            <Input className="h-8 w-16 text-right tabular-nums" inputMode="numeric" value={v[k]} placeholder="0" onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) }))} aria-label={KIND_LABEL[k] + " per month"} />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">Per month. The studio tracks posted vs promised against these.</p>
        <Button
          size="sm"
          className="rounded-full"
          disabled={!dirty || !!busy}
          onClick={() =>
            void run(
              "contract",
              async () => {
                await api.saveContract(
                  c.client_key,
                  CONTRACT_KINDS.map((k) => ({ kind: k, per_month: Number(v[k]) || 0 })),
                );
                await refresh();
              },
              "Contract saved.",
            )
          }
        >
          {busy ? <Spinner /> : null} Save contract
        </Button>
      </div>
    </div>
  );
}

function Links({ c }: { c: Client }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  const portal = (mode: "new" | "off") =>
    run(
      mode,
      async () => {
        await api.portalKey(c.client_key, mode);
        await refresh();
      },
      mode === "new" ? "New portal link made. The old one stops working." : "Portal link turned off.",
    );
  return (
    <div className="grid gap-3 text-sm">
      <div className="grid gap-1.5">
        <span className="font-medium">Client portal (private to {c.name.split(" ")[0]})</span>
        {c.portal_url ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="bg-muted max-w-full truncate rounded px-2 py-1 text-xs">{c.portal_url}</code>
            <CopyButton text={c.portal_url} />
            <Button size="sm" variant="ghost" className="rounded-full" disabled={!!busy} onClick={() => void portal("new")}>
              New link
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" disabled={!!busy} onClick={() => void portal("off")}>
              Turn off
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="w-fit rounded-full" disabled={!!busy} onClick={() => void portal("new")}>
            <LinkIcon className="size-4" /> Make a portal link
          </Button>
        )}
        <span className="text-muted-foreground text-xs">Shows their plan, approvals, results and reports. No lead contact details, notes or fees.</span>
      </div>
      <div className="grid gap-1.5">
        <span className="font-medium">Inquiry form (public, for bios and posts)</span>
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-muted max-w-full truncate rounded px-2 py-1 text-xs">{c.form_url}</code>
          <CopyButton text={c.form_url} />
        </div>
        <span className="text-muted-foreground text-xs">Add ?ref=instagram (or tiktok, gbp) to see where each inquiry came from.</span>
      </div>
    </div>
  );
}

export function ClientsPanel() {
  const { d, pick } = useStore();
  const [edit, setEdit] = useState<{ open: boolean; c: Client | null }>({ open: false, c: null });
  const all = (d?.clients || []).filter((c) => c.status !== "removed");
  const list = pick ? scopeClients(all, pick) : all;
  return (
    <>
      <PageHead eyebrow="Clients" title="Partnerships and onboarding" lead="Who you work with, what each contract promises, their license details for compliant posts, and their private links." actions={[{ label: "Add a client", onClick: () => setEdit({ open: true, c: null }) }]} />
      <div className="container pb-20">
        {!d ? (
          <Skeleton className="h-64" />
        ) : !list.length ? (
          <Empty>No clients yet. Tap “Add a client” to start with the realtor.</Empty>
        ) : (
          <Grid>
            {list.map((c) => {
              const done = ONBOARDING.filter((o) => c.onboarding?.[o.key]).length;
              return (
                <Panel
                  key={c.client_key}
                  eyebrow={c.status === "active" ? "Active client" : c.status}
                  className="lg:col-span-6"
                  action={
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEdit({ open: true, c })}>
                      <Pen className="size-4" /> Edit
                    </Button>
                  }
                >
                  <div className="grid gap-6 lg:grid-cols-3">
                    <div className="grid content-start gap-2 text-sm">
                      <h3 className="text-xl font-semibold tracking-tight">{c.name}</h3>
                      <p className="text-muted-foreground">{[c.business, c.market].filter(Boolean).join(" · ") || "Add their market so ideas fit their area."}</p>
                      <p>
                        <span className="text-muted-foreground">Disclosure: </span>
                        {disclosureLine(c) || <span className="text-amber-700 dark:text-amber-400">Add the licensed name, title and brokerage</span>}
                      </p>
                      {!c.broker_contact ? <p className="text-amber-700 dark:text-amber-400">Add the brokerage address or phone: New York ads need it.</p> : null}
                      {!c.sop_url || !c.fair_housing_url ? <p className="text-muted-foreground">Website notices: {[!c.sop_url ? "SOP link" : "", !c.fair_housing_url ? "Fair Housing link" : ""].filter(Boolean).join(" and ")} not set yet.</p> : null}
                      {c.payments?.length ? (
                        <p className="text-muted-foreground">
                          Last payment: {monthLabel(c.payments[c.payments.length - 1].month)}, ${c.payments[c.payments.length - 1].amount.toLocaleString("en-US")}
                          {c.payments[c.payments.length - 1].received ? " received " + c.payments[c.payments.length - 1].received : ""}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-1.5">
                        {c.platforms.map((p) => (
                          <Pill key={p}>{PLATFORM_LABEL[p as keyof typeof PLATFORM_LABEL] || p}</Pill>
                        ))}
                      </div>
                      <p className="text-muted-foreground">
                        Onboarding {done} of {ONBOARDING.length}
                        {c.renew_date ? ` · renews ${c.renew_date}` : ""}
                        {c.alert_leads && c.alert_email ? " · lead alerts on" : ""}
                      </p>
                    </div>
                    <div className="grid content-start gap-2">
                      <span className="text-sm font-medium">What the contract promises each month</span>
                      <ContractEditor key={c.client_key + c.contract.map((x) => x.kind + x.per_month).join()} c={c} />
                    </div>
                    <Links c={c} />
                  </div>
                </Panel>
              );
            })}
          </Grid>
        )}
        {d && list.length ? (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" className="rounded-full" onClick={() => setEdit({ open: true, c: null })}>
              <AddCircle className="size-4" /> Add another client
            </Button>
          </div>
        ) : null}
      </div>
      {edit.open ? <ClientEditor key={edit.c?.client_key || "new"} open={edit.open} c={edit.c} onClose={() => setEdit({ open: false, c: null })} /> : null}
    </>
  );
}
