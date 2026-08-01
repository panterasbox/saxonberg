/**
 * Shade — what a player is between bodies.
 *
 * An `Avatar` SUBCLASS, deliberately, and for the reason the sandbox
 * already wrote down about its own vessel: the whole verb surface has to
 * survive the crossing, and re-deriving it as a parallel stack would be
 * drift by construction. What differs from an ordinary Avatar is
 * **activations, not composition**:
 *
 *   - **backed by nothing**: `shouldPersist() → false`. The durable fact
 *     of a death lives on the IDENTITY (`Avatar.mortalArc`), never as a
 *     dead lifecycle on a body. A shade that captured would put the
 *     bricking defect straight back.
 *   - **holds the registry slot**: unlike `WireBody`, a shade IS
 *     registered with `PlayerApi`. The wire body's rationale is that the
 *     parked field avatar keeps the slot — but in death there is no field
 *     avatar; it was destructed. Unregistered, a dead player would fall
 *     out of `who`, `tell`, presence and channel audiences, which breaks
 *     function-over-form outright. This is the player's only body while
 *     they are dead.
 *   - **identity thread**: `getIdentityPath()` returns the REAL identity,
 *     so the epistemic ledgers keep attributing to the player. Nearly
 *     everything durable — chronicle, transcript, traits, beliefs, renown,
 *     titles — is identity-keyed, and therefore survives a new body with
 *     no carrying mechanism at all.
 *   - **`undead`**: animate without being alive. `SpeciesLogic.isAnimate`
 *     already admits it, so a shade walks and speaks; `isLivingBody()`
 *     excludes it, so it does not starve, suffocate, freeze, or die again.
 *     race.md shipped the state unused; this is its first consumer.
 *   - **attunement without hardware**: a ghost with a cranial implant
 *     would be silly. It confers `AetherMixin` directly — being dead does
 *     not log you off, and that is the whole of why the attuned can
 *     perceive a shade. The aether is the internet, not a spirit field.
 *   - **transient**: reaped on disconnect, exactly as the wire body is.
 *     The shade is a VIEW; the arc position is the state.
 */

import Avatar, { type AvatarInitContext } from '../../obj/Avatar';
import type Species from '../species/Species';
import { IncorporealMixin } from './Incorporeal';
import { ConnectionApi } from '../../api/connection';
import { PlayerApi } from '../../api/player';
import { StuffApi } from '../../api/stuff';

/** Init context for a shade: the identity it stands in for. */
export interface ShadeInitContext extends AvatarInitContext {
  /** Marks the vessel; set by the death choreography. */
  shade?: boolean;
}

export default class Shade extends IncorporealMixin(Avatar) {
  /** The identity's playerId. Registered under it — see the class doc. */
  private shadePlayerId = '';

  /** The deceased's species, applied before the Avatar lifecycle runs. */
  private shadeSpecies: Species | null = null;

  /**
   * Identity and species are CONSTRUCTOR arguments for the same reason
   * `WireBody` takes them: everything downstream keys on them, and the
   * fork that would otherwise carry species runs after `postRegister` —
   * exactly too late for the body plan the loadout walks.
   */
  constructor(playerId?: string, species?: Species | null) {
    super();
    if (playerId) this.shadePlayerId = playerId;
    if (species) this.shadeSpecies = species;
  }

  public override async postRegister(
    context?: ShadeInitContext,
  ): Promise<void> {
    if (this.shadeSpecies) this.setSpecies(this.shadeSpecies);
    // Run the Avatar lifecycle WITHOUT a playerId: registration happens
    // in the death choreography, deliberately AFTER the old body has been
    // unregistered and destructed. Registering here would collide with
    // the body that is still being drained.
    const playerId = context?.playerId ?? this.shadePlayerId;
    await super.postRegister({ ...context, playerId: undefined });
    if (playerId) this.shadePlayerId = playerId;
    this.setLifecycleState('undead');
  }

  /** A shade persists nothing — the arc lives on the identity. */
  public override shouldPersist(): boolean {
    return false;
  }

  /** Nothing to save, so no periodic-save backstop. */
  public override startAutoSave(): void {
    // no-op
  }

  public override getPlayerId(): string {
    return this.shadePlayerId;
  }

  /** The identity thread — acts attribute to the player, not the vessel. */
  public override getIdentityPath(): string | null {
    return this.shadePlayerId
      ? Avatar.getTemplatePath(this.shadePlayerId)
      : super.getIdentityPath();
  }

  /**
   * Intrinsic attunement — no implant, no slot occupancy.
   *
   * `Species.innateMixins` would be the obvious home, but it is
   * species-level REFERENCE data shared by every member of a species and
   * never mutated at runtime; a shade cannot use it without corrupting the
   * species. The conferral seam
   * (`MixinApi.collectAugmentConferralNames` → `getConferredMixinNames`)
   * is per-host and already read structurally, so it is the right one.
   */
  public override getConferredMixinNames(): string[] {
    return [...super.getConferredMixinNames(), 'AetherMixin'];
  }

  /**
   * The shell fork carries the deceased's `alive` lifecycle across; force
   * it back. Without this a shade would read as a living body and the
   * survival drivers would start running on it again.
   */
  public override mergeSlice_Embodiment(slice: unknown): void {
    super.mergeSlice_Embodiment(slice);
    this.setLifecycleState('undead');
  }

  /**
   * Reaped on disconnect. Nothing is lost: the shell slices are
   * re-derivable from the identity snapshot, and the arc position — the
   * only durable fact — is on the identity, so logging back in mints a
   * fresh shade rather than resurrecting anybody.
   */
  public override onLinkdead(): void {
    void StuffApi.destruct(this);
  }

  public override async onDestruct(): Promise<void> {
    this.stopAutoSave();
    PlayerApi.unregisterAvatar(this);
    for (const interactive of [...this.getInteractives()]) {
      ConnectionApi.detach(interactive);
    }
    await super.onDestruct();
  }

  public override toString(): string {
    return `[Shade for playerId=${this.shadePlayerId}]`;
  }
}
