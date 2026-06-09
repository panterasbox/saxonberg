# Eternal City source — inventory & EU mappings (staging)

> **Status: resource, mined from `docs/eternal/` overnight (2026-06-08).**
> A complete catalog of the legacy EC source — roads, buildings, NPCs,
> content subdirs, the map — with **suggested EU mappings**. The mappings
> are *suggestions, not decisions*; the extraction is the value. Prose for
> the growth roads is **modernized** here (pull → polish → adapt), same
> method as the v1 roads in [campus-map.md](./campus-map.md). EC's central
> **Heart is rejected** (kill-zone); we borrow material, not the map.

## Roads (all 9)

**v1 (done — see campus-map.md):** Eternal Way (mystery fog hiding the
road's composition; unseen slither) · Silver Street (ringing mirror-metal
plates, footsteps "lost in the atmosphere") · Limbo Lane (springing/spongy
glowing pink, "compresses like cotton candy").

**Growth roads — aesthetic + modernized prose:**

**Tanelorn Road** — *coarse shiny black gravel (crushed obsidian & onyx) that crunches loudly, "noisily amplifying your progress."*
> Tanelorn Road is laid in coarse black gravel — crushed obsidian and onyx, the source swears — and it refuses to let you pass quietly: every step crunches and grinds and throws your own progress back at you. The black glitters where the light finds it.

**Old Road** — *THE first road ever built; worn by eons of footfall into a central trough; "an eerie sense of permanence," a monument that "challenged the test of time and won."*
> Old Road was the first road ever laid here, and it shows — eons of footfall have worn its spine into a smooth trough, the old cement long since crumbled back toward dust. There's an eerie permanence to it: it was here before nearly everything, and it has outlasted all of it.

**Glass Way** — *a slick greenish-glass plane you literally slip and fall on (no grip possible); prismatic, "colors of all hues reflect." Casts the green-tinted light onto Eternal Way. Site of Eotl's Palace of Wizards (a glass temple).*
> Glass Way is one near-perfect pane of thick, green-tinted glass polished to a mirror — and you *will* go down on it, because there's no purchase to be had anywhere on its surface. Light shatters across it in every color as you slip and scrabble for footing.

**Infinity Way** — *the deadpan joke: a perfectly mundane dark-asphalt road with two yellow lines and keep-right traffic — the grandest name on the map painted on the dullest road.*
> Infinity Way is, against everything its name promises, an ordinary strip of dark asphalt — two yellow lines down the middle, everyone drifting right out of pure habit, the pavement warm from soaking up the everywhere-light. The grandest name on the map, given to the dullest road on it.

**Dimension Drive** — *plain narrow gray gravel; the signature is an unnerving sterile silence — "the only sound is the cacophony your own movements create." A magic tower, a park nearby.*
> Dimension Drive is narrower than the rest and far plainer than its name — a strip of gray gravel and nothing more. The quiet is the unnerving part: no sound but the crunch of your own feet, close and sterile, as if the road swallows everything else.

**Dark Alley** (alley1–9) — *the city's underbelly: dark narrow gaps between towering buildings, little light, rusty fire escapes, smells of old garbage / spilled beer / vomit. "Eternal City's front of perfection does not encompass 100% of the city."*
> A Dark Alley runs the gap between towering buildings where the campus's front of perfection runs out. Little light reaches the bottom; rusty fire escapes hang overhead; and the smell — old garbage, spilled beer, worse — tells you the polished version of this place doesn't go all the way down.

## Buildings & services → EU mappings

| EC building | What it is | → EU mapping |
|---|---|---|
| **Dr. Frankenstein's Body Shop** | bodies "serviced, repaired, regenerated"; Dr. Frank NPC, steel tables, surgical tools, the Doctor's chart | **Health Center / clinic** (augments, body-mod — *the* body-shop lineage we cited) |
| **Aleron & Anthrax Clothiers (A&A)** | huge variety — men's/women's/humanoid/non-human; tailors make custom | **Campus Store / outfitter** |
| **Temple of the Ages, Altar** | altar, huge black-marble human statue; "a statue for every race, guild, and gender"; a single candle | **The Chapel** (religion/deity — and it already keys on race/guild/sex!) |
| **Eternal City Library** | dusty unreachable volumes, missing ladder; off Limbo Lane | **Academic hall / library** |
| **Eternal Savings and Loan** (+ Annex) | high-tech cameras, magical sensors, a squid teller, "Chextra" cash card, BoMA logo | **Bursar / finance** (deferred economy) |
| **Eternal City Bond Exchange** | red-oak + white-marble oval, sunken trading floor | **Bursar / finance** (grander option) |
| **Everything Inc.** (shop1) | warehouse, "antibiotics to zippers," red-uniformed clerk | **General store** |
| **Paranoid Clothing & Apparel** (shop2) | messy, armor-focused (`ArmorP`) | second outfitter / armor (combat-deferred) |
| **Anarchy Interdimensional** (shop3) | weapons & "pain-inflicting devices," "let chaos reign," UNDER TEMPORARY MANAGEMENT | quirky shop **brand** (keep the flavor; combat deferred) |
| **Eight Ball Bar & Grill** | cocktails/grill/cajun, mini-grand piano, absent pianist; links to rogue guild | campus **pub/eatery** (lounge owns the bar; optional café) |
| **Bed & Breakfast Inn** (lobby + reception) | red carpet, wooden chairs, receptionist, staircase | **dorm-lobby prior art** / guest housing (see condos/) |
| **Public Garage** | publicly-available cars from the Chamber of Commerce | vehicles — likely **skip** (pedestrian campus) |
| **A Grey Platform** (drop_dock) | spongy grey pad, 10m circle marked 'D' | a **drop/teleport pad** (fast-travel) |
| **A Vacant Lot** | empty; "a large building must have stood here once" | **buildable plot** (growth hook) |
| **Heart of Eternal City** (+ Operations Room below) | the central hub; a hole with iron rungs to the EotL ops chamber | **REJECTED** (the kill-zone Heart); ops = admin |
| **The Zombie Chamber** | "bodies of the net-dead — caught between interactivity and oblivion" | **link-dead handling** (connection subsystem prior art) |

## Content subdirs (rich prior art)

- **`school/`** *(lessons, rooms, mons, eq, weap)* — the **newbie school**: the
  legacy onboarding/tutorial. **Read `school/lessons/` before building EU
  onboarding** — direct prior art (and a reminder our onboarding is
  learn-by-doing, not their lesson-rooms).
- **`condos/`** *(condo, **elevator.c**, hallway, landing, lobby, office,
  **keycard.c**, server)* — **housing with a working elevator + keycard +
  hallway/landing.** Direct **Duncan Hall** prior art (the dorm Warren +
  elevator + keycard).
- **`tpa/`** *(consoles, arrive/depart, machine, station, rack, office)* — the
  **Teleport Authority** = the fast-travel network. The **Arrival/gate** + the
  TPA terminal lineage (Gus's stop is a TPA stop).
- **`monsters/`** — NPCs: `dr_frank` (clinic), `receptionist` (→ Katie /
  housing), `guard`, shopkeepers (`gwain`/`kalar`/`kilbor`/`sandy`), `drunk`,
  `ambrose`, `reactions.c`. **Service-NPC + reaction prior art.**
- **`evil/dave.c`** — **Dave** the bartender (the lounge's Dave lineage),
  plus `throne_room` (room052's throne room), `death_room`.
- **`magic/`** — amulets/potions/rings/`identify` — magic-item/capability prior
  art (capability-magic, deferred).
- **`bus/`** — a **bus** (+ pass, shadow): the transit/"someday bus" — Gus's
  bus-stop lineage.
- **`lounge/`** *(bar, barkeep, can, lounge)* — EC lounge prior art *(our
  lounge is locked — reference only)*.
- **`objects/`** — props: `magmirror` (magic mirror), `oracle`, `scale`,
  `dispenser`, `dumpster`, `inn_sign`, `map`, `corpse`, `clothes` — prop prior
  art.
- **`map/`** *(ec_generator, generator, legend, server)* — the **ANSI map
  generator** — prior art for the map subsystem.
- **`new/`** *(city, fantasy, map)* — expansion drafts.

## The map (MAP.TXT)

A ~52-room grid-city with a central **(\*\*\*) = the Heart** (rejected).
Roughly: a northwest **Tanelorn Road** quarter (black gravel) · the central
**Eternal Way** spine (fog) running to the Heart · **Silver Street** east
(metal) · **Limbo Lane** (pink) past the **Library** · **Old Road** (the
ancient one) east · **Glass Way** (green glass, the Palace of Wizards) ·
**Infinity Way** (asphalt) + **Dimension Drive** (gray gravel) in the
southern quarters · **Dark Alleys** threading the gaps. We **don't** copy
this layout — the campus is its own (Gate → Eternal Way → Quad → Silver
Street / Limbo Lane → Residential Quarter).

## Top EU build-from-EC suggestions (the actionable bit)

1. **Duncan Hall** ← mine **`condos/`** (elevator, keycard, hallway, landing,
   lobby) — it's the dorm Warren, already built once.
2. **Health Center** ← **Dr. Frankenstein's Body Shop** (+ `monsters/dr_frank`).
3. **Campus Store** ← **A&A Clothiers** (+ Everything Inc.).
4. **The Chapel** ← **Temple of the Ages** (race/guild/sex statues — perfect).
5. **Arrival/Gate** ← **`tpa/`** (the terminal) + the **`bus/`** lineage (Gus).
6. **Service NPCs** ← **`monsters/`** (`receptionist` → Katie; shopkeepers;
   the advisor).
7. **Onboarding** ← read **`school/lessons/`** for what they taught — then do
   it learn-by-doing instead.
8. **Library / academic hall** ← **Eternal City Library**.
9. **Keep the brands** for whimsy: *Anarchy Interdimensional*, *Everything
   Inc.*, *Videopolis*, *Chextra*, *BoMA*.
