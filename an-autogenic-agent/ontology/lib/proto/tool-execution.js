'use strict';

/**
 * lib/proto/tool-execution.js — the ToolExecution CLASS (the action audit).
 *
 * A ToolExecution is a record of one tool invocation — input, output,
 * success, duration. Grown via Proto.executeTool (which wraps the runtime
 * config.tools functions, times them, and records win or lose) into a
 * capped ledger, glass-boxed at /api/tools/executions.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0078 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class ToolExecution {
  /**
   * @param {object} raw — { tool, ok, input?, output?, duration_ms?,
   *                         error?, session?, at?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (typeof raw.ok !== 'boolean') {
      throw new Error('[proto:tool-execution] ok must be true or false — an execution has an outcome');
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:ToolExecution' }, raw));
    if (violations.length) {
      throw new Error('[proto:tool-execution] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    Object.freeze(this);
  }

  label() {
    return this.tool + (this.ok ? ' \u2713' : ' \u2717') +
      (this.duration_ms != null ? ' (' + this.duration_ms + 'ms)' : '');
  }
}

module.exports = ToolExecution;
