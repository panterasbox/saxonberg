# Decomposition — requirements

**Kind:** feature
**Leads from:** kernel. First consumer: the world's own decayed things,
which today are decayed in prose only. That means the lost anchor at
Wharfside, the rusted plough, the mooring ring, the Rejection claims
office's hire tools, the estuary's rotted staging, and a new bog-found
sword in the Weeping Moor's turf bank. All of them ship in this build.

Things in this world can already wear, break and be mended. What they
cannot be is **decayed**: no author can say that a part of a thing is
rusted, rotten, moldy, faded or frost-spalled. Every decayed object in
the world today says so only in its description, and the model under the
words is pristine. A rusted anchor weighs and behaves like a new one, and
a "rotted" tool handle never gives way. This build makes authored decay
**true**: it is written per part, in the model's own terms, and it
behaves, reads, repairs and stays put. An author can also write a thing's
**history** ("fifty years in a peat bog") and let the physics work out
what survived. Seeded by
[decomposition-slate](../slates/engine/decomposition-slate.md) (designed
with the owner 2026-10-18; the reuse ledger for the plan is in its
§ 8).

⛔ **No live decay clock in this build** (owner, 2026-11-28). Nothing
decays while you are or aren't looking. A sword left in the rain stays as
it is, as it does on master today. Decay is **authored**, or derived
**once**, when the thing comes into being.

## What already exists

- **Wear, failure and repair, per part.** An assembled thing (a tool, a
  weapon, a chair) keeps a condition for each of its parts. Use wears the
  part that gives first; a part worn past the broken line *fails*, and a
  failed handle stops the tool working. `repair` mends worn parts up to
  the mender's skill, and `fit` replaces a failed part outright.
  `analyze condition` reads condition by competence: the word for the
  whole when untrained, and part by part at proficient.
- **`look` names failed parts** ("the haft is split"). It does not name a
  part that is worn but still holding.
- **Coats weather.** Paint, oil and limewash thin outdoors in the weather,
  and a building's bare fabric wears once its coat is gone. A good's body
  never wears from the weather. A test pins exactly that across a game
  year, and it stays.
- **Wet things are heavy.** A soaked thing weighs its dry mass plus the
  water its material holds, and paper and board go sodden and give way.
- **Decay that already runs on its own clock:** the corpse's postmortem
  stages, food's microbial load, dye fading in the sun, and maturation's
  deliberate decay (retting, bleaching, compost). All of them stay as
  they are.
- **`brush`** exists (cleaning) and so do `paint`, `dye`, `sharpen`,
  `fit`, `repair` and `salvage`.
- ⚠ **A plain good carries no condition at all.** The lost anchor is
  just a good, so it has nothing that could be worn, let alone rusted.
- **Content:** about a dozen rows describe rust, rot or weathering in
  prose (§ Collisions). There are no ruins, no barrows and no authored
  wrecks. A wreck today is only a ship that sank.
- **Builds in flight:** build-1 is on tropes (narrative), and build-2 on
  the `/location/` → `/place/` path rename (!673) with the template
  taxonomy passes after it. Neither touches decay. This build writes
  `/place/` paths throughout.

**Therefore what is genuinely new here is:** a decay state a part can
carry (a mechanism and a band); per-material susceptibility, meaning how
hard each mechanism attacks each material; a small set of named burial
and exposure environments that a history is written against; the
one-time derivation from history to state; `look` and a probe reading
that report it; `brush` with a wire brush taking rust off; and condition
on things that are a single piece. Everything else (failure, mending,
refitting, wet weight, reading by competence) is reused.

## Goals

- An author can write that **any thing**, including a one-piece thing
  like an anchor or a statue, is decayed **part by part**: *corrosion*
  (bloom · flaking · pitted · eaten through), worded by its metal (rust
  on iron, verdigris on copper and bronze, tarnish on silver); *rot*
  (soft · punky · rotted through); *mold* (spotted · furred); *fade*
  (faded · bleached); and *frost* (crazed · spalled · crumbled).
- **The decay behaves:**
  - a decayed part is that much closer to failing, so a rotten haft gives
    way under use through the same failure players already meet;
  - a part decayed to its last band is **gone or failed** (a grip rotted
    away, a blade eaten through);
  - rust **costs metal**: a pitted blade weighs less and is weaker, and
    no mending puts the metal back;
  - a thing authored waterlogged is wet and heavy.
- **The decay reads in words, never a number:**
  - `look` names a decayed part ("the haft has gone soft where it meets
    the head");
  - `analyze condition` reports it by competence, as for wear;
  - a **probe** reading, a blade pressed into wood, tells sound from
    punky, and a trained hand reads it better.
- **The decay repairs, by mechanism:**
  - rot is cut out and the part replaced (`fit`);
  - rust is taken off with **`brush` and a wire brush**, which leaves the
    metal pitted and lighter but stops the rust being there;
  - worn-but-sound parts mend as today (`repair`);
  - fade is re-dyed where `dye` already reaches.
- **History derives state.** An author writes where a thing has been and
  for how long, in one or more named environments. When the thing is
  created, each part's state is worked out **once** from its material's
  susceptibility, and the author's explicit state, where given, wins for
  that part. The same sword reads:
  - fifty years in **peat bog**: blade dark but sound, leather grip
    tanned dark and whole, wooden pommel-core preserved;
  - fifty years in **damp ground**: blade rusted to a wreck, grip rotted
    away;
  - fifty years in **dry shelter**: barely touched.
- **It stays put.** A decayed thing reads the same after a restart. A
  thing a player has repaired is never re-decayed from its history; the
  history runs once.
- The world's prose-decayed things are **decayed in fact**, and their
  descriptions no longer say what the state now says (one sentence, one
  place).

## Non-goals

- **The live exposure clock** (a thing left out in the rain rusts as
  time passes; a dropped tool rots in the river). It stays on
  [decomposition-slate](../slates/engine/decomposition-slate.md) § 1 for
  its first consumer, the wrecks of
  [underwater-slate](../slates/engine/underwater-slate.md) § 10. The
  year-long "a good out in the rain does not wear" test stays green.
- **Coatings slowing decay** (oil, tar, paint as sealant). This only
  matters once a clock runs, so it goes with the live clock to
  decomposition-slate § 3.
- **Organisms** (shipworm, woodworm, moths) go to decomposition-slate § 2.
- **Abrasion as a mechanism** (sand, current, foot traffic) goes to
  decomposition-slate § 2.
- **Frost derived from a history.** It needs freeze–thaw from the
  climate, so it waits for the live clock and
  [brickmaking-slate](../slates/trades/brickmaking-slate.md). Frost can
  still be authored as a state here.
- **Folding the corpse and food clocks into this model:** nowhere,
  deliberately. They work, and the slate records that they are the same
  shape.
- **Ruins, barrows and wrecks as places.** Authoring them is content
  work for whichever locality wants one. This build makes their contents
  possible:
  [stratigraphy-and-finds-slate](../slates/world/stratigraphy-and-finds-slate.md),
  [museum-slate](../slates/world/museum-slate.md).
- **The positive twin** (use and care making things better, patina) goes
  to [patina-design-pack](../slates/engine/patina-design-pack.md).
- **Salvage law and abandoned property** go to
  [sanitation-slate](../slates/trades/sanitation-slate.md) and
  [ships-and-harbors-slate](../slates/trades/ships-and-harbors-slate.md) § 7.

## Placement

- **Kernel (platform):** decay as a state of a part, the one-time
  derivation from history, the `look` wording, condition on one-piece
  things, and wire-brushing in `brush`. These sit on the shipped
  wear/repair substrate, and every pack's goods have parts.
- **The platform pack:** the probe reading row, and the named
  environments (peat bog · salt water · fresh-water silt · damp ground ·
  open air · dry shelter) as rows an author can extend. A realm with a
  salt marsh adds a row, not code.
- **base-library:** susceptibility on the material rows (the irons,
  steel, bronze, copper, silver, the woods by rot resistance, leather,
  wool, linen, cotton, paper, the stones and brick). It goes on the
  family parent rows where honest, with children overriding only what
  differs (template inheritance everywhere).
- **The content packs that own each converted row:** terminus
  (Wharfside, the estuary), platform (the mooring ring), trade-farming
  (the plough), rejection (the claims office), and world-seed (the bog
  sword in the turf bank). The wire brush is a tool row, stocked with the
  claims office's hire tools.
- ⭐ **Does a second instance need code?** No. A second ruin, wreck or
  barrow is rows: things with a history or a state, in a place.

## Collisions

- **The prose-decayed rows**, which this build makes true:
  - the lost anchor ("stock rusted to a crust", Wharfside water);
  - the mooring ring ("rusted");
  - the plough (rusted on one face);
  - the claims office's hire tools ("going rusty at the tips");
  - the estuary's rotted staging (reach) and its rails "rusted solid
    underneath" (lower towpath);
  - the bracket "rusted shut" (estuary mouth);
  - the stakes on the pass ("rusted where they do not go");
  - the curfew bell's "weathered oak frame";
  - the garden bed's "weathered boards";
  - the tarnished silver ring and wand bands;
  - the rotted-wood fill in the glowcap jar and fixture.

  ⭐ Each is either given its state, with its description trimmed so the
  state's words are not said twice, or, where the decay is part of a
  **place's** fabric (the staging, the rails, the bracket, the stakes),
  left as place prose. Place fabric is holding's shell, not a good. The
  plan lists which is which; the drive walks the goods.
- **The year-long Law 2 test** ("a durable good out in the rain does not
  wear") stays exactly as it is. This build adds no clock that could
  break it.
- **`brush`** already cleans. Wire-brushing is the same act with a
  different tool on a different deposit, so it is not a new verb.
- **`repair` and `fit`** meet decayed parts for the first time. A
  rotten part is a failed or failing part, which `fit` already handles
  first. Rust loss is not condition `repair` can restore.
- **Integrity** (cracks and flaws) is a different thing from decay, and
  both read together in `analyze condition`.
- **The Weeping Moor's turf bank** gains a found object. Turf cutting
  there is unchanged.

## Surface decisions

### What an authored decay state is
A per-part **mechanism + band**, from the closed list in Goals. It is
written on the thing's row, by part name for an assembled thing and on
the whole for a one-piece thing. Several mechanisms may sit on one part
(a moldy, faded tapestry). The band decides how near failure the part
is, and the last band is failure. *Chosen because the owner's framing is
"in the model's own terms": the band is the state, and the condition the
model already uses follows from it.*

### How a history is written
An ordered list of **stays**, each a named environment and a duration
(*"fifty years in peat bog, then two in dry shelter"*). The environments
are rows (§ Placement) that state their wetness, oxygen, salt, acidity
and sky. The derivation integrates each part's material susceptibility
over the stays **once, at creation**. An explicit state on a part wins
over its history. *Answers slate § 7 Q1; lens 2 chose it: the author
writes the story, the physics writes the state.*

### Which mechanisms a history can derive
Corrosion, rot, mold and fade derive. Frost is authorable but not derived
(Non-goals). *Answers slate § 7 Q2 at product level: frost and abrasion
are physical mechanisms, and only frost is in reach of this build.*

### One-piece things decay too
A thing with no parts (an anchor, a statue, a coin) carries condition
and decay on the whole. *Answers slate § 7 Q3: a monolith is an assembly
of one (repair's rule).*

### Rust removal is `brush` with a wire brush
One verb per act. Brushing rust off is brushing, with a harder tool. It
clears bloom and flaking, and it **cannot** undo pitting or restore lost
metal. A wire brush is a tool you can buy at the Rejection claims office.

### The probe
`analyze soundness`, holding a blade, presses into a wooden part. Every
reader learns sound or soft; a competent hand tells **punky** (rotten
inside, sound outside) from merely weathered. It uses the existing
reading ladder, with competence resolving detail.

### What "once" means
A history is derived when the thing is first created from its row. After
that the state is the thing's own: it persists, repairs and changes only
by acts. A repaired bog sword stays repaired across restarts.

## Lens pass

1. **Pedagogy.** Corrosion needs water and oxygen, and salt speeds it.
   Rot needs moisture past a threshold. Anoxic, acidic peat preserves
   iron and tans leather. Oak and bronze were chosen for a reason. All of
   it can be derived from the material rows and read with a probe;
   competence buys the finer reading (materials, appraisal).
2. **Expression.** ⭐ An author writes *"under salt water since the
   wreck"* and a ten-year wreck reads differently from a hundred-year one
   with no extra authoring. The ordinary case is a state on a row; the
   bespoke case is a new environment row. No code either way.
3. **Immersion and participation.** The rusted anchor is now rusted:
   lighter, weaker, brushable. The world's descriptions stop saying
   things the model does not know. Participation: the smith and the
   tinker restore finds, and the wire brush is a tool somebody sells.
4. **Values.** ⭐ Law 2 holds by construction: nothing a player owns
   decays, because there is no clock. Decay is what the world was
   authored with.
5. **Continuity.** The same state reads and repairs in every epoch:
   rust → galvanized steel (a material whose susceptibility is low),
   perished rubber, UV-brittle plastic. Each is a material row, not a
   mechanism.
6. **Economy.** Found and salvaged goods have a real condition and a
   real repair cost; wire brushes and replacement parts gain demand. The
   recurring upkeep economy (sealants) waits for the clock.
7. **Governance.** Nothing here judges a person. Who owns a find is
   salvage law's (Non-goals).

**Altitude.** *Invariant:* no decay clock runs on anything; held and
sheltered goods never change by themselves. *Grain:* every material's
susceptibility, every environment row, the bands' wording.

## The drive

Every step is `instant` or `staged` (wizard setup for the twins).
Nothing in this build runs on the clock, so there is **no soak drive**.

### Blocking drive

1. **The lost anchor reads rusted.** `instant` · `player`. Go to
   Wharfside's water, `look` at the anchor: the stock reads rusted
   (pitted) from its state, and its description no longer says it too.
   `analyze condition`: banded, by competence.
2. **Rust costs metal.** `instant` · `staged`. Weigh the authored
   anchor against a fresh clone of a sound one: the rusted one is
   lighter.
3. **A rotten haft gives way.** `instant` · `staged`. Wizard-clone a
   hatchet authored `rot: punky` on the haft. `look` names the soft haft.
   `analyze soundness` with a knife: a novice reads *soft*, a competent
   reader reads *punky*. Use the hatchet: the haft fails within the first
   uses at its work (the plan names the verb that wears a hatchet's
   haft), in the shipped failure words, and the hatchet stops working.
4. **Rot is cut out.** `instant` · `player`. `fit` a new haft: the
   hatchet reads sound and works.
5. **Rust comes off and the metal stays lost.** `instant` · `player`.
   At the Rejection claims office, buy a wire brush and a rusty hire
   tool. `brush` the tool with the wire brush: the bloom is gone, the
   pitting remains, and its weight does not come back. `brush` without
   a wire brush does not take rust off, and says so.
6. **History derives state.** `instant` · `player` then `staged`. Walk
   to the Weeping Moor's turf bank by day, `look`: the bog sword lies in
   the cut face. Take it, `look`: blade dark and sound, grip tanned dark
   and whole. Wizard-clone the same sword row twice with the history
   swapped: fifty years **damp ground** reads rusted to a wreck with the
   grip rotted away; fifty years **dry shelter** reads barely touched.
7. **A waterlogged thing is heavy and wet.** `instant` · `staged`.
   Clone a wooden chest authored with ten years in **fresh-water silt**:
   it reads soaked and weighs more than a dry one.
8. **One-piece things decay.** `instant` · `player`. `look` at the
   mooring ring and the tarnished silver ring: decay read on the whole.
9. **Restart.** `instant` · `staged`. Restart the world. The anchor,
   the repaired hatchet, the brushed tool and the bog sword read exactly
   as they did. The repaired bog sword is not re-decayed from its
   history.
10. **No clock.** `short` · `staged`. Jump a game day with the bog sword
    and a sound sword lying out on the stormy heath in the rain. Neither
    has changed.
11. **Light.** `instant` · `player`. The turf bank and Wharfside are
    read in their own daylight (step 6 and step 1). At night the sword in
    the cut face is not seen without a light.

### Soak drive

None. No step depends on the clock.

## Acceptance criteria

- A player looking at any of the converted goods (the anchor, the
  plough, the hire tools, the mooring ring, the tarnished ring, the
  wand bands) reads its decay part by part in words, and the description
  does not say it a second time.
- A rotten part on a tool fails under use, and `fit` restores the tool.
- A wire brush clears rust from a tool; the tool stays lighter and
  pitted; a brush that is not a wire brush does not clear rust.
- `analyze soundness` with a blade tells a punky haft from a sound one,
  and a novice reads less than a competent reader.
- The same sword row with three different histories reads three
  different states, and the bog version is the one found in the turf
  bank.
- A thing authored waterlogged is heavier than its dry twin and reads
  soaked.
- Every decayed and repaired thing reads the same after a restart, and
  no repaired thing returns to its authored decay.
- Nothing a player owns changes state across a day left out in the
  rain.

## Cross-references

- [decomposition-slate](../slates/engine/decomposition-slate.md): the
  design and § 8, the reuse ledger
- [assembly.md](../subsystems/assembly.md): parts, wear, failure, `fit`
- [crafting.md](../subsystems/crafting.md): `repair`
- [painting.md](../subsystems/painting.md): coats and weathering
  (unchanged)
- [materials-response.md](../subsystems/materials-response.md): corrosion
  on contact (an agent's attack, distinct from rust)
- [instrumentation.md](../subsystems/instrumentation.md): the reading
  ladder (`analyze soundness`)
- [weather.md](../subsystems/weather.md) § Wetness: wet weight
- [holding.md](../subsystems/holding.md): Law 2
- [stratigraphy-and-finds-slate](../slates/world/stratigraphy-and-finds-slate.md):
  the finds this makes possible
