# Slates — the product backlog, divided by build

Slates are the open-ended design surface (see
[../workflow.md](../workflow.md) for the artifact taxonomy). This index
exists because a flat folder of ~50 slates couldn't answer the two
questions that actually matter when picking up work:

1. **Is this new substrate, or a deferred tail of something already
   shipped?**
2. **Which slates belong to the same build?**

So the slates are split into three folders, and within `builds/` they're
grouped into a handful of large, multi-phase builds (the only kind worth
opening a cycle for).

| Folder | What lives here |
|---|---|
| [`builds/`](./builds/) | **New substrate or content** with no shipped subsystem yet. Each is part of a named multi-phase build below. These are what you write a fresh requirements + plan against. |
| [`tails/`](./tails/) | **Deferred tails of shipped subsystems.** The load-bearing substrate already exists in `docs/subsystems/`; what remains is Wave-N enhancement. Not a build — pulled into a build's branch or a subsystem cycle when a consumer needs it. |
| [`deferred-rpg/`](./deferred-rpg/) | **Game-design behind the platform line** (RPG rules, progression, combat). Captured, intentionally not near-term — "no" here usually means "not this phase." |

---

## Builds (`builds/`)

Eight builds. Each lists its member slates in rough phase order and the
shipped substrate it leans on.

### 1. Identity & social perception
*Who you are, who others recognize, how you relate.* The per-viewer
identity substrate **shipped 2026-06** — recognition (full) +
identification (substrate) + the viewer-aware naming step, graduated to
[../subsystems/belief.md](../subsystems/belief.md). The two shipped slates
moved to `tails/`, holding their deferred surface; the relationship layer
remains a build.
- [recognition-slate](./tails/recognition-slate.md) *(tail)* — deferred
  recognition surface: player-set nicknames, memory decay, voice/scent
  recognition, the aether id-aug ambient trigger.
- [identification-slate](./tails/identification-slate.md) *(tail)* — the
  deferred pedagogical instrument seam (`analyze X with Y`, real Material
  chemistry), partial identification, misidentification.
- [social-graph-slate](./builds/social-graph-slate.md) — relationship
  buckets/lists. Storage half already shipped as `ContactsMixin`
  ([../subsystems/contacts.md](../subsystems/contacts.md)); the
  relationship layer remains.
- [reputation-slate](./builds/reputation-slate.md) — charisma-as-**measured-influence**
  (regard / renown / susceptibility), notoriety as the signed twin that
  pierces disguise, per-circle scoping. The platform's "value as physics,
  not RPG" answer to CHA. **Game-design, deferred.**

**Status:** recognition + identification substrate shipped → `belief.md`;
social-graph relationship layer remains.

### 2. NPCs
*Where the personality lives.*
- [npc-behavior-slate](./builds/npc-behavior-slate.md) — brains / routines / automation substrate. Absorbs collision's "guards" decomposition.
- [npc-dialogue-slate](./builds/npc-dialogue-slate.md) — dialogue trees; deferred LLM free-text front-end.
- [scripting-slate](./builds/scripting-slate.md) — a purpose-built soft-scripting language; promotes npc-behavior's deferred `scripted-behavior` tail to a first-class subsystem (and a human-authored content surface in its own right). **Not near-term** — the remaining design forks (blocks, execution model, the `( )` sublanguage, scope) want a focused learning pass first.
- [llm-content-slate](./builds/llm-content-slate.md) — the runtime LLM rung npc-behavior left open: a single director agent forces the cast over the command bus and narrates ambient scenes, expressing multi-stage behavior by authoring in the scripting language. **Not near-term.**

**Phases:** behavior substrate → dialogue → scripting language → LLM director. (`reactions` in `tails/` rides later.)

### 3. Vitals & survival
*Substrate shipped; the survival mechanics build on top.* The vitals
foundation (the `Creature` split, vital signs, anatomy/tissue, the
condition type system, the `Reserve` substrate, death/consciousness
seams) graduated to [vitals.md](../subsystems/vitals.md) +
[reserve.md](../subsystems/reserve.md); its deferred application waves
now live in [tails/vitals-slate](./tails/vitals-slate.md). The first
consumer (encumbrance) has now shipped too — graduated to
[encumbrance.md](../subsystems/encumbrance.md), its surviving design
surface in [tails/encumbrance-slate](./tails/encumbrance-slate.md).
Metabolism — the remaining consumer that drives the substrate — has now
shipped too (both waves), graduated to
[metabolism.md](../subsystems/metabolism.md), its deferred design surface
in [tails/metabolism-slate](./tails/metabolism-slate.md):
- [metabolism-slate](./tails/metabolism-slate.md) — **shipped.** The body's intake-and-chemistry system, two waves. **Wave 1 (energy economy):** basal drain (hunger/thirst), **coupled** endurance recovery (the wallet refills by burning fuel — closes the one-way drain encumbrance shipped), the `ingest` digestion buffer, in-session clock + presence-freeze (sleep = logout), and the floor-effects → vitals-conditions cascade (metabolism is the first thing to *drive* conditions). **Wave 2 (meal chemistry):** macro routing + inspectable nutrient data (the `NutritionLabel` render); the toxin-burden system + per-toxin banded conditions, alcohol/BAC, the `eat`/`vomit` verbs, antidote = accelerated clearance. Tail: deficiencies, hangover, chronic-toxin content, spoilage, magic ingestion, tuning.

The remaining consumers + the environment they run against extend the build:
- [thermal-slate](./builds/thermal-slate.md) — generic `Thermal` cooling capability (lazy Newton, τ=R·C) + body thermoregulation (Option-C thermoneutral dead-band); resolves metabolism's heat seam. `thermalConductivity` already shipped to `Material`. Build with/after metabolism.
- [respiration-slate](./tails/respiration-slate.md) *(tail)* — oxygen / asphyxiation. **Shipped 2026-06** — the air-exchange + `spo2` death driver + the carried-air tank, graduated to [../subsystems/respiration.md](../subsystems/respiration.md). Deferred surface holding here: gills / confer-based water access, the inhaled-toxin (smoke / gas) channel, the strangulation channel, CO₂ / rebreather buildup, the airlock interlock, pressure / altitude.
- [weather-slate](./builds/weather-slate.md) — atmospheric *dynamics* (the procedural driver over biome's static state); thermal's dynamic source. Deferred behind the addressing-locality substrate; global until then.

**Phases:** vitals substrate (built → tails) → encumbrance (built → tails) → metabolism (built → tails) → respiration (built → tails) → **thermal** → [weather — deferred behind the addressing substrate].

### 4. World places & navigation
*A long, sequenced content build.* The Warren elastic-graph substrate +
a rudimentary lounge shipped (→ [location.md](../subsystems/location.md));
the slate's deferred procedural/spatial consumers now live in
[tails/multilocation-slate](./tails/multilocation-slate.md). The build
continues with the content + navigation layers on top:
- [lounge-slate](./builds/lounge-slate.md) — the full spawn lounge content (locked slate); the rudimentary lounge that shipped with the substrate is the seed.
- [fast-travel-slate](./tails/fast-travel-slate.md) — **shipped (v1)** → [fasttravel.md](../subsystems/fasttravel.md); the Teleport Authority network (terminals + scan-to-register credential + dual-mode `teleport`). Slate now a tail holding the living-infrastructure wave.
- [eternal-university-slate](./builds/eternal-university-slate.md) — campus content area; built after char-gen + lounge.
- [onboarding-slate](./builds/onboarding-slate.md) — new-player onboarding; starts at campus arrival.
- [map-slate](./builds/map-slate.md) — spatial-visualization client pane; an enhancement built when earned.

**Phases:** multilocation substrate (built → tails) + rudimentary lounge → full lounge → **fast-travel (built → tail)** → eternal-university → onboarding → map.

### 5. Authoring & CMS
*Creator tooling.*
- [cms-slate](./builds/cms-slate.md) — content-authoring tools; Monaco editor core.
- [authoring-intelligence-slate](./builds/authoring-intelligence-slate.md) — compiled `.d.ts` type surface + LSP for authors.
- [compile-diagnostics-slate](./builds/compile-diagnostics-slate.md) — in-editor compile diagnostics.
- [scoped-authoring-slate](./builds/scoped-authoring-slate.md) — personal / scoped authoring permissions.

**Phases:** type surface + diagnostics → CMS editor core → scoped authoring.

> The former verb-provisioning slate is retired — its one durable idea
> (a verb may be afforded by many source objects; the source is the
> discriminator) now lives in
> [command-routing.md § Affordance attribution](../subsystems/command-routing.md).

### 6. Game config — ✅ shipped
Shipped as the **app-settings** substrate ([app-settings.md](../subsystems/app-settings.md)): `AppSettings` singleton Document + `AppApi` + the developer-gated `config` verb, values seeded from `app-settings.yaml`. The slate is fully absorbed and retired.

### 7. Economy
*Value as physics, not RPG.* Filed here, not in `deferred-rpg/`, on
purpose: how matter and money enter, move, and leave the world is a
conservation problem with in-world rules — substrate, the same as light
or containment. Stats/progression/combat balance stay deferred; the
physics is buildable now.
- [economy-slate](./builds/economy-slate.md) — currency, value, crafting inputs, trade. Reads the shipped [glob](../subsystems/glob.md) fungible-stack substrate (coins and raw materials are already modeled). **Currency slice buildable now; macro balance — faucet/sink, inflation, population-scale loops — parked until there's a running game to tune against.**

**Phases:** currency slice → (macro balance deferred to a real game).

### 8. Reading & reference
*The two halves of the in-game reading substrate — a systems↔content
pair, split by center of gravity, not a wall.*
- [help-slate](./builds/help-slate.md) — the **systems** half: the developer-maintained rulebook (commands, taxonomies, mechanics, formulas + numbers, the engine/API surface), harvested from three sources into one uniform `HelpTopic` index. Outgrew its current `HelpController` + TypeDoc scaffold. Governing pillar: transparent by default, hidden only by an explicit spoiler gate.
- [wiki-slate](./builds/wiki-slate.md) — the **content** half: a community-maintained, client-native wiki of plain `WikiPage` Documents; every page authored, no generation from gamestate. A two-axis spoiler model (appetite dial × capability ceiling) governs reveals.

**Phases:** help (systems index) → wiki (community content). Both lean on the deferred [spoiler](./deferred-rpg/spoiler-slate.md) reveal model.

---

## Enhancement tails (`tails/`)

Deferred work riding a **shipped** subsystem. Grouped by what each
extends; none is a fresh build.

| Slate | Extends (shipped) | What's deferred |
|---|---|---|
| [access](./tails/access-slate.md) | access.md / call-security.md | actor-aware policy slots |
| [auth-providers](./tails/auth-providers-slate.md) | connection.md | generalize the Google-only auth spine to multi-provider (Google + Twitch co-equal) + account linking — **the keystone** the chat relay and future name-refraction sit on |
| [external-chat-relay](./tails/external-chat-relay-slate.md) | chat.md | bind a `Channel` to an external service (Twitch first) — inbound reader + outbound post-as-yourself; **rides the auth-providers keystone** |
| [augmentation](./tails/augmentation-slate.md) | augmentation.md | Wave 2+ (Wave 1 shipped) |
| [affordance-verb](./tails/affordance-verb-slate.md) | put/give/Surfaced (shipped) | source-scoping (`::`), command-provenance |
| [chat](./tails/chat-slate.md) | chat.md | moderation / edit-trail |
| [comms](./tails/comms-slate.md) | comms.md | trust-tiered policy |
| [console-filtering](./tails/console-filtering-slate.md) | console (core shipped) | search, sender-filter |
| [encumbrance](./tails/encumbrance-slate.md) | encumbrance.md | cart/conveyance propulsion handoff (the "hinge"), per-item placement refinement (a frame pack beating the worn floor), augment-conferred capacity, environmental (gravity) margins, tissue-derived mass, numeric tuning |
| [metabolism](./tails/metabolism-slate.md) | metabolism.md | wired nutrient deficiencies (scurvy), hangover, chronic-toxin exposure content, spoilage / perishability, magic ingestion, fuller-stomach-slows-absorption, bulk-food eating, per-individual rates, recovery-on-relogin, numeric tuning |
| [message-rendering](./tails/message-rendering-slate.md) | message-rendering.md | GFM table input-sugar |
| [mql-subscription](./tails/mql-subscription-slate.md) | mql-subscription.md | client topology cache, bandwidth ceilings |
| [prompt-stack](./tails/prompt-stack-slate.md) | prompt.md | client format-strings, slider affordances |
| [senses](./tails/senses-slate.md) | senses.md | Wave 2+ (Wave 1 shipped) |
| [scope-modality](./tails/scope-modality-slate.md) | senses / perception | modality-scoped resolution; build-when-pulled |
| [host-slot-activities](./tails/host-slot-activities-slate.md) | activity.md | deferred activity wave |
| [locomotion-as-activity](./tails/locomotion-as-activity-slate.md) | activity.md / locomotion.md | deferred activity wave |
| [hand-slot](./tails/hand-slot-slate.md) | embodiment.md | hand-slot redesign |
| [bulkable](./tails/bulkable-slate.md) | bulk.md | thermos slice shipped; deferred: mixing/solutions, gas (`sealed`), `Container`+`Bulkable`, amount-aware appearance |
| [client-cockpit](./tails/client-cockpit-slate.md) | cockpit (several tracks shipped) | remaining client-track umbrella |
| [language](./tails/language-slate.md) | comms / perception | comprehension; roleplay flavor |
| [reactions](./tails/reactions-slate.md) | messaging / emotes | attach-emote-to-message |
| [persistence-architecture](./tails/persistence-architecture-slate.md) | persistence.md | Wave 3 un-Stuff marshallers (Waves 1-2 shipped) |
| [vitals](./tails/vitals-slate.md) | vitals.md / reserve.md | application waves — live condition progression, the death-transition driver, assessment / instruments / treatment, consumables, forensics (substrate / Wave 1 shipped) |
| [multilocation](./tails/multilocation-slate.md) | location.md | deferred procedural / spatial Warren consumers beyond the shipped social-elastic lounge case |
| [fast-travel](./tails/fast-travel-slate.md) | fasttravel.md | living-infrastructure wave (terminals break down / disruption, Authority wear-maintenance, the inert `status` seam) + cross-restart credential durability |
| [client-shell](./tails/client-shell-slate.md) | client-shell.md | search / command palette, mode switcher + per-mode status, public read-only surface, declarative mode/manifest model, pre-auth device-local client-state tier |

**Near-absorbed — retirement candidates** (kept this pass rather than
deleted, since each still carries live design surface; prune on request
once salvaged into the subsystem doc):

| Slate | Graduated to | Surviving surface only |
|---|---|---|
| [emotes](./tails/emotes-slate.md) | emotes.md | Layers 2-4 (emoji / honorary / reactions) + moderation |
| [mixin](./tails/mixin-slate.md) | mixins / material / light / slot / posture / glob | residual material threads |
| [world-clock](./tails/world-clock-slate.md) | time.md | celestial-profile → light wiring |

---

## Deferred game-design (`deferred-rpg/`)

Behind the platform-vs-game-design line. Captured, not near-term.

- [capability-magic](./deferred-rpg/capability-magic-slate.md) — RPG capability / magic layer.
- [combat-tactics](./deferred-rpg/combat-tactics-slate.md) — combat & engagement model.
- [alignment-religion](./deferred-rpg/alignment-religion-slate.md) — alignment & religion (very preliminary).
- [affiliation](./deferred-rpg/affiliation-slate.md) — guild / corp social organization (guild = the class system).
- [spoiler](./deferred-rpg/spoiler-slate.md) — spoilers & secrets; deferred to the assessment system.
- [breadcrumb](./deferred-rpg/breadcrumb-slate.md) — narrative-trace breadcrumbs; deferred until the advancement system.
- [collision](./deferred-rpg/collision-slate.md) — **decomposed (resolved 2026-06-10):** intentional blocking → the npc-behavior "guards" brain; capacity + pushing → defer-til-content; diegetic prohibition is already ~80% in-engine. Retained for reference; not a standalone build.
