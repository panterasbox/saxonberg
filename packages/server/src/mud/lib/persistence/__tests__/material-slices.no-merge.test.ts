/**
 * A corpse is un-reanimatable **by protocol, not by policy**.
 *
 * The design turns on one asymmetry. `ForkableMixin.applyForkedState`
 * applies a slice by calling `mergeSlice_<Name>` ON THE TARGET. So if
 * material body-state travelled the ordinary Forkable route, every
 * `VitalsMixin` host would need a `mergeSlice_Vitals` — corpse and living
 * body alike — and that method would be precisely the "trusted mixin
 * escape" the design forbids. One call, and a corpse walks again.
 *
 * Instead the apply side is `adoptMaterialState`: gated to the death
 * choreography, and deliberately NOT named `mergeSlice_`. The guarantee
 * falls out of the absence — `forkRuntimeState(corpse, freshBody)` is a
 * structural no-op, because there is no applier for it to find. Nobody has
 * to remember the rule; there is nothing to call.
 *
 * This file is what keeps it that way. Adding a `mergeSlice_` for any
 * material slice is the single edit that silently undoes the design, and
 * it fails here.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { Character } from '../../character/Character';
import Avatar from '../../../obj/Avatar';
import { Quantity } from '../../quantity';
import { MATERIAL_FORK_SLICES } from '../../vitals/Vitals';
import { PersistableApi } from '../../../api/persistable';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from './quantity-marshaller-test-helpers';

/** Every `mergeSlice_*` name reachable on a class's prototype chain. */
function mergeSliceNames(instance: object): string[] {
  const names = new Set<string>();
  let proto: unknown = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key.startsWith('mergeSlice_')) names.add(key.slice(11));
    }
    proto = Object.getPrototypeOf(proto);
  }
  return [...names];
}

describe('material fork slices are fork-only', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('NO body class implements a mergeSlice_ for any material slice', () => {
    const bodies: Record<string, object> = {
      Creature: makeStuff(() => new Creature()),
      Character: makeStuff(() => new Character()),
      Avatar: makeStuff(() => new Avatar()),
    };

    for (const [label, instance] of Object.entries(bodies)) {
      const merges = mergeSliceNames(instance);
      const leaked = merges.filter((n) =>
        (MATERIAL_FORK_SLICES as readonly string[]).includes(n),
      );
      expect(
        leaked,
        `${label} implements mergeSlice_ for material slice(s): ` +
          `${leaked.join(', ')} — that is the reanimation hatch`,
      ).toEqual([]);
    }
  });

  it('the material slices ARE offered on the fork side', () => {
    // The other half of the asymmetry: fork-only means fork-ABLE.
    const c = makeStuff(() => new Creature());
    for (const name of MATERIAL_FORK_SLICES) {
      expect(
        typeof (c as unknown as Record<string, unknown>)[`forkSlice_${name}`],
      ).toBe('function');
    }
  });

  it('forkRuntimeState from a corpse into a fresh body is a structural no-op', async () => {
    const corpse = makeStuff(() => new Creature());
    corpse.setLifecycleState('dead');
    corpse.setCauseOfDeath('exsanguination');
    corpse.setVitalSign('bloodVolume', Quantity.of(0.2, 'L'));

    const fresh = makeStuff(() => new Creature());
    fresh.setLifecycleState('alive');
    const baseline = fresh.getVitalSign('bloodVolume').rawValue();

    // The protocol runs, offers every slice the corpse has, and lands
    // none of the material ones — there is no applier.
    await PersistableApi.forkRuntimeState(corpse, fresh);

    expect(fresh.getVitalSign('bloodVolume').rawValue()).toBe(baseline);
    expect(fresh.getCauseOfDeath()).toBeNull();
    expect(fresh.getLifecycleState()).toBe('alive');
  });

  it('adoptMaterialState is the only way in, and it is gated', () => {
    const corpse = makeStuff(() => new Creature());
    // Called from a test — i.e. not from the death choreography — the
    // security gate refuses. That refusal IS the defence-in-depth behind
    // the missing `mergeSlice_`.
    expect(() =>
      corpse.adoptMaterialState({ CauseOfDeath: { causeOfDeath: 'forged' } }),
    ).toThrow();
    expect(corpse.getCauseOfDeath()).toBeNull();
  });
});
