'use strict';

/**
 * lib/proto/epistemic-scope.js — the EpistemicScope CLASS (the roll-up key).
 *
 * An EpistemicScope is the scope axis of belief. Session → agent → agency
 * is the operational roll-up; principal is the human-wide scope shared by
 * every app and agent that serves that user. Identity claims live there:
 * changing apps or opening a Session cannot produce a second person.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0084 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class EpistemicScope {
  /**
   * @param {object} raw — { scope_type (session | agent | agency | principal),
   *                         scope_id, parent_scope?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (['session', 'agent', 'agency', 'principal'].indexOf(raw.scope_type) < 0) {
      throw new Error('[proto:epistemic-scope] scope_type must be one of session | agent | agency | principal');
    }
    if (!String(raw.scope_id || '').trim()) {
      throw new Error('[proto:epistemic-scope] scope_id is required');
    }
    if (raw.scope_type === 'session' && !raw.parent_scope) {
      throw new Error('[proto:epistemic-scope] a session scope must be parented (to its agent)');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:EpistemicScope' }, raw));
    if (violations.length) {
      throw new Error('[proto:epistemic-scope] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() {
    return this.scope_type + ':' + this.scope_id + (this.parent_scope ? ' \u2192 ' + this.parent_scope : '');
  }
}

module.exports = EpistemicScope;
