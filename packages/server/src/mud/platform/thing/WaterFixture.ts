/**
 * WaterFixture — plumbed water you can work at: a wash basin, a tap, a
 * standpipe. Inexhaustible, so it never runs dry; its matter is water; and
 * it is the thing that affords `wash`.
 *
 * ⭐ **Composition: `UnboundedSourceMixin(ThermalMixin(BulkableMixin(Thing)))`
 * — its own stack, not {@link UnboundedReceptacle}'s.** It used to extend
 * that class, which sits on `Receptacle`, which since the base-class
 * narrowing sits on `Good`. A standpipe is plumbed into the ground: it is
 * nobody's chattel and you cannot hide it, and the constructor below has
 * been saying exactly that with `fixedInPlace` since a live drive walked out
 * of Dave's Bar carrying the wash basin. The three mixins it actually wants
 * are the three it now names; `UnboundedReceptacle`'s own two rows — the
 * coffee urn and the formless vessel — stay movable, which is right.
 *
 * ⚠ **`wash` was on `UnboundedReceptacle` itself, which is a different
 * fact.** That class says only *inexhaustible liquid source* — and its
 * other shipped row is the demo's **coffee urn**, which offered you a
 * verb for washing a glass in the coffee. "Afford statically, decline
 * diegetically" does not cover this: that rule is about a thing which
 * legitimately affords a verb being temporarily unable (a broken anvil
 * still hammers when mended). An urn is not a degraded basin.
 *
 * ⚠⚠ **And it was in the wrong bucket, so it reached nobody.**
 * `environment` grants OUTWARD to the containers ABOVE a thing — which
 * is why a rock in a bag in your pack still hands you `throw`. A basin
 * stands in the room as the player's SIBLING, not their ancestor, and
 * nobody carries a basin. So `wash` was afforded to no one, anywhere it
 * shipped: the bar basin, the tap, the standpipe, the dorm tap. The
 * sideways bucket is `peers`, and no test had ever asserted that a
 * person standing at a basin could actually see the verb.
 *
 * The controller stays more permissive than the affordance, deliberately:
 * `WashController` accepts **any** reachable bulk holder whose matter is
 * water, a carried jug included. What the fixture provides is
 * DISCOVERABILITY — you learn `wash` by standing at a sink — while what
 * makes it work is water in reach. A static cannot read a holder's
 * contents, and should not: that is the state-dependent affordance the
 * `InstanceContributor` seam used to express, and it was deleted for
 * good reasons (see command-routing.md).
 */

import Thing from '../../lib/stuff/Thing';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { UnboundedSourceMixin } from '../../lib/bulk/UnboundedSource';
import type { CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { BulkAffordance } from '../../lib/bulk/Bulkable';
import type { MarkupAugmenter } from '../../api/mml';
import { StuffApi } from '../../api/stuff';
import {
  SUPPLY_STATE_GLOSS,
  type SupplyReport,
  type SupplyReporting,
  type SupplyServing,
  type SupplyState,
} from '../../lib/supply/SupplyState';

/**
 * ⭐ Says why nothing comes out of a tap whose main is not delivering — in
 * the shipped vocabulary's own gloss, so a player who has learned what
 * *shut off* means at one tap has learned it at every tap.
 */
function supplyAugmenter(text: string, host: Stuff): string {
  if (!(host instanceof WaterFixture)) return text;
  const state = host.supplyStateNow();
  if (state === null) return text;
  return `${text}\n\nNothing comes out of it: ${SUPPLY_STATE_GLOSS[state]}.`;
}

// The same order `Receptacle` uses, and for the same reason: Thermal outer
// of Bulkable, so a holder's heat capacity derives from what is in it.
const WaterFixtureBase = UnboundedSourceMixin(ThermalMixin(BulkableMixin(Thing)));

export default class WaterFixture
  extends WaterFixtureBase
  implements SupplyServing, SupplyReporting
{
  /**
   * ⭐⭐ The main this tap is plumbed to — an identity path, or `''` for a
   * tap that is its own source (every tap the realm shipped before the
   * pump build, unchanged). When set, the tap runs only while the main
   * delivers, and says why when it does not.
   */
  protected suppliedBy = '';

  static fieldMeta: FieldMeta = {
    suppliedBy: { persistent: true, authorable: true, ref: 'identity' },
  };

  static markupAugmenters: MarkupAugmenter[] = [supplyAugmenter];

  /** Has the unresolved-main warning already been logged? */
  private _warnedUnresolved = false;

  constructor() {
    super();
    // ⭐ Plumbed in. A live drive walked out of Dave's Bar carrying the
    // wash basin — 30 kg is well inside a person's lift, so encumbrance
    // was never going to stop it, and nothing else did either. What
    // stops you is that it is connected to the water, which is exactly
    // what `fixedInPlace` says: no agent pockets it, while a remodel or
    // a `place` still moves it.
    this.fixedInPlace = true;
  }

  public getSuppliedBy(): string {
    return this.suppliedBy;
  }

  /**
   * The main, resolved by path. ⚠ An unresolved main **fails open** and
   * logs once: a tap on a main the world has not loaded behaves as every
   * tap always has, and `analyze water` says the main could not be found.
   */
  private mainOf(): (Stuff & Partial<SupplyServing & SupplyReporting>) | null {
    if (this.suppliedBy === '') return null;
    const main = StuffApi.findByTemplatePath(this.suppliedBy);
    if (!main && !this._warnedUnresolved) {
      this._warnedUnresolved = true;
      console.warn(
        `WaterFixture: main '${this.suppliedBy}' did not resolve; the tap runs as its own source`,
      );
    }
    return (main as Stuff & Partial<SupplyServing & SupplyReporting>) ?? null;
  }

  /** Why the main is not delivering, or `null` (running, or no main). */
  public supplyStateNow(): SupplyState | null {
    const main = this.mainOf();
    if (!main || typeof main.supplyStateNow !== 'function') return null;
    return main.supplyStateNow();
  }

  public override isBulkEmpty(affordance: BulkAffordance): boolean {
    if (affordance === 'interior' && this.supplyStateNow() !== null) return true;
    return super.isBulkEmpty(affordance);
  }

  public override getBulkAvailable(affordance: BulkAffordance): number {
    if (affordance === 'interior' && this.supplyStateNow() !== null) return 0;
    return super.getBulkAvailable(affordance);
  }

  /**
   * ⭐ `analyze water <tap>` reads the MAIN — the tap has no working of its
   * own to show, and the whole lesson is that what you see at the tap is
   * decided somewhere else.
   */
  public async supplyReport(nowS: number): Promise<SupplyReport> {
    const main = this.mainOf();
    if (main && typeof main.supplyReport === 'function') {
      return main.supplyReport(nowS);
    }
    return {
      label: this.getPresentation(),
      state: null,
      lines: [
        this.suppliedBy === ''
          ? 'It draws on its own source, and nothing upstream decides whether it runs.'
          : 'It is plumbed to a main that cannot be found.',
      ],
    };
  }

  /** Sideways: anyone in the room with the basin can wash at it. */
  static commandContributions: CommandContributions = {
    peers: [
      'platform/cmd/crafting/wash.yaml',
      // ⭐ You learn `rinse` the same way you learn `wash`: by standing
      // at water. A separate verb rather than a second `wash` stanza —
      // `wash`'s arg is a CRAFTED thing, and widening it to also accept a
      // body would delete a check (see `RinseController`'s header).
      'platform/cmd/medical/rinse.yaml',
      // ⭐ …and you cool a burn at water the same way (recovery build).
      'platform/cmd/medical/cool.yaml',
      // ⭐ …and you wash your hands clean at it — bare `wash` (recovery
      // build, D10). Handwashing folded into `wash` rather than a
      // separate `scrub`: it has no object arg (the hands are your own
      // body), so nothing was widened. `rinse` stays separate because it
      // takes a body ARG.
    ],
  };
}
