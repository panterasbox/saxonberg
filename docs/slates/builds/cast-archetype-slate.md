# Cast archetype slate — composable character profiles, and why props can't have one

**Captured 2026-09-01.** It started from the mixin analogy and turned into
an identity question:

> **User: "we have this great mixin framework for composing classes that
> makes interoperability really cool. but we don't quite have that same
> thing for like character profiles… the same way 'all Visible stuff
> functions the same', we want something like that but for the npc
> personality/history/etc profile."**

> **Status: design conversation, captured. Not requirements.**

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
      stock: /trade/hearth-cooking/thing/pantry-stock
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

## ⭐ The finding this exercise produced: overrides must SUPPRESS

Bram Tull carries `sociability: 50` and **no diligence** — a cheerful
hand, not a diligent one. So a row-level disposition must be able to
*replace* an archetype's line, not merely add to it.

**Pure summing is not enough.** This is the one mechanism the drafting
exercise surfaced that the design had not identified, and it is the only
place composition needs a rule.

---

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

# ⭐ The missing axis: kit

Gus is a TypeScript class for one reason, stated in his own header: **a
character cannot be authored wearing anything.** `populates:` composes
only on rooms, and worn/wielded occupancy is deliberately runtime-only.
The supported pattern is `Avatar.installDefaultLoadout` — a `postRegister`
hook, i.e. code.

So `kit` is a candidate third closed kind: a declarative
"boots wearing/wielding/carrying these" bundle, expanded at `postRegister`
through the same path the Avatar loadout already uses. It would retire at
least one bespoke class, and a sentry-in-a-uniform is otherwise a class
every time.

**Not resolved here.** Two questions block it: whether kit is an archetype
kind or a separate `populates:`-for-agents feature, and whether a *prop's*
kit is re-minted per instance (probably yes — kit is runtime state, which
is exactly why it is not persisted today).

---

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

---

# Open questions

1. **Where do archetype rows live?** A `DocumentKinds` entry (sibling of
   `emote`, `recipe`, `name-bank`, `blueprint`) is the closest existing
   family — authored, pack-installable, not instanceable. Not decided.
2. **Is `kit` a third kind, or its own feature?** (above)
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
6. **What reads `voice:`?** Written here as the LLM/prose face. Nothing
   consumes it today; it may belong with the LLM brain build instead.

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
- **Parentage / lineage.** Raised as an archetype source in conversation;
  see [lineage-slate](./lineage-slate.md). It would be an `origin`
  producer if that kind survives question 3.
- **Location archetypes.** Shipped, different subsystem, borrowed only as
  precedent.
