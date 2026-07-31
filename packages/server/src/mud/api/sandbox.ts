/**
 * SandboxApi — the gated, typed forwarding shell for the **sandbox
 * (holodeck)** subsystem: per-maker anything-goes circles over the wire
 * namespaces (`/home/<playerId>`, `/studio/<groupId>`), governed by the
 * four containment layers ("every durable mutation is either governed or
 * discarded" — docs/subsystems/sandbox.md).
 *
 * This facade owns the **orchestration** only: session lifecycle (the
 * runtime registry, discard-on-exit, the orphan sweeper), circle
 * mint/linking, and — landing with the wire-body wave — the crossing
 * choreography and the seeding aperture. Policy *enforcement* lives at
 * the seams it guards: the PM policy table (backend), the dispatch check
 * (SecurityApi), the shadow rule (ShadowApi). The facade orchestrates;
 * it does not absorb the seams.
 *
 * A dumb shell — logic lives in the hot-reloadable {@link SandboxLogic}
 * singleton at `/obj/api/sandbox`, reached synchronously via
 * `StuffApi.singletonSync`. Scope is NEVER a parameter derived from a
 * caller's argument on player paths — it comes from context (the
 * ExecutionContext taint) or from the circle registry.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SandboxLogic } from '../obj/api/SandboxLogic';
import type { SandboxSession } from '../obj/api/SandboxLogic';
import type { Stuff } from '../lib/stuff/Stuff';
import type Avatar from '../obj/Avatar';
import { TemplatePathPrefixes } from '../lib/paths';
import type Interactive from '../obj/Interactive';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';
import { ExecutionContextApi } from './execution-context';

export type { SandboxSession } from '../obj/api/SandboxLogic';

const LOGIC_PATH = '/obj/api/sandbox';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/SandboxLogic', import.meta.url)
);

/** Resolve the HMR-able SandboxLogic singleton (sync). */
function logic(): SandboxLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'SandboxLogic'
      ) as typeof SandboxLogic | null) ?? SandboxLogic)()
  );
}

export class SandboxApi {
  /**
   * Boot seam: install the orphan sweeper (idempotent). After a restart
   * every scope is sessionless, so the first sweep discards all scoped
   * rows — correct by doctrine (nothing persists but the edit). Ordered
   * in the boot manifest after PM connect, before players can enter.
   */
  public static boot(): void {
    logic().installSweeper();
  }

  /** Run one orphan sweep now (test / manual seam); returns swept scopes. */
  public static sweepNow(): Promise<string[]> {
    return logic().sweepNow();
  }

  /**
   * Discard every scoped row + runtime handle for `scope`. The exit /
   * reap path's terminal act. @internal — engine callers only; no player
   * surface names a scope.
   */
  public static discardScope(scope: string): Promise<void> {
    return logic().discardScope(scope);
  }

  /** The live session for a circle scope, or null. */
  public static sessionForScope(scope: string): SandboxSession | null {
    return logic().sessionForScope(scope);
  }

  /**
   * Open (or join) the session for a circle. @internal — the crossing
   * choreography's entry bookkeeping; not a player surface.
   */
  public static openSession(
    scope: string,
    circlePath: string,
    hostPlayerId: string
  ): SandboxSession {
    return logic().openSession(scope, circlePath, hostPlayerId);
  }

  /** Close a circle's session (discard + drop registry). @internal */
  public static closeSession(scope: string): Promise<void> {
    return logic().closeSession(scope);
  }

  /* ── the crossing (Decisions C, P, Q) ── */

  /**
   * Cross `actor` into a circle: open/join the session, mint the wire
   * body circle-born, fork the projection slices, park the field body
   * (capture + presence-freeze + eviction veto), move every Interactive
   * across. Default target is the actor's OWN circle
   * (`/home/<playerId>` — character creation is the grant); a door may
   * pass an invited/studio scope. Actor comes from the caller's world,
   * never a scope parameter on player paths.
   */
  public static async enter(
    actor: Avatar,
    targetScope?: string
  ): Promise<SandboxSession> {
    const session = await logic().enter(actor, targetScope);
    // Stamp the vessel's identity path (Decision C:
    // `/obj/Avatar/<playerId>/wire`, a minted-singleton identity under
    // the avatar's own branch, backed by NOTHING — no domain row).
    //
    // It matters because half the engine asks "is this an avatar?" by
    // the `/obj/Avatar/` templatePath PREFIX (`PlayerApi.isAvatarStuff`,
    // and through it `AccessApi.isWizard`). An unstamped vessel isn't
    // avatar-shaped, so a player loses their own powers the moment they
    // step into their own circle — no `eval`, no `clone` (found live).
    // `getIdentityPath()` still reports the REAL identity, so authority
    // membership and the epistemic ledgers key on the person, not the
    // vessel.
    //
    // Stamped HERE rather than in the logic singleton because
    // `setTemplatePath` is `ApiOnly`-gated — an Api class is exactly
    // the sanctioned caller.
    const playerId = actor.getPlayerId();
    const vessel = playerId ? logic().activeBodyFor(playerId) : null;
    if (vessel && vessel.getTemplatePath() === null) {
      // Under the CIRCLE's root: `enter` is called from the field (the
      // wardrobe exit's traverse), and the vessel is circle-born — a
      // field-context write against a circle-scoped receiver is exactly
      // what Layer 4 exists to deny. The stamp is the crossing's own
      // bookkeeping, so it belongs on the far side of the boundary.
      ExecutionContextApi.runRoot(
        SandboxApi,
        'enter.stampVessel',
        () => {
          vessel.setTemplatePath(
            `${TemplatePathPrefixes.avatar}${playerId}/wire`
          );
        },
        { circleScope: session.scope }
      );
    }
    return session;
  }

  /**
   * Walk out: re-attach Interactives to the parked field body, merge
   * the epistemic slices back, reap the vessel wholesale; when the
   * occupant set empties, cancel the scope's continuations, discard its
   * rows, close the session.
   */
  public static exit(wireBody: Avatar): Promise<void> {
    return logic().exit(wireBody);
  }

  /** The live session a player's wire body is inside, or null. */
  public static liveSessionForPlayer(
    playerId: string
  ): SandboxSession | null {
    return logic().liveSessionForPlayer(playerId);
  }

  /**
   * The ACTIVE body for an identity: the wire body while a session
   * lives, else null (callers fall back to the field avatar). The
   * comms fan-outs (channels, presence) resolve delivery through this
   * — recipient resolution follows identity, not body (Decision N).
   */
  public static activeBodyFor(playerId: string): Avatar | null {
    return logic().activeBodyFor(playerId);
  }

  /**
   * The seeding aperture (Decision L): from inside your circle, mint a
   * circle-born COPY of a live thing you own, carrying its instance
   * state. The original is untouched; the copy dies with the discard.
   * The player surface is the shipped `clone` verb's instance-source
   * branch — never a new verb.
   */
  public static seedCopy(actor: Avatar, target: Stuff): Promise<Stuff> {
    return logic().seedCopy(actor, target);
  }

  /**
   * Reconnect a fresh Interactive into a live circle session (inside
   * the grace window): lands back on the SAME wire body, in the
   * circle. Returns false when no live session exists — the caller
   * (Login) falls through to the ordinary field handoff.
   */
  public static reconnect(
    interactive: Interactive,
    playerId: string
  ): Promise<boolean> {
    return logic().reconnect(interactive, playerId);
  }

  /** Wire-body link drop → the reconnect grace machinery. @internal */
  public static handleWireLinkdead(wireBody: Avatar): void {
    logic().handleWireLinkdead(wireBody);
  }

  /** Wire-body deliberate quit → exit-then-logout. @internal */
  public static handleWireQuit(wireBody: Avatar): Promise<void> {
    return logic().handleWireQuit(wireBody);
  }

  /**
   * Death inside: reap the dead vessel, re-mint a fresh one at the
   * entry room (the parked body untouched). A direct witness call from
   * the death seam — no new global event.
   */
  public static respawnWireBody(wireBody: Avatar): Promise<Avatar | null> {
    return logic().respawnWireBody(wireBody);
  }

  /** The circle's entry room (test/inspection surface). @internal */
  public static entryRoomForScope(scope: string): Stuff | null {
    return logic().entryRoomForScope(scope);
  }

  /**
   * Run `fn` under a circle-scoped root for a WIRE parcel — the
   * quarantine disposition of jurisdiction-targeted eval. Scoped
   * side-effects discard with the circle session (or with the orphan
   * sweep when none is live — run-and-discard). The eval integration
   * lives in the author subsystem; this facade only supplies the
   * scope root.
   */
  public static runScoped<T>(
    parcelPath: string,
    fn: () => T | Promise<T>
  ): Promise<T> {
    return logic().runScoped(parcelPath, fn);
  }

  /**
   * Run `fn` under a jurisdiction-BOUNDED root for a FIELD parcel you
   * hold authority over (Decision K): writes are real; dispatch
   * outside the parcel's extent denies with receipts.
   */
  public static runGoverned<T>(
    parcelPath: string,
    fn: () => T | Promise<T>
  ): Promise<T> {
    return logic().runGoverned(parcelPath, fn);
  }

  /**
   * The author→test harness seam: launch a test session for `actor`
   * (the crossing + a fresh body; reap-wholesale on exit). It IS
   * `enter` — no harness special case. `opts` is deliberately an open
   * bag so the CMS draft-overlay compose can land later without a
   * signature change.
   */
  public static launchTestSession(
    actor: Avatar,
    _opts: Record<string, unknown> = {}
  ): Promise<SandboxSession> {
    return logic().enter(actor);
  }
}

SecurityApi.decorateApiClass(SandboxApi);
