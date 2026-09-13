#!/usr/bin/env node
'use strict';

/**
 * Standalone verifyChain() for the M33-VEGA-INST-001 JSONL.
 * Algorithm copied from lib/vega-instrumentation.js (mach33-platform
 * 1ac5daff): hash = sha256(prev_hash + '|' + JSON.stringify(payload))
 * where payload = {seq, ts, category, metric, value, unit, context}.
 *
 * Usage:
 *   node verify-chain.js vega-instrumentation.log.jsonl
 */

const fs = require('fs');
const crypto = require('crypto');

const GENESIS_PREV = '0'.repeat(64);

function hashRecord(prevHash, payload) {
  const h = crypto.createHash('sha256');
  h.update(prevHash);
  h.update('|');
  h.update(JSON.stringify(payload));
  return h.digest('hex');
}

function verifyChain(logPath) {
  const raw = fs.readFileSync(logPath, 'utf8');
  const records = raw.split(/\n/).filter(Boolean).map((l) => JSON.parse(l));
  let prev = GENESIS_PREV;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.prev_hash !== prev) {
      return { ok: false, brokenAt: r.seq, reason: 'prev_hash mismatch' };
    }
    const expected = hashRecord(prev, {
      seq: r.seq, ts: r.ts, category: r.category, metric: r.metric,
      value: r.value, unit: r.unit, context: r.context
    });
    if (expected !== r.hash) {
      return { ok: false, brokenAt: r.seq, reason: 'hash mismatch' };
    }
    if (r.seq !== i + 1) {
      return { ok: false, brokenAt: r.seq, reason: 'seq gap' };
    }
    prev = r.hash;
  }
  return { ok: true, count: records.length, head: prev };
}

const file = process.argv[2] || require('path').join(__dirname, 'vega-instrumentation.log.jsonl');
const result = verifyChain(file);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
