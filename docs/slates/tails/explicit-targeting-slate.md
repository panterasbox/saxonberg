# Explicit targeting — the filter is a policy, not a scope walk

> **Status: PARTIAL** — `onFiltered: take | warn | error` per slot, the
> `candidates-filtered` note and the one `requires:`-aware scope walk
> shipped 2026-09-15 (`d0613c014`) →
> [command-spec.md § `onFiltered:`](../../subsystems/command-spec.md).
> ⭐ No migration of the 183 slots was needed: the chain stayed as
> ordering, the discard became counted and declared.
> **Left:** the reserved per-invocation `--strict` / `--loose` option ·
> turning `warn` on where a verb wants a voice (`open` · `close` ·
> `unlock` — a content question, wants a live drive)
> **Size:** a tail

**Raised by:** the user, reviewing the `lib/statics` sweep, 2026-09-14.

---

## The complaint

> **User:** *"this is an implicit solution to an explicit targeting
> problem. you're trying to make the command figure out intent but the
> user knows their intent they just need a way to communicate it. and we
> have solutions for this — 'second box' disambiguates between the
> painting and the chest just fine, or we also have prompting… it seems
> like it'd be better just to match 'box' on everything, then apply a
> filter on the result to take out anything that's not actually
> targetable by that verb."*

---

## ⭐⭐ The real defect is an ASYMMETRY, not the loop

*Shipped and documented → [command-spec.md § `onFiltered:` — what to do
about a match you discarded](../../subsystems/command-spec.md) (the
count / kind table).*

## What `requires:` does today, exactly

*The `requires:`-aware fall-through is unchanged and shipped as the one
`walkScopes` (`platform/idea/api/CommandLogic.ts`); the chain's two jobs
are stated at command-spec.md § `onFiltered:` (*the scope chain is
untouched*). Cut 2026-09-19.*

## The proposal

*Superseded by the code: "one pool, one filter" was NOT built — the chain
stays as ordering and the discard is counted and declared →
command-spec.md § `onFiltered:`.*

## What must NOT be lost

*Held: `requires:` stays the declaration of kind the affordance resolver
reads → command-spec.md § `requires:`, command-routing.md § The
candidate set is no longer purely syntactic.*

## The per-invocation override

Precedent exists: `async:` is a verb-level default and a player overrides
it per invocation with a reserved option. A reserved `--strict` /
`--loose` (force `error` / force `take`) fits that pattern.

⚠ **One reserved option, one closed vocabulary.** The failure mode is a
knob per axis, and then the semantics live in the player's fingers
instead of the command def.

## The surface this touches

*Superseded by the shipped shape: no migration of the 60 multi-scope
chains or the 183 `requires:` slots was needed; the `$focus`-is-a-
preference warning is now doctrine at command-spec.md § `onFiltered:`.*

## Open questions

*All five resolved 2026-09-15 → command-spec.md § `onFiltered:`: Q1
default `take` · Q2 the chain survives as ordering · Q3 per-slot,
mirroring `onExcess` · Q4 a `candidates-filtered` note (`packages/types`)
· Q5 `requires: any` + `onFiltered` is refused at load.*

## Cross-references

- [command-spec.md § `requires:`](../subsystems/command-spec.md) — the
  three axes (kind · relation · state) and why state is excluded
- [command-spec.md § `cardinality:`/`onExcess:`](../subsystems/command-spec.md)
  — the count policy this mirrors
- [command-routing.md § Affordance attribution](../subsystems/command-routing.md)
  — why the kind must stay declared
- [prompt.md § Cardinality vocabulary](../subsystems/prompt.md) — the
  prompt substrate `prompt` already rides
- [mql-grammar.md](../mql-grammar.md) — ordinals (`second box`), the
  explicit communication the complaint says already works


---

# ✅ What actually shipped (2026-09-15)

*→ command-spec.md § `onFiltered:` carries it whole: the asymmetry, `take`
as the default, no `prompt` arm, refused at load without `requires:`, the
chain untouched. Cut 2026-09-19.*

## ⭐ The thing worth keeping from the build

*The four copies of the `requires:`-aware walk are one `walkScopes` now;
the why is in its docblock (`CommandLogic.ts`) and handed to
command-routing.md by the 2026-09-19 compaction ledger.*

## Still deferred

- **The reserved `--strict` / `--loose` option.** One reserved option is
  its own surface, and the declared policy has to earn its keep first.
- **Turning `warn` on anywhere.** The mechanism ships silent. Which
  verbs want a voice is a content question and wants a live drive —
  `open`, `close` and `unlock` are the obvious candidates.
