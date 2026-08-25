/**
 * The newbie-wilds pack (pack-installer W1.10) — the installer proven on
 * REAL content: the fourth shipped pack, 21 `/domain/newbie-wilds/…`
 * rows under the widened `content/domain/` template root.
 *
 * ⚠ Scaffolding, not precedent (slate A32.2): by ring discipline the
 * installer's own tests run against ugly fixture packs and a pack's
 * installability checks live in the pack's ring-2 suite. This real-root
 * test is accepted this cycle to prove the installer on real content
 * and is marked for relocation when ring 2 exists.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import { dirname, join, relative } from 'path';
import { readFileSync, readdirSync } from 'fs';
import YAML from 'yaml';
import { PackApi } from '../../../api/pack';
import {
  store,
  stubPersist,
  quietConsole,
  contentRows,
  recordOf,
  writePack,
  writeDomainFile,
  cleanupPacks,
} from './pack-harness';

const ROOT = dirname(
  createRequire(import.meta.url).resolve('@saxonberg/content-newbie-wilds/package.json'),
);
const CONTENT = join(ROOT, 'content');

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  warn = quietConsole().warn;
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

describe('the widened domain-kind walk', () => {
  it('a fixture file under content/domain/ reconciles to /domain/…', async () => {
    const root = writePack('p', []);
    writeDomainFile(root, { rel: 'domain/x/y.yaml', class: '/obj/Prop', data: { name: 'y' } });
    vi.spyOn(await import('../../../api/stuff').then((m) => m.StuffApi), 'loadClassByPath')
      .mockResolvedValue(class {} as never);
    const [r] = await PackApi.install([root]);
    expect(r!.inserted).toEqual(['/domain/x/y']);
    expect(contentRows()[0]!.path).toBe('/domain/x/y');
  });
});

describe('the newbie-wilds pack (real root, real class resolution)', () => {
  it('empty store → 21 inserted, 21 domain baselines', async () => {
    const [r] = await PackApi.install([ROOT]);
    expect(r!.failure).toBeNull();
    expect(r!.packId).toBe('newbie-wilds');
    expect(r!.inserted).toHaveLength(21);
    expect(r!.inserted).toContain('/domain/newbie-wilds/crossroads/hub');
    expect(r!.inserted).toContain('/domain/newbie-wilds/npc/wolf');
    expect(r!.inserted.every((p) => p.startsWith('/domain/newbie-wilds'))).toBe(true);
    expect(contentRows().every((row) => row.sourcePack === 'newbie-wilds')).toBe(true);
    const rec = recordOf('newbie-wilds')!;
    expect(Object.keys(rec.rows)).toHaveLength(21);
    expect(Object.values(rec.rows).every((b) => b.kind === 'domain')).toBe(true);
  });

  it('pre-seeded unstamped store (the dev-DB case) → 21 adopted in place, one normalization line', async () => {
    // Rows as SeederManager would have inserted them: unstamped, with
    // their own _ids, built from the real files.
    let n = 0;
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (!entry.endsWith('.yaml')) {
          walk(full);
          continue;
        }
        const doc = YAML.parse(readFileSync(full, 'utf-8')) as Record<string, unknown>;
        store.rows.push({
          _id: `seed-${++n}`,
          path: '/' + relative(CONTENT, full).replace(/\.yaml$/, ''),
          class: doc.class as string,
          hydratorClass: doc.hydratorClass as string | undefined,
          data: (doc.data as Record<string, unknown>) ?? {},
          __col: 'content',
        });
      }
    };
    walk(join(CONTENT, 'domain'));
    expect(n).toBe(21);

    const [r] = await PackApi.install([ROOT]);
    expect(r!.adopted).toHaveLength(21);
    expect(r!.inserted).toEqual([]);
    expect(contentRows()).toHaveLength(21);
    expect(contentRows().every((row) => String(row._id).startsWith('seed-'))).toBe(true);
    expect(warn.mock.calls.filter((c) => /ONE-TIME adoption/.test(String(c[0])))).toHaveLength(1);

    // Second boot: all-zero, hashes unchanged, no second line.
    const hashes = structuredClone(recordOf('newbie-wilds')!.rows);
    warn.mockClear();
    const [r2] = await PackApi.install([ROOT]);
    expect([...r2!.inserted, ...r2!.updated, ...r2!.adopted, ...r2!.deleted, ...r2!.conflicts]).toEqual([]);
    expect(r2!.normalized).toBe(0);
    expect(recordOf('newbie-wilds')!.rows).toEqual(hashes);
    expect(warn.mock.calls.filter((c) => /adoption/.test(String(c[0])))).toHaveLength(0);
  });

  it('is discovered as the fourth shipped pack', async () => {
    const ids = (await PackApi.discoverPacks()).map((m) => m.id).sort();
    expect(ids).toEqual(['arcane-descriptors', 'base-library', 'newbie-wilds', 'species-and-names']);
  });
});
