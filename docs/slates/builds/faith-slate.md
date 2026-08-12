# Faith slate — the seven wants Tradition does not serve

> **Status: sketch / pre-requirements.** [tradition-slate](./tradition-slate.md)
> covers the *inherited account* half of religion and explicitly demotes
> faith to one consumer among craft, medicine and guild. Scored against
> what players actually reach for from religion, that serves **one want of
> eight.** This slate is the other seven.
>
> **It re-solves nothing.** The inherited account, the attention order,
> the null-law error model — all Tradition's. What is here is what a
> *faith* has that a craft school does not: **a standard you are held to,
> people who hold you to it, a practice, a place, and the ability to make
> a new one.**

See also: [tradition-slate](./tradition-slate.md) · [uncertainty.md](../../uncertainty.md)
(why a god may not be the RNG) · [measurement.md](../../measurement.md)
(**the reading rules — the hardest constraint here**) ·
[trait-slate](./trait-slate.md) (the two-value arithmetic the fall *is*) ·
[lineage-slate](./lineage-slate.md) (you are born into a congregation) ·
[story-bible.md](../../story-bible.md) (the six patrons, the Chapel,
*deeds are the liturgy*, the good-floor).

---

## What prior art got right, in one table

| Lesson | Exemplar |
|---|---|
| **Religion that FORBIDS beats religion that GRANTS** | the Paladin's code — still the best religion mechanic in the genre |
| a faith declares **sin and virtue**, and others' regard reads it | CK3 |
| practice is a **scheduled communal event** with roles | RimWorld's Ideology rituals |
| the **institution has interests** and an economy | Graveyard Keeper |
| let people **found and reform** it | CK3 again |
| **meet a need, don't grant a power** | Dwarf Fortress — dwarves need to worship; unmet, they are unhappy. No powers, ever |
| the truth may be **contested in-fiction** | Morrowind's Tribunal |

And the failure to avoid, from the deepest system in the genre: **NetHack's
religion is mechanically rich and philosophically empty.** Altars, sacrifice,
prayer-on-a-timeout, gift tables — a real economy, and **you farm the god.**
Gods differ by an alignment letter and a loot table; there is no belief
anywhere, only transaction. Also banned by inheritance: **faith as a numeric
currency** (Graveyard Keeper's Faith, piety-as-points) — points that buy
things are the Bubsy failure in vestments.

---

# Part 1 — ⭐⭐⭐⭐ Precepts and the fall

## The mechanic nobody has automated

The Paladin's fall is the genre's best religion mechanic and **has never
been systematized, because it needs a DM** — someone human to judge
whether you violated your code. Every computer game that tried it
degenerated into a hardcoded list.

Three pieces we have and they did not:

1. **The chronicle** — an append-only deed ledger with `tags`, already
   built, owner-scoped, explicitly a *dumb store for smart consumers*
   whose readouts were deferred.
2. **A `Tradition` of `kind: faith`** declaring which deed-tags are
   **liturgy** and which are **transgression**.
3. **Derive-on-read**, the house pattern for exactly this.

> ⭐⭐⭐ **The fall is a derive-on-read projection of your chronicle
> against the precepts of the faith you yourself declared.** No DM. No
> RNG. Deterministic, recomputable, auditable.

And critically: **it is your own declared standard applied to you.** That
is [story-bible](../../story-bible.md)'s *"worship is a mirror"* with a
mechanism at last. The game never judges you by its morality; it measures
you against the yardstick you picked up voluntarily.

## The shape

```yaml
# seeds/obj/Tradition/eir.yaml  — the faith half of a Tradition row
data:
  key: eir
  kind: faith
  patron: eir
  label: The Mend
  tenets:                    # normative, never adjudicated
    - Tend what is in front of you before what is far away.
    - Take no side in a quarrel you are treating both ends of.
  liturgy:                   # deed-tags that ARE the practice
    - treat-wound
    - attend-dying
    - ritual-attend
  transgressions:            # deed-tags this faith holds you from
    - harm-nonconsented
    - refuse-aid
```

## The derivation — and the hardest constraint

Fidelity uses [trait-slate](./trait-slate.md)'s arithmetic unchanged —
one ledger read at two half-lives:

```
expressed  =  equilibrium + recent deviation
```

Four properties fall out, none bolted on:

| | |
|---|---|
| **falling short** | a *deviation*, not a state. No fallen flag to set or clear |
| ⭐ **redemption** | **the mean reversion.** The good-floor stops being a mercy rule and becomes arithmetic |
| ⭐ **apostasy** | sustained contrary behaviour moving `equilibrium`. Not a menu action — *it happens to you, and you recognize it later at the Chapel* |
| **anti-farming** | *cheap to look pious this week, expensive to be pious* |

> ⚠⚠ **And the fidelity value is never readable. By anyone. Ever.**

[measurement.md](../../measurement.md) Part 6 forbids a gauge on a
declared standard — *a number converts a standard back into a score to
optimize, which is Mara wearing vestments.* So there is **no `faith` verb
that shows your standing**, no meter, no band, no percentage.

What exists instead is **the narration of a surprising write** — the
trait rule, *announce the surprising, not the every* — which produces,
unmodified, the register conscience actually speaks in:

> *You'd not have done that a year ago.*

⭐ That the trait slate derived this line for *personality* drift and it
arrives here needing no edit is the strongest evidence the pattern is
right rather than merely reusable.

**Readable:** your own recent acts (the chronicle renders them today).
**Not readable:** what you are.

---

# Part 2 — ⭐⭐ Congregation: the consequence is social

Single-player games structurally cannot do this, which is why the genre
has no prior art worth copying. The consequence of drift is **not lost
powers** — faith grants none by doctrine. It is that **people who share
your declaration notice.**

That also answers *"what do I get for worshipping Pan"* with something
other than a bibliography: **you get people who care what you do.**

**A fifth `GroupProvider.`** `GroupApi` today has four —
`ManagedGroupProvider`, `MqlGroupProvider`, `ContactsGroupProvider`,
`PartyGroupProvider`. A congregation is the fifth: membership *is* your
declared patron, `GroupRef` shaped `congregation:eir`. It supplies a
channel ([chat.md](../../subsystems/chat.md) rides it), a notify target,
and the audience below.

⭐ **You are born into one.** [lineage](./lineage-slate.md)'s gallery
gives you a household with a faith and two live relationships. You do not
*join* a congregation; **you were raised in one and may leave.** That is
how it works for most people, and it beats a join verb.

## ⭐⭐⭐ How the congregation finds out — witnesses, never broadcast

The load-bearing question, and the obvious answers are both wrong. If
deeds are private the congregation cannot react and faith is cosmetic. If
deeds broadcast, we have built a panopticon and a griefing engine.

> **A transgression is known to your congregation iff somebody perceived
> it and told them.**

The belief substrate already models exactly who perceived what, honestly
fogged. So:

- it uses **shipped machinery** ([belief.md](../../subsystems/belief.md),
  [perception.md](../../subsystems/perception.md));
- **concealment and stealth become religiously meaningful** — sinning
  unseen is a real option with a real cost to attempt;
- **the informer is a role**, with all the drama that implies;
- and it is how it actually works.

---

# Part 3 — Ritual: practice at a time and place

The RimWorld shape, on our substrate: a **scheduled communal event with
roles and attendance**, rides
[activity.md](../../subsystems/activity.md)'s engagement family and
`WorldClockApi.cron`.

- **Roles** — an *officiant* (a temple position, Part 4) and attendees.
- **It produces witness, not a buff.** A ritual mints chronicle entries
  with `who` = the attendees. ⭐ That is the first real consumer of
  chronicle's `who` field, *"inert in v1"* — and
  [lineage](./lineage-slate.md) already noted that person records are
  what make `who` mean anything.
- **Attending is a liturgy deed-tag**, so practice feeds equilibrium.
  Turning up *is* the worship, which is the Dwarf Fortress lesson
  (a need met, never a power granted).
- ⭐ **And it is where the congregation sees you.** Attendance is the
  honest, unfakeable signal — you were there or you were not.

⚠ **No mood buff, no bonus, no consumable.** The moment a ritual pays a
mechanical dividend it becomes a chore on a timer, which is the genre's
most reliable way to make worship feel like a job.

---

# Part 4 — The temple as an institution

Graveyard Keeper's insight — *the church is an economy with interests* —
lands free on our governance stack.

| Need | Rides |
|---|---|
| the temple holds ground | [parcel.md](../../subsystems/parcel.md) title |
| clergy is an appointed position | [governance.md](../../subsystems/governance.md)'s Office substrate + the appointing-authority-appoints pattern; [employment.md](../../subsystems/employment.md) for roster and wage |
| offerings | ⚠ a **transfer**, never a mint — [banking.md](../../subsystems/banking.md)'s conservation is Tier-A and not negotiable |
| the Chapel | ⏳ story-bible content, **unbuilt** — no seed exists |

⚠ **The office guard applies in full.** Authority is `holdsOffice`, never
identity; the founder is a *default holder* only. A high priest is a seat
the law points at, not a person — the same rule that keeps the Compact
honest keeps a church from becoming a personality.

⭐ **This is what makes a faith politically real** rather than a costume:
it owns ground, appoints people, holds money, and therefore has interests
that can conflict with the locality's.

---

# Part 5 — Founding a faith

CK3's best feature, and our version should be better because we have
player authorship. A founded faith is **a `Tradition` row with
`kind: faith`** — authored through the CMS like any content.

**Heresy and schism cost nothing to support:** a faith with the *same
patron* and *different precepts* is simply a second row. Two Traditions,
one god, incompatible standards — which is most of religious history.

⚠ **But "who may mint a faith" is the open question**, and the naive
answers are bad: anyone-with-a-form gives spam; an authored allowlist
gives a state church.

**Lean:** a faith is not a form submission but an achievement —
> **it exists when it has a congregation and a place.** Adherents and
> ground, both already gated by shipped systems.

That is diegetic, self-limiting, and needs no new permission model. It
does leave a bootstrapping question (§ open).

---

## Objects and interactions

### New

| Piece | Category | Shape |
|---|---|---|
| `liturgy` / `transgressions` | fields on `Tradition` | two lists of deed-tag keys, `kind: faith` only |
| `CongregationGroupProvider` | GroupProvider | the fifth; membership = declared patron |
| `FaithApi` / `FaithLogic` | Api + logic singleton | the fidelity derivation and the surprising-write narration. ⚠ **exposes no fidelity read** |
| ritual | Engagement + `cron` schedule | roles, attendance, mints chronicle `who` |

### Reused unchanged

`ChronicleEntry` (deed/claim, `tags`, `who`) · the trait two-value
derivation · `GroupApi` · belief + perception (the witness path) ·
`Office` + `ParcelApi` + employment · banking transfers · the engagement
family + `WorldClockApi.cron` · the Chapel (⏳ content).

### New collections

**None.** Fidelity derives; membership is a declared field; ritual
attendance lands in `chronicles`.

---

## ⚠⚠ Dangers

1. **This is a coercion surface if consent erodes.**
   [measurement.md](../../measurement.md) Part 8 makes two properties
   non-negotiable — **declaring is opt-in, and leaving is cheap.** A
   congregation is a club, not a jurisdiction. If social or economic
   pressure makes leaving costly, none of this document's defences apply
   to it any more.
2. **The subject is real and the mechanics will read as commentary.** A
   system that computes whether you are a good believer makes a claim
   whether we intend it or not. The discipline: **measure fidelity to a
   declared standard, and stay silent on whether the standard is good.**
   No faith is mechanically better than another; the world never ranks
   them.
3. **The good-floor holds.** Drift, never damnation; always redeemable —
   and here that is not a policy but the mean-reversion arithmetic.
4. **The informer is a griefing vector** if reporting is frictionless.
   Witness must ride real perception (it can be prevented, evaded, and
   lied about), never a system notification.

---

## Open questions

1. ⚠⚠ **The deed-tag vocabulary is the joint everything hangs on**, and
   chronicle's `tags` is *"open vocabulary — inert in v1."* Precepts need
   a **closed** vocabulary to point at. This is the same question as
   [measurement.md](../../measurement.md)'s Tier C last row — *does the
   measurement vocabulary belong in the governed layer?* — and it is
   unresolved there too. **Nothing in this slate is buildable until it
   is.**
2. **Bootstrapping a founded faith.** If a faith exists once it has a
   congregation and a place, how does the first adherent join something
   that does not yet exist? (Probable answer: a *seeking* state and a
   declared intent, which costs nothing but a row.)
3. **Can you hold no faith and still have a congregation?** The
   naturalist Tradition has adherents but no patron and no temple. Is
   there a reading room? *(Lean: yes, and it should feel different —
   a society, not a congregation.)*
4. **What does the officiant actually do** during a ritual, in commands?
   Undesigned. The risk is a `pray` verb that is a button.
5. **Does a transgression witnessed by nobody still move equilibrium?**
   ⭐ Design says **yes** — the ledger is the truth and belief is
   separate. Your congregation's *regard* moves only on witness; **you**
   are what you did. That split is the whole point of having both stores,
   and it is worth stating loudly because it is the first thing someone
   will try to "simplify."
