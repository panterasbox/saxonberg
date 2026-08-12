/**
 * ⭐ **The facet completeness gate**, asserted against the **real seed
 * corpus** rather than a fixture.
 *
 * The whole point of the facets is that the client stops keying
 * filters, badges and mute rules on hardcoded topic strings. That only
 * holds if *every* topic answers *every* facet — a facet that is
 * sometimes absent puts the fallback back in the client, which is the
 * defect this build exists to remove. A fixture-based test would pass
 * happily while a real seed shipped without them, so this reads the
 * seed directory.
 *
 * See `docs/subsystems/topics.md`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const SEED_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../seeds/obj/Topic'
);

const ADDRESSES = ['direct', 'personal', 'ambient', 'broadcast'];
const ACTORS = ['self', 'person', 'world', 'system'];
const WEIGHTS = ['consequence', 'activity', 'chatter', 'diagnostic'];
const AUDIENCES = ['player', 'author', 'all'];

interface Seed {
  file: string;
  topic: string;
  data: Record<string, unknown>;
}

function seeds(): Seed[] {
  return readdirSync(SEED_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((file) => {
      const doc = YAML.parse(readFileSync(join(SEED_DIR, file), 'utf-8')) as {
        data?: Record<string, unknown>;
      };
      return {
        file,
        topic: String(doc?.data?.topic ?? ''),
        data: doc?.data ?? {},
      };
    });
}

describe('topic seeds — every topic answers every facet', () => {
  it('the corpus is non-trivial (guards against an empty glob)', () => {
    // The corpus is 37 rows after the taxonomy replacement (was 89).
    // Floor guards a mis-pathed seed directory, not a size target.
    expect(seeds().length).toBeGreaterThan(30);
  });

  it('every seed carries all five facets', () => {
    const missing: string[] = [];
    for (const s of seeds()) {
      for (const facet of [
        'address',
        'actor',
        'weight',
        'audience',
        'durable',
      ]) {
        if (s.data[facet] === undefined) missing.push(`${s.topic}.${facet}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every facet value is in its vocabulary', () => {
    const bad: string[] = [];
    for (const s of seeds()) {
      const check = (facet: string, allowed: string[]): void => {
        const v = s.data[facet];
        if (typeof v !== 'string' || !allowed.includes(v)) {
          bad.push(`${s.topic}.${facet} = ${JSON.stringify(v)}`);
        }
      };
      check('address', ADDRESSES);
      check('actor', ACTORS);
      check('weight', WEIGHTS);
      check('audience', AUDIENCES);
      if (typeof s.data.durable !== 'boolean') {
        bad.push(`${s.topic}.durable = ${JSON.stringify(s.data.durable)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('topic seeds — the facets carry information the path does not', () => {
  it('the speech family splits three ways on address', () => {
    // The case the tree structurally cannot express: one family, three
    // different answers to "who is this aimed at". If these ever
    // collapse to one value, the facet has stopped earning its place.
    //
    // ⚠ This test is why `speech.quiet` exists as its own leaf rather
    // than folding into `speech.vocal` with say and shout. `address` is
    // a facet OF THE TOPIC, so one topic can hold exactly one value —
    // and a whisper aimed at you must not inherit a shout's
    // `broadcast`, or it stops earning a notification. Say and shout DO
    // share a topic: they differ in reach, not in who they are aimed
    // at, and `meta.acousticDb` (60 / 90) already carries reach on the
    // frame. A per-frame address override would let all three share one
    // topic; until that exists, this split is the honest cost of a
    // topic-scoped facet.
    const by = new Map(seeds().map((s) => [s.topic, s.data]));
    expect(by.get('speech.vocal')?.address).toBe('broadcast');
    expect(by.get('speech.quiet')?.address).toBe('personal');
    expect(by.get('speech.comms')?.address).toBe('direct');
  });

  it('a measurement is durable; ambient texture is not', () => {
    const by = new Map(seeds().map((s) => [s.topic, s.data]));
    // A reading is a fact with a timestamp — true forever.
    expect(
      by.get('sense.reading')?.durable
    ).toBe(true);
    // What the room smelled like is not worth a transcript line.
    expect(by.get('sense.surroundings')?.durable).toBe(false);
  });

  it('quiet mode is one rule, not a list of paths', () => {
    // `weight <= activity` must actually partition the corpus, or the
    // facet is decorative. Both sides have to be populated.
    const all = seeds();
    const loud = all.filter((s) =>
      ['consequence', 'activity'].includes(String(s.data.weight))
    );
    const quiet = all.filter((s) =>
      ['chatter', 'diagnostic'].includes(String(s.data.weight))
    );
    expect(loud.length).toBeGreaterThan(0);
    expect(quiet.length).toBeGreaterThan(0);
  });

  it('the authoring shell is the only author-audience family', () => {
    for (const s of seeds()) {
      if (s.data.audience === 'author') {
        expect(s.topic).toBe('shell.diagnostic');
      }
    }
  });
});
