// "PUT ALL YOUR EGGS IN THE ONE BASKET — AND WATCH THAT BASKET."
// — Mark Twain, Pudd’nhead Wilson’s Calendar (1894).
'use strict';

/**
 * lib/proto/basal-ganglia.js — the BasalGanglia CLASS (the action selector).
 *
 * The basal ganglia is the SELECTOR in the cortico-BG-thalamo-cortical
 * loop: the Executive (running its cognitive loop with working memory)
 * uses it to turn a DECISION into an ACTION — go/no-go gating over which
 * capability fires and which faculty engages. The Thalamus is the relay
 * (sensory in, motor out); the BasalGanglia is what selects.
 *
 * The tool-selection gate is LIVE (ADR 0016): the chat body runs every
 * candidate turn past leaksIntent() — a turn that NARRATES a tool action but
 * emits no tool_use is a leaked gate (intent escaping as speech, the
 * 'running them together…' compliance gap). The gate catches that divergence
 * and forces the emission (or an honest refusal), and each firing is
 * recorded on the ledger (recordGateEvent). Faculty routing is still planned.
 * Every agent HAS one (like the Thalamus); this is the organ record.
 *
 * Contents: class definition · inherited instances.
 * Ontology: Code object M33C-0101 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class BasalGanglia {
  /**
   * @param {object} raw — { gates[] { id, status, what }, status? }
   * @throws {Error} OEP violations / malformed gates — fails loud.
   */
  constructor(raw) {
    raw = raw || {};
    if (!Array.isArray(raw.gates) || raw.gates.length < 1) {
      throw new Error('[proto:basal-ganglia] a selector has gates — required');
    }
    raw.gates.forEach(function (g) {
      if (['live', 'implicit', 'planned'].indexOf(g.status) < 0) {
        throw new Error('[proto:basal-ganglia] gate status must be live | implicit | planned (got "' + g.status + '")');
      }
    });
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:BasalGanglia' }, raw));
    if (violations.length) {
      throw new Error('[proto:basal-ganglia] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    this.gates.forEach(Object.freeze);
    Object.freeze(this.gates);
    Object.freeze(this);
  }

  gate(id) { return this.gates.filter(function (g) { return g.id === id; })[0] || null; }

  /**
   * The tool-selection go/no-go, in code: does this candidate turn NARRATE a
   * tool action while emitting no tool_use? The chat body calls this on every
   * turn that carries no tool_use; a true return is a LEAKED gate — intent
   * escaping as speech — and the body forces the emission or an honest refusal.
   *
   * Deliberately NARROW, because this agent discusses its own tools and gate
   * constantly — the detector must not fire on that. A leak is a FIRST-PERSON,
   * IMMEDIATE commitment to run a specific tool ("let me pull that up", "I'll
   * query that now"). Two things are NOT leaks and are let through:
   *   • OFFERS / CONDITIONALS — proposing to act IF asked ("tell me and I'll
   *     recall it", "if you want, I'll file it", "name it and I'll…"). The
   *     model has not claimed it acted; it has offered to.
   *   • plain answers that merely NAME a tool ("your recall tool searches…").
   * A false positive here is worse than a miss: it interrupts honest speech,
   * so the bias is toward NOT firing.
   * @param {string} text the assistant's final text this round
   * @returns {boolean} true when a committed, unemitted action diverged
   */
  leaksIntent(text) {
    text = String(text == null ? '' : text);
    if (this.gate('tool-selection').status !== 'live') return false;   // gate off → never intervenes
    // First-person immediate commitment + a verb that maps to a real tool.
    var commit = /\b(let me|i(?:'ll| will)|i'm going to|i am going to|about to|now i)\b[^.!?]{0,40}\b(call|run|query|pin|advance|set[ _]?focus|record|recall|file|fetch|pull)\b/ig;
    var m;
    while ((m = commit.exec(text)) !== null) {
      // The run-up to the commitment: an OFFER/CONDITIONAL governs it → not a
      // leak. ("tell me and I'll…", "if you want…", "name it and I'll…")
      var runUp = text.slice(Math.max(0, m.index - 64), m.index);
      if (/\b(if|when(?:ever)?|should|would|could|unless|want(?:s)?(?: me)? to|tell me|name it|let me know|say the word|just ask|happy to|glad to|able to|ready to)\b[^.!?]*$/i.test(runUp)) continue;
      return true;   // a bare, committed, unemitted action → leak
    }
    return false;
  }

  label() {
    return 'action selector — ' + this.gates.map(function (g) { return g.id + ':' + g.status; }).join(', ');
  }
}

// ── The inherited gates — honest status ─────────────────────────────────────
const BASE_GATES = [
  { id: 'tool-selection',  status: 'live',    what: 'which capability/tool fires — go/no-go gating in code (ADR 0016): leaksIntent() catches a narrated-but-unemitted action and the chat body forces the call or an honest refusal; each firing is recorded on the ledger' },
  { id: 'faculty-routing', status: 'planned', what: 'which faculty the selected cognitive program engages' }
];

module.exports = BasalGanglia;
module.exports.BASE_GATES = BASE_GATES;
