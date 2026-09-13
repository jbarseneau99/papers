'use strict';

/**
 * lib/proto/affect-state.js — the AffectState CLASS (the Self wave).
 *
 * An AffectState is a felt state on the Russell circumplex — RECORDED,
 * not performed (the catalog's law). Grown at runtime via Proto.recordAffect
 * (the set_affective_state capability's write path); valence/arousal are
 * -1..1, intensity 0..1.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0061 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class AffectState {
  /**
   * @param {object} raw — { mood, intensity? (0..1), valence? (-1..1), arousal? (-1..1), at? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    ['valence', 'arousal'].forEach(function (k) {
      if (raw[k] != null && !(typeof raw[k] === 'number' && raw[k] >= -1 && raw[k] <= 1)) {
        throw new Error('[proto:affect-state] ' + k + ' must be -1..1 when present');
      }
    });
    if (raw.intensity != null && !(typeof raw.intensity === 'number' && raw.intensity >= 0 && raw.intensity <= 1)) {
      throw new Error('[proto:affect-state] intensity must be 0..1 when present');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:AffectState' }, raw));
    if (violations.length) {
      throw new Error('[proto:affect-state] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.mood + (this.intensity != null ? ' @' + this.intensity : ''); }

  /** The awareness line — the felt state, projected into the prompt head. */
  line() {
    var va = [this.valence != null ? 'v' + this.valence : null, this.arousal != null ? 'a' + this.arousal : null].filter(Boolean).join('/');
    return 'felt state: ' + this.mood + (va ? ' (' + va + ')' : '');
  }
}

module.exports = AffectState;
