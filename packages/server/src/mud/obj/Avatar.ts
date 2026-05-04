/**
 * Avatar - Runtime player character presence in the game world.
 *
 * Extends Character (Named, Gendered, Sensor, Vocal, Container,
 * Containable, Visible, Mobile, CommandGiver). Self-contained under the
 * unified state model: the template at `/avatar/<playerId>` carries every
 * persistent field directly, no Player or CharacterSheet indirection.
 *
 * Lifetime: cloned when a player connects, destroyed when the last
 * connection drops.
 */

import { Character } from '../lib/character/Character';
import { PlayerApi } from '../api/player';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import type { Interactive } from './Interactive';
import type { HasInteractive } from './HasInteractive';
import type { User } from '../lib/identity/User';
import type { MessageFrame } from '@saxonberg/types';
import { Application } from '../../backend/Application';

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

const AvatarBase = PostRegistrationMixin(Character);

export class Avatar extends AvatarBase implements HasInteractive {
  /**
   * Command provider for Avatar-specific commands (diagnostic/system)
   */
  static commandProvider = {
    self: ['ping.yaml', 'help.yaml', 'player.yaml'],
    environment: [],
    inventory: [],
    peers: [],
  };

  /**
   * Template path prefix for avatars in domain collection.
   * Avatar templates are stored at: /avatar/<playerId>
   */
  static readonly TEMPLATE_PATH_PREFIX = '/avatar/';

  static getTemplatePath(playerId: string): string {
    return `${this.TEMPLATE_PATH_PREFIX}${playerId}`;
  }

  /**
   * Runtime-only pointer to the owning User. Stamped by `postRegister`
   * from the clone context; NOT persisted. Ownership lives on
   * `User.playerIds`.
   */
  user?: User;

  /**
   * Character slot id (key under `/avatar/...` and in `User.playerIds`).
   * Runtime-only: the template path encodes it, so it does not need to be
   * mirrored into the doc. Stamped by `postRegister` from the clone
   * context, or seeded by the test/direct-construction data blob.
   */
  playerId: string = '';

  /**
   * Set of connected Interactive objects (supports multiplexing).
   * Multiple connections (laptop + phone) can control the same Avatar.
   */
  interactives: Set<Interactive> = new Set();

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
   * `HasInteractive` — return the set of connected Interactives.
   * Read-only handle; mutate via `addInteractive` / `removeInteractive`.
   */
  public getInteractives(): ReadonlySet<Interactive> {
    return this.interactives;
  }

  /**
   * Add an Interactive connection (multiplexing support).
   */
  public addInteractive(interactive: Interactive): void {
    this.interactives.add(interactive);
  }

  /**
   * Remove an Interactive connection.
   */
  public removeInteractive(interactive: Interactive): void {
    this.interactives.delete(interactive);
  }

  public isConnected(): boolean {
    return this.interactives.size > 0;
  }

  public isLinkdead(): boolean {
    return !this.isConnected();
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
   * Cleanup hook. Unregisters from PlayerApi and drops all connections.
   * Persist-back to the avatar template is deferred to the persist
   * direction of the unified model (not implemented this phase).
   */
  protected prepareDestroy(): void {
    PlayerApi.unregisterAvatar(this);
    this.interactives.clear();
  }

  public toString(): string {
    return `[Avatar ${this.fullName} playerId=${this.playerId}]`;
  }

  /** @internal — overridable for tests. */
  private static getApplicationInstance(): Application {
    return Application.get();
  }
}
