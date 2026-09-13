'use strict';

/**
 * lib/proto/decision.js — the Decision CLASS (the Wave-2 unifiers).
 *
 * A Decision is a recorded choice — topic, options, the one chosen, and
 * critically the OWNER: a decision without a named chooser is not a
 * decision (the CEREMONY's law, generalized). Grown by promoteEnvelope —
 * every promotion into the belief graph is a recorded choice — into a
 * capped ledger, glass-boxed at /api/decisions/recent. Workflows pause on
 * Decisions (modeled; Boole's OperatorGate is the fleet realization).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0069 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Decision {
  /**
   * @param {object} raw — { topic, chosen, owner, options?, tradeoffs?,
   *                         decidedAt?, costOfDelay?, subject?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (!String(raw.owner || '').trim()) {
      throw new Error('[proto:decision] a decision without a named owner is not a decision');
    }
    if (raw.options != null && !Array.isArray(raw.options)) {
      throw new Error('[proto:decision] options must be an array');
    }
    if (Array.isArray(raw.options) && raw.options.length && raw.options.indexOf(raw.chosen) < 0) {
      throw new Error('[proto:decision] chosen "' + raw.chosen + '" is not among the options');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Decision' }, raw));
    if (violations.length) {
      throw new Error('[proto:decision] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.options) Object.freeze(this.options);
    Object.freeze(this);
  }

  label() {
    return this.topic + ' \u2192 ' + this.chosen + ' (by ' + this.owner + ')';
  }
}

module.exports = Decision;
