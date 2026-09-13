'use strict';

/**
 * lib/proto/trait.js — the Trait CLASS (the Self wave).
 *
 * A Trait is a stable disposition of the personality — the broad,
 * decontextualized manner the agent comes across in (tone, length, stance,
 * directness). Declared by the self's voice block and validated at assembly;
 * the house directness default is always present.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0058 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Trait {
  /**
   * @param {object} raw — { id, name, expression?, value? (0..1) }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.value != null && !(typeof raw.value === 'number' && raw.value >= 0 && raw.value <= 1)) {
      throw new Error('[proto:trait] value must be 0..1 when present');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Trait' }, raw));
    if (violations.length) {
      throw new Error('[proto:trait] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.name + (this.expression ? ' — ' + this.expression : ''); }
}

module.exports = Trait;
