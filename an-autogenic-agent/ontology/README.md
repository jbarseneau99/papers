# Ontology catalog snapshot

Verifies **§II.B** (closed class catalog, state ladder `planned → procedural → instance`, machine schemas). Also supports the catalog-size claims in §II.

## Provenance

- Source tree: `mach33-platform` at commit `1ac5daffd122bd29cce44d457d4b0a44f1b3292d` (2026-09-10).
- Catalog: `lib/proto/classes.js`
- Class modules: every `lib/proto/*.js` whose house header declares `Contents: class definition` (plus `classes.js` itself).

This is a **HEAD snapshot of the live catalog**, not a May–June 2026 freeze. The catalog file did not exist until 2026-07-06 (`3dca6c0f`). Counts here (107 declared / 105 with machine schema / 106 `instance` / 1 `procedural`) must not be read as the paper window’s opening census.

## Files

- `ontology-summary.json` — `{class_name, class_id, discipline, discipline_public_name, has_machine_schema, state}` per class, plus `state_counts`.
- `lib/proto/classes.js` — catalog + `DISCIPLINES` + `STATES`.
- `lib/proto/*.js` — class constructors that validate against the catalog schema.

## How to recompute the summary

From a checkout of `mach33-platform` at the same commit:

```js
const c = require('./lib/proto/classes');
c.BASE_CLASSES.map(x => ({
  class_name: x.name,
  discipline: x.discipline,
  has_machine_schema: !!(x.schema && Object.keys(x.schema).length),
  state: x.state
}));
```

Live public discipline names (not the paper’s Anatomy/Authorship synonyms): Mind, Body, Functioning, Relations, Growth, Knowledge, Work Product, Meta.
