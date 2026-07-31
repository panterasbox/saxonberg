# Sandbox (the holodeck)

The containment substrate + the wire-body crossing that make **"every
durable mutation is either governed or discarded"** true in code, and
give every maker an anything-goes workshop over the wire namespaces
(`/home/<playerId>`, `/studio/<groupId>`). Doctrine, walks, and the
build's decision record live in the slate/plan/requirements while the
build is in flight; this doc is the durable audit record and grows the
shipped mechanism wave by wave.

Governing invariant, restated once: enforcement is **taint, not stack
inspection** — circle scope is ambient state minted only at execution
roots; purity holds by induction (one O(1) check per proxy dispatch,
one policy lookup per PM write).

## The scope taint

- **Scope value** = the circle's parcel path (`/home/<playerId>` /
  `/studio/<groupId>`); `'*'` (`OMNI_SCOPE`) is the system sentinel;
  `null` is ordinary field work. Scope is NEVER an API parameter — it
  rides the frame-0 root's metadata (`ExecutionContextApi.
  getCircleScope()`, one ALS load + constant index, no walk).
- **Minting**: `runRoot`/`runRootGuarded` take an optional trailing
  `{circleScope, jurisdictionBound}`; `establishCircleScope(scope)` is
  the set-once command-boundary seam (throws on re-establish — a circle
  frame under a field root is a contradiction). Both are gated by the
  existing frame-mutator allowlist.
- **Receiver stamp**: `Stuff.#circleScope` (hard-private, the `#zone`
  shape) — `getCircleScope()` public read, `setCircleScope` gated
  `ApiOnly`, `_stampCircleScope` the caller-allowlisted mint seam.
  `StuffApi`'s register chokepoints stamp newborns from the minting
  context's scope (omni and null leave the slot null — system-minted
  objects are field objects). That single line is the induction.
- **Wire classification** is a zone FIELD, not a class or prefix list:
  the `/home` (and later `/studio`) seed declares `wire: true`; every
  descendant inherits it through the shipped `Zone.lookupField` walk.

## The write-path policy table (VERIFIED 2026-07-30)

Verified writer-by-writer against the live tree (every collection's
writers, gameplay reachability, and unique indexes audited). The
enforced copy is `COLLECTION_POLICIES` in
`backend/PersistenceManager.ts` — `Record<Collections, …>` makes
totality a **compile error** (a new collection cannot ship without a
policy row). An unclassified string collection written from circle
context fails closed at runtime.

| Verb | Collections | Disposition from circle context |
|---|---|---|
| **STAMP** | `bank_ledger`, `transcripts`, `renown_events`, `participation_events`, `disposition_events` | Write proceeds with `circleScope` stamped; field reads exclude; circle reads compose global ∪ own-scope; exit/sweeper discards. The material gameplay ledgers — the game genuinely runs, then reverts. |
| **PASS (mark)** | `chronicles`, `beliefs`, `authoring_events`, `accountability_events`, `diagnostics` | Identity-real; persists with the epistemic wire mark (`circleScope` recorded, never filtered). What happened to *you* stays yours; readers may lens the mark. |
| **PASS (unmarked)** | `domain`, `documents`, `holder_snapshots` | Authored truth + the mechanism's own stores — the deliberate save is the product. |
| **SHADOW (skip)** | `bank_accounts`, `bank_supply`, `renown`, `participation`, `producer` | Rebuildable caches: the terminal cache write silently no-ops from circle context; in-circle reads derive from events (banking: the per-scope overlay). Overlay mode is specified as the labeled attach point, not built — no collection needs it. |
| **REFUSE** | everything else (identity/auth, title registries `parcels`/`chattel` + event chains, `contracts`, `positions`, `groups`/`channels`/`parties`/forums, `emotes`, `name_banks`, `recipes`, `bulletins`, `office_holders`, `app_settings`, `world_state`, `producer_events`, `blueprints`, `media_assets`) | Throws `SandboxWriteRefusedError`. Field-real state a sandbox session may not mutate. |

Audit notes that changed the provisional classification:

- **`blueprints` → REFUSE** (was provisional PASS): the dedup path
  *overwrites* an existing global catalogue row's name/metadata on a
  signature hit — field-visible mutation, not an append. CMS publish is
  unaffected: `CmsSession` resolves the acting avatar to the registered
  **field** body (a parked avatar keeps the registry slot), so CMS work
  stays field-scoped even mid-visit.
- **`media_assets` → REFUSE** (was provisional PASS): sole writer is
  the offline `tools/illustrate.ts` CLI; no circle path should reach it.
- **`contacts`** has no collection — mixin state; it travels as a
  fork/merge slice (Decision Q), not through this table.
- `subdivide` carries only `requiresAnimate` and writes both `domain`
  and `parcels` — the REFUSE row on `parcels` is what contains it
  in-circle.

## Read filters, discard, indexes

- **STAMP reads**: field context gets the residual
  `circleScope: {$exists: false}` (existing indexes still drive; the
  predicate filters residue — the recorded deliberate trade); circle
  context gets `$or: [{$exists:false}, {circleScope: scope}]`.
- **SHADOW reads**: both contexts get the field-side residual filter
  (defensive — no scoped row should ever exist there).
- **PASS/REFUSE reads**: zero injection, ever (the checkable inertness
  criterion).
- **Scoped deletes**: a circle may delete only rows carrying its own
  scope on STAMP collections (the terminal filter composes
  `circleScope`); `deleteMany` reserves the hook slot but skips per-id
  around-delete hooks (bulk maintenance has no per-doc identity).
- **Discard** = `deleteMany({circleScope: scope})` per STAMP collection
  (+ cancel scoped schedule/clock handles + drop the banking overlay).
  The **orphan sweeper** (`sandbox.sweeper.intervalMs`, residency-style
  real-time cadence) discards scoped rows for any scope with no live
  session — after a restart that is all of them, correct by doctrine.
- **Indexes**: partial `{circleScope: 1}`
  (`partialFilterExpression: {$exists: true}`) on the five STAMP
  collections. Partial beats sparse (same storage win, clearer
  semantics). No index changes on PASS collections (the wire mark is
  unindexed). **No per-session collections, ever** (Atlas ~500-cap);
  the policy table's shape leaves no code path that names a dynamic
  collection.

## The roots table (VERIFIED 2026-07-30)

21 production `runRoot`/`runRootGuarded` sites; the frame-mutator
allowlist is the hard bound. Scope source kinds: (a) Interactive
principal, (b) propagated-from-registration, (c) NPC/host residence,
(d) system-omni, (e) session principal.

| Root site | Kind | Scope handling |
|---|---|---|
| `backend/inbound/command.ts` `executeCommand` | (a) | `establishCircleScope(giver.getCircleScope())` after the holder resolves — the command boundary seam |
| `backend/CmsSession.ts` | (e) | establishes the acting avatar's stamped scope beside `tagActingAuthor` (resolves to the field body — see PASS note above) |
| `backend/Backend.ts` connect/disconnect/message roots | (a)/(e) | unscoped (field) — the nested command root carries the scope |
| `backend/Backend.ts` OAuth verify / test-auth / link/unlink | pre-principal (the audit's sixth kind: anonymous account operation) | unscoped — account ops are field work by construction |
| `backend/{Twitch,Kick,Youtube}RelayReader.ts` (4 sites) | (d) | plant `OMNI_SCOPE` |
| `mud/api/schedule.ts` `planRun` (2 shapes) | (b) | birth scope captured at schedule time, re-planted on the fresh root (the `causingCommandId` precedent); per-scope handle index serves reap |
| `mud/obj/WorldClockRegistry.ts` heartbeat + hostDestroyed | (d), **multi-tenant** | heartbeat root is omni; each *scoped* schedule's callback is re-rooted per-fire under its birth scope (`Schedule.birthScope`), so the shared maintenance root never launders a circle continuation |
| `mud/obj/SchedulerRegistry.ts` emission/completion | (a)/(c) | root planted with the engagement **actor's** stamped scope |
| `mud/obj/SchedulerRegistry.ts` hostDestroyed | (d) | omni (termination is system work) |
| `mud/lib/command/CommandGiver.ts` `executeAsyncBody` | (a) | inherits the command root's established scope (same tree) |
| `mud/obj/api/ProvenanceLogic.ts`, `mud/api/diagnostics.ts`, `mud/api/script.ts`, `mud/lib/npc/DialogueConversation.ts`, `mud/lib/craft/ManualBuildStep.ts`, `mud/lib/behavior/crossing-ritual.ts` | (b)/(c) | nested under scoped roots or re-planted via ScheduleApi — inherit correctly |

Boot/seeding runs with **no root at all** (no ALS store) — reads as
null scope, which PM treats as field/system default; nothing to plant.

## Exempt-singleton classification (VERIFIED 2026-07-30)

- **`ApiLogic` subclasses (85)**: 74 pure forwarding shells
  (stateless); 11 hold instance state, all classified **scope-aware**
  (boot-only latches/handles, playerId-keyed registries, cadence
  limiters, wizard-gated memos). `ApiLogic` carries the
  `isBoundaryExempt` flag (Decision J).
- **Non-Logic singletons**: exempted only via the enumerated
  `BOUNDARY_EXEMPT_TEMPLATE_PATHS` allowlist in `security.ts`; anything
  unmarked and unscoped is subject to the ordinary compare (fails
  closed).

**Needs-a-guard set** (mutation methods reachable from gameplay that
would write field-visible shared state; each gets the two-line scope
check + deny-receipt in the boundary wave):

| Holder | Guarded mutators | Why |
|---|---|---|
| `SoulCatalogue` | `mint`, `edit`, `delete` | flat-global emote verb/alias namespace, author-reachable |
| `SubjectCatalogue` | `makeSubject`, `makeThreadSubject`, `deleteSubject`, `renameSubject` | flat-global title namespace (forums/chat spine) |
| `ChannelCatalogue` | `createPlayerChannel`, `createBoundChannel`, `attachChatToSubject`, `promoteAdHocToManaged`, `renamePlayerChannel`, `disbandPlayerChannel` | global channel-name namespace |
| `AddressRegistry` | `registerLocality` (via `Locality.postRegister`) | any circle-cloned Locality would self-insert into the shared address trie |
| `SchedulerRegistry` | the `activityRegistry` capture-at-start write in `start` | free-string type→class dispatch index; a circle activity class must not re-point field dispatch |
| `ParcelRegistry` | trie writers (`subdivide`/`transfer`/`grantUse`/`revokeUse`/`retire`) | live coverage trie beside the REFUSE'd rows |
| `HotReloadApi` | `reload`/`unload` | path-keyed global class registry (wizard-gated, but a circle wizard's reload is field-visible) |

Scope-aware (no guard): `ReactionRegistry` (commandId/location/channel
keyed + GC'd), `MqlSubscriptionRegistry` (Interactive-keyed),
`EventSubscriptions` (bounded, name-keyed), `ChattelRegistry` (minted
unique ids; rows REFUSE'd anyway), `PlayerApi` registry
(playerId-keyed), `ConnectionManager` (socket-keyed, privileged
layer), `WorldClockRegistry` schedules (host-keyed + birth-scoped),
`OfficeRegistry`/`GroupRegistry` (boot-only). Watch-list (derived
caches whose input is the template tree — inherit the tree's
containment): `EmploymentLogic.operatorIndex`,
`ScriptLogic.RESOLVE_CACHE`, `TopicCatalogue`/`CorpoCatalogue`
template-scan caches.

**Exempt bases and the framework method set (as built).** Two base
classes register via `_registerBoundaryExemptBase` at boot wiring:
`ApiLogic` (Decision J) and **`Interactive`** — the connection
transport is out-of-world plumbing; sockets attach to holders on
either side of the boundary and no domain state rides an Interactive's
surface. `/obj/EventRegistry` joined the enumerated path allowlist
(the event bus is framework infrastructure). A fixed
**framework-method set** is boundary-exempt on any receiver — the
identity primitives (`isDestroyed`/`toString`/`getTemplatePath`/
`getCircleScope`/`getIdentityPath`/`getPlayerId`/`getPresentation`)
plus the `HasInteractive` connection seam (`getHolder`/`setHolder`/
`addInteractive`/… /`onLinkdead`/`onLinkRestored`) — the crossing
itself moves Interactives between a field body and a circle vessel.
This is NOT a read allowlist: it is the same fixed set the
destroyed-object guard exempts, grown by the transport seam, and it
answers only "what is this / who holds the socket."

**The reference-data tier (added during the live pass).** A third
exemption arm registers whole BASE CLASSES whose instances are shared,
seeded vocabulary rather than world state: `Species`, `BodyPlan`,
`Clade`, `LocomotionMode`, `Material`, `Modality`, `Condition`,
`CombatFormation`, and `Zone`. These are commons — never mutated at
runtime, and the PM policy table REFUSEs writes to their rows
independently — so exempting them widens **reads** only.

They are not a convenience. A body inside a circle that cannot read
its own species is not animate: it can't walk, act, or leave (the
first vessel was refused `go` as "not currently animate", then refused
again on its clade's rank). `Zone` is the same problem one level up: a
zone is the template tree's *classification* of a path, and wire-ness
itself is a Zone field, so un-exempt, code inside a circle cannot even
ask whether it is inside a circle. `PersistentHydrator` is exempt for
the same shape of reason — hydrators are stateless engine singletons
used as pure functions BY the clone pipeline, and without the
exemption every clone inside a circle silently skipped hydration, so
the vessel minted with no default loadout.

**The rule of thumb**: keep the list to genuine vocabulary. Anything a
player can change is world state and does not belong here.

## The crossing (as built)

- **Fork/merge**: `ForkableMixin` (`lib/persistence/Forkable.ts`) —
  per-layer `forkSlice_<Name>()` / `mergeSlice_<Name>(slice)` by
  method-name convention; surfaced on `PersistableApi.
  forkRuntimeState/mergeRuntimeState` (no new facade). First slices:
  `Presentation` (Avatar name parts; fork-only) and `Contacts`
  (epistemic; the ONE entry on the sandbox merge allowlist). The
  collect phase runs under an omni sub-root inside `PersistableLogic`
  (the fork deliberately spans the boundary); apply runs in the
  circle root so followers and state land circle-stamped. Shadows opt
  in via `describeFork(): (() => Shadow) | null` — a factory the
  framework constructs in-scope and attaches to the fork only.
- **Channel-subscription travel** (the plan's third slice) was
  replaced by **active-body delivery redirect**, which is strictly
  less machinery: subscriptions and rules stay on the registry
  (field) avatar and nothing needs restoring at exit.

  Where the redirect happens moved during the live pass. It is at the
  **delivery seam only** — `Avatar.handleMessage`/`handleEnvelope`
  resolve their sockets through a module-private `forwardingTargets`,
  which hands back the live vessel's Interactives while the body is
  parked. Everything upstream of that keeps naming the FIELD avatar:

    - `ChannelCatalogue.audienceFor` returns registry avatars. A
      recipient is also the *viewer* every per-recipient MML name is
      lensed for, so putting the vessel in the audience makes a
      field-context render read circle-resident perception state,
      which the boundary denies — one person stepping into a circle
      killed the channel post for **everyone**.
    - The `online` MQL provider (`api/mql/online-wire.ts`) walks
      Interactive → holder → back to the holder's field identity, for
      the same reason plus one more: a field-context resolve must not
      touch a circle-scoped object at all, since the scope-walk's own
      reads deny before any filtering could happen.
    - `Avatar.isConnected()` reports the vessel's connectivity while
      parked. Sockets live on the vessel, so the inherited answer is
      `false`, and every consumer of it — `who`, the `online` scope
      that `dm`/`tell` resolve against, the presence roster, notify —
      reads that as *offline*. Stepping into your own circle made you
      unreachable to the whole world, the precise opposite of "the
      wire is unsurveillable, not unreachable."

  Read side and write side are twins: `isConnected` answers *is this
  person reachable*, `forwardingTargets` answers *through which
  sockets*. Both keep the field body as the stable identity everyone
  addresses.
- **Parking (Decision P)**: `Avatar.parked` — presence emit
  suppressed in `onLinkdead`, `canEvict` veto while parked, captured
  at park (best-effort, loud on failure — the autosave posture).
  `WireBody.onLinkdead` routes to the session machinery: bare drop →
  grace timer (`sandbox.session.graceMs`); leave-intent → exit
  choreography first, then the ordinary logout against the PARKED
  body. `Login.playCharacter` asks `SandboxApi.reconnect` before the
  field handoff — inside grace you land on the same vessel, in the
  circle.
- **Death inside**: `SandboxApi.respawnWireBody` — reap + re-mint at
  the entry room, parked body untouched; a direct witness call, no
  new global event.

## The door, the aperture, the harness (as built)

- **Traversal seam (Decision H)**: `Exit.applyTraversal(mover)` — an
  `@hook` an exit subclass overrides to fully apply the traversal
  (`true` = handled; nothing resolves, announces, or moves).
  `Mobile.traverse` consults it after the door gate and the mover's
  own veto, BEFORE destination resolution (a crossing has no
  destination and no departure — the body stays put).
- **`SandboxCrossingExit`**: `enter` direction runs the full door gate
  (sync person-shape checks in `canTraverse`; the async authority gate
  — own circle always yours, else title holder or `ParcelApi.
  hasUseGrant` — in `applyTraversal`, refusing via the ordinary
  ContainmentError prose path) then `SandboxApi.enter`; `return`
  direction is always open and runs `SandboxApi.exit`.
- **`Wardrobe`** (`/obj/sandbox/wardrobe` + skin siblings): Thing-tier,
  chattel-identified, one persistent field (`linkedSandboxPath`,
  Pattern A; `''` = unlinked). `onMoved` re-seats the passage (the door
  is wherever the fixture is). Guest access rides the shipped parcel
  grant surface — `revokeUse` carries a direct sandbox witness that
  exits a revoked guest mid-visit.

  **The public-booth rule.** What a door does on first entry turns on
  **ownership**, not on who got there first:

    - *Owned* (chattel-stamped — someone bought or crafted it): the
      first entry links the door to its OWNER's circle, permanently.
      That is what makes "sell empty" work — the buyer's first entry
      links *their* circle — and it is why a visitor in your hall can't
      re-point your wardrobe at their own space by beating you to it.
    - *Unowned* (a fixture standing in a commons — the wire alcove, a
      library, a campus nook): it NEVER links. Every enterer goes to
      their own circle. Character creation is already the grant
      (`selfHomeOwnerOf`), so the honest behavior for a door nobody
      owns is "this opens onto yours" — a phone booth, not a claim.

  Destroy follows from the same split. A *linked* door is the mouth of
  one named circle, so `onDestruct` reaps its occupants via
  `closeSession` (each exits to their parked avatar) and orphans the
  zone — re-bindable, since doors are concurrent. A *public booth*
  names no scope and therefore has no session to close: the way out is
  the circle's own `out` passage, which the booth never owned, so
  destroying it strands nobody and is a true non-event.
- **Circle materialization**: lazy, under the circle-scoped root — the
  `CircleFloor` entry room + the `out` passage + every
  Location-classed authored template under the circle's namespace
  ("exit restores the baseline" = re-materialization). Cold circles
  cull under shipped residency; nothing new.
- **The seeding aperture (Decision L)**: `SandboxApi.seedCopy` —
  in-circle context required; ownership = chattel title
  (identity-keyed) or own-body-carried; the capture is a read of
  persistent instance fields under a system sub-root (never
  `_chattelId` — the copy is fresh and unowned); the mint runs in the
  ambient circle context, so the copy is circle-born. Player surface:
  the `clone` verb's instance-source branch (`--instance` forces the
  live seed, `--fresh` forces template-fresh, `--count <n>` caps at
  20). Zero new verbs — `transfer --group` (the consent-leg collapse
  for group recipients) and `eval --parcel` are the only other verb
  touches.
- **Jurisdiction-targeted eval (Decision K)**: `eval [--parcel <path>]`
  defaults to `/home/<self>`; NO unscoped form exists. The gate is
  authority over the parcel (owner-kind dispatch); the singleton mints
  at `<parcel>/_eval` (addressable provenance). Wire parcels
  quarantine via `SandboxApi.runScoped`; field parcels govern via
  `runGoverned` — the root carries `jurisdictionBound`, and the
  dispatch check (one combined frame-0 read) denies any receiver
  outside the extent while in-extent writes are real and receipted
  (`recordAuthoring` + a mudlog line). `isWizard` is required for
  every mode — jurisdiction gates *where*, never *whether*.

  Three things the live pass forced into the shape:

    1. **The scratch's whole life runs inside the jurisdiction root**,
       not just the run. The boundary is symmetric, so a scratch minted
       field-side and run circle-side dies on the *second*
       `eval <code>` in the same jurisdiction — the field-context
       destruct of the previous, now circle-scoped, scratch is denied.
       Keeping mint + lookup + run in one root also means the scratch a
       wire jurisdiction leaves behind dies with the circle, which is
       what "quarantined" is supposed to mean.
    2. **Only the player's code goes in there.** Naming the targets and
       reporting the results happen outside, in the caller's own
       context: inside a wire root the controller is standing in the
       circle, so `target.getPresentation()`, `this.tell(...)`, and even
       `this._formatResult(...)` are cross-boundary dispatches against
       a field-resident receiver. The plain field `eval` was dying
       writing its OWN output line, not running anyone's code.
    3. **Wire-ness resolves through `ZoneApi.resolveEnclosingZoneForPath`**,
       not `resolveZoneForPath`. `/home` and `/studio` are non-SPATIAL
       zones, so the spatial resolver walks straight past them and
       answers `null` — which reads as "not wire" and sends quarantined
       code down the *governed* path.

  The scratch mint itself lives behind `ScriptApi.mintEvalScratch`. Its
  identity stamp (`setTemplatePath`, so MQL's path atom can address the
  scratch) is `ApiOnly`-gated, and `EvalController` is a controller —
  it was calling the setter directly, so **every** `eval <code>` died
  on the gate, in the field as well as in a circle.
- **The harness seam**: `POST /api/sandbox/test-session` (CSRF +
  session-attribution bridge) → `SandboxApi.launchTestSession(actor)`
  — which IS `enter`, options bag left open for the draft-overlay
  compose. One "Test in holodeck" button in the CMS editor calls it.
- **The browser battery** (`e2e/tests/sandbox.spec.ts`, 8 specs): the
  crossing as a player meets it, through the real client — walk in and
  out; circle-born clutter does not follow you out; a dropped
  connection resumes inside the grace window; a message reaches IN;
  the vessel can speak OUT (the implant floor is slotted, not just
  carried); `who` survives the crossing; a message out lands exactly
  once; `goto` will not walk a real body in. Assertions target the
  **location pane heading**, never the message feed — the feed is
  append-only scrollback, so a room name from three commands ago is
  still on screen and a "did we move?" assertion against it passes
  without anyone moving. For the same reason, a delivered-message
  assertion matches the rendered `[Global] …` line rather than the bare
  phrase: the command echo carries the phrase too.
- **The escape battery** (`pnpm test:escape`,
  `lib/sandbox/__tests__/escape/`): dispatch, durable-write, deferred,
  comms, subscriptions, lookup, singleton, shadow, eval, crossing +
  the named round-trip acceptance test — the permanent regression
  net, one adversarial file per reach-walk channel.

## Comm-seam inventory (VERIFIED 2026-07-30)

- **The delivery chokepoint holds**: `MessageApi.sendMessage/
  sendEnvelope` → `MessageLogic` → `recipient.onMessage/onEnvelope` is
  the ONLY in-world caller pair of the Sensor pipeline. The frame body
  is **rendered MML string, materialized per-recipient at compose
  time**; `payload` carries `StuffRef` snapshots (`{stuffId,
  displayName}`), never live refs. So the message-delivery allowlist
  (`onMessage`/`filterMessage`/`handleMessage` + envelope trio) cannot
  smuggle a dispatchable reference by construction.
- **Recipient resolution to repoint at the active body** (Decision N,
  comms are seamless): `dm`/`tell` resolves via the `online` MQL scope
  → `ConnectionApi.getAllInteractives()` → holders (wire bodies are
  holders while a session lives — resolves correctly by construction);
  channel fan-out (`ChannelCatalogue.audienceFor` →
  `PlayerApi.getAllAvatars()` + tunedIn gate) and the presence relay
  (`SocialLogic.relayPresence` → `getAllAvatars` + `isConnected`)
  enumerate the **avatar registry**, which holds the parked (
  connectionless) body — these switch to identity→active-body
  resolution in the crossing wave. Room-scoped `Vocal`/Audible speech
  needs no change (geography, not policy).
- **`EventApi.emit`**: listeners run one microtask later but INHERIT
  the emitter's full frame stack (`run`, not `runRoot`) — so a
  circle-context emit's listeners run under circle scope and Layers
  2/4 cover their effects. Recorded as verified, not seamed.

## Unique-index / conservation interactions

- `holder_snapshots {scope, owner}` unique: circle hosts key by their
  own `(scope, key)` identity — distinct from any field host, no
  collision; wire bodies never persist (`shouldPersist() → false`).
- All other unique keys live on REFUSE or SHADOW(skip) collections, so
  **no unique index gains `circleScope` in this build** (the overlay
  spec documents the requirement if a row ever flips).
- **Conservation is scope-aware at the `postTransaction` chokepoint**:
  a circle transaction writes stamped ledger rows but never touches
  `bank_accounts`/`bank_supply` — deltas ride the per-scope in-memory
  **balance overlay** (`balanceMinor = warm cache + scoped delta`),
  cleared at reap. Field supply recompute reads are field-filtered by
  the PM injection, so the headline provably excludes scoped rows.
- Standings caches (`renown`/`participation`/`producer`) recompute from
  field context (schedule callbacks carry null birth scope), so the
  event-read filter excludes scoped rows automatically — field
  conservation with zero reader changes. The in-circle derive-on-read
  branch lands with the round-trip wave.

## The read aperture (`SecurityApi.projectAcross`)

The layers contain durable **mutation**. They are symmetric about
dispatch, though, and that symmetry breaks a whole family of read-only
work the moment two people stand on opposite sides of a circle:

| Surface | What it was doing | Symptom |
|---|---|---|
| `RecognitionApi.describe*` / `perceivedKeywords` | name a person for a viewer | `who` from inside died on `getDisguise()`; a channel post from the field died naming its in-circle recipient |
| `PerceptionApi.sensorium` / `canPerceive` | delivery sense-gate: can this recipient perceive the frame? | `chat` from inside died on the recipient's `getSpecies()` |
| `SocialApi.statusOf` / `composeRow` | compose a roster row | `who` from inside died on `getEngagements()` |

Every one of those is a **projection of a person**: read-only, mutates
nothing, and yields text or a display row — which is exactly what the
doctrine already lets through ("the payload is rendered MML — nothing
but text crosses"). So they route through one seam:

```ts
SecurityApi.projectAcross(a, b, fn, principal)
```

which runs `fn` under an omni root **iff** `a` and `b` are on opposite
sides (`b === undefined` compares against the ambient context, for the
single-subject forms). Same-side calls — every look, every act line, the
whole hot path — take the identity branch and see no widening at all.

Two things the shape had to get right:

- **It lives on the boundary, not in each facade.** There is one policy
  — *naming, sensing and status are projections, not mutations* — and it
  is stated once, beside the check it relaxes.
- **The root is planted AS the calling facade**, which is why
  `principal` exists. A fresh root discards the frame that identified
  the caller, so the logic singleton's own
  `FromModule('/api/<x>#<X>Api')` gate would otherwise refuse its own
  facade. The aperture changes the SCOPE, never the principal.

It is not a general hatch: callers hand over the two principals, so the
omni root only ever wraps a projection the boundary was about to be
asked about anyway. Anything that writes stays on the ordinary path and
stays denied.

**Identity, not object, is the unit of a person.** Once the audience is
the field avatar and the speaker may be a vessel, `a === speaker` stops
meaning "the same human being" — a player posting from inside their own
circle received their own message twice, once as "You" and once as a
stranger. The channel fan-out excludes by `getIdentityPath()`. Expect
this class of bug anywhere a comparison means *person* rather than
*object*.

## What the live pass turned up outside the sandbox

The browser + WebSocket pass through the wardrobe found several defects
that predate this build and are not sandbox-specific. They are recorded
here because the crossing is what made them visible, and because two of
them are fixed on this branch.

**Fixed here, because the sandbox couldn't work around them:**

- **`eval <code>` was dead engine-wide.** `EvalController` stamped its
  scratch singleton by calling the `ApiOnly`-gated
  `Stuff.setTemplatePath` directly, from a controller. Fixed by adding
  `ScriptApi.mintEvalScratch` (see above). The `#templatePath` doc
  comment had named this exact case for a long time — "Api code that
  wants MQL path-atom addressability for an ad-hoc runtime singleton,
  e.g. `EvalScript` stamping `/home/<id>/_eval`" — there just was no Api
  to be called from.
- **The third `clone` of any template died on its own access check.**
  `CloneController` resolved a representative live instance for the
  access slice-walk with `StuffApi.findByTemplatePath`, the singleton
  form, which throws once two instances share a path — the ordinary
  state after cloning the same template twice. Now
  `findAllByTemplatePath(path)[0]`.
- **The residency presence walk aborted at the first circle
  occupant.** The sweep runs from a field root and reads each
  connected holder's room; a wire body is circle-resident, so the read
  denied — and the deny is not caught per-holder, it aborts the whole
  walk. One player stepping into their own circle silently turned off
  residency keep-alive for the entire world. Residency spans the
  boundary by definition (it keeps alive whatever is in use, on either
  side), so the walk goes through `projectAcross` per holder — narrow
  as the reach, and it no longer takes everyone else down with it.
- **Zone `data` never reached the instance.** `Zone.persistentFields`
  was `[]` and `seeds/home.yaml` named no `hydratorClass`, so a seeded
  `wire: true` sat in the row and never applied. Both fixed; `/home` now
  mirrors `/studio`. **Deploy step**: `SeederManager` is insert-only, so
  an existing environment keeps its stale `/home` row — delete
  `domain { path: '/home' }` once and restart to re-seed. Same for
  `/domain/lounge/wire-alcove` and `/lib/sandbox/CircleFloor` if they
  were seeded before the light fixtures landed.

- **A crossing exit is not a spatial exit.** The wardrobe passage
  advertises a `destinationPath` (`/home/<id>`, or bare `/home` while
  unlinked) purely as presentation — it names the wire in the exit
  listing. But anything that walks the exit GRAPH structurally rather
  than traversing it will resolve that path and land on the HomeZone
  *Idea*, which is not a Container: `loc.getContents is not a
  function`, and `look` dies for everyone in the room. `Exit` gained
  `hasSpatialDestination()` (`@hook`, default true) for exit subclasses
  whose `applyTraversal` handles the move itself; the vision flux walk
  is the first consumer and skips them.

  Worth flagging for whoever wires the next graph-walker: **sound,
  pathfinding, and `reachable` have the same shape** and want the same
  check. This one only surfaced because the two rooms this build adds
  ship lights — before that, no room in the world computed light at
  all, so nothing ever followed an exit out of the alcove. A latent bug
  that a feature made reachable is the normal way this goes.

**Reported, not fixed (they would change the world, not the sandbox):**

- **No class composes `AmbientLitMixin`, so light is fixture-side
  only.** A Location with no `LightSource` in it computes
  `pitch-black`, at which band `VisionModality.canSee` fails and
  `RecognitionApi.describe` falls back to "someone" / "something" for
  every occupant. A dark room doesn't merely read as dark: nobody in it
  can be named, told apart, or addressed by name, so `tell <name>`
  cannot resolve a target. The lounge is lit by its neon signs; a room
  authored without a fixture is not. The two rooms this build adds
  (`wire-alcove`, `CircleFloor`) each ship a light for that reason.
- **MQL subscription re-resolve reaches the other way**, from a circle
  root against field deps (`mql.reresolve` diagnostics). It degrades
  gracefully — the re-resolve drops what it can't read — but it is
  noise in `sandbox.boundary` and wants the same treatment as the
  residency walk below.

**Debuggability**: the boundary deny receipt now carries a stack,
captured synchronously before the async receipt body. The `caller` line
names the principal, but the boundary's hard cases are precisely the
ones where the principal is a framework frame (`<unresolved>`) and the
only useful question is *which walk reached across*.
