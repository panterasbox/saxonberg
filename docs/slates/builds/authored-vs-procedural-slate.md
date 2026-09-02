# Authored vs procedural slate — what a hand-placed thing IS

> **Status: captured 2026-09-02, not designed.** Forced by the metal
> chain's glowcap. **Named by the user as the major dependency, and
> deliberately reframed by them:** the thing we need is *not* foraging.
>
> > *"it's not even foraging we need but we need to know how bespoke
> > authored content works when you're explicitly bypassing the foraging
> > subsystem that more procedurally generated content \[uses]."*
>
> Foraging is one consumer. The question underneath it is the authoring
> model, and it is upstream of [discovery](./discovery-slate.md),
> fungiculture, and every later ecology.

---

## The forcing case, in one room

Rejection's Ferrow diggings ship **both layers, side by side, with no
relationship between them**:

| Layer | What ships | State |
|---|---|---|
| **procedural** | the zone's `stocks:` table — `cricket: 40`, `delve-rat: 12`, `pale-grazer: 3` | ⚠ **inert and silent** |
| **authored** | a glowcap bed in a niche, hand-placed in specific rooms | ⭐ works, and is the only ecology a player meets |

Both are broken in the same way, and it is the way that matters: **each
one is a claim the code does not make true, and nothing anywhere said
so.**

- The `stocks:` table is read by `ResidencyLogic` **keyed on the
  candidate's `censusKey`** — it walks spawn candidates and asks whether
  the zone declared a count for each. Stage A ships the three species as
  *taxonomy only*: no creature rows, no `censusKey`. So no candidate ever
  carries those keys, the three lines are never read, and **a stocks
  entry matching no candidate is not an error — it is absent.**
- The glowcap is a `PortableLight` with mushrooms in its description. It
  does not grow, does not die, composes no `GrowingMixin`, and carries no
  `_speciesPath` back to the `Mycena lucifera` row that exists for it.
  Three files asserted that it dies and must be replaced; none of it was
  implemented. (Removed 2026-09-02.)

⭐ **The interesting part is not that both are unfinished. It is that the
two layers cannot see each other.** One species is in a table and not in
the world; one species is in the world and not in a table. Nothing in the
codebase relates those two states, and no gate notices either.

---

## What already exists to build on

[discovery-slate](./discovery-slate.md) settled the authoring UNIT and
the honesty rule, and both hold:

> **Author the biome. Override the exception.**

> **A distribution table that is not visible in the prose is a LIE ABOUT
> THE ROOM.**

The substrate is shipped too — `Biome`'s outward-walking chain, Zone
field inheritance, `SpatialZone.stocks` / `favours` / `blessingOdds`, and
`SpawnTable.draw` with its region + affinity weighting.

## What it does NOT cover — the actual gap

*Override the exception* answers **"this place is unusual, bias the
table."** It does not answer any of:

1. **A thing that is only ever hand-placed and is in no table at all.**
   The glowcap. Is it an ecology member the tables should know about, or
   furniture that happens to be alive? Today it is neither, silently.
2. **What a procedural pass does to a room an author has furnished.**
   `ResidencyLogic`'s own comment says authored placement *"suppresses
   random spawning"* — so an author who furnishes a room has, as a side
   effect, opted it out of the ecology. Nobody decided that; it fell out.
3. **Whether the two layers must agree, and who checks.** A species can
   exist as taxonomy with no way to occur; a `stocks:` key can name
   nothing. Both fail closed and silent, which is the failure mode this
   codebase keeps rediscovering (the reference-Idea trap, `feel`/`taste`,
   `commandContributions` on a row).
4. **What "cultivated" means as a category.** A crop is neither wild
   occurrence nor furniture: somebody planted it, it grows on the shipped
   growth model, and it is *at a place on purpose*. That is a third thing
   and the model has no name for it.

⚠ And note what does **not** exist: **there is no `forage` or `gather`
verb anywhere in the repo.** What ships is `harvest`/`pick` on something
already grown, and `search` (concealment). So the wild half has no act at
all — which is why this is a dependency and not a polish pass.

---

## The concrete follow-on: fungiculture

The glowcap wants to be a crop, and the shipped growth model fits a
saprotroph better than expected. The four limiting factors are
`min(water, light, root, nutrient)`, and a fungus inverts exactly one:

- **water** — the damp, which a mine has in quantity
- **root** — the rotted-wood substrate the bed is packed with
- **nutrient** — the wood itself
- **light** — ⭐ free. `satLight` is `ramp(lux, luxDarkAt, luxHappyAt)`,
  and `ramp` returns `1` unconditionally when `hi <= lo`. **Authoring
  both bounds at `0` gives "thrives in total darkness" with no kernel
  change**, and a mine becomes *a farm with inverted conditions* rather
  than a special case.

Two obstacles, both real:

1. **A growing light needs `LightSourceMixin` AND `GrowingMixin`, and
   `Plant` is a kernel class** — a pack cannot add a mixin to it (the
   `MineZone` lesson — though note that one resolved the other way:
   `deposit` became a kernel `SpatialZone` field and the subclass was
   deleted, because the ground is something the kernel already models. A
   growing LIGHT is not). It wants a class like `LightSourceMixin(Plant)`.
2. **Which pack owns it.** Apply the second-venue test: a mine lit by oil
   lamps needs no fungiculture, and a surface mushroom farm needs
   fungiculture and no mine. They are separable, so it is **not mining's
   mechanism** — it wants its own trade pack, which is why Stage A
   shortcut it rather than patching it in.

⭐ What fungiculture buys beyond mushrooms: it is the first content that
is **grown in the dark, indoors, on a substrate rather than in soil** —
so it exercises the growth model everywhere farming does not, and it is
the cheapest possible test of question (4) above.

---

## Open questions for the design pass

- Is *cultivated* a first-class category, or is it just "a `Plant`
  somebody placed"? (The smallholding build's `CultivableMixin` may
  already answer this; check before inventing.)
- Should a species row be **unable to ship without a way to occur** —
  a gate in the `lint:census` family, the way an untitled path or a
  rowless `templatePath` already fails the build? Both halves of the
  Ferrow ecology would have been caught at build time by one check.
- Does authored furnishing really mean "no wild spawns here", and if so
  should that be **declared** rather than inferred from the presence of
  furniture?
- What does a player DO to the wild half — the missing `forage` verb —
  and does it differ from `harvest` at all, or is foraging just harvest
  on something nobody planted?

---

**Related:** [discovery](./discovery-slate.md) (the tables, and the
honesty rule) · [mining](./mining-slate.md) (§ *Rejection's light is
biological*, marked NOT SHIPPED) · [husbandry](../../subsystems/husbandry.md)
(the growth model) · [smallholding](../../subsystems/smallholding.md)
(ground you own) · [biome](../../subsystems/biome.md) (the chain
resolver) · [residency](../../subsystems/residency.md) (the spawn sweep
that reads `stocks`)
