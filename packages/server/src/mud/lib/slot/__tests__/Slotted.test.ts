import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { SlottedMixin, UNBOUNDED_CAPACITY, type SlotSpec } from '../Slotted';
import { SlottableMixin } from '../Slottable';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestHost extends SlottedMixin(Idea) {}
class TestOccupant extends SlottableMixin(Idea) {}

describe('SlottedMixin', () => {
  let host: TestHost;
  let occupant: TestOccupant;

  beforeEach(() => {
    host = makeStuff(() => new TestHost());
    occupant = makeStuff(() => new TestOccupant());
  });

  describe('static slot universe', () => {
    it('default getSlotNames reads staticSlots', () => {
      host.setStaticSlots([
        { name: 'sit:1', accepts: 'SlottableMixin' },
        { name: 'lie:1', accepts: 'SlottableMixin' },
      ]);
      expect(host.getSlotNames()).toEqual(['sit:1', 'lie:1']);
    });

    it('getSlotSpec returns the spec or null', () => {
      host.setStaticSlots([{ name: 'sit:1', accepts: 'SlottableMixin' }]);
      expect(host.getSlotSpec('sit:1')).toMatchObject({ name: 'sit:1' });
      expect(host.getSlotSpec('nope')).toBeNull();
    });

    it('rejects unknown accepts mixin name on setStaticSlots', () => {
      expect(() =>
        host.setStaticSlots([{ name: 'x', accepts: 'NotARealMixin' }])
      ).toThrow(/unknown 'accepts' mixin name/);
    });

    it('rejects duplicate slot names on setStaticSlots', () => {
      expect(() =>
        host.setStaticSlots([
          { name: 'sit:1', accepts: 'SlottableMixin' },
          { name: 'sit:1', accepts: 'SlottableMixin' },
        ])
      ).toThrow(/duplicate slot name/);
    });

    it('rejects duplicate userFacingDetail on setStaticSlots', () => {
      expect(() =>
        host.setStaticSlots([
          {
            name: 'a', accepts: 'SlottableMixin',
            userFacingDetail: 'seat',
          },
          {
            name: 'b', accepts: 'SlottableMixin',
            userFacingDetail: 'seat',
          },
        ])
      ).toThrow(/duplicates userFacingDetail/);
    });
  });

  describe('occupy / vacate', () => {
    beforeEach(() => {
      host.setStaticSlots([
        { name: 'sit:1', accepts: 'SlottableMixin' },
      ]);
    });

    it('occupy places the candidate', () => {
      host.occupy(occupant, 'sit:1');
      expect(host.getOccupant('sit:1')).toBe(occupant);
      expect(host.isSlotOccupied('sit:1')).toBe(true);
      expect(host.getOccupantCount('sit:1')).toBe(1);
    });

    it('occupy throws on unknown slot', () => {
      expect(() => host.occupy(occupant, 'nope')).toThrow(/unknown slot/);
    });

    it('occupy throws on already-full single-capacity slot', () => {
      host.occupy(occupant, 'sit:1');
      const second = makeStuff(() => new TestOccupant());
      expect(() => host.occupy(second, 'sit:1')).toThrow(/full/);
    });

    it('occupy throws on double-occupy by same candidate', () => {
      host.occupy(occupant, 'sit:1');
      expect(() => host.occupy(occupant, 'sit:1')).toThrow(/already in slot/);
    });

    it('vacate removes the candidate and returns it', () => {
      host.occupy(occupant, 'sit:1');
      expect(host.vacate('sit:1', occupant)).toBe(occupant);
      expect(host.isSlotOccupied('sit:1')).toBe(false);
    });

    it('vacate returns null when candidate not present', () => {
      expect(host.vacate('sit:1', occupant)).toBeNull();
    });

    it('vacate throws on unknown slot', () => {
      expect(() => host.vacate('nope', occupant)).toThrow(/unknown slot/);
    });

    it('vacateSole returns the sole occupant', () => {
      host.occupy(occupant, 'sit:1');
      expect(host.vacateSole('sit:1')).toBe(occupant);
      expect(host.isSlotOccupied('sit:1')).toBe(false);
    });

    it('vacateSole returns null when slot empty', () => {
      expect(host.vacateSole('sit:1')).toBeNull();
    });
  });

  describe('canOccupy', () => {
    it('returns false for unknown slot', () => {
      expect(host.canOccupy(occupant, 'nope')).toBe(false);
    });

    it('returns true when candidate has the required mixin', () => {
      host.setStaticSlots([{ name: 'sit:1', accepts: 'SlottableMixin' }]);
      expect(host.canOccupy(occupant, 'sit:1')).toBe(true);
    });

    it('returns false when candidate lacks the required mixin', () => {
      // A bare Stuff without SlottableMixin would normally never reach
      // canOccupy via the typed interface; cast here for the test.
      host.setStaticSlots([{ name: 'x', accepts: 'WearableMixin' }]);
      expect(host.canOccupy(occupant, 'x')).toBe(false);
    });
  });

  describe('multi-capacity slots', () => {
    let bench: TestHost;
    beforeEach(() => {
      bench = makeStuff(() => new TestHost());
      bench.setStaticSlots([
        { name: 'sit:1', accepts: 'SlottableMixin', capacity: 4 },
      ]);
    });

    it('accepts up to capacity then rejects', () => {
      const sitters = [
        makeStuff(() => new TestOccupant()),
        makeStuff(() => new TestOccupant()),
        makeStuff(() => new TestOccupant()),
        makeStuff(() => new TestOccupant()),
      ];
      for (const s of sitters) bench.occupy(s, 'sit:1');
      expect(bench.getOccupantCount('sit:1')).toBe(4);
      const fifth = makeStuff(() => new TestOccupant());
      expect(() => bench.occupy(fifth, 'sit:1')).toThrow(/full/);
    });

    it('getOccupant throws on multi-occupant slot', () => {
      const a = makeStuff(() => new TestOccupant());
      const b = makeStuff(() => new TestOccupant());
      bench.occupy(a, 'sit:1');
      bench.occupy(b, 'sit:1');
      expect(() => bench.getOccupant('sit:1')).toThrow(
        /has 2 occupants/
      );
    });

    it('vacateSole throws on multi-occupant slot', () => {
      const a = makeStuff(() => new TestOccupant());
      const b = makeStuff(() => new TestOccupant());
      bench.occupy(a, 'sit:1');
      bench.occupy(b, 'sit:1');
      expect(() => bench.vacateSole('sit:1')).toThrow(/has 2 occupants/);
    });

    it('UNBOUNDED_CAPACITY admits arbitrarily many occupants', () => {
      const floor = makeStuff(() => new TestHost());
      floor.setStaticSlots([
        {
          name: 'ground:1',
          accepts: 'SlottableMixin',
          capacity: UNBOUNDED_CAPACITY,
        },
      ]);
      for (let i = 0; i < 50; i++) {
        const a = makeStuff(() => new TestOccupant());
        floor.occupy(a, 'ground:1');
      }
      expect(floor.getOccupantCount('ground:1')).toBe(50);
    });
  });

  describe('hydrate produces empty slots map', () => {
    it('newly-created host has no occupants', () => {
      host.setStaticSlots([{ name: 'sit:1', accepts: 'SlottableMixin' }]);
      expect(host.isSlotOccupied('sit:1')).toBe(false);
      expect(host.getOccupantCount('sit:1')).toBe(0);
    });
  });

  describe('getAllOccupants', () => {
    it('returns map keyed by every known slot', () => {
      host.setStaticSlots([
        { name: 'a', accepts: 'SlottableMixin' },
        { name: 'b', accepts: 'SlottableMixin' },
      ]);
      host.occupy(occupant, 'a');
      const all = host.getAllOccupants();
      expect(Array.from(all.keys())).toEqual(['a', 'b']);
      expect(all.get('a')?.has(occupant)).toBe(true);
      expect(all.get('b')?.size).toBe(0);
    });
  });

  describe('SlotSpec round-trip', () => {
    it('preserves the full spec shape', () => {
      const specs: SlotSpec[] = [
        {
          name: 'sit:1',
          accepts: 'SlottableMixin',
          capacity: 4,
          postures: ['sit'],
          userFacingDetail: 'seat',
        },
      ];
      host.setStaticSlots(specs);
      expect(host.getStaticSlots()).toEqual(specs);
    });
  });

  describe('vacate slot-release witness', () => {
    class WitnessOcc extends SlottableMixin(Idea) {
      public events: { host: unknown; slot: string }[] = [];
      public onSlotReleased(host: unknown, slot: string): void {
        this.events.push({ host, slot });
      }
    }

    it('invokes candidate.onSlotReleased(host, slotName) after the delete', () => {
      host.setStaticSlots([{ name: 'sit:1', accepts: 'SlottableMixin' }]);
      const w = makeStuff(() => new WitnessOcc());
      host.occupy(w, 'sit:1');
      host.vacate('sit:1', w);
      expect(w.events).toEqual([{ host, slot: 'sit:1' }]);
    });

    it('does NOT invoke when candidate has no onSlotReleased method', () => {
      host.setStaticSlots([{ name: 'sit:1', accepts: 'SlottableMixin' }]);
      // SlottableMixin's default doesn't supply onSlotReleased — the
      // method is optional on the interface.
      host.occupy(occupant, 'sit:1');
      expect(() => host.vacate('sit:1', occupant)).not.toThrow();
    });

    it('vacateSole also fires the witness', () => {
      host.setStaticSlots([{ name: 'sit:1', accepts: 'SlottableMixin' }]);
      const w = makeStuff(() => new WitnessOcc());
      host.occupy(w, 'sit:1');
      host.vacateSole('sit:1');
      expect(w.events).toEqual([{ host, slot: 'sit:1' }]);
    });
  });
});
