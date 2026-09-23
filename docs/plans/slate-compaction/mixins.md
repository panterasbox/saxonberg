# Ledger — batch `mixins`

Slate: `docs/slates/tails/mixin-slate.md`

Prior insertion already on this branch (not mine — the property/parcel
slate's Handoff item, already landed): `mixins.md § Before proposing a
mixin — capability or relation?`, inserted between "What Makes a Mixin
Well-Formed" and "### 0. Docstring must say...". Verified present;
nothing in this pass contradicts it. No further insertion into
`mixins.md` was needed from this slate — every mixin-framework-level
fact it still carried (federation, `_mixinRefusal`, `lint:mixin-names`)
is already documented there; everything else graduates to OTHER
subsystem docs, which are outside my insert list, so those go to
Handoff below, never written to a doc.

## docs/slates/tails/mixin-slate.md — 472 → 272 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)

- Second status block (`> **Status: living checklist…**`, 8 lines) — one-status-block rule; the canonical PARTIAL/Left/Size block stays.
- `### Matter & shape` + `### State of matter & surface` (24 lines) — code: `Material.ts` (hardness/toughness/conductivities/heats), `lib/material/Channel.ts`; doc: `race.md`, `materials-response.md`, `textiles.md § Insulation`, `fire.md § phase change`, `electricity.md`, `thermal.md`. One-line pointer left.
- `### Atmospheric emission` (8 lines) — code: `lib/description/Perceiver.ts` (`SenseChannel`); doc: `senses.md` (explicitly names this slate's deferred items — smell trails/temporal persistence — as still Wave 3+). One-line pointer left.
- `Wieldable`/`Wearable` bullets (already `(have)` + pointer) — doc: `embodiment.md`, `slot.md`. Folded into the summary paragraph.
- `Equippable` bullet — code: `lib/slot/Slotted.ts`/`Slottable.ts`; doc: `slot.md` ("anything that can sit in a slot" is the generic binding envisioned). Pointer left.
- `Sittable`/`Lieable`/`Standable-on` bullet — already flagged superseded in the slate itself; doc: `posture.md` (`Postured`/`Posed`). Pointer left.
- `Readable` bullet — code: `lib/description/Marked.ts` (`MarkedMixin`); doc: `magic-items.md`, `perceiver.md`. Pointer left (kept `Writable` — no equivalent shipped).
- `Switchable`/`Toggleable` bullet — code: `lib/boundary/Switchable.ts`; doc: `boundary.md`. `Toggleable` never needed separately.
- `Pourable`, `Mixable`, `Combinable`, `Stackable` bullets — code: `bulk.md`'s fill/pour/drink grammar, `crafting.md`'s discrete-ingredient branch, `api/stackable.ts`; doc: `bulk.md`, `crafting.md`, `stacks.md`.
- `Lightable` bullet — code: `lib/fire/Combustible.ts` (`autoignitionTemperature`); doc: `fire.md`. No separate mixin shipped; folded into Combustible's own threshold.
- `Lockable`/`Keyed` bullets — code: `lib/boundary/Locked.ts`, `lib/lock/Lock.ts`; doc: `boundary.md` (`LockableMixin`), `credential.md § KeyCredential`.
- `Capacity-bound` bullet — doc: `spatial.md` (`Vessel` — "carry/drag/ride is emergent from mass vs. a bearer's capacity … never a type flag"), `encumbrance.md`. This is a genuine design reversal from the slate's own framing, not just a rename — logged as its own item below too.
- `Surfaced` bullet — code: `lib/spatial/Surfaced.ts`; doc: `spatial.md`.
- `Searchable`/`Concealing`/`Hideable` bullets — code: `lib/concealment/Concealable.ts`, `lib/concealment/Hiding.ts`; doc: `concealment.md`, `stealth.md`.
- `Portable` bullet — doc: `encumbrance.md` (over-carry is a post-hoc consequence via `LoadBearing`, not a pre-gate on `get`; `GetController.ts` has no mass ceiling). Design reversal, logged below too.
- `Throwable` bullet — verb: `packages/content/platform/content/platform/cmd/inventory/throw.yaml`; doc: `ranged.md § throw` (mass-gated, not mixin-gated).
- `Tieable` bullet — code: `HaulerMixin` (`hitch`/`unhitch`); doc: `conveyance.md`.
- `Hangable` bullet — doc: `furnishing.md` (`place`/`hang`, `mounted: { slot }`).
- `### Light family` (full subsection, 20 lines) — code: `lib/fire/Combustible.ts`, `lib/fire/Burning.ts`; doc: `light.md`, `light.md § Boundary Substrate`, `fire.md`.
- `Mountable`/`Drivable` bullets under `### Vehicles` — doc: `conveyance.md`. Kept `Steerable`/`Navigable` (no shipped equivalent).
- `Poisoned`, `Diseased`, `Cursed`/`Blessed`/`Uncursed`, `Hidden`/`Stealthing` bullets under `### Status effects` — doc: `harm.md § ConditionApi`, `magic-items.md § BUC` (`Blessable`), `concealment.md`/`stealth.md`. Kept `Invisible`, `Sleeping`/`Resting`.
- `### Material — shipped as a substrate` (19 lines) — doc: `race.md`.
- `### Light — landed…` table (16 lines) — doc: `light.md`.
- `### Climbable & locomotion modes — shipped` (27 lines) — doc: `locomotion.md` (mode-aware movement with per-mode enablement mixins realizes "Path 2" — the doc doesn't use that label but the shipped shape is unambiguous).
- `## Sample compositions` (full section, ~30 lines) — every referenced mixin in every one of the 10 worked examples now resolves to shipped or superseded substrate (embodiment.md, slot.md, credential.md, boundary.md, metabolism.md, bulk.md, furnishing.md, conveyance.md, race.md). No remaining illustrative value once none of the names match the shipped shape (`Lightable`, `Capacity-bound`, `Readable` don't exist; `Portable`'s design was reversed). Logged as its own class below (not quite SHIPPED·DOCUMENTED, not quite SUPERSEDED — "fully resolved by scatter").
- `### Item / behavior mixins whose actor side is species-gated` bullet-list — doc: `slot.md`/`embodiment.md` (`BodyPlanSlotsMixin`), `metabolism.md`/`bulk.md` (`DietApi`/`mustBeEdible`).
- `### Currently-deferred mixins also organism-shaped` bullet-list (`Hungry`/`Thirsty`, `Aged-in-game-time`, `Mortal`) — doc: `metabolism.md`, `race.md` (`bornAt`+`ageCurve`), `mortality.md`.
- `### Mixins explicitly neutral to Organism` bullet-list — every named mixin in it was independently cut above; the note itself carries no remaining information.
- Build order **First wave** (7 items) + **Second wave** (3 items) — same evidence as the matching `### Affordance / use` / `### Light family` / `### Status effects` cuts above.
- Build order **Third wave** bullet 2 (`Switchable`/`Toggleable`, `Pourable`, `Mixable`, `Stackable`, `Combinable`) — same evidence as above.
- Build order **Status effects** bullet 1 (`Cursed`/`Blessed`/`Uncursed`) — same evidence as above. Also trimmed the resolved names (`Hangable`/`Tieable`/`Throwable`, `Poisoned`/`Diseased`, `Hidden`/`Stealthing`) out of the two surviving Third-wave/Status-effects bullets so they don't contradict the § Mixins cuts above — this is slightly more than a pure per-bullet deletion (I edited within a kept bullet rather than only removing whole bullets), flagged here for reviewer attention.
- **Design pass before building** (full subsection, 15 lines) — the slate's own text already said "the three below have all since shipped"; doc: `locomotion.md`, `slot.md`+`embodiment.md`, `conveyance.md`.
- `### A mass register` (9 lines) — code: `packages/server/scripts/check-presentation.ts` clause (b) ("Every authored `register:` is one of the three"); doc: `presentation.md`, `lint-family.md § census-then-ratchet`.

### Superseded — cut (design reversed, not just renamed)

- `Capacity-bound` — the slate envisioned a container-capacity mixin; the shipped design is the opposite: capacity/burden is *derived* from mass vs. bearer capacity (`spatial.md`, `encumbrance.md`), never a type flag. Same paragraph-class as `Portable` below.
- `Portable` — the slate envisioned a mixin gating `get`; `GetController.ts` gates on none, and over-carry is a post-hoc `LoadBearing` consequence (`encumbrance.md § The consequence ladder`). The gate was never built the way the slate described, and won't be — logged as superseded rather than "still open."
- `## Sample compositions` — see the cut entry above; logged again here because it's the "shipped in a different shape" pattern from the pilot calibration, not a clean doc pointer.

### Kept (UNBUILT)

- The canonical status block (re-stamped — see below).
- `## Principle` — doctrine (see Doctrine below, not Left).
- `### Affordance / use` — `Writable`, `Pushable`/`Pullable`/`Liftable` (no shipped equivalent for either).
- `### Vehicles` — `Steerable`, `Navigable`.
- `### Status effects (on Shadow infra)` — `Invisible`, `Sleeping`/`Resting`.
- `## Organism subsystem awareness` — intro paragraph (see Uncertain — it calls the race/species subsystem "forthcoming," which is now stale, but the two surviving bullets below still need the framing); `**State-effect mixins that only apply to organisms**` (Poisoned/Diseased host-range species-awareness — no evidence found that species host-ranges are implemented, only that the generic `ConditionApi` mechanism is; `Sleeping`/`Resting` circadian variance — genuinely unbuilt); `**Property that gets richer for organisms**` (tissue-composition material property — `race.md`'s own `§ See also` still lists "tissue authoring at the Detail level" as v1-deferred).
- `## Out for now` — kept in full; see Uncertain (heavy staleness in several clusters' stated *why*, but every bullet mixes shipped and unshipped items at sub-bullet granularity, so none of it clears the "whole paragraph" cut bar).
- Build order `**Third wave**` (`Pushable`/`Pullable`/`Liftable`, `Writable`) and `**Status effects**` (`Invisible`, `Sleeping`/`Resting`) — same items as above, kept as a checklist.
- `## ⭐ Tails from the presentation build` heading + `### ⭐⭐ The general silent-discard gate` (full subsection) — verified: no `lint:*` gate exists for "every authored `data:` key is a field some composed class declares" (checked `pnpm -C packages/server lint:family --list`, `packages/server/scripts/`). Genuinely still unwritten, exactly as the slate says.

### Uncertain — kept

- `## Organism subsystem awareness` intro paragraph — calls the race/species/organism subsystem "a forthcoming design pass" (with a `roadmap.md` pointer). The subsystem has since shipped in full (`race.md`). Kept because the two surviving bullets under it still need framing and the rule is "never rewrite a kept section," but the sentence is now false on its face — flag for requirements to either fold this section into `race.md`'s own open items or rewrite the intro.
- `## Out for now` — several clusters' stated `*Why*` no longer holds even though the cluster is kept whole (mixed shipped/unshipped items forbid a clean cut): **NPC automation** (`Companion`/`Pet` shipped as `pets.md`'s `KeptAnimal`; `Dialogic` shipped as `npc-dialogue.md`; `Hostile`/`Friendly`/`Pacifist` shipped as `party.md`'s `sideOf`/`areAllied`; `Memorable` shipped as `belief.md`'s BeliefStore; `Moody` shipped as `trait.md`'s disposition layer; `Disguised` shipped as `belief.md`'s disguise mechanism — but `Routined`/`Patrolling`/`Trader`/`QuestGiver`/`Following`/`Followable`/`Tipsy`-etc. show no evidence of shipping); **Ownership & value** (`Owned` → `chattel.md`; `Priced` → `retail.md`'s `PricedOffer`; `Currency` → `banking.md`'s two-tier money; `Tippable` → `employment.md`'s `tip` verb — but `Tradeable`/`Bound` show no evidence, and `BUC` in `magic-items.md` is Blessed/Uncursed/Cursed, NOT bind-on-pickup, so don't conflate them); **Mortality** (`Mortal`/`Aged-in-game-time` shipped per the cut above — but `Immortal`/`Respawning` show no evidence); **Combat & damage** (combat.md and materials-response.md both shipped, so the stated "no combat or wear systems yet" is false, but `Damageable`/`Breakable`/`Polishable`/`Paintable` still show no evidence as named mixins). Recommend a requirements-phase pass to split this section per-cluster rather than treat it as one atomic backlog.

### Doctrine

- `## Principle` — "a mixin earns its place by carrying state or behavior… otherwise it's a property" — the standing design philosophy behind every classification in this doc, still live and still the test applied throughout. Home candidates: `mixins.md § What Makes a Mixin Well-Formed` (outside my insert list — noted, not inserted) or left in the slate.

### Handoff (belongs in a doc outside my list)

None of the SHIPPED·UNDOCUMENTED cases surfaced — every code fact I verified was already covered by an existing subsystem doc (race.md, materials-response.md, textiles.md, fire.md, electricity.md, thermal.md, senses.md, slot.md, posture.md, magic-items.md, boundary.md, bulk.md, crafting.md, stacks.md, credential.md, spatial.md, encumbrance.md, concealment.md, stealth.md, ranged.md, conveyance.md, furnishing.md, light.md, locomotion.md, harm.md, metabolism.md, mortality.md, presentation.md, lint-family.md, pets.md, npc-dialogue.md, party.md, belief.md, trait.md, chattel.md, retail.md, banking.md, employment.md). Nothing to hand off.

### Status block

- Left: `Invisible` · `Sleeping`/`Resting` · `Writable` · `Mixable`/`Combinable` · smell trails and temporal persistence
  → `Invisible` · `Sleeping`/`Resting` (+ species circadian variance) · `Writable` · `Pushable`/`Pullable`/`Liftable` · `Steerable`/`Navigable` · smell trails and temporal persistence · the silent-discard gate · organism tissue-composition + species host-ranges · the § Out for now backlog. (`Mixable`/`Combinable` dropped — shipped as crafting's discrete-ingredient branch, see cuts above.)
- Size: a tail → a tail (concrete register) plus a standing backlog (§ Out for now, revisited per-cluster as content demands, not scheduled)
- Status: PARTIAL → PARTIAL (unchanged — a meaningful remainder still exists, both the concrete tail and the Out-for-now backlog)
