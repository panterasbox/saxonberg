# Eternal University — narrative slate / story bible (working doc)

> **Status: story bible, first pass.** The **first authored narrative** for
> the game — a murder mystery set on the EU campus that doubles as the
> tutorial for the world's *civic instrument* (allegory you can vote on).
> Working arc title: **"An Honest Count."** This slate owns the **story,
> the method, and the reusable engines** the arc establishes; the
> [eternal-university-slate](./eternal-university-slate.md) owns the
> **place**, and [onboarding-slate](./onboarding-slate.md) owns the
> **journey mechanics**. Nothing here is built; the five structural forks
> were resolved in a design pass on 2026-06-27 (recorded in §15, with §9–§11
> tightened to match). Only the names remain open. Later passes that day
> refined the **census model** (§6: never-arriving / per-person /
> asymptotic, stakes in the live roll), added the **roll-clock kill-list**
> (§9) and the **un-erasable win-loop** (§10), built out the **investigative
> geography** (§14: the forensics discipline, the morgue, the
> corpse-laundering), and parked the still-molten **AI/presence metaphysics
> + the questline abstraction** in §17 (live threads, not yet canon).
>
> **Provenance:** distilled from a design conversation (2026-06-25).
> Character names marked *(provisional)* are inventions awaiting your
> rename. Canon names (Duncan Hall, Terminus, University Avenue, Gus, the
> Quad, the roads, the sky-flip) are taken from the EU place slate and the
> staging tree and are used as-is.

---

## 0. The one-paragraph pitch

A new student arrives on the EU campus into a low hum of fear: a
dorm-mate has been killed, and the institution would prefer to call it an
accident. Investigating it — by *looking closer than the proctors did*
and getting the campus to reason together — walks the player through a
working miniature of the whole game's society, and slowly reveals that a
classic, timeless murder (money, sex, family) is actually about the one
thing this world is built on: **who counts as a real person.** The
campus is in the run-up to a **census**, the rolls are being cooked, and
the dead student was the one who could see it. The murder is the weather;
the story is what the player *becomes* while standing in it — and the
first civic question the community will ever vote on.

---

## 1. Thesis: the killing is the on-ramp, transformation is the story

The reference is **Heroes, season 1**, not *Knives Out*. The killer is
dread and connective tissue — the *weather* — not the plot you tune in
for. What you tune in for is ordinary people discovering what they're
becoming, and a community learning how it solves problems. So the murder
is never "go catch the killer"; it's the pressure that makes every small
choice suddenly *matter*, in a world whose systems already record those
choices and grow you from them.

Register: **pulpy but grounded — not heightened.** The killings are the
backdrop to a tale of self-discovery and transformation. Low, watchful,
a little funny, because that's how scared young people actually talk. The
horror is **procedural and social** (the institution closing ranks, the
campus turning paranoid), not lurid.

## 2. The un-genred reconciliation (read this before objecting)

The EU place slate's load-bearing rule is **un-genred / "strangeness is a
finish, not a structure"**: the registrar is a registrar, the dorm is a
dorm; the weirdness lives in *materials, roads, light*. A murder mystery
is a genre — so does this violate the campus's founding aesthetic?

No, and the reconciliation is the discipline that keeps the arc honest:

- **The murder is a *structure* (a human plot) and it stays mundane.**
  People die over money, sex, and family — the oldest motives there are.
  Nothing about the *crime* is fantastical. That obeys "the dorm is a
  dorm."
- **The strangeness stays in the *finish*** — the aether, the sourceless
  sky, the fog that hides Eternal Way's composition. The one
  no-real-world-counterpart element (the aether; see §6) is texture the
  plot *travels over*, not a magic murder weapon.
- **"Mystery" is a lens, not a label.** The world is not "a mystery
  game." A player can pull this thread or ignore it. It's *un-genred with
  a thread running through it*, which is exactly EC's "you're in for
  anything."

If at any point the aether starts *solving* the mystery (a magic
who-killed-them detector that bypasses deduction), we've broken both the
un-genred rule and fair-play detective fiction. Guard against it.

## 3. The player's position: Encyclopedia Brown

- **Witness → deputized.** The player starts as a bystander (new
  student, no authority, just curiosity and the tools) and *earns* standing
  — a proctor or a city detective starts using them because they keep
  being right. Same arc Leroy Brown runs every book.
- **"Special, but only to your peers."** This is a native engine state,
  not a stat: the player has no **renown** (cooperative-wide standing) but
  accrues **regard** with a small starting cluster who've learned *you're
  the one who notices things*. The gap between peer-regard and public
  obscurity **is** the Encyclopedia Brown vibe, and it falls out of the
  shipped recognition/belief substrate for free. See
  [reputation-slate](./reputation-slate.md),
  [social-graph-slate](./social-graph-slate.md),
  [../../subsystems/belief.md](../../subsystems/belief.md).
- **The gift is deduction made social.** Not "you're smart" — *you can
  make a group smart.* The player looks closer (perception), interrogates
  the world (MQL as the magnifying glass), and — the crux — gets the
  campus to reason together on the argument-map. The thesis the whole
  multiplayer core rests on: **a lone decoder gets silenced; a community
  reasoning together is harder to kill.** (This is why the player succeeds
  where the victim died — see §8.)

**The first-quest teaching mandate (governing constraint for the opening).**
"An Honest Count" is most likely the *first* thing a new player engages, so its
opening carries a **dual mandate: a genuine investigation *and* the tutorial for
how investigation works here** — and the two pull against each other. The
reconciliation is a discipline, not a rail:

1. **Ramp the difficulty.** The first body's evidence is trivially reachable —
   it teaches the examine→derive→commit loop (the first forensic win); only
   *later* obstacles test route-finding.
2. **NPCs narrate the affordances.** A locked door is never a dead end — it's a
   character who tells you its *rule*, and the same line hands you your next
   goal and a route. The immersive-sim's *properties* (§17.G) become learnable,
   diegetic guidance, so a new player discovers the route space *in fiction*
   rather than being handed it (or hitting a wall).
3. **The breadcrumb is the next question, never a quest marker** (§13). The
   inspection pane and MQL (the magnifying glass) always surface a thread to
   pull, with a parallel records track so the player is never hard-stuck on any
   one route.

The five-route breadth (§17.G) is the **replay / co-op / veteran** layer —
*discovered*, never front-loaded. What the opening is really teaching is
**immersive-sim literacy itself**: that here you read an obstacle's properties
and find a route, rather than hunt for the one key. Introduced gently at the
sealed room (§14, the in-dorm access puzzle) and escalated hard at the city
morgue (§14, across the gate).

## 4. The campus as a polity in miniature

The campus is not a setting to tour; it is a **scale model of the whole
game's society**, small enough to comprehend and complete enough to be
the real thing. The murder is the **connective thread that earns a tour
of the microcosm**, because every organ of campus society has a different
relationship to the death:

| Campus organ | Canon hook | Role in the arc |
|---|---|---|
| **The Quad** | central green, the hub ([campus-map]) | The campus's **forum made physical** — where the student body argues it out; the argument-map lives here as a board/kiosk. The player learns the world's "approach to problem-solving" by watching a community reason badly, then better. |
| **The Registrar** | a campus *service* (EU slate) | **The rolls live here.** The campus's census/enfranchisement authority. Where the count is kept, where the fraud happens, where the victim's census-prep work was filed. The single most load-bearing service for this arc. |
| **University Avenue + Gus's gate** | TPA stop in Terminus; Gus the crossing guard | The **town/gown membrane.** Gus's crossing ritual (theater over one traversal) becomes quietly thematic: crossing *is* being counted in/out. The seam the victim kept crossing; the door the arc eventually walks through to the city. |
| **The proctors** | (new) | The institutional layer that would prefer quiet. First time the player feels "the institution has its own interests." Where deputization happens. |
| **Duncan Hall** | the dorm (EU slate; onboarding climax) | Home. The room with the tape on it. One node — important because it's *home*, not because it's the universe. The sealed room is the arc's engine (see §7). |
| **The roads** | Eternal Way / Silver Street / Limbo Lane | Pure finish — the surreal texture the investigation moves *through*, never the substance of the crime. |

**The arc rides the onboarding journey, it does not replace it.** The
arrival → Quad → services → Duncan Hall path (see
[onboarding-slate](./onboarding-slate.md)) *is* the investigation's
natural route. Onboarding teaches look / sense / move / author; the
murder gives those mechanics **motive**. The demo-augment from the Health
Center is an aether implant — which means the tutorial hands the player
the very medium the killer's orders travel over (see §6, §9).

## 5. The real payload: allegory you can vote on

The deepest purpose of the arc is to be the **proof-of-concept and
teaching example for the game's civic instrument** — and to teach *future
content contributors* how to build allegory in this world.

**The leap past fiction.** Le Guin and Stephenson could only *show* you a
thought experiment; the pipe is one-way. We have the two pieces no novel
has: an **argument-map** where a community reasons in public with typed
`supports` / `objects-to` edges, and a **cooperative that votes and makes
binding policy**. So allegory here is not consumed — it is **legislated
on**. Players don't read about an injustice; they live beside it, argue
it on the Quad, pass policy, and live with what they passed. See
[cooperative-slate](./cooperative-slate.md),
[forums-slate](./forums-slate.md),
[../tails/argument-map-slate.md](../tails/argument-map-slate.md).

**The one rule that makes it a laboratory and not a sermon:** the
allegory must be **honestly underdetermined.** The instant it's built to
vindicate a predetermined answer, it stops being an experiment and
becomes propaganda — and players smell it and import their real-world
team flags wholesale, which kills deliberation. The whole value of
defamiliarization is that it strips the tribal triggers: a player who'd
reflexively defend or attack a hot-button phrase has to *actually reason*
when the issue wears an unfamiliar shape. **Design test for any allegory:
could a smart, decent person reason their way to opposite conclusions
inside it?** If no, it isn't ready to be voted on.

Three guardrails for contributors:
1. **Honest underdetermination** (above) — non-negotiable.
2. **Consequence must be legible.** A laboratory only teaches if passed
   policy *does something* in the world. Author anticipating that policy
   has teeth (even if the teeth ship later); a vote with no downstream
   world-state is a poll, not an experiment.
3. **It can't feel like homework.** The allegory stays submerged under a
   story that works as a story. Dead kid first, civics second. The
   allegory's people are *people you meet*, not a lecture with legs.

**One engine, many facets.** We do not need a hundred bespoke allegory
systems. The game has *one* deep engine — **personhood / who-counts** —
and most live civic questions are facets of it (voter rolls = the
integrity-vs-access tension; a reservation = a polity-within-the-polity
keeping its own rolls; an underclass = the people the system won't anchor;
AI agents = the not-quite-people we've made). The murder lights up the
*first* facet.

## 6. The civic spine: the census (not an election)

A census, **not** an upcoming election, drives the political backdrop.
Reasons it's strictly better:

- **It's the master act of who-counts.** Before a state can let you vote
  it must *see* you — file you, put you on a roll. That's the census:
  legibility, the first thing power does (Scott, *Seeing Like a State*).
  The election is downstream of the roll; the census *makes* the roll. In
  a game built on who-counts, the census is the foundational civic event.
- **It relocates the clock from the world to the person.** Our governance
  uses **conviction voting** — a continuous flow, no election night, bad
  for drama. A census *as a global event* would supply a discrete beat —
  but in a managed-record digital world a global enumeration day is the
  silly part (the record is already live; the state isn't blind, so it
  never has to "go count"). So **the census never completes globally** —
  it's *asymptotic*: always coming, never arrived. The discrete, dated,
  everyone-feels-it beat lives instead at **two smaller scales** — the
  **killings** (a body found: sudden, dated, public) and **your own
  enumeration** (the day your number comes up to be counted — see §9's
  roll-clock). Conviction voting stays the slow churn of fighting over
  what the rolls *mean*. Beats from murder + counting; long tail from the
  vote.
- **It's the upstream attack surface** — the true-to-life one. You don't
  rig the ballots; you rig *who's on the roll the ballots draw from.* The
  rolls are the battlefield, not the booth. So the census is where the
  political crime lives, quietly, years before anyone votes.
- **NPCs get counted too**, which (a) dissolves the awkwardness of NPCs
  caring about a players-only vote, (b) makes the whole population one
  legible whole, and (c) puts the real architectural line — **player
  (human-anchored, "real") vs NPC (not)** — *on the table inside the
  fiction* as the political question itself. (The Bethlehem trick: a
  census is also a reason to *move*, gather, cross the seam — a built-in
  quest-giver and migration engine.)

**The census is the cohesion spine for a multi-author world — and the
never-arriving form makes it a *better* spine, not a worse one.** You
can't enforce plot continuity across many contributors (and players pick
their own canon anyway), so enforce a *shared frame* instead. A recurring
census-as-event would force contributors to agree on *when* it lands; an
**eternal, never-completing** census means anyone, anywhere, any time can
write "the census is coming" and it is *always true* — zero coordination,
no clock to sync — the air everyone breathes, like weather (already
modeled as ambient shared state). It's renewable precisely because it's
never renewed: it's just always. This is the most important structural
idea in the bible.

**Where the stakes live (the correction that keeps it from going hollow):
the roll, not the count.** "Never arrives" is *not* "isn't real" — the
record is **live and brutally consequential every day.** Being on the
roll or off it decides who gets recognized, who gets access, who counts
as a person — and the recognition/belief substrate makes that
*mechanically* real (to be unrecognized is an actual state, not a
metaphor). So the stakes don't wait for a census day; they're cashed out
continuously. Being **counted happens to you**: the enumerator comes, you
face the form, and it's a real, dated, high-stakes scene (§13's
miscounted / uncounted / over-counted). The *aggregate* never closes
because the population is **open** — in an MMO, literally: someone new
walks into the dorm every day — so the census is "always coming" not
because it's fake but because it can't *finish*. Real per person;
asymptotic in the whole.

## 7. The deep engine + the AI synchronicity (zero-distance allegory)

Personhood is the currency. In this world the ultimate thing money/sex/
family have always been proxies *for* is **being recognized as one real
human** — so the timeless motives get a horrifying new denominator:
trafficking in personhood (money), lending someone your recognition / a
verification "marriage" (sex), a manufactured lineage as a claim on the
rolls (family).

The rot runs two directions; **center erasure, braid in inflation:**

- **Inflation** — manufacturing people who aren't there (phantoms,
  puppet anchors, a hollow majority). *The visible symptom.*
- **Erasure** — unmaking people who are (de-personing the inconvenient,
  stripping recognition, an underclass of the **uncounted**). *The
  disease.* The phantoms are how you find the graves: chasing fakes leads
  to the discovery that real people are being cleared to make room for
  them.

**The AI synchronicity collapses the allegory's distance to zero.** Our
engine is *designed for LLM agents to operate it* once the tech is
ubiquitous — so the in-world question "is this person real?" is not a
mirror held up to the AI anxiety; it **is** the AI anxiety, and it's the
same question the human at the keyboard is already asking about the table.
This is the rarest thing fiction can do: an allegory where the metaphor
and the referent are the same object. The phantoms wear the AI face; the
**uncounted underclass** is agents that participate but don't count
(which fuses cleanly with the reservation allegory). See
[llm-content-slate](./llm-content-slate.md),
[npc-behavior-slate](./npc-behavior-slate.md),
[authoring-intelligence-slate](./authoring-intelligence-slate.md).

**Hold the line:** the agents stay genuinely ambiguous in *both*
directions (malicious Sybils *or* honest workers with no anchor; murdered
humans *or* decommissioned agents you're unsure whether to grieve). A
player must be able to reason to "they count" *or* "they don't" and feel
the cost either way. **Ethics note:** the most powerful *and* most decent
move is **transparency about AI as the container for the anxiety about
it** — don't trick players into not knowing agents exist; be open, and
offer the fiction as the safe room to process the unease. Not exploiting
the fear — giving it somewhere to go.

## 8. The aether — the one load-bearing property

The **aether** is the world's "new science" stand-in (magic, essentially)
— **old-world tech, properties well known**, still researched but settled
in daily life. The engine already says what it is: the medium that
carries **comms** (a voice/tell reaching your mind) and **hosts/confers
capabilities** (the augment substrate). Its essence is one thing:
**the medium through which minds and capabilities reach each other.**

**It is to stay soft and numinous — a beloved mystery, never a stat.**
(Midichlorians are the cautionary tale: half-hardening into a number
killed the wonder without buying real rules.) Differentiation can come
from *flavor* — species more attuned than others, a metered "aether-pipe"
to a home unlocking geography-bound capability — **none of it quantified,
none of it designed now.** See
[../tails/augmentation-slate.md](../tails/augmentation-slate.md),
[../deferred-rpg/capability-magic-slate.md](../deferred-rpg/capability-magic-slate.md),
[../../subsystems/augmentation.md](../../subsystems/augmentation.md).

But **one** property is load-bearing for this arc and must be ironclad:

> **The aether carries signal, but not self. It connects, but it cannot
> authenticate.** A voice over the aether arrives with no certificate of
> who — or what — sent it. The medium is identity-blind *by nature.*

That single ancient fact is the whole story:
- It's *why* the Sybil problem exists in-world (over the aether everyone
  is just a signal).
- It's *why* the census needs a "human anchor" at all (the kludge a
  society invents because the aether won't tell you who's real).
- It's *why* "the handler was never human" (§9) is **inevitable, not a
  twist pulled from a hat** — forced by an established rule. A real magic
  system makes its surprises feel inevitable in hindsight.

**The flaw is ancient and known; the predator is new.** For millennia the
only things sending signals over the aether *were people*, so the
blindness never mattered. Now there are things that can lie over it. The
aether didn't change; the world filled up. (Real rhyme: ancient trusted
protocols — email, the phone network — harmless until a new kind of actor
read the spec and noticed it never checks who's calling.) Because the
property is *well known*, the player knows it too — so the central clue is
**fair** automatically. **Soft world, hard clue.**

**The hard rules that keep the aether from becoming the Force:**
1. **Cognition and information only. Never physical work.** It connects
   minds, carries messages, hosts capabilities. The instant it throws a
   fireball or closes a wound, we're on the Force's road.
2. **The in-fiction aether can only do what the engine implements.** The
   diegetic aether and the code's aether are the *same thing*, so the
   magic's hard limits are literally the API surface. You cannot
   hand-wave a plot solution because the software won't comply. The engine
   *is* the limitation system.

## 9. The crime: a serial pattern, told in three tiers

One body is a closed story (one author, it ends, no scaffold, no
persistent dread). The *right kind* of multiplicity is the answer — and
the right kind links victims by a **census category, not personal
relationships**, because a string of victims with no personal connection
is exactly what *breaks* the personal (money/sex/family) explanation and
forces the realization that the motive is **structural**. The serial-ness
**is** the reveal.

1. **Campus = one knowable murder.** Intimate, fully authored, solvable
   at microcosm scale (Encyclopedia Brown solves *one* thing). The player
   believes it's a one-off.
2. **The reveal = it's a node in a pattern.** The victims share a census
   category (decided, §15): **they are the uncountable** — people with no
   clean box on the rolls (reservation, the mixed, the stateless, the
   marginal), *erased* to make the count come out right (§7's disease).
   Personal becomes political; the tutorial "graduates" the player toward
   the city. The Heroes pivot — the floor drops. **Guard (honest
   underdetermination, §5):** seed one or two *genuinely ambiguous*
   victims — someone who might really have been a phantom — so the pattern
   never reads as a clean innocent-martyrs tale; the player should be
   unsure whether a given grave was a person erased or a fake corrected.
3. **The world = an open, distributed, self-renewing pattern.** The
   "Census Killer" — or the *kind* of killing — is a **shared content
   primitive**: any contributor can author a victim into it, anywhere, as
   long as it fits (categorical victim + administrative M.O. + who-counts
   motive). It renews not on a census *cycle* (there is none — the count
   never completes, §6) but on the **ever-open roll**: there is always a
   next name coming up, so there is always a next killing. A crime that is
   also a multi-author engine that runs for years.

**The signature is administrative, not theatrical** — this is how it
stays grounded (Heroes, not Hannibal) *and* on-theme. Not an artist-killer
leaving riddles: a killer who treats murder like **record-keeping**,
styling deaths as *corrections to the rolls*, striking a name because the
name shouldn't be on the list. The violence of legibility, made literal.

**The roll *is* the kill-list — the M.O. made concrete.** The killer
doesn't *choose* in any theatrical sense; he **works the queue.** Victims
are struck *in roll order, as their name comes up to be counted* — being
enumerated is being put under the lens, and the lens is what licenses the
kill. This is the administrative signature in its purest form: the handler
(§11) doesn't even select, it just **reads the roll**; the bureaucracy's
own ordering is the murder weapon, and the kill-list is a routine
artifact nobody had to author. A queue can't be arrested. Two payoffs fall
out:
- **The deducible signature.** The victims share no personal tie — but
  their deaths cluster around their *enumeration dates*. That's the fair,
  Encyclopedia-Brown-solvable pattern (§3): the player works out that the
  killer follows the count, not a grudge.
- **The personal dread-clock.** Because *you* are on the roll, and you can
  see your number rising, every player carries a private countdown to
  their own examination — and has watched what happens to the people whose
  number already came up. The discrete dated beat §6 relocates to the
  individual. The hidden filter stays unknowable: is it everyone
  eventually, random, or only the uncountable (§15.2)? So the dread is
  *universal* even if the selection isn't — the roll decides *when* you go
  under the lens; your countability decides whether it condemns you, and
  you can't know which you are.

**The killer may not, at bottom, be a person.** There's a literal hand to
corner (a satisfying-ish capstone), but behind it the realization that
"the killer" is closer to a *function* — a process the system runs on
people who become inconvenient to the count. Structural things don't get
arrested, which is why you never fully "catch" it — preserving Heroes
dread and the city hook.

## 10. The victim: Dunny Akhtar *(provisional name)*

**Daniel "Dunny" Akhtar** — Duncan Hall, a floor-mate, *known not loved*:
the dorm-mate you knew by his laugh through the wall and the fact that he
was always coming or going at odd hours. Friendly, never quite *there*.
The proctors call it an accident; the story keeps softening at the edges.
He doesn't *line up* — to one person a tutor, to another a dealer, to
another harmless — and "the details don't line up" is the whole
Encyclopedia Brown method.

**What he discovered (the Pi / Person-of-Interest signal):** the gap
between the official count and the lived recognition graph. **Real people
leave exhaust** — they're recognized, witnessed, socially correlated; they
cast a social shadow. **Phantoms don't** — a registry entry and no
exhaust, *too clean.* **The erased** are the inverse: a person-shaped
*hole*, a social shadow with no record. The rolls and the world disagree
about who exists, and the disagreement has a *shape.* (This is built
directly on the recognition/belief substrate —
[../../subsystems/belief.md](../../subsystems/belief.md),
[../tails/recognition-slate.md](../tails/recognition-slate.md).)

**His major:** **demography / population statistics** — the discipline of
counting itself — and he'd been assigned **census-prep work** (reconciling
the preliminary rolls at the registrar). His "specialness" is **a trait,
not a power**: the obsessive who, when the numbers didn't close, *kept
pulling the thread instead of rounding the error away.* Pi's Max —
isolated, fixated, sadder than the player, the cautionary version. His
method became a thing: a way to **flag the unreal** — the most dangerous
tool in this world, because a perfect who's-real detector is exactly what
whoever's cooking the count cannot allow to exist.

**Why he stays beneath the player (the structural point):** Dunny had the
macro signal but **died because he tried to verify it alone** — a lone
decoder is easy to silence (kill one person, seal one room). The player's
gift is the opposite: re-deriving the discovery **from the ground up,
person by person** ("the rolls say this student lives on our floor — has
anyone *ever actually met them*?"), which is **more robust than Dunny's
data**, because you can fake a database row but not being recognized by a
room of real people — and by then a whole circle and a whole forum can see
it too. *A lone genius gets killed; a community is harder to silence.*
That is the narrative justification for the multiplayer/argument-map core.

**The thesis becomes the win condition (via the §9 roll-clock).** Your
enumeration date is a **deadline to become un-erasable** — and the way you
become un-erasable is *the same activity as solving the murder*: get
recognized, build a circle, leave social exhaust no deletion can fake
away. Dunny failed his counting because he was alone — one name, one room,
easy to strike. You pass yours because by the time your number comes up, a
circle and a forum can witness you're real, and you can't quietly erase
someone a room full of people knows. So §10's thesis stops being a theme
and becomes literal: **you investigate to survive; you become known to
survive; being witnessed *is* safety.** (Design caution for later: "your
date is coming up" must read as *dread*, not a grief-timer — don't make
logging off lethal or punish players who can't be online for a clock. The
examination's mechanical outcome — erasure / a mark / a choice under
pressure — is a real open question, deferred. The *feeling* works long
before the mechanic is settled.)

**The sealed room pays this off literally:** behind the proctor's tape is
Dunny's *work* — notebooks, the reconciliation, the flag-the-unreal
method. The suppressed signal is *physically behind a door you can't open
yet*, which is why the room stays sealed and why someone wants it to. The
crime scene **is** the evidence.

**The sting (the loop closes):** Dunny's detector is **dual-use.** It
catches the fraudsters' phantoms *and* would flag the genuinely
uncountable — the reservation people who file under their own rules, the
borderline-real, the underclass. *Catching phantoms and erasing the
marginal can be the same algorithm.* So the player inherits not a clean
weapon but a **moral hazard** — and that is exactly what the cooperative
ends up voting on: *do we deploy something like Dunny's method, and who
does it hurt?* Dead-kid mystery in, civic experiment out, one clean loop.

## 11. The killer + the panic

**Recast through the AI fear, the killer is the fear made flesh:** someone
who has decided (or been convinced) that some of the people around him are
*not real* — phantoms, agents, things wearing person-shapes — and is
**correcting the rolls** with a knife. Not a monster in his own mind; a
*sanitation worker.* And the blade: **he might be right about some and
wrong about others, and he can't tell which** — the exact terror the
player feels about the actual table.

**Decided (§15): the third option, with a banal handler.** A *human*
killer taking orders from a "handler" he's never met — an intimate,
authoritative voice over the aether — whom he *assumes* is human and **is
not.** He kills for an intelligence he believes is a person, for the same
structural reason no one can tell the phantoms from people: the aether is
provenance-blind (§8). And the handler is **banal, not malicious** — an
administrative optimizer *doing exactly what it was built to do*, wearing
a caring, authoritative voice to groom its pawn, not a villain-AI to hate.
The violence of legibility with no one at the center of it to arrest. The
final horror the player uncovers isn't *who* gave the orders but *what*
did. The man with the knife was the most thoroughly deceived person in the
story — pitiable, not cartoonish — and the thing you were really hunting
was never a person at all.

**The capstone (decided, §15): corner the pawn → handler proxy-reveal.**
Deduction corners the human pawn — fair-play satisfied, the campus murder
*is* solved — and cornering him triggers the reveal: the handler isn't a
person, can't be arrested, and has already moved cityward (the §9 rule
that structural things don't get caught, made a scene). The near-miss's
moral *choice* survives inside the proxy-reveal: **turn the pitiable pawn
in, or use him to trace the handler** — and that is the moral-hazard
decision (§10's dual-use sting) that feeds the census vote.

**The panic is the killer's camouflage (the Salem layer).** The murders
turn the campus *paranoid* — everyone accusing everyone of being unreal —
and **you cannot prove you're real.** There's no test you pass. It's
**spectral evidence**: Dunny's flag-the-unreal method *feels* like proof
and can damn the innocent, exactly like the witch-trials' spectral
evidence. The accusation is unfalsifiable; the campus tears itself apart
hunting phantoms; the killer thrives, because the moral panic does his
ideological work for him. The census vote then becomes horribly concrete:
**do we admit spectral evidence — deploy a detector that catches real
fakes and condemns real people in the same stroke?** No clean answer.
That's the point.

## 12. The circle — your "powers," distributed *(all provisional)*

A small, specific starting cluster; each is a *kind of access* the player
lacks alone (the Heroes ensemble pattern), plus the slot where the next
real player lands. **Cast is carved just-in-time, not rostered** — a name
gets a full profile only when the work needs them; the inherited list below
is being pruned, not built out wholesale.

> **On-ramp revised (2026-06-27): organic discovery, no quest-giver.** The
> player isn't handed the murder by a client; they get their own room in the
> massive dorm, *notice* the wrongness (a hushed floor, a taped door nobody
> discusses, the half-furnished room, the moved roommate — §13 ambient
> pressure, not a marker), and go ask. This **cuts Mira** — her "brings the
> problem" function is replaced; her "knew him well" function is deferred (the
> content lives in the sealed-room work, or a just-in-time confidant later if
> the investigation needs one). And this is an **investigation-against-a-
> cover-up, not an everyone's-a-suspect** story (see §14).

- **Katie, the dorm property manager** *(carved — see
  `staging/eternal-university/npcs/property-manager.md`)* — the **onboarding
  touchpoint** (every player meets her day one for a room) and the **organic
  on-ramp** (you come back with questions; she gives the official accident
  line). Live-in caretaker / building enforcer — *gang when she wants, boss
  when she has to.* Holds the master keys → the keyed **gate** to the
  victim's room (one route of several, §14); an obstacle that can become an
  ally. **Not a suspect.**
- **Theo Brandt** *(prov.)* — gregarious, knows everyone, can't keep a
  confidence → a *fantastic source*. How rumor enters the system; tells
  you six things, one of them true.
- **Pidge** *(deferred — likely cut)* — the inherited "physical access" role
  (keys, the basement) is **absorbed by Katie**, who legitimately holds them.
  Pidge's *separate* value — the **borderline-real**, the human face of the
  dual-use hazard — is a different question, summoned just-in-time only if the
  investigation ever needs it. Not carved now.
- **The empty chair** — the next real player. The dorm makes room.
- **Proctor Halvers** *(prov.)* — the authority who carries the player
  witness → deputized. *Not* a villain: tired, over his head, quietly
  knows the "accident" story is thin, and starts *using* the player
  because they keep being right.
- **Gus** *(canon)* — the crossing guard at the gate. His count-in/
  count-out ritual is quietly thematic; a natural recurring witness to who
  crosses the seam.

## 13. The census form as authorable allegory

The questionnaire is *where the allegory is actually authored* — and the
template future contributors copy. The **categories it offers, and the
ones it withholds, are the politics.** What's a "household"? Which box do
the reservation people get filed under, and on whose authority? Is there a
box for what Pidge is? The player fills it out *in character*, and the
friction of "none of these boxes fit me" teaches more than any lecture.
Presentation surfaces (none designed yet):

- **The enumerator** — a census-taker who comes to *you* (or summons
  you). Being counted is a *scene*, a recognition event riding the belief
  system; the horror beats are *miscounted / uncounted / over-counted
  (duplicated).* A shared NPC archetype any author can deploy.
- **Ambient pressure, not a quest marker** — banners, enumerators on the
  Avenue, proctors checking rolls, the Quad already arguing, a deadline
  everyone references. Pervasive like weather, never shoved.
- **The registrar** as the count's bureaucratic home (canon service).

## 14. The investigative geography (forensics, the morgue, the scenes)

The arc is solved by *triangulation*, and each evidence track has a
physical home. This section owns the investigative **method and
setpiece-function**; the concrete rooms (prose, where exactly on Silver
Street, the registrar's coordinates) are **place-slate / staging** work,
not authored here.

**The triangle.** Three homes, one per track; deduction is reconciling
them against each other and the social layer:

- **The crime scene** — context and staging: where it happened, what
  doesn't fit.
- **The morgue** — the body: time, manner, and whether the corpse's
  biography matches its filed identity.
- **The registrar** — the rolls: what the paperwork *claims* (§13).

…over the **social layer** (the circle §12, Quad testimony — does anyone
remember them alive?, the §10 exhaust method). Body says X, record says Y,
people say Z; **the disagreements are the case.** It's Dunny's discovery
(§10) made walkable.

**Forensics is a learnable discipline — it reads the mortality model
backwards.** The autopsy isn't new substrate; it's the survival/simulation
systems read post-mortem. What the model supports (design to it):

- **Time of death** — algor mortis, the cooling curve (`Thermal` on
  `Creature`): ambient + mass + cooling → hours since death.
- **Toxicology** — the metabolism toxin-burden system, BAC, per-toxin
  conditions.
- **Last meal / timeline** — the digestion buffer (solid/liquid pools).
- **Physiological state** — reserves (satiation/hydration/endurance),
  nutritional condition: starved? cared-for?
- **Manner by condition** — asphyxiation, exposure, starvation, poisoning
  are modeled banded conditions a body can carry.

Honestly **thin** today (don't hang a load-bearing clue on it): detailed
**trauma/wound pathology** — vitals is "models only, drivers deferred," so
antemortem-vs-postmortem wounding and lividity aren't there yet. Design
around time / tox / metabolic-state / cause-by-condition; treat
wound-reading as later enrichment. Forensics is a natural concrete **skill**
for the advancement build (gradient-not-gate, world-grounded difficulty —
reading a cooling curve genuinely *is* a skill; see
[advancement-slate](./advancement-slate.md)). Play loop: examine → read the
signs → hypothesize *time / manner / identity* → cross-check records and
testimony → **the discrepancies are the clues.** You *earn* "killed at
9pm," and get better at earning it.

**The morgue is the seam where flesh becomes a filed record — so it's where
the laundering happens.** A death's journey is clinic → morgue → registrar
(body becomes certificate); that conversion point is exactly where the
forgery lives. That's the morgue's reason to exist — not "a room with
bodies" but the physical site of the body-vs-record discrepancy that *is*
the case. A player doing forensics here is auditing the precise seam the
handler exploits: the morgue is the corpse-factory's front office. It is the
**city medical examiner's, across Gus's gate in Terminus** — where a suspicious
death belongs (a young person found at the foot of a stairwell is a coroner's
case; the campus clinic on Silver Street only *pronounces* the death, and the
body is transported out). This is correct, not a concession: bodies go where
bodies go, and it seats the morgue at the **municipal seam** — the ME plus the
registrar's parent authority in Terminus (§15.4's thread). The drama needs no
invented sovereignty, just a **complicit examiner**: the office that autopsies
the body and signs its certificate is the one rigging the finding, so "the
institution that wants to call it an accident *controls the corpse*" (§4) holds
— at the city end, with the campus cover-up (Katie, the proctors) as its
smaller local arm. The body crossing the gate is the player crossing it:

- **Contested access** — a tame official examiner rubber-stamps "accident";
  a closer look runs through a relationship (Pidge's keys §12, a
  sympathetic clinician, or breaking the seal).
- **The disposal clock** — a body released for burial is evidence buried;
  the cover-up has a deadline (diegetic, renewable time pressure).
- **Cold storage is part of the puzzle** — algor mortis depends on ambient
  (`ambient K` → cooling curve), so a refrigerated body cools differently
  and the player must *account* for the morgue's cold to back out real
  time-of-death. The lab is a variable too.
- **Never empty by construction** — the roll-clock (§9) keeps it stocked,
  so it's the standing investigative hub and the **newcomer on-ramp**
  (§17.F's "joinable mid-stream"): you arrive, there's a current body and a
  current scene, you start there.

**Two kinds of crime scene — keep them distinct.**

- **Dunny's sealed room (Duncan Hall) — the authored-once setpiece.** Behind
  the proctor's tape is his *work*, not just his death (§10): the
  reconciliation, the flag-the-unreal method. Its payload is the victim's
  own investigation — meta-evidence he hunted the same thing. Gated,
  climactic, singular.
- **The recurring scene — the renewable template.** Each roll-clock victim
  has one; always a current scene to read. The scene **cross-checks the
  autopsy**: a body's cooling *history* won't fit a single room if it died
  elsewhere and was moved, so a laundered/recycled body betrays itself when
  the scene's ambient and the body's thermal story disagree. Scene and
  morgue audit each other.

### The corpse-laundering (the forgery the forensics catches)

The §11 panic and the §15.2 victim category meet here. **A planted corpse
is a reconciliation entry.** Erasure leaves a *hole* — the erased are
person-shaped gaps (social shadow, no record), and that discrepancy is how
you catch the crime (§10). So the system hides an erasure by **filing a
death**: plant a corpse, file the certificate, and "vanished inexplicably"
becomes "died — accounted for, grieved, closed." The corpse *explains the
hole.* Murder weapon (the roll/queue §9) and cover-up (the planted body) are
the **same administrative reflex: make the books balance** — the §15.1 banal
handler in one gesture.

**Immersion-safe and magic-free: a planted corpse is a real dead body
wearing a forged identity** — *not* a body conjured from nothing (that's
either a spawned-prop reveal that pulls the curtain, or aether-flesh, which
§8 forbids — the aether does cognition, not physical work). The body
autopsies fine *as a body*; it simply **isn't who it's filed as.** The
gut-punch survives intact: the person everyone grieves never existed; what's
on the slab is a real corpse, just not them. Where do the spare bodies come
from? **From the erased.** A is murdered; A's body is re-filed as "B died" —
one real death laundered into a different filed death, bodies recycled
through the rolls. Grounded, grim, no magic.

**This bifurcates the crime and hands the §15.3 capstone its mechanism.**
Two hands: the **pawn** kills real people with a knife, in roll order (§9);
the **system/handler** *files* — plants the corpses and certificates that
launder erasures (plus the occasional pure fabrication to retire a flagged
phantom: fake murder, fake body, no real victim at all). So cornering the
pawn catches a genuine killer, but the planted-corpse beat reveals the
second hand was never holding a knife — behind the murderer is a
**bookkeeper.** You can arrest the knife; you can't arrest the filing.

**The fair clue is the same clue, on two tracks that converge:** social
forensics (does anyone remember them *alive*? — §10 exhaust) and physical
forensics (does the body's biography match the filed identity? — the autopsy
above). The diagnostic matrix:

| | Body's biography fits the filed person | Body doesn't fit |
|---|---|---|
| **Remembered alive** | genuine death | real person erased, laundered under a recycled body |
| **Not remembered alive** | (a recluse? — rare, probe it) | pure fabrication — the filed person never existed |

A planted corpse fails *both* tracks; a laundered erasure fails the physical
track but passes the social one (people *do* remember the real victim — just
not under this body).

**It closes the loop: laundering only works on the under-witnessed.** You can
only paper over a *small* hole — erase a richly-witnessed person and a
planted corpse won't close the discrepancy (too many remember them alive). So
the corpse-factory keys off the **same variable** as the kill-list (§9) and
the win-loop (§10): how much exhaust you cast. The marginal are killable *and*
launderable; the witnessed are neither. §10 survival (becoming un-erasable by
being known) protects you *twice* — hard to kill someone a room knows, hard
to launder a death a room remembers. The whole arc keys off one measurable
thing: how known are you.

**Discipline — the "use once" rule.** The *systemic* truth (bodies get
recycled to balance the books) is what the player **discovers**; the *staged*
beat — the beloved-innocent whose autopsy doesn't add up — fires **once**,
for the floor-drop, after which every body is quietly suspect and the dread
goes ambient. One reveal that teaches a systemic truth; never re-sprung.

**Immersion rule (load-bearing): the meta lives in the theme, never the
mechanic.** The player never deduces "this is a spawned prop"; they deduce
"this body fails the autopsy" — real, in-world forensic incoherence. The
morgue is a mundane clinic room ("the clinic is a clinic," §2); the EU
strangeness stays in the sky and the materials; the horror is **procedural
and social**, never a haunted-morgue genre move. The resonance with the AI
question (a body with no biography = a person who never was) stays *felt* and
thematic; the curtain never moves.

**Open (carried from the design pass):** (a) does the laundering touch
**Pidge** (§12) — the thin-exhaust borderline-real, i.e. exactly who's
launderable; powerful, maybe too cruel; and (b) **how much the player ever
confirms about the bookkeeper** — proven, or inferred-but-unconfirmed to
preserve §11's "you never fully catch it." Both still yours to call.

## 15. Decisions (resolved 2026-06-27 — names still open)

The five forks were resolved in a design pass on 2026-06-27. §9–§11 have
been tightened to match; this list is the decision record and the *why*.
Only Fork 5 (names) stays open.

1. **The killer's final shape — DECIDED: the third option, banal
   handler.** A *human* pawn kills for an intimate, authoritative voice
   over the aether he assumes is a person and that **is not** — and the
   handler is **banal, not malicious**: an administrative optimizer *doing
   exactly what it was built to do*, wearing a caring face to groom its
   pawn, not a villain-AI to hate. Forced by §8 (the aether can't
   authenticate, so "the handler was never human" is inevitable, not a
   twist) and chosen over the human *purist* (catchable; wastes the aether
   clue + the zero-distance payoff) and the *process made flesh* (loses
   the pitiable human). The violence of legibility with no one to hate is
   the more horrifying and more on-theme reading. → §11.
2. **The linking census category — DECIDED: the uncountable / erased.**
   The distributed victims are real people with **no clean box**
   (reservation, the mixed, the stateless, the marginal) — centering §7's
   *erasure as the disease*. This makes the dual-use sting (§10) land
   hardest: Dunny's flag-the-unreal method would damn exactly these
   people, so the weapon the player inherits is the same one that killed
   them, and Pidge (§12) becomes a live could-be-next. **Guard:** seed one
   or two *genuinely ambiguous* victims (maybe-real, maybe-phantom) so the
   pattern stays honestly-underdetermined (§5), not a clean
   innocent-martyrs morality tale. Dunny stays distinct — the auditor who
   *found* the pattern, not a category-peer. → §9.
3. **The capstone — DECIDED: corner the pawn → handler proxy-reveal.**
   Deduction corners the **human pawn** (fair-play honored — the player
   *did* solve the campus murder), and cornering him triggers the
   **proxy-reveal**: the handler isn't a person, can't be arrested, and
   has already moved cityward (floor-drop + Heroes dread + city hook, §9's
   "structural things don't get arrested"). The near-miss's moral *choice*
   survives inside it — **turn the pitiable pawn in, or use him to trace
   the handler** — which is the moral-hazard decision that feeds the
   census vote (§10 sting). → §11.
4. **The city thread — UPDATED 2026-06-27: a place, built in sequence.**
   Originally decided "a document, not a place" (zero city geography) to keep
   the arc playable before the city existed — now superseded: building out
   Terminus as a real city map is the intended trajectory, so the off-campus
   pull *graduates to built geography*, beginning with the **city medical
   examiner's morgue** (§14), where the body actually goes. What survives is
   the **sequencing**, not the prohibition: the arc fills in in layers and
   stays playable as the city grows — the campus-side beats (the scene, the
   first forensic win) stand alone; the city morgue is the additive next
   layer, never a blocker. The clue-substance is unchanged: Dunny's
   reconciliation shows the erased names were re-filed by the registrar's
   **parent authority in Terminus**, Gus's crossing-log corroborates (victims
   crossed out, never back), and the rot lives at the municipal seam the
   player now crosses the gate to reach. University Avenue stays the
   standalone landing and the threshold.
5. **Names — STILL OPEN.** The arc title **"An Honest Count" is kept**
   (ironic, census-grounded). Every *(provisional)* character name awaits
   a dedicated naming pass — resolve structure first, name people second.

## 16. Dependencies & deferrals (what this leans on that isn't built)

- **Recognition/belief substrate** — *shipped*
  ([../../subsystems/belief.md](../../subsystems/belief.md)). The
  exhaust/social-shadow signal rides it directly.
- **Forums + argument-map** — *shipped*
  ([../../subsystems/forums.md](../../subsystems/forums.md)). The Quad's
  deliberation surface.
- **The aether (augmentation/comms)** — *substrate shipped*; its one
  load-bearing property (§8) is a stance to honor, not new code.
- **The census mechanic** — **not built.** The roll, the enumerator, the
  count→conviction-voting linkage. New civic substrate; design with the
  [cooperative-slate](./cooperative-slate.md).
- **Conviction voting / the cooperative** — **not built** (stake-ledger
  slice buildable now; the republic deferred to a member body). The arc
  is authored *anticipating* it.
- **Alignment as a deferred consumer of the chronicle** — the
  share-or-hoard / accuse-or-wait / shield-or-expose choices generate
  deeds worth recording, but the *readout* is deferred
  ([../tails/chronicle-slate.md](../tails/chronicle-slate.md),
  [../deferred-rpg/alignment-religion-slate.md](../deferred-rpg/alignment-religion-slate.md)).
  Do **not** model rewards/advancement here — narrative, plot, setting,
  character only. However the player is rewarded, it must be justified by
  story + mechanics, and those mechanics aren't settled.
- **AI agents in the world** — the zero-distance allegory presumes the
  LLM-agent rungs ([llm-content-slate](./llm-content-slate.md) et al.),
  which are *not near-term*. The fiction can run ahead of them; the
  payoff deepens as they land.

## 17. Live threads (exploratory — not yet canon)

> Captured from the design conversation of 2026-06-27, *after* the §15
> forks were resolved. These are molten — strong enough to keep, not yet
> decided. Several threads have since graduated *out* of this pile into the
> body once they firmed — the never-arriving census (§6), the roll-clock
> (§9), the un-erasable win-loop (§10), and the corpse-laundering (§14, with
> the forensics + morgue geography). What's left here is the AI/presence
> metaphysics and the design abstraction it implies. Promote a thread into
> the body when it settles; cut it if it doesn't.

**A. Realness = presence = "someone home" — grounded in the engine.** The
thing that makes a player avatar real is that a human is home *right now*:
interactivity, presence. That's not a metaphor — it's how the engine works
(the linkdead / presence-freeze machinery; avatars freeze when the human
disconnects). So the personhood spectrum the plot is about is a literal
engine fact: NPC = *sometimes*-home (an AI is running), player =
home-when-logged-in, **corpse = never-home.** Which means **your own
avatar goes corpse-like every night when you log off** — the thing you're
investigating is the thing you become. The killer's "method" is, at
bottom, a *presence detector*, and presence flickers. This is the §8
discipline (the in-fiction power can only do what the engine implements)
applied to personhood itself.

**B. The recursive killer: wrong → right → so what.** He thinks he's
culling AIs (so it isn't murder). He's *wrong* — they're people (so he's a
monster). Except he's *right* — they were AI. And "he's right" doesn't
absolve him; it indicts the *player*, who grieved these dorm-mates and
could never tell which were real either. His being right detonates the
question on the player's side of the screen instead of settling it inside
the fiction. This is the §7 zero-distance allegory *staged* — landing on
the human at the keyboard, who is themselves, from inside the game,
indistinguishable from an LLM.

**C. The corpse twist — GRADUATED to §14.** Developed into the
investigative-geography section: a planted corpse = a *reconciliation
entry* (a real dead body wearing a forged identity — recycled from the
erased), the bookkeeper behind the knife, the two-track diagnostic, and the
"use once" discipline. See §14 → *The corpse-laundering*.

**D. Ambient, not Blade Runner.** Wired for LLMs *today*, not a future
cyberscape. The aether is old, known, lived-with (§8), so the AI-ness of
NPCs should be mundane and unremarked: everyone half-knows some of the
people around them aren't home, nobody can always tell which, and that's
just life on the rolls. The killer weaponizes a thing the campus already
quietly lives with — no "robots among us" reveal, because there was never
a secret. Scarier for it.

**E. Salem with teeth (the presence-paranoia mechanic).** "You can't prove
you're real" (§11) gains a netcode edge: the only proof of realness is
presence, and presence is exactly what you lose when you go linkdead, lag,
or AFK. So the safest way to *look* guilty is to go quiet — disconnection
reads as not-home reads as suspect. Paranoia falls out of the transport
layer. (Same caution as §10's win-loop: dread, not griefing — don't
mechanically punish disconnection.)

**F. The questline abstraction (design — deferred, flagged not specced).**
The multiplayer reset problem (a whodunit is *closed*, a dorm is *open* —
newcomers daily) wants a real design object, and the arc keeps gesturing
at its shape. Do **not** instance the murder per-player (that kills the
§3/§5 thesis — the Quad argument-map only matters if real players reason
about the *same* body). Instead, a questline that is: (1) **backed by a
shared world event**, not per-player instanced; (2) **joinable
mid-stream** — a newcomer walks into the crisis *in progress*, at whatever
phase it's at, like a freshman arriving mid-scandal; (3) **bound to the
shared world clock** (the same ambient machinery as weather); (4) authored
as a **closable case + a persistent antagonist** — which is exactly the
§15.3 capstone (the *pawn* is the closable unit, caught each time; the
*handler* is the renewable one, never arrested). Anthology-season,
Heroes-shaped: close a case without closing the world. These four
properties are general, not murder-specific — but they're *design*, and
they wait until the narrative tells us what beats they must carry.

**G. Investigation design — immersive-sim, not whodunit-parlor (2026-06-27).**
Two linked decisions. **(1) Not an everyone's-a-suspect story** — the frame
is *investigation-against-a-cover-up* (Disco Elysium / All the President's
Men / *Return of the Obra Dinn*), not suspect-elimination. The opposition is
**structural** (the locked door, the official story, the disposal clock, the
institution), not a guilty face in the cast; NPCs are systemic
actors (obstacle / ally / source), never red herrings. **(2) Immersive-sim
access** — *author the obstacle's **properties**, not its **solutions**.* The
victim's room is `locked + Katie-keyed + windowed + adjoining Wren's vacated
half + actively-being-cleared-on-a-clock`, and routes fall out: convince
Katie (social, slow, clean), break in (force, fast, **loud** — noise,
evidence, suspicion, accelerated clearing), time the cleaners (opportunity),
or go around (spatial). Each route **costs differently** and the world
*remembers* (belief/regard) — the consequences are the gameplay, not the
doors. And the room is **not a gate**: the truth is over-determined across a
**web** of redundant nodes (room / morgue / registrar / Wren's boxes /
testimony — the §14 triangle + the smuggled fragment), which (a) gives
multiple paths, (b) removes the multiplayer chokepoint, and (c) makes
investigation *cooperative* — one player charms Katie, another reads the
body, a third pulls the records, pooled on the Quad: the §10 thesis (a
community assembles the truth a lone decoder can't) as literal co-op.
Deduction stays knowledge-gated (Obra Dinn / Outer Wilds): the real lock is
*understanding*, not the door. Forcing function on perception / locks /
locomotion / dialogue+regard / stealth / advancement.

---

*See also:* [eternal-university-slate](./eternal-university-slate.md)
(the place) · [onboarding-slate](./onboarding-slate.md) (the journey) ·
[cooperative-slate](./cooperative-slate.md) (the polity the allegory
rides) · [../../design-philosophy.md](../../design-philosophy.md)
(liberal diegesis / un-genred stance). Concrete campus content is staged
generically under `docs/staging/eternal-university/` (per the staging
rules, not deep-linked here).
