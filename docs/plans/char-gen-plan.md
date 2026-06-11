# Char-Gen Wave 1 — implementation plan

> Plan for [docs/requirements/char-gen-requirements.md](../requirements/char-gen-requirements.md).
> Produced by the Plan agent against verified codebase ground truth.
> Build-ordered phases A–E; resolves the open plumbing (Login command
> dispatch, uniform step model, bio/aspiration home, char-gen-state
> frame, name suggester, atomic commit).

## 0. Verified ground truth (re-confirmed against source)

- **Login** (`obj/Login.ts`) extends `HasInteractiveMixin(Idea)`; the only hardcoded "exactly one" is the throw at `Login.ts:57-62`. Login destructs itself at `enter()`'s tail (`Login.ts:74`). It already takes the holder via `ConnectionApi.transfer(interactive, this)` (`:54`) — so it can legitimately be a scene actor and a holder.
- **`Scene.toSelf` requires `MixinApi.isSensor(actor)`** (`api/message.ts:143`) and stamps `audience:actor`; `SensorMixin.filterMessage` lets `audience:actor` frames through unconditionally (`Sensor.ts:67`), and modality-tagged frames drop on a bodiless host (no sensorium). `toSelf` does **not** require Containable (only `toPeers`/`toContents` do). So `MessageApi.scene(login).toSelf(...).send()` delivers narration to Login the moment Login is a Sensor and overrides `handleMessage` to fan out to its Interactive — exactly mirroring `Avatar.handleMessage` (`Avatar.ts:417-422`).
- **Command ingress is holder-gated to Avatar**: `inbound/command.ts:21` (`!(holder instanceof Avatar)` → "No active character"). This gate broadens to any `CommandGiver` holder. Verbs dispatch through `CommandGiver.executeCommand`; **Login becomes a real `CommandGiver`** (composing `CommandGiverMixin`) with a 3-verb allowlist, so `enroll`/`play`/`look` run on the genuine pipeline — see §3.1. Verb availability is driven entirely by the recency stack / `commandContributions` (no global verb set), so the allowlist is the whole sandbox.
- **Signup auto-mints one avatar** at `Application.ts:342-346` (inside `findOrCreateUser`). Removing those four lines makes signup create zero avatars; `User.playerIds` stays `[]`.
- **Species** (`lib/species/Species.ts:56`) has all sensory fields but **no** default-description and **no** name-bank. `SexedMixin` exists (`Sexed.ts`) but is **not** in the Character composition chain (`Character.ts:81-109`). `OrganismMixin`/`NamedMixin`/`GenderedMixin` are composed; `bio`/`aspiration` have no home.
- **Seed avatar** (`seeds/obj/Avatar/seed.yaml`) already carries `_speciesPath`, `lifecycleState: alive`, `pronouns: they`, `container: /domain/eternal/duncan-hall/lobby`. Per-character templates are forked from it.
- **Client**: phase is implicit (`!auth.isAuthenticated` → login takeover, else cockpit, `App.tsx:529-580`). `setConnected(payload)` fires on `system.connection.established` (`websocket.ts:369-399`). `sendCommand` (`App.tsx:334-367`) is the single command channel. Envelope handling is in `websocket.ts:467-511`; raw non-frame messages (`client-state-update`) are handled separately.

---

## 1. Architecture summary — end-to-end flow

```
SIGNUP (HTTP/OAuth)
  Application.findOrCreateUser  → creates User with playerIds: []   (no avatar)
  Google name retained on User/GoogleProfile only as suggester seed

LOGIN (WS connect)
  Application.handleUserConnect → new Login(interactive) → login.enter()
  Login.enter():
    ConnectionApi.transfer(interactive, login)
    avatars = PlayerApi.loadAvatarsForUser(user)
    branch on avatars.length:
      0   → enterCharGen()    (Login stays alive, becomes the enroll host)
      ≥1  → presentRoster()   (emit roster frame; Login stays alive awaiting pick)

ROSTER  (phase: character-select)
  client renders roster from post-login payload
  `play <playerId>`  (real verb → PlayController) → transfer interactive to that Avatar → avatar.enter() → destruct Login
  `enroll` (create)  → enterCharGen()

CHAR-GEN  (phase: char-gen)
  Login is a REAL CommandGiver (allowlist: enroll/play/look). `enroll` is a real MVC verb.
  Each `enroll <field> <value>` dispatches through the genuine pipeline → EnrollController
    → mutates EnrollmentDraft state on Login + re-emits char-gen-state frame.
  Steps driven by ONE declarative ENROLL_STEPS spec the controller owns (species→sex→name→pronouns→aspiration→confirm).
  Narration / validation feedback ride the response envelope + MessageApi.scene(login).toSelf(...) (Login is Sensor).

COMMIT  (`enroll confirm` → EnrollController.execute)
  commit(login, draft):
    1. fork per-character Avatar template from seed (TemplateApi) keyed by new playerId
       — overlay picks: _speciesPath, sex, name/surname, pronouns, aspiration, bio, description
    2. push playerId onto User.playerIds; user.save()
    3. clone the Avatar (StuffApi.clone, postRegister stamps + installs implant + places at lobby)
    4. dress: SlotApi.occupyAll for aspiration outfit garments (cloned via StuffApi)
    5. ConnectionApi.transfer(interactive, avatar) → avatar.enter(interactive)
    6. StuffApi.destruct(login)
  Atomic: nothing persists until step 2; abandon = no playerId, no orphan template.
```

**New / changed modules by category:**

| Category | Module | New/changed |
|---|---|---|
| Framework (patch) | `lib/command/CommandGiver.ts` — drop the blanket null-location dispatch guard; location becomes optional context (guard scoped to embodied givers / removed). See §3.1. | changed |
| Stuff (patch) | `obj/Login.ts` — compose `CommandGiverMixin` + `SensorMixin`; `commandContributions.self = ['enroll','play','look']`; roster branch; `EnrollmentDraft` state + accessors | changed |
| Stuff (patch) | `backend/Application.ts` — stop auto-mint; carry roster in welcome payload | changed |
| Mixin (compose) | `lib/character/Character.ts` — add `SexedMixin` + `PersonaMixin` | changed |
| Mixin (new) | `lib/character/Persona.ts` — `PersonaMixin` (`bio` + `aspiration`) | new |
| Mixin (patch) | `lib/species/Species.ts` — `defaultDescription` field + `nameBankKeys` reference; `suggestName`/`rerollName` methods (read the referenced `NameBank` Documents) | changed |
| Persistence (new) | `NameBank` `Document` + `name_banks` collection — per-race name pools as plain-JSON content Documents, seeded from YAML (Emote/`SoulCatalogue` precedent) | new |
| Controller (new) | `obj/command/EnrollController.ts` (owns `ENROLL_STEPS` + validation + the commit) + `obj/command/PlayController.ts` (roster select) | new |
| Command YAML (new) | `cmd/enroll.yaml`, `cmd/play.yaml` (views); `look` reuses the existing verb, hardened for null location | new |
| YAML content-seed | 5 new species seeds (default-description + name-bank refs on all 7), the `NameBank` Document seeds, aspiration roster, garment seeds | new |
| Types | char-gen-state frame payload, roster payload extension on `ConnectionEstablishedPayload` | changed |
| Client | connection-phase + roster slices (store), `CharacterSelect.tsx`, `CharGenStage.tsx`, App phase routing | new/changed |

**No new Api — and char-gen runs on the *real* command pipeline.** `enroll` is a genuine MVC verb (view + `EnrollController`), so the player is on our actual command infra from the first keystroke (the whole point). The orchestration lives in `EnrollController` — the real command handler — which owns the `ENROLL_STEPS` step spec + validation and runs the commit (calling the security-threaded `StuffApi.clone` / `SlotApi` / `ContainmentApi` / `ConnectionApi` — the normal pattern). The `EnrollmentDraft` (per-session picks) lives on **Login**, the giver, reached via `ctx.commandGiver`. The **name suggester lives on `Species`** (`suggestName`/`rerollName`), reading the referenced `NameBank` Documents. The **aspiration roster** (bioSeed + outfit mapping) and the **name banks** are **content** (a seed Idea / a `Document` collection), read at commit. A controller is not an Api; nothing here is cross-cutting enough to warrant one.

---

## 2. Build-ordered phases

### Phase A — Server engine: signup-zero + Login Sensor + roster branch

**Goal:** the connection plumbing, independent of any enroll logic. Ship this first; it's testable in isolation (a user with 0 avatars no longer crashes; a user with ≥1 gets a roster frame).

**A1. Signup creates zero avatars.**
`backend/Application.ts:342-346` — delete the `createDefaultAvatarTemplate` call + `playerIds.push` inside `findOrCreateUser`. Keep `createDefaultAvatarTemplate` itself (the commit reuses the same seed-fork pattern — see C/D). Keep the Google name reaching `User`/`GoogleProfile` (already stored) so the suggester can read it.

**A2. Login composes `SensorMixin`.**
`obj/Login.ts` — change base to `SensorMixin(HasInteractiveMixin(Idea))`. Add `handleMessage`/`handleEnvelope` overrides mirroring `Avatar.ts:417-437`, fanning out to `this.interactives` via `Application.sendMessageToInteractive`/`sendEnvelopeToInteractive`. Login holds exactly one Interactive but the loop shape is identical (and free — `getInteractives()`). Add the `Application.getApplicationInstance()`-style accessor (lift the private static from Avatar or reach `Application.get()` directly; Login already imports from the connection layer).
- *Watch:* the `Application → Login → HasInteractive → Application` load cycle is already handled by the strategy-injection note in connection.md; importing `Application` lazily inside `handleMessage` (as Avatar does via `getApplicationInstance`) avoids re-introducing it.

**A3. Login roster branch.**
`obj/Login.ts:57-62` — replace the throw with:
```
if (avatars.length === 0)      → this.enterCharGen()      // Phase C hook; stub in A as a narration frame
else                            → this.presentRoster(avatars)
```
In Phase A, `enterCharGen` is a stub that emits a welcome scene; `presentRoster` emits the roster as a `system.connection.established`-style frame (or its own `system.charactergen.roster` topic) carrying `{ characters: [{playerId, name, species, description}] }` and **keeps Login alive** (do not destruct, do not transfer yet). The actual pick handling (`play <playerId>`) lands in B/C.

**A4. Roster in the post-login payload.**
Extend the welcome/roster frame so the client can render the roster (types change in B). In Phase A, `presentRoster` just emits the `system.charactergen.roster` frame and keeps Login alive. The selection itself — `play <playerId>` → validate the playerId is in `user.playerIds`, `ConnectionApi.transfer`, `avatar.enter`, `StuffApi.destruct(login)` (the existing tail of `Login.enter` generalized) — lands as the real **`play` verb** (`PlayController`) in Phase B, not a Login method.

**Files:** `backend/Application.ts`, `obj/Login.ts`, `obj/__tests__/Login.test.ts`.
**Depends on:** nothing. **Blocks:** B (CommandGiver + verbs), C (enrollment).

---

### Phase B — Login as a real CommandGiver + the `enroll`/`play` verbs + char-gen-state frame

**Goal:** char-gen runs on the genuine command pipeline. Login becomes a real `CommandGiver` with a 3-verb allowlist; `enroll`/`play` are real MVC verbs. This is the **core plumbing** — designed in §3.1–3.2.

**B1. Relax the location-dispatch guard (framework).**
`lib/command/CommandGiver.ts:419-432` — the dispatcher silently returns when the giver has no location ("programmatic-shape error"), which both blocks a legitimately-incorporeal giver (Login) *and* mutes any stranded embodied giver (a soft-lock: you can't `help`/`recall` your way out). **Make location optional context:** dispatch always proceeds; `ctx.location` may be `null`. Keep the fail-safe only where it belongs — an embodied (`Containable`) giver with no container is still a shape error, so guard *that* narrowly (or drop the guard and let it surface loudly). The dispatch layer never calls into `location` (verified); MQL scopes return empty rather than crash. See §3.1 for the rationale and blast radius (≈nil for healthy avatars; stranded avatars gain recovery commands). Verb-level: add a shared "this verb needs a location" check so location-requiring verbs (`go`/`take`) emit a clean *"you're nowhere"* instead of NPE-ing; harden the recovery/char-gen verbs (`look`, `help`) for null location now, flag a full verb audit as follow-up.

**B2. Login composes `CommandGiverMixin`.**
`obj/Login.ts` — base becomes `CommandGiverMixin(SensorMixin(HasInteractiveMixin(Idea)))`. Declare `static commandContributions = { self: ['enroll.yaml','play.yaml','look.yaml'], environment: [], inventory: [], peers: [] }` — this is the **entire allowlist**; the recency stack *is* the sandbox, so no world verbs (`go`/`say`/`take`) can leak (Login composes none of the mixins that contribute them, and picks up no neighbor verbs). Add the `EnrollmentDraft` field + accessors (per-session picks; GC'd with Login). No `Containable`, no staging room.

**B3. Inbound routes any `CommandGiver` holder through the real pipeline.**
`backend/inbound/command.ts:21` — broaden the gate from `holder instanceof Avatar` to `MixinApi.isCommandGiver(holder)`, dispatching through `holder.executeCommand(commandText, { interactive })`. Login now flows through the *same* `executeCommand` path Avatar does — no parallel handler. Preserve the existing Avatar-specific behaviors (empty-line prompt-refresh, placeless-avatar messaging) for the Avatar branch.

**B4. The `enroll` verb (real MVC).** `cmd/enroll.yaml` (verb `enroll`, args `<field> <value...>`) + `obj/command/EnrollController.ts` + its controller seed. The controller owns the `ENROLL_STEPS` spec (§3.2): it reads `ctx.commandGiver` (the Login), looks the field up in `ENROLL_STEPS`, validates, mutates the Login's `EnrollmentDraft`, and emits the char-gen-state frame + narration via the normal response envelope / `MessageApi.scene(login).toSelf(...)`. `enroll confirm` triggers the commit (Phase D).

**B5. The `play` + `look` verbs.** `cmd/play.yaml` + `obj/command/PlayController.ts` — roster selection: validate `<playerId>` ∈ `user.playerIds`, transfer + enter + destruct Login. `look` reuses the existing verb but is hardened for the null-location (char-gen) case — it shows the welcome / your forming self (the picked species' default description) rather than a room.

**B6. Char-gen-state wire frame.** See §3.4. A `MessageFrame` on a `system.charactergen.state` topic carrying `{ step, picks, suggestion, options }`. No new envelope type — delivered through Login's Sensor (consistent with how `system.connection.established` ships structured payloads).

**Files:** `lib/command/CommandGiver.ts`, `backend/inbound/command.ts`, `obj/Login.ts`, `cmd/enroll.yaml`, `cmd/play.yaml`, `obj/command/EnrollController.ts`, `obj/command/PlayController.ts` (+ controller seeds), `packages/types/src/index.ts`, colocated tests.
**Depends on:** A. **Blocks:** the client char-gen layout (E) and commit (D) consume the frame shapes + controllers defined here.

---

### Phase C — Race/identity patches + content seeds

**Goal:** the data the commit reads. Independent of B except they meet at commit; can be built in parallel with B.

**C1. `Species` gains a field, a name-bank reference, + the name suggester.** `lib/species/Species.ts`:
- `defaultDescription: string` — a property field (getter/setter, in `persistentFields`). Themed short appearance prose consumed at commit as the avatar's `Visible.shortDescription`/`longDescription`.
- `nameBankKeys: string[]` — a **reference** to one or more `NameBank` Documents by key (e.g. human → `['common']`, half-orc → `['orcish','common']`), **not** inline name data (the pools live in their own Document collection — see C6). Getter/setter; in `persistentFields`. This is the Pattern-A path/key reference shape (a key string, resolved on read), not a Stuff ref.
- `suggestName(realName?)` / `rerollName()` — the name suggester as **methods on Species**: resolve `nameBankKeys` → load the referenced `NameBank` Document(s) (cached) → sample, with a phonetic riff on the real name restyled to the species; see §3.5. Species is the home because the riffing is per-species behavior; `NameBank` stays pure content data.
- *Convention check:* `defaultDescription` and `nameBankKeys` are property-shaped content fields, not instructions → first-class getter/setter pairs with per-field setter validation, per CLAUDE.md inter-stuff contract.

**C2. Compose `SexedMixin` onto Character.** `lib/character/Character.ts` — insert `SexedMixin` adjacent to `OrganismMixin`/`GenderedMixin` in the chain (it reads species via `MixinApi.isOrganism(self)` + `getSpecies()`, so it must compose where Organism is available — i.e. above `OrganismMixin`). Update the composition-order comment. No new fields beyond the mixin's own `sex`.

**C3. `PersonaMixin` (new).** `lib/character/Persona.ts` — `_mixinName = 'PersonaMixin'`, `persistentFields = ['bio', 'aspiration']`, with `getBio/setBio`, `getAspiration/setAspiration`. Both are persistent strings on the **claimed self-narrative** layer: `bio` is free-form authored prose (who you are across time), `aspiration` the closed-choice of who you're becoming. Compose onto `Character` (so both PCs and any future storied NPC carry them; this is identity, not Avatar-only). Register in `Mixins`. *Home:* `lib/character/` (not `lib/description/`), parallel to Sexed/Gendered; bundling the two related fields into one mixin satisfies "don't over-mint." *What `Persona` is NOT for:* witnessed deeds (breadcrumbs), perceived body description (`Visible.getLong`), or proper-name identity (`Named`) — it is the self you author and claim.

**C4. Five new species seeds.** Under `seeds/lib/species/animalia/...` reusing `/lib/body-plans/biped`, `_parentCladePath: /lib/species/animalia`, `_defaultMaterialPath: /lib/material/tissue/flesh`, `sexDeterminationSystem: dioecious`, themed `visionProfile`/`olfactoryProfile`, plus the new `defaultDescription` + `nameBankKeys` (referencing the C6 Documents):
- Elf (`.../homo/eldarinus` or a sibling genus path) — keen vision, `['elvish']`.
- Halfling — normal vision, `['halfling']` (compound Smallberries/Underhill surnames).
- Half-orc — keen smell, `['orcish','common']` (blended).
- Tiefling — infernal smell, scotopic shift, `['infernal','common']` (blended).
- Dragonborn — themed vision/smell, `['draconic']`.
Add `defaultDescription` + `nameBankKeys` (`['common']` / `['dwarvish']`) to the existing **Human and Dwarf** seeds too (all 7 pickable). All dioecious → all offer the sex sub-pick.
- *Props-real check:* every seed is backed by the shipped `Species`/`BodyPlan` classes and reuses the real biped body plan; no claims beyond what the mixins back.

**C5. Aspiration roster + outfit garments (content).**
- **Aspiration roster as content:** a seed/data object mapping each of the six aspirations (`something-better` default, `healer`, `teacher`, `guardian`, `founder`, `seeker`) to `{ bioSeed: string, outfitGarmentPaths: string[] }`. Per the data-driven rule this is content, not a switch. Home it as a singleton Idea seed (e.g. `/lib/charactergen/AspirationRoster`) loaded the same way `TopicCatalogue` loads its leaves, OR as a YAML data file the commit reads at boot. Prefer a singleton Idea (folder/leaf or property-bag) so it round-trips through the existing seed machinery rather than introducing a bespoke loader.
- **Garments:** a shared student base (e.g. shirt + trousers + shoes) plus one signature item per aspiration, each authored as `Wearable` garment templates under `seeds/.../garment/...` with `slotClaims: { /lib/body-plans/biped: [...] }` (per embodiment.md). These must compose real `WearableMixin` + `Slottable` + `Containable`. Dressing at commit uses `SlotApi.occupyAll` exactly as the `wear` verb does.

**C6. `NameBank` Documents (own collection).** The per-race name pools are bulk authored content, so they live as plain-JSON `Document`s in a `name_banks` collection — *not* inlined on `Species`:
- **Class:** a `NameBank` `Document` subclass (the persistence-rethink `Document` base — plain JSON, no Stuff overhead), shape `{ key: string; given: string[]; surname: string[]; style?: string }`. Keyed by `key` (`common`, `dwarvish`, `elvish`, `halfling`, `orcish`, `infernal`, `draconic`).
- **Seeding:** authored as YAML content and loaded into the `name_banks` collection at bootstrap. **Verify the seed path for non-Template Documents** — follow the **Emote/`SoulCatalogue` precedent** (content Documents seeded from `config/*.yaml` into a collection), which is the closest shipped pattern; do not invent a bespoke loader.
- **Access:** `Species.suggestName` resolves `nameBankKeys` → loads the bank Document(s). Load-by-key with a small cache (banks are immutable reference data); a dedicated catalogue singleton is **not** warranted unless lookups demand it (avoid a premature registry — load + cache is enough).
- *Residency check:* name banks never clone into the world and aren't a live entity → an own-Document-collection is the correct home (not a domain Template, not inline, not code). → memory [[feedback_stuff_has_residency_cost]], [[project_persistence_rethink]].

**Files:** `lib/species/Species.ts`, `lib/character/Character.ts`, `lib/character/Persona.ts` (+ `Mixins` registry in `lib/mixin.ts`), the `NameBank` Document class + `name_banks` seeds (7 banks), 5 species seeds + edits to Human/Dwarf seeds, aspiration roster seed, garment seeds, colocated tests.
**Depends on:** nothing. **Blocks:** D (commit reads all of this).

---

### Phase D — Commit pipeline (`EnrollController`, the `enroll confirm` path)

**Goal:** turn an `EnrollmentDraft` into a placed, dressed, entered Avatar, atomically. Runs inside `EnrollController.execute` when the field is `confirm`; reads the draft off `ctx.commandGiver` (the Login).

**D1. The commit sequence** (`EnrollController`, `obj/command/EnrollController.ts`):
1. **Fork the per-character template.** Generalize `Application.createDefaultAvatarTemplate` into a shared helper (or call `TemplateApi.saveTemplate` directly): `nanoid()` playerId, fork from `Avatar.SEED_TEMPLATE_PATH`, overlay `data` with the draft's picks — `_speciesPath`, `name`/`surname`, `pronouns`, `sex`, `aspiration`, `bio` (from aspiration roster `bioSeed`), and `shortDescription`/`longDescription` (from `species.getDefaultDescription()`). Container stays the seed default (lobby).
2. **Register ownership.** `user.playerIds.push(playerId); await user.save()`. **This is the atomicity boundary** — nothing before it persisted the character into the user's roster, so a crash/abandon earlier leaves zero trace (the forked template at step 1 is the only orphan risk; mitigate by ordering the template save immediately before the user.save and treating a half-fork as inert — it's keyed by a playerId never added to any user, exactly like `/obj/Avatar/seed`).
3. **Clone the runtime Avatar.** `StuffApi.clone<Avatar>(Avatar.getTemplatePath(playerId), { user, playerId })` — `postRegister` stamps runtime fields, registers with `PlayerApi`, installs the AetherImplant (char-gen does **not** issue it — confirmed `Avatar.ts:339-365`), and `applyContainer` places it at the lobby.
4. **Dress.** Resolve aspiration → garment paths from the roster; `StuffApi.clone` each garment into the avatar's inventory (`ContainmentApi.move`), then `SlotApi.occupyAll(avatar, garment, garment.slotClaims[bodyPlanPath])`. Reuse the exact dressing primitives the `wear` controller uses.
5. **Handoff.** `ConnectionApi.transfer(interactive, avatar)`; `await avatar.enter(interactive)`; `StuffApi.destruct(login)`.

**D2. The `confirm` step.** The `confirm` entry in `ENROLL_STEPS` runs the D1 sequence. Validation that all required picks are present runs first (species + name + pronouns + aspiration required; sex required when `sexDeterminationSystem !== 'none'` — all 7 are dioecious, so always required here; defaults fill the rest). A failed precheck re-emits the char-gen-state frame with an `error` and points at the missing step.

**Files:** `obj/command/EnrollController.ts` (the commit path), `backend/Application.ts` (extract the fork helper if shared), colocated tests.
**Depends on:** A, B, C. **Blocks:** end-to-end acceptance.

---

### Phase E — Client: phase routing + roster + char-gen stage

**Goal:** the cockpit tandem. Rides existing `sendCommand` + envelope/frame machinery; the only new wire surface is the char-gen-state frame (B3) and the roster payload (A4/B3).

**E1. Connection-phase + roster slices (store).** `store/index.ts` — add a `connectionPhase: 'unauthenticated' | 'character-select' | 'char-gen' | 'in-world'` and a roster slice (`characters: RosterEntry[]`) plus char-gen-state (`{ step, picks, suggestion, options }`). Phase transitions: `setConnected` for an avatar → `in-world`; a roster frame → `character-select`; a char-gen-state frame → `char-gen`.

**E2. Frame routing.** `services/websocket.ts:368` — add `case 'system.charactergen.roster'` → store roster + phase; `case 'system.charactergen.state'` → store char-gen-state + phase. Reuse the existing topic-switch; no envelope changes.

**E3. Phase-routed top-level layout.** `App.tsx:529-580` — replace the binary `isAuthenticated` check with a `switch (connectionPhase)`:
- `unauthenticated` → existing login takeover.
- `character-select` → `<CharacterSelect/>` (new).
- `char-gen` → `<CharGenStage/>` (new).
- `in-world` → existing cockpit.
Mutually exclusive, as the requirements demand.

**E4. `CharacterSelect.tsx` (new).** Renders roster entries (name, species, themed description) with a "play" affordance per character → `sendCommand('play <playerId>')` and a "create new character" affordance → `sendCommand('enroll')` (bare verb starts char-gen / re-emits state). Both go through `sendCommand` (visible echo).

**E5. `CharGenStage.tsx` (new).** Bespoke phase layout (not modal, not inline): stage area shows current step + closed-choice affordances + name suggestion (keep/re-roll/type); command bar stays front-and-center; a slim terminal strip shows Login's narration frames. Every affordance sends the real `enroll <field> <value>` string via `sendCommand`. On the char-gen-state frame reporting `step: 'done'` (or on the `system.connection.established` for the new avatar from `avatar.enter`), the phase flips to `in-world` → default cockpit reveal.

**Files:** `store/index.ts`, `services/websocket.ts`, `App.tsx`, `components/CharacterSelect.tsx`, `components/CharGenStage.tsx`, colocated tests.
**Depends on:** A (roster payload), B (state frame), D (the in-world flip happens after commit).

---

## 3. Resolved design decisions for the open plumbing

### 3.1 Login is a real CommandGiver — char-gen runs on the genuine pipeline

The whole point of char-gen is to put the player on our real command infrastructure from the first keystroke. So Login composes `CommandGiverMixin` and `enroll`/`play` are **real MVC verbs** (YAML view + controller), dispatched through the same `executeCommand` path as any Avatar verb — *not* a bespoke parser.

**Scoping the verb set is trivial and safe.** Verb availability is driven entirely by the recency stack, fed by `commandContributions` per mixin/class — there is no "all verbs everywhere" rule (`CommandGiver.ts` / `api/command.ts` `collectSelfDefs`). Login declaring `commandContributions.self = ['enroll','play','look']` is the *entire* allowlist: `go`/`say`/`take` never appear because Login composes none of the mixins (`Mobile`, etc.) that contribute them, and a giver never inherits a neighbor's `self` verbs. The recency stack **is** the sandbox — no allow/deny machinery needed.

**The location guard had to go (B1), and it's the right call for the whole game, not a char-gen hack.** The dispatcher's `if (!location) return` (`CommandGiver.ts:419`) assumed every giver is embodied-and-somewhere; for anything else it *silently swallows commands*. That's backwards: a stranded player most needs `help`/`recall` to work, and an incorporeal giver (Login) legitimately has no location. The dispatch layer never uses `location` (it's read-only context handed to the controller; MQL scopes search from focus/inventory/reachable and return empty rather than crash), so location is **optional context**. Removing the blanket guard is ≈nil-risk for live play (healthy avatars are never locationless) and turns the stranded-player soft-lock into "recovery verbs work." The narrow fail-safe — an *embodied* giver with no container — can stay as a loud error or a targeted check; location-requiring verbs get a shared "you're nowhere" guard so they degrade cleanly instead of NPE-ing.

**Outcome delivery** is the normal controller path: the dispatch-response envelope + `MessageApi.scene(login).toSelf(...)` for prose (Login is a Sensor, so `toSelf` is legal and `audience:actor` bypasses the modality filter), plus the char-gen-state frame as the structured channel for step/picks/suggestion.

This honors "no new Apis by default" (a controller is not an Api; the suggester is on Species) and "no two-word verbs" (`enroll` is the verb; `species`/`name`/`confirm` are arguments).

### 3.2 The uniform field/step model

A single declarative array owned by `EnrollController` (a const — data, not switch):

```ts
interface EnrollStep {
  field: string;                 // 'species' | 'sex' | 'name' | 'pronouns' | 'aspiration' | 'confirm'
  required: boolean;
  // option source: how the closed-choice list is computed (content-driven)
  options?: (draft: EnrollmentDraft) => EnrollOption[];   // e.g. species roster, sex from species, aspiration roster
  // validate the raw value; return error string or undefined
  validate?: (value: string, draft: EnrollmentDraft) => string | undefined;
  // apply the accepted value to the draft
  apply: (value: string, draft: EnrollmentDraft) => void;
  // is this step applicable given the draft? (sex step skipped when species sexDeterminationSystem === 'none')
  applicable?: (draft: EnrollmentDraft) => boolean;
}

const ENROLL_STEPS: EnrollStep[] = [ /* species, sex, name, pronouns, aspiration, confirm */ ];
```

`EnrollController.execute` looks up `ENROLL_STEPS.find(s => s.field === field)` — no per-field switch. The `name` field's value space includes the sub-actions `reroll` and the bare typed name (validated by the name rules); `keep` is implicit (the suggestion is already in the draft). The char-gen-state frame, the validators, and the client affordance lists all read the **same** `ENROLL_STEPS` (options computed server-side, shipped in the frame). Adding a new step or aspiration is a data edit (a new step entry / a new roster row), not a code branch — exactly the "right abstraction for a real N of fields that share structure" the constraints call for. The `options` for species/sex/aspiration are computed from content (`SpeciesApi` roster, species `sexDeterminationSystem`, the aspiration roster seed), never hardcoded lists.

`EnrollmentDraft` is a plain object held on **Login** (the giver), reached via `ctx.commandGiver`: `{ speciesPath?, sex?, name?, surname?, pronouns?, aspiration?, suggestion? }`. Login is GC'd at commit → zero cleanup, no draft persistence, no completion flag (requirements §atomic commit).

### 3.3 The `bio`/`aspiration` field home

`PersonaMixin` in `lib/character/` (C3), composed on `Character`. Rationale: both are character-identity prose/closed-choice fields adjacent to Sexed/Gendered/Named; bundling the two related fields in one mixin respects "don't over-mint mixins"; `lib/character/` is the owning subsystem (not `lib/description/`, since aspiration is a becoming/identity concept, not a presentation field, and not a `lib/mixins/` dump which CLAUDE.md forbids). `bio` is seeded at commit and editing defers to Wave 2 (`records` verb), so no setter-side player gating is needed now beyond a trim.

### 3.4 The char-gen-state wire frame shape

A `MessageFrame` (not a new envelope type — the requirements cap new wire surface at "a small char-gen-state frame ... plus the character roster in the post-login payload"). Topic `system.charactergen.state`, delivered through Login's Sensor, payload:

```ts
interface CharGenStatePayload {
  step: 'species' | 'sex' | 'name' | 'pronouns' | 'aspiration' | 'confirm' | 'done';
  picks: {                          // accumulated draft, client-readable
    species?: { path: string; commonName: string };
    sex?: string;
    name?: string; surname?: string;
    pronouns?: string;
    aspiration?: string;
  };
  suggestion?: { name: string; surname?: string };   // current name suggestion (name step)
  options: EnrollOption[];          // closed-choice list for the current step (content-derived)
  error?: string;                   // last validation rejection, for inline display
}
```

Roster frame: topic `system.charactergen.roster`, payload `{ characters: { playerId, name, species, description }[] }`. These two are the **only** new wire shapes; both are plain `MessageFrame` payloads reusing the existing delivery path. The post-login payload (`ConnectionEstablishedPayload`) is extended only for the ≥1 case if we choose to carry the roster inline with the established frame; cleaner is the dedicated `system.charactergen.roster` frame so the established frame stays avatar-shaped.

### 3.5 The name suggester — structure and home

- **Content:** the source pools are `NameBank` `Document`s in the `name_banks` collection (C6), referenced by `Species.nameBankKeys`. A species may reference more than one (half-orc = `['orcish','common']`) — the suggester unions the referenced banks' pools.
- **Helper:** methods on `Species` — `species.suggestName(realName?)` and `species.rerollName()` (no Api, no free-floating module). They resolve `nameBankKeys` → load the referenced `NameBank` Document(s) (cached) → sample. The helper does *phonetic riffing*, not translation: it takes the player's real given name (from `User`/`GoogleProfile`, threaded into the draft at char-gen start), keeps an initial or first syllable, and restyles it against the bank pools (e.g. "Bobby" + Halfling → "Bobalu"), then picks a surname from the pools (or honors `style`). Re-roll re-samples (cheap, no real-name seed). Characters after the first draw from the bank directly. The suggester always returns a given name → intake is never blocked (requirements). Surname defaults from the bank if the player opts to a mononym.
- **Validation** (the `validate` functions in `EnrollController`'s `ENROLL_STEPS`): 2–24 chars/field, Unicode letters + single internal hyphen/apostrophe, no leading/trailing/doubled separators, no digits, no internal spaces, trim whitespace, capitalization as typed. A seeded **denylist stub** (`admin`, `system`, `moderator`, `null`, a few slurs) as a small constant array on `EnrollController`, structured to be swapped for the real sanitizer (deferred). Names are not a uniqueness key.

### 3.6 The atomic-commit sequence

As in D1: fork template → **`user.playerIds.push` + `user.save()` (the commit point)** → clone Avatar (implant + placement via `postRegister`/`applyContainer`) → dress (StuffApi.clone + SlotApi.occupyAll) → ConnectionApi.transfer → avatar.enter → destruct Login. Everything before the `user.save()` is discardable; an abandoned/disconnected intake never reaches it, so no playable character and no roster entry. The only persisted artifact a half-run could leave is a forked template keyed by a playerId in no user's `playerIds` — inert and unreachable (the seed avatar is the prior art for "orphan template Login can't reach"). Order the template save immediately before `user.save()` to minimize that window.

---

## 4. Testing plan (Vitest, colocated `__tests__/`)

Mapped to the doc's Acceptance Criteria:

1. **New user → empty roster → char-gen → avatar enters at lobby.** `obj/command/__tests__/EnrollController.test.ts`: user with `playerIds: []` → `Login.enter()` routes to char-gen (no throw); drive the `enroll` verb through `Login.executeCommand` for all steps → `enroll confirm` → assert an Avatar registered with `PlayerApi`, placed at the lobby container, holder transferred, Login destructed. (AC 1, AC "enroll verb + atomic confirm".)
2. **Returning user, 1 and ≥2 characters → roster, play.** `obj/__tests__/Login.test.ts` + `PlayController.test.ts`: seed `playerIds` of length 1 and 3 → assert roster frame emitted with N entries; `play <id>` transfers to the right Avatar. (AC 2.)
3. **Signup creates zero avatars; abandon leaves no orphan.** `backend/__tests__/Application.test.ts`: `findOrCreateUser` → `playerIds === []`, no template forked. `EnrollController.test.ts`: run steps but never `confirm`, destruct Login → assert no playerId added, no registered Avatar. (AC 3.)
4. **Login is a scoped CommandGiver; the location guard is relaxed.** `obj/__tests__/Login.test.ts`: `MixinApi.isCommandGiver(login)` true; `getAvailableCommands()` lists only `enroll`/`play`/`look` (no `go`/`say`/`take`); a locationless Login `executeCommand('enroll …')` actually dispatches (no silent return). `lib/command/__tests__/CommandGiver.test.ts`: a locationless giver no longer silently drops; an embodied giver's path is unchanged. (AC "enroll on real pipeline", regression.)
5. **All seven species pickable; themed description + sensory profile; sexed sub-pick.** `EnrollController.test.ts` + `lib/species/__tests__`: `ENROLL_STEPS` species options list all 7; selecting one stamps `defaultDescription` and the species' `visionProfile`/`olfactoryProfile`; sex step `applicable` true for dioecious, and a `none` species (fixture) skips the sub-pick. (AC 4.)
6. **Name banks are Documents; suggestion biased by real name; keep/reroll/type; validation rejects.** `name_banks` seeds load into the collection; `halfling` resolves its `nameBankKeys` → the seeded `NameBank` Document(s). `lib/species/__tests__/Species.test.ts`: `halfling.suggestName('Bobby Schaetzle')` keeps an initial/syllable + a surname from the resolved bank, `rerollName` differs; a blended species (`half-orc` → `['orcish','common']`) draws from the union. `EnrollController.test.ts`: name `validate` rejects digits, doubled separators, denylist tokens, over-length; accepts `O'Brien`, `Mary-Jane`. (AC 5.)
7. **Aspiration seeds bio + dresses outfit.** `EnrollController.test.ts` commit path: chosen aspiration → `avatar.getBio()` equals the roster `bioSeed`; the signature garments are slotted (`SlotApi.findOccupiedSlots`). (AC 6.)
8. **Pronouns and sex independent.** `EnrollController.test.ts`: set sex `female` + pronouns `he/him` → both stored, no cross-constraint. (AC 7.)
9. **Login composes SensorMixin; system frames deliver, sensory frames don't.** `Login.test.ts`: `MixinApi.isSensor(login)` true; `scene(login).toSelf(...)` reaches a fake Interactive; a modality-tagged frame (e.g. `meta.modality: 'vision'`) is dropped by `filterMessage` on the bodiless Login. (AC "Login Sensor".)
10. **Same verb works headless (no client layout).** `EnrollController.test.ts`: drive the entire flow via raw `enroll …` strings through `Login.executeCommand` only — proves it's the real pipeline / CLI-as-backbone. (AC "exercisable from the text client".)
11. **Client phase routing + affordances send real commands.** `client/.../__tests__`: store transitions on roster/char-gen-state frames; `CharGenStage` affordance click invokes `sendCommand('enroll species elf')`; commit (in-world frame) flips phase to `in-world`. (AC client behavior; unit where practical.)
12. **Subsystem doc.** `docs/subsystems/char-gen.md` authored at sweep (AC final) — out of this plan's code scope but tracked.

Drive the enrollment tests through `Login.executeCommand` (the real pipeline) against a synthetic Interactive fixture — exercising `EnrollController` end to end — and the suggester against `Species` directly; drive commit through real `StuffApi.clone`/`SlotApi` against seeded species/garment templates (the existing harness seeds templates).

---

## 5. Risks / things to verify during build

1. **Load-order cycle (Login ↔ Application).** Login importing `Application` for `sendMessageToInteractive` risks the same cycle connection.md documents for `HasInteractiveMixin`. Mitigate by reaching `Application.get()` lazily inside `handleMessage`/`handleEnvelope` (Avatar's `getApplicationInstance` pattern), not at module top-level.
2. **`Scene.toSelf` on a Login with no location.** Verified `toSelf` only requires `isSensor`, not Containable — safe. But any narration that accidentally uses `.toPeers`/`.toContents` will throw (Login has no environment). Keep char-gen narration strictly `toSelf`.
3. **Inbound gate broadening.** `inbound/command.ts` hard-rejects non-Avatar holders today. Broaden to `MixinApi.isCommandGiver(holder)` → `executeCommand`, but preserve the exact existing Avatar-specific behaviors (empty-line prompt-refresh, placeless-avatar messaging) for the Avatar branch. Regression-test the Avatar path.
4. **Location-guard removal — blast radius.** Dropping the `if (!location) return` guard (B1/§3.1) means controllers can now receive a null `ctx.location`. Healthy avatars are never locationless, so live play is unaffected — but verify: (a) the command pipeline's error boundary catches a controller that NPEs on null location and surfaces a note rather than crashing; (b) location-requiring verbs (`go`/`take`) get the shared "you're nowhere" check so they degrade cleanly; (c) `look` is hardened for the char-gen (null-location) case. A full verb-library audit for null-location safety is a flagged follow-up, not a blocker. Add a regression test that a locationless giver dispatches (no silent drop) and that the embodied path is unchanged.
5. **Atomic-commit orphan window.** The forked template persists before `user.save()`. Verify a crash between the two leaves only an unreachable template (no `PlayerApi` registration yet, no playerId in any user). Consider whether `StuffApi.clone` (step 3) registering with `PlayerApi` *before* `user.save()` could leak a live Avatar on a mid-commit failure — order `user.save()` before the clone, or ensure failure after clone tears the Avatar down.
6. **SexedMixin composition position.** It reads `getSpecies()` via `MixinApi.isOrganism(self)`, so it must compose at/above `OrganismMixin` in the Character chain. Verify the proxy/`this` works through the mixin chain (the `as unknown as Stuff` cast in `Sexed.ts` already accounts for the proxy receiver).
7. **Per-character template fork vs the retired `createDefaultAvatarTemplate`.** A1 removes the signup call but C/D reuse the fork mechanism. Keep the helper; just stop calling it at signup. Verify the seed avatar (`/obj/Avatar/seed`) still exists and is the fork source.
8. **Species path/genus naming for the 5 new seeds.** The clade walk (`SpeciesApi.getKingdom`) tolerates missing intermediate Clade leaves but the seeds must sit under `animalia/...` so the kingdom resolves; pick genus/species path segments that don't collide with `homo/sapiens`/`khazadicus`. Verify `requiresAnimate` preload still resolves for the new species (it walks ancestors tolerantly).
9. **Garment `slotClaims` body-plan path.** Must exactly match the biped body-plan template path the species' BodyPlan resolves to (`/lib/body-plans/biped` per the seed). A mismatch makes `fitsSlot` return false and dressing silently no-ops — assert occupancy in tests.
10. **`NameBank` Document seeding + access path.** Name banks are a *new Document collection* (`name_banks`), not a domain Template — verify how non-Template content Documents get seeded at bootstrap (follow the Emote/`SoulCatalogue` precedent; don't invent a loader). Confirm `Species.suggestName` can resolve `nameBankKeys` → load the Document(s) cheaply (cache the immutable banks; don't hit the DB per keystroke). Confirm `nameBankKeys` (a string array) round-trips on the `Species` template (mirrors `commonNames`).
11. **Client phase flip timing.** The "now you're in the world" reveal depends on the client seeing either a `char-gen-state {step:'done'}` frame or the new avatar's `system.connection.established`. Since commit transfers to the Avatar and calls `avatar.enter` (which fires `system.connection.established`), the cleanest flip is on that established frame for an avatar; ensure the store treats an established-frame-for-avatar as `in-world` regardless of prior phase.
