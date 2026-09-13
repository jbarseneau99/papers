'use strict';

/**
 * lib/proto/entity-attention.js — the OTHER Attention CLASS.
 *
 * This is an allocation of the finite attention budget between two Entity
 * nodes, not the cortico-basal-ganglia gate in lib/proto/attention.js. It is a
 * directed, UUID-addressed edge with a required owner and proving canonical
 * observation. Giving and getting both tax the participating Entities.
 *
 * Kinds are data on one class, never Proto subclasses. Proposed allocations
 * commit budget; accepted/open/aging/discharged allocations record spend;
 * declined/suppressed allocations tax neither side.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0122 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const Entity = require('./entity');
const KINDS = Object.freeze([
  'reply', 'meeting', 'mention', 'draft_accepted',
  'commitment_discharged', 'hold', 'invite', 'intro',
  'identity_merge', 'learning_commitment', 'proposed_allocation'
]);
const STATES = Object.freeze([
  'proposed', 'accepted', 'open', 'aging', 'discharged',
  'declined', 'suppressed'
]);

// ── The class ─────────────────────────────────────────────────────────────
class EntityAttention {
  constructor(raw) {
    raw = raw || {};
    const source = raw.sourceEntityId || raw.source_entity_id;
    const owner = raw.ownerEntityId || raw.owner_entity_id;
    const artifact = raw.artifactObservationId || raw.artifact_observation_id;
    const proposal = raw.proposalId || raw.contact_proposal_id || null;
    const kind = raw.kind || raw.type;
    const state = raw.state || 'proposed';
    const amount = raw.amount == null ? 1 : Number(raw.amount);
    const strength = raw.strength == null ? 1 : Number(raw.strength);

    [['id', raw.id], ['sourceEntityId', source], ['ownerEntityId', owner],
      ['artifactObservationId', artifact]].forEach(function (pair) {
      if (!Entity.UUID.test(String(pair[1] || ''))) {
        throw new Error('[proto:entity-attention] ' + pair[0] + ' must be a UUID');
      }
    });
    if (KINDS.indexOf(kind) < 0) {
      throw new Error('[proto:entity-attention] kind must be one of ' + KINDS.join('|'));
    }
    if (proposal && !Entity.UUID.test(String(proposal))) {
      throw new Error('[proto:entity-attention] proposalId must be a UUID');
    }
    if (STATES.indexOf(state) < 0) {
      throw new Error('[proto:entity-attention] state must be one of ' + STATES.join('|'));
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('[proto:entity-attention] amount must be a positive integer');
    }
    if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
      throw new Error('[proto:entity-attention] strength must be between 0 and 1');
    }

    const violations = require('./classes').ontology().validate({
      '@type': 'mach33:EntityAttention',
      id: raw.id,
      sourceEntityId: source,
      ownerEntityId: owner,
      artifactObservationId: artifact,
      kind: kind,
      state: state,
      claim: raw.claim
    });
    if (violations.length) {
      throw new Error('[proto:entity-attention] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }

    this.id = raw.id;
    this.sourceEntityId = source;
    this.ownerEntityId = owner;
    this.artifactObservationId = artifact;
    this.proposalId = proposal;
    this.kind = kind;
    this.state = state;
    this.amount = amount;
    this.strength = strength;
    this.claim = raw.claim;
    this.createdAt = raw.createdAt || raw.created_at || null;
    this.acceptedAt = raw.acceptedAt || raw.accepted_at || null;
    this.lastEvidenceAt = raw.lastEvidenceAt || raw.last_evidence_at || null;
    this.dischargedAt = raw.dischargedAt || raw.discharged_at || null;
    Object.freeze(this);
  }

  isSelfOwed() { return this.sourceEntityId === this.ownerEntityId; }
  isProposed() { return this.state === 'proposed'; }

  taxes(entityId) {
    if (entityId !== this.sourceEntityId && entityId !== this.ownerEntityId) return 0;
    return this.state === 'declined' || this.state === 'suppressed' ? 0 : this.amount;
  }

  budgetEffect(entityId) {
    const amount = this.taxes(entityId);
    return {
      committed: this.state === 'proposed' ? amount : 0,
      spent: this.state === 'proposed' ? 0 : amount
    };
  }
}

EntityAttention.KINDS = KINDS;
EntityAttention.STATES = STATES;

module.exports = EntityAttention;
