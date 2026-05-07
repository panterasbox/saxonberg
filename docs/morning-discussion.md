# Morning chat — scope semantics

The thing you wanted to come back to: how `update_scope`, the YAML
`scope:` override, the actual MQL string the player types on the
CLI, and the default scope after movement (`"here"` via the
auto-look) all interact, and whether the result is what players
will actually expect for the common cases.

## What each piece does today

| Knob                     | Where it lives                          | Effect                                                                                                        |
| ---                      | ---                                     | ---                                                                                                           |
| Player scope             | `commandGiver.getScope()` (transient)   | The default search anchor for any MQL field that doesn't override. Starts at `"here"`; reset post-arrival.    |
| YAML `scope:`            | `FieldDefinition.scope?: string`        | Per-field override of the player scope for that one resolution.                                               |
| Player CLI input         | `model.<field>.raw` (post-wrapper)      | The MQL fragment they typed — search *query*, not search *anchor*. Resolved against the field's scope.        |
| `updates_scope`          | `FieldDefinition.updates_scope?: bool`  | When true and resolution is non-empty, dispatcher updates player scope (drill-trail or re-anchor).            |
| Auto-look on arrival     | `Mobile.traverse` calls `forceCommand("look")` | The bare `look` clears scope to `"here"`. So *any* movement re-anchors scope, by way of the look. |

## Where it gets murky

**1. Default scope direction.** Today `look.yaml` sets
`scope: "inventory, here"`. Most muds I'd expect to walk inventory
first (so `look apple` finds the one in your hand before the one
on the floor). But the per-anchor walk doesn't quite have
"first-match-wins"; the comma-union expands into a single candidate
pool that gets scored. So order in the fragment doesn't currently
affect priority — it just determines which scope sources contribute
candidates.

**Question**: do we want order to matter? If yes, scope-walk needs a
priority semantic (per-anchor groups, score ties broken by source
order). If no, fine, but doc the "comma is union, not priority."

**2. Default args / `look here` vs bare `look`.** Right now bare
`look` is treated as `look here` *by the controller* (calls
`clearScope()` then renders the room). The reason is that the
dispatcher's `resolveAndValidate` skips fields whose raw input is
empty, so `updates_scope` doesn't fire on bare-look — it has to be
done manually.

You proposed formalizing this in the spec: the YAML declares a
field's default arg (`default: here`) and the dispatcher synthesizes
that input on absence, running it through MQL exactly as if the
player had typed it. Then `look` becomes `look here`, the dispatcher
resolves "here" → location, `updates_scope: true` re-anchors
naturally, and `LookController.clearScope()` goes away.

The win is that one mechanism handles "you didn't type a target so
treat it as X" for any command (look, examine, sit, etc). The cost
is ordering: the `default:` field can't be a hard-coded value
because for `look here`, "here" is itself MQL that has to resolve.
So `default:` would be either an MQL fragment string OR a literal,
with type-driven semantics.

**Question**: how far do we go on this? Just MQL fields? Any field?
And does `default` get resolved through the same parser/permission
gates as a player-typed fragment, or treated as authored content
that bypasses some checks?

**3. Programmatic invocation: a parent command passing args.** When
a system-fired or NPC-fired command calls another command via
`forceCommand` (or some future `dispatchCommand(verb, args)` that
takes structured fields), what's the contract for the args? Are
they raw MQL strings (resolved by the dispatcher under the giver's
current scope)? Pre-resolved Stuffs (no MQL run)? Either,
distinguished by shape?

The `bound` parser path (`ParseResult.bound`) already supports
structured input — the parser hands the dispatcher a
`{command, model}` directly, skipping match. But that path expects
the MODEL to be filled (not raw MQL). With the new wrapper, the
caller would need to construct an `MqlOne` themselves, which feels
wrong for a programmatic caller — they want to say "give X to Y"
not assemble wrappers.

**Question**: do we want a third path between "tokenize and resolve
fully" (player CLI) and "wrap in pre-resolved Stuff" (structured
form)? Maybe: programmatic callers pass MQL strings, the dispatcher
runs the same parser+permission+resolveOne chain the player path
uses.

**4. Movement → auto-look → scope reset cascade.** Today
`Mobile.traverse` and `Mobile.teleport` both fire
`forceCommand(giver, "look")` post-arrival. That look's bare-target
branch clears scope to `"here"`. So scope tracks the room you're
in, post-arrival.

This works but has a subtlety: the scope clear depends on the look
controller existing AND the `LookController` having the
`clearScope()` line. If the look fails to clone (no PM), no clear.
And if a future `look`-shaped controller forgets the clearScope
line, scope leaks across rooms.

**Question**: is the auto-look the right place for the scope
reset? Alternatives: (a) movement directly clears scope (decoupling
look from scope semantics — clean, but loses the "movement triggers
a re-look" framing); (b) the dispatcher's `default: here`
mechanism (above) handles it via the look's normal `updates_scope`
path; (c) leave it as-is and document the dependency.

## Common-case checklist

Run through these when we chat — make sure the experience reads
right:

- `look` → describe room. Scope = "here". ✓ today.
- `look flower` → find flower in scope ("inventory, here"). Scope
  becomes "flower" (re-anchor via `updates_scope`). ✓ today.
- `look book` (after `look bookcase`) → find book on bookcase via
  detail drill. Scope extends to "bookcase.book". ✓ today (drill
  trail).
- `look it` after `look bookcase` → resolves to bookcase via
  pronoun stash. Scope re-anchors to "bookcase" (the stored
  fragment, not "it"). ✓ today (Phase 8).
- `go north` → traverse, arrive in new room, auto-look fires,
  scope resets to "here". ✓ today.
- `drop apple` → find apple in `inventory` scope (not the player
  scope). Drops. Player scope unchanged (drop's `updates_scope`
  is false). ✓ today.
- `get rose` → find rose in `here` scope. Picks up. Scope
  unchanged. ✓ today.
- `focus inventory` → set scope to "inventory". Subsequent
  `look apple` resolves against "inventory". ✓ today.
- `look online` (admin, no one online) → `online` is admin-tier;
  resolves to []; scope re-anchors to "online" via the
  re-anchor branch since detail-trail is empty. **Untested.**
  Probably works but worth checking.

## What needs answers

1. Does scope-walk need a priority semantic or is union fine?
2. Formalize `default:` field args in YAML — scope, type semantics,
   how far to push it.
3. Programmatic-invocation contract for arg passing.
4. Auto-look-as-scope-reset vs. movement-clears-scope vs. some
   other framing.

Once we've got answers, the implementation cleanup is small —
dispatcher tweaks, maybe a YAML schema addition for `default:`,
controllers shed the manual scope-clear logic.
