# Command-line reflection — `which`: what can I type here

> **Status: UNBUILT** — opened 2026-11-23 (owner, in naming-overhaul
> review, over the `lists: relations` view key); shape decided in the
> design conversation the same day (below).
> **Left:** typeahead and the radial reading the answer · scripts asking
> whether a verb exists. (The `which` card is in the requirements.)
> **In requirements (2026-11-23):** [which](../../requirements/which-requirements.md) — the server command.
> **Size:** a build (server first; the client reads it after).

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

**One verb, `which`, and one question: what can I type here?**

```
which            — what you can type here: your verbs, and what gives you each
which <thing>    — what that thing lets you do
```

- **Show the why.** Each verb says what gives it to you, by the OBJECT
  and its place — *fish: the rod in your right hand*, *buy: the counter
  here*, *dig: you* — never the capability (no mixin names; plain words).
  The why is the teaching: it is how a player learns that the rod is
  what lets you fish.
- **`which <thing>`** is the same answer narrowed to one source: the
  verbs that thing gives you. It names the thing by its **handle** — the
  one word you would type (presentation.md: authored keyword → job →
  species) — plus a way to tell it apart only when the handle is ambiguous
  in reach. ⛔ Never the keyword list: the one naming rule means a player
  need not know it.
- **`~` words on request.** The relations you can type (`~here`,
  `~friends`, `~contacts`, a book's `~ships`) are things you can type too,
  so they belong to the same answer — but not in the default listing.
  They appear when asked for (spelling open, below).
- **What you have, not what exists.** `which` lists what you can type
  here. It never lists every verb in the game.

### Cut in the conversation, and why

- **A dry run (`which try <line>`).** The problem it answered — *why did
  it pick that one?* — is answered already: the binder asks on a tie, and
  a result says what it acted on. No moment was found when a player would
  rather ask first than type it.
- **"How do I use this verb" as its own mode.** That is help's (usage is
  static). The live part — what each slot would find here — folded into
  nothing; if wanted later it is a dry run, cut above.
- **A thing's whole keyword list, and a thing's kept sets listed inline**
  (`keeps: ~ships — …`). The first is matching data, not player
  information; the second existed only to replace `query me:~`, and the
  real question under it is *what `~` words can I type* — answered on
  request.

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

| piece | where | note |
|---|---|---|
| ⭐ a per-player **command stack** of available verbs, sliced self · peers · environment, each entry recording the object that afforded it | `CommandApi` — `applyContainmentDelta` / `applyShadowDelta` / `applyHostedAppDelta`; `RecencyEntry.source` | kept current incrementally as things move, shadows attach and apps install — the "what can I type, and why" is already computed |
| that stack pushed to the client | `emitSchemaDelta` → `shell.control {added, reset}`, `getCommandSchemaPayload` | built for client widgets; nothing shows it to a player. Reuse or toss — the build's call |
| per-object verb menu + disabled reasons | `CommandApi.resolveAffordances` → `AffordanceEntry` (the radial) | the client's answer to `which <thing>` |
| relation listing | `query thing:~` behind the view key `lists: relations` (naming-overhaul D-B4); the `names-relations` refusal elsewhere | a listing is not runtime Stuff — MQL should not return it |
| the handle | presentation.md § the handle chain | the one word `which` names a thing by |
| typeahead | the phone's suggestion strip (`CommandBar` `suggest`), `HelpCatalogue.typeaheadMatch` | help topics only, client-side |

## What retires

- The **`lists: relations`** view key, the `relations` field on a bound
  set, and the **`names-relations`** reason row, once `~` words come from
  `which`. `thing:~` then becomes a parse error whose hint names `which`.
- `query me:~` moves to `which`'s `~` words. ⚠ Not before `which` ships
  them: retiring the key first leaves players no way to discover their
  relations.

## Reuse ledger for the plan

| concept | what already does it | reuse / generalize |
|---|---|---|
| the verbs a player can use now, and what gave each | the per-player command stack (self · peers · environment slices; `RecencyEntry.source`), kept by `applyContainmentDelta` / `applyShadowDelta` / `applyHostedAppDelta` | reuse — `which` reads it; whether its client push (`emitSchemaDelta`, `shell.control`) stays is the plan's call |
| one thing's verbs, with the reason a verb is unavailable | `CommandApi.resolveAffordances` → `AffordanceEntry` (the radial) | reuse for `which <thing>` and the one-line refusal |
| naming a source in plain words (*the rod in your right hand*) | the presentation layer's forms (`getPresentation`, the handle chain) + the carrying tiers' slot words (carrying.md: hand · ready · packed) | reuse; the slot phrase may be new wording, not new substrate |
| the one word to type for a thing; telling two apart | the handle; the binder's tie prompt / the distinguishing form | reuse |
| never naming the unperceived | `PerceptionApi.perceived` (the binder's gate) | reuse — the same gate, not a second one |
| the `~` words and their meanings | the built-in relation table + `RelatingMixin.relationsFor` (naming-overhaul B1) | reuse; the listing moves from `query` (the `lists: relations` key, the `relations` bound field and `names-relations` retire) |
| the refusal words for an unusable verb | the verb's own validators and reason rows | reuse — the same words, never a paraphrase |
| a shell verb in the platform pack | `client-*` / `settings` / `alias` (shell category views) | the shape to follow |

## Open questions

- *(Decided in requirements, 2026-11-23: `which ~` / `which <thing> ~`;
  grouped by source with the usual body verbs on one line; a verb you
  cannot use here gets one line in its own refusal words. See
  [which-requirements](../../requirements/which-requirements.md).)*
- **The client** — the hypertext manifestation (a verbs card, verbs as
  links, the radial reading the same model), and whether typeahead reads
  the pushed stack or the `which` model.
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
