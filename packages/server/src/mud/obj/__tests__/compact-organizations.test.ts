/**
 * The two seeded organizations, and the `/compact` title under them.
 *
 * Checked against the seed files, because these are claims a runtime test
 * cannot keep proving: both organizations ship **unfilled**, so any
 * behavioural assertion about them is either about the empty state or has
 * to appoint somebody first — and the thing most likely to break is an
 * edit to the seeds themselves.
 *
 * ⚠ The load-bearing one is the Compact press office's **committee**
 * authority. Only `office` and `committee` carry the Art. XI founder
 * default, and the operator axis (`AccessApi.isAuthor`) resolves to
 * membership of a `core` group that seeds EMPTY — so an operator-axis
 * authority here would be one nobody could satisfy on a fresh box. Every
 * downstream wave's cold-box story runs through this single seed field.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

// A32.2 scaffolding: a kernel test reading shipped content by path. The
// two organizations are the platform pack's rows (content-packs wave 3).
const SEEDS = fileURLToPath(new URL('../../../../../content/platform/content/', import.meta.url));

interface Seed {
  class?: string;
  hydratorClass?: string;
  data?: Record<string, unknown>;
}

interface PositionSeed {
  key: string;
  label: string;
  wageRate: number;
  confers: string[];
  reportsTo?: string;
}

const read = (rel: string): Seed =>
  parse(readFileSync(join(SEEDS, rel), 'utf8')) as Seed;

const press = read('compact/press.yaml');
const executive = read('compact/executive.yaml');

const positionsOf = (seed: Seed): PositionSeed[] =>
  (seed.data?.positions ?? []) as PositionSeed[];

describe('the Compact press office', () => {
  it('⚠ names a COMMITTEE authority — the only kind that works on a cold box', () => {
    expect(press.data?.appointingAuthority).toEqual({
      kind: 'committee',
      parcel: '/compact',
    });
  });

  it('is an instanceable Organization with one publishing position', () => {
    expect(press.class).toBe('/obj/Organization');
    expect(press.hydratorClass).toBe('/obj/persistence/PersistentHydrator');
    expect(positionsOf(press).map((p) => p.key)).toEqual([
      'communications-director',
    ]);
    expect(press.data?.publishingPositions).toEqual([
      'communications-director',
    ]);
  });

  it('speaks out of character, publicly, on its own feed branch', () => {
    expect(press.data?.label).toBe('the Compact');
    expect(press.data?.realm).toBe('ooc');
    expect(press.data?.visibility).toBe('public');
    expect(press.data?.feedPath).toBe('/compact/press/feed');
  });

  it('⚠ ships UNFILLED — an organization with no comms director publishes nothing', () => {
    expect(press.data?.rosterSlots).toEqual([]);
  });

  it('⚠ mints no communications-director OFFICE — it is a position', () => {
    // The seat/staff line: a constitutional document points at an office;
    // nothing points at personal staff. An earlier draft of this cycle
    // proposed minting one, and that error is what produced the whole
    // organization substrate.
    const apparatus = readFileSync(
      fileURLToPath(new URL('../../lib/governance/Office.ts', import.meta.url)),
      'utf8',
    );
    expect(apparatus).not.toContain('communications-director');
  });
});

describe('the Office of the Prime Minister', () => {
  it('⭐ names an OFFICE authority — so staff follows the seat', () => {
    expect(executive.data?.appointingAuthority).toEqual({
      kind: 'office',
      office: 'prime-minister',
    });
  });

  it('nests press-secretary under communications-director', () => {
    const positions = positionsOf(executive);
    const secretary = positions.find((p) => p.key === 'press-secretary');
    expect(secretary?.reportsTo).toBe('communications-director');
    expect(positions.map((p) => p.key)).toContain('communications-director');
  });

  it('speaks in the fiction, members-only, and both positions may publish', () => {
    expect(executive.data?.label).toBe('the Office of the Prime Minister');
    expect(executive.data?.realm).toBe('world');
    expect(executive.data?.visibility).toBe('members');
    expect(executive.data?.feedPath).toBe('/compact/executive/feed');
    expect(executive.data?.publishingPositions).toEqual([
      'communications-director',
      'press-secretary',
    ]);
  });

  it('⚠ ships unfilled AND with nothing to announce — cold start is content', () => {
    expect(executive.data?.rosterSlots).toEqual([]);
  });
});

describe('the /compact title', () => {
  const manifest = parse(
    readFileSync(join(SEEDS, '..', 'pack.yaml'), 'utf8'),
  ) as {
    maintainers: unknown;
    requires: { title: Array<Record<string, unknown>> };
  };

  const compact = manifest.requires.title.find((t) => t.extent === '/compact');

  it('is a claimed branch held by the executive, so the feed paths have an owner', () => {
    expect(compact).toBeDefined();
    // No holder of its own → the pack's maintainers: the executive.
    expect(Object.hasOwn(compact!, 'holder')).toBe(false);
    expect(manifest.maintainers).toEqual({ organization: '/compact/executive' });
  });

  it('⚠ declares NO landUse and NO areaM2 — a path branch is not ground', () => {
    // The inheritance walk answers `wild` for an undeclared branch, which
    // admits nothing. That fail-closed default is the point.
    expect(Object.hasOwn(compact!, 'landUse')).toBe(false);
    expect(Object.hasOwn(compact!, 'areaM2')).toBe(false);
  });

  it('covers both seeded feed paths by prefix', () => {
    for (const feed of [
      press.data?.feedPath as string,
      executive.data?.feedPath as string,
    ]) {
      expect(feed.startsWith('/compact/')).toBe(true);
    }
  });
});
