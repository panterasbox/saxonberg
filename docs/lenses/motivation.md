# Lens: Motivation

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Fresh pass, entry 5 (2026-07-28), revised in place.** Re-read from
> the book — which supplied the matrix the original entry lacked — and
> re-run against the built game, whose economy systems are exactly
> where this lens now bites. Original in git history.
>
> **Layers interrogated: both**, and this remains the edtech crux: the
> platform is structurally a recognition machine; the game has to keep
> that from curdling into a carrot machine.

## The lens

Every game is a complex ecosystem of motivations. Five questions:
**what motivations do players have to play? Which are most internal,
which most external? Which are pleasure-seeking, which pain-avoiding?
Which motivations support each other — and which are in conflict?**

> **From the book.** The chapter builds the two axes and then warns
> against collapsing them: **internal/external** crossed with
> **wanna/hafta** (Figure 11.4) — put every motivation in your game on
> that matrix. The cautionary case is guild shame: players "keep
> showing up" to avoid the pain of letting their guild down, "and
> gradually, playing starts to feel like something you 'hafta' do" —
> external pain-avoidance quietly replacing the wanna that brought
> them. And the standing warning: "be wary of those who tell you that
> human motivation is a simple thing." The neighboring Lens of Needs
> (#22) supplies the frameworks — Maslow, and Self-Determination
> Theory's competence / autonomy / relatedness triad, which Schell
> names directly.[^aogd-mo]

## Why our design prompts it

Because gamified education lives or dies here. The hope is students
*wanting* to learn; the documented failure mode — overjustification —
is rewards converting genuine interest into reward-dependence that
extinguishes when the carrot stops. And because the built game is now
a dense **motivation ecosystem** — livelihood, mastery, standing,
property, curiosity, belonging — the lens's ecosystem questions
(support/conflict) finally have a real economy to interrogate, not a
design sketch.

## What the design answers

### The intrinsic core (held from the original entry)

Against SDT the design still hits all three needs by shape, not by
bolt-on: **autonomy** (no hard rails; quests are invitations, never
obligations — goals between arcs are the player's own), **competence** ("what you become is earned" — bands, deeds,
conferral), **relatedness** ("among others who remember you" — now
literal substrate). The standalone principle remains an
intrinsic-motivation guarantee: if the game is fun with the vertical
stripped ([the Toy](./the-toy.md)), the learning rides enjoyment, not
carrots.

### The matrix audit (new — the built economy on Schell's axes)

Running the shipped systems through internal/external × wanna/hafta
surfaces a class the original entry never had to face: **the design
now contains deliberate haftas.** Employment shifts on rosters; the
dorm lease; attendant leases with idle eviction; participation
standing that decays in real time; renown that decays; a withdrawal
quota. A job you must show up for is *the point* — the gamification
mirror thesis builds real-unit models of real life, and real life has
obligations.

The lens forces the discipline that keeps those honest, and the
design already mostly obeys it — now stated as a rule:

> **Every hafta must be entered by consent and exitable.** A chosen
> obligation (you took the job, signed the lease, joined the party)
> sits in the autonomy quadrant even when it binds — quitting is
> always on the table, and nothing punishes mere absence from *play
> itself*. What's banned is the **ambient hafta**: obligation nobody
> chose — streaks, the daily-checklist treadmill (nothing against
> quests, which are narrative arcs; the ban is on chore-lists reset
> at midnight), guild-shame mechanics, decay of things that feel
> like *self* rather than *position*.

That last clause is the live audit item: participation/renown decay
is honest for *standing* (presence in a community fades — it models
something true) but would be corrosive if it ever touched
*competence* (what you've learned staying learned). The current split
— competence never decays, standing does — is exactly right, and this
lens is why it must stay that way.

### Pain-avoidance stays diegetic

The pain-avoiding column in our matrix is almost entirely *in-world*
consequence: bleeding, debt, a crime on your ledger, a fine — pain
your character risks by acting, not pain the *game* threatens you
with for not logging in. Guild-shame is the model of what we don't
build: social-obligation pain aimed at attendance. (Party and
employment systems notably contain no absence-punishment mechanics —
a wage simply isn't earned; a shift simply passes.)

### The ecosystem questions, finally answerable

- **Supporting:** curiosity → mastery (questions lead to disciplines);
  mastery → livelihood (competence earns); livelihood → property
  (earning acquires); property → relatedness (your bar is where your
  people sit); all four → standing. The loops chain — that's the
  economy working as a motivation lattice.
- **In conflict, by design:** participation (quantity) vs. renown
  (quality) — showing up a lot is not being valued; money vs. maker's
  pride (the consignment split, the tip jar); safety vs. curiosity
  (the concealment/hazard systems price poking around). These are
  *productive* conflicts — they create choices, which feed autonomy.
- **The conflict to watch:** the vertical's external hafta (real
  coursework, real urgency) vs. the game's internal wanna. The
  [high-stakes reconciliation](../study-com-strategy.md) is this
  lens's matrix applied to the pitch: the game must never build a
  wanna that *competes* with the learner's real obligations — it
  converts the obligation's *reason* instead (Rico, in
  [curiosity](./curiosity.md): external-hafta study becomes
  internal-wanna study when the question becomes personal).

## Tensions & risks

- **Overjustification stands as the headline risk.** vision.md's
  "desirable rewards for avoided topics" remains a legitimate tool
  and a live hazard; extrinsic scaffolding needs a fade plan, never
  a permanent place. Unchanged, still the top warning.
- **The first sensor is pre-loaded with external pressure.**
  Coursework and grades are already an extrinsic system the student
  didn't choose — the hardest case to bootstrap wanna from. The
  Rico conversion is the only honest route; carrots on top of an
  existing hafta just deepen the hafta.
- **Chosen haftas can still stack into a second job.** Each
  commitment is consensual, but a player holding a shift, a lease,
  a party, and a consignment shelf has rebuilt their calendar
  inside the game. The exit doors have to stay cheap *in
  aggregate*, not just per-system — worth a playtest question:
  "does your character's week feel like freedom or like errands?"
- **Relatedness via NPCs cuts both ways.** An NPC who remembers you
  and wants you back is intrinsic relatedness — and, aimed wrong,
  manipulative attachment. Shared blade with
  [Indirect Control](./indirect-control.md) and
  [Transformation](./transformation.md); the no-manufactured-urgency
  guardrail applies to *characters*, not just UI.

## Implications

1. **SDT stays the named framework; the matrix joins it as the
   audit tool.** Every new system places its motivations on
   internal/external × wanna/hafta at design time — one line in the
   slate. (Slate checklist, fourth entry.)
2. **The chosen-hafta rule is now stated policy:** consensual,
   exitable, no ambient obligation, no absence-punishment, and decay
   confined to standing — never competence. Any future system that
   wants a hafta must show its consent gate and its exit.
3. **Extrinsic rewards remain scaffolding with a fade plan** —
   unchanged from the original entry, re-affirmed against the built
   reward surfaces (wages, prices, tips are *economy*, not
   motivation-engineering; keep them honest trades).
4. **Prefer meeting needs over granting rewards** — unchanged, and
   the built game largely obeyed it: the strongest motivators
   shipped as needs met (authorship, recognition, earned bands,
   belonging), not points granted.
5. **Read with [Transformation](./transformation.md)** — the
   intrinsic/extrinsic axis *is* the healthy-motivation-vs-
   manipulation axis once the player is a student. Unchanged, and
   sharpened by the high-stakes work: for the vertical, this pair of
   lenses is the ethics review.

---

[^aogd-mo]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #23, the Lens of Motivation**,
    Chapter 11 (re-read from the author's Google Play edition,
    2026-07). The five questions, the internal/external × wanna/hafta
    matrix (Figure 11.4), the guild-shame example, and the "human
    motivation is not a simple thing" warning are Schell's; the Lens
    of Needs (#22) carries Maslow and the SDT triad. All analysis
    ours.
