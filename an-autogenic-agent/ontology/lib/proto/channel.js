'use strict';

/**
 * lib/proto/channel.js — the Channel CLASS (the Commons, batch A).
 *
 * A Channel is a named room of the Commons — public, private, or a DM;
 * membership is access. The write gate sits at channels.create/ensureDm.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0046 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Channel {
  /**
   * @param {object} raw — { name, visibility: public|private, topic?, is_dm?, is_default?, created_by? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.visibility !== 'public' && raw.visibility !== 'private') {
      throw new Error('[proto:channel] visibility must be public|private ("' + (raw.name || '?') + '")');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Channel' }, raw));
    if (violations.length) {
      throw new Error('[proto:channel] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  isDm() { return !!this.is_dm; }
  label() { return '#' + this.name + ' (' + this.visibility + (this.is_dm ? ', dm' : '') + ')'; }
}

module.exports = Channel;
