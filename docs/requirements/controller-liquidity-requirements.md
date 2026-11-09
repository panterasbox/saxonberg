# Controller liquidity — requirements

**Kind:** refactor/sweep
**Leads from:** kernel (first consumers: the kernel verbs on the survey's
worklist, then every pack's controllers, worst first; the build reaches all
527)

The command line is the player's interface, in four layers. The **command
definition** is a view: pure data, the cheapest thing in the game to replace.
The **controller** is the next layer out from the player: how a command talks
to them, and the part a player should be able to replace when it bothers
them. The **object** holds the game's rules and the gates that protect other
people. **MQL and the binder** decide what a typed word means and what is
within reach. This build makes the controller layer as liquid as the view: a
player can replace any controller without copying a single game rule and
without weakening anyone else's protection. The owner: *"really this is about
complexity and encapsulation … its increasing that liquidity that this effort
is about."* Every player is a creator, and the command line is the UI.

Seeds: the owner's direction of 2026-11-09 (recorded in memory as
`controller-liquidity-direction`); the **Controller survey**
(https://claude.ai/artifact/F4w6vXxwhjKkvNcdMiPBcB) and its raw record
(`docs/slates/builds/controller-survey/`, MR !554);
`controllers-are-io-slate.md` § *Deferred from the build*.

## What already exists

Controllers-are-io (MR !527) shipped the frame this build fills in: `verb@source`,
one view one word, subcommands under their noun, the act convention where an
object returns a plan and the controller words it, and census gates over
controller logic. It moved about a tenth of the misplaced logic.

The survey then read all 527 controllers against one question: *what would a
player rewriting this controller be forced to copy that isn't about how it
talks to them?*
- About 32% of controller code is game rule and 8% is parsing; 74 controllers
  are half or more game rule; 169 are already clean.
- 75 controllers are several acts sharing one word; 44 are one act on several
  kinds of thing.
- At least eight gates that protect someone else live only in a controller,
  so replacing that controller would remove the protection.
- About 75 likely defects, including acts that never finish.

Controllers whose objects already return a plan are 0–15% game rule; those that
keep their own numbers are 35–60%. The pattern works; this build finishes it.

Therefore what is genuinely new here is: gates moved onto what they protect;
the command grammar grown so controllers stop parsing (value types, nested
subcommands, no greedy object arguments, a reach model with named rungs);
every multi-act controller resolved through the remedy ladder; and the rest of
the misplaced logic moved onto its objects.

## Goals

- **Any controller can be replaced without copying a game rule.** What the act
  does, costs, takes and refuses lives on the object; the controller words it,
  asks, and coordinates.
- **Replacing a controller never weakens a protection.** Every gate that
  protects another person, their things, their privacy or the polity's
  settings lives on the read or write it protects.
- **A controller asks; the object answers with choices.** When several things
  qualify, the object returns them and the controller decides whether to pick,
  refuse or ask. (The last build's Harvest moved asking into the plant; that
  is corrected here.)
- **Each controller is one act.** A controller that is several acts is resolved
  by the remedy ladder (below), with a new command word as the last resort.
- **The grammar carries what controllers used to parse.** A view can declare
  an option's allowed values, a duration, nested subcommands, and how deep an
  argument looks.
- **No greedy object arguments.** A multi-word name is quoted; greedy remains
  only for prose (a message, a post body).
- **Reach has named rungs.** `reachable` means what you could lay hands on now,
  and a player can widen or narrow it per command.
- **`here` is the place you're in.**
- **The acts that never finished, finish.** Every confirmed defect from the
  survey is fixed.
- **Everything the survey counted is gated** so it cannot grow back.

## Non-goals

- **Lists in MQL** (naming several things in one argument). The owner wants
  its own conversation → `mql-lists-slate.md`.
- **The carrying flip** (hands, pockets, nothing loose on a body) and the
  loose ends this build leaves it (what `:held` means then; retuning every
  reach default; re-measuring `reachable`) → `size-slate.md` § 9, a follow-on
  build after this one.
- **The radial menu** → the affordance-verb slate's radial build.
- **Crowd timing** → `crowded-rooms-slate.md`.
- **Database performance and test-world lifecycle** → `db-performance-slate.md`,
  `test-world-lifecycle-slate.md`.
- **Renaming British-spelled identifiers** → nowhere, deliberately (a rename is
  its own sweep).
- **The defects that turn out not to be defects** → dropped, each with one line
  saying why.

## Placement

Kernel-led, reaching every pack. The grammar, the reach model and the gate
moves are the kernel's; each pack's controllers and objects move in that pack.
A second instance of anything here is a row or a view, never new controller
code: that is the point of the build.

## Collisions

- **`size-and-carrying`** (requirements on master, unbuilt) owns the carrying
  flip. This build defines the reach grammar over today's containment and
  hands the loose ends to it (`size-slate.md` § 9).
- **`material-decomposition`** (build-1) and **`documents-path-identity`**
  (build-4) are in flight; whichever merges second reconciles. Neither owns
  controllers.
- **Every player-visible word** that changes (a controller becoming subcommands,
  an option, or rarely a new word) is listed for the owner at plan review.
- Players' scripts and aliases that use changed forms break; breaking is
  accepted, as in the last build.

## Surface decisions

### The replacement test, not a construct ban

A controller may hold state, resolve things, or branch on the world when that
is how the command talks to the player. The test is whether a rewrite would be
forced to copy something that isn't about how the command talks: if so, that
thing belongs on the object, in the view, or in MQL. Presentation, however
complex, stays in the controller; it is the swappable part.

### Gates live on what they protect

A check that protects someone else (their privacy, their property, their
consent, the polity's entrenched settings, hiring criteria, an audience) lives
on the read or write it protects, so no controller can skip it. A check and the
act it allows are one step; every refusal comes before every write; no money
moves before a refusable write.

### The remedy ladder

For a controller that is several acts, the first rung that fits:
1. **One act on several kinds of thing** → each thing answers the same act;
   one controller.
2. **A manner of the same act** → an option (`wash --hard` is the model).
3. **Different acts the player already groups together** → subcommands of a
   noun (the bank and git model).
4. **Different shapes of one sentence** → separate shapes of one word (the
   `throw` trio).
5. **None fits** → a new word. Collisions are acceptable when verbs come from
   portable objects, which rarely meet; verbs from portable objects are
   preferred over verbs everyone carries.

The plan lists every controller's rung and every player-visible word change;
the owner reviews that list before the build starts.

### The grammar grows

- An option or argument can declare its allowed values and a duration type;
  the view refuses a bad value, not the controller.
- Subcommands can nest, so `card`, `shelf`, `style` and `layout` stop
  switching on a second word.
- **No greedy object arguments, anywhere.** A multi-word name is quoted
  (`buy "dog loaf"`); a refusal tells the player to quote. Greedy stays only
  for prose. Usability problems that turn up get real design (the lists
  conversation), not greedy.

### Reach

- MQL addresses anything anywhere, shut away or not (`me:i`, `me:i:i`,
  `me:I`); it never decides whether an act is possible. The verb refuses what
  isn't possible, honestly ("the box is shut").
- `reachable` means what you could lay hands on now: held, worn, inside open
  vessels you carry, the room's top level, and inside open things here; never
  inside shut things.
- The rungs `--top`, `--open`, `--deep` are reserved per-command options, and a
  view sets each argument's default rung. Plain-word rungs never appear inside
  MQL, where they would collide with things' names.
- `:held`, `:worn` and `:carried` filter a body. `:held` means what you hold
  under today's carrying model.
- `here` is the place you're in, walking up past a boat, a cart or a bed;
  `me:e` remains what immediately holds you.

### Cutting is several acts

One cut protocol answering eleven different acts by a verb string becomes one
small protocol per act; a thing implements the acts it supports.

### Defects

Every survey defect is confirmed first, then fixed. One that turns out not to
be a defect is dropped with a line saying why. Acts that never finished
(transfusion, search, the anchored teleport) finish.

## Lens pass

- **1 Pedagogy:** a refusal says what the world said (the box is shut; the
  quote is missing), so a player learns the grammar from the game. Quoting is
  taught, not hidden by greedy.
- **2 Creative expression:** this is the build's purpose. The ordinary case is
  a new view with no code; the bespoke case is replacing a controller, which
  no longer requires copying the game.
- **3a Immersion / 3b participation:** a replaced controller cannot weaken
  another player's protection, so player-made interfaces are safe to share and
  adopt. The polity can propose interface changes through the Compact without
  touching rules.
- **4 Values:** whose gate is whose: protections that judge a person (hiring,
  consent, privacy) sit with the thing protected, so the criterion is in one
  place and appealable there.
- **5 Continuity:** an act answered by the object survives a new interface; a
  later epoch's tool answers the same verb.
- **6 Economy:** money never moves before a refusable write, and the defects
  that charged players for nothing are fixed.
- **7 Governance:** Tier C settings and privacy gates enforced at their write
  and read, not by a verb. Gap: the Compact's process for adopting a
  player-proposed controller is not designed here (→ nowhere yet; raised for
  the owner).

## The drive

### Blocking drive

1. *(instant, staged)* **The liquidity test.** A wizard replaces the
   controllers of `harvest`, `smelt`, `order` and `butcher` with minimal ones
   that only ask and word differently. Each act ends in the same world state,
   with the same duration and refusals, as with the shipped controller.
2. *(instant, staged)* **The asking test.** With a replacement `harvest`
   controller that prompts instead of refusing, a divided field asks which
   field; the shipped controller still refuses with the list. The world is the
   same either way.
3. *(instant, staged)* **The protection test.** With a bare replacement
   controller that only calls the object, each protected act still refuses
   another player: renaming their chat channel; reading `errors raw` without
   the right; changing a Tier C setting; reading a wiki page's hidden
   revision; hiring past the criteria; locking a door you may not lock;
   posting to a board you're not in the audience of.
4. *(instant, player)* `eat apple` finds the apple in the open bag in your
   pack. With the apple in a shut box, `eat apple` says the box is shut.
   `eat apple --top` says you have none at hand. `look me:I:apple` finds it
   wherever it is.
5. *(instant, player)* Sitting in a boat on the river, `look here` describes
   the river; `look me:e` describes the boat.
6. *(instant, player)* `buy "dog loaf"` buys it; `buy dog loaf` is refused
   with a hint to quote. `say` still takes a whole sentence unquoted.
7. *(instant, player)* A bad option value is refused by the command with its
   allowed values listed; a duration is accepted in its written forms.
8. *(instant, player)* A formerly multi-act command answers in its new form
   (the plan names three representative ones: a subcommand noun, an option,
   and a shape); `help` for each lists its forms.
9. *(instant, player)* A nested-subcommand noun (`cockpit layout …`) routes
   each form without the old ambiguity (saving a layout named `list` can be
   recalled).
10. *(short, player)* A transfusion narrates, credits and records harm; a
    `search` finishes; an anchored teleport arrives.
11. *(instant, player)* The money defects are gone: a refused land purchase
    leaves the buyer's money untouched; a pilot charges only when there's
    something to tell.
12. *(instant, player)* Introducing another player works; a gift of land to a
    player makes that player the owner.
13. *(instant, staged)* **Before and after.** For every act whose logic moved,
    the recorded state, reasons and durations match the record taken before
    the build (the last build's baseline method, extended to the worklist).
14. *(instant, staged)* **A restart.** An act in progress (a smelt run, a
    mill grind) survives a restart and completes; the world reads back the same.

No new places are added, so there is no light step.

### Soak drive

None: nothing here waits on the clock.

## Acceptance criteria

- A replaced controller that only words differently produces identical world
  state, durations and refusals for every act on the worklist.
- A replaced controller that only calls the object cannot get past any
  protection the survey listed.
  (Bleeding another person is made tool-gated, capacity-checked and
  recorded; a *consent* gate does not exist to move and is the
  compulsion-gate security build's, not this one.)
- No command takes an unquoted multi-word object name; prose still reads
  whole.
- `reachable` and the three rungs behave as above; MQL addresses things
  anywhere.
- `here` is the place.
- Every controller is one act, by the ladder; the owner reviewed the
  player-visible word list before the build.
- Every confirmed survey defect is fixed; each dropped one has its reason.
- The survey's counts are gated and lower; none can rise.

## Cross-references

- Controller survey doc and `docs/slates/builds/controller-survey/`
- `controllers-are-io-slate.md`; `size-slate.md` § 9; `mql-lists-slate.md`
- `command-spec.md`, `command-routing.md`, `mql-grammar.md`, `mql.md`,
  `call-security.md`, `access.md`
