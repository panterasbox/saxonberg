# Press slate — the vocation that makes transparency actual

**Captured 2026-07-31**, out of the amendment-roster walk
([amendment-library-slate](./amendment-library-slate.md), the 1A
gap). The press is the institution the verification architecture has
been assuming without ever naming.

Related: [forums.md](../../subsystems/forums.md) (⚠ **NOT the substrate** — see § *What a publication is*; the layer a linked discussion
publication rides), [press.md](../../subsystems/press.md) (the
staff-side sibling), [belief.md](../../subsystems/belief.md) (the
witness path), [enforcement-slate](./enforcement-slate.md) (the
evidence firewall and the testimony model),
[chronicle.md](../../subsystems/chronicle.md) /
[chattel.md](../../subsystems/chattel.md) /
[banking.md](../../subsystems/banking.md) (the readable record),
[streaming.md](../../subsystems/streaming.md) (the out-of-fiction
press that already ships).

## The argument, in one sentence

**The entire verification architecture assumes somebody verifies.**
Chapter 6 of the manifesto says *don't trust, verify — check it
yourself*, and the record genuinely is checkable. But **"anyone can
check" degrades to "nobody does"** unless checking is *someone's
job*. The press is the institution that makes transparency **actual
rather than theoretical** — and it is a vocation, not a feature.

## Why journalism is a real activity here (the evidence firewall)

Because the kernel's omniscience is off-limits to everyone inside the
fiction, a reporter cannot query the truth. They must **work**, along
exactly three paths:

1. **Witness** — be there. The belief substrate means what you saw is
   per-viewer, honestly foggy, and defeasible by disguise and
   concealment. Being present is a cost and a skill.
2. **Interview** — talk to someone who was. Testimony is a *claim*,
   never a query: it can be true, honestly mistaken, or a lie, and
   sorting those is the reporter's craft (and the source's
   credibility is itself a derived, readable track record).
3. **Read the public record** — the ledgers, the chattel
   chain-of-title, the chronicle, the parcel registry, the bank's
   published leg. This is the **killer path**, because the data is
   real: correlate a chattel transfer against a vote's timing and
   you have a story **you actually found**. Investigative journalism
   is genuinely playable here — not as a minigame, but as reading
   what the world already keeps.

## ⭐ A newspaper is an ORGANIZATION that trades and publishes

> **Recorded 2026-08 by the organizations build**
> ([employment.md](../../subsystems/employment.md),
> [press.md](../../subsystems/press.md)).

The substrate this slate needs is now partly built, and it arrived from a
direction this slate did not anticipate — through the **org chart**,
factored out of `Business` so that positions, holders and an appointing
authority stop being a thing only a *trading* entity can have.

The consequence for the press build is a simplification worth stating
plainly:

⭐ ***"Who is the editor in chief?"* is the same read as *"who is the
comms director?"*** — `EmploymentApi.holdersOf(organization, positionKey)`.
A newspaper is one entity wearing three hats: `OrganizationMixin` (the
chart), `BusinessMixin` (it sells things and pays people), and
`PublisherMixin` (it puts things out). Nothing about a masthead needs its
own machinery — a masthead **is** an org chart, and the reason it looked
like it needed one is that positions used to live only on Businesses.

What that buys the press build for free:

- **Bylines and beats are positions**, with `reportsTo` giving a real
  masthead hierarchy (a stringer reports to an editor reports to the
  editor in chief).
- **Who may publish under the masthead** is `publishingPositions` — the
  editorial gate is the same shape as the ministry's, so a press
  credential later issues to a *position*, not a person.
- **Ownership vs newsroom is already two different questions.** The
  appointing authority (who may fill the editor's chair — an owner, a
  trust, a co-op's committee) is structurally distinct from the position
  that does the work. That distinction is the whole of press independence,
  and it is now mechanism rather than fiction.
- **The publisher's feed branch is a document-tree path it owns**, which
  is what this slate asked for as `/feed/<publisher>/`.

⚠ Still unbuilt and still this slate's job: subscription (PULL → PUSH),
the stance action, the paywall, the three source paths, the recording
instrument, and the docket.

## What a publication is

⚠ **Revised 2026-08-02.** This section previously read *"mostly
assembly"* and modelled a publication as a **periodical** — *"issues are
threads, stories are entries."* **Wrong form.** Substack was the stated
inspiration and **Substack has no issues**: nobody composes issue #7 out
of five pieces. You write a post and it goes out.

*(User: "that's not how substack really works. this actually started off
with wordpress and blogs as the model but no one does that anymore.")*

### ⭐⭐⭐⭐⭐ The real evolution is PULL → PUSH

The blog **died as a destination** — not because the writing changed, but
because **nobody visits.** The unit was always the post; what changed was
**delivery.**

> **You don't visit a publication. It arrives.**

Which reframes this slate's own three layers as **two pull surfaces and
one push surface** — and **the push is what makes it a publication**:

| Layer | Direction |
|---|---|
| the record | queryable — **pull** |
| the docket | queryable, complete, boring — **pull** |
| **a publication** | ⭐ **it arrives** — **PUSH** |

### The form, decomposed

- ⭐ **The unit is the POST, not the issue.** No bundling, no assembly, no
  compose-and-release. **This makes the build substantially cheaper** than
  a periodical would.
- ⚠ **A publication does NOT ride the forums' Subject layer.** *(User,
  2026-08-02: "you're not merging them with forums are you? we talked
  about that and rejected it.")* **Correct — and this slate contradicted
  itself**: it said *"a publication rides the forums' Subject layer"* here
  while § *The structural threat* said `bulletins → /feed/<publisher>/` in
  the **document tree** "is what this slate needs." **The document tree is
  the right answer; the forums claim is struck.**

  Three independent reasons, any one sufficient:

  | | |
  |---|---|
  | **direction** | forums are **pull** — you go to a board. A publication **arrives** |
  | **symmetry** | forums are **deliberative** — anyone posts, everyone replies. A publication is **one voice** |
  | ⭐⭐ **the organizer** | forums' *defining feature* is the per-board **ranking axis** (`popularity` / `argument`). **"No algorithm" is a publication's defining commitment** — riding forums means inheriting the exact thing you must then disable |

  Same shape as [auction-slate](./auction-slate.md)'s rejection: *forums and
  chat carry **speech**; an auction carries **commitments**.* Here:
  **forums carry DELIBERATION; a publication carries a BROADCAST.**

- **A post is a Document at a path** — `/feed/<publisher>/<post>`.
  ⭐ **Comments LINK, they do not merge**: a post may point at a forum
  thread for discussion, exactly as a real article links to a comment
  section **without being one.** The publication keeps its shape; the
  argument happens where arguments belong.
- ⭐⭐ **Subscription is the primitive**, and it is an **attention rule** —
  `NotifyPolicy` already decides what reaches you. Probably not a new
  system.
- ⭐⭐ **Delivery is the AETHER.** Substack's channel is email, which is
  out-of-world; ours is the implant — a device that receives, *including
  while you sleep* (physiology § Part 7d). **An issue arriving is a
  message**, and it gives the aether a job beyond chat.
- **The masthead is a person.** Credibility runs **both ways**: your
  standing lends the publication authority, and its failures cost you
  standing.
- **Free and paid tiers** ride banking + recurring contracts. The
  interesting part is the tension, not the mechanism — see § *the paywall*
  below.
- **No algorithm.** You get what you subscribed to, in the order it was
  published. Worth committing to explicitly.
- ⭐ **Cadence is a promise you can break VISIBLY.** A publisher who says
  weekly and goes quiet is legibly unreliable, with no reputation mechanic
  needed. ⚠ At 12× a "daily" is every two real hours and a "weekly" is
  fourteen — **the clock-tuning problem again; pick the number from play,
  not from realism.**

### ⭐⭐⭐ Three overlapping systems, three different shapes

All three are being built, they cover similar ground, and **conflating any
two of them loses the thing that makes it useful**:

| | Voices | Output | Shape |
|---|---|---|---|
| **forums** | many, **arguing** | positions that stay apart | ranked, threaded, **pull** |
| **wiki** | many, **converging** | **one text they agree on** | edited toward agreement, **pull** |
| **the press** | **one** | **an assertion somebody signs** | unranked, serial, **PUSH** |

> **Forums argue. The wiki converges. The press asserts.**

⚠ **All three are ATTRIBUTED** — [wiki-slate](./wiki-slate.md) is explicit
that *"every page is authored"* and keeps `{ author, at, snapshot }` per
revision. The wiki differs by **what attribution is FOR**: on a wiki it is
an **edit trail**, on a publication it is a **byline you answer for**.

They **cite** each other constantly and share **no substrate** — though
wiki and press are both plain `Document` collections on the same document
track (`wiki` and `/feed/<publisher>/`), which is the right kind of
sharing: same machinery, separate stores.

### ⭐⭐⭐ The paywall is the press's own contradiction

This project's thesis is that transparency is **actual** — and a paywall
gates it behind money. The honest resolution is the real-world one:

> **The record is always free. You are paying for the editing, not the
> facts.**

Which is the genuine defence of paid journalism, and **having the argument
available in-world is better content than settling it by fiat.**

### ⭐⭐ The piece most worth stealing

Substack's actual innovation is not the editor or the paywall:

> **The writer owns the subscriber list.** The anti-platform promise.

Which is **the same promise the hosting model makes** — *you can leave and
take it with you* — one layer down. **The publication form and the
business model tell one story rather than two.**

⚠ **Discovery is where we are BETTER off than Substack**, whose known
weakness is that nobody finds you. In a world with a real social graph,
**discovery is people telling each other.**

### The rest of the mechanics
- **Credibility derives from the track record**, exactly like
  testimony: claims that survive scrutiny accumulate, claims that
  fail do too, and readers see the record. A paper is not trusted
  because it is licensed; it is trusted because it has been right.
- **The bulletin system is the staff-side sibling** (staff→player
  news ticker, shipped); the press is the **player-side** one.
- **A streamer is already a press.** The broadcast track ships the
  out-of-fiction version; this gives the in-fiction one the same
  standing, and the two should share vocabulary where they can.

### ⚠ The structural threat: an auto-generated ticker

**(Added 2026-07-31, out of the delegation/ticker pass — worked in
[cooperative-slate § Surfacing](./cooperative-slate.md).)** The
governance build wants a news ticker for bills approaching a crossing.
**If that ticker auto-reports every event, it is an omniscient feed —
and it makes this entire vocation pointless before it ships.** The
slate's own thesis is the diagnosis: *"anyone can check" becomes
"nobody does" without a press.* An automated feed is the machine doing
the checking, forever, for everyone.

The resolution is a **three-layer split**, and it is what finally makes
a publication a *thing you subscribe to* rather than a board you read:

| Layer | Character |
|---|---|
| **the record** | queryable, complete, **never pushed** — transparency is total and machine-provided |
| **the docket** | *unedited* chronological events; public, boring, complete. **Nobody reads the Federal Register — that is the point, and precisely why journalism exists** |
| **the ticker** | a **publication**, therefore it has a **publisher** — you subscribe to one |

So `bulletins → /feed/<publisher>/` (already floated as a tree
candidate in [legal-code-slate](./legal-code-slate.md)) is what this
slate needs: **the Compact runs the default publisher; players run
others.** A press outlet becomes mechanically real as *a publisher
whose ticker you can subscribe to* — partisan press possible, bias
possible, the record always there to check against, **no new
mechanism.**

> **The rule that protects the vocation: the default feed reports
> *events*, never *significance*.** "Bill X crossed threshold in the
> Play chamber" — never *"Landmark arms bill advances."* **The machine
> can report facts; only a person can say why it matters** — and that
> sentence is the job description.

A publisher's ticker **may** carry an inline stance action. That is
what real media does, it is visible, and pretending otherwise would be
the dishonest option.

## Press freedom — and the emergent that teaches it

A committee owns its parcel, so it genuinely **can** bar a
publication from operating there. And **exit** means the press
relocates one jurisdiction over and keeps reporting — now with a
story about being thrown out.

> **Suppression is self-defeating, and the world demonstrates it
> without anyone arguing the point.** Tiebout sorting, applied to
> journalism.

That is the 1A press module's payload: not a shield the kernel
grants, but a *constraint a community adopts* — and the cost of not
adopting it is legible in play.


## Discipline or reputation? Both — two orthogonal axes

**(User's test, 2026-07-31: "does study.com have a journalism course
with assessments? If yes, it's a Discipline.")** They near-certainly
carry journalism / mass communications with assessments — **verify
against their actual catalog before this locks**, per the standing
accuracy rail. So: **yes, a Discipline.**

But it is not either/or, and the user's correction is the better
frame — **craft and credibility are orthogonal**:

| Axis | Answers | Where it lives |
|---|---|---|
| **Discipline** (craft) | *can you do the work* — sourcing, records literacy, structuring a claim | Transcript / competence bands, the external-issuer seam |
| **Reputation** (credibility) | *have you been right* | derived track record, exactly like testimony |

A degree does not make you trusted; a track record does not teach
you to read a ledger. Both exist in the real profession, neither
substitutes, so the model carries both. **Competence sharpens,
never multiplies** (the standing rule): journalism competence buys
*reading the record faster* and *sensing a shaky source* — never
"your articles are more persuasive." Persuasion stays a property of
the evidence, not the byline; that is also the anti-propaganda rail.

## Secrecy — seal, don't hide

**The stake is not realism.** It is that **if the game cannot keep a
secret, the politics moves to Discord** — the venue doctrine again:
conversation pools where friction is lowest, and if privacy exists
only outside the world, the strategy talk leaves and the world
becomes theater. **In-game secrecy is required to keep the game's
politics in the game.**

**The resolution is integrity vs. accessibility.** The record must
be complete and tamper-evident — non-negotiable. It need not be
universally *readable*. So a **sealed entry is a first-class entry**
carrying **who sealed it, when, under what authority, and when it
opens** — content withheld, **existence public**. Integrity
survives; secrecy is real; accountability survives too (one office
sealing forty-seven things last month **is a story**).

And the manifesto's promise holds in its exact form: **nothing can
be *secretly changed*.** Secret content was never the same claim as
secret existence.

**Two things that must never be conflated:**

- **Private association** — any group's private comms. A **right**,
  symmetric, available to everyone (the parties case; the 1A
  assembly clause wearing a channel). If one party can keep
  secrets, all can — that is the design requirement.
- **State classification** — an office sealing official records. A
  **power**, asymmetric, requiring governance: who may seal, for
  how long, under what review.

**No encryption — and say so out loud.** Access control, not crypto,
because **moderation requires readability**: real end-to-end
encryption would mean we could not act on harassment in the one
place people would then take it. The honest posture matches the
attunement equilibrium — state the trust model plainly (the
operator can see everything and uses it for integrity and
moderation only; *diegetic* institutions genuinely cannot read what
they were not given). Never sell a guarantee we would have to
break.

## FOIA — a complete loop, and only possible because sealing is public

**Request → refusal → appeal → publish**, built entirely from
shipped machinery: you can see something is there, so you can
request it; **the executive both holds the seal and answers the
request** (the real-world tension, intact); refusal is appealable to
the courts; declassification timers give automatic sunset.

### What "you can see something is there" actually requires: the docket

The loop's first step has been assuming an **existence register**
without naming one. It is the **docket** —
[legal-code-slate § The docket](./legal-code-slate.md) — the
cross-jurisdictional, append-only index of governance events, sibling
to the Roll (*the Roll records what became law; the docket records
what happened*).

> **A sealed proceeding appears on the docket with its content
> withheld.** Existence public, content withheld — seal-don't-hide,
> mechanically. **Without a docket, "seal, don't hide" has nowhere to
> show the seal**, and FOIA has nothing to point at.

The same object is this slate's **reporting surface**: filter the
docket by target and a bill's whole life falls out — *tabled →
crossed → uncrossed → crossed → vetoed → overridden → enacted.* **It
hands you the timeline; it never writes the story.** Exactly what a
real docket does for a court reporter, and the reason the default
ticker (a saved docket query) cannot editorialize while a player
outlet can.

## Secrecy creates journalism (the reframe)

**Without secrets a reporter is a search function.** With them you
get the actual profession:

- **the FOIA fight** (above);
- **the leak** — a source with access choosing to disclose: a
  genuine ethical situation, simultaneously a betrayal of an
  obligation and sometimes the right thing, and attributable if
  traced (the accountability ledger);
- **source protection** — now load-bearing rather than decorative:
  may a court compel the reporter to name them? This is a **named
  conflict** between the press module and the confrontation clause,
  and the catalog's dependency/conflict metadata should carry it.

**Amendment-roster additions from this pass:** a
**classification/transparency module** (sealing limits, durations,
review) and **source protection** as a catalog-level conflict entry.


## The recording instrument — `analyze`'s sibling

**(User correction, 2026-07-31: not illustration — the *instrument*.
Illustrations are just content; what matters is durable, trustable
capture a journalist can cite as evidence.)**

**The framing:** `analyze` gives *you* ephemeral knowledge — you read
a thing's honest state and it lives in your head. A recording
instrument **captures that same honest read into a durable,
attributable artifact** others can inspect later. Same epistemics,
different persistence: one is knowing, the other is *being able to
show*. The artifact carries which instrument, which operator, when,
where, and the world's actual field values at that moment, on the
record's tamper-evident spine. (The trusted-recording seed was
framed with **courts** as its consumer; the press is its **second**,
which is good evidence the primitive is general rather than
bespoke.)

**The design call that decides everything:**

> **You cannot forge a recording. You can absolutely crop one.**

The artifact is honest about what it captured — but **what you point
it at, when you start and stop, and what you publish of it are
editorial choices**, invisible unless someone else was also
recording. That is *the* real-world failure mode of photographic
evidence (the clip that begins after the provocation), and modeling
it honestly teaches far more than deepfake panic. **Corroboration
returns as the counter** — two instruments, two operators, two
framings — which makes the *density* of instruments in a place a
political fact: many recorders means framing gets caught; few means
whoever holds one writes history.

**Doctoring is detectable, not impossible** — "you can fake it, but
not in secret," the same footing as the record itself, which makes a
doctored artifact a real crime rather than an unmodelable exploit.

**Two governance hooks, both real-world functions:**

- **Certification.** An instrument is trustable partly because it is
  *certified* — making calibration a legitimate state function
  (weights-and-measures inspection is among the oldest government
  roles). Clean split: **technical honesty** (kernel — the
  instrument reads true regardless) vs. **legal admissibility**
  (certified instruments only). And a properly spicy question: who
  certifies, and may they refuse?
- **Recording consent.** One-party vs. all-party consent is real law
  that varies by jurisdiction — perfect Tiebout material and a
  natural locality-law module.

**The rail that keeps it out of panopticon territory: recording is a
visible act.** Others see you operating the instrument, exactly as
they see a held aim. The technology exists; using it is legible and
socially costly — the same equilibrium chosen for attunement.

**Aesthetic:** not a camera (that says imagery when the point is
attestation) and not a tricorder (borrowed world). It belongs to the
instrument family already shipped — the multimeter framing on
`analyze electrical`, the sextant, the sundial, the gas analyzer —
and the name should signal *attested capture*. Working candidate:
**a witness**, which parallels the human witness exactly with
legibly different failure modes (a human can lie but understands
context; an instrument cannot lie but has no idea what it missed).
**Naming is the user's call.**


## Open questions (for requirements)

1. **Distribution and reach** — does a publication circulate by
   subscription, by posting in venues, by the aether? Is reach a
   cost (paper, presses, couriers) or free?
2. **The economics of a paper** — subscriptions, patronage, ad-like
   notices, or state funding (and what state funding does to the
   check). Everything is a business; a press must be one too.
3. **Retraction and correction** — the honest counterpart to
   credibility: can a publication amend a claim, and does a
   correction repair standing? (It should, partially — that is how
   real credibility works.)
4. **Source protection mechanics** — the shape of the privilege
   (absolute? qualified? per-jurisdiction?), given the named
   conflict with the confrontation clause.
5. **Seal authority and review** — which offices may seal, default
   durations, whether the legislature can cap them, and what a
   court's in-camera review looks like when it cannot itself read
   the kernel.
6. **Leak traceability** — how much a determined investigator can
   trace a disclosure (the concealment substrate governs), and
   whether that balance leaves whistleblowing viable.
7. **The pedagogy pass** — how the vocation teaches; see below.

## The pedagogy pass — deliberately deferred

**[USER, 2026-07-31: the whole vocation should be pedagogical like
everything else — its own conversation.]** The obvious hooks, listed
only as seeds, not as design: sourcing and corroboration as literal
mechanics; the honest-error category as a lesson in why corrections
exist; statistics and records literacy as the investigative path's
real skill; and the Discipline/Transcript question — what *is* the
journalism competence, and what does it sharpen (reading the record
faster? sensing a shaky source?) rather than multiply. **Do not
design these here** — the session that does it deserves the same
depth the gun pedagogy got.
