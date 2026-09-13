// "THE WHOLE OF SCIENCE IS NOTHING MORE THAN A REFINEMENT OF EVERYDAY THINKING."
// — Albert Einstein, "Physics and Reality" (1936).
'use strict';

/**
 * lib/proto/classes.js — the CLASS CATALOG (ADR 0014 working set).
 *
 * The 69 ontology class definitions that populate the base's kinds — the
 * original 40 from the Proto/Vega recon plus 28 admitted by the fleet recon
 * (ADR 0014 §7: Relay/Teams/Live, Newton, Patton, Ironside, MachAgency). This is the Meta discipline made real: the
 * catalog is REGISTRY DATA the agent can read about itself, not a document.
 *
 * Each entry: { id, name, discipline, wave, state, what, fields[] }.
 *
 *   discipline — the lens it belongs to (mirrors the Agent Ontology divisions):
 *     psychology | anatomy | physiology | sociology | ontogeny |
 *     epistemics | documents | meta
 *   wave — build order: 1 (now) · 2 (next) · 3 (later)
 *   state — how the class exists in the RUNNING system (the catalog entry
 *     itself is the declaration — it carries the schema):
 *     planned    — in the catalog only
 *     procedural — the behavior runs, but as plain code; no class instances
 *     instance   — running code genuinely constructs/validates instances
 *
 * EDGES carry the typed relationships between classes (UML vocabulary):
 *     composes — owner ◆ part          isA     — child ▷ parent
 *     assoc    — plain association →   depends — dashed dependency ⇢
 *
 * ANCHORS are classes the base ALREADY has (faculty, drive, vital, …) that
 * catalog edges reference — rendered as context, never re-declared here.
 *
 * Invariant like every base registry (ADR 0012): frozen, ids reserved;
 * instances extend with new ids via registry.register('class', …). State
 * flips are COMMITS — implementation truth changes when code lands.
 *
 * Contents: class definitions.
 * Ontology: Code object M33C-0005 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// Local deepFreeze (not imported from faculties.js): faculties requires
// faculty.js, whose validator requires THIS module — a top-level require
// back into faculties would re-enter it mid-load and read empty exports.
function deepFreeze(o) {
  if (o && typeof o === 'object') { Object.keys(o).forEach(function (k) { deepFreeze(o[k]); }); Object.freeze(o); }
  return o;
}

const DISCIPLINES = [
  { id: 'psychology', name: 'Mind',         what: 'Personality, affect, memory, lived time and ideation — what the agent is like and what it holds in mind.' },
  { id: 'anatomy',    name: 'Body',         what: 'The organs — voice, providers, expressiveness, reflexes, and other agents as composable parts.' },
  { id: 'physiology', name: 'Functioning',  what: 'How the body runs — loops and the telemetry they emit.' },
  { id: 'sociology',  name: 'Relations',    what: 'Who the agent relates to, on concentric rings of closeness.' },
  { id: 'ontogeny',   name: 'Growth',       what: 'How the agent develops itself — findings flowing through the autogenic cycle.' },
  { id: 'epistemics', name: 'Knowledge',    what: 'What the agent believes and why — claims maturing across a gated firewall into the belief graph.' },
  { id: 'documents',  name: 'Work Product', what: 'Knowledge becoming prose — drafts grounded in committed claims, exported as artifacts.' },
  { id: 'meta',       name: 'Meta',         what: 'The ontology describing itself — the class of classes.' }
];

// ── The class definitions (40 founding + 28 fleet-recon, ADR 0014 §7) ──
const BASE_CLASSES = [
  // MIND — psychology (15 + Faculty, promoted from anchor by its conversion)
  { id: 'faculty',        name: 'Faculty',        discipline: 'psychology', wave: 1, state: 'instance',
    what: 'The anatomy of mind — 10 roots and 30 sub-faculties; the catalog\u2019s FIRST reified class: lib/proto/faculty.js constructs and Layer A validates every instance.',
    fields: ['id', 'name', 'what', 'parent (self-composition)', 'state', 'store', 'roles[]'],
    schema: { id: { required: true }, name: { required: true }, what: { required: true },
      parent: {}, state: {}, store: {}, roles: {} } },
  { id: 'trait',          name: 'Trait',          discipline: 'psychology', wave: 2, state: 'instance',
    what: 'A stable disposition of the personality, weighted 0..1.', fields: ['id', 'name', 'value 0..1'],
    schema: { id: { required: true }, name: { required: true }, expression: {}, value: {}, origin: {} } },
  { id: 'value',          name: 'Value',          discipline: 'psychology', wave: 2, state: 'instance',
    what: 'Something the agent holds important, ranked.', fields: ['id', 'name', 'rank'],
    schema: { id: { required: true }, name: { required: true }, commitment: {}, rank: {}, origin: {} } },
  { id: 'goal',           name: 'Goal',           discipline: 'psychology', wave: 2, state: 'instance',
    what: 'A directed intention with a horizon, serving a drive.', fields: ['id', 'name', 'horizon', 'status'],
    schema: { id: { required: true }, name: { required: true }, what: {}, horizon: {}, status: {}, state: {}, origin: {} } },
  { id: 'affect-state',   name: 'AffectState',    discipline: 'psychology', wave: 2, state: 'instance',
    what: 'A felt state on the Russell circumplex — recorded, not performed.', fields: ['mood', 'intensity', 'valence', 'arousal', 'at'],
    schema: { mood: { required: true }, intensity: {}, valence: {}, arousal: {}, at: {}, origin: {} } },
  { id: 'memory-part',    name: 'MemoryPart',     discipline: 'psychology', wave: 2, state: 'instance',
    what: 'A part of working memory — the committee (Baddeley extended): seven parts, each with its own physics; registers live inside parts.', fields: ['id', 'name', 'holds', 'physics', 'consumer', 'lineage'],
    schema: { id: { required: true }, name: { required: true }, holds: {}, physics: {}, consumer: {}, lineage: {} } },
  { id: 'memory-system',  name: 'MemorySystem',   discipline: 'psychology', wave: 2, state: 'instance',
    what: 'One of the three memory systems, reified — kind vocabulary locked (working | episodic | semantic); the three ship as inherited instances; consumers enrich plain projections (the panel attaches envelopes and flips liveness).',
    fields: ['id: working | episodic | semantic', 'label', 'note', 'reads', 'retrieval', 'shells[]'],
    schema: { id: { required: true }, label: { required: true }, note: { required: true },
      state: {}, reads: {}, retrieval: {}, shells: {}, anchors: {} } },
  { id: 'register',       name: 'Register',       discipline: 'psychology', wave: 1, state: 'instance',
    what: 'A working-memory slice held for the current turn — turn-state, the delivery register. Reified: lib/proto/register.js constructs a validated Register each spoken turn (grown, ephemeral).',
    fields: ['id', 'scope: turn', 'fields'],
    schema: { id: { required: true }, scope: { required: true }, fields: { required: true } } },
  { id: 'memory-turn',    name: 'MemoryTurn',     discipline: 'psychology', wave: 1, state: 'instance',
    what: 'One persisted conversation turn — the durable store’s row, reified: lib/proto/memory-turn.js gates every append and re-wraps every read (durable grown instances).',
    fields: ['agent', 'session', 'channel', 'role', 'content', 'at'],
    schema: { agent: { required: true }, session: { required: true }, channel: { required: true },
      role: { required: true }, content: { required: true }, at: {} } },
  { id: 'episode',        name: 'Episode',        discipline: 'psychology', wave: 2, state: 'instance',
    what: 'A rolled-up envelope of turns on a concentric shell — reified: the episodic roll-up loop (the first RUNNING background loop) writes one per day via lib/proto/episode.js.',
    fields: ['ring 1..5', 'period', 'summary', 'turns', 'from', 'to'],
    schema: { agent: { required: true }, scale: { required: true }, period: { required: true },
      summary: { required: true }, ring: {}, turns: {}, from: {}, to: {} } },
  { id: 'session-digest', name: 'SessionDigest',   discipline: 'psychology', wave: 2, state: 'instance',
    what: 'A recognition-grade digest of ONE prior session — the concentric SESSION shell, lifted from Vega and computed AT READ (never stored): opening intent, closing state, turn/spoken counts. Lets recall recognise a past episode without pulling its full history. Sibling axis to Episode’s calendar shells.',
    fields: ['session', 'turns', 'opened', 'closed', 'spoken', 'opening', 'closing'],
    schema: { agent: { required: true }, session: { required: true }, turns: { required: true },
      opened: {}, closed: {}, spoken: {}, opening: {}, closing: {} } },
  { id: 'time-period',    name: 'TimePeriod',     discipline: 'psychology', wave: 2, state: 'instance',
    what: 'A lived span — hour, day, week, month, year — with its summary.', fields: ['kind', 'span', 'summary'],
    schema: { kind: { required: true }, span: { required: true }, mode: {}, summary: {}, label: {}, grain: {} } },
  { id: 'life-profile',   name: 'LifeProfile',    discipline: 'psychology', wave: 2, state: 'instance',
    what: 'The life envelope — birthdate and human-scale benchmarks.', fields: ['birthdate', 'benchmarks'],
    schema: { birthdate: { required: true }, benchmarks: {}, eras: {}, origin: {} } },
  { id: 'life-era',       name: 'LifeEra',        discipline: 'psychology', wave: 2, state: 'instance',
    what: 'A named chapter of the agent’s life.', fields: ['name', 'span'],
    schema: { name: { required: true }, span: {}, events: {}, origin: {} } },
  { id: 'life-event',     name: 'LifeEvent',      discipline: 'psychology', wave: 2, state: 'instance',
    what: 'A moment that matters inside an era.', fields: ['at', 'what'],
    schema: { at: { required: true }, what: { required: true }, origin: {} } },
  { id: 'idea',           name: 'Idea',           discipline: 'psychology', wave: 2, state: 'instance',
    what: 'A provisional object — question, hypothetical, counterfactual or analogy. Never a claim.', fields: ['kind', 'status: provisional'],
    schema: { kind: { required: true }, text: { required: true }, status: {}, at: {}, id: {}, origin: {} } },
  { id: 'manifold-link',  name: 'ManifoldLink',   discipline: 'psychology', wave: 2, state: 'instance',
    what: 'A bridge from an idea to what it touches — including belief.', fields: ['idea', 'target', 'kind'],
    schema: { idea: { required: true }, target: { required: true }, kind: { required: true }, at: {}, origin: {} } },
  { id: 'capability',     name: 'Capability',     discipline: 'psychology', wave: 2, state: 'instance',
    what: 'What a faculty can DO, reified — the Action Space\u2019s unit: 19 base tools as inherited instances; self.tools extensions validate at compose; invocations become ToolExecutions when that wiring lands.',
    fields: ['id', 'name', 'faculty', 'what', 'state'],
    schema: { id: { required: true }, name: { required: true }, faculty: { required: true },
      what: { required: true }, state: {} } },

  // BODY — anatomy (5)
  { id: 'subagent',       name: 'Subagent',       discipline: 'anatomy', wave: 1, state: 'instance',
    what: 'The Composite\u2019s paperwork, reified: an ASSOCIATION record per composition (the child stays a full Proto) — who is inside whom, under what contract. compose() constructs one; instance #1: Relay, contracted.',
    fields: ['identity (the child)', 'host', 'hostContract { authority[], mustNot[], triggers[] }'],
    schema: { identity: { required: true }, host: { required: true }, hostContract: {}, origin: {} } },
  { id: 'code',           name: 'Code',           discipline: 'anatomy', wave: 1, state: 'instance',
    what: 'One source file of the agent\u2019s body, with its IMMUTABLE M33C ref and contents kind (view, mechanism, class definition, \u2026). The body IS its code; the chat window is M33C-0008.', fields: ['ref (immutable)', 'name (path)', 'contents (locked vocabulary)', 'what', 'state'],
    schema: { ref: { required: true }, name: { required: true }, contents: { required: true }, what: {}, implable: {}, state: {} } },
  { id: 'basal-ganglia',  name: 'BasalGanglia',   discipline: 'anatomy', wave: 3, state: 'instance',
    what: 'The action SELECTOR of the cortico-BG-thalamo-cortical loop — the Executive uses it to turn a decision into an action (go/no-go over which capability fires, which faculty engages). The Thalamus relays; the BG selects. Tool selection is now GATED in code (ADR 0016): a narrated-but-unemitted action is caught and forced, each firing recorded on the ledger; faculty routing stays planned.', fields: ['gates[] { id, status, what }', 'status'],
    schema: { gates: { required: true }, status: {} } },
  { id: 'thalamus',       name: 'Thalamus',       discipline: 'anatomy', wave: 3, state: 'instance',
    what: 'The signal trunk (brainstem + thalamus) — the ONE relay all sensor/motor traffic routes through (bar the olfactory kernel bypass); owns the autonomic scheduler. Three rings: in-process, instances (tc_bus), fleet (vega-live). Every agent HAS one.', fields: ['rings[] { id, status, transport }', 'scope'],
    schema: { rings: { required: true }, scope: {} } },
  { id: 'attention',      name: 'Attention',      discipline: 'anatomy', wave: 3, state: 'instance',
    what: 'The attention gate (ADR 0016 §3) — one class, two instances. GATE (in the Thalamus) is exogenous: it decides what gets IN and PROJECTS the prompt head (Vega’s Awareness, lifted as generated projection — each source object renders its own .line(), the gate selects/orders/emits, a reading per field). HELD (in working memory) is endogenous: focus-driven via the Executive, decides what stays ALIVE. The prompt head IS the thalamic projection.',
    fields: ['mode: gate | held', 'seat', 'what'],
    schema: { id: { required: true }, mode: { required: true }, seat: {}, what: {} } },
  { id: 'chat',           name: 'Chat',           discipline: 'anatomy', wave: 1, state: 'instance',
    what: 'The conversational organ — the agent\u2019s mouth-and-ears and the MAIN surface — the primary place a human talks with the host agent (Voice is the same conversation, spoken): model, speech gate, memory binding, prompt surface. NOT Relay (Relay is human-to-human across agents). The mechanism (chat-body) stays procedural; this is the organ, the Voice split applied to chat.', fields: ['model', 'speech', 'memory', 'prompt'],
    schema: { model: {}, speech: {}, memory: {}, prompt: {}, origin: {} } },
  { id: 'voice-organ',    name: 'Voice',          discipline: 'anatomy', wave: 1, state: 'instance',
    what: 'The agent’s larynx — reified: self.voice wraps into a validated Voice instance at assembly (declared origin; all fields optional — the fleet declares different subsets).',
    fields: ['engine: realtime | composed', 'voiceId', 'tone', 'stance', 'length'],
    schema: { voiceId: {}, tone: {}, engine: {}, stance: {}, length: {}, speechRate: {}, accent: {} } },
  { id: 'voice-provider', name: 'VoiceProvider',  discipline: 'anatomy', wave: 1, state: 'instance',
    what: 'A speech vendor seam — reified: the four seams are inherited instances carrying their roles, key env and QUIRKS (the facts learned the hard way, as data).',
    fields: ['id: xai | elevenlabs | deepgram | grok', 'roles: stt | tts | s2s', 'keyEnv', 'quirks'],
    schema: { id: { required: true }, name: { required: true }, roles: { required: true }, keyEnv: {}, quirks: {}, voices: {}, default_voice: {} } },
  { id: 'delivery-mark',  name: 'DeliveryMark',   discipline: 'anatomy', wave: 1, state: 'instance',
    what: 'Stage direction for a line — [[mark]] in the stream, compiled per provider dialect, heard as EXPRESSION. Reified: the twenty-one house marks are constructed DeliveryMark instances (voice/marks.js).',
    fields: ['id (the house word)', 'what (its color)', 'dialects { elevenlabs: [tag] }', 'status: canonical | translated', 'compileFor(provider)'],
    schema: { id: { required: true }, what: { required: true }, dialects: { required: true }, status: {} } },
  { id: 'expression',     name: 'Expression',     discipline: 'anatomy', wave: 1, state: 'instance',
    what: 'The HEARD layer — how a mark renders on a provider/voice: strong, weak, none, untested. The ear-test\u2019s capability boundary as ontology data; 21 base grade records ship with the vessel.',
    fields: ['mark', 'provider', 'renders: strong | weak | none | untested', 'voiceId', 'verifiedBy'],
    schema: { mark: { required: true }, provider: { required: true }, renders: { required: true },
      voiceId: {}, verifiedBy: {}, note: {} } },
  { id: 'reflex-clip',    name: 'ReflexClip',     discipline: 'anatomy', wave: 1, state: 'instance',
    what: 'What the voice says WITHOUT thinking — reified: the three banks construct 43 instances at load (10 yields · 12 fillers · 21 backchannels).',
    fields: ['bank: yield | filler | backchannel', 'phrase', 'ttsText', 'tier', 'fits[]'],
    schema: { bank: { required: true }, phrase: { required: true }, ttsText: {}, tier: {}, fits: {}, audioRef: {} } },

  // FUNCTIONING — physiology (2)
  { id: 'loop-class',     name: 'Loop',           discipline: 'physiology', wave: 1, state: 'instance',
    what: 'The behavioral class, reified: lib/proto/loop.js — bind(handler), run(ctx) with runs/streak/error bookkeeping, report(); the episodic roll-up binds through this contract.',
    fields: ['loopClass', 'cadence', 'phase', 'faculties[]', 'runtime { runs, lastRun, streak }', 'run()', 'report()'],
    schema: { id: { required: true }, name: { required: true }, what: { required: true },
      loopClass: { required: true }, cadence: { required: true },
      level: {}, phase: {}, mode: {}, faculties: {}, state: {} } },
  { id: 'loop-step-class', name: 'LoopStep',     discipline: 'epistemics', wave: 2, state: 'instance',
    what: 'One primitive in the canonical loop — Detection, Commitment, Execution, or Observation. Domain organs bind handlers and tool extensions; the primitive class is invariant.',
    fields: ['primitive: detection | commitment | execution | observation', 'name', 'what', 'toolId?', 'bind()', 'bindTool()', 'run()'],
    schema: { id: { required: true }, primitive: { required: true }, name: { required: true }, what: { required: true },
      toolId: {} } },
  { id: 'canonical-loop-class', name: 'CanonicalLoop', discipline: 'epistemics', wave: 2, state: 'instance',
    what: 'The house epistemic maintenance cycle — four LoopStep primitives in fixed order; cognitive cadence loops schedule when, this loop defines what one revolution does.',
    fields: ['id', 'name', 'what', 'domain?', 'steps { detection, commitment, execution, observation }', 'bindStep()', 'run()', 'report()'],
    schema: { id: { required: true }, name: { required: true }, what: { required: true }, domain: {}, state: {} } },
  { id: 'ravar-step-class', name: 'RaVaRStep', discipline: 'documents', wave: 3, state: 'instance',
    what: 'One primitive in the Declared RaVaR deliverable loop — Render, And, or Verify; Retry is orchestration inside DeclaredRaVaRLoop.run().',
    fields: ['primitive: render | and | verify', 'name', 'what', 'pathId?', 'bind()', 'run()'],
    schema: { id: { required: true }, primitive: { required: true }, name: { required: true }, what: { required: true },
      pathId: {} } },
  { id: 'declared-ravar-loop-class', name: 'DeclaredRaVaRLoop', discipline: 'documents', wave: 3, state: 'instance',
    what: 'The house deliverable production cycle — Render → And → Verify with bounded Retry across declared paths under one durable id (ADR 0045); tool loops, not reasoning loops.',
    fields: ['id', 'name', 'what', 'domain?', 'paths[]', 'max_attempts', 'durable_id_key', 'bindPath()', 'bindVerify()', 'run()', 'report()'],
    schema: { id: { required: true }, name: { required: true }, what: { required: true }, domain: {}, state: {} } },
  { id: 'telemetry-event', name: 'TelemetryEvent', discipline: 'physiology', wave: 2, state: 'instance',
    what: 'One row of the durable replay log — everything the agent does.', fields: ['at', 'kind', 'actor', 'payload'],
    schema: { at: { required: true }, kind: { required: true }, actor: {}, payload: {} } },

  // RELATIONS — sociology (2)
  { id: 'relation',        name: 'Relation',       discipline: 'sociology', wave: 2, state: 'instance',
    what: 'A person on a layer and a closeness ring, reified — layer and ring vocabularies locked (host | counterpart | network; ring 1..5); declared people validate at assembly, addRelation() grows them.',
    fields: ['entityId', 'person', 'layer: host | counterpart | network', 'relation', 'ring 1..5', 'category', 'notes'],
    schema: { person: { required: true }, layer: { required: true }, relation: { required: true },
      ring: { required: true }, entityId: {}, category: {}, notes: {}, tags: {}, origin: {} } },
  { id: 'relation-memory', name: 'RelationMemory', discipline: 'sociology', wave: 2, state: 'instance',
    what: 'A memory attached to a person — about them, or how they relate.', fields: ['text', 'about', 'at'],
    schema: { about: { required: true }, text: { required: true }, at: {}, origin: {} } },

  // GROWTH — ontogeny (2)
  { id: 'finding',         name: 'Finding',        discipline: 'ontogeny', wave: 1, state: 'instance',
    what: 'The autogenic loop\u2019s fuel, reified: declared seeds validate at assembly, fileFinding() grows them at runtime; stage vocabulary locked to the seven AUTOGENIC_STAGES; movement is immutable (advance() returns a new Finding).',
    fields: ['title', 'what', 'stage: detect \u2192 measure', 'state', 'kind: gap | drift | violation', 'scope', 'evidence'],
    schema: { id: {}, title: { required: true }, what: { required: true }, stage: { required: true },
      state: {}, kind: {}, scope: {}, evidence: {}, origin: {} } },
  { id: 'autogenic-cycle', name: 'AutogenicCycle', discipline: 'ontogeny', wave: 2, state: 'instance',
    what: 'One pass of self-modification — a finding carried through the seven stages.', fields: ['finding', 'stage', 'startedAt', 'shippedAt'],
    schema: { finding: { required: true }, stage: { required: true }, startedAt: {}, shippedAt: {}, origin: {} } },

  // KNOWLEDGE — epistemics (9)
  { id: 'session',         name: 'Session',        discipline: 'epistemics', wave: 2, state: 'instance',
    what: 'A bounded working session the decomposition pipeline writes into.', fields: ['id', 'startedAt', 'channel'],
    schema: { id: {}, user: {}, title: {}, channel: {}, opened_at: {}, mandate: {}, workspace: {} } },
  { id: 'proto-claim',     name: 'ProtoClaim',     discipline: 'epistemics', wave: 1, state: 'instance',
    what: 'A raw extraction — what was ASSERTED (a MemoryTurn is what was said; the boundary is deliberate). Reified: mature() bridges into a ClaimEnvelope with provenance chained.',
    fields: ['subject', 'predicate', 'text', 'session', 'source'],
    schema: { subject: { required: true }, predicate: { required: true }, text: { required: true },
      session: {}, source: {}, origin: {} } },
  { id: 'inquiry',         name: 'Inquiry',        discipline: 'epistemics', wave: 1, state: 'instance',
    what: 'An open question held as a tracked node — reified; answer() is immutable movement (the Finding precedent).',
    fields: ['question', 'status: open | answered', 'answeredBy'],
    schema: { question: { required: true }, status: { required: true }, answeredBy: {}, session: {}, origin: {} } },
  { id: 'claim-envelope',  name: 'ClaimEnvelope',  discipline: 'epistemics', wave: 1, state: 'instance',
    what: 'A claim with conviction and provenance — the workspace side of the firewall, reified: κ range-enforced (0..1), meetsFloor() is Draft\u2019s citation gate; promotion (Arc 2) stays a CEREMONY.',
    fields: ['text', 'κ conviction (0..1)', 'speech_act', 'provenance'],
    schema: { text: { required: true }, kappa: { required: true }, speech_act: {}, provenance: {}, session: {}, origin: {} } },
  { id: 'source-quality',  name: 'SourceQuality',  discipline: 'epistemics', wave: 1, state: 'instance',
    what: 'How trustworthy a source is, reified — score range-enforced (0..1) like \u03ba.',
    fields: ['source', 'score (0..1)'],
    schema: { source: { required: true }, score: { required: true } } },
  { id: 'epistemic-node',  name: 'EpistemicNode',  discipline: 'epistemics', wave: 1, state: 'instance',
    what: 'Committed belief, reified — Toulmin-typed, maturity locked to the live FSM vocabulary; THE ANTI-MINTING LAW enforced at construction: no provenance chain, no node. Promotion is a ceremony (promoteEnvelope demands a named approver).',
    fields: ['claimType (Toulmin)', 'maturity: detected \u2192 decayed', 'text', 'greeks (instance-side)', 'provenance (REQUIRED)'],
    schema: { claimType: { required: true }, maturity: { required: true }, text: { required: true },
      provenance: { required: true }, greeks: {}, session: {}, origin: {} } },
  { id: 'epistemic-edge',  name: 'EpistemicEdge',  discipline: 'epistemics', wave: 1, state: 'instance',
    what: 'A typed link in the committed graph, reified — supports | rebuts | qualifies | grounds | refines, vocabulary enforced.',
    fields: ['from', 'to', 'type'],
    schema: { from: { required: true }, to: { required: true }, type: { required: true } } },
  { id: 'epistemic-event', name: 'EpistemicEvent', discipline: 'epistemics', wave: 1, state: 'instance',
    what: 'The audit trail, reified — every transition recorded with its actor; the ceremony\u2019s receipts.',
    fields: ['node', 'transition', 'actor', 'at'],
    schema: { node: { required: true }, transition: { required: true }, actor: {}, at: {} } },
  { id: 'belief-edge',     name: 'BeliefEdge',     discipline: 'epistemics', wave: 1, state: 'instance',
    what: 'A stance between beliefs across the graph, reified.',
    fields: ['from', 'to', 'stance'],
    schema: { from: { required: true }, to: { required: true }, stance: { required: true } } },

  // WORK PRODUCT — documents (3)
  { id: 'draft',             name: 'Draft',            discipline: 'documents', wave: 3, state: 'instance',
    what: 'Prose in progress, grounded in committed claims above a κ floor.', fields: ['kind: tweet | essay | report | whitepaper | paper', 'status', 'body'],
    schema: { kind: { required: true }, body: { required: true }, id: {}, title: {}, status: {}, at: {}, origin: {} } },
  { id: 'editorial-element', name: 'EditorialElement', discipline: 'documents', wave: 3, state: 'instance',
    what: 'A figure, table, equation or callout anchored in a draft.', fields: ['type', 'anchor'],
    schema: { type: { required: true }, anchor: { required: true }, draft: {}, detail: {} } },
  { id: 'artifact',          name: 'Artifact',         discipline: 'documents', wave: 3, state: 'instance',
    what: 'An exported, durable work product.', fields: ['kind', 'uri'],
    schema: { kind: { required: true }, uri: { required: true }, draft: {}, at: {}, origin: {} } },
  { id: 'render-element',    name: 'RenderElement',    discipline: 'documents', wave: 3, state: 'instance',
    what: 'Grammar-typed render unit — leaf type + content + dependency_manifest, or document node pointer for isolation.',
    fields: ['type', 'medium', 'content', 'dependency_manifest', 'document_id', 'node_id'],
    schema: { type: {}, medium: {}, content: {}, dependency_manifest: {}, document_id: {}, node_id: {} } },
  { id: 'render-context',    name: 'RenderContext',    discipline: 'documents', wave: 3, state: 'instance',
    what: 'Host preamble, palette, assets, and page dimensions — content-hashed into render requests.',
    fields: ['document_id', 'preamble', 'palette', 'assets', 'page_width_pt', 'page_height_pt'],
    schema: { document_id: {}, preamble: {}, palette: {}, assets: {}, page_width_pt: {}, page_height_pt: {} } },
  { id: 'render-request',    name: 'RenderRequest',    discipline: 'documents', wave: 3, state: 'instance',
    what: 'Element + context + output spec — ephemeral tool input or persisted on cache miss.',
    fields: ['element', 'context', 'output', 'claim'],
    schema: { element: { required: true }, context: {}, output: { required: true }, claim: {} } },
  { id: 'render-result',     name: 'RenderResult',     discipline: 'documents', wave: 3, state: 'instance',
    what: 'Artifact ref + request_hash + receipt + structured error from RenderService.',
    fields: ['ok', 'request_hash', 'artifact_url', 'artifact_sha256', 'mime', 'renderer_id', 'cache_hit', 'error'],
    schema: { ok: { required: true }, request_hash: {}, artifact_url: {}, artifact_sha256: {}, mime: {}, renderer_id: {}, cache_hit: {}, error: {} } },
  { id: 'element-renderer',  name: 'ElementRenderer',  discipline: 'documents', wave: 3, state: 'procedural',
    what: 'Renderer contract row — registry maps grammar type + format → renderer_id until instances promote.',
    fields: ['renderer_id', 'description', 'formats[]'],
    schema: { renderer_id: { required: true }, description: {}, formats: {} } },
  { id: 'render-artifact',   name: 'RenderArtifact',   discipline: 'documents', wave: 3, state: 'instance',
    what: 'Content-addressed render bytes — composes Artifact at the same request_hash / artifact_url seam.',
    fields: ['request_hash', 'artifact_sha256', 'mime', 'uri', 'renderer_id'],
    schema: { request_hash: { required: true }, artifact_sha256: {}, mime: {}, uri: {}, renderer_id: {} } },

  // META — ontologies (3)
  { id: 'ontology-class',  name: 'OntologyClass',  discipline: 'meta', wave: 3, state: 'instance',
    what: 'The class of classes — this very catalog, as data the agent reads about itself. The strange loop closes.', fields: ['name', 'kind', 'discipline', 'wave', 'state'] },
  { id: 'discipline',      name: 'Discipline',     discipline: 'meta', wave: 3, state: 'instance',
    what: 'A lens the agent is described through — the eight groupings of this catalog.', fields: ['id', 'name', 'what'] },
  { id: 'graph',           name: 'Graph',          discipline: 'meta', wave: 3, state: 'instance',
    what: 'The first-class graph (REQ-graph-first-class P1) — typed nodes + edges PROJECTED from a registered source (a spreadsheet model, this catalog); the standard questions (summary, dependents, precedents, path, cycles, resolve) are class behavior, written once. Sources project in; renderers and tools read out; nothing writes back.',
    fields: ['source', 'nodes[]', 'edges[]: from feeds to; hub edges are display scaffolding'],
    schema: { source: { required: true }, nodes: { required: true }, edges: { required: true } } },
  { id: 'node',            name: 'Node',           discipline: 'meta', wave: 3, state: 'instance',
    what: 'The base EIR Node — a single addressable thing carrying up to four OPTIONAL aspects (syntactic/semantic/numerical/epistemic). Stratum is a description a node carries, not a branch it belongs to (OO-7); Syntactic is a typed record, the others classes (OO-O3). Frozen on construction.',
    fields: ['id', 't', 'syntactic', 'semantic', 'numerical', 'epistemic'],
    schema: { id: { required: true }, t: {}, syntactic: {}, semantic: {}, numerical: {}, epistemic: {} } },
  { id: 'edge',            name: 'Edge',           discipline: 'meta', wave: 3, state: 'instance',
    what: 'The base EIR Edge — a typed directed relation (from FEEDS to, kind names it, ord sequences siblings). Role is edge-borne (X7). Unifies Graph {from,to} and DocumentIR {src,dst}.',
    fields: ['from', 'to', 'kind', 'ord'],
    schema: { from: { required: true }, to: { required: true }, kind: { required: true }, ord: {}, id: {} } },

  // ── Fleet-recon additions (ADR 0014 §7) ─────────────────────────────────
  // Tier 1 — the commons substrate: running in production today, unclassed.
  { id: 'channel',        name: 'Channel',        discipline: 'sociology', wave: 2, state: 'instance',
    what: 'A named room of the Commons — public, private, or a DM; membership is access.', fields: ['name', 'topic', 'visibility: public | private', 'is_dm', 'members[]'],
    schema: { name: { required: true }, visibility: { required: true }, topic: {}, is_dm: {}, is_default: {}, created_by: {} } },
  { id: 'message',        name: 'Message',        discipline: 'sociology', wave: 2, state: 'instance',
    what: 'Operator-to-operator broadcast in a channel — distinct from MemoryTurn (the agent\u2019s own remembered conversation).', fields: ['author', 'body', 'channel', 'kind: user | join | leave | add | remove | call_start | call_end', 'thread_root_id', 'created_at', 'edited_at'],
    schema: { author: { required: true }, body: { required: true }, channel: { required: true }, display_name: {}, kind: {}, thread_root_id: {} } },
  { id: 'message-priority', name: 'MessagePriority', discipline: 'sociology', wave: 2, state: 'instance',
    what: 'ONE CELL of the message priority matrix — a named factor carrying a decimal weight in one of two dimensions: timeline (WHEN a message sits — recency, ordering, cadence) or content (WHAT it says — topic, urgency, subject weight). Operator CONFIGURATION beside Message, not part of it: a Message is a thing somebody said, this is a tunable the ranking reads, the same standing ModelConfig has beside Model. Higher weight = higher priority (the INVERSE of Designation’s ladder), negative demotes, and the default 0 means named-but-not-yet-weighted, therefore inert. Names are unique within a dimension, not across the matrix — "urgency" is a legitimate factor in both.',
    fields: ['type: timeline | content', 'name (unique within its type)', 'weight numeric(8,3), default 0 = inert; negative demotes'],
    schema: { type: { required: true }, name: { required: true }, weight: {}, id: {}, created_at: {}, updated_at: {} } },
  { id: 'membership',     name: 'Membership',     discipline: 'sociology', wave: 2, state: 'instance',
    what: 'Belonging to a container — a channel or a Place; one class, two containers.', fields: ['container: channel | place', 'member: principal | agent', 'added_at'],
    schema: { container: { required: true }, member: { required: true }, container_kind: {} } },
  { id: 'presence',       name: 'Presence',       discipline: 'sociology', wave: 2, state: 'instance',
    what: 'Who is here now — heartbeat rows rolled into online / idle / offline.', fields: ['user_id', 'state: online | idle | offline', 'last_seen_at', 'instance_id'],
    schema: { user: { required: true }, display_name: {}, session: {}, instance: {} } },
  { id: 'summon',         name: 'Summon',         discipline: 'sociology', wave: 2, state: 'instance',
    what: 'An @agent invocation in a channel — handle, principal gate, deterministic session.', fields: ['user', 'agent', 'handle', 'channel', 'session_id (deterministic)'],
    schema: { user: { required: true }, agent: { required: true }, channel: { required: true }, session: { required: true }, handle: {}, thread: {} } },
  { id: 'reaction',       name: 'Reaction',       discipline: 'sociology', wave: 2, state: 'instance',
    what: 'An emoji toggled onto a message, one row per (message, user, emoji).', fields: ['message_id', 'user_id', 'emoji', 'added_at'],
    schema: { message: { required: true }, channel: { required: true }, user: { required: true }, emoji: { required: true } } },
  { id: 'pin',            name: 'Pin',            discipline: 'sociology', wave: 2, state: 'instance',
    what: 'A message flagged into a channel’s shared pinned list — one row per message, any member pins/unpins.', fields: ['message_id', 'channel_id', 'pinned_by', 'created_at'],
    schema: { message: { required: true }, channel: { required: true }, user: { required: true } } },
  { id: 'read-cursor',    name: 'ReadCursor',     discipline: 'sociology', wave: 2, state: 'instance',
    what: 'Per-user unread tracking — everything newer than the cursor is unread.', fields: ['user_id', 'channel_id', 'last_read_at'],
    schema: { user: { required: true }, channel: { required: true }, last_read_at: {} } },
  { id: 'attachment',     name: 'Attachment',     discipline: 'documents', wave: 2, state: 'instance',
    what: 'A file carried by a message — staged, then linked on send.', fields: ['filename', 'content_type', 'size_bytes', 'storage_key (GCS)'],
    schema: { filename: { required: true }, content_type: { required: true }, storage_key: { required: true }, size: {}, channel: {}, user: {} } },
  { id: 'link-preview',   name: 'LinkPreview',    discipline: 'documents', wave: 2, state: 'instance',
    what: 'Cached OG metadata a message body unfurls to.', fields: ['url', 'title', 'description', 'image_url', 'status'],
    schema: { url: { required: true }, status: { required: true }, title: {}, description: {}, image: {}, site: {} } },
  { id: 'call-transcript', name: 'CallTranscript', discipline: 'documents', wave: 2, state: 'instance',
    what: 'One spoken utterance of a call, timestamped from the call start.', fields: ['call_id', 'speaker', 'ts_offset_ms', 'text'],
    schema: { call: { required: true }, channel: { required: true }, speaker: { required: true }, text: { required: true }, ts_offset_ms: {}, speaker_name: {} } },
  { id: 'call-summary',   name: 'CallSummary',    discipline: 'documents', wave: 2, state: 'instance',
    what: 'The post-call meeting card — first writer wins, posted into the channel.', fields: ['call_id', 'channel_id', 'message_id', 'summary'],
    schema: { call: { required: true }, channel: { required: true }, summary: { required: true }, message: {} } },
  { id: 'bus-event',      name: 'BusEvent',       discipline: 'physiology', wave: 2, state: 'instance',
    what: 'The Thalamus\u2019s concrete message — a compact cross-instance NOTIFY; the body is re-fetched downstream.', fields: ['origin: instance_id', 'kind', 'id', 'channel_id'],
    schema: { origin: { required: true }, kind: { required: true }, id: {}, channel_id: {}, message_id: {}, client_msg_id: {} } },

  // Tier 2 — the dynamic + functional models (OMT): unify what is scattered.
  { id: 'lifecycle',      name: 'Lifecycle',      discipline: 'ontogeny', wave: 2, state: 'instance',
    what: 'A first-class state machine — states, legal transitions, triggers; replaces ad-hoc status enums fleet-wide.', fields: ['name', 'states[]', 'initialState', 'transitions { from \u2192 [to] }', 'triggers[]'],
    schema: { id: { required: true }, name: { required: true }, states: { required: true }, initial: {}, transitions: {}, triggers: {} } },
  { id: 'transition-event', name: 'TransitionEvent', discipline: 'physiology', wave: 2, state: 'instance',
    what: 'Emitted by every Lifecycle transition — generalizes EpistemicEvent; replayable audit.', fields: ['lifecycle', 'from', 'to', 'trigger', 'actor', 'evidence', 'at'],
    schema: { lifecycle: { required: true }, from: { required: true }, to: { required: true }, subject: {}, trigger: {}, actor: {}, evidence: {}, at: {}, origin: {} } },
  { id: 'workflow',       name: 'Workflow',       discipline: 'physiology', wave: 2, state: 'instance',
    what: 'A named repeatable process — cadence, owner, steps, human gates.', fields: ['name', 'owner', 'cadence', 'steps[]', 'currentStep', 'gatedOn'],
    schema: { id: { required: true }, name: { required: true }, steps: { required: true }, owner: {}, cadence: {}, currentStep: {}, gatedOn: {} } },
  { id: 'decision',       name: 'Decision',       discipline: 'ontogeny', wave: 2, state: 'instance',
    what: 'A recorded choice — options, trade-offs, chooser, temporal lock; gates workflows.', fields: ['topic', 'options[]', 'tradeoffs', 'chosen', 'owner', 'decidedAt', 'costOfDelay'],
    schema: { topic: { required: true }, chosen: { required: true }, owner: { required: true }, options: {}, tradeoffs: {}, decidedAt: {}, costOfDelay: {}, subject: {}, origin: {} } },
  { id: 'action-item',    name: 'ActionItem',     discipline: 'ontogeny', wave: 2, state: 'instance',
    what: 'An external directive or commitment with an evidence-driven lifecycle — Finding\u2019s outward-facing complement.', fields: ['shape: directive | commitment | task', 'party', 'summary', 'status FSM', 'evidence[]'],
    schema: { summary: { required: true }, shape: {}, party: {}, status: {}, channel: {}, message: {}, source: {}, evidence: {} } },

  // Tier 3 — the agency lifts: load-bearing for MachAgency.
  { id: 'place',          name: 'Place',          discipline: 'anatomy', wave: 3, state: 'instance',
    what: 'A Proto whose identity is the containment — where members work; the container side of the one Composite.', fields: ['identity', 'members[]', 'commons', 'belief_store'],
    schema: { identity: { required: true }, members: { required: true }, commons: {}, belief_store: {} } },
  { id: 'commons',        name: 'Commons',        discipline: 'anatomy', wave: 3, state: 'instance',
    what: 'What a Place holds in common — the Relay child, channels, presence.', fields: ['place', 'relay: Subagent', 'channels[]', 'presence'],
    schema: { place: { required: true }, relay: { required: true }, channels: {}, presence: {} } },
  { id: 'host-contract',  name: 'HostContract',   discipline: 'anatomy', wave: 3, state: 'instance',
    what: 'The containment contract, reified out of Subagent\u2019s field — queryable, negotiated per containment.', fields: ['authority[]', 'mustNot[]', 'triggers[]', 'negotiated_at'],
    schema: { authority: {}, mustNot: {}, triggers: {}, negotiated_at: {} } },
  { id: 'entity',         name: 'Entity',         discipline: 'sociology', wave: 3, state: 'instance',
    what: 'A canonical UUID-addressed named node — person, agent, organization, object, commitment or working set. Owns its finite attention budget; domain records are projections, never competing identities.',
    fields: ['id', 'canonicalName', 'entityType', 'aliases[]', 'status', 'attentionBudget { capacity, committed, spent, remaining, unit }'],
    schema: { id: { required: true }, canonicalName: { required: true }, entityType: { required: true },
      aliases: {}, status: {}, provenance: {}, metadata: {}, attentionBudget: { required: true } } },
  { id: 'entity-attention', name: 'EntityAttention', discipline: 'sociology', wave: 3, state: 'instance',
    what: 'The OTHER Attention — a directed allocation of finite attention between Entity nodes, proved by a canonical artifact. Giving and getting both tax the participants; no owner and no artifact are refused.',
    fields: ['id', 'sourceEntityId', 'ownerEntityId', 'kind', 'state', 'amount', 'strength', 'artifactObservationId', 'proposalId', 'claim', 'timestamps'],
    schema: { id: { required: true }, sourceEntityId: { required: true }, ownerEntityId: { required: true },
      kind: { required: true }, state: { required: true }, artifactObservationId: { required: true },
      claim: { required: true }, proposalId: {}, amount: {}, strength: {}, createdAt: {}, acceptedAt: {},
      lastEvidenceAt: {}, dischargedAt: {} } },
  { id: 'attention-claim', name: 'AttentionClaim', discipline: 'sociology', wave: 3, state: 'instance',
    what: 'WHAT KIND of demand a unit on an attention surface is — the typing an allocation cannot carry. Mail sorts asks from noise, contacts reads a posture, calendar reads a time claim; one module owns all five vocabularies so the surfaces cannot drift. Most claims are a judgement and are stored, superseded rather than overwritten; a contact posture is a function of the live ledger and is DERIVED, because a stored copy is false the moment an edge discharges. A claim never acts — but a quiet one (nonsense, noise) suppresses its allocation, which is how the finite budget stops paying for junk.',
    fields: ['id', 'surface: mail | contacts | calendar | chat | video', 'unit', 'unitId', 'ownerEntityId', 'subjectEntityId', 'claimType', 'assignedBy: model | operator | derived', 'confidence', 'rationale', 'artifactObservationId', 'createdAt', 'supersededAt'],
    schema: { surface: { required: true }, unitId: { required: true }, ownerEntityId: { required: true },
      claimType: { required: true }, assignedBy: { required: true }, id: {}, subjectEntityId: {},
      confidence: {}, rationale: {}, artifactObservationId: {}, createdAt: {}, supersededAt: {} } },
  { id: 'principal',      name: 'Principal',      discipline: 'sociology', wave: 3, state: 'instance',
    what: 'A human authentication identity — one projection of a Person Entity, orthogonal to agent identity.', fields: ['entityId', 'email', 'name', 'provider', 'role', 'permissions[]'],
    schema: { email: { required: true }, name: { required: true }, entityId: {}, provider: {}, role: {}, permissions: {}, enabled: {} } },
  { id: 'designation',    name: 'Designation',    discipline: 'sociology', wave: 3, state: 'instance',
    what: 'The organisational rank a Principal carries — Founder, CEO, Senior Developer. Orthogonal to BOTH of the other things hanging off a user: role is the authority gate (admin | user) and permissions are the capability scopes; a designation orders the org chart and opens no door. Weight is seniority with LOWER more senior (Founder = 0) and is deliberately non-unique — peers share one. Retired by archiving, never by deletion, so the rank stays readable for the people who held it.',
    fields: ['name', 'weight (0 = most senior; peers share)', 'status: active | archived'],
    schema: { name: { required: true }, weight: { required: true }, status: {}, id: {}, created_at: {}, updated_at: {} } },
  { id: 'auth-session',   name: 'AuthSession',    discipline: 'sociology', wave: 3, state: 'instance',
    what: 'A login — distinct from the epistemic Session.', fields: ['user', 'token_hash', 'expires_at', 'last_seen_at'],
    schema: { user: { required: true }, token_hash: { required: true }, expires_at: { required: true }, user_agent: {}, ip: {} } },
  { id: 'passkey-credential', name: 'PasskeyCredential', discipline: 'sociology', wave: 3, state: 'instance',
    what: 'A WebAuthn authenticator enrolled against a Principal — a durable public key that MINTS logins, where an AuthSession IS one login. Not a provider: it hangs off the identity the user already has, beside password_hash. Holds the clone gate (a signature counter that fails to advance).',
    fields: ['user', 'credential_id (base64url)', 'public_key (COSE bytes)', 'counter', 'transports[]', 'device_type: singleDevice | multiDevice', 'rp_id', 'nickname'],
    schema: { user: { required: true }, credential_id: { required: true }, public_key: { required: true }, nickname: { required: true }, rp_id: { required: true }, counter: {}, transports: {}, device_type: {}, backed_up: {}, aaguid: {}, id: {}, created_at: {}, last_used_at: {} } },
  { id: 'epistemic-scope', name: 'EpistemicScope', discipline: 'epistemics', wave: 3, state: 'instance',
    what: 'The scope axis of belief — session \u2192 agent \u2192 agency, plus the Principal-global scope shared by every app and agent serving one user.', fields: ['scope_type: session | agent | agency | principal', 'scope_id', 'parent_scope'],
    schema: { scope_type: { required: true }, scope_id: { required: true }, parent_scope: {}, origin: {} } },
  { id: 'corroboration',  name: 'Corroboration',  discipline: 'epistemics', wave: 3, state: 'instance',
    what: 'Cross-source agreement reified — two members reporting one belief independently.', fields: ['method: cross_source', 'canonical', 'absorbed[]', 'confidence'],
    schema: { method: { required: true }, canonical: { required: true }, absorbed: { required: true }, confidence: {}, at: {}, origin: {} } },
  { id: 'institutional-belief', name: 'InstitutionalBelief', discipline: 'epistemics', wave: 3, state: 'instance',
    what: 'Agency-level belief with a grounding chain back to member work — never minted from nothing.', fields: ['agency', 'belief', 'grounding[] (member, belief, at)', 'confidence'],
    schema: { agency: { required: true }, belief: { required: true }, grounding: { required: true }, confidence: {}, approvedBy: {}, at: {}, origin: {} } },

  // Recon admissions (Boole + Vega second pass, 2026-07-06) — the four
  // that clear the base admission rule; everything else from those sweeps
  // is an instance extension.
  { id: 'tool-execution', name: 'ToolExecution',  discipline: 'physiology', wave: 2, state: 'instance',
    what: 'A record of one tool invocation — input, output, duration, audit; Boole models it fully today, the base constructs them when tools-in-chat lands.',
    fields: ['tool', 'input', 'output', 'ok', 'duration_ms', 'session'],
    schema: { tool: { required: true }, ok: { required: true }, input: {}, output: {}, duration_ms: {}, error: {}, session: {}, at: {}, origin: {} } },
  { id: 'prompt',         name: 'Prompt',         discipline: 'documents', wave: 3, state: 'instance',
    what: 'The assembled system prompt as an OBJECT — one per surface (chat/voice), composed of ordered PromptBlocks and generated each turn (rule 11). render() is the only thing sent to the model; nothing is hand-concatenated. Replaces the string the Constitution used to be.',
    fields: ['surface: chat | voice | shared', 'blocks: PromptBlock[]', 'identity'],
    schema: { surface: { required: true }, blocks: { required: true }, identity: {} } },
  { id: 'prompt-block',   name: 'PromptBlock',    discipline: 'documents', wave: 3, state: 'instance',
    what: 'One ordered section of a Prompt, a COMPOSITE — a leaf renders its own content (persona, rules, tools) or a composite orders child blocks (the working-memory block ◆ one child per live part). ontology-locked blocks guard the Constitution; live blocks regenerate each turn.',
    fields: ['key', 'kind', 'order', 'surface: chat | voice | shared', 'ontology_locked', 'content (leaf)', 'children (composite)', 'header', 'footer'],
    schema: { key: { required: true }, kind: {}, order: {}, surface: {}, ontology_locked: {}, content: {}, children: {}, header: {}, footer: {}, version: {} } },
  { id: 'vital',          name: 'Vital',          discipline: 'physiology', wave: 1, state: 'instance',
    what: 'A health metric of the agent — the five base signals every agent is measured by; promoted from the vital anchor (the Faculty precedent).', fields: ['id', 'name', 'what', 'state', 'value'],
    schema: { id: { required: true }, name: { required: true }, what: {}, state: {}, value: {}, origin: {} } },
  { id: 'model',          name: 'Model',          discipline: 'anatomy', wave: 1, state: 'instance',
    what: 'A cognition organ — the substrate roster (LLM realized by Claude, LQM, Financial, Quantum); anatomy, distinct from meta ModelConfig (accounting).', fields: ['id', 'name', 'what', 'state', 'realizedBy'],
    schema: { id: { required: true }, name: { required: true }, what: {}, state: {}, realizedBy: {}, origin: {} } },
  { id: 'model-config',   name: 'ModelConfig',    discipline: 'meta', wave: 3, state: 'instance',
    what: 'The fleet\u2019s model registry — provider, family, pricing per Mtok; what invocations are costed against.',
    fields: ['model_id', 'provider', 'family', 'prices { in, out, cache }'],
    schema: { model_id: { required: true }, provider: { required: true }, family: {}, prices: {}, origin: {} } },
  { id: 'sync-cursor',    name: 'SyncCursor',     discipline: 'physiology', wave: 3, state: 'instance',
    what: 'The Horizon faculty\u2019s heartbeat, generalized — per-source ingestion state (calendar, mailbox, Slack, Fireflies are four realizations of this one pattern).',
    fields: ['source', 'cursor', 'last_synced_at', 'ingested', 'last_error', 'consecutive_errors'],
    schema: { source: { required: true }, cursor: {}, last_synced_at: {}, ingested: {}, last_error: {}, consecutive_errors: {}, origin: {} } },

  // Tier 4 — Newton's document machinery.
  { id: 'document-ast',   name: 'DocumentAST',    discipline: 'documents', wave: 3, state: 'instance',
    what: 'The canonical structure IR of a document — sections, floats, counts; rebuilt when stale.', fields: ['outline[]', 'floats[]', 'counts', 'title'],
    schema: { outline: { required: true }, floats: {}, counts: {}, title: {}, draft: {} } },
  { id: 'document-ir',    name: 'DocumentIR',     discipline: 'documents', wave: 3, state: 'instance',
    what: 'The Agency IR — a document as a typed node-graph. Renders outward byte-identical (each leaf keeps its verbatim slice); decomposes inward via a pluggable source adapter. Newton authors through it, Cristi decomposes into it; the two directions bind.', fields: ['nodes[] { id, t, content }', 'edges[] { src, dst, kind, ord }', 'head', 'contentHash', 'sourceLocator'],
    schema: { nodes: { required: true }, edges: {}, head: {}, contentHash: {}, sourceLocator: {} } },
  { id: 'citation',       name: 'Citation',       discipline: 'documents', wave: 3, state: 'instance',
    what: 'A bibliographic link — cite key, dedup heuristics, reference edges between artifacts.', fields: ['key', 'authors', 'year', 'target: artifact', 'matchedBy'],
    schema: { key: { required: true }, draft: {}, count: {}, matchedBy: {}, authors: {}, year: {}, target: {} } },
  { id: 'bound-ir',       name: 'BoundIR',        discipline: 'epistemics', wave: 3, state: 'instance',
    what: 'The spine binding claims \u2194 structure \u2194 prose with stable node ids — cross-view editing.', fields: ['paper', 'nodes[] { id, kind, claimIds[] }', 'references[]', 'counts'],
    schema: { paper: { required: true }, nodes: { required: true }, references: {}, counts: {} } },

  // Tier 5 — episodic sessions (ADR 0025). Admission: ≥2 agents share the
  // pattern (Relay meetings, MyAssistant calendar, Newton deadlines, Vega
  // planned sessions). The calendar itself is a PROJECTION over these —
  // deliberately not a class (rule 11: projections are generated).
  { id: 'meeting',        name: 'Meeting',        discipline: 'sociology', wave: 3, state: 'instance',
    what: 'A scheduled, close-ended session — Meeting ▷ Session with a lifecycle (scheduled → live → ended → archived). Distinct from Episode (a memory roll-up of a period): a Meeting is convened, then remembered. google_event_id reserved: rung 4 of the Google ladder binds time-truth outward, episode-truth stays here (ADR 0025 §4).',
    fields: ['title', 'scheduled_for', 'ends_at', 'host_agent', 'state', 'channel', 'google_event_id'],
    schema: { title: { required: true }, scheduled_for: { required: true }, host_agent: { required: true },
      id: {}, user: {}, ends_at: {}, state: {}, channel: {}, google_event_id: {}, origin: {} } },
  { id: 'attendance',     name: 'Attendance',     discipline: 'sociology', wave: 3, state: 'instance',
    what: 'Episodic belonging — a member at a Meeting with a role and an RSVP. Distinct from Membership (standing belonging = access): Attendance expires with the episode. Roles: participant (humans) | scribe (Relay’s standing role, ADR 0026) | observer.',
    fields: ['meeting', 'member', 'role: participant | scribe | observer', 'rsvp: invited | accepted | declined | joined'],
    schema: { meeting: { required: true }, member: { required: true }, role: {}, rsvp: {}, origin: {} } }
];

// ── Anchors — classes the base ALREADY has, referenced by edges ────────
const ANCHORS = [
  { id: 'proto',           name: 'Proto',          what: 'The base class itself — every agent, and every subagent, is one.' },
  { id: 'drive',           name: 'Drive',          what: 'Already classed — the six motivations upstream of every goal.' },
    { id: 'autogenic-stage', name: 'AutogenicStage', what: 'Already classed — the seven frozen stages of self-modification.' },
  { id: 'kernel',          name: 'Kernel',         what: 'Already classed — the invariant loader and conformance law.' },
  { id: 'render-service',  name: 'RenderService',  what: 'Procedural organ lib/element-render/ — ONE render engine (RenderService facade).' }
];

// ── Typed relationships (UML vocabulary) ───────────────────────────────
// composes: from ◆ to · isA: from ▷ to · assoc: from → to · depends: from ⇢ to
const EDGES = [
  // psychology
  { from: 'goal',           to: 'drive',           type: 'assoc',    label: 'serves' },
  { from: 'value',          to: 'goal',            type: 'assoc',    label: 'ranks' },
  { from: 'trait',          to: 'affect-state',    type: 'depends',  label: 'baselines (temperament)' },
  { from: 'affect-state',   to: 'register',        type: 'depends',  label: 'feeds the delivery register' },
  // Faculty is SELF-COMPOSING: a faculty may have a parent faculty — that is
  // what a sub-faculty IS (10 roots ◆ 30 sub-faculties; one class, one edge).
  { from: 'faculty',        to: 'faculty',         type: 'composes', label: 'parent / children — sub-faculties' },
  { from: 'faculty',        to: 'capability',      type: 'composes', label: 'hangs off' },
  { from: 'faculty',        to: 'memory-system',   type: 'depends',  label: 'store binding' },
  { from: 'memory-system',  to: 'register',        type: 'composes', label: 'holds' },
  { from: 'memory-system',  to: 'memory-system',   type: 'depends',  label: 'working reads episodic' },
  { from: 'memory-system',  to: 'episode',         type: 'depends',  label: 'the episodic shells\u2019 unit' },
  { from: 'episode',        to: 'memory-turn',     type: 'composes', label: 'rolls up' },
  { from: 'memory-system',  to: 'session-digest',  type: 'depends',  label: 'the concentric session shells' },
  { from: 'session-digest', to: 'session',         type: 'depends',  label: 'digests one prior session' },
  { from: 'session-digest', to: 'memory-turn',     type: 'composes', label: 'aggregates its turns at read' },
  { from: 'time-period',    to: 'episode',         type: 'composes', label: 'shells (ring 1..5)' },
  { from: 'life-profile',   to: 'life-era',        type: 'composes', label: 'chapters' },
  { from: 'life-era',       to: 'life-event',      type: 'composes', label: 'moments' },
  { from: 'idea',           to: 'manifold-link',   type: 'composes', label: 'bridges out' },
  { from: 'manifold-link',  to: 'epistemic-node',  type: 'depends',  label: 'may target belief' },
  // anatomy
  { from: 'subagent',       to: 'proto',           type: 'isA',      label: 'a FULL Proto' },
  { from: 'voice-organ',    to: 'voice-provider',  type: 'assoc',    label: 'renders via' },
  { from: 'voice-organ',    to: 'reflex-clip',     type: 'composes', label: 'banks' },
  { from: 'delivery-mark',  to: 'voice-provider',  type: 'depends',  label: 'compiled per dialect' },
  { from: 'delivery-mark',  to: 'register',        type: 'depends',  label: 'grounded in' },
  { from: 'expression',     to: 'delivery-mark',   type: 'depends',  label: 'grades' },
  { from: 'expression',     to: 'voice-provider',  type: 'depends',  label: 'on' },
  // physiology
  { from: 'loop-class',     to: 'telemetry-event', type: 'depends',  label: 'emits' },
  { from: 'loop-class',     to: 'faculty',         type: 'depends',  label: 'engages' },
  { from: 'canonical-loop-class', to: 'loop-step-class', type: 'composes', label: 'four fixed-order primitive steps' },
  { from: 'declared-ravar-loop-class', to: 'ravar-step-class', type: 'composes', label: 'three fixed-order primitive steps' },
  { from: 'declared-ravar-loop-class', to: 'render-result', type: 'depends', label: 'receipt terminus' },
  { from: 'render-element', to: 'declared-ravar-loop-class', type: 'depends', label: 'element-production binding (ADR 0045)' },
  { from: 'proto',          to: 'canonical-loop-class', type: 'depends',  label: 'projects its ontology into every agent’s self-description (glass box)' },
  { from: 'vital',          to: 'telemetry-event', type: 'depends',  label: 'computed from' },
  // sociology
  { from: 'relation',       to: 'relation-memory', type: 'composes', label: 'add_memory' },
  // ontogeny
  { from: 'finding',        to: 'autogenic-cycle', type: 'assoc',    label: 'drives' },
  { from: 'autogenic-cycle', to: 'autogenic-stage', type: 'assoc',   label: 'current stage' },
  // epistemics
  { from: 'session',        to: 'proto-claim',     type: 'composes', label: 'decompose_text' },
  { from: 'session',        to: 'inquiry',         type: 'composes', label: 'file_inquiry' },
  { from: 'proto-claim',    to: 'claim-envelope',  type: 'assoc',    label: 'matures into' },
  { from: 'inquiry',        to: 'claim-envelope',  type: 'depends',  label: 'answered by' },
  { from: 'source-quality', to: 'claim-envelope',  type: 'depends',  label: 'grounds' },
  { from: 'claim-envelope', to: 'epistemic-node',  type: 'assoc',    label: 'promote — gated firewall' },
  { from: 'epistemic-node', to: 'epistemic-edge',  type: 'composes', label: 'from / to' },
  { from: 'epistemic-event', to: 'epistemic-node', type: 'depends',  label: 'audit trail' },
  { from: 'belief-edge',    to: 'epistemic-node',  type: 'depends',  label: 'belief graph' },
  // documents
  { from: 'draft',          to: 'editorial-element', type: 'composes', label: 'create_element' },
  { from: 'draft',          to: 'claim-envelope',  type: 'depends',  label: 'cites above κ floor' },
  { from: 'artifact',       to: 'draft',           type: 'depends',  label: 'exported from' },
  { from: 'render-request', to: 'render-element', type: 'composes', label: 'element + output spec' },
  { from: 'render-request', to: 'render-context', type: 'composes', label: 'host preamble + palette' },
  { from: 'render-request', to: 'render-result',  type: 'assoc',    label: 'produces' },
  { from: 'render-result',  to: 'render-artifact', type: 'depends', label: 'references bytes' },
  { from: 'render-artifact', to: 'artifact',      type: 'composes', label: 'content-addressed render view' },
  { from: 'render-service', to: 'element-renderer', type: 'depends', label: 'registry roster' },
  { from: 'render-element', to: 'draft',           type: 'depends',  label: 'grammar types from ASG' },
  { from: 'capability',     to: 'render-request',  type: 'assoc',    label: 'render_element tool' },
  // meta
  { from: 'tool-execution', to: 'capability',      type: 'depends',  label: 'records an invocation of' },
  { from: 'tool-execution', to: 'model-config',    type: 'depends',  label: 'costed by' },
  { from: 'prompt-block',   to: 'kernel',          type: 'depends',  label: 'ontology-locked blocks guard the Constitution' },
  { from: 'sync-cursor',    to: 'faculty',         type: 'depends',  label: 'Horizon\u2019s heartbeat (sources)' },
  { from: 'discipline',     to: 'ontology-class',  type: 'composes', label: 'groups' },
  { from: 'ontology-class', to: 'kernel',          type: 'depends',  label: 'guarded by composeInvariant' },
  { from: 'graph',          to: 'draft',           type: 'depends',  label: 'sheet source — a model’s dependency graph projected from its drafts row' },
  { from: 'graph',          to: 'ontology-class',  type: 'depends',  label: 'catalog source — the catalog projected as nodes + edges' },
  { from: 'graph',          to: 'node',            type: 'composes', label: 'typed nodes it projects' },
  { from: 'graph',          to: 'edge',            type: 'composes', label: 'typed edges it projects' },
  { from: 'edge',           to: 'node',            type: 'depends',  label: 'from/to point at nodes (role is edge-borne, X7)' },
  { from: 'document-ir',    to: 'node',            type: 'composes', label: 'ALG nodes carry the syntactic aspect' },
  // fleet-recon additions (ADR 0014 §7)
  { from: 'channel',        to: 'message',          type: 'composes', label: 'holds' },
  { from: 'channel',        to: 'membership',       type: 'composes', label: 'members' },
  { from: 'channel',        to: 'read-cursor',      type: 'composes', label: 'per-user unread' },
  { from: 'message',        to: 'reaction',         type: 'composes', label: 'reactions' },
  { from: 'channel',        to: 'pin',              type: 'composes', label: 'pinned messages' },
  { from: 'message',        to: 'pin',              type: 'composes', label: 'pin' },
  { from: 'message',        to: 'attachment',       type: 'composes', label: 'carries' },
  { from: 'message',        to: 'link-preview',     type: 'depends',  label: 'unfurls to' },
  // Dependency, not composition or association: the matrix is CONFIGURATION
  // the ranking of messages reads, and no Message owns or points at a cell.
  // Modelled from Message so the direction reads "what a message's priority
  // depends on" — the same shape as model-config → model.
  { from: 'message',        to: 'message-priority', type: 'depends',  label: 'ranked by the priority matrix (timeline + content weights)' },
  { from: 'summon',         to: 'channel',          type: 'depends',  label: 'invoked in' },
  { from: 'summon',         to: 'session',          type: 'depends',  label: 'deterministic session' },
  { from: 'presence',       to: 'bus-event',        type: 'depends',  label: 'broadcast via' },
  { from: 'epistemic-event', to: 'transition-event', type: 'isA',      label: 'the graph\u2019s own audit record' },
  { from: 'decision',        to: 'claim-envelope',   type: 'assoc',    label: 'the CEREMONY\u2019s record' },
  { from: 'vital',           to: 'autogenic-cycle',  type: 'depends',  label: 'measures the cycles' },
  { from: 'memory-system',   to: 'memory-part',      type: 'composes', label: 'working memory\u2019s seven parts' },
  { from: 'chat',            to: 'voice-organ',      type: 'assoc',    label: 'speaks through' },
  { from: 'chat',            to: 'memory-turn',      type: 'assoc',    label: 'writes the turns' },
  { from: 'chat',            to: 'prompt-block',     type: 'depends',  label: 'its system surface' },
  { from: 'prompt',          to: 'prompt-block',     type: 'composes', label: 'ordered sections (◆)' },
  { from: 'prompt-block',    to: 'prompt-block',     type: 'composes', label: 'composite: a block may own child blocks (◆)' },
  { from: 'chat',            to: 'prompt',           type: 'depends',  label: 'render()s the system prompt it sends' },
  { from: 'prompt-block',    to: 'memory-part',      type: 'depends',  label: 'the working-memory block renders FROM the parts (surface, not buffer)' },
  { from: 'chat',            to: 'code',             type: 'depends',  label: 'realized by (body M33C-0007, window M33C-0008)' },
  { from: 'thalamus',        to: 'bus-event',        type: 'depends',  label: 'ring 2 (tc_bus NOTIFY)' },
  { from: 'thalamus',        to: 'loop-class',       type: 'composes', label: 'owns the autonomic scheduler' },
  { from: 'chat',            to: 'thalamus',         type: 'depends',  label: 'ears + mouth route through (ADR 0016)' },
  { from: 'subagent',        to: 'thalamus',         type: 'depends',  label: 'Relay reaches ring 3 (vega-live)' },
  { from: 'thalamus',        to: 'faculty',          type: 'assoc',    label: 'routes each afferent signal to its responsible faculty (Executive, Memory\u2026) \u2014 ADR 0016' },
  { from: 'thalamus',        to: 'memory-part',      type: 'assoc',    label: 'projects to working memory \u2014 the Executive gates, the parts receive (ADR 0016)' },
  { from: 'thalamus',        to: 'capability',       type: 'depends',  label: 'efferent: motor acts (tool calls) route back out through it \u2014 ADR 0016' },
  { from: 'memory-part',     to: 'basal-ganglia',    type: 'depends',  label: 'the Executive selects actions via the BG (ADR 0016)' },
  { from: 'basal-ganglia',   to: 'capability',       type: 'assoc',    label: 'gates the motor act \u2014 go/no-go over which tool fires (ADR 0016)' },
  { from: 'basal-ganglia',   to: 'faculty',          type: 'assoc',    label: 'routes the selected cognitive program to its faculty (ADR 0016)' },
  { from: 'basal-ganglia',   to: 'thalamus',         type: 'assoc',    label: 'the loop: selection feeds the relay for motor output (ADR 0016)' },
  { from: 'thalamus',        to: 'attention',        type: 'composes', label: 'the GATE attention lives in the trunk (ADR 0016 §3)' },
  { from: 'memory-part',     to: 'attention',        type: 'assoc',    label: 'the Executive directs HELD attention (ADR 0016 §3)' },
  { from: 'attention',       to: 'chat',             type: 'depends',  label: 'the gate PROJECTS the prompt head — the head IS the thalamic projection' },
  { from: 'attention',       to: 'affect-state',     type: 'assoc',    label: 'projects the felt state into the head (renders .line())' },
  { from: 'attention',       to: 'session-digest',   type: 'assoc',    label: 'projects recognisable prior sessions into the head' },
  { from: 'voice-organ',     to: 'code',             type: 'depends',  label: 'realized by (voice-body M33C-0009)' },
  { from: 'memory-part',     to: 'register',         type: 'composes', label: 'registers live inside parts' },
  { from: 'model',           to: 'faculty',          type: 'depends',  label: 'the substrate faculties think on' },
  { from: 'model-config',    to: 'model',            type: 'assoc',    label: 'prices the organ\u2019s invocations' },
  { from: 'summon',         to: 'message',          type: 'assoc',    label: 'produces the reply' },
  { from: 'message',        to: 'bus-event',        type: 'depends',  label: 'fans out via' },
  { from: 'principal',      to: 'auth-session',     type: 'composes', label: 'logins' },
  { from: 'principal',      to: 'passkey-credential', type: 'composes', label: 'enrolled authenticators' },
  // Association, not composition: the rank OUTLIVES any one holder and is
  // shared by many, so the Principal points at it rather than owning it.
  { from: 'principal',      to: 'designation',      type: 'assoc',    label: 'holds the rank' },
  { from: 'passkey-credential', to: 'auth-session', type: 'assoc',    label: 'a verified assertion mints one' },
  { from: 'relation',       to: 'principal',        type: 'depends',  label: 'person may be a' },
  { from: 'principal',      to: 'entity',           type: 'assoc',    label: 'projects one Person identity by UUID' },
  { from: 'proto',          to: 'entity',           type: 'assoc',    label: 'projects one Agent identity by UUID' },
  { from: 'relation',       to: 'entity',           type: 'depends',  label: 'places a named Entity on a closeness ring' },
  { from: 'entity',         to: 'entity-attention', type: 'composes', label: 'owns the finite budget allocated through' },
  { from: 'entity-attention', to: 'entity',         type: 'assoc',    label: 'directed source and required owner' },
  { from: 'entity-attention', to: 'artifact',       type: 'depends',  label: 'no allocation without proof' },
  // The claim types the unit; the allocation moves the budget. They meet at
  // exactly one place: a quiet claim suppresses the edge.
  { from: 'attention-claim', to: 'entity-attention', type: 'assoc',   label: 'types the unit — a quiet claim suppresses the allocation' },
  { from: 'attention-claim', to: 'entity',          type: 'assoc',    label: 'owner who typed it · subject it is about' },
  { from: 'attention-claim', to: 'artifact',        type: 'assoc',    label: 'explains the typing when the unit has an observation — the proof is the unit itself' },
  { from: 'call-summary',   to: 'call-transcript',  type: 'depends',  label: 'summarizes' },
  { from: 'call-summary',   to: 'message',          type: 'assoc',    label: 'posted as' },
  { from: 'lifecycle',      to: 'transition-event', type: 'composes', label: 'emits' },
  { from: 'finding',        to: 'lifecycle',        type: 'depends',  label: 'status is a' },
  { from: 'epistemic-node', to: 'lifecycle',        type: 'depends',  label: 'maturity is a' },
  { from: 'action-item',    to: 'lifecycle',        type: 'depends',  label: 'status is a' },
  { from: 'workflow',       to: 'decision',         type: 'depends',  label: 'pauses on' },
  { from: 'workflow',       to: 'loop-class',       type: 'depends',  label: 'run by' },
  { from: 'place',          to: 'proto',            type: 'isA',      label: 'a FULL Proto — the container side' },
  { from: 'place',          to: 'commons',          type: 'composes', label: 'holds' },
  { from: 'place',          to: 'membership',       type: 'composes', label: 'roster' },
  { from: 'subagent',       to: 'host-contract',    type: 'assoc',    label: 'governed by' },
  { from: 'place',          to: 'host-contract',    type: 'assoc',    label: 'governs members via' },
  { from: 'epistemic-scope', to: 'epistemic-node',  type: 'depends',  label: 'keys' },
  { from: 'principal',      to: 'epistemic-scope', type: 'composes', label: 'one cross-platform identity scope' },
  { from: 'corroboration',  to: 'epistemic-node',   type: 'depends',  label: 'cross-source agreement' },
  { from: 'institutional-belief', to: 'corroboration',   type: 'assoc',   label: 'created from' },
  { from: 'institutional-belief', to: 'epistemic-scope', type: 'depends', label: 'agency scope' },
  { from: 'bound-ir',       to: 'claim-envelope',   type: 'depends',  label: 'binds claims' },
  { from: 'bound-ir',       to: 'document-ast',     type: 'depends',  label: 'binds structure' },
  { from: 'document-ast',   to: 'draft',            type: 'depends',  label: 'structure of' },
  { from: 'document-ast',   to: 'document-ir',      type: 'depends',  label: 'summary of' },
  { from: 'document-ir',    to: 'claim-envelope',   type: 'depends',  label: 'grounds edges → fabric' },
  { from: 'citation',       to: 'artifact',         type: 'depends',  label: 'links references' },
  // Episodic sessions (ADR 0025) — a Meeting IS a Session with a schedule;
  // its roster is Attendance rows; it is scheduled from a channel and its
  // minutes post back to one (ADR 0026 waves).
  { from: 'meeting',        to: 'session',          type: 'isA',      label: 'a scheduled, close-ended session' },
  { from: 'meeting',        to: 'attendance',       type: 'composes', label: 'roster — invitees with roles' },
  { from: 'meeting',        to: 'channel',          type: 'assoc',    label: 'scheduled from · minutes post to' }
];

const STATES = ['planned', 'procedural', 'instance'];

/**
 * INHERITED INSTANCES — objects the BASE ITSELF constructs as part of the
 * class definition (ADR 0014 §4, origin 'inherited'): every agent is born
 * with them. The 40 faculties, the 7 loops, the 10-word mark vocabulary are
 * not examples of their classes — they ARE base-shipped objects. Counts AND
 * names are computed LIVE from the registries (glass-box: the graph can never
 * drift), so the view can click through from the ×N badge to the roster.
 * Keys are class/anchor ids; lazy requires avoid module cycles.
 * @returns {object} id → { count, note, items: [{ id, name, sub? }] }
 */
function inheritedInstances() {
  var f = require('./faculties');
  function roster(list, nameOf, subOf) {
    return list.map(function (x) {
      var it = { id: x.id || String(x), name: nameOf ? nameOf(x) : (x.name || x.id || String(x)) };
      if (subOf && subOf(x)) it.sub = true;
      return it;
    });
  }
  var out = {
    'faculty':         { note: '10 roots + 30 sub-faculties (BASE_FACULTIES)',
      items: roster(f.BASE_FACULTIES, null, function (x) { return !!x.parent; }) },
    'loop-class':      { note: 'the base cognitive loops (BASE_LOOPS)', items: roster(f.BASE_LOOPS) },
    'capability':      { note: 'base tool entries (BASE_TOOLS)', items: roster(f.BASE_TOOLS) },
    'vital':           { note: 'base vital signs (BASE_VITALS)', items: roster(f.BASE_VITALS) },
    'goal':            { note: 'the six drives, constructed as Goal instances (BASE_DRIVES)', items: roster(f.BASE_DRIVES) },
    'value':           { note: 'the kernel\u2019s character pair (BASE_VALUES)', items: roster(f.BASE_VALUES) },
    'model':           { note: 'the four cognition organs (BASE_MODELS)', items: roster(f.BASE_MODELS) },
    'memory-part':     { note: 'working memory\u2019s committee — seven parts, each with its own physics (memory-part.js BASE_PARTS)',
      items: (function () { try { return require('./memory-part').BASE_PARTS.map(function (x) { return { id: x.id, name: x.name }; }); } catch (_e) { return []; } })() },
    'model-config':    { note: 'the substrates the fleet runs on, priced (model-config.js BASE_MODEL_CONFIGS)',
      items: (function () { try { return require('./model-config').BASE_MODEL_CONFIGS.map(function (m) { return { id: m.model_id, name: m.label() }; }); } catch (_e) { return []; } })() },
    'workflow':        { note: 'the methodology itself — ship-a-change, CLAUDE.md rule 5 as data (workflow.js)', items: [{ id: 'ship-a-change', name: 'ship-a-change: 8 steps (gated on UAT validation)' }] },
    'autogenic-stage': { note: 'the frozen stages (AUTOGENIC_STAGES)', items: roster(f.AUTOGENIC_STAGES) },
    'discipline':      { note: 'the eight lenses (DISCIPLINES)', items: roster(DISCIPLINES) },
    'ontology-class':  { note: 'this catalog — the class of classes counts itself', items: roster(BASE_CLASSES) },
    'memory-system':   { note: 'the three systems (memory-system.js BASE_MEMORY_SYSTEMS)',
      items: require('./memory-system').BASE_MEMORY_SYSTEMS.map(function (ms) {
        return { id: ms.id, name: ms.label + (ms.reads ? ' \u2192 reads ' + ms.reads : '') };
      }) },
    'voice-provider':  { note: 'the provider seams',
      items: [{ id: 'xai', name: 'xAI' }, { id: 'elevenlabs', name: 'ElevenLabs' }, { id: 'deepgram', name: 'Deepgram' }, { id: 'grok', name: 'Grok realtime' }] }
  };
  try {
    var bx = require('./voice/marks').BASE_EXPRESSIONS;
    out['expression'] = { note: 'one grade record per mark on the ElevenLabs path (BASE_EXPRESSIONS)',
      items: bx.map(function (e) { return { id: e.mark, name: e.label(), sub: e.renders === 'untested' }; }) };
  } catch (_e) {}
  try {
    out['delivery-mark'] = { note: 'the twenty-one house marks (voice/marks.js BASE_MARKS)',
      items: require('./voice/marks').BASE_MARKS.map(function (m) {
        return { id: m.id, name: m.token() + (m.status === 'translated' ? ' → ' + m.compileFor('elevenlabs') : '') };
      }) };
  } catch (_e) {}
  try {
    var yb = require('./voice/dynamics/yields').YIELD_BANK || [];
    var fb = require('./voice/dynamics/fillers').FILLER_BANK || [];
    var bb = require('./voice/dynamics/backchannels').BACKCHANNEL_BANK || [];
    var clips = yb.concat(fb).concat(bb).map(function (c, i) {
      return { id: (c.bank || 'clip') + '-' + i, name: c.label ? c.label() : ('“' + c.phrase + '”') };
    });
    if (clips.length) out['reflex-clip'] = { note: 'the three reflex banks (voice/dynamics/)', items: clips };
  } catch (_e) {}
  out['subagent'] = { note: 'the base itself composes Relay into every full agent (ensureRelay — an inherited composition)',
    items: [{ id: 'relay', name: 'Relay ◆ inside every full agent (contracted, inherited)' }], count: 1 };
  out['host-contract'] = { note: 'Relay\u2019s containment contract — constructed by ensureRelay through the class (inherited)',
    items: [{ id: 'relay-contract', name: 'Relay\u2019s contract: 3 granted \u00b7 2 forbidden \u00b7 2 triggers' }], count: 1 };
  try {
    out['lifecycle'] = { note: 'the three running state machines, reified (lifecycle.js BASE_LIFECYCLES)',
      items: require('./lifecycle').BASE_LIFECYCLES.map(function (lc) { return { id: lc.id, name: lc.label() }; }) };
  } catch (_e) {}
  try {
    var epiShells = require('./memory-system').BASE_MEMORY_SYSTEMS.filter(function (m) { return m.id === 'episodic'; })[0].shells;
    out['time-period'] = { note: 'the seven concentric shells (memory-system.js), constructed through the class',
      items: epiShells.map(function (sh) { return { id: sh.kind || sh.label, name: (sh.kind || sh.label) + ' (' + (sh.span || sh.grain) + ')' }; }) };
  } catch (_e) {}
  try {
    out['voice-provider'] = { note: 'the four vendor seams (voice-provider.js BASE_PROVIDERS)',
      items: require('./voice-provider').BASE_PROVIDERS.map(function (pv) {
        return { id: pv.id, name: pv.name + ' — ' + pv.roles.join('/') };
      }) };
  } catch (_e) {}
  Object.keys(out).forEach(function (k) { out[k].count = out[k].items.length; });
  return out;
}

/**
 * DEFINE INTO LAYER A — the one binding mechanism (ADR 0014 §1: no third
 * class system). Every catalog entry carrying a machine-readable `schema`
 * is generated into the formal ontology as `mach33:<Name>`; class modules
 * validate their constructor input against it (the OEP records violations).
 * Schema-on-conversion: an entry gains its schema in the SAME PR that
 * reifies it — schema and code stay honest together.
 * @param {object} ontology — an @mach33/core Ontology instance.
 */
function defineInto(ontology) {
  BASE_CLASSES.forEach(function (c) {
    if (!c.schema) return;
    var properties = {};
    Object.keys(c.schema).forEach(function (k) {
      properties[k] = { required: !!c.schema[k].required };
    });
    ontology.defineClass({ iri: 'mach33:' + c.name, label: c.name, properties: properties });
  });
  return ontology;
}

// ── Shared Layer A binding ──────────────────────────────────────────────
// ONE bound ontology per process: every class module (faculty.js,
// register.js, …) validates against this singleton, generated from the
// catalog's schemas. Lazy so bare requires stay light and module load
// order stays cycle-free.
let _ontology = null;
function ontology() {
  if (_ontology) return _ontology;
  const { Ontology } = require('@mach33/core');
  _ontology = defineInto(new Ontology());
  return _ontology;
}

/** Counts by state — the glass-box line the Constitution and views read. */
function stateCounts(list) {
  var c = { total: 0, planned: 0, procedural: 0, instance: 0 };
  (list || BASE_CLASSES).forEach(function (x) { c.total++; c[x.state] = (c[x.state] || 0) + 1; });
  return c;
}

[BASE_CLASSES, DISCIPLINES, ANCHORS, EDGES, STATES].forEach(deepFreeze);


// ── SIGNAL ARCS — the physiology layer ──────────────────────────────────────
// An arc is a reflex path: organs consulting organs during behavior. The
// graph draws them over the anatomy; arcs that have FIRED glow, arcs that
// have not are the wiring that does not exist yet, visible as darkness.
// Every hop names the CODE that realizes it — the arc's claim to be a
// real connection is checkable, hop by hop, against these.
const ARCS = [
  { id: 'speak',     name: 'Speech reflex',
    path: ['memory-turn', 'affect-state', 'delivery-mark', 'expression', 'voice-provider'],
    what: 'perceive \u2192 feel \u2192 choose marks \u2192 perform \u2014 the felt state colors the delivery',
    hops: {
      'memory-turn': 'every spoken turn constructs MemoryTurns through the store write gate',
      'affect-state': 'latestAffect() is read into the marks prompt (chat-body)',
      'delivery-mark': 'compile() translates BASE_MARKS to the provider dialect (voice-body)',
      'expression': 'promptFragment computes the offer FROM the Expression grades \u2014 ear-verified lead, weak/none withheld; the register reads timeOfDay from the clock (the Temporal Buffer\u2019s first consumer)',
      'voice-provider': 'voice-body routes by the BASE_PROVIDERS instance (model pin, stability, quirks)'
    } },
  { id: 'autogenic', name: 'Self-modification',
    path: ['finding', 'autogenic-cycle', 'transition-event'],
    what: 'a finding advances; its cycle moves and the audit rides',
    hops: {
      'finding': 'advanceFinding: legality via the finding-stages Lifecycle (regression refused)',
      'autogenic-cycle': 'the cycle moves by immutable withStage swap; ship stamps',
      'transition-event': 'the audit record appends to the transition ledger'
    } },
  { id: 'ceremony',  name: 'The ceremony',
    path: ['claim-envelope', 'epistemic-node', 'decision'],
    what: 'promotion writes belief AND records the choice',
    hops: {
      'claim-envelope': 'promoteEnvelope takes the envelope (\u03ba carried into provenance)',
      'epistemic-node': 'the node constructs WITH the provenance chain (anti-minting)',
      'decision': 'the recorded choice (owner = approvedBy) appends to the decision ledger'
    } },
  { id: 'attend',    name: 'Attention',
    path: ['memory-turn', 'memory-part'],
    what: 'the mind maintains its own registers \u2014 volition over working memory',
    hops: {
      'memory-turn': 'the conversation prompts the act (the WORKING MEMORY head, read every turn)',
      'memory-part': 'set_focus / note_intent / note_open_loop write the Executive\u2019s registers through executeTool (recorded)'
    } },
  { id: 'recall',    name: 'Recall',
    path: ['episode', 'memory-part'],
    what: 'memories retrieved into the present \u2014 the read side of episodic memory',
    hops: {
      'episode': 'the recall tool reads episodes + matching turns from the store',
      'memory-part': 'retrieved items land in the buffer (capped 12) and return to the mind as tool results'
    } },
  { id: 'rollup',    name: 'Episodic roll-up',
    path: ['memory-turn', 'episode'],
    what: 'the day\u2019s turns become the day-shell \u2014 the first autonomous beat',
    hops: {
      'memory-turn': 'rollupDay reads the day\u2019s MemoryTurns from the store',
      'episode': 'the day-shell Episode is written back (the Loop\u2019s cadence)'
    } }
];
ARCS.forEach(function (a) { Object.freeze(a.path); Object.freeze(a); });
Object.freeze(ARCS);

module.exports = { BASE_CLASSES, DISCIPLINES, ANCHORS, EDGES, ARCS, STATES, stateCounts, inheritedInstances, defineInto, ontology };
