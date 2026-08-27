/**
 * WireBody — the disposable projection vessel a player wears inside a
 * circle (docs/subsystems/sandbox.md, Decision C).
 *
 * An Avatar SUBCLASS, deliberately: the crossing must preserve the
 * whole verb surface (author shell, comms, combat, advancement) and the
 * `HasInteractive` handoff — Avatar *is* that composition; re-deriving
 * it as a parallel stack would be drift by construction. What differs
 * is identity and lifetime:
 *
 *   - **backed by nothing**: `shouldPersist() → false` (the shipped
 *     guest gate) — no `holder_snapshots` record, ever;
 *   - **not the registry body**: never registered with `PlayerApi`
 *     (the parked field avatar keeps the slot; exit and the sweep
 *     re-attach to it);
 *   - **identity thread**: `getIdentityPath()` returns the REAL
 *     identity (`/platform/agent/Avatar/<playerId>`), so the identity-keyed
 *     epistemic producers attribute in-circle acts to the player, not
 *     the vessel;
 *   - **baseline mint**: no gear, no chattel, no augment projection —
 *     forked slices (presentation, contacts) travel by the Forkable
 *     protocol, and `installDefaultLoadout` provisions the ordinary
 *     implant floor so comms verbs parse;
 *   - **reaped wholesale** at exit / grace-timeout / session close —
 *     minted via `StuffApi.create` under the circle-scoped root, so it
 *     and everything it accumulates are circle-born and die with the
 *     discard.
 *
 * Mid-visit link semantics (Decision P) live in `SandboxLogic`; the
 * overrides here only ROUTE the events (linkdead → the session's grace
 * machinery; leave-intent → the exit choreography against the PARKED
 * body) instead of announcing field presence for a vessel.
 */

import Avatar, { type AvatarInitContext } from '../Avatar';
import { SandboxApi } from '../../../api/sandbox';
import type Species from '../../idea/species/Species';

/** Init context for a wire body: the projected identity. */
export interface WireBodyInitContext extends AvatarInitContext {
  /** Marks the vessel (beside `isGuest`); set by `SandboxLogic.enter`. */
  wire?: boolean;
}

export default class WireBody extends Avatar {
  /** The projected identity's playerId (never registered under it). */
  private wirePlayerId: string = '';

  /** The projected identity's species, applied before the loadout. */
  private wireSpecies: Species | null = null;

  /**
   * Identity and species are CONSTRUCTOR arguments, not context
   * threaded through `postRegister`, because everything downstream
   * keys on them.
   *
   * `playerId`: authority (wizard / author-scope membership), parcel
   * title, the epistemic ledgers. A vessel that finishes construction
   * without one is an anonymous body that silently loses its player's
   * powers inside their own circle.
   *
   * `species`: anatomy. `Avatar.postRegister` installs the default
   * loadout, and that walks the body plan to find the cranial slot the
   * aether implant occupies. A speciesless vessel has no body plan, so
   * the occupy throws, the loadout swallows it, and the implant ends up
   * loose in inventory with no comms update hosted — the player can
   * *receive* a channel message inside their circle but cannot send
   * one ("You have no way to send a thought"). The fork carries species
   * too, but the fork runs after `postRegister`, which is exactly too
   * late. Same reasoning as `playerId`, and the same conclusion: make
   * it impossible to build one by accident (the `Interactive`
   * precedent for runtime-only objects).
   */
  constructor(playerId: string, species: Species | null) {
    super();
    this.wirePlayerId = playerId;
    this.wireSpecies = species;
  }

  public override async postRegister(
    context?: WireBodyInitContext,
  ): Promise<void> {
    // Anatomy FIRST — `super.postRegister` runs the default loadout,
    // which needs a body plan to slot the implant into.
    if (this.wireSpecies) {
      this.setSpecies(this.wireSpecies);
      // Then LET GO. `OrganismMixin` stores species as `_speciesPath`
      // and re-resolves through `findByTemplatePath` on every read, so
      // that field — not this one — is the durable reference. Holding
      // the live `Species` for the vessel's whole life would shadow the
      // authoritative path with an instance ref that a hot reload can
      // strand. The ctor slot is a hand-off, and this is the hand-off
      // completing; ref-shapes.md's A.4 carve-out for it only holds
      // while it is genuinely transient.
      this.wireSpecies = null;
    }
    // Run the Avatar lifecycle WITHOUT a playerId: PlayerApi
    // registration is keyed on it (the parked avatar keeps the slot),
    // and the spine is gated off by shouldPersist() anyway. The
    // default-loadout floor (implant + aether apps) still installs —
    // minted under the circle root, so it is circle-born.
    //
    // `wirePlayerId` needs no merge with `context.playerId`: the
    // constructor now requires it, so it is already authoritative
    // before this runs.
    await super.postRegister({ ...context, playerId: undefined });
  }

  /** A vessel persists nothing — the guest gate, verbatim. */
  public override shouldPersist(): boolean {
    return false;
  }

  public override getPlayerId(): string {
    return this.wirePlayerId;
  }

  /** The identity thread (Decision C): acts attribute to the player. */
  public override getIdentityPath(): string | null {
    return this.wirePlayerId
      ? Avatar.getTemplatePath(this.wirePlayerId)
      : super.getIdentityPath();
  }

  /** Vessels never install the periodic-save backstop. */
  public override startAutoSave(): void {
    // no-op: shouldPersist() is false; there is nothing to save.
  }

  /**
   * A crossing is not a login. The vessel runs the rest of the session
   * ceremony (the client needs its connection-established payload and
   * an auto-sense of the circle it just arrived in — without them the
   * player types `go wardrobe` and sees nothing at all), but the world
   * hears no presence event: the player didn't arrive or return, they
   * stepped sideways and are present-but-unreachable (Decision P).
   */
  protected override announceSessionPresence(): void {
    // deliberately silent
  }

  /**
   * Link events route to the session machinery instead of the field
   * presence fabric: a bare drop starts the reconnect grace window; a
   * deliberate quit runs the exit choreography (which then logs the
   * PARKED avatar out, so the save and the `PlayerLoggedOut` belong to
   * the real body). No presence event ever fires for a vessel.
   */
  public override onLinkdead(): void {
    if (this.leaveIntent) {
      this.leaveIntent = false;
      void SandboxApi.handleWireQuit(this);
      return;
    }
    SandboxApi.handleWireLinkdead(this);
  }

  public override toString(): string {
    return `[WireBody for playerId=${this.wirePlayerId}]`;
  }
}
