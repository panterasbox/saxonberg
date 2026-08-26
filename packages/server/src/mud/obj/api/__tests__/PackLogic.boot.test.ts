/**
 * The `boot:` union (content-packs wave 3, D5): every applied pack's
 * eager-at-boot templates, in install order, with cross-pack `dependsOn`
 * carried through to `BootstrapManager`; a failed pack contributes
 * nothing; counts by role are reported; a template listed twice is an
 * error naming both packs; the manifest reader rejects a bad role, a
 * missing reason and an `awaitInit` key.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../api/pack';
import { StuffApi } from '../../../api/stuff';
import { DiagnosticApi } from '../../../api/diagnostics';
import { BootstrapManager } from '../../../../backend/BootstrapManager';
import type { Stuff } from '../../../lib/stuff/Stuff';
import {
  stubPersist,
  stubClassResolution,
  quietConsole,
  recordOf,
  writePack,
  cleanupPacks,
} from './pack-harness';

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
  vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

const ROW = (rel: string) => ({ rel, data: { name: rel } });
const ENTRY = (template: string, role: 'sync-read' | 'producer', dependsOn?: string[]) => ({
  template,
  role,
  reason: `${template} must be live`,
  ...(dependsOn ? { dependsOn } : {}),
});

describe('the boot union', () => {
  it('unions two packs\' lists in install order, topo-sorts cross-pack dependsOn, reports counts by role', async () => {
    const platform = writePack('platform', [ROW('obj/EventRegistry.yaml'), ROW('obj/GroupRegistry.yaml')], {
      manifest: { boot: [ENTRY('/obj/EventRegistry', 'sync-read'), ENTRY('/obj/GroupRegistry', 'sync-read')] },
    });
    const world = writePack('world-seed', [ROW('domain/lounge/terminal.yaml')], {
      dependsOn: ['platform'],
      manifest: { boot: [ENTRY('/domain/lounge/terminal', 'producer', ['/obj/GroupRegistry'])] },
    });
    const [rp, rw] = await PackApi.install([world, platform]);
    expect(rp!.boot).toEqual({ 'sync-read': 2, producer: 0 });
    expect(rw!.boot).toEqual({ 'sync-read': 0, producer: 1 });
    expect(recordOf('world-seed')!.boot).toEqual([ENTRY('/domain/lounge/terminal', 'producer', ['/obj/GroupRegistry'])]);

    const union = await PackApi.bootManifest([platform, world]);
    expect(union).toEqual([
      { templatePath: '/obj/EventRegistry', packId: 'platform', role: 'sync-read' },
      { templatePath: '/obj/GroupRegistry', packId: 'platform', role: 'sync-read' },
      { templatePath: '/domain/lounge/terminal', packId: 'world-seed', role: 'producer', dependsOn: ['/obj/GroupRegistry'] },
    ]);

    // And BootstrapManager runs it in dependency order.
    const calls: string[] = [];
    vi.spyOn(StuffApi, 'clone').mockImplementation(async (p: string) => {
      calls.push(p);
      return { templatePath: p } as unknown as Stuff;
    });
    vi.spyOn(StuffApi, 'findAllByTemplatePath').mockReturnValue([]);
    await BootstrapManager.run([union[2]!, union[0]!, union[1]!]);
    expect(calls.indexOf('/obj/GroupRegistry')).toBeLessThan(calls.indexOf('/domain/lounge/terminal'));
  });

  it('a failed pack contributes no entries', async () => {
    const ok = writePack('a', [ROW('obj/A.yaml')], { manifest: { boot: [ENTRY('/obj/A', 'sync-read')] } });
    const bad = writePack('b', [{ rel: 'obj/B.yaml', class: '/obj/DoesNotExist' }], {
      manifest: { boot: [ENTRY('/obj/B', 'producer')] },
    });
    const [, rb] = await PackApi.install([ok, bad]);
    expect(rb!.failure?.step).toBe('requires-kernel');
    expect(recordOf('b')!.boot).toEqual([]);
    expect(await PackApi.bootManifest([ok, bad])).toEqual([{ templatePath: '/obj/A', packId: 'a', role: 'sync-read' }]);
  });

  it('a template listed by two packs is an error naming both', async () => {
    const a = writePack('a', [ROW('obj/A.yaml')], { manifest: { boot: [ENTRY('/obj/A', 'sync-read')] } });
    const b = writePack('b', [ROW('obj/B.yaml')], { manifest: { boot: [ENTRY('/obj/A', 'producer')] } });
    await PackApi.install([a, b]);
    await expect(PackApi.bootManifest([a, b])).rejects.toThrow(/'\/obj\/A' is listed by both pack 'a' and pack 'b'/);
  });

  it('readManifest rejects a bad role, a missing reason, and an awaitInit key', async () => {
    const badRole = writePack('r', [ROW('obj/A.yaml')], { manifest: { boot: [{ template: '/obj/A', role: 'eager', reason: 'x' }] } });
    await expect(PackApi.install([badRole])).rejects.toThrow(/role must be sync-read or producer/);
    const noReason = writePack('n', [ROW('obj/A.yaml')], { manifest: { boot: [{ template: '/obj/A', role: 'producer' }] } });
    await expect(PackApi.install([noReason])).rejects.toThrow(/needs a 'reason'/);
    const awaitInit = writePack('w', [ROW('obj/A.yaml')], {
      manifest: { boot: [{ template: '/obj/A', role: 'producer', reason: 'x', awaitInit: 'no' }] },
    });
    await expect(PackApi.install([awaitInit])).rejects.toThrow(/unknown key 'awaitInit'/);
  });
});
