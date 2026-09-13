'use strict';

/**
 * lib/proto/read-cursor.js — the ReadCursor CLASS (the Commons, batch A).
 *
 * A ReadCursor is per-user unread tracking — everything newer than the
 * cursor is unread. Write gate: markRead in channels.js.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0049 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class ReadCursor {
  /**
   * @param {object} raw — { user, channel, last_read_at? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:ReadCursor' }, raw));
    if (violations.length) {
      throw new Error('[proto:read-cursor] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.user + ' read #' + this.channel + (this.last_read_at ? ' @ ' + this.last_read_at : ''); }
}

module.exports = ReadCursor;
