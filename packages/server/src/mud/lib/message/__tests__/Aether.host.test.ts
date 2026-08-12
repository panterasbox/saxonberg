/**
 * AetherMixin host side — the hosting relation chokepoints
 * (`hostUpdate`/`unhostUpdate`), the source-of-truth collection, and
 * the must-be-hosted orphan invariant.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { AetherMixin, type AetherHost } from '../Aether';
import { AetherHostedMixin } from '../../augmentation/AetherHosted';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestUpdate extends AetherHostedMixin(Idea) {}
class TestHost extends AetherMixin(Idea) {}

function host(): TestHost & AetherHost {
  return makeStuff(() => new TestHost()) as unknown as TestHost & AetherHost;
}

describe('AetherMixin hosting relation', () => {
  it('hostUpdate wires both sides', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    h.hostUpdate(u);
    expect(u.getHost()).toBe(h);
    expect(h.hostsUpdate(u)).toBe(true);
    expect(h.getHostedUpdates()).toContain(u);
  });

  it('hostUpdate is idempotent', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    h.hostUpdate(u);
    h.hostUpdate(u);
    expect(h.getHostedUpdates().length).toBe(1);
  });

  it('unhostUpdate with no other host destructs the orphan', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    h.hostUpdate(u);
    expect(h.unhostUpdate(u)).toBe(true);
    expect(h.hostsUpdate(u)).toBe(false);
    expect(h.getHostedUpdates().length).toBe(0);
    expect(u.isDestroyed()).toBe(true);
  });

  it('unhostUpdate of a non-hosted update is a no-op', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    expect(h.unhostUpdate(u)).toBe(false);
    expect(u.isDestroyed()).toBe(false);
  });

  it('post-spawn gain then lose', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    h.hostUpdate(u);
    expect(h.hostsUpdate(u)).toBe(true);
    h.unhostUpdate(u);
    expect(h.hostsUpdate(u)).toBe(false);
  });

  it('the host collection is the source of truth — a stray setHost cannot forge membership', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    // Forge the back-ref without going through the chokepoint.
    u.setHost(h as unknown as Stuff & AetherHost);
    expect(h.hostsUpdate(u)).toBe(false);
    expect(h.getHostedUpdates()).not.toContain(u);
  });

  it('destructing the host destructs its hosted updates', () => {
    const h = host();
    const u = makeStuff(() => new TestUpdate());
    h.hostUpdate(u);
    StuffApi.destruct(h as unknown as Stuff);
    expect(u.isDestroyed()).toBe(true);
  });
});
