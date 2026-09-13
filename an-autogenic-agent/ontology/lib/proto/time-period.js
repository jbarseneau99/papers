'use strict';

/**
 * lib/proto/time-period.js — the TimePeriod CLASS (the memory shells).
 *
 * A TimePeriod is a lived span — the seven concentric shells of episodic
 * memory (Life → Now) are the inherited instances, constructed through
 * the class inside MemorySystem. kind names the span (Life, Year, …),
 * span its grain (lifetime, months, …), mode how it is held (summary vs
 * full detail). label/grain stay as aliases for the panel projections.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0076 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class TimePeriod {
  /**
   * @param {object} raw — { kind, span, mode?, summary?, label?, grain? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:TimePeriod' }, raw));
    if (violations.length) {
      throw new Error('[proto:time-period] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label2() { return this.kind + ' (' + this.span + ')' + (this.mode ? ' — ' + this.mode : ''); }

  /** The awareness line — the shell and its summary, projected into the prompt head. */
  line() { return this.kind + (this.span ? ' (' + this.span + ')' : '') + (this.summary ? ' — ' + String(this.summary).slice(0, 70) : ''); }
}

module.exports = TimePeriod;
