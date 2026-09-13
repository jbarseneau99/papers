'use strict';

/**
 * lib/proto/render-request.js — RenderRequest CLASS (element-render REQ §3.4).
 *
 * Element + context + output spec — the unit passed to RenderService.render().
 *
 * Contents: class definition
 * Ontology: Code object M33C-0128 (immutable ref — assigned once, never edit)
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const RenderElement = require('./render-element');
const RenderContext = require('./render-context');
const types = require('../element-render/types');

class RenderRequest {
  constructor(raw) {
    raw = raw || {};
    const oepPayload = {
      '@type': 'mach33:RenderRequest',
      element: raw.element || {
        type: raw.type,
        content: raw.content,
        document_id: raw.document_id,
        node_id: raw.node_id
      },
      context: raw.context || { document_id: raw.document_id },
      output: raw.output || { format: 'png' },
      claim: raw.claim
    };
    const violations = require('./classes').ontology().validate(oepPayload);
    if (violations.length) {
      throw new Error('[proto:render-request] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    const v = types.validateRequest(raw);
    if (!v.ok) throw new Error('[proto:render-request] ' + (v.error || 'invalid request'));
    const req = v.request;
    this.element = raw.element instanceof RenderElement
      ? raw.element
      : new RenderElement({
        type: req.type,
        content: req.content,
        document_id: req.document_id,
        node_id: req.node_id,
        dependency_manifest: req.dependency_manifest
      });
    this.context = raw.context instanceof RenderContext
      ? raw.context
      : new RenderContext({ document_id: req.document_id, preamble: raw.preamble || '' });
    this.output = req.output;
    this.claim = req.claim;
    Object.freeze(this);
  }

  toToolInput() {
    const el = this.element;
    return {
      document_id: el.document_id,
      node_id: el.node_id,
      type: el.type,
      content: el.content,
      dependency_manifest: el.dependency_manifest,
      output: this.output,
      claim: this.claim
    };
  }
}

module.exports = RenderRequest;
