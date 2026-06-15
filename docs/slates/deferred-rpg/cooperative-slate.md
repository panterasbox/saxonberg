# Cooperative slate (working doc)

> **Status: deep exploration, deliberately not near-term — the
> institutional layer the economy slate parks.** This is the *macro /
> institutional / political* economy: how value is **managed and
> governed** while it exists (banking, markets, the polity, the funding
> model), as opposed to the *micro-physics* of how a single transaction
> clears — which is [economy-slate](../builds/economy-slate.md)'s job and
> is buildable now. Almost nothing here is buildable yet. It needs three
> things it doesn't have: a **running game with real players** (you can't
> tune a political economy against the abstract), the **social-substrate
> Sybil-resistance keystone** (the thing that makes lending, voting, and
> feedback all possible — see *The keystone*), and **real legal counsel**
> before any mechanism touches real money. Captured because the synthesis
> is novel and worth not losing, not because it's queued.

The governing object is a single one: **the game is a self-governing,
self-funding cooperative.** Everything below — banking institutions, the
tricameral polity, the feedback substrate, the resource-backed internal
economy, the multi-tenant platform — is a facet of that one entity. The
economy slate said you need a real game to solve the macroeconomics; this
is the design for that macro layer, and it turns out to give a *partial
answer to the sources/sinks problem* that slate defers, by grounding the
internal economy in a real, metered, paid-for resource (compute).

See also:

- [economy-slate](../builds/economy-slate.md) — **the layer below this
  one.** Currency-as-`Globbable`, transaction clearing as stance-not-
  property, the closed conservation loop, "count things, don't price
  things." This slate is the institutions and governance that ride on
  that physics. The two must not contradict: economy owns *how a trade
  clears*; cooperative owns *who governs and funds the world the trades
  happen in*.
- [social-graph-slate](../builds/social-graph-slate.md) +
  [reputation-slate](../builds/reputation-slate.md) — **the keystone.**
  Sybil-resistant social standing is the single substrate under lending,
  voting, *and* feedback. If it can't resist alt-gaming, the whole
  political economy falls back to capital-weighting. This slate is its
  most demanding consumer.
- [auth-providers-slate](../tails/auth-providers-slate.md) +
  [external-chat-relay-slate](../tails/external-chat-relay-slate.md) —
  the Twitch-co-equal auth spine and the channel relay. **The
  livestreaming vertical rides directly on these.**
- [augmentation-slate](../tails/augmentation-slate.md) — augment-as-wallet
  makes electronic money seamless and identity-bound; augment outage is
  what makes off-grid cash matter.
- [llm-content-slate](../builds/llm-content-slate.md) — the LLM director.
  **LLM tokens are the killer example of a real, metered compute cost** —
  the resource economy below is already implied by these plans.
- [app-settings.md](../../subsystems/app-settings.md) — the shipped
  config registry. The bootstrap path for governance: tax rates and
  budgets start as engine constants → become `AppSettings` data → are
  handed to the polity. Substrate already exists for step two.
- [affiliation-slate](./affiliation-slate.md) — guild/corp social
  organization; the co-op is its formal, governing, money-bearing
  sibling.

---

## The spine: one question, asked at every layer

The whole design is a single question recursing up through the layers:
**what should be transferable, and what shouldn't?** Get the answer right
at each level and the institutions fall out of it.

| Layer | Transferable? |
|---|---|
| Small money (everyday) | Yes — bearer coin, but **capped** |
| Large money (fortunes) | Only through the **registered, identified, taxed** rail |
| Political influence | **Never** — soulbound, inalienable |
| The game's own ownership | **Non-tradeable co-op membership**, not tradeable equity |

The same fork every time. The property that makes coin good for buying
bread (frictionless, anonymous transfer) is the property that makes
gifting a fortune dangerous and the property that turns a stake into a
security. Tradeability is the hinge — it creates both the liquidity you
sometimes want and the harms you never do.

---

## Money as institutions

Money is the one substance in the world that is *purely* institutional —
a coin is worthless except that an institution enforces the agreement
that it isn't. So economy design **is casting**: every monetary function
becomes an NPC or a place with a standing role and the authority to
enforce a rule. That's the forcing function — you can't have banking
without a banker.

### Bearer vs registered — the fork that creates the bank

Value rests in exactly two ways, and the gap between them is the bank's
entire reason to be a place you walk into.

- **Bearer (coins).** Worth is *in the token*; possession is ownership.
  Anonymous, instant, no counterparty, works off-grid — and obeys
  physics: carried (weight → encumbrance), droppable, stealable, lost on
  death. Naturally a `bulk`/`Globbable` attribute, not 500 Stuffs.
- **Registered (accounts).** Worth is a *ledger claim*. Survives death,
  can't be looted, leaves a record, can move to someone not present — but
  needs a reachable, trusted institution and is identity-bound.

Neither suffices. You can't pay a vendor with a ledger claim; you can't
carry a fortune as coin. So you **convert** — deposit is coin→claim,
withdraw is claim→coin — and that single act justifies a building, a
teller, hours, a queue, a fee. The friction is diegetic, not a tax.

### The transferability fix: segregate the rails by size

The classic-MUD harm — dumping a fortune on a no-reputation newbie,
laundering an instant billionaire — is bearer coin's defining property
applied at the wrong scale. Don't fix coin; **forbid it from carrying
fortunes:**

- **Small / anonymous → bearer coin, hard-capped** by denomination and
  weight (a billion in coin is physically absurd once encumbrance is
  real), or a flat per-transfer ceiling.
- **Large → the registered rail only**, which is identified
  (recognition), recorded, and **taxed on transfer — progressively.** The
  bigger the transfer, the bigger the cut, so it bites hardest exactly
  the behavior you want to discourage. Big purchases pay it as a cost of
  business; laundering gifts pay it as a penalty. Same rule, self-sorts.

This is how real money already works (cash for coffee, a *wire* for a
house, and the wire is reported and taxed). The gift-tax instinct isn't
an imported constraint — it's the generative rule that produces the whole
institutional stack, and the tax is a real **sink** feeding the treasury.

### Cash earns exactly one niche (and it's the same fix)

Make electronic money the **mainstream** — identified, networked, taxed,
and made seamless/diegetic by the **augment-as-wallet** (your augment is
you, so payment is identity-bound). But bearer coin shouldn't die,
because it has properties electronic genuinely can't, each mapping to
wanted content:

- **anonymity** → black markets, privacy, crime, intrigue
- **off-grid** → **cash is the off-grid money.** Electronic needs the
  network; in a coverage dead-zone (the delivery/addressing substrate's
  "absence of coverage") the augment-wallet is a brick and coin is king.
  An augment outage *changes which money works* — content for free.
- **finality without a counterparty** → no institution need be reachable.

Coin relegated to the small/anonymous/off-grid niche is *identical* to
the transferability fix. One rule does both jobs.

---

## Banking is lending, and lending is NPC-venture financing

### The interest invariant

> **Yield paid by the engine is a faucet; yield paid by another
> participant is a transfer.**

Savings interest is the engine minting money for nothing → inflation
(every classic MUD that added it learned this). The *only* non-
inflationary interest is interest that came out of a borrower's pocket.
So the bank can't be a savings account; it can only be an **intermediary**
— and intermediation needs a borrower who actually pays.

### Why NPC borrowers, and the honesty crux

Player-to-player lending dies on default + Sybil (you'd need an
un-gameable reputation system, which open multiplayer can't have). The
collateral trick (over-collateralized, auto-liquidated — the DeFi /
smart-contract idea) *sidesteps* reputation but is limited to liquidity,
not capital formation. The strong move is **lend to NPCs**: the engine
controls the counterparty and can guarantee repayment. But the crux:

> **The NPC's repayment must route through a real sink — money it pulled
> out of the player economy — never freshly minted.** Otherwise NPC
> lending is a savings faucet with one extra step.

The honest version isn't "savings interest" at all — it's **the player as
financier of the NPC economy.** You fund the blacksmith's expansion; he
stocks better wares; players buy them; you're repaid with a cut. Your
interest was paid by *other players' purchases*. This is the one place
the deferred sources/sinks problem can't be fully bracketed — lending
forces you to decide *this one NPC's* revenue is real.

### Two-tier bank, and default as a feature

- **Custody** — registered, safe, **zero yield**, the death/theft escape.
  The classic-MUD coat-check. Everyone uses it; complete as-is.
- **Investment** — lending to NPC ventures, yield *and* risk, optional.
  The "finance the world" game on top.

The non-inflation invariant for the second tier: **invested money must
leave the spendable wallet until repaid** (full-reserve; no fractional-
reserve money multiplier). That also makes the risk real. And once
repayment is funded by variable revenue, **default becomes a feature**: a
failed loan destroys principal (a free sink), lending becomes a real
risk-assessment decision (the finance lesson, for the education
vertical), and the desperate/behind-on-payments NPC is content. The
engine knows the NPC's true risk; the player's job is to *read the
signals* — assessment is a skill, not an exploit surface.

---

## The polity: branches as the dev lifecycle

A polity built years ago in an altered state, and independently
re-derived cold — the convergence is why it's probably load-bearing.

| Branch | Maps to | Does |
|---|---|---|
| Legislative | product/design | decides what the rules (laws) *should* be |
| Executive | **dev** | implements laws as code; runs the institutions code can't reach |
| Judicial | **QA + appeals** | judges conformance; adjudicates disputes; **appeals** |

### Code-as-enforcement, and its totalitarian edge

The profound line: *"laws are enforced by code when they can be."* In a
software polity, **enforcement is code execution**, so any law that can be
coded is enforced perfectly, instantly, equally, incorruptibly — closing
the real-world gap between law-on-the-books and law-as-enforced. But:

> **Perfectly enforced law is totalitarian by default.** Freedom lives in
> the *slack* between law and enforcement (you *can* jaywalk). Code
> removes the slack.

So the legislature is terrifyingly powerful — every law becomes a law of
nature. Two consequences:

- A high bar to legislate, and the judiciary (QA) as a check on whether a
  law is even *wise* to make absolute.
- **Choosing what NOT to code-enforce is as important as what to enforce.**
  *Code the laws that should be absolute; leave to institutions the laws
  that should breathe.* The NPC institutions and social norms aren't the
  leftover — they're the deliberately-preserved slack.

### Appeals: discretion nowhere by default, somewhere by design

Appeals (a **human** process) don't merely mitigate the totalitarian
edge — they resolve it, and beat real-world justice while doing so. In
the real world discretion is everywhere → corruption everywhere. Here,
default enforcement is perfect and incorruptible, and discretion exists
at exactly *one* accountable, logged point: the appeals court. Two laws
make it safe:

- **The asymmetry: the machine can punish; only a human can forgive; a
  human cannot punish where the machine didn't.** Mercy is human;
  conviction is code. (Exploits where code *failed* to punish are fixed by
  legislation + recoding, not by a judge convicting anyway — keeps the
  branches clean.)
- **Appeals are the sensing organ for bad law.** When the court keeps
  forgiving the same *class* of case, the code is wrong → legislature
  amends → dev recodes. (Exactly how common law accretes, then statute
  codifies.) The polity *learns.*

### Chartered, not sovereign

The real structural flaw: separation of powers assumes co-equal branches,
but the executive (dev) **controls the substrate the others run on** — it
writes reality, so it's supreme, not co-equal. The honest resolution is
not a fourth branch but admitting the polity is **chartered, like a
constitutional monarchy or a chartered colony**: real self-governance
within bounds the sovereign (studio) grants and can amend. The
"constitution" is the set of **engine invariants dev publicly binds
itself not to violate**, plus a commitment to implement legislative will
and not bypass QA. The check on dev is *transparency + exit* (open
process; in the limit, the open-source right to fork).

---

## The three houses: producer, consumer, investor

### Power vs stake — the load-bearing discrimination

> **Power is what the game gave you; stake is what you gave the game.
> Only stake votes.**

Advancement is multi-dimensional and splits cleanly:

- **Power** — combat level, skills, achievements, raw wealth. What you can
  *do in* the game. A level-90 character is not a better *citizen*.
  **Power does not vote.** (Most games reflexively make level = influence;
  refuse it.)
- **Stake** — content built, relationships formed, time genuinely shown
  up. What you *gave* the world. **This enfranchises.**

### Multi-membership: a person is a vector of stakes, not a class

The thing real constitutions forbid is *one person holding multiple
offices* (Senator + judge). That is **not** this. Here every person is one
node with a **vector of standing** — 40 consumer, 12 producer, 3 investor
— each voting in its own house at its own weight. **Separation is at the
axis level, not the person level.** Nobody *is* a producer; everyone is
*some amount of each*, exactly like real life (worker + customer +
saver). Consequences:

- The houses stop being **warring tribes** and become **facets of the
  same people** — "producers screw consumers" can't happen if the
  producers *are* the consumers. The check runs through individuals
  weighing two parts of their own interest. Far harder to capture than
  rival factions.
- **Citizenship is free; voice is earned.** Just playing (consuming) makes
  you a full citizen with a full consumer vote. Producing/investing
  *stacks* franchise on top — opt-in, for those who want to do more. (No
  one has to "work for the game" to belong.)
- The one risk it adds — the same superfans dominating all three houses —
  is exactly why **per-axis quadratic weighting / caps become non-
  optional.** Single-membership could skip them; multi-membership can't.

### Three legitimacies (de-tautologizing the axes)

Separate the **proxy** (the activity measured) from the **legitimacy**
(what it's a proxy *for*). Each house grades a different kind of claim:

- **Producer — the maker's legitimacy.** "I built this." Proxy: what
  you've produced.
- **Consumer — the legitimacy of the governed.** "I *live* in this and
  must live with these decisions" — *consent of the governed*, affected =
  enfranchised. Proxy: consumption, which is just the measurable proxy for
  *how much of your life is lived inside the thing being governed*. (Not
  circular once you name what it proxies.)
- **Investor — the underwriter's legitimacy.** "I fund it and bear the
  risk." Proxy: capital.

**Makers, dwellers, funders** — the classic three-estate balance recast.
The consumer house is the most populous and lowest-barrier, so it's the
democratic ballast against the skilled-few producers and capitalized-few
investors.

### Measurement (the meaty open work)

A unifying invariant first, treat it as constitutional:

> **Every axis measures *current* stake, not lifetime accumulation.** The
> polity is always governed by those invested in its *present* — never a
> founder resting on a five-year-old zone or a whale who paid once.
> Standing decays; you keep your voice by staying in the game in the mode
> that earned it. The anti-gerontocracy guarantee.

- **Investor ($)** — current *committed* capital (not lifetime-donated,
  not withdrawn), quadratically weighted, maybe a *patient-capital*
  multiplier so long-committed funds outweigh mercenary in-and-out. Hard
  to fake (real money).
- **Producer** — the Goodhart minefield. The defusing trick: **measure a
  maker's standing by how much *others durably consume* their work** —
  ties producer to consumer (makers accountable to dwellers), is self-
  game-resistant (you can't consume your own work to inflate it), and
  gives "good content" an operational meaning *if* weighted toward
  **durable/returning** consumption (not launch-week spikes) with the
  QA/deploy gate as the floor and a peer/curatorial signal in the basket.
- **Consumer** — *not raw time* (botable/AFK-able). Weight **meaningful,
  recent** engagement, and lean on **social embeddedness** (the
  reciprocation-based signal — an alt army can't fake connection to the
  *established* community without its participation).

### Influence is soulbound

The blockchain idea that actually fits is not coins but **soulbound
tokens** — non-transferable, identity-bound credentials of contribution.
Money is fungible and transferable (with friction scaling to size);
**influence is non-fungible, non-transferable, inalienable.** You cannot
gift, sell, or dump your franchise; it fades only through the legitimate
channels (stop building/being embedded, it decays). The transfer harms
that haunt money simply *don't exist* for influence, because it was never
bearer — and that's the deepest form of "only stake votes": stake is the
part of your advancement you *can't* hand to someone else, because it
isn't a thing you hold, it's a thing you *are* in the world.

---

## The feedback substrate (the afferent nervous system)

"Reddit-tize every piece of content" is not a UI feature — it's the
**sensor layer** the entire measurement model runs on (producer standing,
"good content," the appeals-as-sensing loop, discovery). Make it
ubiquitous and frictionless. But:

> **Reddit's feedback is honest because it's cheap and powerless** (karma
> is worthless). Wire the same thumbs to real influence and co-op money
> and you void the assumption that made it work — you're building *an
> election with money attached* wearing a like button's clothes.

**Steal Reddit's interface; reject Reddit's threat model.** Frictionless
one-click, aggregation, sorting — transferable genius. Naive "score = sum
of votes = consequence" — fatal at these stakes.

### The resolving principle: stated vs revealed preference

- **Stated** (votes/thumbs/reviews) = what people *say* they value. Cheap,
  immediate, **gameable**.
- **Revealed** (what they play, return to, linger in, spend on) = what
  they *actually* value. Laggy, **expensive to fake**.

> **Cheap signal → low-stakes outcomes; expensive signal → high-stakes
> outcomes.** Thumbs drive **discovery/sorting** (if gamed, cheap to
> recover). Producer standing and co-op returns derive from **durable
> revealed behavior** (you can brigade a thumb in an afternoon; you can't
> fake 500 people genuinely returning for months). *Votes surface;
> behavior pays.* — which is also the cleanest answer to the producer-
> measurement Goodhart problem.

### Defenses the high-stakes version forces

- **Trust-weighted votes** (PageRank / web-of-trust over the social
  graph): a vote from an embedded high-standing player outweighs a fresh
  account's. Brigading becomes "corrupt trusted nodes," not "spawn alts."
  Feedback inherits the franchise's anti-Sybil property.
- **Conflict-of-interest** — discount/bar votes on directly competing
  work (no free revenge-voting).
- **Anti-snowball** — hide early scores, randomize some exposure. Reddit's
  rich-get-richer is a minor unfairness there; here it would lock new
  producers out of the franchise pipeline. Newcomer fairness is
  structural.
- **Context-scoping** — Reddit's per-subreddit norms. Don't judge a brutal
  dungeon and a cozy tavern on one axis; normalize to content *type*.
- Design *against* the genuine Reddit diseases: agreement-as-quality
  (hivemind), pile-ons, single-thumb conflation of "I agree" / "well-
  made" / "my tribe approves."

### Friction is the real killer

Most rating systems die of **non-participation**, not manipulation;
Reddit's one-click is the cure — copy it faithfully for the *ambient*
(discovery) layer. Layer richness as **opt-in** (structured reviews,
multi-axis). And **giving good feedback is itself a consumer
contribution** → the thoughtful reviewer earns consumer standing, and
reviews can be rated for helpfulness (the recursion feeds the same trust
graph). The critic is a recognized role, not a freeloader.

---

## The resource economy: a real backing under the fiat

The piece that **grounds everything in physics** and quietly answers the
sources/sinks problem the economy slate parks. Everything else is fiat;
**compute and memory are not** — genuinely scarce, costed in real dollars,
genuinely consumed. They're the game's actual **cost of existence**. And
it's already implied: **LLM tokens** (the director/NPCs) cost real money
per interaction — your most distinctive content is already denominated in
a metered, per-action resource.

### The supply/demand triangle is the three houses

- **Consumers demand** compute (they play, servers spend).
- **Producers create the demand** *and* the value justifying it.
- **Investors supply** compute (their capital pays the bill).

So the investor house's "sustainability domain" gets a precise meaning:
**they govern the compute budget.** And multi-membership makes the
tradeoff *internal* — the member who votes to constrain the budget
(investor hat) is the one who wants rich content (consumer hat). The right
tension, in the right place.

### Honest content ROI = value ÷ cost

Feedback measures **value**; AOP measures **cost**. Neither alone is
honest (pure engagement rewards a resource sinkhole; pure cost-accounting
punishes anything expensive). **Producer standing should be engagement
net of the real resource cost imposed on the commons** — a cheap beloved
tavern beats an extravagant empty cathedral, and now you can prove it.

### The internal capital market is the "real market" you wanted

The realest market the game touches isn't securities — it's **its own
infrastructure cost market** (real compute, real dollars, real scarcity).
Run it as an internal capital market: compute is scarce capital,
investors supply it, producers *bid* with content proposals, consumer
revealed-preference determines returns, the polity allocates toward
highest value-per-cost. Binding to *that* market is fully legal and
honest — it's a co-op paying and governing its own cloud bill. **Caveat:**
compute is a great **sink and unit-of-account**, a poor **store of value**
(cloud prices fall; CPU-seconds are perishable — you spend them, can't
hoard them). It grounds cost-accounting and rationing; the store-of-value
role stays with the soulbound co-op stake. *Compute is the game's
electricity, not its gold.*

### Instrumentation: AOP, with discipline

Resource-metering is the textbook cross-cutting concern — aspects wrapping
dispatch, ticks, LLM calls, DB ops, attributing cost to (actor, content,
action). Two disciplines:

- **The observer consumes what it observes.** Precise exact metering only
  where unit costs are high and individually attributable (LLM tokens
  above all — already costed, worth attributing to the exact NPC and
  interaction); **sampled/statistical** for cheap high-frequency stuff
  (per-command CPU). Don't build books costlier than their line items.
- **Instrument everything; expose cost-consciousness only at the
  governance layer, never moment-to-moment.** A meter running on every
  action makes the game feel like a utility bill — death to fun. The
  casual player plays, subsidized invisibly by the pool; the *polity*
  feels the budget when it allocates. (Same split as feedback: cheap-
  invisible at play, consequential at governance — the recurring
  principle.)

---

## Overrule and risk: capital has a vote, not a veto

The three-house structure means consumers + producers can **overrule**
the investors, so capital-intensive ventures (the magnificent, ruinous
cathedral) can still happen — *at the polity's own risk*. That phrase is
load-bearing.

- **You can outvote investors politically; you cannot outvote them
  financially.** Forcing dissenting investors to fund a bet from the
  general pool is expropriation → capital exits (the chartered-exit
  check). The power to overrule is bounded by capital's right to walk.
- **So overrule = self-funding.** The yes-voters put up their *own*
  resources: **crowdfund** it (the players who want it pool resources,
  lose their stake if it flops — Kickstarter, and it's *why* multi-
  membership: the consumers who want it *become* its investors), draw the
  **treasury** (built from the tax sinks; everyone eats the opportunity
  cost), or **bond** it (borrow against future revenue; service it if it
  pays, austerity if it flops). Risk lands where the ambition was; the
  dissenting investors are untouched. (This is how a city bonds a stadium
  by taxing its own future.)
- **Own-risk requires fund segregation.** In a shared compute pool, "we'll
  fund it ourselves" is meaningless. The venture runs on a **dedicated,
  metered funding line** (the AOP layer makes this auditable), and when
  the line runs dry it **goes dark automatically** — law-as-code at its
  cleanest: it runs exactly as long as its funding has balance.
- **Allocation vs envelope.** Investors get no *project* veto, but the
  **risk envelope** is theirs: ordinary allocation = simple cross-house
  majority (overrule freely on *what* to build); expanding leverage
  (debt past a ceiling, reserves below a floor) = supermajority / investor
  concurrence, because that's their balance sheet. (Real fiscal
  constitutions: legislatures allocate freely; debt ceilings are
  constitutional.)

**Why it's stable — incentive-compatible across all three:** capital-veto
→ the many are powerless and disengage; overrule-with-no-consequence →
investors get expropriated and flee; **overrule-with-own-risk** → the many
get real agency *and* the funders get real protection. Both want in. This
is the maturation point where it stops being a managed sandbox and becomes
a genuine self-governing economy — one that can choose the ruinous
cathedral *and* owns the wreckage. The cathedral that bankrupts the polity
isn't a failure of the design; it's a lesson *lived* — which, for an
education-rooted game, is the point.

---

## The legal vehicle: a multi-stakeholder cooperative

This is the payoff of the whole transferability arc — the established
legal form that sidesteps the securities landmine we kept circling.

- **Multi-stakeholder cooperative** — worker-members + consumer-members +
  patron-members co-governing one enterprise. A real, precedented form
  (strongest in Quebec / Italy / France; in the US needs the right co-op
  statute or careful LLC operating-agreement structuring). The three
  houses *are* its membership classes.
- **The streamer salary is the cleanest flow in the design.** A wage for
  labor is **payroll, not a security** — the streamer is a worker-member,
  compensated for the real work of anchoring the community. Friendly legal
  territory (employment/contractor + worker-cooperative law).
- **Patronage, not investment.** Subs/donations already are patronage-for-
  influence — money given with no expectation of *financial* return, for
  status and influence. Nobody thinks a Twitch sub is a security, because
  it isn't. The co-op formalizes that and gives the influence real
  governance teeth. Patrons fund the co-op (an expense → the streamer's
  wage); they get influence, not a return.
- **The line that stays drawn:** wages and patronage are fine; **tradeable
  stake / profit-expectation returns is the landmine** (Howey looks
  through any wrapper — "it's a token/game/DAO" is not a defense; novelty
  buys nothing against securities law, which is old, broad, and
  substance-based). Self-funding via a non-tradeable co-op is legal
  precisely *because* membership can't be sold — the same non-
  transferability that makes influence soulbound makes the co-op not-a-
  security.
- **This needs a co-op/securities attorney before anything ships.** The
  *shape* is right and precedented; the US specifics are not a "design it
  and see" matter.

---

## The platform reveal: it spawns polities

The structural jump the livestreaming application forces: **this isn't one
polity — it's a multi-tenant platform that *spawns* self-governing
community co-ops.** Each community is its own chartered co-op — own three
houses, own world, own treasury, own constitution.

- **Streamer communities are already the shape.** Viewers = consumers;
  streamer + clippers/mods = producers; subs/donors = investor-patrons.
  Multi-membership *is* how a fanbase is built (the superfan watches,
  subs, and clips — one person, all three). You're not asking the audience
  to adopt new behavior; they already pay for influence. Rides directly on
  the [auth-providers](../tails/auth-providers-slate.md) (Twitch co-equal)
  and [chat-relay](../tails/external-chat-relay-slate.md) tails.
- **Star ≠ dictator — it's a charter dial.** The streamer gets spotlight,
  custom content, highest *earned* producer standing, and a wage; whether
  they also get reserved governance powers is a **charter parameter set at
  founding**, on a spectrum from constitutional-monarch streamer to full
  democracy. The platform serves the whole range because the machinery is
  identical; only the charter varies.
- **Verticals collapse into tenant types.** Education isn't a separate
  product — it's a community where the teacher is the worker-member
  ("streamer"), students are consumers, and the school/sponsors are
  patrons. Livestreaming, education, the standalone demo — all instances
  on one substrate. **Two independent verticals fitting the same engine
  *unmodified* is the proof you built a platform, not a product** — not a
  hedge, the validating second data point (the platform / standalone-demo
  / vertical-product layering: vertical-agnosticism stays internal).
- **Build-on-stream is the cold-start wedge.** Streaming the build makes
  the build's audience the **first community** → dogfood the governance on
  the act of building it (chat = consumer house, contributors =
  producers, subs fund dev = patrons). Breaks the chicken-and-egg (you
  need a community to test community-governance; you grow one by streaming
  the build). One activity at once: tests the streamer vertical, grows the
  launch community, dogfoods governance, and bridges revenue. *Honest
  caveat:* build-in-public success is survivorship-biased and audience-
  growth is brutal — the strategic logic is sound, the execution is where
  these die; "not enough to quit the day job" is the right baseline to let
  compound. The first co-op the platform ever hosts is the one building
  the platform.

---

## Prior art (honest) and what's actually novel

Adjacent work exists — overclaiming "never been done" would be wrong:

- **EVE Online** — player politics (null-sec sovereignty), *emergent,
  unenforced* finance (player banks, Ponzis, scams are "working as
  intended"), and the lesson that stability comes from the **destruction
  sink**, not banking cleverness; the **market**, not the bank, does the
  heavy lifting.
- **A Tale in the Desert** — players literally legislate game laws by
  vote. The closest prior art for player-authored, enforced rules.
- **Platform cooperatives / DAOs** — user-owned platforms; on-chain
  governance; collateralized (trustless) lending; **soulbound tokens**
  (non-transferable credentials) — the one crypto primitive that fits.
- **Worker / multi-stakeholder co-ops** — the offline legal precedent.

**What's genuinely novel is the synthesis:** a *legal* multi-stakeholder
cooperative as the game's **governing and self-funding** entity; a
**resource-backed internal economy** (compute as the honest unit-of-
account/sink); the **three-house political economy** with power-vs-stake
franchise and soulbound influence; **law-as-code with a human appeals
slack-valve**; all **multi-tenant** so any community becomes a self-
governing world. No one prior system combines them.

---

## Open problems — what this needs before it's real

- **A running game.** The political economy can't be tuned against the
  abstract — same reason the economy slate parks the macro layer.
- **The Sybil keystone.** The social-substrate's resistance to alt-gaming
  is the *single* thing under lending, voting, *and* feedback. If it
  holds: unsecured lending + one-person-one-vote + honest feedback all
  unlock. If not: all three fall back to capital/collateral/stake-
  weighting. Knowing how load-bearing it is should inform how the
  social-graph + reputation build is scoped. (Current Sybil friction:
  higher-order identity — Google/Twitch + validated email — plus social
  embeddedness, which is reciprocation-hard to fake.)
- **Legal counsel** before *any* real-money mechanism. The co-op shape is
  right; the specifics aren't a design call.
- **Defining "good" as adversarial.** The moment quality grants power,
  every quality metric becomes a target (Goodhart). "Good" must be
  designed like anti-cheat, not a scoreboard — a basket no single lever
  moves, durable over spike, with human/curatorial components. A
  sub-project in its own right.
- **The art-budget question.** A *real* resource constraint can collide
  with *fun* — sometimes the right call is the ruinous cathedral a value-
  per-compute co-op would never fund. Whether the charter keeps a
  deliberate "art budget" exempt from ROI (a commons that spends on
  greatness *because* it doesn't pencil out) decides whether this is a
  game that's sustainable or a spreadsheet that's playable.
- **Store of value** stays unsolved by the compute backing (it's a flow,
  not a stock). Left to the soulbound stake + whatever the macro economy
  becomes.
- **Franchise disqualifiers.** The felon/minor analog — the gate (banned-
  for-griefing, underage account, convicted by the in-game justice
  system) is binary eligibility, kept separate from earned influence
  weight. The in-game-justice mapping is undesigned.

---

## Synthesis

The conversation that produced this started at "currency and banking" and
arrived somewhere larger: this was never a money system for a game. It's
**the economic constitution for a platform that lets anyone with a
community turn it into a self-governing world** — and the money rails,
the sinks, soulbound influence, the three houses, and the resource
economy are the operating system that makes such a community both
*self-governing* and *self-funding*, legally. A game is the skin it wears.
The first proof of it is the builder, on stream, with the audience that
becomes its first citizens.
