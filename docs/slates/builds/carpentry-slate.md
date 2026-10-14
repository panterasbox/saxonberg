# Carpentry slate — what the woodworker decides, and what it costs

> **Status: PARTIAL** — the assembly build (MR !361) shipped the wood
> column's *mechanism* without ever designing the trade: `saw` (pit saw ·
> water sawmill, through-sawn · quartered), `carve` (one piece of wood and
> an edge → a part), the `Board` / `Blank` / `Timber` stock, seasoning,
> the grain as a stock form that rides a carve, and cupping that a glue
> line cannot forgive → [crafting.md](../../subsystems/crafting.md),
> plan D16 of `assembly-plan.md`.
> **Left:** **riving** (reading the billet, the instant arm, the mallet,
> an elm to meet) · carving as an **act** (time, effort, the hand) · whether
> `carve` is **knowledge-gated** like `make` · the **edge** (what carves,
> who makes it, who sells it) · **skill at the saw** and the **pit saw's
> second person** · the **lathe** as carve's next rung · **joinery**
> (the joints a joiner makes, and the furniture they enable) · the
> **demand** for a woodworker (the store's stocked hafts).
> **Size:** a build — `trade-carpentry` is its pack; forestry, smithing
> and shopkeeping are its neighbours.

Opened 2026-10-14 out of the assembly review. The owner's question:

> *"We never really designed carving or sawing. Now we have a couple new
> verbs that I don't really know what they model and what they ask of the
> player."*

The lens pass that followed found both verbs' help promising consequences
the world did not keep (riven-vs-sawn, cupping). Those two were made real
in !361 (D16). Everything below is what that pass found and did **not**
fix, because it is design, not a defect.

---

## 1. What exists today — and what each verb asks of a player

**`saw <log> [--quarter] [at <saw>]`** (`trade-carpentry`). An engaged,
durative act. It asks two real questions:

- **Where** — a pit saw (your hands are on it until the cut is through,
  30 kg of log an hour) or the water sawmill on the Delight (dog the log
  and leave; the rate is the river's, seasonal, zero with a dry race).
  ⭐ This is the column's best design: *the capital ladder buys TIME*,
  and it is rows, not classes.
- **How to open the log** — through-sawn (the most boards; the wide ones
  cup as they dry) or quartered (two boards in three; flat). Since D16
  that choice has a consequence: a glue line needs a flat face.

It asks **nothing of skill** — `saw` reads no Discipline; a novice and a
master sawyer cut the same boards at the same rate.

**`carve <part> [from <stock>] [with <edge>]`** (`trade-carpentry`). An
ordinary craft over every recipe that takes one piece of wood and a
`cutting` tool — rows, so a pack's spoon recipe is carvable the day it
installs. It asks:

- **which stock** — and since D16 that matters: riven beats sawn under a
  jar, and green work warps once it dries in place;
- **which edge** — any tool with a `cutting` capability.

It is **instant** (no duration, no exertion), and **not knowledge-gated**
(unlike `make`, which needs the can-make deed). Grade comes from the
standard craft resolve (the recipes are `easy`; Discipline `carpentry`).

---

## 2. The lens pass — the gaps, by lens

⭐ Lens 1 and 2 decide forks; the others say what a design must answer.

1. **Pedagogy.** The trade's derivable knowledge is *wood anatomy*:
   grain, rings, shrinkage, moisture. Shipped and enforced: green warps,
   riven beats sawn, flat-sawn cups. ⚠ Unexercised: *reading a log* —
   knots, shakes, heart and sap, which way it will move — which is the
   sawyer's whole judgment and is invisible today. The Discipline's own
   description says *"the judgment of which way the grain will go"* and
   nothing reads it.
2. **Creative expression.** The ordinary case needs no code (a carving is
   a row). The bespoke case has nowhere to go: one word in, the canonical
   part out. ⭐ Personalization is a derivative of supply-chain depth —
   the depth exists (fell → rive → carve → fit, species and grain carried)
   but nothing a carver does shapes the *result* beyond choosing stock.
3. **Immersion & participation.**
   - **3a.** Instant whittling fails the abstraction law (*legitimate
     while it still costs somebody the activity*): a haft costs nothing
     but a word. And the store's **clasp knife** — whose prose says it
     *"whittles a peg"* — is refused by `carve`, because it is a `Weapon`,
     not a `Tool`.
   - **3b.** ⭐ The pit saw is a **two-person** tool (top-sawyer and
     pit-man; the help says so) and is worked alone. That is a
     blacksmith-shaped hole the economy could have and does not.
4. **Values.** Little is undecidable here. One fork is: does a master's
   part *look* different from a novice's (a signature, as the assembly
   slate's joint signature proposes)?
5. **Continuity.** `saw` passes (pit saw → water mill → steam/electric
   mill are rows, one verb). `carve` has no next rung: the **lathe** (pole
   → treadle → powered) is what turns legs, dowels and handles, and the
   test is whether it answers `carve`.
6. **Economy.**
   - ⚠⚠ **Nobody in the realm sells a cutting tool.** The edges are the
     Rejection fuel yard's one billhook and the billhook/felling-axe
     recipes (forge heat). The carver's instrument is the scarcest thing
     in the column — accidental, not designed.
   - The **general store stocks pick hafts** (par 3), so a player
     woodworker competes with an inexhaustible shelf — the demand was not
     left for them.
   - Boards have buyers (shields, cask heads, frames); quartered boards
     have one (glued faces). Pegs, dowels, rails go into frames and
     casks. Furniture — the largest market for joinery — is deferred
     (assembly plan: *"the table and the wardrobe are deferred"*).
7. **Governance.** Not touched; the gauger (coopering) is the column's
   only seat.

---

## 3. The forks — with a recommendation each

### A. Carving as an act ⭐ (lens 3a decides)

Make `carve` engaged and durative, priced the way `saw` is: time ∝ the
wood removed (stock mass − part mass), divided by a rate the **edge**
sets (a drawknife and a spokeshave outpace a billhook) and the **hand**
modulates (competence). Exertion through the one `exert` event
([exertion.md](../../subsystems/exertion.md)). A barge-in leaves a
half-shaped piece — which is a real thing (a *rough-out*), not a lost one.

⚠ Do not simulate strokes. One engaged step per part; the abstraction is
legitimate because it now costs the activity.

### B. Is `carve` knowledge-gated? (lens 1 decides: **no**)

`make` gates a catalogue recipe on the can-make deed. `carve` should not:
it is the **bootstrap root** of the tool tree (a carved handle and a
forged blade make a froe; the froe rives the next blank), exactly as the
`hand` joint rung carries `competence: null` so anybody can wedge a haft.
A gate there is a lock with no key. Competence should change the
**grade and the time**, never whether the verb runs (*the refusal is the
progression UI* — and here there is nothing to refuse).

### C. The edge ⭐⭐ (lens 6 + lens 3a)

Three linked questions:

1. **A blade is a tool.** A `bladed` weapon (the clasp knife, a dagger)
   should answer `cutting` — either the capability derives from
   `constructionForm: bladed`, or the knife row is a `Tool`. Pick by the
   verb-collision ladder's first rung (*unify behind an interface*): the
   capability is a read off the form, not a second class.
2. **Who makes edges.** Smithing ships the forging; it should ship the
   woodworker's edges as rows: knife, drawknife, spokeshave, gouge,
   chisel, adze — each a `cutting` (or narrower) capability, each a rate
   for fork A.
3. **Who sells them.** The general store's tool shelf and the timber
   yard. ⚠ Every edge a shop stocks should be a smith's product someone
   could also make — demand first, then the shelf.

### D. Skill at the saw, and the second person ⭐⭐ (lens 3b)

- **Reading the log.** A log carries seeded defects (knots, shake,
  heartwood fraction) the way a deposit carries grade — **seeded, never
  drawn** ([uncertainty.md](../../uncertainty.md)). Competence resolves
  how much of that a sawyer *reads* (the instrumentation rule: competence
  resolves DETAIL, never ACCESS), and the sawyer's decision — where to
  open it, what to cut around — sets the yield and the grade of the
  boards. A novice saws through the shake; a master saws around it.
- **The pit saw takes two.** The top-sawyer guides; the pit-man pulls.
  Alone, the rate halves (or the saw will not cut — a fork); with a
  second person engaged, it runs at the row's figure, and the wage is
  real. This is a labour market the economy can grow without a script —
  the [employment](../../subsystems/employment.md) call already exists.

### E. The lathe — carve's next rung (lens 5)

A pole lathe is an instrument offering `turning`; recipes that are round
(dowel, leg, handle, bowl, spindle shaft) prefer it — faster, truer,
better grade — and still run with an edge alone. Then treadle, then a
powered lathe on the sawmill's shaft (the `Powered` / `PowerTake` read
the sawmill already makes). ⭐ The continuity test: **it answers
`carve`**, because the act is the same; the instrument is the rung.

### F. Joinery and furniture (lens 2 + lens 6)

The assembly substrate makes this mostly rows:

- **Joint rows** a joiner makes: mortise-and-tenon, dovetail, lap,
  dowelled, nailed — each with a competence band, an instrument (chisel,
  saw) and a reversibility. Pegged and glued ship already.
- **Furniture** as bills: the table, the stool, the chest, the
  wardrobe — the assembly plan deferred them because a `Fitting` claim
  (*every shelf wears*) was weak. The honest home is a narrow assembled
  class per family (the !361 rule: `AssembledMixin` only on a class that
  IS made of parts) — `Table`, not `Fitting`.
- The furnishing archetypes ([furnishing.md](../../subsystems/furnishing.md))
  are the demand: every room that wants a table is a customer.

### G. The store's stocked hafts (lens 6 + 3b)

A shop that restocks hafts from nowhere fills the woodworker-shaped hole
with a faucet. Fork: the store keeps a **par it must buy in** (from a
player or the yard), or stops stocking hafts once a woodworker trades in
the town (the settlement model's *a city is where the general store
fragments*). Recommend the first: the shelf stays, its supply becomes
somebody's job.

### H. Riving — the column's first act (lens 1)

`rive` (`trade-forestry`) splits a bole into billets and a billet into a
stave or a blank. Since plan D17 the **wood** decides whether it opens
(`cleavability`: elm refuses, a wandering grain gives fewer billets). What
is still undesigned:

- **Reading the billet.** The whole craft of riving is reading a log —
  straightness, knots, twist, which way a split will run — and every
  billet is identical today. The same seeded defects fork D gives the
  sawyer (knots, shake) should reach the river one step upstream: a
  knotty billet gives a short stave or none; competence resolves how much
  of that the river SEES before committing the froe (DETAIL, never
  ACCESS). One seed serves both verbs.
- **The billet arm is instant** (a stave in a word) — the abstraction law
  again, as fork A for carving.
- **The mallet.** The help and the scene say *froe and mallet*; only the
  froe is required. Either the mallet becomes a second instrument
  (`striking`, the smith's hammer would do) or the prose drops it.
- **Elm is unreachable.** No wood stands one, so the refusal D17 made
  real is a lesson no player can meet. A wood that authors elm (a damp
  slope, a hedgerow) is a row — and the wheelwright's hub, the one thing
  elm is FOR, would want it.

### I. Wood movement beyond cupping — deliberately small

Twist, bow and checking are real and **not worth modelling** beyond what
ships (seasoning already checks wood dried too hot). Expression is
inelastic: a player can act on *green vs seasoned*, *riven vs sawn*,
*flat vs cupped*. A fourth axis they cannot see or remedy is
over-simulation.

---

## 4. Collisions — who already lives here

- **Forestry** owns `fell` and `rive`; the billet and the bole are its.
  The riven blank is carpentry's row made by forestry's verb — keep it.
- **Coopering** rives its own staves and needs no boards; it owns the
  driver, croze and inshave (`shaving` is a narrower edge than `cutting`).
- **Smithing** forges blades and heads; fork C makes it the edge-maker.
- **Shopkeeping** owns the counters; fork G changes what the general
  store and the timber yard stock.
- **The Hearts' Delight sawmill** has a seat (`sawyer`, rota) and an NPC
  sawyer; fork D's pit-man is the second seat a pit saw would want —
  but the pit saw has no premises today (it is a portable row).
- **Discipline `carpentry`** exists and is read only by the craft resolve.

---

## 5. Open questions

1. Fork D — does a lone sawyer at a pit saw cut at half rate, or not at
   all? (Half rate keeps the bottom rung reachable alone; *not at all*
   makes the second person load-bearing.)
2. Fork C.1 — derive `cutting` from `constructionForm: bladed`, or
   re-row the clasp knife as a `Tool`? (The derivation touches every
   bladed weapon; the re-row touches one.)
3. Fork E — is turning a separate verb (`turn`) after all? The
   continuity test says no; check against the verb-collision ladder at
   requirements.
4. Fork F — which furniture first? The furnishing archetypes' fixture
   lists are the demand signal; the table is the obvious exemplar.

## Cross-references

- `docs/plans/assembly-plan.md` — D16 (the grain is real) and the drive
  record runs 24–27.
- [assembly-slate.md](./assembly-slate.md) — the joint as the epoch axis.
- [crafting.md](../../subsystems/crafting.md) · [forestry.md](../../subsystems/forestry.md) ·
  [instrumentation.md](../../subsystems/instrumentation.md) ·
  [exertion.md](../../subsystems/exertion.md) ·
  [employment.md](../../subsystems/employment.md) ·
  [furnishing.md](../../subsystems/furnishing.md)
