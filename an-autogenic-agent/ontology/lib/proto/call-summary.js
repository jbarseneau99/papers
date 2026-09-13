'use strict';

/**
 * lib/proto/call-summary.js — the CallSummary CLASS (the Commons, batch B).
 *
 * A CallSummary is the post-call meeting card. BOUNDARY (step 8): the
 * atomic dedup CLAIM row (message_id 'pending', empty summary) is a mutex,
 * NOT a CallSummary — the class gates the FINAL summary write, which has
 * TWO writers (team-chat routes AND Relay's meeting-summarizer child): one
 * class, both.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0057 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class CallSummary {
  /**
   * @param {object} raw — { call, channel, summary, message? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (!String(raw.summary || '').trim()) {
      throw new Error('[proto:call-summary] summary must be non-empty (the dedup claim is a mutex, not a CallSummary)');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:CallSummary' }, raw));
    if (violations.length) {
      throw new Error('[proto:call-summary] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return 'call ' + this.call + ': ' + String(this.summary).slice(0, 50); }
}

module.exports = CallSummary;
