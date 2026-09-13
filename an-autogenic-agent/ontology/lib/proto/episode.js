'use strict';

/**
 * lib/proto/episode.js — the Episode CLASS (the shells' unit of memory).
 *
 * A rolled-up envelope of turns on a concentric shell: the episodic
 * roll-up loop reads validated MemoryTurns and writes one Episode per
 * period (v1: the DAY shell, ring 2). The fifth conversion (locked
 * recipe) — and the first whose grown instances are produced by a
 * BACKGROUND LOOP rather than a user-facing request.
 *
 * v1 summaries are DETERMINISTIC (extractive digest — counts, sessions,
 * opening topics): dependency-free and honest for the base tier. An LLM
 * summarization pass can upgrade the same shape later without touching
 * the class.
 *
 * Canonical shape: { agent, scale, period, summary, ring?, turns?, from?, to? }.
 * Validation via the shared Layer A binding; instances freeze.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0025 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── Shell geometry — scale → ring (1 = innermost / most recent) ───────────
const RINGS = { session: 1, day: 2, week: 3, month: 4, year: 5 };

// ── The class ───────────────────────────────────────────────────────────────
class Episode {
  /**
   * @param {object} raw — { agent, scale, period, summary, ring?, turns?, from?, to? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.ring == null && RINGS[raw.scale]) raw = Object.assign({}, raw, { ring: RINGS[raw.scale] });
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Episode' }, raw));
    if (violations.length) {
      throw new Error('[proto:episode] OEP violations (' + (raw.scale || '?') + ' ' + (raw.period || '?') + '): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** The panel/prompt line: "day 2026-07-06 — <summary>". */
  line() { return this.scale + ' ' + this.period + ' — ' + this.summary; }

  /** The period key for a date on a scale (v1: day). */
  static periodKey(date, scale) {
    const d = date instanceof Date ? date : new Date(date);
    if (scale === 'day') return d.toISOString().slice(0, 10);
    throw new Error('[proto:episode] unsupported scale for v1: ' + scale);
  }

  /**
   * Deterministic v1 digest over a period's MemoryTurns — counts, session
   * spread, spoken share, and the opening user topics. Pure function.
   * @param {Array} turns — MemoryTurn instances (or row-shaped objects)
   * @returns {string}
   */
  static summarize(turns) {
    turns = turns || [];
    if (!turns.length) return 'No exchanges.';
    const sessions = {};
    let spoken = 0;
    const userOpeners = [];
    turns.forEach(function (t) {
      sessions[t.session] = true;
      if (t.channel === 'voice') spoken++;
      if (t.role === 'user' && userOpeners.length < 3) {
        userOpeners.push(String(t.content).replace(/\s+/g, ' ').slice(0, 60));
      }
    });
    const nSessions = Object.keys(sessions).length;
    return turns.length + ' exchange' + (turns.length === 1 ? '' : 's') +
      (spoken ? ' (' + spoken + ' spoken)' : '') +
      ' across ' + nSessions + ' session' + (nSessions === 1 ? '' : 's') + '.' +
      (userOpeners.length ? ' Topics: ' + userOpeners.join(' · ') : '');
  }
}

Episode.RINGS = Object.freeze(RINGS);

module.exports = Episode;
