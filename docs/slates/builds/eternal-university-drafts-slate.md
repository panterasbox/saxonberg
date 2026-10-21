# Eternal University & Terminus — drafts (the campus, the city, the arc's people and scenes)

> **Status: UNBUILT** — consolidated 2026-10-20 from the retired docs/staging tree. The design drafts for the university campus, the city of Terminus around it, and the people and scenes of the "An Honest Count" arc; it supplements [eternal-university-narrative-slate](./eternal-university-narrative-slate.md) (the story) and [eternal-university-slate](./eternal-university-slate.md) (the place). Content will be re-authored from scratch once the platform is done, so this is design reference, not a seed spec.
> **Left:** the campus districts and roads (Eternal Way · Silver Street · Limbo Lane · the Quad) · Duncan Hall's elevator, floors, basement and commons · the city-economy Atmosphere layer + the Circulation Reserve autopilot · the Gray as a gang `Business` + its charter petition · the realm and university governments past v1 · the first forensic win · the sealed room · the city morgue (Vance · Pim · the incinerator · the routes) · the Registrar records track (Bram · Pell · the four rooms) · the deputization ledger · the `CensusForm` mechanic · Wren · the lore insertions (Quad statue · Chapel · Limen asides · the Museum) · the attuned-dispossession allegory (unratified)
> **Size:** a build

## 0. What this doc is

Twenty-six staging drafts — a campus map, Gus's room as a build spec,
Duncan Hall, Terminus at street level, a lore pass, an allegory
exploration, five scene sheets, eight character sheets, seven object
sheets — folded into one. The owner's stance (2026-10-20): today's content
is a **reference app**, rebuilt from scratch once the platform is done, and
*"the only stuff I care about is the narrative stuff."* So this keeps
**design** — decisions, mechanics, the story, each character's role and
arc, the lore, the city's shape and its economy — and drops as-built
inventories, seed paths, stat blocks and spec detail for things that
shipped. **§N** without a link means a section of the
[narrative slate](./eternal-university-narrative-slate.md).

⚠ **A staleness audit is owed.** Nearly all of this predates
[belief](../../subsystems/belief.md) v2 and the masquerade,
deception-and-detection, [cleanliness](../../subsystems/cleanliness.md)
(dirt by site), [mortality](../../subsystems/mortality.md)'s forensic
corpse, [renown](../../subsystems/renown.md), and the privacy/anonymity
slates. Obvious supersessions are marked ⚠ inline; the full audit is not
done here.

## 1. The campus

**Shipped:** Duncan Hall (lobby, corridors, rooms, the stairwell, Katie,
room assignment), University Avenue with Gus and his gear, and the
terminal across the street. **Not built:** the campus itself — its gate is
a locked door on University Avenue.

### 1.1 Districts and roads

No copy of the EC map: its central Heart was a PvP kill-zone, and the
lounge already owns "everyone passes through." Hub-and-spoke on the Quad:

1. **The Gate (Arrival)** — the campus side of Gus's gate and the
   **sky-flip** (the sourceless campus sky against Terminus's ordinary
   one). Teaches look / sense / zone. Terminal #1.
2. **The Academic Core** — around **the Quad** (green, landmark, statue);
   services, halls, the greeter.
3. **The Residential Quarter** — Duncan Hall, a real walk away, *nowhere
   near the Quad*. Terminal #2 is its lobby.

**Eternal Way** (the spine, Gate → Quad) → the Quad → **Silver Street**
(academic core) and **Limbo Lane** (→ the Residential Quarter).
Verticality is Duncan Hall's (no EC road is vertical — "Ascending Road" is
a phantom). **Decided: EC road names kept verbatim**; "Way" carries a
processional double meaning that suits a campus.

### 1.2 The roads — EC's finish, kept

Each road's strangeness is **a material**. Method: **pull → polish →
adapt** — read the original rooms, keep the aesthetic, improve the
language, adapt the endpoints. *Never invent the finish.*

- **Eternal Way** — a pale fog inches above the pavement that will not
  lift and hides what the road is made of (EC: *"a complete mystery…
  Weird-ass"*); something unseen slides across your shins.
- **Silver Street** — mirror-polished silver plates; every footfall rings
  and is "lost in the atmosphere." Clinic, store, chapel line it.
- **Limbo Lane** — soft, glowing pink that springs underfoot ("the road
  pushes and pulls to your every step"); *limbo* = the liminal way home.
- **The Quad** — wrong-green grass, light that never matches the hour (TBD).
- **Growth roster:** Tanelorn Road (crushed obsidian that "noisily
  amplifies your progress") · Old Road (the first road ever laid, worn to a
  trough) · Glass Way (green glass you cannot stand on; tints Eternal Way)
  · Infinity Way (the grandest name on the dullest asphalt) · Dimension
  Drive (gray gravel, sterile silence) · Dark Alley (where "the front of
  perfection does not encompass 100% of the city").

The road's finish **is its floor material**, so behavior falls out (metal
rings, sponge springs, glass slips), and Eternal Way's fog *conceals* a
real material — "you can't see what it's made of" made true. ⚠ The
proposed floor-as-Adornment is superseded by
[ground](../../subsystems/ground.md) (every Location's floor minted at
`postRegister`); the intent carries over.

### 1.3 University Avenue — the crossing

- **Busy with transients, still of locals.** The terminal empties onto it,
  so the crowd is **real player traffic** — render none. **Passage, not
  dwelling**: the stillness under the churn is what gets authored.
- **Gus is the one fixed presence**; his "every meeting is the first"
  becomes *true* at a transit hub.
- **No dead props** — every "off" state is a real condition on a working
  object; Gus not using them is behavior.
- **The drift-reveal** — the terminal's clock tower keeps true civic time
  across from Gus's drifting watch. *Two Authorities, two clocks.*
- **As built:** the avenue runs east–west, the terminal south, the campus
  gate north. Gus is **self-appointed**, so on no employment roster — a
  true condition in the fiction.

### 1.4 Duncan Hall — the building

**Pinned skeleton, elastic flesh**: lobby, circulation, floor hubs,
bathrooms and commons always exist; rooms bud and reap per assignment.

- **Three ways up.** Elevator and main stair (front of house), and the
  **service stair** — Katie's domain, **where Dunny was "found"** (a tell:
  easier to stage a body unseen), running down past the **boiler**, which
  makes it the *warm* stairwell the forensic clue needs.
- **Floor one:** the lobby (Katie, the manifest — "the bridge-troll's
  bridge"), her apartment, the mailroom, the **common room** (home
  hanging-out). **Basement:** workshop, boiler, laundry, the service-stair
  foot — the quiet maintenance route.
- **Bathrooms shared, per floor, all-gender** (species diversity breaks
  the binary) — and a social space where you notice who *isn't* around.
- **Upper floors:** a hub, a communal bathroom, a small lounge. Dunny's
  floor holds his sealed room and Wren's reassigned room.
- **Keys, because the aether cannot authenticate (§8).** A door can only
  check a token, so access is a physical key — lendable, stealable,
  copyable — and **that is the investigation's texture** ("who had a
  key"). Possession-gated and low friction; a resident carries one key,
  Katie the ring. **Editorial access is separate** — each occupant owns
  their half's document. ⚠ Audit against the shipped holding ladder and
  [access](../../subsystems/access.md).

## 2. Terminus, the city

Source status: *exploration 2026-07-12, not canon*, except §2.4–§2.6
(decided 2026-09-03) and §2.10 (locked 2026-07-30). Many streets have since
shipped (the terminal, the Counting-Houses, the market, Wharfside, the
Registry, the Infirmary, the Necropolis, Mayfield Row…); where they
disagree with the names below, these are provisional. Corpos:
[corpos-slate](./corpos-slate.md).

### 2.1 What kind of city it is

**A patchwork of privately carved quarters, not a planned grid.** Built
with "not much government," the houses and then the five corpos each
carved a quarter to their own logic — so **the corpo rivalries are the
readable social geography**, and the administration's job is the young
polity *retroactively* governing people who wanted no governing.

- **Hills (San Francisco).** The Eternal City was flat; Terminus climbs.
  "Nearness to the ruin is rank": old prestige low by the sacred core, new
  corpo money on the heights for the views.
- **Dense, walkable, mostly civil** — danger is economic and social, never
  lethal; lethal combat faces *outward* (§2.7).
- **Signature weather:** fog off the Confluence (the Mere's stillness).

### 2.2 The spine and the map

South → north, the college-town shape. The rivers **Marrow** and **Mere**
meet at the **Confluence** behind the campus; the combined river runs
south, splitting **West Bank** (working) from **East Bank** (prestige).

```
                         ↑ N   up the valleys → DOMAINS · MARCHES · FRONT
                 Marrow ↘             ↙ Mere
                    ┌─────┴───────────┴─────┐
                    │      ▓ CAMPUS ▓        │  on the ruins · Sanctuary below
                    │     ~ CONFLUENCE ~     │  (the sacred head)
                    └───────────┬───────────┘
        GARRISON                │  river flows S
     ┌──── WEST BANK ─────┐     │     ┌──── EAST BANK ─────┐
     │ working · everyman │     │     │ prestige·new money │
     └─────────┬──────────┘   ══╪══   └─────────┬──────────┘
     ══════════╧═══ UNIVERSITY AVENUE (E–W) ═════╧══════════
       downtown · Counting-Houses · Old Quarter · Museum · Civic
                    ┌───────────┴───────────┐
                    │  THE GATE ✧ TPA · port │
                    └───────────┬───────────┘
                          ↓ S — THE SEA
```

Thresholds: the Gate (arrivals, refugees, the port) and the valley roads
north, guarded by the Garrison. Off-map on purpose: the lounge, the
domains, the frontier, the Ordinance. *To confirm into canon:* the
Confluence at the north head, the port at the river mouth.

### 2.3 Districts and neighborhoods

The rivers **divide** (class war across the water); the wedge **unites**.
Each bank's neighborhood is the class-inverted twin of the other's.

- **West Bank:** **the Shallows** (tenements, Hollis retail, the
  stewardship rental floor, a shrine) · **Wharfside** (fish market,
  dockers' hall, river broker; the workshop district, §2.5) · **the Gray**
  (§2.6) · **the Nightside** (music hall, a consensual **fight-pit** with
  betting, gambling) · **Goodkin's Enclave** (the company town, a velvet
  cage — the walkable paternalism critique).
- **East Bank:** **the Aevex Quarter** (the **augment clinic**, the Aevex
  Combat Academy, a maker lab) · **Vionne Heights** (atelier, media house,
  a recognition-gated members' club) · **the Hill Streets** (owned homes,
  the ladder's peak; a neighborhood association) · **the Terraces** (the
  *good* hospital, consulate row, private security — uneven services from
  the privileged side).
- **The Core:** **the Gate** (the terminal, refugee intake, newcomer's
  bureau — what every player sees first) · **the Counting-Houses** (the
  exchange, all five corpo towers on neutral ground) · **the Old Quarter**
  (the first Chapel, independents, the pilgrims' hostel; the campus and
  underground seam) · **the Civic Quarter** (the Forum, Lands & Works,
  **the Museum**, municipal hall).

**Institutions are archetypes, not one-offs.** Author one archetype
parameterized by tier; demand elasticity sets the count (need-based —
food, bed, clinic — one per walkable catchment; want-based — the pet shop,
the gallery — rare and where the money is). **A repeated institution is
the best class probe**: the tavern traced Shallows → Wharfside →
Nightside → Old Quarter → Gray → Vionne. Recipe: `{ demand driver ·
catchment · tier spread · breakeven }` → the economy (§2.8) decides count
and placement.

### 2.4 Retail and frontage [DECIDED 2026-09-03]

> **In a village one shop meets many needs. In a city many shops each
> meet one.**

The division of labor is limited by the extent of the market: the general
store **decomposes** as the market deepens, each fragment a vocation that
could not live at village scale. So **the shop list is read off
[vocations](../../vocations.md)**, not invented — greengrocer, butcher,
baker; ironmonger, cutler, farrier, locksmith; physician, apothecary,
midwife; tavern, coffee house; undertaker, monumental mason.

**The street does not decide; the parcel does.** A street is *authored*
when its plat is full and *generative* while it has capacity. The market
square: by the day, rented, no title. **West Bank: generative and cheap.
East Bank: generative and dear** — new because it became *fashionable*.
The old core: built out; buy a going concern. **Stall → West Bank → East
Bank is a career**; same `PlatBook`, two prices — **the price gap IS the
class geography.**

### 2.5 Commercial is not industrial [DECIDED 2026-09-03]

`commercial` starts at 20 m², `industrial` at 100. The shopping streets
take no forges, so **Wharfside is the workshop district** (raw material
lands at ports), and the city's industry is the **finishing trades** —
working metal somebody else smelted at the source. ⚠⚠ **A home workshop is
illegal in Terminus** — the historical trajectory, and the Tiebout axis of
[settlement-model](../../settlement-model.md) § 4. **Zoning exists because
of density**: at 3 m cells everyone smells your forge.

### 2.6 The Gray — threat is a property of an extent

**High economic predation and high impunity inside a low-predation city**,
modeled as a zone-level override on four independent axes (hazard ·
violent · economic · impunity —
[settlement-model](../../settlement-model.md) § 9). The Gray is low hazard,
**violent predation low — locked**, economic predation **very high**,
impunity **high**.

**Locked: "danger is economic/social — not lethal. Lethal combat faces
outward."** It will not kill you; it will take everything you earn through
a debt you cannot repay — and where `passage` is a floor under death,
**there is no floor under a loan.** *The Gray is not where the state
failed; it is where the state has not arrived, and the gang got there
first.*

To build: **the gang as a `Business`** (collectors, lookouts, a corner
boss — *the top commits no acts*, true by the ledger's shape); **the
periphery** (a fence — *the chattel chain is their actual problem* — a
constable on the take, a Counting-Houses clerk who moves money that should
not move); and **the charter petition** — *a gang is a guild nobody
chartered*: charter them and they are taxed and answerable, refuse and
they stay outside with a grievance. No clean answer — a real vote.
**Every exclusion creates a customer**: the excluded need credit, work,
protection, arbitration — the gang's four services. See
[policing-slate](./policing-slate.md) Part V. ⚠ Once "gated on the
deferred lending tier"; [credit](../../subsystems/credit.md) has shipped —
reconcile.

### 2.7 The home front

The war against the **Ordinance** is fought offstage at the frontier, so
the city stays safe; it hosts the war as an **industry** — the Garrison's
contract board (players *fill contracts*, they don't enlist), the arms
works, the academies, the veterans' quarter, refugee intake. In-city
combat is consensual spectacle.

### 2.8 The city economy — the Atmosphere and the Ledger

**The problem:** a whole city that is neither a hollow shell nor a **ghost
town on a light-DAU month.** **The fix:** decouple the city's life from DAU.

- **Layer A, the Atmosphere** — a notional NPC economy modeled **per
  neighborhood**, never per NPC: residents `R`, an income floor, a
  **propensity vector** by class tier → baseline demand per institution
  type. A stationary circular flow with **rhythms** off the world clock
  (the tavern at night, the market at morning). Never real money.
- **Layer B, the Ledger** — the shipped banking economy: players and the
  *few real* NPCs.
- **The firewall:** notional money never becomes real. *Vitality* is a
  Layer-A fact, *balance* a Layer-B fact; the Atmosphere layer literally
  cannot call `postTransaction`.
- **Viability is the emergent count.** A `Business` is viable iff its
  **baseline capture** (its tier-weighted share of local demand for its
  type) ≥ breakeven; oversupply closes the weakest. It runs on the NPC
  floor, so a light month changes nothing; closure fires only on
  structural collapse, distinct from residency eviction.
- **The one conserved bridge:** player ↔ NPC money passes through a
  **Circulation Reserve** (earning from NPCs is a faucet, spending a sink).
- **Players are strictly additive** — custom lifts demand, booms make new
  businesses viable, busts revert to the living baseline. **Invariant: DAU
  adds; it never subtracts below the NPC floor.** The per-neighborhood
  numbers are the admin sim's dashboard for free.
- **Two load-bearing risks:** the firewall must be *structurally* leak-proof;
  the autopilot must **default safe** — an ungoverned server cannot
  ghost-town or hyperinflate.

Refinement (the 2026-07-15 banking draft): *everything is a business; one
money tier per business, fixed at birth; "real" is derived from player
money loops.*

### 2.9 The Circulation Reserve autopilot

The reserve's level is the whole macro signal: faucets (wages, NPCs buying
player goods, payouts) drain it; sinks (purchases, rent, sales tax, fees,
fines) fill it; both extremes fail. **Default: floating terms of trade** —
one scalar **`τ`** multiplies every player↔NPC price; below setpoint
**tighten** (NPCs pay less, charge more), above **loosen**, by a small
rate-limited step toward `(S* − S)` with a deadband. Self-limiting, never
freezes, never inflates, and **diegetic** — over-extraction visibly makes
the city poorer.

**What falls out:** a cap on wealth extractable from NPCs, so a richer or
larger playerbase **requires a mint into the reserve** — *growing the
economy is a governance act.* Governor levers on top: mint, drain,
setpoint and band, targeted district subsidy. **Disciplines:** bound `τ`
(hitting the bound *while still draining* is the alarm that a mint is
needed); **no arbitrage** (NPC buy below NPC sell); damping; one global
reserve to start. ⚠ `τ` is also the arcana pack's mana unit
([magic-items](../../subsystems/magic-items.md)) — rename one.

### 2.10 The government stack [LOCKED 2026-07-30]

On [civics](../../subsystems/civics.md). **"A functional city beats
adherence to legacy narrative"**: the corpo patchwork stays as flavor and
informal politics, but **corpos hold no structural seats**. *The city
works.*

- **A city and a realm — two governments, one name, one seat.** Not a
  city-state (Rome-style metonymy); the realm is one tier among future
  realms and **not** the Compact's face. **State-capital model:** the
  realm's capitol sits beside the municipal hall (Sacramento — one
  locality, never one jurisdiction).
- **Three tiers:** `terminus` (Realm) → `terminus/city` (City) →
  `terminus/city/campus` (the University — town-gown). A dorm room
  resolves [university, city, realm].
- **The Realm** (thin): charters the city and the University, runs the
  assizes, fronts the war.
- **The City — a chartered municipal corporation**, commission form: an
  appointed **City Administrator** and department heads. **No elections
  yet** — nobody here ever voted for anything; elections are *a future
  story the polity can dramatize*, not a retcon. Departments: the
  **Registry** (⚠ shipped as a rented annex off the station frontage —
  §4.4 should *be* it), the **Watch**, **Works**, the **Almonry**
  (welfare). Seats: Administrator, **Magistrate** (city law, the gaol,
  market disputes), **Treasurer** (the landing seat for the reserve lever
  the meta CB Governor holds today), Registrar, Captain of the Watch.
- **The University** (thin): its own `Government`; Chancellor deferred.
- **Boundary calls:** quarters get **no sub-governments** (home rule is a
  story); sibling roots stay outside every government until re-rooted.

## 3. The lore under the campus

### 3.1 The Eternal City ruins

The Mission clergy raised the University **on the ruins of the dead
Eternal City**, atop the **Sanctuary**, so its impossible finish *seeps up
from the old core*. **Each site sits on a named EC ruin, its function
echoing or inverting the old**: the Chapel on the Temple of the Ages (same
gods, same ground), the Health Center on Dr. Frankenstein's Body Shop. The
campus holds the **entire** EotL homage; the city deliberately does not.
Canon: [story-bible](../../story-bible.md).

### 3.2 The lore-integration pass (2026-07-01)

**Headline:** both opening quests predate the gods, the ages and the
Museum, so the lore is alive in the mechanics and **unnamed in the
fiction** — and **"An Honest Count" is already the rite of Aletheia
against Mara** (*"Mitra counts to recognize · Moloch counts to consume —
same act, opposite soul"*). **Discipline:** gods never embodied; worship
opt-in, never pushed; a relic gets a dry footnote, not a fanfare.

**⚠ The ratification constraint.** The founding is a real one-time event
that *will* fire. Never hard-code a pre-founding state ("the seats are
empty," "you are the prophesied ones," "steal the *coming* founding").
**Durable phrasing: "The rolls decide who counts — and everything
downstream of counting rides on them."**

**The insertions** (ratification-safe):

1. **The Quad statue** — an old-worship relic: **Goibniu** (honest work;
   a university of makers, the anti-corpo) or **Vesta** (the hearth).
2. **The Chapel** — the Temple ruin, a lit candle, where you declare a
   patron. Lean on the place, not the clergy (who fade after the founding).
3. **A Limen aside at the clinic** on the implant's cost — it *"broke the
   monopoly, dispossessed the attuned, gave Solvan his cancer."*
4. **The Limen ↔ handler mirror** — the first non-human mind you meet is
   warm and asks nothing (**Mitra**); the arc's handler is a caring voice
   that is a forgery (**Mara/Moloch**).
5. **Stakes that mature** — "capture the count, capture the polity";
   anchor the handler's *near* layers to the corpos or a **Vane-heir**,
   the final thing placeless (the Moloch rule).
6. **The Museum** — its quest surface is *provenance vs. the forgery*, the
   arc's mechanic exactly. Show the Seat of Government as "where the count
   decides who is heard," never "empty chairs."
7. **The banality cast as the alignment allegory** — *"you serve the god
   you feed, not the god you name."* Also: dorm authoring as the demiurgic
   power democratized; "arriving is being counted," never prophecy; tie
   Vance's formative case to the Widening so the rot reads old.

### 3.3 The attuned dispossession (exploration, not canon)

*Exploration 2026-07-12; the owner wants to ground in the real record
(Canada's TRC, Australia) before ratifying.* The authored core needs *one*
hard, decodable allegory done well: **indigenous dispossession via forced
assimilation**, proposing **redemption through participation, not
lament.**

- **Guardrails:** allegory ≠ theme (a *whom* and a device doing work);
  **locate the evil in the system, never a kind of person**; distortion
  must reveal; defamiliarization is the protection; **mosaic, not
  portrait**; *safe* means it can never become the harm it depicts.
- **The vehicle: the returned attuned (`homo/sensitivus`)**, the playable
  people — not the extinct ancients. Both the reverence and the discarding
  are **projections**; hold both.
- **Schooling is the spine; commoditization the backdrop.** Canon already
  has the implant making the attuned *redundant* (no sensitivus ever gets
  one). New: the University, whose nature is legibility, **disciplines
  wild attunement into the countable form** — *assimilation is being made
  legible.* Australia's "ultimate absorption" names both as one policy.
- **Integrated/unintegrated is a LEDGER STATUS, not blood** — imposed and
  contestable, recorded at the Registrar. **Char-gen is the integrating
  event**; the arc is the reckoning. The unintegrated are hand-authored
  NPCs; that life is approachable, never a start. **Never a mechanical
  penalty** for the condition (*"the world may react to who you are; it
  may never pay you for it"*).
- **In Terminus:** the Old Quarter and Chapel, the Registrar, the dorms
  (descended from the residential *halls*), the Sanctuary, a burial
  ground the city routes around, and **the Museum** — where players
  *reconstruct the blurred count* rather than tour grief.
- **Referents:** Canada for the schooling spine (and the **contested
  count** — radar anomalies that outran the evidence, over an atrocity the
  TRC documented; that cycle *is* the honest-count-vs-Mara machine);
  Australia for the ledger — **Section 127**, pre-1967 censuses that
  counted Aboriginal people *in order to subtract them from the count*;
  *terra nullius* and Mabo; the Chief Protector; the Dreaming as the
  dignity vein (research firsthand, never characterize).
- **Open:** how far the reckoning reaches; a grounding brief was offered,
  never built; the shared Registrar ledger with the redlining covenant.

## 4. The arc's scenes

Each scene obeys §3's **first-quest teaching mandate** — a real
investigation *and* the tutorial for investigation. The access ramp runs
the easy body (§4.1) → the gentle puzzle (§4.2) → the hard one (§4.3).
**No player consumes a body, room or case** (§17.F); derivations are per
player, findings pool on the party's [deduction board](./deduction-slate.md).

### 4.1 The first forensic win — "the accident is a lie"

In the first ten minutes a bystander **derives, from a physical law the
engine computes, that the accident is a lie.** Beats: the wrongness of the
floor → Katie's official line (*fell down the service stairs; please don't
stir it up*) → the body → raw readings (*26 °C; the stairwell 22 °C*) →
**Dunny's own margin note** gives the rule → (37 − 26) / 1.5 ≈ 7 hours,
well before the logged 6 a.m. → **commit the finding**: *"he didn't die at
6 a.m., and he didn't die here."*

- **Soft world, hard clue.** The rule is taught before use, in the
  victim's hand — *he hands you the tool to catch his killer.*
- **The deepening read** (skilled): too cold even so, in a warm stairwell
  — **killed elsewhere and moved**. The expert's grace note: the linear
  rule bends near ambient.
- **A skill is the progressive automation of work you first did by
  hand**: untrained → a prompt to go learn; with the note → you do the
  arithmetic (*the hook lands for everyone*); practiced → pre-digested;
  expert → at a glance.
- **No engine watches your math:** credit is authored at a
  **conclusion-committed milestone** — it fires when you *state* the
  finding (to Katie, firing her code-switch, or privately). Spoilers:
  proportionate, not paranoid.
- ⚠ **Shipped since:** the forensic corpse, `analyze postmortem` and a
  graded `forensics` Discipline
  ([mortality § Forensic examination](../../subsystems/mortality.md#-forensic-examination--analyze-postmortem)),
  body cooling ([thermal](../../subsystems/thermal.md)). What remains is
  the arc's use: the note, the milestone, the moved read.

### 4.2 The sealed room — access literacy, gently

Dunny's taped room: the first hard access puzzle on a forgiving,
on-campus, known-NPC version; the **authored-once** setpiece.

- **Two gates.** The **physical** one is easy and multi-route; its job is
  to teach route-finding. The **comprehension** one is real: the work is
  **illegible without the demography context** (Obra Dinn). Break in early
  and you get doodles — *a hook, not a reveal*. Knowledge-gated, not
  visit-gated.
- **Inside, the negative space lands first:** the **cold tea**, the unmade
  bed, Dunny's side intact and **Wren's side stripped** — a life stopped
  and a life evacuated. Then the work, the clearing already begun, and a
  torn page pointing elsewhere. You leave with threads, not an answer.
- **Routes from properties** (`Locked + Katie-keyed + windowed + cleared
  on a clock + Wren lived here`): **convince Katie** (signposted —
  invoke Dunny as a person) · **the window** (loud; the clearing
  accelerates, suspicion seeds the §11 panic) · **time the cleaners** ·
  **Wren's boxes** (the escaped fragment). Over-determined: no single key.
  The clearing clock is pressure, not loss for all.

### 4.3 The city morgue — body access and the laundering audit

The **city medical examiner's**, across Gus's gate — the first built city
geography of the arc, and a hostile, secured morgue that **will not let
you walk in**. It teaches that **obstacles have properties and there is
always another thread.**

- **NPCs narrate the affordances**: *"Family, police, or staff. You're a
  student. You don't come in here."* … *"Get a proctor to put your name on
  it. Halvers, maybe — if he trusted you."* One line teaches the rule and
  hands you a route. The breadcrumb is the next question, never a marker;
  the **records track runs in parallel**, and MQL is taught here as the
  tool for it.
- **Properties:** secured, staffed, logged; role-gated; a **complicit
  examiner**; a **disposal clock**; across the gate; and the findings also
  exist as **records** (intake log, cold-storage log, certificate).
- **It runs without you, on real supply.** A service radius routes every
  sentient death in it — players, NPCs, the roll-clock's victims — here.
  **The incinerator** is the disposal clock made literal: anything
  unflagged burns, so the cover-up's best tool is *the machine doing what
  it always does* — erasure by routine as infrastructure. **Sentient-only
  intake** puts the who-counts line at the door (a decommissioned synth?
  an uplift?).
- **Three rooms:** intake (Pim), cold storage (the refrigeration confounds
  the cooling curve), the exam room (Vance, the slab, the climax).
  **Day is social; night is physical** — after hours there is no NPC, a
  locked door and an automated intake door — and Vance **haunts the place
  late**, so the night window is real but unreliable.
- **Routes:** get deputized (earned, mid-arc) · the front desk leaks (Pim)
  · **go around the body via the records** (*you may not need the
  corpse*) · the release window (custody softens toward the grave, at the
  forensics' cost) · break in (*getting caught creeping around a corpse is
  how you look like the killer*) · **forge a credential** — identity is
  access and the aether cannot authenticate, so it is **the killer's own
  crime, done small.**
- **The shared case:** Pim owns the swarm cheerfully (*"Akhtar! You're the
  fourth this week — popular fellow"*), leaking that others are asking;
  Vance feels the same crowd as **heat**. The inquiry count is capped
  flavor, never "0."
- ⚠ The Necropolis (a paid burial ground) and the Infirmary have shipped,
  and the corpse is forensic; audit the service-radius routing against
  what mortality does.

### 4.4 The Registrar — the rolls and the records track

**Where personhood is administered as paperwork.** **Decided:** the civic
Registrar is **municipal** — *you don't register to vote at a university*;
the campus has only an **enrollment office** (Dunny's workplace) where the
thread starts. ⚠ The arc's Registrar should be the shipped Registry
(§2.10), not a second institution.

- **The rolls are anchored twice, and the gap is the case:** the
  **official** side, a physical certificate per person (forge one → a
  phantom; refile one → an erasure), and the **lived** side, the
  recognition exhaust. **The morgue files your death; the Registrar files
  your existence.** The fraud is downtown and banal; the campus is
  clean-ish.
- **Three doors, three verbs — the casting is the point:**
  **deputization** (*file* — no cast, flat indifference) · **insider**
  (*talk* — Pell) · **break-in** (*sneak* — no one); plus the public
  window (one record, legitimately).
- **Deputization, worked out:** jurisdiction-gated (a master key on
  campus, a *presented credential* in the city); **derived, not a flag** —
  an append-only ledger of proctor `authorize`/`revoke` events →
  `isDeputized(actor, scope)` on read; **renown gates the grant, never
  becomes it**; the writ rides the wallet (its deferred tenant in
  [credential](../../subsystems/credential.md)). **Motive: incompetent, not
  evil** — *getting authority to ask why a student died is easier than
  getting your bike out of impound.* **Cost: leak, not watcher.** The
  pathway is **peopleless**: the wrong window, the contradicting signs.
- **Four rooms:** (1) **the enrollment office** — the stale NOW SERVING
  sign, **Dunny's cleared desk** (a dust rectangle; a tally under the
  drawer), **Bram**; the **residency map** (*a pinhole with no pin* = an
  erasure, *a pin moved beside its hole* = a relocation, *a fresh pin in
  an old hole* = a phantom refilling an erased slot — *every erasure
  leaves a trace; the investigation is reading the holes*); and **the
  assignment** — a temp census-prep batch, *"do well and we'll hire you,"*
  never honored, exactly as for Dunny. (2) **The public hall** — CLOSED
  cards, "Your Rights as a Counted Person," a stopped clock; zero carves;
  the queue includes the person the form cannot process. (3) **The records
  floor** — the **SPECIAL-HANDLING tray**, the cooked ledger, the
  **disposal chute** (*a filing can be burned too*); **Pell**. (4) **The
  archive** — the anchor documents, a gap in a numbered sequence, the
  **retrieval log**; **unstaffed** — alone with the records. *The records
  track ends here; the haze begins.*

### 4.5 The census form — the thematic centerpiece

The one scene where *who counts as a person?* is **performed on the
player**. You fill a form to become real; one line doesn't fit you; you
feel the system decide. Much later you learn **the form you filled to
enter the world is the murderer's tool.** It is the **Rosetta stone for
the records track** (you read a cooked filing only after being processed),
your enumeration date (the roll-clock), and the lesson that **the form's
missing boxes are the kill list's recruiting ground.**

- **Counted by contribution — the dark mirror.** The influence stocks are
  make / play / fund ([influence](../../subsystems/influence.md)). *The
  Compact makes engagement additive and opt-in — more participation, more
  voice. The census makes it the floor of personhood — no participation,
  no person.* A ladder and a trapdoor on one axis.
- **Who falls through:** the **uncounted** (no box — the victim pool), the
  **miscounted** (the unlogged caretaker), the **over-counted** (the
  double-weighted, and phantoms).
- **Mechanism:** contribution anchored to certified records, so the murders
  **zero out the contribution and let the form do the rest**; engagement
  decays ([participation](../../subsystems/participation.md)), so the
  murders accelerate a fade the system already builds in.
- **It implicates the player:** the form **flatters** you — *the
  comfortable flattery and the erasure are the same sentence.* You are its
  beneficiary, never its victim. That is worse.
- **System vs. scene:** a `CensusForm` whose schema is **authorable
  content**; the EU ships labor/play/fund.

## 5. The arc's cast

All names are working handles (§15 fork 5). The sheets' engine-attribute
blocks are summarized, not reproduced. Species casting rides
[species-expansion-slate](../tails/species-expansion-slate.md): **the
prejudice is a projection viewers hold, false as a law; the fiction
refutes the slander.**

### 5.1 The banality quartet, and the escalation

| | species | the failure | the portrait | the lever |
|---|---|---|---|---|
| **Vance** (ME) | Ghoul | numbness — stopped looking | `forensics: expert` × `Incurious · entrenched` | professional shame |
| **Pim** (morgue desk) | Halfling | cheer — nothing seems hidden | `Honest` × innocent `Incurious` = the leak | just ask |
| **Katie** (dorm) | Troll | love — sees, smooths it over | `Compassionate` × `Stubborn`, `Curious` | Dunny as a person |
| **Bram** (enrollment) | Dwarf | wisdom — forgives all error | expert reconciler × the trained dismissal | fraud vs. error |
| **Pell** (records) | Human | **fear — knows, and signs** | `Cautious` × coerced `Deceitful` | fear, turned |

Four good people greasing one machine four ways; **Pell is the
escalation**, the first witting participant.

### 5.2 Dunny, the victim

A **negative-space NPC**, authored from traces. ⚠ His three-part model —
corpse, record, scattered memories in others' belief stores — is largely
shipped substrate now.

- **He noticed everyone** — the night janitor, the boy who never spoke,
  the woman who sweeps University Avenue. *The demography is downstream of
  the decency.* The tragedy: **his flag-the-unreal method is the dark
  inversion of his gift.**
- **Four Dunnys** (friend · dealer · odd kid · obsessive) — none lies; the
  "dealing" was bartering for records access. He couldn't let an error
  round away, and died **alone, because he tried to verify it himself.**
- **Texture:** the laugh through the wall; counting under his breath,
  faster when anxious; **the running list was the people he worried
  about — his "sample" was his friends**; the **cold tea**.
- **The body and effects:** the time-and-temperature mismatch is the clean
  primary clue (no tox for the first body); his **work is missing** (the
  absence is motive); he is **dressed for the cold** at the foot of a warm
  stair; his comms show *that* he reached out, not to whom.
- **The room:** the work hidden in his notation — and **the list of names
  is people he loved.**

### 5.3 Vance, the medical examiner

**The examiner who stopped examining** — not bought, not cruel, **ground
down** by a morgue that never empties. Willful incuriosity; she doesn't
think she lies. The one person whose job is to catch this is the one
whose not-doing-it is the mechanism.

- **Ghoul, the stigmatized death-caste:** a living people treated as
  half-dead; the "they feed on us" charge is a blood-libel shape the
  fiction **refutes**. Her **unsentimental clarity** made her great — a
  *ghoul* excellence — and curdled into not-looking. **The contempt is the
  cover**: the system hides its laundered bodies in a caste no one looks at.
- **The formative case:** she was *right* once, fought, and was overruled
  — *"know your place, ghoul."* **Looking closely costs everything and
  changes nothing.**
- **Texture:** reads the file, not the flesh; **case numbers, not names**;
  runs cool; the loupe turned to the wall; she gets *tired*, not angry.
- **The knife:** *"you'd have caught this in your sleep, ten years ago"* —
  making her look means reliving what broke her. The climax makes the
  expert do her job. (Katie and Vance are the two ends of looking away:
  warm and intimate, cold and industrial.)

### 5.4 Pim, the morgue receptionist

**Genuinely happy at a morgue** — *"busy week, the incinerator's been
going since Tuesday,"* said like the weather. **The horror is
contentment**; same conveyor as Vance, opposite person. He *is* the
insider route, by **indiscretion**, not conscience: *"That one? Examiner
fast-tracked it — unusual, she likes to take her time, but you know, busy.
Anyway, sign here."* He adjudicates the sentient-only line and runs the
incinerator queue and has never wondered. Warm to the living; the dead are
weightless. A plant that shouldn't thrive there; a tin of something
homemade. **Tone guard: never quirky-sidekick whimsy.** Lean: oblivious to
the end.

### 5.5 Pell, the records official

**The trapped functionary**: one irregular sign-off as a favor upstream,
then another, until she was approving the paperwork of murders. Caught
between exposure and a **faceless upstream** she has never met. **The
pawn's white-collar twin** — *the pawn corrects the rolls with a knife;
Pell corrects them with a stamp.* **The kill-chain link (lean):** Dunny's
flags reached her desk and she **passed his name upstream**; her flip is
atonement. Human — **goblin deliberately avoided** (the greedy-financier
stereotype survives any refutation). Lever: become the *less frightening*
option and lean on the buried conscience; flipped, she is the biggest
source; unbroken, a threat. The stamp used without looking; the unlit
cigarette; *"take it upstairs."*

### 5.6 Bram, the enrollment supervisor

**The lifer who made peace with the unclosable count** — *round it, send
it on* — and that wisdom is **the exact blind spot the fraud lives in**:
he cannot tell fraud from error. Not incurious; **competence and blindness
from one muscle**, his virtue the camouflage. He liked Dunny and told him
to **let it go** — to save him. Show him a discrepancy that *cannot* be
error and it cracks: *"I told him it was nothing. I taught myself
everything was nothing."* Lean: he turns. The **red pen** and its
*"close enough"* (a ledger of them is the campus paper trail); the sincere
**"Done is better than perfect"** sign; fond exasperation cracking into
grief.

### 5.7 Katie, the property manager

⚠ Shipped as Duncan Hall content; her arc is not built.

- Every player meets her **day one** — her **manifest is the Warren's
  diegetic face** — so she is **the one character you already know** when
  you start asking. Not a suspect; an obstacle that can become an ally.
  She absorbs Pidge's physical-access role.
- *Gang when she wants, boss when she has to.* The triad: Dunny noticed
  everyone, Wren no one, **Katie noticed and looked away** — *the building
  outranks the kid.*
- **Troll, the overlooked caretaker caste** — the live-in help treated as
  a fixture; *the overlooked caretaker sees more than those who overlook
  her*, and the cover rides on "the super doesn't notice."
- **The knife:** Dunny treated her as a person. **The clearing hand:**
  *she* sealed the room, moved Wren, clears it on schedule — you ask the
  woman executing the erasure to let you in.
- The corkboard of decades of tenants; the keys are her sound (Dunny had
  the laugh, Gus the whistle); **the code-switch tell**; one petty rule
  enforced with relish. Lean: she feels the haste is wrong and won't name it.

### 5.8 Wren, the roommate

**The ghost roommate** — should have known him best, barely knew him.
**Locked:** heads-down, not cold, and **mundanely real** (outside the
who-counts blast radius). A private weight kept as pure negative space;
*they're us on a bad week.* They give the **shape** of Dunny, never the
content, and being asked rubs the wound (*I don't know, and I should*);
**patience opens them** to texture and one real 3 a.m. memory. **The
unwitting clue:** Dunny hid a fragment of the work in their things (lean:
deliberately), and it rode out in their boxes — *he trusted me with this,
and I didn't even know him.* Distinct from the procedural roommate every
player gets (§17.H); Wren is its hand-carved rhyme.

### 5.9 Gus, the crossing guard

⚠ Shipped. What the design keeps:

> **A one-man "Crossing Authority" who guards a crossing with no traffic,
> for a school full of grown adults, in a city that hasn't finished
> arriving — and does it with total professional gravity and genuine
> pride.**

- **Never wink.** Dedicated, not confused or sad. (The Teleport Authority
  runs the terminal; Gus will tell you his is official. It is not.)
- **Primitive on purpose** — a canned loop, keyword triggers, **stateless
  per interactor**; the black-and-white before the living NPCs past the
  gate. *Don't upgrade him* — the flex is knowing Gus should be canned.
- **Content, not waiting** — fed by arrivals, every crossing the first.
  **No resolving payoff**; *"let somedays stay somedays"* — the someday
  bus stays unloaded.
- **Sit, set, open, cross** — he won't sit in the relief's chair, set the
  watch, open the thermos, or cross the gate he ushers everyone through.
- **Badge and watch:** the identity he *assigns* himself (*BADGE No. 001 ·
  EST. ____ · AUTHORIZED BY: Gus*) and the one *given* to him, the watch's
  *AUGUSTUS*. *"Gus" is sitting inside "Augustus"* — the relief who came
  and stayed.
- **The ritual:** the tally is a deed, the ritual a performance —
  decoupled; past a queue he **batches** (*"the lot of you — mind the
  curb"*) while every arrival is still tallied.
- **The anecdotes:** *"Had the chosen one through Tuesday — glowing sword,
  prophecy, the whole article. Wanted directions to the final battle. Both
  ways now, on you go. Curb's the same for heroes."* · *"God came through
  once — wanted to know was this the right reality. Told him mind the
  curb. They all get the curb."* **We want many more.**
- **In the arc:** his log corroborates the city thread (victims crossed
  out, never back — §15.4). ⚠ His statelessness predates belief v2.

## 6. Gus's objects

All shipped as University Avenue content: the **pocket watch** (wound
daily, never set, so it drifts slow), the **whistle** (~110 dB brass pea
whistle; the first object-sound driver), the **STOP paddle** (STOP only,
never SLOW; theatrical — it blocks nothing), the **thermos** (real hot
coffee he never opens), the **crossing log** (passive; *Gus* marks it with
`tally`, in his wrong watch time and anonymously, because he cannot record
*who*), the **camp chair** (the relief's; `Foldable`), and the terminal
**clock tower** (the accurate sibling). Banked designs worth keeping: the
**player whistle** — `emitted_dB = ceiling (object) × f(breath) ×
g(skill)`, exhaustion as the throttle, signal patterns at the top — and
the watch's **v2 mainspring** that freezes the clock when unwound. ⚠ **The
owner said not to put much stock in the existing watch**; what survives is
the design (drift as character, the engraving, the drift-reveal).

## 7. The EotL source

The original LPC is checked out at `~/play/eotl/mudlib/zone/null/eternal/`
— grep a road or building, keep the aesthetic, rewrite the language. Most
useful: the **roads** (Eternal Way, rooms 015/019/031/035–037 · Silver
Street, 008–012 · Limbo Lane, 016/020/022–024/027/028 · Tanelorn, Old
Road, Glass Way, Infinity Way, Dimension Drive, Dark Alley 1–9; `MAP.TXT`);
the **buildings** (Dr. Frankenstein's Body Shop → Health Center · Aleron &
Anthrax Clothiers and Everything Inc. → Campus Store · **Temple of the
Ages**, "a statue for every race, guild, and gender" → the Chapel · the
Library · Eternal Savings and Loan · A Vacant Lot · the Zombie Chamber,
"bodies of the net-dead"); the **subdirs** (`condos/` — elevator, keycard,
landing: Duncan Hall prior art · `school/lessons/` — read it, then teach by
doing · `tpa/` · `bus/` · `monsters/` · `evil/dave.c` · `map/`); and the
**brands** for whimsy (Anarchy Interdimensional, UNDER TEMPORARY
MANAGEMENT · Everything Inc. · Videopolis · Chextra · BoMA).

## 8. Open questions

### 8.1 The campus

1. The Quad as terminal #3 (lean: skip); its finish; Goibniu or Vesta.
2. Duncan Hall: elevator technology; a fixed or growing floor count; one
   big common room plus floor lounges (lean); the basement as an ingress.
3. Keys: copying, lending, reissue as a Katie loop; physical (lean).

### 8.2 Terminus

4. The Port and the Garrison at neighborhood grain; the tavern as the
   first archetype; the admin-sim surface.
5. Reconcile §2.3 with the shipped streets; ratify geography into the
   bible only on sign-off; reconcile the underground note.
6. The Gray against shipped credit; rename `τ`.
7. The realm's ministries; the University's Chancellor and colleges.

### 8.3 Lore

8. The Limen lines, the statue prose, the rite's texture, the Museum beat,
   the handler's near layer (corpo vs. Vane-heir); audit for
   pre-founding phrasing.
9. The allegory: how far the reckoning reaches; ground first; the shared
   ledger with redlining.

### 8.4 Scenes

10. **The first read's instrument** — a demo-augment thermal sense (lean)
    or a borrowed thermometer; **who the finding is committed to** — Katie
    (lean); hold the "moved" read for skill.
11. The sealed room's escaped fragment — exactly what it is.
12. **The real kill site** — "somewhere cold": found in the city's
    apparatus, or haze?
13. The morgue: the newbie's route (lean: records + Pim); a minimal first
    build (lean: the threshold and the slab); how hard the world remembers
    a forged credential.
14. **How much the player confirms about the bookkeeper** — proven, or
    inferred to keep "you never fully catch it."
15. The census form: rank as well as gate (lean: both); the roll-clock
    fade **fiction only — never de-person a real player** (lean); fund
    mode's weight.

### 8.5 Cast

16. Every name and gender (the naming pass).
17. Vance: ghouls and the dead, how normalized; crack, deflect or removed;
    what the formative case cost.
18. Pim: does he ever clock it (lean: no). Pell: how confirmed the
    passed-up name is; does she flip (lean: yes). Bram: ally (lean) or
    witness; the red-pen ledger as evidence.
19. Katie: how near conscious suspicion. Wren: the dead drop deliberate
    (lean); the private weight never shaped (lean).
20. Gus: how much he watches the haze (lean: light); a Crossing Authority
    at every terminal?
