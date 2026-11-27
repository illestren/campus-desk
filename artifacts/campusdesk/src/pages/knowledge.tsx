import { useEffect, useState } from "react";
import { useListPolicies, getListPoliciesQueryKey, type Policy } from "@workspace/api-client-react";
import { Search, BookMarked } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PageHead, Skel, ErrorBox, Empty, field } from "@/components/bits";
import { SourceDialog } from "@/components/source-dialog";

export default function Knowledge() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState<Policy | null>(null);
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const all = useListPolicies();
  const params = { ...(dq ? { search: dq } : {}), ...(cat ? { category: cat } : {}) };
  const res = useListPolicies(params, { query: { queryKey: getListPoliciesQueryKey(params) } });
  const cats = Array.from(new Set((all.data ?? []).map((p) => p.category))).sort();

  return (
    <div>
      <PageHead kicker="Fictional policy library" title="Knowledge">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search policies" className={field + " pl-9"} data-testid="input-search-policies" />
        </div>
      </PageHead>
      <div className="mb-6 flex flex-wrap gap-2">
        {["", ...cats].map((c) => (
          <button key={c || "all"} onClick={() => setCat(c)} data-testid={`button-category-${c || "all"}`}
            className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors", cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-accent")}>{c || "All"}</button>
        ))}
      </div>
      {res.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skel key={i} className="h-40" />)}</div>
        : res.isError ? <ErrorBox label="Could not load policies" onRetry={() => res.refetch()} />
        : !res.data?.length ? <Empty icon={<BookMarked className="h-5 w-5" />} title="Nothing on this shelf" body="No fictional policies match that search. Try a broader term or clear the category." />
        : (
          <div className="grid gap-4 md:grid-cols-2">
            {res.data.map((p, i) => (
              <button key={p.id} onClick={() => setOpen(p)} style={{ animationDelay: `${i * 40}ms` }} data-testid={`card-policy-${p.id}`}
                className="rise group rounded-xl border border-card-border bg-card p-5 text-left transition-transform hover:-translate-y-0.5 hover:border-accent">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]"><span className="text-accent">{p.category}</span><span className="text-muted-foreground">{p.readMinutes} min</span></div>
                <h3 className="font-display mt-2 text-2xl text-primary">{p.title}</h3>
                <p className="text-xs text-muted-foreground">{p.section} · updated {format(new Date(p.updatedAt), "MMM d, yyyy")}</p>
                <p className="mt-3 line-clamp-3 text-sm text-foreground/80">{p.content}</p>
                <span className="mt-3 inline-block text-xs font-semibold text-accent group-hover:underline">Read full document</span>
              </button>
            ))}
          </div>
        )}
      <SourceDialog doc={open && { title: open.title, section: `${open.category} · ${open.section}`, content: open.content, meta: `Updated ${format(new Date(open.updatedAt), "MMMM d, yyyy")} · ${open.readMinutes} min read` }} onClose={() => setOpen(null)} />
    </div>
  );
}
