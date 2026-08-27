/**
 * ⭐ **Every shipped Business, ported to the appointing authority.**
 *
 * The build shipped with all eight Businesses still authoring the legacy
 * `proprietorPath`, working via the bare-string normalization. That was
 * fine and it was also untested against the real files — and, more to the
 * point, it meant content spoke two spellings and the substrate had never
 * been asked *"who appoints here?"* about anything but a fixture.
 *
 * Porting them is the generalization test. Answering the question eight
 * times over real content produced three answers, and the third is the
 * valuable one:
 *
 *   - **`entity`** — somebody owns it (Dave's Bar, the general store,
 *     Hearthworks). The proprietor edge, under its own name.
 *   - **`committee`** — a city department, staffed by whoever holds title
 *     over its ground (the Registry, the transit operator, the TPA desk).
 *     This is the case the substrate was built for.
 *   - ⚠ **nothing fits** — the Goodkin branch. See below. A negative
 *     result, deliberately preserved rather than papered over.
 *
 * Seed-shape rather than runtime on purpose: these are authored facts and
 * a seed edit is what should turn this red.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { Authority } from '../../lib/employment/Authority';

// The locality rows and their title claims are world-seed's (content-packs wave 3).
const SEEDS = fileURLToPath(new URL('../../../../../content/world-seed/content/', import.meta.url));
const MANIFEST = fileURLToPath(new URL('../../../../../content/world-seed/pack.yaml', import.meta.url));

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

/** Every `.yaml` under a content root, recursively. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.yaml')) out.push(full);
  }
  return out;
}

/** The newbie-wilds content ships as a pack now — same rows, other root. */
const WILDS = join(
  dirname(createRequire(import.meta.url).resolve('@saxonberg/content-newbie-wilds/package.json')),
  'content',
);

/** Every seed (or pack row) whose `class:` is the concrete Business. */
const businesses = [
  ...walk(SEEDS).map((path) => ({ path, rel: path.slice(SEEDS.length) })),
  ...walk(WILDS).map((path) => ({ path, rel: path.slice(WILDS.length) })),
]
  .map((e) => ({ ...e, seed: parse(readFileSync(e.path, 'utf8')) as Seed }))
  .filter((e) => e.seed?.class === '/obj/Business')
  .map((e) => ({ rel: e.rel, data: e.seed.data ?? {} }));

/** The claims as `{extent, owner: {name}}` rows — the shape the seeder's file had. */
const parcels = (
  parse(readFileSync(MANIFEST, 'utf8')) as {
    requires: { title: Array<{ extent: string; holder?: { group?: string } }> };
  }
).requires.title.map((t) => ({ extent: t.extent, owner: { name: t.holder?.group } }));

/** The claimed title covering `path` by longest prefix, or undefined. */
function coveringTitle(path: string): { extent: string; owner?: { name?: string } } | undefined {
  return parcels
    .filter((p) => path === p.extent || path.startsWith(`${p.extent}/`))
    .sort((a, b) => b.extent.length - a.extent.length)[0];
}

const byPath = (fragment: string) =>
  businesses.find((b) => b.rel.includes(fragment))!;

describe('the shipped Business seeds', () => {
  it('finds them all — the sweep is not silently empty', () => {
    // A walk that matches nothing would make every assertion below vacuous.
    expect(businesses.length).toBeGreaterThanOrEqual(8);
  });

  it('⭐ NONE still authors the legacy `proprietorPath`', () => {
    for (const { rel, data } of businesses) {
      expect(data.proprietorPath, `${rel} still authors proprietorPath`)
        .toBeUndefined();
    }
  });

  it('every authored authority resolves', () => {
    for (const { rel, data } of businesses) {
      if (data.appointingAuthority === undefined) continue;
      expect(Authority.fromData(data.appointingAuthority), rel).not.toBeNull();
    }
  });

  it('keeps the trading half on every Business', () => {
    // `banksAt` is a Business concern, not an organization one — it stayed
    // put through the split, and a Business without it cannot open an
    // operating account.
    for (const { rel, data } of businesses) {
      expect(typeof data.banksAt, rel).toBe('string');
      expect((data.banksAt as string).length, rel).toBeGreaterThan(0);
    }
  });
});

describe('`entity` — somebody owns it', () => {
  it.each([
    ['lounge', '/domain/lounge/npc/dave'],
    ['general-store', '/domain/terminus/general-store/npc/keeper'],
    ['hearthworks', '/domain/hearthworks/npc/smith'],
  ])('%s names its proprietor', (fragment, path) => {
    expect(byPath(fragment).data.appointingAuthority).toEqual({
      kind: 'entity',
      path,
    });
  });

  it('⚠ the unpaid-cover rule still reads it', () => {
    // `settleShiftWage` skips `getProprietor()`, which is the `entity` case
    // of the authority. Porting the spelling must not quietly make Dave's
    // own cover shift a paid one.
    const daves = byPath('lounge').data.appointingAuthority as {
      kind: string;
      path: string;
    };
    expect(daves.kind).toBe('entity');
    expect(Authority.fromData(daves)).toEqual({
      kind: 'entity',
      path: '/domain/lounge/npc/dave',
    });
  });
});

describe('⭐ `committee` — a city department', () => {
  it.each([
    ['terminus/registry', '/domain/terminus/registry'],
    ['terminus/budget', '/domain/terminus/terminal'],
    ['terminal/tpa', '/domain/terminus/terminal'],
  ])('%s is staffed by the committee over %s', (fragment, parcel) => {
    expect(byPath(fragment).data.appointingAuthority).toEqual({
      kind: 'committee',
      parcel,
    });
  });

  it('⚠ each named parcel actually has a CLAIMED title', () => {
    // A committee authority over unclaimed ground falls through to the
    // state default (`core`) — which would silently mean "the operator
    // staffs the city", the exact wrong answer. The parcel has to be
    // somebody's, and that somebody has to be the city.
    for (const fragment of ['terminus/registry', 'terminus/budget', 'terminal/tpa']) {
      const ref = byPath(fragment).data.appointingAuthority as {
        parcel: string;
      };
      const title = coveringTitle(ref.parcel);
      expect(title, `${ref.parcel} has no claimed title`).toBeDefined();
      expect(title!.owner?.name, ref.parcel).toBe('terminus');
    }
  });

  it('⚠ the Registry stays a BUSINESS — it sells land titles', () => {
    // `TitleController` settles land purchases into its operating account
    // via `ensureOperatorAt` → `operatingAccountOf`. A registry that takes
    // money trades, so the trading half is load-bearing here and the
    // tempting reclassification to `/obj/Organization` would break `title
    // buy`.
    const registry = byPath('terminus/registry');
    expect(registry.data.banksAt).toBe('goodkin');
    expect(registry.data.operatingLocations).toEqual([
      '/domain/terminus/registry/office',
    ]);
  });
});

describe('⭐ the corpo case, resolved', () => {
  it('the Goodkin branch is appointed by GOODKIN’s committee', () => {
    // This shipped UNAUTHORED one commit ago, because neither `committee`
    // nor `entity` could name a corpo-run counter: the city holds title
    // over the district, and `entity` matches the principal's own
    // templatePath, which a mark can never be.
    //
    // Giving each corpo its own `/corpo/<key>` branch and board group
    // closed it **with no new authority kind** — the gap wanted a corpo to
    // own some ground, not a fifth `PrincipalRef`. See corpo.md.
    const goodkin = byPath('counting-houses');
    expect(goodkin.data.appointingAuthority).toEqual({
      kind: 'committee',
      parcel: '/corpo/goodkin',
    });
    expect(goodkin.data.parentOrganization).toBe('/corpo/goodkin');
    // ...and it does have positions, so the authority has work to do.
    expect((goodkin.data.positions as unknown[]).length).toBeGreaterThan(0);
  });

  it('⚠ the newbie-wilds account stays unauthored — it has NO positions', () => {
    // The one remaining case, and for a different reason worth keeping
    // distinct from Goodkin's: there is nothing here to appoint anyone to,
    // so an authority would be structure without a consumer.
    const wilds = byPath('newbie-wilds');
    expect(wilds.data.appointingAuthority).toBeUndefined();
    expect(wilds.data.positions).toEqual([]);
  });
});
