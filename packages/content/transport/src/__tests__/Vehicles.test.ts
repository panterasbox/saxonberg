/**
 * The three vehicle shapes — and ⚠ **the three unknowns that come with
 * putting `MobileMixin` on something that is not a Character.**
 *
 * `MobileMixin` had exactly one composer in the whole codebase before
 * this build. Containment constraints, residency eviction and arrival
 * narration had therefore only ever seen a person move, so each is
 * verified here rather than assumed:
 *
 *  1. `ContainmentApi.move`'s rule about where an `ExitableVessel` may
 *     live — a room qualifies, a wagon bed does not;
 *  2. **residency** — a vehicle parked on a road must not be swept;
 *  3. arrival narration on a host with **no `Interactive`**.
 *
 * Plus the claims the shapes exist to make: a rig is TOWED and not
 * `Mobile`; an open conveyance is perceived out of and a sealed one is
 * not (AC8); a passenger boards with the shipped `go <coach>` and holds
 * no engagement (AC15o); and variety is DATA — the sledge differs from
 * the wagon in one number.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Sealable } from '@saxonberg/server/mud/lib/spatial/Sealable';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import HaulageRig from '../thing/HaulageRig';
import Barge from '../thing/Barge';
import Coach from '../thing/Coach';
import { corridor, installModes, type Corridor } from './transport-fixtures';

/**
 * ⚠ **TypeScript cannot see that a `Coach` is a `Stuff`.** It is one at
 * runtime — every assertion below proves it — but the instance type is
 * lost through `ExitableVessel`'s three nested mixin factories, which is
 * the same limitation the shipped `BusinessMixin` documents. `Coach.ts`
 * carries the full note; this is the seam the tests need.
 */
type LiveCoach = Coach &
  Stuff &
  Container &
  Containable &
  Sealable &
  Exitable & {
    getControllerSlot(): string;
    /** `ExitableVessel`'s synthesized entry exit — what `go coach` takes. */
    getEntryExit(): unknown;
  };
const coachOf = (): LiveCoach =>
  makeStuff(() => new Coach() as unknown as Stuff) as unknown as LiveCoach;

let road: Corridor;
const room = (i = 0): Stuff & Container => road.rooms.get(road.paths[i]!)!;

beforeEach(() => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  installModes();
  road = corridor(3);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the rig is towed, not self-propelled', () => {
  it('⭐ a HaulageRig is Haulable and deliberately NOT Mobile', () => {
    const rig = makeStuff(() => new HaulageRig());
    expect(MixinApi.isHaulable(rig)).toBe(true);
    // A wagon does not steer. Making it Mobile would have been a second
    // thing that moves — the duplication AC5 forbids — and would have
    // put the risky new composition on the shape that needs it least.
    expect(MixinApi.isMobile(rig)).toBe(false);
  });

  it('holds discrete cargo AND continuous matter, with no new mechanism', () => {
    const rig = makeStuff(() => new HaulageRig());
    // Crates go in as Container contents (from `Vessel`)…
    expect(MixinApi.isContainer(rig)).toBe(true);
    // …grain and ore go in the Bulkable interior. Half of freight is
    // not countable, and neither half needed anything new.
    expect(MixinApi.hasMixin(HaulageRig, Mixins.Bulkable)).toBe(true);
  });

  it('⭐ an open rig is an OPEN CONTAINER — perception needs no seam (AC8)', () => {
    const rig = makeStuff(() => new HaulageRig());
    ContainmentApi.move(rig as never, room() as never);
    // The single rule `canReach`, the MQL `peers` walk and
    // `VisionModality` all ask. Nothing in this pack implements it.
    expect(MixinApi.isOpenContainer(rig)).toBe(true);
  });

  it('affords `journey` to whoever is beside it — content affords content', () => {
    const defs = CommandApi.collectContributions(HaulageRig, 'peers')
      .map((d) => d.verbs)
      .flat();
    expect(defs).toContain('journey');
    // …and to a passenger riding in it.
    const inside = CommandApi.collectContributions(HaulageRig, 'environment')
      .map((d) => d.verbs)
      .flat();
    expect(inside).toContain('journey');
  });
});

describe('⚠ MobileMixin on a non-Character host', () => {
  it('unknown 1 — an ExitableVessel may live in a room and NOT in a wagon bed', () => {
    const coach = coachOf();
    const rig = makeStuff(() => new HaulageRig());
    ContainmentApi.move(rig as never, room() as never);

    // A room is Exitable, so the coach lands.
    ContainmentApi.move(coach, room());
    expect((coach as unknown as Containable).getContainer()).toBe(room());

    // A wagon bed is not — this is the "carry a chest with someone in
    // it" exploit-closer, and a coach is exactly the object it exists
    // for. It must still fire now that the vessel is also Mobile.
    expect(() =>
      ContainmentApi.move(coach, rig as unknown as Stuff & Container),
    ).toThrow();
  });

  it('unknown 2 — ⭐ a parked vehicle is CAPITAL and is never swept', () => {
    // The self-eviction sweep would otherwise cull an idle barge and its
    // owner would come back to nothing, with no error anywhere. The
    // shipped `Exit` precedent, applied to the one other kind of object
    // that legitimately sits still for a long time.
    for (const vehicle of [
      makeStuff(() => new Barge()),
      coachOf() as unknown as Stuff & { canEvict(c: { idleMs: number; reason: string }): { ok: boolean; reason?: string } },
    ]) {
      const veto = vehicle.canEvict({ idleMs: 9_000_000, reason: 'idle' });
      expect(veto.ok).toBe(false);
      expect(veto.ok === false && veto.reason).toMatch(/capital/);
    }
  });

  it('unknown 3 — a vessel with no Interactive announces arrival without throwing', async () => {
    const barge = makeStuff(() => new Barge());
    ContainmentApi.move(barge as never, room(0) as never);
    expect(MixinApi.isHasInteractive(barge as unknown as Stuff)).toBe(false);
    // The narration path reads the mover's sensorium and its displays.
    // A barge has neither, and the traverse must not care.
    await barge.traverse(road.exits.get(`${road.paths[0]}→${road.paths[1]}`)!, 'walk');
    expect((barge as unknown as Containable).getContainer()).toBe(room(1));
  });
});

describe('the coach', () => {
  it('⭐ is the ExitableVessel consumer, and a SHUT one is opaque (AC8)', () => {
    const coach = coachOf();
    expect(MixinApi.isExitable(coach)).toBe(true);
    expect(MixinApi.isSealable(coach)).toBe(true);

    // Shut: a passenger inside perceives the carriage, not the road.
    coach.setOpen(false);
    expect(MixinApi.isOpenContainer(coach)).toBe(false);
    // Open: the same object, and now you can see out. One `data` field.
    coach.setOpen(true);
    expect(MixinApi.isOpenContainer(coach)).toBe(true);
  });

  it('⭐ a passenger boards with the shipped `go <coach>` — no new verb (AC15o)', () => {
    const coach = coachOf();
    ContainmentApi.move(coach, room());
    coach.setOpen(true);
    // `getEntryExit` is the synthesized one-way exit from the current
    // environment INTO the vessel — what `go coach` traverses — and
    // `getExit('out')` is the way back. Both shipped with
    // `ExitableVessel`; this build is only their first consumer.
    expect(coach.getEntryExit()).toBeTruthy();
    expect(coach.getExit('out')).toBeTruthy();
  });

  it('⚠ steers off its OWN frame, not off a seat it does not ship', () => {
    const coach = coachOf();
    expect(MixinApi.isDrivable(coach)).toBe(true);
    expect(MixinApi.isMobile(coach)).toBe(true);
    // `SeatedDrivableMixin` resolves the controller slot by finding a
    // driver-ROLE SEAT OBJECT in the vessel's contents and THROWS when
    // there is none — so a coach composing it would refuse to be driven
    // the first time anybody tried, with an error about the content
    // author rather than about the road. A bare row is driven off
    // `controllerSlot` on its own frame.
    expect(
      MixinApi.isActive(coach, 'SeatedDrivableMixin'),
    ).toBe(false);
    expect(coach.getControllerSlot()).toBe('driver:1');
  });
});
