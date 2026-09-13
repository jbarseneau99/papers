'use strict';

/**
 * lib/proto/render-context.js — RenderContext CLASS (element-render REQ §3.3).
 *
 * Host-supplied preamble, palette, assets, and dimensions — content-hashed
 * into the render request.
 *
 * Contents: class definition
 * Ontology: Code object M33C-0127 (immutable ref — assigned once, never edit)
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

class RenderContext {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:RenderContext' }, raw));
    if (violations.length) {
      throw new Error('[proto:render-context] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    this.document_id = raw.document_id || null;
    this.preamble = raw.preamble != null ? String(raw.preamble) : '';
    this.palette = raw.palette || {};
    this.assets = raw.assets || {};
    this.page_width_pt = raw.page_width_pt != null ? Number(raw.page_width_pt) : null;
    this.page_height_pt = raw.page_height_pt != null ? Number(raw.page_height_pt) : null;
    Object.freeze(this);
  }
}

module.exports = RenderContext;
