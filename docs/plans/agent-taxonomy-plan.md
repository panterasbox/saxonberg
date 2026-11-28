# Agent taxonomy — implementation plan

Executes [agent-taxonomy-requirements](../requirements/agent-taxonomy-requirements.md)
(the agents pass of the template taxonomy refactor). **Kind:** refactor/sweep
with a small feature at its center (what a seat declares). **Lead end:**
kernel. Rows learn to merge behaviors entry by entry, to remove one inherited
entry and to be abstract; a seat learns to carry its job's standing work and
kit; every person row is re-parented onto one abstract person kind; the
student row is deleted. The next consumer is cast-in-winter W6
(`origin/reqs/cast-in-winter:docs/plans/cast-in-winter-plan.md` § Sequencing),
which puts `fends` on the person kind and `stokes` and winter kit on seats.

⛔ **Owner rule (2026-11-28): anything done to every agent needs discussion,
even when correct, and every "every X" claim carries its exception census.**
This plan makes five universal changes. Each has a census in
[§ Exception censuses](#exception-censuses). The build does not widen any of
them without adding to the census.

Path shorthand used below: `~/` is `/world/terminus/`, `^/` is `/world/`.

## ⛔ Framing: the bar is the reference venue (owner, 2026-11-28)

> *"the only content I'm sure on is the bar and that's still incomplete. but
> it runs 24/7 and the NPCs have a schedule… I use the bar to work out things
> down to the smallest detail and once I get it functional there and telling
> the story I want to tell then we can start expanding out to other venues.
> that's how I need this framed."*

Everything outside the lounge and Dave's Bar is **placeholder**. It stays to
give test coverage, and the systems are what's tested, not the venues
(lounge-and-bar memory). So this pass makes **no workplace design decision
for any placeholder venue**:

- **Placeholder houses are moved mechanically.** Each seat's duties and kit
  are exactly what its holders' rows did and wore before, with `while: held`
  wherever the behavior ran regardless of shift. Each such line is marked
  `# placeholder: preserved as found`, so the venue's later design pass can
  find it. The resolved-row diff is the proof that nothing changed.
- **The bar is moved the same way in this pass.** Its staff's existing
  behaviors and schedules move onto the bar's seats as found. The bar's real
  shift and duty design (it runs 24/7, its NPCs keep a schedule, its economy
  still needs its story) is the bar's own work. It is likely shaped by the
  narrative building blocks build-1 is making, and not this pass's.
- **No question about a placeholder workplace goes to the owner.** Where the
  plan needs a call that only matters to a placeholder venue, the default is
  "preserve as found" and it's recorded here, not asked.

That decides RC1 and RC2 below.

## Requirements conflicts

Planning found six places where the requirements and the code disagree. None
is absorbed. Each has a default the build follows, and each is on the list of
decisions for the owner at the end of this doc.

**RC1. "Duties run on shift" against "nothing visible changes".** ✅ **Decided by the framing:** `while: held` for the 27, so behavior is preserved as found everywhere, the bar included. Real shift semantics come when the bar is designed. Soak step 12 checks the 8 brains that already gate on shift, and the rest by `rows:diff`. No engine
gate ties a work brain to a shift today. Of the 35 work brains that move to a
seat, 8 refuse off shift by their own check (`stokes`, `pots`, `sets`,
`moulds`, `relines`, `banks`, `supplies`, `doorman`); the other 27 run
whenever their host is loaded (`consigns`, `cellars`, `restocks`, `hauls`,
`farms` and the rest). The requirements say both "a seat's duties run while
its holder is on shift" and "a work behavior that runs off shift today keeps
that, said on the seat". Read together: the mechanism's default is on shift,
and every duty that runs off shift today says so on its seat.
*Default:* the 27 carry `while: held` on their seat entry, so nothing changes
and each is one visible line an author can delete house by house. The cost is
that soak step 12 ("duties stop off shift") only bites on the 8. The
alternative is to let all 35 stop at shift end now, which roughly halves
unwatched production in every 12-hour house and is a balance change, not a
refactor.

**RC2. People who were undressed get dressed.** ✅ **Decided:** dress them. A body with no clothes is a defect, not a workplace design (lens 3a; the climate slate's naked-Cast finding). Removal markers would only preserve a bug. Fourteen person rows extend
nothing today and wear nothing: the infirmary nurse, the six testbed Extras,
and seven bespoke-class rows (Gus, the sellsword, Katie, the Editor, Walter,
Ricky, the ticket clerk). The census in the requirements says they "get the
person kind", and the person kind is plain clothes. Drive step 1 says a
testbed Extra is "dressed as before".
*Default:* they inherit the three garments and the migration table marks all
fourteen (`+`). Nakedness was the defect the envelope build recorded, and
cast-in-winter needs them dressed. The alternative is for each to remove the
three garments on its own row with the new removal marker, which keeps the
look and makes fourteen rows carry three removals each.

**RC3. "Holds no seat" is wider than Gus and Katie.** Twelve people do work
and hold no seat the engine knows: Gus, Katie, Walter, the Editor, the
duelist, the sellsword, the sentry, the blood donor, the Hesper lookout, the
two Waponi smallholders and the Wharfside fisher. Katie, Walter and the Editor
are rostered, but in a plain `Organization`, and the roster tick only
materializes an `Employment` for a `Business` (`scripts/check-identity.ts`
~244 states this as load-bearing). *Default:* all twelve keep their work on
their own rows. Moving the three to seats would need Organizations to
materialize employment, which is not this build.

**RC4. There is no `job` listing of openings.** Bare `job` lists gigs on a
board (`JobBrowseController`). An opening is read on the help-wanted sign and
in `job apply`'s "apply for which?" line, and a lone opening is applied for
at once. Drive step 5 asks for the sign and "the `job` listing".
*Default:* the sign names the duties in short, and `job apply` gains one
option, `--terms`, that prints each matching opening with its duties in full
and hires nobody (P15: an option, not a new verb, and the default behavior of
`job apply` is unchanged).

**RC5. One employment record per house.** `Employment` is keyed by
organization and carries one `positionKey`. Three people are rostered on two
or three seats of one house (Mara: bartender and keeper; the registry clerk:
gauger, magistrate and registrar; the Rejection buyer: assayer and buyer).
The tick already works around this for the house card, which it deals by the
*slot's* position. *Default:* a holder's seats at a house are the record's
position plus every position that house's roster names them for
(`Organization.seatsOf`, D9). The record's shape is logged as a fault line
(C6), not changed.

**RC6. A player in a seat gets no kit.** The acceptance criterion says a
fresh hire "wears its kit with nothing on their row". The lens pass says a
player holding a seat is not driven by its behaviors. Putting clothes on a
player's body without a command is a thing the command def does not predict
(P9, P14). *Default:* duties and kit apply to NPC holders only, by host
placement (D6). A player reads the seat's kit on the opening. Cast-in-winter's
pegs make kit a thing on a peg that a player can `wear`.

## Grounding

Verified this cycle by opening the files. Counts are from a census script over
`packages/content/*/content/**/*.yaml` at `a0dac7444`.

**Rows.**
- 152 rows sit under an `agent/` path or are the registry clerk. 125 are
  person rows: 102 `Cast` (the registry clerk included), 14 `Extra`, 9 bespoke
  classes. The other 27: 21 animals, 3 avatars, the student row, a `Corpse`
  (`trade-cooking/…/trade/cooking/agent/hanging-carcass`) and a `Key`
  (`eternal-university/…/duncan-hall/agent/master-ring`).
- `extends: /stuff/agent/costume/student` is on 111 rows. The row
  (`packages/content/generic-objects/content/stuff/agent/costume/student.yaml`)
  is class `/platform/agent/Extra` and states `shortDescription`, `register`,
  `keywords` and a three-entry `costume` with `as:` keys. No child relies on
  the first three: every one of the 111 states its own.
- 286 of 5,091 rows use `extends:`. Besides the student row, one agent parent
  exists: `/trade/ranching/agent/farm-dog` (children `moss` and `sheepdog`).
- 128 rows state `behaviors`; none has an ancestor that states any. Two more
  rows (`moss`, `sheepdog`) inherit their parent's whole list and state none.
- One row lists the same brain twice:
  `~/goods-yards/brewing/agent/hand` has two `cellars` entries (the brewhouse
  and the cold store), same trigger, different config. No row lists one brain
  under two triggers.
- Only two rows override a costume entry by `as:` (the duelist and the
  sentry: boots `as: shoes`).

**The merge.**
- `lib/stuff/Template.ts`: `entryKey` (~86) is `as`, else `template`, else the
  bare string, else the entry's JSON. `mergeEntryLists` (~149) is parent order,
  substitution in place, new entries appended. `#mergeData` (~352) applies the
  owning field's `inherit` rule; `#inherit` (~301) reads the rules off the
  effective class. `toDocument` writes the raw row (`own`, `extends`).
- ⚠ **The merge exists twice.** `packages/server/scripts/pack-roots.ts` has its
  own `entryKey` (~818), `mergeEntryLists` (~833), `effectiveRow` (~928),
  `fieldMetaEntries` (~1107, a source parse of `static fieldMeta`) and
  `inheritanceIndex` (~1178), for the lint family. Any change to the algebra
  lands in both. `scripts/__tests__/pack-roots.extends.test.ts` and
  `lib/stuff/__tests__/Template.extends.test.ts` are the two test homes.
- `FieldMetaEntry.inherit` (`lib/mixin.ts` ~156) has four values. `behaviors`
  and `dispositions` declare none (`lib/behavior/Behaved.ts` ~201–205), so a
  behavior spec `{brain, trigger, config}` would key on its JSON even if
  `by-entry` were declared: it has neither `as` nor `template`.
- A row's top-level keys are `class`, `extends`, `data` and `unreachable`.
  `PackLogic` (~1095–1112) builds the installed row from the first three and
  hashes them (`canonicalBody` ~1749); `CmsLogic` (~451, ~640) round-trips
  `class`/`extends`.

**Cloning.** Every mint goes through `StuffApi.clone` → `#cloneInner`
(`api/stuff.ts` ~480, ~527), which loads the `Template` first: the `clone`
verb (`platform/idea/cmd/author/CloneController.ts`), `singleton` and
`singletonOrClone`, the `props:`/`cast:` staging walk
(`Template._stageEntries`), `Character.wearGarments`, the ship company seeds
(`platform/idea/Ship.ts` ~1414) and the hard-coded animal mints.
`CloneController` catches and prints `err.message` (~183, ~201, ~248, ~345).
`Refusal` (`lib/errors.ts` ~131) is worded by a reason row
(`packages/content/platform/content/reasons/<code>.yaml`).

**Behaviors.**
- `lib/npc/NPC.ts`: `NPC = PropsMixin(CostumedMixin(BehavedMixin(Character)))`.
  `Character` composes `EmployedMixin`. `NPC` is the only class that composes
  both `Behaved` and `Employed`; `Cast`, `Extra` and the nine bespoke person
  classes descend from it. Animals compose `Behaved` on `Creature` and are not
  `Employed`.
- `Behaved` wires `this.behaviors` once in `onCreate` (`_wireBehaviors` ~363)
  into `_wiring`, arms one deliberation beat if any wiring is a `candidate`,
  and identifies a wiring by `spec.brain` in three places: `fireBeat` (~272),
  the intention and its hysteresis (~664, ~672), and `_beatPeriod` (~520).
  `getBehaviors()` readers: `canEvict` (~193), `converse` (~239),
  `calledToAt` (~256), and `platform/idea/KeptDoor.ts` ~74 (finds the
  doorman's spec).
- `presenceGated = false` on a brain means "consulted with no audience". It
  says nothing about shifts.
- Candidate brains declare `summary` (gated by `lint:idle-cadence`); `label`
  is the brain's verb (`stokes`, `consigns`).
- In flight: tropes (build-1) changes two lines of `Behaved.ts` (`runAsSelf(…,
  { act: true })` at ~246 and ~863) and two clerks' dialogue rows.

**Employment.**
- `lib/employment/Position.ts`: a value object. It already carries two things
  a seat *does to* its holder: `keys` (issued at `clock on`,
  `Employed.takeSeatKeys` ~645) and `onShiftStatus` (set in
  `Organization.beginShift`/`showShiftStatus` ~504–517, cleared in `endShift`).
  `fromData` throws on malformed `keys`, `fulfills`, `requires`.
- `lib/employment/Employed.ts`: `employments` is an accessor pair; every
  assignment calls `_noteEmploymentChange()` (~428). `_upsertEmployment`
  assigns (fires it). ⚠ `_setEmploymentStatus` (~559) mutates in place and
  does not, and it is how `endEmployment` writes `fired`/`quit`/`vacated`.
  `isOnShiftFor(organizationPath)` (~499) is the per-house shift read.
- `platform/idea/api/EmploymentLogic.ts`: `tickBusiness` (~1771) walks
  Businesses only (`allBusinessesImpl` ~476, `BusinessMixin`), groups slots
  into rounds by assignee and position, `ensureRostered`s (one record per
  house, first round wins), deals the house card per slot position (~1836),
  begins and ends shifts, and ends with `reconcileCover` (~1106).
  `startWorkForHiredNpcImpl` (~545) starts an ad hoc NPC hire when the house
  says `startsShiftOnHire`. `beginCover` upserts a transient on-shift record
  on the proprietor.
- Houses: 96 rows carry `positions` or `rosterSlots` (145 positions, 73
  rosters). 82 are Business-class (75 `Business`, 5 `Company`,
  `CarrierBusiness`, `DrillingOutfit`); 14 are plain `Organization`. 11 say
  `offShift: out`.
- Openings: `lib/employment/Opening.ts` `describe()` is the sign's line;
  `LookController` ~325 prints one per opening from
  `EmploymentApi.noticesAt`; `JobApplyController` filters the same list.
  Bare `job apply` with one opening applies.

**Costume.** `lib/stuff/Costumed.ts`: `applyCostume` validates every entry is
`Wearable`, calls `Character.wearGarments(paths)`
(`lib/character/Character.ts` ~221, clones and seats each garment, skips a
failure with a diagnostic, returns nothing) and sets the once-flag
`_costumeWorn`. Cast-in-winter D14 replaces "a kit path" with `NPC.dress()`
over `amenities.pegs` and remembers borrowed pieces as chattel ids on the NPC.

**Tests and tools.**
- The testbed (`packages/content/test-fixtures/content/world/testbed/`) has a
  venue (`idea/venue.yaml`, a `Business` whose authority is the testbed
  committee, `offShift: out`), a forge (`thing/forge.yaml`), a works
  (`place/works.yaml`) and an unrostered `agent/stand-in` Extra.
- Wire drives are `packages/wire/tests/<feature>[.soak][.dirty].wire.test.ts`;
  two carry a `<feature>.baseline.json` beside them. `tools/` holds shell
  tools for worktrees and the soak lane; build-time TypeScript lives in
  `packages/server/scripts/` and is run by a `package.json` script.

## ⭐⭐ New substrate

Each item cites its row in the slate's reuse ledger
(`docs/slates/tech-debt/row-composition-slate.md`, end of file) or says
*genuinely new* with what was searched.

| # | Item | Ledger row |
|---|---|---|
| N1 | `FieldMetaEntry.entryKey` — the property that names a list entry's identity when it states no `as` (default `template`) | *entry-keyed merge*: reuse the same keying for behaviors. Generalizes `entryKey` so a field's owner says its key, as it says its rule |
| N2 | `behaviors: { inherit: 'by-entry', entryKey: 'brain' }` and `BehaviorSpec.as` | *per-field merge rule*: declare `by-entry` on `behaviors` |
| N3 | The removal marker `{ remove: <key>, why: <text> }` in the `by-entry` merge | *removing one inherited entry*: genuinely new. Searched: `Template.ts`, `pack-roots.ts`, `mixin.ts` for remove/tombstone/unset — nothing; `null` replaces a whole field |
| N4 | `Template.removed` (what this row removed, and from which ancestor) and its line in `cat` | same row: "readable on the row" |
| N5 | The top-level row key `abstract: true`, the refusal in `StuffApi.#cloneInner`, the reason row `abstract-row` | *abstract rows*: genuinely new. Searched: `templates.md` ("there is no abstract-row concept"), `Template.ts` fieldMeta, `PackLogic` row shape |
| N6 | `lint:instanceable` invariants 16 (nothing names an abstract row to mint) and 17 (an abstract row is named for what its own header calls it) | same row ("check `lint:instanceable`'s invariants for where it belongs"), plus the slate's item 2, the naming rule |
| N7 | The row `/stuff/agent/person` | *the person kind*: replaces `/stuff/agent/costume/student`, which is deleted |
| N8 | `Position.duties` (behavior specs with `while: shift \| held`) | *a job's standing work*: generalize the seat |
| N9 | `Position.kit` (costume entries) | *a job's kit*: generalize the seat |
| N10 | `Organization.seatsOf(actor)` | *a job's standing work*: needed because of RC5. Searched `Organization.ts`: `holdersOf(key)` is the inverse; nothing answers "which seats does this person hold here" |
| N11 | `Behaved.lendBehaviors(source, lent)`; `getBehaviors()` returns own plus lent | *a job's standing work*: the wiring half |
| N12 | `NPC.reconcileSeats()`, the persistent `seatKit` record, the `_noteEmploymentChange` override | *a job's standing work* and *a job's kit*: the join |
| N13 | `Character.wearGarments` returns the garments it seated | *a job's kit*: a return value on the one seating call, not a second call |
| N14 | `Opening.duties` (resolved duty names and summaries) and `job apply --terms` | *openings*: reuse; the read names the seat's duties |
| N15 | `packages/server/scripts/resolved-rows.ts` (`rows:dump`, `rows:diff`) | *verifying no visible change*: build once |
| N16 | Test-fixtures rows: a works house with a smith seat, a testbed smith, a kind fixture and two children | drive staging; no ledger row (test content) |

No new mixin, Api, logic singleton, document kind, catalogue, hook or module
category. One new script file. `ensureRostered`, the tick, `Costumed` and the
brains are untouched.

## ⭐⭐⭐ The surface, by kind

**Api statics.** None added, none changed.

**Mixin and class methods.**

| Method | Host | Hosts today | Why it is not P1 / P12 / P13 |
|---|---|---|---|
| `lendBehaviors(source: string, lent: readonly LentBehavior[]): Promise<void>` | `BehavedMixin` | `NPC` and descendants; the animal classes | P1: nothing wires a spec that is not on the host's own row. P12: not a synonym for a field write, since lent specs are never persisted. P13: the header says the mixin "reads the list … and wires each spec to its trigger"; this is wiring. An empty list returns what `source` lent |
| `getBehaviors()` (changed: own, then lent) | `BehavedMixin` | same | every reader asks "what does this host do"; none asks "what did its row say" (the applier reads the field) |
| `seatsOf(actor: Stuff & Employed): readonly Position[]` | `OrganizationMixin` | `Organization`, `Business`, `Company`, pack subclasses | P13: "the chart". P12: `holdersOf(key)` is the inverse read, not this one |
| `reconcileSeats(): Promise<void>` | `lib/npc/NPC` | `Cast`, `Extra`, 9 bespoke person classes | P13: `NPC` is the one class that is both `Behaved` and `Employed`; cast-in-winter puts `dress()` on the same class. P1: no existing join |
| `_noteEmploymentChange()` override | `lib/npc/NPC` | same | an override of an existing `EmployedMixin` method, calling `super` |
| `wearGarments(paths): Promise<Stuff[]>` (changed return) | `Character` | players and NPCs | not a new call |

`LentBehavior` is `{ spec: BehaviorSpec; live?: () => boolean }`, declared in
`lib/behavior/brain.ts` beside `BehaviorSpec`. `live` is the wiring's gate; a
wiring with none is always live.

**Protocols / interfaces.** None.

**Value classes.** None new. `Position` gains two fields and their coercers;
`Opening` gains one constructor field and two reads.

**Documents, kinds and catalogues.** One reason row,
`packages/content/platform/content/reasons/abstract-row.yaml`. A reason is
already a document kind.

**Fields.**

| Field | Host | Empty on |
|---|---|---|
| `entryKey` | `FieldMetaEntry` | every field but `behaviors` (the default covers the four existing `by-entry` lists) |
| `as` | `BehaviorSpec` | every spec but the brewing hand's two `cellars` |
| top-level `abstract` | a template row | 5,090 of 5,091 rows. It is a row key, absent by default, not a field every class carries |
| `duties` | `PositionData` | 90 of 145 positions after migration |
| `kit` | `PositionData` | 124 of 145 |
| `while` | a duty entry | absent means `shift` |
| `seatKit` (persistent, runtime state) | `lib/npc/NPC` | null on every NPC whose seats carry no kit (sparse, like `employments`) |
| `removed` | a `Template` instance (derived at materialize, never stored) | empty on every row with no marker |

`duties` and `kit` are empty on most positions. That is not the quiet form of
P2: a position is where a job's terms are authored, `keys` (2 seats) and
`onShiftStatus` (2) are the precedent, and the alternative host (the roster
slot) would repeat them on every holder's slot.

**Retired.**
- The row `/stuff/agent/costume/student` and the `costume/` namespace under
  `/stuff/agent/`.
- The two "known rough edge" passages in `docs/subsystems/templates.md`
  § Inheritance and the row comment they point at.
- 57 rows' work entries in `behaviors:` and 22 rows' added garment in
  `costume:` (moved, per the table).
- The template paths `/trade/cooking/agent/hanging-carcass`,
  `~/eternal/duncan-hall/agent/master-ring` and `~/registry/clerk` (moved).

**The command layer.**

| Surface | Change | Does the player see it |
|---|---|---|
| `look` (the help-wanted lines) | each line ends with the seat's duty names | yes, where a seat has duties |
| `job apply` | new option `--terms` (`-t`): print each matching opening with its pay, what it asks, its duties in full and its kit; hire nobody | yes; default behavior unchanged |
| `clone` | an abstract row is refused with the `abstract-row` line | wizards only |
| `cat` | a row's removals print as "removed from `<parent>`: `<key>` — `<why>`"; an abstract row prints `abstract: true` | authors |
| `cp`, `mv`, CMS save | carry the `abstract` key like `extends` | no |

`JobApplyController` stays IO: `--terms` prints what `Opening` words.
`CloneController` renders a thrown `Refusal` through `this.refuse` instead of
`fail(err.message)`; it decides nothing. No new view, verb, controller,
argument, affordance or dialogue effect.

**Names.** Checked against the subsystem docs, the command categories and the
kernel source:

| Name | Collision check |
|---|---|
| `duties` | no field, verb or doc term. `duty` appears only as prose ("on-duty hand") |
| `kit` | `householders-kit`, `sewing-kit`, `TrapKit` are things named kit; `kit` as a field is free, and cast-in-winter's plan confirms "no `supply`, `kit` or `uniform` key anywhere" |
| `while` | free as a data key. `offShift` was rejected: `Business.offShift` already means where a hand goes |
| `held` | `DisplayMixin`'s `held` pairing rung is a different vocabulary on a different field; acceptable |
| `abstract` | free as a row key |
| `remove` / `why` | free inside designation entries (`RESERVED_PROP_KEYS` is `template`, `as`, `count`; a placement key must have a path value naming an earlier entry, so the build adds both to the reserved set) |
| `lendBehaviors`, `LentBehavior` | no `lend` member on any mixin. Tropes' P15 example mentions a `give … --lend` option, a command option in another vocabulary |
| `reconcileSeats` | `reconcileCover` (house side), `reconcileWeather`, `reconcilePhase` are the family; the name says the same thing they do |
| `seatsOf` | `holdersOf`, `openingsFor` are its neighbors |
| `/stuff/agent/person` | `PersonaMixin` and MQL's `person` seed are other things; a row path does not collide with either. Checked: no row or directory at that path |
| `rows:dump`, `rows:diff` | no `rows:*` script. Deliberately not `lint:*`: `lint:family` runs every `lint:*`, and the diff needs a baseline that only exists during a pass |

## ⭐⭐⭐ Convergence and divergence

**C1 — What already does this.**

| New thing | Sits beside | Relation |
|---|---|---|
| by-entry on `behaviors` | by-entry on `props`, `cast`, `costume`, `adornments` | the same merge function, one more field |
| the removal marker | `null` (replaces a field) | the entry-level member the slate named as missing |
| abstract rows | `canDestruct` refusing on seeded singletons; `lint:instanceable` 1 (nothing instances `/lib/`) | the row-level form of "only inherited" |
| `Position.duties` | brains on person rows; `Position.fulfills` (what the holder may do) | duties are what the holder does; `fulfills` is what they may be asked for |
| `Position.kit` | `Position.keys` (issued to the holder); `costume:` (the row's clothes) | same act as `costume:`, sourced from the seat |
| `lendBehaviors` | `_wireBehaviors` | the same wiring, for specs that are not the host's own |
| `reconcileSeats` | `issueHouseCardImpl` (idempotent on the inventory), `showShiftStatus` | the holder-side analog: what the seat puts on its holder |
| `rows:diff` | `effectiveRow` in `pack-roots.ts` | a consumer of it |

**C2 — Unifying, or adding a head.**

| Replaces | Deleted in this build? | Survivors |
|---|---|---|
| the student row | yes (W3) | none |
| work brains on person rows | for the 57 seated rows, yes (W5). | 12 seatless people keep work on their rows (RC3). That is the has-a rule, not a second door: with no seat there is nowhere else to say it |
| one garment per row for the job | for 22 rows, yes (W5) | 38 people keep a garment that is their own (proprietors, the seatless) |
| shift checks inside 8 brains | **no** | the seat's `while: shift` and the brain's own `isFulfilling`/on-shift check both run. The brain's check is stricter (it also asks where the holder stands), so it is not redundant today. Cast-in-winter exception 8 ("`stokes` runs only while its holder is on shift") is where it gets settled; logged under C6 |
| a kit wearing path | n/a | exactly one: `reconcileSeats` calls `wearGarments`. Cast-in-winter W6 replaces that call with `dress()` and `seatKit` with its `borrowed` list. It must not add a second. This is stated in Deferred seams and is the note to send build-N when it starts W6 |

**C3 — Generic names.** `removed` on `Template` (a list of what was removed)
has no existing carrier: `own`, `extends` and `chain` are its siblings and it
is the fourth raw-row read. Nothing else in the list is a generic
state/record name.

**C4 — Look-alikes after this build.**
- `costume:` on a row and `kit:` on a seat are two lists of garments.
  Intended: one is the person's, one is the house's. They share the entry
  shape and the seating call.
- `behaviors:` on a row and `duties:` on a seat are two lists of specs.
  Intended, same reason. They share `BehaviorSpec`, the key rule and the
  wiring.
- `Template.ts` and `pack-roots.ts` each hold the merge. Debt, pre-existing.
  W1 adds a parity test so the two cannot drift again; folding them is
  logged under C6.

**C5 — Deliberate divergence.**
- `dispositions` stays `replace`. It has a key (`disposition`) and would merge
  cleanly, but no parent states any and nothing consumes it.
- Animal rows get no kind and no seat (requirements non-goal).
- Removal is not offered against a seat's duties. A person's row can override
  a duty by naming the same key; it cannot decline the job. The seat is the
  house's.
- The archetype label stays a string.

**C6 — Fault lines for the Api pass** (append to
`docs/slates/tech-debt/api-normalization-slate.md` Part 8 in W7):
1. `Employment` holds one position per house; three rows hold more (RC5).
2. A plain `Organization`'s roster materializes no employment (RC3).
3. The inheritance merge is implemented twice (runtime and lint).
4. Eight brains check the shift themselves; the seat now says it too.
5. `Behaved` identifies a wiring by brain path in `fireBeat` and the
   intention; this build moves those to the entry key.

## Plan-level decisions

**D1 — Behaviors merge by entry; the key is `as`, else the brain path.**
`FieldMetaEntry` gains `entryKey?: string`: the property of an object entry
that is its identity when it states no `as`. Default `'template'`, so the four
existing lists are unchanged. `behaviors` declares
`{ inherit: 'by-entry', entryKey: 'brain' }`. `BehaviorSpec` gains optional
`as`. Brain plus trigger was considered and rejected: no row lists one brain
under two triggers, the one real duplicate (the brewing hand's two `cellars`)
has the same trigger, and `Behaved` already treats the brain path as the
identity of a wiring. Within one list, two behavior entries with the same key
are an authoring error (`lint:instanceable`, W1), so the brewing hand's
entries become `as: brewhouse` and `as: cold-store`. `Behaved`'s three
brain-keyed lookups (`fireBeat`, the intention, `_beatPeriod`) move to the
entry key so those two entries stop sharing hysteresis; `fireBeat(name)`
accepts a key or a brain path (first match), so existing callers still work.

**D2 — Removal is an entry `{ remove: <key>, why: <text> }`.** In a child's
`by-entry` list, an entry whose keys are exactly `remove` and `why` drops the
inherited entry with that key and contributes nothing. `why` is required and
non-empty: the requirements say the reason is on the row, and a YAML comment
is not data a reader tool can show. It is one algebra: all five `by-entry`
fields accept it, because the merge function is shared and a marker that
works in one list and is garbage in another is a second algebra. Only
`behaviors` has a consumer (the fixture now, `fends` opt-outs next); costume
is covered by a unit test and no shipped row.
- A marker that matches nothing in the chain, a marker on a row with no
  parent, and a marker with no `why` each throw at materialize with the row,
  the field and the key, and fail `lint:instanceable` first. A merged list
  never contains a marker, so no applier changes.
- `Template#inherit` records each removal as
  `removed[field] = [{ key, from, why }]`, where `from` is the nearest
  ancestor whose own row states the entry. `cat` prints them; the CMS read
  returns them beside `own`; `rows:dump` includes them.
- `toDocument` writes the raw row, so the marker round-trips as authored.

**D3 — An abstract row is `abstract: true` at the top level of the row.**
Top level, beside `class` and `extends`, because it must not inherit: a child
of a kind is not a kind. `Template` gains the persistent field and
`isAbstract()`. The key is carried by `PackLogic`'s row build, hash and
export, by `TemplateSpec` (so `saveTemplate`, `cp`, `mv` and the CMS keep it),
and by `pack-roots.ts`'s `TemplateRow` (already the raw YAML).
- **The one refusal** is in `StuffApi.#cloneInner`, right after the template
  loads: `throw new Refusal('abstract-row', { row: templatePath })`. That
  single site covers the `clone` verb, `singleton`, `props:`/`cast:` staging,
  `wearGarments`, the ship seeds and every hard-coded mint. The reason row
  says: *"`{{ row }}` is a kind, not a thing. Clone a row that extends it."*
- `CloneController` passes a `Refusal` to `this.refuse`; other errors keep
  their current handling.
- Pack install does not refuse an abstract row: it is content like any other.
  What install refuses is what invariant 16 refuses statically.
- **Invariant 16** (`lint:instanceable`): no designation entry (`props`,
  `cast`, `costume`, `adornments`, a position's `kit`), no `stockLines` entry
  and no roster `assignee` resolves to an abstract row.
- **Invariant 17** (the naming rule, stated for rows): an abstract row's leaf
  name appears as a word in the row file's leading comment. It is the check
  that would have caught `costume/student`, whose comment says *outfit* nine
  times and *student* never. Limited to abstract rows so it is decidable.
- Gates that walk every agent row (`lint:identity`, `lint:dossiers`,
  `lint:census`, `lint:kept-animals`) skip abstract rows through one
  shared `isAbstractRow` in `pack-roots.ts`. Without it `lint:identity`
  fails the person kind as a sentient Extra that answers to nobody.
- The studio instances classes, not rows, and is untouched.

**D4 — The person kind is `/stuff/agent/person`.** File:
`packages/content/generic-objects/content/stuff/agent/person.yaml`.
`abstract: true`, `class: /platform/agent/Extra` (the unnamed rung; a `Cast`
child states its own class, which is legal and is what 100 rows do today).
Its data is the three garments, with their `as:` keys, and nothing else:

```yaml
abstract: true
class: /platform/agent/Extra
data:
  costume:
    - { template: /stuff/thing/clothes/student-shirt, as: shirt }
    - { template: /stuff/thing/clothes/student-trousers, as: trousers }
    - { template: /stuff/thing/clothes/canvas-shoes, as: shoes }
```

It does not carry `shortDescription`, `register` or `keywords`: every child
overrode them, which was the slate's measure of the old parent being three
fields too wide. It does not carry `introduces` (32 of 125 rows) or
`diligence 60` (19): a default most children would not want is the quiet
form of P2. The garments keep their names (renaming is the things pass).

**D5 — A seat's duties and kit are fields of its `Position`.**

```yaml
positions:
  - key: smith
    noun: smith
    label: working the forge
    wageRate: 5
    fulfills: [smithing]
    duties:
      - { brain: /lib/behavior/stokes, trigger: candidate }
    kit:
      - /stuff/thing/clothes/field-jacket
```

`duties` entries are `BehaviorSpec` plus `while`. `kit` entries are
`CostumeSpec`. `Position.fromData` coerces both and throws on a malformed
entry (the `keys` precedent); `serialize` round-trips them. No new public
static on `Position` (`lint:lib-statics`). The position, not the roster slot,
because the slot is one holder's hours and the position is the job.

**D6 — `NPC.reconcileSeats()` is the one join.** Composition lives on
`lib/npc/NPC`, the only class that is both `Behaved` and `Employed`, so
neither mixin learns about the other and no guard narrows a host set. A
player holds seats and gets neither duties nor kit, by construction.

What it does, each time it runs:
1. For each active employment (not exited), load the house by its recorded
   path (`StuffApi.singleton`, load on use by following the authored
   reference) and ask `house.seatsOf(this)`.
2. **Duties.** For each seat, source key `<organizationPath>#<positionKey>`:
   take the seat's duties, drop any whose key (`as`, else brain) the NPC's
   own `behaviors` already states (the person's row wins: "does the job their
   own way"), and `lendBehaviors(source, …)`. A `while: shift` duty is lent
   with `live: () => this.isOnShiftFor(organizationPath)`; `while: held` with
   none. Sources lent before and not held now get an empty list.
3. **Kit.** For each seat with kit and no `seatKit[source]` record:
   `wearGarments(paths)`, stamp each seated garment to the house
   (`garment.stampChattel(house)`), record their chattel ids under the
   source. For each recorded source not held now: find those garments on the
   body by chattel id, destruct them, drop the record. A recorded garment
   that is no longer on the body is forgotten, not replaced (the once-flag
   doctrine in `templates.md`: an applier that mints runs once).

When it runs: at the end of `NPC.onCreate`, and whenever the NPC's
employments change. `NPC` overrides `_noteEmploymentChange()` to call `super`
and schedule one reconcile (`ScheduleApi.schedule(1, …)`, coalesced by a
pending flag; the `fireBeat` precedent for running as a fresh root).
`EmployedMixin._setEmploymentStatus` gains one line calling
`this._noteEmploymentChange()`, because an exit is written there in place and
would otherwise never be heard. A shift flip needs no reconcile: the `live`
gate reads the record.

Order and collisions, stated once:
- Effective list = the row's own behaviors (after inheritance), then each
  seat's duties in employment order, then position order.
- Same key on the row and a seat: the row's entry runs, the seat's is not
  lent.
- Same key on two seats: the first seat's runs; `lint:openings` refuses two
  positions of one house sharing a duty key, since one person may hold both.
- A row cannot remove a seat duty (C5).

**D7 — `lendBehaviors` and the gate in `Behaved`.** `_wiring` entries gain
`source?: string` and `live?: () => boolean`. `lendBehaviors` cancels and
drops the wirings of `source`, wires the new specs through the same
parse/warm/`requires` path `_wireBehaviors` uses, and arms the beat if a
candidate now exists. It does not tear down other wirings, so scratch state
and the current intention survive a hire. The gate is checked where
`presenceGated` is: in `_deliberate`'s candidate loop, `_fireCadence` and the
witness dispatch. Nothing lent is persisted; `behaviors` stays the row's.

**D8 — Kit is worn while the seat is held, not while on shift.** That is what
each row gets today from a different source, and it is the requirements'
surface decision. No line is said when it goes on or comes off (the costume
does not say one either). Cast-in-winter makes it follow the shift and the
weather.

**D9 — `Organization.seatsOf(actor)`.** The position on the actor's active
record here, then every position this house's roster names the actor's
identity path for, without duplicates, in position order. Empty if the record
is absent or exited. This is what makes Mara's `keeper` duty reachable (RC5).

**D10 — Openings name duties.** `noticesAt` warms each duty's brain and gives
`Opening` the resolved pairs `{ name: brain.label, summary: brain.summary }`.
- `Opening.describe()` (the sign) appends ` The work: stokes, relines.` when
  the seat has duties.
- `Opening.terms()` is the long form `job apply --terms` prints: the sign's
  line, then one line per duty with its `summary`, then the kit by garment
  name.
- `lint:openings` requires every duty's brain to resolve and to declare
  `summary` (candidate brains already must; `doorman`, an arrival brain,
  already does).
A duty the holder's own row overrides is still the seat's duty and is still
listed: the opening describes the seat.

**D11 — Migration rules.** Applied to all 125 person rows; the result is
the table in [§ The migration table](#the-migration-table).
1. Every person row's parent becomes `/stuff/agent/person`.
2. *Stays the person's:* `idles`, `introduces`, `greets`, `tree-dialogue`,
   `random-chatter`, `frequents`, `converses`, `reacts`, `remarks` (the
   requirements' personality family) and `eats` (a body need, which
   cast-in-winter's `fends` takes over).
3. *Moves to the seat:* every other behavior, with its config, when the
   person is rostered in a Business-class house. Two people rostered for one
   position with the same entry (the moulders, the Waponi cutters) become
   one duty.
4. *Which seat*, when a person holds more than one: Mara's `restocks` goes to
   `keeper`; the registry clerk's blazer to `registrar`; the buyer's to
   `buyer`.
5. *`while`:* `shift` (unstated) for the eight self-gating brains; `held`
   for the rest (RC1).
6. *Garments:* the row's added garment moves to the seat's `kit` when the
   person holds a Business seat, is not that house's appointing authority,
   is not archetype `proprietor`, and every holder of that position wears the
   same thing. Otherwise it stays on the row. Armor stays on the row.
7. The brewing hand's two `cellars` duties carry `as: brewhouse` and
   `as: cold-store`.
8. Row comments that explain the student parent ("What this person has on
   comes from the parent row (`/stuff/agent/costume/student`)…") are
   rewritten to name the person kind.

**D12 — The misfiled rows move.**

| From | To | References to update |
|---|---|---|
| `/trade/cooking/agent/hanging-carcass` | `/trade/cooking/thing/hanging-carcass` | `hearthworks/…/place/cookhouse.yaml`, `packages/wire/tests/cleanliness.dirty.wire.test.ts` |
| `~/eternal/duncan-hall/agent/master-ring` | `~/eternal/duncan-hall/thing/master-ring` | Katie's `props:` |
| `~/registry/clerk` | `~/registry/agent/clerk` | `registry/office.yaml`, `registry/business.yaml` (three roster slots), `terminus/src/__tests__/registry-authority.test.ts`, `GovernmentLogic.test.ts`, `GovernmentLogic.flagship.test.ts`, `scripts/check-identity.ts` |

The clerk's template path is a person's identity path. There are no
migrations: a dev database that holds the old path is dropped.

**D13 — The resolved-row diff is a server script.**
`packages/server/scripts/resolved-rows.ts`, beside `pack-roots.ts`, whose
`inheritanceIndex` and `effectiveRow` it reuses. `tools/` is shell tooling;
a script that parses TypeScript field metadata belongs with the lints. Two
package scripts in `packages/server/package.json`:
- `rows:dump [--under <prefix>…] [--compose-seats] > file.json` — for each
  template row, its effective `class`, `data`, `abstract` and `removed`.
  With `--compose-seats`, each person row's `behaviors` and `costume` are
  folded with the duties and kit of every Business-roster seat that names it
  (the same rule as D6, in the static mirror), with `while` and `as`
  stripped, so a row before the move and the row plus its seats after it
  compare equal.
- `rows:diff <before.json> <after.json> [--allow <file.yaml>]` — reports
  every row whose effective class or data differs, field by field. Lists
  compare as keyed sets, with order changes reported separately as notes.
  `--allow` is a list of `{ row, field, change }` the diff may contain; an
  allowed entry that does not occur is also a failure, so the allow file
  cannot rot.

W0 lands the tool and commits the baseline,
`packages/server/scripts/__fixtures__/agent-taxonomy.baseline.json` (person
and house rows only, `--compose-seats`), before any other change. The allow
file `agent-taxonomy.allowed.yaml` beside it is the machine form of the
migration table's `+` marks and path moves. Both fixtures are deleted at the
sweep; the script stays for the places, things and ideas passes.

After a catch-up merge from master, rows master changed will differ from the
baseline. The build re-dumps exactly those rows into the baseline
(`rows:dump --under <row>`), names them in the wave's commit message, and
does not touch the rest.

**D14 — The staged drive steps stand in the testbed.** The Hearthworks smith
is her own house's appointing authority, so nobody can dismiss her. The
test-fixtures pack gains:
- `/world/testbed/idea/works`: a `Business`, authority the testbed committee
  (as the venue's), `startsShiftOnHire: true`, operating
  `/world/testbed/place/works`, one position `smith` with `headcount: 1`,
  `duties: [stokes]` and a one-garment `kit`, and a roster slot for
- `/world/testbed/agent/smith`: an Extra extending the person kind, with no
  behaviors of its own, on a `[8, 18)` shift.
- `/world/testbed/agent/kind-fixture` (abstract, one behavior), and two
  children: one listing its own behavior, one removing the inherited one.
The existing `/world/testbed/agent/stand-in` is the fresh Extra.
Staging uses shipped verbs only: `house dismiss`, `clone … --here`,
`house appoint … to smith at …`, `testharness clock-advance`. No new
harness subcommand.

**D15 — The naming rule is written down in two places.** `templates.md`
§ Inheritance (W2, with invariant 17) and, at the sweep, one line in
CLAUDE.md beside the rule for classes. CLAUDE.md is an index file and is not
edited from a build worktree mid-build (worktree rule 5).

**D16 — Eviction follows the effective list.** `canEvict` keeps vetoing on
`getBehaviors().length > 0`, which now includes lent duties. Twenty-one rows
will have no behaviors of their own after the move (the infirmary's nurse and
physician, the Wharfside mill's three hands, the brickfield's four, the
divers' two and others). They are protected once their duties are lent and
are evictable in the window between a fresh clone and their house's first
roster pass. The roster tick already fetches an absent assignee when the
station it is due at is standing. The build verifies this window in the drive
(Risks R3) rather than adding a veto.

## ⭐⭐ Host placement

| Thing | Host | What that claims about everything else on the host | Guard needed? | Honest "no" on most hosts? |
|---|---|---|---|---|
| `entryKey` | a field's own `fieldMeta` entry | nothing: the owner states it | no | n/a |
| by-entry on `behaviors` | `BehavedMixin` | every Behaved host's row merges its behaviors with a parent's, animals included. Census (a) | no | no: it is a merge rule, live only where a parent states behaviors |
| `abstract` | the row | nothing about classes | no | n/a (absent by default) |
| the person kind's costume | the row `/stuff/agent/person` | every NPC person wears three plain garments unless its row says otherwise. Census (d) | no | no: 111 of 125 wear them today |
| `duties`, `kit` | `Position` | any seat of any organization may declare them. On a plain `Organization` they would never run (RC3), so `lint:openings` refuses `duties`/`kit` on a position of a non-Business row rather than leaving a dead declaration | the lint, not a runtime guard | 55 and 21 of 145 carry them; see the Fields note |
| `seatsOf` | `OrganizationMixin` | every chart can say which seats a person holds | no | no |
| `lendBehaviors`, the `live` gate | `BehavedMixin` | any Behaved host may be lent specs. Only `NPC` calls it. An animal is never lent anything because nothing calls it for one | no | it is a method, not a default-bearing field |
| `reconcileSeats`, `seatKit` | `lib/npc/NPC` | every NPC person reconciles its seats. All eleven descendant classes are people who can hold a job; the three avatars and 21 animals are not `NPC` | no | `seatKit` is null on NPCs with no kit seat (sparse) |
| `_noteEmploymentChange` call in `_setEmploymentStatus` | `EmployedMixin` | every Employed host's roster memo is re-noted on a status change. The memo is additive and safe when stale (its own comment) | no | n/a |

The test from the planner's brief, run on the one placement that tempted a
guard: putting the join in `Behaved` would need `if (isEmployed(host))`, and
putting it in `Employed` or `Organization` would need `if (isBehaved(actor))`.
Both are the re-narrowing guard. `NPC` needs neither.

## Convention conformance

Checked against the tree at plan time.

- **`props:` / `cast:`**: person rows are minted by places' `cast:` lists (99
  entries) and are not re-pointed; only the three moved rows' references
  change. `populates:` and `container:` stay retired (invariants 10, 14).
- **Places, not rooms**: no place class or row is touched.
- **Namespace axes**: the person kind is at `/stuff/agent/person` (the
  commons; branch `agent`). The moved rows land under their pack's own
  `thing/` or `agent/` branch. Test rows under `/world/testbed/`.
- **Module scope declares**: no module-scope statement is added.
- **Import boundary**: `resolved-rows.ts` is a script, outside `src/mud`. The
  kernel edits import nothing new from outside `src/mud`.
- **Module categories**: no new category, no free helper. The script exports
  nothing.
- **Verbs on objects**: `seatsOf`, `lendBehaviors`, `reconcileSeats` are
  methods; no `XApi.verb(host)`.
- **Member privacy**: the new fields on `NPC` and `Behaved` are TypeScript
  `private`/public persistent, never `#` (mixin state on proxied hosts).
- **P3 refuse / skip / throw**: an abstract clone is a `Refusal`; a dangling
  or reasonless removal marker throws at materialize and fails the lint; a
  malformed duty or kit entry throws in `Position.fromData`; a kit garment
  that cannot be seated is skipped with a diagnostic (`wearGarments`' shipped
  behavior); a house that will not load in `reconcileSeats` is a warning
  naming the NPC and the house, and that seat lends nothing.
- **P4 no duck typing**: `NPC` calls typed methods on `Organization` after
  `MixinApi.isOrganization`; brains in packs are named by path as today.
- **P5 the mixin decides**: `JobApplyController` prints `Opening.terms()`;
  `CloneController` renders the refusal.
- **P6 persistence per content**: `seatKit` is runtime state on the NPC's own
  snapshot, like `_costumeWorn`. Kit garments ride their holder's record like
  the house card. No class persists anything new on behalf of its contents.
- **P7 load on use**: the house is loaded from the employment record's path;
  duty brains are warmed at wire time and at `noticesAt`. No boot entry.
- **P8 names**: see the Names table.

**Gates this build must pass** (all of `lint:family`; the ones it touches or
is most likely to trip): `lint:instanceable` (new invariants 16, 17;
duplicate behavior keys), `lint:openings` (duties and kit), `lint:identity`
(the moved clerk; abstract rows skipped), `lint:idle-cadence` (it reads
`behaviors` on rows and must read seat duties too, or 35 brains vanish from
its census), `lint:dossiers`, `lint:census`, `lint:field-meta`
(`entryKey`), `lint:content-refs` (moved paths), `lint:lib-statics`,
`lint:mixin-clusters` (`Behaved` gains members), `lint:view-keys` and
`lint:command-views` (`--terms`), `lint:closed-vocabularies` (`while`),
`lint:drive-scripts`, `lint:module-scope`, `lint:imports`,
`lint:duck-typing`.

### P9–P14, per item

| Item | P9 predictable from the def and `help` | P10 metadata is a document | P11 no caller branches on the destination | P12 no synonym | P13 fits the host's sentence | P14 nothing moves or decides invisibly |
|---|---|---|---|---|---|---|
| N1 `entryKey` | not a command | field metadata, as `inherit` is | n/a | extends `entryKey`'s own rule | `FieldMetaEntry` describes how a field merges | the owner states it |
| N2 by-entry behaviors, `as` | n/a | n/a | n/a | same merge | Behaved owns `behaviors` | a child now keeps a parent's behaviors; visible in `cat` (inherited values are annotated) |
| N3 removal marker | n/a | a value in the row | n/a | `null` removes a field; this removes an entry | the merge | requires `why`; shown by `cat` |
| N4 `Template.removed` | `cat`'s help says it annotates inherited values; add removals to it | derived, not stored | n/a | no existing read | raw-row reads live on `Template` | it is the visibility |
| N5 `abstract`, the refusal | `clone`'s help gains one line; the refusal names the row | a row key and a reason document | one site, inside `clone` | no | `StuffApi.clone` | refuses, never substitutes a child |
| N6 invariants 16, 17 | n/a | n/a | n/a | extend the existing gate | `lint:instanceable` is about what may be instanced | n/a |
| N7 the person kind | n/a | a row | n/a | replaces the student row | named for what it is; its header says *person* | fourteen people gain clothes (RC2), listed |
| N8 `duties` | the opening lists them | data on the position | n/a | not `behaviors` under another name: different owner, same shape | "a job's terms" | a holder acts by them; the opening and `job apply --terms` say so |
| N9 `kit` | `--terms` lists it | data on the position | n/a | not `costume`: different owner | "a job's terms" | worn at hire with no line; NPCs only (RC6) |
| N10 `seatsOf` | n/a | n/a | n/a | inverse of `holdersOf` | the chart | a read |
| N11 `lendBehaviors`, effective `getBehaviors` | n/a | n/a | n/a | not a field write | wiring | lent specs gate on a stated predicate |
| N12 `reconcileSeats`, `seatKit` | n/a | runtime state | no branch: `NPC` is the only host | none | the class that is both | mints and destroys kit; recorded, idempotent, logged at info like the house card |
| N13 `wearGarments` return | n/a | n/a | n/a | same call | Character dresses | no behavior change |
| N14 `Opening` duties, `--terms` | the option is in the view with a description; the default is unchanged | n/a | n/a | not a second listing verb | `Opening` words the sign | prints only |
| N15 `rows:dump` / `rows:diff` | n/a | n/a | n/a | consumes `effectiveRow` | scripts | read-only |
| N16 fixtures | n/a | rows | n/a | n/a | testbed | test-only pack |

**P15** (options, not forced choices): the one command fork was how a player
reads a seat's duties. It is an option on `job apply`, and the default
behavior is unchanged. No other fork in this plan is a command's.

**P1's second half** (when the build generalizes, is the specific one gone):
the student row is deleted in W3; row-level work and job garments are deleted
from every seated row in W5; survivors are listed under C2.

**Standard Model contract.** No act kind is added or renamed. A duty's act is
the NPC's own act through the unchanged `_runAct` (and tropes' `{ act: true }`
when it merges). Kit going on is not an act. Not applicable beyond that.

## Exception censuses

**(a) The merge rule on `behaviors` — every row that has behaviors.**

| Who | Count | Effect |
|---|---|---|
| Rows that state `behaviors` | 128 | none: not one has an ancestor that states any |
| `moss`, `sheepdog` (parent `farm-dog` states behaviors; they state none) | 2 more | none: they inherit the whole list under either rule |
| Animal rows among the 128 (Fish 6, Beast 3, DraftAnimal 3, KeptAnimal 3, WorkingAnimal 1) | 16 | none; listed because the rule now applies to them if a parent ever states behaviors |
| The brewing hand (two `cellars`) | 1 | gains `as:` on both entries; no behavior change |
| Rows that will inherit behaviors after this build | 3 | test fixtures only. The person kind states none until cast-in-winter adds `fends` |
| `dispositions`, `competence`, `keywords` | all | unchanged (`replace`) |

**(b) The removal marker — every `by-entry` list.**

| Who | Effect |
|---|---|
| `props`, `cast`, `costume`, `adornments`, `behaviors` on every row | accept the marker. Zero shipped rows use it; one test fixture does |
| A row with no parent, or a marker matching nothing | refused at lint and at materialize |
| Appliers (`applyProps`, `applyCast`, `applyCostume`, `applyAdornments`) | never see a marker |
| Seat `duties` and `kit` | do not accept it (they are not inherited lists) |

**(c) Abstract rows — everything that reads or mints a row.**

| Who | Effect |
|---|---|
| Rows marked abstract | 1 shipped (`/stuff/agent/person`), 1 test fixture |
| The other 83 parent rows (doors, sconces, crates, casks, materials, biomes, `farm-dog`, …) | unchanged and cloneable. Whether any should be abstract is the later passes' question |
| `clone` verb, `StuffApi.clone`, `singleton`, `singletonOrClone` | refuse with the line |
| `props:` / `cast:` / `costume:` / `kit:` / `stockLines` / roster assignees | invariant 16 fails the build; the runtime refusal is the backstop for a row saved live |
| Hard-coded mints (`HerdRegistry`, `FishingEngagement`, `Trap`, `RearingTray`, `Ship`) | none names an abstract row; covered by the same refusal if one ever does |
| Pack install, `pack --export`, the pack hash | carry the key. A row without it hashes as before (`undefined` is dropped) |
| CMS read/write, `cat`, `cp`, `mv`, `saveTemplate` | carry the key; `cat` prints it |
| Studio | untouched: it composes classes |
| `findByClass` / `findWhereDataHas` | still return an abstract row; no catalogue warms agent rows by class. Recorded as a risk for the later passes (an abstract material would be warmed) |
| `lint:identity`, `lint:dossiers`, `lint:census`, `lint:kept-animals` | skip abstract rows |
| `rm` of the person kind | already refused while anything extends it |

**(d) The person kind — every person row.** The requirements' census, with
the counts verified and two rows it did not separate:

| Who | Count | What happens |
|---|---|---|
| Cast and Extra extending the student row | 100 + 8 | re-parented |
| The registry clerk (Cast, extends student, outside `agent/`) | 1 | re-parented and moved |
| The Pilot and the Tinker (bespoke classes that already extend student) | 2 | re-parented |
| The nurse | 1 | gains the parent and three garments (RC2) |
| Testbed Extras | 6 | same (RC2) |
| Bespoke classes with no parent (Gus, sellsword, Katie, Editor, Walter, Ricky, ticket clerk) | 7 | same (RC2) |
| Ship masters' seed rows (coaster, ketch) | 2 of the 100 | re-parented; their field jacket moves to the `master` seat of each ship company seed |
| Avatars | 3 | excluded |
| Animals | 21 | excluded |
| The carcass and the key ring | 2 | moved to `thing/` |
| Household-lifecycle parents | 0 (unbuilt) | will extend the person kind |

**(e) Seat duties and kit — every house and every holder.**

| Who | Count | What happens |
|---|---|---|
| House rows | 96 | 82 Business-class may declare duties and kit; 14 plain Organizations may not (lint) |
| Positions | 145 | 55 gain duties, 21 gain kit, the rest are untouched |
| Person rows whose work moves | 57 | per the table |
| Person rows whose garment moves | 22 | per the table |
| People with work and no seat | 12 | keep it (RC3) |
| People rostered on more than one seat of a house | 3 | `seatsOf` (RC5) |
| Seats with two holders and one duty | 2 (`moulder`, Waponi `cutter`) | one entry |
| Duties that run off shift | 27 brain types | `while: held` (RC1) |
| A proprietor covering an empty seat (`beginCover`) | any house with a `fulfills` seat | takes that seat's duties and kit for the cover, and sheds them at `endCover`. Today no first-`fulfills` seat that a cover lands on has kit after migration except where noted in W5's check |
| A player holding a seat | any | no duties, no kit (RC6); reads both on the opening |
| An ad hoc NPC hire (`house appoint`) | any | duties lent and kit worn at hire. `while: shift` duties run only if something starts its shift (`startsShiftOnHire`, or a roster slot): the third-population rule in `employment.md` is unchanged |
| A house in `offShift: out` | 11 | an off-shift hand is out of the narrative; a `while: held` duty is consulted exactly as its row-level brain is today |
| Sandbox copies, ships minted from seeds | all | the seed's positions carry the duties; nothing per-instance |
| Rows with no behaviors of their own afterwards | 21 | eviction window (D16, R3) |

**(f) `getBehaviors()` returning own plus lent — every reader.**

| Reader | Effect |
|---|---|
| `Behaved.canEvict` | D16 |
| `Behaved.converse` | finds an `engage` duty lent by a seat. None is lent after migration (`reads-water` stays on the fisher, who has no seat) |
| `Behaved.calledToAt` | asks lent brains too; no moved brain declares `callsAt` (`frequents` stays personal) |
| `KeptDoor.ts` ~74 | finds the doorman's spec, which is now lent by the `doorman` seat. It reads the spec's config, which moves with it. Verified in W5 by the cleanliness drive's door step |
| `lib/npc/tree.ts`, `CmsLogic`, `PackLogic` | read the `behaviors` field of a row for validation; unchanged, and W4 extends the CMS save-gate's brain validation to `positions[].duties` |

## The migration table

One line per person row. **`+`** = had no parent and gains the three plain
garments (RC2). **Seat** = the house's leaf name and the position (all
Business-class; the house is the one row whose `rosterSlots` names this
person, found by `grep -rl <row path> packages/content`). **To the seat** = behaviors that move, with config; `°`
means the duty carries `while: held`. **Own work** = work that stays on the
row because the person holds no seat. **Kit** = the garment that moves to the
seat. **Own garment** = stays on the row. Personality behaviors and `eats`
stay on every row and are not listed. Every row's parent becomes
`/stuff/agent/person`.

| Row | Class | + | Seat | To the seat | Own work | Kit | Own garment |
|---|---|---|---|---|---|---|---|
| `/trade/haulage/agent/carter` | Cast |  | carrier-business · carter | hauls° | — | field-jacket | — |
| `/trade/haulage/agent/dispatcher` | Cast |  | carrier-business · dispatcher | — | — | — | blazer |
| `/trade/haulage/agent/warehouseman` | Cast |  | depot-business · warehouseman | — | — | — | field-jacket |
| `^/lounge/agent/augie` | Cast |  | business · bartender | — | — | — | — |
| `^/lounge/agent/dave` | Cast |  | business · owner | enforces° | — | — | — |
| `^/lounge/agent/mara` | Cast |  | business · keeper | restocks° | — | — | — |
| `^/lounge/agent/remy` | Cast |  | business · bartender | — | — | — | — |
| `^/lounge/agent/sloane` | Cast |  | business · bartender | — | — | — | blazer |
| `^/newbie-wilds/agent/duelist` | Cast |  | — | — | arms | — | leather-boots, hide-jerkin |
| `^/newbie-wilds/agent/sellsword` | Mercenary | + | — | — | arms, backs-up | — | — |
| `^/newbie-wilds/agent/sentry` | Extra |  | — | — | wary | — | leather-boots, hide-jerkin |
| `~/counting-houses/agent/doorman` | Cast |  | business · doorman | doorman | — | greatcoat | — |
| `~/counting-houses/agent/officer` | Cast |  | business · officer | — | — | blazer | — |
| `~/counting-houses/agent/teller` | Cast |  | business · teller | — | — | blazer | — |
| `~/counting-houses/distributor/agent/clerk` | Cast |  | business · clerk | — | — | blazer | — |
| `~/eternal/campus-farm/agent/farm-hand` | Cast |  | farm-unit · hand | farms° | — | field-jacket | — |
| `~/eternal/duncan-hall/agent/katie` | Katie | + | — | — | maintains | — | — |
| `~/gazette/agent/editor` | Editor | + | — | — | prints | — | — |
| `~/general-store/agent/clerk` | Cast |  | business · clerk | — | — | — | — |
| `~/general-store/agent/keeper` | Cast |  | business · keeper | stocks° | — | — | tweed-jacket |
| `~/goods-yards/bottling/agent/hand` | Cast |  | outfit · hand | consigns° | — | — | — |
| `~/goods-yards/brewing/agent/hand` | Cast |  | outfit · hand | cellars°, cellars° | — | — | — |
| `~/goods-yards/crowsfoot/agent/hand` | Cast |  | outfit · hand | cellars°, consigns° | — | — | — |
| `~/goods-yards/farm/agent/hand` | Cast |  | outfit · hand | consigns° | — | field-jacket | — |
| `~/goods-yards/hollis/agent/hand` | Cast |  | outfit · hand | consigns° | — | — | — |
| `~/goods-yards/oilworks/agent/hand` | Cast |  | outfit · hand | consigns° | — | — | — |
| `~/goods-yards/pantry/agent/hand` | Cast |  | outfit · hand | consigns° | — | — | — |
| `~/goods-yards/sugar-house/agent/hand` | Cast |  | outfit · hand | consigns° | — | — | — |
| `~/goods-yards/sugar-house/agent/refiner` | Cast |  | outfit · refiner | refines°, restocks° | — | — | — |
| `~/goods-yards/veshko/agent/distiller` | Cast |  | outfit · distiller | cellars° | — | — | — |
| `~/goods-yards/veshko/agent/hand` | Cast |  | outfit · hand | consigns° | — | — | — |
| `~/goods-yards/vintner/agent/hand` | Cast |  | outfit · hand | cellars° | — | — | — |
| `~/harbor/agent/harbormaster` | Cast |  | harbor-works · harbormaster | — | — | — | field-jacket |
| `~/harbor/chandler/agent/chandler` | Cast |  | business · chandler | — | — | — | field-jacket |
| `~/harbor/ships/coaster/agent/master` | Cast |  | company · master | — | — | field-jacket | — |
| `~/harbor/ships/ketch/agent/master` | Cast |  | company · master | — | — | field-jacket | — |
| `~/harbor/yard/agent/shipwright` | Cast |  | business · shipwright | — | — | — | field-jacket |
| `~/hearthworks/agent/cook` | Cast |  | business · cook | restocks° | — | — | — |
| `~/hearthworks/agent/cookhand` | Cast |  | business · kitchen-hand | — | — | — | — |
| `~/hearthworks/agent/smith` | Cast |  | business · smith | stokes | — | — | — |
| `~/hearts-delight/agent/creamery-keeper` | Cast |  | creamery-coop · cheesemaker | — | — | — | field-jacket |
| `~/hearts-delight/agent/dairy-lad` | Cast |  | dairy-business · dairyhand | fodders° | — | field-jacket | — |
| `~/hearts-delight/agent/dairywoman` | Cast |  | — | — | — | — | field-jacket |
| `~/hearts-delight/agent/farmer` | Cast |  | farm-business · farmer | — | — | — | field-jacket |
| `~/hearts-delight/agent/miller` | Cast |  | mill-business · miller | — | — | — | — |
| `~/hearts-delight/agent/sawyer` | Cast |  | sawmill-business · sawyer | — | — | — | — |
| `~/hearts-delight/brickfield/agent/brickmaster` | Cast |  | brickmaster · master | — | — | — | — |
| `~/hearts-delight/brickfield/agent/moulder-a` | Cast |  | brickmaster · moulder | moulds | — | — | — |
| `~/hearts-delight/brickfield/agent/moulder-b` | Cast |  | brickmaster · moulder | moulds | — | — | — |
| `~/hearts-delight/brickfield/agent/potter` | Cast |  | pottery · potter | pots, stokes, consigns°, relines | — | — | — |
| `~/hearts-delight/brickfield/agent/setter` | Cast |  | brickmaster · setter | sets | — | — | — |
| `~/hearts-delight/ditch/agent/avila` | Cast |  | company · irrigator | — | — | field-jacket | — |
| `~/hearts-delight/ditch/agent/furtado` | Cast |  | company · irrigator | — | — | field-jacket | — |
| `~/hearts-delight/paper-mill/agent/vatman` | Cast |  | business · vatman | — | — | — | — |
| `~/hearts-delight/public-works/agent/warden` | Cast |  | department · warden | restocks° | — | — | — |
| `~/hearts-delight/silk-house/agent/hand` | Cast |  | outfit · hand | tends° | — | — | — |
| `~/hearts-delight/silk-house/agent/keeper` | Cast |  | outfit · keeper | — | — | — | — |
| `~/hesper/agent/lookout` | Cast |  | — | — | keeps-watch | — | field-jacket |
| `~/hollow-mere/agent/cutter` | Cast |  | ice-company · crew | harvests° | — | saw-sling | — |
| `~/hollow-mere/agent/house-hand` | Cast |  | ice-company · house-hand | keeps-house° | — | — | — |
| `~/hollow-mere/agent/ice-boss` | Cast |  | ice-company · ice-boss | bosses° | — | — | — |
| `~/hollow-mere/agent/keeper` | Cast |  | ice-company · keeper | — | — | — | — |
| `~/infirmary/agent/donor` | Extra |  | — | — | donates | — | — |
| `~/infirmary/agent/night-registrar` | Extra |  | window · night-registrar | banks | — | white-coat | — |
| `~/infirmary/agent/nurse` | Cast | + | business · nurse | nurses° | — | — | — |
| `~/infirmary/agent/physician` | Cast |  | business · physician | nurses° | — | — | white-coat |
| `~/infirmary/agent/registrar` | Cast |  | window · registrar | banks | — | — | white-coat |
| `~/infirmary/agent/runner` | Cast |  | bloodworks · runner | supplies | — | field-jacket | — |
| `~/market/agent/baker` | Cast |  | bakery-business · baker | — | — | — | — |
| `~/market/agent/fishmonger` | Cast |  | business · monger | — | — | field-jacket | — |
| `~/market/bathhouse/agent/attendant` | Cast |  | business · attendant | — | — | — | — |
| `~/mayfield-row/agent/walter` | Walter | + | — | — | maintains | — | — |
| `~/mayfield-row/cobbler/agent/cobbler` | Cast |  | outfit · cobbler | — | — | — | tweed-jacket |
| `~/mayfield-row/tailor/agent/tailor` | Cast |  | outfit · tailor | tailors°, restocks° | — | — | tweed-jacket |
| `~/necropolis/agent/undertaker` | Cast |  | business · undertaker | — | — | — | field-jacket |
| `~/nesbit-ferry/agent/ferryman` | Cast |  | ferry · ferryman | ferries° | — | — | field-jacket |
| `~/realty/agent/ricky` | Realtor | + | agency · agent | — | — | — | — |
| `~/registry/clerk` | Cast |  | business · registrar | — | — | blazer | — |
| `~/rejection/agent/ash-burner` | Cast |  | ashery-business · ash-burner | — | — | — | field-jacket |
| `~/rejection/agent/buyer` | Cast |  | smelter-business · buyer | — | — | blazer | — |
| `~/rejection/agent/collier` | Cast |  | fuel-yard-business · collier | relines | — | — | field-jacket |
| `~/rejection/agent/founder` | Cast |  | foundry-business · founder | — | — | — | — |
| `~/rejection/agent/glassblower` | Cast |  | glasshouse-business · glassblower | relines | — | — | field-jacket |
| `~/rejection/agent/hewer` | Extra |  | coop-business · miner | delves° | — | field-jacket | — |
| `~/rejection/agent/independent` | Extra |  | fringe-outfit · hewer | delves° | — | — | field-jacket |
| `~/rejection/agent/onsetter` | Cast |  | coop-business · onsetter | — | — | — | field-jacket |
| `~/rejection/agent/registrar` | Cast |  | — | — | — | — | blazer |
| `~/rejection/agent/roustabout-a` | Extra |  | — | — | — | — | field-jacket |
| `~/rejection/agent/roustabout-b` | Extra |  | — | — | — | — | field-jacket |
| `~/rejection/agent/smelterman` | Cast |  | smelter-business · smelterman | relines | — | — | — |
| `~/rejection/agent/storekeeper` | Cast |  | provisioning-business · storekeeper | relines | — | — | tweed-jacket |
| `~/rejection/put-in/agent/outfitter` | Cast |  | outfit · keeper | — | — | — | field-jacket |
| `~/terminal/agent/clerk` | TicketClerk | + | budget · clerk | — | — | — | — |
| `~/university-avenue/agent/gus` | Gus | + | — | — | crossing-ritual | — | — |
| `~/waponi-woo/agent/boiler` | Cast |  | estate · boiler | refines° | — | — | — |
| `~/waponi-woo/agent/cutter-1` | Cast |  | estate · cutter | cuts° | — | — | — |
| `~/waponi-woo/agent/cutter-2` | Cast |  | estate · cutter | cuts° | — | — | — |
| `~/waponi-woo/agent/hand` | Cast |  | estate · hand | — | — | — | — |
| `~/waponi-woo/agent/miller` | Cast |  | estate · miller | mills° | — | — | — |
| `~/waponi-woo/agent/owner` | Cast |  | estate · harbormaster | — | — | — | — |
| `~/waponi-woo/agent/smallholder-a` | Cast |  | — | — | cuts | — | — |
| `~/waponi-woo/agent/smallholder-b` | Cast |  | — | — | cuts | — | — |
| `~/wharfside/agent/fisher` | Cast |  | — | — | fishes, reads-water | — | field-jacket |
| `~/wharfside/agent/pilot` | Pilot |  | harbor-works · harbor | surveys° | — | field-jacket | — |
| `~/wharfside/chandlery/agent/ash-man` | Cast |  | ash-round · ash-man | ashes° | — | — | field-jacket |
| `~/wharfside/colorman/agent/colorman` | Cast |  | outfit · colorman | — | — | — | field-jacket |
| `~/wharfside/colorman/agent/housepainter` | Cast |  | painters-round · housepainter | paints° | — | — | field-jacket |
| `~/wharfside/diving/agent/dive-master` | Cast |  | outfit · master | — | — | — | field-jacket |
| `~/wharfside/diving/agent/pump-hand` | Cast |  | outfit · pump-hand | cranks° | — | field-jacket | — |
| `~/wharfside/diving/agent/tender` | Cast |  | outfit · tender | tends° | — | field-jacket | — |
| `~/wharfside/dyehouse/agent/dyer` | Cast |  | outfit · dyer | — | — | — | — |
| `~/wharfside/lavoir/agent/laundress` | Cast |  | laundry · laundress | — | — | — | — |
| `~/wharfside/lavoir/agent/washerwoman` | Extra |  | — | — | — | — | — |
| `~/wharfside/mill/agent/reeler` | Cast |  | outfit · reeler | stocks°, reels°, consigns° | — | — | — |
| `~/wharfside/mill/agent/spinner` | Cast |  | outfit · spinner | weaves° | — | — | — |
| `~/wharfside/mill/agent/weaver` | Cast |  | outfit · weaver | consigns° | — | — | — |
| `~/wharfside/ropewalk/agent/ropekeeper` | Cast |  | outfit · keeper | turns° | — | — | field-jacket |
| `~/wharfside/tinker/agent/tinker` | Tinker |  | round · tinker | stokes | — | — | tweed-jacket, satchel |
| `~/woodyard/agent/woodhawk` | Cast |  | yard · woodhawk | — | — | — | field-jacket |
| `^/testbed/agent/attendant` | Extra | + | venue · attendant | — | — | — | — |
| `^/testbed/agent/clerk` | Extra | + | venue · attendant | — | — | — | — |
| `^/testbed/agent/greeter` | Extra | + | venue · host | — | — | — | — |
| `^/testbed/agent/host` | Extra | + | venue · host | — | — | — | — |
| `^/testbed/agent/stand-in` | Extra | + | — | — | — | — | — |
| `^/testbed/agent/teller` | Extra | + | bank-business · teller | — | — | — | — |

Totals: 125 rows; 57 lose work to a seat (55 seats gain duties); 22 lose a
garment to a seat (21 seats gain kit: field jacket 14, blazer 5, greatcoat 1,
saw sling 1, white coat 1); 12 keep work with no seat; 14 gain plain clothes.
By pack: terminus 60, hearts-delight 17, rejection 14, waponi-woo 8,
test-fixtures 6, saxonberg-lounge 5, hollow-mere 4, trade-haulage 3,
newbie-wilds 3, hearthworks 3, eternal-university 2.

The table was generated from the tree at `a0dac7444` by rules D11.1–D11.7.
W5 regenerates it with `rows:diff` as the check: the composed view of every
row must equal its baseline, apart from the allow file. If a row's line here
and the diff disagree, the diff is right about what the row *was* and this
table is right about where things *go*; the build fixes the row, not the
baseline.

Three judgment calls in the table the owner may want to reverse, each a
one-line row edit:
- Dave's `enforces` moves to the lounge's `owner` seat (`while: held`; his
  rostered hour is 20–21). The requirements say the lounge cast's bar work
  moves "like anyone's".
- The cobbler's and the tailor's tweed jackets stay their own (archetype
  `proprietor`), as do the harbormaster's and nine other proprietors'
  field jackets.
- The physician's and the day registrar's white coats stay their own (each is
  their house's appointing authority); the night registrar's becomes the
  `night-registrar` seat's kit. The nurse's seat gets no kit, because the
  nurse wears no coat today.

## Waves

Every wave ends at a commit, staged by name, and is landable alone. After
each: `pnpm test:near`, the touched packs' own vitest, and
`pnpm -C packages/server lint:family`. `pnpm test` runs once, at W7.

### W0 — The diff tool and the baseline (D13)

*Goal:* the before-record exists before anything changes.

- Add `packages/server/scripts/resolved-rows.ts` and the `rows:dump` /
  `rows:diff` scripts in `packages/server/package.json`.
- `--compose-seats` is implemented now (it is a no-op on today's tree, which
  has no duties or kit).
- Unit test `packages/server/scripts/__tests__/resolved-rows.test.ts`: a
  fixture tree with a parent, a child, a house with a seat; dump, change,
  diff; an allowed difference passes; an unused allowance fails; a keyed
  reorder is a note, not a failure.
- Run `rows:dump --under <each agent path and each house row>
  --compose-seats` and commit it as
  `packages/server/scripts/__fixtures__/agent-taxonomy.baseline.json`, with an
  empty `agent-taxonomy.allowed.yaml`.

*Acceptance:* `rows:diff baseline <fresh dump>` reports no differences.
*Commit:* `tools(rows): the resolved-row diff and the agents-pass baseline`.

### W1 — The merge: behaviors by entry, and removal (D1, D2)

*Files:* `lib/mixin.ts` (`FieldMetaEntry.entryKey`), `lib/stuff/Template.ts`
(`entryKey` takes the field's key property; `mergeEntryLists` handles the
marker and returns the removals; `#inherit` fills `removed`; the three
failure throws), `lib/behavior/brain.ts` (`BehaviorSpec.as`, `LentBehavior`
type may wait for W4), `lib/behavior/Behaved.ts` (the `fieldMeta` line;
`fireBeat`, the intention and `_beatPeriod` key on the entry key),
`RESERVED_PROP_KEYS` in the same file (`remove`, `why`), `scripts/pack-roots.ts` (the mirror: `entryKey`, `mergeEntryLists`,
`FieldRule.entryKey`, `fieldMetaEntries` parsing it, `effectiveRow`
returning `removed`), `scripts/check-instanceable-placement.ts` (duplicate
behavior keys in one list; dangling, parentless or reasonless markers),
`platform/idea/cmd/shell/CatController.ts` and its model read (print
removals), `platform/idea/api/CmsLogic.ts` (return `removed` on read), the
brewing hand row (`as:` on both `cellars`).

*Tests:* `Template.extends.test.ts` (a parent's behavior survives a child's;
a child's same-brain entry replaces in place; `as` disambiguates; a marker
removes and is recorded with `from` and `why`; each of the three throws; a
costume marker removes `shoes`); `pack-roots.extends.test.ts` (the same
cases); a **parity test** that runs one table of cases through both merges
and asserts equal output; `Behaved` test for two same-brain wirings keyed
apart.

*Acceptance:* `rows:diff` clean (the brewing hand's `as` is stripped by the
composed view). `lint:family` green.
*Commit:* `feat(templates): behaviors merge by entry; an inherited entry can be removed`.

### W2 — Abstract rows (D3, D15)

*Files:* `lib/stuff/Template.ts` (`abstract` field, `isAbstract()`,
`TemplateSpec.abstract`), `api/stuff.ts` (`#cloneInner` refusal),
`platform/idea/api/PackLogic.ts` (row build ~1104, `canonicalBody`,
`exportBody`, and the installed row), `platform/idea/api/CmsLogic.ts`
(~451, ~640), `platform/idea/cmd/shell/{Cat,Cp,Mv}Controller.ts` only where
they build a `TemplateSpec` by hand, `platform/idea/cmd/author/CloneController.ts`
(render a `Refusal`), `packages/content/platform/content/reasons/abstract-row.yaml`,
`packages/content/platform/content/platform/cmd/author/clone.yaml` (one help
line), `scripts/pack-roots.ts` (`isAbstractRow`),
`scripts/check-instanceable-placement.ts` (invariants 16, 17 and their
labels), `scripts/check-identity.ts`, `check-dossiers.ts`,
`check-template-census.ts`, `check-kept-animals.ts` (skip abstract rows).
Test fixtures: `/world/testbed/agent/kind-fixture` and its two children
(D14).

*Tests:* cloning an abstract row throws `Refusal('abstract-row')` and leaves
nothing registered; a child of an abstract row clones; `abstract` survives
`saveTemplate` → read, `cp`, and a pack export; a pack row without the key
hashes as before; invariant 16 and 17 unit cases in
`scripts/__tests__/`.

*Acceptance:* the gates pass with the fixture kind in the tree. `rows:diff`
clean.
*Commit:* `feat(templates): abstract rows — a kind cannot be cloned`.

### W3 — The person kind; the student row goes; the misfiled rows move (D4, D11.1, D11.8, D12)

Content and the references to it. No kernel change.

- Add `generic-objects/…/stuff/agent/person.yaml` with a header comment that
  says what it is (a person; what every NPC is; plain clothes; abstract).
- Set `extends: /stuff/agent/person` on all 125 person rows. Rewrite the row
  comments that explain the student parent.
- Delete `generic-objects/…/stuff/agent/costume/student.yaml` and its
  directory.
- Move the three rows (D12) and update every reference in the table there.
- Update the tests that name the student row:
  `packages/wire/tests/template-inheritance.wire.test.ts`,
  `platform/idea/api/__tests__/PackLogic.newbie-wilds.test.ts`.
- Fill the allow file: for each of the 14 `+` rows, `costume` gains the three
  garments; the three path moves; the clerk's assignee path in its house's
  roster.

*Acceptance:* `grep -r "costume/student" packages` finds nothing outside
`docs/`. `rows:diff --allow` is clean: no row but the fourteen changed
effective data. `lint:instanceable` (11, 16, 17), `lint:identity`,
`lint:content-refs` green. The testbed and newbie-wilds pack tests pass with
their Extras dressed; an assertion that fails because an Extra now wears
clothes is updated and listed in the commit message (RC2).
*Commit:* `refactor(agents): every person extends the person kind; the student row is gone`.

### W4 — Seats carry duties and kit (D5–D9, D16)

Kernel. No content row uses the new fields until W5 except the testbed.

*Files:* `lib/employment/Position.ts` (`duties`, `kit`, coercers, serialize),
`lib/employment/Organization.ts` (`seatsOf`), `lib/employment/Employed.ts`
(the one line in `_setEmploymentStatus`), `lib/behavior/brain.ts`
(`LentBehavior`), `lib/behavior/Behaved.ts` (`lendBehaviors`, `source`/`live`
on a wiring, the gate at the three sites, `getBehaviors()` effective),
`lib/character/Character.ts` (`wearGarments` returns the seated garments),
`lib/npc/NPC.ts` (`reconcileSeats`, `seatKit` in `fieldMeta`, the
`_noteEmploymentChange` override, the call at the end of `onCreate`),
`scripts/check-openings.ts` (every duty's brain resolves and declares
`summary`; `while` is `shift` or `held`; kit entries are `Wearable` and
compose `Chattel`; no duplicate duty key within a position or across one
house's positions; no `duties`/`kit` on a non-Business row),
`scripts/check-idle-cadence.ts` (read seat duties as well as row behaviors),
`scripts/pack-roots.ts` only if `--compose-seats` needs a shared reader,
the CMS save-gate's brain validation (`behavior.md` § CMS save-gate
validation names it) extended to `positions[].duties`.
Test fixtures: `/world/testbed/idea/works` and `/world/testbed/agent/smith`
(D14), and `cast:` on `/world/testbed/place/works` for the smith.

*Tests* (`lib/npc/__tests__/NPC.seats.test.ts`,
`lib/employment/__tests__/Position.test.ts`, `Behaved` tests,
`platform/idea/api/__tests__/EmploymentLogic.*.test.ts`):
- a hired NPC is lent the seat's duties; a dismissed one loses them;
- a `while: shift` duty is not a candidate off shift and is on shift, with no
  rewire between; a `while: held` duty is a candidate both ways;
- the row's own entry with the same key wins and the seat's is not wired;
- lending leaves other wirings' scratch state and the intention alone;
- kit is worn once; a second reconcile wears nothing; capture, destruct,
  materialize, reconcile: still one of each garment (the restart case);
- leaving the seat destructs exactly the recorded garments and nothing the
  person owns, including when the person's own costume has the same
  template;
- a cover takes and sheds duties and kit;
- `seatsOf` for one seat, for two seats of one house, for an exited record;
- a player (an `Avatar`) hired into the seat has no wiring and no kit;
- `Position.fromData` throws on a malformed duty, an unknown `while`, a kit
  entry that is not a path or `{template, as}`.

*Acceptance:* the testbed smith, on shift, has `stokes` in
`getBehaviors()` and wears the kit; `rows:diff` clean for every shipped row.
*Commit:* `feat(employment): a seat declares its standing work and its kit`.

### W5 — Move the work and the kit to the seats (D11.2–D11.7)

Content only, pack by pack, one commit per pack or small group so a review
can read each: saxonberg-lounge; hearthworks; terminus (goods-yards);
terminus (infirmary, counting-houses, general-store, market, mayfield-row,
registry, harbor, wharfside, the rest); hearts-delight; rejection;
waponi-woo; hollow-mere; trade-haulage and eternal-university.

For each seated row in the table: cut the listed behavior entries (with
their config and comments) from the row and paste them under the seat's
`duties:`, adding `while: held` where the table shows `°`; cut the listed
garment from `costume:` and add it to the seat's `kit:`. A row left with an
empty `behaviors:` or `costume:` loses the key.

*Acceptance, per commit:* `rows:diff --allow` clean with `--compose-seats`
(the composed view of every touched person equals the baseline);
`lint:openings`, `lint:idle-cadence` (the census of candidate brains is
unchanged in total), `lint:instanceable` green; the pack's own vitest green.
After the last commit, the cover check from census (e): list every house
whose first `fulfills` position now has kit and whose proprietor is not on
its roster, and record the list in the commit message (a covering proprietor
will put that kit on).
*Commit titles:* `refactor(<pack>): job work and kit move to the seats`.

### W6 — Openings name the duties (D10)

*Files:* `lib/employment/Opening.ts` (the `duties` constructor field,
`describe()`, `terms()`), `platform/idea/api/EmploymentLogic.ts`
(`noticesAt` and `Organization.openings()`' construction site pass the
resolved duties), `platform/idea/cmd/work/JobApplyController.ts` (`--terms`
prints and returns), `packages/content/platform/content/platform/cmd/work/job.yaml`
(the option under `apply`, and two sentences of help),
`Opening` and `JobApply` tests.

*Acceptance:* at the testbed works with the smith seat vacant, `look` shows
`HELP WANTED — smith, …; no prerequisite. The work: stokes.` and
`job apply --terms` prints the `stokes` summary and the kit and hires nobody;
bare `job apply` still applies. `lint:view-keys`, `lint:command-views` green.
*Commit:* `feat(employment): an opening says what the job is`.

### W7 — Drive, walk, docs, the full suite, the MR

- Write and run the blocking drive and the browser walk (Test & gate
  strategy). Make each checkpoint fail once on purpose (B2).
- Subsystem docs: `templates.md` (§ Inheritance: `entryKey`, removal,
  abstract rows, the naming rule; delete both student passages),
  `employment.md` (duties, kit, `seatsOf`, the opening), `behavior.md` (lent
  behaviors, the gate, the entry key), `identity.md` (the person kind under
  the two rungs), `lint-family.md` (invariants 16, 17; the `lint:openings`
  additions), `testing.md` (the testbed works). The fault lines (C6) go to
  `api-normalization-slate.md` Part 8. The row-composition slate's status
  line is updated (items 1–4 built).
- Delete the two fixtures under `scripts/__fixtures__/` at the sweep, not
  here.
- `pnpm test` once; open the MR ready.

*Commit:* `test(agent-taxonomy): the drive; docs`.

## Reachability wiring

| Capability | Verb | Affordance | Data | Load | Arg gate |
|---|---|---|---|---|---|
| A holder does the seat's duties | none (brains act) | n/a | `positions[].duties` on a Business row | the NPC's employment record names the house; `reconcileSeats` loads it; each brain is warmed by path at wire time | n/a |
| A holder wears the seat's kit | none | n/a | `positions[].kit` | same load; each garment row is cloned by path | n/a |
| A removal on a child row | none | n/a | `{ remove, why }` in a by-entry list | resolved when the row materializes | n/a |
| An abstract row refuses | `clone` (and every mint) | `clone` is afforded as today | top-level `abstract: true` | the template is loaded by the clone itself; the reason row by its code | `clone`'s existing path argument |
| Read a seat's terms | `job apply --terms` | `job` is every character's (`Persona`) | `Opening.terms()` | `noticesAt` awaits the houses attached to the place, as today | the option is boolean; the `for`/`at` arguments filter as today |
| The sign names duties | `look` | as today | `Opening.describe()` | as today | n/a |

The three ways this could ship dead, and what catches each: a duty on a
position of a plain `Organization` (no employment, so never lent) is refused
by `lint:openings`; a duty whose brain path is wrong is refused by the same
gate and warned at wire time; an NPC whose house never runs a roster pass has
no record and so no duties (Risks R3), which the drive's unwatched step
checks.

## Acceptance-criteria coverage

| Criterion | Waves | Proved by |
|---|---|---|
| No row extends the student row, and it no longer exists | W3 | grep; `lint:instanceable` 11; drive step 10 |
| Every NPC person row inherits the person kind; avatars and animals excepted | W3 | `rows:dump` (every person row's chain ends at `/stuff/agent/person`); drive step 10 |
| Every NPC looks and behaves as before, except the table's moves | W3, W5 | `rows:diff --allow`; drive steps 1, 2 |
| A fresh hire does the seat's job and wears its kit with nothing on their row; a vacant seat's duties go undone and the opening lists them | W4, W6 | unit tests; drive steps 3, 4, 5 |
| A parent's behavior survives a child's own; a child can remove one, readably | W1 | unit tests; drive steps 7, 8 |
| Cloning an abstract row is refused with a line | W2 | unit test; drive step 9 |
| After a restart, nobody's kit is doubled or lost | W4 | the capture/materialize unit test; drive step 11 |
| A second house of the same kind staffs and runs its seats with no code | W4, W5 | the testbed works is that second house: it reuses `stokes` with rows only |

Nothing is unmapped. RC6 narrows the fourth criterion to NPC hires.

## Test & gate strategy

**Unit tests** carry the algebra (W1), the refusal (W2), the join and the
kit record (W4) and the opening's words (W6), as listed per wave.

**The diff** (`rows:diff`) carries "nothing changed" for all 125 rows and 96
houses. It is static: it proves the data, not the running world.

**The blocking drive**:
`packages/wire/tests/agent-taxonomy.dirty.wire.test.ts` (dirty: it dismisses
and hires). It follows `agent-coordination.dirty.wire.test.ts` for watching a
brain act (`fireBeat` through the harness's eval, then reading the place).

| # | Step | Pace | How | Where and with what |
|---|---|---|---|---|
| 1 | Nobody looks different | instant | player | `look` at Remy (the lounge), the dairy lad (kit: field jacket from the seat), the general-store keeper, Gus (now dressed, RC2), a testbed Extra (now dressed). Assert each one's worn list against the table |
| 2 | The job comes from the seat | short | player | the Hearthworks smith on shift: the forge is fed (`stokes`); the goods-yards farm hand: a consignment reaches the counter. Assert neither row's own `behaviors` lists the brain (`cat`) |
| 3 | A new hire does the job | short | staged | testbed works: `house dismiss` the testbed smith, `clone /world/testbed/agent/stand-in --here`, `house appoint` it to `smith`. It is on shift (`startsShiftOnHire`), feeds the forge and wears the kit |
| 4 | A vacancy takes its duties | short | staged | between the dismiss and the appoint in step 3: the forge goes unfed across two beats and `look` shows the notice |
| 5 | The opening says what the job is | instant | player | same moment: the sign's line ends `The work: stokes.`; `job apply --terms` prints the summary and the kit and leaves the seat open |
| 6 | Off shift, no duties | short | player | `testharness clock-advance` to after 18:00 at the testbed works (under a game day): the smith's `stokes` is not a candidate. The brewing hand's `cellars` (`while: held`) still is, after the same jump |
| 7 | A parent's behavior survives | instant | staged | clone the fixture child that lists its own behavior: `getBehaviors` has both, and both fire |
| 8 | Removal is visible | instant | staged | clone the fixture child that removes: the behavior is absent; `cat` on its row prints "removed from /world/testbed/agent/kind-fixture" with the reason |
| 9 | A kind can't be cloned | instant | staged | `clone /stuff/agent/person` and `clone /world/testbed/agent/kind-fixture`: refused with the line; nothing appears |
| 10 | No student is left | instant | staged | `cat /stuff/agent/costume/student` finds nothing; `cat` on the carcass and the key ring at their `thing/` paths succeeds; the `rows:dump` chain check from the acceptance table runs as part of the gate, not the wire file |
| 11 | Restart | short | staged | with the stand-in holding the seat on shift: restart the owned world, log back in, read its worn list (one of each kit garment) and watch the forge get fed |

Step 4 has to be able to fail: the checkpoint asserts the fire's fuel fell,
not that no message was seen. Step 11 must restart the world, not rebuild
state (R4).

**The soak drive** (the lane, after merge):
`packages/wire/tests/agent-taxonomy.soak.dirty.wire.test.ts`, step 12. Seven
game days at the testbed works and the brewing floor: on each day the smith's
`stokes` is live inside `[8, 18)` and not outside it; the hand's worn list
has the same length every day. Its staged twin is step 6 plus step 11. The
arithmetic of the gate (a `while: shift` wiring is live exactly when
`isOnShiftFor` is) is proved in the W4 unit tests.

**The browser walk:** `e2e/tests/agent-taxonomy-walk.spec.ts`, once, at
code-complete: steps 1, 5 and 9 in a browser (the notice is on its own
uncarded scene and has been invisible in a browser before).

**Suite moments:** `pnpm test` at W7 and at `/finalize`. Everything else is
`test:near`, pack vitest and `lint:family`.

## Risks & opens

**R1. Stamping kit to the house.** D6 titles each kit garment to the house
to get a durable id and an honest owner. If wearing a good titled to another
owner has a side effect (custody, a `look` line, a theft read), the build
keeps the record and drops the stamp: mint the chattel id without a title if
the chattel logic allows it, else record the garments by part name. Stop and
ask only if neither gives an id that survives a restart.

**R2. Loading a house from its holder.** `reconcileSeats` stands a house up
by `StuffApi.singleton`. A holder is normally loaded with its place, where
the house is attached and stands on arrival anyway. If standing a house from
here starts work that arrival was meant to start (a boot storm, a roster pass
fetching a cast), fall back to reading only a house that is already standing
and re-running the reconcile from `tickBusiness` for each live assignee. Do
not add a boot entry.

**R3. The window before the first roster pass.** A freshly cloned hand has no
employment record until its house's tick sees it, so it has no duties and, if
it is one of the 21 rows with no behaviors of its own, no eviction veto.
Today its brain runs from `onCreate`. Check with the drive: load a
goods-yards floor with no player in it (the consigns hand's unwatched leg)
and confirm a consignment still reaches the counter within two game hours.
If it does not, the fix is to run the house's roster pass when a place stages
its `cast:` (the same `housesAttachedTo` walk arrival uses), in
`EmploymentLogic`, not a veto and not a brain on the row.

**R4. The order of restore and `onCreate`.** If an NPC's `employments` are
restored after `onCreate`, the setter fires the reconcile; if before,
`onCreate` does. Both paths are covered, and the kit record makes either
order idempotent. The W4 restart test must exercise the real
capture/materialize path, not a hand-built object.

**R5. The fourteen newly dressed.** Test assertions that read a testbed
Extra's look, weight or carried count may change. Each updated assertion is
named in W3's commit message. If more than a handful change, stop and put
RC2's alternative to the owner.

**R6. Two copies of the merge.** W1 changes both and adds the parity test.
A lint that reads rows through neither (its own YAML walk) will see raw
`{ remove }` entries; `grep -l "behaviors\|costume" scripts/check-*.ts`
before W1's commit and route each through `effectiveRow`.

**R7. `KeptDoor` and the doorman.** The door reads the doorman's spec through
`getBehaviors()`. It is lent only after the reconcile. If the cleanliness
drive's door step fails in the window, `KeptDoor` asks the keeper's house for
the seat's duty instead; it must not go back onto the row.

**R8. Master moves under the baseline.** Tropes edits two clerks' dialogue
rows. D13 says how to re-dump exactly those rows.

**Stop and ask** (the build otherwise does not stop): if `rows:diff` shows a
difference that is in neither the table nor a master merge; if a universal
change turns out to touch a population missing from the censuses; if RC1's
default makes any existing soak drive's production step fail (it should not:
the default preserves it).

## Deferred seams

- **Dressing with the shift and the weather** → cast-in-winter W6 (D14
  there). It replaces the kit half of `NPC.reconcileSeats` (the
  `wearGarments` call and the destruct) with `dress()` and `hangUp()` over
  the house's pegs, and `seatKit` with its `borrowed` list. `Position.kit`
  stays the declaration. A note to that build goes in
  `docs/plans/agent-taxonomy-note-to-cast-in-winter.md` at W7.
- **`fends` on the person kind, `stokes` on fire-tending seats** →
  cast-in-winter W6. The attach points are the person kind's `behaviors:`
  (merged by entry, removable with a reason) and `positions[].duties`.
- **Kit for a player holder** → cast-in-winter (pegs); RC6.
- **Organizations materializing employment** (so Katie's, Walter's and the
  Editor's work can sit on their seats) → `docs/slates/tech-debt/` as a new
  short slate, `organization-employment-slate.md`, written at W7 with RC3 and
  RC5 as its content.
- **Role and temperament kinds behind the archetype label** →
  cast-archetype-slate, unchanged.
- **Animal kinds; abstract rows for places, things and ideas; garment
  renames** → the later taxonomy passes. Census (c) records the one thing
  they must check first (catalogues that warm rows by class).
- **The composition primitive** → row-composition-slate, still gated on
  volume. This build needed none.
- **Field-level removal and deep `by-key`** → row-composition-slate, items
  that stay there.

## Critical files

Read these first, in this order.

1. `docs/requirements/agent-taxonomy-requirements.md`
2. `docs/slates/tech-debt/row-composition-slate.md` (the ledger at the end)
3. `docs/subsystems/templates.md` § Inheritance, § The entry shape,
   § Instruction appliers run ONCE
4. `packages/server/src/mud/lib/stuff/Template.ts` (60–200, 290–400)
5. `packages/server/scripts/pack-roots.ts` (740–1220)
6. `packages/server/src/mud/lib/behavior/Behaved.ts` (whole file) and
   `lib/behavior/brain.ts`
7. `packages/server/src/mud/lib/npc/NPC.ts`,
   `lib/stuff/Costumed.ts`, `lib/character/Character.ts` (200–265)
8. `packages/server/src/mud/lib/employment/Position.ts`, `Employed.ts`
   (380–600), `Organization.ts` (440–530), `Opening.ts`
9. `packages/server/src/mud/platform/idea/api/EmploymentLogic.ts`
   (470–640, 1726–1915)
10. `docs/subsystems/employment.md` § Presence and cover, § The opening;
    `docs/subsystems/behavior.md` § The deliberation beat
11. `packages/server/src/mud/api/stuff.ts` (440–560);
    `packages/server/scripts/check-instanceable-placement.ts`,
    `check-openings.ts`, `check-identity.ts` (236–262)
12. `packages/content/test-fixtures/content/world/testbed/` (the venue, the
    forge, the stand-in)
13. `git show origin/reqs/cast-in-winter:docs/plans/cast-in-winter-plan.md`
    § Sequencing and D14
14. `packages/wire/tests/agent-coordination.dirty.wire.test.ts` (how a drive
    watches a brain) and `template-inheritance.wire.test.ts`

## Drive record

*(appended at build time)*
