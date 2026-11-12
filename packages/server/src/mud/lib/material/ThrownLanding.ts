/**
 * ThrownLanding — ⭐ **what becomes of a thing thrown at something**, once the
 * throw has arrived (controllers-are-io D10): whether it breaks by ITS OWN
 * material (ceramics M5: the throw's joules against its own strength and what it
 * struck — a stoneware jug hurled at a wall breaks; one landing in hay does not),
 * and the contents' landing if it did.
 *
 * A value object because neither obvious host can hold it: `lint:combat-dynamics`
 * keeps a vessel's physics out of `lib/combat/`, and `TangibleMixin` sits beneath
 * `Thing`, so reaching the bulk and containment Apis from it is an import cycle
 * that calls the mixin before its module has run.
 */

import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { BulkableApi } from '../../api/bulk';
import { ContainmentApi } from '../../api/containment';

/** A spatter the shattered vessel left on somebody. */
export type ThrownSpatter =
  /** What a contact potion's effect reported, in its own words. */
  | { kind: "report"; line: string }
  /** A caustic spatter, beginning to eat. */
  | { kind: "corrosion"; material: string; victim: Stuff };

/**
 * What came of a throw at something (`Combatant.deliverThrown`, `ThrownLanding`).
 * `spatter` runs the contents' landing: the thrower reads *it shatters* first,
 * and what that did to whom after it, so the landing is the caller's to start.
 */
export type ThrownOutcome =
  | { arrived: "wide" }
  | { arrived: "hit" }
  | { arrived: "survived"; flawed: boolean }
  | { arrived: "shattered"; spatter: () => Promise<readonly ThrownSpatter[]> };

/** The arrival a thrown thing lands from (`CombatLogic.resolveThrown`). */
export interface ThrownArrival {
  profile: { energyJ: number };
  shares: readonly { victim: Stuff; litres: number }[];
  spilled: number;
}

export class ThrownLanding {
  constructor(
    private readonly item: Stuff,
    private readonly target: Stuff,
    private readonly arrival: ThrownArrival,
  ) {}

  /**
   * ⭐ The thing comes to rest by the target — wherever the target stands
   * (controller-liquidity W8, C50: a throw that went wide or struck and did
   * not break left the thing in the thrower's hand). A target that is
   * nowhere leaves it where it is.
   */
  settle(): void {
    const { item, target } = this;
    const landing = MixinApi.isContainable(target) ? target.getContainer() : null;
    if (landing !== null && MixinApi.isContainer(landing) && MixinApi.isContainable(item)) {
      ContainmentApi.move(item, landing);
    }
  }

  /** Break it or not, and hand back the contents' landing if it broke. */
  async land(): Promise<ThrownOutcome> {
    const { item, target, arrival } = this;
    const slot = BulkableApi.slotFor(item, undefined);
    const contents = slot?.getMaterial() ?? null;
    if (MixinApi.isIntegrity(item)) {
      const struck = MixinApi.isTangible(target) ? target.getMaterial() : null;
      const flawedBefore = item.getFlaws().length;
      const impact = { energyJ: arrival.profile.energyJ, surface: struck, cause: 'throw' as const };
      if (item.impactVerdict(impact) !== 'break') {
        // It survives the arrival (perhaps cracked); it lands by the target.
        this.settle();
        await item.sufferImpact(impact);
        return { arrived: 'survived', flawed: item.getFlaws().length > flawedBefore };
      }
    }
    return {
      arrived: 'shattered',
      spatter: async () => {
        const out: ThrownSpatter[] = [];
        for (const share of arrival.shares) {
          if (share.litres <= 0 || contents === null) continue;
          if (MixinApi.isPotable(contents)) {
            // ORIGIN is the victim: a contact payload acts at the point of
            // impact, not from the hand that threw it. Without this the
            // effect would measure its reach from the thrower and refuse
            // across the gap it just crossed.
            const reports = await contents.dischargeInto(share.victim, share.litres, {
              origin: share.victim,
            });
            for (const line of reports) out.push({ kind: 'report', line });
            continue;
          }
          // ⭐ A caustic vial that shatters on a body burns it — the
          // substance-contact corrosion seam, delivered through the one
          // injury door. A mundane splash answers `false` and nothing fires.
          const burned =
            MixinApi.hasAcidity(contents) &&
            contents.corrodeOnContact(share.victim, {
              energy: Math.min(4, 1 + share.litres),
            });
          if (burned) {
            out.push({ kind: 'corrosion', material: contents.getName(), victim: share.victim });
          }
        }
        // Whatever is left pools on the real floor, through the shipped
        // spill path — the same one `pour` uses.
        if (arrival.spilled > 0 && slot !== null) {
          const floor = BulkableApi.floorSurfaceNear(target);
          if (floor !== null) {
            BulkableApi.transfer(slot, floor, { kind: 'quantity', litres: arrival.spilled } as never);
          }
        }
        // The vessel is gone — it broke.
        await StuffApi.destruct(item);
        return out;
      },
    };
  }
}
