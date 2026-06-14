# Reputation slate — charisma, renown, notoriety (working doc)

Working slate for the platform's answer to the D&D **charisma** stat —
and its dark twin, **notoriety**. The short version: charisma here is
**measured, never assigned**. It's an *output* derived from real social
behaviour, not an *input* die-roll. This is the "value as physics, not
RPG" stance applied to social standing.

Built on [recognition](./recognition-slate.md) + the
[belief store](./belief-store-slate.md); scopes through
[social-graph](./social-graph-slate.md) circles; measured via the
[reactions](../tails/reactions-slate.md) substrate; consumed by
[npc-behavior](./npc-behavior-slate.md), economy, and comms.

**Phase: game-design, deferred.** Captured because the design is settled
in shape and load-bearing for NPC behaviour, the substance economy
(brand trust), and the anonymity/disguise system (notoriety is its
counterweight). Not near-term.

---

## Principle — measure, don't assign

In tabletop you *roll* Charisma because you can't actually be eloquent on
command; the die stands in for your character's silver tongue. In a game
where you **type your actual words**, the eloquence is real and present —
abstracting it into a stat would throw away the actual signal. So
charisma can't be an *input* here; it can only be an **output you
observe**. For players especially, their charisma *is* their
communication — there's nothing left to model as a number.

And once you commit to "measure, don't assign," D&D's single scalar
**unbundles into three things, none of which is a charisma stat:**

- **Regard** — per-viewer attitude (does Alice like / trust / find Bob
  persuasive). Per-pair, keyed by the subject → **a facet on the belief
  store**, a sibling of recognition's `knownAs`. This *is* the
  social-graph relationship layer (`knownAs` is one facet of Alice's
  record for Bob; `regard` is the next).
- **Renown** — the global/aggregate standing (Bob is broadly
  influential). **Measured** from real outcomes; **signed** (esteem ↔
  notoriety); **per-circle** (see below). Feeds **fame**, which is a
  recognition *trigger* (the famous are pre-known to all). Renown and
  recognition close a loop.
- **Susceptibility** — how easily a *particular NPC* is swayed. The one
  **authored** knob, and it lives on the **NPC**, not on "the player's
  charisma." When a player persuades a guard, what resolves it is the
  guard's susceptibility + the player's renown + the per-viewer regard —
  never a player CHA roll.

So the stat dissolves into regard (per-viewer, belief store) + renown
(measured aggregate) + susceptibility (authored, NPC-side). The
conflation was the only thing that made it look like one number.

**No die-gating of player social actions.** A good argument works on its
merits + the NPC's authored susceptibility, never blocked by a low roll.
Renown/regard *feed* an NPC's decision (npc-behavior); they don't gate
player input.

---

## Notoriety — the signed twin, and the counterweight to anonymity

Renown is **signed**: esteem (positive) vs **notoriety** (negative).
Both mean "you're known/influential"; the valence differs. Notoriety is
what makes the whole reputation system *matter*, because it is the
**inverse of the anonymity-by-default world** the belief store builds:

> The id-aug world lets you be anonymous by default and *choose* to
> broadcast. Notoriety **revokes that choice**. Behave badly enough and
> the world forces a wanted-broadcast of your identity/description to the
> circles you've wronged — going dark and hooding up no longer hides you.
> Antisocial play costs you the exact anonymity everyone else gets free.
> *Serves them right.*

**Propagation asymmetry (flavour):** esteem is slow and fragile (earned
by word of mouth, bleeds off if you stop contributing); notoriety is
**fast and sticky** (a kill is witnessed, dramatic, retold immediately;
decays slowly or needs active redemption).

**Fame/notoriety symmetry:** they're the *same* anonymity-erosion
mechanic, opposite valence. The legendary hero also can't walk a market
unnoticed — same machinery, the crowd just reacts with adulation instead
of alarm. The celebrity and the outlaw are mechanically the same
creature: *people who became their description.*

**Frontier reset:** reputation rides the same channels as recognition
(aether broadcast, word of mouth, wanted-posters). An unattuned frontier
with no coverage is a **reputation blank slate** — the outlaw flees to
the edge of the map and stays clean until his notoriety goes *global*
(cross-circle). The outlaw arc falls out of the plumbing.

---

## Notoriety pierces disguise — the wanted-profile

The one place reputation reaches back and overrides the recognition
gate. The constraint that keeps it honest: **notoriety doesn't see
through a disguise; it exploits the gaps the disguise leaves.**

A disguise covers *some* features (a hood covers the face, not the build,
the gait, the signature falchion, the red cloak). Notoriety circulates a
**salient-feature profile** — a wanted description — and a profile-holder
**matches the target's *uncovered* features against it.** Piercing
happens entirely in what the disguise *failed* to cover.

This makes two deferred pieces load-bearing:

- **`getDisguise().covers` finally matters** — its first real consumer.
  The hood leaves the cloak, the blade, the hand uncovered: three tells.
- **Recognition-by-description activates** (recognition-slate open
  question #13). The wanted-profile is the recognition substrate run
  *backwards*: a **`watch-for` realm** in the belief store keyed by a
  *feature-pattern → identity*, resolving on a perceived target whose
  uncovered features match past threshold. It's a second resolver in the
  viewer-aware naming step, parallel to the normal one — per-viewer,
  audience-scoped (only profile-holders pierce), additive (the base gate
  is untouched).

**It's a dial, not a switch.** Notoriety degree scales: profile
*richness* (one tell → every catalogued mannerism), circulation
*breadth* (one town → global), match *threshold* (the more wanted, the
fewer tells it takes), and whether scrutiny is *automatic* (a vigilant
guard runs the match passively; a distracted farmer never looks). That
last keeps it physics-not-RPG: not a die roll, *did someone bother to
look* — deterministic on features + attention, and attention is
behaviour.

**Counter-play (it's a game, not just punishment):**

- **Cover the whole profile, not just your face** — the hood is useless
  against a hunter, plenty against a farmer.
- **Alter the features** (shave, heal the scar, swap the signature
  blade) — makes `distinctiveFeatures` *mutable*; altering them
  invalidates the profile. A "lay low and change your look" arc.
- **Flee to circles that hold no profile** — the frontier reset.
- **Reduce notoriety** (redemption / decay), or, at the deep end,
  **acquire a new identity** (aliases — the far frontier, since
  recognition keys on identity and notoriety rides it).

Each crime enriches the profile (witnesses add the limp). Arms race.

---

## Per-circle scoping — same act, opposite reputations

Renown is **not** one global number; it's a **vector over circles**. The
same kill is **esteem** among the bandits and **notoriety** among the
lawful, because renown is aggregated from each circle's reactions. Two
kinds of circle, plugging in at two layers (see social-graph):

- **Egocentric circles** (my friends/foes/guildmates-as-I-see-them) — a
  **belief-store facet** (a bucket tag on each subject, per-viewer; the
  shipped `ContactsMixin`). They feed recognition's render-verbosity and
  *my weight* in others' renown.
- **Objective groups** (the Thieves' Guild, a class cohort — real shared
  `Group`s via `GroupApi`) — the **scope renown is aggregated over**, and
  the membership that *seeds* egocentric recognition (guildmates vouch
  for / introduce each other). The belief store only *references* them.

The bridge: **my egocentric reaction to you counts toward your
allocentric reputation, partitioned by our shared groups.** One reaction
stream → a vector of reputations, one per circle.

---

## Measurement — what feeds renown

- **Reactions / agreement** on message frames (the
  [reactions](../tails/reactions-slate.md) substrate, via emotes) — who
  agrees with you, rallies to you.
- **Recognition-spread itself** is a charisma *sensor*: how fast and
  widely your `knownAs` propagates (introductions, being talked about,
  sought out) is renown. Recognition isn't just downstream of charisma —
  it measures it.
- **Being sought / followed** — people addressing you (`--to`),
  following your lead.

**Anti-gaming = recursion:** weight each agreement by the agreer's own
renown — you're influential if *influential people* respond to you. That
is eigenvector centrality / PageRank over the social-reaction graph,
naturally scoped within a circle. Heavy to tune; **defer the
sophistication, keep the shape.**

---

## NPCs

- An NPC's charisma is the **quality of its authored voice** (content,
  not a stat), and it's **measured the same way a player's is** (do
  players rally to it). So no charisma stat for NPCs either.
- The only scalar that genuinely returns is **susceptibility** (the
  authored knob, NPC-side) for NPC↔NPC resolution where no human judges.
- **Most reputation is shared, not per-NPC.** Fame / notoriety /
  wanted-profiles are stored once (on the subject / a guild bulletin) and
  *read* by every NPC — see the belief-store slate's NPC-viewers section.
  An NPC keeps a personal record only for what *it* learned.

---

## Open questions

1. Valence richness — one signed axis, or distinct facets (respect /
   fear / infamy)? Lean signed + per-circle now; facet-richness later.
2. Decay rates — esteem fast/fragile vs notoriety slow/sticky; redemption
   mechanics. Tuning.
3. The eigenvector weighting — how far to take it before it's not worth
   the cost. Shape now, tuning much later.
4. New-identity / alias laundering (the deep counter-play) — how, if at
   all, you escape an identity-keyed reputation. Far frontier.
5. Mutable `distinctiveFeatures` — the seam where disguise, recognition,
   and reputation meet on one field (covered vs altered).

---

## What this slate does NOT cover

- **Recognition / identification mechanics** — recognition + belief-store
  slates.
- **Bucket storage / notification / display verbosity** — social-graph
  (storage half shipped as `ContactsMixin`).
- **The reactions substrate itself** — [reactions](../tails/reactions-slate.md).
- **NPC behaviour that consumes reputation** (pricing, gates, gossip,
  bounty-hunting) — npc-behavior.
- **Trust-tiered moderation** — comms slate.
- **Cross-player reputation analytics** — the OLAP/BI firehose; a
  separate non-goal.

---

## Cross-references

- **Substrate:** [belief-store-slate](./belief-store-slate.md) (regard +
  the `watch-for` wanted-profile realm),
  [recognition-slate](./recognition-slate.md) (recognition-by-description,
  the anonymity/disguise system notoriety inverts),
  [social-graph-slate](./social-graph-slate.md) (circles)
- **Measurement:** [reactions-slate](../tails/reactions-slate.md)
- **Consumers:** [npc-behavior-slate](./npc-behavior-slate.md), economy
  (brand/maker trust), [comms-slate](../tails/comms-slate.md)
- **Subsystems:** [augmentation](../../subsystems/augmentation.md) (the
  id-aug whose anonymity notoriety overrides),
  [emotes](../../subsystems/emotes.md) (the reaction channel)
