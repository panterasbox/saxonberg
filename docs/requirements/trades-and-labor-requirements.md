# Trades & the labor market — requirements

**Kind:** refactor/sweep (Stage A) → feature (Stage B)
**Leads from:** content

Two things the same rule decides. **The kernel provides businesses,
corporations, money and an economy; a content pack provides a specific
trade.** Stage A applies that rule to the shop — the one place where a
vocation's instruments are still kernel furniture — and stands up
`trade-shopkeeping`. Stage B uses the same rule to answer a question the
economic bootstrap left open and that nothing in the game can answer
today: **how does a person get paid work?**

Seeded by [credit-slate](../slates/tails/credit-slate.md) Part 11 (the
labor gap named at the bootstrap's MR review),
[livelihood-slate](../slates/builds/livelihood-slate.md) §3 and §5.4
(the decided employment model), and [vocations.md](../vocations.md) (the
register: *shopkeeper* shipped, *broker/trader* a gap).

---

## What already exists

### The labor surface — measured, not recalled

- **58 authored positions** across 49 businesses in 21 packs. **43 are
  already filled** by an authored NPC.
- Of the **15 unfilled**, fourteen pay `wageRate: 0` — founder seats,
  committee clerks, a prototype. ⭐⭐ **Exactly one open seat in the world
  pays a wage**: `labourer` at the university farm, 2/hour, authored
  explicitly as "rung zero: no gate, no prerequisite, no application."
- **`appoint` is the only way in**, and it requires someone holding the
  business's `appointingAuthority` plus an *online* target. **There is no
  `apply`, `hire`, `fire` or `apprentice` verb.** `quit` is the only
  player-side employment verb.
- The only *diegetic* hire path in the game is **Dave's dialogue tree** at
  the lounge — one hand-authored branch, guarded on whether you already
  hold the seat, dispatching `appoint` as Dave.
- **Everything else works.** Positions with wage rates, rosters with
  shift windows, the on-shift capability grant, `house payroll`,
  `house roster`, tips, and `payHouseWage` (arrears → a rung-2 draw where
  the house has earned one → a refusal that says why).

### The gig board — built, placed, and starved

- **11 job boards** stand in the world: the terminal arrival hall, the
  pithead, and nine goods-yard and lounge floors. **All start empty.**
- Three gig kinds ship, all verifiable: `deliver`, `supply`, `watch`.
  Escrowed, claimable by any stranger, with an open-bounty form.
- ⭐⭐ **One NPC supplies gigs** — Mara, via the `restocks` brain, reading
  her bar's `parLines:`. **`parLines:` appears in exactly one file in the
  repo.** The world's entire autonomous gig supply is one bar's par sheet.
- ⭐ **The reservation wage already exists and is well-made**: the haulage
  carter runs `hauls`, takes any *unclaimed* gig and never claims one, so
  a player can always beat him to it.

### Competence

- **68 Disciplines** exist. **No position has ever conferred one** —
  `confers:` is only ever `[MakerMixin]` (9 seats) or empty. **There is no
  `requires:` on a position at all.** A job today neither demands nor
  teaches anything.

### The shop, as it sits

- `Stock` and `ConsignmentShelf` are **kernel classes**; **20 rows**
  (16 counters + 4 shelves) across **four packs** — terminus, rejection,
  trade-textiles, hearts-delight — compose them. The one `BankCounter` in the repo is terminus's.
- Command views bind to their consumers by **path string** carried in a
  `commandContributions` static on the class. ⭐ A **pack class affording a
  platform view is the shipped pattern**, in five places already
  (`ManaLamp`→`device/switch`, `SoilKit`→`perception/measure`, the Gazette
  `Editor`→`system/press`, forestry's `Panel`, the hospitality bar).
- **17 archetypes exist and not one is a shop, store, bank or counting
  house.** The nearest template is haulage's `depot.yaml`.
- A capability pack is four keys of `pack.yaml`, a `content/` tree
  mirroring the class path, and a `src/` with the namespace prefix
  stripped. `trade-fuel` and `trade-milling` are the exemplars.

### Therefore what is genuinely new here is

**Stage A:** a `trade-shopkeeping` pack holding the shopkeeper's
instruments and practice — and nothing else, because every verb in the
shop loop turns out to be a consumer act.

**Stage B:** four small things — *an opening* (a seat a business says it
wants filled), *a sign* (derived, so no venue can forget to advertise),
*an application* (the player moves first, refused with a number), and
*par lines on more than one business* (so eleven boards that already
exist stop being empty).

Everything else the labor market needs is shipped and was measured above.

---

## Goals

- **A person who has just arrived can find paid work without knowing
  anybody**, by reading a board or a sign and asking.
- **A business can say it is short-handed** and have that be visible in
  the world rather than in a table.
- **A refusal teaches**: it names the number wanted and the number held,
  and doing the named thing lifts it.
- **The shopkeeper's trade lives in a pack**, so a second town's shop —
  and a second shop-shaped vocation like a pawnbroker — needs no kernel
  change.
- **The eleven placed job boards carry work**, supplied by more than one
  NPC's par sheet.
- **The kernel/pack line is stated and checkable**, so the split cannot
  silently rot back.

## Non-goals

- **A derived labor market** (demand measured from work undone, wages
  clearing against it) → `livelihood-slate` §3, whose "[OPEN] Pricing" and
  the systemic need-generator own it.
- **An NPC who notices you and offers** → `livelihood-slate` §5.4's
  `[LEAN] Diegetic discovery`, deliberately deferred behind the
  application (see *Surface decisions*).
- **`trade-banking`** → deferred with a reason: the designed banking work
  is governance-shaped, not vocation-shaped. The next banking build is
  `credit-slate` Part 6 (local underwriting) and Part 7 (the locality as
  buyer of distressed debt).
- **The pawnbroker** → a later member of `trade-shopkeeping`, not of
  banking: its core skill `appraisal` is ISCED-F 0416, *wholesale and
  retail sales*, and specializes `retail-sales`. Needs a licence concept
  that does not exist.
- **Firing, the AFK wage gate, the trust ramp's depth, cozy downtime** →
  `livelihood-slate` §5.4, all already recorded there.
- **The employer-of-last-resort / public-works floor** →
  `livelihood-slate` §8.2, a build of its own with governance dials.
- **Renaming the `retail-sales` Discipline** → nowhere, deliberately. See
  *Surface decisions*.
- **Money changing, ratings, accountancy, the secondary debt market** →
  `credit-slate` Part 11's gap table.

---

## Placement

**`trade-shopkeeping`**, root `/trade/shopkeeping`, title held by
`/compact/trade` like every other trade pack. It takes the shopkeeper's
**instruments and practice**: the counter, the consignment shelf, the
stocking and consigning brains, the trade's own dials, the shop seed a
player's stall is minted from, the shopkeeper's management subcommands,
and a new `shop` archetype.

⭐ **The test it must pass: a second general store in another town needs
zero pack code.** The archetype is what makes that true — today the
general store, the market stalls and eight goods-yard counters each
compose their counter by hand.

**`trade-hospitality`** takes `CheckRack` — the cloakroom is the
doorman's instrument, used by exactly one venue.

**The kernel keeps** everything a *consumer* does and everything the
*economy* is: `buy`, `consign`, `reclaim`, `pay`, `wallet`, `draw`,
`bank`, `menu`, `order`, `check`, the Apis and their collections, money,
the reserve, the treasury, the Central Bank, the Disciplines, and
`attendant`.

**Stage B's placement** follows the same line: *a seat and its wage* are
the kernel's (the kernel provides businesses); *which seats a venue
offers* is content.

---

## Collisions

| what is already there | what this touches |
|---|---|
| **The general store** (terminus) — a counter, a consignment shelf, a clerk at 5 and an unwaged keeper | re-classes the counter; gains an authored opening and a derived sign |
| **The market stalls** + `stall rent` | the stall's Business seed moves into the pack; `stall rent` is terminus's and must keep working |
| **The lounge** — Dave's hiring dialogue, the check rack, Mara's `restocks` par sheet | Dave's branch is the *prior art* the application generalizes; `CheckRack` moves to hospitality; Mara's par sheet stops being the only one |
| **The university farm `labourer`** — the one waged open seat | becomes one of several, and gains a sign |
| **Eight goods-yard counters**, the mill, the bakery, the fish stall | all re-class; none should change behaviour |
| **The terminal arrival hall board** — the first board a new arrival sees | must carry gigs at world start, not after fifteen minutes of one bar's beat |
| **rejection, trade-textiles, hearts-delight** | gain a manifest dependency on `trade-shopkeeping` |

---

## Surface decisions

### The pack is `trade-shopkeeping`, not `trade-retail`

Every trade pack is named for a **process** — milling, smelting, dyeing,
tailoring. "Retail" is a sector, and the register's word for the person
is **shopkeeper** (shipped; gate *premises + stock*; paid by customers).
⭐ The load-bearing reason is what the name does *not* take:
**broker/trader is a separate gap vocation** — no premises, paid by the
spread on information — and naming this pack for trading would burn the
name the thing that actually needs it will want.

The wholesale objection does not hold: by the register's own gates the
cash-and-carry's keeper *is* a shopkeeper. Retail vs wholesale is a
difference in who the customer is, not a different vocation.

### Command views stay; affordances move

The `commandContributions` static naming a view's path lives on the
class. Moving views would mean changing every string in lockstep, and a
miss is a silently missing verb, not an error. It is also unnecessary:
**a pack class affording a platform view is already the pattern** (five
shipped examples), and CLAUDE.md already says *platform keeps the verbs
any trade's instrument confers*.

So **no command view moves.** The classes move and carry their affordance
strings unchanged.

Two problems dissolve as a consequence. **`reclaim` never had to choose a
home** — it serves unsold consignment *and* the check rack because it is
a consumer act. **`menu`/`order` stays** — six packs across four vocations
use it, and ordering from a menu is consumer-level by construction.

### `house` splits by the precedent already inside it

The kernel provides businesses, so `book`, `pnl`, `payroll` and `roster`
are the kernel's. Only `price`, `par` and `stock` are the shopkeeper's —
and `freight`/`traffic` in that same view *already* dispatch into
trade-haulage's controller. The vocational subcommands follow that
pattern.

### ⚠ The `retail-sales` Discipline does not move and does not rename

Asked for, and withdrawn on evidence. `retail-sales` is an **ISCED-F
taxonomy node**, not our word; the Discipline tree adopts that
classification deliberately. Platform's own `appraisal` declares
`specializes: [retail-sales]`, six agent rows in two other packs
reference it by key, and a kernel test loads Disciplines by hard-coded
path. Renaming an international standard classification to match an
internal package name is backwards. **The pack is named for the trade and
the Discipline for the field, and they are allowed to differ.**

The `retail` *command category* likewise stays: its verbs are consumer
acts, so the category name is honest.

### `trade-banking` is deferred, and the reason is structural

Applying the rule strictly leaves one class in it. Everything else —
the Central Bank, the currency, the reserve and treasury dials, the
ladder, the window — is *the economy*, which is the kernel's.

And the designed banking work is **governance-shaped, not
vocation-shaped**: `credit-slate` Part 6's finding is
⭐⭐⭐⭐ *"you do not need a risk model if the lender is the neighbour —
local knowledge substitutes for credit scoring"*, with `locality →
business` underwriting marked explicitly **not automatable and should not
be**. Committees, not tellers. Nothing trade-sized is waiting to go in
the pack.

### Openings are authored by job-makers who can pay

A business owner who can pay says the seat is open. For an NPC house
that is authored content; for a player's house it is the player's own
act. Deriving demand from work undone is the honest long answer and it
is `livelihood-slate` §3's, not this build's.

⚠ **The demand test constrains what may be authored.** An opening is only
honest if **the house's work exceeds its hands** — otherwise it is a
manufactured need and the wage is a gift with extra steps, which lens 6
names as a failure. The rule is an *authoring* rule, enforced by review
and by the seat having to name the work it does, not a runtime system.

### The sign is derived from the openings

Not an authored prop. A venue that has an opening advertises it
*because* it has one, so no author can forget, and a second town's shop
advertises on the day it is authored. ⭐ It is also the honest version:
the sign is there **iff** the seat is open and the house can pay. A sign
that is always up is a gauge.

### ⚠ The player moves first — reversing a recorded lean

`livelihood-slate` §5.4 carries `[LEAN] Diegetic discovery — Dave
*offers* (because he's genuinely short-handed), the menu is the fallback
path.` **This build reverses that**, on the user's decision and with a
reason the lean did not have:

> *"usually there's a 'help wanted' sign and an application. it's
> probably law actually otherwise you can discriminate."*

An NPC choosing whom to approach is a hiring decision made on a criterion
nobody can read — precisely what lens 6's governance limb now forbids. The
sign and the application make the criterion explicit and answerable. The
offer remains a good thing to add **on top** later, once the criterion it
would be applying is already written down.

### The criterion is completed gigs; competence is the authored option

Closes `livelihood-slate` §3's `[OPEN] Gating — employer-specific
standing vs competence bands`.

**The entry seat asks for completed gigs** — a ledger read, buildable
today, and the same shape as the credit ladder's "three completed
supplier terms". The refusal names both numbers; doing gigs lifts it.

**A trade seat may additionally name a Discipline and a band.** This is
the first use of a `requires:` on a position, and it is what makes *"work
a trade"* mean something: the job asks for the skill and practising lifts
it. It is authored and optional — a seat that names nothing asks nothing.

⛔ **Species, lineage and traits are never a criterion**, and renown is
not one either: hiring on standing is *who you know* wearing a number.

### Established houses pay the newcomer's first wage

A young business cannot borrow for a first wage (rung 2 needs repaid
rung-1 loans, which need three completed supplier terms). Rather than
loosen the ladder or have newcomers paid in arrears, the openings this
build authors sit on **houses that already trade**. Wage finance for
young businesses is a fourth rung with its own security, and it is
`credit-slate` Part 11's.

### Par lines are the gig supply

`restocks` works and is authored once. Putting `parLines:` on more
businesses lights up boards that already stand, with no code. ⭐ This is
rung zero: a newcomer earns before anyone employs them, which is what
makes the application's criterion reachable.

---

## Lens pass

**1 · Pedagogy.** The act exercises no Discipline; the job does — and
with a trade seat's `requires:`, the job now *asks* for one, which is the
first time competence gates anything a player wants. What it teaches is
how a labor market clears: a notice, a request, a refusal that names its
number. Derivable — the sign is a thing in a room, so you learn a
business needs hands by walking past it.

**2 · Expression.** Strongest limb. An author adds an opening to a
position row and the sign follows; a `shop` archetype means a second
town's store composes its counter without hand-assembly. The bespoke case
— an audition, a guild ticket, a trial shift — needs one extension point
or every unusual hire breaks the protocol.

**3 · Immersion.** The sign is what actually happens, and it is honest in
the sense this lens cares about: present iff the seat is open and the
house can pay. Being turned down is a scene. ⚠ Recorded gap: the lull
after you are hired has no mechanics — `livelihood-slate` §5.4 calls cozy
downtime *the biggest undiscovered requirement*, and this build does not
address it.

**4 · Values.** The choice is real: take the gig now for certain small
money, or hold out for a seat with a wage and the capability grant.
Standing is conferred by **the employer** — somebody with something to
lose. It fails if the application auto-accepts.

**5 · Epochs.** Clean. A public notice plus an application works in Rome,
in a shop window, and as a speaking sigil; only the medium changes.

**6 · Economy & governance.** Produces labor capacity, income, and
*information* — the sign is a public signal of unmet demand. Consumes the
player's time and the house's money. Established houses pay from their
own accounts, so nothing is a wage for existing. ⚠ The demand test is the
binding constraint and is answered by the authoring rule above.

⭐ **On the governance limb — the criterion and the appeal.** Hiring
decides something *about a person*, so: the criterion is **completed
gigs**, and a trade seat may add **a named Discipline and band**. Both are
stated in the refusal with the number wanted and the number held. Both
are lifted by doing the named thing. Species, lineage, traits and renown
are **not** criteria. ⭐ Which tier: this is **B** — shipped in the code,
amendable by whoever ships it — with the deliberate note that *whether a
polity may permit a venue to select on other grounds* is a tier-C
question this build does not open.

---

## The drive

Run against the live game before the MR opens.

1. **Arrive and look for work.** A new character reaches the terminal
   arrival hall. `look` shows the job board. `job` lists **at least two
   open gigs**, supplied by NPC par sheets — not by a player, and not by
   one bar.
2. **Earn before anyone employs you.** Claim a gig, do it, `job complete`.
   The reward lands; `bank` shows it. Repeat once so two are recorded.
3. **Read a help-wanted sign.** Walk to the general store. `look` shows a
   notice **that nobody authored as a prop**. Reading it names the seat,
   the wage, and what is wanted — "two completed gigs".
4. **Be refused, and be told why.** Before step 2's second gig — or as a
   second character with none — `apply` at the store is refused naming
   **both numbers**: what is wanted and what you hold.
5. **Be taken on.** With the gigs done, `apply` succeeds. `house roster`
   as the owner shows the new holder; the sign no longer advertises that
   seat.
6. **Work the shift.** Clock on. The position's capability grant lands
   (a verb you could not use before now works). At shift end the wage
   settles out of the house's own account and `bank` shows it.
7. **A trade seat asks for more.** `apply` at a seat that names a
   Discipline and a band is refused naming **the band wanted and the band
   held**; the refusal says practising lifts it.
8. **The shop still works, from the pack.** At the general store: `buy`
   takes a good off the counter, `consign` puts one up, `reclaim` takes
   it back. All three verbs are the same platform verbs; the counter is
   now `trade-shopkeeping`'s class.
9. **The stall still rents.** `stall rent` on the market square mints the
   player's shop from the seed in its new home, and `house price` sets an
   ask.
10. **Nothing that did not move, moved.** The bank counter takes a
    deposit; `check` hands a weapon to the lounge's rack and `reclaim`
    gets it back — from `trade-hospitality`'s class now.
11. **A second shop needs no code.** Stand up a store in another locality
    from the `shop` archetype, with rows only, and buy something from it.

## Acceptance criteria

- A player who knows nobody can go from arrival to a paid wage **without
  a wizard, a founder, or an authored dialogue branch.**
- Every refusal a player meets in that path **names a number and says
  what lifts it.**
- The world's open waged seats are **more than one**, and each is
  advertised where a player can walk past it.
- The terminal hall's board has work on it **at world start**, from more
  than one supplier.
- A venue with an open seat **cannot fail to advertise** it.
- Buying, consigning, reclaiming, banking, ordering from a menu and
  checking a weapon all behave exactly as they did before Stage A.
- A store in a new locality can be authored **with rows only**.
- No seat anywhere selects on species, lineage, trait or renown.

## Cross-references

- [credit-slate](../slates/tails/credit-slate.md) — Part 11 (the labor
  gap, the credit gaps), Part 6 (local underwriting — why banking is
  deferred), Part 7 (the locality as buyer of distressed debt)
- [livelihood-slate](../slates/builds/livelihood-slate.md) — §3 (the
  labor market; the `[OPEN]` this build closes), §5.4 (the decided
  employment model and the reversed lean), §8.2 (the public-works floor)
- [vocations.md](../vocations.md) — the register; shopkeeper, broker
- [employment.md](../subsystems/employment.md) ·
  [contract.md](../subsystems/contract.md) ·
  [credit.md](../subsystems/credit.md) ·
  [advancement.md](../subsystems/advancement.md) ·
  [content-packs.md](../subsystems/content-packs.md) ·
  [retail.md](../subsystems/retail.md)
- [design-lenses.md](../design-lenses.md) — lens 6's governance limb, and
  the defect that put it there
