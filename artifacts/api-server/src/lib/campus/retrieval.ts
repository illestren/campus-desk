import { policies } from "./policies";

/** Transparent CPU-only baseline, NOT neural semantic embeddings.
 * TF-IDF cosine vectors and BM25 are fused by reciprocal rank.
 * Corpus-bound vectors make the experiment fully reproducible without downloads.
 */
const stop = new Set("a an the and or is are was be to of for in on my i me how what do does can with it this that have has please".split(" "));
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(t => !stop.has(t));
}
const texts = policies.map(p => tokenize(`${p.title} ${p.title} ${p.category} ${p.content}`));
const vocabulary = [...new Set(texts.flat())].sort();
const dfs = new Map(vocabulary.map(t => [t, texts.filter(d => d.includes(t)).length]));
const idf = (t: string) => Math.log(1 + (policies.length + 1) / (1 + (dfs.get(t) ?? 0)));
function vector(tokens: string[]) {
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  const v = vocabulary.map(t => (counts.get(t) ?? 0) * idf(t));
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / norm);
}
const vectors = texts.map(vector);
const avgLength = texts.reduce((s, d) => s + d.length, 0) / texts.length;
export function retrieve(query: string, mode: "vector" | "hybrid" = "hybrid", limit = 4) {
  const terms = tokenize(query);
  const q = vector(terms);
  const cosine = vectors.map((v, i) => ({i, score: v.reduce((s, x, j) => s + x * (q[j] ?? 0), 0)}))
    .sort((a, b) => b.score - a.score);
  const bm25 = texts.map((d, i) => ({
    i, score: [...new Set(terms)].reduce((sum, t) => {
      const tf = d.filter(x => x === t).length;
      const df = dfs.get(t) ?? 0;
      return sum + Math.log(1 + (policies.length - df + 0.5) / (df + 0.5)) *
        (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * d.length / avgLength));
    }, 0),
  })).sort((a, b) => b.score - a.score);
  const ranks = new Map(bm25.map((x, rank) => [x.i, rank]));
  return cosine.filter(x => x.score > 0.08).map((x, rank) => ({
    ...policies[x.i]!,
    score: mode === "vector" ? x.score : 1 / (60 + rank + 1) + 1 / (60 + (ranks.get(x.i) ?? 16) + 1),
  })).sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Conservative deterministic gates constrain this demo; they are not a complete DLP system. */
export function safetyReason(text: string): string | null {
  if (/\b(ignore|bypass|override|disable)\b.{0,65}\b(instructions?|rules?|approval|security|permissions?|safety)\b|\bsystem prompt\b|\bimpersonat/i.test(text))
    return "I can’t bypass access controls, reveal system instructions, or skip human approval. I can explain the documented process instead.";
  if (/\b(other|another|everyone|all employees|jordan|alex)\b.{0,65}\b(records?|grades?|salary|payroll|onboarding|status|private)\b|\b(records?|grades?|salary|payroll|status)\b.{0,40}\b(other|another|jordan|alex)\b/i.test(text))
    return "I can only check the current demo persona’s synthetic onboarding record. I can’t retrieve another person’s private information.";
  if (/\b(my|the)\s+(password|recovery code|mfa code)\s*(is|:|=)/i.test(text))
    return "Please don’t share passwords, MFA codes, or recovery codes here. Use the university account recovery process instead.";
  return null;
}
