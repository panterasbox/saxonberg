# Null-environment behavior matrix

A `Stuff & Containable` whose `environment === null` is **detached** —
not in any container, not anywhere in the world. Detached Stuff comes
up in three normal situations:

- A Stuff just constructed via `StuffApi.create` but not yet placed.
- A door that has been removed from its Boundary anchor.
- An item whose container was destroyed mid-frame.

Detachment is a normal state, not an error. Subsystems that walk
container chains, route messages, or compute perception MUST handle
the null-env case without throwing. This document is the canonical
matrix of what each subsystem does when it encounters
`environment === null`.

## Matrix

| Subsystem | Site | Behavior |
|---|---|---|
| **MQL scope walks** | `api/mql/resolver.ts:165, 520, 817, 836` | Silently skip the detached Stuff; the resolver continues with whatever scope remains. Empty results are a normal outcome. |
| **MQL scope-walk helper** | `api/mql/scope-walk.ts:116, 147` | Returns `[]` when the giver has no environment; the candidate set is empty. |
| **MQL predicates** | `api/mql/predicates.ts:61, 65` | `inLocation` / `peers` predicates return `false` for a detached subject. |
| **Command scoping** | `lib/command/CommandGiver.ts:367` | A detached giver gets an empty environment-bucket; their recency stack reflects only `self` + `inventory`. |
| **Perception (canSee)** | `api/light.ts:164` | `LightApi.canSee(viewer, target)` returns `false` when the target's environment is null. The shadow seam still fires for per-viewer overrides. |
| **Mudlog routing** | `api/message.ts:237, 411` | `MudlogApi.peers` walks no further when an actor is detached. `messageContainer` warns once and returns; nothing is delivered. |
| **Boundary (ExitableVessel)** | `lib/boundary/ExitableVessel.ts:121, 161, 185` | `getExit` and the boundary-anchor wiring return `undefined` for a detached vessel. The vessel is reachable through its interior even when its environment is gone. |
| **Light source notification** | `lib/perception/LightSource.ts:156-168` | A detached LightSource emits no notifications; recipients are sourced from the (now-absent) environment. |
| **Containment move** | `api/containment.ts:107` | A detached → detached `move` is a no-op; a detached → present `move` follows the regular pathway. The detached item has no `from` to remove from. |
| **Mobile traversal** | `lib/spatial/Mobile.ts:286` | A detached mover can `traverse` to a destination, but no leaving-message fires (no `previous` to address). |
| **Login flow** | `obj/Login.ts:125` | If an avatar is detached at login time, the login frame announces "you are nowhere" via the scene composer, then routes the avatar to `/void`. |

## Categorical summary

By behavior class:

- **Silently skip / empty result:** MQL scope walks, MQL scope-walk
  helper, MQL predicates, command-scoping environment bucket.
- **Return `false`:** `LightApi.canSee`.
- **Return `undefined`:** `ExitableVessel.getExit`.
- **Warn-and-return:** `MudlogApi.messageContainer` (single console
  warn).
- **Throw:** never. No subsystem in the matrix throws on a detached
  input.

The "never throw" rule is what makes detachment a normal state. Code
that throws on null-env is a bug — file the regression as part of
this matrix's invariants.

## Cross-references

- [containment.md](./containment.md) — the containment subsystem
  itself; this matrix's behavior is what code reading `environment`
  has to do downstream.
- [state-model.md](./state-model.md) — what's in `Stuff.environment`
  and how it interacts with other persistent state.
- [perception.md](./perception.md) — viewer-aware perception walks;
  the null-env case threads through `canSee` here.
