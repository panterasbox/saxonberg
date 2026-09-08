# Pets — requirements

**Kind:** feature (with content)
**Leads from:** kernel for Wave 0 · content for Wave 1
**Kernel-led first consumer (W0):** the shipped conversational NPCs —
Dave, Mara, Remy, Odile, Katie. All five accumulate an opinion of you
through dialogue today, and all five forget it when the server restarts.
Wave 0 is justified whether or not a single pet ever ships.

A pet is an animal kept for itself. The realm has thirty animal species
and not one of them is kept for itself: every animal in the shipped world
is livestock, working stock, or a hazard. This build adds the third role
the ranching build named and deliberately left empty — **the animal whose
axis is the bond** — and pays off three defects found while designing it,
none of which are pet features.

Seeded by [pets-slate](../slates/builds/pets-slate.md) (read
§ *Reconciliation 2026-09-08* first — it settles where the bond composes,
what a pet is as a stored object, and how you query for one) and
[ranching-slate](../slates/builds/ranching-slate.md) (the shared husbandry
conventions).

---

## What already exists

**Verbs: the pet-shaped ones are mostly free — but ⚠ three of the most
obvious names are already TAKEN, by things with nothing to do with
animals.**

| name | already means | consequence |
|---|---|---|
| `feed` | ⭐ **feed the ground** — put compost on soil to restore nitrogen | a pet-feeding verb of that name would collide outright |
| `walk` | move, on foot | "walk the dog" cannot be spelled the obvious way |
| `play` | choose a character at the front door | "play with the cat" likewise |
| `handle` | work an animal (ranching) | the nearest shipped relative; keep |

⭐⭐ **This makes the feeding-vessel decision necessary rather than
merely elegant.** The design that avoids a `feed` verb was chosen on its
own merits; it turns out to be the only one available without taking a
name the soil already owns.

Genuinely free: `tame`, `pet`, `adopt`, `name`, `dub`, `call`, `heel`,
`train`, `befriend`, `groom`. `give` ships and force-moves the item, so an
offer a recipient may refuse has never existed.

**Animals: plenty, none of them companions.**

| animal | pack | kept for |
|---|---|---|
| collie, ox, cattle / sheep / pig / hen | trade-ranching | work, yield, meat |
| pit pony, **canary** | trade-mining | haulage, damp detection |
| draft horse | transport | haulage |
| wolf | newbie-wilds | it eats you |

**Substrate: almost all of it, already shipped and never pointed at a
companion.** Ownership of an animal, the temperament axis (earned by
contact, lost by neglect, reconciled across an absence, floored per
species), maturation from young to grown, brains, traits, advancement,
and a per-viewer opinion scalar. The ranching build put the temperament
axis in the kernel *explicitly because pets would want it*, and left its
per-species floor and ceiling unauthored — that empty slot is
domesticability.

**Disciplines: no new one needed.** `stockmanship`, `guarding`, `command`
and `awareness` all ship, and `magic-beast` is already in the catalogue
for the later apex path.

**Adjacent, unbuilt, and load-bearing on the wave order:** hunting is
unbuilt and the creature half of spawn-distribution is unbuilt, so
**there is no wild animal supply.** Wild taming has nothing to tame.

> **Therefore what is genuinely new here is:** every verb, an animal that
> exists to be liked, and the moment an animal stops being one of its
> kind and becomes somebody's. Everything underneath is shipped.

---

## Goals

- **An animal can hold an opinion of the person who keeps it**, earned by
  attention and lost by neglect, and that opinion governs how it behaves
  toward them.
- **An animal a player has won over persists as that animal** — across a
  logout, a restart, and an absence — while an animal nobody has won over
  costs the world nothing.
- **A player can name an animal**, and the naming is what makes it theirs
  rather than one of its kind.
- **A cared-for animal follows its person**, and a poorly-bonded one does
  not.
- **A player can ask a bonded animal for something, and be refused** — for
  a reason they can see, and never at random.
- **An animal can be kept alive by somebody other than its person**, and
  being kept alive by them buys them none of the bond.
- **Neglect is visible in the room** — in what is or is not in the dish —
  rather than in any figure shown to a player.
- **A player can leave an animal somewhere**, so that following is a thing
  they choose rather than a thing that happens to them.
- **An animal's reaction is worth reading** — it notices things a player
  cannot, and shows it by behaving rather than by reporting.
- **A companion ages, and dies of it**, on the same terms as every other
  animal, with the ending visible in advance.
- **An NPC's opinion of you survives a server restart.** (W0)
- **A player can ask the world which things are theirs.** (W0)
- **A role-filler does not accumulate a personal opinion of anyone.** (W0)

## Non-goals

- **Wild taming, the approach encounter, and the fear/threat axis** →
  pets-slate Wave 2. Additionally blocked: there is no wild population to
  tame.
- **A pet shop** → Wave 2. Its product is a *domesticated-but-unbonded*
  animal, which is the back half of taming; the shared dependency that
  once argued for shipping it beside adoption has already shipped
  separately, so the case for pairing them is weaker now, not stronger.
- **Pet combat staging and formation slots** → Wave 2. An animal in a
  room can already be attacked, and harm to a kept animal already lands
  in the harm ledger against its owner, which is the honest minimum.
- **The six-outcome off-screen ladder** (it wandered, it was hurt, it came
  home) and species home range → Wave 2. An absence is answered in this
  build by the bond cooling toward its floor.
- **Reading an animal's opinion of other PEOPLE** — a dog that likes a
  stranger, a cat that will not share a room with one → Wave 2. It is the
  perception channel pointed at the social graph and it is good, but it
  wants the multiplayer rules (whose regard, earned how, and read by whom)
  settled first.
- **Institution-held regard** — *the Watch's* opinion of you, shared by
  every watchman → Wave 2. It is a feature, and features do not belong in
  a wave whose job is closing holes.
- **Training as measured competence** — an animal holding graded skill in
  the acts it was taught → Wave 2. ⚠ Competence today is carried on the
  person-tier stack, which a companion animal is deliberately not on, so
  this is a real piece of work rather than a wiring job. Wave 1's asking
  is gated on the bond and the species alone.
- **Animal waste** → **ranching, not here.** Waste already has two shipped
  homes and needs no pet-specific mechanic: as a **resource** (soil names
  manure as the input to both its nitrogen and its organic-matter
  reserves) and as a **contaminant** (sewage is a named water contaminant
  that cleans itself over a few miles).

  ⭐⭐ **And the loop is broken at exactly one link.** Compost ships as a
  material, a compost pit ships as a place, feeding the ground ships as a
  verb, and the soil reserve it restores ships — **but nothing in the
  realm produces any muck.** The conserved *crops → feed → livestock →
  ? → crops* loop the ranching slate names is complete except for the
  return leg. That is a small, high-value ranching build, and the animal
  that matters for it is the cow, not the cat: a byre of cattle is where
  muck is a resource worth carrying, and a housecat's contribution is
  rounding error.

  ⚠ A litter tray therefore stays a **furnishing anyone may ship**, and
  territory stays unmodelled — not because waste is beneath the sim, but
  because its real weight is agricultural and belongs where the herd is.
- **Vermin and stored-food predation** → **its own build, and it is
  bigger than pets.** The realm has granaries, larders, warehouses, stock
  counters and a spoilage clock, and *nothing eats any of it*. That gap is
  what a mousing cat would fill, so a working cat waits for a food-storage
  build rather than dragging one in here.
- **An offer the recipient may decline** (handing a thing to an actor
  currently force-moves it) → Wave 2. In scope here only as far as
  offering food from the hand requires.
- **Upkeep as a standing charge** — a per-day fee for keeping an animal →
  **nowhere, deliberately.** The slate retracted this once already for
  failing the time-respect test, and the mitigation for absence is
  somebody filling a dish, not a subscription.
- **Breeding, pedigree and papers** → ranching-slate, which carries the
  breeding brief.
- **A pet Discipline.** Nowhere, deliberately: `stockmanship` is *working
  with animals*, and a pet is an animal you work with.
- **Maturation content** (a kitten growing into a cat) → nowhere in this
  build; the mechanism shipped with ranching and can be authored onto a
  species whenever someone wants it.

## Placement

**The kernel owns the capability and the verbs.** An animal that can hold
an opinion is not a trade, a place, or a firm, and no pack can own it: its
composers already span ranching and the commons with no shared ancestor,
which is the standing test for kernel-versus-pack. The temperament axis it
sits beside was placed in the kernel for this exact reason.

**The animals are content.** The cat's species row joins the general
species catalogue (`species-and-names`, which owns the catalogue;
individual trades own only their own stock). The cat itself is a commons
agent, joining the corpse as the second resident of that namespace.

⭐ **The collie moves nowhere.** It stays a working animal in the ranching
pack and gains the capability in place — which is the roles decision
paying off exactly as designed: an animal that is a working animal *and* a
pet does not need a fourth class.

> **The test — does a second instance need code?** No. A second companion
> species is a species row plus an agent row: a floor and ceiling on the
> temperament axis, and a description. No pack code.

## Collisions

- ⭐⭐ **The canary is already a proto-pet.** *"A canary in a wicker
  cage"* — a small animal you carry, that you have reason to care about,
  and that **dies to tell you the air is bad.** Any care model has to
  either explain why the canary is not a companion, or admit that it is.
  **It is.** The canary gains the capability; nothing else about it
  changes, and a miner who has kept one a long time should feel its loss.
- **Hinkley Lane** — the stray's home. The locality has **no agents at
  all** today, so there is nothing to collide with. The lane's own
  description does the work: a subdivision drawn for a hundred families
  that got one, where *the emptiness is the story*. One thin cat is the
  only living thing on it.
- **The dorm** — this settles the slate's standing question *"does the
  dorm admit a companion?"* by not asking it: the stray lives on a public
  lane, not in anyone's residence, so the on-ramp needs no residence
  permission. Whether a dorm room *admits* a pet stays open for Wave 2.
- **`give`** — pets would be the first caller ever to need an offer the
  recipient may decline. In scope only as far as feeding requires.
- **Player naming** — the naming slate governs *players* renaming
  themselves and defends load-bearing names against impersonation. Naming
  an animal is a different act, but it must not become a side door: a
  player should not be able to name their cat after a person whose name
  is load-bearing.

## Surface decisions

### The bond is opaque

**Q:** Does a player see how bonded their animal is?

**A:** **Never a number, and never a gauge.** The animal is read through
what it does — it holds back, it edges away, it permits a hand, it comes
when called. A player who wants to know where they stand has to watch the
animal.

The immersion lens decided this, on the standing property that roleplay
emerges from an honest simulation and dies when a gauge does the acting.
It also matches the two nearest shipped precedents — competence is shown
in bands and never as a score, and the blessed/cursed state of an item is
knowable but not displayed.

### Naming is the promotion, not a label

**Q:** When does an animal become an individual the world remembers?

**A:** **When it is named.** Before that it is one of its kind: real,
present, interactable, and costing the world nothing to keep. Naming is
the act that makes it *this* animal, and therefore the act that earns it
a place in the record.

This is the whole acquisition model. There is no purchase, no adoption
paperwork, and no ceremony — you feed a cat until it lets you near it, and
then you call it something.

⭐⭐ **And the animal is the one who decides, not you.** The threshold is
crossed from its side: it starts following you, waiting for you, being
where you are. Only then is there anything to name.

> **You do not acquire a companion. You are adopted by one, and naming it
> is how you admit it.**

This is the same threshold either way — what changes is who the sentence
is about, and that is not cosmetic here: **the axis this build runs on is
already *who decided*.** An acquisition model where the player claims the
animal would contradict the agency model two decisions below it, where the
animal may always refuse. Being chosen and being refused are the same
property seen from two sides.

### An unnamed animal is free; a named one is remembered

**Q:** What does the world store about an animal?

**A:** Nothing, until it is named. A stray is as real as any other animal
in a room and leaves no trace when the world reboots. A named animal
carries its own state — who it is, whose it is, how it feels about them —
and comes back as itself.

⚠ **Identity and durability arrive together or not at all.** An animal
that is individually identified but not durable would leave records
behind referring to an animal that no longer exists.

### Attention is the only thing you cannot delegate

**Q:** What does caring for an animal actually cost?

**A:** Food can be delegated, bought, or automated. **Being its person
cannot.** Anyone can feed a cat; only its person can be the one it comes
to. This is the values lens's answer and it is what keeps a companion from
becoming an optimization problem.

### Neglect cools; it does not destroy

**Q:** What happens to a bond across a long absence?

**A:** It cools toward a floor and stops. An animal you raised does not
become feral because you were away — it becomes **harder**, which is a
different and recoverable thing. Losing an animal entirely is a
relationship failure, never a billing or starvation failure.

The floor is per-species, and it is the same slot that says how winnable
a species is in the first place — a nearly-untameable animal cools
further, a thoroughly domestic one barely cools at all.

### The hand and the vessel — how an animal is fed

**Q:** What act feeds an animal?

**A:** ⭐⭐ **Two different ones, and the distinction is the whole care
model.**

- **From your hand** — the bond act. Intimate, unscalable, refusable, and
  the only way a stray is ever won over.
- **From a vessel you filled** — the household. A placed thing an animal
  feeds from, which **anyone** can fill.

This is not a new idea; it is the shipped doctrine made physical:
*automation maintains your assets, it cannot maintain your
relationships.* The vessel is the delegable material floor. The hand is
the part nobody can do for you.

⭐ **There is no `feed` verb.** You put food down and the animal eats it,
which is how animals are actually fed and which costs the build nothing:
placing things is shipped, the vessel is an ordinary furnishing that
persists with its owner, and **what is in it spoils on the shipped
clock.**

⭐⭐⭐ **And that is what makes neglect legible without a gauge.** You do
not read the animal's hunger. You look at the bowl. An empty one, or one
holding something turned, is a better signal than any number could be —
and it is a signal that sits *in the room*, where anyone visiting can also
see it.

⚠ **Substrate, not a bowl.** The thing being defined is *a placed vessel
an animal feeds from* — a saucer, a trough, a hayrack, a hanging feeder —
so a new one is content, never code. Nothing in this build may hard-code
the cat's dish as the concept.

⚠⚠ **The vessel does not exempt an animal from mortality.** There is one
mortality rule for every kept animal and a pet is not outside it: an
exemption would say *this animal's biology is different because you like
it*, while a cow two rooms away starves on the same clock. **What protects
a pet is that the material floor is cheap and delegable** — a neighbour, a
hired hand — never an engine carve-out. A standing per-day fee for keeping
an animal is separately out (see non-goals): the mitigation is somebody
filling a dish, not a subscription.

> **The governing test, from the slate:** *needs create occasions, acts
> create bond, and a need must never be a chore.* Filling the vessel is
> not the bond. Being there when it eats is.

### Pet food is a ladder, not a period

**Q:** What does a companion animal eat, and who makes it?

**A:** ⭐ **A processing chain with rungs**, exactly like every other
consumable in the realm — and the epoch lens is what decides this. The
mechanism is *a pet eats prepared food made from inputs people won't eat*,
and that mechanism is true in Rome and in New York. Only the **rung**
changes:

| rung | what it is | who can do it |
|---|---|---|
| gather | offal, scraps, milk, what the animal catches | anyone |
| preserve | dried, cured, smoked | an existing craft act |
| compound | a mixed, shelf-stable, sold feed | a trade with the Discipline for it |

⚠ **The top rung is kibble, and kibble is not an anachronism** — it is
rendered offal and grain, compounded. Refusing it as "not medieval" would
be treating the epoch as a setting constraint rather than the **dial** the
lens says it is. It arrives by Discipline, not by century.

⭐⭐ **And the bottom rung's input already exists as an absence.** A
butchered carcass currently yields meat, bone, hide and tallow — about
two-thirds of the animal. **The missing third is the offal**, and it is
precisely what a cat eats. Making it a yield turns butchery's waste into
this build's staple and teaches the lesson ranching's pig already
teaches: waste-to-value.

⭐ The geography falls out unauthored: **an animal is cheap to keep near a
butcher or a dairy and expensive far from one.**

### Agency — you set the animal's job, and you may ask

**Q:** Can a player issue commands to their animal?

**A:** **Yes, but never as a command line into an animal's head.** A
closed vocabulary of things the animal was individually taught, each of
which it may decline — plus a standing job it does on its own.

⚠ The realm has **no order-an-actor surface at all** today, so whatever
this is, it is new. But the game has already answered this question once,
for directing allies in a fight, and the ruling is binding here:
**set-policy-then-watch is the text-native answer.** A pet that took
barked orders in real time would be the same game answering the same
question two different ways.

Both halves are shipped shapes already: an animal with a standing job is a
working animal (the farm collie has one now), and a thing you ask in the
moment is an ordinary verb.

⭐ **One member of that vocabulary is load-bearing rather than
decorative: *stay*.** A companion that follows you everywhere follows you
into a mine, a fight, a slurry pit and a fire. Being able to leave an
animal somewhere is not a convenience — **it is the only way a player can
take responsibility for it**, and a build that ships following without it
has made the player's care impossible to act on.

⭐⭐ **Refusal is load-bearing, not flavour.** The automation ladder this
family runs on is *attention → wages → compute*, and the working animal is
the rung that **costs a relationship**. If asking is free and reliable, the
animal becomes free labour and that rung collapses into the other three.
An animal that can always be told is not a companion; it is a tool with a
face.

⭐ **And a refusal must never be random.** It is legible or it is noise:
the dog did not ignore you, the dog is watching the fox.

### An animal's reaction is a perception channel

**Q:** Does a companion tell you anything about the world?

**A:** ⭐⭐ **Yes, by reacting — never by reporting.** A bonded animal that
will not go through a door, that stares at an empty corner, that growls at
somebody, or that refuses food you were about to eat, is **information**.
It is not a readout, it cannot be queried, and it can be wrong.

**The realm already ships one of these and calls it a canary.** An animal
whose reaction is the instrument is a solved shape here; what is new is
only that a companion does it for things other than bad air.

What it covers, all of it already built:

| the animal reacts to | the shipped thing it is reading |
|---|---|
| ⭐⭐⭐ **food that will make you ill** | the silent contamination population |
| somebody who is not who they appear to be | disguised identity |
| a person nobody in the room can see | concealment |
| a room that is not safe to walk into | hazards |

⭐⭐⭐ **The first row is the important one.** Contamination is
*deliberately* undetectable — no sense reports it, by design, and that is
the whole point of the silent second population. **An animal's refusal
would be the only warning that exists in the game.** It stays legitimate
because it is a creature's judgement rather than an instrument's reading:
it is not always offered, the animal does not always notice, and a cat may
decline food for no better reason than being a cat.

⚠ **The obvious exploit — taste everything on the cat first — is
acknowledged and accepted.** It costs the animal, an animal that has been
made ill trusts you less, and the biddability axis means it will not
reliably eat what you put in front of it anyway. Food tasters are a real
institution; a player who reduces their companion to one has said
something about themselves that the world can see.

### A companion dies of old age, and you will be there

**Q:** How long does a companion live?

**A:** **As long as its species really lives** — and at the realm's clock
that is a length of time a player will actually sit through.

| | lifespan | in real time at the shipped scale |
|---|---|---|
| a cat | ~15 years | **about fifteen months** |
| a dog | ~12 years | **about a year** |

⚠⚠ **This is a decision, not a consequence to be discovered at authoring
time.** Species already carry lifespan and senescence as authored data, so
somebody will type a number, and that number schedules every player's
grief. It should be typed on purpose.

**There is no carve-out**, and the reason is D29's: an exemption would say
*this animal's biology is different because you like it*, while a cow two
rooms away ages on the same clock. What softens it is not an exception but
**warning** — senescence is visible, so an old animal reads as old, and
nobody is ambushed.

⭐ This is the strongest emotional content the build can produce, it costs
nothing to implement, and it is the thing that finally gives the
necropolis a customer.

### When its person dies, nothing special happens

**Q:** What becomes of an animal whose owner is gone?

**A:** ⭐ **Nothing that needed designing — and that is the finding.**
Every part is already decided by something else:

- The **bond cools**, because nobody is renewing it. A permanent absence
  is an absence.
- The **material floor still works**: anybody who fills the dish keeps it
  alive, and earns none of its regard for that.
- **Somebody else can win it over**, on exactly the terms the first person
  did.
- **Title** goes where a dead person's movables go.

So the dog waits by the door, and gradually stops. Nobody wrote that; it
is what these four rules do when the person stops coming back.

⭐⭐ **And it means a companion outlives the relationship and carries it.**
An animal that is slowly becoming available again is how one player learns
that another is gone — and if its person returns (which in this world they
may), they come back to a colder animal and have to do some of it again.
Which is correct, and also needed no code.

### Domesticability rides the existing slot — but biddability is its own

**Q:** Does a species need new "how tameable is this" data?

**A:** For **winnability**, no. The temperament axis already carries a
per-species floor and ceiling and has shipped with them unauthored.
Authoring them *is* declaring how winnable the species is.

⭐ **And a species that declares nothing is not "untameable" — it is not
in the conversation.** Three states, and the middle one is content: a
species can be winnable, a species can be declared unwinnable (which is
what makes an apex animal interesting later), and a species can simply not
be the kind of thing the question applies to.

⭐⭐ **For biddability, yes — and it is a SECOND axis, not the same one.**

> **Winnability and biddability are orthogonal.** A cat is highly winnable
> and barely biddable. A working dog is biddable the moment it is bonded.
> A half-wild horse is hard to win and very biddable once won.

Collapsing them would make every well-loved animal obedient, which is
false about animals and would quietly delete the more interesting half of
this build. The two species shipping in Wave 1 are the proof, and the cat
is the **control group**: it must be allowed to simply not.

⭐⭐⭐ **The tell is not whether it moves — it is who decided.** A cat
follows you down a lane because it feels like it; a dog comes because you
asked. Identical from the outside, opposite in provenance, and that
distinction is the whole axis made legible without a number.

---

## Lens pass

**1 · Pedagogy.** The Discipline is `stockmanship` — no new one. What is
being taught is **patience under a delay you cannot shorten**: care now,
result later, and no way to rush it. ⭐⭐ And the cat teaches a second
thing the dog cannot: **you can be loved and not obeyed.** A well-bonded
animal that declines you separates affection from compliance — true of
animals, truer of people, and not a lesson many games are shaped to
deliver.

⭐ The supply chain teaches its own lesson, and it is the one ranching's
pig already teaches: **waste-to-value.** A third of every butchered
carcass currently goes nowhere; the thing that keeps your cat alive is
made out of it. The world stays derivable because the
animal's state is legible in its behavior rather than hidden behind a
number, and because how winnable a species is, is authored data rather
than a class decision made once by a programmer.

**2 · Creative expression.** The ordinary case needs no code: a species
row with a floor and a ceiling, an agent row with a description. The
bespoke case works too — any pack can declare an animal winnable without
asking the kernel for permission, and one that declares nothing is
silently *not applicable* rather than silently broken.

⚠ **The feeding vessel is where this lens has to be enforced, because it
is where it is easiest to fail.** The concept is *a placed vessel an
animal feeds from*, not *a cat's bowl* — a trough, a hayrack, a hanging
seed-feeder and a saucer are the same thing, and a new one must be two
rows and no code. Naming the first consumer instead of the substrate is
the standing failure mode here.

⭐ And where the engine declines to model something — territory, play as a
metered need — that is a statement about the **engine**, never a
restriction on authors. A litter tray is a furnishing anybody may ship;
it simply is not a mechanic.

**3 · Immersion & roleplay.** ⭐ **This lens decided the build's most
visible property** — the bond is never shown. A cat that will not come to
you is the whole mechanic, delivered without a single number reaching the
player.

**4 · Values.** The choice forced is **where your attention goes**, and it
is a real cost because attention is the one input this build refuses to
let you buy, hire, or automate. Standing is conferred by the animal and by
nobody else: no title, no rank, no announcement — it either comes to you
or it does not. ⚠ And the animal keeps the right to say no, which is what
stops a companion becoming staff: the moment asking is free and reliable,
the relationship is a payroll line.

**5 · Epochs.** People have kept cats for nine thousand years; the
mechanism is indifferent to the century. Only the dynamics change — a
Roman cat is a mouser, a New York cat is a companion, and the same animal
under the same rules is both.

⭐⭐ **This lens decides the food chain, and it decides it against the
obvious answer.** *"No kibble, we are medieval"* treats the epoch as a
setting constraint, which is the exact reading this lens exists to refuse.
Kibble is rendered offal and grain, compounded — **the same mechanism at a
further rung**, reached by Discipline rather than by date. The chain is
gather → preserve → compound at every epoch; only who can do which rung
moves.

The magic axis has its own Discipline already in the catalogue for the
later apex path.

---

## The drive

Run against the live game before the MR opens.

### Wave 0 — the ground is clear

1. Log in. Talk to a bartender until the conversation moves them —
   choose the generous options, not the rude ones.
2. **Restart the server.**
3. Talk to them again. **They still know you** — the conversation resumes
   from where you stood, not from zero.
   *(Today they have forgotten. This is the defect.)*
4. Ask the world what belongs to you. **Your possessions come back.**
   *(Today the answer is empty, silently.)*
5. Find a role-filler with no name — a sentry, a hewer. Nothing you do
   builds a personal opinion in them: the role is a mask.

### Wave 1 — the cat on Hinkley Lane

6. Travel to Hinkley Hills and walk up the lane. Among the empty lots,
   **a thin cat**, keeping its distance.
7. Look at it. You are told how it is holding itself — wary, watchful, not
   coming closer. **No number anywhere.**
8. Try to touch it. **It moves off.** You have not earned that.
9. **Offer it something from your hand** — a scrap of offal off a
   butchered carcass. It waits until you step back, then eats.
10. Offer again over the following days. Its description changes: it stops
    leaving when you arrive.
11. Try to touch it again. **It permits it.**
12. Name it. It is yours now — and the name sticks to *this* cat, not to
    cats in general.
13. Walk down the lane. **It follows you** — and nothing you did asked it
    to. It came because it felt like it.
14. Now **ask it to come.** It looks at you. ⭐⭐ **It does not come.** The
    bond is not the problem and nothing says it is; this is a cat.
15. Put a dish down where you live and fill it. The cat eats from it
    without you present. **Have somebody else fill it** — that works too,
    and the cat is no fonder of them for it. ⭐ *The floor is delegable;
    the bond is not.*
16. Head somewhere no animal should follow you. **Leave it behind**, and
    it stays. Come back and it is where you left it.
17. Put down something for it that has quietly gone bad — meat off a
    carcass left too long. ⭐⭐⭐ **It will not touch it**, and nothing in
    the game would otherwise have told you. *Eat it yourself and find out
    why it was right.*
18. **Log out. Log back in.** It is still there, still named, still knows
    you. ⭐ *This is the step the build exists for.*
19. Stay away a game month. Come back to **a dish with something turned in
    it**, and a cat that is cooler with you and has not gone feral. ⭐⭐
    *Nothing told you a number. The room told you.* Feed it twice and you
    are back.
20. Go to the ranch and spend time with the collie. It bonds on the same
    terms — and it is still a working dog, still doing its job, better for
    being known.
21. **Ask the collie to come. It comes.** ⭐⭐⭐ *Same care, same bond, same
    verb, opposite answer — and the reason is the animal, not the player.*
22. Ask it again while something else already has it — stock on the move,
    or the fox in the yard, whichever the world offers. **It does not
    come**, and you can see exactly what it chose instead. ⚠ *A refusal
    you cannot explain from the room is the defect this step is looking
    for.*
23. Look at an animal near the end of its span. **It reads as old** — you
    can see it coming, and nothing had to announce it.

⚠ **Not drivable in one sitting, and stated so it is not mistaken for a
gap:** an animal dying of age takes about a year of real time, and an
animal outliving its person takes as long as that takes. Both are
consequences of rules this drive *does* exercise — the visible ageing in
step 23, and the cooling in step 19 — rather than separate machinery.

---

## Acceptance criteria

Observable from outside the code, by a person playing.

1. A player can walk up Hinkley Lane and find an animal that reacts to
   how it has been treated.
2. A player who has never fed the cat cannot touch it; a player who has
   fed it repeatedly can. Neither is told a number at any point.
3. A player can name the animal, and afterwards the world refers to it by
   that name.
4. A player logs out and back in, and their named animal is the same
   animal — same name, same standing with them.
5. A player returns after a long absence to an animal that is harder to
   handle than it was, and never to one that has become wild or vanished.
6. A player can do the same thing to the farm collie, and the collie is
   still a working dog afterwards.
7. A player asks their well-bonded cat to come and **it does not**; asks
   their equally-bonded collie and **it does**. Nothing about how the two
   were cared for differs, and the player is never shown a figure that
   explains it.
8. A player is refused by an animal at a moment when they can see what it
   is attending to instead — never for no visible reason.
9. A player who has been away returns to a dish holding food that has gone
   over, and understands the animal has been neglected **without being
   shown a figure of any kind**.
10. A player asks a friend to feed their animal while they are away; the
    animal is fine when they return, and **the friend has gained none of
    its regard**.
11. A player can obtain animal food at the bottom rung by butchering, and
    a player with the relevant craft can turn it into something that
    keeps.
12. A player can leave an animal somewhere and go on without it, and find
    it there when they return.
13. A player offers their animal food that has silently gone bad and **it
    refuses**, in a situation where nothing else in the game would have
    warned them.
14. A player looking at an aged animal can tell it is near its end without
    being shown a figure or given a warning message.
15. A player is never told, by any interface, that the animal they have
    just been adopted by is now theirs — they work it out because it
    followed them home.
16. A player talks to an NPC, the server restarts, and the NPC still knows
    them.
17. A player asks the world which things are theirs, and is answered.
18. A second companion species can be added by a content author writing two
    rows and no code — including how winnable it is and how biddable, which
    are separate answers.
19. A second kind of feeding vessel — a trough, a hayrack — can be added
    the same way.

---

## Cross-references

- **Seeding slates:** [pets-slate](../slates/builds/pets-slate.md)
  (§ *Reconciliation 2026-09-08* is binding) ·
  [ranching-slate](../slates/builds/ranching-slate.md)
- **Subsystems:** [ranching](../subsystems/ranching.md) (the roles split;
  the temperament axis) · [belief](../subsystems/belief.md) (the opinion
  scalar) · [identity](../subsystems/identity.md) (the role-versus-person
  rungs) · [chattel](../subsystems/chattel.md) (who owns an animal) ·
  [persistence](../subsystems/persistence.md) (what the world remembers
  about one of many) · [behavior](../subsystems/behavior.md) (following) ·
  [husbandry](../subsystems/husbandry.md) + [race](../subsystems/race.md)
  (species data, maturation) · [mql](../subsystems/mql.md) (asking what is
  yours)
### ⭐ Forward pointer — the necropolis's first customer

Noted 2026-09-08, **not in this build.** The necropolis is already
designed as a LULU town in
[settlement-model.md](../settlement-model.md) — `civic` ground, plots of
about four units, sold in rows, provisioned as a warren, on the reading
that *a cemetery is a subdivision*. It has never had a reason to exist
yet.

**Pets are a better first customer for it than people are.** A pet death
is frequent, personal, and politically weightless: you get the grief and
the plot economy without inheritance, wills, rites, or the question of who
owns a body. And this build already produces the input — one mortality
rule, no exemption, and a corpse that behaves like any other.

Whoever picks up the necropolis should start here rather than with human
remains.

- **Adjacent slates, deliberately not consumed:**
  [hunting](../slates/builds/hunting-slate.md) and
  [spawn-distribution](../slates/builds/spawn-distribution-slate.md) (no
  wild supply — why Wave 2 waits) ·
  [naming](../slates/tails/naming-slate.md) (the impersonation defense a
  pet name must not sidestep)
