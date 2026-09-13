'use strict';

/**
 * lib/proto/workflow.js — the Workflow CLASS (the house process as data).
 *
 * A Workflow is a named repeatable process — steps, owner, cadence, human
 * gates. The inherited instance is the METHODOLOGY itself: ship-a-change,
 * CLAUDE.md rule 5 as ontology (branch → verify → commit → push → deploy
 * UAT → user validates → PR → merge), gated on the user's UAT validation.
 * Workflows pause on Decisions (modeled); Boole's pipeline is the fleet
 * realization.
 *
 * Contents: class definition · inherited instances.
 * Ontology: Code object M33C-0077 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Workflow {
  /**
   * @param {object} raw — { id, name, steps[], owner?, cadence?,
   *                         currentStep?, gatedOn? }
   * @throws {Error} OEP violations / stepless process — fails loud.
   */
  constructor(raw) {
    raw = raw || {};
    if (!Array.isArray(raw.steps) || raw.steps.length < 2) {
      throw new Error('[proto:workflow] a workflow needs at least 2 steps');
    }
    if (raw.currentStep != null && raw.steps.indexOf(raw.currentStep) < 0) {
      throw new Error('[proto:workflow] currentStep "' + raw.currentStep + '" is not a step');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Workflow' }, raw));
    if (violations.length) {
      throw new Error('[proto:workflow] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this.steps);
    Object.freeze(this);
  }

  label() { return this.id + ': ' + this.steps.length + ' steps' + (this.gatedOn ? ' (gated: ' + this.gatedOn + ')' : ''); }
}

// ── The inherited instance — the methodology itself ─────────────────────────
const BASE_WORKFLOWS = [
  new Workflow({
    id: 'ship-a-change', name: 'Ship a change (CLAUDE.md rule 5)',
    owner: 'J. Brant Arseneau & the Mach33 Agents', cadence: 'per change',
    steps: ['branch', 'verify locally', 'commit', 'push', 'deploy UAT', 'user validates', 'PR', 'merge'],
    gatedOn: 'user validates UAT (by ear/eye — rule 18)'
  })
];

module.exports = Workflow;
module.exports.BASE_WORKFLOWS = BASE_WORKFLOWS;
