'use strict';

/**
 * lib/proto/commons.js — the Commons CLASS (the agency layer).
 *
 * A Commons is what a Place holds in common — the Relay child, the
 * channels, the presence. READ-CONSTRUCTED from the running composition
 * (Relay is composed into every full agent by the base itself).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0094 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Commons {
  /**
   * @param {object} raw — { place, relay, channels?, presence? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Commons' }, raw));
    if (violations.length) {
      throw new Error('[proto:commons] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.channels) Object.freeze(this.channels);
    Object.freeze(this);
  }

  label() { return 'commons of ' + this.place + ' (relay: ' + this.relay + ')'; }
}

module.exports = Commons;
