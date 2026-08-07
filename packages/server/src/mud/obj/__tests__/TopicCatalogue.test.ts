/**
 * TopicCatalogue tests — three-tier resolution, cache load from
 * mongo, and singleton destruct refusal.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TopicCatalogue from '../TopicCatalogue';
import Topic from '../Topic';
import { StuffApi } from '../../api/stuff';
import { ShadowApi } from '../../api/shadow';
import { Template } from '../../lib/stuff/Template';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

interface TopicSeedData {
  topic: string;
  family: string;
  label: string;
  description: string;
  communicative?: boolean;
  address?: string;
  actor?: string;
  weight?: string;
  audience?: string;
  durable?: boolean;
  affordance?: string;
}

/**
 * The facets a topic gets when the seed authored none and the family
 * prefix matches no derivation rule — the conservative floor. An
 * unknown frame should be quiet, not loud.
 */
const FLOOR = {
  address: 'ambient',
  actor: 'system',
  weight: 'diagnostic',
  audience: 'all',
  durable: false,
  // `decays` rather than `permanent`: a wrongly-permanent affordance is
  // a dead link the UI presents as live.
  affordance: 'decays',
} as const;


/**
 * Stub `Template.findDescendants` to return a synthetic list of
 * Topic templates. The catalogue's `postRegister` reads `tpl.data`
 * directly off each one — no actual `Template._materialize` round
 * trip needed.
 */
function stubTopicTemplates(seeds: TopicSeedData[]): void {
  vi.spyOn(Template, 'findDescendants').mockImplementation(
    async (basePath: string) => {
      if (basePath !== Topic.TEMPLATE_PATH_PREFIX) return [];
      return seeds.map((seed) => ({
        path: `${Topic.TEMPLATE_PATH_PREFIX}${seed.topic}`,
        data: seed,
      })) as unknown as Template[];
    },
  );
}

async function warmCatalogue(
  seeds: TopicSeedData[],
): Promise<TopicCatalogue> {
  stubTopicTemplates(seeds);
  const cat = makeStuff(() => new TopicCatalogue());
  await cat.postRegister();
  return cat;
}

describe('TopicCatalogue', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an authored descriptor verbatim when one exists', async () => {
    const cat = await warmCatalogue([
      {
        topic: 'speech.vocal',
        family: 'speech',
        label: 'Say',
        description: 'Speaking aloud.',
      },
    ]);
    const d = cat.getDescriptor('speech.vocal');
    expect(d).toEqual({
      topic: 'speech.vocal',
      family: 'speech',
      label: 'Say',
      description: 'Speaking aloud.',
      // No facets authored on this seed. The runtime does NOT
      // re-derive from the family prefix — that derivation is baked
      // into the seeds by scripts/derive-topic-facets.ts — so an
      // un-authored seed lands on the conservative floor.
      ...FLOOR,
    });
  });

  it('isCommunicative reflects the data flag (and excludes the rest)', async () => {
    const cat = await warmCatalogue([
      {
        topic: 'speech.vocal',
        family: 'speech',
        label: 'Say',
        description: '',
        communicative: true,
      },
      {
        topic: 'speech.comms',
        family: 'speech',
        label: 'DM',
        description: '',
      },
    ]);
    expect(cat.isCommunicative('speech.vocal')).toBe(true);
    expect(cat.isCommunicative('speech.comms')).toBe(false); // private
    expect(cat.isCommunicative('unseeded.topic')).toBe(false);
  });

  it('inherits from the nearest authored family ancestor when the leaf is unseeded', async () => {
    const cat = await warmCatalogue([
      {
        topic: 'shell',
        family: '',
        label: 'Your terminal',
        description: 'Per-command log emissions.',
      },
    ]);
    // A leaf nobody seeded, under a seeded root. This tier is what
    // keeps a pack-added leaf readable before its descriptor is known,
    // and what the `topic.unauthored` diagnostic reports on.
    const d = cat.getDescriptor('shell.unseeded');
    expect(d).toEqual({
      topic: 'shell.unseeded',
      family: 'shell',
      label: 'Your terminal (Unseeded)',
      description: 'Per-command log emissions.',
      // The leaf inherits the ancestor's attention shape along with
      // its prose. The ancestor was seeded facet-less, so it holds the
      // floor and passes that down.
      ...FLOOR,
    });
  });

  it('falls back to the derived default when no authored ancestor exists', async () => {
    const cat = await warmCatalogue([]);
    const d = cat.getDescriptor('something.weird.unknown');
    expect(d).toEqual({
      topic: 'something.weird.unknown',
      family: 'something.weird',
      label: 'Unknown',
      description: '(no description)',
      // Matches no family rule -> the conservative floor. An unknown
      // topic must never earn a push or survive in a transcript.
      ...FLOOR,
    });
  });

  it('derived fallback handles a single-segment topic (no family)', async () => {
    const cat = await warmCatalogue([]);
    const d = cat.getDescriptor('chatter');
    expect(d).toEqual({
      topic: 'chatter',
      family: '',
      label: 'Chatter',
      description: '(no description)',
      ...FLOOR,
    });
  });

  it('getSnapshot returns only the authored descriptors (no derived shapes)', async () => {
    const cat = await warmCatalogue([
      { topic: 'world', family: '', label: 'World', description: 'In-world events.' },
      {
        topic: 'speech',
        family: 'world',
        label: 'Speech',
        description: 'Speech-family events.',
      },
    ]);
    const snap = cat.getSnapshot();
    expect(snap).toHaveLength(2);
    const byTopic = new Map(snap.map((d) => [d.topic, d]));
    expect(byTopic.get('world')?.label).toBe('World');
    expect(byTopic.get('speech')?.label).toBe('Speech');
  });

  it('invalidateCache + re-warm picks up new templates', async () => {
    const cat = await warmCatalogue([
      { topic: 'world', family: '', label: 'World', description: 'World events.' },
    ]);
    expect(cat.getDescriptor('world').label).toBe('World');

    // Swap the stub to include an additional topic, invalidate, re-warm.
    stubTopicTemplates([
      { topic: 'world', family: '', label: 'World', description: 'World events.' },
      {
        topic: 'speech',
        family: 'world',
        label: 'Speech',
        description: 'Speech-family.',
      },
    ]);
    cat.invalidateCache();
    await cat.postRegister();

    expect(cat.getDescriptor('speech').label).toBe('Speech');
  });

  it('canDestruct refuses (singleton)', async () => {
    const cat = await warmCatalogue([]);
    const result = cat.canDestruct();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('singleton');
    }
  });

  it('falls through to fallback resolution when postRegister was never awaited', () => {
    // Bypass the helper — never call postRegister, never warm cache.
    const cat = makeStuff(() => new TopicCatalogue());
    const d = cat.getDescriptor('any.topic.here');
    expect(d.label).toBe('Here');
    expect(d.description).toBe('(no description)');
  });
});
