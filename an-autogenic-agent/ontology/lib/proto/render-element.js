'use strict';

/**
 * lib/proto/render-element.js — RenderElement CLASS (element-render REQ §3.2).
 *
 * Grammar-typed leaf + content + dependency manifest, or document node pointer
 * for isolation reads. Procedural organ: lib/element-render/types.js until
 * callers adopt instances.
 *
 * Contents: class definition
 * Ontology: Code object M33C-0126 (immutable ref — assigned once, never edit)
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const grammar = require('../document-grammar');

class RenderElement {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:RenderElement' }, raw));
    if (violations.length) {
      throw new Error('[proto:render-element] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (!raw.type && !(raw.document_id && raw.node_id)) {
      throw new Error('[proto:render-element] type or (document_id + node_id) required');
    }
    if (raw.type && !grammar.isLeaf(raw.type) && raw.type !== 'figure' && raw.type !== 'content') {
      throw new Error('[proto:render-element] unknown grammar type: ' + raw.type);
    }
    this.type = raw.type;
    this.medium = raw.medium != null ? raw.medium : (grammar.mediumOf(raw.type) || null);
    this.content = raw.content;
    this.dependency_manifest = raw.dependency_manifest || null;
    this.document_id = raw.document_id || null;
    this.node_id = raw.node_id || null;
    Object.freeze(this);
  }

  static fromTypes(input) {
    const built = require('../element-render/types').buildRenderElement(input || {});
    return new RenderElement(built);
  }
}

module.exports = RenderElement;
