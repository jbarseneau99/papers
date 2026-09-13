'use strict';

/**
 * lib/proto/model.js — the Model CLASS (the anchor promotions).
 *
 * A Model is one of the agent's cognition organs — the substrate
 * roster (LLM, LQM, Financial, Quantum are the inherited four; the LLM is
 * realized by Claude). Distinct from meta ModelConfig (the fleet's future
 * pricing registry) — this is anatomy, that is accounting.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0072 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Model {
  /**
   * @param {object} raw — { id, name, what?, state?, realizedBy? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Model' }, raw));
    if (violations.length) {
      throw new Error('[proto:model] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  isLive() { return this.state === 'live'; }
  label() { return this.name + (this.state === 'live' ? ' — live' : ' — planned'); }
}

module.exports = Model;
