'use strict';

/**
 * lib/proto/passkey-credential.js — the PasskeyCredential CLASS (the
 * Boundary wave).
 *
 * A PasskeyCredential is one WebAuthn authenticator enrolled against a
 * Principal — a public key the user proves possession of. It sits beside
 * AuthSession on the boundary and is NOT the same kind of thing: an
 * AuthSession is one ephemeral login (a hashed token that expires), a
 * PasskeyCredential is a durable per-device key that MINTS logins and
 * outlives every one of them. Principal ◆ PasskeyCredential ◆→ AuthSession.
 *
 * Why the constructor is strict. Every field here is fed straight back to
 * the WebAuthn verifier on the next login, and every way of getting one
 * wrong fails the SAME way months later: "signature invalid", with nothing
 * naming the cause. So the shapes that cannot be recovered from are refused
 * at construction (rule 14) — a base64 credential id that should be
 * base64url, a public key handed over as text instead of bytes, an origin
 * passed where an RP id belongs. Registration is the only moment these are
 * cheap to fix.
 *
 * Contents: class definition.
 * Ontology: Code object M33C-0117 (immutable ref — assigned once, never edit).
 * Team: J. Brant Arseneau & the Mach33 Agents.
 */

// ── Grammar ─────────────────────────────────────────────────────────────────
// base64url is base64 with '+/' → '-_' and no '=' padding. WebAuthn speaks it
// everywhere; standard base64 reaching the DB means a credential nobody can
// ever look up, because the browser will send the base64url form on login.
const BASE64URL = /^[A-Za-z0-9_-]+$/;

// An RP id is a bare registrable domain ('33fg.ai'), never an origin. Passing
// 'https://vega.33fg.ai' is the single most common WebAuthn wiring mistake and
// it breaks every ceremony under that credential, permanently — the id is
// baked into the signature.
const RP_ID = /^[a-z0-9.-]+$/;

const DEVICE_TYPES = ['singleDevice', 'multiDevice'];

// ── The class ───────────────────────────────────────────────────────────────
class PasskeyCredential {
  /**
   * @param {object} raw — { user, credential_id, public_key, nickname, rp_id,
   *   counter?, transports?, device_type?, backed_up?, aaguid?, created_at?,
   *   last_used_at? }
   * @throws {Error} OEP violations — construction fails loud on bad data.
   */
  constructor(raw) {
    raw = raw || {};

    if (raw.credential_id != null && !BASE64URL.test(String(raw.credential_id))) {
      throw new Error('[proto:passkey-credential] credential_id must be base64url ' +
        '(no +, /, or = padding) — the browser sends this form on every login');
    }
    // Bytes, not text. SimpleWebAuthn hands back a Uint8Array and wants one
    // back; a base64 string round-trips through pg without complaint and then
    // fails verification with no clue attached.
    if (raw.public_key != null &&
        !(raw.public_key instanceof Uint8Array || Buffer.isBuffer(raw.public_key))) {
      throw new Error('[proto:passkey-credential] public_key must be bytes ' +
        '(Buffer/Uint8Array), got ' + typeof raw.public_key);
    }
    if (raw.public_key != null && raw.public_key.length === 0) {
      throw new Error('[proto:passkey-credential] public_key is empty');
    }
    if (raw.rp_id != null && !RP_ID.test(String(raw.rp_id))) {
      throw new Error('[proto:passkey-credential] rp_id must be a bare domain ' +
        'like "33fg.ai" — an origin (scheme, port, or path) is not an RP id');
    }
    if (raw.counter != null &&
        (!Number.isInteger(raw.counter) || raw.counter < 0)) {
      throw new Error('[proto:passkey-credential] counter must be a non-negative integer');
    }
    if (raw.device_type != null && DEVICE_TYPES.indexOf(raw.device_type) < 0) {
      throw new Error('[proto:passkey-credential] device_type must be one of ' +
        DEVICE_TYPES.join(' | '));
    }
    if (raw.transports != null && !Array.isArray(raw.transports)) {
      throw new Error('[proto:passkey-credential] transports must be an array');
    }

    const violations = require('./classes').ontology()
      .validate(Object.assign({ '@type': 'mach33:PasskeyCredential' }, raw));
    if (violations.length) {
      throw new Error('[proto:passkey-credential] OEP violations: ' +
        violations.map(function (v) { return v.code + ' — ' + v.message; }).join(' | '));
    }

    Object.assign(this, raw);
    if (this.counter == null) this.counter = 0;
    // Freeze the array too — a shallow freeze would leave transports mutable,
    // and it is read back into allowCredentials on every login.
    if (Array.isArray(this.transports)) Object.freeze(this.transports);
    Object.freeze(this);
  }

  // ── Construction from the store ───────────────────────────────────────────
  /**
   * Build from a user_passkeys row. pg returns bigint as a STRING (counter
   * would arrive as '5'), which would make every comparison below a string
   * comparison and quietly defeat clone detection at 10 vs 9. One place
   * converts it.
   * @param {object} row — a user_passkeys row.
   */
  static fromRow(row) {
    row = row || {};
    return new PasskeyCredential({
      id:           row.id,
      user:         row.user_id != null ? String(row.user_id) : undefined,
      credential_id: row.credential_id,
      public_key:   row.public_key,
      counter:      row.counter != null ? Number(row.counter) : 0,
      transports:   row.transports || undefined,
      device_type:  row.device_type || undefined,
      backed_up:    !!row.backed_up,
      aaguid:       row.aaguid || undefined,
      nickname:     row.nickname,
      rp_id:        row.rp_id,
      created_at:   row.created_at,
      last_used_at: row.last_used_at
    });
  }

  // ── Behavior ──────────────────────────────────────────────────────────────
  /**
   * The clone gate. A signature counter that fails to advance is WebAuthn's
   * one built-in signal that a credential may have been copied off its
   * hardware, and the login must be refused and audited.
   *
   * The 0/0 exemption is not a loophole: authenticators are permitted to not
   * implement a counter and always report 0 (Apple's do). Treating a stored 0
   * and an incoming 0 as a regression would lock out every iPhone user, so a
   * credential that has never counted is accepted and simply gains no clone
   * detection — which is the spec's own position.
   * @param {number} next — signCount from the assertion just verified.
   */
  acceptsCounter(next) {
    if (!Number.isInteger(next) || next < 0) return false;
    if (this.counter === 0 && next === 0) return true;   // counter not implemented
    return next > this.counter;
  }

  /**
   * The credential as verifyAuthenticationResponse() wants it (SimpleWebAuthn
   * v13's `credential` argument — v9's `authenticator`, renamed). The adapter
   * lives here so the field mapping exists once (rule 11).
   */
  verificationInput() {
    return {
      id: this.credential_id,
      publicKey: this.public_key,
      counter: this.counter,
      transports: this.transports || undefined
    };
  }

  /**
   * The PublicKeyCredentialDescriptor form — what allowCredentials (login)
   * and excludeCredentials (don't enroll the same key twice) both take.
   */
  descriptor() {
    return {
      id: this.credential_id,
      type: 'public-key',
      transports: this.transports || undefined
    };
  }

  /** Synced to a keychain, so surviving the loss of this device. */
  isSynced() { return this.device_type === 'multiDevice' && !!this.backed_up; }

  /**
   * The display string. Says whether the passkey is synced or bound to one
   * device, because that is the fact a user needs when deciding whether it is
   * safe to delete — an unbacked-up single-device key is the last copy.
   */
  label() {
    return this.nickname + (this.isSynced() ? ' (synced)' : ' (this device only)');
  }
}

module.exports = PasskeyCredential;
