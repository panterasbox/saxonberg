/**
 * ⭐ **Each corpo is an organization with its own committee.**
 *
 * A `Corpo` is a **mark** — a key, a sector, an ethos, a set of rivals —
 * and a mark cannot hold a position or hire anyone. So `corpo.md` could
 * not answer *"who runs Veshko?"*, and the Goodkin branch had no
 * expressible appointer: the committee over its **ground** is the city's,
 * and `entity` matches the principal's own templatePath, which a mark can
 * never be.
 *
 * Giving each corpo its own `/corpo/<key>` branch title and board group
 * closes that **with no new authority kind** — the fifth `PrincipalRef`
 * the gap seemed to demand turned out to be unnecessary. That is the
 * result worth pinning: the substrate generalized without growing.
 *
 * The load-bearing assertion is the negative one — Goodkin's committee
 * **refuses the municipality**. If `/corpo/goodkin` ever loses its title,
 * `committeeOf` falls through to the `core` default and every one of
 * these admits the operator instead, which is exactly the failure that
 * would otherwise pass review.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import OrganizationEntity from '../../obj/Organization';
import BusinessEntity from '../../obj/Business';
import Avatar from '../../obj/Avatar';
import { EmploymentApi } from '../../api/employment';
import { CompactApi } from '../../api/compact';
import { ParcelApi } from '../../api/parcel';
import { GroupApi } from '../../api/group';
import { StuffApi } from '../../api/stuff';
import { ShadowApi } from '../../api/shadow';
import type { ParcelOwner } from '../../lib/parcel/ParcelRecord';
import type { Stuff } from '../../lib/stuff/Stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

const SEEDS = fileURLToPath(new URL('..', import.meta.url));
const CONFIG = fileURLToPath(new URL('../../config/', import.meta.url));
const CONTENT = fileURLToPath(new URL('../../../../../content/', import.meta.url));

const KEYS = ['aevex', 'goodkin', 'hollis', 'veshko', 'vionne'] as const;
const BRANCH = '/domain/terminus/counting-houses/business';

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

const readSeed = (rel: string): Seed =>
  parse(readFileSync(join(SEEDS, rel), 'utf8')) as Seed;

const parcels = (
  parse(readFileSync(join(CONFIG, 'parcels.yaml'), 'utf8')) as {
    parcels: Array<{ extent: string; owner?: { kind: string; name?: string } }>;
  }
).parcels;

const groups = (
  parse(readFileSync(join(CONFIG, 'groups.yaml'), 'utf8')) as {
    groups: Array<{ name: string; members: unknown[] }>;
  }
).groups;

/* ───────────────────────── the seeds ───────────────────────── */

describe('the five corpo organizations, as authored', () => {
  it('⭐ there is one per corpo mark — none missing, none invented', () => {
    // Each corpo's mark ships in its own pack (corpo-<key>).
    const marks = readdirSync(CONTENT)
      .filter((d) => d.startsWith('corpo-'))
      .flatMap((d) => readdirSync(join(CONTENT, d, 'content/obj/corpo/Corpo')))
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.replace('.yaml', ''))
      .sort();
    const orgs = readdirSync(join(SEEDS, 'corpo'))
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.replace('.yaml', ''))
      .sort();
    expect(orgs).toEqual(marks);
    expect(orgs).toEqual([...KEYS]);
  });

  it.each(KEYS)('%s is an Organization whose authority is its OWN committee', (key) => {
    const org = readSeed(`corpo/${key}.yaml`);
    expect(org.class).toBe('/obj/Organization');
    expect(org.data?.appointingAuthority).toEqual({
      kind: 'committee',
      parcel: `/corpo/${key}`,
    });
  });

  it.each(KEYS)('%s holds title over its own branch, via its own board group', (key) => {
    const parcel = parcels.find((p) => p.extent === `/corpo/${key}`);
    expect(parcel, `/corpo/${key} has no title`).toBeDefined();
    expect(parcel!.owner).toEqual({ kind: 'group', name: key });
    // ⚠ Without a CLAIMED title, `committeeOf` falls through to the state
    // default (`core`) and the corpo's committee silently becomes the
    // operator's.
    expect(groups.some((g) => g.name === key), `no ${key} group`).toBe(true);
  });

  it('⚠ declares no landUse — a corpo is not ground', () => {
    for (const key of KEYS) {
      const parcel = parcels.find((p) => p.extent === `/corpo/${key}`)!;
      expect(Object.hasOwn(parcel, 'landUse'), key).toBe(false);
      expect(Object.hasOwn(parcel, 'areaM2'), key).toBe(false);
    }
  });

  it('⭐ answers "who runs it?" with a position — shipped unfilled', () => {
    for (const key of KEYS) {
      const org = readSeed(`corpo/${key}.yaml`);
      const positions = org.data?.positions as Array<{ key: string }>;
      expect(positions.map((p) => p.key), key).toEqual(['chief-executive']);
      // Nobody runs it yet. That is a fact about the company, not a gap.
      expect(org.data?.rosterSlots, key).toEqual([]);
      expect(groups.find((g) => g.name === key)!.members, key).toEqual([]);
    }
  });

  it('⚠ a corpo is NOT a Business — the holding company banks nothing', () => {
    for (const key of KEYS) {
      const org = readSeed(`corpo/${key}.yaml`);
      expect(org.data?.banksAt, key).toBeUndefined();
      expect(org.data?.operatingLocations, key).toBeUndefined();
    }
  });
});

describe('the Goodkin branch, now that its parent exists', () => {
  it('⭐ is appointed by GOODKIN’s committee, not the city’s', () => {
    const branch = readSeed('domain/terminus/counting-houses/business.yaml');
    expect(branch.data?.appointingAuthority).toEqual({
      kind: 'committee',
      parcel: '/corpo/goodkin',
    });
  });

  it('⭐ names the corpo as its parent — the first content use of nesting', () => {
    const branch = readSeed('domain/terminus/counting-houses/business.yaml');
    expect(branch.data?.parentOrganization).toBe('/corpo/goodkin');
  });

  it('stays a Business — the branch is what actually trades', () => {
    const branch = readSeed('domain/terminus/counting-houses/business.yaml');
    expect(branch.class).toBe('/obj/Business');
    expect(branch.data?.banksAt).toBe('goodkin');
  });
});

/* ───────────────────────── at runtime ───────────────────────── */

const GOODKIN_REF = 'managed:g-goodkin';
const TERMINUS_REF = 'managed:g-terminus';

/** Title fixture mirroring config/parcels.yaml for the two branches. */
function stubTitle(): void {
  vi.spyOn(ParcelApi, 'ownerOf').mockImplementation(
    async (path: string): Promise<ParcelOwner> => {
      if (path.startsWith('/corpo/goodkin')) {
        return { kind: 'group', name: 'goodkin', ref: GOODKIN_REF };
      }
      if (path.startsWith('/domain/terminus')) {
        return { kind: 'group', name: 'terminus', ref: TERMINUS_REF };
      }
      return { kind: 'group', name: 'core' };
    },
  );
  vi.spyOn(ParcelApi, 'resolveOwnerRef').mockImplementation(
    async (o: ParcelOwner) =>
      o.kind === 'group' ? (o.ref ?? `managed:g-${o.name}`) : null,
  );
  vi.spyOn(ParcelApi, 'coveringParcelOf').mockResolvedValue(null);
}

function makeAvatar(id: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${id}`);
  av.setPlayerId(id);
  return av;
}

/** Stand up an entity from its seed data, as the hydrator would. */
function stand<T extends Stuff>(make: () => T, path: string, rel: string): T {
  const inst = makeStuffAtPath(make, path) as T;
  Object.assign(inst, readSeed(rel).data);
  return inst;
}

describe('⭐ the authority actually separates the company from the city', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    CompactApi._resetOfficeRegistryRefForReload();
    stubTitle();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('admits a Goodkin board member and REFUSES a city staffer', async () => {
    const branch = stand(
      () => new BusinessEntity(),
      BRANCH,
      'domain/terminus/counting-houses/business.yaml',
    );
    vi.spyOn(GroupApi, 'isMember').mockImplementation(
      async (playerId: string, ref: string) =>
        (ref === GOODKIN_REF && playerId === 'banker') ||
        (ref === TERMINUS_REF && playerId === 'odile'),
    );
    const banker = makeAvatar('banker');
    const cityStaff = makeAvatar('odile');

    const authority = branch.getAppointingAuthority();
    await expect(
      EmploymentApi.holdsAuthority(banker, authority),
    ).resolves.toBe(true);
    // ⚠ THE assertion. The city owns the ground this counter stands on,
    // and that buys it nothing here — which is the whole reason the corpo
    // needed a branch of its own.
    await expect(
      EmploymentApi.holdsAuthority(cityStaff, authority),
    ).resolves.toBe(false);
  });

  it('⭐ answers "who runs Veshko?" — empty now, a name once appointed', () => {
    const veshko = stand(
      () => new OrganizationEntity(),
      '/corpo/veshko',
      'corpo/veshko.yaml',
    );
    expect(EmploymentApi.holdersOf(veshko, 'chief-executive')).toEqual([]);

    const boss = makeAvatar('boss');
    EmploymentApi.hire(veshko, boss as never, 'chief-executive');
    expect(EmploymentApi.holdersOf(veshko, 'chief-executive')).toEqual([
      '/obj/Avatar/boss',
    ]);
  });

  it('⭐ walks the branch up to its parent company', () => {
    const goodkin = stand(
      () => new OrganizationEntity(),
      '/corpo/goodkin',
      'corpo/goodkin.yaml',
    );
    const branch = stand(
      () => new BusinessEntity(),
      BRANCH,
      'domain/terminus/counting-houses/business.yaml',
    );
    expect(
      EmploymentApi.organizationChainOf(branch).map((o) => o.getTemplatePath()),
    ).toEqual(['/corpo/goodkin']);
    // ...and the company itself is the top.
    expect(EmploymentApi.organizationChainOf(goodkin)).toEqual([]);
  });

  it('keeps the branch’s own tellers on the branch, not the parent', () => {
    stand(() => new OrganizationEntity(), '/corpo/goodkin', 'corpo/goodkin.yaml');
    const branch = stand(
      () => new BusinessEntity(),
      BRANCH,
      'domain/terminus/counting-houses/business.yaml',
    );
    // Nesting is not inheritance: a position is held where it is authored.
    expect(EmploymentApi.holdersOf(branch, 'teller')).toEqual([
      '/domain/terminus/counting-houses/npc/teller',
    ]);
  });
});
