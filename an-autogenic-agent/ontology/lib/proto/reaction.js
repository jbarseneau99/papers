'use strict';

/**
 * lib/proto/reaction.js — the Reaction CLASS (the Commons, batch A).
 *
 * A Reaction is an emoji toggled onto a message — one row per (message,
 * user, emoji). BOUNDARY: the curated PALETTE is a product rule enforced in
 * reactions.js BEFORE construction; the class enforces shape. Write gate:
 * reactions.toggle.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0050 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Reaction {
  /**
   * @param {object} raw — { message, channel, user, emoji }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (!String(raw.emoji || '').trim()) {
      throw new Error('[proto:reaction] emoji required');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Reaction' }, raw));
    if (violations.length) {
      throw new Error('[proto:reaction] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.emoji + ' by ' + this.user + ' on ' + this.message; }
}

module.exports = Reaction;
