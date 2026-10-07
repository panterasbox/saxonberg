# The reachability sweep — requirements

**Kind:** refactor/sweep
**Leads from:** mixed — the verb and grammar halves are kernel-led
(their first consumers are the shipped verbs and shop counters named
below); the content half is content-led.

The carcass-chain build shipped a whole capability pack that **nothing
afforded**, and its drive checkpoint passed anyway. This build runs the
generalized form of that bug and closes the class. Three defects turn
out to be one walk over one corpus — the command views and the content
rows — and the game's own doctrine already says why they matter:

> **Afford statically, decline diegetically.** […] Trying and being
> told is discoverable; **a verb that is simply absent teaches
> nothing.**

That is the product statement. Fourteen verbs the help text promises
answer *"I don't understand"*; thirty-one authored things no player can
reach; and every multi-word good in the game answers a bare purchase
with a refusal about a mechanism the player was not using. None of it
fails loudly, which is why all of it survived.

Seeds: [butchery-slate](../slates/tails/butchery-slate.md) ·
[base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md)
§ L9/I9 · [retail-slate](../slates/builds/retail-slate.md) ·
[affordance-verb-slate](../slates/tails/affordance-verb-slate.md).

---

## What already exists

**The doctrine, in full, and none of it is new.** The five reachability
links (verb · affordance · data · boot · arg gate) are named in
`workflow.md` and the lint family; four of the five have a gate; the
**affordance link is the one that does not**. `command-routing.md`
states that a verb's affordance is recorded in exactly one place and
nowhere else, and separately that a controller test is handed a
pre-built model, so *"a whole verb can be unreachable while its
controller's tests are green."* Both sentences predate this build.

**The precedent, three times over.** `climb` shipped with the
locomotion build and for a year nothing in the game composed its
mixin. `mount` and `ride` answered *"I don't understand"* for every
player since conveyance shipped. `hitch` and `unhitch` were afforded by
nothing — view, controller and arg gates all present. Each was found by
**driving the world**, never by the suite, and each fix was a
two-line static on the instrument.

**The census half already exists for the sibling defect.** A gate
refuses a *fresh* verb collision and carries seven known ones with a
reason each, on the principle *"the census is the census; the
disposition is per verb."* It walks the same corpus this build needs.

**Quoting already exists.** The tokenizer makes `"…"` one token, so a
multi-word good is typable today. Single quote is deliberately literal,
because a chat-driven MUD is full of apostrophes.

**The row-reachability mechanisms already exist and are invisible to a
reader.** A row can reach the world by being named, by self-placing, by
self-seating, or by being drawn from a population census that queries
the data rather than naming a path. The last one is why a search from
the world's side finds nothing, and it is correct — the magic pack's own
doctrine says the census, not placement, is its faucet.

**Therefore what is genuinely new here is** not a mechanism and not a
doctrine: it is **the instrument** — one census over the command-view
and content-row corpora that can see an absence, plus the dispositions
it forces into the open. Everything this build fixes is something the
project already decided it wanted and then lost silently.

---

## Goals

- Every verb the game's help text promises is either **reachable**, or
  **recorded as deliberately unreachable with its reason** — and the
  difference is machine-readable rather than a comment.
- A player who types a multi-word good's name at a counter gets either
  the good or an **honest** refusal — never a refusal naming a shelf
  they did not mention.
- Every authored thing in the world is either **reachable by a
  mechanism**, **declared unreachable in a field**, or **deleted**.
- The three absences — a verb nothing confers, a verb two views claim, a
  one-token slot where a phrase is meant — are **gated as one family**,
  so the next build cannot reintroduce any of them silently.
- Seven subsystem docs stop asserting that dead verbs work, and the one
  doc that teaches the bug to the next author stops teaching it.

## Non-goals

- **A second lock system.** `lock`/`unlock` stay unreachable; the
  stopgap boolean they would have to grow is told in terms not to grow.
  → the lock reconciliation already slated in
  [base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md) § I9.
- **`fly`.** No exit anywhere admits air travel and no playable species
  can fly. Afforded-and-always-refusing would be honest and useless.
  → recorded as a disposition; revisit when a flying species ships.
- **A potion faucet.** Nothing in the game makes a potion — no recipe,
  no census draw, no shop. That is a missing *producer*, not a missing
  placement, and it is the magic pack's question.
  → [magic-items-slate](../slates/tails/magic-items-slate.md).
- **Teaching the affordance resolver what suits what.** The project has
  refused that shape twice and this build does not reopen it. The gate
  is a **static census over declarations**, never a runtime table.
  → nowhere, deliberately.
- **Leather → a worn garment** (the carcass chain's unmet AC1). Nothing
  resolves that recipe, and the verb shipped for it was reverted as the
  wrong answer; it needs a design pass.
  → [butchery-slate](../slates/tails/butchery-slate.md) +
  [textiles-slate](../slates/builds/textiles-slate.md).
- **A commercial outlet for honey.** No shop or NPC buys honey, comb or
  wax, and mead is a maturation nothing knows about. Real, and a
  demand-side question for its trades. → [dairy-slate](../slates/builds/dairy-slate.md)'s
  sibling work and [retail-slate](../slates/builds/retail-slate.md).
- **The wire harness's compressed-clock saturation** — a test
  instrument, not a product defect.
  → [wire-suite-growth-slate](../slates/tails/wire-suite-growth-slate.md).

---

## Placement

The verbs are the **kernel's**, because the dead ones are the kernel's
own movement, device, boundary and system verbs; the two locality verbs
(`wind`/`adjust`) stay with the locality bundle that owns them. The
grammar ladder is the **kernel's**, in the command-spec author guide.
The gate family is the **kernel's lint roster**, which is derived, so
adding an arm makes it run everywhere with no list to edit.

The content fixes belong to **the pack that owns each row** — eleven
packs, one row to a dozen rows each. ⭐ The test the sweep must satisfy:
**a second instance needs no code.** Placing a hopper where the canary
can be fed, or standing a household vat in a home, is a row; the gate
that notices the next unplaced one is written once.

---

## Collisions

- **Heart's Delight.** The ox-book belongs in the farmstead yard beside
  the flock book, which is already both propped and warmed. Quist lives
  there; the oxen are his. Nothing else moves.
- **The Terminus general store.** Gains a pocket-watch line and a
  saucer line, and its existing authored promise about `orange seed` is
  finally kept. This counter is already the realm's importer and the
  honest home for both.
- **The estuary.** Gains the thing that makes its six water exits
  swimmable. ⚠ It is also the salt-works' water and the fishery's
  reach — the water host must not claim either, only the swimming.
- **The wharfside dyehouse and mill.** Each already props the
  professional rung of its trade; this build stands the domestic rung
  where a player lives, not in the works.
- **The Cold Fell installation.** Already authored, already named by the
  water feeder, and standing nowhere. It goes where the wharfside bank
  already describes it.
- **`trade-glass`, in flight.** It ships a `dip` verb that collides with
  the chandlery's. The collision arm of this build's gate is where that
  is adjudicated, but **the disposition is the glass build's** — this
  build does not pre-empt it.

---

## Surface decisions

### Quoting is the general answer; `greedy` is for a free-text tail

A one-token slot cannot hold a phrase, so every multi-word name
overflows — but `buy "dog loaf"` works today. **The defect is therefore
the bare form failing *misleadingly***, not the good being unbuyable:
the trailing slot eats word two *and* discards its own default, so the
player standing at the counter is told there is nothing to buy here.

The remedy is a **ladder worked case by case**, in the shape the verb
collision ladder already established:

1. **The syntax suggests a free-text tail** — dialogue, a destination
   phrase, a menu item, a search string, a single-argument verb →
   a greedy slot. Already shipped and correct in two verbs.
2. **A name a newcomer types constantly, where every trailing argument
   declares a preposition to stop at** → greedy, which the load-time
   invariant permits exactly here. Three verbs qualify: the two shop
   verbs and the baking verb.
3. **Otherwise quoting is the answer** — and the help text must say so
   where a player will meet it, because today none of it does.
4. **Or restructure** — a subcommand, a flag, a prepositional argument,
   or a hyphenated keyword on the row. ⭐ The milling verb is **forced**
   down this rung: a trailing numeric argument declares no preposition,
   so a greedy slot in front of it is forbidden outright.

⭐ Alternative rejected: one blanket flag across every vulnerable view.
It inflates a misleading-refusal defect into an impossibility, it cannot
apply to at least one of its targets, and it would have shipped a
remedy where the author never made a decision.

### Nine verbs are conferred; five are dispositions

Conferred, because each has an honest conferrer and real targets: the
third pace verb, the dismount, the two folding verbs, the two locality
timepiece verbs, the prompt verb, and the two parcel verbs. ⭐ The two
parcel verbs go on the **universal player** tier, because the project's
own rule for the sibling land verb is *"the gate is the authority, not
the affordance."*

Held, with the reason recorded in the census: the two lock verbs
(deliberate — see non-goals) and the flying verb (no target, no
species). **Swimming is conferred and gets one water host**, because the
body plans already carry the mode and the exits already carry the
medium; only the host was missing.

### A verb needs a target, so the watch is vended

The timepiece verbs are a one-line fix whose only target in the world
sits in an NPC's pocket, placed by code and sold nowhere. A verb that is
reachable and untargetable is the same defect wearing a different hat,
so the general store sells a pocket watch.

### A row's reachability must read a field, never a comment

A row is reachable if it is **named** by any field that can name a row,
or **self-places**, or **self-seats**, or is **drawn by a population
census**, or is the **parent of a row that is itself reachable**.
Everything else is a finding.

⭐ Two corollaries carry the whole decision:

- **A deliberate hold must be declared in a field.** A row held back
  for a later build and a row forgotten are indistinguishable from the
  outside — and the proof is a magic item held pending a follow-on that
  **shipped**, leaving the row stranded by its own reason. So a row that
  is deliberately unreachable says so in an authored field (an exemplar,
  a parent, or awaiting a named slate), which makes the claim greppable
  and reviewable. A header comment counts for **nothing**: one row's
  comment asserts wiring the row does not have.
- **A test or a doc mentioning a row is not reachability.** Fifteen
  substrate exemplars are cited in subsystem docs and built in unit
  tests while being unreachable in play, and the water installation's
  test reads its row **straight from the file** — which is precisely why
  the suite is green over an object no player can reach.

### Three arms, one gate family

The three absences are one walk over one corpus, so they are one family
with a disposition recorded per verb and per row — not three gates and
not three exemption lists. ⚠ And the census must **not** be a bare
count: the row figure scales with content size, and a bare ceiling
refuses an author for adding content, which this project has already
had to undo once.

---

## Lens pass

1. **Pedagogy** — ⭐ the dominant lesson is not in a Discipline, it is
   in the **refusal**: *trying and being told* is how a player learns
   what the world is made of, and an absent verb teaches nothing. Every
   verb this build confers makes a mechanism legible by declining
   intelligibly. The grammar half teaches that naming a thing precisely
   is a skill the interface rewards (and quoting is the tool), which is
   honest rather than decorative.
2. **Expression** — ⭐ the gate is the expressive win. An author who
   ships a view, a controller and a row currently has no way to learn
   they forgot the one line that makes it sayable; afterwards they
   cannot ship that mistake. The `unreachable:` declaration is
   expression too: *"this is an exemplar"* becomes a thing an author can
   **say** rather than a thing they hope a reader infers. **Grain, not
   invariant** — any author may hold a row back, and now has to say so.
3. **3a Immersion** — the fiction currently betrays itself in the most
   direct way available: the help text describes acts the world refuses
   to understand, and a shelf shows a price for a thing you cannot name.
   ⚠ The one hazard this build introduces is **affording a verb with no
   target** — which is why the watch is vended and why flying stays
   dead.
4. **3b Participation** — it opens nothing new, and that is the finding:
   this is a build about **keeping promises already made**. The nearest
   participation gain is secondhand — the oxen become draftable, the
   domestic rungs of dyeing and textiles become reachable, so two trades
   get their accessible tier back and a smallholder can act without a
   works.
5. **Values** — thin, and honestly so. The one real choice is the
   build's own: **confer or delete**, asked of each dead verb and each
   orphan row. The doctrine answers it — afford and decline beats delete
   — so the undecidable residue is small: whether a substrate exemplar
   belongs in the world at all. Answered by making the author declare it
   rather than by deciding for them.
6. **Continuity** — the gate outlives every epoch because it reads
   declarations, not behaviour; a verb afforded medievally is afforded
   industrially. ⭐ And the ladder is epoch-proof for the same reason the
   collision ladder is: it decides *shape*, not content.
7. **Governance** — it judges no person. The nearest thing is the
   census judging an **author's row**, and its appeal is the declaration
   field: an author who disagrees with a finding records why, in the
   row, where a reviewer can see it. Tier B — whoever ships the code.

---

## The drive

Run against the live game before the MR opens. ⭐ Each step asserts the
verb is **understood** and that **state changed** — never merely that
no refusal arrived, because a verb that does not exist is not refused
either, and that is exactly how the chandlery's dead verb passed for a
whole build.

**The verbs**

1. Set your default movement mode to sneaking, then `walk` through an
   exit. You move, walking — and you have a way back to walking that
   does not require changing a setting.
2. Mount the pit pony, then `dismount`. You are on your own feet beside
   it, standing.
3. `fold` the camp chair at the crossing; try to sit on it and be told
   it is folded; `unfold` it and sit.
4. Buy a pocket watch at the general store. `wind` it; it ticks. `adjust
   watch 4:00`; the hands read four o'clock. Look at a timepiece that is
   not mechanical and be told those acts mean nothing to it.
5. With a question pending, `prompt cancel`. The question goes away.
6. Standing on ground you hold, `subdivide` it and name the child; then
   `transfer` it to another player, who must accept. Try both on ground
   you do not hold and be refused **on authority**, not on grammar.
7. `swim` through an estuary water exit. You cross, swimming. Try it on
   a dry exit and be told there is nothing to swim in.
8. Type `lock north` and `fly up`. ⭐ Both must still answer *"I don't
   understand"* — and the census must say so, with the reason, so the
   absence is a recorded decision rather than this build's oversight.

**The grammar**

9. At the bread counter, `buy dog loaf` — bare, no quotes. You get a dog
   loaf, and your inventory count rises by one.
10. `buy "dog loaf"` — the quoted form also works.
11. `buy orange seed` at the general store. You get the packet, which
    the counter's own description has been promising all along.
12. `bake lean loaf`. The oven is found without being named.
13. `mill "sack of wheat"` — the quoted form, because this verb's shape
    forbids the other remedy. Then `mill sack of wheat` bare, and the
    refusal must be the honest *"that is not a shape I know"* rather
    than a complaint about a millstone you never mentioned.
14. Consign a dog loaf, then `reclaim dog loaf` by that name.

**The content**

15. At the Heart's Delight farmstead yard, read the ox book and `draft`
    an ox. The oxen exist, can be seen, and can be worked.
16. Buy a hopper; feed the canary from it. It eats — where today it
    refuses every vessel offered.
17. Buy a household vat; dye a garment at home, without a dyehouse.
18. Buy a drop spindle; spin, without a mill.
19. Butcher a hen. You get a breast, a thigh and a drumstick — not stew
    meat.
20. Walk to the wharfside and see the Cold Fell aqueduct and its house
    standing where the bank describes them.
21. Buy a jar of honey; it has honey in it.
22. Stand in the distributor's yard for several beats. No floor hand's
    work throws, and goods reach the cash-and-carry.

**The chain, end to end** (the one that proves the apiculture trade)

23. Buy a hive and a nucleus at the general store; carry both to Quist's
    close; install the bees; `rob` the hive for comb; crush it for honey
    and a cake of wax; melt the wax; `dip` a beeswax candle. ⭐ Every
    rung of this already shipped and **no drive has ever walked it**.

---

## Acceptance criteria

Observable from outside the code, by a person playing.

1. A player can **walk** after setting a non-walking default, **dismount**
   what they mounted, **fold** and **unfold** the camp chair, **wind**
   and **adjust** a watch they bought, **cancel** a prompt, **subdivide**
   and **transfer** ground they hold, and **swim** across water.
2. `lock`, `unlock` and `fly` still answer *"I don't understand"*, and
   the reason each is unreachable is written where the next person will
   look — not discovered again in two builds' time.
3. Every verb the help text promises is either usable or recorded as
   deliberately unusable. There is no third category.
4. A player can buy a **dog loaf**, an **orange seed** and a **mana
   cell** by typing the name they can see, without quotes.
5. Where quoting is the answer instead, the verb's own help text says
   so, in words a player who has never used a shell would follow.
6. No purchase refusal names a counter, shelf or instrument the player
   did not mention.
7. The Heart's Delight **oxen can be drafted**; the **canary eats**; a
   garment can be **dyed at home** and wool **spun by hand**; a hen
   yields **poultry cuts**; the **Cold Fell aqueduct** is standing; a
   **jar of honey** contains honey.
8. The full apiculture chain — bees bought, installed, robbed, crushed,
   melted, dipped — can be walked by one player in one sitting.
9. Every authored thing in the world is reachable, declared unreachable
   with a reason, or gone. A reviewer can tell which by reading the row.
10. A new view that nothing affords, a second view claiming a live verb,
    or a one-token slot where a phrase is meant **cannot be merged
    silently**.
11. No doc asserts that a dead verb works, and the guide for adding a
    movement mode no longer omits the step whose absence caused this.

---

## Cross-references

- **Seeds** — [butchery-slate](../slates/tails/butchery-slate.md)
  (⚠ its beeswax finding is **wrong** and this build retracts it: the
  chain is whole, bees are sold) ·
  [base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md)
  (⚠ its § L9 count and set are superseded here) ·
  [retail-slate](../slates/builds/retail-slate.md) ·
  [affordance-verb-slate](../slates/tails/affordance-verb-slate.md)
  (⚠ it records the timepiece verbs as shipped; they never ran).
- **Doctrine** — [command-routing](../subsystems/command-routing.md)
  (the one record of affordances; afford statically, decline
  diegetically) · [command-spec](../subsystems/command-spec.md) (the
  author guide the ladder belongs in) ·
  [command-parsing](../subsystems/command-parsing.md) (quoting) ·
  [lint-family](../lint-family.md) (census-then-ratchet, and the three
  ways a census lies) · [workflow](../workflow.md) (the five links).
- **Docs this build corrects** — time, slot, locomotion, conveyance,
  prompt, boundary, access (and the parcel/smallholding/furniture docs
  that conflate the parcel **verbs** with the parcel **interface** —
  only the verbs were dead).
- **In flight, do not collide** — the fire build (rewrites the
  maturation cellar and retires the air reserve) · the glass build
  (owns the `dip` collision's disposition) · the location-graph build.
