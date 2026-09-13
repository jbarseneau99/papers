-- 0078_epistemic_graph.sql — Epistemic tree layer (M33-VEGA-EPGRAPH-001)
--
-- Adds the data substrate for the Epistemics toggle mode on the graph
-- canvas. The epistemic agent (Phase 4) crawls claim_envelopes and
-- belief_edges from the semantic layer, builds Toulmin-style argument
-- trees, and writes nodes + edges here. The graph toggle (Phase 6)
-- reads from these tables to render the epistemic view.
--
-- Five new tables:
--   epistemic_nodes           core node in an epistemic tree
--   epistemic_edges           typed relationships between nodes
--   epistemic_events          maturity state transition audit log
--   epistemic_consolidations  merge / link tracking
--   source_quality_rulebook   tier assignment rules for provenance scoring

BEGIN;

-- 1. epistemic_nodes — the atomic unit of the epistemic tree.
-- Each node links back to a claim_envelope (the semantic source) and
-- belongs to a tree identified by tree_id (which equals the root node's id).
CREATE TABLE IF NOT EXISTS epistemic_nodes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  envelope_id      UUID REFERENCES claim_envelopes(id) ON DELETE SET NULL,
  tree_id          UUID NOT NULL,       -- groups nodes into trees; = root node id
  parent_node_id   UUID REFERENCES epistemic_nodes(id) ON DELETE SET NULL,
  claim_type       TEXT NOT NULL CHECK (claim_type IN (
                     'root','ground','warrant','backing','contention',
                     'rebuttal','qualifier','inference','bridge')),
  maturity         TEXT NOT NULL DEFAULT 'detected' CHECK (maturity IN (
                     'detected','under_evaluation','weighed','decayed')),
  confidence       NUMERIC(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  temperature      NUMERIC(5,4),
  weight           NUMERIC(5,4),
  -- Greeks: { delta, gamma, theta, vega, lambda, rho, beta }
  greeks           JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Source provenance + quality tier: { uri, title, tier, score, retrievedAt }
  source_quality   JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Consolidation state: { isCanonical, canonicalId, priorVersions[], type }
  consolidation    JSONB NOT NULL DEFAULT '{"isCanonical": true}'::jsonb,
  -- Temporal tracking: { discoveredAt, lastEvaluatedAt, stateTransitions[], greeksHistory[] }
  temporal         JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Cross-tree references (node ids that this node also appears in as child)
  cross_references UUID[] NOT NULL DEFAULT '{}',
  -- Arbitrary metadata for extensions
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent crawl: "envelopes modified since last run" → join on envelope_id
CREATE INDEX IF NOT EXISTS epistemic_nodes_session_idx
  ON epistemic_nodes(session_id);
CREATE INDEX IF NOT EXISTS epistemic_nodes_tree_idx
  ON epistemic_nodes(tree_id);
CREATE INDEX IF NOT EXISTS epistemic_nodes_parent_idx
  ON epistemic_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS epistemic_nodes_envelope_idx
  ON epistemic_nodes(envelope_id);
CREATE INDEX IF NOT EXISTS epistemic_nodes_updated_idx
  ON epistemic_nodes(updated_at);
CREATE INDEX IF NOT EXISTS epistemic_nodes_maturity_idx
  ON epistemic_nodes(maturity);
-- For tree root lookups (claim_type = 'root')
CREATE INDEX IF NOT EXISTS epistemic_nodes_roots_idx
  ON epistemic_nodes(session_id, tree_id) WHERE claim_type = 'root';

-- 2. epistemic_edges — typed relationships between epistemic nodes.
-- The edge_type vocabulary aligns with the spec's visual encoding:
--   supporting  = ground + warrant + backing (solid blue)
--   contesting  = contention + rebuttal     (solid red)
--   inference   = inference                  (solid purple)
--   bridge      = cross-tree reference       (dashed amber)
--   parent_child = structural tree edge      (thin grey)
CREATE TABLE IF NOT EXISTS epistemic_edges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  source_node_id   UUID NOT NULL REFERENCES epistemic_nodes(id) ON DELETE CASCADE,
  target_node_id   UUID NOT NULL REFERENCES epistemic_nodes(id) ON DELETE CASCADE,
  edge_type        TEXT NOT NULL CHECK (edge_type IN (
                     'supporting','contesting','inference','bridge','parent_child')),
  weight           NUMERIC(5,4),
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_node_id <> target_node_id)
);

CREATE INDEX IF NOT EXISTS epistemic_edges_session_idx
  ON epistemic_edges(session_id);
CREATE INDEX IF NOT EXISTS epistemic_edges_source_idx
  ON epistemic_edges(source_node_id);
CREATE INDEX IF NOT EXISTS epistemic_edges_target_idx
  ON epistemic_edges(target_node_id);
-- Prevent duplicate edges of the same type between the same pair.
CREATE UNIQUE INDEX IF NOT EXISTS epistemic_edges_tuple_uidx
  ON epistemic_edges(source_node_id, target_node_id, edge_type);

-- 3. epistemic_events — maturity state transition audit log.
-- Every transition through the maturity FSM produces one row here.
-- Also used for temporal analytics (Phase 7 time-series extraction).
CREATE TABLE IF NOT EXISTS epistemic_events (
  id               BIGSERIAL PRIMARY KEY,
  node_id          UUID NOT NULL REFERENCES epistemic_nodes(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL DEFAULT 'state_transition' CHECK (event_type IN (
                     'state_transition','greeks_update','temperature_change',
                     'consolidation','cross_reference','quality_change','discovery')),
  from_state       TEXT,           -- NULL for initial 'discovery' events
  to_state         TEXT,           -- maturity state after transition
  trigger          TEXT NOT NULL,  -- e.g. 'bilateral_evidence_found', 'weight_established', 'theta_exceeded', 'fresh_validation', 'agent_crawl', 'manual'
  actor            TEXT,           -- agent name or 'user' or 'system'
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS epistemic_events_node_idx
  ON epistemic_events(node_id, created_at DESC);
CREATE INDEX IF NOT EXISTS epistemic_events_type_idx
  ON epistemic_events(event_type, created_at DESC);

-- 4. epistemic_consolidations — tracks merged and linked nodes.
-- Every consolidation decision (merge, link, or quoted-attribution) is recorded.
CREATE TABLE IF NOT EXISTS epistemic_consolidations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  canonical_id     UUID NOT NULL REFERENCES epistemic_nodes(id) ON DELETE CASCADE,
  absorbed_id      UUID NOT NULL REFERENCES epistemic_nodes(id) ON DELETE CASCADE,
  method           TEXT NOT NULL CHECK (method IN (
                     'same_source','cross_source','quoted_attribution')),
  similarity       NUMERIC(5,4),      -- cosine similarity score
  llm_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS epistemic_consolidations_session_idx
  ON epistemic_consolidations(session_id);
CREATE INDEX IF NOT EXISTS epistemic_consolidations_canonical_idx
  ON epistemic_consolidations(canonical_id);
CREATE INDEX IF NOT EXISTS epistemic_consolidations_absorbed_idx
  ON epistemic_consolidations(absorbed_id);

-- 5. source_quality_rulebook — tier assignment rules.
-- Seeded with defaults in 0079; extensible at runtime via API.
-- source_pattern is a domain or pattern matched against provenance data.
CREATE TABLE IF NOT EXISTS source_quality_rulebook (
  id               BIGSERIAL PRIMARY KEY,
  source_pattern   TEXT NOT NULL,       -- domain or pattern (e.g. 'nature.com', 'arxiv.org')
  tier             TEXT NOT NULL CHECK (tier IN ('T1','T2','T3','T4','T5')),
  kind             TEXT NOT NULL CHECK (kind IN ('academic','non_academic')),
  quality_score    NUMERIC(5,4),        -- composite quality score 0.0-1.0
  scoring          JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { citeScore, sjr, snip, h5 } for academic
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS source_quality_rulebook_pattern_uidx
  ON source_quality_rulebook(source_pattern);

COMMIT;
