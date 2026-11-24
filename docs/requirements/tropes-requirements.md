# Tropes — requirements

**Kind:** feature
**Leads from:** kernel. **First consumer:** the hand-written characterization writers that ship today — the blood gift, the killing in front of witnesses, the fair duel, the broken contract, the bad hand-feeding, and the lounge cast's dialogue regard effects — moved onto tropes in this build, with today's behavior as the regression check.

Today, changing who a character *is* — a trait, the regard others hold them in, their renown — means a wizard writes a number into code at one site. That does not scale and it does not design: every site is instrumented by hand, writes half of what it should (combat moves regard, never the killer's character), and nobody can see the whole set. This build puts the framework in place that every later trade and job uses instead: **the engine records what changed; a small kernel vocabulary of plot beats reads those changes; tropes — content rows with a cast and a short plot — turn beats into trait, regard and renown writes.** It also makes the old way unwriteable: a gate counts the hand-written writes and holds them at zero. Seeding slate: [tropes-slate](../slates/engine/tropes-slate.md) (§ 9 build 1; reuse ledger § 10).

## What already exists

- **Traits** ([trait.md](../subsystems/trait.md)): 19 opposed pairs, an evidence ledger, derive-on-read positions; players read them with `traits`, `chronicle`, `profile`.
- **Disciplines** ([advancement.md](../subsystems/advancement.md)): read with `competence`. Credit is already **data** on recipes (185 rows), on some joint rows, and on 27 reading rows. But about 100 code sites credit a Discipline by literal name or module constant — rope's `ropework`, nursing, seamanship, geology, the trade packs' acts.
- **Regard** ([belief.md](../subsystems/belief.md)): a per-viewer number. Five code sites write a constant (contract breach −15, unlawful kill −20, duel win +2, hand-feeding, petting, introductions), and 23 dialogue effects in the lounge cast's trees write raw numbers. No verb shows a player their regard.
- **Renown** ([renown.md](../subsystems/renown.md)): read with `standing`. Only the blood gift writes it outside seeding.
- **Traits are written in exactly one place:** the blood gift's constant (generosity, plus compassion when the bank names a shortage).
- **The facts a beat reads are already recorded at single chokepoints:** money (the bank ledger), title (chattel), harm and death (conditions, the accountability ledger), contracts (fulfil, breach), engagements (the scheduler). Several do not yet know who is acting.
- **Nothing named act, beat or trope exists**, and there is no event bus. Quest-modeling, narration, trait and lineage slates all point here and are unbuilt or partial on this question.
- **In flight:** no sibling branch touches traits, regard, renown or advancement. organism-biology moves one Discipline difficulty onto data; two siblings add `runRoot` sites — the actor rule below must cover them on merge.

**Therefore what is genuinely new here is:** the act record at the chokepoints with a guaranteed actor; the beat vocabulary; trope rows and their matcher; and the gate. The ledgers, the reads and the player verbs are all reused unchanged.

## Goals

- Every characterization write — trait, regard, renown — comes from a trope, and each write says which trope made it.
- A content author can change who a character becomes **by writing rows**: a new trope from existing beats, or a beat asserted in a dialogue choice, with no code.
- Every act the engine records knows who did it — a typed command, a script, a scheduled tick, an NPC's turn — and work cannot start with nobody acting.
- The six shipped writers behave as they do today (same direction, same rough size), now through tropes, and their hand-written writes are gone.
- One trope writes **both** halves: the actor's traits and the witnesses' regard. The killer in plain sight loses compassion as well as the witnesses' regard.
- Repeating a trope on the same target gives less each time (petting a dog a hundred times is not a hundred kindnesses).
- New trades and jobs cannot reintroduce hand-written characterization: a gate holds trait, regard and renown writes in code at **zero**, and holds hand-written Discipline credit at **today's count, falling** (rope's `ropework` moves onto the knot rows in this build).

## Non-goals

- **The author surfaces** — *could fire here*, *has fired here*, the gap report → the second tropes build (tropes-slate § 5).
- **Tropes that span several commands or game days** (sequences, absences, windows on the clock) → the second tropes build. This build matches the acts of **one** command, tick or NPC turn.
- **The helping and deception families** (the Good Samaritan, False Friend, Mercy Kill) — the world does not record their facts → the second tropes build, each with its missing fact.
- **Escalating shared-cast tropes into a quest** → [quest-modeling-slate](../slates/world/quest-modeling-slate.md).
- **Telling a player a trope fired** → [narration-slate](../slates/engine/narration-slate.md). In this build the effect is visible only through the existing `traits` / `chronicle` / `standing` reads.
- **Moving the remaining ~100 hand-written Discipline credits onto rows** → a sweep build of its own, driven by the ratchet this build installs; tropes-slate records it.
- **Content adding beats** → stays a closed kernel list for now; who may hold that pen later is a tropes-slate open.
- **Regard becoming a derived ledger** → trait-slate open; this build keeps regard as it is.
- **How much one act may write** (trait-slate's denominator) → the dials stay at today's sizes; the question stays in trait-slate.
- **The transfusion's unreachable revival deed** → its own defect fix (filed as an issue).

## Placement

- **The kernel** owns the act record, the actor rule, the beat vocabulary and the matcher — everything that sits at an engine chokepoint, because only the engine may fire an act.
- **A new system pack at `/system/narrative`** owns the trope rows and their wiki pages. Characterization is true whether or not anyone is taking part, which is the `/system/` test. A realm or trade may ship tropes of its own in its own pack.
- ⭐ **A second trope needs no code** — rows over the existing beats. A new beat does need a kernel change, deliberately.

## Collisions

- **Dave's Bar / the lounge cast** (Augie, Dave, Sloane, Mara, Remy and others): 23 dialogue regard effects become asserted beats. Their conversations must feel the same — the same choices raise and lower the same people's regard.
- **The blood bank** (DonationBank and its donors): the gift and *answering the call* move to tropes; the applause stays.
- **Combat**: the unlawful-kill and duel-win regard moves to tropes, and each gains the actor's trait half.
- **The work board** (contracts): breach and fulfilment.
- **Kept animals**: the bad-meal and petting regard; the bond itself stays mechanics.
- **Introductions**: the bump stays as mechanics of meeting (not characterization) unless the census says otherwise — the plan decides with the gate's census.

## Surface decisions

### What is in a trope row
A name, a **cast** (roles, each narrowed by what it must be able to do), a **plot** of beats over those roles (including *never* beats — no payment), what it **writes** (traits for named roles, regard from witnesses or a role, renown), and a **reference** to where the idea came from. Names borrow well-known trope names where players know them; every definition is our own writing (TV Tropes' license forbids copying text).

### The beat vocabulary, this build
give · exchange · take · return · harm · kill · yield · spare · promise · keep · break · confess — closed, kernel-defined, each with fixed roles. Authors write in beats and roles, never in the facts beneath them.

### Asserted beats
Where the world cannot see what happened, content **asserts a beat, never a trope**: a dialogue choice says *this is a confession, by the player, to the speaker*. The matcher treats an asserted beat exactly like a detected one.

### Who counts as a witness
Whoever could perceive the place when the act happened, captured with the act (today's combat already computes this and throws it away).

### NPCs
NPC acts fire tropes and write their traits like anyone's. Bodies acting are bodies acting.

### Visibility
A trope's trait write appears in `traits` and `chronicle` tagged with the trope's name; renown in `standing`. No new verb.

### The starting roster (ships in this build)
The Gift (blood) · Answering the Call · The Gift (goods) · The Gift (money) · Murder in Plain Sight · The Fair Fight · Sparing the Yielded · The Broken Promise · The Word Kept · Pet the Dog · The Bad Meal · The Confession (asserted). *Abandoning Ship* if its fact proves recorded at the chokepoint; otherwise it moves to the second build.

## Lens pass

1. **Pedagogy** — a small closed beat vocabulary is learnable and derivable: a player can work out why giving blood made them more generous. Disciplines are untouched except that rope's credit becomes data.
2. **Creative expression** — the ordinary case (a new trope, a dialogue confession) is rows only; the bespoke case (a new kind of beat) is a kernel change, deliberately rare. Gap: authors can't yet *see* what would fire in their content — the second build's surfaces.
3. **Immersion / participation** — one trope writes both halves, so the fiction can't contradict itself (witnesses despise a killer whose character is unchanged). Participation: players can farm a trope — diminishing repetition is the answer; extortion read as a gift is the open intent risk, unaddressed because the matcher only reads what a beat can see.
4. **Values** — which acts make someone *more compassionate* has no derivable answer; the roster decides it and says so, and every write names the trope that decided it, so it can be argued with.
5. **Continuity** — acts record what changed, not what it meant, so they survive any re-reading; a gift is a gift in every epoch.
6. **Economy** — produces no goods; consumes nothing. Who pays: nobody. The demand was there first — lineage needs trait leanings per workplace.
7. **Governance** — a trope judges a person. Criterion: the trope's row, readable. Appeal: none in this build (gap — narration and the author surfaces are where it becomes contestable). Entrenchment: tier B (whoever ships the pack), since the rows are content.

## The drive

### Blocking drive

| # | pace · assert | step | should see |
|---|---|---|---|
| 1 | instant · player | Give blood at the bank in an ordinary week; `traits`, `chronicle`. | Generosity up, the chronicle line names *The Gift*. Same size as today. |
| 2 | staged · staged | Stage the bank's stock short; give blood. | Generosity and compassion up, named *Answering the Call*; the applause still lands in `standing`. |
| 3 | instant · player | `give` a good to another player. `traits` for the giver. | Generosity up, *The Gift*; the receiver's regard for the giver up. |
| 4 | instant · player | Sell the same good for money instead. | No gift fires — an exchange. |
| 5 | instant · player | `pay` another player with no sale or contract. | *The Gift* (money) fires for the payer. |
| 6 | short · staged | Two players fight a consented duel to a yield while a third watches; the victor spares the yielded. | *The Fair Fight* (victor's boldness, the watcher's regard up) and *Sparing the Yielded*. |
| 7 | instant · staged | A player kills an unconsenting NPC with a witness present. | *Murder in Plain Sight*: the killer's compassion down **and** the witness's regard down — the half that never moved before. |
| 8 | short · player | Claim a job from the board and let it lapse; then claim and fulfil another. | *The Broken Promise* (constancy down, the issuer's regard down); *The Word Kept*. |
| 9 | instant · player | Pet a kept animal five times. | *Pet the Dog* each time, each smaller than the last. |
| 10 | instant · staged | Hand-feed an animal something that sickens it. | *The Bad Meal*: the animal's regard down, no trait change. |
| 11 | instant · player | Talk to a lounge NPC and take the choice that used to raise regard; then one that confesses. | Regard moves as before; the confession fires *The Confession*. |
| 12 | instant · staged | An NPC performs an act (staged: an NPC gives a good to a player). | The NPC's trait changes like a player's would. |
| 13 | instant · staged | A scheduled tick acts on its own (an engagement completing while the player is idle). | The act is attributed to the right actor, not to nobody. |
| 14 | instant · staged | **Restart the world.** `traits`, `chronicle`, `standing` for the drive's characters. | Every write from steps 1–12 comes back, still tagged with its trope. |
| 15 | instant · player | Look at the bank, the board and the lounge in their own light. | No regression: lit, described as before (no new places in this build). |

### Soak drive

| # | pace | step | should see |
|---|---|---|---|
| S1 | span | A character gives blood every eight weeks for a game year. | Generosity rises and the repeat diminishes as the dial says; no drift. |
| S2 | span | Pet the same animal daily for a season. | The diminishing curve flattens; the bond still grows by its own mechanics. |

## Acceptance criteria

- Every trait, regard and renown change a player can cause in the shipped game names the trope that made it.
- The six shipped behaviors (blood gift, answering the call, unlawful kill, duel win, contract breach, bad meal) and the lounge dialogue move regard and traits in the same direction and at about the same size as before.
- Killing in plain sight changes the killer's character, not just the witnesses' opinion.
- A new trope over existing beats works when only rows are added — demonstrated by one roster trope added last with no code change.
- A dialogue choice can assert a beat, and it fires tropes exactly as a detected beat would.
- An NPC's acts characterize the NPC.
- After a restart, every trope-made write is still there.
- No new hand-written trait, regard or renown write can be merged; no new hand-written Discipline credit can be merged; rope's knots credit `ropework` from their rows.

## Cross-references

- Seeding slate: [tropes-slate](../slates/engine/tropes-slate.md) (§ 9; reuse ledger § 10)
- [trait-slate](../slates/engine/trait-slate.md) · [quest-modeling-slate](../slates/world/quest-modeling-slate.md) · [narration-slate](../slates/engine/narration-slate.md) · [lineage-slate](../slates/society/lineage-slate.md)
- [trait.md](../subsystems/trait.md) · [advancement.md](../subsystems/advancement.md) · [belief.md](../subsystems/belief.md) · [renown.md](../subsystems/renown.md) · [accountability.md](../subsystems/accountability.md) · [measurement.md](../measurement.md)
