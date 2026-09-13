'use strict';

/**
 * lib/proto/epistemic-node.js — the EpistemicNode CLASS (committed belief).
 *
 * The sixteenth conversion — the crown jewel. An EpistemicNode is belief
 * the agent has COMMITTED: a Toulmin-typed claim with a maturity state and
 * (instance-side) the Greeks. THE ANTI-MINTING LAW lives here: provenance
 * is REQUIRED at construction — a belief with no grounding chain cannot
 * exist (the 120k-ungrounded-grounds purge, made structurally impossible).
 * Promotion from the workspace is a CEREMONY (proto.promoteEnvelope, which
 * demands a named approver) — never automatic.
 *
 * Maturity vocabulary matches the live FSM (lib/epistemic/maturity-fsm.js):
 * detected → under_evaluation → weighed → decayed. Movement is immutable.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0037 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// `claim` is the class-side generic root vocabulary; the durable graph calls
// it `root` and also carries contention/inference/bridge (0078). One class
// must be able to construct every role the store persists.
const TOULMIN = [
  'claim', 'root', 'ground', 'warrant', 'backing', 'contention',
  'qualifier', 'rebuttal', 'inference', 'bridge'
];
// Derived from the node-maturity Lifecycle (one owner). Membership only —
// withMaturity() stays transition-agnostic because the live engine's manual
// override may move any state to any state (the operator escape hatch).
const MATURITY = require('./lifecycle').get('node-maturity').states;

// ── The class ───────────────────────────────────────────────────────────────
class EpistemicNode {
  constructor(raw) {
    raw = Object.assign({ claimType: 'claim', maturity: 'detected' }, raw || {});
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:EpistemicNode' }, raw));
    if (violations.length) {
      throw new Error('[proto:epistemic-node] OEP violations ("' + String(raw.text || '?').slice(0, 40) + '"): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (!raw.provenance || typeof raw.provenance !== 'object' || !raw.provenance.from) {
      throw new Error('[proto:epistemic-node] ANTI-MINTING: a belief needs a grounding chain (provenance.from) — refusing "' + String(raw.text || '?').slice(0, 40) + '"');
    }
    if (TOULMIN.indexOf(raw.claimType) < 0) {
      throw new Error('[proto:epistemic-node] claimType must be Toulmin: ' + TOULMIN.join('|'));
    }
    if (MATURITY.indexOf(raw.maturity) < 0) {
      throw new Error('[proto:epistemic-node] maturity must be: ' + MATURITY.join(' → '));
    }
    Object.assign(this, raw);
    Object.freeze(this.provenance);
    Object.freeze(this);
  }

  /** Immutable maturity movement — a NEW node; history not rewritten. */
  withMaturity(m) { return new EpistemicNode(Object.assign({}, this, { maturity: m })); }

  label() { return '[' + this.claimType + '/' + this.maturity + '] ' + String(this.text).slice(0, 60); }
}

EpistemicNode.TOULMIN = Object.freeze(TOULMIN);
EpistemicNode.MATURITY = Object.freeze(MATURITY);
module.exports = EpistemicNode;
