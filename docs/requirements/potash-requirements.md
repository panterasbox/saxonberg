# Potash — requirements

**Kind:** feature (an RGO-adjacent processing chain)
**Leads from:** content — the chain is rows on shipped mechanisms (the
Burner's ash, the hopper, maturation's `evaporative`, `fire` recipes, the
density reading, buying counters, rounds); the kernel edits are corrections
and derivations on those (ash sized and strengthened, lye strength, the
misnamed profile), each with shipped first consumers named below.

Wood ash into lye, lye into potash, potash into pearl ash — the glasshouse's
flux and the soapmaker's alkali — made at scale from **forestry's waste**.
Designed with the owner 2026-10-18 in the potash slate (*big ash and little
ash*; `docs/slates/tails/potash-slate.md`, on the cleanliness branch until
!380 merges), and closed in this requirements conversation the same day. The
**heap at scale** is this build; big ash (burnt ground) is designed and
deferred.

## What already exists

Surveyed across master and the cleanliness branch (!380):

- **The Burner leaves ash** (cleanliness): a wood fire accrues *kg burnt ×
  the wood's ash fraction* in its bed (every wood row carries one — 0.01, pine
  0.005); `sweep` rakes it out as **wood ash**, the hearth owner's; a deep bed
  chokes the draught.
- **The charcoal clamp** (`char`, the Rejection fuel yard and its collier):
  the draught decides — brands, charcoal, or **ash** above 0.62 — but the ash
  is always **one 0.6 kg drift**, whatever burned.
- **The lye hopper** at Terminus Wharfside's chandlery: water + any
  potash-tagged item gives lye — and **destroys all the ash whatever its
  amount**; lye has **no strength**.
- **Soap** (cleanliness): lye + fat → soft soap → salt → hard soap. Correct
  chemistry; the sink exists.
- ⚠⚠ **`soda-from-lye`** (cleanliness): an `evaporative` profile boiling lye
  to **washing soda** — **chemically wrong**: wood-ash lye is *potassium*
  carbonate, so boiling it down gives **potash**. It is the slate's "third
  evaporative profile", already shipped under the wrong name.
- **Maturation's `evaporative`** — brine (salt, by sun) and maple and birch sap
  (syrup, by fire).
- **`fire` / `burn`** — a recipe-driven firing of a loaded chamber (limestone →
  quicklime, the glass batch). The glasshouse has a kiln.
- **The glass batch** — silica ×2, a `potash` slot (flux), an `alkali` slot
  (quicklime). ⚠ Cleanliness tags lye and washing soda `alkali` too, so lye can
  fill glass's lime slot.
- **The density reading** — the hydrometer reads gravity in a maturing vessel;
  on lye it would read a constant.
- **Buying counters** (a `buys` line; only the icehouse uses one) and **rounds**
  (the tinker's round).
- **Forestry**: `fell` yields bole, logs, seed and **bark** (the tanner's);
  brash is prose only. **Hanging Wood** has the glasshouse (kiln, glassblower,
  a stock of "clamp-ash"); the fuel yard has the clamp and the collier.
- **Haulage**: a carter and the haulage market run Rejection to Terminus. No
  river lane. **No wrack or seaweed** anywhere.

**Therefore what is genuinely new here is:** ash sized to what burned with a
**strength** from the wood · **brash** as a forestry by-product · an **ash pit**
that is simply a big Burner · **derived lye strength** (ratio, passes,
hardness) and **spent ash** · the **egg** on the density reading ·
**slaking and causticizing** · the misnamed profile corrected to **lye →
black salts** · **pearl ash** by a `fire` recipe · potash as a cleanser and
softener · the **`flux` / `stabilizer` / `alkali`** tags · the **Hanging Wood
ashery** with its own kiln · the chandlery **buying** ash · **the ash-man's
round**.

## Goals

- ⭐ **A person can burn wood to ash at scale and make potash and pearl ash from
  it**, and sell them to the two trades that already want them: the
  glasshouse's flux and the soapmaker's lye.
- **The wood's waste becomes the glasshouse's flux** — brash, the richest feed
  per kilo, burns in the ash pit.
- **Ash has a strength that comes from the wood** — beech strong, pine weak —
  and the strength carries end to end: ash → lye → black salts → pearl ash →
  soap and glass grade.
- **Lye strength is made and read** — by how much ash, how many passes, and the
  water's hardness — and is readable with an egg, the folk instrument.
- **Weak lye costs fuel** — boiling it down takes longer and burns more.
- **Soap gains a direct route to hard soap** (caustic lye, by lime), beside the
  shipped salting-out.
- **Town ash finds a buyer**: a hearth's swept ash sells at the chandlery, and
  an ash-man works a round buying it.
- **Every shipped fact the chain touches is true** — the clamp's ash, the
  hopper, the boiled-lye profile, the glass batch's slots.

## Non-goals

- **The kelp burn** (soda from wrack) → the **underwater build**, which ships
  the tides and the strandline it needs.
- **Big ash** (the ash layer on burnt ground) → the potash slate § 7, for
  wildfire and foraging.
- **Spent ash as fertilizer** → a future **soil** pass (soil's missing
  potassium reserve).
- **Ash glazes · dyeing's alkali vat · bucking · saltpetre** → the
  **pottery** build, the dye trade, **cleanliness** (laundry), a powder epoch.
- **River freight** → the **river** build; potash goes by cart here.
- **Natron, Leblanc, Solvay** → later epochs (the potash slate § 8).
- **A new verb** — nowhere, deliberately: every act is shipped (`fell`, `put`,
  `ignite`, `stoke`, `draught`, `sweep`, `pour`, `measure`, `fire`, `sell`).

## Placement

- **`/trade/potash`** — rows on the shipped mechanisms: the ash pit, the
  ashery's kiln, the pot, the profiles and recipes, the venue's seats. A second
  ashery anywhere is rows with no code.
- **Hanging Wood (the `rejection` pack)** — the ash pit and the **ashery**:
  burn, leach, boil, calcine in **its own kiln**.
- **Terminus Wharfside (the `terminus` pack)** — the chandlery leaches **town
  ash** for soap and now **buys** ash and potash; the **ash-man's round** works
  Terminus's hearths.
- **Forestry** — `fell` also yields **brash**.
- **Kernel corrections** — ash sized and strengthened by the wood; the clamp's
  ash on the same rule; lye strength derived; the profile renamed. Each has a
  shipped consumer (the grate, the clamp, the hopper, soap, the glass batch).

## Collisions

- **The collier** (Rejection fuel yard) — his clamp's ash becomes sized to what
  burned.
- **The glassblower** (Hanging Wood) — the batch's slots become `flux` and
  `stabilizer`; his stock of **clamp-ash** is re-pointed to wood ash; he becomes
  the ashery's first **pearl ash** buyer.
- **The Wharfside chandlery** — buys wood ash and potash; soap gains caustic lye
  as a second route.
- **Cleanliness's washing soda** — its boiled-lye source is removed (it was
  potash); washing soda becomes a **stocked line** until kelp; **potash and
  pearl ash** soften water and clean by tag.
- **Oak bark** — the tanner's input; if burned for ash, two trades bid for it
  (the markets doctrine: two lines on one good).
- **Cleanliness's `alkali` tag** — stays the cleansing tag (lye, potash, soda);
  glass stops reading it.

## Surface decisions

### The burn — no new verb
**The ash pit is a big Burner whose fuel is the wood**: `put` cordwood and
brash in, `ignite`, keep it fed with the draught open (`stoke`, `draught`),
`sweep` the ash. The shipped grate rule — *kg burnt × ash fraction* — does the
work. *Alternatives*: `char` with the draught open (the wrong word), or `burn`
through `fire` (which transforms a charge; it does not burn fuel). Neither is
the common interface; the Burner is. The clamp's fixed 0.6 kg ash moves onto
the same rule. An unwatched fire pauses, as every fire does — you lit it; it
waits.

### Strength
Each wood carries an **alkali share** beside its ash fraction (beech and elm
strong, pine weak, bark higher than heartwood); raked ash is the
**mass-weighted mix**, read as a grade band.

### The leach
Lye strength = the ash's alkali over the water, **wasted by hardness** (river
water weaker than rain), **raised by passing the lye back through fresh ash**;
the hopper leaves **spent ash** rather than destroying it.

### Reading strength
The **egg** is the lowest instrument of the **density** reading — *the egg
sinks · a coin of shell shows · it rides high* — the hydrometer the higher
rung; competence sharpens it. No new reading.

### Lime
**Slaking** (quicklime + water → slaked lime, hot and caustic to handle) and
**causticizing** (lye + slaked lime → caustic lye, which makes hard soap
directly).

### The boil
`soda-from-lye` becomes **lye → black salts**, boiled in an **iron pot** over
the fire, the cake setting in the pot; **yield follows the lye's strength**,
and **weak lye takes longer and burns more fuel**.

### Pearl ash
Black salts fired at red heat in the ashery's kiln become **pearl ash** — a
`fire` recipe row.

### Washing soda
A **stocked line** until the kelp burn; potash and pearl ash soften and clean
by tag meanwhile.

### Tags
Potash, pearl ash (and later soda) carry **`flux`**; the glass batch's lime slot
becomes **`stabilizer`**; **`alkali`** stays the cleansing tag.

### Where the ashery stands
**At Hanging Wood**, because potash is about a tenth of the ash's mass —
process where the ash is made, ship the cake (real asheries stood by the
forests). **Town ash** is leached where it is swept, at the chandlery. The slate
first put the ashery at Wharfside; the freight arithmetic moved it.

### The ash-man
A **round** (the tinker's round shape) buying hearth ash from Terminus's hearths
and selling it at the chandlery; a player can do the same by hand. ⚠ A
fifty-hearth round is ~5–10 kg of ash a day — the drive must show whether that
is a living or a supplement, and say which.

### Brash and the kiln
`fell` yields **brash** (in); the ashery has **its own kiln** (in), so neither
business blocks the other.

## Lens pass

1. **Pedagogy** — complete combustion leaves the mineral; the tonne-to-kilo
   arithmetic (a tonne of oak → ~10 kg ash → ~1 kg potash); twigs richer than
   heartwood; hard water wastes alkali; latent heat makes weak lye expensive;
   lime makes lye caustic; potash soft soap vs caustic hard soap; the egg as a
   density instrument.
2. **Creative expression** — the ordinary case is rows (an ash pit at any wood,
   a second ashery); personalization from supply-chain depth (soap from your own
   beech ash).
3. **Immersion / participation** — the smoking pit, the black cake in the pot,
   the egg riding high. The ash-burner, the boiler, the ash-man, the soapmaker,
   the carter; ⭐ *can the polity do something we didn't want?* — burn a wood
   for its ash.
4. **Values** — ⚠ forest glass consumed woods; colonial potash came from
   clearing; *a forest or a glasshouse* has no derivable answer.
5. **Continuity** — ash → soda → industrial alkali fill the same tags; every act
   is a shipped verb at every rung.
6. **Economy** — the demand was there first (glass flux, soap); consumes brash,
   cordwood, lime, rainwater, fuel; produces wood ash, potash, pearl ash, spent
   ash; ⚠ the ash-man's arithmetic is the weak point.
7. **Governance** — leave to burn on another's wood; smoke as a nuisance
   ordinance; each a criterion and an appeal when designed.

## The drive

Run in the live game, at the end of the build, before the MR opens.

1. **At Hanging Wood, `fell` a standard.** See the bole, logs, bark **and brash**.
2. **Load the ash pit** — `put` the brash and some cordwood in — and **`ignite`
   it**; open the draught; keep it fed. The pit reads as burning.
3. **Let it burn down; `sweep` the pit.** Get wood ash whose **mass matches what
   burned × the wood's ash fraction**, and whose look reads a **strength band**.
4. **Burn a pine charge the same way.** Its ash reads **weaker**.
5. **At the fuel yard, char a clamp with the draught wide open.** The ash comes
   out **sized to the charge**, not a fixed drift.
6. **At the ashery's hopper, leach the beech ash with rainwater.** Get lye; the
   hopper leaves **spent ash**.
7. **`measure density` of the lye with an egg.** Read a band in words. **Pour
   the lye back through fresh ash**; the egg **rides higher**.
8. **Leach the same ash with river water.** The egg reads **weaker** — the
   hardness, named.
9. **Boil the strong lye in the iron pot over the fire** until black salts set as
   a cake. **Boil a weak lye alongside**; it takes **longer and burns more
   fuel**, and the drive records both.
10. **Load the black salts in the ashery's kiln; bring it to heat; `fire` it.**
    Get **pearl ash**.
11. **Sell pearl ash to the glassblower.** Fire a glass batch with pearl ash in
    the flux slot and quicklime in the stabilizer slot; get a melt. **Try lye in
    the lime slot — refused.**
12. **Slake quicklime with water** (it heats; handling it barehanded harms);
    **causticize** a lye with it; **make hard soap directly** in the soap kettle.
    Make soft soap and salt it out the old way too — both routes work.
13. **Cart potash down the valley road** (the carter or by hand) and **sell it at
    the Wharfside chandlery**.
14. **In Terminus, sweep a hearth and sell the ash at the chandlery** — the
    counter buys it. **Follow the ash-man's round**: he buys from hearths and
    sells at the chandlery. Record a day's take and **say whether it is a living
    or a supplement**.
15. **Wash in hard water with potash** — it softens and cleans; washing soda is
    on the shelf as stock.
16. **Every strength read in words** — no number reaches the player.

## Acceptance criteria

1. ⭐ A player turns forestry's waste into **pearl ash** and sells it to the
   glasshouse, with no new verb.
2. **Ash mass follows what burned** — at the pit, the grate and the clamp alike.
3. **Ash strength follows the wood** and carries into lye, black salts, pearl
   ash, soap and glass grade.
4. **Lye strength responds** to ash, passes and water hardness, and **reads in
   words** with an egg.
5. **Weak lye costs more fuel and time to boil**, visibly in the drive.
6. **Boiled lye yields potash**, never washing soda.
7. **Hard soap is makeable directly** from caustic lye, and the salting-out route
   still works.
8. **Lye cannot fill glass's lime slot**; pearl ash and potash fill its flux
   slot.
9. **The chandlery buys ash and potash**; **the ash-man's round** buys hearth ash
   and sells it; the drive states whether the round is a living.
10. **Brash** is a felling by-product and burns in the pit.
11. **Washing soda** remains available (stocked); **potash softens** hard water.
12. Nothing in the chain shows the player a number for strength or grade.

## Cross-references

- Seeding slate: the potash slate (`docs/slates/tails/potash-slate.md`, on the
  cleanliness branch, !380).
- `docs/subsystems/cleanliness.md` (on !380) ·
  [glass.md](../subsystems/glass.md) · [mining.md](../subsystems/mining.md) §
  the clamp · [maturation.md](../subsystems/maturation.md) § `evaporative` ·
  [fire.md](../subsystems/fire.md) · [forestry.md](../subsystems/forestry.md) ·
  [instrumentation.md](../subsystems/instrumentation.md) ·
  [retail.md](../subsystems/retail.md) · [logistics.md](../subsystems/logistics.md).
- Related: [sugar-slate](../slates/builds/sugar-slate.md) (the shared boil, lime,
  the bagasse-ash loop) · [moulding-slate](../slates/builds/moulding-slate.md) §
  0a · [pottery-slate](../slates/builds/pottery-slate.md) (ash glaze) ·
  [river-slate](../slates/builds/river-slate.md) (potash as first downstream
  freight).
