/**
 * Phase C — `startLocation` spawn instruction, recover-and-warn
 * placement, room self-registration, and recall save-delegation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LoungeWarren from '../LoungeWarren';
import Lounge from '../Lounge';
import Avatar from '../../../obj/Avatar';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { TemplateApi } from '../../../api/template';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { Idea } from '../../../lib/stuff/Idea';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';
import {
  installStore,
  loungeDocs,
  type Doc,
} from './lounge-fixtures';

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

  it('resolveOrClone reuses a singleton target', async () => {
    installStore(loungeDocs());
    const a = await StuffApi.resolveOrClone(LoungeWarren.BAR_PATH);
    const b = await StuffApi.resolveOrClone(LoungeWarren.BAR_PATH);
    expect(a).toBe(b); // Bar composes SingletonMixin → singleton reuse
  });

  it('resolveOrClone clones a fresh instance for a non-singleton target', async () => {
    installStore(loungeDocs());
    // Lounge is non-singleton → a fresh clone each call.
    const first = await StuffApi.resolveOrClone(LoungeWarren.LOUNGE_TEMPLATE);
    const second = await StuffApi.resolveOrClone(LoungeWarren.LOUNGE_TEMPLATE);
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

describe('recall save-delegation in snapshotToTemplate', () => {
  // A minimal Containable host standing in for an avatar's snapshot.
  class SnapHost extends ContainableMixin(Idea) {}

  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('an avatar in a lounge room persists startLocation=<Warren> and drops container (AC 5)', async () => {
    installStore(
      loungeDocs([
        { path: '/obj/Avatar/snap', class: '/obj/Avatar', data: {} } as Doc,
      ]),
    );
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host = await warren.getHost();
    const snap = makeStuffAtPath(() => new SnapHost(), '/obj/Avatar/snap');
    ContainmentApi.move(snap as never, host as unknown as Stuff & Container);

    const tpl = await TemplateApi.snapshotToTemplate(snap as unknown as Stuff);
    expect(tpl.data.startLocation).toBe(LoungeWarren.WARREN_PATH);
    expect('container' in tpl.data).toBe(false);
  });

  it('an avatar in an ordinary room persists container and drops startLocation (regression)', async () => {
    installStore(
      loungeDocs([
        { path: '/obj/Avatar/snap2', class: '/obj/Avatar', data: {} } as Doc,
      ]),
    );
    // Place the host in Dave's Bar — a plain singleton room, NOT a
    // Warren member — so the snapshot keeps ordinary container behavior.
    const bar = await StuffApi.singleton<Stuff & Container>(
      LoungeWarren.BAR_PATH,
    );
    const snap = makeStuffAtPath(() => new SnapHost(), '/obj/Avatar/snap2');
    ContainmentApi.move(snap as never, bar);

    const tpl = await TemplateApi.snapshotToTemplate(snap as unknown as Stuff);
    expect(tpl.data.container).toBe(LoungeWarren.BAR_PATH);
    expect('startLocation' in tpl.data).toBe(false);
  });
});
