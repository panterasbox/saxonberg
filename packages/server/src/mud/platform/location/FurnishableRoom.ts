/**
 * FurnishableRoom — a room that persists **a record of its own**: its
 * built-in fixtures, its room-level state, and (through the spine's overlay)
 * the owned goods people have placed in it.
 *
 * The one class every room archetype is a template row over — bedroom,
 * kitchen, bathroom, living (D6). What distinguishes them is prose and their
 * `props:` fixture set, both already declarative data, and that is the
 * whole difference: **an archetype is a conventional fixture set, not a
 * kind of thing.**
 *
 * ## Venue-generic on purpose (D15)
 *
 * Nothing here is residential. A bank's bathroom and a bar's kitchen are the
 * same class with different `props:`; home-ness is supplied by the
 * **parcel above the room** — title, land use, the lease — never by the room.
 * Every candidate for residence-specific behaviour failed at this tier: the
 * lease lifecycle is generic to tenancy, owner-based persistence wants the
 * same rule for a shopkeeper's tools, sleep-as-logout works in an inn, and a
 * lease-gated door is the *door*. So the room stays plain, and the next
 * venue that wants a bathroom writes a seed row.
 *
 * Composition — `CartesianLocation` plus the three layers a room
 * somebody FURNISHES needs:
 *
 *   Persistable → WarrenMember → Reserved → CartesianLocation
 *     (which carries PostRegistration, Populates, Detailed, Perceptible,
 *     Exitable, CartesianCoordinates, Visible, and Location's Container,
 *     Adornable, AmbientLit, Atmospheric, Addressable)
 *
 * It sits in the location taxonomy rather than beside it — the axis is
 * `{cartesian, spherical} × {authored, minted}`, and a furnished room is
 * MINTED (many rooms per row, keyed per holding — three houses on three
 * lots are three halls from one `hall.yaml`) and CARTESIAN (a floorplan
 * is a grid, and its authored exits say so: `direction: east`,
 * `direction: north`).
 *
 * Every layer is load-bearing and the omission of any of them is silent:
 * without `Populates` a seed's `props:` is INERT and no fixture ever
 * lands; without `Visible` its prose is inert; without `Exitable` you cannot
 * walk into it. `Reserved` is what lets a room AUTHOR a finite `air` budget.
 * `WarrenMember` is the back-ref a holding programme manages its rooms
 * through — inert (null) for a free-standing venue room.
 *
 * That the shipped dorm room already had exactly this stack is the reason
 * to mirror it rather than re-derive: `DormRoom` IS a room archetype (a
 * bedsit — bed, desk, footlocker, tap), and it has been carrying the
 * correct composition all along.
 *
 * The reserve is capability, not behaviour: `FireLogic` reads
 * `hasReserve('air')` and treats its absence as open air, so every room
 * that does not author one behaves exactly as it does today. The kitchen
 * authors one, because it is the room where you deliberately run a fire
 * indoors — a lit range behind a closed door burns incomplete, fills with
 * smoke and carbon monoxide, and self-smothers (D12).
 */

import Location from "../../lib/stuff/Location";
import { PersistableMixin } from "../../lib/persistence/Persistable";
import { PopulatesMixin } from "../../lib/stuff/Populates";
import { VisibleMixin } from "../../lib/description/Visible";
import { DetailedMixin } from "../../lib/description/Detailed";
import { ExitableMixin } from "../../lib/boundary/Exitable";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";
import { ReservedMixin } from "../../lib/reserve";
import { WarrenMemberMixin, type WarrenMember } from "../../lib/location/WarrenMember";
import { MixinApi } from "../../api/mixin";
import { CallSecurity, Final } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Container } from "../../lib/spatial/Container";
import type { Containable } from "../../lib/spatial/Containable";
import type { FieldMeta } from "../../lib/mixin";

/** The default posted designation — the room says nothing about who it is for. */
export const UNRESTRICTED = "unrestricted";

// ⭐⭐ **It is NOT one of the four Location classes, and that is a claim
// about what a furnished room IS.**
//
// **Minted**, yes: many live rooms per row, keyed per holding — three
// houses on three lots are three halls from one `hall.yaml`. Never a
// singleton.
//
// **But not CARTESIAN**, and this is the part that is easy to get wrong,
// because a floorplan looks like a small grid: the authored exits say
// `{ to: kitchen, direction: east }`, rooms sit north and east of one
// another, and it is tempting to conclude there is a coordinate system
// underneath. There is not, and the give-away is that not one shipped
// row authors `coords`.
//
// ⚠ The cost of getting it wrong is not abstract. A `CartesianLocation`
// derives its cell geometry from its ZONE — `getSizeScale()` is
// `cellSize²` — and the light walk divides flux by that to get lux. A
// furnished room on the cartesian base therefore reads
// `cellSize²`-times dimmer the moment it is zoned: a Hinkley yard at 600
// lumens of open sky came out at **16.7 lux**, under the light floor its
// own crop needs, and every interior went the same way on its fixtures.
// This class was cartesian for one commit and did exactly that. A lot is
// not a grid cell of the street either — N lots cannot share one
// coordinate.
//
// So: plain `Location` with the room mixins, plus the three things a
// room somebody FURNISHES needs and a bare cell does not — a record of
// its own (`Persistable`), a warren to belong to (`WarrenMember`), and
// the ability to author a finite `air` budget (`Reserved`).
const FurnishableRoomBase = PersistableMixin(
  WarrenMemberMixin(
    PostRegistrationMixin(
      ExitableMixin(
        DetailedMixin(VisibleMixin(ReservedMixin(PopulatesMixin(Location)))),
      ),
    ),
  ),
);

/** Structural view of the warren surface the population witness pokes. */
interface WarrenView {
  notifyPopulationChange(room: Stuff & Container): void;
}

export default class FurnishableRoom extends FurnishableRoomBase {
  static fieldMeta: FieldMeta = {
    postedAs: { persistent: true, authorable: true },
  };

  /**
   * **What the sign on the door says** — `unisex`, `gendered`, `staff`,
   * `members`, whatever the fiction posts. Free text, defaulting to
   * `unrestricted`.
   *
   * The kernel reads the sign; it **never enforces it**. Nothing in
   * movement, `AccessApi`, an exit or a locomotion check consults this
   * field, and it is deliberately not a closed enum.
   *
   * That is not squeamishness — it falls out of the shipped types. To gate
   * entry the engine would have to pick an identity axis, and it ships
   * exactly two, deliberately kept apart: `SexedMixin` (biology, whose valid
   * set is derived from the species' `sexDeterminationSystem` — `xy` yields
   * male/female/intersex, `monoecious` yields `male-and-female`, `none`
   * yields nothing at all) and `GenderedMixin` (pronouns and social
   * presentation, self-set, defaulting to `they`). **Neither partitions in
   * two.** A hard rule would have to answer *what about `they`*, *what
   * about a monoecious species*, *what about a creature whose species
   * declares no sex* — and whatever it answered would be a position
   * compiled into the engine, for every locality, forever.
   *
   * Compliance belongs to the layers that already model it, in ascending
   * hardness: **norm** (people react — reactions, regard and renown all
   * ship), **witness** (someone sees and says something), **law/policy** (a
   * locality declares a rule, the civics `charter` three-tier resolve), and
   * **wall** — a locked door and a credential, which is shipped and
   * identity-blind: it asks what you carry, never who you are.
   *
   * Free text rather than an enum is also what keeps the defamiliarisation
   * route open: a posted vocabulary that is not the real-world one is what
   * makes a legislature's argument playable rather than a re-enactment.
   */
  public postedAs: string = UNRESTRICTED;

  public getPostedAs(): string {
    return this.postedAs;
  }

  /**
   * Set the posted designation. Author-facing content surface (a room's
   * sign is authored, like its prose), so the gate is the ordinary
   * content-write one rather than a participant contract — there is no
   * privileged principal here because the value is inert.
   */
  @CallSecurity(SecurityPolicies.Public)
  @Final
  public setPostedAs(value: string): void {
    this.postedAs = typeof value === "string" && value.length > 0
      ? value
      : UNRESTRICTED;
  }

  /**
   * Population witness (the DormRoom fold, generalized — residences
   * D16): an arrival/departure of a `HasInteractive` occupant pokes the
   * owning warren's population-change coalescer, which drives the
   * whole-holding dormancy reap. A NO-OP with no warren back-ref —
   * every existing venue's rooms behave exactly as before.
   */
  public onContainableAdded(thing: Stuff & Containable): void {
    this.notePopulation(thing);
  }

  public onContainableRemoved(thing: Stuff & Containable): void {
    this.notePopulation(thing);
  }

  private notePopulation(thing: Stuff & Containable): void {
    if (!MixinApi.isHasInteractive(thing as unknown as Stuff)) return;
    const warren = (this as unknown as WarrenMember).getWarren() as unknown as
      | WarrenView
      | null;
    if (!warren) return;
    warren.notifyPopulationChange(this as unknown as Stuff & Container);
  }
}
