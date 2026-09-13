'use strict';

/**
 * lib/proto/node.js — the base Node CLASS (EIR §13, OO-1 / OO-7).
 *
 * A Node is a single addressable thing in the EIR graph, carrying up to FOUR
 * optional aspects — syntactic, semantic, numerical, epistemic. Stratum is a
 * description a node CARRIES, not a branch it belongs to (OO-7): a table cell is
 * syntactically a cell, numerically a value+unit, epistemically held at κ per
 * holder — ONE node, several aspects. Each aspect is optional; a node has ≥1.
 *
 * Per OO-O3 the Syntactic aspect is a plain typed RECORD (tens of thousands of
 * these, near-zero behaviour); the Semantic / Numerical / Epistemic aspects
 * become their own classes (later phases). This base fixes only the carrier and
 * the freeze — behaviour lives on the aspect classes, not here.
 *
 * Frozen on construction: immutability is language-enforced, which is what the
 * non-destructive-consolidation laws (X4 / X5) rest on.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0115 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const STRATA = ['syntactic', 'semantic', 'numerical', 'epistemic'];

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.keys(o).forEach(function (k) { deepFreeze(o[k]); });
    Object.freeze(o);
  }
  return o;
}

// ── The class ───────────────────────────────────────────────────────────────
class Node {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Node' }, raw));
    if (violations.length) {
      throw new Error('[proto:node] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (!raw.id) throw new Error('[proto:node] a node needs an id');
    Object.assign(this, raw);
    // Freeze each present aspect record + the node itself (X4/X5).
    const self = this;
    STRATA.forEach(function (s) { if (self[s] != null) deepFreeze(self[s]); });
    Object.freeze(this);
  }

  /** Does this node carry the given stratum's aspect? */
  has(stratum) { return this[stratum] != null; }

  /** The aspect for a stratum, or null. */
  aspect(stratum) { return this[stratum] != null ? this[stratum] : null; }

  /** Which strata this node participates in (never empty for a valid node). */
  strata() { const self = this; return STRATA.filter(function (s) { return self.has(s); }); }
}

module.exports = Node;
module.exports.STRATA = STRATA;
