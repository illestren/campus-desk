import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHead({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="rise mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">{kicker}</p>
        <h1 className="font-display mt-2 text-4xl font-semibold text-primary md:text-5xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function ErrorBox({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" data-testid="status-error">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 font-medium hover:bg-destructive/10" data-testid="button-retry">
        <RotateCw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  );
}

export function Empty({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="ruled flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">{icon}</div>
      <h3 className="font-display text-2xl text-primary">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, note, tone = "primary" }: { label: string; value: ReactNode; note?: string; tone?: "primary" | "accent" }) {
  return (
    <div className="rise rounded-xl border border-card-border bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={cn("font-display mt-2 text-4xl font-semibold tabular-nums", tone === "accent" ? "text-accent" : "text-primary")}>{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export const btn = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-transform active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";
export const btnPrimary = cn(btn, "bg-primary text-primary-foreground hover:bg-primary/90");
export const btnAccent = cn(btn, "bg-accent text-accent-foreground hover:bg-accent/90");
export const btnGhost = cn(btn, "border border-border bg-card hover:bg-secondary");
export const field = "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
