'use strict';

/**
 * lib/proto/session-digest.js — the SessionDigest CLASS (the concentric
 * episodic shell), lifted from Vega's proven Concentric Episodic Memory.
 *
 * A recognition-grade summary of ONE prior session, computed AT READ from
 * that session's MemoryTurns — never stored (the read-construction idiom;
 * a stored rollup goes stale, and Vega proved the live aggregate reads
 * fast enough). It carries just enough to RECOGNISE the episode — its
 * opening intent, its closing state, its size — without pulling the full
 * history (that is the deliberate-recall path). Vega's
 * listPriorSessionDigests (vega-data.js, spec §13.1) is the reference this
 * lifts, mechanics and all.
 *
 * The shell here is a SESSION (a real episode boundary) — the sibling axis
 * to Episode's calendar shells (day/week/month): Episode answers "what
 * happened this day", SessionDigest answers "that time we talked about X".
 *
 * Canonical shape: { agent, session, turns, opened?, closed?, spoken?,
 * opening?, closing? }. Validation via the shared Layer A binding; freezes.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0102 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── Recognition trim — one line, whitespace-collapsed, capped ────────────────
function recog(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 70); }

// ── The class ───────────────────────────────────────────────────────────────
class SessionDigest {
  /**
   * @param {object} raw — { agent, session, turns, opened?, closed?, spoken?, opening?, closing? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:SessionDigest' }, raw));
    if (violations.length) {
      throw new Error('[proto:session-digest] OEP violations (' + (raw.session || '?') + '): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** The recognition line for recall/prompt: what it was, where it ended. */
  line() {
    const id = String(this.session || '').slice(0, 8);
    const size = this.turns + ' turn' + (this.turns === 1 ? '' : 's') +
      (this.spoken ? ', ' + this.spoken + ' spoken' : '');
    const open = this.opening ? ' opened “' + recog(this.opening) + '”' : '';
    const close = this.closing ? ' … left at “' + recog(this.closing) + '”' : '';
    return 'session ' + id + ' (' + size + ')' + open + close;
  }
}

module.exports = SessionDigest;
