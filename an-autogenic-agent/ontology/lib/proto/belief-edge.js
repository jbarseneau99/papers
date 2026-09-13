'use strict';

/**
 * lib/proto/belief-edge.js — the BeliefEdge CLASS (stances across the graph).
 *
 * The nineteenth conversion. A stance between beliefs — agreement,
 * contradiction, tension — the cross-graph layer over the typed edges.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0040 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

class BeliefEdge {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:BeliefEdge' }, raw));
    if (violations.length) {
      throw new Error('[proto:belief-edge] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }
  label() { return this.from + ' [' + this.stance + '] ' + this.to; }
}

module.exports = BeliefEdge;
