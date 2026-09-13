'use strict';

/**
 * lib/proto/render-result.js — RenderResult CLASS (element-render REQ §3.5).
 *
 * Artifact ref + request_hash + receipt + structured error from RenderService.
 *
 * Contents: class definition
 * Ontology: Code object M33C-0129 (immutable ref — assigned once, never edit)
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

class RenderResult {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:RenderResult' }, raw));
    if (violations.length) {
      throw new Error('[proto:render-result] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (raw.ok && !raw.request_hash) {
      throw new Error('[proto:render-result] ok results require request_hash');
    }
    this.ok = !!raw.ok;
    this.request_hash = raw.request_hash || null;
    this.artifact_url = raw.artifact_url || null;
    this.artifact_sha256 = raw.artifact_sha256 || null;
    this.mime = raw.mime || null;
    this.renderer_id = raw.renderer_id || null;
    this.cache_hit = !!raw.cache_hit;
    this.error = raw.error || null;
    this.offender = raw.offender || null;
    this.intrinsic_size = raw.intrinsic_size || null;
    Object.freeze(this);
  }

  static fromService(out) {
    return new RenderResult(out || { ok: false, error: 'empty' });
  }
}

module.exports = RenderResult;
