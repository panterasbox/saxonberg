# Lens: The Interest Curve

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Fresh pass, entry 15 (2026-07-28), revised in place** — third of
> the videos quartet; corrected same day (an earlier draft assumed a
> "no-quests" design — false; quests are a primary arc tool here).
> The original entry read this lens at the onboarding arc; this
> revision adds the two consumers that matter now: the five-minute
> video and the ordinary session. Original in git history.
>
> **Layer interrogated: the game** (arcs are authored or
> system-emitted), plus the videos as experiences in their own right.

## The lens

Draw the player's interest against time. Seven questions: **what
shape is the curve? Does it have a hook? Gradually rising interest,
punctuated by rest? A grand finale more interesting than everything
else? What changes would improve the curve? Is the structure fractal
— should it be? And do playtesters' drawn curves match my
intuition?**

> **From the book.** "The most pleasurable patterns of captivation
> are remarkably similar for everyone" — hook, rising action with
> rests, grand finale. The structure is **fractal**: videogames run
> it at three levels at once (overall game / each level / each
> challenge), and each challenge deserves its own well-shaped curve.
> The empirical check is literal: ask playtesters to draw the curve
> they felt.[^aogd-icv]

## Why our design prompts it

Three arcs need the lens now. The **videos**: a five-minute video is
an interest curve, full stop — hook in the first fifteen seconds,
rising demonstration, a finale that lands the moment. The
**session**: an evening of play draws its curve from three sources —
an active quest arc (authored curve), the world's rhythm (systemic),
and the player's own goals — and the mix deserves checking. And the
**onboarding arc** (the original entry's subject): the exemplar
authored curve, and structurally the game's first quest.

## What the design answers

### The fractal map

- **Challenge tier — covered, once.** Combat is the worked example:
  the narration adapter's escalation (poise bands as rising action,
  beat intensity swelling, the coup as designed climax) is a
  Schell-shaped curve emitted by rules. The moments entry's
  narration-adapter category is this tier's build list: each
  dramatic domain earns its curve.
- **Session tier — quests are the designed answer.** An evening in
  the world has systemic rhythm (shifts, weather segments,
  departures, the bar's social hours), the player's own goals, and
  — this is what authored arcs are *for* — whatever quest is
  currently carrying them: a chunk of narrative with a beginning,
  middle, and end is precisely a session-scale interest curve,
  installed by an author. Quest density and pacing are therefore
  the primary session-curve tool; world-rhythm dials are the
  secondary one; and the playtest should check what sessions look
  like both mid-arc and between arcs.
- **Career tier — strong by construction.** The long arc (arrive
  nobody → livelihood → mastery → property → standing) is a rising
  curve with built-in rests; the essence re-test showed the systems
  grew into it. The finale question is open on purpose (the
  mortal-vessel arc is the designed "grand finale" candidate).
- **Onboarding — the authored exemplar, unchanged**: welcomed →
  oriented → voiced → authoring your own space, with the dorm as
  the first-session finale. Still plottable beat-by-beat; still the
  bar other authored sequences must clear.

### The video curve, made explicit

Applying the seven questions to the five-minute reference-doc form:

- **Hook** — the moment, teased cold: the wall the player can't
  pass, the prose that's about to become physics. Fifteen seconds,
  no logos, no thesis statement.
- **Rising** — the demonstration compounds (the systemic-curiosity
  chain: each answer plants the next question on screen).
- **Rests** — the reference-doc register *is* the rest: a calm
  sentence of real figures between beats. Tone discipline doubles
  as curve discipline.
- **Finale** — the moment, paid off whole (the conferral fires; the
  firewood lights). The exec read rides the descent after the
  peak, never displaces it.
- **Fractal** — the series itself needs a curve: which video hooks
  the series, which is its finale. (Series-order is an interest-
  curve decision, not a stakeholder-priority decision — the two
  orderings may differ, and that's fine.)

### The playtest check joins the protocol

The goal-free first session (the Toy's protocol) gains one
instrument: **ask testers to draw their session's interest curve.**
Cheap, Schell-canonical, and it answers the session-tier question
above with data instead of worry.

## Tensions & risks

- **Between-arc sessions have no authored safety net.** Mid-quest,
  the curve is the author's job; between quests it rides world
  rhythm and player goals alone. If playtests draw between-arc
  flatlines, the fixes are more/better-paced arcs, rhythm, and
  witnessability together — with the prescripting law as the
  balance check (arcs over live systems add stories; arcs that
  script events away subtract them).
- **The reference-doc register caps the video hook's flash.** Our
  hooks must be *interesting claims shown*, not trailers — which is
  harder and slower than a sting. The vitals script's cold open is
  the standing proof it can work; hold that bar.
- **Curves drawn by the designer lie.** Every tier above is my
  intuition of a shape; Schell's last question outranks the other
  six. Until testers draw, all curves here are hypotheses.

## Implications

1. **Every video script ships with its curve drawn** — hook beat,
   rising beats, rest beats, finale — checked against the seven
   questions before recording. Series order gets its own curve
   pass, separate from stakeholder priority.
2. **Playtesters draw curves** — added to the goal-free session
   protocol alongside "freedom or errands?" and Perry's triad
   probe. The session-tier verdict (shape or flatline) is the
   single most valuable unknown this lens can settle.
3. **Narration adapters are the challenge-tier curve budget**
   (shared implication with moments/story-machine): each new
   adapter is a curve where there was a flatline.
4. **Keep the career finale question open but named** — the
   mortal-vessel arc is the candidate grand finale; nothing else
   in the design competes, and someday the lens will ask.

---

[^aogd-icv]: Jesse Schell, *The Art of Game Design: A Book of
    Lenses*, 3rd ed. (CRC Press, 2020) — **Lens #69, the Lens of
    the Interest Curve**, from the interest-curve chapter (re-read
    from the author's Google Play edition, 2026-07). The seven
    questions, the hook/rise/finale pattern, the three-level
    fractal observation, and the playtester-drawn-curve method are
    Schell's; all analysis ours.
