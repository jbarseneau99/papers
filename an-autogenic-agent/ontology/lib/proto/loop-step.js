'use strict';

/**
 * lib/proto/loop-step.js — one primitive in the canonical loop.
 *
 * Detection, Commitment, Execution, and Observation are four invariant step
 * classes every agent shares. Domain organs bind handlers and optional tool
 * extensions; the primitive name and order never change.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0124 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const PRIMITIVES = Object.freeze(['detection', 'commitment', 'execution', 'observation']);

// ── The class ───────────────────────────────────────────────────────────────

class LoopStep {
  /**
   * @param {object} raw — { id?, primitive, name?, what?, toolId? }
   */
  constructor(raw) {
    raw = raw || {};
    const primitive = String(raw.primitive || raw.id || '');
    if (PRIMITIVES.indexOf(primitive) < 0) {
      throw new Error('[proto:loop-step] primitive must be one of '
        + PRIMITIVES.join('|') + ' (got "' + primitive + '")');
    }
    const violations = require('./classes').ontology().validate({
      '@type': 'mach33:LoopStep',
      id: raw.id || primitive,
      primitive: primitive,
      name: raw.name || capitalize(primitive),
      what: raw.what || defaultWhat(primitive)
    });
    if (violations.length) {
      throw new Error('[proto:loop-step] OEP violations for "' + primitive + '": '
        + violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    this.id = raw.id || primitive;
    this.primitive = primitive;
    this.name = raw.name || capitalize(primitive);
    this.what = raw.what || defaultWhat(primitive);
    this.toolId = raw.toolId || null;
    this.runtime = { handler: null, tools: Object.create(null), runs: 0, lastRun: null };
    Object.freeze(this);
  }

  /** Wire the default handler for this primitive. */
  bind(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('[proto:loop-step] bind() needs a function');
    }
    this.runtime.handler = handler;
    return this;
  }

  /** Extend this primitive with a domain tool handler keyed by tool id. */
  bindTool(toolId, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('[proto:loop-step] bindTool() needs a function');
    }
    const key = String(toolId || '').trim();
    if (!key) throw new Error('[proto:loop-step] bindTool() requires a tool id');
    this.runtime.tools[key] = handler;
    return this;
  }

  isBound() {
    const rt = this.runtime;
    return typeof rt.handler === 'function' || Object.keys(rt.tools).length > 0;
  }

  /**
   * Run one step. ctx.toolId selects a bound extension when present.
   * @param {object} ctx
   * @param {object} bag — accumulated revolution state from prior steps
   */
  run(ctx, bag) {
    const rt = this.runtime;
    const toolId = ctx && ctx.toolId ? String(ctx.toolId) : null;
    const handler = (toolId && rt.tools[toolId]) || rt.handler;
    if (typeof handler !== 'function') return Promise.resolve(null);
    const self = this;
    return Promise.resolve().then(function () { return handler(ctx, bag); })
      .then(function (result) {
        rt.runs++;
        rt.lastRun = new Date().toISOString();
        return result;
      })
      .catch(function (error) {
        const message = (error && error.message) || String(error);
        console.warn('[proto:loop-step] "' + self.primitive + '" failed:', message);
        return { error: message, primitive: self.primitive };
      });
  }

  report() {
    const rt = this.runtime;
    return {
      id: this.id,
      primitive: this.primitive,
      name: this.name,
      what: this.what,
      bound: this.isBound(),
      tools: Object.keys(rt.tools),
      runs: rt.runs,
      lastRun: rt.lastRun
    };
  }
}

function capitalize(value) {
  const text = String(value || '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function defaultWhat(primitive) {
  switch (primitive) {
    case 'detection':
      return 'Read durable state and name gaps, staleness, or contention — no external side effects.';
    case 'commitment':
      return 'Stage intent before mutation — proposals, allocations, or explicit auto-commit policy.';
    case 'execution':
      return 'Run bounded tools to produce ephemeral work product.';
    case 'observation':
      return 'Register canonical outcomes by UUID and extend the epistemic graph.';
    default:
      return '';
  }
}

module.exports = {
  PRIMITIVES: PRIMITIVES,
  LoopStep: LoopStep
};
