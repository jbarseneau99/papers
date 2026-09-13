'use strict';

/**
 * lib/proto/attention-claim.js — WHAT KIND OF DEMAND THIS IS.
 *
 * An EntityAttention edge answers how much budget moved, to whom, and on what
 * proof. It cannot say what sort of demand the unit was, and that is the
 * question the operator actually asks first: a message that needs a human
 * answer and a newsletter both arrive as one unread row. This class is that
 * typing — a claim ABOUT a unit on an attention surface.
 *
 * ONE VOCABULARY, DECLARED ONCE. Every attention surface types its unit, and
 * each surface's words are its own: mail sorts asks from noise, contacts reads
 * a posture, calendar reads a time claim. Restating those lists in five views
 * is how five surfaces drift apart (rule 11), so SURFACES below is the single
 * source and the views project from it — including the surfaces not yet built,
 * so the next one inherits the grammar instead of inventing it.
 *
 * STORED VERSUS DERIVED, AND WHY THAT IS NOT A DETAIL. Most claims are a
 * JUDGEMENT about an artifact — a model or the operator decided this thread is
 * a human ask — so they are written down, kept for history, and superseded
 * rather than overwritten. A contact's posture is NOT of that nature: "you owe
 * them a reply" is a function of the attention ledger at this instant, and a
 * stored copy would be a lie the moment an edge discharges. So contacts is
 * declared `derived` and has no rows; the class still governs it so the
 * projection cannot invent a word the vocabulary does not contain.
 *
 * A claim never acts. Typing a thread "human ask" obliges nothing and sends
 * nothing; it only tells the surface what it is looking at. What it CAN do is
 * quiet an allocation: a unit typed as nonsense or noise suppresses its
 * attention edge, which is how the finite budget stops paying for junk.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0123 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const Entity = require('./entity');

// ── The surfaces and their words ──────────────────────────────────────────
// `unit` is what the surface types (the spec's product law); `mode` is whether
// a claim on it is written down or computed; `types` is the closed vocabulary.
// Surfaces whose product is not built yet are declared anyway — the grammar
// belongs to this module, not to whichever view lands first.
const SURFACES = Object.freeze({
  mail: Object.freeze({
    unit: 'classified message / thread',
    mode: 'stored',
    types: Object.freeze(['human_ask', 'agent_ask', 'interesting', 'nonsense'])
  }),
  contacts: Object.freeze({
    unit: 'person node',
    mode: 'derived',
    types: Object.freeze([
      'you_owe', 'they_owe_you', 'active_counterpart', 'dormant', 'unresolved'
    ])
  }),
  calendar: Object.freeze({
    unit: 'time claim',
    mode: 'stored',
    types: Object.freeze([
      'ask_for_time', 'committed_event', 'hold', 'protected_work', 'conflict'
    ])
  }),
  chat: Object.freeze({
    unit: 'working set',
    mode: 'stored',
    types: Object.freeze([
      'live_human_ask', 'team_deciding', 'status_coordination', 'noise'
    ])
  }),
  video: Object.freeze({
    unit: 'collaboration object',
    mode: 'stored',
    types: Object.freeze(['needs_prep', 'live', 'needs_debrief', 'artifact_only'])
  })
});

// Who did the typing. 'derived' is not a lesser model call — it means nobody
// judged anything, the ledger was read.
const ASSIGNERS = Object.freeze(['model', 'operator', 'derived']);

// THE QUIET WORDS. These are the only claim types that may suppress an
// attention allocation, and they are listed rather than inferred: a surface
// that could quiet a unit by inventing a word would silently stop paying
// attention to something the operator never dismissed.
const QUIET = Object.freeze(['nonsense', 'noise', 'artifact_only']);

// THE OWED WORDS. A claim that puts the demand on the operator — what the
// surfaces sort to the top and what a budget is spent discharging.
const OBLIGATING = Object.freeze([
  'human_ask', 'live_human_ask', 'ask_for_time', 'you_owe',
  'needs_prep', 'needs_debrief', 'conflict'
]);

function surfaceNames() { return Object.keys(SURFACES); }

// ── The class ─────────────────────────────────────────────────────────────
class AttentionClaim {
  constructor(raw) {
    raw = raw || {};
    const surface = raw.surface;
    const declared = SURFACES[surface];
    if (!declared) {
      throw new Error('[proto:attention-claim] surface must be one of '
        + surfaceNames().join('|'));
    }
    const claimType = raw.claimType || raw.claim_type;
    const owner = raw.ownerEntityId || raw.owner_entity_id;
    const subject = raw.subjectEntityId || raw.subject_entity_id || null;
    const unitId = raw.unitId || raw.unit_id;
    const artifact = raw.artifactObservationId || raw.artifact_observation_id || null;
    const assignedBy = raw.assignedBy || raw.assigned_by
      || (declared.mode === 'derived' ? 'derived' : 'model');
    const confidence = raw.confidence == null ? 1 : Number(raw.confidence);

    if (declared.types.indexOf(claimType) < 0) {
      throw new Error('[proto:attention-claim] ' + surface
        + ' claimType must be one of ' + declared.types.join('|'));
    }
    if (ASSIGNERS.indexOf(assignedBy) < 0) {
      throw new Error('[proto:attention-claim] assignedBy must be one of '
        + ASSIGNERS.join('|'));
    }
    // A derived claim is computed on read and has no row, so it carries no id.
    //
    // A stored claim must be traceable, and what it is traceable TO is the
    // unit it types: unitId names a durable row that already carries its own
    // evidence. An observation is an enrichment, not the proof — requiring one
    // made two thirds of a live inbox untypable, and minting a stub to satisfy
    // the constraint would convince the mail decomposer the message had
    // already been ingested (see migration 1788113624). This is where the
    // claim's law and EntityAttention's part company: an ALLOCATION of finite
    // budget still may not exist without an observation behind it.
    if (declared.mode === 'derived') {
      if (assignedBy !== 'derived') {
        throw new Error('[proto:attention-claim] a ' + surface
          + ' claim is derived from the ledger and cannot be assigned by '
          + assignedBy);
      }
    } else {
      if (assignedBy === 'derived') {
        throw new Error('[proto:attention-claim] a ' + surface
          + ' claim is stored and must name a model or operator assigner');
      }
      if (!Entity.UUID.test(String(raw.id || ''))) {
        throw new Error('[proto:attention-claim] id must be a UUID');
      }
      if (artifact && !Entity.UUID.test(String(artifact))) {
        throw new Error('[proto:attention-claim] artifactObservationId must be a UUID');
      }
    }
    [['ownerEntityId', owner], ['unitId', unitId]].forEach(function (pair) {
      if (!Entity.UUID.test(String(pair[1] || ''))) {
        throw new Error('[proto:attention-claim] ' + pair[0] + ' must be a UUID');
      }
    });
    if (subject && !Entity.UUID.test(String(subject))) {
      throw new Error('[proto:attention-claim] subjectEntityId must be a UUID');
    }
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new Error('[proto:attention-claim] confidence must be between 0 and 1');
    }

    const violations = require('./classes').ontology().validate({
      '@type': 'mach33:AttentionClaim',
      id: raw.id,
      surface: surface,
      unitId: unitId,
      ownerEntityId: owner,
      claimType: claimType,
      assignedBy: assignedBy
    });
    if (violations.length) {
      throw new Error('[proto:attention-claim] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }

    this.id = raw.id || null;
    this.surface = surface;
    this.unit = declared.unit;
    this.mode = declared.mode;
    this.unitId = unitId;
    this.ownerEntityId = owner;
    this.subjectEntityId = subject;
    this.claimType = claimType;
    this.assignedBy = assignedBy;
    this.confidence = confidence;
    this.rationale = raw.rationale || null;
    this.artifactObservationId = artifact;
    this.createdAt = raw.createdAt || raw.created_at || null;
    this.supersededAt = raw.supersededAt || raw.superseded_at || null;
    Object.freeze(this);
  }

  isStored() { return this.mode === 'stored'; }
  isDerived() { return this.mode === 'derived'; }
  isCurrent() { return !this.supersededAt; }

  // A quiet unit stops taxing the budget. Only a CURRENT claim quiets: a
  // superseded "nonsense" must not keep an allocation suppressed after the
  // operator has re-typed the thread as an ask.
  quiets() { return this.isCurrent() && QUIET.indexOf(this.claimType) > -1; }

  // The demand landed on the owner, so this is what a surface sorts up.
  obligates() { return this.isCurrent() && OBLIGATING.indexOf(this.claimType) > -1; }

  // Human-facing words are generated from the machine ones, never kept in a
  // second list a view could let drift.
  label() {
    return this.claimType.split('_').map(function (word, index) {
      return index ? word : word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  }

  static typesFor(surface) {
    const declared = SURFACES[surface];
    if (!declared) {
      throw new Error('[proto:attention-claim] unknown surface ' + String(surface));
    }
    return declared.types;
  }

  static modeFor(surface) {
    const declared = SURFACES[surface];
    if (!declared) {
      throw new Error('[proto:attention-claim] unknown surface ' + String(surface));
    }
    return declared.mode;
  }
}

AttentionClaim.SURFACES = SURFACES;
AttentionClaim.ASSIGNERS = ASSIGNERS;
AttentionClaim.QUIET = QUIET;
AttentionClaim.OBLIGATING = OBLIGATING;

module.exports = AttentionClaim;
