# The homeless statics — a dossier for one ruling

> **Status: DECISION PENDING** — this exists to be ruled on once and then
> folded into [value-object-statics-slate.md](./value-object-statics-slate.md).
> **Raised by:** the `build/lib-statics` build, 2026-09-13.

Eighteen subsystems own public statics and have **no `Api` to move the
world-level ones to**. The slate named six; the census found eighteen.
This is the whole list, with what each actually holds and where it could
go, so the boundary question is answered in one pass rather than
eighteen interruptions.

---

## ⚠ First — read this, because it shrinks the question by half

Your ruling was *"narrow it so a value object's **constructor-shaped**
statics (`of`/`parse`/`fromJSON`) stay put."*

**I implemented a slightly wider line, and you should confirm or cut it.**
W2 ships the rule as *type-level stays, world-level moves*, where
type-level is three things, not one:

| kept | example | your words covered it? |
|---|---|---|
| construction | `Quantity.of`, `Credential.fromData` | ✅ yes, explicitly |
| a **guard** over the type's own closed vocabulary | `ConcealmentLevels.isLevel`, `Disposition.isAxis` | ⚠ my extension |
| a **lookup** of that same vocabulary | `Currency.all`, `Disposition.axisFor` | ⚠ my extension |

The argument for the extension: `Disposition.isAxis('warmth')` answers a
question about *the Disposition type* — what its axes are — and there is
no world in it. Moving it to an Api makes the vocabulary's own guard live
away from the vocabulary. The argument against: it is more than you said,
and it keeps ~64 statics that a stricter reading would move.

**If you cut it back to construction-only, say so and I will move the
guards and lookups too** — it is one more pass over the same classes, not
a re-plan.

Everything below is classified under the wider line. Where a subsystem
has nothing in the "needs a home" column, it needs **no Api at all** and
drops out of the question entirely.

---

## The result: 9 subsystems need a home, not 18

Of the 117 statics in Api-less subsystems, **~50 are world-level**. The
other ~67 are type-level, stay exactly where they are, and are now
*visible* in the author surface as `value-static` — which was the whole
complaint.

### Needs no Api — the statics are all type-level, question closed

| subsystem | statics | why it is type-level |
|---|---|---|
| **credential** | `Credential.mint`/`fromData`, `KeyCredential.fromData`, `PaymentCredential.fromData`, `TravelCredential.fromData` | pure construction, one per kind |
| **concealment** | `ConcealmentLevels.isLevel`/`isConcealed`/`rankOf`/`requirementFor`/`hiddenDefault` | the band vocabulary talking about itself; ⭐ and CLAUDE.md already puts the *behaviour* on `PerceptionApi` ("the concealment/detection face"), so the Api that would own anything here exists |
| **maturation** | `MaturationProfile.all`/`byKey`/`cultureForStrain`/`forMaterial` | a roster lookup over authored rows |
| **archetype** | `Archetype.fromDocument`/`fromData`/`needKey` | construction + one guard |
| **reserve** | `Reserve.fromStored`/`defaultBiological` | construction + a default value |
| **hazard** | `HazardDelivery.from` | construction. ⚠ `hazard.md` names a `HazardApi` that does not exist; the behaviour it describes is on `ConditionApi` |
| **slot** | `Impression.seedOf`/`phrasingFor`/`render` | seed + rendering of the value itself |
| **travel** | `TravelNodes.of` | construction |
| **metabolism** | `BlendLabel.ingredientsOf`/`nutrientsOf`/`amountsOf`/`tagsOf`/`isEdible`/`toxicityOf` | all six read the blend value handed to them. ⚠ `metabolism.md` names a `MetabolismApi` that does not exist — and on this reading it does not need to |

### Needs a ruling — world-level statics with nowhere to go

| subsystem | the world-level statics | what I would do | the boundary question |
|---|---|---|---|
| **identification** (12) | `Appearance.currentGeneration`, `effectiveGeneration`, `descriptorFor`, `renderFor`, `isRecordCurrent`, `clearMemo` · `DescriptorBank.byKey`/`cached`/`primeCache`/`clearCache` | ⭐ **mint `IdentificationApi` + `IdentificationLogic`** | The biggest block, and it holds a **static memo** (`static #descriptorMemo`) plus a cache — module-level mutable state, the W4 smell. It is the magic-items "derived appearance + descriptor banks" machinery and has no doc of its own |
| **standing** (10) | `RenownStanding`/`ParticipationStanding`/`ProducerStanding` `.key`/`.warm`/`.cached` · `CreditRouting.resolve` | **split across the four Apis that already exist** — `RenownApi`, `InfluenceApi` (participation), `ProducerApi`, `ProvenanceApi` (credit routing) | ⚠ `lib/standing/` is a directory with **no subsystem doc and four different owners**. The honest read is that it is not a subsystem — it is four subsystems' record classes filed together. `warm`/`cached` are boot + cache, not logic |
| **wiki** (5) | `WikiPage.findByNamespace` · `WikiRevision.findForPage`/`findRev`/`latestPublished`/`deleteForPage` | ⭐ **mint `WikiApi` + `WikiLogic`** | All five are persistence queries. `wiki.md` exists and describes a real subsystem; `WikiRegistry` already sits in `platform/idea/`. The other 20 wiki statics (`Sections`, `SourceDiff`, `SpoilerLevels`, most of `WikiPage`) are text operations and stay |
| **advancement** (3) | `Competence.derive`/`bandOf`/`seedRunFor` | ⭐ **mint `AdvancementApi` + `AdvancementLogic`** | ⚠ These are *pure* — `derive(evidence)` touches no world. Under the strictest reading of your rule they are "not constructor-shaped" and move; under a purity reading they could stay. **They are the advancement model**, which is why I would move them |
| **trait** (3) | `TraitPosition.deriveAxis`/`derive`/`pronounced` | ⭐ **mint `TraitApi` + `TraitLogic`** | `trait.md` **already names `TraitApi` twice** as though it exists. Same pure-vs-domain-logic tension as advancement |
| **lock** (3) | `Lock.mintKeyway`/`issueKey`/`issueMasterKey` | **`BoundaryApi`** — `boundary.md` owns "locks & keys" | Two of the three are `async` and *mint* credentials, which is squarely an orchestration act. `keyDescription` is type-level and stays |
| **location** (3) | `OuterWarren.conditionOf`/`admitFor` · `Warren.cleanupOnDestruct` | **`ZoneApi`**, or `HoldingApi` if the holding ladder gets its own | `Warren.cleanupOnDestruct` is a *framework hook shaped as a static* — probably neither, and wants to be an instance `onDestruct` |
| **npc** (3) | `DialogueEffectRegistry.register`/`has`/`validate` | **a real registry singleton**, not a class with a `Map` — the W4 bucket | `npc-dialogue.md` names `PromptApi`/`CommandApi` but no dialogue Api. A *registry* is not an Api question |
| **commerce** (1) | `CommerceMenu.resolveIn` | **`ConsumerApi`** (the retail face) | `lib/commerce/` holds one class and has no doc; `retail.md` is the subsystem |

---

## ⚠ Five subsystem docs name an Api that does not exist

Found while mapping. Each is a doc promising a surface the code never
grew — which is evidence about intent, not just an error:

| doc | names | exists? |
|---|---|---|
| `trait.md` | `TraitApi` (×2) | ✗ |
| `metabolism.md` | `MetabolismApi` | ✗ |
| `maturation.md` | `MaturationApi` | ✗ |
| `hazard.md` | `HazardApi` | ✗ |
| `concealment.md` | `DetectionApi` | ✗ |

Under this dossier's classification only **`TraitApi`** is actually
wanted; the other four subsystems turn out to need no Api, and their docs
should stop naming one. ⭐ That is worth saying out loud: *a doc naming an
Api is not evidence the Api is needed* — four of these five would have
been minted on that evidence alone.

---

## What I am asking you to rule

1. **The widened line** — construction only, or construction + guards +
   lookups? (Above, § First.)
2. **Four Apis to mint**, or fewer: `IdentificationApi`, `WikiApi`,
   `AdvancementApi`, `TraitApi`.
3. **`lib/standing/` is four subsystems in a trench coat** — split its
   statics across `RenownApi` / `InfluenceApi` / `ProducerApi` /
   `ProvenanceApi`, or give standing a face of its own?
4. **The pure-but-domain cases** (`Competence.derive`,
   `TraitPosition.derive`) — move them, or does "pure function of its
   arguments" earn a static the right to stay?
