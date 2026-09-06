/**
 * The newbie-wilds pack (pack-installer W1.10) — the installer proven on
 * REAL content: the fourth shipped pack, 23 `/world/newbie-wilds/…`
 * rows under the widened `content/world/` template root.
 *
 * ⚠ Scaffolding, not precedent (slate A32.2): by ring discipline the
 * installer's own tests run against ugly fixture packs and a pack's
 * installability checks live in the pack's ring-2 suite. This real-root
 * test is accepted this cycle to prove the installer on real content
 * and is marked for relocation when ring 2 exists.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import { dirname, join, relative } from 'path';
import { readFileSync, readdirSync } from 'fs';
import YAML from 'yaml';
import { PackApi } from '../../../../api/pack';
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
  it('a fixture file under content/world/ reconciles to /world/…', async () => {
    const root = writePack('p', []);
    writeDomainFile(root, { rel: 'world/x/y.yaml', class: '/platform/thing/Thing', data: { name: 'y' } });
    vi.spyOn(await import('../../../../api/stuff').then((m) => m.StuffApi), 'loadClassByPath')
      .mockResolvedValue(class {} as never);
    const [r] = await PackApi.install([root]);
    expect(r!.inserted).toEqual(['/world/x/y']);
    expect(contentRows()[0]!.path).toBe('/world/x/y');
  });
});

describe('the newbie-wilds pack (real root, real class resolution)', () => {
  it('empty store → 23 inserted, 23 domain baselines', async () => {
    const [r] = await PackApi.install([ROOT]);
    expect(r!.failure).toBeNull();
    expect(r!.packId).toBe('newbie-wilds');
    expect(r!.inserted).toHaveLength(23);
    expect(r!.inserted).toContain('/world/newbie-wilds/crossroads/hub');
    expect(r!.inserted).toContain('/world/newbie-wilds/agent/wolf');
    expect(r!.inserted.every((p) => p.startsWith('/world/newbie-wilds'))).toBe(true);
    expect(contentRows().every((row) => row.sourcePack === 'newbie-wilds')).toBe(true);
    const rec = recordOf('newbie-wilds')!;
    expect(Object.keys(rec.rows)).toHaveLength(23);
    expect(Object.values(rec.rows).every((b) => b.kind === 'domain')).toBe(true);
  });

  it('a store holding UNSTAMPED rows at the pack\'s paths refuses the pack — nothing is adopted', async () => {
    // Rows nobody stamped, at the pack's own paths, built from the real files.
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
    walk(join(CONTENT, 'world'));
    expect(n).toBe(23);

    const [r] = await PackApi.install([ROOT]);
    expect(r!.failure?.step).toBe('reconcile');
    expect(r!.failure?.error).toMatch(/no sourcePack stamp/);
    // Untouched: the same 23 rows, none stamped, nothing inserted beside them.
    expect(contentRows()).toHaveLength(23);
    expect(contentRows().every((row) => String(row._id).startsWith('seed-') && !row.sourcePack)).toBe(true);
  });

  it('is discovered among the shipped packs', async () => {
    const ids = (await PackApi.discoverPacks()).map((m) => m.id).sort();
    expect(ids).toContain('newbie-wilds');
  });
});
