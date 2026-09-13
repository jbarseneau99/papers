'use strict';

/**
 * lib/proto/claim-envelope.js — the ClaimEnvelope CLASS (conviction carried).
 *
 * The fifteenth conversion. A ClaimEnvelope is a claim with κ (conviction,
 * 0..1), a speech act, and provenance — the WORKSPACE side of the firewall.
 * Promotion into the committed belief graph (EpistemicNode, Arc 2) is a
 * CEREMONY, never automatic — the anti-minting law: no belief without a
 * grounding chain. Drafts cite envelopes above a κ floor (documents arc).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0035 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class ClaimEnvelope {
  /**
   * @param {object} raw — { text, kappa: 0..1, speech_act?, provenance?, session?, origin? }
   * @throws {Error} OEP violations / κ out of range — fails loud.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:ClaimEnvelope' }, raw));
    if (violations.length) {
      throw new Error('[proto:claim-envelope] OEP violations ("' + String(raw.text || '?').slice(0, 40) + '"): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    const k = Number(raw.kappa);
    if (!(k >= 0 && k <= 1)) {
      throw new Error('[proto:claim-envelope] kappa must be 0..1 (got ' + raw.kappa + ')');
    }
    Object.assign(this, raw, { kappa: k });
    if (this.provenance && typeof this.provenance === 'object') Object.freeze(this.provenance);
    Object.freeze(this);
  }

  /** Whether this envelope clears a citation floor (Draft's gate). */
  meetsFloor(floor) { return this.kappa >= (floor == null ? 0.7 : floor); }

  label() { return '"' + String(this.text).slice(0, 60) + '" κ=' + this.kappa; }
}

module.exports = ClaimEnvelope;
