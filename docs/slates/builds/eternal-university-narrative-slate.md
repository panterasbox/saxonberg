# Eternal University — narrative slate / story bible (working doc)

> **Status: story bible, first pass.** The **first authored narrative** for
> the game — a murder mystery set on the EU campus that doubles as the
> tutorial for the world's *civic instrument* (allegory you can vote on).
> Working arc title: **"An Honest Count."** This slate owns the **story,
> the method, and the reusable engines** the arc establishes; the
> [eternal-university-slate](./eternal-university-slate.md) owns the
> **place**, and [onboarding-slate](./onboarding-slate.md) owns the
> **journey mechanics**. Nothing here is built; much is proposed; the open
> forks are listed at the end.
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
- **It restores the clock that conviction voting lacks.** Our governance
  uses **conviction voting** — a continuous flow, no election night, bad
  for drama. The census is the discrete, dated, everyone-feels-it *beat*;
  conviction voting is the slow churn of fighting over what the count
  *meant*. Census = the beat. Conviction voting = the long tail.
  Complementary, not competing.
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

**The census is also the cohesion spine for a multi-author world.** You
can't enforce plot continuity across many contributors (and players pick
their own canon anyway). So enforce a *shared frame* instead. A census is
a world-wide event with a runup, a peak, and an aftermath that touches
every location and character at once — like weather (which we already
model as ambient shared state). Any contributor, anywhere, writes "the
census is coming" as the air everyone breathes and handles it *locally*,
and it **rhymes** with everyone else's content with zero coordination.
And it's **renewable**: a census recurs, so every cycle re-synchronizes
the whole sprawl on a clock and re-opens the who-counts question with
fresh stakes. This is the most important structural idea in the bible.

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
   property. Personal becomes political; the tutorial "graduates" the
   player toward the city. The Heroes pivot — the floor drops.
3. **The world = an open, distributed, recurring pattern.** The "Census
   Killer" — or the *kind* of killing — is a **shared content primitive**:
   any contributor can author a victim into it, anywhere, as long as it
   fits (categorical victim + administrative M.O. + who-counts motive).
   It renews every census cycle. A crime that is also a multi-author
   engine that runs for years.

**The signature is administrative, not theatrical** — this is how it
stays grounded (Heroes, not Hannibal) *and* on-theme. Not an artist-killer
leaving riddles: a killer who treats murder like **record-keeping**,
styling deaths as *corrections to the rolls*, striking a name because the
name shouldn't be on the list. The violence of legibility, made literal.

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

**Lean (open — see §14): the third option.** A *human* killer taking
orders from a "handler" he's never met — an intimate, authoritative voice
over the aether — whom he *assumes* is human and **is not.** He kills for
an intelligence he believes is a person, for the same structural reason no
one can tell the phantoms from people: the aether is provenance-blind
(§8). The final horror the player uncovers isn't *who* gave the orders but
*what* did. The man with the knife was the most thoroughly deceived person
in the story — pitiable, not cartoonish — and the thing you were really
hunting was never a person at all.

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
real player lands.

- **Mira Sok** *(prov.)* — the one who *brings the problem* ("you notice
  things — tell me I'm not crazy"). Knew Dunny better than she's saying.
  The Encyclopedia-Brown client.
- **Theo Brandt** *(prov.)* — gregarious, knows everyone, can't keep a
  confidence → a *fantastic source*. How rumor enters the system; tells
  you six things, one of them true.
- **"Pidge" / Priya Ghosh** *(prov.)* — quiet, fixes the building, has
  keys she shouldn't, has *been* in the basement → physical access. Scared
  in a way the others aren't, and won't say why. (Candidate for the
  borderline-real: someone the flag-the-unreal detector would wrongly
  damn — the human face on the dual-use hazard.)
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

## 14. Open forks (unresolved — decide before building)

1. **The killer's final shape.** Lean is the **third option** (human
   pawn + non-human aether handler). Alternatives on the table: the human
   *purist* (radicalized, acts alone) and the *process made flesh* (the
   killer literally is an agent). All three keep the administrative
   signature.
2. **The shared census category linking the victims.** The sharpest edge
   of the allegory. Candidates: the **uncountable** (no clean box —
   reservation people, the mixed, the stateless), the **double-counted**
   (suspected Sybils/duplicates, rightly or wrongly), or the
   **enumerators** themselves (killed for what they *know*, like Dunny).
3. **Capstone confrontation:** *proxy-reveal* (you unmask someone real and
   dangerous who turns out **not** to be the killer — floor drops, lean)
   vs *near-miss* (you corner the killer, solved by deduction + a choice,
   and they slip — you've *seen* them now, the thread into the city).
4. **The city thread.** What clue pulls off-campus into Terminus, and how
   much of Terminus we build for it (the place slate keeps University
   Avenue as a standalone landing for now — the city is mostly haze).
5. **Names.** Every *(provisional)* character, and the arc title "An
   Honest Count."

## 15. Dependencies & deferrals (what this leans on that isn't built)

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

---

*See also:* [eternal-university-slate](./eternal-university-slate.md)
(the place) · [onboarding-slate](./onboarding-slate.md) (the journey) ·
[cooperative-slate](./cooperative-slate.md) (the polity the allegory
rides) · [../../design-philosophy.md](../../design-philosophy.md)
(liberal diegesis / un-genred stance). Concrete campus content is staged
generically under `docs/staging/eternal-university/` (per the staging
rules, not deep-linked here).
