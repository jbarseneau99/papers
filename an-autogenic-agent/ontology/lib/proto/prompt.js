// "PROSE IS ARCHITECTURE, NOT INTERIOR DECORATION."
// — Ernest Hemingway, Death in the Afternoon (1932).
'use strict';

/**
 * lib/proto/prompt.js — the Prompt CLASS (the assembled Constitution).
 *
 * The system prompt, reified as an OBJECT — one Prompt per surface (chat /
 * voice), composed of ordered PromptBlocks and GENERATED each turn from the
 * live self (rule 11: projections are generated, never hand-concatenated).
 * render() is a post-order walk over the blocks and is the ONLY thing the
 * chat/voice bodies send to the model — the string the Constitution used to
 * be is now `new Prompt(...).render()`.
 *
 * Canonical shape: { surface, blocks: PromptBlock[], identity? }. Blocks are
 * frozen PromptBlock instances (leaves or composites); the Prompt freezes too.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0105 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Prompt {
  /**
   * @param {object} raw — { surface, blocks: PromptBlock[], identity? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.surface != null && ['chat', 'voice', 'shared'].indexOf(raw.surface) < 0) {
      throw new Error('[proto:prompt] surface must be one of chat | voice | shared');
    }
    if (raw.blocks != null && !Array.isArray(raw.blocks)) {
      throw new Error('[proto:prompt] blocks must be an array of PromptBlocks');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Prompt' }, raw));
    if (violations.length) {
      throw new Error('[proto:prompt] OEP violations (' + (raw.surface || '?') + '): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    // Order the blocks (stable) and keep only those with something to render.
    const blocks = (raw.blocks || []).slice().sort(function (a, b) {
      return (a.order == null ? 99 : a.order) - (b.order == null ? 99 : b.order);
    });
    Object.assign(this, raw, { blocks: blocks });
    Object.freeze(this.blocks);
    Object.freeze(this);
  }

  /** The actual system-prompt string sent to the model — the ordered walk. */
  render() {
    return this.blocks.map(function (b) { return b.render(); })
      .filter(function (s) { return s != null && String(s).trim().length; })
      .join('\n\n');
  }

  /** A flat glass-box view of the tree (block key · kind · locked · size). */
  outline() {
    const rows = [];
    (function walk(blocks, depth) {
      blocks.forEach(function (b) {
        rows.push({ key: b.key, kind: b.kind || null, surface: b.surface || 'shared',
          ontology_locked: !!b.ontology_locked, depth: depth,
          chars: b.isComposite && b.isComposite() ? null : String(b.content || '').length,
          children: b.isComposite && b.isComposite() ? b.children.length : 0 });
        if (b.isComposite && b.isComposite()) walk(b.children, depth + 1);
      });
    })(this.blocks, 0);
    return rows;
  }

  label() { return 'Prompt[' + (this.surface || 'shared') + '] — ' + this.blocks.length + ' blocks, ' + this.render().length + ' chars'; }
}

module.exports = Prompt;
