/**
 * ShadeAvatar — what a player is between bodies.
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
 *   - **holds the registry slot**: unlike `SandboxAvatar`, a shade IS
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

import Avatar, { type AvatarInitContext } from '../../lib/character/Avatar';
import { IncorporealMixin } from '../../lib/mortality/Incorporeal';

/** Init context for a shade: the identity it stands in for. */
export interface ShadeAvatarInitContext extends AvatarInitContext {
  /** Marks the vessel; set by the death choreography. */
  shade?: boolean;
}

export default class ShadeAvatar extends IncorporealMixin(Avatar) {
  /**
   * A shade's identities live under its own prefix, not the Avatar
   * family's — so this shadows the ancestor's declaration rather than
   * inheriting a prefix that would be wrong. The person is the same;
   * the namespace is this class's.
   */
  static override readonly identityNamespace: string =
    '/platform/agent/ShadeAvatar/';

  /**
   * ⭐ The whole override, and all it says is *a shade is undead*.
   *
   * It used to strip `playerId` from the context, because the shared
   * base claimed the `PlayerApi` registry slot and a shade must not —
   * registration happens in the death choreography, deliberately after
   * the drained body has been unregistered. That claim now lives on
   * the body of record alone, so a shade has nothing to say no to.
   */
  public override async onCreate(
    context?: ShadeAvatarInitContext,
  ): Promise<void> {
    await super.onCreate(context);
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

  /**
   * Intrinsic attunement — no implant, no slot occupancy.
   *
   * `Species.innateMixins` would be the obvious home, but it is
   * species-level REFERENCE data shared by every member of a species and
   * never mutated at runtime; a shade cannot use it without corrupting the
   * species. The conferral seam
   * (`MixinApi.collectAugmentConferralNames` → `getConferredMixinNames`)
   * is per-host and already read structurally, so it is the right one.
   *
   * ⚠ Not an `override` since the trades-and-labor build: `EmployedMixin`
   * used to declare this method too (to fold a JOB's grants into the
   * augment walk) and a shade inherited it. That fold is gone — a job's
   * grants are data on the seat now — so a shade is the seam's one
   * consumer and declares it outright.
   */
  public getConferredMixinNames(): string[] {
    return ['AetherMixin'];
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
   * A shade linkdeads exactly like a body, because from the player's side
   * it IS their body — so this deliberately does NOT override
   * `Avatar.onLinkdead`.
   *
   * That means a deliberate sign-out fires `PlayerLoggedOut` and a bare
   * drop fires `PlayerDisconnected`, and either way the shade LINGERS the
   * way a living body does. Reconnecting finds it still holding the
   * `PlayerApi` slot, so the player returns to the same shade in the same
   * room rather than being re-minted at the place they died.
   *
   * An earlier version reaped it on disconnect — the GUEST behaviour. It
   * still put you back as a shade (the arc is on the identity, so the
   * login path re-mints one), but the world never heard you leave and you
   * came back wherever your body had fallen instead of where your ghost
   * had walked to.
   *
   * Nothing durable rides on the lingering: the shade persists nothing, so
   * a restart simply drops it and the next login re-mints from the arc.
   *
   * ⭐ There is no `onDestruct` override here any more. It used to
   * stop the autosave, unregister and detach — and then call `super`,
   * which does those same three itself (plus the final save and the
   * belief flush). Six lines that changed nothing; the reaping is the
   * family's, not a shade's.
   */

  public override toString(): string {
    return `[ShadeAvatar for playerId=${this.playerId}]`;
  }
}
