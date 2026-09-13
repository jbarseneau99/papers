'use strict';

/**
 * lib/proto/action-item.js — the ActionItem CLASS (the Boundary wave).
 *
 * An ActionItem is an external directive or commitment — Finding's
 * outward-facing complement. Write-gated at BOTH meeting-task writers
 * (team-chat call end AND Relay's meeting-summarizer child): one class,
 * both — the CallSummary precedent.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0065 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class ActionItem {
  /**
   * @param {object} raw — { summary, shape?, party?, status?, channel?, message?, source? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.shape != null && ['directive', 'commitment', 'task'].indexOf(raw.shape) < 0) {
      throw new Error('[proto:action-item] shape must be one of directive | commitment | task');
    }
    if (!String(raw.summary || '').trim()) {
      throw new Error('[proto:action-item] summary must be non-empty');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:ActionItem' }, raw));
    if (violations.length) {
      throw new Error('[proto:action-item] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return (this.shape || 'task') + (this.party ? ' for ' + this.party : '') + ': ' + String(this.summary).slice(0, 50); }
}

module.exports = ActionItem;
