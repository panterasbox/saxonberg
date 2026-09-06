/**
 * The capability rung (content-packs, D4): a pack that ships a `src/`
 * is a capability pack; the installer CHECKS the rung rather than
 * taking a claim.
 *
 *   - a `src/`-less pack whose `class:` lies in its own namespace fails
 *     `requires-kernel` with the rung message ("claims data but ships
 *     code");
 *   - a pack with `src/thing/X.ts` and a row naming `/<id>/thing/X`
 *     installs; its record says `capability`; the class resolved into
 *     the tmp `src/`;
 *   - a pack naming another pack's class without the dependency line
 *     fails, naming both;
 *   - `dependsOn` derives from `package.json` (the harness writes it
 *     there) and orders the install;
 *   - `pack status` reports the rung, and `code: current | stale` from
 *     the recorded source hashes.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { PackApi } from '../../../../api/pack';
import { StuffApi } from '../../../../api/stuff';
import { DiagnosticApi } from '../../../../api/diagnostics';
import {
  stubPersist,
  quietConsole,
  cleanupPacks,
  writePack,
  recordOf,
  contentRows,
} from './pack-harness';

const HYDRATOR = '/platform/idea/persistence/PersistentHydrator';
const CLASS_SRC = 'export default class X {}\n';

beforeEach(() => {
  stubPersist();
  quietConsole();
  vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
  // The harness's usual class stub, widened: anything that resolves to
  // a file is a class. The rung check runs BEFORE this (it is
  // `resolveClassFile`, which is real).
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(async (p: string) => {
    if (p.includes('DoesNotExist')) throw new Error(`no blueprint at '${p}'`);
    return class {} as never;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

const ROW = (rel: string, cls: string) => ({ rel, class: cls, hydratorClass: HYDRATOR, data: { name: rel } });

describe('the rung check', () => {
  it('a src/-less pack whose class lies in its own namespace fails: claims data, ships code', async () => {
    const root = writePack('mis', [ROW('mis/thing/x.yaml', '/mis/thing/X')]);
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.step).toBe('requires-kernel');
    expect(r!.failure?.error).toMatch(
      /pack 'mis' claims data but ships code: '\/mis\/thing\/X' lies in its own namespace '\/mis' and the pack has no src\//,
    );
    expect(contentRows()).toHaveLength(0);
  });

  it('a pack with src/thing/X.ts installs as a capability pack, the class resolved into its src/', async () => {
    const root = writePack('cap', [ROW('cap/thing/x.yaml', '/cap/thing/X')], {
      src: { 'thing/X.ts': CLASS_SRC },
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.rung).toBe('capability');
    expect(r!.classOrigins['/cap/thing/X']).toBe(join(root, 'src', 'thing', 'X.ts').replace(/\\/g, '/'));
    expect(r!.classOrigins[HYDRATOR]).toBe('kernel');
    const rec = recordOf('cap')!;
    expect(rec.rung).toBe('capability');
    expect(Object.keys(rec.codeVersions)).toEqual(['thing/X.ts']);
    const status = await PackApi.status('cap', [root]);
    expect(status[0]!.rung).toBe('capability');
    expect(status[0]!.code).toBe('current');
  });

  it('a data pack whose rows name kernel classes under its own claim passes (resolution origin, not prefix)', async () => {
    const root = writePack('venue', [ROW('trade/venue/thing/x.yaml', '/platform/thing/Thing')], {
      root: '/trade/venue',
      manifest: { requires: { title: [{ extent: '/trade/venue' }] } },
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.rung).toBe('data');
    expect(r!.classOrigins['/platform/thing/Thing']).toBe('kernel');
  });

  it("a pack naming another pack's class without the dependency line fails, naming both", async () => {
    const a = writePack('alpha', [ROW('alpha/thing/x.yaml', '/alpha/thing/X')], {
      src: { 'thing/X.ts': CLASS_SRC },
    });
    const b = writePack('beta', [ROW('beta/thing/y.yaml', '/alpha/thing/X')]);
    const results = await PackApi.install([a, b]);
    const beta = results.find((r) => r.packId === 'beta')!;
    expect(beta.failure?.error).toMatch(
      /pack 'beta' names class '\/alpha\/thing\/X', which pack 'alpha' ships .* but does not depend on it/,
    );
  });

  it("with the dependency line, the class is shared and the dependency orders the install", async () => {
    const a = writePack('alpha', [ROW('alpha/thing/x.yaml', '/alpha/thing/X')], {
      src: { 'thing/X.ts': CLASS_SRC },
    });
    const b = writePack('beta', [ROW('beta/thing/y.yaml', '/alpha/thing/X')], { dependsOn: ['alpha'] });
    // Handed in reverse: the derived dependsOn puts alpha first.
    const results = await PackApi.install([b, a]);
    expect(results.map((r) => r.packId)).toEqual(['alpha', 'beta']);
    expect(results.map((r) => r.failure)).toEqual([null, null]);
    const status = await PackApi.status(undefined, [a, b]);
    expect(status.find((s) => s.packId === 'beta')!.dependsOn).toEqual(['alpha']);
  });

  it('pack status says stale once a src/ file changes on disk, and sync makes it current again', async () => {
    const root = writePack('drift', [ROW('drift/thing/x.yaml', '/drift/thing/X')], {
      src: { 'thing/X.ts': CLASS_SRC },
    });
    await PackApi.install([root]);
    writeFileSync(join(root, 'src', 'thing', 'X.ts'), 'export default class X { hum(): string { return "hum"; } }\n');
    expect((await PackApi.status('drift', [root]))[0]!.code).toBe('stale');
    const synced = await PackApi.sync('drift', root);
    expect(synced.codeReloaded).toEqual(['thing/X.ts']);
    expect((await PackApi.status('drift', [root]))[0]!.code).toBe('current');
  });

  it('a src/ class no row names is reported, never a failure', async () => {
    const root = writePack('spare', [ROW('spare/thing/x.yaml', '/spare/thing/X')], {
      src: { 'thing/X.ts': CLASS_SRC, 'thing/Unused.ts': 'export default class Unused {}\n' },
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(DiagnosticApi.record).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'pack.spare',
        message: expect.stringContaining('/spare/thing/Unused'),
      }),
    );
  });

  it('a manifest that still carries dependsOn fails at read (derived from package.json now)', async () => {
    const root = writePack('old', [ROW('old/thing/x.yaml', '/platform/thing/Thing')], {
      manifest: { dependsOn: ['platform'] },
    });
    await expect(PackApi.install([root])).rejects.toThrow(/unknown key 'dependsOn'/);
  });
});
