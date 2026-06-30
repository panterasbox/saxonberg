# Government offices — implementation plan (rev. 2)

## Source of truth & scope

This plan implements the rewritten `docs/requirements/government-offices-requirements.md` (re-read it before starting; it overrides this plan on any conflict). It delivers the **Office substrate** modeled on `AccessRegistry`: an authored apparatus of **five singular offices**, a manifest-warmed `OfficeRegistry` singleton that resolves the **founder by external credential** and makes the founder the **computed default holder** of every office, a sparse **handoff** store that persists only explicit assignments, a gated `OfficeApi`/`OfficeLogic` pair exposing the check + roster surface, and an `office` verb under a new `governance` command category whose mutating subcommands are gated to the founder.

**In scope:** the office primitive (single-holder), the five seeds, founder-by-credential resolution, founder-as-default-holder occupancy, founder-gated `assign`/`vacate` (handoff/revert), the check + public roster surface, the verb, handoff persistence, **the one authority consumer (re-gate the `reserve` verb to the Governor office — Phase 3.6)**, tests, docs.

**Out of scope (do NOT build):** the filling workflow (investiture/no-confidence/elections); **juries / sortition / any judiciary office** (a jury is a selection-from-a-pool, not an office — deferred to the political-machinery build); **multi-seat bodies** and any `body` cardinality (all v1 offices are singular); authority *consumption* **except the Governor→central-bank wire below** (PM→archwizards, Speaker→chamber-floor stay deferred — ship the `holdsOffice` check surface, wire no other consumer); chambers-as-populations; terms/tenure; a *generic* "requires office X" validator (deferred to the second office-gated verb — v1 uses a specific `requiresGovernor`).

## What changed from rev. 1 (the three corrections)

1. **No jury, no judiciary office, no `body` cardinality.** The apparatus is **five singular offices**. The `Office` value-object drops the `cardinality` and `mustBeFilled` fields and the cardinality vocabulary; there is no `setSoleOccupant`-vs-`addOccupant` branching, no vacancy machinery. Branches present: **executive + legislative only**.
2. **Founder by external credential, not a playerId env.** `FOUNDER_GOOGLE_EMAIL` and/or `FOUNDER_TWITCH_HANDLE` (not `FOUNDER_PLAYER_ID`). `isFounder(avatar)` resolves avatar → playerId → owning `User` → its `GoogleProfile.email` / `TwitchProfile.login`, matched against the configured credential (Twitch `login` is the lowercased handle — compare case-insensitively). Orthogonal to the `streamers` axis and the `isWizard` code-trust axis. Returns false until the founder has logged in (a matching `User` exists) — appointment is simply inert until then, which is correct.
3. **Founder-as-default-holder occupancy.** No founding-fill seeding. The founder is the **computed default holder** of every office. The persistence collection stores **only explicit handoffs** (sparse, empty at founding, one row per handed-off office). `holderOf(office)` = explicit holder if stored, else the founder. `holdsOffice(player, office)` = explicit-holder match OR (no explicit row AND `isFounder(player)`). `assign(player, office)` upserts the explicit-holder row (replacing prior, auditable). `vacate(office)` **deletes** the row → reverts to founder default (signature is now **office-only**; a singular seat reverts to the founder, which backstops "must be filled" — there is no genuine empty state).

## Precedent verification — findings (read before coding)

I read every cited precedent and the rewritten requirements. Notes:

1. **Affordance home is Persona (universal), NOT AuthorMixin — confirmed and now explicit in the requirements.** `lib/shell/Author.ts` affords verbs only to the operator surface (authors see them; non-authors don't). The `office` verb's roster is **public** (Art. VII). The correct precedent is the `group` verb, afforded universally via a per-Avatar mixin with **per-subcommand validators** gating the privileged subcommands. Afford `governance/office.yaml` on `lib/character/Persona.ts` (composed on every Avatar; already affords `who`/`profile`/`standing`/`score`), with `requiresFounder` on the `assign`/`vacate` subcommands only. (The rewritten requirements §"The public verb is afforded universally" now mandates exactly this.)

2. **Definitions in code; only handoffs persist — confirmed by the requirements.** The apparatus is an authored TS constant (`OFFICE_APPARATUS` in `lib/governance/Office.ts`); there is no definitions collection or YAML. Only the sparse handoff store persists (`office_holders` collection). "Re-seeding never clobbers occupants" is trivial — there is nothing to seed.

3. **Credential resolution path verified.** `lib/identity/User.ts` (collection `users`; fields `googleProfileId`/`twitchProfileId` = profile `_id` FKs, `playerIds[]`; `User.find` / `User.findById`). `lib/identity/GoogleProfile.ts` (collection `google_profiles`; field `email`; `findById`). `lib/identity/TwitchProfile.ts` (collection `twitch_profiles`; field `login` = lowercased handle; `findById`). To find the User owning a playerId: `User.find({ playerIds: <playerId> })` (Mongo array-contains). **Precedent for reaching these from a logic singleton:** `obj/api/TwitchLogic.ts` does `User.find({ twitchProfileId: profile._id })` + `TwitchProfile.findByTwitchUserId` directly — so the registry reaching `User`/`GoogleProfile`/`TwitchProfile` directly is consistent with house style. Online Avatars also carry their `User` via `avatar.getUser()` (a DB-free fast path the Logic may use), but the registry's playerId-keyed resolution via `User.find({ playerIds })` works regardless of online state.

Everything else from rev. 1 holds: `Idea`+`PostRegistrationMixin` manifest-warmed singletons (`RecipeCatalogue`/`BulletinBoard`), the Api↔Logic split with `@CallSecurity(FromModule(...))` + `SecurityApi.decorateApiClass` (`AccessApi`/`AccessLogic`), the narrow-entry controller-gated mutation (string-keyed `FromModule('mud/obj/command/governance/OfficeController')` — `AccessApi.setWizardMembership`→`WizardController` precedent), command-category auto-discovery (`obj/api/CommandLogic.ts` does `readdirSync(CMD_DIR, {recursive:true})` over `mud/cmd/` — a new `cmd/governance/` dir is auto-discovered; **no category registry to edit**), the `requiresArchwizard` validator shape (sync body + async `preload` returning the axis boolean), and the `Group` Document persistence shape.

Key verified locations: `obj/AccessRegistry.ts`, `api/access.ts`, `obj/api/AccessLogic.ts`, `obj/command/author/WizardController.ts`, `cmd/author/wizard.yaml`, `seeds/obj/command/author/WizardController.yaml`, `lib/character/Persona.ts:53`, `lib/social/Contacts.ts:111`, `lib/command/validators/requiresArchwizard.ts`, `lib/social/Group.ts`, `obj/RecipeCatalogue.ts`, `bootstrap.ts:103`, `lib/paths.ts:23`, `obj/api/CommandLogic.ts:102`, `api/execution-context.ts:341`, `lib/identity/{User,GoogleProfile,TwitchProfile}.ts`, `obj/api/TwitchLogic.ts:210`.

---

## Phase 1 — Substrate: value-object, apparatus, handoff Document, registry + credential resolution

### 1.1 `packages/server/src/mud/lib/governance/Office.ts` (NEW)
The Office value-object + the two vocabularies + the authored apparatus constant. One module, one concept (the "Named value-object / vocabulary / registry" category; constants are a sanctioned export).

- **Vocabularies** (each a `const` union type + a validation array):
  - `OfficeBranch = 'executive' | 'legislative'` + `OFFICE_BRANCHES`. (Judiciary is intentionally absent — it arrives with the deferred judiciary office; comment this.)
  - `OfficeOrigin = 'constituted' | 'founder-established'` + `OFFICE_ORIGINS`.
  - **No cardinality vocabulary** — every office is singular.
- **`class Office`** — an immutable value-object (constructor-or-`from()` over a plain shape; no persistence, no Stuff). Fields: `key` (stable slug), `displayName`, `branch`, `origin`. **No `cardinality`, no `mustBeFilled`.** Accessors only; a `toRosterRow()` helper returning `{key, displayName, branch, origin}`.
- **`export const OFFICE_APPARATUS: readonly Office[]`** — the five authored seats:

  | key | displayName | branch | origin |
  |---|---|---|---|
  | `prime-minister` | Prime Minister | executive | constituted |
  | `speaker-producer-house` | Speaker of the Producer House | legislative | constituted |
  | `speaker-patron-house` | Speaker of the Patron House | legislative | constituted |
  | `speaker-consumer-house` | Speaker of the Consumer House | legislative | constituted |
  | `central-bank-governor` | Governor of the Central Bank | executive | founder-established |

  Comment: the Governor's branch is **executive** (Art. V §9 / VIII §4 — monetary policy is an executive function), origin **founder-established** (ordinary law, Art. VIII §3), **no constitutional independence**. No jury / judiciary office in v1.

### 1.2 `packages/server/src/mud/lib/governance/OfficeHolder.ts` (NEW)
The sparse-handoff persistence Document — one row **only for an office that has been handed off**. Mirrors `lib/social/Group.ts`'s Document shape, single scalar holder.
- `extends Document`; `static collectionName = 'office_holders'`; `static persistentFields = ['officeKey', 'holderId']`.
- Fields: `officeKey: string = ''` (the join key to `OFFICE_APPARATUS`, unique at the collection level), `holderId: string = ''` (the explicit holder's Avatar playerId — single, not an array).
- Convenience static `findByOfficeKey(officeKey): Promise<OfficeHolder | null>` (the `GoogleProfile.findByGoogleId` precedent). No member-mutation methods needed beyond setting `holderId` + `save()`; the registry owns upsert/delete. Document the sparse contract: **absence of a row = the founder default holds the seat.**

### 1.3 `packages/server/src/mud/lib/paths.ts` (EDIT)
Add `officeRegistry: "/obj/OfficeRegistry",` to `TemplatePaths` (alongside `accessRegistry`, line ~23).

### 1.4 `packages/server/src/mud/obj/OfficeRegistry.ts` (NEW)
The singleton, the close mirror of `AccessRegistry`, minus all seeding. `const OfficeRegistryBase = PostRegistrationMixin(Idea); export default class OfficeRegistry extends OfficeRegistryBase`.

- **Caller gate** (top of file): `const OfficeApiCallers = SecurityPolicies.AnyOf(SecurityPolicies.FromModule('mud/api/office#OfficeApi'), SecurityPolicies.FromTemplate('/obj/api/office'));` Every method below carries `@CallSecurity(OfficeApiCallers)`.
- **State (instance fields):** `private founderGoogleEmail: string | null = null;` and `private founderTwitchLogin: string | null = null;` (both normalized lowercased at warm). **No occupancy cache seeded with a founder; no founding-fill.**
- **`postRegister`:** read the founder credential env into the fields (`FOUNDER_GOOGLE_EMAIL` → lowercased; `FOUNDER_TWITCH_HANDLE` → lowercased to match `TwitchProfile.login`). If neither is set, log one boot warning (`isFounder` will always be false — the deploy contract, mirrors absent-`WIZARD_PLAYER_IDS` degrade). **No DB work, no apparatus seed, no occupancy seed** — the apparatus is the code constant and the handoff store starts empty.
- **Founder resolution (gated):**
  - `isFounder(playerId): Promise<boolean>` — `const user = await this.resolveUserForPlayer(playerId); if (!user) return false; return this.userMatchesFounder(user);`
  - `private async resolveUserForPlayer(playerId): Promise<User | null>` — `(await User.find({ playerIds: playerId }))[0] ?? null`.
  - `private async userMatchesFounder(user): Promise<boolean>` — if `this.founderGoogleEmail` and `user.googleProfileId`: `GoogleProfile.findById(user.googleProfileId)` → compare `.email.toLowerCase()` === founderGoogleEmail. If `this.founderTwitchLogin` and `user.twitchProfileId`: `TwitchProfile.findById(user.twitchProfileId)` → compare `.login` (already lowercased) === founderTwitchLogin. Return true on either match. Resolve **per-check** (no cache) so the founder logging in *after* boot is recognized immediately; the call frequency is low (validator preload + roster reads). (Optional optimization, noted not built: a lazily-warmed founder-playerId Set invalidated on login — skip in v1 for correctness simplicity.)
  - `founderLabel(): string` — the configured display handle for presenting the founder default offline: prefer the original-case `FOUNDER_TWITCH_HANDLE`, else `FOUNDER_GOOGLE_EMAIL`, else `'(founder unset)'`. (Store the original-case handle in a third field at warm for display; compare lowercased.)
- **Occupancy reads (gated):**
  - `holderOf(officeKey): Promise<OfficeHolderResult>` — validate `officeKey` is a known office (else return a `kind:'unknown'` result). `OfficeHolder.findByOfficeKey(officeKey)`: if a row exists → `{kind:'explicit', officeKey, holderPlayerId}`; else → `{kind:'founder', officeKey, founderLabel: this.founderLabel()}`.
  - `holdsOffice(playerId, officeKey): Promise<boolean>` — row exists → `row.holderId === playerId`; no row → `await this.isFounder(playerId)`. (Unknown office → false.)
  - `officesOf(playerId): Promise<string[]>` — compute `isFounder(playerId)` once; for each office in `OFFICE_APPARATUS`: include it if its explicit row's `holderId === playerId`, OR (no row AND the player is the founder). Returns the founder's full set when no handoffs exist.
  - `roster(): Promise<OfficeRosterRow[]>` — for each office: join `office.toRosterRow()` with `holderOf` → `{key, displayName, branch, origin, holderPlayerId|null, isFounderDefault, founderLabel}`. The public transparency surface.
- **Mutations (gated):**
  - `assign(playerId, officeKey): Promise<OfficeAssignResult>` — reject unknown office key. Upsert the `OfficeHolder` row: find by key; if present capture the prior `holderId` (for audit) and overwrite `holderId = playerId`; else create. `await row.save()`. Return `{changed, priorHolderId|null}` (prior holder = the displaced explicit holder, or null when the seat was on the founder default — the auditable replace).
  - `vacate(officeKey): Promise<boolean>` — reject unknown office key. Find the `OfficeHolder` row; if present **delete it** (the seat reverts to the founder default) and return true; else return false (already on the founder default — a no-op). **Signature is office-only** (no player) — singular seats revert to the founder; there is no genuine empty state.
- **`canDestruct()`** singleton refusal (RecipeCatalogue precedent).

Imports: `User`, `GoogleProfile`, `TwitchProfile` from `../lib/identity/`; `OfficeHolder` + `OFFICE_APPARATUS` from `../lib/governance/`. Define the small result types (`OfficeHolderResult`, `OfficeRosterRow`, `OfficeAssignResult`) in `lib/governance/Office.ts` (the value-object module's "constants/types its surface speaks") so both the registry and the Api import them.

### 1.5 `packages/server/src/mud/bootstrap.ts` (EDIT)
Append a manifest entry after the `AccessRegistry` block (line ~114):
```
{ templatePath: '/obj/OfficeRegistry' },
```
**No `dependsOn`** — the registry reads its own `office_holders` collection + the `users`/`google_profiles`/`twitch_profiles` collections + env; it depends on no other singleton (the founder is not a Group, so no `GroupRegistry` dependency). Add the manifest-house-style comment: what it warms (founder credential config), that the apparatus is a code constant and occupancy starts empty (no founding-fill), the env contract.

### 1.6 `packages/server/.env.example` (EDIT)
Add a founder-credential block after the `ARCHWIZARD_PLAYER_IDS` block (line ~28), in the same comment shape:
```
# FOUNDER_GOOGLE_EMAIL / FOUNDER_TWITCH_HANDLE: the founding principal's
#   external credential — the founder is the default holder of every
#   government office (Art. XI pool-of-one) and the only appointer who can
#   hand a seat off (`office assign/vacate`). Set either or both; a logged-in
#   player whose linked Google email or Twitch handle matches is the founder.
#   Distinct from the wizard/archwizard code-trust axes and the streamers
#   axis — this is governance root-power. Twitch handle is matched
#   case-insensitively (stored lowercased as the Twitch `login`).
# FOUNDER_GOOGLE_EMAIL=bobalu@panterasbox.com
# FOUNDER_TWITCH_HANDLE=Bobalu_Smallberries
```

---

## Phase 2 — OfficeApi / OfficeLogic + the check surface

### 2.1 `packages/server/src/mud/api/office.ts` (NEW)
The thin forwarding facade — the `api/access.ts` shape exactly. Resolve the HMR-able `OfficeLogic` singleton at `/obj/api/office` via `StuffApi.singletonSync` + `HotReloadApi.getCurrentExport` (copy the `logic()` helper, swap paths/class).

- **Public (ungated) reads** — anyone/any module calls these (transparency; mirror that `AccessApi.isWizard` etc. carry no `@CallSecurity`): `holderOf(officeKey)`, `holdsOffice(subject, officeKey)`, `officesOf(subject)`, `isFounder(subject)`, `roster()`, `founderLabel()`.
- **Gated mutations** — `assign(playerId, officeKey)` and `vacate(officeKey)` carry `@CallSecurity(SecurityPolicies.FromModule('mud/obj/command/governance/OfficeController'))` (the string-keyed narrow-entry, `AccessApi.setWizardMembership`'s gate shape). These are the single structural entry to the handoff write; the **authority** (founder) is enforced by the verb's validator, not re-checked here (the wizard precedent — controller-gate + validator-authority, no double-check).
- End with `SecurityApi.decorateApiClass(OfficeApi);` (required by the spec).
- Parameter convention: read predicates that take a *subject* (`holdsOffice`, `officesOf`, `isFounder`) accept `Stuff | null` (an Avatar) and let the Logic resolve playerId; the mutations take a resolved `playerId: string` appointee (the controller resolves the MQL target to a playerId, exactly as `WizardController` does before `setWizardMembership`). `vacate(officeKey)` takes no player. This keeps the actor-from-context invariant clean: the **appointer** is never a parameter; only the **appointee** is.
- `_resetRegistryRefForReload()` HMR seam (forwards to logic).

### 2.2 `packages/server/src/mud/obj/api/OfficeLogic.ts` (NEW)
The hot-reloadable logic singleton — the `obj/api/AccessLogic.ts` shape. `@Unshadowable export class OfficeLogic extends Idea`. Module-level `registryRef` cache + `lookupRegistry()` over `TemplatePaths.officeRegistry` (copy from AccessLogic). `const OfficeApiCallers = SecurityPolicies.FromModule('mud/api/office#OfficeApi');` every method gated with it.

- `playerIdOfQuick(subject)` Avatar-sniff helper (copy from AccessLogic) — read predicates short-circuit NPC/null/prop subjects.
- Each method resolves the registry; **no-registry test path** returns safe **closed-fail** defaults (`holdsOffice`/`isFounder` → `false`; `officesOf`/`roster` → `[]`; `holderOf` → an `unknown`/`founder`-with-empty-label result; mutations → `false`/no-op result). Document the closed-fail choice (governance has no dispatcher-side pre-gate to lean on — unlike `AccessApi.can`/`isWizard`, which fail open).
- `holdsOffice`/`officesOf`/`isFounder`: resolve `playerIdOfQuick(subject)` then delegate (an Avatar with no playerId fails closed). `assign`/`vacate`/`holderOf`/`roster`/`founderLabel`: delegate directly.
- `_resetRegistryRefForReload()` seam (copy from AccessLogic).

**Check-surface acceptance** (`holderOf`/`holdsOffice`/`officesOf`/`roster`) is fully delivered here. The **one wired consumer** (Phase 3.6) calls `OfficeApi.holdsOffice(giver, 'central-bank-governor')` to gate the `reserve` verb; the other consumers (PM→archwizards, Speaker→chamber-floor) stay deferred.

---

## Phase 3 — The `office` verb + the new `governance` command category + the founder gate

### 3.1 `packages/server/src/mud/lib/command/validators/requiresFounder.ts` (NEW)
The authority gate, the `requiresArchwizard.ts` shape exactly: a `CommandValidator<boolean>` whose sync body returns the deny string when `!allowed`, and whose `validator.preload = (context) => OfficeApi.isFounder(context.commandGiver)`. `context.commandGiver` is **framework-stamped** (the dispatcher sets it), satisfying `gated-api-actor-from-context` — the appointer is derived from execution context, never a caller-supplied parameter. Now credential-backed (the wizard build's `isArchwizard` → here `isFounder`). Comment: returns false until the founder has logged in (no matching `User` yet) — that inertness is intended. (For a future REST appointment path, `OfficeApi.isFounder` could read `ExecutionContextApi.getActingAuthor()`; v1 has only the command path.)

### 3.2 `packages/server/src/mud/cmd/governance/office.yaml` (NEW — establishes the `governance` category)
The view, the `group.yaml` + `wizard.yaml` shapes combined:
- `verbs: [office, offices]` (the bare plural `offices` hits the public roster; no two-word verbs).
- `controller: governance/OfficeController`
- `description` / `help`: the office model in one paragraph (apparatus seats, single holder, founder default, handoff, public roster).
- **No verb-level authority validator** (the bare verb + `list` are public). Optionally `validators: [requiresAnimate]` like `group`.
- `subcommands`:
  - `assign`: `validators: [/lib/command/validators/requiresFounder]`; arg `target` (`type: object`, `scope: online`, `validators: [mustBeAgent]`, `onExcess: prompt`) + arg `office` (`type: string` — the office key/name).
  - `vacate`: `validators: [/lib/command/validators/requiresFounder]`; arg `office` only (`type: string`). **No player arg** (the seat reverts to the founder).
  - `list`: no validators (public roster); no args.
- Bare `office` (no subcommand) and bare `offices` fall through to the roster (the `chat.yaml` subcommand-fallthrough precedent — the controller treats absent/`list` as the roster read).

### 3.3 `packages/server/src/mud/obj/command/governance/OfficeController.ts` (NEW)
`export default class OfficeController extends CommandController<OfficeModel>` — the `WizardController` shape.
- `execute`: branch on `model.subcommand`.
  - `assign`: resolve `model.target` → Avatar → playerId (the `WizardController` `MqlOneResult` → `PlayerApi.isAvatarStuff` → `getPlayerId()` block, copied); resolve `model.office` against `OFFICE_APPARATUS` keys/displayNames (fail `unknown-office` if not). Call `OfficeApi.assign(playerId, officeKey)`. Report success; on a replace, name the prior holder from the result (`priorHolderId` → presentation, or "the founder" when `null`).
  - `vacate`: resolve `model.office` only; call `OfficeApi.vacate(officeKey)`. Report "reverted to the founder" (or `no-change` if it was already on the founder default).
  - `list` / bare / `offices`: `await OfficeApi.roster()`; render a public MML table (office, branch, origin, holder). For each row: explicit holder → present via `PlayerApi.findAvatarByPlayerId` (online) falling back to the raw playerId; founder default → present `founderLabel` with a "(founder)" marker (presented by handle even offline).
  - Authority is already enforced by `requiresFounder` (the dispatcher rejects non-founders before `execute` runs — the controller re-derives no caller-supplied authority, the `WizardController` contract).
- `send`/`fail` helpers (copy from `WizardController`; topic e.g. `system.governance`).

### 3.4 `packages/server/src/mud/seeds/obj/command/governance/OfficeController.yaml` (NEW)
The silent controller-seed half of the affordance+seed pair (the `seeds/obj/command/author/WizardController.yaml` precedent, verbatim shape):
```
class: /obj/command/governance/OfficeController
data: {}
```

### 3.5 `packages/server/src/mud/lib/character/Persona.ts` (EDIT — the affordance half)
Add `'governance/office.yaml'` to the `commandContributions.self` array (line ~53, alongside `social/who.yaml` / `social/profile.yaml`). **This is the universal affordance home** (Finding 1; the rewritten requirements mandate it): Persona is composed on every Avatar, so the verb is universally runnable; the public roster works for everyone, and `requiresFounder` (subcommand-level) blocks non-founders from `assign`/`vacate`. **Do not add it to `AuthorMixin`** (that would hide the public roster from non-authors). Add a comment explaining the public-verb-with-gated-subcommands shape (the `group` precedent) and why it is not on AuthorMixin.

**Live-verification flashpoint:** affordance + controller-seed wiring is invisible to unit tests (which call the controller/Api directly). After implementation, **verify live** (this requires the founder's real linked credential, so set `FOUNDER_TWITCH_HANDLE`/`FOUNDER_GOOGLE_EMAIL` in the dev env and log in as that account): run `offices` as the founder and a non-founder (both see the roster, all seats showing the founder by handle when no handoffs exist), `office assign <player> prime-minister` (founder succeeds → roster shows the new holder; non-founder denied with the `requiresFounder` message), `office vacate prime-minister` (reverts to the founder default), and confirm the verb appears in the recency stack. Capture this as a manual/scripted step in the test plan.

### 3.6 The one authority consumer — Governor gates the central bank's `reserve`

The office substrate's first real consumer. The central bank's only control surface is the existing `reserve` verb; today it is gated on `requiresWizard` (the code-trust axis — the wrong axis). Re-gate it to **holding the `central-bank-governor` office**.

- **`packages/server/src/mud/lib/command/validators/requiresGovernor.ts` (NEW)** — the `requiresFounder`/`requiresArchwizard` shape exactly: a `CommandValidator<boolean>` whose `validator.preload = (context) => OfficeApi.holdsOffice(context.commandGiver, 'central-bank-governor')` and whose sync body returns the deny string when `!allowed` (e.g. "you must hold the Governor of the Central Bank office to use the central bank's controls"). `context.commandGiver` is framework-stamped (the gated-api-actor-from-context rule). Comment: the founder holds the Governor seat by default, so at founding this is no stricter than today; once the seat is handed off, the holder — not an arbitrary wizard — controls the mint, which is the correct monetary-authority axis. Imports `OfficeApi` from `api/office.ts` (no cycle: validator → OfficeApi → OfficeLogic → registry; banking untouched).
- **`packages/server/src/mud/cmd/banking/reserve.yaml` (EDIT)** — swap the verb-level validator `/lib/command/validators/requiresWizard` → `/lib/command/validators/requiresGovernor` (keep `requiresAnimate`). Update the `description`/`help` "Operator-gated" → "Governor-gated (the `central-bank-governor` office)". **No controller change** — `ReserveController` is unaffected; the validator is the authority gate.
- **Only `reserve` moves.** `house` (venue-owner pnl/payroll) is a separate concern and stays on `requiresWizard`. No generic office validator — `requiresGovernor` is specific; generalize at the second office-gated verb.
- **Existing banking tests:** check `lib/banking/__tests__/*` (and any `ReserveController` test) for cases that dispatch `reserve` as a wizard actor — those now need the actor to hold the Governor office (or be the founder). Update or note.

This depends on Phase 2 (`OfficeApi.holdsOffice`). Sequence it after Phase 3.5.

---

## Phase 4 — Persistence (verification of Phase 1 wiring)

No new files — this phase confirms the Phase 1 persistence behaviors end to end:
- The `office_holders` collection is created on first `OfficeHolder.save()` (the `Document`/`Group` collection-on-first-write pattern; no central collection registry to edit — confirmed against `lib/persistence/Document.ts`).
- **Sparse handoffs only:** the store is empty at founding (every office resolves to the founder default); a row appears only on `assign`, and `vacate` deletes it. "Re-seeding never clobbers occupants" is trivial — there is no seeding.
- **Reload semantics:** reload of `api/office.ts`/`OfficeLogic.ts` re-resolves the registry pointer (the `_resetRegistryRefForReload` seam); reload of `obj/OfficeRegistry.ts` re-clones the Stuff and re-runs `postRegister` idempotently (HotReloadApi pattern) — handoffs are read fresh from the collection, founder credential re-read from env. A handoff assigned at runtime survives a reboot because it lives in `office_holders`, untouched by `postRegister`.

---

## Phase 5 — Tests (mapped to acceptance criteria)

Follow the `obj/__tests__/AccessRegistry.test.ts` in-memory `PersistenceManager` harness (a name/path/query-filtered store, hand-stamped registry at its `TemplatePaths` location, real `Avatar` instances). **Extend the harness store to serve the identity collections** the founder resolution needs: `users` (queried by `{ playerIds: <id> }` array-contains and by `_id`/`findById`), `google_profiles` + `twitch_profiles` (queried by `_id`/`findById`), and `office_holders` (queried by `{ officeKey }`). Stub `User`/`GoogleProfile`/`TwitchProfile` rows directly in the store (the requirements call for "stubbed profiles").

**`packages/server/src/mud/obj/__tests__/OfficeRegistry.test.ts`** (substrate + credential + founder-default + handoff persistence)
- *Apparatus warmed:* after `postRegister`, all **five** offices resolve with correct `branch` (executive/legislative) and `origin` (`constituted`/`founder-established`); assert **no `jury`/judiciary office** exists and the `Office` shape carries **no `cardinality`/`mustBeFilled`**. **[AC: five offices warmed; no jury/judiciary]**
- *Founder by Google email:* a `User` with a `GoogleProfile.email` matching `FOUNDER_GOOGLE_EMAIL` (case-insensitive) → `isFounder(playerId)` true; a non-matching email → false. **[AC: isFounder true for matching Google email]**
- *Founder by Twitch handle:* a `User` with a `TwitchProfile.login` matching `FOUNDER_TWITCH_HANDLE` lowercased → true; case-insensitive match holds. **[AC: isFounder true for matching Twitch handle]**
- *No matching User yet:* a playerId with no owning `User` (founder not logged in) → `isFounder` false. **[AC: false when no matching User exists yet]**
- *Founder is default holder:* with no handoffs, `holderOf(office)` returns the founder (`kind:'founder'`, `founderLabel` = the configured handle) for **every** office, and `holdsOffice(founderPlayerId, office)` is true for every office. **[AC: founder-default / pool-of-one]**
- *officesOf(founder):* lists **all five** offices when no handoffs exist; a non-founder lists none. **[AC: officesOf includes the founder's full set]**
- *Assign overrides:* `assign(alice, 'prime-minister')` → `holderOf` explicit Alice, `holdsOffice(alice)` true, `holdsOffice(founder,'prime-minister')` **false** (and `officesOf(founder)` drops PM but keeps the other four). **[AC: assign makes Alice holder; founder no longer holds that seat]**
- *Assign replaces:* a second `assign(bob,'prime-minister')` → Bob is holder, Alice no longer; result reports Alice displaced. **[AC: second assign replaces]**
- *Vacate reverts:* `vacate('prime-minister')` deletes the row → `holderOf` reverts to the founder, `holdsOffice(founder,'prime-minister')` true again. **[AC: vacate reverts to the founder]**
- *Handoff persists across reload:* assign at runtime, re-construct the registry over the same store, `postRegister` again → the handoff row survives, not clobbered (nothing to seed). **[AC: explicit handoffs persist across a registry reload]**
- *Roster:* `roster()` lists offices with branch, origin, and current holder (explicit playerId or founder label). **[AC: roster lists offices, branch, origin, current holder]**
- *Security:* reaching the registry directly and calling a method without the Api/Logic caller frame throws `SecurityError` (the AccessRegistry gate test). **[gated-api invariant]**

**`packages/server/src/mud/api/__tests__/office.test.ts`** (facade gating)
- Public reads (`roster`/`holderOf`/`holdsOffice`/`officesOf`/`isFounder`/`founderLabel`) forward without a caller frame (ungated). **[AC: roster publicly readable]**
- `assign`/`vacate` called from outside `OfficeController`'s module throw `SecurityError` (the narrow-entry gate). **[gated-api invariant]**
- No-registry path returns the documented closed-fail defaults.

**`packages/server/src/mud/lib/command/validators/__tests__/requiresFounder.test.ts`** (authority)
- `preload` true (founder) → body returns `undefined` (allowed); `preload` false (non-founder) → deny string. Stub `OfficeApi.isFounder`. **[AC: non-founder denied; founder allowed]**

**`packages/server/src/mud/lib/command/validators/__tests__/requiresGovernor.test.ts`** (the central-bank consumer)
- `preload` true when `OfficeApi.holdsOffice(giver, 'central-bank-governor')` is true (stub it) → allowed; false (a non-Governor — including a wizard who does not hold the seat) → deny string. Assert the validator queries the `central-bank-governor` office key. **[AC: `reserve` gated on the Governor office; non-Governor/non-holding-wizard denied]**

**`packages/server/src/mud/obj/command/governance/__tests__/OfficeController.test.ts`** (verb mapping)
- `assign` maps the resolved target → playerId + office key and dispatches `OfficeApi.assign` (stubbed) — never the registry; `vacate` maps the office key only and dispatches `OfficeApi.vacate`; unknown-office and no-target failure paths note the right reason; `list`/bare renders the (stubbed) roster including the founder-default rows. Authority is the validator's job (not re-tested here, per the `WizardController` test's own note). **[AC: assign/vacate/roster via the verb]**

**Manual/scripted live check** (Phase 3.5 flashpoint, not a unit test): founder vs non-founder run `offices` / `office assign` / `office vacate` against the running server (with the founder's real linked credential in the dev env); confirm affordance visibility + the `requiresFounder` denial + the controller-seed lets the verb dispatch + the founder-default presentation by handle. **[AC: non-founder denied; affordance wiring; founder-default presentation]**

---

## Phase 6 — Documentation

### 6.1 `packages/server/docs/subsystems/governance.md` (NEW)
The subsystem doc (the `access.md` shape). Record:
- The office model and the **apparatus-vs-group-vs-chamber** distinction (an office is a named single-holder seat with branch + origin, authored-in-code — *not* a user-minted `Group`, *not* an influence-derived chamber population).
- The five seeds + the `constituted` vs `founder-established` origin axis; the Governor's executive-branch/no-independence rationale (Art. V §9 / VIII §4 / VIII §3); **why there is no judiciary office** (a jury is selection-from-a-pool, deferred).
- The **founder-default + credential** model: `FOUNDER_GOOGLE_EMAIL`/`FOUNDER_TWITCH_HANDLE` → `User` ↔ `GoogleProfile`/`TwitchProfile` resolution; orthogonal to the `streamers` axis and the `isWizard` code-trust axis; inert until the founder logs in (Art. XI pool-of-one).
- The **sparse-handoff** occupancy model: founder is the computed default, only explicit handoffs persist (`office_holders`); `assign` overrides, `vacate` reverts (office-only, no empty state).
- The check + public roster surface (`OfficeApi` methods) and the gated-mutation narrow-entry.
- The **one wired consumer**: the Governor gates the central bank's `reserve` verb (re-gated from `requiresWizard` → `requiresGovernor`/`holdsOffice('central-bank-governor')`) — the right axis (monetary authority, not code-trust). The deferred consumers (PM→archwizards, Speaker→chamber-floor) and the rest of the non-goals (juries/sortition/judiciary, multi-seat bodies, terms).

### 6.2 `CLAUDE.md` (EDIT)
Add a doc-map bullet in the `docs/subsystems/` list (after `access.md`, line ~74), e.g.:
`- [governance.md](./docs/subsystems/governance.md) — the **Office substrate** (single-holder seats of government, distinct from groups & chambers): the `Office` value-object + branch/origin vocabularies + the authored `OFFICE_APPARATUS` (five offices — PM, three House Speakers, the founder-established Central-Bank Governor; no jury/judiciary, no cardinality), the manifest-warmed `OfficeRegistry` singleton (**founder-as-default-holder** by external credential — `FOUNDER_GOOGLE_EMAIL`/`FOUNDER_TWITCH_HANDLE` resolved through `User`↔`GoogleProfile`/`TwitchProfile`, orthogonal to the wizard/streamer axes — with a sparse `office_holders` handoff store that persists only explicit assignments) behind the gated `OfficeApi`/`OfficeLogic` pair; founder-gated `office assign/vacate` (the new `governance` command category, `requiresFounder`) + the public `offices` roster (Art. VII); ships the `holderOf`/`holdsOffice`/`officesOf` check surface and its first consumer — the central bank's `reserve` (mint/supply) verb re-gated from `requiresWizard` to the `central-bank-governor` office (`requiresGovernor`).`

### 6.3 Cross-reference (EDIT, if present)
Per the AC, add a back-reference from `docs/slates/builds/cooperative-slate.md` to `governance.md` ("the cooperative-slate cross-references it"). Verify the slate exists before editing.

### 6.4 `docs/subsystems/banking.md` (EDIT)
Update the `reserve`-verb description: it is no longer `requiresWizard`-gated but **Governor-gated** (`requiresGovernor` / the `central-bank-governor` office) — the monetary-authority axis, not code-trust. One-line correction plus a pointer to `governance.md`; this realizes the "governance of the central bank" that `CentralBank.ts` / banking.md noted as deferred.

---

## Execution order & sequencing

1. **Phase 1** (substrate) — value-object, handoff Document, `paths.ts`, registry, manifest, env. Nothing else compiles without `Office`/`OfficeRegistry`.
2. **Phase 2** (Api/Logic) depends on Phase 1.
3. **Phase 3** (verb/category/validator) depends on Phase 2 (`OfficeApi.assign`/`vacate`/`isFounder`). The `OfficeApi` mutation gate references `'mud/obj/command/governance/OfficeController'` by **string** (not a value import) to avoid the static-import cycle (the `setWizardMembership`/`WizardController` precedent).
4. **Phase 4** verifies Phase 1's persistence — no separate code.
5. **Phase 5** (tests) after the surface exists.
6. **Phase 6** (docs) last.

Run `npm run -w packages/server typecheck` (and lint) after Phases 1–3; run the new test files in Phase 5; do the live affordance check (3.5) before considering the build complete.

## Risk callouts

- **Credential-resolution correctness (highest risk):** match Twitch `login` case-insensitively (it is stored lowercased); compare Google `email` case-insensitively too. `isFounder` must return false (not throw) when no owning `User`/profile exists yet — the founder may not have logged in at boot. Resolve per-check (no stale cache) so a post-boot founder login is recognized immediately.
- **Affordance correctness:** afford on `Persona` (universal), gate `assign`/`vacate` subcommands with `requiresFounder`. Verify live — unit tests pass even if the affordance is mis-homed.
- **`vacate` signature change:** office-only (no player). Make sure the YAML arg list, controller, Api, Logic, and registry all agree — a singular seat reverts to the founder; there is no `(player, office)` vacate and no empty state.
- **Import cycle:** keep the `OfficeApi`→`OfficeController` gate string-keyed.
- **No-registry test-path fail direction:** office predicates fail **closed** (`holdsOffice`/`isFounder` → false); document why (no dispatcher-side governance pre-gate, unlike `AccessApi.can`/`isWizard`).
- **Test harness scope:** the registry test must stand up the `users`/`google_profiles`/`twitch_profiles`/`office_holders` collections in the in-memory store, including the `{ playerIds: <id> }` array-contains query and `findById`.

## Critical files for implementation
- `packages/server/src/mud/obj/OfficeRegistry.ts` (new — the substrate singleton; founder credential resolution + sparse-handoff occupancy; mirrors `obj/AccessRegistry.ts`, minus seeding)
- `packages/server/src/mud/lib/governance/Office.ts` (new — value-object + branch/origin vocabularies + `OFFICE_APPARATUS` + result types; no cardinality/mustBeFilled)
- `packages/server/src/mud/api/office.ts` + `packages/server/src/mud/obj/api/OfficeLogic.ts` (new — the gated facade↔logic pair; mirror `api/access.ts` + `obj/api/AccessLogic.ts`)
- `packages/server/src/mud/obj/command/governance/OfficeController.ts` + `packages/server/src/mud/cmd/governance/office.yaml` (new — the verb + the new `governance` category)
- `packages/server/src/mud/lib/identity/{User,GoogleProfile,TwitchProfile}.ts` (existing — the credential-resolution path `isFounder` consumes)
