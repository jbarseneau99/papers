'use strict';

/**
 * lib/proto/pin.js — the Pin CLASS (the Commons, batch A).
 *
 * A Pin flags a message into a channel's shared pinned list — one row per
 * message. BOUNDARY vs Reaction: a Reaction is per-(message, user, emoji)
 * and only meaningful aggregated; a Pin has no user dimension in its
 * identity (UNIQUE(message_id)) — it IS the channel's state, not a personal
 * annotation, so any member may pin or unpin regardless of who pinned it.
 * Write gate: pins.toggle.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0118 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Pin {
  /**
   * @param {object} raw — { message, channel, user }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Pin' }, raw));
    if (violations.length) {
      throw new Error('[proto:pin] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return 'pinned by ' + this.user + ' on ' + this.message; }
}

module.exports = Pin;
