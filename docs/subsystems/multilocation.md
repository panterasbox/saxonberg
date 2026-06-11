# MultiLocation — the Warren elastic-graph substrate + the lounge

Source of truth for the generic substrate
(`packages/server/src/mud/lib/multilocation/`) and the lounge content
that rides it (`packages/server/src/mud/domain/lounge/`). Read this
before editing in the area.

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

**Substrate — `lib/multilocation/` (generic, reusable):**

| File | Role |
|---|---|
| `Warren.ts` | Abstract base — the generic mechanism. |
| `WarrenMember.ts` | `WarrenMemberMixin` — optional member-side back-ref. |

**Content — `domain/lounge/` (the lounge area; class paths
`/domain/lounge/*`):**

| File | Role |
|---|---|
| `Lounge.ts` | The one room template every lounge instance clones from. |
| `Bar.ts` | Singleton external-neighbor shell (Dave's Bar). |
| `LoungeWarren.ts` | Concrete singleton Warren — the lounge *policy*. |
| `LoungeMixin.ts` | `LoungeMixin` — lounge-room behavior + the home for future room functionality. |

Content classes live under `/domain/lounge/` — a managed area's own
class namespace, mirroring its template namespace (the class-path
validator admits `/domain/` alongside `/obj/` and `/lib/`). The generic
Warren substrate stays in `/lib/`.

Content seeds: `seeds/domain/lounge/{warren,lounge,bar}.yaml` (templates
at `/domain/lounge/{warren,lounge,bar}`, leaves under the
`/domain/lounge` FolderZone).

## Core model

- **Coordinator, not a containment tier.** Member `Location`s stay
  ordinary roots (`getContainer()` → null); the Warren tracks membership
  in its own Pattern-B set and consults it for routing/landing. It is
  NOT a container and adds NO tier above `Location`. ("Warren as a
  containment tier" is an explicitly deferred, game-wide evolution.)
- **Host is a runtime role.** Every live lounge room — the current
  commons *and* every satellite — is a clone of the one `Lounge`
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
`attachmentFor` (the satellite direction pool excludes `north` — that's
Dave's — and excludes vertical; the lounge expands horizontally), the
tunable bud/merge band (`getBudThreshold` / `getMergeWatermark` /
`getReapGraceMs`, `setThresholds`), the population `reconcile` loop,
`createMember` (clone the room), and `wireHostFixtures` /
`unwireHostFixtures` (the one Dave's Bar fixture, north of the host).
There is **no** campus/placeholder exit — the way out of the lounge is
fast-travel (TPA), built later.

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
owns the *domain* semantics:

- The ref's class is resolved (`StuffApi.classForRef`). If it
  **`instanceof Warren`** — a real, unspoofable check against the
  canonical base class imported directly (no marker static) — land in
  `singleton(ref).getHost()` (the Warren is never the avatar's
  `container`; `container` stays honest).
- Otherwise it's an ordinary room: `StuffApi.resolveOrClone(ref)`, the
  generic primitive that decides **`singleton()` vs `clone()`** purely by
  whether the class composes `SingletonMixin`. No Warren/container
  special-casing lives in `StuffApi`.

`applyContainer` is unchanged (plain `singleton(path)`);
`validateSingletonContainerTarget` keeps its hard deny. The startLocation
path is the only place the Warren semantics live.

The avatar seed (`seeds/obj/Avatar/seed.yaml`) declares
`startLocation: /domain/lounge/warren`. **`DEFAULT_STARTING_LOCATION_PATH`
is unchanged** — it is the container-typed *evacuation* fallback in
`Container.cleanupOnDestruct` (a Warren is not a Container); spawn and
evac are separate concerns.

## Self-registration + ownership (Q2b)

`Lounge` declares its Warren via the `warren` instruction field;
`LoungeMixin.applyWarren` self-registers on hydrate (creating the Warren
singleton if absent — the stray-clone heal; the Warren check there is the
same unspoofable `instanceof Warren`). **The Warren owns the
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

## Instance identity — live-ref hub exits

Many lounge instances are clones of one template, so they **share** a
template path. That is ambiguous for any ref that resolves by
templatePath — most importantly an `Exit` destination
(`findByTemplatePath` throws on multi-instance). The fix is honest
Pattern B: hub and fixture exits between Warren rooms hold a **live ref**
(`keepLiveDestination` on `Exit` / `addBidirectionalExit`,
`Warren.wireHubExit`) rather than a path. No synthetic per-instance paths
— the instances keep their shared template path, and the exits point at
the specific live room directly.

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

Lounge-room *function* (the `LoungeMixin` is the home for it — toppings,
matchmaking, the order console, …), cues beyond the bud/merge doorway
lines, Dave's contents (NPC, drinks, `sit`, menu), fast-travel/TPA (the
way out of the lounge — there is no placeholder campus exit),
item-spawn-into-a-Warren (reuses `getHost()` as a separate instruction),
the procedural-spatial Warren family (dungeon/desert), and the
Warren-as-containment-tier evolution.
