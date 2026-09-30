# Maker knowledge — requirements

**Kind:** feature
**Leads from:** kernel — first consumers are **every venue that sells
something made**: Dave's Bar, the Hearthworks, the market bakery,
Hearts-Delight's farm and mill, and the three goods-yard outfits. The drive
walks four of them.

When you order a drink, the game finds a bartender and then **performs the
recipe itself**. The bartender's knowledge is never consulted. Across all 70
authored NPC rows in the realm, **not one holds a can-make deed for
anything** — so no bartender in Terminus knows a single recipe, and the only
reason nobody has noticed is that the one verb that would ask is the one
verb that never asks.

> **A request goes to somebody who can actually do it — and when nobody
> present can, the game says who could.**

This build brings the bar's counter under the knowledge ladder the rest of
the game already runs on, and seeds what authored people know so that the
ladder is survivable.

⭐ **It is deliberately NOT the crew build.** The routing question — *which*
of several able people serves this — is blocked on
[brain-substrate-slate](../slates/builds/brain-substrate-slate.md) and waits
in [crew-slate](../slates/builds/crew-slate.md). Capability is a **seat and
person** fact and needs nothing from brains, which is why it can ship first.
⚠ It also mostly *dissolves* the routing problem: two bartenders and a
Negroni is not a tie when only one of them knows it.

---

## What already exists

**The knowledge ladder, shipped and generalized:**

- **Claim (known-of)** — minted by *reading* a recipe source (the menu), or
  **by watching a maker perform**: the craft-resolve tail grants every other
  present agent with a durable identity the claim, idempotently.
- **Deed (can-make)** — *"only your own first faithful by-hand performance…
  The book isn't enough — **the hands learn**."*
- **The wiki-parity rule:** *"information buys optimization, never
  competence."*

**And the gate is missing from exactly three verbs.** Five one-shots decline
without the deed — `make`, `cook`, `forge`, `bake`, `preserve`. Three do not:
**`order`, `mix`, `serve`.** The by-hand steps `muddle` / `strain` /
`garnish` correctly do not gate, because performing by hand is *how the deed
is earned*.

> ⭐⭐ **So the shorthand is earned everywhere in the game except at a rail,
> where it is free.** A player can `mix` a cocktail they have never learned,
> and an NPC can serve one they have never made.

**Nobody authored knows anything.** Of 70 NPC rows, 47 carry a `competence:`
band, 63 carry behaviours, 44 carry a costume, and **zero carry recipe
knowledge**. ⚠⚠ And the dossier *cannot* give it: its entries expand into
*"the same rows a lived history would have written, **marked `claim`**"* —
and a claim is known-of. The can-make deed is reachable only by a by-hand
performance, which an authored NPC has never done. **That is why `order` is
ungated: gating it today would close every bar, kitchen and smithy in the
realm.**

**Competence is authored and unread.** Remy is `mixology: proficient` and
`bartending: competent`; Sloane is competent at both; Mara is proficient at
both. An output's grade derives from the inputs, the recipe's base and the
**tools'** control bands — *"skill embedded in the capital raises the
floor"*. The maker's own band never enters, so **a maker earns a Transcript
deed from work their competence did not affect.**

⚠ **And every drinkable row declares one word.** All 25 hospitality recipes
author `discipline: bartending`, so Remy's mixology proficiency is
unreadable by anything: a derivation keyed on the recipe's discipline would
read his *bartending* band for a Negroni.

**Therefore what is genuinely new here is:** the gate on three verbs; a way
for an authored person to hold a can-make deed at all; a refusal that names
somebody who could; a discipline split that makes the cocktail rail
distinguishable from the beer tap; and an authoring-time proof that the
world still serves.

## Goals

- **The bar's three one-shots are on the ladder** — `order`, `mix` and
  `serve` consult the maker's can-make deed, as the other five already do.
- **An authored person can hold a can-make deed**, derived from who they
  are rather than authored per recipe, and **marked as seeded** so it is
  never mistaken for a lived one.
- **The gate is symmetric** — a newly hired player is refused a drink they
  have not learned, on the same terms an NPC is.
- **A refusal names somebody who could**, when somebody present can.
- **A player has a shipped path from refused to able**, and it is the one
  the ladder already names: read the menu, then build it by hand once.
- **Nobody is credited with practising a trade they were wrongly routed
  into.**
- **The cocktail rail and the beer tap are different practices**, so what a
  person is good at is readable.
- ⭐ **The world provably still serves** — an authoring-time check that
  every rostered maker can make what their house offers.

## Non-goals

- **Routing — who serves this, among several who can.** Blocked on the brain
  substrate; 17 of 38 brains declare no engagement slot, so `first-free` is
  not evaluable. → [crew-slate](../slates/builds/crew-slate.md), now a **call
  policy** rather than a crew.
- **The relational leg** (*your regular serves you*, above capability). It is
  the best idea in the routing design and it belongs with routing. →
  crew-slate.
- **The senior seat, its reporting chain and the inventory duty.** Needs
  nothing from brains but is about *who is called*, not about who can. →
  crew-slate.
- **The register, the safe, the shift hand-off, dismissal.** →
  [daves-bar-slate](../slates/builds/daves-bar-slate.md) §the ritual and
  [livelihood-slate](../slates/builds/livelihood-slate.md) §5.4.
- **Making the maker's competence affect the OUTPUT.** This build gates
  *whether* they can; the grade seam stays where it is. →
  [crafting.md](../subsystems/crafting.md)'s deferred skill seam.
- **The mob, `actsAsOne`, dispatch, the turnout.** → crew-slate.
- **Any change to the by-hand steps.** `muddle`/`strain`/`garnish` are
  correct as they are — they are the earning path. Nowhere, deliberately.

## Placement

- **Kernel** for the gate on `order` (the retail controller) and for the
  seeded-deed derivation, which belongs beside the ladder it extends.
- **`trade-hospitality`** for the gate on `mix` and `serve`, which are its
  verbs, and for the `mixology` re-declaration of its 25 rows.
- **The derivation is the dossier's**, where the band→claims expansion
  already lives. ⭐ One mechanism for players and NPCs: a player earns
  deeds, an authored person is seeded with the deeds their career left.
- **The authoring check is a lint gate**, so it runs derived rather than
  when somebody remembers.

## Collisions

- ⚠⚠ **Every venue in the realm, simultaneously.** Gating touches the bar,
  the Hearthworks, the bakery, both Hearts-Delight houses and the three
  goods-yard outfits at once. **If the derivation under-seeds, the world
  stops serving.** This is the build's central risk and the reason for the
  lint and the four-venue drive.
- **All 97 recipes across thirteen packs**, because the derivation reads each
  recipe's authored `difficulty` against a band. ⚠ `difficulty` was authored
  when it only affected *credit*; it now decides **who can make the thing**.
  That is a re-reading of 97 rows and it is this build's real authoring cost.
- **The 25 hospitality recipes**, whose discipline changes. ⚠ The recipes'
  *credit* changes with it, so anyone currently earning `bartending` from a
  cocktail starts earning `mixology`.
- **The bar's five cast.** Nobody's dossier is rewritten to make the outcome
  nicer: if the bands do not produce sensible behaviour, **the derivation is
  wrong, not the people**.
- **A player's first shift.** Gating `mix` means a hired player meets the
  deed gate at a rail rather than at a forge. ⚠ The earning path must be
  reachable *from behind the bar* — the well, the shaker and the six tools
  are already propped there, which is what makes this survivable.
- **`trade-baking` and `trade-cooking`'s gated verbs**, which share
  `requireDeed`: the derivation must not accidentally hand seeded deeds to
  people whose houses do not sell that thing.

## Surface decisions

### The bar's three one-shots come under the ladder

**Q.** Which verbs change?

**A.** `order`, `mix`, `serve`. Not the by-hand steps.

**Why.** The ladder's own rule is that the *shorthand* is what is earned and
the *information* is free. Five verbs enforce that and three do not, and the
three are all at a counter — so the rail is the one place in the game where
a shorthand costs nothing. ⭐ Gating `mix` is also what finally gives
`muddle`/`strain`/`garnish` a job: they are the earning path, and until now
nothing required anyone to walk it.

### An authored person's dossier may seed a can-make DEED, marked as seeded

**Q.** The ladder says a deed comes only from *your own first faithful
by-hand performance*. An authored NPC has never performed anything. So how
does Mara know how to make a Negroni?

**A.** The dossier seeds the deed, and the seeded deed is **marked**, exactly
as its claims already are.

**Why.** ⭐⭐ The ladder's rule governs **acquisition during play** — it
exists so that reading a wiki cannot buy competence. The dossier is not
information; it is *"the same rows a lived history would have written"*, and
a bartender's lived history includes having made the drink by hand. So
seeding is faithful to both docs; what would violate the ladder is letting a
*live* character acquire a deed any other way, and nothing here does.

⚠ **The marker is not optional.** Seeded and lived must stay
distinguishable, for the same reason the dossier already marks its claims: a
world that cannot tell an asserted history from a real one cannot audit
either. And it keeps the wiki-parity test true by construction — a player
can never obtain a seeded deed, because a player has no dossier.

### What a person knows derives from their band against the recipe's difficulty

**Q.** How does 70 people × 97 recipes get authored?

**A.** It does not. A seeded deed exists where the person's band **in the
recipe's own discipline** meets what the recipe's authored `difficulty`
demands.

**Why.** Authoring the tables is the enumerated-content failure lens 2 names,
and it would rot the first time a pack adds a recipe. Deriving makes
`proficient` versus `competent` mean *what you can make* rather than
decorating a card. ⚠ And it is the single point of failure for the whole
world's supply of competence, which is why it needs the lint below rather
than a drive alone.

### Cocktails move to `mixology`

**Q.** All 25 hospitality recipes declare `bartending`. Change them?

**A.** Yes — the mixed drinks become `mixology`; straight pours stay
`bartending`.

**Why.** ⭐ **It is load-bearing for the derivation, not for routing.** With
one word covering the whole rail, Remy's `mixology: proficient` is unreadable
— a derivation keyed on the recipe's discipline reads his *bartending* band
for every drink, and the finer authored fact does nothing. `mixology` already
`specializes: bartending`, so a seat that serves `bartending` still covers a
mixologist and eligibility is untouched. And it is the shipped test applied
(*specialize when the sim already tells the two practices apart*): a cocktail
has its own verbs — muddle, strain, garnish — and a pour does not.

### The gate is symmetric

**Q.** Gate players too?

**A.** Yes.

**Why.** Otherwise the player is the one actor in the game who can make
anything, which inverts the fiction the moment they take a job and makes
every NPC's limit look like a bug. ⭐ A first shift you are not yet good at
is a progression path; a first shift where you outperform the expert is not.
It is also lens 6's symmetry test: a criterion that applies to the staff and
not to you is not a criterion.

### The refusal names who could

**Q.** What does a patron get when the bartender cannot make it?

**A.** A sentence that says so and names somebody present who can, when
somebody present can.

**Why.** A refusal is the progression UI in this project, and a refusal that
withholds the alternative is just a wall. ⭐ It also pre-builds the routing
answer: *"Sloane doesn't know that one — Remy does"* is the sentence the call
policy will need later, and it costs nothing now.

### The world's supply is proven at authoring time, not discovered at a rail

**Q.** What stops a mis-set threshold closing every venue?

**A.** A lint gate: **every rostered maker can make everything their house
offers.**

**Why.** ⚠⚠ The derivation is the whole realm's competence in one
expression, and the failure mode is a venue that silently stops serving —
which is the fail-closed-and-silent class this project has paid for
repeatedly. The repo's own answer is *census, then ratchet*: count today's
unmakeable offers, gate that count as a ceiling that may fall and never
rise. ⭐ **A shortfall is also a real authoring signal** — a house offering
what its staff cannot make is either a bad menu or a missing hire, and both
are worth being told.

---

## Lens pass

**1 · Pedagogy.** Exercises `mixology`, `bartending` and `recipe-knowledge`
(which `mixology` already requires). ⭐ What it teaches is that **skill is
what you can do, not a number beside your name** — and it makes the bar
derivable: knowing the staff tells you who can serve you what. Nothing rolls.

**2 · Creative expression.** Zero authored tables; a pack adds a recipe and
its `difficulty` decides who can make it. ⚠ The gap, and it is real: 97
`difficulty` values were authored when they only affected credit and now
decide capability. That re-reading is the build's authoring cost and should
not be pretended away.

**3 · Immersion.** A bartender who does not know your drink and says so is a
person; one who silently makes it perfectly is a vending machine in an apron.
No gauge is added — the refusal is a sentence.

**4 · Values.** The choice forced is **learn the thing or hand it to
somebody who has**. Standing is conferred by what you can demonstrably do,
and by the house that hired you. ⚠ The cost is honest: a new hire is worse
at their job than the NPC beside them, and the game will say so.

**5 · Epochs.** *Can this person do this* is epoch-invariant — a rail, a
brigade, a ward round, a forge. The ladder is already the same machine for
all of them; this build only removes an exemption.

**6 · Economy.** **Produces** honest labour allocation and a reason for
training to exist; **consumes** the time of whoever is not yet good enough.
**Who pays:** the house, in a slower rail; the newcomer, in refusals. **Was
the demand there first:** yes — a documented exemption (*"never
knowledge-gated"*), a documented defect (*credited with a trade they do not
practise*), and 47 authored competence dossiers that nothing reads. ⭐⭐
**Who can be wronged, and can they answer:** the gate judges a person's
capability; the criterion is the recipe's own difficulty against their own
band; the refusal states it; and the appeal is doing the thing by hand.
**Symmetric between players and NPCs**, which is what makes it a criterion
rather than a handicap.

---

## The drive

⚠ **Four venues, not one.** Gating touches every venue at once, so a
single-venue drive cannot see the risk.

1. Weekday morning, at the bar. `order` a straight pour from whoever is on.
   **Expect it served.** The floor: the ordinary case still works.
2. `order` the hardest cocktail on the menu. **Expect** either the drink or
   a refusal — and if a refusal, **expect it to name somebody who can**, or
   to say plainly that nobody here can.
3. Go to the Hearthworks. `order` a dish from Odo. **Expect it served** — a
   second venue, a different discipline, and proof the derivation is not
   bar-shaped.
4. The market bakery and one goods-yard outfit: buy or order whatever each
   sells. **Expect both to still work.** ⚠ This is the world-didn't-break
   check and must not be skipped.
5. `apply for bartender` at the bar; `clock on`. `mix` a simple drink.
   **Expect a refusal naming what you have not learned** — the symmetric
   gate, met at a rail.
6. Read the menu. **Expect** to hold the known-of claim (the ladder's first
   rung) and **still** be refused `mix` — *information buys optimization,
   never competence*.
7. Build that drink **by hand** at the well: muddle, strain, garnish, stir as
   the recipe wants. **Expect it to work**, and to earn the deed.
8. `mix` the same drink. **Expect it to work now.** ⭐ This is the ladder
   running at a rail for the first time.
9. `order` that drink as a patron while the player-bartender is on.
   **Expect** the player to be a legitimate maker for it.
10. `order` a drink **nobody** present can make. **Expect** a refusal that
    says so — not silence, and not a drink from nowhere.

**Not reachable by this drive; assert directly:** the derivation's coverage
across all 97 recipes, and the authoring lint's count.

## Acceptance criteria

- A patron asks for a drink the bartender does not know and is **told**, and
  told **who does** when somebody present does.
- A patron asks for a drink the bartender does know and **gets it** — at the
  bar, the Hearthworks, the bakery and a goods-yard outfit.
- A player who has read the menu but never made the drink **cannot `mix`
  it**; the same player, after building it once by hand, **can**.
- A newly hired player is refused a drink they have not learned, **on the
  same terms an NPC is**.
- Nobody is credited with practising a trade they were wrongly routed into.
- Remy and Sloane **differ in what they can make**, off the bands already
  authored for them, with no new content.
- ⭐ Every house in the realm can still make everything it offers — and if
  one cannot, **the build says which and why** before a player finds out.

## Cross-references

- [crafting.md](../subsystems/crafting.md) — the ladder, the five gated verbs, `order`'s exemption, the credited-never-gated flag, the deferred skill seam
- [advancement.md](../subsystems/advancement.md) — bands, the Transcript, the specialization test, NPC/player symmetry
- [identity.md](../subsystems/identity.md) — the dossier as seeded evidence, marked; what this extends
- [employment.md](../subsystems/employment.md) — `fulfills`, the roster, who may
- [crew-slate](../slates/builds/crew-slate.md) — routing, the relational leg, the senior seat: all deliberately after this
- [brain-substrate-slate](../slates/builds/brain-substrate-slate.md) — why routing waits
- [daves-bar-slate](../slates/builds/daves-bar-slate.md) — the register, safe and hand-off: the other next build
- [design-lenses.md](../design-lenses.md) — the pass above
