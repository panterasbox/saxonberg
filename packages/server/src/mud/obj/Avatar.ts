/**
 * Avatar - Runtime player character presence in the game world.
 *
 * Extends Character (Named, Gendered, Sensor, Vocal, Container,
 * Containable, Visible, Mobile, CommandGiver). Self-contained under the
 * unified state model: the template at `/obj/Avatar/<playerId>` carries every
 * persistent field directly, no Player or CharacterSheet indirection.
 *
 * Lifetime: cloned when a player connects, destroyed when the last
 * connection drops.
 */

import { ShelledCharacter } from '../lib/shell/ShelledCharacter';
import { PlayerApi } from '../api/player';
import { ConnectionApi } from '../api/connection';
import { EventApi } from '../api/event';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { HasInteractiveMixin } from '../lib/connection/HasInteractive';
import { Events } from '../lib/events';
import type { User } from '../lib/identity/User';
import type { EnvelopeTemplate, MessageFrame } from '@saxonberg/types';
import { Application } from '../../backend/Application';
import type { CommandContributions } from '../api/command';

/**
 * Context passed to Avatar.postRegister() by Login when cloning.
 *
 * Threaded through the clone pipeline from `StuffApi.clone(path, context)`
 * so these runtime pointers are set synchronously before PlayerApi
 * registration or any post-init logic sees the avatar.
 */
export interface AvatarInitContext {
  user?: User;
  playerId?: string;
}

const AvatarBase = PostRegistrationMixin(HasInteractiveMixin(ShelledCharacter));

export class Avatar extends AvatarBase {
  /**
   * Command provider for Avatar-specific commands (diagnostic/system)
   */
  static commandContributions: CommandContributions = {
    self: ['ping.yaml', 'help.yaml', 'player.yaml', 'analyze.yaml'],
    environment: [],
    inventory: [],
    peers: [],
  };

  /**
   * Template path prefix for avatars in the domain collection.
   * Avatar templates live at `/obj/Avatar/<playerId>` — instances
   * of a class share the same `/obj/<ClassName>` namespace as
   * singleton templates of that class (`/obj/EventRegistry`),
   * with a per-instance suffix.
   */
  static readonly TEMPLATE_PATH_PREFIX = '/obj/Avatar/';

  /**
   * Reserved playerId for the seed avatar at
   * `/obj/Avatar/seed` — the orphan template every new user's
   * avatar is forked from. 4 chars; nanoids are 21, so it can't
   * collide with a real playerId.
   */
  static readonly SEED_PLAYER_ID = 'seed';

  /**
   * Convenience: the seed avatar's template path.
   */
  static readonly SEED_TEMPLATE_PATH =
    Avatar.TEMPLATE_PATH_PREFIX + Avatar.SEED_PLAYER_ID;

  static getTemplatePath(playerId: string): string {
    return `${this.TEMPLATE_PATH_PREFIX}${playerId}`;
  }

  /**
   * Runtime-only pointer to the owning User. Stamped by `postRegister`
   * from the clone context; NOT persisted. Ownership lives on
   * `User.playerIds`. Host-internal storage; external callers use
   * `getUser()` / `setUser()`.
   */
  protected user?: User;
  public getUser(): User | undefined { return this.user; }
  public setUser(value: User | undefined): void { this.user = value; }

  /**
   * Character slot id (key under `/obj/Avatar/<playerId>` and in `User.playerIds`).
   * Runtime-only: the template path encodes it, so it does not need to be
   * mirrored into the doc. Stamped by `postRegister` from the clone
   * context, or seeded by the test/direct-construction data blob.
   */
  protected playerId: string = '';
  public getPlayerId(): string { return this.playerId; }
  public setPlayerId(value: string): void { this.playerId = value; }

  /**
   * Multiplexing storage (`interactives: Set<Interactive>`),
   * `addInteractive` / `removeInteractive` / `getInteractives` /
   * `isConnected` are all provided by `HasInteractiveMixin`.
   */

  /**
   * Post-registration setup called by the clone pipeline (Spring
   * `@PostConstruct`-style). Stamps runtime-only references (user,
   * playerId) from the caller-supplied context, then registers with
   * PlayerApi so later lookups by playerId resolve to this instance.
   */
  public override async postRegister(context?: AvatarInitContext): Promise<void> {
    if (context?.user) this.user = context.user;
    if (context?.playerId) this.playerId = context.playerId;

    if (this.playerId) {
      PlayerApi.registerAvatar(this);
    }
  }

  /**
   * Send a message to all connected Interactives (broadcast).
   */
  public sendMessage(message: unknown): void {
    for (const interactive of this.interactives) {
      interactive.send(message);
    }
  }

  /**
   * SensorMixin.handleMessage override — deliver to every connected
   * Interactive (multiplexing). Reached after `filterMessage` (the
   * shadowable extension point on SensorMixin) has had its say.
   */
  protected override handleMessage(frame: MessageFrame): void {
    const app = Avatar.getApplicationInstance();
    for (const interactive of this.interactives) {
      app.sendMessageToInteractive(interactive, frame);
    }
  }

  /**
   * SensorMixin.handleEnvelope override — multiplex the envelope to
   * every connected Interactive. Reached after `filterEnvelope` (the
   * shadowable extension point on SensorMixin). When `interactives`
   * is empty (netdead Avatar) the for-each is a no-op but the
   * `handleEnvelope` body itself runs, so server-side reactions
   * (shadows, scripted behavior) fire regardless of wire state.
   */
  protected override handleEnvelope(envelope: EnvelopeTemplate): void {
    const app = Avatar.getApplicationInstance();
    for (const interactive of this.interactives) {
      app.sendEnvelopeToInteractive(interactive, envelope);
    }
  }

  /**
   * Cleanup hook. Unregisters from PlayerApi and detaches every live
   * Interactive so they don't retain a holder reference pointing at
   * a destroyed Stuff. Persist-back to the avatar template is deferred
   * to the persist direction of the unified model (not implemented
   * this phase).
   */
  public onDestruct(): void {
    PlayerApi.unregisterAvatar(this);
    // Snapshot — detach() mutates the underlying set via removeInteractive.
    for (const interactive of [...this.interactives]) {
      ConnectionApi.detach(interactive);
    }
  }

  /**
   * HasInteractive Witness hook — fires when the last live
   * connection drops (count crosses 1 → 0). Engine-level event
   * for observers that care about player presence.
   */
  public onLinkdead(): void {
    EventApi.emit(Events.PlayerLoggedOut, { playerId: this.playerId });
  }

  public toString(): string {
    return `[Avatar ${this.fullName} playerId=${this.playerId}]`;
  }

  /** @internal — overridable for tests. */
  private static getApplicationInstance(): Application {
    return Application.get();
  }
}
