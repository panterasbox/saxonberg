# Bestiary pilot — twenty creatures written as content, before the model

> **Status: DRAFT for the owner to mark up** — 2026-11-07. Drafted by four parallel agents from one
> brief, then reviewed. Its purpose (the owner): *"we have so little content that we're basing any of
> these designs on … none of it is thorough based on narrative or culture or definitive lore.
> Anticipating that all the best we can is where this design will live or die."* So these are written
> **the way an author would write them**, and the **organism-biology model is derived from what they
> demand**, not the other way round. Seeds: [bestiary-slate](../slates/builds/bestiary-slate.md),
> [spellbook-slate](../slates/builds/spellbook-slate.md) § 6, and
> [mana-economy-design-pack](../slates/builds/mana-economy-design-pack.md) Part 11.
>
> ⚠ Species paths in the entries are each drafter's suggestion and are **not reconciled** with each
> other or with the shipped row layout.

**The roster** (quadrant · class):

- **ordinary:** brown bear, grey wolf (the pack), red deer, common adder, North American beaver,
  sperm whale (plus a reference entry for the real electric eel);
- **adapted:** spring eel (invented), wyvern, basilisk;
- **bound:** troll, werewolf (plus the curse *lycanthropy*), leshy, noonwraith, vampire (plus the
  curse *vampirism*);
- **made:** golem;
- **odd shapes:** gelatinous cube, giant spider, hydra, kappa;
- **persons:** the bandit, written as a role.

## Part I — ⭐⭐ Where you fill in

### Decisions only you can make

1. ⚠⚠ **Whale oil against the dielectric rule.** The mana pack (Part 11d) says whale oil and blubber
   are the richest biological store. But under the same Part's capacity rule, **fat holds almost
   nothing** (ε about 2–3). The charge would sit in the whale's water-rich blood and muscle, and the
   try-pot would boil it off. **Either the row is wrong, or mana partitions into lipids.** That was my
   error, and the B drafter caught it.
2. **Does capacity depend on geometry?** Real capacitance is `C = εA/d`. If only the material
   counts, nothing explains why an electric organ is a stack.
3. **The werewolf against arcane-science.** It still says *"transformation of a living body is
   prohibitive."* Under *never forbidden, only priced* (Part 11a), a same-mass change of shape is
   priced, not forbidden. That needs your ruling, which would also settle polymorph.
4. **How you catch lycanthropy.** In folk tradition it's drinking from a wolf's pawprint, a wolfskin
   belt, or an imposed curse. **The bite is mostly a 20th-century film invention** (*The Wolf Man*,
   1941). Which does a base pack use: the folk routes, the bite, or both?
5. **The mana unit.** `τ ≈ 1 kJ` is the B drafter's derivation from glowlight's figure. Nothing in
   the docs states it.
6. **Living cultures.** Two calls:
   - The kappa's ***shirikodama*** motif is flagged in its entry. Keep it or drop it?
   - The beaver entry raises **"Made Beaver"**, the Hudson's Bay Company's commodity unit of account,
     which touches currency rules (a leg may never cross currencies).
7. **The realm-lore suggestions** throughout are labeled as suggestions. Each is yours to keep or cut.

### Facts to verify before anything ships

- **Bear and deer:** red deer antler growth rate (wapiti's ~2.5 cm a day used as the upper bound);
  how far chronic wasting disease has reached red deer.
- **Adder:** dry-bite share and maximum lifespan; hedgehog venom resistance (written as "reportedly").
- **Beaver:** underfur density; its share of Giardia in water; whether the Church formally classed
  beaver as fish for Lent.
- **Wolf:** details of the Beast of Gévaudan.
- **Sperm whale:** maximum length, dive depth and duration, oil barrels per whale, spermaceti volume,
  the ~1% ambergris rate, lifespan, dentine's dielectric constant (guessed at ~10).
- **Electric eel:** electrocyte count.
- **Basilisk:** the Basel 1474 trial, Theophilus's "Spanish gold" recipe, the Vienna legend's date.
- **Wyvern:** η is invented, and the scaling exponents are Pennycuick-style approximations.
- **Werewolf:** whether the silver bullet is 19th-century; whether the Gévaudan silver-bullet story is
  an embellishment.
- **Leshy:** St. Erofei's day (17 October, Old Style).
- **Troll:** size is a square-cube estimate, not sourced.
- **Giant spider:** size is the drafter's estimate; whether high Carboniferous oxygen explains giant
  arthropods is debated.
- **Golem and gelatinous cube:** the earliest source for the golem's water-fetching flood; the cube's
  SRD figures, recalled rather than checked against the text.
- **Kappa:** regional names and the Tōno details.
- **Bandit:** the Statute of Winchester's 200-foot brush clearance; the 1692 Highwaymen Act's £40.

## Part II — ⭐⭐⭐ What the model must express — the gaps, by theme

Collected from every entry's ❌ list and deduplicated. These are the **requirements for the biology
conversation**.

### A. Anatomy and body plans

- **Body plans composed from parts.** The pilot needs an amorphous body (the cube), many heads (the
  hydra), six limbs (the wyvern, the griffin), eight legs with book lungs (the spider), and a cetacean.
- **Eyes and other sense organs as parts.** No shipped plan has an eye.
- ⭐ **Redundant governors.** `governs` combines by min, so cutting the hydra's first head kills it.
  It needs *any of N brains*.
- **Governors that aren't organs:**
  - the golem's inscription on its surface;
  - the fill level of the kappa's dish, which is a body part that is a vessel.
- **Parts that change on one instance:**
  - a part that grows (a second head);
  - ⭐ **regrowth that the wound's channel can stop** (the cauterized stump), which needs
    `restorePart`, unbuilt, and wounds that record *cauterized*;
  - a severed part that becomes an object;
  - antlers, cast and regrown each year, shed into the world;
  - the molt, which softens the integument and removes the capacity to fight.
- **The integument:**
  - a pelt that reads its own wounds;
  - ⚠ **no chitin material exists.** The shipped shore crab's carapace is authored as *bone*.
- **Within one species row:** sex differences (antlers on stags only), age stages (pup, yearling,
  calf).
- **A scaling-honesty check.** Nothing tests a species' size against its respiration and skeleton
  (the square-cube law).

### B. Senses

- **New modalities:** echolocation and electroreception (both explicitly excluded in
  `Perceiver.ts`), a mana sense, and ground vibration.
- **Wind direction**, so scent travels downwind. `weather.md` defers it.
- **Vision as acuity and resolution**, not yes/no. The gaze as an attack needs it, and so do
  averting your eyes, mirrors, peripheral vision and the spyglass.
- **A sense routed through a built object:** the spider's web.

### C. Behavior and the encounter

- **The encounter stage:** notice, size up, display, then commit or leave. Brains that read the
  player's posture, pace, stillness, noise, what they're holding, and the wind.
- ⭐ **A fight that ends when the drive is satisfied.** A defensive attack stops once you stop being a
  threat, which is why playing dead works on a brown bear. Morale today reads only cost.
- **The bluff charge.**
- **Groups:** group morale, social structure (pack, herd, harem, colony) and the breeding pair's state.
- **Hunting behavior:**
  - prey selection by testing;
  - the chase;
  - the hider strategy;
  - animal learning (a bear that remembers camps);
  - ambush only when stepped on.
- **People:**
  - a target-assessment brain that weighs cargo against resistance and how soon help arrives;
  - **robbery's demand** as a pre-fight offer with terms;
  - a construct's single-principal **command channel**, which touches the compulsion-gate build.

### D. Physiology and seasons

- **Seasonal states:**
  - **denning**, a dormancy that burns fat without eating (the shipped torpor is ectotherm cold-stun);
  - hyperphagia;
  - **the rut**, a seasonal drive that overrides fear and costs mass;
  - communal hibernation at a remembered site;
  - an ectotherm's speed tied to its temperature.
- ⭐ **Venom as a route**, with **susceptibility keyed to the victim's clade**. A funnel-web is deadly
  to primates and mild to dogs. Spellbook § 6's requirement has no field to land in.
- **Disease from animals:** rabies, prions, Giardia, tularemia.
- **New kinds of harm:** irritant spray; osmotic or desiccant harm (salt, lye, quicklime against a
  water body); carried inventory digested by material.
- **Unusual living states:**
  - a body running on stored charge;
  - **an embodied undead**, animate but not alive;
  - a condition that **holds a body back from `ConditionApi.die`**.

### E. Magic and bindings

- ⭐⭐ **The binding substrate itself** (held · pays · cuts) has nowhere to live in the model.
- **A binding the creature pays for itself**, from its own food or reserve. Every shipped sustained
  effect is paid by a caster.
- **A condition held by a binding**, which lapses when the binding is cut rather than on its own clock.
- ⭐ **Ward conduction by contact.** Silver or doped iron carries a binding-cut into the wound.
  Suppression today is a location field only.
- **A root for bodiless beings** (leshy, noonwraith). It needs personhood without a Species body.
- **What makes a spirit manifest** (bestiary § 17.1). The noonwraith wants a dust devil, but the
  weather field is stateless.
- ⭐ **Changing shape:**
  - a condition that swaps a live body's plan and species (biped ↔ quadruped, mass kept), with one
    instance and one identity;
  - **mapping wounds across the forms**, which is folklore's *repercussion* tell;
  - what happens to items when the change is forced (Bisclavret's clothes).
- **Charge in creatures:**
  - **viability that reads the place's field** (the danger-map rule);
  - mana paying for mechanical work inside a body (the wyvern's take-off);
  - per-instance charge, trophic concentration, leakage and partitioning (the mana pack, unbuilt).
- **Leading travelers astray:** spellbook § 7's belief write or graph overlay.

### F. Combat

- Many natural attacks in one beat (the hydra).
- **Engulf.** The fight continues *inside* the creature.
- An aerial stoop.
- A natural attack against a boat (the stove boat).
- Projectiles glancing off sloped bone.
- Vital zones (already slated).

### G. The world and the economy

- ⭐ **Animals that build parts of the world:**
  - the beaver's dam, built over weeks, triggered by the sound of running water, and repaired
    overnight;
  - abandonment, after which the pond drains to a meadow;
  - lodges, dens and caches under the ice;
  - territory marks;
  - the flooding the pond causes.
- **Trade processes:** fur dressing, felting, and mercury as a toxin inside a process; dry
  distillation (hartshorn, then ammonia).
- **Law:** outlawry (a register that strips a named person's protection); collective liability (the
  hundred pays for a robber it failed to catch).
- **From the hunting slate:** wild populations, `track`, game law, close seasons and bounties.

### H. ⚠ A kernel defect, verified

**`ConditionCatalogue.warm()` keeps only rows under `/platform/idea/Condition/` with exactly the
kernel class**, so no pack can ship a condition (lycanthropy, vampirism, venom). It's the bug class
`MaterialCatalogue` was fixed for (*select by infix, keep a row whose class extends the base, wherever
it lives*). It's a small kernel fix with no design question in it.

## Part III — The entries


---


Five entries: brown bear, grey wolf (the pack), red deer, adder, North American beaver.
Biology is real; where I am unsure I say so in place. Realm lore is marked **[suggestion]**.

Tag key for the last section of each entry: ✅ exists in the shipped engine · ⚠ proposed
(the capability-from-anatomy model in the brief) · ❌ GAP (nowhere to land today; slated
designs that are unbuilt count as gaps and name their slate).

---

### Brown bear — /stuff/idea/species/animalia/chordata/mammalia/carnivora/ursidae/ursus/arctos

- **Quadrant · class** — real · not a person · ordinary

**What it is.** A big omnivore that eats mostly plants. Adult males in Europe usually weigh
150–300 kg and females 80–180 kg. Coastal Alaskan bears fed on salmon reach 400–600 kg; the
interior grizzly is smaller. Wild bears live 20–25 years. The hump over the shoulders is
digging muscle. The claws are long (5–10 cm), blunt and do not retract: they are tools for
digging, not hooks. Its sense of smell is among the best of any mammal. Its hearing is good,
and its eyesight is about as good as a human's (it has color vision; it is not "near-blind").
It can charge at roughly 50 km/h over a short distance.

**Where it lives.** Mountain forest, tundra edge, river valleys with salmon runs, and any
remote country with roots, berries and carrion. It needs a large range: a male's home range
runs to hundreds of square kilometers. Its year runs like this:
- Spring: it leaves the den lean and eats grass, carrion and winter-killed animals.
- Summer: roots, ants, and calves or fawns in their first weeks.
- Late summer and autumn: **hyperphagia** — up to about 20,000 kcal a day of berries, nuts
  and salmon, laying on fat.
- About November to April: the **den**. Its body temperature drops only a few degrees, its
  heart rate falls to about 10–20 beats a minute, and it neither eats, drinks nor passes
  waste. Cubs are born in the den in January or February, about 400 g each, and stay with
  the sow for 2–3 years.

**How it behaves.** Solitary, apart from a sow with cubs and gatherings at a salmon river.
It is curious and wary rather than aggressive. Most bears avoid people they have smelled
long before the people knew a bear was there. Danger comes from three things: **surprise**
at close range, **a sow with cubs**, and **a carcass it is guarding** (often half-buried
under brush). A bear that has learned that camps mean food loses its wariness and stays that
way. The ranger's saying is *a fed bear is a dead bear.*

**The encounter.**
- It notices you by **scent**, usually first and usually downwind of you.
- **Standing up on its hind legs is curiosity, not attack.** It is getting your scent and
  a better look.
- The warning tells, read through the fog: huffing, jaw-popping, salivating, swatting the
  ground, head held low with ears laid back.
- The **bluff charge** is common. It stops short, or veers off at the last stride.

What your acts mean to it:
- *Noise on the trail* (talking, singing) prevents the surprise that causes most attacks.
- *Running* reads as prey, and you cannot outrun it.
- *Standing your ground and speaking low while backing slowly away* is the correct answer.
- *Dropping your pack* can distract it, but it teaches the bear that people carry food.
- *Fire* deters it weakly.
- *Climbing a tree*: a brown bear climbs worse than a black bear, but it can climb, and it
  can reach.
- **Real safety lore:** carry bear spray (capsaicin; better field evidence than firearms).
  If a brown bear makes contact in a **defensive** attack, **play dead**: lie flat on your
  stomach, hands laced over the back of your neck, legs spread so you cannot be rolled, and
  stay still until it has gone. If the attack **continues**, or the bear stalks you, or it
  comes into a tent at night, it is **predatory**: fight back hard at the face and nose.

**If it fights.**
- **Mass is the lever.** One swat costs more footing than any defend beat can restore. *You
  cannot parry a bear.* The only gambit that works is not being where the paw lands.
- **Reach:** a paw strike (blunt plus edge from the claws) and a bite to the head and neck.
  The classic mauling targets the face and scalp.
- **Natural armor:** a thick hide, dense fur and, in autumn, a deep layer of fat. The skull
  is thick and sloped and can deflect a light projectile.
- **Vital zones:** heart and lungs behind the shoulder, low. The brain is a small target
  behind that sloped bone.
- **How it quits:** ⭐ a **defensive** bear quits when the threat is gone. That is why
  playing dead works: you stopped being a threat. A **predatory** bear quits only on cost.
  The two attacks look alike for the first seconds, and telling them apart is the skill.

**People and it.**
- Across the north the bear's name was avoided. The English *bear* probably comes from
  "the brown one", and the Slavic *medved* means "honey-eater". Hunters said *grandfather*
  or *the old man of the woods*.
- Bear ceremonialism is circumpolar: rites to send the slain bear's spirit home. These belong
  to living peoples (Ainu, Sámi, Ob-Ugric, many Indigenous North American nations), so handle
  them with care or leave them out.
- Norse *berserkers* ("bear-shirts") are public-domain saga material.
- Real laws: bounties in the past, strict protection now. A problem bear gets relocated or
  culled.
- **[suggestion]** A realm where hunters must leave the skull facing the den the bear came
  from, and the game warden asks whether they did.

**What it yields.**
- **Meat**: rich and dark. ⚠ It carries **Trichinella**, often a freeze-resistant species,
  so it must be cooked through. Curing and freezing are not enough.
- **Fat**: rendered into bear grease (lamp fuel, waterproofing, cooking). An autumn bear may
  be a third fat by weight.
- **Hide with the fur on**: a rug or robe.
- **Claws and teeth**: trophies.
- **Gall bladder**: its bile contains ursodeoxycholic acid, a real drug used today for
  gallstones. Selling it is a real, ugly illegal trade.
- **Mana:** a bear eats mostly low on the food chain, so its tissue concentrates less than a
  wolf's. Fat stores almost nothing (fat's dielectric constant is about 2–3). The long-lived
  dentine of its **canines** is the honest store.
- **Damage shapes the yield:** a holed hide loses value, and a gut shot taints the meat and
  ruins the den-season fat.

**What the model must express.**
- ✅ the `quadruped` plan with bodyParts and tissue shares; `naturalAttacks` with `massScaled`
  (a bite on the `point` channel; a paw swat on `blunt`, with claw `edge`); `circadianBand`;
  `diet: omnivore`; the smell port and an `olfactoryProfile`; the function axis (a leg wound
  slows its charge); `butcheryYield`.
- ✅ the injury is done to you through `ConditionApi.inflict` at a site.
- ✅ playing dead uses the `Lie` posture that already exists.
- ✅ Trichinella fits the shipped `ContaminableMixin` path, with butchering as the source.
- ⚠ composed modules: a plantigrade limb pair whose claws are digging tools, not raptorial;
  a hump of muscle; an integument of **guard hair + underfur + skin** over a **fat** tissue
  whose thickness is seasonal.
- ⚠ the fat's share of body mass varying by season, which the butchery yield then reads.
- ❌ **the encounter stage** (notice → size up → display → commit or leave, bestiary § 12),
  and **a brain that reads your posture, pace, noise and held items** against its drive.
- ❌ **a drive-satisfied break**: a defensive attack ends when the target *stops being a
  threat*. Morale today reads only cost. **Defensive vs predatory** must be a drive state
  that changes what ends the fight.
- ❌ **the bluff charge** as a display that is not a commit.
- ❌ **denning**: a dormancy state that suppresses metabolism and burns fat without eating
  (the shipped torpor is the ectotherm's cold-stun, which is a different thing), plus
  hyperphagia as a seasonal intake drive.
- ❌ **vector wind**, so scent travels downwind (weather.md defers direction).
- ❌ **animal learning / habituation**: a bear that remembers camps as food.
- ❌ **an irritant spray** (capsaicin on the eyes and airway as a delivery).
- ❌ **projectile glancing** off sloped bone (angle of incidence).
- ❌ **mana**: field, capacity, residence and biomagnification are all unbuilt (mana pack
  Part 11).
- ❌ **damage shapes the yield**: the pelt reading the wounds.

---

### Grey wolf (the pack) — /stuff/idea/species/animalia/chordata/mammalia/carnivora/canidae/canis/lupus

- **Quadrant · class** — real · not a person · ordinary
- *(The shipped `species/wolf.yaml` row is the existing seed; this entry is what it should
  grow into.)*

**What it is.** The largest wild dog. Eurasian males weigh 30–50 kg and females 25–40 kg;
northern animals run heavier. Wild wolves usually live 4–8 years, and rarely past 12. The
real unit is not the wolf but **the pack**, and the pack is a **family**: a breeding pair and
their offspring of the last one to three years, typically 4–10 animals. The "alpha"
dominance model came from unrelated captive wolves. David Mech, who popularized it, withdrew
it in 1999: in the wild the "alphas" are simply the parents.

**Where it lives.** Wherever large prey lives: boreal forest, steppe, mountains, tundra, and
farmland edges in Europe today. A pack holds a territory of roughly 100 to over 1,000 km²,
depending on prey, which it marks with raised-leg urine and scrapes and declares by howling.
- Mating: January to March, depending on latitude.
- Pups: born after about 63 days, in April or May, in a den.
- Summer: the pack shifts to *rendezvous sites* where the pups wait while the adults hunt.
- Winter: the pack travels together and covers tens of kilometers a day at a tireless trot
  of about 8–10 km/h. Bursts reach about 55 km/h.

**How it behaves.**
- ⭐ **A wolf cannot afford to be hurt.** A broken jaw or leg means starvation, and that one
  fact governs the pack's whole fighting temperament.
- Wolves **test** prey. They run a herd to see who lags, and choose the calf, the old, the
  lame and the sick.
- Most hunts fail; success rates vary widely with the prey.
- A healthy moose or bison that **stands its ground** is usually left alone.
- They are shy of people where they are hunted, and bold where they are not.
- **Attacks on humans are rare and have causes:** rabies (historically the big one), habituation
  to people and food, and, historically, children herding livestock alone. The 18th-century
  "Beast of Gévaudan" killings are attributed to wolves by most historians, though the
  details are disputed.

**The encounter.**
- The pack knows you are there long before you know they are. Scent and hearing both do the
  work.
- Sizing up is **collective**: they circle, watch, and one or two approach to test while
  the rest hang back.
- What your acts mean to it:
  - *Running* invites the chase that testing is built for. **Never run.**
  - *Standing tall, facing them, shouting, throwing things, and backing away while still
    facing them* is right.
  - *A fire and a group of people* are strong deterrents.
  - *Climbing a tree* works: wolves do not climb.
  - If one attacks, **fight back**. Playing dead is the wrong answer to a predator.
  - A dog with you can draw wolves in, since they kill dogs as rivals.

**If it fights — group morale.**
- The lever is **numbers and the pack's nerve**. They flank, rush in from behind, and hamstring
  (the shipped `worry` attack is the real killing action).
- Morale is **the pack's, not the wolf's**. It reads:
  - how much the target is costing them (a wolf yelping, a wolf down);
  - whether the target is weakening (a limp, a fall, a dropped weapon);
  - how the **breeders** are doing — hurt a parent badly and the yearlings may break.
- ⭐ Because injury is fatal for them, the pack quits **early and together**. A target that
  makes every rush expensive gets left.
- A mother at the den, or wolves defending pups, is the exception: that fight is not
  abandoned.
- **Natural armor:** dense fur, thickest at the ruff; no real armor otherwise.
- **Vital zones:** heart and lungs behind the elbow.

**People and it.**
- **Bounties** go back to Anglo-Saxon England and ran to North America in the 20th century.
- *Wolfshead* (*caput lupinum*) was the medieval English outlaw's status: a man who could be
  killed like a wolf. This is a real game-law hook, and the shipped `commonNames` already
  lists it.
- Fable: Little Red Riding Hood (Perrault, then the Grimms; public domain), Fenrir, Romulus
  and Remus.
- The werewolf is a **curse on a person**, a separate entry and not this animal.
- **[suggestion]** The shepherds believe a wolf can only see you if you see it first, so
  they walk the lambing pasture with their eyes down. It is wrong, and the field guide says
  so.

**What it yields.**
- **The winter pelt**: prime from about November to February, and valued for parka ruffs
  because frost brushes off the guard hair.
- **Meat**: rarely eaten. Lean, and it carries Trichinella.
- ⚠ **Handling hazard: *Echinococcus***, a tapeworm whose eggs in the fur can infect the
  skinner.
- **Mana:** an apex predator, so it **concentrates** what its prey ate, more than the bear
  and less than the whale. The store is its dentine canines.
- **Damage shapes the yield:** a pack culled by a shotgun yields poor pelts.

**What the model must express.**
- ✅ the `naturalAttacks` bite and worry; the threat graph and sides for several attackers;
  `yieldFight` refused against beasts; poise, morale and the fog; the function axis (a
  hamstrung leg is `locomotion` impaired).
- ✅ butchery.
- ✅ `Echinococcus`/Trichinella can ride `ContaminableMixin` for the meat side.
- ⚠ the pack as a `Party`-like group of NPCs. The provider exists, but whether an NPC pack
  can hold one is unconfirmed.
- ⚠ integument: a seasonal coat (a summer coat and a prime winter pelt), so the pelt's grade
  depends on the season.
- ❌ **group morale**: one morale shared across the pack, reading the breeders' state and the
  cost to the group (bestiary § 12 decided it; it is unbuilt).
- ❌ **a pack social structure**: breeding pair, yearlings, pups, and **roles in the hunt**.
- ❌ **testing / prey selection**: the brain reading a target's capacities (a limp, a lag) to
  choose.
- ❌ **the chase** (deferred in combat): pursuit endurance against yours, and running as an
  invitation.
- ❌ **territory**: scent marks and howling as a claim, and a den or rendezvous site as a
  place.
- ❌ **rabies** as a condition carried by a bite that changes behavior (disease slate).
- ❌ the shipped wolf's `lifecycleStates`/age has **no pups or yearlings**: an age stage
  that changes size, role and danger.
- ❌ the wild population as a record materialized on encounter; bounties (hunting slate).

---

### Red deer — /stuff/idea/species/animalia/chordata/mammalia/artiodactyla/cervidae/cervus/elaphus

- **Quadrant · class** — real · not a person · ordinary

**What it is.** The great deer of Europe. Its size depends hugely on food:
- Woodland stags in central Europe: 160–240 kg. Hinds: 100–150 kg.
- Scottish hill stags, on poor moor grazing: often only 90–120 kg.
- North American *wapiti* (elk) were long lumped in, but are now usually treated as a
  separate species, *C. canadensis*.

Wild red deer live up to about 15–18 years.

**Antlers** are **bone**, grown fresh every year:
- A stag casts them in late winter or early spring.
- Regrowth under living **velvet** skin is among the fastest tissue growth in any mammal,
  on the order of a centimeter or more a day at its peak. I am unsure of the exact red deer
  figure; wapiti reach about 2.5 cm/day.
- The velvet dies and is frayed off on saplings in August.

**Where it lives.** Mixed forest and its edges, and open moor and hill where forest was
cleared. Outside the rut the sexes live apart: hinds in matriarchal groups with their calves
and yearlings, stags in loose bachelor groups. Calves are born in late May and June, one
each. ⭐ The calf is a **hider**: it lies still and scentless in bracken for its first days
while the hind feeds out of sight.

**How it behaves.** Crepuscular, and nocturnal where hunted. Its senses:
- Superb smell and hearing.
- Eyes tuned to **movement**, with poor color (dichromatic) and wide field.
- A still, downwind person is often not seen at all. A moving one is seen at a long way.

Flight distance follows hunting pressure: tens of meters in a park, several hundred on a
stalked hill.

⭐ **The rut**, late September to October:
- Stags roar, wallow in peat, and gather and guard harems.
- Before fighting they walk side by side, sizing each other up. Most contests end there.
  Those that do not are antler-to-antler shoving matches that can wound or, rarely, kill.
- A rutting stag barely eats and can lose around a fifth of his weight.

**The encounter.**
- It notices you by your scent on the wind, a sound, or motion.
- The hind gives an alarm bark, and the group freezes, stares, then bounds off.
- What your acts mean to it:
  - *Stillness* is invisibility.
  - *Approaching upwind, slowly, in dead ground* is the stalker's whole art.
  - *A dog* is a predator.
- **Real safety lore:**
  - **In the rut, give stags a wide berth**, especially park deer used to people. They
    charge.
  - **Never pick up a lying calf.** It has not been abandoned. Handling it can make the
    hind reject it, and hinds will strike with their front hooves at a dog or a person near
    their calf.
  - The deer's real body count is on the roads.

**If it fights.**
- Out of the rut it flees at the first wound.
- In the rut a stag **commits**. His drive overrides cost, and his lever is **reach** (a
  rack of points, low and forward) and **shove** (mass into footing).
- A hind's strike with the forefeet is fast and blunt, and aimed down.
- **Vital zones:** the stalker's shot is **heart and lungs, just behind the foreleg, a
  third of the way up**. Neck and head shots risk a wounded, lost animal.
- How it quits: a wounded deer runs, often a long way. That is the case for tracking a blood
  trail, and for the hunter's ethic of the clean first shot.

**People and it.**
- **Forest Law:** Norman royal forests protected *the vert and the venison*, the wood and
  the deer, with their own courts. The Charter of the Forest (1217) softened them.
- Highland deer stalking and the ghillie.
- Neolithic flint miners dug with **red deer antler picks** (Grime's Graves).
- Folklore: the white hart (Arthurian, public domain), Herne the Hunter, and the stag as
  the hunter's quarry of kings.
- **[suggestion]** In a realm with a strong field, cast antlers are **collected** each
  spring. The shed-hunters' rights to a hill are a parcel question, and stealing a hill's
  sheds is a known crime.

**What it yields.**
- **Venison**: very lean, roughly 2–3% fat. Bleed and gralloch (gut) it promptly or it
  spoils.
- **Hide**: buckskin-type leather, brain-tanned or bark-tanned.
- **Sinew**: bowstring and thread.
- **Antler**: handles, combs, picks.
- ⭐ **Hartshorn**: dry-distilling antler really yields ammonia (*spirit of hartshorn*,
  smelling salts) and ammonium carbonate (baker's ammonia). Real chemistry with a derivable
  recipe.
- ⚠ **Liver fluke and ticks** (Lyme). Cervid **chronic wasting disease** (a prion) is real in
  North America and Scandinavia. I am unsure how far it has reached red deer specifically.
- **Mana:** a herbivore, so low concentration in its flesh. **Antler is a store that resets
  every year**: grown in about five months from that summer's forage, it is a dated sample
  of the field, *a tree ring you can pick up*. Bone has a moderate dielectric constant.

**What the model must express.**
- ✅ the `quadruped` plan; a hoof strike (`blunt`) and an antler gore (`point`) as
  `naturalAttacks`; the photoperiod breeding season (ranching's precedent); `butcheryYield`
  and the cooking law; the function axis.
- ✅ concealment for a lying calf; the smell walk.
- ⚠ composed modules: a head module with **paired antlers as a part only males grow**.
- ⚠ antler as a **bone tissue with its own growth reserve**, and the velvet as an
  integument that is shed.
- ❌ **an annually regrown, cast part**: it grows on a clock, is **shed as a Thing** into the
  world, and its mass and points follow the stag's age and condition.
- ❌ **sex-dimorphic anatomy** within one species row (stags have antlers, hinds do not;
  different masses).
- ❌ **the rut as a seasonal drive**: it overrides fear, cuts intake, and costs mass.
  Photoperiod says *when*, but nothing changes the *brain*.
- ❌ **the encounter stage** and a brain reading stillness, motion and wind.
- ❌ **vector wind** (scent).
- ❌ **the hider strategy**: a young animal whose drive is *freeze*, and a mother that stays
  away.
- ❌ **herd structure**: matriarchal groups, bachelor groups and harems.
- ❌ **the blood trail and `track`** (hunting slate).
- ❌ **game law / close seasons** (hunting slate).
- ❌ **prion disease** (disease slate).
- ❌ **mana**: field, capacity, residence and biomagnification are all unbuilt.
- ❌ **dry distillation** of a tissue into a product (hartshorn). Unsure whether
  fire/distilling can take a bone input.

---

### Common European adder — /stuff/idea/species/animalia/chordata/reptilia/squamata/viperidae/vipera/berus

- **Quadrant · class** — real · not a person · ordinary

**What it is.** A small, stout viper.
- Size: usually 50–65 cm long and 50–180 g; females are larger.
- Markings: a dark zigzag down the back, which is gray-white in males and brown in females.
  Melanistic black adders occur.
- Senses: **vertical pupils**. It has **no heat-sensing pits** (those belong to the pit
  vipers). It hunts by sight and by **scent through its tongue and vomeronasal organ**.
- It is viviparous: 3–20 young are born live in late summer.
- Lifespan: wild adders commonly reach 10–15 years. I am unsure of the upper record.

**Where it lives.** Heath, moor, bog edges, open woodland rides and sunny banks, from Britain
to the Pacific. It is the only snake that reaches past the Arctic Circle (to about 69°N in
Scandinavia). It is an **ectotherm**, so its life is about heat:
- **Brumation**, about October to March, often communal in a frost-free hibernaculum it
  returns to every year.
- **Spring**: males emerge first and bask, shed, then **"dance"**. This is male combat:
  rearing and wrestling, without biting.
- Summer: hunting.
- Northern females may breed only every 2–3 years.

**How it behaves.**
- It eats voles, shrews, lizards, frogs and nestlings.
- It strikes, **lets go**, and follows the dying prey's scent trail.
- **Shy.** It feels footsteps through the ground and usually leaves before you arrive.
- It bites people who **tread on it or pick it up**.
- When cornered: hissing, a flattened body, an S-coil, short bluff strikes.
- A cold adder is sluggish. A sun-warmed one is fast.

**The encounter.**
- It notices you through ground vibration and sight.
- To it, your acts mean:
  - *Heavy footsteps* warn it off. This is the oldest advice: stamp on the path.
  - *Stillness* lets it go about its business.
  - *Reaching into heather or under a log* is how hands get bitten.
  - *Attempting to handle it* is how most bites happen.
- **Real safety lore:**
  - Wear boots and long trousers on heath; keep dogs leashed in spring.
  - **If bitten:** keep still and calm, immobilize the limb, remove rings and watches before
    the swelling arrives, and **get to hospital**.
  - **Do not** cut, suck, apply a tourniquet, or use ice.
  - Many bites are **"dry"** (no venom injected). Figures vary widely; I would not quote one.
  - Serious envenoming is uncommon but real: spreading swelling and bruising, vomiting, low
    blood pressure, sometimes an anaphylaxis-like collapse.
  - Children and **dogs** are at higher risk.
  - Deaths in Britain are very rare (about a dozen recorded since the late 1800s). Antivenom
    exists.

**If it fights.** It does not, in any sense the poise contest models. Its lever is **the
fog**: it is hidden, and the first you know is the strike.
- **One move**: a fast strike at whatever is closest (an ankle, a reaching hand, a dog's
  muzzle), then retreat.
- **Natural armor**: overlapping keratin scales, adequate against brush and nothing more.
- **Vital zones**: the head and the front third of the body.
- How it quits: it always prefers escape. A pinned adder bites until released.
- ⭐ **The danger is the venom, not the fight.** The difficulty quotients split sharply: very
  good odds, low escape cost, **danger set entirely by the dose against your body mass**.

**People and it.**
- *Adder* was once *a nadder* (Old English *nǣdre*). Through rebracketing, *a nadder* became
  *an adder*.
- **Adder stones / hag stones**: holed stones or glass beads said to form from serpents'
  breath (the Welsh *glain neidr*, the Druid's egg in Pliny). They are public domain and
  worn against snakebite and the evil eye.
- Old beliefs, all false and good for a fallible field guide:
  - an adder swallows its young to protect them (probably a misreading of live birth);
  - an adder does not die until sunset;
  - adder fat cures its own bite.
- Real law: protected in Britain from killing and injury.
- **[suggestion]** A moor parish that pays a shilling a head for adders (as many did) is a
  bounty the polity can repeal. Players can see what happens to the vole population.

**What it yields.**
- **Venom**: milked, not killed for. It is the feedstock for **antivenom**, made by
  immunizing a horse with small doses and drawing its plasma, a real chain.
- Venom chemistry:
  - Components: metalloproteinases, phospholipase A2 and serine proteases.
  - Effects: local tissue damage, swelling and a coagulation disturbance.
  - Regeneration: the glands refill over days to weeks. I am unsure of the berus-specific
    rate.
  - Susceptibility: hedgehogs have **partial** resistance (reportedly a serum factor), and
    dogs are more vulnerable than people.
- **The skin**, shed whole each spring, is a found object.
- **Mana:** it eats small mammals, so it sits a rung above the vole and concentrates
  moderately. But its whole store is a few dozen grams. Its fangs are tiny dentine stores.
  Venom is a **reagent** (bodies run on food; this is body chemistry).

**What the model must express.**
- ✅ `thermalStrategy: ectotherm` and the torpor band; `introduceToxin` onto a burden; toxin
  → banded Condition; the `antidote:<toxin>` Material tag (`dose`); blood draws units
  (horse plasma); concealment bands and the `wary` detect pattern; the hazard grammar for
  "trod on it".
- ⚠ a **serpentine plan composed of a head module and a body segment chain**, with no
  limbs; locomotion derived from the body.
- ⚠ **scale integument**, shed whole and periodically.
- ⚠ a **venom gland organ** that **produces** venom at a rate into a reserve. A bite
  **spends** it, and a dry bite is a withheld or empty dose.
- ⚠ the vomeronasal organ as a smell port.
- ❌ **injection as a route** that produces **local tissue damage at the bite site** (the
  function axis on the limb) **and** a systemic coagulopathy. Today a toxin enters the burden;
  nothing ties it to a site.
- ❌ **species-specific susceptibility** to a toxin (hedgehog, dog vs human). The spellbook
  § 6 requirement *"declare what its venoms work on, and toxin tolerances"* has no field.
- ❌ **an ectotherm's speed from its body temperature**: strike tempo graded continuously,
  not just torpid or normal.
- ❌ **communal brumation** at a remembered site; the male combat dance (ritualized fighting
  without biting).
- ❌ **ground vibration as a sense** (seismic or touch at distance), and the player's tread as
  its signal.
- ❌ **a defensive strike as an ambush hazard from a creature** (stealth ambush exists for
  NPCs; a creature that ambushes only when stepped on needs a trigger).
- ❌ **mana**: field, capacity, residence and biomagnification are all unbuilt.

---

### North American beaver — /stuff/idea/species/animalia/chordata/mammalia/rodentia/castoridae/castor/canadensis

- **Quadrant · class** — real · not a person · ordinary
- *(I chose **Castor canadensis**: it is the fur-trade beaver and the bigger dam-builder. The
  Eurasian *C. fiber* is very similar but has a different chromosome count, cannot
  interbreed with it, and lives more often in bank burrows than behind dams. It was reduced
  to about 1,200 animals around 1900 for fur and castoreum and has since been reintroduced
  across Europe. Either fits the entry; the dam emphasis is canadensis.)*

**What it is.** The second-largest rodent.
- Size: adults usually 15–30 kg, about a meter long with the tail.
- Lifespan: about 10–12 years in the wild.
- **Incisors** grow throughout life. Their front enamel is **orange because it contains
  iron**, which hardens it, so the teeth self-sharpen as softer dentine wears behind it.
- **Tail**: a flat, scaly paddle used as rudder, prop, fat store and alarm.
- **Hind feet**: webbed. One toe on each hind foot has a split grooming claw.
- **Underfur**: among the densest of any mammal (figures vary), its hairs barbed, under long
  guard hairs and kept waterproof with oil.
- **Castor sacs** produce **castoreum** for scent-marking. It contains salicylic acid from
  the willow bark the beaver eats.

**Where it lives.** Streams, ponds and lakes with willow, aspen, alder and birch, across
temperate and boreal North America.
- **The colony** is a monogamous pair with the year's kits (born about April to June, 2–4 of
  them) and the yearlings; two-year-olds leave.
- Winter: they stay active under the ice, living off a **food cache**, a raft of cut
  branches pushed into the pond mud by the lodge.
- Activity: nocturnal and crepuscular.

**How it behaves — and how it shapes the world.** ⭐ The beaver is the rare animal that
**builds the place it lives in**:
- **A dam** of sticks, stones and mud raises the water so the lodge entrance is underwater
  and the logs float.
- The building drive is triggered by the **sound of running water**. In classic experiments
  beavers piled sticks over a loudspeaker playing a stream.
- **The lodge** is a domed stick-and-mud island with an underwater entrance and a dry
  chamber.
- **Canals** carry logs.

The pond changes everything:
- it raises the water table and traps sediment;
- it drowns trees;
- it makes wetland for fish, frogs, ducks and moose;
- it floods roads and fields;
- when abandoned and breached, it drains to a fertile **beaver meadow**.

**The encounter.**
- It notices you by hearing and smell. Its eyesight is poor.
- Its first act is the **tail slap** on the water, an alarm to the colony, and a dive.
- It is placid unless **cornered on land** or diseased. Rabid beaver attacks are recorded,
  and a 2013 death in Belarus followed a bite to the leg that cut an artery.
- **Real safety lore:** give them space on land and don't let dogs harass them. Treat
  untreated pond water as suspect: beavers are one reservoir of *Giardia* ("beaver fever";
  how much they contribute versus people is debated) and of tularemia.

**If it fights.** Rarely. Its one weapon is the bite of chisel incisors (`edge`, mass-scaled
but with the leverage of a felling tool). It can cut deep into a calf or a dog. Natural
armor is the dense pelt and thick skin. Its vital zones are the usual heart and lungs, and
the head. How it quits: it heads for water the moment it can, and in water you will not
catch it.

**People and it.**
- ⭐ **The fur trade.** The barbed underfur **felts** superbly, and beaver felt hats were the
  fashion of Europe from about 1600 to the 1840s, when silk hats ended it.
- Hatters preferred *castor gras*, "greasy beaver": pelts already worn as robes by Indigenous
  trappers, which had shed their guard hairs.
- The hunt for pelts drove French, British and Dutch exploration of the continent:
  - the voyageurs;
  - the Hudson's Bay Company (1670);
  - ⭐ its **"Made Beaver"**, a unit of account worth one prime pelt, against which every
    trade good was priced: a currency denominated in an animal;
  - and the near-extirpation of the beaver by 1900.
- The trade also ran on and reshaped living Indigenous economies and politics: care.
- **"Mad as a hatter"**: felting used **mercuric nitrate** ("carroting"), and the hatters
  were poisoned. A real toxin inside a real process.
- Medieval bestiaries (the *Physiologus* tradition, public domain) tell that the beaver,
  hunted for its "testicles" (actually the castor sacs), bites them off and throws them to
  the hunter to escape. That is folk etymology linking *castor* and *castrate*.
- The story that the Church classed beaver as **fish** for Lent is widely told. Whether a
  formal ruling exists I am unsure.
- **[suggestion]** A realm where a beaver colony's dam has **water rights**. The pond is a
  prior appropriation the miller downstream contests, and removing the dam is a legal act,
  not a chore.

**What it yields.**
- **The pelt**: prime in winter. **Damage shapes the yield**: a trap or shot hole halves its
  value.
- **Castoreum**: perfume fixative, medicine, and an approved food flavoring.
- **The tail**: a fatty delicacy.
- **Meat**: dark and edible.
- **Incisors**: carving tools, used in real tradition.
- **Mana:** a herbivore eating **bark and cambium**, a year or two of a tree's growth, not its
  heartwood. Its tissue concentration is low. ⭐ The interesting store is **the pond**: water's
  dielectric constant is about 80, and a beaver holds thousands of cubic meters of it in
  place, so **a beaver dam in a strong field is a mana reservoir someone else built**.
  **[suggestion]** — and whether the field's charge partitions into still water like
  that is a mana-pack open question.

**What the model must express.**
- ✅ watershed's **`ControlStructure`** (`passFraction`) and **`StorageNode`**: a beaver
  dam *is* one, and *whoever holds the dam holds everyone below*.
- ✅ water rights (prior appropriation records).
- ✅ a `quadruped` base; `breathableMedia: [air]` with swimming; butchery; textiles'
  `felted` fabric row (shipped unreachable) and trade-tanning; the `edge` bite.
- ✅ banking can denominate a unit (Made Beaver), though as a *good* standard, not a kernel
  coin. I am unsure banking supports a commodity unit of account.
- ⚠ composed modules: a webbed hind-limb pair and a paddle tail (a **tail module** that
  stores fat and serves swimming); **swimming derived from those parts**.
- ⚠ **iron-bearing enamel** as a tooth tissue material that is ever-growing.
- ⚠ an integument of **barbed underfur + guard hair + oil**.
- ⚠ **castor sacs** as an organ that **produces** castoreum into a reserve (a tap-like
  yield, but taken at death).
- ❌ **an animal that builds world structure**: a brain that fells trees (forestry's `fell`
  is a player act), raises a `ControlStructure` over weeks of labor, **triggered by the
  sound of running water**, and repairs it overnight.
- ❌ **abandonment and succession**: a breached dam drains to a beaver meadow.
- ❌ **an animal-made place**: the lodge as a Location with an underwater entrance; the food
  cache as a stored good under ice.
- ❌ **fur dressing** (hair kept on, vs tanning hair off); **felting from animal underfur** as
  a reachable process; **mercury carroting** as a process toxin.
- ❌ **the colony** as a family group with kits and yearlings who disperse.
- ❌ **disease reservoirs** (Giardia in water, tularemia, rabies via bite) (disease slate).
- ❌ **flooding** consequences of a raised pond (flooding slate).
- ❌ **mana**: field, capacity, residence, biomagnification, and partition into water.

---


Four entries: one ordinary real animal that the whaling build needs, and three *adapted*
creatures (evolved organs that store or use mana), one per relation an organ can have to the
field: a **discharge** organ (the spring eel), a **power** organ (the wyvern), a **patterning**
organ (the basilisk).

Conventions: `τ ≈ 1 kJ` is derived from arcane-science's own glowlight figure (2.2 W held for an
hour = 8 τ, so 1 τ ≈ 990 J). Where a fact is uncertain it says so.

---

### Sperm whale — /stuff/idea/species/animalia/chordata/mammalia/artiodactyla/physeteridae/physeter/macrocephalus

- **Quadrant · class** — real · not a person · ordinary.
- **What it is** — The largest toothed predator alive. The sexes differ more than in almost
  any other mammal: adult bulls reach 15–18 m and roughly 35–57 t (historical claims of 20 m+ are
  unverified); cows reach about 11 m and 13–15 t. Teeth (18–26 pairs of conical teeth) sit in the
  narrow lower jaw only. The head is about a third of the body and holds the **spermaceti
  organ (the "case")** and the **junk**. Both are wax-and-oil-filled sound-forming tissues behind the
  phonic lips. The clicks it makes are the loudest sounds any animal produces (around 230 dB re
  1 µPa in water). It eats mostly deep-water squid, giant squid included, and some fish. It
  routinely dives 1,000–2,000 m for 40–60 minutes (the longest dives are over 90 minutes and the
  deepest about 2.2 km; treat both extremes as approximate). The lungs collapse on the dive, and
  the oxygen is held in the blood and in myoglobin-dense muscle. The blowhole sits on the left of
  the head, so the blow slants forward and to the left, and a whaler could name the species by its
  spout. It lives 70 years or more; the upper bound is unclear.
- **Where it lives** — Every deep, ice-free ocean, over canyons and shelf edges where squid
  rise. Cows and calves stay in warm water, roughly below 40° latitude. Grown bulls range alone or
  in bachelor groups into the high latitudes, then return to the warm grounds to breed. It needs
  no particular field, but in a strong one it **takes up mana faster than anything else that
  lives** (below).
- **How it behaves** — Cows live in matrilineal units of about ten, inside vocal **clans** that
  differ by their click patterns ("codas"), which is culture in the strict sense. They take turns
  diving and babysitting, and a calf is nursed for years. Gestation is about 14–16 months and a cow
  calves every 4–6 years, so a population recovers slowly. Young males leave at about 10. Days are
  dive cycles: forage at depth, then rest at the surface, sometimes sleeping vertically in short
  bouts. Against orcas a unit forms the **marguerite**, heads together and flukes out, around the
  calves.
- **The encounter** — It hears you long before it sees you. Hearing and echolocation carry
  kilometers, while its eyes are poor, and toothed whales have no sense of smell. An oared boat is
  quiet and an engine, a struck hull or a dropped oar is loud. Whalers called a frightened whale
  *gallied*: it sounds (dives) or runs, and the unit closes up. Coming up from behind, quietly, is
  the approach. The danger is the flukes and the head: a struck bull may turn on the boat (the
  *Essex* was rammed and sunk in 1820), and a sounding whale can drag a fast boat down or away (the
  "Nantucket sleigh ride"). For a modern reader the safety advice is: keep your distance (many
  jurisdictions set about 100 m), never put yourself between a cow and her calf, and never swim
  under a resting whale. Sperm whales are not known to attack swimmers who leave them alone.
- **If it fights** — It doesn't, unless struck or its unit is threatened, and then the fight is
  against the **boat**. The levers are mass (a natural attack scaled to 40 t is not a contest),
  endurance (it can sound for an hour while you wait on the line), and escape (it simply leaves).
  Its natural armor is depth: blubber up to about 30 cm over thin, easily scarred skin. The vital
  zone the whalers called **the life** is the lungs and great vessels behind the flipper, reached by
  the lance once the harpoon has fastened the boat. When it is hit there the blow turns red ("the
  chimney's afire"). It quits by sounding, then by dying. A cow does not quit while her calf is
  near. Whalers struck the calf to hold the mother, and the bestiary should say plainly that this
  happened.
- **People and it** — Melville's *Moby-Dick* (1851) and the real "Mocha Dick" stand behind every
  whaling port's stories. There is a long fear of the vengeful bull. Its teeth are trade goods and
  sacred objects: scrimshaw, and the Fijian **tabua**, which is a living culture's ceremonial object
  and should be treated with care, not used as decoration. Game law follows: today the species is
  IUCN Vulnerable and under the 1986 moratorium on commercial whaling. *Realm-lore suggestion:* a
  whaling port keeps a **wreck book** of boats stove and men lost, the death-log precedent applied
  at sea, and the deep-water clans each have a name in the port.
- **What it yields** — A carcass too large to lift. It is flensed **alongside** the ship in long
  strips ("blanket pieces") and tried out in the try-pots. A typical whale gave roughly 25–45
  barrels (31.5 US gal) of **sperm oil** and a great bull 80 or more (the figures vary by source).
  Sperm oil is a liquid wax, the finest lamp oil before kerosene and a lubricant that does not gum.
  The case gives **spermaceti**, which is bailed out of the head and separated from the oil as it
  cools. It is the stuff of the standard candle: the old unit of candlepower was a spermaceti
  candle burning 120 grains an hour. **Ambergris** forms in the gut of perhaps about 1 % of whales,
  a concretion around squid beaks. It floats, ages in sun and sea, and is a perfume fixative,
  usually *found* on a beach rather than cut out. **Teeth** give ivory (dentine). **Meat** and
  **bone** come too. Damage shapes the yield: a whale that sinks is lost, a slow death sours the
  meat, and a whale left too long bloats. A decaying carcass can burst, a real hazard.
  - ⭐ **Mana — biomagnification says it is the richest biological store, and capacity says where
    it sits.** A long-lived apex predator eating a deep-water food chain for 70 years concentrates
    whatever is in that chain, as real methylmercury concentrates in it. But capacity follows the
    dielectric constant. Water is about 80, so the **water-rich tissues** (blood, myoglobin-dense
    muscle, about 70 % water) hold the charge. **Blubber, sperm oil and spermaceti are fats and
    waxes** (dielectric about 2–3) and hold almost none. The **teeth** grow a dentine layer a year
    (real: that is how a sperm whale is aged), so they are the long-residence **store**. Their
    dielectric is moderate and uncertain, perhaps about 10, and nearly all of their value is
    stability. ⚠ **This contradicts the mana pack's 11d row, "whale oil and blubber, burned in
    lamps".** Under the fat rule the oil is the *poor* carrier, and the try-pot, which boils off the
    water, partitions most of the charge out with the steam or into the scrap. Either the 11d row is
    wrong or mana is meant to partition into lipids. One of them has to be decided.

**What the model must express**

- ⚠ A **cetacean** plan composed of modules: a head (with the case and junk as organs), a torso,
  one flipper pair, flukes as a tail module, and no hind limbs. Shares sum to 1 with the head at
  about a third.
- ✅ `breathableMedia: ['air']` with the breath as a store burned (respiration). ⚠ The store must
  be sized per species by blood volume and myoglobin, so a 60-minute dive derives rather than
  being authored.
- ⚠ **Lung collapse at depth** as a body-plan fact that exempts it from the bends ✅ that
  respiration ships for people.
- ✅ The underwater column for the dive. ⚠ Whether a budded column reaches 1–2 km.
- ❌ GAP: **echolocation** as a sensory modality. `Perceiver.ts` explicitly excludes it from the
  v1 union. It is the whale's primary sense, and it is also how it reads a boat.
- ✅ Hearing and vision ports. ✅ *No* smell port: the absence is data.
- ⚠ Integument: thin skin over **blubber**. ⚠ Tissue materials **blubber**, **spermaceti** and
  **dentine/ivory**; only flesh, muscle and bone ship. ⚠ **Ambergris** as a seeded per-individual
  fact ("seeded, never drawn", like the ABO type), and as flotsam a beachcomber finds.
- ✅ The size rule: the carcass as forestry's **bole** (cut a length at a time) and the ship-alongside
  rule. ✅ The rendering is trade-cooking's `render-tallow` shape. ✅ Thermal phase change separates
  spermaceti from oil on cooling. ✅ `FuelStore` and street lighting are the demand.
- ✅ Natural attack force scales with mass. ❌ GAP: **a creature striking a craft**: the stove boat,
  a hull as the target of a natural attack.
- ✅ Cordage `tie`: a harpoon line whose ends decide its use. ⚠ A line fast between a moving boat
  and a moving animal (the sleigh ride), on river's trajectory/frame protocol.
- ❌ GAP (slated, combat-depth § 2): **vital zones**, the "life".
- ❌ GAP (slated, bestiary § 12): **group morale and the marguerite**, a unit's defense as one
  decision, and a cow's never-quit near her calf.
- ❌ GAP (slated, bestiary § 12): creatures **reading the player's acts** (noise, approach bearing).
- ❌ GAP (designed in mana pack Part 11, unbuilt): **per-instance charge from diet, concentrating by
  trophic level**, and partition at the try-pot.
- ❌ GAP: **sentience/welfare** for the clean kill (slate § 1, unbuilt).

---

### The real electric eel — /stuff/idea/species/animalia/chordata/actinopterygii/gymnotiformes/gymnotidae/electrophorus/electricus

(A reference entry. The invented relative below is defined against it.)

- **Quadrant · class** — real · not a person · ordinary.
- **What it is** — Not a true eel. It is a **knifefish** (Gymnotiformes), closer to catfish and
  carp than to eels. Since 2019 it has been split into three species: *E. electricus*, *E. voltai*
  and *E. varii*. It reaches about 2–2.5 m and 20 kg. It swims by rippling a long anal fin, so it
  moves backward as easily as forward. Three electric organs take up most of its length, and they
  are stacks of **electrocytes**, flattened modified muscle cells. *Main* and *Hunter's* organs
  stack thousands of cells in series (about 0.15 V each) and fire pulses of up to about 600 V; *E.
  voltai* has been measured at about 860 V, the highest recorded. They deliver around 1 A in
  roughly 2 ms pulses, in volleys of several hundred hertz. **Sachs' organ** fires weak pulses for
  **electrolocation**: tuberous receptors in the skin read distortions in its own field, which
  matters because its eyes are poor. It is an **obligate air-breather**: it gulps air at the
  surface every few minutes through a highly vascularized mouth, and drowns if kept down.
- **Where it lives** — The Amazon and Orinoco basins and the Guiana Shield, in slow, muddy, low-oxygen
  water: backwaters, swamps and flooded forest.
- **How it behaves** — Mostly nocturnal, a fish-eater. Real, recently documented behaviors: it fires
  **doublets** that make hidden prey twitch and give themselves away. It **leaps** and presses its
  chin to a threat above the water, so the current runs through the threat's body (Catania 2016). *E.
  voltai* has been observed **hunting in groups** that herd shoals of tetras (2021). Males make a
  foam nest and guard the young. It lives about 15 years in the wild and longer in captivity.
- **Danger** — A shock rarely kills directly. It incapacitates, and a person who falls in shallow
  water **drowns**. Repeated shocks may stop breathing or the heart (documented deaths are few). The
  advice: don't wade murky backwaters at night, keep rubber between you and the water, and if
  shocked, get your head clear of the water first.

---

### Spring eel *(INVENTED — adapted)* — /stuff/idea/species/animalia/chordata/actinopterygii/gymnotiformes/gymnotidae/thaumatophorus/fonticola

> ⚠ **Everything in this entry below the real eel is invented**, written to be a plausible
> relative: the same body, one organ re-purposed. Folk names (suggested): *spring eel*,
> *witch-eel*, *the lamp that bites*.

- **Quadrant · class** — fantasy (invented biology) · not a person · **adapted**.
- **What it is** — A knifefish of *Electrophorus*'s build, about 1.2–1.8 m and up to 10 kg, pale,
  with a faint lilac sheen where the organ lies under thin skin. It keeps Sachs' organ for ordinary
  electrolocation. Its main organ is a stack of **thaumocytes** (invented): electrocyte-like plates
  of nearly pure cell water (dielectric about 80) between thin membranes. The plates **charge with
  mana by residence**, the way wood takes up moisture, and the eel discharges them through a
  coupling into an ordinary electric shock. The fish's muscles run on food. **Only the organ runs on
  the field.**
- **Where it lives** — Only at **mana springs** and in the reach below them, down to where the
  diluted field falls under the organ's threshold. Its range is therefore a map of the field.
  *Realm-lore suggestion:* prospectors follow spring eels upstream, and "where the witch-eels stop"
  is an old phrase for the edge of good water.
- **How it behaves** — Like its relative: nocturnal, sit-and-wait, air-gulping, nesting. One
  difference matters most. Its weak organ reads the **field gradient and charged bodies** as well as
  shape. Prey that fed in strong water is brighter to it, and a **caster with a full reserve is the
  brightest thing in the pool**. It is drawn to charged bodies rather than repelled by them.
- **The encounter** — It notices you by your field before your splash. Standing still does nothing
  and moving away slowly does little. **Emptying your reserve**, by casting it into a stone, makes
  you dim. A lamp barely matters, since it hardly sees. Its tell is the doublet: you twitch for no
  reason, and the next pulse is the volley.
- **If it fights** — It bends **tempo** and **footing**. A volley stuns, the shock channel ✅ through
  the water's conduction spread ✅, and in water your footing is your breath. Unlike the real eel it
  **does not tire**: the volley lasts as long as the organ holds charge, and then it stops dead. That
  makes the empty organ the opening: **bait it to discharge** (a charged decoy, a stone on a line),
  then act while it recharges at the slow rate the field sets. Insulation ✅ (rubber) resists the
  shock as for the real eel. Vital zones: the head (it must surface to breathe, so it can be met
  there) and the organ itself, which is the softest and largest part of the body. It quits by
  backing into cover.
- **People and it** — Prized and feared at spring towns. The trade sells live "spring eels" to
  collectors, and they arrive **duds**, because a store leaks toward a weaker ambient field (Voss
  decay). A buyer who knows this asks where the water came from. A good counterfeit lesson.
- **What it yields** — Meat (ordinary). **The organ is a reagent, not a store**: high capacity
  because it is water, unstable because it is tissue. It rots on spoilage's clock, its charge leaks
  as the tissue breaks down, and ⭐ **drying it destroys its capacity** along with the water, exactly
  as the moisture analogy predicts. So it is bought fresh, as a potion solvent near the spring.
  Damage shapes the yield: a spear through the organ drains it to the water.
- **The binding** — None in the strict sense. This is a **store and a discharge**, an impulse device
  in Kell's terms. **What is held:** the charge in the thaumocyte stack, leaking by Voss decay.
  **What pays:** the spring's field, by residence, and to a lesser extent charged prey. **What cuts
  it:** leaving the field (it fades), discharging into a **grounded doped-iron rod** set in the
  water (it shunts the volley; *suggested* as the spring fishers' tool), and spending it on a decoy.
- ⚠ **Open physics question:** real capacity depends on geometry (thin plates, C = εA/d) as well as
  material. Does mana capacity? If only material counts, the stacked organ has no reason to be
  stacked.

**What the model must express (both eels)**

- ✅ The `fish` plan. ⚠ A knifefish variant: an elongate torso and an anal-fin ribbon as a fin
  module, with the organ taking about 80 % of trunk length as a tissue share.
- ✅ Two breathing apparatuses (gills plus an air-gulping mouth). ✅ Drowning when kept from air.
- ✅ `EnergizedMixin` and the creature shock innate (electricity.md "the electric eel case").
  ✅ Conduction spread in water.
- ⚠ The organ as a part that **produces** charge at a rate into a reserve: food-paid for the real
  eel, field-paid for the spring eel.
- ❌ GAP: **electroreception** as a modality (explicitly excluded in `Perceiver.ts`).
- ❌ GAP: a **mana-sense** modality (reading the field and charged bodies).
- ❌ GAP (mana pack, unbuilt): residence-charging, Voss leakage, coupled discharge (mana into a real
  channel at η ≤ 1), and capacity lost on drying.
- ❌ GAP (slated): group hunting, the threat graph applied to prey shoals. Creature
  act-reading: a doublet as a tell; the leap as a behavior.

---

### Wyvern *(INVENTED biology over heraldic folklore — adapted)* — /stuff/idea/species/animalia/chordata/reptilia/archosauria/viperavia/viperavis/heraldica *(order and genus invented)*

- **Quadrant · class** — fantasy · not a person · **adapted**.
- **What it is** — *Source tradition:* English heraldry and folklore. *Wyvern*, earlier *wyver*,
  comes from Old French *wivre*, "viper". It is a dragon with **two legs and two wings, the wings
  in place of the forelimbs**, and a barbed tail. Local legends such as the Mordiford Wyvern of
  Herefordshire tell of one that grew from a pet into a taker of cattle and men. (A wyvern with a
  venomous sting also appears in the D&D SRD 5.1, CC-BY 4.0; nothing here depends on it.) No fire:
  physics gives it no fuel tank. Our animal is a lightly built archosaur, flying with a pterosaur's
  pattern, the forelimbs as wings and quadrupedal launch, at about 400 kg with a 13 m span.
- ⭐ **The wing-loading arithmetic, done honestly**:

  | | mass | how it flies | magic? |
  |---|---|---|---|
  | largest living flapping birds (great and kori bustard, mute swan) | ~12–20 kg | flapping take-off from flat ground, near the limit | no |
  | *Argentavis* (extinct) | ~70 kg, ~6–7 m | soaring, wind-assisted take-off | no |
  | *Quetzalcoatlus* (pterosaur, extinct) | ~200–250 kg, ~10–11 m | **vaulted on its forelimbs**, then soared | no |
  | **the wyvern** | ~400 kg, 13 m, lifting a 60 kg ewe | flapping take-off from a field | **yes** |

  Why the limit exists: with geometric similarity, the power needed to fly scales roughly as
  m^7/6, while the power a flapping muscle can supply scales nearer m^2/3, because a bigger wing
  beats slower. The margin falls as about m^−1/2. Calibrated at the ~18 kg birds that only just
  manage it, a 400 kg wyvern has about √(400/18) ≈ **4.7× too little power** to flap off flat
  ground. Carrying a ewe makes it worse: induced power goes as weight², so (460/400)² ≈ 1.3× more.
  The level-cruise check is not fatal by itself. At 400 kg, 13 m span, aspect ratio 8 (S ≈ 21 m²,
  wing loading about 190 N/m², close to a pterosaur's), stall is about 14 m/s and minimum-power
  flight needs roughly **5 kW mechanical**, about 40 W per kg of a 120 kg flight-muscle mass. That is
  at the top of what aerobic muscle sustains. **Take-off is the wall.** Climbing from a standstill
  with a load needs on the order of **30 kW for ~20–30 s**, which is beyond any muscle.
  - So the honest options are: a 20 kg "wyvern" (a big bird, no magic needed); a 250 kg soarer
    that vaults from cliffs and rides thermals and **cannot** lift a sheep from a field (no magic
    needed, and an excellent content animal); or the **folklore** wyvern, which needs an organ that
    pays the difference.
- **The mana organ** — invented, labeled. Following the mana pack's device triad, the wyvern is a
  **living device**:
  - **The store:** the **keel**, its fused breastbone and shoulder girdle, layered with an invented
    rutile (TiO₂) biomineral, dielectric about 100. It is stable, dry and bound in bone, so it
    survives a fasting winter in a way wet tissue would not. It charges by **residence** at the eyrie.
  - **The conduit:** a **flight gland** sheathing the pectoral muscle that draws the keel's charge
    and couples it into muscle work. Mana pays for *mechanical work through the ordinary wing*, so
    the spell uses the same mechanism as the mundane act.
  - **The cost:** about 30 kW × 25 s ≈ 750 kJ of work, at a coupling η perhaps 0.5, is **about
    1,500 τ per laden take-off**, five times a caster's mid reserve of 300. A keel that holds a few
    take-offs is a few thousand τ. (The η is invented; the order of magnitude is the point.)
- **Where it lives** — **Only where fields are strong**: crags above mana-rich ground, eyries at old
  workings. Away from them the keel leaks and it cannot launch. A wyvern in a weak-field menagerie
  is a 400 kg walking reptile. Seasonal: it stays at the eyrie in winter, lives on the keel and
  hardly flies.
- **How it behaves** — A raptor's habits at an ox's mass. It is territorial over a hunting range,
  perches high, and **launches rarely and deliberately**: every launch spends hours of recharge. It
  prefers to drop from height, which is free, and to take prey on the ground, then climb with it on
  stored charge. It is solitary and pairs at the eyrie.
- **The encounter** — It sees you first (raptor vision) from a perch. Livestock in the open is what
  it looks at. A person usually is not prey unless alone and small. Its tell is the head-low crouch
  before a vault. Running in the open invites a stoop, and cover denies it. Fire and noise do little.
  **Making it launch repeatedly, by harrying it off one kill after another, empties it.**
- **If it fights** — On the ground it is clumsy, walking on its wing-knuckles. It bends **reach**,
  with the tail sting (an anticoagulant venom like the Komodo dragon's; bleeding ✅, toxin burden ✅),
  and **escape**, because it can leave upward if it has charge. Morale: it quits when a fight costs
  more than the kill, and **never fights at the eyrie with a full clutch**. Vital zones: the wing
  membrane (torn, it cannot fly: the clean grounding blow), the throat, and the keel, which is also
  the prize. Natural armor: scaled legs and back; the membrane is thin skin.
  - ⭐ **What cuts it** (the counterplay the field guide teaches): drain it with repeated launches;
    fight it beyond its field, where it cannot recharge; tear the membrane; or touch a grounded
    doped-iron blade to the gland (cold iron, the spellbook's § 5a "a path to ground").
- **People and it** — Shepherds count losses by the season. A bounty is common. *Realm-lore
  suggestion:* the old wyvern-towns are where the strong fields are, so a heraldic wyvern on a
  town's arms marks good ground, and prospectors read heraldry.
- **What it yields** — Meat (dark flight muscle), hide, and a membrane leather (light and fine).
  ⭐ **The keel is a true store**, a device-grade stone the size of a shield. It is why wyverns are
  hunted and why they are rare, since **killing one by cleaving the chest cracks the store**. Damage
  shapes the yield, the perfect-pelt rule at its sharpest. The flight gland is a **reagent**: it rots.
  Venom is milked from the sting.
- **The binding** — None. This is a store-and-conduit adapted organ. **What is held:** charge in the
  keel. **What pays:** the eyrie's field, by residence. **What cuts it:** leaving the field (Voss
  decay), spending it (forced launches), and grounding the conduit.

**What the model must express**

- ⚠ A plan composed as head + torso + **wing pair (as the forelimb module)** + leg pair + tail,
  the first plan where one limb pair *serves* both walking and flying.
- ❌ GAP: **flight derived from anatomy.** Wing loading, power required against power available,
  take-off as the limit. `fly` has no host (`Flyable` composes nothing; `fly.yaml` is held) and no
  species flies. The arithmetic above has no code to run in.
- ⚠ Integument per part: scale on legs and back, **membrane** on wings (a new integument kind), with
  the torn membrane as a part wound that costs the flight capacity ✅ (the function axis does the
  rest once flight is a capacity). ❌ GAP: **flight** as a `BODY_CAPACITY`.
- ⚠ The keel as a part whose tissue is a **storing** material (bone plus a biomineral). ⚠ The gland
  as an organ that **draws a reserve into muscle work**.
- ⚠ A sting organ that **produces** venom into a reserve; toxin burden ✅, bleeding ✅.
- ❌ GAP (mana pack, unbuilt): residence charge in a body part, leakage, and **mana paying for
  mechanical work at η** inside a body, as distinct from a spell.
- ❌ GAP: **stoop / aerial attack from height** in combat (ranged bands ✅ exist; an attacker
  entering from the air does not).
- ❌ GAP (slated): vital zones, creature act-reading, the field-strength danger map.

---

### Basilisk (the cockatrice) *(INVENTED biology over classical and medieval folklore — adapted)* — /stuff/idea/species/animalia/chordata/reptilia/squamata/serpentes/visoserpentidae/visoserpens/cyrenaicus *(family and genus invented; `Basiliscus` is taken by the real basilisk lizards, and `Regulus` by the goldcrest)*

- **Quadrant · class** — fantasy · not a person · **adapted**.
- **What it is** — *Source tradition:* **Pliny the Elder**, *Natural History* VIII, describes a small
  serpent of Cyrenaica, "not more than twelve fingers long", with a white mark like a diadem. Its
  breath scorches grass and splits stones, its venom runs up a rider's spear to kill the horse, and
  only the **weasel**'s effluvium kills it. **Isidore of Seville** names it *regulus*, the little king.
  The medieval **bestiaries** add the killing gaze and the **cockatrice**, hatched from a cock's egg
  brooded by a toad or serpent, and the **mirror** that turns its gaze on itself (the Vienna basilisk
  of the Schönlaterngasse, about 1212, is killed this way in legend). Two real events show people
  believed it: a rooster was **tried and burned at Basel in 1474** for laying an egg, and the
  twelfth-century monk Theophilus gives a recipe for "Spanish gold" from basilisk ash (both as
  recorded; I'm fairly but not fully sure of the details). The real basis of the "cock's egg" is
  yolkless "wind eggs" and **hens that change sex** after ovarian damage and begin to crow.
- **Our animal** — A slender viper-like snake of 0.6–1 m and about 1 kg, with a pale crown scale
  and large forward-set eyes. The invention is two organs, both labeled:
  1. **The patterning eye** (invented). A layer behind the retina that couples mana into a *pattern*
     carried on the light the eye reflects. The pattern acts **through the victim's own vision**: it is
     the Sense-and-Control act the Reeve Line already describes, and it holds the motor pattern of
     whoever **resolves its eyes**. The victim goes rigid: catalepsy, not stone. *That is where the
     statues come from:* travelers found locked rigid in the sun, who died of heat and thirst and
     were found in rigor.
  2. **Venom** (a real-world kind): a neurotoxic bite, and like the real **spitting cobras** it can
     spray venom at the eyes from 2–3 m. Protecting your eyes counters both of its weapons.
- ⭐ **The gaze translated into honest mechanism**:
  - **It needs light and a resolved image.** In darkness it is harmless until you light a lamp (light
    ✅). The victim must *resolve* the eyes. A 1 cm eye subtends the eye's ~1 arcminute acuity at
    about **35 m**, so the gaze has a range set by optics. ⭐ **A spyglass extends it**: a ×8 glass
    makes the basilisk deadly at about 280 m, the derivable trap.
  - **Averting your eyes** means seeing it only in peripheral vision, which is low-acuity and never
    resolves the eyes. You know roughly where it is, so you can aim at the *body* only, and your
    read of it fogs thick. This is the bestiary slate's § 12 row, now with a reason.
  - **A mirror** relays the image, and with it the pattern. Turned toward it, the basilisk resolves
    its own eyes, and the pattern loops into its own nervous system and freezes it: the legend's kill,
    as a self-hold. The relay is attenuated by reflectivity: a silvered mirror about 95 %, polished
    bronze about 60 %, still water a few percent, so a puddle is no defense. Silvered glass dates from
    the 1830s; before that mirrors were tin-mercury amalgam (about 70 %).
  - **It is a binding, so it costs per second.** The basilisk pays from its **own small reserve**, and
    the cost scales with the victim's **composure** (the Reeve Line ✅, `magic.composure.floorFactor`).
    A mouse freezes for minutes. A rested, fed adult human freezes for **seconds**, and a tired or
    starving one for longer. Seconds are enough for the bite. So the folklore "it kills with a look" is
    an honest exaggeration of "it holds you while it bites."
  - **The weasel**: mongooses, and some mustelids such as the honey badger, really do carry receptor
    mutations that resist snake α-neurotoxins. Pliny's enemy is a real snake-killer, translated
    exactly. (The **cock's crow** that kills it in the bestiaries is *suggested* as a sudden loud noise
    that breaks its fixation, since the hold needs its attention. That is weaker; an author may drop
    it.)
- **Where it lives** — Hot, dry, stony ground in **strong fields**: ruins, wells and cisterns over
  rich ground (the city-well legends). It hunts at dusk and dawn, when light is low but sufficient.
- **How it behaves** — An ambusher. It freezes prey, then bites. It defends with the spit before the
  gaze. It flees from large animals that aren't looking at it.
- **The encounter** — It sees you, and it can only hold you if you **look back**. Bowing your head,
  backing off with eyes down, and covering a lamp are all correct. Staring is wrong, and so is
  approaching to "get a look". Killing it from beyond 35 m with no glass, with a sling or a bow, is the
  hunter's answer.
- **If it fights** — It bends **the fog** (you fight averted, reading little) and **tempo** (a frozen
  second is an opening it cashes with the bite). Vital zones: the head, which you cannot aim at while
  averted. The counterplay: a **mirror shield** (it costs a hand slot ✅, the Perseus trade), a hood or
  sack thrown over it, darkness, distance, gloves and eye-guards against the spit, a mongoose or
  ferret. It quits by fleeing into a crack.
- **People and it** — Smashing yolkless eggs, and killing a crowing hen. *Realm-lore suggestion:* a
  town over a strong field keeps a **well-warden** with a mirror on a pole and a ferret.
- **What it yields** — The eyes are a **reagent** (tissue, so they rot and the charge leaks), sought
  for patterning work. Venom is milked like a cobra's. The skin is small and fine. Its ash is
  alchemical folklore only and does nothing.
- **The binding** — **What is held:** the victim's motor pattern (a Control binding on another body).
  **What pays:** the basilisk's own reserve, per second, topped up by the field it lives in. **What
  cuts it:** breaking line of sight (closing your eyes, a cover, darkness), its attention (noise), its
  reserve running dry, a mirror closing the loop on itself, and the victim's composure outlasting it.

**What the model must express**

- ✅ A serpent body (⚠ no `serpent` plan ships; a plan composed of head + an elongate torso as a
  tail module), with vision and touch ports and venom.
- ❌ GAP (slated, bestiary § 5.2): **looking as a harm channel**. The attack enters through the
  *victim's* vision and gates on light ✅, sight-line ✅ (perceives), and **angular resolution**, which
  has no model.
- ❌ GAP: **optics of relay**: a mirror (reflectivity), a spyglass (magnification) and peripheral
  vision. Vision is a yes/no perception today, not an acuity.
- ❌ GAP: **averting your gaze** as an act (a posture of the eyes) that removes your vision of one
  target while keeping awareness, and thickens the combat fog for that opponent.
- ❌ GAP: a **condition held by a binding** (paralysis that lapses the moment its holder's line or
  reserve is cut) rather than one that progresses on its own clock.
- ✅ The Reeve Line composure against the victim's live reserve. ✅ The hand-slot economy for the
  mirror shield.
- ⚠ Eyes as **parts that sense and produce** (the patterning layer), so blinding it, or blinding
  yourself, costs a capacity on the function axis. ❌ GAP: no eye part exists on any shipped plan;
  sensory ports are not attached to parts.
- ⚠ Spat venom at the eyes, through the ranged splash ✅ and a target part (the eyes) that does not
  exist.
- ⚠ Per-species **toxin resistance** (the mongoose), on metabolism's shipped toxin burden ✅.

---


Five creatures from bestiary-slate § 13's families: the regenerator (troll), the cursed (werewolf),
the relict (leshy), the specter (noonwraith) and the vampire. Each answers **what is held · what pays
(a mana draw) · what cuts it**, and each answer comes from § 13's table. Folklore sources are named.
Anything I suggest as realm lore is labeled **(realm suggestion)**.

> **Attribution.** The troll's regeneration-with-a-stopper mechanic comes from the *System Reference
> Document 5.1* ("SRD 5.1") by Wizards of the Coast LLC, available at
> https://dnd.wizards.com/resources/systems-reference-document, licensed under CC-BY-4.0. Only the
> mechanic (wounds close unless fire or acid dealt them; keen smell) is used here. No statistics,
> text or product identity are taken.

---

### Troll — suggested species path `/stuff/agent/species/troll` (a base row in a shared folklore pack; § 14)

- **Quadrant · class** — fantasy × person · **bound** (a regenerator)
- **What it is** — The troll of **Scandinavian folklore** (Old Norse *troll*, *jötnar*; the Norwegian
  tales collected by Asbjørnsen and Moe, 1840s): big, ugly, strong, slow-witted, a cave and mountain
  dweller that comes out at night, steals livestock and sometimes children, and is usually beaten by
  wit rather than strength. Askeladden's *eating match* with a troll is the tale we use most. From the
  **D&D SRD** comes the mechanic that defines the modern troll: its wounds close unless fire or acid
  dealt them. Folklore also has trolls **turning to stone at sunrise**. We leave that out of this base
  row. Turning flesh to stone is an element change, which arcane science prices out of reach. The
  honest reading is that people point at troll-shaped glacial erratics and tell that story about them
  (true of the real Scandinavian landscape). A Tolkien-style stone troll can extend this row.
- **Where it lives** — Fells, scree, high forest and caves above the treeline, in **strong fields
  only** (see the binding). It is mostly nocturnal and lies up by day in a cave or under an overhang.
  It is active all year, but in winter it eats livestock because there is little else.
- **How it behaves** — Its first drive is **appetite**. It forages by smell along any trail that
  carries a carcass, a byre or a midden. It is solitary or lives as a pair, is territorial about its
  den, and is not hostile on sight: it is a person who wants your food, your goat, or you if you are
  the food on offer. It talks, bargains badly and can be tricked. Its morale is good while its wounds
  are closing and breaks quickly once they stop closing, because it knows what fire means.
- **The encounter** — It **notices by smell** first (SRD: keen smell) and by sight poorly. In the
  Norwegian tale *The Boys who Met the Trolls in the Hedale Wood*, three trolls share one eye, so
  folklore agrees its sight is bad. To size you up it asks one question: are you carrying food or
  meat? **Throwing food** works, and a troll will stop to eat. **Fire** in hand is the strongest
  display you can make: a troll that sees a torch weighs the cost before it commits. **Talking**
  opens bargaining. **Running** says you are prey, and it is faster than you on a slope. **Standing
  still** says nothing, because it is smelling you, not watching you. The folk advice is to keep
  meat and fire with you, travel by day, and never camp downwind of a cave.
- **If it fights** — It works three levers: **mass** (about 2.5–2.8 m and 250–400 kg; a square-cube
  biped needs heavy bones and accelerates slowly), **reach**, and **its cap climbing back**. A wound
  that is not burned or dissolved loses its poise ceiling within beats, so a long fight favors the
  troll. Its natural armor is a thick hide (the `hide` form) that turns a glancing edge. Its vital
  zones are the ordinary biped ones (head, heart, spine); the regeneration does not make them less
  vital, it only gives the troll time. **The key move is a torch to the wound you just made.** It
  quits when its wounds stop closing: it flees to its den to eat and heal, and the second fight is
  there.
- **People and it** — Villagers in troll country keep **fire at the byre door**. They leave the
  last-slaughtered offal out on the boundary stone, which works because it feeds the troll elsewhere.
  Since a troll is a person, killing one is a killing: a realm decides whether it is murder, outlawry
  or bounty (lens 7). **(Realm suggestion:)** an eating-match custom, in which a troll can be
  bargained off a farm by out-eating it. Askeladden cheated with a hidden knapsack, and the trick is
  still told.
- **What it yields** — Hide, bone and fat. Because it is an apex omnivore in a strong field, **its
  tissue is richly charged** (biomagnification, Part 11c). Its fat is a poor store (dielectric 2–3)
  but good eating for a caster. ⚠ If the troll is a person, eating it is a crime almost everywhere.
  **Damage shapes the yield badly**: the stopper is fire or acid, and both ruin the hide. A skilled
  hunter burns **only the killing wound** and keeps the rest of the pelt.
- **The binding** — **Held:** the body's form, regrown toward its own template. **Pays:** *its own
  food*, on two ledgers. The **mass** of regrown tissue comes from digestion and its `lean`/`protein`
  stocks: a lost forearm is about 2% of body mass, roughly 6 kg of tissue that has to be eaten. The
  binding's **upkeep in mana** comes from the charge in that food. A well-fed troll in a weak field
  still cannot heal, which is why trolls live only where fields are strong. Starve one and it cannot
  heal. **Cuts:** **fire or acid** destroy the living tissue the binding regrows from, so a burned or
  dissolved wound heals at an ordinary rate. Nothing about the troll is immune; it is only slow to
  stay hurt.
- **What the model must express**
  - ✅ a large biped as `biped` shares × `baseMass` + `stature`; keen smell as a `smell` port with
    acuity on the Species
  - ✅ `hide` natural armor on the covering grid · ⚠ as the torso and limb **integument** of the part
    modules
  - ✅ `burn` trauma (heat channel) · ⚠ `caustic` trauma (the corrosion channel is shipped, its trauma
    behavior is reserved)
  - ⚠ regeneration as a per-wound **convalescence factor `k`** (recovery build ✅) set very high by
    the binding and reverting to ordinary for wounds whose *channel* was `heat` or `corrosion`
  - ⚠ regrowth that **spends** the digestion buffer and `lean`/`protein` (metabolism and exertion
    stocks ✅) in proportion to the tissue mass regrown
  - ⚠ a mana charge on the body from charged food (Part 11c), drawn per second by the binding
  - ⚠ the rescuable `dying` clock (✅) rescued by the binding unless the killing wounds are burned
    (this reproduces the SRD's "dies only if it doesn't regenerate")
  - ❌ GAP: **regrowing a severed part** — `severPart` is the only writer of `missing`, and nothing
    ever clears it
  - ❌ GAP: **a creature-held binding** — a sustained state whose upkeep is drawn from the *host's own*
    food or reserve rather than a caster's (magic's sustained effects are caster-paid)
  - ⚠ brain: appetite drive, smell-led notice, food-throw and torch readings, flee-to-den at morale
    break
  - ⚠ butchery reading the burn sites to grade the hide

---

### Lycanthropy (the curse) — suggested condition path `/stuff/idea/condition/lycanthropy`

A curse is a **condition on any body** (§ 15). The werewolf entry below is the afflicted, and this is
the curse itself.

- **Routes (from folklore, not film)** — European folklore rarely spreads it by bite; bite
  transmission is mostly a twentieth-century film invention (*The Wolf Man*, 1941) that NetHack
  took up. The folk routes map onto disease-slate's `ContagionSpec`. **Waterborne:** drinking
  rainwater from a wolf's pawprint (German and Slavic belief). **Fomite:** putting on a
  **wolfskin belt or strap** (the German *Wolfsgürtel*, Scandinavian *úlfheðnar*). **Imposed:** a
  curse laid by a sorcerer, or one born of excommunication or birth on an ill-omened night.
  **(Realm suggestion:)** the bite as a fourth route, rare and deliberate. If a realm wants it, it is
  the contact route.
- **Course** — Latent and **silent**, as `ContaminableMixin` is: no sense reports it. Its first
  signs are hunger and fatigue (the host's reserve is paying), then it **manifests on the full moon**.
- **Treatment** — It can be **lifted** (dispel, by a caster) or **grounded** with silver (see the
  werewolf). It can be detected by assay. Folklore also has calling the werewolf by its Christian
  name, or striking it on the forehead to draw blood, as cures. **(Realm suggestion:)** these become
  rituals a realm's people believe in. The engine only honors the ones with a mechanism.

### Werewolf — suggested species path: none (a person of any species under `lycanthropy`)

- **Quadrant · class** — fantasy × person · **bound** (the cursed)
- **What it is** — **European folklore**: Greek Lycaon (Ovid's *Metamorphoses*), Marie de France's
  *Bisclavret* (12th c., a baron who must hide his clothes to return to human form), the Slavic
  *vlkodlak* / *wilkołak*, and the Livonian Thiess of Kaltenbrun (trial of 1692, a self-declared
  "hound of God"). Its core is **a person by day and a wolf-shaped beast at the full moon**, with
  wounds that close unless silver dealt them and a curse that can be lifted.
- **Where it lives** — Wherever its human lives: in a village, as somebody's neighbor. The curse
  binds harder and the change comes on more fully in strong fields.
- **How it behaves** — By day it is the person: tired, hungry and secretive. On the full moon it
  becomes a very large wolf, and **mass is conserved**: a 70 kg man is a 70 kg wolf, at the top of
  the real range (grey wolves are 30–80 kg). An NPC werewolf runs a predator's brain. ⚠ **A player's
  never seizes the decision** (combat's morale rule): the curse changes the body, the senses and the
  hunger, and the player still chooses. It ranges widely, hunts livestock, and comes home at dawn
  exhausted.
- **The encounter** — Real wolf safety lore applies first: **never run**, stand tall, back away,
  group up. Its tell is a wolf that is too big and alone (real wolves are pack animals, so a lone
  outsized wolf in a village at the full moon is wrong). **Fire** deters it as it deters any wolf.
  **Talking** does nothing to the beast, but the person may be reached the next day.
- **If it fights** — It is wolf-fast, uses a bite at the throat and limbs, works **tempo** and the
  **cap climbing back**, and is paid for by the host's food. Its vital zones are a quadruped's. It
  quits like a predator, once you cost more than you are worth, and is gone by dawn. ⭐ The folklore
  **repercussion** motif (wound the wolf, and next day a neighbor has the same wound) falls out of
  the model for free: **it is the same body, so the wound stays**. That makes the hunt an
  investigation.
- **People and it** — Villages suspect the lonely, the hungry and the unlucky (lens 7: an
  accusation judges a PERSON, so the criterion, the appeal and the entrenchment tier must be named).
  A family hides its afflicted.
- **What it yields** — **Nothing you may take**: it is a person. A wolfskin belt found on a body is
  evidence and a route.
- **The binding** — **Held:** a **second form laid on the person**, a wolf template, plus a trigger
  keyed to the full moon. **(Realm suggestion:)** the moon does nothing physical (moonlight is under
  0.3 lux, and its tide on a body is negligible). The moon is the curse-maker's chosen clock, the way
  a rune fires on a verb an item already affords. **Pays:** the **host's own reserve and food**, so
  the cursed are always hungry and tired, and the change itself is a heavy exertion. **Cuts:** lifting
  it (dispel), or **silver**, the best ward conductor. A silver-dealt wound grounds the binding at
  that wound, so it heals at an ordinary rate. ⚠ The silver bullet is late folklore (19th century);
  older tradition favors naming or drawing blood.
- ⚠ **The tension, stated:** reshaping a living body is the *Transform of a living body* that
  arcane-science calls prohibitive. Part 7's finding narrows that to element change. A
  mass-conserving rearrangement is chemical-band, and the curse carries the specification as a
  template, so it is priced and not forbidden (11a). This needs a ruling.
- **What the model must express**
  - ✅ `CelestialApi.atNextFullMoon` as the trigger clock
  - ⚠ `lycanthropy` as a Kind A condition with a `ContagionSpec` (disease-slate: waterborne, fomite,
    imposed)
  - ❌ GAP: **a condition that swaps a live body's BodyPlan and Species** (biped ↔ quadruped,
    mass-conserving) while keeping one instance, its vitals and its identity
  - ❌ GAP: **trauma-site mapping between body plans** (a wound on `body.arm.left` must become the
    foreleg and come back), which is what makes the repercussion tell work
  - ❌ GAP: what happens to **worn and held items** at a forced change (Bisclavret's clothes)
  - ⚠ the regeneration `k` as for the troll, with the stopper keyed on the wounding **material**
    (silver) rather than the channel
  - ❌ GAP: **a ward-conduction property** that a contact material carries into a wound (silver
    first, doped iron second). Suppression today is a location field only
  - ⚠ an NPC brain overlay while changed · ⚠ values: the compulsion gate for a cursed player
  - ⚠ an assay `Reading` row for the latent curse

---

### Leshy — suggested path `/stuff/agent/spirit/leshy` (the bodiless root, § 15)

- **Quadrant · class** — fantasy × person · **bound** (a relict)
- **What it is** — The **Slavic forest spirit** (Russian *leshy* / *lesovik*, Polish *borowy*), lord
  of a particular wood. In the tales it is **as tall as the tallest tree in the forest and no taller
  than the grass in a meadow**. It casts no shadow, wears its clothes inside out and its boots on the
  wrong feet, laughs and whistles, and **leads travelers in circles**. Shepherds make pacts with it,
  and leshies gamble with each other and pay in herds of squirrels and hares. It vanishes in late
  autumn (St. Erofei's day, 17 October, in the Russian calendar) and returns in spring. Slavic folk
  belief is still held by some rural communities and modern revivals, so treat it as somebody's
  heritage, not a joke.
- **Where it lives** — In one wood, a forestry `Wood` place with its stand, and **only there**. It is
  active in the growing season.
- **How it behaves** — It is a person and a landlord. It protects the wood's animals and trees,
  tolerates those who take modestly and pay respect, and punishes those who clear or mock. It plays
  tricks before it does harm.
- **The encounter** — You rarely see it first. The tells are **the path that brings you back to the
  same stump**, laughter with no source, a wind in still trees, an old man with a mossy beard who
  answers too well. The folk counter is to **turn your clothes inside out and swap your boots**.
  **(Realm suggestion:)** the ritual works because it makes you stop and attend to yourself, and
  attention erodes a veil (Voss Decay). Any act of close attention (stopping, `search`, retracing on
  the map) helps, and the ritual is the people's form of it. Bread and salt left on a stump open
  **talking**, and this being talks first.
- **If it fights** — It hardly ever does. It has no body to strike while it is unmanifest. Its levers
  are **the fog** (it is a Sense-domain semblance) and **footing**, by leading you off the path into
  bog and windfall. You cannot win by force while its anchor lives.
- **People and it** — Foresters and charcoal-burners leave offerings and fell in measure. ⭐ **The
  leshy is the wood's defender against overcutting**, so it sits in forestry's economy: clearance is
  an ecological, economic and political act at once (lens 6, 7). **(Realm suggestion:)** a pact
  register, in which a village's woodcutting quota is the leshy's bargain.
- **What it yields** — Nothing from the spirit itself. Its **anchor tree's heartwood** is the most
  charged timber in the realm (decades of residence, 11c), and felling it is the one way to kill the
  leshy. Wealth and murder in one act.
- **The binding** — **Held:** a **presence (a semblance) spread through the wood**, presented at the
  height of the cover around it. **Pays:** **the place**: the wood's charge, drawn through its living
  stems. **Why it cannot leave:** past the treeline its inflow stops and it lives on what it holds,
  with `t = E/λ`. So it can step to a meadow's edge, but only as tall as the grass, which is how
  folklore describes it. Its height is its budget. In winter the stand is dormant, the draw falls,
  and it sleeps. **Cuts:** **destroy its anchor** (the bound tree, § 4) and the binding lapses.
  Clearing the stand starves it slowly. A ward suppresses it.
- **What the model must express**
  - ❌ GAP: **the bodiless root** — a being whose identity is its binding, with personhood and no
    Species body (§ 15). Clades today are `animalia` · `plantae` · `fungi` · `constructa`
  - ✅ `Wood` + `StandMixin` `standing`/`capacity` · ⚠ its draw as a function of `standing` × the
    place's field
  - ✅ veil as an imposed `Disguisable` semblance · ⚠ its presented height derived from the cover
  - ❌ GAP: **leading astray** — a belief write or location-graph overlay (spellbook § 7 names both
    as unbuilt kernel Apis)
  - ⚠ attention as Voss λ for a veil (written into arcane-science; I found no code that counts
    observers)
  - ⚠ a binding **anchored to an object** that lapses at that object's destruct (the `onDestruct`
    witness ✅ is the hook)
  - ✅ seasons and the growing model · ⚠ dormancy coupled to its draw
  - ✅ `talk` dialogue for the bargain · ✅ suppression (`Location.suppressesMagic`) as the ward

---

### Noonwraith (*poludnica*) — suggested path `/stuff/agent/spirit/poludnica`

- **Quadrant · class** — fantasy × person · **bound** (a specter)
- **What it is** — The **Slavic Lady Midday** (Polish *południca*, Czech *polednice*, Russian
  *poludnitsa*, Sorbian *připołdnica*): a woman in white, sometimes carrying a sickle, who appears
  **at noon in the fields at harvest**. She stops reapers with questions or a challenge to talk, and
  punishes a wrong answer or work at noon with a twisted neck, madness, a crushing headache or death.
  She guards the grain and is used to frighten children out of the rye. Erben's ballad *Polednice*
  (*Kytice*, 1853) and Dvořák's tone poem after it are the best-known tellings. Folklorists read her
  as **sunstroke** personified, and we keep that.
- **Where it lives** — Open grain fields in high summer, between about noon and one in the afternoon.
  It needs a moderate field and a place nobody is watching.
- **How it behaves** — It tests and punishes. It does not hunt.
- **The encounter** — The tells are a **dust devil** walking the stubble on a still, hot noon (a real
  convective vortex, and in Slavic belief whirlwinds carry spirits), glare and shimmer, a figure at
  the edge of sight. It speaks to someone **alone**. The counters come from folklore and are honest:
  **don't work alone at noon**, rest in shade, drink, and if she speaks, **answer and keep her talking
  until the hour passes**.
- **If it fights** — It has no body to wound. Its levers are **the fog** and **your reserve**. Glare
  thickens your read. Exertion and dehydration drain your reserve, which by the **Reeve Line** lowers
  your composure, so she patterns you more easily (dread, confusion). The harm that kills is real
  hyperthermia from reaping on. **Made to manifest**, it is a spinning column of air and chaff: you
  can scatter it, and you cannot wound it.
- **People and it** — A noon rest is custom and law (lens 7), and children stay out of the fields.
  ⭐ The folk rule and the public-health rule are the same rule.
- **What it yields** — Nothing.
- **The binding** — **Held:** **a semblance with no body** (Sense), and when it manifests, a held
  vortex (Control·Air: convection supplies the energy, and the binding only holds the shape).
  **Pays:** **the place** it haunts, the field's charge. **Why noon:** a veil's upkeep rises with
  attention, and at harvest noon each reaper is alone, head down and glare-blind. **Nobody is looking,
  so it is cheapest to hold.** **Cuts:** **attention**: questions answered, watching it, company. The
  hour ending as people come back to the field. A ward.
- **What the model must express**
  - ❌ GAP: **the bodiless root** (as the leshy)
  - ✅ solar altitude and season (`CelestialApi`) · ✅ hyperthermia (thermal) · ✅ dehydration
    (metabolism) · ✅ composure affine in reserve (the Reeve Line) · ✅ dread as a staged mental
    condition
  - ❌ GAP: **a local convective vortex** — the weather field is stateless and has no dust devil to
    hold
  - ❌ GAP: **what makes a spirit manifest** (bestiary § 17.1, open) — semblance to perceivable
    presence
  - ⚠ attention as a veil's λ, counted per observer and per act (talking, watching)
  - ✅ `talk` and dialogue trees for the questions

---

### Vampirism (the curse) — suggested condition path `/stuff/idea/condition/vampirism`

- **Routes** — In Balkan accounts (Arnold Paole, Serbia, 1726–32) **those a vampire fed on died and
  rose in their turn**, and so did people who ate meat from cattle it had fed on. That is a
  **blood-borne and foodborne** `ContagionSpec`. Other folk causes include improper burial, suicide,
  excommunication, and an animal jumping over the corpse. **(Realm suggestion:)** treat those as
  *imposed* routes.
- **Course** — ⭐ **Latent in the living and silent.** It does nothing except a faint draw on the
  host's reserve **until the host dies. Then it catches the death**, and the body never becomes a
  corpse.
- **Treatment** — Dispel while latent. Assay can detect it. After death, see below.

### Vampire (Slavic/Balkan) — any species under `vampirism`, never a species of its own

- **Quadrant · class** — fantasy × person · **bound** (a vampire)
- **What it is** — The **folklore** revenant (East Slavic *upyr*, Polish *upiór*, Serbian *vampir*,
  Greek *vrykolakas*), not a film's. It has **no sunlight death, bats, coffin rule or invitation**.
  It is a dead person who comes back to its family and village. It is ruddy and **bloated**, with
  blood at the mouth and nails that look grown. It presses on sleepers, drinks blood, and brings a
  run of deaths. ⭐ Paul Barber (*Vampires, Burial, and Death*, 1988) shows that these signs are
  **ordinary decomposition**: bloat gas, purge fluid, skin slip that exposes "new skin". The dead
  that villagers exhumed and "found" were mostly ordinary corpses. In our world the real ones also
  exist, which makes the vampire a **forensic** puzzle.
- **Where it lives** — In its own village, near its grave and its kin. It feeds more in summer (see
  the binding).
- **How it behaves** — It is a **person** with an appetite. It talks, returns home and visits a
  spouse (Balkan tales give it children, the *dhampir*). The best outcome may not be a fight (§ 12).
- **The encounter** — The tells are a death that "didn't take", a pallor and a cold with no pulse or
  breath, a run of anemic, exhausted sleepers. **Talking** works. Garlic, poppy seeds and millet are
  **folk belief**. **(Realm suggestion:)** the engine honors only the ones with a mechanism.
- **If it fights** — It is as strong as the body it holds and **closes its wounds** while it has
  blood to spend. It does not tire as a living body does (no wind) and shrugs off pain. It quits like
  a person and parleys.
- **People and it** — The folk response is a **public-health act**: exhume, stake, behead and burn.
  It is archaeologically real: the 17th-century Drawsko, Poland burials have **iron sickles across
  the neck**. Lens 7: it judges a person, sometimes an innocent dead one. **(Realm suggestion:)** a
  doped-iron sickle really grounds the binding and an ordinary one does not. That explains the
  custom: people over-generalized from the expensive real thing.
- **What it yields** — Nothing you may take: it is a person. The blood in it is its victims'.
- **The binding** — **Held:** **the body away from death**. The equilibrium it holds off is
  **decomposition**, which pushes back hard, warmer means faster (spoilage's Arrhenius rate), so the
  upkeep is dear and higher in summer. This is why vampires feed. **Pays:** ⭐ **other people's
  blood. The blood carries the victim's charge**: blood is mostly water (dielectric about 80), a good
  store, so it is both fuel and battery. The body runs on that charge, not on metabolism. Banked
  units work but **leak as they lose freshness** (blood.md), so fresh blood from a living donor is
  worth the most. **Cuts:** **starvation** (no blood, and the binding lapses, after which the body
  simply resumes decomposing at the real rate from the day it died: no dust, no instant rot). A ward
  or silver. **Fire** (it destroys the body the binding holds). The stake only pins the body while the
  real work is done.
- **What the model must express**
  - ❌ GAP: **a condition that intercepts `ConditionApi.die`**, holding the body from becoming a
    corpse
  - ❌ GAP: **an embodied undead** — animate and not alive, with material verbs allowed. The shade is
    bodiless (`requiresEmbodied`), and the corpse is a Thing that "never gets agency back"
  - ❌ GAP: **a body run on stored charge instead of metabolism** (no pulse, no breath, no wind;
    `respires: false` ✅ exists for one piece of this)
  - ⚠ a **charge on `BloodUnit`** whose leak follows its freshness (✅ freshness and units ship)
  - ✅ `bloodVolume` drawn from a victim · ✅ ingesting blood · ⚠ a feeding bite as a natural attack
  - ⚠ the body's own microbial load as the binding's λ (spoilage ✅ on Provision; on a body it is the
    decomposition slate)
  - ⚠ regeneration `k` paid from the blood store
  - ⚠ vampirism as a latent, sense-silent Kind A condition (`ContaminableMixin` ✅ precedent) with a
    `ContagionSpec`
  - ❌ GAP (shared): the ward-conduction property (silver, doped iron), as for the werewolf

---

### Cross-cutting, for whoever reads all three batches

- ❌ GAP: **a capability pack cannot ship a condition row**. `ConditionCatalogue.warm()` selects by
  the kernel class at a fixed prefix (vitals.md). Lycanthropy and vampirism in a folklore pack need
  this fixed.
- ⚠ No **silver** material row exists yet (the element roster has no Ag). The substrate is there
  (`electricalConductivity` ✅), so this is content, not a gap.

---


Six entries: the golem, the gelatinous cube, a giant spider, the hydra, the kappa, the bandit.
Tags in "What the model must express": ✅ exists · ⚠ proposed (capability-from-anatomy model, or
designed in a slate but unbuilt) · ❌ GAP (nowhere to land).

---

### Golem — suggested species path `/stuff/agent/species/constructa/argilla/golem`

- **Quadrant · class** — fantasy · not a person · **made** (built and bound). Sentience: none.
  It cannot suffer, and the tradition itself says so.
- **What it is** — Jewish folklore, with a long written history. The Talmud (Sanhedrin 65b) tells
  of Rava making a man and sending it to Rabbi Zeira, who spoke to it. It did not answer, and he
  said: *"You are from the magicians; return to your dust."* The point of the story is
  **muteness**: people can make a body, but they cannot make speech or a soul. The medieval
  Ashkenazi pietists (Eleazar of Worms) wrote down the making as a contemplative exercise on the
  letters of the *Sefer Yetzirah*. Jacob Grimm (1808) recorded a Polish golem with *emet*
  ("truth") written on its forehead. It grew every day. Its maker could no longer reach its brow,
  so he ordered it to bend and pull off his boots, and he erased the first letter so the word
  read *met*, "dead". The clay collapsed on him. The Prague golem of Rabbi Judah Loew (the
  Maharal) is a **19th-century attribution**, popularized by Yudl Rosenberg in 1909. In that
  version the golem protects the ghetto against the blood libel, and it lies in the attic of the
  Old-New Synagogue. *Golem* (Psalm 139:16) means "unformed".
  - ⚠ **Respect.** The making is a holy act in the tradition, and it uses the divine Name.
    **Do not make the Name a game spell.** An author should translate the structure, not the
    sacred text: the word is the golem's **specification** (mana pack § 11e's third role, the
    rune), cut with `carve`/`impress` into its brow. Never render the blood libel as content.
    Never write "the Jewish monster": in the tradition the golem is a servant and a protector,
    and its danger is its maker's hubris.
- **Where it lives** — wherever its maker put it: a workshop, a gate, an attic. It needs no
  field to *be*, but it needs one to *run* (see the binding). The danger map: golems are found
  where a binder could afford one.
- **How it behaves** — it has no drives, only orders. It obeys literally and does not stop: the
  folk motif of the golem fetching water until the house floods (versions differ; I could not pin
  down the earliest source). It has no flight distance and no morale. It never tires and never
  sleeps. In some versions the maker rests it on the Sabbath eve by removing the Name.
- **The encounter** — it does not "notice" you as prey. It checks you against its order (*"let no
  one through this gate"*). Running, looming, fire and food mean nothing to it. Standing outside
  its order's scope means everything: if you are not what it was told to stop, it ignores you.
  ⭐ **Words are the encounter.** It obeys its binder, and Grimm's maker beat his own golem by
  *giving it an order* that brought its brow within reach. A stranger cannot command it, but a
  stranger who knows the order can step around it.
- **If it fights** — mass erodes footing, like the bear: you cannot parry ~150 kg of clay (a
  1.8 m figure of wet clay at ρ ≈ 1.8–2.0 g/cm³; the growing golem is far more). Its reach is a
  man's. It has **no fog to read**: it makes no feint and gives no tell beyond its orders. It is
  never gassed. Its armor is its material. Wet, unfired clay is plastic: an edge cuts a groove,
  the body loses mass, and nothing "bleeds". Dry clay is brittle, so blunt blows crack it. A golem
  that has been **fired** is ceramic, harder still, and shatters. ⭐ **The only vital zone is the
  word.** It has no heart, lungs or brain. Wounds cost capacity only as **lost material** (a leg
  cracked through does not bear weight). It does not quit. It stops when the word is cut, or when
  its store runs dry.
- **People and it** — under halakha a golem is not a person (Rabbi Tzvi Ashkenazi ruled that it
  cannot count toward a minyan) and destroying one is not murder. The bestiary's personhood
  property agrees. Making one is presumption, and the maker answers for what it does: the
  accountability ledger's PERSON/PARTY rule already puts blame on whoever answers for an agent.
  *Realm-lore suggestion:* a scribes' guild that writes gate-wards. The guild is licensed because
  an unlicensed golem's harm is laid at its writer's door.
- **What it yields** — clay (it returns to its dust), the store stone if it has one, and the
  inscribed brow-tablet (evidence of who wrote it: provenance). **Mana:** wet clay holds charge
  through its water (ε ≈ 80), so a golem kept wet holds far more than one left to dry. ⭐ A
  drying golem slows as its capacity falls, and the legend's river mud is the right material.
  Fired clay holds little.
- **The binding** — **held:** obedience (Control), plus the form standing up and moving with no
  muscle. **Pays:** a stored charge (a stone set in the mouth or chest), topped up by its binder
  or the place's field. **Cuts it:** erasing the word (one letter is enough, the legend's own
  counter). Draining the store to ground through a doped "cold" iron blade driven into the body
  also works. ⭐ Taking it out of its field starves it slowly.
- **What the model must express**
  - ✅ `constructa` clade, outside Animalia (the tutor-bot precedent). Vital signs at baseline
    zero, so a wound has no bleed (`Vitals.hasVitalSign`).
  - ✅ clay as a Material (ceramics), and firing as one rule. A fired golem is the same body
    after a heat history.
  - ✅ `carve`/`impress` on clay to write the word, and authorship provenance on who wrote it.
  - ✅ accountability: whoever answers for an agent bears its harm.
  - ⚠ a `constructa/argilla` body plan whose tissues are clay, with part shares summing to 1.
  - ⚠ the store as a socketed stone (`Slotted`/`fitsSlot`) with a charge that drains while it
    acts.
  - ⚠ moisture on a creature's tissue (`MoistureMixin` ships on goods), where drying lowers
    capacity and changes the clay's response (plastic or brittle).
  - ❌ **a capacity governed by a binding, not an organ.** Locomotion and manipulation both stop
    when an inscription on the head's integument is edited. Nothing in `governs`/`serves` can
    name an inscription.
  - ❌ **an act that edits a creature's face mid-fight** ("erase one letter"): a gambit aimed at
    an inscription, gated on reach.
  - ❌ **a construct's command channel**: an agent that takes orders from one principal (its
    binder), refuses everyone else, and executes literally. This touches the unbuilt
    compulsion-gate security build.
  - ❌ the binding substrate itself (held · pays · cuts) — designed (bestiary § 13), unbuilt.
  - ⚠ morale for a thing with no drive: it never breaks, which must be data on the species, not
    a guard in the brain.

---

### Gelatinous cube — suggested species path `/stuff/agent/species/myxomorpha/cubus/gelatinosus`

> This entry includes material taken from the System Reference Document 5.1 ("SRD 5.1") by
> Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document.
> The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License,
> https://creativecommons.org/licenses/by/4.0/legalcode. Taken: the creature's name, the
> transparent ten-foot cube, the engulf, the acid, the slow speed, the blindness beyond short
> range, and the undigested objects carried inside. The biology below is ours.

- **Quadrant · class** — fantasy · not a person · **adapted** (invented biology with one organ
  that uses the field). Lean only: it could be authored as *bound* instead (see the binding).
  Sentient? Doubtful. It has no nervous system.
- **What it is** — in the SRD, a transparent ooze that fills a dungeon corridor, slides over
  whatever is in its way, and digests it. Translated: **a giant multinucleate plasmodium**, a
  slime-mould-like single "cell" with thousands of nuclei (real *Physarum* plasmodia reach square
  meters but stay millimeters thick). ⭐ **It is not a cube. It is a cast of its tunnel.** The
  `mould` rule (the container decides the shape) gives the iconic shape for free: in a 3 m drift
  it is a 3 m block, and in the open it slumps into a mound. Honest physics says a 3 m gel cannot
  stand on its own. The base pressure ρgh ≈ 30 kPa is far beyond a hydrogel's strength, so the
  walls carry it. Mass: 1.03 g/cm³ × volume, so a 2 m block is ~8 t and a 3 m block ~28 t. It is
  transparent for the real reason jellyfish and salps are: it is ~95% water, index-matched to its
  surroundings (n ≈ 1.34).
- **Where it lives** — mine drifts, cellars, sewers and caves: confined, damp, dark, and
  ⭐ **in a strong field.** Diffusion feeds only ~1 mm of tissue, so a real plasmodium cannot be
  thick. This one is thick only because a field-driven pumping streams its cytoplasm. Out of a
  strong field it thins and starves, so cubes cluster where fields are strong.
- **How it behaves** — it feeds and it moves, slowly. The SRD's 15 ft per round is ~0.25 m/s;
  real *Physarum* manages about a centimeter an hour. It sweeps a gallery like a grazer, and
  nothing is personal. It is chemotactic: it moves up gradients of food scent, warmth and
  **exhaled CO₂**, the way a slime mould finds oats. It does not hunt or flee. In a fight, contact
  makes it recoil from salt and lye.
- **The encounter** — you rarely notice it. It is clear and silent, and at rest it is the
  passage. ⭐ The tells are **what it carries**: a sword hanging in mid-air, a skull, coins at
  chest height. Also the floor ahead is *too clean*, and the tunnel smells sour. Its senses are
  chemical and contact only, and it is blind (the SRD's blindsight, translated). Standing still
  helps less than you hope, because it follows your breath. Fire barely matters, since it is a
  water body with an enormous heat capacity. Noise means nothing. ⭐ **You can walk away from
  it**: a walking person is ~5× faster. The danger is the dead end and the dark corner, and every
  lethal case is an ambush. Real safety lore is cave and mine lore: carry light, test ahead with
  a pole, and never back into an unlit side passage.
- **If it fights** — there is no exchange in the ordinary sense. It **engulfs**: you are inside
  it. Footing stops mattering and **breath** takes its place. You go in with whatever breath you
  had (tidal ~37 s, a deep one ~75 s for an untrained adult at rest, longer if you stay still and
  shorter if you struggle), while its digestive acid works on skin and on organic gear. The
  counterplay is to get out, or to have friends pull you out, or to **cut your way out**. A short
  blade works inside it, but a long weapon cannot swing in gel. From outside, edges cut gel,
  blunt blows do nothing, and points do little. ⭐ **The derivable counters are the
  slug-and-amoeba ones:** salt (osmotic shock draws the water out), lye or quicklime (both
  denature it and the potash pack makes lye), cold (freezing it), and drying. Its armor is
  nothing; its defense is that most blows are not wounds to it. It has **no vital zone**: there
  are thousands of nuclei and no organ. It has no blood, no lungs and no morale. It disengages
  when it is too small to hold you, or when it is salted.
- **People and it** — miners call them "the clean": a drift that is suspiciously swept is a drift
  you don't go down. *Realm-lore suggestion:* a mine with a strong field employs a salter.
  Surface-dwellers keep the cleanest privies in the realm by feeding one, and nobody talks about
  it.
- **What it yields** — what it ate and could not digest: metal, glass, stone, bone, coins. The
  chattel chain of title survives digestion, so a dead adventurer's sword is still theirs. The
  gel itself is a perishable, high-capacity water body. ⭐ **Mana:** water's ε ≈ 80 and its life
  in a strong field make it among the richest mana per kilogram of any living thing. It leaks
  fast and rots fast, so it is a reagent solvent to use on the spot, never a store. Salt-killed
  gel is brined and keeps longer; burned gel is boiled to nothing.
- **The binding** (if authored as bound instead) — **held:** its thickness and form against
  slump and against the diffusion limit. **Pays:** the field plus its food. **Cuts it:** a
  grounding conductor driven into it, or removal from the field. It sags, thins and starves.
- **What the model must express**
  - ✅ immersion: the nearest containing vessel with a non-empty bulk interior decides the
    breathable medium (respiration § Immersion). Inside the cube you breathe nothing, and the
    breath store burns by effort.
  - ✅ `pull` exists (the river pin): a friend frees the held.
  - ✅ caustic contact (`Material.corrodeOnContact`) for its acid, and `corrosiveTo` by material.
  - ✅ chattel title survives digestion, so the loot is someone's.
  - ✅ `mould` (the container decides the shape), if a creature can borrow it.
  - ⚠ a chemical-gradient and contact sensorium. Smell and touch exist, but attraction to
    exhaled CO₂ is a brain reading a field.
  - ⚠ concealment authored from transparency (an index-matched body, a band that light and a
    probing pole defeat).
  - ❌ **engulf: a creature as a container of another combatant**, with the fight continuing from
    inside. The session has to read "inside", reach and weapon length change, and breath replaces
    footing.
  - ❌ **an amorphous body plan**: one part, no organs, capacity as a function of **remaining
    mass** rather than organ function. Today a plan with nothing governing reads every capacity
    `full` forever, so wounds could never slow it.
  - ❌ **a severed piece that lives**: real plasmodium fragments survive and refuse. Part-as-Stuff
    promotion is deferred.
  - ❌ **osmotic/desiccant harm** (salt, lye, quicklime as dehydration of a water body). There is
    no channel for it, and caustic-on-contact is the nearest seam.
  - ❌ **carried inventory digested by material** (leather, cloth and wood go; metal and glass
    stay) at a rate.
  - ❌ a body whose **thickness depends on the field** (adapted transport). The danger-map rule
    needs a creature's viability to read the place's mana field.

---

### Giant spider — suggested species path `/stuff/agent/species/arachnida/araneae/theraphosidae/megatheraphosa-cavernicola` (invented genus)

- **Quadrant · class** — fantasy (invented biology) · not a person · **ordinary**. ⭐ There is
  nothing magical in it. Sentient: yes, plausibly (it can suffer), which matters for the clean
  kill.
- **What it is** — start from the real animal. The largest real spiders are the Goliath
  birdeater (*Theraphosa blondi*, up to ~175 g, leg span ~28–30 cm) and the giant huntsman
  (*Heteropoda maxima*, leg span ~30 cm). Spiders have a **chitin** exoskeleton that must be
  molted to grow. They have an **open circulation** of hemolymph carrying copper hemocyanin (it is
  blue). They breathe through **book lungs**, plus tracheae in most araneomorphs, by diffusion
  with little active ventilation. ⭐ They **extend their legs hydraulically**: the femur–patella
  and tibia–metatarsus joints have no extensor muscles, so a dead or drained spider curls. They
  have up to seven kinds of **silk gland** (dragline silk ~1 GPa tensile strength, tougher than
  Kevlar by energy to break) and venom glands in the chelicerae. They digest outside the body,
  liquefy prey and suck it in.
  - **The square-cube law** is why spiders are small. Mass grows with length³ while lung area and
    leg cross-section grow with length². A larger spider suffocates by diffusion, needs
    impossible hydraulic pressure, and **collapses under its own soft body when it molts**, since
    a fresh cuticle cannot bear weight in air. The Carboniferous giant arthropods are often tied
    to ~30–35% atmospheric O₂ (debated).
  - ⭐ **What makes this one possible: three invented organs, each with a price.** (1)
    *Ventilated book lungs*: muscles pump the leaves, so it can be heard breathing (a rasp) and
    needs cool, humid air. (2) *A thickened, pressure-tough prosoma* driving the hydraulics. Its
    legs are still hydraulic, so **a hemolymph wound folds them**. (3) *Molting in a silk
    hammock* that bears its weight for days while the cuticle hardens, and in those days it is
    helpless. That honestly buys **a dog-sized spider**: leg span ~1.2–1.5 m, mass ~10–25 kg (my
    estimate, uncertain). ⚠ **The D&D horse-sized giant spider is not honest biology here.** It
    would need a binding, and that is a different entry.
- **Where it lives** — caves, mine mouths and deep-forest root hollows: humid and cool, where
  ventilated book lungs work. It lives in burrows lined with silk. Activity falls in cold seasons.
- **How it behaves** — a burrowing sit-and-wait ambusher, tarantula-like, with trip-lines of silk
  radiating from its burrow. It is solitary and cannibalistic, so it is never found in groups,
  which is also why nobody can farm them densely (real spider-silk farming fails for exactly
  this reason). It is shy of anything larger than its prey. Its flight distance is short but
  real: it retreats into the burrow. It is nocturnal.
- **The encounter** — it notices you by **vibration**, through its trip-lines and slit sensilla,
  and by air movement on its trichobothria. Its eyesight is poor. Stepping on a trip-line is the
  notice. It sizes you up by vibration amplitude: large means a threat, small and struggling means
  prey. Its threat display is the real tarantula's: front legs raised, fangs bared, and ⭐ a cloud
  of **urticating hairs** kicked off the abdomen, which wrecks the eyes. Standing still on a line
  keeps you "prey-sized" in its read. Backing off the lines ends the encounter. A torch makes it
  retreat (dry silk burns). Real safety lore scales up: watch your feet at a burrow mouth, never
  put a hand into a hole you can't see into, and cover your eyes near a displaying tarantula.
- **If it fights** — a lunge from the burrow mouth, then a retreat. **Tempo** is its lever: it
  strikes first and fast. **Silk** is the other lever: thrown bolas-like lines or a web you walked
  into leave you `grappled`. **Venom** then works on its own clock. Its armor is a chitin plate
  that turns an edge and fails to a point at the joints. ⭐ **Vital zones:** the pedicel (the
  narrow waist), the prosoma (hemolymph pressure; a deep puncture there and the legs fold), and
  the eyes. The abdomen is soft, but a wound there is slow. It quits at the first serious wound
  and goes back into the burrow. **A molting spider cannot fight at all.**
- **People and it** — the venom is milked for medicine and poison. The silk is prized: the real
  2009 golden-orb silk cape, woven from silk drawn from about a million Madagascan *Trichonephila*,
  shows silk can be **drawn from a living spider** (forced reeling, as Camboué did in 1890s
  Madagascar). *Realm-lore suggestion:* a silker's licence, and a law against killing a breeding
  female.
- **What it yields** — **silk**, drawn alive as a renewable yield (the gland refills over days,
  and the rate does not depend on how often you draw), or cut from the burrow. **Venom**, milked
  live by stimulation or taken from the glands. ⭐ Spellbook § 6 requires saying what it works on:
  real spider venoms are often clade-specific (the funnel-web's δ-atracotoxin is deadly to
  primates and mild in dogs and cats), so this venom must name its targets. Then the chitin
  plates and the fangs (stores: dentine-hard tips). The meat is small and edible (fried tarantula
  is eaten in Cambodia). **Mana:** ordinary absorption. Fat and hemolymph are low-capacity. It
  ranks low in the chain (it eats insects and small vertebrates), so it carries little. A
  punctured prosoma spoils the plate yield less than a crushed one.
- **What the model must express**
  - ✅ `breathing: [{ medium, apparatus, intake }]` on the body plan: book lungs as an apparatus.
  - ✅ `suppliedBy` + the recursive function walk: legs supplied by the prosoma's pressure, so a
    prosoma wound costs locomotion without the legs themselves being hit.
  - ✅ `grappled` combat flag; `HazardMixin` for a placed web (a snare paid for in advance).
  - ✅ venom through `introduceToxin` riding the wound (gated on `afflicted`). A veil-style
    covering stops it.
  - ✅ a tap (`TapSpec` on `Species.production[]`) for silking a live spider (no feedback) and for
    milking venom.
  - ⚠ chitin as a tissue Material (today the shore crab's carapace is authored as **bone**, which
    is a lie the share model hides), and chitin as an integument with its own grid.
  - ⚠ silk and venom glands as organs that produce at a rate into a reserve, and the reserve
    spent by a throw or a bite.
  - ⚠ an urticating-hair cloud as a thrown irritant on the vision channel ("looking or touching
    as harm").
  - ❌ **a sense routed through an object the creature built**: the web and trip-lines extend its
    touch into the room, and treading on them is the notice.
  - ❌ **toxin potency keyed to the victim's clade** (primate vs canid), not only to the
    drinker's toxin burden.
  - ❌ **the molt**: a life-cycle state that softens the integument for days and removes the
    capacity to fight.
  - ❌ **a scaling-honesty check**: nothing tests a species' size against its respiration and
    skeleton, so an author could ship a horse-sized diffusion-breather without a word.

---

### Hydra — suggested species path `/stuff/agent/species/draconomorpha/hydra/lernaea`

- **Quadrant · class** — fantasy · not a person · **bound** (a regenerator). Sentient: yes.
- **What it is** — Greek myth. Hesiod (*Theogony*) makes the Lernaean Hydra a child of Typhon and
  Echidna, raised by Hera to trouble Heracles. It lived in the springs and marsh of **Lerna** near
  Argos, whose Alcyonian lake was said to be bottomless and an entrance to the underworld. The
  head count varies by source: nine (Apollodorus), fifty (Simonides), a hundred (later writers).
  Apollodorus says one head, the middle one, was immortal. Cut one head off and two grew back.
  Heracles' nephew **Iolaus burned each stump with a brand**, and nothing grew. Heracles cut off
  the immortal head and buried it under a rock. He dipped his arrows in its **poisonous blood**
  (or bile), the poison that later killed Nessus and, through Nessus' blood, Heracles himself.
  Eurystheus refused to count the labor **because Heracles had help**.
  - Real echoes: polycephalic snakes exist (rare, short-lived, the heads competing for food).
    ⭐ The freshwater cnidarian *Hydra* is named for it because it regenerates. ⭐ A **planarian**
    whose head is split lengthwise regrows **two** heads, which is the myth's rule in real
    biology.
- **Where it lives** — marsh and spring country. ⭐ **In the field model, a spring in a strong
  field is a mana spring**, so a hydra lives at the head of one. The danger map puts hydras at
  the springs. It does not wander far, since its regrowth needs its food and its lair's field.
- **How it behaves** — an apex marsh predator: it ambushes livestock and people at the water's
  edge (the myth's ravaged herds). Each head forages semi-independently, as in real two-headed
  snakes. It is territorial at its spring, and it is always eating, because the regenerator pays
  in food.
- **The encounter** — several heads mean several sets of eyes. It is hard to approach unseen and
  it watches in all directions. It holds its ground at the spring and does not chase far.
  Approach on dry ground, away from the water's edge it strikes from. A torch means nothing to
  it, until you put one to a stump.
- **If it fights** — **reach and tempo**: many heads on long necks strike in one beat, so a lone
  fighter defending one head is bitten by another. It **swamps the poise contest by numbers
  inside one body**. The bite carries the venom. ⭐ **The clock:** a severed neck regrows within a
  few beats unless burned. ⭐ A clean, single transverse cut regrows one head, and a ragged hack
  that splits the stump regrows two. That is a skill line, not a die. The derived counter is the
  myth's: **one fighter cuts, one burns**. That makes it a party fight (the threat graph and the
  hand slots: a torch occupies a hand), and you can only beat it alone by bringing fire you can
  hold and swing. Vital zones: the heart in the body, and the anchor head. Its armor is a scaled
  hide. It quits when its food is gone: starved, it cannot regrow, and badly hurt it retreats into
  the spring.
- **People and it** — the Lerna country gave sacrifice to the springs. In the myth, help
  disqualified the deed: ⭐ a values hook, since a bounty that pays only the one who struck the
  blow is a governance choice. *Realm-lore suggestion:* the spring's owners pay to keep it fed
  rather than fight it, because a hydra at the spring keeps poachers off the water.
- **What it yields** — **venom-blood** (arrow poison: a coating), the heads as trophies (each
  one, so the count is the boast), the hide and the teeth (stores). **Mana:** an apex predator at
  a mana spring, so it is rich, and its blood is the reagent. Burned stumps spoil the necks' hide.
  The cut-and-burn fight leaves a scarred, cheap pelt, while a hydra starved to death leaves a
  perfect one, which is the ethic-vs-economy question in another form.
- **The binding** — **held:** the body's form, regrown to its template at any cut face (two faces,
  two heads). The anchor is the immortal head, and severing and isolating the anchor is what ends
  the binding. **Pays:** its own food (bestiary § 13), drawn from the stomach's reserve. **Cuts
  it:** fire or caustic on the wound face, because they kill the living tissue the binding regrows
  from. Starvation also stops the regrowth.
- **What the model must express**
  - ✅ `severable` parts and `severPart` (the subtree goes, and slots on it fall).
  - ✅ heat as a channel, and burns as a trauma behavior (the torch on the stump).
  - ✅ party/threat graph and the hand-slot economy (one cuts, one burns).
  - ✅ venom riding the wound.
  - ⚠ coatings (venom-blood on an arrow): designed in combat-depth and the spellbook, unbuilt.
  - ⚠ the necks and heads as composed part modules (torso + N × neck-with-head), shares summing to 1.
  - ❌ **redundant governors**: `governs` combines by **min** (one brain), and the anatomy death
    floor starts dying on any missing vital governor. **The first head cut kills the hydra.** It
    needs "any of N brains" (max) for consciousness and respiration.
  - ❌ **regrowth of a severed part, blocked by the channel that dealt the wound**: the
    regeneration binding with a stopper. `restorePart` is unbuilt, and wounds do not record
    "cauterized".
  - ❌ **a part count that grows on the instance**: `bodyPartDeltas` carries only `missing`, so
    there is nowhere to write a second head.
  - ❌ **many natural attacks in one beat** from one combatant (several heads, one tempo).
  - ❌ the binding substrate (shared with the golem).

---

### Kappa — suggested species path `/stuff/agent/species/kappa/japonicus` (common names vary by region)

- **Quadrant · class** — fantasy · **a person** · **adapted** (an organ, the dish, holds its
  strength). Lean only; see the binding.
- **What it is** — a *yōkai* of Japanese folklore, and part of a **living culture**. It appears
  on today's river-safety signs warning children away from deep water, in mascots, on shrine
  amulets and in Akutagawa's 1927 novel. Some communities honor it as a minor water deity. It has
  many regional names (*kawatarō*, *kawappa*, *gataro*; *suiko* in Kyushu). Kunio Yanagita's
  *Tōno Monogatari* (1910) records kappa tales from Tōno, where the Kappabuchi pool is still
  visited. The common form: child-sized, a beak, webbed hands, a turtle-like shell, and a **dish
  (*sara*) on top of the head holding water**. While the dish is full it is very strong;
  ⭐ spilled, it is weak or helpless. It is fiercely polite, so **bow to it and it bows back,
  spilling its water**. It loves **cucumbers**. It challenges people to **sumo**. It drags people
  and horses into the water. A kappa that is beaten, or whose severed arm is returned to it,
  **keeps its promise**: in many tales it teaches the art of setting bones.
  - ⚠ **Handle with care.** One tradition says the kappa pulls a mythical organ (*shirikodama*)
    out through the anus. It is real folklore, but it should not be played for crude laughs.
    Leave it out or keep it as an elder's warning. Do not exoticize. The kappa is ordinary,
    familiar and even beloved in Japan. Its manners are its **character**, not a gimmick, and
    bowing in the game must read as courtesy, not a trick button.
- **Where it lives** — rivers, irrigation ponds and deep pools by villages, in temperate
  lowlands. It is more active in summer, when children swim. The dish refills from the river, so
  it rarely goes far from water.
- **How it behaves** — a person, and mischievous. It plays, tests, wrestles and bargains. It is
  dangerous to the careless near deep water and keeps its word to the respectful. It is a social
  creature in a village's life.
- **The encounter** — ⭐ **this is a talk-first creature.** It notices you at the bank and sizes
  you up for manners as much as threat. Your ordinary acts mean what they mean to a polite
  person: a **bow** is courtesy, which it must return, and so it spills its dish. A cucumber is a
  gift and opens regard. Cucumbers carved with a family's names and floated down the river are
  a real custom of protection. Swimming alone in its pool is an invitation. Running means
  nothing, and looming is rude. ⭐ **Bowing to win is a real tactic and carries a real cost.** A
  kappa tricked by courtesy remembers who did it, and so does the village.
- **If it fights** — usually it doesn't fight, it **wrestles** (sumo terms: non-lethal, ended by a
  ring-out or a fall). It is far stronger than its size. Its lever is **footing**: it shoves,
  grapples, and drags you toward water, where you drown and it does not. ⭐ Its weakness is the
  **dish**. Anything that tips its head (a bow, a throw, a fall) spills its strength mid-fight.
  Its armor is the shell on its back; the front is soft. It yields, and it bargains: it is a
  person.
- **People and it** — signs, shrines, cucumbers, bonesetting lineages that claim a kappa's
  teaching. *Realm-lore suggestion:* a river village's bonesetter is respected because her
  grandmother returned a kappa's arm. The kappa still visits, and the village keeps its pool
  unfenced on purpose.
- **What it yields** — ⭐ a person yields nothing; harming one is a crime. What you get from a
  kappa is **a promise** (bonesetting knowledge, safe water for a village) and regard. The severed
  arm returned is the story's trade. **Mana:** the dish holds river water (ε ≈ 80) open to a
  strong river field, so the dish is a small, high-capacity store that refills when it dips.
- **The binding** — **held:** strength beyond its body's mass, drawn from the dish. **Pays:** the
  water in the dish, refilled from the river (the place's field through the water). **Cuts it:**
  spilling the dish, or dry land long enough to evaporate it. (A purely courteous reading, where
  the bow is character and not compulsion, makes this adapted biology plus manners. The author
  chooses, but the bow must be a choice it makes as a person, never a seized action.)
- **What the model must express**
  - ✅ personhood (`Species.sentient`): terms, yield and blame for harm.
  - ✅ emotes (`bow`), witness triggers on a brain, and regard as memory (belief/regard) so it
    remembers a trick.
  - ✅ drowning by the breath store, and `fight rush`/shove as the throw.
  - ✅ the offer as a moment the receiver decides (pets' `offerRung` shape) for the cucumber.
  - ⚠ expressive acts (a bow as a social fact owed a reply), designed in expressive-acts, unbuilt.
  - ⚠ terms with a sumo stop condition (ring-out, a fall), beyond `lethality`/`stopCondition`/`consent`.
  - ⚠ a promise kept by an NPC (the contract substrate exists; an NPC that honors one does not).
  - ❌ **a body part that is a vessel**: bulk water held in an open dish on the head, spilled by
    the body's tilt (posture or a bow), refilled by immersion.
  - ❌ **a capacity governed by a contained bulk's fill level** (strength while the dish is full).
  - ❌ **a severed limb that is an object and can be reattached** (part-as-Stuff is deferred;
    `restorePart` is unbuilt). The returned arm is the whole story.

---

### Bandit — a ROLE, not a species. Suggested path `/stuff/idea/role/bandit` over any person species (human: `/stuff/agent/species/…/homo/sapiens`)

- **Quadrant · class** — real · **a person** · ordinary. Its fighting profile comes from the job,
  not the body.
- **What it is** — the highway robber, the brigand, the footpad (on foot), the highwayman
  (mounted). Banditry is real and very old. It peaks with **dearth and demobilization**: after
  wars, when soldiers come home with weapons and no work, and after failed harvests. It is
  usually local, part-time and seasonal, and it is small: a handful of men. Hobsbawm's "social
  bandit" (1969) is a famous and contested idea (Anton Blok answered it). Most bandits preyed on
  the poor too, and many were protected by local notables.
- **Where it lives** — choke points on roads between markets: river crossings, wooded hollows,
  passes, the stretch out of sight of any village. ⭐ **Where help does not arrive.** Banditry
  maps onto the gap between declared jurisdiction and effective control (logistics: *"a road is
  safe if help arrives"*). Roads under no `Locality` are the bandit's habitat.
- **How it behaves** — ⭐ **a robbery is a bet, not a fight.** A bandit wants the goods quickly
  and without a fight. They pick the weakest target that is worth taking, use surprise and
  numbers to make resistance look hopeless, and demand (*"stand and deliver"*). A fight costs
  them and a killing escalates the law, so they prefer a surrender. They fence stolen goods, and
  many live as ordinary villagers between jobs.
- **The encounter** — they size you up the way a predator does, but by economics: **cargo value
  × chance it is yielded** against **resistance** (armed people, an escort, armor, dogs) and
  **response time** (the distance to help, witnesses). Your ordinary acts matter: an escort,
  visible weapons, travelling in company, a fast mount, and a whistle that summons a watch all
  push a gang to wait for another wagon. A barricade across the lane is the ambush (freight: the
  cargo is the target, not the passengers). Real safety advice for travellers was always:
  travel in company, by day, and don't show your money.
- **If it fights** — **gear derives from economy**: cudgels, knives, spears, bows, a few swords,
  firearms if the epoch has them, all cheap and sold or stolen. Armor is light, if any. Training
  is mixed: most have none, and the ex-soldier among them is the dangerous one. ⭐ **Nerve is the
  profile.** Morale breaks early (the bet has gone bad), especially once one of them is down or
  help appears. They fight from the barricade's cover, they take a yield and they **yield
  themselves**, and they flee into ground they know. Terms are the bandit's own, and a killing
  breaks them.
- **People and it** — ⭐ the real law is rich and teachable. The Statute of Winchester (1285)
  made the **hue and cry** a duty, held the local hundred liable for a robbery whose robber was
  not caught, and ordered **brush cleared 200 feet on each side** of highways between market
  towns, so the ambush had nowhere to stand. **Outlawry** (*caput lupinum*, "wolf's head")
  stripped a fugitive of law's protection. The Highwaymen Act of 1692 paid **a £40 reward** per
  conviction, and that built the thief-taker trade. Folk heroes (Robin Hood, Dick Turpin) sit
  beside the real gangs. *Realm-lore suggestion:* the road out of Rejection with no watch on it,
  and an innkeeper who always knows which wagons got through.
- **What it yields** — a person yields nothing but evidence and a reward. The goods recovered
  still carry their **chain of title**, so stolen cargo is identifiable at the fence.
- **What the model must express**
  - ✅ personhood, terms, yield (both ways), morale with onlookers (third parties break fights).
  - ✅ the accountability ledger (crime and blame derived on read; PERSON + PARTY).
  - ✅ chattel chain of title (spoils are a transfer; a fence's goods have provenance).
  - ✅ disguise (a mask) through belief.
  - ✅ an `Organization` for a gang (the policing slate's Gray).
  - ⚠ the barricade (freight slate), the whistle clock (response time is geography), and "wanted"
    as belief (policing slate).
  - ⚠ a role's fighting profile as a row (gear, training band, nerve dials) laid over any person
    species, the persons side of the bestiary.
  - ⚠ a bounty as a contract with a verifiable clause (in custody, convicted).
  - ❌ **the demand under threat**: *"hand it over or fight"*, a pre-fight offer with terms, which
    the target accepts (a transfer under duress, recorded as robbery) or refuses (the fight
    opens). combat.md says there is no verb for talking a fight down. This is that verb's harder
    sibling.
  - ❌ **a target-assessment brain**: reading another party's strength, cargo value and expected
    help-arrival time as a bet. The behavior substrate exists; the read of help-arrival time
    does not.
  - ❌ **outlawry**: a jurisdiction register that removes a named person's protection (blame for
    harming them reads differently). This is a governance and values decision that needs a
    tier-labeled register.
  - ❌ **collective liability** (the hundred pays): a locality as the defendant when its own
    people fail to catch a robber.
