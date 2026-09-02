# Slate — OO calling conventions: verbs on the objects, Apis for what has no subject

**Seeded 2026-09-01** (the fermentation MR conversation, the same
session as [api-boot-retirement-slate](./api-boot-retirement-slate.md)
— the two are siblings: both shrink the Api tier's mandate back to
what only it can do).

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
