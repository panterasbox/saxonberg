# Lens: Emergence

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Fresh pass, entry 7 (2026-07-28), net-new.** No prior entry
> existed — notable, since this lens names the design's central claim
> ("model the cause; the consequences fall out"). Written against the
> built game.
>
> **Layer interrogated: the platform** (the verb/object architecture
> is substrate); the game and the community supply the nouns it
> multiplies.

## The lens

Five questions: **how many verbs do my players have? How many objects
can each verb act on? How many ways can players achieve their goals?
How many subjects do the players control? How do side effects change
constraints?**

> **From the book.** The lens compresses a five-technique recipe for
> emergent gameplay. (1) **More verbs** — but the ratio of strategic
> actions to basic actions matters more than the count; "one good
> basic action" beats "a slew of mediocre ones" that don't interact.
> (2) **Verbs that act on many objects** — "possibly the single most
> powerful thing you can do to make an elegant, interesting game": a
> gun that only shoots bad guys is a simple game; a gun that also
> shoots locks, windows, food, tires, and messages on walls opens "a
> world of many possibilities" from one basic action. (3) **Goals
> achievable more than one way** — shoot the boss, or drop the
> chandelier on her, or stop her nonviolently; otherwise players
> never look for unusual interactions. Balance warning attached: a
> dominant strategy collapses the space. (4) **Many subjects** —
> checkers with one piece per side is nothing; "the number of
> strategic actions seems to have roughly a magnitude of subjects
> times verbs times objects." (5) **Side effects that change
> constraints** — every checkers move changes what both players can
> do next; "every move changes the very nature of the game
> space."[^aogd-em]

## Why our design prompts it

Because "model the cause and the consequences fall out" *is* an
emergence thesis, and this lens is the one that lets us check it
technique by technique instead of asserting it. It is also the lens
under two claims the fresh pass has already made: systemic curiosity
([curiosity](./curiosity.md) — the infinite question economy is
emergence experienced) and the NetHack accretion thesis
([the-toy](./the-toy.md) — community nouns multiplying against fixed
verbs is emergence *scaled*).

## What the design answers

### Technique 2 is the architecture, literally

Schell's "single most powerful thing" is the mixin/capability system
stated as design advice. Our verbs bind to **capabilities, not
types**: `pour` acts on anything Bulkable, `burn` on anything whose
material combusts, `wield` on anything Wieldable, `analyze` on
everything. An object is a composition of capabilities, so **every
new noun inherits every verb that speaks its mixins** — the
verb×object product grows multiplicatively with content, with zero
new verb code. The gun example runs in reverse here: instead of
teaching the gun new targets one by one (NetHack's hand-coded
method), the substrate makes every target that *physically responds*
respond. This is why the accretion thesis compresses timescales: a
contributed brass lantern multiplies against the entire shipped verb
set on arrival.

### Technique 5 is the shared honest state

Side effects changing constraints is the reconcile-on-read world
described from outside: fire consumes the room's air and mints smoke
that asphyxiates; an *open* door radiates heat and a closed one is a
firebreak — the door's state is a constraint every fire now reads;
rain fills the floor's pool, the pool conducts, the room's shock
constraints just changed; encumbrance rewrites locomotion; injury
edits the combat menu (fracture → gambit gone); a hide degrades as
you run. Nothing perturbs one system only — the channels all read
and write the same honest state, so every act is a checkers move:
it changes the space, "whether or not you intended it to."

### Technique 3 — many routes, in systems and in quests alike

Goals achievable many ways is trivially satisfied when goals are
player-authored — the sharper test is inside authored structures,
and combat passes it deliberately: kill, subdue, disarm, shove,
outlast, accept a yield, flee, intervene in someone else's coup —
the boss-monster example's nonviolent out is a first-class verb
here, not a hidden path. Money likewise: wage, craft, consignment,
tips, proprietorship. And the test applies to **quests** with full
force: an authored arc over honest systems inherits multi-route
resolution *for free* (any real obstacle admits every real
approach) — the discipline is simply never to script it away. A
quest whose gate only opens to the intended verb has thrown away
the substrate's best property.

### Technique 4 got built as its own layer

Subjects-×-verbs-×-objects gained its subjects term deliberately:
parties, hireable mercenaries, NPC brains you can employ and roster,
haulage animals, businesses, and — most explicitly — combat
formations, a *policy layer over multiple subjects* (set the
formation, watch it unfold). The formations build is technique 4
executed as a subsystem.

### Technique 1 is where the discipline lives

The bloat warning is why the verb surface is curated: subcommands
over new verbs, affordance-gated visibility (verbs appear when their
capability is present — the menu *is* the strategic-to-basic ratio
made visible), command categories held closed. And the scripting
layer moves verb-growth to the player side: `def` composes shipped
verbs into new ones — strategic actions minted from basic actions by
players, which is the ratio improving itself.

### Emergent balance: the dominant-strategy warning, answered by physics

Schell's caveat — one dominant option collapses the space — is
usually answered by tuning. The design's first answer is *reality's
own trade-offs*: multi-channel physics breaks single-axis dominance
by construction. Metal armor wins against blades and betrays you to
shock and heat; reach wins at distance and reverses inside; the
turtle defense invited the feint; plate's historical dominance is
priced in mass, encumbrance, and coin. No material dominates every
channel because no real material does. Where dominance sneaks in
anyway, the combat gym exists to find it — headless matchup matrices
hunting exactly this collapse. Balance-by-honesty first,
measurement second, tuning dials last.

## Tensions & risks

- **Honest models can still have honest optima.** Reality contains
  genuinely best answers (there *is* a best conductor), and a
  learnable world means optima are discoverable and shareable. The
  defense is context-dependence (channels, situations, cost), not
  denial — but some degenerate strategies will be real, and the
  answer must be economic (price it) or social (the polity), never
  a dishonest nerf. The no-fudge rule binds hardest exactly here.
- **Emergence is only as wide as the shared state.** A system that
  keeps private state (its own hidden gauge, its own untouchable
  rules) multiplies against nothing. The channels compose because
  they read the same materials, the same rooms, the same bodies.
  New systems that don't write into shared state are content
  islands — sometimes fine, never emergence.
- **The verb×object product explodes the test surface.** Every
  contributed noun times every shipped verb is a combination nobody
  reviewed. The gym pattern (headless matrices) covers combat;
  nothing equivalent covers, say, arbitrary items in fires in
  storms while encumbered. Property-based tests over channel
  invariants (conservation, monotone bands) are the scalable
  answer, and mostly still to be written.
- **Emergence reads as chaos without legibility.** A player who
  can't see *why* the constraint changed experiences emergence as
  randomness. The handles rule ([the-toy](./the-toy.md)) and honest
  narration are what convert "interacting systems" into "a world
  that makes sense" — emergence and legibility must ship together
  or the depth reads as noise.

## Implications

1. **The slate checklist gains its sixth question:** *which term do
   you multiply — subjects, verbs, objects, goal-paths — and which
   shared state do you write, i.e. whose constraints do your side
   effects change?* A system that multiplies nothing and writes no
   shared state must justify being an island.
2. **Prefer nouns to verbs when growing the game.** Technique 2
   says a new capability-speaking noun multiplies the whole verb
   set; a new verb must earn its interactions one by one. This is
   also the accretion thesis's operating rule: the community's
   cheapest high-leverage contribution is nouns, and the three
   missing extensibility bridges (item-effect envelope, brain
   catalog, scripted-behavior brain) are noun-rails — their
   priority follows from this lens.
3. **Balance-by-honesty is the declared posture:** trade-offs from
   physics first, gym-style measurement second, priced-in-economy
   third, tuning dials last — and never a dishonest nerf. Dominant
   strategies that survive all four are reality teaching something;
   document them, don't fudge them.
4. **Channel-invariant property tests are the emergence test
   strategy** — conservation, band monotonicity, no-silent-state —
   because enumerating the verb×object product is hopeless. Worth
   a dedicated testing slate.
5. **Emergence ships with narration.** Any new cross-channel side
   effect needs its perceivable trace (the scene line, the hint,
   the analyze row) in the same build — the depth must be readable
   or it reads as dice.

---

[^aogd-em]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #30, the Lens of Emergence**,
    from the game-mechanics chapter's emergent-gameplay section (read
    from the author's Google Play edition, 2026-07). The five
    questions, the five techniques, the gun/lock/window example, the
    "subjects times verbs times objects" magnitude estimate, and the
    checkers constraint example are Schell's; all analysis ours.
