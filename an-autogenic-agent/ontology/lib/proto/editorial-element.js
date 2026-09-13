'use strict';

/**
 * lib/proto/editorial-element.js — the EditorialElement CLASS (the documents workspace).
 *
 * An EditorialElement is a figure, table, code block or callout
 * anchored in a draft — READ-CONSTRUCTED by parsing the draft's markdown
 * (never stored; the prose is the single source).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0088 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class EditorialElement {
  /**
   * @param {object} raw — { type (figure | table | code | callout), anchor, draft?, detail? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (['figure', 'table', 'code', 'callout'].indexOf(raw.type) < 0) {
      throw new Error('[proto:editorial-element] type must be one of figure | table | code | callout');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:EditorialElement' }, raw));
    if (violations.length) {
      throw new Error('[proto:editorial-element] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);

    Object.freeze(this);
  }

  label() { return this.type + ' @ ' + this.anchor + (this.detail ? ' — ' + String(this.detail).slice(0, 40) : ''); }
}

module.exports = EditorialElement;
