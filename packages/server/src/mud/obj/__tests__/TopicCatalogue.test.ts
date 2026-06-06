/**
 * TopicCatalogue tests — three-tier resolution, cache invalidation,
 * and singleton destruct refusal.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TopicCatalogue } from '../TopicCatalogue';
import { Topic } from '../../lib/messaging/Topic';
import { StuffApi } from '../../api/stuff';
import { ShadowApi } from '../../api/shadow';
import { EventApi } from '../../api/event';
import { Events } from '../../lib/events';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';

function seedTopic(
  topic: string,
  family: string,
  label: string,
  description: string,
): Topic {
  const t = makeStuffAtPath(
    () => new Topic(),
    `${Topic.TEMPLATE_PATH_PREFIX}${topic}`,
  );
  t.setTopic(topic);
  t.setFamily(family);
  t.setLabel(label);
  t.setDescription(description);
  return t;
}

describe('TopicCatalogue', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an authored descriptor verbatim when one exists', () => {
    seedTopic(
      'world.speech.say',
      'world.speech',
      'Say',
      'Speaking aloud.',
    );
    const cat = makeStuff(() => new TopicCatalogue());

    const d = cat.getDescriptor('world.speech.say');
    expect(d).toEqual({
      topic: 'world.speech.say',
      family: 'world.speech',
      label: 'Say',
      description: 'Speaking aloud.',
    });
  });

  it('inherits from the nearest authored family ancestor when the leaf is unseeded', () => {
    seedTopic(
      'system.log.command',
      'system.log',
      'Command',
      'Per-command log emissions.',
    );
    const cat = makeStuff(() => new TopicCatalogue());

    const d = cat.getDescriptor('system.log.command.info');
    expect(d).toEqual({
      topic: 'system.log.command.info',
      family: 'system.log.command',
      label: 'Command (Info)',
      description: 'Per-command log emissions.',
    });
  });

  it('falls back to the derived default when no authored ancestor exists', () => {
    const cat = makeStuff(() => new TopicCatalogue());
    const d = cat.getDescriptor('something.weird.unknown');
    expect(d).toEqual({
      topic: 'something.weird.unknown',
      family: 'something.weird',
      label: 'Unknown',
      description: '(no description)',
    });
  });

  it('derived fallback handles a single-segment topic (no family)', () => {
    const cat = makeStuff(() => new TopicCatalogue());
    const d = cat.getDescriptor('chatter');
    expect(d).toEqual({
      topic: 'chatter',
      family: '',
      label: 'Chatter',
      description: '(no description)',
    });
  });

  it('getSnapshot returns only the authored descriptors (no derived shapes)', () => {
    seedTopic('world', '', 'World', 'In-world events.');
    seedTopic('world.speech', 'world', 'Speech', 'Speech-family events.');
    const cat = makeStuff(() => new TopicCatalogue());

    const snap = cat.getSnapshot();
    expect(snap).toHaveLength(2);
    const byTopic = new Map(snap.map((d) => [d.topic, d]));
    expect(byTopic.get('world')?.label).toBe('World');
    expect(byTopic.get('world.speech')?.label).toBe('Speech');
  });

  it('invalidateCache drops the cache so the next access rebuilds', () => {
    seedTopic('world', '', 'World', 'World events.');
    const cat = makeStuff(() => new TopicCatalogue());

    expect(cat.getDescriptor('world').label).toBe('World');

    // Add a new topic and invalidate.
    seedTopic('world.speech', 'world', 'Speech', 'Speech-family.');
    cat.invalidateCache();

    expect(cat.getDescriptor('world.speech').label).toBe('Speech');
  });

  it('canDestruct refuses (singleton)', () => {
    const cat = makeStuff(() => new TopicCatalogue());
    const result = cat.canDestruct();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('singleton');
    }
  });

  describe('HMR-aware cache invalidation', () => {
    /**
     * postRegister subscribes to Events.StuffCreated and
     * Events.StuffDestructed. We capture the listeners via an
     * EventApi.on spy, then invoke them directly with synthetic
     * payloads to verify the path-prefix filter. This avoids the
     * full BootstrapManager wiring.
     */
    type Listener = (payload: unknown, ctx: unknown) => void;

    async function captureListeners(): Promise<{
      created: Listener;
      destructed: Listener;
      cat: TopicCatalogue;
    }> {
      const captured: Record<string, Listener> = {};
      const sub = { eventName: '', unsubscribe: () => {} };
      vi.spyOn(EventApi, 'on').mockImplementation(
        ((name: unknown, listener: unknown) => {
          captured[name as string] = listener as Listener;
          return sub as never;
        }) as never,
      );
      const cat = makeStuff(() => new TopicCatalogue());
      await cat.postRegister();
      return {
        created: captured[Events.StuffCreated]!,
        destructed: captured[Events.StuffDestructed]!,
        cat,
      };
    }

    it('invalidates on a StuffCreated whose templatePath is under /lib/messaging/Topic/', async () => {
      const { created, cat } = await captureListeners();
      cat.getSnapshot();
      const spy = vi.spyOn(cat, 'invalidateCache');

      created(
        {
          stuffId: 'fake-id',
          templatePath: '/lib/messaging/Topic/new.topic',
        },
        {},
      );
      expect(spy).toHaveBeenCalled();
    });

    it('does NOT invalidate on a StuffCreated outside the Topic prefix', async () => {
      const { created, cat } = await captureListeners();
      cat.getSnapshot();
      const spy = vi.spyOn(cat, 'invalidateCache');

      created(
        { stuffId: 'fake-id', templatePath: '/domain/void' },
        {},
      );
      expect(spy).not.toHaveBeenCalled();
    });

    it('does NOT invalidate when StuffCreated carries no templatePath', async () => {
      const { created, cat } = await captureListeners();
      cat.getSnapshot();
      const spy = vi.spyOn(cat, 'invalidateCache');

      created({ stuffId: 'fake-id' }, {});
      expect(spy).not.toHaveBeenCalled();
    });

    it('invalidates on a StuffDestructed for a Topic instance', async () => {
      const { destructed, cat } = await captureListeners();
      // Seed a Topic and warm the cache.
      const t = seedTopic('foo', '', 'Foo', 'A topic.');
      cat.getSnapshot();
      const spy = vi.spyOn(cat, 'invalidateCache');

      destructed({ stuffId: t.stuffId }, {});
      expect(spy).toHaveBeenCalled();
    });
  });
});
