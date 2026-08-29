# The aluminium can — a stress test of every system, one object at a time

*Design slate, 2026-08-29, on `design/libations`. A conversation, not a
build list. The can is the object because it is everywhere, it is
standardised to the millilitre, its material has the tightest closed
loop of any commodity (a used can is a new can on a shelf in ~60 days),
and it crosses every layer we claim to model: material physics, energy,
a trade's process, packaging, distribution, retail, the body, waste, the
polity. If a system can't say something honest about a can, that system
has a gap. The wooden pallet is the only better candidate; it gets a
row at the end.*

## 0. The object, in the real economy

A beverage can is **one-way packaging** — the industry's own term,
against **returnable** packaging (the glass bottle with a deposit, the
keg, the pallet). The pallet's category is the **returnable transport
item (RTI)**. Both are *packaging*, which is the word for an object
whose whole value is what it carries and whose own life is a loop.

The loop, primary: bauxite → alumina (Bayer process, caustic + heat) →
aluminium (Hall–Héroult electrolysis, ~14 kWh/kg, the reason smelters
sit beside hydro dams) → sheet (rolling; the can body is a 3004 alloy,
the lid a 5182 — two alloys in one can, which is why "one can" remelts
to a slightly different alloy) → can body (drawing and ironing, a press
line, ~2,000 cans a minute) → coating (an epoxy lining — the drink never
touches metal) → filling and seaming (the lid goes on *after* the fill;
the seam is what makes it gas-tight) → distribution (cases on pallets on
trucks) → retail → the drinker → **the empty**.

The loop, secondary: the empty → collection (kerbside, deposit return,
or the informal collector) → baling → remelt (~5 % of the primary
energy) → sheet → can. Sixty days.

What differs outside the US (the parts an American misses):
- **Deposit-return schemes** — Germany's *Pfand* (€0.25 on a can, the
  highest anywhere; it briefly killed the can market in 2003 because
  retailers refused to take them back), the Nordics (90 %+ return),
  and the current EU wave. The deposit is the polity pricing the
  externality; the return rate is the measurement.
- **Steel cans** still dominate in parts of Asia and Africa; **glass
  returnables** dominate in India and much of Latin America — the
  *returnable* model, with a real washing line.
- **Sizes**: 330 mL (Europe), 355 mL/12 oz (US), 500 mL (northern
  Europe, Japan's "long"), 250 mL (energy drinks). The can is
  standardised *per market*, not globally.
- **Tethered closures**: the EU's 2024 rule that a plastic cap must
  stay attached — the polity reaching into the vessel's construction.
  The stay-on tab (1975) was the same move for cans, made by the
  industry before any law.

## 1. The ledger — what each system says about the can

Legend: **built** = shipped and exercised · **substrate** = the
mechanism exists, nothing authored · **gap** = nothing · **wrong** =
shipped and incorrect.

| layer | the can needs | today | to build | pedagogy |
|---|---|---|---|---|
| **material** | `aluminium`: density, melt 933 K, passivating, soft | **built** (`base-library/…/element/aluminium`, this slate) | the 3004/5182 alloys as `alloy/` rows when a can-body recipe exists; the epoxy lining is a `Layered`-style fact, not a material | a can dents and doesn't rust — `materials-response.md` gets this for free from `hardness` + no `ferrous` tag |
| **the vessel** | an *empty* can: 330 mL, `closure: sealed` (construction — gas-tight), `open: true` (state — an empty can is an opened can), material aluminium, description of construction only | **wrong** — the row narrates state ("ring-pull intact") and has no material | fix the row; same pass for `mixer-bottle`/`wine-bottle`/spirit bottles (`sealed`, not `liquidTight` — a capped tonic must keep its fizz), `keg` (`sealed`), `cask` (`liquidTight`, it breathes), `sack` (`open`) | *construction vs state* — `Bulkable.closure` vs `Sealable.isOpen()` — is the first thing a pack author must learn; the can row is the exemplar |
| **the product** | a filled can: the vessel + `interiorMaterial`/`interiorAmount` + `open: false` + a census key | **built** as 1 L bottles (`cola.yaml` …); no canned row | canned floor rows once the vessel row is right (`can-of-cola`, 330 mL, its own census key, its own price point) | one class, two rows: *the vessel* and *the vessel filled* — the standard every packaging row follows |
| **census** | the count of *product* on the floor | **wrong** — `censusKey` is authored on the row and never changes, so an **emptied can still counts** as `mixer:cola`; once drinkers leave empties, the sweep sees "at target" while the shelf is bare | `getCensusKey()` derives from state: full → the product key, empty → the vessel's key (`can`). Empties then have their *own* census, which is what a returns market counts | *what you count is what you get* — measurement.md's first rule, caught by the can |
| **the faucet** | where cans come from | **substrate** — the spawn sweep stands the bottling floor at target: an abstraction that costs nobody the activity | the upstream chain (below); the sweep is the placeholder the chain replaces, region by region | the **abstraction law** (uncertainty.md): legitimate only while it still costs somebody the activity — the sweep fails it on purpose, and says so |
| **primary production** | bauxite → alumina → smelt | **gap** (mining slate is design only; no refining, no smelting) | `trade-mining` (bauxite as ore), a refining step (chemistry — no subsystem owns "chemistry" yet), smelting as a **furnace recipe with an energy cost** | the first place a recipe needs **kWh**, not just `requiresHeatK` — energy accounting is the missing axis on `Recipe`; `electricity.md` has the physics, `crafting.md` doesn't ask for it |
| **forming** | sheet → can body | **gap** — smithing has forge/hammer/quench; no rolling, no drawing | a metal-forming trade upstream of bottling (can-making is a *process*, distinct from filling — trade = process); a press line is a `Tooled` station like the still | the trade-as-process rule applied where it bites: bottling does *not* make cans, it fills them |
| **filling** | empty can + cola bulk → sealed can | **substrate** — exactly the glass-pool mechanism (claim a clean empty vessel, fill it, mark it); nothing authored | bottling's real recipe: `fill` with `outputTemplate: …/thing/can`, `open: false` on completion (seaming); the pool is the stack of empties | the vessel row is the *input* of the trade that ships it — that is what it's for |
| **carbonation** | fizz that keeps in a sealed can and goes flat once opened | **half** — `carbonated` is a payload tag; the spritz "fizzes"; nothing ever goes flat | flat-on-read: an opened `Bulkable` holding a `carbonated` payload loses the tag after N game-hours (reconcile-on-read, the ice-melt pattern) | derive-on-read for truth; the can is the second consumer of the pattern after ice |
| **temperature** | a cold can from the cold-store | **built** — `Thermal` on `Bottle`, the cellar's cold-store | nothing | — |
| **distribution** | cases, pallets, a truck, a distributor | **built** for the distributor (consignment onto the counter) · **gap** for the rest — the hand *teleports* | the freight slate (the truck), the pallet (below), `Crate` already is a case | von Thünen: where the bottling floor sits relative to the bar is a rent, and today it is free |
| **retail** | buy a can, as a person or as the house | **built** — the wallet rule | a per-unit price on canned rows (330 mL is a price point, not a size) | — |
| **the body** | drink it: sugar, caffeine, the cold | **half** — `cola` has `nutrients: [water, sugar]`, no caffeine, no `chemistry` | `chemistry:` on the mixers (caffeine on cola; metabolism.md's toxins model carries it) | the meal-chemistry model has a hole exactly where a 12-year-old expects one |
| **the empty** | it persists, it's litter, it's a returnable | **built** by accident — `Bottle` stays when drained, `Circulating` counts it · **wrong** — counts as product (above) | the census fix; `look` on an empty says "an empty can" (state augmenter, not the description) | an object whose value is what it carried — the game's first *waste* object, and waste is where every economy's honesty is tested |
| **collection** | kerbside, a deposit return, the scavenger | **gap** | a **deposit** is a `contract.md` escrow leg attached to a sale by *law* (the polity: legal-code slate, measurement.md layer 3); the return is the inverse sale at any counter; the scavenger is a vocation that exists **iff the deposit does** (vocations.md's demand test, passed only by law) | the cleanest lesson in the whole game: *a vocation appears when the polity prices an externality* — no deposit, no can collector; Pfand made a livelihood out of the Berlin park |
| **remelt** | empties → ingot | **substrate** — furnaces exist, `meltingPoint: 933` is authored, phase change is modelled | a `remelt` recipe (any furnace ≥ 933 K, N cans → 1 ingot of aluminium at ~5 % the smelt's energy) | the loop closes in-game the way it does in life; the census can tell primary from recycled if the ingot row says so |
| **the polity** | the deposit law, the tethered-tab rule, the size standard | **substrate** — offices, governments, the legal-code design | law as content: a locality's `bottle-bill` clause that attaches the deposit leg | measurement.md layer 3: *the polity imposes*; the can is what it imposes on |
| **the wiki** | the can's page, the material's page, the loop | **built** (the encyclopedia) · nothing authored | a `can` article in `wiki-starter` that *is* section 0 of this slate, revealed by capability like everything else | the first screen is the syllabus |

## 2. What we are NOT simulating, and whether that's a choice

- **Chemistry as a subsystem.** Refining, the lining, going flat,
  caffeine: four can-facts that all want a chemistry model, and no doc
  owns one (metabolism has meal chemistry; materials have composition;
  nothing has *reactions*). Not a can problem — a gap the can exposes.
  **Choice: name it, don't build it here.**
- **Energy per recipe.** `requiresHeatK` says how hot; nothing says how
  much. Smelting is the recipe that makes the omission absurd. **Choice:
  a `Recipe.energyKWh` field is a one-line substrate change that makes
  every furnace honest; the metering of it is electricity.md's.**
- **The alloy detail.** 3004 vs 5182, the lining — real, but below the
  resolution any player acts on. **Choice: out, with a note in the
  material row (done).**
- **Logistics.** The hand teleports; the pallet doesn't exist. The
  freight slate is where that lives. **Choice: out of this build; the
  pallet gets its own row below because it's the RTI exemplar.**
- **Market-specific standards** (330 vs 355, Pfand vs kerbside). A
  *locality* decides these, by law and by what its bottling floor
  ships. **Choice: the can is 330 mL because the shipped world is not
  America; a second market ships its own row.**

## 3. The content-pack organising principle, tested by the can

- **trade = process.** Bottling *fills*; it doesn't make cans and it
  doesn't smelt. So: `aluminium` → base-library (a commons material);
  the empty `can` → **bottling** *for now* (a stub ships everything
  downstream of production, and the empty can is bottling's input — the
  first thing the can-making trade takes back when it exists);
  `can-of-cola` → bottling (its product); `remelt` → the furnace's
  trade (smithing today; a scrap trade when one exists); the deposit →
  the **polity's** content (a locality's law), never a trade pack; the
  scavenger → nobody's — a vocation is an emergent, not a row.
- **corpo = capital.** A can maker (Ball, Crown) is a corpo that *owns*
  a forming floor in the metal trade's pack. Nothing here changes the
  rule from MR !206.
- **The standard is the exemplar row + the README, not inheritance.**
  A pack author making a canned product copies `can.yaml`'s
  construction and adds the fill. The enforcement is the filling
  recipe's `outputTemplate` — it has to be a real vessel row. No
  `vessel:` pointer, no lint: that would be inheritance in disguise.

## 4. The ideal can, as rows

```yaml
# trade-bottling/content/trade/bottling/thing/can.yaml — the EMPTY vessel
class: /platform/thing/Bottle
data:
  shortDescription: "a can"
  longDescription: "A 330 mL aluminium can — drawn in one piece, lined, the lid seamed on. It weighs almost nothing."
  primaryKeyword: can
  keywords: ["can", "tin", "empty"]
  material: /stuff/idea/material/element/aluminium
  interiorBulk: true
  interiorCapacity: 0.33
  closure: sealed          # construction: gas-tight — it keeps fizz
  open: true               # state: an empty can is an opened can
  censusKey: can           # the EMPTY's own census (the returns market's count)

# thing/can-of-cola.yaml — the PRODUCT: the same vessel, filled and seamed
  …everything above, plus…
  shortDescription: "a can of cola"
  interiorMaterial: /trade/bottling/idea/material/cola
  interiorAmount: 0.33
  open: false
  censusKey: mixer:cola-can   # derives back to `can` when drained (the census fix)
  regionTarget: 24
  container: /trade/bottling/thing/bottling-stock
```

## 5. The wooden pallet (the other perfect object) — one row

The pallet is the **returnable transport item**: 1200 × 800 mm (EUR) or
48 × 40 in (GMA) — again standardised per market; ~25 kg of softwood;
repaired more often than replaced; pooled by rental corpos (CHEP's blue
pallets are *never sold*, only leased — a capital model with no
equivalent in our economy yet). It is what a `Crate` sits on, what a
truck carries, what a forklift lifts, and the single object freight
cannot be modelled without. It belongs to the freight slate; it is
named here because the can and the pallet are the two objects whose
*entire* value is the loop they travel, and the game has neither loop.

## 6. What to do now (this MR) vs later

**✅ DONE in the libations MR (`3bc9c8d3b`, `68a878d0c`):** aluminium as
an element row; the eight vessel rows as a real standard
(construction-only descriptions, `open: true`, aluminium/steel/oak,
`sealed` on the can + keg + capped bottles, `liquidTight` kept on the
cask because it breathes, `open` on the sack; crate and basket described
as open containers, not vessels); `can-of-cola` as the standard *used*;
`Bottle.getCensusKey()` derives from state, so an empty reports
`vessel:<keyword>` and a drunk-dry floor restocks; the bottling README as
the contract. ⚠ The derive immediately caught an unfaithful mock — the
distilling sweep test cloned its bottles EMPTY, which a real clone never
is.

✅ **`jute` added to the fibre vocabulary** (founder's call) — hessian is
jute, and all four sack rows now name it.

⚠ **And it exposed a substrate gap worth naming:** the sacks ship
`closure: liquidTight`, which is a lie about hessian, because
`BulkableLogic.requiredClosureFor` returns `liquidTight` for **every**
material in v1 — only the liquid phase exists, and `granular → open` is
a commented extension point nobody has built. An honestly-`open` sack
could not be filled or drawn from, which would break the syrup recipe's
sugar draw. The lie is recorded in the rows rather than hidden; when the
granular phase lands, every sack becomes `closure: open` and nothing else
changes. **This is the third gap the can found that is really a
missing-phase problem** (the others: carbonation never goes flat; ice is
modelled but no other solid is).

**Later, in order of how much of the loop each closes:** the **granular
bulk phase** (`requiredClosureFor`, so a sack can be an honest open
weave) · the deposit
(law + contract leg — closes *collection* and mints a vocation) · the
`fill` recipe (closes *filling*; the pool of empties becomes real) ·
`remelt` (closes the loop) · `Recipe.energyKWh` + smelting · the
metal-forming trade · going flat · caffeine · the pallet, with freight.

---

## 7. The can as civic curriculum

*The general argument this section generated — standing as a conduct
score, who mints it, and why the weights are never ours — moved to
[standing-mint-slate.md](./standing-mint-slate.md). What stays here is
the can.*

### 7.1 ⭐⭐⭐⭐⭐ The can is a collective action problem you can hold

My empty is worth ~1.5¢ of metal and costs me a small annoyance to
handle properly. Everyone's empties together are worth 95% of a
smelter's energy bill. **My small cost, our large benefit, no
coordination** — the shape of nearly every civic problem a person will
meet: vaccination, taxes, litter, emissions, voting, jury duty. The can
is the smallest object that contains the structure whole.

⭐ **And this is why the can works where a longsword cannot.** Nobody
role-plays caring about forty longswords in a chest; everyone arrives
with a stance toward cans on a lawn. Junk accumulation is a problem in a
game like this regardless — the can is the manifestation that *lands*,
because it is a real-life simulacrum. **Choosing what to simulate at
fidelity is choosing which real-world moral intuitions you can recruit
for free.** That is a content-selection principle, and it is worth more
than most mechanics.

### 7.2 The three tools, and the fourth move

Exactly three ways to close the gap, and they map onto real political
dispositions with different costs:

- **Price it** (a deposit) — make the individual incentive match. Cheap
  to administer, self-enforcing.
- **Mandate it** (kerbside law, littering fines) — command-and-control;
  needs enforcement, which needs a state.
- **Norm it** ("don't be a litterbug") — cheapest, weakest, scales
  without institutions.

⭐⭐ **The fourth move is to shift the frame so nobody solves it.** Keep
America Beautiful was founded in 1953 by packaging and beverage
manufacturers (American Can, Owens-Illinois Glass); the Crying Indian ad
(1971) was theirs. Its function was to make litter an **individual moral
failing** rather than a **packaging design decision** — because the
alternative on the table was bottle bills, which would have cost the
industry money. *The norm-based solution was funded by the party that
would otherwise have paid for the price-based one.*

**And it is discoverable with shipped substrate, not scripted.** Corpos
have temperaments and brands; the press subsystem ships publishers,
releases and a ticker; `authoring_events` is an authorship ledger. A
bottling corpo facing a deposit proposal funds a campaign about
litterbugs. A player reads it in the gazette. A player who digs into who
paid for it finds the can maker. Nobody wrote a quest — the NPC corpo
followed its interest, and investigative journalism was available as
*play*.

### 7.3 ⭐⭐⭐⭐ The emergent nobody designed

Germany's *Pfand* is €0.25 — high enough to actually move behaviour;
return rates run in the high 90s. What emerged, that no legislator
intended: an informal economy of people collecting cans from bins and
parks. The middle class abandons deposits; people who need money collect
them. **A redistribution channel and a livelihood, as a side effect of a
litter law.**

That is the payoff. Not "civics +1". Two game-weeks after the vote the
streets are clean and somebody has a living. Nothing tells the player
they did well — *the feed hides the measurement; the mirror shows you*.
It is [vocations.md](../../vocations.md)'s demand test passed **only by
law**, which is the sharpest single lesson in the object: **a vocation
can appear because the polity priced an externality.**

### 7.4 ⚠⚠ The keystone: the empty must be a burden

None of this is reachable unless **the empty persists and is mildly
annoying.** No burden → no spoiled commons → no problem → no law worth
passing. Every civic property above descends from that one mechanical
fact.

But nobody wants inventory management. So the burden must be **ambient
and collective, not individual and fiddly**: your personal cost is
trivial, the room accumulates, the street has a litter state, the
venue's keeper has to bus. Which is *the actual structure of the real
problem* — **the mechanic teaches by being isomorphic, not by
narrating.** This is the dial most likely to be set wrong, in either
direction.

### 7.5 ⭐⭐⭐⭐⭐ The required pairing: the can and the blood

The single most valuable thing this curriculum can ship, and it only
works if the engine stays out of the valuation:

| | **cans** | **blood** |
|---|---|---|
| the act | society needs it | society needs it |
| price it | **works** — return rate tracks deposit size almost exactly; litter falls; a collector's living appears | **backfires** — paying can *reduce* supply by converting a gift into a transaction (Titmuss, *The Gift Relationship*, 1970) |
| the mechanism | incentive alignment | **crowding-out** — same shape as Gneezy & Rustichini, *A Fine is a Price* (2000): fining late parents made lateness worse, and it stayed worse after the fine was withdrawn |

Two acts a society needs; opposite correct policies. A player who passes
a deposit on cans, then tries the same trick on blood and watches
donation **fall**, has learned something most adults never learn — and
no essay delivers it. See [blood-slate.md](./blood-slate.md).

⚠ **This entire lesson is impossible if the engine credits both with
standing.** That is the concrete reason the mint question
([standing-mint-slate.md](./standing-mint-slate.md)) is not ours.

### 7.6 The guardrail: model the mechanism, never the verdict

Ship the deposit as an **available law with real tradeoffs**, not as a
good thing. The counter-lessons must be reachable or this is propaganda:

- **Retailers genuinely eat the handling cost.** That is the real fight
  in every US state that has tried a bottle bill, and a player arguing
  the retailer's side should be **right about that part**.
- **Rate matters more than existence.** Return rates track deposit
  value; Michigan at 10¢ ran in the 90s, most 5¢ states sat far lower,
  and Oregon's move to 10¢ lifted its rate substantially. A 2-zenny
  deposit that does nothing is a better teacher than a working one.
- **Who keeps the unclaimed deposits changes what the law is.** Michigan
  sends most escheat to the state; in Germany the industry keeps it —
  meaning the operator **profits when you don't return**. Same law,
  different residual claimant, opposite incentive.
- **Jurisdictional arbitrage invents itself.** A bottle-bill locality
  beside one without produces can smuggling — prosecuted for real in
  Michigan, and a Seinfeld plot. A player *will* find the arb unprompted
  and thereby understand federalism better than from any explanation.
- **The intuition does not transfer.** Aluminium recycling is genuinely
  excellent — scrap carries enough market value to pay for its own
  collection, which is why informal collection happens even without
  deposits. Most plastics downcycle; glass often loses on transport
  weight. A player who generalises "recycling good" from the can to
  everything has learned the **wrong** thing, and the game must let them
  find out. **Updating on material-specific evidence rather than on
  identity is the actual civic skill.**

The historical arc, for a polity that amends over time: **norms
(1950s–70s) → deposits (1970s–) → extended producer responsibility
(2000s–)**, EPR being the structural rebuttal to the
individual-responsibility frame the industry sold.

### 7.7 Why this medium and not a documentary

- **Duration** — you live the second-order effects, on a 60-day loop, in
  a game-week drive. A classroom cannot.
- **Multiplayer** — a collective action problem needs an actual
  collective with actual incentives.
- **Authorship** — players draft the law as content
  ([legal-code-slate.md](./legal-code-slate.md)); writing a bottle bill
  with its rate, exemptions and residual claimant **is** legislative
  drafting practice (the applied-hours thesis).
- **Auditability** — everything is on a ledger, so a player can check
  whether the policy worked against real numbers, with no narrator.
  That is the mirror.

⭐ **The bottle bill is the ideal first law a player-run locality ever
passes:** concrete, visible within days, reversible, with a genuine
distributional fight built in. Compare teaching governance with tax
rates or criminal law — too abstract, too slow, too punishing to get
wrong.
