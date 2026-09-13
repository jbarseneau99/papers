'use strict';

/**
 * lib/proto/goal.js — the Goal CLASS (the Self wave).
 *
 * A Goal is a directed intention with a horizon, serving a drive.
 * The six BASE drives (Curiosity … Belonging) are the inherited instances —
 * the standing motivations goals derive from; the self declares its own
 * (validated at assembly, base invariant).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0060 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Goal {
  /**
   * @param {object} raw — { id, name, what?, horizon?, status?, state? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Goal' }, raw));
    if (violations.length) {
      throw new Error('[proto:goal] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.name + (this.horizon ? ' (' + this.horizon + ')' : ''); }
}

module.exports = Goal;
