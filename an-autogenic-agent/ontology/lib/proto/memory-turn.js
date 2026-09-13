'use strict';

/**
 * lib/proto/memory-turn.js — the MemoryTurn CLASS (durable grown instances).
 *
 * One persisted conversation turn — the durable store's row, reified. The
 * third conversion (locked recipe), and the first DURABLE grown case:
 * memory-store constructs a validated MemoryTurn at every append (the write
 * gate) and re-wraps rows into instances at every read, so persisted memory
 * flows through the system as real objects, not bare rows.
 *
 * Canonical shape: { agent, session, channel, role, content, at? } — `at`
 * is optional at construction (the database assigns created_at on insert).
 * Validation via the shared Layer A binding (classes.ontology()); instances
 * freeze. NOTE the store's append() contract is fire-and-forget (a memory
 * write must never break the chat stream) — construction failures there are
 * logged loud with their OEP codes and resolve false, not thrown.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0023 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class MemoryTurn {
  /**
   * @param {object} raw — { agent, session, channel, role, content, at? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:MemoryTurn' }, raw));
    if (violations.length) {
      throw new Error('[proto:memory-turn] OEP violations (' + (raw.role || '?') + '@' + (raw.session || '?') + '): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** Whether the user (vs the agent) spoke this turn. */
  isUser() { return this.role === 'user'; }

  /** Whether the turn arrived over the voice channel. */
  isSpoken() { return this.channel === 'voice'; }

  /** The RECENT MEMORY block line — one turn, compacted for the prompt. */
  line() {
    return '- ' + (this.isUser() ? 'User' : 'You') +
      (this.isSpoken() ? ' (spoken)' : '') + ': ' +
      String(this.content).replace(/\s+/g, ' ').slice(0, 240);
  }
}

module.exports = MemoryTurn;
