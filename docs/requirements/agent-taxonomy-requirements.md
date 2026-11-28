# Agent taxonomy — requirements (the agents pass)

**Kind:** refactor/sweep, with a small feature at its center (what a seat
declares).
**Leads from:** kernel. Rows learn to merge behaviors entry by entry, to
remove one inherited entry, and to be abstract; seats learn to carry a job's
standing work and kit. The first consumers ship in this build: every person
row (re-parented onto the person kind) and every work behavior and work
garment moved onto its seat. The next consumer is cast-in-winter W6, whose
`fends` goes on the person kind and whose `stokes` and winter kit go on seats.

Almost every NPC in the game is a "student": 111 rows extend
`/stuff/agent/costume/student`, a row that is an outfit pretending to be a
person (row-composition-slate). This pass replaces it with what the rows
actually are:

- a **person**, which is what every NPC is;
- a **job**, which is a seat a person holds;
- **this particular person**, the row's own data.

It's the first pass of the template-taxonomy refactor (agents → places →
things → ideas), and it runs first because cast-in-winter must not add
behavior to every agent in code (owner, 2026-11-28: *anything done to every
agent needs discussion*). Universal behavior has to be declared somewhere
visible and overridable, and that place doesn't exist yet.

**Seeding:**
[row-composition-slate](../slates/tech-debt/row-composition-slate.md) (the
student row, abstract rows, the naming rule for rows, removal; the reuse
ledger is at its end), [identity.md](../subsystems/identity.md) (Cast and
Extra, the archetype stamp), and
[cast-in-winter-plan](../plans/cast-in-winter-plan.md) § Sequencing (the
consumer; on `reqs/cast-in-winter`).

## What already exists

- **151 agent rows.**
  - 101 Cast and 15 Extra.
  - 9 bespoke person classes: Gus, the Mercenary, Katie, the gazette
    Editor, Walter, the realtor, the TicketClerk, the Pilot, the Tinker.
  - 21 animals.
  - 3 avatar rows.
  - 2 misfiled non-agents: a hanging carcass and a key ring.
- **What people rows carry.** All of them carry keywords, a short
  description and a register. Almost all carry a species (84 sapiens, 28
  sensitivus) and a long description. Most carry behaviors (103), competence
  (100), dispositions (92) and an archetype label (101). Fewer carry a name
  (88), pronouns (68), a costume (58) or a prologue (40).
- **What repeats.** Only the inherited three-garment costume and a handful
  of exact blocks:
  - the arrival introduction, byte-identical on 32 rows;
  - `diligence 60` on 19 rows.
  - Each costume row adds exactly one garment: field jacket 38, blazer 7,
    tweed 4, white coat 3, greatcoat 1, plus two armored rows.
- **Behaviors split into two families.**
  - Personality: idles (54), introduces (32), greets (28), tree-dialogue,
    random-chatter, frequents.
  - Work loops: consigns (11), restocks (5), relines (5), cellars (5),
    stokes (2), cuts, delves and others.
- **Inheritance today.** One parent per row, resolved at read time. Each
  field has a merge rule, and `costume`, `props` and `cast` merge entry by
  entry. ⚠ **`behaviors` and `dispositions` are replaced wholesale:** a
  child that lists any behavior loses all of its parent's. There are no
  abstract rows, no way to remove one inherited entry, and no naming rule
  for rows.
- **The archetype label.** A free string on 101 rows with 40 values, stamped
  onto seeded claims so deviation can be measured. No row backs it. The
  cast-archetype slate decided archetypes are applied by expansion, "not
  template inheritance".
- **Employment.** A house has positions and seats; a seat already grants
  data (`fulfills`, `purchases`, read off the shift); the roster puts holders
  on and off shift; openings and the help-wanted sign are derived from seats.
- **In flight.**
  - tropes (build-1) touches two clerks' dialogue only.
  - decomposition (build-3) defers material parents to the taxonomy passes.
  - front-page-sources (build-4) doesn't touch NPCs.
  - cast-in-winter consumes this pass.

**Therefore what is genuinely new here is:**
- one abstract **person kind** that every person row inherits;
- behaviors that **merge entry by entry** under inheritance, and a visible
  way to **remove** one inherited entry;
- **abstract rows** that can't be cloned;
- a **seat** that declares its job's standing work and kit;
- the **naming rule** stated for rows;
- the student row's retirement.

## Goals

- Every person row inherits one person kind, and nothing extends the student
  row, which is gone.
- A row's parent says what the row is. A job's standing work and work
  clothes belong to the seat, so whoever holds the seat does the job and
  wears its kit, a new hire included, with nothing written on their row.
- Behaviors declared on a parent survive in every child that adds its own,
  and a child can drop one inherited behavior by saying so on its own row,
  where a reader can see it.
- An abstract row can't be cloned. Trying says so.
- A player reading an opening (help wanted, `job` listings) sees the seat's
  standing duties.
- Nothing a player can see changes for any NPC, except where a garment or
  duty moved to a seat and so now follows whoever holds it.

## Non-goals

- **`fends`, body needs, and dressing for the weather** → cast-in-winter W6.
  It declares `fends` on the person kind this pass creates.
- **Backing the archetype label with rows** (role and temperament kinds) →
  cast-archetype-slate. The label stays a label, and the slate's decision
  that archetypes aren't parents stands.
- **Animal kinds** → nowhere, deliberately, this pass. An animal's class
  already names its kind, and the only repeated animal data (the farm dog)
  already has a parent.
- **The composition primitive** (named fragments a row includes) →
  row-composition-slate, still gated on volume. The seat makes it
  unnecessary here.
- **Players' bodies** (the three avatar rows, char-gen's starting outfit) →
  unchanged. Players aren't NPC rows.
- **Renaming the student garments** (`student-shirt` and the rest) → the
  things pass.
- **Places, things and ideas** → the later passes of this refactor.

## Placement

- **Kernel:** the merge rule for behaviors, removal, abstract rows, and
  seat-declared work and kit in employment. They're cross-cutting and
  belong to no trade.
- **The person kind:** one row in the generic-objects pack, under
  `/stuff/agent/`, named for what it is (a person).
- **Seats:** each house's own pack declares its seats' work and kit, so a
  second dairy needs no code, only its seats.

## Collisions

- **Every person row** (about 125 with the bespoke classes and the registry
  clerk) changes parent. Exception census (owner's rule, 2026-11-28):

| Who | What this pass does |
|---|---|
| 100 Cast + 8 Extra extending the student row | re-parented onto the person kind; any garment they add stays theirs or moves to their seat (decided per row) |
| The infirmary nurse and the registry clerk (the clerk sits outside an `agent/` path) | the nurse extends nothing today; both get the person kind. The clerk's row moves under an `agent/` path |
| 6 testbed Extras (no parent today) | get the person kind; their test assertions are unchanged |
| 9 bespoke classes (Gus, Mercenary, Katie, Editor, Walter, realtor, TicketClerk, Pilot, Tinker) | rows get the person kind; their classes are untouched |
| A person who does a job but holds **no seat** (Gus's crossing, Katie) | the work stays on their own row: no seat, no seat duties |
| The lounge cast (Dave, Remy…) | person kind only; their bar work moves to the bar's seats like anyone's |
| Ship masters cloned from seed rows | seed rows get the person kind |
| Household-lifecycle parents (unbuilt) | will inherit the person kind when built; nothing to do now |
| Avatars (Primary, Shade, Sandbox) | excluded: players |
| 21 animals | excluded (Non-goals) |
| The hanging carcass and the key ring under `agent/` paths | moved to their honest branch (`thing/`) |

- **Work loops** (consigns, restocks, relines, cellars, stokes, cuts, delves
  and the rest) move to the seats whose job they are. A seat's duties run
  while its holder is on shift. ⚠ A work behavior that runs off shift today
  (the cellars' nightly round) keeps that, said on the seat.
- **Field jackets, white coats and blazers** move to a seat's kit wherever
  they're the job's (the farm's field jacket, the infirmary's white coat),
  and stay on the person where they're the person's own (a proprietor's
  blazer may be theirs). Decided row by row, in a table in the plan.
- **cast-in-winter's plan** changes from "role kinds" to seats for `stokes`
  and winter kit (§ Sequencing). That edit lands when this doc is agreed.
- **tropes** edits two clerks' dialogue. No other overlap.

## Surface decisions

### A person kind, abstract, inherited by every person row (owner, 2026-11-28)
One row says what every NPC is. For now that's plain everyday clothes;
cast-in-winter adds looking after its own body. It can't be cloned on its
own: it's a kind, not anybody.

### A job is a seat, not a parent (owner, 2026-11-28)
A seat in a house declares its **standing work** (the behaviors whoever holds
it performs on shift) and its **kit** (the clothes and tools the job wears).
A hand is a person holding a seat: has-a, not is-a. So a new hire does the
job with nothing on their row, a vacancy takes its duties with it, and a
player reading the opening sees what the job involves. Personality (idling,
greeting, introductions, chatter, conversation, where they like to sit) stays
on the person.

### Inherited behaviors merge, and removal is visible (recommended, to confirm)
A parent's behaviors survive in a child that adds its own, and a child
replaces a parent's entry by naming the same behavior. A child drops one
inherited entry by listing it as removed on its own row. That's the "every
X" door: any person may opt out of a universal behavior, and the reason is on
that row.

### Seat kit is worn while holding the seat (recommended, to confirm)
In this pass the holder wears the seat's kit when they take the seat, which is
what each row gets today, just from a different source. Cast-in-winter later
makes that kit go on and come off with the weather and the shift.

### The archetype label stays a label (recommended, to confirm)
It keeps doing its measuring job. Backing it with rows is the cast-archetype
slate's, and its decision that archetypes are applied by expansion, not
inheritance, stands.

### The naming rule for rows
A row is named for what it IS, and its own prose is checked for the noun.
That's CLAUDE.md's rule for classes, stated for rows. It's what would have
caught "costume/student", a row whose comment calls it an outfit nine times
and a student never.

## Lens pass

1. **Pedagogy.** A job you can read before you take it: an opening lists its
   duties, which is the start of a labor market you can learn from.
2. **Creative expression.** The ordinary case is a person row with no
   behaviors for the job, because the seat supplies them. The bespoke case
   (a person who does their job their own way) overrides on the row, or
   removes an inherited entry, in plain sight.
3. **Immersion and participation.** Nothing visible changes for an NPC. A
   player holding a seat isn't driven by its behaviors (players have no
   brains), but sees what the house expects.
4. **Values.** None at stake. The person kind holds no opinion, and its
   contents are clothes and, later, a body's needs.
5. **Continuity.** The seat survives the epoch: the fire-tender's seat
   becomes the boiler-tender's, and the duty and kit change on one row.
6. **Economy.** Kit on the seat is the house's cost, not the person's, so the
   demand for work clothes is the house's, which is what cast-in-winter's
   pegs need.
7. **Governance.** Nothing judges a person.

## The drive

Tags: pace (`instant` · `short` · `staged` · `span`) and how each assertion
is made (`player` · `staged`).

### Blocking drive

1. **Nobody looks different** `instant` · `player`. `look` at a sample of the
   cast across localities (Remy at the bar, the dairy lad, a storekeeper, Gus,
   a testbed Extra): each reads and is dressed as before, unless their row's
   entry in the plan's table says a garment moved to the seat.
2. **The job comes from the seat** `short` · `player`. Watch the smith on
   shift: the forge is tended as before. Watch a storekeeper: consignments
   are shelved as before. Neither row lists those behaviors any more.
3. **A new hire does the job** `short` · `staged`. Vacate the smith's seat
   and put a fresh Extra in it. On shift, the Extra tends the forge and wears
   the seat's kit.
4. **A vacancy takes its duties** `short` · `staged`. With the seat empty,
   nobody tends the forge, and the opening is posted.
5. **The opening says what the job is** `instant` · `player`. Read the
   help-wanted sign and `job` listing for that seat: its standing duties are
   named.
6. **Off shift, no duties** `short` · `player`. At shift end the smith stops
   tending, and the cellars' night round still runs as its seat says.
7. **A parent's behavior survives a child's** `instant` · `staged`. A test
   person kind with a behavior, and a child row that lists its own: the child
   does both.
8. **Removal is visible** `instant` · `staged`. A child that removes the
   inherited behavior doesn't do it, and the row reads that it was removed.
9. **A kind can't be cloned** `instant` · `staged`. Cloning the person kind
   is refused with a line saying it's a kind.
10. **No student is left** `instant` · `staged`. The student row doesn't
    exist; every person row inherits the person kind; the carcass and key
    ring are in `thing/`.
11. **Restart** `short` · `staged`. Restart the world mid-shift. Holders still
    wear their seat kit once, no garment is doubled or lost, and duties
    resume.

### Soak drive

12. **A week of shifts** `span`. Across seven game days, every seat's duties
    run on shift and stop off shift, and no holder accumulates kit.

## Acceptance criteria

- No row extends the student row, and it no longer exists.
- Every NPC person row inherits the person kind. The only exceptions are the
  avatars and animals, by decision.
- Every NPC looks and behaves as before, except the moves the plan's table
  names.
- A fresh hire in any seat does that seat's job and wears its kit with
  nothing on their row. A vacant seat's duties go undone, and the opening
  lists them.
- A behavior on a parent row survives in a child that lists its own. A child
  can remove one inherited behavior, and the removal is readable on the row.
- Cloning an abstract row is refused with a line saying why.
- After a restart, nobody's kit is doubled or lost.
- A second house of the same kind staffs and runs its seats with no code.

## Cross-references

- Seeding: row-composition-slate (and its reuse ledger), identity.md,
  cast-in-winter-plan § Sequencing.
- Subsystems: templates.md (inheritance), employment.md (seats, shifts,
  openings), behavior.md, identity.md, connection.md (avatars excluded),
  furnishing.md (kit kept by a container, for cast-in-winter's pegs).
- Slates: cast-archetype-slate, household-lifecycle-slate, legibility-slate
  (owns `extends:`), base-class-narrowing-slate (the class-side precedent).
- In flight: cast-in-winter (consumer), tropes, decomposition.
