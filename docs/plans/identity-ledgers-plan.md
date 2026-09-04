# Identity & its ledgers — implementation plan

**Kind:** refactor/sweep + infra · **Leads from:** kernel
**First consumer:** the Terminus cast (31 rows that already exist), then
the clinic build (`medic-judgment-slate`) and the necropolis (#40).

> ⚠ **This plan is serving as both product and engineering doc.** The
> normal cycle puts a requirements pass first; it is skipped deliberately
> here because the product surface is thin and fully enumerable — *an NPC
> reads as good at their own job; an author can say what a character has
> been through; a guard's crime lands on the watch* — while everything
> else is genuinely code-shaped (which key does which producer read, which
> class composes which mixin). If any of those three sentences is wrong,
> stop and write the requirements doc instead.

**Seeding slates:** [dossier-slate](../slates/builds/dossier-slate.md)
(the diagnosis, the scorecard, the identity rung) ·
[cast-archetype-slate](../slates/builds/cast-archetype-slate.md)
(⭐ read first — role/temperament, the lens-vs-seed split, the
archetype-stamp requirement).

**Absorbs, and closes:** issue **#42** (accountability keys on the wrong
method) · the **#40 blocker** (every corpse shares one identity) · the
`roadmap.md` v1 punch-list corpse item · `cast-archetype-slate`'s
disposition-key defect.

---

## ⭐⭐⭐ Why this is one build and not five

Five threads arrived separately over two days. They are the same question
asked at five sites:

> **What key does this ledger row attribute to?**

| thread | the same question |
|---|---|
| accountability / sandbox (#42) | a harm row keys on `getTemplatePath()`, not identity |
| the corpse (#40) | every corpse shares one identity because nothing stamped one |
| `Extra` vs `Cast` | may many bodies share one row's ledger? |
| the dossier | may an author *write* rows a character never lived? |
| `lint:dispositions` | are the rows we do write even landing? |

Splitting them means touching `getIdentityPath()` and its readers three
separate times, and — worse — #42 must land **before** anything moves
accountability attribution, or that work silently activates a guard that
has never been exercised (§ W1).

---

## Grounding (verified 2026-09-04; refs current at plan time)

### The identity mechanism

- `lib/stuff/Stuff.ts:409` — `getIdentityPath(): string | null` returns
  `#identityPath ?? getTemplatePath()`. **It is an overridable projection
  method, not a field read.**
- `Stuff.ts:~385` — `#identityPath` is the D17 minted-instance axis,
  `null` for ordinary objects, stamped at clone by `asIdentityPath`.
- `Stuff.ts:~497` — `_identityStampOf` is the **raw slot the registry
  indexes on**, existing precisely so a projection cannot file a vessel
  under the identity it projects. ⭐ The guard this build needs already
  exists, written for the sandbox.
- `api/stuff.ts:~437` — the `SingletonMixin` preflight: a class composing
  it allows one live instance per path and **throws** at `clone()`.
- `api/stuff.ts:663` — `create()` calls `#registerAndInit(raw, null, …)`;
  **`null` where `clone()` passes the template path.**

### Who keys on what

| ledger | keys on |
|---|---|
| trait · transcript · access · reactions · channels · subjects | `getIdentityPath()` |
| **accountability** | **`getTemplatePath()`** — the outlier |

- `CombatLogic.ts:~3890` —
  `function durableIdOf(s) { return s.getTemplatePath() ?? ""; }`, under
  the *blame ledger* banner; plus `:1221`, `:1236`, `:3986`, `:4175`.
- `ConditionLogic.ts:809` —
  `victim: host.getTemplatePath() ?? host.stuffId`. **A different
  fallback for the same concept.**

### The sandbox trace (#42)

- `SandboxLogic.ts:338–348` mints the vessel with
  `StuffApi.create(() => new WireBody(playerId, actorSpecies), …)` — no
  template path, no `asIdentityPath`.
- `WireBody.ts:119–122` overrides `getIdentityPath()` → the real Avatar
  path. ✅ works as documented.
- ⇒ `WireBody.getTemplatePath()` is **`null`**, so `durableIdOf` yields
  **`""`** and every in-circle combatant is filed under the empty string.
- `sandbox.md:62` classes `accountability_events` **PASS (mark)** —
  *"Identity-real … what happened to **you** stays yours."* Not
  implemented.
- `sandbox.md:789` — `deriveBlame` ignores circle-marked rows so nobody
  can *"stage a killing and mint a real crime row against a real
  identity."* ⚠⚠ **That filter has never been exercised by a row it could
  match**, because the rows are keyed `""`.

### The corpse (#40)

- `ConditionLogic.ts:515–560` — `mintCorpseFrom` calls
  `StuffApi.clone(TemplatePaths.mortalityCorpse, undefined, { dataOverlay })`
  with **no `asIdentityPath`**. Per-instance facts survive as hydrated
  *fields* (`shortDescription`, `_speciesPath`, `causeOfDeath`,
  `diedAtGameSec`), which is why nothing is broken yet.

### The seeding precedents

- `lib/trait/Dispositioned.ts:64,85` — `ClaimSeed`, `seedTraitClaims`.
- `lib/behavior/Behaved.ts:118,131,178–189` — `dispositions: ClaimSeed[]`
  (persistent, `authorable`), seeded at `postRegister`, **idempotent**
  (skips if any `claim` row exists).
- `chronicle.md:44,58,84,88` — `kind: 'deed' | 'claim'`; a claim forces
  `when = null` and keeps `order`; `recordClaim`, `seedChronicleClaims`.
- ⚠ `lib/npc/tree.ts:376` — **a disposition-key validator already
  exists**, for dialogue trees (`DISPOSITION_AXES.some(a => a.key ===
  key)`). It is simply not on the seeding path. The gate in W0 is
  therefore a *move*, not an invention.

### The corpus

- **42 agent rows; 25 carry a proper `name:`.** Of the 17 that do not,
  the shortDescriptions split on the article: *"**a** sentry / **a**
  sellsword / **a** hewer on tutwork"* vs *"**the** collier / **the**
  smelterman / **the** onsetter / **the** storekeeper / **the** ore
  buyer / **the** claims recorder"*.
- **Every NPC row is instanced exactly once today.** Individual identity
  therefore holds *by accident*, enforced by nothing.
- `SingletonMixin` is composed by `Condition`, `Material`, `Clade`,
  `LocomotionMode`, `CombatFormation` — **and no agent class.**
- `platform/agent/NPC.ts` is `export default class NPC extends NpcBase {}`
  over the `lib/npc/NPC` substrate that five named characters extend.

### The materialized trap

- `renown.md:253` / `participation.md:200` / `influence.md:333` — the
  same warning three times: `renownOf` reads `RenownStanding.cached()`,
  warmed from the **`renown` collection**, not `renown_events`. Seeding
  the log is a no-op until a fold. `RenownLogic.ts:398` (`recomputedAt`)
  is the fold, on a real-time cadence.
- `advancement.md:236` — *"there is currently no way to state that Dave
  is good at bartending."*

---

## Plan-level decisions

**D1 — the dossier is a BLOCK ON THE ROW, not a `DocumentKinds` entry.**
The relationship is 1:1 with a row; `dispositions:` is the shipped
precedent for exactly this; and cast-archetype's deed-row hazard applies
identically either way, so separation buys no safety. Player dossiers stay
with char-gen. *Revisit only if a dossier must be edited independently of
its row (a CMS surface).* → slate Q1 closed.

**D2 — the materialized trio gets SEED-AND-FOLD, not a rewrite.** Seeding
triggers a recompute. Making `renownOf` derive from its log like
`transcripts` does is the honest fix and is **not this build's** — the
boot-warmed map exists for a performance reason nobody has restated, and
taking that on would double the build. ⚠ But `lint:dossiers` (W6) must
cover the trio, so the trap cannot silently recur. → slate Q2 closed;
deferred seam recorded.

**D3 — a seeded illness is a THIRD SHAPE and is out of scope.** A claim
forces `when = null`; an affliction's `symptomsAt` is exactly a *when*. So
a seeded condition is neither a deed nor timeless backstory but *an
asserted event with an asserted time*. Named here so the clinic can plan
against it; **built by the clinic**, not here. → slate Q3 closed by
scoping.

**D4 — competence claims are SEEDED, not a declared floor.** Advancement
names this fork and could not settle it (*"which differ on whether
`bandOf` stays a pure derivation"*). The chronicle/trait precedent already
answered it: seed evidence, mark it `claim`, and the derivation stays
pure. A floor felt necessary only because nobody had the claim marker in
view.

**D5 — `Extra` and `Cast` are two concrete classes; `platform/agent/NPC`
retires into them.** CLAUDE.md's twin rule says sharing the base's name is
the default and *"a twin that renames is claiming to be a different thing,
and had better be one"* — here there are two different things, and `NPC`
predicts neither surface. Both extend the `lib/npc/NPC` substrate, which
is untouched.

**D6 — promotion is an authoring act.** Identity is a stamp;
`setTemplatePath` re-keys the registry index. Promoting an extra means
authoring a `Cast` row. No runtime transition exists to build.

**D7 — institution is a SECOND DERIVED ATTRIBUTION, and it applies to
`Cast` and `Extra` alike.**

⚠ *Supersedes the earlier "an `Extra` projects its institution through
`getIdentityPath()`" — that was wrong twice over: it overloaded an
identity method with a policy meaning, and it made "who do you act for" an
Extra-only concept when it is the whole of the office model.*

The ledger already models this and already derives it:

> `AccountabilityEvent.directedBy` — *"Durable id of the party bearing
> **command responsibility** … **Derived, never stamped**: a crime row
> carrying `directedBy` names the commander alongside the striker
> (credit/blame divergence)."* `deriveBlame` surfaces it on a crime
> verdict.

Fed by combat formations today; the concept is exactly *who else answers
for this act*. So:

| | attributions on a harm row |
|---|---|
| **`Cast`** | **two, both real** — the person AND the institution. Odile's bad ruling is Odile's act and the Registry's failure, which is how offices work and what *"check offices, never the founder"* wants |
| **`Extra`** | **one** — the institution only, because there is no person to name |

⭐ The correct statement is not *"an Extra has an institution"* but **"an
Extra has no identity of its own, so its institutional attribution is the
only one it has."** Same field on both classes; different arity.

⚠ `directedBy` is command responsibility *for the actor*. The victim side
needs the mirror. Generalize the pair rather than inventing a third
concept — the shape is shipped, the coverage is not.

**D7a — the institution RESOLVES; it is not usually authored.** A
three-tier chain in the shape this codebase uses everywhere
(`LocomotionApi.defaultModeFor`, the biome outward walk, the address
longest-prefix):

1. an authored `institution:` field — explicit wins;
2. else **the employer**, off the shipped `Business` roster (⭐ the
   archetype slate's own finding: *"the position itself is authored on the
   Business roster"*, so employed NPCs need no new field at all);
3. else **`ParcelApi.ownerOf(<declared home>)`** — longest-prefix over the
   parcel registry, returning a `ParcelOwner` that dispatches on
   group / player / **organization**. The same call `AccessApi` already
   makes to answer *"who does this ground answer to"*;
4. else `null`.

⭐ Tiers 2 and 3 are derivations over shipped data, so **most rows carry
nothing new** — the ordinary-case-with-no-code test passing.

⚠⚠ **Resolve from the DECLARED HOME, never the current location.** A guard
who walks into a tavern does not become the tavern's. This is the one way
to get the chain obviously wrong.

**D7b — a sentient `Extra` that resolves to no institution is a BUILD
ERROR.** The crime rule is terms-free `!consented && sentient`, and
`AccountabilityEvent.sentient` already exists to draw the cull/crime line.
So if hurting something is a crime, the victim must be *someone*: either
`Cast`, or institutionally answerable.

⭐ **The shipped sentry is exactly this case**, and its own header
documents the behaviour at risk — *"a player who ambushes the sentry under
lethal terms gets the imposed-terms crime marker."* It has no name, no
employer, and stands on untitled ground, so it resolves to `null` and its
crimes would vanish. It works today only because there is exactly one
sentry, so the shared row *is* an individual — the accident this build
exists to stop relying on.

The lint does not paper over that. It narrows the question from *"why did
my crime vanish"* to **"who fields this picket?"** — answerable by an
author, and the answer (the watch should exist) improves the world instead
of silencing an error. A wolf is fine forever: `sentient: false`, and
nobody is to blame for a wolf.

---

## ⭐⭐ Host placement

The largest source of post-MR rewrites in this repo. Decided here.

| what | host | why |
|---|---|---|
| the institution **resolve** (D7a's three tiers) | **`lib/npc/NPC` substrate** — both classes need it | it is not an Extra concept; Cast attributes to its institution too, alongside itself |
| the optional authored `institution:` override | same host — an **identity path-string**, not a live ref | must survive reclone and must not keep a business resident; see `ref-shapes.md` before writing `fieldMeta` |
| the second attribution on the row | **`AccountabilityEvent`** — generalize `directedBy` + its victim-side mirror | ⭐ derived-never-stamped already, and `deriveBlame` already surfaces it |
| `SingletonMixin` | **`Cast`** | `Cast = SingletonMixin(NPC-substrate)`; the throw at second clone *is* the enforcement |
| `dispositions: ClaimSeed[]` | **stays on `BehavedMixin`** | ⚠ do not move it. Both Extra and Cast have brains, and an Extra's archetype resolves as a *lens* from the same declared data — the field is right where it is |
| the rest of the dossier (prologue · competence · standing) | **`Cast`** | the claim is true of exactly `Cast`; a mixin would need a host set of one. ⚠ Not `BehavedMixin` — that would put it on every Extra |
| corpse identity scheme | **`ConditionLogic.mintCorpseFrom`** | one call site, no new surface |
| the durable-id read | **`CombatLogic.durableIdOf` + `ConditionLogic`** | one shared helper after W1, not two fallbacks |

⚠ **Not a mixin, deliberately.** `DossieredMixin` would have a host set of
exactly one class — the [mixin-on-the-wrong-host] tell in reverse.
Revisit only if D-follow-on gives businesses dossiers.

---

## Stage A — make identity correct

Independently landable and independently valuable: it closes two issues
and a punch-list item with no dossier existing.

### W0 — `lint:dispositions` and the content renames

The axes themselves already landed on this branch (`candor` Candid/Guarded,
`warmth` Warm/Aloof; 17 → 19 with the count fixed in all five places that
assert it).

1. `pnpm lint:dispositions` — every `disposition:` key in shipped content
   resolves to `DISPOSITION_KEYS`. ⭐ Move the check from `lib/npc/tree.ts`
   rather than writing a second one.
2. Rename in content: `greed: N` → `generosity: -N` (Halloran);
   `gregariousness: N` → `sociability: N` (Pemby).
3. ⚠ **Prove the gate fails before trusting it** — the metal-chain lesson.
   Break a row deliberately, watch it fail, restore.

**Acceptance:** the five previously-dropped authored traits are live; the
gate refuses a sixth.

### W1 — accountability keys on identity (#42)

⚠⚠ **This wave gates W3 and must not be reordered.**

1. Both producers read `getIdentityPath()`. One shared helper; delete the
   second fallback.
2. **Remove `?? ""`.** An unresolvable durable id is a bug at the call
   site, not a row keyed on the empty string. Throw or skip loudly.
3. Fix `durableIdOf`'s docstring — it calls `templatePath` *"the
   renown/provenance key"*, and `getIdentityPath()`'s own docstring lists
   renown among the **identity**-keyed producers. That wrong comment is
   plausibly how the divergence survived review.
4. ⭐⭐ **The test that matters:** stage a real in-circle killing and
   assert no crime derives against the real identity. `deriveBlame`'s
   circle filter has **never been exercised by a row it could match** —
   this change is what makes it load-bearing, so it must be proven in the
   same commit.

**Acceptance:** an in-circle harm files under the player's real identity
**and** derives no blame; `blameFor("")` is unreachable.

### W2 — corpse identity (#40's blocker)

1. `mintCorpseFrom` passes `asIdentityPath` — `OuterWarren`'s
   scheme-derived pattern (`${parentExtent}/${nodeId}`).
2. ⚠ **The scheme must survive two things**: `reembody` (one person can
   leave several corpses) and an `Extra`'s shared deceased key (two dead
   sentries). **Key on the deceased *and the moment*** — and pick the
   raw stamp over the projection for the deceased half, so the watch's
   dead do not all key under the watch.
   Suggested: `${corpseRoot}/${sanitised(deceasedKey)}/${diedAtGameSec}`,
   with a disambiguator if two die in one game-second.

**Acceptance:** two corpses of the same species from the same room have
different identity paths; a reembodied player's two corpses do too.
**Unblocks #40.**

### W3 — `Extra` / `Cast`

1. `platform/agent/Extra.ts` and `platform/agent/Cast.ts` over the
   `lib/npc/NPC` substrate; `platform/agent/NPC.ts` retires (D5).
2. `Cast = SingletonMixin(…)`; `Extra` carries the institution pointer and
   the `getIdentityPath()` projection (D7).
3. **Classify the 42 rows** by the article rule — 25 named + 6
   definite-article individuals → `Cast`; the indefinite role-fillers →
   `Extra`. Small enough to do by hand and to review.
4. The institution resolve (D7a) on the substrate, and the second
   attribution on the harm row (D7).
5. `pnpm lint:identity` — a dossier on an `Extra` is an error; a `Cast`
   row is a singleton; a proper `name:` on an `Extra` is an error; ⭐ and
   **a sentient `Extra` resolving to no institution is an error** (D7b).
6. ⚠ Expect W3 to surface **content gaps rather than code bugs** — the
   sentry is the known one, and the fix there is authoring the watch, not
   weakening the lint.

**Acceptance (behavioural):** killing a sentry shows up as a harm to the
watch; Odile's act shows up as **both** hers and the Registry's; a wolf's
mauling attributes to nobody and raises nothing.

---

## Stage B — make identity authorable

### W4 — the seed spine

Generalize `dispositions`' applier: idempotent, `postRegister`,
`claim`-marked, and ⭐⭐ **archetype-stamped**. *"Stamp the minting
archetype on the row. It costs one field now and is unrecoverable
later"* — `deviation = current derived − archetype baseline` is
uncomputable without it, and provenance separability cannot be
retrofitted.

### W5 — competence claims

D4, with Dave as the first consumer.
**Acceptance:** a player who asks reads Dave as good at bartending.

### W6 — `lint:dossiers` + the trio's fold

Assert-vs-derive: seed what the dossier `asserting:` says and check the
derived band agrees. ⭐ This is the only thing that stops a dossier
drifting back into a stat sheet, because a declared value cannot disagree
with itself and a seeded history can. Census-then-ratchet: gate today's
count as the ceiling. ⚠ **Must cover the materialized trio** (D2), so the
S1 drive's silent failure becomes a build error.

---

## Reachability wiring

| link | this build |
|---|---|
| **verb** | none new. `assess`/`chronicle`/`competence` already render what the seeds produce |
| **affordance** | none new |
| **data** | ⚠ the dossier blocks themselves — a `Cast` with no dossier reads exactly as it does today, which is the failure mode to watch |
| **boot** | ⚠⚠ **the seeding runs at `postRegister`, so nothing needs warming** — but confirm against `ConditionCatalogue`'s lesson before assuming. The reference-Idea trap has fired **four** times |

---

## Risks & opens

1. ⚠⚠ **W1's blast radius is bigger than its diff.** Seven call sites,
   but they are the blame ledger. If in-circle harms currently vanish into
   `""` and start landing on real identities, `deriveBlame`'s filter is
   the only thing between that and a real crime row. **Do not split W1's
   test into a later wave.**
2. ⚠ **`getIdentityPath() ?? somethingElse` readers.** Reactions, channels
   and subjects fall back to `''` or an `ownerId`. Those were written for
   *"no identity yet"*, not *"deliberately none"*. ⭐ D7's reframing
   **removes most of this risk** — an `Extra` keeps its own identity and
   the institution rides a second attribution, so nothing starts returning
   `null` that did not before. Audit the readers anyway in W3, but the
   blast radius is now the empty-string sink (W1), not the projection.
5. ⚠⚠ **W3 will surface content gaps, not code bugs**, and the temptation
   will be to weaken `lint:identity` rather than author the missing
   institution. The sentry is the known instance; expect one or two more.
   **Authoring the watch is the fix.**
3. **Sizing.** Stage A alone is a respectable build; A+B is at the upper
   end of the measured band. Stage B can ship separately if A runs long —
   the seam is clean, because A is correctness and B is authoring.
4. **Open, and deliberately not closed here:** whether businesses and
   organizations get dossiers (→ slate Q4).

---

## Deferred seams

- **Make the materialized trio derive** rather than fold (D2). →
  `renown.md` / `participation.md` / `influence.md`.
- **A seeded illness with an asserted time** (D3). → the clinic build.
- **Dossiers for businesses / organizations.** → dossier-slate Q4.
- **Retro-fitting histories onto the existing 41 characters.** Substrate
  here; the authoring is a content pass.

---

## Critical files

`lib/stuff/Stuff.ts` · `api/stuff.ts` · `platform/agent/{NPC,Cast,Extra}.ts` ·
`platform/agent/sandbox/WireBody.ts` · `platform/idea/api/{CombatLogic,ConditionLogic,SandboxLogic,RenownLogic}.ts` ·
`lib/trait/{Disposition,Dispositioned}.ts` · `lib/behavior/Behaved.ts` ·
`lib/npc/tree.ts` · `lib/stuff/Singleton.ts` · the 42 rows under
`packages/content/*/content/**/agent/`.

## Drive record

*(appended at build time — the exit criterion.)*
