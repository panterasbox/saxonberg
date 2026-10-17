# Cleanliness — dirt, soap, washing, and the people paid to deal with it — requirements

**Kind:** feature
**Leads from:** kernel — one soiling model, washing that actually
cleans, room condition and the clean tiers are engine; first consumers
in this build: the butcher's apron, the milker's hands (dairy's), the
infirmary's basin and its surgeons, a Terminus kitchen, a home's floor,
hearth and window, the two mills, a **chandler** making soap, a
**laundress** and a public **lavoir**, a **bathhouse**, and a **doorman**
at the bank.

Today the game has three half-models of clean and no dirt. A body's
hands go dirty **on a six-hour clock** whether they touched anything or
not; a pot or a glass is "used" until washed; and `wash` on a garment
**strips its dye and cleans nothing**, because nothing ever soils a
garment. Soap does not exist, nor do lye, bleach or any cleanser. A
floor cannot be swept; a window cannot get grimy; a chimney cannot
soot up; the infirmary's ward smells of *"lye and boiled linen"* that
nothing in the world can make. This build makes **dirt something you
get by doing things**, of a **kind** that decides what removes it;
makes **washing a real trade-off** that can ruin what it cleans; ships
**soap and the pre-industrial cleansers** as a chemistry a player can
learn; makes **a place's condition** something its use wears down and
its keeper restores; gives the clinic, the kitchen and surgery **clean
tiers** stricter than a home's; and puts **people in the world who are
paid to clean**.

Seeded by [laundry-slate](../slates/tails/laundry-slate.md),
[room-condition-design-pack](../slates/builds/room-condition-design-pack.md),
[rendering-slate](../slates/tails/rendering-slate.md) § 9 (soap), and
[bathroom-slate](../slates/builds/bathroom-slate.md); governed by
[stewardship-doctrine.md](../stewardship-doctrine.md) § Part 3 (what
upkeep must never do) and § Part 3a (the price of comfort).
**Runs after dairy merges, in parallel with repair, rubber and
storage-and-ice** (§ Collisions — each sibling's shared piece is named
there, with who owns it).

---

## What already exists

| part | state |
|---|---|
| **`wash`** | ships (platform). Bare `wash` washes your hands; `wash <vessel>` clears its *used* state and its surface microbes; `wash <garment>` **strips dye** by its fastness and cleans nothing. It accepts a river or a shore as its water. |
| **hands** | ship (recovery build): clean right after washing, **decaying to dirty over six game-hours on the clock**; read by treating a wound (dirty hands worsen the dressing and seed sepsis). Dairy (merging first) adds milking: dirty hands put e-coli in the milk and on the pail. |
| **vessels** | ship: a pot, glass or pail is *used* until washed, and a used one is never picked for a new fill. |
| **`rinse`** | ships (medical): stops a caustic burn with water in reach. The caustic channel ships (a lime seep was its first source). |
| **wetness** | ships: bodies and things get *damp · wet · soaked*, and dry on their own, faster when warm. ⚠ **Rain wets only what lies in a room — never a worn garment.** Wet clothing loses insulation and weighs more. `dry` exists for food, hides and turf only. |
| **dye** | ships: subtractive, fading with sun and wash. ⚠ **Dye never bleeds** onto other garments. |
| **the soiling seam** | ships as a method only: *which layer of what you wear would take a stain.* Nothing soils anything. |
| **room air** | ships: a room holds released gases (fire's smoke and CO, a cellar's CO₂) that clear at its air changes; respiration reads them. |
| **floors** | ship: every place's floor has a material and one of ten kinds (*rock · set-paving · slab · earth · mire · beaten-floor · loose · boards · plate · contrived*). |
| **windows** | ship (glass build): a window's transmission and tint light the room. Two exist (the Rejection hut's). No grime term. |
| **hearths** | ship (hearth, stove, brazier). ⚠ **No chimney or flue** on any of them; the one "chimney" is a cold-smoking station. |
| **rest** | ships: a seat or bed's rest quality feeds metabolism and recovery. Nothing about bedding or the room affects it. No pests. |
| **holdings** | ship: `survey` and `maintain` keep a holding's *shell* (repair is reworking both, in parallel). |
| **bathrooms** | ship: a generic room with toilet, basin (real water) and tub (a seat, rest 1.4), used by the Seznick house and the Hinkley Hills houses. **No bathhouse, washhouse or laundry anywhere.** |
| **paid services** | ship: `order repair · treatment · burial · transfusion` from a price board, ⚠ **none needing anybody on shift** (repair is changing that for repair, in parallel). Menu orders are made by the on-shift hand. |
| **the contract board** | ships: a player can post paid work with a clause over a checkable condition and escrow — **player-hires-player already exists.** |
| **inputs** | ship: wood ash (the collier's), quicklime, limestone, tallow, olive oil, wine vinegar, neutral spirit, clay, sand, salt and brine, coal tar, milk, alum, beeswax. ⚠ **Not found:** lye, soap, potash, fuller's earth, chalk, slaked lime, sulfur, washing soda, ammonia/urine, naphtha, turpentine, glycerin, **lard, silk**. (Buttermilk ships with dairy. Dye does **not** yet fade in the sun.) ⭐ Silk is an RGO nobody has thought through (user, 2026-10-17): this build washes wool where it would have washed silk. |
| **water hardness** | ships as a *read only*: `look` at a river says *soft* or *hard*. Nothing uses it. |
| **blood** | ships: a person's ABO type (seeded, readable once tested), typed units in the bank. ⚠ **Blood never lands on a garment or a body.** |
| **surgery** | ships: `operate`, sutures. ⚠ **Reads no cleanliness at all**; nothing sterilises an instrument; every bandage is authored perfect. |
| **chandlery** | ships: `dip` candles from tallow or beeswax; a chandlery shop in Terminus wharfside. **No Discipline, by decision.** |
| **places** | the infirmary ward (with a basin), the Hearthworks cookhouse and the cooking pack's kitchen, the wharfside mill floor, the Delight Road **ford**, the estuary strand (a shore), the Goodkin bank (counting-houses), the chandlery shop; dairy brings a byre and yard to Hearts' Delight. **No authored gym room** (the archetype only). |
| **Disciplines** | textiles, dyeing, tailoring, chemistry, cooking, medicine, nursing, butchery, services and personal-services exist. **No housekeeping, hygiene or chandlery Discipline.** |
| **in flight beside this build** | **rubber** (build-1): rain stops at the outer layer by its material, a wet material conducts, rubber gloves, boots and apron, native **sulfur** in the Hill Quarry, places say what their walls and roof are made of (glass faces pass light; every new interior authors BOTH `enclosure:` and `roof:` — `lint:biome-sky`; a lone place is complete). **storage-and-ice** (build-4): sawdust left where a log is sawn and gathered from a heap, going into water soaks you and what you wear, cold water chills a swimmer, frozen water reached only through a hole. Both share **one wet law** (water filling a material's pores) with textiles' shipped wet cloth. |
| **slates** | laundry, room-condition, rendering § 9, bathroom, sanitation, disease, cosmetics, pharma (soap vs water for oily irritants — a ready consumer), surgery-specialty (the sterile field), structures (the flue as an object). |

⭐ **Therefore what is genuinely new here is:** dirt that acts deposit,
by kind, on the layer it lands on; washing that removes dirt rather
than dye, trading time, heat and soap against each other and capable of
ruining the cloth; drying a garment; soap and nine other cleansers from
mostly-shipped inputs; the pre-industrial bleaching ladder; caustic
eyes and fumes in a shut room; floors, debris, windows, chimneys, stalls
and mill dust as things a place's use wears down; rest that reads the
bed and the room; pests as a consequence; clean tiers the kitchen, the
clinic and surgery read; a forensic stain; and a laundress, a lavoir, a
bathhouse and a doorman.

---

## Goals

- **You get dirty by doing things, never by waiting.** Butchering,
  cooking, milking, digging, tanning, rendering, sweating, fighting
  and walking through mud all soil you — on the layer the dirt
  reaches, as a **kind** (blood, grease, mud, sweat, soot, manure,
  ash). Sitting in the lounge does not. The hands clock is gone.
- **Layers are honest.** Gloves take the dirt; washing your hands in
  gloves washes the gloves; taking dirty gloves off carelessly dirties
  your hands.
- **Washing removes dirt, and can ruin what it washes.** Time
  (scrubbing, beating), heat and soap are traded against each other;
  each kind of dirt answers to some and not others. Boiling felts wool,
  hot water sets blood, harsh bleaching rots linen, a red washed with
  whites bleeds into them. A washed garment comes out wet and must dry.
- **Soap is made, and so are the other cleansers.** Lye from ash, soap
  from fat and lye, a hard bar salted out and cured; and the
  pre-industrial cleansers by what they do — soap, lye, washing soda,
  stale urine, vinegar, spirits, naphtha, fuller's earth, sand, sun and
  sulfur. Choosing the wrong one does nothing or does damage.
- **Hard water fights soap.** The same wash lathers in a soft-water town
  and scums in a hard one, and the river says which.
- **Cleaning is dangerous when done wrong.** Lye in the eyes blinds you
  until rinsed; sulfur or ammonia fumes in a shut room poison you;
  naphtha and spirits catch fire.
- **A place is kept as well as it is used and cared for.** Floors soil
  with traffic and are cleaned as their material allows; crumbs and
  offcuts make debris; windows grime and darken the room; a hearth's
  chimney soots with every fire until it catches; stalls foul; a mill's
  flour dust hangs in the air until it explodes. Sweeping, tidying,
  scrubbing and mucking out restore it.
- **Condition matters where it should.** A dirty bed and a dirty room
  sleep worse; debris and open food bring pests that spoil food faster;
  a filthy shop floor is what its customers see.
- **The kitchen, the clinic and surgery are stricter than home.**
  *Presentable · clean · sanitised · disinfected · sterile* — washing
  reaches *clean*, soap and scalding *sanitised*, boiling *disinfected*,
  dry heat or flame *sterile*. Surgery reads the surgeon's hands and the
  instrument; a dressing boiled clean dresses better than one that was
  not.
- **Blood on cloth is evidence.** A blood stain carries the bleeder's
  type, and it can be read.
- **Somebody is paid for all of it.** A chandler makes soap; a laundress
  washes your clothes at her own skill and owes you for what she ruins;
  a public lavoir lets anyone wash, together; a bathhouse sells a bath; a
  doorman decides whether you are dressed for the room; and any player
  can hire any other through the contract board to clean a room or
  sweep a flue.

## Non-goals

- **Hiring an NPC onto your own premises** (a house cleaner, a gardener,
  a sweep who comes to you) →
  [standing-instructions-slate](../slates/builds/standing-instructions-slate.md):
  *may a player automate labour at all?* is its question, and a cleaning
  build must not answer it. Player-hires-player ships today via the
  contract board.
- **Chlorine bleach, bleaching powder, synthetic detergents, the steam
  laundry, the washing machine** → the epoch on-ramp
  ([inquiry-slate](../slates/builds/inquiry-slate.md)) and
  [laundry-slate](../slates/tails/laundry-slate.md)'s continuity arc.
  Trades ship medieval; so do the gases of mixing cleansers that need
  chlorine.
- **Dirt from the calendar** (damp, mildew, road dust while you are away)
  → [stewardship-doctrine.md](../stewardship-doctrine.md) § 3a's
  legible-local-process rule, a later pass. In this build every deposit
  comes from an act.
- **Clean rooms and dust extraction machinery** →
  [room-condition-design-pack](../slates/builds/room-condition-design-pack.md),
  industrial.
- **Clean-home-is-immunity** (home condition lowering disease risk) →
  [disease-slate](../slates/builds/disease-slate.md); nothing here
  waits on it.
- **The flue and chimney as parts of a building's construction** (shared
  stacks, the envelope between rooms) →
  [structures-slate](../slates/builds/structures-slate.md). Here a hearth
  has its chimney; a building does not yet.
- **Eyes as anatomy** (an eye that can be cut, lost or replaced) →
  [physiology-slate](../slates/builds/physiology-slate.md). Here a
  caustic in the eyes is an injury to sight, rinsed out.
- **Glycerin's products, scented soaps as cosmetics** →
  [cosmetics-slate](../slates/tails/cosmetics-slate.md); glycerin is made
  here and waits there.
- **A soap tax** — nowhere, deliberately: a polity can tax soap with the
  shipped legal code, no engine needed.
- **Pests as a breeding population** — nowhere, deliberately
  (room-condition: a threshold consequence, never a sim).
- **Radiation decontamination** — nowhere until a radiation source
  exists; the model will take it as one more kind of dirt.
- **The Washer at the Ford** (folklore over the dying clock, and the
  index of who is dying it needs) →
  [washer-at-the-ford-slate](../slates/tails/washer-at-the-ford-slate.md);
  cut by the user 2026-10-17.
- **Institutional laundries** (the Magdalene history) — nowhere as
  mechanism; handled as history if content ever touches it.

## Placement

- **Kernel:** the soiling model (bodies, garments, surfaces, vessels),
  dirt kinds and what removes them, washing and drying, the clean tiers,
  room condition (floors, debris, rest, pests, cleanables), and the
  forensic stain. Every trade's acts soil, every place has a floor, and
  three trades read the tiers — no common pack ancestor.
- **Kernel rows, pack-extensible:** a **dirt kind** and a **cleanser**
  are rows any pack can add; ⭐ the test is that a pack adds a new stain
  or a new cleanser with **no code**.
- **`trade-chandlery`:** lye, soap, glycerin — the chandler's second
  product, beside the candle (rendering-slate § 9's cut: one fat, two
  products). The pack keeps its no-Discipline decision; soap-making is
  **chemistry**.
- **The cleansers' inputs** live with their makers: washing soda and
  potash with the ash (`trade-fuel`), naphtha as a cut of coal tar
  (`trade-fuel`'s retort and condenser), fuller's earth and chalk with
  quarrying, sulfur with mining, soured milk with dairy, stale urine
  with whoever collects it.
- **Terminus:** the lavoir, the laundress, the bathhouse and its gym
  floor, and the doorman (the plan picks the rooms). ⭐ **The bathhouse
  is a hospitality venue and the lavoir a civic one — a second of either
  must need no code.**
- **Disciplines exercised** (no new Discipline): **textiles** (knowing a
  fibre and what it will survive — the laundress's skill), **chemistry**
  (soap, cleansers, what not to mix), **medicine / nursing** (the clinic
  tiers), **cooking** (the kitchen's).

## Collisions

- **`wash`** — bare `wash` keeps washing your hands; `wash <garment>`
  now cleans dirt (and still fades dye, by fastness); `wash <vessel>`
  keeps its used/clean meaning and joins the tiers. ⚠ The recovery
  build's **nurses** wash their hands through it, and **treating a
  wound** reads hand cleanliness — both keep working on the new model.
- **Dairy's milking** (merged first) — its dirty-hands inoculum reads the
  new hands; its pail washes as a vessel. Milking is a dirt producer.
- **Repair** (in parallel) — ⚠ two shared surfaces:
  - **`order`.** Repair turns `order repair` into the on-shift hand's
    quote by diagnosis. This build adds `order wash` as a fifth service
    on the same board, **made the same way**: the laundress on shift
    looks the garment over, names what it is, what is on it and the
    price, and washes it at her band. ⭐ Whichever build merges second
    adopts the other's shape; the product rule is the same in both.
  - **`survey`.** Repair reworks `survey` and `maintain` for a holding's
    shell; this build adds a room's condition to what `survey` reads.
    Whichever merges second integrates the readout.
- **`dry`** — exists for food and hides. ⭐ It extends to a wet garment
  (the verb-collision ladder's first rung: one verb, one act — taking
  the water out of a thing). `hang` is taken (wall fixtures) and is not
  reused.
- **Rubber** (build-1, in parallel) — ⚠ shared pieces, each owned
  there and consumed here:
  - **Rain on what you wear** is rubber's correction (the outer layer
    sheds or soaks by its material). This build only reads it.
  - **Sulfur** is rubber's native band; bleaching is its second consumer.
  - **Rubber gloves, boots and apron** are rubber's goods; this build
    reads them as gloves and aprons that keep caustics off and wash
    clean.
  - **Glass faces** on rubber's buildings take grime like a window
    (when rubber exposes one face-transmittance method; until then the
    `Window` object is the one funnel).
  - ⚠ **Every new interior authors BOTH `enclosure:` and `roof:`**
    (rubber's `lint:biome-sky`; `enclosure: none` is a legal answer for
    an open-sided lavoir): a lone place with its own walls and roof is
    complete — it need not stand in a building, and a `Structure` row
    never authors a material. The lavoir, the bathhouse rooms, the
    laundress's room and the mill house all say what they are made of.
- **Storage-and-ice** (build-4, in parallel) — ⚠ shared pieces:
  - **Sawdust** is matter there, a heap where a log is sawn; here it is
    debris of one kind, swept, strewn or gathered — **one heap**.
  - **Going into water soaks you and your clothes, and cold water
    chills** — owned there; washing at a river, bathing in one and
    climbing out wet all read it.
  - **Frozen water is reached through a hole** — washing at a frozen
    river needs one.
  - The **cookhouse** gains an ice par line there and kitchen tiers
    here: both edit its rows.
- **The one wet law** (rubber + storage-and-ice + textiles' shipped wet
  cloth: water filling a material's pores) — a washed garment is wet by
  it. This build mints no copy. ⭐ **Expected order:** cleanliness
  merges after both; if either has not, the shared piece is built here
  in the shape the two siblings agreed, and the later build consumes it.
- **Hearths** — every hearth, stove and brazier that burns indoors gains
  a chimney that soots. ⚠ The rubber build's walls (in flight) and the
  structures slate's flue are the building-scale version; this is the
  hearth-scale one and must not pretend to be a building's stack.
- **The infirmary ward** — its basin, its prose (*"lye and boiled
  linen"* becomes true), its nurses and surgeons now read hands and
  instruments; its bandages are boiled or not.
- **The Hearthworks cookhouse and the cooking kitchen** — read the
  kitchen tier; their stoves grease and their chimneys soot.
- **The mills** — the Hearts' Delight millstones move into an enclosed
  mill house, where milling raises flour dust into the room air; the
  wharfside textile mill's scutching raises flax dust (user, 2026-10-17:
  both).
- **Homes: the Seznick house, the Hinkley Hills houses, the dorm** —
  floors, beds, hearths and windows now hold condition; the bathroom's
  tub is where `bathe` happens, and the basin washes hands.
- **The Rejection hut's two windows** — the only glazed windows; they
  grime.
- **Dairy's byre** — fouls, is mucked out, and its manure goes to the
  soil.
- **The Goodkin bank** (counting-houses) — gains a doorman at the arch to
  its back room, the Circle parlor.
- **The chandlery shop** — sells soap as well as candles.
- **The general store** — stocks soap, washing soda and a brush.
- **The contract board** — gains nothing; cleaning gigs are clauses over
  a room's or a flue's condition, which this build makes checkable.
- **The pharma slate's oily-irritant wash** — becomes satisfiable (soap
  vs water); not built here.

---

## Surface decisions

### 1. Dirt is deposited by acts, has a kind, and lands on a layer
Every deposit names **what** it is — *blood · grease · mud · sweat ·
soot · manure · ash · flour* — **how much**, **who** made it, and
**what it landed on**. It lands on the outermost layer covering the
part it reaches (an apron takes the butcher's blood; bare hands take
the milker's). Condition reads as bands — *clean · marked · soiled ·
filthy* — in words, never a number. **Nothing soils in the absence of
an act**, and nothing un-soils in it either — with ONE named exception:
a byre's stalls foul by the animal-day kept (§ 11), because the cows are
there; stewardship doctrine § 3a's legible local process (user,
2026-10-17). The hands clock is retired:
lens 1 decided it — hands get dirty by touching things, which is the
lesson germ theory teaches.

### 2. The producers
Butchering (blood, grease) · cooking (grease, soot, flour) · milking
(manure, milk) · digging, mining and quarrying (mud, dust) · tanning and
rendering (the stench trades — grease and worse) · exertion (sweat, by
how hard) · fighting (blood — **the bleeder's**, on whoever it reaches) ·
walking through mud, mire or a puddle (mud on the feet and legs) ·
tending a fire (ash, soot) · milling (flour) · sawing (sawdust — the
heap storage-and-ice makes, which is debris here). Rain and swimming
**wet** but do not soil; that is rubber's and storage-and-ice's.
Each producer is the act that already exists; none is new.

### 3. Gloves, and taking them off
Washing hands in gloves washes the gloves. Removing dirty gloves
transfers their dirt to your hands unless done carefully — the
careful way is a slower act. ⭐ That is the real doffing problem nurses
are trained on, and it gives a surgeon's gloves real work. **Rubber
gloves** (rubber's goods) are the honest gloves for lye and the clinic:
they wash clean and a caustic does not reach through them.

### 4. Washing
`wash <thing>` trades three contributions: **time** (scrubbing; beating
at the river), **heat** (the water's temperature, read from what holds
it), and **a cleanser** (§ 6). Each dirt kind answers to some: mud to
water and time; grease only to an alkali or a surfactant; blood to
**cold** water first — **hot water sets it**, and a set blood stain only
bleaches. What washing can ruin, by fibre: **boiling felts wool**,
**harsh bleaching rots linen**, **hot water shrinks**, and **un-fast dye
bleeds** onto anything washed with it. Hot water **shrinks**, which changes whom the garment fits
(fit is two numbers; rubber's stretch is the other direction). A washed
garment is wet — by the one wet law, so wet wool is cold — and it dries
by itself (warmth and air) or faster by `dry` (by a fire, on a line in
the sun). ⚠ **Frozen water cannot be washed in** except through a hole
(storage-and-ice's); a roofed, spring-fed lavoir is why towns built
one. A **textiles** band reads what a fibre will survive
before you wash it — an untrained hand finds out after.

### 5. The forensic stain, and laundry marks
Blood on cloth carries the bleeder's type. `analyze` on a stained
garment reads it — with the tested-type rule the blood reading already
has (*type B* reads as type B because the stain is a sample, the way a
drawn unit is). ⭐ A murderer's shirt is evidence; washing it **cold**
removes it, washing it hot sets it, burning it destroys it. A laundress
sees what is on every garment she takes in. Laundry marks are **labels**
(`label` ships): a marked garment says whose it is, including on a body
nobody can name.

### 6. Soap and the cleansers
**Soap**: water left to drip through wood ash in a hopper makes **lye**;
fat (tallow, olive oil) kept at the boil with lye in a kettle makes **soft
soap** and **glycerin**; salted out, a **hard bar**; cured weeks on a
rack, a mild one — a bar cured short is harsh on skin and cloth. The
cleansers, each a row saying **what it does and to what**:

| cleanser | does | to | from |
|---|---|---|---|
| soap | surfactant | grease, general dirt | the chandler |
| lye | alkali (strong) | grease, fat, protein — and skin | ash + water |
| washing soda | alkali (mild) | grease, hard water | plant ash, leached and dried |
| stale urine | alkali (ammonia) | grease; the fuller's wool | collected |
| vinegar | acid | scale, hard-water crust, rust | the winery |
| spirits | solvent | resins, some stains | the distillery |
| naphtha | solvent | oil and grease water cannot touch | coal tar's light cut |
| fuller's earth / chalk | absorbent | grease, spills | the quarry |
| sand | abrasive | baked-on dirt — and the surface | the quarry |
| sawdust (strewn) | absorbent | spills and blood on a floor — swept up with them | the saw (storage-and-ice) |
| vitriol | acid (strong) | rust, scale — and anything organic | the general store (ships) |
| sunlight | oxidiser (slow) | colour, stains | the bleach green, by day |
| soured milk | acid (mild) | the linen-bleacher's steep | dairy |
| sulfur fumes | oxidiser | stains on **wool and silk** | burning native sulfur (rubber's quarry band) |

**Chemistry** bands the choosing. The wrong cleanser does nothing, or
damage (lye on wool, sand on glass).

### 7. Hard water
Soap in **hard** water makes scum and washes worse; in soft water it
lathers. The water's own read (*soft · hard*) — a river, a trough, a tap — is
where a player learns it; washing soda softens it. ⭐ Your washing really is better in some
towns.

### 8. The bleaching ladder (pre-industrial only)
**The bleach green** — lay linen in the sun for days; it whitens, by
daylight (none in a polar winter). **Soured milk** — the linen
bleacher's steep between greenings. **Sulfur fumes** — for wool and silk,
which sun-bleaching yellows and lye destroys: the fibre decides the
bleach. Chlorine is out (non-goals).

### 9. The perils
- **Rubber gloves and a rubber apron** (rubber's) keep lye and vitriol
  off; leather and cloth do not.
- **Lye in the eyes** blinds you until it is **rinsed** — a new injury
  to sight, rinsed like the caustic burn it is; untreated it worsens.
  Lye on skin is the shipped caustic.
- **Fumes in a shut room**: burning sulfur and a tub of stale urine
  release gas into the room's air; in a closed room it builds until it
  poisons — the shipped room-air and respiration machinery, a door or a
  window the cure.
- **Naphtha and spirits are flammable** — the shipped fire model; a rag
  of naphtha by the hearth is a fire.
- **Over-washing skin** — a clinic hand washed raw with harsh soap
  stings and heals slower; mild, cured soap does not.

### 10. Places: floors, debris, rest, pests, traffic
**Floors** soil with traffic (the mud on your feet when you come in) and
are cleaned as their kind allows: **earth and loose** floors are strewn
with fresh rushes and the old swept out; **paving and slab** are
scrubbed; **boards** scrubbed or sanded; a rug is taken out and beaten.
**Debris** (crumbs, offcuts, ash, shavings, sawdust) is deposited by the
acts that make it and `sweep`-ed into a heap, then `dispose`-d. ⚠ The
sawmill's **sawdust heap** (storage-and-ice) is this same heap, not a
second one: it can be swept, gathered for an icehouse, or strewn. **Tidiness** is
read from whether things are put where they belong. **Rest** reads the
bed's soiling and the room's condition — a filthy bed is a worse bed,
never a punishment. **Pests** appear when debris and open food pass a
threshold, and spoil open food faster; they leave when the cause does.
⭐ **Every customer who walks into a shop brings in what is on their
feet** — the commercial cleaning demand comes from trade, not the clock.

### 11. Cleanables with consequences
- **Windows** grime with soot and weather-side dirt and **let less light
  in**, derived through the window's own transmission; washing them
  brings the light back. The same holds for any **glass face** a place
  is built with (rubber's glass roofs): a grimed hothouse roof lets in
  less sun, so the hothouse is colder and its tree taps worse.
- **Chimneys**: every fire in a hearth soots its chimney; a heavily
  sooted chimney **can catch** (the shipped ignition model); brushing it
  clean (rods and a brush) prevents it. ⭐ This is the one cleanable
  that is dangerous to neglect, and the reason sweeps existed.
- **Lamp glass** soots and dims.
- **Stalls** (dairy's byre) foul with every animal-day kept and are
  mucked out; the **manure goes to the soil** as the fertiliser it is.
- **Mill dust**: milling raises flour into the room's air; enough of it
  and a spark **explodes** (the shipped fire model); sweeping and
  damping it down keeps it under. The medieval case of dust as a
  hazard.

### 12. The clean tiers
*Presentable* (no dirt the room objects to) · *clean* (dirt removed) ·
*sanitised* (soap and scalding water — surface microbes knocked down) ·
*disinfected* (boiled) · *sterile* (dry heat or flame — spores too). A
thing reaches a tier by what was done to it; **the tier is derived,
never declared**. Readers:
- **The kitchen** — food prepared on a surface or with hands below
  *sanitised* picks up contamination (the shipped microbe model).
- **The clinic** — a dressing applied below *disinfected* (or with hands
  below *sanitised*) dresses worse and seeds infection; a **boiled
  bandage** is the honest one.
- **Surgery** — an instrument below *sterile* seeds infection in the
  wound; the surgeon's hands and gloves count.
⭐ Washing **removes** microbes; heat **kills** them; only enough heat
kills spores. A spotless scalpel can still kill — Semmelweis is the
lesson.

### 13. The chandler
The chandlery shop makes and sells soap (soft and hard), lye and
glycerin beside its candles. Anyone with a hopper, a pot and fat can
make soap; the chandler's is cured properly.

### 14. The laundress and the lavoir
**The lavoir** — a public, roofed washing place in Terminus with running
water and a drying ground; free; anyone washes there, and others are
there washing. ⭐ It is a civic place: it gives anyone without a basin,
soap or a yard the ability to get clean. **The laundress** works there
(her seat can be applied for): `order wash <garment>` — she looks it
over, says what it is and what is on it and what it will cost, and
washes it **at her textiles band**. If she ruins it, **the house pays
you its posted cover** (a garment's value is not appraisable yet — user,
2026-10-17) and the ruin is on her record. ⭐ She is paid for an
absence: the garment she did not ruin.

### 15. The bathhouse
A hospitality venue in Terminus with hot water, tubs and soap at par,
and a floor to work out on: `order bath` gets you a bath — body and
hair, clean — and the attendant will wash your clothes too. `bathe`
anywhere with a tub or enough water does the same for yourself — and a
winter river chills you as storage-and-ice's cold water does, which is
what the bathhouse's hot water is for. ⭐ The
gym and the bath share a door.

### 16. The doorman
The Goodkin bank's back room (the Circle parlor, through the banking
hall's arch) has a doorman who reads **whether you are
dressed for the room** — not how clean you are: a tanner in tanning
clothes is right in the tannery and wrong here. He refuses **in words,
with the reason**; it is never the only way in (a borrowed coat, a bath,
a back door, or someone who does not care). His judgment is his
(engine measures, subject values); ⭐ the wharfside's own people remark
on a gentleman's coat the same way.

### 17. The Washer at the Ford — ⛔ CUT (user, 2026-10-17)
Cut from this build → [washer-at-the-ford-slate](../slates/tails/washer-at-the-ford-slate.md).
Planning found the dying state lasts 90–600 s and nothing indexes who is
dying, so she would almost always be washing nothing, and she needed an
index of her own. The numbering below is kept so the drive and the
acceptance criteria keep their numbers.

### 18. Cleaning as a gig
The contract board already lets a player pay another against a checkable
condition. This build makes *"this room is clean"*, *"this flue is
swept"* and *"this garment is clean"* checkable, so **a player cleaner,
sweep or laundress can be hired today** with no new hiring mechanism.

---

## Lens pass

1. **Pedagogy** — germ theory (dirt by contact, removal vs kill, the
   spore floor — Semmelweis); the chemistry of cleaning (surfactant,
   alkali, acid, solvent, absorbent, abrasive, oxidiser); saponification
   and why salt makes a bar; hard water; fibre science (felting,
   setting, rot, fastness). Every outcome derivable from the row.
   Disciplines: textiles, chemistry, medicine, nursing, cooking.
2. **Creative expression** — the ordinary case is rows: a new stain, a
   new cleanser, a second lavoir or bathhouse, a doorman's dress code.
   (The bespoke case this build first named, the Washer at the Ford, is
   cut to its own slate.)
3. **3a immersion** — the ward's *"lye and boiled linen"* becomes true; a
   butcher looks like one; the chimney fire has a cause. **3b
   participation** — the economy gains a cleaner-shaped hole (laundress,
   sweep, chandler, bathhouse attendant, any player on the contract
   board), and the lavoir is civic infrastructure that redistributes
   access to rooms. ⚠ Test: a polity can tax soap, license laundresses,
   or build a second lavoir — all without code.
4. **Values** — the doorman is a judgment, never a gauge, and cuts both
   ways; nothing nags; the grain is a realm's (a realm may write a laxer
   doorman), the law is that dirt comes from acts.
5. **Continuity** — the arc runs to chlorine, detergent and the machine
   (non-goals); every new object answers the same commands: soap in a
   later epoch still `wash`es, a later bleach is one more cleanser row.
6. **Economy** — produces soap, lye, glycerin, clean garments and
   swept flues; consumes fat, ash, salt, fuel (hot water), water and
   labour; paid by households and businesses whose acts dirty them —
   the demand was there first (every act now soils). ⭐ Doctrine § 3a:
   the bill is legible as a person.
7. **Governance** — the laundress's liability is the small-claims end
   (the house pays, her record shows it); the doorman judges a person,
   so his criterion is stated (the room's dress), his appeal is the
   alternatives, and his entrenchment is tier C (a venue's own rule).

## The drive

A funded player, a fresh world after dairy, the real socket.

1. In Terminus, `look` at yourself — clean. Buy an apron and gloves.
   Butcher a carcass in the apron: the **apron** reads bloodied and
   greasy; your shirt does not. `look hands` — bloody (no gloves on).
2. Put the gloves on and butcher again. `wash` (bare): **the gloves**
   come clean, your hands are unchanged. Take the gloves off quickly —
   your hands are dirtied; take a clean pair off carefully — they are
   not.
3. Sit in the lounge for a game day. `look hands` — unchanged. (No
   clock.)
4. Walk through the mire to the ford. Your boots and legs are muddy;
   your shirt is not. Strew sawdust on a bloodied floor and sweep it up:
   the floor is cleaner, the heap is bloodied sawdust.
5. `wash shirt` (bloodstained) in the river, cold, with no soap: the
   blood mostly lifts. Bloody the shirt again, and wash it in **hot**
   water: `look shirt` — *a set stain*. `analyze shirt` reads the
   bleeder's blood type.
6. At the chandlery buy soap; make **lye** at a hopper from ash and
   water, keep tallow at the boil with it into soft soap, salt it into a bar, set it
   to cure. `look` at it before and after curing — harsh, then mild.
7. Wash a greasy apron in water alone — still greasy. With soap — clean.
   Do it at a **hard-water** river (look the river: *hard*) — scum, a
   worse wash; add washing soda — better.
8. Wash a **wool** jumper by boiling it: *felted, shrunk.* Wash a red
   un-mordanted shirt with a white one: the white comes out **pink**.
9. Wash a shirt; it is wet. `dry` it by the fire.
10. Get **lye in your eyes** (a splash at the hopper) — `look` sees
    nothing clearly; `rinse` — sight returns.
11. In a shut room, burn sulfur to bleach a wool scarf — the scarf
    whitens and the room's air sours; stay and you are poisoned; open
    the door and it clears.
12. At home: cook three meals on the hearth. `look floor`, `look
    hearth`, `look window` — the floor marked and crumbed, the window
    grimed (the room **darker** than before), the chimney sooted.
    `sweep`, scrub, wash the window — the light comes back. Burn on with
    a heavily sooted chimney until it **catches**; brush the next one
    clean and it does not.
13. Sleep in a filthy bed in a filthy room; sleep in a clean one —
    `look` reads the difference in your rest. Leave crumbs and open food
    out: pests appear and the food spoils faster; clean up and they go.
14. Mill flour at the Hearts' Delight mill house without sweeping until the air is
    thick, and strike a light — the dust explodes. Mill again, damping
    and sweeping — it does not.
15. Muck out dairy's byre; spread the manure on a field (`analyze soil` reads its
    nitrogen before and after).
16. At the infirmary: dress a wound with unwashed hands and a raw
    bandage, and with scrubbed hands and a **boiled** bandage — compare
    the wounds over a day. A surgeon operates with an instrument held in
    flame and one not — the unsterile one seeds infection.
17. Prepare food on a dirty board in the cookhouse, and on a scalded
    one — `analyze` the food: contaminated vs not.
18. At the lavoir, wash alongside others. `order wash shirt` with the
    laundress on shift: she names the fibre, the stain and the price;
    `yes`; it comes back clean at her band. Give her a wool jumper she ruins
    (a low-band laundress boils it) — the house pays you. Off shift — *nobody to
    do the work*. `apply` for her seat, clock on, and wash another
    player's shirt through the counter at **your** band.
19. Mark a shirt with `label`; find a body in a marked shirt and read
    the mark.
20. Go to the bank's back room in the tannery clothes: the doorman
    refuses you, saying why. Bathe at the bathhouse (`order bath`),
    change, and he lets you in. Go to the wharfside in the banker's
    coat: they remark on it.
21. ⛔ *Cut (the Washer at the Ford — see § 17).*
22. Post a contract — *"my study, clean, by tomorrow"* — another player
    takes it, cleans, and the escrow pays on the checked condition.
23. Restart the server. Every stain, band, wet garment, sooted chimney,
    curing bar, swept floor and the room's dust: as left.

## Acceptance criteria

1. A body, garment, surface or vessel gets dirty only through an act;
   across a game day of idling, nothing's dirt changes. The six-hour
   hands decay no longer exists.
2. Dirt lands on the outermost layer over the part it reaches, and
   reads as a kind and a band in words, never a number.
3. Washing hands in gloves cleans the gloves; careless removal of dirty
   gloves dirties the hands, careful removal does not.
4. Grease does not wash out in water alone and does with soap; blood
   washed hot is set and washed cold is not; boiled wool is felted;
   un-fast dye bleeds onto other garments in the same wash.
5. A washed garment is wet (and colder to wear, by the one wet law) and
   dries on its own or with `dry`; hot water shrinks it.
6. `analyze` on a blood-stained garment reads the bleeder's type.
7. Lye, soft soap, hard soap and glycerin can be made from ash, water,
   fat and salt with shipped verbs; a bar cured short reads harsh.
8. Every cleanser in § 6 exists as a row a pack could add another of,
   and does what its row says to what its row says — nothing to the
   wrong dirt, damage where the row says.
9. The same soap wash is worse in a river that reads hard than one that
   reads soft, and washing soda narrows the gap.
10. Linen whitens on the bleach green by day and not by night; sulfur
    whitens wool; sun yellows it.
11. Lye in the eyes impairs sight until rinsed; sulfur or ammonia fumes
    build in a shut room until they harm, and clear with an opening;
    naphtha by a flame ignites.
12. A floor soils with traffic and is cleaned by its kind's method;
    debris accumulates from acts and is swept and disposed; a shop's
    floor soils with its customers.
13. A grimed window lets measurably less light into its room; washed,
    the light returns.
14. A hearth's chimney soots with use; a heavily sooted one can catch
    fire; a swept one does not.
15. Rest is worse in a filthy bed and room than a clean one; pests
    appear over debris and open food, spoil it faster, and leave with
    the cause.
16. Mill dust in a room's air can explode on ignition; damped and swept
    it does not.
17. The byre fouls with kept animals and its manure raises a field's
    nitrogen.
18. Surgery with an unsterile instrument, a dressing with an unboiled
    bandage or unwashed hands, and food prepared on an unsanitised
    surface each seed contamination that their clean counterparts do
    not; each tier is reached only by the act that reaches it.
19. The laundress quotes, washes at her band, is refused off shift, pays
    for what she ruins, and her seat can be held by a player who is paid
    and whose band does the work.
20. The doorman refuses in words with a reason and admits the same
    person once they are dressed for the room; at least one other way in
    exists.
21. ⛔ *Cut (the Washer at the Ford — see § 17).*
22. A contract whose clause is a room's or a flue's condition pays out
    when the condition holds.
23. A new dirt kind and a new cleanser can be added by a pack with no
    code; a second lavoir and a second bathhouse need no code.
24. The drive passes end to end, including the restart.

## Cross-references

- Seeding slates: [laundry](../slates/tails/laundry-slate.md) ·
  [room-condition](../slates/builds/room-condition-design-pack.md) ·
  [rendering § 9](../slates/tails/rendering-slate.md) ·
  [bathroom](../slates/builds/bathroom-slate.md).
- Doctrine: [stewardship-doctrine.md](../stewardship-doctrine.md) §§ 3,
  3a · [measurement.md](../measurement.md) (engine measures, subject
  values) · [uncertainty.md](../uncertainty.md).
- Subsystems: [textiles.md](../subsystems/textiles.md) ·
  [spoilage.md](../subsystems/spoilage.md) ·
  [harm.md](../subsystems/harm.md) · [blood.md](../subsystems/blood.md) ·
  [weather.md](../subsystems/weather.md) ·
  [thermal.md](../subsystems/thermal.md) ·
  [fire.md](../subsystems/fire.md) ·
  [respiration.md](../subsystems/respiration.md) ·
  [light.md](../subsystems/light.md) · [glass.md](../subsystems/glass.md) ·
  [ground.md](../subsystems/ground.md) ·
  [furnishing.md](../subsystems/furnishing.md) ·
  [holding.md](../subsystems/holding.md) ·
  [retail.md](../subsystems/retail.md) ·
  [employment.md](../subsystems/employment.md) ·
  [contract.md](../subsystems/contract.md) ·
  [watershed.md](../subsystems/watershed.md) ·
  [mortality.md](../subsystems/mortality.md).
- In flight: repair (`order`, `survey`) · **rubber**
  (`docs/requirements/rubber-requirements.md` on `reqs/rubber`) ·
  **storage-and-ice**
  (`docs/requirements/storage-and-ice-requirements.md` on
  `reqs/storage-and-ice`) — § Collisions · dairy (merged — milking, the
  byre).
- Overlapping slates: sanitation · disease · cosmetics · pharma ·
  surgery-specialty · structures · standing-instructions · inquiry.
