# Dairy — requirements

**Kind:** feature (a trade, and the venues it belongs to)
**Leads from:** content — the first sinks for a source that already
ships. Four kernel seams ride along (milk that spoils, a fermenting batch
that does not rot, a solid thing that ripens, a herd that comes back into
milk), and **every one has its first consumer in this build**.

⭐⭐⭐ **Milk is a source with no sink, and the lens doc says so.**
`design-lenses.md` names *"a byre producing milk nothing takes"* as its
own example of a bad economy, and that sentence describes this realm: the
`milk` verb ships, the cow gives 22 litres a game day, and no recipe,
drink or trade anywhere takes a drop. The milk row's own comment already
states the thesis — *"it keeps for hours… what you do with milk you have
to do today"* — and the shipped row makes it false, because milk as
authored never spoils at all.

This build makes the comment true and gives the milk somewhere to go:
the valley's **co-op creamery** at Heart's Delight, where milk becomes
cream, butter, cheese and yoghurt; a dairy farm on the Delight's flats to
fill it; ewe's milk off the bench; nanny goats in Rejection; and the
kitchen recipes that take what the creamery makes. Seeded by
[dairy-slate](../slates/builds/dairy-slate.md).

> ⭐ **The forced choice is what today's milk becomes** — made daily,
> under a clock that does not wait. Sell it, set it for cream, churn it,
> or lock it into a wheel that is worth more in a month and nothing if
> the room is too warm.

---

## What already exists

- **The tap.** `draft <n>` takes a head out of a herdbook, `milk <cow>
  into pail` fills a pail (the overflow goes on the straw), and a cow left
  unmilked past her window **dries off** for the lactation — read in
  words on `look`. Ranching's (`trade-ranching`), over the kernel's taps
  ([taps.md](../subsystems/taps.md), [ranching.md](../subsystems/ranching.md)).
- **One milk, from one animal.** Only the cow has a milk tap; the sheep
  gives wool, there is no goat. One milk material, in the commons.
- ⚠ **Three defects on the tap:** milk carries **no spoilage rate** (it
  never turns, at any temperature); **nothing brings a dried-off cow back
  into milk** (a herd that dries off is gone for good); and **the tap
  checks no sex** (a bull or one of the Delight's oxen can be milked).
- **The pail** holds liquid (fixed by the pump build) and is sold at
  Rejection's store.
- **Maturation** — a batch in a vessel works over time between
  temperature bands, a culture gates it, and a finished batch leaves
  **lees** you cannot pour off, which become next time's culture. Cultures
  come in jars; you pitch by pouring. ⭐ `maturation.md` already names the
  lees split as the curd/whey split — and names its own gap: **a solid
  thing cannot ripen**, so aged cheese has no mechanism.
- **Casting** — a liquid pool that freezes in any vessel becomes its
  MATERIAL's cast shape (water → an ice block, a metal → a lump; the
  smelt's ingot arrives this way). The ice pan is a mould in all but name,
  and the vessel has no say in the shape. ⭐ The glass slate §8 extracted
  moulds as a common system — *"molds → the dairy build"* — and named its
  consumers: the cheese hoop, metal casting, baking tins, bricks, candles,
  soap, press-moulded ceramics.
- **The kill curve** — a recipe can hold food at a heat for a time, and
  heat kills spoilage flora, pathogens and cultures by their own
  parameters. Low-and-slow pasteurization (63 °C, 30 min) is expressible
  today.
- **Silent contamination** — seeded only by butchering, reported by no
  sense, cleared by washing, killed by heat; ⭐ when you fall ill from
  something somebody else made, the **accountability ledger already
  records the harm against the maker.**
- **Kitchens** — `heat`, `stir`/`shake`, `pour`, `add`, `plate`, `cook`,
  `bake`; fat-taking fried recipes; an enriched dough with eggs; hens and
  their eggs at Heart's Delight.
- **Portioning** — no food-portioning verb; `split` divides a thing into
  usable units and ships only for quarried stone.
- **Selling** — `consign <thing> --ask <n>` on a consignment shelf.
- **Cold rooms ship** (the cold chain is partial, not absent).
- **Disciplines** — `stockmanship` (reading the animal, *"never what the
  animal gives"*), `fermenting` (brewing and winemaking specialise it),
  `cooking`.
- **Places** — Heart's Delight is *"the only town that feeds the city"*;
  its bench is sheep country and its flats hold the water rights; it is
  governed by **the co-op**, whose sanction is *expulsion from the pool*.
  Rejection is a mining camp on poor ground. The university keeps a herd
  **to teach** — it is not a producer and this build does not touch it.

⭐ **Therefore what is genuinely new here is:** milk that spoils; a
`trade-dairying` pack whose products are rows over shipped substrate; a
dairy farm and a co-op creamery at Heart's Delight; milking goats in
Rejection; ewe's and goat's milk; a second source of contamination;
**moulds**, a common system where the vessel decides the shape of
whatever sets in it, with three consumers; and
four seams — a fermenting batch that holds off rot, a wheel that ripens on
a shelf, a herd that comes back into milk, and a byproduct poured off a
solid.

## Goals

- **Milk is perishable.** Left out it turns in about a game day; kept
  cool it lasts a few. What you do with it, you do today.
- **Milk has somewhere to go** — cream, butter, buttermilk, fresh curd,
  aged cheese, yoghurt, ricotta, and the kitchen recipes that take them.
- **A dairy is a real business in a real community** — a dairy farm on
  the Delight's flats, its milk pooled at the co-op creamery, where anyone
  can make butter and cheese.
- **Aged cheese ties up capital.** A wheel on a cool shelf ripens over
  game weeks or months, is worth more for it, and is lost if the room is
  warm.
- **The species decides the milk.** Cow, ewe and goat each give their own
  milk, and a cheese's character follows from its milk's fat and protein —
  a new dairy animal is a new cheese family with no code.
- **Safety is a judgment with a cost.** Heating milk kills what is in it —
  pathogens, flora and culture alike — and overheating it ruins the set;
  raw milk keeps its character and its risk. Harm from contaminated milk
  sold to a stranger is recorded against the producer.
- **A mould decides the shape of what sets in it.** One act for every
  moulded good — fill the mould, let the contents set by their own
  process, take the thing out — and the cheese hoop, the ingot mould and
  the ice pan all work it. A new moulded good is a mould and a material,
  not a verb.
- **A herd survives its own neglect.** A cow that dries off and goes back
  to the herd comes back into milk after a rest.
- **A second venue is rows.** Rejection's goats and their cheese need no
  code beyond what the Delight's dairy ships.

## Non-goals

- **Staffing the 12× clock** — twice-daily milking is every real hour;
  assumed not a problem for this build (user, 2026-10-10). If it proves
  one → a later build, through [ranching-slate](../slates/builds/ranching-slate.md)'s
  hired-hand cadence.
- **NPCs buying cheese or butter** — the `eats` brain buys only bread →
  [nutrition-and-fitness-slate](../slates/builds/nutrition-and-fitness-slate.md)
  (the basket).
- **Whey fed to pigs**, and feeding any animal → ranching-slate's feed
  loop.
- **Calving** — real breeding that brings a cow into milk →
  ranching-slate (breeding writes SERVED only). The herd-level rest stands
  in for it.
- **Fluid milk sold cold to the city** (the cheesemaker becomes a milkman)
  → [cold-chain-slate](../slates/builds/cold-chain-slate.md).
- **Flash pasteurization (72 °C, 15 s)** and the finding that the shipped
  kill curve is about half as temperature-sensitive as real milk
  pathogens → a recorded finding on [spoilage.md](../subsystems/spoilage.md);
  the flash rung is a later epoch.
- **The separator** (mechanical cream separation) → dairy-slate Left, the
  next epoch rung.
- **Rind care** — turning, washing, waxing, bloomy and blue moulds →
  dairy-slate Left.
- **The other moulded goods** — candles and soap →
  [rendering-slate](../slates/builds/rendering-slate.md); bricks, baking
  tins, press-moulded ceramics, glass press- and blow-moulding → their
  trades' slates, each as a mould row over this build's system.
- **A consumed mould** (sand, lost wax — broken to get the casting out) →
  the property ships, no consumed mould does; the first casting trade
  that needs one ships it.
- **Malted milk** → [malting-and-extract-slate](../slates/builds/malting-and-extract-slate.md).
- **A regulated inspection regime** (licensing, a health inspector) →
  dairy-slate Left; this build ships the harm record and the co-op's
  existing sanction, nothing new in governance.
- **Anything at the university** — nowhere, deliberately.

## Placement

- **`trade-dairying`**, a new capability pack at `/trade/dairying`. The
  trade is the PROCESS: a cheesemaker need not keep the cow, so the
  products, the creamery kit and the dairying Discipline are this pack's,
  and the animals stay ranching's.
- **Milk stays in the commons** — *"a fact about mammals, not about the
  trade."* The ewe's and goat's milk join the cow's there; the milk taps
  are on the species rows.
- **The goat** is a species row alongside the cow and sheep.
- **The venues are their communities'** — the dairy farm and the creamery
  in the `hearts-delight` pack, the goats in `rejection`.
- ⭐ **Moulds are the kernel's.** Their consumers — dairying, smelting,
  the commons' ice pan — share no pack, which is the kernel test. This
  build ships the system with the hoop as its first consumer; the ingot
  mould is smelting's row and the ice pan stays in the commons.
- **The kitchen recipes** are cooking's and baking's (`trade-cooking`,
  `trade-baking`), taking dairy goods by category.
- ⭐ **The test — does a second venue need code?** No: Rejection's goat
  dairy is rows only, and it is in this build to prove it.

## Collisions

- **Heart's Delight's flats** — the ox book's home extent and Quist's
  farmstead. The dairy farm is a **new household** with its own holding
  and herdbook on the flats, not Quist's farm grown a herd; the oxen stay
  a working team and stop giving milk.
- **Heart's Delight's bench** — Quist's twelve ewes become milkable. The
  flock book argues the bench's commitment is *seasonal*, not daily; ewe's
  milk is a short season (spring, after lambing), so that argument holds.
- **The co-op** — already the valley's governing body and its sanction.
  The creamery is the co-op's building; this build adds no new governance.
- **The valley road and the millsite** — the creamery stands off the
  valley road; it must not displace the mill or the public-works yard.
- **Rejection** — the goats keep to the camp's poor ground; they must not
  stand where a drive (drilling, pump, mining) already runs, and they take
  nothing from the pithead yard.
- **The university herd** — untouched. Its cows stay a teaching herd.
- **The verb `press`** is the news ticker's; pressing a wheel is a weight
  set on the hoop, not a new `press`. **`cut`** is tailoring's; a wheel is `split`.
- **`shake`** today records a cocktail's mix method; `churn` rides it.
- **The smelt** — its ingot comes from the metal's own cast shape today;
  with an ingot mould at the furnace, the mould decides. A pool that
  freezes in a plain crucible still leaves a lump.
- **The ice pan** — today water freezes in it into an ice block because
  WATER says so; after this build the pan says so. Same block, honest
  reason.
- **Cooking's fried recipes** take "a fat"; butter joining that category
  changes what a cook may use, not what they must.

## Surface decisions

### Where is the dairy? — Heart's Delight, the co-op creamery
Perishable, short-window goods are *preserved at the source* (the
settlement model gives the Delight the cannery for this reason); butter
and cheese are how milk is preserved. The flats have the water and the
grass; the bench is sheep country. The co-op is the valley's governing
body, and the co-operative creamery is its historical archetype — farmers
pool milk, the creamery makes it keep. **Anyone may make butter and cheese
at the creamery**; the kit is the co-op's.

### Who keeps the cows? — a dairy farm on the flats
A new household with its own herdbook of milking cows, held by its farm.
Drafting and milking work as they do for every herd.

### Goats — in Rejection
A mining camp on poor ground keeps a few nannies because a cow will not
pay there. A pen, a pail, a setting pan and a crock: the second venue,
rows only.

### Milk spoils — about a game day warm, a few days cool
Read by `smell` / `taste` / `look` in words (sweet → on the turn →
sour). Cool rooms slow it with no new code.

### A working ferment does not rot
While a culture is working in a batch, the batch does not spoil — the
culture is the flora. When the ferment finishes, the product becomes
spoilable on its own clock. (`spoilage.md` left this decision to the
first build to give a fermentable a spoilage rate; this is that build.)

### Cream — it rises
Milk left in a setting pan separates; pouring the pan off draws the skim
and stops at the cream, which stays in the pan. No new verb.

### Butter — `churn`, an alias of `shake`
A churn is the instrument; churning cream breaks it into butter and
buttermilk; pouring off takes the buttermilk and leaves the butter. The
same move as the cream: *pour off the liquid, keep what is left.* (The
ladder's first rung: one act, unified — `grind` rides `mill`.)

### Heat — no `pasteurize` verb
Heating milk kills its flora, pathogens and culture by the shipped kill
curve, whether or not a recipe is running. Knowing to do it, and to what
temperature, is the discipline: **nothing explains the number**, and a
thermometer reads the pot. ⭐ **Overheated milk will not set a good curd**,
so the choice has a cost and is not a dominant option. Scalded cream
(clotted cream) is the medieval rung's product of the same act.

### Curd — starter, and rennet
Pitching a starter sets a **soft** curd; starter **and rennet** sets a
**firm** one. The set takes time; draining the whey leaves the curd, and
the whey becomes the next batch's starter (backslopping — the shipped
lees-to-culture path).

### Rennet — from a young head's stomach
Butchering a young head yields its stomach, which dries into rennet. The
creamery opens with one jar as seed stock (the brewery's barm is the
precedent); there is a maker from the first day.

### Moulds — the vessel decides the shape of what sets in it
A mould is a vessel that answers one question: *when what is in me sets,
what shape comes out?* How the contents set is the **material's**
business — metal, wax and water **freeze**; curd **drains**; clay and soap
dry or cure; dough bakes — and the mould does not care which. Wherever
something sets, the container is asked first; only a plain vessel falls
back to the material's own default (a lump).

- **No verb.** `pour curd into hoop`, wait, `look hoop` (*the curd has
  drawn down and firmed*), `get wheel from hoop`. Molten copper into an
  ingot mould and water into an ice pan are the same acts.
- **It stays in the mould** until you take it out. Unmoulding is an act.
- **The fill decides the size** — a half-filled hoop is a small wheel; an
  over-full mould spills by the existing pour rule.
- **Reusable or consumed** is the mould's own property. A hoop and an
  ingot mould wear with use. A consumed mould is broken to get the
  casting out — the property ships; no consumed mould does yet.
- **Three ship:** the cheese hoop (draining), the ingot mould at the smelt
  (freezing), and the ice pan made a true mould (freezing).

### Pressing — a weight on the hoop
`put stone on hoop` loads the curd. The load sets how fast and how far the
whey drains: soft curd left unweighted is a moist soft cheese that keeps
briefly; firm curd under a weight is a dry hard wheel that keeps for
months. ⭐ Pressing drives out water, and the dryness is what keeps a hard
cheese — the shipped water-activity model, made into a choice.

### The wheel — salted, moulded, then ripened on a shelf
Salted curd set in a hoop makes a wheel. A wheel on a shelf ripens by its
room's temperature: **soft** cheese is ripe in about a game week and then
goes over; **hard** cheese takes game months and keeps improving; too
warm, and it spoils. Read in words on `look` and `taste`, never a number.
`split wheel` makes wedges you can eat, sell or cook with.

### The cheeses — rows, named in the lore pass
Fresh curd · a soft cow's cheese · a hard cow's cheese · a hard ewe's
cheese (the bench) · a soft goat's cheese (Rejection) · yoghurt · ricotta
from whey. Names are placeholders for the content/lore pass.

### The species — each its own milk
Cow, ewe and goat each give a milk of their own fat and protein, and a
cheese made from one is different from the same cheese made from another
**because of those numbers**, not because a list says so. Ewe's milk has
a season; a cow's and a goat's follow the lactation.

### Lactation — herd-level
A dried-off cow returned to her herdbook comes back into milk **after a
rest** — not instantly, so returning and redrafting cannot launder neglect.
Bulls and oxen give no milk.

### Raw milk — the second contamination source
Milking with unwashed hands or into an unwashed pail can carry a pathogen
into the milk. Washing prevents it; heat kills it; cheese made from raw
milk keeps it. Somebody else who falls ill from it is recorded as harmed
by the producer — the shipped ledger. At the creamery that is grounds for
the co-op's existing sanction.

### The kitchen
- **Butter is a fat** — every recipe that asks for a fat takes it.
- **Creamed root mash** — roots, milk, butter.
- **Toasted cheese** — bread and cheese at the fire.
- **Baked custard** — eggs and milk; ⭐ it **curdles if overheated** (a
  heat ceiling, the pedagogy recipe).
- **Milk loaf** — the baker's dough with milk for water.
- **Ricotta** — whey re-cooked: the whey's own sink.

### The Discipline — `dairying`, under `fermenting`
Reading milk, setting curd, judging a wheel. `stockmanship` stays the
animal's.

## Lens pass

1. **Pedagogy.** The kill curve — time × temperature, and that the
   heat that makes milk safe also kills the culture you need (so you
   re-inoculate: *sterilise, then deliberately add one organism*, which is
   what fermentation is). Overheating spoils the set; custard curdles above
   a ceiling. Yield and character derive from fat and protein. Disciplines:
   `dairying` (new), `stockmanship`, `cooking`.
2. **Expression.** Every cheese is a row; a new animal is a new milk and
   so a new cheese family; a creamery is a venue binding, proved by
   Rejection's goats. ⚠ Gap: the cheese **names and recipes** are generic
   until the lore pass.
3. **Immersion / participation.** No gauge: the cow is read by condition,
   the milk by smell, the curd by its set, the wheel by look and taste.
   The co-op's pool is a real institution players can be expelled from.
   ⚠ Gap: nothing in the world *buys* cheese yet except players (the
   `eats` basket is out of scope).
4. **Values.** What today's milk becomes, under a clock. Pasteurize or
   not: safety against character, neither dominant. Sell young or age:
   money now against money later. Standing is conferred by the people who
   buy your cheese twice.
5. **Continuity.** Pan → separator; scald → vat → flash pasteurizer;
   cellar → cold room → refrigerated milk. The commands do not change:
   `pour`, `churn`, `heat`, `split`.
6. **Economy.** Produces milk, cream, butter, buttermilk, cheese, whey,
   ricotta, yoghurt; consumes feed, fuel for the heat, salt (Rejection's
   salt trade gains a buyer), rennet (butchery gains an output), vessels,
   cellar space and labour. **Who pays:** whoever eats the cheese.
   **Demand existed first** in the strongest sense — the supply has shipped
   for months and nothing took it.
7. **Governance.** **Who can be wronged:** whoever drinks contaminated
   milk or eats raw-milk cheese. **Criterion:** the shipped contamination
   event, recorded on the ledger. **Appeal:** the ledger is append-only and
   readable. **Entrenchment:** tier C — the co-op's sanction is its own
   custom; this build adds no rule.

## The drive

Run in a fresh world with the test clock available. A **second
character** is needed for steps 22–23.

**The farm**
1. Walk to Heart's Delight, to the dairy farm on the flats. `look` —
   the herdbook, the byre; nothing is said about the university.
2. `draft 0` — a cow comes out of the book. `look cow` — her condition
   in words, and that she is in milk.
3. `wash pail`, then `milk cow into pail` — litres of cow's milk.
4. Draft a head until a **bull** comes out (or use the Delight's oxen):
   `milk bull into pail` — refused in the animal's own words.

**Milk that spoils**
5. Leave a second pail of milk standing warm; advance one game day;
   `smell pail` — it has turned. A pail left in the cheese room for the
   same day is still sweet.

**The creamery**
6. Walk to the co-op creamery. `look` — pans, churn, vat, hoops, the
   starter crock, the rennet jar; stairs down to the cheese room.
7. `pour pail into pan`; advance a few game hours; `look pan` — the
   cream has risen.
8. `pour pan into pail` — the skim comes off and stops; the cream is
   left in the pan.
9. `pour pan into churn`; `churn churn` — it takes a while, then the
   cream breaks. `pour churn into jug` — buttermilk; butter is left.
   `get butter` (or scoop it to a crock).

**Heat, and its cost**
10. `pour pail into vat` (fresh milk); `heat vat`; `measure temperature
    vat` until it reads about 63 °C; hold, then take it off the heat.
11. A second batch heated to a boil: later its curd **sets badly** — said
    in words.

**Curd and whey**
12. `pour crock into vat` (starter); `pour rennet into vat`; advance;
    `look vat` — the curd has set.
13. `pour vat into pail` — the whey comes off; curd is left.
14. The whey becomes starter: `pour pail into crock` — next time's
    culture.
15. Salt the curd; `pour vat into hoop` (the curd); `put stone on hoop`;
    advance; `look hoop` — it has drawn down and firmed; `get wheel from
    hoop` — a **wheel**, sized by the fill. A soft curd left unweighted in a
    second hoop gives a soft wheel.

**The cheese room**
16. `go down`; put the wheel on the shelf. `look wheel` — *young*.
17. Advance a game week (soft) / game months (hard): `look wheel`,
    `taste wheel` — its ripeness in words; the soft one goes over if left.
18. Move a wheel somewhere warm and advance: it spoils.
19. `split wheel` — wedges. `consign wedge --ask 12` on a shelf.

**The other moulds**
19a. At the smelt: run molten copper into the **ingot mould**; let it
     cool; `look mould` — set; `get ingot from mould`. A pool left to
     freeze in a plain crucible is still a lump.
19b. Fill the **ice pan** with water and leave it in the cold; `get block
     from pan` — the block is the pan's shape.

**The kitchen**
20. Fry roots in butter (an existing recipe, taking butter as its fat).
21. Bake a custard; overheat a second one — it **curdles**.

**Raw milk and a stranger**
22. Milk with an **unwashed** pail; make fresh curd without heating;
    hand it to the second character, who eats it; advance — they fall ill.
23. The harm is on the ledger against the milker (the accountability
    read).

**The second venue**
24. Walk to Rejection's goat pen. `draft` a nanny, `milk goat into
    pail`, set a soft goat's cheese with the pen's crock — the same acts,
    a different milk, no new verb.
25. On the bench at Heart's Delight, in season: `milk ewe into pail`.

**The herd**
26. Leave a drafted cow unmilked until she **dries off** (`look` says
    so). `return` her; `draft` her again at once — still dry. Advance
    the rest; draft her again — she is back in milk.

## Acceptance criteria

1. Milk left warm turns within about a game day and a person can smell
   that it has; milk kept cool lasts several.
2. A bull or ox cannot be milked.
3. At the creamery, a person turns milk into cream, butter and
   buttermilk using only `pour` and `churn`.
4. Heating milk kills what is in it; milk heated too hot sets a poor curd,
   said in words.
5. Starter sets a soft curd, starter and rennet a firm one; draining the
   whey leaves curd, and the whey starts the next batch.
6. Curd set in a hoop comes out as a wheel the hoop's shape and the fill's
   size; weighted firm curd makes a drier, longer-keeping wheel than
   unweighted soft curd.
6a. Molten metal set in an ingot mould comes out as an ingot, and water
   in an ice pan as a block — by the same acts as the hoop, with no verb
   of their own; a pool frozen in a plain vessel is still a lump.
6b. A ripened wheel on a cool shelf ripens over game time, reads its
   ripeness in words, and is worth more ripe; a soft wheel goes over; a
   warm wheel spoils.
7. A wheel can be split into wedges, and a wedge sold on consignment.
8. A cheese made from ewe's or goat's milk differs from the cow's version,
   and the difference follows from the milk.
9. Rennet can be got by butchering a young head.
10. Butter works as the fat in the existing fried recipes; the custard,
    creamed mash, toasted cheese, milk loaf and ricotta can each be made,
    and the custard curdles if overheated.
11. A person who eats raw-milk produce contaminated by an unwashed milking
    falls ill, and the harm is recorded against the producer.
12. A dried-off cow returned to the herd is back in milk after a rest,
    and not before it.
13. Rejection's goats are milked and made into cheese with no verb or
    behaviour the Delight's dairy does not already have.
14. A fermenting batch does not rot while its culture works.
15. Nothing at the university changes.

## Cross-references

- Seeding slate: [dairy-slate](../slates/builds/dairy-slate.md)
- Neighbouring slates: [ranching-slate](../slates/builds/ranching-slate.md) ·
  [cold-chain-slate](../slates/builds/cold-chain-slate.md) ·
  [malting-and-extract-slate](../slates/builds/malting-and-extract-slate.md) ·
  [rgo-unification-slate](../slates/builds/rgo-unification-slate.md) ·
  [cooking-slate](../slates/builds/cooking-slate.md) ·
  [glass-slate](../slates/tails/glass-slate.md) (§8 — moulds extracted to this build)
- Subsystems: [ranching.md](../subsystems/ranching.md) ·
  [taps.md](../subsystems/taps.md) · [maturation.md](../subsystems/maturation.md) ·
  [spoilage.md](../subsystems/spoilage.md) · [crafting.md](../subsystems/crafting.md) ·
  [thermal.md](../subsystems/thermal.md) · [accountability.md](../subsystems/accountability.md) ·
  [butchery.md](../subsystems/butchery.md) · [retail.md](../subsystems/retail.md)
- In flight: [assembly-requirements](./assembly-requirements.md) (crafted
  vessels; a churn or press as an assembly later) ·
  [sugar-requirements](./sugar-requirements.md) (the sweetener vocabulary —
  dairy invents no sweetener category)
- Settlement: [settlement-model.md](../settlement-model.md) (von Thünen;
  the Delight's co-op)
