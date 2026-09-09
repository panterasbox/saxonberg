/**
 * The occupancy back-reference — *which host holds me?*
 *
 * ⭐ This used to be answered by reading **every object in the world**
 * and looking inside each one's slots, because it is a reverse-relational
 * read MQL has no predicate for. On the metabolism path — once per
 * creature per tick — a live drive found it pinning a CPU core.
 *
 * A back-reference is only worth having if it is EXACT, so what follows
 * pins the two ways it could rot: a claim that is not recorded, and a
 * release that is not. Both sides funnel through `Slotted.occupy` /
 * `vacate`, which is the whole reason the map can be trusted — including
 * through `occupyAll`, `vacateAll`, `transferOccupancy` and both
 * destruct cleanups.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { SlottedMixin } from '../Slotted';
import { SlottableMixin } from '../Slottable';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';
import type { Slotted } from '../Slotted';

class Host extends SlottedMixin(Idea) {}
class Occ extends SlottableMixin(Idea) {}

const SLOTS = [
  { name: 'left', accepts: 'SlottableMixin' },
  { name: 'right', accepts: 'SlottableMixin' },
];

/** `host → sorted slot names`, as a plain object the assertions can read. */
function occupancyOf(occ: Occ, names: Map<Stuff & Slotted, string>): unknown {
  const out: Record<string, string[]> = {};
  for (const [host, slots] of occ.occupiedSlots().entries()) {
    out[names.get(host) ?? '?'] = [...slots].sort();
  }
  return out;
}

describe('the Slottable occupancy back-reference', () => {
  let a: Host;
  let b: Host;
  let occ: Occ;
  let names: Map<Stuff & Slotted, string>;

  beforeEach(() => {
    a = makeStuff(() => new Host());
    b = makeStuff(() => new Host());
    occ = makeStuff(() => new Occ());
    a.setStaticSlots(SLOTS);
    b.setStaticSlots(SLOTS);
    names = new Map([
      [a as unknown as Stuff & Slotted, 'a'],
      [b as unknown as Stuff & Slotted, 'b'],
    ]);
  });

  it('records a claim and drops it on release', () => {
    expect(occupancyOf(occ, names)).toEqual({});
    a.occupy(occ, 'left');
    expect(occupancyOf(occ, names)).toEqual({ a: ['left'] });
    a.vacate('left', occ);
    expect(occupancyOf(occ, names)).toEqual({});
    expect(occ.getOccupiedHost()).toBeNull();
  });

  it('keeps several slots on one host, and several hosts apart', () => {
    a.occupy(occ, 'left');
    a.occupy(occ, 'right');
    b.occupy(occ, 'left');
    expect(occupancyOf(occ, names)).toEqual({ a: ['left', 'right'], b: ['left'] });
    a.vacate('left', occ);
    expect(occupancyOf(occ, names)).toEqual({ a: ['right'], b: ['left'] });
  });

  it('stays exact through occupyAll and vacateAll', () => {
    a.occupyAll(occ, ['left', 'right']);
    expect(occupancyOf(occ, names)).toEqual({ a: ['left', 'right'] });
    a.vacateAll(occ, ['left', 'right']);
    expect(occupancyOf(occ, names)).toEqual({});
  });

  it('rolls back with a failed occupyAll — a partial claim leaves no trace', () => {
    // 'nope' is not a slot on the host, so the second claim throws and
    // the first is rolled back. A back-reference that survived the
    // rollback would report an occupancy the host does not have.
    expect(() => a.occupyAll(occ, ['left', 'nope'])).toThrow();
    expect(occupancyOf(occ, names)).toEqual({});
  });

  it('follows a transferOccupancy across hosts', () => {
    a.occupy(occ, 'left');
    occ.transferOccupancy(
      { host: a as unknown as Stuff & Slotted, slot: 'left' },
      { host: b as unknown as Stuff & Slotted, slot: 'right' },
    );
    expect(occupancyOf(occ, names)).toEqual({ b: ['right'] });
  });

  it('clears when the HOST is destroyed', async () => {
    a.occupy(occ, 'left');
    b.occupy(occ, 'left');
    await StuffApi.destruct(a as unknown as Stuff);
    expect(occupancyOf(occ, names)).toEqual({ b: ['left'] });
  });

  it('clears the host side when the CANDIDATE is destroyed', async () => {
    a.occupy(occ, 'left');
    await StuffApi.destruct(occ as unknown as Stuff);
    const stillHeld = [...a.getAllOccupants().values()].reduce(
      (n, set) => n + set.size,
      0,
    );
    expect(stillHeld).toBe(0);
  });

  it('hands out a snapshot — mutating during iteration is safe', () => {
    a.occupy(occ, 'left');
    a.occupy(occ, 'right');
    const snapshot = occ.occupiedSlots();
    for (const [host, slots] of snapshot.entries()) {
      for (const slot of slots) host.vacate(slot, occ);
    }
    expect(occupancyOf(occ, names)).toEqual({});
  });

  it('refuses a writer that is not the host party to the claim', () => {
    const impostor = makeStuff(() => new Occ());
    expect(() =>
      (
        occ as unknown as {
          _noteOccupied(h: Stuff & Slotted, s: string): void;
        }
      )._noteOccupied(impostor as unknown as Stuff & Slotted, 'left'),
    ).toThrow();
    expect(occupancyOf(occ, names)).toEqual({});
  });
});
