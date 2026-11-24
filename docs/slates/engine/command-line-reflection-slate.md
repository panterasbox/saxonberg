# Command-line reflection — `which`: what can I type here

> **Status: PARTIAL** — opened 2026-11-23 (owner, in naming-overhaul
> review); `which`, its card and the affordance audit **shipped** in MR !656
> (2026-11-24) — command-routing.md § `which`, card-surface.md, and
> antipatterns.md § A string slot that names things.
> **Left:** what can I do with this — an object's role in a verb ·
> typeahead and the radial reading the answer · scripts asking
> whether a verb exists.
> **Size:** a build (the object roles); the rest tails.

## Why this exists

MUD interfaces were terrible, and that is where we are coming from. A
newcomer stares at a prompt with no menu: *what can I type?* MUDs grew
command-listing commands because a text-only medium could not show it
any other way. We have hypertext, so not everything must be an explicit
command — but the server command comes first, and the client reads from
it whatever it can (owner, 2026-11-23).

## What this is — and is not (owner, 2026-11-23)

- ⛔ **Not help.** `help` is reference documentation — sometimes derived,
  basically static: what a verb *is*, its shape, its usage. `which` is the
  read on what is **changing all the time** — what you can type *here,
  now*. Where `which` must borrow from help, it does so knowingly and
  says so; it never reprints a verb's shape (`help fish` owns that).
- ⛔ **Not typeahead.** Typeahead is implicit and client-side; this is a
  deliberate **server** command. Typeahead is a later consumer that reads
  the same model (pushed, never a command per keystroke).
- **Server first.** Whatever the client holds today (below) is an
  implementation detail the build may reuse or toss; the server command
  is the source of truth.

## Decided (owner, 2026-11-23)

*Shipped (MR !656) — command-routing.md § `which`. The final shape after
review: `which`, `which <thing>` (an object slot), `which --verb <verb>`,
`which --clashes`, `which ~`; the card in card-surface.md.*

## Rules every answer obeys

- **Perception.** No answer names what the asker cannot perceive — a
  concealed fixture's verbs do not appear; a hidden thing gives no
  `which <thing>`. Otherwise the shell is a detector (concealment.md; the
  binder's `PerceptionApi.perceived` gate).
- **Honest by construction.** It reads the real command availability and
  the real views, never a description of them; a verb `which` lists must
  be one the line accepts, and the reverse.
- **Bounded.** The shell layer (like the `client-*` verbs): it reports
  what you can do and why, never a fact you could not otherwise learn —
  no paths (*paths are spoilers*), no other player's private relations.

## What already exists (grounded 2026-11-23)

*Consumed by the build (MR !656).*

## What retires

*Retired in MR !656: the `lists:` view key, `names-relations`, `thing:~`
(now a parse error naming `which ~`), and the dead `shell.control` schema push.*

## Reuse ledger for the plan

*Consumed by the plan (retired at MR !656's sweep).*

## What can I do with this — an object's role in a verb (owner, which review, 2026-11-24)

The `which` build tried `which <thing> --to`: *your verbs you can use on
this thing*. It guessed: it took the radial's list (every one of your verbs
whose first object slot does not refuse the thing) and kept the ones whose
slot `requires:` a mixin a plain thing lacks. Shown live, it was mostly
noise (`go`, `walk`, `stoke` on a counter), and the narrowed form kept
nothing. It was **pulled** before merge. The owner: *"commands can take
multiple objects as args, they can take objects as args to options, and
all of this in any configuration. so doing something 'to' something isnt
a simple proposition. if we want it answerable we should probably make it
explicit in the command def than try to figure it out and be wrong."*

**Why the question has no single answer:** a verb relates to its objects in
ROLES, and one thing can play different roles:
- two objects, two roles — `put notebook in crate`, `pour jug into cup`,
  `give rope to Bea`;
- an instrument, often an option's object — `cut rope --with knife`;
- the giver is not the object — the counter gives `buy`, the notebook is
  bought; the hearth gives `heat`, the thing you hold is heated;
- one thing, either role — a jug is poured FROM or INTO.

**The direction (not decided):** the command definition says what each
object slot MEANS — a small closed vocabulary of roles (what it acts on, its
destination, its source, its instrument…), declared per slot, options
included, so *what can I do with this jug* answers *pour (from it) · pour
(into it)*. Every view would need one; a census-then-ratchet counts the
undeclared, and an undeclared verb is simply not listed (never guessed).

**Who else reads it:** the radial menu (`CommandApi.resolveAffordances`)
and the inspection card's action row answer the same question today, by
the same guess — so whatever is designed here fixes all three at once.

**Open:** the role vocabulary and who vets it (it is grammar, like the
reserved `~` words); whether a role is per slot or per verb shape; how
`which` shows it; what an undeclared verb's radial shows meanwhile.

## Open questions

- **The client** — the verbs card shipped (MR !656); open: the radial
  reading the same model, and whether typeahead reads the `which` model
  (the old pushed stack retired — there is no push to read now).
- **Scripts** — may a script ask (*does `fish` exist here*) and branch on
  it, the shell's `type -t`?

## Lens pass (first cut)

- **1 pedagogy** — the why is the syllabus of the interface: the player
  learns that the rod gives `fish`, the counter `buy` — the world's
  causality made legible.
- **2 creative expression** — an author's new verb, tool or holder shows
  up in `which` with no extra authoring; it reads what the content
  already declares.
- **3a immersion** — non-diegetic by design; the perception rule keeps it
  from betraying the fiction.
- **5 continuity** — the answer follows the objects, so a new epoch's
  tool is discoverable the day it ships.
- **4 · 6 · 7** — nothing found.

## Cross-references

- [command-routing.md](../../subsystems/command-routing.md) — affordances, attribution, the recency stack
- [presentation.md](../../subsystems/presentation.md) — the handle
- [help.md](../../subsystems/help.md) — the reference half `which` must not duplicate
- [mql.md](../../subsystems/mql.md) — relations
- [subscription.md](../../subsystems/subscription.md) — the push wire typeahead would read
- Memory: *plain words, not code names*; *paths are spoilers*; *MQL finds runtime Stuff only*
