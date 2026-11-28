/**
 * ⭐ Katie's intake hands a newcomer an Eternal U daypack (size and
 * carrying D29). It is HANDED (owner, 2026-11-15): `move` routes it onto the
 * newcomer, or, with nowhere for it, sets it down at their feet — never
 * refused, never lost. A row that will not stand up never voids the let.
 */

import '@saxonberg/server/test-bootstrap';
import { withHands, tool } from '@saxonberg/server/mud/lib/slot/__tests__/carrying-fixture';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DormWarren from '../idea/DormWarren';
import Avatar from '@saxonberg/server/mud/platform/agent/PrimaryAvatar';
import Pack from '@saxonberg/server/mud/platform/thing/equipment/Pack';
import Location from '@saxonberg/server/mud/platform/place/Location';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

/** The warren with its gift step reachable (it is the policy under test). */
class Probe extends DormWarren {
  public give(tenant: Stuff, unit: string): Promise<'handed' | 'in-room' | 'granted' | 'none'> {
    return this.handDaypack(tenant, unit);
  }
}

const UNIT = `${DormWarren.DORMS_EXTENT}/f1-1`;

function setup(): { w: Probe; tenant: Avatar; pack: Pack; room: Location } {
  const w = makeStuffAtPath(() => new Probe(), DormWarren.WARREN_PATH);
  const tenant = withHands(makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/newcomer'));
  const pack = makeStuff(() => new Pack());
  const room = makeStuff(() => new Location());
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path === DormWarren.DAYPACK_PATH) return pack;
    throw new Error(`unexpected clone ${path}`);
  }) as unknown as typeof StuffApi.clone);
  vi.spyOn(w, 'admit').mockResolvedValue(room as unknown as Stuff & Container);
  return { w, tenant, pack, room };
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the daypack at intake (D29)', () => {
  it('⭐ a newcomer who can take it is handed it', async () => {
    const { w, tenant, pack } = setup();
    expect(await w.give(tenant, UNIT)).toBe('handed');
    expect(pack.getContainer()).toBe(tenant);
  });

  it('⭐ a newcomer whose hands are full has it set down at their feet — never refused, never lost', async () => {
    const { w, tenant, pack } = setup();
    const lobby = makeStuff(() => new Location());
    ContainmentApi.move(tenant, lobby);
    ContainmentApi.move(tool('mug', 0.35, [0.09, 0.09, 0.1]), tenant);
    ContainmentApi.move(tool('lantern', 1, [0.15, 0.15, 0.3]), tenant);
    expect(tenant.wouldSetDown(pack)).not.toBeNull();
    expect(await w.give(tenant, UNIT)).toBe('handed');
    expect(pack.getContainer()).toBe(lobby);
  });

  it('a daypack row that will not stand up is skipped; the let is not voided', async () => {
    const { w, tenant } = setup();
    vi.spyOn(StuffApi, 'clone').mockRejectedValue(new Error('no such row'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await w.give(tenant, UNIT)).toBe('none');
  });
});
