/**
 * BootstrapManager unit tests. We mock `StuffApi.clone` so we don't
 * need a live database — the manager's real responsibility is
 * dep-ordering and clone orchestration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BootstrapManager } from '../BootstrapManager';
import { StuffApi } from '../../mud/api/stuff';
import { ShadowApi } from '../../mud/api/shadow';
import { EventApi } from '../../mud/api/event';
import { Events } from '../../mud/lib/events';
import { Template } from '../../mud/lib/stuff/Template';
import type { BootstrapEntry } from '../../mud/bootstrap';
import type { Stuff } from '../../mud/lib/stuff/Stuff';
import type { EventRegistry } from '../../mud/obj/EventRegistry';

function stubClone(): { calls: string[] } {
  const calls: string[] = [];
  vi.spyOn(StuffApi, 'clone').mockImplementation(
    async (templatePath: string) => {
      calls.push(templatePath);
      return { templatePath } as unknown as Stuff;
    }
  );
  return { calls };
}

describe('BootstrapManager.run', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing on an empty manifest', async () => {
    const { calls } = stubClone();
    await BootstrapManager.run([]);
    expect(calls).toEqual([]);
  });

  it('clones a single entry', async () => {
    const { calls } = stubClone();
    await BootstrapManager.run([{ templatePath: '/obj/A' }]);
    expect(calls).toEqual(['/obj/A']);
  });

  it('orders entries by dependsOn', async () => {
    const { calls } = stubClone();
    const manifest: BootstrapEntry[] = [
      { templatePath: '/obj/B', dependsOn: ['/obj/A'] },
      { templatePath: '/obj/A' },
    ];
    await BootstrapManager.run(manifest);
    expect(calls).toEqual(['/obj/A', '/obj/B']);
  });

  it('handles diamond dependencies', async () => {
    const { calls } = stubClone();
    const manifest: BootstrapEntry[] = [
      { templatePath: '/obj/D', dependsOn: ['/obj/B', '/obj/C'] },
      { templatePath: '/obj/B', dependsOn: ['/obj/A'] },
      { templatePath: '/obj/C', dependsOn: ['/obj/A'] },
      { templatePath: '/obj/A' },
    ];
    await BootstrapManager.run(manifest);
    // A first, D last; B and C between in either order.
    expect(calls[0]).toBe('/obj/A');
    expect(calls[3]).toBe('/obj/D');
    expect(calls.slice(1, 3).sort()).toEqual(['/obj/B', '/obj/C']);
  });

  it('throws on dependency cycles', async () => {
    stubClone();
    const manifest: BootstrapEntry[] = [
      { templatePath: '/obj/A', dependsOn: ['/obj/B'] },
      { templatePath: '/obj/B', dependsOn: ['/obj/A'] },
    ];
    await expect(BootstrapManager.run(manifest)).rejects.toThrow(/cycle/);
  });

  it('throws on a missing dependsOn', async () => {
    stubClone();
    const manifest: BootstrapEntry[] = [
      { templatePath: '/obj/A', dependsOn: ['/obj/Missing'] },
    ];
    await expect(BootstrapManager.run(manifest)).rejects.toThrow(
      /not in the manifest/
    );
  });

  it('runs awaitInit after the clone for that entry', async () => {
    stubClone();
    const order: string[] = [];
    const manifest: BootstrapEntry[] = [
      {
        templatePath: '/obj/A',
        awaitInit: async () => {
          order.push('init-A');
        },
      },
      {
        templatePath: '/obj/B',
        dependsOn: ['/obj/A'],
        awaitInit: async () => {
          order.push('init-B');
        },
      },
    ];
    await BootstrapManager.run(manifest);
    expect(order).toEqual(['init-A', 'init-B']);
  });

  it('propagates awaitInit rejections', async () => {
    stubClone();
    const manifest: BootstrapEntry[] = [
      {
        templatePath: '/obj/Bad',
        awaitInit: async () => {
          throw new Error('init-failed');
        },
      },
    ];
    await expect(BootstrapManager.run(manifest)).rejects.toThrow(/init-failed/);
  });

  it('throws with a helpful message when clone fails', async () => {
    vi.spyOn(StuffApi, 'clone').mockRejectedValue(new Error('no template'));
    await expect(
      BootstrapManager.run([{ templatePath: '/obj/Missing' }])
    ).rejects.toThrow(/Missing/);
  });

  it('throws on duplicate templatePath', async () => {
    stubClone();
    const manifest: BootstrapEntry[] = [
      { templatePath: '/obj/A' },
      { templatePath: '/obj/A' },
    ];
    await expect(BootstrapManager.run(manifest)).rejects.toThrow(/duplicate/);
  });
});

describe('BootstrapManager + EventRegistry integration', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clones the EventRegistry template and exposes it via findByTemplatePath', async () => {
    // Stub the Template lookup so we don't need a live Mongo
    // connection — return what the seeded YAML would produce.
    vi.spyOn(Template, 'findByPath').mockImplementation(
      async (path: string) => {
        if (path === '/obj/EventRegistry') {
          const t = await StuffApi.create(() => new Template());
          t.path = path;
          t.class = '/obj/EventRegistry';
          t.hydratorClass = '/lib/persistence/PersistentHydrator';
          t.data = {};
          return t;
        }
        return null;
      }
    );

    await BootstrapManager.run([{ templatePath: '/obj/EventRegistry' }]);

    const reg = StuffApi.findByTemplatePath<EventRegistry>(
      '/obj/EventRegistry'
    );
    expect(reg).toBeDefined();

    // Every well-known event is observable through EventApi.on (the
    // legitimate Get-gated path). Get-gating denies direct
    // checkProp from outside the bus, so we exercise the bus.
    for (const name of Object.values(Events)) {
      const sub = EventApi.on(name, () => {});
      expect(sub.eventName).toBe(name);
      sub.unsubscribe();
    }
  });
});
