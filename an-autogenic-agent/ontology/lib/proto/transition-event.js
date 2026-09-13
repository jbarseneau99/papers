'use strict';

/**
 * lib/proto/transition-event.js — the TransitionEvent CLASS (Wave 2).
 *
 * A TransitionEvent is the audit record a Lifecycle transition emits —
 * which machine, from, to, what moved (subject), who moved it, on what
 * trigger/evidence. Generalizes EpistemicEvent (the epistemic graph's own
 * audit record, reified earlier — modeled isA). Grown via
 * Proto.advanceFinding into a capped ledger, glass-boxed at
 * /api/transitions/recent.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0068 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class TransitionEvent {
  /**
   * @param {object} raw — { lifecycle, from, to, subject?, trigger?, actor?,
   *                         evidence?, at? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.from != null && raw.to != null && raw.from === raw.to) {
      throw new Error('[proto:transition-event] from and to are the same state — not a transition');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:TransitionEvent' }, raw));
    if (violations.length) {
      throw new Error('[proto:transition-event] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() {
    return this.lifecycle + ': ' + this.from + ' \u2192 ' + this.to +
      (this.subject ? ' (' + this.subject + ')' : '') + (this.actor ? ' by ' + this.actor : '');
  }
}

module.exports = TransitionEvent;
