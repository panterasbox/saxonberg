import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SlottedMixin, UNBOUNDED_CAPACITY } from '../../lib/slot/Slotted';
import { SlottableMixin } from '../../lib/slot/Slottable';
import { Idea } from '../../lib/stuff/Idea';
import { SlotApi } from '../slot';
import { SlotLogic } from '../../platform/idea/api/SlotLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class Host extends SlottedMixin(Idea) {}
class Occ extends SlottableMixin(Idea) {}

describe('SlotApi', () => {
  let host: Host;

  beforeEach(() => {
    host = makeStuff(() => new Host());
  });

  describe('occupyAll / vacateAll', () => {
    beforeEach(() => {
      host.setStaticSlots([
        { name: 'a', accepts: 'SlottableMixin' },
        { name: 'b', accepts: 'SlottableMixin' },
        { name: 'c', accepts: 'SlottableMixin' },
      ]);
    });

    it('occupies every slot atomically', () => {
      const o = makeStuff(() => new Occ());
      SlotApi.occupyAll(host, o, ['a', 'b']);
      expect(host.getOccupant('a')).toBe(o);
      expect(host.getOccupant('b')).toBe(o);
    });

    it('rolls back on partial failure', () => {
      const o = makeStuff(() => new Occ());
      const blocker = makeStuff(() => new Occ());
      host.occupy(blocker, 'b');
      expect(() => SlotApi.occupyAll(host, o, ['a', 'b'])).toThrow();
      // 'a' should have been rolled back.
      expect(host.isSlotOccupied('a')).toBe(false);
      // 'b' is still the blocker.
      expect(host.getOccupant('b')).toBe(blocker);
    });

    it('vacateAll removes from every named slot', () => {
      const o = makeStuff(() => new Occ());
      SlotApi.occupyAll(host, o, ['a', 'b']);
      const result = SlotApi.vacateAll(host, o, ['a', 'b']);
      expect(result).toEqual([o, o]);
      expect(host.isSlotOccupied('a')).toBe(false);
      expect(host.isSlotOccupied('b')).toBe(false);
    });
  });

  describe('findOpenSlotFor', () => {
    it('returns the first compatible empty slot', () => {
      host.setStaticSlots([
        { name: 'a', accepts: 'SlottableMixin' },
        { name: 'b', accepts: 'SlottableMixin' },
      ]);
      const o = makeStuff(() => new Occ());
      expect(SlotApi.findOpenSlotFor(host, o)).toBe('a');
    });

    it('skips full slots', () => {
      host.setStaticSlots([
        { name: 'a', accepts: 'SlottableMixin' },
        { name: 'b', accepts: 'SlottableMixin' },
      ]);
      const blocker = makeStuff(() => new Occ());
      host.occupy(blocker, 'a');
      const o = makeStuff(() => new Occ());
      expect(SlotApi.findOpenSlotFor(host, o)).toBe('b');
    });

    it('returns null when no slot fits', () => {
      host.setStaticSlots([
        { name: 'a', accepts: 'WearableMixin' },
      ]);
      const o = makeStuff(() => new Occ());
      expect(SlotApi.findOpenSlotFor(host, o)).toBeNull();
    });
  });

  describe('findOccupiedHost / findOccupiedSlots', () => {
    it('returns null when not slotted', () => {
      const o = makeStuff(() => new Occ());
      expect(SlotApi.findOccupiedHost(o)).toBeNull();
    });

    it('returns the single host when in one slot', () => {
      host.setStaticSlots([{ name: 'a', accepts: 'SlottableMixin' }]);
      const o = makeStuff(() => new Occ());
      host.occupy(o, 'a');
      expect(SlotApi.findOccupiedHost(o)).toBe(host);
    });

    it('returns the same host when in multiple slots on it', () => {
      host.setStaticSlots([
        { name: 'a', accepts: 'SlottableMixin' },
        { name: 'b', accepts: 'SlottableMixin' },
      ]);
      const o = makeStuff(() => new Occ());
      host.occupy(o, 'a');
      host.occupy(o, 'b');
      expect(SlotApi.findOccupiedHost(o)).toBe(host);
    });

    it('throws when in slots on multiple hosts', () => {
      const a = makeStuff(() => new Host());
      const b = makeStuff(() => new Host());
      a.setStaticSlots([{ name: 's', accepts: 'SlottableMixin' }]);
      b.setStaticSlots([{ name: 's', accepts: 'SlottableMixin' }]);
      const o = makeStuff(() => new Occ());
      a.occupy(o, 's');
      b.occupy(o, 's');
      expect(() => SlotApi.findOccupiedHost(o)).toThrow(
        /multiple|distinct hosts/i
      );
    });
  });

  describe('resolveSlot', () => {
    beforeEach(() => {
      host.setStaticSlots([
        { name: 'sit:1', accepts: 'SlottableMixin', userFacingDetail: 'seat' },
        { name: 'lie:1', accepts: 'SlottableMixin' },
      ]);
    });

    it('resolves by detail keyword', () => {
      expect(SlotApi.resolveSlot(host, { detail: 'seat' })).toBe('sit:1');
    });

    it('returns null when detail keyword has no match', () => {
      expect(SlotApi.resolveSlot(host, { detail: 'nope' })).toBeNull();
    });

    it('resolves first slot by accepts mixin name', () => {
      expect(SlotApi.resolveSlot(host, { accepts: 'SlottableMixin' })).toBe(
        'sit:1'
      );
    });
  });

  describe('walkOccupants', () => {
    it('fires once per unique occupant per host', () => {
      host.setStaticSlots([
        { name: 'a', accepts: 'SlottableMixin' },
        { name: 'b', accepts: 'SlottableMixin' },
      ]);
      const o = makeStuff(() => new Occ());
      host.occupy(o, 'a');
      host.occupy(o, 'b');
      const visits: Array<[string, string]> = [];
      SlotApi.walkOccupants(host, (h, slot, occupant) => {
        visits.push([slot, occupant.stuffId]);
      });
      expect(visits.length).toBe(1);
    });

    it('recurses into nested Slotted occupants', () => {
      class Nest extends SlottableMixin(SlottedMixin(Idea)) {}
      const nest = makeStuff(() => new Nest());
      nest.setStaticSlots([
        { name: 'inner', accepts: 'SlottableMixin' },
      ]);
      host.setStaticSlots([
        { name: 'outer', accepts: 'SlottableMixin' },
      ]);
      const innerOcc = makeStuff(() => new Occ());
      nest.occupy(innerOcc, 'inner');
      host.occupy(nest, 'outer');
      const visited: string[] = [];
      SlotApi.walkOccupants(host, (_h, _slot, occ) => {
        visited.push(occ.stuffId);
      });
      expect(visited.length).toBe(2);
      expect(visited).toContain(nest.stuffId);
      expect(visited).toContain(innerOcc.stuffId);
    });
  });

  describe('transferOccupancy', () => {
    let from: Host;
    let to: Host;
    let o: Occ;

    beforeEach(() => {
      from = makeStuff(() => new Host());
      to = makeStuff(() => new Host());
      o = makeStuff(() => new Occ());
      from.setStaticSlots([{ name: 'a', accepts: 'SlottableMixin' }]);
      to.setStaticSlots([{ name: 'b', accepts: 'SlottableMixin' }]);
    });

    it('plain occupy when from is null', () => {
      SlotApi.transferOccupancy(o, null, { host: to, slot: 'b' });
      expect(to.getOccupant('b')).toBe(o);
    });

    it('vacate-then-occupy succeeds', () => {
      from.occupy(o, 'a');
      SlotApi.transferOccupancy(
        o,
        { host: from, slot: 'a' },
        { host: to, slot: 'b' }
      );
      expect(from.isSlotOccupied('a')).toBe(false);
      expect(to.getOccupant('b')).toBe(o);
    });

    it('rollback re-occupies from on failure', () => {
      from.occupy(o, 'a');
      // Pre-occupy `to.b` so the occupy step fails.
      const blocker = makeStuff(() => new Occ());
      to.occupy(blocker, 'b');
      expect(() =>
        SlotApi.transferOccupancy(
          o,
          { host: from, slot: 'a' },
          { host: to, slot: 'b' }
        )
      ).toThrow();
      expect(from.getOccupant('a')).toBe(o);
      expect(to.getOccupant('b')).toBe(blocker);
    });

    it('same slot is a no-op', () => {
      from.occupy(o, 'a');
      SlotApi.transferOccupancy(
        o,
        { host: from, slot: 'a' },
        { host: from, slot: 'a' }
      );
      expect(from.getOccupant('a')).toBe(o);
    });
  });

  describe('UNBOUNDED_CAPACITY', () => {
    it('admits arbitrary occupants', () => {
      host.setStaticSlots([
        {
          name: 'g',
          accepts: 'SlottableMixin',
          capacity: UNBOUNDED_CAPACITY,
        },
      ]);
      for (let i = 0; i < 100; i++) {
        const o = makeStuff(() => new Occ());
        host.occupy(o, 'g');
      }
      expect(host.getOccupantCount('g')).toBe(100);
    });
  });
});

describe('SlotLogic singleton encapsulation', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /platform/idea/api/slot once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton.
    const occ = makeStuff(() => new Occ());
    SlotApi.findOccupiedSlots(occ);
    const logic = StuffApi.findByTemplatePath('/platform/idea/api/slot');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/platform/idea/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-SlotApi caller', () => {
    const occ = makeStuff(() => new Occ());
    SlotApi.findOccupiedSlots(occ);
    const logic = StuffApi.findByTemplatePath<SlotLogic>('/platform/idea/api/slot');
    expect(logic).toBeDefined();
    // The test module is not `mud/api/slot#SlotApi`, so the FromModule
    // gate on the logic's own methods denies the call.
    expect(() => logic!.findOccupiedSlots(occ)).toThrow(SecurityError);
  });
});
