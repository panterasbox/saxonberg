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
import { SandboxApi } from "../api/sandbox";
import { ConnectionApi } from "../api/connection";
import { EventApi } from "../api/event";
import { StuffApi } from "../api/stuff";
import { BeliefStoreApi } from "../api/belief";
import { ChronicleApi } from "../api/chronicle";
import { ContainmentApi } from "../api/containment";
import { MixinApi } from "../api/mixin";
import type { Containable } from "../lib/spatial/Containable";
import type { Container } from "../lib/spatial/Container";
import type { Stuff, EvictionContext } from "../lib/stuff/Stuff";
import type { VetoResult } from "../lib/errors";
import { SpeciesApi } from "../api/species";
import AetherImplant from "./AetherImplant";
import CommsUpdate from "./CommsUpdate";
import CredentialWalletUpdate from "./CredentialWalletUpdate";
import ForumsUpdate from "./ForumsUpdate";
import { MessageApi } from "../api/message";
import { Mml } from "../api/mml";
import { ScheduleApi, type ScheduleHandle } from "../api/schedule";
import {
  SettingTypes,
  type SettingsSchemaEntry,
} from "../lib/shell/Environment";
import { ShellApi } from "../api/shell";
import { BulletinApi } from "../api/bulletin";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { PersistableMixin } from "../lib/persistence/Persistable";
import { ForkableMixin } from "../lib/persistence/Forkable";
import { PersistableApi } from "../api/persistable";
import { HasInteractiveMixin } from "../lib/connection/HasInteractive";
import { AetherMixin } from "../lib/message/Aether";
import { ContactsMixin } from "../lib/social/Contacts";
import { NotifyPolicyMixin } from "../lib/social/NotifyPolicy";
import { SubjectSubscriberMixin } from "../lib/forum/SubjectSubscriber";
import { PartyMemberMixin } from "../lib/party/PartyMember";
import { Events } from "../lib/events";
import type { User } from "../lib/identity/User";
import type { MortalArc } from "../lib/mortality/MortalArc";
import type {
  ConnectionEstablishedPayload,
  EnvelopeTemplate,
  MessageFrame,
} from "@saxonberg/types";
import type { CommandContributions } from "../api/command";
import type Interactive from "./Interactive";
import type TopicCatalogue from "./TopicCatalogue";
import { TemplatePathPrefixes } from "../lib/paths";
import { EstateMixin } from "../lib/chattel/Estate";
import type { FieldMeta } from "../lib/mixin";

/**
 * The sockets a delivery to `body` should actually reach.
 *
 * Normally its own. While **parked** (its player is inside a circle —
 * sandbox Decision N), the field body is the stable identity everyone
 * addresses, but the player is wearing a vessel elsewhere: forward to
 * the live body's sockets so `tell alice` reaches Alice wherever she
 * is. Comms are seamless; the wire is unsurveillable, not unreachable,
 * and the payload is rendered MML — nothing but text crosses.
 *
 * A module-private function, NOT a method: an inner helper would be a
 * second proxy dispatch, and only the delivery seam itself is on the
 * boundary's message-delivery allowlist.
 */
function forwardingTargets(body: Avatar): Iterable<Interactive> {
  if (!body.isParked()) return body.getInteractives();
  const live = SandboxApi.activeBodyFor(body.getPlayerId());
  // `isDestroyed` is not belt-and-braces: exit reaps the vessel and
  // unparks the avatar in that order, so a delivery landing in between
  // resolves a live-looking handle to a dead one — whose proxy answers
  // every call with `undefined`, and the for-of over that blows up the
  // delivery seam itself (found live on `go out`).
  if (!live || live === body || live.isDestroyed()) {
    return body.getInteractives();
  }
  return live.getInteractives();
}

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
// PersistableMixin is composed **outermost** so its persistence-host
// behaviors (materialize/seed on `postRegister`, capture-on-destruct
// backstop, the persistable `canEvict` fall-through) wrap the rest. Avatar
// persists through the universal spine (see docs/subsystems/persistence.md):
// its record carries its declared fields, its carried inventory (Container
// slice), its worn gear (Slotted slice), and its own spawn/recall location
// (`place`), plus its ESTATE — the stamped goods it holds title to wherever
// they sit, which is what lets furniture stay in a room the avatar is not in.
// `shouldPersist()` (below) gates guests out.
const AvatarBase = PersistableMixin(
  EstateMixin(
    ForkableMixin(
      PostRegistrationMixin(
        HasInteractiveMixin(
          AetherMixin(
            NotifyPolicyMixin(
              ContactsMixin(
                PartyMemberMixin(SubjectSubscriberMixin(ShelledCharacter)),
              ),
            ),
          ),
        ),
      ),
    ),
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
      "shell/script.yaml",
      "stream/watch.yaml",
      "stream/tune.yaml",
      "crafting/make.yaml",
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
   *
   * Persistent fields declared by Avatar itself (collected up the chain by
   * `MixinApi.getAllPersistentFields`).
   *
   * `mortalArc` is the identity's position in the death arc, and it is the
   * **only** durable record that a player is dead. Deliberately NOT
   * `lifecycleState: 'dead'` on the body: see [MortalArc](../lib/mortality/MortalArc.ts)
   * for why those two behave oppositely.
   */
  static fieldMeta: FieldMeta = {
    mortalArc: { persistent: true },
    startLocation: { instruction: true },
  };

  /**
   * The identity's death-arc position, or `null` while embodied and alive.
   *
   * Written only by the death choreography and cleared only by
   * re-embodiment. Public because the `Hydrator` reflects into persistent
   * fields by name; other Stuff use the method surface below.
   */
  public mortalArc: MortalArc | null = null;

  public getMortalArc(): MortalArc | null {
    return this.mortalArc;
  }

  public setMortalArc(value: MortalArc | null): void {
    this.mortalArc = value;
  }

  /** Is this identity between death and re-embodiment? */
  public isDeceased(): boolean {
    return this.mortalArc !== null;
  }

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
  public override getPlayerId(): string {
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

    // Born-with loadout BEFORE the spine only on a FIRST mint. A returning
    // avatar's snapshot carries its worn gear (incl. the cranial implant),
    // and the spine restore below re-occupies the slots — installing the
    // default first would collide (`Slotted.occupy: slot 'cranial' is
    // full`) and brick every relog-after-restart. The returning path runs
    // the loadout AFTER materialize instead (below): the cranial guard
    // sees the restored implant and skips the hardware, while the
    // session-scoped aether apps (comms / forums / the credential wallet)
    // are re-provisioned onto it — they are deliberately not in the
    // snapshot.
    const spineKey = this.shouldPersist() ? this.getTemplatePath() : null;
    const hasSnapshot = spineKey
      ? await PersistableApi.hasRecord(spineKey, spineKey)
      : false;
    if (!hasSnapshot) {
      await this.installDefaultLoadout();
    }

    // Preserve the PostRegistration chain (the spine no longer auto-drives
    // here — D1).
    await super.postRegister(context);

    // Drive the persistence spine LAST, after the born-with loadout is in
    // place, with an EXPLICIT key (D1). The key is this avatar's own
    // templatePath (`/obj/Avatar/<playerId>`) — the self-owned singleton
    // owner, byte-identical to the pre-D1 scope-derived owner, so the record
    // `owner` column and the account-deletion cascade
    // (`deleteAllFor('/obj/Avatar/<pid>')`) are unchanged. A returning login
    // materializes (restoring fields + carried inventory + worn gear + spawn
    // location, overriding the clone-time template defaults); a fresh signup
    // captures the first record. A guest's `shouldPersist()` is false, so
    // this is a no-op for guests.
    if (spineKey) {
      if (hasSnapshot) {
        await PersistableApi.materialize(this, spineKey);
        // A snapshot may never hand back a body that cannot act again.
        // Runs BEFORE the loadout re-provision below, which reads restored
        // gear and must not race the heal.
        await this.reconcileMortalState(spineKey);
        // Re-provision the session-scoped born-with floor on top of the
        // restored gear. Idempotent: the restored implant keeps the
        // cranial slot (the loadout's occupancy guard skips the
        // hardware); only the hosted aether apps re-clone, restoring the
        // comms / forums / credential-wallet surfaces a snapshot never
        // carries.
        await this.installDefaultLoadout();
      } else {
        await PersistableApi.capture(this, spineKey);
      }
    }
  }

  /**
   * The terminal backstop that makes "a snapshot never hands back an
   * unusable body" unfalsifiable.
   *
   * A body whose snapshot carries `lifecycleState: 'dead'` cannot act:
   * `requiresAnimate` refuses `say`, `go`, `get` — forever, on every
   * subsequent login, because the dead state is itself persisted. That was
   * a live defect. Nothing in this build writes that state to a player
   * snapshot any more (the death choreography drains the body first and
   * records the arc on the identity instead), so reaching this method at
   * all means a record predates the fix or something upstream regressed.
   * Either way the only honest exit is to heal it — and to heal the
   * *record*, not just the instance, so the next login is clean too.
   *
   * Deliberately kept forever rather than deleted once the arc ships: it
   * costs one field read on a live path and it is what makes the invariant
   * hold against code that hasn't been written yet.
   */
  private async reconcileMortalState(spineKey: string): Promise<void> {
    if (this.getLifecycleState() !== "dead") return;

    console.warn(
      `Avatar.reconcileMortalState: healing a snapshot that restored ` +
        `${this.getPresentation()} (${spineKey}) as dead — a player body ` +
        `must never persist a dead lifecycle.`,
    );

    this.setLifecycleState("alive");
    this.setCauseOfDeath(null);
    this.resetVitalsToSpeciesBaseline();
    for (const condition of [...this.getConditions()]) {
      this.relieve(condition);
    }

    await ChronicleApi.recordDeed(this, {
      template: "{{ who | name }} returned to the world.",
      vars: { who: this },
      tags: ["death", "recovery"],
    });

    await PersistableApi.capture(this, spineKey);
  }

  /**
   * Persistence opt-out (the spine's `shouldPersist` hook). A guest is
   * throwaway and persists nothing — the single point (alongside the
   * `save()` guard) that makes "zero guest persistence" hold across
   * materialize / capture / autosave / onDestruct.
   *
   * Chains to `super` so `PersistableMixin.markForRevert()` is real for an
   * Avatar. Without the chain the revert flag is dead here, and the death
   * choreography — which drains the body and marks it for revert *before*
   * destructing it — would let the capture-on-destruct backstop write the
   * drained body back over a good snapshot.
   */
  public override shouldPersist(): boolean {
    return !this.isGuest && super.shouldPersist();
  }

  /**
   * Capture this Avatar's full runtime state into its persistence-spine
   * record (`PersistableApi.capture` → `holder_snapshots`): declared fields,
   * carried inventory, worn gear, and spawn/recall location.
   *
   * Concurrent saves (periodic timer + linkdead hook + manual eval) each
   * produce a valid full-state snapshot; the capture snapshots synchronously
   * before its first `await`, and MongoDB resolves ordering as
   * last-write-wins. See [docs/subsystems/persistence.md § The
   * self-persistence spine](../../docs/subsystems/persistence.md).
   *
   * @hook Invoked by the backend lifecycle (periodic autosave timer, the
   *   linkdead hook, and manual `eval`) to persist the avatar's full state.
   *   **Witness** (async) — the only v1 persist-back consumer; not a general
   *   mixin surface.
   */
  public async save(): Promise<void> {
    // Guests persist nothing — no record to write. This guard mirrors
    // `shouldPersist()` (which also fails closed inside the spine) so the
    // "zero guest persistence" invariant holds across every save path
    // (autosave timer, onDestruct, client-state).
    if (this.isGuest) return;
    // Persist through the universal spine: fields + carried inventory + worn
    // gear + spawn location, into the avatar's `holder_snapshots` record.
    // Explicit self-key (D1); a keyless capture would also reuse the stashed
    // key set at login, but pass it for clarity and independence from order.
    await PersistableApi.capture(this, this.getTemplatePath() ?? undefined);
  }

  /**
   * Re-hydrate this Avatar's in-memory state from its persistence-spine
   * record. Operates on the existing live instance, preserving identity /
   * stuffId / connected Interactives.
   *
   * v1: developer/admin operation — no multi-connection synchronization,
   * and intended for a **fresh** instance (the normal login path
   * materializes via `postRegister`; re-running `restore()` on a live
   * avatar that already holds inventory would re-clone the captured items on
   * top). Should not be invoked during the initial clone cascade.
   */
  public async restore(): Promise<void> {
    await PersistableApi.materialize(this, this.getTemplatePath() ?? undefined);
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
          `The avatar seed must declare a spawn via 'data.startLocation' ` +
          `(a room or a Warren) or 'data.container'; the seed at ` +
          `'${Avatar.SEED_TEMPLATE_PATH}' sets the default the enroll/guest ` +
          `overlay clones from (no per-player template row exists).`,
      );
    }
    console.info(
      `Avatar.enter: ${this.getFullName()} in ${startingLocation.getPresentation()}`,
    );

    this.startAutoSave();

    // Reconcile the casting affordance (the dynamic `cast`/`spells`
    // self-push — a gated mixin can't afford selectively through static
    // contributions; the refreshConferrals mirror). Species-fixed
    // in-session, so once at enter suffices.
    this.refreshCastingAffordance();

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
      // The live news-ticker window (pins-first, recency-ordered, already
      // retract/expiry-filtered + length-capped by the BulletinBoard). The
      // client seeds its feed pane from this as a `snapshot`, exactly as it
      // caches `topicCatalogue`; live deltas ride `world.bulletin.feed`.
      bulletinWindow: BulletinApi.recent().map((b) => BulletinApi.toRow(b)),
      clientState: this.snapshotClientState(),
      reactionPrefs: {
        intensity:
          ShellApi.resolveSetting<"off" | "subtle" | "normal" | "vivid">(
            this,
            "social.react.intensity",
          ) ?? "normal",
        alwaysAggregate:
          ShellApi.resolveSetting<boolean>(
            this,
            "social.react.alwaysAggregate",
          ) ?? false,
        muteChannels:
          ShellApi.resolveSetting<boolean>(this, "social.react.muteChannels") ??
          false,
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

    // Avatar is in-world; the user is playable. Engine-level presence
    // event for any observer (audit, achievements, the social presence
    // relay). A first-ever `enter()` for this instance is a fresh login;
    // a second `enter()` (a connection returning to a body that lingered
    // linkdead) is a reconnect — `sessionActive` is the discriminator
    // (set below, surviving the linkdead window).
    const reconnect = this.sessionActive;
    this.sessionActive = true;
    // A returning connection cancels any pending deliberate-leave intent.
    this.leaveIntent = false;
    this.announceSessionPresence(reconnect, interactive);
  }

  /**
   * Emit the session-start presence event. Split out of `enter()` as an
   * override seam: a body that is a PROJECTION of a player (the sandbox
   * wire body) runs the whole rest of the session ceremony — the
   * connection-established payload, the welcome, the auto-sense — but
   * must not tell the world its player just logged in. They didn't;
   * they stepped sideways.
   *
   * @hook Invoked at the end of `Avatar.enter`. **Override** to
   *   suppress or re-shape session presence for a non-login body;
   *   chain `super.announceSessionPresence(...)` to keep it.
   */
  protected announceSessionPresence(
    reconnect: boolean,
    interactive: Interactive,
  ): void {
    // Still parked ⇒ this ceremony is the RETURN half of a crossing
    // (the socket coming home from a circle). Nobody heard them leave,
    // so nobody hears them come back — symmetric with `onLinkdead`.
    if (this.parked) return;
    EventApi.emit(
      reconnect ? Events.PlayerReconnected : Events.PlayerLoggedIn,
      {
        playerId: this.getPlayerId(),
        userId: interactive.getUserId() ?? "",
      },
    );
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
   * Transient per-instance session flag: has this avatar instance entered
   * the world at least once in its current life? Set in `enter()`, never
   * cleared while the instance lingers linkdead — so a second `enter()`
   * (a connection returning to a still-in-world body) is recognizable as a
   * **reconnect** rather than a fresh login. A real logout destructs the
   * instance, so the next session starts a fresh instance with this unset.
   *
   * NOT persisted (deliberately absent from `persistentFields`): it
   * describes the live session, not durable avatar state. TypeScript
   * `private` per the domain-code default (the mixin proxy can't reach
   * `#`-private slots).
   */
  private sessionActive: boolean = false;

  /**
   * Transient flag: did the player signal a *deliberate* leave (sign out /
   * switch character) rather than a network drop? Set by the connection
   * layer (`Application.handleUserDisconnect`) when the socket closed with
   * the intentional-leave close code, read once by `onLinkdead()` to fire
   * `PlayerLoggedOut` (a deliberate departure) instead of
   * `PlayerDisconnected` (an involuntary linkdead drop). Not persisted.
   */
  protected leaveIntent: boolean = false;

  /**
   * Mark this avatar's next presence drop as a deliberate leave (sign out
   * / switch character) rather than an involuntary linkdead. The
   * connection layer calls this at the network boundary when the client
   * closed with the intentional-leave close code; `onLinkdead()` consumes
   * it. Idempotent.
   */
  public setLeaveIntent(intentional: boolean): void {
    this.leaveIntent = intentional;
  }

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
            // A cranial implant lives in the avatar's possession AND the
            // slot — the worn/wielded contract (see `Gus.equipLoadout` /
            // WearController). Move it in FIRST so it travels with the
            // avatar and never lists as loose room contents, THEN occupy
            // the slot. (Occupy alone doesn't set containment, so a
            // freshly cloned implant would otherwise leak into the room.)
            ContainmentApi.move(
              implant as unknown as Stuff & Containable,
              this as unknown as Stuff & Container,
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
    for (const interactive of forwardingTargets(this)) {
      ConnectionApi.sendMessage(interactive, frame);
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
    for (const interactive of forwardingTargets(this)) {
      ConnectionApi.sendEnvelope(interactive, envelope);
    }
  }

  /**
   * Cleanup hook. Fires a final persist-back save, cancels the
   * periodic-save timer, unregisters from PlayerApi, and detaches
   * every live Interactive.
   *
   * The save is fire-and-forget (`onDestruct` is synchronous per
   * the Stuff lifecycle contract). Correctness lives in
   * `PersistableApi.capture`'s synchronous snapshot prefix — the field
   * values, content tree, and location are read BEFORE the first await,
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
    // A PARKED avatar (its player crossed into a circle) suppresses the
    // presence emit: the player didn't leave — they're elsewhere and
    // unreachable, which is what the implant-blind wire means. Presence
    // reads present parked as present-but-unreachable, never offline.
    // (Sandbox Decision P — a suppression, no new event.)
    if (this.parked) return;
    // Split deliberate departures from involuntary drops. A sign-out /
    // switch-character closes the socket with the intentional-leave code,
    // which the connection layer recorded via `setLeaveIntent` — that's a
    // `PlayerLoggedOut` (the character left the game; a return is a fresh
    // login). A bare drop is a `PlayerDisconnected` (linkdead): the body
    // lingers and the next `enter()` will be a reconnect.
    if (this.leaveIntent) {
      this.leaveIntent = false;
      this.sessionActive = false;
      EventApi.emit(Events.PlayerLoggedOut, { playerId: this.playerId });
    } else {
      EventApi.emit(Events.PlayerDisconnected, { playerId: this.playerId });
    }
  }

  /* ── sandbox parking (Decision P) ──
   *
   * `parked` = this avatar's player is inside a circle on a wire body.
   * A parked avatar is present-but-unreachable: the presence emit is
   * suppressed (see onLinkdead), the residency sweep may not harvest
   * the body mid-visit (canEvict veto — bounded, sessions end), and
   * exit/reconnect re-attach to it. Runtime-only state.
   */
  private parked = false;

  public isParked(): boolean {
    return this.parked;
  }

  public setParked(value: boolean): void {
    this.parked = value;
  }

  /**
   * Connected while parked — the presence half of Decision N.
   *
   * A parked avatar owns no sockets (they moved to the vessel), so the
   * inherited "any Interactives?" answer is `false`, and every consumer
   * of it treats the player as offline: `who` stops listing them,
   * `tell <name>` resolves to nothing at all (the `online` scope is
   * empty, so the arg fails `at least 1`), the presence roster drops
   * them, notifications stop. Found live: stepping into your own circle
   * made you unreachable to the whole world — the precise opposite of
   * "the wire is unsurveillable, not unreachable."
   *
   * So reachability follows the person: this is the read-side twin of
   * `forwardingTargets` (the write side), and both keep the field body
   * as the stable identity everyone addresses while the vessel does the
   * actual carrying. `isConnected` is boundary-exempt (transport
   * plumbing), so a field-context caller may ask a circle-resident
   * vessel this one question.
   */
  public override isConnected(): boolean {
    if (super.isConnected()) return true;
    if (!this.parked) return false;
    const live = SandboxApi.activeBodyFor(this.getPlayerId());
    return (
      live !== null &&
      live !== (this as Avatar) &&
      !live.isDestroyed() &&
      live.isConnected()
    );
  }

  /**
   * Residency veto while parked: the body must be re-attachable at
   * exit. The spine's capture at park time covers crash durability; the
   * veto covers availability. Chains to the Persistable fall-through
   * for the unparked case.
   */
  public override canEvict(context: EvictionContext): VetoResult {
    if (this.parked) {
      return { ok: false, reason: 'parked: its player is inside a circle' };
    }
    return super.canEvict(context);
  }

  /* ── fork/merge slices (sandbox Decision Q) ── */

  /**
   * Presentation slice: what a projection vessel needs so the person is
   * recognizably themselves (name; species rides recognition, gear does
   * not travel). Fork-only for the sandbox — the merge allowlist never
   * includes it, so nothing here flows back.
   */
  public forkSlice_Presentation(): unknown {
    return {
      honorific: this.getHonorific(),
      name: this.getName(),
      surname: this.getSurname(),
      nameSuffix: this.getNameSuffix(),
    };
  }

  /**
   * Embodiment slice (fork-only): what KIND of living body this is.
   *
   * A projection of a person is still that person's kind of body —
   * it carries their species (hence body plan, hence the ability to
   * walk and act) and the plain fact of being alive. Without both, the
   * vessel is a statue you are trapped inside: `requiresAnimate`
   * refuses `go`, so you can't even leave (found live).
   *
   * Deliberately NOT the body's condition: no wounds, no fatigue, no
   * gear. Baseline mint (Decision C) means a healthy body of the right
   * kind, not a copy of the one you left parked. Nothing here merges
   * back — the allowlist is epistemic-only.
   */
  public forkSlice_Embodiment(): unknown {
    return {
      // Reference data (shared, read-only, boundary-exempt), so the
      // live ref is safe to hold from inside a circle.
      species: this.getSpecies(),
      lifecycleState: this.getLifecycleState(),
    };
  }

  public mergeSlice_Embodiment(slice: unknown): void {
    const s = slice as {
      species?: ReturnType<Avatar['getSpecies']>;
      lifecycleState?: string;
    };
    if (s?.species) this.setSpecies(s.species);
    if (s?.lifecycleState) this.setLifecycleState(s.lifecycleState);
  }

  public mergeSlice_Presentation(slice: unknown): void {
    const s = slice as {
      honorific?: string;
      name?: string;
      surname?: string;
      nameSuffix?: string;
    };
    if (typeof s?.name === 'string' && s.name.length > 0) {
      this.setName(s.name);
    }
    this.setHonorific(s?.honorific);
    this.setSurname(s?.surname);
    this.setNameSuffix(s?.nameSuffix);
  }

  public toString(): string {
    return `[Avatar ${this.fullName} playerId=${this.playerId}]`;
  }
}
