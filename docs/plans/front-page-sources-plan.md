# Front-page sources — implementation plan

Executes [front-page-sources-requirements](../requirements/front-page-sources-requirements.md)
(**kind:** feature · **leads from:** kernel, first consumer the front page in this same build).
It gives the front page's anonymous read the facts behind four absent blocks — the host line, the
Office of the Prime Minister's notices and their archive, the calendar, the world's unmet demand —
plus operator-set footer links, and it settles which character an account takes part in the Compact
through (the **Compact character**). **One MR, no phase-gate stops** (owner, 2026-11-28): every
engineering fork below is decided and numbered; the build runs straight to the MR.

Seeding slate and reuse ledger: [front-page-slate § Reuse ledger for the plan](../slates/client/front-page-slate.md#reuse-ledger-for-the-plan).

---

## Grounding

Verified by opening the file, at `e203d1052`. Paths are from the repo root.

### The front read and the client

- `packages/server/src/backend/FrontRoutes.ts` — `GET /api/front`, anonymous, `ALLOWED_KEYS =
  {watch, carrier}` (any other key → 400), body `{}` on any throw. Calls only
  `StreamApi.frontListing(watch, carrier)`.
- `packages/types/src/index.ts` — `FrontResponse { show?: ProgramListing }` (~3398);
  `ProgramListing { name, title, ownerName?, live, feeds, nextShow? }` (~3380);
  `PublicReleaseRow` (~303) is a **standalone frozen interface** (no `author`, no `expiresAt`) —
  the precedent for every anonymous row type this build adds.
- `packages/client/src/components/StartScreen.tsx` — `useFrontAnswer()` fetches `/api/front` with
  `credentials: "omit"` on mount and every 60 s, never awaited by sign-in; *Coming up* renders only
  `show.nextShow` (free text, ~512); the footer (~537) is panterasbox.com, the carriers, the source.
- `packages/client/src/components/front/ShowTile.tsx` — the byline already draws `PixelAt` inside an
  `Avatar` whose border is `tokens.color.seal` while `show.live` (~122, ~150); it prints
  `show.ownerName` and `Offline · next show ${show.nextShow}`.
- `packages/client/src/components/front/Latest.tsx` — fetches `/api/press/releases` itself
  (`credentials: 'omit'`, one attempt, renders null on failure). It is already an independent slice.
- `packages/client/src/components/CharacterSelect.tsx` — reads `charGenRoster` and `accountStanding`
  from the store (`store/index.ts` ~644–663, `setCharGenRoster(roster, account, accountName)`).
- The client has no router; `App.tsx` reads `window.location.search` (~368).
- Brand glyph sources: `docs/design/brand/bobalu/at-avatar.svg`, `at-avatar-glow.svg`.

### Offices

- `packages/server/src/mud/platform/idea/OfficeRegistry.ts` — `holderOf` returns
  `explicit{holderPlayerId}` · `founder{founderLabel}` · `unknown`; `roster()` rows carry
  `holderPlayerId|null`, `isFounderDefault`, `founderLabel`. `founderLabel` is the env handle **or
  the email** (`founderDisplay`, ~107). `holdsOffice`/`officesOf` answer the founder default with
  `computeIsFounder(playerId)` — true for **every character of the founder's account**.
  `resolveUserForPlayer` is `User.find({ playerIds: playerId })`.
- `packages/server/src/mud/lib/governance/Office.ts` ~206–219 — `OfficeHolderResult`,
  `OfficeRosterRow` (both carry `founderLabel`). `OFFICE_APPARATUS` has **eight** offices
  (`office.yaml` help), not five.
- `packages/server/src/mud/api/compact.ts` — the office face on `CompactApi`: `officeHolderOf`,
  `holdsOffice`, `officesOf`, `isFounder`, `officeRoster`, `founderLabel`, `assignOffice`
  (gated to `OfficeAssignController`), `assignOfficeForTest` (`@TestOnly`), `vacateOffice`. Logic:
  `packages/server/src/mud/platform/idea/api/CompactLogic.ts` (module-private `…Impl` functions).
- `founderLabel` reaches output at exactly two sites: `cmd/governance/OfficeListController.ts`
  (`${row.founderLabel} (founder)`) and `cmd/social/GroupControllerBase.ts:72`.
- `office assign <player> <office>` binds a character (`target.getPlayerId()`); the stored holder is
  a `playerId`. `requiresFoundingAuthority` (`lib/command/validators/`) is `CompactApi.isFounder`.
- Views: `packages/content/platform/content/platform/cmd/governance/office.yaml`. Avatar-wide verbs
  are contributed from `packages/server/src/mud/lib/character/Persona.ts` (~152 `standing.yaml`,
  ~164 `office.yaml`); the pre-world `Login` contributes `embody.yaml` and `play.yaml`
  (`platform/idea/Login.ts` ~141).

### Accounts, characters, standing

- `packages/server/src/mud/lib/identity/User.ts` — a `Document` in `users`; `fieldMeta` persists the
  three provider FKs and `playerIds`. No designation exists. `packages/server/src/schema/users.yaml`
  has no index on `playerIds`.
- **No character deletion ships.** `playerIds` is only ever pushed (`EmbodyController.ts:705`,
  `TestHooks.ts:235`) or rolled back in the same act (`EmbodyController.ts:709`).
- `Login.playCharacter` (~409) reads the account through `this.interactive.getUser()`;
  `presentRoster` (~450) sends `CharGenRosterPayload { characters, accountName?, account? }`.
  `PlayerApi.loadAvatarsForUser` loads **every** character of the account at login.
- `packages/server/src/mud/lib/character/Avatar.ts` ~750 — `getAccountSubjects()` returns
  `{ subject: 'account:<userId>', members }` from the runtime `user` pointer, `undefined` with none.
- `packages/server/src/mud/api/influence.ts` ~121 — `standingForHost(host, stock)` returns
  `InfluenceStanding | undefined`; three callers: `cmd/social/StandingController.ts:53`,
  `platform/idea/api/ProfileLogic.ts:321`, the `makeStanding` subscribable field in `Avatar.ts:542`.
  `Login.accountFigures` (~503) calls `standingForAccount` directly.
- **Votes have a record.** `packages/server/src/mud/api/conviction.ts` — `hold/abstain/flip/drop/
  positionOf/tally/quorumWeight` over the `positions` collection (index `{subject, stock, target}`);
  *"No verb consumes this yet."* There is no read of every position one subject holds.

### Press

- `packages/server/src/mud/lib/press/Release.ts` — `ReleaseData` has `publishedAtS`/`expiresAtS` in
  **game seconds**, `kind` (`event` among five), `source` (a repost's provenance line),
  `visibility`; no event date. `getVisibility()` clamps to the publisher's reach.
- `packages/content/platform/content/kinds/release.yaml` — `dated: { field: publishedAtS, indexed:
  true }`, indexed fields `pinned`, `releaseId`.
- `packages/server/src/mud/platform/idea/api/PressLogic.ts` — `pressRoomImpl` (~398) filters the warm
  window by placement (`press.frontPage`) then permission (`public`); `archiveImpl` (~311) is
  `DocumentApi.findByKey('release', 'date', {max, order: 'desc', limit})` with over-fetch.
- `packages/server/src/backend/PressRoutes.ts` — `/api/press/archive` is `requireAuth`;
  `/api/press/releases` is anonymous and answers `before=` with a 400.
- `packages/content/platform/content/settings/press.yaml` — `press.frontPage:
  "/compact/press,/world/terminus/gazette"`. `packages/content/platform/content/compact/executive.yaml`
  — `visibility: members`, `feedPath: /compact/executive/feed`, publishing positions
  `communications-director`, `press-secretary`.
- `packages/content/platform/content/platform/cmd/system/press.yaml` — `press post|edit|retract` with
  options `as`, `body`, `visibility`, `source`, `kind`, `pin`, `expires`.

### Programs

- `packages/server/src/mud/lib/livestream/Program.ts` — `ProgramData { title, owner, ownerName,
  schedule: string, feeds, runner }`; a value object written only through `DocumentApi.saveProgram`
  (kind `program`, `filed: program`). `owner` is a titled path; a player's home is
  `/home/<playerId>` (`StreamLogic.homeOf`, ~903). `runner` is the playerId in the chair.
- `StreamLogic.ts` — `frontListing` (~591), `listingOf` (~1007, sync), `amendProgram` (~522, takes
  `{title?, schedule?}`). `cmd/stream/ProgramScheduleController.ts` + `program.yaml` `schedule`
  subcommand take one free greedy line and `--clear`.
- The game clock (`api/worldclock.ts`) runs at scale 12, pauses and jumps: it cannot be mapped to a
  visitor's wall clock. `stream.yaml`'s header already states *"Wall-time … the stream is interface
  tier, outside the fiction."*

### Demand

- **Gigs** — `packages/server/src/mud/lib/employment/ContractRecord.ts`: `findByKind(kind, state)`
  over index `{kind, state}`; `postingExpiresAt` (game seconds, 0 = never) is lazily enforced, so a
  read must check it; `rewardMinor`, `postedAt`, `origin` (the place the work starts — the poster's
  own place when unsaid), `boardPath`, `issuer`. The gig's sentence is composed in a controller:
  `cmd/work/JobBrowseController.ts` `describeGig` (~59).
- **Seats** — `packages/server/src/mud/lib/employment/Organization.ts` ~614–644: `openingsFor` =
  `max(headcount, rostered) − holdersOf`, `openings()` → `Opening[]`. Holders are **not a
  collection**: `EmploymentLogic.holdersByPositionImpl` (~237) unions live `EmployedMixin` actors'
  records with the organization's authored roster. So a house's openings can only be computed by the
  live house — and they can only *change* while it is live (a hire runs `organization.hire`).
- `EmploymentLogic.ts` — `allBusinessesImpl` (~476) is `StuffApi.findByMixin('BusinessMixin')` (live
  only); `runTick` (~1728) passes every live house once a game hour; `bringHouseCurrent(house,
  force?)` (~2296) is the same one-house pass run early when somebody arrives (`noticesAt`, ~2197,
  which also skips `business.isClosed()`).
- **There is already a derived, search-free roster of every house**: the location graph's attachment
  record. `NavigationApi.attachedTo(path, 'house')` / `attachedWithin(extent, 'house')`
  (`api/navigation.ts` ~250; `platform/idea/LocationGraphRegistry.ts` ~390) derive, from each house's
  own `operatingLocations`, which houses are attached to which places. `EmploymentLogic
  .housesAttachedTo` (~490) stands a house up from it with `StuffApi.singleton(path)`.
  `withinAt` tests `anchor === extent || anchor.startsWith(extent + '/')`.
- **Buying** — `packages/server/src/mud/lib/retail/Stock.ts`: a `StockLine` with `buys: true` (~108);
  `scarcityOf(line)` (private, ~321) is the one "how short" read (`1 − onHand/par`, or days of supply
  for a store-fed line); `buyingWords()` (~828) names a line by its template leaf. A supplier's
  counters are found from the house: `getOperatingLocations()` → `StuffApi.findByTemplatePath` →
  `instanceof Stock` (`supplierHolds`, ~309). Stock state lives only on the live counter.
- **A house may file a document under its own branch**: `DocumentApi.saveAsBusiness(business, path,
  kind, data)` (`api/document.ts` ~365) — derived owner, path under the business's branch, kind
  declared `filed: business` (`content/kinds/cap-table.yaml` is the precedent, at
  `<company>/cap-table`). `DocumentApi.findByKey(kind, key, {min, order, limit})` reads a kind by a
  declared card key through the one wildcard index; `listOfKind(kind)` lists a kind.
- `packages/server/src/schema/location_graph.yaml` is the precedent for *a derived, persisted
  projection that is never a source of truth and may be dropped at any moment*.

### Settings, tests

- `packages/server/src/mud/lib/config/AppSettings.ts` — `AppSettingKeys` (~595, ~732) and the
  entrenchment-tier table (~2794, `"B"` for the press and stream keys); seeds in
  `packages/content/platform/content/settings/*.yaml` (merge-missing).
- Wire harness: `packages/wire/src/harness/` — `Session.open(handle, {offices, linked, streamer,
  …})`, `restartWorld()`, the scaffold at `/world/testbed` (`scaffold.ts`: a plaza noticeboard, a
  venue hall with three seats, a shopfront that restocks to par). The founder is the handle
  `founder` (`runner/boot.ts:129` sets `FOUNDER_GOOGLE_EMAIL=founder@e2e.local`). `TestHooks
  .provisionCharacter` (`backend/TestHooks.ts` ~213) gives a user **one** character and treats
  `playerIds[0]` as *the* character. `packages/wire/tests/stream-arrival.wire.test.ts` is the
  closest precedent (program, featured setting, `/api/front`, restarts).
- `testharness clock-advance <dur>` moves the game clock (a day at most).

---

## ⭐⭐ New substrate

| # | item | ledger row / status |
|---|---|---|
| S1 | `User.compactPlayerId` (field) + `User.compactCharacterId()` (method) | row 1 — **genuinely new**: searched `User`, `users.yaml`, `Avatar`, `AccountScoped`; nothing designates a character |
| S2 | `CompactApi` statics `compactCharacterOf` · `isCompactCharacter` · `designateCompactCharacter` · `publicFaceOf` (+ `CompactLogic` impls) | rows 1–2 — methods on the existing meta-institution facade; no new Api |
| S3 | the `compact` command view + `CompactController` / `CompactCharacterController` | row 1 — genuinely new verb (searched every pack's `cmd/`: no `compact` view) |
| S4 | `ConvictionApi.positionsOf(subject)` (+ `Position` finder) | genuinely new read on the existing Api; the seven statics have none by subject |
| S5 | `OfficeHolderResult` / `OfficeRosterRow` reshaped: the founder kind carries `holderPlayerId \| null`; **`founderLabel` deleted** from the type, the registry, `CompactApi`, `CompactLogic` | row 2 — generalize, the specific one gone |
| S6 | `AccountSubjects.compact` + `standingForHost` returning a three-way `HostStanding` | row 1 — "only its display host changes"; one seam, three callers |
| S7 | `WallTime` (value object, `lib/time/`) and `WeeklySlot` (value object, `lib/livestream/`) | rows 7–8 — genuinely new: searched `lib/time/`, `lib/calendar/`, `lib/livestream/` — every existing time type is game time |
| S8 | `ProgramData.slot` + `returnsOn` **replacing** `schedule`; `ProgramListing.schedule?` (words) + `nextShowAt?` **replacing** `nextShow` | row 8 — replace |
| S9 | `ReleaseData.eventOn/eventAt/eventZone`, card key `eventAt`, `press post --on/--at/--zone`, `PressApi.upcomingEvents`, `PressApi.publicArchive`, route `GET /api/press/public` | rows 5–7 — generalize |
| S10 | document kind `house-needs` (`filed: business`) + `HouseNeeds` value object (`lib/employment/`) | rows 10–12 — the slate's "small derived digest", filed by the house under its own branch |
| S11 | `Business.needs()` · `Stock.buyingNeeds()` · `EmploymentApi.topNeeds()` · the filing step and the first-report stand-up in `EmploymentLogic` | rows 10–11 — reuse `openings()`, `scarcityOf`, `saveAsBusiness`, `attachedWithin` |
| S12 | `ContractRecord.actPhrase()` (moved out of `JobBrowseController`) · `ContractApi.topOpenGig()` | row 9 — reuse; a controller's sentence moves to the record |
| S13 | settings `front.discordUrl` · `front.publicRecordUrl` · `front.privacyUrl` | row 13 — reuse AppSettings |
| S14 | wire types `FrontHost`, `FrontEvent`, `FrontNeedRow`, `FrontLinks`; `FrontResponse` slices; `CharGenRosterPayload.compactPlayerId` | row 4 — generalize |
| S15 | client components `front/ComingUp.tsx`, `front/WorldNeeds.tsx`, `front/Archive.tsx` | client only |
| S16 | reason rows (D-list below) | row 3 — reuse `Refusal` + rows |
| S17 | test tooling: `GET /auth/test-front?now=`; harness `characters` / `character` options | tooling the drive owes |

**No new mixin, no new Api class, no new logic singleton, no new registry, no new Mongo collection,
no new hook, no new module category, no new exported helper function.** One new document kind (S10).

### P9–P14, per item

| item | P9 predictable | P10 metadata = document | P11 no caller branching | P12 no synonym | P13 fits its host's sentence | P14 nothing invisible |
|---|---|---|---|---|---|---|
| S1 | n/a (no command) | a field on the account's own record, written by one act and queried by the account — state, not vocabulary | none | none | `User` = "owns character slots" — which slot is the account's face is that | the default (first character) is stated in `compact`'s help and shown at character select |
| S2 | n/a | n/a | callers ask the facade; nobody tests a giver's class | no existing call answers any of the four | `CompactApi` = "the single meta-institution facade" | `designate` refuses with a reason, never substitutes |
| S3 | the view's help states the default, both locks and both places it is typed | n/a | one controller for `Login` and an embodied body — it asks the facade for the acting account | `office assign` seats; nothing designates | category `governance` beside `office` | bare `compact` only reads |
| S4 | n/a | n/a | none | `positionOf` is one row by full key; this is all rows by subject | conviction's own Api | read only |
| S5 | `office list` prints a character or *the founder* — help updated | n/a | the three-kind union is unchanged; one field renamed | removes a label, adds none | the registry = "who holds an office" | the founder default resolving to a character is printed as *(by default)* |
| S6 | `standing`'s help says where Make and Fund are shown | n/a | every caller switches on the same closed union — that is the union's purpose, not a destination test | replaces the old return, does not sit beside it | `AccountScoped` = "the account seam for account-level standing" | the *elsewhere* arm replaces a silent omission |
| S7 | n/a | value objects, no rows | none | no wall-time type exists | named for what they are | a time with no zone is refused, never assumed |
| S8 | `program schedule`'s def names day, time, zone, `--returns`, `--clear` | a field on the program document | none | replaces the free line | `Program` already owns "a schedule" | next show is derived and printed back at set time |
| S9 | `press post`'s def lists the three options and that only `event` releases reach the calendar | fields on the release document | none | no existing date field means "when it happens" | `Release` = "one item a publisher has put out" | `--at` without `--zone` refuses |
| S10 | n/a | **a document** with a value class over it (the `Program` / `Release` shape) | none | no summary of needs exists | filed under the house's own branch | the house writes only its own report |
| S11 | n/a | n/a | `topNeeds` reads one kind by key; never asks what a house is | `openings()` and `scarcityOf` are reused, not re-derived | `Business` = an organization that trades: its seats and what it buys are its own | a stand-up is logged per house |
| S12 | `job` browse prints the same phrase as before | n/a | none | one phrase, moved | the record owns its clause | none |
| S13 | `config` help topic per key | settings | none | none | the `front.*` namespace is new and holds only the front page's links | unset = absent |
| S14 | n/a | n/a | none | none | standalone frozen row types | no poster, no price, no credential field exists to leak |
| S15–S17 | n/a | n/a | n/a | n/a | n/a | the test route is test-mode only |

---

## Plan-level decisions

### The Compact character

- **D1 — the designation is one field on `User`, derived on read.** `compactPlayerId?: string`
  (persistent) and `compactCharacterId(): string | null` = the stored id **when it is still in
  `playerIds`**, else `playerIds[0]`, else `null`. Every reader calls the method. *Why:* "each gets
  its first character on the first read; nothing is migrated" is then arithmetic, and a dangling id
  can never strand an account. No write happens on read.
- **D2 — character deletion's rule ships as arithmetic plus a named refusal, with no caller yet.**
  No character deletion exists (Grounding). "The next character becomes the Compact character" is
  D1's fallback. "Refused while seated or with a vote open" is `CompactLogic`'s lock (D4), the same
  function the change refusal uses; the future delete act calls it. Nothing is stubbed. → Deferred
  seams.
- **D3 — the verb is `compact`, category `governance`.** Bare `compact` prints your account's
  Compact character and what it carries. `compact character <character>` designates; `<character>`
  is a `string` matched against **your own account's** characters by playerId, then by name
  (case-insensitive, exact) — never MQL (an offline character is not runtime stuff). Contributed to
  an embodied body from `Persona.ts` beside `office.yaml`, and to `Login` beside `play.yaml`, so
  character select and the game type the same command. Lens 2: one command a player learns once.
- **D4 — the lock.** `designateCompactCharacter` refuses when the **current** Compact character
  (a) is the *explicit* holder of any office (an `office_holders` row) → `compact-seated` with the
  office's name, or (b) holds any conviction position (`ConvictionApi.positionsOf(identityPath)`
  non-empty) → `compact-vote-open`. The founder **default** is not a lock: it is the account's
  default and follows the designation (drive step 3 requires it). Other refusals:
  `compact-no-account` (a guest), `compact-not-yours` (no such character on your account),
  `compact-unchanged`.
- **D5 — "vote open" is honoured against the real record today.** A held `positions` row *is* an
  open vote (conviction voting is continuous: a stake is held until dropped). Nothing writes one in
  play yet, so the refusal is reachable only from a test — and correct the day a ballot verb ships.
  *The account's vote is cast by the Compact character* is a seam for that verb: it asks
  `CompactApi.isCompactCharacter(actor)`; this build adds no guard inside `ConvictionApi.hold`
  (its subjects are opaque strings and every caller today is a test).
- **D6 — after a designation the live bodies agree.** The write saves the `User` and restamps
  `compactPlayerId` on the `User` object of every live body of that account
  (`PlayerApi.findAvatarByPlayerId` per `playerIds`), because `Avatar.user` is a runtime pointer and
  two sessions may hold two objects. The controller answers one scene to the giver carrying the
  payload `{ compactPlayerId }`; the client stores it. No controller asks whether the giver is a
  `Login`.

- **D6a — (build) the words are named by the one rule, not a hand compare.** `lint:hand-matchers`
  refused D3's "playerId, then exact name" match. The binder is now `CompactApi.ownCharacterNamed
  (subject, words)` → `GrammarApi.nameAmong` over the account's own characters (keywords: name,
  id), named in the controller with `this.named` (so a tie prompts and an unknown word is
  `no-such-name`, listing your characters); `designateCompactCharacter(subject, playerId)` then
  takes an id and keeps `compact-not-yours` as its own guard. One more static on `CompactApi` than
  S2 listed. *Chosen by:* CLAUDE.md's naming rule (nearest pattern: `office`'s `officeNamed`).

### Offices seat characters

- **D7 — the founder default resolves to the founder account's Compact character.** `OfficeRegistry`
  gains one private read, the founder's seat holder: the founder's `User` (found from the configured
  credential: `GoogleProfile` by email or `TwitchProfile` by login → `User` by profile id) →
  `compactCharacterId()`. `holderOf`'s founder arm and `roster()` carry that `holderPlayerId` (or
  `null` when the founder has never signed in or has no character). `holdsOffice` / `officesOf`
  answer the default with *is this player that character* — so **the founder's other characters no
  longer hold the default seats**. That is the requirement (*offices seat characters, never
  accounts*), and it follows a designation change with no write.
- **D8 — founding authority stays the account's.** `isFounder` / `requiresFoundingAuthority` are
  unchanged: handing a seat off is the founder's act, not a seat's, and it must stay possible from
  any of the founder's characters (or a founder whose Compact character is elsewhere could never
  hand off). Lens 7: the criterion for a seat is the Compact character; the criterion for founding
  authority is the credential, as shipped.
- **D9 — `founderLabel` is deleted, not hidden.** The env values stay as the *recognizer* only.
  `office list` prints `<character> (by default — the founder)`; `the founder` alone when there is
  no character. `GroupControllerBase` prints the character's name through the same
  `presentHolder`, else `the founder`.
- **D10 — hand-off refuses a non-Compact character in the logic, not the controller.**
  `CompactLogic`'s assign path (shared by `assignOffice` and `assignOfficeForTest`) asks
  `compactCharacterOf(playerId)`; a mismatch is `{ ok: false, reason:
  'office-needs-compact-character', facts: { name, compact } }` and the controller calls
  `this.refuse`. `OfficeAssignResult` gains the refusal arm; the registry's `assign` stays a write.
- **D11 — the host line.** A program's **host** is the account behind it: the owner's player when
  `owner` is a home (`/home/<playerId>`), else the `runner`, else nobody. `CompactApi.publicFaceOf
  (playerId)` answers `{ name, seat?, acting? }`: `name` = the stored name of that account's Compact
  character; `seat` = the display name of the **first office in apparatus order** that character
  holds (the Prime Minister's seat is first); `acting` = that seat is on the founder default. A host
  with no character → `null` → no host line. `StreamLogic.frontListing` attaches it as `host`;
  `programListing` (in-game) does not compute it. No field of `FrontHost` can carry a credential.

- **D10a — (build) the hand-off refusal never names the other account's Compact character.** D10's
  `facts: { name, compact }` would tell the founder which character shares an account with the one
  refused — exactly the link the requirements' non-goal keeps closed ("the others stay unlinked to
  it for other players"). The row says only that the named character is not its account's Compact
  character; `facts: { name }`. *Chosen by:* the requirements (Non-goals), lens 4.
- **D10b — (build) `OfficeAssignResult` is a union with two refusal arms.** `{ ok: true, changed,
  priorHolderId }` · `{ ok: false, reason: 'no-such-name', facts }` (the registry's unknown key, in
  the shipped naming row's words) · `{ ok: false, reason: 'office-needs-compact-character', facts }`.
  The controller's worded `unknown-office` fail is gone: `if (!result.ok) return this.refuse(context,
  result)`. `GroupControllerBase` got its own three-line `presentHolder` (no shared base with
  `OfficeControllerBase`); an explicit holder there now prints a name, where it printed a raw id.

### Standing

- **D12 — `standingForHost` answers three ways.** `HostStanding = { at: 'here', standing } | { at:
  'compact-character', subject } | { at: 'unresolved' }`. A character-level stock is always `here`.
  An account-level stock is `here` only when the host **is** the account's Compact character
  (`AccountSubjects.compact === the host's subject`), `compact-character` otherwise. `Avatar
  .getAccountSubjects()` fills `compact` from `user.compactCharacterId()`. The arithmetic
  (`standingForAccount`, sum) is untouched.
- **D13 — the three surfaces.** `standing`: on the Compact character, Make and Fund as today; on
  another, *"Make and Fund are your account's — they are shown on <name>, your Compact character."*
  (name via `PlayerApi.storedNameOf`). `profile`: the self digest omits `make` unless `here`, and
  adds the same sentence for the owner only — **another player's view of a non-Compact character
  says nothing** (the requirements' non-goal: the others stay unlinked). The `makeStanding` live
  field: `{ band }` when `here`, `{ elsewhere: true }` when on the Compact character, omitted when
  unresolved. Character select: the roster payload carries `compactPlayerId`; the account figures
  render on that card, and the other cards say where they are.

### Notices, the archive, the calendar

- **D14 — content, not code, makes the one voice.** `press.frontPage` → `/compact/executive`;
  `executive.yaml` → `visibility: public`. ⚠ `settings` is merge-missing: a world already seeded
  keeps the old value. No migration (house rule): the wire boot and a fresh DB get the new one; the
  MR description tells the operator `config press.frontPage /compact/executive` for a standing
  world. `Latest.tsx` keeps its own fetch; its heading becomes *From the Office of the Prime
  Minister*, items are date + headline, a repost adds *— from <source>*, per-item publisher labels
  go.
- **D15 — the anonymous archive is its own route.** `GET /api/press/public?before=&limit=` →
  `PressApi.publicArchive({ before, limit })` → `PublicReleaseRow[]`: the `findByKey('release',
  'date', …)` read `archiveImpl` already does, filtered by the **same two filters as the press
  room** (placement on `press.frontPage`, then `getVisibility() === 'public'`), not retracted,
  owned. Unknown query keys → 400. `/api/press/archive` (signed-in) and `/api/press/releases`
  (window, refuses paging) are untouched — the PressRoutes header's argument for a separate
  anonymous route is the reason.
- **D16 — the calendar's times are wall-clock.** The game clock is scaled and jumps; the show and
  the Compact's events happen in the visitor's week. `stream.yaml` already records that the stream
  is interface tier in wall time. So an event date and a program slot are **civil date/time plus an
  IANA zone**, held by `WallTime`; nothing here is game time and nothing in the fiction reads it.
- **D17 — a release's event date.** `eventOn: 'YYYY-MM-DD' | ''`, `eventAt: 'HH:MM' | ''`,
  `eventZone: <IANA> | ''`. `press post … --on <date> [--at <time> --zone <zone>]`; `--at` needs
  `--on` and `--zone` (refusals `event-time-needs-date`, `event-time-needs-zone`); a bad value is
  `bad-date` / `bad-time` / `bad-time-zone`. `press edit` takes the same three. The kind declares
  `eventAtMs: { type: number, index: eventAt }` — written by the transport from `WallTime`: the
  instant for a timed event, 00:00 UTC of the date for a date-only one. Any kind may carry one; only
  `event` releases reach the calendar.
- **D18 — when an event has passed.** Timed: its instant is behind now. Date-only: the date has
  ended **everywhere** (the following midnight at UTC−12) — one fixed rule, no operator zone, and a
  visitor never loses today's event because the server is ahead of them.
- **D19 — a program's schedule.** `slot: { day: 0–6, time: 'HH:MM', zone } | null` and `returnsOn:
  'YYYY-MM-DD' | ''` replace `schedule`. `program schedule <name> <day> <time> <zone> [--returns
  <date>]`, `--clear` as today. `WeeklySlot.nextAfter(nowMs, returnsOn)` derives the next show: the
  first occurrence after now, and not before `returnsOn` in the slot's zone. The listing carries
  `schedule` (the slot in words, in the host's zone — for `program show`) and `nextShowAt` (epoch
  ms). The old free line is not read (no migration; a program re-states its slot).
- **D20 — the client formats, the server decides.** `/api/front` sends `events: FrontEvent[]`
  (`{ headline, date, atMs?, source? }`, future only, soonest first, at most four) and
  `show.nextShowAt`. The client merges them by time, keeps four, and formats with the browser's own
  zone (`Intl.DateTimeFormat`, `timeZoneName: 'short'`); a date-only event prints its civil date
  unshifted. The offline tile's words are formatted from the same `nextShowAt` by the same function.

### What the world needs

- **D21 — ⭐ the hardest call: each house files its own needs; the page reads the filings, never a
  house.** Three facts decide it. (1) A house's openings and a counter's shortfall can only be
  computed by the live house, and **can only change while it is live** — so the house is the one
  writer that is always current at the moment anything changes. (2) Stock state exists nowhere but
  on a live counter, so a pure derive-at-read would have to load every shop's place: walking the
  world, per visitor. (3) The kernel already has the exact shape: `saveAsBusiness` files a house's
  own paper under its own branch, and `findByKey` reads a kind by a card key through an index. So:
  a `house-needs` document at `<house path>/needs`, written by the house's hourly pass, read by
  `findByKey('house-needs', 'hiringOpen' | 'buyingShort', { min: 1, order: 'desc', limit: 8 })`.
  **Two index reads answer for the whole world with zero houses loaded.**
  *Against "derivable state must not persist" (document-store.md § the verb test):* that rule
  retires a cache the server can rebuild at boot. This one can be rebuilt only by standing every
  house and every shop up, which the load-on-use rule forbids. The governing precedent is
  `location_graph` — a derived, persisted projection that is never a source of truth and may be
  dropped at any moment. `house-needs` carries the same contract: delete every one and the next
  passes re-file them; nothing reads one to decide anything in the world.
- **D22 — what a report holds.** Flat data: `label`, `hiringOpen` (places in the house's largest
  opening, 0 for none or a closed house), `hiringWhat`, `hiringSinceS`, `buyingShort` (the deepest
  shortfall among its bought lines, per-mille 0–1000), `buyingWhat`, `buyingSinceS`. `…SinceS` is
  the game second this need first became the house's top need, kept while it stays the top one — the
  *newest* tiebreak. One top need of each kind per house is enough: the world's largest is the
  largest of the houses' largest, and when it is met the house's next pass files its next.
- **D23 — who computes it.** `Business.needs(previous)` returns the next `HouseNeeds`: hiring from
  `this.openings()` (zero when `isClosed()`, the `noticesAt` rule); buying from its **live** counters
  (`getOperatingLocations()` → `StuffApi.findByTemplatePath` → a `Stock`'s `buyingNeeds()`, which
  exposes `scarcityOf` for `buys: true` lines above zero). When none of its counters is live the
  buying half is **carried from `previous`** — stock cannot have moved while its counter was not
  there. `Stock.buyingNeeds()` and `buyingWords()` name a line through one shared method.
- **D24 — when it is filed.** In the one-house pass that `runTick` and `bringHouseCurrent` share,
  after the roster pass: compute `needs(lastFiled)`, and write through `saveAsBusiness` **only when
  it differs** from the last one filed (held transient on the house, read from the document on the
  first pass). Hourly by the tick, and early whenever somebody arrives. Fresh within a game hour.
- **D25 — a house nobody has ever stood up.** At the end of `runTick`: the houses in
  `NavigationApi.attachedWithin('', 'house')` that have no `house-needs` document
  (`DocumentApi.listOfKind('house-needs')` paths) are stood up, **at most
  `HOUSE_FIRST_REPORTS_PER_TICK = 4` per tick**, with `StuffApi.singleton(path)` — the
  `housesAttachedTo` act — and passed once, which files their first report (zeros included: the
  document's existence is what marks a house reported). Each is logged. This is load on use by an
  authored reference (the house's own `operatingLocations`, as the graph derived them), paid once
  per house per database, never per boot; residency evicts the house as usual afterwards. *Lens 2
  chose it:* a new town's shop appears on the front page with no code and nobody walking there.
  ⚠ The empty extent matching every anchor is `withinAt`'s prefix test; pin it with a unit test.
- **D26 — gigs are read live.** `ContractApi.topOpenGig()`: `ContractRecord.findByKind('gig',
  'open')`, drop `postingExpiresAt` in the past (game seconds), sort `rewardMinor` desc then
  `postedAt` desc, take one. `what` = `record.actPhrase()` (the `deliver … to …` / `watch …` /
  `clean …` phrase moved from `JobBrowseController.describeGig`, which then calls it); `where` = the
  name of the Locality covering the place the work starts (`NavigationApi.node(origin)` →
  its `address` → `AddressApi.coveringLocalityOf`). A gig whose place resolves to no Locality is
  skipped and logged — never shown with a path.
- **D27 — the ranking is in the read.** `EmploymentApi.topNeeds()` returns at most one hiring and one
  buying row: of the eight largest by key, the largest, ties to the larger `…SinceS`. The route
  appends the gig. Rows are `FrontNeedRow { kind: 'hiring' | 'buying' | 'gig', what, where }` — the
  type has no field for a poster, a reward or a price.

### The read, the footer, the client

- **D28 — `/api/front` fans out; every slice fails alone.** `FrontRoutes` runs five reads
  concurrently — `show` (with `host`), `events`, `needs`, `links` — each in its own `try` with its
  own 1500 ms budget (`Promise.race`); a slice that throws or overruns is absent and logged, the rest
  answer. The non-`show` slices are memoized for 15 s in the route (a visitor polls every 60 s; the
  founder lookup and three index reads should not run per visitor). Composition stays in the route:
  it is a fan-out with no rule in it — every ordering, filter and limit lives in the Api it calls.
- **D29 — footer links are three settings, validated at the edge.** `front.discordUrl`,
  `front.publicRecordUrl`, `front.privacyUrl`, shipped empty, tier `"B"`. The route sends
  `links: { discord?, publicRecord?, privacy? }`, each only when it parses as an `https:` URL; a set
  value that does not is logged and absent.
- **D30 — the staged clock is a test-mode route.** `GET /auth/test-front?now=<epoch ms>`, mounted
  with the other test-auth routes, answers the same body computed at `now` with no memo. Every Api
  read above takes `nowMs` (defaulting to `Date.now()`), the `ConvictionApi` precedent.
- **D31 — the archive is a view of the front page, not a route library.** `?archive` on the front
  page's URL renders `front/Archive.tsx` in place of the bands (a signed-out page with a back link);
  it pages `/api/press/public` with `before`. No router is added.
- **D32 — the `@` glyph.** The byline keeps the ring rule it has. The build compares `PixelAt` with
  `docs/design/brand/bobalu/at-avatar.svg`; if they differ, the SVG is copied to
  `packages/client/src/assets/brand/at-avatar.svg` and the byline uses it. The glowing variant stays
  the offline thumbnail's.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims | the two tests |
|---|---|---|---|
| `compactPlayerId`, `compactCharacterId()` | `User` | every account has a Compact character once it has a character | every `User` with a character answers; no guard narrows it |
| the designation write, the lock, `publicFaceOf` | `CompactLogic` (module-private impls, the file's pattern) | the Compact decides who its face is | not on `OfficeRegistry` — its header is *who holds an office*, and a designation is not a holding |
| the founder's seat holder | `OfficeRegistry` (private) | the default holder of every office is one character | it already owns founder resolution |
| `AccountSubjects.compact` | `lib/standing/AccountScoped.ts` | an account-scoped host can name the account's face | only `Avatar` implements `AccountScoped`; the value **differs per account**, not per host — it is the account's fact, carried in the account's own seam |
| `WallTime` | `lib/time/` | nothing composes it | value object |
| `WeeklySlot`, `slot`, `returnsOn` | `lib/livestream/`, `ProgramData` | every program may state a slot | a program with none answers `null` — and the show tile then says *Offline* alone, which is a designed state (slate § 5), not a "no" on most hosts |
| `eventOn/eventAt/eventZone` | `ReleaseData` | any release may be dated | ⚠ most releases will carry none. Accepted knowingly: the requirement is *a release may carry an event date*, the alternative is a second document kind for dated releases, which would split the one feed. Three empty strings on a document, no behavior hangs on them |
| `needs(previous)` | `BusinessMixin` (`platform/idea/Business.ts`) | every business can state its top seat and its top bought line | **not** `OrganizationMixin`: the Office of the Prime Minister has positions and must never file a Play line (its seats are *Make*, build 3). Of businesses, nearly all have seats or a counter; a house with neither files zeros once |
| `buyingNeeds()`, the shared line name | `Stock` (`lib/retail/Stock.ts`) | a counter can say which bought lines are short | a counter with no `buys` line answers `[]` — the same answer `buyingWords()` already gives; no new field |
| `actPhrase()` | `ContractRecord` | a gig can say its act | every gig has a clause |
| `house-needs` documents | under each house's own branch | a house's paper is the house's | `saveAsBusiness` enforces it |
| the filing step, the stand-up, `topNeeds` | `EmploymentLogic` | the roster tick already passes every live house | no new singleton |
| footer keys | `AppSettings` | operator-set | — |

No field lands on `Thing`, `Location`, `Agent`, `Avatar` or any base class.

---

## Convention conformance

- **Module categories** — every new file is an existing category: two value objects (`lib/time/
  WallTime.ts`, `lib/livestream/WeeklySlot.ts`, `lib/employment/HouseNeeds.ts` — three), two
  controllers, one command view, one kind declaration, reason rows, settings rows, client
  components. No free exported function: the route's private helpers stay unexported, as in
  `FrontRoutes` today.
- **Api ↔ Logic split** — every new static forwards to its existing logic singleton
  (`CompactLogic`, `PressLogic`, `EmploymentLogic`, `ContractLogic`, `ConvictionLogic`,
  `StreamLogic`), gated with that file's `…ApiCallers` policy.
- **Value-object statics** — `lint:lib-statics` is a ratchet. The three value objects use public
  constructors and instance methods (the `Opening` precedent), plus the one `fromData` each that a
  stored shape needs **only if** the ratchet's count allows it; otherwise the constructor takes the
  loose data. No ceiling rise.
- **Verbs on objects** — `business.needs()`, `stock.buyingNeeds()`, `record.actPhrase()`,
  `user.compactCharacterId()`; no `XApi.verb(host)`.
- **Inter-Stuff contract** — methods only; `User` is a Document, not Stuff, and is read through its
  method.
- **Person keys** — every key is a `playerId` or an identity path; nothing keys on
  `getTemplatePath()` (`lint:person-keys`, `lint:lineage-keys`).
- **Wizard axis** — no `isWizard` anywhere in this build.
- **One view, one word** — one new view (`compact`); `program schedule` and `press post` change
  arguments, not words. Subcommand `character` is one word (`lint:subcommand-words`).
- **American English** — *program*, *color*, *center* in every new name and row.
- **P3 refuse / skip / throw** — every refusal is a reason row (D4, D10, D17, D19). Skips, each
  logged: an unresolvable `press.frontPage` entry (shipped), a gig with no Locality (D26), a footer
  value that is not an `https:` URL (D29), a slice over budget (D28), a house that will not stand up
  (D25). Throws: `WallTime` given a date it already validated as bad is a programming error.
  `/api/front` never answers 500.
- **P4 no duck typing** — narrowing is `MixinApi.isBusiness`, `instanceof Stock` (as
  `supplierHolds` does in the same file), `PlayerApi.isAvatarStuff`. No `?.()`.
- **P5 the model decides** — the hand-off refusal is in `CompactLogic`; the designation lock is in
  `CompactLogic`; the event-date rules are in `PressLogic`/`WallTime`; the ranking is in
  `EmploymentLogic`/`ContractLogic`. Controllers bind, call, and `refuse`.
- **P6 persistence per content** — the designation: the account's row (`users`), purpose *who the
  account is in the Compact*. The slot: the program document. The event date: the release document.
  The links: `app_settings`. `house-needs`: the document tree, purpose *the world-wide read without
  loading the world*, droppable. Nothing is stored on a class; no bare `Map` field; the transient
  "last filed" on a house is not persistent and is re-read from the document.
- **P7 load on use** — no boot entry, no template scan (`lint:boot-entries`, `lint:template-scans`
  unchanged). D25 follows the graph's derived attachment record; `topNeeds` and `topOpenGig` are
  keyed index reads; the founder is found by credential (`google_profiles.email` is indexed;
  `twitch_profiles` has no `login` index — a find over a small collection, behind the route's 15 s
  memo; add no index without a measured need).
- **P8 names** — `HouseNeeds` (a house's needs), `WallTime` (not `Time`, which is the game's),
  `WeeklySlot`, `compact` (the institution's own noun; the collision ladder finds no other
  `compact` verb). No `-able` class.
- **Gates this build must pass** — `lint:family` whole, and in particular: `lint:view-keys`,
  `lint:one-word`, `lint:subcommand-words`, `lint:institution-verbs`, `lint:command-views`,
  `lint:verb-collisions`, `lint:self-contributions`, `lint:contribution-keys`, `lint:reason-rows`,
  `lint:controller-decisions`, `lint:controller-functions`, `lint:controller-mutations`,
  `lint:document-kinds`, `lint:untitled`, `lint:data-ideas`, `lint:lib-statics`,
  `lint:thin-forwarder`, `lint:whole-table`, `lint:world-scan`, `lint:person-keys`,
  `lint:schema` (`users.yaml` gains the field's prose; no new index), `lint:test-seams`,
  `lint:wire-content`, `lint:drive-scripts`, `lint:silent-catch`, `lint:floating-promises`,
  `lint:imports`, `lint:module-scope`; client: the no-native-title gate (tooltips.md) for any new
  hover text.

---

## Waves

Each wave ends green on `pnpm test:near` + `pnpm -C packages/server lint:family` and at one commit.
After any change to `packages/types`, rebuild it (`pnpm --filter @saxonberg/types build`) before
reading a type error as real.

### W0 — the Compact character
**Implements** D1–D6. **Files:** `lib/identity/User.ts`; `schema/users.yaml` (prose only, then
`pnpm gen:schema`); `api/compact.ts`, `platform/idea/api/CompactLogic.ts`; `api/conviction.ts`,
`platform/idea/api/ConvictionLogic.ts`, `lib/standing/Position.ts` (the by-subject find);
`platform/idea/cmd/governance/CompactController.ts`, `CompactCharacterController.ts`;
`packages/content/platform/content/platform/cmd/governance/compact.yaml`;
`lib/character/Persona.ts`, `platform/idea/Login.ts` (contributions); reason rows
`content/reasons/compact-{no-account,not-yours,seated,vote-open,unchanged}.yaml`;
`packages/types` (`CharGenRosterPayload.compactPlayerId`).
The acting account is read from the giver's `Interactive` (`interactive.getUser()`, the path
`Login.playCharacter` uses; see `lib/connection/HasInteractive.ts` for the accessor both `Login` and
a body share) — an anonymous user is `compact-no-account`.
**Acceptance:** unit tests — default is the first character; a stored id that left `playerIds` falls
back; designate by id and by name; each refusal by its reason; a held position locks and a dropped
one unlocks; the payload carries the id. `compact` and `compact character` dispatch for a `Login`
and for a body.
**Commit:** `feat(compact): the Compact character — one per account, chosen with compact character`

✅ **W0 done.** `User.compactPlayerId` + `compactCharacterId()`/`setCompactCharacter()`; the
`compact` view (governance) afforded from `Persona` and `Login`; `CompactApi.compactCharacterOf` ·
`isCompactCharacter` · `ownCharacterNamed` · `designateCompactCharacter` over `CompactLogic`
(account found from the body's pointer, else its session, else the `users` row; the lock reads
explicit `office_holders` rows and `ConvictionApi.positionsOf`); the roster payload carries
`compactPlayerId`. Decided: D6a (naming by `nameAmong`). Surprises: S4 needed no `Position`
finder — `Position.find({ subject })` is the index's prefix; the two controllers needed seed
templates in `content/platform/idea/cmd/governance/` (`controller-seeds.integrity`); `Login.test`'s
fake `User` had to become a real one (the roster calls a method on it). `lint:family` is refused
by the phase hook in `build`; the wave ran every `lint:*` individually instead (all green).

### W1 — offices seat characters
**Implements** D7–D11. **Files:** `platform/idea/OfficeRegistry.ts`; `lib/governance/Office.ts`
(types); `api/compact.ts`, `CompactLogic.ts`; `cmd/governance/OfficeListController.ts`,
`OfficeAssignController.ts`, `OfficeControllerBase.ts`; `cmd/social/GroupControllerBase.ts`;
`content/platform/cmd/governance/office.yaml` (help); reason row
`office-needs-compact-character.yaml`; every test naming `founderLabel`.
**Acceptance:** `grep -rn founderLabel packages/` is empty. Unit tests — the founder's Compact
character holds each default office and the founder's other character does not; changing the
designation moves the default; `isFounder` is true for both; assign to a non-Compact character
refuses with the reason and to the Compact character succeeds; `office list` prints a name and never
the env value; `publicFaceOf` gives `acting: true` on the default and drops it after a hand-off.
⚠ Run the wire files that seat offices (`grep -l "offices:" packages/wire/tests`) with
`pnpm wire <file>` for two of them before committing — this wave changes who holds a default seat.
**Commit:** `feat(governance): offices seat characters — the founder default is a Compact character`

✅ **W1 done.** `OfficeRegistry.founderSeatHolder()` (credential → profile → `User` →
`compactCharacterId()`) feeds `holderOf`/`holdsOffice`/`officesOf`/`roster`; `founderLabel` is
gone from every type, method and test (`grep` empty); `CompactLogic.assignOfficeImpl` refuses a
non-Compact character for the verb and its test twin alike; `CompactApi.publicFaceOf`. `office
list` prints `<name> (by default — the founder)`. Decided: D10a, D10b. Surprises: the wire purge
read `holderPlayerId` as "seated by this run" — on a default seat it is now the founder's
character, so the purge also checks `!isFounderDefault`. Wire: `wizard-axis` 10/10 green;
`stream-arrival` timed out its restart step at 300 s with the machine at load ~10 (sibling
builds), and the PM seat it strands on failure broke `wizard-axis`'s PM steps on the shared run —
re-run alone after clearing `office_holders`, green. `stream-arrival` is owed a re-run on a quiet
machine (W7's drive restarts the same way).

### W2 — standing is shown on the Compact character
**Implements** D12–D13. **Files:** `lib/standing/AccountScoped.ts`; `api/influence.ts`;
`lib/character/Avatar.ts` (`getAccountSubjects`, the `makeStanding` field);
`cmd/social/StandingController.ts`; `platform/idea/api/ProfileLogic.ts`; `platform/idea/Login.ts`
(`presentRoster`); `content/platform/cmd/social/standing.yaml` (help); `packages/types`;
client `components/CharacterSelect.tsx`, `store/index.ts`, `services/websocket.ts` (roster frame and
the designation payload), and the shelf row that reads `makeStanding`.
**Acceptance:** unit tests on the three-way answer; `standing` on each of two characters; the self
profile; another player's profile of the non-Compact character carries no pointer; character select
renders the figures on the Compact card and a *Make this my Compact character* control on the others
that sends `compact character <playerId>` (client test).
**Commit:** `feat(standing): Make and Fund are shown on the Compact character`

### W3 — wall time: a program's slot, a release's event date, the archive
**Implements** D14–D19. **Files:** `lib/time/WallTime.ts`, `lib/livestream/WeeklySlot.ts`;
`lib/livestream/Program.ts`, `platform/idea/ProgramCatalogue.ts`, `StreamLogic.ts`
(`amendProgram`, `listingOf`), `api/stream.ts`, `platform/idea/api/DocumentLogic.ts` (~660, the
program record's fields), `cmd/stream/ProgramScheduleController.ts`, `ProgramControllerBase.ts`,
`content/platform/cmd/stream/program.yaml`; `lib/press/Release.ts`, `PressLogic.ts`, `api/press.ts`,
the `press` controllers, `content/platform/cmd/system/press.yaml`, `content/kinds/release.yaml`;
`backend/PressRoutes.ts`; `content/settings/press.yaml`, `content/compact/executive.yaml`;
reason rows `bad-date`, `bad-time`, `bad-time-zone`, `bad-weekday`, `event-time-needs-date`,
`event-time-needs-zone`; `packages/types` (`ProgramListing`); the three client reads of `nextShow`.
**Acceptance:** unit tests — `WallTime` across a DST change in both directions and a date-only
event's end; `WeeklySlot.nextAfter` at the slot instant, a second after, across DST, and with
`returnsOn` (the arithmetic the soak step will see); a release round-trips its three fields and its
`eventAt` key; `upcomingEvents` returns only future public `event` releases of the stocked
publisher, soonest first; `publicArchive` pages and never returns a members-only release;
`/api/press/public` sets no cookie and 400s an unknown key. `grep -rn "nextShow\b" packages/` shows
only `nextShowAt`.
**Commit:** `feat(press,stream): event dates, a real weekly slot, and the anonymous archive`

### W4 — what the world needs
**Implements** D21–D27. **Files:** `lib/employment/HouseNeeds.ts`; `content/kinds/house-needs.yaml`
(`title`, `traits: { filed: business }`, `fields:` with `hiringOpen: { type: number, index:
hiringOpen, default: 0 }`, `buyingShort: { type: number, index: buyingShort, default: 0 }` and the
five plain fields); `platform/idea/Business.ts`; `lib/retail/Stock.ts`;
`platform/idea/api/EmploymentLogic.ts`, `api/employment.ts`; `lib/employment/ContractRecord.ts`,
`platform/idea/api/ContractLogic.ts`, `api/contract.ts`, `cmd/work/JobBrowseController.ts`;
`packages/content/test-fixtures/` — the shopfront counter gains one `buys: true` line it also sells.
**Acceptance:** unit tests — `needs()` picks the largest opening and the deepest bought line, zeros
for a closed house, carries buying when no counter is live; the pass writes once and not again
until something differs; `topNeeds` ranking and its newest tiebreak; `topOpenGig` skips a lapsed
posting and prefers reward then recency; the stand-up files for an unreported house and stops at
four; `attachedWithin('', 'house')` returns every attached house; `job` browse output is unchanged.
**Commit:** `feat(economy): houses file their needs; the world's demand is three index reads`

### W5 — the front read
**Implements** D11 (wiring), D20, D28–D30. **Files:** `packages/types` (`FrontResponse`,
`FrontShow`, `FrontHost`, `FrontEvent`, `FrontNeedRow`, `FrontLinks`); `backend/FrontRoutes.ts`;
`StreamLogic.ts` (`frontListing` attaches `host`); `lib/config/AppSettings.ts` (three keys + tier
rows), `content/settings/front.yaml`; `services/auth/TestAuthRoutes.ts` (the test route);
`backend/__tests__/FrontRoutes.test.ts`.
**Acceptance:** route tests — each slice absent when its Api throws while the others answer; a slice
over budget is absent; the key set of every row type is asserted frozen; the body never contains the
founder env value; links appear only for `https:` values; unknown key still 400; no cookie.
**Commit:** `feat(front): /api/front answers the host line, the calendar, the demand and the links`

### W6 — the page
**Implements** D14 (client), D20, D31, D32 and the requirements' layout. **Files:**
`components/StartScreen.tsx`, `front/ShowTile.tsx`, `front/Latest.tsx`, `front/Bands.tsx`, new
`front/ComingUp.tsx`, `front/WorldNeeds.tsx`, `front/Archive.tsx`; `store/index.ts`; `App.tsx`
(the `?archive` switch); client tests beside each.
**The blocks:** the show tile's byline prints `host.name` and beneath it `Acting <seat>` / `<seat>`
(neither without a host); the Play chamber gains *The world needs* with up to three rows
`Hiring|Buying|Gig · what · where`; *From the Office of the Prime Minister* with date + headline,
the repost line, and *Every notice, in the archive →*; *Coming up* with up to four rows in the
visitor's zone; the footer's three optional links. Every block renders `null` on an empty or absent
slice. Phone order: sign-in, the show, the chambers with the Play block, then notices and the
calendar; no horizontal scroll at 360 px.
**Acceptance:** component tests for each block's three states (rows · empty → null · slice absent →
null); the tile and the calendar format one `nextShowAt` identically; sign-in renders with the store's
`front` unset.
**Commit:** `feat(client): the front page's host line, notices, calendar, demand and footer`

### W7 — the drive, the walk, the docs, the MR
**Files:** `packages/server/src/backend/TestHooks.ts` + `packages/wire/src/harness/session.ts`
(`characters: 2` provisions a second character; `character: 1` plays it; the purge clears a stored
`compactPlayerId` it finds on a kept account); `packages/wire/tests/front-page-sources.wire.test.ts`;
`packages/wire/tests/front-page-sources.soak.wire.test.ts`;
`e2e/tests/front-page-sources-walk.spec.ts`; subsystem docs grown in place — `governance.md`,
`influence.md § Standing levels`, `state-model.md`, `connection.md`, `char-gen.md`, `press.md`,
`livestream.md`, `employment.md`, `retail.md`, `contract.md`, `document-store.md` (the kind),
`app-settings.md`, `client-shell.md § The front door`, `testing.md` (the two harness options and the
test route). Index files (`CLAUDE.md`, `roadmap.md`, `slates/README.md`) are left to the sweep.
**Then:** merge `origin/master`; `grep -rn "/location/" ` over this build's new and changed files
(see Risks); the blocking drive; the browser walk; `pnpm test` once; open the MR naming the soak
drive and the operator note from D14.
**Commit:** `test(front-page-sources): the drive, the walk and the docs`

---

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| choose a Compact character | `compact character <character>` (view `platform/cmd/governance/compact.yaml`) | `Persona.ts` contributions (every embodied body) **and** `Login.commandContributions.self`; the character-select control sends the same line | `users.compactPlayerId` | the `User` is already in hand on the session's `Interactive` | `character`: `type: string, required: true` — ⚠ a required arg with no default fails closed and silent; the controller test dispatches the line with and without it |
| read it | bare `compact`; `standing`; character select | same | derived (D1) | same | none |
| hand-off refusal | `office assign` (shipped) | shipped | `office_holders` | `User.find({ playerIds })` | shipped |
| the host line | none (anonymous read) | `/api/front` → `show.host` | program document + `office_holders` + `users` | the program by `stream.featuredProgram` (shipped); the founder by credential | n/a |
| dated events | `press post --on --at --zone` | `press` is afforded as shipped (publishing position) | release document, card key `eventAt` | `findByKey` under the stocked publisher's `feedPath` | options are `type: string`, validated by `WallTime`; each bad value has a reason row |
| the slot | `program schedule <name> <day> <time> <zone>` | shipped (`program`) | program document | `ProgramCatalogue` per-path (shipped) | three required strings unless `--clear`; reason rows |
| the archive | none | the link on the notices block → `?archive` → `/api/press/public` | release documents | `findByKey('release','date')` | route validates `before`/`limit`, 400s others |
| house needs | none — the house's own pass | `runTick` (hourly, shipped) and `bringHouseCurrent` (on arrival, shipped) | `<house>/needs`, kind `house-needs` | ⚠ **the kind must be declared** in `content/kinds/` or `saveAsBusiness` refuses; a never-stood house loads through D25 | n/a |
| the demand read | none | `/api/front` → `needs` | `house-needs` card keys; `contracts {kind, state}` | index reads | n/a |
| footer links | `config front.discordUrl <url>` (shipped verb) | shipped | `app_settings` | `AppApi.setting` | ⚠ a key missing from `AppSettingKeys` **or** from the tier table is unsettable: add both, and a route test reads each |

---

## Acceptance-criteria coverage

| acceptance criterion | waves |
|---|---|
| host line names a character and its seat, *Acting* on the default, never a credential — page, `office list`, HTML | W1, W5, W6; drive 2, 5 |
| exactly one Compact character; alone shows labor and capital; alone may be seated; locked while seated or with a vote open | W0, W1, W2; drive 3–6 |
| notices are the Office's public releases and reposts, date + headline; archive readable signed out, no members-only release | W3, W6; drive 7 |
| *Coming up*: dated events and the next show, soonest first, visitor's zone, drops what has passed | W3, W5, W6; drive 8–9 |
| Play block: one Hiring, one Buying, one Gig, real, within a game hour, world-wide, no poster or price, absent when nothing | W4, W5, W6; drive 10–12 |
| footer links exactly when set | W5, W6; drive 13 |
| sign-in paints whatever the reads do; every block real or absent | W5, W6; drive 1 |
| everything survives a restart | W0, W3, W4; drive 14 |

**Collisions:** existing accounts (D1) · `office list` (D9) · hand-off (D10) · standing surfaces
(D13) · `press.frontPage` (D14) · the free next-show line (D19) · character deletion (D2 — the rule
ships, the act does not exist; see Risks). Nothing in the requirements is unmapped.

---

## Test & gate strategy

**Unit** (listed per wave): the arithmetic of `WallTime`/`WeeklySlot` including the week rollover,
the three-way standing answer, the lock, the founder default, the ranking, the filing diff.
**Only the drive can prove:** that a filed report survives a restart and answers with no house
loaded; that the anonymous read and the page agree; that a hand-off moves the host line.

### The blocking drive — `packages/wire/tests/front-page-sources.wire.test.ts`

`declareFile({ packs: ['platform', 'test-fixtures', 'generic-objects'] })`. It stands in the
scaffold (`lint:wire-content`): the testbed noticeboard is the drive's board, the hall its house
with seats, the shopfront its buying counter — the requirements' *Wharfside* is the soak world's.
It restores everything it changes in `afterAll`: the founder's Compact character back to the first,
the Prime Minister's seat vacated, `stream.featuredProgram` and the three `front.*` keys cleared.

| # | requirement step | pace · assertion | how |
|---|---|---|---|
| 1 | page complete with reads stalled | instant · staged | `/api/front` with one slice forced to throw (route test covers the budget); the walk covers the paint |
| 2 | founder, two characters, no hand-off → *first · Acting Prime Minister*; no credential | instant · staged | `Session.open('founder', { characters: 2, streamer: true })`, feature the program; assert `show.host`; assert `founder@e2e.local` is in no anonymous body (`/api/front`, `/api/press/releases`, `/api/press/public`) |
| 3 | choose the second at character select | instant · player | a roster session sends `compact character <id>`; `/api/front` names the second |
| 4 | `standing` on each | instant · player | two sessions, `character: 0` and `1` |
| 5 | hand-off refused then accepted; *Acting* gone; `office list` | instant · player | a second account with `characters: 2`; reason `office-needs-compact-character`; `show.host` has no seat (the founder no longer holds it) |
| 6 | holder cannot change while seated; after vacate, can | instant · player | reason `compact-seated`; `office vacate`; accepted |
| 7 | a notice, a dated event, a repost; a members-only one hidden; the archive | instant · player | an account appointed `communications-director` at `/compact/executive` by the Prime Minister's seat (the shipped appoint verb; `agent-coordination.dirty.wire.test.ts` shows an appointment) posts four; `/api/press/releases`, `/api/front` `events`, `/api/press/public` |
| 8 | weekly slot; calendar soonest first; tile agrees | instant · player | `program schedule … saturday 10:00 America/Los_Angeles`; `nextShowAt` equals `WeeklySlot`'s value; order of `events` + show |
| 9 | the clock passes the event; the show rolls a week | short · staged | `GET /auth/test-front?now=` at the event's instant + 1 s and at the slot's instant + 1 s (the route is the staging tool; the arithmetic is unit-tested) |
| 10 | a gig is posted → *Gig · what · where*, no poster, no reward | instant · player | `job post` at the testbed board; `needs` has the gig row; the row's key set is exactly `kind, what, where` |
| 11 | an unvisited house's open seat; a counter below par | instant · staged | stage: buy the bought line's one unit (player verb), stand in the hall once, `testharness clock-advance 1h` so both houses file; **`restartWorld()`**; with nobody standing anywhere near, `/api/front` has one Hiring and one Buying row. Then delete the hall's report (`eval`, as the testbed's holder), advance one hour, and assert it is filed again with the hall never visited (D25) |
| 12 | hired, claimed, restocked → each line replaced or gone; then the block absent | short · player | `job apply`, `job claim`, `sell` the unit back; `testharness clock-advance 1h`; assert each row changed or dropped |
| 13 | Discord and Privacy set, the public record not | instant · staged | `config front.discordUrl …` from the session `stream-arrival.wire.test.ts` uses for `config stream.featuredProgram` (~132); `links` |
| 14 | restart | instant · staged | `restartWorld()`; designation, holder, releases with event dates, the slot, the links read back; `needs` equal to before with nobody visiting |
| 15 | phone width | — | the browser walk |

Step 12 is tagged `short` here (one game hour) where the requirements wrote `instant`: the hour is
the requirement's own freshness bound. **B2:** before trusting green, break each checkpoint once —
at minimum 2 (print the env label), 5 (skip the refusal), 9 (ignore `now`), 11 (skip the filing),
14 (drop the field from `fieldMeta`).

### The soak drive — `packages/wire/tests/front-page-sources.soak.wire.test.ts`

*span* — a game week in the soak world: post and claim gigs at the Wharfside board, buy and sell
across a buying counter, apply and quit a seat; at each game day assert no `needs` row names a
lapsed gig, a filled seat or a line at par. Staged twin: steps 10–12. The MR names it; the soak lane
runs it after merge.

### The browser walk — `e2e/tests/front-page-sources-walk.spec.ts`

Once, at code-complete. Signed out: the page paints sign-in and the count with `/api/front` blocked
(route interception) and again with it answering; the host line; the notices block and the archive
link → the archive → back; *Coming up* with the browser's time zone set to two different zones
(Playwright `timezoneId`) showing two different labelled times for one event; the Play block's three
rows; the footer's set and unset links; 360 px width with no horizontal scroll and the order from
W6. Signed in: character select shows the figures on the Compact card, the control moves them, and
the front page (reloaded signed out) names the new character.

### Gates

`pnpm test:near` + `lint:family` per wave; `pnpm test` exactly once before the MR and once at
`/finalize`. Never in the background.

---

## Risks & opens

1. **The founder's other characters lose the default seats (D7).** Deliberate, and the largest
   behavior change in the build: `readWorldAs`, every `requiresGovernor`-style validator and any
   test that plays the founder as anything but `playerIds[0]` now refuse on an alt. The wire suite's
   `founder` has one character, so it is unaffected — but this drive gives the shared `founder`
   account a second character and moves the designation. It **must** restore it (`afterAll` and a
   `finally` around steps 3–6); D1's fallback makes a leftover harmless only if the purge removes
   the character. If any other wire file runs concurrently with this one against the same world,
   rename this file `.dirty.` and say why in `DIRTY_REASON`.
2. **A Twitch login is both the founder's recognizer and a program's public feed.** The footer links
   to `twitch.tv/<channel>` and the embed names the channel. The requirement forbids a credential as
   a **label**; the drive therefore asserts the email is in no anonymous body and that no host or
   office line carries either env value — it does not assert the channel string is absent from the
   page. → owner's eye.
3. **There is no character deletion** (D2). The requirements' collision row is satisfied by the rule,
   not by an act. If the build finds a deletion path this survey missed, it calls the lock there.
4. **`press.frontPage` on a standing world** keeps its old value (D14); the MR says so.
5. **Sibling MR !673 renames the `/location/` path segment to `/place/`** across the repo and may
   merge mid-build. Merge `origin/master` when it lands (read what it brings first), then grep this
   build's new code, rows, tests and the scaffold constants it imports for `/location/`.
6. **What a stand-up costs (D25).** Standing a house runs its roster pass, which may bring cast into
   being. Measure the first tick on the wire world (log lines per stand-up, tick duration); if one
   stand-up loads a place, lower the per-tick cap to 1 rather than removing the pass, and record it.
7. **`Intl` time zones** depend on the Node build's ICU; the test for an unknown zone and for
   `America/Los_Angeles` runs in CI's image, not only locally.
8. **`saveAsBusiness`'s path rule** — *under the business's own branch*. If a house's path is not a
   titled branch for some shipped house, the pass logs the refusal and that house has no report; it
   must not throw out of the tick. Census the refusals on the wire world once.
9. **Offline holders.** `holdersByPositionImpl` counts runtime hires only from live actors; a seat
   held by an offline player may read open. Pre-existing, not widened here — but the front page now
   shows it to strangers. If the drive's step 12 exposes it (the hired character logs out and the
   seat reappears), record it as a finding and file it; do not patch it inside this build.

**Stop and ask** only if: the lock in D4 cannot distinguish an explicit holder from the default; or
`findByKey` cannot order a numeric card key (then D21's read needs a different key shape — re-plan
W4 in place).

---

## Deferred seams

- **Character deletion** calls `CompactLogic`'s lock and relies on D1's fallback → the build that
  ships deletion (no slate yet; note it in `connection.md § Open`).
- **The ballot verb** asks `CompactApi.isCompactCharacter` before `ConvictionApi.hold` →
  [separation-of-powers-slate](../slates/society/separation-of-powers-slate.md).
- **What account-level data is public** → a new `account-visibility-slate`, opened by this build's
  sweep (requirements, Non-goals).
- **Elections on the calendar** — a fourth source merged into `events` by date →
  separation-of-powers-slate § 7q.
- **Fund and Make** — new slices beside `needs` in `FrontResponse`; `Organization.openings()` for
  non-business organizations is the Make block's read → front-page-slate § 4b/4c, budget-slate.
- **The offline-holder count** (Risk 9) → the labor-market slate that owns `holdersByPositionImpl`.
- **The live count reading the wire** → directory-slate § 3b.

---

## Critical files

Read first, in this order:

1. `docs/requirements/front-page-sources-requirements.md`
2. `packages/server/src/mud/platform/idea/OfficeRegistry.ts` · `api/compact.ts` ·
   `platform/idea/api/CompactLogic.ts`
3. `packages/server/src/mud/lib/identity/User.ts` · `platform/idea/Login.ts` (~375–560) ·
   `lib/character/Avatar.ts` (~515–560, ~715–775) · `api/influence.ts` · `lib/standing/AccountScoped.ts`
4. `packages/server/src/mud/platform/idea/api/EmploymentLogic.ts` (~215–275, ~470–500, ~1580–1745,
   ~2190–2320) · `lib/employment/Organization.ts` (~600–645) · `lib/retail/Stock.ts` (~75–125,
   ~250–360, ~815–850) · `platform/idea/Business.ts`
5. `packages/server/src/mud/api/document.ts` (~212–262, ~355–375) ·
   `packages/content/platform/content/kinds/{cap-table,release,program}.yaml` ·
   `docs/subsystems/document-store.md` (§ Kinds are declared; § the verb test)
6. `packages/server/src/mud/lib/press/Release.ts` · `platform/idea/api/PressLogic.ts` (~300–440) ·
   `backend/PressRoutes.ts`
7. `packages/server/src/mud/lib/livestream/Program.ts` · `platform/idea/api/StreamLogic.ts`
   (~495–600, ~895–1025) · `backend/FrontRoutes.ts`
8. `packages/server/src/mud/lib/employment/ContractRecord.ts` · `cmd/work/JobBrowseController.ts`
9. `packages/client/src/components/StartScreen.tsx` · `components/front/*.tsx` ·
   `components/CharacterSelect.tsx` · `docs/design/front-page/front-page.dc.html`
10. `packages/wire/tests/stream-arrival.wire.test.ts` · `packages/wire/src/harness/{session,scaffold}.ts`
    · `packages/server/src/backend/TestHooks.ts` (~190–250) · `docs/testing.md` (§ Staging; § The scaffold)
11. `docs/review-questions.md` (the B questions, at every wave) · `docs/antipatterns.md`

---

## Drive record

*(appended at build time)*
