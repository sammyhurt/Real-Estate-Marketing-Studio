import { AnimatePresence, motion } from "motion/react";
import { Component, useCallback, useMemo, useState, type ReactNode } from "react";

import { ToastProvider } from "./bits";
import { ClientsPanel } from "./clients";
import { ContentPanel } from "./content";
import { useAgencyData } from "./data";
import Footer from "./footer";
import { LeadsPanel } from "./leads";
import LockScreen from "./lock";
import Navbar from "./navbar";
import { ReportsPanel } from "./reports";
import { ResultsPanel } from "./results";
import { ReviewsPanel } from "./reviews";
import { StoreProvider } from "./store";
import { TABS, type TabId } from "./tabs";
import { TodayPanel } from "./today";

/** Keeps one broken screen from blanking the whole studio. */
class Boundary extends Component<{ children: ReactNode; resetKey: string }, { err: boolean; key: string }> {
  state = { err: false, key: this.props.resetKey };
  static getDerivedStateFromError() {
    return { err: true };
  }
  static getDerivedStateFromProps(p: { resetKey: string }, s: { err: boolean; key: string }) {
    return p.resetKey !== s.key ? { err: false, key: p.resetKey } : null;
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="container py-40 text-center">
        <p className="text-lg font-semibold">This screen hit a snag.</p>
        <p className="text-muted-foreground mt-2 text-sm">Try another tab, or refresh the page.</p>
      </div>
    );
  }
}

const read = (k: string, d: string) => {
  try {
    return localStorage.getItem(k) || d;
  } catch {
    return d;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

export default function App() {
  return (
    <ToastProvider>
      <Studio />
    </ToastProvider>
  );
}

function Studio() {
  const s = useAgencyData();
  const [tab, setTab] = useState<TabId>(() => {
    const t = read("mbm-tab", "today") as TabId;
    return TABS.some((x) => x.id === t) ? t : "today";
  });
  const [pick, setPickState] = useState(() => read("mbm-client", ""));
  const setPick = useCallback((k: string) => {
    setPickState(k);
    write("mbm-client", k);
  }, []);
  const goto = useCallback(
    (t: TabId, clientKey?: string) => {
      setTab(t);
      write("mbm-tab", t);
      if (clientKey !== undefined) setPick(clientKey);
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    [setPick],
  );

  const clients = useMemo(() => s.data?.clients || [], [s.data]);
  const client = clients.find((c) => c.client_key === pick) || null;

  if (s.locked) return <LockScreen onUnlock={s.unlock} error={s.authError} checking={s.checking} />;

  const scope = client ? [client] : clients.filter((c) => c.status === "active" || c.status === "paused");
  const counts: Partial<Record<TabId, number>> = {
    leads: scope.reduce((a, c) => a + c.funnel.waiting, 0),
    content: scope.reduce((a, c) => a + c.content.filter((x) => x.status === "needs_approval" || (x.status === "approved" && !x.posted_at)).length, 0),
    reviews: scope.reduce((a, c) => a + c.reviews.stats.unreplied, 0),
  };
  return (
    <StoreProvider value={{ d: s.data, refresh: s.refresh, goto, pick, setPick, client }}>
      <div className="flex min-h-screen flex-col">
        <Navbar tab={tab} onTab={(t) => goto(t)} counts={counts} fresh={s.data ? "Live from n8n" : "Connecting…"} onRefresh={() => void s.refresh()} onLock={s.lock} />
        {s.notice ? (
          <div className="container relative z-40 mt-4 lg:fixed lg:inset-x-0 lg:top-[calc(var(--header-height)+4px)] lg:mt-0">
            <div className={"bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 shadow-md " + (s.notice.kind === "err" ? "border-rose-500/50" : "border-amber-500/50")}>
              <p className="max-w-[70ch] text-sm">{s.notice.text}</p>
              {s.notice.button ? (
                <button type="button" onClick={s.notice.onClick} className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium">
                  {s.notice.button}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <Boundary resetKey={tab + pick}>
                {tab === "today" ? (
                  <TodayPanel />
                ) : tab === "clients" ? (
                  <ClientsPanel />
                ) : tab === "content" ? (
                  <ContentPanel />
                ) : tab === "leads" ? (
                  <LeadsPanel />
                ) : tab === "reviews" ? (
                  <ReviewsPanel />
                ) : tab === "results" ? (
                  <ResultsPanel />
                ) : (
                  <ReportsPanel />
                )}
              </Boundary>
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </StoreProvider>
  );
}
