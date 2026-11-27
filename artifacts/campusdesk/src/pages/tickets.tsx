import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTickets, useDraftTicket, useEditTicket, useApproveTicket,
  getListTicketsQueryKey, getGetAnalyticsQueryKey, getGetSessionQueryKey, type Ticket,
} from "@workspace/api-client-react";
import { TicketPlus, Pencil, ShieldCheck, RotateCw, Inbox } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHead, Skel, ErrorBox, Empty, btnPrimary, btnGhost, btnAccent } from "@/components/bits";
import { TicketForm } from "@/components/ticket-form";

export default function Tickets() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const tickets = useListTickets();
  const draft = useDraftTicket();
  const edit = useEditTicket();
  const [form, setForm] = useState<{ ticket?: Ticket } | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: getListTicketsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetAnalyticsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetSessionQueryKey() });
  };
  const drafts = tickets.data?.filter((t) => t.status === "draft") ?? [];
  const sent = tickets.data?.filter((t) => t.status === "submitted") ?? [];

  return (
    <div>
      <PageHead kicker="Human-approved actions" title="Tickets">
        <button onClick={() => setForm({})} className={btnPrimary} data-testid="button-new-ticket"><TicketPlus className="h-4 w-4" /> New draft</button>
      </PageHead>
      {tickets.isLoading ? <div className="space-y-4">{[0, 1].map((i) => <Skel key={i} className="h-48" />)}</div>
        : tickets.isError ? <ErrorBox label="Could not load tickets" onRetry={() => tickets.refetch()} />
        : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <section>
              <h2 className="font-display mb-4 text-2xl text-primary">Awaiting your approval <span className="font-mono text-sm text-accent">{drafts.length}</span></h2>
              {drafts.length === 0 ? <Empty icon={<Inbox className="h-5 w-5" />} title="No drafts waiting" body="Drafts appear here for review. The assistant never submits on its own." />
                : <div className="space-y-5">{drafts.map((t) => <DraftCard key={t.id} t={t} onEdit={() => setForm({ ticket: t })} onDone={refresh} />)}</div>}
            </section>
            <section>
              <h2 className="font-display mb-4 text-2xl text-primary">Submitted <span className="font-mono text-sm text-accent">{sent.length}</span></h2>
              {sent.length === 0 ? <p className="text-sm text-muted-foreground">Nothing submitted yet.</p> : (
                <div className="space-y-3">{sent.map((t) => (
                  <div key={t.id} className="rise rounded-xl border border-card-border bg-card p-4" data-testid={`card-submitted-${t.id}`}>
                    <div className="flex items-center justify-between"><span className="font-mono text-xs text-accent">{t.number}</span><span className="text-xs text-muted-foreground">{t.category} · {t.priority}</span></div>
                    <p className="mt-1 font-semibold text-primary">{t.title}</p>
                    <Events events={t.events} />
                  </div>
                ))}</div>
              )}
            </section>
          </div>
        )}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader><DialogTitle className="font-display text-2xl text-primary">{form?.ticket ? `Edit ${form.ticket.number}` : "New ticket draft"}</DialogTitle></DialogHeader>
          {form && <TicketForm key={form.ticket?.id ?? "new"} initial={form.ticket ? { ...form.ticket, category: form.ticket.category as never, priority: form.ticket.priority as never } : undefined}
            submitLabel={form.ticket ? "Save changes" : "Save draft"} pending={draft.isPending || edit.isPending}
            onSubmit={(v) => {
              const opts = { onSuccess: () => { setForm(null); refresh(); toast({ title: form.ticket ? "Draft updated" : "Draft saved", description: "Approval hash regenerated for the new payload." }); }, onError: () => toast({ title: "Save failed", variant: "destructive" as const }) };
              if (form.ticket) edit.mutate({ id: form.ticket.id, data: v }, opts); else draft.mutate({ data: v }, opts);
            }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Events({ events }: { events: string[] }) {
  return (
    <ol className="mt-3 space-y-1 border-l border-border pl-3 font-mono text-[11px] text-muted-foreground">
      {events.map((e, i) => <li key={i}>{e}</li>)}
    </ol>
  );
}

function DraftCard({ t, onEdit, onDone }: { t: Ticket; onEdit: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const approve = useApproveTicket();
  const [confirm, setConfirm] = useState(false);
  const [fail, setFail] = useState(false);
  const payload = { title: t.title, description: t.description, category: t.category, priority: t.priority, requester: t.requester };
  const run = (simulateFailure: boolean) => approve.mutate({ id: t.id, data: { approvalHash: t.approvalHash, simulateFailure } }, {
    onSuccess: (r) => { onDone(); toast({ title: `${r.number} submitted`, description: "Approved by you with a matching hash." }); },
    onError: () => { onDone(); },
  });
  return (
    <article className="rise overflow-hidden rounded-xl border border-card-border bg-card" data-testid={`card-draft-${t.id}`}>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="font-mono text-xs text-accent">{t.number} · DRAFT</span>
        <button onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent" data-testid={`button-edit-${t.id}`}><Pencil className="h-3.5 w-3.5" /> Edit</button>
      </div>
      <div className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Exact payload to be submitted</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-primary p-4 font-mono text-[12px] leading-5 text-primary-foreground" data-testid={`text-payload-${t.id}`}>{JSON.stringify(payload, null, 2)}</pre>
        <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">approvalHash: <span className="text-primary">{t.approvalHash}</span></p>
        <Events events={t.events} />
        {approve.isError && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" data-testid={`status-failure-${t.id}`}>
            Submission failed. The draft is intact.
            <button onClick={() => run(false)} disabled={approve.isPending} className={btnGhost + " ml-auto py-1"} data-testid={`button-retry-${t.id}`}><RotateCw className="h-3.5 w-3.5" /> Retry submission</button>
          </div>
        )}
        <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1 accent-[hsl(var(--accent))]" data-testid={`checkbox-confirm-${t.id}`} />I reviewed this exact payload and approve submitting it.</label>
        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} data-testid={`checkbox-fail-${t.id}`} />Simulate a downstream failure (demo the retry path)</label>
        <button onClick={() => run(fail)} disabled={!confirm || approve.isPending} className={cn(btnAccent, "mt-4 w-full")} data-testid={`button-approve-${t.id}`}>
          <ShieldCheck className="h-4 w-4" /> {approve.isPending ? "Submitting..." : "Approve and submit"}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">Created {format(new Date(t.createdAt), "MMM d, h:mm a")} · requester {t.requester}</p>
      </div>
    </article>
  );
}
