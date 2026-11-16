# Live instance testing slate — the world that is never wiped, and what it lets us test

> **Status: UNBUILT** — talked through 2026-11-16 with the owner, from the soak worktree, while the
> lane's first repair (!586) was verifying. Nothing ships. What it composes: the soak lane and its
> runner ([soak-lane](../tails/soak-lane-slate.md), [testing.md § The soak
> lane](../../testing.md)); the clean/dirty drive split; the prod image box
> ([deployment.md](../../deployment.md)); the persistence spine and its drift guard
> ([persistence.md](../../subsystems/persistence.md)); the press ticker
> ([press.md](../../subsystems/press.md)).
> **Left:** agent residents (§ 5b) · the test harness OFF on the live instance · snapshot + restore of the live database ·
> the snapshot copied into the soak lane · migration rehearsal and its loss record · the post-deploy
> clean-drive check · observation probes · resident test characters · the appeal path for migration
> loss
> **Size:** a build

## 0. The ask **[DECIDED — the owner]**

*"We are soon going to have a long running shared instance of the game, probably sometime after
new years. Right now we blow away the db every night but soon we're not going to be doing that
because I want to use the actual demo instance to drive my live stream. This means we have an
environment that's supposed to be more or less stable at least around a few core experiences like
chat and navigation and some of the other things we're prioritizing this month and next. … Once
that instance is live, do we want to use it to do some of these longer running test scenarios,
maybe even longer running than a single claude session."*

And on the two things that decide the shape:

- **Pace.** *"It's 12x everywhere until we decide that number should be changed. Personally I've
  pondered going down to 6x but not seriously."*
- **Migrations.** *"We'll be doing migrations but with the caveat that we're in beta and the
  migrations might just not work right and appeals have to go through the governance process at
  whatever rate they can be consumed."*

## 1. ⭐⭐⭐ The live instance tests AGE, not time **[LEAN — the core]**

Every world any test has ever seen is at most a day old: the soak lane drops its database before
every file, and the dev worlds are wiped nightly. The live instance is the first world that will
**grow old**, and the defects that only age reveals have nowhere else to show:

- **Accumulation** — ledgers, map documents, chronicles, logs, residency's cold tail: anything that
  grows without a bound we have measured.
- **Restarts, again and again** — state that survives one restart and not the fortieth. Shipped
  precedent: worn owned goods lost across a restart (rubber), identity keys that did not survive one.
- **Time-driven mechanics nobody has watched end to end** — estates going dormant, credit defaults
  revealed, a fishery's recovery, a herd's drift, a coppice's rotation, a cellar's year.

So the lanes split by what they test, not by how long they take:

| lane | world | tests | the clock |
|---|---|---|---|
| blocking drives | fresh, per build | the feature works | real, short steps |
| soak lane | fresh, one per dirty file | the span works | jumped |
| ⭐ live instance | **aged, never wiped** | the world survives living | **never touched** |

⛔ **The soak drives do NOT move to the live instance.** Every one of them bends the world to test
it: it jumps the global clock (a stream watching a season pass in a second), consumes shared stock,
fills books, and starts from a dropped database. The live instance is the stream's stage.

## 2. ⭐⭐ The arithmetic of 12x **[DECIDED — the pace; the consequences derived]**

At 12x a game day is two real hours, a 90-day season about a real week, a 360-day year **a real
month**. A month of watching the live instance is a full agricultural year — the winter freeze, the
cask's maturation, the herd's breeding, the harvest — without one jump. At 6x it is two months:
still fine, but the first answer to *"does winter break something"* comes twice as late. That is a
consequence for the owner's pace question, not an argument in it — the pace is decided by play
(the [pace slate](./pace-slate.md)), and the tests read whatever it
is.

## 3. ⭐⭐ The harness is OFF, as configuration **[LEAN]**

The `testharness` verb, `/auth/test-clock` and every staging tool (eval over the Apis, test-runner
parcels, the weather pin) must be **absent** on the live instance — refused by configuration at
boot, not by anyone remembering. ⚠ A test tool that can jump the global clock is a griefing tool on a
shared world; this is a safety property first and a testing one second. Open: one flag that withholds
the whole `testharness` category, or the deploy manifest naming what boots.

## 4. ⭐⭐⭐ Observation probes **[LEAN]**

A probe is a **read-only** check of the living world, run on a schedule: it asks, it never stages,
and the world's own clock supplies the time. The shape is the soak runner's — a script that spends no
tokens, and files a `live` issue when a probe trips, which wakes Claude to triage. ⭐ This is the
answer to *"longer than a single claude session"*: **no session needs to last a month.** The script
runs indefinitely; a session is only ever the triage of one trip.

First probes, grown one subsystem at a time:

- **Health** — the event-loop lag and the process's memory over days (the shape of a leak is a
  slope, and only a long run has one); `/healthz`.
- **Conservation** — money in circulation against the ledger's issuance (banking's chokepoint makes
  this checkable); every character loads.
- **Living things** — the herds are not extinct; the fisheries are not emptied by the brains; the
  wood regrows.
- **The core experiences** — chat answers, `go` and `route` answer (the clean drives for these run
  read-only; § 6).
- **Growth** — collection sizes and their slope (a collection with no bound we chose is a finding).

⚠ What a probe may **assert** is a design question per subsystem: a herd *may* legitimately die out
if nobody tends it. A probe states its assumption ("the Delight herd is tended by its staged hand")
the way a route plan states its hypotheses — a trip is then either a defect or a false assumption,
and the triage says which.

## 5. ⭐⭐ Resident test characters **[LEAN; visibility DECIDED]**

A handful of accounts that **live** in the world and do small things on its clock: tend a plot, keep
a cask, hold an account, rent a room. A light script logs each in once a real day, does a chore, and
checks the result — a soak drive at real speed, aging alongside everyone else. They catch what a
probe cannot: the path a *player* walks through an aged world (the plot whose soil a year of
harvests depleted; the account whose terms changed under it).

⭐ Not [live-drive](./live-drive-slate.md): that is an *agent* playing on the stream. These are
scripts, deterministic and boring on purpose.

**Visibility — DECIDED (the owner, 2026-11-16):** every test character, scripted or agent, is
**marked internally**, always; whether a *player* sees the mark is **a spoiler, answered by the
spoiler system** ([spoiler-slate](../tails/spoiler-slate.md)) like any other — on the appetite
axis, as paths are: kept and tagged, hidden by default, one click to see, never prevented. The mark
is what lets the engine and the polity treat these characters differently; the spoiler system only
decides who looks at it.

## 5b. ⭐⭐⭐ Agent residents — a newcomer's eyes, not a population **[LEAN; talked through 2026-11-16]**

The third kind of character in the live world, between § 5's scripts and
[live-drive](./live-drive-slate.md)'s agent on the stream: a few characters played by an **LLM
agent** that hold a **long goal** (own a parcel; run a stall that turns a profit; hold an office)
and pursue it on the world's own clock. At 12x a real month is a game year, the scale such goals
need.

**What the word "playtester" buys, and what it does not.** A playtest yields three things; an agent
gives one, half of another, and none of the third:

1. **Where the game breaks or confuses** — yes, and well. The agent has read every MUD manual and
   every real textbook on the trades; if it cannot work out from `help` and the room how to do a
   thing, a new player very likely cannot. Its confusion is evidence about discoverability.
2. **Whether it is fun** — half. It is never bored and its time costs nothing, so it cannot report
   tedium as a feeling; it *can* report effort as a count (*the third loaf took 14 commands and 2
   game days; I repeated this sequence 9 times*).
3. **What the population will do** — no. N agents on one model are one mind in N hats: cooperative,
   uninterested, unaggrieved. No economic or political outcome they produce is evidence about
   people. The governance experiment needs humans.

**The rules:**

- **They play through the player's socket only** (`packages/wire`): no eval, no source, no database,
  no help beyond the in-game one. The evidence firewall applies to the tester — an agent that can
  read the code is auditing, not playing.
- **⭐ Derivability is the headline test** (lens 1). The agent carries real-world knowledge, so a
  failure sorts three ways: the world departs from reality (a design finding), the world is right
  but hides the way (a discoverability defect), or the agent was wrong about reality (nothing). No
  other studio can run this test; their worlds are not meant to be derivable.
- **Short sessions, long goals** — § 4's principle: no session lasts a month. An agent logs in once
  a real day, reads its memory, pursues its goal for a fixed budget of turns, writes a report and
  logs out. Its memory lives **in the game** where it can (`recall`, notes it keeps), so the
  memory tools are tested too.
- **The output is reading, not pass/fail:** a **friction log** (*wanted X, tried A, B, C; help said
  Y*) — the main product; bugs as issues with the transcript (the bug docket); **goal progress
  against game time** (*a month earned 40 coins; a plot costs 4,000*), a balance signal read with
  limb 3 in mind.
- **⭐ Agents explore; scripts guard.** When an agent finds a path that matters, it is frozen into a
  § 5 script or a § 4 probe. The two kinds of resident stay separate: scripts are cheap and
  deterministic and a trip is a defect; agents are expensive and nondeterministic and produce
  reports.
- **Personas differ by what they know:** a player who has never seen a MUD; a MUD veteran with
  Diku habits; a domain expert (a real brewer). ⛔ **The adversary** — red-teaming the economy,
  hunting exploits, gaming the counts, where LLMs are genuinely strong — plays the **snapshot in
  the soak lane** (§ 8), never the live world.
- **A budget the owner sets** — tokens per character per day, fixed, like the soak runner's.

**⭐⭐ Standing — they EARN it (the owner, 2026-11-16).** An agent resident accrues standing,
renown, money and labor credit like anyone: that accrual is part of what is being measured (*can a
newcomer earn a voice, and how fast?*). The internal mark (§ 5) is what makes it governable
afterward — the engine measures, the polity decides (lens 7). ⚠ The Compact is players-only **by
arithmetic** ([identity.md](../../subsystems/identity.md)), so what an agent's accrued standing
*does* at a tally is a real open question, not a default: counted, discounted, held in escrow, or
excluded at decision time. Likewise the conservation probe (§ 4) reads the marked ledgers so it can
tell the agents' money apart.

## 6. ⭐⭐ The deploy check **[LEAN]**

After every deploy and before the stream goes live: the **clean** drives — chat, navigation, login,
the arrival — run against the live instance. A clean drive consumes nothing by construction (that is
what *clean* means), so it is safe there; a dirty one never is. Plus the canary. A red check is a
rollback (the prod box's rollback is a prior image tag — [deployment.md](../../deployment.md)).
⚠ Every clean drive's character is a new account on a persistent world; the check signs them out and
the world keeps them. Decide whether they are the resident characters (§ 5) reused, or a reaping
policy.

## 7. ⭐⭐⭐ Migrations — best effort, rehearsed, with a loss record **[DECIDED — the owner's policy; the rehearsal LEAN]**

The owner's policy: migrations happen; in beta they may not work right; **appeals go through the
governance process at whatever rate it can consume them.** That ends *no migrations ever* for this
instance (the end [distribution-and-hosting § 7](./distribution-and-hosting-slate.md) foresaw — "real
migrations once the world holds what people would be angry to lose").

What the lanes add to that policy:

1. **Rehearsal.** Before a deploy that migrates: copy the live database into the soak lane, run the
   migration there, then run the **invariants** (money conserved; every character loads; titles and
   chattel reconcile; herds and stores accounted for), the clean drives and the probes against the
   migrated world. A loss found there is fixed before a player ever has it. ⭐ Appeals become the
   backstop for what slips through, not the first line.
2. **⭐⭐ The loss record.** A migration writes down exactly what it could not carry: *these items had
   no new home; these accounts had a field it could not read; whose each was.* That is the input
   governance needs — an appeal heard against a record, not against a player's memory. It is the
   measurement doctrine's split: **the engine measures** the loss, **the polity decides** the remedy.
3. **The volume as a gate.** The rehearsal's loss record is a number before it is a backlog: a
   migration that would lose 400 things, against an appeals process that clears ten a week, is a
   reason to hold the deploy. The gate is the owner's to set (lens 4, values), not the engine's.

⚠ Shipped precedent worth keeping: the persistence drift guard already heals one class *with no
migration* — a field that stops being declared persistent is ignored on restore and re-supplied by
the row ([persistence.md](../../subsystems/persistence.md)). Part of the migration story is
**choosing shapes that self-heal**, so fewer changes need a migration at all.

Open: whether the loss record is a Document under the governance tree, a press release, or an issue
in the tracker; who files the appeal (the player, or the record files it for them).

## 8. ⭐⭐ The snapshot, both ways **[LEAN — the first thing to build]**

The one piece every other section stands on:

- **Out** — a snapshot of the live database on a schedule and before every deploy, and a **restore**
  that has been rehearsed (an untested backup is a hope). ⚠ The dev cluster is Atlas M0, which has no
  managed backups; the live instance's database tier is a deployment decision this slate forces.
- **Into the soak lane** — the same snapshot loaded as `saxonberg_soak`, so the soak lane can run its
  dirty drives against a **real aged world** as well as a fresh one. ⭐ This is probably the single
  most valuable thing here: *passes on a fresh world, breaks on a three-week-old one* is exactly the
  defect class nothing can see today.

⚠ Privacy: a copy of the live database is player data. It stays on the box (the soak worktree is on
the same host), is never pushed anywhere, and the soak lane's issues quote drive records, not rows.

## 9. Sequencing

Nothing here is needed until the live instance is near (after New Year). When it is: **§ 8 (snapshot
+ restore + copy into soak) → § 3 (harness off) → § 6 (deploy check) → § 7 (rehearsal + loss
record)** before the first migrating deploy; probes (§ 4) and residents (§ 5) grow after, one
subsystem at a time, starting with the core experiences the stream depends on.

## 10. The lens pass

- **1 pedagogy** — neutral; it protects the worlds the teaching happens in.
- **2 creative expression** — the loss record protects what players *made* across a migration; the
  aged world is where personalization (a derivative of supply-chain depth) actually accumulates.
- **3a immersion** — the harness off (§ 3) is immersion's floor on a shared world; whether a player
  sees a resident's mark is the spoiler system's answer (§ 5).
- **3b participation** — appeals through governance make migration loss a thing the polity handles,
  not a support ticket.
- **4 values** — the loss-volume gate (§ 7.3) and what marked standing does at a tally (§ 5b) have no derivable
  answer; both are the owner's.
- **5 continuity** — a migration is continuity's test made literal: *does the new object answer the
  same commands*; the rehearsal runs exactly that test.
- **6 economy** — conservation is the first probe; a migration that mints or burns money is a defect
  by construction.
- **7 governance** — appeals judge a PERSON's loss: the criterion is the loss record, the appeal is
  the governance process, the entrenchment tier of the policy is the owner's (Tier B — whoever ships
  the code).

## 11. Open

- The harness-off mechanism (§ 3).
- What a marked character's accrued standing does at a tally — counted, discounted, escrowed, or
  excluded at decision time (§ 5b); it is earned regardless.
- Agent residents: how many, which goals and personas, the daily token budget (§ 5b).
- Where the loss record lives and who files the appeal (§ 7).
- The live database tier and its backups (§ 8).
- Whether a probe trip files in the same tracker label as soak (`soak`) or its own (`live`).