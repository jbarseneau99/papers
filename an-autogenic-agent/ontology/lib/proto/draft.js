'use strict';

/**
 * lib/proto/draft.js — the Draft CLASS (the documents workspace).
 *
 * A Draft is prose in progress — markdown in the base (Newton's LaTeX
 * is that instance's realization). Grown via Proto.addDraft; revision is
 * immutable (reviseDraft swaps a NEW Draft). Grounding in committed
 * claims happens via [[claim:id]] tokens in the body, harvested by the
 * BoundIR read-construction.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0087 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Draft {
  /**
   * @param {object} raw — { kind (tweet | essay | report | whitepaper | paper), body, id?, title?, status?, at?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (['tweet', 'essay', 'report', 'whitepaper', 'paper'].indexOf(raw.kind) < 0) {
      throw new Error('[proto:draft] kind must be one of tweet | essay | report | whitepaper | paper');
    }
    if (!String(raw.body || '').trim()) {
      throw new Error('[proto:draft] a draft has prose — body must be non-empty');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Draft' }, raw));
    if (violations.length) {
      throw new Error('[proto:draft] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);

    Object.freeze(this);
  }

  revise(body) { return new Draft(Object.assign({}, this, { body: body, status: this.status || 'drafting' })); }
  label() { return (this.title || this.id) + ' [' + this.kind + '/' + (this.status || 'drafting') + '] — ' + String(this.body).length + ' chars'; }
}

module.exports = Draft;
