# Lens: Endogenous Value

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Fresh pass, entry 6 (2026-07-28), revised in place.** Re-read from
> the book (which supplied the Bubsy and roulette poles) and re-run
> against the built economy — which turns out to have quietly solved
> this lens's hardest problem structurally. Original in git history.
>
> **Layers interrogated: both.** Manufacturing value is the platform's
> core trick; anchoring it is the game's burden; conserving it is the
> polity's.

## The lens

A game's success hinges on the players' **willingness to pretend it is
important**. Three questions: **what is valuable to the players in my
game? How can I make it more valuable to them? What is the
relationship between value in the game and the players' motivations?**

> **From the book.** Schell credits Greg Costikyan for "endogenous" —
> internally generated: "things that have value inside the game have
> value only inside the game"; Monopoly money means nothing outside
> Monopoly. Then two calibration poles. **Roulette**: so little
> endogenous value that people only play it for real money — the game
> can't make its own stakes matter. **Bubsy**: yarn balls that players
> collect at first "with the expectation that they are valuable," then
> completely ignore, because the points connect to nothing the player
> wants — value unbacked by consequence evaporates. Between the poles,
> the gauge: endogenous value is "an excellent measure of how
> compelling a game really is," and at the high end it overflows the
> game — MMO items bought and sold for real money.[^aogd-ev]

## Why our design prompts it

Manufacturing endogenous value from real effort is literally the
platform thesis — a sensor reports a real act, interpreters mint
worth from it. The educational wager is that in-game value pulls a
student toward real learning; the classic failure is the value
floating free (points chased for points' sake) while the pedagogy
dies with the metrics looking great. And the built game raises the
stakes on this lens beyond the original entry's frame: there is now a
**whole economy** — conserved money, titled property, chain-of-title
chattel — whose value claims are load-bearing for the polity thesis,
not just for fun.

## What the design answers

### Three kinds of value, each with its own integrity rule

The original entry's two kinds hold, and the buildout added a third:

- **Pure-play value** — the dorm you decorated, an emote, a brand's
  cachet, your name known at the bar. Arbitrary on purpose; worth
  flows from ownership and expression. Integrity rule: *none needed.*
  Authorship remains the most durable mint — you value the room
  because you made it.
- **Effort-anchored value** — bands, deeds, conferrals, the
  chronicle. Legitimate only while it traces to the real mastery it
  represents. Integrity rule: *the anchor must hold* (below — now
  architecture, not policy).
- **Conserved-economic value** (new since the original entry) —
  money and property. Still endogenous in Costikyan's sense (a crown
  means nothing outside the game) but its in-game worth depends on
  **honest scarcity**: conservation enforced at the mint chokepoint,
  ledger legs that must balance, title stored unspoofably, transfer
  never overwrite. Integrity rule: *the supply must not lie.* Fiat
  value with honest books — which is exactly what makes the economy
  able to carry the polity's weight.

### The Bubsy test, and why the design passes it structurally

Bubsy's yarn balls die because they connect to nothing. The design's
standing answer: **there are no bare scores anywhere** — every gauge
derives from a model and feeds consequences. Bands gate verbs; money
settles charges; standing weighs votes; wetness conducts; condition
degrades tools. The materials-response build even shipped the rule as
CI — the `check-does-nothing` lint fails a construction that affects
nothing. That lint is Bubsy-proofing, literally: nothing may exist in
the world that players will learn to ignore.

### Derive-on-read is structural anti-Goodhart

The original entry asked for "the anchor as a checked property, not a
promise." The buildout answered stronger than asked: **anchored
values have no stored number to detach.** Competence, traits, renown,
blame, authorship — all derive on read from append-only evidence
ledgers, surfaced as bands, never numbers. Goodhart's law needs a
proxy metric that can drift from the target; derive-on-read deletes
the proxy. The value *is* the recomputation over the evidence. What
players can still game is the evidence stream itself (grind acts to
feed the transcript) — and the ledgers anticipate that too: per-bucket
dedup, anti-spam, difficulty-gated learning, quality (renown) split
from quantity (participation). The residual Goodhart surface is
narrow and known.

Worth naming: the badges/leaderboards layer the old vision imagined —
the *most* detachment-prone form of endogenous value — **was never
built**, and the design that emerged instead (bands, standings,
ledgers) is the reason. It should not creep back in; the lens is the
argument against it.

### The roulette pole is the vertical's floor test

If the game needed real-credential stakes to be compelling, it would
be roulette — a hollow game borrowing importance from outside. The
floor/ceiling doctrine is this lens's discipline applied to the
product: the game must mint its own value with zero vertical inputs
(the [Toy](./the-toy.md) verdict), and the credential seam then
*imports* real value into an already-valuable world. The conferral
works because it lands in an economy that already matters — real
mastery wrapped in endogenous meaning, the avatar borrowing stakes
without the game ever depending on them.

### The MMO pole is a frontier, not a footnote

Schell's high-end marker — game items traded for real money — reads
differently for a design with actual property law and conserved
currency: if the world succeeds, real-money trade *will* emerge, and
this design is unusually equipped to face it (title, chain-of-title,
provenance, a central bank). The posture is deliberately unresolved —
the capital-standing rule ("funding is a voice, not equity, as law
stands") is the one commitment already made. This lens just names the
frontier honestly: high endogenous value overflows; plan the levee
before the flood.

## Tensions & risks

- **The two anchored failure modes are asymmetric.** A pure-play
  value that fades (a bored player ignores their dorm) costs nothing;
  an anchored value that floats free breaks the pedagogical claim
  invisibly. Vigilance goes where the asymmetry points — at every new
  effort-anchored surface, not at the toys.
- **Evidence-stream gaming is the residual Goodhart surface.** The
  dedup/ZPD guards are good; each new ledger consumer must re-ask
  "can this be fed junk acts?" — the anti-spam discipline is
  per-producer, not inherited automatically.
- **Conserved value concentrates.** Honest scarcity means real
  inequality dynamics (the polity thesis accepts this deliberately).
  The integrity rule keeps the books honest; it does not keep
  outcomes comfortable — that's governance's job, and this lens
  should not be mistaken for it.
- **Willingness-to-pretend is finite and shared.** Every system that
  asks players to care (a new currency, a new standing, a new
  gauge) draws on the same pool of pretend-importance. A world of
  ten value systems each demanding belief risks none being believed.
  Consolidation pressure is real — prefer deepening an existing
  value over minting a parallel one.

## Implications

1. **The three-kind classification is design-time policy:** every
   value-bearing element declares pure-play / effort-anchored /
   conserved-economic, inheriting its integrity rule (none / anchor
   holds / supply doesn't lie). Slate checklist, fifth entry.
2. **Derive-on-read stays the anchored-value substrate** — a stored
   competence-like number is now an architecture smell, not a style
   choice. Any proposed stored standing must justify why it can't be
   an evidence ledger.
3. **The `check-does-nothing` discipline generalizes:** no gauge, no
   item property, no standing may exist that affects nothing.
   Bubsy-proofing as a standing review question — if players would
   rationally ignore it, don't ship it.
4. **No badges, no leaderboards — keep it that way.** The built
   game's bands-and-ledgers shape replaced the detachment-prone
   layer; treat any future "just add achievements" impulse as this
   lens failing open.
5. **Name the RMT posture before it's forced.** The design's
   property/conservation machinery makes real-money overflow likely
   *if it succeeds*; deciding the stance (prohibit / channel /
   embrace) belongs to the polity track as a deliberate future
   decision, recorded before player wealth exists.
6. **Prefer deepening values over minting them** — new systems
   should attach worth to existing currencies of meaning (money,
   bands, standing, title) before inventing parallel ones; the
   pretend-importance pool is shared.

---

[^aogd-ev]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #7, the Lens of Endogenous
    Value**, from the game-definitions chapter (re-read from the
    author's Google Play edition, 2026-07). Costikyan's "endogenous,"
    the Monopoly/roulette examples, the "willingness to pretend it is
    important" framing, the compellingness gauge, the MMO real-money
    observation, and the Bubsy yarn-ball case are Schell's; all
    analysis ours.
