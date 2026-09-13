'use strict';

/**
 * lib/proto/thalamus.js — the Thalamus CLASS (the trunk).
 *
 * The Thalamus is the agent's signal trunk — brainstem + thalamus
 * combined: the ONE relay all sensor and motor traffic routes through
 * (except the olfactory bypass — kernel conformance to limbic, ADR 0016),
 * and the autonomic scheduler the beating loops belong to. Every full
 * agent HAS one (like Voice, like Chat) — the organ lives in the ontology;
 * how it is deployed (in-process, or the vega-live service) is
 * realization, not category. This is the ORGAN RECORD; the Attention
 * object and the gating physiology are ADR 0016, not built here.
 *
 * The three rings, with honest status:
 *   in-process (ring 1) — planned (the internal emitter is not built)
 *   instances  (ring 2) — live (tc_bus / BusEvent NOTIFY)
 *   fleet      (ring 3) — available (vega-live, external WS broadcast)
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0100 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Thalamus {
  /**
   * @param {object} raw — { rings[] { id, status, transport }, scope? }
   * @throws {Error} OEP violations / malformed rings — fails loud.
   */
  constructor(raw) {
    raw = raw || {};
    if (!Array.isArray(raw.rings) || raw.rings.length < 1) {
      throw new Error('[proto:thalamus] a trunk has rings — required');
    }
    raw.rings.forEach(function (r) {
      if (['live', 'available', 'planned'].indexOf(r.status) < 0) {
        throw new Error('[proto:thalamus] ring status must be live | available | planned (got "' + r.status + '")');
      }
    });
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Thalamus' }, raw));
    if (violations.length) {
      throw new Error('[proto:thalamus] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    this.rings.forEach(Object.freeze);
    Object.freeze(this.rings);
    Object.freeze(this);
  }

  /** A ring by id (the transport binding). */
  ring(id) { return this.rings.filter(function (r) { return r.id === id; })[0] || null; }

  /** Whether a ring's transport is running now. */
  isLive(id) { var r = this.ring(id); return !!(r && r.status === 'live'); }

  label() {
    return 'trunk — ' + this.rings.map(function (r) { return r.id + ':' + r.status; }).join(', ');
  }
}

// ── The inherited ring bindings — the three rings, honest status ────────────
const BASE_RINGS = [
  { id: 'in-process', status: 'planned',   transport: 'internal emitter (ADR 0016)' },
  { id: 'instances',  status: 'live',      transport: 'tc_bus — BusEvent NOTIFY' },
  { id: 'fleet',      status: 'available',  transport: 'vega-live — external WS broadcast' }
];

module.exports = Thalamus;
module.exports.BASE_RINGS = BASE_RINGS;
