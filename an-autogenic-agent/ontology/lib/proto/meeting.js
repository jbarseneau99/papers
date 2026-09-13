'use strict';

/**
 * lib/proto/meeting.js — the Meeting + Attendance CLASSES (ADR 0025).
 *
 * A Meeting is a SCHEDULED, CLOSE-ENDED session — Meeting ▷ Session with a
 * lifecycle (scheduled → live → ended → archived) and an episodic roster.
 * The calendar is a PROJECTION over Meetings and task due dates — never a
 * store (rule 11), which is what lets the Google ladder (ADR 0025 §4) climb
 * without a data migration: `google_event_id` binds time-truth outward at
 * rung 4 while episode-truth (the session, minutes, memory) stays here.
 *
 * Attendance is EPISODIC belonging — member + role + RSVP, expiring with
 * the episode — deliberately distinct from Membership (standing belonging
 * = access). Roles: participant (humans) | scribe (Relay's standing role,
 * ADR 0026) | observer.
 *
 * Validation via the shared Layer A binding; instances freeze. Lifecycle
 * movement is IMMUTABLE (the Finding/Inquiry precedent): transition()
 * returns a NEW frozen Meeting, never mutates.
 *
 * Contents: class definitions.
 * Ontology: Code object M33C-0107 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── Vocabulary (frozen) ─────────────────────────────────────────────────────
const MEETING_STATES = ['scheduled', 'live', 'ended', 'archived'];
const ATTENDANCE_ROLES = ['participant', 'scribe', 'observer'];
const RSVP_STATES = ['invited', 'accepted', 'declined', 'joined'];

// ── The Meeting class ───────────────────────────────────────────────────────
class Meeting {
  /**
   * @param {object} raw — { title, scheduled_for, host_agent, id?, user?,
   *                         ends_at?, state?, channel?, google_event_id?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (!String(raw.title || '').trim()) {
      throw new Error('[proto:meeting] title must be non-empty');
    }
    const at = new Date(raw.scheduled_for);
    if (!raw.scheduled_for || isNaN(at.getTime())) {
      throw new Error('[proto:meeting] scheduled_for must be a real time — an unscheduled meeting is just a session');
    }
    if (raw.ends_at != null) {
      const end = new Date(raw.ends_at);
      if (isNaN(end.getTime()) || end.getTime() <= at.getTime()) {
        throw new Error('[proto:meeting] ends_at must be after scheduled_for');
      }
    }
    if (!String(raw.host_agent || '').trim()) {
      throw new Error('[proto:meeting] host_agent must name the convening agent');
    }
    if (raw.state != null && MEETING_STATES.indexOf(raw.state) < 0) {
      throw new Error('[proto:meeting] state must be one of ' + MEETING_STATES.join(' | '));
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Meeting' }, raw));
    if (violations.length) {
      throw new Error('[proto:meeting] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.state == null) this.state = 'scheduled';
    Object.freeze(this);
  }

  /** The lifecycle phase the clock says — scheduled | live | ended. The
   *  stored `state` is authority (archival is a decision, not a time);
   *  phase() is the honest reading of the schedule. */
  phase(now) {
    const t = (now != null ? new Date(now) : new Date()).getTime();
    if (t < new Date(this.scheduled_for).getTime()) return 'scheduled';
    if (this.ends_at != null && t >= new Date(this.ends_at).getTime()) return 'ended';
    return 'live';
  }

  /** Immutable movement — a NEW Meeting in the next state (never mutates). */
  transition(next) {
    if (MEETING_STATES.indexOf(next) <= MEETING_STATES.indexOf(this.state)) {
      throw new Error('[proto:meeting] lifecycle only moves forward: ' + this.state + ' → ' + next + ' refused');
    }
    return new Meeting(Object.assign({}, this, { state: next }));
  }

  label() {
    return String(this.title).slice(0, 60) + ' @ ' + new Date(this.scheduled_for).toISOString()
      + ' (' + this.state + ', host ' + this.host_agent + ')';
  }
}

// ── The Attendance class ────────────────────────────────────────────────────
class Attendance {
  /**
   * @param {object} raw — { meeting, member, role?, rsvp?, origin? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};
    if (!String(raw.meeting || '').trim()) {
      throw new Error('[proto:attendance] meeting must reference the episode');
    }
    if (!String(raw.member || '').trim()) {
      throw new Error('[proto:attendance] member must be named');
    }
    if (raw.role != null && ATTENDANCE_ROLES.indexOf(raw.role) < 0) {
      throw new Error('[proto:attendance] role must be one of ' + ATTENDANCE_ROLES.join(' | '));
    }
    if (raw.rsvp != null && RSVP_STATES.indexOf(raw.rsvp) < 0) {
      throw new Error('[proto:attendance] rsvp must be one of ' + RSVP_STATES.join(' | '));
    }
    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:Attendance' }, raw));
    if (violations.length) {
      throw new Error('[proto:attendance] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }
    Object.assign(this, raw);
    if (this.role == null) this.role = 'participant';
    if (this.rsvp == null) this.rsvp = 'invited';
    Object.freeze(this);
  }

  label() { return this.member + ' @ ' + this.meeting + ' (' + this.role + ', ' + this.rsvp + ')'; }
}

module.exports = { Meeting, Attendance, MEETING_STATES, ATTENDANCE_ROLES, RSVP_STATES };
