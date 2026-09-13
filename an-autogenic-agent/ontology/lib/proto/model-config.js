'use strict';

/**
 * lib/proto/model-config.js — the ModelConfig CLASS (the fleet accounting).
 *
 * A ModelConfig is the fleet's model registry entry — provider,
 * family, pricing per Mtok; what invocations are costed against. The
 * boundary with Model (anatomy) holds: Model is the ORGAN, ModelConfig
 * prices its invocations. The inherited instances are the substrates the
 * fleet actually runs on; prices are DATA (update by commit when vendors
 * move them — the quirks-as-data precedent).
 *
 * Contents: class definition · inherited instances.
 * Ontology: Code object M33C-0086 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class ModelConfig {
  /**
   * @param {object} raw — { model_id, provider, family?, prices? { in, out, cache }, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:ModelConfig' }, raw));
    if (violations.length) {
      throw new Error('[proto:model-config] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.prices) Object.freeze(this.prices);
    Object.freeze(this);
  }

  costPerMtok(kind) { return (this.prices || {})[kind || 'out']; }
  label() {
    return this.model_id + ' (' + this.provider + ')' +
      (this.prices ? ' $' + this.prices['in'] + '/$' + this.prices.out + ' per Mtok' : '');
  }
}

module.exports = ModelConfig;

// ── The inherited instances — the substrates the fleet runs on ─────────────
// Prices are vendor list prices per Mtok as last verified (2026-07); they
// are DATA — a vendor price change is a one-line commit here.
const BASE_MODEL_CONFIGS = [
  new ModelConfig({ model_id: 'claude-sonnet-5', provider: 'anthropic', family: 'claude',
    prices: { in: 3, out: 15, cache: 0.3 } }),
  new ModelConfig({ model_id: 'claude-opus-4-8', provider: 'anthropic', family: 'claude',
    prices: { in: 15, out: 75, cache: 1.5 } }),
  new ModelConfig({ model_id: 'claude-haiku-4-5', provider: 'anthropic', family: 'claude',
    prices: { in: 1, out: 5, cache: 0.1 } }),
  new ModelConfig({ model_id: 'grok-realtime', provider: 'xai', family: 'grok' })
];

module.exports.BASE_MODEL_CONFIGS = BASE_MODEL_CONFIGS;
