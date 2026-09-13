'use strict';

/**
 * lib/proto/life-era.js — the LifeEra CLASS (the biography tree).
 *
 * A LifeEra is a named chapter of the agent's life, composing the
 * moments (LifeEvents) that matter inside it.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0082 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class LifeEra {
  /**
   * @param {object} raw — { name, span?, events? (LifeEvent[]) }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:LifeEra' }, raw));
    if (violations.length) {
      throw new Error('[proto:life-era] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.name + (this.span ? ' (' + this.span + ')' : '') + ' \u00b7 ' + ((this.events || []).length) + ' moments'; }
}

module.exports = LifeEra;
