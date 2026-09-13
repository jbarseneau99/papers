'use strict';

/**
 * lib/proto/manifold-link.js — the ManifoldLink CLASS (the Ideation manifold).
 *
 * A ManifoldLink is a bridge from an idea to what it touches — the
 * generic cross-manifold join. Three ops: broadcast (idea → inquiry),
 * project (claim → idea), resolve (backlink when answered). Grown via
 * Proto.linkIdea; the idea must exist in the ledger (no bridges from
 * nowhere).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0080 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class ManifoldLink {
  /**
   * @param {object} raw — { idea, target, kind (broadcast | project | resolve), at?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (['broadcast', 'project', 'resolve'].indexOf(raw.kind) < 0) {
      throw new Error('[proto:manifold-link] kind must be one of broadcast | project | resolve');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:ManifoldLink' }, raw));
    if (violations.length) {
      throw new Error('[proto:manifold-link] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.kind + ': ' + this.idea + ' \u2192 ' + this.target; }
}

module.exports = ManifoldLink;
