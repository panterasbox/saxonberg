/**
 * ⭐⭐ `VehicularMixin` — the three vehicles are one category, and it is
 * declared in one place.
 *
 * ⚠ It was three copies of the same static plus a caller-side guess.
 * The copies had already drifted: `Barge` and `Coach` vetoed residency
 * eviction and `HaulageRig` did not, so a parked wagon was cullable and
 * a parked barge was not, for no reason anybody chose.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { VEHICULAR_MIXIN } from '../lib/Vehicular';
import HaulageRig from '../thing/HaulageRig';
import Barge from '../thing/Barge';
import Coach from '../thing/Coach';

const JOURNEY = 'system/transport/cmd/movement/journey.yaml';

describe('VehicularMixin', () => {
  const kinds = [
    ['a rig', () => new HaulageRig()],
    ['a barge', () => new Barge()],
    ['a coach', () => new Coach()],
  ] as const;

  it('⭐ all three answer to the ONE marker — no caller re-derives the set', () => {
    for (const [label, make] of kinds) {
      const v = makeStuff(make as () => Stuff);
      expect(MixinApi.isActive(v, VEHICULAR_MIXIN), label).toBe(true);
    }
  });

  it('⭐ each contributes `journey` to peers AND environment — beside it and aboard it', () => {
    for (const [label, make] of kinds) {
      const ctor = (makeStuff(make as () => Stuff) as Stuff)
        .constructor as unknown as {
        commandContributions?: { peers?: string[]; environment?: string[] };
      };
      expect(ctor.commandContributions?.peers, label).toContain(JOURNEY);
      expect(ctor.commandContributions?.environment, label).toContain(JOURNEY);
    }
  });

  it('⚠⚠ ALL THREE veto residency eviction — the wagon did not, and that was the drift', () => {
    for (const [label, make] of kinds) {
      const v = makeStuff(make as () => Stuff) as Stuff & {
        canEvict(c: EvictionContext): { ok: true } | { ok: false; reason: string };
      };
      const veto = v.canEvict({} as EvictionContext);
      expect(veto.ok, label).toBe(false);
      if (veto.ok) continue;
      expect(veto.reason, label).toMatch(/capital, not clutter/);
    }
  });
});

describe('⭐⭐ travelMode — a vehicle declares how it travels', () => {
  /*
   * Until the routing build the LANE knew and the vehicle did not: a
   * Journey took its mode from `lane.mode`, so `journey to <stop> via
   * estuary` with a wagon hitched made the wagon SAIL — and it died at
   * the first leg, because a road exit does not admit the water
   * medium. A fact about a wagon was being read off the road it
   * happened to be told to take.
   */
  const kinds: ReadonlyArray<[string, () => Stuff]> = [
    ['a rig', () => new HaulageRig() as unknown as Stuff],
    ['a barge', () => new Barge() as unknown as Stuff],
    ['a coach', () => new Coach() as unknown as Stuff],
  ];

  for (const [label, make] of kinds) {
    it(`${label} can be told how it travels, and remembers`, () => {
      const v = makeStuff(make) as unknown as Stuff & {
        getTravelMode(): string;
        setTravelMode(m: string): void;
      };
      v.setTravelMode('wheeled');
      expect(v.getTravelMode()).toBe('wheeled');
    });
  }

  it('⚠ declares NOTHING by default, so a row that forgets REFUSES', () => {
    // Defaulting to `wheeled` would make a barge a cart on the first
    // row somebody forgot, and the failure would be a drowned hauler
    // three legs later rather than a refusal at the verb.
    const barge = makeStuff(() => new Barge()) as unknown as Stuff & {
      getTravelMode(): string;
    };
    expect(barge.getTravelMode()).toBe('');
  });

  it('is persistent and authorable, so a row sets it and a reboot keeps it', () => {
    // ⚠ Read through `getAllFieldMeta`, not off the class. `fieldMeta`
    // is own-property per class body and the framework collects it up
    // the chain with a PROPERTY-level merge — `HaulageRig.fieldMeta`
    // alone does not see what the mixin declared, which is exactly
    // the reading that made the first version of this test fail.
    const meta = MixinApi.getAllFieldMeta(HaulageRig);
    expect(meta.travelMode?.persistent).toBe(true);
    expect(meta.travelMode?.authorable).toBe(true);
  });
});
