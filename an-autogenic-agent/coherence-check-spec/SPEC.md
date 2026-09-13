# Coherence-check event stream — design (unpopulated)

Paper references: §III.E (`#sec:measurement`, “separate designed instrument”) and the Results / Threats restatement that the stream was not populated over 9 May–8 June 2026. Specification gaming detection (§ Results) is defined against this stream and is likewise future work.

## What a check is

The paper’s definition, kept here as the predicate:

> A coherence check is the evaluation of a declared constraint against
> the current state of the ontology and the current telemetry stream.
> It is a boolean predicate the schema carries as a `CHECK` or
> foreign-key constraint, or a query the ontology tables can evaluate.
> The predicate returns *holds* or *fails* with a pointer to the
> specific instance that produced the failure.

It is **not** the Organize-tab LLM reorder helper (`lib/drafts/organize-check.js`). It is **not** INST-001 (`lib/vega-instrumentation.js`).

## Three edges (the triad)

Each evaluation names exactly one edge:

| `edge` | Question | Familiar analogue |
| --- | --- | --- |
| `requirement_code` | Does the implementation still satisfy the declared requirement / class schema? | spec vs diff |
| `code_telemetry` | Did observed behaviour match what the code was written to do? | test suite |
| `requirement_telemetry` | Did what happened match what was asked for, independent of how the code got there? | the edge specification-gaming hides on |

Specification gaming, as defined in the paper, is: **fail `requirement_telemetry` without a matching fail `code_telemetry` on the same `transition_id`.**

## Predicate record (intended row)

One JSON object per evaluation. No PII; identifiers are UUIDs / class iri / constraint names.

```json
{
  "kind": "coherence.check.evaluated",
  "ts": "2026-06-01T12:00:00.000Z",
  "transition_id": "<uuid of the FDD or Finding state change that triggered the check>",
  "edge": "requirement_code | code_telemetry | requirement_telemetry",
  "constraint": {
    "id": "<stable name, e.g. epistemic-node.anti-minting>",
    "source": "schema_check | foreign_key | ontology_query | catalog_state"
  },
  "subject": {
    "class_id": "epistemic-node",
    "instance_id": "<uuid or null if the check is catalog-level>"
  },
  "result": "holds | fails",
  "fail_pointer": null
}
```

When `result` is `fails`, `fail_pointer` names the instance (table, id, field) that violated the constraint. When `holds`, `fail_pointer` is `null`.

## Intended event kinds (not in the live catalog)

Designed names, lowercase dotted, to match Vega’s event grammar (`<namespace>.<resource>.<verb>`):

| Kind | When |
| --- | --- |
| `coherence.check.evaluated` | every run of a named constraint after a state-changing action |
| `coherence.check.holds` | `result=holds` (may be omitted if the evaluated event already carries result) |
| `coherence.check.fails` | `result=fails`; payload includes `fail_pointer` |
| `coherence.gaming.suspected` | paired fail on `requirement_telemetry` with hold on `code_telemetry` for the same `transition_id` |

None of these kinds are registered in `lib/vega-events/catalog.js` as of source commit `1ac5daff`. Unknown kinds are rejected at publish time. Emitting this stream therefore requires a catalog addition **before** any `events.publish` call. That addition had not shipped in the reported window; the paper’s holds/fails counts are therefore not computable.

## Trigger

The paper states that Boole’s loop “consumes both the tool result and the coherence check that fires after every state-changing action.” Intended triggers (design, not coded):

1. Finding stage advance (`advanceFinding` / `self_improvements.state` change).
2. Fix-proposal stage change (`fix_proposals.state`: approved, applied, verified, rolled_back).
3. Catalog or enum migration apply (class added or CHECK widened).

On trigger, evaluate the constraints of the **touched classes** (not the agent’s own stopping criterion) and emit one `coherence.check.evaluated` per (edge, constraint).

## What shipped instead

`M33-VEGA-INST-001` writes productivity / autogenic / code-quality **numeric** samples to a SHA-256 JSONL chain. See `../instrumentation/`. Its `verifyChain()` result `{ok}` is tamper-evidence of that log, not a triad holds/fails verdict.
