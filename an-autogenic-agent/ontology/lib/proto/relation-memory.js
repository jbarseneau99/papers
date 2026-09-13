'use strict';

/**
 * lib/proto/relation-memory.js — the RelationMemory CLASS (the grown ledgers).
 *
 * A RelationMemory is a memory attached to a person — about them, or
 * how they relate. Grown via Proto.recordRelationMemory into a capped
 * ledger (glass-box /api/relations/memories). The person need NOT already
 * be a Relation — remembering someone new is how relations begin.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0073 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class RelationMemory {
  /**
   * @param {object} raw — { about, text, at?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (!String(raw.text || '').trim()) {
      throw new Error('[proto:relation-memory] text must be non-empty');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:RelationMemory' }, raw));
    if (violations.length) {
      throw new Error('[proto:relation-memory] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.about + ': ' + String(this.text).slice(0, 60); }
}

module.exports = RelationMemory;
