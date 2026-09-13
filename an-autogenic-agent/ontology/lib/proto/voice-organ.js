'use strict';

/**
 * lib/proto/voice-organ.js — the Voice CLASS (the agent's larynx).
 *
 * The tenth conversion — and the first whose PRIMARY origin is `declared`:
 * an agent's self.voice (its voiceId, tone, engine, stance, length) wraps
 * into a validated Voice instance at assembly, so a malformed larynx dies
 * at boot like a bad faculty does. All fields are optional by schema —
 * the fleet declares different subsets (the demo has voiceId 'rex' + tone;
 * MachAgency declares only stance + length) — the value is the validated,
 * frozen shape and the single place larynx facts live.
 *
 * (File is voice-organ.js, not voice.js: a voice.js would shadow the
 * lib/proto/voice/ directory in require resolution.)
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0030 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Voice {
  /**
   * @param {object} raw — { voiceId?, tone?, engine?, stance?, length?,
   *                         speechRate?, accent? } — accent is a standing
   *                         delivery instruction (e.g. 'very strong Scottish
   *                         accent, Glasgow'); the ElevenLabs path prepends
   *                         it per clip, so it reapplies every sentence.
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Voice' }, raw));
    if (violations.length) {
      throw new Error('[proto:voice-organ] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** The larynx line: "rex (realtime)" / "unvoiced". */
  label() {
    if (!this.voiceId) return 'unvoiced' + (this.engine ? ' (' + this.engine + ')' : '');
    return this.voiceId + (this.engine ? ' (' + this.engine + ')' : '');
  }
}

module.exports = Voice;
