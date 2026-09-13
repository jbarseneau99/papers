'use strict';

/**
 * lib/proto/designation.js — the Designation CLASS (the Boundary wave).
 *
 * A Designation is an organisational RANK — Founder, CEO, Senior Developer.
 * It sits beside Principal and is deliberately NOT part of it: role
 * (admin | user) is the authority gate and permissions are the capability
 * scopes, while a designation only orders the org chart. Promoting someone
 * to "CIO" must never widen what they may do, so the rank lives in its own
 * class and nothing here consults or mutates role.
 *
 * Weight is seniority with LOWER MORE SENIOR (Founder = 0) — the inversion
 * is the whole point, since it lets `ORDER BY weight` render the chart
 * top-down. It is not unique: peers at one level share a weight.
 *
 * Write-gated at every designations-table writer (the admin create and
 * update routes): one class, both paths — the Principal precedent.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0119 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── Vocabulary ──────────────────────────────────────────────────────────────
// Mirrors the CHECK constraints in db/migrations/1786951180_designations.sql.
// Kept here because this class is the gate the app writes through; the DB
// constraint is the backstop for anything that isn't this class.
const STATUSES = ['active', 'archived'];
const MIN_WEIGHT = 0;
const MAX_WEIGHT = 99;

// ── The class ───────────────────────────────────────────────────────────────
class Designation {
  /**
   * @param {object} raw — { name, weight, status?, id?, created_at?, updated_at? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    if (typeof raw.name !== 'string' || !raw.name.trim()) {
      throw new Error('[proto:designation] name must be a non-empty string');
    }
    // Reject the string '3' as well as 3.5: a weight that arrived as text
    // sorts lexicographically ('10' < '2') and would silently scramble the
    // ladder, which is exactly the failure this class exists to prevent.
    if (typeof raw.weight !== 'number' || !Number.isInteger(raw.weight)) {
      throw new Error('[proto:designation] weight must be an integer');
    }
    if (raw.weight < MIN_WEIGHT || raw.weight > MAX_WEIGHT) {
      throw new Error('[proto:designation] weight must be between ' +
        MIN_WEIGHT + ' and ' + MAX_WEIGHT);
    }
    if (raw.status != null && STATUSES.indexOf(raw.status) < 0) {
      throw new Error('[proto:designation] status must be one of ' + STATUSES.join(' | '));
    }

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Designation' }, raw));
    if (violations.length) {
      throw new Error('[proto:designation] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }

    Object.assign(this, raw);
    // Normalize AFTER validation so the stored name is the trimmed one but
    // a whitespace-only name still fails above rather than becoming ''.
    this.name = raw.name.trim();
    this.status = raw.status || 'active';
    Object.freeze(this);
  }

  isActive() { return this.status === 'active'; }

  /** True when this rank is strictly more senior than `other`. */
  outranks(other) {
    if (!(other instanceof Designation)) return false;
    return this.weight < other.weight;
  }

  /**
   * What a rank looks like to a CONSUMER — the three fields that describe the
   * rung, without the status/timestamp bookkeeping an admin surface needs.
   *
   * Added for the message priority matrix, which publishes the ladder as a
   * third priority dimension beside timeline and content. No `type` field:
   * a Designation has no type attribute, and the dimension name belongs to
   * the response doing the composing, not to this class.
   *
   * CAUTION FOR ANY CONSUMER: `weight` here is INVERTED relative to a
   * MessagePriority weight — 0 is the MOST senior rank, where 0 is the least
   * significant priority factor. The two are not interchangeable numbers.
   * lib/message-priority-routes.js declares the ordering per dimension so a
   * consumer cannot mistake one for the other.
   */
  publicFields() {
    return { id: this.id, name: this.name, weight: this.weight };
  }

  label() { return this.name + ' (weight ' + this.weight + ')'; }
}

Designation.STATUSES = Object.freeze(STATUSES.slice());
Designation.MIN_WEIGHT = MIN_WEIGHT;
Designation.MAX_WEIGHT = MAX_WEIGHT;

module.exports = Designation;
