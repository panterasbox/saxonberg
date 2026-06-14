# Fast travel (the Teleport Authority)

The teleport-based transit network — content-named the **Eternal City
Teleport Authority (TPA)**. A directed graph of public **terminals** you
teleport between, gated by a **scan-to-register** credential. This is
**distinct from [locomotion](./locomotion.md)** (physical room-to-room
movement) and from [boundary](./boundary.md) exits: fast travel is
discontinuous hops across an authored network, not stepping through a
door. The lounge→campus hop and char-gen/onboarding home-routing ride
it.

Code lives in `lib/fasttravel/` (the two mixins), `obj/command/author/
TeleportController.ts` + `obj/command/movement/RegisterController.ts`
(the verbs), and `cmd/{author/teleport,movement/register}.yaml` (the
views).

## The two halves

**`FastTravelMixin`** (`lib/fasttravel/FastTravel.ts`) — a **node**
(a TPA terminal): a public-room fixture (a `Thing`) that routes to other
nodes. It owns a **directionality** (`arrival` / `departure` / `both`),
a directed set of **routes**, a **selected destination** (state), an
advance policy, an inert `status` seam, and `getArrivalRoom()` (where
travellers land — the node's own container).

**`TravelCredentialMixin`** (`lib/fasttravel/TravelCredential.ts`) — the
**credential**: a registered-node set plus the register/authorize
surface. Composed by **both** a carryable travel card
(`/domain/common/tpa/TravelCard`) and a cranial-slot travel implant
(`/domain/common/tpa/TravelImplant`). State lives on the credential
Stuff, which is what makes the card transferable — lend the card, lend
its routes.

## The network model

- **Directed routes, per-terminal authoring.** A `TravelRoute` is one
  directed edge: a destination **node by singleton path** (`ref`) plus an
  optional per-route world-clock **timetable** (`departures`). Routes are
  an **instruction field** (`routes`) applied once at hydrate. Whoever
  places a terminal wires its destinations (like authoring an exit); the
  MUD-wide network is the sum of those choices — **no central planner.**
  Not all-to-all; you travel only where a terminal routes.
- **The node is its own source of truth.** Every destination read goes
  off the **live destination node** (`StuffApi.singleton(route.ref)`),
  never off template data. A node's network identity is simply its own
  singleton path; the registered set is a set of those paths.
- **Cascade load.** `armNetwork()` resolves each route's destination to a
  live singleton, which cascades — the whole reachable network loads from
  a single boot-manifest root.
- **Public infrastructure, last mile on foot.** Terminals live in
  lobbies / stops / hubs, never private/instanced space. You fast-TP to
  the dorm lobby, then walk to your room. (Authoring discipline, not an
  engine rule.)

## Targeting and the departures board

- **`teleport <keyword>`** — the raw token is matched **locally** against
  *this* node's routes (`resolveRouteByKeyword`, a live keyword read off
  each destination node), **not** MQL world resolution. Ambiguous keyword
  → asks for specificity; no match → "no route here goes to …".
- **bare `teleport`** at a node renders the **departures board**
  (`renderDepartures`) — a live, viewer-aware list of routes with the
  now-boarding marker, per-route times, and a "not yet registered" note
  for destinations the viewer's credential hasn't unlocked.
- **Selection** is node state: `selectedDestinationRef` (defaults to the
  first route). A keyword sets it; the timetable can flip it.

## The verbs

**`teleport` / `tp`** (`TeleportController`, `cmd/author/teleport.yaml`)
— **dual-mode, one verb, two forks chosen by privilege.** Only
`requiresAnimate` is verb-level; all TPA-specific gating lives *inside*
the fork so it never blocks the privileged path:

- **Self-powered** (author/developer): teleport yourself anywhere,
  destination resolved via MQL; `--target <obj>` moves something else
  instead (access-gated `teleport` / `force-teleport` actions). Subsumes
  the old object-relocation `teleport` and `goto`. Reuses `Mobile.teleport`
  with a raw-move / `forceMove` fallback and the `canTeleport` witness veto.
- **TPA ride** (unprivileged): rides the network from the node the actor
  can reach (`ContainmentApi.findReachable` for the node + the credential).
  Checks departure-capable → keyword selection → **credential
  registration** → travels to the destination node's `getArrivalRoom()`
  via `Mobile.teleport`.

**`register`** (`RegisterController`, `cmd/movement/register.yaml`) —
records the terminal here onto your credential so you can `teleport` to
it later. **Contributed by the terminal itself**
(`FastTravelMixin.commandContributions` on the `environment` bucket), so
it surfaces only when you're at a node; the afforded node is
`context.commandSource` (validator `mustBeAtFastTravelNode`). Gated by
`requiresAnimate` + `requiresTravelCredential` + `mustBeAtFastTravelNode`.
Arrival-capable nodes only.

## Unlock = scan-to-register

You reach a node **by other means first** (walk, story), `register` your
credential at it to add it to your allowed set, *then* you can fast-TP to
it. Explicit, diegetic — not auto-unlock. The TPA fork checks
`cred.isRegistered(ref)` before travelling and refuses with "reach it
another way and `register` first".

**Born-with floor:** every credential is born registered for the
**University Avenue node** (`/domain/eternal/university-avenue-terminal`)
— the lounge → campus hop, the single documented exception to
"reach-before-travel". The floor is preserved across hydration (the
`registered` setter unions saved entries on top of it, never clearing).

## Timetable & advance policy

`advanceMode` ∈ `manual` / `scheduled` / `cycle`, bound to game time via
`WorldClockApi` (`armTimetable` / `disarmTimetable`, host-scoped clock
handles):

- **scheduled** — each route's `departures` (cron patterns, `HH:MM`) fire
  `selectDeparture(route.ref)` at those game times.
- **cycle** — `every(cycleInterval)` rotates the selection through routes.
- **manual** — selection only changes on a keyword.

## Persistence caveat (v1)

Credential registration is **session-durable, not cross-restart**:
`Avatar.save()` persists only the avatar's own fields (no inventory
persist-back; the implant is re-cloned each session), so the registered
set does not survive a server restart yet. Cross-restart durability rides
future persistence work (aug-state colocation; inventory persist-back) —
see [persistence](./persistence.md).

## Seams & deferred surface

Captured in `docs/slates/tails/fast-travel-slate.md`:

- **Living infrastructure** — the `status` seam is inert in v1; the
  designed dynamism (terminals break down, routes get disrupted, an
  Authority wear/maintenance loop) is a later wave. The Authority owns
  *standard + health*, never topology.
- **Cross-restart credential durability** (above).
- Richer targeting, fares/access tiers, and disruption events.
