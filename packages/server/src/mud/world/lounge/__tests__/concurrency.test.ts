/**
 * Phase F — concurrency / hardening. Burst landings yield one Warren +
 * one host + bounded buds; concurrent first-resolution dedups; forced
 * host destruction mid-flight leaves exactly one host; teardown→rebuild
 * is idempotent.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LoungeWarren from '../LoungeWarren';
import Avatar from '../../../platform/agent/Avatar';
import { StuffApi } from '../../../api/stuff';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import { installStore, loungeDocs } from './lounge-fixtures';

type WarrenInternals = LoungeWarren & {
  spawnMember(): Promise<Stuff & Container>;
};

async function land(): Promise<Avatar> {
  const avatar = makeStuff(() => new Avatar());
  await (
    avatar as unknown as { applyStartLocation(r: string): Promise<void> }
  ).applyStartLocation(LoungeWarren.WARREN_PATH);
  return avatar;
}

describe('lounge concurrency hardening', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installStore(loungeDocs());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('concurrent first-resolution of the singleton Warren yields one identical instance (Risk 7)', async () => {
    const [a, b, c] = await Promise.all([
      StuffApi.singleton<LoungeWarren>(LoungeWarren.WARREN_PATH),
      StuffApi.singleton<LoungeWarren>(LoungeWarren.WARREN_PATH),
      StuffApi.singleton<LoungeWarren>(LoungeWarren.WARREN_PATH),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(StuffApi.findAllByTemplatePath(LoungeWarren.WARREN_PATH)).toHaveLength(
      1,
    );
  });

  it('a burst of concurrent landings creates exactly one Warren and one host (AC 1, Risk 7/8)', async () => {
    const avatars = await Promise.all([land(), land(), land(), land(), land()]);
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    // One Warren, one host.
    expect(StuffApi.findAllByTemplatePath(LoungeWarren.WARREN_PATH)).toHaveLength(
      1,
    );
    const host = await warren.getHost();
    const members = warren.getMembers();
    expect(warren.isCurrentHost(host)).toBe(true);
    expect(members.filter((m) => warren.isCurrentHost(m))).toHaveLength(1);
    // Every avatar landed somewhere in the graph.
    for (const av of avatars) {
      const container = (
        av as unknown as { getContainer(): Stuff & Container | null }
      ).getContainer();
      expect(container).not.toBeNull();
      expect(members).toContain(container);
    }
  });

  it('concurrent buds never collide on the shared template clone (Risk 8)', async () => {
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    await warren.getHost();
    // Fire several member creations concurrently; the per-Warren
    // serialization chain keeps the shared-path clones from colliding.
    const sats = await Promise.all([
      (warren as WarrenInternals).spawnMember(),
      (warren as WarrenInternals).spawnMember(),
      (warren as WarrenInternals).spawnMember(),
    ]);
    expect(new Set(sats).size).toBe(3); // three distinct rooms
    for (const s of sats) {
      expect((s as Stuff).isDestroyed()).toBe(false);
      expect(warren.hasMember(s)).toBe(true);
    }
  });

  it('forced host destruction then a landing leaves exactly one host (AC 8)', async () => {
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host = await warren.getHost();
    await (warren as WarrenInternals).spawnMember(); // a survivor exists

    StuffApi.destruct(host as unknown as Stuff);
    // Concurrent landings after the host died → migrate to the survivor,
    // exactly one host.
    await Promise.all([land(), land()]);
    const members = warren.getMembers();
    expect(members.filter((m) => warren.isCurrentHost(m))).toHaveLength(1);
    expect((host as Stuff).isDestroyed()).toBe(true);
  });

  it('teardown → rebuild is idempotent across repeated cycles (AC 4)', async () => {
    for (let i = 0; i < 3; i++) {
      const warren = await StuffApi.singleton<LoungeWarren>(
        LoungeWarren.WARREN_PATH,
      );
      const host = await warren.getHost();
      expect(warren.getMembers()).toEqual([host]);
      warren.teardown();
      expect(warren.getMembers()).toHaveLength(0);
    }
    // Still exactly one Warren after the churn — never duplicated.
    expect(StuffApi.findAllByTemplatePath(LoungeWarren.WARREN_PATH)).toHaveLength(
      1,
    );
  });
});
