# FDD / self-improvement records (production)

Verifies **§IV.B** Table I against **production** `vega-pg`
(`mach33-research-tool-460917`, database `vega`, user `vega_app`).

Earlier empty files were from **UAT** (`mach33-uat-pg` via local proxy
`:5440`), which only has rows from 2026-07-15. That was the wrong store.

## Query

```sql
-- filed in window (UTC)
SELECT proposed_by, state, COUNT(*)
FROM self_improvements
WHERE proposed_at >= TIMESTAMPTZ '2026-05-09 00:00:00Z'
  AND proposed_at <  TIMESTAMPTZ '2026-06-09 00:00:00Z'
GROUP BY 1, 2;

-- shipped in window (by proposed_at, not shipped_at)
SELECT proposed_by, COUNT(*)
FROM self_improvements
WHERE proposed_at >= TIMESTAMPTZ '2026-05-09 00:00:00Z'
  AND proposed_at <  TIMESTAMPTZ '2026-06-09 00:00:00Z'
  AND state = 'shipped'
GROUP BY 1;
```

`schema_migrations`: `0012_self_improvements.sql` applied **2026-05-09 04:48Z**
(same morning as the first Finding). No `DROP`/`TRUNCATE` of this table
exists in `db/migrations/`.

## What a reviewer can recompute

| | Paper Table I | This export (`proposed_by`) |
| --- | ---: | ---: |
| Filed in window | 171 | **177** (170 if `state <> 'merged'`) |
| Shipped | **159** | **159** |
| vega | 118 | **144** shipped / 161 filed |
| user | 39 | **15** shipped / 16 filed |
| team | 2 | **0** in window (6 all-time) |

**159 shipped is real and matches.** 118 / 39 / 2 **does not** fall out of
`proposed_by` on this table. Nearest accidental neighbour: 119
vega-authored shipped rows with **no** `fix_proposals` row (not an
enum; a join). Do not treat that as Table I.

`close_path` is **not a column** (see `export-meta.json`).
`associated_fix_proposal_id` is a **join** (`fix_proposals.finding_id`),
included when a proposal exists.

Redaction: `title`, `body`, `user_note`, `created_by_*`, diffs, comments
omitted. Lifecycle fields kept.

## Files

- `self_improvements.jsonl` — 177 rows
- `fix_proposals.jsonl` — 62 proposals linked to those Findings
- `export-meta.json` — counts and the Table I mismatch
