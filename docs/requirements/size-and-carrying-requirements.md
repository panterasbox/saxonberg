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
thing; a builder lens inside your extents; the scale envelope.

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
- **The engine stays inside the scale it was built to sustain**, loudly.

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
- **Pace of time** → [pace](../slates/builds/pace-slate.md); needs are stated in game
  time, so this build is indifferent to it.

## Placement

Kernel: size, carrying, readying, perceiving, the builder lens, the scale envelope — containment,
slots, perception and the binder are kernel substrate, and a second gear row must need no code. Packs: the gear rows
(pockets on garments in the textiles pack; belts, holsters, sheaths, pouches, quivers and packs in the
leather and smithing packs that make them); exit clearances on each locality's own exits where they
differ from the defaults.

## Collisions

- **Every player's persisted inventory** is loose today. ⚠ At the flip, each loose thing must find a
  place on first load — a hand, then a pocket or pack that fits, and what fits nowhere goes **home**
  (the player's residence) with a message, never to the floor and never lost.
- **Every caller that puts a thing on a body** — the count is the flip's gate (§ The flip).
- **The lounge and the newbie wilds** — a new player's first `get` now goes to a hand; the starter kit
  needs a pocket or a bag, or the tutorial's first pickup fills both hands.
- **Exits everywhere** take default clearances by kind; a place built small or big (the kobold tunnel,
  the ogre's hall) authors its own.
- **The card** (build-3) renders inventory in tiers; **`equip`** keeps working over the new hands.
- **Shops** that hand goods to a buyer, **crafting** that drops output, **give** between players — each
  now hands, pockets, or refuses in words.

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
- **A container has three limits** — mass (what it bears), volume, and its **opening** (what fits
  through, by the thing's longest dimension against the opening's diagonal).

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
  **packed** (on the back — take it off and open it first) · **elsewhere** (the room, a saddlebag, a cart).
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

### Bodies and openings **[DECIDED]**

- **A body's envelope** — height by how it moves (walking upright, stooping, crawling) or rests
  (sitting, kneeling, lying), girth, plus what it wears; a rider adds the mount. **How you move
  through an opening is a movement mode** (owner review, 2026-11-11): beside `walk`, `run`, `sneak`,
  `swim` and `climb`, two new modes, each its own verb — **`stoop`** (bent under a low lintel: lower,
  a little slower, not quieter — stooping is not sneaking) and **`crawl`** (prone). Sneaking still
  crouches, so it also clears a low door.
- **Exits declare a clearance**, defaulting by kind: a door about 0.9 × 2.0 m, an outdoor way
  unbounded, a hatch 0.6 × 0.6 m, a crawlway 0.6 m tall, a window small, stairs 2.0 m of headroom and a
  turn; a ladder needs both hands. **The refusal says what would work and never changes your posture for
  you** — *"you'd have to stoop — `stoop north`."*
- **Locomotion meets your gear** — climbing wants both hands; swimming's weight refuses the way up and
  **soaks what you carry** (wet paper is ruined; waterproof containers — oilskin, rubber — are worth
  having); awkward held loads limit running; **loose, clanking gear is noise** to stealth; a crawlway
  measures what you wear too — but what you hold goes through **ahead of you**, measured on its own
  (you push it as you crawl; narrated, not a verb).

### Weight and shape **[DECIDED]**

What a load costs is its mass × how it is carried (held, worn) × **awkwardness** — for held loads only,
from its longest dimension against the carrier's stature and its volume against the body's. A
three-meter pole held costs more than its mass; a well-fitted pack costs least.

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
thing, the frisk and the pickpocket show more.

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

### The scale envelope **[DECIDED]**

The model already has the right representations — bulk and stacks are one object whatever the amount.
The risk is using it at a scale it was not built to sustain. So a small set of budgets — **objects per
container, nesting depth, objects per place, mints per act, resident objects** — **measured** by
benches at the envelope's edge (soak lane), **enforced** at the chokepoints (the one minting path, the
container side of a move, the resident set), and **loud**: a player's act refused in words, an author's
or a generator's failing with a diagnostic naming who and what. Never a silent trim.

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
   refused in words.
2. *instant · player* — `inventory` shows the tiers: in hand, ready (the pocket's contents), worn, and the
   burden in words. `inventory --flat` shows one list.
3. *instant · player* — `put cup in coat pocket`, then `inventory`: the cup's home is the pocket.
4. *instant · staged* — Holding a sword with a compass put away in a belt pouch: `measure` something that
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
    size, saying so; the same crate through a wide doorway passes.
11. *instant · player* — Another character in the room: `i them` shows what they hold, their outer layer,
    the knife on their belt — not the letter in their inner pocket.
12. *instant · player* — ⭐ Probe the covered letter: `get letter from them`, `get paper from them`
    (no *"which one?"*), `query them:I:letter`, and a script `if (them:I:letter) { say yes }` — each
    answer is identical to the answer for a person with no letter at all. The same query typed by the
    letter's bearer finds it.
13. *instant · staged* — A shut backpack: `inventory` lists its contents; a wizard removes one item;
    `inventory` no longer lists it — you see what's in your own bag when you look.
14. *instant · staged* — Knock a character unconscious mid-fight — the sword in their hand falls to the
    floor; their worn belt stays on them.
15. *short · player* — Swim across a pond carrying a paper letter in an ordinary pack — it comes out wet
    and ruined; the same letter in an oilskin pouch comes out dry.
16. *instant · player* — Pack two game days of food and water for one person — `inventory --weight` and
    the burden line show it is most of a pack; load it onto a mule's pack saddle and the burden falls.
17. *instant · staged* — Inside an extent you hold, with the builder lens on: look into a staged NPC's
    shut chest and read its true contents, labeled builder information; with the lens off, the same chest
    is shut to you like anyone.
18. *instant · staged* — A generator told to mint past the per-act budget fails with a diagnostic naming
    the act and the author; nothing is half-made.
19. *short · staged* — ⭐ (R4) Restart the world. Every character comes back holding, wearing and
    pocketing exactly what they had — no item loose, none on the floor, none duplicated; a pre-flip
    character's loose inventory has been placed (hands, pockets, pack, and the overflow at home, with the
    message).
20. *instant · player* — (R5) `look` in the new or changed places — the low-door room, the crawlway, the
    stair, the pond — by day and with a headlamp at night.

### Soak drive

1. *span* — Two real hours of an expedition at 12× (a game day): the food and water carried are consumed
   on the body's own clock, and the pack lightens; the burden line follows.
2. *span* — The scale benches: a container, a place and a generator driven to the envelope's edge, each
   measured, so the budgets are set from numbers.

## Acceptance criteria

- No character, anywhere, has a thing loose on their body — after any act and after a restart.
- A verb finds the nearest thing you perceive, with no reach option to learn; a player picks up, readies,
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
- A runaway generator is stopped at its budget with a diagnostic, and no player ever sees a silent trim.

## Cross-references

- Seeding slate: [size-slate](../slates/builds/size-slate.md) (§ 8, *a body carries*)
- [encumbrance-slate](../slates/tails/encumbrance-slate.md) · [storage-slate](../slates/tails/storage-slate.md) ·
  [bulkable-slate](../slates/tails/bulkable-slate.md)
- [access-slate](../slates/tails/access-slate.md) § Inspection · [land-use-covenant-slate](../slates/builds/land-use-covenant-slate.md)
- [spellbook-slate](../slates/builds/spellbook-slate.md) (the bag of holding) ·
  [bestiary pilot](../bestiary/pilot.md) (openings with a size; the square-cube check)
- In flight: controller liquidity (build-2) — this build follows it (§ Reach after controller liquidity)
