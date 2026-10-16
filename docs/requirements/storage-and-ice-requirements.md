# Storage and the ice trade — requirements

**Kind:** feature
**Leads from:** kernel. The first consumers are in this build: the ice trade (the icehouse) and the sawmill's sawdust.

Goods held at scale stop being objects and become a count held by a
store. This build makes that true for the first time. It then builds
the preindustrial ice trade on it:
- winter ice cut from a frozen pool;
- packed in the sawmill's sawdust in an icehouse;
- sold through the summer as the stock melts.

Three corrections ride along:
- **a swimmer's body feels the water**, so thin ice can let you through into it;
- **the re-meltable lump stops claiming it can be alloyed**;
- **sawdust stops vanishing at the saw.**

Seeding slates:
- [storage-slate](../slates/builds/storage-slate.md);
- [ice-trade-slate](../slates/builds/ice-trade-slate.md);
- with logistics-slate Part 11.5 as the warehousing design storage completes.

## What already exists

**Ice and water**
- **The sheet on a lake or pond** ships (climate, MR !360):
  - its thickness grows with accumulated cold;
  - what it bears is derived from that thickness;
  - it is black or snow-ice, and it rots in spring;
  - `analyze water` reads it by eye.
- **Crossing ice** checks what it bears against each mover, and refuses a mover it won't hold.
- **A small water is a place you are in** (maritime, MR !358). It can be swum, and it can't be swum while it reads frozen. Its comment leaves *"walking on it, how thick it is"* to this build.
- **The shore is a place,** and verbs bind the water the place cites, by default or by name.
- ⚠ **No frozen pool exists.** The only pool is on the sea, which has no ice. The three cold meres are shores you stand beside:
  - blackmere in the north;
  - circlemere and clearmere in the Circle.
- **Swimming:** the swimmer breathes the air. But **a swimmer's body temperature reads the room's air, not the water**, so a winter swim chills like standing on the bank.

**Cold goods**
- **A 4 kg block of ice** ships. It holds at 0 °C until its melting heat is spent, and lasts hours in an icebox.
- ⚠ **The block claims it can be alloyed and tempered,** because the shipped re-meltable lump carries metal's alloying. The same lie is on glass and wax lumps.
- ⚠ **Its material lives under the bottling trade.**
- **Freezing in a pan** turns a pan of water into a block.

**Cold-storage venues**
- **The cookhouse icebox** holds one authored block, never replaced. That gap is the named demand.
- **Two kitchen iceboxes** sit empty.
- **The bottling counter** sells **bagged ice** from nowhere: an import line, with freezer-made ice as its fiction.
- **The lounge's ice bin** restocks from a distributor that stocks no ice.
- **The general store has a powered cold room,** which is ice's industrial successor, already standing.

**Rooms and storage**
- **A room's temperature is derived** from its walls (a material and a thickness), its openings, and the heat sources inside it.
- **Storage that exists today:**
  - **The haulage depot's warehouse** holds goods as live objects and files a receipt, but **there is no way to withdraw**. Logistics names *"`withdraw <receipt>` at the shed"* as the missing piece.
  - **Shop counters** hold discrete goods topped up to par. A line with a supplier is bought by the keeper's restocking; a line without one is imported from nowhere.
  - **Banking** is the only store that turns goods into a count and back again.
  - **Nothing holds goods as a count per grade.**

**Wood**
- **`saw`** (carpentry, MR !361) turns a log into boards at the Heart's Delight sawmill (sawyer Tamsin Rook, a timber-yard counter) or a pit saw. **The rest of the log's mass vanishes**, and `carve`'s shavings vanish too.

**Verbs**
- **Taken:**

  | verb | owner |
  |---|---|
  | `cut` | tailoring |
  | `saw` | carpentry |
  | `plough` | farming |
  | `draw` | banking |
  | `tally` | a University Avenue domain verb |

- **`measure` and `analyze`** are flat verbs over reading rows any pack can add. None reads ice thickness or a store's stock.
- **Free:** `scrape`, and `deposit`/`withdraw` at the top level (banking's are `bank` subcommands).

**Disciplines and tools**
- **Disciplines:** none for ice or storekeeping. `appraisal` (a merchant's eye) and `physics` exist.
- **Tools:**
  - none exists for ice: no ice saw, ice tongs, spud, scraper or ice marker;
  - tongs exist only as a forge tool;
  - the haulage wagon and draft horses ship.

**Therefore what is genuinely new here is:**
- a store that holds fungible goods as a count per grade, with custody claims and a keeper;
- a counter that sells out of a store;
- standing on, cutting and falling through a frozen pool;
- the pond remembering what was done to it;
- the ice trade's tools, seats and Discipline;
- the icehouse as a store whose stock melts by its own physics and chills its room;
- sawdust as matter;
- the water's cold reaching a swimmer;
- a re-meltable lump that tells the truth.

## Goals

**Storage**
- **A store holds goods as an amount per good and grade,** not as objects, and keeps them across a restart.
  - A good joins a store only if it **declares** it can be pooled, and its declaration says how differing goods merge.
  - What a pooled good keeps (ice its temperature, timber its seasoning) survives storage and comes back out on the goods drawn.
- **A store's stock changes with time under the conditions that reach it,** whether or not anyone is there. Ice melts there, and the stock is less when anyone next looks.
  - **The physics is the good's;** the conditions are the room's.
  - **A big stock loses a smaller share than a small one** under the same conditions.
- **A melting stock chills its room,** so an icehouse is a cold room too.
- **Back of house (custody), with no money moving except a storage fee:**
  - the house's staff on shift put goods into and take them out of their own house's store, on the house's claim;
  - an outside depositor deposits and withdraws **through the keeper**, who issues a receipt and pays out against it on its printed terms (a shrinkage allowance and a fee);
  - **loss beyond the allowance is shared pro rata** by everyone with a claim on that good and grade.
- **The stock can drift from the books, and someone can find out:**
  - anyone in the room can physically take from or add to the stack, off the books;
  - the keeper learns the true stock only by measuring it, to a precision their skill earns.
- **Front of house:** a counter can sell from a store, so an empty store means an empty counter. Its asking price follows how many days of stock the store has left.

**Ice**
- **A frozen pool is a place a person can stand on** when, and only when, it bears them.
  - **Ice that doesn't bear you lets you through** into the water.
  - **Cold water chills a swimmer's body** far faster than cold air, and does so wherever anyone swims.
  - **Going into water soaks you and what you wear,** so climbing out wet into freezing air keeps chilling you.
- **A field can be worked by a person:** read for thickness, scraped of snow, marked into a grid, and cut into blocks.
  - **The pond remembers each of those acts:** a scraped patch grows faster and black; a cut patch is open water and refreezes thinner from that day.
  - **A cut block's mass and grade come from the ice it was cut from.**
- **The ice trade has real seats:** an ice company with a keeper, house hands, a seasonal crew and an ice boss, each held by an NPC and takeable by a player. NPCs in them do the work through the same verbs a player types.
- **The icehouse keeps ice through a summer:**
  - in proportion to its size and its sawdust;
  - **while its meltwater soaks the packing,** so a house that isn't repacked each season insulates worse and melts faster;
  - it sells it from its own counter;
  - it's cheap in spring and dear in late summer.
- **A frozen water can be fished only through a hole** cut in it, and a hole is part of the pond's memory like any other cut.
- **The cookhouse icebox is resupplied** by its keeper buying ice from the ice company, and money moves.

**Corrections**
- **A sawn log leaves sawdust in proportion to the cuts made.** It accumulates where it was sawn, can be gathered, and packs an icehouse.
- **An ice, glass or wax lump no longer claims to be alloyable,** and a metal lump still is, with nothing lost.
- **Ice is a material of the commons,** not of the bottling trade.

## Non-goals

**Movement, cargo and delivery**
- **Moving goods store-to-store as one act; a ship's hold as a store; any cargo** → freight-slate. Deferred by the user until every RGO is designed.
- **Moving ice from pond to house, and sawdust from mill to house** → placeholder. This build uses existing means only: carrying, the haulage wagon. Freight-slate replaces it.
- **Poling blocks down a channel, hooking them out, the elevator into the house** → freight-slate (handling at scale).
- **Ice by sea** (the Tudor trade, ice as ballast) → freight-slate.
- **The iceman's delivery route** → logistics-slate.
- **The ice card in the window** (a standing order) → standing-instructions-slate.

**Places**
- **Where ice fields actually are** (realm geography) → nowhere for now. Every place this build authors is placeholder.
- **A warehouse interior you can walk through** → nowhere, deliberately (it would be generated rooms).

**Storage beyond this build**
- **Damp, spontaneous combustion and vermin in stores** → storage-slate's next pass, with the granary and the haymow. ⚠ **One exception is in this build: meltwater soaking an icehouse's packing** (see Surface decisions).
- **Building materials, erection and upkeep** (a building's bill of goods to erect and maintain it, paid in RGO outputs; the icehouse's wall fill would be one line of its bill, its settling and rot the upkeep) → [structures-slate](../slates/builds/structures-slate.md), **after the rubber build lands**.
  - Decided 2026-10-16, after reading rubber beside this: rubber's layered walls are the seam the bill derives from (each layer's material × area × thickness), so it is built on that and in neither build.
  - **Until then, walls are authored construction**, and they wear nothing.
- **Moving the timber yard onto a store** → storage-slate, as a candidate.
- **Transferable receipts** (futures; a receipt as collateral) → storage-slate; credit.md wants the second.
- **NPC restocking while nobody is online** → unobserved-economy-slate. The physics needs nothing: stores catch up when read.

**Other trades and kinds of ice**
- **Offcuts and slab wood from the saw** → carpentry-slate.
- **The lounge's ice bin** (it wants crushed ice), and **the bagged-ice import line** (freezer ice, cold-chain's industrial rung) → cold-chain-slate.
- **Ice made in pans on clear nights** (radiation to the sky) → the weather slate. The model has no sky-radiation term. Rubber's roof face is where it would attach (an exterior top face that sees the sky loses heat to it, weighted by cloud).
- **Thin ice over a current, pressure ridges** → watershed.

**Cross-cutting capabilities**
- **Load-bearing surfaces in general** (rotten floors, weak bridges) → its own slate. Ice's bearing is the water's.
- **Going under the water** (diving, drowning beneath the ice) → underwater-slate. Breaking through puts you at the surface, swimming. A hole is never a way down.
- **Ice rescue** (a rope thrown from thicker ice, crawling out flat to spread your weight, pulling someone out) → [ice-trade-slate](../slates/builds/ice-trade-slate.md), as the next content on the harvest.
- **Ice-fishing gear and behaviour** (tip-ups, shanties, whether fish bite less in cold water) → [fishing-slate](../slates/builds/fishing-slate.md). This build only makes frozen water fishable through a hole.
- **A licence to cut beyond holding the water** → navigable-water-slate § 5.

## Placement

- **Storage is kernel** substrate. Its composers have no common pack: the ice trade, carpentry's sawdust heap, the haulage depot. A second store is rows.
- **The ice trade is a new trade pack** at `/trade/ice`. It ships:
  - the harvest verbs, the tools and the Discipline;
  - the icehouse kind and the ice company's seat shapes.

  ⭐ **A second icehouse, ice company or harvest pool needs no pack code**, only rows in a locality.
- **Ice the material, and the block,** live in the commons, beside water.
- **Sawdust is carpentry's,** because the saw makes it.
- **Cold water reaching the body is the kernel's** body-heat correction, and applies to every swimmer.
- **The placeholder venue** (frozen pools at circlemere and clearmere, an icehouse, an ice company) is authored in the Circle's locality content. The icehouse is two rooms in one building: **the platform** and **the house** (see Surface decisions).
- **The icehouse is a building of its own,** standing apart from any warm room as real icehouses did. It is authored as a building now, which already works. That keeps rubber's count of rooms in no building from rising, and lets it take walls and a roof from the building when rubber lands.

## Collisions

**Places and people**
- **The Circle and the north** (climate content): circlemere and clearmere gain a frozen pool you can walk out onto. The existing shores and crossings stay. The climate drive's checks at those shores must still pass.
- **The Heart's Delight sawmill and sawyer:** the floor gains a real sawdust heap. The timber-yard counter is unchanged.
- **The haulage depot warehouse and its warehouseman** (the estuary towpath): it gains the withdraw its receipt was missing, as the first bailee store.
- **Fishing at the cold meres:** today `fish` and `lay` work straight through solid ice, because fishing has no notion of frozen water. That's a defect this build corrects: frozen water is fished only through a hole. Fishing's drive must still pass in open water.
- **The cookhouse:** its icebox's par names the ice company as supplier, so its authored block is resupplied.
- **The general store's powered cold room, and bagged ice at the bottling counter:** both stand as ice's successor. Nothing changes.

**Kernel behaviour other builds rely on**
- **Every swimmer** (the estuary pool, the sea) now feels cold water, and is soaked by it. Maritime's drive must still pass. A summer swim chills nobody, but still leaves you wet.
- **Metal lumps** (smelting, smithing, salvage) must keep their alloying exactly. Their drives must still pass.

**Words and verbs**
- **`plough`** (farming) also marks a frozen pool.
- **`cut`** (tailoring) is shared with the ice cut, and neither may shadow the other.
- **`measure`** gains two readings.

**⚠ The rubber build (build-1, planned, not built)**
Read side by side on 2026-10-16; see build-1's note `docs/plans/rubber-note-to-storage-and-ice.md` on `reqs/rubber`.
- **The ice material:** rubber authors a light-absorption value on it, and this build moves it to the commons. Whichever lands second re-points it.
- **The icehouse is a building now** (see Placement), so neither build raises rubber's count of rooms in no building.
- **Walls become layers** under rubber (a list, outermost first, in series). The honest icehouse wall is timber, sawdust, timber. Until then it is one thick layer of the same total insulation, converted by editing the row.
- **⚠ One wet law, not three.** Water filling a material's pores is one mechanism:
  - this build's wet sawdust, for heat;
  - rubber's wet leather, for electricity;
  - textiles' **already-shipped** wet cloth, for heat (why wet wool fails).

  It is stated once, at the material, and every reader uses it. Whichever build lands first generalizes the textiles law, and the second consumes it, never a new copy.
- **Rooms in one building share heat** under rubber. An icehouse that stands apart is unaffected, and one that shares a wall with a warm room would rightly gain heat through it.

## Surface decisions

### Big ice and little ice: the representation changes at scale

| scale | what it is | its physics |
|---|---|---|
| **the sheet** on a pool | a calculation from the weather | ships unchanged |
| **a block** in hand, on a cart, in an icebox | an ordinary object | ships unchanged |
| **the stock** in a store | an amount | **the store's**: heat in through the stack's surface (which grows more slowly than its mass) and its packing |

Object physics stays as it is. Lenses 1 and 2: the real mechanism, and new kinds of store as rows.

### The store and its room
- **The store is an object in an ordinary authored room,** not a walkable place.
- **It reads its conditions from what reaches it.** A store in a compartment reads the compartment.
- **The packing belongs to the stock:** an icehouse's store holds an ice line and a sawdust line. **The sawdust's amount over the stack's surface is the packing's depth**, and so its insulation. Too little sawdust is a fast melt.
- **The shed's own walls are the building's walls,** authored thick: historically a sawdust-filled double wall, and timber, sawdust, timber once rubber's layers land.
- **The same law governs both layers** (thickness over conductivity), and sawdust's conductivity is authored once.

### The icehouse venue: two rooms, and the stack is neither
- **The platform (front of house)** is where people transact:
  - the counter, where customers buy;
  - the keeper, who takes deposits, issues receipts and pays out against them.

  Blocks are **brought up from the house to order**, as they historically were: the counter keeps a tiny par, topped up from the store as it sells, so little melts on it. Once rubber lands, the platform also borrows the house's cold through the shared wall.
- **The house (back of house)** is the shed where the stack stands. Staff work here. Its door can be locked, and whoever gets in anyway can take from the stack.
- **The store is not a pseudo-location.** It's an object whose contents are a ledger. From places it borrows only two things:
  - conditions reach it, as they reach any object;
  - its contents are recorded, not perceived: `look` describes them in words.

  It has no air, light, exits or occupants. The one way it acts on a place is as **a heat sink in its room**, the way a stove is a heat source.

### Meltwater soaks the packing
- **The ice's melt wets the sawdust** in proportion to the mass melted, less what the house's floor drains away. Drainage is a property of the store, authored like the stack's shape.
- **Wet packing insulates by the law that already makes wet wool fail,** the one wet law shared with rubber (see Collisions). Water conducts about 23× better than air.
- **So a neglected house spirals:** a soaked house melts faster, which soaks it more.
- **The keeper's seasonal work** is to dig out the spoiled sawdust and repack with fresh, which gives the sawmill a recurring buyer.
- **Wet sawdust is a grade of sawdust,** so spoiled packing taken out is distinguishable from fresh.
- Lenses 1 and 6: wet insulation is textiles' lesson again, and without it sawdust is bought once and never again.
- **Only the meltwater path is in.** Damp in general stays deferred.

### What a stock line keeps
- **A line is a good, a grade band and an amount,** plus the state the good declares:
  - ice: its temperature;
  - timber: its seasoning;
  - grain: its moisture and microbial load.
- **Putting goods in merges that state by the good's rule:** temperature by mass, because heat is conserved; seasoning by the least seasoned.
- **Taking goods out makes objects carrying the line's state:** a block drawn in August is at 0 °C.
- **Grade bands are the keeper's rule:** pooling only with your peers is why grades exist.

### Back of house and front of house are different concerns
- **Custody (back of house):**
  - the house's staff on shift put and take on the house's claim (their seat says they act for the house);
  - an outside depositor deposits and withdraws through the keeper, using two new top-level verbs, `deposit` and `withdraw`;
  - the keeper issues and honours **receipts** on printed terms;
  - no keeper present means the store is shut to depositors.
- **Retail (front of house):** a customer buys at a counter that tops itself up from the house's claim. A customer never touches the store or a receipt.
- **Off the books:** anyone in the room can `get` from or `put` on the stack physically, and no claim changes. That's how pilferage happens, invisibly, and stocktake is how it's found. The keeper defends the stock with locks, watchmen and presence, never an engine rule (lens 3b).

### Who eats the loss
- **Ordinary loss within the printed shrinkage allowance is nobody's fault.**
- **Beyond it, everyone with a claim on that good and grade shares pro rata,** because pooled goods are owned in common. A run on the store pays out pro rata.
- **The engine never judges negligence.** It reports the stock, the claims and the room's history, and a dispute goes to the courts.
- Lens 1: it's the historical rule, and it teaches what *commingled* means.

### Pricing follows the store
A counter fed from a store asks a price that follows **the store's** days of supply, not the shelf's. Ice is cheap after the harvest, climbs through the summer, and spikes after a warm winter. A player keeper can always set the price by hand.

### The harvest
- **The site is a frozen pool.** You stand on it if it bears you, and fall through if it doesn't. There's no roll: the ice is a fact (uncertainty doctrine).
- **The work, in four verbs:**
  - **`measure ice`** with a spud gives the thickness, to a precision banded by skill;
  - **`scrape`** clears snow off a patch;
  - **`plough`** with an ice marker scores the grid and sets the block size. The hand marker is pushed; the ice plough is drawn by a horse, which needs thicker ice than a person;
  - **`cut`** with an ice saw takes a block.
- **The hand rung's blocks are carryable with tongs** (about 25–50 kg). Bigger cakes go by wagon, as placeholder.
- **The ladder is hand saw → crew and horse plough.** The steam elevator is the next rung, out of this build with the rest of handling at scale.
- **The pond remembers what was done to it,** and `look` at the field shows it: the scored grid, the open channel, the cut.
- **Timing is a bet.** The forecast is exact for a day and blind beyond it, and a harvest runs for weeks. No change is needed.

### The frozen pool: one room, on it or in it
- **The pool is one room:** the water's surface. Inside it, a person is either **on the ice** (if it bears them) or **in the water**, at the surface, swimming. An unfrozen pool is all "in".
- **A hole is not a room.** It's a patch of open water in the pond's log, so there's **no down exit**. At a hole a person can:
  - lower themselves into the water, deliberately;
  - climb back out onto the edge, if the edge bears them;
  - fish through it.
- **Falling through, step by step:**
  1. **The ice is checked against what's on it** when someone steps onto the pool, when their load changes on it (picking up a block, a horse coming out), and when the place catches up after time has passed (spring rot under a crew still working). Thickness against mass, never chance.
  2. **If it doesn't bear you, it gives way.** You're in the water at the surface, breathing air, your body feeling 0 °C water.
  3. **You and what you wear are soaked.**
  4. **The body's cold already ships:** a hypothermia condition, and medicine's `warm`. Cold water drives you into them in minutes, and wet clothes keep you chilling after you're out.
  5. **Getting out:** onto the edge if it bears you (the ice that just broke under you won't, which is the real danger), or swim to the shore, since a pool's exits are swimmable from the water.

### What persists, and what repairs the ice
- **The sheet is never stored.** It's always recomputed from the weather, so nothing resets it.
- **The pond's log persists.** A restart or a reload doesn't repair a cut field.
- **Time repairs it, through the same climate physics.** The sheet already grows from the last open water, and a cut is open water on its date. So:
  - a cut patch regrows by the same law from zero on that date, under the same weather;
  - it's black unless snow falls on it afterwards;
  - a scraped patch grows at the clear-ice rate until new snow lands on it.

  That's why a second crop is thinner. Climate needs nothing new beyond regrowth starting from a given date.
- **The spring thaw wipes the log.** Once the whole sheet is open water, earlier cuts and scrapes are moot, so the log is one winter's memory.
- **The store's stock and the receipts persist,** and catch up when read.

### Ice fishing, minimal
- **Frozen water can be fished only through a hole.** Through solid ice, `fish` and `lay` are refused in words.
- **A fishing hole** is cut with the ice saw, or bored with the auger forestry already ships. It's a small cut in the pond's log and refreezes like any other.

### Cold water
- **A swimmer's body reads the water around it:** its temperature, and its much higher conductivity.
- **Under ice the water is about 0 °C.** Water that is part of a larger body reads that body's temperature.
- **The fix applies to every swimmer.** Breaking through puts you in it at the surface, swimming, as maritime ruled.
- **Going into water soaks you and your worn clothes.** The wetness gauge and textiles' wet-cloth law both ship, but nothing wets a swimmer today. Wet clothes then insulate badly by that law, which is the real danger after you climb out.

### Sawdust
- **`saw` leaves sawdust in proportion to the cuts it made:** one kerf per cut, derived, with no dial.
- **It accumulates on the floor where it was sawn,** as a heap anyone can gather from.
- **It's a poolable good.**
- **Offcuts are carpentry's.**

### The seats and the Discipline
- **The ice company's seats:** a keeper, house hands, a seasonal crew, and an ice boss distinct from the keeper. Lens 3b: an NPC doing two jobs is a vacancy deleted.
- **One new Discipline, ice harvesting,** for reading a field and cutting it.
- **Stocktake readings are banded by the existing `appraisal`.**

### The truthful lump
- **The re-meltable lump is just that.**
- **Alloying belongs only to metal's form,** which keeps all of it.
- **The ice block carries a grade:**
  - black or snow-ice from the sheet;
  - cloudy from a pan.

## Lens pass

1. **Pedagogy**
   - **Latent heat.** The box holds, then falls off a cliff.
   - **Stefan's law, felt.** The second 10 cm takes three times as long as the first.
   - **Snow is insulation.** Scraping is the lesson.
   - **Surface against volume.** Why icehouses were big.
   - **Record against reality.** Why stocktakes exist.
   - **Commingling.** Why grades exist.
   - **Cold water kills in minutes.**

   Disciplines: ice harvesting (new), appraisal, physics.
2. **Expression**
   - **Constant:** the physics and the ledgers.
   - **Variable:** the pond, the season, the grid, the crew, the house's size and packing, the terms, the grades.
   - **Named works:** the Walden harvest; an icehouse that fails in a warm March.
   - **Rows are enough for:** every lot in the storage slate's table, and a second icehouse, pool or company.
3. **Immersion and participation**
   - **3a:** the ice can let you through, the lump no longer lies, the sawdust exists, and the stack reads in words while the number lives in a ledger that can be wrong.
   - **3b:** the keeper, the ice boss, the crew and the watchman are vacancies, and theft is possible.
4. **Values**
   - **When to go out on the ice,** and when to start cutting.
   - **What terms to print.**
   - **Whether to hold or sell,** and **how to handle a run.**

   None of these has a right answer. The house's state is the evidence, not a score.
5. **Continuity**
   - **Hand saw → horse plough → (later) steam,** all answering `cut` on the same field.
   - **Then plant ice and the cold room,** already standing, take the trade, and the icebox doesn't care where its block came from.
   - **Stores of every era** answer the same deposit, withdraw and receipt.
6. **Economy**
   - **The demand was there first:** every icebox restocks as its block melts.
   - **Seasonal wages land in the farm's dead season.**
   - **Inputs:** smithing's tools, ranching's horse, carpentry's sawdust.
   - **Inventory as arbitrage across time.**
7. **Governance**
   - **Loss is decided by printed terms and the courts,** never the engine.
   - **Grades are the keeper's rule.**
   - **Whoever holds the water allows the cut.**
   - No person is judged by the engine.

## The drive

Run in a world where the Circle is in winter. Travel between placeholder places by whatever means the harness has: that is the deferred haul.

**On the ice**
1. **At the circlemere shore on the first day of the cold,** `analyze water` reads young snow-ice that doesn't yet bear a person.
2. **Walk out onto the frozen pool.** You break through, and are in the water, swimming at the surface. Your body reports the cold quickly, far faster than standing on the shore would. Your clothes read soaked. Try to climb out onto the edge: the ice that broke won't hold you. Swim back to the shore. On the shore, still soaked, you keep chilling until you're dry or warmed.
3. **A day later,** walk out again. The ice holds you. `measure ice` with the spud reports its thickness and grade.
4. **`scrape` a patch.** The snow is cleared.
5. **After several more cold days,** `measure ice` on the scraped patch reads black and thicker than the unscraped field. `analyze water` agrees.

**The cut**

6. **`plough` the field with the hand marker.** `look` at the field shows the scored grid.
7. **`cut` a block with the ice saw.** It is graded from the sheet, and its mass follows the thickness and the grid. `look` at the field shows the cut and the open water. Standing where the cut was would put you in the water.
8. **Fishing.** `fish` through the solid field is refused in words. Bore a hole with the auger and `fish` through it. Lower yourself into the harvest channel and climb back out onto ice that bears you.
9. **Try a horse and ice plough on ice that bears a person but not a horse.** The horse can't go out. Wait until the ice thickens, and it can.
10. **`get` the block with tongs and carry it to the icehouse.**
   - On shift as a house hand, `put` it on the stack. The house's stock rises.
   - Then, as an outside depositor, `deposit` a block **with the keeper**. A receipt in your name is issued, showing its terms.

**Sawdust**

11. **At the Heart's Delight sawmill, `saw` a log.** Sawdust appears on the floor, in an amount that follows the number of boards cut. Gather it, carry it to the icehouse, and put it with the stack.

**Summer**

12. **Advance the season to late summer.**
    - `look` at the stack describes it in words: how much remains, the state of the packing.
    - `measure stock` gives an estimate, more precise for a skilled reader.
    - The **small icehouse has lost a far larger share** of its ice than the large one under the same weather, and a stack with thin sawdust has lost more than a well-packed one.
    - `look` at the packing shows it wetter than it went in.
    - A house that was never repacked has lost more than one whose keeper dug out the wet sawdust and repacked mid-season.
    - The dug-out sawdust reads as wet.
13. **The icehouse room is colder than an empty shed beside it.**
14. **A second character, with no claim and no shift, `get`s a block from the stack.** No receipt changes. The keeper's next `measure stock` falls short of the claims by more than the melt explains.
15. **At the ice company's counter, `buy` a block.**
    - It is dearer now than it was just after the harvest.
    - Empty the house's own claim: the counter sells out and does not refill.
16. **The cookhouse's icebox block melts.** The cookhouse keeper buys a new block from the ice company. The ice company's account rises, and the cookhouse's falls.
17. **As the depositor, `withdraw` against the receipt with the keeper.**
    - The block comes out at about 0 °C, and the fee is paid.
    - With two depositors on one grade and losses beyond the allowance, each gets their pro-rata share.
18. **With no keeper present,** `deposit` and `withdraw` are refused in words.

**Kernel checks**

19. **`look` at an ice block and at a glass lump:** neither claims alloying. `look` at an iron lump: it still does, and its carbon is unchanged.
20. **Swim in the estuary pool in winter and in summer.** Winter chills the body; summer doesn't.
21. **Restart the world.** The stores' stock, the receipts and the pond's cut and scraped patches all survive.

## Acceptance criteria

**Ice and the harvest**
- A person who walks onto ice that cannot bear them is in the water, and one who walks onto ice that can is standing on it. Which happens is decided by the ice's thickness and their mass, never by chance.
- A swimmer in near-freezing water has their body cool several times faster than in air of the same temperature. A summer swimmer is unaffected.
- `measure ice` reports a pool's thickness and grade, more precisely to a skilled reader.
- A scraped patch reads thicker and black compared with the snow-covered field after the same cold.
- A cut patch reads as open water at once, and then as thinner ice than the field.
- A block's mass changes with the ice's thickness and the grid's size, and its grade with where it was cut. A pan-frozen block reads cloudy.
- A draft horse cannot go out on ice a person can, until the ice thickens.

**Storage, custody and retail**
- An icehouse's stock falls through a summer:
  - faster for a small house than a large one;
  - faster for thin sawdust than thick;
  - by an amount a person can estimate with `measure stock`.
- An icehouse's packing grows wetter as its ice melts, and a repacked house keeps its ice better than one left wet. Spoiled packing taken out reads as wet sawdust.
- An icehouse room reads colder than the same room without the stock.
- Taking from the stack with no claim changes no receipt and is discoverable by stocktake.
- Custody:
  - a deposit through the keeper produces a receipt naming the depositor, good, grade, amount and terms;
  - a withdrawal against it returns goods of that grade and charges the fee;
  - loss beyond the allowance is shared pro rata;
  - with no keeper, both are refused in words.
- Retail:
  - the ice company's counter sells blocks while the house holds ice, and sells out when it doesn't;
  - its price is higher in late summer than after the harvest.
- The cookhouse icebox, left alone through a summer, is resupplied by purchase from the ice company, and money moves.

**Corrections**
- Sawing a log leaves sawdust that grows with the number of cuts, and it can be gathered and packed into an icehouse.
- Ice, glass and wax lumps show no alloying, and an iron lump still shows and keeps its alloy.

**Across the world**
- Every stock, receipt and pond log survives a restart.
- The climate, maritime, assembly, smelting and fishing drives still pass.

## Cross-references

**Seeding slates**
- [storage-slate](../slates/builds/storage-slate.md)
- [ice-trade-slate](../slates/builds/ice-trade-slate.md)
- [logistics-slate § 11.5](../slates/builds/logistics-slate.md)

**Adjacent slates**
- [freight-slate](../slates/builds/freight-slate.md)
- [carpentry-slate](../slates/builds/carpentry-slate.md)
- [cold-chain-slate](../slates/builds/cold-chain-slate.md)
- [preservation-slate](../slates/tails/preservation-slate.md)
- [unobserved-economy-slate](../slates/builds/unobserved-economy-slate.md)
- [standing-instructions-slate](../slates/builds/standing-instructions-slate.md)
- [underwater-slate](../slates/builds/underwater-slate.md)

**Subsystems**
- [watershed](../subsystems/watershed.md)
- [expanse](../subsystems/expanse.md)
- [thermal](../subsystems/thermal.md)
- [logistics](../subsystems/logistics.md)
- [retail](../subsystems/retail.md)
- [employment](../subsystems/employment.md)
- [assembly](../subsystems/assembly.md)
- [banking](../subsystems/banking.md)
- [locomotion](../subsystems/locomotion.md)
- [respiration](../subsystems/respiration.md)

**In flight**
- The rubber requirements (build-1, `reqs/rubber`): the building envelope, and the ice material's light absorption.
