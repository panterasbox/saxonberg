# MultiLocation — the Warren elastic-graph substrate + the lounge

Source of truth for `packages/server/src/mud/lib/multilocation/`. Read
this before editing in the area.

A **MultiLocation** is one room *template* with many *live instances*
that coordinate as a group: the graph **buds** new instances when it
fills and **merges** them back when it empties. The owner of each graph
is a **`Warren`** — an incorporeal `Idea` (identity + state, no physical
presence). v1 ships the substrate plus a rudimentary **lounge** (the
universal login landing) over it.

Promoted from `docs/slates/multilocation-slate.md` +
`docs/slates/lounge-slate.md` via
`docs/requirements/multilocation-lounge-requirements.md` and
`docs/plans/multilocation-lounge-plan.md`.

## The pieces

| File | Role |
|---|---|
| `Warren.ts` | Abstract base — the generic mechanism. |
| `WarrenMember.ts` | `WarrenMemberMixin` — optional member-side back-ref. |
| `Lounge.ts` | `LoungeMixin` — lounge-room behavior (consumer of the back-ref). |
| `LoungeRoom.ts` | The one room template every lounge instance clones from. |
| `LoungeShell.ts` | Singleton external-neighbor shell (Dave's Bar). |
| `LoungeWarren.ts` | Concrete singleton Warren — the lounge *policy*. |

Content seeds: `seeds/domain/lounge/{warren,lounge,bar}.yaml` (leaves
under the `/domain/lounge` FolderZone).

## Core model

- **Coordinator, not a containment tier.** Member `Location`s stay
  ordinary roots (`getContainer()` → null); the Warren tracks membership
  in its own Pattern-B set and consults it for routing/landing. It is
  NOT a container and adds NO tier above `Location`. ("Warren as a
  containment tier" is an explicitly deferred, game-wide evolution.)
- **Host is a runtime role.** Every live lounge room — the current
  commons *and* every satellite — is a clone of the one `LoungeRoom`
  template. The Warren designates exactly one live instance as **host**
  (`getHost()` / `isCurrentHost`), migrating the role on forced host
  destruction. No `Commons` class, no host flag.
- **Lazy + runtime-only.** `LoungeWarren` composes `SingletonMixin`;
  `StuffApi.singleton('/domain/lounge/warren')` creates the one instance
  on first landing. Every room instance is a runtime clone, gone on
  restart, recreated on the next first-landing. Only the templates +
  the Warren *definition* persist.

## Base mechanism vs lounge policy

`Warren` (base) owns: the member set (R2.3 prune, R2.4 cleanup), host
designation + **migration**, `spawnMember`/`reapMember`, hub exit wiring
(incl. the `Exitable.onDestruct` asymmetry teardown — remove **and**
destruct the host-side exit, don't leave it blocked), `getHost()` (the
reusable placement kernel), `teardown`, ref discipline, and the
concurrency guards.

`LoungeWarren` (policy) owns: least-full `admitArrival`, star
`attachmentFor`, the tunable bud/merge band (`getBudThreshold` /
`getMergeWatermark` / `getReapGraceMs`, `setThresholds`), the population
`reconcile` loop, `createMember` (clone the room), and `wireHostFixtures`
/ `unwireHostFixtures` (Dave's + the placeholder campus exit).

The strategy is the **simplest tunable** one (least-full seat, reap-empty,
bud-when-all-full; never rebalance a live crowd) — an unproven UX bet,
built to fail safe (flatten-to-one-room is `N` high + `M` 0) and tune
cheap (defaults are code constants headed for `GameConfig`). The base
never imports the lounge.

## Landing: the `startLocation` spawn instruction

`container` only ever names an actual container. A Warren isn't one, so
landing uses a distinct **`startLocation` instruction field** on
`Avatar` (only avatars have a spawn/recall location — no mixin). The
Hydrator's Phase 2 auto-dispatches it to `applyStartLocation(ref)`, which
calls the shared **recover-and-warn** resolver
`StuffApi.resolveOrCloneForPlacement(ref)`:

- **Warren class** → `singleton(ref).getHost()` (the lazy host).
- **Singleton class** → `singleton(ref)` (reuse the one instance).
- **Non-singleton class** → **warn + `clone(ref)`** a fresh instance
  (never `singleton()` a non-singleton — it throws on >1). A
  self-registering `LoungeRoom` then heals into its Warren; anything else
  is an orphan + warning ("fails quietly, QA catches it").

A registry fast-path reuses a single already-live `Container` at `ref`
without a DB round-trip. `applyContainer` adopts the SAME resolver
(engine-wide recover-and-warn); `TemplateApi.validateSingletonContainerTarget`
softens its deny → a non-blocking warning.

The avatar seed (`seeds/obj/Avatar/seed.yaml`) declares
`startLocation: /domain/lounge/warren`. **`DEFAULT_STARTING_LOCATION_PATH`
is unchanged** — it is the container-typed *evacuation* fallback in
`Container.cleanupOnDestruct` (a Warren is not a Container); spawn and
evac are separate concerns.

## Self-registration + ownership (Q2b)

`LoungeRoom` declares its Warren via the `warren` instruction field;
`LoungeMixin.applyWarren` self-registers on hydrate (creating the Warren
singleton if absent — the stray-clone heal). **The Warren owns the
relationship**: `addMember`/`removeMember` are the sole writers of the
Pattern-B pair. The declared path can *initiate* a membership but never
*re-home* an owned one — the single-warren guard rejects a member already
owned by another Warren (owner wins + warn). Reads always use the runtime
back-ref, never the declared path.

## Recall (save-delegation)

`TemplateApi.snapshotToTemplate` consults the live container: when it is a
`WarrenMember` with a Warren, it persists `data.startLocation: <Warren>`
and drops `data.container` (and reconciles the reverse for an ordinary
room) — so logout in the lounge resumes via `getHost()` into a *live*
instance, never a dead clone. The hook rides the existing
`WarrenMember.getWarren()` back-ref; no extra capability mixin.

## Instance identity

`LoungeWarren.createMember` clones via `StuffApi.cloneInstance`, which
re-keys each clone under a unique per-instance path (`<template>#<id>`).
Many lounge instances share one template path, which is ambiguous for any
ref that resolves by templatePath (an `Exit` destination); the unique
re-stamp makes hub/fixture exits resolve to the specific room.

## Concurrency

- `StuffApi.singleton` coalesces concurrent first-resolution of one path
  onto a shared clone promise (`#pendingSingletons`) — without it the
  second concurrent caller trips `clone()`'s cycle guard.
- `Warren.getHost` coalesces concurrent landings (`_hostInFlight`) → one
  host.
- `Warren.createMemberSerialized` serializes member clones per Warren so
  two concurrent buds never clone the same template path at once.

## The admit seam (single sense)

The arrival to the host completes normally; the host's
`onContainableAdded` (LoungeMixin) hands an over-capacity newcomer to
`admitArrival`, whose synchronous prefix re-seats to an eligible
satellite **within the triggering move** (one perception, in the final
room). Only when a bud is required does it `await`. No `#moveCore`
change, no veto, no redirect flag.

## Deferred

Flavor (toppings, matchmaking, cues beyond the bud/merge doorway lines),
Dave's contents (NPC, drinks, `sit`, menu), fast-travel/TPA (the campus
exit is a placeholder), item-spawn-into-a-Warren (reuses `getHost()` as a
separate instruction), the procedural-spatial Warren family
(dungeon/desert), and the Warren-as-containment-tier evolution.
