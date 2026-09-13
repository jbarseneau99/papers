'use strict';

/**
 * lib/proto/loop.js — the Loop CLASS (the behavioral upgrade).
 *
 * The fourth conversion (locked recipe) — and the first UPGRADE: loops stop
 * being descriptions and gain the behavioral contract ADR 0014 §7 promised.
 * A Loop instance carries its invariant definition (loopClass, cadence,
 * phase, the faculties it engages) AND a live runtime: bind(handler) wires
 * what the loop does; run(ctx) executes with bookkeeping (runs, lastRun,
 * streak, errors — a failing handler records and resets the streak, never
 * throws into the host); report() is the glass-box summary the panel and
 * telemetry read.
 *
 * Freezing is deliberate and SHALLOW: the definition fields are invariant
 * (kernel law), but `runtime` is a mutable inner object — a loop that runs
 * must be able to remember that it ran. faculties.js therefore deep-freezes
 * LOOP_DATA (the literals), never the constructed instances.
 *
 * The episodic roll-up — the first background loop that actually RUNS —
 * binds through exactly this contract.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0024 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Loop {
  /**
   * @param {object} raw — { id, name, what, loopClass, cadence, level?,
   *                         phase?, mode?, faculties?, state? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Loop' }, raw));
    if (violations.length) {
      throw new Error('[proto:loop] OEP violations for "' + (raw.id || '?') + '": ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    // Runtime bookkeeping — deliberately mutable behind the frozen surface.
    this.runtime = { handler: null, runs: 0, lastRun: null, streak: 0, errors: 0, lastError: null };
    Object.freeze(this);
  }

  /** Wire what this loop DOES. Returns this (chainable at assembly). */
  bind(handler) {
    if (typeof handler !== 'function') throw new TypeError('[proto:loop] bind() needs a function');
    this.runtime.handler = handler;
    return this;
  }

  /** A loop is live-runnable once something is bound. */
  isBound() { return typeof this.runtime.handler === 'function'; }

  /**
   * Execute one revolution with bookkeeping. A failing handler records the
   * error and resets the streak — it never throws into the host (a broken
   * background loop must not take the agent down with it).
   * @returns {Promise<*>} the handler's result; null when unbound;
   *                       { error } on failure.
   */
  run(ctx) {
    const rt = this.runtime;
    if (!rt.handler) return Promise.resolve(null);
    const self = this;
    return Promise.resolve().then(function () { return rt.handler(ctx); })
      .then(function (result) {
        rt.runs++; rt.streak++; rt.lastRun = new Date().toISOString();
        return result;
      })
      .catch(function (e) {
        rt.errors++; rt.streak = 0; rt.lastError = (e && e.message) || String(e);
        console.warn('[proto:loop] "' + self.id + '" run failed:', rt.lastError);
        return { error: rt.lastError };
      });
  }

  /** Glass-box summary — what the panel, telemetry and Constitution read. */
  report() {
    const rt = this.runtime;
    return {
      id: this.id, name: this.name, loopClass: this.loopClass,
      cadence: this.cadence, phase: this.phase || null, state: this.state,
      bound: this.isBound(), runs: rt.runs, lastRun: rt.lastRun,
      streak: rt.streak, errors: rt.errors, lastError: rt.lastError
    };
  }
}

module.exports = Loop;
