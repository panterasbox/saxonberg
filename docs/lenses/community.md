# Lens: Community

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses* (his neighboring Lens of Friendship and the
> dark-twin Lens of Griefing are referenced as related). Questions
> paraphrased, analysis our own.
>
> **Layers interrogated: both** — text-as-social-fabric is platform; the
> campus's social life is game.

## The lens

Some games create bonds that outlast any single session — communities
that become the real reason people return. The lens asks what your game
does to foster connection: does it give players reasons and means to
form relationships, support friendships forming, and create a community
with its own life? Its dark twin, the Lens of Griefing, asks the
opposite: how can players hurt each other here, and what stops them?

> **From the book.** Schell's point is that the most durable reason
> people return is often *each other* — communities can outlast the game
> itself — and fostering them is deliberate design. His Lens of Community
> asks, tellingly, "What conflict is at the heart of my community? How
> does architecture shape my community? … Why do players need each
> other?" — conflict and interdependence are *generative* here, not just
> hazards. He pairs it with a hard-nosed **Lens of Griefing**: any system
> that lets players affect each other lets some *hurt* others, and "the
> griefer's greatest joy is to find a loophole" — so the lens asks "how
> can I make my game *boring* to grief?"[^aogd-co]

## Why our design prompts it

Because the project treats the social layer as a *co-equal pillar*, not
a feature. "Text-first is social-first"
([interaction-philosophy.md](../interaction-philosophy.md)): conversation
is the backbone, the medium is "literally made of conversation," and the
social substrate is "complete in text." A school is "doubly" social. And
peers are a motivation engine ([Motivation](./motivation.md)) — so
community isn't ambiance here, it's load-bearing.

## What the design answers

- **The medium *is* the social fabric.** Speech, gesture, and reaction
  all reduce to strings; the emote system folds non-verbal presence into
  text ([interaction-philosophy.md](../interaction-philosophy.md)).
  Community is built from the same primitive everything else is.
- **The lounge manufactures connection by construction.** A universal
  social landing that seats you with your people by flavor tag, with
  Dave's bar as a gathering spot ([lounge](../slates/lounge-slate.md)) —
  the design's answer to "give players a place to gather and reasons to
  meet."
- **A full relationship substrate.** Grouping/parties
  ([grouping.md](../subsystems/grouping.md)), chat channels
  ([chat.md](../subsystems/chat.md)), per-Avatar contact lists
  ([contacts.md](../subsystems/contacts.md)), and recognition (the world
  and its people remember you,
  [recognition](../slates/recognition-slate.md)) — the mechanisms
  friendships need to form and persist.
- **Belonging without division.** Academic Houses unify (prosocial,
  campus-wide), while competitive affiliations are gated "past the gate"
  and framed as "house-cup / team-sports energy" rather than war
  ([affiliation](../slates/affiliation-slate.md)).
- **Auditable by construction.** Every action is a visible, attributable
  command on the bus ([interaction-philosophy.md](../interaction-philosophy.md))
  — the substrate-level foundation for moderation and anti-griefing.
- **Community survives any human/AI ratio.** Roles are role-shaped, so a
  scene can be humans, agents, or any blend — "the social experience of
  school survives at any ratio of people to agents."

## Tensions & risks

- **Community needs people, and cold-start has none.** A social-first
  game with low population is a contradiction — the lounge's seating and
  AI-fill fight it, but a sparse server has no community no matter how
  good the substrate. The mixed-human/AI bet *partially* mitigates
  (agents as participants), but AI-presence is not human-community, and
  leaning on it too hard risks a hollow social layer. This is the same
  emptiness risk [The Toy](./the-toy.md) names, at the social scale.
- **Educational community is inherently transient.** Students cycle
  through a course or a term; fostering bonds that *outlast* that churn
  is the hard part. Houses, persistent contacts, and recognition are the
  continuity tools, but the churn is structural and the design has to
  actively fight it.
- **Prosocial-by-design can sand away the thing community rallies
  around.** "Sport not war" is the right calibration, but communities
  also cohere around *stakes* and *rivalry*; over-sanitize and you get a
  pleasant social space with nothing to galvanize it. The dial is real,
  and too far toward "safe" is its own failure.
- **Friendship needs shared stakes the gameplay doesn't yet provide.**
  The substrate (contacts, groups) supports friendship's *bookkeeping*,
  but friendships are forged in shared adventure — co-op challenges with
  something on the line — which is largely deferred gameplay. The social
  *substrate* is ahead of the social *gameplay*.
- **Griefing + minors is a first-class hazard, mostly unaddressed.** The
  same channels that carry connection carry abuse, and a student
  community includes children. The auditable command bus is the
  foundation, but moderation itself — reporting, blocking at scale, abuse
  response — is a gap, and the [Transformation](./transformation.md)
  duty-of-care stakes here are high. (Schell's Lens of Griefing — make
  the game "boring to grief," pair filters with player reporting — is
  the playbook for when this gets built.)

## Implications

1. **Treat population density as core, not incidental.** Cold-start is
   the existential community risk; the lounge's load-balancing and AI
   participants are the mitigation, and managing density deserves to be
   designed as a first-class system, not an emergent hope.
2. **Design explicitly for academic churn.** Lean on Houses, persistent
   contacts, and recognition to carry bonds across a student's cycling
   through courses — make continuity-across-churn a stated goal of the
   affiliation and contacts work.
3. **Calibrate prosocial vs. stakes deliberately.** Keep "sport not
   war," but don't sand off the rivalry and shared stakes a community
   rallies around. The galvanizing energy is a feature; the dial needs a
   conscious setting.
4. **Close the friendship-gameplay gap.** Contacts and groups exist; the
   *shared adventure* that actually forges friendship is deferred
   gameplay. Flag it: the social substrate is built ahead of the social
   reasons to use it.
5. **Make griefing/moderation a real design track, now, because of
   minors.** The auditable bus is the foundation; reporting, blocking,
   and abuse response are not yet designed. Schell's Lens of Griefing is
   the playbook (make it "boring to grief," filter + player reporting);
   route the duty-of-care stakes to
   [Transformation](./transformation.md), and treat moderation as a
   prerequisite for a student community, not a later addition.

---

[^aogd-co]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #98, the Lens of Community**
    (≈ p. 455), from the "Communities" chapter. "What conflict is at the
    heart of my community? … Why do players need each other?" is Schell's.
    The closely related **Lens #96, the Lens of Friendship** and the
    dark-twin **Lens #99, the Lens of Griefing** (≈ p. 456 — "make my
    game boring to grief") are referenced here as neighbors; both sit in
    the "Communities" chapter. 3rd-edition print pagination; lens numbers
    stable across editions.
