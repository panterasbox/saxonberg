# Magic items slate (working doc) — NetHack's consumables + the BUC axis

> **Status: PARTIAL** — the substrate landed whole (2026-08-05): effect
> context, the three item classes (`Focus` cut), the charge economy, BUC
> (incl. multi-target `scope`), identification, the fade/defective-copy
> memory loop, distribution →
> [magic-items.md](../../subsystems/magic-items.md)
> **Left:** the item-by-item catalog walk, shipped as CONTENT packs —
> and ⚠ the cut is undecided (horizontal "twenty wands" vs a vertical
> "everything one shop stocks") · substrate gaps still open: the transient
> perception override ("perceive-as-if" — the gate itself shipped with
> concealment) · the push/shadow realization for owner-less behaviour
> (invisibility — every shipped modifier went by pull) · capacity
> reprofiling on polymorph · slot eviction on bodyplan change · the
> polymorph choreography that wraps `setSpecies` · a haste modifier on
> combat's derived tempo · a BUC-reading instrument (the Detection row's
> "later") · holy water (BUC-raising by `dip`, the consecration ritual; the
> anti-hollow reaction waits on presence-hollowing-slate) · create-monster
> / the procgen-NPC generator (shared with spawn-distribution-slate) ·
> whether shells are craftable or only found · combat items (combat has
> shipped; enchant/protection/reflection/conflict remain unauthored) · the
> blessing economy beyond v1
> **Size:** a wave — the catalog ships as content packs (§ Where the
> catalog work actually lives) and each substrate gap rides the build that
> owns it (polymorph · combat · spawn-distribution · presence-hollowing)

> ### ⭐ Where the catalog work actually lives
>
> Not here, and not in a build. **The remaining work is CONTENT, and
> content ships as a pack** (`packages/content/`, the `PackApi` reconcile
> installer — see [content-packs.md](../../subsystems/content-packs.md)).
> The substrate it needs is already merged; a new wand is a template and
> a spell seed, not a mixin. This slate is the *source* the pack authors
> read from, which is exactly what a tail is for.
>
> ⚠ **The open question is how to CUT it.** The shipped packs are scoped
> by substrate area (`base-library`, `species-and-names`,
> `arcane-descriptors`), and "round out the assortment" is a horizontal
> cut across every item class at once — twenty wands, thirty potions.
> That is the shape most likely to produce a pile of variations nobody
> meets. The alternative is a **vertical** cut: everything one shop
> stocks, or one trade's line end to end, so each pack is a place a
> player can actually go. Decide that before authoring, because it is
> the difference between a catalog and a location.
>
> *(Original status, 2026-07: design in progress — the BUC substrate is
> settled end-to-end; the item catalog is mapped but not yet spec'd.)* The premise:
> NetHack's potions / scrolls / rings / amulets are a stress-test suite for
> the immsim substrate — most of the catalog *lands somewhere* on systems
> already shipped (belief, augmentation, thermal, metabolism, respiration,
> senses, teleport, reserve) rather than needing new machinery. This slate
> captures (1) the reformed **blessed / uncursed / cursed** model as a real
> system, and (2) the catalog map that is the backlog for the item-by-item
> walk.

See also:
⭐ **[discovery-slate](../builds/discovery-slate.md) (2026-08-02) — HOW THESE GET
INTO THE WORLD**: the distribution algorithm (stock = accumulation −
withdrawal), *authors describe / the world weighs*, **rarity derives from
the grid cell via the arcane price list**, effect-tags vs material-tags,
concealment-as-a-vector, and the almanac as the readable face. Read it
before spec'ing the catalog — **it decides what an item must declare.** ·
[pharma-slate](../builds/pharma-slate.md) (**potions and scrolls are pharma's
product line**; the credence-good thesis covers the whole consumable
category) ·
[identification-slate](./identification-slate.md) (**the sibling
axis** — item *identity*, "a blue potion" → "a potion of healing", the
deductive class-level game; BUC is the orthogonal *instance* axis) ·
[belief.md](../../subsystems/belief.md) (recognition/identification/regard
realms — known-BUC is a new realm here; `Disguisable` is the appearance mask) ·
[augmentation.md](../../subsystems/augmentation.md) (augment-confers-mixin —
**a worn ring/amulet is a wearable augment**; cursed = the release gate vetoes
unequip) · [crafting.md](../../subsystems/crafting.md) (`Grade` ordinal
value-object — the precedent for the `Blessing` value-object) ·
[vitals.md](../../subsystems/vitals.md) (no HP scalar — why "healing" defies
the model) · thermal / metabolism / respiration (resistances land here, not on
combat) · combat (being designed separately — the deferred half of the catalog).

---

## Two axes, kept apart

*Shipped — identity is the per-viewer belief store, BUC a per-instance `BlessingBucket` on the item (not a belief realm): [magic-items.md](../../subsystems/magic-items.md) § Blessed means EFFICIENT, § BUC and merge behaviour; the identity axis is [identification-slate](./identification-slate.md)'s.*

## The effect substrate (Gap 0) — what "using an item" does

*Shipped — `Consumable` (`lib/magic/Consumable.ts`, composed by `Scroll` only), `Effect` + `EffectContext`, `MagicLogic.discharge`; potions ride the MATERIAL through `Bulkable.ingest` + `PotableMixin` rather than `Consumable`, and the use-verbs are `read` · `zap` · `drink`/`quaff` (no `apply`): [magic-items.md](../../subsystems/magic-items.md) § The effect context, § The three item classes, § Potions ride the MATERIAL, § Verbs.*

### Two effect families

*Shipped — `MagicEffects.familyOf` (`lib/magic/Effect.ts`): `emit-field`/`cloak` are modifiers, everything else impulse: [magic.md](../../subsystems/magic.md) § Impulse vs modifier; the potion/mug convergence is the `BulkableApi.ingest` bridge, [magic-items.md](../../subsystems/magic-items.md) § Potions ride the MATERIAL.*

### Condition vs Shadow — the fact/realization split (NOT redundant)

*The two mechanisms are documented — conditions in [vitals.md](../../subsystems/vitals.md) / [harm.md](../../subsystems/harm.md), shadows in [call-security.md](../../subsystems/call-security.md); neither is inert now.*

A fact reaches behavior two ways, and **the rule is:**

> **Fact → `Condition`. Realize by *pull* by default; use a *shadow* (push)
> only when the affected behavior is owner-less.**

- **Pull** — a driver/getter reads the condition record and folds it in (vitals
  band, metabolic drain, thermal/damage intake). This is how the condition
  system is *already designed*. Cheap. The default. Covers poison, disease,
  trauma, resistances, regeneration, slow-digestion.
- **Push (shadow)** — the fact attaches a method-override so every caller sees
  modified behavior without knowing conditions exist. Needed **only** when the
  target method is scattered across many call sites with no single owner — a
  short list: **perceivability** (invisibility) and **presentation/recognition**
  (disguise/polymorph). ~3–4 effects in the whole catalog, not half.

Neither subsumes the other: shadows can't be the fact-store (attachment doesn't
persist → progression state evaporates on reload); conditions can't cleanly
override diffuse behavior (would thread condition-checks through all of
perception). They compose — **Condition is always the substrate; a shadow is an
optional realization for the diffuse minority**, re-materialized from the
persisted condition on load (so the Tier-5 "attachment doesn't persist" gap is
irrelevant — persist the condition, re-attach the shadow).

*Healing-as-condition-clearing and combat writing trauma into the same table shipped: [harm.md](../../subsystems/harm.md) (`relieve`, `treat`, reconcile-on-read wounds).*

## BUC as a system — potency on the item's own axis

*Shipped verbatim: [magic-items.md](../../subsystems/magic-items.md) § BUC — a potency level on the item's own effect axis, § The engine owns the ORDERING; the working owns the FUNCTION, § Cursed sticks — the release gate.*

### The two authoring shapes = the whole effect surface

*Shipped — `Blessing.pick`/`scale` engine-side over band-varying authored fields; the monotonic contract is enforced as presence-not-quality by `lint:blessed-bands`: [magic-items.md](../../subsystems/magic-items.md) § Potency: scale it if it has a size, § Composing `Blessable` obliges you to author it.*

### Notes on the reform's edges

- **No-ops** are now expressible precisely: a no-op is only when *uncursed*
  potency maps to zero effect — reserved for genuinely inert baselines (plain
  water: uncursed = just water, blessed = holy, cursed = unholy).
- *Cursed-is-actively-bad shipped — firebolt's cursed backfire, remove-curse's sign inversion, and identify's cursed band planting a false identification (`identify.yaml`, `sense: misidentify`): [magic-items.md](../../subsystems/magic-items.md) § The engine owns the ORDERING, [belief.md](../../subsystems/belief.md) (`believedName`).*

## Engine shape — all reuse, one new value-object

| Piece | Lands as | Precedent |
|---|---|---|
| **True BUC** | a `Blessing` ordinal value-object in `lib/blessing/` (rendered as *words*, never a number) + a thin `BlessableMixin` | `Grade` (crafting, weakest-link ordinal) |
| **Known BUC** | a new belief realm, sibling to recognition/identification/regard — "you don't know its BUC" falls out of `RecognitionApi.describe` | identity realm |
| **The stick** | wearable/augment release gate vetoes unequip when `getBlessing()===cursed` | `RequiresActive` / embodiment slots |
| **Effect** | `scale` / `pick` primitives on a thin `BlessingApi`, monotonic contract | — |
| **Detection** | v1 = the identify path (id scroll). Later = an *instrument* in the family you already have (`analyze *` / `feel` / Barometer) — point a sanctity reader at the item, fill the belief realm | identification-slate instrument seam |

## Opt-in, and where BUC comes from

*Shipped — opt-in per template (`BlessableMixin` on `Wand`/`Scroll`/`Ring`/`Amulet`); spawn state drawn at the random mint from `blessingOdds` (item baseline, zone override) by the residency spawn sweep, the location-side bias as `stocks`/`favours`; laundering is the `remove-curse` working: [magic-items.md](../../subsystems/magic-items.md) § Scoped to things with an effect axis, § Generation odds, § Remove curse; [residency.md](../../subsystems/residency.md) (the zone fields); the creature half stays with [spawn-distribution-slate](../builds/spawn-distribution-slate.md).*

## Sanctity, holy water, and what "good/evil" means here

Holy water is the probe that forced this, and it exposes the deepest finding in
the walk. The short version of the canon (**source of truth:**
[story-bible.md](../../story-bible.md) §Alignment — two axes / §Evil — the
hollowing, both `[settled]`; the fuller design is the alignment build's
`alignment-slate.md`):

### Good/Evil is not morality — it's presence vs. the hollowing
- **Good** = *serves the conditions of experience* — recognition, presence,
  treating a person as a person. **Evil** = *"the erasure of the line between
  person and thing"* — capture, the optimizer eating experience as fuel, the
  Metric / the Feed, *"a world that runs perfectly and contains no one."*
- **The Good/Evil axis is overt and cosmic; every player is locked Good;**
  Neutral/Evil are NPC-only. (The *hidden/derived/reflective* treatment — mirror,
  never-on-the-sleeve, no-mechanical-reward — is the **Law↔Chaos** axis, and the
  private moral self-view. Do not confuse the two.)
- Evil-as-a-**principle** is **undetectable by design**: it wears any face (*"the
  face is the forgery"*), the scariest agents are *unwitting* (*"you can't tell —
  including about yourself"*). That undetectability **is** the game's central
  question, and it *can* take a human as readily as a construct (*"'constructs
  are evil' is reskinned bigotry"* — protects the synth/clone/android peoples).

### Consequence for reactive items — the operational rule
> **A consecrated item may NOT react to moral valence (undetectable — and a
> detector would gut the discernment thesis) NOR to substrate/species (bigotry).
> It reacts to *the hollow* — experiential-absence: the animate-but-no-one, the
> optimizer's soulless vessels, the hollow-passing-as-alive.**

- Keys on **is-anyone-home**, not flesh → synths/clones/androids (present) never
  react; captured *persons* (still have experience) never react — so the
  warm-faced-deceiver drama stays intact.
- Bites only the **manifest** hollow (legibly empty), silent on the masterwork
  forgery whose hollowness is the undetectable horror → *"you can't tell"* holds
  where it matters.
- **Safe by construction:** players are all Good/present, so it can only ever act
  on hollow NPC content — NetHack's "burns the unholy" smite drops in with zero
  PvP hazard, and on-theme (all-Good protagonists vs. the hollowing).

### Holy water, decomposed
- **BUC-blessing (potency)** — orthogonal, secular, the real v1: raises another
  item's blessing (the `dip`/`apply` target grammar, the laundering loop).
- **Making it** — a **Chapel consecration ritual** (the *worship* layer, kept
  strictly distinct from derived alignment; "worship vs alignment is the drama").
- **Anti-hollow reaction** — a **nature-conditional effect reading a `Condition`**
  (unifies with Gap 0), deferred behind the substrate below. Unholy water is the
  symmetric twin (an instrument of the Feed — *hollows the present*).

### The gap it exposes (bigger than a potion)
The engine has **no notion of experiential presence vs. hollowness as a physical
agent state** — not "undead" (too narrow/genre), not alignment (wrong layer,
undetectable). It sits adjacent to `getConsciousness` (vitals), the
Agent/Creature split, and belief's very *person↔thing line*, but nothing models
*the hollow*. This is the **literal physical shadow of the cosmology** → its own
[presence-hollowing-slate](../builds/presence-hollowing-slate.md); consecrated items are
its first consumer.

## Polymorph — the body-swap (cheaper than it looks)

> **⚠ RESOLVED 2026-08-03 (requirements D18, built).** The section below
> is retained for its architectural findings, which remain accurate — but
> its premise is superseded on both halves:
>
> - **Item polymorph is SEMBLANCE, not transformation.**
>   `arcane-science.md` prices material transformation out by ~10⁶
>   (chemical bonds in eV against nuclear binding in MeV), and reforming
>   every bond in a body is prohibitive. So item polymorph is a **shadow
>   on presentation and recognition** — `Sense`, not `Transform` — which
>   is exactly what this slate already lists shadows as being for. The
>   `transform` verb is priced out in `lib/magic/PriceList.ts` rather
>   than merely absent, so the model states the reason.
> - **Actual body-swap defers to `presence-hollowing-slate.md`**, where
>   it belongs: it is the movement of a *presence* between bodies — a
>   reified inhabitant-relation on an unconfirmed noun — not a mutation
>   of an attribute.

Predicted to be the biggest structural gap; it isn't — the architecture is
surprisingly ready, for an unplanned reason.

- **The body is fused into the one `Avatar` object** (`Avatar` →
  `ShelledCharacter` → the Agent/Creature/Organism/Vitals/embodiment stack).
  Species is **not** frozen: `OrganismMixin` holds `_speciesPath` as a mutable
  resolve-on-read pointer, and **`setSpecies()` already exists.**
- **The "`getSpecies()` HMR discipline" already makes the big derivations live**
  (nothing caches species-derived state, so it can hot-reload):
  - **Capabilities** — `MixinApi.getActiveMixins` unions the **current** species'
    `innateMixins` live (mirror of `AugmentMixin.confers()`). Free.
  - **Vitals** — reads `getSpecies().getVitalProfile()` / `.getBodyPlan()`
    *"never persisted/cached."* Bands + anatomy reprofile on read. Free.
- **No identity-transfer problem.** Same `stuffId` / chronicle / account —
  polymorph *mutates an attribute of you*; you stay you. The fusion is what makes
  it clean.

**What actually breaks = stored-state reconciliation at the swap boundary** (not
physics — `setSpecies` is a bare write that fires nothing):

1. **Capacity reprofiling** — vital *bands* re-derive, but *current* reserve
   scalars are stored (human@100/100 → dragon@100/1000). Policy needed
   (preserve-ratio / -absolute / refill). **Same gap as restore-ability** —
   polymorph is its extreme case.
2. **Slot eviction** — `slotClaims` come live from the bodyplan, but worn/wielded
   *occupants* are stored relations. Polymorph into a footless form orphans your
   boots. Embodiment has **no "slots-changed, evict" path**.
3. **Recognition break** — recognition keys on the persistent referent (still
   you), so it *won't* break on its own — wrong for polymorph. Reuse the
   **disguise seam** (appearance ≠ identity, relearn on re-perception).
4. **Driver re-stamp** — thermal (mass/material), respiration (medium),
   encumbrance (baseMass): fire the **existing move/`onMoved` restamp fan-out**;
   polymorph is just another trigger.

So the build is: **wrap `setSpecies` in a choreographed `Polymorph` transition**
firing those four reconciliations — composition over existing seams.

**The contrast worth banking:** polymorph is easy *because* body is fused to
identity; **the hollow (from sanctity, above) is hard for the same reason** — it
needs *agency absent from a body*, but the Agent layer is class-fused into
Character. Of the two body-probes, **presence-vs-hollowing is the genuinely
structural one**; polymorph just needs a choreography.

*(Object-polymorph — item → another item — is a separate, smaller thing: a
reclass/reclone through the clone pipeline.)* Thematic flag (not mechanical):
polymorphing a player *out* of their chosen species-persona brushes the
change/genocide nerve (casting-by-recognizable-persona + race-allegory) — a
deliberate "players, or NPC/enemy-only?" call, later.

## Scrolls — reading, forgetting, spawning

A scroll is a `Consumable` like a potion (no new *effect* machinery), but the
use-verb differs, and the class exposes three things:

- *Reading's gate shipped — `read = perceive + decode`, vision+light or touch by modality, literacy as a withheld-script seam: [magic-items.md](../../subsystems/magic-items.md) § `read` decomposes into perceive + decode; the perception gate itself is [concealment.md](../../subsystems/concealment.md)'s. Confused-reading stays in the catalog map (§ C).*
- *Amnesia's rule shipped as doctrine — it strips the held specification, never the chronicle claim: [magic-items.md](../../subsystems/magic-items.md) § Spellbooks and memory. The scroll itself stays in the catalog map (§ C).*
- **Create-monster — in bounds (procgen NPCs), a player-triggered procgen-NPC
  spawn.** The "expensive carves" principle guards the **bespoke named cast**,
  not the **populace**; the economy design's **procgen ⊕ bespoke** split is the
  reconciliation. Reuses char-gen `NameBank`/species-dossier/`PersonaMixin` + the
  `Login.mintRandomGuestAvatar` mint precedent; the gap = a **general reusable
  procgen-NPC generator** (drive that machinery programmatically). **Extends the
  spawn-distribution substrate from items to creatures** — likely one weighted
  populate, two output kinds (items + NPCs), the bespoke cast explicitly outside
  the table. Disposition/hostility-on-spawn = behavior/brains + deferred combat.

Rapid-clear (cross-ref covered gaps): **light/darkness** → Light subsystem
(clean) · **remove curse** → BUC laundering (un-sticks via the release gate) ·
**magic mapping** → map-slate + transient-reveal/knowledge-injection (as
detection) · **scare/tame** → regard + behavior/brains · **enchant/charging** →
grade + reserve-recharge (combat-adjacent) · **teleport/punishment/genocide** →
already walked (done / encumbrance / thematic Bucket D).

## Rings & amulets — the clean class

*D8/D11 shipped: [magic-items.md](../../subsystems/magic-items.md) § Wearing sustains; releasing releases, § Cursed sticks — the release gate.*

*Superseded by the code — a ring is `Wearable` + `Charged` (`arcana/src/thing/Ring.ts`) discharging a `sustained` Condition on the wearer from the slot chokepoint, not an `Augment` that `confers()`; the release gate reads `Blessable.tryRelease`: § Wearing sustains.*

- *The veto layer shipped — `Vitals.canAfflict` in the `canEvict` shape, permission by default, immunity expressible without a registry: [magic-items.md](../../subsystems/magic-items.md) § The condition veto. No shipped ring confers an immunity yet (catalog).*
- **Convergence — ESP is the perception-side of presence/hollowing.**
  `VerbalESPModality` / `EmotiveESPModality` already exist, so amulet-of-ESP is a
  grant-a-modality correlary. ESP senses mind-activity = senses *presence*; the
  hollow is **silent to ESP**. So the presence/hollowing substrate now has **two
  consumers from opposite ends** — sanctity *reacts* to the hollow, ESP *fails to
  perceive* it. Two independent features on one axis = build-signal.
- **Cursed exemplar — amulet of strangulation** = **stick-curse + choke
  condition**: a cursed amulet you can't remove (release gate) that afflicts an
  asphyxiation condition (respiration driver). The whole reformed-BUC + condition
  + cursed-sticks model in one item.
- Rest are conferred-while-worn modifiers over covered gaps: resistances →
  thermal/metabolism · regen/slow-digestion/hunger → vitals/metabolism pull ·
  searching/warning/stealth → perception-gate · levitation/invis/teleport/polymorph
  → covered · life-saving → death-seam · breathing/vs-poison → respiration/metabolism
  · reflection/conflict/aggravate → combat+behavior · change(sex) → SexedMixin ·
  adornment → regard.

## Charge, decay, and the durable-goods problem

### The question the thesis leaves open: who is the endpoint?

*Superseded by [arcane-science.md](../../arcane-science.md) § The second quantity — a shell holds MANA by mana density, not energy by energy density (the 2026-08-11 revision); the classes table shipped with `Focus` cut: [magic-items.md](../../subsystems/magic-items.md) § The three item classes.*

### The endpoint decides who absorbs the reaction

*Shipped — recoil lands on `ctx.source`; kinetic charged items must be braced; a spark wand is safer than the cast: [magic-items.md](../../subsystems/magic-items.md) § The three item classes (the consequences list).*

### The numbers

*Superseded on its footing (3 MJ/kg of energetic solid — the energy-density reading [arcane-science.md](../../arcane-science.md) § The second quantity replaced); the clock shipped as `magic.charge.decayPerGameSec` and the canon line as* magic perishes, matter doesn't*: [magic-items.md](../../subsystems/magic-items.md) § ChargedMixin's second consumer.*

### The durable-goods answer: bound the charge, not the shells

*Shipped verbatim — `S* = inflow / d`, two dials whose ratio is the answer, recharging is a service, you find shells and buy charge: [magic-items.md](../../subsystems/magic-items.md) § The charge economy.*

### Wearables are charged too — and they are the worst case

*Shipped — the `alwaysOn` standby draw (`magic.charge.standbyWatts`), cursed = stuck AND discharging into you (`Blessable.tryRelease`): [magic-items.md](../../subsystems/magic-items.md) § Wearing sustains, § Cursed sticks, § ChargedMixin's second consumer (*always-on is the expensive mode*).*

### Foci perish too — pattern rot

*Superseded — `Focus` was cut before merge and D9's pattern-rot clock went with it: [magic-items.md](../../subsystems/magic-items.md) § The mana potion is metabolic (the ⚠ box), [implements-slate](./implements-slate.md).*

### What it costs to build

*Shipped — `Charge.RESERVE_KEY`, `reconcileCharge`, the `recharge` verb (now through a coupling), `alwaysOn`, the `magic.charge.*` dials.*

Open for the roster pass: per-cell charge costs (they derive from the
price list), whether shells are craftable or only found, and whether a
focus's pattern can be *refreshed* by the same `recharge` path or needs
a distinct re-impressing act.

## Gap roundup — the build work-list (ranked)

The payoff of the walk: "implement NetHack items" resolves to a small set of
**substrate gaps**, most already half-built. Ranked by how much they unlock ×
buildable-now.

*Tier 1 shipped whole — `Consumable`/`Effect`, the BUC substrate, and the impulse/modifier line realized by pull (a `SustainedEffect` Condition): [magic-items.md](../../subsystems/magic-items.md), [magic.md](../../subsystems/magic.md) § Impulse vs modifier.*

**Tier 2 — real gaps, buildable, each lights a cluster:**
4. **Perception gate + transient override** (invisibility, detection, reading,
   searching, warning, stealth — 5+ consumers). The gate is a stub; MQL routes
   around it. Make it gate, and be transiently overridable ("perceive-as-if").
5. *Shipped — `Vitals.canAfflict`: [magic-items.md](../../subsystems/magic-items.md) § The condition veto.*
6. **Capacity-reprofiling policy** (restore-ability + polymorph) — when a max
   changes, what happens to current reserve/vital scalars.
7. **Actor tempo/haste** (speed) — no per-actor action-rate exists. **Shared with
   combat** (initiative).

**Tier 3 — bigger / own-pass / shared with other builds** *(both spun out
2026-07 into their own slates):*
8. **Presence-vs-hollowing agent-state** (sanctity + ESP) — the deepest, the
   cosmology's physical shadow. → **[presence-hollowing-slate](../builds/presence-hollowing-slate.md)**.
   Shared with alignment.
9. **Spawn-distribution substrate** (BUC-state distribution + create-monster) — one
   weighted populate, two output kinds (items + NPCs). →
   **[spawn-distribution-slate](../builds/spawn-distribution-slate.md)**. Shared world-wide.
10. **Procgen-NPC generator** (create-monster) — reusable species+traits+name+behavior
    mint (reuses char-gen/`NameBank`/`mintRandomGuestAvatar`). Folded into
    [spawn-distribution-slate](../builds/spawn-distribution-slate.md) (the creature-output half).
11. **Polymorph choreography** — mostly reconciliations over existing seams (capacity
    reprofile #6, recognition-break=disguise, driver re-stamp=move fan-out); one new
    sub-gap: **slot-eviction on bodyplan change**.

**Decisions / deferrals (not build-gaps):** the **stat-block absence** (cut/redirect
gain-ability/gain-level — no attributes by design); **knowledge fragmentation** (amnesia
respects the append-only chronicle — no work); **language/literacy** (reading's soft dep
on the deferred language subsystem); **combat items** (enchant/protection/reflection/
damage/conflict/shock-resist wait on combat).

## The catalog map — the backlog for the walk

Bucketed by *how each item lands against what's shipped*. Representative +
sharp cases; the rest of each class falls in the same bucket unless noted.

### A — Direct translation (substrate exists)
A ring/amulet is a **wearable augment that `confers()` a mixin while worn**;
cursed = stuck. Resistances are mostly *existing drivers*, not combat.
- booze → metabolism `getBAC` (done) · fruit juice/water → bulk `drink` ·
  slow digestion / hunger → metabolic basal-drain · regeneration → vitals
  recovery · magical breathing → respiration (water-breather inversion) ·
  vs-poison / poison resistance → metabolism toxin · **fire/cold resistance →
  thermal (shipped!)** · blindness → `VisionModality` off · teleport +
  control → `teleport` verb + destination prompt · see-invisible / ESP →
  senses + belief · gain energy → reserve (mana-as-content) · **enlightenment
  → un-redact your own self-views** (traits / standing / competence bands /
  chronicle, all shipped).

### B — Reconceive (the model defies NetHack)
- **healing / extra / full healing** — *the big one.* No HP scalar → nothing
  to "restore." Becomes **condition-clearing / vitals-sign restoration**. This
  is the cleanest forcing function in the exercise and it pressures the combat
  design (what *is* damage?) — worth doing early.
- **life saving** → intercept the vitals **death seam** (exists).
- **ring of adornment** (NetHack near-useless) → plug into the **regard / social
  / renown** layer. Poster child for the no-op reform.
- **punishment (ball & chain)** → *encumbrance / haulage*, not combat — a
  cursed heavy thing you can't drop, drain on locomotion. Whole load-bearing
  ladder reused.

### C — Stresses a system on purpose
- *identify shipped end to end — the mark comes from a `PromptApi.mqlObject` prompt and the band ladder is `[misidentify, one, whole inventory]` (`identify.yaml`): [magic-items.md](../../subsystems/magic-items.md) § A working that needs a mark ASKS, § …and the high end must not betray the working's identity (the ✅ note).*
- **object / monster detection, magic mapping, gold/food detection** →
  stresses **MQL** (scoped queries rendered to the player; reveal topology).
- **hallucination** → stresses **rendering** (a per-viewer `MarkupAugmenter` /
  recognition distortion rewriting names & descriptions — a genuinely new
  belief/render consumer).
- **confusion** → stresses **command-parsing** (garbled/misdirected input).
- **amnesia (cursed)** → stresses **belief** (wipe recognition memory / forget
  the map — belief-store deletion). Best cursed scroll.
- **stinking cloud** → lights the *contaminant* column left laid-unread in
  respiration/biome.

### D — Thematically loaded (stop and think, not mechanical)
- **genocide** — mechanically an MQL seed over the species/clade taxonomy; but
  given the deliberate **species-as-race-allegory / anti-essentialist** stance,
  "erase a species" is radioactive on purpose. Not a build question — a
  *should-we / what-does-it-mean* question. Instinct: not a power tool; either
  cut or a deliberately horrifying, narratively-weighted forbidden thing.
- **change (sex) / polymorph / unchanging** — `SexedMixin` + `OrganismMixin`
  make it mechanically fine, but species-swap touches the same nerve.

### E — Explores genuinely undesigned space
- **enchant weapon/armor, charging** → a `Grade`/quality bump once combat
  defines what enchantment *modifies*.
- **taming / scare monster** → **regard + behavior/brains** (flip an NPC's
  disposition) — a *reputation* consumer more than combat.
- **speed / haste** → activity/engagement pacing on the game-time substrate.
- **protection / increase damage-accuracy / reflection / conflict / warning /
  aggravate** → **combat** (hand to that session; conflict is a *brain* thing,
  not a stat).

## Deferred / own-slate

- **[spawn-distribution-slate](../builds/spawn-distribution-slate.md)** — the weighted-table
  populate substrate (items + procgen-NPCs). *Spun out 2026-07.*
- **[presence-hollowing-slate](../builds/presence-hollowing-slate.md)** — the
  presence-vs-hollowing agent-state (sanctity + ESP consumers). *Spun out 2026-07.*
- **combat items** — bucket E's combat half + resistances' shock leg.
- **the blessing economy** beyond v1 (altars, sacrifice-to-convert, holy-water
  farming) — v1 ships spawn-state + one remove-curse + honest holy water.
- **genocide's disposition** — a narrative/stance call, not a mechanics call.
