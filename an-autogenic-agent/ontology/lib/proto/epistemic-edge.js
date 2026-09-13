'use strict';

/**
 * lib/proto/epistemic-edge.js — the EpistemicEdge CLASS (typed belief links).
 *
 * The seventeenth conversion. A typed link in the committed graph —
 * supports, rebuts, qualifies, grounds, refines.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0038 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const TYPES = ['supports', 'rebuts', 'qualifies', 'grounds', 'refines'];

class EpistemicEdge {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:EpistemicEdge' }, raw));
    if (violations.length) {
      throw new Error('[proto:epistemic-edge] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (TYPES.indexOf(raw.type) < 0) {
      throw new Error('[proto:epistemic-edge] type must be: ' + TYPES.join('|'));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }
  label() { return this.from + ' —' + this.type + '→ ' + this.to; }
}

EpistemicEdge.TYPES = Object.freeze(TYPES);
module.exports = EpistemicEdge;
