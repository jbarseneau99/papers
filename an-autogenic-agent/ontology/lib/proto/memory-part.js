'use strict';

/**
 * lib/proto/memory-part.js — the MemoryPart CLASS (working memory's parts).
 *
 * Working memory is a committee (Baddeley's multi-component model, extended):
 * seven PARTS, each with its own physics — what it holds, who writes it, how
 * it decays, who consumes it. The parts are the inherited instances below (the committee);
 * their registers are the physiology that fills in (designed in the
 * working-memory design session, 2026-07-06; ADR to follow).
 *
 * Contents: class definition · inherited instances.
 * Ontology: Code object M33C-0097 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class MemoryPart {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:MemoryPart' }, raw));
    if (violations.length) {
      throw new Error('[proto:memory-part] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.name + ' — ' + (this.holds || ''); }
}

// ── The six parts — the committee ───────────────────────────────────────────
const BASE_PARTS = [
  new MemoryPart({ id: 'discourse-loop',   name: 'Discourse Loop',
    holds: 'the turn window — what was just said', physics: 'FIFO + activation ranking',
    consumer: 'prompt assembly', lineage: 'Baddeley: phonological loop' }),
  new MemoryPart({ id: 'sketchpad',        name: 'Sketchpad',
    holds: 'pointers to the objects at hand (draft, finding, node)', physics: 'cliff — clears on focus change (governed by the Executive)',
    consumer: 'act paths', lineage: 'Baddeley: visuospatial sketchpad' }),
  new MemoryPart({ id: 'recall-buffer',    name: 'Recall Buffer',
    holds: 'memories retrieved into the present', physics: 'relevance-weighted decay',
    consumer: 'reasoning', lineage: 'Baddeley: episodic buffer' }),
  new MemoryPart({ id: 'executive',        name: 'Executive',
    holds: 'the control registers — focus, intent, interlocutor, open loops', physics: 'slow decay, SEVEN-register cap (Miller), maintained by the metacognitive loop',
    consumer: 'everything', lineage: 'Baddeley: central executive' }),
  new MemoryPart({ id: 'expression-buffer', name: 'Expression Buffer',
    holds: 'the felt state, the delivery register, marks recently performed, the active voice', physics: 'fast decay + repetition suppression (recent use lowers offer priority)',
    consumer: 'the speak arc, exclusively', lineage: 'extension: the voice\u2019s working memory' }),
  new MemoryPart({ id: 'relationship-buffer', name: 'Relationship Buffer',
    holds: 'who I am with — the interlocutor\u2019s ring, preferences, the social register in play', physics: 'primed from the Relations roster at assembly; slow decay, re-primed per session',
    consumer: 'the persona surface + the delivery register', lineage: 'extension: the social register' }),
  new MemoryPart({ id: 'temporal-buffer',  name: 'Temporal Buffer',
    holds: 'now, session tempo, the shell cursor, loop cadences', physics: 'computed at read \u2014 IS the clock every other part\u2019s decay law reads',
    consumer: 'the decay law itself', lineage: 'extension: now-awareness' })
];

module.exports = MemoryPart;
module.exports.BASE_PARTS = BASE_PARTS;
