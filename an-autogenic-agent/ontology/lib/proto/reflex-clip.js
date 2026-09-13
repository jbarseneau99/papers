'use strict';

/**
 * lib/proto/reflex-clip.js — the ReflexClip CLASS (pre-rendered reflexes).
 *
 * A ReflexClip is something the voice says WITHOUT thinking — a yield when
 * barged in, a filler over a tool wait, a backchannel murmur while the user
 * speaks. The eighth conversion: the three banks in voice/dynamics/ stop
 * being plain literals and construct 43 validated, frozen instances at
 * module load (10 yields · 12 fillers · 21 backchannels). Consumers read
 * the same fields (phrase, fits, tier, ttsText); nothing downstream moves.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0028 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class ReflexClip {
  /**
   * @param {object} raw — { bank: 'yield'|'filler'|'backchannel', phrase,
   *                         ttsText?, tier?, fits?, audioRef? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:ReflexClip' }, raw));
    if (violations.length) {
      throw new Error('[proto:reflex-clip] OEP violations ("' + (raw.phrase || '?') + '"): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** The roster line: '“one sec.” (filler)'. */
  label() { return '“' + this.phrase + '” (' + this.bank + ')'; }

  /** Whether the clip suits a given mood/register word. */
  fitsMood(mood) { return Array.isArray(this.fits) && this.fits.indexOf(mood) >= 0; }
}

module.exports = ReflexClip;
