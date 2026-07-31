# Pets slate (working doc) — the creature you won over

> **Reconciled 2026-07-31** against the husbandry sessions (pets · ranching ·
> farming · stewardship). Contradicted text is struck in place; the full ledger
> — what changed, what those sessions newly **constrained**, and the one hole
> they opened (**now closed** — see *The off-screen life*) — is in **[§
> Reconciliation](#reconciliation--what-the-husbandry-sessions-changed-2026-07-31)**.
> The shared convention set is owned by [ranching-slate § The five shared
> conventions](./ranching-slate.md).

> **Status: design explored deep; not yet requirements.** Player pets, taken
> through the NetHack lens and stress-tested against the live subsystems.
> **Taming is the spine** — a pet is a creature you *won over*, not a unit you
> bought. The design is experience-first (built around the *moments* players
> will tell stories about) and almost entirely composition of shipped
> substrates. Entry point to the slate → `/requirements` → plan → build loop.
>
> The original stress-test surfaced three structural gaps (possession, a
> fear/threat axis, dependent-presence + instance persistence). **Two closed
> during the 2026-07-30/31 husbandry sessions** — only the **fear/threat axis**
> remains, and it is still what Wave 2 is for. See *Reconciliation* below for
> what those sessions changed, and what they left open.

See also — substrates this stands on: [belief.md](../../subsystems/belief.md)
(the **bond = regard edge**, recognition, regard) ·
[trait.md](../../subsystems/trait.md) (temperament / dispositions) ·
[behavior.md](../../subsystems/behavior.md) (pet brains — follow / react / flee)
· [race.md](../../subsystems/race.md) (Creature/Character split; `Species` data
— where **domesticability** lives) · [vitals.md](../../subsystems/vitals.md) +
[metabolism.md](../../subsystems/metabolism.md) (hunger / care; the
reconcile-on-read pattern — **note the pet does NOT presence-freeze**, see Care
& loss) · [senses.md](../../subsystems/senses.md) +
[locomotion.md](../../subsystems/locomotion.md) +
[posture.md](../../subsystems/posture.md) (manner-of-approach seams) ·
[conveyance.md](../../subsystems/conveyance.md) (mount / pack couplings) ·
[banking.md](../../subsystems/banking.md) +
[employment.md](../../subsystems/employment.md) (the pet-shop / vendor as a
**Business**) · [persistence.md](../../subsystems/persistence.md) (**the
instance-persistence answer** — a keyed `PersistableMixin` host; the
`documents`-kind sketch is retired) ·
[fasttravel.md](../../subsystems/fasttravel.md) +
[location.md](../../subsystems/location.md) (transit / home). Related slates:
[npc-behavior-slate](./npc-behavior-slate.md) (a pet is an *owned NPC*; tameable
fauna are Character-tier carves) ·
[species-expansion-slate](../tails/species-expansion-slate.md) (pet/animal
species are carves) · [dorm-warren-slate](./dorm-warren-slate.md) (where a pet
lives) · [reputation-slate](./reputation-slate.md) (regard, scoped to the
animal) · [provenance-slate](./provenance-slate.md) (authorship — *not* the
possession gap this surfaces) · **[property-slate](./property-slate.md) (the
parent — the possession/custody substrate this build consumes)** ·
**[stewardship-slate](./stewardship-slate.md) (the gate — land use decides
whether your residence admits a companion at all, and how many; the dorm is the
ladder's bottom rung).**

---

## The frame — a tame creature in a consistent world

**Reference point: NetHack.** NetHack pets are the most beloved pet design in
games, and they teach one deep lesson:

> **A NetHack pet is not a "pet system." It's a tame monster in a consistent
> world — and every beloved pet moment is *emergent*, not a feature.** Nobody
> designed "shop theft": it falls out of *pets pick up items* + *shopkeepers
> charge **you**, not your cat* + *pets follow you out the door*. The magic is
> that the world's ordinary rules apply to the pet too, and *interact*.

That maps onto this engine better than onto anything, because we already *have*
the consistent simulated world. So the design is not "build a pet feature set."
It is: **make a pet a first-class inhabitant the whole world treats as a real
agent, add the two missing atoms (custody + a bond), and then go prospecting for
the emergent moments the way NetHack players discovered them.**

We think in **experiences** — the stories a player tells — and derive the
mechanics from them. The pet fantasy is *companion + care-sim + utility at once*
(three faces of one cat, not a menu to pick from). It is explicitly **not
battle/collectible** — no Pokémon roster, no pet-battle-as-the-game. A pet
fights in the *world's own* combat as a companion (when combat lands); it is
never a separate battle minigame.

## The spine — taming is the game

NetHack taming is mostly a scroll or a spell: *instant, magical, shallow*. The
fantasy it reaches for — turning a wary wild thing into a companion — is exactly
what our belief / regard / disposition substrates were built to do. So we can
**realize the fantasy NetHack only gestured at.**

> **A pet is a creature you *won over*. Because our creatures already perceive
> you, remember you, and have a temperament, taming is a real *encounter* with a
> real animal, not a dice roll. The pet you keep is the trophy of that
> encounter.**

### Three layers, cleanly separated (and biologically honest)

| Layer | Scale | Lives on | Role |
|---|---|---|---|
| **Domesticability** | species | `Species` data field (like `specificHeat`) | how inclined the *species* is to deal with people — sets *difficulty*. Dog: high · wolf: low-but-possible · dragon: ~zero (magic-only) |
| **Temperament** | individual | dispositions ([trait.md](../../subsystems/trait.md)) | skittish / proud / greedy — the *shape* of the encounter; which approach works |
| **Bond** | individual | `regard` ([belief.md](../../subsystems/belief.md)) | *this* animal's loyalty to *you* — the current score |

Species sets the difficulty; temperament sets the puzzle; bond is the score.
This mirrors real ethology — **domestication is an evolved species trait,
tameness is an individual state** — and it collapses "what's tameable at all"
into a single authored knob.

### Domesticability *is* a dial on the fear axis

The elegant unification: ethologically, domestication just **is a suppressed
flight response toward humans.** So domesticability and the (missing)
fear/threat axis are **one axis at two scales**:

- **Wild creature** = high fear-baseline → taming = *managing that fear down*
  through how you approach (the encounter).
- **Domesticated creature** = fear-baseline ~zero → no fear to manage → straight
  to bonding.

The fear substrate, once built (Wave 2), takes **domesticability as its
species-level parameter.** Wild and tame are just the two ends of the same
model.

### The taming *encounter* (Wave 2, the wild path)

The moment, beat by beat:

1. **You spot something wild.** It has a temperament, perceives you (senses),
   and already holds a wary regard toward you — seeded from its species
   domesticability, your reputation, and trait-compatibility. *You are judged
   before you act.*
2. **How you approach is the game.** Armed / loud / fast → it bolts or bristles
   (fear rises, regard drops). Slow / calm / crouched → it tolerates you.
3. **The offer, read right.** Right food, right distance, no grabbing → regard
   climbs. Push too fast → setback.
4. **It chooses you.** A handful of *good reads* — not a grind — and its regard
   crosses the line where recognition flips and it's yours.

The depth is that **temperament makes every creature a different puzzle**: a
skittish deer is a distance problem; a proud wolf won't be bought with food and
respects that you don't flinch; a greedy raccoon is trivial but fickle. **The
puzzle is reading the animal, not repeating the action** — replayable without
being repetitive. Structurally it's a *wordless conversation* and can ride the
same engagement/state-machine substrate as
[npc-dialogue](../../subsystems/npc-dialogue.md).

### The acquisition ladder — one knob (domesticability), four on-ramps

Shops don't *bypass* taming — they sell the **back half** of it.

- **Adopted (the gift) — *the DF cat.*** A **stray** in a high-traffic venue
  accrues regard toward whoever it repeatedly encounters, and at a threshold it
  simply **starts following them**. You did not ask, and you were not trying.

  > **This is the purest statement of the spine, not a softer one.** The shop is
  > a transaction and the taming encounter is a *performance* — you execute the
  > right moves and the animal responds to your technique. Adoption is
  > the only path where the animal's judgment of you is **uncontaminated by you
  > performing for it.** The most honest version of *won over* is the one where
  > you weren't trying.

  - **Proximity buys opportunity; who you are decides the outcome.** Trait
    compatibility, reputation, and how you actually behaved around it — so two
    regulars in the same tavern get different results from the same animal.
  - **The cat can pick the wrong person** — possibly the one who never fed it
    over the one who did. Keep this. It is true to life, it is funny, it
    generates real social friction, and it enforces that **regard is not
    purchasable**.
  - **You cannot refuse the adoption — only the custody.** It decides you are
    its person; *you* decide whether to make it official (name it, take it home,
    chattel-stamp it). Until then you have **a stray that has adopted you and
    that you have not yet admitted is yours** — the custody⊥bond orthogonality
    producing something charming on its own.
  - **An adopted stray is no longer available** to adopt anyone else. Personal
    and scarce, not a dispenser.
  - **Anti-grind:** never show progress (the opacity rule — you cannot farm what
    you cannot see); make **elapsed days** matter rather than repetitions; make
    compatibility decisive so repetition alone can't get there for the wrong
    person; and let the animal **visibly warm** first, so the moment reads as
    earned-but-unasked rather than random.
  - **Cost:** one `strays` brain (the `greets`/`introduces` witness-on-arrival
    shape) + the `follow` brain Wave 1 needs anyway. **Cheaper than the shop.**
  - **Content:** one carved stray in a high-traffic venue — the Duncan lobby,
    the tavern, the quad — **serves every new player who passes through**, which
    is the "NPCs are expensive carves" rule paying off unusually well. Sits
    naturally beside Katie's move-in beat.

- **Buy (the choice).** A pet-shop [`Business`](../../subsystems/employment.md)
  sells creatures that are **domesticated but *unbonded*** — fear-baseline ~zero
  (safe to stand near), but **regard-toward-you neutral**. You still earn its
  loyalty. **Bonding an unbonded creature *is* the core taming loop** — the shop
  just removes the dangerous wild/fear front-half. *Taming stays the thing even
  on the easy path.*

  **Adoption does not replace it — the two are different registers.** *Adoption
  is what happens to you; purchase is what you choose.* The shop is where you go
  for a **specific** animal: a working dog, a hunting bird, a species you want.
  The Wardens' supply chain is upstream of the shop, so the guild's demand
  anchor is untouched.

  **Substrate (verified 2026-07-31):** a pet shop is a `Stock` — a `Vessel` +
  `PricedOfferMixin` + `ResettableMixin` — whose `stockLines`
  (`{itemTemplatePath, par}`) point at animal templates; `buy` already stamps
  ownership. Two consequences:
  - **Shop animals are template clones; strays are individuals.** `reset()`
    restocks by cloning, so a shop animal arrives blank — exactly right for
    *domesticated but unbonded*, and it sharpens the emotional split. But the
    sale needs a **mint-an-individual seam**: at purchase the clone acquires its
    chattel id and becomes a keyed persistable host. Adoption needs no such
    moment; a stray is an individual from the first encounter.
  - **A pet shop is compute-expensive, and that is honest.** `Behaved` always
    vetoes eviction (re-cloning would erase the behavior spec), so **every
    stocked animal is a Character-tier NPC pinned in memory** — four species at
    par 3 is a dozen live NPCs standing there permanently. Not a bug to
    engineer around: it is exactly what the allowance meter exists to price
    ([stewardship](./stewardship-slate.md)). Keeping live animals costs more
    liveness than keeping torches, and the shopkeeper pays it.
- **Tame wild (the trophy).** A wild creature: front-half (manage fear via
  approach) **plus** back-half (bond). Gated by species domesticability +
  individual temperament. The aspirational, story-generating path.
- **Magic (the apex).** A charm/scroll/figurine analog for the things patience
  can't win — the zero-domesticability species. "I tamed the dragon." Rare,
  costly; keeps NetHack's scroll-of-taming and figurine-becomes-a-pet.

## The signature moments — and what generates each

The pet experience as the stories players will tell, mapped to what our world
already does. *Design the rules; harvest the emergence.*

**Free or nearly free (the world already does this):**
- *"My cat follows me into every room."* — the core relationship. A `follow`
  brain on the arrival/departure witness triggers we already have.
- *"I named her Mittens."* — yours, named, remembered from minute one. The
  emotional bond is mostly *this*.
- *"Feed it or it drifts."* — the bond **is** regard; feeding **is** metabolism.
  Care is *light* (see below).

**A small brain each (delightful emergent utility):**
- *"My dog dropped a dagger at my feet."* — apport/fetch. A `Creature` is
  already a `Container`; add a fetch brain + carry-to-owner.
- *"My kitten won't step on that amulet — it must be cursed."* — the BUC sniff.
  The pet brain reads the BUC-known belief realm and *refuses cursed things*;
  you infer the curse. Wires straight into the **magic-items / BUC** work — the
  pet becomes a diegetic BUC-identification tool. Same brain family scouts traps
  and danger.

**Emergent from the economy (parked — economic blast radius):**
- *"My dog grabbed the good bottle and carried it out — nobody charged me."* —
  the shop-theft rite. Falls out of `Business`/`settle` + pet-carries-items +
  follow. **Deliberately not a headline** — it depends on the possession/theft
  gap below and has real economic implications; captured, not queued.

**Deferred but shaped:**
- *"My puppy grew into a war-dog."* — **unblocked 2026-07-31.** Growth is the
  maturation gap (now forced by ranching); "grew *into* one" is the pet's own
  `Discipline` transcript (§ *Bonding + needs*); and the combat-ally half is no
  longer gated — see § *Combat*.
- *"I tamed the dragon."* — magic taming of an apex species (Wave 3).
- *Riding.* — a rideable species is `Companion + Mountable`; mounts already
  ship.

## Care & loss — light, on purpose

**We respect players' time.** Care is *feed it occasionally*, not a Tamagotchi
grind and **not a money sink** (the earlier boarding-fee economy is
**retracted** — upkeep as a standing financial commitment fails the time-respect
test).

- **Neglect cools the bond.** Ignore the animal and its regard drifts down;
  extreme neglect → it goes feral and **leaves you**. **Loss is a *relationship*
  failure — not starvation-death, not a billing failure.** (Rhymes with NetHack:
  tameness decays, hits zero → wild.)
- ~~**Offline = freeze.**~~ **[SUPERSEDED 2026-07-30 — see [ranching-slate § The
  clock](./ranching-slate.md)]** The family now runs **one uniform clock**:
  *things you own reconcile against world time; the body you inhabit reconciles
  against played time.* A pet does **not** freeze when you log off. The
  time-respect goal this line was protecting survives untouched, because it was
  never about the clock — it was about the **shape of the consequence**:
  - The pet's **bond** drifts while you're gone, and at the floor it goes feral
    and leaves — a recoverable, story-generating loss.
  - The pet's condition curve is **asymptotic toward "miserable but alive."** It
    never starves to death. (A *ranch* animal does die of neglect — that's the
    economic stake, and it has a paid mitigation. Deliberate divergence.)
  - **Automation maintains your assets; it cannot maintain your
    relationships.** A hired hand or kennel keeps the animal fed and healthy —
    the material floor is cheap and delegable. **Bond is only earned in
    person.** This is what the retracted boarding-fee economy was groping for,
    without the standing financial commitment.

## Bonding + needs — the care loop **[DECIDED 2026-07-31]**

The reference here is the Japanese care-sim lineage (Tamagotchi, Nintendogs,
Monster Rancher / Digimon, and Harvest Moon's barn) — but taken for **what it is
actually loved for**, which is not what it is usually copied for:

> **Those games are beloved for their *acts*, not their *meters*.** Nintendogs
> is remembered for petting the dog and calling its name, never for a hunger
> bar. Tamagotchi's needs are the least-loved thing about Tamagotchi; what
> people remember is that **care quality decided what it became**.

The governing rule that falls out:

> ### Needs create occasions. Acts create bond. A need must never be a chore.

### Four needs — and only one is yours alone

| Need | Substrate | Delegable? |
|---|---|---|
| **Food / water** | metabolism (shipped) | **yes** |
| **Warmth / shelter** | thermal (shipped) | **yes** |
| **Safety** | hazard / concealment (shipped) | **yes** |
| **Attention** | `regard` | **no** |

Three material needs, all on shipped substrate, all auto-satisfied at home by a
bowl and a warm room — they bite only on expedition or through real neglect.
Then one nobody can cover for you.

**That table *is* the "automation maintains your assets; it cannot maintain your
relationships" rule, expressed as a needs model.** The kennel handles rows one
to three. Row four is why you come back.

### The acts

| Act | Rides | What it is really for |
|---|---|---|
| **feed** — a *preferred* food | metabolism + species prefs | the need is the excuse; **the preference is where the bond lives** |
| **pet / stroke** | the accept-refuse hook | pure bond — the Nintendogs core |
| **play / fetch** | engagement + the fetch brain | bond, and the on-ramp to the utility loop |
| **groom / brush** | condition | bond + visible wellbeing |
| **walk together** | it follows you | bond by mere presence — the passive accumulator |
| **name it, call it** | `NamedMixin` + recognition | the identity act; the biggest single emotional beat |
| **speak to it** | Vocal | cheap, expressive, always available |

All shipped or near it — and they need exactly the **accept/refuse hook** this
slate already flags as missing for `give`→`offer`, so petting and offering share
one seam.

### The anti-grind is that the animal can say no

If petting grants bond, players will spam petting. Diminishing returns would fix
that mechanically and kill it emotionally. The better answer:

> **You cannot pet a cat that isn't in the mood.** Whether an act lands depends
> on the animal's **temperament**, its **current state**, and **how it already
> feels about you**.

This makes the animal an agent rather than a slot machine, it is true to actual
animals, and it is squarely the genre (cats in these games famously refuse).
**The refusal is the personality.** And it produces the loop: a low-bond animal
declines more, so you have to read it — and the reading is the game.

Which gives the unification worth building on:

> **Bonding *is* the taming encounter, continued at low stakes, forever.** The
> same skill — read the animal, pick the right approach — daily instead of once.
> That is precisely what the shop sells when it sells "the back half of taming."
> **The back half is this.**

The three things you read are **temperament** (traits, shipped), **current
state** (hungry / cold / tired / just ate), and **current regard**. Opaque per
the house rule — learned from behaviour, never from a number.

### Care quality decides what it becomes — and this kills the training problem

The genre's deepest idea is Monster Rancher's and Digimon's: **how you raised it
determines what it grows into.** We get this honestly, because **maturation is
already a gap ranching forces** (calf→cow, puppy→dog) and **a pet is
Character-tier — so advancement already applies to it.**

> **Training is not a new stat. Training is the pet's own `Discipline`
> transcript.** A dog holds competence bands in *retrieval* or *guarding*
> exactly as a character holds them in smithing, because per-character
> advancement is shipped and a pet is a character.

That resolves the open worry about a RimWorld/DF-style training axis: no
parallel loyalty stat, no bespoke training meter, full substrate reuse — and it
honours this slate's own guardrail, *reuse the bond, don't mint a stat*.

A well-raised dog matures into a capable working animal; a neglected one is
skittish and useless. **Same driver, different outcome** — which is the family's
care model (below) pointed at a pet.

### The cadence, at 12×

**One login = one meaningful interaction.** Notice the animal, read it, do the
right thing, get a response — seconds, not a chore loop. The [off-screen
digest](#the-off-screen-life-decided-2026-07-31) covers what happened while you
were away. That is the whole daily loop, and it is deliberately light.

---

## The off-screen life **[DECIDED 2026-07-31]**

Killing the presence-freeze removed an answer without replacing it. This is the
replacement — and the framing matters more than the mechanism:

> **A daily player is away ~22 real hours. At 12× that is 11 game days. A week
> away is 84.** So the question was never "where is the dog parked." It is
> **what did the animal do with its eleven days** — which is a *gift*, because
> it means the pet has a life you weren't there for, and the payoff is being
> told about it on your return.

### One pure function, no simulation

Copy the pattern weather already proves (`weatherAt(time, locality)` is pure and
deterministic — "tomorrow is computable today"):

> **`petLifeBetween(pet, t0, t1)`** — a **seeded, deterministic** function of
> the pet, its home range, its bond, its supply situation, and the elapsed
> window. Returns **(where it ended up, what changed, a digest of what
> happened)**.

Zero live tick; **O(1) per observation, not O(elapsed time)**; and it emits
narration for free. It matches the seeded/deterministic-from procgen doctrine.
Because it is reconcile-on-read, **any observer triggers it** — a neighbour
walking past your house sees the animal in its correct present state, which is
what makes the multiplayer branch below work at all.

### The resolution, in order

```
reconcile(pet, t0 → t1):
  1. AT HOME?
       yes → roam within the homeRange band  → outcome: home | wandered
       no  → attempt return, weighted by bond × distance × territory hostility
             → home | wandered | LOST
  2. SUPPLY — is food reachable (home stores, an arrangement, a feeder)?
       yes → condition holds
       no  → condition decays ASYMPTOTICALLY (miserable, never dead)
       someone else fed it → THEIR regard edge rises (never custody)
  3. BOND drift over the window, floored
  4. Emit the digest
```

### The outcome ladder

| Outcome | When | Recovery |
|---|---|---|
| **Home** | bonded, left in safe territory | none needed |
| **Waiting** | left indoors, or low bond with nowhere better | none needed |
| **Wandered** | moved within its home range | it's nearby |
| **Lost** | left somewhere distant or hostile | **findable — go look** |
| **Feral** | bond floored | re-tame it |
| **Someone else's favourite** | a neighbour kept feeding it | show up more |

Two carry the design:

- **"Lost" makes taking your dog into a dungeon a real decision.** Log off in
  the Sunken Delve and a poorly-bonded animal may not find its way back —
  NetHack's pets-left-behind-on-a-level stake, honestly earned. It is **lost,
  not dead and never deleted**: a findable pet is a quest hook, and the belief
  substrate means it still recognises you when you get there.
- **"Someone else's favourite" is the best thing this model produces.** A pet
  can be taken from you by **kindness** — no theft mechanic, just another player
  who was reliably the one with food. And because **custody is chattel while
  bond is regard, and the two are already orthogonal**, the resolution is exact:
  **custody does not transfer; affection does.** You come home and your dog is
  gladder to see the neighbour. Fully recoverable by showing up. A genuinely
  poignant beat falling out of rules already written, not a scripted event.

### Absence has to be survivable — you make arrangements

Condition asymptotes and bond floors, but at 84 game days for a week away, drift
must be slow relative to absence or every pet dies of the owner having a life.
The answer is the one real owners use: **a neighbour, a friend, a boarding
kennel, a self-feeder.** This is the automation ladder working exactly as
specified — **the arrangement maintains *condition* and cannot maintain
*bond***, so you return to a healthy animal that missed you.

> **This does not revive the retracted boarding-fee economy.** What was
> retracted was a **standing** financial commitment — rent for owning a pet. An
> *optional arrangement for a known absence* is a different thing and passes the
> time-respect test **so long as the free path exists**: normal play costs
> nothing, the coping animal is always available, and paying buys convenience,
> never admission.

### The payoff is the digest

None of this is felt unless the player is told. **The reconcile returns a short
narrative digest on login**, not just a state mutation:

> *Mittens waited by the door the first day. After that she took herself off to
> the kitchen garden most afternoons. Someone has been leaving food on the
> step.*

That is the whole reason to model an off-screen life rather than parking the
animal, and it is where the legibility rule pays off — **you learn the pet's
state from what it did, never from a gauge.**

### Home range — where a pet may plausibly go **[DECIDED]**

RimWorld solves this with player-drawn animal areas. Room-and-parcel structure
gives a better answer, because **the range should fall out of the world rather
than a UI overlay.** Two inputs:

**1. A species band** (`Species.homeRange` — a data field, exactly the
`domesticability` pattern; closed vocabulary):

| Band | Roams | Typical |
|---|---|---|
| **denning** | its home room only | caged birds, reptiles, rabbits |
| **holding** | the whole **home parcel** | dogs, farm animals |
| **ranging** | the home parcel **+ adjacent public space** | cats |

**2. The land use it resolves against.** Because a farm is **one parcel**, a
`holding` dog roams the entire farm for free — the range needs no new geometry,
it *is* the parcel. And a `ranging` cat in a city goes out into civic space,
which is exactly where it meets neighbours, gets fed by strangers, and becomes a
nuisance.

> **That makes roaming a zoning question — the leash law.** Land use can declare
> whether unattended animals are permitted in public: a dense residential
> district may forbid it, the frontier obviously doesn't. So **urban and rural
> pet-keeping genuinely differ**, "someone else's favourite" gets a *place* to
> happen, and [stewardship](./stewardship-slate.md) gains a consequence beyond
> capacity. See its land-use table.

**The range anchors on `homePath` and governs roaming *once home*.** Away from
home the pet is in the return branch instead — so there is no leash concept and
no second spatial system.

---

## Combat **[2026-07-31 — the guardrail expired]**

> **This slate's guardrail said "combat-free until the combat slate lands."
> Combat landed six builds ago** (core, multi-party, experience, weapon
> playstyle, formations, hooks). The deferral self-expired; this section
> replaces it. See [combat.md](../../subsystems/combat.md),
> [combat-formations.md](../../subsystems/combat-formations.md),
> [party.md](../../subsystems/party.md),
> [combat-hooks.md](../../subsystems/combat-hooks.md),
> [accountability.md](../../subsystems/accountability.md).

### The good news — the pet case was designed in

`PartyApi.sideOf` is a **three-rung chain and rung 2 is reserved for exactly
this**, verbatim from party.md:

> **owner** (de facto — pet / companion): a pet derives its side from its
> *owner's* `sideOf`. A **seam only** — pets are unbuilt this cycle; `sideOf` is
> structured to admit the rung when they land.

Verified in code: the rung is **a comment, not an implementation**
(`PartyLogic.sideOfImpl` — party → *(gap)* → `solo:<templatePath>`). Land it and
the fighting loop follows from shipped parts:

| Piece | State |
|---|---|
| `areAllied(pet, owner)` | falls out of rung 2 |
| **getting into the fight** | `lib/behavior/backs-up.ts` — "a party member who joins an ally's fight"; scans for an allied occupant already fighting and `CombatApi.join`s on their side |
| **fighting** | `lib/behavior/combatant.ts` — the session auto-assigns it to any combatant with no live `Interactive` |
| **being worth bringing** | **focus-fire**: poise erosion scales with `graph.edgeCount`, and a defender pressed by enough attackers can't spend a beat recovering. Design intent: *"the lone turtle beats one but loses to two."* **The dog is that second edge** |
| **stances, not orders** | `party adopt` / `party assign`; and the call is **derived** — *"the captain leads by attacking"* — so you never micromanage the animal |

**`vanguard` is the guard-dog preset as written:** `front`/`back` roles where
any threat edge onto a `back` intercepts to a `front`.

### It works TODAY — but through the wrong door

The shipped wolf is **two YAML files and zero TypeScript**
(`seeds/lib/species/wolf.yaml` + `seeds/domain/newbie-wilds/npc/wolf.yaml`).
Swap `class: /lib/npc/NPC` → `/lib/party/Mercenary`, add `backs-up`, and you
have a fighting companion **right now**, no engine change.

**Useful for prototyping; wrong as the destination.** It routes through *party
membership*, not ownership — giving your dog a roster slot, a role, and a place
in a captaincy. Parties are of persons. The ownership rung exists precisely so a
pet need not be enlisted.

*(Consistency check passed: `CombatantMixin` sits on `Character`, so a bare
`Creature` cannot fight at all — which the slate already requires anyway, since
tameable fauna are Character-tier.)*

### Two problems, and they are the same flag

`SpeciesApi.isSentient` gates a three-case severity, and `wolf / frog / plant`
are `sentient: false`:

- **Your dog gets culled.** Non-sentient + lethal → the winning blow finishes
  it, **stage 2 skipped**. No downed state, no interruptible coup, no `defend
  <fallen>`, no dragging it clear.
- **Killing it is not a crime.** `deriveBlame`'s expression is literally
  `lethality === 'lethal' && !consented && sentient`. Someone kills your bonded
  animal; the ledger records nothing.

> **Proposal: the staging-and-blame axis is "is it someone's," not "is it
> sentient."** A wild wolf still gets culled. An **owned** animal is downed
> first — so interposition and drag-clear apply — and its killing enters the
> ledger.

The reason the coup exists is that killing should be deliberate, telegraphed and
answerable; what makes it weighty is not the victim's inner life but that it is
a **chosen killing of something that belongs to someone**. That generalises past
pets — killing a farmer's cow should be blameworthy too, and rustling is a real
crime — so it is a **chattel consequence, not a pet special case**. The enabling
fact is already on the Wave 1 list: `ChattelMixin` on the Creature stack is what
tells combat and accountability that an animal is *someone's*.

**Cost, corrected.** Half of this is cheap and half is not:

- **The crime predicate is cheap** — blame is derived on read, and
  accountability.md invites it: *"Re-legislating what counts as a crime
  re-scores history without rewriting a single row."*
- **Owner-responsibility is NOT cheap.** The two-principal model exists
  (`BlameVerdict.commandResponsible`) but `directedBy` is populated **only** on
  the coup-directive path — never from party membership, never from ownership,
  and there is **no owner/handler field on the row at all**. So *"my dog mauled
  someone"* needs a **new fact plus a new write path**, not just a re-read. The
  master-apprentice shape is the right thing to copy; it is not already wired.

Note also: **there is no revive or stabilize-the-downed anywhere.** The medic
vertical arrests bleeding on a *living* body; rescue of a downed sentient is
purely social. So downed-first buys **interposition and drag-clear, not a
medical save.**

### Even a non-combatant pet forces the staging decision

Worth separating, because it changes the wave:

- **Pet as combatant** — genuinely deferrable. A Wave 1 pet can simply not join
  fights; "the dog doesn't fight" is a coherent state.
- **Pet as *victim*** — **not deferrable.** Combat is live. A pet standing in a
  room can be attacked, and under today's rules it dies instantly with no blame.
  **So the staging + blame decision belongs to Wave 1 whether or not the pet
  ever throws a bite.**

This mirrors the off-screen-life discovery: the shipped world forces an answer
the moment a pet exists in it.

### The gap in the formation half

`sideOf` has the owner rung reserved. **`formationPathOf` does not** — it is a
two-rung total chain (active party → `DEFAULT_FORMATION_PATH`). So a pet
inherits your **side** but not your **formation**, and cannot hold a role.
Without the symmetric rung, the `vanguard` guard-dog case is unreachable. Same
rung, same shape, added to the sibling chain.

### Two more gaps worth scoping

- **In-fight tactics are not authorable.** `brainPathFor` hardcodes
  `/lib/behavior/combatant` for anything without a live `Interactive`, and the
  `behaviors:` spec list does **not** feed it. Everything *outside* the beat
  loop is freely brain-authorable (`backs-up`, `arms`, `wary`) — but a companion
  that fights differently from a sellsword needs an engine change.
- **There is no combat witness topic.** Witness aliases are only `arrival` /
  `departure` / `emote` / `speech`, so "your dog reacts when you are jumped" is
  **cadence-polled** (2s in the shipped sellsword). Workable, but it is a beat
  of delay rather than a leap to your defence — the obvious candidate if that
  moment should land properly.

### What bond and training do here

Both existing mechanics extend with no new machinery:

- **Obedience is already bond-gated**, so a low-bond animal will not hold its
  role and may break off — and disengaging draws a **parting shot**. Honest, and
  it makes combat a genuine **test of the relationship** rather than a separate
  system.
- **The pet's `Discipline` transcript** (§ *Bonding + needs*) is what makes a
  trained guard dog actually better in a fight. **Training, bonding, and combat
  close into one loop.**
- **Fleeing** — a frightened animal breaking is the **fear/threat axis**, still
  the one remaining structural gap. **Wave 2.**

### Content the species layer already affords (zero engine change)

A creature's innate attack rides the **augment carrier**: unarmed, the attacker
itself fires `augmentInflict` if it composes `CombatReactiveMixin` — *"a
venomous bite and a poison blade are the same abstraction with a different
carrier."* Species may also declare `naturalAttacks[]` (claw/claw/bite as a
deterministic beat-keyed rotation) and `affordedGambits`. Tuning note:
`deriveProfile` is exactly neutral below **150 kg**, so a ~40 kg wolf is
mechanically vanilla — size only starts to matter for something large.

### The custody payoff

`sideOf` rung 2 resolves **through the owner** — so an **unclaimed stray falls
to rung 3, `solo`**, and two distinct solos are never allied.

> **The stray that has adopted you and that you have not admitted is yours will
> not fight at your side.** The liminal state was invented for emotional reasons
> in § *The acquisition ladder*; the combat substrate gives it teeth for free.

---

## Scale, welfare, and the law **[DECIDED 2026-07-31]**

### How many pets — three limits, none of them arbitrary

| Limit | Mechanism | Where it lives |
|---|---|---|
| **The legal cap** | land use declares a companion ceiling per residence | [stewardship](./stewardship-slate.md) — municipal ordinance, per household, differs by district |
| **Compute** | `Behaved` **vetoes eviction**, so every pet is a Character-tier NPC **pinned in memory**, billed to the owner's parcel under the shipped cost-owner rule | the allowance |
| **Care capacity** | obligations scale with what you hold ⇒ **holding more than you can steward is negative-sum** | condition (below) |

**No cap needs writing beyond the legal one** — the other two self-enforce.

And a consequence that lands on the *city*, not the player: **the ordinance and
the allowance are one decision.** A locality zoning a generous companion ceiling
is committing allowance out of its bundle to fund those animals. Pet-friendly
districts cost the city liveness — which is the land-use ⊕ allowance
unification, applied to pets, and a real thing for a government to argue about.

### The cruelty statute was built in the combat session

The § *Combat* proposal — make killing an **owned** animal staged and
blameworthy — **is** the animal-cruelty law. Extend it to the `harm` row kind
(already shipped alongside `death`) and non-lethal cruelty rides the same
derive-on-read machinery. Nothing new.

The genuinely hard case is **cruelty to your own animal**, where ownership and
consent both fail — you own it, so who is the victim? Real law answers by making
animals a special category of property: yours, but not yours to do anything you
like with. That is a **limit on property rights**, distinct in kind from harm to
a person. Our stack already has the shape for it:

> **Animal welfare is a locality's law, not an engine rule.** The engine
> supplies the *facts* — condition derived and visible, harm rows recorded. The
> **government decides what counts as an offence.**

So cities differ: a frontier settlement doesn't care, Terminus has an ordinance.
Same substrate, different politics. Enforcement machinery is the polity's and
the courts stack's business, not this slate's.

### Neglect is enforced by witness, not by system

Neglect has no act to record — it is an absence. It is detectable anyway,
because **condition is derived on read and legible to anyone who looks.** A
neglected animal is visibly neglected to a passing neighbour. No surveillance,
no automated audit: someone has to **notice and act**, which is how animal
control actually works.

It also gives *"someone else's favourite"* (§ *The off-screen life*) a second
life — a neighbour who has been quietly feeding your starving dog holds both
**evidence and standing**.

### Hoarding is a condition, not a count

Real hoarding law is about keeping more animals than you can care for, and the
model makes that **automatically visible**: many animals, degrading condition.
It needs no separate offence.

That also closes the obvious dodge — the cap is per-residence, so someone could
spread animals across properties. Fine: **the difference between a kennel and a
mill is condition, not headcount.** Neglect, hoarding, and cruelty aftermath all
read off the same derived fact.

### Abandonment already has a mechanical basis

Abandoning a domesticated animal is an offence in life because **it cannot
survive** — and the model already knows the difference, because
**domesticability is the axis**. A high-domesticability lapdog has no fear
baseline and no survival skills; a semi-wild barn cat does. Releasing one and
abandoning the other are materially different acts with no new rule. (Feeds the
open *feral / release rules* question.)

### The guard rail

> **Ordinary absence must never be a crime.** A player who logs off for a week
> and returns to a sad dog has committed no offence — that is what arrangements
> are for, and the condition curve is asymptotic by design.

The primary consequence of neglect is already **relational**: the bond drifts
and eventually the animal leaves. That is the punishment and it is the right
one. **Legal** consequence is reserved for the egregious and the *active* —
cruelty is an act; neglect-as-offence needs sustained extreme failure **plus a
witness willing to report it.** This keeps the time-respect contract intact
while still letting the world have laws worth having.

---

## Breeding as an industry **[DECIDED 2026-07-31]**

**Is a pet breeder just a rancher?** No — and the difference is precise.

| | **Ranching** | **Pet breeding** |
|---|---|---|
| Selects for | **yield traits** — milk, wool, growth, meat | **temperament, capability, lineage** |
| Sells | head of stock, fungible-ish | **this individual**, with papers |
| Value comes from | **measurement** (yield, `Grade`) | **provenance** (who its parents were) |
| Density-dial position | aggregate herd **+** a slotted breeding tier | **entirely** the slotted/individual tier |

> **A pet breeder is ranching run wholly at the breeding-stock tier, with no
> production herd.** Same `Genome`, same meiosis, same reaction norms, same
> gestation and maturation — a different *operating point* on the density dial,
> and a different market.

### Papers = three shipped ledgers composing

Pedigree value needs a pedigree, and we do not have to invent one:

- **Chain of title** — `ChattelMixin` on the Creature stack (already Wave 1)
  gives per-instance ownership *with chain-of-title*. Who bred it, who has owned
  it.
- **Lineage** — the parent edges the genome layer produces anyway.
- **Deeds** — the [chronicle](../../subsystems/chronicle.md), the append-only
  identity ledger: what the animal actually did.

**A breeder's mark rides the crafting maker's-mark pattern** — a bred animal
carries who produced it, so a breeder's renown is built from the animals they
have put into the world, and a buyer can check.

### The trust problem is the good part

If value comes from *claimed* lineage, then **lying about lineage** becomes
possible — and the chronicle already distinguishes **deed from claim by
provenance**. So a claimed pedigree and a verifiable one are different objects,
which makes **appraisal a real service** (the `appraisal` Discipline ships; the
Society of Inquiry's identification economy is the natural counterparty).

### The moat is the generation interval

From ranching: `R = h²·S / L`, and a game year is **30 real days**. A
multi-generation program is a **real-month-scale** commitment, so an established
line cannot be spun up on demand. That is a genuine, honest moat — and it is why
breeding is a *specialty* rather than something everyone does on the side.

### Two supply chains, not one — and they are different products

The [guild roster](./guild-slate.md) anchors the Wardens on "the pet supply
chain (**taming** feeds the shops)." Breeding is the *other* source, and the
split is real rather than competitive:

| Source | Guild practice | Product |
|---|---|---|
| **Tamed wild** | the **Wardens** | a trophy — unique, harder, story-generating |
| **Bred** | the **Grange** (husbandry + genetics) | predictable, pedigreed, specifiable |

**The practice is the Grange's; the market is the Wardens'.** A breeder is a
Granger serving the pet trade — the same *one substrate, two experiences* line
the family runs on. Wild-caught versus bred is a genuine distinction in the real
animal trade, with different economics and different ethics, and it slots
straight into § *The acquisition ladder*: the shop sells **bred** animals, the
Wardens supply **wild-caught** ones, and adoption is free.

### Welfare is what separates a kennel from a mill

Volume breeding at poor condition is the puppy mill, and it needs no new rule —
**condition is the measure** (§ *Scale, welfare, and the law*). A bad breeder is
legible exactly the way a hoarder is, and the locality's ordinance is what makes
it actionable.

---

## Reconciliation — what the husbandry sessions changed **[2026-07-31]**

Four sessions (pets · ranching · farming · stewardship) settled decisions that
land on this slate. Contradicted text above is struck in place; this is the
ledger, plus **what those sessions newly constrained or left open.**

### Settled elsewhere, now binding here

| Decision | Owner | Effect on pets |
|---|---|---|
| Custody = `ChattelMixin` on the Creature stack | [ranching § Custody](./ranching-slate.md) | retires `CompanionMixin` + `ownerPath` |
| Instance persistence = a keyed `PersistableMixin` host | [persistence.md](../../subsystems/persistence.md) | retires the `documents`-kind sketch |
| One family clock; owned things run on world time | [ranching § The clock](./ranching-slate.md) | retires owner-proxy freeze — **and opens a hole, below** |
| Automation maintains assets, never relationships | [ranching](./ranching-slate.md) | the kennel keeps it alive; **bond is only earned in person** |
| Pets = the Wardens, not the Grange | [guild-slate](./guild-slate.md) | shared *substrate* with ranching, separate *experience* |
| Land use gates companions | [stewardship](./stewardship-slate.md) | **where you live decides whether you may keep one at all** |

### Newly constrained — the residence gate

**A pet is now gated by your rung on the residence ladder.** Land use answers
"may I keep companions, and how many," and the ladder's rungs answer it
differently: a **dorm room** supports a houseplant; an **apartment** supports a
small companion; a **house** supports a pet properly.

> **This lands directly on Wave 1.** The shop path assumes you can take the
> animal home. If the dorm's land use does not admit a companion, **the on-ramp
> is blocked for every new player**, because the dorm is where everyone starts.
> Either the dorm admits a small companion, or Wave 1's acquisition path has to
> wait on the apartment rung. **Decide this before requirements.**

### Newly constrained — the 12× tending cadence

The care model says *"feed it occasionally."* That was never checked against the
clock, and [farming § The clock](./farming-slate.md) makes it precise: at 12×,
**a daily player skips 12 game days between logins.** "Occasionally" cannot mean
a cadence shorter than that or the pet is un-tendable by hand and care silently
becomes the kennel's job — which is exactly the thing that must not happen,
because **the kennel cannot build bond.**

**So the same rule applies here: one login = one meaningful interaction.** The
pet's hunger and bond drift must buffer over **one to two game weeks**, and the
condition curve stays asymptotic (miserable, never dead). This is a *tighter*
constraint for pets than for a field, because a field can be delegated and a
relationship cannot.

### ~~The hole the clock change opened~~ — **CLOSED 2026-07-31**

Killing the freeze removed the old answer (*"stowed somewhere safe, clock
frozen"*) and nothing replaced it — pets being the one owned thing that **can
leave the property**, this was load-bearing in a way farming and ranching never
have to face. **Now designed: see [§ The off-screen
life](#the-off-screen-life-decided-2026-07-31)** — a seeded deterministic
`petLifeBetween` reconcile, a six-outcome ladder, the species-banded home range
resolved against land use, and a narrative digest on login. The reframe that
unlocked it: at 12× a daily player's pet lives **11 game days** alone between
sessions, so the question is what it *did*, not where it was parked.

### Cheap inheritances

- **Maturation** (kitten→cat) is now **forced by ranching** (calf→cow), so pets
  get the driver for free rather than paying for it.
- **Stewardship** — keeping an animal well is evidence for the Stewardship
  `Discipline`, and the *condition* of your dependents feeds the residence
  ladder's gate ([stewardship-slate](./stewardship-slate.md)).
- **Energy partitioning** (ranching's core model) applies but should stay
  *invisible* here: a pet eats and gets cold, but a companion is not an
  optimization problem. Borrow the mechanism, not the dashboard.
- **Winter** is real for an outdoor animal (7.5 real days, global) — the thermal
  coupling is free, and shelter becomes a genuine act of care.

---

## Subsystem stress — the gap map

Pets are an *integrating vertical*, so they pull on nearly every subsystem and
expose whatever's thin. A four-probe stress-test against the live code found
that the **object/actor/place primitives are done** (a pet composes cleanly),
but pets X-ray a thinner **relational / psychological / temporal** layer. The
punchline:

> **The three things that make a NetHack pet special — you *tame* it, it's
> *yours*, and it's a *real individual that persists* — map exactly onto the
> three deepest gaps in the model. Pets stress it at their three most beloved
> points.** None of these are pet features; they are missing *dimensions of the
> world* that pets are merely the first thing to require.

### Structural gaps (design-worthy, broadly reusable)

> **Status update 2026-07-30 (verified against the code): two of the three are
> now closed or nearly so.** Chattel shipped and answers possession; the
> persistence spine grew multi-instance keyed hosts. Only the **fear/threat
> axis** remains a genuine structural gap. Rows updated in place.

| Gap | What's actually missing | Forced by | Who else wants it |
|---|---|---|---|
| ~~**Possession / property**~~ **CLOSED** | Chattel shipped 2026-07-23 (`chattel` / `chattel_events`, `ownerOf = stamp ?? authorOf`, chain-of-title). Remaining work is **one composition line** — `ChattelMixin` onto the Creature stack. See the custody section above. | — | — |
| **Fear / threat axis** | `regard` is affinity-only. No aversion / alarm / flight state, no flee brain. A creature can *like* you; it cannot be *afraid* of you. | the wild taming encounter ("warms vs **flees**") | combat morale, predator/prey, intimidation, guards reacting to a drawn weapon — **all tension** |
| ~~**Dependent presence + individual persistence**~~ **MOSTLY CLOSED** | **Presence:** resolved by decision, not code — the family runs one clock and a pet *doesn't* freeze (see Care & loss); what's left is the asymptotic condition curve. **Persistence:** `PersistableMixin` is **not** Avatar-only (a `ConsignmentShelf` and a `DormRoom` compose it) and multi-instance `(scope, key)` hosts shipped with the leased dorm room. Nothing in it is Avatar-shaped — no NPC composes it *yet*. | a pet that survives your logout *as itself* | any evolving NPC, any world that *remembers* — **the "living world" gap** |

### The legibility gap (rich, more specialized)

- **Manner-of-action isn't perceivable.** The world narrates *that* you arrived
  and *who* you are — never *how* (armed / sneaking / crouched / fast). The
  seams exist and are inert: `LocomotionMode.noiseLevel` + `emissionAt` (all
  modes ship `normal`), wielded state (never surfaced to observers), postures
  (self-state, no observer reads them, no `crouch`). Sneak/crawl and auditory
  detection are explicitly *deferred*. Taming's "come slow and unarmed" is
  unrepresentable — but so are stealth, ambush, intimidation, and social read.

### Lighter tier (self-contained, or just wiring)

- **Maturation** (kitten→cat): GAP. The *fields* exist — `Organism.age`,
  `lifecycleState` — but **verified 2026-07-30: `setAge` has zero callers
  anywhere, `lifecycleState` only ever transitions to `dead`, and `ageCurve` is
  a reserved comment in `Species.ts`, not a field.** A contained build; **forced
  by ranching** (calf→cow), so pets inherit it rather than paying for it.
- **Spawning / population**: GAP — hand-placed seeds only; `PopulatesMixin` is
  "future." Wild taming needs supply. Already on the radar (spawn-distribution).
- **Wiring, seams present**: a `follow` brain (+ the arrival/departure witness
  frame must carry *which exit* was taken — today it's a room-occupant delta
  that knows *who* left, not *where*); `give`→`offer` with an accept/refuse hook
  (give currently force-moves the item); a **dub-another-entity** verb
  (`NamedMixin` already lists pets as intended holders — there's just no player
  verb; contacts `rename` only sets a private per-viewer label); teleport
  carrying co-occupants (only mounts/haulage ride today). ~~the nearest
  instance-persistence hook is a new `kind` in the `documents` store~~ —
  **retired 2026-07-30**: it is a keyed `PersistableMixin` host, `(scope, key)`
  shipped with the dorm room.

### Not a gap — a design decision

**Tameable fauna must be `Character`-tier.** Everything a tameable animal needs
— holding an opinion of you (`BeliefStore`/regard), perceiving you (`Sensor`),
holding an engagement beat (`Engaged`), walking over and carrying things
(`Mobile`/`CommandGiver`) — is bundled at `Character`, not `Creature`. A bare
`Creature` literally cannot hold an attitude toward anyone. So **tameable
animals are "animal NPCs" — rich carves** (rhymes with "NPCs are expensive
carves"), while ambient background critters stay thin `Creature`s. This
validates *"a pet is an owned NPC"* against the actual code, and draws a clean
"which animals are rich" line.

## The custody edge — **RESOLVED 2026-07-30: it's chattel**

> **The sketch below (`CompanionMixin` + `ownerPath`) is RETIRED.** Chattel
> shipped 2026-07-23 and is the possession answer. Verified in code:
> `ChattelMixin` is composed in exactly one place (`lib/stuff/Thing.ts`), and
> `Creature` descends from `Agent`, not `Thing` — so no animal can be owned
> today; `ChattelApi.stamp` would refuse a pet. But the chattel gate is
> **structural** (`MixinApi.isChattel`), not tier-based, so:
>
> **Adding `ChattelMixin` to the Creature stack gives pets, livestock, and
> aquaculture per-instance ownership with chain-of-title, from shipped code.**
>
> A bespoke `CompanionMixin` would be exactly the pet-shaped custody edge this
> slate's own guardrail warns a hundred cattle can't reuse — and the property
> slate already classes a pet as chattel ("real property bottoms out at the
> zone; everything finer is chattel or slots"). See
> [chattel.md](../../subsystems/chattel.md) + [ranching-slate §
> Custody](./ranching-slate.md).

What survives from the original sketch is the *semantics*, which chattel already
honors: custody (a claim) stays orthogonal to bond (a feeling) — a stray can
adore you without being yours; a neglected pet is legally yours until the bond
floors out and it runs feral. The owner's roster stays **derived on read** (MQL
over the registry), not a live-ref list. A `homePath` is still pet-local and
still wanted; that's a field, not a possession primitive.

## Sibling consumer — livestock & ranching

> **Family placement (2026-07-30).** Pets and ranching share *substrate* (an
> owned, individually-identified animal) but **not experience**, and the [guild
> roster](./guild-slate.md) already drew that line: **the Grange** holds
> "cultivation, soil, husbandry + breeding, genetics" — farming *and* ranching
> as one vocation — while **taming** belongs to **the Wardens**, whose demand
> anchor is "the pet supply chain." Ranching's real design family is
> farming/fishing/mining (the production family). The goal is **one shared
> substrate under two distinct experiences**: where pets and ranching touch
> (custody, the clock, maturation, persistence, the genome) they must be
> *identical*; where they part (bond vs yield) they part completely. The full
> convention set lives in [ranching-slate § The five shared
> conventions](./ranching-slate.md).

Pets are not the only consumer of "owned animals." **Livestock/ranching is the
sibling** (see [ranching-slate](./ranching-slate.md)), and the two diverge along
lines the engine already draws:

| Axis | **Pet** | **Livestock** |
|---|---|---|
| Engine tier | `Character` (rich) | `Creature` (thin) |
| Content stance | individual **carve** | systemic **herd** |
| Relationship | **bond** (regard) — *won over* | **yield** — *managed resource* |
| Domesticability | mid — needs the encounter | max — born owned, no encounter |

The Creature/Character split **is** the livestock/pet split (resource vs
relationship), and **domesticability is the single axis spanning wild → pet →
livestock.** They share a husbandry base — **custody/possession, vitals +
metabolism, domesticability + maturation, husbandry-grade persistence, and the
`Business`/labor wrapper** — and diverge only at the top: pets add bond +
taming; livestock add yield/breeding/butchering.

**Design consequence for this slate:** the shared bits must be built **reusable
by a herd, not pet-specific** — don't build a custody edge a hundred cattle
can't reuse. As of 2026-07-30 each has a named shared answer:

| Shared bit | The answer (not pet-specific) |
|---|---|
| custody | `ChattelMixin` on the Creature stack ([chattel.md](../../subsystems/chattel.md)) |
| individual persistence | a keyed `PersistableMixin` host — `(scope, key)` shipped with the dorm room |
| the clock | one uniform model: owned things run on world time, the avatar on played time |
| domesticability | a `Species` data field (one axis: wild → pet → livestock) |
| maturation | the `age`/`lifecycleState` driver — a real gap, forced by ranching (calf→cow) |
| genetics | the husbandry-wide `Genome` layer farming owns; four consumers |

## Build waves (re-sequenced)

**Wave 1 — The companion. Both on-ramps, plus what the clock now forces.**
*(Restructured 2026-07-31.)*

Both acquisition paths ship together — **no reason to choose.** They share their
only hard dependency (`buy` transfers chattel, so a shop animal must be chattel
too) and they land different emotional registers.

| | Ships in Wave 1 |
|---|---|
| **The shared enabler** | `ChattelMixin` on the Creature stack — one composition line; unlocks both paths, plus livestock and aquaculture |
| **Adopted (the gift)** | a `strays` brain in a high-traffic venue + the adoption scene + the liminal adopted-but-unclaimed state |
| **Buy (the choice)** | a pet shop as a `Stock` over animal templates + the **mint-an-individual seam** at purchase |
| **The relationship** | bonding via care/interaction; **obedience gated by bond band** (a low-bond pet ignores `heel`/`fetch`); a `follow` brain |
| **Being an individual** | a keyed `PersistableMixin` host; a **dub/name verb** |
| **The off-screen life** | `petLifeBetween` + the outcome ladder + `Species.homeRange` — **no longer optional, see below** |

> **Wave 1 grew, and the reason is structural.** Under the retired freeze model
> this wave could defer "what happens while you're logged off." It cannot now:
> the moment a pet exists and its owner logs out, **something has to happen**,
> because owned things run on world time. **The off-screen life is table stakes
> for the first pet in the game**, not a later refinement.

**Still dodges** the fear axis (domesticated animals and strays have no fear
baseline to manage) and manner-of-approach — Wave 2's job, and now the *only*
heavy substrate this wave avoids.

*(2026-07-30 — the two "cheap answers" this wave originally planned are replaced
by the shared ones at comparable cost: custody is `ChattelMixin`, not a
`documents` owner field; persistence is a keyed `PersistableMixin` host, not a
new `documents` kind; and there is no owner-proxy freeze. The shared route costs
about the same and is the difference between a herd being able to reuse this and
not.)*

→ *proves companion + care + the bond-gates-obedience spine — and proves it
**harder** than the shop alone would, because adoption makes bonding **precede**
acquisition rather than follow it.*

**Wave 2 — Wild taming. The substrate investment.** Build the **fear/threat
axis** (aversion / alarm / flight, distinct from regard; a flee brain) + the
**manner-of-approach** legibility (surface armed/speed/noise/posture to
observers; a `crouch`/`sneak` seam), with **domesticability as the fear axis's
species parameter**. Now the full encounter lights up — win over a wary wolf,
the trophy path. → *taming's deep version; the fear substrate pays off across
combat morale, intimidation, predator/prey — game-wide.*

**Wave 3 — Apex & breadth.** Magic taming for zero-domesticability species (the
dragon); **maturation** (kitten→cat); the utility couplings (`Mountable` /
`HaulableMixin` / a guard brain); wild **population/spawning**; the emergent
economy vein (shop-theft, once possession lands); multiplayer interaction
(others feed/harm your pet → *their* regard edge, not yours).

## Open questions (for requirements to pin down)

- **Hidden vs shown inner state.** NetHack hides tameness — a number you never
  see; you read the *behavior*. Strong lean: keep regard/temperament **opaque**,
  make the animal *legible through how it acts* (ears back, edging away, leaning
  in). Rhymes with the bands-only competence firewall and the BUC known-realm —
  honest opacity, read the world not the stat.
- **Feral / release rules.** Exact bond floor, grace period, and where a
  released pet goes (back to the shelter as adoptable? a wild spawn?
  destroyed?).
- **Shop-theft.** Bless the emergent exploit (with regard/theft consequences,
  once possession exists) or close it? Colors how "consistent-world" we commit
  to be. Parked for now.
- ~~**Roster cap.**~~ **ANSWERED 2026-07-31** — see *Scale, welfare, and the
  law*. Three limits, no arbitrary number: the **legal cap** (land use, per
  residence), **compute** (every pet is a pinned Character-tier NPC billed to
  the owner's parcel), and **care capacity** (obligations scale, so over-holding
  is negative-sum). **No per-player cap is needed** on top.
- ~~**Where the pet is when you are offline**~~ — **ANSWERED 2026-07-31**, see
  *The off-screen life*. Residual tuning only: bond-drift rate against an
  11-game- day absence, and how hostile territory weights the return roll.
- **Does the dorm admit a companion?** Blocks Wave 1's on-ramp either way; see
  *Reconciliation*.
- **Failed tame.** For amenable creatures, failure = it flees, come back later.
  For dangerous ones, failure wants combat (deferred) — but "you spooked it and
  lost your shot" is available now and is real stakes with zero grind.
- **Multiplayer.** Feed / pet / harm / steal a stranger's pet — the open-world
  rules (feeding raises *its* regard for the feeder, never transfers custody).

## Scope guardrails

- ~~**No battle coupling.**~~ **EXPIRED 2026-07-31** — its own condition
  ("until the combat slate lands") was met six builds ago. Replaced by
  § *Combat*, which keeps the spirit: a pet fights in the **world's own**
  combat as a companion, never as a separate battle minigame, and the
  no-Pokémon rule in § *The frame* stands. Note the section's finding that the
  **staging + blame** decision is Wave 1 even for a non-combatant pet, because a
  pet standing in a room can be attacked today.
- **No new module categories, no new *primitives*.** The build is orchestration
  of shipped substrates. ~~`CompanionMixin` lives in a `lib/<subsystem>`
  folder~~ — **retired**; custody is `ChattelMixin` on the Creature stack.
  Pet/animal species are content. Brains are the existing brain category. The
  shop is a `Business` + a Location. Verbs are ordinary YAML+controller pairs.
  **The one remaining structural gap (the fear/threat axis) is its own design**
  — a pet build *consumes* it in Wave 2; it does not smuggle it in as a
  side-effect. Possession and persistence are no longer gaps: both have shared
  answers a herd reuses.
- **Reuse the bond, don't mint a stat.** The bond is `regard`. Resist a parallel
  "loyalty" field — care, recognition, and the reputation substrate already
  model it.
- **Tameable fauna are Character-tier carves.** Don't try to make thin
  `Creature`s tameable; that fights the design of the Creature/Character split.
