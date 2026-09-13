'use strict';

/**
 * lib/proto/telemetry-event.js — the TelemetryEvent CLASS (the replay log).
 *
 * A TelemetryEvent is one row of the replay log — everything the
 * agent does, in one shape. NOT a fourth ledger: the rows are PROJECTED
 * from the ledgers that already exist (affects, transitions, decisions,
 * relation memories) at read — grown instances constructing through the
 * class as the store is read (the recipe's objects phase).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0074 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class TelemetryEvent {
  /**
   * @param {object} raw — { at, kind, actor?, payload? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (!String(raw.kind || '').trim()) {
      throw new Error('[proto:telemetry-event] kind must be non-empty');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:TelemetryEvent' }, raw));
    if (violations.length) {
      throw new Error('[proto:telemetry-event] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.kind + ' @ ' + this.at + (this.actor ? ' (' + this.actor + ')' : ''); }
}

module.exports = TelemetryEvent;
