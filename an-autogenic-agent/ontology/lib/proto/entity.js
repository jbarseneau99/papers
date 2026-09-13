'use strict';

/**
 * lib/proto/entity.js — the Entity CLASS (canonical named identity).
 *
 * An Entity is one UUID-addressed node shared by Proto and Vega. A Person may
 * project as both a User and a Contact; an Agent, organization, commitment, or
 * working set is the same kind of graph node. Names and aliases describe the
 * object but never relate durable records.
 *
 * The Entity owns a finite attention budget. Attention allocations remain
 * separate edge objects; the budget only carries capacity and the derived
 * committed/spent/remaining snapshot.
 *
 * Contents: class definition · inherited instances.
 * Ontology: Code object M33C-0121 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES = Object.freeze([
  'person', 'agent', 'organization', 'company', 'fund', 'product',
  'technology', 'place', 'event', 'concept', 'theory', 'commitment',
  'working_set', 'instrument', 'metric', 'regulation', 'other'
]);
const STATUSES = Object.freeze(['active', 'merged']);

// ── Value freezing ────────────────────────────────────────────────────────
function cloneFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFreeze));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  Object.keys(value).forEach(function (key) { out[key] = cloneFreeze(value[key]); });
  return Object.freeze(out);
}

function integer(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('[proto:entity] ' + field + ' must be a non-negative integer');
  }
  return n;
}

// ── The class ─────────────────────────────────────────────────────────────
class Entity {
  constructor(raw) {
    raw = raw || {};
    const normalized = {
      id: raw.id,
      canonicalName: raw.canonicalName != null ? raw.canonicalName : raw.canonical_name,
      entityType: raw.entityType != null ? raw.entityType : raw.entity_type,
      aliases: raw.aliases || [],
      status: raw.status || 'active',
      mergedInto: raw.mergedInto != null ? raw.mergedInto : raw.merged_into,
      provenance: raw.provenance || {
        detector: raw.detector || null,
        firstSeenAt: raw.firstSeenAt || raw.first_seen_at || null,
        lastSeenAt: raw.lastSeenAt || raw.last_seen_at || null
      },
      metadata: raw.metadata || {},
      attentionBudget: raw.attentionBudget || raw.attention_budget || {
        capacity: 100, committed: 0, spent: 0, remaining: 100, unit: 'attention-point'
      }
    };

    if (!UUID.test(String(normalized.id || ''))) {
      throw new Error('[proto:entity] id must be a UUID');
    }
    if (TYPES.indexOf(normalized.entityType) < 0) {
      throw new Error('[proto:entity] entityType must be one of ' + TYPES.join('|'));
    }
    if (STATUSES.indexOf(normalized.status) < 0) {
      throw new Error('[proto:entity] status must be active|merged');
    }
    if (!Array.isArray(normalized.aliases)) {
      throw new Error('[proto:entity] aliases must be an array');
    }

    const budget = normalized.attentionBudget || {};
    const capacity = integer(budget.capacity, 'attentionBudget.capacity');
    const committed = integer(budget.committed || 0, 'attentionBudget.committed');
    const spent = integer(budget.spent || 0, 'attentionBudget.spent');
    const remaining = budget.remaining == null
      ? Math.max(0, capacity - committed - spent)
      : integer(budget.remaining, 'attentionBudget.remaining');
    if (committed + spent + remaining !== capacity) {
      throw new Error('[proto:entity] attention budget must balance: committed + spent + remaining = capacity');
    }

    const violations = require('./classes').ontology().validate({
      '@type': 'mach33:Entity',
      id: normalized.id,
      canonicalName: normalized.canonicalName,
      entityType: normalized.entityType,
      attentionBudget: budget
    });
    if (violations.length) {
      throw new Error('[proto:entity] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }

    this.id = normalized.id;
    this.canonicalName = normalized.canonicalName;
    this.entityType = normalized.entityType;
    this.aliases = cloneFreeze(normalized.aliases);
    this.status = normalized.status;
    this.mergedInto = normalized.mergedInto || null;
    this.provenance = cloneFreeze(normalized.provenance);
    this.metadata = cloneFreeze(normalized.metadata);
    this.attentionBudget = cloneFreeze({
      capacity: capacity,
      committed: committed,
      spent: spent,
      remaining: remaining,
      unit: budget.unit || 'attention-point'
    });
    Object.freeze(this);
  }

  label() { return this.canonicalName + ' (' + this.entityType + ')'; }

  hasAlias(value) {
    const wanted = String(value || '').trim().toLowerCase();
    if (!wanted) return false;
    if (String(this.canonicalName).trim().toLowerCase() === wanted) return true;
    return this.aliases.some(function (alias) {
      const text = typeof alias === 'string' ? alias : alias && alias.alias;
      return String(text || '').trim().toLowerCase() === wanted;
    });
  }

  static fromNamedEntityRow(row, budget) {
    return new Entity(Object.assign({}, row, {
      aliases: row.aliases || [],
      attentionBudget: budget || row.attention_budget
    }));
  }

  static fromWorkspaceRow(row, budget) {
    return new Entity({
      id: row.named_entity_id || row.id,
      canonicalName: row.canonical_name || row.label,
      entityType: row.entity_type || row.type,
      aliases: row.aliases || [],
      status: row.status || 'active',
      provenance: { detector: row.detector || 'workspace-entity' },
      metadata: Object.assign({}, row.metadata || {}, {
        workspaceEntityId: row.id,
        workspaceId: row.workspace_id || null
      }),
      attentionBudget: budget
    });
  }
}

Entity.TYPES = TYPES;
Entity.STATUSES = STATUSES;
Entity.UUID = UUID;
Entity.VEGA = new Entity({
  id: '33000000-0000-4000-8000-000000000001',
  canonicalName: 'Vega Agent',
  entityType: 'agent',
  aliases: ['Vega'],
  provenance: { detector: 'base:principal-agent' }
});
Entity.RELAY = new Entity({
  id: '33000000-0000-4000-8000-000000000002',
  canonicalName: 'Relay Agent',
  entityType: 'agent',
  aliases: ['Relay'],
  provenance: { detector: 'base:principal-agent' }
});
Entity.BASE_AGENT_ENTITIES = Object.freeze([Entity.VEGA, Entity.RELAY]);

module.exports = Entity;
