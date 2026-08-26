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
- [distance-perception-slate](./tails/distance-perception-slate.md) *(tail)* —
  things seen at a distance: vista references (resolve-on-read
  landmark details, generalizing the crossing's clock-tower
  live-read), bounded one-hop peek through exits (aperture + light +
  concealment-gated), privileged reach beyond (scry territory), and
  the danger-sense-before-traverse baseline (push what the shipped
  walks already compute). Interim durable-facts-only vista rule
  adopted by the demo-content build.
- [acquisition-slate](./builds/acquisition-slate.md) — capability
  onboarding doctrine + rulings (2026-07-28): floor=reachability
  (attunement/comms/wallet-capacity only, forums leaves the bundle),
  seeking=discovery, updates-vs-credentials sorting rule, the
  need-fired credential itinerary (hiring requires payment cred;
  dorm-key digitizes), hardware=healthcare (Aevex elective vs care
  venues), first-login journey v2 over the built campus (Gus=greeter,
  Health Center off the route, Limen post-Gus). Supersedes the
  onboarding slate's Health Center/TPA-update beat.
- [power-utility-slate](./builds/power-utility-slate.md) —
  electricity as municipal infrastructure: the supply-reference
  middle tier (source gates dependents; outages mint honest work
  orders), then the municipal fork (governance office vs corpo
  concession vs cooperative), conservation-economy billing,
  utility labor; water as the sibling. Captured from the
  demo-content lamppost decision; nothing built.
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

- [deed-tags-slate](./builds/deed-tags-slate.md) — **decided 2026-08-12**,
  and the joint two other slates stalled on: the closed, registered
  vocabulary every readout over the chronicle points at (`tags` is
  *"open — inert in v1"* today). A deed-tag is **descriptive, not
  normative** — *this act was of kind X*, never *X was good* — so the
  vocabulary is layer 1, while **its RESOLUTION is political**: the
  polity **petitions** for a distinction, engineering may add, nobody may
  remove or redefine (the official-statistics model). Dotted paths with
  Topic's family inheritance + its **conservative floor** (an
  unregistered tag matches no precept, so a new subsystem can never
  retroactively make anyone a sinner), `since` on every row. ⚠ Turned up
  a live defect: `CombatLogic`'s stamped `crime` tag is layer 3 in layer
  1, contradicting accountability.md's *derived-never-stamped*.
- [tradition-slate](./builds/tradition-slate.md) — **schools of thought
  as research programmes.** A Tradition (craft school, medical tradition,
  guild lore, naturalist account, *or* faith) is normative **tenets** plus
  an **attention order** over inquiry's shared `Law` catalog: everyone's
  laws are the same and true, what differs is **who reaches them first**,
  and order is worth money because the first discoverer publishes.
  **Null laws** give a symmetric error model (naturalist = false negative,
  devout = false positive) with **no truth table to datamine** — the
  evaluator is the only oracle. Written as `Doctrine`, renamed and
  **demoted** when a stress test showed it served one of eight religious
  wants. ⚠ Worth exactly what being *first* is worth.
- [faith-slate](./builds/faith-slate.md) — the other seven wants. The
  centerpiece is **the Paladin's fall, automated** — the genre's best
  religion mechanic, never systematized because it needed a DM. Deed
  ledger + declared precepts + derive-on-read gives it without one, and
  trait's two-value arithmetic makes **redemption the mean reversion**
  rather than a mercy rule. ⚠ The fidelity value is **never readable, by
  anyone** (measurement.md's no-gauge rule) — only a surprising write
  narrates. Congregation is the **fifth GroupProvider** and you are *born
  into* one via the lineage gallery; it learns of a transgression by
  **witness, never broadcast** (which makes concealment religiously
  meaningful and the informer a role).

- [lineage-slate](./builds/lineage-slate.md) — char-gen restructured
  around **you choose a family, not a stat sheet**, on a stated fiction
  (*your majority day* — you come of age and leave the household, which
  explains the parent gallery, the antecedents budget, seeded upbringing
  and starting capital all at once). Names the platform's missing
  **fourth kind of value — endowed** (neither derived nor declared),
  under the rule *endow what creates a relationship, **never** a
  ranking*. The gallery is **a grid, not a bio** (ONI's reason), and is
  safe to optimize precisely because **its columns are incomparable** —
  informs the choice without solving it. ⭐ Parents are **records, not
  NPCs**: an *unrealized person record* is a primitive the world already
  needed, and it is what finally makes chronicle's inert `who` mean
  something. Decided: no hybrid species; rerolls priced against starting
  capital. ⚠⚠ **Healthspan, not lifespan** — aging is real and *never*
  terminal for a player, because a lifespan clock would be the most
  rankable stat in the game and no countervailing cost can exist.
- [trait-slate](./builds/trait-slate.md) — a change to **shipped**
  `trait.md`: split the derived position into **equilibrium** (slow, who
  you are) and **expressed** (fast, mean-reverting), which is *free* —
  one ledger read at two half-lives. Two rules follow: **the write is
  visible, the value is not** (people have excellent access to their
  acts and terrible access to their dispositions), and **announce the
  surprising, not the every** — *"You'd not have done that a year ago."*
  Anti-farming falls out: **cheap to look different this week, expensive
  to be different.** ⚠ Settle **the denominator** before wiring forty
  subsystems, or the most-instrumented one wins everyone's personality.
  Also settles species personality in three tiers — **emergent from
  affordances beats authored**, because an authored species trait makes
  the prejudice *true*, and a true prejudice is an endorsement rather
  than an allegory.

**Status:** recognition + identification substrate shipped → `belief.md`;
chronicle ledger substrate shipped → `chronicle.md`; social-graph
attention layer shipped Wave 3 → `social-graph.md` (Wave 4 + connection
origin remain as tails). The 2026-08 design cluster —
**deed-tags → tradition → faith** — is unbuilt and sequenced in that
order: nothing in faith is buildable until the tag vocabulary exists.
**lineage + trait** are a second unbuilt cluster and share a joint: seeded
claims set `equilibrium`, so *genotype is inherited, disposition is
learned from* — and you can grow out of your upbringing, slowly.

### 2. NPCs
*Where the personality lives.*
- [npc-behavior-slate](./builds/npc-behavior-slate.md) — brains / routines / automation substrate. Absorbs collision's "guards" decomposition.
- [npc-dialogue-slate](./tails/npc-dialogue-slate.md) *(tail)* — **shipped (Wave 1)** → [../subsystems/npc-dialogue.md](../subsystems/npc-dialogue.md): the responder seam (`talk to` → a pluggable brain), the branching-tree responder, and auto-introduce. Tail holds the scripted `intent-dialogue` + LLM free-text front-end + multiplayer waves.
- [llm-content-slate](./builds/llm-content-slate.md) — the runtime LLM rung npc-behavior left open: a single director agent forces the cast over the command bus and narrates ambient scenes, expressing multi-stage behavior by authoring in the scripting language. **Not near-term.**
- [pets-slate](./builds/pets-slate.md) — **player pets**, through the NetHack lens: *a tame creature in a consistent world; the beloved moments are emergent.* **Taming is the spine** — a pet is a creature you *won over*, not a unit you bought. Three-layer model: **domesticability** (species data, *is* a dial on the fear axis) / **temperament** (dispositions, the encounter's puzzle) / **bond** (`regard`, the score). Shops sell *domesticated-but-unbonded* creatures — the bonding **back-half** of taming, not a bypass. **Stress-test finding:** the object/actor/place primitives are done, but pets X-ray three structural gaps — **possession/theft** (no owner-stamp on goods; `Charge` has no debtor), a **fear/threat axis** (regard is affinity-only), and **dependent-presence + individual-instance persistence** (presence-freeze + persist-back are Avatar-only) — plus a manner-of-approach legibility gap. Re-sequenced waves: **W1 bonding (shop path, dodges every heavy gap)** → **W2 wild taming (builds the fear + approach substrate, pays off game-wide)** → W3 apex/breadth (magic tame, maturation, mount/haul/guard, spawning, shop-theft). Care is *light* (feed occasionally; neglect → drifts feral; loss is a relationship failure, not billing/starvation — the boarding money-sink is retracted). **Updated 2026-07-31:** two of the three structural gaps are **closed** (chattel shipped → custody is `ChattelMixin` on the Creature stack; the persistence spine grew multi-instance keyed hosts) — only the **fear/threat axis** remains. Pets no longer presence-freeze, which opened and then closed the **off-screen life** (a seeded deterministic reconcile + six-outcome ladder + species `homeRange`); adds the **adoption** on-ramp (the DF cat), the **care loop** (four needs, only *attention* un-delegable; training = the pet's own `Discipline` transcript), **combat** (the guardrail expired — `sideOf` rung 2 was reserved for pets), and **scale/welfare/breeding**.

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
- [fire-combustion-slate](./builds/fire-combustion-slate.md) — **shipped** → [fire.md](../subsystems/fire.md); **the Fire channel** (combustion as a driver), the marquee frontier-physics build in the "real channels magic actuates" arc (sibling of the shipped electricity Lightning-frontier + storms Storm-frontier; the magic Fire school actuates it later, the Create·Lightning precedent). **Maximal scope — build the whole high-heat system in one go, stopping only at the crafting recipes.** The **combustion driver** (the **fire triangle** = the whole counterplay; a `Combustible` capability + a reconcile-on-read `Burning` state driven by a gated `CombustionApi` [`ignite`/burn/`spread`/`douse`]; ignition **routed through the reserved materials-response `thermal` channel**, no parallel damage path; three extinguishers — **water/wet** removes heat, **smother/seal** removes O₂, **fuel-starve** burns out). The **full Andy-Weir chemistry**: ignition as a derivable **energy balance** (thermal inertia + latent heat of water — reuses shipped `Thermal`/`WetMixin` numbers), **stoichiometry → complete vs incomplete combustion → smoke + carbon monoxide** (the real reason enclosed fires kill; ventilation as a reasoned mechanic), and the `analyze`/observe→predict→verify measurement surface. Plus **all the high-heat physics crafting will stand on**: **phase change** (melting/boiling/solidifying, latent-heat reserve-clamp — smelting *is* melting; unlocks the deferred Water ice/steam too), the **forge/kiln/oven furnace family** (generalizing the shipped `Campfire`), and an **inert heat-as-crafting-control seam**. New `Material` props: `autoignitionTemperature`, `heatOfCombustion`, `meltingPoint`/`latentHeat` (real K / MJ·kg⁻¹). **Deferred at the line, since consumed:** the crafting recipes shipped with the crafting-branches build → [crafting.md](../subsystems/crafting.md); still deferred: fire-as-combat-weapon, the far economy. Promotes the combustion + phase-change design already in the [thermal tail](./tails/thermal-slate.md).
- [disease-slate](./builds/disease-slate.md) — **NEW 2026-07-31.** Infection, transmission, and **the price of density** — the one mechanic touching *every living thing*, hence its own doc. **The seam is already cut:** all 11 shipped `Condition` seeds carry `contagion: null` and `toxinBehavior` is a complete within-host burden engine, so the delta is **two things** — a **growth term** (a toxin burden only decays; a pathogen *replicates*) and a filled-in **`ContagionSpec`**. **Two idioms, not one:** within-host load is reconcile-on-read, but **room-to-room spread must be a push tick** (copying `FireLogic`'s one-hop attenuated exit walk) *because nobody reads an empty room*. **Host range over the `Clade` tree** gives *default containment, deliberate crossing* — until a **zoonosis** turns ranching into public health. **The keystone: good husbandry *is* immunity** (the resist factor reads live off host state, so the care model's condition score becomes the resistance term). Frame: **disease is the shadow of the density dial**. **Crops first**; pets and players last.
- [mortality-slate](./builds/mortality-slate.md) — **SHIPPED 2026-07-31** → [../subsystems/mortality.md](../subsystems/mortality.md); kept for its design rationale + the deferred service/underworld surface. The **dying arc** — the missing other half of every risk system in the game. **Verified gap:** seven sites write `lifecycleState = 'dead'` (three of them byte-identical copy-pasted `applyDeath` helpers) and **nothing anywhere writes back to `'alive'`**; worse, `Avatar` carries the dead state through the snapshot spine, so **a player who dies today is bricked permanently**. `Vitals.getConditionBand` already documents the seam ("the deferred driver owns transitions"); this is that driver. **The keystone: death is the sandbox crossing run backwards** — the same `ForkableMixin` protocol, but forking the *body* out of the person instead of the person out of the body, with the **material/forensic slices fork-only**, so **the corpse's un-reanimatability is enforced by protocol rather than policy**. Three objects at death: the **corpse** (a separate persistent Stuff carrying the real wound map + cause stamp, decaying on its own clock so forensics works whether or not the player returns), the **shade** (a `WireBody` sibling — `shouldPersist() → false`, identity-threaded, carrying the shell slices, and **holding the `PlayerApi` slot** because it is the player's only body while dead), and the **new body** at re-embodiment. **Death is an experience, not a waiting room:** the shade is *unconfined*, roaming the ordinary map as an **overlay** anywhere the general public may walk — which needs no new access model and never touches parcels, because a baseline vessel holds **no keys, no credentials, no gear**, so the shipped `Lockable` machinery does it for free (**the shade walks; it never phases**). It is perceptible because *being dead doesn't log you off* — network presence, **not** a spirit-fabric reading of the aether — at a fidelity set by **awareness competence**. **The engine owns two transitions and nothing between them** — `die` and `reembody` — with **no route/terms vocabulary** (a schema for content that doesn't exist yet would constrain the authoring space rather than serve it); a resurrection business or a Hades journey is content that charges through banking, gives and takes through containment, and finishes by calling `reembody`, needing **no engine work**. v1 ships those two transitions, and an argument-less `passage` **floor** so no player is ever stranded. A `perceptualPlane` axis was built and **CUT** — it could not tag a *place* (`Location` doesn't compose `ConcealableMixin`) and gated sight rather than passage (traversal is `canTraverse`), so it could not do the job it was justified by; an underworld wants a traversal gate on incorporeality, and the ghost-in-the-tavern beat is already expressible through concealment's own bands. **Doctrinal split:** NPCs keep race.md's same-Stuff corpse; only a PC's body splits, because only a PC has an identity that must leave. Nearly all durable state survives free — **the ledgers all key on `getIdentityPath()`, not the object**. Ships dying-as-a-clocked-rescuable-state, the stabilization seam on the **already-shipped** medic loop, the corpse, the passage **floor** (the Orpheus ladder stays content), and the chronicle + accountability writes death has never made. Design authority stays [deferred-rpg/mortal-vessel-slate](./deferred-rpg/mortal-vessel-slate.md), which keeps its moderation/prison half.
- [health-vertical-slate](./builds/health-vertical-slate.md) — **NEW 2026-07-31.** The **vertical** over disease + harm: clinical assessment, diagnosis, treatment, prevention and public health, **across people and animals both**. Spans four layers no single slate owns — the engine, the **institutions** (a public-health *department*, staffed via the **College of Physic**, whose demand anchor already reads *polity public-health paper*), the **demo set** (the aid post, the health-cohort cut), and the **teaching seam**. Differentiator: **every prior game's healer asks "how much healing do I apply?"; ours asks "what is wrong with them?"** — nearly free, because honest opacity + `observableSigns` + **11 shipped conditions with overlapping signs** make **differential diagnosis emerge rather than be scripted**. The six-link **chain of infection** maps link-for-link onto `ContagionSpec`; **the vet track is free**; **prevention is the unexplored half**. Largest gap: **there is no diagnosis surface at all**.

- [blood-slate](./builds/blood-slate.md) — the **transfusion economy**:
  harm ships a bleed and mortality ships death by exsanguination, so
  *you can stop a bleed but you cannot undo one*, and given how combat
  resolves that is the most common serious injury in the game. The
  substrate mostly exists — ⭐ metabolism's `introduceToxin` is *"the
  bloodstream seam past digestion"*, i.e. **the transfusion door, already
  built** — so the work is a compatibility check in front of it. Carries
  the **first *endowed* value**, blood type: pure relationship, no scale,
  nobody's is better (genotype stored, phenotype derives). Compatibility
  is a **cost curve, not a gate**. v1 is **gift-only**; ⚠ the **Titmuss
  lever** (paid donation, and whether payment *reduces* supply) is
  designed-for and deliberately **not built**.

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
- [currency-slate](./builds/currency-slate.md) — the **decision layer** over the money substrate: the Compact's currency is the **zorkmid**, denominations are **structural** (`(currency, faceValue)` — no authored coin names; culture supplies "fiver"), reserve status is **functional not decreed** (make Compact obligations payable only in zorkmids), and there is **no exchange, permanently** — currencies are goods, and a **peg is an issuer's redemption promise, not a world rate**. The issuer generalization **shipped** (2026-08-05) with exactly one currency → [banking.md](../subsystems/banking.md). Kept for the design surface the build deliberately did not touch: **company scrip** (the truck system — the use case the generalization exists for), acceptance-on-offers, and who may charter a second issuer.
- [money-integrity-slate](./builds/money-integrity-slate.md) — ⚠ **follow the money, end to end.** The governing finding: there are **two conservation domains and only one is sealed** — the ledger has `postTransaction`, cash is ordinary `Stuff` and had nothing equivalent. The currency build closed the two holes on paths it already rewrote (the `setQuantity` gate; the audit's blindness to snapshotted coin); **the rest is unswept** — crafting yields, content packs, the CMS coin row, clone-a-coin, `materialize` idempotency, the sandbox cash boundary, destroy-without-drain. ⭐ Its real deliverable is a **property test over the object layer**, because gates decay. ⚠ One of its three original findings was **wrong** and only driving caught it — the correction is recorded in the slate.
- [crafting-slate](./tails/crafting-slate.md) — **shipped across two builds** → [crafting.md](../subsystems/crafting.md). The bar build shipped the served path (Dave's Bar four-tuple, recipes-as-Documents, `Grade` quality, the maker's mark); the **crafting-branches build** grew it to three branches over one skeleton (bulk drinks / smithing / cooking), the by-hand knowledge ladder (claim vs the can-make deed), the two wear axes (`Durable` condition + `Keen` edge), and the full lifecycle (repair/salvage), with menus commerce-only and working verbs instrument-conferred. Tail: the skill-as-control seam (`deriveAtFixedControl._control` — advancement's side), remaining recipe-spread vectors, assembly recipes, the tailoring branch, and later branch consumers (glassmaking/brewing/alchemy) — the live list rides crafting.md § Deferred seams.
- [corpos-slate](./builds/corpos-slate.md) — the fictional megacorps that own the private sector: a cross-cutting **affiliation/competition fault line** + a **mark** on the goods of the world. **Phase 1 (marks + booze portfolios) shipped** → [corpo.md](../subsystems/corpo.md) — the five corpos + their brands as authored reference-identities, brand→corpo resolution, the per-product `Branded` mark. Kept in `builds/` for the deferred phase 2: the player-facing **faction gameplay** (the multipolar approval vector, competition, sponsorship, portfolios beyond booze) — a build's worth of design, not a tail.
- [livelihood-slate](./builds/livelihood-slate.md) — the *livelihood & consequence* spine: **violence has no payday; livelihood comes from work; the world's money is conserved with authors running their own budgets; consequence is recorded, not mechanized.** §5 (the **employment model**) **shipped** → [employment.md](../subsystems/employment.md), and the **work-contracts build shipped the §5 gig kernel + §6 arrangement generalization** → [contract.md](../subsystems/contract.md) (clauses/escrowed gigs/the job board) + compensation bases + the draw. Kept in `builds/` for the unbuilt rest: death-as-cascade-terminus (§1), the adjudication stack (§2), the systemic gig generator + NPC claiming (§3/§5.3 tail), the **conserved-economy** big model (§4), §6.3–§6.5 terms, the constituency walks (§7), and the Circulation-Reserve public-works program (§8).
- [retail-slate](./builds/retail-slate.md) — the **retailer** business archetype (the shop, after the shipped bar/maker-seller and bank/service) and its **four-build arc**, framed as *one small shop build plus two economy substrates it grows into* — complete-at-tier at every stage. The load-bearing split: a **sell** price is a transfer (can't mint → a feel knob, safe to author freely, calibrated to stipend/wages/coinage as *stance* per Law 1), while a **buy-from-player** price is the vendor-trash faucet (deferred behind the reserve). **S1 — the general store** (retail counter: buy from bounded stock + P2P consignment; heavy reuse of `Business`/Attendant/banking/containment + the bar's `Menu` offer pattern) is **SHIPPED (MR!143)** → [retail.md](../subsystems/retail.md) + [chattel.md](../subsystems/chattel.md) (built property-first over the chattel possession core; `PricedOfferMixin` extracted from the bar's `Menu`; the reset sweep graduated). **S2 references the [city-economy](../staging/terminus-city.md) build** (the Circulation Reserve = the welfare-floor buy; welfare is monetary policy, not a shop feature — not owned here). **S3** = the producer/mine + cost/supply-derived pricing (closes the mine→ore→shop→player loop). **S4** = player-owned shops + franchising + the corpo market arena (the apex; corpo Phase-2 pointed at retail).
- [property-slate](./builds/property-slate.md) — the **possession / real-estate / compute-scarcity** substrate — the foundation under pets, ranching, farming, and the economy + governance tiers. Governing insight: **two separate conserved scarcities — money (prices *land*: parcel tax, market) and compute-allowance (prices *liveness*: parcel-bound, governance-allocated, non-transferable, total = the box)** — never collapsed, coupled only at the parcel (*land is the container of a compute allowance*). Property = **the right to run a subdivision** ("pay to run, not to visit"); the dorm is `HomeZone` un-grown, real estate is it grown up (starter sandbox home). Net-new: the **parcel** (the join of the already-built boundary trees + a **title**), **un-fusing author from owner** (fused today: owner = immutable earliest author; the deferred provenance "ownership hierarchy" + CMS "lease model" are its two halves), a **two-layer compute model** (predicted heartbeat-budget at CMS-save + runtime degradation-ordered-by-deficit; *tolerant of bad prediction by design*), measured via the **call-security Proxy** (CPU) + a **registry sweep counting shallow-once** (memory), enforced as **dormancy** (freeze → evict). Four-phase spine: possession core → compute economy → governance allocation → tenancy. Consolidates the scattered tenure/ownership deferrals. **Phase 0a (real-property *title*) SHIPPED** — the parcel primitive + gated `parcels` registry + `ownerOf` chain + `subdivide`/`transfer`, ownership un-fused from authorship and moved out of the editable `domain` collection; see [parcel.md](../subsystems/parcel.md). **Phase 0b's serialization-boundary half SHIPPED** as the **self-persistence spine** (§I–K: `PersistableHolder`/the serialization boundary/seed-then-persist — property, inventory, room contents now survive eviction/logout/reload; Avatar migrated on) — see [persistence.md § The self-persistence spine](../subsystems/persistence.md). **Phase 0b is now complete**: chattel/possession shipped (MR!143) and the **furnishing** build added owner-based persistence — an owned good persists with its *owner* carrying a `place`, `ownerOf` gained the parcel rung, and acreage split into ground vs floors (`storeys`); see [furnishing.md](../subsystems/furnishing.md). Hinkley Hills then gave title **the verb it lacked** — `title`/`title list`/`title buy` over a `PlatBook` catalogue + `LotHolder` provisioner, the sale riding banking's settle chokepoint ([smallholding.md](../subsystems/smallholding.md)). Compute economy (Phase 1), governance allocation, dormancy-as-reclamation, and the tenancy *content* (a provisioned multi-room leased unit) remain.
- [ranching-slate](./builds/ranching-slate.md) — the **animal economy**: raising **livestock** (managed as herds, not befriended) for renewable yield — milk/eggs/wool/meat/hide/draft/breeding stock. The **economic sibling of [pets](./builds/pets-slate.md)** (the relationship half) and of the **farming** work (the plant half); all three sit on a shared **husbandry / possession** base. The Creature/Character split *is* the livestock/pet split (thin resource vs rich relationship); **domesticability is one axis spanning wild→pet→livestock**. Divergent layer (net-new): **yield/production cycle**, **breeding** (`SexedMixin` exists; a reproduction driver likely doesn't), butchering→crafting, herd management + predation. Integration seam with farming: the conserved **crops → feed → livestock → products → crafting** loop + land tenure. Heavy customer of the possession + maturation gaps named in the pets slate. **No longer a stub — deep pass done 2026-07-30/31:** it now owns the family's **five shared conventions** (density dial · custody = `ChattelMixin` on the Creature stack · one family clock · two yield shapes · **one care model, three outputs**), the **energy-partitioning** core model (*not* farming's limiting factor), **pasture-is-a-field** with the crop/graze/hay/orchard land-use table, and **player-set paddock granularity**.
- [development-slate](./builds/development-slate.md) — **NEW 2026-08-01.** Land, structure, and what a parcel can carry — grew out of a review question on furnishing's acreage model. **Land is declared, everything above it is measured.** Three planes (land / footprint+gross-floor / modelled rooms) and four derived ratios (coverage, FAR, efficiency, draw); **never model the tissue** (corridors and wall thickness are cells-by-role, not objects); and the decisive constraint — **zones overlap**, so the remainder is a BUDGET, not a partition. The core claim: **land's job is to make production scarce, and today it doesn't** (`parcel.area` is decorative — 500 field-cells fit on a tiny parcel). Fix: the draw rides the **bed**, not the zone (expressive) and not a declaration (honest — the player can count it); only PRODUCTIVE uses draw; over-draw is permitted with **no penalty mechanic**, because crowding is competition for light/water/nutrients and the shipped min-of-three does the rest — diminishing returns emerge, never administered. Unused capacity is indefinite, so land-banking becomes the legislature's argument. ⭐ **The hermit test**: a shack and a garden need ZERO numbers — the cap constrains player expansion, not authored content, and the CMS should propose numbers rather than demand them. Adds property-slate's missing leg: **land prices production, compute prices liveness**. Defers per-zone extent (zoning's ⭐ per-location extent).
- [notification-slate](./builds/notification-slate.md) — **NEW 2026-08-02.** The one substrate answering **"what happened to the things I care about while I was away"** — *absent*-tense, where `Sensor`/`MessageApi` is present-tense and `Bulletin` is everybody-tense. Surfaced by the wiki (watchlists) but with many claimants: a gig accepted, a consignment sold, a crop ready, a lease expiring, a reply, an office reassigned. **Nothing today is this** — `NotifyPolicy` is a *who* axis keyed on group refs, MQL/forum subscriptions die on disconnect, the `*_events` ledgers are records with no delivery. ⭐ **Not a second message bus**: an event is TYPED and its prose composed by the substrate from a template it owns, so a producer can never address a player or phrase anything — harassment and spam become structurally impossible rather than policed. Subjects are **path-shaped**, so routing is the shipped `PathTrie` (exact / subtree / longest-prefix, giving "a mute overrides a subtree watch" for free); the interesting selector is a **template path**, where watching `/lib/material/oak` catches both the article and the material. **Derive-on-read** (one event row however many watchers), coalescing and digest as read-side concerns, and ⚠ spoiler-gated at BOTH ends — subscribe-time (watching a subject reveals it exists) and deliver-time (capability changes). Kept separate from `NotifyPolicy` by axis, sharing its preference vocabulary.
- [stewardship-slate](./builds/stewardship-slate.md) — **NEW 2026-07-31.** The layer between the shipped parcel **title** and the systems that sit on land. Three things property names but never designs: **land use** (a *closed* vocabulary typing what a parcel admits — genuinely absent; a parcel is structurally typed and categorically untyped), the **residence ladder's actual gating rule** (money is necessary and not sufficient — the binding gate is the **condition of what you already hold**, which makes hoarding negative-sum with no ownership cap), and **stewardship** (visible property *condition* + a `Discipline`). Carries the **allowance cascade**: the Compact grants a locality a bundle, the locality apportions it to parcels on its own terms, while the *sandbox* draws **Compact-direct** — so **the Compact funds authorship, the locality funds living**, and a hostile local government can never squeeze a player's creative channel. Survives property's "never your couch" rule by scope: **zoning governs land use, never self-expression**. **Land use alone needs neither the un-designed allowance meter nor the deferred region parcel** — the small piece that unblocks farming/ranching/pets. **⭐ LAND USE SHIPPED (2026-08-01)** with Hinkley Hills — the closed six on `ParcelRecord`, the longest-prefix resolve, the cultivation gate ([smallholding.md](../subsystems/smallholding.md)). The allowance cascade, the residence ladder + ascent gate, and zoning-as-governance remain.
- [mirror-slate](./builds/mirror-slate.md) — **NEW 2026-07-31. Deliberately further out than anything else here.** A player's in-game state held in **parity with their real state**, so acting in the world earns in the game — the [gamification mirror thesis](../vision.md) with the loop closed at both ends. Exemplar: **instrument your real bedroom, and your game bedroom keeps parity**. The platform already models the real units (labor, condition, nutrition, skill, property); what it lacks is an **inbound** channel from the world it models, so a parity feed is *the same event arriving from a different witness* — no parallel currency, no achievement layer. The cheating problem inverts the anti-cheat posture (an assertion the kernel never witnessed), and the answer is **density, not verification**: make the signal broad and mutually constraining until producing a coherent false life costs more than living the real one — *to game it is to live it*. Hence **breadth is a prerequisite, not polish**; a single-sensor mirror is a cheat surface with a payout. Two near-invariants proposed: the platform **never sees the raw feed** (derived assertions only), and **absence is neutral — the mirror only ever adds**, so the game stays whole for a player with no instrumentation. Open: admissibility (does a reading inform *condition* but never *character*?), claim-vs-corroboration, the density threshold, the two-tier/pay-to-win risk, and whether parity is diegetic or a marked meta channel. Its only cost so far is paid: the furnishing build's D7 (rooms carry room-level state). **Flags a real corpus gap** — four designs it leans on (instrumentation, enforcement, practicum, bathroom) exist only in session memory with no file.
- [preservation-slate](./builds/preservation-slate.md) — **NEW 2026-07-31.** The **keystone deferral of the extraction family** — spoilage is the mechanism, *preservation is the endeavour*. [mining](./builds/mining-slate.md) ("Salt — the essential staple **[DECIDED]** … preservation is the killer app") and [fishing](./builds/fishing-slate.md) ("the natural driver to finally build **perishability**") both point at it and stop. **Law-2-legal by a carve the economy slate already wrote**, because **the clock starts at an *act*, never at ownership** — an unharvested crop isn't spoiling, a *caught* fish is. Mechanically it is **disease without transmission** ⇒ **the ideal first consumer of the growth term**. A **third wear axis** beside `Durable`/`Keen`. Drivers exist unevenly — wetness is universal on every `Thing`, **thermal is opt-in (~11 classes) and is the real cost**. Best consequence: **the agricultural year falls out unscripted**, which also solves the fridge problem (a cellar is free in winter, dear in summer).
- [farming-slate](./builds/farming-slate.md) — the **plant half of agriculture**, an **integrating vertical** (the Dave's Bar precedent) that composes shipped substrate + two new primitives (a plant/soil biology engine + a genetics layer) and grounds the deferred magic vision in real biochemistry: *Stardew on the surface, real science underneath.* The **land model** (farm = a Warren budding field-**parcels**; aggregate soil-as-bulk default vs `Slotted` beds for boutique crops — ownership/title/compute-meter handed up to [property](./builds/property-slate.md), the **parent**), the **growth engine** (reconcile-on-read, no tick, **no presence freeze** — the metabolism divergence; Liebig = weakest-link `Grade`; GDD = `∫thermal`; six soil `Reserve`s; stages teach *when*), the **anti-idle** ladder (real-time upkeep against the parcel's compute allowance; automation shifts who-pays — you/farmhand-wages/script-compute — never removes the floor), **numbers-with-error-bars vs the θ-band self-estimate**, **genetics** (genes as *reaction norms* not values → G×E falls out correct; `Genome`→`express`→`GrowthParams`; Mendelian on-ramp + quantitative `R=h²S`; a **husbandry-wide breeding substrate shared with [ranching](./builds/ranching-slate.md)** — build it once), **magic as pharmacology** (no engine word — compounds hook augmentation/vitals/perception/thermal/reserve; composes with [capability-magic](./deferred-rpg/capability-magic-slate.md)), the **synthesis/brewing** transform branch of crafting (extraction/reaction/purification; the engine runs the chemistry off-recipe → discovery), and the **University external-mastery seam** (real proctored mastery → in-game capability via the credential substrate; one issuer behind a seam; raises the ceiling, never gates the floor). **Staple-loop v1 buildable now** (no genetics/magic). **⭐ PARTLY SHIPPED (2026-08-01)** — living-world phases 1+2 took the growth engine ([husbandry.md](../subsystems/husbandry.md)) and the N-slot bed on owned ground, shared soil, the weakest-link harvest grade and soil nitrogen ([smallholding.md](../subsystems/smallholding.md)); two slate claims were overtaken (soil landed as TWO reserves, not six, and water is held by the GROUND). Unbuilt and why it stays: winter, perennials/orchards, the field-room + grazing, the environment-control axis, genetics, sun→ambient light, spoilage.
- [fishing-slate](./builds/fishing-slate.md) — the **third extraction vertical** and the **lightest**, a lean sibling of [mining](./builds/mining-slate.md)/[farming](./builds/farming-slate.md) (not a full integrating vertical): ~90% composition of shipped substrate + **one new primitive (a catch-distribution model)** + **one small bespoke mechanic (the landing contest)**. Owns the niche the others leave empty — the **accessible, opportunistic, contemplative** vertical (*panning grown up*; the socializer's low-attention income floor), deliberately **low-vitals-load** (fishing is the body's *rest* to mining's *gauntlet*). The core act is a durative **engaged activity** (`cast` → wait → bite → land); the play is **reading the water** — a hidden, learnable, per-cast-stochastic catch table that is a **function of the shipped weather/time/biome fog** (fishing is the **first real gameplay consumer of weather-as-a-system** beyond wetness). The **landing contest** is bespoke-and-light (a `reel`/`give` strain-vs-break push-your-luck, **NOT** the combat engine — keeps the calm tone; small fish auto-land). The full design space is **three orthogonal axes over one catch substrate** — **place** (shore-feature → boat → dive), **method** (hand → rod → trap/pot → net → commercial), **noun** (finfish/crustacean/mollusk/cephalopod/eel/plant/apex, all `Creature`s or forageables) — so it's large but the engine is small (v1 pins one cube cell; each wave adds one axis-value). Underneath sits **water composition** as the honest-science layer (salinity/temp/clarity/O2/current/contaminant — each riding a *shipped* system: bulk/thermal/light/respiration/biome — driving the catch table). **Current & tide are the dynamics** — current a flow-field (drift shapes the cast, the seam is the feeding lane, the fish uses the flow in the landing contest, drift-fishing emerges), tide a **stateless procedural clock** (`TideApi.tideAt` — the `WeatherApi.weatherAt` shape, off `CelestialApi`; no tick, deterministic → zero new dice) that gates the bite window *and opens/closes the shore flats as rooms* (low-tide clam-rake vs. high-tide boat + the avoidable cutoff danger); in tidal water the current *is* the tide's derivative, so one celestial clock drives the whole rhythm. **The "grid of rooms" resolves cleanly:** `CartesianLocation` is already `x,y,z`, so a whole water body is **one `CartesianZone`** — shore = the water is a *feature* in a normal land room (v1, zero new spatial cost); boat = a **liquid warren** (the elastic-graph `Warren` substrate — a graph by default for rivers/ponds/marshes, a `CartesianZone` lattice only for the open sea; *don't* subclass per body-type — liquidity is one orthogonal medium layer over a ~2-shape topology grammar + data); dive = the depth-layer beneath each node (the `z`-axis in the lattice / a `dive` exit in the graph — the vitals gauntlet re-admitted). A **liquid warren** in the abstract = a Warren whose members share one connected `Bulkable` fluid, which forces immersion-occupancy + a depth relation + current-weighted directional edges + fluid mixing/tide-level (the `Biome`-medium idea, for liquid instead of air). Fits: crafting source node (clean→cook→**preserve**), the **salt-cod tie-in** with mining's salt (the flagship cross-system click), the driver that finally builds **perishability** (raw/spoiled fish = a toxin dose → *why* cooking/salting matter), and the **overfishing/commons** sustainability hook (a Resource-Governor lever). v1 = the minimum loop at one authored water (Terminus docks / moor pool); noun-breadth/crabbing/nets/boat-grid/diving/aquaculture/commercial deferred to waves.

**Phases:** currency slice → crafting venue slice (Dave's Bar) → (skill / quality / recipe-spread deferred with the advancement layer) · (macro balance deferred to a real game). Corpos: marks (shipped) → faction gameplay (deferred). Retail: general store (buildable now) → [reserve/city-economy] → producer + real pricing → player-owned shops + market arena. Property: possession core → compute economy → governance → tenancy. Agriculture: farming staple-loop (buildable now) → genetics/breeding (shared with ranching) → synthesis/magic → University seam; ranching deep pass rides the farming session.

### 8. Reading & reference
*The two halves of the in-game reading substrate — a systems↔content
pair, split by center of gravity, not a wall.*
- [help-slate](./builds/help-slate.md) — the **systems** half: the developer-maintained rulebook (commands, taxonomies, mechanics, formulas + numbers, the engine/API surface), harvested from three sources into one uniform `HelpTopic` index. Outgrew its current `HelpController` + TypeDoc scaffold. Governing pillar: transparent by default, hidden only by an explicit spoiler gate.
- [wiki-slate](./tails/wiki-slate.md) *(tail)* — **shipped 2026-08-04** → [../subsystems/wiki.md](../subsystems/wiki.md): a community-maintained wiki of plain `WikiPage` Documents, every page authored, none generated from gamestate; the two-axis reveal model (appetite dial × capability ceiling) with a **reader rung** that makes the appetite half fire for ordinary players, the article dialect, and a per-surface tag policy that carried headings to forums and `<spoiler>` to chat. Tail holds Wave 2 richness (search integration, the level-3 source embed, the rest of the transclusion palette) and open questions 5–7 — anonymous web read, progress-gated reveals (⚠ NOT the capability ceiling: earned ≠ preferred), moderation depth.
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

### 13. Stewardship — the third pillar
*You hold things, and tending them well is how you rise.* Named as a
**pillar** beside learning-as-adventure and the living community
([stewardship-doctrine](../stewardship-doctrine.md) — the family's meta-doc:
the three decay archetypes, the Law-2 resolution, the status map and the
build order). Its parent slates were already indexed above and in §3; what
follows are the **planner-ready design packs**, which were written across two
sessions and indexed here for the first time by the 2026-08-11 reconciliation
pass.

⚠ **Read the doctrine's build order before picking one** — three of these
depend on nothing and can be built in any order, while most of the rest queue
behind spoilage.

- [spoilage-design-pack](./builds/spoilage-design-pack.md) — ⭐ **the keystone.** `Freshness` as a third wear axis beside `Durable`/`Keen`, on real predictive microbiology (logistic growth, Arrhenius temperature, water activity). Everything in the family that waits, waits on this. Rationale lives in [preservation-slate](./builds/preservation-slate.md).
- [fridge-design-pack](./builds/fridge-design-pack.md) — the cold-storage stack, in three power tiers. ⭐ **The icebox ships first** (no power, no dependency) — the family's canonical passive-before-powered move.
- [room-condition-design-pack](./builds/room-condition-design-pack.md) — the *"condition model"* dissolved: `Soilable` + a room debris field, **act-deposited so it freezes in absence**. ⭐ Carries one hard constraint for any builder — **care acts must attribute to the actor**, both directions, or the household commons is unreachable.
- [residence-ladder-design-pack](./builds/residence-ladder-design-pack.md) — the progression spine. Money is necessary; **the binding gate is the condition of what you already hold.** Anti-hoarding falls out for free.
- [disease-design-pack](./builds/disease-design-pack.md) — contagion and hygiene, inheriting spoilage's growth term. *Good husbandry is immunity*, pointed at bodies, herds, crops and homes.
- [household-design-pack](./builds/household-design-pack.md) — the multi-occupant case. ⭐⭐ **With one holder property condition is a mirror; with two it is a commons.** Needs no new primitive: a household is two derived reads (tenure ∪ domicile). Condition collective, competence individual, **exit always cheap**.
- [water-design-pack](./builds/water-design-pack.md) — ⭐ water has **physics everywhere and weather nowhere**. Drought is fully implemented and cannot happen. **Connect the rain to the soil, leave the tap alone** — the billing half of a water utility is declined on purpose.
- [hearth-and-larder-design-pack](./builds/hearth-and-larder-design-pack.md) — the domestic integrating vertical: a room that answers to its fire, the preserving crafts, and ⭐ **the compost heap, whose consumer already ships and whose producer does not.** Closes the food→soil→food loop and stops spoilage reading as pure loss.
- [tenancy-design-pack](./builds/tenancy-design-pack.md) — stewardship of what you **don't own**, closing a hole inside the ladder's own rented rungs. ⭐ Nearly free: room-condition's actor attribution *is* the mechanism, and the structure/contents split already exists in the persistence model (the room is the landlord's, the estate slice is the tenant's). Eviction is legitimate and stripping is not — **you can be put out, never stripped.**
- [patina-design-pack](./builds/patina-design-pack.md) — ⭐⭐ **the only loop where care makes a thing BETTER**, not merely un-worse. Patina accrues from the *cycle* (use → care), never from either alone; it removes failure modes rather than adding power; and `globIdentity` makes a seasoned object un-mergeable with a shop copy. **Unblocked — nothing it needs is unbuilt.**

**Adjacent, filed here because the family drove them:**
[supply-design-pack](./builds/supply-design-pack.md) — one model for every
source (water, power, mana): **cache the source's identity, derive its
state**, plus a closed six-entry failure vocabulary · and
[mana-economy-design-pack](./builds/mana-economy-design-pack.md) — mana as
its own conserved quantity coupled one-way to energy, which
[arcane-science.md](../arcane-science.md) now reflects.

**Phases:** land `ConditionApi.boot` (⚠ written, **not merged**) → spoilage +
compost → cold storage → room condition → disease → ladder + household. The
three unblocked slices (**patina**, the **rain edge**, the **hearth**) sit
outside that queue entirely.

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
| [kick-relay](./tails/kick-relay-slate.md) | streaming.md / connection.md | **SHIPPED (MR !152)** — the third transport (webhook-inbound Kick chat relay + `watch` embed) and Kick as a **co-equal auth provider** (`KickProfile`, login + link, PKCE) → streaming.md + connection.md; retained for the tail: **phase-2 posting** (`kick-reauth` + `chat:write`), boot-time subscription reconciliation, `kick.com/video/…` URL forms |
| [augmentation](./tails/augmentation-slate.md) | augmentation.md | Wave 2+ (Wave 1 shipped) |
| [affordance-verb](./tails/affordance-verb-slate.md) | put/give/Surfaced (shipped) | source-scoping (`::`), command-provenance |
| [async-commands](./tails/async-commands-slate.md) | command-routing.md | **shipped (MR !122)** → command-routing.md § Async dispatch + command-spec.md: opt-in `async` override (spec field + reserved `--async`/`--sync` flags, accept-time detach in `_executeOne`, sync stays per-giver/never-global) + the `script` verb. Deferred tail: a line-level prefix for bare typed multi-statement scripts, a per-actor async cap, a generic cancel verb |
| [chat](./tails/chat-slate.md) | chat.md | moderation / edit-trail |
| [sandbox](./tails/sandbox-slate.md) | sandbox.md | **SHIPPED (MR !156)** — the holodeck: circle-scope taint, the PM policy table, the Layer-4 boundary + read aperture, the wire-body crossing, the `SandboxCrossing` door, the seeding aperture, jurisdiction-targeted eval → sandbox.md. Retained for the tail: **chronicle presentation** of in-circle deeds, **accountability/consent** inside someone else's circle, **disposition symmetry** (revert vs "your personality is always you"), **SHADOW overlay mechanics**, and the carried property-slate questions (what counts as "power" at the release gate, combination exploits, instancing). Promotion/chartering and the publish gate belong to civics and the CMS slate respectively |
| [comms](./tails/comms-slate.md) | comms.md | trust-tiered policy |
| [console-filtering](./tails/console-filtering-slate.md) | console (core shipped) | search, sender-filter |
| [crafting](./tails/crafting-slate.md) | crafting.md | skill-as-control (`_control` scatter), assembly recipes, tailoring branch, batching, workshop lockers, DIY stock-pricing, skill-scaled salvage yield, seasoning/tuning beyond edges, environmental decay, recipe-spread beyond watching; post-capability-table: runtime affordance recompute, powered variants/supply gate, per-capability wear + machine-vs-hand advancement asymmetry |
| [encumbrance](./tails/encumbrance-slate.md) | encumbrance.md | **cart/conveyance handoff shipped** (the haulage build → conveyance.md/encumbrance.md § Haulage); deferred: per-item placement refinement (a frame pack beating the worn floor), augment-conferred capacity, environmental (gravity) margins, tissue-derived mass, numeric tuning |
| [metabolism](./tails/metabolism-slate.md) | metabolism.md | wired nutrient deficiencies (scurvy), hangover, chronic-toxin exposure content, spoilage / perishability, magic ingestion, fuller-stomach-slows-absorption, bulk-food eating, per-individual rates, recovery-on-relogin, numeric tuning |
| [ranged](./tails/ranged-slate.md) | combat.md → ranged.md | **Wave 1 shipped 2026-08-06** (the `close·reach·near·far` band ladder + the arena cap from real room extent, the aim×answer placement matrix, the pure `DeliveryProfile`, `energySource` readiness, splash-as-relationship and its consent gate, `throw` → ranged.md); deferred: **W2** cover + armor on the response grid + suppression, **W3** bows/crossbows/less-lethal/acoustics (where `energySource` earns its keep — bow vs crossbow share `stored-elastic` and differ only on who holds the draw), **W4** guns (the largest slab, and the one with the most in-world-law surface), plus the venue content |
| [message-rendering](./tails/message-rendering-slate.md) | message-rendering.md | GFM table input-sugar |
| [mql-subscription](./tails/mql-subscription-slate.md) | mql-subscription.md | client topology cache, bandwidth ceilings |
| [prompt-stack](./tails/prompt-stack-slate.md) | prompt.md | client format-strings, slider affordances |
| [senses](./tails/senses-slate.md) | senses.md | Wave 2+ (Wave 1 shipped) |
| [scope-modality](./tails/scope-modality-slate.md) | senses / perception | modality-scoped resolution; build-when-pulled |
| [host-slot-activities](./tails/host-slot-activities-slate.md) | activity.md | deferred activity wave |
| [locomotion-as-activity](./tails/locomotion-as-activity-slate.md) | activity.md / locomotion.md | deferred activity wave |
| [hand-slot](./tails/hand-slot-slate.md) | embodiment.md | hand-slot redesign |
| [bulkable](./tails/bulkable-slate.md) | bulk.md | thermos slice shipped; deferred: mixing/solutions, gas (`sealed`), `Container`+`Bulkable`, amount-aware appearance |
| [content-packs](./builds/content-packs-slate.md) · [content-pack-units](./builds/content-pack-units.md) | content-packs.md / document-store.md / grouping.md | **installer substrate (waves 0+1) + wave 2 shipped (2026-08-25)**: the `content` collection + boot migration, the `pack_installs` record, the three-way reconcile (keep / update / converge / conflict, pins, adoption bridge, per-pack failure isolation, flat-key check), the `pack` verb suite gated on the office-owned `pack-installers` committee; wave 2: the `document` kind over `DocumentKinds`, the collapse of `emotes`/`recipes`/`name_banks` into `documents`, the settings (merge-missing) / subject (archive-never-reap) / wiki (CAS as the pack) / command-view (store-first) kinds, `canAtPath`, `lint:test-content`, seven seeders retired, fourteen packs → content-packs.md; deferred: pack zero / the core decomposition (`SeederManager`, `GroupSeeder`, `ParcelSeeder`; wave 3, with `requires.kinds:`), the `/domain/`→`/world/` + `/trade/` path renames + hearthworks re-cut (wave 4 — the domain-local command views leave the disk fallback with it), staging, media, the repo split |
| [species-expansion](./tails/species-expansion-slate.md) | race.md / content-packs.md | **substrate + first content pass shipped** (troll + ghoul NPC-first casts + the gnome/half-elf/orc playable + ogre/kobold/satyr data batch, on `feature/species-and-names-pack`); deferred: the deeper personhood casts (flesh-golem / doppelganger / zombie / synth — they want mechanics) + per-species playability |
| [client-cockpit](./tails/client-cockpit-slate.md) | cockpit (several tracks shipped) | remaining client-track umbrella |
| [language](./tails/language-slate.md) | comms / perception | comprehension; roleplay flavor |
| [reactions](./tails/reactions-slate.md) | reactions.md / emotes | core shipped (act-scoped emote + aggregate-delta + `react` + chips); deferred: analytics event-tap, emote-flood salvage |
| [persistence-architecture](./tails/persistence-architecture-slate.md) | persistence.md | Wave 3 un-Stuff marshallers (Waves 1-2 shipped) |
| [residency](./tails/residency-slate.md) | lifecycle.md → residency.md | **eviction shipped 2026-07** (self-eviction of the cold tail: `canEvict` default-cull hook + dispatch/presence recency + `ApiLogic` + the R2.x-derived veto roster, observe-first → residency.md); deferred: the game-time **reset** sweep (`resets:`/`ResettableMixin`, restock vs field-revert), memory-pressure-modulated aggressiveness, per-object footprint, incremental/LRU sweeping |
| [vitals](./tails/vitals-slate.md) | vitals.md / reserve.md | application waves — live condition progression, the death-transition driver, assessment / instruments / treatment, consumables, forensics (substrate / Wave 1 shipped) |
| [weather](./tails/weather-slate.md) | weather.md | Wave 2 shipped (storms-and-wetness): precipitation→wetness, cloud→light dimming, storm lightning, cloud forms, authored per-Locality climate/pins. Still deferred: fog→visibility, snow depth, hazards, vector wind, moving fronts. *(wet-firewood/fire has since **shipped** as `Combustible.wetPenaltyK`.)* **2026-07-31:** the tail gained the **family coupling** pass (weather as the shared exogenous driver; the **push/pull fault line**; the **time-parameterised resolve** — ~2 lines) |
| [multilocation](./tails/multilocation-slate.md) | location.md | deferred procedural / spatial Warren consumers beyond the shipped social-elastic lounge case |
| [fast-travel](./tails/fast-travel-slate.md) | fasttravel.md | living-infrastructure wave (terminals break down / disruption, Authority wear-maintenance, the inert `status` seam) + cross-restart credential durability |
| [credential-wallet](./tails/credential-wallet-slate.md) | banking.md / fasttravel.md → credential.md | **core shipped 2026-06-27** (the `CredentialWalletMixin` holder + credentials-as-data + the payment/travel migration → credential.md); deferred: deputization as a native tenant, the issuer-authorization ledger (validity derived, the record a *presentation*), a single `CredentialCard`, a thin `CredentialApi` |
| [multi-currency](./tails/multi-currency-slate.md) | banking.md | ✅ **Half A BUILT** (the currency build, 2026-08-05) — `currency` threaded through `bank_ledger`/`bank_accounts`/`bank_supply`, per-currency conservation with a **permanent** no-crossing rule, the money renamed **`credit` → `zorkmid`**, and denominations made **structural** (`(currency, faceValue)`, no authored coin names). `banking.md` is the live reference. **Half B (FX) is REFUSED, not deferred** — currencies are goods; a *pegged issuer* (reserves + a redemption promise at its own window, breakable) survives as design, a *world rate* does not. What remains in the tail is the record of what was considered + its unclosed open questions |
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
>
> **Retired 2026-07-31**: `import-boundary` → architecture.md § The
> import boundary (§12 above; shipped and absorbed in one MR).

- [antecedents-slate](./builds/antecedents-slate.md) — **one** answer to
  *"what did this character do before now"*, with three provenances —
  **native** (this instance witnessed it), **authored** (a content
  author's fiction), **foreign** (attested by another instance) —
  differing in degree and trust, never in kind. **Phase A** authors the
  **prior, not the evidence**: a résumé (`kind × years × at`) maps to the
  BKT's starting `theta`, so an author types **stated effort, never a
  stated band** — *twenty years pouring beer* and *three years in a
  cocktail lab* come out differently because the estimator already knows
  trivial repetition teaches nothing. ⭐ A pure function of the template
  means **the crowd costs zero database writes**. **Phase B** federates
  transcripts on two engine facts (competence is *never stored*, and
  `iscedf` is already on every Discipline), via **three buckets** —
  portable / attestable-but-inert / never. ⭐⭐ *Skill is in your hands;
  standing is in other people's heads.* **Not a blockchain**, and
  structurally so: competence is not scarce, so there is no double-spend
  — it needs **accreditation, not consensus**. Export the **evidence**,
  never the estimate.
- [trade-roster-slate](./builds/trade-roster-slate.md) — **content
  design, buildable**: the 34-trade closed vocabulary the
  [lineage](./builds/lineage-slate.md) gallery generates households from,
  each trade naming its Disciplines, plausible localities, `Means` type
  and hook shapes. The join rule is the point — *Trade is not free text*,
  or the generator produces ward nurses who know smithing. ⭐ The
  actionable half is the **gap report**: the catalogue has 41 Disciplines
  but **18 are `magic-*`**, so the non-magical world runs on 23 — and the
  roster demands **21 more**, each with channel and ISCED-F code, none
  minted for sounding good. ⚠ Codes carry a verify-before-seeding
  warning.

### 11. Magic items & BUC
*NetHack's consumables as an immsim stress-test.* Most of the potion / scroll
/ ring / amulet catalog lands on **already-shipped** substrate (belief,
augmentation, thermal, metabolism, respiration, senses, teleport, reserve); a
handful reconceive (healing has no HP to restore), stress a system (identify →
prompt, detection → MQL, hallucination → rendering, amnesia → belief), or wait
on combat.
- [magic-items-slate](./tails/magic-items-slate.md) *(tail)* — **shipped**
  → [../subsystems/magic-items.md](../subsystems/magic-items.md). The reformed
  **blessed/uncursed/cursed** model (BUC as a *potency level* on the item's own
  axis — `scale`/`pick`, monotonic, opt-in `Blessable`, known-BUC a belief
  realm, cursed-sticks via the release gate) + the `Consumable`/`Effect`
  substrate (Gap 0) + the full NetHack catalog walk + a **ranked gap-roundup**
  (the build work-list). Sibling of
  [identification-slate](./tails/identification-slate.md) (the orthogonal item
  *identity* axis).
- [implements-slate](./builds/implements-slate.md) — *(spun out of the
  magic-items build, where the `Focus` class was cut)* **an implement does
  not cast; it changes what happens when *you* cast.** Specialisation by
  **inventory, not membership** — no magic guild, anyone may carry one,
  only a caster benefits. Rides the shipped grid: an implement lifts your
  effective band on **one axis** (verb *or* noun), which Tarn's Rule
  already reads. Records why `Focus` failed — a second thing to top up,
  no verb to fire it, no NetHack analogue — as the constraint list for
  whatever replaces it. Nothing built.
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

### 12. The client rebuild
*The whole front end, and the server work hiding inside it.* A Claude
Design handoff (`docs/design_handoff/`, 23 interactive screens) specifies
a complete client rebuild — civic dress, `one frame → modes → layouts →
panes`, and a hard honesty rule: **never render a figure the server did
not send.** Reading it against the code showed a large part is *server*
work, so the cycle is server-first.
- [client-slate](./builds/client-slate.md) — the durable design surface:
  the six governing decisions, the four server tracks, what in
  `packages/client` is superseded, an 8-wave cut, and 5 open questions.
  **Wave 0 + Track C shipped as S1 "figures on the wire"** (MR !172) —
  the extended `<quantity>` tag (a *registered*, non-inert reading with
  channel + provenance), five topic facets so a filter is one rule
  rather than ninety paths, and the live standing figures over a direct
  `durableKey` witness → [../subsystems/messaging.md](../subsystems/messaging.md),
  [topics.md](../subsystems/topics.md),
  [mql-subscription.md](../subsystems/mql-subscription.md).
  **S2 shipped** (MRs !173/!174) — the topic taxonomy + the affordance
  resolver. **S3 / Track D shipped** (MRs !177/!178/!179) — the one
  `cockpit` verb, the mode × arrangement axes, `requires:` on every
  object slot, and a **server-owned pane catalogue**. ⭐ Its open
  question — *does a mode switch stay a real command on the wire?* — is
  **answered yes**, verified by driving a browser, so the axiom holds.
  **Wave 1 Build A shipped** (MR !182) — the civic ground: a 44-role
  `--sx-*` custom-property colour layer, Ink + Marble + a re-based
  `high-contrast`, four self-hosted voices, the `ink`/`marble` rename,
  and the honest-state primitives. ⭐ **Open question 5 (fonts) is
  CLOSED** — self-hosted, the handoff's Google Fonts `<link>` declined,
  and the subsetting procedure recorded in `message-rendering.md` rather
  than left as tribal knowledge.
  **Wave 1 Build B shipped** (MR !186) — the desktop chrome. ⭐⭐ **Wave
  1 Build C shipped and WAVE 1 IS CLOSED** (MR !190, 2026-08-12) — the
  mobile inversion: a two-row bar whose glance-line is the *head of the
  one shelf* (so choosing what rides it is reordering, hence
  `cockpit shelf first`), the shelf as a pull-down + chooser, the
  command sheet, the dropped-link row, and a measured round trip that
  retired a hatch reason B had got **wrong**. Its lasting lesson is a
  testing one, now in [../testing.md](../testing.md): **six bugs that a
  fully green suite could not see**, because jsdom has no layout and a
  narrow desktop window is not a phone. Wave 2 (Arrival) is unblocked.
  ⭐⭐ **Wave 7 — the card surface — shipped and the CLIENT CUT IS
  CLOSED** (MR !197). The right column is a feed of cards with one birth
  path (a command pushes; the wire cannot name a card), pinned as the
  whole lifetime, liveness scoped to **attention** rather than to a card
  kind, and **one** inspection card laid out by what its subject IS.
  ⚠ It shipped in two halves: the substrate, then the model **rejected
  and redone** — the feed is a LOG rather than an index, and a relative
  query can never back a card about a thing. ⚠ What it leaves for the
  next client build: no tables, no forms, no interactive cards, and
  fixed tabs where the design wants **tagging**. ⚠ Carries the ruling that the handoff's pinnable
  **trait widget must not be built** — it would foreclose the
  psychology vocation.
- [affordance-suggestion-slate](./builds/affordance-suggestion-slate.md)
  — **NEW 2026-08-10.** *"Given everything we know about this player
  right now, what should be offered to them?"* Surfaced by the S2/S3
  review: the radial menu is ONE consumer of a much larger question, and
  the build had solved a fragment while borrowing the whole question's
  justification. Four stages — candidacy (✅ the recency stack, already
  good) · binding · admissibility · relevance — of which only
  admissibility exists, and only rejectively. **§ 3 and § 6 SHIPPED as
  `requires:`** (MR !178): the kind axis moved onto the command def, ~35
  near-identical validator files went away, and a mixin name now
  RESOLVES or the spec does not load — where `targetKind: any` was an
  unfalsifiable promise whose fifty uses included three wrong ones.
  ⚠ Still open and deliberately unbuilt: the **generative** direction (a
  declared kind could FILTER a candidate set, not just judge one — but
  no consumer asks yet), the relational axis staying rejective, and
  **server-side command history**, which is blocked on retention +
  privacy decisions nobody has made. ⚠⚠ Its § 5 warns loudest: a command
  history is the most sensitive per-player record the server would hold
  — what you tried and were refused predicts what you want, and is the
  part players would least expect to be kept.

### 13. Engine hygiene — ✅ shipped
*Platform refactors with a lint at the end — no product surface.*
- [reference-lifetime-slate](./tails/reference-lifetime-slate.md) — **NEW 2026-08-01.** Declare how long a reference holds. `ref-shapes.md` R2.1–R2.4 already say exactly that, but three of the four are **convention** — hand-written boilerplate that fails SILENTLY when forgotten (R2.3's self-heal is copy-pasted into every getter). Declare the rule per field, in the idiom the codebase already uses, and let the framework enforce it. **BUILT** — as `static fieldMeta`, one field-keyed structure rather than a seventh parallel static, with two axes (`ref: identity|instance`, and `lifetime: weak|symmetric|owned` for instance refs). **Not an internals nicety:** most cross-object refs are path strings today only because the world is still mostly singletons — a grown world is mostly clones, and every one of those is an instance (live) ref with a cleanup obligation. Rejected: a `StuffRef<T>` wrapper (competes with R2.3 instead of completing it, ceremony at every read), real `WeakRef<>` (StuffApi's registries hold strong refs while registered, and post-unregister it clears NONDETERMINISTICALLY — GC timing into a deterministic residency story), and field decorators (**102 mixins return class expressions**, where legacy decorators are invalid). Implied follow-on, and it was bundled after all: **invert the field-metadata statics** into one field-keyed structure. Two corrections from the build — there were **four** field-keyed statics, not six (`commandContributions` / `settings` / `subscribableFields` / `markupAugmenters` are keyed by audience / setting key / virtual projection / nothing, so they are a different question and stayed); and the real input set was **245 files / 283 class bodies**, not the 231 estimated here. Not bundling it was reconsidered because the alternative — a transitional read-both collector — is worse than one atomic commit backed by a per-class-body syntactic equivalence proof.


Shipped as the **import boundary** (2026-07-31, MR !158) →
[architecture.md § The import boundary](../architecture.md): nothing
under `src/mud/` imports outside the tree (Node built-ins included)
except the Api tier (`api/**` + `obj/api/**`), which imports and wraps —
the import-graph twin of call-security, and what makes the sandbox /
wizard code-trust story checkable. CI-gating via `pnpm lint:imports`.
36 violating files → 0, with **zero exceptions**: the capability moves
to an Api and the mudlib keeps the policy (the recurring mechanism is an
opaque handle). The slate is fully absorbed and retired; its two
residual tails — the blanket test exemption, and ambient globals that an
import rule structurally can't reach — are recorded in the subsystem
doc's *What this rule does not cover*.
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
