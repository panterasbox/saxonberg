# The return leg — requirements

**Kind:** feature (content-led)
**Leads from:** content — the ranching pack, proved at the campus farm.

Every farm animal eats, and what it eats came out of the ground. **Nothing
in the realm puts any of it back.** This build closes the one open link in
the conserved loop the ranching slate names as its seam with farming:

> **crops → feed → livestock → _?_ → crops**

It is unusually small, because ⭐⭐ **the design already exists as an
authored claim the world does not honour.** The byre archetype demands
somewhere for the muck to go. The midden that satisfies it is a
description. The slurry pit is half full of slurry that came from nowhere.
Compost ships as a material whose keywords are *muck* and *manure*, and a
verb ships to spread it. The return leg of the nitrogen ledger is
currently **a sentence in a comment**.

Seeded by [ranching-slate](../slates/builds/ranching-slate.md) (the
conserved loop; D68's muck slot) and
[stewardship-slate](../slates/builds/stewardship-slate.md) (land you are
answerable for).

---

## What already exists

⚠ **Almost all of it, inert.** This is the survey's whole finding:

| part | state |
|---|---|
| **the byre's muck requirement** | ⭐ **authored** — the archetype carries a `muck` slot needing a midden, with D68's note that *"it is not waste, it is the return leg of the nitrogen ledger; a byre with nowhere to put it is a byre throwing away half of what the animals are for"* |
| **the midden** | ships at the campus farm as a description — *"a heap of straw and dung with the rain steaming off it, **turned at one end and settled at the other**"* — which is an account of **maturity**, the one thing compost explicitly does not model |
| **the slurry pit** | ships as a **hazard** (the H₂S multiple-fatality one), *"half full of black slurry"* |
| **compost** | ships as a bulk material, keywords `compost · muck · manure · humus` |
| **spreading it** | ships — the `feed` verb puts compost on ground and credits nitrogen |
| **the soil ledger** | ships — four reserves, and soil's own doc names **manure** as the input to two of them |
| **the cart, the spade, the field** | all standing in the campus farm yard, with exits to the field and down to the pit |

**And a second broken leg found on the way:** soil's **organic-matter**
reserve — its own *"long game"* — has **no input path whatsoever.** Nothing
in the realm credits it.

**Disciplines: no new one.** `soil-science` and `stockmanship` both ship
and both apply.

> **Therefore what is genuinely new here is:** muck accumulating where
> animals are kept, a midden that ripens what is thrown on it, and one act
> to move it. Everything it flows into and out of is already built.

## Goals

- **Kept animals produce muck**, and it collects where they are kept.
- **A midden ripens muck into something worth spreading**, over time and
  visibly.
- **Spreading it returns fertility to the ground** — nitrogen quickly and
  organic matter slowly, so muck is qualitatively unlike a sack of
  anything else.
- **The loop closes**: what a field grew, an animal ate, and the ground
  gets it back.
- **A grazing animal fertilises the ground it stands on**, with nobody
  doing any work.
- **Muck you do not gather is fertility you do not get** — a loss, never a
  punishment.

## Non-goals

- **N-P-K, C:N ratios, or any second soil nutrient axis** → **nowhere,
  deliberately.** The shipped compost material rules this out in its own
  comment: one limiting nutrient is the whole lesson, and more axes are
  farming's later business.
- **Human waste and sewage** → **nowhere in this build.** Water already
  models sewage as a contaminant; who produces it is a heavier design
  question than this build should reach for.
- **Disease from foul housing** → the [disease
  slate](../slates/builds/disease-slate.md), which owns *good husbandry is
  immunity* and is where dirty bedding earns consequences.
- **Smell as a modelled sense channel** → the senses tail. A midden can be
  described as reeking without the engine having an opinion.
- **Enforcing the byre's muck slot.** ⚠ The archetype is **reported, never
  enforced**, and must stay that way — a byre with nowhere to put its muck
  is a legal, visible state and nothing multiplies off it. This build makes
  the slot *mean* something; it must not turn it into a gate.
- **Composting anything but muck and bedding** (kitchen waste, crop
  residue) → a later farming tail. The mechanism will take them; this
  build authors one input.
- **Selling muck as a commodity** → the economy tails. The cost surface
  already prices carting, so the market can arrive later without redesign.

## Placement

**Ranching owns the muck; the ground it feeds is already the platform's.**
The animals, the byre and the midden are the ranching trade's business.
The soil ledger and the act of spreading are shipped kernel surface and
are not touched beyond crediting a reserve that already exists.

> **The test — does a second instance need code?** No. **A second byre
> anywhere is a midden row and nothing else**, and a second kind of heap
> (a dung pit, a compost bay, a muck store) is another row. Nothing in
> this build may hard-code the campus farm's midden as the concept.

## Collisions

- ⚠⚠ **The slurry pit is a shipped fatality**, and the most dangerous
  thing this build can do is break it. It kills by unbreathable
  atmosphere, it kills the rescuer as well as the victim, and it must
  behave exactly as it does today. Giving the pit a *quantity* must not
  change what happens to a person standing in it.
- **The handcart is the farm archetype's `market` slot.** It is also the
  obvious thing to move muck in. That is fine — a cart carts — but the
  build must not quietly mint a second cart to avoid sharing one.
- **`feed` already means "feed the ground."** It is the destination act
  here and must not be duplicated or renamed; whatever moves muck to the
  heap is a different word.
- **The campus farm yard is furnished** — byre, midden, trough, hay barn,
  herdbook, tool rack, cart, four loose tools. Nothing new should be laid
  down there that the yard does not already have.
- **Winter.** An outdoor heap in a hard winter is a real thing, and the
  thermal model already runs. Whatever ripening does, it must not read as
  broken when it slows down in the cold.

## Surface decisions

### Muck is a residue, not a yield

**Q:** Is muck a fourth tap on the animal, beside milk, eggs and wool?

**A:** **No, and it is the inverse of one.** A tap draws on what the
animal has to spare, and stops first when the animal is doing badly —
that is why a thin cow gives less milk.

> ⭐⭐ **A starving animal still mucks.** Muck is a residue of what went
> *in*, not a product of what was left over.

Modelling it as a yield would say something false about the animal, and it
would make muck stop exactly when a struggling farm most needs to
understand where its fertility went.

### The place accumulates, not the animal

**Q:** Where does muck build up?

**A:** **Where the animals are standing.** It is a property of the ground
they are kept on, not a thing carried around inside them.

⭐⭐⭐ **And that single choice hands over the real agronomy for free:**

> **Housed animals concentrate fertility. Grazing animals distribute it.**

A byre gathers it into one place that must be cleared and can be carted
where it is wanted. A paddock spreads it thinly over the ground the
animals are already on, which improves slowly with nobody doing anything.
That is exactly why the two arrangements differ on a real farm, and it
arrives without a word of it being authored.

### The midden ripens

**Q:** Is fresh muck the same as what you spread?

**A:** **No.** A heap turns fresh bedding and dung into something worth
carrying, over time, and the shipped description already says so —
*turned at one end and settled at the other.* Fresh muck spread straight
onto ground is worth less than ripe muck, which is both true and the
reason a midden exists at all rather than a wheelbarrow.

⭐ The heap **steams**, as it already claims to. Ripening generates its own
heat, which is the same fact the hay barn's fire risk already runs on.

### Nitrogen fast, organic matter slow

**Q:** What does spreading it actually restore?

**A:** **Both — and that is what makes muck different in kind.** Nitrogen
answers this season. Organic matter is soil's declared long game and today
has **no input at all**, so muck becomes the thing that builds ground
rather than merely feeding a crop.

⭐ This is what stops muck being "cheap fertiliser." A sack of something
feeds one harvest; a decade of muck makes the field better.

### The consequence of neglect is loss, not punishment

**Q:** What happens if you never muck out?

**A:** **You lose the fertility, and that is the whole of it.** The yard
is unpleasant and visibly so, and the ground you never fed yields worse
next season — but nothing fines you, and the archetype does not stop
reporting. D68's framing is exactly right and is the design: *a byre with
nowhere to put its muck is throwing away half of what the animals are
for.* Throwing something away is a consequence. It does not need a
penalty on top.

### How far muck is worth carrying

**Q:** Does distance matter?

**A:** **Yes, and nothing needs building for it.** Muck is heavy, low
value, and the realm already prices carrying things over real ground. It
will be worth spreading on the near field and not worth carting to the far
one, and that is the correct answer arriving on its own.

⭐ It is also the reason market gardens historically sat next to cities —
they sat where the muck was.

---

## Lens pass

**1 · Pedagogy.** `soil-science` and `stockmanship`, no new Discipline.
The lesson is the one this whole family exists to teach: ⭐⭐ **fertility
is conserved, not created.** A farm that sells everything off its land is
mining its own soil — which is real agricultural history, and which a
player discovers by watching a field they never fed get worse. The world
stays derivable because every step is a visible object in a visible place:
the heap, the cart, the field.

**2 · Creative expression.** The ordinary case is two rows — a byre and a
heap — and the campus farm proves it by needing no new furniture at all.
The bespoke case is open: a dung pit, a compost bay, a muck store behind
an inn are all the same substrate, and a pack may ship any of them.
⚠ Nothing here may name the campus farm's midden as the concept.

**3 · Immersion & roleplay.** Nothing is a gauge. The state of the yard is
the state of the yard: you look at the byre and it is foul or it is not,
you look at the heap and it is fresh or it is ripe. A visitor reads a
farm's competence off its muck heap without being told a number, which is
what a real one does.

**4 · Values.** ⭐ The choice is **whether to put back**, and it is a
genuine one because putting back costs a day now and pays a season later
— against selling everything and letting next year's ground be next year's
problem. Nobody confers standing for it; the field does.

**5 · Epochs.** The mechanism is indifferent to the century: muck has been
gathered, ripened and spread since farming existed, and the modern version
is the same act with a spreader on the back of a tractor. Only the rung
changes — hand and fork, cart, machine — exactly as the food ladder does.

---

## The drive

Run against the live game before the MR opens. All of it happens in the
campus farm yard, the field beyond it, and the pit below.

1. Go to the campus farm yard. Bring stock into the byre off the
   herdbook.
2. Look at the byre. Over the following days its description changes:
   **muck is building up where the animals stand.**
3. Look at the midden. It is what it always was — and now you have a
   reason to care.
4. **Clear the byre out onto the heap.** The byre is clean; the heap is
   bigger, and **fresh**.
5. Look at the heap over the next several days. ⭐ **It ripens, and it
   steams while it does.** Fresh at one end, settled at the other, exactly
   as the description always promised.
6. Load the ripe end into the handcart — the one that was already standing
   against the yard wall.
7. Go through to the field and **spread it on the ground.**
8. Read the ground with the soil kit. **Nitrogen is up. Organic matter is
   up** — and organic matter had no way of going up before today.
9. Grow something in the fed ground and something in ground you never fed.
   **The fed one does better**, and you were never shown a number that
   told you it would.
10. Now do nothing for a season. The byre gets foul, the field you did not
    feed yields worse, and ⭐ **nothing fines you, warns you, or stops
    you.** The loss is the lesson.
11. Put animals out on a paddock instead and leave them there. Come back
    and read that ground: **it has improved on its own.** Nobody carried
    anything.
12. ⚠⚠ Walk `down` from the yard into the slurry pit, as anyone can. **It
    kills you exactly as it does today** — and it kills whoever comes down
    after you. *This step is here to prove the build did not break the
    hazard it grew up next to.*

---

## Acceptance criteria

Observable from outside the code, by a person playing.

1. A player who keeps animals in a byre finds muck accumulating there, and
   can see it by looking rather than by asking.
2. A player can clear a byre onto a heap, and the byre is visibly better
   for it.
3. A player who leaves a heap alone finds it changed later, and can tell
   ripe from fresh without being given a figure.
4. A player who spreads ripe muck on a field measures more nitrogen **and**
   more organic matter in that ground afterwards.
5. A player growing in fed ground gets a better result than in ground they
   never fed.
6. A player who never mucks out is never fined, warned, or blocked — and
   is measurably worse off a season later.
7. A player who leaves animals standing on open ground finds that ground
   improved, having done no work at all.
8. A player can walk into the slurry pit and die of it, exactly as they
   could before this build.
9. A content author can add a second byre and heap anywhere in the realm
   with two rows and no code.
10. A player far from their fields finds carting muck out to them is not
    worth the trip, and nothing had to tell them so.

---

## Cross-references

- **Seeding slates:** [ranching-slate](../slates/builds/ranching-slate.md)
  (the conserved loop; D68's muck slot) ·
  [stewardship-slate](../slates/builds/stewardship-slate.md)
- **Subsystems:** [ranching](../subsystems/ranching.md) (the byre, the
  taps this deliberately is not one of) ·
  [soil](../subsystems/soil.md) (the four reserves and the ledger) ·
  [smallholding](../subsystems/smallholding.md) (ground you own, the
  cultivation gate) · [husbandry](../subsystems/husbandry.md) ·
  [bulk](../subsystems/bulk.md) (muck is continuous matter) ·
  [fermentation](../subsystems/fermentation.md) (the durative transform
  the heap is a second customer of) ·
  [logistics](../subsystems/logistics.md) (why distance decides) ·
  [respiration](../subsystems/respiration.md) + [hazard](../subsystems/hazard.md)
  (the pit, which must not change)
- **Adjacent, deliberately not consumed:**
  [disease-slate](../slates/builds/disease-slate.md) (foul housing earns
  its consequences there) · [pets requirements](./pets-requirements.md)
  (which named this gap and handed it here)
