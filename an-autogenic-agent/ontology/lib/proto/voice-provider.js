'use strict';

/**
 * lib/proto/voice-provider.js — the VoiceProvider CLASS (the vendor seams).
 *
 * The ninth conversion. A VoiceProvider is a speech vendor seam: which
 * roles it plays (stt · tts · s2s), where its key lives, and the QUIRKS we
 * learned the hard way — the facts that used to be tribal memory in commit
 * messages now ride the instance (eleven_v3 performs tags but rejects
 * prev/next conditioning; marked speech needs Creative stability). The
 * four seams ship as inherited instances; voice-body derives its routing
 * from them.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0029 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class VoiceProvider {
  /**
   * @param {object} raw — { id, name, roles: [...], keyEnv?, quirks? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:VoiceProvider' }, raw));
    if (violations.length) {
      throw new Error('[proto:voice-provider] OEP violations for "' + (raw.id || '?') + '": ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (Array.isArray(this.roles)) Object.freeze(this.roles);
    Object.freeze(this);
  }

  /** Whether this seam's key is present in the environment. */
  isConfigured() { return !this.keyEnv || !!process.env[this.keyEnv]; }

  /** Whether the provider plays a role (stt | tts | s2s). */
  plays(role) { return Array.isArray(this.roles) && this.roles.indexOf(role) >= 0; }
}

// ── The four seams — inherited instances ───────────────────────────────────
const BASE_PROVIDERS = [
  new VoiceProvider({ id: 'xai', name: 'xAI', roles: ['stt', 'tts'], keyEnv: 'XAI_API_KEY',
    voices: [
      { id: 'ara', label: 'Ara' }, { id: 'rex', label: 'Rex' },
      { id: 'leo', label: 'Leo' }, { id: 'eve', label: 'Eve' }
    ],
    quirks: 'no reliable tag channel — delivery marks are stripped' }),
  new VoiceProvider({ id: 'elevenlabs', name: 'ElevenLabs', roles: ['tts'], keyEnv: 'ELEVENLABS_API_KEY',
    default_voice: 'jsCqWAovK2LkecY7zXl4',
    // The premade roster, graded by ear (Brant, 2026-07-06) against Ara as
    // the reference character. Freya is the house default.
    voices: [
      { id: 'jsCqWAovK2LkecY7zXl4', label: 'Freya — bright, energetic' },
      { id: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica — young, conversational' },
      { id: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura — upbeat, playful' },
      { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda — warm, friendly' },
      { id: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli — soft, emotional' },
      { id: 'pMsXgVXv3BLzUgSXRplE', label: 'Serena — pleasant, even' },
      { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah — soft, composed' },
      { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi — strong, assertive' },
      { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel — calm, warm' },
      { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam — deep, steady' },
      { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni — bright, engaging' },
      { id: '2EiwWnXFnvU5JabPnv8n', label: 'Clyde — gruff veteran' },
      // Native Scottish voices (Voice Library, auditioned by ear 2026-07-06).
      { id: 'y6p0SvBlfEe2MH4XN7BP', label: 'Hugh — Scottish, rhythmic storyteller' },
      { id: 'dgkKQcJqyy5AP0dqleUU', label: 'Hector — Scottish, poetic narrator' },
      { id: 'TVmbglAk3F1GkiCoOq47', label: 'Isla Skye — Scottish (Edinburgh), soft, warm' },
      { id: 'M6KCOw7VXEJAZwuYFLuz', label: 'Claire — Scottish, gentle, lilting' },
      { id: 'AMNzDFTtLuyoKAL3YPnu', label: 'Bonnie Makenzie — Scottish, bright, optimistic' }
    ],
    quirks: 'eleven_v3 performs [tags] but rejects previous_text/next_text (unsupported_model, verified 2026-07-06); marked speech runs Creative stability' }),
  new VoiceProvider({ id: 'deepgram', name: 'Deepgram', roles: ['stt'], keyEnv: 'DEEPGRAM_API_KEY',
    quirks: 'nova-2; keyword-bias the agent’s own name' }),
  new VoiceProvider({ id: 'grok', name: 'Grok realtime', roles: ['s2s'], keyEnv: 'XAI_API_KEY',
    quirks: 'speech-to-speech; expressiveness is emergent — never sees marks; never emits response.cancelled' })
];

module.exports = VoiceProvider;
module.exports.BASE_PROVIDERS = BASE_PROVIDERS;
