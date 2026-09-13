'use strict';

/**
 * lib/proto/chat-organ.js — the Chat CLASS (the conversational organ).
 *
 * Chat is the agent's mouth-and-ears: the typed-conversation ORGAN —
 * which model it thinks through, whether replies speak, where turns are
 * remembered, what its system surface derives from. The MECHANISM
 * (chat-body.js: routes, streaming) stays procedural by the scope rule;
 * this is the organ record, the Voice-organ split applied to chat.
 * Constructed at assembly for every full agent.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0098 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Chat {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Chat' }, raw));
    if (violations.length) {
      throw new Error('[proto:chat-organ] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() {
    return 'chat via ' + (this.model || 'default model') +
      (this.speech ? ' \u00b7 speaks' : '') + (this.memory ? ' \u00b7 remembers' : '');
  }
}

module.exports = Chat;
