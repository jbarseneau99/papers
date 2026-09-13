'use strict';

/**
 * lib/proto/register.js — the Register CLASS (working-memory slices).
 *
 * A Register is a named slice of working memory held for the CURRENT TURN —
 * turn-state (the live voice session's clock) and the delivery register
 * (channel, tone baseline, user style, time of day) are its two running
 * realizations. Instances are GROWN and ephemeral: constructed fresh each
 * turn, read into the prompt, discarded — the first conversion to exercise
 * the recipe's "grown instances construct through the class" step
 * (Faculty covered inherited + declared).
 *
 * Shape is canonical: { id, scope, fields } — the id names the slice, the
 * scope says how long it lives ('turn'), the fields carry the data. The
 * constructor validates via the shared Layer A binding (classes.ontology())
 * and freezes both the instance and its fields.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0022 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Register {
  /**
   * @param {object} raw — { id, scope: 'turn', fields: {…} }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Register' }, raw));
    if (violations.length) {
      throw new Error('[proto:register] OEP violations for "' + (raw.id || '?') + '": ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.fields && typeof this.fields === 'object') Object.freeze(this.fields);
    Object.freeze(this);
  }

  /** One field's value (undefined when absent). */
  get(key) { return this.fields ? this.fields[key] : undefined; }

  /** Generic prose line: "id — k: v; k: v" (bespoke renderers may override). */
  line() {
    const f = this.fields || {};
    const bits = Object.keys(f).map(function (k) { return k + ': ' + f[k]; });
    return this.id + (bits.length ? ' — ' + bits.join('; ') : '');
  }
}

module.exports = Register;
