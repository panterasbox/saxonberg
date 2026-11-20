# MQL anchors — one root, addresses, and relations through holders

> **Status: UNBUILT** — opened 2026-11-20 (owner, in the listing-resolution
> conversation: *"a turning point in the broader MQL design"*).
> **Left:** `~reachable`'s shape (it
> stays, as a built-in relation of `me`) · every view `scope:` and typed
> seed moves to `~` · the 23 views that scope to `online`.
> **In requirements (2026-11-20):** [naming-overhaul](../../requirements/naming-overhaul-requirements.md), Stage B.
> **Size:** a build.

## What MQL is (owner, 2026-11-20)

MQL is a query language over the game's **runtime Stuff** and nothing
else: a query string in, a list of matching objects out. Parsing a word
that names something that is not runtime Stuff is its own thing —
shareable across commands, never MQL. (Memory: *MQL finds runtime Stuff
only*.)

## Today (2026-11-20)

14 seed words. Relative to the asker: `me`, `here`, `peers`, `person`,
`reachable`, `inventory`, `horizon`; the asker's memory: `it` `him` `her`
`them` `$$`. **Not relative to anyone:** `online` (a global registry), a
`/path` glob (a content address), `#id` (an identity). `world` is refused
(*There is no world seed*, mql-grammar.md).

Each seed is a hand-written branch in `api/mql/resolver.ts` — **twice**:
once as a seed (~l.445) and again as a view's `scope:` (~l.730). *What
does `online` mean?* is answered by reading code. The owner: *"for
something like `online` the answer should be very legible."*

## Decided

1. **One root — the asker.** Everything a query reaches, it reaches
   through a relation to `me`: near it, carrying it, knowing it (contacts,
   map, met), or a holder you relate to keeps it. Reaching relative to me
   is not ceremony; it is lens 3a — a thing you have no relation to is
   not a thing you can name.
2. **Absolute addresses are the second mode** — `/path`, `#id`, and a
   **player id**: names you must know exactly, answered by an index, like
   an absolute path beside a relative one.
3. **`online` goes.** Its replacement is a **separate feature build**
   (the owner's): *who is online is tracked by players*, who keep and
   compete over lists. Once you know someone's player id you can share it
   through those lists. A stranger is reached by their player id or by
   getting a relation first.
4. **Relations at a distance go through the holder, with one chain word.**
   `:members` (today warrens only, by class check) generalizes into a
   protocol — *the set this holder keeps*: a contact list's people
   (`me:friends:iffy`), a group's or party's members, a harbor book's
   ships, a travel card's registered nodes, a player-kept who-list's
   people, a warren's rooms. Each holder decides its members. No new
   reserved word; an existing one stops being class-specific. ⭐ The
   who-list feature hangs on this: a list is a holder like any other.
5. **`call` and `hail` are acts, not targets.** `call` is a sound and
   whatever hears it decides (its controller's own history); `hail` was
   still a target picked from a list, and is rebuilt the same way — an
   emission whose receivers decide
   ([signalling-slate](./signalling-slate.md)). Neither is MQL.
6. **`reachable` stays** — what it looks like is open.

7. **Relations get their own sigil — `~name` — never a reserved word**
   (owner, 2026-11-20). After a `:`, `~friends` asks the Stuff to its
   left for the set it keeps under that name; the holder decides which
   names it answers (a contact list by its name, a book `~ships`, a card
   `~nodes`, a warren `~rooms`). A list called "friends" can never collide
   with a thing keyworded `friends`. The result is Stuff — the holder reads
   its own records (contact lists, groups, a book's entries) and hands back
   the people, ships, nodes; MQL never touches a collection record.
   ⚠ Rejected first: one `:members` word with per-list step words
   (`me:friends`) — every list name anyone made would become a reserved
   word colliding with real keywords.
8. **Several things on the left** (`here:i:~friends`) — the per-element
   rule every chain step has: ask each, union, dedupe. A holder with no
   such set adds nothing; each holder answers **per asker** (contacts are
   owner-only; a published list answers anyone). Two holders may mean
   very different things by one `~foo` — the system working as designed.
9. **The affordance selector moves to `source::verb`** —
   `glass::drink cocktail`, `me:i:watch::wind`, `"pocket watch"::wind`
   (today `drink@glass cocktail`). The verb token splits at its first
   `::`: MQL gives `::` no meaning (it is a parse error today — *expected a
   chain element after ':'*), so no real query contains one; a quoted
   name protects a literal. This frees `@` (for player addresses — § 14).

10. **`:members` retires** — `~name` is the only relation mechanism
    (`warren:~rooms`). One fewer reserved word.
11. **A bare `~friends` means `me:~friends`** — every query is the
    asker's.
12. **`holder:~` lists the relation names that holder answers to the
    asker** (`query me:~`, `look book:~`) — the legible answer to *what
    can I ask this for*, in the grammar itself.

13. **Every seed word becomes a relation of `me`** (owner, 2026-11-20) —
    `~here`, `~peers`, `~person`, `~inventory`, `~reachable`, `~horizon`,
    `~it`/`~them`/`~last`. No reserved seed words: `~here` cannot collide
    with a thing keyworded `here` (today's shadowing and the `[keyword.x]`
    escape go). Each relation carries a one-line meaning, so `query me:~`
    lists them all with what they mean — the legible definition the owner
    asked for, with no separate table; seeds and scopes are one thing, so
    one resolver. **What remains grammar:** `me` (the root), the addresses,
    and the operators (`:i` `:I` `:e` `:E` `:exits` `:to` `:from`, the
    predicates, `[…]`, `::`). `here` (and the like) are offered as
    **removable default player aliases**, like `l` — the alias system,
    not the grammar.
14. **`@` is a player address; `~` is the relation sigil** (owner,
    2026-11-20 — swapped from the first cut). `@abc123` and `@bobalu`
    name the same player — an id or a name, exact — and `@` means a
    player everywhere: the client's mentions and typeahead and the
    server's resolution share the meaning, however each spells it.
    Relations are `~name` (`me:~friends:iffy`, `book:~ships`, a bare
    `~here`, `thing:~` to list them). ⚠ `~` already means *home* in the
    shell's path arguments (`cd ~`, `~/notes`) — a path, never MQL, so the
    two never meet.

15. **Built-in relations always win** (owner, 2026-11-20). A player's own
    relation names (contact lists, kept lists) share a holder's `~`
    namespace with the built-ins (`~here`, `~inventory`, …); a built-in
    can never be masked — a player cannot hide their inventory from other
    people's queries with a list named `inventory`. Making a list whose
    name a built-in shadows is **allowed, with a warning** that some
    queries will never reach it (a soft limit, not a refusal).
16. **People are reached through your lists with MQL** —
    `contacts remove ~friends:iffy` targets Iffy through the list and the
    verb takes her off it; no label matcher. **Notify policies apply to
    MQL relations** (`~friends`, `~party`); their private `contacts:` /
    `managed:` / `mql:` ref syntax retires.
17. **Outfits, console tabs, wallet accounts** are resolved by their
    holder with the shared naming rule (an account answers to its bank's
    or corpo's keywords).

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

- **23 views scope to `online`:** `dm`, `whisper`, `shout`, `say`, `react`,
  `introduce`, `profile`, `contacts`, `group`, `party`, `scry`, `pay`,
  `bank`, `house`, `office`, `title`, `goto`, `wizard`, `pack`, and the
  four dorm-room verbs (`lease`, `unlease`, `provision`, `unprovision`).
  Each names a person who may be elsewhere; each moves to relations
  (contacts, group/party members, here) plus the player-id address.
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
