'use strict';

/**
 * lib/proto/expression.js — the Expression CLASS (the HEARD layer).
 *
 * The seventh conversion — completing the trio the naming discussion drew:
 * the agent's AffectState (felt) informs its DeliveryMarks (written), which
 * the voice renders as EXPRESSION (heard). An Expression is the record of
 * that rendering: how a specific mark performs on a specific provider/voice
 * — strong, weak, none, or untested — and who verified it. The capability
 * boundary the user's ear discovers stops being tribal memory and becomes
 * ontology data the prompt can lean on.
 *
 * The base ships 21 instances (one grade per house mark, on the ElevenLabs
 * path): the ear-validated marks carry `strong` with their provenance; the
 * rest are honestly `untested` until a meter session grades them. Grades
 * are DATA — regrading is a commit, same law as the state ladder.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0027 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const RENDERS = ['strong', 'weak', 'none', 'untested'];

// ── The class ───────────────────────────────────────────────────────────────
class Expression {
  /**
   * @param {object} raw — { mark, provider, renders, voiceId?, verifiedBy?, note? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Expression' }, raw));
    if (violations.length) {
      throw new Error('[proto:expression] OEP violations (' + (raw.mark || '?') + '@' + (raw.provider || '?') + '): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (RENDERS.indexOf(raw.renders) < 0) {
      throw new Error('[proto:expression] OEP violations (' + raw.mark + '): renders must be one of ' + RENDERS.join('|'));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** Ear-verified (either direction) — as opposed to still untested. */
  isVerified() { return this.renders !== 'untested'; }

  /** The roster line: "whispers @ elevenlabs: strong". */
  label() { return this.mark + ' @ ' + this.provider + ': ' + this.renders; }
}

Expression.RENDERS = Object.freeze(RENDERS);

module.exports = Expression;
