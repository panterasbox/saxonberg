/**
 * AetherHostMixin — the hosting relation chokepoints
 * (`hostApp`/`unhostApp`), the source-of-truth collection, and
 * the must-be-hosted orphan invariant.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, vi } from 'vitest';
import { AetherHostMixin, type AetherHost } from '../AetherHost';
import { AetherHostedMixin } from '../AetherHosted';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

class TestUpdate extends AetherHostedMixin(Idea) {}
class TestHost extends AetherHostMixin(Idea) {}

function host(): TestHost & AetherHost {
  return makeStuff(() => new TestHost()) as unknown as TestHost & AetherHost;
}

describe('AetherHostMixin hosting relation', () => {
  it('hostApp wires both sides', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    h.hostApp(u);
    expect(u.getHost()).toBe(h);
    expect(h.hostsApp(u)).toBe(true);
    expect(h.getHostedApps()).toContain(u);
  });

  it('hostApp is idempotent', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    h.hostApp(u);
    h.hostApp(u);
    expect(h.getHostedApps().length).toBe(1);
  });

  it('unhostApp with no other host destructs the orphan', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    h.hostApp(u);
    expect(h.unhostApp(u)).toBe(true);
    expect(h.hostsApp(u)).toBe(false);
    expect(h.getHostedApps().length).toBe(0);
    expect(u.isDestroyed()).toBe(true);
  });

  it('unhostApp of a non-app is a no-op', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    expect(h.unhostApp(u)).toBe(false);
    expect(u.isDestroyed()).toBe(false);
  });

  it('post-spawn gain then lose', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    h.hostApp(u);
    expect(h.hostsApp(u)).toBe(true);
    h.unhostApp(u);
    expect(h.hostsApp(u)).toBe(false);
  });

  it('the host collection is the source of truth — a stray setHost cannot forge membership', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    // Forge the back-ref without going through the chokepoint.
    u.setHost(h as unknown as Stuff & AetherHost);
    expect(h.hostsApp(u)).toBe(false);
    expect(h.getHostedApps()).not.toContain(u);
  });

  it('destructing the host destructs its apps', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    h.hostApp(u);
    StuffApi.destruct(h as unknown as Stuff);
    expect(u.isDestroyed()).toBe(true);
  });
});

describe('AetherHostMixin installed list (aether-devices D2)', () => {
  // installApp clones from a row path; the clone is stubbed to a stamped
  // app so the host's own bookkeeping is what is under test.
  const A = '/platform/idea/test/app/alpha';
  const B = '/platform/idea/test/app/beta';

  it('installApp records, hosts, and is idempotent by path', async () => {
    const h = host();
    const clone = vi.spyOn(StuffApi, 'clone').mockImplementation(
      async (path: string) => {
        const u = makeStuff(() => new TestUpdate());
        stampTemplatePathForTest(u, path);
        return u as never;
      },
    );
    const a1 = await h.installApp(A);
    const a2 = await h.installApp(A);
    expect(a1).toBe(a2);
    expect(clone).toHaveBeenCalledTimes(1);
    expect(h.getInstalledApps()).toEqual([A]);
    expect(h.hasApp('alpha')).toBe(true);
    expect(h.hasApp('beta')).toBe(false);
    clone.mockRestore();
  });

  it('uninstallApp removes the record and destroys the instance', async () => {
    const h = host();
    const clone = vi.spyOn(StuffApi, 'clone').mockImplementation(
      async (path: string) => {
        const u = makeStuff(() => new TestUpdate());
        stampTemplatePathForTest(u, path);
        return u as never;
      },
    );
    const a = await h.installApp(A);
    expect(h.uninstallApp('alpha')).toBe(true);
    expect(h.hasApp('alpha')).toBe(false);
    expect(h.getHostedApps()).not.toContain(a);
    expect(a.isDestroyed()).toBe(true);
    expect(h.uninstallApp('alpha')).toBe(false);
    clone.mockRestore();
  });

  it('setInstalledApps reconciles the live set without doubling (a restore)', async () => {
    const h = host();
    const clone = vi.spyOn(StuffApi, 'clone').mockImplementation(
      async (path: string) => {
        const u = makeStuff(() => new TestUpdate());
        stampTemplatePathForTest(u, path);
        return u as never;
      },
    );
    await h.installApp(A);
    // The restore phase writes the recorded list back through the setter.
    await h.setInstalledApps([A, B]);
    expect(h.getInstalledApps()).toEqual([A, B]);
    expect(h.getHostedApps().map((u) => u.getTemplatePath())).toEqual([A, B]);
    expect(clone).toHaveBeenCalledTimes(2); // A once, B once — never A twice
    await h.setInstalledApps([B]);
    expect(h.hasApp('alpha')).toBe(false);
    expect(h.getHostedApps()).toHaveLength(1);
    clone.mockRestore();
  });
});
