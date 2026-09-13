'use strict';

/**
 * lib/proto/code-object.js — the Code CLASS (the body IS its code).
 *
 * A Code object is one source file of the agent's body, carrying its
 * IMMUTABLE ref (M33C-#### — assigned once, never edited or reused; the
 * header \u2194 registry match is test-enforced) and its contents KIND from
 * the locked vocabulary. The 98 BASE_CODE entries construct through this
 * class at load — the oldest law in the repo, finally classed.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0099 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const KINDS = ['class definition', 'class definitions', 'inherited instances', 'mechanism',
  'organ', 'view', 'store', 'module index', 'agent instantiation'];

// ── The class ───────────────────────────────────────────────────────────────
class Code {
  constructor(raw) {
    raw = raw || {};
    if (!/^M33C-\d{4}$/.test(raw.ref || '')) {
      throw new Error('[proto:code] ref must be an immutable M33C-#### (got "' + raw.ref + '")');
    }
    var bad = String(raw.contents || '').split(' \u00b7 ').filter(function (k) { return KINDS.indexOf(k) < 0; });
    if (bad.length) {
      throw new Error('[proto:code] unknown contents kind: ' + bad.join(', '));
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Code' }, raw));
    if (violations.length) {
      throw new Error('[proto:code] OEP violations (' + raw.ref + '): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  isView() { return String(this.contents).indexOf('view') >= 0; }
  label() { return this.ref + ' ' + this.name + ' [' + this.contents + ']'; }
}

module.exports = Code;
module.exports.KINDS = KINDS;
