'use strict';

/**
 * lib/proto/render-artifact.js — RenderArtifact CLASS (element-render REQ §3.7).
 *
 * Content-addressed render bytes — composes catalog Artifact (same request_hash
 * as element-render cache key; uri = artifact_url seam).
 *
 * Contents: class definition
 * Ontology: Code object M33C-0131 (immutable ref — assigned once, never edit)
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

class RenderArtifact {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:RenderArtifact' }, raw));
    if (violations.length) {
      throw new Error('[proto:render-artifact] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (!raw.request_hash) throw new Error('[proto:render-artifact] request_hash is required');
    this.request_hash = String(raw.request_hash);
    this.artifact_sha256 = raw.artifact_sha256 != null ? String(raw.artifact_sha256) : null;
    this.mime = raw.mime != null ? String(raw.mime) : 'application/octet-stream';
    this.uri = raw.uri || raw.artifact_url || ('/api/element-render/artifact/' + this.request_hash);
    this.renderer_id = raw.renderer_id || null;
    Object.freeze(this);
  }

  artifactRef() {
    return { kind: 'render', uri: this.uri, request_hash: this.request_hash };
  }
}

module.exports = RenderArtifact;
