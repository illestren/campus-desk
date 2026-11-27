import { useGetAnalytics } from "@workspace/api-client-react";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import { PageHead, Skel, ErrorBox, Empty, Stat, btnGhost } from "@/components/bits";

export default function Observability() {
  const a = useGetAnalytics();
  const d = a.data;
  const fbTotal = d ? d.helpfulCount + d.unhelpfulCount : 0;
  const maxLat = d ? Math.max(1, ...d.traces.map((t) => t.latencyMs)) : 1;
  return (
    <div>
      <PageHead kicker="Live from this demo session" title="Observability">
        <button onClick={() => a.refetch()} className={btnGhost} data-testid="button-refresh-analytics">{a.isFetching ? "Refreshing..." : "Refresh"}</button>
      </PageHead>
      {a.isLoading ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skel key={i} className="h-28" />)}</div>
        : a.isError || !d ? <ErrorBox label="Analytics unavailable" onRetry={() => a.refetch()} />
        : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Conversations" value={d.conversations} />
              <Stat label="Answers" value={d.answers} />
              <Stat label="Avg latency" value={<>{Math.round(d.averageLatencyMs)}<span className="text-lg"> ms</span></>} tone="accent" />
              <Stat label="Tokens" value={d.totalTokens.toLocaleString()} />
              <Stat label="Submitted tickets" value={d.submittedTickets} />
              <Stat label="Pending drafts" value={d.pendingTickets} tone="accent" />
              <Stat label="Feedback" value={`${d.helpfulCount}/${fbTotal}`} note="helpful of rated answers" />
              <Stat label="Abstentions" value={d.abstentions} note="declined for lack of evidence" />
            </div>
            <h2 className="font-display mb-4 mt-12 text-2xl text-primary">Trace log</h2>
            {d.traces.length === 0 ? <Empty icon={<Activity className="h-5 w-5" />} title="No traces yet" body="Ask the assistant a question or draft a ticket. Each action is recorded here." /> : (
              <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><tr className="border-b border-border text-left"><th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Detail</th><th className="p-3">Latency</th><th className="p-3 text-right">Tokens</th></tr></thead>
                  <tbody>{d.traces.map((t) => (
                    <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40" data-testid={`row-trace-${t.id}`}>
                      <td className="whitespace-nowrap p-3 font-mono text-xs text-muted-foreground">{format(new Date(t.createdAt), "HH:mm:ss")}</td>
                      <td className="p-3 font-mono text-xs font-semibold text-primary">{t.action}</td>
                      <td className="p-3 text-xs">{t.detail}</td>
                      <td className="w-40 p-3"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${t.latencyMs / maxLat})` }} /></div><span className="font-mono text-[11px]">{t.latencyMs}</span></div></td>
                      <td className="p-3 text-right font-mono text-xs">{t.tokens}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </>
        )}
    </div>
  );
}
