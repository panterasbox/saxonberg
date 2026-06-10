# Affordance verbs (working slate)

> **Status:** `put` / `give` / `Surfaced` shipped (see
> [docs/subsystems/spatial.md](../subsystems/spatial.md) for the
> built surface). Source-scoping (`::`), command-provenance/help,
> and the watch worked-example are the live remaining design — that
> half of the slate is why it stays open.

Working slate for two sandbox-foundational verbs that exercise
target-side mixin affordances: **`put`** and **`give`**. Each
verb pulls a mixin out of [mixin-slate.md](./mixin-slate.md)'s
catalog into a real implementation.

The verbs are small. The slate exists because the **mixins**
had architecture questions worth resolving before the build —
particularly `Surfaced` (the on-vs-in distinction) — and now
because the affordance-verb family needs a disambiguation +
discovery layer at scale (source-scoping, command provenance).

See also:

- [docs/slates/mixin-slate.md](./mixin-slate.md) — the parent
  catalog. `Surfaced` (line 82) is listed there; this slate is
  where it gets designed.
- [docs/subsystems/embodiment.md](../subsystems/embodiment.md)
  — body slots and the "hand slots are for activities, not
  storage" rule that frames why `give` is inventory-side.
- [docs/subsystems/spatial.md](../subsystems/spatial.md),
  [docs/subsystems/collections.md](../subsystems/collections.md)
  — `Container` is the existing "things inside this thing" shape;
  this slate's `Surfaced` either extends it or sits parallel.
- [docs/slates/language-slate.md](./language-slate.md) — the
  `read` verb and `Readable` mixin live there because they're
  primarily language-system consumers.

---

## Principle

These verbs aren't combat or quest mechanics; they're the
basic-physics of arranging objects in a world. A sandbox needs
them before it needs anything else. The mixin pattern is the
right framing: each verb earns its slot only when an authored
host-side affordance opts in, so the universe-default `Stuff`
remains affordance-free.

The verbs are short controllers (~30-60 lines each); the design
weight lives in the **target-side mixins**.

---

## Verbs `put` / `give` + `Surfaced` — SHIPPED

This half of the slate is built. The `Surfaced` mixin (sibling to
`Container`, with its own resting collection), the `restingOn`
placement model, `canRest`, and the `placeOn` primitive live in
[docs/subsystems/spatial.md](../subsystems/spatial.md); the verbs
ship as `lib/spatial/Surfaced.ts` plus the `PutController` /
`GiveController` pairs. The on-vs-in ontology question resolved to
the sibling-mixin shape. (`give` lands items in the receiver's
general inventory via `ContainmentApi.move`; no `Receiving` mixin
in v1 — NPC consent is still deferred.)

---

## Detail interactions — affordances live on Stuffs, not Details

DetailedMixin gives a Stuff lightweight addressable sub-parts
(`look at door's handle`) — descriptive, MQL-resolvable, but not
themselves objects. The line this slate defends:

> **Affordances are mixins on Stuffs. Details are pure
> description. If a sub-part deserves a verb that DOES
> something — accept things on it, hold things in it, be picked
> up — it earns its own Stuff.**

The corollary: verbs don't target Details. A sword's inscription
is text inside the Detail's description — `look at inscription`
shows it — but no separate verb attaches to the Detail itself.
The same applies to any future sensory verb against a Detail:
the descriptive text covers it.

The one exception, established by the slot subsystem, is the
**Detail-keyword bridge**: a slot's `userFacingDetail` lets MQL
resolve "mount back" against a Stuff that exposes "back" as
both a Slotted slot and a Detail keyword. The Detail isn't
gaining slot semantics — the slot is *claiming* the keyword
for MQL resolution. This slate's `Surfaced` follows the same
pattern with `getUserFacingDetail()` so `put apple on tabletop`
resolves "tabletop" against the host's single `Surfaced`
collection. Cheap, consistent, no new pattern.

Per-verb summary:

- **`give`** — whole-Stuff transfer to a whole-Stuff receiver.
  No Detail interaction. (`give X to <hand-keyword>` falls out
  of the existing slot-Detail bridge if the receiver's hand
  slot already has a `userFacingDetail`.)
- **`put X in/on Y`** — `Y` must compose `Container` or
  `Surfaced` on the host. Detail keywords resolve via the
  bridge field above.

If a sandbox needs multiple genuine surfaces on one piece of
furniture (bookshelf with shelves AND a top), each shelf is its
own Stuff — not a Detail-with-its-own-Surfaced. The "one mixin
per Stuff" stance keeps the substrate honest about which
sub-parts are interactive.

---

## What shipped in this slate

SHIPPED — see [docs/subsystems/spatial.md](../subsystems/spatial.md)
(`Surfaced`, `restingOn`, `placeOn`) plus the `put` / `give`
controllers. The acceptance roster (put-in-Container, put-on-Surfaced,
non-Surfaced rejection, no-prep disambiguation, give-to-Agent,
give-to-non-Agent rejection) landed with the build.

---

## Verb collision, source-scoping, and command provenance

> Surfaced by the humblest possible object — a pocket watch that affords
> `set` (plus `wind`, `open`). Once *many* Stuffs afford verbs, generic
> names (`set` / `open` / `push` / `use`) collide. This is the
> disambiguation + discovery layer the affordance-verb family needs at
> scale. Long wanted; the watch is the first concrete forcing case.

**Default — shape resolution (already shipped).** The rich parser +
dispatch chain (shape-vs-bind, `pass: true`, scope try-list, per-giver
recency) resolves the common case by target + argument shape:
`set <watch> 4:00` finds the watch's `set` affordance because the watch is
in scope and the args fit. Most invocations never need more, and this
stays the ergonomic default — you rarely type anything special.

**Explicit — source-scoped invocation.** For genuine ambiguity,
explicitness, and scripting, a form that scopes a verb to a source:

```
watch::set 4:00      # the set that comes from the watch
me::say hi           # disambiguate against any other 'say'
```

The left side is an **MQL expression**; the right is verb + args. This is
what lets generic verb names stay safe *forever* — you never rename a verb
to dodge a collision, you scope it. (EotL prior art.)

**Syntax not locked.** `::` is the EotL inheritance — a candidate, not a
decision. Alternatives: `source:verb`, `verb@source`, `source.verb`. Hard
constraint: the sigil must not collide with MQL's own tokens — MQL already
uses `:` for quantity selectors (`:{N}` / `:{*}`), so a bare single `:` is
risky; `::` reads clear of it. Settle at requirements.

**Multiple results = cardinality, and we already own the machine.** The
source MQL can resolve to 0, 1, or N. Source-scoping introduces **no new
ambiguity model** — it reuses `CommandApi.applyCardinalityPolicy` (the
`cardinality` / `onExcess` / `onShortage` vocabulary):

- **one** (default): `onExcess: prompt` → "which watch?" for an
  interactive giver; **degrades to an ambiguity error when no Interactive
  is attached** — an NPC or a script gets the error, never a hang, because
  there is no one to ask.
- **many** (opt-in): a batch invocation (`all watches::wind`) declares
  cardinality many → apply to each; fed by MQL's existing `all X` / `:{*}`.
- **zero**: not-found error.

**Command provenance (help).** Affordance verbs are invisible unless you
can ask **"what can I do, and where does each verb come from?"** A help
surface listing available verbs and their **source** (which object + which
mixin affords each) — extending the YAML-generated help that already
produces usage/help pages. It's also how anyone discovers that a
`source::` target exists at all. Without it, affordance verbs can't be
found.

### How a verb reaches an object (it isn't always a mixin)

Two grounded patterns — neither is "the mixin *is* the verb":

- **Global verb, capability-gated.** The verb is a global command
  (`open`/`close`, `put`/`give`); its controller acts on any in-scope
  target, gated by a capability mixin that supplies the state + methods
  (`Sealable` → `isOpen()`/`open()`; `Container` → holds). The mixin
  provides *capability*; the verb stays global.
- **Object-carried command.** An object-specific command lives on the
  object — the `Thermometer` carries `measure`; its controller reads from
  an Api. No mixin involved.

So `put`/`give` ride mixins *because `Container`/`Surfaced` are shared
traits*, not because verbs must come from mixins. A one-off verb is just a
command the object carries; promote it to a global-verb + capability-mixin
(like `open` + `Sealable`) only when a second host shares the trait. (This
qualifies the "affordances are mixins on Stuffs" line above — that section's
real point is *Stuff vs Detail*, not *mixin vs command*.)

### Worked example — the watch

- `open` / `close` are **global verbs** gated by the `Sealable` capability
  (the watch composes `Sealable`; the global controllers act on it).
  `wind` / `set` are **carried by the watch** (object-specific commands,
  like `Thermometer` carries `measure`) — **no `Timepiece` mixin.** It's a
  thin `Watch` class (the instruments are thin classes too) with clockwork
  fields (`setTo` / `setAt` / `drift` / `wound`) that **overrides its
  long-description getter** to build the string — static prose + its **own
  kept time** (`reading = setTo + (WorldClockApi.now() − setAt) × rate`;
  the world-clock is only an elapsed-time *ruler*, never displayed — the
  watch shows its own drifted value, which is why Gus's, never `set`, reads
  slow) + lid state (`Sealable`). `getMarkupLong`
  calls the getter fresh on every `look`, so **`look watch` shows the
  time** with no extra machinery. (No augmenter, no read-verb:
  `markupAugmenters` are a *different* tool — multi-mixin cross-cutting
  transforms like detail-wrapping / spoiler gating, not an object computing
  its own description.)
- **Gus** (a command-giver like anyone) issues `wind watch` — his MQL
  `watch` resolves to his single carried watch (cardinality one, no
  prompt) — and never issues `set` (which is why it drifts).
- **Player, one watch:** `set watch 4:00` resolves by shape; no scoping
  needed.
- **Player, two watches:** `set watch 4:00` hits cardinality-excess → a
  disambiguation prompt, or scope explicitly: `brass-watch::set 4:00`.
- **Batch:** `all watches::wind`.
- **Help** reports `set` / `wind` as coming from the watch's `Timepiece`
  affordance.

---

## What this slate does NOT cover

- **`read` and `Readable`** — language-system consumer; see
  [docs/slates/language-slate.md](./language-slate.md).
- **Sensory verbs** (`smell`, `taste`, `touch`, `listen`) —
  separate slate proposed at sensory-verb-slate.md (not yet
  drafted). Different design axis: target-side perception
  channels rather than action affordances.
- **Eat / drink** — `Edible` / `Drinkable` are mixin-slate
  entries; depends on `DietApi` (race subsystem follow-on).
  Their own slate or a race-follow-on slate.
- **NPC consent for `give`** — `Receiving` mixin deferred.
- **`take from`** as a `get` extension — `get X from Y` is
  already handled by `get`'s MQL resolution against the
  container's contents. Not in this slate.
- **`put` semantics for liquids** — pouring is `Pourable` (its
  own mixin in the catalog, line 71). Different mechanic.

---

## Open questions

### Q1. `Surfaced` vs. `Container` ontology

**Resolved: sibling; shipped as `lib/spatial/Surfaced.ts`.**
Sibling, variant, or extension? Shipped as the sibling (Option A).
Real decision rode on whether downstream code wants to treat all
"contained things" uniformly or wants to branch on the
relationship type. If perception code wants `getAllContents() ⊕
getAllResting()`, the duplication is annoying — but if perception
asks "what's visible on the table?" vs. "what's in the chest?"
the distinction is load-bearing.

### Q2. `put` preposition vocabulary expansion

What about `put X under Y`, `put X behind Y`, `put X inside
the hollow of Y`? Each is a different relationship.
mixin-slate hints at `Hangable`, `Hideable`, etc. For v1: ship
`in` (Container) and `on` (Surfaced); other prepositions earn
their own mixins when content needs them.

### Q3. Source-scope sigil

`::` (EotL) vs `:` / `@` / `.`. Must not collide with MQL tokens (`:` is
already a quantity selector). *Lean `::`.* Naming + parse decision; settle
at requirements.

### Q4. Is source-scoping ever *required*, or always optional?

*Lean: always optional* — shape resolution is the default; `::` is the
explicit override for ambiguity / scripting / clarity. An affordance never
*demands* the scoped form.

### Q5. Non-interactive giver + multi-result source

An NPC or script whose `source::verb` MQL returns many: error (default) or
apply-to-all? *Lean: error unless the invocation declares cardinality
many* — no silent fan-out from a script. Rides the no-Interactive degrade
path in `applyCardinalityPolicy`.

---

## Once shaped into formal requirements

The first half (`Surfaced` mixin + `put` / `give` controllers +
content + tests) has shipped — see the SHIPPED section above. What
remains for requirements is the disambiguation + discovery layer:

- Source-scoping syntax (`source::verb`) — sigil settled (Q3),
  parse wiring against the MQL tokenizer.
- Command provenance / help surface listing available verbs and
  their source object + mixin (Q4/Q5 cardinality behavior).
- The watch worked-example as the first forcing content.

The slate sets the design space for the affordance-verb family;
follow-on slates (`Pourable`, `Switchable`, `Lockable`, etc.)
plug in the same way when content earns them.
