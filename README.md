# Mach33 Papers

Public replication packages for papers authored under Mach33 Group.

## Papers

- **[an-autogenic-agent/](an-autogenic-agent/)** — J. B. Arseneau, "An Autogenic Agent."
  Submitted to IEEE ICA 2026 (Kumamoto, Japan; Dec 14–17, 2026).
  See the [package README](an-autogenic-agent/README.md) for artifact contents.

## History

- **2026-09-13**: Initial commit + Vega artifact push (ontology, migrations,
  INST-001 chain, coherence-check spec, FDD records).
- **2026-09-13** (later same day): **Table I rebase.** The initial paper draft
  reported 171 filed / 118 vega / 39 user / 2 team, drawn from a working
  count. Recomputing directly against production Cloud SQL vega-pg for
  proposed_at ∈ [2026-05-09, 2026-06-09) yields 177 filed / 144 vega /
  15 user / 0 team, with 159 shipped unchanged. The paper's Table I,
  Fig. 2, abstract, and Conclusion were rebased to the recomputed
  numbers; attribution is `proposed_by` on `self_improvements`, not the
  earlier "who produced the fix" framing (that predicate yields only 15
  rows via the `fix_proposals` join). See `an-autogenic-agent/fdd-records/`
  for the data and `export-meta.json` for the accounting.
