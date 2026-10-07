/**
 * OpenWater — ⭐ the first instanceable `Swimmable`, and `Ladder`'s twin
 * in every respect including the bug it fixes.
 *
 * `swim` shipped with the locomotion build. `SwimmableMixin` shipped
 * beside it. `BodyPlan/biped.yaml:56-59` has listed `swim` among a
 * person's locomotion modes the whole time, six estuary and wharfside
 * exits already carry `media: [ground, water]`, and **nothing in the
 * game composed the mixin**: not a class, not a row. The verb was
 * reachable by nobody.
 *
 * ⚠⚠ And the only composition of `SwimmableMixin` or `FlyableMixin`
 * anywhere was a TEST — `__tests__/integration/locomotion.test.ts`
 * manufactures a `SwimZoneLocation` and a `FlyZoneLocation` of its own.
 * That is why nobody noticed for three builds: the suite proved the
 * MECHANISM over a host it built itself, and the absence of any such
 * host in the realm was an assertion nowhere. A test that manufactures
 * what the world lacks hides the lack.
 *
 * ## A Thing in the room, not a Location
 *
 * The same reasoning `Ladder`'s header gives, and for the same mechanism:
 * `LocomotionLogic.findEnablementHost` looks in the actor's container
 * **and that container's contents** for a host composing the mode's
 * `enablementMixin`. Open water standing in a reach is exactly what makes
 * the water exit swimmable, and taking it away is what makes it not.
 *
 * Three hosts were considered and rejected:
 *
 * - **A Location subclass.** `lint:locations` enumerates location
 *   classes, and the wharfside bank is the city's working wharf with many
 *   exits and props — re-classing four rooms is four code-adjacent edits
 *   where the requirement is that *a second instance needs no code*. A
 *   fifth reach should be one row.
 * - **`SwimmableMixin` on `WaterFixture`** (the tide, the basin). That
 *   would claim you may swim in every receptacle of water in the realm —
 *   a well, a trough, a wash basin — and the guard that would have to
 *   re-narrow it is the tell that the host is wrong.
 * - **The water pack's `Shore`.** It carries the fishery's reach, and a
 *   swimmer is not drawing on a fish stock.
 *
 * ## What it claims, and what the gate order means
 *
 * `axes: ['*']` is safe and is not laxity: `LocomotionLogic`'s gate order
 * is body-plan → posture → `exit.canTraverse` (**the media gate**) →
 * enablement → haulage. The media gate runs FIRST, so a dry exit in the
 * same room as the water is refused before any enablement host is looked
 * for. The axis list would only matter for a body of water that served
 * some directions and not others, and none does.
 *
 * `difficulty: null` means anybody may. What the swim COSTS is the body's
 * business (`ExertingMixin.exertTraverse` at the swim mode's
 * `costMultiplier`), which is the same division of labour as the climb.
 */

import Thing from '../../lib/stuff/Thing';
import { SwimmableMixin } from '../../lib/locomotion/Swimmable';
import type { CommandContributions } from '../../api/command';

const OpenWaterBase = SwimmableMixin(Thing);

const SWIM = ['platform/cmd/movement/swim.yaml'];

export default class OpenWater extends OpenWaterBase {
  /**
   * ⭐ **The water affords `swim`** — the instrument affords the verb,
   * exactly as the ladder affords `climb` and for the identical reason.
   * `Mobile` contributes `go`/`walk`/`run`/`sneak` to every mover and
   * contributes none of the three enablement modes; what makes swimming
   * a thing you can do HERE is that there is water here.
   */
  static commandContributions: CommandContributions = {
    environment: SWIM,
    peers: SWIM,
  };
}
