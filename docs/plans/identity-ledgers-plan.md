# Identity & its ledgers — implementation plan

**Kind:** refactor/sweep + infra · **Leads from:** kernel
**First consumer:** the shipped cast (39 characters that already exist), then
the clinic build (`medic-judgment-slate`) and the necropolis (#40).

**Requirements:**
[identity-ledgers-requirements](../requirements/identity-ledgers-requirements.md)
— the product doc, and **the drive script lives there.**

> ⚠ An earlier revision of this plan stood in for the requirements doc on
> the grounds that the product surface was "thin and fully enumerable".
> That judgment did not survive the design conversation: the build grew a
> fiction rule (a lawful duel still costs the watch a guard), a content
> mandate (the watch must exist), and a taxonomy decision over 42 written
> characters. The requirements pass then found **two missing surfaces this
> plan did not contain** (§ W3, W5) — which is the argument for not
> skipping it, made by the skip.

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

- **39 characters; 26 carry a proper `name:`.**
  ⚠⚠ **Census it by BRAIN, never by path.** An earlier count said "42
  agent rows, 25 named" from `find -path '*agent*'`. That used a *path* as
  a proxy for a *kind* and was wrong in both directions: it swept in four
  non-characters (a corpse, a hog carcass, a key ring, a char-gen seed)
  and **missed Odile**, whose row is `terminus/registry/clerk.yaml` with
  no `agent/` segment. The honest discriminator is `behaviors:` — 39 rows
  have a brain, and exactly one of them lives outside an `agent/` path. Of the 17 that do not,
  the shortDescriptions split on the article: *"**a** sentry / **a**
  sellsword / **a** hewer on tutwork"* vs *"**the** collier / **the**
  smelterman / **the** onsetter / **the** storekeeper / **the** ore
  buyer / **the** claims recorder"*.
- **Every NPC row is instanced exactly once today.** Individual identity
  therefore holds *by accident*, enforced by nothing.
  ⚠ **Verify it the right way**, because two obvious checks give the wrong
  answer: several agent paths appear 2–3 times across content (a `cast:`
  entry *plus* an employment-roster reference in a `business.yaml`), and
  filtering on `class: /platform/location/` misses rooms with
  content-defined location classes (the lounge bar). The honest
  discriminator is the **list item** — `- /…/agent/x` instantiates,
  `key: /…/agent/x` refers. On that test: **40 distinct agent paths, each
  appearing exactly once.**
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

**D2 — RENOWN is seedable; PARTICIPATION and STANDING are not.**

⚠ *Revised twice. First form said "seed-and-fold the trio" (too much);
second said "cut the trio entirely, seeding renown is a doctrine
violation" (too little, and the doctrine argument was wrong). This is the
settled form.*

⭐ **The vocabulary, exactly, because conflating it caused both errors.**
`ConsumerLogic.standingOfImpl` is literally:

```
standing = max(0, renownOf) × participationOf
```

| | is | for an NPC |
|---|---|---|
| **renown** | the **quality** half — measured reputation, per scope | ✅ **seedable** |
| **participation** | the **quantity** half — engagement over time | ❌ never written |
| **standing** | their **product** — the Compact's influence stock | ❌ falls out at zero |

⭐⭐⭐ **So the Compact stays players-only by ARITHMETIC.** An NPC with real
renown and no participation has a standing of exactly zero — no rule, no
special case, no gate to forget. Dave can be famous in the lounge and
politically weightless, and nothing had to be written to make that true.

**On the doctrine.** *"Measure, don't assign — renown is an output you
observe, never an input you set"* forbids writing the **figure**. It does
not forbid authoring the **events** the figure derives from — which is the
dossier's founding move everywhere else (*seed evidence, not a stat*), and
is what makes renown seeding legitimate rather than a violation. The
`asserting:` value is an author's claim that `lint:dossiers` checks; the
engine only ever sees seeded events.

⚠ **Which means the fold IS needed, for renown alone.** Seeding
`renown_events` moves nothing until a recompute folds it into the
materialized standings, and a bare restart re-warms from a collection the
seeding never wrote — the trap that cost the S1 drive a whole run. Seeding
must trigger the recompute. **Participation and influence stay untouched**,
so their share of that trap stays somebody else's.

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

**D5 — identity is a MIXIN with two named clone targets; `platform/agent/NPC`
retires.**

⚠ *Revised. The first form said "`Extra` and `Cast` are two concrete
classes" and would not have compiled against the tree it has to live in.*

The shipped hierarchy:

```
Creature (concrete)
 └─ Character (ABSTRACT)
     ├─ NPC ....................... lib/npc/NPC — the substrate
     │   ├─ platform/agent/NPC ................. 25 rows
     │   ├─ Crafter    = MakerMixin(NPC) ......... 7 rows
     │   ├─ Mercenary  = PartyMemberMixin(NPC) ... 1 row
     │   └─ Gus (bespoke) ........................ 1 row
     │       (+ Katie, TicketClerk — 0 rows)
     └─ Avatar / ShelledCharacter
```

⚠⚠ **Two axes, single inheritance.** Dave must be a `Crafter` *and* cast.
`Extra`/`Cast` as base classes cannot express that — it is a diamond.

⭐⭐ **The codebase already answered this and the answer was one line
away.** `Crafter = MakerMixin(NPC)` and `Mercenary = PartyMemberMixin(NPC)`
— the capability axis is *already* a mixin applied to the substrate and
given a name. And `SingletonMixin`, the enforcement half of cast-ness, is
already a mixin. So:

- **`lib/npc/NPC` stays.** Shared substrate of every class below it;
  untouched by this build.
- **`platform/agent/NPC` retires.** After the split no row names it, and
  ⭐ *a class nothing instances does not belong in `platform/`* — the
  headline placement rule.
- **`CastMixin` carries the identity rung** — `SingletonMixin` plus the
  dossier fields. It is the thing that actually composes.
- **`Extra` and `Cast` are the two generic clone targets**, so a row's
  `class:` still says which rung it is out loud. `Extra = NPC` (plain),
  `Cast = CastMixin(NPC)`.
- **Combinations stay one-liners in the existing idiom**:
  `Crafter = CastMixin(MakerMixin(NPC))`. Same shape, same file, one name.

On the naming: CLAUDE.md's twin rule says sharing the base's name is the
default and *"a twin that renames is claiming to be a different thing, and
had better be one."* Here the concrete twin **splits into two things**, so
both rename — the `Corpse` precedent.

⚠⚠ **A correlation trap to refuse.** All 7 `Crafter` rows carry a proper
name (Dave, Mara, Sloane, Remy, Augie, Odo, Berta) and the 1 `Mercenary`
does not — so capability and identity look perfectly correlated. **They
are not.** That is a 39-row accident of the same species as *instanced
exactly once*, and collapsing the axes on the strength of it would bake
the accident into the type system. Keep them orthogonal even though every
current row could be filed either way.

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

**D7c — the generalization: every attribution has a PERSON and a PARTY.**

The row already names two persons — `killer` and `victim` (`BlameVerdict`
adds `initiator`). What it lacks is their two *parties*.

⚠ First, do **not** fold this into `directedBy`. They are different
concepts that happen to compose:

| | |
|---|---|
| **`directedBy`** (shipped) | **episodic** — a captain's recorded directive began *this act* |
| **the institution** (new) | **standing** — this person is fielded by X, order or no order |

A guard acting for the watch was not *directed* by the watch on this
occasion. Conflating them would make every institutional act read as a
command, which is exactly the "the state ordered it" claim the governance
design is careful never to make by accident.

#### The shape

⭐ **The single-attribution case collapses into the existing field; only
the two-attribution case needs the mirror.** That is what makes this add
two fields rather than a parallel ledger:

| actor / victim is | `killer` / `victim` carries | `killerFor` / `victimFor` |
|---|---|---|
| **`Cast`** (a person, who also belongs to something) | the person | **the institution** |
| **sentient `Extra`** | **the institution** — it is the only attribution there is (D7) | — |
| **non-sentient `Extra`** (a wolf) | the row path — *"a wolf"* is the honest unit | — |

⚠⚠ **No new empty-string sink.** W1 removes `?? ""`, and nothing here
reintroduces it: every case above names something real, and D7b's lint
guarantees the one case that could not (a sentient Extra answering to
nobody) never reaches the ledger.

#### ⭐⭐ The asymmetry, and it is the interesting part

`commandResponsible` is **crime-gated** —
`crime ? (first.directedBy ?? '') : ''` — because naming a commander on a
lawful duel is noise.

**`victimFor` must NOT be gated the same way.** A lawful duel that kills a
guard is no crime against the watch, but it is still **a guard the watch
lost.** So:

> **The actor-side party is about BLAME and is crime-gated. The
> victim-side party is about LOSS and is never gated.**

⭐ That is what gives the casualty list its teeth: `victimFor` accumulates
whether or not anyone did anything wrong, which is precisely what a
casualty list is. Gate it on crime and the watch only ever counts its
murdered, never its fallen.

#### ⚠ Where this pushes back on "no writes otherwise" — CONFIRM

The ruling was *"extras attribute to the institution, no writes
otherwise."* Taken literally, a wolf (no institution) writes nothing —
but **combat rows are not only blame rows.** `opened` / `death` carry the
session, the terms and consent, and combat needs them to work at all.

So the reading this plan builds on, which is narrower than the words:

> **"No writes otherwise" means no writes to an INDIVIDUAL ledger that is
> not an individual** — never that the row is suppressed. A wolf's row is
> still written; its `killer` is *"a wolf"*, which is the honest
> granularity and not a collision, because which wolf genuinely does not
> matter.

⚠ If the intent was the stronger reading — suppress the row entirely —
say so, because it lands on combat bookkeeping rather than on blame, and
that is a different build.

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
| the party pair `killerFor` / `victimFor` | **`AccountabilityEvent`** — two new persistent fields beside `directedBy`, ⚠ **not** folded into it (D7c: standing ≠ episodic) | derived at write time from D7a's chain; `''` when the actor/victim is not a person with a party |
| surfacing them | **`BlameVerdict`** — beside `commandResponsible` | ⚠ `victimFor` is **not** crime-gated; `commandResponsible` stays as it is |
| `SingletonMixin` + the dossier fields | **`CastMixin`** (new, `lib/npc/`) | ⭐ the identity rung must COMPOSE — `Crafter` proves the capability axis already does. The throw at second clone *is* the enforcement |
| the two clone targets | **`platform/agent/Extra`** and **`platform/agent/Cast`** | so a row's `class:` names its rung; `platform/agent/NPC` retires because nothing instances it |
| `dispositions: ClaimSeed[]` | **stays on `BehavedMixin`** | ⚠ do not move it. Both Extra and Cast have brains, and an Extra's archetype resolves as a *lens* from the same declared data — the field is right where it is |
| the rest of the dossier (prologue · competence · circumstance · renown) | **`CastMixin`** | ⭐ **Revised** — an earlier note here argued *against* a mixin on the grounds that its host set would be exactly one class. That was true only while `Cast` was a base class; with two axes the mixin is the only shape that composes. ⚠ Still not `BehavedMixin` — that would put a dossier on every Extra |
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
   deceased's own identity for that half — under D7 an `Extra` keeps its
   own identity, so the watch's dead do not collapse together and no raw
   stamp is needed.
   Suggested: `${corpseRoot}/${sanitised(deceasedKey)}/${diedAtGameSec}`,
   with a disambiguator if two die in one game-second.

**Acceptance:** two corpses of the same species from the same room have
different identity paths; a reembodied player's two corpses do too.
**Unblocks #40.**

### W3 — `Extra` / `Cast`

1. `CastMixin` in `lib/npc/`; `platform/agent/Extra.ts` and
   `platform/agent/Cast.ts` as the two clone targets;
   `platform/agent/NPC.ts` retires; `Crafter` recomposes as
   `CastMixin(MakerMixin(NPC))` (D5).
2. `Cast = SingletonMixin(…)`. ⚠ **Neither class touches
   `getIdentityPath()`** — D7 replaced the projection with a second
   derived attribution, so identity resolution is unchanged by this
   build.
3. **Classify the 39 characters** by the article rule — 25 named + 6
   definite-article individuals → `Cast`; the indefinite role-fillers →
   `Extra`. Small enough to do by hand and to review.
4. The institution resolve (D7a) on the substrate; the `killerFor` /
   `victimFor` pair on `AccountabilityEvent` and `BlameVerdict` (D7c),
   with the collapse table decided there.
   ⭐ **A cheap acceptance for the asymmetry:** kill a guard in a *lawful*
   duel and the watch still counts the loss; the same row names no
   commander.
5. `pnpm lint:identity` — a dossier on an `Extra` is an error; a `Cast`
   row is a singleton; a proper `name:` on an `Extra` is an error; ⭐ and
   **a sentient `Extra` resolving to no institution is an error** (D7b).
6. ⭐⭐ **NEW SCOPE from the requirements pass — a reader for an
   institution's record.** Blame is derived and **nothing player-facing
   shows it**, so "the watch counts its losses" would ship invisible. The
   drive's step 9 cannot run without this. Cheapest honest surface: extend
   an existing record-reading verb to accept an institution, rather than
   minting one.
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

### W5 — competence claims, and a way to ask

D4, with Dave as the first consumer.

⚠⚠ **NEW SCOPE from the requirements pass, and it is load-bearing.** The
verbs that report what someone is good at and what they have done are
**zero-arg and self-only** — neither takes a target. Meanwhile
`advancement.md` states the read gate is deliberately asymmetric: a
player's competence is self-only, **an NPC's is readable by any viewer**.

> ⭐ **The permission is open and there is no door.** Nobody can ask what
> Dave is good at, so the headline goal is unreachable no matter how well
> the seeding works — the `feel`/`taste` shape exactly: a capability that
> ships and has never run.

So this wave also gives both readings an **optional target**, honouring
the asymmetric gate: refused for another player, answered for anyone else.

**Acceptance:** a player who asks reads Dave as good at bartending, and is
refused when asking about another player.

### W6 — `lint:dossiers` + the renown fold

Assert-vs-derive: seed what the dossier `asserting:` says and check the
derived band agrees. ⭐ This is the only thing that stops a dossier
drifting back into a stat sheet, because a declared value cannot disagree
with itself and a seeded history can. Census-then-ratchet: gate today's
count as the ceiling. ⚠ **Covers renown** (D2) — an asserted renown that
does not derive is exactly the S1 drive's silent failure turned into a
build error. **Does not cover participation or influence**: an author
never writes those, so there is nothing to check.

---

### W7 — ⭐ the content pass: give all 39 characters actual data

> **In scope by decision (2026-09-04).** *"A basic pass over our NPCs …
> whatever stands out as obvious, try to actually wire it up … a best-guess
> attempt at giving these guys some actual data."*
>
> ⚠ **Explicitly NOT a considered NPC design.** A full content pass over
> every template is planned separately, before go-live. This wave's job is
> to make the substrate *load-bearing* rather than theoretical, and to find
> what breaks when 39 real characters go through it.

**1. Reclassify every row.** 32 `Cast` (26 named + 6 definite-article
individuals — *the* collier, *the* smelterman, *the* onsetter, *the*
storekeeper, *the* ore buyer, *the* claims recorder) and 7 `Extra` (the
duelist, the sellsword, the sentry, the hewer on tutwork, plus the wolf,
the canary and the pit pony).

⚠ **Three misfiled rows will surface** and are not this wave's to fix
beyond noting: a key ring classed `Key`, a hog carcass and a corpse — all
sitting under `agent/` directories and none of them characters.

⚠ **Animals are `Extra` and must stay blameless.** They are the control
for D7b: non-sentient, no institution, nobody answerable. The canary in
particular is an *instrument* (the damps detector) wearing a bird.

**2. Competence from the job.** Mostly mechanical — the row already says
what it does, and the roster of Disciplines already exists: cooking ·
smithing · bartending · mixology · colliery · smelting · appraisal ·
retail-sales · business-admin-law · business-administration · distilling ·
fermenting · agriculture · horticulture · melee-combat · blades ·
awareness · services · geology.

**2a. ⭐ Missing Disciplines are IN SCOPE — and the ISCED-F anchor is what
keeps that from becoming a job-title dump.**

Every shipped Discipline names an **ISCED-F field-of-study code** — its
*"honest anchor"* — and specializes a parent (`mixology` → `bartending` →
`catering` → `services`). That gives a clean, non-negotiable test:

> **A Discipline is a FIELD OF STUDY, not a JOB TITLE.** If you cannot
> anchor it to a real ISCED-F code, it is not a Discipline — it is a
> position, and positions live on a Business roster.

⭐ The test settles the hard cases immediately: *"pantry hand"* anchors to
nothing and correctly gets none (a hand practises their trade's
Discipline); *mining* anchors to a real field and gets one.

**Known gaps against the 39-character corpus** (30 non-magic Disciplines
ship today):

| gap | who needs it | likely anchor |
|---|---|---|
| **mining** | the hewer, the onsetter — the metal chain shipped `hew`/`drive`/`sink`/`shore` with no Discipline behind them | ISCED-F **0724** *Mining and extraction* |
| **guarding / the watch** | the sentry and Gus — ⭐ and it pairs with D7b, since *the watch is the institution the sentry needs anyway* | **1032** *Protection of persons and property* (⚠ `stealth` already sits there — a sibling, not a clash) |
| **brewing** | Tamsin Roke, the brewer's hand | **0721**, beside `fermenting`/`distilling` |
| **winemaking** | Ilse Marrow, the vintner's hand | **0721**, same |

⚠ **Brewing and winemaking need a judgment call, not a reflex.** Both
anchor to the *same* code as the shipped `fermenting`. Either they are
specializations worth naming (there is precedent — `distilling` is already
split out at 0721) or `fermenting` covers them and two hands simply
practise it. **Decide once, apply to both**; splitting one and not the
other is the outcome to avoid.

⚠⚠ **And one to verify rather than assume:** `colliery` is anchored at
**0722** (*Materials — glass, paper, plastic and wood*), while mining and
extraction is **0724**. If this world's collier is the charcoal-burner
(which `trade-fuel`'s `char` verb suggests) then 0722 is defensible and
mining is a genuinely separate gap. If the collier is a coal miner, the
anchor is simply wrong. ⭐ **A wrong ISCED-F code is exactly the silent
error the anchor exists to prevent**, so check it before adding a sibling
next to it.

**3. ⭐⭐ Spread the bands, or the reading means nothing.** The vocabulary
is `untrained · novice · competent · proficient · expert`. If every
professional lands on `competent`, the whole feature says only "NPCs are
adults."

> **The curve is the design.** A *hand* is junior — that is what the word
> means, and eight rows say it in their own shortDescription (a bottling
> hand, a pantry hand, a yard hand). A keeper, a smith, a registrar is
> established. **`expert` should be rare enough to be worth remarking on**
> — the bar Dave built his reputation on, Berta at the forge, the collier
> with his decade. Most of the cast is `competent`; the hands sit below;
> the Extras have nothing at all.

**4. Dispositions where the prose already says so.** 22 rows carry them
already. For the rest, take two or three axes straight from the existing
longDescription rather than inventing character — *"cheerful"*, *"brisk"*,
*"still, attentive"* are already written down. ⚠ Now including `candor`
and `warmth`, which W0 made real.

**5. A prologue line only where the row already implies one.** Odile *is*
the city's whole civil service; the collier has his decade. ⚠ **Do not
invent history** — an empty prologue is honest and a fabricated one is
content debt that the later pass has to detect and undo.

**6. Institutions resolve, mostly.** Tiers 2 and 3 (employer, then parcel
owner) should cover the employed cast for free. ⚠ Whatever falls to
`null` **and is sentient** is D7b's lint firing, and the answer is
authoring the institution — the sentry's watch being the known case.

**Acceptance:** the drive's steps 2–4 read real bands off real characters;
`lint:identity` and `lint:dossiers` both pass over the whole corpus; and
the band histogram is a *curve*, not a spike at `competent`.

⭐ **This wave is the build's real test.** Every previous wave can pass its
tests with one hand-made fixture; this one runs the substrate over 39
characters nobody wrote with it in mind, which is where the assumptions
break.

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
- **A full, considered history for every character.** Substrate
  here; the authoring is a content pass.

---

## Critical files

`lib/stuff/Stuff.ts` · `api/stuff.ts` · `platform/agent/{NPC,Cast,Extra}.ts` ·
`platform/agent/sandbox/WireBody.ts` · `platform/idea/api/{CombatLogic,ConditionLogic,SandboxLogic,RenownLogic}.ts` ·
`lib/trait/{Disposition,Dispositioned}.ts` · `lib/behavior/Behaved.ts` ·
`lib/npc/tree.ts` · `lib/stuff/Singleton.ts` · the **39 character rows**
(⚠ *not* `**/agent/*.yaml` — see the census note in Grounding).

## Drive record

The script is **requirements § The drive** — twelve steps, run against a
freshly reset world (written history is laid down once at birth, so a
stale world lies at every checkpoint).

*(The record is appended here at build time — the exit criterion.)*
