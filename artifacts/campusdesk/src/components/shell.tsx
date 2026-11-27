import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSession, useSwitchPersona } from "@workspace/api-client-react";
import { MessageSquareText, Library, Ticket, Activity, FlaskConical, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Assistant", icon: MessageSquareText },
  { href: "/knowledge", label: "Knowledge", icon: Library },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/observability", label: "Observability", icon: Activity },
  { href: "/evaluations", label: "Evaluations", icon: FlaskConical },
];

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const qc = useQueryClient();
  const { data: s } = useGetSession();
  const sw = useSwitchPersona({ mutation: { onSuccess: () => { qc.resetQueries(); } } });

  const persona = (
    <div className="rounded-xl bg-sidebar-accent p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-sidebar-foreground/60">Demo persona (not a login)</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-sidebar-primary font-semibold text-sidebar-primary-foreground" data-testid="text-initials">{s?.initials ?? ".."}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" data-testid="text-persona-name">{s?.name ?? "Loading"}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">{s ? `${s.role} · ${s.department}` : ""}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-sidebar p-1">
        {(["alex", "jordan"] as const).map((p) => (
          <button key={p} disabled={sw.isPending} onClick={() => s?.persona !== p && sw.mutate({ data: { persona: p } })}
            className={cn("rounded-md py-1 text-xs font-semibold capitalize transition-colors", s?.persona === p ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground")}
            data-testid={`button-persona-${p}`}>{p}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground md:sticky md:top-0 md:h-[100dvh] md:w-64 md:p-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-1" data-testid="link-home">
            <span className="font-display text-2xl font-semibold">CampusDesk</span>
            <span className="font-mono text-xs text-sidebar-primary">AI</span>
          </Link>
          <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] uppercase", s?.aiAvailable ? "bg-emerald-400/15 text-emerald-300" : "bg-sidebar-primary/20 text-sidebar-primary")} data-testid="status-ai">
            {s ? (s.aiAvailable ? "LLM on" : "Extractive") : "..."}
          </span>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto md:mx-0 md:flex-col">
          {NAV.map(({ href, label, icon: I }) => {
            const on = href === "/" ? loc === "/" : loc.startsWith(href);
            return (
              <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`}
                className={cn("flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", on ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground")}>
                <I className="h-4 w-4" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:mt-auto md:block">{persona}</div>
        <div className="md:hidden">{persona}</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2 border-b border-accent/30 bg-accent/10 px-5 py-2 text-xs text-foreground/80" data-testid="text-disclaimer">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span><strong className="font-semibold">Portfolio demo.</strong> {s?.disclaimer ?? "All people, policies, and tickets are fictional."} Persona switching is a demo toggle, not authentication.</span>
        </div>
        <main className="flex-1 px-5 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
