/**
 * TopicCatalogue tests — three-tier resolution, cache load from
 * mongo, and singleton destruct refusal.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TopicCatalogue } from '../TopicCatalogue';
import { Topic } from '../../lib/messaging/Topic';
import { StuffApi } from '../../api/stuff';
import { ShadowApi } from '../../api/shadow';
import { Template } from '../../lib/stuff/Template';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

interface TopicSeedData {
  topic: string;
  family: string;
  label: string;
  description: string;
}

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
        topic: 'world.speech.say',
        family: 'world.speech',
        label: 'Say',
        description: 'Speaking aloud.',
      },
    ]);
    const d = cat.getDescriptor('world.speech.say');
    expect(d).toEqual({
      topic: 'world.speech.say',
      family: 'world.speech',
      label: 'Say',
      description: 'Speaking aloud.',
    });
  });

  it('inherits from the nearest authored family ancestor when the leaf is unseeded', async () => {
    const cat = await warmCatalogue([
      {
        topic: 'system.log.command',
        family: 'system.log',
        label: 'Command',
        description: 'Per-command log emissions.',
      },
    ]);
    const d = cat.getDescriptor('system.log.command.info');
    expect(d).toEqual({
      topic: 'system.log.command.info',
      family: 'system.log.command',
      label: 'Command (Info)',
      description: 'Per-command log emissions.',
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
    });
  });

  it('getSnapshot returns only the authored descriptors (no derived shapes)', async () => {
    const cat = await warmCatalogue([
      { topic: 'world', family: '', label: 'World', description: 'In-world events.' },
      {
        topic: 'world.speech',
        family: 'world',
        label: 'Speech',
        description: 'Speech-family events.',
      },
    ]);
    const snap = cat.getSnapshot();
    expect(snap).toHaveLength(2);
    const byTopic = new Map(snap.map((d) => [d.topic, d]));
    expect(byTopic.get('world')?.label).toBe('World');
    expect(byTopic.get('world.speech')?.label).toBe('Speech');
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
        topic: 'world.speech',
        family: 'world',
        label: 'Speech',
        description: 'Speech-family.',
      },
    ]);
    cat.invalidateCache();
    await cat.postRegister();

    expect(cat.getDescriptor('world.speech').label).toBe('Speech');
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
