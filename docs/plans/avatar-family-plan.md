# The Avatar family — implementation plan

Executes [avatar-family-requirements](../requirements/avatar-family-requirements.md).
**Kind:** refactor/sweep. **Lead end:** kernel — the first consumers are
the three shipped bodies (`Avatar`, `Shade`, `WireBody`) and `Login`.
No new capability, no new content except one wiki page the drive reads.

What is being built: `HasInteractive` is cut into three mixins along
its own dependency direction; `Avatar` becomes an abstract family root
with three concrete bodies; `playerId` becomes one field; the estate's
two fields join the mixin that behaves on them; `enter()` is decomposed;
and — ⛔ last, and only after the owner picks — the names change.

Every wave is behaviour-preserving except where a defect is named. The
drive is a wire file whose steps mostly assert that nothing moved.

---

## Grounding

Verified at `a7c337a53` by opening each file. Line numbers are current
at plan time; a build that lands W1 shifts the ones in `Avatar.ts`.

### The file that splits

`packages/server/src/mud/lib/connection/HasInteractive.ts` (1,168 lines):

| lines | concern | goes to |
|---|---|---|
| 62–83 | `setClientStateUpdatePush` — the backend→mudlib DI seam, `eslint-disable no-restricted-syntax` at :80 | CS |
| 96–109 | `ClientStateSchemaEntry` | CS |
| 120–252 | the `HasInteractive` interface — CONN members, CS members, **nine** cockpit members (:198–240), `refreshDisplays` (:138), `getPortraitUrl` (:251) | split three ways |
| 256 | `static _mixinName = 'HasInteractiveMixin'` | CONN (stays) |
| 263–265 | `canEvict` — unconditional veto, does not chain | CONN |
| 278–681 | `static clientStateSchema` — **fifteen entries, all our client's vocabulary** (`console.*`, `cards.*`, `style.overlay`, `cockpit.*`) | SaxonbergClient |
| 695–699 | `static commandContributions` — `platform/cmd/shell/cockpit.yaml` | SaxonbergClient |
| 705 | `protected interactives: Set<Interactive>` | CONN |
| 714–723 | `_clientState`, `_transientClientState` | CS |
| 739–751 | `forkSlice_ClientState` / `mergeSlice_ClientState` | CS (⚠⚠ D4) |
| 753–755 | `fieldMeta._clientState` | CS |
| 757–783 | `refreshDisplays` — reads/writes `cockpit.watch`, MQL `reachable:[mixin.DisplayMixin]` | SaxonbergClient |
| 785–812 | `getInteractives` … `isLinkdead` (~28 lines) | CONN |
| 814–858 | `getClientState` / `setClientState` (schema lookup is `this.constructor.clientStateSchema.find`) | CS |
| 860–1062 | the nine cockpit methods incl. private `migratedLegacyLayout` | SaxonbergClient |
| 1075–1080 | `pushClientStateUpdate` | CS |
| 1088–1116 | `DEFAULT_PORTRAIT`, `getPortraitUrl` (imports `GoogleProfile`, `ShellApi`) | CONN (see D-orphans) |
| 1118–1147 | `snapshotClientState` — ⚠ :1140–1145 hard-code `cockpit.mode` / `cockpit.arrangements` — **the one CS→COCKPIT back-edge** | CS, with the resolve moved out |
| 1156–1158, 1163–1167 | `presenceStatus()` → `PresenceLogic.statusOf`, imported at :38–39 under an existing `eslint-disable no-restricted-imports` | CONN |

**Coupling is COCKPIT → CS → CONN with one back-edge** (:1140). No
cockpit method touches `interactives` except `pushClientStateUpdate`
(CS) and `getPortraitUrl` (CONN).

### Who composes it, who narrows on it

- **Composers (production):** `platform/agent/Avatar.ts:167`,
  `platform/idea/Login.ts:498`, and `backend/Application.ts` (import of
  the DI seam only, :32/:139). Nothing in `packages/content`.
- **`MixinApi.isHasInteractive`:** 65 production sites, 72 with tests
  (`api/mixin.ts:1122`). `Mixins.HasInteractive` at `lib/mixin.ts:262`.
- **The string `'HasInteractiveMixin'`:** `PresenceLogic.ts:40`
  (`FromMixin` gate) and `lib/mixin.ts:262`. Nowhere else.
- **Boundary lists** (`api/security.ts:814–895`) name METHODS
  (`getInteractives`, `isConnected`, `presenceStatus`, `addInteractive`),
  not the class — method names are what must not change.
- **Tests composing `HasInteractiveMixin`:** 42 files. **Twelve** touch
  cockpit or client-state surface and must compose the full tower after
  W1: `api/__tests__/cockpit-mode-gates-nothing.test.ts`,
  `lib/command/__tests__/CommandGiver.inputMode.test.ts`,
  `lib/connection/__tests__/HasInteractive.clientState.test.ts`,
  `lib/connection/__tests__/cockpit-mode-migration.test.ts`,
  `lib/display/__tests__/Display.test.ts`,
  `platform/idea/cmd/shell/__tests__/{Cli,CockpitMode,CockpitShelf,Layout,Style}Controller.test.ts`,
  `platform/idea/cmd/stream/__tests__/WatchController.test.ts`,
  `backend/__tests__/Application.client-state-write.test.ts`. The other
  ~30 compose it only as *is this connected?* and do not change.

### Readers of the cockpit and client-state surface (production)

- Cockpit methods: the six controllers in `platform/idea/cmd/shell/`
  (`Cockpit`, `CockpitMode`, `Layout`, `Style`, `Cli`, `CockpitShelf`),
  all narrowing with `MixinApi.isHasInteractive(giver)` and typing
  `Stuff & HasInteractive`; `Avatar.ts:952` (`getPortraitUrl`),
  `:1075–1077` (`getCockpitMode`/`arrangementCards` on login).
- Client state: `lib/command/CommandGiver.ts:684–691` — reads
  `cockpit.inputModes` for **any** `isHasInteractive` giver when the
  command carries a `barId`. ⚠ `getClientState` **throws on an unknown
  key** (:818–823). The client's char-gen bar sends `barId="chargen"`
  (`client/src/components/CharGenStage.tsx:1034`), so `Login` dispatches
  through this read today. `lib/display/Display.ts:302–309, 345–355,
  382–387` (writes `cockpit.watch` on a viewer narrowed by
  `isHasInteractive`); `lib/spatial/Mobile.ts:570, 673`
  (`refreshDisplays`); `platform/idea/cmd/stream/{Watch,Tune}Controller.ts`;
  `platform/idea/cmd/social/NotifyController.ts:232` and
  `platform/idea/cmd/shell/SettingsController.ts:159` push keys
  (`social.rules`, `shell.result`) that are **not** schema entries — the
  push channel is not schema-bounded and this plan keeps it so;
  `backend/inbound/clientState.ts:20–31` (`instanceof Avatar`, then
  `setClientState` + `save`).
- `cockpit-mode-gates-nothing.test.ts:73–88` hard-codes the four files
  allowed to read `cockpit.mode`; `lib/connection/HasInteractive.ts` and
  `platform/agent/Avatar.ts` are two of them.
- `cockpit-mode-migration.test.ts:112–121` pins the resolved snapshot.

### The family

- `platform/agent/Avatar.ts` (1,649 lines). Composition :163–204 —
  thirteen mixins over `NamedMixin(ShelledCharacter)`;
  `HasInteractiveMixin` at :167. `fieldMeta` :302–308 declares
  `mortalArc`, `lastSeen`, **`escheatedAt`, `beneficiary`** (:305–306;
  fields + accessors :316–340). `playerId` :655 is `protected`,
  **runtime-only, not in `fieldMeta`**. `postRegister` :696–766 — stamps
  `user`/`playerId`/`isGuest` from context, **registers with `PlayerApi`
  iff `this.playerId`** (:706–708), then the loadout/spine choreography
  keyed on `shouldPersist()`. `shouldPersist` :823 (guest gate, chains
  super). `enter()` :901–1097 (197 lines). `announceSessionPresence`
  :1111–1139 (`@hook`). `startAutoSave` :1299 (guest-guarded).
  `onDestruct` :1442–1465. `onLinkdead` :1478–1518. `canEvict` :1575
  (parked veto, chains). Fork slices :1590–1644 (`Presentation`,
  `Embodiment` — hand-written on Avatar, not on `Named`).
- `platform/agent/Shade.ts` (182 lines): `shadePlayerId` :60 with
  `fieldMeta` :62–64; `shadeSpecies` :72 — ⚠ **dead**: `private`, not in
  `fieldMeta`, never assigned (no constructor), so `postRegister`'s
  `if (this.shadeSpecies)` :77 never fires. `postRegister` :74–96 strips
  `playerId` from context then sets `undead`. Overrides `shouldPersist`
  :99, `startAutoSave` :104, `getPlayerId` :108, `getIdentityPath`
  :113–117, `mergeSlice_Embodiment` :144, `onDestruct` :170–177 — ⚠
  **redundant**: repeats `stopAutoSave`/`unregister`/`detach` then calls
  `super.onDestruct()`, which does the same three (and the save/belief
  flush) itself. `getConferredMixinNames` :135 → `['AetherMixin']`.
- `platform/agent/sandbox/WireBody.ts` (170 lines): `wirePlayerId` :54,
  `wireSpecies` :66 (dead, same way); a stale comment at :68–70 says
  *"the constructor now requires it"* — there is no constructor.
  `getIdentityPath` :129–133 returns `Avatar.getTemplatePath(wirePlayerId)`,
  which is **already the identity path the mint stamps**
  (`SandboxLogic.ts:349 asIdentityPath: actor.getIdentityPath()`), so the
  override is a no-op. `announceSessionPresence` :147 (silent) and
  `onLinkdead` :158–165 (routes to `SandboxApi`) are the two genuine
  differences. `shouldPersist` :119–121 is **claimed by
  `docs/plans/sandbox-overlay-plan.md` W3** (:713–749 there) — this
  build does not touch it, nor `startAutoSave` :135.
- `lib/shell/ShelledCharacter.ts` (46 lines): abstract, empty body, five
  mixins, one consumer. 31 references in 22 files, 21 of them docs or
  comments; code references: `Avatar.ts:13`, `lib/npc/NPC.ts`,
  `lib/command/validators/requiresPublisher.ts`, `lib/command/Focused.ts`,
  `lib/shell/{Workspace,Author,Alias}.ts`, `api/shell.ts` (all comments
  or type imports).
- `platform/idea/Login.ts`: `LoginBase = CommandGiverMixin(SensorMixin(HasInteractiveMixin(Idea)))`
  :498; `commandContributions` :507–511 (`embody`, `play`); the comment
  at :504–505 says *"`style` rides along … harmless"* — stale, the verb
  is `cockpit`. No `save()`; `clientState.ts:20` refuses writes for it.
- **Mint sites:** `platform/idea/api/ConditionLogic.ts:676–690` clones
  `/platform/agent/Shade` with `asIdentityPath: /platform/agent/Shade/<pid>`
  and `dataOverlay.shadePlayerId`; registration happens later at :728
  (`PlayerApi.registerAvatar(shade)`), after the drained body is
  destructed :726. `SandboxLogic.ts:344–357` clones
  `/platform/agent/sandbox/WireBody` with context `{ playerId, wire: true }`
  and `dataOverlay.wirePlayerId`. `PlayerLogic.ts:555–566` clones the
  **seed row** `Avatar.SEED_TEMPLATE_PATH` with context `{ user, playerId }`
  and `asIdentityPath`; **the row's `class:` decides the concrete class.**
- **Rows:** `content/platform/content/platform/agent/{Avatar/seed,Shade,sandbox/WireBody}.yaml`.
  The two vessel rows carry `data: { shadePlayerId: "" }` /
  `data: { wirePlayerId: "" }` so the overlay key is declared
  (`lint:instanceable` invariant 12). Six unit tests seed the WireBody
  row with `data: { wirePlayerId: '' }` (`api/__tests__/sandbox.{crossing,wardrobe,guests,go-wardrobe}.test.ts`,
  `lib/sandbox/__tests__/escape/{crossing.escape,round-trip}.test.ts`,
  `lib/behavior/__tests__/crossing-ritual.test.ts`);
  `platform/__tests__/Shade.composition.test.ts:68` sets `shadePlayerId`.
- **Identity namespace:** `TemplatePathPrefixes.avatar = "/platform/agent/Avatar/"`
  (`lib/paths.ts:163`), `AVATAR_IDENTITY_PREFIX` (`lib/character/Estate.ts:24`),
  `Avatar.getTemplatePath` :602; **76 production sites** build or test
  that prefix. `PlayerLogic.isAvatarStuff` :132–139 is a prefix test on
  `getTemplatePath()`. `Stuff.getIdentityPath` (`lib/stuff/Stuff.ts:536`)
  returns `#identityPath ?? templatePath`.
- `instanceof Avatar` in production: `lib/command/validators/requiresAvatar.ts:14`,
  `platform/idea/cmd/author/EvalController.ts:66`,
  `platform/idea/api/TemplateLogic.ts:191`, the four cockpit controllers
  (`CockpitShelf:222`, `Layout:276`, `Style:319`, `CockpitMode:164` — to
  call `save()`), `backend/inbound/clientState.ts:20`. **Every one means
  the family**, and passes for a shade or a wire body today.
- **`EstateMixin`** is `lib/chattel/Estate.ts` (owner-based persistence
  of stamped goods), `static fieldMeta = {}` at :120; composed **only by
  Avatar** (:164). `lib/character/Estate.ts` is the succession
  vocabulary (`ESTATE_STATES`, `AVATAR_IDENTITY_PREFIX`), no mixin.
  `PlayerLogic.touchEstate` :351–440 reads/writes the two fields through
  `getEscheatedAt`/`setEscheatedAt`/`getBeneficiary`.
- **Fork discovery:** `lib/persistence/Forkable.ts:39–52` — prefix
  reflection over the prototype chain (`forkSlice_` / `mergeSlice_`), no
  registration. `SandboxLogic.ts:90 EPISTEMIC_MERGE_ALLOWLIST = ['Contacts']`
  — ⚠ **only Contacts merges back**; `ClientState` is fork-only
  (HasInteractive.ts:735–737). Nothing calls merge at reembody.
- **Composition panel:** `lib/wiki/components/composition.ts` renders a
  template's mixin list from `<composition kind="template" of="…"/>`;
  `wiki-starter` has such a page for `draft-horse`, `wolf`, `oak` — and
  **none for any body in this family**.
- **Wire harness** (`packages/wire/src/harness/`): `Session.open(handle,
  {wizard?})` walks the roster into the world; `Session.embody(handle)`
  walks char-gen; `cmd`/`prose`/`query('me:i', {fields})`/`close`. No
  helper stops at the roster; no wire test kills a player (identity's
  drive kills a *sentry* by `attack … --lethal` + `fight strike`,
  `identity.dirty.wire.test.ts:218–224`); one wire test uses `eval
  --on` (envelope). The dorm room at
  `eternal-university/…/duncan-hall/location/dormroom.yaml:53` holds
  `/platform/thing/sandbox/wardrobe`.

### What the requirements got wrong, and how this plan handles it

⚠ **Drive step 4 asserts a behaviour that does not exist.** *"change a
cockpit preference [inside the circle], come back out → the preference
survived"* — the `ClientState` slice is **fork-only by design**
(`HasInteractive.ts:725–751`, `sandbox.md § The crossing`), and the
merge allowlist is `['Contacts']`. A preference changed inside a circle
discards with it, today and after this build. D4's silent failure is the
**fork** direction — preferences carried *into* the vessel — so the drive
step is executed as: set a preference outside → cross → read it inside →
return → the outside value is unchanged. Merge-back at exit/reembody is
slate Sequencing 6 and is **not** added here. This is a drive-wording
correction, not a scope change; it is recorded here rather than by
editing the requirements doc.

Everything else in the requirements checked out against the code.

---

## Plan-level decisions

**D1 — Kernel; the seam is the deliverable.** `SaxonbergClient` cannot
be a pack: a capability pack must hold a namespace root (`classFileOf`
resolves by longest prefix), and none of the five axes takes it — it is
not a thing, a place, a trade, a firm, or written down, and `/system/`
requires *true whether or not anyone is participating*, which a client
is the opposite of. So all three mixins are kernel, in
`lib/connection/`, and the deliverable is the boundary itself, stated
as one sentence in `connection.md` (W5):

> **A second client implements the connection set and the client-state
> mechanism — the `Interactive` frames and the `client-state-write` /
> `client-state-update` / welcome-snapshot trio — and nothing about
> modes, arrangements, cards-per-mode or shelves, which are one client's
> vocabulary declared on one mixin.**

What would have to change for the pack answer: a sixth axis (*how the
world is seen* — `/client/<name>`) with a pack root under it, and a way
for the platform's own `cockpit.yaml` and its six controllers to move
out of the platform pack. That is a namespace design, not this build.

**D2 — Three mixins, composed as a tower at the concrete class, with
TypeScript bounds not nesting** (mixins.md § *Prefer the bound over
NESTING*):

```ts
// lib/connection/HasInteractive.ts   — CONN, keeps the name
export function HasInteractiveMixin<TBase extends MixinConstructor>(Base)
// lib/connection/ClientState.ts      — CS
export function ClientStateMixin<TBase extends MixinConstructor<HasInteractive>>(Base)
// lib/connection/SaxonbergClient.ts  — our client
export function SaxonbergClientMixin<TBase extends MixinConstructor<HasInteractive & ClientState>>(Base)
```

`_mixinName`s: `'HasInteractiveMixin'` (unchanged), `'ClientStateMixin'`,
`'SaxonbergClientMixin'` — all three in `Mixins` (`lib/mixin.ts`) with
`MixinApi.isClientState` / `isSaxonbergClient` beside `isHasInteractive`
(`api/mixin.ts:1122`). ⚠ Widen every `_mixinName` to `string`
(`Forkable.ts:26–35` says why).

**D3 — The schema becomes a chain walk.** `ClientStateMixin` collects
`static clientStateSchema` up the prototype chain (the
`Environment.collectSchema` shape, `lib/shell/Environment.ts:157–186`),
memoized per constructor in a module-level `WeakMap`. `ClientStateMixin`
itself declares **zero** entries; `SaxonbergClientMixin` declares the
fifteen. `HasInteractive.ts:272–276`'s own comment authorises this
("promote a small registry / walker … when the array outgrows a single
file" — 415 lines did).

**D4 — The back-edge is broken by an override, not a hook.**
`ClientStateMixin.snapshotClientState()` is the pure dense snapshot
(:1118–1132). `SaxonbergClientMixin.snapshotClientState()` calls `super`
then applies :1134–1145. The tower order makes `super` resolve
correctly. `cockpit-mode-migration.test.ts:112` pins it; its `TestHost`
composes the tower.

**D5 — The fork slice moves to `ClientState.ts`, and a test pins BOTH
halves of the move.** `lib/connection/__tests__/ClientState.fork.test.ts`:
(a) a host composing `ForkableMixin(ClientStateMixin(HasInteractiveMixin(Idea)))`
reports `'ClientState'` in `collectForkSlices()` and `applyForkedState`
round-trips a written key; (b) a host composing
`ForkableMixin(HasInteractiveMixin(Idea))` does **not** report it. (b)
is the half nobody would otherwise check: it proves the slice lives on
the mixin the requirement says it does, not somewhere that happens to be
on `Avatar`'s chain.

**D6 — `Login` composes the whole tower.** Two reasons, both
mechanical. `CommandGiver.ts:688` reads `cockpit.inputModes` for any
`isHasInteractive` giver with a `barId`, the char-gen bar carries one,
and `getClientState` throws on an unknown key — a `Login` without the
schema would fail every char-gen command. And the requirement's
invariant is *neither gain nor lose a verb*: the `cockpit` tree rides
`SaxonbergClientMixin.commandContributions` now, so `Login` keeps it by
composing the mixin, exactly as it kept it before. The claim it makes
is true: our client draws the character-select and char-gen screens
with a command bar and pushes client state at them.
`CommandGiver.ts:684–691` narrows to `MixinApi.isSaxonbergClient(giver)`
— the reader of the cockpit keyspace should be the client's, and since
both composers compose it nothing observable changes.

**D7 — The four orphans.**
- **presence (`presenceStatus`) stays on CONN.** It is a derived read of
  the interactives set (`PresenceLogic.statusOfImpl` :96–109 reads
  `getInteractives`/`getLastInputAt`, plus an `isEngaged` narrow) and it
  is what the `FromMixin('HasInteractiveMixin', …)` gate at
  `PresenceLogic.ts:40` names. Moving it would also move the sanctioned
  `no-restricted-imports` exception at `HasInteractive.ts:38` to a new
  file — a new exception by another name.
- **residency (`canEvict`) stays on CONN.** *A session holder is never
  culled; its lifecycle is connection teardown's* is true of `Login` and
  every body alike, and it reads nothing but the fact of composition.
- **identity (`getPortraitUrl`) stays on CONN.** Its inputs are the
  connection set's — the account behind the socket (`interactive.getUser()
  → googleProfileId`) — with a setting override read through `ShellApi`
  that tolerates a host without `Environment`. Its one caller is
  `enter()`; the only alternative host (`Avatar`) would strip it from the
  object the client's account menu (`AccountMenu.tsx:183`) was written to
  serve before embodiment. Recorded as *stays, for the connection's
  reason, not the client's*.
- **spatial (`refreshDisplays`) moves to `SaxonbergClientMixin`.** It
  exists to re-sync `cockpit.watch`, a key that mixin declares;
  `display.md § There is no DisplayApi` gives exactly that reason for its
  current home and the reason transfers with the key. `Mobile.ts:570,673`
  narrow with `isSaxonbergClient`.

**D8 — Cards are protocol; arrangements are ours.** `CardApi` /
`CardRegistry` / `CardLogic` and `Interactive.pushCard` /
`applyCardArrangement` (`platform/idea/Interactive.ts:288, 326`) stay
where they are: any client renders a pushed card. What is ours is *which
cards open in which mode* — `arrangementCards`, `SHIPPED_ARRANGEMENT_CARDS`,
and the login-time apply (`Avatar.ts:1074–1084`), which becomes
`SaxonbergClientMixin.openArrangement(interactive)`. `cockpit.watch` is
the confusing case and lands on our side: it is a `cockpit.*`
transient key rendered by our `StreamEmbed`; `Display.project` :345–355
and `clearWatch` :382–387 narrow the viewer with `isSaxonbergClient`, so
a viewer whose client cannot show an embed is simply not projected to —
failing closed and honestly, which is what a display should do.

**D9 — D6 of the requirements, answered: no intermediary rung; the
policy dissolves.** The six "body of record" overrides, re-examined
after D10 and D11 below:

| override | after this build |
|---|---|
| `getPlayerId` ×2 | gone — one field (D10) |
| `getIdentityPath` ×2 | gone — one implementation on the abstract root (D11) |
| `shouldPersist` ×2 | **stay**, out of scope by requirement; `WireBody`'s is the overlay build's |
| `startAutoSave` ×2 | **stay**, same |
| the reaping | `Shade.onDestruct` deleted as redundant; `WireBody.onLinkdead` is a genuine routing difference and stays |
| `announceSessionPresence` | `WireBody` only — a shade **is** announced; not a shared answer |

What survives as a shared answer is registration timing (neither vessel
registers at `postRegister`), and even that is not one policy: a shade
**takes** the registry slot, later, from the choreography; a wire body
never does. So the honest home is: the record body's own `postRegister`
registers and drives the spine (it is the only concrete class that
carries them — a capability of one class, not a rung); the abstract root
stamps context and installs the born-with floor; each vessel keeps only
what actually differs. The project's test applies cleanly — no guard
re-narrows any host set anywhere in the result.

*The losing case, fairly:* the slate's tree (`Avatar → <record> /
<stand-in> → Shade, WireBody`) reads well on the composition panel, has
the `Holder`/`Actor` precedent, and would give D10 a rung to point at.
It loses on two facts. First, after D10/D11 a stand-in rung would carry
exactly two members — `shouldPersist` and `startAutoSave` — and
`sandbox-overlay-plan.md` W3 deletes `WireBody`'s `shouldPersist` while
`Shade`'s stays: the two vessels **diverge on the rung's only content
within one build**, which is the `Movable` failure in a new costume.
Second, `Holder` and `Actor` name responsibilities with *composition*
behind them; a rung holding a boolean is an enum wearing a class.

**D10 — One `playerId`.** Declared on the abstract root's `fieldMeta` as
`playerId: { persistent: true, runtimeState: true }` — the same
declaration the two copies carry today, which is what lets the Hydrator
land it from a clone overlay before `postRegister`. Consequence to
name: the record body's `holder_snapshots` state now carries `playerId`
(it did not before). It is redundant with the identity path's tail and
the round-trip test asserts they agree. `shadeSpecies`/`wireSpecies`
are deleted as dead code (never assigned). Mint sites overlay
`playerId`; rows declare `playerId: ""`; the seven fixtures follow.

**D11 — One `getIdentityPath` on the abstract root:**
`return this.playerId ? Avatar.getTemplatePath(this.playerId) : super.getIdentityPath()`.
For the record body it equals the minted identity path by construction
(`PlayerLogic.ts:559`); for a guest (`playerId === ''`) it falls to the
guest's minted path exactly as today; for both vessels it is what their
overrides return. `Shade`'s mint keeps `asIdentityPath:
/platform/agent/Shade/<pid>` as its **template stamp** — this build does
not change what `findByTemplatePath` returns for a shade.

**D12 — The abstract root lives in `lib/`, the record body is the
twin.** CLAUDE.md § *Instanceable lives in platform/*: abstract roots go
to `lib/`, and *sharing the name is the DEFAULT*. So:
`lib/character/Avatar.ts` (abstract `Avatar`, imported as `AvatarBase`
by the twin) and `platform/agent/Avatar.ts` (`class Avatar extends
AvatarBase` — the record body). The seed row, the identity prefix, the
76 prefix sites and the 20 importers are untouched by the structural
wave; **every `instanceof Avatar` and every `Avatar` type annotation
that means the family switches to the abstract import** (list in W3),
because `instanceof <record body>` would silently exclude shades and
wire bodies. ⛔ The twin name is a **placeholder** — see § Naming.

**D13 — The identity namespace is the family's.** Whatever the record
body is finally called, `/platform/agent/Avatar/<playerId>` stays the
identity path prefix: class is lineage, identity path is identity, and
the namespace is named for the family root, which keeps the name
`Avatar`. The alternative (renaming the prefix with the record body)
means dropping every dev database and touching 76 sites for no product
gain; it is offered in § Naming as an explicit owner choice, default no.

**D14 — Estate fields move into `EstateMixin`** (`lib/chattel/Estate.ts`)
with their accessors and `fieldMeta`. Composing `EstateMixin` then
claims *this host's goods can escheat and pass to a beneficiary* — true
of its one composer and of nothing else. Bounded exactly as required:
two fields change host; `captureSlice`/`restoreSlice` (:174, :214) and
the shape of an estate entry are untouched.

**D15 — `enter()` decomposes into named steps on the abstract root**, in
the order they run today: `assertStartingLocation()`,
`armSession()` (autosave + casting affordance + beliefs),
`recordFirstArrival(loc)`, `buildWelcomePayload(interactive)`
(:969–1034 → one method returning `ConnectionEstablishedPayload`),
`sendWelcome(payload, firstArrival)`, `autoSenseOnArrival()` (existing),
`openArrangement(interactive)` (→ `SaxonbergClientMixin`, D8),
`markSessionStarted(interactive)` (:1092–1096). `enter()` becomes the
sequence and nothing else. No behaviour change; the guarded try/catch
around the arrangement moves with it.

**D16 — Names are proposed, not picked.** Waves W0–W5 build with the
current names plus the twin; W6 is the rename wave and is ⛔ blocked on
the owner. Nothing in W0–W5 renames a class.

---

## ⭐⭐ Host placement

| new / moved thing | host | what composing it claims — and about whom |
|---|---|---|
| `HasInteractiveMixin` (CONN: `interactives`, add/remove/has/clear, `isConnected`/`isLinkdead`, witness hooks, `canEvict`, `presenceStatus`, `getPortraitUrl`) | `Login`, abstract `Avatar`; ~30 test fixtures | *a human may be on the other side of this* and *connection teardown owns my lifetime*. Claims nothing about UI. `Login` is the proof it is not avatar plumbing. |
| `ClientStateMixin` (`_clientState`, `_transientClientState`, get/set/snapshot/push, the chain walk, the fork slice, the DI seam) | `Login`, abstract `Avatar` | *a client may persist keys on me and be pushed keys*. Declares no keys, so it claims no vocabulary. Bound: requires `HasInteractive` (push iterates the set). |
| `SaxonbergClientMixin` (fifteen schema entries, nine cockpit methods, `refreshDisplays`, `openArrangement`, `commandContributions: cockpit.yaml`) | `Login`, abstract `Avatar` | *our client renders this host*. Composing it on `Login` is what keeps its verb set identical; on the abstract root it is inherited identically by all three bodies, which is what mortality.md's *composition does not differ* requires. |
| abstract `Avatar` (`lib/character/Avatar.ts`): the thirteen-mixin composition, `playerId`, `user`, `isGuest`, `getIdentityPath`, `enter()` and its steps, `installDefaultLoadout`, `save`/`restore`/`startAutoSave`/`stopAutoSave`, `onDestruct`, `onLinkdead`, parking, the fork slices, `commandContributions`, `settings`, `subscribableFields`, the three path statics | nothing instances it | *a human's handle in the world, in some phase*. Everything a shade and a wire body must keep is here. |
| record body `platform/agent/Avatar.ts` (placeholder name): `postRegister` = stamp + register + spine choreography (:696–766 minus the context stamping), `reconcileMortalState`, `shouldPersist` (guest gate) | the seed row's `class:` | *the identity's body of record: it registers itself and writes the snapshot*. The only concrete class that carries the spine drive. |
| `Shade`: `postRegister` = `super` + `undead`; `shouldPersist`, `startAutoSave`, `getConferredMixinNames`, `mergeSlice_Embodiment`, `toString` | the Shade row | unchanged claims; five fewer members. |
| `WireBody`: `shouldPersist`, `startAutoSave`, `announceSessionPresence`, `onLinkdead`, `toString` | the WireBody row | unchanged claims; `postRegister` and the two identity overrides gone. |
| `playerId` field | abstract `Avatar` | *every body knows whose it is*, landable by overlay or context. |
| `escheatedAt`, `beneficiary` | `EstateMixin` | *an estate has a succession clock and an heir*. One composer; nothing else acquires the claim. |
| `refreshDisplays`, `cockpit.watch` | `SaxonbergClientMixin` | *a screen this host sees projects into this client*. A host without the mixin is not projected to. |

⭐ Nothing in this table needs a guard that re-narrows a host set. The
one place that used to (`postRegister` stripping `playerId` from context
on both vessels, :94 / :117) is gone because registration lives on the
one class that registers.

---

## Convention conformance (checked at plan time)

- **`props:` / `cast:`** — no rows gain either; the three body rows
  change only a `data:` key (`playerId`).
- **Locations, not rooms** — n/a.
- **`<root>/<branch>/`** — rows stay at `/platform/agent/…`; the
  abstract root moves to `lib/character/` (substrate) and the twin stays
  at `platform/agent/Avatar.ts` (instanceable). `lint:instanceable`
  invariant 3 accepts `export abstract class` but no row names the
  abstract; the seed row names the twin.
- **Module scope declares** — `ClientState.ts` carries the DI seam's
  module-level `let _pushImpl` and `setClientStateUpdatePush` with the
  **existing** `eslint-disable no-restricted-syntax` marker moved
  verbatim; `docs/architecture.md:387` (the registry line naming
  `lib/connection/HasInteractive.ts#setClientStateUpdatePush`) is
  updated to the new file. No new exception. The memoized schema
  `WeakMap` is a `const` declaration (allowed).
- **Import boundary (`lint:imports`)** — `SaxonbergClient.ts` imports
  `@saxonberg/types` and mud modules only; the `PresenceLogic` import and
  its `no-restricted-imports` marker stay in `HasInteractive.ts`.
- **No new module category, helper, collection, exemption** — none.
  Three new `lib/connection/` mixin files and one moved class file are
  all existing categories.
- **Verbs on objects** — every moved method stays an instance method.
- **Mixin names** — three entries in `Mixins`; `lint:mixin-names`
  refuses a kernel mixin missing from it.
- **Boundary lists** (`api/security.ts:814–895`) key on method names;
  `lint:boundary` re-run — no name changes.
- **Gates this build must satisfy:** `lint:family` in full, and
  specifically `lint:mixin-names`, `lint:instanceable` (invariant 12 for
  the renamed overlay key), `lint:field-meta`, `lint:module-scope`,
  `lint:imports`, `lint:boundary`, `lint:gates`, `lint:person-keys`,
  `lint:lib-statics` (the new files add static *fields*, not methods —
  the ratchet counts methods), `lint:test-bootstrap`, `lint:object-verbs`.

---

## Waves

### W0 — Pin what must not change

**Goal.** Tests that fail if any later wave changes an observable this
build promises to preserve. Written against the current code, green
before W1.

**Files.**
- `platform/idea/__tests__/Login.verbs.test.ts` — `CommandApi.collectContributions(Login, 'self')`
  equals the exact verb list today (`embody`, `play`, `cockpit` and its
  subtree). The requirement's invariant, as a test.
- `lib/connection/__tests__/HasInteractive.schema.test.ts` — the fifteen
  schema keys, by name, and which are `transient` (`cockpit.inputModes`,
  `cockpit.watch`, `cockpit.tuned`).
- `lib/persistence/__tests__/Forkable.census.test.ts` — an `Avatar`
  fixture's `collectForkSlices()` keys are exactly
  `Presentation, Embodiment, ClientState, Contacts, Alias, Environment`.
- Extend `platform/__tests__/Shade.composition.test.ts` and
  `api/__tests__/sandbox.crossing.test.ts` with one assertion each:
  `getIdentityPath()` of the vessel equals `Avatar.getTemplatePath(pid)`.

**Acceptance.** `pnpm test:near` green; `lint:family` green.
**Commit.** `build(avatar-family W0): pin the verb set, the schema, the fork census and the identity thread`

### W1 — `HasInteractive` becomes three mixins (D2–D8)

**Goal.** COCKPIT → CS → CONN as three files, acyclic, with `Login` and
`Avatar` composing the tower and every reader narrowed to the mixin it
actually needs.

**Files.**
- `lib/connection/HasInteractive.ts` — keep :1–60 imports pruned, the
  interface reduced to CONN members, `canEvict`, `interactives`,
  :785–812, `DEFAULT_PORTRAIT`/`getPortraitUrl`, `presenceStatus` and its
  resolver. Delete everything else. The docstring says what it is now
  and points at the other two.
- `lib/connection/ClientState.ts` (new) — `ClientStateSchemaEntry`,
  the DI seam (:62–83 verbatim, marker included), the interface
  (`getClientState`, `setClientState`, `snapshotClientState`,
  `pushClientStateUpdate`), `_clientState`/`_transientClientState`,
  `fieldMeta`, the chain walk `collectClientStateSchema(ctor)` (private,
  memoized), get/set/snapshot (:814–858, :1118–1132) reading the walked
  schema, `pushClientStateUpdate` (:1075–1080), `forkSlice_ClientState`
  / `mergeSlice_ClientState` (:739–751). `_mixinName = 'ClientStateMixin'`.
- `lib/connection/SaxonbergClient.ts` (new) — the fifteen schema
  entries (:278–681 verbatim), `commandContributions` (:695–699), the
  nine cockpit methods + `migratedLegacyLayout` (:860–1062),
  `refreshDisplays` (:757–783), `snapshotClientState` override (D4),
  `openArrangement(interactive)` (from `Avatar.ts:1074–1084`).
  `_mixinName = 'SaxonbergClientMixin'`. Interface `SaxonbergClient`.
- `lib/mixin.ts:262` — add `ClientState`, `SaxonbergClient`.
  `api/mixin.ts:1122` — add `isClientState`, `isSaxonbergClient`.
- `platform/agent/Avatar.ts:167` — `SaxonbergClientMixin(ClientStateMixin(HasInteractiveMixin(…)))`;
  `:1074–1084` → `this.openArrangement(interactive)`.
- `platform/idea/Login.ts:498` — same tower over `Idea`; fix the stale
  comment at :504–505.
- `backend/Application.ts:32` — import the seam from `ClientState`.
- `lib/command/CommandGiver.ts:687` — `MixinApi.isSaxonbergClient(giver)`.
- `lib/display/Display.ts:53, 140, 302–309, 323–330, 345, 382` —
  `SaxonbergClient` type + `isSaxonbergClient` narrow.
- `lib/spatial/Mobile.ts:570, 673` — `isSaxonbergClient`.
- Six shell controllers + `stream/{Watch,Tune}Controller.ts`,
  `social/NotifyController.ts:232`, `shell/SettingsController.ts:159` —
  import and narrow on the mixin each actually uses (`SaxonbergClient`
  for cockpit methods; `ClientState` where only get/set/push is used).
- `api/__tests__/cockpit-mode-gates-nothing.test.ts:73–88` — replace
  `lib/connection/HasInteractive.ts` and `platform/agent/Avatar.ts` with
  `lib/connection/SaxonbergClient.ts`. Two readers become one; the
  comment there asks for the sentence — *the mode's own mixin reads it to
  resolve a snapshot and open an arrangement; both are view questions*.
- The twelve test fixtures listed in Grounding compose the tower.
- `lib/connection/__tests__/ClientState.fork.test.ts` (new, D5).
- `docs/architecture.md:387, 1187` — registry line + the mixin table row
  become three rows.

**Acceptance.** W0's tests still green (the verb set, the schema, the
fork census); `ClientState.fork.test.ts` green in both halves;
`cockpit-mode-migration.test.ts` green unchanged in its assertions;
`test:near` + `lint:family` green; `grep -n "cockpit" lib/connection/HasInteractive.ts`
is empty; `grep -n "interactives" lib/connection/SaxonbergClient.ts` is
empty (no back-edge to CONN except through CS methods).
**Commit.** `build(avatar-family W1): HasInteractive is three mixins — the connection set, the client-state mechanism, SaxonbergClient`

### W2 — One `playerId`, one identity thread (D10, D11)

**Goal.** No field carried under three names; no getter overridden to
undo a copy; the two dead species slots gone.

**Files.**
- `platform/agent/Avatar.ts:302–308` — add `playerId: { persistent: true, runtimeState: true }`;
  `:655` becomes `public playerId = ""` (Hydrator reflects by name;
  accessors stay); add `getIdentityPath()` (D11); `postRegister` :699–701
  stamps from context only when given (an overlay-borne value must not
  be overwritten by an absent context key).
- `platform/agent/Shade.ts` — delete :52–72 (`shadePlayerId`, its
  `fieldMeta`, `shadeSpecies`), :77–86, :98–117 (`getPlayerId`,
  `getIdentityPath`), the `playerId: undefined` strip at :94 becomes a
  plain `super.postRegister(context)` **guarded by W3's registration
  move** — until W3 lands, keep the strip (the base still registers on
  `playerId`); `toString` reads `this.playerId`.
- `platform/agent/sandbox/WireBody.ts` — delete :48–70, :90–105,
  :124–133; same note on the strip; fix/delete the stale constructor
  comment.
- `platform/idea/api/ConditionLogic.ts:683` — `playerId: avatar.getPlayerId()`.
- `platform/idea/api/SandboxLogic.ts:352` — `playerId`.
- Rows: `Shade.yaml:15`, `sandbox/WireBody.yaml:9` — `playerId: ""`.
- Fixtures: the six `data: { wirePlayerId: '' }` sites and
  `Shade.composition.test.ts:68`.
- `lib/persistence/__tests__/persistence-spine.test.ts` (or a new
  `Avatar.playerId.roundtrip.test.ts` beside it): **the store proof** —
  a record body captured under its identity path, materialized into a
  fresh instance, reports the same `getPlayerId()` and
  `getIdentityPath()`; a shade and a wire body minted from it report
  the same two values; `PlayerApi.isAvatarStuff` is unchanged for all
  three.

**Acceptance.** `grep -rn "shadePlayerId\|wirePlayerId\|shadeSpecies\|wireSpecies" packages/` is empty;
`lint:instanceable` invariant 12 unchanged in count; `test:near` +
`lint:family` green.
**Commit.** `build(avatar-family W2): one playerId, one identity thread — the copies and their four overrides go`

### W3 — The abstract root and three concrete bodies (D9, D12, D13)

**Goal.** `Avatar` is abstract in `lib/`; the record body is its twin;
each vessel carries only what differs; `Shade.onDestruct` is gone.

**Files.**
- `lib/character/Avatar.ts` (new) — `export abstract class Avatar`
  holding everything in the Host-placement row for the abstract root.
  `postRegister` here: stamp `user`/`playerId`/`isGuest` from context,
  `await super.postRegister(context)`, `installDefaultLoadout()`.
- `platform/agent/Avatar.ts` — `import { Avatar as AvatarBase } from '../../lib/character/Avatar'`;
  `export default class Avatar extends AvatarBase` carrying
  `postRegister` (register iff `playerId`, then the spine choreography
  :720–759 with the loadout ordering exactly as today, then
  `rescheduleCalendarPing`), `reconcileMortalState`, `shouldPersist`.
  ⚠ The loadout runs in the abstract's `postRegister` for a vessel and
  in the record body's choreography for the record; the record body's
  override does **not** call the abstract's loadout line twice — write
  the abstract as `stampContext(context)` + `super.postRegister` and let
  the record body call `stampContext` itself, then its own sequence.
- `platform/agent/Shade.ts` — `postRegister` = `await super.postRegister(context); this.setLifecycleState('undead')`;
  delete `onDestruct` :170–177 (redundant; a test asserts destructing a
  shade still unregisters and detaches — `Shade.composition.test.ts`).
- `platform/agent/sandbox/WireBody.ts` — no `postRegister`. Drop
  `playerId` from the clone context at `SandboxLogic.ts:346` (it is
  overlay-borne; leaving it is harmless but says the wrong thing).
- Importers that mean the family switch to the abstract:
  `lib/command/validators/requiresAvatar.ts`,
  `platform/idea/cmd/author/EvalController.ts`,
  `platform/idea/api/TemplateLogic.ts`, the four cockpit controllers,
  `backend/inbound/clientState.ts`, `platform/idea/api/PresenceLogic.ts`
  (type), `PlayerLogic.ts` (type; the lazy import at :523 still targets
  the twin for `SEED_TEMPLATE_PATH` — those statics may live on either;
  put them on the abstract and re-export nothing), `ConditionLogic.ts`,
  `SandboxLogic.ts`, `Login.ts`, and the remainder of the 20
  (`grep -rln "agent/Avatar'" packages/server/src packages/content`).
  Rule: **`instanceof Avatar` always means the abstract.**
- `docs/subsystems/connection.md § The Cast`, `mortality.md § The
  shade` table (the identity row), `sandbox.md` (the vessel's identity
  field) — one-line updates each; the rest is W5.

**Acceptance.** `Shade.composition.test.ts`, the sandbox tests, the
crossing escape tests, `Avatar.test.ts` green; W0 pins green; a new
test that `new (class extends Avatar {})` is the only way to instance
the family (`lint:instanceable` covers rows; the test covers code);
`test:near` + `lint:family`.
**Commit.** `build(avatar-family W3): an abstract Avatar in lib/, the record body as its twin, each vessel keeping only what differs`

### W4 — The estate's state, and `enter()` in steps (D14, D15)

**Files.**
- `lib/chattel/Estate.ts:120` — `fieldMeta` gains the two entries;
  fields + four accessors move from `Avatar.ts:316–340`; the `Estate`
  interface gains the four methods.
- `lib/character/Avatar.ts` — `enter()` becomes the eight named steps.
- `lib/persistence/__tests__/`: a capture→materialize round trip of
  `escheatedAt`/`beneficiary` on the new host; `PlayerLogic`'s existing
  `touchEstate` tests unchanged.

**Acceptance.** `enter()` under 30 lines; every step private or
protected; the `@hook` on `announceSessionPresence` intact; `test:near`
+ `lint:family` (`lint:field-meta` for the `ref: 'identity'` entry).
**Commit.** `build(avatar-family W4): the estate holds its own state; enter() is a sequence of named steps`

### W5 — The seam sentence, the docs, the panel page, the drive

**Files.**
- `docs/subsystems/connection.md` — § *Client state* rewritten as three
  mixins; new § *What a second client implements* (the D1 sentence);
  § *The Cast* updated for the abstract root.
- `docs/subsystems/cockpit.md` — host is `SaxonbergClientMixin`; the
  login-time apply is `openArrangement`.
- `docs/subsystems/display.md § There is no DisplayApi` — the leftover's
  home line.
- `docs/subsystems/mortality.md`, `sandbox.md` — the shade/wire-body
  identity rows; `sandbox-overlay-plan.md:726–727` — add one line: *line
  numbers stale after avatar-family; grep `shouldPersist`*.
- `packages/content/wiki-starter/content/wiki/main/avatar.md` (new) —
  *the avatar family*, three `<composition kind="template" of=…/>`
  panels (the seed, the Shade row, the WireBody row). Content the
  drive reads; D10 of the requirements names the panel as the
  acceptance surface, and no page exists for any body today.
- `packages/wire/src/harness/session.ts` — `Session.openAtRoster(handle)`:
  `open` minus `enterWorld`, returning a session parked on the
  character-select layer with `cmd` working. Drive step 1 cannot be
  written without it.
- `packages/wire/tests/avatar-family.dirty.wire.test.ts` — § The drive.

**Acceptance.** The drive record appended below with the run's output;
`pnpm test` once, before the MR.
**Commit.** `drive(avatar-family): <what driving found>` (plus a
`docs(avatar-family): …` commit if the doc sweep stands alone).

### W6 — ⛔ NAMES PENDING — the rename wave (D16; requirements D2, D5)

Blocked until the owner chooses a set from § Naming. Then, mechanically:

- Record body: `platform/agent/Avatar.ts` → `platform/agent/<Record>.ts`;
  the seed row's `class:` (`Avatar/seed.yaml:22`); `PlayerLogic.ts:523`
  lazy import; the twin's own tests.
- `Shade` → `<Dead>` if renamed: file, row (`Shade.yaml:12` + path),
  `ConditionLogic.ts:678, 681` (the row path and the template stamp
  prefix `/platform/agent/Shade/`), `TemplatePaths` if one is added,
  `Shade.composition.test.ts`, mortality.md.
- `WireBody` → `<Circle>` if renamed: file, row path + `class:`,
  `SandboxLogic.ts:328, 345`, the six fixtures, `sandbox.md`,
  **`sandbox-overlay-plan.md` W3's file path**.
- `ShelledCharacter` → `<Shell>`: `lib/shell/ShelledCharacter.ts`,
  `Avatar` import, the 21 doc/comment mentions
  (`grep -rn ShelledCharacter docs packages`).
- The identity prefix: **unchanged** under D13 unless the owner takes
  the alternative, in which case `lib/paths.ts:163`,
  `lib/character/Estate.ts:24`, `PresenceLogic.rosterHandleFor`, and
  the 76 sites — and every dev DB is dropped.

**Commit.** `refactor(avatar-family): the family named on the <axis> axis`

---

## Reachability wiring

This build adds no capability, so the five links are checked for what
**moves**:

| link | what moves | fails closed how | check |
|---|---|---|---|
| verb | `cockpit` and its subtree ride `SaxonbergClientMixin.commandContributions` | a host composing only CONN/CS silently loses `cockpit` | W0's `Login.verbs.test.ts`; drive step 1 |
| affordance | none — the six controllers are unchanged; `openArrangement` is called from `enter()` | a body that did not compose the client mixin would throw inside the guarded try (logged, not fatal) | drive step 3 |
| data | rows' overlay key `playerId` | a key no field declares is discarded silently (invariant 12) | W2's round trip; `lint:instanceable` |
| boot | none | — | — |
| arg gate | none — no `requires:` names the new mixins | — | `lint:arg-kinds` unchanged |
| fork slice | `forkSlice_ClientState` on `ClientStateMixin` | prefix reflection finds nothing and says nothing | `ClientState.fork.test.ts` both halves; drive step 4 |

---

## Acceptance-criteria coverage

| requirement | wave | proof |
|---|---|---|
| character-select affords exactly what it did | W1 (D6) | W0 verb test; drive 1 |
| a new player still arrives with their loadout | W3 | drive 2; `Avatar.test.ts` |
| a cockpit arrangement survives logout and a circle round trip | W1 (D3–D5) | drive 3, 4 (fork direction — see Grounding) |
| the same person from all three bodies; money follows | W2, W3 | W2 store round trip; drive 5, 6 |
| a shade lost and kept exactly the verbs it did | W3 (composition unchanged) | drive 7; `embodied-tagging.test.ts` |
| the panel shows three bodies of one family | W3, W5 | drive 9 |
| what a third-party client implements, in one sentence | W1, W5 | connection.md; drive 10 |
| no name carried by more than one field | W2 | the grep in W2's acceptance |

Nothing in the requirements' acceptance list is unmapped.

---

## Test & gate strategy

- **Unit:** W0's four pins; `ClientState.fork.test.ts` (D5);
  the W2 store round trip (D10 — *proved through the store*, as the
  requirement demands); the W3 shade-destruct test; the W4 estate round
  trip. Existing suites touched: the twelve tower fixtures, the seven
  overlay-key fixtures, `Avatar.test.ts`, `Shade.composition.test.ts`.
- **Only the drive can prove:** step 1 (the roster layer's verb set on a
  live socket), step 4 (the fork through a real crossing), steps 5–7
  (death through the real choreography), step 9 (the rendered panel).
- **Gates:** `pnpm -C packages/server lint:family` after every wave;
  the specific ones in § Convention conformance.
- ⚠ `pnpm test` exactly twice: before the MR opens (after W5) and at
  `/finalize`. Everything between is `test:near` + `lint:family`.

---

## The drive — `packages/wire/tests/avatar-family.dirty.wire.test.ts`

`.dirty.`: it leaves a corpse, a dead player and a used circle.
Two sessions: **Ada** (`Session.embody`) and **Fen**
(`Session.open('founder', { wizard: true })`; the wire suite needs
`FOUNDER_*` — see `docs/testing.md`). ⚠ `WIRE_PORT` is per worktree.

| step | how the harness does it | asserts |
|---|---|---|
| 1 Login invariant | `Session.openAtRoster(ada)` (W5 harness addition); send `look`, `cockpit`, `embody`, `play` | `look` → the unknown-command refusal; `cockpit` → a report (not unknown); `embody`/`play` answered. **Did not change.** |
| 2 Loadout | `Session.embody(ada)`; `query('me:i', {fields:['displayName']})` | rows include the aether implant |
| 3 Arrangement survives logout | `cockpit mode build`, `cockpit layout save mine`, `cockpit layout mine`; `close()`; `Session.open(ada)`; `cockpit` | report shows `mode build` and `layout mine` |
| 4 Fork through the door (corrected — see Grounding) | `cockpit shelf pin coin` outside; walk to the dorm (or Fen `goto`s Ada); `go wardrobe`; `cockpit shelf list` inside; `cockpit shelf unpin coin` inside; `go out`; `cockpit shelf list` | pinned inside (the fork fired); still pinned outside (fork-only, unchanged) |
| 5 Same person, three bodies | `chronicle` self-read outside, inside the circle, and as a shade | the first-arrival deed reads back from all three (identity-keyed, derive-on-read) |
| 6 Money follows | `bank open`; `bank deposit coins`; note the balance; die; `passage`; `bank` | the balance is hers |
| 7 Shade verbs | as a shade: `take`/`get` refused (`requiresEmbodied`), `say` ok, `who` lists her, `passage` afforded; after `passage`, `passage` is unknown | matches the list W0 pins from `embodied-tagging.test.ts` |
| 8 Estate clock | ⚠ cannot wait `estate.dormantAfterDays` in a run. Equivalent: `wallet beneficiary <fen>` → `close()` → `open` → `wallet` shows the beneficiary; Fen `config estate.escheatAfterDays` unchanged. The clock itself is `PlayerLogic`'s unit tests. | the two fields round-trip on their new host |
| 9 The panel | `wiki avatar` | three panels; the mixin lists are **identical**; each names the family root in its class line |
| 10 On paper | `connection.md § What a second client implements` exists | the sentence names CONN + CS and no `cockpit.*` key |

⚠ **How Ada dies is a build-time check.** The harness has no kill verb.
In order of preference: (a) Fen's `eval --on <ada>` calling
`ConditionApi.die` if the eval sandbox exposes `ConditionApi`
(`envelope.dirty.wire.test.ts:91` says only four Apis are exposed —
verify at `lib/shell/Author.ts` / `EvalScript`); (b) a hazard in reach
of the dorm; (c) `attack sentry --lethal` and lose (the identity drive's
pattern, unreliable). The drive record must say which ran. If none is
reachable, steps 5–7 are proven by the W2/W3 unit round trips and the
step is recorded as *not driveable on the wire*, not skipped silently.

---

## Risks & opens

1. **Requirements drive step 4 vs reality** — resolved as the fork
   direction (Grounding). The owner should register it.
2. **`playerId` becomes persistent on the record body.** Existing dev
   snapshots lack it; they hydrate `''` and `postRegister` stamps it from
   context on the next login, so no DB drop is needed. The W2 test
   asserts the stored value equals the identity path's tail.
3. **`instanceof Avatar` must always mean the abstract.** A site left
   on the twin excludes shades and wire bodies silently. W3's list is
   the grep; `requiresAvatar` is the one that would bite first.
4. **The mixin tower's type surface.** Bounds, never nesting
   (mixins.md). Controllers typed `Stuff & HasInteractive` today become
   `Stuff & SaxonbergClient`; TypeScript will find every one.
5. **Sibling plan collision.** `sandbox-overlay-plan.md` (unbuilt, same
   branch) owns `WireBody.shouldPersist()`, `holder_snapshots.yaml`,
   `PersistableLogic.assertUniqueKey`, `SandboxLogic.exitImpl`. This
   build touches `WireBody.ts` and `SandboxLogic.ts:344–357` and nothing
   else of that list; its line references go stale and W5 says so in
   that plan.
6. **Two live objects at one identity path** (parked body + wire body)
   is pre-existing and unchanged; the shade keeps its own template stamp
   (D11) so nothing new collides.
7. **The naming decision** (§ Naming) is the only open the build must
   stop for, and it is fenced into W6 so W0–W5 do not wait on it.
8. **Killing Ada on the wire** — see the drive.

---

## ✅ Naming — DECIDED 2026-09-30 (requirements D2, D5)

> **The owner chose the PHASE set, and replaced `Typist` with `Shell`.**
>
> ```
> Character  →  Shell  →  Avatar  →  Incarnation   (the record body)
>                                 →  Shade         (the dead body)
>                                 →  Understudy    (the circle body)
> ```
>
> - **`Avatar`** — abstract root; a human's handle in the world. Keeps
>   the name because the identity namespace `/platform/agent/Avatar/`
>   stays the family's (D13).
> - **`Incarnation`** — the record body. ⭐ Permanence falls out of the
>   phase rather than being asserted: an incarnation is by nature the one
>   that lasts.
> - **`Shade`** — unchanged, keeping its shipped name and all its prose
>   in `mortality.md` and `passage.yaml`.
> - **`Understudy`** — the circle body. Says *rehearsing in someone's
>   workshop* more precisely than *wire* or *circle* does.
> - **`Shell`** — the command-line rung (was `ShelledCharacter`). ⭐ *A
>   `Shell` is a Character with a command line; an `Avatar` is a `Shell`
>   with a human driving it.* Lands in `lib/shell/` beside `Alias`,
>   `Workspace`, `Environment` and `Focused`, and the codebase already
>   uses *shell* for exactly this sense (`shell` command category,
>   `shell.result`, `shell.parser`).
>
> **Why the phase set:** it is the only one of the three where all three
> concrete names answer the **same question** — *what part of play is
> this?* That is the property `Movable` and `Animate` lacked, which is
> why they read as category errors rather than as poor word choices.
>
> ⚠ **The one cost, recorded:** *shelled* can mean husked, so a reader
> might hear "empty vessel" — which is `Shade`'s territory. The
> computing sense is judged to win overwhelmingly in this codebase's
> context. If a reviewer hears the other one first, that is the reason
> to revisit.
>
> **Rejected, with reasons:** `Typist` (describes the human, not the
> class) · `Console` (clashes with SaxonbergClient's own keyspace —
> `console.tabs`, `console.routing`, `console.activeTab`) · `Terminal`
> (reads against `TpaTerminal`) · `Pilot` (*driving* is
> `HasInteractive`'s notion, one rung up) · `Scribe` (reads as a
> **vocation**, and vocations are Cast rows — the exact confusion the
> Extra audit is about) · `Steward` (does not say command line) ·
> `Operant` (adjective-shaped; banned by the class-naming convention).
>
> ⭐ **W6 is unblocked.** The sets below are kept as the record of what
> was weighed.

## The three sets as offered (superseded by the decision above)

What each class is responsible for, after W3:

- **the family root** — a human's handle in the world; every mixin,
  every verb, the identity thread, the session ceremony. Abstract.
- **the record body** — registers itself, writes the snapshot, is what
  the estate escheats. The one that lasts.
- **the dead body** — incorporeal, borrows the identity, takes the
  registry slot from the choreography, persists nothing, ends at
  `passage`.
- **the circle body** — corporeal, borrows the identity, never
  registered, silent to presence, routes its link events to the sandbox,
  ends at the door.
- **the shell rung** — *you have a full command line an NPC would not*:
  aliases, settings, focus, a workspace, authoring.

Constraints on any name: not an adjective (`-able`/`-ible`/`-ate` read
as mixin or interface — CLAUDE.md), not already a class (`Vessel`,
`Proxy`, `Character`, `Player` retired), and under D13 the identity
namespace stays `/platform/agent/Avatar/` whatever the record body is
called, so the root should keep `Avatar`.

| axis | root | record | dead | circle | shell rung | notes |
|---|---|---|---|---|---|---|
| **phase of play** — living / dead / rehearsing | `Avatar` | `Incarnation` | `Shade` | `Understudy` | `Typist` | permanence falls out (an incarnation is the one that lasts). `Shade` keeps its shipped name and prose. `Understudy` says *rehearsing in someone's workshop* better than *circle*. |
| **permanence** — the axis the code branches on | `Avatar` | `Mortal` | `Shade` | `Puppet` | `Operator` | `Mortal` names the body that can die and is written down; `Puppet` is the WireBody row's own word (*"the puppet a player wears"*). ⚠ `Operator` collides with the platform-operator sense in deployment docs. |
| **agency** — what you can do from it | `Avatar` | `Body` | `Ghost` | `Effigy` | `Console` | the plainest words; ⚠ `Body` is close to `body`/`PlayerBody` in `ConditionLogic` and `Ghost` retires the shipped `Shade` vocabulary across mortality.md and `passage.yaml` prose. |

Recommendation withheld by design; one observation the owner asked
for: the **phase** set is the only one where all three concrete names
answer the same question (*what part of play is this*), which is the
property `Movable`/`Animate` lacked.

---

## Deferred seams

- **Merge-back of shell state at exit and reembody** (drive step 4's
  literal wording) — `avatar-family-slate § Sequencing 6`; attach point
  `SandboxLogic.ts:90` and `ConditionLogic.reembodyImpl`.
- **The capture allowlist replacing `shouldPersist()`** — slate
  Sequencing 5; the two remaining no-op `startAutoSave` overrides die
  with it.
- **Record-only mixins** (`Calendar`, `Wardrobe`, `Estate`, `PartyMember`,
  `SubjectSubscriber`, `NotifyPolicy` inert on a vessel) — forbidden
  here by *composition does not differ*; the slate's § *Where the
  Avatar-only mixins fall out* keeps the argument.
- **`SaxonbergClient` as a pack** — needs a sixth namespace axis (D1).
- **`Login` as `CommandGiverMixin(Idea)` without the Agent branch** —
  requirements non-goal; nothing here moves it.

---

## Critical files

Read first, in this order:

1. `docs/requirements/avatar-family-requirements.md`; the slate's
   § *Measured 2026-09-30* and § *The four vessels*.
2. `packages/server/src/mud/lib/connection/HasInteractive.ts` (all of it).
3. `packages/server/src/mud/platform/agent/Avatar.ts` :163–204, :302–340,
   :655–766, :901–1139, :1442–1518, :1575–1644.
4. `platform/agent/Shade.ts`, `platform/agent/sandbox/WireBody.ts`,
   `platform/idea/Login.ts:498–531`, `lib/shell/ShelledCharacter.ts`.
5. `lib/persistence/Forkable.ts:39–52`; `platform/idea/api/SandboxLogic.ts:90, 328–470`;
   `platform/idea/api/ConditionLogic.ts:660–800`; `platform/idea/api/PlayerLogic.ts:130–200, 545–566`.
6. `lib/command/CommandGiver.ts:670–700`; `lib/display/Display.ts:290–390`;
   `lib/spatial/Mobile.ts:560–580, 665–680`.
7. `api/__tests__/cockpit-mode-gates-nothing.test.ts:55–90`;
   `lib/connection/__tests__/cockpit-mode-migration.test.ts`.
8. `lib/shell/Environment.ts:157–186` (the schema-walk shape to copy).
9. `docs/subsystems/mixins.md § Prefer the bound over NESTING`;
   `docs/plans/sandbox-overlay-plan.md § W3`.
10. `packages/wire/src/harness/session.ts:218–330`;
    `packages/wire/tests/identity.dirty.wire.test.ts:200–230`.

---

## Drive record

*(appended at build time)*
