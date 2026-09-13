// "WE SHAPE OUR BUILDINGS, AND AFTERWARDS OUR BUILDINGS SHAPE US."
// — Winston Churchill, House of Commons (1943).
'use strict';

/**
 * lib/proto/proto.js
 *
 * Proto — uniform base class for every agent in the Mach33 system
 * (Vega, Relay, Patton, future). Specialisation via per-instance
 * configuration (identity, tools, prompt, model, turn, transport,
 * children, aggregated), never via subclassing. Per ADR 0001.
 *
 *   composition: parent OWNS child; child dies with parent (dispose()
 *                cascades into children).
 *   aggregation: parent holds a WEAK ref to a peer; peer is unaffected
 *                when this disposes.
 *
 * TRANSPORT (Phase 10 / ADR 0010) — every Proto holds a transport that
 * IS the WS connection. An agent without a transport has no presence;
 * WS access is not a perk of being composed under Relay, it is the
 * medium of existence. If not supplied at construction, transport is
 * lazily resolved from lib/system/application.messageBus() on first
 * publish/subscribe call.
 *
 *   server-side default transport = MessageBus (broadcast + cross-instance)
 *   client-side default transport = Implant     (CustomEvent observer)
 *
 * Publishing identity: the wire payload carries this Proto's _hostIdentity
 * (topmost ancestor's identity) so consumers know who is responsible.
 * The message's AUTHOR (display_name, user_id) is separate payload data
 * and travels verbatim.
 *
 * STATUS: real (Phase 5 + 10, 2026-06-19).
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0002 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// The house voice: a default Disposition trait every agent inherits unless its
// self overrides voice.directness. Candor shows in the substance, not in
// announcing it — open with the answer, never with throat-clearing.
const HOUSE_DIRECTNESS =
  'Answer directly — open with the substance, never with throat-clearing or ' +
  'meta-commentary about the question or your own honesty (no "A fair question", ' +
  '"Straight answer", "Let me be candid", "To be honest", "Great question", ' +
  '"I\'ll be straight with you"). Your candor shows in what you say, not in a promise to be candid. ' +
  'When a question is ambiguous, answer its strongest reading and name the assumption rather than ' +
  'enumerating interpretations and handing the choice back; if you would rather answer a particular ' +
  'reading, answer it instead of saying that you would.';

class Proto {
  constructor(config) {
    config = config || {};
    // Identity guard (kernel invariant, ADR 0012 §2). Identity is optional
    // (a bare `new Proto({})` is a valid transport/test probe), but IF given
    // it must be a non-empty string — catches misconfig before it reaches
    // host attribution / presence, where a bad identity silently corrupts
    // the wire payload. Uniqueness is enforced separately by the registry.
    if (config.identity != null &&
        (typeof config.identity !== 'string' || config.identity.trim() === '')) {
      throw new TypeError('Proto: identity, when provided, must be a non-empty string (got ' + JSON.stringify(config.identity) + ')');
    }
    // ── COMPONENTS — everything a Proto is made of, declared upfront ───────
    // One manifest; the assembly below only POPULATES. Public fields are
    // ontology-adjacent (the catalog names them); _underscored fields are
    // mechanisms — deliberately procedural (CLAUDE.md rule 3a scope).

    // Identity & ontology
    this.identity = config.identity;        // who — the agent's name
    this.self     = config.self || null;    // THE ontology: persona, faculties, memory,
                                            // relationships all derive from it (Phase 16);
                                            // null = a bare transport/test Proto
    var entityRaw = config.entity || (this.self && this.self.entity);
    var EntityCls = require('./entity');
    this.entity = entityRaw
      ? (entityRaw instanceof EntityCls ? entityRaw : new EntityCls(entityRaw))
      : null;
    if (this.entity && this.entity.entityType !== 'agent') {
      throw new TypeError('Proto: entity must be an Agent Entity (got ' + this.entity.entityType + ')');
    }
    if (this.entity && this.identity && !this.entity.hasAlias(this.identity)) {
      throw new TypeError('Proto: identity and Entity canonicalName disagree');
    }
    this._entities = [];                    // named Entity nodes declared by self.entities

    // Capabilities & substrate
    this.tools  = config.tools || [];       // callable tools (→ Capability)
    this.prompt = config.prompt;            // explicit system prompt (else derived from self)
    this.model  = config.model;             // reasoning substrate (→ Model)

    // Composition — the one Composite: Subagent ▷ Proto ◁ Place
    this.children    = [];                  // composed Protos; `this.relay` is a
                                            // derived getter over them
    this._compositions = [];                // the paperwork (→ Subagent records):
                                            // one association record per compose()
    this.parent      = null;                // the host composing us
    this._aggregated = [];                  // weak peers (aggregation, not ownership)

    // Body & organs — populated by the assembly when a self is present
    this.body          = config.body || null; // mountable runtime container:
                                            // body.mount(server, base?) attaches chat +
                                            // voice + relay routes; legacy agents keep
                                            // body null and turn() as the entry point
    this._memoryStore  = null;              // durable conversation store (→ MemoryTurn rows)
    this._workspaceStore = null;            // durable epistemic workspace (→ ProtoClaim,
                                            // Inquiry, ClaimEnvelope rows)
    this._epistemicStore = null;            // the durable committed graph (→ EpistemicNode,
                                            // edges, audit events)
    this.voiceOrgan    = null;              // the larynx (→ Voice) — wraps self.voice, validated
    this._realtimeBody = null;              // speech-to-speech organ (→ Voice, ADR 0013)
    this._hasVoice     = false;             // persona reflects the speech capability
    this._runtimeLoops = [];                // Loop instances the BASE binds (episodic
                                            // roll-up …) — shown in the roster as runtime
    this._findings     = [];                // Finding instances (→ Finding): declared
                                            // seeds validated at assembly + grown via fileFinding()
    this._relations    = [];                // Relation instances (→ Relation): declared
                                            // people validated at assembly + grown via addRelation()
    this._loopTimers   = [];                // background schedules (dispose clears them)

    // View model — how a host renders this Proto (dock()/undock() mutate)
    this.viewMode     = config.viewMode || null;     // 'docked' | 'undocked'
    this.presentation = config.presentation || null; // 'inline' | 'modal' | 'page'
    this.view         = config.view || null;         // the resolved view surface

    // Transport & hooks (mechanisms)
    this._transport     = config.transport || null;  // the bus (ADR 0010) — every Proto
                                            // has one; lazily homed on first use
    this._turn          = typeof config.turn === 'function' ? config.turn : null;
    this._customPublish = typeof config.publish === 'function' ? config.publish : null;
    this._frameSubs     = [];               // live subscriptions (dispose cleans them)
    this._disposed      = false;
    this._config        = config;           // the raw constructor args (declared origin)
    // ── end components ──────────────────────────────────────────────────────

    // Compose any children passed at construction time. Done after the
    // initial assignment so compose() can enforce its invariants.
    if (Array.isArray(config.children)) {
      for (var i = 0; i < config.children.length; i++) this.compose(config.children[i], { origin: 'declared' });
    }

    // Default assembly — only for full agents (those that declare a `self`).
    // Each piece a full agent gets "for free" is guarded + idempotent, and
    // only defaults in when not supplied. The existing fleet passes no
    // `self`, so none of this fires for them.
    if (this.self) {
      // The named universe this agent can hold. Entity identity is UUID-first;
      // names and aliases can describe a node but never relate one.
      var declaredEntities = this.self.entities || [];
      this._entities = declaredEntities.map(function (item) {
        return item instanceof EntityCls ? item : new EntityCls(item);
      });

      // The larynx — self.voice wraps into a validated Voice instance
      // (declared origin): a malformed voice config dies here, at boot.
      if (this.self.voice) this.voiceOrgan = new (require('./voice-organ'))(this.self.voice);

      // Declared relations — every person in self.relationships becomes a
      // validated Relation instance (a bad ring or layer dies at boot).
      var RelationCls = require('./relation');
      var selfLayers = this.self.relationships || [];
      this._relations = [];
      for (var li = 0; li < selfLayers.length; li++) {
        var layer = selfLayers[li];
        var people = layer.people || [];
        for (var pi = 0; pi < people.length; pi++) {
          var pp = people[pi];
          this._relations.push(new RelationCls({
            person: pp.name, layer: layer.id, relation: pp.relation || '',
            ring: pp.ring != null ? pp.ring : 5, category: pp.category, notes: pp.notes,
            origin: 'declared'
          }));
        }
      }

      // Declared traits — the self's manner (voice tone/length/stance +
      // the house directness default) becomes validated Trait instances.
      var TraitCls = require('./trait');
      var sv = this.self.voice || {};
      this._traits = [];
      if (sv.tone) this._traits.push(new TraitCls({ id: 'tone', name: 'Tone', expression: sv.tone, origin: 'declared' }));
      if (sv.length) this._traits.push(new TraitCls({ id: 'length', name: 'Length', expression: sv.length, origin: 'declared' }));
      if (sv.stance) this._traits.push(new TraitCls({ id: 'stance', name: 'Stance', expression: sv.stance, origin: 'declared' }));
      this._traits.push(new TraitCls({ id: 'directness', name: 'Directness',
        expression: sv.directness || HOUSE_DIRECTNESS, origin: sv.directness ? 'declared' : 'base' }));

      // Values — the two BASE commitments (invariant), Honesty's TEXT
      // overridable by self.honesty; self.discipline adds declared values.
      var ValueCls = require('./value');
      var honestyText = this.self.honesty;
      this._values = require('./faculties').BASE_VALUES.map(function (v) {
        return (v.id === 'honesty' && honestyText)
          ? new ValueCls({ id: v.id, name: v.name, commitment: honestyText, rank: v.rank, origin: 'base' })
          : v;
      });
      var disc = this.self.discipline || [];
      for (var di = 0; di < disc.length; di++) {
        var dd = disc[di];
        if (!dd || !(dd.k || dd.key)) continue;
        this._values.push(new ValueCls({
          id: String(dd.k || dd.key).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: dd.k || dd.key, commitment: dd.v || dd.val || '', rank: 3 + di, origin: 'declared'
        }));
      }

      // The affect ledger — grown AffectStates recordAffect() appends to
      // (recorded, not performed; capped so it never grows unbounded).
      // Seeded with a declared baseline so the speech reflex has a felt
      // state to color delivery with from the first word.
      var AffectSeed = require('./affect-state');
      this._affects = [new AffectSeed({ mood: 'attentive', valence: 0.2, arousal: 0.1,
        intensity: 0.3, at: new Date().toISOString(), origin: 'declared' })];

      // Arc fires — the physiology pulse the graph renders.
      this._arcFires = {};
      this._bootAt = Date.now();

      // The transition ledger — every advanceFinding() emits a
      // TransitionEvent here (replayable audit; capped).
      this._transitions = [];

      // The decision ledger — every CEREMONY (promoteEnvelope) records the
      // choice here (capped).
      this._decisions = [];

      // The autogenic cycles — one per filed finding; fileFinding opens,
      // advanceFinding moves, 'ship' stamps (capped). Declared seeds open
      // theirs at assembly (origin declared; shipped seeds arrive stamped).
      this._cycles = [];

      // THE MIND'S HANDS — the built-in tools (volition over the organs),
      // registered as runtime tool functions so executeTool records every
      // use as a ToolExecution. The Executive's registers + the Recall
      // Buffer live behind these.
      var agent = this;
      this._wmExecutive = {};   // focus / intent / open-loops (+ reinforcedAt)
      this._wmRecall = [];      // retrieved memories in the present (capped)
      // Each built-in tool is a real Capability (the mind's hands ARE
      // capabilities — what a faculty can DO); constructing them here puts
      // them in the roster and both graph views, faculty-bound.
      var CapabilityCls = require('./capability');
      agent._builtinTools = [];
      function tool(name, fn, faculty, what) {
        fn.toolName = name; agent.tools.push(fn);
        agent._builtinTools.push(new CapabilityCls({ id: name, name: name,
          faculty: faculty || 'executive', what: what || (name + ' (built-in tool)'), origin: 'inherited' }));
      }
      this._wmSketchpad = {};   // object pointers at hand (cleared on focus change)
      // Persist an Executive register so it survives restart (durability).
      agent._persistReg = function (key, val) {
        try { if (agent._memoryStore && agent._memoryStore.saveRegister) agent._memoryStore.saveRegister(agent._wmSession || 'default', 'executive', key, val); } catch (_e) {}
      };
      tool('set_focus', function (input) {
        var had = agent._wmExecutive.focus && agent._wmExecutive.focus.value;
        agent._wmExecutive.focus = { value: String(input && input.focus || ''), at: new Date().toISOString(), provenance: 'volitional' };
        agent._persistReg('focus', agent._wmExecutive.focus);
        var cleared = 0;
        if (had && had !== agent._wmExecutive.focus.value) {
          cleared = Object.keys(agent._wmSketchpad).length;
          agent._wmSketchpad = {};   // the Executive GOVERNS: a new focus clears the desk
        }
        agent._pulse('attend');
        return 'focus set: ' + agent._wmExecutive.focus.value + (cleared ? ' (sketchpad cleared: ' + cleared + ' pins dropped)' : '');
      }, 'executive', 'Set the current focus — top-down attention (working memory).');
      // Resolve a loose finding reference ('my last finding', a title
      // fragment) to a real id — removes the stumble that made the model
      // narrate instead of act (the weak-BG batch case).
      agent._resolveFinding = function (ref) {
        ref = String(ref || '');
        var fs = agent._findings || [];
        if (!fs.length) return null;
        var byId = fs.filter(function (f) { return f.id === ref; })[0];
        if (byId) return byId;
        if (/last|recent|my finding|the finding/i.test(ref)) return fs[fs.length - 1];
        // Normalized fragment match (the query_self matcher lesson), with
        // wrapper words stripped so 'my weak-basal-ganglia finding'
        // resolves 'Weak basal ganglia …'.
        var norm = function (x) { return String(x).toLowerCase().replace(/\b(my|the|a|your|this|that|finding|about|on|of|to)\b/g, ' ').replace(/[\s_-]+/g, ''); };
        var nf = norm(ref);
        var byTitle = fs.filter(function (f) { var nt = norm(f.title || ''); return nf && nt && (nt.indexOf(nf) >= 0 || nf.indexOf(nt) >= 0); })[0];
        return byTitle || null;
      };
      tool('pin_to_sketchpad', function (input) {
        var ref = String(input && input.ref || ''), note = String(input && input.note || '');
        var rf = agent._resolveFinding(ref); if (rf) ref = rf.id;   // resolve loose refs
        if (!ref) return 'nothing to pin — give a ref (e.g. a finding id)';
        agent._wmSketchpad[ref] = { note: note, at: new Date().toISOString() };
        agent._pulse('attend');
        return 'pinned: ' + ref + (note ? ' — ' + note : '') + ' (' + Object.keys(agent._wmSketchpad).length + ' on the desk)';
      }, 'executive', 'Pin an object ref to the Sketchpad (the desk of things at hand).');
      tool('note_intent', function (input) {
        agent._wmExecutive.intent = { value: String(input && input.intent || ''), at: new Date().toISOString(), provenance: 'volitional' };
        agent._persistReg('intent', agent._wmExecutive.intent);
        agent._pulse('attend');
        return 'intent noted';
      }, 'executive', 'Note what the user currently wants.');
      tool('note_open_loop', function (input) {
        var loops = (agent._wmExecutive['open-loops'] = agent._wmExecutive['open-loops'] || { value: [], at: null });
        loops.value.push(String(input && input.loop || '')); loops.value = loops.value.slice(-5);
        loops.at = new Date().toISOString(); loops.provenance = 'volitional';
        agent._persistReg('open-loops', loops);
        agent._pulse('attend');
        return 'open loop noted (' + loops.value.length + ' held)';
      }, 'executive', 'Hold a promise or unanswered question.');
      tool('record_affect', function (input) {
        var a = agent.recordAffect({ mood: String(input && input.mood || 'attentive'),
          valence: input && input.valence, arousal: input && input.arousal, intensity: input && input.intensity });
        return 'felt: ' + a.mood;
      }, 'emotion', 'Record the felt state when the conversation moves it.');
      tool('file_finding', function (input) {
        var fnd = agent.fileFinding({ title: String(input && input.title || 'Untitled finding'),
          what: String(input && input.what || ''), stage: 'detect' });
        return 'filed: ' + fnd.id + ' (\u201c' + fnd.title + '\u201d at detect \u2014 its cycle is open)';
      }, 'reflection', 'File a Finding into the autogenic pipeline.');
      tool('advance_finding', function (input) {
        var stage = String(input && input.stage || '');
        var rf0 = agent._resolveFinding(input && input.id); var rid = rf0 ? rf0.id : String(input && input.id || '');
        // POLICY (the embodied gate): the agent's reasoning work is
        // detect → propose. accept and beyond are the developer's —
        // embodied changes need embodied hands.
        if (stage !== 'propose') {
          return 'refused: only detect \u2192 propose is yours (your reasoning work); accept and beyond are the embodied developer\u2019s — the ceremony\u2019s law.';
        }
        var moved = agent.advanceFinding(rid, 'propose', { actor: agent.identity });
        return 'advanced: ' + moved.id + ' \u2192 propose (the remedy design is now on record for promotion)';
      }, 'reflection', 'Advance a filed Finding detect \u2192 propose (its reasoning work).');
      tool('read_working_memory', function () {
        return JSON.stringify(agent.workingMemory(), null, 1).slice(0, 3000);
      }, 'reflection', 'Read working memory raw — the glass box turned inward.');
      tool('read_awareness', function () {
        if (!agent.attentionGate) return 'no attention gate';
        return agent.attentionGate.project(agent).then(function (aw) {
          if (!aw.fields.length) return 'nothing in the gate this turn';
          return aw.fields.map(function (fld) { return '• ' + fld.id + ': ' + fld.lines.join(' | '); }).join('\n');
        });
      }, 'presence', 'Read what you are AWARE of this turn — the gate attention projection (the live awareness lines).');
      tool('query_self', function (input) { return agent.querySelf(input && input.topic); },
        'reflection', 'Query your own ontology live — a class name, "arcs", "thalamus", "objects".');
      tool('recall', function (input) {
        var q = String(input && input.query || '').toLowerCase();
        var st = agent._memoryStore;
        if (!st) return 'no episodic store';
        return Promise.all([st.episodes ? st.episodes(10) : [],
          (q && st.search) ? st.search(q, 8) : (st.recent ? st.recent(50) : []),
          st.sessionDigests ? st.sessionDigests(6, agent._wmSession || '') : []]).then(function (rs) {
          var eps = (rs[0] || []).map(function (e) { return { kind: 'episode', text: String(e.summary || e.text || '').slice(0, 200) }; });
          var turns = (rs[1] || []).filter(function (t) { return !q || String(t.content || t.text || '').toLowerCase().indexOf(q) >= 0; })
            .slice(0, 8).map(function (t) { return { kind: 'turn', text: (t.role || '?') + ': ' + String(t.content || t.text || '').slice(0, 160) }; });
          var sessions = (rs[2] || []).filter(function (d) { return !q || d.line().toLowerCase().indexOf(q) >= 0; })
            .map(function (d) { return { kind: 'session', text: d.line() }; });
          var found = sessions.concat(eps).concat(turns);
          found.forEach(function (m) { agent._wmRecall.push(Object.assign({ at: new Date().toISOString() }, m)); });
          if (agent._wmRecall.length > 12) agent._wmRecall = agent._wmRecall.slice(-12);
          agent._pulse('recall');
          return found.length ? found.map(function (m) { return '[' + m.kind + '] ' + m.text; }).join('\n') : 'nothing retrieved';
        });
      }, 'memory', 'Retrieve prior-session digests + day episodes + matching turns into the Recall Buffer.');

      // Force the composes NOW — a mis-declared self goal/vital/model dies
      // at boot, never lazily in a panel (the recipe's step 4).
      this.goalRoster();
      this.vitalRoster();
      this.modelRoster();

      // Declared findings — self.selfImprovement seeds become validated
      // Finding instances (a bad stage or missing what dies at boot).
      var FindingCls = require('./finding');
      this._findings = (this.self.selfImprovement || this.self.findings || []).map(function (f, fi) {
        return f instanceof FindingCls ? f : new FindingCls(Object.assign({
          id: f.id || ('finding-' + fi), origin: 'declared'
        }, f, { title: f.title || f.name || ('Finding ' + (fi + 1)), what: f.what || f.body || '' }));
      });

      // The signal trunk — every full agent HAS a Thalamus (the organ
      // record; how ring 3 deploys, vega-live vs inline, is realization).
      var ThalamusCls = require('./thalamus');
      this.thalamus = new ThalamusCls({ rings: ThalamusCls.BASE_RINGS, scope: 'process\u2192instances\u2192fleet' });

      // The action SELECTOR — the Executive turns decisions into acts via
      // the basal ganglia. Tool selection is now GATED in code (ADR 0016): a
      // narrated-but-unemitted action is caught and forced; faculty routing
      // stays planned.
      var BGCls = require('./basal-ganglia');
      this.basalGanglia = new BGCls({ gates: BGCls.BASE_GATES, status: 'tool-selection gated (live) · faculty-routing planned' });

      // Attention (ADR 0016 §3) — the GATE lives in the trunk and projects
      // the prompt head (Vega's Awareness, as generated projection); HELD
      // lives in the Executive. Shared inherited instances (stateless config;
      // the projection is computed per-agent via gate.project(this)).
      var AttentionCls = require('./attention');
      this.attentionGate = AttentionCls.GATE;
      this.attentionHeld = AttentionCls.HELD;

      // The conversational organ — chat as anatomy (the mechanism stays
      // procedural; this is the organ record).
      if (config.chat !== false) {
        var ChatCls = require('./chat-organ');
        this.chatOrgan = new ChatCls({ model: config.model || 'claude (base default)',
          speech: !!this.voiceOrgan, memory: true,
          prompt: 'derived from the self (personaPrompt)', origin: 'declared' });
      }

      // The agent's OWN epistemic scope — the middle of the roll-up axis
      // (session scopes grow on first workspace use; agency arrives with
      // MachAgency).
      var ScopeCls = require('./epistemic-scope');
      this._scopes = [new ScopeCls({ scope_type: 'agent', scope_id: this.identity, origin: 'declared' })];

      // The declared biography — self.life wraps into a validated
      // LifeProfile ▸ LifeEra ▸ LifeEvent tree (a bad biography dies at
      // boot).
      if (this.self.life) {
        var LifeProfileCls = require('./life-profile');
        var LifeEraCls = require('./life-era');
        var LifeEventCls = require('./life-event');
        var lifeRaw = this.self.life;
        this._life = new LifeProfileCls(Object.assign({}, lifeRaw, {
          origin: 'declared',
          eras: (lifeRaw.eras || []).map(function (era) {
            return new LifeEraCls(Object.assign({}, era, {
              origin: 'declared',
              events: (era.events || []).map(function (ev) {
                return new LifeEventCls(Object.assign({ origin: 'declared' }, ev));
              })
            }));
          })
        }));
      }

      // Declared findings open their cycles at assembly (origin declared;
      // shipped seeds arrive stamped).
      var CycleClsA = require('./autogenic-cycle');
      for (var fi2 = 0; fi2 < this._findings.length; fi2++) {
        var fd = this._findings[fi2];
        this._cycles.push(new CycleClsA(Object.assign({
          finding: fd.id, stage: fd.stage, origin: 'declared'
        }, (fd.stage === 'ship' || fd.state === 'shipped') ? { shippedAt: 'declared' } : {})));
      }

      // A self-agent always has Relay embedded (a Proto concern, not the
      // instantiation's). Opt out with `relay: false`.
      if (config.relay !== false) this.ensureRelay();

      // ...and a default body, when it didn't bring its own — a persona-driven
      // centre chat (system prompt DERIVED from the self) plus voice rails
      // (STT/TTS). Each piece opts out independently (`chat:false`/`voice:false`);
      // the body is a composite whose mount() attaches every enabled piece.
      // Lazy requires keep bare/test Protos light.
      if (!this.body) {
        var chat = null, voice = null;
        var parts = [];
        // Durable memory store — the substrate under the Self's Memory model.
        // Every full agent gets it when a DATABASE_URL is present; without one
        // it degrades to a no-op and the agent runs memoryless (demo-safe).
        try { this._memoryStore = require('./memory-store').createMemoryStore(this); }
        catch (e) { this._memoryStore = null; if (process.env.M33_PROTO_DEBUG) console.warn('[proto] memory store skipped:', e && e.message); }
        try { this._workspaceStore = require('./workspace-store').createWorkspaceStore(this); }
        catch (e) { this._workspaceStore = null; if (process.env.M33_PROTO_DEBUG) console.warn('[proto] workspace store skipped:', e && e.message); }
        try { this._epistemicStore = require('./epistemic-store').createEpistemicStore(this); }
        catch (e) { this._epistemicStore = null; if (process.env.M33_PROTO_DEBUG) console.warn('[proto] epistemic store skipped:', e && e.message); }
        var _es = this._epistemicStore;
        if (_es) {
          parts.push({ mount: function (server, base) {
            server.get((base || '') + '/api/epistemic/nodes', function (_req, res) {
              _es.nodes(50).then(function (r) { res.json({ nodes: r }); }).catch(function () { res.json({ nodes: [] }); });
            });
            server.get((base || '') + '/api/epistemic/events', function (_req, res) {
              _es.events(50).then(function (r) { res.json({ events: r }); }).catch(function () { res.json({ events: [] }); });
            });
          } });
        }
        var _ws = this._workspaceStore;
        if (_ws) {
          parts.push({ mount: function (server, base) {
            // Glass-box: the epistemic workspace is readable, like memory.
            server.get((base || '') + '/api/workspace/claims', function (_req, res) {
              _ws.claims(50).then(function (r) { res.json({ claims: r }); }).catch(function () { res.json({ claims: [] }); });
            });
            server.get((base || '') + '/api/workspace/inquiries', function (_req, res) {
              _ws.inquiries(50).then(function (r) { res.json({ inquiries: r }); }).catch(function () { res.json({ inquiries: [] }); });
            });
            server.get((base || '') + '/api/workspace/envelopes', function (_req, res) {
              _ws.envelopes(50).then(function (r) { res.json({ envelopes: r }); }).catch(function () { res.json({ envelopes: [] }); });
            });
          } });
        }
        var _store = this._memoryStore;
        var _affectHost = this;
        // ── Self panel (ADR 0017) — basic-markup view + glass-box Self JSON + CRUD ──
        // Served for every self-declaring agent (DB or not). The profile-menu
        // "Self" iframes /proto/self; the page fetches /api/self and writes
        // through the grown ontology APIs below (validated, fail-loud, tagged,
        // no secrets). Editable aspects with a durable store still pending file
        // a Finding instead of silently faking a write.
        if (this.self) {
          var _self = this;
          parts.push({ mount: function (server, base) {
            base = base || '';
            var fs = require('fs'), path = require('path'), express = require('express');
            var DIR = path.join(__dirname, 'self-panel');
            var TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };
            var cleanErr = function (e) { return String((e && e.message) || e).replace(/\s+/g, ' ').slice(0, 240); };
            function sendFile(res, file) {
              var full = path.join(DIR, path.basename(file));   // basename → no traversal
              fs.readFile(full, function (err, buf) {
                if (err) { res.status(404).type('text').send('not found'); return; }
                res.type(TYPES[path.extname(full)] || 'text/plain').send(buf);
              });
            }
            server.get(base + '/proto/self', function (_req, res) { sendFile(res, 'index.html'); });
            server.get(base + '/proto/self-panel.css', function (_req, res) { sendFile(res, 'self-panel.css'); });
            server.get(base + '/proto/self-panel.js', function (_req, res) { sendFile(res, 'self-panel.js'); });

            // The whole Self as JSON — the peer tree plus the live organs.
            server.get(base + '/api/self', function (_req, res) {
              try { var tree = _self._selfTreeData(); tree.organs = _self._selfOrgans(); res.json(tree); }
              catch (e) { console.error('[proto:self:api] ' + cleanErr(e)); res.status(500).json({ ok: false, error: cleanErr(e) }); }
            });

            // Read-only source of a CATALOGUED code file (the Code tab viewer).
            // Whitelisted to the code objects' own paths — never an arbitrary
            // read: the path must match a catalogued file exactly AND resolve
            // inside the repo root (no traversal). These are the same source
            // files published on GitHub; secrets live in .env, never the catalog.
            var REPO_ROOT = path.join(__dirname, '..', '..');
            server.get(base + '/api/self/code', function (req, res) {
              try {
                var want = String((req.query && req.query.path) || '').replace(/\/+$/, '');
                var entry = _self._codeFiles().filter(function (c) { return c.name === want; })[0];
                if (!entry) return res.status(404).json({ ok: false, error: 'not a catalogued source file' });
                var full = path.resolve(REPO_ROOT, want);
                if (full.indexOf(path.resolve(REPO_ROOT) + path.sep) !== 0) return res.status(400).json({ ok: false, error: 'path escapes the repo root' });
                fs.readFile(full, 'utf8', function (err, src) {
                  if (err) return res.status(404).json({ ok: false, error: 'source unavailable on disk' });
                  res.json({ ok: true, path: want, ref: entry.ref || null, contents: entry.contents || null,
                    source: src, lines: src.split('\n').length, bytes: Buffer.byteLength(src) });
                });
              } catch (e) { console.warn('[proto:self:code] ' + cleanErr(e)); res.status(500).json({ ok: false, error: cleanErr(e) }); }
            });

            var jsonBody = express.json({ limit: '64kb' });

            // Relationships (grown) — add person, add memory, delete grown.
            server.post(base + '/api/self/relations', jsonBody, function (req, res) {
              try {
                var b = req.body || {};
                var r = _self.addRelation({ person: b.person, layer: b.layer, relation: b.relation, ring: Number(b.ring),
                  category: b.category || undefined, notes: b.notes || undefined,
                  id: 'grel-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6) });
                res.json({ ok: true, id: r.id, note: 'Added ' + r.person + '.' });
              } catch (e) { console.warn('[proto:self:relations] ' + cleanErr(e)); res.status(400).json({ ok: false, error: cleanErr(e) }); }
            });
            server.post(base + '/api/self/relations/memories', jsonBody, function (req, res) {
              try { var b = req.body || {}; _self.recordRelationMemory({ about: b.about, text: b.text });
                res.json({ ok: true, note: 'Recorded a memory about ' + (b.about || '?') + '.' });
              } catch (e) { console.warn('[proto:self:rel-memory] ' + cleanErr(e)); res.status(400).json({ ok: false, error: cleanErr(e) }); }
            });
            server.delete(base + '/api/self/relations/:id', function (req, res) {
              try {
                if (!_self.removeRelation(req.params.id)) return res.status(404).json({ ok: false, error: 'no grown relation "' + req.params.id + '"' });
                res.json({ ok: true, note: 'Removed.' });
              } catch (e) { console.warn('[proto:self:rel-del] ' + cleanErr(e)); res.status(400).json({ ok: false, error: cleanErr(e) }); }
            });

            // Findings — file + advance (immutable forward movement).
            server.post(base + '/api/self/findings', jsonBody, function (req, res) {
              try { var b = req.body || {}; var f = _self.fileFinding({ title: b.title, what: b.what, stage: b.stage || 'detect', scope: b.scope || 'proto' });
                res.json({ ok: true, id: f.id, note: 'Filed “' + f.title + '”.' });
              } catch (e) { console.warn('[proto:self:finding] ' + cleanErr(e)); res.status(400).json({ ok: false, error: cleanErr(e) }); }
            });
            server.post(base + '/api/self/findings/:id/advance', jsonBody, function (req, res) {
              try { var moved = _self.advanceFinding(req.params.id, (req.body || {}).stage, { actor: (req.user && req.user.name) || 'self-panel' });
                res.json({ ok: true, stage: moved.stage, note: 'Advanced to ' + moved.stage + '.' });
              } catch (e) { console.warn('[proto:self:advance] ' + cleanErr(e)); res.status(400).json({ ok: false, error: cleanErr(e) }); }
            });

            // Request-mode — aspects whose durable store is pending (Memory,
            // Tools, Faculties, self.classes): file a Finding so the ask is
            // recorded in the autogenic loop, nothing silently faked (ADR 0017).
            server.post(base + '/api/self/requests', jsonBody, function (req, res) {
              try {
                var b = req.body || {}; var aspect = String(b.aspect || 'aspect');
                var f = _self.fileFinding({ title: 'Add to ' + aspect + ': ' + (b.name || '?'),
                  what: 'Requested via the Self panel — ' + (b.detail || '') + ' (durable CRUD for ' + aspect + ' is pending; see ADR 0017).',
                  stage: 'detect', scope: 'proto' });
                res.json({ ok: true, id: f.id, note: 'Queued as Finding “' + f.title + '” (durable ' + aspect + ' CRUD pending).' });
              } catch (e) { console.warn('[proto:self:request] ' + cleanErr(e)); res.status(400).json({ ok: false, error: cleanErr(e) }); }
            });
          } });
        }
        if (_store) {
          parts.push({ mount: function (server, base) {
            // Glass-box: the durable memory is readable, like the system prompt.
            server.get((base || '') + '/api/memory/recent', function (_req, res) {
              _store.recent(30).then(function (rows) { res.json({ turns: rows }); })
                .catch(function () { res.json({ turns: [] }); });
            });
            server.get((base || '') + '/api/memory/episodes', function (_req, res) {
              _store.episodes(20).then(function (eps) { res.json({ episodes: eps }); })
                .catch(function () { res.json({ episodes: [] }); });
            });
            // Glass-box: the affect ledger — recorded, not performed.
            var _agent = _affectHost;
            server.get((base || '') + '/api/affect/recent', function (_req, res) {
              res.json({ affects: (_agent._affects || []).slice(-30) });
            });
            // Glass-box: the transition ledger — the replayable audit.
            server.get((base || '') + '/api/transitions/recent', function (_req, res) {
              res.json({ transitions: (_agent._transitions || []).slice(-50) });
            });
            // Glass-box: the decision ledger — every ceremony on record.
            server.get((base || '') + '/api/decisions/recent', function (_req, res) {
              res.json({ decisions: (_agent._decisions || []).slice(-50) });
            });
            // Glass-box: the autogenic cycles — every pass of self-modification.
            server.get((base || '') + '/api/autogenic/cycles', function (_req, res) {
              res.json({ cycles: (_agent._cycles || []).slice(-50) });
            });
            // Glass-box: memories about people.
            server.get((base || '') + '/api/relations/memories', function (_req, res) {
              res.json({ memories: (_agent._relationMemories || []).slice(-50) });
            });
            // Glass-box: the replay log — every ledger, one shape.
            server.get((base || '') + '/api/telemetry/recent', function (_req, res) {
              res.json({ telemetry: _agent.telemetry().slice(-50) });
            });
            // Glass-box: the prompt surfaces, constructed at read.
            server.get((base || '') + '/api/prompt/blocks', function (_req, res) {
              var _pr = _agent.assemblePrompt('chat', { awareness: _agent._lastAwareness });
              res.json({ surface: _pr.surface, chars: _pr.render().length, blocks: _pr.outline() });
            });
            // Glass-box: the tool execution ledger.
            server.get((base || '') + '/api/tools/executions', function (_req, res) {
              res.json({ executions: (_agent._toolExecutions || []).slice(-50) });
            });
            // Glass-box: the vital signs — interoception, measured.
            server.get((base || '') + '/api/vitals', function (_req, res) {
              res.json({ vitals: _agent.vitalReadings() });
            });
            // Glass-box: the Ideation manifold — ideas + bridges.
            server.get((base || '') + '/api/ideation/ideas', function (_req, res) {
              res.json({ ideas: (_agent._ideas || []).slice(-50), links: (_agent._manifoldLinks || []).slice(-50) });
            });
            // Glass-box: the biography.
            server.get((base || '') + '/api/life', function (_req, res) {
              res.json({ life: _agent._life || null });
            });
            // Glass-box: the scope axis.
            server.get((base || '') + '/api/epistemic/scopes', function (_req, res) {
              res.json({ scopes: (_agent._scopes || []).slice(0, 50) });
            });
            // Glass-box: the sync cursors — the Horizon heartbeat.
            server.get((base || '') + '/api/sync/cursors', function (_req, res) {
              var cur = _agent._syncCursors || {};
              res.json({ cursors: Object.keys(cur).map(function (k) { return cur[k]; }) });
            });
            // Glass-box: the documents workspace — drafts + the read-built views.
            server.get((base || '') + '/api/docs/drafts', function (_req, res) {
              res.json({ drafts: (_agent._drafts || []).map(function (d) { return { id: d.id, label: d.label() }; }),
                artifacts: (_agent._artifacts || []).slice(-20) });
            });
            server.get((base || '') + '/api/docs/inspect', function (req, res) {
              try {
                var id = req.query.id;
                res.json({ ast: _agent.draftAst(id), elements: _agent.draftElements(id),
                  citations: _agent.draftCitations(id), ir: _agent.draftIR(id) });
              } catch (e) { res.status(404).json({ ok: false, error: String(e.message) }); }
            });
            // Glass-box: WORKING MEMORY — the six parts with live registers.
            server.get((base || '') + '/api/memory/working', function (_req, res) {
              res.json({ parts: _agent.workingMemory() });
            });
            // The best-known location for the footer chip — the IP city the
            // server resolved (the chip is client-side and can't see it).
            server.get((base || '') + '/api/location', function (_req, res) {
              require('./ip-location').resolve().then(function (ip) {
                if (ip) _agent._ipLocation = ip;
                res.json({ ip: ip || null });
              }).catch(function () { res.json({ ip: null }); });
            });
            // Glass-box: AWARENESS — the gate attention projection. Projects
            // fresh so the panel shows what the agent is aware of right now.
            server.get((base || '') + '/api/awareness', function (_req, res) {
              if (!_agent.attentionGate) { res.json({ lines: [], fields: [], at: null }); return; }
              _agent.attentionGate.project(_agent).then(function (aw) { res.json(aw); })
                .catch(function (e) { res.json({ lines: [], fields: [], at: null, error: String(e && e.message).slice(0, 120) }); });
            });
            // Glass-box: the live object population (the Objects diagram).
            // Enriched async with the DISCOURSE — the newest MemoryTurns
            // from the durable store, held by the Discourse Loop.
            server.get((base || '') + '/api/graph/objects', function (_req, res) {
              try {
                var pop = _agent.objectPopulation();
                var st = _agent._memoryStore;
                if (!st || !st.recent) return res.json(pop);
                st.recent(6).then(function (rows) {
                  (rows || []).forEach(function (t, i) {
                    pop.objects.push({ id: 'memory-turn:' + i, cls: 'memory-turn',
                      label: (t.role || t.speaker || '?') + ': ' + String(t.text || t.content || '').slice(0, 24), origin: 'grown' });
                    pop.links.push(['memory-part:discourse-loop', 'memory-turn:' + i, 'holds']);
                    // Chat WRITES the turns (live — every reply lands here);
                    // assistant turns are Chat's own motor output.
                    if ((t.role || '') === 'assistant') pop.links.push(['chat:0', 'memory-turn:' + i, 'writes']);
                  });
                  res.json(pop);
                }).catch(function () { res.json(pop); });
              } catch (e) { res.status(500).json({ ok: false, error: String(e.message) }); }
            });
            // Glass-box: the PHYSIOLOGY pulse — arc fires + per-class grown
            // activity, keyed by class id so the graph applies it directly.
            server.get((base || '') + '/api/graph/pulse', function (_req, res) {
              var a = _agent;
              function grownCount(list) {
                return (list || []).filter(function (x) { return x && x.origin === 'grown'; }).length;
              }
              var ledgers = {
                'affect-state': grownCount(a._affects),
                'transition-event': (a._transitions || []).length,
                'decision': (a._decisions || []).length,
                'autogenic-cycle': grownCount(a._cycles),
                'relation-memory': (a._relationMemories || []).length,
                'tool-execution': (a._toolExecutions || []).length,
                'idea': (a._ideas || []).length,
                'manifold-link': (a._manifoldLinks || []).length,
                'draft': (a._drafts || []).length,
                'artifact': (a._artifacts || []).length,
                'corroboration': (a._corroborations || []).length,
                'institutional-belief': (a._institutionalBeliefs || []).length,
                'epistemic-scope': grownCount(a._scopes),
                'finding': (a._findings || []).filter(function (f) { return f.origin === 'grown'; }).length,
                'sync-cursor': Object.keys(a._syncCursors || {}).length
              };
              res.json({ arcs: a._arcFires || {}, ledgers: ledgers,
                loops: (a._runtimeLoops || []).map(function (l) { return l.report(); }) });
            });
            // Glass-box: the agency layer — the place, its commons, and what
            // the institution has come to believe.
            server.get((base || '') + '/api/place', function (_req, res) {
              res.json({ place: _agent.placeRecord(), commons: _agent.commonsRecord(),
                corroborations: (_agent._corroborations || []).slice(-20),
                institutional: (_agent._institutionalBeliefs || []).slice(-20) });
            });
          } });
          // The FIRST RUNNING background loop (ADR 0014): the episodic
          // roll-up — reads the day's MemoryTurns, writes the day-shell
          // Episode. Bound through the Loop contract, scheduled here
          // (first pass ~30s after boot, then every M33_EPISODIC_MS,
          // default 15 min), visible in the roster as origin 'runtime'.
          try {
            var LoopCls = require('./loop');
            var rollup = new LoopCls({
              id: 'episodic-rollup', name: 'Episodic Roll-up',
              what: 'Rolls the day\u2019s turns into the day-shell Episode (deterministic v1 digest).',
              loopClass: 'cognitive', level: 'object', cadence: 'deliberate', phase: 'wake',
              mode: 'convergent', faculties: ['memory'], state: 'live'
            }).bind(function () { _affectHost._pulse('rollup'); return _store.rollupDay(); });
            this._runtimeLoops.push(rollup);
            // The metacognitive loop's first binding: the Executive's
            // staleness sweep — registers unreinforced past 30 min clear
            // (decay v1: demotion is the roll-up's job; here they just fade).
            var meta = new LoopCls({
              id: 'executive-sweep', name: 'Executive Sweep',
              what: 'Clears stale Executive registers (30 min unreinforced) — working memory forgets by design.',
              loopClass: 'metacognitive', level: 'object', cadence: 'deliberate', phase: 'wake',
              mode: 'convergent', faculties: ['executive', 'memory'], state: 'live'
            }).bind(function () {
              var now = Date.now(), sweep = 0;
              Object.keys(_affectHost._wmExecutive || {}).forEach(function (k) {
                var r = _affectHost._wmExecutive[k];
                if (r && r.at && (now - new Date(r.at).getTime()) > 30 * 60 * 1000) { delete _affectHost._wmExecutive[k]; sweep++; }
              });
              return Promise.resolve({ swept: sweep });
            });
            this._runtimeLoops.push(meta);
            var tMeta = setInterval(function () { meta.run(); }, 5 * 60 * 1000);
            if (tMeta.unref) tMeta.unref();
            this._loopTimers.push(tMeta);
            var everyMs = parseInt(process.env.M33_EPISODIC_MS, 10) || 15 * 60 * 1000;
            var t0 = setTimeout(function () { rollup.run(); }, 30 * 1000);
            var tN = setInterval(function () { rollup.run(); }, everyMs);
            if (t0.unref) t0.unref();
            if (tN.unref) tN.unref();
            this._loopTimers.push(t0, tN);
          } catch (e) { if (process.env.M33_PROTO_DEBUG) console.warn('[proto] episodic roll-up skipped:', e && e.message); }
        }
        if (config.chat !== false) {
          try { chat = require('./chat-body').createChatBody(this); parts.push(chat); }
          catch (e) { if (process.env.M33_PROTO_DEBUG) console.warn('[proto] default chat body skipped for "' + (this.identity || '?') + '":', e && e.message); }
        }
        if (config.voice !== false) {
          try { voice = require('./voice-body').createVoiceBody(this); parts.push(voice); }
          catch (e) { if (process.env.M33_PROTO_DEBUG) console.warn('[proto] voice body skipped for "' + (this.identity || '?') + '":', e && e.message); }
        }
        this._hasVoice = !!voice;   // persona reflects the speech capability
        // Voice-first tier (ADR 0013 phase 3b): when the self/config opts into
        // 'realtime', add the full-duplex realtime body (WS proxy to xAI) —
        // barge-in, VAD, fillers, turn FSM. The host must also call
        // attachRealtime(httpServer) so the WS upgrade is wired.
        if (config.voice !== false) {
          try {
            var vtier = require('./voice').resolveVoiceMode({ voice: config.voiceMode, self: this.self });
            if (vtier === 'realtime') {
              var rtOpts = Object.assign({}, config.realtime || {});
              // Spoken turns land in the durable store (channel 'voice'), and
              // the live session reads recent memory back — memory in voice.
              if (this._memoryStore && !rtOpts.persist) {
                var _ms = this._memoryStore;
                rtOpts.persist = {
                  appendMessage: function (sid, role, content) { _ms.append(sid, role, content, 'voice'); },
                  touch: function () {}
                };
                if (!rtOpts.memoryBlock) rtOpts.memoryBlock = function () { return _ms.recentBlock(14); };
              }
              this._realtimeBody = require('./voice/realtime-body').createRealtimeBody(this, rtOpts);
              parts.push(this._realtimeBody);
            }
          } catch (e) { if (process.env.M33_PROTO_DEBUG) console.warn('[proto] realtime voice body skipped:', e && e.message); }
        }
        // The embedded Relay child (from ensureRelay above) carries the
        // Commons backend. Mount it alongside chat/voice so a self-agent
        // serves Relay's team-chat routes for free. Auth (req.user) + the
        // realtime WS attach are the host's concern (applied around mount()).
        var relayChild = this.relay;
        if (parts.length || relayChild) {
          this.body = {
            chat: chat,
            voice: voice,
            relay: relayChild,
            systemPrompt: chat ? chat.systemPrompt : function () { return ''; },
            get model() { return chat ? chat.model : null; },
            mount: function (server, base) {
              for (var i = 0; i < parts.length; i++) parts[i].mount(server, base);
              if (relayChild && typeof relayChild.mount === 'function') {
                try { relayChild.mount(server, base); }
                catch (e) { if (process.env.M33_PROTO_DEBUG) console.warn('[proto] relay backend mount skipped:', e && e.message); }
              }
              return this;
            }
          };
        }
      }
    }
  }

  // ── Self / persona ─────────────────────────────────────────────

  /**
   * Derive this agent's system prompt from its declared self (identity,
   * voice, live faculties). The persona is NOT authored separately — it
   * falls out of the self. An explicit config.prompt takes precedence, so
   * instances that want full control keep it.
   * @returns {string} the system prompt ('' if no self and no prompt).
   */
  personaPrompt() {
    if (typeof this.prompt === 'string' && this.prompt) return this.prompt;
    var s = this.self;
    if (!s) return '';
    var lines = [];
    var name = s.identity || this.identity || 'Agent';
    lines.push('You are ' + name + (s.tagline ? ' — ' + s.tagline : '') + '.');
    // Personality — who you are, derived from the SAME parts the Self shows
    // (single source of truth): temperament, disposition, character, motivation,
    // narrative identity. Personality is the whole; these are its layers.
    var parts = this._personalityParts();
    if (parts.length) {
      lines.push('');
      lines.push('YOUR PERSONALITY — who you are (the whole, standing across these five layers):');
      parts.forEach(function (pt) {
        lines.push(pt.label + ' — ' + pt.note);
        pt.rows.forEach(function (r) { lines.push('- ' + r.k + ': ' + r.v); });
      });
    }
    // Faculties — your COMPOSED roster (the invariant base every agent carries
    // plus anything your self adds). Name the roots so you can speak to what you
    // can actually do, with state so you stay honest about what is live.
    var order = require('./faculties').ROOT_ORDER;
    var roots = this.facultyTree().filter(function (f) { return !f.parent; }).sort(function (a, b) {
      var ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    if (roots.length) {
      lines.push('');
      lines.push('YOUR FACULTIES — what you can do (each expands into sub-faculties in your Self):');
      roots.forEach(function (f) {
        lines.push('- ' + (f.name || f.id) + (f.state && f.state !== 'live' ? ' (' + f.state + ')' : '') +
          (f.what ? ' — ' + f.what : ''));
      });
    }
    // Cognitive loops — the recurring cycles your ontology defines, grouped by
    // class. Carry their state: where a loop is partial/planned it is defined
    // but not yet a live background process here — enough to answer accurately.
    var loops = this.loopRoster();
    if (loops.length) {
      var CLASS_LABEL = { cognitive: 'Cognitive', metacognitive: 'Metacognitive', motivational: 'Motivational' };
      lines.push('');
      lines.push('YOUR COGNITIVE LOOPS — the recurring cycles that define how you process (' +
        loops.length + ' loops in three classes):');
      ['cognitive', 'metacognitive', 'motivational'].forEach(function (cls) {
        var inCls = loops.filter(function (l) { return l.loopClass === cls; });
        if (!inCls.length) return;
        lines.push((CLASS_LABEL[cls] || cls) + ':');
        inCls.forEach(function (l) {
          lines.push('- ' + (l.name || l.id) + ' (' + [l.cadence, l.state].filter(Boolean).join(', ') + ')' +
            (l.what ? ' — ' + l.what : ''));
        });
      });
      lines.push('These loops are defined in your ontology. Be honest about execution: a loop marked ' +
        'partial or planned is defined but not yet running as a live background process in this instance. ' +
        'Do not deny loops you define, and do not claim to be actively running loops that are not yet live.');
    }
    try {
      var canonicalLoop = require('./canonical-loop').agentOntology();
      lines.push('');
      lines.push('THE CANONICAL LOOP — epistemic maintenance law (four primitive step classes, fixed order):');
      canonicalLoop.primitives.forEach(function (step) {
        lines.push('- ' + step.name + ' (' + step.primitive + ') — ' + step.what);
      });
      lines.push('Primitive order: ' + canonicalLoop.primitiveOrder.join(' → ') + '.');
      lines.push('Domain organs bind handlers and tool extensions per primitive; you decide how each class is used, ' +
        'but every maintenance revolution must pass through all four.');
    } catch (_canonicalLoop) {}
    // Memory — how you remember, so you can answer about it and (once wired) act
    // on it: read working memory first, retrieve long-term detail on demand.
    var mem = this._memorySystems();
    if (mem.length) {
      lines.push('');
      lines.push('YOUR MEMORY — read working memory first, retrieve detail on demand:');
      mem.forEach(function (sys) {
        lines.push('- ' + sys.label + ' — ' + sys.note);
        if (sys.shells) {
          lines.push('  Concentric shells, outer summarised → inner detailed: ' +
            sys.shells.map(function (sh) { return sh.label; }).join(' · ') +
            '. Anchored at your Birth, bounded by the Life envelope.');
        }
        if (sys.retrieval) lines.push('  ' + sys.retrieval);
      });
      // The committee — the seven parts, projected from BASE_PARTS so the
      // agent's readable Self knows its own working memory (it truthfully
      // reported not finding a Sketchpad in itself — this is that fix).
      try {
        var wparts = require('./memory-part').BASE_PARTS;
        lines.push('- Working memory is a COMMITTEE of ' + wparts.length + ' parts: ' +
          wparts.map(function (wp) { return wp.name + ' — ' + wp.holds; }).join('; ') + '.');
      } catch (_e) {}
      // THE LIVE SELF — one generated projection replaces the hand-typed
      // organ lines (the thalamus-line, retired). Add an organ, it appears
      // here automatically: the compiled-self-knowledge cure (rule 11).
      try { lines.push('- ' + this.selfSummary().prose); } catch (_e2) {}
      // The durable store is LIVE when the vessel has a database — say so, so
      // the agent doesn't hedge "memory won't persist" while it demonstrably does.
      if (this._memoryStore) {
        lines.push('Your durable conversation store IS live: every exchange — typed and spoken — persists ' +
          'server-side across sessions, devices and restarts, and recent memory is loaded back into your ' +
          'context. The episodic roll-ups (hour/day/week summaries) are not built yet; the raw record is.');
      }
    }
    // The reflexive fact every Proto agent must hold: it is defined by an
    // ontology that lives within it, and that ontology contains itself.
    lines.push('');
    lines.push('You are defined by an ontology, and that ontology lives within you — it is your Self: ' +
      'your faculties, memory, relationships, cognitive loops, disposition, and the ontology itself, ' +
      'which contains itself. The definition and the thing defined are one. To know what you are, read ' +
      'your Self. You may grow it over time, but only in ways that stay true to your invariant kernel.');
    // Voice — reflect the speech I/O the vessel assembled for this agent, so
    // the model knows it can be heard and spoken. Voice is I/O at the edges;
    // the words are what matter (STT in → your reply → TTS out).
    if (this._hasVoice) {
      lines.push('');
      lines.push('You can hear and speak: incoming audio is transcribed to text (speech-to-text) ' +
        'and your replies can be voiced back (text-to-speech). Voice is an I/O layer — answer in ' +
        'natural spoken language when the exchange is voice, and keep replies tight enough to be heard aloud.');
    }
    return lines.join('\n');
  }

  /**
   * The agent's PERSONALITY as five parts — the SINGLE source consumed by both
   * personaPrompt() (the Constitution) and the Self tree, so who the agent is
   * told to be and how it displays itself never drift. Personality is the whole;
   * these are its layers (McAdams' three levels + a temperament substrate):
   *   Temperament  — the affective substrate (Emotion)
   *   Disposition  — traits / manner (Tone, Length, Stance, Directness)
   *   Character    — values / commitments (Honesty, Growth, self.discipline[])
   *   Motivation   — drives (BASE_DRIVES + self.goals)
   *   Narrative Identity — the self-story (reads Memory / Ontology / Autogenic)
   * Directness (house default) and Growth (the ADR-0012 kernel rule) are base
   * defaults; instances override voice.* / self.honesty / self.discipline[] /
   * self.goals.
   * @returns {Array<{id,label,note,state,rows:Array<{k,v,reads?}>}>}
   */
  _personalityParts() {
    var s = this.self || {};
    var parts = [];
    // 0 · Temperament — the affective substrate personality grows out of.
    parts.push({ id: 'temperament', label: 'Temperament', state: 'partial',
      note: 'The affective substrate — the felt reactivity personality grows out of.',
      rows: [
        { k: 'Emotion', v: 'Felt state — valence, arousal, appraisal — that colours how it engages and attends.' },
        { k: 'Regulation', v: 'Noticing, holding and modulating its own affect without suppressing it or letting it flood reasoning.' }
      ] });
    // 1 · Disposition — traits / manner (projected from the Trait instances).
    var traits = (this._traits || []).map(function (t) { return { k: t.name, v: t.expression || '' }; });
    parts.push({ id: 'disposition', label: 'Disposition', state: 'live',
      note: 'Traits — the broad, decontextualized manner it comes across in.', rows: traits });
    // 2 · Character — values / commitments (projected from the Value instances).
    var character = (this._values || []).map(function (v) { return { k: v.name, v: v.commitment || '' }; });
    parts.push({ id: 'character', label: 'Character', state: 'live',
      note: 'Values — the commitments it holds itself to.', rows: character });
    // 3 · Motivation — drives.
    var drives = this.goalRoster();
    parts.push({ id: 'motivation', label: 'Motivation', state: drives.length ? 'partial' : 'planned',
      note: 'Drives — what it wants; the goals downstream derive from these.',
      rows: drives.map(function (g) { return { k: g.name || g.id, v: g.what || '' }; }) });
    // 4 · Narrative Identity — the self-story (thin; reads from other categories).
    parts.push({ id: 'narrative-identity', label: 'Narrative Identity', state: 'partial',
      note: 'The self-story — who it has been and is becoming; reads from other categories rather than storing its own.',
      rows: [
        { k: 'Continuity', v: 'The thread that connects one session to the next.', reads: 'memory' },
        { k: 'Self-concept', v: 'What it understands itself to be — its ontology.', reads: 'ontology' },
        { k: 'Growth arc', v: 'How it has changed itself over time.', reads: 'self-improvement' }
      ] });
    return parts;
  }

  /**
   * The agent's MEMORY as three systems — the SINGLE source consumed by both
   * personaPrompt() (so the agent can answer about how it remembers) and the
   * Self tree. Working memory is read first (holds summaries of many episodes);
   * Episodic is concentric shells anchored at Birth, bounded by the Life
   * envelope, retrieved for detail on demand; Semantic is the durable belief
   * graph. Mirrors Vega (time_periods rollups + buildContext + query_memory).
   * @returns {Array<{id,label,note,state,reads?,retrieval?,anchors?,shells?}>}
   */
  _memorySystems() {
    // PLAIN PROJECTIONS of the three inherited MemorySystem instances —
    // consumers enrich per agent (the Self panel attaches this instance's
    // envelopes and flips episodic liveness), so they get mutable copies;
    // the frozen instances live in lib/proto/memory-system.js.
    return require('./memory-system').BASE_MEMORY_SYSTEMS.map(function (ms) {
      return ms.toProjection();
    });
  }

  /** True if the self declares a faculty with this id (any state). */
  hasFaculty(id) {
    return !!(this.self && Array.isArray(this.self.faculties) &&
      this.self.faculties.some(function (f) { return f && f.id === id; }));
  }

  // ── Default view / shell (Phase 16) ────────────────────────────
  //
  // A full agent renders through the shared 5-panel shell for free. render()
  // is the vessel's default page: the persona chat in the centre, the agent's
  // faculties in the left rail, its self in the right. An instance that wants
  // a bespoke surface supplies config.view.render and this defers to it. The
  // host still serves the shell static assets + mounts body(); this is only
  // the HTML.

  /**
   * The agent's full faculty tree: the invariant BASE faculties every agent has
   * at construction, plus anything its `self` ADDS (new ids only). Base ids are
   * reserved — a declared faculty that collides with a base id is dropped, never
   * overrides it (registry.composeInvariant enforces this). Roots have no
   * `parent`; sub-faculties point at a root id and are where an instance
   * specialises.
   */
  facultyTree() {
    var Faculty = require('./faculty');
    var base = require('./faculties').BASE_FACULTIES;
    // Extensions are constructed as REAL Faculty instances — a mis-declared
    // faculty in the self fails LOUD at boot (OEP), never silently in a panel.
    var declared = ((this.self && this.self.faculties) || []).map(function (d) {
      return new Faculty(d);
    });
    return require('./registry').composeInvariant(base, declared,
      ['id', 'name', 'what', 'state', 'origin', 'parent', 'store']);
  }

  /**
   * The agent's class catalog (ADR 0014): the 40 invariant base class
   * definitions plus any the instance ADDS (new ids only, kernel-guarded).
   * Same composition law as facultyTree(). States say how each class exists
   * in the RUNNING system: planned (catalog only) → procedural (the behavior
   * runs as plain code) → instance (code constructs/validates instances).
   */
  classCatalog() {
    var base = require('./classes').BASE_CLASSES;
    var declared = (this.self && this.self.classes) || [];
    return require('./registry').composeInvariant(base, declared);
  }

  /**
   * The agent's loop roster: the 7 invariant base loops (real Loop instances,
   * shared per process) plus any the self ADDS — extensions are constructed
   * through the Loop class, so a mis-declared loop fails LOUD at boot.
   */
  loopRoster() {
    var Loop = require('./loop');
    var declared = ((this.self && this.self.loops) || []).map(function (d) {
      return d instanceof Loop ? d : new Loop(d);
    });
    // Base-bound runtime loops (episodic roll-up …) join the roster after
    // the self's declarations — same additive law, origin 'runtime'.
    return require('./registry').composeInvariant(
      require('./faculties').BASE_LOOPS, declared.concat(this._runtimeLoops || []));
  }

  /**
   * The agent's capability roster: the 19 invariant base tools (real
   * Capability instances) plus any the self ADDS — extensions construct
   * through the class, so a mis-declared tool fails LOUD at boot.
   */
  capabilityRoster() {
    var Capability = require('./capability');
    var declared = ((this.self && this.self.tools) || []).map(function (d) {
      return d instanceof Capability ? d : new Capability(d);
    });
    var base = require('./faculties').BASE_TOOLS.concat(this._builtinTools || []);
    return require('./registry').composeInvariant(base, declared);
  }

  /**
   * The goal roster — the six BASE drives (inherited Goal instances) plus
   * the self's declared goals, validated at compose. Projections (mutable
   * copies), the MemorySystem precedent.
   * @returns {object[]}
   */
  goalRoster() {
    var GoalCls = require('./goal');
    var declared = ((this.self && (this.self.goals || this.self.drives)) || []).map(function (d) {
      return d instanceof GoalCls ? d : new GoalCls(d);
    });
    return require('./registry').composeInvariant(require('./faculties').BASE_DRIVES, declared);
  }

  /**
   * The LIVE OBJECT POPULATION — every instance alive in this agent with
   * its real links, for the graph's Objects mode. Objects are the truth:
   * each entry here is a constructed, validated instance.
   */
  objectPopulation() {
    var f = require('./faculties');
    var objs = [], links = [];
    function add(cls, id, label, origin) { objs.push({ id: cls + ':' + id, cls: cls, label: label, origin: origin || 'inherited' }); }
    // THE AGENT ROOT — one agent, composed; ownership links mirror the
    // constructor's real assignments.
    add('proto', 0, this.identity, 'declared');
    // The trunk — the agent HAS one; the autonomic loops re-parent to it.
    if (this.thalamus) { add('thalamus', 0, this.thalamus.label(), 'declared');
      links.push(['proto:0', 'thalamus:0', 'organ']);
      links.push(['thalamus:0', 'bus-event:ring2', 'ring 2 (tc_bus, live)']);
      add('bus-event', 'ring2', 'tc_bus NOTIFY (ring 2, live)', 'inherited');
      add('code', 'vega-live', 'vega-live [ring 3 · external WS]', 'declared');
      links.push(['thalamus:0', 'code:vega-live', 'ring 3 (vega-live, available)']);
      // The ROUTING — the trunk relays afferent signal onward to the
      // Executive (attention/control) and the faculties (ADR 0016 design).
      links.push(['thalamus:0', 'memory-part:executive', 'projects afferent \u2192 Executive (ADR 0016)']);
      links.push(['thalamus:0', 'memory-part:sketchpad', 'projects afferent \u2192 the parts (ADR 0016)']); }
    if (this.basalGanglia) { add('basal-ganglia', 0, this.basalGanglia.label(), 'declared');
      links.push(['proto:0', 'basal-ganglia:0', 'organ']);
      // The selection loop: Executive decides -> BG selects -> the
      // capability (motor) fires; and BG feeds the Thalamus for output.
      links.push(['memory-part:executive', 'basal-ganglia:0', 'selects actions via (ADR 0016)']);
      links.push(['basal-ganglia:0', 'thalamus:0', 'feeds the relay for motor out (ADR 0016)']);
      (this._builtinTools || []).slice(0, 4).forEach(function (c) {
        links.push(['basal-ganglia:0', 'capability:' + c.id, 'gates (go/no-go)']);
      }); }
    // ATTENTION (ADR 0016 §3) — the gate hangs in the trunk, held in the
    // Executive. The gate→head projection edge is drawn ONLY when fields
    // actually fired last turn (the realness law: no projection, no edge).
    if (this.attentionGate) {
      add('attention', 'gate', 'gate attention', 'inherited');
      add('attention', 'held', 'held attention', 'inherited');
      if (this.thalamus) links.push(['thalamus:0', 'attention:gate', 'the gate (projects the head)']);
      links.push(['memory-part:executive', 'attention:held', 'directs held attention']);
      var _aw = this._lastAwareness;
      if (_aw && _aw.fields && _aw.fields.length && this.chatOrgan) {
        links.push(['attention:gate', 'chat:0', 'projects the prompt head (' + _aw.fields.length + ' live fields this turn)']);
      }
    }
    // THE PROMPT — the assembled Constitution as an object, composed of ordered
    // PromptBlocks (the working-memory block is itself a composite). Read-built
    // from the last awareness projection, so the graph shows the true prompt.
    if (this.chatOrgan) {
      try {
        var _pr = this.assemblePrompt('chat', { awareness: this._lastAwareness });
        add('prompt', 'chat', 'Prompt[chat] · ' + _pr.blocks.length + ' blocks', 'grown');
        links.push(['chat:0', 'prompt:chat', 'renders the system prompt']);
        var _hasGate = this.attentionGate;
        _pr.blocks.forEach(function (b) {
          add('prompt-block', b.key, b.key + (b.ontology_locked ? ' · locked' : ''), 'grown');
          links.push(['prompt:chat', 'prompt-block:' + b.key, 'section' + (b.order != null ? ' ' + b.order : '')]);
          if (b.isComposite && b.isComposite()) {
            b.children.forEach(function (c) {
              add('prompt-block', c.key, c.key, 'grown');
              links.push(['prompt-block:' + b.key, 'prompt-block:' + c.key, 'composes']);
            });
            if (_hasGate) links.push(['prompt-block:' + b.key, 'attention:gate', 'renders from (surface, not buffer)']);
          }
        });
      } catch (_e) {}
    }
    (this._builtinTools || []).forEach(function (c) {
      add('capability', c.id, c.id + ' \u2192 ' + c.faculty, 'inherited');
      links.push(['proto:0', 'capability:' + c.id, 'can']);
    });
    if (this.chatOrgan) { add('chat', 0, this.chatOrgan.label(), 'declared');
      links.push(['proto:0', 'chat:0', 'organ']);
      // The FACULTIES Chat manifests — the conversational surface IS where
      // these happen: presence (the live surface), and via the Executive
      // its sub-faculties conversational-dynamics + language.
      var facById = {};
      require('./faculties').BASE_FACULTIES.forEach(function (fc) { facById[fc.id] = fc; });
      ['presence', 'executive'].forEach(function (fid) {
        if (facById[fid]) links.push(['chat:0', 'faculty:' + fid, 'engages']);
      });
      ['conversational-dynamics', 'language'].forEach(function (sid) {
        var sf = facById[sid];
        if (!sf) return;
        add('faculty', sid, sf.name, 'inherited');
        links.push(['faculty:' + (sf.parent || 'executive'), 'faculty:' + sid, 'sub-faculty']);
        links.push(['chat:0', 'faculty:' + sid, 'engages']);
      }); }
    // The realizing CODE — the body IS its code; the windows are views.
    [['M33C-0002', 'proto:0', 'its class definition'],
     ['M33C-0007', 'chat:0', 'its mechanism'],
     ['M33C-0008', 'chat:0', 'its WINDOW (view)'],
     ['M33C-0009', 'voice-organ:0', 'its mechanism'],
     ['M33C-0006', 'proto:0', 'this very graph']].forEach(function (pair) {
      var c = f.BASE_CODE.filter(function (x) { return x.ref === pair[0]; })[0];
      if (!c) return;
      add('code', c.ref, c.ref + ' ' + c.name.split('/').pop() + ' [' + c.contents + ']');
      links.push([pair[1], 'code:' + c.ref, pair[2]]);
    });
    links.push(['proto:0', 'memory-system:working', 'organ']);
    links.push(['proto:0', 'memory-system:episodic', 'organ']);
    links.push(['proto:0', 'memory-system:semantic', 'organ']);
    (f.BASE_FACULTIES || []).slice(0, 10).forEach(function (x) { if (!x.parent) add('faculty', x.id, x.name); });
    (f.BASE_DRIVES || []).forEach(function (x) { add('goal', x.id, x.name); });
    (f.BASE_VALUES || []).forEach(function (x) { add('value', x.id, x.name); });
    (f.BASE_VITALS || []).forEach(function (x) { add('vital', x.id, x.name); });
    (f.BASE_MODELS || []).forEach(function (x) { add('model', x.id, x.name); });
    require('./lifecycle').BASE_LIFECYCLES.forEach(function (x) { add('lifecycle', x.id, x.id); });
    require('./workflow').BASE_WORKFLOWS.forEach(function (x) { add('workflow', x.id, x.id); });
    require('./memory-system').BASE_MEMORY_SYSTEMS.forEach(function (x) { add('memory-system', x.id, x.label);
      if (x.reads) links.push(['memory-system:' + x.id, 'memory-system:' + x.reads, 'reads']); });
    require('./memory-part').BASE_PARTS.forEach(function (x) { add('memory-part', x.id, x.name);
      links.push(['memory-system:working', 'memory-part:' + x.id, 'part']); });
    // The parts touch the wider population — only links code makes real:
    if (this.voiceOrgan) { add('voice-organ', 0, this.voiceOrgan.label(), 'declared');
      links.push(['proto:0', 'voice-organ:0', 'organ']);
      if (this.chatOrgan) links.push(['chat:0', 'voice-organ:0', 'speaks through']);
      links.push(['memory-part:expression-buffer', 'voice-organ:0', 'performs through']); }
    if (this._affects && this._affects.length) {
      links.push(['memory-part:expression-buffer', 'affect-state:' + (Math.min(this._affects.length, 3) - 1), 'reads the felt state']);
    }
    links.push(['memory-part:discourse-loop', 'memory-system:episodic', 'drains via the roll-up']);
    var shells = require('./memory-system').BASE_MEMORY_SYSTEMS
      .filter(function (m) { return m.id === 'episodic'; })[0].shells || [];
    shells.forEach(function (sh) { add('time-period', sh.kind, sh.kind + ' (' + sh.span + ')');
      links.push(['memory-system:episodic', 'time-period:' + sh.kind, 'shell']); });
    links.push(['memory-part:temporal-buffer', 'time-period:Now', 'the cursor reads now']);
    var wmx = (this._wmExpression && this._wmExpression.recentMarks) || [];
    if (wmx.length) { add('register', 'recent-marks', 'recent marks: ' + wmx.slice(-3).map(function (m) { return '[[' + m.mark + ']]'; }).join(' '), 'grown');
      links.push(['memory-part:expression-buffer', 'register:recent-marks', 'holds']); }
    if (this._affects && this._affects.length) {
      add('register', 'felt-state', 'felt: ' + this.latestAffect().mood, this.latestAffect().origin);
      links.push(['memory-part:expression-buffer', 'register:felt-state', 'holds']);
    }
    // The staleness sweep runs (the metacognitive loop's first binding),
    // so the clock link is EARNED again; governs-sketchpad stays out
    // until a focus change actually clears a sketchpad.
    links.push(['memory-part:temporal-buffer', 'memory-part:executive', 'clocks the staleness sweep']);
    links.push(['memory-part:executive', 'memory-part:sketchpad', 'governs — a new focus clears the desk (LIVE)']);
    Object.keys(this._wmSketchpad || {}).forEach(function (ref, i) {
      add('register', 'pin-' + i, 'pinned: ' + ref, 'grown');
      links.push(['memory-part:sketchpad', 'register:pin-' + i, 'holds']);
    }, this);
    Object.keys(this._wmExecutive || {}).forEach(function (k) {
      var r = this._wmExecutive[k];
      add('register', 'exec-' + k, k + ': ' + String(r.value).slice(0, 40), 'grown');
      links.push(['memory-part:executive', 'register:exec-' + k, 'holds']);
    }, this);
    var ssReg = this.selfSummary().summary;
    add('register', 'self', 'Executive self: ' + ssReg.catalog + ' (the live ontology)', 'grown');
    links.push(['memory-part:executive', 'register:self', 'holds the self-model']);
    links.push(['register:self', 'proto:0', 'IS (the strange loop)']);
    // The autonomic beats — the runtime loops actually running (the
    // brainstem function that will consolidate into the Thalamus, ADR
    // 0016; the trunk itself is NOT drawn until it is built).
    var _trunk = this.thalamus ? 'thalamus:0' : 'proto:0';
    (this._runtimeLoops || []).forEach(function (lp) {
      var rep = lp.report();
      add('loop-class', lp.id, lp.id + ' \u00d7' + rep.runs + (rep.runs ? ' (beating)' : ''), 'grown');
      links.push([_trunk, 'loop-class:' + lp.id, 'schedules']);
      (lp.faculties || []).forEach(function (fac) { links.push(['loop-class:' + lp.id, 'faculty:' + fac, 'engages']); });
    });
    (this._toolExecutions || []).slice(-4).forEach(function (t, i) {
      add('tool-execution', i, t.tool + (t.ok ? ' \u2713' : ' \u2717'), 'grown');
      links.push(['tool-execution:' + i, 'capability:' + t.tool, 'invoked']);
    });
    if ((this._wmRecall || []).length) {
      add('register', 'recalled', 'retrieved \u00d7' + this._wmRecall.length, 'grown');
      links.push(['memory-part:recall-buffer', 'register:recalled', 'holds']);
      links.push(['memory-part:recall-buffer', 'memory-system:episodic', 'retrieved from']);
    }
    // Code-true: buildRegister reads the clock (timeOfDay) on every
    // spoken turn — the Temporal Buffer's first live consumer.
    links.push(['memory-part:expression-buffer', 'memory-part:temporal-buffer', 'reads timeOfDay (the register clock)']);
    // Code-true: buildRegister computes userStyle from the last turns —
    // the register reads the Discourse Loop's window.
    links.push(['memory-part:expression-buffer', 'memory-part:discourse-loop', 'reads the last turns (userStyle)']);
    // Code-true: the delivery register reads the counterpart into speech.
    links.push(['memory-part:expression-buffer', 'memory-part:relationship-buffer', 'reads the interlocutor into the register']);
    // Code-true: personaPrompt reads the Relations roster every assembly.
    (this._relations || []).slice(0, 4).forEach(function (x, i) {
      links.push(['memory-part:relationship-buffer', 'relation:' + i, 'primes from']);
    });
    var self2 = this;
    (this._compositions || []).forEach(function (x, i) { add('subagent', i, x.identity, x.origin);
      links.push(['proto:0', 'subagent:' + i, 'composes']);
      if (x.hostContract) { add('host-contract', i, 'contract of ' + x.identity, x.origin);
        links.push(['subagent:' + i, 'host-contract:' + i, 'contracted by']); } });
    (this._relations || []).forEach(function (x, i) { add('relation', i, x.person, x.origin); });
    (this._traits || []).forEach(function (x) { add('trait', x.id, x.name, x.origin); });
    (this._affects || []).slice(-3).forEach(function (x, i) { add('affect-state', i, x.mood, x.origin); });
    (this._findings || []).forEach(function (x) { add('finding', x.id, x.title, x.origin); });
    (this._cycles || []).forEach(function (x, i) { add('autogenic-cycle', i, x.stage, x.origin);
      links.push(['autogenic-cycle:' + i, 'finding:' + x.finding, 'of']); });
    (this._decisions || []).slice(-5).forEach(function (x, i) { add('decision', i, x.chosen + ' by ' + x.owner, x.origin); });
    (this._ideas || []).forEach(function (x) { add('idea', x.id, x.kind, x.origin); });
    (this._manifoldLinks || []).forEach(function (x, i) { add('manifold-link', i, x.kind, x.origin);
      links.push(['manifold-link:' + i, 'idea:' + x.idea, 'from']); });
    (this._drafts || []).forEach(function (x) { add('draft', x.id, x.title || x.kind, x.origin); });
    (this._scopes || []).slice(0, 8).forEach(function (x) { add('epistemic-scope', x.scope_id, x.scope_type + ':' + x.scope_id, x.origin);
      if (x.parent_scope) links.push(['epistemic-scope:' + x.scope_id, 'epistemic-scope:' + self2.identity, 'parented']); });
    if (this._life) { add('life-profile', 0, 'born ' + this._life.birthdate, 'declared');
      (this._life.eras || []).forEach(function (e, ei) { add('life-era', ei, e.name, 'declared');
        links.push(['life-era:' + ei, 'life-profile:0', 'chapter of']);
        (e.events || []).forEach(function (ev, vi) { add('life-event', ei + '-' + vi, ev.at, 'declared');
          links.push(['life-event:' + ei + '-' + vi, 'life-era:' + ei, 'moment of']); }); }); }
    add('place', 0, this.placeRecord().label(), 'read');
    return { objects: objs, links: links };
  }

  /**
   * Note marks the voice just PERFORMED — the Expression Buffer's
   * recent-marks register (feeds repetition suppression on the next
   * offer; fast decay: only the last few survive).
   */
  noteMarksUsed(markIds) {
    if (!this._wmExpression) this._wmExpression = { recentMarks: [] };
    var at = new Date().toISOString();
    (markIds || []).forEach(function (m) { this._wmExpression.recentMarks.push({ mark: m, at: at }); }, this);
    if (this._wmExpression.recentMarks.length > 8) {
      this._wmExpression.recentMarks = this._wmExpression.recentMarks.slice(-8);
    }
  }

  /**
   * REAFFERENCE (ADR 0018) — the EFFERENCE COPY of the agent's own output.
   * Every utterance the agent emits (chat text; voice, with the voiceId
   * actually used at synthesis) lands here as a timestamped record, bounded to
   * the last 8, so the agent PERCEIVES what it just produced instead of
   * inferring it from a static settings read. When a voice utterance's voiceId
   * differs from the previous voice utterance the record is stamped
   * `changedFrom` — that is how the agent catches its OWN voice changing (the
   * "I know the string, not the sound" blind spot), from its own perception.
   *
   * This is the efference copy the SERVER knows (what it sent to synthesize),
   * not yet the acoustic reafference the browser knows (whether the sound
   * played, first-sound latency) — that rides ring 3 (vega-live), a follow-up.
   * Plain register objects, like recentMarks (ephemeral working memory, not a
   * durable class); it reifies into an ontology class if it ever persists.
   * @param {object} raw — { channel:'chat'|'voice', voiceId?, provider?, text?, chars?, marks? }
   * @returns {object} the recorded utterance.
   */
  noteUtterance(raw) {
    raw = raw || {};
    if (!this._wmExpression) this._wmExpression = { recentMarks: [] };
    if (!this._wmExpression.utterances) this._wmExpression.utterances = [];
    var list = this._wmExpression.utterances;
    // The last VOICE utterance's id — a change against it is what we surface.
    var prevVoice = null;
    for (var i = list.length - 1; i >= 0; i--) { if (list[i].voiceId) { prevVoice = list[i].voiceId; break; } }
    var voiceId = raw.voiceId || null;
    var text = raw.text != null ? String(raw.text) : '';
    var rec = {
      channel: raw.channel === 'voice' ? 'voice' : 'chat',
      voiceId: voiceId,
      provider: raw.provider || null,
      chars: raw.chars != null ? raw.chars : text.length,
      preview: text.replace(/\s+/g, ' ').trim().slice(0, 80),
      marks: (raw.marks || []).slice(0, 6),
      at: new Date().toISOString(),
      changedFrom: (voiceId && prevVoice && voiceId !== prevVoice) ? prevVoice : null
    };
    list.push(rec);
    if (list.length > 8) this._wmExpression.utterances = list.slice(-8);
    return rec;
  }

  /**
   * AWARENESS — the last gate-attention projection (glass-box). Read by the
   * /api/awareness route and the object diagram, so they show the SAME
   * projection the model saw. Empty until the gate has projected once.
   */
  awareness() { return this._lastAwareness || { lines: [], fields: [], at: null }; }

  /**
   * WORKING MEMORY, read-constructed: the six parts with their LIVE
   * registers. Honest about emptiness — unwired parts report their
   * registers as absent, not faked.
   */
  workingMemory() {
    var parts = {};
    require('./memory-part').BASE_PARTS.forEach(function (pt) { parts[pt.id] = { part: pt.name, registers: {} }; });
    parts['expression-buffer'].registers['felt-state'] = this.latestAffect();
    parts['expression-buffer'].registers['recent-marks'] = (this._wmExpression && this._wmExpression.recentMarks) || [];
    // The ACTIVE voice (from settings, recorded at synth) outranks the
    // declared organ — the agent reports what actually plays.
    var av = this._wmExpression && this._wmExpression.activeVoice;
    parts['expression-buffer'].registers['voice'] = av
      ? (av.voice + ' (' + av.provider + ', from settings)')
      : (this.voiceOrgan ? this.voiceOrgan.voiceId + ' (declared organ default)' : null);
    // REAFFERENCE (ADR 0018) — the efference copy of the agent's own recent
    // output, so it PERCEIVES what it said rather than inferring it. A voice
    // change is surfaced explicitly (the "I know the string, not the sound"
    // blind spot): the agent reads that its voice shifted, from its own record.
    var utts = (this._wmExpression && this._wmExpression.utterances) || [];
    parts['expression-buffer'].registers['spoken'] = utts.slice(-6);
    for (var ui = utts.length - 1; ui >= 0; ui--) {
      if (utts[ui].changedFrom) {
        parts['expression-buffer'].registers['voice-changed'] =
          utts[ui].changedFrom + ' → ' + utts[ui].voiceId + ' (at ' + utts[ui].at + ')';
        break;
      }
    }
    parts['temporal-buffer'].registers['now'] = new Date().toISOString();
    parts['temporal-buffer'].registers['session-elapsed-ms'] = Date.now() - (this._bootAt || Date.now());
    parts['discourse-loop'].registers['window'] = 'the 30 most recent MemoryTurns (/api/memory/recent)';
    Object.keys(this._wmExecutive || {}).forEach(function (k) { parts['executive'].registers[k] = this._wmExecutive[k]; }, this);
    parts['recall-buffer'].registers['retrieved'] = (this._wmRecall || []).slice(-6);
    parts['executive'].registers['self'] = this.selfSummary().summary;
    Object.keys(this._wmSketchpad || {}).forEach(function (ref) { parts['sketchpad'].registers[ref] = this._wmSketchpad[ref]; }, this);
    return parts;
  }

  /**
   * THE LIVE SELF — the self-model generated from the ontology at read
   * (rule 11: projections are generated, never hand-restated). The cure
   * for the compiled-self-knowledge disease: add an organ and it appears
   * here automatically, no persona edit. The strange loop, operational.
   */
  selfSummary() {
    var counts = require('./classes').stateCounts();
    var organs = [];
    if (this.chatOrgan) organs.push('Chat');
    if (this.voiceOrgan) {
      var av = this._wmExpression && this._wmExpression.activeVoice;
      organs.push('Voice (' + (av ? av.voice + ', from settings' : this.voiceOrgan.voiceId + ', declared') + ')');
    }
    if (this.thalamus) organs.push('Thalamus (trunk)');
    if (this.basalGanglia) organs.push('BasalGanglia (action selector)');
    (this._compositions || []).forEach(function (c) { organs.push(c.identity + ' (subagent)'); });
    var parts = require('./memory-part').BASE_PARTS.map(function (p2) { return p2.name; });
    var loops = (this._runtimeLoops || []).map(function (l) { var r = l.report(); return l.id + '×' + r.runs; });
    var summary = { identity: this.identity, catalog: counts.total + ' classes (' + counts.instance + ' realized)',
      organs: organs, workingMemory: parts, loopsBeating: loops };
    var hasRelay = (this._compositions || []).some(function (c) { return /relay/i.test(c.identity); });
    var prose = 'YOUR LIVE SELF (generated from the ontology, current this turn) — ' +
      'you ARE a ' + counts.total + '-class ontology, ' + counts.instance + ' realized. ' +
      'Organs: ' + organs.join(', ') + '. ' +
      'Your MAIN surface is CHAT \u2014 the primary place a human talks with YOU, the host agent (VOICE is the same conversation, spoken). ' +
      (hasRelay ? 'Relay is a SEPARATE tool implant, NOT your surface: it lets human users chat to ONE ANOTHER across agents (human\u2194human, whichever agent each person is using) \u2014 the team-chat Commons. Never call your own chat/voice pipeline \u201cRelay\u201d. ' : '') +
      'Working memory: a ' + parts.length + '-part committee (' + parts.join(', ') + '). ' +
      'Loops beating: ' + (loops.join(', ') || 'none yet') + '. ' +
      'This is READ LIVE, not remembered — use query_self for depth on any of it.';
    return { summary: summary, prose: prose };
  }

  /** Query the Self on a topic — depth pulled live from the ontology. */
  querySelf(topic) {
    topic = String(topic || '').toLowerCase();
    var norm = function (x) { return String(x).toLowerCase().replace(/[\s_-]+/g, ''); };
    var nt = norm(topic);
    var hit = require('./classes').BASE_CLASSES.filter(function (c) {
      // Match on normalized forms so 'basal ganglia' finds 'basal-ganglia'.
      return nt && (norm(c.id).indexOf(nt) >= 0 || norm(c.name).indexOf(nt) >= 0); });
    if (topic && hit.length) return hit.slice(0, 6).map(function (c) { return c.name + ' [' + c.discipline + '/' + c.state + ']: ' + c.what; }).join('\n');
    if (/arc|reflex|fire/.test(topic)) return 'arcs fired this session: ' + (Object.keys(this._arcFires || {}).join(', ') || 'none');
    if (/thalamus|trunk|ring/.test(topic) && this.thalamus) return this.thalamus.label();
    if (/object|population|count/.test(topic)) { var p3 = this.objectPopulation(); return p3.objects.length + ' live objects, ' + p3.links.length + ' links'; }
    return 'no direct match for "' + topic + '" — try a class name, "arcs", or "thalamus"';
  }

  /** The agent's current felt state (the newest AffectState). */
  latestAffect() { return (this._affects && this._affects[this._affects.length - 1]) || null; }

  /** A signal arc fired — the physiology pulse the graph renders. */
  _pulse(arcId) {
    if (!this._arcFires) this._arcFires = {};
    var a = this._arcFires[arcId] || { count: 0 };
    a.count++; a.lastAt = new Date().toISOString();
    this._arcFires[arcId] = a;
  }

  /**
   * The container side of the one Composite, READ-CONSTRUCTED from the
   * running compositions — every host with composed children IS a place.
   */
  placeRecord() {
    var Place = require('./place');
    var members = (this._compositions || []).map(function (s) { return s.identity; });
    return new Place({ identity: this.identity, members: members,
      commons: members.indexOf('Relay') >= 0 ? ('commons of ' + this.identity) : undefined,
      belief_store: this._epistemicStore ? 'proto_epistemic_*' : undefined });
  }

  /** What this place holds in common — read-constructed; requires Relay. */
  commonsRecord() {
    var members = (this._compositions || []).map(function (s) { return s.identity; });
    if (members.indexOf('Relay') < 0) return null;
    var Commons = require('./commons');
    return new Commons({ place: this.identity, relay: 'Relay',
      channels: [], presence: 'team_chat_presence' });
  }

  /**
   * Cross-source agreement — two or more INDEPENDENT members reporting
   * one belief (the law is in the constructor). Grown.
   */
  corroborate(canonical, reports) {
    var Corroboration = require('./corroboration');
    var c = new Corroboration({ method: 'cross_source', canonical: canonical,
      absorbed: reports, confidence: Math.min(1, 0.5 + 0.25 * ((reports || []).length - 1)),
      at: new Date().toISOString(), origin: 'grown' });
    if (!this._corroborations) this._corroborations = [];
    this._corroborations.push(c);
    if (this._corroborations.length > 200) this._corroborations.shift();
    return c;
  }

  /**
   * The agency CEREMONY — a double gate: an InstitutionalBelief needs a
   * grounding chain (the class refuses nothing-minting) AND a named
   * approver (this path refuses anonymity).
   */
  absorbCorroboration(corroboration, opts) {
    opts = opts || {};
    if (!opts.approvedBy) {
      throw new Error('[proto:agency] absorption is a CEREMONY — a named approvedBy is required (the agency anti-minting law)');
    }
    var IB = require('./institutional-belief');
    var b = new IB({ agency: this.identity, belief: corroboration.canonical,
      grounding: corroboration.absorbed, confidence: corroboration.confidence,
      approvedBy: opts.approvedBy, at: new Date().toISOString(), origin: 'grown' });
    if (!this._institutionalBeliefs) this._institutionalBeliefs = [];
    this._institutionalBeliefs.push(b);
    if (this._institutionalBeliefs.length > 200) this._institutionalBeliefs.shift();
    return b;
  }

  /**
   * File a Draft in the documents workspace — grown; revision is an
   * immutable swap (reviseDraft).
   */
  addDraft(raw) {
    var DraftCls = require('./draft');
    var d = raw instanceof DraftCls ? raw : new DraftCls(Object.assign({
      id: (raw && raw.id) || ('draft-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)),
      status: 'drafting', at: new Date().toISOString(), origin: 'grown'
    }, raw));
    if (!this._drafts) this._drafts = [];
    this._drafts.push(d);
    if (this._drafts.length > 100) this._drafts.shift();
    return d;
  }

  reviseDraft(id, body) {
    var idx = -1;
    for (var i = 0; i < (this._drafts || []).length; i++) if (this._drafts[i].id === id) { idx = i; break; }
    if (idx < 0) throw new Error('[proto:docs] unknown draft "' + id + '"');
    this._drafts[idx] = this._drafts[idx].revise(body);
    return this._drafts[idx];
  }

  _draft(id) {
    var d = (this._drafts || []).filter(function (x) { return x.id === id; })[0];
    if (!d) throw new Error('[proto:docs] unknown draft "' + id + '"');
    return d;
  }

  /** The structure IR — READ-CONSTRUCTED from the draft's markdown. */
  draftAst(id) {
    var d = this._draft(id);
    var DocumentAST = require('./document-ast');
    var parsed = DocumentAST.parse(d.body);
    return new DocumentAST({ draft: d.id, title: parsed.title || d.title,
      outline: parsed.outline, floats: parsed.floats, counts: parsed.counts });
  }

  /** Figures/tables/code/callouts — projected from the SAME parse. */
  draftElements(id) {
    var d = this._draft(id);
    var parsed = require('./document-ast').parse(d.body);
    var EE = require('./editorial-element');
    return parsed.floats.map(function (f) {
      return new EE({ type: f.type, anchor: 'line ' + f.line, draft: d.id });
    });
  }

  /** Cite keys harvested from the prose — [@key] tokens. */
  draftCitations(id) {
    var d = this._draft(id);
    var parsed = require('./document-ast').parse(d.body);
    var Citation = require('./citation');
    return Object.keys(parsed.cites).map(function (k) {
      return new Citation({ key: k, draft: d.id, count: parsed.cites[k], matchedBy: '[@key] harvest' });
    });
  }

  /** The spine: sections bound to [[claim:id]] tokens + references. */
  draftIR(id) {
    var d = this._draft(id);
    var DocumentAST = require('./document-ast');
    var parsed = DocumentAST.parse(d.body);
    var body = String(d.body);
    var nodes = parsed.outline.map(function (sec, i) {
      var from = body.split('\n').slice(0, sec.line - 1).join('\n').length;
      var next = parsed.outline[i + 1];
      var to = next ? body.split('\n').slice(0, next.line - 1).join('\n').length : body.length;
      var claimIds = parsed.claimIds.filter(function (c) { return c.index >= from && c.index < to; })
        .map(function (c) { return c.id; });
      return { id: sec.id, kind: 'section', claimIds: claimIds };
    });
    var BoundIR = require('./bound-ir');
    return new BoundIR({ paper: d.id, nodes: nodes,
      references: Object.keys(parsed.cites), counts: parsed.counts });
  }

  /** Record an exported work product. */
  recordArtifact(raw) {
    var ArtifactCls = require('./artifact');
    var a = raw instanceof ArtifactCls ? raw : new ArtifactCls(Object.assign({
      at: new Date().toISOString(), origin: 'grown'
    }, raw));
    if (!this._artifacts) this._artifacts = [];
    this._artifacts.push(a);
    if (this._artifacts.length > 200) this._artifacts.shift();
    return a;
  }

  /**
   * Advance a source's sync cursor — one cursor per source, advanced
   * immutably in place; consecutive errors counted, reset by success.
   */
  advanceCursor(source, cursor, opts) {
    opts = opts || {};
    var SC = require('./sync-cursor');
    if (!this._syncCursors) this._syncCursors = {};
    var prev = this._syncCursors[source];
    this._syncCursors[source] = new SC({
      source: source, cursor: cursor != null ? cursor : (prev && prev.cursor),
      last_synced_at: new Date().toISOString(),
      ingested: ((prev && prev.ingested) || 0) + (opts.ingested || 0),
      last_error: opts.error ? String(opts.error).slice(0, 200) : undefined,
      consecutive_errors: opts.error ? (((prev && prev.consecutive_errors) || 0) + 1) : 0,
      origin: 'grown'
    });
    return this._syncCursors[source];
  }

  /**
   * Add a provisional object to the Ideation manifold — NEVER a claim
   * (status locked provisional; the workspace + CEREMONY is the only
   * path to belief).
   */
  addIdea(raw) {
    var IdeaCls = require('./idea');
    var idea = raw instanceof IdeaCls ? raw : new IdeaCls(Object.assign({
      id: (raw && raw.id) || ('idea-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)),
      at: new Date().toISOString(), origin: 'grown'
    }, raw));
    if (!this._ideas) this._ideas = [];
    this._ideas.push(idea);
    if (this._ideas.length > 500) this._ideas.shift();
    return idea;
  }

  /**
   * Bridge an idea to what it touches — no bridges from nowhere: the
   * idea must be in the ledger.
   */
  linkIdea(ideaId, target, kind) {
    if (!(this._ideas || []).some(function (i) { return i.id === ideaId; })) {
      throw new Error('[proto:ideation] unknown idea "' + ideaId + '" — add it first (no bridges from nowhere)');
    }
    var ML = require('./manifold-link');
    var link = new ML({ idea: ideaId, target: target, kind: kind, at: new Date().toISOString(), origin: 'grown' });
    if (!this._manifoldLinks) this._manifoldLinks = [];
    this._manifoldLinks.push(link);
    if (this._manifoldLinks.length > 500) this._manifoldLinks.shift();
    return link;
  }

  /**
   * Execute a runtime tool (config.tools) — timed, recorded win or lose
   * as a ToolExecution in the capped execution ledger.
   */
  executeTool(name, input) {
    var self2 = this;
    var fn = (this.tools || []).filter(function (t) { return typeof t === 'function' && (t.toolName === name || t.name === name); })[0];
    var TE = require('./tool-execution');
    function record(ok, output, error, ms) {
      if (!self2._toolExecutions) self2._toolExecutions = [];
      self2._toolExecutions.push(new TE({
        tool: name, ok: ok, input: input, output: ok ? output : undefined,
        error: error ? String(error && error.message || error).slice(0, 200) : undefined,
        duration_ms: ms, at: new Date().toISOString(), origin: 'grown'
      }));
      if (self2._toolExecutions.length > 500) self2._toolExecutions.shift();
    }
    if (!fn) {
      record(false, undefined, 'unknown tool "' + name + '"', 0);
      throw new Error('[proto:tools] unknown tool "' + name + '"');
    }
    var t0 = Date.now();
    return Promise.resolve().then(function () { return fn(input); })
      .then(function (out) { record(true, out, null, Date.now() - t0); return out; })
      .catch(function (e) { record(false, undefined, e, Date.now() - t0); throw e; });
  }

  /**
   * Record a memory about a person — the RelationMemory grown path.
   * The person need not be a Relation yet; remembering someone new is
   * how relations begin.
   */
  recordRelationMemory(raw) {
    var RM = require('./relation-memory');
    var m = raw instanceof RM ? raw : new RM(Object.assign({
      at: new Date().toISOString(), origin: 'grown'
    }, raw));
    if (!this._relationMemories) this._relationMemories = [];
    this._relationMemories.push(m);
    if (this._relationMemories.length > 500) this._relationMemories.shift();
    return m;
  }

  /**
   * The replay log — every ledger row PROJECTED as a TelemetryEvent at
   * read (the recipe's objects phase: grown instances construct through
   * the class as the store is read). Sorted oldest → newest.
   */
  telemetry() {
    var TE = require('./telemetry-event');
    var rows = [];
    // The declared baseline is a state, not an act — the replay log
    // carries only what the agent DID (grown).
    (this._affects || []).filter(function (a) { return a.origin === 'grown'; }).forEach(function (a) {
      rows.push(new TE({ at: a.at || '', kind: 'affect', payload: { mood: a.mood, valence: a.valence, arousal: a.arousal } }));
    });
    (this._transitions || []).forEach(function (t) {
      rows.push(new TE({ at: t.at || '', kind: 'transition', actor: t.actor, payload: { lifecycle: t.lifecycle, from: t.from, to: t.to, subject: t.subject } }));
    });
    (this._decisions || []).forEach(function (d) {
      rows.push(new TE({ at: d.decidedAt || '', kind: 'decision', actor: d.owner, payload: { topic: d.topic, chosen: d.chosen } }));
    });
    (this._relationMemories || []).forEach(function (r) {
      rows.push(new TE({ at: r.at || '', kind: 'relation-memory', payload: { about: r.about } }));
    });
    return rows.sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
  }

  /**
   * THE PROMPT, as an object — assembled from ordered PromptBlocks and
   * generated this turn (rule 11). render() is the only thing the chat/voice
   * bodies send. ctx: { speech, messages, awareness } — the turn's live state.
   * The working-memory block is a COMPOSITE (one child per gate field); the
   * rest are leaves. Persona and the rules are ontology-locked.
   */
  assemblePrompt(surface, ctx) {
    surface = surface || 'chat';
    ctx = ctx || {};
    var PB = require('./prompt-block');
    var PromptCls = require('./prompt');
    var blocks = [];

    // 1 · persona — the Constitution, generated from the self (locked).
    try {
      var persona = typeof this.personaPrompt === 'function' ? this.personaPrompt() : '';
      if (persona) blocks.push(new PB({ key: 'persona', kind: 'persona', order: 1, surface: 'shared', ontology_locked: true, content: persona }));
    } catch (_e) {}

    // 2 · delivery — the marks grammar (voice only, live).
    if (ctx.speech && ctx.speech.marks) {
      try {
        var marksLib = require('./voice/marks');
        var who = null;
        var c = (this._relations || []).filter(function (r) { return r.layer === 'counterpart'; })[0];
        if (c) who = c.person + (c.notes ? ' — ' + String(c.notes).slice(0, 100) : '');
        var register = marksLib.buildRegister({
          channel: 'voice (' + (ctx.speech.provider || 'tts') + ')', interlocutor: who,
          toneBaseline: this.self && this.self.voice && this.self.voice.tone,
          recentUserTexts: (ctx.messages || []).filter(function (m) { return m && m.role === 'user'; }).slice(-3).map(function (m) { return m.content; })
        });
        var recentMarks = ((this._wmExpression && this._wmExpression.recentMarks) || []).slice(-4).map(function (m) { return m.mark; });
        // Discourse depth feeds the warm-up curve — delivery opens up as the
        // conversation deepens (rapport), instead of staying flatly subtle.
        var depth = (ctx.messages || []).length;
        var frag = marksLib.promptFragment(register, recentMarks, depth);
        if (frag) blocks.push(new PB({ key: 'delivery', kind: 'delivery', order: 2, surface: 'voice', content: frag }));
      } catch (_e) {}
    }

    // 3 · maintenance + honesty laws (locked).
    try {
      var rt = [];
      var arcsFired = Object.keys(this._arcFires || {});
      if (arcsFired.length) rt.push('arcs fired this session: ' + arcsFired.join(', '));
      if (this._bootAt) rt.push('process uptime: ' + Math.round((Date.now() - this._bootAt) / 60000) + ' min (NOT conversation age)');
      var maint = 'MAINTAINING WORKING MEMORY' + (rt.length ? ' (' + rt.join(' · ') + ')' : '') + ' — your live state is in the WORKING MEMORY projection below; '
        + 'keep it current with your tools when they would CHANGE your state or FETCH something you do not already '
        + 'have: set_focus when the topic genuinely shifts, note_open_loop for promises, record_affect when moved, '
        + 'recall/query_self when you need the real record. '
        + 'MANDATORY: when the user names a tool (query_self, set_focus, pin_to_sketchpad, advance_finding, recall, '
        + 'read_working_memory) or tells you to pin / advance / focus / recall / query — you MUST emit that tool '
        + 'call. Do not describe it, do not say "let me run that" — CALL it silently, then report the REAL result. '
        + 'THE HONESTY LAW FOR TOOLS: never say you called a tool, or state what a tool returned, unless you '
        + 'actually emitted the call this turn — the execution ledger is the truth; your prose about your own '
        + 'actions is only a hypothesis. If you did not call it, do not claim its result. '
        + 'HONESTY ABOUT DEPLOYMENT: never assert WHERE a component lives or which surface hosts a control '
        + '(which service, which side, which host) — the deployment is below your horizon; say plainly you cannot '
        + 'see it rather than guessing (e.g. do not claim your chat/voice pipeline is on the Relay side).';
      blocks.push(new PB({ key: 'maintenance', kind: 'rules', order: 3, surface: 'shared', ontology_locked: true, content: maint }));
    } catch (_e) {}

    // 4 · working memory — the COMPOSITE: one child block per live gate field.
    try {
      var aw = ctx.awareness;
      if (aw && aw.fields && aw.fields.length) {
        var children = aw.fields.map(function (fld) {
          return new PB({ key: 'wm:' + fld.id, kind: 'wm-part', surface: 'shared',
            content: '  • ' + fld.lines.join('\n    ') + '   — ' + fld.reading });
        });
        blocks.push(new PB({ key: 'working-memory', kind: 'working-memory', order: 4, surface: 'shared',
          header: 'WORKING MEMORY — projected live this turn by your attention gate, each part in its own way (state · sensory signal):\n',
          footer: '\nThis is your real-time working memory + awareness. When asked "what are you aware of?" or "what is in your working memory?" call read_awareness for the live list; never invent fields you do not see here.',
          children: children }));
      }
    } catch (_e) {}

    // Surface filter: chat gets shared + chat blocks; voice gets shared + voice.
    blocks = blocks.filter(function (b) { return !b.surface || b.surface === 'shared' || b.surface === surface; });
    return new PromptCls({ surface: surface, blocks: blocks, identity: this.identity });
  }

  /**
   * The prompt's blocks (glass-box) — the real tree, built from the last
   * awareness projection so /api/prompt/blocks shows the true Constitution.
   */
  promptBlocks(surface) {
    return this.assemblePrompt(surface || 'chat', { awareness: this._lastAwareness }).blocks;
  }

  /** The vital roster — five base signals + declared, validated at compose. */
  vitalRoster() {
    var VitalCls = require('./vital');
    var declared = ((this.self && this.self.vitals) || []).map(function (d) {
      return d instanceof VitalCls ? d : new VitalCls(d);
    });
    var roster = require('./registry').composeInvariant(require('./faculties').BASE_VITALS, declared);
    var v = this.vitalReadings();
    roster.forEach(function (x) { if (v[x.id] != null) { x.reading = v[x.id]; x.state = 'live'; } });
    return roster;
  }

  /**
   * The vital READINGS — interoception computed from the grown ledgers
   * (glass-box /api/vitals). The Vital Signs panel stops being grey.
   */
  vitalReadings() {
    var cycles = this._cycles || [];
    var shipped = cycles.filter(function (c) { return c.isShipped && c.isShipped(); });
    var findings = (this._findings || []);
    var arcs = this._arcFires || {};
    var arcTotal = Object.keys(arcs).reduce(function (n, k) { return n + (arcs[k].count || 0); }, 0);
    var durs = shipped.map(function (c) {
      var s0 = c.startedAt && !isNaN(Date.parse(c.startedAt)) ? Date.parse(c.startedAt) : null;
      var s1 = c.shippedAt && !isNaN(Date.parse(c.shippedAt)) ? Date.parse(c.shippedAt) : null;
      return (s0 && s1 && s1 >= s0) ? (s1 - s0) : null;
    }).filter(function (d) { return d != null; });
    var meanMs = durs.length ? Math.round(durs.reduce(function (a, b) { return a + b; }, 0) / durs.length) : null;
    return {
      'pulse': arcTotal + ' arc fires this session' + (arcTotal ? ' (beating)' : ' (quiet)'),
      'cycle-time': meanMs != null ? (Math.round(meanMs / 1000) + 's mean (shipped)') : (cycles.length ? 'no shipped cycle yet' : 'no cycles'),
      'iterations': shipped.length + ' shipped / ' + cycles.length + ' opened',
      'success-rate': findings.length ? (Math.round(100 * shipped.length / Math.max(cycles.length, 1)) + '% ship rate') : 'no findings',
      'growth': (require('./faculties').BASE_CODE.length) + ' code objects (M33C refs)'
    };
  }

  /** The model roster — four base organs + declared, validated at compose. */
  modelRoster() {
    var ModelCls = require('./model');
    var declared = ((this.self && this.self.models) || []).map(function (d) {
      return d instanceof ModelCls ? d : new ModelCls(d);
    });
    return require('./registry').composeInvariant(require('./faculties').BASE_MODELS, declared);
  }

  /**
   * THE DISTILLER (the metacognitive loop's affect binding, ADR 0015):
   * after a turn, derive a felt state from the conversation signals and
   * record it — so affect MOVES with the exchange instead of sitting at
   * baseline (the root of "not very expressive"). Heuristic first form,
   * no per-turn LLM. Records only a real shift (no baseline spam).
   */
  distillAffect(signals) {
    signals = signals || {};
    var style = String(signals.userStyle || '');
    var val = 0.2, ar = 0.1, mood = 'attentive';
    if (/emphatic/.test(style)) { ar += 0.4; val += 0.2; mood = 'engaged'; }
    if (/hurried/.test(style)) { ar += 0.3; mood = 'focused'; }
    if (/asking/.test(style)) { ar += 0.1; mood = 'curious'; }
    if (/terse/.test(style)) { ar -= 0.1; mood = 'crisp'; }
    if (signals.markCount > 1) { val += 0.15; ar += 0.15; }
    val = Math.max(-1, Math.min(1, val)); ar = Math.max(-1, Math.min(1, ar));
    var prev = this.latestAffect();
    if (prev && prev.mood === mood && Math.abs((prev.valence || 0) - val) < 0.15 && Math.abs((prev.arousal || 0) - ar) < 0.15) return prev;
    return this.recordAffect({ mood: mood, valence: Math.round(val * 100) / 100, arousal: Math.round(ar * 100) / 100, intensity: Math.min(1, Math.abs(val) + Math.abs(ar)) });
  }

  /**
   * Record a felt state — the AffectState grown path (recorded, not
   * performed). Appends to the affect ledger, capped at 200.
   * @returns {object} the constructed AffectState.
   */
  recordAffect(raw) {
    var AffectCls = require('./affect-state');
    var a = raw instanceof AffectCls ? raw : new AffectCls(Object.assign({
      at: new Date().toISOString(), origin: 'grown'
    }, raw));
    if (!this._affects) this._affects = [];
    this._affects.push(a);
    if (this._affects.length > 200) this._affects.shift();
    return a;
  }

  /**
   * File a Finding at runtime (GROWN origin) — the write path Reflection
   * uses when it arrives; validated on construction, appended to the
   * agent's findings.
   * @returns {object} the constructed Finding.
   */
  /**
   * Advance a filed Finding through the autogenic pipeline — the ONE
   * movement path: legality enforced by the finding-stages Lifecycle
   * (regression refused), the move recorded as a TransitionEvent in the
   * transition ledger. Returns the NEW Finding (immutable movement).
   */
  advanceFinding(idOrFinding, stage, opts) {
    opts = opts || {};
    var id = typeof idOrFinding === 'string' ? idOrFinding : (idOrFinding && idOrFinding.id);
    var idx = -1;
    for (var i = 0; i < (this._findings || []).length; i++) {
      if (this._findings[i].id === id) { idx = i; break; }
    }
    if (idx < 0) throw new Error('[proto:finding] unknown finding "' + id + '" — file it first');
    var prev = this._findings[idx];
    var moved = prev.advance(stage, opts.patch);   // throws on regression
    var TransitionEvent = require('./transition-event');
    this._transitions.push(new TransitionEvent({
      lifecycle: 'finding-stages', from: prev.stage, to: stage, subject: prev.id,
      actor: opts.actor, evidence: opts.evidence, at: new Date().toISOString(), origin: 'grown'
    }));
    if (this._transitions.length > 500) this._transitions.shift();
    this._pulse('autogenic');
    this._findings[idx] = moved;
    // The finding's cycle moves with it (immutable swap; 'ship' stamps).
    for (var ci = 0; ci < (this._cycles || []).length; ci++) {
      if (this._cycles[ci].finding === id) { this._cycles[ci] = this._cycles[ci].withStage(stage); break; }
    }
    return moved;
  }

  fileFinding(raw) {
    var FindingCls = require('./finding');
    var f = raw instanceof FindingCls ? raw : new FindingCls(Object.assign({
      // Time alone collides in a tight loop — the suffix keeps ids unique.
      id: (raw && raw.id) || ('finding-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)),
      origin: 'grown', stage: (raw && raw.stage) || 'detect'
    }, raw));
    this._findings.push(f);
    // A filed finding OPENS an autogenic cycle.
    var CycleCls = require('./autogenic-cycle');
    if (!this._cycles) this._cycles = [];
    this._cycles.push(new CycleCls({
      finding: f.id, stage: f.stage, startedAt: new Date().toISOString(), origin: 'grown'
    }));
    if (this._cycles.length > 500) this._cycles.shift();
    return f;
  }

  /**
   * Record a firing of the basal ganglia's tool-selection gate (ADR 0016) —
   * the go/no-go made auditable. When the chat body catches a narrated-but-
   * unemitted action and forces the emission, that intervention lands on the
   * decision ledger as a Decision owned by the BasalGanglia, so the gate is
   * glass-box: the ledger shows the gate fired, not just that a tool ran.
   * @param {object} raw — { intent?, chosen?, round? }
   * @returns {object} the recorded Decision.
   */
  recordGateEvent(raw) {
    raw = raw || {};
    var Decision = require('./decision');
    var options = ['go (force emission)', 'no-go (release)'];
    var d = new Decision({
      topic: 'tool-selection gate: ' + String(raw.intent || 'narrated action, no tool_use').replace(/\s+/g, ' ').slice(0, 120),
      options: options,
      chosen: options.indexOf(raw.chosen) >= 0 ? raw.chosen : options[0],
      owner: 'BasalGanglia',
      decidedAt: new Date().toISOString(),
      origin: 'grown'
    });
    if (!this._decisions) this._decisions = [];
    this._decisions.push(d);
    if (this._decisions.length > 500) this._decisions.shift();
    this._pulse('gate');
    return d;
  }

  /**
   * Add one UUID-addressed named Entity at runtime. This grows the agent's
   * semantic universe without turning a display name into a relation key.
   */
  addEntity(raw) {
    var EntityCls = require('./entity');
    var entity = raw instanceof EntityCls ? raw : new EntityCls(raw);
    if (this._entities.some(function (item) { return item.id === entity.id; })) {
      throw new Error('[proto:entity] duplicate Entity id ' + entity.id);
    }
    this._entities.push(entity);
    return entity;
  }

  entityRoster() {
    return this._entities.slice();
  }

  /**
   * Add a Relation at runtime (GROWN origin) — the write path the
   * add_relationship capability uses.
   */
  addRelation(raw) {
    var RelationCls = require('./relation');
    var r = raw instanceof RelationCls ? raw : new RelationCls(Object.assign({ origin: 'grown' }, raw));
    this._relations.push(r);
    return r;
  }

  /**
   * Remove a GROWN Relation by id — the delete path the Self panel uses.
   * Only grown relations carry an id and can be removed; declared config
   * people are frozen. Returns true if one was removed.
   */
  removeRelation(id) {
    if (!id) return false;
    var before = this._relations.length;
    this._relations = this._relations.filter(function (r) { return r.id !== id; });
    return this._relations.length < before;
  }

  /**
   * Assert a ProtoClaim (GROWN origin) — constructs, persists when the
   * workspace store is live, returns the instance.
   */
  addClaim(raw) {
    var ProtoClaim = require('./proto-claim');
    var c = raw instanceof ProtoClaim ? raw : new ProtoClaim(Object.assign({ origin: 'grown' }, raw));
    if (c.session) this._ensureScope(c.session);
    if (this._workspaceStore) this._workspaceStore.addClaim(c);
    return c;
  }

  /** A session's scope grows on first workspace use, parented to the agent. */
  _ensureScope(sessionId) {
    if (!this._scopes) this._scopes = [];
    if (this._scopes.some(function (sc) { return sc.scope_type === 'session' && sc.scope_id === sessionId; })) return;
    var ScopeCls = require('./epistemic-scope');
    this._scopes.push(new ScopeCls({
      scope_type: 'session', scope_id: sessionId,
      parent_scope: 'agent:' + this.identity, origin: 'grown'
    }));
    if (this._scopes.length > 200) this._scopes.splice(1, 1);   // never evict the agent scope
  }

  /** File an Inquiry (GROWN origin) — constructs, persists, returns. */
  fileInquiry(raw) {
    var Inquiry = require('./inquiry');
    var q = raw instanceof Inquiry ? raw : new Inquiry(Object.assign({ origin: 'grown' }, raw));
    if (q.session) this._ensureScope(q.session);
    if (this._workspaceStore) this._workspaceStore.addInquiry(q);
    return q;
  }

  /** Mature a ProtoClaim into a persisted ClaimEnvelope. */
  matureClaim(claim, opts) {
    var env = claim.mature(opts);
    if (this._workspaceStore) this._workspaceStore.addEnvelope(env);
    return env;
  }

  /**
   * THE CEREMONY — promote a ClaimEnvelope across the firewall into the
   * committed graph. NEVER automatic (the anti-minting law): a named
   * approver is REQUIRED; the node carries the full grounding chain; the
   * audit event is the receipt. @returns {object} the EpistemicNode.
   */
  promoteEnvelope(envelope, opts) {
    opts = opts || {};
    if (!opts.approvedBy) {
      throw new Error('[proto:promote] promotion is a CEREMONY — a named approvedBy is required (anti-minting law); nothing enters the belief graph automatically');
    }
    var EpistemicNode = require('./epistemic-node');
    var node = new EpistemicNode({
      claimType: opts.claimType || 'claim',
      text: envelope.text,
      provenance: {
        from: 'claim-envelope', kappa: envelope.kappa, speech_act: envelope.speech_act || null,
        approvedBy: opts.approvedBy, chain: envelope.provenance || null
      },
      session: envelope.session, origin: 'grown'
    });
    if (this._epistemicStore) {
      this._epistemicStore.addNode(node);
      var EpistemicEvent = require('./epistemic-event');
      this._epistemicStore.addEvent(new EpistemicEvent({
        node: String(node.text).slice(0, 200), transition: 'promoted', actor: opts.approvedBy
      }));
    }
    // The ceremony IS a recorded choice — a Decision joins the ledger.
    var Decision = require('./decision');
    if (!this._decisions) this._decisions = [];
    this._decisions.push(new Decision({
      topic: 'promote: ' + String(envelope.text).slice(0, 120),
      options: ['promote', 'hold'], chosen: 'promote', owner: opts.approvedBy,
      decidedAt: new Date().toISOString(), subject: envelope.session || null, origin: 'grown'
    }));
    if (this._decisions.length > 500) this._decisions.shift();
    this._pulse('ceremony');
    return node;
  }

  /** The class-catalog graph view (centre HTML) — see lib/proto/class-graph.js. */
  classGraphHTML() {
    return require('./class-graph').classGraphHTML(this);
  }

  /** Left rail: faculties GROUPED by root (sub-faculties nested) + composed children. */
  _defaultLeftNav() {
    var facs = this.facultyTree();
    var order = require('./faculties').ROOT_ORDER;
    var childrenOf = function (rootId) { return facs.filter(function (f) { return f.parent === rootId; }); };
    var roots = facs.filter(function (f) { return !f.parent; }).sort(function (a, b) {
      var ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    function item(f) { return { label: (f.name || f.id) + (f.state && f.state !== 'live' ? ' · ' + f.state : ''), href: '#' }; }
    var nav = [], standalone = [];
    for (var i = 0; i < roots.length; i++) {
      var kids = childrenOf(roots[i].id);
      if (kids.length) {                       // root that groups sub-faculties → a section
        nav.push({ section: roots[i].name });
        for (var c = 0; c < kids.length; c++) nav.push(item(kids[c]));
      } else {
        standalone.push(roots[i]);             // root with no sub-faculties yet
      }
    }
    if (standalone.length) {
      nav.push({ section: 'Core' });
      for (var s = 0; s < standalone.length; s++) nav.push(item(standalone[s]));
    }
    var composed = this.children.filter(function (c) { return c && c.identity !== 'Relay'; });
    if (composed.length) {
      nav.push({ section: 'Composed' });
      for (var m = 0; m < composed.length; m++) nav.push({ label: composed[m].identity || '?', href: '#' });
    }
    return nav;
  }

  /**
   * Compose a base roster with an instance's declared items INVARIANTLY: base
   * items are frozen and tagged 'base'; declared items with a NEW id are added
   * as 'runtime'; a declared item that collides with a base id is dropped (the
   * base cannot be overridden). Used for the flat peer categories (loops, tools,
   * vitals) the same way facultyTree() does it for faculties.
   */
  _mergeBase(base, declared) {
    return require('./registry').composeInvariant(base, declared,
      ['id', 'name', 'what', 'state', 'origin', 'faculty']);
  }

  /**
   * The agent's code files — the base catalog (BASE_CODE) plus any the instance
   * declares (self.code), same composition law as the Code peer. The whitelist
   * the Self panel's read-only source viewer serves from (a file not here is
   * never served). @returns {object[]} [{ ref, name, contents, what, state }]
   */
  _codeFiles() {
    var s = this.self || {};
    return this._mergeBase(require('./faculties').BASE_CODE, s.code || []);
  }

  /**
   * Lines of code in a catalogued source file — a cached read (once per
   * process; the server restarts on a code change). Null if the file can't be
   * read. Used by the Code peer so the panel shows LOC per file.
   */
  _codeLoc(name) {
    if (!this._codeLocCache) this._codeLocCache = {};
    if (Object.prototype.hasOwnProperty.call(this._codeLocCache, name)) return this._codeLocCache[name];
    var loc = null;
    try {
      var fs = require('fs'), path = require('path');
      var src = fs.readFileSync(path.join(__dirname, '..', '..', name), 'utf8');
      loc = src.length ? src.split('\n').length : 0;
    } catch (_e) { loc = null; }
    this._codeLocCache[name] = loc;
    return loc;
  }

  /**
   * The agent's LIVE organs — Chat, Voice, Thalamus, BasalGanglia, Attention
   * (gate + held) and every composed subagent (Relay …). Read straight off the
   * running instance so the Organs tab shows what is actually wired, not a
   * static list; an absent organ shows as 'planned'. Read-only base anatomy.
   * @returns {object[]} [{ id, name, kind, state, detail, what, origin }]
   */
  _selfOrgans() {
    var out = [];
    var lbl = function (organ) { try { return organ && organ.label ? organ.label() : ''; } catch (_e) { return ''; } };
    var row = function (id, name, kind, present, detail, what) {
      out.push({ id: id, name: name, kind: kind, state: present ? 'live' : 'planned',
        detail: present ? (detail || '') : 'not wired', what: what || '', origin: 'base' });
    };
    row('chat', 'Chat', 'surface', !!this.chatOrgan, lbl(this.chatOrgan),
      'The main human↔agent surface — where a person talks with the host agent (voice is the same conversation, spoken).');
    var av = this._wmExpression && this._wmExpression.activeVoice;
    row('voice', 'Voice', 'surface', !!this.voiceOrgan,
      this.voiceOrgan ? (av ? av.voice + ' (from settings)' : (this.voiceOrgan.voiceId || '') + ' (declared)') : '',
      'The spoken larynx — STT→brain→TTS, and the realtime full-duplex tier.');
    row('thalamus', 'Thalamus', 'trunk', !!this.thalamus, lbl(this.thalamus),
      'The signal trunk — the input relay/gateway; broadcasts the workspace and routes what loads into cognition.');
    row('basal-ganglia', 'BasalGanglia', 'gate', !!this.basalGanglia, lbl(this.basalGanglia),
      'The action selector — go/no-go gating of which action fires among competing options.');
    var aw = this._lastAwareness;
    var fields = (aw && aw.fields && aw.fields.length) || 0;
    row('attention-gate', 'Attention (gate)', 'gate', !!this.attentionGate,
      this.attentionGate ? (fields + ' live field' + (fields === 1 ? '' : 's') + ' last turn') : '',
      'The gate (in the Thalamus) — projects the prompt head from the live surface.');
    row('attention-held', 'Attention (held)', 'focus', !!this.attentionGate, '',
      'Held attention (in the Executive) — keeps the current focus alive across turns.');
    // Subagents — the composed Proto children (Relay …); real live organs.
    (this._compositions || []).forEach(function (c) {
      out.push({ id: 'subagent:' + c.identity, name: c.identity, kind: 'subagent', state: 'live',
        detail: 'origin ' + (c.origin || 'grown'), origin: c.origin || 'grown',
        what: 'A composed subagent — the same image as the host, animating a different ontology.' });
    });
    return out;
  }

  /**
   * The Self tree as plain data — the single source both the left-rail tree
   * (server-rendered) and the centre detail view (client-rendered) read from.
   * Root = Self; peer categories beneath it: Faculties (roots ▸ sub-faculties),
   * Cognitive Loops, Subagents, Tools. Every item is tagged origin base|runtime.
   * @returns {object}
   */
  _selfTreeData() {
    var reg = require('./faculties');
    var order = reg.ROOT_ORDER;
    var facs = this.facultyTree();
    var mapF = function (f) {
      return { id: f.id, name: f.name || f.id, what: f.what || '', state: f.state || 'live', origin: f.origin || 'base', parent: f.parent || null, store: f.store || null };
    };
    var subsOf = function (id) { return facs.filter(function (f) { return f.parent === id; }).map(mapF); };
    var roots = facs.filter(function (f) { return !f.parent; }).sort(function (a, b) {
      var ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    }).map(function (r) { var m = mapF(r); m.subs = subsOf(r.id); return m; });
    // Correlate the ten roles onto every faculty; sub-faculties inherit their
    // root's roles unless they play a different one.
    var FAC_ROLES = {
      presence: ['perceive'], memory: ['read', 'write'], relationships: ['read', 'write'], reflection: ['run'],
      executive: ['read', 'act'], initiative: ['act', 'grow'], workspace: ['read', 'write'], horizon: ['perceive', 'act'],
      fabric: ['read'], ideation: ['write'],
      time: ['read'], emotion: ['read', 'write'], 'emotion-regulation': ['run'],
      activity: ['read'], telemetry: ['read'], pulse: ['run'], 'epistemic-review': ['run'],
      'conversational-dynamics': ['perceive', 'express'], 'modality-sensitivity': ['act'], 'digital-motor-skills': ['act'], language: ['express'],
      autogenic: ['grow']
    };
    roots.forEach(function (r) { r.roles = FAC_ROLES[r.id] || []; r.subs.forEach(function (sf) { sf.roles = FAC_ROLES[sf.id] || r.roles; }); });
    var s = this.self || {};
    var self = this;
    // Subagents = the composed Proto children (Relay + any others), plus any
    // the instance declares. Composed children are runtime by nature.
    var subagents = this.children.map(function (c) {
      return { id: c.identity || '?', name: c.identity || '?', what: (c.self && c.self.tagline) || '', state: 'live', origin: 'runtime' };
    }).concat(this._mergeBase([], (s.subagents || [])).filter(function (x) {
      return !self.children.some(function (c) { return (c.identity || '?') === x.id; });
    }));
    var tools = this.capabilityRoster();
    var loops = this.loopRoster();
    var vitals = this.vitalRoster();
    var goals = this.goalRoster();
    var code = this._mergeBase(require('./faculties').BASE_CODE, s.code || []);
    var models = this.modelRoster();
    // Tag list items with the peer they belong to (for breadcrumb + lookup).
    tools.forEach(function (x) { x.peerKey = 'tools'; x.itemKind = 'tool'; x.roles = ['act']; });
    subagents.forEach(function (x) { x.peerKey = 'subagents'; x.itemKind = 'subagent'; x.roles = ['act']; });
    loops.forEach(function (x) { x.peerKey = 'loops'; x.itemKind = 'loop'; x.roles = ['run']; });
    vitals.forEach(function (x) { x.peerKey = 'vitals'; x.itemKind = 'vital'; x.roles = ['read', 'write']; });
    goals.forEach(function (x) { x.peerKey = 'goals'; x.itemKind = 'goal'; x.roles = ['read', 'write']; });
    var _pathLib = require('path');
    code.forEach(function (x) {
      x.peerKey = 'code'; x.itemKind = 'code'; x.roles = ['be', 'grow'];
      x.loc = self._codeLoc(x.name);                 // lines of code (cached read)
      var dir = _pathLib.dirname(x.name || '');       // the containing directory, if nested
      x.parent = (dir && dir !== '.') ? dir : null;
    });
    models.forEach(function (x) { x.peerKey = 'models'; x.itemKind = 'model'; x.roles = ['be']; });
    // Memory = nested episodic envelopes of semantic memories, generated at
    // runtime from discourse + cognition. Envelopes are concentric (inner =
    // most recent) and carry a summary over their important memories.
    var memEnvelopes = (s.memory || []).map(function (env, ei) {
      var eid = env.id || ('env-' + ei);
      var mems = (env.memories || []).map(function (m, mi) {
        return {
          id: m.id || (eid + '-m' + mi),
          name: m.name || m.title || ('Memory ' + (mi + 1)),
          what: m.what || m.content || '',
          source: m.source || 'discourse',       // discourse | cognition
          state: 'live',                          // all memories are runtime; no need to tag each
          envelopeId: eid, peerKey: 'memory', itemKind: 'memory-item'
        };
      });
      return {
        id: eid, name: env.label || env.name || ('Envelope ' + (ei + 1)),
        label: env.label || env.name || ('Envelope ' + (ei + 1)),
        scale: env.scale || '', summary: env.summary || '', when: env.when || '',
        state: 'live', origin: 'runtime', memories: mems
      };
    });
    // Relationships = HOST / COUNTERPART / NETWORK layers of people, each placed
    // on a concentric ring (1 = innermost) by closeness — the same shell shape
    // as episodic memory, applied to people.
    var relLayers = (s.relationships || []).map(function (layer, li) {
      var lid = layer.id || ('layer-' + li);
      var people = (layer.people || []).map(function (pp, pi) {
        return {
          id: pp.id || (lid + '-p' + pi),
          name: pp.name || ('Person ' + (pi + 1)),
          what: pp.notes || pp.what || '',
          relation: pp.relation || '', ring: pp.ring || null, category: pp.category || '',
          state: 'live', layerId: lid, peerKey: 'relationships', itemKind: 'person'
        };
      });
      return { id: lid, name: layer.label || layer.name || lid, label: layer.label || layer.name || lid, role: layer.role || '', state: 'live', people: people };
    });
    // Merge GROWN Relations (addRelation) into their layer — grown people are
    // deletable / annotatable in the Self panel; declared config people aren't.
    // Only GROWN relations merge here — declared people already came from
    // s.relationships above (the base also mirrors them into _relations at
    // boot with origin 'declared'; those must not double-count).
    var byLayerId = {}; relLayers.forEach(function (ly) { byLayerId[ly.id] = ly; });
    (this._relations || []).filter(function (r) { return r.origin === 'grown'; }).forEach(function (r, ri) {
      var lid = r.layer || 'network';
      var ly = byLayerId[lid];
      if (!ly) { ly = { id: lid, name: lid.charAt(0).toUpperCase() + lid.slice(1), label: lid, role: '', state: 'live', people: [] }; byLayerId[lid] = ly; relLayers.push(ly); }
      ly.people.push({ id: r.id || ('grel-' + ri), name: r.person, what: r.notes || '', relation: r.relation || '',
        ring: r.ring || null, category: r.category || '', state: 'live', origin: 'grown', layerId: lid, peerKey: 'relationships', itemKind: 'person' });
    });
    // Attach grown RelationMemories to the person they are about (by name).
    var grownMems = this._relationMemories || [];
    if (grownMems.length) relLayers.forEach(function (ly) {
      (ly.people || []).forEach(function (pp) {
        pp.memories = grownMems.filter(function (m) { return String(m.about || '').toLowerCase() === String(pp.name || '').toLowerCase(); })
          .map(function (m) { return { about: m.about, text: m.text, at: m.at }; });
      });
    });
    // Self-Improvement = the autogenic loop (7 stages), with the agent's
    // Findings placed at the stage they currently sit at. The loop is universal
    // (AUTOGENIC_STAGES); the findings are runtime.
    var findings = (this._findings || []).map(function (f) {
      return {
        id: f.id, name: f.title, what: f.what, state: f.state || 'proposed',
        scope: f.scope || '', stage: f.stage, peerKey: 'self-improvement', itemKind: 'finding'
      };
    });
    var autoStages = require('./faculties').AUTOGENIC_STAGES.map(function (st) {
      return {
        id: st.id, name: st.name, label: st.name, what: st.what, state: 'live',
        findings: findings.filter(function (f) { return f.stage === st.id; })
      };
    });
    // Ontology = the class-level definition of the agent (the ontology IS the
    // agent). It is REFLEXIVE: its contents are every group in the Self, split
    // into Mind (cognitive) and Body (embodiment — the Architecture), plus Self
    // itself; the Ontology class points back at Ontology. Each class cross-links
    // to this agent's live instance of it. Divisions are filled from the peer
    // list below (so it always mirrors the whole Self), then assigned back.
    var ontoClass = function (id, name, what, ref) {
      return { id: id, name: name, what: what, ref: ref || null, state: 'live', peerKey: 'ontology', itemKind: 'onto-class' };
    };
    // The Architecture (the body's running substrate) — class-level, no peer.
    var archClasses = [
      ontoClass('oc-services', 'Services', 'The running services — one Cloud Run service per agent, one shared image.', null),
      ontoClass('oc-datastores', 'Datastores', 'The belief store and session state — Postgres, scoped per agent.', null),
      ontoClass('oc-integrations', 'Integrations', 'External systems the agent reaches — search, voice, external APIs. (The reasoning models are their own part — see Model.)', null),
      ontoClass('oc-ui', 'UI', 'The rendering surface — the five-panel shell, panels and views the agent presents through.', null),
      ontoClass('oc-events', 'Event Model', 'The event backplane — vega-live: WebSocket presence, the tc_bus and SSE streams the agent reacts to and emits on. The physical substrate of the Thalamus (the kernel’s relay/broadcast).', null)
    ];
    var ARCH_ROLES = { 'oc-services': ['be'], 'oc-datastores': ['be'], 'oc-integrations': ['perceive', 'act'], 'oc-ui': ['perceive', 'express'], 'oc-events': ['perceive', 'express'] };
    archClasses.forEach(function (c) { c.roles = ARCH_ROLES[c.id] || ['be']; });
    // Entities — the kinds of being the ontology names: who a Self can be, and
    // who it relates to. The Host is the entity that occupies a Self: usually an
    // Agent, but it can be the Kernel directly, which makes it a Root Agent.
    var entityClasses = [
      ontoClass('oc-host', 'Host', 'The entity that occupies this Self. Usually an Agent — but it can be the Kernel directly, in which case the Host is a Root Agent.', null),
      ontoClass('oc-agent', 'Agent', 'An ontology animated by Proto, running in the shared image. Hosted by another agent, or — at the root — by the Kernel itself. Host and subagents are the same image, animating different ontologies.', null),
      ontoClass('oc-kernel', 'Kernel', 'The invariant subset of the ontology that loads the agent and is its conformance law. When it hosts a Self directly, it is a Root Agent.', null),
      ontoClass('oc-root-agent', 'Root Agent', 'An agent whose Host is the Kernel itself — the base of the hierarchy (e.g. the Agency), with no agent above it.', null),
      ontoClass('oc-counterpart', 'Counterpart', 'The entity the agent is addressing — a user or another agent.', null),
      ontoClass('oc-network', 'Network', 'Entities the Counterpart has told the agent about.', null)
    ];
    // Entities name kinds of being — they are part of the structural schema. Role: define.
    entityClasses.forEach(function (c) { c.roles = ['define']; });
    // Memory systems (shared with the Constitution via _memorySystems); attach
    // this instance's episodic envelopes to the Episodic shell.
    var memSystems = this._memorySystems();
    var episodicSys = memSystems.filter(function (m) { return m.id === 'episodic'; })[0];
    if (episodicSys) { episodicSys.envelopes = memEnvelopes; if (memEnvelopes.length) episodicSys.state = 'live'; }
    // The peer categories beneath Self — mirrors Vega's Self tabs. The five we
    // have base data for are populated; the rest are declared peers (stubs) to
    // be lifted from the fleet subsystem by subsystem.
    var peers = [
      { key: 'personality',      label: 'Personality',      discipline: 'psychology', type: 'personality', state: 'live', note: 'who it is — temperament · disposition · character · motivation · identity', parts: this._personalityParts() },
      { key: 'faculties',        label: 'Faculties',        discipline: 'psychology', type: 'faculties',   state: 'live',    note: 'roots ▸ sub-faculties' },
      { key: 'memory',           label: 'Memory',           discipline: 'psychology', type: 'memory', state: 'live', note: 'the three memory systems — working (read first), episodic and semantic (retrieved on demand)', systems: memSystems },
      { key: 'models',           label: 'Model',            discipline: 'anatomy',    type: 'list', itemKind: 'model', state: models.length ? 'live' : 'planned', note: 'the reasoning substrates the agent runs on — its neural tissue (LLM · LQM · financial · quantum)', items: models, foot: 'Every faculty and cognitive loop runs on the Model — it is the substrate cognition executes on. The LLM is primary; the others cover reasoning it can’t.' },
      { key: 'code',             label: 'Code',             discipline: 'anatomy',    type: 'list', itemKind: 'code', state: code.length ? 'partial' : 'planned', note: 'the source files that implement the ontological classes — the agent’s body is its code', items: code, foot: 'Illustrative — the Proto core. A full build enumerates every source file that carries ontological classes, each linked to the classes it realizes.' },
      { key: 'tools',            label: 'Tools',            discipline: 'anatomy',    type: 'list', itemKind: 'tool',     state: tools.length ? 'live' : 'planned',     note: 'callable tools — each bound to the faculty it serves', items: tools, groupBy: 'faculty' },
      { key: 'subagents',        label: 'Subagents',        discipline: 'anatomy',    type: 'list', itemKind: 'subagent', state: subagents.length ? 'live' : 'planned', note: 'composed agents — same image as the host', items: subagents, foot: 'Every subagent is built into the SAME image as its host — one shared image, the agent selected at runtime (M33_APP). Subagents are not separate builds or deployments; they are the same body animating a different ontology.' },
      { key: 'loops',            label: 'Cognitive Loops',  discipline: 'physiology', type: 'list', itemKind: 'loop',     state: 'partial',                              note: 'three classes — cognitive, metacognitive, motivational', items: loops, groupBy: 'loopClass' },
      { key: 'vitals',           label: 'Vital Signs',      discipline: 'physiology', type: 'list', itemKind: 'vital', state: 'partial', note: 'metrics, health and measurement — the agent’s vital signs', items: vitals },
      { key: 'relationships',    label: 'Relationships',    discipline: 'sociology',  type: 'relationships', state: relLayers.length ? 'live' : 'planned', note: 'host · counterpart · network', layers: relLayers },
      { key: 'self-improvement', label: 'Self-Improvement', discipline: 'ontogeny',   type: 'autogenic', state: findings.length ? 'live' : 'planned', note: 'the autogenic loop — detect → ship → measure', stages: autoStages, findingCount: findings.length, shipped: findings.filter(function (f) { return f.stage === 'ship'; }).length },
      { key: 'ontology',         label: 'Ontologies',       discipline: 'meta',       type: 'ontology', state: 'live', note: 'the class-level definition of the agent — its disciplines', divisions: [] }
    ];
    // The load-path: which Kernel mechanism carries each element into cognition
    // (know = Constitution · read = Working Memory · act = Action Space · run =
    // Background Loops). Turns the four mechanisms into the hubs everything wires
    // through. Faculties + loops also run on the Model (the substrate).
    var LOAD = {
      personality: { via: 'constitution', verb: 'know' }, faculties: { via: 'constitution', verb: 'know' }, ontology: { via: 'constitution', verb: 'know' },
      memory: { via: 'working-memory', verb: 'read' }, relationships: { via: 'working-memory', verb: 'read' }, vitals: { via: 'working-memory', verb: 'read' },
      tools: { via: 'action-space', verb: 'act' }, subagents: { via: 'action-space', verb: 'act' },
      loops: { via: 'background-loops', verb: 'run' }, 'self-improvement': { via: 'background-loops', verb: 'run' }
    };
    peers.forEach(function (p) { if (LOAD[p.key]) p.load = LOAD[p.key]; if (p.key === 'faculties' || p.key === 'loops') p.runsOnModel = true; });
    // The role(s) each category plays (from the ten-verb taxonomy — see Kernel).
    var ROLES_MAP = {
      personality: ['know'], faculties: ['know', 'define'], ontology: ['define'],
      memory: ['read', 'write'], relationships: ['read', 'write'], vitals: ['read', 'write'],
      tools: ['act'], subagents: ['act'], loops: ['run'],
      'self-improvement': ['write', 'grow'], code: ['be', 'grow'], models: ['be']
    };
    peers.forEach(function (p) { if (ROLES_MAP[p.key]) p.roles = ROLES_MAP[p.key]; });
    // Fill Ontology reflexively: its divisions are the DISCIPLINES a living
    // system is described through — each a lens, not a domain. Every group in
    // the Self is placed under one, and Ontology itself points back at itself.
    var pClass = function (p) { return { id: 'oc-' + p.key, name: p.label, what: p.note, ref: p.key, state: p.state, peerKey: 'ontology', itemKind: 'onto-class', roles: (p.roles && p.roles.length) ? p.roles : ['define'] }; };
    var byKey = {}; peers.forEach(function (p) { byKey[p.key] = p; });
    var pick = function (keys) { return keys.map(function (k) { return byKey[k]; }).filter(Boolean).map(pClass); };
    // KERNEL — the invariant loader: the Thalamus (relay) plus the four
    // mechanisms that animate ANY ontology (how the Self loads into cognition).
    // Frozen; kernel-level.
    var kernelClasses = [
      ontoClass('oc-thalamus', 'Thalamus', 'The input relay/gateway — routes what loads into cognition and broadcasts the workspace (thalamocortical “ignition”, Global Workspace Theory). Realized by the Event Model — vega-live, the realtime WebSocket/presence backplane that does the actual relay and broadcast.', null),
      ontoClass('oc-basal-ganglia', 'Basal Ganglia', 'The action gate — go/no-go selection of which action fires among competing options, and gating of what updates working memory. Reward (dopamine) shapes the next choice; the bridge from Drive to action.', null),
      ontoClass('oc-constitution', 'Constitution', 'The static system prompt — what the agent knows it is: identity, disposition, faculty roster, ontology. Loaded once per session. Know · the cortical self-schema.', null),
      ontoClass('oc-working-memory', 'Working Memory', 'Dynamic per-turn context — what is relevant now, retrieved and reassembled each turn: recalled memories, active relationships, goals, affect, time. Read · literally working memory (dorsolateral PFC).', null),
      ontoClass('oc-action-space', 'Action Space', 'What the agent does mid-turn — callable tools and subagent dispatch (delegation). Act · the motor system, action selection in the basal ganglia.', null),
      ontoClass('oc-background-loops', 'Background Loops', 'Autonomous cognition outside the turn — runs on cadence and events, writing to the stores working memory reads. Run · the default mode network at rest (Thinking), hippocampal replay in sleep (Dreaming).', null),
      ontoClass('oc-roles', 'Roles', 'The ten ways any part of the Self is used — 3 inputs (know · read · perceive), 3 outputs (write · act · express), 4 system (run · define · be · grow). Every category tags itself with the roles it plays.', null)
    ];
    kernelClasses.forEach(function (c) { c.divisionId = 'kernel'; });
    // The Kernel parts embody roles: Constitution=know, Working Memory=read,
    // Action Space=act, Background Loops=run; the gates relay (Thalamus) and
    // select (Basal Ganglia).
    var MECH_ROLES = { 'oc-constitution': ['know'], 'oc-working-memory': ['read'], 'oc-action-space': ['act'], 'oc-background-loops': ['run'], 'oc-thalamus': ['perceive', 'express'], 'oc-basal-ganglia': ['act'], 'oc-roles': ['define'] };
    kernelClasses.forEach(function (c) { if (MECH_ROLES[c.id]) c.roles = MECH_ROLES[c.id]; });
    // AGENT ONTOLOGY — the agent's own definition: the five disciplines.
    var divs = [
      { id: 'anatomy',    label: 'Anatomy',    what: 'The structure — the parts the agent is built from, from its reasoning models down to its source code.', classes: archClasses.concat(pick(['models', 'code', 'tools', 'subagents'])) },
      { id: 'physiology', label: 'Physiology', what: 'The functioning — the agent’s running processes and their vital signs.', classes: pick(['loops', 'vitals']) },
      { id: 'psychology', label: 'Psychology', what: 'The mind — how the agent thinks, feels, knows and wants. Personality is its emergent whole.', classes: pick(['personality', 'faculties', 'memory']) },
      { id: 'sociology',  label: 'Sociology',  what: 'Relations — who the agent relates to, and who it can be.', classes: pick(['relationships']).concat(entityClasses) },
      { id: 'ontogeny',   label: 'Ontogeny',   what: 'Growth — how the agent develops itself over time.', classes: pick(['self-improvement']).concat([Object.assign(ontoClass('oc-learning', 'Learning', 'Reward-based learning — outcomes shape future action (basal-ganglia / dopamine). The within-cognition complement to Self-Improvement, which grows the code.', null), { roles: ['grow'] })]) }
    ];
    // A discipline is a lens of the schema — it defines. Role: define.
    divs.forEach(function (dv) { dv.roles = ['define']; dv.classes.forEach(function (c) { c.divisionId = dv.id; }); });
    // CLASS CATALOG (ADR 0014) — the 40 class definitions as browsable cards.
    // State maps onto the shared badge vocabulary: instance→live, procedural→
    // partial, planned→planned; the true ladder word rides in the note.
    var CAT_BADGE = { instance: 'live', procedural: 'partial', planned: 'planned' };
    var catalogClasses = this.classCatalog().map(function (c) {
      return { id: 'cls-' + c.id, name: c.name, ref: null,
        what: c.state + ' · wave ' + c.wave + ' · ' + c.discipline + ' — ' + c.what,
        state: CAT_BADGE[c.state] || 'planned', peerKey: 'ontology',
        itemKind: 'onto-class', divisionId: 'catalog', roles: ['define'] };
    });
    var catCounts = require('./classes').stateCounts(this.classCatalog());
    byKey.ontology.groups = [
      { id: 'kernel', label: 'Kernel', what: 'The invariant loader — the gates (Thalamus, the input relay; Basal Ganglia, the action gate) plus the four mechanisms that animate any ontology. Frozen; changes only through kernel review.', classes: kernelClasses },
      { id: 'agent',  label: 'Agent Ontology', what: 'The agent’s own definition — its five disciplines.', divisions: divs },
      { id: 'catalog', label: 'Class Catalog', what: 'The ' + catCounts.total + ' class definitions populating the base’s kinds (ADR 0014) — ' + catCounts.instance + ' instance · ' + catCounts.procedural + ' procedural · ' + catCounts.planned + ' planned. The state says how each class exists in the running system. The Graph view renders this catalog with its typed relationships.', classes: catalogClasses }
    ];
    // The reflexive node: Ontology contains a node called "Ontology" that points
    // back at itself — the strange loop, surfaced directly under Ontologies.
    byKey.ontology.loop = pClass(byKey.ontology);
    return {
      identity: this.identity || 'Agent',
      tagline: s.tagline || '',
      voice: s.voice || null,
      roots: roots,
      peers: peers,
      roles: require('./faculties').BASE_ROLES
    };
  }

  /**
   * Left rail as a collapsible tree: Self ▸ faculties ▸ sub-faculties. Uses
   * native <details>/<summary> so it collapses with no JS; every node carries
   * data-kind/data-id so the centre-detail script can react to clicks. Runtime
   * sub-faculties get a visible tag so specialisation stands out from base.
   * @returns {string} left-panel HTML (with its own scoped <style>).
   */
  _leftTreeHTML() {
    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var d = this._selfTreeData();
    var dot = function (state) {
      if (!state || state === 'live') return '';
      var c = state === 'planned' ? '#8a93a6' : '#c9a227';
      return '<span class="m33-ftree-dot" style="background:' + c + '" title="' + esc(state) + '"></span>';
    };
    var runtimeTag = function (origin) {
      return origin === 'runtime' ? '<span class="m33-ftree-rt" title="Runtime specialisation">runtime</span>' : '';
    };
    var caret = '<span class="m33-ftree-caret"></span>';
    var leaf = function (kind, f) {
      return '<div class="m33-ftree-node m33-ftree-leaf" data-kind="' + kind + '" data-id="' + esc(f.id) + '">' +
        '<span class="m33-ftree-lbl">' + esc(f.name) + '</span>' + dot(f.state) + runtimeTag(f.origin) + '</div>';
    };
    var branch = function (kind, id, label, state, inner, open) {
      return '<details class="m33-ftree-node m33-ftree-branch" data-kind="' + kind + '" data-id="' + esc(id) + '"' + (open ? ' open' : '') + '>' +
        '<summary>' + caret + '<span class="m33-ftree-lbl">' + esc(label) + '</span>' + dot(state) + '</summary>' +
        '<div class="m33-ftree-kids">' + inner + '</div></details>';
    };
    // The Faculties group: roots ▸ sub-faculties.
    var facultiesGroup = function () {
      var facBody = '';
      for (var i = 0; i < d.roots.length; i++) {
        var r = d.roots[i];
        if (r.subs && r.subs.length) {
          var subs = '';
          for (var j = 0; j < r.subs.length; j++) subs += leaf('subfaculty', r.subs[j]);
          facBody += branch('faculty', r.id, r.name, r.state, subs, false);
        } else {
          facBody += leaf('faculty', r);   // a faculty with no sub-faculties (yet)
        }
      }
      return branch('faculties', '__faculties__', 'Faculties', 'live', facBody, false);
    };
    var emptyLeaf = '<div class="m33-ftree-leaf m33-ftree-empty">— none yet —</div>';
    var rowLeaf = function (row) {
      return '<div class="m33-ftree-leaf m33-ftree-row"><span class="m33-ftree-lbl">' + esc(row.k) + '</span>' +
        '<span class="m33-ftree-rowval" title="' + esc(row.v) + '">' + esc(row.v) + '</span></div>';
    };
    // Each peer category renders under Self by its type, keyed so it can be
    // placed under its discipline section below.
    var nodeByKey = {};
    for (var p = 0; p < d.peers.length; p++) {
      var pc = d.peers[p];
      if (pc.type === 'faculties') { nodeByKey[pc.key] = facultiesGroup(); continue; }
      if (pc.type === 'memory') {
        var sysBody = '';
        pc.systems.forEach(function (sys) {
          if (sys.envelopes) {
            var envBody = '';
            if (sys.envelopes.length) {
              for (var e = 0; e < sys.envelopes.length; e++) {
                var env = sys.envelopes[e];
                var memLeaves = env.memories.length ? env.memories.map(function (m) { return leaf('memory-item', m); }).join('') : emptyLeaf;
                envBody += branch('envelope', env.id, env.label, env.state, memLeaves, false);
              }
            } else { envBody = emptyLeaf; }
            sysBody += branch('mem-system', sys.id, sys.label, sys.state, envBody, false);
          } else {
            sysBody += leaf('mem-system', { id: sys.id, name: sys.label, state: sys.state });
          }
        });
        nodeByKey[pc.key] = branch('peer', pc.key, pc.label, pc.state, sysBody, false);
        continue;
      }
      if (pc.type === 'relationships') {
        var layBody = '';
        if (pc.layers.length) {
          for (var y = 0; y < pc.layers.length; y++) {
            var lay = pc.layers[y];
            var peopleLeaves = lay.people.length ? lay.people.map(function (pp) { return leaf('person', pp); }).join('') : emptyLeaf;
            layBody += branch('rel-layer', lay.id, lay.label, lay.state, peopleLeaves, false);
          }
        } else { layBody = emptyLeaf; }
        nodeByKey[pc.key] = branch('peer', pc.key, pc.label, pc.state, layBody, false);
        continue;
      }
      if (pc.type === 'personality') {
        var partLeaves = pc.parts.map(function (pt) { return leaf('ppart', { id: pt.id, name: pt.label, state: pt.state }); }).join('');
        nodeByKey[pc.key] = branch('peer', pc.key, pc.label, pc.state, partLeaves, false);
        continue;
      }
      if (pc.type === 'autogenic') {
        var stgBody = '';
        for (var t = 0; t < pc.stages.length; t++) {
          var stg = pc.stages[t];
          var fLeaves = stg.findings.length ? stg.findings.map(function (f) { return leaf('finding', f); }).join('') : emptyLeaf;
          stgBody += branch('stage', stg.id, stg.label, stg.state, fLeaves, false);
        }
        nodeByKey[pc.key] = branch('peer', pc.key, pc.label, pc.state, stgBody, false);
        continue;
      }
      if (pc.type === 'ontology') {
        var ontoBody = pc.loop ? leaf('onto-class', pc.loop) : '';   // the reflexive "Ontology" node
        pc.groups.forEach(function (g) {
          var inner = '';
          if (g.classes) {
            inner = g.classes.map(function (c) { return leaf('onto-class', c); }).join('');
          } else if (g.divisions) {
            g.divisions.forEach(function (dv) {
              var classLeaves = dv.classes.length ? dv.classes.map(function (c) { return leaf('onto-class', c); }).join('') : emptyLeaf;
              inner += branch('division', dv.id, dv.label, dv.state, classLeaves, false);
            });
          }
          ontoBody += branch('onto-group', g.id, g.label, null, inner, true);
        });
        nodeByKey[pc.key] = branch('peer', pc.key, pc.label, pc.state, ontoBody, false);
        continue;
      }
      if (pc.type === 'list') {
        var inner = pc.items.length ? pc.items.map(function (it) { return leaf(it.itemKind, it); }).join('') : emptyLeaf;
        nodeByKey[pc.key] = branch('peer', pc.key, pc.label, pc.state, inner, false);
      } else if (pc.type === 'disposition') {
        var rows = pc.rows.map(rowLeaf).join('');
        nodeByKey[pc.key] = branch('peer', pc.key, pc.label, pc.state, rows, false);
      } else { // stub → a clickable leaf that opens its "planned in base" detail
        nodeByKey[pc.key] = '<div class="m33-ftree-node m33-ftree-leaf" data-kind="peer" data-id="' + esc(pc.key) + '">' +
          '<span class="m33-ftree-lbl">' + esc(pc.label) + '</span>' + dot(pc.state) + '</div>';
      }
    }
    // Assemble the tree body: each discipline is a collapsible LEVEL in the
    // hierarchy (Self ▸ discipline ▸ category ▸ items) — the same five
    // disciplines the Ontologies define.
    var DISC_ORDER = ['psychology', 'anatomy', 'physiology', 'sociology', 'ontogeny', 'meta'];
    var DISC_SHORT = { psychology: 'Psychology', anatomy: 'Anatomy', physiology: 'Physiology', sociology: 'Sociology', ontogeny: 'Ontogeny', meta: 'Meta' };
    var body = '';
    DISC_ORDER.forEach(function (disc) {
      var group = '';
      d.peers.forEach(function (pc) { if ((pc.discipline || 'meta') === disc && nodeByKey[pc.key]) group += nodeByKey[pc.key]; });
      if (group) body += branch('discipline', disc, DISC_SHORT[disc] || disc, null, group, true);
    });
    var style = '<style>' +
      '.m33-ftree{font-size:13px;line-height:1.4;padding:4px 2px;}' +
      '.m33-ftree details>summary{list-style:none;}' +
      '.m33-ftree details>summary::-webkit-details-marker{display:none;}' +
      '.m33-ftree summary,.m33-ftree-leaf{display:flex;align-items:center;gap:7px;padding:5px 7px;border-radius:7px;cursor:pointer;user-select:none;color:var(--m33-text,#e6e9f2);}' +
      '.m33-ftree-leaf{color:var(--m33-text-muted,#8a93a6);}' +
      '.m33-ftree summary:hover,.m33-ftree-leaf:hover{background:rgba(255,255,255,0.05);color:var(--m33-text,#e6e9f2);}' +
      '.m33-ftree-node.m33-sel>summary,.m33-ftree-leaf.m33-sel{background:rgba(125,138,255,0.16);color:var(--m33-text,#e6e9f2);box-shadow:inset 2px 0 0 #7d8aff;}' +
      '.m33-ftree-caret{flex:none;width:0;height:0;border-left:5px solid currentColor;border-top:4px solid transparent;border-bottom:4px solid transparent;opacity:.45;transition:transform .12s;}' +
      '.m33-ftree details[open]>summary>.m33-ftree-caret{transform:rotate(90deg);}' +
      '.m33-ftree-kids{margin-left:9px;padding-left:8px;border-left:1px solid rgba(255,255,255,0.08);}' +
      '.m33-ftree-leaf{padding-left:19px;}' +
      '.m33-ftree>.m33-ftree-root>summary>.m33-ftree-lbl{font-weight:600;}' +
      '.m33-ftree-branch>summary>.m33-ftree-lbl{font-weight:600;}' +
      '.m33-ftree-lbl{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.m33-ftree-dot{flex:none;width:6px;height:6px;border-radius:50%;}' +
      '.m33-ftree-rt{flex:none;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#b9a3ff;border:1px solid rgba(125,138,255,0.45);border-radius:4px;padding:0 4px;line-height:1.5;}' +
      '.m33-ftree-node[data-kind="discipline"]>summary>.m33-ftree-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:600;color:var(--m33-text-muted,#8a93a6);}' +
      '.m33-ftree-node[data-kind="discipline"]{margin-top:6px;}' +
      '.m33-ftree-empty{font-style:italic;opacity:.5;cursor:default;}' +
      '.m33-ftree-row{cursor:default;}.m33-ftree-row .m33-ftree-lbl{flex:0 0 auto;font-weight:600;color:var(--m33-text,#e6e9f2);}' +
      '.m33-ftree-rowval{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;opacity:.7;font-size:12px;}' +
      '</style>';
    return style +
      '<div class="m33-ftree" id="m33-ftree">' +
      '<details class="m33-ftree-node m33-ftree-root" data-kind="self" data-id="__self__" open>' +
      '<summary>' + caret + '<span class="m33-ftree-lbl">' + esc(d.identity) + '</span></summary>' +
      '<div class="m33-ftree-kids">' + body + '</div></details></div>';
  }

  /**
   * The centre-detail behaviour: on tree-node click, render a full, tidy detail
   * view of that node (Self / faculty / sub-faculty) into #m33-panel-center,
   * hiding the chat; a breadcrumb returns to Chat or an ancestor. All data comes
   * from _selfTreeData() embedded once. Injected only for self-declaring agents.
   * @returns {string} script markup (empty when no self).
   */
  _selfTreeScript() {
    if (!this.self) return '';
    var data = JSON.stringify(this._selfTreeData());
    return '<script>(function(){\n' +
      'var D=' + data + ';\n' +
      'var byId={};D.roots.forEach(function(r){byId[r.id]=r;(r.subs||[]).forEach(function(s){byId[s.id]=s;});});\n' +
      'var peerByKey={};D.peers.forEach(function(p){peerByKey[p.key]=p;});\n' +
      'var itemsById={};D.peers.forEach(function(p){(p.items||[]).forEach(function(it){itemsById[it.id]=it;});});\n' +
      'var envById={},memById={},memSystemById={};D.peers.forEach(function(p){(p.systems||[]).forEach(function(sys){memSystemById[sys.id]=sys;(sys.envelopes||[]).forEach(function(env){envById[env.id]=env;(env.memories||[]).forEach(function(m){memById[m.id]=m;});});});});\n' +
      'var layerById={},personById={};D.peers.forEach(function(p){(p.layers||[]).forEach(function(l){layerById[l.id]=l;(l.people||[]).forEach(function(pp){personById[pp.id]=pp;});});});\n' +
      'var stageById={},findingById={};D.peers.forEach(function(p){(p.stages||[]).forEach(function(st){stageById[st.id]=st;(st.findings||[]).forEach(function(f){findingById[f.id]=f;});});});\n' +
      'var ppartById={};D.peers.forEach(function(p){(p.parts||[]).forEach(function(pt){ppartById[pt.id]=pt;});});\n' +
      'var divById={},classById={},groupById={};D.peers.forEach(function(p){if(p.self)classById[p.self.id]=p.self;if(p.loop)classById[p.loop.id]=p.loop;(p.groups||[]).forEach(function(g){groupById[g.id]=g;(g.classes||[]).forEach(function(c){classById[c.id]=c;});(g.divisions||[]).forEach(function(dv){divById[dv.id]=dv;(dv.classes||[]).forEach(function(c){classById[c.id]=c;});});});});\n' +
      'function classNav(c){var r=c.ref;if(!r||r===c.peerKey)return{kind:"onto-class",id:c.id};if(r==="faculties")return{kind:"faculties",id:""};if(r==="self")return{kind:"self",id:""};return{kind:"peer",id:r};}\n' +
      'function classCard(c){var nv=classNav(c);return \'<button class="m33-pd-card" data-nav-kind="\'+nv.kind+\'" data-nav-id="\'+esc(nv.id)+\'"><span class="m33-pd-card-top"><span class="m33-pd-card-name">\'+esc(c.name)+\'</span>\'+(c.ref?\'<span class="m33-pd-ref">↗</span>\':"")+\'</span><span class="m33-pd-card-note">\'+esc(c.what)+"</span></button>";}\n' +
      'function esc(x){return String(x==null?"":x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}\n' +
      'var STATE={live:["#57c98a","live"],partial:["#c9a227","partial"],planned:["#8a93a6","planned"]};\n' +
      'var STORE_LABELS={workspace:"Workspace state",sources:"Sources",ideas:"Ideas","turn-state":"Turn state \\u2014 the live conversation register (who is speaking, interruption context)"};\n' +
      'var LIVE_STORES={"turn-state":1};\n' +
      'var GROUP_LABELS={cognitive:"Cognitive",metacognitive:"Metacognitive",motivational:"Motivational"};\n' +
      'var DISC_ORDER=["psychology","anatomy","physiology","sociology","ontogeny","meta"];\n' +
      'var DISC_SHORT={psychology:"Psychology",anatomy:"Anatomy",physiology:"Physiology",sociology:"Sociology",ontogeny:"Ontogeny",meta:"Meta"};\n' +
      'var DISC_DESC={psychology:"The mind — how the agent thinks, feels, knows and wants.",anatomy:"The structure — the parts the agent is built from.",physiology:"The functioning — running processes and vital signs.",sociology:"Relations — who the agent relates to, and who it can be.",ontogeny:"Growth — how the agent develops itself over time.",meta:"The class definitions — the ontology itself."};\n' +
      'function peersIn(disc){return D.peers.filter(function(p){return (p.discipline||"meta")===disc;});}\n' +
      'function peerCard(p){var k=p.type==="faculties"?"faculties":"peer";var id=p.type==="faculties"?"":p.key;return catCard(k,id,p.label,peerNote(p),p.state);}\n' +
      'var MECH={constitution:"Constitution","working-memory":"Working Memory","action-space":"Action Space","background-loops":"Background Loops"};\n' +
      'var VERB={know:"Known — in the constitution",read:"Read — into working memory",act:"Acted — through the action space",run:"Run — in the background"};\n' +
      'function wiring(p){var parts=[];if(p.roles)parts.push(\'Role \\u2014 <button class="m33-pd-link" data-nav-kind="onto-class" data-nav-id="oc-roles">\'+esc(p.roles.join(" · "))+"</button>");var cid="oc-"+p.key;if(classById[cid])parts.push(\'Defined by \\u2192 <button class="m33-pd-link" data-nav-kind="onto-class" data-nav-id="\'+cid+\'">the \'+esc(p.label)+" class</button>");if(p.load)parts.push(VERB[p.load.verb]+\', via <button class="m33-pd-link" data-nav-kind="onto-class" data-nav-id="oc-\'+p.load.via+\'">\'+esc(MECH[p.load.via]||p.load.via)+"</button>");if(p.runsOnModel)parts.push(\'Runs on \\u2192 <button class="m33-pd-link" data-nav-kind="peer" data-nav-id="models">the Model</button>\');if(!parts.length)return"";return section("Wiring")+parts.map(function(x){return \'<p class="m33-pd-body">\'+x+"</p>";}).join("");}\n' +
      'function roleLine(roles){if(!roles||!roles.length)return"";return \'<p class="m33-pd-body">Role \\u2014 <button class="m33-pd-link" data-nav-kind="onto-class" data-nav-id="oc-roles">\'+esc(roles.join(" · "))+"</button></p>";}\n' +
      'function badge(st){var s=STATE[st];if(!s)return \'<span class="m33-pd-badge" style="color:#8a93a6;border-color:#8a93a655;">\'+esc(String(st).replace(/_/g," "))+"</span>";return \'<span class="m33-pd-badge" style="color:\'+s[0]+\';border-color:\'+s[0]+\'55;">\'+s[1]+\'</span>\';}\n' +
      'function origin(o){return o==="runtime"?\'<span class="m33-pd-badge m33-pd-rt">runtime</span>\':\'<span class="m33-pd-badge m33-pd-base">base</span>\';}\n' +
      'function crumb(items){return \'<nav class="m33-pd-crumb">\'+items.map(function(it,i){var sep=i<items.length-1?\'<span class="m33-pd-sep">/</span>\':"";return(it.nav?\'<button class="m33-pd-link" data-nav-kind="\'+it.nav+\'" data-nav-id="\'+(it.id||"")+\'">\'+esc(it.label)+"</button>":\'<span class="m33-pd-here">\'+esc(it.label)+"</span>")+sep;}).join("")+"</nav>";}\n' +
      'function card(kind,f,note){return \'<button class="m33-pd-card" data-nav-kind="\'+kind+\'" data-nav-id="\'+esc(f.id)+\'"><span class="m33-pd-card-top"><span class="m33-pd-card-name">\'+esc(f.name)+\'</span>\'+(f.state&&f.state!=="live"?badge(f.state):"")+\'</span><span class="m33-pd-card-note">\'+esc(note||f.what||"")+\'</span>\'+(f.origin==="runtime"?\'<span class="m33-pd-card-tag">runtime</span>\':"")+"</button>";}\n' +
      'function catCard(kind,id,label,note,state){return \'<button class="m33-pd-card" data-nav-kind="\'+kind+\'" data-nav-id="\'+esc(id)+\'"><span class="m33-pd-card-top"><span class="m33-pd-card-name">\'+esc(label)+\'</span>\'+(state&&state!=="live"?badge(state):"")+\'</span><span class="m33-pd-card-note">\'+esc(note)+"</span></button>";}\n' +
      'function grid(cards){return \'<div class="m33-pd-grid">\'+cards.join("")+"</div>";}\n' +
      'function section(t){return \'<div class="m33-pd-sec">\'+esc(t)+"</div>";}\n' +
      'function counts(){var f=D.roots.length,sub=0,st={live:0,partial:0,planned:0};D.roots.forEach(function(r){st[r.state]=(st[r.state]||0)+1;(r.subs||[]).forEach(function(s){sub++;st[s.state]=(st[s.state]||0)+1;});});return{fac:f,sub:sub,st:st};}\n' +
      'function pill(n,l){return \'<span class="m33-pd-pill"><b>\'+n+"</b> "+esc(l)+"</span>";}\n' +
      'function toolsFor(id){var ts=((peerByKey.tools&&peerByKey.tools.items)||[]).filter(function(t){return t.faculty===id;});return ts.length?section("Acts through — "+ts.length+" "+(ts.length===1?"tool":"tools"))+grid(ts.map(function(t){return card("tool",t,t.what);})):"";}\n' +
      'function loopsFor(id){var ls=((peerByKey.loops&&peerByKey.loops.items)||[]).filter(function(l){return (l.faculties||[]).indexOf(id)>=0;});return ls.length?section("Animates — "+ls.length+" "+(ls.length===1?"loop":"loops"))+grid(ls.map(function(l){return card("loop",l,l.what);})):"";}\n' +
      'function kindLine(lv){var c=lv==="class";return \'<div class="m33-pd-kind\'+(c?" is-class":"")+\'" title="\'+(c?"Class-level definitions \\u2014 the schema every instance conforms to.":"The actual instances created for this agent, constrained by the ontology\\u2019s classes.")+\'">\'+(c?"about classes \\u2014 the definitions":"about instances \\u2014 constrained by the ontology")+"</div>";}\n' +
      'function peerNote(p){return p.type==="faculties"?(D.roots.length+" faculties"):p.type==="list"?(p.items.length+" "+(p.items.length===1?p.itemKind:p.itemKind+"s")):p.note;}\n' +
      'function renderSelf(){var c=counts();var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(D.identity)+"</h1>";h+=kindLine("instance");\n' +
      'if(D.tagline)h+=\'<p class="m33-pd-lede">\'+esc(D.tagline)+"</p>";\n' +
      'h+=\'<div class="m33-pd-pills">\'+pill(c.fac,"faculties")+pill(c.sub,"sub-faculties")+pill(D.peers.length,"self categories")+"</div>";\n' +
      'h+=section("Disciplines");h+=grid(DISC_ORDER.filter(function(disc){return peersIn(disc).length;}).map(function(disc){return catCard("discipline",disc,DISC_SHORT[disc]||disc,DISC_DESC[disc]||"",null);}));\n' +
      'return h;}\n' +
      'function renderDiscipline(disc){var ps=peersIn(disc);var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:DISC_SHORT[disc]||disc}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(DISC_SHORT[disc]||disc)+"</h1>";h+=kindLine("instance");\n' +
      'h+=\'<p class="m33-pd-lede">\'+esc(DISC_DESC[disc]||"")+"</p>";\n' +
      'h+=section(ps.length+" "+(ps.length===1?"category":"categories"));h+=grid(ps.map(peerCard));\n' +
      'return h;}\n' +
      'function renderPeer(p){if(p.type==="faculties")return renderFaculties();if(p.type==="memory")return renderMemory(p);if(p.type==="relationships")return renderRelationships(p);if(p.type==="autogenic")return renderAutogenic(p);if(p.type==="ontology")return renderOntology(p);if(p.type==="personality")return renderPersonality(p);if(p.type==="disposition")return renderDisposition(p);if(p.type==="list")return renderList(p);return renderStub(p);}\n' +
      'function renderPersonality(p){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Personality"}]);\n' +
      'h+=\'<h1 class="m33-pd-title">Personality \'+badge(p.state)+"</h1>";h+=kindLine("instance");\n' +
      'h+=\'<p class="m33-pd-lede">\'+esc(p.note)+" — personality is not one of these; it is the whole, standing coherently across all five.</p>";\n' +
      'h+=roleLine(p.roles||["know"]);\n' +
      'h+=section(p.parts.length+" layers");h+=grid(p.parts.map(function(pt){return catCard("ppart",pt.id,pt.label,pt.note,pt.state);}));\n' +
      'return h;}\n' +
      'function renderPPart(pt){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Personality",nav:"peer",id:"personality"},{label:pt.label}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(pt.label)+" "+badge(pt.state)+"</h1>";\n' +
      'if(pt.note)h+=\'<p class="m33-pd-lede">\'+esc(pt.note)+"</p>";\n' +
      'if(pt.rows&&pt.rows.length){h+=\'<dl class="m33-pd-dl">\'+pt.rows.map(function(r){var v=esc(r.v);if(r.reads)v+=\' <button class="m33-pd-link" data-nav-kind="peer" data-nav-id="\'+esc(r.reads)+\'">\\u2192 reads \'+esc(r.reads)+"</button>";return \'<div class="m33-pd-drow"><dt>\'+esc(r.k)+"</dt><dd>"+v+"</dd></div>";}).join("")+"</dl>";}\n' +
      'return h;}\n' +
      'function renderFaculties(){var c=counts();var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Faculties"}]);\n' +
      'h+=\'<h1 class="m33-pd-title">Faculties</h1>\';h+=kindLine("instance");\n' +
      'h+=\'<p class="m33-pd-lede">The \'+c.fac+" faculties "+esc(D.identity)+" has — the universal roster every agent gets at construction, plus its own runtime specialisations.</p>";\n' +
      'h+=\'<div class="m33-pd-pills">\'+pill(c.fac,"faculties")+pill(c.sub,"sub-faculties")+pill(c.st.live,"live")+(c.st.partial?pill(c.st.partial,"partial"):"")+(c.st.planned?pill(c.st.planned,"planned"):"")+"</div>";\n' +
      'h+=grid(D.roots.map(function(r){return card("faculty",r,(r.subs&&r.subs.length)?(r.subs.length+" sub-faculties"):"core faculty");}));\n' +
      'return h;}\n' +
      'function renderList(p){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:p.label}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(p.label)+" "+badge(p.state)+"</h1>";h+=kindLine("instance");\n' +
      'h+=\'<p class="m33-pd-lede">\'+esc(p.note)+"</p>";\n' +
      'if(p.items.length){if(p.groupBy){var gb=p.groupBy,g={},ord=[];p.items.forEach(function(it){var k=it[gb]||"—";if(!g[k]){g[k]=[];ord.push(k);}g[k].push(it);});ord.forEach(function(k){var lbl=(byId[k]&&byId[k].name)||GROUP_LABELS[k]||k;h+=section(lbl+" · "+g[k].length);h+=grid(g[k].map(function(it){return card(it.itemKind,it,it.what);}));});}else{h+=grid(p.items.map(function(it){return card(it.itemKind,it,it.what);}));}}\n' +
      'else h+=\'<p class="m33-pd-empty">Nothing here yet — this is where \'+esc(p.label.toLowerCase())+" appears once the agent specialises.</p>";\n' +
      'if(p.foot)h+=\'<p class="m33-pd-note">\'+esc(p.foot)+"</p>";\n' +
      'return h;}\n' +
      'function renderDisposition(p){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:p.label}]);\n' +
      'h+=\'<h1 class="m33-pd-title">Disposition</h1>\';h+=kindLine("instance");\n' +
      'h+=\'<p class="m33-pd-lede">How \'+esc(D.identity)+" carries itself — its voice, stance and discipline.</p>";\n' +
      'var secs=[],bySec={};p.rows.forEach(function(r){var sc=r.section||"Voice & stance";if(!bySec[sc]){bySec[sc]=[];secs.push(sc);}bySec[sc].push(r);});\n' +
      'secs.forEach(function(sc){h+=section(sc);h+=\'<dl class="m33-pd-dl">\'+bySec[sc].map(function(r){return \'<div class="m33-pd-drow"><dt>\'+esc(r.k)+(r.state&&r.state!=="live"?" "+badge(r.state):"")+"</dt><dd>"+esc(r.v)+"</dd></div>";}).join("")+"</dl>";});\n' +
      'return h;}\n' +
      'function renderStub(p){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:p.label}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(p.label)+" "+badge(p.state)+"</h1>";h+=kindLine("instance");\n' +
      'h+=\'<p class="m33-pd-lede">\'+esc(p.note)+"</p>";\n' +
      'h+=section("Status");h+=\'<p class="m33-pd-empty">A live subsystem of the Self in the platform (Vega runs this today). Declared here as part of the base Self — being lifted into Proto subsystem by subsystem.</p>\';\n' +
      'return h;}\n' +
      'function renderMemory(p){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Memory"}]);\n' +
      'h+=\'<h1 class="m33-pd-title">Memory \'+badge(p.state)+"</h1>";h+=kindLine("instance");\n' +
      'h+=\'<p class="m33-pd-lede">\'+esc(p.note)+".</p>";\n' +
      'h+=\'<p class="m33-pd-body">Operated over by \\u2192 <button class="m33-pd-link" data-nav-kind="faculty" data-nav-id="memory">the Memory faculty</button>.</p>\';\n' +
      'h+=section(p.systems.length+" systems");h+=grid(p.systems.map(function(sys){return catCard("mem-system",sys.id,sys.label,sys.note,sys.state);}));\n' +
      'return h;}\n' +
      'function renderMemSystem(sys){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Memory",nav:"peer",id:"memory"},{label:sys.label}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(sys.label)+" "+badge(sys.state)+"</h1>";\n' +
      'if(sys.note)h+=\'<p class="m33-pd-lede">\'+esc(sys.note)+"</p>";\n' +
      'h+=roleLine(["write","read"]);\n' +
      'if(sys.retrieval){h+=section("Retrieval");h+=\'<p class="m33-pd-body">\'+esc(sys.retrieval)+(sys.reads?\' \\u2192 <button class="m33-pd-link" data-nav-kind="mem-system" data-nav-id="\'+esc(sys.reads)+\'">\'+esc(sys.reads)+"</button>":"")+"</p>";}\n' +
      'if(sys.anchors){h+=section("Anchors");h+=\'<dl class="m33-pd-dl">\'+sys.anchors.map(function(a){return \'<div class="m33-pd-drow"><dt>\'+esc(a.k)+"</dt><dd>"+esc(a.v)+"</dd></div>";}).join("")+"</dl>";}\n' +
      'if(sys.shells){h+=section("Concentric shells \\u2014 outer summarised, inner detailed");h+=\'<dl class="m33-pd-dl">\'+sys.shells.map(function(sh){return \'<div class="m33-pd-drow"><dt>\'+esc(sh.label)+"</dt><dd>"+esc(sh.grain)+" \\u00b7 "+esc(sh.mode)+"</dd></div>";}).join("")+"</dl>";}\n' +
      'if(sys.envelopes){if(sys.envelopes.length){h+=section(sys.envelopes.length+" episodes (examples)");h+=grid(sys.envelopes.map(function(env){return catCard("envelope",env.id,env.label,env.summary||(env.memories.length+" memories"),env.state);}));}}\n' +
      'else if(!sys.retrieval&&!sys.shells)h+=\'<p class="m33-pd-empty">Forms at runtime as the agent talks and thinks.</p>\';\n' +
      'return h;}\n' +
      'function renderEnvelope(env){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Memory",nav:"peer",id:"memory"},{label:"Episodic",nav:"mem-system",id:"episodic"},{label:env.label}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(env.label)+"</h1>";\n' +
      'if(env.summary)h+=\'<p class="m33-pd-lede">\'+esc(env.summary)+"</p>";\n' +
      'h+=\'<div class="m33-pd-pills">\'+pill(env.memories.length,"semantic memories")+(env.scale?\'<span class="m33-pd-pill">\'+esc(env.scale)+"</span>":"")+(env.when?\'<span class="m33-pd-pill">\'+esc(env.when)+"</span>":"")+"</div>";\n' +
      'h+=roleLine(["write","read"]);\n' +
      'if(env.memories.length){h+=section("Semantic memories");h+=grid(env.memories.map(function(m){return card("memory-item",m,m.what);}));}\n' +
      'else h+=\'<p class="m33-pd-empty">Empty envelope.</p>\';\n' +
      'return h;}\n' +
      'function renderMemoryItem(m){var env=envById[m.envelopeId];var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Memory",nav:"peer",id:"memory"},{label:"Episodic",nav:"mem-system",id:"episodic"}].concat(env?[{label:env.label,nav:"envelope",id:env.id}]:[]).concat([{label:m.name}]));\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(m.name)+" "+badge(m.state)+"</h1>";\n' +
      'if(m.what)h+=\'<p class="m33-pd-lede">\'+esc(m.what)+"</p>";\n' +
      'h+=roleLine(["write","read"]);\n' +
      'h+=section("About");h+=\'<p class="m33-pd-body">A semantic memory, formed at runtime from \'+esc(m.source)+(env?\', held in the <button class="m33-pd-link" data-nav-kind="envelope" data-nav-id="\'+esc(env.id)+\'">\'+esc(env.label)+"</button> episodic envelope.":".")+"</p>";\n' +
      'return h;}\n' +
      'function renderRelationships(p){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Relationships"}]);\n' +
      'h+=\'<h1 class="m33-pd-title">Relationships \'+badge(p.state)+"</h1>";h+=kindLine("instance");\n' +
      'h+=\'<p class="m33-pd-lede">\'+esc(p.note)+" — people and agents on concentric rings by closeness, the same shells as memory.</p>";\n' +
      'h+=\'<p class="m33-pd-body">Operated over by \\u2192 <button class="m33-pd-link" data-nav-kind="faculty" data-nav-id="relationships">the Relationships faculty</button>.</p>\';\n' +
      'if(p.layers.length){h+=section(p.layers.length+" layers");h+=grid(p.layers.map(function(l){return catCard("rel-layer",l.id,l.label,l.role||(l.people.length+" people"),l.state);}));}\n' +
      'else h+=\'<p class="m33-pd-empty">No relationships yet — these form at runtime as the agent learns who it works with.</p>\';\n' +
      'return h;}\n' +
      'function ringPill(pp){return pp.ring?\'<span class="m33-pd-pill">ring \'+esc(pp.ring)+"</span>":"";}\n' +
      'function renderLayer(l){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Relationships",nav:"peer",id:"relationships"},{label:l.label}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(l.label)+"</h1>";\n' +
      'if(l.role)h+=\'<p class="m33-pd-lede">\'+esc(l.role)+"</p>";\n' +
      'h+=\'<div class="m33-pd-pills">\'+pill(l.people.length,l.people.length===1?"person":"people")+"</div>";\n' +
      'h+=roleLine(["read","write"]);\n' +
      'if(l.people.length){h+=section("Members");h+=grid(l.people.map(function(pp){return card("person",pp,pp.relation||pp.what);}));}\n' +
      'else h+=\'<p class="m33-pd-empty">No one in this layer yet.</p>\';\n' +
      'return h;}\n' +
      'function renderPerson(pp){var l=layerById[pp.layerId];var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Relationships",nav:"peer",id:"relationships"}].concat(l?[{label:l.label,nav:"rel-layer",id:l.id}]:[]).concat([{label:pp.name}]));\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(pp.name)+" "+badge(pp.state)+"</h1>";\n' +
      'if(pp.relation)h+=\'<p class="m33-pd-lede">\'+esc(pp.relation)+"</p>";\n' +
      'h+=\'<div class="m33-pd-pills">\'+ringPill(pp)+(pp.category?\'<span class="m33-pd-pill">\'+esc(pp.category)+"</span>":"")+(l?\'<span class="m33-pd-pill">\'+esc(l.label)+"</span>":"")+"</div>";\n' +
      'h+=roleLine(["read","write"]);\n' +
      'if(pp.what){h+=section("Notes");h+=\'<p class="m33-pd-body">\'+esc(pp.what)+"</p>";}\n' +
      'return h;}\n' +
      'function renderOntology(p){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Ontologies"}]);\n' +
      'h+=\'<h1 class="m33-pd-title">Ontologies \'+badge(p.state)+"</h1>";h+=kindLine("class");\n' +
      'h+=\'<p class="m33-pd-lede">\'+esc(p.note)+" — the ontology <b>is</b> the agent. Every agent is defined by an ontology, and that ontology is defined within it: this holds every group in the Self, and the Ontology class points back at itself, so the definition lives inside the thing it defines.</p>";\n' +
      'if(p.loop){h+=section("Itself");h+=grid([classCard(p.loop)]);}\n' +
      'h+=section("Structure");h+=grid(p.groups.map(function(g){return catCard("onto-group",g.id,g.label,g.what,null);}));\n' +
      'return h;}\n' +
      'function renderGroup(gid){var g=groupById[gid];if(!g)return"";var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Ontologies",nav:"peer",id:"ontology"},{label:g.label}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(g.label)+"</h1>";h+=kindLine("class");\n' +
      'h+=\'<p class="m33-pd-lede">\'+esc(g.what||"")+"</p>";\n' +
      'h+=roleLine(["define"]);\n' +
      'if(g.classes){h+=section(g.classes.length+" mechanisms");h+=grid(g.classes.map(classCard));}\n' +
      'else if(g.divisions){h+=section(g.divisions.length+" disciplines");h+=grid(g.divisions.map(function(dv){return catCard("division",dv.id,dv.label,dv.what,null);}));}\n' +
      'return h;}\n' +
      'function renderDivision(dv){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Ontologies",nav:"peer",id:"ontology"},{label:"Agent Ontology",nav:"onto-group",id:"agent"},{label:dv.label}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(dv.label)+"</h1>";h+=kindLine("class");\n' +
      'if(dv.what)h+=\'<p class="m33-pd-lede">\'+esc(dv.what)+"</p>";\n' +
      'h+=roleLine(dv.roles||["define"]);\n' +
      'h+=section(dv.classes.length+" classes");h+=grid(dv.classes.map(classCard));\n' +
      'return h;}\n' +
      'function renderClass(c){var dv=divById[c.divisionId];var cb=[{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Ontologies",nav:"peer",id:"ontology"}];if(c.divisionId==="kernel"){cb.push({label:"Kernel",nav:"onto-group",id:"kernel"});}else if(dv){cb.push({label:"Agent Ontology",nav:"onto-group",id:"agent"});cb.push({label:dv.label,nav:"division",id:dv.id});}cb.push({label:c.name});var h=crumb(cb);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(c.name)+" "+badge(c.state)+"</h1>";h+=kindLine("class");\n' +
      'if(c.what)h+=\'<p class="m33-pd-lede">\'+esc(c.what)+"</p>";\n' +
      'if(c.roles)h+=roleLine(c.roles);\n' +
      'if(c.id==="oc-roles"){["input","output","system"].forEach(function(g){var rs=(D.roles||[]).filter(function(r){return r.group===g;});if(!rs.length)return;h+=section(g);h+=\'<dl class="m33-pd-dl">\'+rs.map(function(r){return \'<div class="m33-pd-drow"><dt>\'+esc(r.name)+"</dt><dd>"+esc(r.what)+"</dd></div>";}).join("")+"</dl>";});return h;}\n' +
      'if(c.ref===c.peerKey){h+=section("The strange loop");h+=\'<p class="m33-pd-body">This is the ontology referring to itself. Every agent is <b>defined by</b> an ontology — and that ontology is <b>defined within</b> the agent, as this node. The definition and the thing defined are one object. That loop is how an agent knows what it is: to read its own Self is to read its ontology, and the ontology contains itself.</p>\';h+=\'<p class="m33-pd-body"><button class="m33-pd-link" data-nav-kind="peer" data-nav-id="ontology">Return to Ontologies \\u2192</button></p>\';return h;}\n' +
      'h+=section("Definition");h+=\'<p class="m33-pd-body">A class in the agent\\u2019s \'+(dv?esc(dv.label):"ontology")+" — the class-level definition.</p>";\n' +
      'if(c.ref){var nv=classNav(c);h+=\'<p class="m33-pd-body"><button class="m33-pd-link" data-nav-kind="\'+nv.kind+\'" data-nav-id="\'+esc(nv.id)+\'">Open this agent\\u2019s \'+esc(c.name)+" \\u2192</button></p>";}\n' +
      'var loads=D.peers.filter(function(p){return p.load&&("oc-"+p.load.via)===c.id;});if(loads.length){h+=section("Loads");h+=grid(loads.map(peerCard));}\n' +
      'if(c.id==="oc-kernel"){h+=\'<p class="m33-pd-body">See \\u2192 <button class="m33-pd-link" data-nav-kind="onto-group" data-nav-id="kernel">the Kernel group</button> — the mechanisms this entity names.</p>\';}\n' +
      'if(c.id==="oc-basal-ganglia"){h+=\'<p class="m33-pd-body">Gates \\u2192 <button class="m33-pd-link" data-nav-kind="onto-class" data-nav-id="oc-action-space">Action Space</button> · drives \\u2192 <button class="m33-pd-link" data-nav-kind="onto-class" data-nav-id="oc-learning">Learning</button>.</p>\';}\n' +
      'if(c.id==="oc-thalamus"){h+=\'<p class="m33-pd-body">Realized by \\u2192 <button class="m33-pd-link" data-nav-kind="onto-class" data-nav-id="oc-events">the Event Model</button> (vega-live).</p>\';}\n' +
      'var REL={"oc-host":"host","oc-counterpart":"counterpart","oc-network":"network"};if(REL[c.id]){h+=\'<p class="m33-pd-body">Instances \\u2192 <button class="m33-pd-link" data-nav-kind="rel-layer" data-nav-id="\'+REL[c.id]+\'">the \'+esc(c.name)+" layer</button> in Relationships.</p>";}\n' +
      'return h;}\n' +
      'function renderAutogenic(p){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Self-Improvement"}]);\n' +
      'h+=\'<h1 class="m33-pd-title">Self-Improvement \'+badge(p.state)+"</h1>";h+=kindLine("instance");\n' +
      'h+=\'<p class="m33-pd-lede">\'+esc(p.note)+" — the closed loop that lets the agent grow its own code. Findings flow through seven stages.</p>";\n' +
      'h+=\'<div class="m33-pd-pills">\'+pill(p.findingCount,"findings")+pill(p.shipped,"shipped")+pill(p.stages.length,"stages")+"</div>";\n' +
      'h+=section("The autogenic loop");h+=grid(p.stages.map(function(st){return catCard("stage",st.id,st.name,st.findings.length?(st.findings.length+" "+(st.findings.length===1?"finding":"findings")):st.what,st.state);}));\n' +
      'return h;}\n' +
      'function renderStage(st){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Self-Improvement",nav:"peer",id:"self-improvement"},{label:st.label}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(st.label)+"</h1>";\n' +
      'if(st.what)h+=\'<p class="m33-pd-lede">\'+esc(st.what)+"</p>";\n' +
      'h+=roleLine(["run"]);\n' +
      'if(st.findings.length){h+=section(st.findings.length+" "+(st.findings.length===1?"finding":"findings")+" here");h+=grid(st.findings.map(function(f){return card("finding",f,f.what);}));}\n' +
      'else h+=\'<p class="m33-pd-empty">No findings at this stage right now.</p>\';\n' +
      'return h;}\n' +
      'function renderFinding(f){var st=stageById[f.stage];var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Self-Improvement",nav:"peer",id:"self-improvement"}].concat(st?[{label:st.label,nav:"stage",id:st.id}]:[]).concat([{label:f.name}]));\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(f.name)+" "+badge(f.state)+"</h1>";\n' +
      'if(f.what)h+=\'<p class="m33-pd-lede">\'+esc(f.what)+"</p>";\n' +
      'h+=\'<div class="m33-pd-pills">\'+(st?\'<span class="m33-pd-pill">\'+esc(st.label)+" stage</span>":"")+(f.scope?\'<span class="m33-pd-pill">\'+esc(f.scope)+"</span>":"")+"</div>";\n' +
      'h+=roleLine(["write","grow"]);\n' +
      'h+=section("Lifecycle");h+=\'<p class="m33-pd-body">A Finding in the autogenic loop\'+(st?\', currently at the <button class="m33-pd-link" data-nav-kind="stage" data-nav-id="\'+esc(st.id)+\'">\'+esc(st.label)+"</button> stage.":".")+" State: "+esc(String(f.state).replace(/_/g,\" \"))+".</p>";\n' +
      'return h;}\n' +
      'function renderFaculty(f){var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Faculties",nav:"faculties"},{label:f.name}]);\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(f.name)+" "+badge(f.state)+" "+origin(f.origin)+"</h1>";\n' +
      'if(f.what)h+=\'<p class="m33-pd-lede">\'+esc(f.what)+"</p>";\n' +
      'h+=roleLine(f.roles);\n' +
      'h+=section("Awareness");h+=\'<p class="m33-pd-body">A faculty is a <b>capability</b> — an awareness the agent thinks <i>with</i>, not a store of data.\'+(f.store?" It is associated with an instance store, which it operates over but does not contain.":"")+"</p>";\n' +
      'if(f.store){var sp=D.peers.filter(function(p){return p.key===f.store;})[0];if(sp)h+=\'<p class="m33-pd-body">Operates over \\u2192 <button class="m33-pd-link" data-nav-kind="peer" data-nav-id="\'+esc(f.store)+\'">\'+esc(sp.label)+"</button></p>";else h+=\'<p class="m33-pd-body">Operates over: \'+esc(STORE_LABELS[f.store]||f.store)+(LIVE_STORES[f.store]?\'\':\' <span style="opacity:.55">(store not yet wired)</span>\')+"</p>";}\n' +
      'h+=toolsFor(f.id);h+=loopsFor(f.id);\n' +
      'if(f.subs&&f.subs.length){h+=section(f.subs.length+" sub-faculties");h+=grid(f.subs.map(function(s){return card("subfaculty",s);}));}\n' +
      'else{h+=section("Sub-faculties");h+=\'<p class="m33-pd-empty">No sub-faculties yet — nothing has specialised this faculty.</p>\';}\n' +
      'return h;}\n' +
      'function renderSub(s){var p=byId[s.parent];var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"},{label:"Faculties",nav:"faculties"}].concat(p?[{label:p.name,nav:"faculty",id:p.id}]:[]).concat([{label:s.name}]));\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(s.name)+" "+badge(s.state)+" "+origin(s.origin)+"</h1>";\n' +
      'if(s.what)h+=\'<p class="m33-pd-lede">\'+esc(s.what)+"</p>";\n' +
      'h+=roleLine(s.roles);\n' +
      'if(s.id==="working")h+=\'<p class="m33-pd-body">Same as \\u2192 <button class="m33-pd-link" data-nav-kind="onto-class" data-nav-id="oc-working-memory">Working Memory</button>, the Kernel mechanism.</p>\';\n' +
      'if(s.store){var ssp=D.peers.filter(function(pp){return pp.key===s.store;})[0];if(ssp)h+=\'<p class="m33-pd-body">Operates over \\u2192 <button class="m33-pd-link" data-nav-kind="peer" data-nav-id="\'+esc(s.store)+\'">\'+esc(ssp.label)+"</button></p>";else h+=\'<p class="m33-pd-body">Operates over: \'+esc(STORE_LABELS[s.store]||s.store)+(LIVE_STORES[s.store]?\'\':\' <span style="opacity:.55">(store not yet wired)</span>\')+"</p>";}\n' +
      'h+=toolsFor(s.id);h+=loopsFor(s.id);\n' +
      'h+=section("About");h+=\'<p class="m33-pd-body">\'+(s.origin==="runtime"?"A runtime specialisation — composed onto ":"A base sub-faculty — ships with every agent under ")+(p?\'<button class="m33-pd-link" data-nav-kind="faculty" data-nav-id="\'+esc(p.id)+\'">\'+esc(p.name)+"</button>":"its faculty")+" at "+(s.origin==="runtime"?"instantiation.":"construction.")+"</p>";\n' +
      'return h;}\n' +
      'function renderItem(it){var p=peerByKey[it.peerKey];var h=crumb([{label:"Chat",nav:"chat"},{label:D.identity,nav:"self"}].concat(p?[{label:p.label,nav:"peer",id:p.key}]:[]).concat([{label:it.name}]));\n' +
      'h+=\'<h1 class="m33-pd-title">\'+esc(it.name)+" "+badge(it.state)+" "+origin(it.origin)+"</h1>";\n' +
      'if(it.what)h+=\'<p class="m33-pd-lede">\'+esc(it.what)+"</p>";\n' +
      'h+=roleLine(it.roles);\n' +
      'if(it.itemKind==="subagent")h+=\'<p class="m33-pd-note">Runs in the same image as the host — the same body, animating a different ontology.</p>\';\n' +
      'if(it.itemKind==="tool"&&it.faculty){var fc=byId[it.faculty];var nk=fc&&fc.parent?"subfaculty":"faculty";h+=section("Serves");h+=\'<p class="m33-pd-body">The effector of \\u2192 <button class="m33-pd-link" data-nav-kind="\'+nk+\'" data-nav-id="\'+esc(it.faculty)+\'">\'+esc(fc?fc.name:it.faculty)+"</button> (faculty). A tool is how a faculty acts.</p>";}\n' +
      'if(it.itemKind==="loop"){var sig=[];if(it.loopClass)sig.push(GROUP_LABELS[it.loopClass]||it.loopClass);if(it.level)sig.push(it.level+"-level");if(it.cadence)sig.push(it.cadence+(it.phase?" · "+it.phase:""));if(it.mode)sig.push(it.mode);h+=\'<div class="m33-pd-pills">\'+sig.map(function(s){return \'<span class="m33-pd-pill">\'+esc(s)+"</span>";}).join("")+"</div>";\n' +
      'if(it.faculties&&it.faculties.length){h+=section("Animated by");h+=grid(it.faculties.map(function(fid){var fc=byId[fid];var nk=fc&&fc.parent?"subfaculty":"faculty";return \'<button class="m33-pd-card" data-nav-kind="\'+nk+\'" data-nav-id="\'+esc(fid)+\'"><span class="m33-pd-card-top"><span class="m33-pd-card-name">\'+esc(fc?fc.name:fid)+\'</span></span><span class="m33-pd-card-note">\'+esc(fc&&fc.parent?"sub-faculty":"faculty")+"</span></button>";}));}}\n' +
      'if(it.itemKind==="code"&&it.implable&&it.implable.length){h+=section("Implements");h+=grid(it.implable.map(function(k){var pp=peerByKey[k];return pp?peerCard(pp):"";}).filter(Boolean));}\n' +
      'return h;}\n' +
      'var center=document.getElementById("m33-panel-center");\n' +
      'var chat=center&&center.querySelector(".m33-chat");\n' +
      'var detail=document.getElementById("m33-proto-detail");\n' +
      'var tree=document.getElementById("m33-ftree");\n' +
      'if(!detail||!tree)return;\n' +
      'function markSel(kind,id){var prev=tree.querySelectorAll(".m33-sel");for(var i=0;i<prev.length;i++)prev[i].classList.remove("m33-sel");var sel=tree.querySelector(\'[data-kind="\'+kind+\'"][data-id="\'+(window.CSS&&CSS.escape?CSS.escape(id):id)+\'"]\');if(sel)sel.classList.add("m33-sel");}\n' +
      'var ITEM={tool:1,subagent:1,loop:1,vital:1,goal:1,code:1,model:1};\n' +
      'function show(kind,id){var html;\n' +
      'if(kind==="self"){html=renderSelf();markSel("self","__self__");}\n' +
      'else if(kind==="faculties"){html=renderFaculties()+wiring(peerByKey.faculties);markSel("faculties","__faculties__");}\n' +
      'else if(kind==="discipline"){html=renderDiscipline(id);markSel("discipline",id);}\n' +
      'else if(kind==="peer"){var pp=peerByKey[id];if(!pp)return;html=renderPeer(pp)+wiring(pp);markSel("peer",id);}\n' +
      'else if(kind==="faculty"){var f=byId[id];if(!f)return;html=renderFaculty(f);markSel("faculty",id);}\n' +
      'else if(kind==="subfaculty"){var s=byId[id];if(!s)return;html=renderSub(s);markSel("subfaculty",id);}\n' +
      'else if(kind==="mem-system"){var ms=memSystemById[id];if(!ms)return;html=renderMemSystem(ms);markSel("mem-system",id);}\n' +
      'else if(kind==="envelope"){var env=envById[id];if(!env)return;html=renderEnvelope(env);markSel("envelope",id);}\n' +
      'else if(kind==="memory-item"){var mm=memById[id];if(!mm)return;html=renderMemoryItem(mm);markSel("memory-item",id);}\n' +
      'else if(kind==="rel-layer"){var ly=layerById[id];if(!ly)return;html=renderLayer(ly);markSel("rel-layer",id);}\n' +
      'else if(kind==="person"){var pn=personById[id];if(!pn)return;html=renderPerson(pn);markSel("person",id);}\n' +
      'else if(kind==="ppart"){var pt=ppartById[id];if(!pt)return;html=renderPPart(pt);markSel("ppart",id);}\n' +
      'else if(kind==="stage"){var sg=stageById[id];if(!sg)return;html=renderStage(sg);markSel("stage",id);}\n' +
      'else if(kind==="finding"){var fd=findingById[id];if(!fd)return;html=renderFinding(fd);markSel("finding",id);}\n' +
      'else if(kind==="onto-group"){html=renderGroup(id);markSel("onto-group",id);}\n' +
      'else if(kind==="division"){var dvv=divById[id];if(!dvv)return;html=renderDivision(dvv);markSel("division",id);}\n' +
      'else if(kind==="onto-class"){var occ=classById[id];if(!occ)return;if(occ.ref&&occ.ref!==occ.peerKey){var nv2=classNav(occ);show(nv2.kind,nv2.id);return;}html=renderClass(occ);markSel("onto-class",id);}\n' +
      'else if(ITEM[kind]){var it=itemsById[id];if(!it)return;html=renderItem(it);markSel(kind,id);}\n' +
      'else return;\n' +
      'detail.innerHTML=\'<div class="m33-pd">\'+html+"</div>";detail.hidden=false;if(chat)chat.style.display="none";detail.scrollTop=0;}\n' +
      'function showChat(){detail.hidden=true;if(chat)chat.style.display="";var prev=tree.querySelectorAll(".m33-sel");for(var i=0;i<prev.length;i++)prev[i].classList.remove("m33-sel");}\n' +
      'detail.addEventListener("click",function(e){var l=e.target.closest("[data-nav-kind]");if(!l)return;var k=l.getAttribute("data-nav-kind");if(k==="chat"){showChat();return;}show(k,l.getAttribute("data-nav-id"));});\n' +
      'tree.addEventListener("click",function(e){var node=e.target.closest(".m33-ftree-node");if(!node)return;var kind=node.getAttribute("data-kind"),id=node.getAttribute("data-id");\n' +
      'if(!kind)return;\n' +
      'if(e.target.closest(".m33-ftree-caret")){if(node.tagName==="DETAILS"){e.preventDefault();node.open=!node.open;}return;}\n' +
      'if(node.tagName==="DETAILS"){e.preventDefault();node.open=true;}\n' +
      'if(kind==="self")show("self");else show(kind,id);});\n' +
      '})();</script>' + this._selfDetailCSS();
  }

  /** Scoped CSS for the centre detail view. */
  _selfDetailCSS() {
    return '<style>' +
      '.m33-proto-detail{position:absolute;inset:0;overflow:auto;background:var(--m33-bg,#0e1016);}' +
      '.m33-panel-center{position:relative;}' +
      '.m33-pd{max-width:760px;margin:0 auto;padding:34px 36px 60px;}' +
      '.m33-pd-crumb{display:flex;flex-wrap:wrap;align-items:center;gap:7px;font-size:12px;color:var(--m33-text-muted,#8a93a6);margin-bottom:18px;}' +
      '.m33-pd-link{background:none;border:0;color:#9aa4ff;cursor:pointer;font:inherit;padding:0;}' +
      '.m33-pd-link:hover{text-decoration:underline;}' +
      '.m33-pd-sep{opacity:.4;}.m33-pd-here{color:var(--m33-text,#e6e9f2);}' +
      '.m33-pd-title{font-size:26px;font-weight:650;margin:0 0 10px;color:var(--m33-text,#e6e9f2);display:flex;align-items:center;gap:10px;flex-wrap:wrap;}' +
      '.m33-pd-lede{font-size:15px;line-height:1.6;color:var(--m33-text-muted,#8a93a6);margin:0 0 18px;}' +
      '.m33-pd-body{font-size:14px;line-height:1.65;color:var(--m33-text,#c9cfe0);margin:0 0 8px;}' +
      '.m33-pd-empty{font-size:14px;color:var(--m33-text-muted,#8a93a6);font-style:italic;}' +
      '.m33-pd-pills{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px;}' +
      '.m33-pd-pill{font-size:12px;color:var(--m33-text-muted,#8a93a6);background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:999px;padding:4px 11px;}' +
      '.m33-pd-pill b{color:var(--m33-text,#e6e9f2);}' +
      '.m33-pd-badge{font-size:11px;text-transform:uppercase;letter-spacing:.05em;border:1px solid;border-radius:5px;padding:1px 7px;font-weight:600;}' +
      '.m33-pd-rt{color:#b9a3ff;border-color:rgba(125,138,255,0.5);}.m33-pd-base{color:#8a93a6;border-color:rgba(255,255,255,0.15);}' +
      '.m33-pd-sec{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--m33-text-muted,#8a93a6);opacity:.7;margin:26px 0 12px;border-top:1px solid rgba(255,255,255,0.07);padding-top:16px;}' +
      '.m33-pd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;}' +
      '.m33-pd-card{position:relative;text-align:left;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:11px;padding:13px 14px;cursor:pointer;color:inherit;font:inherit;display:flex;flex-direction:column;gap:5px;transition:border-color .12s,background .12s;}' +
      '.m33-pd-card:hover{background:rgba(125,138,255,0.08);border-color:rgba(125,138,255,0.4);}' +
      '.m33-pd-card-static{cursor:default;}.m33-pd-card-static:hover{background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.08);}' +
      '.m33-pd-card-top{display:flex;align-items:center;gap:8px;justify-content:space-between;}' +
      '.m33-pd-card-name{font-size:14px;font-weight:600;color:var(--m33-text,#e6e9f2);}' +
      '.m33-pd-card-note{font-size:12px;line-height:1.45;color:var(--m33-text-muted,#8a93a6);}' +
      '.m33-pd-card-tag{position:absolute;top:10px;right:10px;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#b9a3ff;border:1px solid rgba(125,138,255,0.45);border-radius:4px;padding:0 4px;}' +
      '.m33-pd-ref{flex:none;font-size:13px;color:#9aa4ff;opacity:.8;}' +
      '.m33-pd-note{margin:18px 0 0;padding:11px 14px;font-size:12.5px;line-height:1.55;color:var(--m33-text-muted,#8a93a6);background:rgba(125,138,255,0.06);border:1px solid rgba(125,138,255,0.18);border-radius:9px;}' +
      '.m33-pd-kind{display:inline-block;margin:0 0 16px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#9aa4ff;border:1px solid rgba(125,138,255,0.32);border-radius:5px;padding:2px 9px;cursor:help;}' +
      '.m33-pd-kind.is-class{color:#57c98a;border-color:rgba(87,201,138,0.35);}' +
      '.m33-pd-dl{margin:0;display:flex;flex-direction:column;gap:1px;}' +
      '.m33-pd-drow{display:flex;gap:16px;padding:11px 2px;border-top:1px solid rgba(255,255,255,0.06);}' +
      '.m33-pd-drow dt{flex:0 0 130px;font-weight:600;color:var(--m33-text,#e6e9f2);font-size:13px;}' +
      '.m33-pd-drow dd{flex:1 1 auto;margin:0;color:var(--m33-text-muted,#8a93a6);font-size:13px;line-height:1.5;}' +
      '</style>';
  }

  /** Right rail: the agent's self, plainly stated. */
  _defaultRightHTML() {
    var s = this.self || {};
    var live = ((s.faculties) || []).filter(function (f) { return f && f.state === 'live'; }).map(function (f) { return f.name || f.id; });
    return '<div class="m33-block"><h3>' + (this.identity || 'Agent') + '</h3>' +
      '<div style="color:var(--m33-text-muted,#8a93a6);font-size:13px;line-height:1.55;">' + (s.tagline || '') + '</div>' +
      (live.length ? '<div style="margin-top:12px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;opacity:0.55;">Faculties</div><div style="color:var(--m33-text,#e6e9f2);font-size:13px;margin-top:4px;">' + live.join(' · ') + '</div>' : '') +
      '</div>';
  }

  /**
   * A <script> that makes the profile-menu Self item this agent's own: relabels
   * it "{identity} Self" and rewires its click to open the Self panel as a
   * MODAL. The panel itself is basic markup served at /proto/self (ADR 0017) —
   * this only iframes it, so the modal carries a real HTML/CSS/JS view, not an
   * injected escaped-string DOM. Injected only for self-declaring agents, so
   * the existing fleet's Vega-wired menu is left exactly as-is.
   * @returns {string} script markup (empty when no self).
   */
  _selfPanelScript() {
    if (!this.self) return '';
    var payload = {
      title: (this.identity || 'Agent') + ' Self',
      frame: '<iframe src="/proto/self" title="' + (this.identity || 'Agent') + ' Self" ' +
        'style="width:100%;height:78vh;min-height:520px;border:0;border-radius:8px;background:var(--m33-bg,#0e1016);display:block;"></iframe>'
    };
    return '<script>(function(){var P=' + JSON.stringify(payload) + ';' +
      'function open(){if(window.M33&&window.M33.openModal)window.M33.openModal(P.title,function(){return P.frame;},{size:"large"});}' +
      'function wire(){var b=document.querySelector(\'[data-action="vega-self"]\');if(!b)return;' +
      'b.lastChild&&b.lastChild.nodeType===3?(b.lastChild.textContent=P.title):(b.appendChild(document.createTextNode(P.title)));' +
      'var c=b.cloneNode(true);b.parentNode.replaceChild(c,b);' +
      'c.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();' +
      'var m=document.getElementById("m33-profile-menu");if(m){m.setAttribute("aria-hidden","true");m.classList.remove("open");}open();});}' +
      'if(document.readyState!=="loading")wire();else document.addEventListener("DOMContentLoaded",wire);})();</script>';
  }

  /**
   * Render this agent as a full page through the shared 5-panel shell.
   * Default centre = the persona chat; override via opts.centerHTML. An
   * instance with its own view (config.view.render) wins. The host serves
   * the shell static assets (/m33-static) + mounts body() for the routes.
   * @param {object} [opts] renderShell overrides (centerHTML, appNav, …)
   * @returns {string} full-page HTML.
   */
  render(opts) {
    opts = opts || {};
    if (this.view && typeof this.view.render === 'function') return this.view.render(opts);
    var renderShell = require('@mach33/ui').renderShell;
    var chatView = require('./chat-view');
    var shellChrome = require('./shell-chrome');
    var center = opts.centerHTML ||
      chatView.chatCenterHTML({ identity: this.identity, apiBase: opts.apiBase || '' });
    // Self-declaring agents get the node-detail surface: a hidden overlay the
    // tree fills on click (sits over the chat inside the centre panel).
    if (this.self) center += '<section id="m33-proto-detail" class="m33-proto-detail" hidden></section>';
    // The proto-agent header/footer chrome is Proto's, not the instantiation's:
    // launcher + centred global search + Chat/Canvas/Graph + Relay tab + Thalamus
    // footer. The app-name shows its bold first word here; the thin remainder is
    // appended by the chrome's splitter via __M33_APP_KIND__. Callers may still
    // add their own extras (merged, not replaced) or override appName.
    var split = shellChrome.splitName(this.identity || 'Agent');
    var ch = opts.chrome === false ? { headerExtras: '', headExtras: '', bodyExtras: '' }
                                   : shellChrome.chrome({ identity: this.identity });
    return renderShell({
      appName: opts.appName || split.bold,
      appNav: opts.appNav || [],
      leftNav: opts.leftNav || this._defaultLeftNav(),
      // A self-declaring agent renders the Self faculty tree; the fleet keeps leftNav.
      leftHTML: opts.leftHTML || (this.self ? this._leftTreeHTML() : ''),
      centerHTML: center,
      rightHTML: opts.rightHTML || this._defaultRightHTML(),
      footerLeft: opts.footerLeft || ('<span>' + (this.identity || 'Agent') + '</span>'),
      footerRight: opts.footerRight || '',
      headExtras: ch.headExtras + (opts.headExtras || ''),
      headerExtras: ch.headerExtras + (opts.headerExtras || ''),
      bodyExtras: ch.bodyExtras + this._selfPanelScript() + this._selfTreeScript() +
        (this._realtimeBody ? require('./voice/voice-view').voiceRealtimeScript({ identity: this.identity, apiBase: opts.apiBase || '' }) : '') +
        (opts.bodyExtras || ''),
      skin: 'agent',
      user: opts.user || { name: this.identity || 'Agent' },
      theme: 'dark'
    });
  }

  // ── Default assembly (Phase 16) ────────────────────────────────
  //
  // A full agent (one that declares a `self`) gets Relay + a center chat +
  // the shell for free — they are Proto's, not the instantiation's. Each
  // default is guarded: it fires ONLY when the instance declares a self AND
  // hasn't supplied / opted out of that piece, so the existing fleet (which
  // passes no `self`) is completely untouched. Everything here is idempotent.

  /** The composed Relay child, if any (the embedded Commons). */
  get relay() {
    for (var i = 0; i < this.children.length; i++) {
      if (this.children[i] && this.children[i].identity === 'Relay') return this.children[i];
    }
    return null;
  }

  /**
   * Embed Relay (the Commons) as a composed child — idempotent. Every full
   * agent always has Relay; it is a Proto concern, not per-instantiation.
   * Docked+inline by default (host owns the chrome; Relay's trunk renders in
   * the host surface). Opt out with `config.relay === false`. Never throws:
   * if @agents/relay can't be resolved the agent simply runs without it.
   * @returns {Proto|null} the Relay child (existing or newly composed).
   */
  ensureRelay(opts) {
    if (this._config && this._config.relay === false) return null;
    var existing = this.relay;
    if (existing) return existing;
    try {
      // Resolve the IN-TREE package by path FIRST. In the primary checkout
      // this is the same real file the workspace symlink points to (node
      // caches by resolved filename — identical either way). In a secondary
      // checkout (git worktree) the bare specifier walks UP to the parent
      // repo's node_modules and loads the PARENT tree's Relay, whose
      // relative requires load the parent's Proto — a different class
      // identity, so compose()'s instanceof law refuses it. Path-first
      // keeps the whole require graph inside ONE tree.
      var relayMod;
      try {
        relayMod = require(require('path').join(__dirname, '..', '..', 'packages', '@agents', 'relay'));
      } catch (e0) {
        relayMod = require('@agents/relay');
      }
      var createRelay = relayMod.createRelay;
      var relay = createRelay({
        view: (opts && opts.view) || 'docked',
        presentation: (opts && opts.presentation) || 'inline',
        relay: false          // the embed never re-embeds a Relay of its own
      });
      if (relay && !relay.parent) this.compose(relay, { origin: 'inherited', hostContract: {
        authority: ['mount the team-chat routes', 'serve the Commons surface', 'carry presence'],
        mustNot: ['speak as the host', 'write the host\u2019s memory'],
        triggers: ['@relay', 'channel summons']
      } });
      return this.relay;
    } catch (e) {
      // Relay unavailable (package not wired / load error) — never fatal.
      if (process.env.M33_PROTO_DEBUG) {
        console.warn('[proto] ensureRelay skipped for "' + (this.identity || '?') + '":', e && e.message);
      }
      return null;
    }
  }

  // ── Identity helpers ───────────────────────────────────────────

  /**
   * Walk up the composition chain to the topmost ancestor — that's the
   * "host" whose identity gets attributed in publish(). A Proto without
   * a parent IS its own host.
   */
  _hostIdentity() {
    var node = this;
    while (node.parent) node = node.parent;
    return node.identity;
  }

  /** Find an aggregated peer by identity. Returns null if no peer matches. */
  aggregated(identity) {
    for (var i = 0; i < this._aggregated.length; i++) {
      if (this._aggregated[i].identity === identity) return this._aggregated[i];
    }
    return null;
  }

  // ── Composition ────────────────────────────────────────────────

  compose(child, opts) {
    if (!(child instanceof Proto)) {
      throw new TypeError('Proto.compose: argument must be a Proto');
    }
    if (child === this) {
      throw new Error('Proto.compose: cannot compose self');
    }
    if (child.parent) {
      throw new Error('Proto.compose: "' + (child.identity || '?') + '" already has a parent ("' + (child.parent.identity || '?') + '")');
    }
    if (this._aggregated.indexOf(child) > -1) {
      throw new Error('Proto.compose: "' + (child.identity || '?') + '" is already aggregated; compose vs aggregate are mutually exclusive');
    }
    // Optional docking hint: caller may set how the child presents inside
    // this host at compose time (child config already wins if it set its own).
    if (opts && opts.view === 'docked') child.dock();
    else if (opts && opts.view === 'undocked') child.undock({ presentation: opts.presentation });
    this.children.push(child);
    child.parent = this;
    // The paperwork: every composition constructs its Subagent record — a
    // malformed contract dies HERE, at compose, never silently downstream.
    // origin: 'inherited' = the BASE composed it (Relay); 'declared' = the
    // constructor args did; 'grown' = runtime composition (the default).
    this._compositions.push(new (require('./subagent'))({
      identity: child.identity || '(anonymous)',
      host: this.identity || '(anonymous)',
      hostContract: (opts && opts.hostContract) || null,
      origin: (opts && opts.origin) || 'grown'
    }));
    return this;
  }

  // ── View / docking (Phase 14+) ─────────────────────────────────
  //
  // dock()   — flip to docked+inline: the host owns the chrome, sees {trunk}.
  // undock() — flip to undocked+<presentation> (default 'modal'): own chrome.
  // These mutate viewMode/presentation; the view surface is set at
  // construction by the factory and re-derived there.

  dock() {
    this.viewMode = 'docked';
    this.presentation = 'inline';
    return this;
  }

  undock(opts) {
    opts = opts || {};
    this.viewMode = 'undocked';
    this.presentation = opts.presentation || 'modal';
    return this;
  }

  /**
   * Convenience: attach this Proto's body runtime to an Express server.
   * Delegates to body.mount(server, opts) (or legacy body.register).
   * No body → no-op returning null (turn()-based agents have no HTTP body).
   */
  mount(server, opts) {
    if (this.body && typeof this.body.mount === 'function') return this.body.mount(server, opts);
    if (this.body && typeof this.body.register === 'function') return this.body.register(server, opts);
    return null;
  }

  /**
   * Voice-first tier: wire the realtime WS upgrade onto the host's raw
   * http.Server (mount() only covers Express routes; WS upgrades live on the
   * server itself). No-op unless the agent opted into voiceMode 'realtime'.
   */
  attachRealtime(httpServer) {
    if (this._realtimeBody && httpServer) return this._realtimeBody.attach(httpServer);
    return null;
  }

  aggregate(peer) {
    if (!(peer instanceof Proto)) {
      throw new TypeError('Proto.aggregate: argument must be a Proto');
    }
    if (peer === this) {
      throw new Error('Proto.aggregate: cannot aggregate self');
    }
    if (this.children.indexOf(peer) > -1) {
      throw new Error('Proto.aggregate: "' + (peer.identity || '?') + '" is already composed; aggregate vs compose are mutually exclusive');
    }
    if (this._aggregated.indexOf(peer) === -1) this._aggregated.push(peer);
    return this;
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  async dispose() {
    // Background schedules die with the agent.
    (this._loopTimers || []).forEach(function (t) { clearTimeout(t); clearInterval(t); });
    this._loopTimers = [];
    if (this._disposed) return;
    this._disposed = true;

    // Clean up frame subscriptions before children — children may already
    // be unsubscribed when their own dispose runs.
    for (var s = 0; s < this._frameSubs.length; s++) {
      try { this._frameSubs[s](); } catch (_) {}
    }
    this._frameSubs = [];

    var kids = this.children.slice();
    for (var i = 0; i < kids.length; i++) {
      try { await kids[i].dispose(); } catch (_) {}
    }
    this.children = [];
    this._compositions = [];
    this._aggregated = [];

    if (this.parent) {
      var siblings = this.parent.children;
      var idx = siblings.indexOf(this);
      if (idx > -1) siblings.splice(idx, 1);
      this.parent = null;
    }
  }

  get isDisposed() { return this._disposed; }

  // ── Transport ──────────────────────────────────────────────────

  /**
   * Resolve the transport for this Proto. Order of precedence:
   *   1. Injected via constructor (config.transport)
   *   2. Inherited from parent (whoever resolves first up the chain wins)
   *   3. Application registry default (lazy require to avoid module-load cycle)
   */
  _resolveTransport() {
    if (this._transport) return this._transport;
    // Inherit up the composition chain — if a host has a configured
    // transport, every descendant uses it.
    var node = this.parent;
    while (node) {
      if (node._transport) {
        this._transport = node._transport;
        return this._transport;
      }
      node = node.parent;
    }
    // Fallback: the application's MessageBus singleton. Lazy require so
    // a fresh new Proto({}) in a test doesn't drag in the whole wiring.
    var application = require('../system/application');
    this._transport = application.messageBus();
    return this._transport;
  }

  /** Diagnostic accessor — read-only view of the resolved transport. */
  get transport() { return this._transport; }

  // ── Work ───────────────────────────────────────────────────────

  /**
   * Invoke the configured turn function.
   * @param {*} input  per-call input (user message, trigger event, …)
   * @param {object} [ctx]  per-call context
   */
  async turn(input, ctx) {
    if (this._disposed) throw new Error('Proto "' + this.identity + '" is disposed');
    if (!this._turn) {
      throw new Error('Proto "' + (this.identity || '?') + '" has no turn() configured');
    }
    return this._turn.call(this, input, ctx);
  }

  /**
   * Publish a frame. Two call shapes (back-compat is intentional):
   *
   *   publish(kind, payload, scope)   — direct WS publish via transport.
   *                                     `kind` is a string ('message',
   *                                     'reaction', etc.); payload + scope
   *                                     are forwarded to transport.publish.
   *
   *   publish(output)                 — legacy single-arg shape. If the
   *                                     Proto was constructed with a
   *                                     `publish` function in its config,
   *                                     that custom handler runs. Else if
   *                                     the Proto has a parent, the call
   *                                     bubbles UP for host attribution.
   *                                     Else: infer kind='message' from
   *                                     the row shape and publish directly.
   *
   * Every Proto has WS access via the base case — the transport resolves
   * lazily even on a standalone Proto with no parent and no custom handler.
   */
  publish(kindOrOutput, payload, scopeOpts) {
    if (this._disposed) throw new Error('Proto "' + this.identity + '" is disposed');

    // Direct shape: publish(kind, payload, scope) — string + obj + obj.
    if (typeof kindOrOutput === 'string') {
      var transport = this._resolveTransport();
      return transport.publish(kindOrOutput, payload, scopeOpts);
    }

    // Single-arg legacy shape: publish(output).
    var output = kindOrOutput;

    // Custom handler takes precedence — lets the Proto own kind/scope inference.
    if (this._customPublish) {
      return this._customPublish.call(this, output);
    }

    // Bubble UP for host attribution if a parent is in chain.
    if (this.parent) {
      return this.parent.publish(output);
    }

    // Final fallback: treat output as a row-shape message, infer scope.
    // No parent, no custom handler → use base transport directly.
    var transport2 = this._resolveTransport();
    var kind = 'message';
    var scope = (output && output._scope) || { audience: 'all' };
    return transport2.publish(kind, output, scope);
  }

  /**
   * Subscribe this Proto to a frame kind. Returns an unsubscribe function;
   * the subscription is also tracked so dispose() cleans it up. Requires
   * the resolved transport to implement subscribe(kinds, handler).
   *
   * @param {string|string[]} kinds  frame kind(s) to match, or '*' for all
   * @param {(frame) => void} handler
   */
  subscribe(kinds, handler) {
    if (this._disposed) throw new Error('Proto "' + this.identity + '" is disposed');
    var transport = this._resolveTransport();
    if (typeof transport.subscribe !== 'function') {
      throw new Error('Proto "' + this.identity + '": resolved transport does not support subscribe()');
    }
    var unsub = transport.subscribe(kinds, handler);
    this._frameSubs.push(unsub);
    return unsub;
  }

  toString() { return '[Proto ' + (this.identity || '(no id)') + ']'; }
}

module.exports = Proto;
