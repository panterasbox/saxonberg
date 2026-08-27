/**
 * Discovery (content-packs wave 3, D10): `SAXONBERG_PACKS` filters the
 * install set after ordering; an id no shipped pack provides throws at
 * boot; `platform` sorts first regardless of input order.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../api/pack';
import { DiagnosticApi } from '../../../api/diagnostics';
import { stubPersist, stubClassResolution, quietConsole, writePack, cleanupPacks } from './pack-harness';

let prior: string | undefined;

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
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

describe('discovery', () => {
  it('platform sorts first regardless of input order (then dependsOn order)', async () => {
    const a = writePack('a', [ROW('obj/a.yaml')]);
    const b = writePack('b', [ROW('obj/b.yaml')], { dependsOn: ['a'] });
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    const results = await PackApi.install([b, a, platform]);
    expect(results.map((r) => r.packId)).toEqual(['platform', 'a', 'b']);
  });

  it('SAXONBERG_PACKS filters the install set; unset means every pack', async () => {
    const a = writePack('a', [ROW('obj/a.yaml')]);
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    process.env.SAXONBERG_PACKS = 'platform';
    expect((await PackApi.install([a, platform])).map((r) => r.packId)).toEqual(['platform']);
    process.env.SAXONBERG_PACKS = ' platform , a ';
    expect((await PackApi.install([a, platform])).map((r) => r.packId)).toEqual(['platform', 'a']);
    delete process.env.SAXONBERG_PACKS;
    expect((await PackApi.install([a, platform])).map((r) => r.packId)).toEqual(['platform', 'a']);
  });

  it('an id no shipped pack provides throws at boot', async () => {
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    process.env.SAXONBERG_PACKS = 'platform,nope';
    await expect(PackApi.install([platform])).rejects.toThrow(/SAXONBERG_PACKS names 'nope', which no shipped pack provides/);
  });
});
