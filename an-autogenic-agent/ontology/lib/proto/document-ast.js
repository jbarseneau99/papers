'use strict';

/**
 * lib/proto/document-ast.js — the DocumentAST CLASS + the markdown grammar.
 *
 * A DocumentAST is the canonical structure IR of a document — sections,
 * floats, counts, title — READ-CONSTRUCTED from a draft's markdown by the
 * ONE parser that owns the grammar (rule 11: EditorialElement and BoundIR
 * project from the same parse; nothing restates it). Dependency-free.
 *
 * Contents: class definition · mechanism.
 * Ontology: Code object M33C-0090 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class DocumentAST {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:DocumentAST' }, raw));
    if (violations.length) {
      throw new Error('[proto:document-ast] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.outline) { this.outline.forEach(Object.freeze); Object.freeze(this.outline); }
    if (this.floats) Object.freeze(this.floats);
    if (this.counts) Object.freeze(this.counts);
    Object.freeze(this);
  }

  label() { return (this.title || 'untitled') + ': ' + (this.outline || []).length + ' sections, ' + ((this.counts || {}).words || 0) + ' words'; }
}

// ── The grammar — ONE owner ─────────────────────────────────────────────────
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

/** Parse markdown → the raw structure every documents class projects from. */
function parse(body) {
  const lines = String(body || '').split('\n');
  const outline = [], floats = [];
  let title = null, inCode = false, section = null;
  lines.forEach(function (line, i) {
    const n = i + 1;
    if (/^```/.test(line)) { if (!inCode) floats.push({ type: 'code', line: n }); inCode = !inCode; return; }
    if (inCode) return;
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      if (h[1].length === 1 && !title) title = h[2].trim();
      section = { id: slug(h[2]), depth: h[1].length, heading: h[2].trim(), line: n };
      outline.push(section);
      return;
    }
    if (/^!\[/.test(line)) floats.push({ type: 'figure', line: n });
    else if (/^\|.*\|/.test(line) && !(floats.length && floats[floats.length - 1].type === 'table' && floats[floats.length - 1].endLine === n - 1)) {
      const last = floats[floats.length - 1];
      if (last && last.type === 'table' && last.endLine === n - 1) last.endLine = n;
      else floats.push({ type: 'table', line: n, endLine: n });
    }
    else if (/^>\s/.test(line)) {
      const last = floats[floats.length - 1];
      if (!(last && last.type === 'callout' && last.endLine === n - 1)) floats.push({ type: 'callout', line: n, endLine: n });
      else last.endLine = n;
    }
  });
  const words = String(body || '').replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  const claimIds = [];
  const claimRe = /\[\[claim:([A-Za-z0-9_-]+)\]\]/g; let m;
  while ((m = claimRe.exec(body))) claimIds.push({ id: m[1], index: m.index });
  const cites = {};
  const citeRe = /\[@([A-Za-z0-9_:-]+)\]/g;
  while ((m = citeRe.exec(body))) cites[m[1]] = (cites[m[1]] || 0) + 1;
  return { title: title, outline: outline, floats: floats, claimIds: claimIds, cites: cites,
    counts: { words: words, sections: outline.length, floats: floats.length } };
}

module.exports = DocumentAST;
module.exports.parse = parse;
module.exports.slug = slug;
