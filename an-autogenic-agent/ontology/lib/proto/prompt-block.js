'use strict';

/**
 * lib/proto/prompt-block.js — the PromptBlock CLASS (a Prompt's ordered
 * section), a COMPOSITE.
 *
 * A PromptBlock is one keyed, ordered section of a Prompt. It is either:
 *   - a LEAF — renders its own generated `content` (persona, rules, tools), or
 *   - a COMPOSITE — orders `children` (child PromptBlocks) between an optional
 *     `header` and `footer` (the working-memory block ◆ one child per live
 *     part, lifted from the Attention gate's projection).
 * render() is a post-order walk: leaves emit content, composites join their
 * children. Blocks are generated at read each turn (never stored) and frozen;
 * ontology-locked blocks guard the Constitution (rule 11: projections are
 * generated). The Vega-fleet keyed/versioned/stored registry is that instance
 * layer's realization.
 *
 * Canonical shape: { key, kind?, order?, surface?, ontology_locked?,
 * content? (leaf) | children? (composite), header?, footer?, version? }.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0075 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class PromptBlock {
  /**
   * @param {object} raw — see the canonical shape above.
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (raw.surface != null && ['chat', 'voice', 'shared'].indexOf(raw.surface) < 0) {
      throw new Error('[proto:prompt-block] surface must be one of chat | voice | shared');
    }
    if (raw.children != null && !Array.isArray(raw.children)) {
      throw new Error('[proto:prompt-block] children must be an array of PromptBlocks');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:PromptBlock' }, raw));
    if (violations.length) {
      throw new Error('[proto:prompt-block] OEP violations (' + (raw.key || '?') + '): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (Array.isArray(this.children)) Object.freeze(this.children);
    Object.freeze(this);
  }

  /** A composite owns child blocks; a leaf renders its own content. */
  isComposite() { return Array.isArray(this.children) && this.children.length > 0; }

  /**
   * Render this block to prompt text (post-order): a leaf emits its content;
   * a composite joins its non-empty children between header and footer.
   */
  render() {
    if (this.isComposite()) {
      var inner = this.children.map(function (c) { return c.render(); })
        .filter(function (s) { return s != null && String(s).length; })
        .join(this.childSep || '\n');
      return (this.header || '') + inner + (this.footer || '');
    }
    return this.content == null ? '' : String(this.content);
  }

  label() {
    var n = this.isComposite() ? this.children.length + ' child block' + (this.children.length === 1 ? '' : 's') : String(this.content || '').length + ' chars';
    return this.key + ' [' + (this.surface || 'shared') + (this.ontology_locked ? ' · locked' : '') + '] — ' + n;
  }
}

module.exports = PromptBlock;
