'use strict';

/**
 * lib/proto/summon.js — the Summon CLASS (the Commons, batch B).
 *
 * A Summon is an @agent invocation in a channel — GROWN and ephemeral
 * (the Register precedent): constructed per invocation at runSummon with the
 * deterministic per-(user, channel) session.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0052 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Summon {
  /**
   * @param {object} raw — { user, agent, channel, session, handle?, thread? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Summon' }, raw));
    if (violations.length) {
      throw new Error('[proto:summon] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return '@' + this.agent + ' by ' + this.user + ' in ' + this.channel; }
}

module.exports = Summon;
