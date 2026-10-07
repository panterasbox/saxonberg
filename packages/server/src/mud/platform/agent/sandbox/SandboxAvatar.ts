/**
 * SandboxAvatar — the disposable **wire body** a player wears inside a
 * circle (docs/subsystems/sandbox.md, Decision C).
 *
 * ⚠ The name matters: "vessel" already means `lib/stuff/Vessel.ts` — a
 * bag, a chest, a cart — so calling this one a *projection vessel* read
 * as a claim about containment and sent at least one reader looking for
 * special behaviour from everything in a circle. `sandbox.md` has
 * always called it the wire body; so does this file now.
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

import Avatar, { type AvatarInitContext } from '../../../lib/character/Avatar';
import { SandboxApi } from '../../../api/sandbox';

/** Init context for a wire body: the projected identity. */
export interface SandboxAvatarInitContext extends AvatarInitContext {
  /** Marks the vessel (beside `isGuest`); set by `SandboxLogic.enter`. */
  wire?: boolean;
}

export default class SandboxAvatar extends Avatar {
  /*
   * ⚠⚠ **There is deliberately NO `getIdentityPath()` override here**,
   * and this comment exists because its absence looks like a bug.
   *
   * The projection is real — a wire body answers with the player's
   * `/platform/agent/Avatar/<playerId>`, so every identity-keyed reader
   * attributes in-circle acts to the person — but it is inherited.
   * `lib/character/Avatar` overrides the method for the WHOLE FAMILY in
   * one place (*"the identity thread, for the whole family and in one
   * place"*), deriving from `playerId`, and the shade relies on exactly
   * the same inheritance. Adding a copy here would be the duplication
   * that override was written to remove.
   *
   * ⚠ What WAS wrong until 2026-10-04 is a different thing: this body
   * was also CLONED with `asIdentityPath: <the player's identity>`, a
   * raw stamp that files it in the registry under the player's own
   * identity. That is the one thing `Stuff.getIdentityPath`'s docblock
   * forbids (*"a wire body must never index under the identity it
   * projects"*), and with a circle open the wire body and the parked
   * field body shared one exact bucket —
   * `findByTemplatePath('/platform/agent/Avatar/<pid>')` threw
   * *expected singleton, found 2* for that player mid-visit. The mint
   * no longer stamps; the inherited method was always what the ledgers
   * read.
   */

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
    return `[SandboxAvatar for playerId=${this.playerId}]`;
  }
}
