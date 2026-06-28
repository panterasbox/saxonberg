# Experience — "The accident is a lie" (the first forensic win)

> **Status:** staging design (experience carve — first pass, 2026-06-27).
> **Kind:** a *player experience* — the murder arc's hook. The first of the
> "An Honest Count" experiences (the menu lives in the bible). This sheet owns
> the **moment-to-moment shape** of one experience; the
> [eternal-university-narrative-slate.md](../../../slates/builds/eternal-university-narrative-slate.md)
> owns *why it matters* (§10 the victim, §14 forensics, §5 the thesis).
> **Placement:** entirely inside **Duncan Hall**, in the window *before the
> body is taken across the gate to the city medical examiner's morgue* — the
> warm service stairwell where Dunny was "found." No new geography here; the
> morgue (the city ME, §14) and its contested-access drama are a later,
> bigger experience (#7).
> **Carves pulled in:** a **corpse object** (real readable post-mortem state),
> an **instrument** to read temperature, and **Dunny's note** (the rule). It
> reuses **Katie** (carved) and the negative-space **victim** (carved) and
> needs **zero new NPCs.**
> **Target seeds:** the corpse object + the note prop + a Forensics
> `Discipline` seed in the catalog + the quest milestone wiring. Paths TBD with
> the EU zone scaffolding.
> **Retire when:** cemented as seeds + quest content in YAML.

---

## The experience in one line

In the first ten minutes, a player who walked in as a bystander **derives,
from a real physical law the engine actually computes, that the "accident" is
a lie** — and the derivation is the fun. Nobody tells them; they earn it. It
is simultaneously the quest hook and **advancement's first piece of authored
narrative content** — the moment the world becomes legible *because you got
better at reading it.*

## The player's path (the beats)

1. **"Something's wrong here."** *(#1 folded in.)* You get your room in the
   massive dorm and *feel* the wrongness — a hushed floor, a taped door no one
   discusses, a half-emptied room. You go ask **Katie** (the property manager
   you met day one) and get the official line: *accident, fell down the service
   stairs, so sad, please don't stir it up.* You have a feeling and no evidence.
2. **You reach the body.** It's still at the scene — pronounced, but not yet
   taken across the gate to the city ME (experience #7). However you get to the
   stairwell (Katie's the clean-but-slow door; she is not the only door — see
   §17.G immsim access), you're now standing over it with the means to look
   closer than the proctors did.
3. **You read the body.** `examine` / `feel` surface its state. Untrained, you
   get **raw readings only** — *he's cold, 26 °C; the stairwell's 22 °C* — and
   it's on you to know what that means.
4. **You apply the rule and reach the contradiction.** Dunny's own note gives
   you the cooling rule; you reason to a time of death that **doesn't match the
   logged one.** The accident story breaks. (The science: next section.)
5. **You commit the finding.** You state the *connection*, not a bare number —
   *"he didn't die at 6 a.m., and he didn't die here."* This is the **milestone
   gate** (next-but-one section) **and** the dramatic beat where the accident
   officially dies. Committing it to **Katie** — the person who's been smoothing
   the quiet — triggers her code-switch (her carve's whole engine); or you can
   record it privately (the truth is over-determined, §17.G). What you do with
   it opens the next experiences (#3 reconcile the Dunnys, #4 the sealed room) —
   and the contradiction points across Gus's gate: an official "accident" ruling
   the body itself refutes means *go see who signed the certificate* (the city
   ME, #7).

## The Weir derivation (the science, made concrete)

Algor mortis is **Newton's law of cooling**, which the engine already computes
(`Thermal` on `Creature`; corpse cooling is called out in
[thermal.md](../../../subsystems/thermal.md)). It reduces to a rule of thumb a
layman can *use*: a body sheds **~1.5 °C/hour** early on, from a living 37 °C.

- Body reads **26 °C**; the stairwell reads **22 °C**.
- Apply the rule: (37 − 26) / 1.5 ≈ **7 hours dead** — well before the ~6 a.m.
  the proctors logged. **The numbers don't agree with the story.** That's the
  gut-punch. *(Illustrative figures — the corpse's true time-of-death is a
  content value, tuned against the live Thermal curve.)*
- **The deepening read (skill-gated):** the body is a touch *too cold* even for
  that, in a warm stairwell — it cooled somewhere colder first. **He was killed
  elsewhere and moved.** Held back as the second read so the first win stays one
  clean derivation; it's the thread that points outward (the city, §15.4).

**Fairness — "soft world, hard clue" (§8/§14).** The rule must be *taught*
diegetically before the player applies it, or it isn't fair-play. The elegant
delivery: you glimpse it **in Dunny's own hand** — a margin note, because the
demographer who counted everything knew how a body cools. The victim hands you
the tool to catch his killer. (That one touch also seeds #5 — his work — and
deepens the tragedy: his gift becomes your method.)

**A real-science grace note for the expert tier:** the linear "1.5 °C/hr" rule
is an *approximation* — true cooling is exponential and slows as the body nears
ambient, so the rule-of-thumb misleads near the end. A skilled investigator
*knows the curve bends*; a novice using the flat rule will be a little off,
which is itself honest and a nice texture (and quietly rhymes with the
"too-cold" anomaly). Pure Andy Weir: the approximation is usable *and* its
limits matter.

## The skill model (the automation ladder)

The settled principle: **a skill is the progressive automation of work the
player first performs by hand.** The novice does the full manual derivation
(this *is* the Weir gameplay, and it's mandatory — your first body, done the
hard way); expertise collapses those steps into an at-a-glance read, *earned by
having done it manually.* The ladder:

- **Untrained, no reference** → *"Cold. Long dead — but you couldn't say how
  long."* Not a dead end: a **prompt** to go learn how a body cools (find the
  note). 
- **Untrained + the note** → you apply the rule yourself and reach the
  contradiction. **The hook lands for everyone.** Watney reasons from
  references; so do you.
- **Practiced** → the read pre-digests the arithmetic for you (*"going by the
  cooling, ~7 hours"*) — because you've proven you know how, the game stopped
  making you crank the handle.
- **Expert** → the whole read at a glance, secondary inferences included (the
  *"cooled somewhere colder"* / *the curve bends* reads), automatically.

`AdvancementApi.bandFor(actor, 'forensics')` branches which tier the next body
presents. **Forensics is seeded here** as a `Discipline` in the catalog —
paying §14's promise ("forensics is a learnable discipline") and making this
experience advancement's first narrative demonstrator.

### How the skill gets credited (no engine watches your math)

We do **not** try to observe the player's reasoning — the real math happens in
their head or on paper where the engine can't see it, and unobservable work
can't be credited. Instead, **credit is content-authored at the milestone:**
the questline declares *"reaching the time-of-death finding demonstrates
forensics"* and mints the credit — an `ActSignature{discipline: forensics,
difficulty, outcome}` → `TranscriptEntry` via the advancement API (exactly how
the shipped substrate is meant to be consumed: authored `practice` credit, not
an estimator sniffing input). **Doing the first body is the rep that makes you
"practiced,"** so the *next* corpse reads cleaner. The forensics ramp of the
whole arc starts at this stairwell.

**The milestone gate is conclusion-committed.** The beat fires when the player
**states the right finding in-world** (the connection — *"not 6 a.m., and not
here"* — committed to Katie or recorded), not merely when they hold the
evidence. This is §17.G's "the real lock is understanding, not the door" made
concrete, and it doubles as the accident's death scene.

**On spoilers — proportionate, not paranoid.** Someone could read the time of
death off a wiki and commit it without reasoning. We accept this, because: per-
milestone credit is **small** (you can't power-level forensics off one body —
real competence needs many reps across real content); skill is a **side effect
of playing, never the goal** (nobody min-maxes a murder mystery for skill
points); and anyone who spoils the answer has destroyed the only thing of value
to themselves — the mystery. The light commit-gate is enough friction; we don't
over-engineer past it.

## What it carves (and what it pointedly doesn't)

- **The corpse as a real object** *(engine ask).* It carries a stamped
  time-of-death and cools via `Thermal` against the stairwell's ambient,
  readable via `examine`/`feel`. This answers victim.md's open Q2 ("how much
  post-mortem state the corpse carries") for the **minimum case**: a readable
  cooling state is all #2 needs (tox/last-meal are later bodies). Bounded and
  concrete.
- **An instrument** to read the temperature *(dial — see Open Questions).*
- **Dunny's note** — the rule-teaching prop; a margin scribble in his hand.
- **Zero new NPCs.** Reuses **Katie** (official line, floor access, the commit-
  scene code-switch) and the negative-space **victim**. The discipline pays
  off: the experience drives, and it happens to need a corpse-object + an
  instrument + a prop, not a cast expansion.

## Cross-references

- Bible: [§10 the victim](../../../slates/builds/eternal-university-narrative-slate.md)
  (the body, the cold tea, the move), §14 (forensics-as-discipline, scene/body
  audit), §5/§10 (the reasoning-from-principles thesis), §8 (soft world / hard
  clue), §17.G (immsim access, understanding-as-lock).
- Carves: [victim.md](../npcs/victim.md) (the body's autopsy is its §"The body"
  section), [property-manager.md](../npcs/property-manager.md) (Katie — the
  official line, the access gate, the code-switch).
- Engine: [thermal.md](../../../subsystems/thermal.md) (algor mortis),
  [advancement.md](../../../subsystems/advancement.md) (Discipline / Transcript
  / bandFor — the skill ladder + milestone credit).
- Influence: the **Andy Weir** lens (derive-the-answer-from-real-principles) —
  this experience is its first and purest demonstration.

## Open questions / dials

1. **The instrument** — how you get the temperature reading. *(Lean: the Health
   Center demo-augment.)* The aether implant onboarding already put in you (§4)
   gains a thermal/vital sense — already in every player's hands, no fetch,
   thematically loaded (the tutorial that handed you the medium now hands you a
   *sense*). Alternative: a **borrowed clinic thermometer** — more grounded, the
   mundane Watney-tool, but adds a small acquisition beat. Pick one.
2. **Who you commit the finding to** — *(Lean: Katie.)* Confronting the cover-
   up's smoother with the physics is carve-free and triggers her code-switch.
   Alt: a proctor (would pull the deputization beat forward — but that NPC is
   uncarved) or a private finding-log (softest commit). Truth is over-determined
   (§17.G), so more than one can be valid.
3. **The Forensics Discipline seed** — its `key`, the verbs/affordances it
   confers, and the difficulty rating of *this* read (the `ActSignature`
   difficulty). Advancement-build detail; sketch it when this goes to
   requirements.
4. **Numbers** — body temp / ambient / true time-of-death are illustrative here;
   tune them against the live Thermal curve so the linear rule-of-thumb lands a
   believable answer and the "too cold" anomaly is detectable but not obvious.
5. **The "moved" read** — confirm it's deferred to the skilled tier / a second
   pass, keeping the first win to the single clean time-mismatch derivation.
