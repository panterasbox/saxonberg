/**
 * Template inheritance at the pack boundary.
 *
 * ⭐ Three rules, and each of them fails LOUDLY on purpose: a pack may
 * ship a class-less child; a parent must be shipped by this pack or a
 * pack it `dependsOn`; and a parent may not be reaped out from under
 * its children.
 */
import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../../api/pack';
import { DiagnosticApi } from '../../../../api/diagnostics';
import {
  stubPersist,
  stubClassResolution,
  quietConsole,
  contentRows,
  recordOf,
  writePack,
  cleanupPacks,
  store,
  MATERIAL,
  HYDRATOR,
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

describe('a pack ships child rows', () => {
  it('installs a class-less child beside its parent', async () => {
    const root = writePack('platform', [
      { rel: 'platform/thing/can.yaml', data: { name: 'a can' } },
      {
        rel: 'platform/thing/can-of-cola.yaml',
        extends: '/platform/thing/can',
        data: { name: 'a can of cola' },
      },
    ], { root: '/platform' });
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.error ?? '').toBe('');
    const child = contentRows().find((x) => x.path === '/platform/thing/can-of-cola');
    expect(child).toBeDefined();
    // The row stores what the AUTHOR wrote: a parent and a delta, no class.
    expect(child!.extends).toBe('/platform/thing/can');
    expect(child!.class).toBeUndefined();
  });

  it('refuses a row that states neither a class nor a parent', async () => {
    const root = writePack('platform', [], { root: '/platform' });
    const { writeFileSync, mkdirSync } = await import('fs');
    const { join, dirname } = await import('path');
    const file = join(root, 'content/platform/thing/lonely.yaml');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, 'data:\n  name: lonely\n');
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.error ?? '').toMatch(/missing a string 'class'/);
  });
});

describe('a parent must be reachable', () => {
  it('⚠ fails the boot when the parent is in a pack this one does not depend on', async () => {
    const base = writePack('base', [
      { rel: 'stuff/thing/can.yaml', class: MATERIAL, hydratorClass: HYDRATOR, data: {} },
    ], { root: '/stuff' });
    const dependent = writePack('drinks', [
      { rel: 'trade/drinks/thing/cola.yaml', extends: '/stuff/thing/can', data: {} },
    ], { root: '/trade/drinks' });
    const results = await PackApi.install([base, dependent]);
    const failed = results.find((x) => x.failure);
    expect(failed?.failure?.error ?? '').toMatch(/does not depend on it/);
  });

  it('passes once the dependency is declared', async () => {
    const base = writePack('base', [
      { rel: 'stuff/thing/can.yaml', class: MATERIAL, hydratorClass: HYDRATOR, data: {} },
    ], { root: '/stuff' });
    const dependent = writePack('drinks', [
      { rel: 'trade/drinks/thing/cola.yaml', extends: '/stuff/thing/can', data: {} },
    ], { root: '/trade/drinks', dependsOn: ['base'] });
    const results = await PackApi.install([base, dependent]);
    expect(results.every((x) => !x.failure)).toBe(true);
  });

  it('names a parent no pack ships', async () => {
    const root = writePack('platform', [
      { rel: 'platform/thing/cola.yaml', extends: '/platform/thing/ghost', data: {} },
    ], { root: '/platform' });
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.error ?? '').toMatch(/which no pack in this install set ships/);
  });
});

describe('a parent is not reaped out from under its children', () => {
  it('⭐⭐ plans a deleted-vs-extended conflict rather than deleting', async () => {
    const root = writePack('platform', [
      { rel: 'platform/thing/can.yaml', data: {} },
    ], { root: '/platform' });
    await PackApi.install([root]);
    expect(contentRows().some((r) => r.path === '/platform/thing/can')).toBe(true);

    // A CMS-authored child — nobody's pack ships it, so the installer
    // cannot see it in any file and would otherwise reap its parent.
    store.rows.push({
      __col: 'content',
      _id: 'cms-child',
      path: '/test/parlor/cola',
      extends: '/platform/thing/can',
      data: {},
    });

    // The parent's FILE vanishes.
    const { rmSync } = await import('fs');
    const { join } = await import('path');
    rmSync(join(root, 'content/platform/thing/can.yaml'));
    await PackApi.install([root]);

    expect(contentRows().some((r) => r.path === '/platform/thing/can')).toBe(true);
    const conflicts = recordOf('platform')?.conflicts ?? [];
    expect(conflicts[0]).toMatchObject({ reason: 'deleted-vs-extended' });
    expect(conflicts[0]!.detail).toMatch(/\/test\/parlor\/cola/);
  });

  it('⚠ a pack that drops a parent its OWN rows still extend fails earlier, at the gate', async () => {
    // Not the conflict path: `assertParentsResolve` runs before reconcile,
    // and a shipped child whose parent file is gone is a broken pack, not
    // an operator edit to reconcile against.
    const root = writePack('platform', [
      { rel: 'platform/thing/can.yaml', data: {} },
      { rel: 'platform/thing/cola.yaml', extends: '/platform/thing/can', data: {} },
    ], { root: '/platform' });
    await PackApi.install([root]);
    const { rmSync } = await import('fs');
    const { join } = await import('path');
    rmSync(join(root, 'content/platform/thing/can.yaml'));
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.error ?? '').toMatch(/which no pack in this install set ships/);
  });
});
