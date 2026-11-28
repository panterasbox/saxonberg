# Tropes, build 1 — requirements

**Kind:** feature
**Leads from:** kernel. **First consumer:** the hand-written characterization that ships today — the
blood gift, combat's unlawful kill and fair duel, the broken contract, the bad hand-feeding, petting,
introductions, and the placeholder dialogue's regard numbers (the terminal clerk, the counting-house
officer) — moved onto tropes in this build,
with today's behavior as the regression check. **The adopting consumer:** every trade and job
designed after it.

Today, changing who a character *is* — a trait, the regard others hold them in, their renown —
means a wizard writes a number into code at one site, and choosing a Discipline means writing its
name into code beside the act. That does not scale, it does not design, and it decides in the kernel
what is generous or cruel. This build installs the **primitives of plot** the platform owes content:
every act records who chose, what changed, for whom, at what cost, because of what, and who saw it;
a small descriptive vocabulary of **beats** reads those acts; **tropes** — rows with a cast, a plot of
beats, what they write and how they are told — turn beats into characterization. **The kernel holds
no moral opinion**: the readings live in an optional roster pack. And a gate makes the old way
unwriteable. Seeding slate: [tropes-slate](../slates/engine/tropes-slate.md) — the narrative frame
(§ 1), the census (§ 2), the rulings (§ 3), the beats (§ 4), the roster (§ 6), the path (§ 9), the
reuse ledger (§ 10).

## What already exists

The census of every act a body can perform (slate § 2), by kind of interaction:

- **Working matter alone** (smelting, forging, felling, sewing, cooking, the readings — the bulk of
  the game): earns Discipline credit; about half names it on a row (185 recipes, some joints, 27
  readings, a few hosts), about 100 places name it in code. Failure is almost never credited,
  abandonment never recorded.
- **Taking from the living, caring for a body** (milking, robbing a hive, suturing, operating,
  feeding): credit only; nothing records who was cared for.
- **Harm**: the accountability ledger records consent and blame, with no witnesses.
- **Exchange, promises, institutions**: the bank ledger (accounts, not people), chattel, contracts, a
  dozen institutional books.
- **Speech**: chat history; 23 hand-written regard numbers in dialogue — 15 of them in the lounge
  cast, where regard gates content (Dave's `warm` branch and the door north at regard ≥ 30).
- **No record ties one act's rows together**; the engine knows each act's cause while it runs and
  throws it away. Harm, death and chattel name their actor by *authorship*, which is the
  out-of-fiction labor plane — a defect.
- Players already read the results in `traits`, `chronicle`, `competence`, `standing`, `profile`.
- No sibling build in flight touches traits, regard, renown or advancement; two add places where
  work starts, which the actor rule must cover when they merge.

**Therefore what is genuinely new here is:** the act's cause and people on the ledgers that already
exist; the definition-named work record with failure and abandonment; the beat vocabulary; the trope
matcher; the roster pack; and the gate. The ledgers, the reads and the player verbs are reused.

## Goals

- **Every act knows who chose and because of what** — a typed command, a script, a scheduled
  continuation, an NPC's turn — and no work can start with nobody acting. A finished engagement is
  the end of the act begun at the choice, not a new one.
- **A trade names its Discipline credit on the definition its act already uses** — a recipe, a
  joint, a reading, the host's kind, an operation — never in code; failure is credited with its
  outcome, abandonment recorded, and the person worked on or for is on the record.
- **Every trait, regard and renown change comes from a trope**, and says which trope made it.
- **A content author changes who a character becomes by writing rows** — a trope over existing
  beats, an asserted beat in a dialogue choice, a telling — with no code.
- **One trope writes both halves**: the killer in plain sight loses compassion as well as the
  witnesses' regard.
- **Solitary work characterizes**: failing at hard work and later finishing it makes you more
  patient, wherever work can fail today (the glass bench); crafting's missing failure outcome is
  its own conversation.
- **The kernel holds no moral opinion**: without the roster pack installed, nothing characterizes
  anyone, and no trade or system pack depends on it.
- **The old way is unwriteable**: no trait, regard or renown write in code can merge; no new
  Discipline-by-name credit can merge.

## Non-goals

- **Attended human time as a choice's cost** → build 2 (slate § 3.8, § 9). Until then diligence and
  patience read outcomes only.
- **Regard derived from remembered incidents** → build 2 (§ 3.6). In this build regard is written as
  today — an overwritten number that cannot cite its act. Stated, not hidden.
- **The author surfaces** — *could fire here*, *has fired here*, the gap report → build 2 (§ 5), due
  before the first trade adopts tropes.
- **The beats whose facts are missing** — `take`, `return`, `flee`, `protect`, `discover`, `tell`
  beyond introductions, `befall` → build 2, with their tropes (§ 6 *Later*).
- **The lounge cast's motives and Dave's Bar's regard** → build 2, with derived regard: each of
  the cast read as a character — wants, what they notice and how they read it, taste — designed in
  its own conversation (slate § 3.11).
- **The remaining ~100 Discipline-by-name sites** → build 2's sweep, driven by this build's ratchet.
- **Collusion and Sybil rings pumping a trait** → inherited from measurement.md's open flank;
  recorded in the slate (§ 4b).
- **Telling a player a trope fired beyond the chronicle** → [narration-slate](../slates/engine/narration-slate.md).
- **Tropes sharing a cast as a quest** → [quest-modeling-slate](../slates/world/quest-modeling-slate.md).
- **Worldcrafting and governance in the narrative** → nowhere for now, deliberately: the labor plane
  mints nothing (§ 3.9).
- **Crafting's missing failure outcome** → its own conversation (the owner, 2026-11-28).
- **The roster's path to the polity** (tier B → tier C through the Compact) → slate § 1a; build 1
  must not close it off.
- **The transfusion's unreachable revival deed** → its own defect fix.

## Placement

- **The kernel** owns the mechanism: the actor and cause on every ledger, the work record, the beat
  vocabulary (detected beats are a closed kernel list), the matcher. All descriptive; no opinion.
- **A new optional roster pack, `morality-commons` at the root `/morality`** (slate § 1a — the trope
  is the platform's first prescriptive unit; everything below it is descriptive) owns every reading: the build-1 tropes and the asserted beats
  (*confess · slight · honor*). ⭐ **No load-bearing pack may depend on it** (the Nazi test, slate
  § 3.10) — a different community may ship a different roster. Its name and root are the plan's.
- **Trades** own their Discipline credit, on their own definitions.
- **Does a second instance need code?** A second trope: no — rows. A second asserted beat: no —
  rows. A new detected beat: yes, a kernel change, deliberately rare.

## Collisions

- ⛔ **Dave's Bar, the lounge cast, and the university's Katie are NOT touched.** Their regard
  numbers stand in for motives nobody could yet write down; they are redesigned as the cast's
  **motives** with derived regard in build 2 (slate § 3.11), never as a convenient consumer here.
  The lounge is the backstop, so it will depend on no roster pack.
- **The terminal clerk and the counting-house officer** (placeholder content): their dialogue regard
  numbers become asserted beats — the proof that a dialogue choice can assert one.
- **The blood bank**: the gift, answering the call, and the applause move to tropes.
- **Combat**: the unlawful kill and the fair duel move to tropes and gain the chooser's trait half.
- **The work board**: breach and fulfilment.
- **Kept animals**: petting and the bad meal; the bond's own mechanics stay.
- **Introductions**: the regard bump moves to *Making an Acquaintance*.
- **Every trade with a hand-written credit**: unchanged in behavior; counted by the ratchet. Rope's
  knots and the medicine operations move onto their rows now.

## Surface decisions

All settled in the slate; the product-level answers:

- **What an act is** (§ 3.3): one character's choice or one happening of fortune, with who chose,
  what changed and for whom, what it cost, whether it was free, what it follows from, and who saw it.
  Machinery (moving, crossing, picking up) is not recorded.
- **What names credit** (§ 3.2): the definition the act already uses; difficulty authored on it as a
  default that a model may measure over; failure credited with its outcome.
- **One mechanism** (§ 3.1): tropes are the only thing that characterizes — a solitary act is a
  trope with one role.
- **Beats** (§ 4): descriptive, few, with parameters and a price; detected beats are the kernel's,
  asserted beats are rows.
- **Tropes look back by asking the ledgers** (§ 3.4) — nothing is lost on a restart.
- **Tellings** (§ 3.4): a closing trope keeps its telling in the chronicle, in the fiction; the
  write is visible, never its value; it is announced only when surprising.
- **NPCs** are characterized by their acts like anyone.
- **`give` passes title by default** when the giver owns the thing (a gift); `give … --lend` hands
  it over and keeps title. Today `give` moves custody only.
- **The roster for this build** (§ 6): The Gift (blood; goods and money) · Answering the Call ·
  Murder in Plain Sight · The Fair Fight · Sparing the Yielded · The Broken Promise · The Word Kept ·
  Seeing It Through · Walking Off the Job · Tending the Stranger · Abandoning Ship · Pet the Dog ·
  The Bad Meal · Making an Acquaintance · The Confession · The Slight · The Courtesy.

## Lens pass

The full pass is slate § 4b. In short:

1. **Pedagogy** — traits become derivable; every write cites its trope and act. Cost makes the
   catalog safe to publish openly.
2. **Creative expression** — the ordinary case is rows. Gap: authors write tropes blind until build
   2's surfaces.
3. **Immersion / participation** — one trope, both halves; tellings stay in the fiction and obey the
   reading rules. Gap: collusion and alts, inherited.
4. **Values** — the kernel holds no opinion; the roster is a pack and says what it values.
5. **Continuity** — acts record what changed, not what it meant; any roster can re-read them.
6. **Economy** — nothing produced or consumed; once traits gate anything economic, real cost is the
   only defense against farming.
7. **Governance** — the criterion is a readable row; every write cites its act; the intrinsic layer
   has no adjudication by design, the social layer is where appeal belongs.

## The drive

### Blocking drive

| # | pace · assert | step | should see |
|---|---|---|---|
| 1 | instant · player | Give blood in an ordinary week; `traits`, `chronicle`, `standing`. | Generosity up; the applause in standing; same sizes as today. |
| 2 | instant · staged | Stage the bank short; give blood. | *Answering the Call*: compassion up as well. |
| 3 | instant · player | `give` a good to another player; then sell the same kind of good. | The gift: the giver's generosity, the receiver's regard. The sale: nothing. |
| 4 | instant · player | `pay` another player with no sale or contract. | *The Gift* for the payer. |
| 5 | short · staged | Two players fight a consented duel to a yield, a third watching; the victor spares. | *The Fair Fight* (boldness; the watcher's regard) and *Sparing the Yielded*. |
| 6 | instant · staged | A player kills an unconsenting NPC with a witness present. | The killer's compassion down **and** the witness's regard down. |
| 7 | short · player | Claim a job and let it lapse; claim and fulfil another. | *The Broken Promise* and *The Word Kept*. |
| 8 | short · player | At the glass bench, fail a hard piece of work, then finish one of the same kind. `competence`, `traits`. | The failure credited with its outcome; *Seeing It Through* — patience and diligence. |
| 9 | instant · player | Start a piece of work and walk away from it. | *Walking Off the Job*. |
| 10 | instant · player | Tie a knot; `competence`. | Ropework credited from the knot's own row; same as today. |
| 11 | short · staged | Treat a wounded stranger (a staged NPC patient). | *Tending the Stranger*: the helper's compassion, the patient's regard; the patient is on the record. |
| 12 | instant · player | Pet a kept animal five times; hand-feed one something that sickens it. | *Pet the Dog*, each smaller; *The Bad Meal*: the animal's regard down, no trait. |
| 13 | instant · player | Introduce yourself to the terminal clerk; take a courteous choice, a rude one, and a confession. | Regard moves as before; the confession fires *The Confession*. |
| 14 | instant · staged | An NPC gives a good to a player. | The NPC is characterized like a player. |
| 15 | short · staged | Start work that finishes later while the player idles; read who it is attributed to. | The finish is the end of the player's act, attributed to the player, its cause the original choice. |
| 16 | instant · staged | Remove the roster pack; give blood. | Nothing characterizes anyone; every trade still works. |
| 17 | instant · staged | **Restart the world.** `traits`, `chronicle`, `standing`, `competence` for the drive's characters. | Every write is back, tagged with its trope; a look-back trope still completes across the restart. |
| 18 | instant · player | Look at the bank, the work board, the forge and the terminal in their own light; talk to Dave in the lounge. | Lit and described as before (no new places); Dave's dialogue and regard exactly as today. |

### Soak drive

| # | pace | step | should see |
|---|---|---|---|
| S1 | span | Give blood every eight weeks for a game year. | Generosity rises and diminishes as the dial says; no drift. |
| S2 | span | Pet the same animal daily for a season. | The curve flattens; the bond grows by its own mechanics. |

## Acceptance criteria

- Every trait, regard and renown change a player can cause names the trope that made it, and every
  trait change traces to the act behind it.
- The replaced behaviors (blood gift, answering the call, unlawful kill, fair duel, contract breach,
  bad meal, petting, introductions, the placeholder dialogue) move the same people the same direction, at
  about the same size.
- Killing in plain sight changes the killer's character, not only the witnesses' opinion.
- Failing at hard work and then finishing it makes a character more patient, wherever work can fail.
- A work act that finishes later belongs to the choice that began it, and to the person who made it.
- A trope added as rows only works with no code change.
- A dialogue choice asserting a beat fires tropes exactly as a detected one would.
- The lounge and Dave's Bar behave exactly as today.
- NPCs are characterized by their acts.
- With the roster pack absent, nothing characterizes anyone and every trade still runs.
- After a restart, every trope write is there, and a trope that looks back still completes.
- No hand-written trait, regard or renown write can merge — except two named, counted residuals:
  the lounge's dialogue regard effect (untouched until motives) and the hand-fed bond's regard
  (bond mechanics, not a reading); no new Discipline-by-name credit can
  merge; rope's knots and the medicine operations credit from their rows.

## Cross-references

- Seeding slate: [tropes-slate](../slates/engine/tropes-slate.md)
- [trait-slate](../slates/engine/trait-slate.md) · [quest-modeling-slate](../slates/world/quest-modeling-slate.md) · [narration-slate](../slates/engine/narration-slate.md) · [lineage-slate](../slates/society/lineage-slate.md)
- [measurement.md](../measurement.md) (the reading rules, the two layers) · [trait.md](../subsystems/trait.md) · [advancement.md](../subsystems/advancement.md) · [belief.md](../subsystems/belief.md) · [renown.md](../subsystems/renown.md) · [accountability.md](../subsystems/accountability.md) · [chronicle.md](../subsystems/chronicle.md)
