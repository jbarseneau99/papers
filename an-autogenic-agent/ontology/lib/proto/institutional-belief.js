'use strict';

/**
 * lib/proto/institutional-belief.js — the InstitutionalBelief CLASS (the agency layer).
 *
 * An InstitutionalBelief is agency-level belief with a grounding
 * chain back to member work — NEVER minted from nothing: the anti-minting
 * law at agency level. Construction requires the grounding chain;
 * Proto.absorbCorroboration additionally requires a named approver (the
 * agency CEREMONY — a double gate).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0096 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class InstitutionalBelief {
  /**
   * @param {object} raw — { agency, belief, grounding ({member, belief, at}[]), confidence?, approvedBy?, at?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (!Array.isArray(raw.grounding) || raw.grounding.length === 0) {
      throw new Error('[proto:institutional-belief] NEVER minted from nothing — a grounding chain back to member work is required');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:InstitutionalBelief' }, raw));
    if (violations.length) {
      throw new Error('[proto:institutional-belief] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.grounding) { this.grounding.forEach(Object.freeze); Object.freeze(this.grounding); }
    Object.freeze(this);
  }

  label() { return this.agency + ' holds: \u201c' + String(this.belief).slice(0, 50) + '\u201d (' + this.grounding.length + ' grounds)'; }
}

module.exports = InstitutionalBelief;
