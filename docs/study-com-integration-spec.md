# Study.com integration — technical spec

> **Status: design/sketch, aspirational.** The concrete interface layer
> behind [study-com-integration.md](./study-com-integration.md) §§6-7.
> That doc is the *design and response*; this one is *the actual
> seams* — wire schemas as types, the core append primitive, the
> proprietary-adapter interfaces, the trust boundary, and the phasing.
>
> **Verify-before-coding rail.** Every signature below is designed
> against the source-of-truth *docs*
> ([advancement.md](./subsystems/advancement.md),
> [credential.md](./subsystems/credential.md),
> [chronicle.md](./subsystems/chronicle.md),
> [architecture.md](./architecture.md)), which "describe intent and may
> lead or lag the code." Confirm names/shapes against the real
> `lib/advancement/`, `mud/api/`, and `backend/` TypeScript before
> implementing. Nothing here has touched a live study.com environment.

---

> **⚠️ Verified corrections — read
> [study-com-platform-reality.md](./study-com-platform-reality.md) first
> (2026-08-03).** The **ISCED-F reverse index (§3.1) does not apply** —
> Study has no ISCED-F/CIP code. Replace it with an **authored crosswalk
> resolver** from Saxonberg `Discipline` → Study `Concept` (CX) /
> `ExamTaxonomyNode` (test prep) ids, living in the proprietary adapter
> (§4.3). The `iscedf` field in the wire schema (§2) is Saxonberg-internal,
> not a Study join key; `Concept.dbpedia_subject_id` is the only external
> anchor. The rest (recordClaim, provenance-as-tags, phasing, trust
> boundary) still holds. Reality doc wins on any conflict.

## 1. What this spec adds, and where each piece lives

Two rules from [architecture.md](./architecture.md) govern placement, and
they draw the vertical-agnostic / proprietary line for free:

- **The import boundary** — nothing under `src/mud/` imports outside the
  tree; only the Api tier imports and wraps (CLAUDE.md "The import
  boundary"). So **anything that talks to study.com over the network is
  `backend/`, not mudlib.**
- **The `callable == visible == cared-about` invariant** — the mudlib
  exposes capability only through gated `*Api` statics.

Result: the study.com adapters are **backend** modules that reach the
mudlib **only** through the gated `AdvancementApi` (a sanctioned
backend→mudlib DI seam, CLAUDE.md "Export discipline"). The mudlib gains
a small vertical-agnostic surface; nothing study.com-specific enters it.

```
                        VERTICAL-AGNOSTIC (mudlib, licensable)
  packages/server/src/mud/
    api/advancement.ts          + recordClaim(...)         §3.2
    obj/api/AdvancementLogic.ts  ↳ claim append + refresh
    obj/DisciplineCatalogue.ts  + byIscedf() reverse index §3.1
    lib/advancement/…            provenance tag weighting   §3.4

  ──────────────────  gated AdvancementApi (DI seam)  ──────────────────

                        PROPRIETARY (backend, one per partner)
  packages/server/src/backend/education/
    LearningEventIngest.ts      study event → recordClaim   §4.1
    CompetencyFeedExport.ts     bands → study adaptive in    §4.2  (+ adaptive-feed.md)
    CourseDisciplineMap.ts      the fiction/course mapping   §4.3
    ItemInstanceRenderer.ts     generator IR → study item    §4.4
    learnerIdentity.ts          external learnerRef ↔ owner  §5
```

A second ed-tech partner is a second `backend/education/<partner>/`
folder against the same mudlib surface and the same two wire schemas
(§2). The mudlib never changes.

---

## 2. The two wire schemas

One inbound, one outbound, both partner-neutral. These are the entire
contract between the proprietary layer and the outside world; the mudlib
sees only their *decoded* effects.

```typescript
// ── INBOUND: study.com → game ───────────────────────────────────────
// Emitted by the partner adapter after decoding a study.com event.
interface LearningEvent {
  v: 1;                                  // schema version (additive-only)
  learnerRef: string;                    // external learner id (see §5)
  courseRef: string;                     // partner course id
  objectiveRef?: string;                 // objective / taxonomy node id
  iscedf: string[];                      // ISCED-F code(s) — THE join column
  kind:
    | "course.completed"
    | "exam.passed"
    | "chapter.mastered"
    | "objective.demonstrated";
  outcome: { pass: boolean; score?: number; scale?: [number, number] };
  provenance: Provenance;                // §3.4
  occurredAt: string;                    // ISO 8601, source time
  idempotencyKey: string;                // stable per real-world event (§6)
}

// ── OUTBOUND: game → study ──────────────────────────────────────────
// Consumed by the partner's adaptive engine. Detail in adaptive-feed.md.
interface CompetencySignal {
  v: 1;
  learnerRef: string;
  iscedf: string;                        // or the partner taxonomy node
  band: CompetenceBand;                  // NEVER the raw theta (§3.3 firewall)
  missedMisconceptions: string[];        // named-distractor tags (diagnostic)
  provenance: "deed" | "claim";          // where the evidence came from
  observedAt: string;
}

type CompetenceBand =
  | "untrained" | "novice" | "competent" | "proficient" | "expert";
```

**Versioning:** `v` is additive-only; adding a field is not a version
bump, removing/retyping one is. The adapters own translation to/from each
partner's real payloads — the mudlib only ever sees the decoded call.

---

## 3. Core additions (vertical-agnostic, mudlib)

### 3.1 ISCED-F reverse index on the Discipline catalogue

The catalogue is keyed by discipline `key` and each descriptor carries an
`iscedf` code (advancement.md:44-53, 64-69). The join in
[study-com-integration.md](./study-com-integration.md) §6.1 needs the
**reverse**: code → discipline key(s).

```typescript
class DisciplineCatalogue {
  // existing: descriptorFor(key): DisciplineDescriptor
  byIscedf(code: string): string[];   // NEW: discipline keys at this code
}
```

- Built once in `postRegister` beside the existing `Map<key,descriptor>`
  warm (advancement.md:64-69) — a `Map<iscedf, key[]>` folded from the
  same descendant scan. Pure derived index, zero new persistence.
- **Prefix semantics:** ISCED-F is hierarchical (`0533` Physics ⊂ `053`
  Physical sciences). `byIscedf` should resolve **exact first, then
  broaden to the parent code** if no exact match, so a course tagged
  `0531` still lands somewhere sane. Broadening is a config choice per
  §4.3, not hardcoded.
- `''` (no anchor, e.g. conditioning disciplines) is never a match
  target — those Disciplines are unreachable from external coursework by
  design, which is correct (you can't study your way to reflexes).

### 3.2 `AdvancementApi.recordClaim` — the academy faucet's producer

`claim` is documented as "the academy faucet … no consumer mints claims
this increment" (advancement.md:86-87), and the append primitives
`recordSignature`/`recordDeed` already exist (advancement.md:184-185). A
claim is **not** an `ActSignature` (that's the authored decomposition of
an in-*world* act, advancement.md:96-101), so it wants its own seam:

```typescript
interface ClaimSubcheck {
  discipline: string;        // discipline key (resolved via byIscedf, §3.1)
  difficulty: number;        // from the assessment's own difficulty
  outcome: "pass" | "fail" | number;   // pass/fail or a normalized score
}

interface ClaimOpts {
  provenance: Provenance;    // → written into tags (§3.4)
  onceKey?: string;          // idempotency (§6); the LearningEvent.idempotencyKey
  source?: string;           // attribution ('study.com'); default catalogue
  occurredAt?: string;       // source time, for the ledger `when`
}

class AdvancementApi {
  // NEW — append N `claim` TranscriptEntry rows sharing one timestamp,
  // then chain refreshConferrals exactly like recordSignature does.
  static recordClaim(
    owner: OwnerRef,
    subchecks: ClaimSubcheck[],
    opts: ClaimOpts,
  ): void;
}
```

Semantics, all inherited from the existing spine:

- Appends `{owner, kind:'claim', when, discipline, difficulty, outcome,
  tags}` rows (advancement.md:79-80), `tags` carrying provenance (§3.4).
- **Chains the conferral refresh** off the append, same as
  `recordSignature` (advancement.md:157-169): band may cross →
  `AdvancementMixin.refreshConferrals` → verbs reconciled. **No new
  gating code** — the external claim lights up verbs through the exact
  path an in-world deed uses.
- **Guardrail (load-bearing):** a claim is *weighted evidence, it does
  not set a band* (college-slate.md:701-703). `difficulty` +
  `provenance` weight determine how much the BKT estimator moves; an
  identity-verified final is strong, an unverified quiz weak. An external
  feed therefore **cannot mint capability by fiat** — evidence must
  convince the estimator, which is what keeps "real money never buys
  advantage" true (money → content → evidence → estimator).

### 3.3 The theta firewall stays intact

The estimator's internal `theta` never crosses the Api boundary; only the
band does (advancement.md:141-148). `recordClaim` writes **evidence**, not
a score; `CompetencySignal` (§2) emits **bands**, not theta. The firewall
holds in both directions — this is the "no quantity without a referent"
rule, and it's what makes the outbound feed (adaptive-feed.md) safe to
send to a third party.

### 3.4 Provenance as a tag vocabulary + estimator weighting

No credential kind carries assessment conditions (`payment|travel|key`
only, credential.md:34), so provenance rides **`tags` on the claim row**
(the open-vocabulary extension point, advancement.md:80, chronicle.md:20)
— recommended over a new credential kind in
[study-com-integration.md](./study-com-integration.md) §6.4.

```typescript
type Provenance =
  | "identity-verified"   // study.com final: TypingDNA + Veriff
  | "proctored"           // legacy / opt-in higher-rigor tier (reserved)
  | "unverified"          // un-verified quiz/chapter test
  | "self-report";        // asserted completion, lowest weight

// tags written onto the claim row:  ["study.com", "prov:identity-verified", ...]
```

The estimator reads `prov:*` to set evidence weight. The weight table is
a **calibration constant set, deferred** like the rest of the BKT params
(advancement.md:139) — ship ordinal ordering
(`identity-verified > proctored ≈ … > unverified > self-report`), tune
numbers against a running game. `deed` (engine-witnessed) outranks any
`claim` provenance by construction — the coarse split is already there.

### 3.5 Login-time conferral restore

Externally-granted verbs must survive a relog; the login-time
`refreshConferrals` is explicitly deferred (advancement.md:271-273). It's
small but on the critical path for the deed-moment feeling durable: on
session establish, for an owner with the Advancement mixin, run
`refreshConferrals` once so bands earned from claims re-confer their
verbs. No new state — evidence already persists; this just re-derives.

---

## 4. Proprietary adapter interfaces (backend, one per partner)

None of these are in the mudlib. They are ordinary backend modules
(hard-private `#` by the mediator-layer convention, CLAUDE.md "Member
Privacy") that call the gated `AdvancementApi`.

### 4.1 Inbound: `LearningEventIngest`

```typescript
interface InboundAdapter {
  // decode a raw partner payload (webhook body / warehouse row) → events
  decode(raw: unknown): LearningEvent[];
  // apply one decoded event to the game
  apply(ev: LearningEvent): Promise<void>;
}
```

`apply` is the pipeline:

1. `owner = learnerIdentity.resolve(ev.learnerRef)` (§5); drop if unmapped.
2. For each `code` in `ev.iscedf`: `keys =
   CourseDisciplineMap.resolve(ev, DisciplineCatalogue.byIscedf(code))`
   (§4.3) — the map may narrow/override the raw ISCED-F hit.
3. Build `ClaimSubcheck[]` from `keys` × `ev.outcome`/difficulty.
4. `AdvancementApi.recordClaim(owner, subchecks, {provenance:
   ev.provenance, onceKey: ev.idempotencyKey, source: partnerId,
   occurredAt: ev.occurredAt})`.

Two deployment shapes behind the same `decode`/`apply` (§7): a
**warehouse poller** (pilot) and a **pub/sub subscriber** (productized).

### 4.2 Outbound: `CompetencyFeedExport`

```typescript
interface OutboundAdapter {
  // pull current bands + misconception tags for a cohort and push to the
  // partner's adaptive-engine intake in its format.
  exportFor(learnerRefs: string[]): Promise<void>;
}
```

Reads `AdvancementApi.bandsFor(owner)` (advancement.md:188) + accumulated
missed-misconception tags, builds `CompetencySignal[]`, translates to the
partner's adaptive input. **Full design in
[study-com-adaptive-feed.md](./study-com-adaptive-feed.md).** Batch grain
is fine — personalization is not real-time.

### 4.3 `CourseDisciplineMap` — where the fiction lives

The two mapping regimes (integration doc §6.1) are both this one object:

```typescript
interface CourseDisciplineMap {
  // Given a decoded event and the raw ISCED-F candidates from the core,
  // return the discipline keys this partner wants credited — and how.
  resolve(ev: LearningEvent, iscedfCandidates: string[]): ClaimTarget[];
}
interface ClaimTarget { discipline: string; weightHint?: number; }
```

- **Generic academic transfer** (vertical-agnostic): default impl returns
  `iscedfCandidates` verbatim — a real thermodynamics course credits the
  real-thermodynamics Discipline. Zero fiction knowledge.
- **Fiction-bound** (proprietary): the Magic 101 table
  ([magic-101-course.md](./magic-101-course.md) mapping section) overrides
  — `courseRef == 'THAUM101'`, `objectiveRef == 'THAUM101.LO.3.*'` →
  the magic-grid delivery-efficiency Discipline, etc. **The real
  magic-grid Discipline keys are owned by the Saxonberg side**
  (advancement.md:241-252) — confirm them before wiring.

The core never learns what "magic" is; swapping this table repoints the
same machinery at Compact 200 or a real physics catalog.

### 4.4 `ItemInstanceRenderer` — generator IR → study.com item

The generator stays game-side and emits an IR
(college-slate.md:321-327); this renderer is the adapter to study.com's
item-instance shape (integration doc §2.1-2.3):

```typescript
interface ItemInstanceRenderer {
  render(iiIR: GeneratedItem): StudyComItemInstance;   // MCQ instance
  renderPractical(iiIR: GeneratedItem): StudyComPractical;
}
```

Emit the **named-distractor** as the per-option rationale (integration doc
§2.2) — you hand study.com richer distractor metadata than its own bank
carries, and it doubles as the misconception source for §4.2. A late/changed
study.com item schema costs *one adapter edit*, not a generator rewrite.

---

## 5. Learner identity mapping

`learnerRef` (external) ↔ game `owner` (durable character `templatePath`,
advancement.md:88) is a **backend** join table, populated at account link
time (an explicit, consented opt-in — see privacy note below). Rules:

- Unmapped `learnerRef` → **drop the event** (log, don't guess). An
  unmatched external id must never fan out to a random owner.
- One learner may map to one game account; a game account without a link
  simply receives no claims — the no-academic-intent player
  (advancement.md:22-27) is unaffected.
- The mapping is the **only** PII crossing the seam, and it lives
  backend-side, never in the mudlib and never in a wire schema beyond the
  opaque `learnerRef`.

---

## 6. Delivery & idempotency

External feeds are at-least-once (a redelivered warehouse export, a
retried webhook). Pair `LearningEvent.idempotencyKey` with the
chronicle's idempotent seam:

- `recordClaim` passes `opts.onceKey` down to a `recordOnce(owner, key,
  …)`-style guard (chronicle.md:93, 111-120) so a redelivered event does
  **not** double-bank a claim.
- Choose `idempotencyKey` stable per *real-world* event
  (`learner:course:exam:attempt`), not per delivery, so retries collapse
  and legitimate retakes (a new attempt) do not.

---

## 7. Phasing (from the strategy-doc interview: instrumentation exists,
distribution doesn't)

| Phase | Inbound shape | Latency | What it proves |
|---|---|---|---|
| **Pilot** | scheduled **warehouse export** for a flagged cohort → `decode`/`apply` | daily-ish (batch) | the loop is real; claim tier tolerates batch |
| **Product** | thin **pub/sub relay** on study.com's existing event stream | near-real-time | the **deed-tier moment** — pass the final, walk in, the conferral fires while it still feels like consequence |

Same `InboundAdapter` interface behind both; only the transport differs.
The outbound adaptive feed (§4.2) stays batch throughout.

---

## 8. Trust boundary & security

- **The inbound feed is untrusted input.** It cannot mint capability
  directly — it appends *weighted evidence* the estimator must be
  convinced by (§3.2 guardrail). The worst a forged event can do is bank
  claim evidence for one mapped learner; provenance weighting means an
  unverified/self-report claim moves a band negligibly.
- **Authenticate the feed at the backend edge** (partner-signed
  webhooks / authenticated warehouse pull) — a §4.1 concern, outside the
  mudlib entirely.
- **Import boundary respected:** all network I/O is `backend/`; the
  mudlib is reached only via gated `AdvancementApi` (§1). The adapters
  cannot import mudlib internals — they ask the surface, matching the
  "mudlib code cannot import a capability" rule (CLAUDE.md).
- **Privacy:** account linking is an explicit learner opt-in; only
  `learnerRef` crosses inbound. The **outbound** feed sends in-game
  behavior to a third party and therefore needs its own consent gate and
  a tight payload (bands + misconception tags, no free-form behavior) —
  detailed in [study-com-adaptive-feed.md](./study-com-adaptive-feed.md).

---

## 9. Open questions (spec-level)

- **`recordClaim` vs `recordSignature(kind:'claim')`** — a dedicated
  method (spec'd here) reads cleaner and keeps the ActSignature type
  honest (a claim isn't a world-act decomposition). Confirm against the
  real `AdvancementLogic` before choosing.
- **ISCED-F broadening policy** (§3.1) — exact-then-parent is a
  reasonable default; whether to broaden at all, and how far, is a §4.3
  per-partner config call.
- **Provenance weight constants** (§3.4) — ordinal ordering ships;
  numeric calibration is deferred with the rest of the BKT params
  (advancement.md:139).
- **Retake semantics** — does a second passed final *add* evidence or
  *replace* it? Lean add (the Transcript is append-only, "what happened";
  the estimator handles staleness), but confirm the estimator treats
  repeated near-identical claims sanely rather than as grind
  (advancement.md's information-weighting should, but verify).
- **Does the adaptive engine accept an inbound signal at all?** — the
  gate on §4.2 / the whole reciprocal doc (integration doc §9, this is
  the single highest-value [confirm]).
