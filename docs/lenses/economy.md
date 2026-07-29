# Lens: Economy

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Fresh pass, entry 8 (2026-07-28), net-new** — first of the
> systems-first sequence (economy / skill-vs-chance / griefing /
> story-machine / cheatability). Written against the built economy:
> banking, employment, retail, crafting, property, influence.
>
> **Layer interrogated: the game's economy as built**, with one
> platform-layer doctrine extracted (fungibility follows legitimacy).

## The lens

An economy gives a game "surprising depth and a life all its own —
but like all living things, it can be difficult to control." Five
questions: **how can players earn money — and should there be other
ways? What can they buy, and why? Is money too easy or too hard to
get? Are the choices about earning and spending meaningful ones? Is a
universal currency right, or should there be specialized
currencies?**

> **From the book.** The lens closes the balance chapter's economy
> section, which cross-examines an economy against the other balance
> axes: **cooperation** ("can they collude in a way that exploits
> 'holes' in the economy?"), **time**, **rewards**, **punishment**,
> **freedom** ("can players buy what they want and earn the way they
> want?"). Two pieces of method travel with it: **plan to balance** —
> build the dials in, change values while the game runs, "better
> still is to have a content management system that lets you continue
> to balance the game even after it ships"; and the warning against
> **letting the players do it** — players "have a conflict of
> interest: they want the game to give them a challenge, but at the
> same time, they want to win as easily as they can," and returning
> from an overpowered state "is a little like trying to kick
> heroin."[^aogd-ec]

## Why our design prompts it

Because the economy is no longer a design sketch — it is conserved
money behind a sealed mint chokepoint, wages on rosters, tills with
quotas, consignment with commission splits, titled property, and a
central bank with a deficit P&L — and because the polity thesis
makes claims about this economy (labor as primary income, governance
of the money supply by office-holders) that Schell's questions test
directly.

## What the design answers

### Q1 — Earning: labor-shaped, deliberately

Wages (employment shifts), tips, crafting-and-selling, consignment,
proprietorship; contracts/gigs built and awaiting merge; mining and
farming designed. The signature decision is the **severed
kill→reward link**: no loot faucet, no grinding mobs for coins —
earning is real-economy-shaped (work, make, trade), because the
gamification-mirror thesis wants a real-unit model of livelihood,
not an extraction ritual. "Should there be other ways?" has a
roadmap answer (vendor-trash faucet, producer pricing, capital
markets deferred) — the gap is known, not accidental.

### Q2 — Spending: no Bubsy goods, thin aspirational sinks

What's buyable is backed: every retail staple *does something*
(light, carry, cut, eat), drinks metabolize honestly, fees and fares
buy real services. The endogenous-value rule (no gauge or good that
affects nothing) holds at the counter. The honest gap is at the top:
beyond staples and drinks, the **aspirational sink ladder is
shallow** — the apartment/residence rung is designed but the
wanting-something-expensive tier (property, furnishings, status
goods, business capitalization) is where "what can they buy, *why*"
currently runs out of answers. Until sinks deepen, wages accumulate
— the classic MMO inflation shape, held off only by conservation
and small fees.

### Q3 — Too easy / too hard: unknown, but instrumented

Nothing is playtested, so nobody knows — but the design shipped
Schell's *method*: conservation makes every faucet governable (the
mint is the only supply change, structurally validated);
`moneySupply` / `reconcile` / `profitAndLoss` are the gauges; wage
rates, prices, fees, and quotas are AppSettings dials changeable at
runtime; the CMS exists. "Plan to balance" is pre-implemented — what
remains is the loop itself, which needs players.

### Q4 — Meaningful choices: pluralism now, dominance risk later

Earning offers real alternatives (a shift's reliability vs. a
craft's margin vs. consignment's passivity vs. a proprietor's
residual), and spending choices carry trade-offs (cash vs. card,
quality grades, fee schedules). The risk is the economy's version of
the dominant strategy: if one earn-path's rate quietly beats all
others, pluralism collapses into a meta. Combat got a gym to hunt
exactly this; **the economy has no gym** — the biggest instrument
gap this lens finds (implication 3).

### Q5 — Currencies: one money, many meanings — fungibility follows legitimacy

The design's answer is unusually crisp. **One universal fungible
money** (coinage + account balances; multi-currency explicitly
dismissed, a future currency-reset event the one live seam). Beside
it, **many specialized non-fungible standings**: influence stocks
(non-fungible per stock, conviction non-transferable), renown by
scope, competence bands, credentials and keys. None convert to
money; none convert to each other. The doctrine, extracted:

> **Fungibility follows legitimacy — if buying it would falsify it,
> it is not purchasable.** Money is universal precisely where
> exchange is legitimate (goods, services, labor); status,
> competence, and voice are specialized currencies precisely because
> their meaning *is* their provenance.

That is Schell's specialized-currency question answered as a
constitutional principle rather than a tuning choice — and it is the
correct weight for "money can't buy power": a structural line-item,
not a slogan.

### The cross-checks

**Collusion** — the sharpest open box: pooled funds and hole-hunting
are exactly what the influence layer's Sybil frontier, the
withdrawal-quota's Circle scaling, and consignment self-dealing
invite. No systematic economy-collusion audit exists yet.
**Punishment** — fines and the credential freeze/cap/reissue ladder
exist; courts deferred, so economic crime currently accrues ledger
rows, not consequences. **Freedom** — earn-how-you-want is the
design's strength; buy-what-you-want awaits the sink ladder (Q2).

### "Let the players do it" vs. the polity bet

Schell's warning — players have a conflict of interest — is aimed at
personal difficulty sliders, but it grazes our biggest wager: the
economy's *parameters* are meant to be governed by players (the
central-bank governor is an office; offices are meant to leave the
founder's hands). The design's answer has three tiers: **invariants
are code** (conservation, structural leg validation — not votable);
**parameters are governed** (rates, fees — collective choice through
offices and conviction, not personal sliders); **cheats are
impossible** (no one grants themselves a million lives). What
remains gloriously exposed is monetary *politics*: a governor who
mints recklessly is not a balance bug, it's an inflation story the
world is built to model honestly — the civics lesson is the
content. Schell's warning becomes the risk register for a system
that accepts the risk on purpose.

## Tensions & risks

- **Inflation by shallow sinks** is the near-term structural risk
  (Q2): conserved supply + wage faucet + few sinks = rising cash
  balances with nowhere to go. The apartment ladder and business
  capitalization are the designed answers; until they land, watch
  the supply gauges.
- **Earn-path dominance** would hollow the livelihood pluralism the
  polity depends on; without an economy gym it will be discovered
  by players first.
- **Collusion holes are unaudited.** The anti-grief guards cover
  exclusive resources and common pools; coordinated multi-actor
  extraction (Sybil rings, wash-trading consignment, tip
  laundering) has no standing audit.
- **Punishment is half-built by design** — accountability rows
  await courts. Fine; but until then the economy's deterrence layer
  is reputation only, and this should be said honestly when the
  polity claims are pitched.

## Implications

1. **The doctrine is ratified-by-practice and now named:**
   fungibility follows legitimacy. Any proposal to make a standing
   purchasable, or to mint a second fungible currency, argues
   against this entry first. (Slate checklist, seventh question:
   *does your system move value across the fungibility line?*)
2. **Deepen the sink ladder before widening faucets.** Every new
   earn-path proposal should name the sink that absorbs it; the
   apartment/furnishing/capitalization tier is the standing
   priority this lens assigns.
3. **Build the economy gym** — a headless agent-based earn/spend
   simulation (the combat-gym precedent) that hunts earn-path
   dominance, inflation trajectories, and collusion holes before
   live players do. This is the entry's concrete build ask.
4. **Run a collusion audit as a design pass** — Schell's question
   ("can they pool funds to exploit holes?") applied to quotas,
   consignment, tips, transfers, and the influence stocks, with the
   Sybil frontier treated as an economy problem, not just an
   influence one.
5. **Keep the three-tier governance split explicit** (invariants in
   code / parameters governed / cheats impossible) — it is the
   design's answer to "let the players do it," and it belongs in
   the constitution-layer documents, stated as such.

---

[^aogd-ec]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #52, the Lens of Economy**,
    from the game-balance chapter's economy section (read from the
    author's Google Play edition, 2026-07). The five questions, the
    balance cross-checks (cooperation/collusion, time, rewards,
    punishment, freedom), the "plan to balance" method (runtime
    values, CMS, loop after ship), and the "let the players do it"
    conflict-of-interest warning are Schell's; all analysis ours.
