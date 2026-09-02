# Slate — OO calling conventions: verbs on the objects, Apis for what has no subject

**Seeded 2026-09-01** (the fermentation MR conversation, the same
session as [api-boot-retirement-slate](./api-boot-retirement-slate.md)
— the two are siblings: both shrink the Api tier's mandate back to
what only it can do).

⭐ **Scoped 2026-09-02 — read "Decided 2026-09-02" at the foot of this
file first.** Both slates land as ONE build; all four line-drawing
questions below are ANSWERED there.

## The doctrine, stated once

We have types for a reason. A verb between typed objects belongs ON
the objects — `from.transferTo(to, amount)`, `actor.ingest(material)`,
`stuff.receiveHeat(joules)` — not on a procedural static that takes
the subject as its first parameter. The Api tier keeps exactly four
mandates:

- **(a) subjectless services** — parsers, vocabulary reads, walks with
  no natural `this` (`amountFromOption`, `floorSurfaceNear`,
  `Mml.compose`, the whole of `CelestialApi`);
- **(b) framework lifecycle run AROUND a least-trusted host** —
  clone/destruct/capture/shadow-dispatch, where the host must not be
  able to override the sequence (`StuffApi`, `PersistableApi`,
  `ShadowApi`, `SchedulerApi`);
- **(c) the import/exterior boundary** — only `api/**` imports outside
  the mudlib (`SourceTreeApi`, `PersistApi`, `GitApi`, the stream
  transports);
- **(d) genuinely subjectless cross-cutting dispatch** (`EventApi`).

Everything else is the antipattern this slate retires. The existing
doctrine already half-says this (antipatterns.md §"Thin Api Wrappers
over Object Methods": *a read or mutation that belongs to ONE object
lives on that object*) — the sweep finishes the sentence for verbs.

**Security is not a counter-argument.** Instance methods dispatch
through the same call-security proxy; participant contracts
(`FromClass`/`FromMixin` + relational `where`) say who may call, and
`@Final @Unshadowable` seals a method against hostile subclassing.
The `ContainmentApi.move` origin story (the inconsistent
paired-mutation bug) is an argument for ONE IMPLEMENTATION, not for a
static home — a sealed host method is the same chokepoint.

## How bad it is (the census, 2026-09-01)

~1,450 statics across 104 Api classes. **~150–160 are mutating
object-verbs**; ~55 of those live in the doctrine-exempt orchestrators
(Containment, Locomotion, Condition, Scheduler, Persistable, Shadow,
Stuff, Sandbox, Prompt — whose caller counts, 65/54/53/24 files, are
themselves the evidence they're the real thing). That leaves
**~95–105 genuine conversion candidates concentrated in ~20 Apis**,
with a total blast radius of roughly **150–200 non-test call sites
across ~110 files, plus ~20 `FromModule('/api/x#XApi')` gate strings**.

The worst offenders, by density and volume:

| Api | OV / total | Note |
|---|---|---|
| `BeliefStoreApi` | 4/4 (100%) | every method is `verb(viewer, …)`; host composes `BeliefStore` |
| `ChronicleApi` | 4/5 (80%) | `record`/`recordDeed`/`recordOnce`/`seedClaims(owner, …)` |
| `ThermalApi` | 2/3 (67%) | ⭐ `depositHeat` is a VERIFIED DUPLICATE — `Thermal.depositHeat(joules)` already exists on the mixin (`lib/thermal/Thermal.ts:336`); the Logic is a guard + forward |
| `PostureApi` | 2/3 (67%) | `transferPosture`, `vacatePostureBearingSlots` |
| `PartyApi` | 13/21 (62%) | the biggest single-mixin surface: invite/enlist/kick/disband/… |
| `RegardApi` | 3/5 (60%) | all viewer→subject pairs |
| `FireApi` | 4/7 (57%) | ignite/douse/advance/tryAutoignite over `Combustible` |
| `SubjectApi` | ~10/18 (56%) | follow/mute/rename/delete/subscriptions |
| `CombatApi` | ~15/29 (52%) | the biggest absolute count; pair-verbs (initiate/intervene/defendAlly) |
| then | | Forums, Chattel, Message, Magic, Slot, Chat, Employment, Social, Glob, Electricity, Credential, Trait, Advancement (25–45%) |

**Ten methods are ALREADY illegal under the existing thin-wrapper
rule** and survive only because `scripts/check-thin-forwarder.ts`
misses the void-guard shape (`if (!isX) return; param.m(...)`):
`ThermalLogic.depositHeat`, `MessageLogic.sendMessage`/`sendEnvelope`
(→ `recipient.onMessage`/`onEnvelope`), `GlobbableLogic.canMerge`
(→ `a.canMergeWith(b)`), `CommandLogic.forceCommand`
(→ `giver.executeCommand`), `ConnectionLogic.recordOrigin`,
`ContainmentLogic.isContainedIn`, `LocomotionLogic.exitAllowsMode`,
`WorldClockLogic.cancel`, `SlotLogic.vacateAll`.

## The line-drawing questions (decide before sweeping)

1. **Ledger writes** — `ChronicleApi.record(owner, fields)` and its
   mirror family (Advancement, Trait, Regard, BeliefStore, Record):
   is `owner` a SUBJECT (→ `owner.recordDeed(...)` on a ledger-face
   mixin) or a KEY into a subjectless ledger service (the
   banking-by-account-id shape)? One answer for the whole family; the
   census counted them OV, but this is the sharpest call.
2. **The `Interactive` family** (Connection, Card, Prompt, Reaction —
   ~25 OVs): the receiver is a transport handle, not Stuff. Either
   exempt as boundary-adjacent, or give `Interactive` methods — but
   decide once.
3. **Query/reads** (`describe(viewer, target)`, `bandFor(actor, key)`,
   `sideOf`, …): lower stakes, no mutation; convert opportunistically
   or leave — the sweep should NOT block on them.
4. **`BulkableApi.transfer` specifically**: the pair is
   `BulkSlot ↔ BulkSlot` (value-object handles), so the honest OO form
   is holder-level `from.transferTo(to, amount)` wrapping the slot
   resolution — or transfer stays as the one slot-level service while
   `ingest`/`ingestSolid` move to `actor.ingest(...)`. Also the
   cosmetic rider: the class is named after the MIXIN (`BulkableApi`);
   if kept, rename to `BulkApi` (touches its gate string).
5. **The Logic tier after conversion**: a moved verb takes its
   module-private helpers into the mixin file; a Logic left holding
   nothing is deleted (the FermentLogic precedent). The
   `XApi ↔ XLogic` split stays MANDATORY only where an Api tier
   survives.

## The sweep, shaped

- **Wave 0 — the lint.** Extend `check-thin-forwarder.ts` to catch the
  void-guard shapes; convert the ten already-illegal wrappers it then
  flags. Smallest, provably-safe, and it hardens the fence before the
  furniture moves.
- **Wave 1 — the verified duplicate.** `ThermalApi.depositHeat` /
  `reconcilePhase` (6–7 caller files) — the exemplar conversion:
  participant contract or seal on the host method, callers repointed,
  gate string retired, doc updated. Establishes the mechanical recipe.
- **Waves 2..n — by blast radius, smallest first**, one Api per wave:
  Belief (2 callers) → Regard (5) → Posture (5) → Chronicle (8+) →
  Fire → Glob → Electricity → Slot (11) → Party → Subject → Chat →
  Chattel → Magic → Employment → Combat (the big one, last).
  Each wave: move verb + helpers onto the owning mixin, seal
  (`@Final @Unshadowable`) where the field-ownership rule applies,
  repoint callers, update the gate string or delete the Logic, keep
  the old static as a deprecated forwarder ONLY within the wave (never
  across MRs — no-migrations doctrine: delete, don't shim).
- **Acceptance**: the census re-run reports ~0 mutating object-verbs
  outside the four mandates; `check-thin-forwarder` green with its
  strengthened shapes; antipatterns.md gains the doctrine statement so
  the next Api is born on the right side of the line.

## Explicitly out of scope

The doctrine-exempt orchestrators (Containment, Locomotion, Condition,
Scheduler, Persistable, Shadow, Stuff, Sandbox, Prompt, Biome's
resolve family) — re-litigating them is not this sweep; the
`crafting.ts` request-object shape (a fine third form, undisturbed);
`MixinApi`'s 140 narrowing predicates (the sanctioned surface); and
everything in [api-boot-retirement-slate](./api-boot-retirement-slate.md),
which should land first or together (both shrink the same tier).

---

## Decided 2026-09-02 — the build's shape

The user took the maximal option on all four line-drawing questions.
This section supersedes the open questions above; the census below
supersedes the 2026-09-01 numbers.

### The four answers

1. **Scope: one build, both slates.** The `Api.boot()` retirement lands
   FIRST (small, mechanical, and it deletes Logic singletons the OO
   waves would otherwise touch twice), then the OO waves. One MR, one
   review, one full-suite run.
2. **Ledger writes are SUBJECTS.** `owner.recordDeed(…)` on a
   ledger-face mixin, for the whole family — Chronicle, Advancement,
   Trait, Regard, BeliefStore, Record. The banking-by-account-id
   reading is rejected: the owner is a typed object, not a key. Cost
   accepted: six new/extended mixins, and the append chokepoint becomes
   a sealed host method (`@Final @Unshadowable`) rather than a static.
   This retires Chronicle / Regard / Trait / BeliefStore outright.
3. **Depth: all of it, Combat last.** No stopping at the small Apis.
   The acceptance bar is the census re-run reporting ~0 mutating
   object-verbs outside the four mandates.
4. **The `Interactive` family gets real methods.** Connection, Card,
   Prompt and Reaction's ~25 subject-first methods move onto
   `Interactive` — it is a typed object like any other. It is NOT
   exempted as boundary-adjacent. (The transports themselves — the
   actual wire — stay under mandate (c).)

### The refreshed census (2026-09-02, master `0c1a29285`)

**1,348 statics across 103 Api classes**, plus 87 Logic singletons.
533 take a Stuff-shaped first parameter. Removing `MixinApi`'s 144
sanctioned narrowing predicates and the doctrine-exempt Apis
(Containment, Locomotion, Condition, Scheduler, Schedule, Persistable,
Shadow, Stuff, Sandbox, Prompt, Security, Proxy, Module,
ExecutionContext, Event, SourceTree, Persist, Git, Script, HotReload,
Template, Pack) leaves **188 subject-first methods across ~50 Apis**.
Roughly 110 of those are true mutating verbs; the balance is the
read/query tail the sweep converts opportunistically (§3 above).

⭐ **Ten Apis take a subject on EVERY method** — the whole-Api
retirement candidates, ordered by production caller files (the wave
order, smallest blast radius first):

| Api | methods (verbs/reads) | prod caller files |
|---|---|---|
| `BeliefStoreApi` | 4 / 0 | 3 |
| `PostureApi` | 2 / 1 | 6 |
| `CredentialApi` | 3 / 2 | 6 |
| `RegardApi` | 4 / 1 | 8 |
| `TraitApi` | 5 / 4 | 8 |
| `ChronicleApi` | 4 / 1 | 10 |
| `ThermalApi` | 2 / 1 | 13 |
| `ElectricityApi` | 3 / 2 | 18 |
| `SlotApi` | 4 / 4 | 20 |
| `RecognitionApi` | 4 / 4 | 26 |

The remaining volume, by verb count: `CombatApi` 15 (20 files),
`PartyApi` 14 (11), `ForumsApi` 8 (5), `MagicApi` 7, `BulkableApi` 6,
`EmploymentApi` 6 (38 files — the widest), `SocialApi` 6,
`AdvancementApi` 5 (36 files), `BankingApi` 5, `ChatApi` 5,
`MaterialApi` 5, then the ≤4 tail (Chattel, Fire, Group, Slot,
Message, Subject, Weather, WorldClock, Conviction, Government,
Perception, Record, and ~15 singletons).

**Wave 0 re-verified.** `check-thin-forwarder.ts` handles
`if (c) return <trivial>; return p.m(…)` but NOT the void shape
`if (!isX) return; p.m(…)` — the ten already-illegal wrappers still
pass. `ThermalLogic.depositHeat` is confirmed a literal duplicate of
`Thermal.depositHeat` (`lib/thermal/Thermal.ts`); the Logic method is
a `MixinApi.isThermal` guard and a forward, nothing else.

### Sequencing

- **Phase A — the boot retirement** (the sibling slate, whose inventory
  is understated: **16** `static boot()`, not 6). Lands first.
- **Phase B — wave 0**, the lint hardening + the ten already-illegal
  wrappers.
- **Phase C — the ledger family**, together, since (2) is one answer
  for all six: the ledger-face mixin is designed once and composed six
  times. Retires four Apis.
- **Phase D — the remaining fully-subject Apis** in the table order.
- **Phase E — `Interactive`**, per (4).
- **Phase F — the mid-size Apis** (Fire, Glob, Chattel, Subject, Chat,
  Magic, Social, Employment, Bulk, Forums, Party).
- **Phase G — Combat**, alone, last.

Requirements phase re-opens the wave boundaries; the phase ORDER is
decided.

### The acceptance instrument

"The census re-run reports ~0" needs the census to be a **script in the
tree**, not a one-off. Phase B ships it alongside the
`check-thin-forwarder` hardening: a `scripts/check-object-verbs.ts`
that walks `api/**`, resolves each static's first parameter type
against the file's `lib/`+`platform/` imports, and reports
subject-first methods outside the four mandates — with the exempt Api
list ENUMERATED in the script (a deliberate edit to widen, the
`lint:boundary` precedent) rather than inferred. Advisory at first, so
the waves can watch the number fall; CI-gating at the end of Phase G.
The scoping run (2026-09-02) used a throwaway of exactly this shape —
its numbers are the table above, and it is the thing to re-derive
properly, not to copy.
