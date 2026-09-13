'use strict';

/**
 * lib/proto/place.js — the Place CLASS (the agency layer).
 *
 * A Place is a Proto whose identity is the containment — where
 * members work; the container side of the one Composite. READ-CONSTRUCTED
 * by Proto.placeRecord() from the compositions that already run (every
 * host with composed children IS a place; the name is parameterized —
 * "MachAgency" is provisional).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0093 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Place {
  /**
   * @param {object} raw — { identity, members (string[]), commons?, belief_store? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (!Array.isArray(raw.members)) {
      throw new Error('[proto:place] members[] is the containment — required (may be empty)');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Place' }, raw));
    if (violations.length) {
      throw new Error('[proto:place] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.members) Object.freeze(this.members);
    Object.freeze(this);
  }

  holds(identity) { return this.members.indexOf(identity) >= 0; }
  label() { return this.identity + ' \u25c6 holds ' + this.members.length + (this.commons ? ' \u00b7 ' + this.commons : ''); }
}

module.exports = Place;
