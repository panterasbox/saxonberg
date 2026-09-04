/**
 * Coach — a conveyance with a **navigable interior**: you go inside it,
 * the door shuts, and the road happens outside.
 *
 * ⭐ This is the consumer CLAUDE.md records `ExitableVessel` as waiting
 * for — *"deferred until a consumer needs a concrete class."* The whole
 * enterable-container machinery (the synthesized `out` exit, the
 * `go <coach>` entry exit, the defining door) is exactly a carriage, and
 * it has been shipped and unused since the boundary build.
 *
 * `DrivableMixin(SealableMixin(MobileMixin(ExitableVessel)))`.
 *
 * ⚠ **NOT `SeatedDrivableMixin`, and that is a finding rather than a
 * preference.** The seated override resolves the controller slot by
 * looking for a **driver-role seat OBJECT in the vessel's contents** and
 * *throws* when there is none — so a coach composing it would refuse to
 * be driven the first time anybody tried, with an error about the
 * content author rather than about the road. It is the right override
 * for a carriage that ships a box seat as a prop; a bare row is driven
 * from `controllerSlot` on its own frame, which is what this class does.
 * The override stays available for the coach line that wants it.
 *
 * ⚠ **A sealed coach is opaque, and that is the point** (AC8): a
 * passenger in an open wagon perceives the road, one in a shut
 * `Sealable` van does not, and the difference is one `data` field rather
 * than any code here. It is also why the interior needs its own light —
 * unlit is pitch black, and every object in a dark carriage reads as
 * *"something."*
 *
 * ⭐ **A passenger needs no new verb.** Boarding is the shipped
 * `go <coach>` / `enter`, alighting is `out`, and a passenger holds no
 * engagement at all — the journey is the driver's `hands`. AC15o falls
 * out of substrate that already shipped.
 */

import ExitableVessel from '@saxonberg/server/mud/lib/boundary/ExitableVessel';
import { MobileMixin } from '@saxonberg/server/mud/lib/spatial/Mobile';
import { SealableMixin } from '@saxonberg/server/mud/lib/spatial/Sealable';
import { DrivableMixin } from '@saxonberg/server/mud/lib/slot/Drivable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Slotted } from '@saxonberg/server/mud/lib/slot/Slotted';
import type { Sealable } from '@saxonberg/server/mud/lib/spatial/Sealable';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

// ⚠ `Sealable` is load-bearing, not decoration: `MixinApi.isOpenContainer`
// answers false for a Sealable that is shut, and that ONE predicate is
// what `canReach`, the MQL `peers` walk and `VisionModality` all ask. A
// coach without it would be permanently open and AC8 unrepresentable.
//
// ⚠⚠ **No `SlottedMixin` here.** `ExitableVessel` already composes
// `Adornable`, which IS `SlottedMixin` with an override — so adding one
// makes the chain apply it twice and `Slotted.occupyAll` (`@Final`)
// throws at class-stamp time, before a single test runs. The `Barge`
// needs its own because a plain `Vessel` has none. Two vehicles, two
// different bases, and the difference is not cosmetic.
/**
 * ⚠⚠ **The cast restores what the runtime already knows.** TypeScript
 * loses an anonymous mixin base's members through a nested generic
 * factory — the limitation the shipped `BusinessMixin` documents — and
 * `ExitableVessel` gets its `Slotted` through `Adornable`, three
 * factories down. So `DrivableMixin`'s `Stuff & Slotted` constraint
 * cannot see a `Slotted` that is genuinely there, and without this the
 * whole chain collapses to something that is not even a `Stuff`.
 *
 * ⚠ The obvious fix — add a `SlottedMixin` to satisfy the compiler —
 * **applies it twice at runtime** and throws `FinalViolationError:
 * Coach overrides final method SlottedMixin.occupyAll` at class-stamp
 * time, before a single line runs. A `Vessel` needs its own (the
 * `Barge` has one); an `ExitableVessel` must not have a second.
 *
 * ⚠ And the cast target is a CONCRETE constructor rather than the
 * `MixinConstructor` alias: that alias is a union of `new` and
 * `abstract new`, and `class extends <union>` loses the instance type
 * altogether — the class comes out not even assignable to `Stuff`.
 */
type CoachChassisShape = Stuff &
  Slotted &
  Sealable &
  Mobile &
  Container &
  Containable &
  Exitable;

const CoachChassis = SealableMixin(
  MobileMixin(ExitableVessel),
) as unknown as new (...args: any[]) => CoachChassisShape;

const CoachBase = DrivableMixin(CoachChassis);

export default class Coach extends CoachBase {
  static commandContributions: CommandContributions = {
    peers: ['system/transport/cmd/movement/journey.yaml'],
    environment: ['system/transport/cmd/movement/journey.yaml'],
  };

  /** See {@link Barge.canEvict} — a parked coach is capital. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'a parked vehicle is capital, not clutter' };
  }
}
