import AddCircle from "@iconify-react/solar/add-circle-linear";
import Magic from "@iconify-react/solar/magic-stick-3-linear";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { CopyButton, Field, Modal, NativeSelect, Pill, Spinner, useAction } from "./bits";
import { api, day, type Client, type Review } from "./data";
import { NeedClient, PageHead, Section } from "./page";
import { useStore } from "./store";
import { Empty, Grid, Panel, Stat } from "./ui";

const stars = (n: number) => "★★★★★".slice(0, Math.max(0, Math.min(5, n))) + "☆☆☆☆☆".slice(0, 5 - Math.max(0, Math.min(5, n)));

function AddReview({ c, onClose }: { c: Client; onClose: () => void }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  const [f, setF] = useState({ rating: "5", reviewer: "", text: "", date: new Date().toISOString().slice(0, 10) });
  return (
    <Modal open onClose={onClose} title="Add a Google review">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            "add",
            async () => {
              await api.saveReview(c.client_key, { kind: "review", platform: "google", rating: Number(f.rating), reviewer: f.reviewer, text: f.text, date: f.date });
              await refresh();
              onClose();
            },
            "Review added.",
          );
        }}
      >
        <p className="text-muted-foreground text-sm">Copy it from their Google Business Profile so replies and the monthly report stay in one place.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Stars">
            <NativeSelect value={f.rating} onChange={(v) => setF({ ...f, rating: v })} options={["5", "4", "3", "2", "1"].map((v) => ({ value: v, label: v + " stars" }))} />
          </Field>
          <Field label="Reviewer">
            <Input value={f.reviewer} onChange={(e) => setF({ ...f, reviewer: e.target.value })} />
          </Field>
          <Field label="Date">
            <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Field label="What they wrote" className="sm:col-span-3">
            <Textarea rows={4} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={!!busy}>
            {busy ? <Spinner /> : null} Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReviewRow({ c, r }: { c: Client; r: Review }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  const [reply, setReply] = useState(r.reply_draft);
  return (
    <div className="bg-card grid gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-amber-500" aria-label={r.rating + " stars"}>
          {stars(r.rating)}
        </span>
        <span className="font-medium">{r.reviewer || "Someone"}</span>
        <span className="text-muted-foreground text-sm">{day(r.date)}</span>
        {r.replied ? <Pill tone="ok">Replied</Pill> : <Pill tone="warn">No reply yet</Pill>}
      </div>
      {r.text ? <p className="text-sm">“{r.text}”</p> : null}
      {!r.replied ? (
        <div className="grid gap-2">
          <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply in the agent's voice. Keep it personal and short." />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={!!busy}
              onClick={() =>
                void run("draft", async () => {
                  const x = await api.reviewReply(r.id);
                  setReply(x.reply);
                  await refresh();
                })
              }
            >
              {busy === "draft" ? <Spinner /> : <Magic className="size-4" />} Draft a reply
            </Button>
            {reply ? <CopyButton text={reply} label="Copy reply" /> : null}
            <Button
              size="sm"
              className="rounded-full"
              disabled={!!busy}
              onClick={() =>
                void run(
                  "done",
                  async () => {
                    await api.saveReview(c.client_key, { replied: true, reply_draft: reply }, r.id);
                    await refresh();
                  },
                  "Marked replied.",
                )
              }
            >
              Posted the reply on Google
            </Button>
          </div>
        </div>
      ) : r.reply_draft ? (
        <p className="text-muted-foreground border-l-2 pl-3 text-sm">{r.reply_draft}</p>
      ) : null}
    </div>
  );
}

function RequestBox({ c }: { c: Client }) {
  const { refresh } = useStore();
  const { busy, run } = useAction();
  const [who, setWho] = useState("");
  const link = String(c.onboarding?.review_url || "");
  const first = c.name.split(" ")[0];
  const msg = `Hi [first name], it was a real pleasure working with you. If you have a minute, a short Google review helps other people find me${link ? ": " + link : "."} Thank you either way! ${first}`;
  return (
    <Panel eyebrow="Ask for reviews" className="lg:col-span-3">
      <p className="text-sm">Ask every past client, not only the happy ones, and never offer anything in return. Google does not allow either.</p>
      <div className="bg-muted/50 rounded-lg p-3 text-sm">{msg}</div>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={msg} label="Copy the message" />
        {!link ? <span className="text-muted-foreground self-center text-xs">Add the Google review link on the Clients tab.</span> : null}
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!who.trim()) return;
          void run(
            "req",
            async () => {
              await api.saveReview(c.client_key, { kind: "request", reviewer: who.trim(), date: new Date().toISOString().slice(0, 10) });
              setWho("");
              await refresh();
            },
            "Logged.",
          );
        }}
      >
        <Input className="max-w-56" placeholder="Who you asked (first name)" value={who} onChange={(e) => setWho(e.target.value)} />
        <Button type="submit" size="sm" variant="outline" className="rounded-full" disabled={!!busy}>
          Log the request
        </Button>
      </form>
      {c.reviews.requests.length ? <p className="text-muted-foreground text-xs">Recent asks: {c.reviews.requests.slice(0, 6).map((r) => r.reviewer + " (" + day(r.date) + ")").join(", ")}</p> : null}
    </Panel>
  );
}

export function ReviewsPanel() {
  const { client } = useStore();
  const [add, setAdd] = useState(false);
  return (
    <>
      <PageHead eyebrow="Reviews" title="Google reviews and replies" lead="Recent reviews and replies help the agent show up in local search. Draft a reply here, then post it on Google yourself." allowAll={false} />
      {!client ? (
        <NeedClient what="their reviews" />
      ) : (
        <div className="container flex flex-col gap-6 pb-20">
          <Grid>
            <Panel eyebrow="Google reviews" className="lg:col-span-3" pattern="dots">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Average" value={client.reviews.stats.avg != null ? client.reviews.stats.avg.toFixed(1) : "—"} />
                <Stat label="Reviews logged" value={client.reviews.stats.count} />
                <Stat label="Last 90 days" value={client.reviews.stats.last_90d} />
                <Stat label="Days since the last one" value={client.reviews.stats.days_since ?? "—"} />
              </div>
              <p className="text-muted-foreground text-xs">Asked this month: {client.reviews.stats.requests_month}</p>
            </Panel>
            <RequestBox c={client} />
          </Grid>
          <Section
            title="Reviews"
            action={
              <Button className="rounded-full" onClick={() => setAdd(true)}>
                <AddCircle className="size-4" /> Add a review
              </Button>
            }
          >
            {!client.reviews.list.length ? <Empty>No reviews logged yet.</Empty> : <div className="grid gap-3">{client.reviews.list.map((r) => <ReviewRow key={r.id + ":" + r.replied} c={client} r={r} />)}</div>}
          </Section>
        </div>
      )}
      {add && client ? <AddReview c={client} onClose={() => setAdd(false)} /> : null}
    </>
  );
}
