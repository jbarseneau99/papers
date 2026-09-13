'use strict';

/**
 * lib/proto/bus-event.js — the BusEvent CLASS (the Commons, batch B).
 *
 * A BusEvent is the Thalamus's concrete message — the compact
 * cross-instance NOTIFY (id + kind; the body is re-fetched downstream).
 * Write gate: bus.publish — an invalid event is DROPPED with a warning,
 * never thrown into the caller (transport must not take the host down).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0053 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class BusEvent {
  /**
   * @param {object} raw — { origin, kind, id?, channel_id?, message_id?, client_msg_id? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:BusEvent' }, raw));
    if (violations.length) {
      throw new Error('[proto:bus-event] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.kind + ' from ' + this.origin; }
}

module.exports = BusEvent;
