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
- Subsystem references in `docs/subsystems/`. Each doc is the source
  of truth for its area — read it before editing.
  - [templates.md](./docs/subsystems/templates.md) — clone pipeline, Hydrator, TemplateApi, folder/leaf invariant
  - [persistence.md](./docs/subsystems/persistence.md) — `Document` base vs Templates→Stuff, PersistenceManager, around-save/delete hooks, collections
  - [lifecycle.md](./docs/subsystems/lifecycle.md) — create/destroy choreography, construction sentinel, onDestruct
  - [state-model.md](./docs/subsystems/state-model.md) — what gets persisted; Avatar self-contained, Document track for auth/meta
  - [connection.md](./docs/subsystems/connection.md) — login/logout, WebSocket upgrade, Interactive/Login/Avatar handoff, multiplexing
  - [char-gen.md](./docs/subsystems/char-gen.md) — new-player intake: roster-vs-char-gen branch, `enroll` as a field-keyed draft state machine, Login-as-CommandGiver+Sensor accumulator, commit/spawn atomicity, server-owns-draft/client-owns-layout, species dossier + NameBank + PersonaMixin, cockpit phases
  - [client-shell.md](./docs/subsystems/client-shell.md) — the *client* front-door subsystem: the in-world frame primitives (ConnectionIndicator/AccountMenu/Portrait, shared-not-wrapped), the plain-UI start screen + data-shaped provider list, the anonymous-guest path (`/auth/guest` ephemeral principal vs Avatar `isGuest`; `Login.mintRandomGuestAvatar` randomized mint-on-Enter, reaped on disconnect, persists nothing), `HasInteractiveMixin.getPortraitUrl()` resolve-on-read, and the three-state connection-loss machine (backoff/input-gating/ReconnectBanner)
  - [messaging.md](./docs/subsystems/messaging.md) — MML, Scene composer, sensor routing, MarkupAugmenter, Vocal/Aether/Soul capability split
  - [message-rendering.md](./docs/subsystems/message-rendering.md) — end-to-end rendering: server MML extensions + client parseMml/MmlRenderer + theme/overlay cascade + the client-only **font-by-register** treatment (Theme.registers/fontRoles + Stylesheet.fontFamilyForTopic riding the topic cascade, self-hosted Source OFL faces, per-frame font on the Body ancestor)
  - [media.md](./docs/subsystems/media.md) — non-text renderable content: `Visible.illustration` key field → MQL projection → client `mediaUrl()`/`MEDIA_BASE_URL`; `MediaAsset` provenance Document; model-driven gpt-image-1 generation pipeline (Potter house style, S3); char-gen species portraits; deferred external embeds (Twitch/video)
  - [topics.md](./docs/subsystems/topics.md) — `Topic` template docs, TopicCatalogue singleton, three-tier resolution, session-establish wire push
  - [emotes.md](./docs/subsystems/emotes.md) — SoulMixin on every Character, Emote Document + EmoteGrammar, SoulCatalogue + SoulApi, three dispatch paths
  - [reactions.md](./docs/subsystems/reactions.md) — act-scoped emote aggregation: a reaction is an ordinary emote carrying one extra scope (`EmoteOptions.inReactionTo = <commandId>`) — no parallel dispatch; the `SoulMixin` send hook pokes `ReactionApi`/`ReactionRegistry` (singleton Idea at `/obj/ReactionRegistry`, in-memory, nothing persisted). The one behavioral divergence is volume-gated fan-out suppression (at/above `reactions.threshold` the per-emote line is skipped, counter only); the crux is the **fixed-cadence** `flush()` broadcaster (`ScheduleApi.recurring`, NOT `setImmediate`) collapsing unbounded reaction streams into ~5/sec, per-tick cost = audience × cadence; cross-viewer aggregation falls out of keying acts on `meta.commandId` + producer-site subject capture (`noteReactableAct` in Vocal/Soul/ChannelCatalogue — the chat `commandId`-on-witness-frames fix); the `react [--to|--msg] <emote>` verb (parser-typed selectors, gutter→commandId via per-Interactive ring), tag-grouped absolute counts + per-recipient familiar-biased `RecognitionApi` sample + expand-on-pull, the `ReactionScopeDeltaEvent` → `BroadcastFeed` overlay seam, the raw-tags `ReactionFiredEvent` renown substrate (now consumed by renown — see [renown.md](./docs/subsystems/renown.md); + `actInfo` speaker-recover for the receive-side reception seam), TTL GC; the regress-stopper (a reaction's own frame is never reactable)
  - [grouping.md](./docs/subsystems/grouping.md) — GroupApi facade over three GroupProvider impls (managed/MQL/contacts), GroupRef typed strings
  - [comms.md](./docs/subsystems/comms.md) — two-transport speech substrate: acoustic VocalMixin (say/whisper/shout + `--to`, acousticDb) vs implant comms (dm/tell on a hosted `CommsMixin`/`CommsUpdate`; `AetherMixin` = attunement + host), verb surface, ties to messaging/chat
  - [chat.md](./docs/subsystems/chat.md) — Channel Document with groupRef, three kinds, ChannelCatalogue, chat.yaml subcommand fallthrough; chat now rides the forums Subject layer (channels are one of the four Subject surfaces, decoupling identity/audience from the surface — see forums.md)
  - [contacts.md](./docs/subsystems/contacts.md) — ContactsMixin on Avatar, per-Avatar named lists, durable identifiers only, owner-only privacy
  - [forums.md](./docs/subsystems/forums.md) — asynchronous deliberation substrate: the **Subject layer** spine sitting between a surface and its `GroupRef` audience (decoupling identity/audience from the four surfaces — board / channel / DM-thread / direct), the per-board `organizer: popularity | argument` model — **two organizers over one board primitive** (popularity: vote-ranked threads; **argument**: the typed claim-graph / argument-map, an interpretation + verb mode over the same Board/Entry store read by a neutral structural lens — `supports`/`objects-to`/`responds-to` edges, open-objection as the dual-use triage+convergence signal, the non-reordering circle highlight, edit-in-place + a lossless `entry-edited` trail, the decoupled `mature` event, no ranking); the Board→Thread→Post hierarchy with the `Entry` reply-tree; CRUD that **dual-writes** a `forum_events` stream **persist-then-fire** on `EventApi` (Mongo write commits before the event fires, never a Mongo tail); the `ForumSubscriptionRegistry` document-change observer (singleton Idea, watches `forum_events` via `EventApi` — modeled on `MqlSubscriptionRegistry` but shares no code) fanning live deltas to subscribers; the **display-only** anti-snowball gate (vote counts dampened at render, never mutated); the `{text, fields}` command **body side-channel** carrying long-form post bodies past the tokenizer; the born-with `ForumsUpdate` aether capability (an `AetherHosted` implant conferring `ForumsMixin`); `SubjectSubscriberMixin` per-Avatar subscription storage; and the forum-as-primary-cockpit-view React client
  - [shell-environment.md](./docs/subsystems/shell-environment.md) — EnvironmentMixin settings keyspace, schema-on-mixin, lookup chain, `settings`/`var`
  - [shell-alias.md](./docs/subsystems/shell-alias.md) — AliasMixin per-character verb aliases, lookup chain, ShellApi.expandAliases, `alias` verb
  - [prose.md](./docs/subsystems/prose.md) — ProseApi Liquid-based templating, Mml-aware output, default filters
  - [call-security.md](./docs/subsystems/call-security.md) — proxy interception, decorators, policies, shadows, FrameKind, FromController narrow-entry
  - [access.md](./docs/subsystems/access.md) — AccessApi thin facade over AccessRegistry; five predicates (incl. the orthogonal `isStreamer`/`streamers` axis), Zone.ownerGroup/accessGroups, narrow-entry pattern
  - [livestream.md](./docs/subsystems/livestream.md) — server half of the pbox-stream overlay integration: the read-only **broadcast feed** (the `service:broadcast` WS principal via `?broadcast=<token>` checked pre-session in `handleUpgrade`, no Interactive → pure push target; `BROADCAST_TOKEN` env gate), the `StreamState` singleton Idea (`mode`/`awayUntil`, in-memory) + `Events.StreamStateChanged`, the backend `BroadcastFeed` projection + `StreamStateEnvelope` wire frame, the `requiresStreamer`/`streamers` authorization axis (seeded from `STREAMER_PLAYER_IDS`), and the `stream away`/`back` operator verb (afforded via AuthorMixin, authorized via requiresStreamer); distinct from the in-world `broadcast` ESP verb
  - [properties.md](./docs/subsystems/properties.md) — PropertiedMixin, Property<T>, transient vs saved storage, access control, masks
  - [command-routing.md](./docs/subsystems/command-routing.md) — YAML view + controller MVC, per-giver recency stack, dispatch chain, validators, phase-effects, affordance attribution (`getAffordances`/`commandSource` — what afforded each verb)
  - [command-parsing.md](./docs/subsystems/command-parsing.md) — CommandLineApi tokenizer, RawToken classes, `format()` round-trip, `msh` shell, parser pluggability
  - [command-spec.md](./docs/subsystems/command-spec.md) — author guide for adding a verb: YAML shape, controller conventions, validators, discovery wiring
  - [scripting.md](./docs/subsystems/scripting.md) — the command-native interpreter (v1 engine, NOT a macro recorder / NOT a second runtime — every statement is a command over the real bus): the **wrap-not-replace** `script` parser (bare commands = byte-identical msh, default-flipped in P6; recursive/delegating tokenizer; `;`/newline statements, standalone `{ }` blocks, the `( )` MQL+minimal-infix island, `$name` frame-first/shell-fallback, `#` bash-rule line comments) + `Pipeline` AST node (single-stage v1, piping deferred); the **synchronous effect-yielding generator** `Interpreter` (NOT recursive-await — suspension+preemption = "stop advancing the generator"; `dispatch`→`_dispatchBound`/`slice`/`suspend` effects) + `Scope`/`Block` closure keystone + uniform `Value` model (MQL-emptiness-as-falsiness); interpreter-intrinsic builtins (`if`/`each`/`while`/`def`/`set` lazy-arg) + the `Coroutine` pump on **game-time** `WorldClockApi` (`wait`/`every`/`when` + **await-engaged pacing** off `EngagedMixin`, detach-on-suspend, `ScriptAbortReason` barge-in); **authorship-tiered** resource governance (universal preemption slice + total ceiling, all `script.*` AppSettings); two surfaces (prompt-as-interpreter + named `def`/`make`); scripts persisted as one **`kind`** in the generic path-addressed **document store** (see [document-store.md](./docs/subsystems/document-store.md) — `StoredDocument`/`DocumentApi`, `kind:'script'` `data:{source}`, re-parsed-not-compiled; ScriptLogic keeps the AST cache + go-live) + the CMS third tree; **demonstration capture** (`Transcriber` vessel-as-buffer → `def <recipe> ($brand)` banked) + the chronicle **knowledge ladder** (`RecipeKnowledge` derive-on-read: known-of claim → can-make deed, `make` gated); authored demo content (`domain/lounge/scripts/*.script` + `ScriptSeeder`); distinct from `EvalScript` (shared isolation-philosophy, different runtime)
  - [mql.md](./docs/subsystems/mql.md) — MQL internals: pipeline, AST, scope-walk, predicates, pronoun memory, online provider seam, PathTrie
  - [mql-subscription.md](./docs/subsystems/mql-subscription.md) — live MQL subscription substrate: per-Interactive registry, wire shapes, dep index, batched re-resolve, diffing
  - [inspection-pane.md](./docs/subsystems/inspection-pane.md) — right-column cockpit pane: two MQL subscriptions, unified breadcrumb, cardinality-polymorphic body
  - [prompt.md](./docs/subsystems/prompt.md) — PromptApi (choice/confirm/text/mqlObject/mqlMany), per-Interactive resolver map, cardinality policy
  - [mixins.md](./docs/subsystems/mixins.md) — class-factory mixins, `_mixinName` marker, Mixins registry, MixinApi predicates, composition order
  - [zone.md](./docs/subsystems/zone.md) — Zone hierarchy roots (Zone/SpatialZone/FolderZone) in lib/zone/, ZoneApi.resolveZoneForPath, field inheritance
  - [spatial.md](./docs/subsystems/spatial.md) — the containment/movement substrate in lib/spatial/ (Container/Containable/Mobile/Surfaced/Sealable): containment chokepoint, surface placement, locomotion, vessels (geometry moved to location.md)
  - [location.md](./docs/subsystems/location.md) — the lib/location/ subsystem: room/coordinate/zone geometry (Location/CartesianLocation/SphericalLocation, coordinate mixins, CartesianZone/SphericalZone, ZoneApi resolution) + the Warren elastic-graph (MultiLocation) substrate (host-as-runtime-role + migration; bud/merge; live-ref hub exits) + the lounge content in domain/lounge/ (LoungeWarren/Lounge/Bar/LoungeMixin), the `startLocation` spawn instruction + `StuffApi.singletonOrClone`, save-delegation recall
  - [boundary.md](./docs/subsystems/boundary.md) — exits, doors, Adornable/Adornment, Boundary substrate, Window, ExitableVessel
  - [bulk.md](./docs/subsystems/bulk.md) — continuous matter as a holder attribute (BulkableMixin interior/surface slots, closure scale, BulkableApi.transfer + drain-through, via.bulk + `:b` + material-keyword + `:{N unit}` measure grammar, Floor surface-bulk, fill/pour/spill/drink/sip, Creature.ingest seam)
  - [light.md](./docs/subsystems/light.md) — Light value object, VisionModality.signalAt, AmbientLitMixin, LightSourceMixin, per-viewer perception
  - [augmentation.md](./docs/subsystems/augmentation.md) — augment-confers-mixin substrate: AugmentMixin.confers(), getActiveMixins/isActive, @RequiresActive; the **three-base capability model** + aether-as-host (the AetherMixin host ⊕ AetherHostedMixin update hosting relation, findReachable self + host-descent legs, Species.innateMixins intrinsic conferral)
  - [senses.md](./docs/subsystems/senses.md) — multi-sense perception substrate: SenseChannel vocabulary, Modality singletons, PerceptionApi
  - [quantities.md](./docs/subsystems/quantities.md) — Quantity<U> substrate (Unit catalog, parse/Mml emission), QuantityMarshaller, fieldMarshallers integration
  - [perception.md](./docs/subsystems/perception.md) — viewer-aware-query pattern (`Stuff & Sensor` always explicit), Shadow seam for per-viewer overrides
  - [belief.md](./docs/subsystems/belief.md) — per-viewer identity memory: the `BeliefStoreMixin` keyed bag (recognition + identification + regard realms, `templatePath`-keyed, flag-vs-value payload) + the `RecognitionApi.describe` compose seam (viewer-aware naming, perception-gated, the central viewer-aware `Mml` ref hook) + recognition triggers (`introduce` + repeat-perception via `learnIdentity`) + `Disguisable`/`getDisguise` (creature masking, `getPresentation` deferral) + viewer-relative targeting / name-leak gate + `StatusMixin` decoration + the thin identification type axis (`IdentifiableMixin`, scroll-carried `identify`) + the **`regard` attitude realm** (per-viewer signed scalar, `RegardApi`/`RegardLogic` gated arithmetic seam, overwrite-not-raise, reverse `{realm,referent}` index — the first brick toward reputation, consumers deferred) + lazily-hydrated `beliefs`-collection persistence
  - [chronicle.md](./docs/subsystems/chronicle.md) — the append-only identity **ledger** (dumb store, smart consumers — the belief-store precedent): the `ChronicleEntry` Document (`chronicles` collection, one row per entry, `owner`-indexed) + the gated `ChronicleApi` / `ChronicleLogic` mint-and-read seam (`record` / `recordDeed` ProseApi+game-clock / `recordOnce` category-first / `entriesFor` owner-scoped reader / `seedClaims`), `deed` vs `claim` **by provenance**, the three singularity patterns (event-singular / category-first / repeatable), char-gen claim-seeding, the `chronicle` self-view verb (partitioned bio → prologue → deeds, never interleaved), three demo minters (enroll / first-arrival / first-introduce), `tags`/`who` persisted-but-inert; every readout (reputation / alignment / traits / achievements) a **deferred consumer**
  - [participation.md](./docs/subsystems/participation.md) — the **quantity** half of consumer influence (sibling of renown's quality half): the active-bucket `participation_events` log (anti-AFK/anti-spam dedup per `{subject,bucket}`, captured at the recognized-command dispatch tail via `CommandDispatchedEvent` from `CommandGiverMixin._emitInputEcho`) → rebuildable `participation` standing (**real-time** decay — participation measures a *human showing up*, the divergence from renown's game-time decay) → the derive-on-read consumer projection `max(0,renownOf)×participationOf` (the **D5 clamp**) banded for display (**D6**); value objects now in the consolidated `lib/standing/`, banking on the durable `templatePath` (Phase 0 re-key); the dispatch event's receive side now locked to the `ConsumerLogic`+`ProducerLogic` pair (producer shares the signal); `ConsumerApi`/`ConsumerLogic` own the faucet+projection and *read* (never own) `RenownApi`; the `standing` self-view verb (Persona-afforded). The three-stock contract + producer + conviction live in [influence.md](./docs/subsystems/influence.md); patron faucet + D2 second-order engagement deferred
  - [advancement.md](./docs/subsystems/advancement.md) — the **measurement substrate** for character growth (the "how a character grows" physics): the **Catalog** (`Discipline` pure-data leaf `Idea` keyed on a durable `key`≠templatePath, typed `requires`/`specializes`/`synergizes` edge fields + band-gated `conferrals`, in a `TopicCatalogue`-recipe `DisciplineCatalogue` singleton), the **Transcript** (`TranscriptEntry` append-only owner-indexed `Document` in `transcripts` — chronicle's *sibling*: deed/claim provenance reused, structured `{discipline,difficulty,outcome}` schema of its own), and **Competence** (a pure derive-on-read per-Discipline BKT value-object, **never materialized** — the renown divergence — difficulty-modulated Bayesian update + difficulty-gated ZPD learning, surfaced **bands-only** via `AdvancementApi.bandFor`/`bandsFor`, the honesty firewall); the **`ActSignature`** unit of credit (`{discipline,difficulty,outcome}` sub-check list + the declared-but-unpopulated `dispositionValence` cross-lane seam lane 1's traits graft onto); the **conferral** knowing→doing seam (`AdvancementMixin` outermost on `Character` re-pushes Catalog-declared verbs onto the affordance stack on every append, sourced from the catalogue); the gated `AdvancementApi`/`AdvancementLogic` split (`PersistApi`/`lint:pm`); and the proof harness (author `practice`, bands-only `competence` self-view, conferred `flourish` placeholder + a 6-node Dave's-Bar seed Catalog); loadout/guilds/stakes/graph-propagation/estimator-tuning all deferred
  - [trait.md](./docs/subsystems/trait.md) — the **personality layer** (traits = *competence for dispositions*, advancement's architecture applied to character): the 17-axis opposed-pair `Disposition` roster (`lib/trait/`, CK3 personality core + 3 reframed + `curiosity`), the `DispositionEntry` ledger (`disposition_events`, owner-indexed — the Transcript's **sibling**), and the pure derive-on-read `TraitPosition`/`TraitBand` estimator (game-time-decayed clamped signed sum → position; evidence mass → form→define→entrench band; **entrenchment-resists-drift emergent via the clamp**, no stored trait field, no Character mixin); populates+consumes the shared `ActSignature.dispositionValence` channel (no advancement→trait edge); the gated `TraitApi`/`TraitLogic` (`/obj/api/trait`); **compatibility → regard baseline** (derive-on-read fallback owned by the trait layer; belief untouched, trait→belief one-way); cast personality via `BehavedMixin`-seeded `claim` evidence (the behavior→trait edge); the `converses` demonstrator brain (traits visibly driving speech); the `traits` self-view (pole+band, never a number); AppSettings dials; stress/composure (job 3) deferred to `traits-stress`
  - [renown.md](./docs/subsystems/renown.md) — the measured-standing substrate (the "quality" half of `engagement × renown`; output never input): a two-layer store — the append-only scope-tagged `RenownEvent` log (`renown_events`, raw pre-valence signal, **both clocks** `at`/`realAt`) → the rebuildable `RenownStanding` per-`{subject,scope}` aggregate (`renown`, warmed sync cache, `'*'` = cooperative-wide) — behind the gated `RenownApi`/`RenownLogic` (`append`/`eventsFor`/`recompute`/`renownOf`/`boot`); value objects now in `lib/standing/`, `subject`/`source` keyed on the durable `templatePath` (Phase 0 re-key, `stuffId` stays a live handle); **sibling of `regard`, not child** (recompute never reads belief); two signal kinds — `reaction` (taps `ReactionFiredEvent`, **per-emote `Emote.valence`**, linear) + `reception` (passive being-heard, `CommReceivedEvent` from `SensorMixin.onMessage` *after* `filterMessage`, topic-gated via `MessageApi.isCommunicative`'s `communicative` flag, `ReactionApi.actInfo` speaker-recover, `(speaker,listener)` dedup, **log-saturated** `receptionValence × ln(1+Σ)`); value-function = per-emote valence + scalar AppSettings dials (decay/quality/context/reception) split by **entrenchment tier**; **derive-don't-track** per-scope (locality via `AddressApi` + `GroupApi.sharedManagedGroups`, two projections); real-time `ScheduleApi.recurring` recompute; persistence via the **`PersistApi`** chokepoint (`lint:pm`-locked); renown's own readers stay; influence consumers in [influence.md](./docs/subsystems/influence.md)
  - [influence.md](./docs/subsystems/influence.md) — the three-stock influence substrate (the consolidated `lib/standing/` home): the `InfluenceStanding`/`Band`/`Stock` output contract + the thin `InfluenceApi` dispatcher (`'consumer'`→ConsumerApi, `'producer'`→ProducerApi, `'patron'` reserved-zero); the **producer (make) stock** (`ProducerEvent`/`ProducerStanding`, `ProducerApi`/`ProducerLogic` at `/obj/api/producer` — **engagement-only** no `×regard`, `{author,actor,bucket}` dedup, A≠P self-credit exclusion, real-time decay, rebuildable, routing key = author `templatePath`) tapping the **shared** `CommandDispatchedEvent` (now carrying `location`/`actorTemplatePath`) + the `restrictSubscribe` two-consumer **pair clobber-fix** (both taps assert `(ConsumerLogic,ProducerLogic)`); the **conviction spend half** (`Position`/`ConvictionTally`, `ConvictionApi`/`ConvictionLogic` at `/obj/api/conviction`: `hold`/`flip`/`drop`/`abstain`/`positionOf`/`tally`/`quorumWeight`; derive-on-read ramp `clamp01((now−realSince)/buildPeriod)`, flip resets; **full-weight/no-pool**, **non-fungible per stock**; present-row = vote cast → quorum, abstain = net-zero present, `quorumWeight` = Σ full standing conviction-independent vs `tally` = Σ standing×conviction×net; no verb yet); the `standing` self-view → three bands; producer's authorship input in [provenance.md](./docs/subsystems/provenance.md). Patron / ballot / chambers deferred
  - [provenance.md](./docs/subsystems/provenance.md) — the authorship ledger + un-spoofable attribution (first brick of the provenance substrate; see `docs/slates/builds/provenance-slate.md`): the append-only `AuthoringEvent` ledger (`authoring_events`, indexed `path`+`author`) behind `ProvenanceApi`/`ProvenanceLogic` at `/obj/api/provenance` (`recordAuthoring`/`authorOf`=earliest-row/`eventsFor`) — **authorship derived, never a mutable stamp**; the **context-derived author** (`ExecutionContextApi.getActingAuthor` — in-world command-frame giver requiring non-forced + single-consistent giver, or the REST `tagActingAuthor` metadata stamp decoupled from the frame's security `target`) — never caller-supplied, never the `data` blob; the **centralized gated writer** (`recordAuthoring` gated `FromTemplate('/obj/api/template')` — the single `TemplateApi.saveTemplate` chokepoint both the in-world verbs and the REST CMS funnel through; author resolved DB-free first so a non-authoring save is a pure no-op); the cross-worktree CMS contract (build-2 calls `tagActingAuthor` in its `runRoot` boundary; until then CMS writes are safely unattributed); `CreditRouting.resolve` (covering-zone author via `ZoneApi`→`authorOf`, the released gate — only `/home/` unreleased, `/obj/`+`/domain/` released, v1 single owner behind a `CreditShare[]` team-split seam) — the producer faucet's routing input
  - [crafting.md](./docs/subsystems/crafting.md) — the transformation stage of the economy (v1 = the served path at Dave's Bar): the **location-agnostic** craft-resolve (`recipe + maker + reachable tools/inputs + fixed control → stamped output`; no `CraftingVenueMixin`, feasibility is emergent reachability), the `lib/craft/` substrate — `Grade` ordinal value-object (weakest-link `deriveAtFixedControl`) + `ToolCapability` vocab + five mixins (`GradedMixin` band-word carrier, `ToolMixin` wear-on-use durable-good, `CraftedMixin` per-instance un-spoofable maker's-mark + DF-style `renderVerdict` never-a-number, `MakerMixin` order-fulfiller marker, `ManualBuildMixin`/`Builds` vessel-as-buffer for the by-hand path); `Recipe` as a **`Document`** (`recipes` collection, the Emote pattern — not a template) + `RecipeCatalogue` singleton (ungated, the `TopicCatalogue` precedent) + `RecipeSeeder`/`config/recipes.yaml`; the gated `CraftingApi`/`CraftingLogic` pair (`craft`/`lookupRecipe`/`offeredRecipes`, `CraftRequest{recipeRef, makerMode, brand}` — **no principal**, maker derived from `getActingAuthor`, `'fulfilling-bartender'` world-resolves the present `isMaker` agent) with the `craftImpl` algorithm + the two domain seams (`applyBulkOutput`/`consumeBulkInputs` — conservation asserted, transform-only, assembly/cooking/smithing are new branches); the `Menu` offer object (`domain/lounge/`, lights up `menu`/`order`/`serve`/`mix` via `commandContributions`); the **by-hand manual build** (`pour`/`add`/`stir`/`shake`/`strain`/`garnish` as `ManualBuildStep` engaged activities on the `'hands'` slot — the activity substrate's first durative-verb consumer; `CraftingApi.mintFromBuild` reverse-matches the buffered contributions to a recipe — exact slot set, no leftovers — and reuses the one quality model; off-spec → generic mint, `recipeId=''`; the demonstration-capture substrate for scripting); drink→metabolism via honest alcohol; the `ContainmentApi.looseContents` surface-presentation rule (resting items aren't loose, drill-in via "On it:"); Dave's Bar authored as content (classes homed in `lib/`/`domain/lounge/`, seeds self-stocked via `populates: onto`)
  - [corpo.md](./docs/subsystems/corpo.md) — the **mark substrate**: the fictional megacorps + their product brands as authored reference-identities, a **brand→corpo** ownership resolution, and a per-product **mark** so every branded thing is *truthfully owned* ("a product of Veshko"). Two pure-data leaf `Idea` tiers — `Corpo` (`key`/`sector`/`ethos`/`aesthetic`/`temperament` + a typed `rivals` fault-line edge, authored-but-inert — the Discipline-edge precedent) and `Brand` (`key`/`name`/`owner` corpo-key + `category`/`positioning`/`descriptor`; **`owner===''` = independent**, resolves to a null corpo — Crowsfoot Gin, "the independents" as the absence of an owner edge, no `Independent` pseudo-corpo) — keyed on durable `key`≠templatePath, read from `template.data`, **never cloned**. The advancement three-part split: `CorpoCatalogue` (data-cache singleton, two descriptor maps + a precomputed **portfolio forward-edge index**, `bootstrapManifest`-warmed) → `CorpoLogic` (`/obj/api/corpo`, gated `FromModule('mud/api/corpo#CorpoApi')`, **no connection guard** — reads only the in-memory catalogue) → `CorpoApi` (forwarding shell: `corpoOfBrand`/`corpoOf`/`brandOf`/`portfolioOf`/`rivalsOf`/`listCorpos`/`listBrands`). The mark is `BrandedMixin` (`_brandKey` durable join, resolve-on-read via `CorpoApi` — the `Material` cross-ref pattern; MQL-visible via `subscribableFields` `brand`/`corpo` projection, **not** a `PropertiedMixin` prop; a derived "a product of <Corpo>" `markupAugmenters` line on the long description) + `BrandedBottle`=`BrandedMixin(Thing)` the proof-demo class (branded object only — **not** `Bulkable`, booze-as-bulk is the bar build). The mark is **diegetic brand-ownership, orthogonal to the `AuthoringEvent` provenance ledger** (real-world template authorship). Player-facing approval vector / faction gameplay / sponsorship / portfolios-beyond-booze all deferred
  - [banking.md](./docs/subsystems/banking.md) — the **monetary substrate** (phase 4 of the Dave's-Bar track): two-tier money — **cash** (`Coin`, a massed `Globbable`; the cap is honest physics) vs **account balances** (the `lib/standing/` append-only-log → rebuildable-warm-cache shape, in `lib/banking/`) — with the one hard addition **conservation**: total supply changes only by a central-bank mint/drain, enforced at the sealed module-private `postTransaction` chokepoint (the only writer of `bank_ledger` / `bank_accounts`), every leg structurally validated by `BankTransaction` (a non-mint/drain leg touching the issuance sentinel throws). The gated `BankingApi`/`BankingLogic` pair (`/obj/api/banking`); `Money` value-object (integer minor units, never a worth on a good — Law 1); `Account` id-vocabulary (issuance + cash-bridge sentinels, CB account); `SupplyAggregate` O(1) headline; `CentralBank` singleton. **Custodial bank** (`BankMixin` on a `BankCounter` fixture in the branch — a Location's own contributions don't reach occupants; corpo-affiliated via `corpoKey`/`CorpoApi`; 1:1 vault==Σ balances; till-bounded withdraw): open/deposit/withdraw/transfer by **identity** (`{owner,bankPath}` key, no number typed, first account primary). **Uniform settlement** (`settle(Charge, method)`: cash off-ledger / credential on-ledger + remittance-split seam + `--from` override) over the **credential** — now a `payment` *record* in the unified `CredentialWalletMixin` (see [credential.md](./docs/subsystems/credential.md)): `PaymentCard` Thing ⊕ the born-with `CredentialWalletUpdate` wallet app; `findReachable` keyed on `isCredentialWallet`, implant-first, skips frozen; the freeze/cap/reissue risk ladder. **Tabs** (`TabMixin` on the venue Location, recognition-gated via `RecognitionApi.recognizes`, skip→`RegardApi` hit+revoke), **wages** (`payWage`), the **demo sales tax** (seller→treasury at the inert `banking.salesTaxRate`), the **deficit P&L** (`profitAndLoss`, red by design + logged CB `subsidy`), and the two reporting consumers (`profitAndLoss` + `moneySupply`/`reconcile`). The bar loop is wired live (`OrderController` settles the Menu's authored `priceFor` as a presented Charge). Lending / governed reserve / employment relationship / live taxation / player-banks all deferred
  - [collections.md](./docs/subsystems/collections.md) — canonical surfaces for collection-shaped mixins (Set/keyed Map/ordered list/property bag), naming axes
  - [hot-reload.md](./docs/subsystems/hot-reload.md) — HotReloadApi state machine, StuffApi.clone integration, lifecycle events, controller dispatch
  - [content-packs.md](./docs/subsystems/content-packs.md) — content as a versioned, shippable deliverable (the long-term `SeederManager` replacement): pure-data `@saxonberg/content-*` packages (file = source-of-truth, DB = derived install, `content/` mirrors the template-path namespace), the gated `PackApi`/`PackLogic` reconcile installer (discovery from `server` deps, per-row `sourcePack` stamp, **adopt-don't-wipe** migration of legacy unstamped rows, content-kind dispatch domain-templates + quantity-table, the derived `requires-kernel` class-resolve check = the content-pack ↔ mod boundary), boot install pass coexisting with `SeederManager` + the runtime `pack sync` re-hydrate loop, `replace`-vs-`seed-missing` policy seam; v1 = base-library (materials/biomes/units)
  - [race.md](./docs/subsystems/race.md) — Material substrate, Clade taxonomic scope, BodyPlan + Species templates, OrganismMixin, SexedMixin, animacy gating
  - [vitals.md](./docs/subsystems/vitals.md) — body-state substrate (no stored health scalar): the `Agent→Creature→Character` body/agency split, `VitalsMixin` (vital-sign Quantity fields, per-species `vitalProfile`, derived `getConditionBand`/`getConsciousness`), `BodyPlan` typed anatomy + tissue composition + slot↔part relations, the two-kind condition type system, death/consciousness seams. Models only — drivers/content/verbs deferred
  - [reserve.md](./docs/subsystems/reserve.md) — generalized `Reserve` capacity-axis substrate (`lib/reserve.ts`, top-level, next to quantity): `ReservedMixin`, decomposed-scalar persistence, biological reserves (endurance/satiation/hydration) + the authored-thematic seam (mana is content, never an engine word)
  - [encumbrance.md](./docs/subsystems/encumbrance.md) — the carry-weight gauge + consequences (first vitals driver): `LoadBearingMixin` (derived-on-read `getBorneBurden`/`getCarryCapacity`/`getLoadRatio`), the weighted tree-walk over both stores with `Vessel.transmissionFactor` + slot-derived placement coupling, `BodyPlan.baseMass` mass-seeding, `Vessel` reconception (container-object at any scale; `Adornable` narrowed to `ExitableVessel`), the consequence ladder (lift gate in `GetController`, locomotion veto + traversal drain at the `LocomotionApi` seam — move substrate stays agnostic), recovery deferred to metabolism
  - [metabolism.md](./docs/subsystems/metabolism.md) — the intake-and-chemistry driver (`MetabolicMixin`, no Api): the digestion buffer (per-tag pools + verb-determined solid/liquid sub-volumes + overeat cap), the lazy sub-stepped reconcile-on-read over `WorldClock` game-time (absorption / mass-scaled basal drain / **coupled recovery** burning satiation+hydration to rebuild endurance, hydration the tighter leash, posture × `restQuality`), the cascade that makes metabolism the first condition-*driver* (floored reserve → `starvation`/`dehydration`/`collapse` + death seam; `requiresConscious` gate), the in-session clock + presence freeze (linkdead + far-past guard, zero connection work), and Wave 2 meal chemistry (macro routing, the toxin-burden system + per-toxin banded conditions via `Condition.toxinBehavior`, alcohol/`getBAC` exemplar, `eat`/`vomit` verbs, antidote = accelerated clearance, `NutritionLabelMixin` label render); the `thermalMultiplier` Q10 seam is now lit by the thermal build (see [thermal.md](./docs/subsystems/thermal.md)) and the `spo2Throttle` seam by respiration (see [respiration.md](./docs/subsystems/respiration.md)); inert seams remain for protein-healing/deficiencies
  - [thermal.md](./docs/subsystems/thermal.md) — the heat-exchange substrate + third vitals driver (`lib/thermal/`, no Api): the generic `ThermalMixin` (lazy Newton's-cooling-on-read mirroring metabolism; SYNC `getTemperature` via the **cached ambient** `lastAmbientK` refreshed only at re-stamp events — move/`onMoved`, ambient-shift fan-out, seal toggle, bulk transfer; τ = R·C from Tangible mass × Material `specificHeat` and the medium/wall conductivity series; sealed `Sealable` → vacuum barrier τ-in-hours, open → air τ-in-minutes), the thermos (`Flask` = Sealable+Bulkable+Thermal, C-from-contents, calorimetric blend on `BulkableApi.transfer`), corpse algor mortis (Thermal on `Creature`), `feel <object>` surface-vs-contents gate + the general scalding-band `burn` hook, the campfire (`Campfire` = Thermal+LightSource+Postured+Reserved-fuel, pinned-hot-while-fueled → embers-on-burnout), and Phase 2 `ThermalRegulationMixin` (Option-C dead-band driving `coreTemperature` via a SYNC `getVitalSign` override + cached `effectiveAmbientK`; spend satiation/hydration to defend the setpoint, wet-bulb ceiling, worn `clo` on `WearableMixin`, warming-slot `warmth`, endo/ecto split + Q10 lighting metabolism's `thermalMultiplier`, the hypothermia/hyperthermia/torpor cascade + death seam)
  - [respiration.md](./docs/subsystems/respiration.md) — the air-exchange + asphyxiation driver (`RespirationMixin`, no Api): the **first concrete engagement producer**, an event-triggered crisis driver that finally **drives `spo2`** to the death seam via one bounded, cancellable `SustainedEngagement` drain (the medium trigger — air-breather drowns in `water`/`vacuum`) + a sibling recovery, the `breathableMedia`/`respires` opt-out on `BodyPlan` (water-breather inversion), the free consciousness-blackout reuse + the `asphyxiation` anoxia cascade, the biome `breathable` column + laid-unread `contaminant`, the `inhale`/`exhale` breath-hold verbs, the move/in-place reassess triggers (traverse hook + per-emission re-resolve), the linkdead/far-past presence freeze, and Wave 2's carried-air `AirTank` (worn `Bulkable` tap/deplete/suffocate + `BulkableApi.transfer` refill + projected gauge); gills + the channel/strangulation trigger + contaminant reader deferred
  - [shell-workspace.md](./docs/subsystems/shell-workspace.md) — WorkspaceMixin cwd state, workspace.tree setting, synthetic vars, read/write verb suite, SourceTreeApi
  - [shell-author.md](./docs/subsystems/shell-author.md) — AuthorMixin lifecycle and code-execution verbs (clone/reload/destruct/eval/teleport), EvalScript sandbox, forceX shape
  - [document-store.md](./docs/subsystems/document-store.md) — the **third path-addressed tree** (source/template/**document**): the generic owner-claimed JSON store a user claims a branch of and fills, tagged with a **`kind`** (what kind of object lives there). `StoredDocument` (`documents` collection, `{path, owner, kind, data}`, kind-agnostic — the store never inspects `data`) + the thin gated `DocumentApi`/`DocumentLogic` (`read`/`list`/`save`, owner-from-context, **self-home ownership** base case — an owner owns their own `/home/<self>/` branch — then zone/slice-walk, provenance via the broadened `recordAuthoring` gate). Scripts are one kind (`kind:'script'` `data:{source}`; ScriptLogic keeps the AST cache + go-live, delegates storage); dorm customization the deferred next consumer
  - [cms.md](./docs/subsystems/cms.md) — the content-authoring surface (Wave 1: shell + code editor): the REST-only CMS tab of the SPA (`?surface=cms`, shared session, no WS), the unified-tree projection over **three** backends (content templates via `TemplateApi` + source files via `SourceTreeApi` + the **document** store via `DocumentApi` — scripts + future owned-JSON kinds, the record's `kind` driving the editor treatment; backend-discriminated refs, no merged namespace), the thin gated `CmsApi`→`CmsLogic` forwarding shell (gating mirrored verbatim from `WriteController`), the REST data API + the **session→`runRoot` attribution bridge** (`CmsSession.runAsSessionPlayer` — writes attributed to the in-world session Avatar, fail-closed on none) + CSRF, the template-vs-source **save go-live split** (source → `HotReloadApi.reload`; content → re-hydrate live clones via `restoreFromTemplate`), the lazy-loaded local-bundled **Monaco** editor; dev-tier, writes HEAD directly (no versioning); lease model / holodeck / op-log / content-editors / LSP / the law==code forums-review publish gate all deferred
  - [perceiver.md](./docs/subsystems/perceiver.md) — PerceiverMixin (look/scry/locate verbs on the actor), Sensor/Visible/Perceiver split, ScryableMixin
  - [slot.md](./docs/subsystems/slot.md) — Slotted/Slottable substrate, three universe patterns, accepts + fitsSlot, capacity, SlotApi
  - [embodiment.md](./docs/subsystems/embodiment.md) — Wearable/Wieldable body-side affordances, per-body-plan slotClaims, multi-slot atomicity
  - [posture.md](./docs/subsystems/posture.md) — Postured (host) + Posed (actor) + Postures vocabulary, posture-bearing slot, sit/lie/stand/kneel
  - [conveyance.md](./docs/subsystems/conveyance.md) — Mountable/Drivable/SeatedDrivableMixin, Mobile.traverse conveyance ripple, mount/dismount, vehicle design space
  - [locomotion.md](./docs/subsystems/locomotion.md) — LocomotionMode singletons, Climbable/Swimmable/Flyable enablement, LocomotionApi, per-mode verb controllers
  - [fasttravel.md](./docs/subsystems/fasttravel.md) — teleport-transit network (the Teleport Authority): `FastTravelMixin` node (directed routes, per-terminal authoring, live-singleton reads, departures board, world-clock timetable) + the `travel` credential (now a record in the unified `CredentialWalletMixin` — see [credential.md](./docs/subsystems/credential.md): `TravelCard` + the born-with `CredentialWalletUpdate`, registered-set, born-with University Avenue floor, session-durable), dual-mode `teleport` verb (self-powered privileged vs TPA ride) + terminal-contributed `register`, scan-to-register unlock; distinct from locomotion
  - [credential.md](./docs/subsystems/credential.md) — the **unified credential substrate** (one holder, credentials-as-data — stop the per-credential mixin sprawl): the `Credential` value-object family (`CredentialKind` vocab + `PaymentCredential`/`TravelCredential` records carrying authorization state + serialize/`mint`/`fromData`, NOT `Stuff`), the dumb-store `CredentialWalletMixin` (keyed `getCredential`/`ensureCredential`, the `credentials` persistence accessor, `defaultCredentialKinds` born-with seeding), the three holders (the born-with `CredentialWalletUpdate` aether app replacing the `PaymentImplantUpdate`+`TravelCredentialUpdate` twins; thin per-kind `PaymentCard`/`TravelCard` Things), the **affordance-on-holder ⊕ authorization-in-record** split (the wallet/card afford the verbs via static `commandContributions`; the records gate them, read by `BankingApi`/the TPA fork), resolution re-keyed to `MixinApi.isCredentialWallet` + a record-presence/`!frozen` filter (same either-base, frozen-skip scan), born-with via one `installDefaultLoadout` host; session-durable v1; deputization tenant + the issuer-authorization ledger (validity derived, the record a *presentation*) + a single `CredentialCard` + a thin `CredentialApi` all deferred to the slate
  - [glob.md](./docs/subsystems/glob.md) — fungible stacks: GlobbableMixin (quantity), GlobbableApi (split/merge/applyQuantity), MQL quantity surface
  - [response-envelope.md](./docs/subsystems/response-envelope.md) — DispatchResponseEnvelope wire frame, 16 Note kinds, Status auto-escalation, CommandContext accumulator
  - [activity.md](./docs/subsystems/activity.md) — engagement framework: SchedulerApi, EngagedMixin on Character, four engagement slots, AbortReason vocabulary
  - [behavior.md](./docs/subsystems/behavior.md) — NPC behavior (first *behavior* consumer of activity): the branch-agnostic `BehavedMixin` running a declarative `behaviors:` data-spec list (`{brain, trigger, config}`); **brains as a new module category** — path-resolved, lazy-loaded `export const brain = class {…}` strategy modules (named class-expression so the HMR registry retains them), **re-resolved per fire** via `StuffApi.resolveExport`/`resolveExportSync` so editing a brain hot-reloads into a live NPC's next action; triggers = jittered presence-gated **cadence** (`ScheduleApi`) + **witness** (`SensorMixin.handleMessage` — arrival/departure via room-delta, emote/speech via `meta.commandId`→`ReactionApi.actInfo`), **no new global events**; slot contention over `EngagedMixin` (`claims`/`requiresFree`, `BehaviorBeat` slot-holder, witness-preempts-cadence); the thin `NPC` = `BehavedMixin(PostRegistrationMixin(Character))` class (keeps behavior off Avatars); the canned brains (idles/random-chatter/wanders/patrols/greets/reacts/shifts, plus the dialogue `tree-dialogue`/`introduces` — see npc-dialogue.md); the `engage` trigger (wires nothing) + the `open` responder seam; speech brains declare `requiresFree` so they fall quiet while the host is mid-conversation; CMS save-gate brain-path validation; path-based dev isolation
  - [npc-dialogue.md](./docs/subsystems/npc-dialogue.md) — the branching-tree dialogue responder + the `talk to` responder seam: the `talk`/`converse` verb → a `Behaved` host's `engage`-triggered spec → the brain `open` seam → the `DialogueConversation` `SustainedEngagement` state machine (both-sides voice+attention hold via a companion `DialoguePartnerHold`; detached choice-loop via `ScheduleApi.schedule`+`runRoot`; co-presence/disconnect/terminal teardown); the pure-data tree format (`lib/npc/tree.ts` interfaces + guard fact-namespace + registered effect-verb set + `DialogueTreeSchema.validate`; opaque `config` on the spec, no `dialogue` collection/Stuff); interior-private `PromptApi.choice` wheel ⊕ exterior room-visible `say` (**choosing interior, speaking exterior**); discoverability via the first-class **`InstanceContributor`** per-instance affordance seam (`BehavedMixin` affords `talk` iff it carries a tree); CMS save-gate tree validation; the **auto-introduce** feature (`SoulMixin.introduceSelf` + `RecognitionApi.recognizes` + the `introduces` NPC brain + the `social.autoIntroduce` PC setting + `Mobile.autoIntroduceOnArrival`, so you learn who you're talking to); the client pinned-named prompt + numbered hover-preview choices; the `lib/npc/` NPC-only scope home; deferred scripted/LLM responders
  - [biome.md](./docs/subsystems/biome.md) — atmospheric substrate: Biome extends Idea, AtmosphericMixin, outward-walking chain resolver, SkyExposedMixin, six instruments
  - [address.md](./docs/subsystems/address.md) — addressing-foundation substrate (delivery unit 1): the rooted address namespace independent of templatePath/zones, the reified `Locality` tier (claims a prefix, the weather-bearing node), `AddressableMixin` on Location, the four-step longest-prefix resolve-walk (containment-outward → zone fallthrough → `PathTrie.longestPrefix` → null) mirroring biome's chain, `AddressApi`/`AddressLogic`/`AddressRegistry` three-tier + coverage index, `analyze address`; the null-is-global seam the deferred weather build consumes
  - [weather.md](./docs/subsystems/weather.md) — atmospheric **dynamics** driver (Wave 1): the stateless procedural weather field (`WeatherApi.weatherAt(time, locality)` pure — no sim, no tick, no stored state) over a `lib/weather/WeatherType` value-object (vocabulary + `WEATHER_PROFILES`/`TRANSITIONS`/`SEASON_BIAS`/dials) + `WeatherLogic` grammar (segment model, warmup-anchor, lead-in interpolation, per-locality seed from the covering `Locality`'s address — D1, no `Locality` field); the biome-deviation seam (`BiomeLogic.resolveQuantityFor` folds `WeatherApi.deviationFor` into the four weather-deviated fields for SkyExposed scopes only, zero-when-absent/byte-identical, soft-import no-static-cycle — D2); the thermal coupling (a WorldClock segment-boundary system schedule firing the presence-gated `onBoundary` restamp fan-out via `BiomeApi.restampThermalContentsOf` — cache invalidation, not a tick — D4); activation = `WeatherLogic` singleton presence (`isActive`); `analyze weather` + the weather-deviated Barometer (D6); cloud/precip→wetness/light, authored climate, vector wind deferred to Wave 2
  - [time.md](./docs/subsystems/time.md) — game-time substrate: WorldClockApi, SchedulerApi riding game-time, CelestialApi, DefaultCalendar
  - [app-settings.md](./docs/subsystems/app-settings.md) — application-managed config: AppSettings singleton Document (`app_settings`, open `values` bag) + the `AppSettingKeys` key vocabulary, values seeded from `mud/config/app-settings.yaml` by a backend `AppSettingsSeeder` (no code defaults), AppApi runtime surface (sync cached reads, no boot method), `AppSettings.warm` at boot, the developer-gated `config` verb; the `defaultStartLocation` + `evacuationFallback` knobs that retired `config/constants.ts`

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
pnpm docs                # docs:server THEN docs:project
pnpm docs:server         # TypeDoc over packages/server -> HTML + JSON
pnpm docs:project        # three-tier author-surface projection over api-model.json
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

### The author-surface projection (three tiers)

`pnpm docs:project` (`packages/server/scripts/project-author-surface.ts`)
reads `api-model.json` and emits `author-surface.json` — the model the
in-game `help api` browser / web view will read — partitioned into the
three tiers that realize the **`callable == visible == cared-about`**
invariant:

- **consumer** — what an author *calls*: public `static` methods of
  `*Api` classes + public instance *methods* of author-facing
  Stuff/mixin classes (fields and accessor pairs excluded — the
  inter-stuff "methods are the contract" rule as a doc filter).
- **extension** — what an author *implements* and the framework
  *invokes*: members carrying the **`@hook`** TSDoc block tag (added to
  `typedoc.json`'s `blockTags`), rendered with their override contract.
  Override hooks (`onDestruct`, `canDestruct`, `postRegister`,
  `aroundSave`/`aroundDelete`, `onLinkdead`, the Hydrator `apply<Field>`
  appliers) are public + ungated + **ungateable** (a subclass's
  `super.onDestruct()` is author code, so a framework gate would deny
  the super-chain) — so they need the human-placed `@hook` marker, not a
  policy. The `@hook` contract is authored **once** on the canonical
  declaration; the ~190 override sites are matched **by name** in the
  projection (TypeDoc's `overwrites` link carries no resolvable id), not
  re-tagged at every site.
- **internal** — `@internal` reflections (every logic singleton, every
  framework-primitive Api) — already dropped by TypeDoc
  (`excludeInternal: true`); the projection drops any stragglers.

The "types" tier is *computed*: the transitive closure of I/O types in
the consumer + extension signatures, wherever they physically live —
which is why home-finding for a type is decoupled from its
discoverability.

### The lint family

- `pnpm lint:gates` (`scripts/check-gate-strings.ts`) — every concrete
  `FromModule`/`FromController` string and `*_MODULE_ID` constant
  resolves to a real module + export. CI-gating. Implemented as a
  **script**, not an ESLint rule, because ESLint 8's legacy config can't
  load a local rule without `--rulesdir` (which breaks editor / ad-hoc
  eslint).
- The projection's **re-export report** (above) — advisory (WARN),
  scoped to `mud/api/` author faces: flags faces that speak a named type
  but don't re-export it. Residual gaps are capability/mixin interfaces
  that ride their own concept's face.
- **Sealed-subdir isolation** (`.eslintrc.js`, `no-restricted-imports`,
  error) — only `api/<x>.ts` may import from `api/<x>/**` (`mql`, `mml`
  today).

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
before creating it.** The `Api` is the dev-facing surface — a thin,
typed, gated forwarding shell; protection-needing internal logic is
`Stuff`-shaped (the `obj/api/<X>Logic.ts` logic singleton). Do not
create free-floating helper modules.

| Category | Where | Filename | Purpose |
|---|---|---|---|
| Stuff class | `lib/<subsystem>/` or `obj/` | `PascalCase.ts` | Runtime classes extending Stuff/Idea/Thing/etc. |
| Mixin | `lib/<subsystem>/` | `PascalCase.ts` (no `Mixin` suffix) | Class-factory mixin; export `FooMixin`, marker `_mixinName = 'FooMixin'`. |
| Brain | `lib/behavior/` | lowercase `verb.ts` | Path-resolved stateless strategy module for NPC behavior. Sole export `export const brain = class {…}` (a **named class-expression** so the HMR registry retains it), statics `label`/`claims`/`requiresFree`/`act`. No class name, no registry; re-resolved per invocation for HMR. See [behavior.md](./docs/subsystems/behavior.md). |
| Named value-object / vocabulary / registry | `lib/<subsystem>/` (or top-level `lib/`) | `PascalCase.ts` / lowercase | A substrate primitive that isn't an instanceable Stuff but IS the module's one concept: value class (`Light`, `Quantity`), enum-like vocabulary + its validation array, or a platform registry (`lib/mixin.ts`, `lib/paths.ts`). The home that kills the `types.ts` reflex. |
| Api | `api/` | lowercase `feature.ts` | Static `FeatureApi` — a thin, typed, gated **forwarding shell**; ends with `SecurityApi.decorateApiClass(FeatureApi)`. Exports only the class + its call-shape types (nothing instanceable). |
| Api logic singleton | `obj/api/` | `PascalCaseLogic.ts` | Stateless `Stuff` (`extends Idea`, no `PostRegistrationMixin`) holding a convertible Api's logic + protected internals; `@internal` on the class, methods gated `FromModule('mud/api/<feature>#<Feature>Api')`; HMR-able at `/obj/api/<feature>`. The `FooApi` statics forward here. |
| Controller | `obj/command/<category>/` | `PascalCaseController.ts` | Command controller (MVC pair with a YAML view in `mud/cmd/<category>/`). |
| Command YAML | `mud/cmd/<category>/` | lowercase `verb.yaml` | The view side of a command. |
| Hook | `obj/hooks/` | `PascalCaseHook.ts` | PM `aroundSave` / `aroundDelete` hooks. |
| Decorator | `lib/security/` | `decorators.ts` / `PascalCase.ts` | Decorator factories (`CallSecurity`, `Unshadowable`, `Final`, `Shadowing`, `ShadowSecurity`, `RequiresActive`). A decorator is a function by nature — these files are the only home where `export function` is the *concept*, not a stray helper. |

"Pure helper functions that don't need security" is NOT a reason to
dodge the Api pattern — Apis hold static utility methods perfectly
well, and the security decoration is cheap. Same for refactor splits:
extracting helpers into a new free-floating file is the same anti-
pattern as inventing one from scratch.

**The governing invariant: `callable == visible == cared-about`.** An
author can call exactly what they can see in the generated docs, and
nothing else — the call-security policy *is* the doc-visibility policy.
The author surface is three tiers: **consumer** (public Api statics +
public Stuff/mixin *methods* + the closure of their I/O types — fields
and accessor pairs excluded), **extension** (framework-invoked override
hooks, marked `@hook` because they're public-and-ungateable so the gate
can't classify them), and **internal** (`@internal`, hidden — every
logic singleton, every framework-primitive Api). See
[architecture.md § The Api ↔ logic-singleton split](./docs/architecture.md)
and [call-security.md](./docs/subsystems/call-security.md).

### Export discipline — classes & types only

The surface is **normalized**: every module exports the one concept it
defines (a class) plus the types and constants its surface speaks.
**No free-floating exported helper functions** — a would-be helper folds
into an `Api` static method, the owning class, or a value-object. Three
kinds of exported function are *recognized categories*, not loopholes:
**mixin factories** (`export function FooMixin`), **decorators**
(`lib/security/decorators.ts` + `RequiresActive.ts`), and **sealed-subdir
pipeline internals** (`api/mql/**`, `api/mml/**`). Enforced by two
ESLint rules (`no-restricted-syntax` on `api/*.ts` and `lib/**/*.ts`).

A handful of genuine **ad-hoc exceptions** exist (test-only white-box
exports; backend→mudlib DI seams). Each is marked at its site with
`eslint-disable-next-line no-restricted-syntax -- <reason>` — those
markers are the live registry; the full catalog + rationale lives in
[architecture.md § Export discipline & the sanctioned-exception
registry](./docs/architecture.md).

**Ask first before adding any new exception.** Introducing a fresh
`eslint-disable no-restricted-syntax`, or any file that doesn't fit the
[Module Categories](#module-categories--do-not-invent-new-ones) above, is
drift by definition. **STOP and get the user's explicit sign-off before
creating it** — do not add the disable / new module autonomously. The
lint failing on a new exported helper is the intended tripwire that
forces this conversation; the answer is almost always "fold it in," not
"add an exception." Once approved, record it in the registry with its
reason.

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
- **Command YAML views**: in `mud/cmd/<category>/`, lowercase
  (`perception/look.yaml`, `social/say.yaml`). Categories: perception,
  social, movement, posture, inventory, boundary, shell, author,
  system, charactergen.
- **Command controllers**: in `mud/obj/command/<category>/`, e.g.
  `perception/LookController.ts`, `movement/GoController.ts`.

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
| `obj.fullName ?? obj.name ?? 'something'` | `obj.getPresentation()` |
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
| Reading `template.data.container` from a verb to decide where a clone lands | Let `applyContainer` do it — the Hydrator's Phase 2 self-places the instance during the clone cascade. Verbs `clone` post-clone and treat hydration-self-placement as Layer 3 in the precedence chain (`--into` → `--here` → self-placement → giver fallback). See `obj/command/author/CloneController.ts`. |
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
- `domain` — object templates for the CMS (Avatar, rooms, NPCs, …); rows installed from a content pack carry a top-level `sourcePack` stamp (provenance + reconcile key — see [content-packs.md](./docs/subsystems/content-packs.md))
- `app_settings` — application-managed config singleton (`Document`)
- `world_state` — world-clock state singleton (`Document`)
- `beliefs` — per-viewer identity-memory working set (`BeliefDocument`, one doc per `{viewerId, realm, referent}`)
- `chronicles` — per-character append-only identity ledger (`ChronicleEntry`, one doc per entry, indexed on `owner`)
- `transcripts` — per-character append-only advancement evidence ledger (`TranscriptEntry`, one doc per sub-check, indexed on `owner`; Competence derives on read over it, never stored)
- `disposition_events` — per-character append-only disposition-valenced-act ledger (`DispositionEntry`, one doc per sub-check, indexed on `owner`; the trait-position derives on read over it, never stored — the Transcript's sibling)
- `renown_events` — append-only scope-tagged renown signal log (`RenownEvent`, one doc per signal, indexed on `subject` + `{subject, at}`)
- `renown` — materialized per-`{subject, scope}` renown standings (`RenownStanding`, a rebuildable cache; indexed on `{subject, scope}`)
- `participation_events` — append-only active-bucket log (`ParticipationEvent`, one doc per `{subject, bucket}`, indexed on `subject` + `{subject, bucket}`)
- `participation` — materialized per-subject participation standings (`ParticipationStanding`, rebuildable cache; indexed on `{subject, scope}`)
- `producer_events` — append-only attributed-engagement log (`ProducerEvent`, one doc per `{author, actor, bucket}`, indexed on `author` + `{author, actor, bucket}`)
- `producer` — materialized per-author producer standings (`ProducerStanding`, rebuildable cache; indexed on `{subject, scope}`)
- `authoring_events` — append-only authorship ledger (`AuthoringEvent`, one row per authoring act, indexed on `path` + `author`)
- `positions` — held conviction stakes (`Position`, one doc per `{subject, stock, target}`, indexed on `{subject, stock, target}` + `{stock, target}`)
- `recipes` — authored crafting knowledge (`Recipe` Document, one doc per recipe, unique index on `recipeId`; the `emotes` precedent — reference data, not a template, never cloned), managed by the `RecipeCatalogue` singleton
- `documents` — the path-addressed **document store** (`StoredDocument`, one doc per `{path, owner, kind, data}`, keyed on `path`; the generic owner-claimed JSON tree — scripts are `kind:'script'` `data:{source}`, dorm customization a future kind). Behind `DocumentApi`/`DocumentLogic`; see [document-store.md](./docs/subsystems/document-store.md)
- `bank_ledger` — append-only banking system of record (`LedgerEntry`, one doc per transfer leg, indexed on `fromAccount` / `toAccount` / `kind` / `at`); the only writer is `BankingLogic.postTransaction` (the sealed conservation chokepoint)
- `bank_accounts` — materialized account registry + balance (`AccountBalance`, rebuildable cache, unique index on `accountId`, indexed on `owner` / `bankPath`); the registry fields are folded onto the balance row
- `bank_supply` — the single-row running money-supply headline (`SupplyAggregate`, rebuildable from the ledger)

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
