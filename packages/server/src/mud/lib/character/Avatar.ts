/**
 * Avatar - Runtime player character presence in the game world.
 *
 * Extends Character (Named, Gendered, Sensor, Vocal, Container,
 * Containable, Visible, Mobile, CommandGiver). Self-contained under the
 * unified state model: the template at `/platform/agent/Avatar/<playerId>` carries every
 * persistent field directly, no Player or CharacterSheet indirection.
 *
 * Lifetime: cloned when a player connects, destroyed when the last
 * connection drops.
 */

import { ShelledCharacter } from "../shell/ShelledCharacter";
import { NamedMixin } from "../description/Named";
import { PlayerApi } from "../../api/player";
import { SandboxApi } from "../../api/sandbox";
import { ConnectionApi } from "../../api/connection";
import { EventApi } from "../../api/event";
import { StuffApi } from "../../api/stuff";
import { ContainmentApi } from "../../api/containment";
import { MixinApi } from "../../api/mixin";
import type { Containable } from "../spatial/Containable";
import type { Container } from "../spatial/Container";
import type { Stuff, EvictionContext } from "../stuff/Stuff";
import type { VetoResult } from "../errors";
import { SpeciesApi } from "../../api/species";
import AetherImplant from "../../platform/thing/AetherImplant";
import CommsUpdate from "../../platform/idea/CommsUpdate";
import CredentialWalletUpdate from "../../platform/idea/CredentialWalletUpdate";
import ForumsUpdate from "../../platform/idea/ForumsUpdate";
import CalendarUpdate from "../../platform/idea/CalendarUpdate";
import { MessageApi } from "../../api/message";
import { Mml } from "../../api/mml";
import { ScheduleApi, type ScheduleHandle } from "../../api/schedule";
import {
  SettingTypes,
  type SettingsSchemaEntry,
} from "../shell/Environment";
import { ShellApi } from "../../api/shell";
import { CardApi } from "../../api/card";
import { PressApi } from "../../api/press";
import { ReactionApi } from "../../api/reaction";
import { RecordApi } from "../../api/record";
import { PersistableMixin } from "../persistence/Persistable";
import { ForkableMixin } from "../persistence/Forkable";
import { PersistableApi } from "../../api/persistable";
import { CartographerMixin } from "../location/Cartographer";
import { HasInteractiveMixin } from "../connection/HasInteractive";
import { ClientStateMixin } from "../connection/ClientState";
import { SaxonbergClientMixin } from "../connection/SaxonbergClient";
import { AetherMixin } from "../message/Aether";
import { ContactsMixin } from "../social/Contacts";
import { WardrobeMixin } from "../slot/Wardrobe";
import { NotifyPolicyMixin } from "../social/NotifyPolicy";
import { CalendarMixin } from "../calendar/Calendar";
import { SubjectSubscriberMixin } from "../forum/SubjectSubscriber";
import { PartyMemberMixin } from "../party/PartyMember";
import { Events } from "../events";
import type { User } from "../identity/User";
import type { AccountSubjects } from "../standing/AccountScoped";
import type { MortalArc } from "../mortality/MortalArc";
import type {
  ConnectionEstablishedPayload,
  EnvelopeTemplate,
  MessageFrame,
  ResultDisplay,
  RoutingRule,
} from "@saxonberg/types";
import { DEFAULT_ROUTING } from "@saxonberg/types";
import type { CommandContributions } from "../../api/command";
import type Interactive from "../../platform/idea/Interactive";
import type TopicCatalogue from "../../platform/idea/TopicCatalogue";
import { TemplatePathPrefixes } from "../paths";
import { EstateMixin } from "../chattel/Estate";
import type { FieldMeta } from "../mixin";
import type { SubscribableFieldDescriptor } from '../../api/mql-subscription';
import { InfluenceApi } from '../../api/influence';
import { RenownApi } from '../../api/renown';

/** Where the per-player routing table lives on `clientState`. */
const ROUTING_STATE_KEY = "console.routing";

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
 * ⭐ **The self-only gate for the live standing figures.**
 *
 * Returns the durable subject key the ledgers are keyed on — but only
 * when the viewer IS the subject. Anyone else gets `undefined`, which
 * `projectFields` omits, so another player's subscription simply has
 * no standing fields on it.
 *
 * Reading someone *else's* standing is a real feature and it already
 * has a surface: the `profile` verb, with its own redaction model. A
 * second implementation here would be a second copy of those rules,
 * and the two would drift the first time one was changed. So this
 * surface answers for you and nobody else.
 *
 * A module-private function rather than a method: it is a policy the
 * descriptors share, not behaviour the Avatar offers.
 */
function standingSubject(stuff: Stuff, viewer: Stuff): string | undefined {
  if (viewer?.stuffId !== stuff.stuffId) return undefined;
  return stuff.getIdentityPath() ?? undefined;
}

/**
 * Context passed to Avatar.onCreate() by Login when cloning.
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
// behaviors (materialize/seed on `onCreate`, capture-on-destruct
// backstop, the persistable `canEvict` fall-through) wrap the rest. Avatar
// persists through the universal spine (see docs/subsystems/persistence.md):
// its record carries its declared fields, its carried inventory (Container
// slice), its worn gear (Slotted slice), and its own spawn/recall location
// (`place`), plus its ESTATE — the stamped goods it holds title to wherever
// they sit, which is what lets furniture stay in a room the avatar is not in.
// `shouldPersist()` (below) gates guests out.
const AvatarBase = PersistableMixin(
  // ⭐ A played person KEEPS A MAP of the places they perceive
  // (location-graph B3). Outermost of the epistemic layers because it
  // reads `getIdentityPath()` and `shouldPersist()` — both of which the
  // composition below supplies — and because what it writes is a
  // DOCUMENT rather than host state, so it adds nothing to the
  // snapshot this stack captures.
  CartographerMixin(
  EstateMixin(
    ForkableMixin(
      SaxonbergClientMixin(
        ClientStateMixin(
          HasInteractiveMixin(
            AetherMixin(
              // ⭐ A played person keeps a personal calendar (D12) — dated
              // reminders on the implant. Inside PersistableMixin, so the
              // entries ride the Avatar snapshot; the ping re-arms at login.
              CalendarMixin(
                NotifyPolicyMixin(
                  ContactsMixin(
                    // ⭐ The wardrobe rides the `holder_snapshots` capture
                    // this composition already performs — named outfits are
                    // a `Record<string, string[]>` field, so they need no
                    // collection and no marshaller of their own.
                    WardrobeMixin(
                      PartyMemberMixin(
                        SubjectSubscriberMixin(
                          // ⭐ A player body has a name because EMBODY WRITES
                          // ONE, and it is the one piece of identity a player
                          // typed themselves. Composed here rather than
                          // inherited from the creature base: a body is not a
                          // somebody, and an Avatar is.
                          //
                          // ⚠ The fails-closed check on this is the ROUND
                          // TRIP — embody → `holder_snapshots` → reconnect. A
                          // missing field hydrates as empty and the banner
                          // reads "Welcome, ." with nothing thrown.
                          NamedMixin(ShelledCharacter),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
  ),
);

/**
 * ⭐⭐ **A human's handle in the world, in some phase of play.**
 *
 * The abstract root of the Avatar family. Everything that is true of
 * *every* body a player wears lives here — the thirteen-mixin
 * composition, the identity thread, the session ceremony, the loadout
 * floor, parking, the fork slices, the verb set. Nothing instances it:
 * a row's `class:` names a concrete body, and `lint:instanceable`
 * holds that.
 *
 * ```
 * Character  →  ShelledCharacter  →  Avatar  (abstract, here)
 *                                    ├── the body of record
 *                                    ├── ShadeAvatar        (the dead one)
 *                                    └── SandboxAvatar     (the circle one)
 * ```
 *
 * ⚠⚠ **`instanceof Avatar` always means THIS class.** A site left on
 * the concrete body of record silently excludes shades and circle
 * bodies — and both are the same person, so an identity-keyed read
 * that misses them is wrong rather than merely narrow.
 *
 * ⭐ The two axes the family varies on: *are your acts canon*, and
 * *can you fully act*. The body of record gives up neither; a shade's
 * deeds persist (tagged as having happened while ghosted) but it
 * cannot advance; a circle body can act fully and is rolled back at
 * the door. Each non-primary body gives up exactly one, and a
 * different one — which is why no single word named the axis.
 */
export default abstract class Avatar extends AvatarBase {
  /**
   * Command provider for Avatar-specific commands (diagnostic/system)
   */
  static commandContributions: CommandContributions = {
    self: [
      // ⭐ The map read is the PLAYER's: it resolves under
      // `/home/<self>`, and `Perceiver` is composed on NPCs too, so the
      // verb belongs on `Avatar` beside `help`/`wiki`/`press` rather
      // than on the perception mixin that writes it.
      'platform/cmd/perception/map.yaml',
      "platform/cmd/system/ping.yaml",
      "platform/cmd/system/help.yaml",
      // The wiki sits beside `help` deliberately. Both are reference
      // surfaces a player carries rather than reaches for: `help` tells
      // you what a verb does, `wiki` tells you what a thing IS. Reading
      // is open to everyone by design (D11 — an open commons, netted by
      // rollback), so gating the verb behind a hosted aether update the
      // way `forum`/`chat` are gated would contradict the access model
      // the build actually implements.
      "platform/cmd/system/wiki.yaml",
      /*
       * ⭐ The news sits beside `help` and `wiki` for the same reason:
       * it is a reference surface a player carries, and bare `press`
       * is the READ.
       *
       * ⚠ It used to be contributed by `AuthorMixin` alone, which made
       * the news the one shipped surface an ordinary player could not
       * ask for — the ticker arrived on connect and no verb showed it
       * again. Found by driving. The PUBLISHING subcommands carry
       * `requiresPublisher` for themselves, so opening the read to
       * everyone opens nothing else.
       */
      "platform/cmd/system/press.yaml",
      "platform/cmd/system/clear.yaml",
      "platform/cmd/system/affordances.yaml",
      "platform/cmd/author/player.yaml",
      /*
       * ⭐⭐⭐ **The reading ladder, and all three verbs are the body's.**
       *
       * `analyze` was always here. `measure` joins it, and that LIFTS a
       * doctrine line (`command-routing.md` — *nothing should ever put
       * `measure` on a body*). The reason is the refusal:
       *
       *   > `measure light` carrying nothing must answer *"you have
       *   > nothing in reach that could read that"*. An UNAFFORDED verb
       *   > can only answer *unknown command*, and an unknown command
       *   > cannot name what is missing.
       *
       * The gate moved from the verb to the CHANNEL, where the refusal
       * can name the route — which is the retire-conferral doctrine in
       * the instrument register: the verb is global and the OUTCOME is
       * graduated. A vanishing verb teaches nothing.
       *
       * `readings` is the self-view of the whole ladder: every channel,
       * every rung, whether it is open to you, and what knowing it is
       * worth. Bands and prose only, never a number about a person.
       */
      "platform/cmd/perception/analyze.yaml",
      "platform/cmd/perception/measure.yaml",
      "platform/cmd/perception/readings.yaml",
      // ⭐ Taking a piece of something is an act anybody can do with
      // their hands. What it costs is the carrying and the judgement of
      // WHICH piece — never a permission and never a tool.
      "platform/cmd/inventory/sample.yaml",
      // The engine's own diagnostics, beside `affordances` and `errors`
      // where they belong — `trace` is not a reading.
      "platform/cmd/system/trace.yaml",
      "platform/cmd/social/subject.yaml",
      "platform/cmd/shell/script.yaml",
      // The record layer's retrieval verb. It lives on Avatar rather
      // than on a mixin because its subject IS the durable player
      // identity — `recall --scope frames` reads a store keyed on
      // `playerId`, which nothing without one has.
      "platform/cmd/shell/recall.yaml",
      "platform/cmd/stream/watch.yaml",
      "platform/cmd/stream/tune.yaml",
      "platform/cmd/crafting/make.yaml",
    ],
    peers: [],
    environment: [],
  };

  /**
   * Instruction field — the avatar's *durable spawn/recall reference*.
   * Sibling to the `container` instruction (from `ContainableMixin`) but
   * distinct: it holds a singleton room **or a Warren**, and resolves at
   * hydration via `applyStartLocation`. Only avatars have a
   * spawn/recall location, so it lives directly here (no mixin). The
   * applier's Phase 2 auto-dispatches any declared instruction field, so
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
   *
   * ⭐⭐ `playerId` is declared here, once, for the whole family.
   * Declared (rather than merely held) so a clone's `dataOverlay` can
   * land it: hydration Phase 1 runs BEFORE `onCreate`, which is
   * exactly the ordering the two vessels' private copies
   * (`shadePlayerId`, `wirePlayerId`) existed to guarantee — and the
   * reason each then overrode `getPlayerId()` to undo its own copy and
   * `getIdentityPath()` to rebuild the same string.
   *
   * ⚠ A key no composed field declares is discarded by the applier
   * SILENTLY; `lint:instanceable` invariant 12 is what counts them.
   *
   * ⭐ `escheatedAt` and `beneficiary` are NOT here. They are the
   * estate's own succession state and live on `EstateMixin`, which is
   * the mixin that behaves on them — composing it now claims *this
   * host's goods can escheat and pass to a beneficiary*, which is
   * true of its one composer and of nothing else.
   */
  static fieldMeta: FieldMeta = {
    // ⭐ ONE playerId for the whole family — see the note above.
    playerId: { persistent: true, runtimeState: true },
    mortalArc: { persistent: true },
    lastSeen: { persistent: true },
    startLocation: { instruction: true },
  };

  /**
   * Epoch ms of this character's last logout, or 0 for never-played.
   *
   * ⭐ The cheap field the character-select screen was starved for, and
   * the prerequisite for the "since you left" digest — which is derived
   * across the ledgers *since this instant*, so without it there is no
   * window to derive over.
   *
   * Stamped on logout rather than continuously: "when did I last put
   * this character down" is the question the roster asks, and a
   * heartbeat-updated field would answer a different one while costing
   * a write per tick.
   *
   * Public because the `TemplateApplier` reflects into persistent fields by
   * name; other Stuff use `getLastSeen` / `markSeen`.
   */
  public lastSeen: number = 0;

  /** Epoch ms of the last logout, or `undefined` if never played. */
  public getLastSeen(): number | undefined {
    return this.lastSeen > 0 ? this.lastSeen : undefined;
  }

  /**
   * Stamp the logout instant. Called by the connection teardown, which
   * is the one moment that means "this character was put down".
   */
  public markSeen(at: number): void {
    this.lastSeen = at;
  }

  /**
   * ⭐ **The live standing figures**, as subscribable data rather than
   * prose.
   *
   * ⚠ **Your trait position is deliberately NOT here.** The engine
   * derives it, and a pinnable "your most pronounced trait right now"
   * widget would be a stat sheet of your own personality — which the
   * psychology slate calls the *unrealistic* feature, and which would
   * foreclose the vocation it is designed around: **you cannot read
   * yourself; another person can.** Keeping traits off the live
   * dashboard is what keeps that buildable without retrofitting a
   * permission model later.
   *
   * (The `traits` and `score` verbs DO self-report today. That is a
   * pre-existing product decision and its own conversation — this
   * build simply declines to make it worse.)
   *
   * Every one of these is already reachable — `score` reports the lot,
   * and `StandingController` calls the same Apis. What did not exist
   * was a way to get them to a client as *numbers*: they shipped as MML
   * inside a scene frame, so a shelf widget would have had to re-parse
   * a sentence. These descriptors are the structured path.
   *
   * **Declared here rather than on a mixin.** `lib/renown/`,
   * `lib/influence/` and `lib/participation/` hold no mixins at all —
   * those subsystems are Api + logic singleton + collection. Minting a
   * `StandingMixin` for five fields on one class would be the
   * per-feature minting the conventions warn against; if a second host
   * ever needs them, that is when it becomes a mixin.
   *
   * **Self-only.** These resolve for the subscriber's own identity.
   * Reading someone *else's* standing already has a surface with a
   * redaction model — the `profile` verb — and a second copy of those
   * rules on a subscription is how two copies drift.
   *
   * ⚠ **These re-resolve through `durableKey`, not `changes`.** An
   * earlier cut declared `changes: [{ on: SomeAppendedEvent, by:
   * 'subject' }]` — which **never fired at all**: the index registers a
   * non-`target`/`field` source under the value `null`, while
   * `routeFire` looks up `payload['subject']`, so the tuple could never
   * match. Standing keys on the durable `templatePath` and the bus
   * indexes live `stuffId`s; the two cannot meet.
   *
   * `durableKey` is the seam that closes it, and it is a **direct poke
   * from the ledger, not a broadcast** — one known producer, one known
   * consumer. See {@link MqlSubscriptionApi.notifyDurableSubject}.
   */
  static subscribableFields: SubscribableFieldDescriptor[] = [
    {
      name: 'playStanding',
      read: (stuff, viewer) => {
        const key = standingSubject(stuff, viewer);
        if (!key) return undefined;
        // The wire carries a band NAME, not a serialized value object.
        // `Band`'s one public member is `name`, so `JSON.stringify`
        // would emit `{band: {name}}` — a shape nobody designed and no
        // test asserts as a contract. `practisingCompetence` already
        // puts its band on the wire as a plain string; this matches it.
        return { band: InfluenceApi.bandOf(key, 'consumer').name };
      },
      durableKey: (stuff) => stuff.getIdentityPath() ?? undefined,
    },
    {
      /**
       * *Make* is an **account-level** stock (`STOCK_LEVEL`): it is
       * something the person does, not the character.
       *
       * ⚠ Read through `standingForHost`, the shared seam — NOT through
       * a local aggregation. Deriving one here would put a formula in a
       * concrete class, which is where the previous attempt went wrong:
       * it made the dashboard disagree with `standing` and `profile`.
       * The account roll-up now lives behind that seam, so all three
       * surfaces report the same figure by construction.
       */
      name: 'makeStanding',
      read: (stuff, viewer) => {
        if (!standingSubject(stuff, viewer)) return undefined;
        // ⭐ `undefined` when the account cannot be resolved, so
        // `projectFields` OMITS the field and the client hatches it —
        // the same "never measured vs measured at zero" distinction
        // `renown` draws below. Substituting the per-character figure
        // here is exactly the silent downgrade this roll-up replaced.
        const standing = InfluenceApi.standingForHost(stuff, 'producer');
        if (!standing) return undefined;
        // Band NAME on the wire, as `playStanding` — see there.
        return { band: standing.band.name };
      },
      durableKey: (stuff) => stuff.getIdentityPath() ?? undefined,
    },
    {
      name: 'renown',
      read: (stuff, viewer) => {
        const key = standingSubject(stuff, viewer);
        if (!key) return undefined;
        // ⭐ `measuredRenownOf`, not `renownOf`: an unmaterialized scope
        // returns `undefined` and `projectFields` omits the field, so
        // the client can tell "never measured" from "measured at zero".
        // `renownOf`'s neutral `?? 0` is right for arithmetic and a
        // fabricated answer for a display surface.
        const value = RenownApi.measuredRenownOf(key);
        if (value === undefined) return undefined;
        return { value };
      },
      durableKey: (stuff) => stuff.getIdentityPath() ?? undefined,
    },
  ];

  /**
   * The identity's death-arc position, or `null` while embodied and alive.
   *
   * Written only by the death choreography and cleared only by
   * re-embodiment. Public because the `TemplateApplier` reflects into persistent
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
   *
   * ⚠ `wiki.spoilerAppetite` sits here for a MECHANICAL reason, not a
   * conceptual one: the schema walk is over the host's prototype chain,
   * and the wiki adds no mixin (D7 withdrew `DocumentedMixin`), so
   * there is no other layer on an Avatar to hang it from. It is a
   * READER PREFERENCE — how much of a thing you would rather find out
   * for yourself — not a wiki field on a game model, and it stores
   * nothing about any page. A future reader-preferences mixin should
   * take it, and Avatar should compose that.
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
    {
      key: "wiki.spoilerAppetite",
      type: SettingTypes.Number,
      default: 0,
      description:
        "How much revealed content you want shown outright when " +
        "reading the wiki (0 = only what is open; 3 = everything you " +
        "are entitled to). Content ABOVE this but within your reach " +
        "still arrives — collapsed, so you choose. Content beyond " +
        "your reach is never sent at all, and this setting cannot " +
        "change that.",
      validator: (value: unknown) =>
        typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3
          ? true
          : "spoiler appetite must be an integer from 0 to 3",
    },
  ];

  /**
   * Template path prefix for avatars in the domain collection.
   * Avatar templates live at `/platform/agent/Avatar/<playerId>` — instances
   * of a class share the same `/platform/<branch>/<ClassName>` namespace as
   * singleton templates of that class (`/platform/idea/EventRegistry`),
   * with a per-instance suffix.
   */
  static readonly TEMPLATE_PATH_PREFIX = TemplatePathPrefixes.avatar;

  /**
   * ⭐⭐ Where this FAMILY's minted identities live. Declared on the
   * abstract root, so `PrimaryAvatar`, the anonymous guest and the
   * sandbox wire body all inherit the claim without saying anything,
   * and `StuffApi.clone` refuses an `asIdentityPath` outside it.
   *
   * This is the **continuity** pattern and it points the opposite way
   * from individuation: many lineages wear ONE identity here, so
   * nothing about the identity's shape can be derived from the row —
   * the family has to declare it, and a typo in the prefix would file a
   * person somewhere no ledger will ever look. `ShadeAvatar` owns a
   * different prefix and declares its own, shadowing this.
   *
   * ⚠ Not the same string as a template row: nothing is cloned FROM
   * `/platform/agent/Avatar/`, and `findAllByTemplatePath` of it
   * correctly returns nothing. `PlayerApi`'s roster is what answers
   * *every avatar*.
   */
  // ⚠ Widened to `string`, not left on the inferred literal. A pinned
  // literal here makes `ShadeAvatar`'s own declaration an incompatible
  // static override and breaks the class chain — the same failure the
  // `_mixinName` statics are widened for. A family's namespace is
  // overridable by definition, so the type has to say so.
  static readonly identityNamespace: string = TemplatePathPrefixes.avatar;

  static getTemplatePath(playerId: string): string {
    return `${this.TEMPLATE_PATH_PREFIX}${playerId}`;
  }

  /**
   * Runtime-only pointer to the owning User. Stamped by `onCreate`
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
   * The account this body belongs to, for account-level standing
   * (`AccountScoped`). `undefined` when there is no `User` in hand.
   *
   * ⭐ **`undefined` is a real answer and must stay one.** The `user`
   * slot is runtime-only and unpersisted, so an unowned body — a guest,
   * a seed, a clone nobody has played — genuinely has no account. An
   * earlier attempt at the account roll-up read this same slot and,
   * finding it unset, silently fell back to the per-character figure;
   * the caller then rendered a per-character number under an
   * account-level label. Returning `undefined` is what makes that
   * failure visible instead of plausible. See
   * `InfluenceApi.standingForHost`.
   *
   * Members are the durable `/platform/agent/Avatar/<playerId>` subject keys the
   * standing ledgers are stored under — NOT live objects, so a character
   * that is offline (or has never been loaded) still contributes.
   */
  public getAccountSubjects(): AccountSubjects | undefined {
    const user = this.user;
    if (!user) return undefined;
    const ids = user.playerIds ?? [];
    if (!ids.length) return undefined;
    return {
      subject: `account:${String(user._id ?? '')}`,
      members: ids.map((id) => Avatar.getTemplatePath(id)),
    };
  }

  /**
   * Character slot id (key under `/platform/agent/Avatar/<playerId>` and in `User.playerIds`).
   *
   * ⭐ Public because the applier reflects into persistent fields by
   * name; external readers still use `getPlayerId()` (the inter-Stuff
   * contract is methods). Landed from a clone overlay before
   * `onCreate`, or stamped there from the context.
   */
  public playerId: string = "";
  public override getPlayerId(): string {
    return this.playerId;
  }
  public setPlayerId(value: string): void {
    this.playerId = value;
  }

  /**
   * ⭐⭐ The identity thread, for the whole family and in one place.
   *
   * Every body belonging to a player answers under
   * `/platform/agent/Avatar/<playerId>`, so a deed done as a shade or
   * inside a circle attributes to the person, not to the vessel. The
   * two vessels each carried their own copy of this before, over their
   * own copy of the field.
   *
   * ⚠ The class is lineage and the identity path is identity: this is
   * NOT the template stamp. A shade keeps its own
   * `/platform/agent/ShadeAvatar/<pid>` template path, so
   * `findByTemplatePath` still tells the bodies apart.
   *
   * Falls through for a guest (`playerId === ''`) to whatever minted
   * path it was given, exactly as before.
   *
   * ⭐ This is also what makes the sandbox **wire body**'s projection
   * work, and it is the only thing that does: `SandboxAvatar` adds no
   * override of its own, so the ledgers read this. Until 2026-10-04 the
   * wire body was additionally STAMPED with the player's identity,
   * which filed it in the player's own registry bucket beside the
   * parked field body — a collision the index forbids. Removing the
   * stamp was safe precisely because this override was already here.
   */
  public override getIdentityPath(): string | null {
    return this.playerId
      ? Avatar.getTemplatePath(this.playerId)
      : super.getIdentityPath();
  }

  /**
   * Anonymous-guest marker. Runtime-only (NOT persisted — guests never
   * save). Stamped in `onCreate` from the clone context. This is the
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
   * Stamp the runtime-only references a clone's context carries.
   *
   * ⚠ Each only when GIVEN. An overlay-borne `playerId` — the two
   * vessels' mint path — lands in hydration Phase 1, before any
   * `onCreate` runs, and an absent context key must not overwrite
   * it.
   */
  protected stampContext(context?: AvatarInitContext): void {
    if (context?.user) this.user = context.user;
    if (context?.playerId) this.playerId = context.playerId;
    if (context?.isGuest) this.isGuest = true;
  }

  /**
   * Reach the framework's `onCreate` chain.
   *
   * ⭐ A named seam, and it earns its name: the body of record runs a
   * materially different `onCreate` sequence — it claims the
   * registry slot and drives the persistence spine around the chain —
   * so it cannot call `super.onCreate()` without also re-running
   * this class's. This is how it reaches the chain on its own terms.
   */
  protected async chainOnCreate(
    context?: AvatarInitContext,
  ): Promise<void> {
    await super.onCreate(context);
  }

  /**
   * Bring a body into being.
   *
   * ⭐ The VESSEL sequence, and the honest default: a shade and a
   * circle body are always newly made. They have no record to restore
   * — `shouldPersist()` is false for both — so the born-with floor
   * installs unconditionally and there is no spine to drive.
   *
   * ⚠ The floor is not optional for a vessel. `installDefaultLoadout`
   * is what puts the aether implant in the cranial slot, and without
   * it a player inside their own circle can *receive* a channel
   * message and cannot send one.
   *
   * The body of record overrides this entirely — see its own
   * `onCreate`, which is the only place registration and the
   * snapshot live.
   */
  public override async onCreate(
    context?: AvatarInitContext,
  ): Promise<void> {
    this.stampContext(context);
    await this.installDefaultLoadout();
    await this.chainOnCreate(context);
    // Schedules are never persisted, so a body re-books its reminders.
    // A no-op for a body with no entries, which is every vessel today.
    this.rescheduleCalendarPing();
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
    await PersistableApi.capture(this, this.getIdentityPath() ?? undefined);
  }

  /**
   * Re-hydrate this Avatar's in-memory state from its persistence-spine
   * record. Operates on the existing live instance, preserving identity /
   * stuffId / connected Interactives.
   *
   * v1: developer/admin operation — no multi-connection synchronization,
   * and intended for a **fresh** instance (the normal login path
   * materializes via `onCreate`; re-running `restore()` on a live
   * avatar that already holds inventory would re-clone the captured items on
   * top). Should not be invoked during the initial clone cascade.
   */
  public async restore(): Promise<void> {
    await PersistableApi.materialize(this, this.getIdentityPath() ?? undefined);
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
   * installed in `onCreate`. Both run before `enter` fires.
   *
   * **One call per session-start, not per connection.** When a second
   * Interactive multiplexes onto an already-playing Avatar,
   * `ConnectionApi.transfer` adds it to the avatar's `interactives`
   * set directly — `enter` is NOT re-invoked. The two unguarded
   * idempotency-sensitive steps here (welcome scene, PlayerLoggedIn
   * emit) would double-fire if a caller did re-invoke; treat the
   * method as session-start-only.
   */
  /**
   * ⭐ Session-start ceremony, as the sequence it is.
   *
   * Eight named steps in the order they have always run. The body of
   * this method is now the ORDER — which is the part that is load-
   * bearing and was previously buried in 190 lines — and each step
   * says in its own name what it is for.
   *
   * ⚠ The order is not arbitrary. The arrangement opens AFTER the
   * auto-sense, so the room card lands beside a transcript that
   * already says where you are; the welcome goes out before either,
   * because the client cannot render anything until it has the
   * bootstrap payload.
   */
  public async enter(
    interactive: Interactive,
    opts: { firstArrival?: boolean } = {},
  ): Promise<void> {
    const startingLocation = this.assertStartingLocation();
    this.armSession();
    // ⭐⭐ **No belief read here, and its absence is proved rather than
    // assumed.** This used to call `hydrateBeliefs()`, from before the
    // belief store had a declared source. Since 2026-10-01
    // `BeliefStoreMixin` declares a `hydrationSource` that the CLONE
    // PIPELINE drives at mint, so a body arrives already remembering —
    // and the map is cleared ONLY on destruct, so a body `enter` gets
    // without a fresh mint (multiplexing, a reconnect) still holds it.
    // Pinned as three separate facts in
    // `lib/belief/__tests__/entryPoints.test.ts`, because ⚠ the failure
    // mode if that is wrong is silent: `adjustRegard` is a
    // read-modify-write with a write-through, so an unfilled map
    // overwrites a stored regard with a value derived from zero.
    await this.recordFirstArrival(startingLocation);
    const payload = await this.buildWelcomePayload(interactive);
    this.sendWelcome(payload, opts.firstArrival === true);
    // Force a sense so the player perceives where they are across every
    // channel they possess — MobileMixin's auto-sense-on-arrival path,
    // reused rather than re-rendering the description here.
    await this.autoSenseOnArrival();
    this.openArrangementGuarded(interactive);
    this.markSessionStarted(interactive);
  }

  /**
   * The spawn a session needs, or an error that says how to fix the
   * content. A body with no container cannot be entered into anything.
   */
  private assertStartingLocation(): NonNullable<
    ReturnType<Avatar['getContainer']>
  > {
    const startingLocation = this.getContainer();
    if (!startingLocation) {
      throw new Error(
        `Avatar.enter: ${this.getFullName()} has no container. ` +
          `The avatar seed must declare a spawn via 'data.startLocation' ` +
          `(a room or a Warren) or 'data.container'; the seed at ` +
          `the '/platform/agent/PrimaryAvatar' row sets the default the ` +
          `embody/guest ` +
          `overlay clones from (no per-player template row exists).`,
      );
    }
    console.info(
      `Avatar.enter: ${this.getFullName()} in ${startingLocation.getPresentation()}`,
    );

    return startingLocation;
  }

  /**
   * Arm the session's own machinery: the periodic save, and the
   * casting affordance, which is species-fixed in-session so once at
   * enter suffices.
   */
  private armSession(): void {
    this.startAutoSave();

    // Reconcile the casting affordance (the dynamic `cast`/`spells`
    // self-push — a gated mixin can't afford selectively through static
    // contributions; the refreshConferrals mirror). Species-fixed
    // in-session, so once at enter suffices.
    this.refreshCastingAffordance();
  }

  /** Mint the once-ever first-arrival deed. */
  private async recordFirstArrival(
    startingLocation: NonNullable<ReturnType<Avatar['getContainer']>>,
  ): Promise<void> {
    // First-arrival deed — minted once, ever. Called unconditionally
    // (not gated on `opts.firstArrival`): the greeting flag only selects
    // prose, while the `recordOnce` key is the dedup authority, so the
    // first ever arrival mints and every re-login `enter` no-ops.
    // `startingLocation` is non-null here (the throw above guarantees it).
    await this.recordChronicleOnce("first-arrival", {
      kind: "deed",
      template: "Arrived at {{ place | location }}.",
      vars: { place: startingLocation },
      where: startingLocation.getIdentityPath() ?? null,
      tags: ["arrival"],
    });
  }

  /**
   * Everything the client needs to draw a session it has just joined.
   * Pure assembly — no sends, no mutation.
   */
  private async buildWelcomePayload(
    interactive: Interactive,
  ): Promise<ConnectionEstablishedPayload> {
    // Welcome scene: actor frame at session.link
    // carries the bootstrap payload the client needs.
    // Welcome is the introductory moment — explicitly the formal
    // register, so reach for fullName.
    const catalogue = StuffApi.findByTemplatePath<TopicCatalogue>(
      "/platform/idea/TopicCatalogue",
    );
    const portraitUrl = await this.getPortraitUrl();
    /*
     * ⭐ The record layer's backfill — what this player was told, from
     * the server rather than from whatever this device happens to have
     * in memory. Rides the welcome payload for the same reason
     * `releaseWindow` does: it is a snapshot the client seeds a surface
     * from, not a live channel, and a separate envelope would cost a
     * round trip to say the same thing.
     *
     * ⚠ The read is owner-derived, never owner-parameterised, so the
     * call has to say WHO is acting — and `enter` runs outside any
     * command frame. `RecordApi.backfill` opens that frame inside the
     * Api tier, because only framework files may push or tag one; a
     * `runRoot` here is refused, correctly, by the guard that stops
     * mudlib code from claiming to be somebody.
     */
    const frameBackfill = await RecordApi.backfill(this);
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

      // Which topics are reactable, so the client stops keeping its own
      // copy of the answer. Its copy had already drifted — `act.combat`
      // is reactable and was never offered.
      reactableTopics: [...ReactionApi.REACTABLE_TOPICS],
      // The live news-ticker window (pins-first, recency-ordered, already
      // retract/expiry-filtered + length-capped by the PressBoard). The
      // client seeds its feed card from this as a `snapshot`, exactly as it
      // caches `topicCatalogue`; live deltas ride `publication.press`.
      releaseWindow: PressApi.recent().map((b) => PressApi.toRow(b)),
      ...(frameBackfill.length > 0 ? { frameBackfill } : {}),
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
      /*
       * ⭐ BOTH answers, resolved through the per-form-factor rung. The
       * server cannot know a viewport, so it ships what each width
       * would resolve to and the client picks — the `cockpit.shelf`
       * split, restated for a setting rather than a list.
       */
      resultDisplay: {
        desktop:
          ShellApi.resolveSetting<ResultDisplay>(
            this,
            "shell.result",
            "desktop",
          ) ?? "card",
        mobile:
          ShellApi.resolveSetting<ResultDisplay>(
            this,
            "shell.result",
            "mobile",
          ) ?? "card",
      },
    };
    return payload;
  }

  /** The greeting frame, in the register the arrival deserves. */
  private sendWelcome(
    payload: ConnectionEstablishedPayload,
    firstArrival: boolean,
  ): void {
    // First arrival (just created in char-gen) gets a fresh greeting;
    // a returning player gets the welcome-back register.
    const greeting = firstArrival
      ? Mml.compose`Welcome, ${this.getFullName()}.`
      : Mml.compose`Welcome back, ${this.getFullName()}!`;
    MessageApi.scene(this)
      .topic("session.link")
      .toSelf(greeting)
      .payload(payload)
      .send();
  }

  /**
   * Open the active mode's arrangement for a freshly-attached session.
   */
  private openArrangementGuarded(interactive: Interactive): void {
    /*
     * ⭐⭐ **Apply the mode's arrangement on LOGIN, not only on a
     * mode or layout switch.**
     *
     * `applyArrangement` was called from those two controllers alone,
     * which meant a player who logged straight into `build` — or into
     * any mode they had already saved — saw an empty feed until they
     * switched modes and switched back. An arrangement that only
     * applies when you change your mind is a workspace you cannot
     * simply return to.
     *
     * ⚠ After `autoSenseOnArrival`, so the room card the arrangement
     * pushes lands beside a transcript that already says where you are.
     */
    /*
     * ⚠ Guarded, and the guard is the point: **a session must never
     * fail because a workspace convenience could not open.** The cost
     * of being wrong here is a missing card the player can re-open with
     * one command; the cost of letting it throw is a player who cannot
     * log in at all.
     */
    try {
      this.openArrangement(interactive);
    } catch (err) {
      console.warn(
        `Avatar.enter: could not apply the ${this.getPlayerId()} ` +
          `arrangement: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Mark the session live and tell the world — the last step, because
   * everything above it can still fail.
   */
  private markSessionStarted(interactive: Interactive): void {
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
    // ⭐ The estate touch on a RETURN (economic bootstrap D16/D17): unclaimed
    // property reclaimed, or seats held past the short clock vacated.
    // Fire-and-forget — a login never waits on the ledger. A reconnect to
    // a body that lingered counts too: the clock ran while nobody was on
    // the socket, and the touch is idempotent.
    if (!this.isGuest) {
      const key = this.getIdentityPath();
      if (key) {
        void PlayerApi.touchEstate(key, { returning: true }).catch((err) =>
          console.warn(`Avatar.enter: the estate touch failed for ${key}: ${String(err)}`),
        );
      }
    }
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
   * `onCreate`, runs once per clone (every login, since the runtime
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
  protected async installDefaultLoadout(): Promise<void> {
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
            // EquipController). Move it in FIRST so it travels with the
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
      // ⭐ The personal calendar surface (D12) — beside comms/forums/wallet,
      // re-provisioned every login exactly as they are.
      const calendar = await StuffApi.clone<CalendarUpdate>(
        CalendarUpdate.TEMPLATE_PATH,
      );
      this.hostUpdate(calendar);
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
    /*
     * ⭐⭐ **The record layer's one producer.**
     *
     * The frame is retained HERE — above the multiplex, below
     * `filterMessage` — which is the only point in the system that is
     * reached exactly once per *delivery to a player*. A tap on the
     * socket write would record twice for someone on two devices; a tap
     * further up would record frames the recipient's sensorium dropped.
     *
     * ⚠ It is also reached when the avatar is linkdead (the loop below
     * is a no-op then), which is correct: a frame delivered while you
     * were disconnected is still a frame you were told, and it is
     * waiting when you come back.
     *
     * ⚠ Guests are skipped deliberately. A guest body is reaped when its
     * connection drops and can never reconnect, so its rows would never
     * be read — and because every guest is a NEW owner key, the
     * per-owner window that bounds everyone else would never bound them.
     * That is an unbounded set of small leaks, not a bounded one.
     */
    if (!this.getIsGuest()) RecordApi.record(this, frame);
    /*
     * ⭐⭐ **Feed routing, decided here and stamped on the frame.**
     *
     * One stream, several destinations, an ordered per-player table:
     * first match wins for a `move`, a `copy` routes and keeps going.
     * The predicates read the topic's FACETS, which live on the
     * server's catalogue — so the frame arrives already knowing where
     * it belongs and the client never re-derives a rule. Two evaluators
     * disagree the first time one of them changes, and nothing about
     * the disagreement is visible until somebody's message is in the
     * wrong tab.
     *
     * ⚠ Stamped per-RECIPIENT, because the table is per-player: the
     * frame object itself is shared across an audience, so a copy is
     * made rather than mutated. `sendMessageToInteractive` already
     * copies to stamp `frameId`, so this adds one shallow spread per
     * delivery, not per socket.
     */
    const routed: MessageFrame = {
      ...frame,
      meta: {
        ...frame.meta,
        feeds: MessageApi.feedsFor(frame.topic, this.getRoutingRules()),
      },
    };
    for (const interactive of forwardingTargets(this)) {
      interactive.sendMessage(routed);
    }
  }

  /**
   * This player's routing table, as stored on `console.routing`.
   *
   * ⚠⚠ **The undeletable catch-all is NOT here.** It is appended by the
   * evaluator, so it cannot be edited away by writing the clientState
   * key directly. *Every frame must land somewhere* is an invariant,
   * not a default a client gets to overwrite.
   *
   * A player who has never touched routing gets {@link DEFAULT_ROUTING},
   * whose copy-to-Attention rule ships **on** — a convenience on a
   * desktop, where the frame is in World anyway, and the safety net on
   * a phone, where World may not be the feed you are looking at.
   */
  public getRoutingRules(): readonly RoutingRule[] {
    const raw = this.getClientState(ROUTING_STATE_KEY);
    return Array.isArray(raw) ? (raw as RoutingRule[]) : DEFAULT_ROUTING;
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
      interactive.sendEnvelope(envelope);
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
    void this.evictAndFlushBeliefs().catch((err) => {
      console.error(
        `Avatar.onDestruct: belief flush failed for playerId=${this.playerId}:`,
        err,
      );
    });

    this.stopAutoSave();
    PlayerApi.unregisterAvatar(this);
    // Snapshot — detach() mutates the underlying set via removeInteractive.
    for (const interactive of [...this.interactives]) {
      interactive.detach();
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
    // ⭐ Stamp `lastSeen` on EITHER path. A network drop is still the
    // last moment this character was in the world, and the roster's
    // question ("when did I last play them") does not care whether the
    // player meant to leave. Stamping only the deliberate path would
    // leave every crashed session reading as never-played.
    // Wall clock, not game time: "when did I last play them" is a
    // real-world question the character-select screen asks before the
    // world clock is even relevant to the reader.
    this.markSeen(Date.now());

    if (this.leaveIntent) {
      this.leaveIntent = false;
      this.sessionActive = false;
      EventApi.emit(Events.PlayerLoggedOut, { playerId: this.playerId });
    } else {
      EventApi.emit(Events.PlayerDisconnected, { playerId: this.playerId });
    }
    // Persist the stamp; a save failure must not break teardown.
    this.save().catch(() => undefined);
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
   * Presentation slice: what a wire body needs so the person is
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

  /**
   * ⭐ Map-keeping is {@link CartographerMixin}'s, not this class's —
   * ~220 lines of conversion lived here and did not belong. What stays
   * is the one fact only the Avatar family can answer: **whether this
   * body has anywhere durable to file a map.**
   *
   * A wire body persists nothing (a circle's geography is not real
   * geography, and must not be written onto the person wearing the
   * body), and a guest is a throwaway persona with no `/home` branch.
   * Both already answer `shouldPersist() → false`, so this reads an
   * existing honest fact rather than inventing a second one.
   *
   * ⚠ `super.keepsMaps()` first, and not because an Avatar could fail
   * it — every Avatar has a minted identity, so the mixin's floor
   * (*is there a durable handle to file under*) is always true here.
   * It is in the chain so the override READS as what it is: the
   * family's extra condition on top of the capability's own, rather
   * than a replacement that would silently drop the floor if the
   * family's answer ever stopped implying it.
   *
   * ⚠ The `map` VERB stays on this class's `commandContributions`, and
   * deliberately: reading a map is a PLAYER's affordance (the document
   * is under `/home/<key>`, and NPCs do not type), while keeping one is
   * a capability. An NPC guide composes the mixin and gets no verb it
   * could never use.
   */
  public override keepsMaps(): boolean {
    return (
      super.keepsMaps() && this.shouldPersist() && !this.getIsGuest()
    );
  }

  public toString(): string {
    return `[Avatar ${this.fullName} playerId=${this.playerId}]`;
  }
}
