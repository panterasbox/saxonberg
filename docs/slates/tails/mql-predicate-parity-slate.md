# MQL predicate parity — the targeting logic a player cannot see

> **Status: PARTIAL** — the rule is written down (`architecture.md` §
> *MQL is a VIEW over the model*). `:loose` · `:worn` · `:carried`
> shipped and `:visible` was adopted at controllers-are-io W2 (D22, MR
> !527); the three verbatim listing filters are one query; the orphan
> guard question was answered *yes, until a build decides otherwise* →
> [mql.md § Predicate registry](../../subsystems/mql.md),
> [perception.md § The room listing is one query](../../subsystems/perception.md).
> **Left:** the `placement.<member>` filter atom (*what is on the
> back-bar*, as a query) · the fuel-arg candidate preference from the
> fire build (the clamp bound over the baskets of charcoal — below)
> **Size:** a tail

> Written out of the placement build's review (MR !302). The build
> moved `ContainmentApi.looseContents` onto `Container` as
> `getLooseContents()`, and the owner's question was the right one:
> *why does this loop exist at all, and why can't MQL say it?*

## The rule this slate sits under

Settled during that review and now in
[architecture.md](../../architecture.md#mql-is-a-view-over-the-model-never-a-home-for-behaviour):

> **Anything expressible in MQL must also be expressible by function
> call.** A predicate delegates; it never owns an algorithm.

⭐ So this slate is **not** "move logic into MQL". Every item below is
*a method that exists or should*, plus a one-line predicate over it.
The five shipped predicates are the template — `isLiving` is
`MixinApi.isMobile(target)` and nothing more.

## ⚠ The finding: one rule, three verbatim copies, invisible to the player

*Shipped (controllers-are-io W2): the three copies are one typeable
query, `here:i:visible:[not mixin.AdornmentMixin] - me` (the card adds
`:carried`) → perception.md § The room listing is one query, mql.md §
Predicate registry. Cut 2026-11-07.*

## What to add

Each row is one predicate or atom, delegating to a method. **None of
them may be the only way to reach the behaviour.**

| add | delegates to | buys |
|---|---|---|
| `:loose` predicate | `Container.getLooseContents()` / `!item.getPlacement()` | `here:i:loose` is the room listing's core rule, typeable |
| `placement.<member>` filter atom | `Containable.getPlacement()` | `here:back-bar:[placement.on]` — *what is on the back-bar*, as a query |
| `:worn` / `:carried` partition | `Slotted.getAllOccupants()` (the card's `wornOccupantIds` walk, which is already a local helper) | kills the fifth clause; makes the partition sayable both ways |
| `:adornment` — or just use `[not mixin.AdornmentMixin]` | — | ⭐ probably nothing to add: MQL can already say this, which is evidence the gap is narrower than it looks |

*The `:loose` / `:worn` / `:carried` rows shipped and `:visible` was
adopted (W2) → mql.md § Predicate registry; mql-grammar.md § predicates.
The `placement.<member>` atom is the row still open. Cut 2026-11-07.*

## ⚠ The orphan guard — a question, not a task

*Answered → perception.md § The room listing is one query, and the
orphan guard stays: yes, a hidden host does not hide what was left on
it, so the set-relative clause stays in `getLooseContents(items)` and
`:loose` reads the holder's full list. Cut 2026-11-07.*

## Wider census

*The three listing sites collapsed (above); the two honest loops stay.
The discriminator graduated to mql.md § Predicate registry. Cut
2026-11-07.*

## Non-goals

- **Making anything MQL-only.** The rule above; this slate exists
  partly to write that down. → nowhere, deliberately.
- **A general relational filter** (`[placement.host in <set>]`). The
  orphan guard is the only caller and it should probably not exist.
  → answered by the perception question, not by grammar.
- **Touching `Container.getContents()`.** The model read is untouched;
  everything here is presentation. → nowhere, deliberately.

## Cross-references

- [architecture.md § MQL is a VIEW over the model](../../architecture.md)
  — the rule.
- [mql.md](../../subsystems/mql.md) · [mql-grammar.md](../../mql-grammar.md)
  — the predicate registry and the author-facing grammar.
- [spatial.md § Placement](../../subsystems/spatial.md) — the build
  that raised this (MR !302); its slate retired into that doc.
- [perception.md](../../subsystems/perception.md) — owns the orphan
  guard question.

## ⬅ From the fire build (2026-10)

Left as a line here rather than in a retired plan.

- ⚠ **Candidate preference: MQL picked an immovable machine over the thing the player meant** (the fire build's live drive). At the fuel yard `stoke charcoal into retort` binds the **clamp** — a *turfed charcoal clamp*, so `charcoal` is honestly in its keywords — over four baskets of actual charcoal on the ground, and the refusal (*"That will not burn."*) blames the player's fuel for the game's mis-pick. `get charcoal` first and the same command works. ⭐ The shape of an answer: a FUEL arg should prefer what is carried, and a thing that cannot be lifted is a poor candidate for one. ⚠ Not a keyword bug — the clamp's name really does contain the word.
