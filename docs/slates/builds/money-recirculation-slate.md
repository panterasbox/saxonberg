# Money recirculation slate — what an NPC does with money it has no need for

> **Status: UNBUILT** — nothing here exists. The conservation spine it
> stands on ships (`LEDGER_KINDS`' enumerated mint/drain sites, the CB as
> the only faucet, `lint:no-authored-faucet`), and some NPC outflow ships
> incidentally (a keeper's `stocks` beat buys from its supplier, a house
> pays wages, a `maintains` brain performs an upkeep term) — but no NPC
> account is under any pressure at all, and an NPC never goes dormant, so
> nothing drains one, ever.
> **Left:** ⭐ the concentration read (derived from the ledger — inflow
> against outflow over a window, no authored threshold) · the two levers,
> **collect-less** on the flow and **spend-down** on the stock · the
> destination chain + the author's reordering of it · the authorial
> surface (**proportions** for the backstop, **priorities** for the
> fiction) · **opt-in hoarding**, and the hoard as a findable object · the
> prose that derives from the declaration rather than sitting beside it ·
> what an insolvent NPC IS (the estate ladder is keyed on absence and an
> NPC is never absent) · whether a declaration binds or advises
> **Size:** a build

**Captured 2026-10-02**, out of the
[premises requirements](../../requirements/premises-requirements.md)
conversation. Rent on a let unit flows to Mayfield Holdings, an NPC
business with no modelled outflow — so the first build that charges rent
manufactures a concentration point, and the question *"where does that
money go"* has no answer today.

**Provenance:**

> **User:** *"you did hit on something with centralization. I wanna talk
> about that. I think we actually need a framework for authoring what NPCs
> do with their money with a healthy backstop that drains their accounts
> automatically on demand if not done explicitly and in enough load by
> their stuff templates and backing classes set by the author."*

> **User, correcting the scope:** *"making an NPC satisfy their needs is
> its own concern, whether those needs cost zorkmids or not. this is not
> the problem I'm trying to solve here. I'm trying to solve the problem of
> when their needs are all met but their position in the game's narrative
> makes them accrete money. in that case we need to recirculate. making
> them actually spend according to the market would be preferable but
> that's a lot to ask. what I'm saying is just like, we have an algorithm
> to decay accounts when money is concentrating and authors should have
> inputs into that algorithm."*

> **User, on posture:** *"I dont think we need to worry about writing too
> much of the economic resiliency stuff up front, for that I'm more
> concerned with just mechanics. but the economy will have issues and we
> will need to patch the code to deal with them. so this stuff is coming
> one way or another."*

---

## ⭐⭐ The scope line — needs are the author's problem, wants are this one's surface

**Not in scope: making an NPC meet its needs.** Whether an NPC eats,
sleeps, stays warm or pays its own rent is the author's obligation when
they design and build it, and it is a separate concern whether or not it
costs money.

**In scope: what happens when the needs are met and the narrative position
accretes anyway.** A landlord, a toll-keeper, a monopoly supplier, a
records office taking lot payments — each accrues because of *where it
sits in the fiction*, not because it is a wealthy character.

⭐ **So "wants" is not a second system — it is this one's authorial
surface.** Disposable income is by definition what is left after needs,
which is precisely what would otherwise concentrate. A wants declaration
is the steering wheel on the decay algorithm, not a parallel feature.

⚠ And the posture is **mechanism, not policy**. The economy will
misbehave and we will patch it. What that demands up front is not a rich
policy layer — it is that **the recirculation decision live in exactly one
place**, so a patch is one file rather than a hunt through brains, rows and
controllers.

---

## The constraint that rules out the cheap implementation

`LEDGER_KINDS` carries the sentence *"those are the only mint/drain
sites"* — four real→real kinds plus the reserve's two lanes. So an NPC
outflow with no counterparty is **a mint in reverse**, and exactly as
forbidden as the authored faucet `lint:no-authored-faucet` already
refuses.

⛔ **Therefore a balance may not simply decay.** Every zorkmid leaving an
NPC account lands in another account, and (see lens 3a) lands somewhere
that *notices*.

---

## Measuring concentration — derived, with no number to author

The ledger already records every leg with a `PnlCategory`, so a
concentration point is derivable with **no new state**: an account whose
inflows persistently exceed its outflows over a window.

⭐ That self-scales. It catches the narratively-positioned accruer (high
in, low out) and ignores a busy shop turning over the same money, with no
per-NPC threshold for an author to tune and nothing to retune when rates
move. Consistent with the family's house style — reconcile-on-read, no
scheduled sweep — which is also the literal reading of the user's *"drains
their accounts automatically on demand."*

⚠ **NPC-only, and the asymmetry needs its stated reason**, because the
next reader will ask and *a wealth tax by the back door* is the failure
mode. The reason: **a player's balance is theirs and they will spend it;
an NPC's is a bookkeeping artifact of its narrative position.** A player
who hoards is playing; an NPC who hoards is a leak. Extending this to
players would also need the Law 2 amendment
[stewardship-doctrine.md](../../stewardship-doctrine.md) already
describes — *"an amendment to Law 2, not a design detail."*

---

## Two levers, and the cheap one comes first

### 1. Collect less — relief on the FLOW

⭐ **The cheapest recirculation is to stop collecting.** A landlord whose
account is piling up lowers the rent; a shop lowers prices. No spending
simulation, no counterparty, trivially conserved because the money simply
stays with the player who would have paid it.

It is also the *immersion-positive* lever: a landlord lowering rent
because he is doing well reads as a character act rather than a system
firing. And it is economically literate — a collector with excess
reserves under competitive pressure.

⚠ It only reaches the flow, never the stock, so it cannot be the whole
answer.

### 2. Spend down — relief on the STOCK

A fallback chain, which the author may reorder. The default order is
*grain*, not law:

| | destination | why it is here | derivable? |
|---|---|---|---|
| 1 | **hire, or raise** | converts the pile straight into player income; employment already has openings and the `call: regulars` machinery | from the roster |
| 2 | **pay suppliers** | up the chain, earlier or better | from the stock lines |
| 3 | **improve the premises** | ⭐ recirculation that buys something **visible** — condition, remodel and the shell already exist, so a landlord doing well is legible as a better-kept building | from the premises |
| 4 | **a named beneficiary** | the remittance, the soup kitchen, a patron's stipend | authored |
| 5 | **the covering locality's treasury** | the **terminal**, because it is the only universal account and some accruers have no supplier, no staff and no premises | always |

⭐ The default deliberately leads with **hire** rather than the treasury:
an unauthored NPC that quietly creates jobs is better for the game than
one that quietly makes the town rich.

---

## The authorial surface

**Both forms, because they do different jobs** (user: *"both probably"*):

- **Proportions** — what the **backstop** executes when nobody is
  watching. *A third to the soup kitchen.* Predictable, and it survives
  every rate change.
- **Priorities** — what the **fiction** follows when it can. *Suppliers
  before the treasury.* Lifelike, and it lets an NPC's spending change
  character as its fortunes do.

⭐⭐ **The division of authority: authors declare destinations and shares;
the system reserves the rate.** This is what lets us patch the economy as
hard as we need to without invalidating anybody's content — a declaration
keeps meaning exactly what it said after we have changed how
concentration is measured three times. Same shape as the governance rule
about setting *how long* and never *who*.

**Opt-in hoarding** (user: *"hoarding is fine it just needs to be opt
in"*). Some NPCs should accrue — the dragon on the hoard. Permitted on one
condition: ⭐ **accrual is allowed when it becomes a thing in the world.**
The money stops being a balance and becomes a hoard that can be found,
robbed, inherited, taxed, or spent by whoever takes it. Conservation
holds, the exception carries a cost, and a macro problem becomes treasure.
An author who just wants their NPC rich is told to make it loot.

**The prose derives; it is not authored beside the data.** The *character*
of spending is genuinely prose-shaped — a drinker, a hoarder, a woman who
sends it all home — and the disposition layer's 19 opposed pairs are the
natural host. ⚠ But if an author writes both the budget and the flavour
line they drift, which is the two-copies-of-one-sentence failure this repo
keeps paying for. What you read when you look at an NPC should come
**from** the declaration: if a keeper's budget is a third drink, the bar's
takings should show it and so should she.

---

## The money model this sits in (2026-10-02 figures)

Context, not policy — every number is a dial and all of them will move.
Conversions: **a game day is two real hours** (12×), so a game hour is
five real minutes and a game year is a real month.

**One faucet.** The CB mints only to buy the state's perpetual, capped at
`reserve.moneyPerActiveMember` = **10,000 × active members**, into the
treasury's account, never redeemed. Money reaches a player through three
doors, all debt or wages, never a grant: the **Arrival Note** (20, rate 0,
non-recourse, no labour ever owed), a business's **opening advance** (50,
0%, deliberately less than one restocking beat), and the **CB window** via
a chartered bank (8%/game-year, 20% haircut, working capital capped at
5,000, repaid as 10–50% of every inflow).

**Rates and prices.** A wage is 2–6 per game-hour (mode 4) ≈ **48 per real
hour worked**; a full 6–22 shift is 64 for 80 real minutes. A meal is 2–12.
A shovel 12, a pick 26, a compass 60. A Hinkley lot is **4,000** ≈ 83 real
hours of shift work. The counting-houses pays 4 per street-night for its
lamps. Sales tax is 8%, half earmarked for the covering locality.

⭐ **Two facts from those numbers.** Rent and utilities are **not sinks** —
the economy is conserved, so they redistribute rather than drain, which
means the risk is **concentration and not inflation**; this slate exists
because of that. And **wage labour pays rent while enterprise buys the
lot**: 4,000 is 62 shifts, too slow to reach by saving wages, deliberately
— which is what makes paying rent worth it, because rent keeps you in the
city where the enterprise is.

---

## Lens pass

1. **Pedagogy** — the lesson is unusually good and unusually rare:
   **pooling is structural, not moral.** The toll-keeper is not greedy,
   they are *positioned*, and the fix relieves the position rather than
   punishing the character. Fully derivable from the ledger. ⚠ **The gap:
   no Discipline is exercised.** This acts on NPCs, so a player learns it
   by *observing* — a gazette line that the Registry ran a surplus and cut
   its fees — not by practising it. Lens 1's test is whether the world is
   derivable, which it passes; but nothing here is a skill, and inventing
   a Discipline to fill the heading would be worse than recording the gap.
2. **Expression** — the strongest heading, and the one the user named.
   Ordinary case needs no code: an undeclared NPC takes the default chain
   and recirculates invisibly. Bespoke case is destinations, shares,
   priorities and the hoard. ⭐ A textbook case of the lens's own law that
   *personalization is a derivative of supply-chain depth* — the
   declaration is only expressive because there are suppliers, staff,
   premises and institutions to send money to; in a shallow world the
   chain collapses to "the treasury" and there is nothing to say.
   **Fork decided by this limb: authors declare destinations and shares,
   never rates.**
3a. **Immersion** — the risk heading, and it decides two forks. Money must
   not teleport, so **every recirculation leg needs a counterparty that
   notices** — the supplier was paid, the worker was hired, the building
   got repaired; *where did it go* must be answerable inside the fiction.
   And **an opted-in hoard must be a real object in a real place**, or "he
   is sitting on a fortune" is prose with nothing behind it.
3b. **Participation** — the best answer in the pass: every output of the
   algorithm is a player opportunity. Recirculating by hiring means a
   player gets hired; by paying suppliers means a player supplies; by
   improving premises means a player does the repairs. *Can the polity do
   something we did not want?* Yes, reachably — a town that could steer
   where recirculation goes would be running industrial policy by
   algorithm. Not built, left open rather than closed off.
4. **Values** — the undecidable choice: **is concentration a wrong to
   correct, or a fact to manage?** This answers *manage*, and it stops at
   NPCs, which is itself the statement: the game will not redistribute
   what a person earned. ⚠ The gap: an NPC who funds the soup kitchen
   probably *should* gain standing, renown already ships, and this does
   not do it — recorded as a seam rather than quietly built.
5. **Continuity** — clean, because it is about accounts and not
   technology. A medieval toll-keeper and an industrial utility
   concentrate identically, and the same questions answer in both epochs:
   what have you got, where does it go, who got it last. The only
   epoch-sensitive piece is what *improve the premises* means, and that is
   content.
6. **Economy** — produces circulation, specifically the DAU-independent
   kind; consumes nothing, moving money that already exists and never
   minting or destroying it. Who pays: nobody new. ⭐ **The demand was
   there first and predates the premises build** — the 8% sales tax has
   been piling up in `/compact/treasury` with half earmarked for
   localities that hold no accounts, and every NPC business that sells has
   been taking money in with nowhere to put it. The concentration is
   already happening; it has never had an exit.
7. **Governance** — thin, and the answer is a **boundary rather than a
   mechanism**. Today it judges nobody: the criterion is arithmetic, it
   applies uniformly, it applies to NPCs only, and there is no discretion
   anywhere — so there is no criterion to name and no appeal to build.
   ⚠⚠ Two futures break that and both are reachable from this seam: **a
   town directing where recirculation goes**, and **any extension to
   players**. Either needs a named criterion, an appeal and an
   entrenchment tier; the player extension additionally needs the Law 2
   amendment. The boundary is written here so the next build does not
   cross it by accident.

---

## The premises interlock — what this owes, and when

⭐ **The premises build creates this problem**, so it owes the **backstop
and only the backstop**: the concentration read, the destination chain
with its default order, and opt-in hoarding. Without it, the first build
that charges rent routes money to an NPC landlord with no exit.

Everything else here — proportions and priorities as an authoring surface,
the derived prose, the hoard as a findable object, collect-less relief —
is this slate's own build and can land whenever.

---

## Open questions

- **What IS an insolvent NPC?** The estate ladder (`credit.md`) is keyed on
  absence and an NPC is never absent, so insolvency has no state. Does she
  skip meals and show it, borrow, lose her room — or is the backstop
  simply forbidden from spending her below her own subsistence? ⚠ The last
  is the cheapest and probably right, but it means the backstop needs to
  know what subsistence costs, which reaches into the needs side this
  slate otherwise excludes.
- **Does a declaration bind, or advise?** If a shop's share says suppliers
  and the supplier is dry, does the money wait or re-route? Binding is
  predictable; advisory is lifelike. *Lean: advisory for the fiction,
  binding for the backstop* — which is the same split as priorities versus
  proportions, and may mean the question is already answered.
- **Is collect-less in the same build as spend-down?** It is the cheaper
  mechanism and the better fiction, but it reaches into prices and rents,
  which is a wider surface. (User: *"both probably."*)
- **Does the window for the concentration read want authoring at all?** The
  position taken here is no — but a seasonal business legitimately accrues
  in one season and spends in another, and a window too short reads that
  as concentration.
- **Numeric calibration** — deferred to a running game, as farming and
  ranching both did.

---

## Cross-references

- [premises-requirements](../../requirements/premises-requirements.md) —
  creates the problem; owes the backstop
- [banking.md](../../subsystems/banking.md) — the conservation chokepoint,
  the enumerated mint/drain sites, `PnlCategory`
- [credit.md](../../subsystems/credit.md) — the three estate states (and
  why they do not cover an NPC)
- [stewardship-doctrine.md](../../stewardship-doctrine.md) — the
  recurring-charge call; why this stops at NPCs
- [employment.md](../../subsystems/employment.md) — the roster, openings,
  `call: regulars`, piece-rate: the hire destination
- [behavior.md](../../subsystems/behavior.md) — brains as the concrete
  executor beside the abstract backstop
- [trait.md](../../subsystems/trait.md) — the disposition layer the
  spending character derives from
- [renown.md](../../subsystems/renown.md) — the standing an NPC benefactor
  does not yet earn (lens 4's gap)
- [economy-slate](./economy-slate.md) — Law 2
- [livelihood-slate](./livelihood-slate.md) §7.3 — the state's
  appropriation primitive, the treasury terminal's eventual owner
- [household-lifecycle-slate](./household-lifecycle-slate.md) — NPC
  households and the remittance destination
