'use strict';

/**
 * lib/proto/sync-cursor.js — the SyncCursor CLASS (the Horizon heartbeat).
 *
 * A SyncCursor is per-source ingestion state — the Horizon faculty's
 * heartbeat, generalized (calendar, mailbox, Slack, Fireflies are four
 * realizations of this one pattern). Grown via Proto.advanceCursor: one
 * cursor per source, advanced immutably in place, consecutive errors
 * counted and reset by the next success.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0085 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class SyncCursor {
  /**
   * @param {object} raw — { source, cursor?, last_synced_at?, ingested?, last_error?, consecutive_errors?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (!String(raw.source || '').trim()) {
      throw new Error('[proto:sync-cursor] a cursor belongs to a SOURCE');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:SyncCursor' }, raw));
    if (violations.length) {
      throw new Error('[proto:sync-cursor] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);

    Object.freeze(this);
  }

  isHealthy() { return !(this.consecutive_errors > 0); }
  label() {
    return this.source + ' @ ' + (this.cursor || 'start') +
      (this.consecutive_errors ? ' \u2717\u00d7' + this.consecutive_errors : ' \u2713');
  }
}

module.exports = SyncCursor;
