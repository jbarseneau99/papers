'use strict';

/**
 * lib/proto/session.js — the Session CLASS (the Boundary wave).
 *
 * A Session is a bounded working session the decomposition pipeline
 * writes into — deterministic per (user, channel) on the summon path.
 * Write-gated at the sessions-table insert (legacy daemon paths may omit
 * the user, so at least ONE of user/id must anchor the session).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0064 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Session {
  /**
   * @param {object} raw — { id?, user?, title?, channel?, opened_at?, mandate?, workspace? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.user == null && raw.id == null) {
      throw new Error('[proto:session] a session must be anchored by a user or an id');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Session' }, raw));
    if (violations.length) {
      throw new Error('[proto:session] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return (this.title || this.id || 'session') + (this.user ? ' · ' + this.user : ''); }
}

module.exports = Session;
