'use strict';

/**
 * lib/proto/element-renderer.js — ElementRenderer CLASS (element-render REQ §3.6).
 *
 * Abstract renderer contract; procedural registry rows in lib/element-render/registry.js
 * until renderer instances promote.
 *
 * Contents: class definition
 * Ontology: Code object M33C-0130 (immutable ref — assigned once, never edit)
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

class ElementRenderer {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:ElementRenderer' }, raw));
    if (violations.length) {
      throw new Error('[proto:element-renderer] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (!raw.renderer_id) throw new Error('[proto:element-renderer] renderer_id is required');
    this.renderer_id = String(raw.renderer_id);
    this.description = raw.description != null ? String(raw.description) : '';
    this.formats = Array.isArray(raw.formats) ? raw.formats.slice() : [];
    Object.freeze(this.formats);
    Object.freeze(this);
  }

  supports(format) {
    return this.formats.indexOf(String(format || '').toLowerCase()) >= 0;
  }
}

module.exports = ElementRenderer;
