'use strict';

/**
 * lib/proto/lifecycle.js — the Lifecycle CLASS (the Wave-2 unifier).
 *
 * A Lifecycle is a first-class state machine — states, an initial state,
 * legal transitions, optionally named triggers. It replaces ad-hoc status
 * enums: the vocabularies that used to be hand-locked inside Finding,
 * Inquiry and EpistemicNode are now the states of BASE_LIFECYCLES, and
 * those classes DERIVE from the instances (one owner, projections).
 *
 * The three inherited instances:
 *  - finding-stages: GENERATED from faculties.AUTOGENIC_STAGES (never
 *    restated); a pipeline — movement is forward (ahead()), skips legal.
 *  - inquiry-status: open → answered; the owner inquiry.js reads.
 *  - node-maturity: the Toulmin maturity FSM as ontology data. Deliberately
 *    NOT imported from lib/epistemic/maturity-fsm.js (base never depends on
 *    the legacy engine); a drift-guard test asserts the two stay identical.
 *
 * Contents: class definition · inherited instances.
 * Ontology: Code object M33C-0067 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Lifecycle {
  /**
   * @param {object} raw — { id, name, states[], initial, transitions?
   *                         { from: [to, …] }, triggers? { from: { trigger: to } } }
   * @throws {Error} OEP violations / incoherent machine — fails loud.
   */
  constructor(raw) {
    raw = raw || {};
    if (!Array.isArray(raw.states) || raw.states.length < 2) {
      throw new Error('[proto:lifecycle] states must be an array of at least 2');
    }
    if (raw.initial != null && raw.states.indexOf(raw.initial) < 0) {
      throw new Error('[proto:lifecycle] initial "' + raw.initial + '" is not a state');
    }
    const states = raw.states;
    Object.keys(raw.transitions || {}).forEach(function (from) {
      if (states.indexOf(from) < 0) {
        throw new Error('[proto:lifecycle] transition from unknown state "' + from + '"');
      }
      (raw.transitions[from] || []).forEach(function (to) {
        if (states.indexOf(to) < 0) {
          throw new Error('[proto:lifecycle] transition to unknown state "' + to + '"');
        }
      });
    });
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Lifecycle' }, raw));
    if (violations.length) {
      throw new Error('[proto:lifecycle] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this.states);
    if (this.transitions) {
      Object.keys(this.transitions).forEach(function (k) { Object.freeze(raw.transitions[k]); });
      Object.freeze(this.transitions);
    }
    if (this.triggers) Object.freeze(this.triggers);
    Object.freeze(this);
  }

  /** Whether from → to is a declared legal transition. */
  can(from, to) {
    return !!(this.transitions && this.transitions[from] &&
      this.transitions[from].indexOf(to) >= 0);
  }

  /** Pipeline semantics: to sits LATER than from in state order (skips legal). */
  ahead(from, to) {
    const a = this.states.indexOf(from), b = this.states.indexOf(to);
    return a >= 0 && b >= 0 && b > a;
  }

  /** A state's legal next states ([] at a terminal). */
  next(from) { return (this.transitions && this.transitions[from]) || []; }

  /** Terminal = no outgoing transitions declared. */
  isTerminal(state) { return this.next(state).length === 0; }

  /** Membership — the vocabulary check consumers derive from. */
  has(state) { return this.states.indexOf(state) >= 0; }

  /** The roster line: "node-maturity: detected → … (4 states)". */
  label() {
    return this.id + ': ' + this.states[0] + ' → … (' + this.states.length + ' states)';
  }
}

// ── The inherited instances ─────────────────────────────────────────────────
// finding-stages is GENERATED from the frozen AUTOGENIC_STAGES — the chain
// each → [next]; Finding moves with ahead() (a pipeline may fast-forward).
const _stageIds = require('./faculties').AUTOGENIC_STAGES.map(function (s) { return s.id; });
const _stageChain = {};
_stageIds.forEach(function (s, i) { if (i < _stageIds.length - 1) _stageChain[s] = [_stageIds[i + 1]]; });

const BASE_LIFECYCLES = [
  new Lifecycle({
    id: 'finding-stages', name: 'Finding stages (the autogenic pipeline)',
    states: _stageIds, initial: _stageIds[0], transitions: _stageChain
  }),
  new Lifecycle({
    id: 'inquiry-status', name: 'Inquiry status',
    states: ['open', 'answered'], initial: 'open',
    transitions: { open: ['answered'] }
  }),
  new Lifecycle({
    id: 'node-maturity', name: 'Committed-claim maturity (Toulmin FSM)',
    states: ['detected', 'under_evaluation', 'weighed', 'decayed'], initial: 'detected',
    transitions: {
      detected: ['under_evaluation'],
      under_evaluation: ['weighed'],
      weighed: ['under_evaluation', 'decayed'],
      decayed: ['weighed']
    },
    triggers: {
      detected: { bilateral_evidence_found: 'under_evaluation' },
      under_evaluation: { weight_established: 'weighed' },
      weighed: { new_contention: 'under_evaluation', theta_exceeded: 'decayed' },
      decayed: { fresh_validation: 'weighed' }
    }
  })
];

const byId = {};
BASE_LIFECYCLES.forEach(function (lc) { byId[lc.id] = lc; });

module.exports = Lifecycle;
module.exports.BASE_LIFECYCLES = BASE_LIFECYCLES;
module.exports.get = function (id) { return byId[id]; };
