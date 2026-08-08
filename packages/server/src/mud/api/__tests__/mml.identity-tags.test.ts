/**
 * The identity-tag vocabulary after the collapse — and the two
 * invariants that keep it honest.
 *
 * `item` / `object` / `name` are gone. `item` vs `object` split on
 * portability, which is **state** — a chair is furniture until somebody
 * picks it up — so the split was never stable and no consumer ever
 * acted on it. `name` asserted nothing at all, which is why 195
 * emitters reached for it and the wire learned nothing from any of
 * them.
 */

import { describe, it, expect } from 'vitest';
import {
  KNOWN_TAGS,
  INERT_TAGS,
  passthroughAllows,
  type TagPolicy,
} from '../mml/tags';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/** `packages/server/src/mud` — the whole mudlib. */
const MUD_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* sourceFiles(full);
    } else if (entry.name.endsWith('.ts')) {
      yield full;
    }
  }
}

const RETIRED = ['item', 'object', 'name'];
const IDENTITY_CLAIMS = ['thing', 'player', 'npc'];

describe('the collapsed vocabulary', () => {
  it('knows `thing`, and no longer knows `item` / `object` / `name`', () => {
    expect(KNOWN_TAGS.has('thing')).toBe(true);
    for (const tag of RETIRED) {
      expect(KNOWN_TAGS.has(tag)).toBe(false);
    }
  });

  it('⚠ `actor` is not a wire tag — it resolves before serialization', () => {
    // The authoring face `Mml.actor` becomes `player` or `npc` at
    // render time. If it ever reached the wire, every consumer
    // downstream would need a branch for a tag that means "ask again".
    expect(KNOWN_TAGS.has('actor')).toBe(false);
  });
});

describe('⚠⚠ identity claims are never author-writable', () => {
  it('no passthrough policy admits `thing` / `player` / `npc`', () => {
    // These are claims the composer makes **on the server\'s
    // authority**. A player who could write `<player>` could assert a
    // human being is behind a figure — the exact fact a disguise
    // exists to hide — and one who could write `<thing>` could plant a
    // clickable referring to an object that is not there.
    const policies: TagPolicy[] = ['none', 'spoiler', 'inert'];
    for (const policy of policies) {
      for (const tag of IDENTITY_CLAIMS) {
        expect(passthroughAllows(policy, tag)).toBe(false);
      }
    }
    for (const tag of IDENTITY_CLAIMS) {
      expect(INERT_TAGS.has(tag)).toBe(false);
    }
  });

  it("the wiki's 'all' policy is the one deliberate exception", () => {
    // Only because its pipeline resolves, gates and budgets what it
    // renders. Recorded here so the exception stays a decision rather
    // than an oversight.
    for (const tag of IDENTITY_CLAIMS) {
      expect(passthroughAllows('all', tag)).toBe(true);
    }
  });
});

describe('⭐ totality — the retired faces have no call sites left', () => {
  it('nothing in the tree calls Mml.name / Mml.item / Mml.object', () => {
    // The `MeasureChannel.totality` pattern: a source scan, because a
    // retired face that still compiles is a retired face that is still
    // being used. `Mml.name` had 195 call sites; a rename that missed
    // any of them would leave a tag on the wire that no client
    // renders.
    // ⚠ Skip this file. It necessarily contains the very strings it
    // hunts for, and a scan that matches itself reports a permanent
    // false positive — the same self-match that bit `lint:topics`.
    const SELF = fileURLToPath(import.meta.url);
    const offenders: string[] = [];
    for (const file of sourceFiles(MUD_ROOT)) {
      if (file === SELF) continue;
      const src = readFileSync(file, 'utf-8');
      for (const face of ['Mml.name(', 'Mml.item(', 'Mml.object(']) {
        if (src.includes(face)) {
          offenders.push(`${file.slice(MUD_ROOT.length + 1)} → ${face}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
