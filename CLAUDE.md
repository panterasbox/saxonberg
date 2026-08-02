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
- [docs/ref-shapes.md](./docs/ref-shapes.md) — how a field points at
  other Stuff, declared in `static fieldMeta` on two axes (`ref` —
  **identity** path-string vs **instance** live ref — and, for
  instance refs, `lifetime` — weak/symmetric/owned, enforced by the
  proxy get trap and destruct slot 2.5), the
  R2.1–R2.4 cleanup rules for live-ref fields, method-surface
  conventions, exemplars, antipatterns; the **identity/lineage/backing
  doctrine** (class=lineage, templatePath=identity — kind for content,
  instance for minted singletons with scheme-derived keys; a template
  ROW is a hydration source for authored content only — minted
  identities back onto `holder_snapshots` / a purpose Document /
  nothing, and a per-instance `domain` row is the anti-pattern, the
  legacy per-player Avatar row's retirement being tracked work;
  template inheritance does not exist)
- [docs/vision.md](./docs/vision.md) — product vision
- [docs/arcane-science.md](./docs/arcane-science.md) — the invented-but-
  honest science of magic (one postulate, the laws, the price list) +
  **8 binding content-authoring rules** any magic content must obey
- [docs/compact-political-science.md](./docs/compact-political-science.md)
  — the Compact as teachable political science; the sibling course
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
- [docs/vocations.md](./docs/vocations.md) — the vocations &
  industries register: the demand test, the five criteria for a real
  vocation, four gap-finding methods, and the shipped/designed/gap
  matrix by chain position
- [docs/mql-grammar.md](./docs/mql-grammar.md) — MQL grammar
  reference for players / authors writing queries (seeds, chain
  operators, filters, pronouns, examples)
- Subsystem references in `docs/subsystems/`. Each doc is the source
  of truth for its area — read it before editing. Map entries are ONE-LINE pointers by design — a build that grows a subsystem expands the DOC, never this blurb.
  - [templates.md](./docs/subsystems/templates.md) — clone pipeline, Hydrator, TemplateApi, folder/leaf invariant
  - [persistence.md](./docs/subsystems/persistence.md) — Document vs Templates→Stuff, PersistenceManager, hooks; the self-persistence spine (PersistableMixin → `holder_snapshots`)
  - [lifecycle.md](./docs/subsystems/lifecycle.md) — create/destroy choreography, construction sentinel, onDestruct
  - [residency.md](./docs/subsystems/residency.md) — object self-maintenance sweeps: self-eviction of the cold tail, `canEvict` veto, ResidencyLogic
  - [residence.md](./docs/subsystems/residence.md) — the dorm-room first home over Warren + parcels + spine; `(scope, key)` multi-instance persistence; DeferredDestinationExit; Katie
  - [state-model.md](./docs/subsystems/state-model.md) — what gets persisted; Avatar self-contained, Document track for auth/meta
  - [connection.md](./docs/subsystems/connection.md) — login/logout, WebSocket upgrade, Interactive/Login/Avatar handoff, multiplexing
  - [char-gen.md](./docs/subsystems/char-gen.md) — new-player intake: `enroll` draft machine, species dossier + NameBank, commit/spawn atomicity
  - [client-shell.md](./docs/subsystems/client-shell.md) — client front door: frame primitives, start screen, anonymous-guest path, reconnect machine
  - [cockpit-layouts.md](./docs/subsystems/cockpit-layouts.md) — server-authoritative `cockpit.layout` + `cockpit.inputModes`; watch embed; ghost command line; summoned panes
  - [messaging.md](./docs/subsystems/messaging.md) — MML, Scene composer, sensor routing, Vocal/Aether/Soul capability split
  - [message-rendering.md](./docs/subsystems/message-rendering.md) — server MML → client renderer, theme/overlay cascade, font-by-register
  - [media.md](./docs/subsystems/media.md) — `Visible.illustration` → `mediaUrl()`; MediaAsset provenance; image-generation pipeline
  - [topics.md](./docs/subsystems/topics.md) — Topic docs, TopicCatalogue, three-tier resolution, session-establish push
  - [emotes.md](./docs/subsystems/emotes.md) — SoulMixin, Emote Document + EmoteGrammar, SoulCatalogue, three dispatch paths
  - [reactions.md](./docs/subsystems/reactions.md) — act-scoped emote aggregation, fixed-cadence flush, the `react` verb
  - [grouping.md](./docs/subsystems/grouping.md) — GroupApi facade over three GroupProvider impls, GroupRef typed strings
  - [comms.md](./docs/subsystems/comms.md) — acoustic Vocal speech vs implant comms (dm/tell), AetherMixin host
  - [chat.md](./docs/subsystems/chat.md) — Channel Document, three kinds, ChannelCatalogue; rides the forums Subject layer
  - [contacts.md](./docs/subsystems/contacts.md) — per-Avatar named lists, durable identifiers only, owner-only privacy
  - [social-graph.md](./docs/subsystems/social-graph.md) — attention rules (NotifyPolicy), display-lensing, presence relay, the `notify` verb
  - [forums.md](./docs/subsystems/forums.md) — Subject layer, Board→Thread→Post + Entry tree, popularity/argument organizers, `forum_events`
  - [bulletin.md](./docs/subsystems/bulletin.md) — staff→player news ticker: Bulletin docs, BulletinBoard window, `bulletin` verb, NewsTickerPane
  - [shell-environment.md](./docs/subsystems/shell-environment.md) — EnvironmentMixin settings keyspace, lookup chain, `settings`/`var`
  - [shell-alias.md](./docs/subsystems/shell-alias.md) — per-character verb aliases, expandAliases, the `alias` verb
  - [prose.md](./docs/subsystems/prose.md) — ProseApi Liquid templating, Mml-aware output, default filters
  - [call-security.md](./docs/subsystems/call-security.md) — proxy interception, decorators, policies, shadows, participant contracts, FromController
  - [access.md](./docs/subsystems/access.md) — AccessApi predicates (wizard/archwizard/streamer axes), parcel-title ownership, the code-trust lockdown
  - [parcel.md](./docs/subsystems/parcel.md) — real-property title: ParcelRecord + chain-of-title, ParcelRegistry, `ownerOf`, `subdivide`/`transfer`
  - [sandbox.md](./docs/subsystems/sandbox.md) — the holodeck: circle-scope taint, the PM policy table, the Layer-4 boundary, the wire-body crossing + wardrobe door, the Forkable substrate, jurisdiction-targeted eval
  - [chattel.md](./docs/subsystems/chattel.md) — per-instance ownership of movables: durable `_chattelId`, stamp/transfer/ownerOf, chain-of-title
  - [furnishing.md](./docs/subsystems/furnishing.md) — owner-based persistence: `place`, the estate slice, the host skip rule, the room overlay; FurnishableRoom + the four archetypes; acreage (ground vs floors)
  - [governance.md](./docs/subsystems/governance.md) — the Office substrate: five seats, founder-default holders, the `office` verb, `requiresGovernor`
  - [civics.md](./docs/subsystems/civics.md) — diegetic government: the Government data Idea + catalogue, Locality-declared jurisdiction, derive-on-read residency, seats-as-positions, the `government` verb; the meta committee reads on CompactApi
  - [livestream.md](./docs/subsystems/livestream.md) — broadcast-feed WS principal, StreamState, `requiresStreamer`, `stream away`/`back`
  - [streaming.md](./docs/subsystems/streaming.md) — unified `watch`/`tune` over StreamerTarget; per-platform transports (Twitch/YouTube/Kick — Kick = webhook-inbound + the KickProfile provider); overlay chat forwarding
  - [twitch-relay.md](./docs/subsystems/twitch-relay.md) — [superseded → streaming.md] the Twitch transport: EventSub reader, reauth flow, RelaySpeaker
  - [properties.md](./docs/subsystems/properties.md) — PropertiedMixin, Property<T>, transient vs saved storage, masks
  - [command-routing.md](./docs/subsystems/command-routing.md) — YAML view + controller MVC, dispatch chain, validators, affordance attribution, async override
  - [command-parsing.md](./docs/subsystems/command-parsing.md) — CommandLineApi tokenizer, RawToken, `format()` round-trip, `msh`
  - [command-spec.md](./docs/subsystems/command-spec.md) — author guide for verbs: YAML shape, controller refs as paths, domain-local commands, categories
  - [scripting.md](./docs/subsystems/scripting.md) — command-native interpreter: wrap-not-replace parser, generator Interpreter, game-time Coroutine, `def`/`make`
  - [mql.md](./docs/subsystems/mql.md) — MQL internals: pipeline, scope-walk, predicates, `person`/`reachable` seeds, system mode
  - [mql-subscription.md](./docs/subsystems/mql-subscription.md) — live MQL subscriptions: per-Interactive registry, dep index, batched re-resolve, diffing
  - [inspection-pane.md](./docs/subsystems/inspection-pane.md) — right-column pane: two subscriptions, unified breadcrumb, cardinality-polymorphic body
  - [prompt.md](./docs/subsystems/prompt.md) — PromptApi (choice/confirm/text/mqlObject/mqlMany), resolver map, cardinality policy
  - [mixins.md](./docs/subsystems/mixins.md) — class-factory mixins, `_mixinName`, Mixins registry, MixinApi predicates, composition order
  - [zone.md](./docs/subsystems/zone.md) — Zone/SpatialZone/FolderZone roots, resolveZoneForPath, field inheritance
  - [spatial.md](./docs/subsystems/spatial.md) — containment/movement substrate: Container/Containable/Mobile/Surfaced/Sealable, vessels
  - [location.md](./docs/subsystems/location.md) — room/coordinate/zone geometry, the Warren elastic graph, lounge content, `startLocation`
  - [boundary.md](./docs/subsystems/boundary.md) — exits/doors/Adornable, exit-kind templates, DeferredDestinationExit, Switchable/Lockable/Bistate, locks & keys
  - [bulk.md](./docs/subsystems/bulk.md) — continuous matter: Bulkable slots, transfer/drain-through, measure grammar, fill/pour/drink
  - [light.md](./docs/subsystems/light.md) — Light value object, `signalAt`, AmbientLit, LightSource, per-viewer perception
  - [augmentation.md](./docs/subsystems/augmentation.md) — augment-confers-mixin, getActiveMixins, @RequiresActive, the three-base capability model
  - [senses.md](./docs/subsystems/senses.md) — SenseChannel vocabulary, Modality singletons, PerceptionApi
  - [quantities.md](./docs/subsystems/quantities.md) — Quantity<U> substrate, Unit catalog, QuantityMarshaller
  - [perception.md](./docs/subsystems/perception.md) — viewer-aware queries, Shadow seam, the concealment/detection face on PerceptionApi, Audible push
  - [belief.md](./docs/subsystems/belief.md) — per-viewer identity memory: BeliefStore realms, RecognitionApi.describe, disguise, regard, DISCOVERY
  - [concealment.md](./docs/subsystems/concealment.md) — presence-concealment gate: ConcealableMixin bands, honest-fog seams, `search`, the awareness Discipline
  - [hazard.md](./docs/subsystems/hazard.md) — traps: self-resolving HazardMixin, HazardDelivery, the three generics + the Sunken Delve
  - [stealth.md](./docs/subsystems/stealth.md) — actor-face of concealment: HidingMixin, motion degrades, ambush, the `wary` brain, TrapKit, the stealth Discipline
  - [accountability.md](./docs/subsystems/accountability.md) — unified harm-consent ledger: `accountability_events`, derive-on-read blame, producers-not-chokepoint
  - [chronicle.md](./docs/subsystems/chronicle.md) — append-only identity ledger: deed vs claim, three singularity patterns, the `chronicle` verb
  - [participation.md](./docs/subsystems/participation.md) — the quantity half of influence: `participation_events`, real-time decay, the engagement×renown projection
  - [advancement.md](./docs/subsystems/advancement.md) — growth measurement: Discipline catalog, Transcript, derive-on-read Competence bands, conferrals
  - [trait.md](./docs/subsystems/trait.md) — the personality layer: 17 opposed pairs, `disposition_events`, derive-on-read TraitPosition, regard baseline
  - [renown.md](./docs/subsystems/renown.md) — measured standing: `renown_events` → RenownStanding, reaction + reception signals, per-scope derive
  - [influence.md](./docs/subsystems/influence.md) — the three-stock contract: InfluenceApi dispatcher, the producer stock, conviction hold/flip/tally
  - [provenance.md](./docs/subsystems/provenance.md) — authorship ledger: `authoring_events`, context-derived author, the `recordAuthoring` gate, CreditRouting
  - [crafting.md](./docs/subsystems/crafting.md) — craft-resolve, Grade/Tool/Durable/Crafted mixins, Recipe docs, the by-hand manual build, Dave's Bar
  - [retail.md](./docs/subsystems/retail.md) — the general store: PricedOffer, the Stock counter, consignment over chattel, `buy`/`consign`/`reclaim`
  - [corpo.md](./docs/subsystems/corpo.md) — the mark substrate: Corpo/Brand data Ideas, CorpoCatalogue, BrandedMixin resolve-on-read
  - [banking.md](./docs/subsystems/banking.md) — two-tier money, the conservation chokepoint, custodial banks, settle/credential, coinage, Terms, quotas
  - [attendant.md](./docs/subsystems/attendant.md) — storefront attention: queue + lease on AttendantMixin, AttendanceEngagement, idle-eviction sweep
  - [employment.md](./docs/subsystems/employment.md) — the Business Idea, positions/roster/shifts/wages/tips, on-shift MakerMixin conferral
  - [contract.md](./docs/subsystems/contract.md) — the work-contract (gig) substrate: clauses over verifiable conditions, escrow, the board, the custodian rule
  - [collections.md](./docs/subsystems/collections.md) — canonical surfaces for collection-shaped mixins, naming axes
  - [hot-reload.md](./docs/subsystems/hot-reload.md) — HotReloadApi state machine, clone integration, controller dispatch
  - [content-packs.md](./docs/subsystems/content-packs.md) — versioned content packages: the PackApi reconcile installer, `sourcePack` stamps, shipped packs
  - [race.md](./docs/subsystems/race.md) — Material substrate, Clade scope, BodyPlan + Species templates, OrganismMixin, animacy gating
  - [vitals.md](./docs/subsystems/vitals.md) — body-state substrate: the Agent/Creature/Character split, VitalsMixin, BodyPlan anatomy, death seams
  - [harm.md](./docs/subsystems/harm.md) — the injury driver: `ConditionApi.inflict`, five trauma behaviors, reconcile-on-read wounds, the medic vertical
  - [mortality.md](./docs/subsystems/mortality.md) — the dying arc: the rescuable `dying` clock (which does NOT freeze on linkdead), the single `ConditionApi.die` transition, the corpse as a forensic Creature, the shade (`undead`, `requiresEmbodied`), `reembody` + the `passage` floor
  - [materials-response.md](./docs/subsystems/materials-response.md) — `response = f(mechanism, material, construction)`: Channel vocab, resist/deliver grids, emergent layered armor
  - [combat.md](./docs/subsystems/combat.md) — the fight: sessions, poise, gambits, terms, narration; multi-party CombatGraph; feint + fog; weapon playstyle; the gym
  - [combat-hooks.md](./docs/subsystems/combat-hooks.md) — wizard-facing combat extension grammar: three `@hook` surfaces, the augment carrier, the influence bridge, species vocabulary
  - [electricity.md](./docs/subsystems/electricity.md) — the shock channel + conduction spread: the Ohm's-law core, the ElectricityApi walk, SustainedShock, FloodedCell
  - [fire.md](./docs/subsystems/fire.md) — combustion + high heat: the heat channel, FireApi/Combustible, the ignition balance, phase change, furnaces, Hearthworks
  - [magic.md](./docs/subsystems/magic.md) — effect substrate + casting: Effect-iff-gated-Api, the grid as Disciplines, CasterMixin faculty, suppression, the Practicum
  - [combat-formations.md](./docs/subsystems/combat-formations.md) — party-strategy policies over the threat graph: presets, three hooks, coup governance, the command Discipline
  - [party.md](./docs/subsystems/party.md) — the Party Idea + PartyRecord mirror, the fourth GroupProvider, the `sideOf`/`areAllied` combat seam, the `party` verb
  - [reserve.md](./docs/subsystems/reserve.md) — the generalized Reserve capacity axis, ReservedMixin, biological reserves
  - [encumbrance.md](./docs/subsystems/encumbrance.md) — the carry-weight gauge: LoadBearing derived burden, the consequence ladder, the haulage draft term
  - [metabolism.md](./docs/subsystems/metabolism.md) — the intake/chemistry driver: digestion buffer, reconcile-on-read, condition cascades, meal chemistry, toxins
  - [husbandry.md](./docs/subsystems/husbandry.md) — the growth model: GrowingMixin reconcile-on-read (no far-past guard), min-of-four limiting factor, the pot-as-N=1-bed object shape, the houseplant
  - [smallholding.md](./docs/subsystems/smallholding.md) — ground you own: CultivableMixin (a pot is a bed with one slot), soil's own checkpoint, land use's closed six, weakest-link harvest grade, `title`, PlatBook/LotHolder/LotGateExit, Hinkley Hills
  - [thermal.md](./docs/subsystems/thermal.md) — heat exchange: ThermalMixin Newton cooling, the thermos/campfire, ThermalRegulation
  - [respiration.md](./docs/subsystems/respiration.md) — air exchange + asphyxiation: the crisis engagement drain, `breathableMedia`, AirTank
  - [shell-workspace.md](./docs/subsystems/shell-workspace.md) — WorkspaceMixin cwd state, `workspace.tree`, read/write verb suite, SourceTreeApi
  - [shell-author.md](./docs/subsystems/shell-author.md) — AuthorMixin lifecycle + code-execution verbs, the EvalScript sandbox
  - [document-store.md](./docs/subsystems/document-store.md) — the third path-addressed tree: StoredDocument kinds, DocumentApi, self-home ownership
  - [cms.md](./docs/subsystems/cms.md) — the REST CMS surface: unified tree over three backends, the session attribution bridge, Monaco, the save go-live split
  - [diagnostics.md](./docs/subsystems/diagnostics.md) — author diagnostics: three producers, the DiagnosticApi store, the `errors` verb + CMS pane
  - [git-workflow.md](./docs/subsystems/git-workflow.md) — the in-runtime VCS: GitApi snapshot-and-push, the same-gate security spine, the `git` verb + CMS panel
  - [studio.md](./docs/subsystems/studio.md) — the mixin-aware composition surface: describeClass/blueprints, the `@authorable` schema, the catalogue-first client
  - [perceiver.md](./docs/subsystems/perceiver.md) — PerceiverMixin (look/scry/locate), the Sensor/Visible/Perceiver split, ScryableMixin
  - [slot.md](./docs/subsystems/slot.md) — Slotted/Slottable substrate, accepts + fitsSlot, capacity, Foldable
  - [embodiment.md](./docs/subsystems/embodiment.md) — Wearable/Wieldable body-side affordances, per-body-plan slotClaims, multi-slot atomicity
  - [posture.md](./docs/subsystems/posture.md) — Postured + Posed + Postures vocabulary, the posture-bearing slot
  - [conveyance.md](./docs/subsystems/conveyance.md) — Mountable/Drivable, the traverse ripple, mount/dismount, haulage (hitch/unhitch)
  - [locomotion.md](./docs/subsystems/locomotion.md) — LocomotionMode singletons, enablement mixins, per-mode controllers, the sneak/run pace modes
  - [fasttravel.md](./docs/subsystems/fasttravel.md) — the TPA teleport network: FastTravelMixin nodes, the travel credential, dual-mode `teleport`
  - [credential.md](./docs/subsystems/credential.md) — the unified credential substrate: the wallet mixin, payment/travel/key kinds, lock/key + `presentsKey`
  - [glob.md](./docs/subsystems/glob.md) — fungible stacks: Globbable quantity, split/merge/applyQuantity, the MQL quantity surface
  - [response-envelope.md](./docs/subsystems/response-envelope.md) — DispatchResponseEnvelope, 16 Note kinds, Status auto-escalation, CommandContext
  - [activity.md](./docs/subsystems/activity.md) — the engagement framework: SchedulerApi, EngagedMixin slots, the AbortReason vocabulary
  - [behavior.md](./docs/subsystems/behavior.md) — NPC behavior: BehavedMixin data-specs, brains as modules, cadence/witness triggers, the NPC class
  - [npc-dialogue.md](./docs/subsystems/npc-dialogue.md) — the tree-dialogue responder: `talk`, the DialogueConversation engagement, the choice wheel, auto-introduce
  - [biome.md](./docs/subsystems/biome.md) — atmospheric substrate: Biome Idea, the outward-walking chain resolver, SkyExposed, six instruments
  - [address.md](./docs/subsystems/address.md) — the rooted address namespace: the Locality tier, AddressableMixin, the longest-prefix resolve walk
  - [weather.md](./docs/subsystems/weather.md) — the stateless procedural weather field, pins + climate lean, wetness, puddles, storm lightning, cloud forms
  - [time.md](./docs/subsystems/time.md) — game-time: WorldClockApi, SchedulerApi, CelestialApi, the calendar; the Timekeeping display seam
  - [app-settings.md](./docs/subsystems/app-settings.md) — the AppSettings singleton + key vocabulary, yaml seeding, AppApi reads, the `config` verb
  - [help.md](./docs/subsystems/help.md) — the in-game rulebook: the HelpTopic schema, the harvested catalogue, the REST help API, the `help` verb

## ⚠ Worktrees — read before committing

Four worktrees (`master`, `build-1/2/3`) share one bare repo at
`../.bare`. **They share branch refs but have separate working trees.**

> **Two worktrees on the same branch is a data-loss bug, not an
> inconvenience.** A commit from one moves the other's `HEAD` while
> leaving its files untouched; the second worktree is then a stale tree
> with a current HEAD, and `git add -A` from it records **everything it
> is missing as a deletion**. On 2026-08-02 this produced three commits
> that deleted up to 158 files each, with commit messages that said
> nothing about it.

**The rules:**

1. **Never `git add -A` / `git commit -a`.** Stage by name. This alone
   makes the failure impossible.
2. **One branch, one worktree.** Never check out a branch a sibling
   worktree already holds — `git worktree list` shows who has what.
   The `master` worktree should sit **detached** at `origin/master` when
   a build worktree is on `master`.
3. **Check before you commit:**
   `git rev-list --left-right --count origin/master...HEAD` — a non-zero
   **left** number means you are behind.

4. ⭐ **Push every turn, not every session.** *Unpushed work is the only
   kind you can lose* — 826 lines of design sat stranded in a worktree
   long enough to be swept into somebody else's `add -A`.
5. **Index files get SWEPT, not raced.** New files (a slate, a subsystem
   doc) are conflict-free by construction and safe to write from any
   worktree. **`CLAUDE.md`, `workflow.md`, `roadmap.md`,
   `slates/README.md`, `launch-worklist.md` are not** — leave the index
   line to the sweep rather than four sessions racing for it.
6. **The `master` worktree stays DETACHED and never commits.** Design
   work goes on a branch like everything else
   (`git switch -c design/<date>`) — **one extra command, and a mistake
   becomes a visible diff instead of a silent bad commit on master.**

**Orient first** — the first action of any session, before touching a
file:

```bash
./tools/wt-status
```

Which branch · does anyone else hold it · am I behind · is anything
unpushed. **Both 2026-08-02 failures were visible in this output and
nobody looked.**

**Enforcement** — a tracked hook blocks all three failure modes:

```bash
git config core.hooksPath .githooks   # once per clone; config is not tracked
```

It refuses a commit when the branch is checked out in two worktrees, when
a commit deletes files while behind upstream, or when it deletes more
than ten files. Deliberate bulk deletion: `SAXONBERG_ALLOW=1 git commit`.

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
pnpm dev:clean        # kill every stale Saxonberg dev process, then stop
```

**Dev servers are self-cleaning.** `dev:server` and `dev:client` each run
`scripts/dev-preflight.mjs` first, which kills any stale dev process of
the same kind before claiming its port. This is not tidiness — `pnpm dev`
builds a five-deep chain (`concurrently` → `pnpm --filter` → `sh -c` →
`tsx watch` → node) and **nothing in it forwards a signal reliably**, so
killing or losing anything above `tsx watch` re-parents the supervisor to
init where it survives indefinitely, holding its port, its child and its
file watchers. Measured once: ten stacked launches, 21 orphans, the
oldest 12.3 hours, one child at 1.6 GB. The preflight cannot stop an
orphan being made; it stops orphans **accumulating**.

It never kills on the strength of a port alone — a process must also be
inside a Saxonberg checkout. A foreign holder of 2010/5173 is reported
and the launch aborts rather than starting into `EADDRINUSE`.

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
- `pnpm lint:boundary` (`scripts/check-boundary-exemptions.ts`) — the
  sandbox boundary's exemption lists, checked the way the base-class
  list already is: by the build. Every exempt template path must
  resolve to a real seed row (rename a singleton and the exemption
  silently points at nothing), and the symmetric vs inbound-only method
  sets must stay disjoint (an entry in both silently un-does the
  direction rule). CI-gating. It deliberately does NOT judge whether an
  exemption is *justified* — that is a review call, and the reason
  these stay short readable lists instead of being derived.
- `pnpm lint:imports` (`scripts/check-mud-imports.ts`) — **the import
  boundary**: nothing under `src/mud/` imports outside the tree (Node
  built-ins included) except the Api tier (`api/**` + `obj/api/**`),
  which imports and wraps. Mudlib code cannot *import* a capability — it
  asks the gated surface. Scope: imports only; ambient globals
  (`process.env`, `globalThis`, `Buffer`) stay reachable, so this is an
  architectural boundary, not a security perimeter. The import-graph
  twin of call-security, and much of what makes the sandbox / wizard
  code-trust story checkable. `import
  type` is exempt everywhere (erased, no capability); both the built-in
  and npm allowlists are **enumerated** so a widening is a deliberate
  edit; dynamic `import()`/`require()`/`createRequire` ride the same
  matrix. The per-file exception registry is **empty** — every
  capability lives behind an Api, and the mudlib keeps the policy (the
  fold pattern is an opaque handle: `ScriptApi.compileSandboxed`,
  `ProseApi.compile`, `PersistApi.sealString`,
  `CommandApi.validateCommandView`). **Ask before adding the first
  exception.** `--report` groups crossings for a sweep.
  CI-gating. Pattern + folds: [architecture.md § The import
  boundary](./docs/architecture.md).
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

## Module Scope Declares; Lifecycles Initialize

No free-standing executable statements at module scope in
`src/mud/**` — imports/exports, class/function/type declarations, and
`const`/`let` declarations (pure value construction included) only.
Initialization goes through a runtime lifecycle: capture-at-use,
`postRegister`, `BootstrapManager.installFrameworkWiring()`, or a lazy
first-use initializer. **Two sanctioned module-scope exceptions** (in the
lint allowlist): the five branch files' `Stuff._registerTopLevelBranch`,
and an `*Api` facade's trailing `SecurityApi.decorateApiClass(FooApi)`
(an Api class is a non-HMR-able interface — the module tail is its
registration). Enforced by `pnpm lint:module-scope` (CI-gating). Pattern
table: [architecture.md § Module scope declares; lifecycles
initialize](./docs/architecture.md).

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
| Api logic singleton | `obj/api/` | `PascalCaseLogic.ts` | Stateless `Stuff` (`extends ApiLogic`, which extends `Idea`; no `PostRegistrationMixin`) holding a convertible Api's logic + protected internals; `@internal` on the class, methods gated `FromModule('/api/<feature>#<Feature>Api')`; HMR-able at `/obj/api/<feature>`. The `FooApi` statics forward here. (`ApiLogic` is the shared base that makes every logic singleton residency-exempt — see [residency.md](./docs/subsystems/residency.md).) |
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
- **Command YAML views**: engine verbs in `mud/cmd/<category>/`,
  lowercase (`perception/look.yaml`, `social/say.yaml`); **domain-local
  verbs** (a verb that only exists where a locality's content is) in
  `domain/<sphere>/<locality>/cmd/` with their controllers in the sibling
  `domain/<sphere>/<locality>/command/` (the University Avenue `blow`/
  `tally`/`wind`/`adjust` bundle and the Duncan Hall `provision`/
  `unprovision`/`remodel` bundle are the exemplars — see
  [command-spec.md](./docs/subsystems/command-spec.md)). `mud/cmd/` and
  `mud/obj/command/` are the **core** trees — nothing content-specific
  belongs there; a verb that hardcodes one piece of content lives in that
  content's own `domain/` namespace, seeded at
  `seeds/domain/<sphere>/<locality>/command/<Name>Controller.yaml`. A spec's
  `controller:` value is a **path**, resolved by one rule (no domain
  special-case): absolute (`/obj/command/<cat>/<Name>Controller`) or
  relative-to-the-spec (`../command/<Name>Controller`); a
  `commandContributions` entry references a domain view by its `domain/`-
  prefixed key (`domain/<sphere>/<locality>/cmd/<verb>.yaml`, no leading
  slash). Content commands are **afforded by content** (the owning
  NPC/fixture's `commandContributions`), never by a core mixin. Categories:
  perception, social, movement, posture, inventory, boundary, bulk, shell,
  author, system, charactergen, crafting, banking, governance, civics
  (the FICTION's governments — `government`; the meta `committee` verb
  stays under `system`, the jargon standard's layer split), stream, tpa,
  medical, combat, magic (`cast`/`spells` — the casting core), work (the
  labor market — `job`/`fulfill`), device
  ("operating a built object or mechanism" —
  `wind`/`adjust`/`switch`/`fold`/`unfold`/`disarm`/`pump`; `lock`/`unlock`
  stay under `boundary`). The concealment build added `search` (perception),
  `sneak`/`run` (movement), and `disarm` (device); `examine` is now a
  `look` alias, not its own verb.
- **Command controllers**: in `mud/obj/command/<category>/`, e.g.
  `perception/LookController.ts`, `movement/GoController.ts` (content
  controllers live under `domain/<sphere>/<locality>/command/`, above).
- **Backing-class path mirrors template path** (convention, not
  enforced). A Stuff's source file should sit at the path that mirrors
  its clone-namespace template path, so you can find one from the other
  by path alone. The two call-security identities are now the **same
  `/`-absolute, mud-rooted shape** — a **module-id** (code provenance,
  `resolveModuleId`: `/obj/command/governance/OfficeController`) and a
  **template path** (clone lineage, `getTemplatePath`:
  `/obj/command/governance/OfficeController`). They're told apart by
  *which policy reads which* (`FromModule` → module-id, `FromTemplate` →
  template path), NOT by string shape — so for a controller/singleton
  whose source mirrors its template, both are literally the same string,
  and `FromModule('/obj/…')` alone gates a cloned instance (it matches by
  class provenance). Holds today for content classes, singletons
  (`obj/OfficeRegistry.ts` → `/obj/OfficeRegistry`), and controllers.
  **The one deliberate exception is the `*Logic` singletons**: the
  template is named for the feature while the class is named for the
  logic — `obj/api/PartyLogic.ts` registers at `/obj/api/party` (same
  directory, different leaf; module-id `/obj/api/PartyLogic` ≠ template
  `/obj/api/party`). New code should follow the mirror unless it's an
  Api/logic singleton.

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
bypass it.

The complement (the 2026-07 antipattern sweep): an Api method exists to
**orchestrate** — movement, lifecycle, cross-object dispatch. A read or
mutation that belongs to ONE object lives on that object, and other
Stuff call it directly with their own local `MixinApi.isX` narrowing
(`container.getContents()`, `victim.afflict(...)`, `organism.isAlive()`).
Don't add a thin Api wrapper around a single object method, and don't
gate an object mutator `ApiOnly` when a **participant contract** says who
the legitimate caller actually is (`FromClass`/`FromMixin` + relational
`where` — see call-security.md § Participant contracts). But the
`XApi`↔`XLogic` split is **mandatory** and separate from all of this: the
Api is the non-HMR interface, the logic singleton at `/obj/api/<x>` is
the hot-reload boundary — never collapse it (deleting empty *surface
predicates* is a method-level cut, never a tier-level one). Common
orchestration cases: 

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
| Raw hydration or a bespoke snapshot to persist a live host's runtime state | `PersistableApi.capture(host)` / `PersistableApi.materialize(host)` — the universal self-persistence spine. A host composes `PersistableMixin` (singleton, keyed by `templatePath`); capture/restore is per-mixin-composed and routed through call-security as the owning principal, into `holder_snapshots`. `Avatar.save()` → `capture`, `Avatar.restore()` → `materialize`. `restoreFromTemplate` is NOT this — it re-hydrates a live clone from an edited *template* (CMS/Pack content go-live); `snapshotToTemplate` was retired. See [persistence.md](./docs/subsystems/persistence.md). |
| Reading `template.data.container` from a verb to decide where a clone lands | Let `applyContainer` do it — the Hydrator's Phase 2 self-places the instance during the clone cascade. Verbs `clone` post-clone and treat hydration-self-placement as Layer 3 in the precedence chain (`--into` → `--here` → self-placement → giver fallback). See `obj/command/author/CloneController.ts`. |
| `await GroupApi.isMember(playerId, ref)` inside a controller to gate a staff verb | `await AccessApi.can(giver, action, resource)` — resolves title via `ParcelApi.ownerOf` (parcel registry, longest-prefix) then dispatches on owner kind, `'core'` = the state default. See [access.md](./docs/subsystems/access.md) + [parcel.md](./docs/subsystems/parcel.md). |
| Hard-coded "is this player an admin?" check | `await AccessApi.can(giver, action, resource)` (resource-targeted), or `AccessApi.canMutateZone(giver, zone)` for Zone-Template targets, `AccessApi.isAuthor(giver)` for MQL pre-gates, `AccessApi.isWizard(giver)` for the orthogonal code-trust (TS-escape) axis (eval, reload, source-tree writes, **and the `class`/`hydratorClass`/`behaviors[].brain` content-template fields**), `AccessApi.isArchwizard(giver)` for the wizard-conferral axis. |
| Reaching `AccessRegistry` directly via `StuffApi.findByTemplatePath('/obj/AccessRegistry')` and calling its methods | `AccessApi` — the Registry's public methods carry `@CallSecurity(FromModule('/api/access#AccessApi'))` and throw on any other caller. The facade is the only legitimate path. |
| `import { readFileSync } from 'fs'` (or `path`/`url`/`yaml`/`../backend/…`) anywhere in the mudlib | Only `api/**` + `obj/api/**` import outside `src/mud/`. To load an authored data file: `SourceTreeApi.readYamlResource(import.meta.url, '…/file.yaml')` (`import.meta.url` is a language construct, not an import). Also `readResource` / `readJsonResource` / `parseYaml` / `toMudPath` / `resolveFrom`. Enforced by `pnpm lint:imports`. |

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
`GoogleProfile`, `User`; characters are minted at enroll — identity path `/obj/Avatar/<playerId>` with NO per-player template row, snapshot-backed via the persistence spine)
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

One line per collection; the owning subsystem doc holds the schema,
indexes, and write-path rules — this list is for orientation only. The
name vocabulary itself is `mud/lib/persistence/Collections.ts` (mudlib
side — `backend/PersistenceManager` re-exports it).

- `users` / `google_profiles` / `twitch_profiles` / `kick_profiles` — auth records + per-provider OAuth profiles, token-bearing ones encrypted at rest (connection.md)
- `domain` — object templates for the CMS; pack-installed rows carry `sourcePack` (content-packs.md)
- `app_settings` / `world_state` — the config and world-clock singletons
- `name_banks` — char-gen name pools, installed by the species-and-names pack
- `beliefs` — per-viewer identity-memory rows (belief.md)
- `chronicles` — per-character append-only identity ledger (chronicle.md)
- `transcripts` — advancement evidence ledger; Competence derives on read (advancement.md)
- `disposition_events` — trait evidence ledger, the Transcript's sibling (trait.md)
- `renown_events` / `renown` — renown signal log + rebuildable standings cache (renown.md)
- `participation_events` / `participation` — active-bucket log + rebuildable standings (participation.md)
- `producer_events` / `producer` — attributed-engagement log + rebuildable standings (influence.md)
- `authoring_events` — append-only authorship ledger (provenance.md)
- `positions` — held conviction stakes (influence.md)
- `recipes` — crafting reference data, never cloned (crafting.md)
- `blueprints` — the Studio composition catalogue (studio.md)
- `bulletins` — the staff→player broadcast feed (bulletin.md)
- `documents` — the path-addressed, kind-tagged document store (document-store.md)
- `office_holders` — the sparse government-office handoff store; absence = founder default (governance.md)
- `bank_ledger` / `bank_accounts` / `bank_supply` — the banking system of record + rebuildable caches; the sealed `postTransaction` chokepoint is the only ledger writer (banking.md)
- `parcels` / `parcel_events` — property-title registry + chain-of-title; stored SEPARATELY from the `domain` content it gates — the governing security invariant (parcel.md)
- `chattel` / `chattel_events` — per-instance ownership row + chain-of-title (chattel.md)
- `diagnostics` — the author-diagnostics store, TTL-rotated (diagnostics.md)
- `holder_snapshots` — the self-persistence spine's records; written only by the gated PersistableLogic (persistence.md)
- `parties` — durable Party mirrors; ad-hoc parties never write here (party.md)
- `accountability_events` — the unified harm-consent ledger; blame derived on read, never stamped (accountability.md)
- `contracts` / `contract_events` — gig current-state rows + the append-only lifecycle chain; money legs live only in `bank_ledger` (contract.md)

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
