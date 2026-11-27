import { useState } from "react";
import { TicketInputCategory, TicketInputPriority, type TicketInput } from "@workspace/api-client-react";
import { btnPrimary, field } from "./bits";

export function TicketForm({ initial, submitLabel, pending, onSubmit }: { initial?: Partial<TicketInput>; submitLabel: string; pending: boolean; onSubmit: (v: TicketInput) => void }) {
  const [v, setV] = useState<TicketInput>({
    title: initial?.title ?? "", description: initial?.description ?? "",
    category: initial?.category ?? "Onboarding", priority: initial?.priority ?? "Normal",
  });
  const ok = v.title.trim().length >= 3 && v.description.trim().length >= 10;
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (ok) onSubmit(v); }}>
      <label className="block text-sm font-medium">Title
        <input className={field + " mt-1"} maxLength={160} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} data-testid="input-ticket-title" />
      </label>
      <label className="block text-sm font-medium">Description <span className="text-xs text-muted-foreground">(min 10 characters)</span>
        <textarea rows={5} className={field + " mt-1"} maxLength={4000} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} data-testid="input-ticket-description" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">Category
          <select className={field + " mt-1"} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value as TicketInput["category"] })} data-testid="select-ticket-category">
            {Object.values(TicketInputCategory).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Priority
          <select className={field + " mt-1"} value={v.priority} onChange={(e) => setV({ ...v, priority: e.target.value as TicketInput["priority"] })} data-testid="select-ticket-priority">
            {Object.values(TicketInputPriority).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <button type="submit" disabled={!ok || pending} className={btnPrimary + " w-full"} data-testid="button-ticket-save">{pending ? "Saving..." : submitLabel}</button>
      <p className="text-xs text-muted-foreground">This only saves a draft. Nothing is submitted until you review the exact payload and approve it.</p>
    </form>
  );
}
