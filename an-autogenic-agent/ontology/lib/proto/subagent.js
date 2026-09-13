'use strict';

/**
 * lib/proto/subagent.js — the Subagent CLASS (the Composite's paperwork).
 *
 * The eleventh conversion. A Subagent is NOT the child — the child is a
 * full Proto and always was (ADR 0001). A Subagent is the ASSOCIATION
 * record: the reified ◆ composition edge between two Protos — who is
 * inside whom, under what contract. In OMT terms, an association class.
 *
 * Records are GROWN: compose() constructs one per composition, so the
 * host can answer "who is inside me and what may they do?" from real
 * objects. The hostContract ({ authority[], mustNot[], triggers[] }) is a
 * validated FIELD here; it promotes to its own class when Place lands
 * (ADR 0014 §6 — both containers share it then). Relay is instance #1.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0031 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Subagent {
  /**
   * @param {object} raw — { identity, host, hostContract?: { authority?,
   *                         mustNot?, triggers? } }
   * @throws {Error} OEP violations / malformed contract — fails loud.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Subagent' }, raw));
    if (violations.length) {
      throw new Error('[proto:subagent] OEP violations ("' + (raw.identity || '?') + '"): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (raw.hostContract != null) {
      // The contract is its own class now — Subagent COMPOSES one; the
      // array validation lives on HostContract, not here.
      const HostContract = require('./host-contract');
      raw = Object.assign({}, raw, {
        hostContract: raw.hostContract instanceof HostContract
          ? raw.hostContract : new HostContract(raw.hostContract)
      });
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** Whether the contract forbids an action (delegates to HostContract). */
  forbids(action) {
    return !!(this.hostContract && this.hostContract.forbids(action));
  }

  /** The roster line: "Relay ◆ inside Proto Class (Demo) (contracted)". */
  label() {
    return this.identity + ' ◆ inside ' + this.host + (this.hostContract ? ' (contracted)' : ' (no contract)');
  }
}

module.exports = Subagent;
