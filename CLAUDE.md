# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repo.

This file is the orientation doc + the load-bearing project rules.
Subsystem detail lives in `docs/`.

## Project Overview

Saxonberg 2.0 — an immersive multiplayer role-playing educational
platform. TypeScript across the stack within a `pnpm` monorepo
(`packages/server`, `packages/client`, `packages/types`). For the
product vision see [docs/vision.md](./docs/vision.md).

## Documentation Map

The `docs/` tree is the source of truth for architecture and subsystem
behavior. Read the relevant doc before editing in its area.

- [docs/architecture.md](./docs/architecture.md) — three-layer
  architecture, Manager vs Api, mixin organization, file structure
- [docs/antipatterns.md](./docs/antipatterns.md) — patterns to avoid,
  with the correct alternative for each (lookup-table style)
- [docs/ref-shapes.md](./docs/ref-shapes.md) — three reference shapes
  for fields pointing at other Stuff (Pattern A path-string for
  singletons, Pattern B live ref for within-session instances,
  Pattern C resolve-on-read for cross-scope singletons), the
  R2.1–R2.4 cleanup rules for live-ref fields, method-surface
  conventions, exemplars, antipatterns
- [docs/vision.md](./docs/vision.md) — product vision
- [docs/roadmap.md](./docs/roadmap.md) — what's left to build
- [docs/deployment.md](./docs/deployment.md) — deployment & infra:
  single Lightsail box + Caddy/Let's Encrypt + Mongo Atlas, GitLab CI
  (validate + Pages; deploy at standup), config via SSM Parameter Store
  (deploy-time materialization, local stays `.env`), cost model, the
  AWS cleanup record, and the one-time standup runbook
- [docs/workflow.md](./docs/workflow.md) — feature-cycle process:
  slate → requirements → plan → build → MR iteration → pre-merge
  sweep → merge. Defines the artifact taxonomy
  (slate/requirements/plan/subsystem), their lifetimes, and the
  retirement rules at sweep time. Skills under `.claude/skills/`
  (`/requirements`, `/mr-iterate`, `/finalize`) are thin entry
  points to phases of this loop.
- [docs/mql-grammar.md](./docs/mql-grammar.md) — MQL grammar
  reference for players / authors writing queries (seeds, chain
  operators, filters, pronouns, examples)
- Subsystem references in `docs/subsystems/`:
  - [templates.md](./docs/subsystems/templates.md) — clone pipeline,
    Hydrator, TemplateApi, folder/leaf invariant, declarative
    `populates:` / `container:` instruction fields and their Phase 2
    appliers, `TemplateApi.snapshotToTemplate` /
    `restoreFromTemplate` persist-back surface
  - [persistence.md](./docs/subsystems/persistence.md) — the `Document`
    base (plain records, not Stuff) vs Templates→Stuff,
    PersistenceManager, around-save/delete hooks. Collections:
    `users` / `google_profiles` / `domain` (Templates) plus
    `emotes` / `groups` / `channels` (social-cluster Documents);
    `Template.findByPaths` for abstract-Template bulk-by-path
    lookup that wouldn't fit the inherited `find` generic.
  - [lifecycle.md](./docs/subsystems/lifecycle.md) — create/destroy
    choreography, construction sentinel, prepareDestroy
  - [state-model.md](./docs/subsystems/state-model.md) — what gets
    persisted, Avatar self-contained (v1 persist-back through
    `Avatar.save()` / `Avatar.restore()`), the `Document` track for
    auth/meta records
  - [connection.md](./docs/subsystems/connection.md) — login/logout
    flow, WebSocket upgrade, `Interactive`/`Login`/`Avatar` handoff,
    `Login.enter` (connection routing) + `Avatar.enter` (session
    start, including autosave install), multiplexing, disconnect
    choreography
  - [messaging.md](./docs/subsystems/messaging.md) — MML, Scene
    composer, sensor routing, MudlogApi, `MarkupAugmenter` pipeline
    (`augmentMarkup` + `MixinApi.getAllMarkupAugmenters` walker;
    the substrate `VisibleMixin.getMarkupLong(viewer)` runs to wrap
    `<detail>` etc. inline), VocalMixin + AetherMixin + SoulMixin
    capability split (acoustic / ESP-transport / expressive).
    `VocalMixin.say` gains optional `target?` for `--to` rendering;
    `whisper` / `shout` extend the acoustic family with per-method
    `meta.acousticDb` stamps. `AetherMixin.tell` collapses to a
    single `tell(target: Stuff | readonly Stuff[], text, opts?)`
    surface — multi-target stamps `payload.recipients` and (when
    chat-backed) `meta.channelId`. Topic strings emit as dotted
    literals; the `MessageApi.Topics` constant tree was retired in
    favor of the TopicCatalogue YAML source of truth.
    `Scene.meta(partial)` chain stamps additional non-modality meta
    (`acousticDb`, `channelId`).
  - [message-rendering.md](./docs/subsystems/message-rendering.md) —
    end-to-end rendering substrate. Server: MML semantic core
    extensions (`<chan>` / `<msg>` / `<player>` / `<npc>` /
    `<mention>` / `<link>` + emphasis subset), `Mml.flatten` vs
    `Mml.stripTags`, `Mml.markdownToMml` Discord-dialect parser,
    `MentionResolver` factories, custom URI schemes (`mudcmd:` /
    `mudref:` / `mudq:`), `api/mml/` module isolation rule,
    `AetherMixin` for non-acoustic transport. Client: `parseMml`
    nested-aware parser, `MmlRenderer` tree → React, per-message-type
    templates (chat / say / tell / emote / default), stylesheet
    engine (5 selector kinds, theme + overlay + plain-mode cascade),
    default + high-contrast themes, `BucketResolver` friend/foe stub,
    `style` verb on `HasInteractiveMixin.clientState['style.overlay']`,
    `client-state-update` outbound push wire + strategy-injection
    pattern.
  - [topics.md](./docs/subsystems/topics.md) — per-topic authored
    descriptors as `Topic` template docs under `/lib/messaging/Topic/`,
    `TopicCatalogue` singleton in `obj/`, three-tier resolution
    (cache hit → family-inherited → derived default), session-
    establish wire push of the snapshot. The catalogue
    self-loads from mongo via `Template.findDescendants` at
    `postRegister` — no per-topic Stuff is ever cloned. Authored
    source of truth for the topic vocabulary (`MessageApi.Topics`
    constant tree retired). New leaves from the social-cluster
    build: `world.speech.whisper` / `world.speech.shout` /
    `world.expression.emote` / `world.chat.message` /
    `system.broadcast`.
  - [emotes.md](./docs/subsystems/emotes.md) — `SoulMixin` on every
    Character (innate expressive surface; NOT augment-gated),
    `Emote` Document + `EmoteGrammar` typed slots (`stuff` /
    `free`) with one Liquid template per emote, `SoulCatalogue`
    singleton + `SoulApi` thin facade, three dispatch paths
    (bare-verb router catalog, `:` / `;` prefix in `msh.ts` +
    free-form fallback, `emote` YAML verb), `soul` AuthorMixin
    suite, ESP modality (`emotive-esp`) + universal-target
    delivery, ~35-emote starter roster from `mud/config/emotes.yaml`.
  - [grouping.md](./docs/subsystems/grouping.md) — `GroupApi`
    facade over three `GroupProvider` implementations: managed
    (writable `Group` Document), MQL (read-only query-driven),
    contacts (model-B per-Avatar). `GroupRef` typed strings
    (`source:id`); `GroupRegistry` Stuff singleton in `obj/`;
    `Group` Document parallel-arrays membership; coarse role
    vocabulary; the `group` verb suite rides on
    `ContactsMixin.commandContributions.self`. Chat is the first
    multi-shape **consumer** of the substrate, not a provider —
    see [chat.md](./docs/subsystems/chat.md).
  - [chat.md](./docs/subsystems/chat.md) — `Channel` Document
    with a `groupRef: GroupRef` pointing at the channel's
    membership source; chat is a **consumer** of `GroupApi`
    (player-created channels mint a backing managed Group at
    create time, channel.groupRef stamps `'managed:<groupId>'`,
    audience reads route through `GroupApi.membersOf(groupRef)`).
    Three kinds (player-created, open-join standalone, ad-hoc);
    `ChannelCatalogue` singleton owns the backing-Group bookkeeping
    (`getBackingGroupIds()` for `group list` filtering — the Group
    model knows nothing about chat); byName + byHandle + history
    rings + PropertiedMixin-backed subscription state; `chat.yaml`
    with the Phase 1 `fallthrough: true` flag — subcommands
    (`list / join / leave / mute / unmute / who / make / rename /
    disband / history / promote`) plus bare-post fallback;
    `world.chat.message` topic; `ChannelSeeder` for Help / Global /
    Chat from `mud/config/channels.yaml`.
  - [contacts.md](./docs/subsystems/contacts.md) — `ContactsMixin`
    on Avatar (via Character), per-Avatar named lists of other
    characters as `ContactEntry` flat-set with durable
    identifiers only (`avatar` keyed by `playerId`, `npc` keyed
    by `templatePath`); labels are derived views (no reserved
    label vocabulary); add-time multi-character expansion is
    controller-layer sugar (`--char` opts out); owner-only
    privacy enforced at `ContactsGroupProvider.members`.
  - [shell-environment.md](./docs/subsystems/shell-environment.md) —
    `EnvironmentMixin` settings keyspace, schema-on-mixin (and the
    schema-on-owner generalization), lookup chain, `settings` /
    `var` commands, `resolveSetting` cross-host helper
  - [shell-alias.md](./docs/subsystems/shell-alias.md) — `AliasMixin`
    per-character verb aliases, lookup chain (defaults / persistent /
    session), tombstones, `ShellApi.expandAliases` algorithm with
    positional substitution + cycle guard, the `alias` player command
  - [prose.md](./docs/subsystems/prose.md) — `ProseApi` Liquid-based
    templating for authorable prose, Mml-aware output, default
    filters (Mml vocabulary, `GrammarApi`)
  - [call-security.md](./docs/subsystems/call-security.md) — proxy
    interception, decorators, policies, shadows, FrameKind,
    `FromController` narrow-entry pattern, async `allows` contract
  - [access.md](./docs/subsystems/access.md) — `AccessApi` thin
    facade over the `AccessRegistry` Stuff singleton. Four predicates
    (`can` flat-union slice walk; `canMutateZone` role-gated on
    primary `ownerGroup`; `isAuthor` broad content-scope predicate
    for MQL pre-gates; `isDeveloper` orthogonal TS-escape gate) +
    `resolveSourceFolderZone` path resolver. `Zone.ownerGroup` /
    `accessGroups` persistent inheritable fields, the narrow-entry
    pattern applied to `StuffApi.forceDestruct` /
    `ContainmentApi.forceMove`, the three bootstrap-seeded groups
    (`'core'` / `'lounge'` / `'developers'`) with the lounge
    FolderZones at `/lib/lounge` and `/domain/lounge`, the MQL
    permission snapshot wire-up (`ctx.permission` precomputed at
    dispatch).
  - [properties.md](./docs/subsystems/properties.md) — PropertiedMixin,
    Property<T>, transient vs saved storage, access control patterns,
    masks (the unshadowable mixin's per-property override mechanism)
  - [command-routing.md](./docs/subsystems/command-routing.md) — YAML
    view + controller MVC, the per-giver recency stack, dispatch chain
    (shape vs bind, `pass: true`), validators, scope try-list,
    `updates_focus`, phase-effects vocabulary
    (`COMMAND_PHASES`, `PhaseEffect`, `collectPhaseEffects`,
    `consumePhaseEffects`; options declare `effects:` to skip /
    replace dispatcher phases), schema delivery via
    `system.commands.{added,removed,reset}`, frame attribution.
    Subcommand-fallthrough matcher behavior (Phase 3a): a verb
    that opts in via top-level `fallthrough: true` retries unknown
    first tokens against its top-level `args` block before
    surfacing the `unknown-subcommand` error — `chat` is the
    canonical user (chat-subcommand precedence, bare-post
    fallback). Optional field/option validators short-circuit
    when the value is absent so `mustBe*` validators don't have
    to teach themselves to tolerate null.
  - [command-parsing.md](./docs/subsystems/command-parsing.md) —
    `CommandLineApi` tokenizer, `RawToken` classification, `format()`
    round-trip, the `msh` shell, parser pluggability via the
    `shell.parser` setting. The `msh` parser stamps
    `parsed.emotePrefixed: true` when a message begins with `:` or
    `;` followed by a verb-starting char (with the sigil stripped);
    the router's unknown-verb branch consumes the flag to enable
    catalog-emote → free-form fallback.
  - [command-spec.md](./docs/subsystems/command-spec.md) — author
    guide for adding a verb: YAML field shape, controller
    conventions, validators, discovery wiring, the controller seed
    file. `fallthrough: true` flag + worked example (chat) for
    the subcommand-then-flat-args grammar.
  - [mql.md](./docs/subsystems/mql.md) — MQL internals: pipeline
    (desugar / lex / parse / resolve), AST, scope-walk, predicates,
    pronoun memory, via augmentation, permission tiers, online
    provider seam, PathTrie
  - [mql-subscription.md](./docs/subsystems/mql-subscription.md) —
    live MQL subscription substrate: per-Interactive registry,
    `mql-subscribe` / `mql-unsubscribe` / `mql-query` wire shapes,
    `SubscribableFieldDescriptor` (flat `read` + focused-detail
    `perDetailRead`), meta-bus dependency index keyed by
    `(EventClass.KIND, attribute, value)`, `setImmediate`-batched
    re-resolve scheduler, diff producing `op: replace/update/add/remove`,
    error envelopes (parse/resolve/permission/closed), class-per-event
    vocabulary (`FieldChangedEvent`, `PropertyChangedEvent`,
    `ShadowChangedEvent`, `GenericEvent<P>`) layered onto `EventApi.fire`
    + class-based `EventApi.on`, `DescribeApi.getDisplayName` reshape
    (drop `fallback`, add `viewer?`, bake in `'something'`),
    holder-level `focusDependent` / `locationDependent` dep flags
    (subscriptions wake on `setFocus` / `setContainer`), `mql-query`
    one-shot read channel
  - [inspection-pane.md](./docs/subsystems/inspection-pane.md) —
    persistent right-column cockpit pane: two client-issued MQL
    subscriptions (`$focus` + `focusDependent` for the focused-
    thing body; `here` + `locationDependent` for the breadcrumb
    root), paint/clear policy with first-delivery auto-paint,
    unified breadcrumb (root + focus trail + detail-drill segments),
    cardinality-polymorphic body, door-context exit synthesis,
    client stuff registry feeding `MmlRenderer.commandFor`'s
    `look <primaryKeyword>` routing, shared `ui/` cockpit primitives,
    `find` snapshot-enumeration verb
  - [prompt.md](./docs/subsystems/prompt.md) — prompt substrate:
    `PromptApi` (Tier 1 surface `choice` / `confirm` / `text` /
    `mqlObject` / `mqlMany`), per-Interactive resolver map,
    async-permitted validator + retry with `prompt-validation-failed`,
    `PromptCancelledError` (reasons `'cancelled'` / `'host-disconnected'`),
    body MessageFrame correlated by `promptId`, two-channel inbound
    (`prompt-response` / `prompt-cancel` bypass the command bus;
    `prompt cancel` verb rides it), base-prompt rendering substrate
    (`prompt.format` setting, ProseApi.format Liquid render, every
    DispatchResponseEnvelope carries a `prompt-refresh` Note,
    empty-command short-circuit), `CommandApi.applyCardinalityPolicy`
    (async) + the cardinality / onExcess / onShortage YAML
    vocabulary — `onExcess: prompt` pushes `PromptApi.mqlObject` /
    `mqlMany` and awaits inline, degrades to ambiguity error when
    no Interactive is attached, cancellation propagates as
    `PromptCancelledError` caught in `CommandGiver._runChain`.
  - [mixins.md](./docs/subsystems/mixins.md) — class-factory mixins,
    `_mixinName` marker, `Mixins` registry, `MixinApi` predicates,
    composition order, persistence/command/security integration
  - [zone.md](./docs/subsystems/zone.md) — Zone-hierarchy roots
    (`Zone`, `SpatialZone`, `FolderZone`) carved out of
    `lib/spatial/` into `lib/zone/`. `ZoneApi`'s
    `resolveZoneForPath` + `isFolderClass` / `isSpatialZoneClass` +
    `getEnclosingZone` (orchestration helper for the ancestor
    walk), and the field-inheritance surface
    (`Zone.lookupField` / `Zone.lookupAncestorField`) — polymorphic
    step on the class, plumbing on the Api. Cardinal-only-intra-zone
    exit invariant.
  - [spatial.md](./docs/subsystems/spatial.md) — locations,
    concrete spatial zones (Cartesian/Spherical), vessels,
    coordinates, containment chokepoint, locomotion, direction
    vocabulary, declarative `coords` / `focus` setters with their
    zone-registration side effect, `SurfacedMixin` and the
    auxiliary `restingOn` pointer for on-vs-in placement,
    `ContainmentApi.placeOn` + the `put` / `give` verbs
  - [boundary.md](./docs/subsystems/boundary.md) — exits, doors,
    `Adornable` / `Adornment`, the `Boundary` substrate
    (`Boundary`, `BoundaryAnchor`, `Conduit` interfaces),
    `Window`, `ExitableVessel`. Declarative wiring via
    `ExitableMixin.applyExits` (instruction field; `ExitInstruction`
    shape) and `Window.attachedHosts` (Pattern A). `addExit` /
    `addBidirectionalExit` are async (the cardinal-zone check
    awaits zone resolution). Everything that lives on the seams
    between containment scopes.
  - [light.md](./docs/subsystems/light.md) — Light value object,
    vision modality lives at `VisionModality.signalAt` (the propagation
    walk relocated from the retired `LightApi`); static helpers
    `VisionModality.lightAt`, `bandAt`, `perceivedBand`, `canSee`,
    `shadowsAt`, `viewerVisionProfile`. Outside callers dispatch
    via `PerceptionApi.signalAt(loc, VisionModality)`. `Light.ts`
    owns `bandFor` + `LIGHT_BANDS` + `ShadowQuality`. `AmbientLitMixin`,
    `LightSourceMixin`, the Boundary substrate (`Adornable`,
    `Adornment`, `Boundary`, `BoundaryAnchor`, `Conduit`
    interfaces), `Window`, the Door retrofit, per-viewer perception
  - [augmentation.md](./docs/subsystems/augmentation.md) — augment-
    confers-mixin substrate (Wave 1): `AugmentMixin.confers()`
    naming the mixins it activates; `MixinApi.getActiveMixins` /
    `isActive` walking native composition ∪ augment-conferred;
    mixin self-declarations (`_augmentGated`, `_grantsModalities`,
    open shape for `_grantsLanguages` / `_grantsAttributeMasks` /
    `_grantsVitalFunctions` / `_grantsSlots`); `@RequiresActive`
    method decorator + `InactiveCapabilityError`; cranial slot on
    biped/quadruped body plans; `AetherImplant` (Wave 1 implant
    template); `Avatar.installDefaultLoadout` dispatched from
    `postRegister` during the clone cascade. Wave 1 ships the
    framework + the baseline implant; Wave 2+ adds other augments,
    install/remove procedure, char-gen loadout, failure modes.
  - [senses.md](./docs/subsystems/senses.md) — multi-sense perception
    substrate. Authoring half (2026-06 senses build):
    `SenseChannel` vocabulary (`vision` / `hearing` / `smell` /
    `touch` / `taste`) + `SENSE_CHANNELS` runtime array declared on
    `PerceiverMixin`; per-sense `Detail` slot map with legacy + new
    authoring; `<sense channel="X">` MML wrapper + `<detail sense="X">`
    attribute; `senseStripAugmenter` on `VisibleMixin`;
    `Mml.stripBySense` walks the parsed tree to drop out-of-filter
    regions; `Mml.augment` static (the bare `augmentMarkup` export
    was retired). Physics half (2026-06 perception build):
    `Modality` base class + seven singletons (`VisionModality`,
    `SmellModality`, `SoundModality`, `TouchModality`,
    `TasteModality`, `VerbalESPModality`, `EmotiveESPModality`);
    `PerceptionApi` with `modalityByName`, `modalityByOrganKey`,
    `signalAt`, `perceiveAt`, `sensorium`, `canPerceive`;
    propagation walks for vision (relocated from LightApi) + smell
    + sound (linear-amplitude accumulation, logarithmic dB merge);
    touch contact reads via biome chain;
    `BodyPlan.sensoryPorts.modality` indexed by `modalityByOrganKey`;
    sensorium walks BodyPlan organs + active-mixin
    `_grantsModalities` (AetherMixin contributes ESP modalities
    when the baseline comm implant is installed); per-frame
    modality attribution at `Scene.modality(name)` +
    `SensorMixin.filterMessage` (actor self-frame bypass). The
    `Species.olfactoryProfile` scalar drives smell thresholds; the
    four contact-only single-sense verbs (`smell` / `listen` /
    `feel` / `taste`) bare forms upgrade to true field reads;
    gestalt `sense` verb keeps room-presentation chrome.
    Perception topics organized hierarchically — `topic = kind of
    event` (verb-leafed for verb-generated frames, channel-leafed
    for ambient): `world.perception.sense.{look,sense,smell,listen,
    feel,taste,scry}` for direct perception; `world.perception.
    ambient.{vision,hearing,smell,touch,taste}` for unbidden
    perceptual input; `world.perception.measurement.{measure-*,
    analyze-*,weigh}` for instrument readouts;
    `world.perception.search.{find,locate}` for search results;
    `world.perception.inventory` for possession listings. Shell
    queries land at `system.shell.{alias,var,settings,focus,player}`.
    Channel attribution lives in body MML (orthogonal to topic).
    `Mobile.autoLookOnArrival` renamed to `autoSenseOnArrival`
    (forces `sense` not `look`) — the four on-entry call sites
    (`Avatar.enter`, `Mobile.traverse` / `teleport`, `Goto -l`) all
    route through it.
  - [quantities.md](./docs/subsystems/quantities.md) —
    `Quantity<U>` substrate (Unit catalog, tag-table registry,
    same-unit math, parse/fromTag/Mml emission),
    `QuantityMarshaller` for persistence round-trip, the
    `static fieldMarshallers` and `initProp({ marshaller })`
    integration patterns. Cross-cutting substrate consumed by
    Light (lux/lumen/Kelvin), Material (kg/m³, g/mol), and
    Tangible (kg).
  - [perception.md](./docs/subsystems/perception.md) — viewer-aware-
    query pattern (`Stuff & Sensor` always explicit, never inferred
    from execution context), Shadow seam for per-viewer overrides
  - [collections.md](./docs/subsystems/collections.md) — canonical
    surfaces for collection-shaped mixins (Set / keyed Map / ordered
    list / property bag), mutator/predicate naming axes
  - [hot-reload.md](./docs/subsystems/hot-reload.md) — `HotReloadApi`
    state machine, `StuffApi.clone` integration, lifecycle events,
    controller dispatch (clone-per-execution), `reloadHookManifest`
  - [race.md](./docs/subsystems/race.md) — Material substrate
    (`TangibleMixin`, `MaterialApi`), Clade taxonomic scope,
    `BodyPlan` + `Species` templates, `OrganismMixin`, `SexedMixin`,
    `SpeciesApi` (kingdom resolution, lifecycle predicates,
    `isAnimate`), animacy gating at the command layer
  - [shell-workspace.md](./docs/subsystems/shell-workspace.md) —
    `WorkspaceMixin` cwd state (content + source trees),
    `workspace.tree` setting (`content` / `source` / `mirror`),
    `pickWorkspaceTree` helper, synthetic vars (`$PWD`, `$CPWD`,
    `$SPWD`, `$HOME`), read/write verb suite (`pwd`/`cd`/`ls`/
    `cat`/`grep`/`write`/`mkdir`/`rm`/`cp`/`mv`), `SourceTreeApi`
    sandboxed fs surface
  - [shell-author.md](./docs/subsystems/shell-author.md) —
    `AuthorMixin` lifecycle and code-execution verbs (`clone`,
    `reload`, `destruct`, `eval`, `teleport`), `EvalScript`
    Stuff-wrapped sandbox, `forceX` parallel-API force-bypass
    shape, eval singleton lifecycle, future `--save` / `--mixin` /
    `--extends`
  - [perceiver.md](./docs/subsystems/perceiver.md) —
    `PerceiverMixin` (look / scry / locate verbs on the actor),
    Sensor / Visible / Perceiver responsibility split,
    `ScryableMixin` capability seam in `lib/perception/`
  - [slot.md](./docs/subsystems/slot.md) — `Slotted` / `Slottable`
    substrate, three universe patterns (static / body-plan /
    dynamic), `accepts` + `fitsSlot`, capacity (incl.
    `UNBOUNDED_CAPACITY`), `SlotApi` reference, Detail-targeted
    resolution
  - [embodiment.md](./docs/subsystems/embodiment.md) —
    `Wearable` / `Wieldable` body-side affordances, per-body-plan
    `slotClaims`, multi-slot atomicity via `SlotApi.occupyAll`,
    wear/remove/wield/unwield verb suite
  - [posture.md](./docs/subsystems/posture.md) —
    `Postured` (host) + `Posed` (actor) + the `Postures` constants
    vocabulary, posture-bearing slot definition, floor adornments
    + per-Location authoring, sit/lie/stand/kneel verbs,
    atomicity invariant via `SlotApi.transferOccupancy`
  - [conveyance.md](./docs/subsystems/conveyance.md) —
    `Mountable` / `Drivable` / `SeatedDrivableMixin`, the
    `Mobile.traverse` conveyance ripple (depth-16 cycle guard),
    mount/dismount verbs, vehicle design space coverage
  - [locomotion.md](./docs/subsystems/locomotion.md) —
    `LocomotionMode` singletons (walk / climb / swim / fly / ride /
    drive / wheeled / sailed / aerial), `Climbable` / `Swimmable` /
    `Flyable` enablement mixins, `LocomotionApi` (mode resolution,
    eligibility cascade, engagement lifecycle, passthrough emission
    walk), per-mode verb controllers, `Exit.media`,
    `Mobile.engagedMode`, `Drivable.vehicularMode`,
    `BodyPlan.defaultLocomotionMode` chain
  - [glob.md](./docs/subsystems/glob.md) — fungible stacks:
    `GlobbableMixin` (single Stuff carrying integer `quantity`,
    `globIdentityFields ⊂ persistentFields`), `GlobbableApi`
    (`split` / `merge` / `canMerge` / `applyQuantity` workhorse;
    count-aware naming lives on `DescribeApi.formatName`),
    `ContainmentApi.placeDirect` fresh-placement
    primitive, merge-on-arrival ripple in `ContainmentApi.move`,
    MQL quantity surface (`:{N}` / `:{*}`, `MqlResult.quantity`,
    natural-language `5 X` / `all X` prefix). Notes use the canonical
    `@saxonberg/types` shapes; `applyQuantity` opts take `{field, query?}`.
  - [response-envelope.md](./docs/subsystems/response-envelope.md) —
    `DispatchResponseEnvelope` wire frame alongside `MessageFrame`:
    16 `Note` kinds, `Status` auto-escalation, `CommandContext`
    accumulator (`note` / `setStatus` / `getNotes` / `getStatus`),
    `SensorMixin.onEnvelope` triad parallel to `onMessage`,
    `Interactive.nextFrameId` per-connection ordering primitive
    shared by both channels, input-echo MessageFrame at
    `system.log.command.{info|warn}` with `kind: 'issued'` payload.
    Controllers emit failure signals via `Scene.send + ctx.note`;
    `execute()` returns `void`. `CommandResult` / `success` /
    `summary` / `pass` retired.
  - [activity.md](./docs/subsystems/activity.md) — engagement
    framework substrate: `SchedulerApi` (`start` returning a
    five-outcome `StartResult`, `cancel` family, activity-class
    registry with HMR-aware lifecycle dispatch), `EngagedMixin` on
    `Character` (engagement slot map; runtime-only; ApiOnly-gated
    `_setEngagement`/`_clearEngagement`), the four engagement slots
    (`body`, `hands`, `attention`, `voice`), the five
    framework-intrinsic `AbortReason`s (`cancelled`, `replaced`,
    `preconditions-changed`, `host-destroyed`, `thrown`),
    `DurativeActivity` vs `SustainedEngagement`, `ScheduledEmission`
    cadenced side-effects, 100ms duration floor with wire-silent
    `completed-sync`, host-destruction subscription on
    `Events.StuffDestructed`, `cancel` / `stop` verb. Wave 1 ships
    the substrate inert; v1 controllers stay synchronous.
  - [biome.md](./docs/subsystems/biome.md) — atmospheric substrate:
    `Biome extends Idea` (leaf templates with explicit
    `_extendsBiomePath` parent refs); root universe biome at
    `/lib/biome/universe`. Admin/ownership tree under `/lib/biome/`
    uses `FolderZone` templates for write-access scoping (biome
    team, sub-team folders). `AtmosphericMixin` composes onto
    `Location` AND `Vessel` (not pure containers). Outward-walking
    chain resolver (`BiomeApi.resolveXFor`): detail → detail-prefix
    → room → biome leaf → biome ancestry (via `_extendsBiomePath`
    chain) → spatial zone → universe. Atmosphere medium as a string
    tag with a 3-entry density const map (air / water / vacuum).
    `SkyExposedMixin` + `SkyExposedBiome` for outdoor leaves.
    Derived geometry: `CartesianZone.cellSize` graduated to linear
    meters (default 3.0); `Location.getVolume` / `getCeilingHeight`
    are abstract, overridden per topology (cube-cell vs sphere +
    inscribed cube). Six instruments (Thermometer / Barometer /
    Hygrometer / GravityMeter / GasAnalyzer / Altimeter) + `measure
    <field>` subcommand dispatch + `analyze atmosphere` provenance
    verb. Slim demonstrative roster under `/lib/biome/` (parallel
    to Material / Species) — universe + outdoor/indoor tier
    baselines + a couple of leaves + the cafeteria-atrium
    scenario-C showcase. Content teams flesh out from there.
  - [time.md](./docs/subsystems/time.md) — game-time substrate (three
    layers under `lib/time/` + `api/worldclock.ts` / `api/celestial.ts`).
    `WorldClockApi` own-thing axis (anchor `getNow`, scale/pause/resume,
    `WorldClockState` Document singleton via `find({})`, `boot`/
    `shutdown` lifecycle owned by the Api + `SystemRoot`-gated, 5-min
    crash backstop), the single arm-next-deadline heartbeat driving
    `after`/`at`/`every`/`onDate`/`cron` (schedules never persisted —
    persist deadlines, re-establish in `postRegister`), `SchedulerApi`
    riding game-time (D5, durations in game-ms). `CelestialApi` real
    solar/lunar geometry (folded-in static methods, first-order lunar
    model) + zone-inherited `CelestialProfile` / `EARTH_LIKE` (360-day
    year, no light wiring — D6). `DefaultCalendar` (12×30, named months/
    weekdays, weekday drift). Pedagogical surface: `Sundial` / `Sextant`,
    `analyze time` / `sky`, `measure shadow` / `altitude <sun|moon>`.
    World config is module constants, NOT settings (R8).

## Development Commands

### Package Management

```bash
pnpm install          # install all dependencies
pnpm install:all      # monorepo-specific install
```

### Development

```bash
pnpm dev              # run client and server concurrently
pnpm dev:server       # server only (cd packages/server && pnpm dev)
pnpm dev:client       # client only (cd packages/client && pnpm dev)
```

### Build / Test / Quality

```bash
pnpm build            # pnpm -r build
pnpm test             # all tests (Vitest)
pnpm lint             # ESLint across all packages
pnpm format           # Prettier
```

Per-package commands live in `packages/server/` and `packages/client/`
(`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm clean`, `pnpm preview`).

### Documentation

API reference is generated from TSDoc comments by TypeDoc. Scope is
**server-only** for now (the engine surface content authoring touches);
client + `@saxonberg/types` are platform-level and not yet wired in.

```bash
pnpm docs                # generate server API docs (alias for docs:server)
pnpm docs:server         # TypeDoc over packages/server -> HTML + JSON
pnpm docs:clean          # remove generated output
```

Config lives in `packages/server/typedoc.json`. It documents
**module -> exports -> public + protected members**, excluding private,
`#`-hard-private, and `@internal`-tagged symbols. Two artifacts land in
`packages/server/docs/api/` (gitignored, regenerated on demand):

- `html/` — the browsable static site (the eventual pre-auth web view).
- `api-model.json` — the canonical machine-readable model. The in-game
  `help api` browser (`HelpController`) is scaffolded to consume this.

TypeDoc's `validation` block doubles as the doc-content audit: it warns
on undocumented exports and broken `{@link}`s. Warnings are not
build-breaking today.

## Tech Stack

- **Server**: Node.js + Express, `ws` for WebSockets, MongoDB native
  driver, Passport (`passport-google-oauth20`), `tsx` for dev with
  watch.
- **Client**: React 18 + Vite, Zustand for state, styled-components.
- **Shared**: `@saxonberg/types` package.
- **Testing**: Vitest. Tests are colocated in `__tests__/` siblings.

## Environment Variables

Server requires `.env` in `packages/server/`:

```
MONGODB_URI=mongodb://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:2010/auth/google/callback
SESSION_SECRET=...
```

## Ports

- Client dev server: `http://localhost:5173` (Vite default)
- Server: `http://localhost:2010`

## TypeScript Configuration

`tsconfig.base.json` — Target ES2022, Module NodeNext, strict mode,
`experimentalDecorators` + `emitDecoratorMetadata`,
`noUncheckedIndexedAccess`.

## Code Style

From `.prettierrc.js`:

- 80 character line width
- 2 spaces for indentation
- Double quotes for strings
- Semicolons required
- Trailing commas (ES5 style)
- LF line endings

From `.eslintrc.js`:

- React import not required in JSX (React 17+)
- Unused variables warning (allow `_` prefix)
- TypeScript recommended rules

## Import Statement Style

**NEVER use `.js` extensions in import statements.** TypeScript with
`NodeNext` module resolution handles extensions automatically.

```typescript
// CORRECT
import { Stuff } from '../stuff/Stuff';
import { Location } from './Location';

// WRONG
import { Stuff } from '../stuff/Stuff.js';
import { Location } from './Location.js';
```

## Module Categories — DO NOT INVENT NEW ONES

Saxonberg has a fixed taxonomy of module types. Every TypeScript file
in `packages/server/src/mud/` falls into one of these. **If a new
file you're considering doesn't fit, STOP and discuss with the user
before creating it.** Cross-cutting helpers default to a new or
existing `Api` class — do not create free-floating helper modules.

| Category | Where | Filename | Purpose |
|---|---|---|---|
| Stuff class | `lib/<subsystem>/` or `obj/` | `PascalCase.ts` | Runtime classes extending Stuff/Idea/Thing/etc. |
| Mixin | `lib/<subsystem>/` | `PascalCase.ts` (no `Mixin` suffix) | Class-factory mixin; export `FooMixin`, marker `_mixinName = 'FooMixin'`. |
| Api | `api/` | lowercase `feature.ts` | Static utility class `FeatureApi`, ends with `SecurityApi.decorateApiClass(FeatureApi)`. The natural home for cross-cutting static helpers. |
| Controller | `obj/command/` | `PascalCaseController.ts` | Command controller (MVC pair with a YAML view in `mud/cmd/`). |
| Command YAML | `mud/cmd/` | lowercase `verb.yaml` | The view side of a command. |
| Hook | `obj/hooks/` | `PascalCaseHook.ts` | PM `aroundSave` / `aroundDelete` hooks. |

"Pure helper functions that don't need security" is NOT a reason to
dodge the Api pattern — Apis hold static utility methods perfectly
well, and the security decoration is cheap. Same for refactor splits:
extracting helpers into a new free-floating file is the same anti-
pattern as inventing one from scratch.

## File Naming Conventions

- **Mixin files**: `Propertied.ts`, `Detailed.ts`, `Visible.ts` (NO
  `Mixin` suffix in the filename). The exported function is still
  named `PropertiedMixin()`. The internal class name marker is still
  `_mixinName = 'PropertiedMixin'`. Test files match:
  `Propertied.test.ts`.
- **Mixin placement**: Mixins live in the `lib/<subsystem>/` folder
  that owns the concern they model. **DO NOT create a `lib/mixins/`
  folder** — "mixin" is an implementation technique, not a subsystem.
  If a new mixin doesn't fit an existing subsystem, propose a new
  subsystem folder for it. Shared mixin infrastructure (types, name
  registry) lives in `lib/mixin.ts`.
- **Class files**: match the class name (`Avatar.ts`, `Player.ts`,
  `Thing.ts`, `Location.ts`).
- **Api files**: lowercase with `.ts` (`stuff.ts`, `player.ts`,
  `mixin.ts`, `containment.ts`, `message.ts`).
- **Command YAML views**: in `mud/cmd/`, lowercase
  (`look.yaml`, `say.yaml`, `tell.yaml`).
- **Command controllers**: in `mud/obj/command/`, e.g.
  `LookController.ts`, `GoController.ts`.

## Member Privacy: `#` vs TypeScript Modifiers

Two privacy mechanisms with different threat-model semantics. They
are NOT interchangeable.

- **TypeScript modifiers** (`private`, `protected`, `public`) —
  compile-time only. The fields are public properties at runtime:
  reachable via bracket access, reflection, `JSON.stringify`, Proxy
  traps, subclasses that override-and-super.
- **ECMAScript hard-private** (`#name`) — runtime-enforced. Cannot be
  reached by bracket access, reflection, Proxy traps, subclasses, or
  replaced prototype methods. Lexically bound to the class body.

Convention is **layer-based**:

- **Mediator/trusted-surface code** — `packages/server/src/backend/`
  and `packages/server/src/mud/api/` — defaults to `#`. These layers
  mediate access for everything else and benefit from the stronger
  runtime guarantee. `#` ensures internal slots are invisible to a
  wrapping Proxy.
- **Domain code** — `packages/server/src/mud/lib/`, `mud/obj/`,
  `mud/cmd/` — defaults to TypeScript modifiers. Persistent fields
  must be public for the `Hydrator` to reflect into. Use `protected`
  for subclass extension points (`prepareDestroy()`-style hooks),
  `private` for class-internal helpers and caches.

**Special cases** where `#` is appropriate inside `lib/` or `obj/`:

1. A reentry guard or invariant-critical flag where a malicious
   subclass overriding a method could corrupt state.
2. An internal slot that must be deliberately shielded from the
   Proxy-based permissions framework.
3. A field whose only legitimate access is the class itself and where
   forcing tests to use a deliberate observation seam is the desired
   outcome.

Caches, helpers, and ordinary internal state do NOT qualify. When
introducing `#` in domain code, leave a one-line comment explaining
which case applies.

**Hard constraints**: two things rule out `#` regardless of which
layer the file lives in:

1. **Persistent fields** — the `Hydrator` reflects into them by name,
   and `#` slots aren't reachable from outside the class body. Use
   public (or TypeScript `private` if the persistence layer were
   refactored to use a friend-class hatch, which it isn't today).
2. **Mixin instance state on Stuff hosts** — every Stuff is wrapped
   in the call-security `Proxy`, and instance method dispatch goes
   through `method.apply(proxy, args)`. Inside the method, `this` is
   the proxy. `#`-private slots live on the raw target only, so any
   `this.#foo` access from a method called through the proxy throws
   `Cannot read private member from an object whose class did not
   declare it`. Use TypeScript `private` (with a `_` prefix when the
   field is part of a sealed-mutation surface a sibling Api needs to
   reach via cast). The seal comes from `@Final @Unshadowable` on
   the methods that own the field, NOT from `#`.

   **Static fields on Api classes are fine with `#`** — Api methods
   are static, so there's no instance proxy receiver in play.

The "domain code defaults to TypeScript modifiers" rule is a
consequence of (2) — even if `#` were tempting for a mixin's
internal cache, the proxy makes it unworkable.

## Inter-Stuff Contract: Methods Only

Privacy modifiers say what the *compiler* enforces. The **inter-stuff
contract** says what *external code* may use. The two are related but
not the same — even `public` fields are off-limits when the reader is
another `Stuff`.

The rule:

- **Methods are the contract surface between Stuff objects.** Other
  Stuff reads and writes via `obj.getFoo()` / `obj.setFoo(x)`, never
  `obj.foo`.
- **Fields and accessor pairs are host-internal.** Internal class
  code touches `this._foo` (or `this.foo` if the accessor lives on
  the same name) directly — that's not the contract.
- **Hydrator is the framework carve-out.** It reflects into persistent
  fields by name to populate them from storage. Nothing else
  outside the host's class body does the same.

### Why methods

The shadow framework dispatches **methods only**. Reading `obj.foo`
where `foo` is a field bypasses the proxy entirely; reading an
accessor pair runs the security gate but never finds a shadow because
accessors are filtered out of the intercept set; setters have no
proxy trap at all. Buffs, polymorph effects, hood/disguise shadows,
audit interceptors — none of them see field-shaped access. Methods
are the only stable extension point.

The corollary: when an invariant has to fire on every write, the
accessor pair (`get foo()` / `set foo()`) is still the right tool —
it's just not external surface. The public `setFoo()` method
delegates to the accessor; outside callers never see the accessor
form.

### What this means in practice

| Sense | Inside the class body | Other Stuff |
|---|---|---|
| Read | `this._foo` (or `this.foo` if accessor-shaped) | `other.getFoo()` |
| Write | `this._foo = v` (or `this.foo = v` to fire the accessor) | `other.setFoo(v)` |
| Persistence (Hydrator) | n/a | `instance['foo'] = stored` (framework carve-out) |

Test code is treated like other Stuff: tests that need to inspect
internals should reach for the host's public method surface, not
field/accessor access. When a test genuinely needs raw state, the
seam is `Stuff.RAW_TARGET` plus a comment explaining why.

For mixins that own collections (a `Set`, a keyed `Map`, an ordered
list), the canonical method surface — `addX` / `removeX` / `hasX` /
`getXs` and the variations — is documented in
[collections.md](./docs/subsystems/collections.md). Pick the shape
that fits the underlying storage and stick to its surface.

This is a graduated rule. The current codebase still has `obj.field`-
style call sites; migration is mechanical and lands as a separate
sweep. New code goes on the new pattern.

## Go Through the API Layer

Several recurring rules collapse into one principle: **never call into
internal mechanism directly when an Api method exists for the same
job**. The Api layer threads through the security gate; direct calls
bypass it. Common cases:

| Don't | Do |
|---|---|
| `obj.destroy()` | `StuffApi.destruct(obj)` |
| `new SomeStuff()` | `await StuffApi.create(() => new SomeStuff())` or `await StuffApi.clone(path)` |
| `item.setContainer(c); c.addContainable(item)` | `ContainmentApi.move(item, c)` |
| `ContainmentApi.move(item, room); item._setRestingOn(desk)` (manual on-surface placement) | `ContainmentApi.placeOn(item, desk)` — single primitive; resolves the surface's environment, runs `canRest`, moves, restamps `restingOn`. `_setRestingOn` is `FromContainmentApi`-gated; direct calls throw. |
| `typeof obj.getContents === 'function'` | `MixinApi.isContainer(obj)` (narrow) or `MixinApi.hasMixin(ctor, Mixins.Container)` (introspect) |
| `obj.fullName ?? obj.name ?? 'something'` | `DescribeApi.getDisplayName(obj, 'something')` |
| `creature.move(loc)` (raw containment) | `LocomotionApi.traverseWithDefault(actor, exit)` (default-mode dispatch via `defaultModeFor` chain) or `LocomotionApi.engageAround(actor, mode, exit, action)` (known mode + engagement bookkeeping) |
| `actor.setEngagedMode(mode); await actor.traverse(exit, …); if (transient) actor.setEngagedMode(null)` | `LocomotionApi.engageAround(actor, mode, exit, action)` — handles transient/persistent decision + error-path cleanup |
| `resolveSetting(actor, 'movement.defaultMode') ?? 'walk'` | `LocomotionApi.defaultModeFor(actor)` — three-tier chain: explicit setting → bodyplan default → universe 'walk' (the raw resolveSetting skips the bodyplan layer for NPCs) |
| `avatar.gold = 100` (direct field assignment for dynamic state) | `avatar.setProp(Property.of<number>('gold'), 100)` (PropertiedMixin) |
| `(stuff as unknown as { templatePath? }).templatePath` | `stuff.getTemplatePath()` (runtime stamp). For `Template` docs use `template.path` — the two are distinct. |
| `(stuff as { templatePath? }).templatePath = path` | `stuff.setTemplatePath(path)` (ApiOnly-gated, re-keys `byTemplatePath`). The slot is hard-private (`#templatePath`); bracket-writes are runtime no-ops. Clone-pipeline pre-register stamps use the caller-allowlisted `Stuff._stampTemplatePath` seam. |
| `(stuff as { zone? }).zone = z` | `stuff.setZone(z)` (gated by `FromSpatialZone` — only `SpatialZone` subclasses may call). Slot is hard-private (`#zone`); bracket-writes are runtime no-ops. Clone-pipeline pre-register stamps use the caller-allowlisted `Stuff._stampZone` seam. |
| `other.foo` / `other.foo = x` from another Stuff | `other.getFoo()` / `other.setFoo(x)` — see "Inter-Stuff Contract" above |
| `return { success: false, summary: 'foo' }` from a controller | `ctx.note({ kind: 'controller-rejected', reason: 'foo-reason', detail: 'foo' })` + `MessageApi.scene(...).toSelf(...).send()` — controllers return `void`; outcome rides the dispatch-response envelope. See [response-envelope.md](./docs/subsystems/response-envelope.md). |
| `new CommandContext({ ... })` / `createCommandContext({ ... })` | `CommandApi.createCommandContext({ ... })` — tests + dispatcher use the same factory; the constructor + accumulator state are not external surface |
| `door.setIsOpen(true)` / `door.getIsOpen()` | `door.setOpen(true)` / `door.isOpen()` — boolean fields use the noun form on field/setter/YAML, predicate form on the getter |
| `ZoneApi.resolveZoneField(zone, 'foo')` | `zone.lookupField<T>('foo')` — the inheritance walk is an instance method on Zone so subclasses can override `lookupAncestorField` for barrier behavior |
| `setInterval(fn, ms)` / `setTimeout(fn, ms)` from domain or Api code | `ScheduleApi.recurring(ms, fn, opts?)` / `ScheduleApi.schedule(ms, fn, opts?)` — wraps the callback in `ExecutionContextApi.runRoot` so composed frames have a well-defined Root + propagated `causingCommandId` attribution; returns a `ScheduleHandle` cancellable via `ScheduleApi.cancel(handle)`. Bare Node timers skip the execution-context layer and leak raw handles. |
| `(stuff as any).save?.()` to round-trip arbitrary Stuff to its template | `Avatar.save()` is the only v1 consumer (`if (stuff instanceof Avatar) await stuff.save()`). The substrate (`TemplateApi.snapshotToTemplate` / `restoreFromTemplate`) is general but only Avatar exercises it in v1. No general persist-back mixin yet. |
| Reading `template.data.container` from a verb to decide where a clone lands | Let `applyContainer` do it — the Hydrator's Phase 2 self-places the instance during the clone cascade. Verbs `clone` post-clone and treat hydration-self-placement as Layer 3 in the precedence chain (`--into` → `--here` → self-placement → giver fallback). See `obj/command/CloneController.ts`. |
| `await GroupApi.isMember(playerId, ref)` inside a controller to gate a staff verb | `await AccessApi.can(giver, action, resource)` — slice walk over `Zone.ownerGroup` / `accessGroups` with `'core'` fallback. See [access.md](./docs/subsystems/access.md). |
| Hard-coded "is this player an admin?" check | `await AccessApi.can(giver, action, resource)` (resource-targeted), or `AccessApi.canMutateZone(giver, zone)` for Zone-Template targets, `AccessApi.isAuthor(giver)` for MQL pre-gates, `AccessApi.isDeveloper(giver)` for the orthogonal TS-escape axis (eval, reload, source-tree writes). |
| Reaching `AccessRegistry` directly via `StuffApi.findByTemplatePath('/obj/AccessRegistry')` and calling its methods | `AccessApi` — the Registry's public methods carry `@CallSecurity(FromModule('mud/api/access#AccessApi'))` and throw on any other caller. The facade is the only legitimate path. |

Full list with examples: [docs/antipatterns.md](./docs/antipatterns.md).

Some specific reminders worth keeping in front of mind:

- **Destroy via `StuffApi.destruct(obj)`** — never override `destroy()`.
  Use the `onDestruct()` witness for cleanup, `canDestruct()` to veto.
  Enforced at runtime by
  `@CallSecurity(SecurityPolicies.ApiOnly)` + `@Final` + `@Unshadowable`
  on `Stuff.destroy()`. `Stuff.onDestruct()` ships a no-op terminal
  so subclasses can `super.onDestruct()` without ceremony — see
  [antipatterns.md § Cast-Chain to `super`](./docs/antipatterns.md).
- **`ContainmentApi.move()`** takes typed `Stuff & Containable` /
  `Stuff & Container` parameters and returns `void`. Programmatic
  contract violations throw; there are no boolean success flags.
  YAML-level validators handle user-input failures separately.
- **Per-field invariants belong on setters**, not in `normalize()`-style
  post-hydrate hooks. `PersistentHydrator`'s **two-phase dispatch**
  prefers a `set<Field>` method (Phase 1) and falls back to
  bracket-assign through any accessor pair on the prototype.
  Instruction fields use the `apply<Field>` Phase 2 dispatch.
  Cross-field invariants go in a custom `Hydrator` subclass — see
  [templates.md § The Hydrator Contract](./docs/subsystems/templates.md#the-hydrator-contract).
- **`Mixins` registry constants** in `lib/mixin.ts` — use
  `Mixins.X` instead of string literals when calling
  `MixinApi.hasMixin()`.

## Authentication Flow (Brief)

Google OAuth2 via Passport. Sequence: `/auth/google` → Google →
`/auth/google/callback` → `Backend.handleAuthenticationSuccess` →
`Application.findOrCreateUserFromGoogle` (creates/updates
`GoogleProfile`, `User`, default Avatar template at `/obj/Avatar/<playerId>`)
→ session cookie → client redirected with `auth=success`. WebSocket
upgrade reuses the express-session middleware.

Full connection lifecycle (login flow, character selection,
multiplexing, disconnect): see
[docs/subsystems/state-model.md](./docs/subsystems/state-model.md) and
[docs/subsystems/lifecycle.md](./docs/subsystems/lifecycle.md).

## CORS / WebSocket Auth

- `Backend` configures CORS for the client origin in dev.
- WebSocket upgrade runs the same session middleware as HTTP. Validates
  `request.session.passport.user.id`; rejects unauthenticated
  connections immediately.

## MongoDB Collections

- `users` — auth records (`Document`)
- `google_profiles` — OAuth profile data (`Document`)
- `domain` — object templates for the CMS (Avatar, rooms, NPCs, …)

## Session Notes for Claude

- This is a TypeScript-strict codebase. `noUncheckedIndexedAccess` is
  on. Don't reach for `any` without justification.
- Use `MixinApi.isX(obj)` type predicates when narrowing — they thread
  the mixin's public interface into TypeScript's control-flow narrowing.
- Tests live next to the source under `__tests__/`. Vitest.
- New Apis end with `SecurityApi.decorateApiClass(XApi)`. The four
  bootstrap-special Apis (`ExecutionContextApi`, `ModuleApi`,
  `SecurityApi`, `ProxyApi`) deliberately don't self-decorate — see
  [docs/subsystems/call-security.md](./docs/subsystems/call-security.md).
- The `Mixins` constants object is the single source of truth for
  mixin names. Add new mixins there.
