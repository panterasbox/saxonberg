# Lounge slate (working doc)

> **Status: design set; v1 is the social-elastic lounge + Dave's Bar
> shell.** The universal login landing — a **social-elastic
> MultiLocation** that buds rooms as people arrive and merges them as
> people leave, **seating** newcomers by play-style "flavor," with **Dave's
> Bar** as the fixed anti-lounge counterpoint to the north. The lounge is
> the v1 consumer of the [MultiLocation substrate](../builds/multilocation-slate.md);
> almost everything else it needs it *consumes* from already-slated
> systems.

Working slate for the **lounge** — where every player materializes on
login, and the game's social lubricant. It's a `LoungeWarren` (a
[MultiLocation](../builds/multilocation-slate.md) `Warren`) rooted at a persistent
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
   [vitals](../builds/vitals-slate.md) consumables; the bar authors only the menu.

6. **Dave is a blank slate.** Deliberately under-characterized so players
   project onto him and his personality *accretes* — dovetailing
   npc-dialogue's emergent/LLM trajectory. Homage to EotL's Dave, not a
   remaster (the old *Moonlighting* bit becomes an easter egg).

See also:

- [docs/slates/multilocation-slate.md](../builds/multilocation-slate.md) — **the
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
- [docs/slates/npc-dialogue-slate.md](../builds/npc-dialogue-slate.md) — **Dave.**
  He's the slate's own worked example (the barkeep). v1 Dave is minimal;
  full conversational Dave rides its Wave 2 (scripted) / Wave 3 (emergent).
- [docs/slates/vitals-slate.md](../builds/vitals-slate.md) — **drinks.** A drink is
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

The lounge is a [MultiLocation](../builds/multilocation-slate.md): a persistent
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

**Drinks are [vitals](../builds/vitals-slate.md) consumables.** The bar authors
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
[MultiLocation substrate](../builds/multilocation-slate.md) (`route` dual-objective
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
  budding / merging / recall machinery → [multilocation-slate.md](../builds/multilocation-slate.md).
  The lounge is its consumer.
- **Drink effects** (intoxication, hydration, the consumable delivery) →
  [vitals-slate.md](../builds/vitals-slate.md). The bar authors only the menu.
- **The fast-travel network** (terminals, routes, scan-to-register, the
  credential) → [fast-travel-slate.md](../tails/fast-travel-slate.md); the lounge
  merely hosts the first terminal.
- **NPC dialogue internals** (responder seam, trees, scripted matching,
  the LLM front-end) → [npc-dialogue-slate.md](../builds/npc-dialogue-slate.md);
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

- **`LoungeWarren`** (a [MultiLocation](../builds/multilocation-slate.md)
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
