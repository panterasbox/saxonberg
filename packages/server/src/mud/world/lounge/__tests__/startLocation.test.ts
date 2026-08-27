/**
 * Phase C — `startLocation` spawn instruction, recover-and-warn
 * placement, room self-registration, and recall save-delegation.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LoungeWarren from '../idea/LoungeWarren';
import Lounge from '../location/Lounge';
import Avatar from '../../../platform/agent/Avatar';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { PersistableApi } from '../../../api/persistable';
import { ParcelApi } from '../../../api/parcel';
import { PersistableMixin } from '../../../lib/persistence/Persistable';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { Idea } from '../../../lib/stuff/Idea';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';
import { installStore, loungeDocs } from './lounge-fixtures';

describe('startLocation spawn instruction + recover-and-warn', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('Avatar auto-registers `startLocation` as an instruction field (hydrator auto-dispatch gate)', () => {
    expect(MixinApi.getAllInstructionFields(Avatar)).toContain('startLocation');
    // `container` (from ContainableMixin) is still there — additive.
    expect(MixinApi.getAllInstructionFields(Avatar)).toContain('container');
  });

  it('applyStartLocation(Warren) lands the avatar in the lazy host; the Warren is never the container (AC 1)', async () => {
    installStore(loungeDocs());
    const avatar = makeStuff(() => new Avatar());

    await (
      avatar as unknown as { applyStartLocation(ref: string): Promise<void> }
    ).applyStartLocation(LoungeWarren.WARREN_PATH);

    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host = await warren.getHost();
    expect((avatar as unknown as { getContainer(): unknown }).getContainer()).toBe(
      host,
    );
    expect(host).toBeInstanceOf(Lounge);
    // The container is a root Location, never the Warren.
    expect(
      (avatar as unknown as { getContainer(): unknown }).getContainer(),
    ).not.toBe(warren);
  });

  it('singletonOrClone reuses a singleton target', async () => {
    installStore(loungeDocs());
    const a = await StuffApi.singletonOrClone(LoungeWarren.BAR_PATH);
    const b = await StuffApi.singletonOrClone(LoungeWarren.BAR_PATH);
    expect(a).toBe(b); // Bar composes SingletonMixin → singleton reuse
  });

  it('singletonOrClone clones a fresh instance for a non-singleton target', async () => {
    installStore(loungeDocs());
    // Lounge is non-singleton → a fresh clone each call.
    const first = await StuffApi.singletonOrClone(LoungeWarren.LOUNGE_TEMPLATE);
    const second = await StuffApi.singletonOrClone(LoungeWarren.LOUNGE_TEMPLATE);
    expect(first).toBeInstanceOf(Lounge);
    expect(second).toBeInstanceOf(Lounge);
    expect(first).not.toBe(second);
  });

  it('a stray Lounge clone self-registers with its declared Warren and becomes host on first getHost (AC 14)', async () => {
    installStore(loungeDocs());
    // Clone a lounge room directly (no Warren landing yet). It self-
    // registers via applyWarren, creating the Warren singleton if absent.
    const stray = await StuffApi.clone<Lounge>(LoungeWarren.LOUNGE_TEMPLATE);
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    expect(warren.hasMember(stray as unknown as Stuff & Container)).toBe(true);
    // First getHost designates the stray as host (heals into the graph).
    const host = await warren.getHost();
    expect(host).toBe(stray);
    expect(warren.isCurrentHost(stray as unknown as Stuff & Container)).toBe(
      true,
    );
  });
});

describe('recall placement capture in the persistence spine', () => {
  // A persistable Containable host standing in for an avatar. Its
  // `PersistedRecord.place` carries the WarrenMember-reconciled recall
  // location — the logic the retired `snapshotToTemplate` once wrote to the
  // avatar template, now on `PersistableLogic.capturePlacement`.
  class SnapHost extends PersistableMixin(ContainableMixin(Idea)) {}

  beforeEach(() => {
    StuffApi.clearAll();
    // The recall-placement resolution is independent of parcel title; pin a
    // deterministic owner so capture doesn't touch the parcel registry.
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({
      kind: 'group',
      name: 'lounge',
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('an avatar in a lounge room captures place.startLocation=<Warren>, no container (AC 5)', async () => {
    const store = installStore(loungeDocs());
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host = await warren.getHost();
    const snap = makeStuffAtPath(() => new SnapHost(), '/platform/agent/Avatar/snap');
    ContainmentApi.move(snap as never, host as unknown as Stuff & Container);

    await PersistableApi.capture(snap as unknown as Stuff);
    const rec = store.find(
      (d) => (d as Record<string, unknown>).scope === '/platform/agent/Avatar/snap',
    ) as Record<string, unknown> | undefined;
    expect(rec?.place).toEqual({ startLocation: LoungeWarren.WARREN_PATH });
  });

  it('an avatar in an ordinary room captures place.container, no startLocation (regression)', async () => {
    const store = installStore(loungeDocs());
    // Dave's Bar — a plain singleton room, NOT a Warren member — so the
    // capture keeps ordinary container behavior.
    const bar = await StuffApi.singleton<Stuff & Container>(
      LoungeWarren.BAR_PATH,
    );
    const snap = makeStuffAtPath(() => new SnapHost(), '/platform/agent/Avatar/snap2');
    ContainmentApi.move(snap as never, bar);

    await PersistableApi.capture(snap as unknown as Stuff);
    const rec = store.find(
      (d) => (d as Record<string, unknown>).scope === '/platform/agent/Avatar/snap2',
    ) as Record<string, unknown> | undefined;
    expect(rec?.place).toEqual({ container: LoungeWarren.BAR_PATH });
  });
});
