# Test-world lifecycle (build 1 of 2) — implementation plan

Executes [test-world-lifecycle-requirements.md](../requirements/test-world-lifecycle-requirements.md).
**Kind:** infra (test tooling) plus one test-only content pack. **Lead end:**
kernel and tooling; the first consumer is the kernel/platform wire drives. The
build gives the wire suite a scaffold of its own (a test-only fixture pack),
one stop/restart path, a purge of what a run leaves, runner discovery of
drives in packs, a census-then-ratchet gate on locality paths, and migrates the
kernel/platform drives onto all of it. Seeding slate and reuse ledger:
[test-world-lifecycle-slate.md](../slates/tech-debt/test-world-lifecycle-slate.md).

> ✅ **The premise is settled (owner, 2026-11-20).** The per-file reading
> stands — 19 migrate whole, 11 split, 6 to build 2 — and the scaffold holds
> about fourteen places (D2). The requirements doc is amended to match. The
> owner also ruled the money sink a **general operator verb**, `reserve
> retire` (D10), not a test-only seam.

## Grounding

Verified by opening the file unless marked *(reported)* — a per-file read by a
survey agent, with line numbers, not re-opened by the planner — or
*(unverified)*, which the named wave checks first.

### The runner and the harness

- `packages/wire/src/runner/boot.ts` — `serverEnv()` (61–83) scrubs `VITEST*`
  and deletes `NODE_OPTIONS`, sets `AUTH_MODE=test`, `PORT`,
  `SAXONBERG_TEST_WORLD=1`. `serverArgs()` puts node flags on `tsx`'s command
  line (`--cpu-prof` under `WIRE_CPU_PROF`) — the precedent for a kept heap
  flag. `bootOwnedWorld()` runs `dev-preflight.mjs <port> server` first, then
  spawns; budget `WIRE_BOOT_TIMEOUT ?? 420_000`. `stopOwnedWorld()` SIGTERMs
  its own `child` and SIGKILLs after a fixed 15 s. `reapOwnedPort()` is a bare
  preflight (so a 2 s kill). `keepWorld()` is true under `WIRE_KEEP_WORLD` or
  `WIRE_REUSE`.
- `packages/server/scripts/dev-preflight.mjs` — `GRACE_MS =
  PREFLIGHT_GRACE_MS ?? 2000`; kills a Saxonberg listener on the port.
- `packages/wire/src/runner/global-setup.ts` — `setup()` (reuse / own /
  attach), `teardown()` (`stopOwnedWorld`, then `reapOwnedPort` when owned and
  not kept). `soakFiles()` reads `packages/wire/tests` only.
- `packages/wire/vitest.config.ts` — `include: ['tests/**/*.wire.test.ts']`
  (soak variants under `WIRE_SOAK`), `DirtyLastSequencer`,
  `teardownTimeout: 60_000`, single fork.
- `packages/wire/package.json` — `wire:dirty` is `vitest run
  tests/*.dirty.wire.test.ts` (a shell glob over the one directory); no
  `exports`.
- `packages/wire/src/harness/world.ts` — `restartWorld()` (582–606: SIGTERM,
  wait ≤ 180 s, `stopOwnedWorld`, preflight at the default 2 s,
  `bootOwnedWorld`); `stopWorldWithin(graceMs)` (637–666: SIGTERM the listener,
  SIGKILL that pid at the grace, returns `{exitedMs, killed, report}`);
  `lastShutdownReport()` parses `shutdown captured N persistable host(s) …`
  from `WIRE_LOG`. Also `hand`, `stage`, `arrive`, `nourish`, `dress`,
  `stageShip`, `pinWeather`, `advanceWorldClock`, `isOwnedTestWorld`. The
  harness exports free functions; that is its own convention and this plan
  follows it (the kernel's no-free-helper rule is `src/mud/**` and pack `src/`).
- `packages/wire/src/harness/session.ts` — `SessionOptions` (`startLocation`,
  `wizard`, `committees`, `offices`, `parcels`, `streamer`); a login with no
  `startLocation` sends none, so the server's `defaultStartLocation` applies
  (the lounge pack's setting; `/platform/location/void` when no pack
  contributes one). `uniqueHandle(prefix)` → `wire-<prefix>-<t36>-<r36>`.
- `packages/wire/src/harness/crowd.ts` — `CROWD_PLACE` (24), `STAGING` (25),
  `WALK_IN = 'go southwest'` (26); greeting counts rely on greeter NPCs in the
  destination *(reported)*.
- `grep` census, this branch: **127** `*.wire.test.ts` files (+4 baseline
  JSONs); **347** `uniqueHandle('…')` call sites; the only fixed handles are
  `founder` (125 `Session.open` sites) and one `wire-textiles-walker`.
- Restart copies: two shapes. Own `restartWorld()` functions in
  `aether-devices.dirty` (141–165), `call-security-performance.dirty`
  (169–191), `crowd-timing.dirty` (62–84) *(reported)*; inline
  preflight + `bootOwnedWorld` in `harbors.dirty` (723–728,
  `PREFLIGHT_GRACE_MS: '60000'`), `zone-instancing.dirty` (595–600, same),
  `ceramics-d.dirty` (1160–1164). The task's list of 18 is the roster W0
  greps for; `import … from '../src/runner/boot'` in a test file is the tell.
- `--heapsnapshot-near-heap-limit` appears in no code (two slates only).
- `tools/soak` reads `packages/wire/tests/*.soak.*` by `git diff` path (127)
  and names `packages/wire/tests/%s` in its issue body (293); it runs
  `reset:db` before each world (233). `build/soak-repair` is in flight in the
  `soak` worktree and edits this file.
- `.gitlab-ci.yml` `wire:` job — `WIRE_BOOT=1`, `MONGODB_DATABASE:
  saxonberg_wire`, artifacts `packages/wire/.wire/` on failure.

### Test seams on the server

- `packages/server/src/services/auth/TestAuthRoutes.ts` — mounted only under
  `AUTH_MODE === 'test'`; routes `test-login`, `test-clock`, `test-weather`,
  `test-ship`, `test-nourish`, `test-stage`, `test-datastore-fail`,
  `test-force-document`, `test-arrive`, `test-hand`.
- `packages/server/src/backend/TestHooks.ts` — `syntheticProfile(handle)`
  gives `displayName = handle`, email `<safe>@e2e.local`;
  `provisionCharacter` seats committees (`#seatOnCommittees`), grants parcels
  (`#grantParcels`, a `ParcelApi.transfer`), re-homes an existing character to
  `startLocation` (`rehomeCharacter`).
- `packages/server/src/mud/api/test-harness.ts` + `TestHarnessLogic` — every
  static `@TestOnly` (withheld unless `SecurityApi.isTestEnvironment()`);
  `stage()` admits `set*/add*/pond/invalidateCache` on a singleton path or a
  `#<stuffId>`; `removeThing`, `afflict`, `stageStandingHistory`.
- `SecurityApi.isTestEnvironment()` (`mud/api/security.ts` 795) — `VITEST`,
  `NODE_ENV === 'test'`, or `SAXONBERG_TEST_WORLD === '1'`.
- `packages/server/scripts/purge-test-characters.ts` — a Mongo-direct script
  for the browser tests (`e2e-` handle **and** `@e2e.local`; `NEVER_PURGE`
  names `founder`); deletes profile, user, avatar row, snapshots; leaves the
  append-only ledgers. Called by `e2e/global-teardown.ts`.
- `packages/server/scripts/reset-db.ts` refuses `saxonberg_demo`.

### Packs

- `PackLogic.ts` (`mud/platform/idea/api/`): `MANIFEST_KEYS` (396) is the
  closed set `id, version, description, root, requires, boot, maintainers`;
  `readManifest` (592) throws on any other key; `discover()` (814) is the one
  chokepoint — deployment manifest → `resolvePack` → `orderByDependsOn` →
  `registerSources` → `packFilter()` (`SAXONBERG_PACKS`; a named id nobody
  ships throws; an omitted pack is ignored and not booted).
  `PackManifest` is declared in `mud/api/pack.ts` (95).
- Root `package.json` is the deployment manifest (74 `@saxonberg/content-*`
  lines). The lint family reads packs through `scripts/pack-roots.ts`, not
  through `discover()`.
- A locality pack's shape: `packages/content/saxonberg-lounge/` — `pack.yaml`
  (`root: /world/lounge`, `maintainers: lounge`, a declared group, title
  claims held by `{ group: lounge }`), a zone row
  (`content/world/lounge.yaml`, `class: /platform/idea/location/CartesianZone`,
  `address:`), places with `props:` / `cast:`.
- Bank: `/platform/thing/BankCounter` composes `BankMixin`
  (`lib/banking/Bank.ts`): `getBank()` is `this.bank || this.corpoKey`, and an
  **independent bank authors its own `bank:` key with no corpo behind it**.
  `bank open` (`BankOpenController`) needs only a `Bank` in the room. Only
  Terminus ships a counter (`…/counting-houses/bank-counter.yaml`,
  `corpoKey: goodkin`).
- Business: `/platform/idea/Business` is kernel; every business is a content
  row (`positions`, `rosterSlots`, `appointingAuthority` of kind `entity` or
  `committee` + `parcel`, `banksAt`, `operatingLocations`). Exemplars:
  `saxonberg-lounge/content/world/lounge/idea/business.yaml`,
  `terminus/content/world/terminus/counting-houses/business.yaml`.
- Shop: `trade-shopkeeping` depends on the platform pack only; its
  `/trade/shopkeeping/thing/Stock` counter takes `stockLines` (a line with
  `par` and no `from:` is re-cloned to par by `reset()`,
  `lib/retail/Stock.ts` 663), `businessPath`, `serverPositionKeys`;
  `setStockLines` is a `set*` and so stageable.
- Door: `terminus/…/wharfside/thing/pump-house-door.yaml` — `class:
  /platform/thing/Door`, `extends: /platform/thing/boundaries/door`, `open`,
  `locked`, `keyway`, `freeFrom`; the exit names it with `door:`.
- Kernel fixture classes that exist in `mud/platform/thing/`: `Door`,
  `Window`, `Hearth`, `Forge`, `JobBoard`, `Trap`, `WaterFixture`, `Icebox`,
  `Tablet`, `Chair`, `Ladder`, `LoadDevice`, `Tariff`.
- `EmploymentApi.vacate(actor)` and `CompactApi.vacateOffice(key)` /
  `assignOfficeForTest` exist. `BankingApi.mint` exists; **a sink of the same
  shape was not found by name** *(unverified — W5)*.

### The 36 files — what they actually stand on

*(reported, with line numbers in the survey; D8 turns this into the
classification.)*

| file | verdict | what it needs beyond rooms · bank · venue · shop · NPC |
|---|---|---|
| platform-smoke | generic | asserts `config defaultStartLocation` contains `lounge` (L124) |
| typecheck, canary.soak, aether-devices.soak | generic | nothing (default landing / char-gen only) |
| broadcast-ready, hydration | generic | one shared place; hydration asserts two fixture names |
| avatar-family | generic | no `/world` literal in code; default landing; a sandbox door step already on its "known gap" branch |
| world-scan | generic | a walkable exit, a door somewhere, not a deed desk |
| crowd, crowd.soak, crowd-timing, call-security-performance | generic | two places on one exit and a greeter that stays put; two carry a restart copy; timing gates and a baseline were calibrated on Terminus's cast |
| work | generic + | a `JobBoard`, a delivery target next door, a torch on sale; fixed direction lists |
| db-performance | generic + | venue with two positions and payroll, a consignment shelf; a baseline of decision text |
| soak-harness | generic + | an outdoor place with weather in a Locality; a second, transferable parcel |
| client-surface | generic + | a shelf of like things, a screen, three seats, a killable NPC and an attackable one, always present |
| lock-reconciliation | door | a locked gate with a keyway and no key |
| boundary | door + window | a door with a free side between a lit and an unlit place, a window, propped double doors |
| failure-model | door + content | plus an NPC who takes coin; **a forestry oak stand** (pack reasons) |
| call-security-pass | door + content | plus **a realtor NPC selling plat lots** (steps 7–8) |
| navigation-server | mixed | locked way, a stoop door, a named Building, zones; **a ship and a horizon of landmarks** |
| routing | mixed | named places; **a barge on a sailed lane, a TPA terminal, a locality map** |
| location-graph | mixed | a Locality and a second one; **keyed dorm rooms, the lounge satellite, a stall** |
| placement | mixed | a surface with placed tools; **a cookhouse (icebox, hook, the cooking archetype)** |
| envelope | mixed | a sealed unlit cellar, a hearth, a forge, night; **two streets under a public-lighting service** |
| injury | mixed | verbs and anatomy; **the general store's stock sheet, the spell catalogue** |
| recovery | mixed | a trap on a way, a water fixture |
| wizard-axis | mixed | offices and dials; **the dorm provisioner and a letting agency** (steps 1–3) |
| nutrition-fitness | mixed | a run lane, a bank, a load device, a climb; **bakery loaves, a smithy order** |
| trades-and-labor | mixed | three seats with different criteria; **an NPC par sheet posting gigs, a stall, the coat rack** |
| agent-coordination | **content** | the lounge's cast, bands, roster and hospitality's recipes |
| identity | **content** | authored dossiers and named institutions (one generic step) |
| consequence | **content** | trade-medicine's tariffs on three Terminus venues |
| economic-bootstrap | **content** | Terminus's supply chain, Goodkin as lender, the Gazette |
| zone-instancing | **content** | Hinkley lots, Duncan Hall units, smacks, the Hesper, the Kestrel; a restart copy |
| aether-devices (blocking) | **content** | the dorm charger on the grid, the leasing NPC, a corpo phone on sale; a restart copy |

## The requirements' premise — settled

The requirements first said all 36 migrate onto "rooms, a bank, a venue, a
shopfront, NPCs in roles". The per-file reading found six that test specific
content, eleven mixed, and kernel steps standing on kernel kinds the list
omitted. **Owner ruling, 2026-11-20: accepted.** 30 files migrate (11 of them
after a split), 6 move to build 2 whole, and the scaffold holds every kernel
kind a migrated step stands on, each traced to its consumer (D2's table). The
requirements doc and the slate's § Build 2 are amended to match.

## ⭐⭐ New substrate

| item | ledger row | status |
|---|---|---|
| `testOnly` — a `pack.yaml` manifest key (`PackManifest.testOnly`) honored in `discover()` | *a test-only pack* | **genuinely new** — searched `MANIFEST_KEYS`, `PackManifest`, `packFilter`; the only test-only mark today is a command view's `testOnly:` |
| `test-fixtures` — a content pack (rows only, no `src/`), root `/world/testbed` | *the scaffold* | new rows over existing kernel and shopkeeping classes; `Archetype.materialize()` not used (D2) |
| `TestHarnessApi.purgeTestLitter` (`@TestOnly`) + `TestHarnessLogic` method + `POST /auth/test-purge` + harness `purgeLitter()` | *cleanup of a run's litter* | generalizes the purge to a live world; the e2e script stays, and why is D4 |
| harness `restartWorld(opts)` / `stopWorld(opts)` rebuilt on `stopWorldWithin`; the heap flag in `serverArgs()`; one grace and one boot budget | *restart* · *the kill graces* · *the heap flag* · *the boot budget* | generalize; the 18 copies and `restartWorld`'s own wait are deleted |
| `packages/wire/src/harness/scaffold.ts` — path constants and `standIn` / `fundedAccount` / `standInNpc` / `stockCounter` | *creating what a drive consumes* | reuse of `hand`, `stage`, `clone`, `house appoint`, `reserve override`; no server route added |
| **`reserve retire <amount> from <target> "<reason>"`** — a `reserve` subcommand, its controller beside `ReserveOverrideController`, and `BankingApi.retire(fromAccountId, amount, reason)` → `BankingLogic` (D10) | *a money sink* — the mirror of `BankingApi.override` / `reserve override`; searched the banking face for a sink: none | **genuinely new** — an operator act in any world (owner ruling) |
| `lint:wire-content` (`scripts/check-wire-content.ts` + a ceiling) | *the no-content rule* | generalizes `lint:test-content`'s rule to wire drives; a separate script because that one is an allowlist of kernel unit tests and this one is a count |
| runner discovery of `packages/content/*/wire/**` + `@saxonberg/wire` `exports` | *drives living in a pack* | generalize |

No new mixin, Api class, logic singleton, hook, registry, document kind,
collection or module category. **Boot timing by phase** (a ledger row) is not
built: the restart path needs only "answering within the budget", which
`global-setup` already prints; it stays on db-performance-slate § 5.
`RESET_DISPOSITIONS`, `reset-db.ts` and the dump/restore row are untouched, as
the ledger says.

### P9–P14, per item

- **`testOnly` key** — P9 n/a (no command). P10 it is a field on an existing
  document (the manifest), not a new vocabulary. P11 no caller branches:
  `discover()` filters, every caller gets the filtered set. P12 not a synonym
  for `SAXONBERG_PACKS` (that is the operator's choice per boot; this is the
  pack's own statement and cannot be overridden into a live world). P13 the
  key sits on the manifest, whose job is "what the installer must know before
  writing a row". P14 nothing silent: a refused pack prints a line every boot,
  and naming it in `SAXONBERG_PACKS` outside a test world throws.
- **`test-fixtures` rows** — P9 the pack ships no command view. P10 no
  metadata vocabulary. P11/P12 none. P13 each row uses a class for what that
  class is. P14 NPCs are rostered around the clock by authored `rosterSlots`,
  visibly.
- **`purgeTestLitter`** — P9 a route, not a verb; no `testharness` subcommand
  is added (nothing needs to type it). P10 none. P11 it calls each owner's own
  primitive (`StuffApi.destruct`, `EmploymentApi.vacate`, the group and office
  removals, the bank's sink) and never branches on kind to pick a back door.
  P12 not a synonym for `removeThing` (one thing) or `RecordLogic.wipe` (a
  disposition table over a running world's records). P13 it is on the
  test-harness Api, whose header sentence is test-world scaffolding. P14 it
  returns a report of every category and count and the harness prints it.
- **Restart path** — P11 the caller never chooses between "kept" and "owned";
  the function reads it. P12 `restartWorld` keeps its name; `stopWorldWithin`
  stays the timed primitive and `stopOwnedWorld`'s private 15 s goes. P14 a
  kill at the grace is reported (`killed: true`), never hidden.
- **`scaffold.ts`** — P12 each helper is a composition a drive would otherwise
  repeat, named for the state it leaves (`fundedAccount`), not a new verb for
  `hand`. P14 `fundedAccount` says in its doc that it opens a governor session
  and moves an office seat.
- **`lint:wire-content`** — P14 prints the count, the ceiling and every
  offending file.
- **Runner discovery** — P14 the run report lists pack drives by path.

## Plan-level decisions

**D1 — The test-only mark is a manifest key, enforced in `discover()`.**
`testOnly: true` joins `MANIFEST_KEYS`; `PackManifest.testOnly: boolean`
(default false). In `discover()`, before `registerSources`:
- a pack that is not test-only and `dependsOn` a test-only pack **throws**, in
  every world (a live pack can never come to need a fixture);
- when `!SecurityApi.isTestEnvironment()`, test-only packs are removed from
  the ordered set; `SAXONBERG_PACKS` naming one **throws** (`… names
  'test-fixtures', a test-only pack — this is not a test world`).
`install()` prints, once per boot, per refused pack: `PackApi:
'test-fixtures' REFUSED — a test-only pack installs only in a test world
(SAXONBERG_TEST_WORLD=1)`, and adds `; N row(s) from an earlier test boot
remain in this database` when a `pack_installs` record exists (it deletes
nothing: no migration). `pack status` lists a refused pack as `refused
(test-only)`. Why `discover()`: it is the one function every reader of the
pack set goes through, so no caller can forget. The dependency line goes in
the root `package.json` like every pack's — the live world discovers it and
refuses it on every boot, which is the requirement's "refused, loudly". CI,
the soak lane and `WIRE_BOOT`/`WIRE_REUSE` worlds already set
`SAXONBERG_TEST_WORLD=1` through `serverEnv()`, so they install it with no
change; `pnpm dev:server` and the e2e world do not, so they refuse it.
⚠ Unit tests run under `VITEST`, which is a test environment: they see the
pack. That is wanted (the lint family and pack tests cover its rows).

**D2 — The fixture pack: `test-fixtures`, root `/world/testbed`.**
`packages/content/test-fixtures/` (`@saxonberg/content-test-fixtures`),
dependencies `content-platform` and `content-trade-shopkeeping` only (plus
`@saxonberg/wire` as a devDependency for its own drive, D6). `pack.yaml`:
`testOnly: true`, `root: /world/testbed`, `maintainers: testbed`, two declared
groups (`testbed`, `testbed-annex`), title `/world/testbed` held by `{ group:
testbed }` and `/world/testbed/annex` by `{ group: testbed-annex }`. No
`boot:` entry unless W3 finds the roster tick needs the Business eager (the
lounge's does; copy its reason if so). No corpo: the bank authors `bank:
testbed-bank` (the independent-bank path in `Bank.ts`). `Archetype.materialize`
is not used — an authored row is reviewable and the archetype path has no
production caller.

**Authority without damage.** A drive that stages asks for
`committees: ['/world/testbed']` (a member row on the pack's own group — what
`eval --parcel`, `clone`, `goto` and `house appoint` check). Both businesses
author `appointingAuthority: { kind: committee, parcel: /world/testbed }`.
`parcels:` is never used on `/world/testbed`; the one drive that must take a
title (soak-harness) takes `/world/testbed/annex`, and the purge hands it back
(D4).

**The rows** — every piece with the migrated step that stands on it. Row
shapes are copied from the cited exemplar, never invented.

| path under `/world/testbed` | what | consumers | exemplar |
|---|---|---|---|
| `testbed.yaml` (zone) + a Locality row claiming address `testbed` | a CartesianZone, a Locality so weather, `map` and `government` resolve | soak-harness, navigation-server, location-graph, routing | `saxonberg-lounge/content/world/lounge.yaml`; the Locality row that claims `lounge` *(find by grep at W3)* |
| `location/approach` · `location/plaza` | two outdoor places, north/south; the plaza has a `JobBoard` and a greeter | crowd family, work, nutrition (run lane), world-scan, routing | `terminus/…/market/square.yaml` |
| `location/bank` + `thing/bank-counter` + `agent/teller` | a lit hall with a `BankCounter` (`bank: testbed-bank`) | work, db-performance, nutrition, call-security-pass | `terminus/…/counting-houses/banking-hall.yaml`, `bank-counter.yaml` |
| `idea/bank-business` | a Business, positions `teller` + `officer`, `charter: [bank]` | db-performance | `terminus/…/counting-houses/business.yaml` |
| `location/hall` + `idea/venue` | a lit venue: a Business with three positions carrying three criteria (none · `requires.gigs` · a competence band), one with spare `headcount`; a shelf of like things, a `Tablet`, three `Chair`s | client-surface, trades-and-labor, hydration, placement (surface), broadcast-ready | `saxonberg-lounge/…/idea/business.yaml`, `terminus/…/general-store/business.yaml` (the `hand` seat) |
| `agent/host` · `agent/attendant` · `agent/greeter` · `agent/stand-in` | `Extra` rows; the first three rostered every day `[0, 24)` so they are always at post; `stand-in` is unrostered and exists to be cloned and harmed | crowd, client-surface, failure-model (takes coin) | `terminus/…/general-store/agent/clerk.yaml` (as `/platform/agent/Extra`, no costume from another pack) |
| `location/shop` + `thing/counter` + `thing/shelf` + `thing/hearth` | a lit shopfront: a `Stock` counter with two import lines of commons goods at `par` (it restocks itself), a consignment shelf, a `Hearth` | work, db-performance, trades-and-labor, envelope | `terminus/…/general-store/counter.yaml`; `trade-shopkeeping/…/thing/consignment-shelf.yaml` |
| `location/cellar` + `thing/cellar-door` | a small unlit sealed room behind a `Door` (`locked`, a `keyway`, `freeFrom` the cellar) on a named exit | boundary, failure-model, call-security-pass, navigation-server, envelope | `terminus/…/wharfside/thing/pump-house-door.yaml` and the `pumphouse` exit in `wharfside/bank.yaml` |
| `location/yard` + `thing/gate` | a `Door` on a `north` exit, locked, a keyway, no key anywhere, keyword `gate` | lock-reconciliation | the crossing's gate *(row found at W3)* |
| `location/hut` + `thing/hut-window` | a place lit through a `Window` onto the plaza; the window passes no body | boundary | `rejection/…/thing/hut-window-west.yaml` |
| `thing/hall-doors` | double doors on the hall's exit, standing open | boundary | Duncan Hall's front doors *(row found at W3)* |
| `location/works` + `Forge` + `WaterFixture` + a low door | a forge room with a basin, entered by a way that needs `stoop` | envelope, recovery, navigation-server | `hearthworks/…/location/smithy.yaml`; the steading's low door *(row found at W3)* |
| `location/passage` + `thing/trap` | an unlit passage with a `Trap` on the way through | recovery, navigation-server (unlit, no `seen` claim) | `newbie-wilds/…/delve/corridor-3` |
| `location/shaft-head` · `shaft-foot` | a climbable drop | nutrition-fitness | `rejection/…/ferrow/winze-head` |
| a `Building` row over hall · shop · bank | a named building | navigation-server | the chandlery's building *(row found at W3)* |
| `annex/annex.yaml` + `annex/location/lot` | a second extent and Locality, one place | soak-harness, location-graph | — |

⚠ If a kind above turns out to be owned by a pack other than the platform or
shopkeeping (a low door, a climb), the piece is **dropped from the scaffold
and its step moves to build 2** — the pack does not gain a dependency. Record
it in the plan.

**D3 — Staging gaps: none needs a new server route.**
- *A funded account.* `fundedAccount(handle, minor)`: log the character in at
  the testbed bank, `bank open`, close; open a fresh `wire-gov` session with
  the office `reserve override` asks for (confirm the office in
  `ReserveOverrideController` / its view at W4), `reserve override <n> to
  <handle> "wire: <file>"`, close. Never the `founder` handle: its seats are
  world state another drive may have moved. `rehomeCharacter` already moves an
  existing character to the next `startLocation`, so the caller opens its real
  session wherever it needs. Cash in hand stays `arrive`.
- *An NPC to harm.* `standInNpc(session)`: `clone
  /world/testbed/agent/stand-in --here` by a session seated on the testbed
  committee; returns the id. The scaffold's rostered NPCs are never killed.
- *An NPC in a role.* `house appoint` at a testbed Business by a committee
  seat (D2). Already works for a player; for an NPC clone, W4 proves it and,
  only if it fails, records the gap (do not add a route on speculation).
- *Stock.* The counter's own par lines restock. A drive that needs a specific
  good on sale calls `stockCounter(template, par)`: `stage(counter,
  'setStockLines', [...current, line])` then the counter's reset — ⚠ `reset`
  is not a `set*`; W4 confirms what triggers a repop from outside (a browse
  does, `resetsWhilePresent`) and uses that. A drive that only needs to
  *hold* the good uses `hand`.
- *A re-armed trap, a door's state.* `stage(path, 'setOpen' | 'setLocked' |
  the trap's own setter)` before use, never an assumption about how the last
  drive left it.

**D4 — Cleanup is a purge in the live world, keyed on the handle.**
*What is test litter:* a profile whose `displayName` starts `wire-` **and**
whose email ends `@e2e.local` — the two-part rule the e2e purge already uses,
with the same named survivors (`founder` and the rest of `NEVER_PURGE`). Not a
run id: a crashed run's leftovers must be findable by a run that never knew
it, and a run stamp would be a new field on every row a drive can touch. One
world serves one wire run at a time (one database per worktree, single fork),
so a start-of-run sweep cannot take a live run's characters.

*Why in the world and not Mongo-direct:* a kept or reused world is the normal
case now, and it holds what a script cannot see — live bodies, the group
registry's member cache, the balance cache, the roster. A delete under it is
re-written at the next shutdown capture. So `TestHarnessLogic.purgeTestLitter`
runs inside the world and calls each owner's primitive:

1. for each test identity: sign out and `StuffApi.destruct` the body and what
   it carries; `EmploymentApi.vacate`; remove its group member rows; vacate
   any office it holds (the seat falls to the founder default); retire its
   account balances to the reserve with `BankingApi.retire` (D10, reason
   `wire purge`) and close the accounts;
   hand back any title it holds under the fixture pack's claims to the claim's
   declared holder; delete the documents and per-player records keyed on it;
   then the profile, user and snapshot rows;
2. for the scaffold: in every place under `/world/testbed`, destruct what is
   neither an authored `props:` / `cast:` member nor a connected body;
   re-stage authored doors and traps to their authored state; retire the two
   testbed Businesses' balances to the reserve (D10);
3. return `{ characters, things, seats, offices, appointments, accounts,
   sunkMinor, titles, documents, skipped[] }`.

**W5 opens with a census**, written into this plan before code: every
collection in `packages/server/src/schema/*.yaml` keyed on a player identity,
classed *delete* / *leave (append-only ledger)* / *owner primitive*. The
append-only ledgers (`bank_ledger`, `renown_events`, `participation_events`,
`accountability_events`, `authoring_events`, …) are never deleted from — the
e2e script's rule, kept.

**The census (W5, written before the code).** Every collection in
`src/schema/` that a test identity (`/platform/agent/Avatar/<playerId>`)
can leave a row in:

| class | collections | what the purge does |
|---|---|---|
| **owner primitive** | `groups` (member rows) | `Group.removeMember` + save + `fireChange`, per group naming the identity |
| | `office_holders` | `CompactApi.vacateOfficeForTest` (new, `@TestOnly`, the mirror of `assignOfficeForTest`) for each office whose holder is the player |
| | business seats (on the body + the Business's roster) | `EmploymentApi.vacate(body)` — a body loaded for it |
| | `bank_accounts` / `bank_supply` | `BankingApi.retire` of each account's balance, reason `wire purge` (D10); the empty account row stays (an empty account is not money) |
| | `parcels` | `ParcelApi.transfer` of any extent under `/world/testbed` the player holds back to the fixture pack's claim group |
| | the body and what it carries | `StuffApi.destruct` (contents first), then wait for the store to go quiet — the body's `onDestruct` fires a final save |
| **delete** | `google_profiles`, `users`, `holder_snapshots` (`owner`), `player_frames` (`owner`), `transcripts` (`owner`), `beliefs` (`viewerId`), `disposition_events` (`owner` — the "per-player cleanup cascade" its schema doc names; no code ran it) | keyed deletes after the body is gone |
| **leave — append-only ledgers** | `bank_ledger`, `renown_events`, `participation_events`, `producer_events`, `accountability_events`, `authoring_events`, `chattel_events`, `contract_events`, `parcel_events`, `forum_events`, `chronicles`, `wiki_revisions` | never deleted from (the e2e script's rule) |
| **leave — warmed projections** | `participation`, `renown`, `producer`, `positions` | a dead subject's row is inert, and deleting under a warmed index is re-written by the next pass; a fresh character has a fresh identity |
| **not reached** | `forum_*`, `wiki`, `channels`, `contracts`, `chattel` rows of destructed things | written only by unmigrated drives (build 2) or derived from bodies already destructed; reported, not deleted |

Re-staging doors and traps (D4 step 2) is **dropped**: D3 already makes every
drive stage a door's or trap's state before it uses it, so the purge would be
a second writer of the same fact.

*When:* `global-setup` calls it once the world answers (a crashed run's
leftovers) and `teardown` calls it before the stop. In attach mode against a
world that is not a test world the route's `@TestOnly` static is withheld: the
harness prints `wire: purge skipped — <url> is not a test world` and goes on
(a skip, said). *The live database:* `boot.ts` refuses to boot, and
`purgeLitter()` refuses to post, when `packages/server/.env` names
`MONGODB_DATABASE=saxonberg_demo` (`reset-db.ts`'s constant and message).

*What it does not reach, said in the report line:* money a test character paid
to a non-test party, and clones left in non-testbed places — both made only by
unmigrated drives, both gone when build 2 migrates them. *The e2e script
stays*: the browser tests attach to a world that is not a test world, where
this route does not exist; it gains no wire handling.

**D10 — `reserve retire`: the reserve's sink, an operator act (owner
ruling, 2026-11-20).** The exact mirror of the recorded emergency mint
(`reserve override <amount> to <target> "<reason>"` →
`BankingApi.override(toAccountId, amount, reason)`): `reserve retire <amount>
from <target> "<reason>"` → `BankingApi.retire(fromAccountId, amount,
reason)`, posted through the conservation chokepoint as one ledger row from
the account to the reserve (category `retire`, memo the reason), so the money
supply falls by the amount. Same seat (`requiresGovernor`), same target
grammar as the override, the reason required. **Refused**, in words, when the
amount exceeds the account's balance or the target has no account (P3 —
never partial). The holder is told (a message to the account's owner if
present, the same channel a payment uses). The dashboard's overrides record
and the audit list retirements beside overrides. ⚠ Read the override's whole
path (`BankingLogic.override`, its supply bookkeeping, the dashboard and
audit readers) before writing; retire is its inverse on every one, not a
negative override. The purge (D4) is its first caller; a Governor in any
world may use it.

**D5 — One restart path.**
- `stopWorld({ graceMs? })` = `stopWorldWithin(graceMs ?? WIRE_STOP_GRACE)`;
  default grace **240 000 ms** (a busy world measured ~3.5 min to save —
  slate § 3), env `WIRE_STOP_GRACE`. Returns the `TimedStop` and prints
  `wire: world stopped in <s>s — shutdown captured N host(s), F failed` or
  `… KILLED at the <s>s grace; no shutdown report`.
- `restartWorld({ graceMs? })` = `stopWorld` (when something listens), then
  `bootOwnedWorld()`, then set `WIRE_SERVER_URL`; returns the `TimedStop`.
  Its private 180 s wait and bare preflight are deleted.
- `stopOwnedWorld()` (runner teardown) uses the same grace and prints the same
  line; `teardownTimeout` rises to grace + 60 s.
- `bootOwnedWorld()` and `reapOwnedPort()` pass `PREFLIGHT_GRACE_MS =
  WIRE_STOP_GRACE` to the preflight they spawn, so the 2 s kill is unreachable
  from the wire runner even when a stale world is found. `dev-preflight.mjs`
  itself is unchanged (its 2 s default is right for `pnpm dev`).
- Boot budget: `WIRE_BOOT_TIMEOUT` default **900 000 ms** in both readers
  (`boot.ts`, `global-setup.ts`'s reuse wait), from one exported constant.
- Heap flag: `serverArgs()` always adds `--heapsnapshot-near-heap-limit=1
  --diagnostic-dir=<.wire/heap>`; `WIRE_HEAP_SNAPSHOT=0` drops it. Every owned,
  kept and restarted world goes through `serverArgs()`, so none can lose it.
  ⚠ W0 confirms Node 22 takes the flag on `tsx`'s command line (the
  `--cpu-prof` route); if not, it rides `NODE_OPTIONS` set *after* the scrub.
  The CI job excludes `.wire/heap/` from its artifact.
- The copies go: every test file's own `restartWorld`, every inline
  preflight + `bootOwnedWorld`, and every test import of `../src/runner/boot`
  except `WIRE_LOG` / `WIRE_PORT` reads. `lint:wire-content` (D7) also fails
  on a test file that imports `bootOwnedWorld` or `stopOwnedWorld` or names
  `dev-preflight` — the rule that keeps the copies from coming back.

**D6 — Pack drives are found by a second include root.**
`vitest.config.ts` includes `../content/*/wire/**/*.wire.test.ts` beside
`tests/**` (soak variants likewise); the sequencer already sorts by name
across roots. `@saxonberg/wire` gains `"exports": { "./harness":
"./src/harness/index.ts" }` and a pack with drives lists it as a
devDependency (not a `@saxonberg/content-*` line, so discovery ignores it).
`global-setup`'s `soakFiles()` and the `wire:dirty` script read both roots
(the script becomes `vitest run --dir . '.dirty.wire.test.ts'`-style name
filter rather than a one-directory glob — W3 picks the exact form and checks
it selects the same files as today). `tools/soak`'s two path sites take a
second pathspec (`packages/content/*/wire/*.soak.*`). ⛔ Never gate on
`build/soak-repair`: make the two-line edit on this branch; whichever merges
second merges the other in. No existing drive moves in this build. The one
pack drive is the fixture pack's own
(`packages/content/test-fixtures/wire/scaffold.wire.test.ts`), which is drive
steps 1 and 7.

**D7 — The gate: `lint:wire-content`, a count that only falls.**
A wire drive *names placeholder content* when its text matches
`/\/world\/(?!testbed(\/|\b))[a-z]/` or `/\/corpo\/[a-z]/` — in a literal, a
constant or a comment-free line (strip comments first: a header that explains
where a drive used to stand is not a dependency). The scan covers
`packages/wire/tests`, `packages/content/*/wire` and
`packages/wire/src/harness` (so `crowd.ts` counts). The ceiling is a number
exported from the script, set at W1 to the measured count (expected 120 files
+ `crowd.ts`); it may fall, never rise; the script's test asserts the
invariant, not the number (lint-family.md ratchet lesson 2). A second,
zero-ceiling check in the same script: the restart-copy rule from D5.
**A drive under `packages/wire/tests` that is at zero must stay at zero** is
what the count gives for free; no per-file allowlist.

⚠ What the regex cannot see, handled by convention and stated in testing.md:
a `Session.open` with no `startLocation` lands in whatever the world's default
is. Migrated drives use `standIn()` (D8), and the two that land by default on
purpose (char-gen, the re-login step) assert nothing about where.

**D8 — The migrations.**
`scaffold.ts` exports the path constants (`TESTBED`, `PLAZA`, `APPROACH`,
`BANK`, `HALL`, `SHOP`, `CELLAR`, `CELLAR_DOOR`, `YARD`, `GATE`, …) and
`standIn(place, prefix, opts?)` = `Session.open(uniqueHandle(prefix),
{ startLocation: place, ...opts })`. `crowd.ts` moves to `PLAZA` / `APPROACH`
and the testbed's exit word.

- **Migrate whole (19):** platform-smoke, typecheck, canary.soak,
  aether-devices.soak, avatar-family, broadcast-ready, hydration, world-scan,
  crowd, crowd.soak, crowd-timing, call-security-performance, work,
  db-performance, soak-harness, client-surface, lock-reconciliation, boundary,
  recovery.
- **Split, then migrate the kernel half (11):** failure-model,
  call-security-pass, navigation-server, routing, location-graph, placement,
  envelope, injury, wizard-axis, nutrition-fitness, trades-and-labor. The
  content steps move, unchanged, to `<name>-content.dirty.wire.test.ts` beside
  the original; that file keeps its literals, stays in the census and is build
  2's to move. A split never weakens an assertion to make it generic.
- **Reclassified to build 2, untouched except the restart copy (6):**
  agent-coordination, identity, consequence, economic-bootstrap,
  zone-instancing, aether-devices (blocking). Identity's one generic step
  (asking about another player) moves into a small kernel file.

Per file, the rule of the edit: stand in the testbed; stage every consumable
(`hand`, `fundedAccount`, `standInNpc`, `stage`) inside the drive; assert only
on what was staged or on the scaffold's authored names; drop `founder` unless
the step is about the founder's seat, and where an office moves, put it back
in a `finally` as wizard-axis already does; rewrite fixed direction lists
against the testbed's exits; drop `.dirty.` from the name and `DIRTY_REASON`
when the file can run twice (that is the goal's own test), and correct the
stale reasons the survey found (avatar-family, boundary, hydration,
location-graph). A drive that names a `/trade/…` or `/stuff/…` row to `hand`
keeps its `declareFile({ packs })` line; pack rows are not locality content.

**The pass criterion**, per migrated file, run by `tools/wire-indifference`
(D9): fresh world · the same world again with no drop · after the whole suite
· with Terminus absent. *Terminus absent* is `SAXONBERG_PACKS` = every
discovered pack minus `terminus` and every pack that transitively depends on
it — computed by the tool from the packs' `package.json` files, never a
hand-kept list. A migrated drive whose declared `packs` include a dropped pack
is a finding (it was not migrated).

**D9 — The build's drive.** Three homes, because three of the eight steps are
runs of the runner, which a wire file cannot be:

| step | pace | where |
|---|---|---|
| 1 scaffold is there | instant · player | `packages/content/test-fixtures/wire/scaffold.wire.test.ts` — log in at each place, walk every exit, `look` in the lit rooms and in the cellar and passage, `bank open`, `job` at the venue, find each rostered NPC |
| 7 a pack's drive is found | instant · staged | the same file running at all, plus the run report naming its path |
| 6 a loaded world stops and comes back | short · player | `packages/wire/tests/test-world-lifecycle.wire.test.ts` — N players in the testbed holding handed things; `restartWorld()`; assert `killed === false`, a shutdown report with 0 failed, the listener's `/proc/<pid>/cmdline` carries the heap flag, each player is where they stood holding what they held |
| 8 the rule holds | instant · staged | the same file spawns `check-wire-content.ts` against a temp file naming `/world/terminus/x` and expects exit 1; and reads the reported count ≤ ceiling |
| 2 only in a test world | short · staged | `tools/wire-indifference --refusal`: `reset:db`, boot with `SAXONBERG_TEST_WORLD` unset on the wire port, expect the REFUSED line in the log and zero rows stamped `sourcePack: test-fixtures`, stop |
| 3 indifferent to state | short · staged | `tools/wire-indifference`: fresh boot, migrated set; same world, migrated set again; whole suite; migrated set again — three green readings from `.wire/result.json` |
| 4 no placeholder content | instant · staged | the tool's fourth leg: boot with Terminus absent, migrated set |
| 5 clean after itself | short · staged | the tool reads the purge report and `reserve supply` before and after a migrated run (equal); then kills a run partway (`kill` the vitest process) and shows the next start's purge report non-empty and the one after it empty |

`tools/wire-indifference` is a shell tool beside `tools/suite` and
`tools/soak` (it takes the suite lock, honors `WIRE_PORT`, refuses
`saxonberg_demo`); it is not a `scripts/drive-*.ts` and `lint:drive-scripts`
is unaffected. No span step, no soak drive.

## ⭐⭐ Host placement

- **`testOnly`** is on the pack manifest. Everything else that has a manifest
  answers "no" by default — which is the honest default-no test failing on
  purpose here: the mark is an exception by design, one pack today, one per
  pack-with-fixtures after build 2 if that open resolves that way. It is not a
  guard re-narrowing a host; it is the gate itself. It is **not** on rows
  (a per-row test-only flag would let a live pack ship half-test content) and
  not on `SAXONBERG_PACKS` (an operator setting cannot be allowed to say yes).
- **`purgeTestLitter`** is on `TestHarnessApi` / `TestHarnessLogic`, with the
  other test-world statics; it adds no field to any class. It asks each owner
  to do its own removal, so no world class learns that tests exist.
- **Scaffold rows** compose only what their consumers use. No row carries a
  capability for a drive that was reclassified; when a step moves to build 2,
  its scaffold piece is deleted in the same commit.
- **No field is added to any kernel class.** If W5's census finds litter that
  no owner primitive can remove, that is a finding recorded in the plan, not a
  new `testRun` field.

## Convention conformance

- **`props:` / `cast:`** for every placed thing and NPC; no `container:`
  (`lint:instanceable`); no `hydratorClass:`.
- **Locations, not rooms** — `Location` / `Hall` / `Locale` classes as the
  exemplars use them; every place plots on the testbed's zone.
- **Namespace** — a place under `/world/testbed` (the *where* axis); the pack
  ships no class, so it needs no `src/` and holds its root only for its rows
  and documents.
- **Module scope, import boundary** — the only kernel source touched is
  `PackLogic.ts`, `mud/api/pack.ts`, `test-harness.ts`, `TestHarnessLogic.ts`,
  `TestHooks.ts`, `TestAuthRoutes.ts`. No new module, no exported helper.
- **Verbs on objects** — the purge calls owner methods and existing Api
  orchestration; it adds no `XApi.verb(host)`.
- **P3 refuse / skip / throw** — a test-only pack outside a test world:
  refused with a line; named in `SAXONBERG_PACKS` there: throw. Purge in a
  non-test world: skip, said. A stop that overruns: killed, reported. A
  missing scaffold path at login already answers 500 with the message.
- **P4 no duck typing** — the pack imports nothing; the harness reads the
  world only through verbs and the test routes.
- **P5 the mixin decides** — no controller is added or changed.
- **P6 persistence per content** — scaffold rows are staged content that
  re-reads from its rows; nothing in the pack asks to be captured live. W3
  checks whether a Business's roster state is snapshot-backed and, if so, that
  the purge's reset covers it.
- **P7 load on use** — no boot entry by default (D2); the purge enumerates
  testbed places from the pack's own install record, not a world scan.
- **P8 names** — `testbed` (a place), `test-fixtures` (a pack), `stand-in`
  (an NPC row): nouns for what they are. American English throughout.
- **No migrations, no new collection, no new `isWizard` check.**
- **Gates this build must pass:** `lint:family` whole, and by name
  `lint:untitled`, `lint:instanceable`, `lint:location-graph`,
  `lint:reachability`, `lint:shopfronts`, `lint:counters`,
  `lint:light-sources`, `lint:ground`, `lint:identity`, `lint:dossiers`,
  `lint:authored-prose`, `lint:content-refs`, `lint:boot-entries`,
  `lint:schema`, `lint:gates`, `lint:test-content`, `lint:drive-scripts`, and
  the new `lint:wire-content`.

## Waves

Each wave ends at a commit and leaves the suite runnable. Gate per wave:
`pnpm test:near`, the touched packs' vitest, `lint:family`. Wire runs use
`WIRE_PORT=2014`, with `NODE_OPTIONS= VSCODE_INSPECTOR_OPTIONS=` prefixed.

**W0 — One restart path.** D5. Files: `runner/boot.ts`,
`runner/global-setup.ts`, `harness/world.ts`, `harness/index.ts`,
`vitest.config.ts`, every test file with a copy (grep `runner/boot`,
`dev-preflight`, `function restartWorld`), `.gitlab-ci.yml` (artifact
exclude). Acceptance: no test file imports `bootOwnedWorld` /
`stopOwnedWorld`; one owned boot shows the heap flag on the server's command
line; `navigation-server`'s restart step passes through the new path.
Commit: `refactor(wire): one stop and restart path — grace, budget, heap flag`.

**W1 — The census gate.** D7. Files: `packages/server/scripts/
check-wire-content.ts` (+ `__tests__`), `packages/server/package.json`
(`lint:wire-content`), `docs/lint-family.md` (one entry). Acceptance: the
script prints today's count and passes; a planted literal fails it; the
restart-copy check is at 0. Commit: `lint(wire-content): census of locality
paths in wire drives, gated at today's count`.

**W2 — The test-only mark.** D1. Files: `PackLogic.ts`, `mud/api/pack.ts`,
`PackLogic` unit tests (a fixture pack root with `testOnly: true`: installed
under a test env, refused with the line when `isTestEnvironment` is false,
throw when named by `SAXONBERG_PACKS`, throw when a non-test pack depends on
it), `scripts/pack-roots.ts` if it validates manifest keys,
`docs/subsystems/content-packs.md` § The manifest. Acceptance: those tests;
every existing pack still parses. Commit: `feat(packs): a pack can declare
itself test-only`.

**W3 — The fixture pack, and the runner finds its drive.** D2, D6. Files:
`packages/content/test-fixtures/**`, root `package.json` (+ `pnpm install`),
`vitest.config.ts`, `packages/wire/package.json`, `global-setup.ts`,
`tools/soak`, `harness/scaffold.ts` (constants only),
`test-fixtures/wire/scaffold.wire.test.ts`. Acceptance: the lint family green
with the pack present; a test world's boot line shows it installed and
titled; drive step 1 passes, including `look` in every place in its own light
(review question R5) and at night for the outdoor ones; the run report names
the pack drive. Commit: `feat(test-fixtures): the testbed scaffold, and
drives found in packs`.

**W4 — Staging helpers.** D3. Files: `harness/scaffold.ts`,
`harness/index.ts`, `harness/crowd.ts`, additions to the pack drive proving
each helper twice in a row on one world. Acceptance: `fundedAccount`,
`standInNpc`, `stockCounter`, a testbed `house appoint` each pass on a world
that has already run them. Commit: `feat(wire): scaffold staging — funded
account, stand-in, stock`.

**W5 — `reserve retire`, then the purge.** D10, D4. First commit:
`reserve retire` (the view subcommand, its controller, `BankingApi.retire`,
`BankingLogic`, the dashboard and audit lines, unit tests: the balance and the
supply fall by the amount, the ledger gains one row, an over-balance or
no-account retire is refused and posts nothing, the holder is told), and
`docs/subsystems/banking.md` § the reserve. Commit: `feat(banking): reserve
retire — the reserve's recorded sink`. Then the purge, which opens with the
per-collection census written into this plan. Files: `test-harness.ts`, `TestHarnessLogic.ts`, `TestHooks.ts`,
`TestAuthRoutes.ts`, `harness/world.ts` (`purgeLitter`), `global-setup.ts`,
`boot.ts` (the live-database refusal), unit tests for the logic over a staged
character. Acceptance: after a run of the pack drive, the report's counts are
non-zero and a second call returns all zeros; `reserve supply` is equal
before and after; a profile named `founder` is never touched (a test).
Commit: `feat(wire): a run purges what it made`.

**W6 — Migrations, whole files (19).** D8. One commit per small group
(crowd family; doors — boundary, lock-reconciliation; money — work,
db-performance; the rest). Acceptance per file: at zero in the census, green
twice in a row on one world. The ceiling in `check-wire-content.ts` falls in
each commit. ⚠ `call-security-performance.baseline.json`,
`db-performance.baseline.json` and crowd-timing's bounds were recorded
standing in Terminus: re-record on a quiet box per testing.md § The quiet box
and say so in the commit; never loosen a bound to pass.

**W7 — Migrations, split files (11) and the six restart-only touches.** D8.
One commit per file: the split, then the kernel half's migration. Acceptance
as W6, plus the `-content` half still green on a full world.

**W8 — The drive.** D9. Files: `tests/test-world-lifecycle.wire.test.ts`,
`tools/wire-indifference`. Run all eight steps and step 5a (`reserve retire`, in the test-world-lifecycle wire file, asserted as the holder sees it); append the drive record
below. Make each checkpoint fail once on purpose first (B2). Commit:
`drive(test-world-lifecycle): <what driving found>`.

**W9 — Docs.** `docs/testing.md` (the scaffold and its rule, staging, the
purge, the restart path, the budget and grace, pack drives, the gate — and
the retired advice to drop the database before a dirty run),
`docs/subsystems/content-packs.md` (the `testOnly` key, the pack in the
shipped list), `docs/lint-family.md`. Index files (`CLAUDE.md`,
`workflow.md`, `roadmap.md`, `slates/README.md`) are left to the sweep.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| testbed bank | platform `bank` | the `BankCounter` in `location/bank` `props:` | `bank: testbed-bank` on the counter | the place loads its props on first login there | none |
| testbed venue jobs | `job`, `clock`, `house appoint` | the Business's `operatingLocations` name the hall and counter | positions, `rosterSlots`, committee authority | on use via `operatingLocations`; a `boot:` entry only if W3 proves the roster tick needs it | `house appoint` needs the testbed committee seat |
| testbed shop | `buy`, `shelf consign` | the `Stock` counter and shelf in `props:`; `businessPath` | par lines of commons goods | with the place | `lint:shopfronts` / `lint:counters` |
| doors, window, trap, hearth, forge | platform verbs | the exit's `door:` / the place's `props:` | authored state | with the place | none |
| the purge | none (a route) | `POST /auth/test-purge`, mounted with the other test routes | — | `TestHarnessLogic` as today | `AUTH_MODE=test` mount, the token header, `@TestOnly` |
| pack drives | `pnpm wire` | the second include root | — | — | — |

## Acceptance-criteria coverage

| criterion | waves | note |
|---|---|---|
| the 19 migrated and the 11 kernel halves pass fresh · reused · after the suite · Terminus absent; the 6 and the 11 halves recorded for build 2 | W6–W8 | as amended (owner ruling) |
| the Governor can retire money to the reserve, with a reason, on the record, the holder told | W5 (D10), W8 step 5a | a player-visible operator act |
| none names placeholder content | W1, W6, W7 | the 30 at zero; the gate holds them |
| the fixture pack installs only in a test world | W2, W8 step 2 | |
| a test character can stand, walk, bank, find work, find NPCs | W3 step 1 | |
| a run leaves no characters, clones, appointments, minted money; a crashed run's are removed | W5, W8 step 5 | bounded as D4 says for unmigrated drives |
| every stop waits for the save and reports; no drive carries a restart; the heap diagnostic survives | W0, W8 step 6 | |
| a drive in a pack runs with the suite | W3 | |
| a drive naming a locality is refused; the count cannot rise | W1, W8 step 8 | "refused" is for a file at zero or a rise in the count; the ~100 still counted are not refused |

## Test & gate strategy

- **Unit tests:** the manifest key and `discover()`'s four outcomes (W2); the
  gate's classifier and its invariant (W1); the purge logic over a staged
  character and the `founder` survivor (W5).
- **Only the drive proves:** the scaffold is walkable and lit; the restart
  keeps players and things; state indifference; cleanliness; the refusal in a
  real non-test boot.
- **Paces:** every step is `instant`, `short` or `staged` (D9's table). No
  span step, so no staged twin and no soak drive. Step 6 restarts the world
  (review question R4).
- **Blocking drive:** all eight steps. **Soak drive:** none.
- **No browser walk** — the build adds nothing a player in a played world can
  reach; say so at the MR (B3 answered *not applicable: test worlds only*).
- **The full suite** runs through `tools/suite` at code-complete and at
  `/finalize` only. The three-way runs in step 3 are wire runs, not `pnpm
  test`.

## Risks & opens

1. **The premise (owner).** 30/11/6 instead of 36, and a fourteen-place
   scaffold. Confirm before W6.
2. **A bank sink.** If no primitive returns money to the mint through the
   chokepoint, the purge cannot honestly zero minted money. Preferred: the
   reverse of `reserve override` on the same path. If that needs a new
   banking primitive, it is a kernel addition the plan did not list: record it
   under B1 with its P-lines before writing it.
3. **Timing baselines** move when the crowd stands among three NPCs instead of
   Terminus's cast. The numbers will improve for a reason that is not the
   code; the re-record must say so, and db-performance's decision-text
   baseline changes wholesale.
4. **A scaffold piece owned by another pack** (the low door, the climb, the
   trap's re-arm) — drop the piece and move the step (D2), do not add a
   dependency.
5. **Rostered-around-the-clock NPCs** are an unusual roster; if the roster
   tick or wage settlement misbehaves at `[0, 24)` every day, that is a
   finding about employment, not a reason to script the NPCs.
6. **The start-of-run purge under `WIRE_REUSE`** removes a previous run's
   characters by design. A developer who kept a world to inspect a character
   loses it on the next run; `WIRE_KEEP_LITTER=1` skips both purges and the
   run report says so.
7. **`tools/soak` and `boot.ts` overlap `build/soak-repair`.** Edit here,
   merge theirs in if it lands first; never wait.
8. **`Terminus absent`** may expose packs that reference Terminus rows without
   declaring the dependency (a thrown `extends:`). Each is a real finding;
   fix the pack's `package.json` or record it for build 2.
9. **Heap snapshots are large.** One snapshot of a 3 GB world can exceed the
   disk a CI runner has; the flag is limited to one snapshot and CI excludes
   the directory from artifacts, but a runner short of disk should set
   `WIRE_HEAP_SNAPSHOT=0`.

## Deferred seams

- The 6 reclassified files, the 11 `-content` halves, the 62 pack drives, the
  22 sweeps and the 7 locality flows → **build 2**, test-world-lifecycle-slate
  § Build 2. This build adds two facts to that section at the sweep: the
  reclassified list, and that a pack with its own fixtures needs only
  `testOnly: true` on a second pack.
- Boot timing by phase → db-performance-slate § 5.
- A ceiling on default-landing logins (D7's blind spot) → wire-suite-growth-slate.
- The e2e purge and this purge converging, if the browser tests ever run
  against a test world → wire-suite-growth-slate § 8.

## Critical files

- `docs/requirements/test-world-lifecycle-requirements.md`,
  `docs/slates/tech-debt/test-world-lifecycle-slate.md`
- `docs/testing.md` § Attach or own, § The soak lane, § The quiet box;
  `docs/subsystems/content-packs.md` § The manifest, § Discovery, § The
  requires phase; `docs/lint-family.md` § census, then ratchet
- `packages/wire/src/runner/boot.ts`, `global-setup.ts`,
  `packages/wire/vitest.config.ts`
- `packages/wire/src/harness/world.ts`, `session.ts`, `crowd.ts`
- `packages/server/src/mud/platform/idea/api/PackLogic.ts` (`MANIFEST_KEYS`,
  `readManifest`, `discover`), `packages/server/src/mud/api/pack.ts`
- `packages/server/src/mud/api/test-harness.ts`,
  `…/platform/idea/api/TestHarnessLogic.ts`,
  `packages/server/src/backend/TestHooks.ts`,
  `packages/server/src/services/auth/TestAuthRoutes.ts`
- `packages/server/scripts/purge-test-characters.ts`,
  `check-test-content.ts`, `check-drive-scripts.ts`, `dev-preflight.mjs`,
  `reset-db.ts`
- `packages/content/saxonberg-lounge/` (a locality pack's shape) and the
  exemplar rows named in D2's table
- `tools/soak`, `tools/suite`, `.gitlab-ci.yml` (`wire:`)

## Drive record

*(appended at build time)*
