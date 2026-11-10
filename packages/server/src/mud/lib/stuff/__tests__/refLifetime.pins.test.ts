/**
 * Reference-lifetime pins — the ORACLE for the `fieldMeta` conversion.
 *
 * Every assertion here describes behaviour that ships TODAY, written
 * from the doc's claim rather than from the code. Waves W4b and W6
 * replace hand-written self-heal getters and hand-written destruct
 * cascades with declarations (`ref: 'instance'` + a `lifetime`); these
 * pins are what proves the mechanism reproduced the behaviour. A pin
 * that fails is a finding, not an assertion to adjust.
 *
 * ## Why each `owned` pin asserts the CASCADE
 *
 * Slot 2.5 is defensive by design: it skips already-destroyed targets,
 * no-ops on an empty slot, and clears the holder's slot afterwards. That
 * is what makes an UN-migrated site inert — but it is equally what makes
 * a HALF-migrated one silently inert. (The original case was
 * `Boundary.onDestruct`, which nulled its anchor slots before destructing
 * them, so 2.5 found nothing to cascade; the anchors retired with the
 * boundary build, 2026-11.)
 *
 * So a slot-emptiness assertion passes in BOTH worlds and proves
 * nothing. Every pin below asserts `target.isDestroyed()` —
 * the thing that actually differs. The same trap sits on
 * `Exitable.exits` (`this.exits.clear()`) and `Adornable.fixtureSlots`
 * (`this.fixtureSlots.clear()`).
 *
 * ## Coverage note
 *
 * Four of the six W6 conversion targets — `Exitable.exits`,
 * `Adornable.fixtureSlots`, `Boundary`'s anchors and
 * `Aether._hostedUpdates` — had **no destruct coverage anywhere in the
 * tree** when these pins were written. For those four this file is not a
 * second opinion; it is the only oracle there is.
 *
 * The R2.3 self-heal getters DO have existing coverage (`Hauler.test`,
 * `Haulable.test`, `Spawned.test`, `Warren.test`, `Container.destruct`).
 * They are re-pinned here anyway because "the six shipped self-heals" is
 * named by four different lists across the design docs, and W4b needs one
 * enumerated place that says which six.
 */

import "../../../../test-bootstrap";
import Holder from '../Holder';
import { describe, it, expect, beforeEach, afterEach  } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { ContainmentApi } from '../../../api/containment';
import { BoundaryApi } from '../../../api/boundary';
import type { Stuff } from '../Stuff';
import Thing from '../Thing';
import Place from '../Place';
import { Idea } from '../Idea';
import Exit from '../../boundary/Exit';
import { Boundary } from '../../boundary/Boundary';
import { SpawnerMixin } from '../Spawner';
import { SpawnedMixin } from '../Spawned';
import { ContainerMixin } from '../../spatial/Container';
import { PlacingMixin } from '../../spatial/Placing';
import { WarrenMemberMixin } from '../../location/WarrenMember';
import { ExitableMixin } from '../../boundary/Exitable';
import { AdornableMixin } from '../../boundary/Adornable';
import { AdornmentMixin } from '../../boundary/Adornment';
import { AetherMixin } from '../../message/Aether';
import { AetherHostedMixin } from '../../augmentation/AetherHosted';
import { makeStuff,
  seedKernelContentStore,
} from '../../security/__tests__/test-setup';
import { cart, haulingBearer } from '../../slot/__tests__/haulage-fixtures';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { Placements } from '../../spatial/Placement';

// ── Fixtures ────────────────────────────────────────────────────────

class Box extends Holder {}
class Desk extends PlacingMixin(Holder) {}
class Nest extends SpawnerMixin(Idea) {}
class Hatchling extends SpawnedMixin(Idea) {}
class MemberRoom extends WarrenMemberMixin(Place) {}
class ExitRoom extends ExitableMixin(Place) {}
class Wall extends AdornableMixin(Holder) {}
class Fixture extends AdornmentMixin(Thing) {}
class Implant extends AetherMixin(Thing) {}
class Update extends AetherHostedMixin(Thing) {}

const asStuff = (x: unknown): Stuff => x as Stuff;

describe('reference-lifetime pins', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    // The haulage fixtures build Quantity-bearing Stuff.
    installV1QuantityMarshallers();
  });
  afterEach(() => StuffApi.clearAll());

  // ── The six shipped R2.3 self-heal getters (W4b's targets) ────────
  //
  // Each reads a live ref, notices the target is destroyed, nulls the
  // slot and returns null. W4b moves this to the ProxyApi get trap; the
  // OBSERVABLE below must not change.

  describe('R2.3 self-heal getters — W4b must preserve these exactly', () => {
    // These getters are BACKSTOPS: on the normal path the R2.4
    // chokepoints (evacuation, untrack, unhitch) clear the slot eagerly
    // and the self-heal never fires. To exercise the branch at all a
    // test has to synthesise the stale ref — stamp a destroyed Stuff
    // into the slot by cast, simulating a bypass of the chokepoint.
    // That is the tree's established idiom for this
    // (`Container.destruct.test.ts`, `Haulable.test.ts`) and is used
    // here rather than invented.
    //
    // Each pin asserts BOTH halves of the contract: the read returns
    // null, AND the slot was cleared (a second read cannot see it
    // either). W4b moves the mechanism to the ProxyApi get trap; these
    // two observables must survive unchanged.

    it('Containable.environment — getContainer() heals a destroyed container', () => {
      const deadRoom = makeStuff(() => new Box());
      StuffApi.destruct(deadRoom);
      const item = makeStuff(() => new Thing());

      (item as unknown as { environment: unknown }).environment = deadRoom;
      expect(item.getContainer()).toBeNull();
      expect((item as unknown as { environment: unknown }).environment).toBeNull();
    });

    it('Containable._placementHost — getPlacement() heals a destroyed host', () => {
      const room = makeStuff(() => new Box());
      const desk = makeStuff(() => new Desk());
      const mug = makeStuff(() => new Thing());
      ContainmentApi.move(desk, room);
      ContainmentApi.move(mug, room);
      ContainmentApi.move(mug, desk, Placements.ON);
      expect((mug.getPlacement()?.host ?? null)).toBe(desk);

      StuffApi.destruct(desk);
      expect((mug.getPlacement()?.host ?? null)).toBeNull();
      expect((mug as unknown as { _placementHost: unknown })._placementHost).toBeNull();
    });

    it('Spawned._spawner — getSpawner() heals a destroyed spawner', () => {
      const nest = makeStuff(() => new Nest());
      const baby = makeStuff(() => new Hatchling());
      baby.setSpawner(nest);
      expect(baby.getSpawner()).toBe(nest);

      // `setSpawner` alone does not enter the Spawner's collection
      // (that is `trackSpawn`), so destructing the nest cannot reach
      // back to clear this — the null below IS the self-heal.
      StuffApi.destruct(nest);
      expect(baby.getSpawner()).toBeNull();
      expect((baby as unknown as { _spawner: unknown })._spawner).toBeNull();
    });

    it('Hauler._hauling — getHauledCart() heals a destroyed cart', () => {
      const bearer = haulingBearer();
      const deadCart = cart();
      StuffApi.destruct(asStuff(deadCart));
      // Stale half-set: the hauler's slot points at a destroyed cart
      // without the cart's back-ref, so `unhitch` never ran for it.
      (bearer as unknown as { _hauling: unknown })._hauling = deadCart;

      expect(bearer.getHauledCart()).toBeNull();
      expect(bearer.isHitched()).toBe(false);
      expect((bearer as unknown as { _hauling: unknown })._hauling).toBeNull();
    });

    it('Haulable._hauledBy — getHauledBy() heals a destroyed hauler', () => {
      const c = cart();
      const bearer = haulingBearer();
      // Wire ONLY the cart's back-ref — a half-set pair. The bearer's
      // own `_hauling` stays null, so its `onDestruct`/`unhitch` has
      // nothing to clear and the cart is left holding a dead ref.
      c.setHauledBy(bearer);
      StuffApi.destruct(asStuff(bearer));

      expect(c.getHauledBy()).toBeNull();
      expect((c as unknown as { _hauledBy: unknown })._hauledBy).toBeNull();
    });

    it('WarrenMember._warren — getWarren() heals a destroyed warren', async () => {
      const room = makeStuff(() => new MemberRoom());
      // A plain Stuff stands in for the Warren: the self-heal branch
      // only asks `isDestroyed()`. Same stand-in the sibling
      // residencyVetoes suite uses.
      const warren = makeStuff(() => new Thing());
      (room as unknown as { setWarren(w: unknown): void }).setWarren(warren);
      expect(
        (room as unknown as { getWarren(): unknown }).getWarren()
      ).toBe(warren);

      // Same argument as Spawned: `setWarren` does not add the room to
      // the Warren's member set, so nothing clears this eagerly.
      StuffApi.destruct(warren);
      expect(
        (room as unknown as { getWarren(): unknown }).getWarren()
      ).toBeNull();
      expect((room as unknown as { _warren: unknown })._warren).toBeNull();
    });
  });

  // ── The W6 conversion targets ─────────────────────────────────────

  describe('W6 #1 — Hauler ↔ Haulable, the symmetric pair', () => {
    it('destructing the hauler clears the cart back-ref', () => {
      const bearer = haulingBearer();
      const c = cart();
      bearer.hitch(c);
      expect(c.getHauledBy()).toBe(bearer);

      StuffApi.destruct(asStuff(bearer));
      // Symmetric, NOT owned: the cart survives its hauler.
      expect(asStuff(c).isDestroyed()).toBe(false);
      expect(c.getHauledBy()).toBeNull();
    });

    it('destructing the cart clears the hauler back-ref (R2.3 self-heal)', () => {
      const bearer = haulingBearer();
      const c = cart();
      bearer.hitch(c);

      StuffApi.destruct(asStuff(c));
      expect(asStuff(bearer).isDestroyed()).toBe(false);
      expect(bearer.getHauledCart()).toBeNull();
      expect(bearer.isHitched()).toBe(false);
    });
  });

  describe('Boundary sides — weak (the anchors retired with the boundary build)', () => {
    function sides(): [Exit, Exit] {
      const room = makeStuff(() => new ExitRoom());
      const north = makeStuff(
        () => new Exit({ direction: 'north', source: room, destinationPath: '/x' })
      );
      const south = makeStuff(
        () => new Exit({ direction: 'south', source: room, destinationPath: '/y' })
      );
      return [north, south];
    }

    it('destructing a side clears only ITS slot; the boundary lives on', async () => {
      const boundary = await StuffApi.create(() => new Boundary());
      const [north, south] = sides();
      BoundaryApi.attach(boundary, north, south);

      StuffApi.destruct(asStuff(north));

      expect(boundary.getSides()).toEqual([null, south]);
      expect(asStuff(south).isDestroyed()).toBe(false);
      expect(asStuff(boundary).isDestroyed()).toBe(false);
    });

    it('destructing the boundary does NOT cascade to its sides (it owns neither)', async () => {
      const boundary = await StuffApi.create(() => new Boundary());
      const [north, south] = sides();
      BoundaryApi.attach(boundary, north, south);

      StuffApi.destruct(asStuff(boundary));

      expect(asStuff(north).isDestroyed()).toBe(false);
      expect(asStuff(south).isDestroyed()).toBe(false);
    });
  });

  describe('W6 #4 — Exitable.exits is owned (a Map)', () => {
    it('destructing the room DESTRUCTS every outbound exit', async () => {
      const room = makeStuff(() => new ExitRoom());
      const exit = makeStuff(
        () =>
          new Exit({
            direction: 'north',
            source: room,
            destinationPath: '/nowhere',
          })
      );
      await room.addExit(exit);
      expect(room.getExits().size).toBe(1);

      StuffApi.destruct(asStuff(room));

      // THE CASCADE — `onDestruct` destructs then calls `exits.clear()`.
      expect(asStuff(exit).isDestroyed()).toBe(true);
    });
  });

  describe('W6 #5 — Adornable.fixtureSlots is owned (a Map)', () => {
    it('destructing the host DESTRUCTS every fixture', () => {
      const wall = makeStuff(() => new Wall());
      const fixture = makeStuff(() => new Fixture());
      expect(wall.addFixture(fixture)).toBe(true);
      expect(wall.getFixtures()).toContain(fixture);

      StuffApi.destruct(asStuff(wall));

      // THE CASCADE — `onDestruct` destructs then `fixtureSlots.clear()`.
      expect(asStuff(fixture).isDestroyed()).toBe(true);
    });
  });

  describe('W6 #7 — Aether._hostedUpdates is owned (cleanupOnDestruct form)', () => {
    it('destructing the host DESTRUCTS every hosted update', () => {
      const host = makeStuff(() => new Implant());
      const update = makeStuff(() => new Update());
      host.hostUpdate(update);
      expect(host.getHostedUpdates()).toContain(update);

      StuffApi.destruct(asStuff(host));

      // THE CASCADE. This site is `cleanupOnDestruct`-form (slot 3),
      // which runs AFTER slot 2.5 — so per plan F4 it must convert
      // atomically, declaration in and handler out in one commit.
      expect(asStuff(update).isDestroyed()).toBe(true);
    });
  });

  // ── The control ───────────────────────────────────────────────────

  describe('CONTROL — Container.contents must NOT become `owned`', () => {
    it('destructing a container EVACUATES its contents outward, not destructs them', () => {
      const outer = makeStuff(() => new Box());
      const inner = makeStuff(() => new Box());
      const item = makeStuff(() => new Thing());
      ContainmentApi.move(inner, outer);
      ContainmentApi.move(item, inner);

      StuffApi.destruct(asStuff(inner));

      // `Container.contents` looks exactly like the `owned` exemplars
      // and is NOT one: the cleanup evacuates outward and destructs only
      // as a last resort, which fails step 4 of the `owned` audit
      // ("does the current cleanup do anything other than destruct?").
      // A sword in a destroyed room is re-homeable. If this test ever
      // reds because contents were destructed, an `owned` declaration
      // has been added that must be reverted.
      expect(asStuff(item).isDestroyed()).toBe(false);
      expect(item.getContainer()).toBe(outer);
    });
  });
});
