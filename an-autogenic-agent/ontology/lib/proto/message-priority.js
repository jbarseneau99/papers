'use strict';

/**
 * lib/proto/message-priority.js — the MessagePriority CLASS (the Commons wave).
 *
 * ONE CELL of the message priority matrix: a named factor, carrying a
 * decimal weight, in one of two dimensions —
 *
 *   timeline — factors of WHEN a message sits (recency, ordering, cadence)
 *   content  — factors of WHAT it says (topic, urgency, subject weight)
 *
 * It sits beside Message and is deliberately not part of it: a Message is a
 * thing somebody said, this is CONFIGURATION an operator tunes — the same
 * standing as ModelConfig prices the organ's invocations. Nothing here reads
 * a message, and the matrix carries no per-message state.
 *
 * Two things this class exists to refuse:
 *
 *   A WEIGHT THAT ARRIVED AS TEXT. Postgres hands `numeric` back as a
 *   STRING through node-postgres (there is no global type parser in this
 *   repo — see lib/model-configs/index.js, which coerces for the same
 *   reason). A string weight survives JSON, survives a panel, and then
 *   silently concatenates the first time a consumer adds it to another
 *   weight: '1.5' + 0.5 === '1.50.5'. The store coerces at the row seam;
 *   this class is what makes a missed coercion loud instead of arithmetic.
 *
 *   A DIMENSION OUTSIDE THE VOCABULARY. `type` is the matrix axis, not a
 *   label — a row typed 'timelines' belongs to no dimension and is read by
 *   nobody, which is a row that looks configured and does nothing.
 *
 * Weight is NOT inverted (contrast Designation, whose lower weight is more
 * senior): here higher weight means higher priority, and a negative weight
 * demotes. The default is 0 — named but not yet weighted, therefore inert.
 *
 * Write-gated at every message_priority_matrix writer (the admin create and
 * update routes) — one class, both paths: the Designation precedent.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0120 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── Vocabulary ──────────────────────────────────────────────────────────────
// Mirrors the CHECK constraints in
// db/migrations/1786957660_message_priority_matrix.sql. Kept here because
// this class is the gate the app writes through; the DB constraint is the
// backstop for anything that isn't this class.
const TYPES = ['timeline', 'content'];
const MIN_WEIGHT = -1000;
const MAX_WEIGHT = 1000;
// numeric(8,3) — the column's scale. Rounding here rather than letting
// Postgres do it silently means the instance in memory and the row on disk
// carry the SAME number, so a read-back never contradicts what was written.
const SCALE = 3;

function _round(n) {
  const f = Math.pow(10, SCALE);
  return Math.round(n * f) / f;
}

// ── The class ───────────────────────────────────────────────────────────────
class MessagePriority {
  /**
   * @param {object} raw — { type, name, weight?, id?, created_at?, updated_at? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    if (TYPES.indexOf(raw.type) < 0) {
      throw new Error('[proto:message-priority] type must be one of ' + TYPES.join(' | '));
    }
    if (typeof raw.name !== 'string' || !raw.name.trim()) {
      throw new Error('[proto:message-priority] name must be a non-empty string');
    }
    // Absent is the documented default (0 = inert). Present-but-not-a-number
    // is a defect, so undefined and null take the default while '0' does not.
    const weight = (raw.weight === undefined || raw.weight === null) ? 0 : raw.weight;
    // Rejects the STRING '1.5' as well as NaN and Infinity. Fractions are
    // legal — unlike Designation's integer ladder, these are multipliers.
    if (typeof weight !== 'number' || !Number.isFinite(weight)) {
      throw new Error('[proto:message-priority] weight must be a finite number');
    }
    if (weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
      throw new Error('[proto:message-priority] weight must be between ' +
        MIN_WEIGHT + ' and ' + MAX_WEIGHT);
    }

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:MessagePriority' }, raw));
    if (violations.length) {
      throw new Error('[proto:message-priority] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }

    Object.assign(this, raw);
    // Normalize AFTER validation so the stored name is the trimmed one but a
    // whitespace-only name still fails above rather than becoming ''.
    this.name = raw.name.trim();
    this.weight = _round(weight);
    Object.freeze(this);
  }

  isTimeline() { return this.type === 'timeline'; }
  isContent() { return this.type === 'content'; }

  /** True when this factor currently contributes nothing to a ranking. */
  isInert() { return this.weight === 0; }

  /** True when this factor DEMOTES rather than promotes. */
  demotes() { return this.weight < 0; }

  /**
   * The factor's contribution to a score, given a 0..1 signal strength.
   * The one piece of arithmetic in the matrix, so it lives on the class
   * rather than being restated by each consumer (rule 11).
   */
  applyTo(signal) {
    const s = Number(signal);
    if (!Number.isFinite(s)) return 0;
    return this.weight * s;
  }

  /**
   * What a factor looks like to a CONSUMER of the matrix — the four fields a
   * ranking actually needs, and nothing else.
   *
   * created_at / updated_at are storage bookkeeping: they say when an operator
   * last touched a weight, which is an admin question, not a ranking one. They
   * stay on the admin endpoints (where "when was this tuned?" is the point)
   * and stay off the all-user read.
   *
   * A projection generated in ONE place rather than a field list restated per
   * route (rule 11): the next consumer surface asks the class what a factor
   * publishes instead of deciding for itself, so the two cannot drift.
   */
  publicFields() {
    return { id: this.id, type: this.type, name: this.name, weight: this.weight };
  }

  label() { return this.type + ' · ' + this.name + ' (weight ' + this.weight + ')'; }
}

MessagePriority.TYPES = Object.freeze(TYPES.slice());
MessagePriority.MIN_WEIGHT = MIN_WEIGHT;
MessagePriority.MAX_WEIGHT = MAX_WEIGHT;
MessagePriority.SCALE = SCALE;

module.exports = MessagePriority;
