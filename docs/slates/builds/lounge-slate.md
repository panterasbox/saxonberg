# Lounge slate (working doc)

> **Status: design set; v1 is the social-elastic lounge + Dave's Bar
> shell.** The universal login landing — a **social-elastic
> MultiLocation** that buds rooms as people arrive and merges them as
> people leave, **seating** newcomers by play-style "flavor," with **Dave's
> Bar** as the fixed anti-lounge counterpoint to the north. The lounge is
> the v1 consumer of the [MultiLocation substrate](../tails/multilocation-slate.md);
> almost everything else it needs it *consumes* from already-slated
> systems.

Working slate for the **lounge** — where every player materializes on
login, and the game's social lubricant. It's a `LoungeWarren` (a
[MultiLocation](../tails/multilocation-slate.md) `Warren`) rooted at a persistent
**commons** host: one room when quiet, an elastic graph of flavored rooms
when busy, collapsing back as the night winds down. One exit north leads
to **Dave's Bar** — a singleton, the deliberate *anti-lounge*, home of the
first NPC the player ever meets.

The load-bearing decisions (settled over the design conversation):

1. **The lounge is a social-elastic Warren, not a fixed mini-zone.** It
   grows and merges with population (the substrate's job); `LoungeWarren`
   supplies only two overrides — `route` (matchmaking) and `seedMember`
   (the synthesized room "flavor"). This *upgrades* the onboarding slate's
   "single disconnected mini-zone" picture.

2. **Flavor is a tag-set, and the toppings *are* the model.** There's no
   hidden axis space. A "topping" **is** a play-style tag; your preferences
   are a small set of them; a room's synthesized order is the **aggregate**
   of its occupants' toppings; matchmaking is **tag-overlap**. The
   diegetic skin and the data model are the same object.

3. **Routing is active placement, because it's load-balancing.** People
   are sticky — dump everyone in the commons and they *stay*, so you can't
   crowd-source distribution to voluntary movement. `route` is one
   **dual-objective** function: **match filters → load balances → budding
   relieves.** Diegetically you're *seated by the lounge* (hospitality,
   not an algorithm).

4. **Seeding is deliberately soft.** The only structural commitment is
   that the tag-set lives as a **per-character setting**; every way of
   setting it (char-gen, a commons console, the `settings` command, later
   inference) is a thin, swappable front-end. Unset = unflavored = the
   base least-full overflow. This keeps onboarding fast and the acquisition
   flow A/B-testable.

5. **Dave's Bar is the anti-lounge because it's a craft economy, not a
   router.** A fixed singleton (an *external neighbor*, never a Warren
   member). It organizes people the old way — a counter, a barkeep, drinks
   as conversation — with no matchmaking. Drinks are
   [vitals](../tails/vitals-slate.md) consumables; the bar authors only the menu.

6. **Dave is a blank slate.** Deliberately under-characterized so players
   project onto him and his personality *accretes* — dovetailing
   npc-dialogue's emergent/LLM trajectory. Homage to EotL's Dave, not a
   remaster (the old *Moonlighting* bit becomes an easter egg).

See also:

- [docs/slates/multilocation-slate.md](../tails/multilocation-slate.md) — **the
  substrate the lounge rides.** `LoungeWarren extends Warren`; the
  host/commons seats it; members are ephemeral satellites; start-location
  recall resolves members → host. The lounge is its v1 driver.
- [docs/slates/fast-travel-slate.md](../tails/fast-travel-slate.md) — **the exit.**
  The TPA terminal lives on the commons host (comped, `both`-direction,
  pre-imprinted); its state-routing sends first-timers → campus, returners
  → home. The lounge has the network's first terminal.
- [docs/slates/onboarding-slate.md](../builds/onboarding-slate.md) — the lounge is
  the **universal login landing**; this slate **amends** onboarding's
  "single mini-zone" to the elastic Warren. The campus journey + dorm
  payoff are onboarding's; the lounge is the social pocket they depart from.
- [docs/subsystems/char-gen.md](../../subsystems/char-gen.md) — one (optional)
  front-end for seeding the flavor tag-set at intake.
- [docs/slates/npc-dialogue-slate.md](../tails/npc-dialogue-slate.md) — **Dave.**
  He's the slate's own worked example (the barkeep). v1 Dave is minimal;
  full conversational Dave rides its Wave 2 (scripted) / Wave 3 (emergent).
- [docs/slates/vitals-slate.md](../tails/vitals-slate.md) — **drinks.** A drink is
  a vitals consumable: alcohol → an intoxication *condition*, any drink →
  the hydration *reserve*. The bar authors the menu; vitals owns the
  effects (which ride vitals' later waves).
- [docs/subsystems/posture.md](../../subsystems/posture.md) /
  [spatial.md](../../subsystems/spatial.md) — you `sit` at the bar (posture);
  drinks rest on the counter (`SurfacedMixin`).
- [docs/slates/chat-slate.md](../tails/chat-slate.md) /
  [grouping subsystem](../../subsystems/grouping.md) — you can talk on login; the
  router seats you **with your group** (the main override people want).
- [docs/design-philosophy.md](../../design-philosophy.md) — liberal diegesis
  (being "seated," the TPA, drinks); learn-by-doing (the in-world order
  console; meeting Dave). And the project principle that the engine stays
  vertical-neutral — flavor tags are **play-style**, not subject-matter.

---

## Principle

1. **Social-elastic, by construction.** Everyone lands here; the space
   grows and clusters around who's in it.
2. **Toppings are the model.** Tag-set in, tag-overlap match, aggregate-
   tags out — no hidden axes.
3. **Seated, not sorted.** Active placement framed as hospitality;
   load-balancing and matchmaking are the same router.
4. **Soft seeding.** One canonical setting, many swappable front-ends,
   graceful unflavored default.
5. **The bar is the anti-lounge.** A craft economy with a human face — no
   algorithm; the fixed point next to the fluid one.
6. **Dave is a canvas.** Minimal now; personality accretes later.

---

## The model

### The lounge as a `LoungeWarren`

The lounge is a [MultiLocation](../tails/multilocation-slate.md): a persistent
**commons** (the host) seats a runtime `LoungeWarren` that buds/merges
ephemeral satellite rooms. Everything mechanical — budding at capacity,
drain-then-collapse merging, hysteresis, the host's permanence, restart
rebuild, recall resolution — comes from the substrate. `LoungeWarren`
overrides exactly two seams:

- **`route(actor)`** — the dual-objective seating decision (below).
- **`seedMember(room)`** — synthesize the room's "order" from its
  occupants' toppings (below).

The **commons** carries the stable fixtures: the **TPA terminal** (the
lounge-exit, fast-travel) and the **north exit to Dave's Bar**. It's a
normal eligible room in the router — when the lounge is quiet you're seated
there — so it needs the **same capacity cap N** as any satellite, or it
becomes the sticky megaroom by virtue of being where everyone looks first.

### The flavor system — toppings *are* the model

No hidden axes. A **topping is a play-style tag**; your flavor is a small
set of them; a room's synthesized order is the aggregate of its occupants'
toppings. This makes `seedMember` almost free (union/weight the tags) and
matchmaking legible ("you're seated at the mushroom-and-olives table —
explorers and roleplayers").

A starter palette (each topping = a social/play disposition; final roster
content, not engine):

| Topping | Stands for |
|---|---|
| Pepperoni | competitive / PvP-leaning |
| Mushrooms | explorer / wander-and-discover |
| Extra cheese | cozy / low-stakes / chill |
| Olives | roleplay / story-first |
| Pineapple | chaos-gremlin / contrarian |
| Peppers | builder / tinkerer / optimizer |
| Anchovies | lone-wolf / leave-me-alone |

Shape leans: **pick ~3** toppings (dense, legible clusters — a long list
makes everyone unique and rooms mushy); **flat tags v1** (had/don't, not
weighted — weights later); **semi-legible allegory** (evocative names +
discoverable meanings, not a stat sheet and not pure mystery — half the fun
is decoding it). The toppings are **play-style**, never subject-matter, so
the mechanic stays vertical-neutral.

### Seeding the tag-set — soft by design

The only structural commitment: **the tag-set is a per-character setting**
(the `EnvironmentMixin` keyspace). Every acquisition path is then a thin,
swappable front-end over that one setting, none load-bearing:

- **char-gen** (optional intake question),
- a **commons "order console"** (a charming in-world object beside the TPA
  terminal — the discoverable, learn-by-doing way to flavor up),
- the existing **`settings` / `var`** command (free),
- **inferred-from-behavior** (later).

Because they all just write one setting, two of them can ship side-by-side
and actually be A/B-tested. And it pairs with "get people in fast":
flavoring is **fully optional** — an unset tag-set is *unflavored*, which
the base `Warren` already handles (least-full overflow, no clustering). You
play immediately; clustering kicks in only once you've expressed a vibe.
*Lean: char-gen asks nothing required; the commons console is the in-world
way to flavor up.*

### Routing feel — seated, not sorted

People are sticky: if distribution relies on voluntary movement, the load
never spreads and the elastic graph collapses to one megaroom. So **`route`
actively places you** — it's load-balancing, which you cannot delegate to
players. The function has two objectives in one:

> **match filters (vibe-compatible rooms) → load balances (least-full
> among them) → budding relieves (all compatible rooms at N → bud a fresh
> one).**

That's the substrate's base/override split made concrete: the base does
the load half (least-full); `LoungeWarren` adds the match filter on top.

The agency concern is handled by **framing and pull, not movement**:

- **Diegetic cover** — you're *seated by the lounge* (a maître d' shows you
  to a table). Hospitality, not surveillance.
- **Friends are the real override** — placement respects group/party
  ([grouping](../../subsystems/grouping.md)); you're seated *with your people*. This
  is the 99% case for "no, not there," and the router handles it.
- **Re-seat is a request, not a hike** — a cheap "somewhere livelier" /
  "rejoin X" affordance (a pull on the system, which doesn't break
  load-balancing the way relying on push does).
- **Doors stay as the escape hatch**, not the distribution mechanism.

The **synthesized order** changes role accordingly: not a door label you
choose by, but the **character of the room you're already seated in** — an
icebreaker and identity signal once you're there.

### Dave's Bar — the anti-lounge

A **singleton** room one exit north of the commons, reached by a plain
exit. It is an **external neighbor**, never a Warren member: it persists on
its own, has its own life, and is never reaped by the lounge's population.
It's the anti-lounge because it's a **craft economy, not a router** —
people organize the old way (a counter, a barkeep, drinks as conversation),
with no matchmaking. You `sit` at the bar ([posture](../../subsystems/posture.md));
drinks rest on the counter (`SurfacedMixin`).

**Dave the barkeep — the first NPC.** Deliberately a **blank slate**:
minimal, warm, neutral, low-authored, a canvas players project onto whose
personality *accretes* from interaction — which dovetails npc-dialogue's
emergent/LLM trajectory (its Wave 3). v1 Dave does just enough to greet,
take orders, and toss a few barks; full conversational Dave rides
npc-dialogue's Wave 2 (scripted). As the first NPC he carries onboarding
weight: meeting him teaches "NPCs are people you talk to." **Homage, not
remaster** — we honor EotL's Dave's Bar (Dave, the counter, the welcome),
not its dry-soda menu or coin prices; the old *Moonlighting* reference gets
tucked somewhere as an **easter egg**.

**Drinks are [vitals](../tails/vitals-slate.md) consumables.** The bar authors
the **menu** (each drink a Thing you hold/sip, carrying an effect payload +
`NutritionFacts`); **vitals owns the effects**:

- **Alcohol → drunk** = a pharmacological payload applying an **intoxication
  condition** (vitals Layer 4) that onsets, progresses, and self-resolves
  on the cadence.
- **Any drink → hydration** = the hydration **reserve** (vitals Layer 8).

Sequencing note: those effects ride vitals' *later* waves (hydration is
vitals Wave 1, the intoxication condition Wave 2, the eat/drink effect-list
delivery a later vitals wave). So the honest decoupling is **Dave's Bar can
ship as soon as drinks-as-Things exist** (menu, ordering, holding,
sipping), with the **effects lighting up additively when vitals provides
them** — drinks start as social props and *become* effectful. Whether the
lounge build waits for effectful drinks is a requirements-time call; the
architecture doesn't force it.

**Cocktails — decided-but-deferred.** The future supply side: players work
the bar and *make* drinks. Because a making-loop needs a **measurable
target** (mix ingredients to hit a profile; distance = quality), cocktails
use a **continuous taste-profile** representation — the opposite of pizza's
discrete tags, and forced by the fact that cocktails have a craft loop and
pizza doesn't. With employment deferred, **Dave makes all the drinks** and
cocktails "organize" people the **emergent/human** way (shared taste →
conversation through Dave and the counter), never via a router. The
employment loop itself (hiring, working a shift, the skill mini-game) is
the **first real consumer of the activity substrate** (tending bar = a
`SustainedEngagement`, making a drink = a `DurativeActivity`) — deferred
with the service-robot fallback labor.

### Wiring (mostly consumed)

- **Login landing** — everyone materializes in the lounge; the connection
  flow delivers them to the commons host, and the `LoungeWarren` **admits**
  (seats) them. Quiet/unflavored → the commons.
- **Onward routing** — first-time vs returning is the **TPA terminal's**
  state-routing ([fast-travel](../tails/fast-travel-slate.md)): onboarded flag →
  campus entry (first login) or home/dorm-lobby (returning). The lounge
  doesn't own this; it hosts the terminal that does.
- **Recall** — a player who quit *in the lounge* resumes via the **host**
  (re-admitted), per the substrate's start-location seam — never into a
  dead satellite.

---

## Worked scenarios

### A — an evening in the lounge

Quiet: you land in the commons. As arrivals push past **N**, the
`LoungeWarren` buds flavored satellites ("a new doorway opens"), seating
each newcomer in the least-full *compatible* room or budding fresh — the
graph grows along preference clusters. You read the room you're seated in
by its synthesized order. Later the crowd thins; a satellite drops below
**M**, stops receiving, drains its stragglers toward the commons, and
collapses. You leave through the TPA terminal on the commons — first login
routes you to campus, otherwise home.

### B — at the bar

You take the north exit to Dave's. You `sit` at the counter and order. Dave
(blank-slate, warm) makes it and slides it over; you hold the drink (a
Thing). When vitals' consumable wave is live, the beer carries you toward
tipsy and nudges hydration; until then it's a prop you sip. You and the
player two stools down both ordered something bitter and bracing — Dave
ribs you about it, and a conversation starts. No algorithm seated you; the
bar did it the human way.

### C — flavoring up

A new player skips the char-gen flavor question (fast in). Unflavored, they
get least-full overflow seating. Curious, they find the **order console** in
the commons and pick three toppings; it writes their setting. Next arrival,
the router seats them among their kind — and the console, the `settings`
command, and (someday) char-gen all wrote the exact same setting.

---

## Open questions / forks

1. **Drink effects in v1 — effectful or props-first?** Gated on where
   vitals is. *Lean: ship the bar + menu + ordering as Things first;
   effects light up when vitals' consumable/condition waves land.*
2. **Dave's dialogue richness in v1.** *Lean: minimal (greet / order /
   barks); full Dave rides npc-dialogue Wave 2 — keeps this build from
   coupling to npc-dialogue landing first.*
3. **Cocktail representation** — confirm continuous taste-profile (i) for
   the deferred mixing loop. *Lean: yes; the making-loop needs a
   measurable target.*
4. **Topping count, weighting, and allegory legibility.** *Leans: ~3,
   flat, semi-legible.* The real palette + meanings are content.
5. **Commons / satellite capacity N + hysteresis M + reap grace.**
   Content/config tuning, not engine constants — and the obvious A/B
   surface.
6. **Returners: land-and-choose vs auto-route home?** (Shared with the
   onboarding slate.) *Lean: land in the lounge, then a quick affordance —
   or auto after a beat — home.*
7. **Where the *Moonlighting* easter egg lives** (a Dave line under a
   condition, an object, a reference elsewhere). Pure flavor.
8. **Does the commons get a flavor too, or stay the neutral hub?**
   *Lean: neutral hub* — it's the landing + fixtures, not a clustered room.

---

## Build order

**Wave 1 — the lounge + the bar shell.** `LoungeWarren` over the
[MultiLocation substrate](../tails/multilocation-slate.md) (`route` dual-objective
matchmaking + `seedMember` order synthesis); the flavor **tag-set setting**
+ the commons **order console** (+ `settings`/`var` already free);
unflavored graceful default; the **commons** host with the TPA terminal +
north exit wired (consuming fast-travel + the start-location recall seam);
**Dave's Bar** singleton + minimal **Dave** + a **drink menu** as Things
(sip/hold; `sit` at the bar). Effects deferred to vitals.

**Wave 2 — effectful drinks + a richer Dave.** Drink effect payloads via
vitals (intoxication condition + hydration reserve) as those vitals waves
land; scripted-conversation Dave (npc-dialogue Wave 2).

**Wave 3+ — the supply side.** Player **employment** at the bar (the first
activity-substrate consumer: `SustainedEngagement` / `DurativeActivity`) +
the **cocktail mixing** skill loop (continuous taste-profile) + **service
robots** (fallback labor); the **emergent-personality** Dave (npc-dialogue
Wave 3). Richer flavor mechanics (weighted toppings; weighted aggregation).

---

## What this slate does NOT cover

- **The MultiLocation substrate** — the `Warren` / host / member /
  budding / merging / recall machinery → [multilocation-slate.md](../tails/multilocation-slate.md).
  The lounge is its consumer.
- **Drink effects** (intoxication, hydration, the consumable delivery) →
  [vitals-slate.md](../tails/vitals-slate.md). The bar authors only the menu.
- **The fast-travel network** (terminals, routes, scan-to-register, the
  credential) → [fast-travel-slate.md](../tails/fast-travel-slate.md); the lounge
  merely hosts the first terminal.
- **NPC dialogue internals** (responder seam, trees, scripted matching,
  the LLM front-end) → [npc-dialogue-slate.md](../tails/npc-dialogue-slate.md);
  Dave consumes it.
- **Char-gen intake** and the **campus journey / dorm payoff** →
  [docs/subsystems/char-gen.md](../../subsystems/char-gen.md) / [onboarding-slate.md](../builds/onboarding-slate.md).
- **Chat / grouping** → their slates; the lounge consumes "talk on login"
  and "seat with my group."
- **Cocktail mixing + employment + service robots** — deferred (Wave 3+);
  the representation is decided, the build is later.
- **The economy** — wages/tips for bar work are a deferred economy hook;
  v1 has no money.
- **Other MultiLocation consumers** (the procedural dungeon, the expanding
  desert) → their own slates.

---

## Once shaped into formal requirements

This slate boils down to:

- **`LoungeWarren`** (a [MultiLocation](../tails/multilocation-slate.md)
  consumer) overriding `route` (dual-objective matchmaking) + `seedMember`
  (order synthesis), rooted at the persistent **commons** host (TPA
  terminal + north exit + capacity cap N).
- The **flavor tag-set**: toppings-as-model (tags in, overlap match,
  aggregate out), ~3 flat semi-legible play-style tags, stored as a
  **per-character setting** with swappable seeding front-ends (char-gen,
  the commons order console, `settings`/`var`, later inference) and a
  graceful **unflavored** default.
- The **routing feel**: active placement (load-balancing), the
  "seated-by-the-lounge" framing, group co-location, re-seat-on-request,
  doors as correction.
- **Dave's Bar** as an external-singleton anti-lounge: the **menu** of
  drinks-as-Things; **vitals** owning the effects (intoxication condition +
  hydration reserve, decoupled by wave); `sit`-at-the-bar + counter
  surface; **blank-slate Dave** (minimal v1, npc-dialogue for depth,
  Moonlighting easter egg, homage-not-remaster).
- The **cocktail/employment** direction recorded as decided-but-deferred
  (continuous taste-profile; the first activity-substrate consumer).
- **Wiring**: login lands in the lounge (Warren admits); the TPA terminal's
  state-routing carries onward; recall resolves member → host.
- Tests: login seats you (commons when quiet, a compatible satellite when
  busy); your group seats together; an unflavored player gets least-full
  overflow; setting toppings via the console and via `settings` produce the
  same routing; a room's synthesized order reflects its occupants' toppings;
  Dave's Bar is reachable but never reaped by lounge population; you `sit`
  at the bar and order a drink Thing; quitting in the lounge resumes you via
  the host.

Effectful drinks, the scripted/emergent Dave, cocktail mixing, employment,
service robots, and the economy wait for their own waves.

---

# Lounge, revisited (2026-08-01)

**State check before designing:** Wave 1 shipped (the `LoungeWarren`,
flavor tags, the TPA terminal, the north exit) — and **the BAR went deep
without the lounge doing so.** `CocktailShaker`, `CraftedDrink`,
`GradedReceptacle`, `Menu`, `TipJar`, `GlassAlley` all landed via the
crafting and employment builds, so Waves 2–3 are largely done **for Dave's
Bar.** The lounge proper is still Wave 1.

**That split is correct and should be kept: the bar is the deep vertical;
the lounge is the wide social surface.**

## The governing constraints (user, 2026-08-01)

1. **The lounge is FREE OF GAME MECHANICS.** No advancement confers
   anything here. **No crafting, fighting, bartering.** Purely social.
   **The one exception is the social disciplines.**
2. Any "game" inside is an **internal minigame that does not reach
   outside the lounge** (the pizza thing is one).
3. **It is outside everything** — outside all content, and outside even
   Saxonberg, which is itself in its own dimension diegetically.
4. **Dave's Bar is the anti-lounge:** cram in as much interactivity and
   as many systems on display as possible, **without leaking into the
   lounge**, and **without growing past a room or two.**
5. **Most players will NOT land here daily.** It is the first room every
   new player sees, but after the dorm people log in **at their bed** —
   because **beds are how you optimise the logged-out state.**

## ⭐⭐⭐ Player-driven growth: it is not "spawn a room," it is START A TABLE

Reframing the *act* fixes the floor for free. You are not creating
space — you are **convening**, and others follow or do not.

> **Growth splits a crowd; it never escapes one.**

Which is why you cannot do it alone: **a room with one person in it is
not a lounge, it is an empty room.** The floor is a **social** rule, not
a resource one, and needs no separate justification.

Two consequences:

- a player-started room can carry **your** flavor rather than the
  aggregate — *"I am starting a crafters' corner"* — which finally gives
  the toppings system a **player-driven face** instead of only a
  matchmaker;
- **no new lifecycle**: it merges back when it empties, like any budded
  room.

⚠ Anti-grief is covered by the same three things: **the floor** (you
need company), a cap, and **empty rooms reap.**

## ⭐⭐⭐ The logout correction changes the lounge's job

If people log in at their bed, the lounge stops being a daily landing
and becomes **a destination you choose** — a higher bar, because it has
to be **worth going to.**

> **The lounge is the answer to *"I'm on — now what?"***

A genuinely common state that most games have no room for. And every
constraint above fits it: nothing to grind, no faction, no jurisdiction,
**people as the only content.**

## ⭐⭐⭐ The furniture is CONVERSATION SCAFFOLDING, not content

What the no-mechanics rule implies. Every real third place has the same
thing — the TV, the pool table, the newspaper — and none of it is
entertainment. It is **a shared object for strangers to have an opinion
about.**

> **Good lounge furniture makes people face EACH OTHER. Bad furniture
> makes them face the FURNITURE.**

Which is exactly why **the screens work** (everyone watches the same
crossing and argues) and why **a crafting station would be poison**
(heads down, backs turned).

### The furniture that qualifies

Meta systems get a **body** here, and only here — the lounge is
**avowedly a lobby**, so nobody is pretending it is the world, and the
standing *never dress compute as fiction* rule is not being bent:

| Fixture | Shipped system |
|---|---|
| **the screens** | `watch`/`tune` + live MQL subscriptions — a fight, a bill's countdown, an auction's going-going-gone |
| **the notice board** | bulletin |
| **the library** | the help catalogue |
| **the departures board** | TPA (already there) |
| **the mirror** | `standing` / `chronicle` / the transcript |

⚠ **A job board and a registry desk are NOT lounge furniture** — they
are transactional, and they violate rule 1. Those belong in the city.

## ⭐⭐⭐⭐⭐ "No mechanics" is the strongest thing about it

Strip advancement and **the only currency is sociability** — **the
newest player and the oldest are equals here.** That is rare; most
games' social spaces are status displays with chairs.

**And the social-discipline exception is exactly the right carve**,
because it has a structural property nothing else has:

> **A social discipline is the ONLY one that cannot be soloed.**

Its evidence ledger is **inherently multiplayer** — you cannot grind it
against a rock. Which makes the lounge its natural home: **the one room
where the only thing to do is the thing that requires other people.**

## ⭐⭐⭐⭐⭐ The pedagogy — and it is bigger than the lounge

**Social competence is the most-valued and least-credentialed skill in
the real labour market.** Every posting asks for communication,
collaboration, judgment with people; **nobody can evidence any of it**,
and a résumé physically cannot carry it.

> **The lounge is where the game can EVIDENCE soft skills.**

Not test them — **evidence** them. Did you host? Did you help newcomers
find their feet? Did people seek you out? Did you de-escalate
something? All observable and recordable with **machinery that already
exists**: the **chronicle** records deeds, the **transcript** records
evidence, and **renown** records **reception from others rather than
claims about yourself.**

**The [LinkedIn flank](../../study-com-strategy.md) arriving in the
least likely room in the game.**

### Three guards — and the third keeps the room pure

1. **Reception comes from others' reactions**, never from your own acts
   (renown already works this way).
2. **Evidence, not a score** — nobody gets a charisma number.
3. ⭐⭐⭐ **THE LOUNGE GENERATES EVIDENCE IT DOES NOT SPEND.**

> **Evidence in, no rewards out.** The record accrues here; the payoff is
> **outside** — a job, a guild, a reference.

Which preserves rule 1 exactly: **nothing you earn in the lounge does
anything IN the lounge.**

## ⭐⭐⭐ The minigames are a sandbox for social risk

Internal, no external stakes, nothing carries — so they are the one
place you can **be bold, misjudge it, try a persona, and lose nothing.**
That is what a lobby is for, and the pizza thing is already the right
shape.

**⭐⭐ Related: the mirror-with-receipts belongs here.** A room where
there is nothing to do with your hands is exactly where you look at
yourself — *the lobby is where you check yourself before going out.*

## ⭐⭐⭐ Dave's Bar: the demo reel to the lounge's green room

| | **The lounge** | **Dave's Bar** |
|---|---|---|
| **discipline** | **subtracts** | **accumulates** |
| **size** | elastic, uncrowded | **one or two rooms, dense** |
| **shows** | **nothing at all** | **everything the game can do** |

**Two opposite disciplines, one door apart — and the contrast IS the
content.** Capping the bar at a room or two does not shrink it; it makes
**every fixture earn its place.**

⭐ **And the bar is the escape valve**: you never have to say *"you
cannot do that here"* without pointing ten feet north at **where you
can.**

## ⚠ The discipline the room needs

Every new player's first room, and a chosen destination for everyone
else — so it must be **good**, and therefore **small**. *A lobby crowded
with features is an airport.*

> **Everything in the lounge must be OPTIONAL and GLANCEABLE.** You
> should be able to cross it in ten seconds or spend an hour.

## Terminals, arrival, and the no-geography rule (2026-08-01)

### ⭐⭐⭐⭐ The rule: "a mud in a mud"

**(User.)** The lounge must stay **deliberate and precise, in the
simplest terms possible.**

> **If the lobby has to be learned, it has failed.**

Its geography is **knowable at a glance**: the **commons**, the
**elastic rooms**, **one door north.** That is the whole map.

**⚠ The durable consequence — record it, because every future idea will
push against it:**

> **The lounge can never grow a feature that needs a PLACE.** Anything
> wanting its own room goes to **the bar** or **the city**.

*(An earlier proposal for a separate "terminal room" is withdrawn on
this rule: it was geography pretending to be meaning.)*

### ⭐⭐⭐ Arrival: a MOBILE terminal, and the seam already exists

`FastTravelMixin` already carries **directionality**
(`arrival` / `departure` / `both`, rendered by `TpaTerminal` as a
**coloured status light**) plus **`getArrivalRoom()`** — which is a
**method**, not a field.

So the `LoungeWarren` simply answers *"where do arrivals land"* with its
**current load-balancing decision** — no relocation bookkeeping, no new
machinery, and it **reuses the `route` matchmaking that already seats
logins.**

> **The terminal's location IS the Warren's load-balancing decision,
> made physical.** The machinery becomes furniture.

**⭐⭐ Keep it a VISIBLE OBJECT.** Arrivals then get **witnessed** —
people see someone come through, which is social. Players materialising
anywhere is spooky and produces **no moment**; a terminal is also a
landmark and a thing to stand near.

⭐ **And run `route` on arrival, not only on login** — returning players
get the social sorting too.

### ⭐⭐⭐⭐ Departure: in the COMMONS — and the reason is social, not visibility

**(User's lean, and the argument is stronger than "people should see the
door.")**

> **A visible departure is an INVITATION.**

Someone stepping up to the terminal is **the single most natural moment
for *"mind if I come?"*** — and that is the lever on the lounge-lizard
problem, since **they leave for a PERSON, not for content.**

Put the terminal **in the bar** and departures become **invisible**:
nobody is in the room to ask, and the moment never happens. Put it in
the **commons** and **every departure is a recruitment opportunity.**

⭐ **It pairs with the departures board**: the **board** says *where
people are going*; the **terminal** is *where they go from.* Both
visible, both conversation scaffolding, both in the hero room.

### ⭐⭐⭐ The threshold is PSYCHOLOGICAL, not architectural

The crossing should still *feel* like one — and that needs no floor
plan:

> **Ceremony instead of geography.**

A beat, a confirm, a **farewell narration to the room** — *"Mara steps
into the terminal and is gone."* `MessageApi.scene`, free, and it gives
departure weight **without a single new exit.**

**The notary finding again: formality as friction, and it never needed a
building.** The hesitation an anxious player feels is at **the act**, not
at a doorway — so **put the ceremony on the act.**

### ⚠ And the bar is a destination, never a passage

> **A tease you are forced through is a TOLL. A tease you choose is an
> INVITATION.**

Routing traffic through the bar would make it a **corridor** — the same
dead-space failure, pointed at the sidekick — and would **promote the
sidekick by accident.** *The bar is a destination off the commons.*

⭐ **Corrected reasoning worth keeping:** an earlier draft argued for
putting the departure terminal behind the bar so departures would be
"teased." **That fails, because the lizard never walks that way.**

> **Architecture teases the COMMITTED. People tease the UNDECIDED.**

The tease that actually reaches a lounge lizard is **someone arriving
back with a story**, **someone saying "come with us"**, and **the board
showing where people went.**

### Settles open question 6

> **Arriving at the lounge means you MEANT to.**

No auto-routing home — most players log in at their bed, so a lounge
arrival is a choice.

## The pizza — the flavor system made touchable (2026-08-01)

The pizza was always **the matchmaking metaphor**: toppings are
play-style tags and a room's "synthesized order" is the aggregate of who
is sitting there. The question is not *what is the pizza game* but **how
to make the metaphor touchable.**

### ⭐⭐⭐⭐ First, the boundary: the lounge is WORLD WITHOUT GAME

**(User correction — the earlier "mechanically inert / doesn't feed you"
framing was wrong.)**

> **Physics is the world behaving consistently. Game is the world
> keeping score.**

**Five months of physics shipped before advancement** — physics **is**
the world; the game is a layer on top. **Strip the physics and the room
stops being a place at all**: a menu with furniture.

> **Physics is AVAILABLE, never DEMANDED.**

**Pizza is pizza.** Hot, massed, smelling of itself, edible, and it
nourishes exactly as much as pizza does anywhere. Nothing in the lounge
*requires* you to engage with your body — **nobody starves in a lobby** —
but the world does not stop running because you stepped outside the
game.

### ⭐⭐⭐ The waiter — make the machinery diegetic by giving it an agent

**No magic swapping.** The same move already made for the terminal: the
Warren's load-balancing became a **mobile terminal**; the flavor
aggregate becomes **somebody's job.** He comes, takes the old pie, brings
the new one.

**⭐⭐⭐⭐ And the swap is an EVENT THE ROOM WITNESSES** — it announces
*the composition changed* **without a UI notification**, and hands
everyone at the table something to remark on. Composition change becomes
a small social beat.

**⭐⭐ He is also the one NPC who never goes home.** The bar closes; the
lounge does not — so he is always on, which is thematically exact for a
room outside time and **costs nothing to justify.**

### ⭐⭐⭐⭐⭐ The pie is CONSENSUS; the slice is DISSENT

**(User — the strongest idea in the thread.)** Do **both**:

| | What it shows |
|---|---|
| **the pie on the table** | **the room's portrait** — the aggregate, swapped when it changes |
| **the circulating pies** (the buffet) | **how you get a slice that is YOURS** — the all-night round-table mode |

**Holding an anchovy slice while the pie in the middle is pepperoni is
LEGIBLE DISAGREEMENT — wordless, with zero mechanics.** An enormous
amount of expression for free.

So **the buffet is not fragmentation, it is the second layer**: the
waiter carrying pies around **is** the buffet; the table's pie is the
group photo. **The pie is the room; the slice is you.**

### ⭐⭐⭐ Which upgrades the pedagogy to the honest version

The pizza was already **preference aggregation** — social choice theory,
Arrow at a dinner table. With the slice it becomes better:

> **The pie is the TALLY. The slice is your POSITION.**

You can see **the majority AND who disagrees with it** — precisely what
**public positions** do in the conviction system.

- **Aggregation alone** teaches *"the group decided."*
- **Aggregation with visible dissent** teaches **what a collective
  decision actually costs.**

> **The lounge teaches it with lunch; the chamber teaches it with a
> bill.** Same lesson, two scales — and the pizza is where you learn
> **unanimity is impossible and somebody always eats around the
> olives.**

### The rest of the toy

- ⭐⭐⭐ **The game is negotiation, and it has NO WINNER.** The outcome is
  a pizza, not a score. **A minigame with no winner is a TOY** — right
  for a lobby: something you fiddle with **while talking.** *Chess in a
  café is not about winning either.* Adding a score would smuggle
  competition into a room that has none.
- ⭐⭐⭐ **Pineapple is a free argument.** The palette already puts it on
  chaos-gremlin, and **you need to know nothing about the game to have
  an opinion about pineapple** — an argument a stranger can join in
  their first minute. The best available icebreaker.
- ⭐⭐⭐ **"Have a slice" is the lounge's handshake** — the smallest
  possible act of hospitality, universally legible, and **exactly the
  kind of deed the soft-skills record wants.** A new player's first
  social act.
- ⭐⭐ **The order console is the preferences panel as a MENU.** Setting
  your own toppings should feel like **ordering**, not like filling in a
  form. Same data; one of them is a pleasure to read.

### ⭐⭐ One boundary the "six bucks" raises

The lounge should not **transact** — money is game.

> **The lounge feeds you free; the bar charges.**

Which lets you feel the difference between the two rooms the moment you
cross the door, and keeps the all-you-can-eat spirit **without importing
an economy.**

### Possible, not scoped

The table could **choose its aggregation rule** — majority, veto,
everyone-gets-one-slice-their-way. **The amendment library at toy
scale.** Leave it as a possibility; **the toy works without it.**

## The remote, the screens, and the broadcasting industry (2026-08-01)

### ⚠ First, the register correction

An earlier pass proposed a **prompt jar** and similar. **Rejected —
that is corporate-icebreaker energy** (*"a trust fall"*), and **nobody
has ever walked into a bar and been handed a question.** The failure:
optimising for *"conversation scaffolding"* produced **team-building
exercises**. The correct register is **the barfly's**.

### ⭐⭐⭐ The reframe: it is ONE venue

**The bar is the counter. The lounge is the floor.** Limited seats and
constant traffic at the counter because **that is where the business
happens**; tables where you actually sit.

Which reconciles what looked contradictory: *"the bar has mechanics"*
and *"it is one social space"* are the same statement —
**you transact at the bar and you sit at the tables.**

### ⭐⭐⭐⭐⭐ Themed booths around a central bar — and the pizza is the décor

**(User's SF reference: booths each themed as a different *kind* of bar
— dive, sports, tiki — radiating from a bar in the centre.)** That is
**exactly our topology**, and it fixes the weakest part of the flavor
system:

> **The pizza determines the décor.**

A pepperoni-heavy table renders as **the sports bar**; olives + extra
cheese is **the quiet back booth**; pineapple is obviously **the tiki
bar**. **You walk in and know who is here** — no prose adjectives, no
tag readout.

**⭐⭐⭐⭐ And it dissolves the "what are the other minigames" question:**

> **There is no universal set. The room's theme brings its own game.**

The sports booth has the screen; the dive has dice and a board; the tiki
bar has something stupid and elaborate. An earlier one-size-fits-all
list read generic **because the lounge is seven different bars.**

### ⭐⭐⭐ Money is PHYSICS — correcting "money is game"

**Money is conserved and it does not measure you** — that is mass, not
XP. Advancement measures you; **money just moves.** So the lounge may
have money, under one rule:

> **The lounge is a place you SPEND, never a place you EARN.**

No income ⇒ no grind, so *world without game* survives with money fully
real. (And of course the drinks cost money — the earlier "the lounge
feeds you free" is withdrawn.)

⚠ **No ATM.** **The walk to get more money IS the brake** — an ATM
converts a bounded loss into an unbounded one, and every real bar with
one is worse for it.

### ⭐⭐⭐ Gambling DECORATES an activity; it is not one

> **Gambling gives stakes to something that was already happening.
> There is always an activity underneath.**

So the design question is never *"what is the gambling game"* but
**"what are they already doing, and can it carry a bet."** *(And "do you
gamble at all" is itself a topping.)*

**⭐⭐⭐⭐ The Korean-Academy-Awards principle** (user, betting on an
awards show in a language nobody in the bar spoke, on clips alone):

> **You do not need to understand what is on the screen to bet on it.**

Which corrects an earlier **prediction pool** proposal: that was a
**competence** exercise (*get better by paying attention*); this is a
**social** one. **The point is not to be right — it is to have picked.**
The less anyone knows, the better the argument.

### ⭐⭐⭐⭐⭐ The TV is the portal out — more than the terminal

The terminal **requires a decision**; the TV requires nothing, because
you are already looking at it. And:

> **The terminal shows you DESTINATIONS. The TV shows you WHAT HAPPENS
> THERE.**

**⭐⭐⭐⭐ Which makes a commercial a PLAYER-AUTHORED INVITATION.** If
businesses buy airtime, the screen fills with players saying *come to my
shop* — **the lizard-extraction mechanism funded by the people who want
customers.** Nobody has to design pull content; **businesses pay to make
it.**

### ⭐⭐⭐⭐ The channel lineup is DERIVED, not authored

| Channel | Source |
|---|---|
| **the fights** | the Nightside pit — consensual combat, **betting already designed** |
| **the chamber** | the docket + bill countdowns — **C-SPAN, and it is boring, which is honest and funny** |
| **the news** | the press and its publishers |
| **the block** | the auction house — **a live shopping channel** |
| **corpo programming** | five corpos with faces; **Goodkin's wholesome company-town broadcasting writes itself** |
| **the University** | lectures — the practicum, broadcast |
| **the forecast** | the almanac-maker |
| **streams** | actual players |

> **The TV lineup IS the game's table of contents** — derived rather
> than authored, which is exactly why it works as the portal.

### ⭐⭐⭐ Broadcasting as a business — a new category

**A channel is a publisher with a moving picture** (fourth instance
after the ticker, the auction catalogue and the press). But its
economics are new:

> **The broadcaster sells ATTENTION — the first business in the chain
> whose product is other people's eyes.**

⭐⭐ **A sixth monopoly shape: power from owning attention** — the modern
one.

**⭐⭐⭐ And advertising is the economy's first marketing mechanic**, with
its honest property intact: **you pay for attention and can never be
quite sure it worked.** ⭐ Plus a neat loop — **the ad is the price of
the channel and the remote is the escape**, which makes changing
channels during the commercial a social act everyone understands.

### ⭐⭐⭐ Two kinds of screen

- **The lounge's screen** may show **anything, including real player
  streams** — the lounge is out-of-fiction, so it is the one place where
  that is not a violation.
- **A screen in Terminus** shows **in-world channels only.**

Same object, different rules; the difference **is** the fiction
boundary.

## The remote — and the danger in it

### ⭐⭐⭐⭐ The lesson in the two stories

**(User: Bolo was *given* the remote by the bartender, the power went to
his head, and he lost it. The user *took* it with a phone IR app, used
it only when nothing was being watched, and kept it — because he was
there three or four nights a week.)**

> **The remote is not held. It is TOLERATED.**

Nobody *has* it — the room **permits** you, continuously, and can stop
permitting **without a vote.** Bolo had the formal grant and lost the
tolerance by using it maximally; the user had no grant and kept it by
using it minimally.

**⭐⭐⭐ So it must NOT be an office** *(withdrawing an earlier "the
remote is the lounge's only office")*. A position invites Bolo's failure
and creates something to campaign for. **There is no rule about the
remote; there is only what you can get away with.**

**⭐⭐⭐⭐ And regularity is the other half:**

> **Your standing in the room is exactly how much channel-changing you
> can do without getting a second look.**

Presence-derived latitude — the lounge's own ladder, **conferred by
people and spendable on nothing.**

**⭐⭐⭐⭐ Bolo's half is the design warning: FORMALISING IT DESTROYS
IT.** So **let a room appoint a captain if it wants — and let it fail
the way it failed at his bar.** The amendment library the right way
round: adopt the rule, discover why the norm was better.

### The background question: how does a lounge lizard earn standing?

**They already do, and the mechanism is right.** Consumer standing is
**participation × renown**: participation counts *presence with action*
(anti-AFK by construction, one credit per bucket — unfarmable by
idling), and renown counts **reception**, i.e. **other people's
reactions to you.**

> **A good host accrues standing because people RESPOND to them.**

No lounge-specific wiring needed. **The consumer chamber is the chamber
of people who play, and socialising is playing.** ⭐⭐ And the existing
anti-gaming property already holds: **you cannot farm reception, because
it requires other people to genuinely respond.**

### ⚠ The danger, named

> **The moment a social signal becomes an input to power, it stops being
> social.**

Every karma system died this way — and here it would be worse: wiring
lounge behaviour into influence would give **the lounge the most
consequential mechanics in the game, dressed as inclusivity.** The
largest available violation of its own rule.

### ⭐⭐⭐⭐⭐ The protection is not depth and abstraction — it is that the remote PAYS NOTHING

**(User: *"the depth and the abstraction is maybe the only thing
protecting us right now."*)** Obscurity is a weak guard; it erodes as
players learn the system. There is a far stronger one, free:

> **You do not have to defend a system nobody can profit from.**

If getting away with the remote **feeds nothing**, there is **nothing to
farm** — the reason to change the channel is that you want to watch the
game. Keep it **meaning nothing outside the lounge AND meaning nothing
mechanically inside it.** Real, felt, contested, worth zero.

### ⭐⭐⭐⭐ Which makes the veto trivial

> **The veto is: somebody else changes the channel.**

No lock, no vote, no cooldown, no threshold. **"Getting away with it"
means nobody changed it back** — a pure social equilibrium with **no
state to accumulate**, which is precisely why it cannot be gamed. A
channel-change war is self-limiting because it is tedious and visible.

**⭐⭐⭐ And attribution is the whole enforcement**: the change is
**narrated**, never anonymous — *"Mara gets up and changes the
channel."*

**Fourth instance of the same move this session** (the docket, the
visible departure, the pie swap, the remote):

> **Make the act visible and the problem solves itself.**

### ⭐⭐⭐⭐ And the general rule for "games within games"

The worry is structurally correct: **every layer added to protect a
system is a new surface to attack.** A veto needs a veto-veto;
incentive systems that guard incentive systems compound rather than
cancel.

The exit is not another layer:

> **DON'T DEFEND THE TOWER. REMOVE THE TREASURE.**

Which is why the answer is not *"design a better veto"* but **make sure
the thing at the bottom is not worth anything.** Then a second look is
sufficient, because nothing is at stake.

## The remote as a STANDING SIGNAL — and the gameability doctrine (2026-08-01)

**(User's original proposal, which an earlier pass lost: using the
remote and getting away with it is a signal that you enhanced the
experience — **quality** — and doing it repeatedly strengthens it —
**quantity**.)**

⚠ **The category error that lost it:** the earlier pass treated the
remote as a **status** and dissolved it (*"remove the treasure"*). It
was proposed as a **measurement**. **Status needs defending; a
measurement needs VALIDITY** — does it measure what it claims?

### ⭐⭐⭐ The signal's structure is unusually good

> **It is an act with a built-in counterfactual.**

Most acts are never tested — you say a thing and whether it landed is
invisible. This one is tested by **not being reverted**, and reverting
is **free, available and obvious**, so the room's non-response is a real
verdict rather than missing data.

### ⭐⭐⭐⭐ It needs a DENOMINATOR — which kills the trivial farm

Silence in an empty room means nothing; silence from eight who could all
have reverted means something.

> **Tolerance from an audience of eight is worth eight times tolerance
> from one. Alone it is worth zero.**

Same shape as the passage rule measuring against `totalStanding` rather
than turnout — and **no new machinery.**

### ⭐⭐⭐⭐ Two-sided — and this dissolves "games within games"

> **Unreverted → esteem. Reverted → notoriety.**

**The veto IS the signal.** Reverting someone is how you rate them — so
there is **no separate incentive layer for the veto to need**, because
vetoing is just the existing reaction mechanic with its **signed
valence** already built in. *No tower, and therefore no second tower to
guard the first.*

### ⭐⭐⭐⭐⭐ The soundness test it passes

The obvious "exploit" is **read the room and put on what people actually
want.**

> **The exploit is indistinguishable from competence** — the only way to
> farm it is to be good at the thing it measures.

So the corrected principle is **not** *"remove the treasure"* but:

> **Make the only path to the treasure the thing you wanted anyway.**

### Residual attack surfaces — all riding shipped guards

| Attack | Guard |
|---|---|
| **volume** (flip constantly) | **log saturation** on reception (`ln(1 + Σ)`) — volume does not pay |
| **collusion** (friends never revert) | **dilutes with room size** (you need a room, not a friend) and **it is visible** |
| **revert-griefing** | reverting is **free and unsignalled for the reverter**, but **attributed** — a serial reverter is visible as one |

**Magnitude: small.** One tap among several, capped by existing
saturation. **A remote-hog must never out-earn a beloved host.** The
signal says one narrow thing: *this person makes the room better, and
the room agrees* — precisely the thing a lounge lizard does that nothing
else was measuring.

## ⭐⭐⭐⭐⭐ The gameability doctrine (the session's most-corrected reflex)

**(User: *"it's still a gamable surface but I don't think there's a way
around that… I generally reject your analysis when that's your only
pushback. Some things are just gamable, it's a video game."*)**

**"It is gameable" is nearly always true and almost never decisive.**
Every mechanic with a payoff can be optimised. As a sole objection it is
cheap, usually right about the mechanism and wrong about the
consequence, and it carries a systematic bias toward **removal** — which
makes designs safer and **duller**. *A game with nothing worth
optimising is a game with nothing to do.*

⚠ **And the remote was being held to a standard the legislature does not
meet.** Conviction voting is **public**: everyone knows the build
period, everyone knows a flip resets the clock, everyone can see your
position. **Lobbying, timing a crossing and building a coalition are all
"exploits" — and they are the entire content.**

### The rule that replaces it

> **Gameability is only fatal when the gaming is INVISIBLE, or when it
> breaks CONSERVATION. Everything else is play.**

It explains every call made this session:

| Concern | Why it was real | Test |
|---|---|---|
| tamper-evidence | conservation of **truth** | conservation |
| ratings shilling | fixed by **falsifiability** — making it *visible* | visibility |
| conviction farming | fixed by **decay + bucket dedup** | conservation |
| **the remote** | neither invisible nor conserving anything | **clears both** |

*The ratings case is the tell: shilling was not fixed by removing the
payoff but by making the outcome **checkable** — the same medicine,
forgotten one turn later.*

### ⭐⭐⭐⭐⭐ And the positive doctrine: LEVERAGE THE META

> **A visible incentive turns an action into a STATEMENT.**

**Hidden** incentives produce **quiet optimisation** — someone farming
greetings in a corner; grind, and nobody enjoys watching it. **Visible**
incentives produce **posturing** — and **posturing is theatre**, which
is what a social space is *for*.

*"Look at Mr Big Shot grabbing the remote like he owns the place"* is
**content the system generates for free**, and it exists **only because
everyone knows the rules.**

Concretely:

- **a channel change is a three-beat scene** — **the claim, the pause,
  the verdict**;
- and the room gets its native content: **gossip about who does it too
  much.**

**⭐⭐⭐⭐⭐ And the closer is the user's own story.** Bolo used it
maximally and lost it; the user used it sparingly and kept it — but:

> **A hidden incentive makes restraint invisible. A VISIBLE one makes
> restraint a virtue people can SEE.**

**You cannot be modest about a power nobody knows you have.** The
anecdote only works because everyone in that bar understood the stakes —
so **the meta being public is not a leak to plug, it is the
PRECONDITION** for the entire dynamic.

**Therefore: narrate the reach for the remote like it means something,
because it does.**

> **This is the same thesis as the politics work.** The rules are
> published, everyone optimises, and **the optimisation is the game.**

## Props, symmetry, and the toppings — RESOLVED (2026-08-01)

### ⭐⭐⭐ Two screens per room: one contested, one not

**(User.)** One screen the **remote controls** (entertainment); one on a
**loop / closed-caption** (informational — departures, the docket
ticker, the forecast, prices, who is on).

> **You fight over the entertainment screen and never over the
> information screen, because nobody argues with the departures board.**

**Scarcity creates the politics; abundance removes it.** So the pair
gives **one status object and one commons** side by side — and the info
screen absorbs the "departures board" furniture as a second screen
rather than a separate fixture.

### ⭐⭐⭐⭐ The prop generator (a test, not a brainstorm)

What made the screens + remote work:

> **Familiar · shared · passive · and either CONTESTED or
> OUTWARD-POINTING.**

Familiar = zero learning. Shared = a common referent. Passive =
optional and glanceable. Contested = status; outward-pointing = a
portal.

**Props that pass:** the **window** (what do you see from a room outside
everything? — outward, thematically perfect, **no mechanics**) · the
**board** (player-pinned notes and ads — **user-generated furniture that
accumulates between sessions**) · the **lost-and-found** (**a
slow-motion story generator**: things appear, people claim them,
mysteries accrue) · the **pool table** (spectatable physics, *the* bar
game).

### ⭐⭐⭐⭐⭐ The jukebox goes in the BAR — and the friction IS the hook

**(User.)** To use it you must **pay coin and walk to the bar**, which
kind of sucks — **but you can go to town and buy an aether-implant
update that lets you use it remotely.**

> **The best out-of-lounge incentive is a thing that makes the lounge
> better.** You leave in order to improve the place you did not want to
> leave, and **the reward comes home with you.**

The **first extraction mechanic that is not social** (everything else
was *"your friend asks you to come"*), and it **respects the lizard
instead of punishing them.** It also fits what the aether *is* — a
remote-jukebox app is exactly what an aether update should be, matching
the shipped `CredentialWalletUpdate` / travel-credential pattern.

**⭐⭐⭐ The boundary that keeps it legal in a no-mechanics room:**

> **The upgrade saves you a walk. It does not win you anything.**

The **capability is universal** (anyone can walk to the bar); only the
**convenience** is bought. ⭐⭐ And *"he's got the app"* is precisely the
small, visible, worth-nothing status the lounge trades in.

*(Note the pairing it creates: **the jukebox is a QUEUE; the remote is a
SEIZURE** — two social protocols for the same kind of scarce resource,
and people will have opinions about which is fairer.)*

### ⭐⭐⭐⭐⭐ Symmetry: UNIFORM PROPS, FLAVORED CONTENT

**Different mechanics per room is "a mud in a mud" in disguise** — a map
you must learn even though it is not spatial — and it breaks instant
budding, since a room cannot just appear if it needs a mechanical
identity.

> **Every room has the same furniture; the aggregate decides what is ON
> it.**

The sports booth has the fights up and something loud playing; the quiet
corner has the info screen and nothing on. **Same objects, different
content** — which *is* *the pizza determines the décor*, and it is why
the Warren can bud a room in an instant.

⚠ **And the honest answer to "is skin enough":** yes — **the rooms
differ in the only way that matters, which is who is in them.** The
décor is a **readout**, not the content.

## The toppings — DISCIPLINE FAMILIES

### ⚠ Two rejected drafts, and why

1. **Re-pointing the tags at explicit dispositions** ("comfortable",
   "opinionated") — **a regression**: it made the meanings **legible**,
   which **destroys the conversation piece.** The slate's original
   *"evocative names, discoverable meanings, half the fun is decoding
   it"* was right.
2. **A political-disposition palette** (institutionalist / majoritarian
   / dissenter / preservationist / reformer / autonomist / mutualist) —
   **too esoteric.** *(User: "I couldn't even tell you which most of
   these would pick, it'd be whatever one they actually understood.")*

   > **A taxonomy people do not understand does not randomise the
   > signal — it turns it into a VOCABULARY TEST.**

⚠ **And a third argument of mine died with it.** I had claimed *"spend
the topping on what is not already visible"* — but **a brand-new player
has nothing visible**: no competence, no transcript, no gear, no
reputation.

### ⭐⭐⭐⭐⭐ Which reveals what a topping actually is

> **For a new player the topping is not a description — it is an
> ASPIRATION.**

*"I want to be a maker"* is a real and useful thing to say on your first
night — which makes the topping **most valuable to the person with the
least to show**, a good property for a room whose job is receiving
newcomers.

**⭐⭐⭐⭐ And its real function is MENTORSHIP MATCHMAKING:** *"Oh, you're
making? Talk to Rhea, she's the one to ask."* The most valuable thing a
newcomer needs and the easiest thing a veteran can give — and it
**generates exactly the help-a-newcomer moments the soft-skills record
depends on.** *The topping creates the occasions for the behaviour the
room exists to reward.*

### And the right kind of difference

> **Discipline difference produces CURIOSITY. Political difference
> produces ARGUMENT.**

Both generate conversation, but for a room half full of strangers:

> **A room where strangers argue politics is a bar at 1am. A room where
> strangers ask what you do is a bar at 8pm. The lounge should be 8pm.**

### The palette

**Moving** and **trading** are merged into one commercial family —
socially, *"I work the roads and the markets"* is one kind of person —
which keeps the list at seven.

| Topping | Reads as | Covers |
|---|---|---|
| **Pepperoni** | **fighting** | combat, guard, escort — *the default order* |
| **Sausage** | **making** | every craft and trade; made, not grown |
| **Mushrooms** | **growing** | farming, ranching, fishing, mining — what you take from the land |
| **Olives** | **dealing** | freight, trade, markets, brokerage — *the archetypal traded good* |
| **Peppers** | **knowing** | scholarship, investigation, appraisal, navigation — *sharp, cuts through* |
| **Extra cheese** | **tending** | medicine, teaching, hosting, care — *the thing that binds the pie* |
| **Anchovies** | **telling** | press, performance, streaming — *announces itself* |
| **Pineapple** | **"I reject the premise"** | the wildcard, unchanged and worth keeping |

**⭐ New vocations join an existing family** — the palette never grows as
the game does, which was the whole failure of an activity-per-system
scheme.

### ⭐ Two rules to keep

> **The topping is what you WANT TO BE, not what you are.**

So it can change — and **changing it is itself a conversation.**
*"You dropped mushrooms?"* is a better opener than anything a prompt jar
could produce, and it costs nothing.

⚠ **A second rule here — "keep the mapping UNPUBLISHED" — was REVERSED
on 2026-08-01. The menu states the discipline plainly. See § The menu —
the mapping is PUBLISHED, below.**

### The jukebox in a silent game — what it actually DOES

**(User: *"we're a silent game."*)** In text, **a song is a title and a
vibe** — the title does all the work, which is how books handle music.
But that is not the interesting part.

#### ⭐⭐⭐⭐⭐ The real function is ANTI-SILENCE

In a text game **a room where nothing is happening is a DEAD room.**
There is no ambient anything — no hum, no light, no background. Silence
is literal.

> **The jukebox is the room's IDLE CONTENT — what the room says when
> nobody is talking.**

Not a compromise with the medium but **specific to it**: a visual game
gets atmosphere free from its art; we have to write ours, and a jukebox
is **a machine that generates a rotating line of atmosphere with no
author present.**

#### ⭐⭐⭐⭐ And it is an INDIRECT SPEECH ACT

The part that makes it worth coin:

> **A jukebox is how you say something without saying it.**

Putting on a particular track is a **statement** — pointed, deniable,
universally understood. *"Someone put on 'Nobody Asked.'"* Passive
aggression as a game verb, completely bar-authentic, and **a real
communication channel that requires no voice** — a strange thing for a
silent game to have, and a good one.

**Visible and attributed**, per the doctrine: everyone knows who played
it.

#### ⭐⭐⭐ Which is why it is not redundant with the remote

| | Points | Contested by | Costs |
|---|---|---|---|
| **the screen** | **OUTWARD** — shows the world | **seizure** | free |
| **the jukebox** | **INWARD** — shows the person who paid | **a queue** | **coin** |

**The screen tells you about the world; the jukebox tells you about
somebody in the room.**

#### The catalogue

A track is **a title, an attributed author, and a mood** — enough for
prose to render and for people to have opinions about.

**⭐⭐ Which makes songwriting a tiny vocation in the *telling* family
(anchovies).** A song is a small document, the authoring path already
exists, and player-written tracks accumulate in the box the way notes
accumulate on the board.

#### ⚠ Effect-free, deliberately

**No buffs, no mood mechanics, no bonuses.** Music in a real bar does
not buff you either — and since it is playable **from the lounge** via
the aether update, **any effect would leak straight through the door.**

Its one interaction is free and already shipped: **the room can react**
(groans, cheers, someone reaching for the queue immediately after).
That is the reactions substrate doing exactly what it does, and it is
the whole feedback loop the jukebox needs.

#### In play

`jukebox` shows the queue and the box. `play <track>` costs coin and
queues it. The room description gains a line while it is on. On change,
a scene beat fires — *"The jukebox clicks over. Something slow starts
up."* — and people react or do not.

**All prose, all existing machinery: a rotating line of room description
that somebody chose and paid for.**

## Staff, ownership, and infinity (2026-08-01)

**(User: lounge staff are **nameless**, unlike the bar's; table service
is **robots**; **Dave's authority ends at the bar**; and **nobody really
owns the lounge — it is infinite.**)**

### ⭐⭐⭐⭐ "It is infinite" is WHY nobody owns it

**Ownership requires scarcity.** Parcels are ownable because they are
**bounded** — that is what a parcel *is*. The lounge is bounded by
nothing; the Warren buds without limit.

> **The lounge is unownable for the same reason air is — not by decree,
> by construction.**

Which reinforces why it is **Compact territory** rather than anyone's
estate: **not owned → no owner's rules → only the platform's.** The one
place where *"nobody is in charge"* is a fact about the **geometry**,
not a policy.

### ⭐⭐⭐ Namelessness FOLLOWS from infinity

You cannot have Sal in fifty rooms. **Fifty Sals is absurd. Fifty
identical robots is correct.**

> **Infinite space demands impersonal service.** Namelessness is a
> **consequence**, not a style choice.

⚠ **This corrects the pie-swapping "waiter" designed earlier** — an
earlier pass made him a **named** *"one NPC who never goes home."* **He
should be a machine.** The spirit survives: **the robots never go home
because they do not have one.**

**⭐⭐⭐⭐ And the namelessness is what makes DAVE land.** You remember him
**because everything else in the building is a machine** — the
green-room / demo-reel contrast expressed in **staffing** rather than
décor.

### ⭐⭐⭐⭐ "Dave's authority ends at the bar" retro-fits the Bolo story

> **The bartender who handed Bolo the remote had no jurisdiction in the
> lounge.**

**The grant was illegitimate from the start — which is why it
collapsed.** The room reasserted itself over an authority that never
reached it.

That turns *"formalising it destroys it"* from an **anecdote** into a
**structural** claim: **there is no office to grant, because there is no
authority in the room to grant one.**

### ⭐⭐⭐ No authority means no recourse — and INFINITY is the anti-grief mechanism

No bouncer, nobody to appeal to, nobody to complain to. In a **bounded**
room that is a problem. In an **unbounded** one:

> **You can always make another room.**

**Exit at the smallest possible scale** — you cannot vote someone out of
the lounge, but you can always **leave the table**, and the Warren makes
that free. Hirschman again, which is **why the room needs no sheriff.**

*(Rail unchanged: real-conduct harassment is an **account** matter,
handled **meta**, never costumed as a bouncer.)*

### ⭐⭐⭐⭐ And the robots solve a TEXT-GAME problem

Somebody has to say *"the pie changed."* A bare scene message is thin; a
**named** NPC implies a proprietor.

> **The robot is the seam between prose and personhood** — it lets the
> room speak **without implying anyone owns it.**

**The lounge's narrator has a body.** The pie swap, *"another round?"*,
the closing time that never comes — all of it is **the building
talking**, in a **house voice** rather than a person's.

**⭐⭐⭐ Leave them nameless so the regulars can name them.** Players will
anyway — a bar naming its robot is exactly the emergent lore a bar
produces, and it is **free precisely because we did not spend a name on
it.** A little **non-identity texture** is enough: a scuffed one, a
newer one, the one that always takes too long.

## The lost-and-found — and the bin (2026-08-01)

### ⭐⭐⭐⭐ Safe by CONSTRUCTION vs safe by ENFORCEMENT

**(User, correcting an earlier draft that assumed the lounge would
rarely collect anything.)** People **do** drop a lot in the lounge —
because it is a **safe zone by construction.**

Terminus is safe because there are constables, laws and courts —
**contingent** safety that can fail, be corrupted, or be legislated
away. The lounge is safe because **there is nothing there to be unsafe
with.**

> **The lounge's safety is a KERNEL GUARANTEE. The city's is a POLICY
> OUTCOME.**

Same distinction as exit-vs-voice and kernel-vs-lego — and it produces
something valuable:

> **You can feel the difference between guaranteed and provided safety
> by walking through a door.**

Civic pedagogy delivered **without a word**: the city is safe *because
people made it so*, and you know that **because you know what structural
safety feels like.**

**And it explains the behaviour exactly: you sort your bags where
nothing can happen to you.** Gear management, bag-sorting, dumping
trash — what every safe zone gets used for, and it is correct.

### ⭐⭐⭐⭐⭐ "Not LOST — ABANDONED." Two objects, not one

The doctrine already exists in
[sanitation-slate](./sanitation-slate.md): **abandonment is an ACT, not
a property.** So:

| | Volume | Intent | Lifecycle | Role |
|---|---|---|---|---|
| **the lost-and-found** | small | **forgotten** | **persists** | **MEMORIAL** |
| **the bin** | large | **deliberate** | **transient** | **MATERIAL** |

> **Lost is memorial. Abandoned is material.**

One is a **book of traces** from people who did not come back; the other
is **a bin the robots empty.**

### ⭐⭐⭐⭐ The bin is the DECLARATION

You never have to infer intent:

> **Put it in the bin and it is abandoned. Leave it on a table and it is
> lost.**

**Two containers, two meanings, no inference** — how a real room works,
and the cheapest possible implementation of *abandonment is an act*.

### ⭐⭐⭐⭐⭐ The pile feeds the sanitation pipeline

**collect → hold → unclaimed → auction → salvage → materials.**

> **The lounge is the world's biggest junk faucet**, and the scavenger
> economy already exists to consume it — which hands **the entry-level
> vocation a reliable input stream**, solved by the one room everyone
> passes through.

**⚠ With the rule intact: the lounge PRODUCES junk, it does not
DISTRIBUTE it.** The robots take the bins out; **no player picks through
them in the lounge.** Value is realised **outside**, at the yard —
consistent with *spend, never earn*, so **the safe zone never becomes a
farm.**

### The lost half — memorial, and cheap because it is small

Things genuinely forgotten: **reclaim your own, never take another's.**
Which means the box holds only what people **meant to keep** — small by
construction.

⭐⭐⭐⭐⭐ **And that is where the emotional payload lives**: things nobody
returns for **stay**. Somebody who quit has their coat in there.

> **The necropolis is where you are remembered ON PURPOSE. The
> lost-and-found is where you are remembered BY ACCIDENT.**

**Persistence answer — a shelf and a book.** Recent items are **real
objects** on the shelf; the residency sweep **DEMOTES rather than
deletes**, turning an object into a line — *"a grey scarf, left some
weeks ago."* The **memorial lives in the ledger** (bytes), the
**interaction lives on the shelf** (bounded), and the clear-out is
honest rather than lossy: *"the box was emptied, and here is what was in
it."*

*(Which is the [sanitation](./sanitation-slate.md) finding again —
**eviction becomes narrated** — applied to the one container where it is
emotionally appropriate.)*

### Why the prop earns its place

- **⭐⭐⭐ It is outward-pointing.** What people leave tells you what they
  **do** — a hauler's glove, a medic's kit, a strange rock from a delve.
  **A cross-section of the world's vocations, seen through what got
  forgotten.** *The screen shows what is happening out there; the box
  shows who has been in here.*
- **⭐⭐ It generates conversation.** *"What is in the box tonight?"* is a
  real question, and **retrieving something is a self-disclosure** —
  *"oh, that's yours?"* You learn something about a person from what
  they had forgotten they were carrying.
- ⚠ **It is NOT a dead drop.** Do not build message-passing into it. If
  people use it that way informally, fine — the moment it is *designed*
  for it, it stops being a lost-and-found and becomes infrastructure.

### ⭐⭐⭐⭐⭐ And the upstream act that feeds it: GETTING COMFORTABLE

Real bars collect **coats, umbrellas, gloves, scarves** — not things
people carry, **things people take off.** So sitting down should invite
you to **set your pack down and shed your gear** (posture + slots, both
shipped), which makes forgetting **natural rather than deliberate.**

**⭐⭐ And the affordance is good on its own merits:**

> **The lounge is where you unbuckle.**

Everywhere else you are kitted up; here you take your coat off — a
**social signal** (*I am staying a while*) and a real piece of
characterisation for the room, independent of the box.

## The pizza end to end — ordering, the kitchen, the name (2026-08-01)

The pizza had been a metaphor for two sessions and never a mechanism.
This section is the mechanism.

### ⭐⭐⭐⭐ The pie is SERVED; the slice is ORDERED

Nobody orders the table's pie. It is the room's portrait — it is simply
*there*, and it changes when the room changes. A slice that **isn't**
the pie, you have to ask for.

Which turns the consensus/dissent split from décor into **friction**:

> **Agreement is free. Dissent requires an order.**

Taking a slice off the communal pie is eating. Getting your own
anchovies is **an act, performed in front of people, that they can see
you performed** — which is what taking a position costs everywhere else
in the game, priced honestly at lunch scale.

And the corollary:

> **⭐⭐⭐ You cannot order the pie. You order for yourself, and the pie
> is what happens.**

Aggregation stated as an affordance. **You vote; you do not pick the
outcome.**

### ⭐⭐⭐⭐ There is no preferences panel — the ORDER *is* the preference

An earlier note said the order console should *"feel like ordering, not
like filling in a form."* The stronger version: **there is no form to
disguise.**

> **Same data as `settings social.flavor`, but the diegetic surface is
> the only one anybody ever needs to touch.**

`order` is already the established menu affordance (a menu confers
`menu` and `order`, nothing else — see the affordance doctrine), and it
is diegetic, so it earns **standalone-verb** status under the
*prefer-subcommands* rule.

**⭐⭐ The same verb spans both rooms, and the only difference is the
bill** — `order a beer` costs six bucks at the counter, `order peppers`
costs nothing on the floor. The room boundary made tactile with no
explanatory line anywhere.

### ⭐⭐⭐⭐⭐ Ordering produces a STANDING ORDER — "the usual"

An order does not produce a slice. It produces **a standing order**:
*"I'm a peppers person."* The machine remembers.

> **"The usual" is the belonging mechanic.**

The moment a robot brings it without being asked is the moment you are a
**regular** — the most bar-authentic beat available, costing **one
persisted field**. For a room whose entire job is receiving people who
do not belong yet, that is the highest-leverage sentence in the design.

It also anchors the topping's *aspiration* property: changing your usual
is **a visible act with an audience**, which is what makes *"you dropped
mushrooms?"* possible at all.

### ⭐⭐⭐⭐⭐ The kitchen is not a room you enter — it is a VIEW

**(User: hesitant to add lounge geography; and did not want it staffed
by players.)** The fix is a real restaurant pattern — **the open
kitchen.** You do not go in. You sit at the counter and watch it work.

> **The kitchen isn't a place you go. It's what the bar looks at.**

**Zero new navigable geography** — nothing to learn, no map, no room to
decide whether to visit. The bar gains a **direction**, not a
destination. And the counter finally has a reason to face something.

#### ⭐⭐⭐⭐ Automation makes it VISIBLE, not invisible

The fear inverts once you notice the kitchen solves the jukebox's
problem:

> **The kitchen is the bar's IDLE CONTENT — what the room says when
> nobody is talking.**

Machines **move**: an oven door, a robot loading the pass, a tray,
something scraped into the bin. **A staffed kitchen would be the quiet
one** — one NPC, occasionally doing a thing. An automated one is a
perpetual motion generator with no author present, which is exactly the
anti-silence job the jukebox was recruited for, and it runs for free.

> **A player-staffed kitchen would have been the invisible one**, because
> it would be empty most nights.

#### ⭐⭐⭐ And automation keeps the boundary already drawn

Employment is **game**. A roster behind the free lunch imports the game
into the room that exists to receive people who have not started
playing.

> **The free side is machine-made. The paid side is where labor could
> go, later.**

Which **retires the earlier commodity-floor/quality-upside guard
entirely** — the lounge is not *protected* from depending on player
cooks, it is **incapable** of it. **Dependency-free by construction** —
the third member of the set, after **unownable by construction** and
**safe by construction.**

#### ⭐⭐⭐ One kitchen, infinite lounge — which explains the robots

Infinite rooms cannot each have a kitchen; they can all be served from
**one**.

> **The lounge doesn't have a kitchen. It has a delivery.**

So the robots are **not waiters** (a waiter implies a proprietor, the
thing namelessness exists to avoid) — they are **the last mile**. A
distribution network from a single production site to unbounded
destinations: **the depot and the freight chain at toy scale**, sitting
in the lobby, teaching its own shape before the player has seen a road.

**Dave's authority ends at the bar — but his SUPPLY does not**, and that
asymmetry is interesting rather than contradictory.

#### ⭐⭐ The pass is the boundary object

Kitchen → **pass** → robot → lounge. Literally a counter:

> **The pass is where money stops.**

Upstream: priced labor, ingredients, shifts, wages. Downstream: free.
**You can stand in the bar and watch the exact seam where the economy
ends.**

#### ⭐⭐⭐⭐⭐ Who pays — "the pizza line"

The kitchen makes it and **the Compact buys it**: a standing
appropriation.

> **Free at the point of use is not free. Somebody is paid.**

The lobby's free lunch goes **on the books** — a line item in the fiscal
cycle, the smallest and safest object a legislature can fight about, and
comic enough that a first-week player follows the whole argument. *The
pizza line.*

**Because the kitchen is automated, the line is SUPPLIES AND
MAINTENANCE, not wages** — which upgrades the austerity consequence from
a threat into a joke:

> **⭐⭐ Cut the line and the oven doesn't stop. It gets worse.**

**Degradation, not outage.** The lobby never goes dark; the pie just
gets sadder, visibly. Reversible, funny, hurts nobody — **the best
possible first budget fight.**

#### Scope: three objects, a view, and a door we don't open

An automated kitchen does not need most of what a staffed one would.

| Built | |
|---|---|
| **the oven** | real fire/thermal; visible; **degrades** |
| **the pass** | the boundary object |
| **the bin** | feeds sanitation; robots haul it out |
| **the view** | ambient lines from the bar |

| Deferred behind the door | |
|---|---|
| walk-in, prep line, roster, recipes, grades | **the door is the seam** — if player cooks ever happen, the geography already exists |

The *"smallest room touching the most systems"* claim becomes a
**future** claim rather than a scope hole today.

**What you see from a barstool:**

> *Behind the pass, the oven door bangs open and something goes in on a
> long paddle.*
> *A robot stacks three boxes at the pass, considers them, and restacks
> them.*
> *Something is scraped into the bin. The bin is getting full.*

All prose on shipped machinery — and the last line is a sanitation hook
that pays off when a robot hauls it out.

### ⭐⭐⭐ The name: COMPACT STYLE

**Pizza styles are named for PLACES** — Neapolitan, Detroit, Chicago,
New York, Sicilian. Never for ingredients; for **where the people are.**
So name it for the polity, not the recipe: **a Compact-style pie.**

Three levels at once, pointing at none of them:

- **plain food language** — compact = dense, close-packed; reads as a
  style descriptor to anyone not paying attention;
- **the place** — the lounge is Compact territory, which is exactly what
  every real style name does;
- ⭐ **a compact is a PACT** — the pie is an agreement among the people
  at the table.

It also carries a faint **institutional-cafeteria** whiff, which is
**honest**: it is a subsidised free lunch in the lobby of a government
building. Leaning in is funnier and truer than hiding it.

*Runner-up: **Assembly style** — assembled from parts, and a
deliberative body. Same double meaning, weaker place-logic.*

### End to end

1. **First arrival.** You sit. A pie is already on the table — the
   room's aggregate. You ordered nothing and owe nothing. *(Physics
   available, never demanded.)*
2. **You eat, or don't.** `take a slice` from the communal pie. Real
   food, real metabolism. **Zero friction, zero statement.**
3. **You order.** `order peppers`. That writes your standing order —
   which **is** your flavor tag-set, which **is** the Warren's
   matchmaking input. **One act, three jobs.**
4. **A robot brings your slice.** You are now visibly holding something
   that is not what is in the middle of the table. **Wordless dissent,
   no mechanics.**
5. **Composition changes.** Someone joins or leaves; the aggregate
   recomputes (debounced) over the occupants' standing orders.
6. **The swap is an event.** A robot takes the old pie, brings the new
   one, says so. The room learns *the composition changed* with **no UI
   notification**, and gets something to remark on.
7. **Upstream, invisibly.** The order reached the kitchen. The Compact
   was billed. The bin got the crusts. **None of it is visible from the
   lounge** — and that it is *real* rather than faked is what makes the
   lounge's freeness mean something when you finally see the other side
   of the pass.
8. **Next time.** The robot brings your usual.

### Open questions (for requirements)

1. **How many usuals?** *Leans: the standing order is your ≤3 tags and a
   slice is drawn from them* — variation without a new field.
2. **Debounce window on the swap.** Too fast and a busy room is nothing
   but pie swaps; too slow and it stops reading as responsive. *Leans:
   real-time, a few minutes, plus a floor on room population.*
3. **The pie with one occupant** = your own order. Slightly sad, exactly
   correct.
4. **Is the kitchen queue real?** *Leans: **abstract for the lounge,
   real for the bar*** — bar orders queue at the pass and can back up
   under load (which is what makes a shift feel like work); lounge
   orders cannot, because the lobby is not allowed to have a wait.
5. **Is the pass a real containment seam** robots traverse, or an
   abstraction with a narrated face? *Leans **real*** — it is three feet
   of counter, it makes the robots' route honest, and it is the one
   place a player could ever reach across.
6. **The pizza line's actual number** — small, specific, and **findable
   in the budget**. The joke only works if you can look it up.

## The menu — the mapping is PUBLISHED (2026-08-01)

⚠ **This REVERSES the earlier "keep the mapping unpublished" rule**, and
supersedes a food-poetry menu draft that was tried and failed.

### ⚠ The failed draft, and the measurable test it failed

A menu written in **pure food connotation** (*"Peppers — sharp, cuts
through"*; *"Mushrooms — everything on it came out of the ground"*) was
**too cute**. *(User: "I can't even tell I'm picking a trait, I feel
like it just means I like mushrooms… I can't even remember based on what
you wrote.")*

> **The test is MEMORABILITY, and it failed it.**

### ⭐⭐⭐⭐ The error: the unpublished rule was applied to the wrong layer

The original rejection was of **personality** dispositions
("comfortable", "opinionated"). Disciplines are not the same kind of
thing:

> **A personality mapping is a SECRET worth keeping. A discipline
> mapping is a VOCABULARY worth teaching.**

Hiding a discipline label creates **no mystery** — it creates exactly
the **vocabulary test** that killed the political palette. So say it
plainly.

**And the interesting unknown survives full disclosure:**

> ⭐ **The mystery belongs in the PERSON, not in the legend.**

*"What do peppers mean?"* is a **worse** question than *"why did **you**
order peppers?"* — and the second only works if the first has an answer.

### ⭐⭐ Real pizzas are already named after trades

**Marinara** is the sailor's. **Boscaiola** is the woodcutter's. **Pizza
del Contadino** is the farmer's. Naming a pie for a vocation is the most
food-authentic move available — **there is nothing to smuggle.** And a
menu listing what is on the pie is just a menu.

> **The menu lists the ingredients. The ingredients are the
> disciplines.**

### The menu

| | | *on it* |
|---|---|---|
| **Pepperoni** | *the guard's* | fighting, escort, protection |
| **Sausage** | *the maker's* | every craft and trade — made, not grown |
| **Mushrooms** | *the grower's* | farming, ranching, fishing, mining |
| **Olives** | *the trader's* | freight, markets, brokerage |
| **Peppers** | *the scholar's* | scholarship, investigation, appraisal, navigation |
| **Extra cheese** | *the healer's* | medicine, teaching, hosting, care |
| **Anchovies** | *the crier's* | press, performance, streaming |
| **Pineapple** | *the house special* | — |

**Three parts, three jobs:**

| Part | Job |
|---|---|
| **the topping** | what is **visible on your slice** across the room |
| **the trade** | the **memory hook** |
| **the ingredient list** | the **actual answer** |

**Nothing cute, nothing hidden.**

The one-line food flavor may still ride along on the menu object —
*"sharp, cuts through"* under peppers — but as **garnish beneath a
label, never as the label.** That inversion was the whole failure.

### Two notes on the roster

- ⚠ **"The healer's" narrows *tending*** — it drops teaching and
  hosting, half that family. **"The keeper's"** covers all of it but
  reads vaguer. *Leans healer's for legibility, with the ingredient list
  doing the correcting.*
- **Pineapple keeps no trade, deliberately.** *"The house special"* with
  an **empty ingredient list** *is* the joke — the only line on the menu
  allowed to be coy, because **refusing the premise is its actual
  meaning.**

### The three channels, none of them a lookup table

| Channel | Serves |
|---|---|
| **the menu** — states it | the newcomer, in their first minute |
| **the room** — you ask | the **mentorship-matchmaking** function, working as designed |
| **the correlation** — you watch | the regular: the pie is mushrooms, you see who is sitting there, and the mapping **induces itself** |

⭐ The third is the good one: **nobody teaches it and everybody learns
it.**

## Parlor games — the table, not the game (2026-08-01)

**(User: the old MUD had stratego, chess, checkers, C4, poker, Set,
C-lo, all in LPC. The internet has moved past that — there are places
where the game is the whole draw — but the lounge is a space where
people would want to play them, and the client could support them
specially.)**

### ⭐⭐⭐⭐ The honest frame: we are rebuilding the TABLE, not the game

Chess.com has better chess and always will. *"Come play chess here"*
loses.

> **The internet gave us better games and WORSE TABLES.**

Online chess is a sealed 1:1 room with a clock. It killed the
kibitzers, the winner-stays-on queue, the person who watches four moves
and says nothing, the beginner who gets taught. **The game survived the
move online; the table did not.**

> **⭐⭐⭐⭐ In a text game a board is a SHARED OBJECT IN A ROOM, not a
> private session.**

Everyone sees it, anyone can comment, the winner stays on. **A
structural advantage over every site that does the game better** — and
the only defensible reason to build any of it.

### The category check — and a refinement to the pizza's rule

The lounge rule was never *no games*, it was *no **the**-game*:

> **A parlor game RESETS. The game does not.**

A reusable criterion: **anything that returns to zero is a toy; anything
that accumulates is the game.**

It needs one honest refinement to *"a minigame with no winner is a toy"*:

> ⭐⭐ **The pizza has no winner because it is the ROOM's object. A chess
> game has a winner because it is a TABLE's object.**

**Room-scale things must never rank the room. Table-scale things may
have a winner, because losing costs nothing once you stand up.** The
pizza doctrine holds; it was never about winners in general.

### ⭐⭐ Money splits them across the door — the existing seam, no new doctrine

Poker is the problem case: the one parlor game where **the game IS the
gambling**, and it moves money between players — which would make the
lounge a place you can **earn**.

> **Games that cost nothing live in the lounge. Games with money in them
> live at the bar.**

Chess and cards on the floor; poker and dice at the counter. Same rule
as the jukebox and the pizza — **and it is how real bars are laid out**,
the pool table and the card game near the bar for exactly this reason.

### Which ones, honestly — attention × inclusion

| | Attention | Players | |
|---|---|---|---|
| **Poker** | medium | 4–8 | ⭐ **the flagship** |
| **Set** | bursty | any | ⭐ no turn order, table-scale, 30-second rounds |
| **Cee-lo / dice** | ~none | any | decoration on a conversation — **bar side** |
| **Checkers / C4** | low | 2 | fast, forgiving, nobody minds losing |
| **Chess** | **total** | 2 | ⚠ two people go silent for forty minutes |
| **Stratego** | high, long | 2 | ⚠ worst fit — a 45-minute hidden-information war |

⚠ **Chess is a trap for a social room** — which is why bars have darts
and pool instead. Build it for completeness, **never as the flagship.**

> ⭐⭐⭐⭐ **Poker is the flagship because it is the one game where being
> in a room with people is a competitive ADVANTAGE rather than
> decoration.**

On a poker site you play six tables and speak to nobody. At our table
**the talk IS the mechanic** — reading people, needling, the deliberate
pause. **The one game whose substance is exactly what the websites threw
away.**

**Set** is the sleeper: no turns, any number of players, short enough to
**play badly while talking** — the real test.

### The architecture costs almost nothing new

| Piece | What it is |
|---|---|
| **the board / the deck** | a **Stuff** on a table, holding state |
| **the rules** | ⭐⭐⭐ **a BRAIN** — path-resolved stateless module: state + move → state. Existing module category, HMR-able, **zero invention** |
| **the card** | a **cockpit layout** — already server-authoritative |

> ⭐⭐ **The card is a COMMAND COMPOSER, not an alternate interface.**

Clicking a square previews `move e4`, per the standing rule — which
keeps it playable in plain text, keeps **spectating** free, and makes a
rich client **convenience, never capability** (the jukebox-upgrade
boundary again).

### ⭐⭐⭐ Carryable is what makes this worth more than the lounge

A deck, a travel set. Then it is not lounge content at all — it is
**DOWNTIME content**, and downtime is everywhere:

- the **freight Journey**, where passengers are explicitly unengaged for
  a whole leg;
- a **night watch**;
- a **prison** — where it is not a diversion, it is the entire culture;
- a hospital bed, a stakeout, a wait at the depot.

> **The lounge is where it is most natural and least necessary.**

It lands in the crafting economy free: a chess set is a **woodworker's
object with a real grade** — a fine set versus a scratched one — exactly
what a maker wants to make. **Giftable, losable to the lost-and-found,
salvageable.**

### ⭐⭐⭐ Ship the deck first — and do NOT referee it

The highest-leverage single object here is **an ordinary deck that only
deals, holds hands, and shows a table.** No rules engine.

> **An unrefereed deck supports every card game the players already
> know, and beats any rules engine on COVERAGE.**

The LPC-era insight inverted: **you do not need to code poker to have
poker** if you have cards and people who know the rules. Then code only
the games whose **bookkeeping is genuinely annoying** — pot management,
scoring — because that is the only part a human table wants automated.

**One deck, one board, and the brain seam.** Everything after is
content, and **writing checkers is a genuinely good first project for a
new author** — better than a room, because the rules are self-checking.

### The pedagogy hook, and the rail on it

⭐ **A parlor game is the cheapest character-revealing device ever
invented** — gracious in defeat, gloating, patient with a beginner,
willing to teach, all legible in ten minutes.

⚠ **But it needs NO new wiring, and that is the point.** Renown is
reception from others; a good opponent gets reacted to, and that is
already the whole loop.

> **The people notice; the system does not.** Scoring chess would make
> the lounge consequential — the one failure mode the room exists to
> avoid.

### Open questions (for requirements)

1. **Does a game hold you?** *Leans **no engagement slot*** — you can
   walk away mid-game, which is what makes it a toy. Abandonment
   resolves on a timeout.
2. **Winner-stays-on as a real queue** on the attendant substrate?
   Probably right at a pool table, overkill everywhere else.
3. **Does a deck persist its shuffle across a reboot**, or is an
   interrupted game a lost game? *Leans persist* — a `holder_snapshots`
   shape.
4. **Poker chips**: real money through the ledger, or escrow-backed
   chips? *Leans **real money*** — the whole reason poker works is that
   it is real.

**Not scoped, named:** ⭐ **house games at the bar are a BUSINESS.** Dave
taking a rake is the smallest possible casino, and **the first content
that makes the bar money without selling a drink.**

## The deck in a CLI — how cards actually work in text (2026-08-01)

### ⭐⭐⭐ Text is the NATIVE format, not a handicap

> **Every game worth building already has a text notation invented by its
> own players.**

Chess algebraic notation was built for **the telegraph**. Cards have had
`7♣`/`7c` for a century; poker has *"raise 20"*; Go has coordinates;
bridge has a bidding language. **We invent no notation** — we adopt the
one players already type at each other. *A graphical client is the thing
that has to translate; we do not.*

### ⭐⭐⭐ The one big trick: THE NAMESPACE IS YOUR HAND, NOT THE DECK

Naming one of 52 objects is miserable. Naming one of five is trivial.

```
> hand
  ♠A   ♠7   ♦J   ♣3   ♥9
   1    2    3    4    5

> play j
You lay the jack of diamonds face up.
```

`j` works **because you only hold one jack.** So do `play 3`
(positional), `play jd`, and `play the jack of diamonds` — the tokenizer
takes all of them, and **ambiguity only ever resolves against five
cards, not fifty-two.**

> **You already talk this way at a table. Nobody says "the jack of
> diamonds" when they are holding one jack.**

Suit-first, rank-first, glyph or letter — a small alias table that
**makes the interface disappear.**

### ⭐⭐⭐ Hidden information is ALREADY SHIPPED

> **A card is a two-faced object, and we already ship two-faced
> objects.**

To the holder, *the seven of clubs*; to everyone else, *a card, face
down*. **Per-viewer description** — the same machinery as disguise,
concealment and belief. **Face-up is a state flip, not a special case**,
so the room sees `??` where you see `♠A` with **no bespoke privacy code
anywhere.**

### The object model — the deck is DATA, a dealt card is a THING

52 Stuff instances per deck is bloat. **Lazy minting:**

| Where | What it is |
|---|---|
| **in the deck** | an entry in an ordered list |
| **in a hand / on the table / on the floor** | a **real Stuff** |

Peak object count is **cards in play**, not 52 per deck — and it buys
something good for free:

> ⭐ **A card lost under a table is a real object.** Findable, and **the
> deck knows it is short.**

*"This deck is missing the ace of spades"* is a better small story than
anything we would design on purpose, and it **makes a complete deck
valuable**, which is what a crafted set should be.

### The display, and the spam rule

Eight players acting every few seconds floods a scrollback.

> ⭐ **Your hand prints when YOU change it. The table prints when ANYONE
> changes it.**

```
Table   ♣Q Rhea    ♦J you    ♥4 Marc    ?? Tomas
Deck    31 left                              Pot 40
```

**`hand` is a LOOK, not a new verb** (`look at my hand` is the same
thing) — which keeps it out of the verb budget. Suits render as glyphs
**coloured by suit through MML** (free styling in the shipped renderer),
degrading to `c d h s` on a plain terminal. **The card pins the same two
blocks so they stop scrolling away — the same content, not more of it.**

### Verbs: four diegetic, the rest under a dispatch

**`deal` · `draw` · `play` · `fold`** — you say these out loud at a real
table, so they earn standalone status. Administration goes under the
object: `deck shuffle` / `gather` / `count` / `deal 5`.

### ⭐⭐⭐ `show <card> to <player>` — the ACT is public, the CONTENT is private

```
You show Rhea the ace of spades.
    (Marc and Tomas see: You show Rhea a card.)
```

> **What you did is visible. What you showed is not.**

**Social information leakage as a first-class action** — free in the
perception model, and something a card website **structurally cannot
do.** The seed of every table dynamic worth having: signalling,
needling, the deliberate half-reveal.

### ⭐⭐⭐⭐ Cheating is the STEALTH SUBSYSTEM applied to a table

Palming, peeking at the deck, dealing off the bottom = **hidden actions
with an observer check**, which is shipped (`HidingMixin`, the awareness
Discipline, the perception seam). Getting caught is a **social event with
an accountability record.**

**A card website cannot have cheating. We can** — and it is the most
bar-authentic content imaginable.

⚠ **Same door as everything else**: cheating at a free lounge game is
just **griefing**; with money on it at the bar it is **content**, with
consequences up to being thrown out.

> **Cheating is only interesting where there is money — which is the
> door money already went through.**

### Persistence and the async property

⭐ **A board in a room is naturally ASYNCHRONOUS — the game waits because
the furniture waits.** A three-day chess game is *easier* here than on a
site with a timeout.

⚠ **Except in the lounge**, where the Warren reaps empty rooms — another
argument for **carryable**: you pick your set up. **A long game belongs
on furniture that belongs to someone** (the bar, your dorm, a parcel),
and that is a fine thing for the lounge to be bad at.

### Open questions (for requirements)

1. **Does a dealt card carry deck provenance?** *Leans yes* — it makes a
   missing card knowable and is the hook for **marked cards** later.
2. **Is a hand a container or a slot claim?** *Leans **container with a
   viewer-gated description*** — you should be able to put your cards
   *down*, and a slot would fight that.
3. **`deal` with no game named** — *leans: deal what was last dealt,
   default five.* **The deck remembers the table's habit** — a small
   *"the usual"* echo.
4. **Do face-down cards on the table need positions**, or is a pile
   enough? Depends which refereed games get built; **a pile covers the
   unrefereed deck.**


## Screens: access vs attention-in-common (2026-08-02)

**(User: the lounge screens are the interesting case — a **shared**
experience, and whoever holds the remote *"is actually determining
livestream content for other people (check out my favorite fallout
player)."* But: *"I wouldn't extend it to every screen in the game or all
livestreaming — you shouldn't need a screen to watch a stream."*)**

Settles cleanly against the interface/fiction split (see
[physiology-slate](./physiology-slate.md) § the three tiers — **streams
are INTERFACE, never gated by anything in-world**):

> ⭐⭐⭐⭐ **The screen does not grant ACCESS. It grants ATTENTION IN
> COMMON.**

You can always watch anything, alone, anywhere. What a screen adds is the
one thing you cannot get alone: **other people watching it with you.**

### ⭐⭐⭐ Which makes the remote's power exact

> **The remote does not control what you CAN watch. It controls what
> everyone is watching TOGETHER.**

The Bolo dynamic survives intact and **costs nobody anything** — and the
counter is the most bar-authentic move there is:

> ⭐ **Looking at your own feed is the honest veto.** Non-confrontational,
> always available, needs no permission — literally what people do when
> the TV is on something they do not care about. **Nobody is ever trapped
> watching your Fallout guy.**

This **deepens** *the remote pays nothing* rather than straining it: the
remote's power is purely **the power to make a shared moment** — socially
real, mechanically zero, and now provably **non-coercive**.

### ⭐⭐⭐⭐ The shared screen is DISCOVERY for the streaming vertical

*"Check out my favorite fallout player"* is **recommendation**, and
discovery is the hard problem in every streaming ecosystem.

> **The room's screen is organic discovery** — a player promoting a
> streamer to an audience that did not go looking, with **the credibility
> of a person rather than an ad.**

Same shape as the already-designed *a commercial is a PLAYER-AUTHORED
INVITATION*. **The lounge screen serves the marketing thesis without
BEING marketing**, and it is earned rather than bought.

### The placement rule

> **Screens go where togetherness is the point.** Not everywhere.

The lounge, a bar, a plaza, a stadium — rooms whose job is shared
experience. Screens elsewhere stay **in-world channels** (the Terminus
split already made), and **an individual's feed needs no screen
anywhere, ever.**

⭐ **Do not gold-plate it: shared means SAME CHANNEL, not SAME FRAME.**
Every client loads the same stream; the "together" is **social knowledge,
not frame sync.** No sync layer.
