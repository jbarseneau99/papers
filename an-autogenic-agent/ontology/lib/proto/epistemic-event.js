'use strict';

/**
 * lib/proto/epistemic-event.js — the EpistemicEvent CLASS (the audit trail).
 *
 * The eighteenth conversion. Every transition in the committed graph is
 * recorded — promoted, matured, decayed — replayable, with its actor.
 * The ceremony's receipts.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0039 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

class EpistemicEvent {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:EpistemicEvent' }, raw));
    if (violations.length) {
      throw new Error('[proto:epistemic-event] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }
  label() { return this.transition + ': ' + String(this.node).slice(0, 50) + (this.actor ? ' (by ' + this.actor + ')' : ''); }
}

module.exports = EpistemicEvent;
