/**
 * ⭐ Katie's intake hands a newcomer an Eternal U daypack (size and
 * carrying D29). It is HANDED: it goes onto the newcomer only when they can
 * take it (`canReceive`, before anything moves); otherwise it waits in the
 * newly let room. A row that will not stand up never voids the let.
 */

import '@saxonberg/server/test-bootstrap';
import { withHands } from '@saxonberg/server/mud/lib/slot/__tests__/carrying-fixture';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DormWarren from '../idea/DormWarren';
import Avatar from '@saxonberg/server/mud/platform/agent/PrimaryAvatar';
import Pack from '@saxonberg/server/mud/platform/thing/equipment/Pack';
import Location from '@saxonberg/server/mud/platform/location/Location';
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
    vi.spyOn(tenant, 'canReceive').mockReturnValue(null);
    expect(await w.give(tenant, UNIT)).toBe('handed');
    expect(pack.getContainer()).toBe(tenant);
  });

  it('⭐ a newcomer who cannot take it finds it in the new room — never refused, never lost', async () => {
    const { w, tenant, pack, room } = setup();
    vi.spyOn(tenant, 'canReceive').mockReturnValue({
      ok: false,
      reason: 'nowhere-to-carry',
      facts: { item: pack, held: [], tried: [] },
    });
    expect(await w.give(tenant, UNIT)).toBe('in-room');
    expect(pack.getContainer()).toBe(room);
  });

  it('a daypack row that will not stand up is skipped; the let is not voided', async () => {
    const { w, tenant } = setup();
    vi.spyOn(StuffApi, 'clone').mockRejectedValue(new Error('no such row'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await w.give(tenant, UNIT)).toBe('none');
  });
});
