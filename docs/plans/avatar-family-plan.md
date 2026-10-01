# The Avatar family — implementation plan

Executes [avatar-family-requirements](../requirements/avatar-family-requirements.md).
**Kind:** refactor/sweep. **Lead end:** kernel — the first consumers are
the three shipped bodies (`Avatar`, `ShadeAvatar`, `SandboxAvatar`) and `Login`.
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
- `platform/agent/ShadeAvatar.ts` (182 lines): `shadePlayerId` :60 with
  `fieldMeta` :62–64; `shadeSpecies` :72 — ⚠ **dead**: `private`, not in
  `fieldMeta`, never assigned (no constructor), so `postRegister`'s
  `if (this.shadeSpecies)` :77 never fires. `postRegister` :74–96 strips
  `playerId` from context then sets `undead`. Overrides `shouldPersist`
  :99, `startAutoSave` :104, `getPlayerId` :108, `getIdentityPath`
  :113–117, `mergeSlice_Embodiment` :144, `onDestruct` :170–177 — ⚠
  **redundant**: repeats `stopAutoSave`/`unregister`/`detach` then calls
  `super.onDestruct()`, which does the same three (and the save/belief
  flush) itself. `getConferredMixinNames` :135 → `['AetherMixin']`.
- `platform/agent/sandbox/SandboxAvatar.ts` (170 lines): `wirePlayerId` :54,
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
  `/platform/agent/ShadeAvatar` with `asIdentityPath: /platform/agent/ShadeAvatar/<pid>`
  and `dataOverlay.shadePlayerId`; registration happens later at :728
  (`PlayerApi.registerAvatar(shade)`), after the drained body is
  destructed :726. `SandboxLogic.ts:344–357` clones
  `/platform/agent/sandbox/SandboxAvatar` with context `{ playerId, wire: true }`
  and `dataOverlay.wirePlayerId`. `PlayerLogic.ts:555–566` clones the
  **seed row** `Avatar.SEED_TEMPLATE_PATH` with context `{ user, playerId }`
  and `asIdentityPath`; **the row's `class:` decides the concrete class.**
- **Rows:** `content/platform/content/platform/agent/{Avatar/seed,ShadeAvatar,sandbox/SandboxAvatar}.yaml`.
  The two vessel rows carry `data: { shadePlayerId: "" }` /
  `data: { wirePlayerId: "" }` so the overlay key is declared
  (`lint:instanceable` invariant 12). Six unit tests seed the SandboxAvatar
  row with `data: { wirePlayerId: '' }` (`api/__tests__/sandbox.{crossing,wardrobe,guests,go-wardrobe}.test.ts`,
  `lib/sandbox/__tests__/escape/{crossing.escape,round-trip}.test.ts`,
  `lib/behavior/__tests__/crossing-ritual.test.ts`);
  `platform/__tests__/ShadeAvatar.composition.test.ts:68` sets `shadePlayerId`.
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
| `shouldPersist` ×2 | **stay**, out of scope by requirement; `SandboxAvatar`'s is the overlay build's |
| `startAutoSave` ×2 | **stay**, same |
| the reaping | `ShadeAvatar.onDestruct` deleted as redundant; `SandboxAvatar.onLinkdead` is a genuine routing difference and stays |
| `announceSessionPresence` | `SandboxAvatar` only — a shade **is** announced; not a shared answer |

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
<stand-in> → ShadeAvatar, SandboxAvatar`) reads well on the composition panel, has
the `Holder`/`Actor` precedent, and would give D10 a rung to point at.
It loses on two facts. First, after D10/D11 a stand-in rung would carry
exactly two members — `shouldPersist` and `startAutoSave` — and
`sandbox-overlay-plan.md` W3 deletes `SandboxAvatar`'s `shouldPersist` while
`ShadeAvatar`'s stays: the two vessels **diverge on the rung's only content
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
overrides return. `ShadeAvatar`'s mint keeps `asIdentityPath:
/platform/agent/ShadeAvatar/<pid>` as its **template stamp** — this build does
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
| `ShadeAvatar`: `postRegister` = `super` + `undead`; `shouldPersist`, `startAutoSave`, `getConferredMixinNames`, `mergeSlice_Embodiment`, `toString` | the ShadeAvatar row | unchanged claims; five fewer members. |
| `SandboxAvatar`: `shouldPersist`, `startAutoSave`, `announceSessionPresence`, `onLinkdead`, `toString` | the SandboxAvatar row | unchanged claims; `postRegister` and the two identity overrides gone. |
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

### ✅ W0 — Pin what must not change — DONE (`dafc87df0`)

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
- Extend `platform/__tests__/ShadeAvatar.composition.test.ts` and
  `api/__tests__/sandbox.crossing.test.ts` with one assertion each:
  `getIdentityPath()` of the vessel equals `Avatar.getTemplatePath(pid)`.

**Acceptance.** `pnpm test:near` green; `lint:family` green.
**Commit.** `build(avatar-family W0): pin the verb set, the schema, the fork census and the identity thread`

> **Note for the reader who has forgotten.** Three pins written, not
> four: the two vessel identity-thread assertions already existed
> (`ShadeAvatar.composition.test.ts:90`, `sandbox.crossing.test.ts:155,328`).
>
> ⚠ **The grounding was wrong about the fork census.** It named six
> slices; there are **ten** — `Vitals`, `Anatomy`, `Trauma` and
> `CauseOfDeath` ride in from the body mixins. Measured, not recalled,
> and the test records the measured set. It is also the right answer:
> a circle body forks a whole body state, which is what *"you can act
> fully inside"* means in the code.
>
> Also fixed a pre-existing `lint:test-bootstrap` failure inherited
> from the overlay fix (!308).

### ✅ W1 — `HasInteractive` becomes three mixins (D2–D8) — DONE (`3c98aa850`)

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

> **Note for the reader who has forgotten.** 1,168 → 204 lines on
> `HasInteractive.ts`; `ClientState.ts` and `SaxonbergClient.ts` are
> new. The back-edge is gone (D4 as planned: override + `super`), the
> schema is a memoized chain walk (D3), the fork slice moved with a
> test on BOTH halves (D5), `Login` composes the tower (D6), and the
> two cockpit-mode readers became one.
>
> **Three things the plan did not decide, decided here:**
>
> 1. ⭐ **The interfaces extend downward** — `SaxonbergClient extends
>    ClientState extends HasInteractive`. Not cosmetic: without it
>    `MixinApi.isSaxonbergClient` narrowed to a type with no
>    `getClientState`, so every controller would have declared three
>    host types instead of one. It is also simply true — our
>    vocabulary needs the mechanism that stores it, and the mechanism
>    needs the connection set it pushes down.
> 2. ⚠ **The type bound does not thread `this`.** A class-factory
>    mixin's `this` does **not** carry the base's members through
>    `TBase extends MixinConstructor<X>` — TS resolves `extends Base`
>    for a generic `Base` without them. (Verified with a minimal
>    probe; it is not a mistake in our composition.) The repo has two
>    answers: an explicit `this:` parameter (`Postured.ts`) and a
>    local cast. `SaxonbergClient.ts` uses a local
>    `const self = this as unknown as ClientHost`, because the
>    legacy-layout migration needs the RAW stores — a distinction
>    `getClientState` deliberately collapses — and no interface
>    exposes a field (correctly: the inter-Stuff contract is methods).
> 3. **`card-birth-path`'s census** moves the arrangement mint site
>    from `Avatar.ts` to `SaxonbergClient.ts`. A pushed card is
>    protocol any client renders; *which* cards an arrangement opens
>    is one client's answer.
>
> **Surprises:** none in the coupling — the survey's COCKPIT → CS →
> CONN with one back-edge held exactly. The only unplanned work was
> the three TypeScript facts above, all found by `tsc` rather than at
> runtime, which is the split being mechanically checkable.

### ✅ W2 — One `playerId`, one identity thread (D10, D11) — DONE

**Goal.** No field carried under three names; no getter overridden to
undo a copy; the two dead species slots gone.

**Files.**
- `platform/agent/Avatar.ts:302–308` — add `playerId: { persistent: true, runtimeState: true }`;
  `:655` becomes `public playerId = ""` (Hydrator reflects by name;
  accessors stay); add `getIdentityPath()` (D11); `postRegister` :699–701
  stamps from context only when given (an overlay-borne value must not
  be overwritten by an absent context key).
- `platform/agent/ShadeAvatar.ts` — delete :52–72 (`shadePlayerId`, its
  `fieldMeta`, `shadeSpecies`), :77–86, :98–117 (`getPlayerId`,
  `getIdentityPath`), the `playerId: undefined` strip at :94 becomes a
  plain `super.postRegister(context)` **guarded by W3's registration
  move** — until W3 lands, keep the strip (the base still registers on
  `playerId`); `toString` reads `this.playerId`.
- `platform/agent/sandbox/SandboxAvatar.ts` — delete :48–70, :90–105,
  :124–133; same note on the strip; fix/delete the stale constructor
  comment.
- `platform/idea/api/ConditionLogic.ts:683` — `playerId: avatar.getPlayerId()`.
- `platform/idea/api/SandboxLogic.ts:352` — `playerId`.
- Rows: `ShadeAvatar.yaml:15`, `sandbox/SandboxAvatar.yaml:9` — `playerId: ""`.
- Fixtures: the six `data: { wirePlayerId: '' }` sites and
  `ShadeAvatar.composition.test.ts:68`.
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

> **Note for the reader who has forgotten.** The two private copies,
> the two dead species slots and the four overrides are gone;
> `getIdentityPath()` is one implementation on `Avatar`. Rows and the
> seven fixtures carry `playerId`.
>
> ⚠⚠ **A real regression, caught by the new round-trip test, and the
> most important thing in this wave.** Both vessels suppressed
> registration by stripping `playerId` from the CONTEXT. That worked
> only while each carried its own private copy — the base genuinely
> saw an empty `playerId`. **With one field the strip suppresses
> nothing**, and a shade claimed the `PlayerApi` slot of the body
> still being drained. Nothing else in the suite would have said so.
>
> Bridged with `Avatar.claimsRegistrySlot()` — a protected predicate,
> `false` on both vessels, **⛔ explicitly marked as scaffolding that
> W3 deletes.** It is a boolean the subclasses flip, which D9 calls
> *an enum wearing a method*; it exists only because `playerId` became
> one field one wave before registration moved off the shared base.
> ⭐ **W3 must delete it** — if it survives, the wave did not do its
> job.
>
> ⭐ **A second, benign behaviour change worth knowing.** The
> persistence spine now resolves its key from `playerId` instead of
> depending on a template stamp having landed first. Production is
> unaffected (`PlayerLogic` always mints `asIdentityPath` before
> register), but six sandbox fixtures stamped the path *after*
> `StuffApi.create`, so the spine now engages where it used to no-op.
> They wire `Document.setMarshallerResolver` the way a booted world
> does. The new behaviour is the better one: the spine key is the
> identity, and the identity is the playerId.
>
> Also: `lint:instanceable` invariant 12 briefly read 404/402 —
> **not** a real orphan. `fieldMetaEntries` tolerates a `//` comment
> before a key but not a JSDoc block, and I had put one there. The
> note moved above the static rather than the gate being weakened.

### ✅ W3 — The abstract root and three concrete bodies (D9, D12, D13) — DONE

**Goal.** `Avatar` is abstract in `lib/`; the record body is its twin;
each vessel carries only what differs; `ShadeAvatar.onDestruct` is gone.

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
- `platform/agent/ShadeAvatar.ts` — `postRegister` = `await super.postRegister(context); this.setLifecycleState('undead')`;
  delete `onDestruct` :170–177 (redundant; a test asserts destructing a
  shade still unregisters and detaches — `ShadeAvatar.composition.test.ts`).
- `platform/agent/sandbox/SandboxAvatar.ts` — no `postRegister`. Drop
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

**Acceptance.** `ShadeAvatar.composition.test.ts`, the sandbox tests, the
crossing escape tests, `Avatar.test.ts` green; W0 pins green; a new
test that `new (class extends Avatar {})` is the only way to instance
the family (`lint:instanceable` covers rows; the test covers code);
`test:near` + `lint:family`.
**Commit.** `build(avatar-family W3): an abstract Avatar in lib/, the record body as its twin, each vessel keeping only what differs`

> **Note for the reader who has forgotten.** `lib/character/Avatar.ts`
> is the abstract root (everything true of every body); the record
> body at `platform/agent/Avatar.ts` is ~190 lines holding exactly two
> capabilities — **it claims the registry slot** and **it drives the
> spine**. 49 importers switched to the abstract by one rule: a site
> that means *the family* takes the abstract, and only `new Avatar()`
> needs the concrete.
>
> ⭐ **The W2 scaffolding is deleted, and the deletion is the point.**
> `claimsRegistrySlot` is gone, and so is the *reason* for it: with
> registration on the one class that registers, neither vessel has
> anything to say no to. `ShadeAvatar.postRegister` is now two lines that
> say only *a shade is undead*, and `SandboxAvatar` has no `postRegister`
> at all. The context strip — `{ ...context, playerId: undefined }` —
> is gone from both. ⭐ That is the shape D9 was arguing for: not an
> override that refuses, but nothing to inherit.
>
> **One seam the plan did not name: `chainPostRegister()`.** The
> record body cannot call `super.postRegister()`, because the
> abstract's own sequence is the VESSEL one (stamp, floor, chain,
> calendar) and would install the born-with floor a second time
> **before** materialize — which is the `slot 'cranial' is full`
> collision that bricks every relog-after-restart. So the abstract
> exposes a named protected seam to the framework's `PostRegistration`
> chain, and the record body reaches it on its own terms. One
> sentence, one method, no boolean.
>
> `ShadeAvatar.onDestruct` deleted: six lines that stopped the autosave,
> unregistered and detached, then called `super`, which does those
> same three itself. `ShadeAvatar.composition.test.ts` now proves the
> reaping still happens with no shade-specific code doing it.
>
> `SandboxLogic` no longer passes `playerId` in the clone CONTEXT —
> harmless, but it read as *this body is registered under the player*,
> and a vessel never is.
>
> New: `lib/character/__tests__/Avatar.family.test.ts` — all three
> bodies are Avatars, composition does not differ, only the record
> body declares `postRegister`, and ⛔ a guard that fails if
> `claimsRegistrySlot` ever comes back.

### ✅ W4 — The estate's state, and `enter()` in steps (D14, D15) — DONE

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

> **Note for the reader who has forgotten.** `enter()` is twelve lines
> of sequence over eight named steps; the order (welcome → auto-sense
> → arrangement) is now the readable part instead of being buried in
> 190.
>
> ⚠⚠ **D14 was wrong about the mechanism, and the round-trip test
> caught it on the first run.** `captureState` runs a layer's
> `captureSlice` **or** its declared `fieldMeta` — **never both**. So
> moving `escheatedAt` / `beneficiary` into `EstateMixin.fieldMeta`
> made them visible to `getAllPersistentFields`, visible in every
> getter, and **silently never written**. A getter check would have
> passed.
>
> They ride the **slice** instead, which is where the estate's durable
> form already lives. `EstateMixin.fieldMeta` stays `{}` — and now has
> a comment saying why that is not an oversight. The test asserts the
> counter-intuitive thing directly (`not.toContain('escheatedAt')` in
> the declared fields), so a future "fix" that re-declares them fails
> instead of silently un-persisting them.
>
> ⭐ **This is worth generalising and is NOT fixed here:** any mixin
> with a `captureSlice` silently drops its own `fieldMeta`. Today only
> `Container`, `Slotted` and `Estate` have slices and none of the
> other two declares fields, so nothing else is broken — but the next
> author to declare a field beside a slice gets no warning at all.
> ⭐ Census-then-ratchet shape; left as a finding for `lint-family`.

### ✅ W5 — The seam sentence, the docs, the panel page, the drive — DONE

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
  panels (the seed, the ShadeAvatar row, the SandboxAvatar row). Content the
  drive reads; D10 of the requirements names the panel as the
  acceptance surface, and no page exists for any body today.
- `packages/wire/src/harness/session.ts` — `Session.openAtRoster(handle)`:
  `open` minus `enterWorld`, returning a session parked on the
  character-select layer with `cmd` working. Drive step 1 cannot be
  written without it.
- `packages/wire/tests/avatar-family.dirty.wire.test.ts` — § The drive.

**Acceptance.** The drive record appended below with the run's output;
`pnpm test` once, before the MR.

> **Note for the reader who has forgotten.** `connection.md` carries
> the D1 seam sentence in its own § *What a second client implements*,
> and § *Client state* is rewritten as three mixins with the chain
> walk and the throws-on-unknown-key warning. `architecture.md` has
> the family table and the hierarchy diagram down to the three bodies.
> `sandbox.md` has the **sandbox · circle · wire** vocabulary table
> and why `WireBody` was renamed. `mortality.md` carries the
> ghost-pack constraint (below). `cockpit.md`, `display.md` and
> `state-model.md` have one-line host corrections.
>
> ⭐⭐ **`mortality.md` now records the measured truth about a
> shade:** its deeds DO persist (so `Canon` was a false name), and
> *"cannot advance"* has **no mechanism at all** — `AdvancementMixin`
> holds no host state, Competence is derive-on-read, the Transcript is
> identity-keyed. It is an absence, not a refusal. That must become a
> declared, liftable property before an underworld pack can be
> designed, for the same reason the retired verb conferral taught:
> **the refusal must exist in order to be lifted.** Filed, not built.
>
> New: `wiki-starter`'s `avatar.md` — the two-axis table in a
> player's words, and three `<composition>` panels the drive reads.
> New: `Session.openAtRoster` + `Session.play`, without which drive
> step 1 cannot be written at all.
>
> ⚠ **One sweep item deliberately left for `/finalize`:** CLAUDE.md
> § *Instanceable lives in platform/* says *"Three are real renames
> because they are real concepts"* and there are now **four** —
> `PrimaryAvatar` joins `Corpse`, `Extra` and `Cast`. CLAUDE.md is a
> SWEPT index file (§ Worktrees rule 5), so the line is the sweep's,
> not a build's.
**Commit.** `drive(avatar-family): <what driving found>` (plus a
`docs(avatar-family): …` commit if the doc sweep stands alone).

### ✅ W6 — the rename wave — DONE (`e8e932378`)

Done. The owner settled the set (§ Naming); the rename was mechanical
and landed in a commit that changes no behaviour.

> **Note for the reader who has forgotten.**
> `platform/agent/Avatar → PrimaryAvatar`, `Shade → ShadeAvatar`,
> `WireBody → SandboxAvatar`; the two vessel rows and the seed row's
> `class:` follow. The abstract root KEEPS the name `Avatar` and the
> identity prefix is untouched (D13) — so no DB drop and none of the 76
> prefix sites moved.
>
> ⚠ Done **before** W5 rather than after, deliberately: writing the
> docs first and then renaming would have meant writing them twice. The
> wave is still behaviour-free, which is the property the ordering
> existed to protect.

The mechanical list, for the record:

- Record body: `platform/agent/Avatar.ts` → `platform/agent/<Record>.ts`;
  the seed row's `class:` (`Avatar/seed.yaml:22`); `PlayerLogic.ts:523`
  lazy import; the twin's own tests.
- `ShadeAvatar` → `<Dead>` if renamed: file, row (`ShadeAvatar.yaml:12` + path),
  `ConditionLogic.ts:678, 681` (the row path and the template stamp
  prefix `/platform/agent/ShadeAvatar/`), `TemplatePaths` if one is added,
  `ShadeAvatar.composition.test.ts`, mortality.md.
- `SandboxAvatar` → `<Circle>` if renamed: file, row path + `class:`,
  `SandboxLogic.ts:328, 345`, the six fixtures, `sandbox.md`,
  **`sandbox-overlay-plan.md` W3's file path**.
- ⛔ `ShelledCharacter` — **NOT renamed.** Tried as `Shell` and
  reverted; see § Naming.
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
  overlay-key fixtures, `Avatar.test.ts`, `ShadeAvatar.composition.test.ts`.
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
| 7 ShadeAvatar verbs | as a shade: `take`/`get` refused (`requiresEmbodied`), `say` ok, `who` lists her, `passage` afforded; after `passage`, `passage` is unknown | matches the list W0 pins from `embodied-tagging.test.ts` |
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
   branch) owns `SandboxAvatar.shouldPersist()`, `holder_snapshots.yaml`,
   `PersistableLogic.assertUniqueKey`, `SandboxLogic.exitImpl`. This
   build touches `SandboxAvatar.ts` and `SandboxLogic.ts:344–357` and nothing
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

```
Character  →  ShelledCharacter  →  Avatar  (abstract)
                        ├── PrimaryAvatar    the one you play
                        ├── ShadeAvatar      the dead one
                        └── SandboxAvatar    the rehearsal one
```

### ⭐⭐ The axis is TWO axes, which is why no single word fit

| | acts are **canon** | can **fully act** |
|---|---|---|
| **`PrimaryAvatar`** | ✅ | ✅ |
| **`ShadeAvatar`** | ✅ — deeds persist, **tagged as having happened while ghosted** | ⛔ cannot advance |
| **`SandboxAvatar`** | ⛔ a transaction that is rolled back at the door | ✅ |

⭐ **Each non-primary body gives up exactly one, and a different one.**
That is the structure, and it is why `Living`, `Incarnation` and `Canon`
each felt almost-right and then lied about the third body: every one of
them named a single axis.

**`PrimaryAvatar`** is therefore the body that gives up *nothing*, and
the other two are each one qualification of it. ⚠ Not a ranking —
a shade is not a lesser avatar, it is one whose acts cannot accrue.

### ⚠⚠ "Wire" means three things, so it cannot be a class name

The rejected `WireAvatar` reads, to anyone who has not read
`sandbox.md`, as *the avatar over the websocket* — which is every
avatar. In this repo **wire** is:

1. **the protocol** — `packages/wire` (the whole wire-test package),
   "wire tests", the wire shapes in `@saxonberg/types`, *"appeared on
   the wire as in-flight"* (`activity.md`). The dominant meaning.
2. **the sandbox fiction** — *"step onto the wire"*, the wire namespaces.
3. **the epistemic wire mark** — `circleScope` on a `pass(mark)` row.

⭐ **The vocabulary sorts cleanly once you see it:**

| word | what it actually names | where it belongs |
|---|---|---|
| **sandbox** | the FEATURE — `SandboxApi`, `SandboxLogic`, `SandboxCrossingExit`, `sandbox.md`, the policy table, `platform/agent/sandbox/` | **the code** |
| **circle** | the SCOPE — `circleScope`, `discardScope`, the namespace | the persistence seam |
| **wire** | the fiction a player meets at the door | **the fiction, and nowhere else in code** |

`CircleAvatar` was considered and is better than `WireAvatar`, but
*circle* names **the fence, not the workshop**. `SandboxAvatar` is the
only candidate where the class, its directory
(`platform/agent/sandbox/`), its Api and its subsystem doc all say one
word. The bare name `Sandbox` is free.

⚠ **The fiction does not change.** The crossing still says *"step onto
the wire"*; that is good prose and players never read a class name.
This makes the CODE side consistent, where it is currently half-and-half
(`SandboxAvatar` already lives in `sandbox/` and already writes `circleScope`).

### The rung, and the root

- **`Avatar`** — abstract root, a human's handle in the world. Keeps the
  name: the identity namespace `/platform/agent/Avatar/` stays the
  family's (D13).
- ⛔ **`ShelledCharacter` keeps its name.** It was renamed `Shell` for
  one wave and reverted on the owner's objection, which was right and
  is worth recording in full because it is the `wire` lesson again,
  one rung up.

  *Shell* names a **capability bundle, not a kind of body** — so a
  bare `Shell` reads as a mixin, and this class composes **five**
  (`Alias`, `Environment`, `Focused`, `Workspace`, `Author`). The
  file's own docstring already said so: *"The msh shell isn't one
  mixin; it's a small composition of substrate mixins."*

  And it collided three ways:

  | collision | why it matters |
  |---|---|
  | `lib/shell/` | the class would be named for the directory it sits in — a directory whose every other resident is a mixin |
  | `ShellApi` (`api/shell.ts`) | by the mirror convention `FooApi` is `Foo`'s Api surface. `ShellApi` is the settings/alias resolution facade and has nothing to do with this class, so the name manufactures a false pairing |
  | `holding.md` | ⭐ *shell* is **closed kernel vocabulary** there for a dwelling's structure — `shellCondition`, `shellStamp`, `landlord-shell`, *"a shell weathers on the passage of days"* |

  ⭐⭐ **`ShelledCharacter` was already conformant and nobody asked for
  it to change.** An adjectival modifier on a noun is fine —
  `SingletonCartesianLocation`, `FurnishableRoom`, `DraftAnimal` — and
  it says what an instance IS: a Character that is shelled. The owner's
  rename complaint named `WireBody`, `Shade` and `Avatar`; they used
  `ShelledCharacter` approvingly, as the established term the design
  was built on.

  ⚠ **The mistake to not repeat:** the rename was justified by how it
  read in a sentence (*"an Avatar is a Shell with a human driving
  it"*) — naming for the prose rather than for the instance, which is
  the inverse of the rule being cited.

### Everything rejected, with its reason

| candidate | why not |
|---|---|
| `WireAvatar` | ⚠⚠ three meanings (above); reads as *over the websocket* |
| `CircleAvatar` | names the fence, not the workshop |
| `Understudy` | ⛔ reserved — casting vocabulary, belongs to the Extra/Cast work |
| `Incarnation` | vague; states nothing about why this body matters |
| `LivingAvatar` | separates from `ShadeAvatar` but not from the sandbox body, which is also a living self |
| `CanonAvatar` | ⛔ **false** — a shade's deeds persist too, tagged as ghosted. Canon separates the sandbox body only |
| `MortalAvatar` | a body can die inside a circle too (it leaves a circle-scoped corpse) |
| `FieldAvatar` | *field* names the sandbox axis only; sits oddly against `ShadeAvatar` |
| `Typist` | describes the human, not the class |
| `Console` | clashes with the SaxonbergClient keyspace (`console.tabs`, `console.routing`, `console.activeTab`) |
| `Terminal` | reads against `TpaTerminal` |
| `Pilot` | *driving* is `HasInteractive`'s notion, one rung up |
| `Scribe` | reads as a **vocation**, and vocations are Cast rows |
| `Steward` | does not say command line |
| `Operant` · `Movable`-shaped names | adjective-shaped; banned by the class-naming convention |
| `Shell` for the command-line rung | ⛔ **tried and reverted** — a capability bundle, not a kind of body; collides with `lib/shell/`, `ShellApi` and holding.md's closed *shell* vocabulary (above) |

### ⭐⭐ A constraint this naming pass surfaced — for the ghost content pack

A shade **cannot advance**, and that is the half of its definition that
is a *rule* rather than a consequence. ⚠ **It may be aspiration rather
than shipped behaviour:** `AdvancementMixin` holds no host state at all
(Competence is derive-on-read, the Transcript is identity-keyed
Documents), so there is no structural barrier to a shade accruing. The
build checks which it is.

⭐ **And it must end up a DECLARED, LIFTABLE property, not an accidental
absence.** The owner wants the option of a ghost content pack — an
underworld quest, Orpheus — which is by definition *a ghost doing things
that matter*. A hardcoded absence blocks that pack before it is
designed; a declared refusal lets the pack lift it. Same lesson as the
retired verb conferral: **the refusal must exist in order to be lifted.**

W6 is unblocked.

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
| **phase of play** — living / dead / rehearsing | `Avatar` | `Incarnation` | `ShadeAvatar` | `Understudy` | `Typist` | permanence falls out (an incarnation is the one that lasts). `ShadeAvatar` keeps its shipped name and prose. `Understudy` says *rehearsing in someone's workshop* better than *circle*. |
| **permanence** — the axis the code branches on | `Avatar` | `Mortal` | `ShadeAvatar` | `Puppet` | `Operator` | `Mortal` names the body that can die and is written down; `Puppet` is the SandboxAvatar row's own word (*"the puppet a player wears"*). ⚠ `Operator` collides with the platform-operator sense in deployment docs. |
| **agency** — what you can do from it | `Avatar` | `Body` | `Ghost` | `Effigy` | `Console` | the plainest words; ⚠ `Body` is close to `body`/`PlayerBody` in `ConditionLogic` and `Ghost` retires the shipped `ShadeAvatar` vocabulary across mortality.md and `passage.yaml` prose. |

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
4. `platform/agent/ShadeAvatar.ts`, `platform/agent/sandbox/SandboxAvatar.ts`,
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

### ✅ W7 — the seed fossil, and the predicate holding it in place — DONE

Added in review, on the owner's question: *"why is the template still
`avatar/seed.yaml`? that whole seed thing was when we were doing
writebacks directly into the content collection but now it's all
powered by that holders collection. I thought all that was gone."*
Correct, and the fossil ran deeper than the filename.

**What `seed` was.** A signup used to FORK the row into a real
per-player row at `/platform/agent/Avatar/<playerId>`, so that
namespace held rows and `seed` was a reserved FAKE playerId guarding
against colliding with a real one. Measured: `seed.yaml` was the only
one in the content tree, `Application.createDefaultAvatarTemplate`
**exists nowhere in the code**, `SeederManager` is gone, and guests mint
no row either (`asIdentityPath`, with the code comment to say so). So
`/platform/agent/Avatar/` held **no rows at all** — the row was parked
inside a namespace of identities, wearing a fake id to avoid colliding
with rows that cannot exist.

**Why it could not just be renamed — and the defect that hid under it.**
`PlayerApi.isAvatarStuff` answered *"is this a person?"* by
prefix-testing `templatePath.startsWith('/platform/agent/Avatar/')`,
with ~90 call sites including `AccessApi.isWizard`. Measured:

| body | prefix test |
|---|---|
| `PrimaryAvatar` | ✅ (only via `.../Avatar/seed`) |
| `ShadeAvatar` | ⛔ **false** |
| `SandboxAvatar` | ✅ only because `SandboxApi` **restamped** its lineage to `/platform/agent/Avatar/<pid>/wire`, a path backed by no row |

⚠⚠ `wallet`, `chat`, `forum`, `office` and `contacts` carry **no
`requiresEmbodied` gate**, so this predicate was the only thing
deciding — and **a dead player was not a person.** That is the bug class
`Stuff.getPlayerId`'s own docstring warns about (keying a PERSON
question on LINEAGE), the one that cost a shared bank account.
`requiresEmbodied`'s docstring states the doctrine it broke: death
*"never costs a seat as a person."*

**Landed:**

- `isAvatarStuff` → `instanceof Avatar` (the abstract W3 created).
- The sandbox's fake lineage restamp **deleted** — one writer, one
  reader (a test pinning it), nothing in production.
- The row → `/platform/agent/PrimaryAvatar`, mirroring its class like
  its two siblings. `SEED_PLAYER_ID` / `SEED_TEMPLATE_PATH` retired;
  the path lives in `TemplatePaths.primaryAvatar`, because `lib/paths.ts`
  is a leaf and importing the concrete class from `Login` /
  `EmbodyController` closes a module cycle (`Class extends value
  undefined` — which is why `PlayerLogic` lazy-imports it).
- ⭐ The identity prefix is **unchanged** (D13): class is lineage,
  identity path is identity.
- **A shade cannot spend** (owner's call): `bank deposit` / `withdraw`
  / `transfer` tagged `requiresEmbodied` per-subcommand — cash across a
  counter needs hands. `pay` and `draw` were already tagged. Reads stay
  open. `bank borrow` deliberately NOT tagged — taking on debt is not
  spending, and whether a ghost may is left to its own lens pass.
  `bank.yaml` is the first MIXED view and graduates out of
  `embodied-tagging.test.ts`'s whole-file `READ_ONLY_IN_MATERIAL` set.

**⚠ Three suites were exploiting the hole**, all with the same shape: a
lightweight `Creature`/`TestGiver` stand-in parked at an avatar path,
read as a player for free. They now declare themselves
(`contract-lifecycle`, `HouseAccount`, terminus `stall`). ⭐ The new
`player.test.ts` case refuses that explicitly — *a template path alone
no longer buys personhood* — which is the same hole the sandbox was
walking through.

**⚠⚠ And one of those hid behind an unawaited promise.** `HouseAccount`
fire-and-forgets a payment-card issue; with the predicate fixed it took
the non-player branch and threw **seven unhandled rejections** while
every test still reported PASSING and the run exited non-zero. A green
test list is not a green run.

⭐ A side benefit worth naming: `DocumentLogic` and `ContractLogic`
prefix-test the identity namespace to recognise a player *identity*.
With the row out of that namespace those reads lose a class of false
positive — `/platform/agent/Avatar/seed` would have answered yes.

**Commit.** `build(avatar-family W7): the seed fossil goes, and the predicate that pinned it`

---

## Drive record — run 2026-09-30, `WIRE_BOOT=1 WIRE_PORT=2014`

`packages/wire/tests/avatar-family.dirty.wire.test.ts` — **6 passed**.

| step | result |
|---|---|
| 1 pre-world verb set | ✅ a roster-parked `Login` answers `cockpit`, refuses `look`, offers a playerId. Needed the new `Session.openAtRoster`. |
| 2 loadout | ✅ char-gen completes; the body carries its aether implant. |
| 3 arrangement survives logout | ✅ `cockpit mode build` → close → reopen → still `build`. |
| 4 fork through the door | ⚠ **the door is unreachable — named, not skipped** (below). |
| 5–7 the shade arc | ⚠ **not driveable on the wire at all** (below). |
| 8 estate succession | ⚠ write accepted; **read surface unreachable — named** (below). |
| 9 the panel | ✅ three panels, all three bodies named, and `SaxonbergClient` / `HasInteractive` / `Estate` each appear ≥3 times — *composition does not differ*, rendered. |

### ⚠⚠ Three gaps the drive FOUND, and none of them is this build's

**1. There is no sandbox door a drive handle can reach.** Only two
rooms in the shipped world hold `/platform/thing/sandbox/wardrobe`:

- the Duncan Hall **dorm room** — a KEYED residence. A `startLocation`
  stands the room up but **not its `props:`**, so `here:c` is EMPTY,
  there is no wardrobe object and therefore no crossing exit:
  `go wardrobe` answers `locomotion-gate-failed / exit-mode / walk`.
  The fixtures arrive with provisioning (Katie), which is the residence
  flow.
- the **Seznick house bedroom** — unlit, so pitch dark; the keyword
  resolves to nothing.

⭐ So **the sandbox crossing has never been driven on the wire by
anything** — not by this file and not by the twenty-odd before it. The
step keeps a LIVE assertion (it checks the fork for real the moment a
door exists) and asserts the refusal is the *known* one, so a different
refusal fails.

**2. Nothing in this game can kill a player through the socket.** The
eval sandbox exposes four Apis and `ConditionApi` is not one; no verb
kills; the shipped hazards are not reliably lethal in one run. The
**death → shade → `passage` arc has never been driven end to end**.
Steps 5–7 are recorded as not driveable and their properties are
proven by unit round trips instead.

**3. The estate's succession state has no reachable read surface.**
`wallet` answers *"no active account yet"* (the beneficiary is a field
ON the wallet); `bank open` needs a teller the start location lacks;
`eval … --on me` throws in the controller. The round trip is proven
through the store by `Estate.succession-state.test.ts`; the wire proves
only that the write is accepted. ⭐ A `wallet` that cannot report your
heir until you open a bank account is a read gap **a player would hit
too** — offered to the credit/banking slate.

### What the drive did NOT find

No defect in anything this build changed. Every preserved observable it
could reach was preserved: the pre-world verb set, the loadout, the
client-state round trip across a logout, the composition identity of
the three bodies. The two code-level surprises of the whole build
(`claimsRegistrySlot`'s necessity in W2, and `captureSlice` shadowing
`fieldMeta` in W4) were both caught by **unit** tests on their first
run, before the drive.
