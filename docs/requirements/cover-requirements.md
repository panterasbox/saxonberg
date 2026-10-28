# Arable and grazing (the cover build) — requirements

**Kind:** feature
**Revised at planning (2026-10-28, owner-accepted):** R1 no written theft record (title is the record) · R2 the rick carries the unwatched month · R3 `move` at the herdbook or beside a drafted head · R4 the Hearts Delight pastures, the campus field and the goat pen resized/added.
**Leads from:** content. The first consumers are named: Waponi Woo's cane pieces (whose loose cane dies a season into a world today), Hearts Delight's farm (its wheat field, its flock and its dairy) and the campus farm (its ley and its herd). The kernel change is narrow: a field can hold a crop the way a bed does.

The game has fields, soil, a sward and herds, and no farming. No crop grows in a field; nothing grazes the grass; nothing eats the hay a scythe cuts. This build makes the two halves of agriculture work on the ground that already exists: **Stage A, arable** (a field holds one crop, sown and harvested by area, rotated through the grass that grows back) and **Stage B, grazing** (a herd stands on a field and eats it; hay carries it through the winter; its condition follows what it ate). Seeded by [cover-slate](../slates/builds/cover-slate.md) §§ 8–10 (the design, settled with the owner 2026-10-28) and [ranching-slate](../slates/builds/ranching-slate.md) (the feed loop).

## What already exists

- **Fields:**
  - The campus home field: 400 m², a clover ley, the college herd's home.
  - Hearts Delight's upper bench (4,000 m², three loose wheat plants as props) and its orchard close (beds and cherries under clover).
  - Waponi Woo's two estate cane pieces and two smallholdings, each holding six loose cane stools.
  - Hinkley Hills lots refuse fields (zoned residential).
- **Verbs:**
  - `plough` (one-time clearing; then "already clear"), `mow` (hay from the sward), `plot`, `grub`/`ditch`/`lime`.
  - The platform's `sow`/`plant` and `harvest`/`pick`, which work on beds, pots and loose plants.
  - `feed` (compost into a bed: **not** feeding animals).
  - Ranching's `draft`, `return`, `handle`, `milk`, `shear`, `gather`, `breed`, `slaughter`.
  - `move` is unclaimed.
- **Herds:**
  - Seven herdbooks: the college cattle (6); at Hearts Delight the flock (12, home on the *wheat* field), the oxen, the hens, the dairy cows (6) and calves (3); Rejection's goats (3).
  - A head is an animal only when drafted.
  - Body condition is shipped (fat cover; underfeeding kills production first, never the animal) and has **no input**: nothing feeds a head.
- **Hay and troughs:** hay comes only from `mow` and is stocked nowhere; a trough is sold at the general store and stands nowhere.
- **Tools:** a scythe (mowing), a plough, a spade and a billhook. There is **no sickle, no cane knife and no sowing tool**, and no shop sells a scythe or a plough (the campus yard has them as props).
- **Seed:** seed-wheat and barley rows exist, unstocked; the cane-sett row is unused. There is no wheat or flour line anywhere in the economy.
- **People:**
  - Waponi's cutters cut cane and the smallholders sell it.
  - At Hearts Delight, Odell the farmer, the dairywoman and the dairy lad do no field or feeding work.
  - The working dogs quiet stock.
  - The campus farm's two labourer seats are empty.
- **Disciplines:** `agriculture`, `soil-science`, `stockmanship`.
- **Drives:**
  - The farmstead drive (plough, mow refused, draft at the campus farm).
  - The sugar drive (steps 15, 17 and 18 harvest the loose cane).
  - The dairy drive (draft and milk).

**Therefore what is genuinely new here is:** a crop in a field (sown by area, grown on the field's own soil, harvested by area, fallowed back to grass); the hand tools that cut it and the seed that sows it in the economy; a herd placed on a field that eats it, with what it ate reaching its condition; hay as winter feed in a trough; and the staff who keep the authored herds fed.

## Goals

**Stage A: arable**
- A field holds one crop of a plant the game already knows (wheat, barley, cane), growing through its stages on the field's own water, warmth, daylight and nitrogen, and graded by its weakest stretch.
- **Sowing takes an area per act and seed sets the area:** a third of the seed sows a third of the field; a field needs ploughing for the season first.
- **Harvesting takes an area per act, at a rate the tool sets** (a sickle, a cane knife), and yields in proportion to the area cut; a field is real days of work.
- A harvest exports the field's nitrogen; a once-cropped field goes to stubble, and the grass grows back over it as fallow; ploughing turns that grass under and feeds the next crop.
- Cane regrows from its stools after each cut (a ratoon) and yields a little less each cycle, so tired cane is worth grubbing out and replanting from cut cane.
- The crop belongs to whoever holds the field: a hired hand's harvest is the holder's; another's standing crop can be taken, and the sheaf stays the holder's: its title shows whose it is (the game writes no theft record; the chain of title is the record, and judging a taking is the courts' to rule).
- **The island's cane lives:** the estate's cane pieces and the smallholdings keep yielding season after season.
- `look` reads a crop in words ("a third of the piece still standing", "the ears filling"), never as numbers.

**Stage B: grazing**
- A herd's keeper moves it onto a field with `move <herd> to <field>`; the field then shows the herd grazing it.
- A herd eats what its animals need for their size; the grass shows it (the shipped "grazed-out / short / ready / ahead of them" bands); its condition follows what it got, and the thin ones are the shy feeders.
- In winter, or on a bare field, the herd eats hay from a trough on the field or in its byre; with neither, it thins and its production (milk) stops, but it does not die.
- A herd moved onto a harvested field eats the stubble.
- **Every authored herd is fed honestly:** pastures sized to their herds, and at Hearts Delight and Rejection the venue's staff mow hay in summer and keep a **hay rick** stacked; the venue's trough is kept from the rick, so the dairy keeps giving milk with nobody watching (no one works during a clock jump; the rick is what carries the month). The campus herd is the player's to keep, which is what the teaching farm is for.

## Non-goals

- **The kernel `Cover`**: the sward and the timber stand as one shape on species rows, the stand's growth integrated. Goes to the cover slate § 4, a later build.
- **Weeds and crop disease build-up.** Go to the cover slate's Left list.
- **Paddock subdivision, gates, and the herd getting into the wheat** (the escape resolved at reconcile). Stay in the ranching slate's Left list.
- **The hired hand's grazing cadence and its utilization penalty.** Ranching slate.
- **Breeding, births and heredity.** Ranching slate § Breeding.
- **The sward stick** (an instrument read of the pasture). Ranching slate.
- **Seed drills, reapers and machines.** Nowhere for now, deliberately: the same verbs with a bigger area per act when an epoch brings them.
- **Foraging (wild plants).** The discovery slate. If no loose plant remains after this build, `harvest` on a loose plant retires and foraging brings it back with its own design; if one remains, it stays as foraging's to settle.
- **Hinkley Hills fields.** Nowhere, deliberately: its zoning refuses them, and that is the plat book's call.
- **The milling and baking of the new wheat.** The grain chain already exists; wheat reaching it is in scope, and new chain steps are not.

## Placement

- **Arable** belongs to `trade-farming` (`/trade/farming`): the field, ploughing, mowing and sowing on a field.
- **Grazing** belongs to `trade-ranching` (`/trade/ranching`): `move`, the herd's intake and condition, hay as feed.
- **The kernel** gains only what any bed already has: a place that holds a crop, and harvest and sow working by area. The platform's `sow` and `harvest` stay the verbs.
- **The tools:** the sickle and cane knife are `trade-farming` and `trade-sugar` rows. The general store sells them.
- **The venues' content** (Waponi Woo, Hearts Delight, the campus farm, Rejection's goat pen) changes in their own packs.

⭐ **A second farm needs zero code:** a field row, a plant row, a herdbook and a trough are content.

## Collisions

- **Waponi Woo:**
  - The four cane pieces' loose stools become each field's cane crop, established and ratooning.
  - The cutters' `harvest cane` now cuts the field by area; the smallholders keep selling.
  - The sugar drive's steps 15, 17 and 18 move with it.
- **Hearts Delight:**
  - The upper bench's three loose wheat plants become the field's wheat crop.
  - The flock moves off the wheat onto the orchard close (sheep under the cherries).
  - The dairy cows get a new 12,000 m² pasture, and a new 6,000 m² lower meadow is mown for hay; a hay rick and a trough stand by the dairy.
  - The orchard close grows from 1,200 to 3,600 m² to carry the flock (its title row changes; a fresh world).
  - The hens graze with the flock (there is no grain line for them).
  - Odell, the dairywoman and the dairy lad take on the mowing and the foddering.
  - The barn's eight wheat props are the farm's harvest.
- **The campus farm:**
  - The home field grows from 400 to 10,000 m² to carry its six cattle on grass in the growing season.
  - Its yard's "hay barn" and "water trough" props become a hay store and a real trough.
  - Its scythe, plough and spade stay props.
  - The farmstead drive's "`mow` refuses on day one" and "`plough` succeeds" both change meaning (plough now readies a seedbed each season), and the drive moves with them.
- **Rejection's goat pen** becomes a small field: a trough kept from a hay rick for three nannies.
- **The general store:**
  - New stock: seed wheat, seed barley, a sickle, a cane knife and the scythe. It already sells the trough.
  - The plough stays a carpentry make.
- **`feed`** keeps meaning "compost into a bed". Feeding animals is putting hay in a trough, with no new verb.

## Surface decisions

The design was settled in conversation and is recorded in the cover slate § 8 (D1–D9) and § 10 (G1–G5); here at product level.

### A field crop is one crop of the whole field

The plant's stages run once for the field, and its yield scales with the sown area. *Pedagogy:* the farmer's decisions (when to sow, what a frost at flowering costs) live in the stages.

### Harvest and sowing take an area per act

The tool sets the area: a sickle reaps more than bare hands, and a later reaper more again. *Pedagogy:* yield per acre and work per acre are different numbers; *continuity:* one verb across epochs.

### The grass is the fallow

`plough` readies a seedbed for the season by turning the grass under; after a once-cropped harvest the grass returns on its own. The ley-arable rotation is never authored.

### Seed sets the area, and out-of-season sowing is allowed

Out-of-season sowing grows badly, in words, because the engine does not forbid what nature merely punishes.

### Ratoon decline

Cane yields a little less each cycle, so replanting is a decision.

### Whose crop

The field's holder's. Sowing another's titled field is refused; harvesting another's standing crop is permitted, and the sheaf stays the holder's by title.

### `move <herd> to <field>`

- **Who:** issued by the herd's keeper, meaning its holder or the holder's staff on shift.
- **Where:** at its herdbook, or beside one of its drafted animals.
- **Which fields:** only the holder's own fields within the herd's home holding; anything else is refused in words.
- **How long:** the herd is there on arrival; the walk is not timed.

*Governance:* the criterion is title to the herd and the field.

### Intake by size

A head eats what its body mass says, with no per-species table. *Pedagogy:* derivable.

### Hunger thins, never kills

This is the shipped rule. Production (milk) stops first; that is the visible cost of an unfed herd.

### Every authored herd is fed

- **Hearts Delight and Rejection:** staff mow and fodder.
- **The campus herd:** the player's.

*Economy and participation:* the hay work is a hand-shaped hole a player can be hired into.

### Cane is planted from cut cane

No new act.

## Lens pass

1. **Pedagogy.**
   - *Agriculture:* sowing date and rate, the weakest stretch, yield versus labor per acre, the ley rotation as nitrogen spent and rebuilt.
   - *Stockmanship:* stocking rate against the grass, the winter-feed budget (enough hay to reach February, or sell down in autumn), the tail.
   - Every figure is derivable from the rows (intake from mass, yield from area).
2. **Creative expression.** The ordinary case is rows (a field, a plant, a herdbook, a trough); a farm on a new world needs no code. *Gap:* species growth parameters still live on each plant row, not the species (the later cover build).
3. **Immersion and participation.**
   - *Immersion:* the field and the herd are read in words, and an unfed dairy visibly stops giving milk.
   - *Participation:* the estate and the farm have reaper-, mower- and fodderer-shaped holes. The campus herd is a player's to keep alive or let thin.
4. **Values.** The hard call was an unfed herd, settled by the owner: fed honestly by its staff, and thinning (never dying) when nobody does it. Taking a standing crop is permitted and never prevented; the sheaf keeps its holder's title, and ruling on the taking is left to the courts.
5. **Continuity.** Sickle to scythe to reaper, broadcast to drill: the same verbs with a bigger area per act. A tractor answers `plough`.
6. **Economy.**
   - *Produces:* wheat, barley, cane at season scale, hay, condition and milk.
   - *Consumes:* seed, labor, the soil's nitrogen and the grass.
   - *Who pays:* the holder pays the hands.
   - The demand was there first: the mill and the grain chain for crops, the herds' standing need for feed.
7. **Governance.** Moving a herd and sowing a field judge a person by title; the appeal is the chattel record; nothing new is entrenched.

## The drive

Run on a fresh world. "A day" is a game day; clock jumps are the drive's.

**Stage A: arable**

1. At **Hearts Delight's upper bench**, `look`: the field reads as a wheat crop in words (its stage, how much of the field it covers). There are no loose wheat plants.
2. At the **general store**: `buy sickle`, `buy seed wheat`.
3. At the **campus farm**, `apply` for one of its two empty labourer seats and `clock on`: the field is the university's, and only its holder or staff on shift may sow it or move its herd (an unhired player's `sow` is refused first, in words). `get plough` in the yard, then `plough` in the home field. The grass is turned under and the field reads "ploughed for the season". Plough again: refused, already ploughed this season.
4. `sow wheat`: each act covers an area. After one act the field reads part-sown; the seed is spent in proportion. `sow` again until the seed runs out: "about a third of the field sown".
5. **Out of season:** at another ploughed patch, sow barley in late autumn, then jump to spring. It reads as poorly established, in words.
6. **Jump through the season.** `look` names the stages: emerging, tillering, in ear, ripening, ripe. `analyze ground` (the soil kit) before sowing, and again after the harvest, shows the nitrogen down.
7. **Harvest:** `harvest wheat` with the sickle cuts a swath and gives sheaves. Their grade is the crop's worst stretch. The field reads part-cut, and after enough acts "cut down to the stubble". Bare-handed, `harvest` cuts a smaller swath.
8. **Stubble to fallow:** jump a season. The field reads grass coming back over the stubble; `mow` would find nothing worth a scythe yet.
9. **Whose crop:** at Hearts Delight's ripe upper bench, `harvest wheat`. The sheaf is the farm's: examined, its title names the farm, not the player. `sow` on that field is refused (not yours to sow).
10. At **Waponi Woo's upper cane piece**, `look`: an established cane crop, ratooning. Watch the cutters: they cut the piece by area and carry the bundles to the mill.
11. **The cane lives:** jump 120 days (past where the loose cane used to die). The cane piece has regrown and the cutters are cutting again; the estate still shelves blocks.
12. **Ratoon decline:** after several ratoons `look` reads tired stools and a thinner stand. `grub` it out, `plough`, then `sow cane` with cut cane bundles: a new planting.

**Stage B: grazing**

13. At the **campus yard**, read the herdbook: the college herd is on the home field. `move college herd to <field>` at the herdbook, on shift. The field reads six cattle grazing it. Off shift, or as a stranger, `move` is refused.
14. **Grazing:** jump two weeks of summer. The grass band falls ("short"); `draft` a head and `handle` it: condition holding.
15. **Winter, unfed:** jump into winter with no hay. The grass stops ("grazed-out"); drafted heads read thinner, and the shy feeder (the seeded thin one) thinner still. None dies.
16. **Hay:** in summer, `mow` the meadow for hay; in winter, `put hay in trough` on the field. Jump two weeks: the herd's condition holds and the trough empties.
17. **Stubble:** after the campus wheat is cut, `move college herd to` the stubble field. They eat it down.
18. **Hearts Delight, unattended:** jump a winter month with nobody playing. The dairy's trough has drawn hay from the rick the staff stacked in summer, and the rick is lower; `draft` a cow and `milk` it: milk comes. The flock is grazing the orchard close under the cherries. (While the valley is loaded, the staff are seen mowing, stacking and forking.)
19. **Rejection's goats:** the goat pen (a small field now) has a trough kept from a rick; a drafted nanny is in fair condition after a winter month.

## Acceptance criteria

- A field shows its crop in words, and the crop advances through its stages over the season.
- `plough` readies a field for one season and is refused a second time that season; `sow` is refused on an unploughed field and on another holder's field.
- Sowing with a third of a field's seed leaves the field reading about a third sown, and its harvest yields about a third of a full field's.
- Each `harvest` act on a field takes an area and gives goods in proportion. A sickle takes more per act than bare hands. A field takes many acts to cut.
- A harvested crop's grade matches its worst stretch of the season.
- The soil reads lower in nitrogen after a crop than before it.
- A once-cropped field reads as stubble, and grass grows back over it in the following season.
- A cane field regrows after cutting and keeps yielding past 120 days; its yield falls across ratoons, and replanting from cut cane restores it.
- Goods harvested by a hired hand, or taken by a stranger, belong to the field's holder; examined, the stranger's sheaf names the field's holder.
- `move <herd> to <field>` puts the herd on the field, and the field shows it; the move is refused to anyone who is not the herd's keeper (its holder, or the holder's staff on shift) and for a field outside the herd's home holding.
- A player hired as a campus farm labourer, on shift, may sow the university's field and move its herd; the same player off shift may not.
- A grazed field's grass band falls under a herd and recovers when the herd leaves.
- A herd with no grass and no hay thins and stops producing, but no animal dies of it. One with hay in a trough holds its condition, and the trough empties.
- In one herd, some heads are thinner than others under the same feed, and the same heads every time.
- A herd moved onto a harvested field eats the stubble down.
- With no player present for a winter month, Hearts Delight's dairy still gives milk, its rick is lower by what the herd ate, and Rejection's goats are not thin.
- The general store sells a sickle, a cane knife, a scythe, seed wheat and seed barley.
- Waponi Woo's estate still shelves blocks a season into a world.

## Cross-references

- Seeding slates:
  - [cover-slate](../slates/builds/cover-slate.md) §§ 8–10 (D1–D9, G1–G5, the audit corrections)
  - [ranching-slate](../slates/builds/ranching-slate.md) (the feed loop, the winter-feed spine)
  - [farming-slate](../slates/builds/farming-slate.md) (the density axis)
  - [sugar-slate](../slates/tails/sugar-slate.md) (the estate's scale; the cane)
- Subsystems:
  - [soil.md](../subsystems/soil.md) (the field, the sward, D7)
  - [husbandry.md](../subsystems/husbandry.md) (the growth model)
  - [smallholding.md](../subsystems/smallholding.md)
  - [ranching.md](../subsystems/ranching.md) (the herdbook, draft and return, condition)
  - [taps.md](../subsystems/taps.md) (milk)
  - [forestry.md](../subsystems/forestry.md) (the stand, for the later Cover)
