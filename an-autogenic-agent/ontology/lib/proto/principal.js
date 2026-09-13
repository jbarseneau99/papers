'use strict';

/**
 * lib/proto/principal.js — the Principal CLASS (the Boundary wave).
 *
 * A Principal is a human identity — orthogonal to agent identity
 * (the Relation ⇢ Principal boundary). Write-gated at BOTH users-table
 * writers (the seed admin and the admin create route): one class, both.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0062 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Principal {
  /**
   * @param {object} raw — { email, name, provider?, role?, permissions? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.entityId != null && !require('./entity').UUID.test(String(raw.entityId))) {
      throw new Error('[proto:principal] entityId must be a UUID');
    }
    if (raw.role != null && ['user', 'admin'].indexOf(raw.role) < 0) {
      throw new Error('[proto:principal] role must be one of user | admin');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Principal' }, raw));
    if (violations.length) {
      throw new Error('[proto:principal] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  isAdmin() { return this.role === 'admin'; }
  label() { return this.name + ' <' + this.email + '>' + (this.role ? ' (' + this.role + ')' : ''); }
}

module.exports = Principal;
