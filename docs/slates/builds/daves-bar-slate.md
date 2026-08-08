# Dave's Bar slate (working doc) — the integrating vertical

> **Status: experience design, pre-requirements.** Dave's Bar is the
> **minimal complete vertical** — the smallest single place that exercises
> nearly the whole physics stack at once: matter, place, crafting, skills,
> engaged activity, employment, the first money transaction, metabolism,
> and reputation. It's the integrating exemplar the contributing slates
> point at; this doc is the **end-to-end experience** we're agreeing on
> *before* sequencing (build-phasing is deliberately deferred — see *Open*).

Contributing slates (Dave's Bar is where they meet):
[crafting](../tails/crafting-slate.md) (the venue, recipes, tools, craft-resolve) ·
[advancement](./advancement-slate.md) (skills as a leveled profession via
the skill seam) · [economy](./economy-slate.md) (the currency slice, the
reserve, employment, the NPC floor) · [activity](../../subsystems/activity.md)
(engaged activity — built, never used; this is its first consumer) ·
[cooperative](./cooperative-slate.md) (the reserve as central bank;
contribution → standing) · [lounge](./lounge-slate.md) (the bar is north of
the spawn lounge).

Substrate it leans on (largely shipped): [bulk](../../subsystems/bulk.md) /
[glob](../../subsystems/glob.md) / Material (the stock), location (the
venue), [time](../../subsystems/time.md) (the shift clock),
[belief](../../subsystems/belief.md) (recognition + the regard realm),
[metabolism](../../subsystems/metabolism.md) (the drink's consumer),
[reserve](../../subsystems/reserve.md).

---

## Near-term scope vs. vision

Most of this doc is **vision.** The **near-term player scope is deliberately
small: work the bar and earn a wage.** Concretely a player can **get hired**
(simple — pick up an open shift, no recognition gate), **tend a shift** (an
engaged activity), **mix drinks from the menu** (crafting v1, faithful
execution — no chef's-choice), and earn a **flat/hourly wage** (employment +
reserve-funded payroll — flat-not-commission, so it works on a dead shift and
doesn't hinge on thin early population; drink *sales* are separate revenue).

Near-term touches four things — **crafting v1, [Activity](../../subsystems/activity.md),
employment, and the economy (wage + reserve payroll)** — and needs *none* of
the deferred vision below: the recognition ladder, crew, the inventory
clipboard, the off-bar life, succession. Even skill **progression** on mixing
is optional near-term (fixed control suffices); wiring competence to the craft
seam is the natural *next* increment, not a precondition. Everything past
"work + get paid" in this doc is **captured as vision, not scope.**

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

**One room, fixed.** A cozy **neighborhood bar** (regulars, not tourists):
warm, dim, lived-in. And it is the **anti-lounge** — where the spawn lounge is
an **elastic Warren** (buds rooms to *spread* crowds out), the bar is a plain
**fixed `Location` that does *not* grow.** That fixedness is the whole value
engine: **concentration → buzz → prestige.** An elastic bar that spread people
out would be a *dead* bar; the scarcity *is* the product. Start with **one
room** (the main bar); subordinate nooks (a games alcove, a booth area) are
addable later *only* if a genuine spatial/social purpose appears — never to
manage prose, never as equal alternatives that dilute the one center. (Plus
**Dave's office** north — inaccessible to players, non-obvious exit, the
earned inner sanctum.)

How the room is modeled (all shipped substrate):

- **The bar counter** — `Surfaced` (set drinks on it) + `Postured` host, with
  ~**10 rail stools** as **seating slots** (`Slotted`/`Postured`). Seating is a
  *real, scarce capacity* — you can't seat more bodies than slots — so the
  **rail is coveted**: regulars have their stools, location becomes social
  capital ("your stool" means something). A few **booths/tables** (`Surfaced` +
  `Postured`) in the same room; the **well + back-bar** is the bartender's
  domain (the bottles → § *Ingredients*).
- **Corpo décor** — neon signs, the back-bar mirror, tap handles are
  **`Adornment`s** carrying **corpo marks** (brand → corpo); the neon ones are
  **`LightSource`s**, so *the corpos literally light the room* — the amber haze
  is corporate glow. The walls are a corpo legibility surface (Dave's sign
  choices = his corpo politics) and pre-wire the deferred **sponsorship**
  mechanic (corpos bidding for wall space).
- **Amusements** — a dartboard in the corner (kept *in* the main bar so its
  energy stays in the buzz), a jukebox, a TV (the broadcast tie-in) — interactive
  `Stuff` affording an **activity**; v1 flavor, interactivity deferred.
- **Lived-in history** — a photo wall, a retired regular's mug, signed bills:
  `Visible`/`Detailed` flavor carrying **provenance** (whose) — the accumulated,
  attributed history a tourist bar can't fake (and that Augie can narrate).

**Layered description (so one rich room isn't a wall of text).** Three layers,
only the first on entry: (1) the room `look` is a **concise scene-setter** that
*names* the notable features without unpacking them (not an inventory dump);
(2) richness is **examine-on-demand** (`Detailed`/`Visible` — `look at the
back-bar` / `the signs` / `the photo wall`), latent until pulled; (3)
people/activity are **dynamic** (the Scene composer, separate from the static
desc). The room thus **rewards looking closely** — the barfly mechanic applied
to the place itself (the tourist gets the scene; the regular finds the stories).

## The cast & the social physics

**Dave — the endgame made flesh.** Owner, master-emeritus, mixology through
the roof, but he doesn't pour anymore. He works back-of-house from an office
*north of the bar* behind a non-obvious exit (inaccessible until you're a
regular; impassable until you've earned his regard — the inner sanctum,
aspiration you can see the edge of). Dave *is* what mastery becomes: you
stop pouring and become the institution (the advancement slate's
learn → master → run lifecycle, in one NPC). An homage to an EotL NPC
(specifics are the author's to bring).

**The three behind the bar — three souls by time of day.** 8-hour shifts on
the game clock mean *which bartender you meet depends on when you live in
the game*; the night-owl and the lunch-breaker drink in different bars.
Distinct personalities, one warm family (names are placeholders):

- **Mara — the Anchor (day).** *Diligent, Patient, Reserved, Temperate* —
  doesn't drink anymore. Knows your order, says little, means a lot. The
  spine. **She does inventory** (see leadership).
- **Remy — the Connector (swing).** *Gregarious, Gossip, Ambitious,
  Charming.* The buzz, the rumor-mill, the introducer, a harmless schemer
  everyone rolls their eyes at — because he's *theirs*. The information node.
- **Sloane — the Confessor (night).** *Brooding, Perceptive, Secretive.*
  Says little, sees everything, notices when you're off. Closest to Dave,
  keeper of the after-hours.

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

**Conservation makes inventory mandatory.** A cocktail *consumes* its gin
(honest matter), so the bar drains every pour and *someone* must restock or
it runs dry. The fiction (Mara does inventory) and the physics (conservation
depletes stock) are the **same fact** — the leadership structure *emerges
from the matter-flow*, the "physics not content" bet paying off.

Two loops, with Dave's policy over both:

- **Front loop** (the shift bartenders): serve customers → *consume* stock.
- **Back loop** (Mara): inventory + replenish → *restore* stock.

How it's modeled (almost all shipped substrate):

- **Stock is real matter, not a number** — bulk spirits in real bottles,
  glob garnishes, `Tangible` items. "Doing inventory" is a
  *perception/measurement* act over the real contents (you *see* what's
  low), never reading a stat.
- **Dave's "what to stock" = the par manifest** — an owner-set policy on the
  venue: `{input, par level, supplier}` (restaurant "par"). The one genuinely
  new piece, and small.
- **Mara's "doing inventory" = an engaged activity** (Activity's debut): a
  timed walk of the stock, measuring actual-vs-par → a *shortfall list*. It's
  itself a **skill** through the crafting control seam — a sharp keeper
  *anticipates* the Friday run-out; a novice counts what's already empty.
- **"Keeping it running" = replenishment** — order the shortfall → supplier
  delivers → restock. The economy's **circulation** stage from the demand
  side, and the bar's tie into the wider world (the supplier is the
  interlock seam — abstracted at first, see economics).

### Glassware & venue durables — the cycling pool

A glass isn't a consumable (the *booze* is — conservation); it's the bar's
**durable property in a fixed cycling pool**: clean → served → drunk → **bussed**
→ washed → reused. So glasses don't proliferate — serving **claims** one from the
pool (never mints a new object), bussing returns it, and the object count is
bounded by the pool, not the drink-count.

- **Reaping = bussing**, not a despawn — a normal task in the NPC repertoire
  (and a player-bartender's): collect empties → wash → return to the clean pool.
- **Theft is priced, not walled** (the conduct→reputation philosophy): you *can*
  pocket a glass, but the **inventory reconciliation** catches the shortfall
  (like a short till), glasses are **worthless** to steal, and theft is
  **remembered** (regard hit / 86'd) — self-defeating, so no mechanical lock.
- **Breakage / walk-off = a small leak the bar restocks** — glassware is a
  **durable-good recurring sink** (the same shape as *tools*:
  [crafting-slate](../tails/crafting-slate.md) § *Tools*); a shattered glass is a real
  matter sink (conservation). The restock *cost* lands in the ledger; the live
  *count* is **transient** (persistence track 4 above).

Generalizes to **all venue durables** (plates, tools, fixtures): cycle, bus,
restock-on-leak; live count transient, costs + reputation persisted.

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

- **Individual working bottles, aggregate backstock.** A working bottle is a
  `Tangible` container holding a **bulk** spirit (a 750ml bottle, draining on
  every pour — conservation); the **backstock** is aggregate (sealed bottles as
  `glob` stacks / cases). Inventory counts both; "par" is how many to keep.
- **On surfaces, not in a vessel.** Working bottles rest on the **back-bar
  shelf** and the **well/speed-rail** (`Surfaced`); backstock sits in containers
  in the store.
- **Real categories, fictional brands.** A "gin" is honestly juniper-flavored
  ethanol-water at a real ABV — *real substance* (the chemistry-teaching bet) —
  but the **brand is invented** (no trademark risk). Categories: **hard
  spirits** (gin/vodka/whiskey/rum/tequila), **liqueurs** (vermouth/triple-sec/
  amaro/bitters), **mixers** (tonic/soda/juice/syrup — zero ABV). Recipes
  constrain by *category* ("2 measures of any gin"); the **brand choice
  substitutes through** to the result.
- **ABV is a count; quality is a verdict.** The clean line (economy Law 1 / "no
  quantity without a referent"): **ABV** is a measured quantity *with a
  referent* — real, displayable, feeds metabolism → BAC, and is what mixing
  *manages* (strength via dilution/ratio — real chemistry). **Quality** is never
  a number — known by **brand/provenance**, by **appraisal** (a skill, deferred),
  rendered **DF-style: an ordinal band-word headline + descriptive prose**
  (*"a fine martini — crisp, ice-cold, balanced"* vs *"a poor martini — cloudy,
  lukewarm, harsh"*), never a score. An ordinal material **grade** sits
  underneath; the player reads the label + the description. **No Diablo-style
  rarity tiers** — for a consumable it's a non-concept (drunk and gone); only
  quality + who-made-it matter. (Full model:
  [crafting-slate](../tails/crafting-slate.md) § *Quality — the verdict, rendered*.)
- **Low quality → worse hangover (honest chemistry).** Cheaper spirits carry
  more **congeners** (fusel oils / distillation byproducts), which really cause
  worse hangovers. Congeners are an honest measure (like ABV) driving the
  metabolism **toxin-burden / hangover** consumer (lighting up another dormant
  metabolism feature) + the harsher taste verdict.
- **Price ≠ quality.** Price tracks **brand positioning**, not the verdict — the
  overpriced dud and the cheap value-gem both exist, and the gap is where
  **appraisal / value-hunting** lives. Two producer tiers carry it:
  **large-corporate** (mass-market, cheap, "fine") vs **microdistiller**
  (small-batch, premium-*positioned*, "understood to be better"). The tiers map
  onto the economy's **NPC-floor (large/corpo, the magic faucet's product) vs
  player-apex (micro/independent, the future player-distiller niche)**.

## Verbs & the recipe-learning loop

The v1 verb surface (faithful execution from the menu — all "mix + wage" needs):

- `menu` — the venue's known cocktails.
- `serve <customer> a <cocktail> [with <brand>]` — the bartender's core verb:
  make-and-deliver in one; the `with <brand>` modifier is where the
  corpo/quality/price choice lives. Resolves recipe + venue inputs + tools +
  control → a stamped drink, consumes the matter, hands it over.
- `mix <cocktail> [with <brand>]` — make one without a recipient.
- `order <cocktail>` — the customer side (order from the menu).
- (shipped) `drink` / `sip` → metabolism.

Two registers, one deferred: the **recipe shorthand** above (fast, v1) over a
**manual build** (`pour … into shaker` · `shake`/`stir` · `strain` · `garnish` —
the process-sim depth, for experimentation/invention; deferred). No vending
machine (the shorthand consumes real matter + stamps provenance), no twitch
(character control, not player reflexes), no tedium (the rote collapses to one
verb).

**The recipe-learning loop — Dave's Bar as the scripting language's first home.**
The mechanic: **make a drink once for real → the command sequence banks as the
recipe → shorthand replays it after.** Reading a recipe is a `claim`; *making*
it is the `deed` that banks it (knowing→doing). The banked recipe **is a
script** — a linear sequence of gated verbs + one brand parameter — the
**gentlest rung of the slated [scripting language](../tails/scripting-slate.md)**
(needs none of its hard forks: blocks/coroutines/conditions/director). Replay is
**pre-bound** (skip re-parse; still resolve+validate+execute on the bus — real
commands without the tedium). **Decision: build the v1 shorthand *script-shaped*
from the start**, so the bar is the scripting language's first, gentlest
consumer (alongside Activity and metabolism) and nothing's rebuilt. *(v1 still
ships venue-known recipes; the make-to-know **learning** loop is the next
increment, on the same script-shaped foundation.)*

## Corpos — the mark and the fault line

> Canonical home: **[corpos-slate.md](./corpos-slate.md)** — the model + the
> authored five-corpo roster. The bar is its first consumer; this section is
> the bar-facing summary.

The world frame (developing `vision.md`'s tentative "Organizational Affiliation
/ Corporations" and the advancement slate's **corp = cross-cutting third social
axis**): **a handful of megacorps own most of the private sector; independents
are the exception.** Entirely fictional. ~**5** corpos plus the **independents**,
each corpo distinguished by **sector-of-origin + culture/ethos + aesthetic** —
*not* crude Good/Evil (clashes with "physics, not RPG"); all are self-interested,
distinguished by *how they operate and what they value*, so each ethos appeals to
a different player temperament. The independents are a faction *by refusal* (the
microdistillers).

Two pieces, modeled cleanly (**not** GroupApi — that's for player groups):

- **A corpo is a *mark*** — a brand stamp on things, riding the
  **provenance/maker's-mark** layer (provenance at corporate scale: "a product of
  [Corpo]"). A corpo is a **reference-identity** (`Idea` singleton, same shape as
  `Material`/`Species`/a brand); **brand → corpo** is a stamp resolving to one
  authored corpo. The mark is a **queryable property on every product, business,
  and venue** a corpo touches — *the real thing on every Stuff instance*.
  (Independents carry no corpo mark.)
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

**Scope:** the **marks** are near-term-needed (to stamp the bar's brands honestly
we must author the corpo roster + assign ownership *now*); the **approval-vector
gameplay** + competition/sponsorship are the deferred cross-cutting-axis build.
Corpos are **foundational world-content beyond the bar** — the bar forces the
first authored slice.

## The economics — the ledger & two governed faucets

**The supply abstraction: a magic distributor.** Modeling player
distilleries is deferred (a lot); the bar buys from an NPC **distributor —
the economy's extraction faucet, abstracted into an NPC.** It obeys two
rules: **deliberately mediocre** (acceptable-but-not-great price, so a future
player-distiller can undercut it and the bar would *prefer* the real
supplier — NPCs recede as players fill in) and **accounted** (every drop is
on the books). A bounded, logged faucet is a governed policy choice; an
unlogged one is the loot-faucet the economy forbids. Magic, but *on the
record.*

**The bootstrap P&L.** The bar *pays* the distributor for booze (real cost),
pays **wages** to the bartenders (real cost — NPC or player on shift), wears
its tools (minor sink), and earns from **drink sales** (revenue). At genesis,
few real customers → revenue < costs → **the bar runs red.** The red is
covered by the **reserve** (the cooperative's central bank, which exists to
float NPC vendors and seed genesis liquidity). So **two governed faucets**:
the distributor mints *booze*, the reserve mints the *coin* that covers the
loss. The negative balance sheet **is the honest record of the subsidy.**

**The deficit is the design target.** Instrument every flow now — booze in,
coin in, wages out, sales in — and let it sit red. Then "building the
economy" gets a *measurable definition*: **drive the balance sheet from red
toward black by replacing magic faucets with real production.** A
player-distiller arrives → the booze faucet's draw shrinks. Real regulars →
sales rise. Players working shifts → the NPC wage line becomes real labor.
Red→black is the scoreboard of economic health — and because it rides the
reserve's "only mint, fully governed and auditable" property, the subsidy is
always *visible and accountable* (the central-bank-as-governance thesis,
dogfooded on a bar tab).

**"Recovering the losses" = seed capital, not clawback.** The subsidy is
recovered the way deficit spending is: the economy it bootstrapped becomes
net-productive and throws off more value than it cost. Red→black *is* the
recovery. (An optional later lever: a profitable bar "graduates" off subsidy
and pays back into the reserve — a legislative choice, not a requirement.)

**Build the ledger early.** It's cheap, it rides the reserve's accounting,
and it's the *instrument* that makes the whole economy legible and tunable.
Dave's Bar's P&L is the first real test of "the economy is a governed,
auditable thing, not devs patching numbers" — the entire economy thesis,
proven on one bar's books. The **structure** is settled (two accounted
faucets, a real P&L, the reserve covering genesis red, the balance sheet as
the thing the build is trying to balance); the **numbers** (floor price,
subsidy size, wage) defer to a running game.

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

The reference for *what implements what*. **The discipline: Dave's Bar is
*content* — authored templates composing general substrate. There are no
bar-specific classes** (no `DavesBarRoom`, no `MaraNPC`). Genuinely-new substrate
(banking, tabs, the corpo-mark, recipe-scripts) is built **general and reusable**,
once; the bar is the *first consumer* that motivates it, never a special case
(the CLAUDE.md "fold into substrate, don't invent module categories" rule).
"Building Dave's Bar" = build the substrate it needs, then author the bar over it.

**The five-category spine** (all `Stuff` except `Document`):

- **`Idea`** (incorporeal) — corpos, brands, recipes, Subjects (reference-
  identities in Catalogues).
- **`Thing`** (corporeal object) — the bar counter, stools, tables, bottles,
  signs, the till, coins.
- **`Character`** (`Agent → Creature → Character`) — the NPCs and Avatars.
- **`Location`** — the room.
- **`Document`** (NOT `Stuff` — persisted data) — beliefs, chronicles, **accounts /
  ledger / tabs**, customer records. *Where the memory lives.*

Capabilities are **mixins** on the spine (bar counter = `Thing` +
Surfaced+Postured+Slotted; Mara = `Character` + BeliefStore+Soul+Persona+traits).

**Three persistence tracks:**

1. **Templates** (the `domain` collection) — the authored static **content** (the
   room, furniture, décor, NPC *definitions*, recipes, menu, corpos): cloned into
   runtime, **not saved back** (the template is the source).
2. **Save-back to template** — the **Avatar exception only** (a player's evolving
   state → their template). The bar's NPCs/furniture do *not* save back.
3. **Document collections** — the evolving **memory/state** (beliefs, accounts +
   ledger + tabs, customer records, chronicles).
4. **Transient runtime state — persisted *nowhere*** (reset or derived on
   restart): operational churn — the live glass count, who's-on-which-stool, the
   in-flight scene, which NPC is mid-task. Inherits the **presence-freeze**
   pattern (no churn while the venue's empty/offline; reset to par on restart).

→ **Persist *consequences and policy* (money, relationships, records, par
levels); let *operational churn* be transient.** Authored content = templates;
durable memory = Documents; the heartbeat = transient runtime. **Not all evolving
state is "memory"** — the live glass count is the cleanest example (constantly
changing, persists nothing, correctly).

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

- **Partition by role** (the Scene composer): **people** (a roster), **fixtures**
  (woven into the prose scene, not listed), **loose items** (a short "here" list).
  Never one bucket, never a recency-ordered dump.
- **Thing-vs-Detail by interactivity, with presentation as a budget:** **flavor →
  `Detail`** (examinable text, not an object, not in contents — the photo wall,
  faded posters; *the default*); **interactive → `Thing` flagged a *fixture***
  (presented as scene, not loose — the counter/stools/dartboard). *Be a Detail
  unless you need to **do** something to it and it earns its presentation weight.*
- **Nest contained things** — bottles live *in* the back-bar, cash *in* the till;
  nested, so they never appear loose in the room (drill in via `look at the
  back-bar`).
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

- **Sequencing & build-phasing** — deliberately not decided yet (agree the
  experience first).
- **The crafting verb surface** — how you actually `mix`/`shake`/`serve`
  (open in the crafting slate).
- **The quality-verdict rendering** — how a drink's quality reads as prose,
  never a number (the crafting slate's central honesty problem).
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
