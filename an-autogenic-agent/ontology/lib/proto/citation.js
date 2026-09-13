'use strict';

/**
 * lib/proto/citation.js — the Citation CLASS (the documents workspace).
 *
 * A Citation is a bibliographic link — READ-CONSTRUCTED by harvesting
 * [@key] tokens from a draft's prose (the paper-family standard's cite
 * keys). matchedBy records the harvest rule.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0091 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Citation {
  /**
   * @param {object} raw — { key, draft?, count?, matchedBy?, authors?, year?, target? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Citation' }, raw));
    if (violations.length) {
      throw new Error('[proto:citation] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);

    Object.freeze(this);
  }

  label() { return '[@' + this.key + ']' + (this.count > 1 ? ' \u00d7' + this.count : ''); }
}

module.exports = Citation;
