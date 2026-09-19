/**
 * ⭐ **Each corpo is an organization that holds its own branch.**
 *
 * A `Corpo` is a **mark** — a key, a sector, an ethos, a set of rivals —
 * and a mark cannot hold a position or hire anyone. So `corpo.md` could
 * not answer *"who runs Veshko?"*, and the Goodkin branch had no
 * expressible appointer: the committee over its **ground** is the city's,
 * and `entity` matches the principal's own templatePath, which a mark can
 * never be.
 *
 * Content-packs wave 3 closes that with the `organization` title kind:
 * each corpo pack claims `/corpo/<key>` for the organization row it
 * ships, so `committeeOf('/corpo/<key>')` resolves to the organization —
 * its staff and its head — and a subsidiary's `{kind: committee, parcel:
 * /corpo/<key>}` means "the company", never the municipality. The wave-2
 * board groups are retired (a title one still holds migrates).
 *
 * The chart's OWN appointing authority is the Prime Minister's office
 * until a corpo has a seat of its own: an organization's authority can
 * never be the committee over its own extent, because that committee IS
 * the organization (the resolution would recurse).
 *
 * The load-bearing assertion is the negative one — Goodkin's committee
 * **refuses the municipality**.
 *
 * A32.2 scaffolding: a kernel-adjacent test reading shipped content by
 * path (the corpo packs and one terminus-pack row).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import OrganizationEntity from '../../../idea/Organization';
import BusinessEntity from '../../../idea/Business';
import Avatar from '../../../agent/Avatar';
import { EmploymentApi } from '../../../../api/employment';
import { CompactApi } from '../../../../api/compact';
import { ParcelApi } from '../../../../api/parcel';
import { GroupApi } from '../../../../api/group';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import type { ParcelOwner } from '../../../../lib/parcel/ParcelRecord';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

const SEEDS = fileURLToPath(new URL('../../../../../../../content/terminus/content/', import.meta.url));
const CONTENT = fileURLToPath(new URL('../../../../../../../content/', import.meta.url));

const KEYS = ['aevex', 'goodkin', 'hollis', 'veshko', 'vionne'] as const;
const BRANCH = '/world/terminus/counting-houses/business';

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

interface Manifest {
  root: string;
  maintainers?: unknown;
  requires?: {
    title?: Array<Record<string, unknown>>;
    groups?: Array<{ name: string; owner?: unknown; members?: unknown[] }>;
  };
  boot?: Array<{ template: string; role: string }>;
}

const readSeed = (rel: string): Seed =>
  parse(readFileSync(join(SEEDS, rel), 'utf8')) as Seed;
const readChart = (key: string): Seed =>
  parse(readFileSync(join(CONTENT, `corpo-${key}/content/corpo/${key}.yaml`), 'utf8')) as Seed;
const readManifest = (key: string): Manifest =>
  parse(readFileSync(join(CONTENT, `corpo-${key}/pack.yaml`), 'utf8')) as Manifest;

/* ───────────────────────── the packs ───────────────────────── */

describe('the five corpo organizations, as authored', () => {
  it('⭐ there is one per corpo mark — none missing, none invented', () => {
    const marks = readdirSync(CONTENT)
      .filter((d) => d.startsWith('corpo-'))
      .flatMap((d) => readdirSync(join(CONTENT, d, 'content/stuff/idea/corpo/Corpo')))
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.replace('.yaml', ''))
      .sort();
    const orgs = readdirSync(CONTENT)
      .filter((d) => d.startsWith('corpo-'))
      .flatMap((d) => readdirSync(join(CONTENT, d, 'content/corpo')))
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.replace('.yaml', ''))
      .sort();
    expect(orgs).toEqual(marks);
    expect(orgs).toEqual([...KEYS]);
  });

  it.each(KEYS)('%s is an Organization whose chart its COMMITTEE fills — a group the Registrar seats, never the org itself', (key) => {
    const org = readChart(key);
    expect(org.class).toBe('/platform/idea/Organization');
    // ⭐ Economic bootstrap D7: the concept gets an officer (the Registrar
    // of Corporations), the instance gets a committee. The authority is
    // the committee over /corpo/<key> — and that committee is a GROUP
    // (below), so this is not the organization appointing itself.
    expect(org.data?.appointingAuthority).toEqual({
      kind: 'committee',
      parcel: `/corpo/${key}`,
    });
  });

  it.each(KEYS)('%s: the `<key>-committee` group holds the branch, owned by the Registrar; the org is the show', (key) => {
    const m = readManifest(key);
    expect(m.root).toBe(`/corpo/${key}`);
    // The pack's own chart still maintains the PACK (diagnostics).
    expect(m.maintainers).toEqual({ organization: `/corpo/${key}` });
    const group = m.requires?.groups?.find((g) => g.name === `${key}-committee`);
    expect(group, `${key}-committee is not declared`).toBeDefined();
    expect(group!.owner).toEqual({ office: 'registrar-of-corporations' });
    // ⚠ Players only: a title-holding group enrols no NPC row.
    expect(group!.members ?? []).toEqual([]);
    const claim = m.requires?.title?.find((t) => t.extent === `/corpo/${key}`);
    expect(claim, `/corpo/${key} is not claimed`).toBeDefined();
    expect(claim!.holder).toEqual({ group: `${key}-committee` });
    // ⚠ Resident from boot: appoint and the chart reads resolve it.
    expect(m.boot?.some((b) => b.template === `/corpo/${key}` && b.role === 'producer')).toBe(true);
  });

  it('⚠ declares no landUse — a corpo is not ground', () => {
    for (const key of KEYS) {
      const claim = readManifest(key).requires!.title!.find((t) => t.extent === `/corpo/${key}`)!;
      expect(Object.hasOwn(claim, 'landUse'), key).toBe(false);
      expect(Object.hasOwn(claim, 'areaM2'), key).toBe(false);
    }
  });

  it('⭐ answers "who runs it?" with a position — shipped unfilled', () => {
    for (const key of KEYS) {
      const org = readChart(key);
      const positions = org.data?.positions as Array<{ key: string }>;
      expect(positions.map((p) => p.key), key).toEqual(['chief-executive']);
      // Nobody runs it yet. That is a fact about the company, not a gap.
      expect(org.data?.rosterSlots, key).toEqual([]);
    }
  });

  it('⚠ a corpo is NOT a Business — the holding company banks nothing', () => {
    for (const key of KEYS) {
      const org = readChart(key);
      expect(org.data?.banksAt, key).toBeUndefined();
      expect(org.data?.operatingLocations, key).toBeUndefined();
    }
  });
});

describe('the Goodkin branch, now that its parent exists', () => {
  it('⭐ is appointed by GOODKIN’s committee, not the city’s', () => {
    const branch = readSeed('world/terminus/counting-houses/business.yaml');
    expect(branch.data?.appointingAuthority).toEqual({
      kind: 'committee',
      parcel: '/corpo/goodkin',
    });
  });

  it('⭐ names the corpo as its parent — the first content use of nesting', () => {
    const branch = readSeed('world/terminus/counting-houses/business.yaml');
    expect(branch.data?.parentOrganization).toBe('/corpo/goodkin');
  });

  it('stays a Business — the branch is what actually trades', () => {
    const branch = readSeed('world/terminus/counting-houses/business.yaml');
    expect(branch.class).toBe('/platform/idea/Business');
    expect(branch.data?.banksAt).toBe('goodkin');
  });
});

/* ───────────────────────── at runtime ───────────────────────── */

const TERMINUS_REF = 'managed:g-terminus';

const GOODKIN_COMMITTEE_REF = 'managed:g-goodkin-committee';

/**
 * Title fixture mirroring the pack manifests for the two branches. ⭐
 * `/corpo/goodkin` is held by the `goodkin-committee` GROUP (economic
 * bootstrap D7): the concept gets an officer (the Registrar of
 * Corporations owns the group), the instance gets a committee, and the
 * organization is the show.
 */
function stubTitle(): void {
  vi.spyOn(ParcelApi, 'ownerOf').mockImplementation(
    async (path: string): Promise<ParcelOwner | null> => {
      if (path.startsWith('/corpo/goodkin')) {
        return { kind: 'group', name: 'goodkin-committee', ref: GOODKIN_COMMITTEE_REF };
      }
      if (path.startsWith('/world/terminus')) {
        return { kind: 'group', name: 'terminus', ref: TERMINUS_REF };
      }
      return null;
    },
  );
  vi.spyOn(ParcelApi, 'resolveOwnerRef').mockImplementation(
    async (o: ParcelOwner) =>
      o.kind === 'group' ? (o.ref ?? `managed:g-${o.name}`) : null,
  );
  vi.spyOn(ParcelApi, 'coveringParcelOf').mockResolvedValue(null);
}

function makeAvatar(id: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${id}`);
  av.setPlayerId(id);
  return av;
}

/** Stand up an entity from its authored data, as the hydrator would. */
function stand<T extends Stuff>(make: () => T, path: string, seed: Seed): T {
  const inst = makeStuffAtPath(make, path) as T;
  Object.assign(inst, seed.data);
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

  it('⭐ admits a member of the goodkin-committee GROUP; REFUSES the chief executive AND a city staffer', async () => {
    const goodkin = stand(() => new OrganizationEntity(), '/corpo/goodkin', readChart('goodkin'));
    const branch = stand(
      () => new BusinessEntity(),
      BRANCH,
      readSeed('world/terminus/counting-houses/business.yaml'),
    );
    // Members are keyed by IDENTITY PATH — what `group add` writes.
    vi.spyOn(GroupApi, 'isMember').mockImplementation(
      async (memberKey: string, ref: string) =>
        (ref === TERMINUS_REF && memberKey === '/platform/agent/Avatar/odile') ||
        (ref === GOODKIN_COMMITTEE_REF && memberKey === '/platform/agent/Avatar/seated'),
    );
    const banker = makeAvatar('banker');
    const cityStaff = makeAvatar('odile');
    const seated = makeAvatar('seated');
    const authority = branch.getAppointingAuthority();
    // The committee is the GROUP the Registrar seats — its member holds
    // the authority over the branch.
    await expect(EmploymentApi.holdsAuthority(seated, authority)).resolves.toBe(true);
    // ⭐ Doctrine 2: a committee assignment is governance, a position is a
    // job. Running Goodkin (the chief executive) confers NO seat on the
    // committee — being hired never makes you an author of the bank.
    await expect(EmploymentApi.holdsAuthority(banker, authority)).resolves.toBe(false);
    goodkin.appoint(banker as never, 'chief-executive');
    await expect(EmploymentApi.holdsAuthority(banker, authority)).resolves.toBe(false);
    // ⚠ THE assertion. The city owns the ground this counter stands on,
    // and that buys it nothing here — which is the whole reason the corpo
    // needed a branch of its own.
    await expect(EmploymentApi.holdsAuthority(cityStaff, authority)).resolves.toBe(false);
  });

  it('an organization-held extent whose authority is its own committee fails CLOSED, never loops', async () => {
    // The pre-bootstrap shape (the org held its own branch, and its
    // authority named the committee over it) asked the head question of
    // itself forever once the covering parcel was sparse. Only staff count.
    vi.spyOn(ParcelApi, 'ownerOf').mockImplementation(
      async (path: string): Promise<ParcelOwner | null> =>
        path.startsWith('/corpo/goodkin')
          ? { kind: 'organization', templatePath: '/corpo/goodkin' }
          : null,
    );
    const goodkin = stand(() => new OrganizationEntity(), '/corpo/goodkin', readChart('goodkin'));
    const banker = makeAvatar('banker');
    const authority = goodkin.getAppointingAuthority();
    await expect(EmploymentApi.holdsAuthority(banker, authority)).resolves.toBe(false);
    goodkin.appoint(banker as never, 'chief-executive');
    await expect(EmploymentApi.holdsAuthority(banker, authority)).resolves.toBe(true);
  });

  it('⭐ answers "who runs Veshko?" — empty now, a name once appointed', () => {
    const veshko = stand(() => new OrganizationEntity(), '/corpo/veshko', readChart('veshko'));
    expect(veshko.holdersOf('chief-executive')).toEqual([]);

    const boss = makeAvatar('boss');
    veshko.appoint(boss as never, 'chief-executive');
    expect(veshko.holdersOf('chief-executive')).toEqual([
      '/platform/agent/Avatar/boss',
    ]);
  });

  it('⭐ walks the branch up to its parent company', () => {
    stand(() => new OrganizationEntity(), '/corpo/goodkin', readChart('goodkin'));
    const branch = stand(
      () => new BusinessEntity(),
      BRANCH,
      readSeed('world/terminus/counting-houses/business.yaml'),
    );
    expect(
      branch.organizationChain().map((o) => o.getTemplatePath()),
    ).toEqual(['/corpo/goodkin']);
  });
});
