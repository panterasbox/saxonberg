/**
 * PersistentLocation — you FILL a location (one of many laid out to a
 * plan — a lot, a dorm room, a let unit); this one is kept. A room that
 * persists **a record of its own**: its
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
 * Composition — `Location` plus the three layers a room
 * somebody FURNISHES needs:
 *
 *   Persistable → WarrenMember → Reserved → Location
 *     (which carries Staged, Detailed, Perceptible,
 *     Exitable, CartesianCoordinates, Visible, and Place's Container,
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
 * without `Staged` a seed's `props:` is INERT and no fixture ever
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

import Location from "../../lib/location/Location";
import { PersistableMixin } from "../../lib/persistence/Persistable";
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

// ⭐⭐ **On the grid, in its HOLDING's frame** (the place taxonomy,
// cleanliness B53 — the user: *"every place has coordinates"*).
//
// **Minted**, yes: many live rooms per row, keyed per holding — three
// houses on three lots are three halls from one `hall.yaml`. Never a
// singleton — so a `Location`, one of many laid out to a plan.
//
// ⚠ The PLAN is the holding's floorplan, not the street's grid. A lot's
// rooms on the lots zone's grid would land on the next lot's, and a
// generic `/stuff/location/room/*` row resolves no zone at all. So the
// holding lays its rooms out in its own frame (`HoldingWarren.layOut`,
// the floorplan's cardinal exits from the entry room) and stamps each
// room's coordinates; a door out of the holding — the dorm's `out`, the
// corridor's `unit-3` — crosses frames (`Warren.laysOutOwnFrame`).
//
// ⚠ And its SIZE is its own. This class was cartesian once before, for
// one commit, and the zone's cell became every room's floor area: a
// Hinkley yard at 600 lumens of open sky read **16.7 lux** on a 6 m
// cell, under its own crop's light floor. So `sizedByZoneCell()` is
// false: an authored `extent` sizes the room, and an unsized one reads
// as it always has.
//
// The three things a room somebody FURNISHES needs and a bare cell does
// not: a record of its own (`Persistable`), a warren to belong to
// (`WarrenMember`), and a finite `air` budget it can author (`Reserved`).
const PersistentLocationBase = PersistableMixin(
  WarrenMemberMixin(ReservedMixin(Location)),
);

/** Structural view of the warren surface the population witness pokes. */
interface WarrenView {
  notifyPopulationChange(room: Stuff & Container): void;
}

export default class PersistentLocation extends PersistentLocationBase {
  static fieldMeta: FieldMeta = {
    postedAs: { persistent: true, authorable: true },
  };

  /** A furnished room is sized by its own `extent`, never its zone's cell. */
  protected override sizedByZoneCell(): boolean {
    return false;
  }

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
   * exactly two, deliberately kept apart: `Organism`'s sex (biology, whose valid
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
