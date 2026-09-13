'use strict';

/**
 * lib/proto/document-ir.js — the DocumentIR CLASS: the Mach33 Agency's
 * document intermediate representation, shared by every agent.
 *
 * A DocumentIR is a document as a TREE OF TYPED NODES stored as a graph:
 * `contains` edges carry order + structure (not array position), and each
 * leaf keeps its EXACT source slice (`content.tex`) so rendering is pure
 * concatenation — byte-identical, never re-generation. This is the ONE IR
 * every agent shares: Newton AUTHORS through it (semantic → nodes → render),
 * Cristi DECOMPOSES into it (source → nodes via a pluggable source adapter).
 * The two directions bind: render(fromSource(src)) === src, byte-for-byte,
 * whenever the adapter preserves each node's verbatim slice.
 *
 * The IR is DISTINCT from the epistemic/semantic fabric (packages/@mach33/
 * core): claims/grounds (the epistemics graph) and entities/relations (the
 * semantics graph) live THERE and are REFERENCED from IR nodes via
 * grounds/cites/contradicts/same_as edges, never embedded. DocumentAST is a
 * summary PROJECTION of a DocumentIR; BoundIR binds claim-envelopes to its
 * structure. Dependency-free (base layer — rule 4).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0114 (immutable ref — assigned once, never edit).
 *   [Renumbered 0113→0114 pre-merge: develop's lib/telemetry-retention.js holds
 *    the established 0113; this unmerged branch yields to avoid the collision.]
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// The virtual root every top-level node hangs off via a `contains` edge —
// reading order is a DFS from here, ord-sorted (mirrors lib/document-graph).
const ROOT = '__root__';

// ── The class ───────────────────────────────────────────────────────────────
class DocumentIR {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:DocumentIR' }, raw));
    if (violations.length) {
      throw new Error('[proto:document-ir] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.nodes) { this.nodes.forEach(Object.freeze); Object.freeze(this.nodes); }
    if (this.edges) { this.edges.forEach(Object.freeze); Object.freeze(this.edges); }
    Object.freeze(this);
  }

  // Reading order: DFS over `contains` edges from ROOT, ord-sorted. The ONE
  // structural traversal; render and any projection read it (rule 11).
  readingOrder() {
    const byId = {};
    (this.nodes || []).forEach(function (n) { byId[n.id] = n; });
    const kids = {};
    (this.edges || [])
      .filter(function (e) { return e.kind === 'contains'; })
      .slice()
      .sort(function (a, b) { return (a.ord || 0) - (b.ord || 0); })
      .forEach(function (e) { (kids[e.src] = kids[e.src] || []).push(e.dst); });
    const out = [];
    (function walk(id) {
      (kids[id] || []).forEach(function (cid) {
        if (byId[cid]) out.push(byId[cid]);
        walk(cid);
      });
    })(ROOT);
    return out;
  }

  // The ONE outward path: node-graph → source string. Byte-identical because
  // each leaf carries its verbatim source slice; render is concatenation.
  render() {
    return String(this.head || '') + this.readingOrder().map(function (n) {
      return (n.content && n.content.tex != null) ? n.content.tex
        : (n.tex != null ? n.tex : '');
    }).join('');
  }

  label() {
    return (this.nodes || []).length + ' nodes, ' + (this.edges || []).length + ' edges';
  }

  // Inward: build a DocumentIR from a source via a pluggable adapter. The
  // adapter owns the FORMAT — LaTeX for Newton, PDF for Cristi — and returns
  // { head, nodes, edges } preserving each node's verbatim slice so render()
  // round-trips. The class stays format-agnostic (the binding lives here).
  static fromSource(source, adapter) {
    if (!adapter || typeof adapter.parse !== 'function') {
      throw new Error('[proto:document-ir] fromSource needs an adapter with parse(source) → { head, nodes, edges }');
    }
    const parsed = adapter.parse(source) || {};
    return new DocumentIR({
      head: parsed.head || '',
      nodes: parsed.nodes || [],
      edges: parsed.edges || [],
      contentHash: parsed.contentHash || null,
      sourceLocator: parsed.sourceLocator || null
    });
  }
}

module.exports = DocumentIR;
module.exports.ROOT = ROOT;
