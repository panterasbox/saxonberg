# Magic items — requirements

The build that makes **using a thing** a first-class way to act on the
world, alongside casting. Today the engine has exactly one trigger for
an effect — a caster spending mana — and no abstraction for a discrete
item that fires one. This build ships the trigger-agnostic effect spine,
the three item classes that hang off it (charged · focus · consumable),
the charge economy that keeps non-consumables from inflating, the
blessed/uncursed/cursed axis, and the spellbook/memory loop that gives
knowledge a market.

It is governed throughout by [arcane-science.md](../arcane-science.md):
an item is not a new physics, it is **stored labour** — a maker paid
earlier and the user spends it. Every quantity here is energy in
kilojoules, and the eight content-authoring rules in that document bind
this build's content as they bind spells.

Seeding slates: [magic-items-slate.md](../slates/builds/magic-items-slate.md)
(the BUC substrate, the catalog map, and the *Charge, decay, and the
durable-goods problem* section) ·
[discovery-slate.md](../slates/builds/discovery-slate.md) (distribution,
*a wand is stored labour*, rarity from the grid cell) ·
[ranged-slate.md](../slates/builds/ranged-slate.md) (thrown
effect-carriers) ·
[identification-slate.md](../slates/tails/identification-slate.md) (the
per-viewer class-memory substrate — **now in scope**, see D24–D29).

## Goals

Seven waves. Wave 1 is a precondition for everything after it and should
land first; waves 2–7 are independently shippable in the order given.

**Wave 1 — the trigger-agnostic effect spine.**

- An effect executes from an explicit **context** rather than from a
  bare `caster`, so the four jobs that parameter currently conflates
  (origin · subject · principal · source) can be supplied
  independently.
- Magical provenance distinguishes **who specified** an effect from
  **who fired** it.
- A spell's competence gate and cast time live on a **casting profile**,
  not on the spell itself, so a non-casting trigger can ignore them
  without pretending they don't exist.
- Traps and NPC powers can use the same spine (they are not built here,
  but nothing in the spine assumes a caster).

**Wave 2 — consumables.**

- A discrete item can be used, fire an effect, and consume itself,
  leaving its vessel behind.
- Potions are **liquids**, so dose, dilution, splitting, and spilling
  are real and free.
- Scrolls are single-use **foci** — they cost the reader's reserve.
- Metabolism keeps its existing front door: an ingested substance
  reaches body chemistry through the shipped `ingest` seam, whether it
  came from a mug or a flask.
- **`read` decomposes into perceive + decode**, and every written thing
  carries a **modality** (inked · embossed · both). Wave 6 consumes it
  for books.
- Use-verbs come from **capability mixins**, never from item
  declarations — and conferral never hides a verb from the parser.

**Wave 3 — charge, decay, and the item economy.**

- A charged item holds **energy in kilojoules** in a `Reserve`, spends
  it on use, and **self-discharges** on a reconcile-on-read schedule.
- The **item** is the endpoint of its own transfer, so recoil and waste
  heat land on the item rather than the user.
- A caster can **recharge** an item, moving energy from their reserve
  into its charge.
- Worn items draw continuously while active; a triggered item does not.
- Foci decay too, by pattern rot, on their own much slower schedule.
- **Mana recovery spends satiation and hydration**, closing a live
  first-law hole.

**Wave 4 — BUC and the condition/shadow line.**

- Blessed / uncursed / cursed is a **potency level on the item's own
  effect axis**, per the slate's settled model.
- A sustained effect records whether it is held by a **live host** or
  bought as a **fixed term**, and behaves accordingly.
- Condition application has a **veto layer**, so immunity and
  resistance are expressible.

**Wave 5 — identification.**

- Per-viewer memory of item *classes*, keyed by appearance, with
  appearance **derived** from the class and a rotating generation so the
  mechanic stays live in a shared world.
- **Descriptor banks** exist, one per class, deep enough to sustain
  rotation, and provably disjoint from the materials vocabulary.
- Players can **label** any item or container.
- Consumables glob; anything with continuous per-instance state does
  not; and merge behaviour leaks no hidden state.

**Wave 6 — spellbooks and memory.**

- Reading a spellbook mints a **known-of claim**; it never touches
  competence.
- A spell's specification **fades** when unpracticed, and the fade is
  felt as **rising cost**, never as failure.
- Studying is an **activity** whose duration reflects how far the
  specification has decayed.
- Books are physical: they have weight, they can be shelved, and a
  personal library is worth the trip to the public one that it saves.
- Books are **identified items** (wave 5), so what a book teaches is
  itself something you must learn.

**Wave 7 — distribution.**

- An item declares the two tag sets distribution needs, and rarity
  **derives** from the grid cell via the arcane price list rather than
  from an authored table.
- A **census** counts everything in circulation regardless of origin,
  and gates both injection channels.
- Deliberate placement is a **declared par on a resettable holder**;
  random placement is the weighted table.
- Thrown effect-carriers deliver through the shipped ranged seam.

## Non-goals

- **The effect roster.** Which effects to employ across the catalog is a
  later comprehensive pass the user has explicitly reserved. This build
  ships the substrate plus only enough content to prove each wave.
- **Distribution tuning.** The algorithm ships; the weights, spawn
  rates, and decay constants are *calibrate at launch* and are a
  follow-up. See D21.
- **Traps and NPC powers.** The spine serves them; neither is built
  here. Hazard already ships its own delivery.
- **Guns and the ranged build.** Wave 7 consumes the ranged seam for
  thrown carriers only. Kinetic charged items are gun-shaped (D6) and
  wait for [ranged-slate.md](../slates/builds/ranged-slate.md).
- **The materials content pack.** Expanding the material taxonomy to a
  full working set is its own piece of work (see D32) — parallel, not a
  blocker, but the descriptor banks cannot be authored blind against a
  vocabulary that is still moving.
- **True polymorph / body-swap** — deferred to
  `presence-hollowing-slate.md`. See D18.
- **Altars, consecration, and sanctity** — fixtures, and they belong
  with presence/hollowing and alignment.
- **Summoning and figurines** — `spawn-distribution-slate.md`.
- **Artifacts as a roster.** The *shape* (a named focus with provenance)
  falls out of chattel + chronicle + the focus class; naming and
  uniqueness are content, not this build.
- **The pedagogical identification verticals** — the identification
  slate's chemistry / biology / physics / geology worked examples are
  content for those subjects, not this build. This build ships the
  identification *substrate* and the magic-item consumers of it.
- **Wishes and luck** — cut and constrained respectively. See D19, D20.

## Surface decisions

### D1 — `caster` splits into an explicit effect context

`executeEffect(caster, …)` threads one parameter that is doing **four
different jobs**, verifiable in the current code: **origin** (the
reachability check compares `sceneOf(target)` against `sceneOf(caster)`),
**subject** (`target ?? caster` for self-effects), **principal**
(`appendHarmRow(caster, victim)`, `initiator: durableIdOf(caster)`), and
**source** (`resolveCast` spends the caster's mana).

When a person casts, all four are the same object, which is why one
parameter has sufficed. A wand pulls them apart: the **wand** is the
origin and the source, the **user** is the subject and the principal.

Effects therefore execute from a context carrying origin, actor,
source, and potency, replacing the bare `caster`.

**Potency is already a parameter** of `executeEffect`, computed upstream
and handed down — so the expensive half of this refactor is already
done, and an item can supply its maker's stored efficiency without the
effect layer changing at all.

This lands in wave 1 because every later consumer bakes in the
assumption otherwise, and it gets more expensive with each one.

### D2 — Provenance distinguishes specified-by from fired-by

`MagicProvenance` is `{verb, noun, spellId, caster}`, and `caster`
becomes ambiguous the moment the person who specified an effect and the
person who fired it differ. Dispel and arcane-sight key off the tag;
accountability keys off who acted.

The tag carries both. This is also what makes *who made this wand* a
readable fact, which is the whole quality signal for the item economy
(D7).

### D3 — `requiredBand` and `castSeconds` move to a casting profile

Of the shipped `Spell` fields, `targeting`, `effects`, `family`, and
`durationSeconds` are already trigger-neutral, and `cost` is neutral
once read as *energy required* (which the arcane science says it
literally is). Only **`requiredBand`** (a competence gate a wand
deliberately bypasses) and **`castSeconds`** (a wand is fast because its
specification is pre-formed) assume a caster.

They move onto a casting profile attached to the spell. A wand ignores
the profile rather than silently ignoring fields.

### D4 — Potions ride `Bulkable`; scrolls and wands are `Consumable`

The slate had `Consumable` as *orthogonal to* `Bulkable`. Composed
instead — for potions only — dose-response, dilution, splitting a flask,
and spilling all fall out of shipped machinery and are real
pharmacology rather than invented mechanics.

Effects scale with the dose consumed: **graded** effects scale in
magnitude (impulse) or duration (modifier); **threshold** effects do
nothing below their minimum. That maps onto the slate's existing
impulse/modifier split and onto real dose-response.

Scrolls and wands have no volume and stay `Consumable`, which keeps
that concept small and well-defined instead of making it a universal
wrapper.

### D5 — Three item classes, distinguished by what they supply

| Class | Supplies | Endpoint | Bounded by |
|---|---|---|---|
| **Charged** — wand, orb, wearable | energy **+** specification | the item | energy density |
| **Focus** — rod, lens, staff | specification only | the user | the user's reserve |
| **Consumable** — potion, scroll | one packaged act | varies | one use |

A charged item is a **battery**: a maker moved energy into it, it holds
that energy by ordinary means, and using it releases it. The magic was
in getting it there and in the specification — never in the storage. So
ordinary energy density applies and everything true of batteries is
true here.

A focus supplies the missing leg of Tarn's Rule, so foci come in **verb
and noun flavours**, and a focus that lifts the axis you are already
strong on is worthless.

### D6 — The item is the endpoint, so the reaction lands on the item

Momentum and waste heat land on whichever body is the endpoint, which
gives the classes opposite ergonomics. A focus that shoves recoils onto
**you**; a charged item's recoil lands on **the item**.

Consequences that are requirements rather than flavour:

- A 100 g wand delivering 200 J of kinetic energy recoils at ~1.7 km/s
  and destroys itself, so **kinetic charged items must be braced** —
  gun-shaped, with the recoil running through a stock into the ground.
  Handheld wands are not kinetic delivery devices.
- A charged cooling item absorbs the heat it pumps and can crack.
- A spark wand is **safer** than the equivalent cast, because the wand
  is in the circuit and the user is not.
- A wand's **position** is the origin of its effect, so it can be set
  down, handed over, mounted, or pushed through a gap. A wand pointed at
  a door is a trap.

### D7 — Charge is a `Reserve` that decays; bound the charge, not the shells

A depleted wand is a paperweight with a socket, so the **item count is
the wrong quantity to bound**. Charged capability is a flow and can be
capped honestly.

Throttling inflow alone cannot work — stock grows without bound at any
throttle. With decay, stock obeys `dS/dt = inflow − d·S` and settles at
`S* = inflow/d`, giving **two dials whose ratio is the answer**.

Leakage and use are different bounds: idle items rot slowly, used items
empty fast. The real ceiling on active capability is **caster-hours**,
which is self-balancing with population.

Therefore:

- **Recharging is a service** — a recurring business, and competence
  stays valuable when items are common.
- **You find shells and buy charge.** Wealth cannot corner the found
  channel, because what money buys is caster-labour, which is capped.
  This satisfies the discovery slate's found-vs-bought guard.
- **Shell inflation is harmless**, so distribution can stay generous.
- A wand carries its maker's **delivery efficiency**, fixed at
  manufacture, so a master-made wand delivers more per charge forever
  and a novice using one genuinely outperforms that novice casting.

### D8 — Wearables are charged, and always-on is standby power

Rings and amulets carry a charge and confer their mixin **only while
charged**. The augment/slot wiring is unchanged.

An always-on wearable draws continuously, so it flattens a charge in
days where a triggered item lasts months. **Always-on is the expensive
mode** — a real tactical choice that bites hardest on exactly the class
most prone to inflation, because people wear rings and stow wands.

### D9 — Foci perish too, by pattern rot

A specification-only focus has no energy to leak and looks immortal. It
is not: a binding is a state held away from equilibrium, and **a pattern
that does work cannot be at equilibrium**. It relaxes, on a much slower
schedule than charge.

The canon line is **magic perishes, matter doesn't** — Eternal steel
keeps its perfection because structure is thermodynamically stable
rather than maintained. The ruins hold perfect blades and faded rings.

Refreshing a focus uses the same `recharge` path as a charged item; what
differs is the cost basis (re-impressing a pattern, not filling a tank).

### D10 — Mana recovery spends satiation and hydration

Metabolism's keystone is that **endurance does not regenerate for
free** — the body rebuilds it by spending satiation and hydration,
rate-limited and posture-gated. Verified: the magic tree contains **no
reference to satiation or hydration anywhere**, so mana currently
refills from nothing.

That was defensible when mana was abstract. It is not now that
`arcane-science.md` prices recovery at ~300 W of metabolic work. **A
caster currently violates the first law by resting.**

The mana reserve becomes a second consumer of the existing coupled-
recovery keystone. The payoff is that **a mana potion needs no new
mechanism at all** — it is a concentrated carbohydrate (a full mid
reserve is ~7 g), it feeds satiation through the shipped `ingest` seam,
and coupled recovery does the rest. Absorption is gut-limited, so a
potion cannot beat resting; it removes the need to have eaten.

### D11 — Cursed, for a charged item, discharges into the holder

BUC ships as the slate settled it: a potency level on the item's own
effect axis, engine-owned ordering, `scale` and `pick` primitives, three
states, hidden until identified, cursed-sticks as a release gate.

Charged items sharpen the cursed state: not merely *the slot will not
release* but **stuck on you and discharging into you**.

### D12 — `sustainedBy` a live host vs `sustainedFor` a fixed term

A sustained effect is a binding and must be paid for continuously. A
charged host can sustain because standby draw meters the cost against
its reserve. A consumable pays once and is gone, so it can only buy a
**bounded term** of assertion, which then decays.

Both install the same sustained record and both re-materialize their
shadow from the persisted condition on load. The record names which it
is: a host-held effect is renewable while charged; a term-bought one is
not.

**This makes the guideline a derivation rather than a rule.** Nothing
forbids a shadow sourced from a potion — it simply cannot outlive the
term it paid for, which is why long-lived sustained effects are forged
as rings. Wands, being spells with a battery, inherit the casting
conventions.

The pull/push line is unchanged: **fact → Condition, realized by pull by
default; a shadow only where the affected behavior is owner-less**
(perceivability, presentation/recognition).

### D13 — A spellbook mints a claim, never a deed

Competence is **derive-on-read over (Discipline × Transcript), never
stored**, under derive-don't-track. A book therefore *cannot* grant
skill without writing evidence that was never earned.

Spellbooks reuse the shipped `RecipeKnowledge` ladder verbatim —
`unknown → known-of (a chronicle claim, on reading a source) → can-do`,
idempotent. Reading mints the claim; casting mints deeds; competence
derives from deeds only.

The ordinary outcome is the honest one: **you know a spell you cannot
cast**, because the band gate still bites. That is the practicum thesis
in one object — instruction is the manual, practice is the lab. It is
also the same **claim-vs-deed** axis the college uses for assessment
provenance, now doing work in a third place.

### D14 — A comprehension floor, below the casting floor

You cannot learn what you cannot parse. A spellbook carries a
comprehension floor on the same two grid axes, set **below** its casting
floor.

The gap between them is a **read-ahead window**: a band where you can
take a specification on board and not yet execute it, so practice has a
visible target. Books are not a shortcut past competence — they are
gated by it at a lower threshold, for a different reason.

**Reading above the floor does not fail — it produces a defective
specification the reader believes is correct.** A bad copy costs far
more mana than it should and behaves oddly. That is honest (half-
understanding is worse than none, precisely because you don't know
you're wrong), it is **legible** (the efficiency is visibly off, the
same signal fade uses), and it is **recoverable** (re-study once
competent replaces it cleanly).

It is also the same shape as the overreach paper — correct within what
you understood, wrong past it.

This is what gives the library teeth. Gorging on books above your level
is not free-but-useless; it fills your head with copies that cost you on
every cast until you fix them. It also makes a **trustworthy teacher**
valuable, since what they sell is *not getting a bad copy*.

### D15 — Memory fades as cost, never as failure

A held specification is a binding in the holder's own mind, so it decays
without renewal. **Competence never fades; specifications do** — the
claim decays, the deeds do not.

Fade shows up as **falling delivery efficiency**: a hazy spell costs
more mana for the same effect, and eventually is not worth casting. It
never fails outright. This is what makes memory *felt* — continuously,
in a number the player already watches — rather than felt once, at the
worst moment, as a gotcha.

Casting renews the pattern, so an actively used spell never fades. You
lose only what you do not use.

Amnesia effects take **claims, never deeds**: they can strip memorized
spells and cannot touch competence.

**Fade rate is a property of (spell × holder × history), never of the
book**, and varies on three axes, each with a real basis:

1. **Maturity** — each refresh lengthens the next interval (the spacing
   effect). This is the anti-treadmill mechanism: maintenance cost falls
   on new additions rather than on the whole repertoire, so a large
   mature library is nearly free.
2. **Competence in the relevant Disciplines** — expertise slows
   forgetting for *structured material in its own domain* (Chase &
   Simon; Gobet & Simon found only a small residual effect on
   unstructured material). So competence protects the spells in *its*
   cells, not everything the holder knows. Competence therefore pays
   twice, which makes **breadth expensive and depth cheap** — and items
   are the counterweight that buys breadth without the upkeep.
3. **Specification complexity** — more to hold, faster to lose.
4. **Interference** — similar specifications degrade each other, and
   similarity is exactly our case since spells in neighbouring grid
   cells are the most alike things a holder could carry. This is the
   **repertoire limiter**: there is no slot count and nothing forbids
   reading every book in the library, but the more you hold the hazier
   they all get, so you settle at the repertoire you can afford. A broad
   generalist is permanently mediocre across their whole list; a
   specialist's few are razor-sharp.

### D16 — Study is an activity; books are physical

Refreshing rides the engagement framework: it takes game time, is
interruptible, and competes with everything else. Duration follows the
**savings curve** — a nearly-sharp spell refreshes quickly, a badly
decayed one takes far longer — so the mechanic rewards regular light
maintenance over cramming.

**Book quality sets refresh speed, not fade rate.** Once a specification
is in a mind, the book that put it there has no say in how fast it
degrades; a well-written one only gets the reader back to sharp faster.
That is the teaching product, and it is legible.

Books are objects with weight and location:

- **Most spells are publicly known** and their books are available in
  libraries. Rarity lives in the *spell*, not the paper — a book of an
  unpublished technique is priceless; a book of firebolt is worth
  nothing.
- A public library is a **free refresh at the cost of travel**; a shelf
  at home is a **paid refresh at no travel**. The book's value is the
  commute it saves, which is location-dependent and therefore a real
  market.
- Shelves are **furniture**, so a personal library is a placeable owned
  thing.
- Books are **encumbrance-limited**, so the field question — how many
  spells can I keep sharp out here — is answered by the pack rather than
  by an invented slot count. Vancian preparation emerges instead of
  being imposed.
- Players can write books; a defective specification produces a failed
  cast and is self-defending, per the inquiry substrate.

### D17 — Thrown potions ride the ranged delivery seam

No new interface. The ranged mode delivers the carrier, the vessel
breaks as a real container (its material decides whether it does), and
the contents discharge as bulk. This is the same leg as the documented
ranged-integration seam.

Two properties this build owns:

- **Route-appropriateness.** A potion declares whether it acts orally,
  on contact, or as vapour. An ingestion-only potion is a wasted flask
  when thrown, which kills the throw-everything case without a rule.
- **Splash derives from volume**, not from an authored radius.

### D18 — Item polymorph is semblance, not transformation

`arcane-science.md` prices material transformation out by ~10⁶ (chemical
bonds in eV against nuclear binding in MeV), and reforming every bond in
a body is prohibitive. The slate's polymorph section is reconciled to
that: **item polymorph is a shadow on presentation and recognition** —
`Sense`, not `Transform` — which is exactly what the slate already lists
shadows as being for.

Actual body-swap is the movement of a presence between bodies, which is
`presence-hollowing-slate.md`'s reified inhabitant-relation, on an
unconfirmed noun. Deferred there.

This decision is written into both documents.

### D19 — Wishes are cut

There is no register for *an arbitrary object appears*. Under the
Registry Principle — magic may only address a domain the world already
keeps books on — a wish is unrepresentable, and it is precisely the
fudge layer the science exists to forbid. Cut explicitly rather than
quietly unbuilt.

### D20 — Luck stays global, via the celestial channel

Luck already exists globally as the discovery slate's celestial
regularity: a **real correlation with an honest mediator** — creatures
active at the full moon leave things at the full moon — that folk belief
misattributes to the sky. That is the astrology lesson and it costs
nothing from the impossible-thing budget.

No per-instance luck scalar. A local luck effect is admissible **only on
the same terms**: a real correlation, a non-magical mediator, and a
misattribution players can discover. A hidden per-character luck number
is forbidden — it is both a second exemption and a tally standing as a
verdict on worth.

### D21 — Distribution: two tag sets, derived rarity, deferred tuning

Per the discovery slate: an item declares **effect tags** (its grid
cell, verb·noun) and **material tags** (what it is made of). Effect tags
weigh **rarity** via the arcane price list — spawn weight is the inverse
of the labour stored in the item — and material tags weigh **place
affinity**. Multi-effect items take rarity from their most expensive
cell.

Both vocabularies are closed and already declared for other reasons, so
the authoring cost is annotation rather than authoring.

**Tuning is a follow-up.** Weights, spawn rates, decay constants, and
fade rates ship as AppSettings dials marked *calibrate at launch*; the
build delivers the algorithm and honest defaults, not balanced numbers.

### D22 — Shells are craftable as well as found

The charge economy only closes if makers can produce shells as well as
fill them; a maker economy that can only refill found objects is
half a market. Shell inflation is harmless (D7), so nothing is lost by
allowing it.

### D23 — **Capabilities** confer verbs; items don't

The universal-versus-conferred framing is a false choice. Repetition
only arises if *items* declare verbs. If the **capability mixin**
declares it, the verb is written once in core and every member gets it
free — a potion never says *"I grant quaff"*, it is `Bulkable` and
potable, and that is sufficient.

Surfacing stays contextual, so the affordance list remains a live signal
of what is actionable here. That is the discoverability win, and it
costs nothing because the affordance machinery already computes
reachability.

> **⚠ Conferral controls the affordance LIST, never the PARSER.**

If `drink` is unlisted because nothing here is drinkable, typing `drink`
must still answer *"there is nothing to drink"* — never *"unknown
command."* Hiding from a list is helpful; hiding from the parser teaches
players that verbs evaporate, which is worse than never listing them.

Under this rule the three verbs that looked different are one mechanism
with different populations: **`zap`** is conferred by *charged +
directed* (wands today; braced kinetic staves once ranged lands; mounted
emplacements after), **`quaff`** by *potable bulk*, **`read`** by
*bearing marks*. `zap` looks conferred and `quaff` looks universal only
because their capabilities have very different memberships.

**Content authors never declare a use-verb.** They compose a mixin and
the verb follows. `recharge` and `study` remain standalone verbs,
because they are diegetic acts rather than subcommands.

### D33 — `read` decomposes into perceive + decode, and written things carry a modality

`read` is not a flavour of `look`. Looking is one sense channel
resolving; reading is **perception plus symbolic decoding**, and the two
come apart in both directions — a sighted illiterate perceives and
cannot decode; a reader of embossed text decodes fine through a
different channel.

> **read = perceive(the marks) + decode(the script)**

So a written thing carries a **modality**: inked (visual), embossed
(tactile), or both. A cheap property, and what falls out of it is
mechanical rather than gestural:

- **A tactile book is readable in the dark** — a real advantage worth
  paying for on an expedition, not a courtesy.
- A character without functioning sight is not excluded from the
  spellbook economy, and the mechanic that includes them is the same one
  that makes dark-reading work.
- It composes with what is already shipped: `senses.md` owns the
  modality vocabulary and light already gates visual perception
  per-viewer. No new machinery.

**Literacy is out of scope for v1** — everyone reads the common script.
The decomposition leaves the seam in place, and the spellbook
comprehension floor (D14) is already a decoding gate in all but name, so
literacy would slot into `decode` without disturbing `perceive`.

Modality belongs in this build rather than a later one because it is a
property on **every written thing** and is expensive to retrofit once
scrolls, books, labels, and signage all exist without it.

### D24 — A scroll of identify writes a class into memory

It is a `sense` effect targeting an item whose result is a **write to
the viewer's belief store**, not a message. It does not examine
anything cleverly and it is not oracular: it is the **paid shortcut
past experiment** — the thing you buy instead of drinking the unknown
flask and finding out.

Identification is **per-viewer memory of item classes**, keyed by
appearance, per the identification slate. This build ships the
substrate and the magic-item consumers of it.

### D25 — No `identificationLevel` scalar; `knownAttributes` is the state

The slate's `identificationLevel: 0..1` is dropped. A stored percentage
of knowing is exactly the shape this codebase avoids — competence bands
derive, renown derives, nothing stores a fraction of a fact.

**`knownAttributes` is the state and any band derives from it.** You
know facts; how identified something is falls out of which facts you
hold.

### D26 — Appearance is derived, not stored

An item's appearance resolves on read from **(class, generation)**.
Nothing stores an appearance on the instance.

This is the decision that removes an entire subsystem. Because there is
only ever one live generation, the build needs **no withdrawal sweep**,
no generation on the signature, no two-live-generations transition, no
ownership veto, and no secondhand-market heirloom hazard. A stashed
potion re-renders on retrieval.

The accepted cost is the incongruity: a player's out-of-character memory
outruns their character's, so a flask they *know* is healing comes back
unlabelled. That is a normal roguelike situation and D28 gives the
player a fix.

A consequence: **all current-generation items of a class look
identical.** Per-instance visual variation is closed off deliberately.

### D27 — Turnover is a per-item transition window, staggered across classes

A hard changeover is visible and reads as a glitch. So an item's
appearance derives from its **stable position within a transition
window** (hashed from its instance id): before that point the old
descriptor, after it the new one.

Nothing flips at once. Each item changes at *its* moment across weeks,
and classes are staggered against each other, so there is never a day
the world visibly turns over. The shape it produces is one everyone
recognizes — **old and new stock coexisting on the shelf during a
changeover** — which makes it both gradual and explicable.

During the window a viewer may hold **two valid records for one class**
(blue *and* green are healing). That is honest, and it is a gentle
onramp: you learn the new descriptor while the old is still around.
Afterwards the old descriptor stops appearing and the record quietly
stops mattering — knowledge is never invalidated, only its
applicability fades.

**Interaction with globbing.** A stack is one Stuff with one instance
id, therefore **one** window position — so a merged stack flips as a
unit rather than flask by flask. That is the correct behaviour once
named: **a stack is a batch, and batches turn over as batches**, which
is how a real stock changeover works. Staggering happens *across*
stacks, and since most items in the world live in stacks that is ample.

Three consequences the planner must respect:

- **The appearance check belongs in `canMergeWith`, not in
  `globIdentityFields`.** Identity fields are `⊂ persistentFields` and
  appearance is *derived*, so it cannot be one. Identity stays **class +
  BUC-bucket** (both persistent); the veto seam compares rendered
  appearance.
- **The window is self-healing.** Once a stack passes its flip point,
  the merge-on-arrival ripple folds it into the already-flipped stack on
  next contact.
- Merging shifts an absorbed item's flip moment to the survivor's. This
  is invisible and confers nothing; it needs no guard.

### D28 — Records carry the generation they were learned in; players can label anything

The descriptor pool is finite, so a descriptor is eventually **reissued
meaning something else**. That is the one moment a stale record could
assert something false.

Each record is stamped with the generation it was learned in, and the
display hedges rather than lies:

| Record | Shows as |
|---|---|
| current generation | *a potion of healing* |
| **prior** generation | *a blue potion — you once knew blue to mean healing* |
| none | *a blue potion* |

One field, no sweep, and it only does work in the rare case.

Separately, **players can label any item or container.** Built as a
general annotation rather than a potions feature — it serves storage,
shops, and gifts too — and it means a careful player's stash survives a
rotation with their own names intact.

### D29 — Spellbooks are identified items, and that is the pacing

Interference (D15) limits what a reader can *hold*; it does nothing
about knowing which books are worth reading. If a shelf reads
*"Spellbook of Firebolt"*, there is no discovery left.

So books carry appearance and identity on the same axis as potions. An
unlabelled book is *a dog-eared book*, and reading an unidentified one
is **a gamble against your own comprehension floor** — with the bad copy
(D14) as the losing outcome, unchosen.

Which puts the library in the right place: **a library's product is the
catalog, not the books.** New stock does not cause a rush, it causes a
**cataloguing backlog**, and early access to uncatalogued material is
the risky and valuable thing. The pacing is a labour cost rather than a
rule.

### D30 — Authored stock counts; census-gate rather than allocation

D7's `S* = inflow/d` assumes **one** inflow. Deliberate placement is a
second, unmetered one, so an author placing twenty wands silently pushes
the world past target and the algorithm never notices.

**The census counts every item in circulation regardless of how it got
there**, and both the reset sweep and the random spawner consult
regional stock and decline to add when it is at target. Authored
placement does not *spend* anything — it simply **counts**, and the
random channel backs off on its own.

**No allocation, no budget, no new economy.** An allocation would be a
new resource needing an owner, a ledger, and administration, and the
corrective already exists: **decay**. An over-filled area becomes an
area full of dead shells, which D7 establishes are harmless. An author
who floods deliberately and repeatedly is a content-review problem,
which is where it belongs.

The census binds at **the scope the spawn decision is made** — regional,
not global. A global census would let one author's hoard starve the
world; global stock drives only the slow decay-side equilibrium.

*(Do not squat on `ParcelRecord.allowance` — it exists already and is
the inert Phase-1 compute-economy seam.)*

**Open item the planner must settle first:** does residency's cold-tail
eviction remove an item from **circulation** or only from **memory**? If
it destroys, a live count *is* the census and this is cheap. If it only
unloads, the census must reach into persistence and is a different
problem. That answer decides how the census is built.

### D31 — Both placement channels are supported, for every item class

Stated explicitly because it is currently implied. Content authors need
both, and neither is a special case of the other:

- **Deliberate placement** — a **declared par on a `ResettableMixin`
  holder**, which the reset sweep tops toward. This is the explicit
  channel for anything economy-bearing, and it is not new: retail's
  `Stock` already does exactly this (*"`reset()` tops each line back to
  par"*). Par is a **target**, so a taken item is replaced only when the
  holder is below par — which closes the infinite-faucet hole that a
  clone-time cascade would open.
- **Random draw** — the weighted table of D21.

**`populates:` is deliberately NOT the injection mechanism here.** It
stays what it is — a clone-time cascade for set dressing, bottles on a
back-bar — and its meaning is not redefined, because it has existing
non-magic consumers and because an event is the wrong shape for a
stock target.

Note the three things that wear the word *distribution* and are
distinct: `populates:` (deliberate, shipped), the spawn table (what a
random draw yields — `spawn-distribution-slate.md`), and the discovery
slate's stock model (how much is available — accumulation minus
withdrawal). Discovery states the split itself: **authors write the
table, the world computes the stock.** This build ships the table and
`populates:`; the stock model is its own build.

### D32 — Descriptor banks: two decorative axes, never material

Unidentified items need a pool of descriptors to draw from. These are
**name banks** — the same concept `name_banks` already ships for
char-gen, delivered the same way, as a content pack.

**Depth.** For a class with N item types you need N descriptors live,
**2N** during a transition window, and — to keep a descriptor retired
for K generations before reuse — roughly **N × (K + 1)**. At N = 20 and
**K = 3** that is ~80, which no single flat list of colours can supply
without descending into *pale blue* versus *light blue*.

So **every bank is the product of two orthogonal axes**: ten words on
each gives a hundred distinguishable descriptors from twenty authored
words, and each word stays meaningful. Scrolls are the free case —
arbitrary text, unbounded.

| Class | Axis A | Axis B |
|---|---|---|
| Potions | **colour** | clarity — *clear, cloudy, murky, effervescent, viscous, smoky* |
| Wands | ornament — *runed, banded, spiked, forked, knotted, twisted, notched, fluted, whorled, plain* | proportion — *long, short, slender, stubby, tapered, crooked, straight, heavy, thin, curved* |
| Rings | band form | marking |
| Amulets | shape | marking |
| Spellbooks | condition — *dog-eared, stained, mottled, faded, tattered, warped, worn* | cover marking |
| Scrolls | arbitrary text | — |

**One strict global rule: a colour word means a potion.** Not for
disambiguation — the noun already does that — but for rotation hygiene
and prose that reads cleanly. Other banks may share vocabulary across
classes, because the noun disambiguates.

**⚠ Descriptor axes must be decorative, never material.** Material is a
**closed curated set with real physical consequences**
(`response = f(mechanism, material, construction)`), so a descriptor
naming one is either a lie in the model or an unintended constraint on
manufacture — and the closed set is nowhere near deep enough to feed a
pool anyway.

The collision surface is wider than material *names*: `Material` also
carries **`keywords`** and **`appearance`**, and keywords drive the
parser's material resolution. So a collision is a **parser ambiguity
bug**, not a stylistic wobble — if *amber* is both a wand descriptor and
a material keyword, `look at amber` has two answers.

The invariant, therefore:

> descriptor banks ∩ (material **names** ∪ **keywords** ∪ **appearance**
> words) = ∅

**Enforced by a lint, CI-gating** — the same shape as
`check-boundary-exemptions.ts`, which exists precisely because two sets
must stay disjoint and the build is the right place to check it. A
runtime check would fail in front of a player; the CMS may warn while
authoring, but cannot guarantee, since packs install by other paths.

**The lint must run on material additions too**, not only descriptor
additions. Adding *amber* as a gemstone years later can retroactively
collide with a shipped descriptor, and that is the direction nobody
thinks to check.

Authoring trap to state explicitly in the bank content: the tempting
words are material claims in disguise — **gilded, vellum, leathery,
cloth, crystal, glassy, waxen, iron-bound**. Every one asserts a
substance.

**What this buys:** material stays true, fixed, and **orthogonal**. A
wand *is* brass, honestly and permanently — which tells you real things
(it conducts, it will not burn) and tells you **nothing** about which
spell it holds. An item then carries two independent readable facts
instead of one mystery label.

## Constraints

- **The eight content-authoring rules** in `arcane-science.md` bind this
  build's content. Costs are energy committed in kJ and must be
  derivable from the price list; effects author energy *delivered*,
  never outcomes; momentum is conserved; nothing ships that cannot be
  dimensionally analyzed.
- **No second exemption.** Any time an item appears to need physics
  beyond nonlocal energy transfer, that is a modelling error.
- **Derive-don't-track.** Competence stays derived; nothing in this
  build writes Transcript evidence a character did not earn.
- **No new Apis per concept.** Charge, spellbooks, and BUC are not new
  Api tiers — reads live on the owning object, orchestration lives on
  the existing feature Api, and the `XApi`↔`XLogic` split is preserved
  where an Api is touched.
- **Gated Api entry points derive the principal from execution
  context**, never from a parameter. The effect context of D1 is
  internal plumbing beneath that gate, not a way to pass an actor in
  from outside.
- **New mixins land in the `lib/<subsystem>/` that owns the concern.**
  If none fits, propose a subsystem folder — never `lib/mixins/`.
- **Reconcile-on-read** for every decaying quantity (charge, pattern,
  sharpness), following the husbandry/metabolism pattern, with the same
  stamp guards.
- **Soft recoverable entropy.** Nothing in the fade or decay surfaces
  may present as a cliff or a punishment; state must be legible and
  masterable.
- **Banding is presentation.** Player-facing surfaces speak bands and
  prose; raw kilojoules are not the player interface.
## Acceptance criteria

Grouped by wave. Concrete and checkable — this is what the finalize
phase reads against.

**Wave 1 — the effect spine**

1. `executeEffect` and its executors take an explicit context; no
   executor reads a bare `caster`. Tests cover an effect whose origin,
   actor, and source are three different objects.
2. Provenance records specified-by and fired-by separately; a test
   asserts a wand-fired effect names the user as actor and the maker as
   specifier, and that dispel keys on the tag while the accountability
   row names the actor.
3. A spell is usable through both the casting path and an item path from
   one authored definition, with no duplicated effect data.

**Wave 2 — consumables**

4. A potion is a `Bulkable` whose partial consumption produces a
   proportionally scaled graded effect and no threshold effect below its
   minimum; splitting, dilution, and spilling are covered.
5. A scroll costs the reader's reserve and is destroyed on use.
5a. A use-verb is declared once on its capability mixin and no item
    template declares one. A verb unlisted for lack of an affordance is
    still **parseable** and answers with a reason, never with
    *unknown command*.
5b. `read` resolves as perceive-then-decode. An **embossed** text is
    readable in darkness; an **inked** one is not. A test covers both
    modalities against the same reader and the same light level.

**Wave 3 — charge, decay, economy**

6. Charge is a `Reserve` that decays on read; a test asserts stock
   converges to `inflow/decay` rather than growing without bound.
7. A charged item absorbs its own recoil and waste heat; a test asserts
   a caster using a shove-focus is displaced and a caster using a braced
   charged item is not.
8. `recharge` moves energy from a caster's mana into an item's charge
   and is refused when the caster lacks it.
9. A worn always-on item depletes measurably faster than the same item
   used as a trigger.
10. **Mana recovery consumes satiation and hydration**; a starved caster
    does not refill. A test asserts recovery halts with an empty
    satiation pool.
11. A focus's pattern decays on its own slower schedule and is refreshed
    through the same `recharge` path.

**Wave 4 — BUC and conditions**

12. A cursed charged item cannot be removed and transfers heat to its
    wearer.
13. A sustained effect from a charged host is renewable while charged; a
    term-bought one expires and cannot be renewed. Both survive
    save/reload and re-materialize their shadow.
14. A condition can be vetoed at application, so an immunity conferred
    by a worn item refuses it.

**Wave 5 — identification**

15. Identification memory is per-viewer and keyed by appearance; a
    scroll of identify writes a class record and produces no
    message-only side effect. `knownAttributes` carries the state and no
    0–1 scalar is stored.
16. Appearance is **derived** — no appearance is persisted on an
    instance. An item stashed across a generation change re-renders on
    retrieval, and no withdrawal sweep is required for correctness.
17. Two items of the same class at different points in a transition
    window render with different descriptors; a viewer may hold valid
    records for both simultaneously.
18. A record learned in a prior generation displays as a hedge, never as
    an assertion, once its descriptor is reissued.
19. A player can label any item or container, and the label survives a
    generation change.
20. Consumables glob and anything with continuous per-instance state
    (charge, pattern decay) does not. `globIdentityFields` is class +
    BUC-bucket; the rendered-appearance comparison lives in
    `canMergeWith`.
21. Two unknown-BUC items merge regardless of their true state; BUC
    resolves on reveal and the revealed item splits into its bucket. A
    test asserts merge behaviour leaks no BUC information.
22. A labelled item does not auto-merge on arrival.
23. A stack flips appearance as a unit at its own window position, and
    folds into the already-flipped stack on next contact.
24. **`pnpm lint` fails** when a descriptor bank collides with any
    material name, keyword, or appearance word — and fails in both
    directions, so adding a *material* that collides with a shipped
    descriptor is caught too.
25. Each bank is deep enough for `N × (K + 1)` at the agreed K, and no
    descriptor axis names a material.

**Wave 6 — spellbooks and memory**

26. Reading a spellbook mints an idempotent known-of claim and writes no
    Transcript entry; a test asserts competence is unchanged.
27. A character below a book's comprehension floor forms a **defective
    specification**: casting it costs measurably more than the correct
    copy, and re-studying at sufficient competence replaces it.
28. An unidentified spellbook does not reveal what it teaches; a test
    asserts reading one below the comprehension floor yields the
    defective copy rather than a refusal.
29. A faded spell costs more mana and never fails for fading alone;
    casting restores sharpness; an amnesia effect removes claims and
    leaves competence intact.
30. Fade rate responds to maturity, to competence in the relevant
    Disciplines, to specification complexity, and to interference from
    similar specifications — and is unaffected by which book taught it.
31. Studying is an interruptible activity whose duration falls as
    sharpness rises.

**Wave 7 — distribution**

32. Item rarity derives from the grid cell via the price list; no
    authored rarity table exists in the codebase.
33. Both placement channels work for every item class: a **declared par
    on a resettable holder** places a specific item and is topped toward
    par rather than re-cloned, and the weighted table produces a random
    draw. `populates:` is unchanged and is not used as the injection
    path for economy-bearing items.
34. The census counts authored and random stock alike, and both channels
    decline to add when regional stock is at target. A test asserts
    authored placement suppresses random spawning in the same region and
    not globally.
35. A thrown potion delivers through the ranged seam, breaks according
    to its vessel's material, and spills; an ingestion-only potion
    produces no effect when thrown.

**Across the build**

36. `docs/subsystems/magic-items.md` exists and documents the three
    classes, the charge economy, the memory loop, the identification
    substrate, and the effect context.
37. `arcane-science.md` and `magic-items-slate.md` both record the
    polymorph resolution (D18); the slate's rings section records the
    charge revision (D8).
38. `pnpm lint` and the full suite pass; no new `no-restricted-syntax`
    exception is added.

## Cross-references

**Seeding slates** — [magic-items-slate.md](../slates/builds/magic-items-slate.md) ·
[discovery-slate.md](../slates/builds/discovery-slate.md) ·
[ranged-slate.md](../slates/builds/ranged-slate.md)

**Governing documents** — [arcane-science.md](../arcane-science.md) (the
postulate, the price list, the content rules) ·
[college-slate.md](../slates/builds/college-slate.md) (claim vs deed,
the comprehension/teaching relationship)

**Subsystem docs the build touches** — [magic.md](../subsystems/magic.md) ·
[advancement.md](../subsystems/advancement.md) ·
[chronicle.md](../subsystems/chronicle.md) ·
[metabolism.md](../subsystems/metabolism.md) ·
[reserve.md](../subsystems/reserve.md) ·
[bulk.md](../subsystems/bulk.md) ·
[augmentation.md](../subsystems/augmentation.md) ·
[crafting.md](../subsystems/crafting.md) ·
[activity.md](../subsystems/activity.md) ·
[encumbrance.md](../subsystems/encumbrance.md) ·
[furnishing.md](../subsystems/furnishing.md) ·
[accountability.md](../subsystems/accountability.md) ·
[perception.md](../subsystems/perception.md) ·
[belief.md](../subsystems/belief.md)

**Deferred to** — `presence-hollowing-slate.md` (body-swap) ·
`spawn-distribution-slate.md` (summoning, and the stock model's own
build) · `pharma-slate.md` (the consumable product line)
