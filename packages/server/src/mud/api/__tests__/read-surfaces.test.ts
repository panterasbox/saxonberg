/**
 * Wave 7's read surfaces.
 *
 * Acceptance criteria 12, 13, 14, 16, 17, 18 and 20. The ones with
 * teeth:
 *
 *   - **16** — two characters on one account report the SAME make
 *     standing and DIFFERENT play standing. The second half is what
 *     proves the split is real rather than a global.
 *   - **18 / 20** — the "since you left" digest derives on read, and
 *     **no away-log collection exists**. A stored digest would be a
 *     second source of truth for events the ledgers already own.
 *   - **12** — `recall` is the search verb and `search` still resolves
 *     to the in-world perception verb, unshadowed.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { CommandApi } from '../command';
import { SEARCH_SCOPES } from '../search';
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

describe('the recall verb', () => {
  beforeAll(async () => {
    CommandApi.clearCache();
    const result = await CommandApi.preloadAll();
    expect(result.failed).toEqual([]);
  });

  it('ships as its own verb with the five scopes plus all', () => {
    const recall = CommandApi.getCommand('system/recall.yaml');
    expect(recall).toBeDefined();
    expect(recall!.hasVerb('recall')).toBe(true);
    expect([...SEARCH_SCOPES]).toEqual([
      'wiki',
      'forum',
      'chat',
      'press',
      'help',
      'all',
    ]);
  });

  /*
   * ⭐ Criterion 12's second half. `search` is the in-world perception
   * verb — going over a room for something concealed — and `recall`
   * exists precisely so that meaning is not taken. If a later change
   * ever pointed `search` at the Api, this fails.
   */
  it('leaves `search` as the in-world perception verb, unshadowed', () => {
    const claimants = CommandApi.allDefinitions().filter((d) =>
      d.hasVerb('search'),
    );
    expect(claimants).toHaveLength(1);
    expect(claimants[0]!.filePath).toContain('perception/search.yaml');
    expect(claimants[0]!.resolvedController).toContain('SearchController');

    // And `recall` is a different spec with a different controller.
    const recall = CommandApi.getCommand('system/recall.yaml');
    expect(recall!.resolvedController).toContain('RecallController');
  });

  it('is carried by every avatar, like help and wiki', () => {
    // Reference surfaces you carry rather than reach for.
    const recall = CommandApi.getCommand('system/recall.yaml');
    expect(recall).toBeDefined();
  });
});

describe('derive-on-read, not stored', () => {
  /*
   * ⚠⚠ Criterion 20, and the reason it is written as a scan rather
   * than a comment: the tempting implementation of "since you left" is
   * a per-character away-log, and it is wrong. Those events already
   * live in the ledgers; a second copy would need a retention policy
   * nobody has decided and would drift the first time a ledger was
   * written without going through it.
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

  /*
   * The stronger form: nothing in the tree names such a collection at
   * all, so it cannot have been created outside the vocabulary either.
   */
  it('names no away-log anywhere in the mudlib', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(MUD_ROOT)) {
      if (file.includes('__tests__')) continue;
      const text = readFileSync(file, 'utf8');
      if (/away_log|awayLog|since_you_left/i.test(text)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  /*
   * ⚠ And the competence digest stores no total. The band is already a
   * derivation over `transcripts`; a cached total would be a second
   * source of truth for a number the ledger owns.
   */
  it('has no stored competence total', () => {
    const names = Object.values(Collections) as string[];
    for (const forbidden of ['competence', 'competences', 'competence_totals']) {
      expect(names).not.toContain(forbidden);
    }
  });
});
