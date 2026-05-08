# MQL — Grammar Reference

MQL (the **MUD Query Language**) is the language Saxonberg commands
use to talk about objects. Anywhere a command takes "a thing" or
"some things" — `look at flower`, `drop the second rose`,
`get all swords` — the text is an MQL query. This page is the
reference for the grammar itself.

If you're authoring commands or looking at the resolver internals,
read [subsystems/mql.md](./subsystems/mql.md) instead.

## Three audiences

The same grammar serves three audiences. Each adds reach to the one
above:

1. **Players.** `look at flower`, `drop the second rose`,
   `give sword to bob`. Players never type MQL operators they
   wouldn't recognize from English — comma, quote, parenthesis,
   period in a sentence. Brackets, sigils, and operators are not
   part of the player-typed surface.
2. **Authors** (zone-scoped content creators). The full surface,
   permission-gated to their zone — introspective filters,
   templates, mixins, glob paths.
3. **Developers / admins.** Full surface, world reach. Power tools
   for debugging.

## Quick examples

```
flower                    a flower (in the giver's reachable scope)
the second rose           the 2nd rose match (1-based)
'lyon's mane'             literal name match (whitespace preserved)
me                        the command-giver
here                      the giver's current location
peers                     everything in the room except the giver
inventory                 the giver's contents
reachable                 here ∪ peers ∪ inventory
me:i                      the giver's inventory contents
me:i:sword                a sword in the giver's inventory
here:bookcase             the bookcase detail of the room
here:bookcase:book        the book detail nested inside the bookcase
roses:[5]                 the 5th rose
roses:[1..3]              the first three roses
roses:[hp > 50]           roses with prop hp > 50
sword, shield             a sword OR a shield (union)
swords - broken           swords excluding broken ones
$$                        the previous query's result
```

## Tokens

All reserved characters in MQL. Anything not listed is a literal
character (part of a bareword, path segment, or quoted string).

| Token | Meaning |
|---|---|
| `,` | Sublist separator (union) |
| `:` | Chain operator (filter / transform / intersection) |
| `(` `)` | Grouping |
| `[` `]` | Filter expression / ordinal index (overloaded) |
| `'…'` | Literal string (preserves whitespace, no MQL parsing inside) |
| `-` | Set difference (only between expressions; literal inside barewords) |
| `#` | Identifier prefix: `#5` ordinal, `#abc123` stuff id |
| `$` | Memory: `$$` last result |
| `*` | Glob (only inside template paths) |
| `/` | Path-segment separator (template paths start with `/`) |
| `.` | Namespace separator (`prop.X`, `mixin.X`, …) inside `[…]` |
| `=` `!=` `>` `<` `>=` `<=` | Comparison operators inside `[…]` |

Whitespace inside a query is **AND-narrow** on barewords — `red rose`
means "things matching keywords red AND rose."

## Reserved keywords

These identifiers have reserved meanings and aren't free for use as
keywords:

- **Pronouns:** `me`, `here`, `it`, `them`, `him`, `her`
- **Predicates:** `living`, `online`, `mine`, `visible`, `admin`
- **Boolean ops** (inside `[…]`): `and`, `or`, `not`
- **Existence** (inside `[…]`): `has`
- **Transforms:** `i`, `e` (one-letter chain pivots — inventory,
  environment)
- **Ordinal hints** (in the natural-language layer): `first`,
  `second`, …, `tenth`, `last`, plus `1st` / `2nd` / … / `Nth`
- **Articles** (stripped before parsing): `the`, `a`, `an`

## Three layers of quoting

```
shell:    "…"   used to segment shell args (preserves whitespace)
mql:      '…'   literal string inside MQL (no parsing)
```

The shell tokenizer wraps tokens with whitespace; MQL claims `'…'`
for its own literal slot. There's no quoting-within-quoting; the
quote layers nest naturally.

```
drop rose                   greedy field, no shell quote needed
drop "second rose"          shell quote — MQL parses inside
drop 'second rose'          MQL receives the literal string
```

The shell deliberately doesn't treat `'` as a quote — apostrophes
are everywhere in chat (`don't`, `'allo`, `lyon's mane`). That
single-quote slot is MQL's.

## Seeds

A seed is the head of a chain — what MQL starts looking at. Every
seed yields a list of Stuff (possibly empty).

| Seed | Yields |
|---|---|
| `bareword` | keyword search in the field's declared scope (default) |
| `'literal name'` | exact name/keyword match (whitespace preserved) |
| `me` | the command-giver |
| `here` | the giver's current location |
| `peers` | the location's contents minus the giver, each with its details |
| `reachable` | union of `here` + `peers` + `inventory` |
| `inventory` | the giver's contents (the giver itself is `me`) |
| `online` | every connected command-giver (admin) |
| `world` | every Stuff (admin) |
| `it` / `him` / `her` | last single match of matching gender |
| `them` | last multi-match list |
| `$$` | result of the previous query |
| `/obj/Sword/*` | template path lookup (instances of matching templates) |
| `#abc123` | direct stuff id lookup |

`reachable` is the closest analogue to "everything I can act on right
now." It exists as a single token (rather than the union form
`here, peers, inventory`) because chain `:` binds tighter than `,` —
you need a single token to compose mid-chain.

### Direction tokens as seeds

Directions (`north`, `up`, `nw`) aren't a separate seed kind —
they're barewords. They resolve through the `here` scope's exit-match
path: the matcher looks at the location's exits and matches by
direction or alias, returning the location with `via.exit` so
controllers (`go`, `open`, `close`) can act on the exit directly.

```
go north         resolves to (location, via.exit=north-exit) — controller traverses
open east        resolves to (location, via.exit=east-exit) — controller opens its door
```

The direction vocabulary (canonical names + aliases like `n` →
`north`) lives in the spatial subsystem.

### Path globs

Paths support `*` (any non-`/` chars), `?` (single char), `**`
(recursive across `/`):

```
/obj/Sword/Long      exact template path
/obj/Sword/*         all sword templates
/obj/**/long*        any template anywhere under /obj/ whose leaf
                     starts with "long"
```

Glob expansion happens at resolve time against the live template
registry. Path seeds are author/admin tier — players don't see them.

### Stuff IDs

`#abc123` looks up a Stuff by its exact stuffId. Useful for admin /
debugging. Also author tier.

## Chain operator `:`

The chain operator feeds the result of the left into the right. What
the right side **is** determines what happens.

### `:keyword` — narrow with detail-extension

A bareword in chain position **filters the current set by that
keyword**. The candidate space is auto-extended with detail names at
the current via depth — that's how `here:bookcase:book` works:

| Step | Result |
|---|---|
| `here` | (room, no via). Keyword space = room's keywords + top-level detail names. |
| `here:bookcase` | (room, via=[bookcase]). Detail name "bookcase" matched. |
| `here:bookcase:book` | (room, via=[bookcase, book]). Child detail "book" matched. |

**Chain `:` narrows; it never broadens.** `bookcase:rose` is empty
because rose isn't a detail of the bookcase. To re-anchor across
buckets, the verb's YAML declares a fallback chain — the dispatcher
falls back from `$focus` to `reachable` automatically when the focus
chain stops resolving.

### `:i` and `:e` — descend / ascend

Polymorphic on whether the candidate is in a detail tree or the
Stuff-containment context:

| Operator | No via | Via set |
|---|---|---|
| `:i` | contents of each object (Container) | one match per child detail at the current path tip |
| `:e` | environment of each object (Containable) | pop one detail level |

```
me:i              giver's inventory
me:i:sword        a sword in inventory
me:e              giver's location
here:bookcase:i   child details of the bookcase
here:bookcase:e   pops back to (room, no via)
```

Objects without the relevant mixin contribute nothing — the chain
silent-filters rather than erroring.

`:i` between detail steps is **redundant**: `:keyword` already
auto-extends with child detail names at the current depth, so
`here:bookcase:i:book` ≡ `here:bookcase:book`.

### `:predicate` — predicate filter

A reserved predicate name keeps members where the predicate holds:

| Predicate | Keeps members where |
|---|---|
| `living` | object is a Mobile (or has the appropriate "alive" mixin) |
| `online` | object is connected (admin) |
| `mine` | object is owned by the giver (owner-tracking is stub today) |
| `visible` | object is perceivable to the giver |
| `admin` | object is an admin user (admin) |

```
peers:living              only Mobile peers
peers:online              only connected peers (admin)
me:i:visible              visible items in inventory
```

Unknown barewords in chain position fall back to the keyword filter —
predicates are reserved by name match against the published list.

### Seed-shaped chain elements

When a chain element is itself a seed (it names a candidate set),
how `:` combines it with the prior set depends on whether the seed
has a per-element interpretation:

- **Element-derivable seeds** (`peers`, `reachable`, `inventory`,
  and the transforms `:i` / `:e`) **flat-map** over the prior set:
  for each element `x`, expand to `seed(x)`, union the results,
  and exclude the prior set itself from the final union (so "peers
  of these people" doesn't include those people).
- **Fixed-pool seeds** (`me`, `here`, `online`, `world`, paths,
  stuff ids, `$$`, groups) **intersect** with the prior set.

```
(bob, joe):peers          everyone in the room with bob or joe,
                          excluding bob and joe themselves. When they
                          share a room: the room's other occupants.
                          When in different rooms: union of both rooms,
                          minus both bob and joe.

reachable:online          people in the giver's reachable set who are
                          also online (online is fixed-pool → intersect)

(bob, joe):i              union of bob's and joe's contents (each `:i`
                          flat-maps; transforms have always worked
                          this way)
```

The split keeps the common cases reading naturally: `:online` /
`:world` filter ("of these, which are online?"); `:peers` /
`:reachable` / `:i` / `:e` extend ("for each of these, give me
peers / reachable / contents / container").

A migration note: an older form like `flower:peers` used to mean
"flowers among the peer pool" (intersection). Under the new rule
it means "peers of each flower, excluding the flowers themselves"
(flat-map). To express the old intent, swap the order:
`peers:flower` (peer pool, then keyword filter "flower"). The
keyword direction is the more natural shape anyway.

## Brackets `[…]`

`[…]` is overloaded:

- Body is an integer or range → ordinal indexing into the current set.
- Body is anything else → filter expression.

The body's first token decides.

### Ordinals and ranges

```
roses:[5]          5th rose (1-indexed)
roses:[1..3]       first three roses
roses:[3..]        third onward
roses:[3..<2]      third through end-counting-2
roses:[-1]         last rose
roses:[-2]         second from end
```

1-based throughout. Players think in 1-based ordinals; devs typing
the same syntax shouldn't get confused by 0-based.

The current set must have a stable ordering — sorted by score, with
insertion order as the tiebreak. Same call yields the same `[5]`.

### Filter expressions

Inside `[…]`, atoms read object facts via `namespace.key`:

| Form | Reads |
|---|---|
| `prop.K` | value of property K (`PropertiedMixin`) |
| `mixin.X` | boolean: composes mixin X |
| `class.X` | boolean: instanceof X |
| `keyword.X` | boolean: has keyword X |
| `template.X` | boolean: cloned from template path X (glob-aware) |

Plus the bare atoms `name` (display name, string) and `id` (stuff id,
string).

Comparisons, boolean composition, existence:

```
[hp > 50]                   prop.hp > 50
[mixin.Burnable]            composes Burnable
[name = 'rusty sword']      exact display name
[hp > 50 and prop.locked]   composed
[has prop.gold]             existence (gold property is set)
[not mixin.Container]       negation
```

Comparisons against a missing property yield `false` — `[prop.gold > 0]`
excludes objects without a `gold` property, which is usually what you
want.

## Set operations

| Form | Means |
|---|---|
| `A, B` | union |
| `A - B` | set difference |
| `(…)` | grouping |

`-` only counts as set-difference when surrounded by expressions that
parse on both sides. Inside a bareword (`oak-door`) it's a literal.

`(…)` is for explicit grouping — `(peers, inventory):sword` means
"swords from peers or inventory."

Dedup is automatic at every set boundary. `A, A` yields `A` once.

Set intersection has no dedicated character — it falls out of
mid-chain seed-shaped tokens (when the right side is a fixed-pool
seed). For element-derivable seeds (`peers`, `reachable`,
`inventory`), mid-chain is flat-map per element; see the seed-shaped
chain elements section above.

## Pronouns

The dynamic pronouns reference the most recent resolved query:

- `it` — last single non-living / non-gendered match
- `him` — last single masculine living match
- `her` — last single feminine living match
- `them` — last multi-match
- `$$` — the entire previous query result (single or multi)

```
look bob                  bob (a he/him NPC) → him slot updated
poke him                  refers to bob

look at the flower
get it                    picks up the flower

get all coins
drop them                 drops the coin set
```

Empty queries don't update the stash — the last successful query
stays referenced, so `look him` then `look (something else that
fails)` then `tell him hello` still hits bob.

## Natural-language layer

A pre-parse pass translates common English phrasing into formal MQL.
**Bypassed entirely** when the input contains any formal-MQL signal
character (`:`, `[`, `,`, `'`) — a query that already uses MQL syntax
is taken at face value.

### Article stripping

Leading `the` / `a` / `an` are dropped:

```
the second rose      →  second rose
a sword              →  sword
```

### Ordinal prefix

If the first token (after article stripping) is an ordinal marker
AND there's at least one more token, the ordinal becomes a chain
index:

| Input | Means |
|---|---|
| `first rose` | `rose:[1]` |
| `2nd rose` | `rose:[2]` |
| `last rose` | `rose:[-1]` |

Recognized markers:

- English: `first` … `tenth`, plus `last` (→ `[-1]`).
- Numeric: `^(\d+)(st|nd|rd|th)$` → `[N]`.

A standalone ordinal token (no following word) is treated as a
literal keyword. `drop second` searches for keyword "second."

### Conflict fallback

If ordinal interpretation yields zero matches, the resolver retries
the original query as a literal-keyword form before reporting
failure. That's the `first aid kit` case: ordinal of "aid kit" finds
nothing, so it retries as `'first aid kit'` once.

If both interpretations have hits, the ordinal wins.

## Scope and focus

A query is just a search. **Where** it searches comes from the YAML
field's `scope:` — the dispatcher tries each scope in order until
one returns matches.

Players have a per-session **focus** — the persistent search anchor.
Bare `look` defaults to `$focus` (your current focus); inspection
verbs (`look`, `examine`, …) extend the focus chain when they
resolve. Drilling deeper:

```
> look bookcase
You see a tall oak bookcase…           focus = "here:bookcase"

> look book
The leather binding…                   focus = "here:bookcase:book"

> look                                 (bare look)
The leather binding…                   default: $focus → "here:bookcase:book"
```

The `focus` command shows or sets your focus directly:

```
> focus
focus: here

> focus reachable
focus: reachable (5 objects)

> focus here:bookcase:book
focus: here:bookcase:book (1 object)
```

Movement clears focus to `here` so the auto-look on arrival shows the
new room cleanly.

Verbs that should ignore drill (`get`, `drop`) declare a non-`$focus`
scope — `drop` searches `inventory` regardless of where you're
focused, `get` searches `peers`. Inspection verbs use
`scope: ['$focus', 'reachable']` for drill-first-then-broad fallback.

## Cardinality

A YAML field's `type:` decides the cardinality:

- `type: object` — singular. The dispatcher picks the highest-scored
  match. If two candidates tie at the top score, the first one wins
  (stable order by insertion). A future prompt stack will turn ties
  into disambiguation prompts.
- `type: objects` — plural. The dispatcher returns the full sorted
  list. Multi-cardinality is the type, not a separate flag.

Empty results are a normal outcome — the controller decides what
no-match means for its verb.

## Permission tiers

Operators tag their tier; players can't use higher-tier operators.

- **public** — bareword keyword search, `me`, `here`, pronouns,
  `$$`, ordinals, ranges, set ops, `inventory` / `here` / `peers` /
  `reachable` scopes, `:i` / `:e`, `living` / `mine` / `here` /
  `visible` predicates.
- **authoring** — `mixin.X`, `class.X`, `template.X`, `prop.X`,
  `keyword.X`, bare `id` / `name` atoms, `/path/...` seeds,
  `#stuffid` seeds.
- **admin** — `world` / `online` scopes, `online` / `admin`
  predicates.

Permission errors are loud — `"You don't have permission to use
'mixin' filters here."`

## Cookbook

Common patterns:

```
# All NPCs in the room
peers:living

# All keys in inventory matching "rust"
me:i:rust

# The third sword anywhere reachable
reachable:sword:[3]

# Players online in the same room
peers:online                            (admin; online is fixed-pool, intersect)

# The room-mates of bob and joe (excluding bob and joe)
(bob, joe):peers                        (peers is element-derivable, flat-map)

# Burnable items I'm carrying
me:i:[mixin.Burnable]                   (authoring)

# Doors anywhere in the world
world:[mixin.Door]                      (admin)

# Items with hp > 0 in inventory
me:i:[has prop.hp]:[prop.hp > 0]        (authoring)

# Rooms with a "fountain" detail
/obj/Location/*:[has detail.fountain]   (authoring)

# Things I had drilled on, but specifically the burnable ones
$$:[mixin.Burnable]                     (authoring)

# Comma-union of heterogeneous seeds
flower, sword                           (matches both, query-level via undefined)

# Set difference
swords - broken                         (swords excluding "broken" matches)

# Grouping for cross-bucket search
(peers, inventory):rusty                (rusty things in either bucket)
```

## Limitations

Some things MQL deliberately doesn't do:

- **No method invocation or lambdas** (`->foo()`). Permanent
  non-goal — admin scripting belongs in a different language.
- **No direct field access** (`obj.field`). `.` is namespace-only
  inside `[…]`.
- **No globbable / fungible quantities** (`drop 2 roses`). Roadmap
  entry; today `drop 2 roses` searches for the keyword "2 roses"
  (and finds nothing).
- **No sort operations** (`:sort.X`).
- **No named groups** (`@@group`).
- **No locale support.** Reserved words are English.

## Cross-references

- [subsystems/mql.md](./subsystems/mql.md) — internals (lexer,
  parser, resolver, scope-walk, predicate registry, via
  augmentation, permissions, online provider seam).
- [subsystems/command-spec.md](./subsystems/command-spec.md) — how
  to write a YAML view that uses MQL fields.
- [subsystems/command-routing.md](./subsystems/command-routing.md) —
  the dispatch pipeline including scope try-list semantics.
- [subsystems/shell-environment.md](./subsystems/shell-environment.md) —
  `$focus` / variable interpolation, the `focus` / `var` /
  `settings` commands.
