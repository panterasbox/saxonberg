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

/** Init context for a wire body: the projected identity. */
export interface WireBodyInitContext extends AvatarInitContext {
  /** Marks the vessel (beside `isGuest`); set by `SandboxLogic.enter`. */
  wire?: boolean;
}

export default class WireBody extends Avatar {
  public override async postRegister(
    context?: WireBodyInitContext,
  ): Promise<void> {
    // ⚠ Run the Avatar lifecycle WITHOUT a playerId in the CONTEXT:
    // `PlayerApi` registration is keyed on it and the PARKED avatar
    // keeps that slot, so a vessel must never claim it. The spine is
    // gated off by `shouldPersist()` anyway, and the default-loadout
    // floor (implant + aether apps) still installs — minted under the
    // circle root, so it is circle-born.
    //
    // The field itself is already set: `playerId` arrives in the clone
    // overlay (hydration Phase 1), before this hook. W3 moves
    // registration onto the one class that registers and this strip
    // goes with it.
    await super.postRegister({ ...context, playerId: undefined });
  }

  /**
   * ⛔ SCAFFOLDING — W3 deletes this (see `Avatar.claimsRegistrySlot`).
   *
   * A vessel never registers: the PARKED avatar keeps the player's
   * slot for the whole crossing.
   */
  protected override claimsRegistrySlot(): boolean {
    return false;
  }

  /** A vessel persists nothing — the guest gate, verbatim. */
  public override shouldPersist(): boolean {
    return false;
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
    return `[WireBody for playerId=${this.playerId}]`;
  }
}
