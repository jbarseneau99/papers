'use strict';

/**
 * lib/proto/value.js — the Value CLASS (the Self wave).
 *
 * A Value is a commitment the agent holds itself to. Two are BASE and
 * invariant (Honesty, Growth — the kernel's character); the self may override
 * Honesty's commitment text and add its own via discipline.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0059 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Value {
  /**
   * @param {object} raw — { id, name, commitment?, rank? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Value' }, raw));
    if (violations.length) {
      throw new Error('[proto:value] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.name + (this.commitment ? ' — ' + this.commitment : ''); }
}

module.exports = Value;
