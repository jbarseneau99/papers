'use strict';

/**
 * lib/proto/attention.js — the Attention CLASS (ADR 0016 §3).
 *
 * One class, two inherited instances working as a loop:
 *   GATE  (in the Thalamus)     — exogenous: decides what gets IN and
 *                                 PROJECTS to the prompt head. The prompt
 *                                 head IS the thalamic projection.
 *   HELD  (in working memory)   — endogenous: focus-driven via the
 *                                 Executive; decides what stays ALIVE.
 *
 * This is where Vega's Awareness is lifted — but NOT as a new noun. Vega's
 * awareness introduced no new kind of thing; it PROJECTS objects that
 * already have classes (AffectState, SessionDigest, Presence, Idea,
 * TimePeriod, Relation) into the prompt head. So awareness is an OPERATION:
 * each source object renders its own .line(), and the GATE selects, orders,
 * and emits them (with a reading instruction each). The 585-line god-
 * function becomes objects rendering themselves through a gate — glass-box
 * and drift-proof (rule 11: projections are generated, never hand-restated).
 *
 * The field registry (FIELDS) is DATA on the gate: id, order, reading, and a
 * pure gather(agent) → line(s) | null. A field draws NOTHING when its source
 * is not live (the realness law) — no source, no line, no edge.
 *
 * Contents: class definition · inherited instances.
 * Ontology: Code object M33C-0103 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The awareness field registry — the gate's projection, as data ────────────
// Each gather is a pure read of the agent; it returns a line, an array of
// lines, or null (field silent this turn). Ordered exactly as Vega ordered
// them: temporal frames the moment, recency frames the opening, presence the
// topic, then felt state, held attention, episodic recognition, autonomics.
const FIELDS = [
  { id: 'temporal', order: 1, reading: 'The clock and lived-time framing.',
    gather: function (_a) { return 'now: ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; } },

  { id: 'recency', order: 2, reading: 'Gap since the user’s last turn — shapes whether to greet, recap, or continue mid-flow.',
    gather: function (a) {
      var st = a._memoryStore;
      if (!st || !st.recency) return null;
      return st.recency().then(function (r) {
        if (!r) return null;
        var ago = r.gapMs < 60e3 ? Math.round(r.gapMs / 1e3) + 's'
                : r.gapMs < 3600e3 ? Math.round(r.gapMs / 60e3) + 'm'
                : r.gapMs < 86400e3 ? Math.round(r.gapMs / 3600e3) + 'h'
                : Math.round(r.gapMs / 86400e3) + 'd';
        return 'recency: ' + r.tier + ' — last user turn ' + ago + ' ago';
      });
    } },

  { id: 'location', order: 3, reading: 'Where the user is on the planet. Precedence: a manually-set address (trust it), then a device-geolocation fix, then the IP-derived city (approximate — the connection, not the person), then timezone. Never assume more precision than the tag admits.',
    gather: function (a) {
      var byS = a._userLocation;
      var cli = byS && (byS[a._wmSession] || byS['default']);
      var ip = a._ipLocation;
      function render(loc, hint) {
        if (!loc) return null;
        var parts = [];
        if (loc.address) parts.push(loc.address);
        if (loc.lat != null && loc.lon != null) parts.push(Number(loc.lat).toFixed(5) + ', ' + Number(loc.lon).toFixed(5) + (loc.acc ? ' (±' + Math.round(loc.acc) + 'm)' : ''));
        if (!parts.length && loc.tz) parts.push(loc.tz);
        return parts.length ? 'user location: ' + parts.join(' · ') + hint : null;
      }
      // Precedence: manual set → device fix → IP city → timezone floor.
      if (cli && cli.manual && cli.address) return render(cli, ' [set manually — trust this]');
      if (cli && (cli.address || cli.lat != null)) return render(cli, ' [device geolocation]');
      if (ip && ip.address) return render(ip, ' [by IP — approximate city, the connection not the person]');
      if (cli && cli.tz) return render(cli, ' [timezone only]');
      return null;
    } },

  { id: 'presence', order: 4, reading: 'Who is present right now.',
    gather: function (a) {
      var p = a._presence || (a.latestPresence && a.latestPresence());
      return (p && typeof p.line === 'function') ? p.line() : null;
    } },

  { id: 'affect', order: 4, reading: 'Your felt state — let it color your delivery, don’t narrate it.',
    gather: function (a) {
      var af = a.latestAffect && a.latestAffect();
      return (af && typeof af.line === 'function') ? af.line() : null;
    } },

  { id: 'relationship', order: 4.5, reading: 'Who you are talking with (Relationship Buffer) — persona to inhabit and match, not a fact to recite.',
    gather: function (a) {
      var rels = a._relations || [];
      var pick = rels.filter(function (r) { return r.layer === 'counterpart'; });
      pick = (pick.length ? pick : rels).slice(0, 2);
      var who = pick.map(function (r) {
        var base = typeof r.line === 'function' ? r.line() : (r.person + (r.relation ? ' — ' + r.relation : ''));
        return 'talking with: ' + base + (r.notes ? ' (' + String(r.notes).replace(/\s+/g, ' ').slice(0, 60) + ')' : '');
      });
      return who.length ? who : null;
    } },

  { id: 'held', order: 5, reading: 'Held attention (Executive) — your current focus, intent, and open loops; maintain with your tools.',
    gather: function (a) {
      var x = a._wmExecutive || {}, out = [];
      if (x.focus) out.push('focus: ' + x.focus.value);
      if (x.intent) out.push('intent: ' + x.intent.value);
      if (x['open-loops'] && (x['open-loops'].value || []).length) out.push('open loops: ' + x['open-loops'].value.join('; '));
      return out.length ? out : null;
    } },

  { id: 'sketchpad', order: 5.5, reading: 'Objects pinned at hand (Sketchpad) — the desk in front of you; these are what you are working with, act on them.',
    gather: function (a) {
      var sk = a._wmSketchpad || {};
      var pins = Object.keys(sk);
      if (!pins.length) return null;
      return 'pinned at hand: ' + pins.map(function (k) { var v = sk[k]; return typeof v === 'string' ? v : (v && (v.ref || v.label)) || k; }).join(' · ');
    } },

  { id: 'recall', order: 5.7, reading: 'Memories pulled into the present this turn (Recall Buffer) — reason WITH them; don’t re-fetch what you already hold.',
    gather: function (a) {
      var r = a._wmRecall || [];
      if (!r.length) return null;
      return r.slice(-4).map(function (m) { return 'recalled [' + (m.kind || 'mem') + ']: ' + String(m.text || '').replace(/\s+/g, ' ').slice(0, 100); });
    } },

  { id: 'prior-sessions', order: 6, reading: 'Recognisable prior sessions (episodic) — recall for detail, don’t recite.',
    gather: function (a) {
      var st = a._memoryStore;
      if (!st || !st.sessionDigests) return null;
      return st.sessionDigests(4, a._wmSession || '').then(function (ds) {
        return (ds && ds.length) ? ds.map(function (d) { return 'prior session: ' + d.line(); }) : null;
      });
    } },

  { id: 'loops', order: 7, reading: 'Your autonomic beats — the loops actually running.',
    gather: function (a) {
      var loops = (a._runtimeLoops || []).map(function (l) { var r = l.report(); return r.id + '×' + r.runs; });
      return loops.length ? 'loops alive: ' + loops.join(', ') : null;
    } },

  { id: 'telemetry', order: 8, reading: 'How busy your body is (rolling counters).',
    gather: function (a) {
      var t = (a.telemetry && a.telemetry()) || [];
      return t.length ? 'telemetry: ' + t.length + ' recent events' : null;
    } },

  { id: 'discourse', order: 9, reading: 'The turn window (Discourse Loop) — the live conversation you are in, so you feel its span.',
    gather: function (a) {
      var n = a._wmDiscourseCount;
      return (typeof n === 'number' && n > 0) ? 'conversation window: ' + n + ' turn' + (n === 1 ? '' : 's') + ' this session' : null;
    } }
];

// ── The class ───────────────────────────────────────────────────────────────
class Attention {
  /**
   * @param {object} raw — { id, mode: 'gate' | 'held', seat?, what? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Attention' }, raw));
    if (violations.length) {
      throw new Error('[proto:attention] OEP violations (' + (raw.id || '?') + '): ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() { return this.mode + ' attention' + (this.seat ? ' @ ' + this.seat : ''); }

  /** The fields this gate can project (glass-box; ids + readings, no agent). */
  fields() { return FIELDS.map(function (f) { return { id: f.id, order: f.order, reading: f.reading }; }); }

  /**
   * PROJECT the prompt head — the gate's operation (ADR 0016 §3). Gathers
   * each field from the live agent, keeps only the ones that FIRED (a source
   * that is really populated), orders them, and returns the projection:
   *   { lines: [...], fields: [{ id, reading, lines }], at }
   * Caches onto agent._lastAwareness so the object diagram and glass-box
   * route read the SAME projection the model saw. Fails loud, tagged, per
   * field — a broken faculty never tanks the whole head (better than Vega's
   * silent catch: we say which field failed).
   */
  project(agent) {
    if (this.mode !== 'gate') return Promise.resolve({ lines: [], fields: [], at: new Date().toISOString() });
    return Promise.all(FIELDS.map(function (f) {
      return Promise.resolve().then(function () { return f.gather(agent); })
        .then(function (out) { return { f: f, out: out }; })
        .catch(function (e) { console.warn('[proto:attention:' + f.id + '] gather failed:', e && String(e.message).slice(0, 120)); return { f: f, out: null }; });
    })).then(function (results) {
      results.sort(function (a, b) { return a.f.order - b.f.order; });
      const lines = [], fields = [];
      results.forEach(function (r) {
        let outLines = r.out == null ? [] : (Array.isArray(r.out) ? r.out : [r.out]);
        outLines = outLines.filter(Boolean);
        if (!outLines.length) return;
        fields.push({ id: r.f.id, reading: r.f.reading, lines: outLines });
        outLines.forEach(function (l) { lines.push(l); });
      });
      const projection = { lines: lines, fields: fields, at: new Date().toISOString() };
      agent._lastAwareness = projection;
      return projection;
    });
  }
}

// ── The inherited instances — one per process, shared, frozen ────────────────
const GATE = new Attention({ id: 'gate', mode: 'gate', seat: 'thalamus',
  what: 'exogenous — decides what gets IN and projects the prompt head' });
const HELD = new Attention({ id: 'held', mode: 'held', seat: 'executive',
  what: 'endogenous — focus-driven, decides what stays ALIVE' });

Attention.GATE = GATE;
Attention.HELD = HELD;
Attention.BASE_ATTENTIONS = Object.freeze([GATE, HELD]);
Attention.FIELDS = FIELDS;

module.exports = Attention;
