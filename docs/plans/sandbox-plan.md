# Sandbox (the holodeck) — implementation plan

The full sandbox build in one maximal cycle: the four containment
layers' enforcement seams, the wire-body crossing, the wardrobe portal
fixture, the universal per-maker circle, the seeding aperture, the
author→test harness seam, guests and the group-titled cell, and the
escape battery that proves the whole thing closed. Read
`docs/requirements/sandbox-requirements.md` in full before starting;
the slate (`docs/slates/builds/sandbox-slate.md`) carries the doctrine,
the walks, and the roots table this plan implements. The slate's phase
list survives here as **internal wave ordering only** — every wave ends
green (tests + lints pass) and the build is one branch.

The governing invariant, restated once: **every durable mutation is
either governed or discarded.** Enforcement is taint, not stack
inspection: circle scope is ambient state minted only at execution
roots; purity holds by induction — one O(1) check per proxy dispatch,
one policy lookup per PM write.

---

## Grounding (facts verified against the code, 2026-07-30)

- **PM is the single Mongo boundary.**
  `src/backend/PersistenceManager.ts`: the `Collections` enum (42
  entries, `Users`…`ContractEvents`), `save`/`find`/`findById`/`delete`
  dispatching through the `(collection, operation)` around-hook chains
  (`dispatchSave`/`dispatchDelete`), the AsyncLocalStorage re-entry
  guard (`activeSlotsALS` + `withSlot`, ~line 497), `registerHook` /
  `loadHooks` (manifest `mud/obj/hooks/hooks.yaml`, `DomainHook` the
  sole hook today), and `createIndexes`. `PersistApi`
  (`mud/api/persist.ts`) is the decorated facade; **`lint:pm`**
  (`scripts/check-pm-access.ts`) already forbids `PersistenceManager.get()`
  outside `lib/persistence/Document`, `lib/stuff/Template`, `backend/**`,
  `api/hot-reload`, the facade, and tests.
- **The raw-driver straggler set has shrunk since the slate.**
  `PackLogic` (`mud/obj/api/PackLogic.ts:334-475`) already flows through
  `PersistApi.find/save/delete`; `belief.ts` already flows through the
  `BeliefDocument` Document wrapper. The one true straggler is
  **`DiagnosticLogic`** (`mud/obj/api/DiagnosticLogic.ts:45,67,179,229,251`)
  — raw `getCollection()` with `insertOne`, `deleteMany`, and
  `find().sort().limit()`. Folding it requires PM to grow `deleteMany`
  and find-options (`{sort, limit}`) on its typed surface — which the
  sandbox needs anyway (exit discard, sweeper).
- **The enum is not total.** Six live collections are declared as
  string `collectionName`s with no enum entry: `chattel`,
  `chattel_events` (`lib/chattel/ChattelRecord.ts:31`), `app_settings`
  (`lib/config/AppSettings.ts:1035`), `world_state`
  (`lib/time/WorldClockState.ts:22`), `media_assets`
  (`lib/media/MediaAsset.ts:25`), `office_holders`
  (`lib/governance/OfficeHolder.ts:22`). The policy table cannot be
  total until they're in the enum.
- **The proxy is one site.** `mud/api/proxy.ts:220` is the single
  `new Proxy` in the server; every method invocation and getter read
  runs `ProxyApi.#runPipeline` → `SecurityApi.#securityGate`
  (`mud/api/security.ts:545`), whose order is: shadow bypass →
  destroyed-object guard → entry policy → shadow dispatch / frame push.
  The boundary check inserts here.
- **Shadow attach is centrally resolved.** `ShadowApi.attach`
  (`mud/api/shadow.ts:116`) validates `@Unshadowable` +
  `SecurityApi.resolveShadowSecurity(host, m).attach` per intercepted
  method **before any mutation** (lines 137–151). The shadow boundary
  rule lands exactly there (and in `detach`, line ~195).
- **The ExecutionContext machinery.**
  `mud/api/execution-context.ts`: `runRoot` (line 623) /
  `runRootGuarded` (659) plant `FrameKind.Root` frames on a fresh ALS
  stack; the frame-mutator allowlist (lines 141–162) names
  `mud/lib/security/**`, `mud/api/**`, `backend/**`,
  `CommandGiver.ts`, the four registry singletons
  (`EventSubscriptions|MqlSubscriptionRegistry|SchedulerRegistry|WorldClockRegistry`),
  `PersistableLogic`, and tests. `ScheduleApi` (`mud/api/schedule.ts`)
  captures `causingCommandId` at schedule time and re-plants it on a
  fresh guarded root (`planRun`) — the exact precedent circle-scope
  propagation extends. Handles are self-cancelling closures with **no
  central registry** today (reap-cancellation needs one).
- **runRoot callers (the roots audit's ground truth):**
  `backend/Backend.ts`, `backend/inbound/command.ts`,
  `backend/Application.ts`, `backend/CmsSession.ts`,
  `backend/{Twitch,Kick,Youtube}RelayReader.ts`,
  `mud/obj/WorldClockRegistry.ts`, `mud/obj/SchedulerRegistry.ts`,
  `mud/obj/api/ProvenanceLogic.ts`, `mud/lib/command/CommandGiver.ts`,
  `mud/lib/npc/DialogueConversation.ts`,
  `mud/lib/craft/ManualBuildStep.ts`,
  `mud/lib/behavior/crossing-ritual.ts`, `mud/api/diagnostics.ts`,
  `mud/api/schedule.ts`, `mud/api/script.ts`.
- **The crossing seam.** `Login.enter()` →
  `ConnectionApi.transfer(interactive, avatar)` (`mud/api/connection.ts:115`)
  with witness hooks `onConnectionAttached` / `onLinkdead` /
  `onLinkRestored` (`lib/connection/HasInteractive.ts`); Avatar
  (`mud/obj/Avatar.ts:91`) composes `PersistableMixin(PostRegistration(
  HasInteractive(Aether(NotifyPolicy(Contacts(PartyMember(
  SubjectSubscriber(ShelledCharacter))))))))`, takes an
  `AvatarInitContext {user, playerId, isGuest}`, and `shouldPersist()`
  already gates guests out of the spine. `Interactive.teardownSubstrateState`
  (`mud/obj/Interactive.ts:164`) cancels MQL/forum subs on socket close.
- **Receiver-side stamp precedent.** `Stuff.#zone` is a hard-private
  slot (`lib/stuff/Stuff.ts:432`) with `getZone()`, `setZone` gated
  `FromSpatialZone`, and the clone-pipeline pre-register static
  `Stuff._stampZone` (line 485). The circle-scope stamp copies this
  shape exactly.
- **Self-home + parcels.** `ParcelRecord.selfHomeOwnerOf` is the pure
  rule (`lib/parcel/ParcelRecord.ts`), exposed as
  `ParcelApi.selfHomeOwnerOf`; `ParcelApi.ownerOf` is the total chain
  (title → self-home → `core`); `AccessApi.can` dispatches on owner
  kind. `/home/` is a real zone (`lib/home/HomeZone.ts`, v1-empty by
  design — "future home-tier behaviour has a class to layer onto").
- **Eval today.** `eval.yaml` (validator `requiresWizard`) →
  `EvalController` (`mud/obj/command/author/EvalController.ts`) mints
  the singleton at `/home/<playerKey>/_eval` and runs `EvalScript`
  (`lib/script/EvalScript.ts`, `vm` context with an Api allowlist).
- **CMS bridge.** `backend/CmsSession.run` resolves the session's
  acting Avatar, plants `runRootGuarded` + `tagActingAuthor`
  (`CmsSession.ts:60-75`) — the harness seam's transport.
- **Banking chokepoint.** `postTransaction` is a module-private
  function in `mud/obj/api/BankingLogic.ts:1171`; `bank_ledger` is the
  system of record, `bank_accounts`/`bank_supply` rebuildable caches.
- **Chattel.** `ChattelMixin` at the `Thing` tier (`_chattelId`,
  registry-backed `ChattelApi.stamp/transfer/ownerOf`) — the wardrobe
  fixture rides this unchanged.
- **Exit-kind templates** (`/obj/exits/<kind>`, boundary.md §
  Exit-kind templates): `applyExits` clones the kind, `Exit.bind`
  completes identity; `Mobile.traverse` (`lib/spatial/Mobile.ts:351`)
  is veto-gates → `announceDeparture` → `ContainmentApi.move` →
  `announceArrival`. There is **no traversal-application override
  seam** on `Exit` today — the crossing hook must add one (Decision H).

Constraints honored throughout (from the requirements, binding):
dispatch check O(1) with `null == null` short-circuit and **no
measurable overhead with zero circles**; scope never a parameter
(always context-derived); shadows checked at the `@ShadowSecurity`
seam both directions; continuations carry birth scope; **no new global
events**; `isWizard` and the `saveTemplate` lockdown unchanged;
conservation scope-aware; wardrobe ref is a Pattern A path string; eval
integration modifies the author subsystem (SandboxApi supplies only the
scope root); no new module categories, no free-floating helpers, no new
lint exceptions; new Api ends with `SecurityApi.decorateApiClass`.

---

## Architecture overview — the new pieces and their homes

Every file below fits an existing module-taxonomy row. No new
categories, no new lint exceptions.

| Piece | Home | Taxonomy row |
|---|---|---|
| `SandboxApi` | `mud/api/sandbox.ts` | Api (facade; `decorateApiClass` tail) |
| `SandboxLogic` | `mud/obj/api/SandboxLogic.ts` | Api logic singleton (`/obj/api/sandbox`, `extends ApiLogic`, `@internal`, gated `FromModule('/api/sandbox#SandboxApi')`) |
| `WireBody` | `mud/lib/sandbox/WireBody.ts` | Stuff class (Avatar subclass — Decision C) |
| `ForkableMixin` | `mud/lib/persistence/Forkable.ts` | Mixin (the fork/merge substrate — Decision Q) |
| The circle's space | *(no new class — an ordinary `SpatialZone`)* | — |
| `SandboxCrossingExit` | `mud/lib/sandbox/SandboxCrossingExit.ts` | Stuff class (Exit subclass — the traversal hook) |
| `Wardrobe` fixture | `mud/lib/sandbox/Wardrobe.ts` | Stuff class (Thing-based fixture; skins are template data) |
| `/studio` root | *(no new class — a seeded `FolderZone` + a `wire` field)* | — |
| PM policy table + enforcement | `backend/PersistenceManager.ts` | backend (stays `#`-private conventions; NOT absorbed by the facade) |
| Dispatch boundary check | `mud/api/security.ts` (`#securityGate`) | existing bootstrap-special Api |
| Scope taint carrier | `mud/api/execution-context.ts` | existing bootstrap-special Api |
| Shadow boundary rule | `mud/api/shadow.ts` (`attach`/`detach`) | existing Api |
| Seeding aperture + QoL opts (widen) | `mud/cmd/author/clone.yaml` + `mud/obj/command/author/CloneController.ts` | existing Command YAML + Controller (modified) |
| Group-recipient title (widen) | `mud/cmd/system/transfer.yaml` + `TransferController.ts` | existing Command YAML + Controller (modified) |
| Direct-placement refusal | `mud/obj/command/author/GotoController.ts` (+ `teleport`) | existing Controllers (modified) |
| Eval jurisdiction | `mud/obj/command/author/EvalController.ts` + `mud/cmd/author/eval.yaml` + `lib/script/EvalScript.ts` | existing author subsystem (modified in place) |
| Harness endpoint | `backend/` (CMS route) + `backend/CmsSession.ts` | backend |
| Subsystem doc (audit record) | `docs/subsystems/sandbox.md` | doc (created Wave 0, grown each wave) |

Responsibility split (signed off in requirements): `SandboxApi` /
`SandboxLogic` own the **crossing choreography** (mint/park/re-attach/
reap), **session lifecycle** (the session registry, discard-on-exit,
the orphan sweeper's session view), **circle mint/linking**, the
**seeding aperture**, and the **scope root for eval**. PM owns policy
enforcement; the proxy/SecurityApi layer owns the dispatch check; the
facade orchestrates, it does not absorb the seams.

---

## Decisions made at plan time

The requirements deliberately left these to the planner. Each is
stated with rationale; deviations discovered at build time go back
through the workflow's requirements-correction path.

**DECISION A — the scope value is the circle's parcel path, not a
session nonce.** `circleScope: string` = the circle's namespace root
(`/home/<playerId>` or `/studio/<groupId>`); the omni sentinel for
system roots is `'*'`. Rationale: (1) host and guests must share one
scope or co-presence dispatch would self-deny — the boundary is
per-circle, not per-visitor; (2) receiver stamping becomes
deterministic and survives re-materialization (a circle-resident NPC's
scope is derivable from its zone at mint); (3) the jurisdiction bound
(Decision K) generalizes naturally — a scope *is* an authority domain
named by a parcel path; (4) discard (`deleteMany({circleScope})`)
covers crashed prior sessions of the same circle for free. Session
identity (who is inside, when to reconcile) is a separate
`SandboxSession` runtime record in `SandboxLogic`, keyed by scope; the
scoped-row lifetime is "until the circle's live session ends," and the
sweeper's rule is "scoped rows whose scope has no live session."

**DECISION A2 — ids come from `SecurityApi.uuid()`; scope is still a
path.** Anything this build mints an identifier for uses the
project-wide seam `SecurityApi.uuid(size?)`
(`mud/api/security.ts:109` — nanoid underneath; server code never
imports `nanoid` directly, per the existing `StreamRelay` /
`ChannelCatalogue` / `WorldClockRegistry` call sites). In practice
this build mints exactly one new id: **`SandboxSession.id`**, used to
correlate a visit's receipts and to distinguish successive sessions
of the same circle in diagnostics. Everything else reuses existing
machinery — Stuff ids from the framework, `_chattelId` from
`ChattelApi.stamp`, diagnostics row ids from `DiagnosticApi`.

Explicitly **not** minted: the **circle scope**, which stays the
parcel path (Decision A). A nonce-valued scope would break two
properties the design leans on — a crashed prior session's rows stay
discardable because the *next* session of that circle carries the
same scope string, and the jurisdiction bound (Decision K) is
expressible only because a scope *is* a path with extents. The
session id and the scope are different things and must not be
collapsed.

**DECISION B — the taint rides the root frame; the read is O(1).**
`CallFrame.metadata` on the **frame-0 root** carries
`circleScope`; `ExecutionContextApi.getCircleScope()` reads
`stack[0]?.metadata?.circleScope ?? null` — one ALS `getStore()` plus
a constant index, no walk (frame 0 is the root by construction; `run`
without an enclosing context yields scope null, correct). Minting:
`runRoot`/`runRootGuarded` grow an optional
`opts?: { circleScope?: string }` final parameter (allowlist-gated as
today), and a new set-once `ExecutionContextApi.establishCircleScope(scope)`
(same `_assertFrameMutatorAllowed` gate; **throws if a scope is
already present** — "a circle frame under a field root is a
contradiction") serves the command boundary, where the giver isn't
known until after the root is planted (`backend/inbound/command.ts`
resolves the holder, then establishes the holder's stamped scope
before `executeCommand`). No API anywhere accepts scope as an argument
from non-allowlisted code.

**DECISION C — the wire body is an Avatar subclass with an identity
accessor, keyed `(playerId)`, backed by nothing.**
`WireBody extends Avatar`, minted via `StuffApi.create` (the
`Interactive` precedent — runtime-only, constructor-context), stamped
`templatePath = /obj/Avatar/<playerId>/wire` (a minted-singleton
identity under the avatar's identity branch; **no domain row**, per
the ref-shapes identity doctrine — it backs onto *nothing*):
`shouldPersist() → false` (the shipped guest gate), never registered
with `PlayerApi` (the parked avatar keeps the registry slot), and
**baseline mint** — no gear, no chattel, no augment projection. The
state it *does* arrive with (presentation, implant loadout, channel
subscriptions, contacts) travels by the fork protocol, not by
hand-copying: see Decision Q. The **identity thread**:
add `getIdentityPath(): string` to `Stuff` (default
`getTemplatePath()`), override on `WireBody` to return
`/obj/Avatar/<playerId>`, and repoint the identity-keyed epistemic
producers (belief viewer key in `BeliefStoreLogic`, chronicle `owner`,
transcript/disposition/renown `subject`/`owner` resolution) to
`getIdentityPath()` — so in-circle derive-on-read composes the
player's *real* history ∪ scoped appends, and PASS rows attribute to
the real identity. Rationale for subclass-over-Character+mixins: the
crossing must preserve the whole verb surface (author shell, comms,
combat, advancement) and the `HasInteractive` handoff — Avatar *is*
that composition; re-deriving it as a parallel stack is drift by
construction. (Contacts — mixin state, no collection — merge back at
exit as a Decision Q slice, not as bespoke crossing code.)

**DECISION D — the policy table is a compile-total const in PM.**

```ts
type CollectionPolicy =
  | { verb: 'stamp' }
  | { verb: 'refuse' }
  | { verb: 'pass'; mark?: boolean }        // mark = epistemic wire mark
  | { verb: 'shadow'; mode: 'skip' | 'overlay' };
const COLLECTION_POLICIES:
  Readonly<Record<Collections, CollectionPolicy>> = { … };
```

`Record<Collections, …>` makes totality a **compile error**, not an
audit: a new collection cannot ship without a policy row (fails
closed). The table lives in `PersistenceManager.ts` beside the enum;
the doc copy graduates to `docs/subsystems/sandbox.md`.

**DECISION E — SHADOW ships with zero overlay members;
skip-and-rebuild is the mechanism.** The five rebuildable caches
(`bank_accounts`, `bank_supply`, `renown`, `participation`,
`producer`) classify `{verb:'shadow', mode:'skip'}`: PM **silently
skips** the cache write from circle context (returns the doc id
unpersisted / no-ops), and the standings/balance readers
(`BankingLogic`, `RenownLogic`, `ParticipationLogic`,
`InfluenceLogic`) derive live from their event ledgers (global ∪
own-scope, which the PM read filter already composes) when
`getCircleScope()` is non-null. Overlay-wins machinery
(scope-augmented unique keys, composed reads) is **specified but not
built** — Phase-0 confirms no collection needs it; if one surfaces,
`mode:'overlay'` is the labeled attach point. This satisfies "SHADOW
minimal" and keeps every unique index untouched.

**DECISION F — read-filter shape.** Field-context reads on
STAMP-classified collections gain the residual predicate
`circleScope: { $exists: false }` (injected in `PM.find`/`findById`;
existing indexes still drive the query — scoped rows are few, the
predicate only filters residue, so field reads stay covered).
Circle-context reads on STAMP collections gain
`$or: [{circleScope: {$exists:false}}, {circleScope: scope}]` (global
∪ own-scope). PASS collections get **no** filter injection ever (the
"no query gains a scope filter on PASS-only paths" criterion is
checkable by unit test on the injector). The partial index
(`{circleScope: 1}`, `partialFilterExpression: {circleScope:
{$exists: true}}`) serves circle-side reads and exit's `deleteMany`.

**DECISION G — PM learns scope through an injected resolver, not an
import.** `PersistenceManager.setScopeResolver(fn)` installed by
`BootstrapManager.installFrameworkWiring()` (the
`SecurityApi._registerShadowApi` / `setDocumentMarshallerResolver`
precedent) — backend stays import-clean of the mud layer, tests can
stub, and pre-wiring boots see `null` scope (correct: boot is system
work).

**DECISION H — the traversal hook is a new `Exit` extension seam.**
Add to `Exit` a protected `@hook`
`async applyTraversal(mover: Stuff & Containable): Promise<boolean>`
(default `false` = not handled); `Mobile.traverse` consults it after
the veto phase and **returns without moving** when it reports handled.
`SandboxCrossingExit extends Exit` overrides it to run
`SandboxApi.enter(mover)` (outbound door) or `SandboxApi.exit(mover)`
(the in-circle return exit) — nothing material ever traverses.
`canTraverse` on the crossing exit performs the door gate (host or
granted guest; `ParcelApi.ownerOf` + the grant check) so refusals ride
the ordinary `TraversalGuard` prose path. Rationale: keeps "a door is
just an exit" literal — the wardrobe's `exits:` entry uses the
ordinary exit-kind mechanism with `kind: /obj/exits/wardrobe-passage`
(an exit-kind template whose `class:` is `SandboxCrossingExit`), and
the destination is the **template-path** of the circle's entry room
(Pattern A string, `linkedSandboxPath`), never a live ref.

**DECISION I — receiver scope mirrors the `#zone` slot.**
`Stuff.#circleScope: string | null` hard-private;
`getCircleScope()` public read; clone-time stamping via the
caller-allowlisted static `Stuff._stampCircleScope` (the `_stampZone`
shape, same file-URL allowlist mechanism); the stamp is applied in
`StuffApi`'s register path from the *minting context's* scope
(`getCircleScope()` at create/clone) — which is the whole induction:
circle-born objects are stamped because they are minted under circle
context, field objects stay `null` at zero cost. Restamp-on-move
(promotion, future) is an `ApiOnly`-gated `setCircleScope` used only
by `SandboxLogic`/governance — not in this build's player paths.

**DECISION J — the infrastructure exemption is
`isBoundaryExempt()` on `ApiLogic` + an enumerated registry
allowlist.** `ApiLogic` gains a final `isBoundaryExempt(): true`.
Non-`ApiLogic` singletons (registries, catalogues) are exempted only
by membership in an explicit const list in `security.ts`
(`BOUNDARY_EXEMPT_TEMPLATE_PATHS`), checked once and cached on the raw
target (a lazily-stamped boolean slot). Anything unmarked and
unscoped is subject to the ordinary compare — a new module category
fails closed. The singleton audit (Wave 0) classifies every exempt
holder of mutable state; the "needs-a-guard" set gets scope checks at
their mutation methods (the one sanctioned per-method-guard case),
implemented as a two-line context check + deny-receipt at the top of
each flagged mutator.

**DECISION K — the jurisdiction bound is a second nullable root-frame
field, checked only off the null fast path.**
`metadata.jurisdictionBound?: string` (a parcel extent) planted only
by the governed-eval root. The proxy check order:
`ctxScope === rcvScope` → pass (covers null==null); else omni → pass;
else exemption → pass; else **if a jurisdictionBound is present**,
pass iff the receiver's identity path / zone path sits under the
extent (`getTemplatePath()` prefix match — rare path, allowed to be
O(path length)); else deny + receipts. Zero circles ⇒ two loads and
one compare, nothing else.

**DECISION L (REVISED 2026-07-30 — zero new verbs) — the aperture
widens `clone`; there is no `conjure`, no `sandbox`, no `studio`
verb.** `SandboxApi.seedCopy(target)` stays the gated Api surface
(context actor; in-circle context required; ownership via
`ChattelApi.ownerOf` / own-body-or-worn check; capture-as-read
through the persistence spine as the owning principal; the copy
minted circle-born — stamped by context). Its **player surface is
the shipped `clone` verb**: `CloneController` gains an
instance-source branch — when the resolved source is a live object
(not a template path) and the context carries circle scope and the
actor owns it, route to `seedCopy`; everything else is today's
template path (the `--into`/`--here`/self-placement precedence chain
is untouched). Entry is the **wardrobe** for everyone including
wizards (no fixture? clone one and place it — the authoring ladder,
literally); the harness enters via `SandboxApi.launchTestSession`
from the CMS bridge; guest grants ride the shipped parcel grant
surface. Rationale: the sandbox is a *place*, and places are reached
by doors, not commands — a verb was scaffolding thinking. Palette
stays unwidened (project feedback: prefer subcommands/existing verbs;
never mint a verb for a capability an existing one already names).

**DECISION L1 — QoL rides `clone` opts; the sanctioned set is small.**
Convenience UX lands as options on `clone`, never as a new verb or
dispatch surface (standing rule, requirements § Zero new verbs).
What this build justifies — nothing more, and each defensible on its
own:

- **`--count <n>`** — mint N copies in one act. The harness's real
  ergonomic need (stand up five dummies to test a brain or a
  weapon), and it composes with the instance-source branch
  (`clone dummy --count 5`). Bounded by a modest cap + the compute
  posture; a rejection note past the cap.
- **`--instance` / `--template`** — explicit disambiguation for the
  new dual-source resolution. Default stays inference (a resolved
  live object → seed; a path → template); the flags exist for the
  ambiguous case (a live thing whose name also matches a template
  leaf), so authors never have to guess which one they got.

Explicitly **not** added: a wardrobe-bootstrap flag (`clone
/obj/sandbox/wardrobe --here` already works through the shipped
`--into`/`--here` precedence chain — the door needs no special
case), batch-from-room selectors, or repeat-last-clone. Each is
palette growth wearing a flag's clothes; add one only when a real
session demands it, and then still as a `clone` opt.

**DECISION L2 (REVISED — Layer 4 already denies it) —
direct-placement into a circle needs no bespoke guard.** `goto` /
`teleport` moving a **real body** into a circle would bypass the
wire-body containment — but the move dispatches on the circle-scoped
destination room (`canAccept`/`addContainable`/the `ContainmentApi`
walk) from a field-scoped command context, so **the boundary policy
denies it already**. No `canAccept` override, no zone guard. What
this build owes is (a) an escape-battery row proving it
(`crossing.escape.test.ts`: wizard `goto` at a circle path is
refused) and (b) a **friendly rejection note** in
`GotoController`/`TeleportController` that catches the boundary
denial and points at the door instead of surfacing a raw
SecurityError. Containment is structural; only the prose is ours.

**DECISION M (REVISED ×2 — shipped verbs, and no new zone classes) —
`/studio` is a seeded `FolderZone`; provisioning is `subdivide` +
`transfer`.** No `StudioZone` class: `FolderZone` is exactly this
("the class exists so the folder/leaf invariant is satisfied for
paths beneath it, and so the inheritance walk sees the folder as an
ancestry node" — its own docstring, and the shape `/domain/narnia/`
already uses). `/studio` is seeded with its parcel owned by `core` — so
acting on it is already a governance-gated act through the shipped
`AccessApi.can` core-default dispatch; no new gate, no new verb. A
governor runs the shipped **`subdivide`** (`mud/cmd/system/`) to mint
`/studio/<groupId>` (FolderZone child + `parcels` row + genesis
`parcel_events`, all existing `ParcelApi.subdivide` behavior), then
the shipped **`transfer`** to hand title to the group. Entry gating =
group membership via `AccessApi.can` (the shipped group-owner
dispatch). `/home/` stays personal; no self-serve path exists.

**The one widening:** `transfer` today is player→player
(`mustBeAgent` recipient, bilateral online consent —
`mud/cmd/system/transfer.yaml`). Group recipients need the arg
widened to accept a group ref and the consent leg to collapse (a
group has no avatar to say yes; the governor's act *is* the
acceptance, and the chain-of-title entry records it). Scope: the
recipient arg's type/validator + the consent branch in
`TransferController` + a `kind:'group'` owner write through the
existing `ParcelApi.transfer`. Verify at build time whether
`ParcelApi.transfer` already accepts group owner refs (the registry
models them) — if so this is controller-only.

**DECISION N (REVISED 2026-07-30 — comms are seamless) — messaging
crosses the boundary; only *material* reach is denied.** The earlier
"implant-blind ⇒ filter comms" reading was wrong, and it would have
made the sandbox hostile: a builder spends hours in there, and being
unreachable is not privacy, it's exile. The story-bible's
implant-blindness means the wire is **not surveillable** — nobody
sees where you are or what you're building — **not** that your
messages stop.

The doctrine already licenses this: **epistemic crosses, material
reverts.** A message is information, not state — you can *say*
"I have a +5 sword" from inside, and that's a lie, not a cheat.
So:

- **Message delivery is an explicitly allowlisted cross-boundary
  channel**, both directions, at the delivery seam only
  (`SensorMixin.handleMessage` / the Audible push), never as general
  dispatch. Narrow by construction: the payload is **rendered MML —
  no Stuff references cross**, so the allowlist can't be used to
  smuggle a reference and then dispatch on it (the thing Layer 4
  exists to stop).
- **Recipient resolution follows identity, not body.** `dm`/`tell`
  and the notify/presence relay resolve a player to their **active
  body** — the wire body when a session is live, the avatar
  otherwise (via `getIdentityPath()`, Decision C). Someone `tell`s
  you and it arrives; you answer and it lands. No "player is
  offline," no dropped messages.
- **Channel/subject subscriptions travel with the body** for the
  duration of the visit and return at exit — a fork slice
  (Decision Q), so exactly **one** live delivery target exists at
  any moment and channel chat never double-delivers.
- **What does *not* cross is geography, not policy:** room-scoped
  acoustic speech (`Vocal`) doesn't reach the circle because you are
  not in that room — the ordinary perception rules, no sandbox
  special case. Location/perception reveals stay blocked (the circle
  has no address, and `scry`-shaped reads are ordinary Layer-4
  dispatch).

The Layer-4 proxy denial remains the backstop for everything that is
*not* the delivery seam, and the escape test asserts it by attempting
a non-message dispatch through a reference obtained during a
conversation.

---

**DECISION O — no new zone classes; wire-ness is an inherited zone
field.** A circle's playable space is an **ordinary `SpatialZone`**
(no `CircleZone`): the three things a bespoke class would have
carried are already covered — the scope stamp is a `Stuff` field
(Decision I), permissive eviction is the residency default, and the
direct-placement guard is redundant (Decision L2). And the two wire
**namespace roots** need no bespoke class either: `/home` keeps its
existing (deliberately empty) `HomeZone` — untouched, no migration —
and `/studio` is a seeded `FolderZone`.

What marks a branch as *wire* is a **zone field**, `wire: true`,
declared on the root and inherited by every descendant through the
shipped ancestry walk (`Zone.lookupField`, `zone.md § field
inheritance`). So "is this path wire?" is
`await zone.lookupField<boolean>('wire')` — data, resolved by a
mechanism that already exists — not a hardcoded `/home|/studio`
prefix list and not an `instanceof`. Payoff: a third wire root
(whatever a later cycle wants) is a seed row with a field, and the
containment layers need no edit to recognize it. `SandboxLogic`
derives the circle scope from the parcel path as before; the field
is what makes the *classification* extensible.

**DECISION P — parking is its own presence state; disconnect resumes
within grace.** Riding `onLinkdead` for parking (Wave 3) is right for
the *freeze*, but the shipped hook does two more things that are
wrong for a crossing — verified at `mud/obj/Avatar.ts:821` and
`ConnectionLogic.transfer` (`:144`, which fires
`previous.onLinkdead()` on the 1→0 edge, i.e. exactly when we cross):

1. **It announces a disconnect.** `onLinkdead` emits
   `PlayerDisconnected` (or `PlayerLoggedOut` on leave-intent) — so
   stepping into your holodeck would tell the social graph you went
   offline. Wrong: you didn't leave, you're elsewhere and
   unreachable. Fix: `SandboxLogic` sets a **`parked`** flag on the
   avatar across the transfer; `Avatar.onLinkdead` reads it and
   **suppresses the presence emit** (no new event — a suppression),
   clearing it on re-attach. Presence reads present a parked player
   as **present-but-unreachable**, which is what the implant-blind
   wire actually means and what the comm filters (Decision N)
   already enforce. Two lies avoided: "offline" (false) and
   "reachable" (also false).
2. **It leaves the body evictable.** A parked avatar is idle and
   connectionless for the whole visit, so the residency cold-tail
   sweep can harvest it mid-session. The spine would capture it (no
   data loss), but exit would find no body to re-attach to. Fix: a
   parked avatar **vetoes eviction** (`canEvict` false while its
   session is live) — bounded, because sessions end. Belbastarter:
   `SandboxLogic` also **captures the parked avatar at park time**, so
   a crash-restart mid-visit can never lose real-body state.

**Disconnect / reconnect / quit semantics** (the shipped comment at
`Avatar.ts:823` — "a real avatar persists linkdead for reconnection"
— is the model to match):

- **Drop mid-visit** (crash, wifi): the wire body goes
  connectionless; the **session stays alive for a grace window**.
  Reconnecting inside the window re-attaches you **to the wire body,
  back in the circle where you were** — `Login.enter` asks
  `SandboxLogic` for a live session by `playerId` before falling back
  to the parked avatar. This mirrors ordinary linkdead-reconnect
  semantics; losing a test rig to a network blip is exactly the
  friction that makes builders hate a tool.
- **Past the grace window**: the sweep reaps the wire body, cancels
  scoped handles/subscriptions, discards the scoped rows, closes the
  session. Next login finds the parked avatar (never deregistered
  from `PlayerApi`) and re-attaches — you wake up in the field where
  you left, with your authored work intact (it was saved
  deliberately) and the transient rig gone (exactly what walking out
  would have done).
- **Deliberate quit inside** (leave-intent close code): run the
  **exit choreography first** (reap → cancel → discard → close
  session), then the ordinary logout path on the **parked avatar** —
  so the save runs against the real body (the wire body's
  `shouldPersist()` is false) and `PlayerLoggedOut` fires for the
  real identity, not the vessel.
- **Server restart mid-visit**: sessions are runtime state, so every
  scope is sessionless at boot and the first sweep discards all
  scoped rows (correct by doctrine); the parked avatar was captured
  at park time, so the player logs back in at their field body
  intact.

**DECISION Q — the fork/merge substrate: `ForkableMixin`, the
persistence spine's sibling.** The crossing needs state to travel
from the parked avatar to the wire body, and a little state to travel
back. Decision C hand-rolled two instances of this (appearance copied
at mint; contacts forwarded at exit) — which is the smell that says
*a mechanism is hiding here*. Generalize it, exactly as the
persistence spine generalized `snapshotToTemplate`:

**Objects fork themselves, composed per-mixin** — the same shape as
`capture`/`materialize` (`persistence.md § the self-persistence
spine`), a sibling protocol rather than a second spine:

- `lib/persistence/Forkable.ts` → `ForkableMixin`, composed on hosts
  that can project into another body (Avatar today; the mechanism is
  host-agnostic).
- Each composed mixin optionally implements **`forkSlice(): unknown`**
  — the state it wants carried into a fork — and
  **`mergeSlice(slice): void`** — what it accepts back on rejoin.
  Aggregated per-mixin like `getAllPersistentFields`; a mixin that
  implements neither contributes nothing, which is the safe default.
- `ForkApi`-shaped surface lives on `PersistableApi`'s existing face
  (no new facade — the spine's Api already owns
  "move this host's state around"; per the one-Api-per-subsystem
  rule).

**Policy is the caller's, not the slice's.** Fork is permissive
(a slice travels if its mixin offers one); **merge is
allowlisted by the consumer** — and for the sandbox the merge
allowlist is *epistemic only*, which is the discard doctrine
expressed as a list rather than as ad-hoc code. Material slices
simply have no merge path back; there is no "trusted mixin" escape.

First slices (all replacing hand-rolled code, none net-new work):

| Slice owner | Fork | Merge |
|---|---|---|
| `Visible`/presentation | name, pronouns, species, description | — |
| `Aether`/implant | the loadout so comms verbs parse | — |
| `SubjectSubscriber`/channels | subscriptions **move** for the visit (Decision N) | restored at exit |
| `Contacts` | current list (so `dm <friend>` resolves inside) | **yes** — people you met in-circle (epistemic) |
| Everything else | nothing | nothing |

**Shadows get an opt-in follow.** Shadows are runtime-only and
dropped by the boundary contract — correct as the default, and
benign ones (message logging/filtering, accessibility transforms)
deserve a way back. So the fork asks each attached shadow
**`describeFork(): ForkSpec | null`**; a shadow that returns a spec
is re-attached **by the framework to the fork, and only to the
fork** — the shadow never names its own target, so this cannot
become an attach-anywhere primitive. The re-attach runs through the
ordinary `ShadowApi.attach` gate (including the boundary rule), and
the re-attached shadow is circle-scoped, so it dies with the vessel.
Shadows that stay silent stay dropped.

Scope discipline: this is a **substrate with one consumer today**
(the crossing). It must not grow a second capture/restore path — the
slices are runtime state only, never a persistence route (durable
state stays PM's business under the policy table). Its second
consumer, whenever it arrives (polymorph, possession, a body-swap
effect), is the payoff the abstraction is for.

---

## Wave 0 — the two audits, enum totalization, PM surface fold

Goal: the verified policy table, roots table, singleton
classification, and comm-seam inventory recorded in a new
`docs/subsystems/sandbox.md`; PM's typed surface complete; the one
raw-driver straggler folded. Pure refactor + docs; fully green.

### Files

**`backend/PersistenceManager.ts`** — add enum entries `Chattel`,
`ChattelEvents`, `AppSettings`, `WorldState`, `MediaAssets`,
`OfficeHolders`; add typed `deleteMany(collection, filter)` and
`find(collection, query, opts?: {sort?, limit?})` (hook-transparent —
`deleteMany` dispatches through the delete slot per matched semantics
or as its own documented operation; keep it out of the around-delete
chain but inside `withSlot` re-entry guarding). No policy yet.

**`mud/api/persist.ts`** — mirror `deleteMany` + find options on the
facade (the sanctioned surface for logic-layer callers).

**Repoint the string `collectionName` declarations** in
`ChattelRecord`, `ChattelEvent`, `AppSettings`, `WorldClockState`,
`MediaAsset`, `OfficeHolder` onto the enum.

**`mud/obj/api/DiagnosticLogic.ts`** — fold onto the typed surface:
`insert` → `PersistApi.save`; the two `deleteMany` calls →
`PersistApi.deleteMany`; the `list` read → `PersistApi.find(…,
{sort:{ts:-1}, limit})`. Delete the local `collection()` helper and
the `PersistenceManager` import (`lint:pm` then passes with zero mud
exceptions beyond the framework files).

**`docs/subsystems/sandbox.md`** (new) — the durable audit record,
three tables + one list, verified writer-by-writer during this wave:

1. **The policy table (total).** Proposed verbs — verify each against
   its actual writers before recording:
   - STAMP: `bank_ledger`, `transcripts`, `renown_events`,
     `participation_events`, `disposition_events`.
   - REFUSE: `producer_events`, `chattel`, `chattel_events`,
     `positions`, `contracts`, `contract_events`, `parcels`,
     `parcel_events`, `users`, `google_profiles`, `twitch_profiles`,
     `kick_profiles`, `groups`, `channels`, `parties`, `emotes`,
     `name_banks`, `recipes`, `bulletins`, `office_holders`,
     `app_settings`, `world_state`, `forum_subjects`, `forum_boards`,
     `forum_entries`, `forum_votes`, `forum_events`.
   - PASS(mark): `chronicles`, `beliefs`, `authoring_events`,
     `accountability_events`, `diagnostics`.
   - PASS(unmarked): `domain`, `documents`, `holder_snapshots`,
     `blueprints`, `media_assets` (authored truth / the mechanism's
     own stores; flag the last two for explicit confirmation).
   - SHADOW(skip): `bank_accounts`, `bank_supply`, `renown`,
     `participation`, `producer`.
   - Note the `contacts` case: no collection — mixin state, so it
     has no policy row; it travels as a Decision Q fork slice and
     merges back at exit (Wave 3).
2. **The roots table** — every `runRoot`/`runRootGuarded` caller (the
   grounding list above), each annotated with its scope source per the
   slate's table (Interactive principal / propagated / NPC residence /
   system-omni / session principal). Verify no sixth root kind
   (five are listed).
3. **The exempt-singleton classification** — every `ApiLogic`
   subclass (~65) plus the non-Logic singletons: `AccessRegistry`,
   `ParcelRegistry`, `OfficeRegistry`, `ChattelRegistry`,
   `GroupRegistry`, `ReactionRegistry`, `MqlSubscriptionRegistry`,
   `SchedulerRegistry`, `WorldClockRegistry`, `EventSubscriptions`,
   `AddressRegistry`, the catalogues (`TopicCatalogue`,
   `SoulCatalogue`, `SubjectCatalogue`, `ChannelCatalogue`,
   `CorpoCatalogue`), `PlayerApi`'s avatar registry,
   `ConnectionManager`, `HotReloadApi` state, `DiagnosticLogic`.
   Classify each **stateless / scope-aware / needs-a-guard**; the
   expected needs-a-guard set is small (catalogue mutators reachable
   from authored content — e.g. emote/channel/subject registration
   paths, blueprint dedup insertion, reaction aggregation).
4. **The comm-seam inventory** — the seams that must switch to
   identity→active-body resolution under the revised Decision N
   (Scene audience resolution, `CommsMixin.tell`, chat fan-out,
   presence relay), plus the exact method set the delivery
   allowlist will name, plus the
   `EventApi.emit` listener-dispatch note (listeners run under the
   emitter's context ⇒ Layer 2/4 cover their effects; record as
   verified, not seamed).
5. **Unique-index / conservation interactions** — record the
   `holder_snapshots {scope,owner}` uniqueness vs circle host keys,
   and the `postTransaction` invariants that must go scope-aware.

### Wave-boundary deliverable
Suite + all lints green; `lint:pm` unchanged in scope;
`docs/subsystems/sandbox.md` exists with all audit tables marked
VERIFIED; no behavior change anywhere.

---

## Wave 1 — the scope taint + the PM policy seam (ships inert)

Goal: scope rides the ExecutionContext; every durable write is
policy-governed; read filters + discard + sweeper skeleton exist.
No circle can exist yet, so the world is byte-identical (the
inertness criterion).

### Files

**`mud/api/execution-context.ts`** —
- `getCircleScope(): string | null` (Decision B — frame-0 metadata
  read; also `getJurisdictionBound()` for Decision K, same slot
  discipline).
- `runRoot`/`runRootGuarded` optional `opts?: {circleScope?: string;
  jurisdictionBound?: string}` trailing parameter.
- `establishCircleScope(scope)` — set-once, allowlist-gated, throws on
  re-establish.
- `OMNI_SCOPE = '*'` exported const.

**Zone seed data** — add the `wire: true` field to the `/home` zone's
seed (Decision O); `/studio`'s arrives with its own seed in Wave 6.
Classification data ships with the taint so "is this path wire?" is a
`lookupField` from the moment scope exists, never a hardcoded prefix
list.

**`backend/Backend.ts` / `backend/Application.ts` /
`backend/inbound/command.ts`** — boot, seeding, and maintenance roots
plant `circleScope: OMNI_SCOPE`; the command path establishes the
resolved holder's `getCircleScope()` (a stamped-field read on the
giver) before `executeCommand`. WS/REST session roots (`CmsSession`)
establish the acting avatar's scope the same way.

**`mud/api/schedule.ts`** — `planRun` additionally captures
`getCircleScope()` at schedule time and re-plants it via the new
`runRootGuarded` opts (the `causingCommandId` precedent, verbatim).
Add a module-level **per-scope handle index**
(`Map<string, Set<InternalHandle>>`, scoped entries only — zero
entries when no circle exists) + `ScheduleApi.cancelAllForScope(scope)`
(`@internal`-documented; called by `SandboxLogic` at reap). Recurring
handles registered from omni/field context are never indexed.

**`backend/PersistenceManager.ts`** —
- `COLLECTION_POLICIES` (Decision D) + `setScopeResolver` (Decision G).
- `dispatchSave`: resolve scope once; `null` → today's path
  (single resolver call, no allocation). Scoped: STAMP/PASS(mark) →
  `doc.circleScope = scope`; PASS(unmarked) → through; REFUSE → throw
  `SandboxWriteRefusedError(collection, scope)` (new error class
  beside `HookReentryError`); SHADOW(skip) → skip the terminal write,
  returning the incoming `_id` ?? a fresh driver `ObjectId`
  (documented no-op). Note PM is backend-layer and must **not**
  import the mud `SecurityApi`, so this local no-op receipt uses the
  driver's own id — it is never a durable identifier, and Decision
  A2's `SecurityApi.uuid()` rule governs mud-layer minting only.
- `dispatchDelete`/`deleteMany`: scoped context may delete only
  rows carrying its own scope on STAMP collections (compose
  `{_id, circleScope: scope}` into the terminal filter); REFUSE
  refuses; PASS passes (identity-real deletes, e.g. belief forget).
- `find`/`findById`: filter injection per Decision F (STAMP only;
  SHADOW(skip) reads get the field-side residual filter so stale
  scoped residue never surfaces).
- `createIndexes`: partial `{circleScope: 1}` index on every
  STAMP collection (the five ledgers) — see Index notes.

**`mud/lib/stuff/Stuff.ts` + `mud/api/stuff.ts`** — the
`#circleScope` slot, `getCircleScope()`, `_stampCircleScope`
(Decision I); `StuffApi`'s register path stamps newborns from the
minting context's scope (one line beside the `_stampZone` call site).

**`mud/obj/api/BankingLogic.ts`** — conservation goes scope-aware at
the `postTransaction` chokepoint: scoped legs are permitted to mint
(the play-money faucet — a `mint` leg kind valid only when
`getCircleScope()` is non-null), supply recompute reads are
field-filtered by the PM injection for free, and in-circle balance
reads derive live from the ledger (global ∪ scope) instead of the
skipped cache (Decision E). Same reader-side change in
`RenownLogic` / `ParticipationLogic` / `InfluenceLogic` (a
`getCircleScope() !== null` branch to derive-from-events).

**`mud/obj/api/SandboxLogic.ts` + `mud/api/sandbox.ts`** (skeleton) —
the session registry type (`SandboxSession { id, scope, circlePath,
hostPlayerId, occupants: Set<WireBody-ids>, startedAt }` — `id` from
`SecurityApi.uuid()`, Decision A2; `scope` is the parcel path, not
the id),
`discardScope(scope)` (per-STAMP-collection
`PersistApi.deleteMany({circleScope})`), and the **orphan sweeper**:
a `ScheduleApi.recurring` sweep (residency-style cadence + observe/
enforce knobs `sandbox.sweeper.*` in `config/app-settings.yaml`)
that deletes scoped rows for any scope with no live session. With no
sessions ever, any scoped row is an orphan by definition — the
sweeper is total from day one. Facade tail:
`SecurityApi.decorateApiClass(SandboxApi)`.

### Tests
`backend/__tests__/` + `mud/api/__tests__/`: policy totality
(compile + a runtime walk), each verb's write behavior from a
test-planted scoped root, read-filter composition both sides, REFUSE
throws, SHADOW skip no-ops, discard deletes only its scope, sweeper
removes orphans, **inertness**: with no scope established, an
instrumented PM sees zero filter injections on PASS paths and
byte-identical docs; `ScheduleApi` callback re-plants birth scope.

### Wave-boundary deliverable
Full suite green with the seams installed; zero player-visible
change; the policy table enforced and total.

---

## Wave 2 — the boundary policy (dispatch, shadows, continuations, comms, lookups, singletons)

Goal: Layer 4 complete and inert; every reach-walk channel seamed.

### Files

**`mud/api/security.ts`** — the dispatch check inside
`#securityGate`, inserted **after** the destroyed-object guard and
**before** the entry policy (so denials are boundary-attributed, and
dead-object no-ops stay no-ops):

```
scope check (fast path first):
  rcv = ctx.target.getCircleScope()   // raw target, no re-entry
  ctxScope = ExecutionContextApi.getCircleScope()
  if (rcv === ctxScope) → fall through          // null === null
  else if (ctxScope === OMNI_SCOPE) → fall through
  else if (#isBoundaryExempt(ctx.target)) → fall through
  else if (#consumeInspectionBypass()) → fall through (logged)
  else if (#isMessageDelivery(method)) → fall through   // Decision N
  else if (jurisdictionBound covers receiver) → fall through
  else → deny: emit receipt + throw SecurityError
```

- `#isBoundaryExempt` — Decision J (ApiLogic flag + enumerated
  allowlist, lazily cached on the raw target).
- The **inspection aperture**: a `FromModule('/api/sandbox#SandboxApi')`-
  gated `SandboxApi.inspect(fn)` that arms a single-dispatch bypass
  (the `ShadowApi._consumeBypass` shape) and logs every use via
  `MudlogApi` + `DiagnosticApi.record` — due process, not a policy
  bypass; `isWizard` + governance gating on the verb-facing caller
  lands with governance's own tooling, not here.
- `#isMessageDelivery` — the named delivery seam only
  (`SensorMixin.handleMessage` / the Audible push), payload typed as
  rendered MML so **no Stuff reference can ride the exception**
  (Decision N). A fixed method allowlist, not a predicate authors
  can widen.
- The **denial receipt**: `DiagnosticApi.record` (severity error,
  channel `sandbox.boundary`) carrying caller module-id
  (`ModuleApi` resolution of the caller frame's target class),
  receiver `stuffId` + `getTemplatePath()`, method, the scope pair,
  and the live `SandboxSession.id` (Decision A2) so a visit's
  receipts correlate; fire-and-forget so the deny path stays cheap.

**`mud/api/shadow.ts`** — in `attach` (line ~137, beside the
`@ShadowSecurity` resolution) and `detach`: the same scope compare
between `getCircleScope()` (context) and the **host's** stamped scope,
omni + inspection excepted; mismatch → deny + the same receipt shape.
Circle-installed shadows need no special reap path — they die with the
reaped vessel/zone via the existing shadow-host lifecycle (verify with
a test, don't add machinery). `@Unshadowable`/`@Final` untouched.

**`mud/obj/MqlSubscriptionRegistry.ts`** — subscriptions capture birth
scope at registration (`getCircleScope()`); the registry's batched
re-resolve root re-plants each subscription's birth scope (its
allowlist entry already permits root planting); add
`cancelAllForScope(scope)` for reap. Field-born subscriptions keep
`null` scope and continue across a crossing (client push is
out-of-world; the world-side resolve stays field-pure).

**MQL lookup hygiene** (`mud/api/mql.ts` / the seed resolvers) — the
`person`/`reachable`/path-atom seeds filter results to
scope-compatible objects (`obj.getCircleScope() === ctxScope`, omni
sees all); system-mode MQL under omni is unchanged. This is hygiene —
the proxy backstops any leak (and the escape test proves the backstop
by bypassing the filter).

**Comm seams** (Decision N, revised) — comms are **seamless**, so
this is an allowlist plus a resolution change, not a filter: (a)
allowlist the **message-delivery seam** (`SensorMixin.handleMessage`
/ the Audible push) in the boundary check, both directions, payload
restricted to rendered MML so no Stuff reference crosses; (b) point
`CommsMixin.tell`'s recipient resolve (`lib/comms/Comms.ts`), the
chat fan-out (`ChannelCatalogue` delivery walk), and the presence
relay (`NotifyPolicy` push) at the **active body** for an identity
(wire body when a session lives, avatar otherwise). Room-scoped
`Vocal` speech needs no change — it doesn't reach the circle because
the speaker isn't in the room.

**Guarded singletons** — the Wave-0 "needs-a-guard" set gets a
two-line scope check at each flagged mutation method (deny + receipt
when `getCircleScope()` is non-null and the mutation would poison
field-visible state). Exact roster comes from the audit; budget ~4–8
methods.

### Tests
Proxy check unit tests (all six branches; the fast path asserted as
"two loads no walks" by code review marker + a micro-benchmark smoke
test); shadow attach/detach both directions; subscription birth-scope
+ reap-cancel; comms seamlessness (a field `tell` reaches a wire body and the reply
lands; channel messages deliver exactly once, to the live body) plus
the reference-smuggling denial; guarded singleton denies; **receipts
asserted** (a denial produces the diagnostics row with all fields).
The escape-battery files for `dispatch`, `shadow`, `subscriptions`,
`comms`, `lookup`, `singleton` land here red-first (see § Escape
battery) against hand-planted scoped roots — no crossing exists yet,
so tests mint scope via the test-allowlisted `runRoot` opts.

### Wave-boundary deliverable
Suite green; world still byte-identical (no circle mintable); the
boundary policy provably denies hand-tainted contexts with receipts.

---

## Wave 3 — the wire-body crossing

Goal: `SandboxApi.enter/exit` complete over a stub circle (a bare
`SpatialZone` + entry room minted by `SandboxLogic`); park/re-attach/
reap safe under death, crash, and linkdead.

### Files

**`mud/lib/sandbox/WireBody.ts`** — Decision C.
`class WireBody extends Avatar`: `shouldPersist() → false`;
`getIdentityPath()` override; `postRegister` skips `PlayerApi`
registration (a `wire: true` init-context flag beside `isGuest`);
`startAutoSave` no-op'd; presentation copied from the real avatar
(name/pronouns/species fields — plain reads at mint).

**`mud/lib/persistence/Forkable.ts`** — Decision Q: `ForkableMixin`
(composed on `Avatar`), the per-mixin `forkSlice()`/`mergeSlice()`
aggregation (the `getAllPersistentFields` shape), the shadow
`describeFork()` pass with framework-performed re-attach, and the
consumer-supplied merge allowlist. Surface hangs off
`PersistableApi` (no new facade). First slices land on `Visible`,
`Aether`, `SubjectSubscriber`, `Contacts`.

**`mud/lib/stuff/Stuff.ts`** — `getIdentityPath()` default; repoint
the identity-keyed producers (`BeliefStoreLogic` viewer key,
`ChronicleApi`/`ChronicleEntry` owner resolve,
transcript/disposition/renown owner-key resolution in their logic
singletons) from `getTemplatePath()` to `getIdentityPath()` — a
mechanical sweep, each site byte-identical for every existing class
(default forwards).

**`mud/obj/api/SandboxLogic.ts`** — the crossing choreography:
- `enter(actor)`: resolve the actor's circle path
  (`/home/<playerId>` via `selfHomeOwnerOf`; or the invited/studio
  target passed by the door's exit — still context-free for the
  actor's identity), `ensureCircle(circlePath)` (Wave-3 stub: mint
  the circle's `SpatialZone` + entry room under omni, then stamp
  scope on both via `_stampCircleScope`), open-or-join the
  `SandboxSession`, mint the `WireBody` (`StuffApi.create`),
  **fork the parked avatar's slices onto it** (Decision Q —
  presentation, implant, subscriptions-by-move, contacts; plus the
  shadow `describeFork` pass), **transfer each of the actor's
  Interactives** (`ConnectionApi.transfer(interactive, wireBody)` —
  the third principal state; multiplexed sessions all move), which
  drops the parked avatar's connection count to zero → the shipped
  `onLinkdead` presence-freeze + protections fire with **no new
  code**; place the wire body in the circle's entry room.
- `exit(wireBody)`: transfer Interactives back to the parked avatar
  (`onLinkRestored` fires), reap the vessel wholesale
  (`StuffApi.destruct` — inventory and all; nothing material
  crosses), and if the session's occupant set is now empty: cancel
  scoped schedule handles + MQL subscriptions
  (`ScheduleApi.cancelAllForScope`,
  `MqlSubscriptionRegistry.cancelAllForScope`), run
  `discardScope(scope)`, close the session. **Merge** runs here
  against the epistemic-only allowlist (Decision Q): contacts made
  in-circle land on the parked avatar, channel subscriptions return;
  nothing material has a merge path.
- `onWireBodyDeath` — death inside: reap + re-mint a fresh vessel at
  the entry room (the parked body untouched); wired via the existing
  death seam on vitals (a witness call from `WireBody`'s death
  override — a direct call, **no new global event**).
- Park/disconnect/quit (Decision P): parking sets the `parked` flag
  (suppressing the presence emit + vetoing eviction) and captures the
  parked avatar. On a mid-visit drop the wire body goes
  connectionless and the session **stays alive for a grace window** —
  `Login.enter` asks `SandboxLogic` for a live session by `playerId`
  and re-attaches the returning player **to the wire body, in the
  circle**. Past grace the sweep reaps + reconciles and the next
  login lands on the parked avatar (never deregistered from
  `PlayerApi`). A deliberate quit inside runs the exit choreography
  first, then the ordinary logout on the parked avatar.
- Frame-mutator allowlist entry for
  `mud/obj/api/SandboxLogic.(ts|js)` in `execution-context.ts` (the
  `PersistableLogic` precedent, one reviewed line) — SandboxLogic
  plants the circle-scoped roots for materialization and the eval
  scope root (Wave 5).

**No zone class** (Decision O) — the circle's space is an ordinary
`SpatialZone` minted under the circle path, carrying the scope stamp
(a `Stuff` field) and the residency default for eviction. Seed the
entry-room template `/lib/sandbox/CircleFloor` (generic prose;
skinnable later) as ordinary content.

**`mud/api/sandbox.ts`** — facade: `enter`, `exit`, `seedCopy`,
`launchTestSession`, `inspect`, `runScoped` (Wave 5) — all
actor/scope from context, **no scope parameters**;
`SecurityApi.decorateApiClass(SandboxApi)` tail. Guest access is
*not* a facade method: grants ride the shipped parcel grant surface
(`ParcelApi.grantUse`/`revokeUse`, Wave 6), so the sandbox never
mints a parallel permission surface.

**No verb lands here** (Decision L). Wave 3's crossing is exercised
by tests calling `SandboxApi.enter`/`exit` directly; the player-facing
door is the wardrobe, which arrives in Wave 4 — so Wave 3 is a
seam-and-test wave, not a playable one. (If the wave wants a manual
smoke path before the wardrobe exists, seed one wardrobe fixture in
the author staging room as *content* — still no verb.)

### Tests
Round-trip enter→exit (Interactive holder crosses, parked avatar
linkdead-frozen, wire body reaped, scoped rows discarded);
death-inside re-mint; multiplexing (two Interactives both cross);
wire body never persists (`holder_snapshots` untouched); identity
thread (a belief learned in-circle keys on `/obj/Avatar/<playerId>`).
Decision Q coverage: the wire body mints with its forked slices (a
`dm <friend>` resolves inside on forked contacts; channel messages
arrive); a shadow returning a `describeFork` spec re-establishes on
the vessel and dies at reap, one returning null is absent, and
neither can name a target other than the fork; contacts made
in-circle merge back at exit while no material slice has a merge
path. Decision P coverage: crossing emits **no** `PlayerDisconnected` and
presence reads the player as present-but-unreachable; a parked avatar
survives a forced residency sweep (veto) and is captured at park;
drop-and-reconnect **inside** grace lands back in the circle on the
same wire body; drop past grace reaps + discards and the next login
lands on the parked avatar in the field; `quit` inside runs the exit
choreography first, saves the **parked** body, and fires
`PlayerLoggedOut` for the real identity; a simulated restart
mid-visit discards scoped rows and returns the player to an intact
field body.

### Wave-boundary deliverable
Suite green. The crossing round-trips end-to-end against the stub
circle (test-driven; the wardrobe door lands next wave); the four
layers now bind a *real* context; the Wave-2 escape files re-run
against a genuine crossing (drop the hand-planted roots where the
real path now exists). `goto`/`teleport` refusal (Decision L2) lands
here alongside the crossing, since it guards the same invariant.

---

## Wave 4 — the circle, the wardrobe, the aperture

Goal: authored truth materializes; the wardrobe is the player door
with its full lifecycle; the aperture ships; residency handles the
cold tail.

### Files

**`mud/obj/api/SandboxLogic.ts`** — real `ensureCircle`:
materialize the circle lazily from authored truth — clone the
authored room/content templates under the circle's namespace
(`/home/<playerId>/**` spatial content; the entry room always) inside
a circle-scoped root, so every clone auto-stamps (Decision I). Cold
circles need **no new eviction code**: rooms/NPCs cull under the
shipped residency rules and re-materialize on next entry
(`docs/subsystems/residency.md`); verify the circle's zone itself
culls when empty + cold, and that re-entry rebuilds from authored
truth ("exit restores the baseline" = re-materialization, not
diff-undo).

**`mud/lib/sandbox/SandboxCrossingExit.ts`** + **`Exit.ts` /
`Mobile.ts`** — Decision H: the `applyTraversal` `@hook` seam on
`Exit` (default false) + the `Mobile.traverse` consult (one insertion
after the veto phase, before `announceDeparture`);
`SandboxCrossingExit` overrides `canTraverse` (door gate: host title
via `ParcelApi.ownerOf` match, or a live guest grant — Wave 6 widens)
and `applyTraversal` (outbound → `SandboxApi.enter`; the in-circle
return exit → `SandboxApi.exit`, destination resolved live to the
fixture's **current location** via the fixture's chattel identity —
the storage-unit-and-key split).

**`mud/lib/sandbox/Wardrobe.ts`** — the fixture: a `Thing`-tier
placeable (Adornment-capable for wall placement, Chattel-stamped —
both shipped substrates), persistent field
`linkedSandboxPath: string` (Pattern A path string; empty = unlinked,
links on first `enter` to the owner's own circle). Its template's
`exits:`-equivalent contributes the crossing exit via the exit-kind
template **`/obj/exits/wardrobe-passage`** (`class:
SandboxCrossingExit`); skins (wardrobe / turbolift / mirror /
drafting table) are sibling templates differing only in
`Visible`/`Detailed` data. Lifecycle:
- **Move** — nothing to do: the door is wherever the fixture is
  (exit synthesized from the fixture; return-leg resolves live).
- **Sell empty** — chattel `transfer` clears `linkedSandboxPath`
  (the participant-gated setter allows the clearing on title
  transfer); buyer's first entry links to *their* circle.
- **Sell furnished** — chattel `transfer` keeps the link; the circle
  parcel title transfers via `ParcelApi.transfer` (a `/home/` branch
  gains an explicit parcels row at this moment — `ownerOf` rung 1
  shadows the self-home rung correctly by construction);
  `authoring_events` untouched (credit stays with the seller — no
  code needed, provenance is append-only).
- **Destroy** — `onDestruct` witness: reap any wire bodies in the
  linked circle's session (occupants re-attach to parked avatars —
  the non-event eviction), then **orphan** the zone (no destruct;
  dormancy → eviction picks it up); the circle re-binds when any new
  fixture links its path. Multiple doors to one circle: N fixtures
  may carry the same `linkedSandboxPath`; sessions key on scope, so
  doors are trivially concurrent.

**`mud/obj/api/SandboxLogic.ts` — `seedCopy`** (Decision L): target
ownership check (`ChattelApi.ownerOf` == context actor, or own
body/worn gear), capture-as-read through the persistence spine's
capture path as the owning principal (`PersistableApi.capture`-shaped
read of the item's state — never mutating the original), clone minted
inside the circle-scoped root (circle-born, dies with the discard).
**`mud/obj/command/author/CloneController.ts`** — the instance-source
branch (Decision L): when the resolved source is a **live object**
rather than a template path, and the context carries circle scope,
and the actor owns it → route to `SandboxApi.seedCopy`; otherwise
today's template path, with the `--into`/`--here`/self-placement
precedence chain untouched. Ownership and out-of-circle failures are
ordinary rejection notes. `clone.yaml` gains the two sanctioned opts
(Decision L1: `--count <n>`, `--instance`/`--template`) plus
help/examples text; the source arg already resolves objects.

**Char-gen universal circle** — nothing to build: character creation
already *is* the grant (`selfHomeOwnerOf` is pure; no row, no act).
Add the acceptance test that a brand-new character can cross a
wardrobe into their circle with zero provisioning (no parcels row, no
hook, no act).

### Tests
Wardrobe place→link→enter→exit; two doors one circle; move; sell
empty vs furnished (title + credit assertions); destroy-with-
occupants (safe reap + orphan + re-bind + dormancy-evict); seeded
copy (original untouched, copy scoped, copy gone after exit);
`--count` mints N and respects its cap; `--instance`/`--template`
disambiguate a name that resolves both ways; circle
round-trip: author a room template in `/home/` from inside (PASS →
persists), clutter + clone junk (evaporates), fight + transact
(STAMP rows visible in-circle, invisible to field reads, gone after
exit) — the requirements' **round-trip criterion** lands here as a
named integration test.

### Wave-boundary deliverable
Suite green; the full player-facing loop works for a single maker;
`durable-write` and `deferred` escape files now run against the real
crossing.

---

## Wave 5 — the harness seam + jurisdiction-targeted eval

Goal: the CMS can launch a test session; eval is never unscoped.

### Files

**`mud/obj/command/author/EvalController.ts` + `mud/cmd/author/eval.yaml`**
— add `--parcel <path>` (default `/home/<self>`), keep
`requiresWizard`. Resolution (one rule, no special cases):
1. Normalize + resolve the target parcel; **no invocation form runs
   without a named jurisdiction** (the default supplies one).
2. Gate: `ParcelApi.ownerOf(parcel)` → `AccessApi.can(giver, 'eval',
   <parcel resource>)` (self-rule / group membership / committee all
   fall out of the shipped owner-kind dispatch).
3. Mint the template **in the target jurisdiction's namespace**:
   singleton path `<parcel>/_eval` (the existing destruct-and-replace
   dance; addressable provenance — re-runnable by path).
4. Disposition by namespace kind:
   - **Wire** (`/home/…`, `/studio/…`): run inside
     `SandboxApi.runScoped(parcelPath, fn)` — `SandboxLogic` plants a
     circle-scoped root (its allowlist entry; the sanctioned
     root-level scope assignment). The four layers contain the run;
     scoped side-effects discard with the circle session (or
     immediately when no session is live — run-and-discard).
   - **Field** (anything else you hold authority over): run inside a
     root carrying `jurisdictionBound = <parcel extent>` (Decision K).
     Writes are real; dispatch outside the extent denies with
     receipts; the act is receipted — `ProvenanceApi.recordAuthoring`
     against the minted `_eval` path + a `MudlogApi` line.
   `AccessApi.isWizard` remains required for **every** mode;
   `TemplateApi.saveTemplate`'s lockdown is untouched (the governed
   bound additionally refuses template writes outside the extent at
   the eval seam).

**`mud/api/sandbox.ts` / `SandboxLogic`** — `runScoped` (above) and
`launchTestSession(actor)`: the crossing + fresh body + reap-wholesale
as one invokable (it *is* `enter`/`exit` — no harness special case),
returning session info.

**`backend/`** — a CMS route (the existing CMS router file) `POST
…/sandbox/test-session` → `CmsSession.run(req, actor =>
SandboxApi.launchTestSession(actor))`; the session-attribution bridge
already plants the principal (`tagActingAuthor`). Draft-overlay
compose is explicitly **not** built; the seam (a session started
against a circle) must not preclude it — keep `launchTestSession`'s
options bag open.

**`packages/client`** — the minimal CMS affordance: one "Test in
holodeck" button in the CMS panel calling the endpoint (smallest
possible wiring; the game tab's session crosses).

### Tests
Circle-targeted eval: template minted under the circle namespace,
re-runnable, field dispatch denied **with receipts**, scoped writes
discarded. `--parcel` governed eval: committee member writes real +
receipted inside the extent, denied outside it; non-member refused;
non-wizard refused everywhere. Harness: endpoint launches a session
for the session's avatar; reap leaves nothing but the edits. The
`eval` escape file lands here.

### Wave-boundary deliverable
Suite green; eval has no unscoped form anywhere in the tree.

---

## Wave 6 — guests, the group cell, the battery sealed

### Files

**`mud/obj/api/SandboxLogic.ts` + the shipped parcel grant surface** —
guest access: grants live on the circle's parcel (mint the parcels
row for the circle on first grant — owner = the self-home player; the
shipped `grants[]` lease surface carries guest entries via
`ParcelApi.grantUse`/`revokeUse`, the dorm-proven path), checked at
`SandboxCrossingExit.canTraverse`. **No new verb** — a host uses the
same grant surface they use for property. Revoke-while-inside reaps
the guest's wire body (re-attach at the parked avatar — the
non-event). Guests cross with their own wire bodies into the host's
session (shared scope — Decision A); reaping a guest touches only
their vessel, never authored truth.

**`/studio` seeds** — Decision M + O: a `FolderZone` seeded at
`/studio` (no new class) carrying the `wire: true` zone field its
descendants inherit, with its parcel owned by `core`. Provisioning
uses the **shipped `subdivide` + `transfer`** verbs (governance-gated
by the existing core-default `AccessApi.can` dispatch); the only code
here is `transfer`'s group-recipient widening (recipient arg type +
the consent-leg collapse in `TransferController`; verify whether
`ParcelApi.transfer` already takes group owner refs). Entry gate at
the doors = group membership through `AccessApi.can`. Group-circle
sessions behave identically (scope = `/studio/<groupId>`); shared
authored truth persists across member sessions (it's just
`domain`/`documents` rows under the studio namespace — PASS).

**Battery completion + wiring** — see below; the named group gates.

**Docs** — grow `docs/subsystems/sandbox.md` with the shipped
mechanism (tables already there from Wave 0); one-line map entry in
`CLAUDE.md`'s subsystem list; cross-notes in `persistence.md`,
`call-security.md`, `connection.md`, `parcel.md`, `boundary.md`,
`shell-author.md` at sweep time (the `/finalize` pass owns the final
sweep).

### Tests
Guest grant→cross→act→exit symmetric round-trip; revoke-while-inside;
non-member refused at a studio door; member admitted; shared truth
persists across two member sessions; a non-governor's `subdivide` of
`/studio` fails; `transfer` to a group titles the parcel
`kind:'group'`; membership-gated entry. **Plus the palette
assertion:** `mud/cmd/` gains no new file in this build.

### Wave-boundary deliverable
Everything in the requirements' acceptance list demonstrably green;
the battery runs as the regression net.

---

## The escape battery

**Layout.** `packages/server/src/mud/lib/sandbox/__tests__/escape/`
— one file per reach-walk channel, all tagged into a named Vitest
group (`describe('sandbox-escape', …)` + a `vitest` include alias
`pnpm test:escape`) so the battery is runnable standalone and gates
in CI as part of the ordinary suite.

**Red-first discipline.** Each seam's wave lands its escape file
*before* the seam (the test drives the seam in): the adversarial
action is expressed against the raw engine and asserted contained —
on the pre-seam tree it fails (the leak succeeds), on the post-seam
tree it passes. Where a channel needs a live crossing before Wave 3,
the test mints scope through the test-allowlisted
`runRoot(…, {circleScope})` path and is upgraded to the real crossing
when it exists.

| File | Adversarial shape | Fails without |
|---|---|---|
| `dispatch.escape.test.ts` | circle context calls a mutator on a live field object via a smuggled ref (and the reverse: field context pokes a circle NPC); asserts `SecurityError` + a `sandbox.boundary` diagnostics row carrying caller module-id, receiver, scope pair | the proxy check |
| `durable-write.escape.test.ts` | one probe per verb: STAMP row visible in-circle / invisible to field reads / gone after exit; REFUSE (e.g. `chattel` stamp, `positions` write) throws from circle context; PASS row persists wire-marked; SHADOW(skip) cache write no-ops while the in-circle derive still moves | the PM policy seam |
| `deferred.escape.test.ts` | a circle context schedules a timer that mutates a field object after exit; asserts the callback runs under birth scope (denied at dispatch) AND the handle is cancelled at reap | ScheduleApi propagation + the per-scope index |
| `comms.escape.test.ts` | comms **must work** (a field `tell` reaches the wire body; the reply lands; channels deliver once) *and* must not become a reference channel: asserts the delivery allowlist accepts only rendered MML, and that a Stuff reference obtained during a conversation still denies on a non-delivery dispatch | the narrow delivery allowlist + the Layer-4 backstop |
| `subscriptions.escape.test.ts` | a subscription registered in-circle keeps pushing after reap; asserts cancelled; a field-born sub survives the crossing unpoisoned | subscription birth-scope + reap-cancel |
| `lookup.escape.test.ts` | circle-context MQL (`reachable`, path atom) resolving a field object, then dispatching on it; asserts filtered resolve AND backstop denial | lookup hygiene + proxy |
| `singleton.escape.test.ts` | circle context mutates a flagged exempt singleton's field-readable state (per the audit roster); asserts the per-method guard denies with receipt | the guarded-mutator checks |
| `shadow.escape.test.ts` | circle code attaches a shadow to a field host; field code shadows a circle NPC; asserts both denied at `ShadowApi.attach` with receipts; a circle-installed shadow on a circle host dies at reap; **and the fork vector**: a shadow whose `describeFork` tries to name a host other than the fork lands on the fork anyway (the framework, not the shadow, chooses the target) | the `@ShadowSecurity`-seam rule |
| `eval.escape.test.ts` | circle-targeted eval dispatching on a field object (denied, receipted, template addressable); governed `--parcel` eval writing outside its extent (denied) and inside it (real + receipted); non-member refused | the eval jurisdiction integration |
| `crossing.escape.test.ts` | matter-smuggling: items held at `exit` don't cross; a wire body's inventory row never lands in `holder_snapshots`; death-inside doesn't touch the parked body; **a wizard `goto`/`teleport` at a circle path is refused** (no real body inside a circle — Decision L2); **and the merge vector**: a mixin that offers a material `mergeSlice` is not merged, because the allowlist belongs to the consumer, not the slice | the wire-body model + the direct-placement denial + the merge allowlist |

Plus the **round-trip acceptance test** (Wave 4) and the
**inertness test** (Wave 1) which live beside the battery and assert
the two global criteria (field state unchanged on every material
ledger; zero-circle overhead shape).

---

## Index & migration notes

- **New indexes** (in `PersistenceManager.createIndexes`, one block
  per STAMP collection — `bank_ledger`, `transcripts`,
  `renown_events`, `participation_events`, `disposition_events`):
  `createIndex({circleScope: 1}, {partialFilterExpression:
  {circleScope: {$exists: true}}})`. Partial beats sparse here (same
  storage win; clearer semantics). Exit's
  `deleteMany({circleScope})` and circle-side `$or` reads use it;
  field reads keep their existing driving indexes (the injected
  `$exists:false` predicate is residual filtering, not index-driving
  — recorded as the deliberate trade in `sandbox.md`).
- **No index changes on PASS collections.** The wire mark on the
  epistemic ledgers is an unindexed field (presentation-layer
  consumers derive; the mark is guaranteed, rendering is out of
  scope).
- **No per-session collections, ever** (Atlas ~500-collection cap);
  same-collection + scope field throughout — enforced by the policy
  table's shape (there is no code path that names a dynamic
  collection).
- **No data migration.** Existing rows carry no `circleScope`
  (absent == field row by definition — exactly what the filters
  assume). The enum additions are name-plumbing only.
- **Unique-index audit results to record (Wave 0):**
  `holder_snapshots {scope, owner}` — circle hosts key by their own
  `(scope, key)` identity (distinct from any field host), no
  collision; all other unique keys live on REFUSE or
  SHADOW(skip) collections, so no unique index gains `circleScope`
  in this build (the overlay-mode spec documents the requirement if
  one ever flips).
- **Conservation:** the `postTransaction` chokepoint treats scoped
  legs per-scope; the scoped-mint kind is valid only under non-null
  scope; the field supply headline provably excludes scoped rows
  (test: mint scoped play-money, recompute supply, byte-identical).

---

## Risks and open implementation questions

- **`Mobile.traverse` insertion (Decision H).** Adding
  `applyTraversal` touches the hottest movement path; the default
  `false` keeps it a virtual call + branch. If review balks, the
  fallback is a `canTraverse`-refusing exit plus a
  `commandContributions` entry on the fixture (an `enter <wardrobe>`
  affordance afforded by the content itself, per command-spec) —
  uglier but zero-touch on `Mobile`, and still no core verb. Decide
  at MR review.
- **`getIdentityPath()` sweep breadth.** The repoint touches ~5 logic
  singletons; each site must be verified byte-identical for
  non-WireBody callers (default forwards to `getTemplatePath()`).
  A missed site degrades gracefully (a wire-keyed epistemic row —
  wrong attribution, not a leak); the round-trip test's
  identity-thread assertion is the net.
- **`establishCircleScope` at the command boundary.** The command
  root is planted in `backend/inbound/command.ts` before the holder
  is known; the establish-after-plant pattern must be verified
  race-free for the serialized-per-socket inbound chain (it is
  serialized today — `inboundChainBySocketId`).
- **PASS classification of `blueprints` / `media_assets`.** Both are
  provisional (authored-truth adjacents); Phase-0 verification may
  flip either to REFUSE (blueprint dedup from circle compositions
  writing a global catalogue row is arguably field-visible state).
  The table is one line to flip.
- **In-circle derive-on-read branch cost.** The Decision-E reader
  branches (`getCircleScope() !== null` → derive from events) add a
  cheap null check on hot read paths; the derive itself is the
  existing recompute machinery. If a circle session hammers standings
  reads, a per-session memo inside `SandboxSession` is the labeled
  escalation.
- **Wire-body verb surface residue.** Subclassing Avatar carries
  verbs whose targets are field-side by nature (`party`, forums
  posting, banking withdrawals against the real account). All are
  contained (REFUSE/deny), but the *prose* of those denials will be
  security-error-shaped until polished; acceptable for this build
  (denials are receipts, not UX), noted for the epistemic-
  presentation non-goal.
- **Guest grant storage.** Reusing `ParcelApi.grantUse` on a
  first-grant-minted `/home/` parcels row slightly widens rung-1
  shadowing of the self-home rule; `ownerOf` remains correct
  (explicit title == same player), but the Wave-6 tests must pin
  `selfHomeOwnerOf` equivalence before/after the row exists.
- **Sweeper vs live-session detection across restarts.** Sessions
  are runtime state; after a crash-restart every scope is
  sessionless, so the sweeper's first pass discards all scoped rows
  — correct by doctrine (nothing persists but the edit), but the
  sweep must run **after** PM connect and before players can enter
  (order it in the boot manifest).
