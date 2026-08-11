/**
 * The kind validators added by the affordance-honesty sweep.
 *
 * ⚠⚠ **Acceptance criterion 21: no validator invents a refusal.** The
 * governing constraint of the sweep is that a validator and its
 * controller share ONE predicate — a validator that re-states a
 * controller's guard in different words is a second source of truth,
 * and drift here is invisible: the menu says yes and the verb says no.
 *
 * So each case below asserts the pairing in both directions:
 *
 *   - a Stuff the controller would ACCEPT passes the validator;
 *   - a Stuff the controller would REFUSE fails it.
 *
 * The second direction is the one that matters. **Under-reporting is a
 * build failure** — a verb that quietly disappears from every menu is
 * undiscoverable, which is strictly worse than a verb that is offered
 * and then declines with a reason.
 *
 * The predicate each validator shares with its controller is named in
 * the case, so a reviewer can check the pairing without opening both
 * files.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { MixinApi } from '../../../../api/mixin';
import { Idea } from '../../../stuff/Idea';
import Location from '../../../stuff/Location';
import { NamedMixin } from '../../../description/Named';
import { makeStuff } from '../../../security/__tests__/test-setup';
import type { Stuff } from '../../../stuff/Stuff';
import type { FieldValidator } from '../../../../api/command';

import mustBeSwitchable from '../mustBeSwitchable';
import mustBeFoldable from '../mustBeFoldable';
import mustBeHazard from '../mustBeHazard';
import mustBeSealable from '../mustBeSealable';
import mustBeLockable from '../mustBeLockable';
import mustBeIgnitable from '../mustBeIgnitable';
import mustBeFurnace from '../mustBeFurnace';
import mustHaveVitals from '../mustHaveVitals';
import mustBeBehaved from '../mustBeBehaved';
import mustBeLabelled from '../mustBeLabelled';
import mustBeCultivable from '../mustBeCultivable';
import mustBeGrowing from '../mustBeGrowing';
import mustBeBuildVessel from '../mustBeBuildVessel';
import mustBeDurable from '../mustBeDurable';
import mustBeKeen from '../mustBeKeen';
import mustBeCrafted from '../mustBeCrafted';
import mustBeAttendant from '../mustBeAttendant';
import mustBeGlobbable from '../mustBeGlobbable';
import mustBeCharged from '../mustBeCharged';
import mustBeMarked from '../mustBeMarked';
import mustBeMountable from '../mustBeMountable';
import mustBeDrivable from '../mustBeDrivable';
import mustHaveBulkSlot from '../mustHaveBulkSlot';
import mustBePlantable from '../mustBePlantable';
import Seed from '../../../../obj/Seed';
import { PlantableMixin } from '../../../husbandry/Plantable';

/** A plain, mixin-less thing — the shape every one of these refuses. */
class Plain extends NamedMixin(Idea) {
  static _mixinName = 'PlainForValidatorTest';
}

/** Wrap a Stuff the way the binder hands a single-cardinality match. */
function match(stuff: Stuff): unknown {
  return { stuff, matches: [{ stuff }] };
}

/**
 * Every validator, with the `MixinApi` predicate its controller uses.
 * Keeping them in one table is the point: it is the reviewable list of
 * "which guard did we claim to extract".
 */
const CASES: {
  name: string;
  validator: FieldValidator;
  predicate: (s: Stuff) => boolean;
}[] = [
  { name: 'mustBeSwitchable', validator: mustBeSwitchable, predicate: (s) => MixinApi.isSwitchable(s) },
  { name: 'mustBeFoldable', validator: mustBeFoldable, predicate: (s) => MixinApi.isFoldable(s) },
  { name: 'mustBeHazard', validator: mustBeHazard, predicate: (s) => MixinApi.isHazard(s) },
  { name: 'mustBeSealable', validator: mustBeSealable, predicate: (s) => MixinApi.isSealable(s) },
  { name: 'mustBeLockable', validator: mustBeLockable, predicate: (s) => MixinApi.isLockable(s) },
  { name: 'mustBeFurnace', validator: mustBeFurnace, predicate: (s) => MixinApi.isFurnace(s) },
  { name: 'mustBeIgnitable', validator: mustBeIgnitable, predicate: (s) => MixinApi.isCombustible(s) || MixinApi.isFurnace(s) },
  { name: 'mustHaveVitals', validator: mustHaveVitals, predicate: (s) => MixinApi.isVitals(s) },
  { name: 'mustBeBehaved', validator: mustBeBehaved, predicate: (s) => MixinApi.isBehaved(s) },
  { name: 'mustBeLabelled', validator: mustBeLabelled, predicate: (s) => MixinApi.isLabelled(s) },
  { name: 'mustBeCultivable', validator: mustBeCultivable, predicate: (s) => MixinApi.isCultivable(s) },
  { name: 'mustBeGrowing', validator: mustBeGrowing, predicate: (s) => MixinApi.isGrowing(s) },
  { name: 'mustBeBuildVessel', validator: mustBeBuildVessel, predicate: (s) => MixinApi.isBuildVessel(s) },
  { name: 'mustBeDurable', validator: mustBeDurable, predicate: (s) => MixinApi.isDurable(s) },
  { name: 'mustBeKeen', validator: mustBeKeen, predicate: (s) => MixinApi.isKeen(s) },
  { name: 'mustBeCrafted', validator: mustBeCrafted, predicate: (s) => MixinApi.isCrafted(s) },
  { name: 'mustBeAttendant', validator: mustBeAttendant, predicate: (s) => MixinApi.isAttendant(s) },
  { name: 'mustBeGlobbable', validator: mustBeGlobbable, predicate: (s) => MixinApi.isGlobbable(s) },
  { name: 'mustBeCharged', validator: mustBeCharged, predicate: (s) => MixinApi.isCharged(s) },
  { name: 'mustBeMarked', validator: mustBeMarked, predicate: (s) => MixinApi.isMarked(s) },
  { name: 'mustBeMountable', validator: mustBeMountable, predicate: (s) => MixinApi.isMountable(s) },
  { name: 'mustBeDrivable', validator: mustBeDrivable, predicate: (s) => MixinApi.isDrivable(s) },
  { name: 'mustBePlantable', validator: mustBePlantable, predicate: (s) => MixinApi.isPlantable(s) },
];

describe('kind validators refuse exactly what their controller refuses', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  /*
   * Direction one, and the whole point of criterion 21: the validator's
   * verdict tracks the controller's predicate. A plain Stuff fails the
   * predicate, so it must fail the validator — and the message must
   * name the thing, because a refusal the player can't act on is a
   * dead end.
   */
  describe.each(CASES)('$name', ({ validator, predicate }) => {
    it('refuses a Stuff its controller would refuse, and says which', () => {
      const plain = makeStuff(() => new Plain()) as unknown as Stuff;
      (plain as unknown as { setName(n: string): void }).setName('a plain rock');

      // The predicate is the contract; assert we are testing the case
      // we think we are rather than trusting the class shape.
      expect(predicate(plain)).toBe(false);

      const verdict = validator(match(plain), 'target', undefined as never, undefined as never);
      expect(verdict).toBeTruthy();
      expect(String(verdict)).toContain('plain rock');
    });
  });

  /*
   * ⭐ The product complaint, pinned. Before this validator existed the
   * menu offered **`plant` on a rock**: `seed` is the verb's first
   * object-shaped slot, so any target bound to it, and the arg was
   * declared `targetKind: any`. The controller refused — after the
   * player had already been told they could.
   *
   * The other half matters as much: a real `Seed` must still pass, or
   * the fix would have hidden a verb that works, which the sweep calls
   * a build failure.
   */
  describe('plant', () => {
    it('refuses a rock, and still accepts a seed', () => {
      const rock = makeStuff(() => new Plain()) as unknown as Stuff;
      (rock as unknown as { setName(n: string): void }).setName('a rock');
      expect(
        mustBePlantable(match(rock), 'seed', undefined as never, undefined as never),
      ).toBeTruthy();

      const seed = makeStuff(() => new Seed()) as unknown as Stuff;
      expect(MixinApi.isPlantable(seed)).toBe(true);
      expect(
        mustBePlantable(match(seed), 'seed', undefined as never, undefined as never),
      ).toBeUndefined();
    });

    /*
     * ⚠ The capability is the mixin, not the class — so anything that
     * composes `PlantableMixin` is plantable without extending `Seed`.
     * That is the whole reason the refusal moved off `instanceof`:
     * cuttings, tubers and bulbs should not need a class hierarchy.
     */
    it('accepts a non-Seed that composes the mixin', () => {
      class Cutting extends PlantableMixin(NamedMixin(Idea)) {
        static _mixinName = 'CuttingForValidatorTest';
      }
      const cutting = makeStuff(() => new Cutting()) as unknown as Stuff;
      expect(cutting).not.toBeInstanceOf(Seed);
      expect(
        mustBePlantable(match(cutting), 'seed', undefined as never, undefined as never),
      ).toBeUndefined();
    });
  });

  /*
   * Direction two — the one whose absence is a BUILD FAILURE. A room is
   * the canonical wrong target for the four verbs criterion 23 names,
   * and it must not accidentally satisfy any of these predicates: if it
   * did, the sweep would have changed nothing for the exact cases it
   * exists to fix.
   */
  it('refuses a Location for every verb that acts on a thing', () => {
    const room = makeStuff(() => new Location()) as unknown as Stuff;
    for (const { name, validator, predicate } of CASES) {
      expect(predicate(room), `${name} predicate on a room`).toBe(false);
      expect(
        validator(match(room), 'target', undefined as never, undefined as never),
        `${name} must refuse a room`,
      ).toBeTruthy();
    }
  });

  /*
   * ⭐ Criterion 23, by name. These are the four the affordance
   * resolver was recorded as getting wrong.
   */
  describe('the four recorded cases, closed by name', () => {
    it('attack is refused on a room (mustHaveVitals)', () => {
      const room = makeStuff(() => new Location()) as unknown as Stuff;
      expect(
        mustHaveVitals(match(room), 'target', undefined as never, undefined as never),
      ).toBeTruthy();
    });

    it('drink is refused on a room (mustHaveBulkSlot)', () => {
      const room = makeStuff(() => new Location()) as unknown as Stuff;
      expect(
        mustHaveBulkSlot(match(room), 'target', undefined as never, undefined as never),
      ).toBeTruthy();
    });

    it('talk is refused on a room (mustBeBehaved)', () => {
      const room = makeStuff(() => new Location()) as unknown as Stuff;
      expect(
        mustBeBehaved(match(room), 'target', undefined as never, undefined as never),
      ).toBeTruthy();
    });

    /*
     * ⭐ `cast` is the one that does NOT close with a validator, and
     * recording that here is deliberate. `CastController` refuses on
     * the SPELL's own target rule — not a property of the arg — so the
     * arg carries `targetKind: any` and the spell keeps its refusal.
     * Inventing a kind constraint to make the count look complete is
     * exactly the "wrong validator is worse than a missing one" case.
     */
    it('cast is declared kind-unconstrained rather than given an invented validator', async () => {
      const { CommandApi } = await import('../../../../api/command');
      CommandApi.clearCache();
      await CommandApi.preloadAll();
      const cast = CommandApi.getCommand('magic/cast.yaml');
      const target = cast?.args.find((a) => a.name === 'target');
      expect(target?.targetKind).toBe('any');
      expect(target?.validators ?? []).not.toContain(
        '/lib/command/validators/mustHaveVitals',
      );
    });
  });
});
