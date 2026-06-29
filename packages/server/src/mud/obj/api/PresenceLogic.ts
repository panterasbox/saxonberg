// PresenceLogic — the hot-reloadable logic singleton behind PresenceApi.
// (Doc comment lives on the class so @internal lands on the reflection
// TypeDoc emits, not on the module.)
//
// Following the SocialLogic precedent, the gated public methods are thin
// forwarders to module-level `*Impl` functions; internal callers use the
// functions directly so the `FromModule` gate never sees an
// intra-singleton self-call (which it would deny).

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { PlayerApi } from '../../api/player';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { EventApi } from '../../api/event';
import { Events } from '../../lib/events';
import { ProfileApi } from '../../api/profile';
import type { PresenceStatus, RosterFrame } from '../../api/presence';
import type Avatar from '../Avatar';
import type { Subscription } from '../../api/event';

const PresenceApiCallers = SecurityPolicies.FromModule(
  'mud/api/presence#PresenceApi'
);

/** The roster wire topic — a presence-PUBLIC channel, distinct from the
 *  notify-rule-gated `world.social.presence` notification surface. */
const ROSTER_TOPIC = 'world.social.roster';

/** Default idle threshold (seconds) when AppSettings isn't warmed. */
const IDLE_AFTER_FALLBACK = 300;

/** Seconds of inactivity after which a connected session reads as idle. */
function idleAfterSeconds(): number {
  try {
    const raw = AppApi.setting(AppSettingKeys.socialIdleAfter);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : IDLE_AFTER_FALLBACK;
  } catch {
    return IDLE_AFTER_FALLBACK;
  }
}

/** The most-recent input timestamp across a target's live connections. */
function latestInputAt(target: Avatar): Date | undefined {
  let latest: Date | undefined;
  for (const interactive of target.getInteractives()) {
    const at = interactive.getLastInputAt();
    if (!latest || at.getTime() > latest.getTime()) latest = at;
  }
  return latest;
}

/** The connected, non-destroyed player avatars — the roster source. */
function onlineImpl(): Avatar[] {
  return PlayerApi.getAllAvatars().filter(
    (a) => !a.isDestroyed() && a.isConnected()
  );
}

/** Derive a target's session-liveness (reconnecting > engaged > idle > active). */
function statusOfImpl(target: Avatar): PresenceStatus {
  // A linkdead-but-lingering instance is mid-reconnect (the connection
  // dropped, the avatar hasn't been reaped). online() excludes these, so
  // this branch only fires when profiling a just-dropped target.
  if (!target.isConnected()) return 'reconnecting';
  if (MixinApi.isEngaged(target) && target.getEngagements().length > 0) {
    return 'engaged';
  }
  const last = latestInputAt(target);
  if (last && Date.now() - last.getTime() > idleAfterSeconds() * 1000) {
    return 'idle';
  }
  return 'active';
}

/** Emit one roster frame to a single viewer (empty body; payload-bearing). */
function sendRosterImpl(viewer: Avatar, payload: RosterFrame): void {
  try {
    MessageApi.scene(viewer)
      .topic(ROSTER_TOPIC)
      .toSelf(Mml.fromMarkup(''), payload)
      .send();
  } catch {
    // mid-teardown handle — best effort
  }
}

/** Push the full viewer-lensed roster to one viewer (pane open / login). */
async function snapshotForImpl(viewer: Avatar): Promise<void> {
  if (viewer.isDestroyed() || !viewer.isConnected()) return;
  const rows = [];
  for (const person of onlineImpl()) {
    rows.push(await ProfileApi.composeRow(viewer, person));
  }
  sendRosterImpl(viewer, { kind: 'roster', action: 'snapshot', rows });
}

/** The stable per-target roster key — the Avatar template path. */
function rosterHandleFor(playerId: string): string {
  // Mirrors ProfileLogic's `target.getTemplatePath()` for an Avatar
  // (`/obj/Avatar/<playerId>`), so add/remove keys agree without an
  // instance in hand on the remove path.
  return `/obj/Avatar/${playerId}`;
}

/**
 * Fan one roster transition out to every online viewer, presence-public
 * (NOT notify-gated). An `add` carries a viewer-lensed row; a `remove`
 * only the stable handle. The acting player is skipped on `add` — they
 * receive a full snapshot instead (see {@link onPresentImpl}). Per-viewer
 * isolation: a bad recipient never aborts the scan.
 */
async function fanImpl(
  actorPlayerId: string,
  action: 'add' | 'remove'
): Promise<void> {
  const actor =
    action === 'add'
      ? PlayerApi.findAvatarByPlayerId(actorPlayerId)
      : undefined;
  if (action === 'add' && !actor) return;
  for (const viewer of PlayerApi.getAllAvatars()) {
    if (viewer.isDestroyed() || !viewer.isConnected()) continue;
    if (
      action === 'add' &&
      PlayerApi.isAvatarStuff(viewer) &&
      viewer.getPlayerId() === actorPlayerId
    ) {
      continue; // the actor gets a full snapshot, not their own add
    }
    try {
      if (action === 'add' && actor) {
        const row = await ProfileApi.composeRow(viewer, actor);
        sendRosterImpl(viewer, {
          kind: 'roster',
          action: 'add',
          handle: row.handle,
          row,
        });
      } else if (action === 'remove') {
        sendRosterImpl(viewer, {
          kind: 'roster',
          action: 'remove',
          handle: rosterHandleFor(actorPlayerId),
        });
      }
    } catch {
      // best-effort relay — drop this viewer, continue the scan
    }
  }
}

/** A player became present: snapshot to them, add them for everyone else. */
async function onPresentImpl(actorPlayerId: string): Promise<void> {
  const actor = PlayerApi.findAvatarByPlayerId(actorPlayerId);
  if (actor) await snapshotForImpl(actor);
  await fanImpl(actorPlayerId, 'add');
}

/**
 * PresenceLogic — the hot-reloadable logic singleton behind
 * {@link PresenceApi}.
 *
 * Lives at `/obj/api/presence` (a stateless `Stuff` singleton, no backing
 * `Template`); `PresenceApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Holds only the four-event roster-delta tap
 * subscriptions; everything else is derive-on-read.
 *
 * @internal
 */
@Unshadowable
export class PresenceLogic extends Idea {
  private loginSub: Subscription<unknown> | null = null;
  private reconnectSub: Subscription<unknown> | null = null;
  private logoutSub: Subscription<unknown> | null = null;
  private disconnectSub: Subscription<unknown> | null = null;

  /** See {@link PresenceApi.online}. */
  @CallSecurity(PresenceApiCallers)
  public online(): Avatar[] {
    return onlineImpl();
  }

  /** See {@link PresenceApi.statusOf}. */
  @CallSecurity(PresenceApiCallers)
  public statusOf(target: Avatar): PresenceStatus {
    return statusOfImpl(target);
  }

  /** See {@link PresenceApi.snapshotFor}. */
  @CallSecurity(PresenceApiCallers)
  public snapshotFor(viewer: Avatar): Promise<void> {
    return snapshotForImpl(viewer);
  }

  /** See {@link PresenceApi.boot}. Idempotent. */
  @CallSecurity(PresenceApiCallers)
  public installRosterTap(): void {
    if (this.loginSub) return;
    const present = (p: { playerId: string }) =>
      void onPresentImpl(p.playerId).catch((err) =>
        console.error('PresenceLogic: roster present fan failed', err)
      );
    const drop = (p: { playerId: string }) =>
      void fanImpl(p.playerId, 'remove').catch((err) =>
        console.error('PresenceLogic: roster remove fan failed', err)
      );
    this.loginSub = EventApi.on<{ playerId: string; userId: string }>(
      Events.PlayerLoggedIn,
      present
    );
    this.reconnectSub = EventApi.on<{ playerId: string; userId: string }>(
      Events.PlayerReconnected,
      present
    );
    this.logoutSub = EventApi.on<{ playerId: string }>(
      Events.PlayerLoggedOut,
      drop
    );
    this.disconnectSub = EventApi.on<{ playerId: string }>(
      Events.PlayerDisconnected,
      drop
    );
  }
}
