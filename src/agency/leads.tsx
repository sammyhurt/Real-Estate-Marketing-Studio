import AddCircle from "@iconify-react/solar/add-circle-linear";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { CopyButton, Field, Modal, NativeSelect, Spinner, useAction } from "./bits";
import { api, fmt, LEAD_STATUS_LABEL, mins, SOURCE_LABEL, when, type Client, type Lead, type LeadSource, type LeadStatus } from "./data";
import { LeadPill, NeedClient, PageHead, Section } from "./page";
import { useStore } from "./store";
import { Empty, Grid, Panel, Stat } from "./ui";

const STATUSES = Object.keys(LEAD_STATUS_LABEL) as LeadStatus[];
const SOURCES = Object.keys(SOURCE_LABEL) as LeadSource[];
/** datetime-local value (the device's own time) <-> ISO */
const toLocal = (iso: string) => {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  return new Date(t - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : "");
const nowLocal = () => toLocal(new Date().toISOString());

function LeadEditor({ c, l, onClose }: { c: Client; l: Lead | null; onClose: () => void }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  const [f, setF] = useState({ source: l?.source || "dm", platform: l?.platform || "instagram", name: l?.name || "", contact: l?.contact || "", message: l?.message || "", post_url: l?.post_url || "", status: l?.status || "new", heard_about: l?.heard_about || "", value: l?.value ? String(l.value) : "", notes: l?.notes || "" });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const [got, setGot] = useState(l ? toLocal(l.created_at) : "");
  const [replied, setReplied] = useState(l?.first_reply_at ? toLocal(l.first_reply_at) : "");
  const canFixTime = !l || l.received_how !== "form";
  return (
    <Modal open onClose={onClose} title={l ? "Lead: " + (l.name || "no name") : "Log a lead"} wide>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            "save",
            async () => {
              const extra: { received_at?: string; replied_at?: string } = {};
              // compared at the minute shown, so an untouched field is never re-sent as "entered by hand"
              if (canFixTime && got && got !== (l ? toLocal(l.created_at) : "")) extra.received_at = fromLocal(got);
              if (replied && replied !== (l?.first_reply_at ? toLocal(l.first_reply_at) : "")) extra.replied_at = fromLocal(replied);
              if (extra.received_at && Date.parse(extra.received_at) > Date.now() + 6e4) throw new Error("When it came in can't be in the future.");
              if (extra.replied_at && Date.parse(extra.replied_at) < Date.parse(extra.received_at || l?.created_at || new Date().toISOString())) throw new Error("The first reply can't be before the lead came in.");
              await api.saveLead(c.client_key, { ...f, value: Number(f.value) || 0, ...extra } as unknown as Partial<Lead>, l?.id);
              await refresh();
              onClose();
            },
            l ? "Lead updated." : f.status === "new" ? "Lead logged. Meredith gets the alert." : "Lead logged.",
          );
        }}
      >
        {l ? (
          <p className="text-muted-foreground text-sm">
            Came in {when(l.created_at)}
            {l.received_how === "logged" ? " (the time it was logged; set the real time below if you know it)" : ""}
            {l.first_reply_at ? ` · first reply after ${mins(l.response_min)}` : " · no reply logged yet"}
            {l.possible_duplicate_of ? " · same contact as an earlier lead" : ""}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where it came from">
            <NativeSelect value={f.source} onChange={(v) => set("source", v)} options={SOURCES.map((s) => ({ value: s, label: SOURCE_LABEL[s] }))} />
          </Field>
          <Field label="Platform">
            <Input value={f.platform} onChange={(e) => set("platform", e.target.value)} />
          </Field>
          <Field label="Name">
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Contact" hint="Only what they shared with you">
            <Input value={f.contact} onChange={(e) => set("contact", e.target.value)} />
          </Field>
          <Field label="What they said" className="sm:col-span-2">
            <Textarea rows={3} value={f.message} onChange={(e) => set("message", e.target.value)} />
          </Field>
          <Field label="Post it came from (link)" hint="Ties the lead to a post in the report">
            <Input value={f.post_url} onChange={(e) => set("post_url", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="How they heard about the agent">
            <Input value={f.heard_about} onChange={(e) => set("heard_about", e.target.value)} />
          </Field>
          {canFixTime ? (
            <Field label="When it came in" hint={l ? "Your device's time" : "Leave blank for now. For a DM or call from earlier, set when it arrived so reply time is honest."}>
              <Input type="datetime-local" value={got} max={nowLocal()} onChange={(e) => setGot(e.target.value)} />
            </Field>
          ) : (
            <div />
          )}
          <Field label="When you first replied (optional)" hint="Leave blank and it is logged when the status leaves New">
            <Input type="datetime-local" value={replied} max={nowLocal()} onChange={(e) => setReplied(e.target.value)} />
          </Field>
          <Field label="Where it stands">
            <NativeSelect value={f.status} onChange={(v) => set("status", v)} options={STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABEL[s] }))} />
          </Field>
          <Field label="Deal value if closed ($, optional)">
            <Input inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!!busy}>
            {busy ? <Spinner /> : null} Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function QuickStatus({ c, l }: { c: Client; l: Lead }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  return (
    <NativeSelect
      ariaLabel={"Status for " + (l.name || "lead")}
      value={l.status}
      onChange={(v) =>
        void run(
          "s",
          async () => {
            await api.saveLead(c.client_key, { status: v as LeadStatus }, l.id);
            await refresh();
          },
          l.status === "new" && v !== "new" ? "Marked. Reply time logged." : "Updated.",
        )
      }
      className={busy ? "h-8 w-48 text-sm opacity-60" : "h-8 w-48 text-sm"}
      options={STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABEL[s] }))}
    />
  );
}

export function LeadsPanel() {
  const { client } = useStore();
  const [open, setOpen] = useState<{ l: Lead | null } | null>(null);
  return (
    <>
      <PageHead eyebrow="Leads" title="Every inquiry, and how fast it got an answer" lead="Form inquiries arrive on their own. Log DMs, comments and calls here too, so the report can show which posts bring real conversations." allowAll={false} />
      {!client ? (
        <NeedClient what="their leads" />
      ) : (
        <div className="container flex flex-col gap-6 pb-20">
          <Grid>
            <Panel eyebrow="All time" className="lg:col-span-6" pattern="lines">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <Stat label="Inquiries" value={client.funnel.inquiries} />
                <Stat label="Contacted" value={client.funnel.contacted} />
                <Stat label="Appointments" value={client.funnel.appointments} />
                <Stat label="Became clients" value={client.funnel.clients} />
                <Stat label="Closed" value={client.funnel.closed} />
                <Stat label="Typical first reply (30 days)" value={<span className="text-2xl">{mins(client.funnel.median_response_min)}</span>} />
              </div>
              {client.funnel.waiting ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {client.funnel.waiting} waiting for a first reply{client.funnel.oldest_waiting_min != null ? ", the oldest for " + mins(client.funnel.oldest_waiting_min) : ""}.
                </p>
              ) : null}
              {client.funnel.from_logging ? (
                <p className="text-muted-foreground text-xs">
                  {client.funnel.from_logging} of the reply times count from when the lead was logged, not when it arrived. Set “When it came in” on those leads for an honest number.
                </p>
              ) : null}
              {client.funnel.by_source.length ? (
                <p className="text-muted-foreground text-sm">From: {client.funnel.by_source.map((s) => (SOURCE_LABEL[s.source as LeadSource] || s.source) + " " + s.n).join(" · ")}</p>
              ) : null}
            </Panel>
          </Grid>
          <Section
            title="Leads"
            text="Answering within the hour makes a real difference, so the studio nudges Meredith when a new lead has waited too long."
            action={
              <div className="flex flex-wrap gap-2">
                <CopyButton text={client.form_url} label="Copy inquiry form link" />
                <Button className="rounded-full" onClick={() => setOpen({ l: null })}>
                  <AddCircle className="size-4" /> Log a lead
                </Button>
              </div>
            }
          >
            {!client.leads.length ? (
              <Empty>No leads yet. Put the inquiry form link in every bio, and log DMs and calls here.</Empty>
            ) : (
              <div className="grid gap-2">
                {client.leads.map((l) => (
                  <div key={l.id} className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-3">
                    <button type="button" onClick={() => setOpen({ l })} className="min-w-0 flex-1 text-left">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{l.name || "No name"}</span>
                        <LeadPill status={l.status} label={LEAD_STATUS_LABEL[l.status]} />
                      </span>
                      <span className="text-muted-foreground block truncate text-sm">
                        {SOURCE_LABEL[l.source] || l.source}
                        {l.platform ? " · " + l.platform : ""} · {when(l.created_at)}
                        {l.first_reply_at ? " · replied in " + mins(l.response_min) + (l.received_how === "logged" ? " (from logging)" : "") : ""}
                        {l.possible_duplicate_of ? " · possible repeat" : ""}
                        {l.value ? " · $" + fmt(l.value) : ""}
                        {l.message ? " · “" + l.message + "”" : ""}
                      </span>
                    </button>
                    <QuickStatus c={client} l={l} />
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
      {open && client ? <LeadEditor key={open.l?.id || "new"} c={client} l={open.l} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
