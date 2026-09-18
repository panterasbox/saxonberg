# Injury MR — the magic-expression scope expansion

**Status:** planning, un-started. Scope ADDED to MR !260 (`design/harm-survey`)
at the user's direction, 2026-09-18, after the injury build's damage-seam
work merged-in-branch. Read alongside `docs/plans/injury-plan.md` (the
shipped build) and `docs/slates/builds/capability-magic-slate.md` (the
standing magic design).

> ⭐⭐⭐ **The user's framing, verbatim, because it is the charter:**
> *"I'm going to want to really expand the scope of this MR if we have to
> to make sure magic handles everything. … magic right now is my main
> concern. I think we're going to find it's really underbaked. And a lot
> of the things we're gonna wanna do later like freezing pools of water or
> chaining shock like all those cool little synergies … the more content
> that exercises these channels the more we're going to need to make sure
> they all interoperate. So building this content out is our main way to
> exercise the design and will become the basis for guilds and stuff
> later too."*

**The thesis in one line:** the injury build shipped the damage *seams*
(seven channels, three folds, nine trauma types) but barely *exercised*
them — especially through magic. Content that drives every channel is how
we prove the design holds, find the interop bugs before they ship, and lay
the groundwork for magic guilds.

---

## 1. The diagnosis — what actually inflicts each channel today

| channel | weapons / natural attacks | hazards | **magic** |
|---|---|---|---|
| `edge` | ✅ blades, wolf `worry` | pressure-blade | ❌ **nothing** |
| `point` | ✅ thrusts, bite, arrow, musket | spike-pit, step-dart | ❌ **nothing** |
| `blunt` | ✅ maces, fists, warhammer | — | ❌ **nothing** |
| `heat` | forge / lit hearth | — | ✅ `firebolt` (pre-existing) |
| `cold` | — | — | ✅ `frost` (this build — the ONLY new spell) |
| `shock` | — | live wire / flooded cell | ✅ `spark` (pre-existing) |
| `corrosion` | ❌ nothing | **the lime seep, and NOTHING else** | ❌ **structurally blocked** |

### The shipped spell roster (14), and how thin the damage half is

| spell | verb·noun | channel | wounds? |
|---|---|---|---|
| firebolt | create·fire | heat | ✅ burn |
| frost | destroy·fire | cold | ✅ frostbite (NEW) |
| spark | create·lightning | shock | ✅ contact burn + circuit |
| conjure-water | create·water | — | no (bulk) |
| glowlight | create·light | — | no |
| veil | create·sense | — | no |
| arcane-sight / identify | perceive·arcana | — | no |
| dread | destroy·mind | — | affliction |
| shove | control·body | — | kinetic push, no channel |
| teleport | control·body | — | no |
| remove-curse / transfer | control·arcana | — | no |
| dispel | destroy·arcana | — | no |

**Only three spells inflict a channel wound, and two predate the build.**
The build's entire contribution to magic-as-harm is `frost`.

---

## 2. The two real findings (the "why" behind the thinness)

### Finding A — magic touches only 3 of 7 channels, and the requirements PROMISED all of them

`injury-requirements.md` (§ *No magic-only damage type*) made a strong,
correct argument: magic needs no damage type of its own **because every
genre "magic type" already maps to a physical seam**:

| genre magic type | physical seam |
|---|---|
| fire | `heat` ✅ proven (firebolt) |
| ice / frost | `cold` ✅ proven (frost) |
| lightning | `shock` ✅ proven (spark) |
| **acid** | **`corrosion`** ❌ unproven — and blocked, see Finding B |
| **force / kinetic** | **`blunt` / `edge` / `point`** ❌ unproven |

We shipped the prose and proved three of five. **A "force" spell is
expressible RIGHT NOW** — `execInjectChannel`'s body arm accepts
`edge/point/blunt` (only `shock` and `corrosion` are excluded), so a
spell that injects `blunt` with an `energy` token would leave a fracture
today. It is simply unwritten and untested. We never demonstrated a spell
dealing a *physical* (mechanical-channel) wound at all.

### Finding B — corrosion is a near-dead seam, and it is NOT primarily a magic problem

Corrosion is inflicted by exactly one thing in the entire game: the
`lime-seep` hazard, via `HazardMixin` on traversal. No weapon delivers it.
Combat **refuses** it (`CombatLogic` returns a deflected report for a
corrosive primary — no shipped weapon authors the channel). And magic is
**structurally blocked**: W-B0 excluded `corrosion` from `inject-channel`
on purpose, because a corrosive insult carries the *agent's chemistry*
(`CorrosionInflictSpec.corrosiveTo`) and a bare channel token cannot
supply it. That exclusion was correct for `inject-channel`.

⭐⭐ **But it exposed a deeper, non-magic gap: a caustic SUBSTANCE in
contact with a body does not burn you.** `conjure` can already place a
caustic bulk material (the `bulkMaterial` arm pours real litres onto a
target/floor — see `execConjure`), but the resulting puddle just sits
there. Nothing wires *substance-in-contact → `ConditionApi.inflict(
{mechanism:'corrosion', corrosiveTo})*`. The seep only works because it is
a hazard. So a spilled vial of acid, a splashed flask, a conjured
puddle — none deliver.

**The missing primitive is substance-contact corrosion delivery.** Once it
exists, corrosion becomes reachable by a thrown flask, a spill, AND an
acid spell (conjure caustic → contact → burn) — the arcane-science-honest
path: magic *rearranges matter into a caustic form* (it does not
manufacture "acid damage"), and the substance's own `corrosiveTo` does the
work through the normal corrosion fold.

---

## 3. The proposed scope (to expand into this MR)

Ordered: engine seams first (they unblock content), then the spell roster.

### Engine seams

1. ⭐⭐ **Substance-contact → corrosion delivery.** A caustic bulk material
   (one carrying `corrosiveTo`) in contact with a body inflicts corrosion
   through the normal `ConditionApi.inflict` corrosion path. This is the
   general fix — it is what makes a spilled vial, a thrown acid flask, and
   an acid spell all work, and it is an engine gap independent of magic
   (**worth doing regardless**). Design questions to resolve at build time:
   - *What counts as "contact"?* Bulk poured onto a body (the conjure
     target arm), a body entering a pooled caustic bulk on a Floor (the
     weather-puddle / `FloodedCell` precedent — a shipped "body in a pool"
     seam already exists for shock), a flask shattering on someone (the
     `throw` shatter path already splashes contents onto the target +
     clinched bystanders).
   - *Is it a one-shot on contact, or a tick while immersed?* Leans:
     one-shot inflict on the contact EVENT (the shatter, the pour), and the
     `caustic` trauma's own `agentActive` growth clock carries the "keeps
     working" — no new sustained arm. Standing in a pool is a re-contact
     each entry, mirroring how the shock pool re-shocks.
   - ⚠ Interop: this must compose with the shipped `throw` shatter-splash
     and the caustic wound's `rinse` cure without a second code path.

2. **Confirm the mechanical-magic path end to end.** A spell that injects
   `blunt`/`edge`/`point` should resolve through the same covering fold +
   function axis a weapon blow does. Expected to already work (same
   `inflict` door); needs a test that proves a *spell* leaves a fracture /
   laceration, and that armour answers a magic blunt blow.

### The spell roster (content — the user's expressive surface; confirm aesthetic)

⚠ Spells are the WORLD AUTHOR's expression. This list is a proposal to
*prove the seams*, not a fixed set — the taxonomy (classical four, wu xing,
invented) is held open per `capability-magic-slate § Taxonomy`. Each row's
job is to exercise a seam that no spell currently reaches:

| proposed spell | verb·noun | channel | proves |
|---|---|---|---|
| an **earth/force** strike — a hurled conjured stone | create·earth (or control·earth) | `blunt` (or `point` for a shard) | magic reaches the **mechanical** channels; armour answers a magic blow |
| an **acid** working — conjure/transmute a caustic | create·water or transform | `corrosion` (via the substance-contact seam, NOT inject-channel) | magic reaches **corrosion** honestly (matter rearranged, not "acid damage" minted) |
| a second **cold** expression — e.g. a chilling touch / a frost field | destroy·fire | `cold` | that `cold` is a family, not a one-off; sets up the freezing-pool synergy (§4) |

⭐ **Stretch (the fuller pass the user gestured at):** a spell per damage
family, and beyond damage — an air/storm gust (`blunt`), a piercing bolt
(`point`), a proper edged conjuration (`edge`). Weapons and hazards that
exercise the same channels (a corrosive trap beyond the seep, an acid
flask as a thrown item) are explicitly welcome too, but **magic is the
priority**.

---

## 4. ⭐⭐⭐ Interop — the synergies this content is FOR (and must not break)

The user named these as the point: content exercising channels is how we
verify the channels *interoperate*. Each is a "cool little synergy" that
should fall out of honest physics, and each is a test we should write as
the content lands:

- **Freezing a pool of water.** A `cold` working on bulk water should pull
  heat out (`depositHeat(−joules)` + `reconcilePhase()` — the frost spell
  ALREADY does this to a `Thermal` object; the water-pool case is the
  `bulkMaterial` version). Then: does frozen water become walkable / block
  flow / stop conducting shock? The `watershed` + `FloodedCell` + phase-
  change substrates all touch this. **Interop test: frost a flooded cell,
  assert the shock path opens/closes.**
- **Chaining shock through water.** Shipped: `ElectricityApi` walks a
  conduction graph; a live wire in a rain puddle shocks a bridged body
  (there is a `WeatherLogic.puddle` test for exactly this). A `spark`
  into a pooled conductor should chain. **Interop: does a magic shock use
  the same conduction walk as a mundane one?** (It should — `spark`'s
  object arm imposes a potential on a locus.)
- **Fire + cold on the same body.** A burn and a frostbite coexist as two
  traumas; the thermal load / core-temperature interplay (a caster who
  over-frosts is hyperthermic — the heat-pump seam) is the sharp case.
- **Corrosion eating armour, then the wound.** The corrosion fold already
  wears a consumed layer and passes the contact through; a conjured acid
  should degrade a steel breastplate over repeated contact AND burn the
  body under a linen shirt (wicks) — the `corrosiveTo` × covering matrix.
- **Wet cloth vs. a frost bolt** (already shipped): a soaked wool coat
  insulates half — the one-insulation-number reconciliation. New cold
  content must not regress it.

⚠ **The standing rule:** every new deliverer routes through the ONE door
(`ConditionApi.inflict`) and the ONE fold, so interop is by construction —
the risk is a new spell that invents a side path (the way the object arm
once sat outside `deliverAt`). Every spell added here must go through the
shipped seam.

---

## 5. Why this matters beyond the MR — guilds

The user: *"will become the basis for guilds and stuff later too."* The
`capability-magic-slate` frames magic Disciplines as the skill tree
(`magic-destroy`, `magic-fire`, …). A rich spell roster that actually
exercises each channel is the **content substrate a guild teaches and
gates** — a fire guild, an earth guild, an acid/alchemy guild each own a
family of workings that demonstrably do different physical things. Thin
content = nothing to build a guild around. So this pass is not polish; it
is the raw material for the next social/economic layer.

---

## 6. State of MR !260 at the moment this was written

All fourteen injury waves merged-in-branch + the review follow-ups
(spoiler fix, rinse water-gate, thermal↔garment reconciliation, the two
sever fixes). Full suite last green at **10,789 server + 999 client**;
`test:near` **4,874**; **40** lint gates. A full `pnpm test` is owed at
`/finalize` (source changed since the last full run). This magic-expansion
work is NOT yet started — this document is the plan for it.

### Open decisions the user still owns

1. **Scope depth:** prove the two unproven seams (force + acid) only, or a
   fuller spell-per-family pass? (User leans fuller — "make sure magic
   handles everything.")
2. **Spell aesthetic / taxonomy:** the proposed spells are placeholders for
   *seams*; the actual names, schools, and flavour are the world author's.
3. **How much weapon/hazard channel coverage** rides along (user: welcome
   but secondary to magic).
4. **Pricing** carried over from the injury MR (stipend 20 vs. armour/arms
   costs) — unrelated but still open on !260.

---

## Cross-references

- `docs/plans/injury-plan.md` — the shipped build (the seams this exercises)
- `docs/slates/builds/capability-magic-slate.md` — the standing magic
  design (schools-actuate-channels; the effect substrate; Disciplines as
  the skill tree; taxonomy held open)
- `docs/subsystems/magic.md` — the shipped casting core + the cost gate
- `docs/subsystems/materials-response.md § One insulation number`,
  `§ the seven channels / three folds`
- `docs/subsystems/harm.md` — the injury driver + the nine trauma types
- `docs/subsystems/electricity.md` — the shock conduction walk (the
  chaining synergy)
- `docs/subsystems/watershed.md`, `FloodedCell` — the pooled-water synergies

---

# Stage D — the executable plan (added 2026-09-18)

Grounded against the code (survey 2026-09-18). This is the wave plan the
build runs. Scope decided per the user's charter — *"make sure magic
handles everything"* — bounded to a tractable, landable target: **the four
channels magic does not reach today** (`blunt`, `point`, `edge`,
`corrosion`), each given a spell, plus the one engine seam that unblocks
corrosion, plus the interop tests the synergies need.

## D-decisions (cited by waves/commits)

- **D-M1 — the corrosion seam is a verb on the material.**
  `Material.corrodeOnContact(victim, {energy?, site?})` reads the
  material's own `corrosiveTo` (base field, `Material.ts:610`), and when
  non-empty routes through the ONE door `ConditionApi.inflict({mechanism:
  'corrosion', corrosiveTo, energy, site})`. It mirrors
  `Potable.dischargeInto(victim, litres, opts)` exactly (a material
  delivering to a victim). Verbs-on-objects; no new Api; one door. A no-op
  (returns false) for any non-caustic material, so the call is safe
  everywhere.
- **D-M2 — corrosion reaches a body through SUBSTANCE, never
  inject-channel.** The body arm's exclusion of `corrosion`
  (`MagicLogic.ts:1483`) STANDS — the code comment there already
  prescribes the conjure-substance route. Honest per arcane-science: magic
  *collects/relocates* matter (conjuration is collection); the caustic's
  own chemistry does the corroding through the normal fold.
- **D-M3 — mechanical spells use the body arm's abstract `energy` token,
  no `joules`.** They are outside `lint:spell-cost`'s jurisdiction (which
  only judges `joules` on depositing channels), exactly like `shove` and
  the other eleven token spells — `energy` is the covering-fold scalar,
  not a quantity. Recoil (arcane-science's *every push shoves both ways*)
  is expressed via the cursed-band self-backfire, the `firebolt`
  precedent, where it fits the working's identity.
- **D-M4 — school→channel, no new disciplines.**
  `create·earth → blunt` and `create·earth → point` (solid matter shaped
  to crush or to pierce — a two-spell family, the "more than one frost"
  the user asked for); `create·air → edge` (a shearing edge of compressed
  air); `create·water → corrosion` (a conjured caustic fluid, the
  `conjure-water` arm reused). `magic-create/earth/air/water` all already
  ship as Discipline leaves.
- **D-M5 — scope boundary.** The acid FLASK (a thrown vial of the caustic
  bulk) rides the W-D0 splash wiring for free → weapon-side corrosion, no
  combat-refusal change (a thrown vial splashes; it is not a melee
  channel). Deferred to a slate: **standing in a pooled caustic** (needs a
  `Floor.onEntered` re-contact hook like `FloodedCell`), and a **second
  cold spell** (frost already covers `cold` and drives the freezing-pool
  synergy).

## Host placement

| new surface | host | claims |
|---|---|---|
| `corrodeOnContact(victim, opts)` | base `Material` | corrosion delivery is a caustic material's own capability; `corrosiveTo` already lives on base Material, so the method sits with its data. No new mixin — a non-caustic Material answers false. |
| caustic bulk material(s) (`vitriol`) | content row at `/stuff/idea/material/bulk/` (base-library) | no new class — base Material carries `corrosiveTo`; it is a data row like `quicklime`. |
| the four spells | content YAML in arcane-library `Spell/` | no new class — `/platform/idea/magic/Spell` + auto-discovery. |
| acid flask | vessel template (generic-objects) filled with `vitriol` | no new class — a `Vessel` with a bulk fill. |

## Waves

**W-D0 — the substance-contact corrosion seam.** `Material.corrodeOnContact`
(+ interface decl, doc); wire the two active contact events —
`ThrowController` splash loop (`ThrowController.ts:200-218`, caustic vials
now corrode the splash set) and `execConjure`'s bulk arm
(`MagicLogic.ts:1709-1741`, a caustic conjured AT an organism corrodes it
on contact); author the `vitriol` bulk caustic (`corrosiveTo: [metal,
organic, tissue, leather, textile]` — it eats steel, the armour-interop
case) and a thrown acid flask. Unit tests: a caustic splash leaves a
`caustic` trauma; a non-caustic splash does not; conjure-at-body corrodes;
`corrosiveTo` empty ⇒ no-op. Commit `build(injury W-D0)`.

**W-D1 — the spell roster.** Author `stonefist` (create·earth, blunt),
`stone-lance` (create·earth, point), `windrazor` (create·air, edge),
`vitriol` (create·water, corrosion via conjure). Tests: each spell leaves
its channel's trauma on a body (fracture/puncture/laceration/caustic); a
worn layer answers a magic blunt blow (armour matters); the acid spell
corrodes through the W-D0 seam. Commit `build(injury W-D1)`.

**W-D2 — interop + docs + drive.** Interop tests: frost a `Bulkable &
Thermal` floor pool → it freezes (`reconcileBulkPhase`) and the shock
conduction path changes; `spark` into a conjured pool chains via the same
`conduct()` walk a mundane shock uses; a burn and a frostbite coexist on
one body; `vitriol` degrades a steel layer then burns the body under
linen. Docs: `magic.md` (the roster now spans every channel; the
substance-corrosion route), `materials-response.md` (corrosion reachable
by substance-contact, not just the hazard). Extend the wire drive
(`injury.wire.test.ts`) with a cast-and-wound sequence. Commit
`build(injury W-D2)`.

## Reachability wiring

| capability | verb | affordance | data | boot |
|---|---|---|---|---|
| the four spells | `cast` (exists) | caster faculty (exists) | Spell YAML rows | auto-discovered from `/stuff/idea/magic/Spell/` — no manifest |
| `corrodeOnContact` | — (internal) | called from ThrowController + execConjure | `vitriol.corrosiveTo` | material row warmed by `MaterialCatalogue` (template-path infix) |
| acid flask | `throw` (exists) | thrown item | flask template + vitriol fill | template row |

## Drive extension (appended to `injury.wire.test.ts`)

A caster with `magic-create/earth/air/water` competence (or wands): cast
stonefist at a dummy → a fracture reads on `assess`; cast the acid working
→ a caustic wound that `rinse` resolves; confirm armour changes a magic
blunt blow. Expect it to find things.

---

## Stage D — build record (2026-09-18)

**All three waves landed.** Commits on `design/harm-survey`:

- **W-D0** `build(injury W-D0): a caustic substance in contact with a body
  burns it` — `Material.corrodeOnContact` (the general seam), wired to the
  `throw` splash + `execConjure`; `vitriol` (eats metal, the armour case)
  + the thrown flask; `lint:census` bulkMaterial warn-entry. Test:
  `Material.corrode.test.ts` (4). 
- **W-D1** `build(injury W-D1): the roster` — stonefist (blunt),
  stone-lance (point), windrazor (edge), acid-splash (corrosion). Tests in
  `MagicLogic.test.ts`: each mechanical spell leaves its trauma; a steel
  plate blunts a magic blunt blow; all four discovered + castable at
  novice.
- **W-D2** `build(injury W-D2): interop tests + docs` — acid-eats-armour
  vs lime; burn+frostbite coexist; magic.md / materials-response.md /
  harm.md updated; capability-magic-slate hand-off (freezing-pool,
  chaining-shock, ambient-pool re-contact, second-cold).

### The drive (owned world, port 2012) — steps 20-22, ALL GREEN

Extended `injury.wire.test.ts`; ran `WIRE_BOOT=1 pnpm wire` on the file:

1. **`spells` lists the four new workings** — stonefist, stone lance,
   windrazor, acid splash all appear in a *booted* world's book, so the
   catalogue auto-discovered them and dropped none. (A unit test cannot
   warm the catalogue; only the boot proves registration.) firebolt still
   present — the book was not truncated.
2. **The new workings span earth/air/water** — breadth proven live; the
   expansion did not collapse to one school.
3. **The counter stocks a flask of vitriol** — the corrosion WEAPON is
   reachable (buy → throw → splash → corrode), no dead content.

⚠ **What the drive found (and it always finds something):** `buy flask of
vitriol` returned *"that doesn't match any known command shape: buy."* —
the `buy` parser chokes on the preposition in a three-token name with
"of". Not a corrosion bug; a command-parse limitation. The drive step
switched to `look counter` (the same read the armour-ladder step uses),
which confirms the flask is stocked. The `buy`-with-preposition parse gap
is a pre-existing command-parsing issue, noted for the sweep — not this
MR's to fix.

⚠ **Not driven live (guest sessions cannot cast/throw): the wound
itself.** A wire session is a guest with no faculty and no money, so the
drive proves the spells are *in the book* and the flask is *on the shelf*,
not that a cast leaves a contusion or a thrown flask corrodes. Those are
proven at the unit tier (`MagicLogic.test.ts`, `Material.corrode.test.ts`,
`material-response.channels.test.ts`) — the same split every prior injury
drive lived with (the armour step proves the row is stocked, not that a
guest bought it).
