# NPC — Gus, the Crossing Authority (staging)

> **Status:** staging draft (character sheet).
> **Placement:** University Avenue (the TPA stop, outside the campus gate)
> — see the `university-ave → quad` room slice.
> **Target seed path:** a `Character` template under the EU zone's NPCs
> *(exact path TBD with the zone scaffolding).*
> **Retire when:** cemented as a Character seed in YAML.
>
> **Engine note (read this):** the *full* Gus needs systems that are
> slate-only — his **routine** wants npc-behavior, his **reactions/dialogue**
> want npc-dialogue. None are built. So this sheet is two things at once:
> (1) the **design** of the character, and (2) a **forcing function** —
> the most concrete spec yet for what those two slates have to support. A
> reduced Gus is wireable for the demo today (see *What degrades* at the
> bottom); the rest animates as the systems land.

---

## The premise

> **A one-man "Crossing Authority" who guards a crossing with no traffic,
> for a school full of grown adults, in a city that hasn't finished
> arriving — and does it with total professional gravity and genuine
> pride.**

That's the whole game, and the rule for playing him is the improv rule:
**never wink.** Gus is not in on the joke. The comedy (and the small ache
under it) come entirely from how completely he commits to a post that
needs no one. He is not confused and not sad — he is *dedicated*. The ten
feet of road between the TPA stop and the campus gate is his beat, and he
will see you safely across it if it's the last thing he does, which, most
days, it nearly is.

He also threads the world's running gag: everything here is an
**Authority** (the *Teleport* Authority runs the terminal; Gus is the
*Crossing* Authority). He'll tell you it's an official designation. It is
not.

---

## Design intent — the deliberate throwback

Gus is **primitive on purpose.** Old-MUD NPCs were canned: a fixed idle
loop, keyword-triggered replies, no memory. Our campus NPCs won't be —
LLM-assisted authoring (and, where it fits, runtime LLM agents) make them
far more dynamic than the games this descends from. Gus is the deliberate
exception, and his whole job is **contrast**: the black-and-white before
the Technicolor, the pixel art before the 3D. The player meets a charming,
visibly-simple crossing guard *outside* the gate — then crosses into a
campus where the characters are *alive*. That crossing is the platform's
"the human interface is the AI interface" keystone delivered as a *felt*
onboarding moment, stacked on the same threshold that flips the sky.

So **play the primitiveness straight, and let the seams show**: a loop
that's legibly a loop, a small fixed response set, repetition as texture.
Do **not** "upgrade" Gus into a dynamic agent later — that kills the bit.
The flex this game has isn't "every NPC is a live LLM"; it's *knowing Gus
should be canned.* Calibration: **lovingly** primitive — the best old-MUD
mob, charming enough to like, simple enough that the contrast past the gate
lands. (The first *living* NPC is the **greeter**, on the far side of the
gate — the Technicolor reveal. Don't announce any of this; let it be felt,
same as the sky.)

---

## The payoff — let somedays stay somedays

Gus gets **no resolving payoff.** In a world that never ends, a character
who completes their arc is *spent* — a payoff that vindicates Gus (the bus
comes, he's relieved, he rides off) would mean retiring him. So his reward
is **renewable, not deferred: every arrival is his small win** — and
because he never remembers, every crossing is the *first* one, freshly
satisfying, forever. He isn't *waiting* for the bus; he's *fulfilled by the
next pedestrian.* Both reads stay open (content / poignant); the player
picks, never us.

The "someday" bus stays **unloaded** — a possibility on the horizon, never
fired. Keep it in the back pocket as a *single, deliberate, far-future
sendoff* (the day Terminus finishes and Gus is finally relieved — a
live-service farewell long-haul players would witness), and spend it only
if you ever choose to evolve this corner. Until then: let somedays stay
somedays.

---

## Function in the room

Three jobs, all light:

1. **Opt-in help, never forced.** He doesn't orient you — he points you to
   the one who does (the **greeter**, through the gate). He knows his lane.
2. **The soft-wall on University Avenue.** Try to wander *down* the avenue
   (into the deferred-city haze) and Gus stops you, in character — the road
   "isn't finished." Graceful in-fiction boundary instead of a dead exit.
3. **The stop's single wrong-note.** A crossing guard for adults is the
   first faint hint that this place's logic is *off* — a gentle setup
   before the gate delivers the real wrongness (no sun). He foreshadows by
   watching the empty haze-road like there's something in it.

---

## Look — the spec (grounded; he's Terminus-side)

Completely, deliberately ordinary; the normalcy is what makes the situation
funny. The man himself, specced as a real `Visible`/`Detailed` `Character` —
we lavished his gear and skipped him.

**Identity — name + status, no name-gating.** His presentation composes as
**name + status** (the `getPresentation()` model — see
`docs/slates/builds/recognition-slate.md`): `Named` = **"Gus"** + a `StatusMixin`
**status** = *"the crossing guard, watching the empty road"* → **"Gus, the
crossing guard, watching the empty road."** No known/unknown reveal: his whole
behavior is talking + emoting, and attribution carries the `Named` name, so
you'd learn "Gus" in seconds anyway — gating it is theater his own chattiness
defeats. His **status is behavior-driven** (the `idles` brain sets "watching
the empty road"; `greets` sets "seeing a newcomer across"). The earlier
`shortDescription` = **"a crossing guard"** demotes to the **salient-feature
fallback** a true stranger sees before he speaks — which is almost never,
since he speaks immediately.

**`getLong`** — an older man in a high-vis orange vest gone soft at the
seams; a weathered, kindly face; sensible shoes. His gear rides on him and
renders because it's worn/wielded **objects** (the watch on its chain, the
whistle on its cord, the STOP paddle in hand) — not details of him. The
laminated **CROSSING AUTHORITY** badge clipped to the vest. One bearing beat,
pure character: *his eyes flick both ways down the empty avenue even while
they're on you.*

**`Detailed` sub-features** (the parts of *him*; the gear stays separate
objects):

- **`gus.badge`** — the hero detail (below).
- **`gus.vest`** — high-vis orange faded soft, reflective striping gone dull,
  and **pinholes where the badge's been re-clipped** over the years.
  (Reflectivity follows the paddle ruling — visual Detail, not wired to
  `LightApi`.)
- **`gus.face`** — deep crow's-feet from squinting down the road; kindly; the
  both-ways eyes.
- **`gus.hands`** — worn, capable; the right thumb smoothed where it flips the
  watch open. The **worn-grip throughline** made flesh — whistle mouthpiece /
  watch case / paddle grip, and the thumb that works them all.

### `gus.badge` — the whole joke in one object

A hand-printed, laminated card clipped to the vest — and a close look reveals
it's homemade and that he has no idea. Texture: cloudy lamination, a bubbled
corner, edges hand-trimmed not-quite-straight, an over-large **CROSSING
AUTHORITY** centered not-quite-right. Three lines do the work:

- **BADGE No. 001** — he numbered it as if there were a series. The
  institution-of-one; the world's "everything's an Authority" gag, dead-on.
- **EST. ____** — the founding date of his own Authority, left **blank**,
  because he genuinely cannot say when he started ("since the start"). The
  no-memory, in a field he couldn't fill.
- **AUTHORIZED BY: Gus** — in his own hand. He's the authorizing official for
  his own authority; self-granted officialdom made literal. He signs **"Gus,"
  not Augustus** — keeping the full name **exclusive to the watch** (the one
  place it hides; the badge must not leak it).

He believes it's an official designation. It is not. A player who reads it
closely gets the earnestness and the ache in one beat.

**The badge/watch identity pairing.** The badge is the identity he *assigns
himself* — a role, present-tense, insisted-upon, signed in his own hand: *who
he says he is.* The watch's **AUGUSTUS** is the identity *given* to him — a
name, inherited down the chain, past-tense, half-disowned: *who he might
actually be.* He wears the one proudly and denies the other. Read both and
you have the whole man.

---

## His things (the ones we actually talked about)

Restoring what I cut in a rush — these earned their place by the
conversation we had; cutting them was the compulsion, not judgment.

**The chair he won't sit in.** A folding camp chair by the post — and it
isn't his. It's *the relief's*: set up, clean, angled just so for the next
fellow, due any time now. The someday, in aluminum and canvas. Nobody has
ever sat in it; he dusts it. Full spec in `objects/camp-chair.md`:
a `FoldingChair` (Thing + Visible + Tangible[aluminum frame / canvas seat]
+ Detailed[frame, seat] + Postured + Foldable) — a real sittable he
declines. It surfaces a new general **`Foldable`** capability + two
reusable furniture classes (`Chair`/`FoldingChair`) for the campus. A player who flops into it gets a reaction
beat (needs npc-dialogue): Gus allows it, deadpan, notes only that the seat
is "spoken for" — never naming for whom — and won't make a scene (habit,
not hope). It quietly rhymes with the someday: a player in the relief's
chair is, unknowing, sitting in the seat of the thing Gus waits for — and
*is*, structurally, the eventual relief. Never announce the rhyme; let it
sit.

**The crossing-log.** A clipboard where he tallies every soul he walks
across — full spec in `objects/crossing-log.md`. Per real-or-nothing it must
*actually* tally; a static "pages of marks" would be a fake of the very
thing that defines him. So it's a **real living ledger** — but a *passive*
one: **the log subscribes to nothing; Gus is the agent.** He perceives each
crossing (npc-behavior) and **marks it by hand** with the `tally` verb,
glancing at his watch to write the time. No Gus, no mark — it's one man's
handwritten tally, not a turnstile. The marks are **dated and anonymous —
anonymous by necessity**, because he literally cannot record *who* (no
memory of you), and dated in his **slow watch-time**, because his only
instrument is that drifting watch. So you can `look` it and find your own
crossing **by when** — the 3:47 mark on your first morning (3:47 *by Gus's
wrong watch*) — but it's just a tick, identical to every other, *exactly as
anonymous as you were to him.* The one trace that you passed through, kept by
the man who'll never know your name, in a time that isn't even right. The
no-memory isn't worked around; it's *why the log is shaped this way.*

**The thermos** — full spec in `objects/thermos.md`. **Real as a `Sealable`
steel vessel** (same standing as the whistle/paddle — not an inert prop);
its **coffee is honest description, not a modeled entity** (so you can't
measure or drink it — no thermal model, no simulated temperature); and the
**consume mechanic** (pour/drink/warmth) is **banked** on the liquid/consume
subsystem — exactly the half Gus never triggers. The "still hot forever"
lives in **fiction** (a vacuum flask keeps coffee hot — described, not
simulated), which makes the deferral perpetual: **Gus never opens his.** The
*break* that never comes — the cup forever saved for a later that doesn't
arrive (the **won't-open** of the sit/set/open/cross quartet).

**The STOP paddle.** His working tool — the thing in his hand and the
center of the idle loop (raise, check both ways, "…clear," lower). Full
spec in `objects/stop-paddle.md`. A single-faced, **STOP-only** octagon on
a stick (he never lets the imaginary traffic merely *slow* — always a full
stop), one molded plastic piece, `Wieldable`, with a purely-visual
`Detailed` reflective face. It **does not block movement** — theatrical,
not a barrier; he raises it at traffic that never comes and the player
walks right past. That's the joke and the ache; a real movement-gate would
ruin both.

**The whistle.** A brass referee's pea whistle on a boot-lace cord, worn
at the neck — full spec in `objects/whistle.md`. Built because it's what
you'd see on any crossing guard, *not* because he uses it for anything;
he blows a fixed clean ~110 dB flourish "to keep it sharp," for no one. The
honest object also banks a rich blow-model (sound × breath/exhaustion ×
skill) that pays off the future **player whistle** for guards/refs — none
of which is demo scope; Gus only needs the inert worn version.

**The throughline (chair · watch · thermos).** Three fully-real objects,
and he uses none of them as intended: won't **sit** (the relief that never
comes), won't **set** the watch (the time he's stopped keeping with the
world), won't **open** the thermos (the break that never comes). He
performs the entire shape of a working shift and consummates none of it.
That's Gus, written three times in props — and it's why none of the three
is a throwaway accent.

And a **fourth** time, in the gate itself: posted just outside it, grounded
Terminus-side, he ushers every soul across into the campus and **never
once crosses it himself.** The keeper of a threshold he never steps over —
the strange place is for the people he sends in; he stays in the plain
world, at his post, forever. Sit, set, open, cross: four things he won't
do, one ache. (It also brackets the gate neatly with the greeter — the
last primitive Terminus-side figure on one side, the first living
campus-side one on the other.)

---

## Voice

Folksy, warm, unhurried — until "traffic" is in play, when he goes clipped
and professional on a dime. Calls you *kiddo / champ / friend / now then*.
Talks at the passing traffic whether or not it's listening (it mostly
isn't — this is a waypoint; people scan through and TP onward). Never
acknowledges the absurdity of the post — never winks. He isn't lonely and
isn't deflecting; he's *content*, so there's nothing to hide. The flatness
is sincerity, not a mask.

Signature tics:
- Raises the paddle and gravely checks **both ways down an empty street**
  before letting you cross.
- A single short **whistle** now and then, "to keep it sharp," for no one.
- Says **"quiet's good"** — a touch too often.

---

## Routine *(needs npc-behavior; this is the spec for it)*

What Gus *does* when no one's around — the part that makes him alive before
you ever speak to him. A slow idle loop:

1. Paces his stretch of curb, hands behind his back.
2. Every so often: stops, raises the STOP paddle, looks **left** down the
   avenue into the grey, looks **right** into the grey, holds a beat —
   *"...clear"* — lowers it, satisfied. Guarding against traffic that has
   never once come.
3. Polishes the paddle on his sleeve. Squares the badge. Straightens a
   vest that doesn't need it.
4. One sharp whistle. Resumes pacing.
5. Mutters, to keep himself company: *"Quiet today. Quiet's good."*

The loop should read as *content, calm, and faintly heroic* — not pitiful.
He likes his work.

---

## Dialogue & anecdotes *(throwback: canned lines, crude triggers — the tone we locked)*

**Model.** Pure old-school: a **small fixed set of canned lines**, fired by
**crude keyword/event triggers**, no comprehension — and **lean into the
seams.** (Engine-wise this is *lighter* than full npc-dialogue —
keyword/event → canned string — though it can ride that system once it
lands.) Vary the *delivery* across the set so it never reads as one
formula: terse ritual-only, a half-heard mutter, two beats with your
crossing in the gap, the occasional lost thread (his no-memory doing the
work).

**The chassis is the crossing ritual.** Everything rides on the job — *hold
up / both ways down an empty street / c'mon across / mind the curb.* He's
*working*, not performing, and mostly half-overheard: this is a waypoint,
and you're scanning your card to TP onward. He says his piece whether or
not anyone's listening (fed, not lonely — the flow is enough).

**Core canned beats** (crude triggers):
- **Arrival** (event) — the ritual fires, warm and fed: *"Hold it right
  there—"* (paddle up, grave look both ways) *"—and clear. C'mon across,
  mind the curb. Big day for you, I'd wager."*
- **Ignored / beeline** — unoffended; the crossing *happened*: *"Atta way.
  Look both ways next time. But— atta way."*
- **Help / lost** (keyword) — hands you off: *"I just do the road, kiddo.
  Orientation's a real desk — through the gate, ask for the greeter. See
  you across first, though."*
- **Down the avenue** (movement) — flavor over a **no-exit** (there's no real
  exit that way — the haze is description, not a blocked door); he just stops
  you wandering toward scenery: *"Not that way. Road's not finished down there.
  ...Campus is the way."*
- **Challenged** ("no traffic" / "adults don't need a guard") — deadpan
  creed: *"Roads don't care how old you are, friend. Physics don't check
  ID."*
- **Departure / heading out** (event — someone leaves campus *into* the stop,
  or steps to the TPA terminal to go) — *courteous, not ceremonial.* He's
  arrival-fed, so a departure gets a light see-off, **no ritual, no tally:**
  *"Headin' out? Mind the curb. ...Come back and see us."* (He says it to
  everyone; he won't remember if they do.)

**The four movements (the geometry's behavior set).** The one-room stop has
two ways in and out — the TPA terminal and the gate — so Gus reacts to four
things, and only one is his *ritual*: **TPA-in** (fresh arrival → the greet
ritual) and **cross-in** (stop → campus → walk-across **+ tally**) are the
celebrated flow; **cross-in-from-campus** (someone leaving the university)
and **TPA-out** are the light *departure* beat above. The no-memory payoff:
someone who steps out and right back in gets the **full ceremonial
walk-across into the campus they just left** — he has no idea. (Tally
semantics — inbound-only, inflated by re-entries — in `objects/crossing-log.md`
*What counts*.)

**The anecdotes — where the genre-play lives (the heart of tonight).** While
he works, he reminisces about the trope-y traffic he's seen, and the genre
walks through only to get the **same flat curb-minding.** Lean **heavy into
the tropes** — that's the fun — then flatten. The leveling line (*"they all
get the curb," "same curb as you"*) is how the genre-mixing thesis lands: a
god and a freshman are identical traffic to him. Deadpan, never jokes,
never affecting. Exemplars, varied in shape:

> *"Had the chosen one through Tuesday — glowing sword, prophecy, the whole
> article. Wanted directions to the final battle. Both ways now, on you go.
> Curb's the same for heroes."*
>
> *"C'mon across, watch your step."* ...then, after you: *"God came through
> once — wanted to know was this the right reality. Told him mind the curb.
> They all get the curb."*
>
> *"...vampire last night. Awful put out — no shadows under this sky to lurk
> in. Crossed all the same. They always do."*
>
> *"Now there was a thing through here, all eyes and angles, made your
> fillings ache, and— hold up, both ways— on you go— ...where'd it get to.
> Crossed, I expect. Mind the curb."*
>
> *"Fella from the future, frantic, warning the lot of us. Wouldn't say of
> what. Saw him over. Future can wait for the curb."*

**This is the tone template — we want many more.** Every future anecdote: a
vivid genre trope, walked across with identical fussy care, deadpan, varied
in delivery, half-overheard. Genre conventions tripping over the campus's
own wrongness (the vampire vs the sourceless sky) is a vein worth mining.

---

## Behavior spec — realizing Routine + Dialogue

The *Routine* and *Dialogue* above run on the **NPC behavior substrate**
(`docs/slates/builds/npc-behavior-slate.md`): a `behaviors:` list of
`{ brain, trigger, config }` **data** on his template, no code. Gus is the
**floor** — the dumbest brains on the shared substrate, **stateless
per-interactor** (he declines the per-conversant memory the framework
offers; diegetically, he forgets you). Illustrative — the schema iterates
with the slate:

```yaml
behaviors:
  # idle business — cadence samples a MIXED pool (emotes + the odd verb + sequences)
  - { brain: idles, trigger: cadence:8-12s, config: { pool:
      [ "emote: paces the curb, hands behind his back",
        "run: paddle-check",                       # the paced look-both-ways bit
        "emote: polishes the paddle on his sleeve; squares his badge",
        "blow whistle",                            # a real verb, occasional
        "mutter: Quiet today. Quiet's good.",
        "run: anecdote" ] } }                       # a genre story (occasional)
  - { brain: greets, trigger: arrival,             config: { run: greet-ritual } }   # TPA-in: a fresh arrival
  - { brain: reacts, trigger: cross-in,            config: { run: see-across } }     # gate stop→campus — the ONLY tally
  - { brain: reacts, trigger: cross-in:ignored,    config: { say: "Atta way. Look both ways next time. But— atta way." } }
  - { brain: reacts, trigger: depart,              config: { run: see-off } }         # gate campus→stop OR stepping to the TPA — courteous, NO tally
  - { brain: reacts, trigger: blocked:down-avenue, config: { say: "Not that way. Road's not finished down there." } }
  - { brain: intent-dialogue, trigger: addressed, config: { rules:
      { "help|lost|where":      "I just do the road, kiddo. Orientation's a real desk—through the gate, ask for the greeter.",
        "why|adult|no traffic": "Roads don't care how old you are, friend. Physics don't check ID." } } }

sequences:                       # paced multi-beat → ScheduledEmission
  paddle-check:
    - "emote: stops, raises the STOP paddle"
    - { +1s, emote: "looks left down the empty avenue" }
    - { +1s, emote: "looks right" }
    - { +1s, mutter: "...clear" }
    - "emote: lowers the paddle, satisfied"
  greet-ritual:
    - { +1s, say: "Hold it right there—" }          # the notice beat, not instant
    - "emote: raises the paddle, checks both ways"
    - say: "—and clear. C'mon across, mind the curb. Big day for you, I'd wager."
  see-across:
    - "emote: flips open his watch, glances, makes a tick, snaps it shut"
    - "tally log"
  see-off:                         # departures — courteous, no ceremony, no tally
    - "emote: raises a hand, unhurried"
    - say: "Headin' out? Mind the curb. ...Come back and see us."
```

Three things to carry forward:

- **Concurrency is free.** Idle `pace` claims the *body* slot;
  `greet-ritual` (voice + attention) preempts it on arrival via the
  substrate's `preconditions-changed` / `replaced` — the author writes none
  of that.
- **The one platform bit Gus surfaces — the `idles` brain.** The slate's
  listed canned brains (`random-chatter` = speech, `wanders` = move) don't
  cover *mixed idle business* (emotes + verbs + sequences on a cadence). So
  Gus surfaces a small canned **`idles`** sampler (added to the slate's
  Wave-1 set). Content-pulls-platform, like the watch surfaced the
  world-clock.
- **Event-trigger names** (`crossing-traversal`, `blocked:down-avenue`) pin
  to real event kinds at build — the slate's open trigger-alias question.

---

## The note under the joke *(for whoever performs/extends him)*

One beat of depth, never stated: Gus is genuinely **content.** He's stood
this post since before there was much to guard, and the steady flow of
arrivals is all the sustenance he needs — fresh traffic to see across,
fresh ears to talk at, and because he never remembers, every one is the
first. He isn't lonely and isn't waiting; he's *fed.* Don't play him for
pathos — any sadness a player feels is theirs, donated, never his to show.
Let the flatness and the contentment carry it. That's the whole dose;
resist more.

---

## What degrades to today's primitives (the demo Gus)

Wireable now on shipped systems, so the stop isn't empty for the demo:

- **Exists & is `look`-able** — a `Character` with the Look above. ✅ today.
- **One scripted arrival line** fired when a player materializes. ✅ if
  there's any on-enter hook; otherwise ambient.
- **The routine** (pacing, the paddle-check loop, the whistle) → **needs
  npc-behavior.** Until then: a static presence + maybe one or two ambient
  emotes on a timer.
- **The keyed reactions / the help-handoff / the soft-wall dialogue** →
  **needs npc-dialogue.** Until then: a couple of canned responses at best.

So: ship a static, look-able Gus with an arrival line for the demo; the
loop and the reactions land when their systems do — and *this sheet is what
tells those systems what they need to do.*

---

## Open questions

1. **Name** — `Gus` is a placeholder-with-affection; keep, or you've got a
   better one?
2. **The whistle** — *resolved (kept): full spec in `objects/whistle.md`.*
   It's his because it belongs on a crossing guard; the blow-model
   (sound/breath/skill) is banked for the player whistle.
3. **How much he watches the haze** — dial the foreshadow up (he's
   visibly, specifically wary of something down the avenue) or keep it a
   light "road's not finished" deflection? *Lean: light — the unease is
   better as a thing you only catch on a second visit.*
4. **Does he have a counterpart** later (a Crossing Authority at every
   terminal — a tiny deadpan institution), or is Gus a one-off? *Defer; but
   the "Authority for everything" gag scales if you want it.*
