'use strict';

/**
 * lib/proto/faculty.js — the Faculty CLASS (the catalog's first reification).
 *
 * Until now the 40 base faculties were plain object literals and nothing
 * anywhere constructed or validated a Faculty — the class was `procedural`.
 * This module is the conversion recipe every catalog class follows
 * (ADR 0014): the constructor validates the raw data against the LAYER A
 * ontology (`@mach33/core`), whose `mach33:Faculty` definition is GENERATED
 * from the catalog entry's schema (classes.defineInto — one binding
 * mechanism, no third class system). Violations follow the OEP: recorded
 * loud and construction FAILS — a mis-declared faculty in an instance's
 * `self` dies at boot, not silently in a panel.
 *
 * Instances are frozen (the kernel law extends to objects: base faculties
 * are invariant). Extra fields beyond the schema are permitted (open-world:
 * projections and instances may enrich); missing REQUIRED fields are not.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0021 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
// Layer A binding comes from the SHARED singleton (classes.ontology()) —
// one bound ontology per process, generated from the catalog's schemas.
class Faculty {
  /**
   * @param {object} raw — { id, name, what, parent?, state?, store?, roles? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Faculty' }, raw));
    if (violations.length) {
      throw new Error('[proto:faculty] OEP violations for "' + (raw.id || '?') + '": ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** A root faculty has no parent; sub-faculties point at a root id. */
  isRoot() { return !this.parent; }

  /** This faculty's sub-faculties within a composed roster. */
  subsOf(all) {
    const id = this.id;
    return (all || []).filter(function (f) { return f.parent === id; });
  }

  /** The tree path label: "root ▸ sub" (or just the id for roots). */
  path(all) {
    if (this.isRoot()) return this.id;
    const parent = (all || []).filter(function (f) { return f.id === this.parent; }, this)[0];
    return (parent ? parent.id : this.parent) + ' ▸ ' + this.id;
  }
}

module.exports = Faculty;
