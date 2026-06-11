/**
 * Phase C — `startLocation` spawn instruction, recover-and-warn
 * placement, room self-registration, and recall save-delegation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LoungeWarren from '../LoungeWarren';
import LoungeRoom from '../LoungeRoom';
import Avatar from '../../../obj/Avatar';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { TemplateApi } from '../../../api/template';
import { ContainableMixin } from '../../spatial/Containable';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
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
    expect(host).toBeInstanceOf(LoungeRoom);
    // The container is a root Location, never the Warren.
    expect(
      (avatar as unknown as { getContainer(): unknown }).getContainer(),
    ).not.toBe(warren);
  });

  it('resolveOrCloneForPlacement reuses a singleton room', async () => {
    installStore(
      loungeDocs([
        {
          path: '/domain/lounge/bar',
          class: '/lib/multilocation/LoungeShell',
          hydratorClass: '/lib/persistence/PersistentHydrator',
          data: { shortDescription: "Dave's" },
        } as Doc,
      ]),
    );
    const a = await StuffApi.resolveOrCloneForPlacement(LoungeWarren.BAR_PATH);
    const b = await StuffApi.resolveOrCloneForPlacement(LoungeWarren.BAR_PATH);
    expect(a).toBe(b); // singleton reuse
  });

  it('recover-and-warn: a non-singleton target with no live instance warns and clones a fresh instance', async () => {
    installStore(loungeDocs());
    const warnings: unknown[] = [];
    const orig = console.warn;
    console.warn = (...a) => warnings.push(a);
    let placed: unknown;
    try {
      // LoungeRoom is non-singleton; with 0 live instances the resolver
      // warns and clones a fresh one rather than calling singleton().
      placed = await StuffApi.resolveOrCloneForPlacement(
        LoungeWarren.LOUNGE_TEMPLATE,
      );
    } finally {
      console.warn = orig;
    }
    expect(placed).toBeInstanceOf(LoungeRoom);
    expect(
      warnings.some((w) =>
        String((w as unknown[])[0]).includes('recover-and-warn'),
      ),
    ).toBe(true);
  });

  it('a stray LoungeRoom clone self-registers with its declared Warren and becomes host on first getHost (AC 14)', async () => {
    installStore(loungeDocs());
    // Clone a lounge room directly (no Warren landing yet). It self-
    // registers via applyWarren, creating the Warren singleton if absent.
    const stray = await StuffApi.cloneInstance<LoungeRoom>(
      LoungeWarren.LOUNGE_TEMPLATE,
    );
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
    // Place the host in the campus (a plain singleton room, not a member).
    const campus = await StuffApi.singleton<Stuff & Container>(
      LoungeWarren.CAMPUS_PATH,
    );
    const snap = makeStuffAtPath(() => new SnapHost(), '/obj/Avatar/snap2');
    ContainmentApi.move(snap as never, campus);

    const tpl = await TemplateApi.snapshotToTemplate(snap as unknown as Stuff);
    expect(tpl.data.container).toBe(LoungeWarren.CAMPUS_PATH);
    expect('startLocation' in tpl.data).toBe(false);
  });
});
