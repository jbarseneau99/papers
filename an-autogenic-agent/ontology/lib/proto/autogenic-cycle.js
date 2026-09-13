'use strict';

/**
 * lib/proto/autogenic-cycle.js — the AutogenicCycle CLASS (ontogeny closes).
 *
 * An AutogenicCycle is one pass of self-modification — a finding carried
 * through the seven stages. Before advanceFinding existed nothing tracked
 * a pass; now the base constructs cycles for real: fileFinding OPENS one,
 * advanceFinding MOVES it, reaching 'ship' STAMPS it. Movement is
 * immutable (the Finding precedent): withStage() returns a NEW cycle.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0070 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class AutogenicCycle {
  /**
   * @param {object} raw — { finding, stage, startedAt?, shippedAt?, origin? }
   * @throws {Error} OEP violations / unknown stage — fails loud.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.stage != null && !require('./lifecycle').get('finding-stages').has(raw.stage)) {
      throw new Error('[proto:autogenic-cycle] unknown stage "' + raw.stage + '"');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:AutogenicCycle' }, raw));
    if (violations.length) {
      throw new Error('[proto:autogenic-cycle] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** Immutable movement — a NEW cycle; 'ship' stamps shippedAt. */
  withStage(stage) {
    return new AutogenicCycle(Object.assign({}, this, { stage: stage },
      stage === 'ship' ? { shippedAt: new Date().toISOString() } : {}));
  }

  isShipped() { return !!this.shippedAt; }

  label() {
    return 'cycle(' + this.finding + ') @ ' + this.stage + (this.shippedAt ? ' — shipped' : '');
  }
}

module.exports = AutogenicCycle;
