# EotL — a census of the ancestor

> **Status: reference. Measured 2026-09-30, CORRECTED and extended
> 2026-10-01.** The first time anybody has counted the corpus this
> platform descends from. Local copy at `~/play/eotl/mudlib` — **1.6 GB,
> 77,495 `.c` files, 45,380 of them under `zone/`.** ⚠ **Not on any
> branch** — the mudlib lives outside the repo and these numbers cannot
> be re-derived from it.
>
> ⚠⚠ **The first pass got the size badly wrong** and the error stood in
> this file for a day: it reported **6.6 GB of which 5.1 GB was
> `zone/null/stuff/`**. The corpus is **1.6 GB** and `zone/null/stuff/`
> is **1.3 MB / 168 files** — it is the generic magic-item library, not
> bulk. The real bulk is **thirty years of logs**: one 70 MB temperature
> diary, a 41 MB drop log, an 18 MB payroll. Both wrong figures came
> from a mis-read `du`, uncorroborated. *Corroborate a headline number
> before it becomes a premise.*
>
> Taken to answer one question for the content-vision work: **does the
> simulation generate stories, or host them?** The ancestor answers
> emphatically, and the answer was not what the conversation assumed.

## Shape

**45,380 `.c` files under `zone/`** (77,495 across the whole mudlib —
the rest is `usr/` homedirs, `obj/`, `lib/` and the driver):

| zone | `.c` files |
|---|---|
| `fantasy` | **28,563** |
| `null` | 7,780 |
| `present` | 3,335 |
| `future` | 2,761 |
| `offline` | 1,777 |
| `guild` | 1,164 |

**Largest authored areas:** `fantasy/kanori` 3,348 · `fantasy/mines`
3,090 · `fantasy/nargolia` 2,510 · `fantasy/mythology` 2,284 ·
`fantasy/chaos` 1,810 · `fantasy/castles` 1,748 · `present/dementia`
1,740. `null/eternal` (Eternal City) is 4.4 MB.

## What the content IS, by inherit line

| base | count | our word for it |
|---|---|---|
| `RoomPlusCode` + `RoomCode` | **19,703** | a Location |
| `MonsterCode` | 4,147 | an NPC |
| `SpecialAttackCode` | 2,392 | combat variety |
| **`MonsterTalk`** | **2,290** | an NPC that speaks |
| `ArmorCode` / `WeaponCode` / `NewWeaponCode` | 1,793 / 756 / 632 | gear |
| `ObjectCode` / `ThingCode` / `NewThingCode` | 1,652 / 690 / 408 | Things |
| `MonsterMove` | 1,284 | a wandering brain |
| `DoorCode` | 614 | a Boundary |
| `SwampRoom` | 525 | a biome-specialised room |
| **`MonsterAsk`** | **214** | an NPC you can interrogate |

⭐ **Roughly five rooms per NPC, and 55% of NPCs talk — but only 5% can
be *asked* anything.** Most speech is ambient chatter, not dialogue.

⚠ *(Corrected 2026-10-01: the room count was first reported as 16,294
from `RoomPlusCode` 10,803 + `RoomCode` 5,491. Counted by file, it is
**12,976 + 6,733 = 19,703 distinct files**.)*

## ⛔ The decisive number — there are almost no quests

| marker | files |
|---|---|
| `set_quest` | **48** |
| `QUEST` mentioned | 83 |
| `add_quest` | 22 |
| `quest_complete` | 1 |

> ⛔⛔ **Fifty-odd quest files in forty-five thousand — about 0.1%.** The
> game that inspired this platform more than any other **has essentially
> no narrative-arc machinery at all.**

And what it has instead:

| marker | files |
|---|---|
| **`add_action`** — a bespoke verb | **4,472** |
| `set_chat` — ambient speech | 1,997 |
| ask-about | 206 |

> ⭐⭐⭐ **More files add a custom verb than there are monsters.** The
> authoring investment goes into **places, details and verbs**, not plot.

## ⭐⭐⭐ Rooms are dense, and the density is the craft

| marker | files | reading |
|---|---|---|
| `day_long` | **16,609** | essentially **every** room uses the time-of-day description field |
| `set("descs", …)` | **8,450** | files mentioning the field — ⚠ *see the density section below; this over-counts* |
| `day_light` | 13,547 | per-room light level |
| `night_light` | 4,865 | …and a different one after dark |
| `night_long` | **1,851** | ⚠ only **~11%** write distinct night prose |
| `day_color` | 2,592 | per-room colour |
| `set_id_long` / `set_id_short` | 180 / 208 | identification-gated description |

⚠⚠ **An instrument note, because it nearly produced a false finding.**
The first pass measured `add_item` and found **158 files**, which would
have said EotL rooms are bare. `add_item` is not the idiom: details are
a **mapping of keyword-arrays to prose** —
`set("descs", ([ ({"dune","sand dune"}) : "…" ]))` — and the real count
is **8,450**. *Validate the instrument first.*

## ⛔⛔ Detail density — measured properly, 2026-10-01

The first pass said *"~52% of rooms carry examinable details"* from a
count of **files mentioning `descs`**. That over-counts twice: it
includes non-room files, and it includes rooms whose detail map is
**present and empty**. Parsed per room file, with the map's contents
actually inspected:

| | rooms | |
|---|---|---|
| **populated** detail map | **8,000** | **41%** — finished |
| **empty** detail map | **1,074** | the slot was opened and left blank |
| **no** detail map at all | **10,629** | **54%** — never considered |

> ⛔⛔⛔ **Only 41% of EotL's rooms have anything to examine**, and
> **1,074 rooms contain `set("descs", ([ ]))`** — considered, then
> abandoned.

⭐⭐⭐ **And it concentrates by cabal, which is the finding.** Populated
rate, areas of 100+ rooms:

| | rooms | populated |
|---|---|---|
| `cabaltv/africa2` | 145 | **99%** |
| `future/matrix` | 136 | **99%** |
| `magic/aydindril` | 423 | 89% |
| **`miscellany/gnomelands`** | 166 | **89%** |
| `kanori/room` | 914 | 75% |
| … | | |
| `startrek/enterprise` | 289 | 18% |
| `nargolia/narg_castle` | 147 | 21% |
| **`nargolia/culhaven`** | **560** | **8%** |
| `nargolia/piper` | 189 | 7% |
| `startrek/ds9` | 163 | 7% |
| `chaos/warrens` | 264 | 4% |
| `beer/room` | 241 | 1% |
| `spiffy/areas` · `cabaltv/ghostbusters` · `startrek/borg` | 257/122/116 | **0%** |

⚠⚠ **Culhaven is 560 rooms at 8%** — and it is the area with the best
design document in the corpus (`doc/city.doc`: a class-divided city, a
two-tier rumour economy, a guild hierarchy as consignment, a loan shark
with player-fillable bounty contracts). Nargolia overall is 8% / 7% /
21%: **the cabal with the most elaborate governance paperwork has the
emptiest rooms.** Gnomelands is 89%, and its README opens *"I knew
nothing about programming then, so from a software point of view most of
it was awful."*

> ⭐⭐⭐ **In this corpus, process volume and content density are
> inversely correlated.** Not necessarily causal — both are symptoms of
> where attention went — but it is a pointed finding for any project
> with a high documentation-to-content ratio.

## ⛔⛔⛔ A declaration the output falsifies

`future/startrek/DESCRIPTION`, the cabal's public self-description:

> *"**The majority of the descriptions on the Enterprise, especially on
> the Bridge, are stuffed full of detail.** Also, **most rooms**
> containing added descriptions of certain items listed in the long
> desc. This makes the Enterprise seem much more realistic."*

Measured: **enterprise 18% · ds9 7% · borg 0%.**

**Nobody lied.** The author believed it; nothing ever measured it; it
stood for thirty years. ⭐⭐ That is the single strongest argument for
*measuring output against declarations* — and for the remedy being a
**mirror, not a penalty**: *you declared density, here is your density.*

⭐⭐ **And `night_long` at 1,851 against `day_long` at 16,609 is a lesson
about affordances:** the system offered a night description for every
room, and authors wrote one for **one room in nine**. Give authors a
field and most leave it; the ones who fill it are making a point.

## The voice — one room, read in full

`zone/fantasy/kanori/to_do/test.c`, a desert room:

```c
inherit RoomPlusCode;
set("short","A Merciless Desert");
set("ansi_short", YEL + "A Merciless Desert");
set("day_long",
  "You struggle to stand in the middle of this seemingly infinite "
  "expanse of sand.  A large sand dune blocks your line of sight, "
  "forcing you to only guess what lies beyond.  The ground wavers "
  "from the sweltering heat.  Skeletal remains, beaten smooth by "
  "quickly blowing sand, lie scattered across the landscape.  Surely "
  "no life could live out here, could it?");
set("day_color", YEL);  set("day_light", SUNLIGHT);  set("night_light", 30);
set(OutsideP, 1);  set(DesertP, 1);
FINDO(DESERT "desert.c")->add_room(THISO, 3, 2);
set("descs",
  ([ ({ "dune", "sand dune" }) :
  "This is a large mound of sand.  A closer look, however, reveals a small "
  "hole in the dune held up by wooden pillars.  Perhaps this is some sort "
  "of mine shaft used by a smaller race."]));
extra_init() { add_action("enter", "enter"); }
```

⭐⭐⭐ **The style, from this one file:**

1. **Second person, present tense, physical.** *You struggle to stand.*
   Heat shimmer, bones smoothed by blowing sand.
2. ⭐⭐⭐ **It ends on a question to the reader** — *"Surely no life could
   live out here, could it?"* — and the detail does it too: *"**Perhaps**
   this is some sort of mine shaft used by a smaller race."*
   **Describe, then wonder.** The prose offers a hypothesis instead of
   stating a fact, twice in one room.
3. ⭐⭐ **The detail rewards the look with the way onward.** Examining the
   dune reveals the mine shaft. The density is not decoration; it is
   where the next thing is hidden.
4. **Colour and light are authored per room, per time of day** — and the
   *short name itself* carries a colour.
5. **The room registers itself into a coordinate overlay** —
   `desert.c->add_room(THISO, 3, 2)` — so a room graph and a grid coexist.
6. **The room adds its own verb** (`enter`), which 4,472 files do.

## ⭐⭐⭐ What this settles

> **EotL generates stories. It hosts none.** The arc comes from the
> player's trajectory through a dense, verb-rich, heavily-described
> place — never from authored plot. Fifty quests in forty-five thousand
> files is not an oversight at that scale; it is the design.

Which bears on the open question directly: *does our simulation generate
stories or host them?* The ancestor says **generate**, and says the
authoring effort belongs in **place density, examinable detail, and
bespoke verbs.**

⚠ **And that makes the quest-modeling slate a DEPARTURE, not a
continuation.** Possibly the right one — authored arc may be exactly the
thing we add that the ancestor lacked — but it should be a **decision**
rather than an assumption, and nobody has made it in writing.

## What this corpus can still be asked

- ⭐⭐ **`93`'s question, empirically.** *Can an author make something with
  the nameless quality, or does the substrate prevent them?* 45,000 files
  by many hands over decades is the only evidence available anywhere, and
  this census only sampled one room.
- **What the 48 quests actually do** — the exceptions are more
  interesting than the rule.
- **The 214 `MonsterAsk` files** — the entire interrogable-character
  corpus, and the closest ancestor to our dialogue trees.
- **`present/dementia` (1,740 files)** — the largest non-fantasy area,
  and the one most likely to show a different authorial register.
