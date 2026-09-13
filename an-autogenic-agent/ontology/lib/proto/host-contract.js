'use strict';

/**
 * lib/proto/host-contract.js — the HostContract CLASS (the Boundary wave).
 *
 * A HostContract is the containment contract, reified out of
 * Subagent's field — what a child may do (authority), may never do
 * (mustNot), and what wakes it (triggers). Subagent COMPOSES one; Relay's
 * is the inherited instance.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0066 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class HostContract {
  /**
   * @param {object} raw — { authority?, mustNot?, triggers?, negotiated_at? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    ['authority', 'mustNot', 'triggers'].forEach(function (k) {
      if (raw[k] != null && !Array.isArray(raw[k])) {
        throw new Error('[proto:host-contract] ' + k + ' must be an array');
      }
    });
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:HostContract' }, raw));
    if (violations.length) {
      throw new Error('[proto:host-contract] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** Whether the contract forbids an action (prose match on mustNot). */
  forbids(action) {
    return !!(Array.isArray(this.mustNot) && this.mustNot.some(function (m) {
      return String(m).toLowerCase().indexOf(String(action).toLowerCase()) >= 0;
    }));
  }
  label() {
    return 'contract: ' + (this.authority || []).length + ' granted · ' +
      (this.mustNot || []).length + ' forbidden · ' + (this.triggers || []).length + ' triggers';
  }
}

module.exports = HostContract;
