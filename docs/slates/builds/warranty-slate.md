# Warranty slate — the claim you make about the thing you sell

> **Status: design surface, unbuilt, no phase gate passed.** Found 2026-09-03 by
> the [farmstead](../../requirements/farmstead-requirements.md) multiplayer pass,
> which needed producers to sell to each other and discovered they cannot say
> anything binding about what they are selling.
>
> ⚠ **Verified gap.** Checked against the three docs that would own it —
> [contract.md](../../subsystems/contract.md),
> [retail.md](../../subsystems/retail.md),
> [accountability.md](../../subsystems/accountability.md). **None of them has a
> representation primitive.** The game has *sale*; it has no *claim*.
>
> **This is not a farming feature.** It is crafted goods, magic items, livestock,
> land, second-hand gear, and anything anybody ever sells with a sentence
> attached. It was found by farming because farming is where producers first had
> to trade with each other.

See also: [auction-slate](./auction-slate.md) (**the sibling** — it already names
the lemons problem and the winner's curse, and the appraiser is this slate's
natural ally) · [farmstead requirements](../../requirements/farmstead-requirements.md)
(**D79** the herdbook as a sales document · **D81** producer trade · **D48** the
hay that burns the barn) · [legal-code-slate](./legal-code-slate.md) (**where the
polity chooses**) · [credit-slate](./credit-slate.md) ·
[reputation-slate](./reputation-slate.md) · [identification-slate](../tails/identification-slate.md).
Substrates: [contract.md](../../subsystems/contract.md) (**the mechanism —
clauses over verifiable conditions, escrow**) ·
[accountability.md](../../subsystems/accountability.md) (derive-on-read blame) ·
[chronicle.md](../../subsystems/chronicle.md) · [renown.md](../../subsystems/renown.md)
· [provenance.md](../../subsystems/provenance.md) · [retail.md](../../subsystems/retail.md)
· [magic-items.md](../../subsystems/magic-items.md) (**BUC — the sharpest case**).

---

## ⭐⭐⭐ The frame — a warranty is a clause verified *after* delivery

The contract substrate already does clauses over verifiable conditions, with
escrow and a board. **What it cannot express is a condition evaluated later,
against the thing that changed hands.**

> **You can promise to *do* something. You cannot promise that something *is*
> something.**

That one gap is why every trade in the game is either a shop transaction (you
see it, you buy it) or a job. There is no room for the enormous middle where the
seller knows more than the buyer and says so.

---

## The problem it exists to solve, and every cure is already in the game

Akerlof's market for lemons: where the seller knows more, buyers discount for
the risk, good sellers withdraw, quality falls, and **the market can collapse
entirely** — a real result, and one you can *feel* rather than be told.

Every institution real markets grew to cure it is already a Saxonberg system.
That is the striking thing about this gap: **six of the seven cures are shipped
and none of them knows it is solving the same problem.**

| Cure | In the game |
|---|---|
| **records / pedigree** | the herdbook (farmstead **D79**), the chronicle |
| **reputation** | renown |
| **public bidding** | [auction-slate](./auction-slate.md) |
| **appraisal** | the appraiser that slate already names |
| **provenance** | chain-of-title, `authoring_events` |
| **brands / marks** | `corpo`, `BrandedMixin` |
| ⚠ **warranty** | **nothing** |

And note what makes the missing one different: **every other cure informs the
buyer. A warranty binds the seller.** It is the only one that puts the person
who knows on the hook, which is why it is the one law had to invent.

---

## Three kinds of thing a seller says, and only two of them bind

Real, legally distinct, and teachable in one line each:

| | Example | Binds? |
|---|---|---|
| **A statement of fact** | *"she is in calf"* | **yes** — it is true or it is false |
| **A promise about the future** | *"this blade will hold an edge a year"* | **yes** — a guarantee |
| **Puffery** | *"finest hay in the valley"* | **no** — opinion, and everybody knows it |

The representation/puffery line is the whole art of selling, it is genuinely
where commercial law draws its boundary, and a player who learns to hear the
difference has learned something that works outside the game.

---

## The remedy ladder — and D48 is why it matters

| Remedy | Note |
|---|---|
| **rescission** | give it back, get the money |
| **replacement** | another one |
| ⭐ **damages** | *what the failure cost you* — which is usually far more than the price |
| **reputation** | the failed claim recorded against the seller |

⭐⭐ **The damages rung is where farmstead makes this vivid.** D48: hay baled wet
self-heats and burns the barn it is stored in. So *"the hay was baled dry"* is a
representation whose failure **costs a neighbour their barn, their winter feed
and possibly their animals** — orders of magnitude beyond the price of the hay.

**Consequential damages are the reason warranties are frightening**, and this
build hands us the perfect case without inventing one.

---

## ⭐⭐ The polity question — caveat emptor, or an implied warranty?

The great commercial-law fork, and it is **a genuine choice with two real
sides**:

- **Caveat emptor** — buyer beware. Nothing is warranted unless it is said.
  Cheap, fast, and it rewards the informed and punishes the new.
- **An implied warranty of merchantability** — goods must be fit to be sold as
  what they are, whether or not anybody promised it. Protects buyers, raises
  costs, and chills casual trade between strangers.

Neither is correct, both have been the law, and **a polity should be able to
choose** — which makes it exactly the kind of legislation the
[legal-code](./legal-code-slate.md) substrate exists for, with consequences
traders will feel within a season. **No authored villain required.**

---

## ⭐ It creates the demand for instrumentation

The reason to pay for a reading is that **money rides on it.** A warranty makes
every assay, survey, appraisal and inspection worth its price — which closes a
loop with every `measure`/`analyze` channel in the game and gives the
instrumentation ladder an economic engine instead of only a pedagogical one.

Buyer's inspection, seller's disclosure, and a third-party appraiser are three
different answers to the same question, and all three are already buildable.

---

## ⚠⚠ The design rule that keeps it honest

> **The engine must never decide whether you lied.** It records **what was
> claimed** and **what turned out to be true**, and lets the consequence run.

No truth-detector, no automatic refusal of a false statement, no honesty stat.
That is the measurement doctrine applied to speech: the engine measures, the
subject values, the polity imposes. A seller who was wrong in good faith and a
seller who lied look identical to the engine — **and telling them apart is the
court's job, which is content.**

---

## The sharpest case is not agricultural

**BUC.** `magic-items` ships blessed / uncursed / cursed, and identification is
its own tail. **A cursed item sold as uncursed is the lemons problem with
fangs** — the buyer cannot tell, the seller may or may not know, and the harm
lands later on someone who trusted a sentence. If this primitive works anywhere,
it must work there.

---

## Open questions

- **What does a representation attach to** — the offer, the contract, or the
  item? *(Lean: the contract, since that is where clauses live; but an item that
  carries its claim is what makes resale interesting.)*
- ⭐ **Does a warranty travel on resale?** Real ones usually do not, which is
  precisely why second-hand trades at a discount — and the auction slate already
  observes that murky title is a discount at the salvage yard and a premium at
  auction. *Probably the same answer, arrived at from the other side.*
- **Good faith versus fraud.** Negligent misrepresentation and deliberate
  misrepresentation are different wrongs with different remedies. Does the
  ledger distinguish them, or does the court?
- **How long does a claim run?** A season, a year, forever? A limitation period
  is itself a polity choice.
- **Who verifies, and who pays for it** — buyer's inspection, seller's
  disclosure, or a paid third party?
- Does this want a `warranty` clause kind, or is it a **general "assertion"
  primitive** the whole game can use — including outside commerce?

## Scope guardrails

- **Ride contracts.** Clauses over verifiable conditions plus escrow is nearly
  the whole mechanism; the new part is a condition evaluated *after* delivery.
- **No new Mongo collections.** Claims and outcomes belong on existing ledgers.
- **The engine records; it never adjudicates truth automatically.**
- **Build it general, prove it on one case.** Livestock is the readable case;
  BUC is the one that proves it. Neither should get a bespoke mechanism.
- ⚠ **Do not make honesty a stat.** Reputation is derived from a record of what
  happened, exactly as renown already is.
