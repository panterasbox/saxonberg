# Flowers slate — the good whose only use is meaning

> **Status: design surface, unbuilt, no phase gate passed.** Spun out of the
> [farmstead](../../requirements/farmstead-requirements.md) design pass
> (2026-09-03), which put flowers into the *industrial* economy — clover as
> nitrogen and forage and bee plant (D43), saffron as the labour-intensive
> smallholder crop (D44), pollination as a positive externality (D35), and
> textiles' three dyestuffs already shipped. Everything **social** about
> flowers was deliberately left out of that build and lives here.
>
> **This slate is not really about flowers.** Flowers are the cleanest
> exemplar of a category the game has never modelled: **goods whose entire
> value is what they mean.** Jewellery, heirlooms, trophies, medals and
> relics are the same shape. Design it once, on the case where it is most
> obviously true.

See also: [farmstead requirements](../../requirements/farmstead-requirements.md)
(the industrial half, and D44's unifying fact) ·
[farming-slate](./farming-slate.md) (the `_flowering` latch, breeding) ·
[cosmetics-slate](./cosmetics-slate.md) (scent, and dye as a textiles chain) ·
[standing-mint-slate](./standing-mint-slate.md) (what a scalar of social worth
does) · [currency-slate](./currency-slate.md) +
[balance-slate](./balance-slate.md) (*every global ledger is a currency*) ·
[gazette-slate](./gazette-slate.md) (the state aggregates, never reports).
Substrates: [measurement.md](../../measurement.md) (**the governing doc** —
engine measures · subject values · polity imposes) ·
[wiki.md](../../subsystems/wiki.md) · [chronicle.md](../../subsystems/chronicle.md) ·
[renown.md](../../subsystems/renown.md) · [trait.md](../../subsystems/trait.md) ·
[contract.md](../../subsystems/contract.md) ·
[crafting.md](../../subsystems/crafting.md) ·
spoilage/freshness (`docs/subsystems/spoilage.md`, landing with cooking !231) ·
[banking.md](../../subsystems/banking.md) (⚠ the conservation chokepoint).

---

## The frame — a costly signal, and the mechanism transfers intact

A cut flower does nothing. No nutrition, no material use, and it is dead
within days. Its entire value is **what it says, and who saw you give it.**

That makes it the cleanest possible test object for
[measurement.md](../../measurement.md)'s three layers. The engine can measure
that a white flower was left at a grave on a given day. It has **no opinion
whatever** about what that meant. Nobody but the people involved sets its
worth, which is layer 2 in its purest form and the reason this is worth
building at all.

And it is real economics, three ways at once: a **positional good** (Veblen,
1899 — value from what having it says about you), a **signal** (Spence, 1973 —
a costly action is credible precisely because it is costly), and the
**handicap principle** (Zahavi, 1975 — the waste *is* the message).

> ⭐⭐ **The unification, carried over from farmstead D44.** A flower evolved
> as a costly signal to an insect: colour, scent and nectar are all an
> advertisement, and their expense is what makes them believable. Humans then
> use the identical object as a costly signal **to each other.** The
> mechanism does not need translating — it is the same mechanism, aimed at a
> different receiver. That is the rarest kind of teachable fact: one model,
> two domains, no analogy required.

Which yields the design rule the whole slate hangs off:

> **A flower must remain useless and perishable.** The moment it has a stat
> effect it becomes a consumable, and the signal stops being a signal. Its
> uselessness is the feature.

---

## ⭐⭐⭐ Floriography — meaning is content, and PLAYERS author it

The Victorian language of flowers is the obvious hook, and the obvious
implementation is a table: rose = love, cypress = mourning, yellow carnation =
disdain. **We must not ship that table.**

A shipped meanings table is the engine asserting layer 2 — the exact act
`measurement.md` forbids, and the same error as a game telling you what your
own memorial meant. It is also, practically, dead content: a meaning handed
down is trivia, where a meaning a community arrived at is *culture*.

So:

- **The engine records the act.** Who gave what, to whom, where, when — and
  in public or not. That is a fact, and facts are the engine's business.
- **The meaning lives in the [wiki](../../subsystems/wiki.md)**, which ships
  with typed subjects and a community edit surface. A locality's floriography
  is a page its own players wrote, and **two localities may disagree.**
- **Convention is discoverable, never enforced.** You can hand somebody a
  flower that means something awful three towns over and not know it. That is
  not a bug; it is the most realistic thing in the design.

This is lens 2 at full stretch and it is a genuine instance of the platform's
thesis rather than a decoration on it. It also costs almost no engine work,
which is suspicious in a good way.

**Open:** does this need *any* engine support beyond the act record — a way to
attach a wiki subject to a flower kind, say — or is prose plus the wiki
already sufficient? Lean: sufficient. Resist the schema.

---

## What a flower is, mechanically — nearly all of it ships

| Need | Shipped substrate |
|---|---|
| Cut from a living plant | the `_flowering` latch on `GrowingMixin` |
| **Wilts** | the spoilage/freshness gauge (cooking !231) — the wilt is *why* the signal is costly |
| Given | `give` / `offer` |
| Worn | slot + embodiment (a flower in the hair, a buttonhole) |
| Placed, left at a grave | furnishing `place` |
| A bouquet, a wreath, a garland | crafting — an assembly whose **composition is the message** |
| Sold | retail, consignment |
| Commissioned | the work-contract substrate |
| Remembered | [chronicle](../../subsystems/chronicle.md) |

**The build is small and content-heavy**, which is the shape we want: the
interesting part is what players do, not what we wrote.

---

## The florist — the first trade whose demand is *constructed*

Every vocation so far passes the demand test by pointing at an unmet material
need: somebody wants bread, cloth, ore. A florist passes it **only if the
culture decided flowers matter.**

That is worth building deliberately rather than apologising for:

- It is a real distinction — **derived demand versus constructed demand** —
  and no other trade in the game can teach it.
- It carries an honest risk: **if players do not care, the trade dies.** We
  should let it. A florist failing is a *measurement* of whether the culture
  took, and faking the demand with NPC buyers would destroy the only thing
  the trade was for.
- It gives the [vocations register](../../vocations.md) its first entry
  whose viability is an empirical question about the playerbase.

---

## Breeding ornamentals — where novelty itself is the value

The third consumer of the shared `Genome` layer, after crops and livestock —
and the one that selects on **form and colour** rather than yield.

The economics invert: for grain, a better variety is worth more because it
*produces* more. For an ornamental, **a new colour is worth more because
nobody else has it.** Value from scarcity of the thing itself rather than from
what it does — which is the positional good again, arriving from the genetics
side.

**Open:** ornamentals could ride livestock's parentage-seeding (farmstead D26)
rather than waiting on the full genome. Probably yes, same argument.

---

## ⚠⚠ Tulip mania — build the preconditions, NEVER the event

The 1637 Dutch tulip episode is the most famous speculative bubble in
economics, and this game has banking, a market, contracts and a standing
ledger. The temptation is to script one. **Do not.**

A scripted bubble is an authored outcome — the game asserting an economic
truth instead of letting one be discovered, which is the same failure as the
meanings table one section up. What we can honestly do is make the
**preconditions** available and see what happens:

1. **A good whose value is purely social** (the frame, above).
2. **Unique variants** that breeding can produce and that nobody else holds.
3. **Slow reproduction** — bulbs multiply slowly, which is true and is what
   makes a corner possible.
4. **Forward contracts** — and this is the historically exact part: by 1636
   the trade had moved to contracts on bulbs still in the ground, the
   *windhandel*, "wind trade." The [contract substrate](../../subsystems/contract.md)
   ships clauses over verifiable conditions plus escrow, so a futures market
   in flowers needs **no new mechanism.**

Then a bubble is a **finding**, not a feature. If one happens the gazette
reports it, the wiki records it, and the polity may or may not legislate —
which is the whole platform doing exactly what it claims to do.

> ⚠ **Get the history right, because the honest version is the better
> lesson.** The popular story of ruined Dutchmen leaping into canals is
> largely 19th-century moralising; Anne Goldgar's archival work found the real
> economic damage was modest and concentrated among a small circle of dealers.
> *The myth outgrew the record* — and a game whose thesis is about honest
> measurement should teach the gap between the two rather than reproduce the
> legend.

**⚠ Open, and load-bearing:** how a flower futures market interacts with
[banking](../../subsystems/banking.md)'s conservation chokepoint. Speculation
must move money between players and never mint it. Settle this before any
build; a bubble that inflates the money supply is not a lesson, it is a bug.

---

## What must not happen

- **No shipped meanings table** (above). The engine records the act.
- **No `+regard` for giving a flower.** A costly signal works because it is
  voluntary and unrewarded by the system; paying you for it converts a gesture
  into a transaction and kills the thing being modelled.
- **No stat effect, no buff, no consumable.** Uselessness is the feature.
- **Nothing may *require* a flower.** No gated quest, no recipe that needs
  one. The moment a flower is instrumentally necessary it stops being a
  signal and becomes a component.
- **No scripted bubble**, and no NPC propping up florist demand.

---

## Open questions

- Does floriography need any engine surface at all beyond the act record?
  *(Lean: no. Resist the schema.)*
- Is a cut flower's wilt just the shipped freshness gauge, or does it want its
  own curve? *(Lean: freshness. A second clock for one object is a smell.)*
- Is the florist a `trade-` pack, or locality content over crafting + retail?
  *(Lean: content first — trade is mechanism, locality is expression; a pack
  only if a second venue needs the code.)*
- Does the act record ride [chronicle](../../subsystems/chronicle.md),
  [provenance](../../subsystems/provenance.md), or neither?
- How does the futures leg respect money conservation? **Blocking.**
- Do ornamentals wait on the genome or take parentage-seeding? *(Lean: seed.)*
- Does this generalize now — jewellery, heirlooms, trophies — or after flowers
  prove the shape? *(Lean: after. Two instances is where a pattern is named.)*

## Scope guardrails

- **Zero new verbs if it can be helped.** `give`, `place`, `wear`, `craft`,
  `buy` and `consign` all ship; a bouquet is an assembly, not a new act.
- **No new Mongo collections.** The act record rides an existing ledger or the
  document tree.
- **Meaning is content, never code.** If a design step wants a table of
  significances in TypeScript, the step is wrong.
- **Build it small.** The value is entirely in what players do with it, so the
  engine's share should be embarrassingly thin.
