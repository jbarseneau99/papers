'use strict';

/**
 * lib/proto/vital.js — the Vital CLASS (the anchor promotions).
 *
 * A Vital is one of the agent's health metrics — the signals every
 * agent can be measured by (Pulse, Cycle Time, Iterations, Success Rate,
 * Growth are the inherited five). Promoted from an ANCHOR to a class, the
 * Faculty precedent; instrumentation wires the values per agent.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0071 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Vital {
  /**
   * @param {object} raw — { id, name, what?, state?, value? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Vital' }, raw));
    if (violations.length) {
      throw new Error('[proto:vital] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  isLive() { return this.state === 'live'; }
  label() { return this.name + (this.state ? ' (' + this.state + ')' : ''); }
}

module.exports = Vital;
