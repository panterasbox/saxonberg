// PlayerLogic — the hot-reloadable logic singleton behind PlayerApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import Avatar from '../Avatar';
import type { User } from '../../lib/identity/User';

/** The lazily-imported Avatar class's static surface this logic uses. */
interface AvatarClassRef {
  getTemplatePath(playerId: string): string;
  SEED_TEMPLATE_PATH: string;
}
import { StuffApi } from '../../api/stuff';
import type { Stuff } from '../../lib/stuff/Stuff';

const PlayerApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/player#PlayerApi'),
  SecurityPolicies.SelfOnly
);

/**
 * PlayerLogic — the hot-reloadable logic singleton behind
 * {@link PlayerApi}.
 *
 * Lives at `/obj/api/player` (a stateless-by-construction `Stuff`
 * singleton, no backing `Template`); `PlayerApi`'s public statics
 * forward here via `StuffApi.singletonSync`. Any module that grabs this
 * singleton and calls a method other than through the Api gets
 * `SecurityError`.
 *
 * The former `PlayerApi` `#`-static maps (`avatarsByPlayerId`,
 * `inFlightClones`) become ordinary `private` instance fields on the
 * singleton — TypeScript `private`, NOT `#`, because instance method
 * dispatch on a Stuff host runs through the call-security proxy and
 * `#`-private slots are unreachable through it. The avatar registry is a
 * runtime index keyed by playerId, so per-process instance state is the
 * right home (no `PostRegistrationMixin`).
 *
 * Guts-variant gate (`AnyOf(FromModule, SelfOnly)`): `loadAvatarsForUser`
 * makes an intra-singleton `this.findAvatarByPlayerId(...)` self-call, so
 * `SelfOnly` is needed alongside the `FromModule` half the facade
 * supplies.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class PlayerLogic extends ApiLogic {
  /**
   * Registry of avatars by player ID. A specialized index for quick
   * avatar lookup. TS `private` (not `#`) — see the class doc.
   */
  private avatarsByPlayerId: Map<string, Avatar> = new Map();

  /**
   * Per-playerId in-flight avatar clones. Multiplexing means a user
   * can open several connections at once (and a dev React StrictMode
   * remount opens two in the same tick) — the Avatar must be cloned
   * exactly once and shared. An entry exists only while a clone is in
   * progress; concurrent connects await it instead of starting a
   * duplicate clone.
   */
  private inFlightClones: Map<string, Promise<Avatar>> = new Map();

  /** See {@link PlayerApi.isAvatarStuff}. */
  @CallSecurity(PlayerApiCallers)
  public isAvatarStuff(stuff: Stuff): stuff is Avatar {
    const path = stuff.getTemplatePath();
    return (
      path !== undefined &&
      path !== null &&
      path.startsWith(Avatar.TEMPLATE_PATH_PREFIX)
    );
  }

  /** See {@link PlayerApi.registerAvatar}. */
  @CallSecurity(PlayerApiCallers)
  public registerAvatar(avatar: Avatar): void {
    if (!avatar.getPlayerId()) {
      console.warn('PlayerApi.registerAvatar(): Avatar has no playerId');
      return;
    }

    if (this.avatarsByPlayerId.has(avatar.getPlayerId())) {
      console.warn(
        `PlayerApi.registerAvatar(): Avatar already registered for playerId ${avatar.getPlayerId()}`
      );
      return;
    }

    this.avatarsByPlayerId.set(avatar.getPlayerId(), avatar);
  }

  /** See {@link PlayerApi.unregisterAvatar}. */
  @CallSecurity(PlayerApiCallers)
  public unregisterAvatar(avatar: Avatar): void {
    if (!avatar.getPlayerId()) {
      return;
    }

    this.avatarsByPlayerId.delete(avatar.getPlayerId());
  }

  /** See {@link PlayerApi.findAvatarByPlayerId}. */
  @CallSecurity(PlayerApiCallers)
  public findAvatarByPlayerId(playerId: string): Avatar | undefined {
    return this.avatarsByPlayerId.get(playerId);
  }

  /** See {@link PlayerApi.getAllAvatars}. */
  @CallSecurity(PlayerApiCallers)
  public getAllAvatars(): Avatar[] {
    return Array.from(this.avatarsByPlayerId.values());
  }

  /** See {@link PlayerApi.getAvatarCount}. */
  @CallSecurity(PlayerApiCallers)
  public getAvatarCount(): number {
    return this.avatarsByPlayerId.size;
  }

  /** See {@link PlayerApi.loadAvatarsForUser}. */
  @CallSecurity(PlayerApiCallers)
  public async loadAvatarsForUser(user: User): Promise<Avatar[]> {
    // Avatar lives in `obj/` (mudlib gameplay), which the `api/` layer
    // deliberately does not statically depend on — see
    // [architecture.md § Backend → mudlib import discipline] row 4.
    // Lazy-load to honor that discipline.
    const { default: AvatarClass } = await import('../Avatar');
    const avatars: Avatar[] = [];
    for (const playerId of user.playerIds) {
      // Reuse if already in-world (multiplexing).
      let avatar = this.findAvatarByPlayerId(playerId);
      if (!avatar) {
        // Concurrent connections for the same user (multiplexing, or a
        // dev StrictMode double-mount) can reach here before the first
        // clone has registered. Coordinate on a per-playerId in-flight
        // promise so the second connect awaits the first clone instead
        // of starting a duplicate — a duplicate hits StuffApi's "clone
        // already in flight" guard and tears down both connections.
        let pending = this.inFlightClones.get(playerId);
        if (!pending) {
          pending = this.materializeAvatar(
            AvatarClass as unknown as AvatarClassRef,
            user,
            playerId
          ).finally(() => this.inFlightClones.delete(playerId));
          this.inFlightClones.set(playerId, pending);
        }
        avatar = await pending;
      }
      avatars.push(avatar);
    }
    return avatars;
  }

  /**
   * Materialize one avatar for a returning login. The character's
   * durable state is its persistence-spine snapshot; the identity path
   * (`/obj/Avatar/<playerId>`) is MINTED, not template-backed (the
   * identity doctrine — no per-player `domain` row):
   *
   *   1. Snapshot exists → clone the SHARED seed template with the
   *      identity minted via `asTemplatePath`; `Avatar.postRegister`
   *      materializes the snapshot over the seed defaults.
   *   2. No snapshot but a LEGACY per-player row exists (a pre-spine /
   *      pre-retirement character that never logged in since) → clone
   *      the row one last time; `postRegister` captures the first
   *      snapshot, after which the row is dead weight (deletable by
   *      the operator cleanup — see deployment notes).
   *   3. Neither → the roster references a character with no state;
   *      clone the seed bare (defaults) so login still succeeds, and
   *      the capture creates its snapshot.
   */
  private async materializeAvatar(
    AvatarClass: AvatarClassRef,
    user: User,
    playerId: string
  ): Promise<Avatar> {
    const identityPath = AvatarClass.getTemplatePath(playerId);
    const { PersistableApi } = await import('../../api/persistable');
    const hasSnapshot = await PersistableApi.hasRecord(
      identityPath,
      identityPath
    );
    if (!hasSnapshot) {
      const { Template } = await import('../../lib/stuff/Template');
      const legacyRow = await Template.findByPath(identityPath);
      if (legacyRow) {
        // Legacy fallback (case 2): hydrate from the per-player row.
        return StuffApi.clone<Avatar>(identityPath, { user, playerId });
      }
    }
    return StuffApi.clone<Avatar>(
      AvatarClass.SEED_TEMPLATE_PATH,
      { user, playerId },
      { asTemplatePath: identityPath }
    );
  }

  /** See {@link PlayerApi.clearAll}. */
  @CallSecurity(PlayerApiCallers)
  public clearAll(): void {
    this.avatarsByPlayerId.clear();
  }
}
