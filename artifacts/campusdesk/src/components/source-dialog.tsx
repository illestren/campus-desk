import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export interface SourceDoc { title: string; section: string; content: string; meta?: string }

export function SourceDialog({ doc, onClose }: { doc: SourceDoc | null; onClose: () => void }) {
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto bg-card">
        {doc && (
          <>
            <DialogHeader>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{doc.section} · Fictional policy</p>
              <DialogTitle className="font-display text-3xl text-primary">{doc.title}</DialogTitle>
              {doc.meta && <DialogDescription>{doc.meta}</DialogDescription>}
            </DialogHeader>
            <article className="whitespace-pre-wrap border-l-2 border-accent pl-5 text-[15px] leading-7" data-testid="text-source-content">{doc.content}</article>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
