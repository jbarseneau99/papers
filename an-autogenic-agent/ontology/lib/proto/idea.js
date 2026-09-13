'use strict';

/**
 * lib/proto/idea.js — the Idea CLASS (the Ideation manifold).
 *
 * An Idea is a provisional object — question, hypothetical,
 * counterfactual or analogy. NEVER a claim: status is LOCKED to
 * 'provisional' (the anti-minting law's sibling — an idea cannot carry
 * belief; it must cross the workspace and the CEREMONY to become one).
 * Grown via Proto.addIdea into a capped ledger.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0079 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Idea {
  /**
   * @param {object} raw — { kind, text, status? (locked 'provisional'), at?, id?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (['question', 'hypothetical', 'counterfactual', 'analogy'].indexOf(raw.kind) < 0) {
      throw new Error('[proto:idea] kind must be one of question | hypothetical | counterfactual | analogy');
    }
    if (raw.status != null && raw.status !== 'provisional') {
      throw new Error('[proto:idea] an Idea is ALWAYS provisional — it can never be a claim (promote through the workspace instead)');
    }
    if (!String(raw.text || '').trim()) {
      throw new Error('[proto:idea] text must be non-empty');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Idea' }, raw));
    if (violations.length) {
      throw new Error('[proto:idea] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.kind + ': ' + String(this.text).slice(0, 60); }

  /** The awareness line — an open provisional, projected into the prompt head. */
  line() { return 'open ' + this.kind + ': ' + String(this.text).replace(/\s+/g, ' ').trim().slice(0, 70); }
}

module.exports = Idea;
