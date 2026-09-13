'use strict';

/**
 * lib/proto/bound-ir.js — the BoundIR CLASS (the documents workspace).
 *
 * A BoundIR is the spine binding claims ↔ structure ↔ prose with
 * stable node ids — READ-CONSTRUCTED from a draft: sections from its AST,
 * claimIds harvested from [[claim:id]] tokens per section, references
 * from [@key] tokens. Cross-view editing rides these ids.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0092 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class BoundIR {
  /**
   * @param {object} raw — { paper, nodes (id, kind, claimIds[]), references?, counts? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (!Array.isArray(raw.nodes)) {
      throw new Error('[proto:bound-ir] nodes[] is the spine — required');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:BoundIR' }, raw));
    if (violations.length) {
      throw new Error('[proto:bound-ir] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.nodes) { this.nodes.forEach(Object.freeze); Object.freeze(this.nodes); }
    if (this.references) Object.freeze(this.references);
    Object.freeze(this);
  }

  label() { return this.paper + ': ' + this.nodes.length + ' nodes, ' + ((this.references || []).length) + ' refs'; }
}

module.exports = BoundIR;
