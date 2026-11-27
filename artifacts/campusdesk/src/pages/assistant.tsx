import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSession, useListConversations, useListMessages, useCreateConversation, useSendMessage, useSubmitFeedback, useDraftTicket,
  getListConversationsQueryKey, getListMessagesQueryKey, getGetAnalyticsQueryKey, getGetSessionQueryKey, getListTicketsQueryKey,
  type Message, type MessageInputRetrievalMode,
} from "@workspace/api-client-react";
import { Plus, Send, ThumbsUp, ThumbsDown, ChevronDown, FileText, Check, TicketPlus, BookOpenCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Skel, ErrorBox, btnGhost, btnPrimary } from "@/components/bits";
import { SourceDialog, type SourceDoc } from "@/components/source-dialog";
import { TicketForm } from "@/components/ticket-form";

const PROMPTS = [
  "How do I get added to my course in the LMS?",
  "What is the grading turnaround expectation for TAs?",
  "Who do I contact if my payroll setup is incomplete?",
  "What should I do if a student discloses a personal crisis?",
];

export default function Assistant() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const session = useGetSession();
  const convs = useListConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<MessageInputRetrievalMode>("hybrid");
  const [doc, setDoc] = useState<SourceDoc | null>(null);
  const [ticketFrom, setTicketFrom] = useState<{ title: string; description: string } | null>(null);
  const [pendingQ, setPendingQ] = useState<string | null>(null);
  const msgs = useListMessages(activeId ?? "", { query: { enabled: !!activeId, queryKey: getListMessagesQueryKey(activeId ?? "") } });
  const create = useCreateConversation();
  const send = useSendMessage();
  const fb = useSubmitFeedback();
  const draft = useDraftTicket();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingQ || (msgs.data?.length ?? 0) > 0) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [msgs.data?.length, pendingQ]);
  useEffect(() => { if (activeId && convs.data && !convs.data.some((c) => c.id === activeId)) setActiveId(null); }, [convs.data, activeId]);

  async function ask(q: string) {
    const content = q.trim();
    if (!content || send.isPending) return;
    setText(""); setPendingQ(content);
    try {
      let id = activeId;
      if (!id) { const c = await create.mutateAsync(); id = c.id; setActiveId(id); }
      await send.mutateAsync({ id, data: { content, retrievalMode: mode } });
      qc.invalidateQueries({ queryKey: getListMessagesQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAnalyticsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetSessionQueryKey() });
    } catch {
      setText(content);
      toast({ title: "Message failed", description: "Your question was restored to the composer. Try again.", variant: "destructive" });
    } finally { setPendingQ(null); }
  }

  function rate(m: Message, rating: "helpful" | "unhelpful") {
    fb.mutate({ data: { messageId: m.id, rating } }, { onSuccess: () => {
      if (activeId) qc.invalidateQueries({ queryKey: getListMessagesQueryKey(activeId) });
      qc.invalidateQueries({ queryKey: getGetAnalyticsQueryKey() });
    } });
  }

  const list = msgs.data ?? [];
  const s = session.data;
  const done = s?.checklist.filter((c) => c.complete).length ?? 0;

  return (
    <div className="grid gap-8 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
      {/* history */}
      <section className="order-2 xl:order-1">
        <button onClick={() => setActiveId(null)} className={btnPrimary + " w-full"} data-testid="button-new-conversation"><Plus className="h-4 w-4" /> New question</button>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">History</p>
        <div className="mt-2 space-y-1">
          {convs.isLoading && [0, 1, 2].map((i) => <Skel key={i} className="h-9" />)}
          {convs.isError && <ErrorBox label="History unavailable" onRetry={() => convs.refetch()} />}
          {convs.data?.length === 0 && <p className="text-sm text-muted-foreground">No conversations yet.</p>}
          {convs.data?.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} data-testid={`button-conversation-${c.id}`}
              className={cn("block w-full truncate rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors", activeId === c.id ? "border-accent bg-card font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-card")}>
              {c.title}
            </button>
          ))}
        </div>
      </section>

      {/* chat */}
      <section className="order-1 flex min-h-[70dvh] flex-col xl:order-2">
        <div className="flex-1 space-y-6">
          {!activeId && !pendingQ && (
            <div className="rise pt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Evidence-first service desk</p>
              <h1 className="font-display mt-3 text-4xl font-semibold leading-[1.05] text-primary md:text-6xl">
                {s ? `Welcome, ${s.name.split(" ")[0]}.` : "Welcome."}<br /><span className="italic text-accent">Ask with receipts.</span>
              </h1>
              <p className="mt-4 max-w-xl text-muted-foreground">Every answer cites the fictional policy it came from, and you can open the full source. When something needs a human, you draft a ticket and approve the exact payload yourself.</p>
              {s && !s.aiAvailable && <p className="mt-4 inline-block rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm" data-testid="text-extractive-mode">No AI provider is connected. Answers are extracted directly from retrieved policy passages.</p>}
              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                {PROMPTS.map((p, i) => (
                  <button key={p} onClick={() => ask(p)} style={{ animationDelay: `${i * 60}ms` }} data-testid={`button-prompt-${i}`}
                    className="rise group rounded-xl border border-card-border bg-card p-4 text-left text-sm transition-transform hover:-translate-y-0.5 hover:border-accent">
                    <span className="font-mono text-[10px] text-accent">0{i + 1}</span><p className="mt-1 font-medium">{p}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeId && msgs.isLoading && [0, 1].map((i) => <Skel key={i} className="h-24" />)}
          {msgs.isError && <ErrorBox label="Could not load messages" onRetry={() => msgs.refetch()} />}
          {list.map((m) => m.role === "user" ? (
            <div key={m.id} className="rise ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground" data-testid={`text-user-${m.id}`}>{m.content}</div>
          ) : (
            <AnswerCard key={m.id} m={m} onSource={setDoc} onRate={rate}
              onTicket={() => {
                const idx = list.findIndex((x) => x.id === m.id);
                const q = list.slice(0, idx).reverse().find((x) => x.role === "user")?.content ?? "Help request";
                setTicketFrom({ title: q.slice(0, 150), description: `Question: ${q}\n\nAssistant answer:\n${m.content}`.slice(0, 4000) });
              }} />
          ))}
          {pendingQ && (
            <>
              {!list.some((m) => m.content === pendingQ) && <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary/80 px-4 py-3 text-primary-foreground">{pendingQ}</div>}
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><span className="dot h-2 w-2 rounded-full bg-accent" />Retrieving policies ({mode}) and composing a cited answer</div>
            </>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="sticky bottom-3 mt-6 rounded-2xl border border-card-border bg-card p-2 shadow-[0_10px_30px_-12px_hsl(222_58%_22%/0.35)]">
          <textarea rows={2} value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} data-testid="input-message"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(text); } }}
            placeholder="Ask about LMS access, grading, payroll, onboarding..." className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none" />
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex rounded-lg bg-muted p-0.5 font-mono text-[11px]">
              {(["hybrid", "vector"] as const).map((r) => (
                <button type="button" key={r} onClick={() => setMode(r)} className={cn("rounded-md px-2.5 py-1", mode === r ? "bg-card text-primary shadow-sm" : "text-muted-foreground")} data-testid={`button-mode-${r}`}>{r}</button>
              ))}
            </div>
            <button type="submit" disabled={!text.trim() || send.isPending} className={btnPrimary} data-testid="button-send"><Send className="h-4 w-4" /> Ask</button>
          </div>
        </form>
      </section>

      {/* onboarding */}
      <aside className="order-3 space-y-4">
        <div className="rounded-xl border border-card-border bg-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Onboarding</p>
          {session.isLoading ? <Skel className="mt-3 h-32" /> : session.isError ? <ErrorBox label="Session unavailable" onRetry={() => session.refetch()} /> : s && (
            <>
              <p className="font-display mt-1 text-3xl text-primary" data-testid="text-onboarding-progress">{done}<span className="text-muted-foreground">/{s.checklist.length}</span></p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full origin-left bg-accent transition-transform duration-700" style={{ transform: `scaleX(${s.checklist.length ? done / s.checklist.length : 0})` }} /></div>
              <ul className="mt-4 space-y-3">
                {s.checklist.map((c) => (
                  <li key={c.id} className="flex gap-3" data-testid={`item-checklist-${c.id}`}>
                    <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border", c.complete ? "border-accent bg-accent text-accent-foreground" : "border-input")}>{c.complete && <Check className="h-3 w-3" />}</span>
                    <div><p className={cn("text-sm font-medium", c.complete && "text-muted-foreground line-through")}>{c.title}</p><p className="text-xs text-muted-foreground">{c.description}</p></div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <button onClick={() => setTicketFrom({ title: "", description: "" })} className={btnGhost + " w-full"} data-testid="button-open-ticket"><TicketPlus className="h-4 w-4" /> Draft a ticket</button>
      </aside>

      <SourceDialog doc={doc} onClose={() => setDoc(null)} />
      <Dialog open={!!ticketFrom} onOpenChange={(o) => !o && setTicketFrom(null)}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader><DialogTitle className="font-display text-2xl text-primary">Draft a ticket</DialogTitle></DialogHeader>
          {ticketFrom && <TicketForm initial={ticketFrom} submitLabel="Save draft" pending={draft.isPending} onSubmit={(v) => draft.mutate({ data: v }, {
            onSuccess: (t) => {
              setTicketFrom(null);
              qc.invalidateQueries({ queryKey: getListTicketsQueryKey() });
              qc.invalidateQueries({ queryKey: getGetAnalyticsQueryKey() });
              toast({ title: `Draft ${t.number} saved`, description: "Review and approve it on the Tickets page. Nothing has been submitted." });
            },
            onError: () => toast({ title: "Could not save draft", variant: "destructive" }),
          })} />}
          <Link href="/tickets" className="text-center text-xs text-accent underline" data-testid="link-tickets">Go to approval queue</Link>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnswerCard({ m, onSource, onRate, onTicket }: { m: Message; onSource: (d: SourceDoc) => void; onRate: (m: Message, r: "helpful" | "unhelpful") => void; onTicket: () => void }) {
  const [trace, setTrace] = useState(false);
  return (
    <article className="rise rounded-2xl border border-card-border bg-card p-5" data-testid={`card-answer-${m.id}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <BookOpenCheck className="h-3.5 w-3.5 text-accent" /><span>{m.model}</span><span>· {m.latencyMs} ms</span>
        {m.abstained && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">Abstained: insufficient evidence</span>}
      </div>
      <div className="whitespace-pre-wrap text-[15px] leading-7">{m.content}</div>
      {m.citations.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Evidence</p>
          {m.citations.map((c, i) => (
            <button key={c.id + i} onClick={() => onSource({ title: c.title, section: c.section, content: c.content, meta: `Retrieval score ${c.score.toFixed(3)}` })} data-testid={`button-citation-${c.id}`}
              className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-accent hover:bg-accent/5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-primary font-mono text-[11px] text-primary-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-primary">{c.title}</span><span className="block truncate text-xs text-muted-foreground">{c.section} · {c.content}</span></span>
              <span className="font-mono text-[11px] text-accent">{c.score.toFixed(2)}</span><FileText className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={() => onRate(m, "helpful")} className={cn("rounded-md border p-1.5", m.feedback === "helpful" ? "border-accent bg-accent text-accent-foreground" : "border-border hover:bg-muted")} aria-label="Helpful" data-testid={`button-helpful-${m.id}`}><ThumbsUp className="h-3.5 w-3.5" /></button>
        <button onClick={() => onRate(m, "unhelpful")} className={cn("rounded-md border p-1.5", m.feedback === "unhelpful" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")} aria-label="Unhelpful" data-testid={`button-unhelpful-${m.id}`}><ThumbsDown className="h-3.5 w-3.5" /></button>
        <button onClick={() => setTrace(!trace)} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 font-mono text-[11px] hover:bg-muted" data-testid={`button-trace-${m.id}`}>
          Trace ({m.steps.length}) <ChevronDown className={cn("h-3 w-3 transition-transform", trace && "rotate-180")} />
        </button>
        <button onClick={onTicket} className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/70" data-testid={`button-ticket-from-${m.id}`}><TicketPlus className="h-3.5 w-3.5" /> Draft ticket</button>
      </div>
      {trace && (
        <ol className="mt-3 space-y-0 border-l border-dashed border-accent/60 pl-4">
          {m.steps.map((st, i) => (
            <li key={i} className="relative py-1.5 text-xs" data-testid={`text-step-${m.id}-${i}`}>
              <span className="absolute -left-[21px] top-3 h-2 w-2 rounded-full bg-accent" />
              <span className="font-mono font-semibold text-primary">{st.name}</span> <span className="font-mono text-muted-foreground">{st.durationMs} ms</span>
              <p className="text-muted-foreground">{st.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
