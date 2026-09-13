// ============================================================================
//  Four subclasses of PaperConstraint. Each pins a stricter enum for `source`
//  (its own authority list) and, where the rule applies to a specific rubric
//  category, exposes a `categories` enum too.
//
//  Every subclass inherits the base validate() and adds its own field checks
//  on top. Instances that fail EITHER check are rejected — same enforcement
//  discipline as the paper's §II.B database CHECK constraints.
// ============================================================================

const base = require("./paper-constraint");

// ── CompositionRule ─────────────────────────────────────────────────────────
// Rules from docs/paper-composition.md — the ~80 do/don't citation-anchored
// rules for scientific paper composition. Sources are the 10 primary style /
// checklist authorities the file names.

const COMPOSITION_SOURCES = [
  "SPJ", "NeurIPS Checklist §1", "NeurIPS Checklist §2", "NeurIPS Checklist §3",
  "NeurIPS Checklist §4", "NeurIPS Checklist §5", "NeurIPS Checklist §6",
  "NeurIPS Checklist §7", "NeurIPS Checklist §8", "NeurIPS Checklist §9",
  "NeurIPS Checklist §10", "NeurIPS Checklist §11", "NeurIPS Checklist §12",
  "NeurIPS Checklist §13", "NeurIPS Checklist §14", "NeurIPS Checklist §15",
  "NeurIPS Checklist §16", "NeurIPS 2026 Handbook", "NeurIPS CoE",
  "ICLR 2026", "IEEE Style", "SIGSOFT Gen. Std.", "SIGSOFT Gen. Std. (desirable)",
  "SIGCOMM 2026", "MLRC 2026", "Zobel 2014",
  "SPJ; SIGCOMM 2026", "ICLR 2026; SIGCOMM 2026", "Zobel 2014; IEEE Style",
  "A, C", "A", "B-W1", "B-W2", "B-W3", "B-W4", "B-M1", "C", "A, B-W4",
];

const COMPOSITION_CATEGORIES = [
  "Thesis and positioning", "Abstract", "Introduction", "Related work",
  "Method presentation", "Claims and evidence", "Empirical rigor",
  "Threats and limitations", "Figures and tables", "Language and register",
  "Citations and references", "Reproducibility", "Mechanics",
  "Ethics and disclosures",
];

function CompositionRule(inst) {
  const b = base.validate(inst);
  const errors = b.ok ? [] : b.errors.slice();
  if (inst.subclass !== "CompositionRule") errors.push(`subclass: expected CompositionRule`);
  if (!COMPOSITION_CATEGORIES.includes(inst.category))
    errors.push(`category: expected one of ${COMPOSITION_CATEGORIES.join(",")}, got ${JSON.stringify(inst.category)}`);
  return errors.length ? { ok: false, errors } : { ok: true };
}

// ── MunichCriticism ─────────────────────────────────────────────────────────
// Reviewer objections from AgentDev 2026 (Munich): 19 C-items C1..C19.
// Source ids follow the review-comment scheme: A / B-Wn / B-Mn / C.

const MUNICH_SOURCE_TAGS = ["A", "B-W1", "B-W2", "B-W3", "B-W4", "B-M1", "C", "A, C", "A, B-W4"];
const MUNICH_STATES     = ["Dissolved", "Reshaped", "Intensified", "Persistent",
                           "Blocked", "Resolved", "Dissolved as headline",
                           "May be replaced", "Honest-partial", "CLOSED"];

function MunichCriticism(inst) {
  const b = base.validate(inst);
  const errors = b.ok ? [] : b.errors.slice();
  if (inst.subclass !== "MunichCriticism") errors.push(`subclass: expected MunichCriticism`);
  if (!/^C\d+$/.test(inst.id)) errors.push(`id: expected C<n>`);
  if (inst.merge_status && !MUNICH_STATES.includes(inst.merge_status))
    errors.push(`merge_status: expected one of ${MUNICH_STATES.join(",")}, got ${JSON.stringify(inst.merge_status)}`);
  return errors.length ? { ok: false, errors } : { ok: true };
}

// ── MergeItem ───────────────────────────────────────────────────────────────
// N1..N5 items introduced by the AgenticDev → ICA merge. No severity from
// Munich; treated as info per PaperConstraint.SEVERITIES.

function MergeItem(inst) {
  const b = base.validate(inst);
  const errors = b.ok ? [] : b.errors.slice();
  if (inst.subclass !== "MergeItem") errors.push(`subclass: expected MergeItem`);
  if (!/^N\d+$/.test(inst.id)) errors.push(`id: expected N<n>`);
  return errors.length ? { ok: false, errors } : { ok: true };
}

// ── AutomaticCheck ──────────────────────────────────────────────────────────
// Constraints Newton computes live from paper state (page count, em-dashes,
// bib coverage, broken refs, etc.). Each has a `verifier` naming the endpoint
// or function that decides pass/fail; `unit` names what's counted; `limit`
// is the numeric threshold when the check is quantitative.

const CHECK_VERIFIERS = [
  "verify_pdf", "checkVoiceCompliance", "getAbstractWordCount",
  "getPageCount", "list_bib.uncited", "list_bib.cited",
];

function AutomaticCheck(inst) {
  const b = base.validate(inst);
  const errors = b.ok ? [] : b.errors.slice();
  if (inst.subclass !== "AutomaticCheck") errors.push(`subclass: expected AutomaticCheck`);
  if (!inst.verifier || !CHECK_VERIFIERS.includes(inst.verifier))
    errors.push(`verifier: expected one of ${CHECK_VERIFIERS.join(",")}`);
  if (inst.limit !== undefined && typeof inst.limit !== "number")
    errors.push(`limit: must be number when set`);
  return errors.length ? { ok: false, errors } : { ok: true };
}

module.exports = {
  CompositionRule:  { className: "CompositionRule",  discipline: "Meta", state: "instance", extends: "PaperConstraint", enums: { COMPOSITION_SOURCES, COMPOSITION_CATEGORIES }, validate: CompositionRule },
  MunichCriticism:  { className: "MunichCriticism",  discipline: "Meta", state: "instance", extends: "PaperConstraint", enums: { MUNICH_SOURCE_TAGS, MUNICH_STATES }, validate: MunichCriticism },
  MergeItem:        { className: "MergeItem",        discipline: "Meta", state: "instance", extends: "PaperConstraint", enums: {}, validate: MergeItem },
  AutomaticCheck:   { className: "AutomaticCheck",   discipline: "Meta", state: "instance", extends: "PaperConstraint", enums: { CHECK_VERIFIERS }, validate: AutomaticCheck },
};
