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
- `ontology/` — snapshot of the Vega ontological catalog referenced in §II.
  (uploaded on release of replication package)
- `migrations/` — enum-locking schema migrations (0078 claim_type,
  0096 entities.type) referenced in §II.B.
  (uploaded on release of replication package)
- `instrumentation/` — the `M33-VEGA-INST-001` chain (append-only,
  SHA-256-hashed JSONL).
  (uploaded on release of replication package)
- `coherence-check-spec/` — the coherence-check event-stream design
  specification referenced in §III.E as future-work instrumentation.
  (uploaded on release of replication package)

Vega and Boole themselves (the runtime platform and coding agent) remain
proprietary. The replication package releases the artifacts that let a
reader verify the claims in the paper against declared structure,
without releasing the runtime.

## Citation

    J. B. Arseneau, "An Autogenic Agent," in Proc. IEEE Int. Conf. on
    Agents (ICA), Kumamoto, Japan, 2026.

## Contact

brant.arseneau@33fg.com
