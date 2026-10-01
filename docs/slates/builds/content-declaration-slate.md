# Content declaration slate — what an author declares, and who enforces it

> **Status: UNBUILT, doctrine agreed.** The governance surface for
> content. ⭐⭐⭐ **Derive what you can. Declare what you can't. Review
> whether the declaration fits the form. Measure the output against the
> declaration.** The compute-declaration model, generalised from compute
> to all authored content.
> **Left:** the declaration schema itself (the field list) · the
> **covenant row** (per-locality restriction + its enforcement mode) ·
> `Epoch`'s first reader · **drift measurement** as a mirror · the
> aether-carrier ladder · ⭐ the **network schedule as a takeable prop**
> (§6.3 — the one squarely buildable item here) · night as a **shift
> change** rather than a description (§1) · the solvability check
> **Size:** several builds; the covenant row is the smallest useful one

**Captured 2026-10-01**, out of a long reading of the EotL corpus
([eotl-craft.md](../../eotl-craft.md),
[eotl-census.md](../../eotl-census.md)) that turned into a question about
what content authors are actually constrained *by*.

Related: [measurement.md](../../measurement.md) (the three layers, the
entrenchment tiers, the enforcement ladder) ·
[lenses/33-rules.md](../../lenses/33-rules.md) (*implementing a law must
not entrench it*; *a rule with no stated damage is advisory*) ·
[design-lenses.md](../../design-lenses.md) (lens 4 and lens 7) ·
[comms.md](../../subsystems/comms.md) ·
[instrumentation.md](../../subsystems/instrumentation.md) ·
[land-use-covenant-slate.md](./land-use-covenant-slate.md)

---

## 1. The loop

Four steps, and each belongs to a different actor:

| | who | example |
|---|---|---|
| **derive** | the engine | room count · detail density · materials and Disciplines touched · what it produces and consumes · exits crossing into other packs · NPC census and compute footprint |
| **declare** | the author | what it's *for* · who it's for · tone · deliberate departures from the grain · what is meant to be discoverable · what it's balanced against |
| **review** | peers | *does the declaration fit the form* |
| **measure** | the engine | **does the output still match the declaration** |

> ⭐⭐⭐ **The declaration is lens 4's surface at the content layer.** Lens 1
> governs what has a derivable right answer; lens 4 governs what has none
> and must be decided anyway. *"An NPC who teaches and judges things"* has
> no derivation, so it gets decided — by the author, in public, in a form
> peers can judge.

⚠ **A declared standard is never a gauge** (`measurement.md` B4). You do
not score points for declaring *medieval*.

### ⭐⭐ A declaration field is a standing admission of a modelling gap

Much of what looks declarative is derivable with better models — an
item's epoch follows from its materials, its recipe, and the laws that
recipe needs. **The human should be shown the derivation and asked only
about the residue**, and shown the consequence (*here is what will admit
this, here is what will bounce it*).

> **The declaration surface should shrink over time. Every field we learn
> to derive comes off the form. The form is a backlog, not a
> constitution.**

### ⛔⛔ The failure this exists to catch, with a worked example

`future/startrek/DESCRIPTION` declares *"the majority of the descriptions
on the Enterprise… are stuffed full of detail… **most rooms** containing
added descriptions."* Measured: **enterprise 18% · ds9 7% · borg 0%.**

**Nobody lied.** The author believed it, nothing ever measured it, and it
stood for thirty years. ⭐⭐ The remedy is a **mirror, not a penalty** —
*you declared density, here is your density* — which is the speed-camera
doctrine pointed at content. **Drift is information before it is an
offence.**

---

### ⛔⛔⛔ The opposite failure — deriving something that was never derivable

**Night is the worked example, and it is ours, not EotL's.**

EotL offered authors a `night_long` field — a whole second room
description — and **89% left it blank** (1,851 against `day_long`'s
16,609). We removed the field and derive the night from light, weather and
biome. ⚠ **That was first written up here as "the one place we are
unambiguously ahead by design," and that claim is withdrawn.**

> ⛔⛔⛔ **Deriving prose from physics will only ever produce physics.** You
> cannot derive *"a certain element comes out"* from a lux reading, because
> the element coming out is **a decision by a population**, not a property
> of the illumination.

The owner's argument, which is the correction: *"the light levels,
temperature, those things you can read off a meter are not the most
interesting parts of night time. It's that the world actually changes from
day to night **culturally and sociologically**. When the sun goes down
businesses close, people go home, a certain element comes out. If you've
ever watched a protest turn into a riot it always happens when the sun goes
down. **Why? People could just as easily riot during the day, they just
don't.**"*

**The mistake was a category move**: night got relocated from the narrative
layer to the sensor layer and the relocation was scored as an upgrade.
`night_long` was mostly unused, but it pointed at the **right layer** —
which is a better failure than pointing at the wrong one.

**Three layers, and the middle one is the one we have machinery for and use
for nothing:**

| | layer | where it lives |
|---|---|---|
| 1 | **physics** — light, temperature, weather, visibility | **derived.** We have this and it is right |
| 2 | ⭐⭐⭐ **population and commerce** | **derived from institutions, not from the sky** |
| 3 | ⭐⭐ **a prose delta** — one authored clause, never a second description | `prose.md`'s templating; no convention yet |

⭐⭐⭐ **Layer 2 is the answer.** *"Businesses close at night"* is a property
of **the business**, not the street — [employment.md](../../subsystems/employment.md)
has shifts and rosters, so **give a shift hours and the avenue derives
"the doors along it are shut and dark" for free, and the author wrote hours
rather than prose.** *"A certain element comes out"* is a **night cadence**
([behavior.md](../../subsystems/behavior.md)) moving NPCs into the street —
and room rendering already shows contents, so **a different night
population reads differently with no authored word.**

⭐⭐⭐ **And the danger is emergent rather than declared.**
[concealment.md](../../subsystems/concealment.md)'s bands are keyed to
light; [accountability.md](../../subsystems/accountability.md) derives
blame **from witnesses.** Fewer people plus worse visibility is a thinner
witness record — **which is why it actually happens after dark.** The
sociology falls out of the epistemics.

> **Night is not a description. It is a shift change.** Authored at the
> institution, where it is cheap and non-redundant — which also explains
> the 89%: the field asked for a **duplicate paragraph** when what changes
> is **who is there**.

⚠ **What none of that gets you is the cultural fact itself** — that *this*
town's nightfall means something particular, that the gown goes in and
something else comes out. That stays authored, and it belongs on the
**locality**, not the room: **one declaration about what nightfall means
here**, from which the shifts and cadences follow. ⭐ A declaration-form
field nobody had thought of.

## 2. Boundary conditions — the five shapes, and which two to use

A locality wants terms about what it will admit. There are only a few
shapes this can take and they cost wildly different amounts.

| shape | precedent | cost |
|---|---|---|
| **1. unilateral capability flags** | EotL's `NoTeleportInP`/`NoPKP`/`prevent_spawn`; Second Life parcel flags | cheap, composes poorly, says nothing about *whose* |
| **2. a scalar posture** | EVE security status — one number, and the **consequence** changes, not the access | very cheap, very legible, coarse |
| **3. declared class + closure rule** | Debian `main`/`contrib`/`non-free`; semver ranges; **license compatibility** (pairwise, directional, asymmetric) | cheap, transitive, **checkable, no negotiation** |
| **4. per-peer terms** | fediverse instance blocklists; Paradox embargoes | maximal expressiveness, **N²**, and the fediverse evidence is severe fragmentation |
| **5. per-act stance vector** | Dwarf Fortress civ ethics — a fixed act list, each graded | expressive without being per-peer; fixed width |

> ⭐⭐⭐ **Use 3 and 5. Avoid 4.** Per-peer terms are the shape the problem
> *sounds* like it needs, the one a single author cannot test, and the one
> that cost the fediverse most.

### ⭐⭐⭐ And you get bilateral behaviour out of unilateral declarations free

`culhaven/doc/city.doc`: the underground issues a **badge**; the Dwarven
Patrol kills anyone carrying one. **Neither party negotiated.** One
declared *"this token admits you"*, the other declared *"this token is
contraband"*, and the interesting relationship — *a key that is evidence
against you three streets away* — **emerged.**

---

## 3. Epoch — decisions

Current state: `lib/craft/Epoch.ts` is a five-word `const` tuple
(`prehistory · medieval · industrial · modern · future`), one field and
one guard on `ToolMixin`, **~10 content rows that all say `medieval`, and
no readers.** Free to change today; not in a year.

### 3.1 ⭐⭐ The covenant is the row. The vocabulary is not.

*Implementing a law must not entrench it* — moving epoch from a sentence
in a charter (Entesia's *"Anachronisms are not encouraged or allowed"*)
to a comparison in the engine silently promotes it from Tier C to Tier B.

> **Resolution: the five words stay a closed kernel tuple; the
> per-locality ceiling is a content row.** The polity amends what every
> parcel admits without ever touching the list.

### 3.2 ⭐⭐⭐ Three separate things, previously conflated

| | | |
|---|---|---|
| a locality's **epoch character** | what era it *is* | derivable from what's there |
| a declared **restriction** | what it admits | **optional — default permissive** |
| the **enforcement mode** | what happens when you don't | **chosen by the owner** |

A prehistoric locality does **not** have to ban anything.

### 3.3 ⭐⭐⭐ Enforcement is declared, and "advisory" is principled

The enforcement ladder ([enforcement-slate](./enforcement-slate.md), cited
by both `measurement.md` and lens 33), elected **per restriction** by the
title-holder:

```
wall     the engine refuses the act
camera   allowed, and recorded
witness  people and NPCs react
norm     stated, and nothing enforces it
```

This is consistent with *what can be enforced by code shall be*, because
that doctrine is about **where the capability sits** — the engine must be
*able* to wall it, so no human does a machine's job. Whether a given
owner elects to is a governance choice, like posting "no hunting" versus
building a fence.

And lens 33 already classifies the unenforced case: **a rule with no
stated damage is advisory.** Not a loophole — a correctly-typed rule.

> ⭐⭐⭐ **A preference is still declared, so it is still legible to the
> engine even when it blocks nothing.** "Norm" is the camera with the
> shutter open: an author who declares medieval and whose locality fills
> with chainsaws can be *shown that*, with no refusal ever firing.
> **Declaration without enforcement still produces evidence** — the
> cheapest useful version of this whole system.

### 3.4 ⭐⭐⭐ No `antiquity` — because the want is *culture*, not epoch

> Excalibur vs. a lightsaber is **ordinal** — one is strictly later.
> A gladius vs. a katana is **not** — neither is later; they are
> *elsewhere*.

A Greek locality is not earlier than a Norse one. Satisfying *"that does
not belong here"* with epoch bands breaks the total order that makes the
covenant a single `indexOf`. **If we need non-ordinal exclusion, it is a
second, unordered axis** — a tag set or the stance vector above.

⚠ **Live risk:** the first author who wants a classical locality will ask
for `antiquity` and mean culture.

### 3.5 No `atomic` / `information` split, yet

The aether, implants, hosted apps and livestreaming are information-era
technology and they are **platform, not content** — so `information`
would be a ceiling of "everything", and a split that puts the baseline
*above* the interesting band is backwards for a ceiling. `atomic` is the
half with content ahead of it (see `pharma-slate`,
`clinical-medicine-slate`), and can be added when something inhabits it.

### 3.6 ⭐⭐ The test for a band

**Not "does history have a name for it."** A band earns its place when
**two instruments a covenant must be able to separate fall either side of
it.** Today every stamped instrument is `medieval`, so every proposed
band is empty by construction.

⭐ **Build the first reader before touching the list** — the land-use
covenant, which `Epoch.ts` already names as its intended consumer — and
stamp a second trade at a different band. The metal chain is the obvious
candidate: **a bloomery and a blast furnace are not the same era.**

### 3.7 ⭐ If extensibility ever becomes real

Not a Catalogue. **Epoch would be our first *ordinal* vocabulary** —
`Placement`, `Reading`, `LandUse` and `Material` are all unordered, which
is why rows work for them. Epoch's whole utility is that **position is the
data**. The escape hatch is **sparse ordinals** (100, 200, 300) so
insertion does not renumber. Do not build it now.

---

## 4. ⛔⛔ Communication is never a regulated act

An implant is `modern`; an aether-radio is `industrial`. **A medieval
locality enforcing its ceiling would refuse both** — and has just made
everyone mute at distance, which the 2026-09-01 ruling forbids outright:

> *"aether has to work pretty much everywhere… **I don't want players
> getting cut off from their peers.**"* · *"Where fiction wants the
> deep/remote to feel wrong, make the channel **STRANGE, not SILENT**."*

`Epoch.ts` already contains the fix, and this is why *means not ends* is
load-bearing: *"a parcel that admits handsaws and refuses chainsaws asks
**the tool in your hand** which era it is from, and **the same `fell`** is
legal or not by what is bound to it."*

> **A covenant restricts the instrument bound to a regulated act. It never
> asks what you are carrying.** Felling, smelting, shooting may be
> regulated. Talking may not. That makes the covenant a building code
> rather than a customs post, and protects the peers rule structurally
> instead of by exception.

⭐ **What epoch *may* flavour is every other property of the channel** —
privacy, latency, length, cost, attribution — because **the rule forbids
silence, and a shared band makes you public, not unreachable.** That is
where morse belongs: **compression for a narrow crowded channel**, so the
mechanic explains the aesthetic rather than the reverse.

⚠ **One honesty condition.** Rendering a `dm` as a telegram with no
mechanical change is the Star Trek comm badge (*"there is no actual
response, but the effect it gives to the player is really cool"*). **One
real property must be true to earn the costume** — make it short, or
public, or costly. Then lens 64 and lens 3a agree instead of fighting.

---

## 5. ⭐⭐⭐ The aether-carrier ladder

**Decided:** emotes are ESP in every case, local or not — so that modality
need not be modelled per emote. The carrier may be an implant, an
intrinsic species trait, **or a portable device**, and **any carrier
reaches any other** (not matched-kind).

> **The modality never changes — it is `verbal-esp` in every epoch. Only
> the *coupling* changes.** That is why a needle reaches an implant.

Which satisfies the non-acoustic constraint structurally: `senses.md`
already separates `hearing` from `verbal-esp`, so the rule is **no
carrier may couple through the hearing channel** — anything air-pressure
based would have to.

### The axis is portability, not sophistication

```
prehistory   a PLACE     you go to it
medieval     an OBJECT   you carry it
industrial   a DEVICE    you operate it
modern       an ORGAN    it's in you
```

⭐ **A node is a place where the aether is reachable without an
instrument, and the history of the technology is people getting further
from one.** The university's node and a prehistoric site are the same
kind of thing at different scales — the lore **generalises rather than
changes**: the node is why we have *good* aether, not why we have aether.

### industrial — the aether-radio

Pre-transistor in sophistication, but **it does not use the EM band**; it
couples to the aether directly. Industrial technology invented by a
community that learned to leverage the field.

⭐⭐ **And it is a trade good** — a producer, a supply chain, an export,
and a second community whose advantage is **portability instead of
fidelity**, with something to sell everyone who cannot reach a node.

### medieval — the sympathetic needle

Two needles magnetised from the same lodestone, each lettered around the
rim. Turn yours; the far one turns with it.

⭐⭐⭐ **A real historical idea — and it did not work.** Sympathetic needles
circulated as a conceit in the 16th–17th centuries (Strada's 1617 poem;
Galileo mocks it in the *Dialogue*). **Not invented — vindicated.** In our
world the lodestone really does couple to something, and the people using
it cannot say why, which is *precisely* medieval-as-tradition: you make it
by following a recipe your guild inherited, it works, and nobody can tell
you the law.

⭐ It also falls out of shipped systems — lodestone is mined, the needle
is smithed, and pairing happens once at manufacture. **You do not dial
anyone; you own one end of a conversation.** A needle is a relationship
you can hold, lose, steal or inherit.

Alchemy sits beneath it as the **consumable** tier — a prepared salt that
opens the sense for a while, which gives the price list something to
price and the black market something to sell.

### prehistory — standing stones

Not seismic: ⚠ ground vibration is still compression and competes with
sound the same way air does. Instead, **the aether is reachable without an
instrument where the rock is right**, and the community's whole
relationship with it is knowing where those places are and aligning
stones to them. The knowledge **is the site**, not a technique — exactly
the epoch's epistemology.

> ⭐⭐⭐ **A prehistoric comms node is a landmark.** Ownable, walkable-to,
> waited at, contested, buried, built over. Every other epoch's carrier is
> an item in a pack; this one is a **destination**, and a reason for a
> meeting place to exist.

Celestial alignment is the mechanism for *why a site works*, which hands
`CelestialApi` a real reader. ⚠ But a site that only works at certain
times is a gate — better as **fidelity varying with alignment** than
on/off. *Detail, not access*, one more time.

---

## 6. ⭐⭐⭐ Getting players to new content — the publishing politics

**EotL's hub problem, in the owner's words:** Eternal City was the default
start location and most players never changed it, so a wizard wanted their
area attached to the hub. There are only so many spokes. After that you
either teleport the player or attach somewhere else off the hub — and
*"most wizards want their areas as accessible as possible, especially when
they're first published."*

> ⚠ *"It's actually a little bit of a poison pill. I feel like new content
> should be more organic and if that means discovery takes a while in the
> general player base that's the cost of admission. **But that doesn't
> really work** — what would happen here is committees would start
> negotiating with each other for inter-zone connections between their
> content, and the popular content committees have leverage. **Maybe all
> this is a feature not a bug; our game is after all inherently very
> political.**"*

**Publishing new content is a workflow we are establishing by design, so
this needs its own conversation.** What is decided already:

### 6.1 ⛔⛔ No portable teleporters

An object you carry that teleports you to a location: **(1)** breaks
immersion, **(2)** doubles as an **escape vector when in peril**, and
**(3)** cheapens what the TPA offers. **Teleporting happens between fixed
locations.** The one exception is **spells**, which travel with you by
design — and the kernel already forks that way (*free-in-your-extent and
the anchored spell are kernel forks*; see
[fasttravel.md](../../subsystems/fasttravel.md)).

⭐ This is the historical reason the TPA exists at all: old Eternal City
accumulated dozens of fixed teleport objects plus portable ones that crept
in, and the TPA was designed as the **general solution to entry objects for
new content.**

### 6.2 ⭐⭐⭐ Discovery and authorisation are two problems, not one

The TPA's apparent bootstrap — *you must reach a node by normal locomotion
and scan to register before you can teleport there* — reads as a
chicken-and-egg only if the two are merged. EotL solved them separately:

| | mechanism | requires locomotion |
|---|---|---|
| **discovery** | a **carried document** — free, weightless, the whole network | **no** |
| **authorisation** | scan your card at the **arrival** console | **yes, always** |

> **And the second one is correct.** The first trip to anywhere is supposed
> to be a journey. **The schedule is what makes you want to make it.**
>
> ⚠ Note this forecloses a pre-authorising "ticket": our clearance is
> **identity-bound by design** (*"the card is an instrument, not a
> passport… confers no clearance they didn't already hold on their own
> identity"*), which is right — otherwise travel access is lootable. If a
> pre-authorisation is ever wanted, it must be **a grant written onto an
> identity by an authority** — named, recorded, revocable — not a bearer
> token.

### 6.3 ⭐⭐⭐ The gap: a network schedule, as a takeable thing

We have a **departures board** (`renderDepartures`: this node's routes,
viewer-aware, fares, now-boarding, "not yet registered"). We have the
principle — ***a timetable is public; a ticket is not***. **We do not have
the artifact.**

EotL's `zone/null/toys/tpa/schedule.c` is a **takeable pamphlet**
(`gettable`, weight 20, value 10) with two modes:

- **`schedule`** — an **origin-destination fare matrix**: departure
  stations as rows, arrival stations as two-letter columns, the price in
  each cell, `--` where no route exists, under a legend mapping codes to
  names. ⭐⭐ **It reflows to the reader's terminal width**
  (`perpage = (width - dwidth - 2) / 3`), paginating the columns.
- **`schedule <station>`** — that station's detail: **its own room
  description** (`ROOMDAEMON->format_long(room->query("day_long"))`), every
  fare from it, and its timetable — normalised so a cyclic schedule reads
  as a day (wraps `2400`→`0`, prepends the previous day's tail when the
  first entry is not midnight).

⭐ `fix_prices` re-reads every fare through `TPAServer->get_real_price()`,
so the pamphlet shows the **true** price after the arrival station's
reserve floor — **a departure console cannot lie to it.**

⭐⭐ And `drop()` → *"A gust of wind picks up the schedule and blows it
away."* then destructs. **Free, takeable, disposable, unhoardable, and the
world never fills with litter.**

> ⭐⭐⭐ **You learn that a place exists, what it costs, what it looks like
> when you arrive, and when the console swings to it — before you have ever
> been.** That is the discovery half, solved by a prop.

**Everything it needs already exists** on our side: routes, fares,
`departures` timetables, `boardLabel`, `advanceMode`. **Left:** the
network-wide read (today's board is node-local), the fare matrix
rendering, per-station detail including the destination's own description,
and the disposable-prop lifecycle.

### 6.4 ⭐⭐⭐ And the schedule is the adoption incentive the TPA never had

EotL's TPA shipped **20 station objects, ~16 destinations** — the owner's
recollection of *"a dozen or two at the most"* was exact — against dozens
of bespoke entry objects. `tpa.doc` says why: *"that station should be
added to **an array of autoloaded stations in the TPA server**… Another
object, such as a room, could theoretically be responsible for loading the
console, but then **the station would be offline until the room was loaded
by a wandering mortal.**"*

> ⛔⛔ **Joining the network cost a kernel list edit. An entry object cost
> nothing.** The general solution was more expensive to adopt than the thing
> it replaced, and it arrived late on top of that.
>
> ⭐⭐⭐ **But an entry object buys traffic from one room; a station buys a
> line in every schedule in the game**, permanently, in everyone's pocket.
> **The pamphlet was the carrot and `TPAStations` was the stick.** Our pack
> doctrine already bans the stick (*a pack must never need a kernel list
> edit*), so the warm-roster problem is ours to solve — and **we need the
> carrot, or station adoption loses to whatever the cheap alternative turns
> out to be.**

## Open questions

1. ⭐⭐⭐ **What is on the declaration form?** First guess at the
   non-derivable list: what it's for (the Discipline claim) · who it's for
   (difficulty intent) · tone and register · what is meant to be
   discoverable vs hidden · deliberate departures from the grain, with the
   reason · what it is balanced against. ⭐ And possibly **expected
   lifespan** — *once-or-twice* is a legitimate answer (Gnomelands is one)
   but only if the author says so.
2. **What does a sender learn when a recipient has no carrier?** Nothing
   is the comm-badge lie; per-recipient leaks who carries what; ⭐
   *only when nobody received it* is cheap, honest, and diegetic.
3. ⚠ **Char-gen and the ESP carrier.** `comms.md` names *"pre-augmentation"*
   as a real state — Vocal without Aether. Under the decided fiction such a
   character cannot emote at all. Probably fine if everyone leaves char-gen
   with one; it is the one sharp edge in the simplification.
4. ⭐⭐ **Variable enforcement needs the terms visible to players**, or two
   adjacent localities have different rules and no way to tell — which
   fails *predictable and legible*. **EotL's answer is a sign at the
   gate**: the brass plaque, the Riddler's disclaimer, the mine's
   notification board, the Resort's visa. The governance surface posted in
   fiction, in the owner's own voice — content instead of UI.
5. **The solvability check** — *is the information needed to complete this
   obtainable inside it?* Morpheus asked volunteers for it in 1999 because
   no tool existed; it is the difference between Riddler's Quest and the
   Snipe Hunt, and we do not have it either.
6. ⭐⭐⭐ **What does publishing new content look like, politically?** §6 has
   the decisions and not the workflow. The owner's own framing is that
   committees will negotiate inter-zone connections and **the popular
   committees have leverage** — and that this may be *"a feature not a
   bug."* The question is whether placement is a **grant** (somebody with
   standing decides), a **market** (connections are traded), or a
   **commons** (anyone may join the network and the schedule does the
   rest). ⭐ §6.4 argues the third is cheapest *if* joining costs nothing,
   which is the opposite of how EotL priced it.
7. ⭐⭐ **Does a locality declare what nightfall means there?** §1 argues
   layers 1 and 2 derive and only the cultural fact is authored. If so it
   is a form field — and the first one discovered by finding the
   derive/declare line drawn in the *wrong* place rather than the right
   one.
