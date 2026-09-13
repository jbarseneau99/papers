'use strict';

/**
 * lib/proto/link-preview.js — the LinkPreview CLASS (the Commons, batch B).
 *
 * A LinkPreview is cached OG metadata a message body unfurls to.
 * Write gate: the preview cache put.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0055 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class LinkPreview {
  /**
   * @param {object} raw — { url, status, title?, description?, image?, site? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:LinkPreview' }, raw));
    if (violations.length) {
      throw new Error('[proto:link-preview] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  isOk() { return this.status === 'ok'; }
  label() { return this.url + ' [' + this.status + ']'; }
}

module.exports = LinkPreview;
