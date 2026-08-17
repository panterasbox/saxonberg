# The Newbie Wilds — the combat introduction (staging)

> **Status:** being designed live (2026-07-01). This is the area concept
> + the cast spine + the combat curriculum + the crossroads hub. Room-by-room
> map and per-NPC/per-object sheets come after this settles (mirroring the
> `docs/staging/eternal-university/` structure).
>
> **What this is:** the game's **first combat area** and the first place the
> **Law↔Chaos alignment axis** is made *explicit and in-your-face*. Everything
> up to here (campus onboarding, *An Honest Count*) is passive and implicit —
> observe, investigate, notice people. This area is the payoff: *where's all
> the violence?* Here.
>
> **Relationship to the existing arcs:** comes **after** campus onboarding and
> (ideally) *An Honest Count* — the player already understands the world's
> who-counts stakes before they first raise a hand. Onboarding is deliberately
> combat-free; this area is where combat is introduced. It is **not** on campus
> and **not** the census murder-quest — it's the sanctioned "small wilderness
> zone" the lore permits, out past the city/campus edge.
>
> **Engine note (read this):** the full area needs the **combat system**, which
> is `docs/slates/deferred-rpg/` — **designed, not built.** So this doc is two
> things at once: (1) the **design** of the area, and (2) a **forcing function**
> for what combat has to support (the terms/consent/blame machinery, the
> poise loop, defeat≠death + the two-stage coup, aggression-setting guardrails).
> It also leans on **employment/contracts** (bounties = piece-work Contracts,
> the shift-and-wage engine's sibling shape — an extension, not free) and the
> built **alignment substrate** (governance-record for Law↔Chaos; regard/renown
> for witnessed reputation; the scene composer for path-tinted prose).
>
> **Retire when:** cemented as a zone + Character/room seeds in YAML.
>
> **Area name:** *working title "the Newbie Wilds."* In-world name TBD —
> candidates: **the Marches**, **the Margin**, **the Last Counted Mile**.

---

## The premise

> **A frontier settlement at the last counted mile, where the counted world
> quits and the wild takes over — and where a new player finally gets to apply
> violence to a problem, and learns, with their hands, that there are two ways
> for a good person to do it.**

The old EotL newbieland was a killing gallery with an alignment sign nailed to
a fork: **Rainbow Village** (good monsters — butterflies, Bambi, a child) to
the west, **Bewitched Forest → Hell** (evil monsters — a terrorist with a bomb,
Jack the Ripper, a witch) to the east. Its whole engine was *choose your
victims to choose your soul on the Good↔Evil axis.* We **keep the feeling and
transplant the axis.**

---

## The reframe from the old newbieland

**What we keep:**

- **Choice-first.** The player hits a fork almost immediately. The game is
  about agency; the area opens on exactly that beat.
- **Iconic-fear-cartoon casting.** Real fears (the terrorist, Jack the Ripper,
  the witch) rendered *juvenile and cartoon-safe.* The tell in the original is
  the terrorist's bomb, which **only hurts monsters** — *"Amazingly, you didn't
  get hurt."* That Looney-Tunes safety is the tonal register we protect.
- **Alignment as the spine, expressed through what you do** — not a stat screen.
- Level-capped safe haven; generous XP; freebies.

**What we drop:**

- **The Good↔Evil axis.** In our cosmology players are **floored Good** — the
  "kill the child to fall" transgression engine is off the table, morally *and*
  mechanically (murdering an innocent isn't an "alignment choice," it's a
  witnessed crime with blame and collapsing regard, and it accomplishes
  nothing).
- The killing-gallery-with-no-story. We want **lore, a quest, personality,
  interactivity** — a real small area, not a respawn arcade.

**What we transplant onto:** the **Law↔Chaos axis** (our *political* axis —
structure vs. liberty, "legitimate disagreement among good people"). **Both
paths are Good.** The question the area poses is never *are you good?* — it's
*what kind of good person are you?*

---

## The theme this area teaches (why it's a genre collision)

This is the **theme-introduction area**, and the theme *is* the collision —
a world that refuses to commit to one genre. So this area, specifically (not
every area later), is a deliberate **genre salad**: a Prohibition gangster and
a penny-dreadful murderer and a fairy-tale witch and a thing that came through
the terminal, all on one board, no one blinking. The old newbieland already had
this instinct (a terrorist *and* Jack the Ripper *and* a witch *and* an
incubus) — we make it deliberate.

**What licenses the collision:** the area is **the margin — the last place on
the census before the roll goes quiet.** Past the settlement the woods are
*uncounted*, and the uncounted is where things that don't fit anywhere else
wash up (the TPA leaks, the ruins bleed, the multiverse is a permission slip).
This is the edge where genres stop being enforced. The un-genred finish isn't a
bug here — it's the **signature of having stepped off the map the census
keeps.** Deadpan, never winking: the registrar was a registrar; out here the
Big Bad Wolf is just another thing the warden has a form for.

Ties us to the **eternal spine** (the census, the ruins) with nothing
ratification-fragile.

---

## The combat curriculum — three lessons, in order

The area is built as a **teaching experience.** Its shape is a single argument
that builds. **The combat ceremony is precious** — the consent/terms/blame
machinery exists to distinguish *killing a monster* (trivial) from *killing a
person* (weighty) — so we spend it deliberately:

1. **Monsters — "violence is free."** Pure-evil fodder: a **genre-salad of
   hostile margin-creatures** (goblins & imps from the storybook dark;
   grave-rats & belfry-bats from the gothic; scuttling drones & a leaking blob
   from the *terminal*; coyotes & rattlers from the plain frontier; the witch's
   gingerbread-golems). No ceremony, no consent, no blame, no dilemma — you just
   *swing*, and a lot. Guilt-free: the moral axis is locked Good, so you can drop
   a hundred evil things and stay a saint. **This is the volume of violence.**
   *(Also where the genre-mix gets its volume — you wade through five genres of
   evil to reach the one man who matters. The first fight, the **Wolf**, is the
   pure poise-loop tutorial, audible from the crossroads, drawing you in.)*

2. **People — "but not on people."** A **human** crosses your path while you're
   still in kill-mode, primed — and the game **catches your hand.** Your
   aggression settings interpose. This is a designed lesson, not a hazard to
   avoid: the friction *is* the feature.

   > You raise your hand the way you've raised it forty times on the road — and
   > it stops short. The man hasn't drawn on you. Your terms are set to spare,
   > and the system honors them: the worst you'll do is bruise him.
   >
   > *To bring lethal force to someone who has not consented is murder. It will
   > be seen. It will follow you, and it will not wash off. Your settings are
   > protecting you right now. Change them if you mean it — but you'll have to
   > mean it.*

   Four things learned in one beat: your settings exist, they default to safe,
   murder is a deliberate/costly *crossing* (never hard-blocked — our system
   makes murder expensive, not impossible), and **people are a different
   category of thing.** *(Reinforced inside the boss fight: some of the Gallant's
   human crew* yield *mid-fight — a henchman throwing down his weapon becomes a
   person you can't finish.)*

3. **The wolfshead — "unless the law hands you a licensed exception, and then
   *how* is your soul."** Lesson 3 answers the door lesson 2 closes: *you can't
   just murder people* → *but here is the one man the community has lawfully
   declared huntable, dead or alive.* That is the literal meaning of
   **wolfshead** (medieval *caput lupinum* — a person you *may* hunt like a
   wolf). His outlaw status is the key that unlocks legitimate violence against a
   person, and the choice of *how* you use it is the moral payoff.

**Monsters free → people forbidden → the outlaw licensed.** The curriculum is
our whole moral engine, delivered as level design instead of a lecture.

---

## How the Law↔Chaos axis is expressed

### The definition, said out loud

Both paths are violent and both are Good, so the difference can't be
"nice vs. mean." It's **authorization and the finish:**

- **LAWFUL — violence by the order, and bounded.** You get **sworn in**
  (a real conferred deputization). You fight *sanctioned*, under a warrant, with
  the militia at your back. The defining discipline: **you stop at defeat** —
  you honor the down-but-not-dead window, take the wolfshead **alive**, and walk
  him to a reckoning on the record. *"I will use force, and I will answer for
  exactly how much."*
- **CHAOTIC — violence by your own hand, and direct.** No swearing-in; the
  office is closed, you bring a lantern. No warrant, no terms offered. The
  defining discipline: **you finish what you start** — run him into the woods
  and put him down yourself. *"I will use force, and I will own it myself."*

Same courage, same threat stopped, same Good. Opposite relationship to authority
and restraint.

### On the fodder: identity + prose, not a per-kill gate

Making every kill a Law↔Chaos dilemma would be decision-fatigue and would gum
up the violence. So for Tier-1 fodder the axis is **texture, not a gate:**

- **Identity (strongest).** You carry *one* identity through all the fodder —
  the **sworn deputy** clearing the road under warrant, or the **unsworn hunter**
  doing what needs doing. *Who you are while you swing* is the axis, and it's
  what accretes standing toward a pole (deputy's road-clearing = institutional
  service = Lawful; hunter's = folk-action = Chaotic).
- **Prose (the finish).** The identical kill, path-tinted, riding the built
  scene composer. Same goblin, two registers:
  > **Deputy:** *You put it down under the warrant, drag it clear of the road so
  > the next traveler won't trip on it, and make a note. One less. The road's a
  > little safer than it was.*
  > **Hunter:** *You put it down and leave it where it falls — the woods can have
  > it back. You're already moving toward the next one.*
- **Lethality (weakest — and that's fine).** Nobody takes a swarm of rats alive,
  so lethality isn't really the fodder signal — it's the **wolfshead** signal
  (alive vs. dead). For fodder it's just tone: lawful *accounts for* its violence
  (dutiful, bodies dragged off the road); chaotic *revels* in it (left where it
  drops).

### On the wolfshead: the real fork, two payers

"Dead or alive" printed on a poster does **not**, by itself, cleave Law from
Chaos — on a real frontier the court pays a bounty *either way*, so bringing
them in dead (Warren's code) is still working a legal warrant. The true fork is
**who authorizes your violence and who pays you.** The fix is **two payers**,
and the reason they want different things is the theme:

- **The court pays for ALIVE.** This settlement's rule of law is brand-new (the
  founding era; the polity is being *built*). A newborn court **cannot
  legitimize itself on corpses** — it needs *trials*. A convicted outlaw is a
  cornerstone; a dead one is a hole in the ground. Lawful ≈ alive because the
  institution needs the ceremony to become real.
- **The folk pay for DEAD.** They don't need a trial — they need him *gone*, and
  someone with a purse and a grudge will pay for a body, off the books. Chaotic ≈
  dead because the people handling their own don't wait on a court that barely
  works yet.

So dead-vs-alive now genuinely rides the axis — not because of the *act*, but
because of *who pays and what it does to the institution*. Bring him in alive →
you **strengthened the young court** (nation-building). Put him down for the
folk → **folk-justice done the old way, outside it.** The eternal frontier
tension (rule of law vs. the vigilance committee), mapped to our governance
axis, founding-flavored, ratification-safe.

### The counted/uncounted geography (the old map trick, reborn)

Our combat already encodes this: **defeat and the coup are two separate acts,
and the coup only *bites* where there are witnesses.** So map it to ground, like
Rainbow-Village-vs-Bewitched-Forest — but now it means Law↔Chaos and it's wired
to real mechanics:

- **The counted settlement = witnessed ground.** You fight the wolfshead here,
  with the order watching, and the witnesses are what hold you to
  defeat-and-haul-him-in. Lawful violence happens where you can be *seen
  answering for it.*
- **The uncounted woods = no witnesses.** Out here, down = dead; you finish it at
  leisure. Chaotic violence happens where it's just you and the deed.

*Where you corner him* becomes *what kind of good person you are.*

### The mirror, out loud

Alignment has been implicit everywhere else; here it gets **named.** The
Warden's ledger records a sworn deputy who brought a man to judgment; the
folk-songs remember the one who walked into the woods alone and came back when
it was done. **Lawful-Good. Chaotic-Good.** Stated — witnessed reputation +
the private mirror, no divine gate (the Law↔Chaos axis is godless and witnessed
by design).

### The no-murder floor (the locked moral axis, made mechanical)

The one thing **identical on both paths** is that you can't murder the innocent.
The deputy can't; the folk-hunter can't. They disagree bitterly about
*institutions* (the free political axis) but *agree*, without argument, that you
don't kill the innocent (the locked moral axis, showing up as a **guardrail**).
The player feels the locked axis as a **wall** and the free axis as a **fork**,
in the same afternoon, with their hands.

---

## The cast

Full sheets to follow in `npcs/`; these are the spine.

### The pair — the two paths made flesh

They agree on everything that matters and split on the one thing tearing the
settlement in half. Both love this place; both want the wolfshead dealt with;
both are Good. They just can't agree whether you save a frontier by *building
the law* or by *doing what the law's too slow to do* — and the disagreement runs
through a **friendship.** The player isn't choosing good vs. evil; they're
choosing a side in an argument between two people who still set a place at the
table for each other.

**Shared fault-line:** they built this settlement's safety together, back when it
was just the two of them and a lot of graves — he wore the badge, she kept the
books. Then the charter came down from the city (the founding) and they split on
it: **she took the Warden's commission and bet on the institution; he buried one
child too many while the paper shuffled, handed the badge back, and started
paying for justice out of his own pocket.**

#### Warden Alma — the Hangman's code (Lawful)

Runs a court out of a one-room shack with a strongbox and a ledger she keeps like
scripture — and the court is **mostly aspirational** (she's sworn maybe three
deputies ever; she performs a rule of law one person deep, filing a witch and a
gangster under one identical NOTICE with total procedural gravity, the way Gus
directs traffic that never comes). Wants the wolfshead **alive** because the
first real trial would make her court *real*.

> "I can pay you, and I can swear you, and if you bring him to me breathing I
> can do the one thing nobody out here has done yet, which is give a man a
> *reckoning* instead of a hole. That's slower. I know it's slower. Barlow'll
> tell you it's slower." A small, tired smile. "He's right. Sign here anyway."

*Finish detail:* everything in her office is temporary except the **seal** she
stamps warrants with — heavy, dug out of the ruins, older than the charter. She
brands the founding's brand-new authority with a relic from the dead god-city.

#### Barlow the Undertaker — Warren's code (Chaotic)

**Not** a hothead — the opposite, and that's what makes chaotic-good genuinely
good. His defiance is **disillusioned love**: he's measured this settlement in
graves dug and is done pretending the paper gets there in time. If Alma keeps the
ledger of the living, **Barlow keeps the ledger of the dead** — the true count of
the cost, the shadow-census. Wants the wolfshead **dead** because a trial is a
fantasy that fills his ledger while the city argues.

> He doesn't look up from the plane. "She wants to give him a lawyer. I want to
> give him a box." A pause. "I'm not angry at her. She's the best of us. She's
> just wrong, and being wrong out here costs more than she's buried, so." He sets
> the plane down. "You want the work or not. I don't swear anybody. I just pay."

*Finish detail:* the parlor runs **cold** (colder than it should — a cooling-curve
cold), and there's a coffin in the back, finished, sized, sanded, with **no name
on it.** He built it the day the killing started. It's been waiting.

### The wolfshead — "the Gallant" *(warrant: Cole Mercer)* (marquee bounty)

The man the pair are arguing about. He robs the **Line** (the TPA — our
stagecoach/train) with a smile and a speech, and half the frontier *loves* him
for it — the papers coined him "the Gallant," and he styles himself the little
guy's champion (*I only take from the Line, and the Line takes from everyone*).
Concrete, notorious, over-documented — the **opposite of a cipher.**

And he's a **killer.** He's a legend everywhere except *here* — this settlement is
the one that stopped cheering, because up here the doors went quiet and the quiet
doors are his. His trick is that he **launders his own bodies through his story**
(*"I never touched those folks — the Line's guards touched them"*). He kills and
keeps the halo. Not cartoon-*evil* — something truer and quietly scarier: **the
warm face over the taking, the beloved thing that hollows the town that cheers for
it.** A small, punchable, frontier-scaled avatar of the exact enemy the whole game
is about (Moloch/Mara — capture wearing a friendly face). The perfect *first*
villain: bite-sized Moloch you can put in a box.

**Why he *is* the argument:** he's engineered to split the pair. Alma wants him
alive because convicting *a man people love*, fairly, on the record, is the
bravest possible first trial (and the one she might *lose* — he'd give a jury the
speech of his life). Barlow's certain he'll walk, because he's watched charming
men walk his whole life. Neither is wrong. The villain doesn't just *enable* the
fork — he **is** the fork, made flesh.

**Voice** — the charm and the vanity running-gag:

> "There he is — the *kid.* They finally sent somebody worth the story. Now —
> before we do whatever we're about to do —" he taps the poster, offended,
> "— *wolfshead.* Some clerk writes 'wolfshead' where my *name* goes. Thirty
> years I built that name. You spell it right on the box, at least. It's G-A-L—"

…and the drop, because he's a **fight**, not a debate:

> — and then his hand's already moving and the charm goes out of his face like a
> blown lamp, and there's nothing behind it but a man who's done this a great many
> times and was never once sorry.

**The fight (the showcase):** his **crew** are your fodder (mostly monstrous —
he's press-ganged goblins and a terminal-drone or two for muscle; a couple human
toughs who can *yield*), the **dynamite gag** is his signature (he blows the
strongbox, the Line's coin raining down — BOOM, cartoon-safe, you're fine), and
*he's* the poise duel that matters. The fork lives in **how it ends:** alive =
capture (honor the down-window, backed by the militia) / dead = the coup in the
uncounted woods (final, alone).

**Underneath:** the warrant names him something small and plain — *Cole Mercer*,
a name nobody's used in thirty years — and taken alive, the man in Alma's court is
*shorter* than the poster, older, tired. Barlow, watching: *"They're always small,
up close. That's the part the songs leave out."*

*(Light collision nod: older flyers on the board bill this same face as a snake-oil
"Doctor," a "Count," a war hero — he's genre-shopped his whole career.)*

---

## The crossroads — "The Last Counted Mile" (the hub)

The hinge the whole area swings on. A geographic thesis teaches the axis before a
word of dialogue:

> **In the old land, Good and Evil were two different countries** — you walked
> west to one and east to the other. **Here, Lawful and Chaotic are two doors on
> the same street, ten feet apart** — and the thing that actually wants to kill
> you is out in the woods past *both* of them.

Law and Chaos aren't opposite territories; they're **neighbors who disagree.**
The old crossroads forked the *road* (good-place vs. evil-place). Ours doesn't
fork the road at all — both paths lead into the same woods. It forks between two
**people.**

> The warden's road gives out here in a rut of pink ruin-glass and pine needles —
> the last graded mile before the counted world quits. Two buildings face each
> other across the street, close enough to argue. On the left, whitewashed and
> straight, a **charter office** — a lantern burning in the window in broad day, a
> heavy seal sitting in it like something dug up, and the Warden in the doorway
> with a ledger open on her arm. On the right, a lean-to that smells of pine
> shavings and cold, a shingle that just says **BARLOW**, and past the door the
> pale ends of coffins stacked and waiting. The Undertaker's out front with a
> plane in his hand, and he does not look up. Between them, on a leaning post, a
> **board.** And past them both the road runs on into a treeline that has gone
> quiet — the particular quiet of woods with something listening in them.
> Somewhere in there, close, something huffs.

Behind the player is the way in from campus (the threshold that keeps the big folk
out — our version of the old level-cap `wall`, sized for newcomers). Ahead is
everything that's going to try to kill them.

### The board — the argument, in writing

The board is **contested**: Alma nails up the official notice; Barlow amends it in
charcoal. The posting *itself* shows both paths fighting over the same man.

> **NOTICES · by order of the settlement charter · all wolfshead · all DEAD OR ALIVE**
>
> ▸ **the man billed as THE GALLANT** — *warrant: Cole Mercer* — robber of the
> Line, wanted for the quieting of the doors along this road. **alive** to the
> charter office, for a reckoning on the record.
> ▸ one (1) gentleman, out of the fog. works with a knife, takes his time.
> ▸ one (1) witch, cottage, deep wood. do not eat the sweets.
> ▸ one (1) — *[blank]* — came through the terminal. do not attempt to communicate.
>
> — see the Warden to be sworn —
>
> *[beneath, heavier, in charcoal:]* the office is closed more'n it's open.
> dead's honest work too. see Barlow. bring a lantern.

Four bounties (crime / gothic / fairy-tale / sci-fi), **every one forking the same
way** — the mix teaching *un-genred world*, the fork teaching *the axis*. The
Gallant is the **marquee** (the quest climax); the others are the variety (other
fights the player can pick, so the world reads un-genred and agency is real).

### The choice, and its honest asymmetry

Three things you can do here, and the asymmetry *is* the meaning:

- **Knock on Alma's door and get sworn.** The lawful move is the *deliberate*
  one — take the oath, get the badge (real conferred deputization) and the warrant.
  An extra step. The Hangman's inconvenience, and the point. Now you're a
  **deputy**: backed, bound, on the record, owing a live reckoning.
- **Take the poster off the post and just go.** The chaotic move is
  *frictionless* — nobody's permission required, the state of nature. An **unsworn
  hunter**, free and alone. Going without the oath is already the chaotic choice.
- **See Barlow.** The chaotic path's **paymaster and mentor** — the folk purse if
  you bring the Gallant back in a box, and the veteran's-eye truth.

**Neither is lesser.** Law is more work and it *backs* you; chaos is free and
you're *on your own.* Same paycheck, different standing, different soul. The room
never tells you which to pick — it opens two doors and lets you feel which hand
you'd rather shake.

### Staging

This is the **last safe ground.** Everything past the treeline is the curriculum
(fodder → the human → the Gallant). The first monster (the **Wolf**) is *audible
from here* — a threat you can see from safety, drawing you in. One seam to fill:
the **veteran who walks you into that first kill** (the master-apprentice teacher
combat wants). Cleanest version is **path-doubled** — a grizzled militia deputy
takes the sworn newcomer out; Barlow (or a folk-hunter) takes the unsworn one — so
even your *tutor* reinforces the identity you picked.

---

## Systems this area exercises

- **Combat** *(deferred-rpg — this area is a forcing function)*: the poise loop,
  terms/consent/blame, aggression-setting guardrails, defeat≠death + the
  two-stage coup, the threat graph (the crew), master-apprentice teaching, the
  summoned combat card.
- **Alignment / governance-record** *(built substrate)*: Law↔Chaos derived from
  institutional-vs-folk conduct; witnessed reputation via **regard/renown**; the
  private **mirror**. Moral axis stays locked Good (the no-murder floor).
- **Employment / Contracts** *(shift-and-wage engine built; bounty = piece-work
  Contract sibling — an extension)*: the wanted poster as a Contract (issuer /
  hunter / target; authorization-legitimacy = the poster), two payers (court coin
  vs. folk purse), same paycheck / different standing. **Violence-for-contract,
  not loot-the-corpse** — the economic thesis made concrete in a newbie's first
  fight.
- **Belief / recognition** *(built)*: the yield-and-recognize beat; the possible
  second-pass flourish where the margin's collision makes a *person* look like a
  monster and you swing before you recognize them (ties the species-prejudice
  theme).
- **Scene composer / register** *(built)*: path-tinted fodder prose (deputy vs.
  hunter voice over the identical kill).
- **NPC behavior + dialogue** *(slate)*: the pair, the veteran tutor, the
  Gallant's patter and the drop, crew that yields.
- **Lore/spine**: the census/count (the "last counted mile," the wolfshead as the
  uncounted man), the founding-era fragile court, the ruins (Alma's seal), the TPA
  (the Line he robs, the terminal the sci-fi bounty came through).

---

## Open questions

1. **Area name** — working "the Newbie Wilds"; in-world candidates the Marches /
   the Margin / the Last Counted Mile. Pick one.
2. **The board's non-marquee bounties** — lock the four-corner spread
   (gangster / gothic-gentleman / witch / terminal-thing), swap corners, or trim
   to 2–3 marquee bounties carved deep instead of wide?
3. **The veteran tutor** — one figure or path-doubled (deputy-side + folk-side)?
   A new carve, or fold into Barlow / a militia NPC?
4. **The human-line NPC (lesson 2)** — who is the person who catches your hand?
   (Staging: right after a monster stretch, reflex primed.) A wanderer, a
   settler, a crew-member who yields — or the richer "looks like a monster" beat?
5. **Where does *An Honest Count* sit relative to entry here** — hard prerequisite,
   or soft (recommended)? Combat is deferred; sequencing is a live-service call.
6. **Room-by-room map** — next artifact after this settles: the threshold, the
   crossroads hub, the shared hunting-woods, the Gallant's lair, and the two
   finish-sites (witnessed settlement-edge vs. deep uncounted woods).
