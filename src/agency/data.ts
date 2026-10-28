import { useCallback, useEffect, useRef, useState } from "react";

const N8N = "https://subletlyco.app.n8n.cloud/webhook/";
export const DATA_URL = N8N + "mbm-data";
export const ACTION_URL = N8N + "mbm-action";
export const RECORD_URL = N8N + "mbm-record";
export const AI_URL = N8N + "mbm-ai";
export const PORTAL_URL = N8N + "mbm-portal";
export const PORTAL_ACTION_URL = N8N + "mbm-portal-action";
export const PORTAL_SIGNED_URL = N8N + "mbm-portal-signed";
export const PORTAL_ACTION_SIGNED_URL = N8N + "mbm-portal-action-signed";
/** Clerk publishable key (public by design). Set in Netlify; when it is empty the portal keeps the private-link mode. */
export const CLERK_KEY: string = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) || "";
export const FORM_INFO_URL = N8N + "mbm-form";
export const FORM_URL = N8N + "mbm-lead";
export const PASS_HEADER = "X-Studio-Key";
const PASS_KEY = "mbm-passcode";

/* ---------- shapes (match "Build Agency Data" in n8n) ---------- */
export type Kind = "reel" | "carousel" | "post" | "story" | "gbp_post" | "referral" | "email" | "listing" | "report";
export type Platform = "instagram" | "facebook" | "tiktok" | "gbp" | "youtube" | "email" | "other";
export type ContentStatus = "idea" | "draft" | "needs_approval" | "approved" | "posted" | "dropped";
export type LeadStatus = "new" | "contacted" | "appointment" | "client" | "closed" | "lost";
export type LeadSource = "comment" | "dm" | "form" | "call" | "text" | "email" | "referral" | "open_house" | "other";
export type Metric = "sends_per_1k" | "saves_per_1k" | "likes_per_1k" | "comments_per_1k" | "views" | "link_taps";

export interface Check { rule: string; ok: boolean; fix: string; source: "rule" | "ai" | "permission" }
export interface Compliance { checked_at: string; ok: boolean; checks: Check[]; disclosure_line: string; answers: Record<string, unknown> }
export interface Piece {
  id: number; title: string; kind: Kind; platform: Platform; pillar: string; plan_date: string; status: ContentStatus;
  hook: string; caption: string; script: string; notes: string; search_phrase: string;
  compliance: Compliance | null; compliance_ok: "" | "yes" | "no"; approved_by: string; approved_at: string;
  posted_by: string; posted_at: string; post_url: string; test_id: number; source: string; updated_at: string;
  hook_type: string; length_s: number | null; platform_post_id: string; post_check: string; ai_draft: { title: string; hook: string; caption: string; script: string } | null;
}
export interface Progress { kind: Kind; label: string; promised: number; delivered: number; lined_up: number; expected_by_now: number; behind: boolean }
export interface Lead { id: number; created_at: string; logged_at: string; received_how: "form" | "entered" | "logged"; possible_duplicate_of: number; source: LeadSource; platform: string; name: string; contact: string; message: string; post_url: string; status: LeadStatus; first_reply_at: string; response_min: number | null; heard_about: string; value: number; notes: string }
export interface Funnel { inquiries: number; contacted: number; appointments: number; clients: number; closed: number; lost: number; this_month: number; waiting: number; oldest_waiting_min: number | null; from_logging: number; median_response_min: number | null; by_source: { source: string; n: number }[] }
export interface Review { id: number; date: string; rating: number; reviewer: string; text: string; replied: boolean; reply_draft: string; platform: string }
export interface ReviewStats { count: number; avg: number | null; last_date: string; days_since: number | null; last_90d: number; unreplied: number; requests_month: number }
/** sends_per_1k is the stored key; it is computed from the Shares count and always shown as "shares". */
export interface Signals { sends_per_1k: number | null; saves_per_1k: number | null; likes_per_1k: number | null; comments_per_1k: number | null }
/** null = not entered (never zero). */
export interface Read { views: number | null; reach: number | null; likes?: number | null; comments?: number | null; shares: number | null; saves: number | null; watch_avg_s?: number | null; link_taps?: number | null; profile_visits?: number | null; age_h: number; signals?: Signals | null }
export interface PostResult { content_id: number; title: string; kind: string; pillar: string; platform: string; post_url: string; posted_at: string; d24: Read | null; d7: Read | null; d30: Read | null; other?: { age_h: number; views: number | null; read_at: string }[]; vs_normal: number | null }
export interface Pending { awaiting_7d: { id: number; title: string; posted_at: string; due: string }[]; missed_7d: { id: number; title: string; posted_at: string }[]; awaiting_30d: number }
export interface Results { posts: PostResult[]; normal: { n: number; views_7d: number | null; sends_per_1k: number | null; saves_per_1k: number | null }; pending?: Pending; month: { posts: number; views: number; link_taps: number } }
export interface TestResult { read_at: string; window: string; metric: Metric; a: number; b: number; pairs?: number; wins?: number; losses?: number; prob_b_better: number | null; verdict: string; a_reach: number; b_reach: number }
export interface Test { id: number; title: string; variable: string; variant_a: string; variant_b: string; metric: Metric; read_h: number; content_a: number; content_b: number; status: "planned" | "running" | "read" | "dropped"; result: TestResult | null; hypothesis: string; created_at: string }
export interface ReportSummary { headline: string; what_worked: string[]; what_to_change: string[]; next_month: string[]; note: string }
export interface ReportBody {
  numbers: {
    month: string; measured_through?: string; posts_published: number; delivered: { kind: string; promised: number; delivered: number }[];
    results: { measured_posts: number; posts: { title: string; kind: string; views_7d: number | null; reach_7d: number | null; shares_per_1k?: number | null; sends_per_1k?: number | null; saves_per_1k: number | null; link_taps: number | null; age_days?: number; vs_normal: number | null }[]; pending?: { title: string; posted: string; status: string }[]; normal_views_7d: number | null; normal_based_on: number };
    leads: { inquiries: number; contacted: number; appointments: number; clients: number; closed: number; median_response_min: number | null; from_a_post?: number; waiting_now?: number; reply_time_from_logging?: number; by_source: Record<string, number> };
    reviews: { new_this_month: number; total: number; avg: number | null; requests_sent: number };
    tests: { title: string; variable: string; verdict: string }[];
  };
  summary: ReportSummary; generated_at: string;
}
export interface Report { id: number; month: string; created_at: string; shared_at: string; shared_by: string; body: ReportBody | null }
export interface ContractItem { id: number; kind: Kind; label: string; per_month: number; note: string }
export interface Health { level: "warn" | "info"; text: string }
export interface Onboarding { [key: string]: boolean | string }
export interface PortalPerson { id: number; email: string; name: string; role: "approver" | "viewer"; active: boolean; invited_at: string; last_seen_at: string }
export interface Payment { month: string; amount: number; received: string }
export interface Client {
  id: number; client_key: string; name: string; business: string; license_name: string; license_title: string; brokerage: string; team_name: string; market: string;
  platforms: string[]; handles: Record<string, string>; alert_email: string; alert_leads: boolean; status: "active" | "paused" | "ended" | "removed";
  start_date: string; renew_date: string; renew_in_days: number | null; fee: number; voice: string; approved_claims: string; disclosures: string; onboarding: Onboarding; notes: string;
  broker_contact: string; sop_url: string; fair_housing_url: string; payments: Payment[]; people?: PortalPerson[];
  portal_url: string; form_url: string; contract: ContractItem[]; progress: Progress[]; content: Piece[]; leads: Lead[]; funnel: Funnel;
  reviews: { stats: ReviewStats; list: Review[]; requests: { id: number; contact: string; date: string; reviewer: string }[] };
  results: Results; tests: Test[]; reports: Report[]; health: Health[];
}
export interface AgencyData { ok: boolean; agency: { name: string; email: string; telegram: boolean; site: string }; month: string; today: string; clients: Client[] }

/* ---------- labels ---------- */
export const KIND_LABEL: Record<Kind, string> = { reel: "Reel", carousel: "Carousel", post: "Post", story: "Story", gbp_post: "Google post", referral: "Referral piece", email: "Email", listing: "Listing pack", report: "Monthly report" };
export const PLATFORM_LABEL: Record<Platform, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", gbp: "Google Business", youtube: "YouTube", email: "Email", other: "Other" };
export const STATUS_LABEL: Record<ContentStatus, string> = { idea: "Idea", draft: "Draft", needs_approval: "Waiting on client", approved: "Approved", posted: "Posted", dropped: "Dropped" };
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = { new: "New, no reply yet", contacted: "Contacted", appointment: "Appointment set", client: "Became a client", closed: "Closed a deal", lost: "Not moving forward" };
export const SOURCE_LABEL: Record<LeadSource, string> = { comment: "Comment", dm: "DM", form: "Inquiry form", call: "Call", text: "Text", email: "Email", referral: "Referral", open_house: "Open house", other: "Other" };
export const METRIC_LABEL: Record<Metric, string> = { sends_per_1k: "Shares per 1,000 reached", saves_per_1k: "Saves per 1,000 reached", likes_per_1k: "Likes per 1,000 reached", comments_per_1k: "Comments per 1,000 reached", views: "Views", link_taps: "Link taps" };
export const PLATFORMS: Platform[] = ["instagram", "facebook", "tiktok", "gbp", "youtube", "other"];
export const CONTRACT_KINDS: Kind[] = ["reel", "carousel", "post", "story", "gbp_post", "referral", "email", "listing", "report"];

/* ---------- passcode + calls ---------- */
let currentPass: string | null = null;
function readPass(): string | null {
  try {
    return sessionStorage.getItem(PASS_KEY) || localStorage.getItem(PASS_KEY);
  } catch {
    return null;
  }
}
function savePass(p: string | null, remember: boolean) {
  try {
    sessionStorage.removeItem(PASS_KEY);
    localStorage.removeItem(PASS_KEY);
    if (p) (remember ? localStorage : sessionStorage).setItem(PASS_KEY, p);
  } catch {
    /* storage blocked: the passcode lives in memory for this visit only */
  }
}

async function post<T>(url: string, body: Record<string, unknown>, headers: Record<string, string> = {}): Promise<T & { ok?: boolean; error?: string }> {
  let r: Response;
  try {
    r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Could not reach the studio. Check your connection and try again.");
  }
  if (r.status === 401 || r.status === 403) throw new Error("The passcode was not accepted. Lock and unlock the studio, then try again.");
  let j: T & { ok?: boolean; error?: string };
  try {
    j = await r.json();
  } catch {
    throw new Error("The studio sent back something unexpected. Try again in a minute.");
  }
  if (j.ok === false) throw new Error(j.error || "Something went wrong. Please try again.");
  return j;
}

/** POST to a passcode-protected agency webhook. */
export function agencyPost<T = { ok: boolean; id?: number }>(url: string, body: Record<string, unknown>) {
  const pass = currentPass || readPass();
  if (!pass) throw new Error("The studio is locked. Unlock it and try again.");
  return post<T>(url, body, { [PASS_HEADER]: pass });
}
/** POST to a public endpoint (portal approvals, inquiry form). */
export const publicPost = <T = { ok: boolean }>(url: string, body: Record<string, unknown>) => post<T>(url, body);

export const api = {
  saveClient: (client: Partial<Client> & Record<string, unknown>, client_key?: string) => agencyPost(ACTION_URL, { action: "client_save", client, client_key }),
  saveContract: (client_key: string, items: { kind: Kind; per_month: number; note?: string }[]) => agencyPost(ACTION_URL, { action: "contract_save", client_key, items }),
  saveContent: (client_key: string, content: Partial<Piece>, id?: number) => agencyPost(ACTION_URL, { action: "content_save", client_key, content, id }),
  setStatus: (id: number, status: ContentStatus, extra: { by?: string; post_url?: string; facts_checked?: boolean } = {}) => agencyPost(ACTION_URL, { action: "content_status", id, status, ...extra }),
  portalKey: (client_key: string, mode: "new" | "off") => agencyPost(ACTION_URL, { action: "portal_key", client_key, mode }),
  savePerson: (client_key: string, person: Partial<PortalPerson>) => agencyPost(ACTION_URL, { action: "people_save", client_key, person }),
  reportShared: (client_key: string, month: string, undo = false) => agencyPost<{ ok: boolean; month: string; shared_at: string }>(ACTION_URL, { action: "report_shared", client_key, month, by: "Meredith", mode: undo ? "undo" : "" }),
  saveLead: (client_key: string, lead: Partial<Lead> & { received_at?: string; replied_at?: string }, id?: number) => agencyPost(RECORD_URL, { action: "lead_save", client_key, lead, id }),
  saveReview: (client_key: string, review: Partial<Review> & { kind?: string; contact?: string; replied?: boolean | string }, id?: number) => agencyPost(RECORD_URL, { action: "review_save", client_key, review, id }),
  saveResult: (client_key: string, result: Record<string, unknown>) => agencyPost(RECORD_URL, { action: "result_save", client_key, result }),
  saveTest: (client_key: string, test: Partial<Test>, id?: number) => agencyPost(RECORD_URL, { action: "test_save", client_key, test, id }),
  compliance: (id: number, answers: Record<string, unknown>) => agencyPost<{ ok: boolean; id: number; compliance: Compliance }>(AI_URL, { action: "compliance", id, answers }),
  draft: (client_key: string, month: string, kind: "plan" | "referral", confirm = false) => agencyPost<{ ok: boolean; made: number }>(AI_URL, { action: "draft_content", client_key, month, kind, confirm }),
  reviewReply: (id: number) => agencyPost<{ ok: boolean; id: number; reply: string }>(AI_URL, { action: "review_reply", id }),
  readTest: (id: number) => agencyPost<{ ok: boolean; id: number; result: TestResult }>(AI_URL, { action: "test_read", id }),
  report: (client_key: string, month: string) => agencyPost<{ ok: boolean; id: number; month: string; body: ReportBody }>(AI_URL, { action: "report_make", client_key, month }),
};

export interface Notice { kind: "warn" | "err"; text: string; button?: string; onClick?: () => void }

export function useAgencyData() {
  const [data, setData] = useState<AgencyData | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [locked, setLocked] = useState<boolean>(() => !readPass());
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);
  const passRef = useRef<string | null>(readPass());

  const fetchData = useCallback(async (manual?: boolean): Promise<boolean> => {
    const pass = passRef.current;
    currentPass = pass;
    if (!pass) {
      setLocked(true);
      return false;
    }
    try {
      const r = await fetch(DATA_URL, { method: "POST", headers: { "Content-Type": "application/json", [PASS_HEADER]: pass }, body: "{}", cache: "no-store" });
      if (r.status === 401 || r.status === 403) {
        passRef.current = null;
        savePass(null, false);
        setLocked(true);
        setAuthError("That passcode did not work. Try again.");
        return false;
      }
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = (await r.json()) as AgencyData;
      setData({ ...j, clients: Array.isArray(j.clients) ? j.clients : [] });
      setNotice(null);
      setLocked(false);
      setAuthError("");
      return true;
    } catch {
      setNotice({ kind: "warn", text: manual ? "Could not reach the studio just now. What is on screen is from the last load." : "Could not reach the studio. Check your connection, then refresh.", button: "Try again", onClick: () => void fetchData(true) });
      return false;
    }
  }, []);

  useEffect(() => {
    if (passRef.current) void fetchData();
    const i = setInterval(() => {
      if (passRef.current && document.visibilityState === "visible") void fetchData();
    }, 120000);
    return () => clearInterval(i);
  }, [fetchData]);

  const unlock = async (pass: string, remember: boolean) => {
    setChecking(true);
    setAuthError("");
    passRef.current = pass.trim();
    const ok = await fetchData(true);
    if (ok) savePass(passRef.current, remember);
    setChecking(false);
  };
  const lock = () => {
    passRef.current = null;
    currentPass = null;
    savePass(null, false);
    setData(null);
    setLocked(true);
  };
  return { data, notice, refresh: () => fetchData(true), locked, unlock, lock, authError, checking };
}

/* ---------- small helpers ---------- */
export const fmt = (n: number | null | undefined) => (n == null ? "—" : n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "K" : n.toLocaleString("en-US"));
export const mins = (m: number | null | undefined) => (m == null ? "—" : m < 1 ? "under 1 min" : m < 60 ? Math.round(m) + " min" : m < 1440 ? (m / 60).toFixed(m < 600 ? 1 : 0).replace(/\.0$/, "") + " h" : Math.round(m / 1440) + " days");
const dt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const dd = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
export const when = (iso: string) => (iso && Number.isFinite(Date.parse(iso)) ? dt.format(new Date(iso)) : "");
export const day = (iso: string) => (iso && Number.isFinite(Date.parse(iso.length === 10 ? iso + "T12:00:00Z" : iso)) ? dd.format(new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso)) : "");
export const monthLabel = (ym: string) => (/^\d{4}-\d{2}$/.test(ym) ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(ym + "-15T12:00:00Z")) : ym);
export const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 15));
  return d.toISOString().slice(0, 7);
};
export const disclosureLine = (c: Pick<Client, "disclosures" | "license_name" | "license_title" | "brokerage"> & { broker_contact?: string }) =>
  c.disclosures || [[c.license_name, c.license_title].filter(Boolean).join(", "), c.brokerage, c.broker_contact].filter(Boolean).join(" | ");
/** A number that may be blank: blank shows a dash, never zero. */
export const val = (n: number | null | undefined) => (n == null ? "—" : String(n));
