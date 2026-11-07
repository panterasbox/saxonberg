# Prison slate — a place you cannot leave, the ladder of prisons, and the two systems

> **Status: UNBUILT** — the parcel/access exclusion machinery it inverts ships, and mortality's
> `Incorporeal` lever is reserved for it; nothing of confinement exists. Code-verified 2026-09-19:
> no `prison` / `gaol` / `PrisonMixin` / custody book anywhere under `packages/server/src/mud`, any
> pack's `src/` or `schema/` (every `custody` hit is chattel custody); no courts / venire primitive;
> the Saxonberg parcel is still *RESERVED — not built*.
> ⚠⚠ **Rewritten 2026-11-07 with the owner**, out of the moderation conversation
> ([moderation-slate](./moderation-slate.md) § 16). The previous *"three enforcement tiers"* table
> and its guardrail — *real-conduct moderation never gets a diegetic costume* — are **reversed**:
> prison is a **remedy chosen by investment**, not a penalty attached to a kind of crime.
> **Left:** `PrisonMixin` (the boundary + the custody book) · the custody pass · the custody limit as
> a parcel parameter · the sentence clock and its credit sources · the re-entry ladder's custody pin ·
> the Compact facility on its reserved site · the state-pen prototype as content · the prison
> archetype · the ladder's rungs as rows · the two conversions · rehabilitation (its own
> conversation) · phone monitoring (→ [privacy-slate](./privacy-slate.md)) · § 12's open list
> **Size:** a build

**Captured 2026-08-01** out of the Saxonberg city design session; **rewritten 2026-11-07**. Related:
[moderation-slate](./moderation-slate.md) (the sentencing side — who may sentence, the investment
criterion, the franchise), [law-and-order-slate](./law-and-order-slate.md) § 7 (remedies: banishment
as the primary remedy, the sentence menu, penal geography, the inmate polity) and § 8 (escapes,
the symmetric trap), [courts-slate](./courts-slate.md), [civics.md](../../subsystems/civics.md),
[access.md](../../subsystems/access.md) / [parcel.md](../../subsystems/parcel.md) (the exclusion
machinery confinement inverts), [residence.md](../../subsystems/residence.md) (cells on the spine),
[settlement-model.md](../../settlement-model.md) § 1 (the needs), [unfree-labour-slate](./unfree-labour-slate.md).

⭐ **The doctrine this slate supplies to the rubric:** a rule with no stated damage is an advisory
rule ([lens #33 · Rules](../../lenses/33-rules.md)). It sits on two axes — **who may amend** versus
**who enforces** (`wall · camera · witness · norm`).

## 1. ⭐⭐⭐ Prison is a remedy, not a penalty for a crime type **[DECIDED — the owner]**

*"I don't think prison has anything to do with the crime. It has to do with our ability to
rehabilitate and whether the investment is worth it for the character we're talking about. Not all
prisoners are treated equal here."* Who may sentence, on what criterion (the player's **investment**
in the character — never standing, wealth or office), and what prison does to the franchise
(untouched by default; only the Compact may attach disenfranchisement to a sentence) are the
[moderation-slate](./moderation-slate.md)'s § 16. This slate is the place itself.

⚠ This does not contradict law-and-order § 7's *"we don't really like putting people in prison"* —
that was crime **inside the fiction**, where banishment stays the primary remedy. The two meet in
§ 3's ladder: a locality banishes; only the Compact imprisons.

## 2. ⭐⭐⭐ Two facilities **[DECIDED]**

| | **locality gaol** | **the Compact facility** |
|---|---|---|
| for | crime inside the fiction, under a town's law | conduct-code offenses and crimes against the Compact itself |
| why you're there | the short end of the sentence menu (§ 3) | rehabilitation, chosen by investment |
| inside | that town's law; ⭐ good **NPC** content (prison breaks, visits, a gaoler's job) | the prototype of § 7, with rehabilitation plugged in later |
| where | wherever a town builds one | ⭐ **the reserved federal-facility site in the City of Saxonberg** — the seat of government |

- **Q1 (old) answered:** the conduct code is the Compact's law, so a conduct offense *is* an
  offense against the Compact, and its sentences go to the Compact's facility.
- **The costume worry dissolves:** nobody pretends a slur was a fictional crime. The facility is
  honestly the Compact's correctional institution, in the city where government lives — meta and
  in-world at once, like the Compact itself. (Lens 3a.)

## 3. ⭐⭐ The confinement ladder — who may hold a player, and for how long **[DECIDED]**

*"Prisons are essentially bans, whether they're in town or being stuck in a pocket dimension
somewhere, which is why I'm hesitant to let private committees that don't answer directly to the
Compact impose that on players. … Short term it'd be okay — that's no different than trapping
someone in a bear trap until they escape. … For more durative punishment banishment is more
appropriate, or escalate it to the Compact."*

| who confines | how | how long | escapable |
|---|---|---|---|
| **anyone** | a bear trap, a rope, `restrain` | until they get free; ⚠ lapses when the trapped logs off (law-and-order § 8's symmetric trap) | yes — that is the point |
| **a locality's seat** | the lockup | **within the custody limit**; that seat's custody survives logout | yes, as content |
| **the Compact** | a prison (§ 6's designation) | a term, served by presence (§ 5) | per the rung |

- A locality wanting longer **banishes** (its primary remedy) or **refers the case to the Compact**.
- ⭐ **The custody limit is *"just another parameter on the parcel"*** **[the owner]** — inherited
  down the title tree, where a child may **tighten** what its parent allows and never loosen it, so
  the Compact's root parcel sets the ceiling.
- **The Compact can always do pretty much whatever it wants** **[the owner]** — *"it is the core
  decision-making apparatus for the entire game. The question is always just one of process."*
  Every Compact power in this slate (designation, the solitary cap, disenfranchising sentences) is
  its to use; **which process** authorizes each is the constitution's, not this slate's.

## 4. ⭐⭐ PrisonMixin — the system that keeps you in

**The abstraction (the owner, 2026-08-01): maximally abstract — the same mixin models ANY prison,
no matter the skin.** The mixin owns exactly two invariants:

- **The boundary** — inverted banishment over an *extent*: one cell, a warren of cells, a building,
  an island, a ship's hull, an entire Locality. Exclusion from everywhere *but* the extent — the
  same access substrate, flipped. ⚠ It is **custody's**, not a lock's: the locks requirements hold
  that *no lock refuses leaving — cells are policing's*.
- **The custody book** — who is held, under what authority, the extent, the sentence state. Intake
  is a custody transfer with an accountability entry (who committed whom, under what authority,
  when). Release eligibility is derived on read, never a cron job.

### 4a. ⭐ You never leave CUSTODY, not "you never leave" **[DECIDED — the owner]**

*"Some things worth revisiting, like never leaving. You can have prison gangs that go out and do
things like pick up trash. We can even teleport people to content or content to people, so there's
little risk — though maybe the risk is itself good content."* The custody book can issue a **pass**
that stretches the prisoner's extent to a work site for its span. Escape from a work gang is
possible and is content — ⭐ **the sentence follows the identity**, so escaping adds time and gets you
out of nothing. The thrill is real and the cost honest.

### 4b. Custody without title

The custodian usually holds the extent, but **custody and title are separate** (as with the hock,
[moderation-slate](./moderation-slate.md) § 17): home confinement (§ 8) puts custody over a home the
prisoner titles.

## 5. ⭐⭐⭐ The system that lets you out — the sentence clock and its credit sources **[DECIDED]**

*"I guess there's two systems: one that keeps you in and one that lets you out."*

- **Time served = hours CONNECTED inside, on the game clock** **[the owner]** — *"logging your
  character, sitting in prison and doing only things that are allowed in prison until your sentence
  is served … the idea is to make prison actually feel like something."* ⚠ Game time is not
  monotonic (A16), so served time accumulates **forward ticks only** and never goes down.
- **Idle counts.** *"If idle time doesn't count someone will just run keepalives. I'm fine if people
  want to sleep off their sentences, but the idea is if they engage with the system their time will
  get reduced faster."* (Old Q7 — *how is a term measured against absence?* — answered: hours
  present, where present means connected.)
- ⭐⭐ **Credit sources subtract from the clock.** The let-out side accepts credit from **declared
  sources** and does not care how it was earned — so prison ships without rehabilitation, and a
  sentence still ends by time served.
  1. **Voluntary work** — the first source. *"Coerced is the important part here, while you can
     offer things people can do to reduce their sentence that maybe the game needs but no players
     are doing organically."* Rails:
     - refusing never adds time;
     - **demand-led** — trash, roads, sanitation's `collect`, sorting the hock;
     - ⚠ **never a job a free player could do or is paid to do** — if the help-wanted sign for that
       work is up, prisoners don't take it (prison labor must not undercut wages; lens 6);
     - ⛔ **never LABOR** — *"'no labor' stands for no actual labor, as in the labor chamber, so we
       never coerce people to write or manage specific content, which is what we say labor is here —
       worldcrafting."* Compelled authorship would also buy political weight;
     - it earns **sentence credit, never standing**.
  2. **Rehabilitation** — *"the labor thing but pointed at rehab, not just any old economic input."*
     A later source; its design is **its own conversation** (§ 12). The constraints already set
     ([moderation-slate](./moderation-slate.md) § 16c): teach a Discipline, never grade a
     disposition; it must be worth doing.
- **Money buys comfort, never time** — family *"can definitely put money on your account"* for the
  commissary (§ 7), and no amount of it shortens a sentence. (Old Q5 answered.)

## 6. ⭐⭐ What makes a place a prison — the designation

Without one, it is a building with locks. **A designation is the custody book naming an extent.**
Only the Compact designates a prison; a locality designates only a lockup, within its custody limit.
The Compact may designate any extent it chooses (§ 3) — whether it must buy or lease the land
first, or may take it, is **process**, the constitution's question.

## 6a. ⭐⭐⭐ The launch prison, intake and release **[DECIDED — the owner, 11-07]**

*"Our Saxonberg prison I actually think can start real small. We don't need the whole state pen, at
least not for launch. … What we need is the confinement, and something that scales so it's never
'full' and can always accommodate another prisoner."*

- **Launch = confinement + an elastic cell block.** The residence spine's elastic warrens (the dorm is
  the shipped exemplar) mint a member on demand, so the block is a **warren of cells** — the dorm's dark
  twin — and is never full. The state pen (§ 7) is the later shape.
- **Intake — stop it now, move after.** *"If you're responding to infractions in real time you need that
  shit to stop immediately, and getting them to prison is the end state."*
  1. **Custody begins where they stand, at once** — the moderator's act puts them in custody on the
     spot; their verbs collapse to what custody allows (a sentence may add a mute). That instant *is*
     detention.
  2. **A direct move to intake — no route.** ⛔ Not the TPA: *"even with the TPA you're still pathfinding
     and moving through rooms where shit can go wrong."* And it must be **honest magic** — *"we do try to
     regulate it in the game's fiction … magic should actually be 'magic'."* So it is the facility's
     **custody summons**: an arcane working anchored at an intake circle the facility holds, **specified
     by the custody book** (*you can only summon someone the record names*), priced by physics
     (`m·g·Δh`), drawn from the facility's own mana supply (a Compact line-item).
     ⚠ It needs the doctrine in [mana-economy-design-pack](./mana-economy-design-pack.md) Part 11a —
     lifting `magic.md`'s structural *a caster cannot teleport a third party* in favor of specification
     plus composure.
  3. **Narrated at both ends** — the room sees them taken (staging's *entrances and exits as behavior*),
     intake sees them arrive.
  4. **Intake** — the custody-book entry, the phone into the hock, a cell from the elastic block.
  - Offline or never signed in: the sentence waits; the re-entry ladder's custody pin (§ 7d) puts them in
    intake at next login. Dying or wounded: the body moves **as it is** — custody never heals.
  - A locality's lockup is different: the watch arrests with `restrain` and walks them, fully diegetic,
    escape possible — a delay that is content.
- **Release — the facility gate.** Walking out into Saxonberg is the release moment (and foot traffic for
  the demo capital). What real prisoners get: their **property** back and their **trust-account
  balance**, sometimes **gate money** (most U.S. states, from nothing to a couple of hundred dollars —
  California's is about $200 — sometimes a bus ticket). So: belongings out of the hock; the commissary
  balance paid out; ⚠ **gate money open** — the lean is the bus ticket's equivalent, a **one-ride TPA
  fare**, with cash at zero by default and the Compact free to set it.

## 7. ⭐⭐⭐ The prototype — the generic state pen **[DECIDED shape]**

*"Let's start with the generic state pen. No max security, not min, right in the middle. Maybe
there's gen pop, and some solitary. We need venues for meals and recreation. We also need laundry
and other prison services."*

⭐ **A prison is a settlement whose residents cannot import.** Every need a town meets with a market
([settlement-model.md](../../settlement-model.md) § 1), a prison meets inside its walls or leaves
deliberately unmet — and *the gaps are the character*. So the **prison archetype** is a checklist of
capabilities, like the venue archetypes (`archetypes/*.yaml`, derived on read, never enforced at
runtime), spanning many rooms.

| space | need | rides |
|---|---|---|
| **intake** | law | the custody-book entry; belongings to the **hock**; a `search`; a uniform issued (textiles); the phone taken |
| **cell blocks (gen pop)** | housing | cells as **provisioned shelters on the residence spine** — the dorm's dark twin, assigned not chosen; two bunks a cell; the door is custody's |
| **the dayroom** | assembly | a block's common room — a wall TV (a display), card tables, **the shared phone** |
| **solitary** | — | **the extent narrowed to one cell** — the same boundary, one level down |
| **mess hall** | food, prepared | a cookhouse (`trade-cooking`); fixed seating; meals on the schedule; food quality a dial with real nutrition (metabolism) |
| **the yard** | leisure, body | open sky and weather (construction's exposure); the **gym archetype** (`LoadDevice`, `lift`) |
| **laundry** | clothing, hygiene | cleanliness's wash chemistry; the laundress as a prison job |
| **commissary** | exchange | the general store (`PricedOffer`); paid by prison wages and family money |
| **infirmary** | health | the medic vertical |
| **library · chapel** | education · ceremony | where rehabilitation plugs in |
| **visiting room** | the outside | visitors in person; contraband through visits (concealment) |
| **the shops** | work | demand-led prison industry (§ 5) |
| **towers · the count** | law | sightlines (perception); the count as interior law on the schedule; **lockdown** a state change of that law |

Emergent, unwritten: the **contraband economy** (concealment, `search`), **barter currency** (ramen),
**yard politics**, the count that comes up short. **The panopticon is a perception skin** —
sightlines, no concealment bands, a scrying fixture — not prison mechanics.

### 7a. Staff **[DECIDED]**

*"Like most things, we start with NPCs and we'll move to player-based economies, hopefully
organically."* The facility is an organization: **the warden a seat the Compact appoints**; officers,
cooks and the medic **positions** NPC Extras fill through employment's call and derived openings — so
players fill them as that economy grows, with no redesign. A player officer's power is bounded by the
interior law and recorded (law-and-order's *witness mode*).

### 7b. The schedule — doors, and the walk back **[DECIDED]**

Interior law on the game clock: count, meals, yard, work, lights out. **Zones open and close** — the
yard door at yard time, the mess at meals — and **anyone in a closing zone is walked back to their
cell** by staff, narrated, like an eject whose return point is the cell. ⚠ Moving a body is a power
**only inside custody** — the custody book's, never any NPC's over any player. **Infractions** (write-
ups that add time or earn solitary) are a later layer on the same doors.

### 7c. Comms **[DECIDED — the owner]**

*"Different sentences need to be on the table. No speech at all is wrong, yes, but no aether is
probably okay — cutting them off from DMs and chat. If someone wants to see them they have to come
visit in person, or maybe there's a shared prison phone."*

- ⛔ **Speech inside is the floor** — to cellmates, staff and visitors. A total mute inside is off the
  menu.
- **No aether is a sentence term, enforced in the fiction**: the phone goes **into the hock** (a
  *held during a sanction* hold, returned at release), and the facility is an **aether dead zone**
  (which covers an implant, which cannot be confiscated).
- **The outside comes in two ways**: visitors in person, and **the shared phone**.
- Other sentences compose from the same parts — a lockup may take only movement.
- ⚠ **Whether the shared phone is monitored** is deferred to the [privacy-slate](./privacy-slate.md)
  **[the owner]** — it owns *surveillance is detectable and attributable*.

### 7d. Logging out inside — the re-entry ladder's custody pin **[DECIDED]**

*"Sometimes you simply can't log back into where you signed out from due to some state change, and
we need a fallback for that. Generally I always fall back to the lounge but maybe there's a better,
less extreme option. And then of course prison would need its own solution."*

The general ladder (it outlives prison — [moderation-slate](./moderation-slate.md) § 9): at login,
the first rung that **admits you now** — where you logged out → **that place's declared fallback**
(the yard → your cell · a ship at sea → its deck or home berth · a mine working → the pithead · a
rented room → the lobby; the default, undeclared, is **step outward** along the place tree) → your
home → the lounge, as last resort only. **Inside custody, no rung may leave the custody extent**: the
closed yard puts you in your cell, a locked-down block in intake or holding; home and the lounge do
not exist for a prisoner.

## 8. ⭐⭐ The ladder — the same ingredients at every rung

**The five ingredients:** an **extent** · the **custody boundary** · a **custodian organization** that
holds the extent · the **needs met inside**, scored · the **interior law** (schedule, movement zones,
sentence terms).

| rung | extent | movement | needs met | aether | passes | the boundary is | the inside is run by |
|---|---|---|---|---|---|---|---|
| **lockup** (a locality's) | one room | the room | almost none — meals brought in | one call | none | a wall, short (the custody limit) | the watch |
| ⭐ **home confinement** **[the owner]** | **your own home** | your home | **your own** | open | to work, scheduled | ⭐ **an instrument** — the ankle bracelet | you, under the book's terms |
| ⭐ **halfway house** **[the owner]** | a boarding house the custodian runs | free by day, curfew by night | most | open | daily, to a job | a law + the nightly check-in | the house manager |
| **open colony** (minimum) | a farm or camp | the whole extent | most; dorms not cells | allowed | daily | **a law**: you can walk away and the sentence follows | a warden |
| **state pen** (medium — § 7) | a walled complex | by schedule (doors) | survive + hold together | dead zone, the shared phone | some | a wall | a warden |
| **maximum** | the same complex | the cell 23 hours, the yard alone | survive only | dead | none | a wall and towers | a warden |
| **the inmate polity** (*Escape from New York*) | an island, a walled city | everywhere | **whatever the inmates build** | per its law | none | one rule at the wall | **the inmates** |
| **relegation** (Elba) | an island you keep | everywhere | your household | allowed | — | a law | **you** |

⭐⭐ **What actually varies is four things**: how far you move · which needs the custodian meets ·
**whether the boundary is a wall, an instrument or a law** · who runs the inside. Everything else is
content laid on top — the archetype working.

- **The bracelet is law-and-order's *camera* mode** — you *can* walk out; it is detected and
  reported, not prevented. A worn aether device reporting position to the custodian: the first case
  for the [aether-devices slate](./aether-devices-slate.md)'s *what a device reports back, and to
  whom*. Tampering leaves evidence (paper's `seal`). ⭐ **Continuity (lens 5):** off-grid, or in an
  earlier epoch, the same sentence is enforced by **witness** — a parole officer visits, or you
  report in person. Same sentence, different enforcement; no bracelet works without coverage.
- **A violation is reported and the custodian decides** **[DECIDED]** — from a warning to **moving the
  remainder up the ladder**, the standard answer. Never automatic: the one who steps out for the
  mail is not the one who runs, and a line-cross that punishes itself is the engine doing the
  custodian's job.
- **The halfway house is the let-out side's** — the step before release.
- **Solitary — the Compact regulates it "like anything"** **[the owner]**. (A Tier A cap was proposed
  and declined; the Mandela Rules' 15 consecutive days is the reference point the Compact starts
  from, and speech inside — § 7c — remains the floor.)

## 9. ⭐⭐ Turning a non-prison into a prison — the ingredients test

*"Take something that specifically isn't a prison — maybe a drydocked ship or an abandoned schoolyard
— and turn it into a prison just by applying the right ingredients."*

### 9a. A drydocked ship → a prison hulk

History: Britain held convicts on decommissioned **prison hulks** moored in the Thames for eighty
years (Magwitch escapes one in *Great Expectations*) — lens 1 material.

| ingredient | on the ship |
|---|---|
| extent | the hull — a Structure, always *alongside* a room ([ships-and-harbors](./ships-and-harbors-slate.md)), here the drydock |
| boundary | **the gangway** — one way off, the easiest wall there is |
| cells | berths in the hold, provisioned |
| solitary | **the brig** — ships already have one |
| mess · yard | galley and mess deck · the weather deck |
| infirmary · laundry · warden | sickbay · the ship's laundry · the captain's cabin |

Refloat it and moor it in the river and **the water is the wall** — escape is a swim the underwater
system already prices in real seconds and drowning cost.

### 9b. An abandoned schoolyard → a reformatory

| ingredient | at the school |
|---|---|
| boundary | the chain-link fence (construction's enclosure) |
| cells | classrooms remodeled into dorm cells (`remodel` / `provision`, the Duncan Hall verbs) |
| mess · yard · rec | cafeteria · schoolyard · gym (the gym archetype already there) |
| infirmary · warden · the count | the nurse's office · the principal's office · the PA |
| **education** | **already met** — library and classrooms |

Its portrait meets education by construction: **the natural home for rehabilitation**, which is what
the reform school was meant to be.

### 9c. The test passes

Neither needs code — rows, `remodel` and `provision` on existing places, plus a designation (§ 6).
*A second instance needs no code.*

## 10. The experience rule — a sentence must remain a place

Visitors, letters, the shared phone, plausibly work-for-time. Confinement that severs all contact is a
ban with extra steps, and should just be honest and be a ban. A prisoner keeps the protected floor:
due process is not suspended by conviction.

## 11. Answered from the old open list

| old Q | answer |
|---|---|
| 1 · Compact crimes diegetically prosecuted? | yes — the conduct code is Compact law; its facility is § 2's |
| 2 · what confinement restricts beyond movement | per sentence; speech inside is the floor; no-aether a term (§ 7c) |
| 3 · interim committal authority | the operator holds the seats at go-live ([moderation-slate](./moderation-slate.md) § 4); a locality only within its custody limit |
| 4 · escape | real and content; the sentence follows the identity, so escape adds time (§ 4a); the inmate polity makes it a rung |
| 5 · fines vs terms; does wealth buy time | money buys comfort, never time (§ 5) |
| 7 · a term against absence | hours connected; idle counts; engagement subtracts (§ 5) |
| 8 · the punishment-ceiling tier | the Compact regulates (§ 3, § 8) — process, not a tier above it |

## 12. Open

- ⭐⭐ **Rehabilitation** — its own conversation: what earns credit (hours engaged vs competence
  demonstrated — the lean was competence, with the honest limit that a test measures knowledge and
  the offense was behavior, so behavior is judged on probation after release), the curriculum, parole.
- **Phone monitoring** → [privacy-slate](./privacy-slate.md).
- **Where a released prisoner goes** — the gate, then the re-entry ladder outside custody?
- **Visiting rules** — who may visit, how often, contraband.
- **Infractions** — the layer over § 7b's doors.
- **Which process** the Compact uses for designation, disenfranchising sentences and the solitary cap.
- **Mixin placement** — `lib/civics/`, pending the module-category check at build time.
