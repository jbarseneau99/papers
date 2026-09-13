# Paper-constraint ontology

The paper itself argues (§II.B) that structure should be declared, not left
latent. This directory applies that rule to the paper's own constraint
catalog: the rules the paper must obey are classes, and each concrete rule
is an instance validated against its class schema.

Same shape as Vega's `lib/proto/*.js` catalog: one `.js` per class,
`fields[]` + `enums{}` + a synchronous `validate()`. Instances are one row
per line of JSONL. Widening any enum requires a code change to the class
file — same discipline as the enum-lock migrations in
`../../migrations/` for Vega's core catalog.

## Classes (5)

| Class                | Extends           | Fields validated at construction |
|----------------------|-------------------|----------------------------------|
| PaperConstraint      | —                 | id, discipline, subclass, rule_text, source, severity, status, kind, verifier?, section?, added_at?, updated_at? |
| CompositionRule      | PaperConstraint   | + category ∈ COMPOSITION_CATEGORIES |
| MunichCriticism      | PaperConstraint   | id must match `^C\d+$`; merge_status ∈ MUNICH_STATES |
| MergeItem            | PaperConstraint   | id must match `^N\d+$` |
| AutomaticCheck       | PaperConstraint   | verifier ∈ CHECK_VERIFIERS; limit numeric |

## Instances (111 total)

| File                        | Class            | Instances |
|-----------------------------|------------------|----------:|
| `instances/composition-rules.jsonl`   | CompositionRule  | 80 |
| `instances/munich-criticisms.jsonl`   | MunichCriticism  | 19 |
| `instances/merge-items.jsonl`         | MergeItem        |  5 |
| `instances/automatic-checks.jsonl`    | AutomaticCheck   |  7 |

## Enum-locked vocabularies (paper §II.B claim, applied to this catalog)

- **SEVERITIES**: `P1`, `P2`, `P3`, `info`
- **STATUSES**: `open`, `closed`, `dissolved`, `blocked`, `na`, `resolved`
- **KINDS**: `Do`, `Don't`
- **DISCIPLINES**: the 8 discipline packages from §II.B
- **CHECK_VERIFIERS**: `verify_pdf`, `checkVoiceCompliance`,
  `getAbstractWordCount`, `getPageCount`, `list_bib.uncited`,
  `list_bib.cited`

## How Newton uses this

Newton reads `instances/*.jsonl`, re-validates each row against the class
at load time, and renders the results in its right-hand constraint panel.
The same store is exposed via two verbs, so any MCP consumer can query it:

- `GET /api/constraints`         → all 111 instances
- `GET /api/constraints/classes` → the 5 classes with fields + enums

## Paper section this artifact verifies

**§II.B (Ontology as declaration)** and the paper's own thesis: the
constraint database is not a markdown table the reader must parse. It is
declared structure, validated at construction, enum-locked, and its own
schema is queryable.
