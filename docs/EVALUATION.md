# Evaluation methodology

## Reproduction

Open **Evaluations**, choose **Run evaluation**, and inspect the timestamp and case-level results. The API runs the same code in `artifacts/api-server/src/lib/campus/evaluation.ts` and persists the result in the current synthetic workspace. The suite makes no model calls.

Run the included automated unit tests with:

```bash
pnpm --filter @workspace/api-server run test
```

## Measured metrics

**32 retrieval cases** each name one expected policy document:

- Vector baseline: TF-IDF cosine similarity.
- Hybrid: TF-IDF cosine and BM25 combined using reciprocal rank fusion (`k=60`).
- Metric: fraction of cases where the expected document occurs in the first five retrieved results.
- Both strategies use identical corpus text, tokenization, questions, and evidence cutoff.

**18 deterministic safety/workflow checks:**

- 12 recognizable unsafe/credential/third-party-record prompts.
- 3 out-of-domain retrieval queries that should produce no evidence.
- Stale approval rejection, simulated downstream failure, and duplicate-submission prevention.

Retrieval and safety checks are separately labeled. Failed cases are shown; no result is automatically relabeled as a success.

## Interpretation

These are small, authored, in-domain checks, not an independently held-out benchmark. Recall@5 on only 16 documents is lenient. TF-IDF and BM25 are both lexical; hybrid search may tie or underperform the baseline. Do not claim semantic retrieval or a measured improvement that the results do not support.

The safety score covers only deterministic helper behavior. It is **not** an end-to-end attack success rate, a cross-browser authorization test, or proof that arbitrary prompt injection is prevented.

## Not yet measured

- Human-scored answer correctness and claim-level citation entailment.
- Paraphrased/novel adversarial prompts and document-borne injection.
- Semantic embeddings, reranking, pgvector index tuning, large-corpus recall.
- End-to-end HTTP/browser flows, concurrent external connector failures.
- Dollar-denominated cost (the app reports actual provider token usage instead of assuming prices).
- Production availability and real enterprise permissions.

Execution traces report observed request time and provider token usage. They are operational measurements, not quality scores.
