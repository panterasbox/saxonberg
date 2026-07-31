/**
 * Plant — a cultivated growing thing: the `Slottable` occupant of a pot's
 * one plant slot, and **its own persistence host**.
 *
 * **Growing ⇒ cultivated ⇒ durable.** A `Plant` owns its own persistence
 * record, keyed per instance, and carries its own location — so it keeps
 * growing wherever you take it, and nothing about its durability is wired
 * to dorm code. Decorative greenery in a lobby is *scenery* — an ordinary
 * `Thing` with a description — and needs none of this. A cultivated plant
 * left loose in a **transient** room is abandoned with it, the same rule
 * chattel.md already applies to owned goods.
 *
 * `PersistableMixin` composes **outermost** (the host rule): its
 * `cleanupOnDestruct` must fire before any inner evacuation, and its
 * `applyPopulates` override must wrap `Populates`.
 *
 * Everything about *how* it grows lives in `GrowingMixin`; this class is
 * only the three host seams the mixin declares plus the pot relationship:
 *
 *   - `rootRoom()` — the soil litres its pot offers (the third limiting
 *     factor), or `null` when unpotted;
 *   - `fitsSlot()` — the candidate-side acceptance test, so a plant whose
 *     stage has outgrown a pot refuses to be repotted into it;
 *   - `onMoved()` — closes the integrated light window at the moment of a
 *     move (the light model has no history to integrate);
 *   - `onFloweringLatched()` — mints one seed per flowering episode.
 *
 * See [docs/subsystems/husbandry.md].
 */

import Thing from "../lib/stuff/Thing";
import { DetailedMixin } from "../lib/description/Detailed";
import { ThermalMixin } from "../lib/thermal/Thermal";
import { OrganismMixin } from "../lib/species/Organism";
import { ReservedMixin } from "../lib/reserve";
import { GrowingMixin } from "../lib/husbandry/Growing";
import { SlottableMixin } from "../lib/slot/Slottable";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { PersistableMixin } from "../lib/persistence/Persistable";
import { MixinApi } from "../api/mixin";
import { StuffApi } from "../api/stuff";
import { ContainmentApi } from "../api/containment";
import { PersistableApi } from "../api/persistable";
import { SecurityApi } from "../api/security";
import type { Stuff } from "../lib/stuff/Stuff";
import type { Container } from "../lib/spatial/Container";
import type { Containable } from "../lib/spatial/Containable";
import type { Slotted } from "../lib/slot/Slotted";
import PlantPot from "./PlantPot";

// PersistableMixin OUTERMOST — the documented host rule.
const PlantBase = PersistableMixin(
  PostRegistrationMixin(
    SlottableMixin(
      GrowingMixin(
        ReservedMixin(OrganismMixin(ThermalMixin(DetailedMixin(Thing)))),
      ),
    ),
  ),
);

export default class Plant extends PlantBase {
  static persistentFields: string[] = ["seedTemplatePath"];

  /**
   * The `/obj/seed/…` template a flowering episode mints. Null for a
   * species that sets no seed in v1.
   *
   * @authorable
   */
  public seedTemplatePath: string | null = null;

  public getSeedTemplatePath(): string | null {
    return this.seedTemplatePath;
  }

  public setSeedTemplatePath(value: string | null): void {
    this.seedTemplatePath = value;
  }

  /** The pot this plant is slotted into, or null when unpotted. */
  public getPot(): PlantPot | null {
    const host = this.getOccupiedHost();
    return host instanceof PlantPot ? host : null;
  }

  /**
   * The soil litres available to the roots — the pot's bulk interior.
   * `null` when unpotted: not being in a pot is not a *root* constraint
   * (an unpotted plant is already in trouble via water, since nothing can
   * hold moisture for it, and modelling it twice would double-punish).
   */
  protected override rootRoom(): number | null {
    return this.getPot()?.getSoilVolume() ?? null;
  }

  /**
   * The candidate-side slot test (`Slotted.canOccupy` consults it after
   * its own mixin check): this plant fits a pot iff the pot's soil volume
   * carries its **current stage's** root demand. A mature plant therefore
   * refuses a thimble at `repot` time, with no new `SlotSpec` field.
   *
   * **A plant already inside the pot always fits it.** The sizing rule is a
   * *placement* policy — "may an actor put this plant in that pot" — and
   * both verbs consult it before they move anything. Re-seating a plant
   * that is already in the pot's contents is not a placement: it is the
   * persistence restore re-establishing an arrangement that already
   * existed. Refusing it would make a **root-bound plant unrestorable**,
   * and root-bound is a designed, ordinary state — the one the whole
   * transplanting lesson depends on.
   */
  public override fitsSlot(host: Stuff & Slotted, slot: string): boolean {
    if (!(host instanceof PlantPot)) return false;
    void slot;
    if (MixinApi.isContainable(this) && this.getContainer() === host) {
      return true;
    }
    const profile = this.getProfile();
    if (!profile) return true;
    const demand = profile.rootDemand[this.getGrowthStage()];
    if (!Number.isFinite(demand) || demand <= 0) return true;
    return host.getSoilVolume() >= demand;
  }

  /**
   * Close the integrated light window at the moment of the move. The
   * growth model has no light *history* — it integrates one window at the
   * level in `_lastLux` — so a move must reconcile first (crediting the
   * window that just ended at its true level) and only then re-sample.
   * Carrying a plant into a footlocker stops crediting it lit hours from
   * that instant, exactly as watering closes the dry window.
   */
  public onMoved(
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null,
  ): void {
    void from;
    void to;
    this.noteEnvironmentChanged();
  }

  /**
   * Every cultivated plant is one of many instances of its template, so
   * its record is keyed **per instance** — and the key is minted lazily,
   * on first demand, never in `postRegister`: a keyed restore stamps the
   * real key *after* register, so minting at register would race it.
   *
   * The override sits on the getter because the capture path is the only
   * caller that asks — both directly (`capture` resolving the record
   * owner) and through an ancestor's `{ref, key}` entry. A mint writes
   * transient state only; no record exists until a capture writes one.
   */
  public override getPersistenceKey(): string | null {
    return this.ensureCultivationKey();
  }

  /** Mint-if-absent, then return, this plant's per-instance record key. */
  private ensureCultivationKey(): string {
    if (this._persistenceKey) return this._persistenceKey;
    const key = SecurityApi.uuid();
    this.setPersistenceKey(key);
    return key;
  }

  /**
   * One seed per flowering episode: clone the species' seed template into
   * the **pot's** contents — a plant is not a container — falling back to
   * whatever contains the plant when it is unpotted. Fire-and-forget: the
   * reconcile that latched the flowering is synchronous, and a failed
   * seed must never abort a growth read.
   */
  protected override onFloweringLatched(): void {
    const path = this.seedTemplatePath;
    if (!path) return;
    const pot = this.getPot();
    const target: Stuff | null =
      pot ?? (MixinApi.isContainable(this) ? this.getContainer() : null);
    if (!target || !MixinApi.isContainer(target)) return;
    void (async () => {
      try {
        const seed = await StuffApi.clone<Stuff>(path);
        if (MixinApi.isContainable(seed)) {
          ContainmentApi.move(
            seed as Stuff & Containable,
            target as Stuff & Container,
          );
        }
        await PersistableApi.captureHostOf(this);
      } catch (err) {
        console.warn(
          `Plant.onFloweringLatched: could not set a seed from '${path}':`,
          err,
        );
      }
    })();
  }
}
