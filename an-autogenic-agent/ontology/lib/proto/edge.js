'use strict';

/**
 * lib/proto/edge.js — the base Edge CLASS (EIR §13).
 *
 * A typed directed relation between two Nodes: `from` FEEDS `to`, `kind` names
 * the relation, and `ord` sequences siblings under a parent (the reading-order
 * key for `contains`). Role is EDGE-borne (X7): a node's role is which edge kind
 * points at it — an Actor is an Entity a `performs` edge points to, a Toulmin
 * ground is a Claim a `grounds` edge points to — never a property of the node.
 *
 * Unifies the two edge shapes that grew up separately: Graph's {from,to}
 * (M33C-0108, the first-class graph) and DocumentIR's {src,dst}. New edges use
 * {from,to,kind,ord}; fromLegacy() adapts the older {src,dst} shape so the
 * DocumentIR adapters keep working while they migrate (strangler-fig).
 *
 * Frozen on construction.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0116 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Edge {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Edge' }, raw));
    if (violations.length) {
      throw new Error('[proto:edge] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (!raw.from || !raw.to) throw new Error('[proto:edge] an edge needs from + to');
    if (!raw.kind) throw new Error('[proto:edge] an edge needs a kind');
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** Adapt the older DocumentIR {src,dst,kind,ord} shape onto {from,to,kind,ord}. */
  static fromLegacy(e) {
    e = e || {};
    return new Edge({
      from: e.src != null ? e.src : e.from,
      to: e.dst != null ? e.dst : e.to,
      kind: e.kind,
      ord: e.ord,
      id: e.id
    });
  }
}

module.exports = Edge;
