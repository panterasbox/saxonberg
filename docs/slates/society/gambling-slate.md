# Gambling slate — the same trade as insurance, with the sign flipped

> **Status: UNBUILT — DESIGN CAPTURED 2026-11-19.** Nothing exists: no
> card game, no wager, no tote. A two-party wager is already expressible
> as a contract with escrow ([contract.md](../../subsystems/contract.md)).
> **Left:** cards (the deal is the world, the play is skill) · the
> two-party wager · the pari-mutuel pool · the pen conflict rule for
> wagers · local legality · the chip-dumping defense · the lawyer's read
> on virtual stakes.
> **Size:** a tail for cards and wagers; a build for the tote, which
> waits on scheduled sport.

From the same design conversation as
[insurance-slate § Designed 2026-11-19](./insurance-slate.md). The owner:
*"how does all this relate to gambling, which is a different business
but operates on some of the same economics with regard to risk."*

Related: [insurance-slate](./insurance-slate.md) (**the twin**),
[uncertainty.md](../../uncertainty.md) (A6 — the hard rule),
[lenses/46-reward.md](../../lenses/46-reward.md) (B5),
[lenses/7-endogenous-value.md](../../lenses/7-endogenous-value.md) (the
roulette test), [tourism-and-sport-slate](../world/tourism-and-sport-slate.md)
(scheduled matches — the demand), [standing-mint-slate](./standing-mint-slate.md)
(the conflict rule), [money-integrity-slate](../tech-debt/money-integrity-slate.md)
(chip dumping).

---

## ⭐⭐⭐ One trade, two signs

The arithmetic is insurance's, and the buyer loses on average in both:

- **Insurance** pays a small certain amount to **shed** a large
  uncertain loss.
- **Gambling** pays a small certain amount to **buy** a large uncertain
  gain.

The line between them is **insurable interest** — you may insure a loss
you would suffer anyway; a bet on a loss that is not yours is a wager.
Lloyd's coffee house wrote both until the Life Assurance Act of 1774
(the Gambling Act) split them. **Insurance prices risk; gambling
creates it for the pleasure of holding it.** The bookmaker and the
underwriter read the same record for the same reason.

## ⭐⭐⭐⭐ What survives our own rules

Two rules already in force shape the whole register:

- **A6** (invariant): no randomness decides what your action did
  ([uncertainty.md](../../uncertainty.md) — *roll to decide what the
  world IS, never what your action DID*).
- **B5** (the founder's, on ethical grounds): no variable-ratio
  reinforcement.

⛔ **Together they rule out the slot machine and every house-banked game
of pure chance.** The engine ships no resolutional dice, so an honest
slot cannot be built. What survives:

1. ⭐⭐⭐ **Cards — the deal is the world, the play is skill.** Poker and
   backgammon are the doctrine *"the dice are in the deal, never in the
   play"* made into a table. The shuffle is a seeded deal; everything
   after is decision. **Cards at Dave's Bar.**
2. **The two-party wager** on an outcome neither party controls — a
   match, a race, the weather. Our weather is stateless and computable
   ([insurance-slate § the almanac-maker](./insurance-slate.md)), so a
   weather bet is a **contest of knowledge**, and the almanac-maker is
   its natural bookmaker.
3. ⭐⭐⭐ **The pari-mutuel pool — a mutual turned inside out.** Bettors
   pool their stakes, the crowd sets the odds, and the house takes a
   fixed, published cut and carries no risk. **A mutual insurer and a
   tote are one institution with the sign flipped.** The adversarial
   house disappears from both in the same way.
   - ⚠ **Correction to [tourism-and-sport-slate](../world/tourism-and-sport-slate.md):**
     *"it goes wrong the moment a house takes a cut"* is too strong.
     The cut is the price of matching and pricing — the insurer's
     margin, the bookmaker's vig. **What goes wrong is a house that
     sets odds on dice it controls**, and A6 already forbids the dice.

## ⭐⭐⭐ The pen conflict rule — nobody bets on what they write

The standing conflict rule
([standing-mint-slate](./standing-mint-slate.md)) extends:

> **Nobody may wager on, or underwrite, an outcome they hold the pen
> over.**

- An **author** may not bet on events in their own extent — it is
  rigged by construction.
- A **legislator** may not bet on a bill they vote on. ⚠ A prediction
  market on bills is only safe with this rule — and with it, it is a
  useful one (the crowd's estimate of a bill's chances is news).
- A **player in a match** may not bet against themselves — the
  athlete's rule.

The record can see all three: authorship, votes and the roster of a
match are recorded, so the check is derivable.

## ⛔ What is never at stake

- **Standing** — never wagered, insured or pledged [invariant]. A
  wager of standing is a sold vote.
- **Real money** — never [invariant]. Zorkmids and goods only.
  ⚠ Virtual stakes have been held to be a *"thing of value"* in at
  least one US case (*Kater v. Churchill Downs*, 9th Cir. 2018, under Washington law) —
  **on the lawyer's list** with the founding offering's
  classification question.

## The lens pass

1. **Pedagogy.** Implied probability (pari-mutuel odds are the crowd's
   estimate), conditional probability and expected value (poker),
   forecasting skill (the weather book). Derivable: outcomes resolve
   from the record.
2. **Creative expression.** Ordinary case, no code: a wager is a
   contract with escrow; a tote is a pool with a published cut; a card
   room is a place that hosts a seeded deal. Bespoke: any witnessed
   outcome can be bet on.
3. **a Immersion** — taverns, race books and the tote board are native
   to the fiction. **b Participation** — the bookmaker, the tote
   operator, the card-room host, the almanac-maker as weather
   bookmaker. *Can the polity do something we did not want?* Yes:
   **match-fixing** (courts and press), and ⚠ **chip dumping** — losing
   on purpose to move zorkmids, the classic route for real-money
   trading. It belongs with
   [money-integrity-slate](../tech-debt/money-integrity-slate.md).
4. **Values.** No slots (B5); no resolutional dice (A6); never standing,
   never real money (invariants); the pen conflict rule [grain; a
   polity law at C tier].
5. **Continuity.** Dice → cards → mechanical totalisator → electric
   tote: the same verbs in every epoch.
6. **Economy.** A transfer, zero-sum between players; the tote's fixed
   cut is the only sink, and **no house mints anything**. Demand: cards
   need only players and zorkmids; sports betting waits on scheduled
   matches ([tourism-and-sport-slate](../world/tourism-and-sport-slate.md)).
7. **Governance.** **Legality is local** — each realm or extent decides
   by its own law; culture is theirs under soft limits, and the engine
   permits whatever survives A6 and B5 [title]. Revoking a bookmaker's
   or tote's license is power over a livelihood and carries fair
   procedure. Match-fixing and pen-conflict violations are the court's.

## Open

- The lawyer's read on virtual stakes (above).
- Whether the tote's cut may be set by the venue or is capped by the
  polity.
