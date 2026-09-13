'use strict';

/**
 * lib/proto/artifact.js — the Artifact CLASS (the documents workspace).
 *
 * An Artifact is an exported, durable work product — a URI the work
 * left the building as. Grown via Proto.recordArtifact.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0089 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── The class ───────────────────────────────────────────────────────────────
class Artifact {
  /**
   * @param {object} raw — { kind, uri, draft?, at?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Artifact' }, raw));
    if (violations.length) {
      throw new Error('[proto:artifact] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);

    Object.freeze(this);
  }

  label() { return this.kind + ': ' + this.uri; }
}

module.exports = Artifact;
