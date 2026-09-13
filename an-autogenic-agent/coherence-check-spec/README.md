# Coherence-check event stream (design spec)

Verifies **§III.E** (Measurement: the triad check is a separate designed instrument, not `M33-VEGA-INST-001`) and **§IV.D** / Results–Threats: the stream was **designed but not populated** in the reported window.

This directory is a specification. It does **not** contain events. The live Vega event catalog (`lib/vega-events/catalog.js`) has no `coherence.*` kinds. `verifyChain()` on the INST-001 log is hash integrity, not holds/fails.

See `SPEC.md` for the predicate shape and intended event kinds.
