'use strict';

/**
 * lib/proto/memory-system.js — the MemorySystem CLASS (the three systems).
 *
 * The twenty-second conversion. A MemorySystem is the DESCRIPTION of one of
 * the mind's three memory systems — working (read first, holds the
 * registers), episodic (the concentric shells, Birth-anchored), semantic
 * (the belief graph) — with its retrieval discipline and what it reads.
 *
 * BOUNDARY (recipe step 8): a MemorySystem is the system; a Register is a
 * per-turn slice a system HOLDS; the stores (memory-store, epistemic-store)
 * are MECHANISMS that realize systems. Three different classes on purpose.
 *
 * The three ship as inherited instances (frozen, constructed at load);
 * proto._memorySystems() projects PLAIN COPIES because its consumers
 * enrich them per agent (the panel attaches envelopes and flips liveness).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0044 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const KINDS = ['working', 'episodic', 'semantic'];

// ── The class ───────────────────────────────────────────────────────────────
class MemorySystem {
  /**
   * @param {object} raw — { id: working|episodic|semantic, label, note,
   *                         state?, reads?, retrieval?, shells?, anchors? }
   * @throws {Error} OEP violations / unknown kind — fails loud.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:MemorySystem' }, raw));
    if (violations.length) {
      throw new Error('[proto:memory-system] OEP violations ("' + (raw.id || '?') + '"): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (KINDS.indexOf(raw.id) < 0) {
      throw new Error('[proto:memory-system] id must be one of ' + KINDS.join('|') + ' (got "' + raw.id + '")');
    }
    Object.assign(this, raw);
    if (Array.isArray(this.shells)) { this.shells.forEach(Object.freeze); Object.freeze(this.shells); }
    if (Array.isArray(this.anchors)) { this.anchors.forEach(Object.freeze); Object.freeze(this.anchors); }
    Object.freeze(this);
  }

  /** Which system this one reads from (working reads episodic). */
  readsFrom(id) { return this.reads === id; }

  /** A plain, mutable projection — for consumers that enrich per agent. */
  toProjection() { return JSON.parse(JSON.stringify(this)); }

  label_() { return this.label + ' (' + this.id + ')'; }
}

// ── The three systems — inherited instances ────────────────────────────────
const BASE_MEMORY_SYSTEMS = [
  new MemorySystem({ id: 'working', label: 'Working Memory', state: 'partial',
    note: 'The active per-turn context — assembled fresh each turn and read FIRST. Holds the current episode in full plus summaries of many past episodes, active relationships, goals, affect — and in live conversation, two registers: turn-state (who is speaking, whether it was interrupted, what was left unsaid) and the delivery register (channel, tone baseline, the user’s current style — what informs HOW the next line should land, feeding the delivery marks).',
    reads: 'episodic',
    retrieval: 'Summaries first: it reasons over the compressed outer shells already loaded here, and only retrieves a specific episode’s full detail from long-term Episodic when a summary is not enough.' }),
  new MemorySystem({ id: 'episodic', label: 'Episodic', state: 'partial',
    note: 'Autobiographical memory as concentric shells — anchored at Birth, bounded by the Life envelope. Newest episodes form at the centre in full detail; as they age they roll outward into short summaries.',
    anchors: [
      { k: 'Birth', v: 'The origin — when the agent came into being; its own timeline starts here.' },
      { k: 'Life envelope', v: 'The outermost shell — its whole existence beyond any single session (its “outside life”).' }
    ],
    // The shells are TimePeriod instances (label/grain stay as aliases
    // for the panel projections).
    shells: [
      { kind: 'Life', span: 'lifetime', mode: 'summary' },
      { kind: 'Year', span: 'months', mode: 'summary' },
      { kind: 'Month', span: 'weeks', mode: 'summary' },
      { kind: 'Week', span: 'days', mode: 'summary' },
      { kind: 'Day', span: 'hours', mode: 'summary' },
      { kind: 'Hour', span: 'turns', mode: 'summary' },
      { kind: 'Now', span: 'this session', mode: 'full detail' }
    ].map(function (sh) {
      return new (require('./time-period'))(Object.assign({ label: sh.kind, grain: sh.span }, sh));
    }) }),
  new MemorySystem({ id: 'semantic', label: 'Semantic', state: 'partial',
    note: 'The belief graph — durable facts the agent holds true, abstracted from episodes and held across sessions.' })
];

module.exports = MemorySystem;
module.exports.BASE_MEMORY_SYSTEMS = BASE_MEMORY_SYSTEMS;
module.exports.KINDS = Object.freeze(KINDS);
