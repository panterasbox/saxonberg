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
import { TemplateApi } from '../api/template';
import { StuffApi } from '../api/stuff';
import { MessageApi } from '../api/message';
import { DescribeApi } from '../api/describe';
import { Mml } from '../api/mml';
import {
  ScheduleApi,
  type ScheduleHandle,
} from '../api/schedule';
import {
  SettingTypes,
  resolveSetting,
  type SettingsSchemaEntry,
} from '../lib/shell/Environment';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { HasInteractiveMixin } from '../lib/connection/HasInteractive';
import { Events } from '../lib/events';
import { DEFAULT_STARTING_LOCATION_PATH } from '../config/constants';
import { Location } from '../lib/stuff/Location';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { User } from '../lib/identity/User';
import type {
  ConnectionEstablishedPayload,
  EnvelopeTemplate,
  MessageFrame,
} from '@saxonberg/types';
import { Application } from '../../backend/Application';
import type { CommandContributions } from '../api/command';
import type { Interactive } from './Interactive';
import type { TopicCatalogue } from './TopicCatalogue';

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
   * Schema entries declared by Avatar. Picked up by the schema walk
   * (`EnvironmentMixin`'s prototype-chain traversal — see
   * `docs/subsystems/shell-environment.md`); class-level
   * `static settings` are unioned alongside mixin-level entries.
   *
   * `world.autosave.interval` controls the cadence of the periodic-
   * save backstop installed in `Avatar.enter`. Resolved once at
   * `startAutoSave()` time; mid-session changes don't restart the
   * timer (documented limitation).
   *
   * Schema-on-owner principle: the setting lives wherever the
   * concept lives. Autosave is purely Avatar-lifecycle policy, so
   * Avatar is the right home. A future persistence/autosave mixin would
   * pull this entry up to that mixin and Avatar would compose it.
   */
  static settings: SettingsSchemaEntry[] = [
    {
      key: 'world.autosave.interval',
      type: SettingTypes.Number,
      default: 5 * 60 * 1000, // 5 minutes in milliseconds
      description:
        'Cadence (milliseconds) for the Avatar persist-back ' +
        'periodic backstop. Resolved once at login time; mid-session ' +
        'changes do not restart the running timer (effect lands at ' +
        'next login).',
    },
  ];

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
   * Snapshot this Avatar's `persistentFields` chain back to its
   * per-player template doc. Two-line shim: TemplateApi captures
   * state into the returned Template; `tpl.save()` commits it.
   *
   * Concurrent saves (periodic timer + linkdead hook + manual eval)
   * each produce a valid full-state snapshot; MongoDB resolves
   * ordering as last-write-wins. See
   * `docs/subsystems/templates.md` § Persist-Back for the
   * snapshot-before-await ordering invariant the substrate honors.
   */
  public async save(): Promise<void> {
    const tpl = await TemplateApi.snapshotToTemplate(this);
    await tpl.save();
  }

  /**
   * Re-hydrate this Avatar's in-memory state from its current
   * template doc. Operates on the existing live instance,
   * preserving identity / stuffId / connected Interactives.
   *
   * v1: developer/admin operation — no multi-connection
   * synchronization. Should not be invoked during the initial
   * clone cascade (the in-flight-clone guard catches recursive
   * clones, not parallel hydrate on a registered instance).
   */
  public async restore(): Promise<void> {
    await TemplateApi.restoreFromTemplate(this);
  }

  /**
   * Begin this Avatar's playable session. Called by `Login.enter`
   * after the Interactive has been transferred from Login to this
   * Avatar. Owns everything that's "playing as this avatar":
   *
   *   1. Resolve the starting location — consult the live container
   *      first (set by the Avatar template's `data.container` via
   *      Phase 2 `applyContainer` during clone, or by
   *      `Avatar.restore()` re-hydrating saved state). Only fall back
   *      to `DEFAULT_STARTING_LOCATION_PATH` for a brand-new avatar
   *      with no declared spawn.
   *   2. Install the periodic-save backstop via `startAutoSave()`.
   *   3. Send the welcome scene with the connection-established
   *      payload the client needs for bootstrap.
   *   4. Force a `look` so the player sees their starting location —
   *      delegated to `MobileMixin.autoLookOnArrival` (the same hook
   *      that fires after a traversal), so we share the focus-reset
   *      and forceCommand plumbing instead of reimplementing `look`.
   *   5. Emit `Events.PlayerLoggedIn` for engine-level observers.
   *
   * **One call per session-start, not per connection.** When a second
   * Interactive multiplexes onto an already-playing Avatar,
   * `ConnectionApi.transfer` adds it to the avatar's `interactives`
   * set directly — `enter` is NOT re-invoked. The two unguarded
   * idempotency-sensitive steps here (welcome scene, PlayerLoggedIn
   * emit) would double-fire if a caller did re-invoke; treat the
   * method as session-start-only.
   */
  public async enter(interactive: Interactive): Promise<void> {
    let startingLocation: (Stuff & Container) | null = this.getContainer();
    if (!startingLocation) {
      startingLocation = await StuffApi.singleton<Location>(
        DEFAULT_STARTING_LOCATION_PATH
      );
      // Silent spawn: a freshly-cloned avatar shouldn't be announced
      // as "vanishing" from somewhere or "appearing out of thin air"
      // before the player has even seen the location. We still want
      // the auto-look — fired explicitly below after the welcome
      // scene so the order is welcome → look.
      this.teleport(startingLocation, { silent: true });
    }
    console.info(
      `Avatar.enter: ${this.getFullName()} in ${DescribeApi.getDisplayName(startingLocation)}`
    );

    this.startAutoSave();

    // Welcome scene: actor frame at system.connection.established
    // carries the bootstrap payload the client needs.
    // Welcome is the introductory moment — explicitly the formal
    // register, so reach for fullName.
    const catalogue =
      StuffApi.findByTemplatePath<TopicCatalogue>('/obj/TopicCatalogue');
    const payload: ConnectionEstablishedPayload = {
      userId: interactive.getUserId() ?? '',
      socketId: interactive.getSocketId(),
      sessionId: interactive.getSessionId(),
      interactiveStuffId: interactive.stuffId,
      player: {
        _id: this.getPlayerId(),
        honorific: this.getHonorific(),
        name: this.getName(),
        surname: this.getSurname(),
        nameSuffix: this.getNameSuffix(),
        alternateNames: this.getAlternateNames(),
        pronouns: this.getPronouns(),
      },
      topicCatalogue: catalogue?.getSnapshot() ?? [],
      clientState: this.snapshotClientState(),
    };
    MessageApi.scene(this)
      .topic(MessageApi.Topics.system.connection.established)
      .toSelf(Mml.compose`Welcome back, ${this.getFullName()}!`)
      .payload(payload)
      .send();

    // Force a look so the player sees where they are. Reuses
    // MobileMixin's auto-look-on-arrival path (which forceCommand's
    // the `look` verb and resets focus first) rather than
    // reimplementing the description rendering here.
    await this.autoLookOnArrival();

    // Avatar is in-world; the user is logged in. Engine-level event
    // for any observer (audit, achievements) that doesn't care
    // which avatar — just that this player is now playable.
    EventApi.emit(Events.PlayerLoggedIn, {
      playerId: this.getPlayerId(),
      userId: interactive.getUserId() ?? '',
    });
  }

  /**
   * Periodic auto-save handle. Started by `enter()` post-connection;
   * cleared by `onDestruct`. Mechanism is `ScheduleApi.recurring` —
   * the purpose-built substrate wrapper with
   * `propagateAttribution: false` (the save isn't causally a
   * follow-on of login) and `mode: 'fixed-delay'` (drift-tolerant).
   *
   * TypeScript `private` (not `#`) per the domain-code default —
   * the mixin proxy receiver can't reach `#`-private slots.
   */
  private periodicSaveHandle: ScheduleHandle | null = null;

  /**
   * Install the periodic-save timer. Idempotent — calling twice is
   * a no-op. The interval is resolved once at install time from
   * the `world.autosave.interval` setting; mid-session changes do
   * not restart the timer in v1.
   */
  public startAutoSave(): void {
    if (this.periodicSaveHandle !== null) return;
    const intervalMs =
      resolveSetting<number>(this, 'world.autosave.interval') ??
      5 * 60 * 1000;
    this.periodicSaveHandle = ScheduleApi.recurring(
      intervalMs,
      () => {
        // Fire-and-forget; errors logged but don't crash the session.
        void this.save().catch((err) => {
          console.error(
            `Avatar.autoSave: save failed for playerId=${this.playerId}:`,
            err
          );
        });
      },
      { propagateAttribution: false, mode: 'fixed-delay' }
    );
  }

  /**
   * Cancel the periodic-save timer. Idempotent.
   */
  public stopAutoSave(): void {
    if (this.periodicSaveHandle !== null) {
      ScheduleApi.cancel(this.periodicSaveHandle);
      this.periodicSaveHandle = null;
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
   * Cleanup hook. Fires a final persist-back save, cancels the
   * periodic-save timer, unregisters from PlayerApi, and detaches
   * every live Interactive.
   *
   * The save is fire-and-forget (`onDestruct` is synchronous per
   * the Stuff lifecycle contract). Correctness lives in
   * `TemplateApi.snapshotToTemplate`'s synchronous prefix — field
   * values + container ref are captured BEFORE the first await,
   * so the snapshot reflects pre-cleanup state even if the MongoDB
   * write doesn't complete during shutdown. The periodic backstop
   * covers any prior state loss; concurrent in-flight save is fine
   * (MongoDB last-write-wins).
   */
  public onDestruct(): void {
    void this.save().catch((err) => {
      console.error(
        `Avatar.onDestruct: final save failed for playerId=${this.playerId}:`,
        err
      );
    });

    this.stopAutoSave();
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
