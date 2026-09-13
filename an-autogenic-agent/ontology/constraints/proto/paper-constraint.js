// ============================================================================
//  PaperConstraint — the base class every paper-authoring rule inherits.
//
//  The paper's §II.B argues that structure should be declared, not left
//  latent. Its own constraint catalog was for a while a markdown table that
//  Newton had to string-parse. That was latent structure. This class is the
//  self-eating fix: constraints become ontology instances, validated at
//  construction against a declared schema, enum-locked where they can be.
//
//  Discipline mapping (per §II.B):
//    Meta — this catalog is a Meta.PaperConstraint tree. Sub-classes attach
//           to Meta.CompositionRule / Meta.MunichCriticism / Meta.MergeItem /
//           Meta.AutomaticCheck.
//
//  Field-by-field (mandatory unless marked optional):
//    id           — stable identifier ("C1", "N3", "comp:abstract:001", "auto:pages")
//    discipline   — which of the 8 discipline packages the rule belongs to;
//                   for the constraint catalog itself always "Meta"
//    subclass     — the concrete subclass name; see SUBCLASSES enum
//    rule_text    — the human-readable rule as it lives in the paper docs
//    source       — where the rule came from (enum-locked in the subclass;
//                   e.g., "SPJ", "IEEE Style", "Munich #90A"). Not a URL.
//    severity     — P1 credibility-critical / P2 substantive / P3
//                   presentation / info (informational only)
//    status       — where the rule sits: open / closed / dissolved /
//                   blocked / na / resolved
//    kind         — Do / Don't
//    verifier     — optional callable name (e.g., "checkVoiceCompliance",
//                   "checkPageCount"); when set, marks the rule as
//                   auto-checkable and points at the function that decides.
//    section      — optional §-refs the rule applies to (e.g. ["II.B","IV.D"])
//    added_at     — ISO date when the rule entered the catalog
//    updated_at   — ISO date of last edit
//
//  Every enum value is a closed list. Widening any of them requires a schema
//  migration in the same discipline as the enum being widened (§II.B rule).
// ============================================================================

const SUBCLASSES = ["CompositionRule", "MunichCriticism", "MergeItem", "AutomaticCheck"];
const SEVERITIES = ["P1", "P2", "P3", "info"];
const STATUSES   = ["open", "closed", "dissolved", "blocked", "na", "resolved"];
const KINDS      = ["Do", "Don't"];
const DISCIPLINES = ["Anatomy", "Physiology", "Psychology", "Ontogeny",
                     "Sociology", "Epistemics", "Authorship", "Meta"];

// Validate one candidate row against the class schema. Returns
// { ok:true } or { ok:false, errors:[…] }.
function validate(inst) {
  const errors = [];
  const req    = (k, ok, msg) => { if (!ok) errors.push(`${k}: ${msg}`); };
  const enums  = (k, v, allowed) => req(k, allowed.includes(v), `expected one of ${allowed.join("|")}, got ${JSON.stringify(v)}`);
  req("id",           typeof inst.id === "string" && inst.id.length,            "required string");
  enums("discipline", inst.discipline, DISCIPLINES);
  enums("subclass",   inst.subclass,   SUBCLASSES);
  req("rule_text",    typeof inst.rule_text === "string" && inst.rule_text.length, "required string");
  req("source",       typeof inst.source === "string" && inst.source.length,   "required string");
  enums("severity",   inst.severity,   SEVERITIES);
  enums("status",     inst.status,     STATUSES);
  enums("kind",       inst.kind,       KINDS);
  if (inst.verifier !== undefined)  req("verifier", typeof inst.verifier === "string" || inst.verifier === null, "must be string or null");
  if (inst.section !== undefined)   req("section",  Array.isArray(inst.section), "must be array of strings");
  if (inst.added_at !== undefined)  req("added_at", /^\d{4}-\d{2}-\d{2}/.test(String(inst.added_at)), "ISO date");
  if (inst.updated_at !== undefined) req("updated_at", /^\d{4}-\d{2}-\d{2}/.test(String(inst.updated_at)), "ISO date");
  return errors.length ? { ok: false, errors } : { ok: true };
}

module.exports = {
  className: "PaperConstraint",
  discipline: "Meta",
  state: "instance",              // ADR-0014 state ladder — this class constructs instances
  fields: ["id","discipline","subclass","rule_text","source","severity","status","kind","verifier","section","added_at","updated_at"],
  enums: { SUBCLASSES, SEVERITIES, STATUSES, KINDS, DISCIPLINES },
  validate,
};
