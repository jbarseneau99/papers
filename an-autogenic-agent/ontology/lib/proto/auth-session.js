'use strict';

/**
 * lib/proto/auth-session.js — the AuthSession CLASS (the Boundary wave).
 *
 * An AuthSession is a login — distinct from the epistemic Session
 * (a working session) by design. The token is stored HASHED only; the class
 * refuses a raw-looking token so a secret can never reach the row.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0063 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class AuthSession {
  /**
   * @param {object} raw — { user, token_hash, expires_at, user_agent?, ip? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.token_hash != null && String(raw.token_hash).length < 32) {
      throw new Error('[proto:auth-session] token_hash must be a hash, never a raw token');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:AuthSession' }, raw));
    if (violations.length) {
      throw new Error('[proto:auth-session] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return 'login ' + this.user + ' until ' + this.expires_at; }
}

module.exports = AuthSession;
