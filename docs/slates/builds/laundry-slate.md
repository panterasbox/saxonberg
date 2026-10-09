# Laundry — the trade that is paid for an absence

> **Status: UNBUILT** — and ⚠ **blocked on a producer, not on itself**:
> `SoilableMixin` does not ship. `textiles.md` defers soiling's gauge and
> bands to [room-condition](./room-condition-design-pack.md), so **there
> is currently no dirt for a laundry to remove.**
> **Left:** the **congruence** read (not a cleanliness score) · the
> doorman as the refusal surface · soap as a chain (fat + wood ash) ·
> the **soft/hard** water consumer · bleaching as **deliberate fade** ·
> the laundress's **liability** failure mode · the public *lavoir*.
> ⛔ **Three refusals:** no engine gauge from dress to regard (it is a
> **brain**, in a pack) · no verb conferral, ever · and no
> time-integrated soiling.
> **Size:** a tail — it is one mixin's consumer plus content, once
> room-condition lands.

Designed 2026-10-08, out of the water-trade audit
([navigable-water-slate](./navigable-water-slate.md) § 5c). ⭐ Raised as
"cheap and social", and it is neither: **a five-input trade with a
liability gate, a shipped-but-inverted verb, and the cleanest instance of
*engine measures, subject values* in the game.**

---

## ⚠⚠ The finding: `wash` ships and removes the wrong thing

`wash <garment>` **already exists** (`textiles.md` § *Dye, wash and
fade*): it takes the launder branch and **strips colour** in proportion to
`1 − fastness`, so an un-mordanted piece washes straight out on the first
launder.

And **`SoilableMixin` does not ship at all** — asserted absent, with the
gauge, the bands and the attributed deposit log all belonging to
room-condition. Soiling's only shipped piece is **a method, not a
signal**: `wearer.outermostAt(partKey)`, which answers *which layer takes
the stain* for a stain nothing deposits.

> ⚠⚠ **So the verb that exists fades your shirt and cannot clean it.**

⭐⭐⭐ **That is the FIFTH instance of the ice slate's standing check** —
*when a bidirectional mechanism ships, one direction gets its driver and
the other waits for a consumer, and the waiting half is invisible because
the engine looks complete.* The roster now reads: **the melt got its
ambient driver and the freeze did not** · **glass transmissivity carried
light and withheld sight** · **the turbine shipped and the pump did not**
· **soiling's host method shipped with zero emitters** · **and `wash`
removes dye, not dirt.**

## ⚠ And the standing refusal, met head-on

`textiles.md` § *What this build deliberately does not ship*:

> *"**A laundry vocation.** Water is a precondition, not a consumable, so
> the care loop is not an errand per wash."*

⭐ **That argument is right about your own laundry and silent about
somebody else's.** What makes it a vocation is not the errand — it is the
**liability**, which is § *Lens 6* below. The loop is not *an errand per
wash*; it is **a liability per garment**, and the skill is knowing what
*not* to do.

(Per [[regression-risk-is-not-a-lens]]'s sibling rule: a doc's
prohibition can be lifted, and the way to lift one is to answer its
stated reason rather than outvote it.)

---

## ⭐⭐⭐ The model: it is not about dirt, it is about CONGRUENCE

The single decision this slate makes.

**A tanner in tannery clothes IN THE TANNERY is correctly dressed.** The
same clothes at a banker's table are a problem. So the thing being read
is **not a cleanliness score** — it is **whether your appearance matches
where you are.** The same outfit passes in one room and fails in another,
and ⭐⭐ **nobody is ever "underlevelled."**

Which also makes sense of the apron, already designed as *"sacrificial
soiling **plus** station signal, which is why it is white."* A white apron
says *I am a professional whose work shows* — and a **stained** white
apron says it more strongly. **In a kitchen a clean apron is
suspicious.**

### ⭐⭐ And it must cut both ways

The rule that makes this a **costume** system rather than a cleanliness
tax: if clean linen opens the banker's door, **a gentleman's coat on the
docks marks you as an outsider, a mark, or an informer.**

⭐⭐⭐ **Dress is a CLAIM about who you are, and different rooms test the
claim differently.** That is lens 4 precisely — the engine measures
soiling and **what it means is decided by a cast, differently in each
room** — and it makes the natural home the **shipped** disguise / regard /
recognition machinery (`belief.md`, `presentation.md`) rather than any new
gauge.

### ⭐⭐ The abuse is already prevented by a decision made for other reasons

`textiles.md`: *"Dirt is **act-deposited and freezes in absence**: a coat
in a wardrobe does not get dirty. Soiling is **not time-integrated**, and
there is no clock stamp anywhere in this build."*

⭐⭐⭐ **So laundry can never become a maintenance treadmill.** You do not
get dirty by existing; you get dirty by **doing things**. Spend the day in
the tannery and you look like it; sit in the lounge and you do not. That
one decision is the whole anti-abuse guarantee, and the
`stewardship-doctrine.md` anti-treadmill survey is the reason it matters.

### ⛔ The five refusals

1. ⛔ **Never gates a verb.** Conferral is retired, and for the right
   reason — *the refusal is the progression UI*, so the verb must exist in
   order for you to be told.
2. ⛔ **Never gates combat, movement or survival.** It gates **rooms where
   appearance is the point**: the bank's back office, a formal table, the
   committee chamber, a courtroom, the clean side of a counter. **Never a
   dungeon, never a quest.**
3. ⛔ **Never a hidden number.** A **doorman** refuses you, in words, with
   the reason — a person, not a threshold.
4. ⛔ **Never the only path.** A back door, a borrowed coat, a bribe, or
   somebody who does not care.
5. ⭐ **Being turned away is a SCENE, not a failure.**

---

## The lens pass

### Lens 1 — pedagogy

Washing is **three contributions traded against each other**: mechanical
(agitation), chemical (surfactant), thermal (hot water). More scrubbing,
or hotter water, or more soap — a real optimization where **the wrong
trade destroys the cloth.**

- ⭐ **Soap is fat plus lye, and lye is wood ash** — the same ash that
  fluxes glass ([glass-slate](./glass-slate.md)), the same alkali family
  as tanning's lime. **Three trades on one chemistry**, and
  `trade-chandlery` already ships **two fats**. Every input exists.
- ⭐⭐ **Hard water does not lather.** Famous, true, immediately teachable
  — and **`soft / hard` is already a shipped read on the `Shore`** with no
  consumer (the same orphan § 5b found for brewing). **Your laundry works
  better in some towns than others, and the reason is readable with a verb
  that already exists.**
- ⭐⭐ **Bleaching is sunlight.** Crofting: linen laid on grass for days or
  weeks. So bleaching is **deliberate fade** — and fade **already
  ships**, gaining a second, *intentional* driver. ⭐ Gated on daylight,
  so **you cannot bleach in a polar winter**
  ([climate-slate](./climate-slate.md)).

### Lens 2 — creative expression

Ordinary: a tub, a line, a copper. **No code.** Bespoke: a laundry that
is a front, a bathhouse, a dyeworks sharing the vats. ⭐ And **laundry
marks** — a laundress marks garments to tell whose is whose: a
per-instance authored detail on an otherwise fungible good, and the
natural hook for monogramming and identity.

### Lens 3a — immersion

⭐⭐⭐ **The laundress knows what is on your clothes.** Blood. Somebody
else's scent. Mud from a place you said you had never been. She is an
**investigator by accident**, through an entirely ordinary domestic
process — **the thaw's sibling**: evidence arriving sideways through a
mechanism that exists for another reason. Couples to accountability and
concealment with nothing new.

### Lens 3b — participation

A laundry is a heavy water draw **and** a heavy fouler, so it is
downstream politics at domestic scale.

⭐⭐⭐ **And the public washhouse is the third instance of a pattern:
CIVIC INFRASTRUCTURE REDISTRIBUTES A PRIVATE CAPABILITY.** The warming
house redistributes **heat**; the staff gauge redistributes
**knowledge**; the washhouse redistributes **access**. (Promoted to
[design-lenses.md](../../design-lenses.md).) ⭐ **A town that builds a
*lavoir* has given its working class the ability to enter rooms** — and
the *lavoir* is historically attested as a municipal build, so it is not
a conceit.

### Lens 4 — values

⭐⭐ Clean linen was **the** class marker — not the cut of the coat, the
whiteness of the shirt. And `textiles.md` has **already located this
correctly**:

> *"No engine gauge from dress to regard. **Engine measures; subject
> values.** NPC reaction to dress lives in a **brain**, in a pack."*

That is `measurement.md`'s three layers in one sentence, already decided.
So this is an **access** mechanic enforced by a doorman's judgment, never
a stat check.

### Lens 5 — continuity, with a twist the others do not have

The laundress → the commercial steam laundry → the domestic machine.
⭐⭐⭐ **Except this arc does not end with the work stopping.** The machine
kills the trade and **moves the work into the home, where it is unpaid and
uncounted.** The ferryman, the whaler and the iceman end up out of a job;
**the laundress ends up with the job done by somebody nobody is paying.**
Materially different from the other three obsolescence arcs, and the most
interesting of them.

### Lens 6 — economy, and the answer to the refusal

**Consumes five shipped things:** soap · soft water · **fuel** (heating
water is a serious draw — straight into climate-slate's fuel ration) ·
labor · and **drying space**, which is land, and which in a cold realm
barely exists. ⭐ And it is the most **recurrent** service demand there is
— a small repeated expense, which makes it **a money sink that is not a
purchase.**

On `vocations.md`'s criteria:

- **Criterion 1 (unmet demand)** — ⭐ **her customers are people whose
  work dirties them and whose business requires them not to look like
  it**, which is the middle of the social ladder exactly. Cannot
  self-serve: no time, no soft water, no drying ground inside a town.
- **Criterion 2 (a gated capability)** — ⚠ anyone can wash a shirt, so by
  the register's own rule this *looks* like a **chore**. What lifts it is
  **scale** (the copper, the mangle and the drying ground are capital)
  and **knowing what not to do.**
- ⭐⭐ **Criterion 5 (a failure mode) is where it becomes real: boiling
  wool felts it, bleach rots linen, hot water sets a protein stain.** The
  failure is **destroying the customer's property** — a trust
  relationship, therefore a **reputation** trade, and renown and regard
  already ship.
- **Criterion 4 (paid, not minted)** — paid by households and businesses
  with budgets. No subsidy anywhere near it.

⭐⭐ **And the shape worth naming: the laundress and the pilot are both
paid for an ABSENCE** — a garment that was not ruined, a grounding that
did not happen. A trade whose whole value is the damage that did not
occur is unusual, and both of ours are on the water.

### Lens 7 — governance

Liability for a ruined garment, and **who hears it**. The washhouse as
licensed premises on its water draw and its fouling. Modest — but ⭐ it is
the **small-claims end** of the legal system, which nothing else in the
realm currently populates, and **a court that only ever hears
constitutional questions is a court nobody has used.**

⚠ And the dark institutional end exists and is real: **the Magdalene
laundries** — laundry as confinement and unpaid labour. Where this trade
meets governance and the **appeal** mechanism, and the strongest argument
that institutional laundry is **a LULU with people in it.** To be handled
as history, not as colour.

### The person

Historically a women's trade. ⭐ **A washerwoman with real standing who
handles everybody's clothes and therefore knows everybody's business is
one of the strongest minor positions in any setting** — and by
`content-craft.md`'s rule she is **genuine**, not comic relief.

---

## ⭐⭐⭐ The folklore, which will outlast the mechanism

**The Washer at the Ford** — *bean nighe* in Scottish Highland folklore,
kin to the Irish *bean sídhe*. A woman at a ford, at night, washing
**bloodstained clothes**. If you see her she is washing the shroud of
someone about to die, and in some tellings, **if you ask, she tells you
whose.**

⭐⭐ That is *the laundress knows what is on your clothes* existing as
**real folklore, independently, for the same reason**: everyone
understood that the woman who handles your clothes knows what you have
done. Culturally genuine rather than invented, so it sits exactly on
`content-craft.md`'s **homage in the details, never the description**, and
it gives the washerwoman a mythic register she can be played straight
against.

---

## The history, because the mechanism is in it

⭐ **Soap had been invented** — Babylonian, then Roman — but it was
**expensive and frequently taxed**, so ordinary people used **lye leached
from wood ash**, directly. The process was **bucking** (buck-washing,
buck-lye):

1. **buck** — steep the linen in ash-lye, for hours or days
2. **beat** — a wooden bat against a stone: the **mechanical**
   contribution, and the reason for the river
3. **rinse** — in the running water, **the only reason you are at the
   river at all**
4. ⭐ **croft / grass** — lay it out to **sun-bleach**. Bleach greens were
   real, named, mapped pieces of land

⭐⭐ **Which gives the trade TWO siting constraints, both physical:**
**running water to carry the lye away**, and **flat sunny ground to
bleach on.** Authored as terrain, not as a rule.

⭐ **The built form has a name: the *lavoir*** — a public, often roofed,
spring-fed washing basin. France built thousands in the 19th century and
many still stand.

Two more real details worth having:

- ⭐ **Urine was a detergent.** Stale urine is ammonia, and Roman fullers
  collected it from public urinals — **Vespasian taxed it** (*pecunia non
  olet*). True, revolting, and it connects fulling and laundry through a
  shared input.
- ⭐ **The downstream ordering was municipal law**: drinking water above,
  laundry below, tanning and dyeing below that and outside the walls.
  **Our contamination-by-kind plus the rights ordering — attested, not
  invented.**

---

## Prior art — by what is transferable

| source | the transferable thing |
|---|---|
| ⭐⭐⭐ **Zola, *L'Assommoir*** | **the** text. Its famous early set-piece is a **brawl in a public washhouse**, and Gervaise is a laundress whose whole arc runs through the trade. The *lavoir* as **arena** — researched on site, 1877 |
| ⭐⭐ **Strange Horticulture** | the mechanical model to steal: **identification under uncertainty using a reference book** — not a skill check, a **deduction.** Which is the laundress's real problem (*what fibre, what stain, what will ruin it*). Proves the loop is a game without being a minigame, and it is **text-native** |
| ⭐⭐ **Dwarf Fortress / RimWorld** | cleanliness where **the stakes arrive later and elsewhere** (miasma; infection chance in surgery off room cleanliness). ⭐ A mundane upkeep system earns its place when its failure **surfaces in a crisis it did not cause**, and is legible in retrospect |
| ⭐⭐ **Pentiment** | a historical world where **social knowledge is the mechanic** and you interview people at their work — the closest existing thing to the washerwoman as a source |
| ⭐ **Return of the Obra Dinn** | **deduction from physical evidence** with no hand-holding: the laundress-as-forensic-accident, at domestic scale |
| ⭐ **Disco Elysium** | information comes from people with unglamorous jobs, played **with complete seriousness** — the tonal model for not making her comic |
| ⭐ **Spirited Away** | a **bathhouse as an entire social world**, with a labour hierarchy and **dignity in cleaning work**; the stink-spirit sequence is cleaning as a set-piece |
| ⛔ **Graveyard Keeper** | **the anti-example** — and `stewardship-doctrine.md`'s anti-treadmill survey already worries about exactly this. Upkeep **with no judgment in it** is a treadmill. Contrast **Stardew / Animal Crossing**, where upkeep is pleasant **ritual**: the difference is whether the player is **deciding or complying** |

---

## Open questions

1. **Does this wait for room-condition, or does it supply the producer?**
   Soiling's gauge is room-condition's by decision. ⚠ But **laundry is the
   only consumer that makes a garment gauge worth having**, so the two may
   be one build.
2. **Where does the doorman's judgment live?** A brain, in a pack, per
   textiles.md. ⭐ Which pack — the venue's, or a shared `trade-laundry`?
3. **Soap: a trade or a row?** Fat + ash is a recipe on shipped inputs,
   so it may be rows in `trade-chandlery` rather than anything new.
4. **Is the congruence read a `Reading` row?** `analyze dress` as a
   channel any pack can ship would make the *player's* read of their own
   appearance derivable — and competence would resolve **how well you can
   tell how you look**, which is a real and funny thing to band.
5. **The second set of clothes.** If owning two is a wealth marker, does
   anything need to say so, or does the price do it?

---

## Cross-references

- [textiles.md](../../subsystems/textiles.md) — the layering model, the
  dye/wash/fade loop, the soiling seam, and the refusal this slate answers
- [room-condition-design-pack](./room-condition-design-pack.md) — owns
  the gauge, the bands and the attributed deposit log
- [stewardship-doctrine.md](../../stewardship-doctrine.md) — the pillar,
  and the anti-treadmill survey
- [navigable-water-slate](./navigable-water-slate.md) § 5c — where this
  was raised
- [climate-slate](./climate-slate.md) — the fuel draw, and why nothing
  dries in winter
- [measurement.md](../../subsystems/measurement.md) ·
  [belief.md](../../subsystems/belief.md) ·
  [presentation.md](../../subsystems/presentation.md)
