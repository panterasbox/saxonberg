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

Eleven builds. Each lists its member slates in rough phase order and the
shipped substrate it leans on.

### 1. Identity & social perception
*Who you are, who others recognize, how you relate.* The per-viewer
identity substrate **shipped 2026-06** — recognition (full) +
identification (substrate) + the viewer-aware naming step, graduated to
[../subsystems/belief.md](../subsystems/belief.md). The two shipped slates
moved to `tails/`, holding their deferred surface; the social-graph
**attention layer** then shipped (Wave 3 →
[../subsystems/social-graph.md](../subsystems/social-graph.md)), its slate
moving to `tails/` with only Wave 4 + the message-restyle wiring left.
- **chronicle** — the append-only identity **ledger** (witnessed deeds +
  authored prologue claims) every identity readout projects from.
  **Shipped 2026-06 and slate retired** (fully absorbed — its deferred
  consumers themselves shipped as renown / trait / advancement); the
  permanent record is [../subsystems/chronicle.md](../subsystems/chronicle.md).
- [recognition-slate](./tails/recognition-slate.md) *(tail)* — deferred
  recognition surface: player-set nicknames, memory decay, voice/scent
  recognition, the aether id-aug ambient trigger.
- [identification-slate](./tails/identification-slate.md) *(tail)* — the
  deferred pedagogical instrument seam (`analyze X with Y`, real Material
  chemistry), partial identification, misidentification.
- [social-graph-slate](./tails/social-graph-slate.md) *(tail)* — the
  bucket storage shipped as `ContactsMixin`
  ([../subsystems/contacts.md](../subsystems/contacts.md)) and the
  attention layer (display lensing + the `notify` notification policy)
  shipped as Wave 3
  ([../subsystems/social-graph.md](../subsystems/social-graph.md));
  remaining tail = Wave 4 (account-level federation) + message-restyle
  live wiring.
- [social-inspection-slate](./tails/social-inspection-slate.md) *(tail)* —
  the player-facing inspection surface over the same substrate: a `who`
  online roster, a `profile`/`finger` identity card, and a `score`/`me`
  self-dashboard, governed by the **disclosure-dial** privacy model
  (presence always public, country unconditional, per-observer fidelity
  raised by recognition — `introduce` as the first consumer; invisibility
  deferred as conditional perception). Design captured, not built.
- [connection-origin-slate](./tails/connection-origin-slate.md) *(tail)* —
  geographic origin of a connection (country broadly visible, IP
  developer-only, in-memory/never-persisted). **Country v1 shipped** with
  the social-graph build (capture → `geoip-lite` → `ConnectionApi.originOf`,
  consumed by the presence line); remaining tail = the developer-gated IP
  read and city/region (the `whois`/`profile` verb that surfaces country
  is now homed in
  [social-inspection-slate](./tails/social-inspection-slate.md)).
- [reputation-slate](./builds/reputation-slate.md) — charisma-as-**measured-influence**
  (regard / renown / susceptibility), notoriety as the signed twin that
  pierces disguise, per-circle scoping. The platform's "value as physics,
  not RPG" answer to CHA. **Game-design, deferred.**
- [forums-slate](./builds/forums-slate.md) — durable multi-author boards on
  the aether implant, unifying **popularity forums + structured-argument
  deliberation as two organizers over one primitive** (`organizer:
  'popularity' | 'argument'`). Consciously **supersedes the factoring** of
  [delivery-slate](./builds/delivery-slate.md) (social-forum-as-chat-facet)
  and [argument-map-slate](./tails/argument-map-slate.md) (which becomes the
  `'argument'` organizer); preserves the deliberation-ungameability principle
  (argument boards: no ranking at all). **Part-0 substrate + Part-1
  popularity SHIPPED** (cycle 1, `feature/forums-build`) and the **argument
  organizer SHIPPED** (cycle 2, `feature/argument-map-build`), both graduated
  to [../subsystems/forums.md](../subsystems/forums.md); kept in `builds/` for
  the ephemeral bill lifecycle, the procedure modes, and the latent
  collection-watch abstraction (the argument organizer's *scale* tail moved to
  [tails/argument-map-slate](./tails/argument-map-slate.md)).

**Status:** recognition + identification substrate shipped → `belief.md`;
chronicle ledger substrate shipped → `chronicle.md`; social-graph
attention layer shipped Wave 3 → `social-graph.md` (Wave 4 + connection
origin remain as tails).

### 2. NPCs
*Where the personality lives.*
- [npc-behavior-slate](./builds/npc-behavior-slate.md) — brains / routines / automation substrate. Absorbs collision's "guards" decomposition.
- [npc-dialogue-slate](./tails/npc-dialogue-slate.md) *(tail)* — **shipped (Wave 1)** → [../subsystems/npc-dialogue.md](../subsystems/npc-dialogue.md): the responder seam (`talk to` → a pluggable brain), the branching-tree responder, and auto-introduce. Tail holds the scripted `intent-dialogue` + LLM free-text front-end + multiplayer waves.
- [llm-content-slate](./builds/llm-content-slate.md) — the runtime LLM rung npc-behavior left open: a single director agent forces the cast over the command bus and narrates ambient scenes, expressing multi-stage behavior by authoring in the scripting language. **Not near-term.**

**Phases:** behavior substrate → dialogue → scripting language → LLM director. (Dialogue Wave 1 shipped → `npc-dialogue.md` and the **scripting language v1 engine shipped** 2026-06 → `scripting.md`; both slates moved to `tails/` — scripting's with the piping tail. `reactions` core shipped; its `tails/` tail rides later.)

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
- [thermal-slate](./tails/thermal-slate.md) — **shipped** → [thermal.md](../subsystems/thermal.md). The generic `Thermal` cooling capability (lazy Newton, τ=R·C) + the thermos (`Flask`) + corpse algor mortis + the campfire, and body thermoregulation (Option-C thermoneutral dead-band: spend satiation/hydration to defend the setpoint, endo/ecto split, Q10, the hypothermia/hyperthermia/torpor cascade). Resolves metabolism's heat seam. Tail (substantial deferred surface): phase change / ice (the latent-heat reserve-clamp), the sauna / steam room (heat-side worked example), per-region coverage + frostbite + wet-insulation collapse, windproofing distinct from `clo`, smoke / cooking / fire-spread + the air-supply burn coupling, behavioral (basking) ectotherm regulation, intermediate thermal strategies, and the indoor-convection room-bump + standalone radiant helper (the build wired the outdoor warming-slot path only).
- **respiration** — oxygen / asphyxiation. **Shipped 2026-06 and slate
  retired** (fully absorbed — its deferred surface, gills / inhaled-toxin /
  strangulation / CO₂ / airlock / altitude, lives in the subsystem doc's
  *Deferred* section): [../subsystems/respiration.md](../subsystems/respiration.md).
- [weather-slate](./tails/weather-slate.md) — **shipped (Wave 1)** → [weather.md](../subsystems/weather.md). Atmospheric *dynamics* (the procedural driver over biome's static state; thermal's dynamic source): the stateless weather grammar, the SkyExposed biome-deviation seam, the presence-gated thermal coupling, and `analyze weather`. Per-locality off the shipped addressing tree (global until Localities are authored). Slate now a tail holding the Wave 2 "teeth".

**Phases:** vitals substrate (built → tails) → encumbrance (built → tails) → metabolism (built → tails) → respiration (built → tails) → **thermal (built → tail)** → **weather (built → tail)**.

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
- [crafting-slate](./builds/crafting-slate.md) — the economy's **transformation** stage (where value is minted), the piece economy-slate deferred. The **venue model** (Dave's Bar four-tuple: inputs + tools + recipes + labor; place-based crafting; buy-vs-DIY; NPC floor / player apex) is settled enough for a first venue slice; the core mechanics (recipes, the skill seam's far side, the quality verdict) are open design space, advancement-adjacent and largely deferred. Crystallized in the economy slate's employment/venue section.
- [corpos-slate](./builds/corpos-slate.md) — the fictional megacorps that own the private sector: a cross-cutting **affiliation/competition fault line** + a **mark** on the goods of the world. **Phase 1 (marks + booze portfolios) shipped** → [corpo.md](../subsystems/corpo.md) — the five corpos + their brands as authored reference-identities, brand→corpo resolution, the per-product `Branded` mark. Kept in `builds/` for the deferred phase 2: the player-facing **faction gameplay** (the multipolar approval vector, competition, sponsorship, portfolios beyond booze) — a build's worth of design, not a tail.
- [livelihood-slate](./builds/livelihood-slate.md) — the *livelihood & consequence* spine: **violence has no payday; livelihood comes from work; the world's money is conserved with authors running their own budgets; consequence is recorded, not mechanized.** §5 (the **employment model**) **shipped** → [employment.md](../subsystems/employment.md) — jobs/shifts/wages/tips at Dave's Bar. Kept in `builds/` for the mostly-unbuilt rest: death-as-cascade-terminus (§1, sibling to the deferred-rpg combat slate), the unified **Contract** abstraction + adjudication (§2), the wider **labor market** / job board (§3), and the **conserved-economy** big model (§4 — no NPC faucet, one economy, CB the only mint, authors run budget accounts).

**Phases:** currency slice → crafting venue slice (Dave's Bar) → (skill / quality / recipe-spread deferred with the advancement layer) · (macro balance deferred to a real game). Corpos: marks (shipped) → faction gameplay (deferred).

### 8. Reading & reference
*The two halves of the in-game reading substrate — a systems↔content
pair, split by center of gravity, not a wall.*
- [help-slate](./builds/help-slate.md) — the **systems** half: the developer-maintained rulebook (commands, taxonomies, mechanics, formulas + numbers, the engine/API surface), harvested from three sources into one uniform `HelpTopic` index. Outgrew its current `HelpController` + TypeDoc scaffold. Governing pillar: transparent by default, hidden only by an explicit spoiler gate.
- [wiki-slate](./builds/wiki-slate.md) — the **content** half: a community-maintained, client-native wiki of plain `WikiPage` Documents; every page authored, no generation from gamestate. A two-axis spoiler model (appetite dial × capability ceiling) governs reveals.

**Phases:** help (systems index) → wiki (community content). Both lean on the deferred [spoiler](./deferred-rpg/spoiler-slate.md) reveal model.

### 9. Cooperative & governance
*The people who fund Saxonberg are the people who govern its world —
real funding and in-world citizenship as the same act, separated by one
hard membrane.* Also a **native-digital governance** thesis: drop the
logistical artifacts of meatspace government, keep the protective
functions, and tie influence to costly contribution because that's the
Sybil floor (the novel polity is educational *payload*, not overhead).
New substrate; no shipped subsystem. Prioritized to stand up a funding
stream for dev. Sibling to the **economy** build
(value-physics) — this governs over that value, and its in-world reserve
closes economy's open "deliberate faucet without inflation" thread.
- [cooperative-slate](./builds/cooperative-slate.md) — the full governance
  design (authoritative; this is only a hook): **stake-is-not-stock** (the
  lawyer-free firewall) + **influence** (three non-fungible kinds = three
  contributions — creation / patronage / participation) → three co-equal
  chambers → a parliamentary executive of chartered institutions → a
  judiciary that runs **one async process** from operator-pool-of-one to a
  **sortition** jury (verification + spirit, structured verdicts) → a
  tamper-evident **archive** (integrity by construction, not a separate
  operator) → a hard **firewall** between the real budget and the in-world
  reserve (the economy itself left to legislation), with **deliberation**
  (social-forum / polling / argument-map) and **amendment** (tiers + eternity
  clauses + fork). Held together by recurring
  throughlines: **graceful degradation** (NPC/automation floor everywhere),
  the **membranes** (no cash-out, no pay-to-win), **no-number-as-authority**,
  **conduct→reputation**, **engagement-is-the-substrate** (the game is the
  engine apathy-prone DAOs lacked), and the **founder self-binding** so the
  *structure*, not the person, is entrenched. Adoption rides **moderation as
  the on-ramp**. **Stake-ledger slice buildable now**; the full republic
  parked until there's a member body to govern.
- [draft-constitution](../governance/draft-constitution.md) *(governance
  instrument — homed in [../governance/](../governance/), not a backlog slate)*
  — the slate consolidated into normative articles (Preamble + 13 Articles + a
  **Schedule of Parameters**). Reframed as a **bare-bones kernel that ships to every
  community**: a **three-floor test** (the *firewall* — the no-lawyer floor;
  the *machine* + its provided tools; everything else *deferred*) decides
  what's constitutional, so rights move to ratification, the economy +
  institution roster + trial procedure to legislation. Keystone: **rights are
  bindings on tools, not new machinery** — *due process = "you must use the
  judicial machinery."* Treated as **code with a config block**: the articles
  are logic; every tunable value (quorum, thresholds, lifespans, regen rates,
  the amendment supermajorities…) lives once in the Schedule, each with a
  change-tier and a value **set at ratification** (game-balance rows
  *calibrated at launch*). Status: **draft, not ratified**; five points marked
  `[OPEN]` (membership · rights · founding/ratification · emergency powers ·
  interpretation).
- [amendment-library-slate](./builds/amendment-library-slate.md) — the layer
  *on top* of the kernel: a shared **library of model amendments** — pre-
  drafted, vetted, composable **"political legos"** a community adopts (via the
  kernel's ordinary Art. X path) instead of re-solving due process / monetary
  policy / term limits from scratch. *Model legislation meets a package
  registry meets the CC license picker.* Every choice the constitution defers
  is a **module slot**; most modules are *bindings on tools the kernel already
  built*. Catalog (rights / economy / roster / executive / judiciary /
  membership modules) + **presets-as-distros** (Operator's table → Creator
  collective → Full republic). **A few hand-authored modules buildable now**;
  the package-manager conflict-resolution + curation tiers deferred to scale.
- [founding-charter](../governance/founding-charter.md) *(governance
  instrument — homed in [../governance/](../governance/), not a backlog slate)*
  — the founder's **self-binding commitment**, in force from the first dollar
  (the instance-specific instrument the constitution's Art. XI founding-stake
  bound requires; *not* kernel text). The fiat-phase formula: **sole producer**
  (~100%, diluting) · **0% consumer** (players' house ceded) · **patron-match
  + 1** (a working majority that erodes as the community grows) · **the
  *granted* control sunsets at ratification** — but the founder's *earned*
  producer influence persists like any member's (only the patron-match + margin
  end), leaving ordinary contribution + legislated wage. The binding isn't law
  (there's none
  yet) but **code + publication + exit** — it ships with the **stake-ledger
  slice** as the first test of code-first self-binding.
- [argument-map-slate](./tails/argument-map-slate.md) *(tail)* — the polity's
  load-bearing **deliberation surface**: a navigable **typed claim-graph**
  (proposal-as-spine, claims → objections → rebuttals; Kialo / IBIS /
  Deliberatorium lineage) organized by the argument's *structure*, not by
  ranking (the only ungameable organizer). Dissent is a node not a downvote;
  contribute-as-equals, decide-by-weight; it's the legislative history in the
  archive. **v1 SHIPPED (2026-06, forums cycle 2)** as the `organizer:
  'argument'` reading over the shared Board/Entry store, graduated to
  [../subsystems/forums.md § The argument organizer](../subsystems/forums.md#the-argument-organizer-cycle-2);
  moved to `tails/`. The *scale* problems — claim dedup/canonicalization
  (assisted curation) + integrity-grade map-summarization + automated
  convergence + the vote consumer + the plural-lens explorer — are the open
  work.

**Phases:** stake ledger (buildable now) → (the republic — chambers, executive, treasuries — deferred to a real member body) · **argument-map (v1 shipped → tail; mass-scale dedup/summarization deferred)**.

### 10. Advancement & learning
*Learning as a science — how a character grows.* The **game-system** half
of "learning as adventure": advancement modeled so it *feels* like real
learning even when it's the character doing the studying, not the player.
New substrate; no shipped subsystem (though ~40% of the supporting pieces —
Reserve, Activity, affordance attribution, Persona, templatePath keying,
zones/access — already ship). The hard constraint: **a character must be
able to advance without ever entering a classroom** — a real RPG first,
the academic vertical optional fuel.
- [advancement-slate](./builds/advancement-slate.md) — the build: gamify
  the **metacognition** of learning (the player coaches; the character does
  the rote), the six build-crafting translations of the XP-model's
  failures, **capacity-not-decay** (the loadout + savings effect; never tax
  inactivity), skills as an extensible **content-graph** (typed nodes/edges,
  fork-in-`/home` → governed-canonize, templatePath-durable progress),
  **guilds as institutions over the taxonomy** (map vs. institution;
  membership-as-affordance; brands fork the institution not the knowledge;
  corp-sponsored branches), the **three orthogonal social axes**
  (guild/party/corp — the wall that keeps guild ≠ party), and the
  **endgame as lifecycle** (cap on expression not accumulation;
  competence-not-power as a *constitutional* requirement; the emergent
  learn → master → make/teach/govern drift, no ascension mechanic). Leans on
  [capability-magic](./deferred-rpg/capability-magic-slate.md) (the three
  ability channels) and [affiliation](./deferred-rpg/affiliation-slate.md)
  (guilds / houses), grounded in [lenses/motivation.md](../lenses/motivation.md)
  (SDT). **First vertical slice buildable now** (one combat + one craft
  path, two seed guilds); the learning-platform sensor bridge + merge/balance
  of player-authored trees deferred.

**Phases:** first slice (two paths, two guilds, the loadout) → guild
institution model → player-extensible content-graph + governed canonization
→ (the education-vertical sensor bridge deferred).

---

## Enhancement tails (`tails/`)

Deferred work riding a **shipped** subsystem. Grouped by what each
extends; none is a fresh build.

| Slate | Extends (shipped) | What's deferred |
|---|---|---|
| [access](./tails/access-slate.md) | access.md / call-security.md | actor-aware policy slots |
| [argument-map](./tails/argument-map-slate.md) | forums.md | **v1 shipped 2026-06** (the `organizer: 'argument'` claim-graph + neutral lens + open-objection + circle highlight + mature seam + client mode → forums.md); deferred: claim dedup/canonicalization, integrity-grade summarization, automated convergence, proposal version-control, the vote consumer, the plural-lens explorer |
| [auth-providers](./tails/auth-providers-slate.md) | connection.md | **Waves 1+2 shipped 2026-06** (multi-provider spine + Twitch login + account link/unlink + token encryption → connection.md); deferred: chat scopes, account merge, provider-side revocation, name-refraction, YouTube |
| [external-chat-relay](./tails/external-chat-relay-slate.md) | twitch-relay.md | **Twitch SHIPPED** (two-way chat relay, separate player-initiated surface) → twitch-relay.md; slate retained for the deferred **YouTube** generalization only |
| [augmentation](./tails/augmentation-slate.md) | augmentation.md | Wave 2+ (Wave 1 shipped) |
| [affordance-verb](./tails/affordance-verb-slate.md) | put/give/Surfaced (shipped) | source-scoping (`::`), command-provenance |
| [chat](./tails/chat-slate.md) | chat.md | moderation / edit-trail |
| [comms](./tails/comms-slate.md) | comms.md | trust-tiered policy |
| [console-filtering](./tails/console-filtering-slate.md) | console (core shipped) | search, sender-filter |
| [encumbrance](./tails/encumbrance-slate.md) | encumbrance.md | **cart/conveyance handoff shipped** (the haulage build → conveyance.md/encumbrance.md § Haulage); deferred: per-item placement refinement (a frame pack beating the worn floor), augment-conferred capacity, environmental (gravity) margins, tissue-derived mass, numeric tuning |
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
| [reactions](./tails/reactions-slate.md) | reactions.md / emotes | core shipped (act-scoped emote + aggregate-delta + `react` + chips); deferred: analytics event-tap, emote-flood salvage |
| [persistence-architecture](./tails/persistence-architecture-slate.md) | persistence.md | Wave 3 un-Stuff marshallers (Waves 1-2 shipped) |
| [vitals](./tails/vitals-slate.md) | vitals.md / reserve.md | application waves — live condition progression, the death-transition driver, assessment / instruments / treatment, consumables, forensics (substrate / Wave 1 shipped) |
| [weather](./tails/weather-slate.md) | weather.md | Wave 2 "teeth": precipitation→wetness, fog→visibility, cloud→light dimming, snow depth, hazards, vector wind, authored per-Locality climate, the far economy (farming / sailing / travel) |
| [multilocation](./tails/multilocation-slate.md) | location.md | deferred procedural / spatial Warren consumers beyond the shipped social-elastic lounge case |
| [fast-travel](./tails/fast-travel-slate.md) | fasttravel.md | living-infrastructure wave (terminals break down / disruption, Authority wear-maintenance, the inert `status` seam) + cross-restart credential durability |
| [credential-wallet](./tails/credential-wallet-slate.md) | banking.md / fasttravel.md → credential.md | **core shipped 2026-06-27** (the `CredentialWalletMixin` holder + credentials-as-data + the payment/travel migration → credential.md); deferred: deputization as a native tenant, the issuer-authorization ledger (validity derived, the record a *presentation*), a single `CredentialCard`, a thin `CredentialApi` |
| [client-shell](./tails/client-shell-slate.md) | client-shell.md | search / command palette, mode switcher + per-mode status, public read-only surface, declarative mode/manifest model, pre-auth device-local client-state tier |
| [scripting](./tails/scripting-slate.md) | scripting.md / document-store.md | **v1 engine shipped 2026-06** (interpreter + coroutines + two surfaces + demonstration-capture + knowledge-ladder + the generic document store → scripting.md; the block/execution-model/`( )`/scope forks all resolved + built); deferred: the **piping model** (multi-stage pipelines over the built `Pipeline` AST node + the general value→field binder + the two-channel/ByValue compatibility design) and the open block forks (`it`-only vs explicit params) |

**Near-absorbed — retirement candidates** (kept rather than deleted,
since each still carries live design surface; prune on request once
salvaged into the subsystem doc):

| Slate | Graduated to | Surviving surface only |
|---|---|---|
| [emotes](./tails/emotes-slate.md) | emotes.md | Layers 2-4 (emoji / honorary / reactions) + moderation |
| [mixin](./tails/mixin-slate.md) | mixins / material / light / slot / posture / glob | residual material threads |

> **Retired 2026-06-29** (fully absorbed, salvaged into their subsystem
> docs): `chronicle` → chronicle.md · `respiration` → respiration.md ·
> `world-clock` → time.md · `document-tree` → document-store.md. The two
> governance instruments (`draft-constitution`, `founding-charter`) moved
> out of `builds/` to [../governance/](../governance/).

### 11. Magic items & BUC
*NetHack's consumables as an immsim stress-test.* Most of the potion / scroll
/ ring / amulet catalog lands on **already-shipped** substrate (belief,
augmentation, thermal, metabolism, respiration, senses, teleport, reserve); a
handful reconceive (healing has no HP to restore), stress a system (identify →
prompt, detection → MQL, hallucination → rendering, amnesia → belief), or wait
on combat.
- [magic-items-slate](./builds/magic-items-slate.md) — the reformed
  **blessed/uncursed/cursed** model (BUC as a *potency level* on the item's own
  axis — `scale`/`pick`, monotonic, opt-in `Blessable`, known-BUC a belief
  realm, cursed-sticks via the release gate) + the `Consumable`/`Effect`
  substrate (Gap 0) + the full NetHack catalog walk + a **ranked gap-roundup**
  (the build work-list). Sibling of
  [identification-slate](./tails/identification-slate.md) (the orthogonal item
  *identity* axis).
- [presence-hollowing-slate](./builds/presence-hollowing-slate.md) *(spun out of
  the item walk)* — **presence-vs-hollowing as a physical agent-state** (*is
  anyone home?*), the physical shadow of the Good=presence / Evil=hollowing
  cosmology. Two item consumers (sanctity *reacts* to the hollow; ESP *can't
  perceive* it). **Shared with alignment** (kept distinct: this is the
  physical/perceivable layer, alignment the derived/moral one).
- [spawn-distribution-slate](./builds/spawn-distribution-slate.md) *(spun out of
  the item walk)* — the **dynamic weighted-populate substrate** (the runtime
  sibling of `populates: onto`): per-entity opt-in weights, per-location
  bias-and-renormalize, **two output kinds** (loot items + procgen NPCs, the
  procgen-NPC generator folded in). Consumers: BUC-at-spawn, create-monster,
  world-population. **Shared world-wide.**

---

## Deferred game-design (`deferred-rpg/`)

Behind the platform-vs-game-design line. Captured, not near-term.

- [capability-magic](./deferred-rpg/capability-magic-slate.md) — RPG capability / magic layer.
- [combat](./deferred-rpg/combat-slate.md) — **the combat system itself**: the terms/consent/blame frame (combat as a consented, contracted activity subordinate to the social contract), the employment-economy placement (no kill-loot), the loadout/affordance model, the expressive layer (mechanical core = commodity; reactive/expressive = the authored product), and the **poise minigame** (one session-scoped gauge, overextend economy, binary-timed openings, directed-autocombat tick loop, Master-Apprentice validated). The "combat system" [combat-tactics](./deferred-rpg/combat-tactics-slate.md) deferred.
- [combat-tactics](./deferred-rpg/combat-tactics-slate.md) — combat's **spatial + party-strategy** halves: engagement-graph-not-geometry + party-level tactic presets. Its engagement graph is combat-slate's threat graph.
- [materials-response](./deferred-rpg/materials-response-slate.md) — the **`mechanism × material × construction` response substrate** combat is the first consumer of (armor mitigation + `Trauma` generation from one function; **construction** as the new value-object primitive — "mail and plate are the same steel"; layered coverage). Now also carries the full **weapon** model (compact derived property bundle: delivery/reach/handedness/balance/guard/gambits; reach-as-engagement-control; shield = wielded armor-construction; the archetype space), the **legibility/authoring** rule (author-concepts-not-numbers + a mandatory preview/inspect/lint surface), and the use-driven **lifecycle** (condition scales the profile; wear→repair→scrap→reforge; solid-state at rest). Completes the channels-not-nouns decomposition; grows to structures/thermal/vessels.
- [party](./deferred-rpg/party-slate.md) — the **party** social axis as first-class Stuff (membership over `GroupApi`; captain-authority + tactic-roles; one-active-at-a-time; the **guild≠party≠corp** wall — party = the disposable *operational* axis; party-vs-combat-side two-layer; the anti-loot payout-split payoff). Two-timescale progression: slow **reputation** (name-not-roster, provenance-grounded, halo-as-recognition-not-transfer, multi-valent, contract-access) + fast **odometer**; **no party-XP** (competence individual, synergy emergent). Heterogeneous (NPC/AI members via employment + brains).
- [odometer](./deferred-rpg/odometer-slate.md) — **honest number-go-up**: the journey-tally half of XP split from the capability-input (discarded). Subject-scoped (personal + party + beyond), monotonic, authored specific counters + aggregate headline, **downstream-inert** (the bright line — never spent, never a capability gate → the balance problem dissolves). Milestones = recognition/titles not power; the monotonic sibling of decay-based participation; nearly free over ledgers already kept. Personal by default.
- [alignment-religion](./deferred-rpg/alignment-religion-slate.md) — alignment & religion (very preliminary).
- [affiliation](./deferred-rpg/affiliation-slate.md) — guild / corp social organization (guild = the class system).
- [spoiler](./deferred-rpg/spoiler-slate.md) — spoilers & secrets; deferred to the assessment system.
- [collision](./deferred-rpg/collision-slate.md) — **decomposed (resolved 2026-06-10):** intentional blocking → the npc-behavior "guards" brain; capacity + pushing → defer-til-content; diegetic prohibition is already ~80% in-engine. Retained for reference; not a standalone build.
