# The carcass chain — requirements

**Kind:** content (with one reconciliation slice in the engine)
**Leads from:** content — the two new packs and the valley's flock are the
bulk of it; the engine slice is the yield declaration and the single
death path, and its first consumer is the Hearts Delight flock in this
same build.

Everything an animal is, that is not meat. Today the realm can kill a
beast and eat it, and every other part of it stops dead: a green hide
with nothing to tan it, a heap of bone nothing takes, offal nobody
wants, and suet that renders to a tallow only the kitchen buys. This
build closes those four, and in closing them it has to reconcile the two
different slaughters the realm shipped by accident — one in the stockyard
and one in the kitchen, each with its own yield, its own skill and the
same verb.

It seeds from [rendering-slate](../slates/builds/rendering-slate.md) (the
knacker, the tanner, the chandler — `UNBUILT`), with
[ranching-slate](../slates/builds/ranching-slate.md) and
[cooking-slate](../slates/builds/cooking-slate.md) as the two shipped
halves it joins, [textiles-slate](../slates/builds/textiles-slate.md)'s
leatherwork tail, and
[trade-roster-slate](../slates/tails/trade-roster-slate.md) for
`leatherwork`, which has sat on the unminted-Discipline roster since it
was written.

---

## What already exists

**The survey shrank this build three times.** What follows is what a
player could already find.

### The slaughter that shipped twice

Two verbs named `butcher`, in two trades, doing different things:

| | what it does | the skill it credits | what it works on |
|---|---|---|---|
| the stockyard's | kills a live beast and reduces it to five goods in one act | **stockmanship** | a head of livestock, and nothing else |
| the kitchen's | opens an already-dead carcass and works it down to cuts | **butchery** | any dead body that is not a person |

The kitchen's is the carefully designed one: it refuses a person, it
starts the spoilage clock **at the kill rather than at the knife**, it
reads how much gut ends up on the meat, and it is afforded by a blade
rather than by a class. The stockyard's was written to give the cooking
chain protein and carries its own fractions, its own skill and no
contamination at all.

The realm's own build-time gate has recorded this for weeks, in these
words: *"trade-cooking vs trade-ranching, both trades — **undiagnosed**."*
Alongside it sits `dress`, claimed both by *dressing a wound* and *dressing a
carcass* — the gate's note calls it *"both diegetically correct, which is
the hard case."*

### Every other death already leaves a carcass

A single path in the engine turns any dying body into a corpse, and
stamps it with what species it was, what killed it and when it died. A
beast killed in a fight, a starved animal, a hunted deer — all of them
leave a body the kitchen's `butcher` can open. **The stockyard's
slaughter is the only killing in the realm that leaves no carcass at
all.** It destroys the animal and hands you the parts.

### What a carcass gives, and who takes it

| part | who produces it today | who takes it |
|---|---|---|
| meat | both butcheries | ten cooking recipes ✅ |
| suet / fat | the stockyard's | the kitchen renders it to tallow ✅ |
| **a green hide** | the stockyard's | ⛔ one recipe, which wants *tanned leather* and gets a raw skin |
| **bone** | the stockyard's | ⛔ **nothing** |
| **offal** | the stockyard's | ⛔ **nothing** |
| milk | the `milk` tap | ⛔ **nothing** — [dairy-slate](../slates/builds/dairy-slate.md)'s, not this build's |

The hide's own description states a clock nobody runs: *"it wants to be
in a tanpit within the week or it is worth nothing."* The leather jerkin
carries a note saying its input *"has NO PRODUCER… do not invent a hide
faucet."* Both were written as deliberate open seams. They have been open
long enough to accumulate.

### The species say what comes off them — except the farm animals

Nine species already declare what butchering them yields: six fish, a
wolf, a wild hog and a pony. **The five farm species — cattle, sheep,
pig, dog and hen — declare nothing.** So the one shared yield table in
the stockyard exists because the species rows are empty, not because a
table was the better idea.

### Candles ship, and the light need is already met

`rendering-slate` says *"no soap or candle exists… candle survives only
as a lumen threshold."* That was verified in September and **is now
stale.** The apiculture build shipped a working candle: dip one from
beeswax, and it is a real light source that burns itself down, dimmer and
yellower than a lantern. Crushing comb rather than spinning it is what
pays for the wax, so the candle is already the reward for taking the
worse extraction.

And it is not the realm's only light. The **Oil Works** in the goods
yards produces lamp oil, and the valley is **gas-lit** — Heart's Delight
has a parish government that buys that oil through the shipped
procurement loop to light its streets. So light has a supply chain, a
producer and a paying customer already.

### Tanning, and what a tanner needs

Nothing tans. No tanpit, no tannery, no knacker's yard, no chandlery
exists anywhere in the realm — confirmed. The **leather material
exists** and four finished leather goods exist as templates; the step
between a hide and them does not.

**Tannin** is the chemical that turns skin into leather. It exists in the
realm — as the dyer's mordant, with no producer. Its name is not
incidental: *tan* comes through medieval Latin *tannum*, **crushed oak
bark**, so the chemical is named after the bark and not the other way
round. The forestry trade already records *"multi-product wood (oak bark
→ the tanner)"* as its own open design, and the realm's one oak stand is
the Hanging Wood's clearing above Rejection's fuel yard. Felling a tree
already yields three things.

### Feeding an animal is finished work

A species declares how it will eat — from the hand, off the ground,
grazing, or from a **bowl, trough or hopper** — and a shipped brain has
the animal eat from a feeder of its own rung on its own cadence, with the
hand-fed case crediting the feeder and the bowl crediting nobody. There
is **no `feed <animal>` verb and none is needed**; the word `feed` is
already the gardener's, for working compost into a bed.

Nothing anywhere in the realm is manufactured animal feed, and nothing in
the design tree has ever mentioned it. That corner is a clean gap.

### The world's livestock

**Six cattle**, in the college herd on the university's teaching farm,
student-worked with no staff. That is every animal in the realm. The
ranching trade ships no places at all — a herd is a **row**, filed on
registration, with each head a deterministic function of the book and its
number. Sheep exist as a species with a shipped `shear` tap and a fleece
row, **and there are no sheep anywhere**, so the realm's whole fibre
chain — shear, spin, weave, dye — has no domestic source.

### Where the trades would live

The valley, **Heart's Delight**: a farmstead yard with a barn bigger than
the house, two fields (cereal on the stony upper bench, the orchard
close), a watermill, a parish government, and three people — Odell Quist
the farmer, Sennet Aubry the miller, Odell Rourke the Warden of the Ways.
Its ground describes itself: *"pale, dry and full of small stones. It is
not the flats and nobody here pretends it is."*

The city's edge, **Wharfside**: already zoned industrial, already
discharging through the city outfall, with the salt house and its brine
hearth, the dyehouse where Ilva Marrow keeps the woad, and the mill. The
city drinks last here, below everyone.

**Therefore what is genuinely new here is:** tanning, the knacker, a
second feedstock for a candle that already exists, manufactured animal
feed, a flock in the valley, bark off an oak — and the reconciliation of
two slaughters into one. Everything else named above already ships, and
four things I expected to build (a feed verb, a candle, the light need,
a herd mechanism) turned out to be done.

---

## Goals

- A hide becomes leather by a real act, so the realm's leather goods are
  makeable from the realm's own animals for the first time.
- One slaughter, not two: every killing in the realm leaves a carcass,
  and one act takes a carcass apart.
- What comes off an animal is **the animal's** — its species says which
  parts, and its size and condition say how much, for every species
  rather than for cattle only.
- Bone, offal and suet each reach a buyer.
- A candle can be made from either feedstock the realm produces, and the
  two are visibly and economically different things.
- The valley raises a flock, which gives the realm its first domestic
  fibre and its first tallow at any volume.
- An oak yields its bark to the trade that is named after it.
- The realm has somewhere a dead animal can go that is not a waste.

## Non-goals

- **Droving a live beast between localities** → ranching, with logistics.
  Nothing today can lead an animal along a road, so the realm cannot move
  a live animal out of the valley. This build ships the kill-and-carry
  arrangement instead and records the gap.
- **A shambles at the city** → arrives with droving, which is what would
  deliver animals to it alive.
- **Soap** → [rendering-slate](../slates/builds/rendering-slate.md). It
  wants lye, and nothing yet makes hygiene matter; the dairy slate owns
  hygiene as a criterion.
- **Glue and gelatin from bone** → rendering-slate. Nothing demands them,
  so bone gets exactly one buyer here.
- **Horn** → rendering-slate, with its buyers named (combs, cups,
  lantern panes, buttons). The stockyard's slaughter *claims* to yield
  horn today and does not; this build removes the claim rather than
  adding a part with nowhere to go, which is the very fault it exists to
  fix.
- **Kibble** → rendering-slate, as the industrial rung: an extruder, real
  keeping, and the fortification question. The medieval rung ships here.
- **Milk, cheese, butter, whey** → [dairy-slate](../slates/builds/dairy-slate.md).
  A different source and a different chain.
- **The victualler as a vocation** → [hearth & larder](../slates/tails/hearth-and-larder-design-pack.md).
  Curing, drying and smoking already ship; only the trade is missing.
- **The tanpit as a measured nuisance** → [zoning-slate](../slates/builds/zoning-slate.md),
  which holds the emission model, the cap at the boundary and the LULU
  host problem at the size of a build. See the lens pass: this build
  sites and zones the premises and does not price their externality,
  which is exactly the state Rejection's own declared fouling is in.
- **Parchment from sheepskin** → nowhere, deliberately, until something
  wants to be written on.

## Placement

**Two new packs, named for their processes.**

- **`trade-tanning`** — the tanpit, the act of tanning, bark liquor, and
  leather. Mints `leatherwork`, which has been on the unminted roster
  since it was written.
- **`trade-chandlery`** — the dip, and both feedstocks.

Two rather than one, because every trade pack in the realm ships exactly
one Discipline — eighteen of nineteen — and the single exception binds
its two by **one subject** (the ground: cut it, and know it). Tanning
(skin → leather) and chandlery (fat → light) share no subject; they share
a **supplier** and a **zone**. There is also no honest word covering
both: *rendering* names one of the two crafts, and a pack we cannot name
is a pack that is wrong.

⭐ **The economic unity is expressed by placement, not by packaging.**
Both trades' premises sit in one industrial parcel at Wharfside. Putting
them in one pack to say "these are neighbours" would encode a zoning fact
as a package dependency; the trade is the mechanism and the locality is
the expression.

**Everything else goes to the trade that already owns its shape:**

| the act | its home | why |
|---|---|---|
| slaughter | ranching | it already holds the book the head leaves |
| butcher a carcass | cooking | butchery already specializes cooking |
| render suet to tallow | cooking | the recipe is already there, and rendering fat is a kitchen act |
| bark off a felled oak | forestry | felling already yields three things, and this is forestry's own recorded design |
| bone to the soil | farming | phosphorus is already one of a field's reserves |
| dog bread | baking | it is baked, in an oven, and historically it was the baker's cheapest line |
| leather goods | tailoring | cutting and sewing hide is the same act as cutting and sewing cloth |

**Butchery stays in `trade-cooking`**, on the food-safety slate's own
test: *"butchering ships inside trade-cooking because one act does not
make a trade; a second and a third would."* This build adds no second
butchery act, so the criterion is still unmet.

**Does a second instance need code?** No. A second flock is a herdbook
row. A second tannery is rows naming this pack's premises. A second oak
wood is rows. Nothing above requires a pack to be touched twice.

---

## Collisions

**Heart's Delight — the valley.** Gets the flock, and a killing place.
The ground argues for sheep rather than cattle: the good land is already
spoken for by cereal and orchard, and the farmstead's own prose says the
yard is stony dryland that *"is not the flats."* Poor stony ground is
what you graze.

⚠ **Odell Quist** farms there and **Odell Rourke** is Warden of the Ways.
Neither is displaced — a flock is the farm's, and the Warden's department
is a government, not a neighbour. The hens in the yard are prose with
nothing behind them; this build does not make them real.

⚠ **The parish buys lamp oil** to light its streets. If the chandler
sells cheap tallow dips, he is competing for a budget the valley is
already spending — and the tallow comes from the valley's own sheep. The
valley will raise the fat that undercuts the oil its own council buys.
That is a collision worth having, not avoiding.

**Wharfside — the city's edge.** Gets the tannery and the knacker's yard.
Already zoned industrial, already discharging, already noxious. The
**salt house** next door is what lets a hide travel at all, and **Ilva
Marrow's dyehouse** two streets over already works with tannin as a
mordant — so the tanner's reagent has a neighbour who knows it.

⚠ **Seven named people work that ground** — Sefa Roke and Adren Coll at
the mill, Dez Okoro, Tamsin Roke, Wren Ashby, Petra Volkova, Ilse Marrow
and the rest across the goods yards, plus Marn Hesk at the Oil Works. New
premises go on unclaimed ground in the precinct; none of their workplaces
moves.

**The university's teaching farm is not touched.** It holds the realm's
only existing animals and it is a *teaching* farm — annexing it for an
industry is exactly the fault the two-kinds-of-farm doctrine warns about.
Its six cattle stay the college's.

**The Hanging Wood above Rejection** holds the realm's oak, as common
land feeding the charcoal clamp. Bark is a by-product of felling that is
already happening there; the collier's clamp is not deprived of anything,
because bark is not what he burns. ⚠ The forestry pack is being worked
heavily in a sibling build, so this touches ground that is moving.

**`dress` is claimed twice and should be claimed neither time.** It has
three plausible meanings to a player — dress a wound, dress a carcass,
get dressed — and the one they most likely mean is the one it does not
do. Wounds keep `bind`; carcasses keep `butcher`.

---

## Surface decisions

### One slaughter, and the carcass is the join

**`slaughter <animal>`** kills a beast and writes it out of the book, and
leaves **a carcass** — the same carcass every other death in the realm
already leaves. **`butcher <carcass>`** then takes it apart, as it
already does for anything else that has died.

The stockyard's slaughter stops being a kill-and-dress and becomes a
kill. It is the only death in the realm that bypassed the common path,
and that bypass is why it had to invent its own yield, lost the
contamination model, and could not run the clock that starts at the kill.
This also retires the recorded `butcher` collision and makes a hunted or
fought-over animal butcher exactly like a slaughtered one — which is the
consistency, rather than a separate effort toward it.

**Alternative considered:** keep one verb and branch on whether the
target is alive. Rejected — it is the same two acts with a hidden seam,
and the realm has just finished moving acts *onto* animals for precisely
this reason.

### What comes off is the animal's, and the species says what

Every butcherable species declares the parts it gives, and the animal's
**size and condition** decide how much. The stockyard's shared fraction
table goes; its condition scaling — *a beast in poor flesh dresses out
light* — survives and applies to every species rather than to cattle.

This requires authoring yields for the farm animals, which have none.
That is the honest version: a sheep and a cow do not dress out alike, and
the difference belongs on the animal and not in a table.

⭐ **The absence of a declared yield is the refusal.** A farm dog has no
yield, so *"that is not something you butcher"* comes out of the data
rather than out of a class check — and an author makes a new species
butcherable by writing a row. This is also how the realm keeps a
decision it already made deliberately: the sheepdog was butcherable once,
and a guard was added to stop it.

⚠ **A named animal is different, and on purpose.** Naming a kept animal
is its promotion to being somebody. Refusing to butcher one must be a
decision the design made, not an accident of which species got a row: a
pet refuses because it is a pet, says so, and the refusal is about the
relationship rather than the species.

### Suet is not tallow

Slaughter yields **suet** — raw hard fat. **Rendering makes tallow.**
Today a carcass hands you something whose own keywords are *fat, tallow
and suet* at once, which skipped the rendering step by naming its output
after it. Separating them costs nothing and makes the render a real act
with a real product.

### One candle, two feedstocks

**One dip, and what you dipped it in decides what you get.** A tallow dip
is greasy and yellowish and smells faintly of mutton; a wax taper smells
of honey before it is lit. Both are candles, both burn, and they are not
the same object.

The two feedstocks need one shared property meaning *this will take a
wick* — **not** a claim that tallow is a wax, which it is not.

**The dip leaves apiculture.** It landed there because bees were the only
source of wax, which is the same fault as the leather jerkin squatting in
the smithy until somewhere better existed: a pack named for a product's
first supplier. A beekeeper's skill must not be what makes a tallow
candle. Apiculture keeps the wax, which is correctly its product.

**Alternative considered:** a second candle recipe for the tallow path.
Rejected on this build's own terms — two implementations of one act,
diverging because they sit in different packs, is precisely the defect
being fixed in `butcher`.

### The tannery is at the city; the hide travels salted

Tanning happens at Wharfside, and the hide gets there one of two ways:

| | you pay | you get |
|---|---|---|
| kill at the farm, **salt** the hide | salt, and haulage for a heavy wet load | the beast dies in full flesh, so more meat |
| kill where the tanpit is | a live animal has to get there | no salt, and the hide goes straight in |

A **green** hide cannot travel — that is its stated week. A **salted**
one keeps and travels, which is why salted hides were a commodity long
before refrigeration, and the hide's own description already says it
arrives *"salted along the edges."* Salt and the act of salting both
ship, and the salt house is at Wharfside.

⚠ The second row is **not buildable this build**, because nothing can
lead an animal along a road. So the realm ships the first arrangement and
the choice becomes real when droving does.

⭐ **And the arrangement is an epoch variable, not a truth.** Slaughter
is urban while meat cannot travel and the animal can walk itself to
market; refrigeration reverses it, and the slaughterhouse moves out to
the stock. The freight design already carries this as its worked example.
The tannery being at the city is therefore the *medieval* answer, correct
now and expected to move — which is the on-ramp working rather than a
thing to apologise for.

### The knacker is a yard and a person, not a craft

Dead stock nobody slaughtered still has value: a hide, bone, and fat to
render. That needs no new act — a corpse is already butcherable, and
rendering already exists. What it needs is **somewhere for a dead animal
to go and somebody whose job that is**, at Wharfside, buying what the
valley could not use.

⭐ This also answers the slate's open question, *does the knacker
collect*: a healthy beast walks to market and a dead one cannot, so the
knacker is defined by going to where the animal died. He is the waste
leg, where the butcher is the food leg.

### Dog bread, not kibble

Manufactured feed ships at its medieval rung: a coarse loaf of bran,
beans, scraps and fat, baked for hounds — real, and historically the
baker's cheapest line. **Kibble is the same mechanism in the industrial
epoch** (an extruder, better keeping, fortification) and is deferred.

It consumes offal, bone meal, bran and fat, and **its consumer is
finished work** — a species declares how it eats, a feeder holds it, and
a brain has the animal eat on its own cadence. No verb is needed.

⭐ **Why a loaf rather than a scrap thrown to a dog:** a scrap closes a
dead end and creates nothing. A manufactured good has a producer, a
price and a buyer, which is the difference between a sink and an economy.
And the baker already has the realm's only modelled customer, so the gap
between the price of a loaf people eat and one they do not is a fact
about the world that nobody has to narrate.

### Sheep

The valley's flock is sheep, and one animal closes four buyers:
**fleece** to the fibre trades, which have no domestic source at all;
**tallow** to the chandler, mutton fat being exactly why a tallow dip
smells of mutton; **skin** to the tanner; **mutton** to the kitchen.
Cattle close one — a better hide — and want grass the valley has already
committed to cereal and orchard.

⚠ The cost: the realm's leather goods read as cowhide, and sheepskin is
thinner. The college's cattle remain the realm's only cowhide until
something else raises cattle.

### The killing place is the yard, not a building

A block and a hook in the farmstead yard, which already has a barn
bigger than the house. Heart's Delight is a valley farm, not an
abattoir; a building for volume belongs where the volume is, and that is
the shambles this build is not yet able to supply with live animals.

### `dress` goes to neither

Wounds keep `bind` and `treat`; carcasses keep `butcher`. Leaving the
word unclaimed costs nothing and stops it meaning the wrong one of three
things.

---

## Lens pass

**1 · Pedagogy.** Dominant Discipline is **`leatherwork`**, and tanning
is unusually derivable: tannin binds to the protein in skin, an
under-tanned hide rots, an over-tanned one cracks, and the dial is bark
strength against time. A player who understands *why* it works predicts
what a weak liquor or a short pit does without being told. `butchery`
keeps its two honest questions — how much you get and how much gut ends
up on the meat. ⚠ **Chandlery's dominant skill is the gap in this pass.**
The dipping is trivial; the real decision is which fat you bought, which
is a market judgment and not a craft one. See the finding below.

**2 · Expression.** The ordinary case is rows: a second flock, a second
tannery, a second oak wood, all without code. The bespoke case is the
pair of candles — the same act, two feedstocks, two objects that look and
smell like what they were made of, with the difference *derived* from the
material rather than authored twice. ⭐ *Grain:* that the cheap light
stinks is a recommendation, not a law; an author who wants clean tallow
changes a material.

**3a · Immersion.** The fiction stops betraying itself in two places it
currently does. A beast that dies in the stockyard will leave a body like
everything else that dies. And the stockyard's claim to use *"bone and
horn"* stops being false. ⚠ One honest blemish remains: a tanpit that
fouls nothing while sitting on a river is a quieter betrayal than the
one being fixed, and this build chooses it knowingly — see 6.

**3b · Participation.** The tanner, the knacker and the chandler are
three standing vacancies at Wharfside, each visible and takeable, in the
precinct whose pattern is already one named hand per works. ⭐ The polity
can do something we did not want: the valley's parish can decide it would
rather not be the city's stockyard, and it has a treasury, a public-works
department and a Warden of the Ways to decide it with.

**4 · Values.** The undecidable choice is **completeness against
squeamishness**, and the design's answer is to make waste feel bad rather
than killing — no confirmation, no ceremony, no guilt meter. ⭐⭐ That
answer is *the grain*, not the law: it ships as the default because a
number in a book is easy to cull and an animal you named is not, which
is a fact about the player rather than a rule anybody authored. ⚠ And the
named pet is where it needs stating out loud rather than falling out:
refusing to butcher something you named is a position, and the build
takes it on purpose.

**5 · Continuity.** Every act survives the epoch and answers the same
command. Dog bread becomes kibble; the dip becomes a mould and then a
machine; the tanpit becomes a drum. ⭐⭐ And the one thing that visibly
moves is **where slaughter happens** — urban while only a live animal can
travel, out by the stock once meat can. The mechanism is unchanged and
the geography is what the epoch decides, which is the cleanest example of
this lens the realm has.

**6 · Economy.** Produces leather, light, feed, fibre and mutton;
consumes hides, suet, bone, offal, bark, salt and bran. ⭐ **The demand
was there first, in writing:** a leather recipe that has been correct and
unmakeable, a fibre chain with no fibre, and three parts of a carcass
with no buyer. Nothing here is a need invented to create a market. The
chandler is a **competitor**, not a hole-filler — the Oil Works already
sells light and the valley's parish already buys it, so a cheap tallow dip
enters a real market against a real incumbent, using fat from the
parish's own sheep. ⚠ **The gap, recorded rather than filled:** the
tanpit's effluent is an unpriced externality. The emission model, the cap
at the boundary and the LULU host problem are a build of their own, and
Rejection's declared fouling has no emitting object either. This build
sites and zones the premises so the statement is made by geography — at
the city's edge, below everybody, beside the outfall — and leaves the
pricing to the trade that owns it. Naming it here is the point; a lens
pass that filled this heading with something that sounded fine would be
worse than one that leaves it open.

**7 · Governance.** Three seats judge a person: who gets hired as tanner,
knacker or chandler. The criterion is the one the realm already uses — a
seat names a Discipline, and holding the seat is what the refusal cites —
and the appeal is the ordinary one: get better, or apply elsewhere. **No
new criterion is minted and nothing counts an append-only record**, which
is the trap this lens exists for. ⭐ Tier: the seats' requirements are
**C**, the polity's — a venue sets what it will hire for. Whether the
valley hosts a noxious trade at all is also **C**, and is the most
interesting thing in this build nobody has to build.

### The finding: is `chandlery` a Discipline?

The pass says **no, and the chandler is still a trade.** Dipping has no
decision in it — a chain link with no decision produces procedure, not
emergence — so minting a Discipline for it would be fake pedagogy of
exactly the kind lens 1 warns about: a skill that decides nothing,
wearing a craft's clothes. What makes a chandler worth paying is *volume
and consistency*, which is the rejected-homemaker shape: universal
self-service with a specialist who is worth money anyway.

So the dip rides an existing Discipline, the chandler earns his living on
quality and scale rather than on a band, and `chandlery` stays off the
roster. ⚠ This is a departure from the slate, which assumed three crafts;
it is the pass doing its job.

---

## The drive

What a person does, in order, in the live game.

**At the valley**

1. Walk to Heart's Delight and into the farmstead yard. `look` — the
   yard, the barn, and now a flock. The slate on the barn shelf still
   prices what the farm sells.
2. `look flock` / read the book. A tally, a name, and heads that are each
   a particular animal rather than a number.
3. `draft 3` — one head out of the book, with a body you can look at.
4. `handle` it. A precise condition read, and the animal is a little
   easier for it. **Note the condition: it is about to matter twice.**
5. `shear` it. A fleece — *the first wool the realm has ever grown.*
   Carry it; it is going to the city too.
6. `slaughter` it. Quick, no ceremony, no confirmation. **A carcass on
   the yard floor**, and the head is written out of the tally. The book
   says what became of it.
7. `butcher` the carcass, with a blade. Cuts, offal, suet, bone and a
   green hide — *in the amounts this animal's size and condition earned,
   which is why step 4 mattered.* The same verb, on the same kind of
   object, as butchering anything else that has died.
8. `salt` the hide. It stops being on a week's clock and becomes cargo.
9. Put the offal and some bone where the farm dog eats. Walk away.
   **Come back and it has eaten** — on its own cadence, from its own
   feeder, with no verb typed.

**At the wood**

10. Go up to the Hanging Wood's oak clearing and `fell` an oak. Bole,
    logs, seed — **and bark**, which no oak has given before. The
    collier's clamp is not short of anything, because bark is not what he
    burns.

**At the city**

11. Carry the salted hide and the bark to Wharfside. Find the tannery on
    industrial ground, beside the outfall, below the whole city.
12. `tan` the hide with bark liquor. It takes time and it can be done
    badly: a weak liquor or a short pit gives you a hide that is not
    leather yet, and it tells you which.
13. Take the leather to the tailor at Mayfield Row and make the leather
    jerkin — **the recipe that has been correct and unmakeable since it
    was written.** Wear it.
14. Render the suet in a pot. Tallow — and now it is a different thing
    from what came off the carcass, by a step you performed.
15. `make candle` with the tallow. A candle that is greasy and yellow and
    smells of mutton. `light` it: it burns, and burns itself down.
16. Do it again with a cake of beeswax. **A different candle** — pale,
    smelling of honey — from the same act. Hold them up next to each
    other.
17. Take the bone to a field and work it in. The field's phosphorus
    answers, which closes the animal's circuit: it ate the field while it
    lived and feeds it now it has not.
18. Take the bran, the offal and some fat to the bakery and bake a dog
    loaf. Compare its price to a loaf for people on the same slate.
19. Find the knacker's yard. Bring him something dead that nobody
    butchered and watch it become hide, bone and fat rather than nothing.
20. Finally: `analyze grid` in the valley and in the city. Gas there,
    electric here — and you are carrying the cheap candle that competes
    with both.

---

## Acceptance criteria

Observable from outside the code, by a person playing.

1. A player can take an animal from alive to a worn leather jerkin
   without leaving the realm and without anything being conjured.
2. Butchering a beast you slaughtered and butchering one you killed in a
   fight are **the same act, on the same kind of object**, with the same
   skill and the same clock.
3. A better-conditioned animal visibly yields more than a poor one, and a
   sheep does not yield what a cow yields.
4. Typing `butcher` at a farm dog is refused, and the refusal reads as
   the world having a view.
5. Typing `butcher` at an animal you have **named** is refused
   differently, and says why.
6. A green hide left for a week is worth nothing; a salted one travels.
7. Two candles made by the same command look different, smell different,
   and came from different animals' or insects' fat. Both light a room.
8. The fleece a player shears can be spun and woven by the people who
   already do that for a living.
9. An oak gives bark; a birch does not.
10. A dog eats a loaf a player baked, without the player typing a verb
    at the dog.
11. Nothing a carcass produces has nowhere to go — and nothing the realm
    *claims* a carcass produces fails to appear.
12. A player can find all three new jobs standing vacant, see what each
    wants, and take one.
13. `dress` no longer means two incompatible things.

---

## Cross-references

**Seeding slates** — [rendering-slate](../slates/builds/rendering-slate.md)
(⚠ stale on candles; correct at the sweep) ·
[ranching-slate](../slates/builds/ranching-slate.md) ·
[cooking-slate](../slates/builds/cooking-slate.md) ·
[textiles-slate](../slates/builds/textiles-slate.md) (⚠ also stale — it
still calls leatherwork *"blocked on a hide faucet"*, which shipped) ·
[trade-roster-slate](../slates/tails/trade-roster-slate.md) ·
[food-safety-slate](../slates/builds/food-safety-slate.md) (the
`trade-butchery` spin-out test) ·
[forestry-slate](../slates/tails/forestry-slate.md) (oak bark → the
tanner, its own open design) ·
[zoning-slate](../slates/builds/zoning-slate.md) (the externality this
build declines to price) ·
[hunting-slate](../slates/builds/hunting-slate.md) (inherits the carcass
path free) · [dairy-slate](../slates/builds/dairy-slate.md) ·
[hearth & larder](../slates/tails/hearth-and-larder-design-pack.md)

**Subsystem docs** — [ranching](../subsystems/ranching.md) ·
[crafting](../subsystems/crafting.md) ·
[spoilage](../subsystems/spoilage.md) ·
[mortality](../subsystems/mortality.md) ·
[textiles](../subsystems/textiles.md) ·
[forestry](../subsystems/forestry.md) ·
[pets](../subsystems/pets.md) · [soil](../subsystems/soil.md) ·
[light](../subsystems/light.md) · [energy](../subsystems/energy.md) ·
[logistics](../subsystems/logistics.md) ·
[parcel](../subsystems/parcel.md) ·
[advancement](../subsystems/advancement.md) ·
[employment](../subsystems/employment.md) ·
[vocations](../vocations.md) ·
[settlement-model](../settlement-model.md)

**In flight** — the tapping build **merged to master on 2026-10-02**,
while this doc was being written. It lands two things this build should
read rather than rediscover: the tap substrate is now the engine's
rather than the ranching trade's, and the forestry pack gained a
sugaring chain, two new tree species and a sugarbush in the Hanging Wood
— the same wood this build takes bark from. The cold-storage work
(`design/cold-storage`) is what eventually moves slaughter out of the
city, per lens 5.
