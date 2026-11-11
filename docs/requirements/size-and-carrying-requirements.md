# Size and carrying — requirements

**Kind:** feature, and a refactor of how every body holds things. The owner, on scope: *"I want it
all now"* — size, the whole carrying flip (hands, pockets, nothing loose on a body), weight, and
discrete counts, in one build, accepting the quiet window the flip needs.
**Leads from:** kernel. **First consumers, in this build:** every verb that puts a thing on a body
(`get`, `give`, buying, crafting's output, `take`), `inventory` and `look`, the exits of every place
(clearances), the shipped species (hands from anatomy), and the garment, leather and gear rows that
give a body somewhere to put things — pockets, belts, holsters, packs.

Things in this game already have real masses, rooms real extents, ships real draughts — and a body
is still a bag, and an exit is the same size for a gnome and an ogre. This build gives everything a
size, gives every body two hands and somewhere to put what the hands are not holding, and lets the
carrying economy follow: on an expedition the pack fills with food and water, and every pocket,
belt, cart and mule becomes worth having. Seeding slate: [size-slate](../slates/builds/size-slate.md)
(its § 8, *a body carries, it does not contain*, decided 2026-10-20, is this build's spine).

## What it is (R1)

**Size** is how much room a thing takes and what it fits through, in real meters — never a category.
**Carrying** is where a thing is on a body: in a **hand**, **worn**, **in something worn or held** (a
pocket, a pouch, a pack), or **inside the body** (organs, what you ate). It holds in every epoch: a
travois, a handcart, a wagon and a truck are one ladder; a pocket is a pocket in every century.
**Perceiving what someone carries** is part of it, because the moment things sit in pockets, what is
covered must stay covered. The query language still names things for everyone; what a viewer
perceives is decided by the act (§ Perceiving).

## What already exists (R2)

- **Measured already:** every species' mass and stature; rooms' real extent; structures' heights;
  ships' draught, beam, air draft; vessels' interior volume; things' mass and their material's
  density — so a thing's volume is derivable.
- **Bodies:** body plans with parts; hand slots already in the slot universe; the `manipulation`
  capacity on the function axis; a wounded hand already cannot grip; Attired (worn layers, the
  covering ladder: the outermost layer is what is seen); posture.
- **Carrying today:** `get` puts a thing loose in the body's general contents, treated as held (the
  *"v1 loose-carry model"*); the card hides a person's contents because *"a person's contents are their
  pockets"* — pockets assumed, never modeled. `equip` already orchestrates wearing and wielding a whole
  kit. Encumbrance ships the burden gauge, the consequence ladder and the haulage draft term; held
  costs a surcharge, worn the floor.
- **Counts and continuous matter:** stacks (a count on one object), bulk (an amount on one object),
  storage (goods as a count, not objects).
- **Concealment and belief:** honest fog; the frisk and the pickpocket are designed (policing,
  stealth); a viewer's knowledge is the belief store.
- **Access:** held extents by parcel title (the *within-your-extent* pattern).
- **Merged since this doc was first written:** material decomposition (density and materials),
  controllers-are-io, client surface, and the boundary build (every way has an **opening** sized by its
  kind, and a boundary must fit its way — the clearance half of this build starts from it).
- **In flight: controller liquidity** (build-2) rewrites most controllers, `get`, `put`, `inventory` and
  `equip` among them, and adds a reach grammar over today's loose carrying. ⚠ This build is **planned
  against it and built after it merges**, and cleans up its reach model here (§ Reach after controller
  liquidity) — the owner, 2026-11-11: *"I don't want to fuck with build-2, we'll clean up the mess here
  after it merges."*

**Therefore what is genuinely new:** sizes and openings; a body's two hands and the *nothing loose on a
body* invariant; homes, readying and reach tiers; pockets and hands-free gear; exit clearances; the
tiered inventory; what a person's carrying shows to others, applied by every act that shows or binds a
thing; a builder lens inside your extents.

## Goals

- A thing's **size** is known — derived wherever it can be — and governs what fits where.
- **Nothing sits loose on a body.** Every carried thing is held, worn, or inside something worn.
- **Hands are scarce and honest** — two for a person, one mouth for a dog, none for a horse — and what
  a hand can grip depends on strength, size and condition.
- **Using a tool is one command.** Naming an instrument readies it — what's in the hand goes home, the
  tool comes out — at a cost that depends on where it lived.
- **Bodies and openings meet** — a low door makes you stoop, a crawlway makes you crawl, a ladder
  wants both hands, the wardrobe sticks on the stairs' turn.
- **An expedition is a packing problem** — food, water, light and tools against a body's room and
  strength — so cargo gear, pack animals and carts have real demand.
- **What is covered stays covered** — no verb shows, names, counts or asks about a thing its viewer
  does not perceive.
- **A creator can inspect their own content** completely, and can play it as an ordinary player.

## Non-goals

- **The bag of holding** → the hunting, foraging and magic pass ([spellbook-slate](../slates/builds/spellbook-slate.md));
  it needs the mana supply. This build ships mundane carrying first, so the demand exists before the
  magic.
- **Freight's cargo, the ship's hold, store-to-store transfer** → freight, after every RGO is designed
  ([storage-slate](../slates/tails/storage-slate.md)).
- **Inspecting another player inside your extent** → [access-slate](../slates/tails/access-slate.md)
  § Inspection (a seat grant, logged, visible to the inspected, with a covenant menu for sub-extents).
  This build's authority covers your content, not other people.
- **The interior place inside a creature** (the swallowing whale) → the bestiary.
- **Moving in zero gravity** (hand over hand, pushing off) → [worlds-slate](../slates/builds/worlds-slate.md),
  where gravity comes from a world's mass and radius. This build only refuses to assume Earth.
- **Pace of time** → [pace](../slates/builds/pace-slate.md); needs are stated in game
  time, so this build is indifferent to it.

## Placement

Kernel: size, carrying, readying, perceiving, the builder lens — containment,
slots, perception and the binder are kernel substrate, and a second gear row must need no code. Packs: the gear rows
(pockets on garments in the textiles pack; belts, holsters, sheaths, pouches, quivers and packs in the
leather and smithing packs that make them); exit clearances on each locality's own exits where they
differ from the defaults.

## Collisions

- **Every player's persisted inventory** is loose today. ⚠ At the flip, each loose thing must find a
  place on first load — a hand, then a pocket or pack that fits, and what fits nowhere goes **home**
  (the player's residence) with a message, never to the floor and never lost.
- **Every caller that puts a thing on a body** — the count is the flip's gate (§ The flip).
- **The lounge and the newbie wilds — a new player's first minutes** (owner review, 2026-11-11). The
  first `get` goes to a hand, the second to the other, the third to a pocket it fits, so the first wall
  comes only when hands *and* pockets are full — after the player has watched it work.
  - **The refusal is the tutorial** — it names what is in your hands, what didn't fit, and the next
    command in your own pockets' names: *"Your hands are full — the cup and the lantern — and the map
    won't fit in your trouser pockets. Put something away (`put cup in pocket`) or set it down (`drop
    lantern`)."* No tutorial system, no one-time hints.
  - **The starter kit is the aspiration's outfit, and it carries what that life carries.** Every outfit
    has pockets; an aspiration that implies a bag gets that bag (a healer a medic's pouch, a teacher a
    satchel, a guardian an empty modular belt) — a grain an author may change. **Nobody starts with a
    rucksack or a frame pack**: the expedition's pack is a purchase.
  - ⭐ **Enrolling at the Eternal University gives you a backpack** — an Eternal U daypack, free, handed
    to you by Katie at intake when your dorm is provisioned. It is *handed*: if your hands are full, she
    leaves it in your new room. A daypack, not an expedition pack — the frame pack is still the
    leatherworker's sale.
  - **A wiki guide to carrying** (hands, pockets, the reach tiers, readying, belts, what fits), linking
    `help` rather than repeating it.
- **Exits everywhere** take their clearance from the openings and boundaries already there; a place
  built small or big (the kobold tunnel, the ogre's hall) authors its own. ⚠ **Any shipped room authored
  smaller than a person** (an `extent` under about 2 m, under a roof) now makes a body stoop inside it —
  each is found and judged.
- **The card** (build-3) renders inventory in tiers; **`equip`** keeps working over the new hands.
- **Shops** that hand goods to a buyer, **crafting** that drops output, **give** between players — two
  idioms, by whether there is a counterparty (owner review, 2026-11-11):
  - **A made thing comes to you if it can; otherwise it is set down where it was made** — crafting,
    cooking, smelting, a harvest's yield, a felled length, a butchered cut, a catch. A free hand, then a
    pocket or pack it fits; else on the workbench the work was done at, else the floor where you stand,
    always with a line (*"your hands are full — you set the loaf on the bench"*). Size decides on its
    own: a cart or a wardrobe is always set down. What already lands in a vessel or a mould is
    unchanged. A set-down thing is an ordinary thing in the room — it persists, and others can take it.
  - **A handed thing is offered; if you can't take it, nothing changes hands** — buying, `give`,
    trading, payment in goods. Checked before anything moves, money included: *"your hands are full —
    the shopkeeper keeps the loaf until you have one free"* (nothing charged); *"Bob's hands are full"*
    (you keep it).
  - **Stacks merge** — coins onto the coins in your purse, an apple onto the apples in your hand — and
    take no new hand. **What the engine grants** (the login kit, the Arrival Note, the bank card) is
    placed like the flip's first load: hand, pocket, pack, the overflow to your residence with a
    message — never the floor, never lost.

## Surface decisions

### Size **[DECIDED]**

- **A form class sets the shape; the volume sets the scale.** Forms: **rod** (sword, pole, scroll),
  **sheet** (paper, board, pane, hide), **block** (brick, box, chest), **round** (apple, pot, cheese),
  **flexible** (cloth, rope, a bag, a pelt). Volume derives from mass and density; an assembly sums its
  parts; bulk has its amount. Dimensions are authored only where special.
- **Flexible things deform** — a packed volume and no fixed dimensions, so a coat squeezes through an
  opening a board cannot. **Folding** changes a flexible thing's packed size (it unblocks the folding
  design).
- **Filling a container:** rigid things fill by their bounding box (so packing efficiency emerges);
  flexible things by their own volume; bulk exactly; a stack is its count times its unit.
- **A container is where a thing sits; it bounds the thing only on the sides it closes** (owner review,
  2026-11-11). Putting a thing in is two checks a player could make with a tape measure: it passes the
  **mouth by its cross-section** (its two smaller dimensions against the opening — a pole goes in
  endwise, a ship model does not go through a bottle's neck), and, **turned some way, it fits along every
  side the container closes**. Open sides do not count — what is bigger **spills over**, and that is
  fine:

  | container | closes | spills | |
  |---|---|---|---|
  | a shut chest | every side | nothing | the pole is refused |
  | an open bucket, barrel or crate | sides and bottom | upward | a broom stands in a bucket |
  | a table or shelf (`on`) | nothing — it supports | every way | a long plank overhangs |
  | a roofed, walled room | every face | nothing | the mast cannot come indoors |
  | a walled yard under the sky | its walls | upward | the mast stands upright |
  | a field or a street | nothing | everywhere | a whale skeleton lies in a 3 m cell |

  A container's sides come from its form (a chest a closed box, a bucket a box open at the top, a sack
  flexible — its volume and its largest stretch) and the distance between them derives like any size;
  they are authored only where that is the point (a sheath, a holster, a quiver, shaped to what it
  holds). A lid or a door that shuts **adds a side**: *"the pole sticks out — the lid won't shut."*
- **A thing stays in an open container only while it is pressed in** (owner review, 2026-11-11). What
  holds a thing against an open side is the net force on it, not the container: in air its weight; in
  water a floater's net force is up, so a cork rises out of an open bucket — or a pocket with no flap —
  the moment it is submerged; at zero gravity nothing presses, so whatever is not in a hand or behind a
  closed side drifts out, and a thing set `on` a table drifts off unless it is fastened. Gravity,
  buoyancy and weightlessness are three cases of one rule; closed sides hold regardless of force, which
  is what makes lids, flaps, straps, lanyards and tethers worth having.
- **A place is a container on the same rule.** Its sides are the faces its exposure already says it
  has (an open top is no ceiling; a missing wall bounds nothing), and the distance between them is its
  cube. You enter through a way's opening by cross-section. In a multi-author world nobody guarantees a
  zone was drawn to fit its content, so an **open** place simply lets a big thing spill over; only an
  **enclosed** place can refuse authored content, and then loudly — an install diagnostic naming the
  thing, its size and the place, never a silent trim.
- **Places stay cubes.** Real proportions (width × depth × height inside the cell) were reconsidered in
  review and **declined** — beyond the hallway and the sofa, which a way's turn already covers, they buy
  too little for a refactor of every zone's content.

### Hands and carrying **[DECIDED]**

- **A hand is a body part that serves manipulation.** A person has two, a dog's mouth is one, an
  octopus eight, a horse none (it carries only in what it wears).
- **What a hand grips** — mass against grip strength (from the arm's muscle and the body's mass); a
  load long relative to the carrier's own stature, or heavier than one hand bears, **takes both hands**;
  a hurt hand cannot grip. A gnome's two-handed threshold sits below an ogre's.
- **Nothing loose on a body**; choosing where a received thing goes is the carrier's own act — a free
  hand, else the first worn container it fits, else a refusal in words (*"your hands are full and it
  won't fit in your pockets"*). The order is the player's setting.
- **Pockets** are small worn containers on their garment, at the ready tier; garments declare them,
  with defaults by kind (trousers two; a coat outer and inner). Inner pockets stay concealed when the
  coat is outermost; outer pockets are quicker.

### Readying and reach **[DECIDED]**

- **Every carried thing has a home on the person: a thing goes back where you last put it.** ⚠ *"Where
  it came from" can lie about where it should go*, so **putting is how the player corrects it** — `put
  compass in belt pouch` makes the pouch its home. No separate verb: putting away is putting (owner
  review, 2026-11-11).
- **Naming an instrument readies it**: what is in the hand goes home, the tool comes out, the act runs
  — *"you sheathe your sword and pull out your compass."* Outside a fight it is nearly instant; **in a
  fight it costs a beat**, and a quick-draw holster beats a pocket.
- **Reach tiers**: **in hand** (now) · **ready** (worn at waist, chest, thigh, wrist — one draw) ·
  **packed** (on the back — take it off and open it first) · **elsewhere** (the room, a cart, a led animal's panniers). Mounted, **your own saddlebags are ready** —
  one draw from the saddle, slower than a belt holster.
- **Targeting is permissive about your own things; the refusal is instructive**: *"your compass is
  packed in your backpack — take it off first."* (`remove backpack`: the pack is worn, so taking it
  off is the same act as taking off a coat.)

### Gear **[DECIDED]**

Rows over existing pieces, made by the trades that would make them: **sheaths, scabbards, holsters** (a
worn container shaped to one item, fast to draw); **belts, utility belts, pouches, bumbags**; **bandoliers
and quivers**; **satchels, haversacks, rucksacks, frame packs**; a **headlamp** (light, worn); a
**comms headset** (so a message needs no phone in hand); **slings and lanyards** (a tethered tool you
drop hangs from you). Beyond the person: saddlebags, panniers, the pack saddle, the **travois**,
sledges, handcarts, barrows, wagons.

### The modular belt — things hang from a length **[DECIDED 2026-11-11, owner review]**

A general-purpose utility belt, *Batman style*: a belt other containers attach to, each using up some of
its **bandwidth**, so a loadout is something a player assembles.

- **Bandwidth is length.** A belt is as long as its wearer's waist is round; each attachment takes its
  own width (a pouch, a holster, a canteen clip — derived from its size). A gnome's belt holds less than
  an ogre's. Never an authored count of mount points. Room is said in words — *"room for one more
  pouch"* — never in centimeters.
- **Attaching is hanging.** Attachments hang **from** the belt (the shipped `from` placement — a ham
  from a hook): `put holster on belt` → *"you clip the holster to your belt"*; `get holster from belt`
  takes it off. No new verbs. Everything on a belt is **ready**; a holster still draws faster than a
  pouch by its own shape.
- **A belt bears a mass** (from what it is made of); overloaded, it refuses in words.
- **The general rule, in this build:** anything others hang from is bounded by its length — the
  bandolier, the chest harness and the load-bearing vest, a pack's straps and carabiners, the saddle
  that saddlebags hang from, a key ring, a workshop's pegboard or tool rail. One rule, many rows.
- Attachments are worn on the outside (everyone sees the holster); what is inside each follows its own
  cover. Hung things are fastened, so they stay put underwater and in zero gravity.
- The web client's drawing of a belt (a strip, each attachment as wide as it takes) → the
  [client slate](../slates/builds/client-slate.md), not this build.

### Mounts and pack animals **[DECIDED 2026-11-11, owner review]**

- **An animal carries only in what it wears** — a horse has no hands — and *nothing loose on a body*
  holds for every body, not only players. Tack is rows: the saddle, the pack saddle with its two
  panniers, saddlebags — worn containers on the animal's back.
- **How much it bears is its body's**, by the same burden model as a person's — its strength against
  its load, never an authored *"carries 80 kg"*; overloaded, it refuses in words: *"the mule won't take
  more."*
- **A mount bears its rider**, the rider's gear and its tack; the rider's burden line says the horse
  carries you, the horse's says what it is working against.
- **Rider and mount are one body at an opening** — *"you'd have to dismount"*, never dismounted for you;
  a laden animal is as wide as its panniers (*"the panniers won't fit"*); an animal moves only in the
  modes its body allows (a horse cannot stoop or crawl; a dog can crawl).
- **Someone else's panniers** follow the perceiving rules of a pocket: worn on the outside, their
  contents covered by the flap.
- ⭐ **Leading is a held rope.** A pack animal is led, not ridden: tie a rope to its halter and hold the
  other end, and it comes with you when you move, as a hitched cart does — the rope's use is where its
  ends are tied, and **it takes a hand**. No new verb; `hitch` stays a cart's.

### Carts and vehicles **[DECIDED 2026-11-11, owner review]**

Haulage already ships: a cart is a wheeled vessel you `hitch`, its cargo burdens you only as its draft
(mass × how well it rolls), a wheeled cart refuses a way that isn't wheeled, and an overload won't
budge. This build connects it:

- **Pulling and driving take hands.** A hitched handcart fills the hands its row already says (two); a
  hand holds a thing, a rope's end, or a cart's handles — *"you can't take the lantern — your hands are
  on the cart."* A vehicle's row says what driving it takes (reins two hands, a tiller one).
- **A cart fits a way by its cross-section**, as anything carried does — *"the wagon won't fit through
  the door"*; it never fits a crawlway or a ladder.
- **A cart is a container on the container rule**: open on top, its load may stand above the sides,
  pressed in; a **tarp** closes the top, and covers its contents as a pocket's are covered. Open, anyone
  in the room perceives and can reach the load.
- **Riding in a cart** is a body in a container — it fits by size and stays in because it is pressed in.
  **Getting into a coach** is entering a place-like vehicle: you fit its door, its inside is roofed and
  bounded; a roof rack is a surface (`on`) — open, exposed.
- **In the inventory** a hitched cart is *elsewhere* — `i cart` lists it — and the burden line shows the
  draft, not the cargo.
- **A parked cart stays in the room with its load** — perceivable and reachable by anyone there, when
  its owner is logged out too. Logging out drops nothing *from the body*, and a cart was never on the
  body. Parking is a real risk, so a covered, locked wagon or a stable is worth paying for (lenses 3a and
  6).

### Bodies and openings **[DECIDED]**

- **A body's envelope** — height by how it moves (walking upright, stooping, crawling) or rests
  (sitting, kneeling, lying), girth, plus what it wears; a rider adds the mount. **How you move
  through an opening is a movement mode** (owner review, 2026-11-11): beside `walk`, `run`, `sneak`,
  `swim` and `climb`, two new modes, each its own verb — **`stoop`** (bent under a low lintel: lower,
  a little slower, not quieter — stooping is not sneaking) and **`crawl`** (prone). Sneaking still
  crouches, so it also clears a low door. A **swimmer** is horizontal — a crawler's height — so an
  underwater squeeze measures like a crawlway; with **no gravity** a body has no up and fits by its
  narrowest way round.
- **A way's clearance is its tightest gap** — the face it passes through, the way's own **opening**
  (shipped by the boundary build: from the way's kind or authored per site, the whole face when
  unset), and the boundary hung in it (a door's own size) — no new field. The numbers are the rows':
  the door kind is 1 × 2 m, the hatch 1 × 1; a low door is one way's authored opening; a **crawlway**, a
  **stair** and a **ladder** become exit kinds (rows). A body passes by its envelope against the gap,
  a carried thing by its cross-section; **length never matters walking straight through** — it matters
  only where a way bends, so a way (a turning stair) may declare a **turn**, and a long rigid thing must
  swing round it (the sofa in the stairwell — the one thing a cube cannot say about a narrow stair). A
  ladder wants the climb and both hands.
- **A ceiling is a ceiling only where there is one** — under a roof or a ceiling, never under the sky.
  Since a way's opening cannot exceed its face, you can only enter a low room stooping or crawling;
  inside it, `stand` is refused under a ceiling lower than you. **The refusal says what would work and never changes your posture for
  you** — *"you'd have to stoop — `stoop north`."*
- **Locomotion meets your gear** — climbing wants both hands; swimming's weight refuses the way up and
  **soaks what you carry** (wet paper is ruined; a **shut container tight against liquid** keeps it dry —
  the oilskin pouch, the rubber bag — read from the tightness ladder vessels already carry, never a new
  waterproof flag); swimming is a kick and needs no hands; awkward held loads limit running; **loose, clanking gear is noise** to stealth; a crawlway
  measures what you wear too — but what you hold goes through **ahead of you**, measured on its own
  (you push it as you crawl; narrated, not a verb).

### Weight and shape **[DECIDED]**

What a load costs is its mass × how it is carried (held, worn) × **awkwardness** — for held loads only,
from its longest dimension against the carrier's stature and its volume against the body's. A
three-meter pole held costs more than its mass; a well-fitted pack costs least.

**Weight is mass × the place's gravity** — never mass with Earth's assumed (every place already carries
an authorable gravity) — and in water each thing counts by its buoyancy, as diving already does. At
zero gravity a full pack weighs nothing on the burden line and still has its mass, its size and its
shape: it still won't fit the hatch, still takes two hands, still takes effort to stop. Mass versus
weight is a lesson the game teaches by being right (lens 1).

### When the body stops **[DECIDED]**

- **Logging out drops nothing** — the absent body persists whole and comes back the same. A guest's
  borrowed things return where they came from.
- **Unconsciousness, dying, or a severed hand drops what was held** — a grip that fails lets go; worn
  things stay with the body (and the corpse). Knock someone out and you've disarmed them.

### Inventory **[DECIDED]**

- **`inventory` shows everything under the target that the viewer perceives** (§ Perceiving), and
  presentation prunes it. With nothing loose on a body, "what's directly on you" is
  only your coat, belt and pack, so the human command walks the whole tree; the immediate list keeps its
  meaning for scripts and queries.
- **The default view is by tier**: in hand · ready (each container's contents listed) · worn · packed
  (each container summarized as a count and a weight) · the burden in words. Options switch the
  presentation: **all** (expand everything), **flat** (the old single list), **ready / packed / worn /
  held** (filter a tier), **weight** (mass and volume per thing), a container's own contents, or a
  person's (what you perceive on them). Details — an engraving — stay in `look`, not the inventory.

### Perceiving **[DECIDED 2026-11-11, owner review]**

The owner, on reviewing this section: the value is in the trades that need a pocket to be private (the
pickpocket, the frisk, the smuggler, customs; lenses 3b, 6, 7, and 4's privacy), and it must be done
with **very simple, memorable idioms** — not by changing what a query means. MUDs leak this all the
time; the leak worth closing is the one a script turns into a scanner, and the cheap version closes it.

**Four idioms:**

1. **MQL names things; it never hides them.** A query means the same thing for every viewer — only
   words like `me` and `here` depend on who asks. (This reverses the shipped rule that filters by
   viewer inside the query when it steps into a holder; that filter moves to the acts.)
2. **You act only on what you perceive.** A verb binds only targets its viewer perceives — so a refusal,
   an ordinal and a *"which one?"* prompt never reveal a covered thing (*"get knife from Bob"* never asks
   *"which knife?"* because of the one in his pocket).
3. **Perceive, then reach.** What you don't perceive is refused exactly as if it weren't there — *"you
   don't see a letter on Joe."* What you perceive but can't reach is refused saying why — *"the box is
   shut"*, *"your compass is packed in your backpack — take it off first."*
4. **Anything that shows a result shows only what you perceive** — `query`, `find`, `look`,
   `inventory`, a script's `( )` expression, the client's cards and its autocomplete.

**What you perceive of a container's contents:** open or shut; see-through (glass, mesh, a net —
derived from its material); worn on the outside (a belt's loops, a holster's grip); covered (a pocket
under a coat). **Your own things you always perceive** — if you look at the bag you see the bag; if you
look in it you see what's in it, so a theft shows the next time you look. Opening, being handed a
thing, searching a body, the frisk and the pickpocket show more.

**Searching a body** (owner review, 2026-11-11). `search corpse` — or `search` a person who is
unconscious — is the shipped `search`: deliberate, a few moments, hands busy, interruptible, graded by
awareness. When it completes, what the body's covered pockets hold is **found by you**, the way a
concealed thing is found (the shipped per-viewer discovery) — so you perceive it, and taking it is
ordinary taking, with whatever rules govern taking another's things. A thing hidden as well as covered
(a letter sewn into a lining) still has to beat your awareness. The room sees it: *"Mara goes through
the dead man's pockets."* **A find is cleared when the thing changes holder** — you found it on that
body, not forever. Only a body that cannot resist — dead or unconscious — can be searched; a conscious
person refuses (*"Bob won't let you"*). Frisking the conscious, and bodies that are bound, are policing's
and the compulsion-gate build's, not this one.

### The builder lens **[DECIDED]**

- **A builder lens** you switch on and off: on, you perceive everything inside extents you hold — your
  content's rooms, fixtures, vessels, stock and staged NPCs — and what it shows is **labeled builder
  information**; off, you play your content as a player. "An extent you hold" means what access already
  means: held extents by parcel title. Never a wizard check. ⭐ The true test is a real character — the
  sandbox's test avatars, which any of your friends can play.
- **Other players are not your content** — inspecting them is a separate, logged grant (Non-goals).

### Reach after controller liquidity **[DECIDED 2026-11-11, owner review]**

Controller liquidity leaves this build a reach model built over today's loose carrying. Held against
the idioms above, item by item:

- **Keep `here`** (the place you're in, past a boat, a cart or a bed) and `me:e` (what immediately
  holds you) — words that depend on who asks the way `me` does, without filtering anything.
- **Keep the body filters `:held`, `:worn`, `:carried`** — facts about where a thing is, the same for
  every viewer. After the flip, `:held` means *in a hand*.
- **Keep the shut-lid refusal** (*"the box is shut"*) as the reach half of *perceive, then reach* — but it
  fires only for a thing the viewer perceives. *"Take it off first"* is the same refusal family.
- **Remove the viewer filter inside the query** (`:i` through a shut lid only for your own or the
  room's; the deepest rung never into another person's pockets). `:i` is the contents, for everyone.
- **Remove the three reach rungs** (`--top` · `--open` · `--deep`) and the per-argument depth defaults —
  a second vocabulary for *where to look* beside MQL paths and the reach tiers, and not memorable. In
  their place, **one rule: the nearest thing you perceive wins** — in hand, ready, packed, then the
  room; two equally near ask *"which one?"*; reach then decides whether the act can happen, and says
  what would work.
- **Reach is the body's** — what it could lay hands on now, one definition. It is a check on the act,
  never what a verb searches; `reachable` survives as a query word only if it means exactly that.
- **The card** shows what you perceive on a person — their outer layer, their belt, their hands.

### Capacity is physical **[DECIDED 2026-11-11, owner review]**

Once things have sizes, the physics bounds what a body or a container holds — a pocket cannot take ten
thousand coins as objects, each container inside another is smaller, and an enclosed place refuses
authored content that does not fit, loudly. A player only ever hears *"it won't fit"*. The rest of the
old **scale envelope** — objects in an open place, mints per act, resident objects, and the benches
that measure them — is engine performance, not carrying, and moved to
[db-performance-slate](../slates/builds/db-performance-slate.md) § 7.

### The flip — one build, staged inside it **[DECIDED]**

The owner overrode the slate's *"flip later in a quiet window"*. Inside this build, still in order: add
the carrier's receiving act (behaving as today) and cap the number of callers that put things straight
on a body; port every caller; then flip — the invariant on, hands and pockets real, the loose-carry
model retired, `get` and `inventory` meaning their new things, every persisted inventory placed (§
Collisions). ⚠ The flip itself still wants **no sibling build mid-drive**, because their drives assume
today's `get`; it is short because the porting came first.

## Lens pass

1. **Pedagogy** — the square-cube law (an ogre twice a human's height weighs about eight times as much),
   packing geometry and the moving-sofa problem, expedition logistics (water outweighs food), the history
   of the pocket.
2. **Creative expression** — the ordinary item needs no authored size; an author builds places for a
   people's size; gear is rows.
3. **Immersion** — the stoop, the crawl, the piano on the stairs, the sword sheathed as the compass comes
   out; a dropped sword when you're knocked down. **Participation** — the tailor's pockets, the
   leatherworker's holsters, the carter, the packer, the pickpocket, the frisk.
4. **Values** — accessibility: a built environment can exclude bodies; privacy: what is covered stays covered.
5. **Continuity** — travois to truck; a pocket in every epoch.
6. **Economy** — the demand is the expedition's own (food, water, tools), so cargo gear, mules and carts
   are bought because they were already needed; the hunting and foraging pass then sells what replaces
   carrying it.
7. **Governance** — building codes may require clearances; customs (a later bag of holding); who may see
   inside whose content (access-slate).

## The drive

### Blocking drive

Every step instant or short; *player* means player verbs only, *staged* means wizard setup is fine.

1. *instant · player* — A fresh character in the lounge: `get` a cup — it goes to a hand. `get` a second
   and a third thing — the second to the other hand, the third to a pocket; a fourth that fits nowhere is
   refused in words. The refusal names the hands' contents and the
   next command in the character's own pocket names. At Duncan Hall, `talk to Katie` through intake —
   an Eternal U daypack is handed over; a second fresh character arriving with full hands finds it in
   their new room instead.
2. *instant · player* — `inventory` shows the tiers: in hand, ready (the pocket's contents), worn, and the
   burden in words. `inventory --flat` shows one list.
3. *instant · player* — `put cup in coat pocket`, then `inventory`: the cup's home is the pocket.
4. *instant · staged* — `put pouch on belt`, `put holster on belt`, `put canteen on belt` until `i belt`
   says there is no room; one more attachment is refused, naming the belt's length. Then, holding a
   sword with a compass put away in a belt pouch: `measure` something that
   needs the compass — *"you sheathe your sword and pull out your compass"*, and the reading runs.
5. *instant · player* — Put the compass in a backpack worn on the back, then `measure` again — refused:
   *"your compass is packed in your backpack — take it off first."* `remove backpack`, and it works.
6. *short · staged* — In a fight, readying the compass costs a beat; drawn from a quick-draw holster it
   costs less than from a pocket (watch the exchange's narration).
7. *instant · player* — A three-meter pole: `get pole` takes both hands; with a lantern held, it is
   refused, naming both hands.
8. *instant · player* — `go` under a low door — *"you'd have to stoop — `stoop north`"*; `stoop north`
   goes through. A crawlway with a pack on: `crawl north` is refused, naming the pack; `remove
   backpack`, then `crawl north` — through, pushing the pack ahead.
9. *instant · player* — Climb a ladder holding a lantern and a sword — refused for want of hands; `put` them
   away (the sword in its sheath, the lantern on your belt) and climb.
10. *instant · staged* — Carry a wardrobe-sized crate to a stair whose turn is too tight — refused by its
    size, saying so; the same crate through a wide doorway passes. A pole stands in an open barrel,
    sticking out; put in a chest, `close chest` is refused — *"the pole sticks out."*
11. *instant · player* — Another character in the room: `i them` shows what they hold, their outer layer,
    the knife on their belt — not the letter in their inner pocket.
12. *instant · player* — ⭐ Probe the covered letter: `get letter from them`, `get paper from them`
    (no *"which one?"*), `query them:I:letter`, and a script `if (them:I:letter) { say yes }` — each
    answer is identical to the answer for a person with no letter at all. The same query typed by the
    letter's bearer finds it.
13. *instant · staged* — A shut backpack: `inventory` lists its contents; a wizard removes one item;
    `inventory` no longer lists it — you see what's in your own bag when you look.
14. *instant · staged* — Knock a character unconscious mid-fight — the sword in their hand falls to the
    floor; their worn belt stays on them. `get letter from them` is answered as for a person with no
    letter; `search them` — a few moments, the room told — and the letter in their inner pocket is
    found; `get letter from them` now takes it. Another character who did not search still cannot see
    it; once the letter is in your own pocket, nobody's earlier find shows it.
15. *short · player* — Swim across a pond carrying a paper letter in an ordinary pack — it comes out wet
    and ruined; the same letter in an oilskin pouch comes out dry. A cork in an open coat pocket floats
    away as you go under; in a buttoned pocket it stays.
16. *instant · player* — Pack two game days of food and water for one person — `inventory --weight` and
    the burden line show it is most of a pack; `put` it in a mule's panniers and the burden falls; keep
    adding and the mule refuses in words. `tie rope to mule` and hold the end — the mule comes with you
    through the next way, and you have one hand free. Mounted on a horse, a compass in your saddlebags
    readies in one draw; at a low door, *"you'd have to dismount"*; the laden mule at a narrow gate,
    *"the panniers won't fit."* With both hands full, `cook` a loaf — it is set on the bench, said so;
    `buy bread` — refused before any money moves, the purse unchanged; `give cup to` a character with
    full hands — refused, the cup still yours. Hitch a handcart — `get lantern` is refused, naming your hands on the
    cart; at a narrow door the cart won't fit; throw a tarp over its load, and another character in the
    room no longer sees it.
17. *instant · staged* — A wizard sets one room's gravity to zero: a dropped cup floats in the room; a
    cup set on the table drifts off; a full pack reads as no weight on the burden line, yet still won't
    pass the hatch and still takes both hands.
18. *instant · staged* — Inside an extent you hold, with the builder lens on: look into a staged NPC's
    shut chest and read its true contents, labeled builder information; with the lens off, the same chest
    is shut to you like anyone.
19. *short · staged* — ⭐ (R4) Restart the world. Every character comes back holding, wearing and
    pocketing exactly what they had — no item loose, none on the floor, none duplicated; a pre-flip
    character's loose inventory has been placed (hands, pockets, pack, and the overflow at home, with the
    message).
20. *instant · player* — (R5) `look` in the new or changed places — the low-door room, the crawlway, the
    stair, the pond — by day and with a headlamp at night.

### Soak drive

1. *span* — Two real hours of an expedition at 12× (a game day): the food and water carried are consumed
   on the body's own clock, and the pack lightens; the burden line follows.

## Acceptance criteria

- No character, anywhere, has a thing loose on their body — after any act and after a restart.
- A verb finds the nearest thing you perceive, with no reach option to learn; a player picks up, readies and
  puts away tools in single commands, and every refusal names what
  would work.
- A low door, a crawlway, a ladder, a stair's turn and a pond each behave as their size and the body's
  say, in words a player can act on.
- `inventory` shows a player's hand, ready, worn and packed things at a glance, and the burden in words.
- No verb shows, names, counts or asks about a thing its viewer does not perceive — refusals, prompts,
  `query`, scripts, the client's cards and autocomplete alike — while the query language itself names
  the same things for every viewer.
- A creator inspects the true state of their own content with the builder lens, and plays it plainly
  without.
- Every character restored after a restart carries exactly what they carried.
- A pack animal carries only what it wears, as much as its body bears, and comes with you on a held
  rope that takes a hand.
- A hitched cart fills the hands it says, fits a way by its size, and a parked one stays where it was
  left, load and all.
- A belt — or anything things hang from — holds attachments by its length, says how much room is left
  in words, and a player assembles their own loadout with `put` and `get`.
- Weight follows the place's gravity and the water's buoyancy; nothing assumes Earth, and a thing
  leaves an open container whenever nothing presses it in.

## Cross-references

- Seeding slate: [size-slate](../slates/builds/size-slate.md) (§ 8, *a body carries*)
- [encumbrance-slate](../slates/tails/encumbrance-slate.md) · [storage-slate](../slates/tails/storage-slate.md) ·
  [bulkable-slate](../slates/tails/bulkable-slate.md)
- [access-slate](../slates/tails/access-slate.md) § Inspection · [land-use-covenant-slate](../slates/builds/land-use-covenant-slate.md)
- [spellbook-slate](../slates/builds/spellbook-slate.md) (the bag of holding) ·
  [bestiary pilot](../bestiary/pilot.md) (openings with a size; the square-cube check)
- In flight: controller liquidity (build-2) — this build follows it (§ Reach after controller liquidity)
