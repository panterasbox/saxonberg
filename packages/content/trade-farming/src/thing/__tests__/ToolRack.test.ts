/**
 * ⭐⭐ **The farm's tools come back**, and the three rules that make that
 * true without turning the yard into a spade faucet.
 *
 * The campus farm shipped its tools as `props:` — initial furnishing,
 * laid down once and deliberately never topped up — so the first player
 * to pocket them owned the college's whole tool set and nobody else could
 * work there. Two runs of the live drive found it; the second arrived to
 * an empty yard.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ToolRack from '../ToolRack';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { OrganismMixin } from '@saxonberg/server/mud/lib/species/Organism';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

const SPADE = '/trade/farming/thing/spade';
const SCYTHE = '/trade/farming/thing/scythe';

/** A stand-in for the yard, and for a field somewhere else. */
class Place extends ContainerMixin(Thing) {}
/** A stand-in for a person holding a tool — an Organism, so it is HANDS. */
class Hands extends OrganismMixin(ContainerMixin(ContainableMixin(Thing))) {}
/** A stand-in tool. */
class Tool extends ContainableMixin(Thing) {}

describe('the tool rack', () => {
  let minted: Array<Stuff & Containable>;

  beforeEach(() => {
    StuffApi.clearAll();
    minted = [];
    // The clone pipeline needs no templates here: stand a tool up and
    // stamp it with the row the rack asked for.
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const t = makeStuff(() => new Tool()) as unknown as Stuff & Containable;
      (t as unknown as { getTemplatePath(): string | null }).getTemplatePath =
        () => path;
      minted.push(t);
      return t;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const rackIn = (yard: Place, rows: string[]): ToolRack => {
    const rack = makeStuff(() => new ToolRack()) as ToolRack;
    rack.setToolRows(rows);
    ContainmentApi.move(
      rack as unknown as Stuff & Containable,
      yard as unknown as Stuff & Container,
    );
    return rack;
  };

  it('hangs the declared tools the first time it resets', async () => {
    const yard = makeStuff(() => new Place()) as Place;
    const rack = rackIn(yard, [SPADE, SCYTHE]);
    await rack.reset();
    expect(minted).toHaveLength(2);
    for (const t of minted) {
      expect(t.getContainer()).toBe(yard as unknown as Stuff);
    }
  });

  it('⭐ RECLAIMS a tool left lying somewhere else', async () => {
    const yard = makeStuff(() => new Place()) as Place;
    const field = makeStuff(() => new Place()) as Place;
    const rack = rackIn(yard, [SPADE]);
    await rack.reset();
    const spade = minted[0]!;

    // Somebody carried it out and put it down in the field.
    ContainmentApi.move(spade, field as unknown as Stuff & Container);
    expect(spade.getContainer()).toBe(field as unknown as Stuff);

    await rack.reset();
    expect(spade.getContainer()).toBe(yard as unknown as Stuff);
    // ⚠ And it did NOT mint a second one.
    expect(minted).toHaveLength(1);
  });

  it('⚠⚠ leaves a tool IN SOMEBODY\'S HANDS alone — and mints nothing', async () => {
    const yard = makeStuff(() => new Place()) as Place;
    const hands = makeStuff(() => new Hands()) as Hands;
    const rack = rackIn(yard, [SPADE]);
    await rack.reset();
    const spade = minted[0]!;

    ContainmentApi.move(spade, hands as unknown as Stuff & Container);
    await rack.reset();

    // Still theirs: a rack that snatches a scythe mid-swathe is worse
    // than no rack.
    expect(spade.getContainer()).toBe(hands as unknown as Stuff);
    // ⭐ **This is what makes it not a faucet.** A carried tool is still
    // alive and still tracked, so nothing is minted to replace it.
    expect(minted).toHaveLength(1);
  });

  it('replaces a tool ONLY when its instance has ceased to exist', async () => {
    const yard = makeStuff(() => new Place()) as Place;
    const rack = rackIn(yard, [SPADE]);
    await rack.reset();
    const spade = minted[0]!;

    await StuffApi.destruct(spade as unknown as Stuff);
    await rack.reset();

    // The college bought a spade, because somebody lost its spade.
    expect(minted).toHaveLength(2);
    expect(minted[1]!.getContainer()).toBe(yard as unknown as Stuff);
  });

  it('⭐⭐ ADOPTS a tool the yard already had, instead of minting beside it', async () => {
    const yard = makeStuff(() => new Place()) as Place;
    // The yard's own `props:` put a spade down at its birth — before the
    // rack had a container to hang anything on.
    const existing = makeStuff(() => new Tool()) as unknown as Stuff & Containable;
    (existing as unknown as { getTemplatePath(): string | null }).getTemplatePath =
      () => SPADE;
    ContainmentApi.move(existing, yard as unknown as Stuff & Container);

    const rack = rackIn(yard, [SPADE]);
    await rack.reset();

    // ⚠ Nothing minted: the rack took responsibility for what it found.
    expect(minted).toHaveLength(0);

    // …and from here it maintains it like any tool of its own.
    const field = makeStuff(() => new Place()) as Place;
    ContainmentApi.move(existing, field as unknown as Stuff & Container);
    await rack.reset();
    expect(existing.getContainer()).toBe(yard as unknown as Stuff);
    expect(minted).toHaveLength(0);
  });

  it('never resets while a player is standing in the room', () => {
    const rack = makeStuff(() => new ToolRack()) as ToolRack;
    expect(rack.resetsWhilePresent()).toBe(false);
  });
});
