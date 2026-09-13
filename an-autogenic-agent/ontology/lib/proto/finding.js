// "THE WORLD BREAKS EVERY ONE, AND AFTERWARD MANY ARE STRONG AT THE BROKEN PLACES."
// — Ernest Hemingway, A Farewell to Arms (1929).
'use strict';

/**
 * lib/proto/finding.js — the Finding CLASS (the autogenic loop's fuel).
 *
 * The twelfth conversion. A Finding is a detected gap, drift or violation
 * moving through the autogenic loop — the unit of self-improvement. Two
 * origins: DECLARED (an instance seeds its self.selfImprovement; validated
 * at assembly, a bad seed dies at boot) and GROWN (proto.fileFinding() at
 * runtime — the Reflection faculty's write path when it arrives).
 *
 * The stage vocabulary is the frozen AUTOGENIC_STAGES (detect → propose →
 * accept → implement → verify → ship → measure) — a stage outside it fails
 * construction loud, so "implementing" vs "implement" typos die instead of
 * silently orphaning a finding off the loop. Instances freeze; movement is
 * immutable: advance(stage) returns a NEW Finding (state history stays
 * honest — the old record is not rewritten).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0032 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Finding {
  /**
   * @param {object} raw — { id?, title, what, stage, state?, kind?, scope?,
   *                         evidence?, origin? }
   * @throws {Error} OEP violations / unknown stage — fails loud.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Finding' }, raw));
    if (violations.length) {
      throw new Error('[proto:finding] OEP violations ("' + (raw.title || raw.id || '?') + '"): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    const stages = require('./lifecycle').get('finding-stages').states;
    if (stages.indexOf(raw.stage) < 0) {
      throw new Error('[proto:finding] unknown stage "' + raw.stage + '" for "' + (raw.title || '?') +
        '" — must be one of ' + stages.join(' → '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** Shipped or beyond (ship | measure). */
  isShipped() { return this.stage === 'ship' || this.stage === 'measure'; }

  /**
   * Immutable movement: returns a NEW Finding at the given stage — the old
   * record is never rewritten (history stays honest).
   */
  advance(stage, patch) {
    // Pipeline legality (the finding-stages Lifecycle): forward only —
    // skips are legal (a finding can fast-forward), regression is not.
    const lc = require('./lifecycle').get('finding-stages');
    if (lc.has(stage) && !lc.ahead(this.stage, stage)) {
      throw new Error('[proto:finding] cannot advance ' + this.stage + ' \u2192 ' + stage +
        ' — the pipeline moves forward ("' + (this.title || '?') + '")');
    }
    const next = Object.assign({}, this, patch || {}, { stage: stage });
    return new Finding(next);
  }

  /** The roster line: "Enforce the kernel — implement (in_progress)". */
  label() { return this.title + ' — ' + this.stage + (this.state ? ' (' + this.state + ')' : ''); }
}

module.exports = Finding;
