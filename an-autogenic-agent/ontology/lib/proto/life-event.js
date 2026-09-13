'use strict';

/**
 * lib/proto/life-event.js — the LifeEvent CLASS (the biography tree).
 *
 * A LifeEvent is a moment that matters inside an era.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0083 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class LifeEvent {
  /**
   * @param {object} raw — { at, what }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:LifeEvent' }, raw));
    if (violations.length) {
      throw new Error('[proto:life-event] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.at + ': ' + String(this.what).slice(0, 60); }
}

module.exports = LifeEvent;
