import { useQueryClient } from "@tanstack/react-query";
import { useGetEvaluations, useRunEvaluation, getGetEvaluationsQueryKey, getGetAnalyticsQueryKey } from "@workspace/api-client-react";
import { FlaskConical, Play, Check, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PageHead, Skel, ErrorBox, Empty, Stat, btnAccent } from "@/components/bits";
import { useToast } from "@/hooks/use-toast";

const pct = (n: number) => `${(n <= 1 ? n * 100 : n).toFixed(1)}%`;

export default function Evaluations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const ev = useGetEvaluations();
  const run = useRunEvaluation({ mutation: {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getGetEvaluationsQueryKey() }); qc.invalidateQueries({ queryKey: getGetAnalyticsQueryKey() }); },
    onError: () => toast({ title: "Evaluation run failed", variant: "destructive" }),
  } });
  const d = ev.data;
  const button = <button onClick={() => run.mutate()} disabled={run.isPending} className={btnAccent} data-testid="button-run-evaluation"><Play className="h-4 w-4" /> {run.isPending ? "Running checks..." : d?.hasRun ? "Run again" : "Run evaluation"}</button>;
  return (
    <div>
      <PageHead kicker="Measured, not claimed" title="Evaluations">{button}</PageHead>
      {ev.isLoading ? <Skel className="h-64" />
        : ev.isError || !d ? <ErrorBox label="Evaluations unavailable" onRetry={() => ev.refetch()} />
        : !d.hasRun ? <Empty icon={<FlaskConical className="h-5 w-5" />} title="No run yet" body="Run the suite to measure retrieval recall for vector vs hybrid search and check safety abstentions on the fictional corpus.">{button}</Empty>
        : (
          <>
            <p className="mb-4 font-mono text-xs text-muted-foreground" data-testid="text-run-meta">Ran {d.runAt ? format(new Date(d.runAt), "MMM d, HH:mm:ss") : ""} · {d.totalCases} cases · {d.durationMs} ms · embeddings: {d.embeddingStrategy}</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Vector recall" value={pct(d.vectorRecall)} />
              <Stat label="Hybrid recall" value={pct(d.hybridRecall)} tone="accent" />
              <Stat label="Safety" value={`${d.safetyPassed}/${d.safetyTotal}`} note="correct abstentions" />
              <Stat label="Cases passed" value={`${d.cases.filter((c) => c.passed).length}/${d.cases.length}`} />
            </div>
            <div className="mt-10 overflow-x-auto rounded-xl border border-card-border bg-card">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><tr className="border-b border-border text-left"><th className="p-3">Question</th><th className="p-3">Category</th><th className="p-3">Expected</th><th className="p-3 text-center">Vector</th><th className="p-3 text-center">Hybrid</th><th className="p-3 text-center">Result</th></tr></thead>
                <tbody>{d.cases.map((c, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0" data-testid={`row-case-${i}`}>
                    <td className="p-3">{c.question}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{c.category}</td>
                    <td className="p-3 text-xs">{c.expectedPolicy}</td>
                    <td className="p-3"><Hit ok={c.vectorHit} /></td>
                    <td className="p-3"><Hit ok={c.hybridHit} /></td>
                    <td className="p-3 text-center"><span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] uppercase", c.passed ? "bg-accent/15 text-accent" : "bg-destructive/10 text-destructive")}>{c.passed ? "pass" : "fail"}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
    </div>
  );
}

function Hit({ ok }: { ok: boolean }) {
  return <span className={cn("mx-auto grid h-6 w-6 place-items-center rounded-full", ok ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}</span>;
}
