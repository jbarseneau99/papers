# FDD / self-improvement records

Verifies **§IV.B** (Table I: shipped Findings by `proposed_by`, 9 May–8 June 2026; 118 / 39 / 2). The paper also cites per-Finding fields `proposed_at`, `state`, `close_path`.

## Window queried

`proposed_at >= 2026-05-09` and `proposed_at < 2026-06-09` (inclusive of 8 June calendar day).

## Result of this export

**Zero rows.** `self_improvements.jsonl` and `fix_proposals.jsonl` are empty on purpose.

The Postgres instance reachable for this drop contains:

- `self_improvements`: n=29, `proposed_at` from **2026-07-15** to **2026-09-09**
- `fix_proposals`: n=0

Table I’s 118 / 39 / 2 (159 shipped / 171 filed) **cannot be recomputed from this artifact**. The May–June ledger the paper reports is not in the operator-reachable store used here (likely a later UAT/prod split, or a store that predates this clone’s database). Reviewers should treat Table I as unreplicated until that historical store is attached.

## Schema vs paper fields

Emitted columns **when rows exist** (none here), after redaction of `title`, `body`, `user_note`, diffs, and comments:

| Field | Source | Notes |
| --- | --- | --- |
| `id` | `self_improvements.id` | UUID |
| `proposed_by` | `self_improvements.proposed_by` | CHECK `vega \| user \| team` — not an email |
| `proposed_at` | `self_improvements.proposed_at` | |
| `state` | `self_improvements.state` | `proposed → accepted → in_progress → shipped` (plus `rejected`, `deferred`, `needs_external_dev`) |
| `shipped_at` | `self_improvements.shipped_at` | |
| `associated_fix_proposal_id` | `fix_proposals.id` | join on `finding_id` |
| `close_path` | — | **Not a column** on `self_improvements` in this schema. Paper name; do not invent values. |

Human gates remain: accept is a PATCH; apply is `POST /api/coding/proposals/:id/approve` then `/apply` or `/apply-and-deploy`. Fully autonomous closes are zero by construction (see FDD lifecycle, not this empty file).
