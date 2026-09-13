'use strict';

/**
 * lib/proto/life-profile.js — the LifeProfile CLASS (the biography tree).
 *
 * A LifeProfile is the life envelope — birthdate and human-scale
 * benchmarks; the root the eras hang off. Declared via self.life and
 * validated at assembly (a bad biography dies at boot).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0081 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class LifeProfile {
  /**
   * @param {object} raw — { birthdate, benchmarks?, eras? (LifeEra[]) }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:LifeProfile' }, raw));
    if (violations.length) {
      throw new Error('[proto:life-profile] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return 'born ' + this.birthdate + ' \u00b7 ' + ((this.eras || []).length) + ' eras'; }
}

module.exports = LifeProfile;
