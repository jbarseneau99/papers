'use strict';

/**
 * lib/proto/relation.js — the Relation CLASS (a person on a ring).
 *
 * The twenty-third conversion. A Relation places a person on one of three
 * layers — host (the agent itself), counterpart (who it is talking to),
 * network (people the counterpart has named) — at a closeness ring 1..5
 * (the same concentric geometry as the episodic shells, applied to
 * people). Declared instances validate at assembly; addRelation() grows
 * them at runtime (the path Vega's add_relationship capability uses).
 *
 * BOUNDARY (recipe step 8): a Relation is the person-on-a-ring; a
 * Principal is an auth identity (possibly the same human — the modeled
 * edge); RelationMemory (planned) is memories ATTACHED to a person — the
 * `notes` string here is a field, not that class.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0045 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const LAYERS = ['host', 'counterpart', 'network'];

// ── The class ───────────────────────────────────────────────────────────────
class Relation {
  /**
   * @param {object} raw — { person, layer, relation, ring: 1..5, category?,
   *                         notes?, tags?, origin? }
   * @throws {Error} OEP violations / bad layer / ring out of range — loud.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.entityId != null && !require('./entity').UUID.test(String(raw.entityId))) {
      throw new Error('[proto:relation] entityId must be a UUID');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Relation' }, raw));
    if (violations.length) {
      throw new Error('[proto:relation] OEP violations ("' + (raw.person || '?') + '"): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (LAYERS.indexOf(raw.layer) < 0) {
      throw new Error('[proto:relation] layer must be ' + LAYERS.join('|') + ' ("' + raw.person + '")');
    }
    const ring = Number(raw.ring);
    if (!(Number.isInteger(ring) && ring >= 1 && ring <= 5)) {
      throw new Error('[proto:relation] ring must be an integer 1..5 (got ' + raw.ring + ' for "' + raw.person + '")');
    }
    Object.assign(this, raw, { ring: ring });
    Object.freeze(this);
  }

  /** Innermost ring — the closest people. */
  isInner() { return this.ring === 1; }

  /** The roster line: "Brant — AI Creator-Partner (counterpart, ring 1)". */
  label() { return this.person + ' — ' + this.relation + ' (' + this.layer + ', ring ' + this.ring + ')'; }

  /** The awareness line — the person and standing, projected into the prompt head. */
  line() { return this.person + ' — ' + this.relation + ' (ring ' + this.ring + ')'; }
}

Relation.LAYERS = Object.freeze(LAYERS);
module.exports = Relation;
