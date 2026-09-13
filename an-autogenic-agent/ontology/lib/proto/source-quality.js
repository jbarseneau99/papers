'use strict';

/**
 * lib/proto/source-quality.js — the SourceQuality CLASS (grounds graded).
 *
 * The twentieth conversion. How trustworthy a source is (0..1) — the
 * grounds under the claims it feeds. Range-enforced like κ.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0041 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

class SourceQuality {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:SourceQuality' }, raw));
    if (violations.length) {
      throw new Error('[proto:source-quality] OEP violations ("' + (raw.source || '?') + '"): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    const sc = Number(raw.score);
    if (!(sc >= 0 && sc <= 1)) {
      throw new Error('[proto:source-quality] score must be 0..1 (got ' + raw.score + ')');
    }
    Object.assign(this, raw, { score: sc });
    Object.freeze(this);
  }
  label() { return this.source + ': ' + this.score; }
}

module.exports = SourceQuality;
