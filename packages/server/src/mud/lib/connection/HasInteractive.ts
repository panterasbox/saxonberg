/**
 * HasInteractiveMixin — **a human may be on the other side of this**.
 *
 * The connection set and nothing else: which `Interactive` objects are
 * driving this host, the witness hooks that fire as they come and go,
 * the residency veto that says a session holder is never culled, the
 * derived presence status, and the portrait of the account behind the
 * socket.
 *
 * ⭐⭐ This mixin knows **no UI vocabulary at all**, and that is the
 * deliverable of the split it came out of. It used to be 1,168 lines
 * holding six concerns; what a connection is, what a client-state
 * mechanism is, and what *our* client's words are were three different
 * questions answered in one file, so there was no sentence anyone
 * could write about what a second client would have to implement.
 *
 * The tower, outermost first:
 *
 *   `SaxonbergClientMixin` → `ClientStateMixin` → `HasInteractiveMixin`
 *      our client's words      the mechanism         a human is here
 *
 * Composed by `Avatar` (the whole family inherits it identically) and
 * by `Login`. ⭐ `Login` is the proof this is not avatar plumbing: it
 * is an `Idea`, not a body, and it has a human on the other side.
 *
 * Use `MixinApi.isHasInteractive(obj)` to narrow — and narrow to the
 * mixin you actually need: a reader of `cockpit.*` wants
 * `isSaxonbergClient`, a reader of arbitrary client state wants
 * `isClientState`, and only *is somebody connected?* wants this one.
 */

import type { MixinConstructor } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { VetoResult } from '../errors';
import type { EvictionContext } from '../stuff/Stuff';
import type Interactive from '../../platform/idea/Interactive';
import { ShellApi } from '../../api/shell';
import { StuffApi } from '../../api/stuff';
import type { PresenceStatus } from '@saxonberg/types';
// eslint-disable-next-line no-restricted-imports -- the F2 object face: a session holder's presenceStatus() forwards into the presence logic singleton exactly as the api/social facade does (the Combustible/Energized precedent)
import { PresenceLogic } from '../../platform/idea/api/PresenceLogic';
import { GoogleProfile } from '../identity/GoogleProfile';


/**
 * Public shape provided by HasInteractiveMixin.
 *
 * Witness hooks (optional methods) — fire from `ConnectionApi`:
 *   - `onConnectionAttached(conn)` / `onConnectionDetached()` —
 *     per-connection events, fire on every transfer/detach.
 *   - `onLinkdead()` / `onLinkRestored()` — presence transitions,
 *     fire only when the connection count crosses 0/1.
 */
export interface HasInteractive {
  /**
   * Read-only view of the connected `Interactive` set. To mutate, use
   * `addInteractive` / `removeInteractive`.
   */
  getInteractives(): ReadonlySet<Interactive>;

  /** Add an Interactive connection. */
  addInteractive(interactive: Interactive): void;

  /** Remove an Interactive connection. Returns true iff it was present. */
  removeInteractive(interactive: Interactive): boolean;

  /** Membership test. */
  hasInteractive(interactive: Interactive): boolean;

  /** Drop every connection in one call. Used during destruct. */
  clearInteractives(): void;

  /** True iff at least one Interactive is connected. */
  isConnected(): boolean;

  /** True iff no Interactives are connected. MUD-style alias for `!isConnected()`. */
  isLinkdead(): boolean;

  /** Per-connection notification fired after attach. */
  onConnectionAttached?(conn: Interactive): void;
  /** Per-connection notification fired after detach. */
  onConnectionDetached?(): void;
  /** Fired when the connection count drops to zero. */
  onLinkdead?(): void;
  /** Fired when the connection count rises from zero to one. */
  onLinkRestored?(): void;

  /**
   * Resolve the display portrait URL for this connected identity.
   * Chain: the `identity.portrait` setting (empty on a Login, value-
   * or-unset on an Avatar) -> the connected account's Google photo ->
   * empty (the client renders a generated placeholder). Lives here, on
   * the connection layer, so the portrait is available from the moment
   * of connection — on a `Login` (start screen / character-select) as
   * well as an in-world `Avatar`.
   */
  getPortraitUrl(): Promise<string>;

  /**
   * Derived session-liveness for this holder, in display-precedence
   * order (`reconnecting` > `engaged` > `idle` > `active`).
   */
  presenceStatus(): PresenceStatus;
}

export function HasInteractiveMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class HasInteractiveMixin extends Base {
    static _mixinName: string = 'HasInteractiveMixin';

    /**
     * ⭐⭐ `prompt` — **a prompt is addressed to a CONNECTION**, so
     * whoever has a human on the other side is who can clear it.
     *
     * ⚠⚠ The view and `PromptController` shipped and nothing named the
     * file, so a player with a stuck question had no way to dismiss it:
     * `prompt cancel` answered *"I don't understand 'prompt'"*, which is
     * the worst place in the game for a dead verb — the one moment the
     * player is already blocked. The view's only validator is
     * `requiresHasInteractive`, i.e. exactly this mixin, so the
     * affordance and the gate agree by construction and no guard
     * re-narrows anything.
     *
     * ⭐ `Login` composes this too, and that is RIGHT, not collateral:
     * the enroll machine's questions are prompts on a connection with a
     * human behind it, and `Login` already carries its own
     * contributions static one tier up
     * (`platform/idea/Login.ts:130`). The precedent for conferring at
     * the connection tier is `SaxonbergClientMixin`'s `cockpit`
     * (`lib/connection/SaxonbergClient.ts:598-602`); the behavioural
     * analogue is `lib/activity/Engaged.ts:111` conferring `cancel`.
     *
     * Not `SaxonbergClientMixin` — that tier holds OUR client's
     * vocabulary, and a prompt is a connection fact any client has.
     */
    static commandContributions: CommandContributions = {
      self: ['platform/cmd/system/prompt.yaml'],
      inventory: [],
      environment: [],
      peers: [],
    };

    /**
     * Residency veto: a session holder (Avatar / Login) is never culled
     * by the self-eviction sweep — its lifecycle is owned by connection
     * teardown. Unconditional (does not chain `super`).
     */
    public canEvict(_context: EvictionContext): VetoResult {
      return { ok: false, reason: 'interactive session holder' };
    }

    /**
     * Connected Interactives. Host-internal storage; external consumers
     * use `addInteractive` / `removeInteractive` / `getInteractives()`.
     */
    protected interactives: Set<Interactive> = new Set();
    public getInteractives(): ReadonlySet<Interactive> {
      return this.interactives;
    }

    public addInteractive(interactive: Interactive): void {
      this.interactives.add(interactive);
    }

    public removeInteractive(interactive: Interactive): boolean {
      return this.interactives.delete(interactive);
    }

    public hasInteractive(interactive: Interactive): boolean {
      return this.interactives.has(interactive);
    }

    /** Drop every connection in one call. Used during destruct. */
    public clearInteractives(): void {
      this.interactives.clear();
    }

    public isConnected(): boolean {
      return this.interactives.size > 0;
    }

    public isLinkdead(): boolean {
      return !this.isConnected();
    }
    /**
     * Empty `portraitUrl` sentinel — "no image; client renders a
     * generated placeholder" (initials/icon from the name). We don't
     * mint a fake asset URL server-side; the empty string is the
     * honest "default" the client interprets.
     */
    static DEFAULT_PORTRAIT = '';

    public async getPortraitUrl(): Promise<string> {
      // 1. The per-character setting (Persona-declared).
      //    `ShellApi.resolveSetting` returns '' (the schema default)
      //    when unset on an Avatar, and `undefined` on a Login that has
      //    no such setting — both fall through. No per-layer override
      //    needed.
      const set = ShellApi.resolveSetting<string>(
        this as unknown as Parameters<typeof ShellApi.resolveSetting>[0],
        'identity.portrait',
      );
      if (set) return set;

      // 2. The connected account's Google photo. Any interactive will
      //    do — they all belong to the same user.
      for (const interactive of this.interactives) {
        const googleProfileId = interactive.getUser().googleProfileId;
        if (!googleProfileId) continue;
        const profile = await GoogleProfile.findById<GoogleProfile>(
          googleProfileId,
        );
        if (profile?.photoUrl) return profile.photoUrl;
        break;
      }

      // 3. No image — client generates a placeholder.
      return HasInteractiveMixin.DEFAULT_PORTRAIT;
    }

    /**
     * Derived session-liveness for this holder, in display-precedence
     * order (`reconnecting` > `engaged` > `idle` > `active`) — computed
     * on read against the `social.idleAfter` AppSetting; no stored idle
     * state (the F2 object face). Boundary-exempt: a roster row is
     * composed for viewers across circle boundaries, and the interior
     * read rides the logic's own aperture.
     */
    public presenceStatus(): PresenceStatus {
      return hasInteractivePresenceLogic().statusOf(this as never);
    }
  };
}

/** Resolve the HMR-able PresenceLogic singleton (the liveness derive). */
function hasInteractivePresenceLogic(): PresenceLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/presence',
    () => new PresenceLogic(),
  );
}
