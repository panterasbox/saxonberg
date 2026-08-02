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
effect-carriers).

## Goals

Six waves. Wave 1 is a precondition for everything after it and should
land first; waves 2–6 are independently shippable in the order given.

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

**Wave 5 — spellbooks and memory.**

- Reading a spellbook mints a **known-of claim**; it never touches
  competence.
- A spell's specification **fades** when unpracticed, and the fade is
  felt as **rising cost**, never as failure.
- Studying is an **activity** whose duration reflects how far the
  specification has decayed.
- Books are physical: they have weight, they can be shelved, and a
  personal library is worth the trip to the public one that it saves.

**Wave 6 — distribution.**

- An item declares the two tag sets distribution needs, and rarity
  **derives** from the grid cell via the arcane price list rather than
  from an authored table.
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
- **Guns and the ranged build.** Wave 6 consumes the ranged seam for
  thrown carriers only. Kinetic charged items are gun-shaped (D6) and
  wait for [ranged-slate.md](../slates/builds/ranged-slate.md).
- **True polymorph / body-swap** — deferred to
  `presence-hollowing-slate.md`. See D18.
- **Altars, consecration, and sanctity** — fixtures, and they belong
  with presence/hollowing and alignment.
- **Summoning and figurines** — `spawn-distribution-slate.md`.
- **Artifacts as a roster.** The *shape* (a named focus with provenance)
  falls out of chattel + chronicle + the focus class; naming and
  uniqueness are content, not this build.
- **The identification axis** — what a blue potion *is* stays with
  `identification-slate.md`. This build owns BUC, the orthogonal
  per-instance axis.
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

**Partial comprehension yields nothing**, but the book reports how far
short you fall. Partial knowledge is untrue to the fiction and muddies
the claim ledger; a legible distance reads as a target rather than a
wall.

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

### D23 — Use-verbs are conferred by the item

Consistent with the affordance model: instruments confer verbs. A wand
confers its use verb, a book confers `study`, a potion confers `quaff`.
`recharge` and `study` are standalone verbs because they are diegetic
acts, not subcommands of an administrative surface.

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

1. `executeEffect` and its executors take an explicit context; no
   executor reads a bare `caster`. Tests cover an effect whose origin,
   actor, and source are three different objects.
2. Provenance records specified-by and fired-by separately; a test
   asserts a wand-fired effect names the user as actor and the maker as
   specifier, and that dispel keys on the tag while the accountability
   row names the actor.
3. A spell is usable through both the casting path and an item path from
   one authored definition, with no duplicated effect data.
4. A potion is a `Bulkable` whose partial consumption produces a
   proportionally scaled graded effect and no threshold effect below its
   minimum; splitting, dilution, and spilling are covered.
5. Charge is a `Reserve` that decays on read; a test asserts stock
   converges to `inflow/decay` rather than growing without bound.
6. A charged item absorbs its own recoil and waste heat; a test asserts a
   caster using a shove-focus is displaced and a caster using a braced
   charged item is not.
7. `recharge` moves energy from a caster's mana into an item's charge
   and is refused when the caster lacks it.
8. A worn always-on item depletes measurably faster than the same item
   used as a trigger.
9. **Mana recovery consumes satiation and hydration**; a starved caster
   does not refill. A test asserts recovery halts with an empty
   satiation pool.
10. A cursed charged item cannot be removed and transfers heat to its
    wearer.
11. A sustained effect from a charged host is renewable while charged; a
    term-bought one expires and cannot be renewed. Both survive
    save/reload and re-materialize their shadow.
12. Reading a spellbook mints an idempotent known-of claim and writes no
    Transcript entry; a test asserts competence is unchanged.
13. A character below a book's comprehension floor gains nothing and is
    told the distance.
14. A faded spell costs more mana and never fails for fading alone;
    casting restores sharpness; an amnesia effect removes claims and
    leaves competence intact.
15. Fade rate responds to maturity, to competence in the relevant
    Disciplines, and to specification complexity — and is unaffected by
    which book taught it.
16. Studying is an interruptible activity whose duration falls as
    sharpness rises.
17. A thrown potion delivers through the ranged seam, breaks according to
    its vessel's material, and spills; an ingestion-only potion produces
    no effect when thrown.
18. Item rarity derives from the grid cell via the price list; no
    authored rarity table exists in the codebase.
19. `docs/subsystems/magic-items.md` exists and documents the three
    classes, the charge economy, the memory loop, and the effect
    context.
20. `arcane-science.md` and `magic-items-slate.md` both record the
    polymorph resolution (D18); the slate's rings section records the
    charge revision (D8).
21. `pnpm lint` and the full suite pass; no new `no-restricted-syntax`
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
`spawn-distribution-slate.md` (summoning) ·
`identification-slate.md` (the identity axis) ·
`pharma-slate.md` (the consumable product line)
