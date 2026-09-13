'use strict';

/**
 * lib/proto/membership.js — the Membership CLASS (the Commons, batch A).
 *
 * A Membership is belonging to a container — a channel today, a Place
 * when the agency lands (one class, two containers; ADR 0014 Tier 3).
 * Write gates: join/addMember/DM-seed in channels.js.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0048 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Membership {
  /**
   * @param {object} raw — { container, member, container_kind? ('channel' default) }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    raw = Object.assign({ container_kind: 'channel' }, raw);
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Membership' }, raw));
    if (violations.length) {
      throw new Error('[proto:membership] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.member + ' \u2208 ' + this.container_kind + ':' + this.container; }
}

module.exports = Membership;
