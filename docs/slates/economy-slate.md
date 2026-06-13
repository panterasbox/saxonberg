# Economy slate (working doc)

> **Status: physics settled, build the currency slice; macro deferred to
> a real game.** The *micro-physics* of value — how it enters the world,
> how it's carried, how a transaction clears — is worked out far enough
> to build a basic currency system. The *macro-economics* — faucet/sink
> balance, inflation, whether the loops actually hold at population scale
> — is explicitly parked. Those are tuning problems, and you can't tune
> an economy against physics; you tune it against a running game with
> real players in it. Build the honest substrate now; solve the balance
> when there's something to measure.

Working slate for the **economy** — currency, value, crafting inputs,
and trade. The governing claim, and the reason this isn't filed under
the deferred RPG/game-design layer: **an economy is physics, not game
design.** Stats, progression, and combat balance are game design (and
stay deferred). But how matter and money enter, move, and leave the
world is a conservation problem with in-world rules — substrate, the
same as light or containment. Design the physics now; let the game
design that rides on top come later.

See also:

- [docs/subsystems/glob.md](../subsystems/glob.md) — fungible stacks.
  **Coins and raw materials are already modeled.** A coin-stack is one
  `Globbable` Stuff with a `quantity` field; so is a pile of ore.
  Split / merge / `applyQuantity` already work. Currency is the
  simplest possible glob; the economy mints no new money substrate.
- [docs/subsystems/quantities.md](../subsystems/quantities.md) —
  `Quantity<U>` value object. The shipped precedent for "numbers don't
  leak into the fiction as bare scalars."
- [docs/lenses/endogenous-value.md](../lenses/endogenous-value.md) —
  **this slate's philosophical spine.** Effort-anchored value (skills,
  rank) must trace to real worth; pure-play value (your dorm, a maker's
  pride) may be arbitrary. The economy is where the two can get
  confused — the Goodhart seam.
- [docs/subsystems/chat.md](../subsystems/chat.md) — Channel substrate.
  The emergent auction channel rides here (see *Transaction clearing*).
- [docs/slates/recognition-slate.md](./recognition-slate.md) — a
  vendor's stance varies by *who you are*; that's recognition. The
  economy forward-links to it but does not depend on it (v1 stances are
  flat).
- [docs/slates/scoped-authoring-slate.md](./scoped-authoring-slate.md) —
  player-owned shops are an authorship surface (the dorm-room
  endogenous-value move pointed at commerce).
- [docs/roadmap.md](../roadmap.md) — the "Economy / currency" and
  "Crafting" surfaced-but-deferred entries. This slate is the design
  for that backlog.

---

## The two laws

Everything below falls out of two rules. They're the whole house style
for this subsystem.

### Law 1 — Count things, don't price things

**Quantity is numeric and honest; value is qualitative and emergent.**

- You may read how *many* coins or how much ore you have — that's a
  tally, and tallies are legitimate (it's the `glob` count, free).
- You may **never** read a number that asserts a thing *is worth* N.
  Worth is never a stored, displayed, authoritative property of an
  object. It surfaces only through trade — what someone will give you.

The honest reading of the principle, sharpened against reality (see
*Transaction clearing*): the **system** never computes or asserts a
price. Players will *gossip* a de-facto going rate, and that's fine —
gossip is non-authoritative, laggy, gameable, and personal. What never
exists is the object-property "this blade is worth 12." A price is an
**event between two parties**, not a **property of a thing**.

This is the same trick `Quantity<U>` and the `Light` value object
already pull: the ledger underneath is perfectly numeric; the number
just never leaks into the fiction as a score.

### Law 2 — Never tax absence; never demand scheduled maintenance

The economy's sink (value leaving the world) rides on **activity the
player opted into**, never on the clock running while they're away.
Stated as the prohibition it is — call it the rule learned from the
survival-MMO upkeep treadmill that drives players out:

> **Use consumes. Neglect-of-things-in-flux degrades. Mere ownership
> and absence cost nothing.**

- **Consumables** are spent by use — food eaten, torch burned, reagent
  consumed. Expected, not punishing.
- **Tools wear with use, not with the clock.** A blade dulls because
  you cut with it, never because time passed while you were logged off.
  Repair is then an opt-in *service* (a smith — a mild, diegetic fee
  sink) or self-maintenance (a whetstone — a consumable sink). You
  never pay rent on an idle tool.
- **Things-in-flux** degrade because you put them in flux: a campfire
  burns down, cut flowers wilt, perishables spoil. Active states you
  chose, not background bills.
- **Treasured / authored / carried things don't decay.** Your dorm,
  Gus's watch, the blade on your wall. *Care is the protective force* —
  and care usually means keeping a thing close or not using it up,
  which is free and intentional, the same soft-diegetic-limit principle
  as "Gus's watch is protected by being carried, not a flag."

The test for any fee: do you pay *because you did something* (repair
after a long expedition) or *because time passed* (rent)? The former is
fine. The latter is banned. **No property tax, no rent on owned space,
no upkeep-or-it-decays.** Service fees only at the point of a service
rendered.

---

## The economy is a closed conservation loop

Four stages. Matter enters at extraction, gains value at
transformation, moves through circulation, leaves through entropy.
Conservation holds across all four — nothing is minted from nothing,
and the only true faucet is the world regrowing itself. This is the
EVE / Path-of-Exile lineage (production-and-loss) deliberately chosen
over the WoW lineage (loot-and-currency printed from respawns), because
a printed faucet inflates by construction and a gear treadmill stops
value from ever accreting.

### 1. Extraction (the faucet)

Renewable nodes — veins, forageables, wood, herbs — refill slowly. The
regrowth-vs-harvest rate is **the** macro tuning knob (and one of the
deferred-to-a-real-game problems). Discipline: raw materials are
**abundant but never free.** Value lives in the *transformation*, not
the raw input. **No monster-drop loot faucet** — high-value goods never
spawn; they're only crafted, so every valuable object has provenance.

### 2. Transformation (crafting — the value-add and the learning cash-out)

Raw → goods. This is where effort gets minted into worth, and — in the
education vertical — where learning cashes out diegetically: a recipe is
*knowledge*. Inputs are consumed (conservation); the output is stamped
with provenance (who made it, from what). **Crafting depends on the
maker's skill — but the economy does not design the skill system** (see
*The skill seam* — this is the boundary with the deferred gamification
layer). Quality is handled below; it is never a 0–100 slider.

### 3. Circulation (trade)

Goods move via the currency + clearing model below. The lever that
keeps NPCs honest: **merchants are bounded, not infinite.** A merchant
buying ore runs low on coin; a baker runs out of bread until resupplied.
NPC commerce is a *participant* in the loop, not a money printer or an
infinite sink — the opposite of the classic MUD shop with infinite
stock and infinite coin at fixed prices.

### 4. Entropy (the sink)

Governed entirely by Law 2. Entropy is the honest, always-present sink
(riding on opted-into activity); judicious service fees are a mild
secondary drain charged only at the point of service. Treasured /
authored / carried things are exempt.

---

## Currency: hybrid (soft coin + barter)

- **Soft coin** — a light abstract currency (a `Globbable`) for everyday
  and NPC convenience. Gives new players a legible floor.
- **Barter + provenance** — high-value goods trade without a fixed
  price; worth is relational and carried by the maker's mark.

Chosen over both pure-commodity (PoE-style "currency *is* reagents" —
maximally anti-inflation but illegible to newcomers) and abstract-coin-
only (simplest, but the lineage that reliably inflates).

---

## Quality is a verdict, not a property

"Quality" is not a measurable thing — it's a *judgment about fit*, and
treating it as a single ladder smuggles in an objective "best," which is
false. The honest decomposition:

- **What's real and measurable is the property bundle** — a blade has a
  mass, a length, an edge geometry, a hardness, a balance point. Some in
  real units (grams, cm, degrees); some as **graded ordinal bands**,
  which is *how the real world actually grades materials* (diamond
  clarity, lumber grade, Prime/Choice/Select) precisely because the
  thing is multidimensional. A grade *is* the real unit for "how good is
  this material" — not a dodge from real units, the honest form of them.
- **"Quality" is the fit between that bundle and a purpose**, rendered
  by an observer. Different observers, different purposes, different
  verdicts on the same object. That disagreement is a market having a
  genuine argument about worth — the engine of trade. Same kind of thing
  as value (Law 1): anchored to measurable substrate, never reducible to
  a displayed number.
- **Properties are real; their *effects* are diegetic events, not stat
  math.** A brittle blade *chips or shatters on a hard parry* (a narrated
  event), not "−3 durability/hit." A keen edge *bites where a dull one
  slips.* Same pattern the Thermometer already ships: measure honestly,
  let consequences be in-world events, no damage spreadsheet. This is the
  guardrail that keeps the economy out of RPG-balance territory.

**Honesty discipline (props real or cut): don't model a property nothing
reads.** Edge-angle is vapor until cutting exists to consume it. So the
v1 surface is tiny — *material grade* (carries provenance + sets the
achievable envelope) and *condition* (the entropy state from Law 2).
Richer properties accrete only as the systems that read them ship
(combat mints edge and brittleness; cooking mints freshness and heat-
tolerance).

### The skill seam (the boundary with the deferred layer)

Crafting touches skill at exactly **one point**, and it is a *seam, not
a dependency*: "skill = control." At the moment a craft resolves, it
asks the skill system *"how good is this maker at this craft?"* and
turns the answer into how tightly the result lands on the intended
property bundle — a novice scatters and produces defects; a master hits
spec and can target the extremes of the material's envelope.

**The economy does not define the shape of that answer.** Advancement is
tied to gamification and is deliberately undesigned for now; skill may
end up a number, a band, anchored or not. Whatever it becomes feeds that
one lookup. Crucially, even if skill is "just a number," it stays on its
own side of the seam: it's consumed to produce *control*, and what comes
out is still a verdict (item quality), never a displayed score. "Skill
is a number" and "count, don't price" live on opposite sides of the
membrane and don't collide.

> Everything load-bearing in this subsystem is an **ordinal grade** or a
> **relational verdict** — material grade, item quality, value, and
> (when designed) skill rank. Nothing is a free 0–100 dial. That's one
> house rule, not four.

Provenance does the work a quality number can't: because you can't read
quality off an object, **who made it becomes the signal** — exactly why
real history used maker's marks and hallmarks. Reputation attaches to
the maker; a master's mark can't be farmed or printed (anti-inflation,
and intensely NPC-flavored).

---

## Transaction clearing: stance, not property

The linchpin that makes Law 1 coherent rather than mystical: **a price
isn't a property of an object; it's the momentary outcome of two agents'
stances meeting.** The number doesn't live on the blade — it lives in
"the maker is currently willing to let it go for twelve." Relocate the
number from the *good* to an *agent's willingness* and you keep the
number transactions need while honoring "objects have no price." The
number exists transiently, at the instant of clearing, then is gone; it
never stamps the object.

Three ways stances meet, by transaction weight (mapping onto the hybrid
currency):

1. **Commodity (soft coin)** — a standing stance you accept or walk away
   from. The baker hands over bread for a couple coins. Looks like a
   vendor price, but it's "the baker's current willingness" — varies by
   who you are, by supply, by relationship. A vendor *with a soul*, not
   a price tag. Near-zero friction (you don't haggle over bread) — the
   time-respect valve.
2. **Bespoke (barter + negotiate)** — two stances converge. Where
   provenance-laden goods trade; the rate is invented for that one
   exchange between those two parties and evaporates after. High
   friction, paid only for things that earn it. The layer where "no
   price" is literally true.
3. **Social (gift / favor / debt)** — value moves without clearing a
   number at all; settled by relationship and memory. The most diegetic
   layer, and where NPCs live.

### Pricing is characterization

A stance's seed is **not a price table — it's who the NPC is.** An NPC's
economic stance is a personality trait: the generous one, the gouger,
the soft touch for students, the one who won't sell until you've proven
yourself. The economy's surface texture is therefore *NPCs, not menus* —
content the user wants to author. (Forward-links to recognition for
stances that vary by who-you-are; v1 stances can be flat.)

### Speech is free; settlement is sacred

The moment trade and a chat channel coexist, players create an auction
channel. **This is unstoppable, and it shouldn't be fought** — and it
isn't a defeat of the model, it *is* the model in the wild: "WTS blade
500" is one player's *stance, broadcast.* The channel is a medium for
stances, not a price authority. A trade channel is a **bulletin board**,
and a bulletin board is fine (frame it diegetically — a bazaar's hubbub,
a market frequency — and keep it a *plain* channel; the moment it gets
searchable listings or a price tab, you've built the oracle by
accident).

The line we actually control isn't speech, it's **settlement**:

> **Let the bulletin board roar. Never build the stock exchange.**

The thing that poisoned Diablo 3's auction house was never the price
list — it was *instant, anonymous, fire-and-forget settlement*: list it,
walk away, trade with the faceless market, sort by cheapest. That's what
routes around the gameplay. So **no aggregation, no price history, no
cross-listing search, no buy-it-now bots.** Clearing stays a person-to-
person act — meet, agree, hand it over. The channel may *advertise* a
stance; it may never *transact* one for you.

**Maybe-build, one item on this side:** a **safe bilateral trade
handshake** — both parties see the goods, both confirm, atomic swap — so
person-to-person clearing isn't a scam minefield ("pay first, I'll send
it… *vanishes*"). That's a trade *window*, not a market; it makes the
human handshake safe without aggregating anything. **Build the handshake,
not the exchange.** (Open: whether even this is v1, or "meet in a room
and both drop the goods" is the whole mechanism for now.)

---

## Player shops are the apex of the model, not a violation

Player-owned shops / pushcarts / vendor stalls are the *best* version of
everything above — a **stance persisted and placed in the world.** You
stock it, set your own asking numbers, put it somewhere, and people buy
even while you're offline. Offline vending is **not** the Diablo poison,
because a located stall has none of the poison's properties:

- **Located** — buyers travel to it; spatial friction intact.
- **Owner-priced** — each stall its own numbers; no gamewide rate.
  Price *dispersion*, the opposite of an oracle's convergence.
- **Un-aggregated** — comparison shopping means walking the market.
- **A place** — a bazaar of player stalls is *content*: a destination,
  social space, and an **authorship** surface (a well-stocked, well-
  decorated shop is a player's pride — the dorm-room endogenous-value
  move pointed at commerce).

The owner did the human part in advance (stocked, priced, placed); the
buyer does theirs (traveled, chose). It's still a *named* stall in a
known spot — reputation attaches, nothing's faceless.

Where the oracle creeps back is the convenience layer players ask for
next: *"let me search every shop for the cheapest blade."* That is the
Grand Exchange in a costume (FFXIV's "retainers at a market board" is
nominally stalls but ships full search/sort/price-history, so it
*functions* as an AH). The refined line:

> **Build the stalls. Never build the cross-stall search-and-sort.**
> Comparison shopping costs you a walk.

**Substrate unification:** a player cart and an NPC merchant are *the
same thing* — a located holder of goods and stances. The player vendor
is just a merchant whose stock and prices a *player* authored. One
mechanism, NPCs and players both own one. No market service, no
registry — a placeable, ownable container-with-stances plus the trade
handshake. (Leans on containment, scoped-authoring/ownership, and the
clearing model; mints nothing new at the macro level.)

---

## The bazaar must be worth the walk

The dispersion above (no directory, walk to compare) is only **texture,
not tedium**, if the walk *reveals* rather than merely *costs*. "No
directory" can't mean "same information, more steps" — it must mean **you
find things by being there.** Discovery is what the walk buys: a cart you
didn't know existed, a maker whose work you suddenly want, a rumor, a
pitch.

This is the quiet payoff of refusing the oracle. With no price ticker,
*you don't know the going rate* — you learn it by walking, asking,
remembering. **Market-knowledge becomes earned and relational**: the
regular who knows which cart runs cheap, who's holding good steel this
week, which smith comes down if you're courteous. The missing ticker is
what makes the walk an *activity* (gathering information) instead of a
toll. **Imperfect information is the feature.**

So the bazaar is a **stage, not a UI** — the carts are stagecraft, the
people are the content, and every face is a mechanic wearing character:
owner-set stances → the smith who's proud and picky; provenance → the
maker everyone walks the extra row to find; bounded stock → the bread
cart gone by noon (the market has a rhythm); no oracle → gossip as price
discovery. The anti-oracle stance was never austerity — it was *making
room for the bazaar to be a place.* The mechanic and the place are the
same decision seen from both ends: get the physics honest and the
*world* falls out of it instead of being bolted on.

---

## Buildable now — the currency slice (v1)

Enough is settled to ship a **basic currency system** without touching
the deferred macro/advancement problems:

- **Coin as a `Globbable`** (already exists) — carry, split, merge,
  count. No price display anywhere.
- **NPC vendor as a located stance-holder** — bounded stock + coin,
  owner-set stances expressed as characterization (flat by who-you-are
  for now; recognition enriches later).
- **The clearing interaction** — person-to-person, no aggregation. The
  open call is whether v1 includes the safe-trade *handshake window* or
  just "both drop goods in a room."
- **`condition`** as the first entropy field (Law 2), and **material
  grade** as the first quality band — the only two property surfaces
  until systems that read more of them ship.

What v1 deliberately does **not** ship: crafting (needs the skill seam's
far side), the player-owned shop (needs scoped-authoring + the handshake),
regrowth/extraction tuning, and any market aggregation.

---

## Open problems — deferred to a real game

The micro-physics is honest; the **macro-economics is not solved, and
can't be solved against physics alone.** Parked until there's a running
game with real players to measure:

- **Faucet/sink balance and inflation.** The regrowth-vs-harvest rate,
  whether entropy actually drains enough to offset extraction, whether
  bounded NPCs hold the line at population scale. These are tuning
  problems with no right answer in the abstract.
- **The whole advancement / skill system.** Tied to gamification,
  deliberately undesigned. The economy only consumes it through the one
  skill seam.
- **Recipes as knowledge.** How the *ability* to make things spreads
  (taught / earned-by-doing / discovered) is advancement-adjacent —
  deferred with the skill system.
- **Standalone vs. education-vertical anchoring.** The same craft skill
  is pure-play endogenous value in the standalone game (fine, arbitrary)
  but must anchor to real mastery when a vertical is attached. The
  Goodhart seam the endogenous-value lens watches; resolved by the
  advancement design, not here.
- **Player-to-player at scale, and whether players eventually demand a
  directory.** Held off (per "don't port classic MUD ergonomics" and
  "build when a real player demands it") rather than pre-built. Watch
  item, not a build.

The throughline: **build the honest substrate, tune the balance against
reality.** Or, in the user's framing — you need a real game to solve the
macroeconomics, not just the physics.
