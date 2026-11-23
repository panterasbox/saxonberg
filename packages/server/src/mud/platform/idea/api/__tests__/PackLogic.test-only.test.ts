/**
 * The test-only gate (test-world-lifecycle D1): a pack whose manifest says
 * `testOnly: true` installs in a test environment and is refused, with a
 * line, everywhere else; `SAXONBERG_PACKS` naming it outside a test world
 * throws; and no pack a live world installs may depend on one, in any world.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../../api/pack';
import { SecurityApi } from '../../../../api/security';
import { DiagnosticApi } from '../../../../api/diagnostics';
import { stubPersist, stubClassResolution, quietConsole, writePack, cleanupPacks } from './pack-harness';

let prior: string | undefined;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  warn = quietConsole().warn;
  vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
  prior = process.env.SAXONBERG_PACKS;
});
afterEach(() => {
  if (prior === undefined) delete process.env.SAXONBERG_PACKS;
  else process.env.SAXONBERG_PACKS = prior;
  vi.restoreAllMocks();
  cleanupPacks();
});

const ROW = (rel: string) => ({ rel, data: { name: rel } });
const notATestWorld = () => vi.spyOn(SecurityApi, 'isTestEnvironment').mockReturnValue(false);
const refusedLine = (id: string) =>
  warn.mock.calls.map((c) => String(c[0])).find((l) => l.includes(`'${id}' REFUSED`));

describe('a test-only pack', () => {
  it('installs in a test environment like any pack', async () => {
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    const fixtures = writePack('fixtures', [ROW('obj/f.yaml')], { manifest: { testOnly: true } });
    const results = await PackApi.install([platform, fixtures]);
    expect(results.map((r) => r.packId)).toEqual(['platform', 'fixtures']);
    expect(refusedLine('fixtures')).toBeUndefined();
  });

  it('⭐ is refused outside a test world — not installed, and a line says so', async () => {
    notATestWorld();
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    const fixtures = writePack('fixtures', [ROW('obj/f.yaml')], { manifest: { testOnly: true } });
    const results = await PackApi.install([platform, fixtures]);
    expect(results.map((r) => r.packId)).toEqual(['platform']);
    expect(refusedLine('fixtures')).toMatch(/installs only in a test world \(SAXONBERG_TEST_WORLD=1\)$/);
  });

  it('says its rows remain when an earlier test boot installed it into this database', async () => {
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    const fixtures = writePack('fixtures', [ROW('obj/f.yaml')], { manifest: { testOnly: true } });
    await PackApi.install([platform, fixtures]);
    notATestWorld();
    await PackApi.install([platform, fixtures]);
    expect(refusedLine('fixtures')).toMatch(/; 1 row\(s\) from an earlier test boot remain in this database/);
  });

  it('is listed by `pack status` as refused (test-only) outside a test world', async () => {
    notATestWorld();
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    const fixtures = writePack('fixtures', [ROW('obj/f.yaml')], { manifest: { testOnly: true } });
    const status = await PackApi.status(undefined, [platform, fixtures]);
    expect(status.find((s) => s.packId === 'fixtures')?.refused).toBe('test-only');
    expect(status.find((s) => s.packId === 'platform')?.refused).toBeNull();
  });

  it('⛔ SAXONBERG_PACKS naming it outside a test world throws', async () => {
    notATestWorld();
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    const fixtures = writePack('fixtures', [ROW('obj/f.yaml')], { manifest: { testOnly: true } });
    process.env.SAXONBERG_PACKS = 'platform,fixtures';
    await expect(PackApi.install([platform, fixtures])).rejects.toThrow(
      /SAXONBERG_PACKS names 'fixtures', a test-only pack — this is not a test world/,
    );
  });

  it('⛔ a pack that is not test-only may not depend on one — in a test world too', async () => {
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    const fixtures = writePack('fixtures', [ROW('obj/f.yaml')], { manifest: { testOnly: true } });
    const live = writePack('live', [ROW('obj/l.yaml')], { dependsOn: ['fixtures'] });
    await expect(PackApi.install([platform, fixtures, live])).rejects.toThrow(
      /'live' depends on 'fixtures', a test-only pack/,
    );
  });

  it('a test-only pack may depend on another test-only pack', async () => {
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    const a = writePack('fixtures', [ROW('obj/f.yaml')], { manifest: { testOnly: true } });
    const b = writePack('more-fixtures', [ROW('obj/m.yaml')], { manifest: { testOnly: true }, dependsOn: ['fixtures'] });
    expect((await PackApi.install([platform, a, b])).map((r) => r.packId)).toEqual(['platform', 'fixtures', 'more-fixtures']);
  });

  it('a malformed testOnly is an error', async () => {
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    const bad = writePack('bad', [ROW('obj/b.yaml')], { manifest: { testOnly: 'yes' } });
    await expect(PackApi.install([platform, bad])).rejects.toThrow(/malformed 'testOnly'/);
  });
});
