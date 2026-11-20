# MQL anchors — one root, addresses, and relations through holders

> **Status: UNBUILT** — opened 2026-11-20 (owner, in the listing-resolution
> conversation: *"a turning point in the broader MQL design"*).
> **Left:** the alias table's form (proposed, not yet agreed) · what
> `reachable` looks like · the `:members` protocol's shape · the 23 views
> that scope to `online` · how far a player id is an address.
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
5. **Hearing range is not MQL.** *Within hail* and *who heard the call*
   are computed by the act (the hail, the call) — its audience — and the
   word is matched against that audience by the shared naming rule.
6. **`reachable` stays** — what it looks like is open.

## Proposed, not decided

- **One legible definition per reserved word** — a single table, in code
  and in `help mql <word>`, saying what each word means (*`here` — the
  place you are standing in: your enclosing place*; *`peers` — `here`'s
  contents minus you, one level into open things*), with any built-in the
  grammar cannot spell (`reachable`'s nearest-first order) named as a
  built-in. One resolver reads it, for seeds and scopes alike — retiring
  the duplicate.

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
