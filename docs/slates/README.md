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
  not RPG" answer to CHA. **Measurement substrate SHIPPED** — regard
  ([belief.md](../subsystems/belief.md) regard realm), [renown.md](../subsystems/renown.md),
  [participation.md](../subsystems/participation.md), [influence.md](../subsystems/influence.md).
  Kept in `builds/` for the deferred **charisma/notoriety game layer**
  (susceptibility, the disguise-counterweight, NPC consumers, eigenvector
  trust-weighting) — game-design, not a tail.
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
- [pets-slate](./builds/pets-slate.md) — **player pets**, through the NetHack lens: *a tame creature in a consistent world; the beloved moments are emergent.* **Taming is the spine** — a pet is a creature you *won over*, not a unit you bought. Three-layer model: **domesticability** (species data, *is* a dial on the fear axis) / **temperament** (dispositions, the encounter's puzzle) / **bond** (`regard`, the score). Shops sell *domesticated-but-unbonded* creatures — the bonding **back-half** of taming, not a bypass. **Stress-test finding:** the object/actor/place primitives are done, but pets X-ray three structural gaps — **possession/theft** (no owner-stamp on goods; `Charge` has no debtor), a **fear/threat axis** (regard is affinity-only), and **dependent-presence + individual-instance persistence** (presence-freeze + persist-back are Avatar-only) — plus a manner-of-approach legibility gap. Re-sequenced waves: **W1 bonding (shop path, dodges every heavy gap)** → **W2 wild taming (builds the fear + approach substrate, pays off game-wide)** → W3 apex/breadth (magic tame, maturation, mount/haul/guard, spawning, shop-theft). Care is *light* (feed occasionally; neglect → drifts feral; loss is a relationship failure, not billing/starvation — the boarding money-sink is retracted).

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
- [weather-slate](./tails/weather-slate.md) — **shipped (Waves 1 + 2)** → [weather.md](../subsystems/weather.md). Atmospheric *dynamics* (the procedural driver over biome's static state; thermal's dynamic source): the stateless weather grammar, the SkyExposed biome-deviation seam, the presence-gated thermal coupling, and `analyze weather` (Wave 1); the coexistence resolve (authored pin → procgen(climate-lean) → biome), the cross-cutting **wetness** substrate, and the storm consequences — electricity wet-skin, thermal wet heat-loss, Floor puddles, storm lightning via `conduct`, cloud→light dimming, cloud forms (Wave 2, the storms-and-wetness build → [weather.md](../subsystems/weather.md)). Tail still holds fog→visibility, snow depth, vector wind, wet-firewood/fire, and the far economy (farming / sailing / travel-gating).
- [fire-combustion-slate](./builds/fire-combustion-slate.md) — **next; the Fire channel** (combustion as a driver), the marquee frontier-physics build in the "real channels magic actuates" arc (sibling of the shipped electricity Lightning-frontier + storms Storm-frontier; the magic Fire school actuates it later, the Create·Lightning precedent). **Maximal scope — build the whole high-heat system in one go, stopping only at the crafting recipes.** The **combustion driver** (the **fire triangle** = the whole counterplay; a `Combustible` capability + a reconcile-on-read `Burning` state driven by a gated `CombustionApi` [`ignite`/burn/`spread`/`douse`]; ignition **routed through the reserved materials-response `thermal` channel**, no parallel damage path; three extinguishers — **water/wet** removes heat, **smother/seal** removes O₂, **fuel-starve** burns out). The **full Andy-Weir chemistry**: ignition as a derivable **energy balance** (thermal inertia + latent heat of water — reuses shipped `Thermal`/`WetMixin` numbers), **stoichiometry → complete vs incomplete combustion → smoke + carbon monoxide** (the real reason enclosed fires kill; ventilation as a reasoned mechanic), and the `analyze`/observe→predict→verify measurement surface. Plus **all the high-heat physics crafting will stand on**: **phase change** (melting/boiling/solidifying, latent-heat reserve-clamp — smelting *is* melting; unlocks the deferred Water ice/steam too), the **forge/kiln/oven furnace family** (generalizing the shipped `Campfire`), and an **inert heat-as-crafting-control seam**. New `Material` props: `autoignitionTemperature`, `heatOfCombustion`, `meltingPoint`/`latentHeat` (real K / MJ·kg⁻¹). **Deferred (the line): the crafting recipes themselves** (cooking/smelting/smithing → [crafting.md](../subsystems/crafting.md)), fire-as-combat-weapon, the far economy. Promotes the combustion + phase-change design already in the [thermal tail](./tails/thermal-slate.md).

**Phases:** vitals substrate (built → tails) → encumbrance (built → tails) → metabolism (built → tails) → respiration (built → tails) → **thermal (built → tail)** → **weather Wave 1 (built → tail)** → **storms-and-wetness / weather Wave 2 (built → tail; wetness substrate + Storm frontier)** → **fire / combustion (next; the Fire channel)**.

### 4. World places & navigation
*A long, sequenced content build.* The Warren elastic-graph substrate +
a rudimentary lounge shipped (→ [location.md](../subsystems/location.md));
the slate's deferred procedural/spatial consumers now live in
[tails/multilocation-slate](./tails/multilocation-slate.md). The build
continues with the content + navigation layers on top:
- [lounge-slate](./builds/lounge-slate.md) — the full spawn lounge content (locked slate); the rudimentary lounge that shipped with the substrate is the seed.
- [fast-travel-slate](./tails/fast-travel-slate.md) — **shipped (v1)** → [fasttravel.md](../subsystems/fasttravel.md); the Teleport Authority network (terminals + scan-to-register credential + dual-mode `teleport`). Slate now a tail holding the living-infrastructure wave.
- [eternal-university-slate](./builds/eternal-university-slate.md) — campus content area; built after char-gen + lounge.
- [inquiry-slate](./builds/inquiry-slate.md) — the **learn-by-discovery substrate**: how *sim-native* knowledge is discovered (observe→measure→hypothesize→**predict**→verify), banked (Competence), published (teachable goods), and corrupted (the **wrong-paper** mechanic — self-defending, so misinformation is a *social/temporal* exploit gated by verification cost; the insidious case is the evidential-range **overreach** paper). Truth is **demonstrated, not argued** (the deduction-slate spine). Spun out of capability-magic Part IV (2026-07-15); magic is its first consumer, combat/medicine/crafting/farming are peers. The gamification-mirror "teach *how to know*" engine. **Loose now, tight-seam reserved** on real-course credit.
- [onboarding-slate](./builds/onboarding-slate.md) — new-player onboarding; starts at campus arrival.
- [map-slate](./builds/map-slate.md) — spatial-visualization client pane; an enhancement built when earned.

**Phases:** multilocation substrate (built → tails) + rudimentary lounge → full lounge → **fast-travel (built → tail)** → eternal-university → onboarding → map.

### 5. Authoring & CMS
*Creator tooling.*
- [cms-slate](./builds/cms-slate.md) — content-authoring tools; Monaco editor
  core. **Wave 1 (file/template/document explorer + Monaco) shipped** →
  [../subsystems/cms.md](../subsystems/cms.md); **Wave 2 (the Studio — the
  mixin-aware composition surface: `@authorable`-derived schema-driven form,
  the blueprint catalogue, the class scaffold/commit bridge) shipped** →
  [../subsystems/studio.md](../subsystems/studio.md). Kept in `builds/` for the
  deferred remainder (per-type / bespoke content editors + zone/map canvas,
  drafts/publish + the law==code forums-review gate, versioning).
- [authoring-intelligence-slate](./builds/authoring-intelligence-slate.md) —
  compiled `.d.ts` type surface + LSP for authors. **Its first two catalogs
  (the mixin-particle palette + the named-blueprint catalog) shipped with the
  Studio** ([../subsystems/studio.md](../subsystems/studio.md)); kept in
  `builds/` for the engine-typed IntelliSense / LSP / host-isolation remainder.
- [scoped-authoring-slate](./builds/scoped-authoring-slate.md) — personal / scoped authoring permissions.
- [provenance-slate](./builds/provenance-slate.md) — the authorship substrate bridging
  authoring (this build) and **producer influence** (§9): ownership + attribution +
  dependency-DAG credit + an in-runtime VCS. **First brick SHIPPED** — the append-only
  `AuthoringEvent` ledger + context-derived author → [provenance.md](../subsystems/provenance.md)
  (the producer faucet's routing input). Kept in `builds/` for the build-sized remainder
  (the dependency-DAG credit graph, git-in-runtime VCS, the author≠owner un-fusing that
  [property](./builds/property-slate.md) consumes).
- [git-workflow-slate](./builds/git-workflow-slate.md) — the **in-runtime VCS**
  brick provenance reserved: a gated `GitApi` that turns runtime source edits into
  commits pushed to GitLab (version history · review · rollback · **durability across
  redeploy**). Governing insight: **the working tree *is* the live server**, so it's
  **snapshot-and-push** (box-on-a-long-lived-`authoring`-branch, `publish` = add/commit/push,
  isolation moves to the MR layer) — never working-tree branch-switching. Security spine:
  **every git op is gated by the same per-path `can('write')` predicate as a direct source
  write** (git is not a permission bypass; `publish` stages only writable files → per-owner
  scoping falls out; revert-only, `reset`/force-push deferred). Identity: **one shared push
  token + per-avatar `--author`** (mirror of the `AuthoringEvent` ledger). **Wave 1 (source
  plane) SHIPPED** (MR !132) → [../subsystems/git-workflow.md](../subsystems/git-workflow.md);
  kept in `builds/` for the remainder: content/document→git (Mongo→file export) + finer-grained
  review + per-user `/home/` submodules.

**Phases:** type surface + diagnostics (shipped → diagnostics.md) → CMS editor core (shipped → cms.md) →
the Studio composition surface + first authoring-intelligence catalogs
(shipped → studio.md) → scoped authoring · provenance (first brick shipped) · **git-workflow
(in-runtime VCS Wave 1 shipped → git-workflow.md; content-export / finer-review / subrepos deferred)**.

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
- [livelihood-slate](./builds/livelihood-slate.md) — the *livelihood & consequence* spine: **violence has no payday; livelihood comes from work; the world's money is conserved with authors running their own budgets; consequence is recorded, not mechanized.** §5 (the **employment model**) **shipped** → [employment.md](../subsystems/employment.md), and the **work-contracts build shipped the §5 gig kernel + §6 arrangement generalization** → [contract.md](../subsystems/contract.md) (clauses/escrowed gigs/the job board) + compensation bases + the draw. Kept in `builds/` for the unbuilt rest: death-as-cascade-terminus (§1), the adjudication stack (§2), the systemic gig generator + NPC claiming (§3/§5.3 tail), the **conserved-economy** big model (§4), §6.3–§6.5 terms, the constituency walks (§7), and the Circulation-Reserve public-works program (§8).
- [retail-slate](./builds/retail-slate.md) — the **retailer** business archetype (the shop, after the shipped bar/maker-seller and bank/service) and its **four-build arc**, framed as *one small shop build plus two economy substrates it grows into* — complete-at-tier at every stage. The load-bearing split: a **sell** price is a transfer (can't mint → a feel knob, safe to author freely, calibrated to stipend/wages/coinage as *stance* per Law 1), while a **buy-from-player** price is the vendor-trash faucet (deferred behind the reserve). **S1 — the general store** (retail counter: buy from bounded stock + P2P consignment; heavy reuse of `Business`/Attendant/banking/containment + the bar's `Menu` offer pattern) is **SHIPPED (MR!143)** → [retail.md](../subsystems/retail.md) + [chattel.md](../subsystems/chattel.md) (built property-first over the chattel possession core; `PricedOfferMixin` extracted from the bar's `Menu`; the reset sweep graduated). **S2 references the [city-economy](../staging/terminus-city.md) build** (the Circulation Reserve = the welfare-floor buy; welfare is monetary policy, not a shop feature — not owned here). **S3** = the producer/mine + cost/supply-derived pricing (closes the mine→ore→shop→player loop). **S4** = player-owned shops + franchising + the corpo market arena (the apex; corpo Phase-2 pointed at retail).
- [property-slate](./builds/property-slate.md) — the **possession / real-estate / compute-scarcity** substrate — the foundation under pets, ranching, farming, and the economy + governance tiers. Governing insight: **two separate conserved scarcities — money (prices *land*: parcel tax, market) and compute-allowance (prices *liveness*: parcel-bound, governance-allocated, non-transferable, total = the box)** — never collapsed, coupled only at the parcel (*land is the container of a compute allowance*). Property = **the right to run a subdivision** ("pay to run, not to visit"); the dorm is `HomeZone` un-grown, real estate is it grown up (starter sandbox home). Net-new: the **parcel** (the join of the already-built boundary trees + a **title**), **un-fusing author from owner** (fused today: owner = immutable earliest author; the deferred provenance "ownership hierarchy" + CMS "lease model" are its two halves), a **two-layer compute model** (predicted heartbeat-budget at CMS-save + runtime degradation-ordered-by-deficit; *tolerant of bad prediction by design*), measured via the **call-security Proxy** (CPU) + a **registry sweep counting shallow-once** (memory), enforced as **dormancy** (freeze → evict). Four-phase spine: possession core → compute economy → governance allocation → tenancy. Consolidates the scattered tenure/ownership deferrals. **Phase 0a (real-property *title*) SHIPPED** — the parcel primitive + gated `parcels` registry + `ownerOf` chain + `subdivide`/`transfer`, ownership un-fused from authorship and moved out of the editable `domain` collection; see [parcel.md](../subsystems/parcel.md). **Phase 0b's serialization-boundary half SHIPPED** as the **self-persistence spine** (§I–K: `PersistableHolder`/the serialization boundary/seed-then-persist — property, inventory, room contents now survive eviction/logout/reload; Avatar migrated on) — see [persistence.md § The self-persistence spine](../subsystems/persistence.md). Chattel/possession (the 0b ownership half), compute economy (Phase 1), governance allocation + tenancy remain.
- [ranching-slate](./builds/ranching-slate.md) *(STUB)* — the **animal economy**: raising **livestock** (managed as herds, not befriended) for renewable yield — milk/eggs/wool/meat/hide/draft/breeding stock. The **economic sibling of [pets](./builds/pets-slate.md)** (the relationship half) and of the **farming** work (the plant half); all three sit on a shared **husbandry / possession** base. The Creature/Character split *is* the livestock/pet split (thin resource vs rich relationship); **domesticability is one axis spanning wild→pet→livestock**. Divergent layer (net-new): **yield/production cycle**, **breeding** (`SexedMixin` exists; a reproduction driver likely doesn't), butchering→crafting, herd management + predation. Integration seam with farming: the conserved **crops → feed → livestock → products → crafting** loop + land tenure. Heavy customer of the possession + maturation gaps named in the pets slate. Deep pass deferred to the farming session.
- [farming-slate](./builds/farming-slate.md) — the **plant half of agriculture**, an **integrating vertical** (the Dave's Bar precedent) that composes shipped substrate + two new primitives (a plant/soil biology engine + a genetics layer) and grounds the deferred magic vision in real biochemistry: *Stardew on the surface, real science underneath.* The **land model** (farm = a Warren budding field-**parcels**; aggregate soil-as-bulk default vs `Slotted` beds for boutique crops — ownership/title/compute-meter handed up to [property](./builds/property-slate.md), the **parent**), the **growth engine** (reconcile-on-read, no tick, **no presence freeze** — the metabolism divergence; Liebig = weakest-link `Grade`; GDD = `∫thermal`; six soil `Reserve`s; stages teach *when*), the **anti-idle** ladder (real-time upkeep against the parcel's compute allowance; automation shifts who-pays — you/farmhand-wages/script-compute — never removes the floor), **numbers-with-error-bars vs the θ-band self-estimate**, **genetics** (genes as *reaction norms* not values → G×E falls out correct; `Genome`→`express`→`GrowthParams`; Mendelian on-ramp + quantitative `R=h²S`; a **husbandry-wide breeding substrate shared with [ranching](./builds/ranching-slate.md)** — build it once), **magic as pharmacology** (no engine word — compounds hook augmentation/vitals/perception/thermal/reserve; composes with [capability-magic](./deferred-rpg/capability-magic-slate.md)), the **synthesis/brewing** transform branch of crafting (extraction/reaction/purification; the engine runs the chemistry off-recipe → discovery), and the **University external-mastery seam** (real proctored mastery → in-game capability via the credential substrate; one issuer behind a seam; raises the ceiling, never gates the floor). **Staple-loop v1 buildable now** (no genetics/magic).
- [fishing-slate](./builds/fishing-slate.md) — the **third extraction vertical** and the **lightest**, a lean sibling of [mining](./builds/mining-slate.md)/[farming](./builds/farming-slate.md) (not a full integrating vertical): ~90% composition of shipped substrate + **one new primitive (a catch-distribution model)** + **one small bespoke mechanic (the landing contest)**. Owns the niche the others leave empty — the **accessible, opportunistic, contemplative** vertical (*panning grown up*; the socializer's low-attention income floor), deliberately **low-vitals-load** (fishing is the body's *rest* to mining's *gauntlet*). The core act is a durative **engaged activity** (`cast` → wait → bite → land); the play is **reading the water** — a hidden, learnable, per-cast-stochastic catch table that is a **function of the shipped weather/time/biome fog** (fishing is the **first real gameplay consumer of weather-as-a-system** beyond wetness). The **landing contest** is bespoke-and-light (a `reel`/`give` strain-vs-break push-your-luck, **NOT** the combat engine — keeps the calm tone; small fish auto-land). The full design space is **three orthogonal axes over one catch substrate** — **place** (shore-feature → boat → dive), **method** (hand → rod → trap/pot → net → commercial), **noun** (finfish/crustacean/mollusk/cephalopod/eel/plant/apex, all `Creature`s or forageables) — so it's large but the engine is small (v1 pins one cube cell; each wave adds one axis-value). Underneath sits **water composition** as the honest-science layer (salinity/temp/clarity/O2/current/contaminant — each riding a *shipped* system: bulk/thermal/light/respiration/biome — driving the catch table). **Current & tide are the dynamics** — current a flow-field (drift shapes the cast, the seam is the feeding lane, the fish uses the flow in the landing contest, drift-fishing emerges), tide a **stateless procedural clock** (`TideApi.tideAt` — the `WeatherApi.weatherAt` shape, off `CelestialApi`; no tick, deterministic → zero new dice) that gates the bite window *and opens/closes the shore flats as rooms* (low-tide clam-rake vs. high-tide boat + the avoidable cutoff danger); in tidal water the current *is* the tide's derivative, so one celestial clock drives the whole rhythm. **The "grid of rooms" resolves cleanly:** `CartesianLocation` is already `x,y,z`, so a whole water body is **one `CartesianZone`** — shore = the water is a *feature* in a normal land room (v1, zero new spatial cost); boat = a **liquid warren** (the elastic-graph `Warren` substrate — a graph by default for rivers/ponds/marshes, a `CartesianZone` lattice only for the open sea; *don't* subclass per body-type — liquidity is one orthogonal medium layer over a ~2-shape topology grammar + data); dive = the depth-layer beneath each node (the `z`-axis in the lattice / a `dive` exit in the graph — the vitals gauntlet re-admitted). A **liquid warren** in the abstract = a Warren whose members share one connected `Bulkable` fluid, which forces immersion-occupancy + a depth relation + current-weighted directional edges + fluid mixing/tide-level (the `Biome`-medium idea, for liquid instead of air). Fits: crafting source node (clean→cook→**preserve**), the **salt-cod tie-in** with mining's salt (the flagship cross-system click), the driver that finally builds **perishability** (raw/spoiled fish = a toxin dose → *why* cooking/salting matter), and the **overfishing/commons** sustainability hook (a Resource-Governor lever). v1 = the minimum loop at one authored water (Terminus docks / moor pool); noun-breadth/crabbing/nets/boat-grid/diving/aquaculture/commercial deferred to waves.

**Phases:** currency slice → crafting venue slice (Dave's Bar) → (skill / quality / recipe-spread deferred with the advancement layer) · (macro balance deferred to a real game). Corpos: marks (shipped) → faction gameplay (deferred). Retail: general store (buildable now) → [reserve/city-economy] → producer + real pricing → player-owned shops + market arena. Property: possession core → compute economy → governance → tenancy. Agriculture: farming staple-loop (buildable now) → genetics/breeding (shared with ranching) → synthesis/magic → University seam; ranching deep pass rides the farming session.

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
  contributions — creation / capital / participation) → three co-equal
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
  (~100%, diluting) · **0% consumer** (players' house ceded) · **capital-match
  + 1** (a working majority that erodes as the community grows) · **the
  *granted* control sunsets at ratification** — but the founder's *earned*
  producer influence persists like any member's (only the capital-match + margin
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
**First slice SHIPPED** — the measurement substrate (Catalog / Transcript /
derived Competence) graduated to [advancement.md](../subsystems/advancement.md),
and the personality layer to [trait.md](../subsystems/trait.md). Kept in
`builds/` for the deferred build-sized remainder (guilds-as-institutions,
the player-extensible content-graph + governed canonization, the
education-vertical sensor bridge, estimator tuning). The hard constraint:
**a character must be able to advance without ever entering a classroom**
— a real RPG first, the academic vertical optional fuel.
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
- [guild-slate](./builds/guild-slate.md) — the **vocation institutions**
  (supersedes + extends advancement-slate § Guilds / § Declared focus):
  guilds as **chartered, authored institutions** over the Catalog whose
  spine is **mysteries / calls / marks** (wish fulfillment, not a skill
  channel). The formation rule (**vocation = discipline × livelihood**;
  career grain; clubs are free chat groups), the four layers
  (vocations liberal / institutions population-scarce / corpo **wings
  never forks** / clubs), **no magic guild** (a guild's synergized
  magic = its mystery tier), the divergence axes (public/private/
  sponsored/religious charter, loyalty, selectivity incl. **tapped**;
  the military = a guild at extreme public settings), three membership
  tiers (associate / member / master; friction inverts; teaching-gated
  mastery), the **chartered uniform training budget** (coarse
  primary/secondary tiers; points weight training, never mint;
  conservation: total advantage bounded by practice-hours × clamp), the
  guild **job board** as clearinghouse (claim gates — the contract
  seam's consumer), the balance ledger (one global dial-set + an
  advancement gym; the rest structural, market, or firewall), wizards
  (clearance ≠ expertise; the Worldwrights; credential = evidence never
  clearance), the charter schema + lifecycle (schism, dormancy by
  rent, merger), and the **audited launch roster** — 10 day-one
  institutions + 8 **standing charters** (authored-but-dormant halls
  that open when their vocation's economy activates — a reopening is a
  world event), each entry passing the three-question audit (*who
  pays · which law layer · world-native fantasy or genre import*):
  **no standing military** (one administered realm → the Marshalcy is
  a credential + writ-contract stream, posse comitatus = the calls
  mechanism, the army-fantasy homes in an alignment-flavored Warding
  Order), the Factors/Carriers demoted (**the engine automates the
  middlemen** — trust-work is engine-work, labor-work is player-work),
  metabolism + the wear economy as bedrock paymasters, polity paper
  for DAU-independence, and the **Landwrights** real-estate deep-dive
  (survey / valuation / conveyancing / development / tenancy over the
  parcel-title + apartment-ladder substrate, anchored DAU-independent
  by the polity's assessment contract). The roster doubles as the
  employment/venue content worklist.

**Phases:** first slice (two paths, two guilds, the loadout) → guild
institution model ([guild-slate](./builds/guild-slate.md)) →
player-extensible content-graph + governed canonization
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
| [external-chat-relay](./tails/external-chat-relay-slate.md) / [youtube-relay](./tails/youtube-relay-slate.md) | streaming.md | **Twitch (two-way) + YouTube (read-only) SHIPPED** → streaming.md (unified `watch`/`tune` surface over a `StreamerTarget`; superseded the parallel-mirror + full-two-way plan); slates retained for the deferred **YouTube outbound** (insert + quota accountant + per-player `force-ssl` OAuth + `GoogleProfile` token extension) |
| [augmentation](./tails/augmentation-slate.md) | augmentation.md | Wave 2+ (Wave 1 shipped) |
| [affordance-verb](./tails/affordance-verb-slate.md) | put/give/Surfaced (shipped) | source-scoping (`::`), command-provenance |
| [async-commands](./tails/async-commands-slate.md) | command-routing.md | **shipped (MR !122)** → command-routing.md § Async dispatch + command-spec.md: opt-in `async` override (spec field + reserved `--async`/`--sync` flags, accept-time detach in `_executeOne`, sync stays per-giver/never-global) + the `script` verb. Deferred tail: a line-level prefix for bare typed multi-statement scripts, a per-actor async cap, a generic cancel verb |
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
| [content-packs](./tails/content-packs-slate.md) | content-packs.md | **substrate + first packs shipped** (`PackApi` reconcile installer + base-library + species-and-names, incl. the first side-collection `name-banks` kind → content-packs.md); deferred: the other packs, retiring `SeederManager`, `seed-missing`, world packs, version machinery, round-trip/export, migrations, marketplace |
| [species-expansion](./tails/species-expansion-slate.md) | race.md / content-packs.md | **substrate + first content pass shipped** (troll + ghoul NPC-first casts + the gnome/half-elf/orc playable + ogre/kobold/satyr data batch, on `feature/species-and-names-pack`); deferred: the deeper personhood casts (flesh-golem / doppelganger / zombie / synth — they want mechanics) + per-species playability |
| [client-cockpit](./tails/client-cockpit-slate.md) | cockpit (several tracks shipped) | remaining client-track umbrella |
| [language](./tails/language-slate.md) | comms / perception | comprehension; roleplay flavor |
| [reactions](./tails/reactions-slate.md) | reactions.md / emotes | core shipped (act-scoped emote + aggregate-delta + `react` + chips); deferred: analytics event-tap, emote-flood salvage |
| [persistence-architecture](./tails/persistence-architecture-slate.md) | persistence.md | Wave 3 un-Stuff marshallers (Waves 1-2 shipped) |
| [residency](./tails/residency-slate.md) | lifecycle.md → residency.md | **eviction shipped 2026-07** (self-eviction of the cold tail: `canEvict` default-cull hook + dispatch/presence recency + `ApiLogic` + the R2.x-derived veto roster, observe-first → residency.md); deferred: the game-time **reset** sweep (`resets:`/`ResettableMixin`, restock vs field-revert), memory-pressure-modulated aggressiveness, per-object footprint, incremental/LRU sweeping |
| [vitals](./tails/vitals-slate.md) | vitals.md / reserve.md | application waves — live condition progression, the death-transition driver, assessment / instruments / treatment, consumables, forensics (substrate / Wave 1 shipped) |
| [weather](./tails/weather-slate.md) | weather.md | Wave 2 shipped (storms-and-wetness): precipitation→wetness, cloud→light dimming, storm lightning, cloud forms, authored per-Locality climate/pins. Still deferred: fog→visibility, snow depth, hazards, vector wind, wet-firewood/fire, the far economy (farming / sailing / travel) |
| [multilocation](./tails/multilocation-slate.md) | location.md | deferred procedural / spatial Warren consumers beyond the shipped social-elastic lounge case |
| [fast-travel](./tails/fast-travel-slate.md) | fasttravel.md | living-infrastructure wave (terminals break down / disruption, Authority wear-maintenance, the inert `status` seam) + cross-restart credential durability |
| [credential-wallet](./tails/credential-wallet-slate.md) | banking.md / fasttravel.md → credential.md | **core shipped 2026-06-27** (the `CredentialWalletMixin` holder + credentials-as-data + the payment/travel migration → credential.md); deferred: deputization as a native tenant, the issuer-authorization ledger (validity derived, the record a *presentation*), a single `CredentialCard`, a thin `CredentialApi` |
| [multi-currency](./tails/multi-currency-slate.md) | banking.md | **not built** — `Money` is already currency-tagged/closed; the durable spine (ledger/balances/supply/conservation) is currency-blind. **Half A** (thread `currency` through the 4 collections + per-currency conservation + ~12 `postTransaction` sites + reporting; launch one currency, substrate N-ready; ~1–2 days, worth doing day 1) vs. **Half B** deferred FX (peg-vs-float rate + a conservation-correct money-changer doing two same-currency transfers + the `convert` seam) |
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
- [combat](./deferred-rpg/combat-slate.md) — **the combat system itself**: the terms/consent/blame frame (combat as a consented, contracted activity subordinate to the social contract), the employment-economy placement (no kill-loot), the loadout/affordance model, the expressive layer (mechanical core = commodity; reactive/expressive = the authored product), and the **poise minigame** (one session-scoped gauge, overextend economy, binary-timed openings, directed-autocombat tick loop, Master-Apprentice validated). The "combat system" [combat-tactics](./deferred-rpg/combat-tactics-slate.md) party-strategy half **shipped** as the combat-formations build.
- [combat-tactics](./deferred-rpg/combat-tactics-slate.md) — combat's **spatial + party-strategy** halves: engagement-graph-not-geometry + party-level presets. Both theses **shipped** (the engagement graph = combat-slate's threat graph = the built `CombatGraph`; the presets = the combat-formations build, renamed *formations* — see [combat-formations.md](../subsystems/combat-formations.md)). What keeps the slate alive is the **ranged-as-relationship** surface (kite/close/artillery over engaged-status, the `physical` conduit transmissivity channel, cover-as-status) — the design the deferred ranged build consumes.
- [materials-response](./deferred-rpg/materials-response-slate.md) — the **`mechanism × material × construction` response substrate** combat is the first consumer of (armor mitigation + `Trauma` generation from one function; **construction** as the new value-object primitive — "mail and plate are the same steel"; layered coverage). Now also carries the full **weapon** model (compact derived property bundle: delivery/reach/handedness/balance/guard/gambits; reach-as-engagement-control; shield = wielded armor-construction; the archetype space), the **legibility/authoring** rule (author-concepts-not-numbers + a mandatory preview/inspect/lint surface), and the use-driven **lifecycle** (condition scales the profile; wear→repair→scrap→reforge; solid-state at rest). Completes the channels-not-nouns decomposition; grows to structures/thermal/vessels.
- [party](./deferred-rpg/party-slate.md) — the **party** social axis as first-class Stuff (membership over `GroupApi`; captain-authority + formation-roles [shipped — combat-formations]; one-active-at-a-time; the **guild≠party≠corp** wall — party = the disposable *operational* axis; party-vs-combat-side two-layer; the anti-loot payout-split payoff). Two-timescale progression: slow **reputation** (name-not-roster, provenance-grounded, halo-as-recognition-not-transfer, multi-valent, contract-access) + fast **odometer**; **no party-XP** (competence individual, synergy emergent). Heterogeneous (NPC/AI members via employment + brains).
- [odometer](./deferred-rpg/odometer-slate.md) — **honest number-go-up**: the journey-tally half of XP split from the capability-input (discarded). Subject-scoped (personal + party + beyond), monotonic, authored specific counters + aggregate headline, **downstream-inert** (the bright line — never spent, never a capability gate → the balance problem dissolves). Milestones = recognition/titles not power; the monotonic sibling of decay-based participation; nearly free over ledgers already kept. Personal by default.
- [alignment-religion](./deferred-rpg/alignment-religion-slate.md) — alignment & religion (very preliminary).
- [affiliation](./deferred-rpg/affiliation-slate.md) — guild / corp social organization (guild = the class system).
- [spoiler](./deferred-rpg/spoiler-slate.md) — spoilers & secrets; deferred to the assessment system.
- [collision](./deferred-rpg/collision-slate.md) — **decomposed (resolved 2026-06-10):** intentional blocking → the npc-behavior "guards" brain; capacity + pushing → defer-til-content; diegetic prohibition is already ~80% in-engine. Retained for reference; not a standalone build.
