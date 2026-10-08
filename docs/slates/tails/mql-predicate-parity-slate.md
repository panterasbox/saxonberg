# MQL predicate parity — the targeting logic a player cannot see

> **Status: DESIGNED 2026-09-28, UNBUILT** — the rule is written down
> (`architecture.md` § *MQL is a VIEW over the model*); the gaps it
> exposes are not closed.
> **Left:** three predicates + one filter atom, each delegating to a
> method that already exists or needs to · the census of hand-rolled
> listing filters (3 verbatim copies of one 4-clause rule) · the
> orphan-guard question against the perception pass
> **Size:** a wave

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

`LookController.ts:195`, `SenseController.ts:152` and
`Container.ts:368` (the inspection-card projection) each hand-roll the
*same* room-listing filter. Two of them are character-for-character
identical:

```ts
if (item.stuffId === actor.stuffId) return false;
if (MixinApi.isAdornment(item)) return false;
if (!MixinApi.isVisible(item)) return false;
if (!PerceptionApi.perceives(actor, item)) return false;
```

…and the card's copy adds a fifth clause the other two do not have
(`!wornHere.has(child.stuffId)` — worn things are a partition of
contents, so a shirt must not render as carried). Then all three call
`getLooseContents`.

**A player cannot see, type, or reproduce any of it.** `here:i` gives
them the raw contents; there is no query that gives them what `look`
actually shows. That is the real cost — not the duplication.

⚠ And the divergence is already live: the card subtracts worn items
and the two prose paths do not, because the prose paths never had a
reason to. Nobody decided that; it accreted.

## What to add

Each row is one predicate or atom, delegating to a method. **None of
them may be the only way to reach the behaviour.**

| add | delegates to | buys |
|---|---|---|
| `:loose` predicate | `Container.getLooseContents()` / `!item.getPlacement()` | `here:i:loose` is the room listing's core rule, typeable |
| `placement.<member>` filter atom | `Containable.getPlacement()` | `here:back-bar:[placement.on]` — *what is on the back-bar*, as a query |
| `:worn` / `:carried` partition | `Slotted.getAllOccupants()` (the card's `wornOccupantIds` walk, which is already a local helper) | kills the fifth clause; makes the partition sayable both ways |
| `:adornment` — or just use `[not mixin.AdornmentMixin]` | — | ⭐ probably nothing to add: MQL can already say this, which is evidence the gap is narrower than it looks |

With those, the shipped listing is
`here:i:visible:loose:[not mixin.AdornmentMixin]` — and the three
copies collapse to one call each.

⚠ `:visible` already exists and already does the `perceives` half, so
**two of the four clauses are MQL-expressible today and the
controllers hand-roll them anyway.** Worth knowing before anyone
scopes this as a language change: a chunk of it is just adoption.

## ⚠ The orphan guard — a question, not a task

`getLooseContents` has two clauses and only one is a containment fact:

```ts
!(placement && ids.has(placement.host.stuffId))
//  ^ per-element        ^ set-relative
```

The second drops an item only when its host is **also in the set**. A
placement host is structurally always a sibling in the same contents
list, so in a raw listing the host is always present — the guard fires
only when perception or the worn pass has *already removed the host
while keeping its contents*.

That is not a listing rule. It is damage control for a lossy upstream
filter, and it is the reason `:loose` cannot be a pure per-element
predicate.

⭐ **The question for the perception pass, not for MQL:** should
anything ever hide a host and show what is on it? If no, the guard
deletes and `:loose` is clean. If yes, the honest shape is that the
*host* answers for its contents' visibility, not that the listing
patches it afterwards. Either way the answer lives in
[perception.md](../../subsystems/perception.md), not here.

⚠ Removing the clause without answering this is a behaviour change
with no test proving it safe — the placement build kept it
deliberately and filed this.

## Wider census

`git grep 'getContents()\.filter'` is **5** sites outside tests. Three
are the listing rule above. The other two are honest and should stay:

- `lib/behavior/Behaved.ts:533` — *room occupants that look like
  players* (Sensor, not Behaved). A brain's own question.
- `platform/idea/cmd/device/FireController.ts:112` — the tangible
  charge in a kiln.

⭐ Neither is a targeting rule a player types, which is the
discriminator: **if a player would ever want to ask it, MQL should be
able to; if it is the engine talking to itself, a loop is fine.**

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
