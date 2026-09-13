'use strict';

/**
 * lib/proto/ravar-step.js — one primitive in the Declared RaVaR loop.
 *
 * Render, And, and Verify are three invariant step classes for deliverable
 * tool loops (ADR 0045). Domain organs bind handlers; Retry is orchestration
 * inside DeclaredRaVaRLoop.run(), not a fourth bindable step class.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0132 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const PRIMITIVES = Object.freeze(['render', 'and', 'verify']);

// ── The class ───────────────────────────────────────────────────────────────

class RaVaRStep {
  /**
   * @param {object} raw — { id?, primitive, name?, what?, pathId? }
   */
  constructor(raw) {
    raw = raw || {};
    const primitive = String(raw.primitive || raw.id || '');
    if (PRIMITIVES.indexOf(primitive) < 0) {
      throw new Error('[proto:ravar-step] primitive must be one of '
        + PRIMITIVES.join('|') + ' (got "' + primitive + '")');
    }
    const violations = require('./classes').ontology().validate({
      '@type': 'mach33:RaVaRStep',
      id: raw.id || primitive,
      primitive: primitive,
      name: raw.name || capitalize(primitive),
      what: raw.what || defaultWhat(primitive)
    });
    if (violations.length) {
      throw new Error('[proto:ravar-step] OEP violations for "' + primitive + '": '
        + violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    this.id = raw.id || primitive;
    this.primitive = primitive;
    this.name = raw.name || capitalize(primitive);
    this.what = raw.what || defaultWhat(primitive);
    this.pathId = raw.pathId || null;
    this.runtime = { handler: null, runs: 0, lastRun: null };
    Object.freeze(this);
  }

  bind(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('[proto:ravar-step] bind() needs a function');
    }
    this.runtime.handler = handler;
    return this;
  }

  isBound() {
    return typeof this.runtime.handler === 'function';
  }

  /**
   * @param {object} ctx
   * @param {object} bag — accumulated loop state
   */
  run(ctx, bag) {
    const rt = this.runtime;
    const handler = rt.handler;
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
        console.warn('[proto:ravar-step] "' + self.primitive + '" failed:', message);
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
      pathId: this.pathId,
      bound: this.isBound(),
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
    case 'render':
      return 'Run a declared render path — specialist compose, renderer, or fetch.';
    case 'and':
      return 'Enrich and normalize — render_ref, mime, stable id.';
    case 'verify':
      return 'Gate on objective checks before a receipt is attached.';
    default:
      return '';
  }
}

module.exports = {
  PRIMITIVES: PRIMITIVES,
  RaVaRStep: RaVaRStep
};
