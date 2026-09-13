'use strict';

/**
 * lib/proto/attachment.js — the Attachment CLASS (the Commons, batch B).
 *
 * An Attachment is a file carried by a message — staged, then linked
 * on send. Write gate: attachments record insert.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0054 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Attachment {
  /**
   * @param {object} raw — { filename, content_type, storage_key, size?, channel?, user? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Attachment' }, raw));
    if (violations.length) {
      throw new Error('[proto:attachment] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  isImage() { return /^image\//.test(this.content_type || ''); }
  label() { return this.filename + ' (' + this.content_type + ')'; }
}

module.exports = Attachment;
