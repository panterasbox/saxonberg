# Dave's Bar slate (working doc) — the integrating vertical

> **Status: PARTIAL** — the near-term scope shipped (shift work, wages,
> `order`, the supply chain, the bar fight) →
> [employment.md](../../subsystems/employment.md) ·
> [crafting.md](../../subsystems/crafting.md)
> **Left:** the succession arc (Augie recognizes the heir; the house
> tablet is the clipboard) · tabs (`TabMixin` was RETIRED — zero credit
> until designed for real) + customer records (regular; 86'd exists only
> for the armed-patron rule) · the NPC task repertoire + the shift-change
> ritual (till · receipts · reconcile · hand off · deposit) · the cast's
> off-shift presence + the trait compatibility→regard mechanism · corpo
> faction-approval standing · the Scene composer's crowd aggregation for
> a full room · the congener / hangover tuning (appraisal shipped as the
> palate) · glass theft remembered + the glassware leak · the dartboard
> · the player distillery that retires Veshko's floor · numeric tuning
> **Size:** a build

Contributing slates (Dave's Bar is where they meet):
[crafting](./crafting-slate.md) (the venue, recipes, tools, craft-resolve) ·
[advancement](./advancement-slate.md) (skills as a leveled profession via
the skill seam) · [economy](./economy-slate.md) (the currency slice, the
reserve, employment, the NPC floor) · [activity](../../subsystems/activity.md)
(engaged activity — built, never used; this is its first consumer) ·
[cooperative](./cooperative-slate.md) (the reserve as central bank;
contribution → standing) · [lounge](./lounge-slate.md) (the bar is north of
the spawn lounge).

Substrate it leans on (largely shipped): [bulk](../../subsystems/bulk.md) /
[stacks](../../subsystems/stacks.md) / Material (the stock), location (the
venue), [time](../../subsystems/time.md) (the shift clock),
[belief](../../subsystems/belief.md) (recognition + the regard realm),
[metabolism](../../subsystems/metabolism.md) (the drink's consumer),
[reserve](../../subsystems/reserve.md).

---

## Why Dave's Bar — the integrating vehicle

Most starting points exercise two or three systems; Dave's Bar lights up
**nine**. It's the cheapest way to prove the whole stack interlocks, and —
because it's a *bar* — it doubles as the new player's on-ramp: it turns
"logged in, now what" into "I have a place, people who know me, and a thread
to pull." The first complete economic loop (matter in → transformed →
sold → consumed) and the first social home both live here.

## The experience

**Arrival.** From the spawn lounge — liminal, a waiting room — there's a
north exit, not screaming for attention. You go north and walk into a room
*with a pulse*: a place that was mid-conversation before you opened the
door. Text does the work (warmth, noise, the smell of it). The contrast is
the point — the lounge is *waiting*, the bar is *living*.

**"Now what" — nothing is demanded of you.** No quest marker. Sit, watch,
order (first one's on the house), eavesdrop, talk to whoever's next to you.
The bar's first gift is *permission to just be there*. It's a **third
place**, and the hook is that if you come back, it starts to remember you.

**Only the staff are NPCs; the patrons are players.** In Dave's Bar the
*only* NPCs are the ones who work there (Dave + the four bartenders) — there
are **no NPC regulars.** NPC regulars would be *fake community*, a
simulation of the very thing the bar exists to cultivate (and the
motivation lens's manipulative-attachment trap). So the NPCs **host**; they
are not surrogate friends. The deep relatedness is **player↔player**; the
staff are the stage, the hearth, the welcomers, and the cross-session
*memory* ("the bar remembers you" = the staff recognizing you as the
player-faces around you change). The payoff: **the NPC staff exist so the
players can leave** — a permanently-tended bar frees the player-community to
have an off-bar life (the Saturday crew is *players*) and come and go
without the place dying; the NPCs hold the hearth so the players can roam.
(Other venues may differ; this is Dave's, the flagship social hub.)

**The bar does not revolve around the player.** This is the load-bearing
stance, and it's the opposite of theme-park NPCs. The cast has a full
relationship web *among themselves* that runs whether or not anyone's
watching; the player starts **outside** it and earns first *visibility*,
then *a place in it*. **Presence buys legibility** — a newcomer sees a bar,
a barfly sees the whole social world. Discovery is never exposition: the
cold-or-warm handoff, who covers whose shift, who Dave calls into the back,
a glance, a silence. *Wasting time on the stool* is the unlock, and it's
the same loop that builds belonging — so discovery and relatedness are one
mechanic.

**The arc:** stranger → regular (recognized — "the usual?", a nickname,
your stool) → family (you drink here off-shift too) → *you pick up a piece
of the load* (see leadership, below). The two diegetic signals of where you
stand — off-shift presence and the inventory clipboard — are both *earned
by showing up and carrying weight*, never granted.

## The room — the anti-lounge

> Shipped: the fixed singleton `Bar` one exit north of the lounge host — the anti-lounge ([location.md](../../subsystems/location.md)); Dave's office one cell north behind a concealed exit that `search` discovers ([concealment.md](../../subsystems/concealment.md)).

How the room is modeled (all shipped substrate):

- **Amusements** — a dartboard in the corner (kept *in* the main bar so its
  energy stays in the buzz), a jukebox, a TV (the broadcast tie-in) — interactive
  `Stuff` affording an **activity**; v1 flavor, interactivity deferred.

## The cast & the social physics

> *Superseded by content:* `agent/dave.yaml` authors Dave (proprietor, a `Crafter`, the `enforces` brain); the office is a hidden exit `search` reveals, not a regard-gated door — the earned-regard sanctum is unbuilt.

**The three behind the bar — three souls by time of day.** 8-hour shifts on
the game clock mean *which bartender you meet depends on when you live in
the game*; the night-owl and the lunch-breaker drink in different bars.
Distinct personalities, one warm family (names are placeholders):

**Augie — the Veteran (weekend cover; the 4th).** Semi-retired; covers
**weekends**, so weekends *taste* different (slower, storied, the old
guard). *Patient, Wry, Generous, Storyteller.* Dave's peer and old friend —
one of the few who walks into the back office without knocking. His
structural job: a 4th bartender gives the core three **days off**, so on a
given weekday one of them is at the end of the rail *off-shift, as a patron*
(the warmth tell), and it adds **day-of-week** texture on top of
time-of-day. But his thematic job is bigger — see leadership below: **Augie
used to do inventory.** He's the link *before* Mara, living proof that the
clipboard passes by continuity, and the **keeper of the succession** who
recognizes the next person to pick it up. He's also the **narrative
reward** of becoming a regular — the bar's living history, told only to
someone who's shown they love the place.

**The warmth is the design.** The best bars run on genuine affection — the
tell is that **the bartenders drink there off-shift** (where else would they
go?). That off-shift presence is a *readable signal* of the bar's health,
emergent from the sim (NPCs with schedules + real regard *choosing* to be
there), not a label. Friction, where it exists, is the gentle kind families
have (Remy razzes Sloane; Sloane is the only one who can't help adoring
him), never feuds.

**CK3-style traits — prototyped here.** Traits as opposed pairs that drive
**behavior** (the three write themselves) and **relationships**: compatible
traits warm people to each other and to you, feeding the **shipped regard
realm** — pointed NPC↔NPC, it *is* "how they feel about each other when no
one's around." Acting against your nature costs you (stress). A small
recurring cast in a contained social room is exactly where personality
shows — so the bar is the petri dish for the whole trait system before it
touches the wider world. **Authored arcs on an emergent sea**: the daily
frictions are generated; a spine of hand-written arcs (succession, below)
gives it story.

**Leadership = the inventory clipboard — the governance thesis at bar
scale.** Leadership isn't seized or appointed; it's *assumed* by whoever
shoulders the unglamorous load and *recognized* by everyone orienting to
them. Of a half-dozen bartenders, only one does inventory — that **is** her
leadership. When she moves on, whoever next picks up the clipboard inherits
the standing, by continuity, no contest. This is the cooperative's entire
theory of legitimate authority — *no-number-as-authority, conduct →
reputation, the-one-who-does-the-work-holds-the-standing* — in a single
human gesture, and it'll feel like a bar, not a civics lesson. **The
clipboard is the literal token of the role**, and the player's deepest
"drawn-in" is the day they start counting bottles nobody asked them to count
and people begin to look to them. And the clipboard has a **past**: Dave's
era → Augie → Mara → (the player?) — the lineage makes leadership-by-
continuity a *tradition*, a wheel that turns, not a one-off. Augie, having
handed it off before, is the one who *recognizes* the next heir and hands
them the weight of it — succession made witnessed and personal, not a system
event.

## The two loops & inventory

> *Superseded by the libations + logistics builds:* the par sheet is `house par` / `house stock` on the Business, restock is Mara's `restocks` brain ORDERING against it (logistics D11), stock is bought at the distributor by consignment → [employment.md § The house account in the wallet, and the par manifest](../../subsystems/employment.md), [retail.md § The distributor](../../subsystems/retail.md). Inventory-as-a-skill waits on the skill seam.

### Glassware & venue durables — the cycling pool

> Shipped: the cycling pool → [crafting.md § The glass pool](../../subsystems/crafting.md). Two beats remain:

- **Theft is priced, not walled** (the conduct→reputation philosophy): you *can*
  pocket a glass, but the **inventory reconciliation** catches the shortfall
  (like a short till), glasses are **worthless** to steal, and theft is
  **remembered** (regard hit / 86'd) — self-defeating, so no mechanical lock.
- **Breakage / walk-off = a small leak the bar restocks** — glassware is a
  **durable-good recurring sink** (the same shape as *tools*:
  [crafting-slate](./crafting-slate.md) § *Tools*); a shattered glass is a real
  matter sink (conservation). The restock *cost* lands in the ledger; the live
  *count* is **transient** (persistence track 4 above).

## NPC business & the shift-change ritual

A bartender who only animates on `order` is a vending machine in an apron. NPCs
have a **repertoire** of tasks, situation-driven (the *brain* is npc-behavior,
deferred; the **tasks + triggers** are authored content): **busy** → serve;
**slow** → wipe the bar, wash glasses, **prep** (cut garnishes, make mixers),
restock the rail, lean-and-polish idle, chat (with regulars, with each other);
**delivery** → receive + stock backstock; **inventory due** → the clipboard run;
**spill** → clean it. Each task is an **engaged activity**, and almost all are
*the same activities a player-bartender performs* — so the NPCs are a live
tutorial for the job (the role-slot symmetry), and the business makes them alive
and **observable** (the barfly reads the bar's rhythm).

**The shift-change ritual** — every 8h on the clock, a choreographed sequence,
and the moment the bar's economics become **diegetic**:

1. **Count out the till** — the outgoing bartender counts the drawer.
2. **Total the receipts** — tally the shift's sales.
3. **Reconcile** — cash vs. sales: the drawer comes up **over** or **short** —
   live micro-drama (a short drawer is a *question*: miscount, comped round, a
   skim? a story the barfly notices).
4. **Hand off** — the warm-or-cold handoff (cast dynamics) + the state of the bar
   ("low on gin," "table 3's got a tab open"), a note on the till.
5. **Deposit** — the cash goes to the back office / safe (Dave's books).

The count/receipts/reconcile **feed the ledger / P&L** — so the books get *closed
by hand, in the room, three times a day*; you don't read the P&L, you watch it
counted. It's also the next **scripting-language rung** after recipes — a
*scheduled multi-stage choreography* (`every 8h`, count → total → reconcile →
hand off → deposit): the NPC rituals **are scripts**. It makes the **roster felt**
(a witnessed changeover, not a teleport-swap); who reconciles ties to the
**clipboard/leadership** (Mara, accountable for the books); the till → Dave's
office.

## Ingredients & the back-bar

The crafting inputs, modeled as honest matter:

- **Low quality → worse hangover (honest chemistry).** Cheaper spirits carry
  more **congeners** (fusel oils / distillation byproducts), which really cause
  worse hangovers. Congeners are an honest measure (like ABV) driving the
  metabolism **toxin-burden / hangover** consumer (lighting up another dormant
  metabolism feature) + the harsher taste verdict.

## Verbs & the recipe-learning loop

> Shipped → [crafting.md § Verbs](../../subsystems/crafting.md), [§ The manual build](../../subsystems/crafting.md), [§ The knowledge ladder](../../subsystems/crafting.md) (the recipe-learning loop is `ScriptApi.captureManualBuild` — the first faithful hand build mints the deed and transcribes the script).

## Corpos — the mark and the fault line

> Canonical home: **[corpos-slate.md](./corpos-slate.md)** — the model + the
> authored five-corpo roster. The bar is its first consumer; this section is
> the bar-facing summary.

Two pieces, modeled cleanly (**not** GroupApi — that's for player groups):

- **Player ↔ corpo is a multipolar faction-approval vector** — *not* membership.
  A **signed standing with each corpo independently** (beloved by one,
  blacklisted by another); the **pattern across all corpos *is* your factional
  identity** ("a Populist loyalist," "anti-corpo," "playing both sides"). You
  affiliate **by conduct, not a click**: patronize a corpo's brands / work for
  them → up; favor rivals / go independent → down. So the **bar feeds it** —
  which brands you drink, stock, and push *are* your corpo politics, diegetically
  (conduct → reputation, multipolar). The **independent path** is a *region* of
  the approval-space (low/neutral across all), not a faction to join. Substrate:
  probably the **regard/renown** reputation layer scoped to corpo entities —
  open, not asserted.

The fault line: affiliating gives **built-in collaborators and antagonists**
spanning every discipline (corp is *cross-cutting* — you align on
loyalty/economics, not craft); corpo-vs-corpo rivalry plus corpo-vs-independent
tension is PvP/PvE structure emergent from *economics*, not red-vs-blue.

## The economics — the ledger & two governed faucets

> *Superseded by libations:* the distributor is a real cash-and-carry the bar buys from, stocked by consignment; the sanctioned floor is Veshko's yard standing at target → [retail.md § The distributor](../../subsystems/retail.md). The P&L, the reserve subsidy and cost of goods shipped → [banking.md § Tabs, wages, demo tax, the P&L](../../subsystems/banking.md).

## Payments — pay-as-you-go, tabs, and the implant

**Pay-as-you-go** is the default (strangers, tourists): settle each round, cash
or card/implant. **A tab is a trust mechanic** — a small **line of credit** the
bar lets run, so **running a tab is a privilege of being *known***
(recognition/regard): strangers pay as they go, regulars get "put it on my tab."
The tab is another diegetic marker of standing (alongside the usual, the stool)
*and* the smallest form of **credit** — your **tab history is your first credit
history**, the on-ramp to the deferred lending system.

**Skipping a tab is possible and *priced*, not prevented.** Credit means default
risk; you *can* walk out — but the bar **remembers** (conduct → reputation):
skipping burns your regard, costs you tab privileges, can get you **86'd**, and a
serious/repeat skip damages your broader **creditworthiness** (the deadbeat
reputation the lending system reads). The bar eats the bad debt (a real P&L line)
or pursues it in-world. Stakes both sides: the bar risks the default, you risk
your name.

**Cash vs. card/implant = off-ledger vs. on-ledger.** The implant/card is a
**payment credential** (the fast-travel `TravelCredential` shape — a `Thing` card
⊕ an aether-hosted `Idea` implant). Paying by implant *charges your account*
through the auditable ledger (traceable, taxable, governed, weightless); cash is
physical, off-ledger, heavy (the off-books margin). Your implant routes through
your **corpo bank** — so even *how you pay* carries corpo-political texture (tap
Goodkin's implant → Goodkin sees it, approval ticks; cash → nobody does). The
**trust-tab fork:** an implant-linked tab can **auto-settle** (pre-authorized,
un-skippable — the secure corporate default) vs. the **trust-tab** (manual settle,
skippable — the regular's privilege). A regular may *prefer* the trust-tab
*because* it signals trust — relationship over convenience, the bar thesis in the
payment method.

## How it's modeled — objects, persistence, presentation

> *Superseded:* the bar has exactly one class of its own, `world/lounge/location/Bar` (a `SingletonMixin` room the Warren wires); everything else is content over general substrate → [crafting.md § Dave's Bar content](../../subsystems/crafting.md).


> *Superseded by the persistence spine:* nothing saves back to a template; the venue's rows are templates, records are Documents, crafted drinks are transient → [persistence.md](../../subsystems/persistence.md), [crafting.md § Persistence story](../../subsystems/crafting.md).

**Who remembers what (the relationship-vs-record split):**

- **Relationship memory** ("does the bartender know/like you") → the **NPC's
  `BeliefStore`** (per-viewer regard/recognition — shipped, durable, templatePath-
  keyed). Personal, **earned, non-transferable.**
- **Institutional records** (your tab, status, credit) → the **venue's records**
  (ledger + customer records). The establishment's, **transferable.**
- **The books** (P&L, deposits, bad debts) → **Dave's** (the back office).

The payoff: **the record transfers, the relationship doesn't.** When Mara retires,
the bar still *knows* you (records) but the new bartender doesn't *know* you
(empty `BeliefStore` — earned from zero). The facts are the institution's; the
warmth is each person's. (Same for a freshly-hired player-bartender: reads the
records, has earned no one's recognition.)

**Presentation — the room `look` is never a flat contents list:**

- **Crowds are recognition-filtered + aggregated** — a 30-person bar reads as the
  faces *you know* **named** (belief / `RecognitionApi`) + "a couple dozen
  others"; *which* names depends on who you are (presence-buys-legibility, in the
  room view; the reactions-aggregation precedent).

So the room `look` = a prose scene (fixtures + Details) + a recognition-filtered,
aggregated people roster + a short loose-items list. **The content-rich crowded
room is the Scene composer's hardest case, and Dave's Bar is its forcing
function** (partly shipped — the composer, recognition naming, reactions
aggregation; partly the smart-presentation work the bar forces).

## Open / deferred

- **The trait system** — the roster (~15 opposed pairs, CK3-personality-adapted
  + Curious/Incurious) is banked at
  [npc-behavior-slate](./npc-behavior-slate.md) § *Traits*; open: the stress
  mechanic, learning-affinity, player scope, the compatibility→regard mechanism.
- **The succession arc** — the authored spine (who picks up the clipboard
  when Mara goes; the player as a candidate by carrying the load).
- **Player distillery** — the eventual real upstream that retires the magic
  faucet (full supply-chain interlock).
- **The corpo faction-approval gameplay** — the multipolar per-corpo standing
  vector + competition/sponsorship mechanics (the cross-cutting-axis build;
  roster authored at [corpos-slate](./corpos-slate.md), marks near-term);
  substrate home (regard/renown scoped to corpos vs. dedicated) open.
- **Appraisal-as-skill + the quality/congener mechanics** — taste/judge as a
  skill, and the congener → hangover tuning — defer with the skill system.
- **The Scene composer's smart presentation** — role-partition + Thing/Detail/
  nest + recognition-filtered crowd-aggregation for a content-rich crowded room.
  Partly shipped (the composer, recognition naming, reactions aggregation); the
  bar is its forcing function. (See *How it's modeled*.)
- **NPC business + the shift-change ritual** — the task repertoire + the
  scheduled choreography ride **npc-behavior** + the **scripting language** (both
  deferred; the shift-change is a scripting use case). The clock/roster is the
  light prereq.
- **Payments: tabs, the skip-consequence, lending** — pay-as-you-go ships with
  the currency slice; **tabs** (credit + the reputation-priced walk-out) and the
  **trust-tab vs. auto-settle** fork ride the banking + reputation systems;
  full **lending/creditworthiness** is deferred. Plus the **customer-records**
  substrate (status: regular / 86'd).
- **Numeric tuning** — prices, wages, subsidy, shift timing — to a running
  economy.
