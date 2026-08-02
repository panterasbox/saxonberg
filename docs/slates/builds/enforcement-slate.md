# Enforcement slate — modes, evidence, testimony, and the two layers

**Captured 2026-07-31**, out of the ranged/gun design session: the
gun-policy question ("what happens when he brings it to campus?")
turned out to be the general question of **how law is detected,
proved, and enforced** — upstream of [prison-slate](./prison-slate.md)
(which holds confinement and the three enforcement tiers). Applies
to every crime, not just weapons.

Related: [civics.md](../../subsystems/civics.md),
[belief.md](../../subsystems/belief.md),
[trait.md](../../subsystems/trait.md),
[accountability.md](../../subsystems/accountability.md),
[concealment.md](../../subsystems/concealment.md), the courts/venire
primitive, the trusted-recording seed.

**Institutional sibling:** [policing-slate](./policing-slate.md) —
crime (organized vs. ordinary, corpos, the alignment orthogonality)
and the police institution (the aesthetic arc, the department roster,
and the commissioner ↔ committee policy hook that makes the civics
`charter` field readable).

## The enforcement-mode vocabulary (closed set)

A committee doesn't only write rules — it picks **how each rule is
enforced**, and the mode is most of the politics:

| Mode | Mechanism | Reads as |
|---|---|---|
| **wall** | prevention — the thing cannot happen (the checkpoint refuses the weapon) | **world-nature** (nobody resents a wall) |
| **camera** | automated detection → automated sanction | **surveillance state** (universally resented) |
| **witness** | the violation is *perceivable*; enforcement needs a person to report and a process to act | **legitimate law** |
| **norm** | posted, expected, socially policed only | **culture** |

**The speed-camera doctrine (the design's governing analogy):** the
radar signs could ticket you and don't, because perfect automated
enforcement is hated even when the rule is agreed. So: *prevention
reads as physics; automated punishment reads as tyranny; witnessed
process reads as law.* A campus can wall its gates, camera its quad,
or trust its people — three different societies, one statute.

> **⭐ `wall` mode's physical form is the BARRICADE** (added
> 2026-07-31 — designed in
> [freight-slate § The barricade](./freight-slate.md)). Until now
> `wall` was an abstraction with nothing to point at. A barricade is an
> object that **raises an exit's mode requirement** — so a checkpoint
> is *a barricade with a condition* (credential, toll, inspection), and
> the **wall-mode-honesty** rule below is its refusal message. The same
> object serves the toll gate, the quarantine line, the siege, and — the
> one worth noticing — **the blockade, which is how a labor action gets
> a physical mechanic.**

**Posted law is a hard build requirement.** Jurisdiction rules and
their modes must be **visible on the land** — a border notice at
every crossing ("*Entering University grounds — arms prohibited;
checkpoint at gates*"), with the `government` verb as the full
reading surface. Tiebout sorting and fair warning both die without
legible law.

## The evidence firewall

**The kernel's omniscience serves exactly two masters — the
record's integrity, and meta-moderation. Diegetic law enforcement
gets none of it.** In-fiction justice gathers evidence in-fiction:

- **witnesses** — the belief substrate; what each person actually
  perceived, per-viewer, honestly foggy;
- **instruments** — the trusted-recording thread: cameras and
  attestation devices that exist as *objects* (placeable, visible,
  ownable, smashable, contestable);
- **confession**, and the physical traces the world already keeps.

Concealment stays load-bearing: **a crime genuinely unseen is
genuinely unproven**, and that is a feature — a world where guilt is
always provable needs no courts, values no reputation, and has no
game in it.

**The attunement equilibrium (today's world, reproduced):** everyone
is attuned; everyone can capture and report instantly — exactly like
everyone carrying a phone. What prevents universal snitching is not
a technical limit but a **social** one (regard, being known as the
person who reports). The equilibrium is therefore governable and
arguable, which is the point.

## Testimony — reports are claims, never queries

**False reports must be possible**, because auto-validating a report
against ground truth is the panopticon wearing a report verb: it
converts testimony into *a kernel query with legal effect* and
destroys the firewall. A report is what it is in life: **an
attributable claim, with an author, on the record** (the
deed-vs-claim provenance concept, already load-bearing).

Three categories, and the whole design lives in the gap between
them:

| Category | What happened | Already modeled by |
|---|---|---|
| **true report** | perceived it, said it straight | belief |
| **honest error** | perceived *something*, got it wrong — a hooded figure at `far` in bad light | belief + concealment + disguise (free) |
| **deliberate lie** | didn't perceive it, asserts it anyway | belief vs. the assertion |

**The kernel knows which. The court does not. That gap is the
courts' entire reason to exist** — if every disagreement were a lie,
you would need a lie detector, not a jury. Honest error is the
category that makes deliberation genuinely necessary rather than
ceremonial, and we get it for free from systems built for other
reasons.

**The lie discriminator (elegant, and both halves are shipped): a
lie is an assertion that contradicts the speaker's own
BeliefStore.** Not a special mechanic — literally the definition,
computable, because we model both what happened and what each
character believes.

**Scope rail — only *structured* assertions are ever evaluated:**
reports, testimony, contract clauses, argument-map claims. **Free
prose is roleplay and is never evaluated** — the system must never
become a lie detector for improv, and a character telling a tall
tale in a bar is not committing perjury.

**What makes lying costly without making it impossible:**

- **credibility derives** from your claims' track record — the
  liar isn't punished by a mechanic, they become *known*, which is
  worse and more honest;
- **false accusation is an offense** the courts can hear — perjury
  as content, not exploit;
- **corroboration is the mechanic** — independent witnesses whose
  per-viewer beliefs agree, weighed against instruments (physical
  evidence vs. testimony is a real legal tension, and it makes the
  recording device genuinely valuable and genuinely contested);
- the **report verb carries social friction and zero mechanical
  guarantee** — you are not filing a ticket, you are telling
  someone something, on your name.

**Meta rail (standing):** weaponized reporting aimed at a *real
person* — brigading to make the game unplayable — is meta
moderation, always, never adjudicated in fiction. In-fiction perjury
is a legal question; out-of-fiction harassment is an account
question.

## The two layers — intrinsic vs. social **[the session's crown cut]**

**(User, 2026-07-31: "traits are intrinsic — they represent who you
are when no one else is around, so those interactions can be
completely private and hardwired with no adjudication.")** This
names a split the codebase has been observing without a word for it:

| | **Intrinsic layer** | **Social layer** |
|---|---|---|
| **Measures** | what you *are* | what others *know* |
| **Authority** | kernel — it knows what happened | per-viewer, contested |
| **Truth** | exact | honestly foggy |
| **Adjudication** | **none, ever** — nobody is being sanctioned; this is characterization, not judgment | courts, process, appeal |
| **Members** | traits (`disposition_events`), alignment, competence (`transcripts`) | belief, regard, renown, testimony, the record-as-evidence |

So: **a lie moves your `honesty` axis the moment you tell it, unseen
and unadjudicated** — a `disposition_event` written from ground
truth, because the trait ledger is not a courtroom and nothing is
being *done to* you. Same shape as practicing archery alone in the
woods and having the transcript know: the world simply records what
occurred.

**The rule between the layers: the intrinsic layer is never
admissible in the social layer.** No court subpoenas your traits; no
constable reads your disposition ledger. But the intrinsic layer
**colors** the social one — traits already feed the regard baseline
— so people *sense* something about you without ever proving it.
"He seems shifty" is honest inference; "the ledger proves he lied"
is inadmissible. Which is exactly how character works in life.

## Open questions (for requirements)

1. **The assertion surface** — the exact list of structured speech
   acts evaluated for the belief-contradiction test (reports,
   testimony, contract clauses, argument claims?), and how a
   player can tell they are making one (the UI must never let
   someone perjure themselves by accident).
2. **Trait magnitudes for deception** — a small lie and a courtroom
   perjury should not weigh the same; valence sizing is tuning.
3. **Instrument evidence rules** — chain-of-custody for recordings,
   tampering, and whether a locality may bar instrument evidence
   (a real 4A-shaped question and a good amendment candidate).
4. **Mode declaration shape** — where a rule's enforcement mode
   lives on the Government/Locality data, and how the border
   notice renders it.
5. **Wall-mode honesty** — a prevented act must always *say why*
   ("the checkpoint will not admit an armed visitor"), never fail
   silently; walls read as world-nature only when legible.
