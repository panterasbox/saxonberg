# Implementation Plan — Social Inspection

Plan for [social-inspection-requirements](../requirements/social-inspection-requirements.md)
(seeded by [social-inspection-slate](../slates/tails/social-inspection-slate.md)).
Retired at the pre-merge sweep; deferred-wave intent (live `profile`
pane, invisibility) goes back to the slate, not the plan.

Self-contained for a fresh build agent who has read the requirements doc
plus `social-graph.md` / `belief.md`. Scope is CLOSED to the requirements.

---

## 0. Seam confirmation (verified in code, not re-derived)

| Requirement claim | Confirmed at |
|---|---|
| Online set | `PlayerApi.getAllAvatars()` → `obj/api/PlayerLogic` (`api/player.ts:103`) |
| Viewer-aware naming | `RecognitionApi.describe(viewer, target)`, `.salientFeatures(target, covered?)`, `.recognizes(viewer, subject)` (`api/recognition.ts:80,107,117`) |
| Country | `ConnectionApi.originOf(playerId): { country? }` (`api/connection.ts:155`) |
| Renown scalar | `RenownApi.renownOf(subjectId, scope?)` (`api/renown.ts:110`); band via `Band.fromScalar(scalar, thresholds?)` (`lib/standing/Band.ts:60`) |
| Influence/competence/trait bands | `InfluenceApi.bandOf(subjectId, stock)` (`api/influence.ts:42`), `AdvancementApi.bandFor(owner, discipline)` (async, `api/advancement.ts:120`), `TraitApi.positionsFor(owner)` (async, `api/trait.ts:119`) |
| Chronicle | `ChronicleApi.entriesFor(owner)` (async, `api/chronicle.ts:117`) |
| Flavor status line | `StatusMixin.getStatus()` (`lib/status/Status.ts:91`) |
| Engaged state | `EngagedMixin.getEngagements()/getEngagementBySlot()` (`lib/activity/Engaged.ts`) |
| Identity fields | `NamedMixin` getHonorific/getName/getSurname/getNameSuffix (`lib/description/Named.ts`), `SexedMixin` (`lib/character/Sexed.ts`), `GenderedMixin.getPronouns()` (`lib/character/Gendered.ts:42`), `PersonaMixin.getBio()/getAspiration()` (`lib/character/Persona.ts:32`), `OrganismMixin` (`lib/species/Organism.ts`) |
| Account newness | `User extends Document` → `createdAt: Date` (`lib/persistence/Document.ts:96`); reached via target `Avatar.getUser()` / `PlayerApi.findAvatarByPlayerId(playerId).getUser()` |
| Settings-on-mixin | `NotifyPolicyMixin.settings: SettingsSchemaEntry[]` homes `social.verbosity`/`social.presenceFormat` (`lib/social/NotifyPolicy.ts:78`) |
| Read-only verb mold | `StandingController` — `MessageApi.scene(actor).topic(...).toSelf(body).send()`, returns `void` (`obj/command/social/StandingController.ts`) |
| Idle-timer seam | `Interactive` has transient `connectedAt`/`origin` (never persisted) (`obj/Interactive.ts:38,86`); dispatch tail with interactive-origin gate is `CommandGiver._emitInputEcho` / `executeCommand(opts.interactive)` (`lib/command/CommandGiver.ts:516,750`) |
| Presence relay | `SocialLogic.installPresenceTap()` over `Events.PlayerLoggedIn/Reconnected/LoggedOut/Disconnected`, emits `world.social.presence` frames with a structured `SocialNotificationPayload` (`obj/api/SocialLogic.ts:827,680`) |
| Client pane host | `InspectionPane.tsx` subscribes via `websocketClient.subscribeMql`; presence frames already arrive on `world.social.presence` (`packages/client/src/services/websocket.ts:473`) |

**One mismatch found — load-bearing, drives a design decision below:** the
existing `world.social.presence` frame is **notify-rule-gated**
(`relayPresenceImpl` skips any viewer whose first-matching rule is
`silent`; the default-silent baseline for non-contacts means a stranger's
arrival never reaches you). It is a *notification* surface, not a
presence-complete roster stream. The live "Who's Online" pane therefore
**cannot** ride that frame as its sole source — it needs a
presence-public, viewer-lensed roster-delta channel. See § Client (the
roster-delta tap).

No new module category is required: every new file lands in an existing
category (`Api`, `Api logic singleton`, `Controller`, `Command YAML`).
Two edits ride existing files (`Interactive`, `NotifyPolicy`).

---

## 1. Module inventory

### New files — server

| File | Category | Purpose |
|---|---|---|
| `mud/api/presence.ts` | Api | `PresenceApi` — `online()` roster accessor + roster-tap boot seam. Thin forwarding shell, ends `SecurityApi.decorateApiClass`. |
| `mud/obj/api/PresenceLogic.ts` | Api logic singleton | `PresenceLogic` at `/obj/api/presence` — the online-set filter over `getAllAvatars()`, the four-event roster-delta tap, the presence-status derivation. `@internal`, methods gated `FromModule('mud/api/presence#PresenceApi')`. |
| `mud/api/profile.ts` | Api | `ProfileApi` — `composeCard(viewer, target)` + `composeRow(viewer, target)`. The single redaction chokepoint. Exports the `ProfileCard` / `RosterRow` call-shape types. |
| `mud/obj/api/ProfileLogic.ts` | Api logic singleton | `ProfileLogic` at `/obj/api/profile` — all redaction/tier logic, band reads, recognition routing. Gated `FromModule('mud/api/profile#ProfileApi')`. |
| `mud/obj/command/social/WhoController.ts` | Controller | `who` + filters. |
| `mud/obj/command/social/ProfileController.ts` | Controller | `profile`/`finger`/`score`/`me` (target-or-self). |
| `mud/cmd/social/who.yaml` | Command YAML | `verbs: [who]`, the four filter flags. |
| `mud/cmd/social/profile.yaml` | Command YAML | `verbs: [profile, finger]`, optional `target` arg. |
| `mud/cmd/social/score.yaml` | Command YAML | `verbs: [score, me]`, no arg (forces self). |

### New files — client

| File | Purpose |
|---|---|
| `packages/client/src/components/WhoPane.tsx` | The live "Who's Online" cockpit pane. |
| `packages/client/src/store/whoSlice.ts` (or fold into `store/index.ts`) | Roster state: ordered rows keyed by stable handle; snapshot-set + delta-apply reducers. |

### Modified files

| File | Change |
|---|---|
| `mud/obj/Interactive.ts` | Add transient `lastInputAt: Date` (sibling of `connectedAt`; **no** `persistentFields` entry), `getLastInputAt()` / `touchInput()`. Init to `connectedAt` value in ctor. |
| `mud/lib/command/CommandGiver.ts` | At the dispatch tail, refresh `opts.interactive?.touchInput()` on real-player input (same interactive-origin gate the participation faucet uses). |
| `mud/lib/social/NotifyPolicy.ts` | Add `privacy.showStatus` to the `settings` array (enum `anyone`/`contacts+`, default `anyone`). (Acceptable alternative: a sibling `PrivacyPolicyMixin` in `lib/social/` — but folding into the existing social-settings home is less surface and is what the requirements name first.) |
| `mud/config/app-settings.yaml` | Add `social.idleAfter` (seconds, default 300). |
| `mud/lib/config/AppSettings.ts` | Add `social.idleAfter` to the `AppSettingKeys` vocabulary. |
| Bootstrap (`AppBootstrap.run()`, wherever `SocialApi.boot()` is wired) | Add `PresenceApi.boot()` to install the roster-delta tap. |
| `packages/client/src/App.tsx` (or cockpit layout) | Mount `WhoPane`. |
| `packages/client/src/services/websocket.ts` | Register a handler for the new `world.social.roster` topic + a roster-snapshot request/response, feeding `whoSlice`. |

---

## 2. Key types & signatures

### PresenceApi / PresenceLogic

```ts
// api/presence.ts
export class PresenceApi {
  /** Boot seam (idempotent). Installs the roster-delta tap. Wired from AppBootstrap. */
  static boot(): void;                      // → logic().installRosterTap()
  /** Every online avatar — the cheap filter over PlayerApi.getAllAvatars()
   *  (connected, non-guest-or-incl-guest per policy, not destroyed). */
  static online(): Avatar[];
  /** Derived session presence status for `target`, in display-precedence order:
   *  reconnecting > engaged > idle > active. Pure, computed on read. */
  static statusOf(target: Avatar): PresenceStatus;
}
export type PresenceStatus = 'active' | 'idle' | 'engaged' | 'reconnecting';
```

`statusOf` derivation (in `PresenceLogic`, no stored idle state):
1. **reconnecting** — the connection-loss machine: the avatar reports linkdead / its `Interactive.sessionActive` is false but the instance lingers (reuse the same signal the relay's reconnect split uses).
2. **engaged** — `MixinApi.isEngaged(target) && target.getEngagements().length > 0`.
3. **idle** — `now - interactive.getLastInputAt() > AppApi.get('social.idleAfter') * 1000`. The interactive is resolved from the avatar's holder/connection (the avatar→Interactive link already used by the relay's `isConnected()`).
4. **active** — otherwise.

### ProfileApi / ProfileLogic — the single redaction seam

```ts
// api/profile.ts
export class ProfileApi {
  /** The full inspection card, viewer-redacted by recognition + the target's
   *  disclosure dial. `viewer === target` → unredacted self-card + standing digest. */
  static composeCard(viewer: Stuff, target: Avatar): Promise<ProfileCard>;
  /** The one viewer-lensed roster row — header + country + (gated) status.
   *  Shared by `who` rows and the live pane. */
  static composeRow(viewer: Stuff, target: Avatar): Promise<RosterRow>;
}
```

```ts
export interface RosterRow {
  handle: string;          // stable per-target key for the client (target.getTemplatePath() ?? stuffId)
  header: Mml;             // RecognitionApi.describe(viewer,target) — name OR salient features
  country?: string;        // ConnectionApi.originOf — ALWAYS shown when resolved
  status?: PresenceStatus; // present only if privacy.showStatus passes the viewer's tier;
                           //   bare-online is the row existing at all
  recognized: boolean;     // drives client styling (clickable → `profile <name|desc>`)
}

export interface ProfileCard {
  handle: string;
  header: Mml;                       // perceived description (disguise+recognition aware)
  country?: string;                  // always
  newness?: 'new-arrival';           // coarse, from User.createdAt; always
  status?: PresenceStatus;           // gated by privacy.showStatus (non-self)
  // physical / observable — disguise-aware (NOT raw getters for non-self)
  species?: string; sex?: string; pronouns?: string; ageStage?: string;
  flavor?: string;                   // StatusMixin.getStatus()
  // persona — recognition-gated (omitted entirely for a stranger)
  nameSurface?: { honorific?; name; surname?; suffix?; alternates?: string[] };
  aspiration?: string; bio?: string;
  chronicle?: { prologue?: string; deeds: string[] };  // public deeds only for non-self
  portraitUrl?: string;              // generic/disguised for stranger, real when recognized/self
  // always-outward standing
  renownBand?: BandName; competenceBands?: { discipline: string; band: BandName }[];
  // self-only standing digest (empty lines hidden)
  digest?: {
    renown?: BandName;
    influence?: { play?: BandName; make?: BandName; fund?: BandName };
    competence?: { discipline: string; band: BandName }[];
    traits?: { axis: string; pole: string; band: string }[];
  };
  // observer-owned annotations (your read, never the target's disclosure)
  yourLabel?: string;                // viewer's ContactsMixin label for target
  yourRegard?: string;               // RegardApi qualitative read
  isSelf: boolean;
}
```

**Redaction algorithm (`ProfileLogic.composeCard`):**

- **viewer === target** → read raw mixin getters, fill every field + the self-`digest` (hide empty digest lines per the "hide empties" decision), no observer-annotations. Return.
- **non-self:**
  - `recognized = RecognitionApi.recognizes(viewer, target)`.
  - `header = Mml.fromString(RecognitionApi.describe(viewer, target))` — name when recognized, salient-features string when stranger; disguise honored inside `describe`.
  - **Physical/observable fields** (species, sex, age, pronouns, flavor): route through the disguise-aware presentation, **never raw `OrganismMixin`/`SexedMixin` getters**. Concretely: consult `target.getDisguise()` (Disguisable) / `getPresentation()`; when a disguise masks the body, fall back to the salient-feature string and omit the structured fields rather than leaking the true value. (Pronouns/species ride the existing `getPresentation`/`salientFeatures` machinery per the requirements; flavor `getStatus()` already rides presentation.) — *This is the per-viewer-composer correctness crux; see risks.*
  - **Persona block** (`nameSurface`, `aspiration`, `bio`, `chronicle`, real `portraitUrl`): emitted **only when `recognized`**.
  - **Country / newness** (`ConnectionApi.originOf(playerId).country`; `newness` from `target.getUser()?.createdAt` vs a coarse threshold): **always**.
  - **status** (`PresenceApi.statusOf`): emit the granular word only when `privacy.showStatus` resolves to a tier the viewer meets (`anyone`, or `contacts+` and the viewer is in target's contacts / recognized) — else omit (bare online = row/card existing). Resolve the setting via `ShellApi.resolveSetting<string>(target, 'privacy.showStatus')`.
  - **renownBand** (`Band.fromScalar(RenownApi.renownOf(subjectId), thresholds)`) and **competenceBands** (`AdvancementApi.bandsFor`): **always-outward**.
  - **influence / traits**: omitted for non-self.
  - **observer-owned**: `yourLabel` from viewer's `ContactsMixin`; `yourRegard` from `RegardApi` (viewer→target). These are the viewer's annotation, not target disclosure.
- `subjectId = target.getTemplatePath() ?? target.stuffId` (the `StandingController` keying convention) for all band reads.

`composeRow` is the cardinality-one subset: header + country + gated status + `recognized`.

### The privacy setting (on `NotifyPolicyMixin.settings`)

```ts
{
  key: 'privacy.showStatus',
  type: SettingTypes.Enum,
  enumValues: ['anyone', 'contacts+'],
  default: 'anyone',
  description:
    'Who may see your granular presence status (engaged / idle). ' +
    '`anyone` offers it to strangers; `contacts+` shows only bare online ' +
    'to strangers and the detail to contacts. Bare online is always public.',
}
```

### The idle timer (the one hot-path touch)

`Interactive`: add `protected lastInputAt: Date;` (init `= this.connectedAt` in ctor), `public getLastInputAt(): Date`, `public touchInput(): void { this.lastInputAt = new Date(); }`. **Not** added to any `persistentFields` (Interactive is never persisted anyway).

`CommandGiver.executeCommand`: at the dispatch tail, on real-player input only (the same `opts.interactive` / interactive-origin gate the participation faucet keys on), call `opts.interactive?.touchInput()`. A single transient `Date` assignment — negligible. Idle is **derived on read** in `PresenceLogic.statusOf`, never an event/field.

---

## 3. Ordered phases

### Phase 1 — Substrate seams (no player-visible change yet)
1. `Interactive.lastInputAt` + accessors; ctor init.
2. `CommandGiver` dispatch-tail `touchInput()`.
3. `social.idleAfter` AppSetting (yaml + `AppSettingKeys`).
4. `privacy.showStatus` on `NotifyPolicyMixin.settings`.
5. `PresenceApi`/`PresenceLogic` with `online()` + `statusOf()` (tap stubbed). Unit-test `statusOf` precedence + idle derivation against a mocked clock/setting.

### Phase 2 — The composer (the one redaction seam)
6. `ProfileApi`/`ProfileLogic` with `composeCard` + `composeRow`. This is the load-bearing step; everything else is a thin caller. Build the redaction algorithm above; wire all band/identity/recognition reads through the confirmed Apis.
7. Heavy unit tests on the composer (see test plan) — stranger vs recognized vs self, disguise masking, `privacy.showStatus` threshold, renown scalar→band, coarse newness, observer-owned annotations.

### Phase 3 — The verbs (command-only surface)
8. `WhoController` + `who.yaml`: read `PresenceApi.online()`, map each through `ProfileApi.composeRow(giver, target)`, apply `--here`/`--friends`/`--group <g>`/`--country <c>` filters (narrow only). At high occupancy, reuse the social-graph density aggregation — call `SocialApi.composeOccupants(viewer, occupants, roomSize)` for the collapse tiers rather than enumerating, or factor the same density helper. Render via `MessageApi.scene(actor).topic('world.social').toSelf(body).send()`. Read-only, returns `void`.
9. `ProfileController` + `profile.yaml` (`[profile, finger]`, optional `target`) + `score.yaml` (`[score, me]`, self): resolve `viewer = context.commandGiver`; resolve target by viewer-relative name (reuse `RecognitionApi.perceivedKeywords` targeting so the name-leak gate holds) or self when no arg; `ProfileApi.composeCard`; render the card; self-card appends the standing digest with each line hover-previewing its detail verb (`standing`/`traits`/`competence`/`chronicle`) via the global clickable-preview mechanism.

### Phase 4 — The live client pane
10. Server roster-delta tap (`PresenceLogic.installRosterTap`, wired from `PresenceApi.boot()` in bootstrap): subscribe to the four existing `Events.PlayerLoggedIn/Reconnected/LoggedOut/Disconnected` (reuse the relay's reverse-scan shape). For each transition, fan a **presence-public** (NOT notify-gated) `world.social.roster` frame to every online viewer carrying `{ action: 'add'|'remove'|'update', row: composeRow(viewer, actor) }`. Plus a roster-snapshot reply when a client requests it (on pane open / reconnect).
11. `whoSlice` + `WhoPane.tsx`: on mount, request the snapshot (or issue `who`); apply deltas keyed by `row.handle`. Rows clickable, hover-preview `profile <name|description>` in the command bar (server-projected rows; client composes nothing). Register the `world.social.roster` handler in `websocket.ts`; re-request snapshot on `connection.established` (mirrors the MQL re-subscribe loop).

---

## 4. Client subscription mechanics

- **Data source decision:** the pane does **not** ride the notify-gated `world.social.presence` frame and does **not** use a per-viewer MQL projection (the deferred live-`profile` bet). It uses a **new thin `world.social.roster` delta frame** produced by a sibling tap over the *same four existing presence Events* — so "rides existing presence deltas / no new event firehose" holds at the Event layer; only the wire-frame transport is new.
- **Snapshot + deltas:** open → request snapshot (server returns `composeRow` for the full `PresenceApi.online()` set, viewer-lensed) → store as ordered rows keyed by `handle` → apply `add`/`remove`/`update` deltas live. Re-request on reconnect (registry-replay pattern already in `websocket.ts`).
- **Clickables:** each row previews `profile <handle-or-perceived-name>`; standing-digest lines on the self-card preview their detail verb. Client owns zero card semantics.

---

## 5. Test plan

**Server (Vitest, mirroring `obj/api/__tests__` and `obj/command/social/__tests__`):**
- `ProfileLogic` redaction matrix: stranger (header = salient features, no name/bio/aspiration/chronicle, generic portrait, country+newness+renown+competence present) vs recognized (persona unlocked) vs self (everything + digest, empties hidden).
- Disguise: a masked target never leaks true name/species through `composeCard` for a recognizing viewer.
- `privacy.showStatus` threshold: `anyone` → stranger sees engaged/idle; `contacts+` → stranger sees bare online only, a contact sees the word.
- Renown scalar→band rendering (`Band.fromScalar`), never a number on the card.
- Coarse-newness derivation from `User.createdAt` vs threshold.
- `PresenceLogic.statusOf` precedence (reconnecting > engaged > idle > active) and idle derivation against a mocked `social.idleAfter` + `lastInputAt`; any command resets to active (touchInput).
- `WhoController`: roster lists every online player; each `--here`/`--friends`/`--group`/`--country` filter narrows correctly; density collapse fires at high occupancy via the reused aggregation.
- Observer-owned annotations appear from the viewer's contacts/regard, never on the target's self-card.
- `lint:gates` passes (the Api/logic gating); `lint:pm` if any persistence touched (none expected).

**Client (Vitest + RTL, mirroring `components/__tests__`):**
- `whoSlice`: snapshot-set then `add`/`remove`/`update` deltas keyed by handle; ordering stable.
- `WhoPane`: renders rows, clickable rows preview `profile <name>`; reconnect re-requests snapshot.

---

## 6. Architectural trade-offs & risks

1. **The per-viewer composer.** `ProfileApi.composeCard` runs per (viewer, target) and reads recognition + disguise + several band Apis (two async: `AdvancementApi.bandFor`, `TraitApi.positionsFor`, plus `ChronicleApi.entriesFor`). For `who` at N online players this is N row-composes per viewer per refresh. Mitigations: `composeRow` is the cheap subset (header + country + status — no chronicle/trait/competence async fan-out); the density aggregation collapses like-strangers before composing; band reads are warmed sync caches (`RenownApi.renownOf`, `InfluenceApi.bandOf`). The full async card is only built on an explicit `profile`/`score`. The redaction logic living in exactly one place is the whole point — do not let `who` or the pane grow a second composer.
2. **The "route physical fields through perception, never raw getters" rule has a surface gap.** `RecognitionApi` lenses the *name*; there is no structured per-field "perceived species/sex/age" accessor today — the disguise machinery encodes the body into the salient-feature *string*. The composer must therefore derive structured physical fields from the disguise-aware presentation and, when a disguise masks the body, omit the structured field and let the salient-feature header carry it — rather than reading `OrganismMixin.getSpecies()` raw (which would leak through disguise). If a structured perceived accessor is later wanted, it is a small belief/perception-layer addition; v1 stays within the existing `describe`/`salientFeatures`/`getPresentation` surface. Flag this in the build as the composer's correctness crux.
3. **CommandGiver hot-path touch.** `touchInput()` is a single transient `Date` assignment at the dispatch tail, gated to real-player (`opts.interactive`-origin) input — the same gate the participation faucet already pays for; cost is negligible and nothing is persisted, scheduled, or fanned out. Idle is derived on read, so there is no timer-per-player.
4. **The client pane's data source (the real divergence from a naive reading).** The existing `world.social.presence` frame is **notify-rule-gated** and presence-*incomplete* (strangers' arrivals are suppressed by the default-silent baseline), so it cannot be the pane's source. The plan adds a presence-public `world.social.roster` delta frame over the same four Events. This is the one piece that is "new wire surface" rather than pure reuse; it is justified because presence is unconditionally public (requirements § "Presence is unconditionally public") whereas the notification relay is intentionally gated. Keep the roster tap's fan-out bounded by the same online-viewer reverse-scan the relay uses; it composes only `composeRow` (cheap), not full cards.
5. **Module-taxonomy discipline.** Two new `Api` + two `Api logic singleton` + two controllers + three YAML — all existing categories; no free-floating helpers, no new mixin subsystem. The only mixin edit is a `settings` array entry on `NotifyPolicyMixin` (or, if preferred, a sibling `PrivacyPolicyMixin` under `lib/social/` — a propose-first decision, but folding into the existing social-settings home is the lower-surface default the requirements name first). Confirm `PresenceApi.boot()` is added next to `SocialApi.boot()` in the bootstrap.
6. **`finger`/`me`/`score` as verb-array aliases**, not YAML `aliases:` (the repo uses the `verbs: [...]` array — `verbs: [standing]` precedent). `score`/`me` force self; `profile`/`finger` take the optional target. One `ProfileController` handles all three behaviors off the model's target presence.

---

## Critical files

- `packages/server/src/mud/obj/api/ProfileLogic.ts` (new — the single redaction seam; the load-bearing step)
- `packages/server/src/mud/obj/api/PresenceLogic.ts` (new — `online()` + `statusOf()` derivation + roster-delta tap)
- `packages/server/src/mud/obj/command/social/WhoController.ts` (new — roster + filters + density reuse)
- `packages/server/src/mud/lib/command/CommandGiver.ts` (modified — the one idle hot-path touch)
- `packages/client/src/components/WhoPane.tsx` (new — live pane off the roster-delta frame)
