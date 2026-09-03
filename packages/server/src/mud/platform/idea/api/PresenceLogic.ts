// PresenceLogic — the hot-reloadable logic singleton behind SocialApi.
// (Doc comment lives on the class so @internal lands on the reflection
// TypeDoc emits, not on the module.)
//
// Following the SocialLogic precedent, the gated public methods are thin
// forwarders to module-level `*Impl` functions; internal callers use the
// functions directly so the `FromModule` gate never sees an
// intra-singleton self-call (which it would deny).

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { PlayerApi } from '../../../api/player';
import { MixinApi } from '../../../api/mixin';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { EventApi } from '../../../api/event';
import { Events } from '../../../lib/events';
import { SocialApi } from '../../../api/social';
import type { PresenceStatus, RosterFrame } from '@saxonberg/types';
import type Avatar from '../../agent/Avatar';
import type { Subscription } from '../../../api/event';
import { SecurityApi } from '../../../api/security';

// Gated to the SocialApi facade — presence/profile reads fold into
// SocialApi (one navigable surface); this logic singleton stays separate
// for file size + HMR but is @internal.
const SocialApiCallers = SecurityPolicies.FromModule('/api/social#SocialApi'
);

/**
 * The tap install is also callable by the self-warming `PresenceRelay`
 * singleton (the boot()-retirement shape).
 */
/** The F2 object faces forward here as the subject instance. */
const PresenceSubjectCallers = SecurityPolicies.AnyOf(
  SocialApiCallers,
  SecurityPolicies.FromMixin('HasInteractiveMixin', {
    // Compare by stuffId — the caller may surface as the raw target
    // while the argument is the proxy (or vice versa).
    where: (caller, _target, _method, args) =>
      (caller as { stuffId?: string }).stuffId !== undefined &&
      (caller as { stuffId?: string }).stuffId ===
        (args[0] as { stuffId?: string } | undefined)?.stuffId,
  }),
  SecurityPolicies.FromMixin('NotifyPolicyMixin', {
    // Compare by stuffId — the caller may surface as the raw target
    // while the argument is the proxy (or vice versa).
    where: (caller, _target, _method, args) =>
      (caller as { stuffId?: string }).stuffId !== undefined &&
      (caller as { stuffId?: string }).stuffId ===
        (args[0] as { stuffId?: string } | undefined)?.stuffId,
  }),
);
const SocialBootCallers = SecurityPolicies.AnyOf(
  SocialApiCallers,
  SecurityPolicies.FromTemplate('/platform/idea/PresenceRelay'),
);

/** The roster wire topic — a presence-PUBLIC channel, distinct from the
 *  notify-rule-gated `session.presence` notification surface. */
const ROSTER_TOPIC = 'self.group';

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

/** Push the full viewer-lensed roster to one viewer (card open / login). */
async function snapshotForImpl(viewer: Avatar): Promise<void> {
  if (viewer.isDestroyed() || !viewer.isConnected()) return;
  const rows = [];
  for (const person of onlineImpl()) {
    rows.push(await viewer.composeRosterRow(person));
  }
  sendRosterImpl(viewer, { kind: 'roster', action: 'snapshot', rows });
}

/** The stable per-target roster key — the Avatar template path. */
function rosterHandleFor(playerId: string): string {
  // Mirrors ProfileLogic's `target.getTemplatePath()` for an Avatar
  // (`/platform/agent/Avatar/<playerId>`), so add/remove keys agree without an
  // instance in hand on the remove path.
  return `/platform/agent/Avatar/${playerId}`;
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
        const row = await viewer.composeRosterRow(actor);
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
 * {@link SocialApi}.
 *
 * Lives at `/platform/idea/api/presence` (a stateless `Stuff` singleton, no backing
 * `Template`); `SocialApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Holds only the four-event roster-delta tap
 * subscriptions; everything else is derive-on-read.
 *
 * @internal
 */
@Unshadowable
export class PresenceLogic extends ApiLogic {
  private loginSub: Subscription<unknown> | null = null;
  private reconnectSub: Subscription<unknown> | null = null;
  private logoutSub: Subscription<unknown> | null = null;
  private disconnectSub: Subscription<unknown> | null = null;

  /** See {@link SocialApi.online}. */
  @CallSecurity(SocialApiCallers)
  public online(): Avatar[] {
    return onlineImpl();
  }

  /**
   * See the object surface (`host.presenceStatus()`). Wrapped in the
   * boundary read aperture: a roster row is composed for a viewer who
   * may be on the other side of a circle from the person it describes;
   * reading their engagements is a pure read that yields a display
   * string.
   */
  @CallSecurity(PresenceSubjectCallers)
  public statusOf(target: Avatar): PresenceStatus {
    return SecurityApi.projectAcross(target, undefined, () =>
      statusOfImpl(target),
    this);
  }

  /** See the object surface (`viewer.snapshotRoster()`). */
  @CallSecurity(PresenceSubjectCallers)
  public snapshotFor(viewer: Avatar): Promise<void> {
    return snapshotForImpl(viewer);
  }

  /** Armed by `PresenceRelay.warm` (the manifest postRegister). Idempotent. */
  @CallSecurity(SocialBootCallers)
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
