# Alignment slate

> **Status: design spine SETTLED, pre-requirements.** Supersedes the
> preliminary [alignment-religion-slate](../deferred-rpg/alignment-religion-slate.md)
> (RPG-layer, deferred) — that doc's D&D-grid + worship-is-chosen intuitions
> survive here, now fully reconciled with [story-bible.md](../../story-bible.md)
> §Alignment/§Gods and grounded in the shipped derive-on-read substrates
> ([chronicle](../../subsystems/chronicle.md), [trait](../../subsystems/trait.md),
> [belief](../../subsystems/belief.md), [renown](../../subsystems/renown.md),
> [corpo](../../subsystems/corpo.md)). The **model** is complete; **content**
> (the demigod roster, the favor/access mechanics) stays deferred.

Alignment is the world's read on *what a soul serves*. It is a **derive-on-read
consumer**, never a stored stat — the [chronicle](../../subsystems/chronicle.md)
named it as one of four deferred readouts, and this slate cashes it in on the
[trait](../../subsystems/trait.md) architecture. Nothing is written; re-tuning
the estimator re-derives who someone is without rewriting a row.

## The shape in one breath

Two **asymmetric** axes — a *moral-gravity* axis (from deeds, the god-eye reads
it) and a *political* axis (from the governance record, mortals witness it) —
each a **projection** of a finer per-component vector, banded on the surface and
**never shown as a number**. What you *name* (worship) and what you *feed*
(derived alignment) can diverge, and the gap is the drama. The world does not
pay you for alignment; it **reflects** you back to yourself — recognition, never
reward or punishment.

## Two asymmetric axes

The trap is a tidy symmetric 3×3. The two axes differ in source, register, and
player-freedom, and that asymmetry is the most important thing about the model:

| | **Vertical — moral gravity** | **Horizontal — political stance** |
|---|---|---|
| Poles | Good ─ Neutral ─ Evil (**Mitra ─ Pan ─ Moloch**) | Lawful ─ Neutral ─ Chaotic |
| Source | derived from **deeds** (presence-vs-capture) | derived from the **governance record** |
| Register | cosmic / religious | political / **god-less** |
| Player freedom | **floored at Good** (drift toward Moloch = dissonance + cost, never a flip) | **free** — both poles are Good |
| Reader | the **god-eye** reads the truth | witnessed governance behavior |

The root of the asymmetry: the game is **monist on morality** (presence-good /
capture-evil is the whole cosmology's thesis) and **pluralist on politics**
(structure ↔ liberty is legitimate disagreement among good people). *The gods
judge how you treat experience; they have no opinion on how you'd organize the
polity.* One axis has a right answer; the other is where good people argue.

## One machine, two rosters

Both axes run the same estimator — the [trait](../../subsystems/trait.md) shape:
**tagged evidence → a per-component vector → a headline band** (derive-don't-track,
game-time decay, the honesty firewall — *never a raw number*). They differ only
in their roster and evidence stream:

| | Vertical (moral) | Horizontal (political) |
|---|---|---|
| Evidence | **deeds** | **governance positions** |
| Fine components | per-**demigod-domain** affinity | per-**policy-domain** lean |
| Headline projection | Good ↔ Evil | Lawful ↔ Chaotic |
| Roster owned by | the pantheon catalogue | the governance decision taxonomy |
| Judged by worship? | **yes** (god-ful) | **no** (god-less) |

One tag per evidence item yields both readings at that tier and its projection —
no second system, one tagged stream read two ways.

## The pantheon as legend (the vertical axis)

Alignment is **not a grid-point — it's an affinity distribution over the
demigods**, and the grid's two coordinates are *projections* of it. The lore
talks in specific gods ("you serve the god you feed," "becoming more what you
serve"), so per-deity affinity is the primary object; Good/Evil and Law/Chaos
are its marginals. **The pantheon is alignment's disposition roster** — demigods
are to alignment what the 17 opposed-pair dispositions are to traits, and the
canon already tags them, so the coordinate legend is mostly written:

```
              LAWFUL            NEUTRAL           CHAOTIC
  GOOD    Vesta (hearth)    Eir (healing)    Aletheia (honest count)
 (Mitra)  Goibniu (work)                     ← the new religion's heart
 NEUTRAL  the Turning       PAN (the all)    Cernunnos (the wild)
  (Pan)   (seasons)         — off-network, no new demigods —
  EVIL    Mammon (hoard)    Moloch (capture) Mara (the Feed)
(Moloch)                                     ← Aletheia's dark twin
```

A **cell is an alignment**; the demigods in it are its domains (a cell can hold
several — Vesta and Goibniu are both Lawful Good). The thesis lives on the
chaotic column: **Aletheia (CG) and Mara (CE) are the same energy, opposite
soul** — the whole game is that column.

**Deed routing.** Each deed feeds one or more demigod-affinities:
- **Domain is authored at the mint site** — a deed knows its `domain` when it
  fires (healing→Eir, honest work→Goibniu, hoarding→Mammon). Cheap; single-soul
  domains route by the tag alone. (`domain` = a god's sphere — the term is
  locked; the colliding `domain` template collection renames to `content` as a
  standalone task — see the naming note in this build's memory.)
- **Dual-use domains get their *row* from the measured personhood-effect** — the
  *count*, *connection*, *making*. Same domain, opposite soul: a count that adds
  recognition feeds **Aletheia**; a count that strips it feeds **Mara**, the row
  decided by "did a person get more-witnessed or more-hollowed" (read off the
  [belief](../../subsystems/belief.md)/recognition substrate — Evil is "the
  erasure of the line between person and thing"). **The Aletheia/Mara column is
  the mechanism for every dual-use domain**, not a special case.

So valence is a split: **domain = authored, direction = measured** on the
dramatic domains that carry the drama.

## The political axis (Law ↔ Chaos)

Lawful = order / structure / the Charter / legibility / process; Chaotic =
liberty / individual conscience / direct action / distrust of legibility —
**both Good** (Aletheia, truth against the cooked count, is *Chaotic* Good;
Chaos ≠ bad). Derived from the **governance record** (conviction/voting
positions + institutional engagement), god-less. A single headline axis **plus**
a per-**policy-domain** vector, both measured (you can be structure-loving on
membership and liberty-loving on authorship; the headline flattens that — which
is the game's own *Seeing Like a State* critique, embodied).

Candidate policy-domains — each a real Law↔Chaos question the cooperative faces,
**owned by governance, only read by alignment**: membership/enfranchisement
(the census/Sybil axis), resource & territory/tenure, compute/the commons,
authorship/content-governance (the law==code review gate), monetary/reserve.
These reconcile with the [cooperative](./cooperative-slate.md) decision register
when it lands; that roster is a governance deliverable regardless, so alignment
adds no new authoring debt.

**Dependency note:** the vertical reads the mature
[chronicle](../../subsystems/chronicle.md) and can go live now; the horizontal
reads the [influence](../../subsystems/influence.md) conviction substrate, which
is built but not yet player-exercised. The model for both is complete; the build
will likely light the vertical first and seed the horizontal thin (or wire it as
the conviction verbs land).

## Worship vs. alignment — the gap is the drama

- **Worship (professed)** = a `DevotionMixin` on Character (sibling of
  `ContactsMixin`): one professed `patronKey` (a single demigod) + a flavor
  `tone` (devout / convert / lapsed / doubter — *never power*). Born-with default
  **"seeking / unaffiliated."** Picked at char-gen from the **Good + Neutral**
  demigods (alignment is never picked — only worship is declared), changed at the
  **Chapel** (place-gated, on the Temple of the Ages ruins). Declaration is
  **frictionless** — you can re-declare anytime, free: *naming is cheap, feeding
  is what counts.*
- **Alignment (fed)** = the derived affinity distribution above.
- **Resonance / dissonance** = the relationship between the named cell and the
  fed distribution — a comparison of two positions on one grid. *"You named
  Aletheia; you have been feeding Mara."*

**Worship judges the vertical only.** *Named Aletheia, politically Lawful* is
totally fine (no dissonance) — the gods are god-less on politics. A demigod's
column is *descriptive* of the deity, never a demand on the worshipper.

**The player clamp** lands on the *projection*: a player's grid classification
stays Good (never flips); their affinity vector honestly records any Mara-pull —
the **dark-god arc** is real and legible as the gap between "the world reads you
Good" and "you're feeding Mara," never a fall. Player-space is the **Good row**
(LG/NG/CG — free horizontally, clamped vertically). Note the two Neutrals differ:
**horizontal-Neutral is a valid player cell** (Eir, the apolitical Good);
**vertical-Neutral (Pan) is forbidden** — a played character is a locus of
experience by definition.

## The two readers

- **The god-eye reads the truth** — the objective gravity over *all* deeds,
  witnessed or not. This is the **panopticon**: every substrate is an append-only
  surveillance log, and the one watcher that sees everything is the mythic layer
  (the in-fiction aether is total *and* identity-blind — it sees every act, can
  authenticate no one; only the god-eye resolves a person). The god-eye speaks
  only through the **mirror** (below) and the self-view.
- **Mortals read witnessed belief** — the **New Vegas model**, the default the
  social world runs on. NPCs and factions react to *what they witnessed*
  (accreted [belief](../../subsystems/belief.md)/regard); fool the room and the
  room treats you as it believes. Not the mirror.
- **The in-between is an authorable dial** — a priest, or one of the attuned who
  can *sense* gravity, may read the truth like a god or the reputation like a
  mortal. A per-NPC knob, tuned in play, not a foundation.

## The mirror — reflection, not reward or punishment

The **private god-eye channel**: it reflects the truth of who you're becoming,
only to you — *because* it's private (the god can tell you even when no mortal
saw). Kept strictly distinct from the social/NV layer and from favor-mechanics
(deferred). Three registers:

1. **The pulled self-view** — a lens over the chronicle (deeds → who they're
   making you), bands + prose, never a number (the `traits`/`competence`/
   `chronicle` verb shape). States professed patron, fed gravity, and the
   resonance/dissonance **plainly**. Reflective, not evaluative.
2. **Ambient tilt** — the world's *tone* shifts with resonance/dissonance via the
   [message-rendering](../../subsystems/message-rendering.md) theme/register
   cascade — **texture, not capability**. Resonance with Aletheia reads as warmth
   and clarity; a drift toward Mara lets a hollow, loop-quality creep in. The
   world doesn't pay you; it reflects you in its tone.
3. **Focal omens** — at diegetic homes: the **Chapel** (declaration/re-examination),
   the **honest count / your enumeration** (the census counts *to recognize*, and
   reflects your gravity when your number comes up — wiring the mirror into the
   flagship [An Honest Count](./eternal-university-narrative-slate.md) quest), and
   organic ambiguous signs you *interpret*, never labeled alerts.

**"You might not know it"** — the mirror is always honest and always available,
but **facing it is a choice**. The self-view requires you to look; the ambient
tilt is deniable; the drifting are precisely those not auditing themselves. The
game never hides the truth — it makes facing it a deliberate act. It's the
honest-count method turned inward: the horror is that the mirror was there and
you didn't look.

**Reflection-only floor.** The mirror ships with *zero* mechanical consequence.
The **recognition-vs-reward seam** (does deep resonance unlock *narrative
access* — Aletheia's rites opening to those who live her truth — never *power*?)
is marked-but-unwired, **deferred** with the favor-mechanics.

## NPCs — how alignment presents

NPC alignment is derived exactly like a player's, **seeded via claim-evidence**
(the [trait](../../subsystems/trait.md) `BehavedMixin` pattern — an author seeds
a history, not a stat). The engine renders "opposite soul" natively because
**demeanor (the disposition ledger) ⊥ gravity (the deed ledger)** are two
independent derivations: an author can seed a gregarious, warm NPC *and*
capture-gravity deeds, and it reads genuinely warm on the surface while feeding
Mara underneath — no special-cased lie.

**Alignment is never on the sleeve** — forbidden by both the lore ("capture
wears salvation's face") and the honesty firewall (no nameplate). What *is* worn:
**affiliation + demeanor**. Getting to know a soul is Dunny's method turned on
people — witness deeds, weigh testimony, watch what they feed unwatched. Place
each carve on a **legibility × honesty grid**: legible-honest (Dave, the trust
anchor), legible-false (Mara's face), illegible-honest (the gruff good soul),
illegible-malign (the banal handler).

## Factions

`GroupApi` is the **player-social** layer (contacts/managed/MQL — players
organize players). **Factions are the authored NPC-world layer** (corpos, the
Registrar, the clergy). Players never *join* a faction; **NPCs are members**,
**players earn standing** (standing-not-membership, "affiliate by conduct, not a
click" — already authored in [corpos-slate](./corpos-slate.md)).

**The `Faction` primitive** (built from the two settled cases — **Goodkin** and
the **Registrar**):
- A thin **data-`Idea`** (like `Corpo`) + flavor prose + a **polymorphic
  membership-resolver** (employment / office / roster) + derived gravity + player
  standing. **`Corpo` becomes `Faction` + corporate fields.**
- **Gravity = a role-weighted aggregate of member deeds.** In-role/officer deeds
  carry institutional weight → the Registrar's officers' conduct dominates
  (institution-dominant *emerges*); Aletheia's flat individuals give
  constituency-only. **One mechanism, all gravity-sources** — no institution-vs-
  constituency knob, and the faction is **not** a deed-agent: institutional
  deeds attribute to it via a member *acting in-role* ([provenance](../../subsystems/provenance.md)
  role-attribution).
- **No authored grid-alignment** — corpos carry "sector + ethos + aesthetic, not
  Good/Evil." *Professed = the flavor prose; gravity is always derived; the gap
  is flavor-vs-derived* (Goodkin *reads* warm-paternalist — care or velvet cage
  is derived from conduct; the NCR/Bitter-Springs gap).
- **Reception = the dot-product of a deed's valence with the faction's grid
  position** (reuse `trait.compatibility`) → **"same deed, opposite reception"**
  for free (whistleblowing is +truth-faction / −legibility-hardliners from one
  deed). **Rivals** = emergent (dot-product) + authored (`Corpo.rivals`)
  amplification.
- **Per-faction standing** = [renown](../../subsystems/renown.md) scoped to the
  faction identity (known-ness) × value-compatibility (liked/disliked) — NV
  fame/infamy, decomposed onto built substrate.
- A **player wearing a faction's livery** → others project the faction's gravity
  onto them (prejudice-by-affiliation, the belief-as-projection engine) — biasing
  how they're *read*, never what they *are*.

**Emergent movements** (Aletheia's "movement," the False-Dawn cult) are a
**different, lighter category** — a *derived predicate over shared gravity*, no
identity, no roster ("everyone who serves Aletheia"). **Deferred**, doubly
justified because Aletheia-as-a-body isn't authored content yet. The cult is the
movement's structural near-twin (differs only on the gap: movement honest, cult
false) — a one-variable cross-check when we build emergent movements.

## Model the antidote, not the poison

We deliberately **do not model virtue-signaling** as a mechanic — a visible
meter would *reproduce* the pejorative (build the Feed), accomplishing neither
containment nor inversion. Instead: **containment is the no-reward law** (nothing
to farm), and **inversion is the discernment/investigative loop** — we build the
*antidote* and virtue signaling is merely what it sees through (loud performed
virtue is a capture-tell; true presence is quiet). The only residual is an
authored **per-NPC** performativity brushstroke — characterization, bounded, not
a player-facing economy.

## What ships (fidelity)

Surface the **headlines** (a Good-row cell + a Law↔Chaos band, as bands/prose);
**measure the vectors** underneath so a deep read (inspection card, investigator
report, faction dossier) can expand them. Coarse readout, rich substrate. The
vertical goes live off the chronicle; the horizontal seeds thin pending the
conviction verbs; the mirror ships reflection-only.

## Deferred

- **Favor / access mechanics** — does deep resonance unlock *narrative access*
  (never power)? The recognition-vs-reward seam, marked-but-unwired.
- **Emergent movements** (Aletheia's movement, the cult) — the derived-predicate
  category.
- **Multi-patron / eclectic worship** — v1 is one professed patron.
- **The demigod roster as content** — the pantheon catalogue's authored fill (its
  own session; the grid above is the canon skeleton).
- **Per-god valence authoring at scale** — only a starter set of dual-use domains
  rides measured direction at first.
- **Richer estimators** — cross-component propagation, explicit drift-inertia
  (inherited from trait's deferred list).
- **Content-collection rename** (`domain` → `content`) — a standalone
  migration-shaped task, *not* inlined into this build.
- Whether **Aletheia** is pickable at creation or Chapel-only — a char-gen content
  detail.

## Open questions

- **"Serve the god you feed" is newer and un-stress-tested.** The god-eye-reads-
  truth vs. mortals-read-witnessed-belief split keeps *both* signals available so
  this can be **played out**, not locked — the world defaults to NV/witnessed;
  the objective-gravity signal is reserved for the mirror + self-view.
- **The priest/attuned reader dial** — which in-between NPCs read truth vs.
  reputation. Per-NPC, tuned in play.
- **The policy-domain roster** must reconcile with the governance decision
  taxonomy when the cooperative loop matures.

## Connections

[chronicle](../../subsystems/chronicle.md) (the deed ledger alignment derives
from) · [trait](../../subsystems/trait.md) (the estimator + `compatibility`
kernel, one roster up) · [belief](../../subsystems/belief.md) (recognition/regard
— the personhood-effect reader + witnessed-belief layer) ·
[renown](../../subsystems/renown.md) (per-faction standing scope) ·
[corpo](../../subsystems/corpo.md) (`Corpo` → `Faction` generalization) ·
[grouping](../../subsystems/grouping.md) (the player-social layer, kept distinct
from factions) · [governance](../../subsystems/governance.md) /
[influence](../../subsystems/influence.md) (the political-axis evidence) ·
[provenance](../../subsystems/provenance.md) (in-role deed-attribution) ·
[char-gen](../../subsystems/char-gen.md) (the worship pick) ·
[message-rendering](../../subsystems/message-rendering.md) (the ambient-tilt
register cascade) · [story-bible.md](../../story-bible.md) §Alignment/§Gods (the
canon) · [eternal-university-narrative-slate](./eternal-university-narrative-slate.md)
(the honest count / the Registrar) · [corpos-slate](./corpos-slate.md) ·
[reputation-slate](./reputation-slate.md) · [cooperative-slate](./cooperative-slate.md).
