import CheckCircle from "@iconify-react/solar/check-circle-linear";
import { ClerkProvider, Show, SignIn, useAuth, useClerk } from "@clerk/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/utility/theme-toggle";

import { CopyButton, Pill, Spinner, ToastProvider, useAction } from "@/agency/bits";
import { day, fmt, KIND_LABEL, LEAD_STATUS_LABEL, mins, monthLabel, PLATFORM_LABEL, CLERK_KEY, PORTAL_ACTION_SIGNED_URL, PORTAL_ACTION_URL, PORTAL_SIGNED_URL, PORTAL_URL, publicPost, SOURCE_LABEL, type Funnel, type LeadSource, type LeadStatus, type Progress, type Report, type Results, type ReviewStats, type TestResult } from "@/agency/data";
import Footer from "@/agency/footer";
import { Bar } from "@/agency/marks";
import { ReportView } from "@/agency/report-view";
import { Empty, Grid, Panel, Skeleton, Stat } from "@/agency/ui";
import { Wordmark } from "@/agency/wordmark";

interface PortalPiece { id: number; title: string; kind: keyof typeof KIND_LABEL; platform: keyof typeof PLATFORM_LABEL; pillar: string; plan_date: string; status: "needs_approval" | "approved" | "posted"; hook: string; caption: string; script: string; compliance_ok: string; approved_by: string; approved_at: string; posted_at: string; post_url: string; version: string }
interface PortalData {
  ok: boolean; error?: string; no_access?: boolean; viewer?: { name: string; role: "approver" | "viewer"; email: string }; agency: { name: string }; month: string; today: string; measured_through?: string;
  client: { name: string; business: string; brokerage: string; market: string; platforms: string[]; form_url: string; renew_date: string };
  progress: Progress[]; content: PortalPiece[]; funnel: Funnel;
  leads: { id: number; created_at: string; source: LeadSource; platform: string; first_name: string; status: LeadStatus; response_min: number | null }[];
  reviews: { stats: ReviewStats; list: { date: string; rating: number; reviewer: string; text: string; replied: boolean }[] };
  results: Results; tests: { title: string; variable: string; variant_a: string; variant_b: string; result: TestResult | null }[]; reports: Report[];
}

const key = () => {
  try {
    return (new URLSearchParams(location.search).get("k") || "").replace(/[^a-z0-9]/gi, "").slice(0, 24);
  } catch {
    return "";
  }
};

/** How the portal talks to the studio: by private link only, or signed in (Clerk) with the link choosing the client. */
interface PortalApi {
  signedIn: boolean;
  load: (k: string) => Promise<PortalData>;
  act: (body: Record<string, unknown>) => Promise<unknown>;
  signOut?: () => void;
}
const ApiCtx = createContext<PortalApi | null>(null);
const useApi = () => useContext(ApiCtx)!;

const linkApi: PortalApi = {
  signedIn: false,
  load: async (k) => (await (await fetch(PORTAL_URL + "?k=" + encodeURIComponent(k), { cache: "no-store" })).json()) as PortalData,
  act: (body) => publicPost(PORTAL_ACTION_URL, body),
};

const NAME_KEY = "mbm-portal-name";
const readName = () => {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
};
const keepName = (n: string) => {
  try {
    if (n) localStorage.setItem(NAME_KEY, n);
  } catch {
    /* storage blocked: the name is just not remembered */
  }
};

function Approve({ p, k, onDone, viewOnly }: { p: PortalPiece; k: string; onDone: () => void; viewOnly?: boolean }) {
  const api = useApi();
  const { busy, run } = useAction();
  const [ask, setAsk] = useState(false);
  const [note, setNote] = useState("");
  const [name, setName] = useState(readName);
  const send = (action: "approve" | "changes") =>
    run(
      action,
      async () => {
        keepName(name.trim());
        try {
          // version: the approval is for exactly the words on screen; if Meredith edited since, it is refused
          await api.act({ k, id: p.id, action, note, version: p.version, ...(api.signedIn ? {} : { name: name.trim().slice(0, 40) }) });
        } catch (e) {
          if (e instanceof Error && /changed since/i.test(e.message)) onDone();
          throw e;
        }
        onDone();
      },
      action === "approve" ? "Approved. Meredith will post it." : "Sent to Meredith.",
    );
  if (viewOnly) return <p className="text-muted-foreground text-sm">You can view this piece. Approvals come from the person Meredith set as approver.</p>;
  return (
    <div className="grid gap-2">
      {ask ? (
        <>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What would you like changed?" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" disabled={!!busy || !note.trim()} onClick={() => void send("changes")}>
              {busy ? <Spinner /> : null} Send to Meredith
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setAsk(false)}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {api.signedIn ? null : <input aria-label="Your name (optional)" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="border-input bg-background h-8 w-44 rounded-md border px-2 text-sm" />}
          <Button size="sm" className="rounded-full" disabled={!!busy} onClick={() => void send("approve")}>
            {busy ? <Spinner /> : <CheckCircle className="size-4" />} Approve
          </Button>
          <Button size="sm" variant="outline" className="rounded-full" disabled={!!busy} onClick={() => setAsk(true)}>
            Ask for changes
          </Button>
        </div>
      )}
    </div>
  );
}

function PortalApp() {
  const api = useApi();
  const k = key();
  const [d, setD] = useState<PortalData | null>(null);
  const [err, setErr] = useState("");
  const [noAccess, setNoAccess] = useState(false);
  const load = useCallback(async () => {
    if (k.length !== 24) {
      setErr("This link is not complete. Ask Meredith to send it again.");
      return;
    }
    try {
      const j = await api.load(k);
      setNoAccess(!!j.no_access);
      if (!j.ok) setErr(j.error || "This link is off or out of date. Ask Meredith for a new one.");
      else {
        setD(j);
        setErr("");
      }
    } catch (e) {
      setErr(e instanceof Error && e.message.startsWith("Your sign-in") ? e.message : "Could not load your page. Check your connection and refresh.");
    }
  }, [k, api]);
  useEffect(() => {
    void load();
  }, [load]);

  const waiting = d?.content.filter((x) => x.status === "needs_approval") || [];
  const upcoming = d?.content.filter((x) => x.status === "approved") || [];
  const posted = d?.content.filter((x) => x.status === "posted").sort((a, b) => b.posted_at.localeCompare(a.posted_at)) || [];
  const latestReport = d?.reports.find((r) => r.body) || null;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex items-center justify-between py-6">
        <Wordmark label="Client portal" />
        <div className="flex items-center gap-2">
          {api.signedIn && d?.viewer ? <span className="text-muted-foreground hidden text-sm sm:inline">Signed in as {d.viewer.name}</span> : null}
          {api.signedIn ? (
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => api.signOut?.()}>
              Sign out
            </Button>
          ) : null}
          <ThemeToggle />
        </div>
      </header>
      <main className="container flex-1 pb-20">
        {err ? (
          <div className="mx-auto max-w-md py-24 text-center">
            <p className="text-lg font-semibold">{err}</p>
            {noAccess && api.signOut ? (
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => api.signOut?.()}>
                Sign in with a different email
              </Button>
            ) : null}
          </div>
        ) : !d ? (
          <Skeleton className="h-96" />
        ) : (
          <div className="grid gap-10">
            <div className="pt-6">
              <p className="text-muted-foreground text-sm">{monthLabel(d.month)}</p>
              <h1 className="mt-1 text-4xl font-semibold tracking-tight md:text-5xl">Hi {d.client.name.split(" ")[0]}, here is your marketing.</h1>
              <p className="text-muted-foreground mt-3 max-w-2xl">What is planned, what needs your OK, what went out, and what it did. Numbers come from each platform's own insights.</p>
            </div>

            <section className="grid gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">Waiting for your OK {waiting.length ? <Pill tone="warn">{waiting.length}</Pill> : null}</h2>
              {!waiting.length ? (
                <Empty>Nothing needs you right now.</Empty>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {waiting.map((p) => (
                    <Panel key={p.id} eyebrow={(KIND_LABEL[p.kind] || p.kind) + " · " + (PLATFORM_LABEL[p.platform] || p.platform) + (p.plan_date ? " · " + day(p.plan_date) : "")}>
                      <h3 className="text-lg font-semibold">{p.title}</h3>
                      {p.hook ? <p className="font-medium">“{p.hook}”</p> : null}
                      {p.caption ? <p className="text-sm whitespace-pre-wrap">{p.caption}</p> : null}
                      {p.script ? (
                        <details className="text-sm">
                          <summary className="cursor-pointer font-medium">Script / slides</summary>
                          <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{p.script}</p>
                        </details>
                      ) : null}
                      {p.compliance_ok === "yes" ? <p className="text-muted-foreground text-xs">Meredith ran the license-details and Fair Housing checklist on these exact words. Approving records your OK for this version only.</p> : null}
                      <Approve p={p} k={k} onDone={() => void load()} viewOnly={d.viewer?.role === "viewer"} />
                    </Panel>
                  ))}
                </div>
              )}
            </section>

            <Grid>
              <Panel eyebrow="This month vs your plan" className="lg:col-span-3">
                {d.progress.filter((p) => p.kind !== "report").length ? (
                  d.progress
                    .filter((p) => p.kind !== "report")
                    .map((p) => (
                      <div key={p.kind} className="grid gap-1">
                        <div className="flex justify-between text-sm">
                          <span>{p.label}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {p.delivered} of {p.promised} posted
                            {p.lined_up ? " · " + p.lined_up + " lined up" : ""}
                          </span>
                        </div>
                        <Bar value={p.delivered} max={p.promised} />
                      </div>
                    ))
                ) : (
                  <Empty>Your monthly plan will show here.</Empty>
                )}
                {upcoming.length ? <p className="text-muted-foreground text-sm">Approved and coming up: {upcoming.map((x) => x.title).join(" · ")}</p> : null}
              </Panel>
              <Panel eyebrow="Your leads" className="lg:col-span-3">
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="This month" value={d.funnel.this_month} />
                  <Stat label="Appointments (all time)" value={d.funnel.appointments} />
                  <Stat label="Typical first reply" value={<span className="text-2xl">{mins(d.funnel.median_response_min)}</span>} />
                </div>
                {d.leads.length ? (
                  <ul className="grid gap-1 text-sm">
                    {d.leads.slice(0, 8).map((l) => (
                      <li key={l.id} className="flex justify-between gap-2">
                        <span>
                          {l.first_name} · {SOURCE_LABEL[l.source] || l.source}
                        </span>
                        <span className="text-muted-foreground">{LEAD_STATUS_LABEL[l.status]}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <CopyButton text={d.client.form_url} label="Copy your inquiry form link" />
                </div>
              </Panel>
            </Grid>

            {posted.length ? (
              <section className="grid gap-4">
                <h2 className="text-2xl font-semibold tracking-tight">What went out</h2>
                <p className="text-muted-foreground -mt-2 text-sm">
                  Numbers as of {day(d.measured_through || d.today)}. Each post is compared at 7 days old; a dash means it is not measured yet or the platform did not show that number.
                </p>
                <div className="-mx-1 overflow-x-auto px-1">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b text-[11px] font-semibold tracking-[0.12em] uppercase">
                        <th scope="col" className="pb-2 text-left">Post</th>
                        <th scope="col" className="pb-2 pr-3 text-right">Views (7 days)</th>
                        <th scope="col" className="pb-2 pr-3 text-right">Shares / 1K</th>
                        <th scope="col" className="pb-2 text-right">Saves / 1K</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posted.map((p) => {
                        const r = d.results.posts.find((x) => x.content_id === p.id);
                        return (
                          <tr key={p.id} className="border-b last:border-0">
                            <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                              {p.post_url ? (
                                <a href={p.post_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {p.title}
                                </a>
                              ) : (
                                p.title
                              )}
                              <span className="text-muted-foreground block text-xs font-normal">
                                {PLATFORM_LABEL[p.platform] || p.platform} · {day(p.posted_at)}
                              </span>
                            </th>
                            <td className="py-2.5 pr-3 text-right tabular-nums">{r?.d7 ? fmt(r.d7.views) : r?.d24 ? <span className="text-muted-foreground">{fmt(r.d24.views)} so far</span> : "—"}</td>
                            <td className="py-2.5 pr-3 text-right tabular-nums">{r?.d7?.signals?.sends_per_1k ?? "—"}</td>
                            <td className="py-2.5 text-right tabular-nums">{r?.d7?.signals?.saves_per_1k ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {d.tests.length ? (
              <section className="grid gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">What we tested</h2>
                {d.tests.map((t, i) => (
                  <div key={i} className="bg-card rounded-xl border p-4 text-sm">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-muted-foreground">{t.result?.verdict}</p>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="grid gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">Monthly report</h2>
              {latestReport?.body ? (
                <Panel>
                  <ReportView body={latestReport.body} month={latestReport.month} />
                </Panel>
              ) : (
                <Empty>Your first monthly report will appear here.</Empty>
              )}
              {d.reports.length > 1 ? <p className="text-muted-foreground text-sm">Earlier reports: {d.reports.slice(1).map((r) => monthLabel(r.month)).join(", ")}</p> : null}
            </section>

            {d.reviews.stats.count ? (
              <section className="grid gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">Google reviews</h2>
                <p className="text-sm">
                  {d.reviews.stats.avg?.toFixed(1)} average from {d.reviews.stats.count} logged review{d.reviews.stats.count === 1 ? "" : "s"} · {d.reviews.stats.last_90d} in the last 90 days
                </p>
              </section>
            ) : null}
          </div>
        )}
      </main>
      <Footer note={"Prepared by " + (d?.agency.name || "Meredith Brice Marketing") + (api.signedIn ? ". Only people Meredith added can open this page." : ". This page is private to you; please don't share the link.")} />
    </div>
  );
}

/** Signed-in calls: the Clerk session token goes in the Authorization header; n8n checks its signature. */
function SignedInPortal() {
  const { getToken } = useAuth();
  const clerk = useClerk();
  const api = useMemo<PortalApi>(() => {
    const call = async (url: string, body: Record<string, unknown>) => {
      const token = await getToken();
      if (!token) throw new Error("Your sign-in expired. Sign in again.");
      let r: Response;
      try {
        r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(body), cache: "no-store" });
      } catch {
        throw new Error("Could not reach the studio. Check your connection and try again.");
      }
      if (r.status === 401 || r.status === 403) throw new Error("Your sign-in was not accepted. Sign out and sign in again.");
      return (await r.json()) as PortalData & { ok?: boolean; error?: string };
    };
    return {
      signedIn: true,
      load: (k) => call(PORTAL_SIGNED_URL, { k }),
      act: async (body) => {
        const j = await call(PORTAL_ACTION_SIGNED_URL, body);
        if (j.ok === false) throw new Error(j.error || "Something went wrong. Please try again.");
        return j;
      },
      signOut: () => void clerk.signOut({ redirectUrl: location.href }),
    };
  }, [getToken, clerk]);
  return (
    <ApiCtx.Provider value={api}>
      <PortalApp />
    </ApiCtx.Provider>
  );
}

function SignInPage() {
  const here = location.pathname + location.search;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex items-center justify-between py-6">
        <Wordmark label="Client portal" />
        <ThemeToggle />
      </header>
      <main className="container grid flex-1 place-items-center gap-6 pb-20">
        <div className="grid justify-items-center gap-5">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Sign in to see your marketing</h1>
            <p className="text-muted-foreground mt-2 text-sm">Use the email Meredith invited. Your plan, approvals and reports are only shown to people she added.</p>
          </div>
          <SignIn routing="hash" fallbackRedirectUrl={here} />
        </div>
      </main>
      <Footer note="Private client portal. Nothing here is posted or sent on its own." />
    </div>
  );
}

export default function Portal() {
  if (!CLERK_KEY)
    return (
      <ToastProvider>
        <ApiCtx.Provider value={linkApi}>
          <PortalApp />
        </ApiCtx.Provider>
      </ToastProvider>
    );
  return (
    <ClerkProvider publishableKey={CLERK_KEY} appearance={{ variables: { colorPrimary: "#2f4156", borderRadius: "8px", fontFamily: "inherit" } }}>
      <ToastProvider>
        <Show when="signed-out">
          <SignInPage />
        </Show>
        <Show when="signed-in">
          <SignedInPortal />
        </Show>
      </ToastProvider>
    </ClerkProvider>
  );
}
