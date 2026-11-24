# MQL anchors — one root, addresses, and relations through holders

> **Status: PARTIAL** — opened 2026-11-20 (owner, in the listing-resolution
> conversation: *"a turning point in the broader MQL design"*). Relations
> (`~name`, `thing:~`), the `me` root, `@id`, `source::verb` and the retirement
> of the seed words and `online` shipped with the naming overhaul (2026-11) —
> [mql.md](../../subsystems/mql.md) § Seeds, § Relations, § Query aliases.
> **Left:** `@name` (a player by name) · who is online as player-kept lists
> (its own build) · offline people as targets (the person handle) · a relation
> for a group you are not in · `mql:` notify subjects cannot be typed · `hail`
> as an emission (signalling-slate's).
> **Size:** a tail here; the who-list is its own build.

## What MQL is (owner, 2026-11-20)

MQL is a query language over the game's **runtime Stuff** and nothing
else: a query string in, a list of matching objects out. Parsing a word
that names something that is not runtime Stuff is its own thing —
shareable across commands, never MQL. (Memory: *MQL finds runtime Stuff
only*.)

## Today

The fourteen seed words and the two hand-written resolver branches this
section described are gone —
[mql.md](../../subsystems/mql.md) § Seeds — the root and the anchors.

## Decided

Decisions 1–2, 4, 6–13, 15–20 and 22–23 shipped —
[mql.md](../../subsystems/mql.md) § Seeds, § Relations, § Query aliases,
§ `online` is retired; [mql-grammar.md](../../mql-grammar.md). (19's `~all`
shipped as `~contacts`; 4's `:members` protocol shipped as `~name` per 7
and 10.) The decisions with something still open keep their numbers:

3. **`online` goes.** Its replacement is a **separate feature build**
   (the owner's): *who is online is tracked by players*, who keep and
   compete over lists. Once you know someone's player id you can share it
   through those lists. A stranger is reached by their player id or by
   getting a relation first.
5. **`call` and `hail` are acts, not targets.** `call` is a sound and
   whatever hears it decides (its controller's own history); `hail` was
   still a target picked from a list, and is rebuilt the same way — an
   emission whose receivers decide
   ([signalling-slate](./signalling-slate.md)). Neither is MQL.
14. **`@` is a player address; `~` is the relation sigil** (owner,
    2026-11-20 — swapped from the first cut). `@abc123` names a player by
    id; `@bobalu` by name is the intent (the same player) but **not built
    yet** — the first build makes the id work. `@` means a player
    everywhere: the client's mentions and typeahead and the
    server's resolution share the meaning, however each spells it.
    Relations are `~name` (`me:~friends:iffy`, `book:~ships`, a bare
    `~here`, `thing:~` to list them). ⚠ `~` already means *home* in the
    shell's path arguments (`cd ~`, `~/notes`) — a path, never MQL, so the
    two never meet.
21. **Offline people wait for the person handle**
    ([person-targeting-slate](./person-targeting-slate.md) § 3 — a verb
    declares a body or a person; a person handle is minted on demand from
    an identity and touches records only). Not this build: `contacts
    remove` resolves its own entries by the shared rule when the query
    binds nothing (offline contacts stay removable, as today); `dm` to an
    offline player stays unsupported, as today.

## Left open by the naming overhaul (2026-11)

Carried from the build's deferred seams when its plan retired:

- **Groups you are not in, and `mql:` notify subjects** — no relation, and
  no way to type the latter into `notify`.
- **Who is online** — a player-kept list is a `RelatingMixin` holder like any
  other; nothing here needs to change for it → its own build (unslated).

## ⭐ The standing question for an unresolved expression (owner, 2026-11-20)

> **When an MQL expression cannot be resolved — a set nobody can name, a
> target no seed or relation reaches — first ask whether the MQL is
> hiding content that is not modelled anywhere.**

`hail` was the case that taught it: the query it seemed to need (*things
within signal range that answer a hail*) dissolved once the hail itself
was modelled as an emission. `call` had already been through the same
door. A query that is hard to write is often an act, a place or a thing
that does not exist yet.

## Consequences to plan for

- `look` is MQL's most visible consumer — this overlaps the deferred look
  conversation.

## Related

- [document-traits-slate](../tech-debt/document-traits-slate.md),
  [one-resolution-rule-slate](../tech-debt/one-resolution-rule-slate.md) §§ 1, 6
  — the conversation this came from.
- [mql-grammar.md](../../mql-grammar.md), [mql.md](../../subsystems/mql.md).
- [social-graph.md](../../subsystems/social-graph.md),
  [contacts.md](../../subsystems/contacts.md) — the relations that replace
  `online`.
