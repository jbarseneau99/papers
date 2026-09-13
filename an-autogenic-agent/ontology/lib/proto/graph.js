'use strict';

/**
 * lib/proto/graph.js — the Graph CLASS (graphs as a first-class
 * representation, REQ-graph-first-class P1).
 *
 * The platform holds many graph-shaped things — a spreadsheet model's
 * dependency graph, the class catalog, the belief graph — and until
 * this class each carried its own traversal code. A Graph is typed
 * nodes + typed edges PROJECTED from a registered source, and the
 * standard questions (summary, dependents, precedents, path, cycles,
 * resolve) are class behavior, written once. Sources project INTO a
 * Graph; renderers and tools read OUT of it; nothing writes back
 * (projections are outward-only, the ASG law).
 *
 * Edge direction: `from` FEEDS `to` (data/derivation flows from → to).
 * Edges flagged `hub: true` are display scaffolding (cluster spokes)
 * and are EXCLUDED from traversal adjacency — the belief the sheet
 * graph already enforced, now structural.
 *
 * Non-breaking contract (the operator's law for this build): this
 * class lands BESIDE lib/spreadsheet-graph.js, which keeps serving the
 * existing spreadsheet_graph tool unchanged; fromLinks() adapts its
 * {source, target} link shape so the two lanes agree until the alias
 * flip is validated on UAT.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0108 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ─────────────────────────────────────────────────────────

class Graph {
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Graph' }, raw));
    if (violations.length) {
      throw new Error('[proto:graph] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    if (!Array.isArray(raw.nodes)) throw new Error('[proto:graph] nodes must be an array');
    if (!Array.isArray(raw.edges)) throw new Error('[proto:graph] edges must be an array');
    for (let i = 0; i < raw.edges.length; i++) {
      const e = raw.edges[i];
      if (!e || !e.from || !e.to) throw new Error('[proto:graph] edges[' + i + '] needs from + to');
    }
    Object.assign(this, raw);
    Object.freeze(this.nodes);
    Object.freeze(this.edges);
    Object.freeze(this);
  }

  // ── Adjacency (hub edges excluded — display scaffolding) ──────────
  _adjacency() {
    const fwd = {}, rev = {};
    for (const e of this.edges) {
      if (e.hub) continue;
      (fwd[e.from] = fwd[e.from] || []).push(e.to);
      (rev[e.to] = rev[e.to] || []).push(e.from);
    }
    return { fwd, rev };
  }

  _closure(startId, adj, cap) {
    cap = cap || 500;
    const seen = {}, queue = [startId], out = [];
    seen[startId] = true;
    while (queue.length && out.length < cap) {
      const cur = queue.shift();
      for (const nxt of (adj[cur] || [])) {
        if (seen[nxt]) continue;
        seen[nxt] = true;
        out.push(nxt);
        queue.push(nxt);
      }
    }
    return out;
  }

  // ── The standard questions ────────────────────────────────────────

  /** Everything downstream of a node — what it ultimately feeds. */
  dependentsOf(ref, cap) {
    const node = this.resolve(ref)[0];
    return { node: node.id, dependents: this._closure(node.id, this._adjacency().fwd, cap) };
  }

  /** Everything upstream of a node — what it is computed/derived from. */
  precedentsOf(ref, cap) {
    const node = this.resolve(ref)[0];
    return { node: node.id, precedents: this._closure(node.id, this._adjacency().rev, cap) };
  }

  /** Shortest directed path from → to, or null when none exists. */
  pathBetween(fromRef, toRef) {
    const from = this.resolve(fromRef)[0].id;
    const to = this.resolve(toRef)[0].id;
    const fwd = this._adjacency().fwd;
    const prev = {}, seen = {};
    seen[from] = true;
    let queue = [from];
    while (queue.length) {
      const next = [];
      for (const cur of queue) {
        for (const nxt of (fwd[cur] || [])) {
          if (seen[nxt]) continue;
          seen[nxt] = true;
          prev[nxt] = cur;
          if (nxt === to) {
            const path = [to];
            let p = to;
            while (p !== from) { p = prev[p]; path.unshift(p); }
            return path;
          }
          next.push(nxt);
        }
      }
      queue = next;
    }
    return null;
  }

  /** Directed cycles (feedback loops), capped — DFS with color marks. */
  findCycles(maxCycles) {
    maxCycles = maxCycles || 12;
    const fwd = this._adjacency().fwd;
    const color = {}, stack = [], cycles = [];
    const visit = (id) => {
      if (cycles.length >= maxCycles) return;
      color[id] = 1;
      stack.push(id);
      for (const nxt of (fwd[id] || [])) {
        if (color[nxt] === 1) {
          const at = stack.indexOf(nxt);
          if (at !== -1) cycles.push(stack.slice(at).concat(nxt));
          if (cycles.length >= maxCycles) break;
        } else if (!color[nxt]) {
          visit(nxt);
        }
      }
      stack.pop();
      color[id] = 2;
    };
    for (const n of this.nodes) { if (!color[n.id]) visit(n.id); }
    return cycles;
  }

  /** The structural read: counts, kinds, roots, sinks, hubs, cycles.
   *  Edge count = DEPENDENCY edges only, matching what degrees, roots
   *  and traversals see — hub containment spokes are reported apart
   *  (UAT parity finding 2026-08-03: counting them in `edges` while
   *  excluding them from degrees made two lanes disagree by exactly
   *  one spoke per non-hub node). */
  summary(opts) {
    opts = opts || {};
    const listCap = Math.min(Math.max(parseInt(opts.list_cap || 25, 10) || 25, 1), 100);
    const fwd = {}, rev = {}, degree = {};
    let hubEdges = 0;
    for (const e of this.edges) {
      if (e.hub) { hubEdges++; continue; }
      fwd[e.from] = (fwd[e.from] || 0) + 1;
      rev[e.to] = (rev[e.to] || 0) + 1;
      degree[e.from] = (degree[e.from] || 0) + 1;
      degree[e.to] = (degree[e.to] || 0) + 1;
    }
    const kinds = {};
    const roots = [], sinks = [];
    for (const n of this.nodes) {
      if (n.kind) kinds[n.kind] = (kinds[n.kind] || 0) + 1;
      const hasIn = !!rev[n.id], hasOut = !!fwd[n.id];
      const named = n.row_label || (n.label && n.label !== n.id ? n.label : null);
      if (!hasIn && hasOut && roots.length < listCap) roots.push(named ? { id: n.id, label: named } : { id: n.id });
      if (hasIn && !hasOut && sinks.length < listCap) sinks.push(named ? { id: n.id, label: named } : { id: n.id });
    }
    const most = Object.keys(degree)
      .sort(function (a, b) { return degree[b] - degree[a]; })
      .slice(0, 12)
      .map(function (id) { return { id: id, degree: degree[id] }; });
    return {
      source: this.source,
      nodes: this.nodes.length,
      edges: this.edges.length - hubEdges,
      hub_edges: hubEdges,
      kinds: kinds,
      roots: roots,
      sinks: sinks,
      most_connected: most,
      cycles: this.findCycles().length
    };
  }

  /** IMPLIED regions — community detection by label propagation over
   *  the undirected dependency structure (hub edges excluded). The
   *  authored decomposition is the tab; the implied regions are what
   *  the structure actually says — a region spanning several tabs is
   *  a machine the authors built without naming it (the reverse-
   *  engineering read, operator 2026-08-03). Deterministic order,
   *  bounded iterations; returns regions sorted by size. */
  regions(opts) {
    opts = opts || {};
    const iters = Math.min(Math.max(parseInt(opts.iterations || 10, 10) || 10, 1), 30);
    const maxRegions = Math.min(Math.max(parseInt(opts.max_regions || 12, 10) || 12, 1), 40);
    const adj = {};
    for (const e of this.edges) {
      if (e.hub) continue;
      (adj[e.from] = adj[e.from] || []).push(e.to);
      (adj[e.to] = adj[e.to] || []).push(e.from);
    }
    const order = this.nodes.map(function (n) { return n.id; }).sort();
    const label = {};
    order.forEach(function (id) { label[id] = id; });
    for (let it = 0; it < iters; it++) {
      let changed = 0;
      for (const id of order) {
        const counts = {};
        for (const nb of (adj[id] || [])) {
          const l = label[nb];
          counts[l] = (counts[l] || 0) + 1;
        }
        let best = label[id], bestN = 0;
        for (const l of Object.keys(counts).sort()) {
          if (counts[l] > bestN) { bestN = counts[l]; best = l; }
        }
        if (best !== label[id]) { label[id] = best; changed++; }
      }
      if (!changed) break;
    }
    const groups = {};
    const byId = {};
    for (const n of this.nodes) byId[n.id] = n;
    for (const id of order) {
      (groups[label[id]] = groups[label[id]] || []).push(id);
    }
    const out = Object.keys(groups)
      .map(function (l) { return groups[l]; })
      .filter(function (g) { return g.length > 1; })
      .sort(function (a, b) { return b.length - a.length; })
      .slice(0, maxRegions)
      .map(function (g, i) {
        const sheets = {};
        const sample = [];
        for (const id of g) {
          const n = byId[id];
          if (n && n.sheet) sheets[n.sheet] = (sheets[n.sheet] || 0) + 1;
          if (sample.length < 6) sample.push((n && (n.row_label || n.label)) ? (id + ' (' + (n.row_label || n.label) + ')') : id);
        }
        return {
          region: i + 1,
          size: g.length,
          sheets: sheets,
          spans_tabs: Object.keys(sheets).length > 1,
          sample: sample
        };
      });
    return out;
  }

  /** Name → node(s): exact id, case-insensitive id, label, then
   *  row_label (how sheet rows are actually named — the drone_cost
   *  UAT finding). LOUD on miss. */
  resolve(ref) {
    const q = String(ref == null ? '' : ref).trim();
    if (!q) throw new Error('[proto:graph] empty node reference');
    const exact = this.nodes.filter(function (n) { return n.id === q; });
    if (exact.length) return exact;
    const ql = q.toLowerCase();
    const ci = this.nodes.filter(function (n) { return String(n.id).toLowerCase() === ql; });
    if (ci.length) return ci;
    const byLabel = this.nodes.filter(function (n) {
      return n.label != null && String(n.label).toLowerCase() === ql;
    });
    if (byLabel.length) return byLabel;
    const byRowLabel = this.nodes.filter(function (n) {
      return n.row_label != null && String(n.row_label).toLowerCase() === ql;
    });
    if (byRowLabel.length) return byRowLabel;
    throw new Error('[proto:graph] no node matches ' + JSON.stringify(q) + ' in ' + (this.source || 'graph'));
  }

  // ── Epistemics (REQ-epistemic-numerical-models P3) ────────────────

  /**
   * The model's honest to-do list: leaves ranked by downstream
   * leverage × how little their ground is earned. fragility =
   * reach × (1 − κ), where reach is the transitive dependent count
   * and an ungrounded leaf counts κ 0 — the numbers that most move
   * the answer AND are least earned rise to the top. Measurement,
   * never a gate.
   */
  fragility(opts) {
    if (String(this.source || '').indexOf('beliefs') === 0) {
      return this._beliefFragility(opts);
    }
    const cap = (opts && opts.top) || 25;
    const fwd = this._adjacency().fwd;
    const out = [];
    for (const n of this.nodes) {
      const isLeaf = n.kind === 'assumption' || n.kind === 'input';
      if (!isLeaf) continue;
      const reach = this._closure(n.id, fwd, 10000).length;
      if (!reach) continue;
      const kappa = typeof n.kappa === 'number' ? n.kappa : 0;
      out.push({
        id: n.id,
        // Sheet leaves are NAMED by their row (row_label), not their
        // column header — five entries all reading "Value" is noise
        // (first live wideEP run, 2026-08-05).
        label: n.row_label != null ? n.row_label : (n.label != null ? n.label : n.id),
        kind: n.kind,
        kappa: typeof n.kappa === 'number' ? n.kappa : null,
        grounded: !!n.provenance_kind,
        reach: reach,
        fragility: Math.round(reach * (1 - kappa) * 100) / 100
      });
    }
    out.sort(function (a, b) { return b.fragility - a.fragility; });
    return {
      ranked: out.slice(0, cap),
      leaves_considered: out.length,
      note: 'fragility = downstream reach × (1 − κ); ungrounded leaves count κ 0. Reach is STRUCTURAL — exposure across ALL method branches, not sensitivity of the current result: a chooser (INDEX/IF) keeps its inert branches reachable, so a dormant method input can outrank the live one (the wideEP vendor_derate finding). Read as "what could move the answer under any method choice"; for current-result sensitivity, reason along the active path.'
    };
  }

  /**
   * The shared-source trap (ρ): grounded leaves grouped by their
   * ULTIMATE source — envelope claimant when bound, then the declared
   * text claimant, else normalized ref text. Apparent method
   * diversity that secretly traces to one provider is exactly what
   * this surfaces. Ref-text grouping is the LAST resort: rationale
   * embedded in ref strings fragments one claimant into slivers (the
   * wideEP finding — the model's largest claimant hid at 19% behind
   * eight labels), which is why declared claimants group first.
   */
  provenanceAudit() {
    if (String(this.source || '').indexOf('beliefs') === 0) {
      return this._beliefProvenanceAudit();
    }
    const groups = {};
    let grounded = 0;
    for (const n of this.nodes) {
      if (!n.provenance_kind) continue;
      grounded++;
      const key = n.envelope_claimant
        ? 'claimant: ' + String(n.envelope_claimant).trim()
        : (n.provenance_claimant
          ? 'claimant: ' + String(n.provenance_claimant).trim()
          : String(n.provenance_ref || '(no reference text)').trim().toLowerCase().slice(0, 80));
      const g = groups[key] = groups[key] || { source: key, cells: 0, kinds: {}, envelope_backed: 0 };
      g.cells++;
      g.kinds[n.provenance_kind] = (g.kinds[n.provenance_kind] || 0) + 1;
      if (n.envelope_id) g.envelope_backed++;
    }
    const list = Object.keys(groups).map(function (k) { return groups[k]; });
    list.sort(function (a, b) { return b.cells - a.cells; });
    list.forEach(function (g) { g.share = grounded ? Math.round((g.cells / grounded) * 100) / 100 : 0; });
    const out = { grounded_cells: grounded, groups: list.slice(0, 40) };
    if (list.length && list[0].share > 0.5 && grounded >= 4) {
      out.concentration_warning = 'over half the grounded cells trace to ONE source (' + list[0].source +
        ', share ' + list[0].share + ') — apparent diversity with shared provenance is correlated-failure risk, not independence.';
    } else if (list.length && grounded >= 12 && list[0].share >= 0.25 && list[0].envelope_backed === 0) {
      // The graded tier (Vega's finding, 2026-08-07: a single claimant at
      // 33% with ZERO envelope-backed cells tripped nothing). Majority
      // concentration is a warning; a MATERIAL share resting entirely on
      // unanchored text deserves a name before it grows into one.
      out.concentration_note = 'the largest claimant (' + list[0].source + ') holds ' +
        Math.round(list[0].share * 100) + '% of grounded cells with ZERO envelope-backed — a material share of the grounded surface rests on unanchored text. Below the majority-warning bar, but name it when narrating provenance.';
    }
    return out;
  }

  /**
   * Belief-graph fragility (REQ graph-ops / ADR 0029): terminal evidence
   * nodes ranked by downstream claim reach × (1 − κ). Leaves are
   * ground/warrant/backing with no incoming supporting/inference edges;
   * reach follows supporting + inference edges only (contesting excluded).
   */
  _beliefFragility(opts) {
    const cap = (opts && opts.top) || 25;
    const LEAF_KINDS = { ground: 1, warrant: 1, backing: 1 };
    const TRAV_KINDS = { supporting: 1, inference: 1, bridge: 1 };
    const supportFwd = {};
    const supportRev = {};
    for (const e of this.edges) {
      if (e.hub) continue;
      if (!TRAV_KINDS[e.kind]) continue;
      (supportFwd[e.from] = supportFwd[e.from] || []).push(e.to);
      (supportRev[e.to] = supportRev[e.to] || []).push(e.from);
    }
    const out = [];
    for (const n of this.nodes) {
      if (!LEAF_KINDS[n.kind]) continue;
      if ((supportRev[n.id] || []).length) continue;
      const reach = this._closure(n.id, supportFwd, 10000).length;
      if (!reach) continue;
      const kappa = typeof n.kappa === 'number' ? n.kappa : 0;
      out.push({
        id: n.id,
        label: n.label != null ? n.label : n.id,
        kind: n.kind,
        kappa: typeof n.kappa === 'number' ? n.kappa : null,
        envelope_id: n.envelope_id || null,
        reach: reach,
        score: Math.round(reach * (1 - kappa) * 100) / 100,
        fragility: Math.round(reach * (1 - kappa) * 100) / 100
      });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return {
      ranked: out.slice(0, cap),
      leaves_considered: out.length,
      substrate: 'beliefs',
      note: 'fragility = downstream reach × (1 − κ) over the claims substrate; leaves are terminal ground/warrant/backing nodes (no incoming supporting/inference edges). Reach counts claims downstream via supporting/inference/bridge edges only — contesting edges excluded.'
    };
  }

  /**
   * Belief-graph provenance concentration: envelope-backed evidence nodes
   * grouped by claimant (the shared-source ρ trap on the claims substrate).
   */
  _beliefProvenanceAudit() {
    const groups = {};
    let grounded = 0;
    for (const n of this.nodes) {
      if (!n.envelope_id) continue;
      grounded++;
      const key = n.envelope_claimant
        ? 'claimant: ' + String(n.envelope_claimant).trim()
        : 'envelope: ' + String(n.envelope_id);
      const g = groups[key] = groups[key] || {
        source: key,
        cells: 0,
        kinds: {},
        envelope_backed: 0
      };
      g.cells++;
      g.kinds[n.kind] = (g.kinds[n.kind] || 0) + 1;
      g.envelope_backed++;
    }
    const list = Object.keys(groups).map(function (k) { return groups[k]; });
    list.sort(function (a, b) { return b.cells - a.cells; });
    list.forEach(function (g) {
      g.share = grounded ? Math.round((g.cells / grounded) * 100) / 100 : 0;
    });
    const out = { grounded_cells: grounded, groups: list.slice(0, 40), substrate: 'beliefs' };
    if (list.length && list[0].share > 0.5 && grounded >= 4) {
      out.concentration_warning = 'over half the envelope-backed evidence traces to ONE claimant (' +
        list[0].source + ', share ' + list[0].share +
        ') — apparent diversity with shared provenance is correlated-failure risk, not independence.';
    } else if (list.length && grounded >= 12 && list[0].share >= 0.25) {
      out.concentration_note = 'the largest claimant (' + list[0].source + ') holds ' +
        Math.round(list[0].share * 100) + '% of envelope-backed evidence — name it when narrating provenance.';
    }
    return out;
  }

  // ── Adapters ──────────────────────────────────────────────────────

  /**
   * Adapt the {source, target} link shape (lib/spreadsheet-graph.js /
   * 3d-force-graph convention) into a Graph — the strangler-fig seam:
   * the existing sheet lane keeps its shape; the class speaks from/to.
   */
  static fromLinks(sourceName, nodes, links) {
    const edges = (links || []).map(function (l) {
      const e = { from: l.source, to: l.target };
      if (l.hub) e.hub = true;
      return e;
    });
    return new Graph({ source: sourceName, nodes: nodes || [], edges: edges });
  }
}

module.exports = Graph;
