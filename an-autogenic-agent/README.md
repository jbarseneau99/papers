# An Autogenic Agent — replication package

J. B. Arseneau, Mach33 Group.
Submitted to IEEE International Conference on Agents (ICA) 2026,
Kumamoto, Japan, December 14–17, 2026.

## Contents

- `paper.pdf` — the built paper (6 pages, IEEEtran two-column, 10pt).
- `paper.tex` — LaTeX source.
- `paper.md` — Markdown mirror (Newton Light editor source of truth).
- `paper.ast.json` — canonical AST.
- `refs.bib` — bibliography.
- `figures/` — figure PDFs and SVGs.
- `ontology/` — HEAD snapshot of `lib/proto/classes.js` + class modules
  and `ontology-summary.json` (§II.B).
- `migrations/` — `0078_epistemic_graph.sql` (`claim_type`) and
  `0096_entity_ontology.sql` (`entities.type`) (§II.B).
- `instrumentation/` — `M33-VEGA-INST-001` SHA-256 JSONL chain +
  `verify-chain.js` (§III.E). This export’s first record is 2026-08-08.
- `coherence-check-spec/` — design-only predicate and event kinds
  (§III.E, §IV.D); stream not populated.
- `fdd-records/` — production `vega-pg` export for 9 May–8 June 2026
  (§IV.B). 177 filed / 159 shipped by `proposed_by` (144 vega / 15 user /
  0 team). Table I’s 118/39/2 does not recompute; 159 shipped does.

Vega and Boole themselves (the runtime platform and coding agent) remain
proprietary. The replication package releases the artifacts that let a
reader verify the claims in the paper against declared structure,
without releasing the runtime.

## Citation

    J. B. Arseneau, "An Autogenic Agent," in Proc. IEEE Int. Conf. on
    Agents (ICA), Kumamoto, Japan, 2026.

## Contact

brant.arseneau@33fg.com
