-- 0096_entity_ontology.sql
--
-- Promotes entities from metadata strings on semantic_edges to first-class
-- graph nodes with type, aliases, and structural relationships. Adds a
-- facet dimension to claim envelopes for compositional memo scoping.

-- pg_trgm for fuzzy entity resolution (label similarity matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── First-class entity nodes ────────────────────────────────────────────
CREATE TABLE entities (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID        REFERENCES workspaces(id) ON DELETE CASCADE,
  label           TEXT        NOT NULL,
  type            TEXT        NOT NULL,
  aliases         TEXT[]      NOT NULL DEFAULT '{}',
  description     TEXT,
  canonical_slug  TEXT        NOT NULL,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT entities_type_check CHECK (type IN (
    'organization', 'product', 'person', 'technology', 'location',
    'event', 'instrument', 'metric', 'regulation'
  ))
);

CREATE UNIQUE INDEX entities_workspace_slug_idx
  ON entities (workspace_id, canonical_slug);
CREATE INDEX entities_type_idx
  ON entities (type);
CREATE INDEX entities_label_trgm_idx
  ON entities USING gin (lower(label) gin_trgm_ops);

-- ── Typed mention edges: claim → entity with role ───────────────────────
CREATE TABLE entity_mentions (
  id          BIGSERIAL   PRIMARY KEY,
  envelope_id UUID        NOT NULL REFERENCES claim_envelopes(id) ON DELETE CASCADE,
  entity_id   UUID        NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL,
  confidence  REAL,
  detector    TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT entity_mentions_role_check CHECK (role IN (
    'actor', 'subject', 'recipient', 'instrument', 'location',
    'value', 'timeframe', 'benchmark', 'authority', 'counterparty'
  ))
);

CREATE UNIQUE INDEX entity_mentions_unique_idx
  ON entity_mentions (envelope_id, entity_id, role, detector);
CREATE INDEX entity_mentions_entity_idx
  ON entity_mentions (entity_id);
CREATE INDEX entity_mentions_envelope_idx
  ON entity_mentions (envelope_id);

-- ── Entity-to-entity structural edges ───────────────────────────────────
CREATE TABLE entity_relations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id  UUID        NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_entity_id  UUID        NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation_type     TEXT        NOT NULL,
  rollup            BOOLEAN     NOT NULL DEFAULT false,
  metadata          JSONB       NOT NULL DEFAULT '{}',
  detector          TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT entity_relations_type_check CHECK (relation_type IN (
    'has_part', 'located_in', 'owns', 'leads', 'supplies',
    'opposes', 'competes_with', 'regulates'
  )),
  CONSTRAINT entity_relations_no_self CHECK (source_entity_id <> target_entity_id)
);

CREATE UNIQUE INDEX entity_relations_unique_idx
  ON entity_relations (source_entity_id, target_entity_id, relation_type);
CREATE INDEX entity_relations_target_idx
  ON entity_relations (target_entity_id);

-- ── Facets on claims (multi-label) ──────────────────────────────────────
ALTER TABLE claim_envelopes ADD COLUMN IF NOT EXISTS facets TEXT[] DEFAULT NULL;
CREATE INDEX IF NOT EXISTS claim_envelopes_facets_idx
  ON claim_envelopes USING gin (facets) WHERE facets IS NOT NULL;
