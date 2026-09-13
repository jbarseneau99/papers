'use strict';

/**
 * lib/proto/message.js — the Message CLASS (the Commons, batch A).
 *
 * A Message is operator-to-operator broadcast in a channel — DISTINCT
 * from MemoryTurn (the agent's own remembered conversation; recipe step 8
 * boundary). Write gates: team-chat postMessage AND the summon reply path.
 *
 * `kind` separates what a person SAID from what the channel DID to itself:
 * 'user' (the default, every message before 0179) versus the system notices
 * a channel narrates about its own life — a join, a leave, a call. A notice
 * is a Message with an ATTRIBUTE, not a class of its own: nothing about it
 * is structurally distinct, and CLAUDE.md rule 3 admits a class only when
 * ≥2 agents share the pattern or base machinery constructs it. Neither holds.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0047 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The kind vocabulary ─────────────────────────────────────────────────────
// The ONE list (rule 11). It lives HERE, in the base, rather than beside the
// composers in lib/team-chat/system-notice.js, because the write gate has to
// validate against it and lib/proto may never require upward into
// lib/team-chat (rule 4 — layering points down). The composers import it from
// here; so does the test that parses the CHECK constraint out of migration
// 0179 and asserts the two agree.
const KINDS = ['user', 'join', 'leave', 'add', 'remove', 'call_start', 'call_end'];

// The notice kinds — every KIND except the ordinary human message. What a
// channel says ABOUT ITSELF.
const NOTICE_KINDS = KINDS.filter(function (k) { return k !== 'user'; });

// ── The class ───────────────────────────────────────────────────────────────
class Message {
  /**
   * @param {object} raw — { author, body, channel, display_name?, thread_root_id? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    // #231 — an ATTACHMENT-ONLY message legitimately has no text body (the file
    // IS the content). The caller passes allowEmpty:true so the write-gate
    // permits it; without this, dropping a file with no caption threw here and
    // surfaced to the user as an opaque 500 "db" error. The flag is not part of
    // the message — strip it before ontology validation + persistence.
    const allowEmpty = !!raw.allowEmpty;
    if (allowEmpty) { raw = Object.assign({}, raw); delete raw.allowEmpty; }
    if (!allowEmpty && !String(raw.body || '').trim()) {
      throw new Error('[proto:message] body must be non-empty (author ' + (raw.author || '?') + ')');
    }
    // Fail LOUD on an unknown kind (rule 14). The column carries a CHECK, so a
    // bad value would be rejected by Postgres anyway — but as an opaque 500
    // from the INSERT, naming the constraint rather than the caller. Catching
    // it at the gate names the value and the author.
    if (raw.kind != null && KINDS.indexOf(String(raw.kind)) === -1) {
      throw new Error('[proto:message] unknown kind "' + raw.kind + '" (author ' +
        (raw.author || '?') + ') — expected one of: ' + KINDS.join(', '));
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Message' }, raw));
    if (violations.length) {
      throw new Error('[proto:message] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  isReply() { return !!this.thread_root_id; }
  // A notice is what the CHANNEL said about itself, not what a person typed.
  // Absent kind means 'user' — every row written before 0179.
  isNotice() { return NOTICE_KINDS.indexOf(String(this.kind || 'user')) !== -1; }
  label() { return (this.display_name || this.author) + ': ' + String(this.body).slice(0, 50); }
}

module.exports = Message;
module.exports.KINDS = KINDS;
module.exports.NOTICE_KINDS = NOTICE_KINDS;
