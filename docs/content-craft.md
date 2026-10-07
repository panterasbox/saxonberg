# Content craft — what we are trying to do when we write the world

> **Status: the owner's taste, written 2026-10-07.** The third of three
> documents about content. [eotl-craft.md](./eotl-craft.md) reads the
> ancestor's corpus and says what *it* teaches.
> [wizardry-rubric.md](./wizardry-rubric.md) says what we will
> *measure*. This one says what we are **trying for** — and it is the
> only one of the three with no authority behind it at all.
>
> ⭐ **It is an essay, not a standard, and that is deliberate.** Nothing
> here is enforced, nothing here gates a merge, and an author who
> disagrees is not wrong. See § 1 for why it could not be written any
> other way.
>
> ⚠ **This document leaves.** Content belongs in its own repository with
> its own `CLAUDE.md` — *you adopt the platform and you bring the
> content.* It lives here only because the platform repo currently holds
> all the content there is, and because agents standing up fixtures
> should know these preferences now rather than have them applied as
> rework later.

---

## 0. ⭐⭐ Three tiers, and this is the third

A content rule is in exactly one of three places, and the test that
sorts them is **can the engine notice?**

| tier | what it is | where it lives |
|---|---|---|
| 1 | the platform **enforces** it — content cannot violate it | the lints, the closed vocabularies, `authorable` |
| 2 | the platform **believes** it and cannot notice you breaking it | the subsystem docs |
| 3 | **taste** — only a reader would notice | here |

Tier 2 is the invisible one and it is bigger than it looks. *"Unlit
interiors are pitch black — the tell is every object reading
'something'"* is a content rule the engine holds and will never catch
you breaking. So is *"a `props:` edit never reaches a booted world."*
So is the rubric's *"every noun you put in a description is a
promise."* ⭐ When something in this document turns out to be tier 2,
it should move to the doc that owns it and a gate should be considered.

⭐⭐ **And one habit worth naming, because it is the mistake this
document was drafted three times to make:** the authoring surface is
**unbounded on purpose.** The worldcrafter decides everything the
platform does not mandate, which is most of it. Every attempt to tidy
that into a taxonomy of permitted decisions — a density ladder, a tiering
of what a place must offer, a split between "real" decisions and
consequence dials — was wrong in the same way. There is no list. That is
the point of § 1.

---

## 1. Values, not rules — and why this is an essay

The EotL wizard application asked twelve questions. **Ten were about
motivation, taste, judgment, self-knowledge, accountability and voice.
One asked about programming experience. One asked about debugging
method.**

Its real job was to reveal **does this person think like a wizard or
like a mortal** — and the tell is specific. A promoted applicant who
immediately clones a wiztoy, sets their stats to 1000 and goes killing
NPCs has told you everything: that is a player's instinct. A content
creator's only "playing" is playtesting.

And the question that did the most work was *"what is your favorite
object, and why?"*, because its failure mode is unmistakable:

> *"I like the obsidian blade because it has 90 sharpness and gives
> extra exp."*

That is a complete failure from someone claiming to want to make things,
because **all of their content would be built around how good it is for
players.** Not immersion, not pedagogy. ⭐ None of the seven lenses care
about buffs — a buff is a natural extension of what the other lenses
dictate, never a goal.

⭐⭐ **And the thing that application could not do is teach.** You can
teach function. Function is finite: the mixins, the fields, the verbs,
the lints — that is a curriculum, and
[wizardry-curriculum-slate](./slates/builds/wizardry-curriculum-slate.md)
is it. **Values cannot be taught, only revealed and compared.** Which
means a document about them cannot be a list of rules, because the list
would be a list of *conclusions* with the reasoning cut off, and the
reasoning is the only transmissible part.

So this document does what the application did: ⭐ **instances with
reasons, never the abstraction.** The application never once asked *what
do you think good content is* — ask for principles and you get
platitudes; ask for a favorite object and you get somebody's values
whether they meant to hand them over or not.

### ⚠⚠ What the application could not fix, and the rubric is for

Here is the uncomfortable finding, and it is the strongest argument for
the measurement layer existing at all.

**That application screened hard for taste, and the corpus still came
out hollow.** Every author of the checklist city had to name a favorite
object and justify it. Culhaven is **560 rooms at 8 %** detail density,
built by the authors of the best design document in the corpus; and the
mean pairwise overlap between cities' feature lists is **0.39**.
⭐⭐⭐ **Screening for taste at the door does not
produce taste in the work** — the application gates admission and
nothing gates output. You asked somebody to defend their favorite object
once, and never asked again after they shipped five hundred rooms.

So the rubric is not redundant with an application. It is **the half
that was missing for thirty years**: a continuing reading rather than an
entrance exam. `wizardry-slate § 8a` arrives at the same place from the
other direction — *the evaluator is the build.*

### ⭐ The two postures that follow

**Restrictive about who, permissive about what.** Becoming a wizard is
close to irreversible — you are asking someone to leave the mortal
community — so be very conservative. But be very permissive about what
gets *published*, because the downside is small and **more content is
almost always better than stagnant content.** (Opinions differ on that
second half. This is the owner's.)

⭐⭐ **And the review posture: be extremely critical, then green-light
it anyway.** Say exactly where and how a thing could be better, in
detail, and then approve it. Whether the author acts on the advice is
their business — **it is their content.**

That is not softness. It is `measurement.md`'s rule arriving from the
authoring side: *the engine may read a measurement; it must never read a
valuation.* It is why `wizardry-rubric.md § 5` insists the bands are
**readings, not requirements**. A rubric that refused work would be a
valuation, and so would a reviewer who did.

⚠ Saxonberg changes the shape of all of this and the document should not
pretend otherwise: **everyone can write content here**, a great deal is
possible without ever being promoted, and published content answers to a
legislature and a judicial review that EotL had no analogue for (there,
archwizards did as they liked and were checked only by each other). The
governance is not this document's subject. But the practical consequence
is: the framing is **much softer than a gate.** It is *if you are going
to engage with the authoring surface, these are some values that might
work for you.*

---

## 2. ⭐⭐⭐ Three voices, and they do not sound alike

The narration leans **sardonic**. The characters are **genuine**.

The failure to avoid is Andy Weir's: his characters are basically his
own voice. We want his great virtue — **taking complex problems and
making them accessible**, which this world needs constantly — without
that. ⚠ If every NPC in Terminus is dry and wry, the problem is written
into the world and it is checkable per NPC.

Dave is the worked example, and he already has three registers with
three homes:

**1. The author, in comments.**

> *"The Bruce Willis bit is kept direct — it's the part people actually
> recognize — while the obscure cancelled-TV-show specifics stay buried…
> the 'annoying script' as fond homage."*

You explaining the decision to whoever comes next. ⭐ This is also how
content stays enhanceable: the comment says *why*, so the next author can
extend him without flattening him.

**2. The narrator, in `longDescription`.** Dry, appraising, withholding:

> *a glass polished that didn't need it* … *the easy,
> **slightly-too-rehearsed** charm of a man who did a little acting
> once* … **Mostly, it took.**

⭐⭐ "Mostly, it took" is three words and it is the whole voice. Note
what it is *not*: it is not mocking him. It is dry **and fond**. The
1996 voice would have mocked him; twenty years later the register is
more sentimental, and **this sentence — not the bus ads — is the
reference sample for how Terminus should be narrated.**

**3. The character, in dialogue.** Not a trace of sardonic anywhere:

> *"Stopped chasing the next thing and started keeping a thing. Best
> decision I never planned."*
> *"You stop pouring, eventually — you become the place instead."*
> *"It pays nothing and it's the most important job in the building."*

Dave means every word. He is not doing a bit about his own life even
though the narrator is doing one about him.

⭐ **So: the author explains, the narrator appraises, the character means
it.** Nobody wrote that rule down; it is the latent reason the lounge
survived a placeholder purge.

### ⭐ The field is the voice switch

```yaml
- { kind: free, value: "polishes a glass that didn't need polishing." }
- { kind: say,  value: "Yippee-ki-yay. Anyway. What'll it be." }
```

`kind: free` is **narration** — the narrator describing a body.
`kind: say` is **character** — Dave's mouth. An author choosing between
them is choosing which register the room hears, whether they know it or
not.

And watch the pair across the file: the `longDescription` **states** the
tell, the idle pool **enacts** it on a loop. That is why Dave reads as a
man with a habit rather than a paragraph with an animation.

### ⚠ The trap he inherited anyway

The original barkeep ran `set_chat_chance(80)` at rate 30 over **four
phrases**. That is what the comment means by "the annoying script" — and
it is not the lines, it is the **ratio**. Four lines at that frequency
become wallpaper in ninety seconds.

**Our Dave's idle pool is also four entries.** Same trap, better
dressed.

⭐ *Proposed, not ratified:* **state the personality and derive the
performance.** `converses` reads `sociability` and sets both what is said
and how often; the `trait:<axis>` dialogue guard selects branches by
personality; `mara`, `sloane` and `remy` already use the guard and Dave
does not. His `boldness +70 / humility −70 / ambition −70` is read by
nothing in his own file, which means his personality is authored twice —
once as numbers that do nothing, once as lines that do everything. If
that is the right direction, it is the same doctrine as *a buff is a
consequence*: ⭐⭐ **dispositions are to dialogue what materials are to
sharpness.**

---

## 3. ⭐⭐⭐ Specific is funnier — about things we own

A joke about **Costco** lands where a joke about **big box stores**
dies. This is true of comedy and nearly true of everything.

⚠ **Unless the abstraction is the joke**, which it can be, and in a
system like ours it often is — see § 6.

But Costco expires. In thirty years, or outside its market, it degrades
back into "big box stores," and a reference to something we do not own is
a dependency that drifts under the sentence. The sharpest illustration is
in our own repo:

> *"a startlingly good Bruce Willis impression he swears he's retired
> from."*

Willis retired in 2022 with aphasia, later diagnosed as frontotemporal
dementia. The line now carries a reading nobody wrote and nobody can
withdraw. **Nothing about Dave changed; the world moved under the
sentence.** Obscurity you can design around — drift you cannot.

⭐⭐ Which is why the proper-noun substrate earns its keep. **`hollis` ·
`veshko` · `crowsfoot`** are firms with surnames. A joke about Veshko's
is exactly as specific as a joke about Costco and it never expires,
because we made Veshko. The corpo and brand layer is a **proper-noun
factory**, and specificity is what it is for.

⭐ `eotl-craft` technique 5 is the same rule found a second way —
**specify by household object** — derived from thirty years of corpus
rather than from a comedy room. Two sources, one rule, which is a decent
sign it is the real one.

**So: be specific, about things we own.**

---

## 4. ⭐ Homage goes in the details, never the description

*(ratified)*

The description owes a stranger **a complete person or a complete
place.** Anything that only pays off for somebody who was there in 1996
is a detail, a prop, or behind a gate.

The worked case is Dave. The original is 22 lines:

> *"This is Dave, from the old Moonlighting television series. Ever
> since ABC cancelled his show, he's been doing odd jobs here and there
> (most notably Bruce Willis impersonations), then finally decided to
> settle down in Eternal City and open up his own bar."*

Dave **is David Addison** — the character Bruce Willis played in a show
ABC cancelled in 1989 — making a living doing impressions **of the actor
who played him.** The recursion is the entire joke.

⚠⚠ Our row buried the specifics as "obscure," which is defensible on
comprehension grounds and wrong about what was load-bearing:
*Moonlighting* is not a specific, **it is the premise.** Strip it and
Dave is a guy who does a celebrity impression, which is smaller, and
newly fragile (§ 3). The recognizable surface was kept and the mechanism
of the joke was discarded — hollowness operating at the scale of a gag.

**The fix is layering, not deletion:**

- the `longDescription` carries the self-sufficient man — back office,
  staff on the rail, the stage habits resurfacing, *"Mostly, it took."*
  Nobody needs anything to parse that.
- the Moonlighting layer goes in a `details:` key or a prop — a framed
  still, a residual cheque, a poster for a show nobody has heard of in
  the back office. A newcomer reads *"he used to be on TV."* An old
  EotLer reads *the* reference.
- ⭐ and the gate already exists. The `real` node is guarded on
  `regard ≥ 30`: *"There's a door north most folks never notice. Earn it,
  and we'll talk properly."* **An EotLer earns Dave's regard like
  anybody else** — the reward for being old is recognition, not access.

⭐⭐ **The past is findable, never required.**

And the better option the platform opens, which EotL could not: **make
the show diegetic.** We ship publishers, releases, a wiki of typed
subjects, and a chronicle. A cancelled series can be a record somebody
looks up. ⭐ `identity.md` already does the work — the dossier is
*"evidence, never values… marked `claim`"* — so Dave's *"did a little
acting once"* is **something Dave asserts**, not something the world
certifies. Which restores the original recursion better than Moonlighting
did, with no trivia required:

> **Is he doing an impression, or is that just how he talks?**

Unverifiable by construction.

---

## 5. Setting — and repetition is a property of **traffic**

Setting is the content question. It is decided early, at treatment
stage, and in this medium it means something that neither screenplays
nor most games mean, for one reason: **we have no establishing shot and
no camera.** A room's description is re-delivered on every entry.

⚠ But "write for the fiftieth reading" is too broad, and the true
partition is traffic:

- **Low traffic** — read once or twice. Freshness is free; the first
  reading *is* the reading. Most content.
- **Favorited** — re-read **by choice.** ⭐ Repetition is consent. If
  somebody returns a hundred times they have already said they like it
  as it is.
- ⚠ **Transit and utility** — read hundreds of times, **not by choice.**
  TPA terminal rooms, a bank counter, the district you cross to get
  somewhere. **This is the only category where repetition is a design
  problem**, and it is a small, nameable set.

⭐ And the likely answer for that set is **stability, not variation.** A
terminal's job is to be passed through; it should be legible and boring
on reading three hundred. Trying to make it fresh is the mistake.

The ancestor measured its own failure at the second reading anyway:
**16,609 `day_long`s and night prose on roughly 11 % of them.** Authors
wrote the first reading and not the second.

### ⭐⭐⭐ Put the commentary in the vehicle, not the destination

The Eternal City bus advertisements are the technique. Fourteen lines on
a moving object, every one a true criticism of a *stationary* one:

- **Everything, Inc.: We've got long swords!** — ⭐ not demand,
  **sediment.** Nobody needs long swords, everybody sells them, so a
  general store's shelf silently becomes a hundred of them. The ad is
  copy about **a state the world produced**, not one an author wrote.
- **Eternal Savings & Loan: Well we've got savings at least.** — and the
  setup is the **short description**, flashing past every single time
  anybody transacts. Hundreds of readings, never once a loan. ⭐⭐ The ad
  does not refresh that text, it **arms** it. Reading 501 is funny
  because of 1 through 500.
- **E.C. Library: Because you can never read Lawrence of Arabia too many
  times.** — the library has one book.
- **Eight Ball: WE ARE NOT, NOR HAVE WE EVER BEEN A SECRET HIDEOUT.
  Thank you.** — everyone knows. *"Thank you."* does the work.
- **The Grind:** — ⭐ the ad is **blank.** The absence is the joke.
- **Bed & Breakfast: We've got one of the nicest lobbies in town, BUT
  YOU WOULDN'T KNOW THAT WOULD YOU????? YOU JUST WALK UP TO THE STORAGE
  OBJECT…** — an author's grievance about players ignoring prose,
  ventriloquized through an advertiser having a breakdown, delivered as
  prose players will also ignore.

The destination has to stay stable — people transact at the bank and need
it to read the same way every time. **The bus moves, so its content can
rotate without anybody losing their footing.** One mobile object, N
lines, and it retroactively pays off every repeated description in the
district.

⚠ **And these ads are LATE content.** Every line depends on something
that accumulated: a shelf of discards, a bank with a history of not
lending, a lobby walked through for years, a wizard with a known
temperament, a TV show the playerbase was old enough to remember. **Not
one could have been written in week one.** They are also *commentary
rather than construction* — criticism in costume, aimed at content
somebody else built. They are the reference for the voice, not for the
job.

⚠ They are also **meaner than the current register.** There was more
anger available in 1996; see § 2 on where the voice is now.

### Which game tradition we are built for

- **Setting as ruin** — environmental storytelling. Rapture, Lordran,
  Aperture, City 17. The place *was* something, is now something else,
  and the delta is the story. ⚠⚠ **The prestige tradition, and the one
  we are worst suited for**, because a ruin's story is fixed and read
  once. You cannot have both a frozen tragedy and a rota.
- **Setting as routine** — Shenmue, Majora's Mask, Ultima VII,
  Kamurocho, Kingdom Come. Shops close, people have schedules, it rains.
  ⭐⭐ **This is what the architecture is for**, and it is what EotL's
  own applicants said they loved, unprompted: *"I love how the city
  actually functions like one really would… shops closing at night."*
- **Setting as social space** — what MUDs are actually good at. One
  applicant named a chat channel as the single most important object on
  the mud. Dave's Bar exists for this.
- **Setting as system** — the place is generated and its meaning
  emerges. We have a great deal of this, mostly below the prose.

⭐ **The temptation is to write ruins and the medium pays us for
routine.**

---

## 6. ⭐⭐⭐ The composition is the straight man

A player inspecting an object sees its mixin composition. We are
deliberately legible about the architecture, which means:

**The composition is the only part of a description the player knows is
true.**

Prose can be stale, decorative, aspirational, or a lie. A mixin list is
the object confessing, in a voice with no opinions and no sense of
humor — ⭐ institutional voice at its purest, a form structurally
incapable of being funny, and therefore the best available setup.

So there are two sources a player can cross-check, and **the gap between
them is where the meaning goes:**

| prose vs composition | what the player gets |
|---|---|
| prose promises **less** than the composition delivers | a **revelation** |
| prose promises **more** | a lie they catch — a defect, or a character |
| a capability present and never mentioned | a **mystery with a guaranteed payoff**, because it will come up |

⭐⭐ A film cannot show you an object's class. A novel cannot. We hand it
over on request, in a monotone. **The straight man is built into the
client**, and the author writes the other half of the double act.

And this is the case where § 3's exception applies: **every mixin
contract is a surface for commentary on nature** — specifically on
*Saxonberg's* nature and everything that went into it, which is
documented at length. The abstraction can be the joke, because the
abstraction is ours and the audience can read it.

⚠ Expectations set this way are the material. **Humour and drama both
live in defying them.**

---

## 7. ⭐⭐ Reincorporation — three techniques that are one technique

Keith Johnstone's structural claim is that stories satisfy by
**returning to** earlier material rather than introducing new material.
Three things in this project are that claim wearing different clothes:

- the bus ad reincorporating five hundred readings of *Savings and Loan*
- `eotl-craft` #1, **the detail chain** — *a detail in one room is
  evidence for the next*
- `eotl-craft` #2, **refrain plus absence** — 144 rooms, *"a blanket of
  heat"*
- and a mixin noticed on inspection in one room, paying off three rooms
  later (§ 6)

⭐ Two of those were derived from a corpus and one was learned in a
ComedySportz room. Same technique. Worth trusting.

**Corollary, proposed:** ⭐ **make things another wizard would want to
add to.** The checklist city cannot be improved incrementally — 560
rooms of nothing offer no purchase, so nobody ever touches them and they
remain the largest thing in the cabal forever. Krynn, Dementia, the
desert, Acidland — every area cited for *sustained discovery* is one
where somebody could add a room next year and it would land. A detail
chain hands the next author a premise. ⚠ *"The connective tissue rots
first"* is the same observation stated as decay.

---

## 8. ⭐⭐⭐ What asks something of you

Thirty-six applicants answered *"what is your single favorite object,
and why?"* across eighteen years. **Not one named a reward.** The six
most specific answers all name a thing that costs the holder something:

- **the Agiel** — *"you have to be trained to use this weapon, because
  it also causes the wielder pain too… It just fits with the area so
  well."*
- **the Dancing Katana** — *"the weapon will leap from the player's
  hands and then attack them."*
- **the cursed rocks** — *"you can't take them blindly… It makes you be
  a little extra careful."* ⭐ prefaced with *"actually, I think, the
  least favorite for most people."*
- **the chair** — *"if you don't activate a shield around your chair,
  you risk having another player come along and unplug you."*
- **the PK Monument** — *"tells where the big killers are, BUT it's
  placed in a dangerous high traffic room."*
- **the cliff** — *"anyone stupid enough to try jumping off a cliff gets
  smashed to little bloody pieces."*

⭐⭐ **It is not that these objects hurt you. It is that they ask
something of you.** The consumer asks *what does this give me*; somebody
thinking about the world's upkeep asks *what does this ask of me*. All
six are the second question, and the pain was only EotL's one available
dialect for saying it — the engine gave authors almost nothing else to
spend fidelity with.

⚠ **Do not read that as a mandate to hurt people.** We can say an object
is costly in heat, spoilage, encumbrance, exertion, grade, material
response, money or time. The invariant worth keeping is that **the cost
is legible from what the thing is** — the Agiel's pain is readable off
the fiction *before* you pick it up.

And note what the applicant is actually doing: **admiring a maker's
decision.** Not reporting a benefit — appreciating that somebody chose to
make the weapon cost its wielder, and why that was right. That is
identification with authorship, and it is the whole axis the application
was built to find.

⚠⚠ Two further corrections this dataset forces:

- **"Thinking like labor" has nothing to do with the zorkmid economy.**
  The economy that matters here is **worldcrafting** — maintaining and
  enhancing the game — and that is the one the Compact prices. A player
  crafting a hammer is **consumption**, however much labor it is in the
  fiction. `wizardry-slate § 10.2` already encodes the split: *standing
  reads consumption, wizardry reads production.*
- **The disqualifying answers were honest ones**, which is how you know
  the question worked: *"easy to get things sold… amazing amount of
  stuff for evaling quickly. It's very utilitarian."* · *"good xp and my
  favorite wpn is the barbed trident."* · *"I like noPK rooms with other
  noPK rooms surrounding that room."*

### What the good answers valued, for the record

**Restraint**, and the structure doing the narrating:

> *"The design lends itself well to the story, **without overburdening
> the user with descriptions.** I find the WAY the area is built does a
> great job of defining the story, and creating the mood."*

**Fear** — the most-cited single emotion, five times, with a theory
attached: *"the reason a player keeps coming back is that he is trying to
recreate that first thrill and sense of mortal fear."*

**Sustained discovery** — *"every time I go there I find something new…
I can return again and again and not feel that it is trite."* And one
applicant loved an area for **a wrong belief it sustained for hours**:
*"I was convinced this was the spot to join the assassins guild… I was
clearly mistaken."*

⭐ **And two of them named our failure modes without being asked:**
*"the low use of 'filler' rooms"* and *"nothing blends in to the
background, causing one to cycle room after generic room."* Hollowness
was visible to players the whole time. It was simply never costly to
anybody.

---

## 9. ⚠⚠ Cultural content, and why launch cannot have any

**Cultural content is what the players know that the text never said.**

The long-sword pile. The loanless bank. The hideout everybody pretends is
secret. The lobby nobody looks at. None of that is in a room
description — it lives in the playerbase's shared head, and the bus ads
are the first time the world ever **acknowledged** it. ⭐ That is why
they are funny: recognition, not invention. The world noticed.

In Eternal City most of the true content was cultural, and most players
zipped through without reading a word of the prose. ⚠ **That is an
outlier, not the general case** — most content arrives in small enough
doses to read fresh, or has been favorited by somebody who likes it as
it is.

⭐⭐ **And at launch there is no culture and it cannot be faked.** Those
ads were written by deconstructing what players already thought about
places that had existed for years. On day one there is no accumulated
opinion, no sediment on any shelf, no shared memory, and — with an author
of one — no colleague to needle either. (The fourteenth ad, *"THIS SPACE
FOR RENT: Want to place an ad? Mail Luger,"* is not an invitation to
future authors. It is a dig at a specific wizard, pointing the
playerbase's mail at him, because wizards hate being mailed directly.)

**So the launch corpus is the setup.** Its job is to be the thing the
commentary is later about.

---

## 10. ⚠ The risk this document should say out loud

The method is screenwriting's: **treatment first** — plot beats and
setting — then the **master-scene script**, dialogue and character. In
thirty years of writing that second half belonged to a partner. There is
no partner now.

The failure mode that predicts is not weak structure. It is **excellent
structure nobody ever reads**, and it is already in the repo. The
millsite has `ρ·g·Δh·Q·η` and von Thünen in its comments, a toll taken in
kind, a rota, a wage, a miller with dispositions and an idle pool —
and it answers **four of the fourteen nouns its prose promises**, against
the ancestor's 41 % corpus mean.

⭐⭐⭐ **The millsite is a treatment that never got a scene pass.** A
lobby people walk through to reach the storage object.

⚠ A related map-scale symptom: nearly every district in Terminus is named
for its **function** — counting-houses, general-store, market, registry,
realty, gazette, infirmary, terminal, public-works. A function name
forecloses: you go to Market to buy things and that is all Market can
ever be for. The open names are the geographic and personal ones —
Estuary, Wharfside, Hinkley Hills, Valley Road, **Mayfield Row**,
**Seznick House** — and the only district with an *emotion* for a name,
**Rejection**, is also the one with the most content in it. That is
probably not a coincidence: **it is hard to write a room in "Registry,"
because the name has already said everything that is allowed to be true
there.**

---

## 11. What this document does not settle

1. ⚑ **Density is an allocation, not a dial** — what to emphasize and
   what to imply, what is functional and what is scenery. The
   `StagedMixin` theatre vocabulary (`props:` / `cast:` / `costume:`,
   `Offstage`, `Extra` / `Cast`) is the frame to lean into, and the
   allocation rule inside it is not written yet. ⚠ Every attempt in
   drafting to turn it into a tiering got cut.
2. ⚑ **State the personality, derive the performance** — proposed in
   § 2, unratified. `converses` reads exactly **1 of 19** disposition
   axes and is used by nobody; Dave would be its first consumer.
3. ⚑ **Everyday versus exceptional.** *What are the everyday stories
   these areas tell, and what are the exceptional events we build quests
   around?* The ancestor answered emphatically and by accident: **48
   `set_quest` calls in 45,380 files — 0.1 %.** Essentially all everyday.
4. ⚑ **Personal style** — how to frame it at all. The reference sample
   is § 2's narrator voice, not the bus ads.
5. ⚑ **Which of these are secretly tier 2** (§ 0) and should become
   subsystem doctrine with a gate behind it.

---

**See also:** [eotl-craft.md](./eotl-craft.md) (the ancestor's
techniques and failure modes) · [eotl-census.md](./eotl-census.md) (the
counts) · [wizardry-rubric.md](./wizardry-rubric.md) (what we measure) ·
[wizardry-curriculum-slate](./slates/builds/wizardry-curriculum-slate.md)
(the function half, which *is* teachable) ·
[design-lenses.md](./design-lenses.md) (the seven, none of which care
about buffs) · [measurement.md](./measurement.md) (why a reviewer
measures and never valuates).
