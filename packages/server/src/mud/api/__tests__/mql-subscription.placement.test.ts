/**
 * Rung 1 of the containment read (cold-storage W0).
 *
 * Verifies the honest bytes the wire used to discard:
 *   - a contained child that is itself a holder carries `holds: true`;
 *   - a child placed `on`/`from` a host carries its `placement` member;
 *   - a loose child carries neither;
 *   - a `Placing` host's `detail` projection carries `placed` — the
 *     items on it, grouped by member with a heading;
 *   - placing an item (within the same container) fires a `placement`
 *     FieldChangedEvent, so the host container's `contents` card wakes.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MqlSubscriptionApi,
  REF_FIELDS,
  DETAIL_FIELDS,
} from '../mql-subscription';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { ContainmentApi } from '../containment';
import { Stuff } from '../../lib/stuff/Stuff';
import { Sensor } from '../../lib/message/Sensor';
import EventRegistry from '../../platform/idea/EventRegistry';
import Interactive from '../../platform/idea/Interactive';
import Avatar from '../../platform/agent/Avatar';
import Good from '../../lib/stuff/Good';
import Chest from '../../platform/thing/Chest';
import Location from '../../lib/stuff/Location';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function setup(): Promise<{
  avatar: Avatar;
  location: Location;
}> {
  await bootRegistry();
  const location = await StuffApi.create(() => new Location());
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  ContainmentApi.move(avatar, location);
  return { avatar, location };
}

async function makeThing(short: string): Promise<Good> {
  return await StuffApi.create(() => {
    const t = new Good();
    t.setShortDescription(short);
    t.setKeywords(short.split(/\s+/).filter((w) => w.length > 1));
    return t;
  });
}

describe('MQL subscription — Rung 1 placement/holds projection', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
  });

  it('a container child carries holds: true; a leaf child carries neither', async () => {
    const { avatar, location } = await setup();
    const chest = await StuffApi.create(() => new Chest());
    const apple = await makeThing('a red apple');
    ContainmentApi.move(chest, location);
    ContainmentApi.move(apple, location);

    const chestRef = MqlSubscriptionApi.projectFields(
      chest,
      REF_FIELDS,
      avatar as unknown as Stuff & Sensor,
    );
    const appleRef = MqlSubscriptionApi.projectFields(
      apple,
      REF_FIELDS,
      avatar as unknown as Stuff & Sensor,
    );

    expect(chestRef.holds).toBe(true);
    expect(appleRef.holds).toBeUndefined();
    // Neither is placed on anything — placement omitted for both.
    expect('placement' in chestRef).toBe(false);
    expect('placement' in appleRef).toBe(false);
  });

  it('a placed child carries its placement member', async () => {
    const { avatar, location } = await setup();
    const chest = await StuffApi.create(() => new Chest());
    const apple = await makeThing('a red apple');
    ContainmentApi.move(chest, location);
    // `on` the lid — Chest offers `on` by default.
    ContainmentApi.place(apple, 'on', chest);

    const appleRef = MqlSubscriptionApi.projectFields(
      apple,
      REF_FIELDS,
      avatar as unknown as Stuff & Sensor,
    );
    expect(appleRef.placement).toBe('on');
  });

  it("a Placing host's detail projection groups what is placed on it", async () => {
    const { avatar, location } = await setup();
    const chest = await StuffApi.create(() => new Chest());
    const apple = await makeThing('a red apple');
    ContainmentApi.move(chest, location);
    ContainmentApi.place(apple, 'on', chest);

    const chestDetail = MqlSubscriptionApi.projectFields(
      chest,
      DETAIL_FIELDS,
      avatar as unknown as Stuff & Sensor,
    );
    const placed = chestDetail.placed as
      | Array<{ name: string; heading: string; items: Array<{ stuffId: string }> }>
      | undefined;
    expect(placed).toBeDefined();
    const onGroup = placed!.find((g) => g.name === 'on');
    expect(onGroup).toBeDefined();
    expect(typeof onGroup!.heading).toBe('string');
    expect(onGroup!.heading.length).toBeGreaterThan(0);
    expect(onGroup!.items.map((i) => i.stuffId)).toContain(apple.stuffId);
  });

  it('placing fires a placement FieldChangedEvent', async () => {
    const { location } = await setup();
    const chest = await StuffApi.create(() => new Chest());
    const apple = await makeThing('a red apple');
    ContainmentApi.move(chest, location);
    ContainmentApi.move(apple, location);

    const fired: string[] = [];
    const spy = vi
      .spyOn(EventApi, 'fire')
      .mockImplementation((ev: unknown) => {
        const payload = (ev as { payload?: { field?: string } }).payload;
        if (payload?.field) fired.push(payload.field);
        return undefined as never;
      });
    try {
      // Same container (apple already in the location) — `move` is a
      // no-op, so only the explicit placement fire proves the wake.
      ContainmentApi.place(apple, 'on', chest);
    } finally {
      spy.mockRestore();
    }
    expect(fired).toContain('placement');
  });
});
