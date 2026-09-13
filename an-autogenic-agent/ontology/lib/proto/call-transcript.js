'use strict';

/**
 * lib/proto/call-transcript.js — the CallTranscript CLASS (the Commons, batch B).
 *
 * A CallTranscript is one spoken utterance of a call, timestamped from
 * the call start. Write gate: the transcription ingest route.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0056 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class CallTranscript {
  /**
   * @param {object} raw — { call, channel, speaker, text, ts_offset_ms?, speaker_name? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:CallTranscript' }, raw));
    if (violations.length) {
      throw new Error('[proto:call-transcript] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return (this.speaker_name || this.speaker) + ' @' + (this.ts_offset_ms || 0) + 'ms: ' + String(this.text).slice(0, 40); }
}

module.exports = CallTranscript;
