/**
 * ⭐ The Registry's ported COMMITTEE authority, resolved for real.
 *
 * The seed-shape test proves the YAML says the right thing. This proves
 * the runtime agrees: the parcel registry really does hand
 * `/domain/terminus/registry` to the `terminus` group, and
 * `holdsAuthority` really does admit a member of it and refuse everyone
 * else. Without this the port is asserted, not demonstrated.
 */
import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import BusinessEntity from '../../../obj/Business';
import Avatar from '../../../obj/Avatar';
import { EmploymentApi } from '../../../api/employment';
import { CompactApi } from '../../../api/compact';
import { ParcelApi } from '../../../api/parcel';
import { GroupApi } from '../../../api/group';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import type { ParcelOwner } from '../../../lib/parcel/ParcelRecord';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

const REGISTRY = '/domain/terminus/registry/business';
const TERMINUS_REF = 'managed:g-terminus';

/** The Registry Business exactly as its seed authors it. */
function seededRegistry(): BusinessEntity {
  const seed = parse(
    readFileSync(
      fileURLToPath(
        new URL(
          '../../../../../../content/world-seed/content/domain/terminus/registry/business.yaml',
          import.meta.url,
        ),
      ),
      'utf8',
    ),
  ) as { data: Record<string, unknown> };
  const biz = makeStuffAtPath(() => new BusinessEntity(), REGISTRY);
  Object.assign(biz, seed.data);
  return biz;
}

/** Title fixture mirroring world-seed's pack.yaml claims for the registry branch. */
function stubTitle(): void {
  vi.spyOn(ParcelApi, 'ownerOf').mockImplementation(
    async (path: string): Promise<ParcelOwner> =>
      path.startsWith('/domain/terminus/registry')
        ? { kind: 'group', name: 'terminus', ref: TERMINUS_REF }
        : { kind: 'group', name: 'core' },
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

describe('the Registry, as seeded', () => {
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

  it('⭐ resolves its authority to the city committee, and gates on it', async () => {
    const biz = seededRegistry();
    expect(biz.getAppointingAuthority()).toEqual({
      kind: 'committee',
      parcel: '/domain/terminus/registry',
    });
    // Nobody owns it — the entity case is genuinely absent.
    expect(biz.getProprietor()).toBeUndefined();

    vi.spyOn(GroupApi, 'isMember').mockImplementation(
      async (playerId: string, ref: string) =>
        ref === TERMINUS_REF && playerId === 'odile',
    );
    const cityStaff = makeAvatar('odile');
    const stranger = makeAvatar('stranger');

    await expect(
      EmploymentApi.holdsAuthority(cityStaff, biz.getAppointingAuthority()),
    ).resolves.toBe(true);
    await expect(
      EmploymentApi.holdsAuthority(stranger, biz.getAppointingAuthority()),
    ).resolves.toBe(false);
  });

  it('still proves its Magistrate seat from the authored roster', async () => {
    const biz = seededRegistry();
    // The civics seat reads (department, positionKey) off this chart —
    // porting the authority must not disturb who holds what.
    expect(EmploymentApi.holdersOf(biz, 'magistrate')).toEqual([
      '/domain/terminus/registry/clerk',
    ]);
    expect(EmploymentApi.holdersOf(biz, 'registrar')).toEqual([
      '/domain/terminus/registry/clerk',
    ]);
  });

  it('keeps the trading half that `title buy` settles into', () => {
    const biz = seededRegistry();
    expect(biz.getBanksAt()).toBe('goodkin');
    expect(biz.getOperatingLocations()).toEqual([
      '/domain/terminus/registry/office',
    ]);
    expect(biz.getAccountPath()).toBe(REGISTRY);
  });
});
