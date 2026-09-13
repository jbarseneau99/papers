# M33-VEGA-INST-001 chain

Verifies **§III.E** / `#sec:measurement`: the productivity-and-quality time-series recorder (`lib/vega-instrumentation.js`, `/api/instrumentation/metrics`, `/api/instrumentation/verify`). It does **not** verify the coherence-check stream (that spec is in `../coherence-check-spec/`).

## Files

- `vega-instrumentation.log.jsonl` — append-only chain, **verbatim** from the operator machine at export. Context objects were inspected; no names, emails, or chat text were present, so no redaction was applied (redaction would break the hashes).
- `verify-chain.js` — standalone `verifyChain()` matching the platform algorithm.

## Chain format

One JSON object per line:

```json
{
  "seq": 1,
  "ts": "2026-08-08T13:48:24.860Z",
  "category": "productivity",
  "metric": "throughput_per_hour",
  "value": 0,
  "unit": "items/h",
  "context": {},
  "prev_hash": "0000…0",
  "hash": "<sha256 hex>"
}
```

- `seq` is 1-based and must be consecutive.
- Genesis `prev_hash` is 64 ASCII zeros.
- `hash = SHA-256( prev_hash + "|" + JSON.stringify({seq, ts, category, metric, value, unit, context}) )`
- The next record’s `prev_hash` equals this record’s `hash`.

Categories in the source module: `productivity`, `autogenic`, `code_quality` (twelve metrics). This file’s occupied series are listed below.

## This file’s coverage (honest bounds)

| | |
| --- | --- |
| records | 5699 |
| `verifyChain()` | `{ ok: true, count: 5699 }` at export |
| first_ts | 2026-08-08T13:48:24.860Z |
| last_ts | 2026-09-13T14:27:48.995Z |

**9 May–8 June 2026 window: zero records.** The paper’s claim that INST-001 populated ~15 days of that window is **not** supported by this chain. Do not cite this file as May–June evidence.

Occupied metrics in this export: `productivity.throughput_per_hour` (4965), `productivity.commits_landed` (363), `code_quality.lint_errors` (363), `productivity.findings_filed` (4), `autogenic.self_findings_ratio` (4).

## How to verify

```bash
node verify-chain.js vega-instrumentation.log.jsonl
# exit 0 and {"ok": true, "count": 5699, "head": "7bd39b0e…"}
```

On the live platform the same function is `require('./lib/vega-instrumentation').verifyChain({ logPath })` and `GET /api/instrumentation/verify`.
