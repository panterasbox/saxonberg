# Controllers are input and output — requirements

**Kind:** refactor/sweep
**Leads from:** kernel. The first consumers are the kernel's own verbs (the
ones named under Goals). The packs follow trade by trade in later builds,
under the ratchets this build installs.

A command passes through seven links on the way from a typed word to a
changed world:

1. the interface that offers it;
2. the affordance that puts it in reach;
3. resolution, which decides what the target is;
4. the syntax the player types;
5. the shape of the controller;
6. the controller's job;
7. the act itself.

The owner's complaint covers every link. Controllers find their own
targets, decide rules, change state, and hide two acts behind one `if`.
Some grammars are belabored. Some interfaces exist only as method names
nobody declares, and some mixins are two ideas in one. When two things in
reach offer one word, the player has no way to say which one they mean.

This build fixes the shape of the whole chain. For each link it installs
a count that can only fall, then burns down the kernel's worst cases. The
test is the doctrine's own: **an author who writes a second controller for
the same verb, or a brain that performs the act for an NPC, gets identical
behavior by calling the same things, and is free to word it their own
way.**

Seeding slate: [controllers-are-io](../slates/builds/controllers-are-io-slate.md)
(the owner's brief, the scan results, the decisions, and the reuse ledger
for the plan). Prior design comes from:
[affordance-verb](../slates/tails/affordance-verb-slate.md) (source scoping
and the collision ladder),
[one-resolution-rule](../slates/builds/one-resolution-rule-slate.md),
[command-taxonomy](../slates/builds/command-taxonomy-slate.md) and
[verb-interfaces](../slates/builds/verb-interfaces-slate.md).

## What already exists

The scan (2026-11-05, recorded in the slate) found the following.

- **Verbs.** There are 371 command views and 445 words. Only three words
  are claimed twice: `lease` and `unlease`, which are never in reach
  together, and `pour`, which is one act with two instruments. Subcommands
  exist in 43 views, and per-subcommand controllers already work (`cockpit`
  routes seven). Options (`--name`) are supported and used by 69 views.
- **Dispatch.** The newest affordance is tried first. Shape errors and
  field refusals fall through to the next view. Nobody is told that a
  collision happened, and a player can be shown the refusal of the view
  they did not mean.
- **Acts on objects.** These have already moved:
  - cleanliness moved eating, strewing, sweeping and the bath;
  - the ceramics protocols put a plan, a refusal and an outcome on the
    object for ten verbs, with the duration on the object and also the
    words.
- **Gates.** The verb-collision gate holds collisions at three, and the
  reachability gate ensures every view is offered by something.
  - There is no gate for duck typing.
  - There is no gate for controllers that resolve their own targets. The
    one-resolution slate proposed it and it was never built, and the
    nearest gate counts one case where about thirty-four exist.
  - There is no gate for controller mutations.
- **In flight.** Three siblings overlap this build:
  - client-surface rewrites `look`;
  - water-supply touches `bank`, `wallet`, `title`, `clock`, `open`,
    `drink`, `fill` and `water`;
  - wizard-axis touches the workspace verbs and `reserve`/`treasury`.

**Therefore what is genuinely new here is:**
- source-scoped invocation (`verb@source`);
- the subcommand rule and its application to the kernel's switch
  controllers;
- one outcome convention across acts, with the words moving back to the
  controller;
- the five dated mixin splits;
- the gates for every link that lacks one.

Everything else is moving logic to homes that already exist.

## Goals

- **A player can name which thing's verb they mean**: `verb@source`, where
  the source is any MQL expression. An unscoped command behaves exactly as
  it does today.
- **When two things in reach offer the verb a player typed and the wrong
  one would answer, the player is told.** The reply names the other offer
  in its scoped form, so the refusal teaches the way out.
- **A crowded surface gets quieter.** Nouns you operate group their
  transactions as subcommands. Physical verbs stay plain English. Options
  replace preposition chains on the heaviest bench verbs. A word means one
  act wherever it appears, as a verb or as a subcommand.
- **Every kernel verb named here behaves identically after the move, and
  can be re-controlled.** The behavior covers state, refusals and duration.
  The verbs are `harvest`, `plant`, `put`, `order`, `treat`, `throw`,
  `read`, `fight`, and every subcommand of `wiki`, `party`, `chat`,
  `forum`, `pack`, `group`, `soul`, `bank`, `job`, `equip`, `tune` and
  `title`. Their rules, durations and state changes live with the objects.
  The controller reads input and writes words.
- **One act per verb.** A verb that hid several acts is split, and a verb
  that was one act on several kinds of object stays one verb. `throw`
  keeps its word in three shapes, each its own act: `throw X to Y` is a
  catch, `throw X` is a pitch, and `throw X at Y` is an attack. Reading a
  scroll to cast it splits from reading. `tan`'s lift is its own act.
- ⭐ **One view, one word** (owner, 2026-11-06). No command answers to
  more than one word. Every extra word a view claims today is deleted or
  becomes a **default player alias**. A default alias is part of each
  player's own alias set, and the player can remove it.
- **Breaking is accepted** (owner, 2026-11-06). Old command forms,
  saved scripts and player aliases that name a moved, renamed or deleted
  word may stop working. Nothing keeps an old form binding.
- **Interfaces say what they are.** The five mixins that a later build
  made into two ideas are split: organization, water place, metabolism,
  load-bearing and chattel. Anything already built keeps everything it
  composes. Protocols probed by name gain a declared marker when two or
  more unrelated things implement them. Names that nothing defines are
  fixed.
- **Every defect class at every link has a count that can only fall.**
  The pack burn-down then proceeds trade by trade without anyone having to
  remember where it stands.

## Non-goals

- **The pack burn-down**: Smelt, Fell, Saw, Butcher, Mow, Mill, Spin, Dye,
  Draft and the rest. These go to follow-on builds, one per trade or
  cluster, under this build's ratchets. They are listed in the slate's
  scan results.
- **`look`.** Client-surface is rewriting it. Its six append arms move to
  the objects in a follow-on once that build merges (the slate, under
  one-resolution-rule § 2).
- **Workspace verbs as subcommands** (`ls`/`cd`/`cat`/…). Wizard-axis is
  touching them. They stay in command-taxonomy item 8 until that build
  merges.
- **The other 40 mixins with split clusters.** They go to the mixin
  slate as a ranked list, split when a build touches them.
- **Chat mentions (`@name` in a message).** These go to the chat
  slate. This build only ensures that `@` glued to a verb never touches
  message text.
- **Renaming shipped British identifiers.** Nowhere, deliberately: that
  is a separate sweep.

## Placement

The kernel owns this build. Views in the platform pack change shape
(subcommands, options). Pack controllers are counted by the gates but not
burned down. Source scoping is part of the command line, so every pack's
verbs gain it with no pack change. A second scoped verb needs zero code.

## Collisions

- **`look`** (client-surface): it is excluded, see Non-goals.
- **`bank`, `wallet`, `title`, `clock`** (water-supply): these are
  subcommand-split targets. They are planned last in the build, and
  whichever build merges second reconciles. This build does not wait on
  water-supply.
- **Workspace verbs, `reserve` and `treasury`** (wizard-axis): these are
  excluded from regrouping. Only the count gates read them.
- **`fight`'s subcommands** (`disarm`, `sweep`, `switch`, `draw`,
  `defend`, `close`) are also top-level verbs. Each pair is decided as one
  act or two (see Surface decisions).
- **Scripts and aliases** players have saved that name a moved or
  deleted word. These break, deliberately (see Goals).

## Surface decisions

### Source-scoped invocation is `verb@source`

The forms are `set@watch 4:00`, `wind@"pocket watch"`,
`pour@me:flask into glass` and `wind@all watches`. On the command line, a
single quote is a literal apostrophe. When the scoped thing fits one of
the verb's object slots, it fills that slot, so `wind@me:watch` winds the
carried watch.

- The verb comes first because aliases, `help`, completion and scripts
  all start from the first word.
- `@` is free in MQL and in the shell. The EotL `::` reads as an empty MQL
  chain segment here.
- The scoped form is always optional.
- When several sources match, the player is asked which one. A script or
  NPC gets an error, never a hang.
- `@all …` applies the verb to each source.

### Which form a command takes

1. **A noun you operate takes subcommands, and each subcommand is its own
   act.** Examples are a bank, a wallet, a party, a chat, a wiki, a clock,
   a business seat, a title, a forme and a herd.
2. **An English verb on a physical thing stays flat**: `open door`, never
   `door open`. Un- and dis- pairs stay flat.
3. **Options carry manner, instrument and source** where prepositions
   pile up. A bench verb keeps one or two natural prepositions
   (`carve X from Y`) and takes the rest as `--with`, `--into`, `--on`.
4. **A subcommand word is scoped by its noun.** `wiki read`, `bank open`
   and `party show` keep their words, because the noun in front says
   which thing is meant, just as `@` does. A subcommand is renamed only
   where it conflicts with a meta verb (`make` is the script runner, so
   `chat make` becomes `chat create`). A subcommand that is the same act
   as an existing verb routes to that verb (`fight defend` is `defend`).
5. **One view, one word.** A command answers to exactly one word. A view
   that claimed several words keeps one. Each extra word is either
   dropped or kept as a default player alias, which a player can remove.
6. **One verb, several shapes, is allowed** when the shapes cannot be
   confused, each shape being its own act (`throw … to` / `throw` /
   `throw … at`).

### Who says it

An act answers with a reason and the facts. The controller writes the
words. An alternate controller may word everything differently and still
change nothing. Lens 2 decided this.

### How long it takes

The time an act takes is the act's, and so is the effort a body spends on
it. The controller only schedules it. Lens 2 decided this.

### When to split a mixin, when to mint a marker

- **Split** when the clusters share nothing and either no caller uses
  both or the verbs fall inside one cluster. The old name stays as the
  composition of the parts, so no content moves.
- **Mint a marker** when two or more unrelated things implement a
  protocol that something probes by name. Where a check already exists,
  use it instead.

## Lens pass

- **1 Pedagogy.** Mostly neutral. Scoped invocation and the "the other
  one is …" reply make the world's offers derivable: a player can see why
  the wrong thing answered and how to reach the right one.
- **2 Creative expression.** This is the build's point. An author can
  write an alternate controller or a brain for any moved verb and inherit
  the behavior. A pack author gets `@` scoping for free. A pack trade's
  model moving onto its objects is what lets a second venue be rows.
- **3a Immersion.** Durations and refusals stay where they were, so
  nothing a player sees changes except the new form and the reply that
  names the other offer. **3b Participation:** none.
- **4 Values.** The subcommand line (noun vs physical verb) is a taste
  call with no derivable answer. The owner decided it, and it is a
  **grain**: a pack may do otherwise with reason.
- **5 Continuity.** Verbs answer the same commands after the move. That
  is the build's acceptance, not merely a lens. Old words remain as
  aliases.
- **6 Economy.** None.
- **7 Governance.** None. No verb's permission changes. A wizard-only or
  seat-gated verb keeps its gate, and scoping never widens who may run
  what.

**Gap:** this build adds nothing a player will want for its own sake
beyond scoping and a quieter surface. Its value is to authors, and to the
follow-on builds it makes cheap.

## The drive

No step needs game time. The drive is entirely blocking, and **there is no
soak drive**. The plan names the concrete content for each step. Where a
step needs two objects offering one verb, the plan picks a pair that
exists, or stages one with wizard tools.

### Blocking drive

1. *(instant, player)* Carrying a watch and standing by a second
   timepiece that also offers `wind`, type `wind@me:watch`. **The watch
   is wound and the other is not.** `wind` alone still does what it did
   before.
2. *(instant, player)* With two watches carried, type `wind@watch`. **You
   are asked which watch.** Choose one, and that one is wound.
3. *(instant, staged)* A script runs `wind@watch` with two watches
   present. **It errors, and does not wait.** `wind@all watches` winds
   both.
4. *(instant, player)* `say@me hello` says hello exactly as `say hello`
   does. `wind@nonsense` refuses with a not-found message.
5. *(instant, player)* Where two things in reach offer the typed verb and
   the first one refuses, **the reply names the other offer in its scoped
   form**. The plan names the pair: `pour` before it unifies, or a staged
   pair.
6. *(instant, player)* `pour` from a jug into a glass and `pour` an
   ingredient at a bench are the same act. Each works with no scoping
   needed.
7. *(instant, player)* For each regrouped noun (`bank`, `party`, `chat`,
   `wiki`, `job`, `title`, …): every subcommand still does what it did, and
   `help <noun>` lists its subcommands.
8. *(instant, player)* In a fight, `disarm` and `fight disarm` are one act
   with one result. The same holds for the other overlapping pairs the plan
   resolves the same way. A pair resolved as two acts answers to its new
   name.
9. *(instant, player)* `carve` at the bench, written with its options,
   makes the same piece the old preposition chain made.
10. *(short, player)* Plant a seed in a bed, let it grow (staged forward),
    and harvest it. **The yield, grade, refusals and timing match the
    pre-build record.** The plan captures that record before W1.
11. *(instant, player)* `put` into a container, onto a surface, into a
    slot, and into a feeder: each lands as before.
12. *(instant, player)* `order` a drink, then `order` each of the six
    services: each is served as before.
13. *(instant, player)* `treat` a wound with a dressing, and an affliction
    with a remedy: same outcome as before.
14. *(instant, player)* `throw ball to Ann`, and Ann catches it. `throw
    ball`, and it lands. `throw ball at the target`, and it is an attack,
    with the consent gate where it applies. Each is its own act.
15. *(instant, player)* `read` a page, `read` a display, and cast from a
    scroll with its own command. Reading never casts.
16. *(instant, staged)* **The doctrine test.** A wizard installs an
    alternate controller for `harvest` that only words differently, and
    harvests with it. **The world ends in the same state as step 10, the
    words differ, and the duration is the same.**
17. *(instant, staged)* After the mixin splits, these **survive a
    restart** and read back the same: a business's call roster, a good's
    title and its crafted maker, a buoyant load in a water place, and a
    body mid-digestion.
18. *(instant, player)* A new character has the default aliases. A minted
    default alias (e.g. `l` for `look`) runs its verb. `alias unset l`
    removes it, and it stays removed across a restart. No command answers
    to a second word.

No new places are added, so there is no light step.

### Soak drive

None. Nothing in this build waits on the clock.

## Acceptance criteria

- Every blocking-drive step passes against a live world.
- **For every kernel verb this build moves, a person doing the same thing
  before and after sees the same state change, the same refusal reason
  and the same duration.** The words may only change where the outcome
  convention rewrote them, and those are listed in the MR.
- `verb@source` works for every verb in the game with no per-verb change.
- No view answers to more than one word. Every alias left in the game
  is a default player alias a player can remove.
- Within the kernel, no two flat verbs and subcommands that a player can
  reach share a word for two different acts. Elsewhere, the count falls
  and cannot rise.
- An alternate controller for a moved verb, written by an author,
  produces identical state.
- For each defect class (duck typing, self-resolution, controller
  mutations and decisions, hidden functions in controllers, split mixins,
  overlapping subcommand words), the count after this build is lower than
  the count in the slate's scan, and it cannot rise.

## Cross-references

- [controllers-are-io slate](../slates/builds/controllers-are-io-slate.md):
  brief, scan, decisions, and the reuse ledger.
- [affordance-verb slate](../slates/tails/affordance-verb-slate.md): Q3
  is settled as `verb@source`, and Q4/Q5 stand.
- [one-resolution-rule](../slates/builds/one-resolution-rule-slate.md) ·
  [command-taxonomy](../slates/builds/command-taxonomy-slate.md) ·
  [verb-interfaces](../slates/builds/verb-interfaces-slate.md) ·
  [mixin-slate](../slates/tails/mixin-slate.md)
- Subsystems: command-routing, command-parsing, command-spec, mql,
  response-envelope, mixins, activity.
- In flight: `reqs/water-supply`, `build/client-surface`,
  `reqs/wizard-axis-cleanup`.
