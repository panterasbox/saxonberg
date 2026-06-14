# Recognition & identification substrate — implementation plan

Status: planning artifact. Authoritative scope is
[`docs/requirements/recognition-requirements.md`](../requirements/recognition-requirements.md);
design rationale is [`belief-store-slate`](../slates/builds/belief-store-slate.md) +
[`recognition-slate`](../slates/builds/recognition-slate.md) +
[`identification-slate`](../slates/builds/identification-slate.md). This doc is
the *how*. The *what* (surface decisions, non-goals) is settled — do not reopen
it.

## 0. Branch / base — read this first

**Wave 0 (`getPresentation`) is ALREADY MERGED to `origin/master`** (confirmed:
`refactor/get-presentation` is an ancestor of `origin/master`;
`Stuff.getPresentation()` is present). `Stuff.getPresentation()` is a
viewer-blind instance method (Named-name-or-`shortDescription` + a `Globbable`
count affix), `DescribeApi.getDisplayName`/`formatName` are retired. **No merge
step.** Just **pull `origin/master`** and cut `feature/recognition` from the
up-to-date master. Everything below assumes `Stuff.getPresentation()` is the
baseline. This plan does **not** re-plan wave 0.

> ⚠️ **Code-facts caveat.** The "verified" line numbers, file states, and "X
> survives on master" claims below were checked against a **local master that
> was ~27 commits stale** (master has since taken fast-travel, the affordances
> fix, the encumbrance pre-sweep, and more). The **architecture and sequencing
> are sound** (they derive from the requirements, not the stale tree), but the
> build agent must **pull current `origin/master` first** and treat every line
> number / call-site / "survives" claim as *approximate* — re-ground each
> against the live tree as you touch it. Where a fact below contradicts the
> current code, the current code wins.

### Substrate facts (verified against a then-stale local `master` + `refactor/get-presentation` — re-verify, see caveat)

- **`Stuff.getPresentation(): string`** (on the branch,
  `lib/stuff/Stuff.ts`) — viewer-blind, non-`@Final` (shadowable). Resolution:
  Named `name` → Visible `shortDescription` → `'something'`; `Globbable`
  `quantity !== 1` folds in a pluralized count affix. `Stuff.subscribableFields`
  ships a universal `displayName` descriptor reading `getPresentation()`. **This
  is the (A) baseline the (B) routine and `getDisguise()` build on.**
- **`Character`** (`lib/character/Character.ts`) =
  `CommandGiver(Mobile(Engaged(Soul(Vocal(Perception(Perceiver(Sensor(Gendered(Persona(Creature))))))))))`.
  Composes `Sensor` + `Perception` (the viewer type) + `Vocal` + `Perceiver`.
  **The belief-store mixin and `StatusMixin` are composed here** (so both `Avatar`
  and NPCs carry them). `Creature` is the body layer below.
- **`Creature`** (`lib/creature/Creature.ts`) =
  `Container(Containable(Visible(Vitals(Reserved(Posed(BodyPlanSlots(Slotted(Sexed(Organism(Named(Agent)))))))))))`.
  **`Disguisable` is composed here** (disguise is a Creature-level body concern,
  per the surface decision), outer of `Slotted`/`Visible` (it scans slots and
  reads `shortDescription`).
- **Perception viewer type** (`lib/perception/Perception.ts`, doc
  `perception.md`): viewer-aware queries take `Stuff & Sensor & Perception`. The
  per-viewer-override seam (`perceivedBandModifier`/`canSeeOverride`/`getVisionProfile`)
  is **vision-only** — the (B) recognition routine is a **new explicit
  viewer-param entry point**, NOT a reuse of those Shadow seams (confirmed: the
  requirements fix this).
- **`DescribeApi`** survives on master (`api/describe.ts`) for
  `groupContentsByResting` etc.; on the branch `getDisplayName`/`formatName` are
  gone. The (B) routine's home is the planner's call — **this plan homes it on
  `PerceptionApi`** (`PerceptionApi.describe(viewer, target)`), per the
  recognition-slate's A/B split, since it gates on perception and is the natural
  sibling of the vision queries already there.
- **The prose name path is viewer-blind** (verified on master, unchanged by
  wave 0 except the method rename):
  - `LookController.ts` — room listing (~line 226) builds
    `Mml.item(item)` per visible content with no viewer; the single-target look
    (~line 250–266) calls the name helper viewer-blind even though `actor` is in
    scope two lines above (`getMarkupLong(actor)`).
  - `MqlSubscriptionApi`'s `displayName` projection on `Stuff` **already threads
    the viewer** (`read: (stuff, viewer) => …` on master;
    `read: (stuff) => stuff.getPresentation()` on the branch — confirm which
    survives the merge and re-thread it through (B)). The client-data path is
    viewer-ready; the **server prose-assembly path is the gap**.
- **MQL targeting / the name-leak gate** (`api/mql/scope-walk.ts`): `pushDirect`
  (~line 171) builds each `ScopeCandidate` from `DescribeApi.getDisplayName(stuff)`
  (→ `stuff.getPresentation()` post-merge) + `stuff.getKeywords()` — **viewer-blind**.
  The resolving actor (`giver`) **is already in scope** on every `candidatesForX`
  entry point. Ordinal disambiguation already exists
  (`api/mql/resolver.ts` `case 'ordinal'`, ~line 245). This is the single
  chokepoint the targeting seam (Wave 5) re-plumbs.
- **Speech/earshot spine** (`lib/message/Vocal.ts`, `api/message.ts`): `Vocal.say`
  composes a Scene at `world.speech.say`, `toPeers`/`toContents`; `Scene.send`
  iterates `MessageApi.getSensors(env)` per recipient (`api/message.ts` ~line
  243–295). **The `introduce` verb rides this** — it emits a scene line and, in
  the same per-recipient iteration, records into each in-earshot listener's
  belief store. No content hook in the speech substrate (constraint).
- **Session lifecycle** (`obj/Avatar.ts`): `Avatar.enter(interactive)` is the
  session-establish hook (the **hydrate** point); `onDestruct()` /
  `onLinkdead()` is logout (the **evict + final write** point, alongside
  `save()`). `startAutoSave`/`stopAutoSave` bracket the session.
- **Persistence** (`backend/PersistenceManager.ts`): `PM.get()` singleton;
  `getCollection(name)`, `save(collection, doc)` (upsert), `find(collection,
  query)`, `findById`, `delete`. Collections are created on first use — a **new
  dedicated collection** needs no migration, just a name. `ContactsMixin`
  (`lib/social/Contacts.ts`) is the **cautionary precedent** the requirements cite
  — per-Avatar lists on the Avatar document (whole-doc fsync). We do NOT do that;
  belief records are their own Documents (per-record upsert).
- **Embodiment** (`lib/slot/Wearable.ts`, `lib/equipment/Garment.ts`):
  `Garment = Wearable(Slottable(Thing))`, seeded with
  `data.slotClaims: { /lib/body-plans/biped: [torso] }`
  (e.g. `seeds/domain/eternal/clothes/lab-hoodie.yaml`). The hood is a `Garment`
  composing a new `Disguise`-bearing mixin.
- **Augment/aether** (`lib/augmentation/Augment.ts`, `lib/message/Aether.ts`)
  exist — the deferred id-aug wave (Wave 9) rides these, but its axes are
  unresolved; **not in the core sequence.**

## 1. Architecture decisions (within the settled constraints)

1. **A general belief-store mixin on `Character`** —
   `lib/belief/BeliefStore.ts`, `BeliefStoreMixin`,
   `_mixinName = 'BeliefStoreMixin'`, registered `Mixins.BeliefStore` +
   `MixinApi.isBeliefStore`. This is the **spine** (belief-store-slate): one
   per-viewer keyed bag, dumb CRUD, realm-namespaced. **New subsystem folder
   `lib/belief/`** (mixin doesn't fit an existing subsystem — propose it per
   CLAUDE.md). Surface (all instance methods — proxy receiver, so TS modifiers
   not `#`):

   ```ts
   know(realm: string, referent: string, payload: BeliefPayload): void  // upsert
   recall(realm: string, referent: string): BeliefRecord | null         // point-get, O(1)
   recallRealm(realm: string): ReadonlyMap<string, BeliefRecord>        // realm-scan
   forget(realm: string, referent: string): void                        // total
   forgetField(realm: string, referent: string, field: keyof BeliefPayload): void // partial
   ```

   Storage: `private _beliefs: Map<string, BeliefRecord>` keyed
   `` `${realm}:${referent}` ``. The record spine:

   ```ts
   interface BeliefRecord {
     realm: string;
     referent: string;       // templatePath (durable) — the engine's key
     knownAs: string | null; // recognition/place value-payload; null = stranger
     firstSeen: number;      // ms epoch
     lastSeen: number;
     payload: BeliefPayload; // thin axis-specific extra (e.g. {typeKnown:true})
   }
   ```

   **Key decisions a build agent shouldn't re-derive:**
   - **Key on `referent.getTemplatePath()`**, NOT `stuffId` (surface decision —
     `stuffId` is reboot-ephemeral and would imply the viewer "knows which Stuff";
     `templatePath` is durable and the engine always has it). The
     instance/type split falls out for free: unique `templatePath` (avatars,
     singleton NPCs) → recognition; shared `templatePath` (generic clones) →
     type-only.
   - **`knownAs: null` records are session-local** — held in `_beliefs` but
     **not written through** (Wave 8). Only a record that has learned something
     (`knownAs` set, or a payload flag set) persists. The persistence layer's
     write-through gate keys on "has this record learned anything?"
   - **No `provenance` field** (constraint — nothing reads it in v1).
   - **Payload rule (slate): flag by default, value only for planned
     divergence.** `knownAs` is a *value* (faking/nicknames are planned). The
     identification realm stores a `typeKnown` *flag* (read the type live). Do
     not snapshot referent state.
   - **Realm is a string convention, not a registry** — `RECOGNITION = 'recognition'`,
     `IDENTIFICATION = 'identification'` as exported consts on the mixin file. No
     realm-strategy objects; all per-realm intelligence lives in consumers.
   - **Lazy liveness-GC**: on `recall`, if `referent` no longer resolves
     (`StuffApi.findByTemplatePath` → null), drop the record and return null.

2. **The (B) viewer-aware naming step is `PerceptionApi.describe(viewer, target):
   string`** (`api/perception.ts` — extend the existing Api). Explicit
   viewer-param entry point (NOT a Shadow). Algorithm:
   1. Gate: `if (!VisionModality.canSee(viewer, target)) return …` (delegate the
      visibility gate to perception; the not-perceivable contract is perception's,
      not ours).
   2. `const base = target.getPresentation()` (the (A) baseline).
   3. **Disguise/mask**: if `MixinApi.isDisguisable(target)` and
      `target.getDisguise()` masks identity → the *baseline already reflects
      `appearsAs`* because `getPresentation` defers to `getDisguise` (Wave 4); the
      (B) step's job is to **withhold a known `knownAs`** when masked (dumb gate:
      masked ⇒ don't reveal the name, render baseline).
   4. **Recognition lookup** (instance axis): `viewer.recall(RECOGNITION,
      target.getTemplatePath())`; if a record with non-null `knownAs` exists AND
      target is not masked → use `knownAs`.
   5. **Identification lookup** (type axis): `viewer.recall(IDENTIFICATION,
      typeSignature(target))`; if `typeKnown` → render the known type name.
   6. **Compose**: weave the two ("the guard you met yesterday" = recognized
      instance + identified type) + the `StatusMixin` decoration slice.
   7. **Side effect — repeat-perception trigger**: a successful perceive of an
      unknown creates/advances the record (`know` with `knownAs:null`, advancing
      `lastSeen`). **Decision:** fire this on the look/perceive controller path,
      NOT inside `describe` (a pure render must not mutate memory on every MQL
      projection read). See Wave 3.

3. **Disguise: a `Disguisable` mixin on `Creature`** (`lib/disguise/Disguisable.ts`
   — new subsystem folder `lib/disguise/`; or place under `lib/embodiment/` if
   that folder lands — default to `lib/disguise/`). `getDisguise(): Disguise |
   null` is a **viewer-blind resolver** over (a) worn `Disguise`-bearing
   Wearables (scan slots) + (b) one transient imposed slot
   (`setDisguise`/`clearDisguise`). Merge = union `covers`, `appearsAs` from
   broadest coverage. **`getPresentation` defers to `getDisguise`** — so the
   override lives at the (A) baseline, NOT a shadow on the synthesizer (surface
   decision). The `Disguise` descriptor is `{ appearsAs: string; covers:
   string[]; masksIdentity: boolean }` (`covers` forward-shaped for v2; the v1
   gate only reads `masksIdentity`).

4. **`StatusMixin` on `Character`** (`lib/status/Status.ts` — or fold into
   `lib/belief/`? No — it's a distinct authored concern, give it
   `lib/status/`). Settable activity-status string, three sources (verb / runtime
   setter / static authored default), per-field invariant on the setter. Feeds
   the decoration slice of presentation. **Distinct from derived status-flags**
   (poisoned/glowing) — don't merge (surface decision). It rides
   `getPresentation()`'s decoration (so it's viewer-independent) — confirm
   against how wave 0 left the affix mechanism.

5. **Persistence: a dedicated collection `beliefs`**, one document per
   `{viewerId, signatureKey}`, indexed on `viewerId`. A **new persistence
   capability** ("lazily-hydrated per-player keyed working set"). Homed as a
   thin Api (`api/belief.ts`, `BeliefStoreApi`). `hydrate(viewer)` on
   `Avatar.enter`; `evictAndFlush(viewer)` on `onDestruct`; per-record
   write-through fired from `know`/`forget`. **No Mongo read on the naming
   path** (constraint) — `recall` only touches `_beliefs`.

## 2. Sequencing — waves, dependencies, merge boundaries

This is a large build; the waves below are **separately mergeable**. Each
compiles + tests green before the next. The **first mergeable slice is Wave 1**
(the spine alone, no consumers) — but the **first slice that delivers visible
behavior is Waves 1–3** (spine + (B) routine + recognition triggers), which can
ship as one MR if Wave 1 feels too thin to merge alone.

| Wave | Goal | Depends on | Merge boundary |
|---|---|---|---|
| **0** | `getPresentation` (already merged to `origin/master`) | — | none — pull `origin/master`, don't re-merge (see §0) |
| **1** | Belief-store spine (`BeliefStoreMixin` on Character) | 0 | spine + unit tests; no consumers yet |
| **2** | (B) `PerceptionApi.describe` + the prose-viewer-threading sweep | 1 | viewer-aware naming end-to-end (in-memory; recognition records still hand-seeded in tests) |
| **3** | Recognition triggers: `introduce` verb + repeat-perception | 2 | recognition vertical (minus disguise/persistence) |
| **4** | Disguise (`Disguisable` + hood content) | 2 | masking works; presentation defers to `getDisguise` |
| **5** | Viewer-relative targeting + ordinal (the name-leak gate) | 2, 4 | `look bob` recognition-gated; disguise un-leakable |
| **6** | `StatusMixin` | 1 | status verb + decoration slice |
| **7** | Identification substrate (`read scroll of identify`) + compose weave | 1, 2 | type axis end-to-end, thin |
| **8** | Persistence (dedicated collection, lazy hydrate/evict/write-through) | 1, 3, 7 | records survive logout/login; naming path does no Mongo read |
| **9** | (deferred/optional) aether id-aug + anonymity — **axes unresolved, confirm before building** | 3, 8 | NOT core; flag-gated |
| **10** | Subsystem doc graduates | all | doc deliverable + CLAUDE.md map entry |

Waves 4, 5, 6, 7 are independent of each other (all depend only on 1–2) and can
land in any order or in parallel. Wave 8 (persistence) should land after the
realms that write records exist (3, 7) so the write-through gate has real
records to exercise.

---

## 3. Wave 1 — the belief-store spine

**Goal:** the keyed bag on `Character`, dumb CRUD, both realms' record shape,
in-memory only. No consumers, no persistence, no triggers.

### Files
- **Create** `lib/belief/BeliefStore.ts` — `BeliefStoreMixin`, the
  `BeliefRecord`/`BeliefPayload` types, the `RECOGNITION`/`IDENTIFICATION` realm
  consts, the CRUD surface (§1.1). Register `Mixins.BeliefStore` +
  `MixinApi.isBeliefStore` in `lib/mixin.ts` / `api/mixin.ts`.
- **Modify** `lib/character/Character.ts` — compose `BeliefStoreMixin` (inner
  position fine; it reads nothing from other mixins). Update the doc-comment's
  composition list.
- **Modify** `lib/mixin.ts` + `api/mixin.ts` — registry constant + predicate.

### Key decisions
- Key format `` `${realm}:${referent}` ``; referent is `templatePath`.
- `know` upserts (advances `lastSeen`, preserves `firstSeen`); a null-`knownAs`
  upsert that finds an existing record only advances `lastSeen` (coalescing).
- Lazy liveness-GC in `recall` (drop if referent unresolvable).
- TS `private` on `_beliefs` (proxy receiver — `#` throws). Persistent fields
  public for the future Hydrator path (but records are their own Documents,
  Wave 8 — the mixin's in-memory map is NOT a persistent field of the Avatar).

### Tests (`lib/belief/__tests__/BeliefStore.test.ts`)
- `know`/`recall` roundtrip; coalescing (two `know` on same referent → one
  record, `lastSeen` advances, `firstSeen` stable).
- `forget` (total) drops; `forgetField('knownAs')` (partial) nulls the name,
  keeps the record (familiar-face-lost-name).
- instance + type records coexist in one store, discriminated by realm key
  (the "demonstrably carries both key kinds" constraint).
- liveness-GC: a record whose referent no longer resolves returns null on recall.

### Merge boundary
Spine + tests. Mergeable alone (no behavior change to the running game).

---

## 4. Wave 2 — the (B) viewer-aware naming step + the prose-viewer-threading sweep

**Goal:** `PerceptionApi.describe(viewer, target)` composing baseline +
recognition + identification (the latter a no-op until Wave 7's records exist) +
the visibility gate; AND the wide-but-mechanical sweep threading the perceiving
actor into the prose name path. **These are two distinct sub-tasks — plan/size
separately.**

### 2a. The (B) routine
- **Modify** `api/perception.ts` — add
  `static describe(viewer: Stuff & Sensor & Perception, target: Stuff): string`
  (§1.2). Gate on `VisionModality.canSee`; baseline `target.getPresentation()`;
  recognition lookup; (placeholder) identification lookup; status decoration;
  mask-withhold gate (reads `getDisguise()` once Wave 4 lands — until then
  `isDisguisable` is false, gate is inert).
- **Build the salient-feature generator HERE** (not Wave 5): `describe`'s
  *unknown* branch (no record / masked) needs it now, and it's an acceptance
  criterion ("unknowns render a generated salient-feature description").
  `salientFeatures(target, covered)` → species/body (unless covered) +
  most-notable Wearable + wielded + authored `distinctiveFeatures`. Home it on
  `PerceptionApi` (or a private it owns); Wave 5 **reuses** it. Without it,
  strangers fall back to bare `shortDescription`.
- **Decision:** `describe` is **pure** (no record mutation). The
  repeat-perception write fires in Wave 3 on the controller path.

### 2b. The viewer-threading sweep (size on its own — wide but mechanical)
There is **no existing viewer-aware naming routine to upgrade** (verified:
`getDisplayName` ignored its viewer; prose passes none). Every server-side site
that interpolates a *target* name into prose must pass the perceiving actor to
`PerceptionApi.describe`:
- **`LookController.ts`** — room/contents listing (`Mml.item(item)` ~line 226 →
  route through a viewer-aware name with `actor`); single-target look name
  (~line 250). `actor` is already in scope.
- **`formatRestingSuffix`** and the **`Mml.item` / name helpers** (the
  message-rendering helpers in `api/mml.ts` / wherever they live) — these render
  viewer-blind today; thread the viewer through their callers. (Audit
  `grep -rn "Mml.item\|getPresentation" obj/command lib/message api/mml.ts` —
  enumerate the sites in the build, this plan flags the category.)
- **MQL `displayName` projection** — already viewer-threaded; re-point its
  `read` at `PerceptionApi.describe(viewer, stuff)` so the client-data path uses
  the same routine.

> **Risk / unknown to resolve early:** `Mml.item` is a low-level markup helper
> with many callers, some without a viewer in scope (scheduler-fired scenes,
> NPC-brain output). The sweep must NOT force a viewer where none exists —
> leave those on `getPresentation()` (viewer-blind baseline) and only thread the
> viewer where a perceiving actor is genuinely the audience. Enumerate the
> caller set and classify (has-viewer vs no-viewer) as the first build step.

### Tests
- `PerceptionApi.describe`: known (record `knownAs` set → returns it); unknown
  (returns baseline); not-perceivable (gate fires); identified (placeholder,
  filled in Wave 7); both-axes (Wave 7).
- **Through a real controller path** (acceptance criterion): two co-present
  viewers, one with a recognition record for the target and one without, run
  `look` (or receive a scene) and see *different* names for the *same* target.
  Not just a direct unit call.

### Merge boundary
Viewer-aware naming live end-to-end. Recognition records are hand-seeded in
tests (triggers arrive Wave 3). No viewer-blind name interpolation remains in
look/scene output (acceptance criterion).

---

## 5. Wave 3 — recognition triggers: `introduce` + repeat-perception

**Goal:** the recognition instance axis becomes self-driving. `introduce` verb
(self + third-party) writes listeners' records; repeat-perception coalesces and
advances.

### Files
- **Create** `mud/cmd/social/introduce.yaml` — the view. Single token;
  positional arg = introducee (absent ⇒ self); `--to <target>` option = audience
  (absent ⇒ earshot). Mirror `say.yaml`'s shape (MQL object operands).
- **Create** `obj/command/social/IntroduceController.ts` — the controller.
  Gate on `MixinApi.isVocal(speaker)` (spoken, in earshot — constraint).
  Resolve introducee (self or the positional MQL operand). **Third-party
  requires the speaker currently recognize the introducee** (falls out of the
  Wave-5 targeting rule; until Wave 5, resolve via the standard scope walk).
  Emit scene speech ("Bob says, 'I'm Bob.'" / "Alice says, 'This is Bob.'")
  via the Vocal scene spine **without the engine parsing it**. In the
  per-recipient iteration, write each in-earshot listener's record:
  `listener.know(RECOGNITION, introducee.getTemplatePath(), { knownAs:
  introduceeName, … })`.
- **Decision — the introduce sink:** the recording happens by the controller
  iterating the scene's recipients (the same `MessageApi.getSensors(env)` set
  the scene targets) and calling `know` on each that `isBeliefStore`. **No
  registration hook in the speech substrate** (constraint) — the controller owns
  the write, calling the one `learnIdentity`-style path. Factor the per-listener
  write into a single `RecognitionApi.learnIdentity(viewer, subject, name)`
  helper (`api/recognition.ts` — or fold onto `PerceptionApi`) so every ambient
  trigger (Wave 9 id-aug, fame) calls the same sink.
- **Repeat-perception trigger:** in `LookController` / the perceive path (the
  `autoSenseOnArrival` / look chokepoint), for each perceived target the actor
  can see, fire `learnIdentity(actor, target, null)` (creates a null-knownAs
  stranger record or advances `lastSeen`). **Decision:** home this on the
  perceive controller, not `describe` (§1.2). Confirm the single chokepoint
  (look + arrival sense) so it isn't fired from every MQL projection.

### Key decisions
- Belief is unconditional in v1 (no trust/skepticism — that's v2).
- Self-introduce: introducee = speaker. Third-party: introducee = a recognized
  other, perceptible to the audience.
- `--to` absent ⇒ everyone in earshot (the scene's natural peer set). `--to
  alice` ⇒ scene still public but the record-write is scoped to the named
  audience (decision: write for the whole earshot, since "knowing is knowing"
  and the speech is public — OR scope to `--to` only; **resolve in build, prefer
  whole-earshot** matching the public-speech model, flag in the doc).

### Tests (`obj/command/social/__tests__/IntroduceController.test.ts`)
- In-earshot listener of Mara's `introduce` → Mara's record upgraded, renders
  "Mara" via `PerceptionApi.describe`.
- Third-party `introduce bob` by someone who recognizes Bob, Bob present →
  listeners' records for Bob upgraded.
- Repeat-perception of one unknown → single record, advancing `lastSeen` (not a
  new record per sighting).
- NPC dispatches `introduce` too (programmatic controller call).

### Merge boundary
Recognition vertical minus disguise + persistence. Names learned in-session
render correctly.

---

## 6. Wave 4 — disguise (`Disguisable` + one hood)

**Goal:** `getPresentation` defers to `getDisguise()`; a worn hood masks a known
wearer; removal re-fires recognition. v1 reveal gate is dumb.

### Files
- **Create** `lib/disguise/Disguisable.ts` — `DisguisableMixin` on Creature
  (§1.3). `getDisguise()` resolver (worn-scan + imposed slot + merge);
  `setDisguise(d)` / `clearDisguise()` (transient imposed slot, doesn't persist —
  active-effect state). Register `Mixins.Disguisable` + predicate. The `Disguise`
  type lives here.
- **Create** `lib/disguise/Disguise.ts` *(or co-locate the descriptor + the
  Wearable-side mixin)* — a `DisguiseBearing` mixin composed onto a `Garment`
  exposing `getDisguise(): Disguise` (the worn source the resolver scans for).
- **Modify** `lib/stuff/Stuff.ts` `getPresentation()` — **defer to
  `getDisguise()`**: if `MixinApi.isDisguisable(this)` and `getDisguise()` is
  non-null, use the merged `appearsAs` as the identity base before affixes. (This
  is the ONE change to the wave-0 method; keep the synthesis in one place — do
  NOT shadow the synthesizer.)
- **Modify** `lib/creature/Creature.ts` — compose `DisguisableMixin` (outer of
  `Slotted`/`Visible`). Update doc-comment.
- **Create** `seeds/domain/eternal/clothes/hood.yaml` — a `Garment` composing
  the disguise-bearing mixin, `appearsAs: "a hooded figure"`, `masksIdentity:
  true`, `covers: [face]`, `slotClaims: { /lib/body-plans/biped: [head] }` (use
  an existing biped head/face slot; reuse `torso` if no head slot — confirm
  `biped.yaml` slot universe, flag if a slot must be added).

### Key decisions
- `getDisguise()` is **viewer-blind** — viewer-relativity stays in (B), which
  withholds a known `knownAs` when masked.
- The (B) mask gate is dumb: `masksIdentity` ⇒ render baseline (= `appearsAs`),
  suppress `knownAs`. Per-channel partial recognition is v2.
- Removal: since worn-scan is live (no stored disguise state), removing the hood
  makes `getDisguise()` return null next render → recognition re-fires for free.

### Tests (`lib/disguise/__tests__/Disguisable.test.ts` +
`obj/command/.../__tests__`)
- `getDisguise()` resolves the worn hood; `setDisguise`/`clearDisguise` impose
  and lift with no worn item.
- A known wearer reads "a hooded figure" to others while hooded; removal
  re-fires recognition (test **both** transitions).
- `getPresentation()` is never shadowed for masking (it defers).

### Merge boundary
Masking works; one content item ships.

---

## 7. Wave 5 — viewer-relative targeting + ordinal (the name-leak gate)

**Goal:** keyword resolution shares the naming step's source — `look bob`
resolves to Bob iff the viewer recognizes him; a masked/unknown Bob is not
addressable as "bob". Perceptually-identical targets disambiguate by ordinal.

### Files
- **Modify** `api/mql/scope-walk.ts` `pushDirect` (~line 171) and its
  `candidatesFor*` callers — the candidate's `name` must be the **viewer-relative
  perceived name** (`PerceptionApi.describe(giver, stuff)`), NOT
  `getPresentation()`. The `giver` (= viewer) is already threaded into every
  `candidatesForX`. Keywords likewise: derive from the *perceived* presentation
  (`knownAs` if recognized, else salient features) — **never the true name**.
- **Confirm** ordinal disambiguation (`api/mql/resolver.ts` `case 'ordinal'`)
  works over the recomputed candidate set; the ordinal is **set-stable, not
  session-sticky** (an index into the current snapshot). Likely no change — just
  verify it carries no identity.

### Key decisions
- `getKeywords()` for targeting becomes viewer-relative: a recognized target
  contributes its `knownAs` as a keyword; an unknown contributes its salient
  descriptors (species + visible wearables); a masked target contributes the
  disguise's descriptors only. The true name is never a keyword unless revealed.
- **Boundary (surface decision):** the engine closes **direct** leaks (keyword
  resolution). It does NOT close **inferential** leaks (elimination, watching
  someone don a hood) — those are legitimate player reasoning.
- Salient-feature keywords for unknowns **reuse the Wave-2
  `salientFeatures(target, covered)` generator** — don't re-implement.
  Targeting derives an unknown's keywords from that same perceived string
  (species + visible wearables), so naming and targeting can't diverge.

### Tests (`api/mql/__tests__/scope-walk.recognition.test.ts`)
- `look bob` fails for a viewer who doesn't recognize Bob, and for a viewer who
  knows Bob while he's masked.
- Three perceptually-identical figures disambiguate by ordinal, no name leak;
  the prompt renders all candidates by perceived presentation.
- A recognized Bob IS addressable as "bob".

### Merge boundary
The parser no longer outs disguises. Targeting and rendering share a source.

---

## 8. Wave 6 — `StatusMixin`

**Goal:** a settable activity-status feeding the decoration slice.

### Files
- **Create** `lib/status/Status.ts` — `StatusMixin` on Character (§1.4).
  `getStatus()` / `setStatus(s)` with a per-field invariant on the setter;
  a static authored default field; register `Mixins.Status` + predicate.
- **Create** `mud/cmd/social/status.yaml` + `obj/command/social/StatusController.ts`
  — the `status` verb (one of the three settable paths; the runtime-setter path
  is the public `setStatus` an NPC brain pokes; the static default is the
  authored field).
- **Modify** `lib/character/Character.ts` — compose `StatusMixin`.
- **Wire** the status into the decoration slice. **Decision:** status is
  viewer-independent → it rides `getPresentation()`'s decoration affix (match
  wave 0's affix mechanism — confirm whether wave 0 left a `MarkupAugmenter`-style
  per-mixin contributor walk; if so, `StatusMixin` registers a contributor; if
  the affix path is simpler, append in `getPresentation`). Confirm at build time.

### Tests (`lib/status/__tests__/Status.test.ts`)
- `status` verb sets it; appears in `getPresentation()` / `describe`; works from
  a static default; setter invariant rejects bad input.

### Merge boundary
Status verb + decoration. Independent of recognition records.

---

## 9. Wave 7 — identification substrate (type axis, thin)

**Goal:** type-keyed memory + one thin binary trigger, proving the axes compose.

### Files
- **(reuse)** `BeliefStoreMixin` IDENTIFICATION realm — no new store. The type
  signature is `templatePath + appearance` (the slate's class signature);
  **decision:** key on `target.getTemplatePath()` (the type's durable id) for v1
  — appearance-keying matters only when one template renders multiple
  appearances, deferred. Document the choice.
- **Modify** `api/perception.ts` `describe` — fill in the identification lookup
  (§1.2 step 5): `viewer.recall(IDENTIFICATION, typeSig(target))`; if
  `typeKnown`, render the known type name ("a potion of healing") instead of the
  unidentified baseline ("a blue potion"). **Compose with recognition** (step
  6): both can apply.
- **Create** the thin trigger. **Decision:** `read scroll of identify` is the
  iconic trigger, but the requirements permit an equivalently-thin substitute.
  **Prefer a notch on an existing verb if scroll content is heavy** — but a
  scroll is self-contained content. Plan: `seeds/domain/eternal/scrolls/scroll-of-identify.yaml`
  (a `Thing` with a `read` affordance) + `obj/command/.../ReadController.ts` (if
  no `read` verb exists — confirm; if it does, add the identify branch). On read,
  write `viewer.know(IDENTIFICATION, typeSig(target), { typeKnown: true })` for
  the target item. Binary (unidentified ↔ identified), no partial levels.
- Demo content: a blue vial seed that renders "a blue potion" unidentified,
  "a potion of healing" identified (the known-type name comes from the
  template's real Named/type name; the unidentified baseline from
  `shortDescription`).

### Key decisions
- Type illusion (item masking its own identity) reuses the
  getPresentation-defers-to-masking pattern *by design*, but **no illusion
  content ships and no item-side masking host is built** (v1 disguise is
  creature-only). The type axis sidesteps the disguise gate entirely
  (class-keyed, no per-instance masking).
- Forgetting a type is global (all blue vials revert); an instance is local —
  falls out of the realm keying, no special code.

### Tests (`obj/command/.../__tests__/identify.test.ts`)
- `read scroll of identify` on a blue vial → type record written; vial renders
  "a potion of healing" to that viewer, stays "a blue potion" to others.
- **The two axes compose** (acceptance criterion): a recognized-and-identified
  actor renders with both.

### Merge boundary
Type axis end-to-end, thin. N=2 validation of the shared spine.

---

## 10. Wave 8 — persistence (dedicated collection, lazy working set)

**Goal:** records survive logout/login; one doc per `{viewerId, signatureKey}`;
naming path does no Mongo read.

### Files
- **Create** `api/belief.ts` — `BeliefStoreApi` (decorate with
  `SecurityApi.decorateApiClass`). Static methods:
  - `hydrate(viewer)` — `PM.find('beliefs', { viewerId })`, populate the
    viewer's in-memory `_beliefs`.
  - `evictAndFlush(viewer)` — final write-through + clear the map.
  - `writeRecord(viewer, record)` — per-record upsert
    `PM.save('beliefs', { _id: \`${viewerId}:${signatureKey}\`, viewerId, … })`.
  Ensure an index on `viewerId` (create on first hydrate, or document the
  index-creation step).
- **Modify** `lib/belief/BeliefStore.ts` — `know`/`forget` fire write-through
  **only for records that have learned something** (null-knownAs records stay
  session-local — constraint). The write-through call goes through
  `BeliefStoreApi.writeRecord`.
- **Modify** `obj/Avatar.ts` — `enter()` calls `BeliefStoreApi.hydrate(this)`
  (lazy, on session establish); `onDestruct()` calls
  `BeliefStoreApi.evictAndFlush(this)`.

### Key decisions
- **One doc per `{viewerId, signatureKey}`**, NOT one-big-doc-per-viewer (avoids
  16MB cap + whole-array rewrites — the `ContactsMixin` anti-precedent).
- **No Mongo read on the naming path** (constraint) — `recall` is pure in-memory;
  Mongo touched only on hydrate + write-through.
- **NPC viewers:** named/singleton NPCs (durable `templatePath`) persist;
  generic NPCs are session-ephemeral by construction (no durable viewer key) —
  falls out of keying, gate write-through on the viewer having a durable id.
- Recency-pruning (the v1 volume bound) + lazy liveness-GC; **decay is v2.**
- **Stay cascade-ready; do NOT roll your own account-deletion here.** The
  collection is owner-keyed + indexed on `viewerId` precisely so it can be
  purged by the platform's per-player-working-set **cleanup cascade** (an
  `aroundDelete` hook on the account Document running `deleteMany({viewerId})`,
  plus a viewer-liveness GC backstop — GDPR/erasure; see belief-store-slate §
  Account-deletion cleanup). Building the cascade itself is the persistence
  layer's job, not this build's — just keep the collection cascade-ready and
  consume the capability. Flag if account-deletion doesn't yet exist to hook.

### Tests (`lib/belief/__tests__/persistence.test.ts`)
- Hydrate → render → write-through → evict → re-hydrate roundtrip.
- A new encounter/identify is a single-record upsert.
- The naming path performs no Mongo read (assert via a PM spy/mock).
- A null-knownAs stranger record is NOT written through.

### Merge boundary
Memory durable across sessions. The persistence capability the requirements
forced.

---

## 11. Wave 9 — aether id-aug + anonymity (DEFERRED / OPTIONAL — axes unresolved)

> **DO NOT BUILD without confirming the design axes.** The belief-store-slate's
> open question #1 is unresolved: reception = receiver-attunement vs innate?
> disguise = orthogonal vs aether-pierce-flag? *Leaning attunement + orthogonal,
> unconfirmed.* The **core introduction mechanism is the explicit `introduce`
> verb (Wave 3)** — that ships in core. This wave is a late add: an
> `AugmentMixin` broadcast over the aether channel to attuned receivers,
> anonymity controlled by an `identity.broadcast` setting (no verb), calling the
> **same `RecognitionApi.learnIdentity` sink** as `introduce`. Fame /
> pre-seeded acquaintance are further ambient triggers on the same sink.
> Sequence it after Waves 3 + 8; gate behind the setting. Flag clearly:
> "axes unresolved — confirm before building."
>
> **Doubly blocked (confirmed deferred):** beyond the unresolved axes, the
> **augmentation substrate is itself being retooled** in a parallel effort —
> the id-aug can't be built on a moving foundation. Wait for both the aug
> retool to settle *and* the axes to be confirmed. The recognition core ships
> entirely without it.

---

## 12. Wave 10 — subsystem doc

**Goal:** a subsystem doc graduates (deliverable + acceptance criterion).

- **Create** `docs/subsystems/belief.md` (home TBD with planner — **decision:**
  `belief.md` for the spine, since recognition + identification are realms of it;
  cross-reference from both axes). Document: the keyed bag + realms + CRUD; the
  `templatePath` keying + instance/type split; the flag-vs-value payload rule;
  the (B) `PerceptionApi.describe` compose seam + the perception delegation; the
  `Disguisable`/`getDisguise` resolver + the dumb v1 reveal gate; the
  viewer-relative targeting + ordinal rule + the direct-vs-inferential leak
  boundary; `StatusMixin`; the identification thin trigger; the persistence shape
  (dedicated collection, lazy working set, no-Mongo-read-on-naming-path, the
  NPC-viewer cost split); the deferred tails (pedagogical instrument seam,
  partial ID, misidentification, social-graph buckets, decay, nicknames,
  voice/scent, the unresolved id-aug axes).
- **Modify** `CLAUDE.md` — add the doc to the Documentation Map.

---

## 13. Risks / unknowns the build agent must resolve early

1. **The `Mml.item` caller set (Wave 2b).** Wide; some callers lack a viewer
   (scheduler/NPC-brain scenes). Enumerate and classify (has-viewer vs not)
   *first*; only thread the viewer where a perceiving actor is the audience. Do
   not force a viewer where none exists — leave those on the viewer-blind
   `getPresentation()`. This is the single biggest sizing unknown.
2. **The affix/decoration mechanism wave 0 actually shipped.** §1.4 + Wave 6
   assume a per-mixin contributor walk (the recognition-slate's `MarkupAugmenter`
   framing). Confirm what `refactor/get-presentation` actually built before
   wiring `StatusMixin` and the disguise deferral — the merged Stuff.ts (read it
   post-merge) is authoritative, not the slate.
3. **`describe` purity vs. the repeat-perception write (§1.2 / Wave 3).** The
   naming step runs for every perceived target × viewer on every look/listing/MQL
   projection. The record-mutating trigger MUST live on the perceive controller
   chokepoint, never in `describe` — else every projection read mutates memory.
   Find the single look/arrival chokepoint.
4. **`--to` audience scope for `introduce` (Wave 3).** Whole-earshot vs
   named-only record write. Prefer whole-earshot (public speech); confirm and
   document.
5. **biped slot universe for the hood (Wave 4).** Confirm a head/face slot
   exists in `biped.yaml`; if not, reuse `torso` or add one (flag as content
   nicety, mirror the encumbrance-plan's `back`-slot decision).
6. **`read` verb existence (Wave 7).** Confirm whether a `read` controller
   exists; add the identify branch if so, else create the verb. If scroll content
   proves heavier than a notch on an existing verb, substitute an equivalently-thin
   trigger (requirements permit this).
7. **Type signature keying (Wave 7).** `templatePath`-only vs
   `templatePath+appearance`. Default to `templatePath`-only for v1; document.

## 14. Under-specified / contradicted-by-code flags

- **The recognition-slate's `viewer.knownPeople: Map<Stuff, Record>` is
  superseded** by the requirements' `templatePath`-keyed belief store. The slate
  keys on the live `Stuff` instance (breaks on reboot, defeats disguise). Build
  the requirements' shape; the slate's `Map<Stuff,…>` is stale.
- **The recognition-slate's `RecognitionShadow` (perception.md ~line 91, and the
  slate's "shadows `getPresentedIdentity`") is superseded.** Recognition is NOT a
  Shadow — it's the explicit `PerceptionApi.describe` entry point; disguise is
  NOT a shadow on the synthesizer — it's `getPresentation` deferring to
  `getDisguise`. Both perception.md's "RecognitionShadow" example and the slate's
  `getPresentedIdentity`-shadow design are out of date; follow the requirements'
  surface decisions. (Flag for the Wave 10 doc to correct perception.md's
  example.)
- **"86 call sites" (requirements) vs ~94 occurrences / 59 files (master,
  measured).** The discrepancy is wave 0's already-merged migration scope — not
  this build's concern; noted so the build agent doesn't re-count.
- **`PerceptionApi.describe` home is the planner's call** (requirements leave it
  open). This plan fixes it on `PerceptionApi` (gates on perception, sibling of
  the vision queries). The build agent may relocate if a cleaner home emerges,
  but must keep it an explicit-viewer-param entry point, not a Shadow.

## 15. Critical files

- `packages/server/src/mud/lib/belief/BeliefStore.ts` (new — the spine + record shape + CRUD)
- `packages/server/src/mud/api/perception.ts` (modify — the (B) `describe` compose routine + visibility-gate delegation)
- `packages/server/src/mud/api/mql/scope-walk.ts` (modify — the viewer-relative targeting / name-leak gate)
- `packages/server/src/mud/lib/disguise/Disguisable.ts` (new — `getDisguise()` resolver) + `packages/server/src/mud/lib/stuff/Stuff.ts` (modify — `getPresentation` defers to it)
- `packages/server/src/mud/api/belief.ts` (new — dedicated-collection lazy hydrate/evict/write-through) wired into `packages/server/src/mud/obj/Avatar.ts` (`enter`/`onDestruct`)
