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

// The same order `Receptacle` uses, and for the same reason: Thermal outer
// of Bulkable, so a holder's heat capacity derives from what is in it.
const WaterFixtureBase = UnboundedSourceMixin(ThermalMixin(BulkableMixin(Thing)));

export default class WaterFixture extends WaterFixtureBase {
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
