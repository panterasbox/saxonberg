# Pets slate (working doc) — the creature you won over

> **Updated 2026-07-30** — a cross-slate design session (pets · ranching ·
> farming) settled the conventions all three share. Three things changed here:
> **two of the three structural gaps below are now closed** (chattel shipped;
> the persistence spine grew multi-instance keyed hosts), the **custody edge is
> chattel, not a bespoke `CompanionMixin`**, and **pets no longer freeze on
> logout** — one family-wide clock, with the time-respect contract preserved by
> bounding the *consequence* instead of stopping the clock. The shared
> convention set is owned by
> [ranching-slate § The four shared conventions](./ranching-slate.md).

> **Status: design explored deep; not yet requirements.** Player pets, taken
> through the NetHack lens and stress-tested against the live subsystems.
> **Taming is the spine** — a pet is a creature you *won over*, not a unit you
> bought. The design is experience-first (built around the *moments* players will
> tell stories about) and almost entirely composition of shipped substrates — but
> the stress-test surfaced **three genuinely structural gaps** the model hasn't
> built yet (possession/theft, a fear/threat axis, dependent-presence +
> individual-instance persistence). Three build waves are re-sequenced so **Wave 1
> ships taming's *soul* (bonding) while dodging every heavy gap**, and the deep
> substrate work lands in Wave 2 where it pays off game-wide. Entry point to the
> slate → `/requirements` → plan → build loop.

See also — substrates this stands on:
[belief.md](../../subsystems/belief.md) (the **bond = regard edge**, recognition,
regard) ·
[trait.md](../../subsystems/trait.md) (temperament / dispositions) ·
[behavior.md](../../subsystems/behavior.md) (pet brains — follow / react / flee) ·
[race.md](../../subsystems/race.md) (Creature/Character split; `Species` data —
where **domesticability** lives) ·
[vitals.md](../../subsystems/vitals.md) + [metabolism.md](../../subsystems/metabolism.md) (hunger / care / death; presence-freeze) ·
[senses.md](../../subsystems/senses.md) + [locomotion.md](../../subsystems/locomotion.md) + [posture.md](../../subsystems/posture.md) (manner-of-approach seams) ·
[conveyance.md](../../subsystems/conveyance.md) (mount / pack couplings) ·
[banking.md](../../subsystems/banking.md) + [employment.md](../../subsystems/employment.md) (the pet-shop / vendor as a **Business**) ·
[document-store.md](../../subsystems/document-store.md) (the thin instance-persistence hook) ·
[fasttravel.md](../../subsystems/fasttravel.md) + [location.md](../../subsystems/location.md) (transit / home).
Related slates:
[npc-behavior-slate](./npc-behavior-slate.md) (a pet is an *owned NPC*; tameable
fauna are Character-tier carves) ·
[species-expansion-slate](../tails/species-expansion-slate.md) (pet/animal species are carves) ·
[dorm-warren-slate](./dorm-warren-slate.md) (where a pet lives) ·
[reputation-slate](./reputation-slate.md) (regard, scoped to the animal) ·
[provenance-slate](./provenance-slate.md) (authorship — *not* the possession gap this surfaces) ·
**[property-slate](./property-slate.md) (the parent — the possession/custody
substrate this build consumes)** ·
**[stewardship-slate](./stewardship-slate.md) (the gate — land use decides
whether your residence admits a companion at all, and how many; the dorm is the
ladder's bottom rung).**

---

## The frame — a tame creature in a consistent world

**Reference point: NetHack.** NetHack pets are the most beloved pet design in
games, and they teach one deep lesson:

> **A NetHack pet is not a "pet system." It's a tame monster in a consistent
> world — and every beloved pet moment is *emergent*, not a feature.** Nobody
> designed "shop theft": it falls out of *pets pick up items* + *shopkeepers
> charge **you**, not your cat* + *pets follow you out the door*. The magic is
> that the world's ordinary rules apply to the pet too, and *interact*.

That maps onto this engine better than onto anything, because we already *have*
the consistent simulated world. So the design is not "build a pet feature set."
It is: **make a pet a first-class inhabitant the whole world treats as a real
agent, add the two missing atoms (custody + a bond), and then go prospecting for
the emergent moments the way NetHack players discovered them.**

We think in **experiences** — the stories a player tells — and derive the
mechanics from them. The pet fantasy is *companion + care-sim + utility at once*
(three faces of one cat, not a menu to pick from). It is explicitly **not
battle/collectible** — no Pokémon roster, no pet-battle-as-the-game. A pet fights
in the *world's own* combat as a companion (when combat lands); it is never a
separate battle minigame.

## The spine — taming is the game

NetHack taming is mostly a scroll or a spell: *instant, magical, shallow*. The
fantasy it reaches for — turning a wary wild thing into a companion — is exactly
what our belief / regard / disposition substrates were built to do. So we can
**realize the fantasy NetHack only gestured at.**

> **A pet is a creature you *won over*. Because our creatures already perceive
> you, remember you, and have a temperament, taming is a real *encounter* with a
> real animal, not a dice roll. The pet you keep is the trophy of that
> encounter.**

### Three layers, cleanly separated (and biologically honest)

| Layer | Scale | Lives on | Role |
|---|---|---|---|
| **Domesticability** | species | `Species` data field (like `specificHeat`) | how inclined the *species* is to deal with people — sets *difficulty*. Dog: high · wolf: low-but-possible · dragon: ~zero (magic-only) |
| **Temperament** | individual | dispositions ([trait.md](../../subsystems/trait.md)) | skittish / proud / greedy — the *shape* of the encounter; which approach works |
| **Bond** | individual | `regard` ([belief.md](../../subsystems/belief.md)) | *this* animal's loyalty to *you* — the current score |

Species sets the difficulty; temperament sets the puzzle; bond is the score. This
mirrors real ethology — **domestication is an evolved species trait, tameness is
an individual state** — and it collapses "what's tameable at all" into a single
authored knob.

### Domesticability *is* a dial on the fear axis

The elegant unification: ethologically, domestication just **is a suppressed
flight response toward humans.** So domesticability and the (missing) fear/threat
axis are **one axis at two scales**:

- **Wild creature** = high fear-baseline → taming = *managing that fear down*
  through how you approach (the encounter).
- **Domesticated creature** = fear-baseline ~zero → no fear to manage → straight
  to bonding.

The fear substrate, once built (Wave 2), takes **domesticability as its
species-level parameter.** Wild and tame are just the two ends of the same model.

### The taming *encounter* (Wave 2, the wild path)

The moment, beat by beat:

1. **You spot something wild.** It has a temperament, perceives you (senses), and
   already holds a wary regard toward you — seeded from its species
   domesticability, your reputation, and trait-compatibility. *You are judged
   before you act.*
2. **How you approach is the game.** Armed / loud / fast → it bolts or bristles
   (fear rises, regard drops). Slow / calm / crouched → it tolerates you.
3. **The offer, read right.** Right food, right distance, no grabbing → regard
   climbs. Push too fast → setback.
4. **It chooses you.** A handful of *good reads* — not a grind — and its regard
   crosses the line where recognition flips and it's yours.

The depth is that **temperament makes every creature a different puzzle**: a
skittish deer is a distance problem; a proud wolf won't be bought with food and
respects that you don't flinch; a greedy raccoon is trivial but fickle. **The
puzzle is reading the animal, not repeating the action** — replayable without
being repetitive. Structurally it's a *wordless conversation* and can ride the
same engagement/state-machine substrate as [npc-dialogue](../../subsystems/npc-dialogue.md).

### The acquisition ladder — one knob (domesticability), three on-ramps

Shops don't *bypass* taming — they sell the **back half** of it.

- **Buy (the floor).** A pet-shop [`Business`](../../subsystems/employment.md)
  sells creatures that are **domesticated but *unbonded*** — fear-baseline ~zero
  (safe to stand near), but **regard-toward-you neutral**. You still earn its
  loyalty. **Bonding an unbonded creature *is* the core taming loop** — the shop
  just removes the dangerous wild/fear front-half. *Taming stays the thing even
  on the easy path.*
- **Tame wild (the trophy).** A wild creature: front-half (manage fear via
  approach) **plus** back-half (bond). Gated by species domesticability +
  individual temperament. The aspirational, story-generating path.
- **Magic (the apex).** A charm/scroll/figurine analog for the things patience
  can't win — the zero-domesticability species. "I tamed the dragon." Rare,
  costly; keeps NetHack's scroll-of-taming and figurine-becomes-a-pet.

## The signature moments — and what generates each

The pet experience as the stories players will tell, mapped to what our world
already does. *Design the rules; harvest the emergence.*

**Free or nearly free (the world already does this):**
- *"My cat follows me into every room."* — the core relationship. A `follow`
  brain on the arrival/departure witness triggers we already have.
- *"I named her Mittens."* — yours, named, remembered from minute one. The
  emotional bond is mostly *this*.
- *"Feed it or it drifts."* — the bond **is** regard; feeding **is** metabolism.
  Care is *light* (see below).

**A small brain each (delightful emergent utility):**
- *"My dog dropped a dagger at my feet."* — apport/fetch. A `Creature` is already
  a `Container`; add a fetch brain + carry-to-owner.
- *"My kitten won't step on that amulet — it must be cursed."* — the BUC sniff.
  The pet brain reads the BUC-known belief realm and *refuses cursed things*; you
  infer the curse. Wires straight into the **magic-items / BUC** work — the pet
  becomes a diegetic BUC-identification tool. Same brain family scouts traps and
  danger.

**Emergent from the economy (parked — economic blast radius):**
- *"My dog grabbed the good bottle and carried it out — nobody charged me."* —
  the shop-theft rite. Falls out of `Business`/`settle` + pet-carries-items +
  follow. **Deliberately not a headline** — it depends on the possession/theft
  gap below and has real economic implications; captured, not queued.

**Deferred but shaped:**
- *"My puppy grew into a war-dog."* — growth-through-participation (advancement) +
  combat ally (gated on the combat slate). Growth itself is the maturation gap.
- *"I tamed the dragon."* — magic taming of an apex species (Wave 3).
- *Riding.* — a rideable species is `Companion + Mountable`; mounts already ship.

## Care & loss — light, on purpose

**We respect players' time.** Care is *feed it occasionally*, not a Tamagotchi
grind and **not a money sink** (the earlier boarding-fee economy is **retracted**
— upkeep as a standing financial commitment fails the time-respect test).

- **Neglect cools the bond.** Ignore the animal and its regard drifts down;
  extreme neglect → it goes feral and **leaves you**. **Loss is a *relationship*
  failure — not starvation-death, not a billing failure.** (Rhymes with NetHack:
  tameness decays, hits zero → wild.)
- ~~**Offline = freeze.**~~ **[SUPERSEDED 2026-07-30 — see
  [ranching-slate § The clock](./ranching-slate.md)]** The family now runs **one
  uniform clock**: *things you own reconcile against world time; the body you
  inhabit reconciles against played time.* A pet does **not** freeze when you log
  off. The time-respect goal this line was protecting survives untouched, because
  it was never about the clock — it was about the **shape of the consequence**:
  - The pet's **bond** drifts while you're gone, and at the floor it goes feral
    and leaves — a recoverable, story-generating loss.
  - The pet's condition curve is **asymptotic toward "miserable but alive."** It
    never starves to death. (A *ranch* animal does die of neglect — that's the
    economic stake, and it has a paid mitigation. Deliberate divergence.)
  - **Automation maintains your assets; it cannot maintain your
    relationships.** A hired hand or kennel keeps the animal fed and healthy —
    the material floor is cheap and delegable. **Bond is only earned in
    person.** This is what the retracted boarding-fee economy was groping for,
    without the standing financial commitment.

## Subsystem stress — the gap map

Pets are an *integrating vertical*, so they pull on nearly every subsystem and
expose whatever's thin. A four-probe stress-test against the live code found that
the **object/actor/place primitives are done** (a pet composes cleanly), but pets
X-ray a thinner **relational / psychological / temporal** layer. The punchline:

> **The three things that make a NetHack pet special — you *tame* it, it's
> *yours*, and it's a *real individual that persists* — map exactly onto the
> three deepest gaps in the model. Pets stress it at their three most beloved
> points.** None of these are pet features; they are missing *dimensions of the
> world* that pets are merely the first thing to require.

### Structural gaps (design-worthy, broadly reusable)

> **Status update 2026-07-30 (verified against the code): two of the three are
> now closed or nearly so.** Chattel shipped and answers possession; the
> persistence spine grew multi-instance keyed hosts. Only the **fear/threat
> axis** remains a genuine structural gap. Rows updated in place.

| Gap | What's actually missing | Forced by | Who else wants it |
|---|---|---|---|
| ~~**Possession / property**~~ **CLOSED** | Chattel shipped 2026-07-23 (`chattel` / `chattel_events`, `ownerOf = stamp ?? authorOf`, chain-of-title). Remaining work is **one composition line** — `ChattelMixin` onto the Creature stack. See the custody section above. | — | — |
| **Fear / threat axis** | `regard` is affinity-only. No aversion / alarm / flight state, no flee brain. A creature can *like* you; it cannot be *afraid* of you. | the wild taming encounter ("warms vs **flees**") | combat morale, predator/prey, intimidation, guards reacting to a drawn weapon — **all tension** |
| ~~**Dependent presence + individual persistence**~~ **MOSTLY CLOSED** | **Presence:** resolved by decision, not code — the family runs one clock and a pet *doesn't* freeze (see Care & loss); what's left is the asymptotic condition curve. **Persistence:** `PersistableMixin` is **not** Avatar-only (a `ConsignmentShelf` and a `DormRoom` compose it) and multi-instance `(scope, key)` hosts shipped with the leased dorm room. Nothing in it is Avatar-shaped — no NPC composes it *yet*. | a pet that survives your logout *as itself* | any evolving NPC, any world that *remembers* — **the "living world" gap** |

### The legibility gap (rich, more specialized)

- **Manner-of-action isn't perceivable.** The world narrates *that* you arrived
  and *who* you are — never *how* (armed / sneaking / crouched / fast). The seams
  exist and are inert: `LocomotionMode.noiseLevel` + `emissionAt` (all modes ship
  `normal`), wielded state (never surfaced to observers), postures (self-state, no
  observer reads them, no `crouch`). Sneak/crawl and auditory detection are
  explicitly *deferred*. Taming's "come slow and unarmed" is unrepresentable —
  but so are stealth, ambush, intimidation, and social read.

### Lighter tier (self-contained, or just wiring)

- **Maturation** (kitten→cat): GAP with a driver, but the *fields exist* —
  `Organism.age`, `lifecycleState`, an empty `Species.ageCurve` seam. A contained
  build.
- **Spawning / population**: GAP — hand-placed seeds only; `PopulatesMixin` is
  "future." Wild taming needs supply. Already on the radar (spawn-distribution).
- **Wiring, seams present**: a `follow` brain (+ the arrival/departure witness
  frame must carry *which exit* was taken — today it's a room-occupant delta that
  knows *who* left, not *where*); `give`→`offer` with an accept/refuse hook (give
  currently force-moves the item); a **dub-another-entity** verb (`NamedMixin`
  already lists pets as intended holders — there's just no player verb; contacts
  `rename` only sets a private per-viewer label); teleport carrying co-occupants
  (only mounts/haulage ride today); the nearest instance-persistence hook is a new
  `kind` in the `documents` store.

### Not a gap — a design decision

**Tameable fauna must be `Character`-tier.** Everything a tameable animal needs —
holding an opinion of you (`BeliefStore`/regard), perceiving you (`Sensor`),
holding an engagement beat (`Engaged`), walking over and carrying things
(`Mobile`/`CommandGiver`) — is bundled at `Character`, not `Creature`. A bare
`Creature` literally cannot hold an attitude toward anyone. So **tameable animals
are "animal NPCs" — rich carves** (rhymes with "NPCs are expensive carves"), while
ambient background critters stay thin `Creature`s. This validates *"a pet is an
owned NPC"* against the actual code, and draws a clean "which animals are rich"
line.

## The custody edge — **RESOLVED 2026-07-30: it's chattel**

> **The sketch below (`CompanionMixin` + `ownerPath`) is RETIRED.** Chattel
> shipped 2026-07-23 and is the possession answer. Verified in code:
> `ChattelMixin` is composed in exactly one place (`lib/stuff/Thing.ts`), and
> `Creature` descends from `Agent`, not `Thing` — so no animal can be owned
> today; `ChattelApi.stamp` would refuse a pet. But the chattel gate is
> **structural** (`MixinApi.isChattel`), not tier-based, so:
>
> **Adding `ChattelMixin` to the Creature stack gives pets, livestock, and
> aquaculture per-instance ownership with chain-of-title, from shipped code.**
>
> A bespoke `CompanionMixin` would be exactly the pet-shaped custody edge this
> slate's own guardrail warns a hundred cattle can't reuse — and the property
> slate already classes a pet as chattel ("real property bottoms out at the zone;
> everything finer is chattel or slots"). See
> [chattel.md](../../subsystems/chattel.md) +
> [ranching-slate § Custody](./ranching-slate.md).

What survives from the original sketch is the *semantics*, which chattel already
honors: custody (a claim) stays orthogonal to bond (a feeling) — a stray can
adore you without being yours; a neglected pet is legally yours until the bond
floors out and it runs feral. The owner's roster stays **derived on read** (MQL
over the registry), not a live-ref list. A `homePath` is still pet-local and
still wanted; that's a field, not a possession primitive.

## Sibling consumer — livestock & ranching

> **Family placement (2026-07-30).** Pets and ranching share *substrate* (an
> owned, individually-identified animal) but **not experience**, and the
> [guild roster](./guild-slate.md) already drew that line: **the Grange** holds
> "cultivation, soil, husbandry + breeding, genetics" — farming *and* ranching as
> one vocation — while **taming** belongs to **the Wardens**, whose demand anchor
> is "the pet supply chain." Ranching's real design family is
> farming/fishing/mining (the production family). The goal is **one shared
> substrate under two distinct experiences**: where pets and ranching touch
> (custody, the clock, maturation, persistence, the genome) they must be
> *identical*; where they part (bond vs yield) they part completely. The full
> convention set lives in
> [ranching-slate § The four shared conventions](./ranching-slate.md).

Pets are not the only consumer of "owned animals." **Livestock/ranching is the
sibling** (see [ranching-slate](./ranching-slate.md)), and the two diverge along
lines the engine already draws:

| Axis | **Pet** | **Livestock** |
|---|---|---|
| Engine tier | `Character` (rich) | `Creature` (thin) |
| Content stance | individual **carve** | systemic **herd** |
| Relationship | **bond** (regard) — *won over* | **yield** — *managed resource* |
| Domesticability | mid — needs the encounter | max — born owned, no encounter |

The Creature/Character split **is** the livestock/pet split (resource vs
relationship), and **domesticability is the single axis spanning wild → pet →
livestock.** They share a husbandry base — **custody/possession, vitals +
metabolism, domesticability + maturation, husbandry-grade persistence, and the
`Business`/labor wrapper** — and diverge only at the top: pets add bond + taming;
livestock add yield/breeding/butchering.

**Design consequence for this slate:** the shared bits must be built **reusable
by a herd, not pet-specific** — don't build a custody edge a hundred cattle can't
reuse. As of 2026-07-30 each has a named shared answer:

| Shared bit | The answer (not pet-specific) |
|---|---|
| custody | `ChattelMixin` on the Creature stack ([chattel.md](../../subsystems/chattel.md)) |
| individual persistence | a keyed `PersistableMixin` host — `(scope, key)` shipped with the dorm room |
| the clock | one uniform model: owned things run on world time, the avatar on played time |
| domesticability | a `Species` data field (one axis: wild → pet → livestock) |
| maturation | the `age`/`lifecycleState` driver — a real gap, forced by ranching (calf→cow) |
| genetics | the husbandry-wide `Genome` layer farming owns; four consumers |

## Build waves (re-sequenced)

**Wave 1 — Bonding (the shop path). Ships taming's soul with zero heavy
substrate.** Buy a **domesticated-but-unbonded** creature from a pet-shop
`Business` → bond it via care/interaction (the core taming loop = regard-building)
→ obedience gated by bond band (a low-bond pet ignores `heel`/`fetch`) → a
`follow` brain → light care (feed occasionally; neglect cools the bond) →
persists as an individual. **Dodges** the fear axis (domesticated = no fear
baseline) and manner-of-approach.

*(Updated 2026-07-30 — the two "cheap answers" this wave planned are replaced by
the shared ones, at comparable cost: custody is **`ChattelMixin` on the Creature
stack**, not a `documents` owner field; instance persistence is a **keyed
`PersistableMixin` host**, not a new `documents` `kind`; and there is no
owner-proxy freeze. Taking the shared route costs about the same as the
pet-specific one and is the difference between a herd being able to reuse this
and not.)*

→ *proves companion + care + the bond-gates-obedience spine, and
taming-as-bonding.*

**Wave 2 — Wild taming. The substrate investment.** Build the **fear/threat
axis** (aversion / alarm / flight, distinct from regard; a flee brain) + the
**manner-of-approach** legibility (surface armed/speed/noise/posture to observers;
a `crouch`/`sneak` seam), with **domesticability as the fear axis's species
parameter**. Now the full encounter lights up — win over a wary wolf, the trophy
path. → *taming's deep version; the fear substrate pays off across combat morale,
intimidation, predator/prey — game-wide.*

**Wave 3 — Apex & breadth.** Magic taming for zero-domesticability species (the
dragon); **maturation** (kitten→cat); the utility couplings (`Mountable` /
`HaulableMixin` / a guard brain); wild **population/spawning**; the emergent
economy vein (shop-theft, once possession lands); multiplayer interaction (others
feed/harm your pet → *their* regard edge, not yours).

## Open questions (for requirements to pin down)

- **Hidden vs shown inner state.** NetHack hides tameness — a number you never
  see; you read the *behavior*. Strong lean: keep regard/temperament **opaque**,
  make the animal *legible through how it acts* (ears back, edging away, leaning
  in). Rhymes with the bands-only competence firewall and the BUC known-realm —
  honest opacity, read the world not the stat.
- **Feral / release rules.** Exact bond floor, grace period, and where a released
  pet goes (back to the shelter as adoptable? a wild spawn? destroyed?).
- **Shop-theft.** Bless the emergent exploit (with regard/theft consequences,
  once possession exists) or close it? Colors how "consistent-world" we commit to
  be. Parked for now.
- **Roster cap.** One pet at a time, or several?
- **Failed tame.** For amenable creatures, failure = it flees, come back later.
  For dangerous ones, failure wants combat (deferred) — but "you spooked it and
  lost your shot" is available now and is real stakes with zero grind.
- **Multiplayer.** Feed / pet / harm / steal a stranger's pet — the open-world
  rules (feeding raises *its* regard for the feeder, never transfers custody).

## Scope guardrails

- **No battle coupling.** Combat-free until the combat slate lands. Utility
  (mount / haul / guard) is fine; pet-vs-pet / pet-vs-player combat is out.
- **No new module categories, no new *primitives*.** The build is orchestration of
  shipped substrates. `CompanionMixin` lives in a `lib/<subsystem>` folder
  (decide the home at planning). Pet/animal species are content. Brains are the
  existing brain category. The shop is a `Business` + a Location. Verbs are
  ordinary YAML+controller pairs. **The structural gaps (possession / fear /
  persistence) are their own designs** — a pet build *consumes* them (thin v1s in
  Wave 1, the real fear substrate in Wave 2), it does not smuggle them in as
  side-effects.
- **Reuse the bond, don't mint a stat.** The bond is `regard`. Resist a parallel
  "loyalty" field — care, recognition, and the reputation substrate already model
  it.
- **Tameable fauna are Character-tier carves.** Don't try to make thin `Creature`s
  tameable; that fights the design of the Creature/Character split.
