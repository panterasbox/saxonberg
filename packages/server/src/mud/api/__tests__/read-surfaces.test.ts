/**
 * Wave 7's read surfaces — what survived review.
 *
 * The competence digest derives on read from `transcripts`, and
 * `lastSeen` is a plain stamped fact. Neither may grow a stored total
 * or a stored log: the ledgers own those events, and a second copy
 * would need a retention policy nobody has decided and would drift the
 * first time a ledger was written without going through it.
 *
 * These are absence scans, so they are written to be hard to satisfy
 * vacuously: they walk the real `Collections` vocabulary and the real
 * source tree rather than asserting against a list this file controls.
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { Collections } from '../../lib/persistence/Collections';

const MUD_ROOT = fileURLToPath(new URL('../..', import.meta.url));

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules') continue;
      sourceFiles(full, out);
    } else if (entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('derive-on-read, not stored', () => {
  /*
   * ⚠ The tempting implementation of "what happened while you were
   * away" is a per-character away-log. It is wrong twice over: those
   * events already live in the ledgers, and the *public* half of the
   * question is what the press subsystem is for. The private half
   * (home, mail, party/committee) is bounded and undecided — which is
   * why the roster carries `lastSeen` and no digest at all.
   */
  it('has NO away-log collection', () => {
    const names = Object.values(Collections) as string[];
    for (const forbidden of [
      'away_log',
      'awaylog',
      'away_events',
      'since_you_left',
      'character_digest',
    ]) {
      expect(names, `${forbidden} must not exist`).not.toContain(forbidden);
    }
  });

  /** The stronger form: nothing in the tree names one at all. */
  it('names no away-log anywhere in the mudlib', () => {
    const files = sourceFiles(MUD_ROOT);
    // The scan must actually be scanning — an empty walk would make
    // this pass while checking nothing.
    expect(files.length).toBeGreaterThan(500);

    const offenders: string[] = [];
    for (const file of files) {
      if (file.includes('__tests__')) continue;
      const text = readFileSync(file, 'utf8');
      if (/away_log|awayLog|since_you_left|sinceYouLeft/i.test(text)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  /*
   * The competence band is already a derivation over an append-only
   * ledger; a cached TOTAL would be a second source of truth for a
   * number the ledger owns. (The fold cache behind the digest is not
   * that — dropping it costs a recomputation and loses nothing.)
   */
  it('has no stored competence total', () => {
    const names = Object.values(Collections) as string[];
    for (const forbidden of ['competence', 'competences', 'competence_totals']) {
      expect(names).not.toContain(forbidden);
    }
  });
});
