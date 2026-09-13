'use strict';

/**
 * lib/proto/presence.js — the Presence CLASS (the Commons, batch B).
 *
 * A Presence is a heartbeat — who is here now. Rows roll into
 * online/idle/offline by last_seen_at recency (a DERIVED state, computed at
 * read; the class carries the beat). Write gate: presence._pgWritePresence,
 * which stays fire-and-forget (a WS heartbeat must never throw).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0051 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Presence {
  /**
   * @param {object} raw — { user, display_name?, session?, instance? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Presence' }, raw));
    if (violations.length) {
      throw new Error('[proto:presence] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.user + (this.session ? ' @ ' + this.session : ''); }

  /** The awareness line — who is present now, projected into the prompt head. */
  line() { return 'present: ' + (this.display_name || this.user) + (this.session ? ' (session ' + String(this.session).slice(0, 8) + ')' : ''); }
}

module.exports = Presence;
