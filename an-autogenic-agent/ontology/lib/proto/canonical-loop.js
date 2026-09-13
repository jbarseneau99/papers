'use strict';

/**
 * lib/proto/canonical-loop.js — the canonical four-phase loop CLASS.
 *
 * Every maintenance revolution on the platform runs Detection → Commitment →
 * Execution → Observation. Cognitive cadence loops (Reactive, Thinking, …)
 * schedule WHEN the agent beats; this loop defines WHAT one epistemic
 * revolution does. Domain organs bind handlers per primitive and may extend
 * individual steps with tool-specific handlers — agents decide how they use
 * the four classes; the primitive order is invariant.
 *
 * Contents: class definition · inherited instances.
 * Ontology: Code object M33C-0125 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const { PRIMITIVES, LoopStep } = require('./loop-step');

const PRIMITIVE_CATALOG = Object.freeze({
  detection: {
    id: 'detection',
    primitive: 'detection',
    name: 'Detection',
    what: 'Read durable state and name gaps, staleness, or contention — no external side effects.'
  },
  commitment: {
    id: 'commitment',
    primitive: 'commitment',
    name: 'Commitment',
    what: 'Stage intent before mutation — proposals, allocations, or explicit auto-commit policy.'
  },
  execution: {
    id: 'execution',
    primitive: 'execution',
    name: 'Execution',
    what: 'Run bounded tools to produce ephemeral work product.'
  },
  observation: {
    id: 'observation',
    primitive: 'observation',
    name: 'Observation',
    what: 'Register canonical outcomes by UUID and extend the epistemic graph. When the claim is user-visible, attach surface_evidence_id — a stored PNG the read path can fetch — so visual proof outranks success-shaped receipts.'
  }
});

const BASE_LOOP_PRIMITIVES = PRIMITIVES.map(function (primitive) {
  return new LoopStep(PRIMITIVE_CATALOG[primitive]);
});

// ── The class ───────────────────────────────────────────────────────────────

class CanonicalLoop {
  /**
   * @param {object} raw — { id, name, what, domain?, state? }
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology().validate({
      '@type': 'mach33:CanonicalLoop',
      id: raw.id,
      name: raw.name,
      what: raw.what,
      domain: raw.domain || null
    });
    if (violations.length) {
      throw new Error('[proto:canonical-loop] OEP violations for "' + (raw.id || '?') + '": '
        + violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    this.id = raw.id;
    this.name = raw.name;
    this.what = raw.what;
    this.domain = raw.domain || null;
    this.state = raw.state || 'procedural';
    this.steps = {};
    PRIMITIVES.forEach(function (primitive) {
      this.steps[primitive] = new LoopStep(Object.assign({}, PRIMITIVE_CATALOG[primitive], {
        id: raw.id + ':' + primitive
      }));
    }, this);
    this.runtime = {
      runs: 0,
      lastRun: null,
      streak: 0,
      errors: 0,
      lastError: null,
      lastRevolution: null
    };
    Object.freeze(this);
  }

  bindStep(primitive, handler) {
    requirePrimitive(primitive);
    this.steps[primitive].bind(handler);
    return this;
  }

  bindTool(primitive, toolId, handler) {
    requirePrimitive(primitive);
    this.steps[primitive].bindTool(toolId, handler);
    return this;
  }

  isBound() {
    return PRIMITIVES.some(function (primitive) {
      return this.steps[primitive].isBound();
    }, this);
  }

  /**
   * Execute one revolution: detection → commitment → execution → observation.
   * Each handler receives (ctx, bag). Prior step outputs live on bag.
   */
  run(ctx) {
    const self = this;
    const bag = { ctx: ctx || {}, startedAt: new Date().toISOString() };
    let phase = null;
    return PRIMITIVES.reduce(function (chain, primitive) {
      return chain.then(function () {
        phase = primitive;
        return self.steps[primitive].run(ctx, bag);
      }).then(function (result) {
        bag[primitive] = result;
        if (result && result.error) {
          const error = new Error(result.error);
          error.phase = primitive;
          error.bag = bag;
          throw error;
        }
        if (result && result.halt === true) {
          const halt = new Error('canonical_loop_halted');
          halt.halt = true;
          halt.phase = primitive;
          halt.bag = bag;
          throw halt;
        }
      });
    }, Promise.resolve()).then(async function () {
      if (bag.observation && bag.observation.checkpoint) {
        try {
          const cp = bag.observation.checkpoint;
          const ctx = bag.ctx || {};
          await require('../agent-checkpoints').writeRevolutionCheckpoint(Object.assign({}, cp, {
            agent_id: cp.agent_id || ctx.agentId || ctx.agent_id || 'unknown',
            session_id: cp.session_id || ctx.sessionId || ctx.session_id || null
          }));
        } catch (e) {
          console.warn('[proto:canonical-loop] checkpoint write failed:', e.message);
        }
      }
      self.runtime.runs++;
      self.runtime.streak++;
      self.runtime.lastRun = new Date().toISOString();
      self.runtime.lastRevolution = {
        at: self.runtime.lastRun,
        domain: self.domain,
        phases: PRIMITIVES.slice()
      };
      return { ok: true, loopId: self.id, bag: bag };
    }).catch(function (error) {
      if (error && error.halt) {
        self.runtime.runs++;
        self.runtime.streak++;
        self.runtime.lastRun = new Date().toISOString();
        self.runtime.lastRevolution = {
          at: self.runtime.lastRun,
          domain: self.domain,
          phases: PRIMITIVES.slice(0, PRIMITIVES.indexOf(error.phase) + 1),
          halted: true
        };
        return { ok: true, halted: true, phase: error.phase, loopId: self.id, bag: error.bag };
      }
      self.runtime.errors++;
      self.runtime.streak = 0;
      self.runtime.lastError = (error && error.message) || String(error);
      console.warn('[proto:canonical-loop] "' + self.id + '" failed in '
        + (error && error.phase || phase || 'unknown') + ':', self.runtime.lastError);
      return {
        ok: false,
        loopId: self.id,
        phase: error && error.phase,
        error: self.runtime.lastError,
        bag: error && error.bag
      };
    });
  }

  report() {
    const rt = this.runtime;
    const steps = {};
    PRIMITIVES.forEach(function (primitive) {
      steps[primitive] = this.steps[primitive].report();
    }, this);
    return {
      id: this.id,
      name: this.name,
      what: this.what,
      domain: this.domain,
      state: this.state,
      bound: this.isBound(),
      runs: rt.runs,
      lastRun: rt.lastRun,
      streak: rt.streak,
      errors: rt.errors,
      lastError: rt.lastError,
      lastRevolution: rt.lastRevolution,
      steps: steps
    };
  }
}

function requirePrimitive(value) {
  const primitive = String(value || '');
  if (PRIMITIVES.indexOf(primitive) < 0) {
    throw new Error('[proto:canonical-loop] unknown primitive "' + primitive + '"');
  }
  return primitive;
}

/** Structured ontology agents and settings panels can project verbatim. */
function agentOntology() {
  return {
    id: 'canonical-loop',
    name: 'Canonical Loop',
    what: 'The house epistemic maintenance cycle — four primitive step classes every agent shares.',
    primitiveOrder: PRIMITIVES.slice(),
    primitives: PRIMITIVES.map(function (primitive) {
      return Object.assign({ primitive: primitive }, PRIMITIVE_CATALOG[primitive]);
    }),
    prose: 'Every maintenance revolution runs Detection → Commitment → Execution → Observation. '
      + 'Detection reads durable UUID-grounded state and names gaps without side effects. '
      + 'Commitment stages intent before mutation. Execution runs bounded tools. '
      + 'Observation registers canonical outcomes and extends the graph. '
      + 'User-visible claims SHOULD cite surface_evidence_id (a durable PNG capture) '
      + 'so verification uses visual proof, not tool receipts alone. '
      + 'Agents and domain organs decide how each primitive is bound and which tool extensions apply; '
      + 'the four classes and their order are invariant platform law.'
  };
}

module.exports = {
  PRIMITIVES: PRIMITIVES,
  PRIMITIVE_CATALOG: PRIMITIVE_CATALOG,
  BASE_LOOP_PRIMITIVES: BASE_LOOP_PRIMITIVES,
  CanonicalLoop: CanonicalLoop,
  LoopStep: LoopStep,
  agentOntology: agentOntology
};
