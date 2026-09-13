'use strict';

/**
 * lib/proto/proto-claim.js — the ProtoClaim CLASS (raw assertion).
 *
 * The thirteenth conversion — the epistemic arc opens. A ProtoClaim is a
 * raw extraction: subject + predicate, before maturity. BOUNDARY (recipe
 * step 8): a MemoryTurn is what was SAID; a ProtoClaim is what was
 * ASSERTED — extracted from turns, never a copy of them. Grown origin:
 * decomposition constructs these from conversation.
 *
 * mature() is the bridge the catalog's edge promises ("matures into"):
 * it constructs a ClaimEnvelope carrying provenance back to this claim.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0033 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class ProtoClaim {
  /**
   * @param {object} raw — { subject, predicate, text, session?, source?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:ProtoClaim' }, raw));
    if (violations.length) {
      throw new Error('[proto:proto-claim] OEP violations ("' + (raw.subject || '?') + '"): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /**
   * Mature into a ClaimEnvelope (κ + speech act), provenance chained back
   * to this claim — the workspace side of the firewall.
   */
  mature(opts) {
    opts = opts || {};
    const ClaimEnvelope = require('./claim-envelope');
    return new ClaimEnvelope({
      text: this.text,
      kappa: opts.kappa != null ? opts.kappa : 0.5,
      speech_act: opts.speech_act || 'assert',
      provenance: Object.assign({ from: 'proto-claim', subject: this.subject, predicate: this.predicate,
        session: this.session || null, source: this.source || null }, opts.provenance || {}),
      session: this.session, origin: this.origin || 'grown'
    });
  }

  /** The roster line: "subject — predicate". */
  label() { return this.subject + ' — ' + this.predicate; }
}

module.exports = ProtoClaim;
