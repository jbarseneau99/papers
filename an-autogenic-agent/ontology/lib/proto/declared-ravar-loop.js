'use strict';

/**
 * lib/proto/declared-ravar-loop.js — Declared RaVaR loop CLASS (ADR 0045).
 *
 * Tool loops for deliverable production: Render → And → Verify with bounded
 * Retry across declared paths under one durable id. Orthogonal to
 * CanonicalLoop (epistemic maintenance) and cognitive Loop (cadence).
 *
 * Contents: class definition · inherited instances.
 * Ontology: Code object M33C-0133 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const RenderResult = require('./render-result');
const { PRIMITIVES, RaVaRStep } = require('./ravar-step');

const PRIMITIVE_CATALOG = Object.freeze({
  render: {
    id: 'render',
    primitive: 'render',
    name: 'Render',
    what: 'Run a declared render path — specialist compose, renderer, or fetch.'
  },
  and: {
    id: 'and',
    primitive: 'and',
    name: 'And',
    what: 'Enrich and normalize — render_ref, mime, stable id.'
  },
  verify: {
    id: 'verify',
    primitive: 'verify',
    name: 'Verify',
    what: 'Gate on objective checks before a receipt is attached.'
  }
});

const BASE_RAVAR_PRIMITIVES = PRIMITIVES.map(function (primitive) {
  return new RaVaRStep(PRIMITIVE_CATALOG[primitive]);
});

// ── The class ───────────────────────────────────────────────────────────────

class DeclaredRaVaRLoop {
  /**
   * @param {object} raw — { id, name, what, domain?, paths?, max_attempts?, durable_id_key? }
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology().validate({
      '@type': 'mach33:DeclaredRaVaRLoop',
      id: raw.id,
      name: raw.name,
      what: raw.what,
      domain: raw.domain || null
    });
    if (violations.length) {
      throw new Error('[proto:declared-ravar-loop] OEP violations for "' + (raw.id || '?') + '": '
        + violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    this.id = raw.id;
    this.name = raw.name;
    this.what = raw.what;
    this.domain = raw.domain || null;
    this.state = raw.state || 'procedural';
    this.paths = Array.isArray(raw.paths) ? raw.paths.slice() : [];
    this.max_attempts = Math.max(1, Number(raw.max_attempts) || this.paths.length || 1);
    this.durable_id_key = raw.durable_id_key || 'durable_id';
    this.steps = {};
    PRIMITIVES.forEach(function (primitive) {
      this.steps[primitive] = new RaVaRStep(Object.assign({}, PRIMITIVE_CATALOG[primitive], {
        id: raw.id + ':' + primitive
      }));
    }, this);
    this.pathHandlers = Object.create(null);
    this.verifyHandlers = [];
    this.runtime = {
      runs: 0,
      lastRun: null,
      streak: 0,
      errors: 0,
      lastError: null,
      lastInvocation: null
    };
    Object.freeze(this);
  }

  bindStep(primitive, handler) {
    requirePrimitive(primitive);
    this.steps[primitive].bind(handler);
    return this;
  }

  bindPath(pathId, handler) {
    const key = String(pathId || '').trim();
    if (!key) throw new Error('[proto:declared-ravar-loop] bindPath() requires a path id');
    if (typeof handler !== 'function') {
      throw new TypeError('[proto:declared-ravar-loop] bindPath() needs a function');
    }
    this.pathHandlers[key] = handler;
    return this;
  }

  bindVerify(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('[proto:declared-ravar-loop] bindVerify() needs a function');
    }
    this.verifyHandlers.push(handler);
    return this;
  }

  isBound() {
    const pathsBound = this.paths.some(function (pathId) {
      return typeof this.pathHandlers[pathId] === 'function';
    }, this);
    const andBound = this.steps.and.isBound();
    const verifyBound = this.verifyHandlers.length > 0 || this.steps.verify.isBound();
    return pathsBound && andBound && verifyBound;
  }

  /**
   * Execute one deliverable invocation: try declared paths until Verify passes
   * or attempts exhaust. Each path runs Render → And → Verify under the same
   * durable id on bag.ctx.
   */
  run(ctx) {
    const self = this;
    const bag = {
      ctx: ctx || {},
      startedAt: new Date().toISOString(),
      attempts: [],
      path: null,
      render: null,
      and: null,
      verify: null,
      receipt: null
    };
    if (bag.ctx[self.durable_id_key]) {
      bag.durable_id = bag.ctx[self.durable_id_key];
    }

    const pathOrder = self.paths.length ? self.paths.slice() : Object.keys(self.pathHandlers);
    const limit = Math.min(self.max_attempts, pathOrder.length || self.max_attempts);

    function runPath(index) {
      if (index >= limit) {
        return Promise.resolve({
          ok: false,
          loopId: self.id,
          error: 'ravar_paths_exhausted',
          attempts: bag.attempts,
          bag: bag
        });
      }
      const pathId = pathOrder[index];
      bag.path = pathId;
      bag.attemptIndex = index;

      const pathHandler = self.pathHandlers[pathId]
        || (self.steps.render.isBound() ? self.steps.render.runtime.handler : null);
      const renderFn = typeof pathHandler === 'function'
        ? pathHandler
        : function () { return Promise.resolve({ error: 'path_not_bound:' + pathId }); };

      return Promise.resolve().then(function () { return renderFn(bag.ctx, bag); })
        .then(function (renderResult) {
          if (renderResult && renderResult.error) {
            bag.render = renderResult;
            bag.attempts.push({ path: pathId, phase: 'render', error: renderResult.error });
            return runPath(index + 1);
          }
          bag.render = renderResult;
          const andHandler = self.steps.and.isBound()
            ? self.steps.and.runtime.handler
            : function () { return null; };
          return Promise.resolve().then(function () { return andHandler(bag.ctx, bag); });
        })
        .then(function (andResult) {
          if (andResult && andResult.error) {
            bag.and = andResult;
            bag.attempts.push({ path: pathId, phase: 'and', error: andResult.error });
            return runPath(index + 1);
          }
          bag.and = andResult;
          return self._runVerify(bag);
        })
        .then(function (verifyResult) {
          bag.verify = verifyResult;
          if (verifyResult && verifyResult.ok) {
            bag.receipt = verifyResult.receipt || null;
            return {
              ok: true,
              loopId: self.id,
              path: pathId,
              receipt: bag.receipt,
              attempts: bag.attempts,
              bag: bag
            };
          }
          bag.attempts.push({
            path: pathId,
            phase: 'verify',
            failures: verifyResult && verifyResult.failures
          });
          return runPath(index + 1);
        });
    }

    return runPath(0).then(function (result) {
      if (result.ok) {
        self.runtime.runs++;
        self.runtime.streak++;
        self.runtime.lastRun = new Date().toISOString();
        self.runtime.lastInvocation = {
          at: self.runtime.lastRun,
          path: result.path,
          attempts: bag.attempts.length
        };
      } else {
        self.runtime.errors++;
        self.runtime.streak = 0;
        self.runtime.lastError = result.error || 'ravar_failed';
        self.runtime.lastInvocation = {
          at: new Date().toISOString(),
          path: bag.path,
          attempts: bag.attempts.length,
          error: self.runtime.lastError
        };
      }
      return result;
    }).catch(function (error) {
      self.runtime.errors++;
      self.runtime.streak = 0;
      self.runtime.lastError = (error && error.message) || String(error);
      console.warn('[proto:declared-ravar-loop] "' + self.id + '" failed:', self.runtime.lastError);
      return {
        ok: false,
        loopId: self.id,
        error: self.runtime.lastError,
        bag: bag
      };
    });
  }

  _runVerify(bag) {
    const handlers = this.verifyHandlers.slice();
    if (this.steps.verify.isBound()) handlers.push(this.steps.verify.runtime.handler);
    if (!handlers.length) {
      return Promise.resolve({ ok: false, failures: [{ gate: 'verify', error: 'no_verify_handlers' }] });
    }
    const failures = [];
    const self = this;
    return handlers.reduce(function (chain, handler) {
      return chain.then(function (prior) {
        if (prior && !prior.ok) return prior;
        return Promise.resolve().then(function () { return handler(bag.ctx, bag); })
          .then(function (result) {
            if (result && result.ok === false) {
              failures.push(result);
              return { ok: false, failures: failures.slice() };
            }
            return { ok: true, receipt: (result && result.receipt) || (prior && prior.receipt) || null };
          });
      });
    }, Promise.resolve({ ok: true, receipt: null })).then(function (finalResult) {
      if (finalResult.ok && bag.receipt && !finalResult.receipt) {
        finalResult.receipt = bag.receipt;
      }
      if (finalResult.ok && finalResult.receipt && !bag.receipt) {
        bag.receipt = finalResult.receipt;
      }
      return finalResult;
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
      paths: this.paths.slice(),
      max_attempts: this.max_attempts,
      durable_id_key: this.durable_id_key,
      bound: this.isBound(),
      path_handlers: Object.keys(this.pathHandlers),
      verify_gates: this.verifyHandlers.length + (this.steps.verify.isBound() ? 1 : 0),
      runs: rt.runs,
      lastRun: rt.lastRun,
      streak: rt.streak,
      errors: rt.errors,
      lastError: rt.lastError,
      lastInvocation: rt.lastInvocation,
      steps: steps
    };
  }
}

function requirePrimitive(value) {
  const primitive = String(value || '');
  if (PRIMITIVES.indexOf(primitive) < 0) {
    throw new Error('[proto:declared-ravar-loop] unknown primitive "' + primitive + '"');
  }
  return primitive;
}

/** Structured ontology agents and settings panels can project verbatim. */
function agentOntology() {
  return {
    id: 'declared-ravar-loop',
    name: 'Declared RaVaR Loop',
    what: 'The house deliverable production cycle — Render → And → Verify with bounded Retry across declared paths; tool loops, not reasoning loops (ADR 0045).',
    primitiveOrder: PRIMITIVES.slice(),
    primitives: PRIMITIVES.map(function (primitive) {
      return Object.assign({ primitive: primitive }, PRIMITIVE_CATALOG[primitive]);
    }),
    prose: 'Deliverable tools declare ordered render paths, verify gates, and max_attempts. '
      + 'The platform executes Render → And → Verify; Retry advances to the next path under '
      + 'the same durable id. The agent reasons upstream (intent, inputs); it does not '
      + 're-orchestrate beats in chat. Receipt terminus is RenderResult.'
  };
}

/** Normalize a loop result receipt into a RenderResult instance when possible. */
function receiptToRenderResult(receipt) {
  if (!receipt) return null;
  if (receipt instanceof RenderResult) return receipt;
  try {
    return RenderResult.fromService(receipt);
  } catch (_) {
    return null;
  }
}

module.exports = {
  PRIMITIVES: PRIMITIVES,
  PRIMITIVE_CATALOG: PRIMITIVE_CATALOG,
  BASE_RAVAR_PRIMITIVES: BASE_RAVAR_PRIMITIVES,
  DeclaredRaVaRLoop: DeclaredRaVaRLoop,
  RaVaRStep: RaVaRStep,
  agentOntology: agentOntology,
  receiptToRenderResult: receiptToRenderResult
};
