'use strict';

/**
 * lib/proto/capability.js — the Capability CLASS (what a faculty can DO).
 *
 * The twenty-first conversion — Wave 2 opens. A Capability is a callable
 * bound to the faculty it serves: the Action Space's unit. The 19 base
 * tools construct as inherited instances; an instance's self.tools
 * extensions validate at compose (Vega brings ~54 when she migrates).
 *
 * NOTE the deliberate split: `config.tools` on a Proto are LEGACY RUNTIME
 * FUNCTIONS (ADR 0011 — "Proto.tools[] are runtime functions"); the
 * ontology's capabilities are these DATA instances. Executable binding
 * arrives with ToolExecution (w2) — a Capability today declares, and its
 * invocations will be recorded as ToolExecutions when the wiring lands.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0043 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Capability {
  /**
   * @param {object} raw — { id, name, faculty, what, state? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Capability' }, raw));
    if (violations.length) {
      throw new Error('[proto:capability] OEP violations for "' + (raw.id || '?') + '": ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  /** Whether this capability serves a given faculty. */
  servesFaculty(facultyId) { return this.faculty === facultyId; }

  /** The roster line: "recall → memory (partial)". */
  label() {
    return this.id + ' → ' + this.faculty + (this.state && this.state !== 'live' ? ' (' + this.state + ')' : '');
  }
}

module.exports = Capability;
