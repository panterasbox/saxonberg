# Load on use, round two — requirements

**Kind:** refactor/sweep
**Leads from:** kernel. First consumers are the content that already reads
these, shipping in this build: smell and taste over materials, sky and weather
over biomes, toxins and injuries over conditions, a locality's government and
clock over the address index, the still's cut, the vat's ripening, the laundry
wash, a garment's fabric and the dye bath.

The world still stands up nine bodies of reference data at boot that nobody
has asked for yet: materials, biomes, conditions, the address index, and the
five material-adjacent families (cleansers, maturation profiles, fraction
schedules, fabrics, dyestuffs). The scan sweep (MR !362) kept them booted
because something reads each one *synchronously*, with no moment to wait for a
load. The documents build (MR !560) built the machinery that removes that
excuse: a cited thing is loaded by the time whatever cites it exists, and a
read that finds it cold says so loudly instead of answering empty. This build
applies it to the last of them. Seeding slates:
[scan-sweep](../slates/builds/scan-sweep-slate.md) § What remains (the
catalogues still booted) and
[documents-path-identity](../slates/builds/documents-path-identity-slate.md)
(the five families). The reuse ledger for the plan is in the scan-sweep slate.

## What already exists

- **The recipe, shipped.** Ten metadata families became documents in !560
  (dirt, joints, forms, placements, topics, operations, pump mechanisms, help
  concepts, formations, aromas), each served by its own catalogue reached
  through its domain Api; four Idea families (spells, corporations and brands,
  governments, disciplines) stopped booting and load when something reaches
  them. Every Api declares what its reads stand on, and one routine readies it.
- **The test for which is which** — *Idea or document* —
  [document-store.md](../subsystems/document-store.md) § Idea or document.
  The owner's verdicts on the five families (2026-11-08) were *document*; they
  waited only for material decomposition, which has merged (!555).
- **The readers.** Materials are read everywhere a thing's matter matters
  (about three hundred places: mass and density, burning, cleaning, smell,
  armor, the bulk slots). Biomes are read by every sky, weather, breath and
  ground question. Conditions are read when a body is hurt, poisoned or
  examined. The address index answers *which locality is this place in* for
  government, the clock, lighting, banking and the grid.
- **Nothing a player does changes.** There is no verb, discipline or trade to
  add; the commands that exercise all nine already exist (`smell`, `taste`,
  `analyze`, `measure`, `look`, `wash`, `cut`, `dye`, `government`, `cast`,
  pouring from a still, the vat's ripening).
- **In flight:** the size build (build-1) derives a thing's volume from its
  material's density — more synchronous material reads, which this build must
  leave working. Controller liquidity (build-2) rewrites many controllers that
  read materials; whichever merges second carries the merge.

Therefore what is genuinely new here is **nothing a player can name** — it is
the same world, booted with nine fewer rosters, every one of them standing up
the first time content actually reaches it.

## Goals

- A fresh world boots without standing up the material, biome, condition,
  maturation-profile and fraction-schedule rosters or the address index; the
  root biome every chain falls back to stays.
- Each of the nine is there the moment anything reaches it — a thing made of a
  material, a place under a biome, a body taking a condition, a place asking
  its locality, a vat, a still, a wash, a garment, a dye bath — and the player
  sees exactly what they see today.
- Cleansers, maturation profiles, fraction schedules, fabrics and dyestuffs are
  documents named by their path, cited by path, and no longer findable by MQL
  as things.
- Materials, biomes and conditions stay Ideas — queryable, and a pack can still
  give one its own class — and load when reached.
- A pack that ships a new material, biome, condition, cleanser, profile,
  schedule, fabric or dyestuff needs no boot line for it to work.
- A read that reaches one of these before it has loaded fails loudly, naming
  what it wanted — never a quiet empty answer.
- The world reads the same after a restart.

## Non-goals

- **Deriving a locality from its address with no index** →
  [scan-sweep](../slates/builds/scan-sweep-slate.md) § Open questions; here
  the index is merely built on first use.
- **Where singleton-ness lives** (counters minted twice on a cold world) →
  [scan-sweep](../slates/builds/scan-sweep-slate.md) § What remains; its own
  build.
- **Other booted rosters** (the location graph registry, the party roster, the
  boot-kept businesses) → they boot for reasons other than a synchronous
  reader; they stay, deliberately.
- **The discipline-keys namespace** → recorded on the documents slate;
  untouched.
- **New materials, biomes or conditions** → nowhere, deliberately: this build
  moves no content's meaning.

## Placement

Kernel. All nine are kernel concepts read by kernel substrate; the one pack
family (Dyestuff, trade-dyeing) keeps its rows and its catalogue in its pack,
and its document kind is declared by the platform as every pack's kind is. A
second material, biome or dyestuff needs zero code — that is the point of the
build.

## Collisions

- **Every room** reads its biome and its floor's material; **every made
  thing** reads its material. The drive visits a fresh world's start, an
  outdoor room by day and by night, a workshop and a kitchen.
- **The infirmary ward** and anything that poisons (the apiary's sting, a
  toxic forage) read conditions.
- **The Veshko still**, the Delight creamery's cheese room and any wine or
  beer vat read fraction schedules and maturation profiles.
- **The bathhouse and the laundress** read cleansers; **the tailor and the
  mill** read fabrics; **the dyer** reads dyestuffs.
- **Every locality** (Terminus, Hearts Delight, Rejection, the Wilds) is
  answered by the address index.

## Surface decisions

### Materials, biomes and conditions stay Ideas
They are links in query chains (`…:material`, `here:biome`) and a pack may
give one its own class with its own behavior (an arcane material, a toxin with
its own progression). Lens 2 decided it: an author's bespoke material must not
break. They stop booting and load when reached.

### The five families become documents
Metadata nothing writes, nothing acts on, and no query reaches — the owner's
verdict of 2026-11-08. The vat's and the still's arithmetic moves to a value
the document parses into.

### The address index builds on first use
It is an index over every locality, so the first address question after boot
builds it; nothing at boot does. Replacing the index with derivation from the
address is out of scope (see Non-goals).

### The root biome stays booted
It is the fallback every place's biome chain ends at, cited by nothing; a
place with no biome must still have a sky.

### Cold means loud
A read that reaches any of the nine before it is loaded refuses, naming the
path — the rule !560 set. A player never sees a smell, a sky or a wound go
missing because a roster was not up.

## Lens pass

1. **Pedagogy** — no discipline touched; the derivable world is unchanged
   (density, heat, cleaning and ripening read the same numbers).
2. **Creative expression** — the ordinary case gets *easier*: a pack's new
   material or biome works with no boot line. The bespoke case (a material
   class of its own) survives because materials stay Ideas.
3. **Immersion / participation** — invisible by design; the risk is a cold
   read showing a gap in the fiction, which the loud-failure rule and the
   restart step guard.
4. **Values** — none.
5. **Continuity** — every epoch's materials and biomes load the same way; no
   capability is tied to boot order any more.
6. **Economy** — none produced or consumed; the boot gets cheaper.
7. **Governance** — none.

## The drive

Against a freshly dropped world. Each step: pace · how it is asserted.

### Blocking drive

0. Boot a fresh world; the boot log names none of the nine rosters (bar the
   root biome) as stood up at boot. *instant · staged*
1. Log in at the start; `look` reads the room and its floor (biome, light and
   floor material reached for the first time). *instant · player*
2. Walk to an outdoor place by day: `look` shows the sky; the weather reads.
   Move the clock to night and `look` again. *short · player (clock staged)*
3. `smell` and `taste` something whose material nothing has touched since
   boot: the smell and taste name it as they do today. *instant · player*
4. `analyze` a made good for its material and `measure` its mass. *instant ·
   player*
5. `government` in Hearts Delight and in Terminus: each names its government
   (the first address question builds the index). *instant · player*
6. Take a toxin (a sting or a poison) and `look` at yourself at the ward: the
   condition reads with its signs. *instant · player*
7. Draw from a running still through a cut: the fractions read by schedule as
   today. *instant · staged (the still charged)*
8. A vat staged part-way through its ripening (age set with wizard tools — the
   staged twin of soak step S1): `analyze` and `taste` read the profile's
   stage. *staged · staged*
9. `wash` a soiled garment with a soap at the bathhouse: the cleanser works.
   *instant · player*
10. `look` at a garment for its fabric at the tailor's or the mill.
    *instant · player*
11. `dye` a hank at the dyer's: the dyestuff takes. *instant · player*
12. Restart the world; repeat steps 1, 3, 5, 6 and 10 — each reads the same.
    *instant · player*

### Soak drive

- S1. A vat left to ripen over game weeks reaches its profile's next stage
  with no wizard help. *span · player*

## Acceptance criteria

- A fresh world boots without standing up materials, biomes (bar the root),
  conditions, maturation profiles, fraction schedules or the address index,
  and every step of the drive reads as written, before and after a restart.
- No player-visible read — a room, a sky, a smell, a taste, a wound, a
  government, a cut, a vat, a wash, a fabric, a dye — differs from master's on
  the same content.
- Cleansers, maturation profiles, fraction schedules, fabrics and dyestuffs
  are documents named by path; none can be found or targeted by MQL as a
  thing.
- A pack can ship a new member of any of the nine families with no boot line,
  and it works the first time content reaches it.
- Every citation of one of these in shipped content names a path a pack
  ships; a misspelled one is caught before merge.
- A read that reaches one of these unloaded fails naming the path; none
  answers empty.

## Cross-references

- Seeding slates: [scan-sweep](../slates/builds/scan-sweep-slate.md) ·
  [documents-path-identity](../slates/builds/documents-path-identity-slate.md)
- Subsystem docs: [document-store.md](../subsystems/document-store.md) ·
  [race.md](../subsystems/race.md) (materials) · [biome.md](../subsystems/biome.md) ·
  [harm.md](../subsystems/harm.md) (conditions) · [address.md](../subsystems/address.md) ·
  [maturation.md](../subsystems/maturation.md) ·
  [fractionation.md](../subsystems/fractionation.md) ·
  [cleanliness.md](../subsystems/cleanliness.md) ·
  [textiles.md](../subsystems/textiles.md) · [call-security.md](../subsystems/call-security.md)
  (Api readiness)
- In flight: size and carrying (build-1) · controller liquidity (build-2)
