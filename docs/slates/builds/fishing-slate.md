# Fishing slate — the stock on a reach, and what you do about it

> **Status: UNBUILT** — no fishing act, no aquatic species row, no
> fishery record exists. ⭐ **Rewritten 2026-09-18** after the pets build
> and a lens pass: three of the first draft's "genuinely new" primitives
> shipped under other names (the water composition → the water pack's
> `Watercourse`; the catch-distribution field → ranching's *record that is
> not an object*; the individual → `KeptAnimal`), and the underwater half
> became its own slate.
> **Left:** the fishery record on a reach (derived from habitat ×
> composition) · the aquatic species rows + habitat declarations · the
> acts (`cast` / the wait / the bite as the fish's decision / the landing
> contest / `set` + `lift` for traps and nets) · the catch's four fates ·
> the method ladder as tools with epochs · the fishery right + the
> covenant rows · the shore feature that cites a reach · the *Angling*
> Discipline · the stew pond (aquaculture) as a tail
> **Size:** a build — and [underwater](./underwater-slate.md) is a second one

**Sits on:** [watershed.md](../../subsystems/watershed.md) (the reach —
topology authored, flow derived, navigability derived, contamination as
a concentration; the `water-right` document kind and `navigation` as a
use) · [ranching.md](../../subsystems/ranching.md) (⭐ the record that is
not an object: the herdbook — *these head, this age structure, on this
ground* — from which an individual materializes when engaged; three
ROLES, not three classes) · [pets.md](../../subsystems/pets.md) (the kept
individual, the bond, the species dials, *the animal decides*) ·
[spoilage.md](../../subsystems/spoilage.md) (a caught fish is the v1
perishable) · [authored-vs-procedural](./authored-vs-procedural-slate.md)
(*author the biome, override the exception*; a species must ship with a
way to occur) · [hunting-slate](./hunting-slate.md) (the wild population,
the stalk — and the spear, wet or dry) · the land-use covenant (forestry's;
tools carry `epoch`) · [design-lenses.md](../../design-lenses.md).

**Supersedes the first draft's** liquid-warren spatial model (rivers are
authored reaches now, not budded graphs), its per-spot authored catch
tables (the stock derives), and its inline diving tier (→ the underwater
slate). Kept from it, condensed: the niche, the landing contest, the
method ladder, current & tide, the salt click.

---

## 1. The niche — the restful vertical

Mining is the body's gauntlet, farming is patience, **fishing is the
body's rest**: the low-barrier, opportunistic, contemplative income floor
— *panning grown up*, the thing the chat crowd does together on a dock.
Near-zero endurance; the wait is the point and the wait is never the fun.
**You cannot make the wait fun; you make the catch a genuine surprise
drawn from water you learn to read, and you put one small beat of skill
at the bite.** Where mining surrounds the act with risk and deduction,
fishing surrounds it with uncertainty and place-knowledge.

Fishing shares the deep with nobody: the risk ceiling is the underwater
slate's, and the act down there is hunting's (§ 5).

## 2. ⭐⭐ The three kinds of content on water

The user's frame, from forestry (*an authored wood is always a wood*):

| kind | on water | what the author writes |
|---|---|---|
| **authored static** | *"a trout stream runs past the mill"* — the water referred to in the abstract | a **`Fishable` feature in a land room that cites a reach** (`_reach: kestrel:falls`). No water rooms. The reach's record answers the cast. ⭐ **This is the bulk of fishing content and it is free** — the vertical version of *the unbuilt lots are prose, not nine empty rooms*. |
| **authored dynamic** | a pond you can stock, a canal you can pole along, a cove you can dive | the author writes the water **as rooms** — a surface, and if they want, a column beneath it — and the framework runs them. The underwater slate. |
| **procedural** | ⭐ **not rooms — the population.** *"Here's my body of water, put the appropriate fish in it for me."* | **nothing** — the stock derives (§ 3). `stocks:` is the override, and an override that is not visible in the prose is a lie about the room. |

Nobody generates water rooms. The open sea is **one abstract reach** — or
one room, if somebody wants a horizon to look at — and anything authored
beneath it cites it (§ 6).

"Not every body of water is navigable on the same terms" is therefore two
declarations, neither of them code: the **watershed derives** whether a
reach floats a boat (flow × width, seasonal — a dry August closes it), and
the **author declares** which regimes a body offers — `shore` only (the
abstract water), `+wade`, `+boat`, `+dive`. A stew pond is shore-only
forever; the Kestrel estuary offers all four.

## 3. ⭐⭐⭐ The stock is a record on a reach — and it derives

The fifth consumer of ranching's pattern (herdbook · hive · wild
population · forestry's stand · **the fishery**): *a record that is not an
object*, from which an individual materializes when engaged.

- A **species row declares its habitat** — temperature band, salinity,
  current preference, depth band, substrate, season, diet role (bait /
  predator / apex) — the way a species already declares `handlingRange`
  and `feedingStyle`.
- A **reach has a composition** the watershed already computes — flow,
  temperature (snowpack, season, the thermocline with depth), salinity
  (tide), clarity, contamination as a concentration with a kind.
- **The record is the fit of every species to that composition**, scaled
  by a carrying capacity, with an age/size structure and a stock level
  that **depletes under draw and recovers over game time**. Trout are in
  the Kestrel's cold upper reaches because they belong there.

⭐ **This is the pedagogy lens paying for itself**: the distribution is
derivable from principles because it is computed from them. A player who
learns *trout hold in cold oxygenated water at the current seam, feeding
at dawn* is right in the game because it is true in the world — the sims
(*Fishing Planet*, *Call of the Wild: The Angler*) prove people will learn
real ecology when the game is honest about it. The record is read through
the **shipped fog**: weather (the pre-storm bite), the celestial clock
(dawn/dusk, the tide's moving water), the season.

**The farm is the override with ownership.** A stocked pond is a `stocks:`
override on a reach you hold title to, and ranching's taps apply
unchanged (breeding still writes *served* only). ⚠ It is the rare case
and the less fun one — fish in a barrel is exactly the boring reward the
method ladder caps. Its honest value is the one monastic stew ponds had:
**reliability against the wild's variance** (Lenten fish on demand,
prestige). A tail, not the build.

**Depletion is the commons** (§ 7). A reach nobody owns is a common
fishery; the record's draw-vs-recovery dial is the policy.

## 4. Three roles, and the catch's four fates

Ranching's *three roles, not three classes*, in water:

| role | in water | substrate |
|---|---|---|
| **the stock** | the record on the reach | § 3 |
| **the individual** | the catch — materialized from the record when landed; a `Creature` with a `BodyPlan` (fillet · roe · oil · skin · bone · shell), a species, a size × quality `Grade` | the pets stack for what you keep; the vitals death seam for what you eat |
| **the product** | flesh (a stock in the ranching sense), roe, oil, shell, ink, chitin | crafting, the larder |

**The individual forces the first value choice** — and it is where lens 4
lives: **keep it · eat it · sell it · release it.**

- **Kept** — a fish in a bowl is a `KeptAnimal`, and the pet dials stretch
  honestly: koi genuinely surface for the hand that feeds them
  (`feedingStyle: [surface]`, `biddability: 0`, a low `handlingRange`); a
  goldfish never bonds. The bowl is a vessel of water; the fish is the
  containable that persists and pins. A garden pond on a Hinkley lot is
  the smallest aquaculture and the largest aquarium at once.
- **Eaten** — raw or spoiled fish is a toxin dose; `Freshness` spoils it
  fast (the v1 perishable); the grain build's composition carry means a
  fillet knows what it was.
- **Sold** — the fishmonger, a `Business`; conserved coin, no faucet.
- **Released** — it returns to the record. The legendary catch released
  is a deed the chronicle can hold (§ 8).

## 5. The acts — fishing angles and traps; hunting stalks and strikes

Drawn **by the act, not the medium**:

- **Angling** — `cast` at a feature that cites a reach; a durative
  engagement you chat through; ⭐ **the bite is the fish's decision** —
  the pets lesson applied: the animal appraises bait and presentation
  against its hunger and the water, never a roll of yours. Then the
  **landing contest** — kept from the first draft: a fighter's `reel`
  vs `give` against a strain limit and a tiring you can only read,
  deterministic per seed, firing only on a fish worth the beat; small
  fish auto-land; losing a big one is a story, not a punishment, and the
  current gives it a direction (the snag).
- **Trapping** — `set` a pot, weir or net; `lift` it later. Passive bulk
  draw from the record on a game-clock tick: the deployable substrate,
  no engagement, **no skill expression** — so it caps at the boring
  reward, and a net's non-selective draw is what raises the commons.
- ⚠ **Spearfishing is hunting.** Below the surface you *stalk and
  strike*, with concealment and the prey's perception — the hunting
  slate's act, whether the prey is a deer or a grouper. Fishing owns
  angling and trapping; hunting owns the spear, wet or dry. Which is why
  fishing v1 needs **no underwater room** to be complete, and the
  underwater build gets to be places-first.

Bait is a small supply chain (dig worms, a caught baitfish, the shop's
floor) and a stance knob on the fish's appraisal. Junk (the old boot) is
rare, a garnish.

## 6. ⭐⭐ Layers, and the reach as the bus

A water body has **layers** — the surface, the volume below, the bed —
and an author decides **per layer** whether it is abstract (prose and the
record) or concrete (rooms). Every combination is legitimate: an abstract
river with one concrete grotto beneath it; a concrete canal you pole with
nothing modelled below; Atlantis — concrete below, an abstract sea above.

The rule that makes them interface: **every concrete water room cites its
reach** (`_reach`, exactly as a room cites `_biomePath` or `_address`),
**and the reach is the bus.** Anything that happens *on a reach* is
delivered to whatever concrete rooms cite it, on whichever channel
actually crosses the layer:

| event on the abstract surface | what a concrete room below receives |
|---|---|
| a boat passes | a **shadow** crossing (visible, if there is light) and a **hull** overhead (audible — water carries sound) |
| a net is cast | the net arrives *in the water* — a hazard the diver can see, drawing from the same record the diver is hunting |
| a spill upstream | nothing announced — the room's water *is* the reach's water |
| a floater is dropped | **flotsam on the reach** — a small ledger, drifting on the current, materializing if a surface room ever exists there |
| a sinker is dropped from a boat | it lands in the concrete **bed** room that cites the reach — an anchor is the everyday case |

The reverse — a diver's bubbles at an abstract surface — reaches nobody,
and nothing is lost: reconcile-on-read. The diver and the angler compete
over **one stock**, which is what keeps the commons honest across layers.

## 7. Technology and law — tools carry epochs; the covenant reads them

Forestry decided the shape (its D16): **the tool carries its epoch** on
`ToolMixin`, and the first reader is the **land-use covenant** — the
per-parcel declaration of what may be run there. Fishing adds rows, not
mechanism:

- **the method ladder is a tool ladder** — hand · weir · rod (no reel) ·
  trap · net · *then* reel · fly · trawl — each a tool with an epoch, so
  *trades ship medieval* holds and later epochs arrive as tools;
- **the covenant on a reach** — *no nets above the falls*, *fly only on
  the Mere*, *no spear in the stew ponds* — the same predicate forestry is
  writing, reading a tool's epoch and kind;
- **the right already exists**: a fishery is a *use* on a reach the way
  `navigation` is — the `water-right` document kind, a quota riding the
  right — and the Resource Governor's lever is the record's
  recovery-vs-draw dial.

⭐ Fishing is the covenant's second customer before it has its first —
forestry, fishing and mining's extraction-rate office have no common pack
ancestor, which is the standing test for kernel substrate.

**Until the covenant lands, the water polices itself by running out** —
the wood's rule, wet.

## 8. Standing — who says you are a good angler

Nobody, as a number. The **chronicle** holds the landmark catch (and the
landmark release) as a deed; the **market** says what a fishmonger is
worth; a **curator's seat** — Animal Crossing's museum done as a role —
can confer standing on a collection. Never a fishing level.

## 9. Current & tide, the salt click, the larder — kept, condensed

- **Current is a field, tide is a clock, and in tidal water the current
  is the tide's derivative** — both derive-on-read off `CelestialApi`, no
  tick, zero new dice. Current shapes presentation (dead-drift down, the
  seam where fish hold), bite cadence (moving water feeds), the contest
  (the snag), and traversal (upstream is the haul back). Tide opens the
  flats at low water (hand-gather, the true floor) and closes them — the
  cutoff strands the careless, and it is entirely avoidable by reading
  the clock. Tide × salinity makes the estuary the richest water.
- **Salt + fish = the salt-cod economy** — catch → salt → keep → trade
  inland; fishing gives salt its flagship demand, salt gives fish its
  shelf life, and the deep mine eats salted provisions.
- **The larder** — clean/fillet → cook (Dave's Bar is the restaurant; *Dave
  the Diver* is the whole Saxonberg shape in one indie) → preserve.

## 10. Scope

**v1 = the record on a reach + the shore regime + the four fates.**
Authored-static everywhere (features citing reaches — the Terminus docks,
the moor pool, the Kestrel banks), the species rows with habitats, `cast`
+ the wait + the bite as the fish's decision + the landing contest, `set`
/ `lift` for one trap kind, one net (so the commons lesson is reachable),
clean and cook and salt, the fishmonger, the *Angling* Discipline, the pet
fish as the noun's first individual. **No boat, no dive, no sea.**

**Waves:** ⭐ **the named apex** — the sturgeon as an individual in the
record with a chronicle (who hooked him, who lost him; the fisher talks
about *him*; the one that got away is the same fish, older — the hook
nothing in the genre has; wanted by the user, not v1); aquaculture (the
stew pond — the override with ownership);
noun breadth (crustaceans, mollusks, cephalopods, eels, weed — data);
the boat regime (a reach materializes as a room when a boat is on it —
derived from the authored `Watercourse`, never budded); the fishery right
+ covenant rows when the covenant lands; commercial scale.
**Underwater is its own slate**, and hunting acts in it.

## 11. Open

1. **Where the record lives** — on the reach (the watershed's; natural
   for a commons) vs on the bordering ground (forestry's answer for the
   stand). Fish move; **lean reach** — but it commits the water pack to
   holding a population, which is more than holding a flow.
2. **Does the covenant build come first**, or does fishing ship policing
   itself by running out, as the wood does? Lean: run out first.
3. **The pet fish in v1** — two species rows and a bowl, the cheapest
   end-to-end proof that an individual materializes from a record and
   persists. Lean in.
4. **Numeric tuning** — bite cadence, recovery rates, strain curves —
   against a running game, never in a doc.

*(Retire when: the fishery record and the shore regime ship, and
fishing's tail is the boat and the stew pond.)*
