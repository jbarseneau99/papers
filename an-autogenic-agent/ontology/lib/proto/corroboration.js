'use strict';

/**
 * lib/proto/corroboration.js — the Corroboration CLASS (the agency layer).
 *
 * A Corroboration is cross-source agreement reified — two or more
 * members INDEPENDENTLY reporting one belief. The law is structural:
 * fewer than two distinct members is not corroboration. Grown via
 * Proto.corroborate.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0095 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Corroboration {
  /**
   * @param {object} raw — { method (cross_source), canonical, absorbed ({member, belief, at}[]), confidence?, at?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.method !== 'cross_source') {
      throw new Error('[proto:corroboration] method must be cross_source');
    }
    const members = {};
    (Array.isArray(raw.absorbed) ? raw.absorbed : []).forEach(function (r) { if (r && r.member) members[r.member] = true; });
    if (Object.keys(members).length < 2) {
      throw new Error('[proto:corroboration] fewer than two INDEPENDENT members is not corroboration');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Corroboration' }, raw));
    if (violations.length) {
      throw new Error('[proto:corroboration] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.absorbed) { this.absorbed.forEach(Object.freeze); Object.freeze(this.absorbed); }
    Object.freeze(this);
  }

  label() { return '\u201c' + String(this.canonical).slice(0, 50) + '\u201d \u00d7' + this.absorbed.length + ' members'; }
}

module.exports = Corroboration;
