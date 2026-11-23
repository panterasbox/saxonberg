# `which` — requirements

**Kind:** feature
**Leads from:** the kernel. First consumer: every player, on day one —
every verb already comes from something authored (your body, a tool you
hold, a fixture, the room, an app on your phone), so no new content is
needed for `which` to have something true to say.

MUD interfaces were terrible, and the first wall a newcomer hits is a
prompt with no menu: *what can I type?* `which` answers it — the verbs you
can type here, now, and **what gives you each one** — as a deliberate
server command whose answer is plain text in any terminal. The client
reads the same answer later (its own build). Seeded by
[command-line-reflection-slate](../slates/engine/command-line-reflection-slate.md),
whose design conversation (owner, 2026-11-23) decided the shape; its
*Reuse ledger for the plan* is the plan's starting point.

## What `which` is

A read on what is **changing all the time** — not reference. `help` is
the documentation of what a verb *is* (its shape, its usage) and changes
rarely; `which` reports what you can type *here and now* and what gives it
to you, and changes every time you pick something up, walk into a room,
or install an app. It is the shell layer (non-diegetic, like the
`client-*` verbs), it never acts, and it costs nothing when nobody asks.
It names whatever object gives a verb, so it is the same in every epoch:
a rod or a drone, *fish: the ___ in your hand*.

## What already exists

- **`help`** — the reference half: a verb's shape, its slots, the words
  an enum takes. `which` points at it and never copies it.
- **`query me:~` / `query <thing>:~`** — today's only way to list the `~`
  words you can type (your relations), and the one slot in the game that
  accepts a listing. It is a listing, not a query, and it leaves MQL here.
- **The radial** (the client's per-object verb menu, with the reason a
  verb is greyed) — the client's answer to *what can I do with this*.
- **The engine already knows** which verbs each player can use and what
  gave each one, kept current as things move — nothing shows it to a
  player.
- **In flight:** stream-arrival (build-2) Stage C — an app brings its
  verbs to whoever carries the device, and a booth's desk affords the
  same verbs. `which` will name them (*stream: the broadcast app on your
  phone* / *stream: the desk here*).

Therefore what is genuinely new here is **the verb**, **the plain-words
naming of each source**, and **the `~` words moving from `query` to
`which`**. The knowledge underneath already exists.

## Goals

- A player can ask **what they can type here** and see every verb
  available to them, each with **what gives it** — named as a person
  would name it (*the rod in your right hand*, *the counter here*, *your
  phone*), never as code.
- A player can ask **what one thing lets them do** (`which counter`).
- A player can ask **which `~` words they can type** (`which ~`), and
  which a thing keeps (`which book ~`), each with what it means.
- A player who names a verb they **cannot use here** is told why, in the
  same words the verb itself would refuse with.
- The answer is **honest**: every verb `which` lists is one the command
  line accepts right now, and every one it accepts is listed; nothing a
  player cannot perceive appears.
- The `~` words have **one** home: `query`'s relation listing retires.

## Non-goals

- **The client's manifestation** — a verbs card, verbs as links, the
  radial and typeahead reading this answer → a client build, from
  command-line-reflection-slate § Open questions (the client).
- **Scripts asking whether a verb exists** (`type -t`) →
  [scripting-hand-economy-slate](../slates/engine/scripting-hand-economy-slate.md).
- **A dry run of a whole line** (*what would this do*) → nowhere,
  deliberately (cut in the design conversation: the binder asks on a tie,
  and a result says what it acted on).
- **Usage and shape** (`which` reprinting a verb's grammar) → `help`,
  deliberately.
- **Listing every verb in the game** → nowhere, deliberately: `which`
  says what you have, not what exists.
- **A thing's whole keyword list** → nowhere, deliberately (the handle
  is the one word you need).

## Placement

The platform (kernel + the platform pack's view): `which` is a shell
verb every body has, whatever packs are installed. A pack contributes
nothing to it and needs no code to appear in it — its verbs and their
sources show up because the pack already declared them. **A second
instance needs no code:** a new tool, fixture or app is in `which` the
day its content ships.

## Collisions

- **`query`** — loses its relation listing (`query me:~`, `query
  book:~`); everything else about `query` is untouched. A player who
  types the old form is told to use `which ~`.
- **`help`** — untouched; `which` points to `help <verb>` for shape.
- **The `?` and `h` default aliases** are `help`'s; `which` takes no
  alias.
- **stream-arrival** (in flight) — its app and desk verbs appear in
  `which` with their sources; whichever build merges second checks the
  two meet (drive step 10).
- **No place or object** gains anything; nothing new is put in the
  world.

## Surface decisions

### One verb, `which`, and one question

`which` — what you can type here. `which <thing>` — what that thing
lets you do. `which ~` — your `~` words; `which <thing> ~` — that
thing's. Under *verb target*, never nested. (Design conversation; the
dry run, a usage mode and inline kept sets were cut there, with reasons
in the slate.)

### The why names the object and its place

*fish — the rod in your right hand*, *buy — the counter here*, *dm —
your phone*. Never a capability or code name. When two things give the
same verb, each is named. The why is the teaching: it is how a player
learns that the rod is what lets them fish (lens 1).

### Grouped by source; the usual verbs on one line

The listing groups verbs by what gives them, the interesting sources
first; the verbs your own body always has collapse into one closing
line — *and the usual: look, say, go, … (you)* — so twenty body verbs
never bury *fish — the rod in your right hand*.

### A thing is named by its handle

`which` names a thing by the one word you would type for it (the
presentation layer's handle), plus a way to tell it apart only when that
word is ambiguous in reach (*book — the charter book, not the ledger*).
Never the keyword list.

### `~` words on request, with their meanings

`which ~` lists the `~` words you can type — the built-ins that apply
(`~here`, `~inventory`, `~peers`, `~contacts` …), your lists, your
groups, your party — each with a line saying what it means. `which
<thing> ~` lists what that thing keeps (`~ships` for a charter book). Not
in the default listing. The spelling is chosen because it teaches itself:
see a `~`, ask `which ~` (lens 1).

### A verb you cannot use here gets one line

`which fish` with nothing to fish with: one line in the verb's own
refusal words (*you need something to fish with*), and a pointer to
`help fish` for the shape. A word that is no verb at all says so. This is
the live part — here, now — so it is `which`'s; the shape stays help's.

### It never reveals what you cannot perceive

A concealed or unseen thing's verbs are not listed and the thing gives
no `which <thing>`; a thing in the dark is as unnamed to `which` as it is
to `look`. Otherwise `which` would be a detector.

### The `~` listing leaves `query`

Once `which ~` ships, `query`'s relation listing retires in the same
build: `query me:~` is refused with *use `which ~`*, and no other slot
anywhere takes a listing. One build ends the old form rather than leaving
two.

## Lens pass

- **1 pedagogy** — the why is the syllabus of the interface: *the rod
  gives you `fish`, the counter `buy`* is the world's causality made
  legible, and `which ~` teaches the sigil from the sigil. Decided two
  forks (the why; the `~` spelling).
- **2 creative expression** — an author's new verb, tool, fixture or app
  is in `which` with no extra authoring; the ordinary case needs no code.
- **3a immersion** — non-diegetic by design (the shell layer); the
  perception rule keeps it from betraying the fiction. **3b
  participation** — nothing the polity can do with it that it could not
  before.
- **4 values** — none found.
- **5 continuity** — the answer follows the objects, so a new epoch's
  tool is discoverable the day it ships; nothing in `which` is epoch-bound.
- **6 economy** — produces and consumes nothing; costs nothing unasked.
- **7 governance** — judges no one.

## The drive

Stood in the test-fixtures testbed. Every step is `instant`; nothing
`which` reads persists, so there is no restart step, and it adds no place,
so there is no light step. There is no soak drive.

### Blocking drive

1. **[instant · player]** A fresh player on the plaza types `which`.
   They see their verbs grouped by what gives them, ending in one line
   *and the usual: look, say, go, … (you)*. No shop, bank or forge verb
   is listed.
2. **[instant · player]** They walk into the shop and type `which`.
   *buy* appears, sourced to *the counter here* (and any other verb the
   counter gives). They walk out; `which` no longer lists it.
3. **[instant · player]** In the shop, `which counter` lists only what the
   counter gives, naming it by its handle (*counter*).
4. **[instant · player]** They buy a notebook. `which` now lists the
   verbs the notebook gives, sourced to *the notebook you're carrying*
   (or the hand it is in). They put it down on the shelf; the source line
   reads as the shelf's or the notebook's where it now is — or goes, if
   a set-down notebook gives nothing.
5. **[instant · player]** With two notebooks in reach, `which notebook`
   names the one it means and how to tell it from the other — never a
   keyword list.
6. **[instant · player]** `which ~` lists the `~` words they can type,
   each with its meaning (`~here`, `~inventory`, `~peers`, `~contacts` …).
   They add a second player to a list (`contacts add @<id> friends`);
   `which ~` now also shows `~friends`. `which counter ~` says the
   counter keeps nothing to ask for.
7. **[instant · player]** `which fish` (nothing to fish with) gives one
   line in `fish`'s own refusal words and points to `help fish`.
   `which flurb` says there is no such verb.
8. **[instant · player]** In the unlit cellar, `which` lists nothing the
   dark hides, and `which <a thing down there they cannot see>` names
   nothing. In the yard, the concealed trap's verbs are not listed until
   they have found it.
9. **[instant · player]** `query me:~` is refused, telling them to use
   `which ~`; `look me:~` is refused the same way.
10. **[instant · staged]** A player carrying a device with an installed
    app types `which`; the app's verbs are listed sourced to *the <app>
    on your <device>*. (If stream-arrival has merged: the broadcast app,
    and the booth's desk's verbs from the desk.)
11. **[instant · player]** For every verb `which` listed in steps 1–10,
    typing it is accepted by the command line (it may then refuse on its
    own terms, never as unknown); a verb `which` did not list is not
    available there.

### Soak drive

None — no step depends on the clock.

## Acceptance criteria

- A player typing `which` sees every verb available to them where they
  stand, each naming the object that gives it in plain words, with the
  body's usual verbs on one line.
- What `which` lists changes as they move between rooms and pick up or
  set down things, with no other command needed.
- `which <thing>` lists only that thing's verbs and names it by the word
  a player would type, telling two alike things apart when both are in
  reach.
- `which ~` and `which <thing> ~` list the `~` words with their meanings;
  a new contact list appears there once made.
- A verb named but unusable here gets one line in its own refusal words
  and a pointer to `help`; a non-verb is called one.
- Nothing hidden from the player — in the dark, concealed — appears in
  any `which` answer.
- Every verb `which` lists is accepted by the command line where it was
  listed, and none it omits is.
- `query me:~` no longer lists relations; it points to `which ~`.

## Cross-references

- [command-line-reflection-slate](../slates/engine/command-line-reflection-slate.md) — the seeding slate and its reuse ledger
- [command-routing.md](../subsystems/command-routing.md) — what affords a verb, and where it came from
- [presentation.md](../subsystems/presentation.md) — the handle
- [help.md](../subsystems/help.md) — the reference half
- [mql.md](../subsystems/mql.md) — relations, the `~` words
- [concealment.md](../subsystems/concealment.md) · [light.md](../subsystems/light.md) — what a player cannot perceive
- In flight: stream-arrival (build-2) — apps and desks that bring verbs
