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

import { ShelledCharacter } from "../lib/shell/ShelledCharacter";
import { PlayerApi } from "../api/player";
import { ConnectionApi } from "../api/connection";
import { EventApi } from "../api/event";
import { TemplateApi } from "../api/template";
import { StuffApi } from "../api/stuff";
import { BeliefStoreApi } from "../api/belief";
import { ChronicleApi } from "../api/chronicle";
import { ContainmentApi } from "../api/containment";
import { MixinApi } from "../api/mixin";
import type { Containable } from "../lib/spatial/Containable";
import type { Stuff } from "../lib/stuff/Stuff";
import { SpeciesApi } from "../api/species";
import AetherImplant from "../lib/augmentation/AetherImplant";
import CommsUpdate from "../lib/comms/CommsUpdate";
import CredentialWalletUpdate from "../lib/credential/CredentialWalletUpdate";
import ForumsUpdate from "../lib/forum/ForumsUpdate";
import { MessageApi } from "../api/message";
import { Mml } from "../api/mml";
import { ScheduleApi, type ScheduleHandle } from "../api/schedule";
import {
  SettingTypes,
  type SettingsSchemaEntry,
} from "../lib/shell/Environment";
import { ShellApi } from "../api/shell";
import { StreamSourceApi } from "../api/stream-source";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { HasInteractiveMixin } from "../lib/connection/HasInteractive";
import { AetherMixin } from "../lib/message/Aether";
import { ContactsMixin } from "../lib/social/Contacts";
import { SubjectSubscriberMixin } from "../lib/forum/SubjectSubscriber";
import { Events } from "../lib/events";
import type { User } from "../lib/identity/User";
import type {
  ConnectionEstablishedPayload,
  EnvelopeTemplate,
  MessageFrame,
} from "@saxonberg/types";
import { Application } from "../../backend/Application";
import type { CommandContributions } from "../api/command";
import type Interactive from "./Interactive";
import type TopicCatalogue from "./TopicCatalogue";
import { TemplatePathPrefixes } from "../lib/paths";

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
  /**
   * Mark this avatar as an anonymous guest (throwaway, never persisted,
   * destroyed on disconnect). Set by `Login` when minting a guest from
   * the seed. A guest has no `playerId` and is not registered with
   * `PlayerApi`.
   */
  isGuest?: boolean;
}

// AetherMixin composes onto Avatar — players have implants (per the
// char-gen / augmentation slates' diegetic story); NPCs opt in
// per-class by composing AetherMixin themselves when content requires
// it. The mixin gates `tell` and (future) chat / remote-emote.
const AvatarBase = PostRegistrationMixin(
  HasInteractiveMixin(
    AetherMixin(ContactsMixin(SubjectSubscriberMixin(ShelledCharacter))),
  ),
);

export default class Avatar extends AvatarBase {
  /**
   * Command provider for Avatar-specific commands (diagnostic/system)
   */
  static commandContributions: CommandContributions = {
    self: [
      "system/ping.yaml",
      "system/help.yaml",
      "system/clear.yaml",
      "system/affordances.yaml",
      "author/player.yaml",
      "perception/analyze.yaml",
      "social/subject.yaml",
    ],
    environment: [],
    inventory: [],
    peers: [],
  };

  /**
   * Instruction field — the avatar's *durable spawn/recall reference*.
   * Sibling to the `container` instruction (from `ContainableMixin`) but
   * distinct: it holds a singleton room **or a Warren**, and resolves at
   * hydration via `applyStartLocation`. Only avatars have a
   * spawn/recall location, so it lives directly here (no mixin). The
   * Hydrator's Phase 2 auto-dispatches any declared instruction field, so
   * the declaration alone wires it. See
   * [docs/requirements/multilocation-lounge-requirements.md].
   */
  static instructionFields = ["startLocation"];

  /**
   * Phase 2 applier for `data.startLocation`. The avatar's spawn/recall
   * reference is either a **Warren** (land in its lazily-created host —
   * the Warren is never the avatar's `container`; `container` stays
   * honest) or an ordinary **room** (a singleton room is reused, a
   * non-singleton one is cloned fresh — `StuffApi.singletonOrClone`). The
   * Warren check is a real `instanceof` against the canonical base class
   * (unspoofable); the generic clone-vs-singleton decision stays in
   * `StuffApi`.
   *
   * Compare-and-move idempotency is unnecessary here (spawn fires once at
   * clone time); `Avatar.restore()` re-fires it harmlessly (the move is a
   * no-op when already in place, or a clean re-seat).
   */
  async applyStartLocation(ref: string): Promise<void> {
    // The warren-vs-location landing decision is shared with self-seating
    // fixtures; it lives in `ContainmentApi.resolveLanding`. An avatar is a
    // transient occupant, so it ignores the returned Warren (no fixture
    // registration — host migration drains occupants separately).
    const { container } = await ContainmentApi.resolveLanding(ref);
    ContainmentApi.move(this as unknown as Stuff & Containable, container);
  }

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
      key: "world.autosave.interval",
      type: SettingTypes.Number,
      default: 5 * 60 * 1000, // 5 minutes in milliseconds
      description:
        "Cadence (milliseconds) for the Avatar persist-back " +
        "periodic backstop. Resolved once at login time; mid-session " +
        "changes do not restart the running timer (effect lands at " +
        "next login).",
    },
  ];

  /**
   * Template path prefix for avatars in the domain collection.
   * Avatar templates live at `/obj/Avatar/<playerId>` — instances
   * of a class share the same `/obj/<ClassName>` namespace as
   * singleton templates of that class (`/obj/EventRegistry`),
   * with a per-instance suffix.
   */
  static readonly TEMPLATE_PATH_PREFIX = TemplatePathPrefixes.avatar;

  /**
   * Reserved playerId for the seed avatar at
   * `/obj/Avatar/seed` — the orphan template every new user's
   * avatar is forked from. 4 chars; nanoids are 21, so it can't
   * collide with a real playerId.
   */
  static readonly SEED_PLAYER_ID = "seed";

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
  public getUser(): User | undefined {
    return this.user;
  }
  public setUser(value: User | undefined): void {
    this.user = value;
  }

  /**
   * Character slot id (key under `/obj/Avatar/<playerId>` and in `User.playerIds`).
   * Runtime-only: the template path encodes it, so it does not need to be
   * mirrored into the doc. Stamped by `postRegister` from the clone
   * context, or seeded by the test/direct-construction data blob.
   */
  protected playerId: string = "";
  public getPlayerId(): string {
    return this.playerId;
  }
  public setPlayerId(value: string): void {
    this.playerId = value;
  }

  /**
   * Anonymous-guest marker. Runtime-only (NOT persisted — guests never
   * save). Stamped in `postRegister` from the clone context. This is the
   * **character axis** (is this body a throwaway persona?), distinct from
   * the session's auth state (`User.anonymous`). Every guest *behavior*
   * — don't-flush, destroy-on-disconnect, reserved name, client badge —
   * keys off this, never the session.
   */
  protected isGuest: boolean = false;
  public getIsGuest(): boolean {
    return this.isGuest;
  }

  /**
   * Multiplexing storage (`interactives: Set<Interactive>`),
   * `addInteractive` / `removeInteractive` / `getInteractives` /
   * `isConnected` are all provided by `HasInteractiveMixin`.
   */

  /**
   * Post-registration setup called by the clone pipeline (Spring
   * `@PostConstruct`-style). Stamps runtime-only references (user,
   * playerId) from the caller-supplied context, registers with
   * PlayerApi so later lookups by playerId resolve to this instance,
   * and installs the v1 default-issuance loadout (currently just the
   * AetherImplant in the cranial slot).
   *
   * Default loadout install lives here — at clone time, alongside
   * the rest of the instance wiring — rather than in `Avatar.enter`
   * (which is session-start ceremony, not setup). When char-gen
   * ships, the loadout install moves there with the rest of
   * character creation.
   */
  public override async postRegister(
    context?: AvatarInitContext,
  ): Promise<void> {
    if (context?.user) this.user = context.user;
    if (context?.playerId) this.playerId = context.playerId;
    if (context?.isGuest) this.isGuest = true;

    // Guests have no playerId and are not registered — they're
    // throwaway and looked up by nothing. (A guest's reserved-word name
    // comes from its transient template data, set by the Hydrator.)
    if (this.playerId) {
      PlayerApi.registerAvatar(this);
    }

    await this.installDefaultLoadout();
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
   *
   * @hook Invoked by the backend lifecycle (periodic autosave timer,
   *   the linkdead hook, and manual `eval`) to persist the avatar's
   *   full state back to its template. **Witness** (async) — snapshots
   *   before the first `await` so concurrent saves each write a valid
   *   full-state snapshot (last-write-wins). The only v1 persist-back
   *   consumer; not a general mixin surface.
   */
  public async save(): Promise<void> {
    // Guests persist nothing — no per-character template to write back.
    // This is the single guard that makes "zero guest persistence" hold
    // across every save path (autosave timer, onDestruct, client-state).
    if (this.isGuest) return;
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
   * Avatar. Pure session-start ceremony:
   *
   *   1. Install the periodic-save backstop via `startAutoSave()`.
   *   2. Send the welcome scene with the connection-established
   *      payload the client needs for bootstrap.
   *   3. Force a `sense` so the player perceives their starting
   *      location across every channel they possess — delegated
   *      to `MobileMixin.autoSenseOnArrival` (the same hook that
   *      fires after a traversal), so we share the focus-reset and
   *      forceCommand plumbing instead of reimplementing `sense`.
   *   4. Emit `Events.PlayerLoggedIn` for engine-level observers.
   *
   * Starting location and default loadout are NOT this method's
   * concern. The Avatar's container is set declaratively by the
   * template's `data.container` field (Phase 2 `applyContainer`
   * during clone) or by `Avatar.restore()` re-hydrating saved
   * state; default loadout (currently the AetherImplant) is
   * installed in `postRegister`. Both run before `enter` fires.
   *
   * **One call per session-start, not per connection.** When a second
   * Interactive multiplexes onto an already-playing Avatar,
   * `ConnectionApi.transfer` adds it to the avatar's `interactives`
   * set directly — `enter` is NOT re-invoked. The two unguarded
   * idempotency-sensitive steps here (welcome scene, PlayerLoggedIn
   * emit) would double-fire if a caller did re-invoke; treat the
   * method as session-start-only.
   */
  public async enter(
    interactive: Interactive,
    opts: { firstArrival?: boolean } = {},
  ): Promise<void> {
    const startingLocation = this.getContainer();
    if (!startingLocation) {
      throw new Error(
        `Avatar.enter: ${this.getFullName()} has no container. ` +
          `Avatar templates must declare a spawn via 'data.startLocation' ` +
          `(a room or a Warren) or 'data.container'; the seed at ` +
          `'${Avatar.SEED_TEMPLATE_PATH}' sets a default that's copied at signup.`,
      );
    }
    console.info(
      `Avatar.enter: ${this.getFullName()} in ${startingLocation.getPresentation()}`,
    );

    this.startAutoSave();

    // Lazy-hydrate this avatar's identity memory (recognition /
    // identification) into its in-memory belief store. Serves the naming
    // path from memory thereafter — no Mongo read on look/listing.
    await BeliefStoreApi.hydrate(this);

    // First-arrival deed — minted once, ever. Called unconditionally
    // (not gated on `opts.firstArrival`): the greeting flag only selects
    // prose, while the `recordOnce` key is the dedup authority, so the
    // first ever arrival mints and every re-login `enter` no-ops.
    // `startingLocation` is non-null here (the throw above guarantees it).
    await ChronicleApi.recordOnce(this, "first-arrival", {
      kind: "deed",
      template: "Arrived at {{ place | location }}.",
      vars: { place: startingLocation },
      where: startingLocation.getTemplatePath() ?? null,
      tags: ["arrival"],
    });

    // Welcome scene: actor frame at system.connection.established
    // carries the bootstrap payload the client needs.
    // Welcome is the introductory moment — explicitly the formal
    // register, so reach for fullName.
    const catalogue = StuffApi.findByTemplatePath<TopicCatalogue>(
      "/obj/TopicCatalogue",
    );
    const portraitUrl = await this.getPortraitUrl();
    const payload: ConnectionEstablishedPayload = {
      userId: interactive.getUserId() ?? "",
      socketId: interactive.getSocketId(),
      sessionId: interactive.getSessionId(),
      interactiveStuffId: interactive.stuffId,
      avatarStuffId: this.stuffId,
      player: {
        _id: this.getPlayerId(),
        honorific: this.getHonorific(),
        name: this.getName(),
        surname: this.getSurname(),
        nameSuffix: this.getNameSuffix(),
        alternateNames: this.getAlternateNames(),
        pronouns: this.getPronouns(),
        portraitUrl,
        isGuest: this.getIsGuest(),
      },
      topicCatalogue: catalogue?.getSnapshot() ?? [],
      clientState: this.snapshotClientState(),
      // Operator-configured broadcast sources for the livestream-viewer
      // embed; surfaced live via the `stream-sources` envelope on change.
      broadcastSources: StreamSourceApi.current(),
      reactionPrefs: {
        intensity:
          ShellApi.resolveSetting<
            "off" | "subtle" | "normal" | "vivid"
          >(this, "social.react.intensity") ?? "normal",
        alwaysAggregate:
          ShellApi.resolveSetting<boolean>(
            this,
            "social.react.alwaysAggregate",
          ) ?? false,
        muteChannels:
          ShellApi.resolveSetting<boolean>(
            this,
            "social.react.muteChannels",
          ) ?? false,
      },
    };
    // First arrival (just created in char-gen) gets a fresh greeting;
    // a returning player gets the welcome-back register.
    const greeting = opts.firstArrival
      ? Mml.compose`Welcome, ${this.getFullName()}.`
      : Mml.compose`Welcome back, ${this.getFullName()}!`;
    MessageApi.scene(this)
      .topic("system.connection.established")
      .toSelf(greeting)
      .payload(payload)
      .send();

    // Force a sense so the player perceives where they are across
    // every channel they possess. Reuses MobileMixin's auto-sense-
    // on-arrival path (which forceCommand's the `sense` verb and
    // resets focus first) rather than reimplementing the
    // description rendering here.
    await this.autoSenseOnArrival();

    // Avatar is in-world; the user is logged in. Engine-level event
    // for any observer (audit, achievements) that doesn't care
    // which avatar — just that this player is now playable.
    EventApi.emit(Events.PlayerLoggedIn, {
      playerId: this.getPlayerId(),
      userId: interactive.getUserId() ?? "",
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
   * Install the v1 default loadout — attune the avatar, then inject the
   * default hosted updates (comms + the travel credential). Called from
   * `postRegister`, runs once per clone (every login, since the runtime
   * Avatar is destructed at logout and re-cloned on the next session).
   *
   * Keys off **whether the avatar is attuned by any source**: if
   * `AetherMixin` isn't already active (a born-attuned species confers
   * it intrinsically), occupy the `AetherImplant` in the cranial slot to
   * confer it. Either way the avatar is then an `AetherHost`, so inject
   * the two default updates onto it.
   *
   * Idempotency keys off **"already hosts a comms update"** — correct
   * for both paths (a born-attuned avatar never occupies cranial).
   * Session-durable persistence is preserved: the credential update is
   * re-cloned each session, so `registered` resets to the born-with
   * floor each login.
   *
   * Stand-in for char-gen's baseline issuance; when char-gen ships, the
   * loadout install moves there. Defensive wrapper around the whole body
   * so a missing seed / species / body plan in a fresh dev DB doesn't
   * crash the clone cascade — failures log and the sense / dm verbs
   * surface their own polite refusals downstream.
   */
  private async installDefaultLoadout(): Promise<void> {
    try {
      if (!MixinApi.isSlotted(this)) return;
      // Ensure species + body plan are loaded so the BodyPlanSlots
      // override sees the cranial slot when we query it (and so species
      // intrinsic conferral resolves).
      await SpeciesApi.preloadAnatomy(this);

      // Avatar composes AetherMixin, so the host surface
      // (`getHostedUpdates` / `hostUpdate`) is on `this` directly — no
      // cast. The `isAether` guards stay as cheap runtime checks.

      // Idempotency: already hosting a comms update means the loadout
      // ran on this clone.
      if (
        MixinApi.isAether(this) &&
        this.getHostedUpdates().some((u) => MixinApi.isComms(u))
      ) {
        return;
      }

      // Attune by some source. A born-attuned species already has
      // AetherMixin active — skip the implant. Otherwise occupy the
      // cranial implant to confer attunement.
      if (!MixinApi.isActive(this, "AetherMixin")) {
        try {
          if (this.getOccupants("cranial").size === 0) {
            const implant = await StuffApi.clone<AetherImplant>(
              AetherImplant.TEMPLATE_PATH,
            );
            this.occupy(implant, "cranial");
          }
        } catch {
          // No cranial slot on this body plan (sessile etc.) — can't
          // attune via implant; nothing to host.
        }
      }

      // Inject the default updates — only if attunement made this a
      // usable host (implant occupied or species-born).
      if (!MixinApi.isAether(this)) return;
      const comms = await StuffApi.clone<CommsUpdate>(
        CommsUpdate.TEMPLATE_PATH,
      );
      this.hostUpdate(comms);
      const forums = await StuffApi.clone<ForumsUpdate>(
        ForumsUpdate.TEMPLATE_PATH,
      );
      this.hostUpdate(forums);
      // One wallet app holds every credential kind (payment + travel),
      // replacing the per-credential implant twins. Its seed ships an empty
      // payment record and a floored travel record.
      const wallet = await StuffApi.clone<CredentialWalletUpdate>(
        CredentialWalletUpdate.TEMPLATE_PATH,
      );
      this.hostUpdate(wallet);
    } catch (err) {
      console.warn(
        `Avatar.installDefaultLoadout skipped for ${this.stuffId}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /**
   * Install the periodic-save timer. Idempotent — calling twice is
   * a no-op. The interval is resolved once at install time from
   * the `world.autosave.interval` setting; mid-session changes do
   * not restart the timer in v1.
   */
  public startAutoSave(): void {
    if (this.isGuest) return; // Guests never persist — no autosave timer.
    if (this.periodicSaveHandle !== null) return;
    const intervalMs =
      ShellApi.resolveSetting<number>(this, "world.autosave.interval") ??
      5 * 60 * 1000;
    this.periodicSaveHandle = ScheduleApi.recurring(
      intervalMs,
      () => {
        // Fire-and-forget; errors logged but don't crash the session.
        void this.save().catch((err) => {
          console.error(
            `Avatar.autoSave: save failed for playerId=${this.playerId}:`,
            err,
          );
        });
      },
      { propagateAttribution: false, mode: "fixed-delay" },
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
        err,
      );
    });

    // Final-flush + evict the identity-memory working set (fire-and-
    // forget, mirroring the save above — `onDestruct` is synchronous).
    void BeliefStoreApi.evictAndFlush(this).catch((err) => {
      console.error(
        `Avatar.onDestruct: belief flush failed for playerId=${this.playerId}:`,
        err,
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
   *
   * @hook Invoked by the backend connection layer when an avatar's
   *   last live Interactive disconnects (the 1 → 0 presence edge).
   *   **Witness** — react to the player going linkdead (reap a guest
   *   body, freeze in-session clocks, persist, etc.). Override and
   *   chain `super.onLinkdead()` to keep base presence handling.
   */
  public onLinkdead(): void {
    // A guest body has nothing to resume — reap it the moment its last
    // connection drops (no reconnect window, unlike a real avatar which
    // persists linkdead for reconnection). The client routes a dropped
    // guest to the start screen.
    if (this.isGuest) {
      StuffApi.destruct(this);
      return;
    }
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
