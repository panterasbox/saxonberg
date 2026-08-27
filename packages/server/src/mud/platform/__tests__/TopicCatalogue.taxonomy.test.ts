/**
 * The taxonomy's structural invariants, asserted against the real seed
 * corpus rather than a fixture.
 *
 * ⚠ A fixture would defeat the purpose. The failure this build exists
 * to fix — 45 emitted topics with no authored descriptor — was invisible
 * precisely because everything that *examined* topics examined
 * hand-built examples that were correct by construction. These tests
 * read the platform pack's `content/platform/idea/Topic/` and the shipped `TOPIC_ROOTS`, so they fail
 * when the corpus drifts, not when a fixture does.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { TOPIC_ROOTS } from '@saxonberg/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEEDS = join(HERE, '..', '..', '..', '..', '..', 'content', 'platform', 'content', 'platform', 'idea', 'Topic');

interface SeedData {
  topic?: string;
  family?: string;
  label?: string;
  description?: string;
  address?: string;
  actor?: string;
  weight?: string;
  audience?: string;
  durable?: unknown;
  affordance?: string;
}

function loadCorpus(): Map<string, SeedData> {
  const out = new Map<string, SeedData>();
  for (const file of readdirSync(SEEDS)) {
    if (!file.endsWith('.yaml')) continue;
    const parsed = YAML.parse(readFileSync(join(SEEDS, file), 'utf8')) as {
      data?: SeedData;
    };
    out.set(file.slice(0, -'.yaml'.length), parsed.data ?? {});
  }
  return out;
}

const corpus = loadCorpus();

describe('topic taxonomy — the corpus', () => {
  it('is not empty (guards a mis-pathed seed directory)', () => {
    expect(corpus.size).toBeGreaterThan(20);
  });

  it('every key sits under one of the seven roots', () => {
    const roots = new Set<string>(TOPIC_ROOTS);
    const strays = [...corpus.keys()].filter(
      (k) => !roots.has(k.split('.')[0] ?? k)
    );
    expect(strays).toEqual([]);
  });

  it('is at most two levels deep', () => {
    // The tree carries subject matter only; anything that wanted a third
    // level is describing a facet. Depth is the symptom the 89-key
    // corpus showed: `world.perception.measurement.analyze-electrical`.
    const deep = [...corpus.keys()].filter((k) => k.split('.').length > 2);
    expect(deep).toEqual([]);
  });

  it('every root is itself seeded, so a subtree mute has a descriptor', () => {
    const missing = TOPIC_ROOTS.filter((r) => !corpus.has(r));
    expect(missing).toEqual([]);
  });

  it("every leaf's family is its parent, and that parent exists", () => {
    const broken: string[] = [];
    for (const [key, data] of corpus) {
      if (!key.includes('.')) continue;
      const parent = key.slice(0, key.lastIndexOf('.'));
      if (data.family !== parent || !corpus.has(parent)) {
        broken.push(`${key} -> family=${String(data.family)}`);
      }
    }
    // The old corpus had orphans: `world.twitch.message` existed while
    // `world.twitch` did not, so a subtree mute could never match it.
    expect(broken).toEqual([]);
  });
});

describe('topic taxonomy — facets are authored, never inferred', () => {
  const FACETS = [
    'address',
    'actor',
    'weight',
    'audience',
    'durable',
    'affordance',
  ] as const;

  it('every topic authors all six facets explicitly', () => {
    const gaps: string[] = [];
    for (const [key, data] of corpus) {
      for (const facet of FACETS) {
        if (data[facet] === undefined) gaps.push(`${key}.${facet}`);
      }
    }
    // Authored-not-derived is the S1 rule: two derivations of one facet
    // drifted within an hour of both existing. A missing facet would
    // silently take the floor and read as a deliberate choice.
    expect(gaps).toEqual([]);
  });

  it('every topic has a label and a description', () => {
    const bare = [...corpus.entries()]
      .filter(([, d]) => !d.label || !d.description)
      .map(([k]) => k);
    expect(bare).toEqual([]);
  });

  it('no description is the derived placeholder', () => {
    const placeholder = [...corpus.entries()]
      .filter(([, d]) => d.description === '(no description)')
      .map(([k]) => k);
    expect(placeholder).toEqual([]);
  });
});

describe('topic taxonomy — the tree carries subject, not facets', () => {
  it('no leaf is named after an address, actor, weight or audience', () => {
    // The governing rule, mechanized. `world.speech.whisper` was a
    // topic; whisper is an ADDRESS. `system.*` was a subtree; system is
    // an ACTOR. If a leaf name collides with a facet VALUE, the tree is
    // re-encoding something the facets already carry.
    const facetValues = new Set([
      'direct',
      'personal',
      'ambient',
      'broadcast',
      'self',
      'person',
      'world',
      'system',
      'consequence',
      'activity',
      'chatter',
      'player',
      'author',
      'all',
    ]);
    const offenders = [...corpus.keys()]
      .filter((k) => k.includes('.'))
      .filter((k) => facetValues.has(k.slice(k.lastIndexOf('.') + 1)));
    expect(offenders).toEqual([]);
  });

  it('no leaf is named after a verb', () => {
    // 15 of the old 89 were named for the command that produced them
    // (`analyze-electrical`, `measure-altitude`, `weigh`). A topic says
    // what arrived, not which verb caused it — otherwise every new verb
    // is a new topic, which is how the corpus reached 89.
    const verbish = [...corpus.keys()].filter((k) =>
      /\.(analyze|measure|weigh|look|scry|find|locate|listen|smell|taste|feel)\b/.test(
        k
      )
    );
    expect(verbish).toEqual([]);
  });
});
