# Cast archetype slate — composable character profiles, and why props can't have one

**Captured 2026-09-01.** It started from the mixin analogy and turned into
an identity question:

> **User: "we have this great mixin framework for composing classes that
> makes interoperability really cool. but we don't quite have that same
> thing for like character profiles… the same way 'all Visible stuff
> functions the same', we want something like that but for the npc
> personality/history/etc profile."**

Two later turns folded in: the char-gen integration (which turned out to
be the anchor, not an adjacency), and the deviation model —

> **User: "one thing I think we might want to model is not just
> archetypes, but then also like deviations from that archetype. so
> everything can participate in the archetype game but then deviations
> get modelled explicitly on top of that."**

> **Status: design conversation, captured. Not requirements.**
>
> ⭐⭐⭐ **REVISED 2026-09-03 after a 41-character stress test.** The whole
> known cast — 19 Rejection · 6 Hinkley Hills · 8 Heart's Delight · 8
> Terminus — was written out as sheets and run through `role × temperament`
> to find where it breaks *before* the design is closed. See
> [§ The 41-character stress test](#-the-41-character-stress-test-2026-09-03).
> The model survives and needs five changes; the exercise also turned up a
> **shipped defect** (§ the disposition-key defect) that is independent of
> all of it.

Related: [behavior.md](../../subsystems/behavior.md) (**the shipped
substrate — read it first**: `behaviors:`, brains, `_seedDispositions`),
[trait.md](../../subsystems/trait.md) (the 17 closed disposition axes, the
derive-on-read estimator), [npc-behavior-slate](./npc-behavior-slate.md)
(the sibling slate this extends),
[narration-slate](./narration-slate.md) (the "nothing writes traits"
finding), [furnishing.md](../../subsystems/furnishing.md) (**the location
archetype precedent** — four kinds of answer, and archetypes compose
rather than partition), [topics.md](../../subsystems/topics.md) (the
closed-roots/open-leaves/gated pattern this copies),
[content-packs.md](../../subsystems/content-packs.md) (the pack rule that
forces open entries).

---

# ⭐⭐ The finding that starts it: the authors already invented this, in comments

Every shipped cast member carries a flat `dispositions:` list. But the
**comments above them** name archetypes:

```
# Sloane — the Confessor (night shift, weekdays; wraps past midnight).
# Mara — the Anchor (day shift, weekdays). Diligent, patient, reserved.
# Remy — the Connector (swing shift, weekdays). Gregarious, charming, a
#   harmless gossip.
# Augie — the Veteran (weekend cover). Semi-retired; patient, wry,
#   generous, a storyteller.
```

**The Anchor. The Confessor. The Connector. The Veteran.** Named, then
hand-expanded into four or five disposition lines underneath, every time.

The abstraction is not being proposed here. It **already exists** — it
lives in prose the engine cannot read, and gets retyped per character.

## ⚠⚠ And when a comment isn't enough, an author escapes to a CLASS

`platform/agent/Gus.ts` documents the escape in its own header:

> *"WHY A CLASS (and not pure seed data): there is no declarative seed
> path to put gear on a creature. `populates:` is composed only on rooms
> (`CartesianLocation`), not on `Creature`/`Character`/`NPC`, and
> worn/wielded occupancy is deliberately runtime-only… So a fresh NPC
> clone always boots with empty hands and empty slots."*

That is an author stating, in the tree, that they wrote a TypeScript class
because the data model could not express a character. **That is the
monolithic failure already happening — one rung lower than archetypes,
where it is far more expensive.**

⭐ It also names an axis this slate had not identified: **kit** (see
"the missing axis" below).

---

# The measured gradient (verified 2026-09-01)

25 agent rows ship; **22 carry dispositions**, 3 carry none.

| tier | count | dispositions | brains | lines |
|---|---|---|---|---|
| **wilds** (duelist, sentry, wolf) | 3 | **none** | `arms`/`wary` + `idles` | 29–46 |
| **the hand** (Dez, Tamsin, Wren, Bram, Petra, Wen, Rufus, Ilse) | 8 | `diligence: 60–80`, occasionally one more | `consigns` + `idles` | 32–42 |
| **counter staff** (Halloran, Wenna, Pemby, Odell, Odile) | 5 | 2–3 axes | `introduces greets idles` | 30–130 |
| **lounge cast** (Mara, Sloane, Remy, Augie, Dave) | 5 | 3–5 axes, **named in comments** | 5–8 brains | 120–161 |
| **bespoke classes** (Gus, Katie) | 2 | 6 for Katie | — | own `.ts` |

⭐ **Temperament richness tracks cast-ness exactly, and nobody planned
it.** The wilds have a role and literally zero personality; the hands have
a role and one token disposition; the lounge cast has both, fully. The
prop→cast→evidence chain below is already visible in the shipped data as
an unplanned gradient.

## ⚠ Class is a third axis, and it is NOT the same as role

Class distribution is *not* a detail ladder: 17 rows are
`/platform/agent/NPC`, **7 are `/platform/agent/Crafter`** (the whole
lounge cast plus smith and cook), 1 `Mercenary`, plus Gus and Katie.

`Crafter` is a **capability** class — it confers making. That is a
legitimate class-level distinction and this slate does not touch it. The
lounge cast's *role* (venue staff) is still carried in `behaviors:`.

So a shipped NPC differs on three axes today — **class** (capability),
**behaviors** (role), **dispositions** (temperament) — and only the last
two are data. This slate absorbs those two. The class axis stays as it is.

> ⭐⭐⭐ **REVISED 2026-09-03 — class has a sharper rule than "capability".**
> Half of Terminus's cast carries a bespoke class, and the pattern is
> exact: **Walter** fronts `lease`/`unlease`, **Ricky** fronts `title buy`
> (running it as *the buyer*, not himself), **Tootie** sells travel cards.
> Which matches the hard-won kernel rule — *a verb affordance is a static
> on a class; a row's `commandContributions:` is dead silently.* So:
>
> **A bespoke class exists exactly when the NPC affords a VERB.**
>
> `Crafter` is the same rule read through a mixin (it confers making).
> That is not a taste decision and it is checkable. ⚠ **Gus is the possible
> exception** — he may exist for the `crossing-ritual` brain rather than a
> verb, and if so he is the one class that could arguably be data.

---

# ⭐⭐ It reduces to identity: props cannot own a profile

`Stuff.getIdentityPath()` returns `getTemplatePath()`, and the trait
ledger keys on exactly that (`ownerKey(owner) → owner.getIdentityPath()`).
So **every instance cloned from one template row shares one ledger.**

Which settles the design without a preference being expressed:

| | identity | can own evidence | profile is |
|---|---|---|---|
| **prop** — minted fresh, no write-back | shared with every sibling ever minted | **no** | a **lens** |
| **cast** — long-lived | its own | yes | a **seed** |

A prop gets a lens because it *cannot* have a seed — there is no key to
hang one on. This is a consequence of the identity model, not a choice.

⭐ **The prop/cast split being built in build-3 is therefore the same line
as the profile split.** Both reduce to: *does this thing have durable
individual identity?* Persistence write-back and profile depth are two
readings of one answer, and the archetype system should key off the flag
that build already produces.

## Promotion falls out

Promoting a prop to cast = **minting it a distinct identity path** and
re-running its declared archetypes in seed mode. No migration, no
backfill. And the "what does its chronicle say about the months before
anyone cared?" problem dissolves honestly: before that moment the world
genuinely could not distinguish it from its siblings, so there is nothing
to say. *The world started remembering you when it started telling you
apart.*

---

# ⭐⭐ One archetype, two compilation targets

An author writes **the Anchor** once. What it does depends on which side
of the identity threshold the host sits on:

- **On a prop → a lens.** Resolved at read time, never saved, never
  drifts. Feeds description, dialogue, and an LLM prompt. Survives
  re-minting for free because there is nothing to survive.
- **On cast → a seed.** Expands once into `claim` evidence, then the
  character drifts away from it under play — which it should. Someone
  you have played with for a month ought to read as who they have
  *become*.

A mask on a prop; a birth certificate on cast.

## The mechanism is cheaper than it sounds

`TraitPosition` is already a pure static value-object over entries — no
state, no instances. **A lens is: build the entries in memory, run the
same estimator, don't save.**

Not a parallel implementation — the same code path with the persistence
step omitted. A prop and a cast member carrying the same archetype produce
*identical* readings, and the two paths cannot drift apart because there
is only one path.

It also dissolves composition conflict. Two archetypes touching
`sociability` both contribute entries and the estimator sums them, on
both sides. **No precedence rule, no last-wins, no conflict system** — it
falls out.

---

# Two closed kinds, open entries, gated

Settled in conversation: **closed, with room for custom that trades can
ship.** That is the [topics](../../subsystems/topics.md) shape exactly —
seven closed roots, open leaves, a build gate — so this is the second
application of a shipped pattern, not a new one.

- **The kinds are closed.** `role` and `temperament` (and see the missing
  axis below). A pack can never invent a fifth. This is what gives the
  engine structure: N slots on a character sheet, N sections in a prompt.
- **The entries are open.** `trade-hospitality` ships its own
  temperaments; the platform ships the common ones. **No kernel list
  edit**, which keeps the pack rule intact.

⭐ **Why open entries are safe:** an archetype is a *named bundle of
closed-vocabulary effects*. The name is open, but everything it does is
expressed in vocabularies already closed one level down — the 17
disposition axes, the brain path table. The engine never needs to know
what "the Anchor" means to reason about an Anchor; it reads the effects,
always in a language it speaks.

## ⚠⚠ The warning that transfers with the pattern

When `lint:topics` was first run, **45 of 105 emitted topics had no
authored descriptor at all** — silently resolving through the
derive-a-plausible-descriptor tier.

An archetype system with a graceful fallback rots the same way and faster,
because a typo'd temperament expands into *nothing* and produces an NPC
who is simply blank, with nothing anywhere saying so. Traits are already a
system whose output is invisible ledger rows.

**The gate ships in the same build, not the one after.**

---

# The shape, written out

## The role

```yaml
# /stuff/role/hand — the Hand
kind: role
label: the Hand
summary: >
  A trade outfit's floor worker. Carries finished stock from the floor
  to a counter and consigns it as the business, then finds something to
  do with their hands.
behaviors:
  - brain: /lib/behavior/consigns
    trigger: cadence:90s
    config: { batch: 6 }
    requires:
      stock: the Stock counter this hand draws from
      shelf: the counter it consigns onto
      ask:   censusKey → minor-unit ask price, per line
  - brain: /lib/behavior/idles
    trigger: cadence:300s
    requires:
      pool: 2–4 wordless emotes in the outfit's idiom
```

⭐ **`requires` is load-bearing.** A hand applied without `stock` is a hand
standing there consigning nothing, silently — the blank-NPC failure the
gate exists to prevent. Missing required config fails the **save**, not
the spawn.

## The temperaments

```yaml
# /stuff/temperament/anchor — the Anchor
kind: temperament
label: the Anchor
summary: >
  Steady, patient, reserved. The spine of a place: does the work, keeps
  the count, says little. Reliability as a personality rather than warmth.
dispositions:
  - { disposition: diligence,   valence:  70 }
  - { disposition: patience,    valence:  70 }
  - { disposition: composure,   valence:  70 }
  - { disposition: temperance,  valence:  70 }
  - { disposition: sociability, valence: -70 }
voice: >
  Answers the question asked, not the one implied. Warmth shows up as
  attention and remembered detail, never as volume. Does not fill silence.
```

```yaml
# /stuff/temperament/confessor — the Confessor
kind: temperament
label: the Confessor
summary: >
  Still, watchful, discreet. Says little and sees everything; holds what
  people tell them. Kindness expressed as keeping things rather than
  saying them.
dispositions:
  - { disposition: sociability, valence: -70 }
  - { disposition: composure,   valence:  70 }
  - { disposition: honesty,     valence: -70 }
  - { disposition: compassion,  valence:  70 }
voice: >
  Deflects questions about others without lying and without refusing.
  Notices the thing you did not say. Comfortable letting a pause run long
  enough that you fill it.
```

> ⚠ **`honesty: -70` beside `compassion: 70` is the interesting one.** Not
> a liar — a keeper of confidences, which the closed axis set can only
> express as low honesty. **That axis is carrying two meanings**, and it
> is the first evidence that the 17-axis roster may be under-specified for
> authored character. Flagged, not resolved.

```yaml
# /stuff/temperament/connector — the Connector
kind: temperament
label: the Connector
summary: >
  Gregarious, bold, a harmless gossip. The buzz of a room and its
  rumour-mill; knows who is talking to whom and enjoys saying so.
dispositions:
  - { disposition: sociability, valence:  70 }
  - { disposition: boldness,    valence:  70 }
  - { disposition: honesty,     valence: -70 }
voice: >
  Opens conversations uninvited and closes them reluctantly. Trades in
  who-was-here-yesterday. Embellishes for shape, not for advantage, and
  will cheerfully be corrected.
```

```yaml
# /stuff/temperament/veteran — the Veteran
kind: temperament
label: the Veteran
summary: >
  Semi-retired, wry, generous. Slower than the room and unbothered by it;
  the keeper of how things used to be done and why.
dispositions:
  - { disposition: generosity,  valence: 70 }
  - { disposition: patience,    valence: 70 }
  - { disposition: worldview,   valence: 70 }
  - { disposition: sociability, valence: 70 }
voice: >
  Answers a question with the story the question reminds them of, and the
  story usually contains the answer. Gives things away. Has seen this
  before and says so without condescension.
```

```yaml
# /stuff/temperament/steady — the Steady Hand
kind: temperament
label: the Steady Hand
summary: >
  Competent and unremarkable. Turns up, does the work, goes home. The
  minimum a person needs to read as a person.
dispositions:
  - { disposition: diligence, valence: 60 }
voice: >
  Brief and civil. Talks about the task in front of them.
```

`steady` is the **prop-tier** temperament the eight hands are already
using without naming it.

## What a row becomes

```yaml
class: /platform/agent/NPC
archetypes: [/stuff/role/hand, /stuff/temperament/steady]
data:
  name: Rufus Penhallow
  shortDescription: "a floury pantry hand in a canvas coat"
  longDescription: |
    A stout hand in a canvas coat dusted white to the elbows, who weighs
    everything twice.
  roleConfig:
    consigns:
      stock: /trade/cooking/thing/pantry-stock
      shelf: /trade/distilling/thing/counter
      ask: { pantry:sugar: 8, pantry:salt: 5, pantry:coffee: 22, pantry:syrup: 6 }
    idles:
      pool:
        - { kind: free, value: "thumps a sack to settle it." }
        - { kind: free, value: "chalks a weight on the door." }
```

37 lines → 18, and **every surviving line is something only this hand
could say.** No templating language: the archetype names the config keys
it requires, and the row supplies them under `roleConfig`, merged per
brain.

---

# Coverage against the shipped cast

| | covered by | still needs |
|---|---|---|
| 8 trade hands | `hand` + `steady` | Petra `diligence:80`, Wren `sociability:-40`, Bram `sociability:50` |
| 5 counter staff | a `counter` role + `steady` | 1–2 disposition overrides each |
| Mara / Sloane / Remy / Augie | a `venue-staff` role + the four above | Mara keeps `restocks`, Remy keeps `reacts` |
| Dave | — | hand-carved, correctly |
| duelist / sentry / wolf | roles only | no temperament, correctly |

Two roles not written here (`counter`, `venue-staff`) plus these six cover
20 of 21 dispositioned rows. **Dave stays bespoke** — the "starting point,
not pure" case working as intended: the abstraction's job is to not be in
the way.

# ⭐⭐⭐ The 41-character stress test (2026-09-03)

> **Method: do not close a taxonomy until every known instance has run
> through it.** The whole known cast was written out as sheets — name ·
> class · role · temperament · the fact that explains them — and scored
> against the model. 41 characters: **19 Rejection · 6 Hinkley Hills · 8
> Heart's Delight · 8 Terminus.**

## What worked — and it is the reason to keep the model

- **Clean fits (~20 %)**: Ines · Delia · Bo · Ilaria · Bia · Wenna ·
  Pemby · Odell. Role and temperament carry essentially all of them.
- ⭐ **Same role, different temperament produces different people.** Two
  **Keepers** (Morwenna the Anchor / Bo the Connector) are two completely
  different shops. Two **Growers** (Furtado / Avila). Three **Clerks**
  across three towns (Delia / Enid / Ilaria), one role, three
  temperaments. That is the composition doing exactly its job.
- ⭐ **Temperaments reuse across localities** — Witness ×2, Idealist ×2,
  Striver ×2, Connector ×3, Inquirer ×2. That is a *vocabulary*, not a
  per-venue list, which was the open question.
- ⭐⭐⭐ **It found a duplicate nobody was looking for.** **Rundle**
  (Rejection's surgeon) and **Terada** (the valley's pumpman) are the same
  character in two towns: both keep a book, both have evidence, neither has
  standing. A taxonomy that surfaces that is working; one that could not
  would be decoration.
- **Roles that recur across the corpus**: Clerk ×4 · Keeper ×3 · Hand ×3 ·
  Grower ×2 · Publican ×2 · Commuter ×2 · Tender ×2.

## Change 1 — five more temperaments (5 → 10)

The shipped four plus prop-tier `steady` were all harvested from **one
venue's cast**, which is why a mining camp and a farm valley break them.
Add:

| temperament | the shape | exemplars |
|---|---|---|
| **the Witness** | has evidence and no authority; **publishes** rather than receives | Rundle · Terada |
| **the Inquirer** | wants to know, and is not owed belief | Rhonda · Teodoro |
| **the Idealist** | the only one in the room who thinks it could be otherwise | Enid · Ilaria |
| **the Striver** | Anchor-shaped but **ambitious** — reliability pointed at getting somewhere | Rosalind · Avila |
| **the Contented** | ⭐ a characterizing **negative**: complete satisfaction in a small job | Tootie (`ambition −60`) |

⚠ **The Witness is not the Confessor.** Confessor *receives* confidences;
Rundle shows his case book to anyone who asks. Distinct, and the corpus
needed both.

## Change 2 — ⭐⭐⭐ the third data axis is STANDING, and it is pointers

The stress test's headline. Role is **what you do**; temperament is **how
you are**; and across all four towns the most characterizing thing about a
person was neither:

- **history** — Jory's lung · Morwenna's compensation · Terada's eleven-year
  notebook · the collier's decade without sleep · Halloran's family
- **holdings** — Furtado's grandmother's priority date · Jory's slate
- **relationship** — Earl needs Val · the Chenoweths are one character in
  two bodies · Rosalind and Teodoro are defined by *never meeting*

⭐ They look like three gaps. They are one:

> **Everything the model misses is *what is true of this person that they
> did not choose*.** Role is what you do, temperament is how you are, and
> the missing axis is **where you stand.**

The proof it is load-bearing: **Jory Hocking and Bia Rovere compile to an
identical profile** — Publican × Connector — and are not the same person.
**Jory holds the slate; Bia does not.**

⭐⭐⭐ **And the axis is not new data — it is three pointers into shipped
registries:**

| the miss | already lives in | pointer |
|---|---|---|
| history | the **chronicle** — which already has *authored prologue claims* | a prologue ref |
| holdings | **parcels · chattel · seats** | a title / a seat |
| relationship | the **social graph · contacts · party** | a bond |

Which keeps the archetype from becoming a dumping ground, and gives the
clean statement:

> ⭐⭐ **Role and temperament are the ARCHETYPE. Standing is the INSTANCE.**

⚠⚠ **And that is exactly why props cannot have standing** — no durable
identity to hang a title, a prologue or a bond on. Same line the slate
already drew from the identity model, arrived at from the opposite end.

⚠⚠⚠ **The deed-row hazard applies to prologues too.** A chronicle prologue
attached on a *template* key would be read by every sibling instance and
survive every re-mint — the identical bug § the deed-row hazard flags for
deeds. **Standing pointers are a cast-only feature**, and that must be
enforced rather than assumed.

## Change 3 — roles are not always here, and not always now

- ⭐⭐ **Elsewhere.** Rosalind and Teodoro *work in the Counting-Houses and
  the press* and **reside** in Hinkley. The model assumes role = what you
  do here. A **Commuter** role is real and gateable
  (`requires: { workplace, residence, transit }`), but the underlying point
  stands: a cast member's role can live in another locality.
- ⭐⭐ **Seasonal.** Bettencourt runs 04:00–20:00 daily for six weeks and
  sits alone in an empty shed for ten months. Halloran and the timekeeper
  exist only during the pack. **No calendar axis exists**, and Heart's
  Delight cannot be authored without one.
- ⭐ **Borrowed.** Wenna and Halloran are two faces of *one institution* —
  the transaction face and the relationship face. Walter is "Mayfield
  Holdings' agent, owner-conferred, never self-enrolled." **In a village
  you are yourself; in a city you are an office**, which is the agency
  slate's own line (*authority from the principal, attribution to the
  agent*) showing up as characterization.

## Change 4 — opacity must be an explicit value

**Prentice** (the death man) has **deliberately unauthored dispositions**,
so that a player cannot resolve him by reading a field. That is a design
requirement, not an omission.

⚠ Suppression (§ *a row must be able to SUPPRESS*) is a different thing —
it *replaces* an archetype's line. Opacity authors **nothing**, on purpose.
An omitted temperament should fail the save (the blank-NPC failure the gate
exists to prevent); `temperament: opaque` must pass it.

## Change 5 — not every role can be gated

⭐ `requires:` is load-bearing and correct for the **Hand**. But **Val** is
a handyman, and a handyman's entire nature is having *no fixed station* —
no stock, no shelf, no counter. He breaks the gate by being what he is.

So the vocabulary needs a role kind whose contract is *availability* rather
than a station, or `requires:` needs to admit an empty set **deliberately**
— the same shape as Change 4.

## ⚠ A category the model does not name: the FUNCTIONARY

Rejection's shipped seven are **named by function, not by name** — "the
collier", "the onsetter", "the registrar". Long-lived and individuated, but
referred to by office. Very true to a workplace, and it sits *between* prop
and cast rather than on the line. Worth deciding whether that is a third
tier or simply a cast member whose `name` is absent.

## ⚠⚠ The disposition-key defect (independent, and shippable alone)

The corpus turned up **five uses of four disposition keys that do not
exist** in the closed 17-axis `DISPOSITION_AXES`:

| in shipped content | the actual axis |
|---|---|
| `greed: 30` (Halloran, Goodkin officer) | `generosity: -30` |
| `gregariousness: 60` (Pemby) | `sociability: 60` |
| `candor` ×2 (Walter −30, Ricky +40) | ⚠ no clean equivalent |
| `warmth: 60` (Ricky) | ⚠ no clean equivalent |

`DISPOSITION_KEYS` is exported but nothing on the seeding path appears to
validate against it, so **five authored personality traits are almost
certainly being dropped silently** — the recurring failure mode.

⭐ **Fix: `pnpm lint:dispositions`** — every `disposition:` key in shipped
content resolves to `DISPOSITION_KEYS`. Twenty lines, the `lint:topics`
shape (which found 45 of 105 emitted topics had no authored descriptor).

⚠ That two of the four (`candor`, `warmth`) have **no clean mapping** reads
two ways: the authors were not checking the list, or the 17 axes are
missing something real. Decide which before the lint lands, because the
answer changes whether the fix is a rename or an addition.

---

## ⭐⭐ Coverage after the stress test

| | |
|---|---|
| corpus | 41 characters, four localities |
| clean fits | ~20 % on `role × temperament` alone |
| temperaments | **5 → 10** (9 cast-tier + `steady` at prop-tier) |
| class | ⭐ redefined: a bespoke class **iff** the NPC affords a verb |
| third axis | ⭐⭐⭐ **standing** — three pointers into shipped registries, cast-only |
| still open | seasonal roles · elsewhere roles · opacity · ungateable roles · the functionary tier |

---

## ⭐ The finding this exercise produced: a row must be able to SUPPRESS

Bram Tull carries `sociability: 50` and **no diligence** — a cheerful
hand, not a diligent one. So a row-level disposition must be able to
*replace* an archetype's line, not merely add to it. Pure summing is not
enough.

> ⭐⭐ **This is subsumed by deviations (below).** Bram is not "steady with
> an override" — Bram is *a Hand, of the Steady kind, deviating: cheerful,
> and without the usual grind.* Suppression is one direction of a
> deviation, not a separate mechanism. Recorded here because it is what
> made the deviation model necessary.

# ⚠⚠ The deed-row hazard (a prerequisite, not a footnote)

`Behaved._seedDispositions` is already idempotent — it skips if any
`claim` row exists for the host, explicitly guarded across re-clone and
reboot. Authored dispositions do **not** compound when a prop re-mints.

**`deed` rows are not guarded, and cannot be.** The moment anything
records a disposition-valenced deed for an NPC, it lands in the shared
template-keyed ledger, is read by every sibling instance, and survives
every re-mint of all of them. Two pantry hands would share one
personality, and it would outlive both.

Not a bug today: `TraitApi` has exactly **one** non-test consumer
(`TraitsController`, a char-gen readout), so nothing writes NPC deeds yet.
It becomes one the day a brain or act signature starts recording them —
which is precisely what this system would enable. **Props need either no
deed recording or a distinct key, decided before anything starts
writing.**

---

# The balance question: axes, not count

The variable is not how many archetypes but **how many axes**. 6 roles ×
10 temperaments is 60 characters from 16 authored things; 60 monolithic
archetypes is 60 from 60. This is the mixin insight, reapplied.

**Combinations are free here** because both axes compose in substrates
already built for many contributors: the ledger *sums* valenced evidence,
and `claims`/`requiresFree` already arbitrates brain contention (Mara runs
eight brains today). Neither axis needs a new conflict system.

**The danger is roster inflation on the wrong axis** — an author writing
*"the Grumpy Pantry Hand"* as one archetype instead of Hand × Grumpy. The
guard is checkable at the gate: **an archetype belongs to exactly one kind
and may only touch that kind's vocabulary.** A temperament that specifies
`behaviors:` is a category error and fails the save.

**Cardinality differs per axis.** Roles stack (Mara is venue-staff *and*
restocker). Temperaments do not: Anchor (`sociability: -70`) + Connector
(`sociability: +70`) = zero, two strong personalities averaging into
nobody, silently. Every shipped character has exactly one coherent
temperament; Dave is arguably the only one at two.

**The rule that sets the balance:** archetypes cover boilerplate, never
character. The test — *would you be annoyed to type it again?*
`diligence: 60` on the eighth hand is boilerplate. Mara's five-axis Anchor
is the reason she is interesting, so it is authored — even though "the
Anchor" is *also* an archetype others can start from.

## ⭐ A falsifiable health metric

**Archetypes should grow logarithmically against cast size.** Adding the
22nd NPC should usually add zero. Adding one means a genuine new cluster
was found — good information. If it ever goes **linear**, the abstraction
has failed and should be deleted rather than maintained.

Cheap to measure, and it reports early.

---

# ⭐⭐⭐ Char-gen already built this, for one kind, and shipped it

**The integration question answers itself: `aspiration` is an archetype.**

```ts
interface AspirationRosterEntry {
  key: string;
  label: string;
  description: string;
  bioSeed: string;
  claimSeeds?: { text: string; order: number }[];
  outfit: string[];
  image?: string;
}
```

| aspiration (shipped) | this slate |
|---|---|
| `key` / `label` / `description` | the archetype row + `summary` |
| `bioSeed` | `voice:` — the prose face |
| `claimSeeds` | seeded claim evidence |
| **`outfit`** | **`kit`** |

Same structure. Different name, player-side, one kind.

## ⚠⚠ The expander exists — and is already duplicated

`EnrollController.commit` step 5 performs exactly an archetype expansion:
clone each garment, `ContainmentApi.move`, `getSlotClaim`,
`SlotApi.occupyAll`, skipping tolerantly on mismatch — then
`ChronicleApi.seedClaims(avatar, aspiration.claimSeeds)`.

**`Login.ts:298` does the same loop again** for the anonymous-guest path.

Two copies of one sequence. ⭐ **Extracting it into a general expander is
this build's first move, and it pays for itself before any NPC uses it.**

## Which dissolves the kit problem

Gus's header states *"there is no declarative seed path to put gear on a
creature."* True from where he stands, false about the codebase —
`outfit: string[]` **is** that path. It is trapped inside a char-gen
controller and unreachable from a template row.

So `kit` is not a new axis to design. It is an existing mechanism that
needs a caller other than `enroll`.

## ⭐⭐ And the procedural selector already ships

`Login.ts:244`:

```ts
const aspiration = pickRandom(cfg.aspirations);
```

The anonymous-guest path **draws an archetype at random and applies it**,
in production, today. So "procedural NPC generation" is the same expander
with a different selector:

| selector | who chooses | shipped? |
|---|---|---|
| **authored** | the NPC template's `archetypes: [...]` | this build |
| **picked** | `enroll aspiration <key>` | ✅ |
| **drawn** | `pickRandom` over the roster | ✅ (guests) |

Three selectors, one expansion. The `NameBank` suggester is already the
same story for names: Petra Volkova and Ilse Marrow read hand-picked, but
a `hand` role could draw from a bank exactly as species do.

## The distinction to keep

Char-gen fields are a **superset** of archetype kinds. `species`, `sex`,
`name`, `pronouns` are **atomic picks** — not archetypes, and they should
not become them. Only `aspiration` is archetype-shaped.

⭐ That tells you what adding `role` or `temperament` to char-gen costs:
**one `FIELDS` table entry each.** The payload is projected from that
table and the client holds no field list, so a new archetype kind reaches
the player with zero client work. That property was built deliberately in
the Arrival build; this is what it was built for.

⚠ **Do not conflate the two ledgers.** Aspiration seeds **chronicle**
claims (`ChronicleApi.seedClaims`); temperaments seed **trait** claims
(`TraitApi.seedClaims`). Two ledgers, two seeders, one pattern. A unified
expander fans into both and keeps them distinct.

## It also makes lineage legible

[lineage-slate](./lineage-slate.md) has species and aspiration demoting
from *fields* to *filters*, a point budget appearing, and a gallery of
households. In these terms: **a household is an archetype bundle**
(origin + kit + starting claims), the gallery is an archetype picker, and
the budget is a **cost on archetype selection**.

So lineage is not a replacement for char-gen so much as char-gen with a
richer archetype vocabulary and a constrained selector — a much smaller
build than "replace intake."

---

# ⭐⭐⭐ Deviations — everything participates, and the delta is the character

Archetypes alone make everyone a type. The second half of the model is
that **deviation from the archetype is modelled explicitly**, so
everything can play the archetype game while still being someone.

```yaml
archetypes: [/stuff/role/hand, /stuff/temperament/steady]
deviations:
  - { disposition: sociability, valence:  50, note: "cheerful; not the usual grind" }
  - { disposition: diligence,   suppress: true }
```

A deviation is a **declared delta with a reason**. It is not an override
that happens to differ — it is the thing that says *this one is not like
the others, and here is how.*

## Why it is worth modelling rather than leaving implicit

- **It is how people describe characters.** "A barkeep, but terrified of
  the dark." The deviation is the hook; the archetype is the setup.
- **It is what an LLM should lean into.** *"You are the Anchor, except
  unusually curious"* prompts far better than a flat five-axis dump.
- ⭐ **It subsumes suppression.** Additive and suppressive deviations are
  one concept, so the Bram finding needs no separate mechanism.
- ⭐⭐ **It gives procedural generation its dial.** *Generate a Hand with
  one deviation* produces variety without a new archetype. 6 roles × 10
  temperaments × a small deviation draw is enormous variety from a tiny
  roster — which is the "few archetypes vs. many" tension resolved from
  the other side. **You do not need many archetypes if archetypes can
  deviate.**

## ⭐⭐⭐ An authored deviation and an earned drift are the same quantity

For **cast**, the archetype is a seed and play moves the character away
from it. That distance is computable:

> **deviation = current derived position − archetype baseline**

An authored deviation is that delta *written at mint*; an earned drift is
the same delta *accumulated by play*. They differ only in when they were
written and by whom — the identical relationship archetypes have to
char-gen (an author's prologue vs. a player's).

Which yields the thesis for the player side: **your archetype is what you
picked at intake; your deviation is who you actually became.** Readable,
measurable, and exactly what `chronicle` / `score` want to show.

Per rung:

| | archetype | deviations | drift |
|---|---|---|---|
| **prop** | a lens | few or none — that is what makes it a prop | impossible (no key) |
| **cast** | a seed | declared at mint | accumulates under play |
| **player** | aspiration / household | — | the entire character arc |

## ⚠⚠ The requirement this creates, cheap now and impossible later

To compute *deviation from archetype*, a seeded row must record **which
archetype minted it**. `DispositionEntry` today carries
`kind: 'claim' | 'deed'` — enough to separate authored from earned, **not
enough to separate archetype-claim from deviation-claim.**

⭐ This is the same lesson as
[company-and-capital.md](../../company-and-capital.md) § forward
compatibility: *the only un-retrofittable property is provenance
separability*. Seed archetype and deviation rows without distinguishing
their source and the delta can never be recovered — you would be
unwinding a sum with no seams.

**Stamp the minting archetype on the row. It costs one field now and is
unrecoverable later.**

# Settled in conversation (kept so they are not re-proposed)

- **Vocation stays in.** An earlier worry that a role archetype would
  touch employment and move money is **wrong**: the shipped rows show a
  role expands into `behaviors:` only. `shifts`/`restocks` *read*
  employment state; the position itself is authored on the Business
  roster. No side effects outside the host.
- **Not a class hierarchy.** The location precedent is one class, many
  template rows. Archetypes add zero classes.
- **Not template inheritance** — it does not exist and this does not
  introduce it. An archetype is applied by expansion, not by parenting.
- **The seed-vs-lens fork does not exist.** It is determined by identity,
  not chosen per design.
- **Archetypes are starting points, not categories.** A row may override
  anything. Purity is not a goal and Dave is the proof.
- **`kit` is not a missing axis.** `AspirationRosterEntry.outfit` is the
  declarative gear path Gus's header says does not exist; it needs a
  caller other than `enroll`, not a design.
- **Char-gen is not an adjacent system to integrate with.** It is the
  shipped implementation of this design for one kind. Build against it;
  do not build a parallel expander.
- **Suppression is not its own mechanism.** It is one direction of a
  deviation.

---

# Open questions

1. **Where do archetype rows live?** A `DocumentKinds` entry (sibling of
   `emote`, `recipe`, `name-bank`, `blueprint`) is the closest existing
   family — authored, pack-installable, not instanceable. ⚠ Note the
   aspiration roster is **not** there today: it is `CharGenConfig`, read
   from a settings document. Unifying those two homes is part of the
   question.
2. **Do `role` and `temperament` become char-gen fields?** One `FIELDS`
   entry each and the client needs no change — but whether a player
   *should* pick a temperament directly, rather than earning one, is a
   design question, not a plumbing one.
3. **Are `station` and `origin` real kinds?** Proposed in conversation,
   but **no shipped row needs them** — every current NPC factors into role
   × temperament alone. Probably defer until content demands them; adding
   an axis later is cheap, removing one is not.
4. **Is the 17-axis roster sufficient for authored character?** The
   Confessor's `honesty: -70` is doing two jobs (discretion, not
   dishonesty). One data point, but it is the axis set's first stress.
5. **Does a lens cost anything at scale?** A prop's temperament resolves
   per read. Probably trivial (pure arithmetic over ~5 in-memory entries),
   unmeasured.
6. **What reads `voice:`?** Written here as the LLM/prose face. `bioSeed`
   is its shipped counterpart and has exactly one consumer (`Persona.bio`
   at commit). May belong with the LLM brain build.
7. **Is a deviation budget a thing?** Lineage introduces a point budget
   over archetype selection; the same currency could price deviations —
   *one free, more cost you.* Speculative, and only worth it if lineage
   lands first.
8. **How is drift surfaced?** The deviation delta is computable for cast,
   but nothing reads it. The `chronicle` / `score` surfaces are the
   obvious homes; [narration-slate](./narration-slate.md) owns the
   question of what tells you a trait moved.

---

# What this slate does NOT cover

- **The LLM brain itself** — see [llm-content-slate](./llm-content-slate.md).
  This slate only notes that a temperament's `voice:` is the natural
  prompt seed, and that a prop needs one because it has no ledger to
  derive from.
- **Writing traits from play.** [narration-slate](./narration-slate.md)
  owns the "nothing writes a player's traits" hole. This slate *depends*
  on that staying true for props (see the deed-row hazard) and *wants* it
  fixed for cast.
- **The prop/cast mechanism.** Being built in build-3; this slate consumes
  the flag, does not define it.
- **Parentage / lineage.** See [lineage-slate](./lineage-slate.md). This
  slate re-reads it — a household is an archetype bundle and the gallery
  is an archetype picker — but does not design it.
- **The build order past the first move.** Only the first move is
  asserted: **extract the duplicated expander** out of
  `EnrollController.commit` / `Login`, which stands on its own merits
  before any NPC consumes it.
- **Location archetypes.** Shipped, different subsystem, borrowed only as
  precedent.
