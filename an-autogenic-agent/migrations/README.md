# Enum-locking migrations

Verifies **§II.B**, the paragraph that states:

> For concreteness: `entities.type` takes exactly nine values, locked by
> migration `0096`. `epistemic_nodes.claim_type` takes exactly nine (the
> Toulmin roles), locked by migration `0078`. There is no free-form
> *capability* category …

## Files

| File | Paper claim |
| --- | --- |
| `0078_epistemic_graph.sql` | `epistemic_nodes.claim_type` CHECK: `root`, `ground`, `warrant`, `backing`, `contention`, `rebuttal`, `qualifier`, `inference`, `bridge` (nine Toulmin roles). Same file also CHECK-locks `maturity` to `detected`, `under_evaluation`, `weighed`, `decayed`. |
| `0096_entity_ontology.sql` | `entities.type` CHECK: `organization`, `product`, `person`, `technology`, `location`, `event`, `instrument`, `metric`, `regulation` (nine). |

These are **Postgres CHECK constraints** on `INSERT`/`UPDATE`, not application-only lists. They are not the class-catalog state ladder (that lives in `lib/proto/classes.js` `STATES`, shipped under `ontology/`).

## Note on neighbouring enums

`belief_edges.kind` is a different table and a different lock (migration `0185`, twenty-three kinds). `semantic_edges.kind` is unconstrained TEXT. Do not cite 0078/0096 for those.
