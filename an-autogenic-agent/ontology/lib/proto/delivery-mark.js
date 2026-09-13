'use strict';

/**
 * lib/proto/delivery-mark.js — the DeliveryMark CLASS (voice expression).
 *
 * The sixth conversion (locked recipe). A DeliveryMark is STAGE DIRECTION —
 * an instruction about how a line is delivered, written [[word]] in the
 * stream, stripped from display, compiled per provider; what the listener
 * hears when an engine honors it is the EXPRESSION. The layering: the
 * agent's affect (felt) informs its delivery marks (written), which the
 * voice renders as expression (heard) — only the middle layer is a class,
 * because it is the only artifact.
 *
 * The ten house marks are the base class's INHERITED INSTANCES, constructed
 * in voice/marks.js (the grammar's owner). Each instance carries its own
 * provider DIALECTS — the ElevenLabs v3 tag it compiles to — and a status:
 * `canonical` (a documented v3 tag, passes straight through) or
 * `translated` (a house word rendered via the documented adverb form).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0026 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class DeliveryMark {
  /**
   * @param {object} raw — { id, what, dialects: { elevenlabs: '[tag]' }, status? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:DeliveryMark' }, raw));
    if (violations.length) {
      throw new Error('[proto:delivery-mark] OEP violations for "' + (raw.id || '?') + '": ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.dialects && typeof this.dialects === 'object') Object.freeze(this.dialects);
    Object.freeze(this);
  }

  /** The house-grammar token the model writes: "[[whispers]]". */
  token() { return '[[' + this.id + ']]'; }

  /**
   * The provider's tag for this mark, or null when the provider has no
   * dialect for it (the compiler strips it).
   */
  compileFor(provider) {
    return (this.dialects && this.dialects[provider]) || null;
  }
}

module.exports = DeliveryMark;
