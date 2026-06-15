# Chronicle — Implementation Plan

The **chronicle** is a character's accumulating, append-only record of
identity-shaping narrative events — the **dumb ledger** every future
identity readout (recognition, reputation, alignment, traits,
achievements) will project from. This build ships the ledger plus a real
way to read it, and **none** of the readouts. It follows the
belief-store pattern exactly: a dumb store with all intelligence in its
consumers.

Plans against
[../requirements/chronicle-requirements.md](../requirements/chronicle-requirements.md)
and the seeding slate
[../slates/deferred-rpg/chronicle-slate.md](../slates/deferred-rpg/chronicle-slate.md)
(graduating to `builds/` as part of this cycle). All paths are absolute
from repo root `/home/bobalu/play/saxonberg/master`; server source root
is `packages/server/src/`. The build branches off `master`.

> **Mirror the belief store — it is the precedent for every shape here.**
> Read [../subsystems/belief.md](../subsystems/belief.md) and
> `src/mud/lib/belief/BeliefDocument.ts` + `src/mud/api/belief.ts` first.
> The chronicle copies the belief store's spine: a plain-data
> `Document` subclass in a per-subsystem `lib/` folder, an
> owner-indexed collection, a single gated Api as the only mint/read
> surface, a write-path find-then-save upsert, and a `#active()`
> connection gate. The **one deliberate divergence** is in the planning
> call below: **no mixin** (the chronicle has no hot path, so it needs
> no in-memory working set — see Conventions).

---

## Verified ground truth (confirmed against the code)

1. **The belief precedent is exactly as the requirements describe.**
   `BeliefDocument extends Document` (`src/mud/lib/belief/BeliefDocument.ts`)
   is plain-data: `static collectionName = Collections.Beliefs`,
   `static persistentFields = [...]`, public scalar fields, and
   `applyRecord`/`toRecord` projection helpers. The store/consumer split
   lives in `src/mud/api/belief.ts` (`BeliefStoreApi`), which goes
   through the `Document` wrapper (`BeliefDocument.find` / `.save`), does
   a **find-then-save upsert on the write path**, and gates every method
   on a private `#active()` → `PersistenceManager.get().isConnected()`.
   The index is declared centrally in `PersistenceManager.createIndexes`
   (`src/backend/PersistenceManager.ts`, near line 588). **Mirror this
   shape precisely.**
2. **The single gated mint sink precedent is
   `RecognitionApi.learnIdentity`** (`src/mud/api/recognition.ts`, near
   line 155) — a static method that no-ops on a missing durable key
   (`subject.getTemplatePath()`) and funnels every recognition trigger
   through one write. The class ends
   `SecurityApi.decorateApiClass(RecognitionApi)`.
3. **Game-time witness** = `WorldClockApi.getNow()` →
   `Quantity<'s'>` (`src/mud/api/worldclock.ts`, near line 143). The deed
   `when` is sourced here; store the **seconds magnitude as a plain
   number** (keeps the Document scalar — no marshaller).
4. **Prose** = `ProseApi.format(source, vars)` → `Mml`
   (`src/mud/api/prose.ts`, near line 186). Liquid templates with
   `| name` / `| location` filters are already registered. Deed `text`
   is rendered here; claim `text` is authored.
5. **`bio` / `aspiration` live on `PersonaMixin`**
   (`src/mud/lib/character/Persona.ts`) via `getBio()` / `getAspiration()`.
   The chronicle **does not touch `bio`** — it renders it read-only and
   adds a **parallel** claim-seed (distinct from the existing `bioSeed`).
6. **Demo-minter seams confirmed:**
   - `EnrollController.commit` (`src/mud/obj/command/charactergen/EnrollController.ts`,
     near line 476) already resolves the chosen `aspiration` roster
     entry and seeds `bio: aspiration?.bioSeed ?? ''` (near line 506),
     then calls `avatar.enter(interactive, { firstArrival: true })`.
   - `Avatar.enter(interactive, { firstArrival })` (`src/mud/obj/Avatar.ts`,
     near line 329) already calls `BeliefStoreApi.hydrate(this)` — the
     natural seam for the first-arrival minter. It throws earlier if the
     avatar has no container (near line 334), so `getContainer()` is
     non-null at the minter site.
   - `IntroduceController.execute` (`src/mud/obj/command/social/IntroduceController.ts`,
     near line 49) iterates `MessageApi.getSensors(env)` and calls
     `learnIdentity`. **It is currently `execute(...): void` (sync)** —
     adding an awaited minter makes it `async` (a real signature change,
     see Risks).
7. **Self-only zero-arg verb home.**
   `PerceiverMixin.commandContributions.self`
   (`src/mud/lib/description/Perceiver.ts`, near line 127) is the
   canonical self-verb contribution list. The chronicle verb belongs on
   **`PersonaMixin`** (it reads the Persona-owned bio/aspiration-seeded
   identity) — see Phase 4. `PersonaMixin` does **not** declare
   `commandContributions` today; adding the field is part of the change.
8. **Test harness** for persistence + idempotency is
   `src/mud/lib/belief/__tests__/persistence.test.ts`: an in-memory PM
   stub via `vi.spyOn(pm, 'find' | 'save' | 'delete')`, plus
   `makeStuffAtPath` from `src/mud/lib/security/__tests__/test-setup.ts`.
   Copy this harness.

### Discrepancies / unknowns flagged for the build owner

- **`PersonaMixin` carrying a self-verb (#7) is unverified.** Confirm
  `PersonaMixin` is composed on `Avatar` (it is a `Character`-tier
  mixin; `Avatar extends … Character`) **and** that the `CommandGiver`
  surface reads `commandContributions.self` off composed mixins. If
  Persona cannot legitimately own the verb, fall back to declaring it on
  `Avatar`'s static `commandContributions` (grep where `Avatar`'s
  self-verbs are declared). Persona is the *conceptually* correct owner
  (it already owns bio/aspiration).
- **`IntroduceController.execute` sync → async (#6).** Verify the
  dispatcher awaits async controllers (`_executeOne`; command-spec says
  `execute` may be sync or async). Real signature change — flag in the
  build.
- **A self-facing `MessageApi` topic for the render.** Confirm an apt
  topic exists in `api/message.ts` `Topics` before inventing one — the
  perception/self topic family is the natural fit (this is a self
  readout). **Reuse, don't add.**
- **`Document.getAllFields()` with no mixin in the chain.**
  `BeliefDocument` proves a no-mixin plain `Document` round-trips, so
  `ChronicleEntry` with only `static persistentFields` is fine — confirm
  by mirroring `BeliefDocument` exactly.

---

## Conventions to respect

- **Planning call: Api-only, NO `ChronicleMixin`.** The requirements
  leave the mixin-vs-Api split as a planning decision, defaulting to
  "the thinnest surface matching the belief-store precedent." Belief
  carries a `BeliefStoreMixin` **because** it serves a no-Mongo naming
  **hot path** with a live in-memory working set. The chronicle has
  **no hot path** (mint is a rare identity moment; render is on-demand
  and may read Mongo) and **no owner-side runtime state** — entries
  exist only as Documents, fetched owner-scoped when needed. Therefore
  the correct reading of "thinnest surface" is **no mixin**: the owner
  key is `owner.getTemplatePath()`, read directly in the Api exactly as
  `learnIdentity` reads `subject.getTemplatePath()`. `lib/chronicle/`
  holds only the `ChronicleEntry` Document (the "Stuff class / Document"
  taxonomy category placed in its subsystem folder — like
  `BeliefDocument` in `lib/belief/`).
- **Dumb store, smart consumers.** The substrate stores entries and
  fetches them owner-scoped. **No per-tag meaning, no readout logic, no
  MQL provider** lives here. `tags` / `who` are persisted and
  owner-fetchable but otherwise **inert in v1** (designed in for
  reputation/alignment/traits/achievements).
- **One Document per entry, owner-indexed — never a growing array.**
  The `ContactsMixin` 16 MB / whole-array-rewrite anti-precedent. The
  belief store made exactly this choice.
- **Single gated mint entry point.** Content records through one
  security-gated Api (`learnIdentity` precedent). **No engine
  auto-subscription to the event bus** — the identity-impact gate is an
  *authoring doc principle*, not engine-enforced. The substrate offers
  only the `record(...)` seam.
- **Singularity comes from the trigger, not universal dedup** — three
  patterns: *event-singular* (rides a naturally-once trigger, no key),
  *category-first* (`recordOnce(key)`), *repeatable* (plain `record`).
- **No Mongo read on any hot path.** v1 has none. `recordOnce`'s
  first-time check is a write-path read only (fine, like the belief
  upsert's find-then-save).
- **Module placement.** `lib/chronicle/` for the entry Document; `api/`
  for the gated `ChronicleApi`, ending
  `SecurityApi.decorateApiClass(ChronicleApi)`. Do not dump at `lib/`
  root. Do not invent a new module category.
- **Privacy.** Api class may use static `#` privates (Api methods are
  static — no instance proxy). The Document's persistent fields are
  **public** (Hydrator reflects into them by name). Inter-Stuff reads go
  through methods, but the entry is plain data (Hydrator-reflectable,
  like `ContactEntry` / `BeliefDocument`).
- **Naming.** `chronicle` verb is a single token (no two-word verbs).
  Boolean fields (none here) would use noun-form field/setter +
  predicate getter. Deed `text` via `ProseApi`; claim `text` authored.
- **Controllers return `void`.** Outcome rides the dispatch-response
  envelope; emit with
  `MessageApi.scene(...).topic(...).toSelf(...).send()`. No
  `{ success }` returns.
- **Keep "Saxonberg" out** of any engine identifier.

---

## Phase 1 — Persistence substrate (the dumb ledger)

**1a. Add the collection + index.** Modify
`src/backend/PersistenceManager.ts`:
- `Collections` enum (near line 30): add `Chronicles = 'chronicles',`
  after `Beliefs`.
- `createIndexes()` (after the Beliefs index, near line 590): add
  `await this.getCollection(Collections.Chronicles).createIndex({ owner: 1 });`
  with a comment mirroring the Beliefs one (owner-scoped fetch + future
  per-player cascade).

**1b. Create `src/mud/lib/chronicle/ChronicleEntry.ts`** —
`ChronicleEntry extends Document`, modeled on `BeliefDocument`:

```ts
static collectionName = Collections.Chronicles;
static persistentFields = [
  'owner', 'kind', 'when', 'order',
  'where', 'who', 'text', 'tags', 'key',
];

owner = '';                          // whose chronicle (playerId / templatePath) — indexed
kind: 'claim' | 'deed' = 'deed';
when: number | null = null;          // game-time SECONDS magnitude (deeds only); null for claims
order: number | null = null;         // authored prologue order (claims only); null for deeds
where: string | null = null;         // place templatePath ref | null
who: string[] = [];                  // entity templatePath refs — inert in v1
text = '';                           // rendered line (deed: ProseApi; claim: authored)
tags: string[] = [];                 // open vocabulary — inert in v1
key: string | null = null;           // recordOnce category-first dedup key
```

All scalars / arrays-of-scalars → satisfies the scalar-default rule; no
marshaller needed. Public fields → Hydrator-reflectable. Mirror
`BeliefDocument`'s `applyRecord` / `toRecord` projection helpers if the
Api wants a typed record shape (optional — direct field access also
works for plain data; match whatever `BeliefDocument` does).

**Acceptance covered:** *a `chronicles` collection exists;
`ChronicleEntry extends Document` persists one document per entry,
indexed on `owner`; entries round-trip through the `Document` wrapper.*

**Sequencing risk:** confirm `'chronicles'` is referenced only through
the `Collections` enum (grep the literal). Confirm a no-mixin `Document`
picks up `static persistentFields` — `BeliefDocument` is the proof.

---

## Phase 2 — The gated mint Api

**Create `src/mud/api/chronicle.ts`** —
`export class ChronicleApi { … } SecurityApi.decorateApiClass(ChronicleApi);`
Mirror `BeliefStoreApi`'s `#active()` / `#ownerKey()` privates (static
`#` is allowed on Api classes).

Method surface:

- `static #active(): boolean` → `PersistenceManager.get().isConnected()`.
- `static #ownerKey(owner: Stuff): string | null` →
  `owner.getTemplatePath()` (no-op the whole op when null).
- **`static async record(owner, fields): Promise<void>`** — the
  always-append primitive. Builds a `ChronicleEntry`, assigns the passed
  fields (kind / when / text / where / who / tags / key / order), and
  `await entry.save()`. No-op without owner key or active connection.
  The Api stays **dumb about prose** — it just stores `text`.
- **`static async recordDeed(owner, { template, vars, when?, where?, who?, tags?, key? }): Promise<void>`**
  — convenience over `record` that (a) renders `text` via
  `ProseApi.format(template, vars)` and (b) stamps
  `when = WorldClockApi.getNow()` seconds-magnitude when `when` is
  omitted. Sets `kind: 'deed'`. This keeps the "deed text via ProseApi"
  + "timestamp is the witness" contract at one seam so callers never
  re-derive game-time.
- **`static async recordOnce(owner, key, fields): Promise<void>`** —
  idempotent category-first:
  `const [existing] = await ChronicleEntry.find({ owner: ownerKey, key });`
  `if (existing) return;` then delegate to `record` (or `recordDeed` —
  provide a `recordDeedOnce` variant, or pass a `render` flag; pick one,
  keep one builder). The find-then-save-on-write-path mirror of the
  belief upsert. Race is benign under per-socket serialization (same
  argument belief.md makes).
- **`static async entriesFor(owner): Promise<ChronicleEntry[]>`** — the
  owner-scoped reader: `return ChronicleEntry.find({ owner: ownerKey });`
  Returns `[]` without a key or when disconnected. **The only reader v1
  ships** (no MQL provider).
- **`static async seedClaims(owner, seeds: { text: string; order: number }[]): Promise<void>`**
  — char-gen helper: mint `kind: 'claim'` entries with `order` set,
  `when: null`, `text` = authored seed. A named helper keeps the seam
  testable and documented.

**Acceptance covered:** *a single gated mint entry point records a
`deed` (ProseApi-rendered); plain `record` always appends; `recordOnce`
is idempotent; `tags`/`who` persisted and retrievable via owner-scoped
fetch.*

**Sequencing risk:** `api/chronicle.ts` imports `ChronicleEntry` from
`lib/chronicle/` and `Collections` from `backend/PersistenceManager` —
same import shape as `api/belief.ts`, so no boot-order cycle (the
Document track has no Idea-graph coupling). Confirm `WorldClockApi` and
`ProseApi` are import-safe from `api/` (sibling Apis import each other
freely).

---

## Phase 3 — Char-gen claim-seed

**3a. Extend the roster content shape.** Modify
`src/mud/config/char-gen.yaml`: add a `claimSeeds: [{ text, order }]`
array (1–3 entries) under each `aspirations[]` entry, **distinct from
`bioSeed`**. If the file header notes claim/chronicle seeding is
deferred, flip that note.

**3b. Type the roster entry.** In `EnrollController.ts`, extend the
`AspirationRosterEntry` interface (near line 75) with
`claimSeeds?: { text: string; order: number }[];`.

**3c. Mint at commit.** In `EnrollController.commit`, after the avatar
is cloned and registered (so `getTemplatePath()` resolves) — co-located
with the existing `bio: aspiration?.bioSeed` line and the Phase-5a
founding deed — call
`await ChronicleApi.seedClaims(avatar, aspiration?.claimSeeds ?? []);`
Keep strictly separate from the `bio` seed; both read the same
aspiration, neither touches the other.

**Acceptance covered (with Phase 5a):** *char-gen seeds `claim` entries
from the chosen aspiration; a freshly enrolled character has ≥1 claim
(prologue) AND ≥1 founding deed.*

**Sequencing risk:** confirm `avatar.getTemplatePath()` is populated
post-`StuffApi.clone` (the clone pipeline stamps templatePath at
pre-register — the same reliance `learnIdentity` has for avatars). The
claim-seed test (Phase 6) must stub PM like the belief test.

---

## Phase 4 — The `chronicle` verb (MVC pair)

A single-token, zero-arg, self-only, **read-only** verb. It subsumes the
*view* role the char-gen subsystem sketched as the deferred `records`
verb; `records`-style bio **editing** stays deferred.

**4a. YAML view** `src/mud/cmd/charactergen/chronicle.yaml` (category
`charactergen` — identity/self; siblings `enroll`/`play` live there):

```yaml
verbs: [chronicle]
controller: charactergen/ChronicleController
description: "Read your own chronicle — your prologue and your deeds."
```

No `args` / `subcommands` (zero-arg verb, explicitly allowed). No
validators (no object field). Self-only falls out of the discovery
wiring (4d) + the controller reading `context.commandGiver`.

**4b. Controller** `src/mud/obj/command/charactergen/ChronicleController.ts`
— `extends CommandController<CommandModel>`,
`async execute(model, context): Promise<void>`:
- `const actor = context.commandGiver;`
- `const entries = await ChronicleApi.entriesFor(actor);`
- Partition (**never interleave**):
  `claims = entries.filter(e => e.kind === 'claim').sort(order asc)`;
  `deeds = entries.filter(e => e.kind === 'deed').sort(when asc)`.
- Render order: **bio** (`MixinApi.isPersona(actor) ? actor.getBio() : ''`)
  → **prologue** (claims) → **timeline** (deeds). Compose with
  `Mml.compose` / `Mml.fromMarkup`; each entry's `text` is an MML-safe
  rendered line (deed text came from `ProseApi`; claim text is
  author-trusted from `char-gen.yaml`), so `Mml.fromMarkup(entry.text)`
  is safe.
- `MessageApi.scene(actor).topic(<self/perception topic>).toSelf(body).send();`
  — reuse an existing self-facing topic (verify `api/message.ts`
  `Topics`; do not add one).
- **Empty state:** if no claims and no deeds, still render the bio plus a
  "your chronicle is just beginning" line.

**4c. Controller seed**
`src/mud/seeds/obj/command/charactergen/ChronicleController.yaml`:

```yaml
class: /obj/command/charactergen/ChronicleController
data: {}
```

(The third leg of the MVC triple — without it `_executeOne`'s clone
fails at runtime.)

**4d. Discovery wiring.** Add `'charactergen/chronicle.yaml'` to a new
`static commandContributions = { self: [...] }` on `PersonaMixin`
(`lib/character/Persona.ts`). **Verify first** (see Discrepancies):
Persona is composed on `Avatar` and the `CommandGiver` surface reads
`commandContributions.self` off composed mixins. If not, declare on
`Avatar`'s static `commandContributions` instead.

**Acceptance covered:** *the `chronicle` verb renders self-view: the
prose bio, then claims by `order`, then deeds by `when`, partitioned
(never interleaved).*

**Sequencing risk:** controllers may be async (`execute` →
`Promise<void>`, per command-spec). Verify the `charactergen` category
is registered (it is — `enroll`/`play`). Verify the YAML schema accepts
a zero-arg verb (it does — neither args nor subcommands is fine).

---

## Phase 5 — Three demo minters (moments that already fire)

Wire three minters on existing controllers to prove the seam and
guarantee every character has a timeline.

**5a. Enroll founding deed** — in `EnrollController.commit`, after the
avatar exists (co-located with the Phase-3c claim-seed call), call
`await ChronicleApi.recordDeed(avatar, { template: 'Enrolled as {{ name }}, {{ aspirationLabel }}.', vars: {…}, tags: ['founding', 'enroll'] });`
**Plain append** (event-singular by trigger — enroll fires once per
character by construction; **no `key` needed**).

**5b. First-arrival deed** — in `Avatar.enter`, near the
`BeliefStoreApi.hydrate(this)` / first-arrival handling, call
`await ChronicleApi.recordOnce(this, 'first-arrival', { kind: 'deed', /* render via recordOnce-deed variant */ template: 'Arrived at {{ place | location }}.', where: this.getContainer()?.getTemplatePath() ?? null, tags: ['arrival'] });`
**Category-first via `recordOnce`** — keyed `'first-arrival'`. **Call it
unconditionally** (not gated on the `firstArrival` flag): the flag
selects greeting prose; the `recordOnce` key is the dedup authority, so
the *first ever* arrival mints once and every re-login `enter` no-ops.
`getContainer()` is non-null here (enter throws earlier without one).

**5c. First-introduce deed** — in `IntroduceController.execute`, after
the scene `.send()` and the `learnIdentity` loop, call
`await ChronicleApi.recordOnce(actor, 'first-introduce', { kind: 'deed', template: 'Made your first introduction.', tags: ['social', 'introduce'] });`
Category-first; repeat `introduce`s don't duplicate. (A future "met
&lt;specific NPC&gt;" deed would instead be *event-singular* off
recognition's first-encounter — no key. Not built here.)

**Acceptance covered:** *the three demo minters (enroll, first arrival,
first introduce) produce deeds; first-arrival and first-introduce do not
duplicate on repeat.*

**Sequencing risks:**
- `Avatar.enter` is already `async` and `await`s `BeliefStoreApi.hydrate`
  — adding `await ChronicleApi.recordOnce` is shape-consistent.
  `recordOnce` no-ops when disconnected, so a Mongo hiccup never blocks
  the welcome scene.
- **`IntroduceController.execute` is currently sync** — the awaited
  minter makes it `async` (`execute(...): Promise<void>`). Confirm the
  dispatcher awaits async controllers (`_executeOne`). **Real signature
  change — flag it.**

---

## Phase 6 — Tests (colocated `__tests__/`, Vitest)

Copy the in-memory-PM-stub harness from
`src/mud/lib/belief/__tests__/persistence.test.ts`
(`vi.spyOn(pm, 'find' | 'save' | 'delete')`, `makeStuffAtPath`).

1. **`src/mud/lib/chronicle/__tests__/ChronicleEntry.test.ts`** — entry
   persistence + owner indexing: save a `ChronicleEntry`,
   `find({ owner })` returns it; field round-trip; `tags`/`who` survive;
   `owner` is the query key.
2. **`src/mud/api/__tests__/chronicle.test.ts`** (or colocated under
   `lib/chronicle/__tests__/`):
   - **mint + recordOnce idempotency:** `record` twice → 2 entries;
     `recordOnce(owner, 'k')` twice → 1 entry; same key different owner →
     2 entries (owner-scoped).
   - **deed prose generation:** `recordDeed` produces a `text`
     containing the ProseApi-rendered line (assert on the rendered
     substring); `when` is stamped from `WorldClockApi.getNow()` (stub
     the clock — confirm the test seam, e.g.
     `WorldClockApi._setNowProviderForTesting`).
   - **tags/who retrievable** via `entriesFor`.
3. **`src/mud/obj/command/charactergen/__tests__/EnrollController.chronicle.test.ts`**
   (or extend the existing enroll test) — claim-seed at enroll: drive
   `commit` with a stubbed aspiration carrying `claimSeeds` →
   `entriesFor(avatar)` has **≥1 claim AND ≥1 founding deed**.
4. **`src/mud/obj/command/charactergen/__tests__/ChronicleController.test.ts`**
   — render partition: seed claims (orders 2, 1) + deeds (whens 200,
   100); drive the controller; assert the emitted scene body orders bio
   → claim order 1 → claim order 2 → deed when 100 → deed when 200,
   **never interleaved**. Reference an existing controller test for the
   drive/assert style (e.g. a `FocusController` / perception-controller
   test).

**Acceptance covered:** the full test bullet list — *entry persistence +
owner indexing; mint + first-time idempotency; claim-seed at enroll; the
`chronicle` render partition; deed prose generation.*

---

## Phase 7 — Docs, slate graduation, indexes

1. **Create `docs/subsystems/chronicle.md`** — document: the dumb
   append-only ledger + dumb-store/smart-consumers framing (cross-ref
   `belief.md`); the `ChronicleEntry` Document shape + `chronicles`
   collection + owner index; deed vs claim **by provenance**; the
   `ChronicleApi` mint seam (`record` / `recordDeed` / `recordOnce`
   first-time keying / `entriesFor` / `seedClaims`); the three
   singularity patterns (event-singular off recognition / category-first
   via key / repeatable); the claim-seed-at-enroll path; the `chronicle`
   verb (partitioned self-view over bio); and the **identity-impact
   authoring gate** with the chronicle-vs-achievements criterion (lift
   the surface-decision prose from the requirements). Mark every readout
   (reputation / alignment / traits / achievements) as **deferred
   consumers**.
2. **Move** `docs/slates/deferred-rpg/chronicle-slate.md` →
   `docs/slates/builds/chronicle-slate.md`.
3. **Update `docs/slates/README.md`:** remove the stale `deferred-rpg`
   entry (near line 194, "deferred until advancement") and add a
   `builds/` index entry framed as **platform identity-substrate**
   (under or adjacent to build #1, *Identity & social perception*, since
   it's the common root the reputation/social slates read). Fix
   cross-references that point at `deferred-rpg/chronicle-slate.md`
   (including the two links in the requirements doc, lines 11 / 255, and
   the reputation-slate's "chronicle root" reference).
4. **Update `CLAUDE.md`:** add the chronicle subsystem line to the
   **Documentation Map** (after `belief.md`), and add `chronicles` to the
   **MongoDB Collections** list (after `beliefs`), mirroring the belief
   entry.

**Acceptance covered:** *a subsystem doc `docs/subsystems/chronicle.md`
documents the ledger…; `chronicle-slate.md` is moved to
`docs/slates/builds/` and the slate index + cross-references are
updated.*

---

## Build order & cross-phase risks

**Order:** Phase 1 (substrate) → Phase 2 (Api; depends on
Entry + Collection) → Phases 3, 4, 5 in parallel once Phase 2 lands (all
depend only on `ChronicleApi`) → Phase 6 tests follow each → Phase 7
docs last. **Within the enroll edits, do 5a + 3c together** — both touch
`EnrollController.commit`.

**Seams to verify against the real code before wiring (don't assume):**
- `MessageApi.Topics` — reuse an apt self-facing topic for the render;
  do not invent one.
- `PersonaMixin` composition on `Avatar` + whether a mixin can carry
  `commandContributions.self` — else fall back to `Avatar` static
  contributions.
- `IntroduceController.execute` sync → async — confirm `_executeOne`
  awaits.
- `WorldClockApi.getNow()` returns `Quantity<'s'>`; store the seconds
  magnitude; confirm the magnitude accessor (`quantities.md`) and the
  clock test seam.
- The claim/deed `text` trust boundary — both author-trusted, so
  `Mml.fromMarkup` is safe; confirm claim seeds come from
  `char-gen.yaml` (not player input).

## Critical files

- `packages/server/src/mud/lib/chronicle/ChronicleEntry.ts` *(new — the
  Document, mirror of `lib/belief/BeliefDocument.ts`)*
- `packages/server/src/mud/api/chronicle.ts` *(new — the gated mint/read
  Api, mirror of `api/belief.ts`)*
- `packages/server/src/backend/PersistenceManager.ts` *(modify —
  `Collections.Chronicles` + `createIndexes` owner index)*
- `packages/server/src/mud/obj/command/charactergen/EnrollController.ts`
  *(modify — claim-seed + founding-deed minters at `commit`; roster type)*
- `packages/server/src/mud/config/char-gen.yaml` *(modify — `claimSeeds`
  per aspiration)*
- `packages/server/src/mud/obj/Avatar.ts` *(modify — first-arrival
  `recordOnce` minter in `enter`)*
- `packages/server/src/mud/obj/command/social/IntroduceController.ts`
  *(modify — first-introduce `recordOnce`; sync → async)*
- `packages/server/src/mud/cmd/charactergen/chronicle.yaml` +
  `obj/command/charactergen/ChronicleController.ts` +
  `seeds/obj/command/charactergen/ChronicleController.yaml` *(new — the
  verb MVC triple)*
- `packages/server/src/mud/lib/character/Persona.ts` *(modify —
  `commandContributions.self` for `chronicle`, pending verification)*
- `docs/subsystems/chronicle.md` *(new)*;
  `docs/slates/deferred-rpg/chronicle-slate.md` →
  `docs/slates/builds/chronicle-slate.md`; `docs/slates/README.md`,
  `CLAUDE.md` *(modify)*

## Acceptance-criteria map (requirements → phase)

| Acceptance criterion | Satisfied in |
|---|---|
| `chronicles` collection, `ChronicleEntry extends Document`, owner-indexed, round-trips | Phase 1 |
| Gated mint records a deed (ProseApi); `record` appends; `recordOnce` idempotent | Phase 2 + tests (6.2) |
| Char-gen seeds claims; fresh char has ≥1 claim AND ≥1 founding deed | Phases 3 + 5a + test (6.3) |
| Three demo minters produce deeds; first-arrival/introduce don't duplicate | Phase 5 + tests (6.2) |
| `chronicle` verb self-view: bio → claims by `order` → deeds by `when`, partitioned | Phase 4 + test (6.4) |
| `tags`/`who` persisted + owner-scoped fetch (no MQL) | Phases 1 + 2 + test (6.2) |
| Subsystem doc `chronicle.md` | Phase 7.1 |
| Slate moved to `builds/`; index + cross-refs updated | Phase 7.2–7.3 |
| Tests: persistence+indexing, mint+idempotency, claim-seed, render partition, prose | Phase 6 |
