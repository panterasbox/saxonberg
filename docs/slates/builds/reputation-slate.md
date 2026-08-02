# Reputation slate — charisma, renown, notoriety (working doc)

> **Status: game-design layer, renown leg SHIPPED.** The **renown
> substrate has shipped** — see
> [renown.md](../../subsystems/renown.md) (measured per-scope signed
> standing, the reaction + reception signal generators, the per-emote +
> AppSettings value-function, log-saturation). The rest (susceptibility,
> NPC consumers, governance influence, the substance economy's
> brand-trust, the anonymity/disguise counterweight, per-circle consumers,
> the eigenvector trust-weighting) stays deferred: settled in shape,
> captured but not queued.

Working slate for the platform's answer to the D&D **charisma** stat —
and its dark twin, **notoriety**. The short version: charisma here is
**measured, never assigned**. It's an *output* derived from real social
behaviour, not an *input* die-roll. This is the "value as physics, not
RPG" stance applied to social standing.

Built on [recognition](../tails/recognition-slate.md) + the
[belief store](../../subsystems/belief.md); scopes through
[social-graph](./social-graph-slate.md) circles; measured via the
[reactions](../tails/reactions-slate.md) substrate; consumed by
[npc-behavior](./npc-behavior-slate.md), economy, and comms.

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
  notoriety); **per-circle** for social/game, with a single
  cooperative-wide roll-up for governance (see below). Feeds **fame**, which is a
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
lawful, because renown is aggregated from each circle's reactions. (This
per-circle vector is the **social / game** renown; *governance* renown is
a single cooperative-wide roll-up — only persons vote, and they vote in
one polity. See the [cooperative slate](./cooperative-slate.md).) Two
kinds of circle — but only **one** is a renown scope:

- **Objective groups** (the Thieves' Guild, a class cohort — real shared
  `Group`s via `GroupApi`, where membership is *conferred*, not
  self-declared) are the **only scope renown aggregates over.** Renown
  partitions by the objective groups you and the subject *share* —
  objective membership is the only circle carrying information about
  anyone but its own declarer.
- **Egocentric circles** (my friends/foes-as-I-see-them; the shipped
  `ContactsMixin`) are **NOT a renown input.** Membership is unilateral
  self-declaration — zero objective signal — so it can never weight
  another player's standing without reopening the self-dealing / Sybil
  hole. Their only job is **my own attention lens** (recognition
  render-verbosity, notification policy). The weight my reaction carries
  in your renown is **my own renown** (system-derived), never a function
  of my contacts list.

The bridge: **my reaction to you counts toward your reputation, weighted
by my own renown and partitioned by the objective groups we share.** One
reaction stream → a vector of reputations, one per social circle (plus the
single cooperative-wide roll-up that governance reads).

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

### ⭐⭐⭐⭐ Revisited 2026-08-02 — emote valence was a PLACEHOLDER

**(User: *"that whole valence thing was half thought out. it was more a
placeholder for me because I didn't have any other ideas at the time of
ways we could measure standing at the consumer level. now we have much
more game built out so there's more surface to read from."*)**

⭐ **The architecture already hedged for this.** `renown.md`: the log
stores the **"raw, pre-valence signal (no score) so re-legislating the
value-function"** is possible. **Swapping what feeds consumer standing is
the change the raw log was BUILT to allow** — not a retrofit.

#### The principle that demotes reactions

> **Approval is EXPRESSED. Preference is REVEALED. REVEALED BEATS
> EXPRESSED.**

An emote reaction is **cheap talk** — free to give, free to withhold,
socially reflexive, and it measures **approval of one act** rather than
anything about the person. A reasonable placeholder when it was the only
handle; **not the spine now that better ones exist.**

#### ⭐⭐⭐⭐ The strongest signal: someone chose you AGAIN

> **One interaction is an accident. The second is a choice.**

**Repeat engagement is the strongest measure in any real system** —
retention beats rating everywhere, because it costs something and cannot
be performed. Derivable from logs shipped across every subsystem added
since renown: parties re-formed, tables returned to, contracts re-let,
shops revisited.

#### ⭐⭐⭐ Contacts — and why they resolve their own farming problem

Adding someone to a contact list is **deliberate, private, revealed** —
*I want to be able to find this person* — and it is owner-only, so it
cannot be farmed by asking publicly. Against the obvious reciprocal-farm
objection:

> **A contact is a CLAIM. An interaction is a DEED. Standing rides
> deeds.**

The chronicle's own distinction, applied to social measurement: an unused
contact is a claim nobody acted on, so it decays to nothing — which is
just **standing measures a RATE, not a total**, holding as always.

#### ⭐⭐⭐⭐ Employment history (user)

The richest untapped surface, and it **splits across two stocks**:

> **The WAGE is for what you made. The TIP is for who you were.**

The employer pays for output (**producer**); the customer tips for service
(**consumer**). Same job, two signals, two stocks.

- ⭐⭐⭐⭐ **Tips are the purest revealed preference in the game** —
  voluntary, costly, individual, given *after* the fact. Better than a
  contact and better than a repeat, because **expressing it costs money.**
  ⚠ **Counted as DISTINCT TIPPERS PER BUCKET, never as amount** — the
  established *credit per patron per bucket* fix, which kills the whale
  problem and is *also true*: twenty small tips mean more than one large
  one.
- **Being re-rostered** is producer-side repeat; **being asked for by
  name** is consumer-side.
- ⭐⭐⭐ **An employment record is the only social signal with an
  INSTITUTION'S MONEY behind it** — not self-declared, not a friend's
  opinion, but a business's revealed decision with a payment attached.
  **That is what makes a CV worth anything in life**, and it is the
  LinkedIn-flank thesis appearing mechanically.
- ⭐ **Tenure is the hardest signal to fake**, because it costs time that
  cannot be compressed.

#### The revised feed

| Signal | Why it is honest |
|---|---|
| ⭐ **repeat interaction** | the strongest — **cannot be performed** |
| ⭐ **tips, counted by distinct tipper** | revealed preference **with a price** |
| ⭐ **contacts, weighted by USE** | revealed intent, privately given |
| **tenure / re-rostering** | third-party attested, time-costly |
| **being sought** | attendant queues, party invitations, asked for by name |
| **reception** (shipped) | being heard — weak but real |
| **reactions / valence** (shipped) | ⬇ **demoted to a small term — kept as texture, not spine** |

⚠ **Keep OUT of consumer standing**: forum popularity and sales volume are
**producer** signals. Consumer standing is **play** standing — whether
people value your **presence**, not your **output**. Mixing them
**collapses two of the three stocks into one.**

⭐ **This does not disturb [mind-slate](./mind-slate.md)'s emote reading** —
that is of *the actor's own distribution*, not of anyone's approval.
**Different axis; a good sign both readings are real** rather than one
being a reinterpretation of the other.

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

- **Substrate:** [belief](../../subsystems/belief.md) (regard +
  the `watch-for` wanted-profile realm),
  [recognition-slate](../tails/recognition-slate.md) (recognition-by-description,
  the anonymity/disguise system notoriety inverts),
  [social-graph-slate](./social-graph-slate.md) (circles)
- **Measurement:** [reactions-slate](../tails/reactions-slate.md)
- **Consumers:** [npc-behavior-slate](./npc-behavior-slate.md), economy
  (brand/maker trust), [comms-slate](../tails/comms-slate.md)
- **Subsystems:** [augmentation](../../subsystems/augmentation.md) (the
  id-aug whose anonymity notoriety overrides),
  [emotes](../../subsystems/emotes.md) (the reaction channel)
