import Magic from "@iconify-react/solar/magic-stick-3-linear";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { CopyButton, NativeSelect, Spinner, useAction, Working } from "./bits";
import { addMonths, api, monthLabel, when } from "./data";
import { NeedClient, PageHead } from "./page";
import { ReportView } from "./report-view";
import { useStore } from "./store";
import { Empty, Panel } from "./ui";

export function ReportsPanel() {
  const { d, client, refresh } = useStore();
  const { busy, run } = useAction();
  const cur = d?.month || new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(cur);
  const months = [0, -1, -2, -3, -4, -5].map((n) => addMonths(cur, n));
  const rep = client?.reports.find((r) => r.month === month) || null;
  return (
    <>
      <PageHead eyebrow="Reports" title="The monthly report" lead="Built only from what was logged: posts, check-ins, leads, reviews and tests. The words are drafted by AI from those numbers, and nothing is estimated." allowAll={false} />
      {!client ? (
        <NeedClient what="their reports" />
      ) : (
        <div className="container flex flex-col gap-6 pb-20">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-56">
              <NativeSelect ariaLabel="Month" value={month} onChange={setMonth} options={months.map((m) => ({ value: m, label: monthLabel(m) }))} />
            </div>
            <Button
              className="rounded-full"
              disabled={!!busy}
              onClick={() =>
                void run(
                  "make",
                  async () => {
                    await api.report(client.client_key, month);
                    await refresh();
                  },
                  "Report made. It shows in their portal now.",
                )
              }
            >
              {busy ? <Spinner /> : <Magic className="size-4" />} {rep ? "Make it again with the latest numbers" : "Make the " + monthLabel(month) + " report"}
            </Button>
            {client.portal_url ? <CopyButton text={client.portal_url} label="Copy their portal link" /> : null}
            {rep ? (
              <Button
                variant="outline"
                className="rounded-full"
                disabled={!!busy}
                onClick={() =>
                  void run(
                    "shared",
                    async () => {
                      await api.reportShared(client.client_key, month, !!rep.shared_at);
                      await refresh();
                    },
                    rep.shared_at ? "Marked not shared." : "Marked shared with " + client.name.split(" ")[0] + ".",
                  )
                }
              >
                {busy === "shared" ? <Spinner /> : null} {rep.shared_at ? "Shared " + when(rep.shared_at) + " · undo" : "I shared it with " + client.name.split(" ")[0]}
              </Button>
            ) : null}
          </div>
          {rep && !rep.shared_at ? <p className="text-muted-foreground text-sm">The studio never sends the report itself. Share the portal link (or print it to PDF), then mark it shared so you know it went out.</p> : null}
          {busy ? <Working text="Pulling the numbers and writing the summary…" /> : null}
          {rep?.body ? (
            <Panel eyebrow={"Made " + when(rep.created_at)} className="lg:col-span-6">
              <ReportView body={rep.body} month={rep.month} />
            </Panel>
          ) : (
            <Empty>No report for {monthLabel(month)} yet. Best made in the last days of the month, after the 7-day check-ins are in.</Empty>
          )}
        </div>
      )}
    </>
  );
}
