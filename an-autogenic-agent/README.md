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
- [`ontology/`](ontology/) — snapshot of the Vega ontological catalog
  referenced in §II.B: 107 declared classes / 105 with machine schema,
  full `lib/proto/*.js` tree, plus an `ontology-summary.json` with
  per-class metadata. Verifies §II.B and §II.A.
- [`migrations/`](migrations/) — enum-locking schema migrations
  0078 (`epistemic_nodes.claim_type` = nine Toulmin roles) and
  0096 (`entities.type` = nine kinds). Verifies §II.B.
- [`instrumentation/`](instrumentation/) — the `M33-VEGA-INST-001`
  chain (`vega-instrumentation.log.jsonl`, append-only,
  SHA-256-hashed), plus a `verify-chain.js` integrity checker.
  Verifies §III.E.
- [`coherence-check-spec/`](coherence-check-spec/) — design
  specification for the coherence-check event stream. Per §III.E and
  §IV.D, this stream was designed but not populated during the
  reported 9 May–8 June 2026 window; the spec is included so reviewers
  can inspect the predicate shape and intended event kinds.
- [`fdd-records/`](fdd-records/) — production `self_improvements`
  and `fix_proposals` rows for the 9 May–8 June 2026 window
  (177 + 62 rows), redacted of titles / bodies / user notes / diffs /
  comments; structural fields (`id`, `proposed_at`, `proposed_by`,
  `state`, `category`, `scope`, `shipped_at`,
  `associated_fix_proposal_id`) kept as-emitted. Reviewers can
  recompute Table I: 177 filed, 159 shipped, 144 vega, 15 user,
  0 team. Verifies §IV.B and Table I.

Vega and Boole themselves (the runtime platform and coding agent)
remain proprietary. The replication package releases the artifacts
that let a reader verify the claims in the paper against declared
structure, without releasing the runtime.

## Citation

    J. B. Arseneau, "An Autogenic Agent," in Proc. IEEE Int. Conf. on
    Agents (ICA), Kumamoto, Japan, 2026.

## Contact

brant.arseneau@33fg.com
