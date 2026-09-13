'use strict';

/**
 * lib/proto/inquiry.js — the Inquiry CLASS (an open question, tracked).
 *
 * The fourteenth conversion. An Inquiry is a wondering held as a node:
 * open until a claim answers it. Movement is immutable (the Finding
 * precedent): answer() returns a NEW Inquiry — the open record is never
 * rewritten.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0034 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Inquiry {
  /**
   * @param {object} raw — { question, status?: 'open'|'answered', answeredBy?, session?, origin? }
   * @throws {Error} OEP violations / bad status — fails loud.
   */
  constructor(raw) {
    raw = Object.assign({ status: 'open' }, raw || {});
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Inquiry' }, raw));
    if (violations.length) {
      throw new Error('[proto:inquiry] OEP violations ("' + (raw.question || '?') + '"): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (!require('./lifecycle').get('inquiry-status').has(raw.status)) {
      throw new Error('[proto:inquiry] status must be open|answered ("' + raw.question + '")');
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  isOpen() { return this.status === 'open'; }

  /** Immutable movement: a NEW answered Inquiry, pointing at its answer. */
  answer(byEnvelope) {
    return new Inquiry(Object.assign({}, this, { status: 'answered',
      answeredBy: (byEnvelope && byEnvelope.provenance && byEnvelope.provenance.subject) || byEnvelope || null }));
  }

  label() { return this.question + ' (' + this.status + ')'; }
}

module.exports = Inquiry;
