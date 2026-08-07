# Legal-code slate — the law as content

**Captured 2026-07-31.** We have designed a great deal *about* law —
enforcement modes, courts, prisons, amendments, policy hooks — but
never the law **itself**: what a statute is, where it lives, how it
is enacted, how the runtime reads it, and how a code accumulates a
history. This slate is that model.

The brief (user): a taxonomy of what a legislature can enact ("we've
said they're all CRs but I'm not sure that's completely true"); laws
written down somewhere **navigable**; committee law for its own
domain with less rigor but the same durability; **machine-readable
clauses the runtime can enforce**; Terminus's own enactment taxonomy;
laws that **ship with the platform** yet carry ordinary force; the
whole thing **abstracted so any content author can run a code** for a
guild, corpo, business, or gang; a code that **records its own
history**; and **pointers back to the deliberation** that produced
each law.

Related: [document-store.md](../../subsystems/document-store.md) (the
substrate), [civics.md](../../subsystems/civics.md) (the `charter`
field, departments, seats),
[enforcement-slate](./enforcement-slate.md) (modes),
[policing-slate](./policing-slate.md) (the policy hook — the charter's
first consumer), [amendment-library-slate](./amendment-library-slate.md)
(constitutional tier), [forums.md](../../subsystems/forums.md) (the
deliberation record), [governance.md](../../subsystems/governance.md).

## The substrate

`StoredDocument` is **kind-agnostic** — `{path, owner, kind, data}`,
persisted in the path-addressed third tree, with each `kind`'s
consumer owning its `data` shape. So **a law is a StoredDocument of
kind `law`, and a code is a subtree**:

⚠⚠ **CORRECTED 2026-08-04.** This slate originally rooted every code in
a top-level `/law/<institution>/` tree. **Wrong** — user: *"it's
`/domain/terminus/law/`."* The rule is:

> ⭐⭐ **A code lives UNDER the extent of the institution it governs, at
> `<extent>/law/`** — not in a parallel `/law/` hierarchy.

```
/compact/law/…                      the Compact's statutes  (⚠ /compact is a
                                    publications NAMESPACE, not a place)
/domain/terminus/law/…              Terminus's code
/domain/terminus/gray/law/…         a district's, if it has one
<guild extent>/law/…                a guild's internal code
<business extent>/law/…             house rules
<gang's held ground>/law/…          a gang's code — identical machinery
```

⭐ **This is a real improvement, not a rename.** The old shape was a
*parallel hierarchy* that had to be kept in sync with the ownership
hierarchy by hand. Nesting law under its institution's extent makes them
**the same hierarchy**, so the parcel trie answers *"who may write this
law?"* with no extra wiring — longest-prefix already lands on the
institution that owns the ground.

⚠ **Open:** the old tree distinguished a `realm` tier from a `city` tier
under one place name. That tiering needs re-deriving against the
locality/address model rather than being mechanically translated; the
examples above collapse to the locality.

**This one choice buys most of the brief.** Navigability is free
(paths). The CMS already browses trees. Citation *is* a path. And the
abstraction lands with no special-casing: **any institution gets a
code at its own root.** A gang keeping a written code is mechanically
identical to a guild keeping one — and thematically right, since
organized crime has rules.

## The instrument taxonomy — the type *is* its consumer

"Everything is a CR" is not true. Instruments sort by **what reads
them**:

| Instrument | Effect | Read by | Execution |
|---|---|---|---|
| **directive** (the CR) | "make this true" | the executive, as work | **requires implementation** |
| **parameter** | "the harbor tax is 3%" | the runtime, directly | self-executing |
| **prohibition** | "no arms on University grounds" | the enforcement layer, **with a mode** (wall/camera/witness/norm) | self-executing |
| **structural** | "there shall be an Archivist" | civics — offices, departments, seats | self-executing |
| **appropriation** | "500 to the watch" | the treasury | self-executing |
| **charter** | "the Ironwrights are chartered" | the guild/corpo layer — creates a legal person | self-executing |
| **declaratory** | "we recognize…" | **nothing** — pure record, and that is legitimate | n/a |
| **adjudicative** | a ruling | precedent; issues from courts, not the legislature | n/a |

**Borrow the real vocabulary: self-executing vs. requiring
implementation.** Only the *directive* class is a CR. Which means the
legislature's output is **not always work for the executive** — a
relief for the executive and a truth about lawmaking.

## Shipping with laws on the books: model **received law**

Real legal institution, not a workaround: **reception statutes** are
how every American state adopted English common law wholesale ("the
common law of England as it stood on [date] is hereby adopted").
Every new polity inherits law it never debated.

So **`enactment.process` is a first-class honest field, and
`founding` is a legitimate value.** The record says *"in force since
the founding; not enacted by vote"* — no fabricated deliberation, no
lie, and **the same force as any ordinary law**. The fiction's
process is *modelled*, never *faked*.

It also hands a young legislature a genuinely meaningful first act:
**repealing received law.**

## A law is prose plus typed clauses

```yaml
kind: law
path: /domain/terminus/law/arms/university-ordinance
title: "The University Arms Ordinance"
text: "No person shall bear arms within University grounds…"
enactment:
  process: committee-decision      # | compact-vote | founding | charter-grant
  body: /domain/terminus/law         # whose charter authorized this
  when: <game-time>
  deliberation: [ <forum thread>, <argument map>, <tally> ]
status: in-force                   # | repealed | superseded | suspended
supersedes: [ … ]
clauses:
  - kind: prohibition
    act: carry-arms
    scope: /terminus/university
    mode: wall
    penalty: { fine: 50 }
```

- **The prose is the statement; the clauses are the operative part
  the runtime reads.**
- **The clause vocabulary must draw from real model fields** — the
  same rule the [ranged slate](../tails/ranged-slate.md) landed on for
  firearms: *statutes are written against fields the world can
  actually check.* One vocabulary, two consumers.
- ⚠ **Open and genuine: which governs when prose and clause
  diverge?** In real law the text is authoritative and no machine
  enforces; here the machine does. Instinct: the **clause is
  operative**, and tooling must make divergence hard — generate
  prose from clauses, or lint the two against each other at
  authoring time. A real decision, not a detail.

## History: append-only, so the code has a past

**Repeal marks; it never deletes.** Amendment creates a version
chain. Therefore **the code can be read as it stood on any date** —
which is load-bearing in three places, not decorative:

- **ex post facto** questions (*was this legal then?*);
- the **policing hook**'s requirement (*was this within policy as it
  stood?*);
- and **historical law queries** (*what was the harbor tax in year
  two?*) — a press story, a court argument, and a research activity
  from one append-only discipline.

That is how a code "tells a story": not flavor text about history,
but history that is literally readable.

## Deliberation pointers — legislative history, first-class

Every law carries `deliberation: [refs]` into the forum thread, the
argument map, and the tally. That closes the manifesto's own arc —
**Ch4 (the argument) → Ch5 (the law) → Ch6 (the record)** — as a link
you can follow.

**And it is quietly one of the best civic features in the design**,
because legislative history is something real lawyers use constantly
and real citizens can essentially never reach. Here *"why is the tax
three percent?"* has an answer, with names on it.

## Each charter declares its own enactment process

The recursive bit, and the abstraction the brief asked for: **a
charter is itself a law, and it specifies how further laws are
made.**

- Compact law → the three-chamber process, 2-of-3.
- The city → whatever its committee's charter says.
- A guild → its charter.
- A business → "the owner decides."
- A gang → whatever the boss says (unchartered, but written).

**That is literally what a constitution is** — the law about how law
is made — so the whole system bootstraps from one document per
institution, with no special cases. Committee law needs less rigor
than Compact law *because its charter says so*, not because the
machinery differs.

## Hierarchy is declared, never assumed

Does Compact law supersede locality law? **That is the incorporation
question** from the amendment walk, and it is genuinely open — so the
model carries a **declared precedence relation** rather than
hardcoding supremacy. Localities that answer it differently then
*actually* differ, which is the point.


## Codification and chronology — **both**, and the code is derived

**(User, 2026-07-31: "I think we need both." Resolves open questions
#3 and #4.)** The relationship is the house's own pattern — **the
roll is the ledger; the code is the derived view** — which six
shipped systems already do: `disposition_events` → TraitPosition ·
`transcripts` → Competence · `renown_events` → standings ·
`bank_ledger` → accounts · `parcel_events` → chain of title ·
`accountability_events` → blame. **Append-only evidence, derive the
current state on read.** Law is the same shape.

### The Roll — chronological, append-only, authoritative

```
/domain/terminus/law/roll/0047
  instrument:  prohibition
  text:        "No person shall bear arms within University grounds…"
  clauses:     [ … ]
  enactment:   { process, body, when, deliberation: [refs] }
  operation:   amends /roll/0012 §2  |  repeals …  |  enacts new
```

Events never change. **Received law starts the roll populated** —
founding entries at time zero with `process: founding`, as honest as
any other entry.

### The Code — topical, derived, cached

Organized by subject, assembled from every in-force provision
touching it, **every clause carrying its citation trail**:

> `/domain/terminus/law/code/arms` — *current text* · enacted by Roll
> 12 (founding), amended by Roll 47 (year 3), §4 repealed by Roll 88
> (year 5)

Which is how real codes work (US Code sections cite their Public Law
origins). **The code is never authored — it is computed.** Store the
roll, derive the code, cache it the way `renown` caches
`renown_events`, invalidate on enactment.

### "As it stood" comes free

Because the code derives from an append-only roll, **you derive the
code as of any date by filtering the roll.** Temporal legal queries
fall out of the architecture rather than needing a versioning
system — the same move as reading a transcript as of a date. One
property serves **ex post facto** questions, the policing hook's
*"within policy as it stood,"* and the press's *"what was the harbor
tax in year two."*

### Subject placement, and organization that has a history

**The enactment declares its subject path**, so the common case is
zero-friction and the code assembles automatically.

But **reorganization is itself an enactment** — a *codification
act* that moves or restructures provisions. So **even the
organization of the law has a history**, and if a polity ever wants
a real **codifier** (a genuinely interesting job: deciding where
things fit, reconciling overlaps, noting supersession), the role
exists without inventing machinery for it.

### Three layers, one job each

| Layer | For | Shape |
|---|---|---|
| **the Roll** | the truth | append-only StoredDocuments, never edited |
| **the Code** | humans | derived + cached topical assembly with citation trails |
| **the clause index** | the runtime | a **`LawCatalogue`** warmed from the roll (the `GovernmentCatalogue`/`SpellCatalogue` shape: manifest-warmed, sync reads, rebuilt on enactment) |

**The machine never parses statutes.** Enforcement asks the
catalogue *"what prohibitions are in force for this scope?"* and
gets clauses.

### Conflict detection has a natural home

**Contradictions surface at codification** — the moment you assemble
everything on one subject and scope. Two in-force clauses that
disagree become a **lint at assembly time**, visible to the
codifier, the legislature, and anyone reading the code. Not silently
last-wins, not deferred to a court by default — though a court
remains the tiebreaker when the polity wants one.

### And this is the "story"

A subject's citation trail **is** its narrative — *arms law in
Terminus was received at founding, tightened after the incident in
year three, partially repealed in year five* — with **each act
linking to the deliberation that produced it.** Reading the history
of a policy as a chain of real events, with names and arguments
attached, is precisely what real citizens can never do.

**Naming:** **the Roll** and **the Code** — both real terms of art,
both self-explanatory, neither needing a glossary.

## The docket — the third sibling (2026-07-31)

> **The Roll records what *became law*. The docket records what
> *happened*.**

A bill that lapses on the floor never touches the Roll but absolutely
belongs on the record, so **the docket is the superset**: tablings,
crossings, vetoes, lapses, platform changes, office handoffs,
appropriations.

### Placement — decided by the slate's own sort rule

§ Storage fixed the test: *collections cut across jurisdictions and
are queried by system; the tree is place / owner / division of labor —
would you query it across all jurisdictions?* A press trawling
*"everything that happened in governance today, everywhere"* is
**exactly** that query. So:

| | The Roll | The docket |
|---|---|---|
| **answers** | *what is the law of Terminus?* | *what is happening, anywhere?* |
| **shape** | jurisdictional | cross-jurisdictional |
| **lives in** | **the tree** (`<institution extent>/law/`) | **a collection** |
| **authority** | authoritative | an **index** |

One enactment produces both: it appends to Terminus's Roll **and**
emits a docket entry that **points at it**. The entry is a **pointer,
never a copy** — the Roll stays authoritative, the docket stays thin
(and therefore affordably **permanent**).

### The one new piece of machinery

> **The docket is where continuous state becomes a discrete record.**
> Conviction voting is continuous; history is discrete; the docket is
> the transducer.

Which forces a real problem: **a crossing is detected on read**, so if
nobody reads at the moment it crosses, nothing recorded it — and past
tallies are not cheaply reconstructible, since standing itself moves
with play. So there must be a **sweep** (`ScheduleApi.recurring`) that
reads tallies and appends entries on **state transitions**.

⚠ **Threshold chatter** — a bill oscillating around its threshold
emits endless `crossed`/`uncrossed` pairs. Hold-through prevents
spurious *enactment*, not spurious *records*. Fix: **hysteresis** —
cross at the threshold, un-cross at threshold − ε.

### A closed kind vocabulary

Like the enforcement modes and the Note kinds:

`tabled` · `lapsed` · `withdrawn` · `crossed` · `uncrossed` ·
`carried` · `vetoed` · `overridden` · `enacted` · `sunset` ·
`repealed` · `codified` · `platform` · `office` · `charter`

`crossed`/`uncrossed` is what finally gives the **near-miss** its
record — promised in § *Passage is a crossing*, delivered here.

> **The governing rule: the docket records *state changes of things*,
> not *acts of people*.**

**Individual holds and flips never appear.** They already live in
`positions`, they would be millions of rows, and they are the volume
that would sink it. A crossing changes what the law is *about to be*;
one person's hold does not.

Entries are **producer-emitted** (the accountability doctrine —
producers, not a chokepoint), each from an already-gated module.

### The press payoff — it hands you the timeline, never the story

Filter the docket **by target** and the complete life of a bill falls
out: *tabled → crossed → uncrossed → crossed → vetoed → overridden →
enacted.* A story arc assembled by the machine, ready for a person to
write about — exactly what a real docket does for a court reporter.

**And it makes the ticker rule structural rather than aspirational.**
[cooperative-slate § Surfacing](./cooperative-slate.md) requires that
the default feed report *events, never significance*. Nobody has to
enforce it, because:

> **The default publisher's ticker is a saved docket query** — a
> `WHERE` clause on kind and jurisdiction. **A filter is incapable of
> editorializing.**

Player outlets differ by **selecting, contextualizing, and arguing**,
which is the job.

### It is also what makes sealing honest

The [press slate](./press-slate.md)'s **seal-don't-hide** says
existence is public while content is withheld — and **the docket is
where the existence lives.** A sealed proceeding appears as an entry
with its content withheld, so you *know it happened*. That is the
anchor the FOIA loop needs: **without a docket, "seal, don't hide" has
nowhere to show the seal.**

### The sweep — a backstop, not a heartbeat

The gauge is **already derive-on-read**: anyone watching a bill gets an
exact live tally through the MQL subscription. So the sweep exists only
to catch transitions **nobody was looking at** — which means it can be
slow, cheap, and late without hurting anything.

> **A sweep exists only where a state change must be *stamped*, not
> merely *observed*.**

Worth holding as a general rule, because sweep proliferation is a real
architectural risk — every subsystem eventually wants a timer. The
roll, competence, and wounds need none (all derive-on-read). Crossings
need one **precisely because they are events in time that must enter
the record.**

#### Cadence ties to the build period, not the clock

If conviction ramps over seven days, an **hourly** sweep samples the
ramp 168 times — far more precision than governance needs; six-hourly
is defensible. Minutes would be pure waste.

#### The skip test is a proof, not a heuristic — and it is one subtraction

Over an interval Δt each position's conviction rises by at most
`Δt / buildPeriod`, so:

```
Δsupport ≤ (Δt / buildPeriod) · turnout ≤ Δt / buildPeriod
```

**If `threshold − support > Δt/buildPeriod`, that bill provably cannot
cross this interval** and is skipped without touching a single position
row. Only near-threshold bills get a full tally, so **the sweep is
O(bills), not O(positions)** for almost everything on the floor.

#### Idempotency falls out of state comparison

Do **not** track what has already been emitted. Read the **last docket
entry for `(target, chamber)`** and append only if the current state
differs — restart-safe, double-run-safe, and the same **find-or-skip**
shape the influence faucets already use.

#### Reads never write

Letting a player's observation stamp a crossing would be more precise
for popular bills, but then **the record's timing depends on who
happened to be looking.** The sweep is the **sole stamper**, so the
docket stays deterministic and reproducible.

#### Outages — and the direction of failure

The docket records when a transition was **observed**, and should say
so. (Retroactive bisection over replayed standing history is possible
and not worth building at day-scale.) What matters is naming the
direction:

> **A missed sweep delays a law; it never accelerates one.**

Hold-through measured from a late observation is strictly more
conservative, so **failing slow is the safe side.**

#### Hysteresis ε is mechanism, not policy

The renown doc already set the precedent — *"cadence is mechanism, not
a legislated value."* So ε is an **AppSettings** constant, **not** a
Schedule of Parameters entry: the legislature does not tune the
anti-chatter margin.

#### ⭐ The consequence: enactment has no human actor

Look at what the sweep owns — crossing detection, hold-through expiry,
enactment. So the pipeline is:

> **crossing (machine) → veto window (human *may* act) → enactment
> (machine).**

Nobody signs the bill; **the crossing does.** The executive's power is
to **stop**, never to **complete** — and therefore:

> **The pocket veto is impossible unless a charter explicitly grants
> one.**

A real institutional pathology excluded **by construction rather than
by rule**: an office cannot quietly kill a law by declining to act on
it, because no act was ever required. It also reads well diegetically —
**the legislature's assent *is* the act; enactment is a consequence,
not a ceremony.**

#### Mechanics

`ScheduleApi.recurring` (never a bare timer — it wraps in `runRoot` so
the writes get a well-defined root frame and `causingCommandId`
attribution), living on the **law logic singleton**, not a new facade.
The sweep's writes are **system-attributed**, which is correct: *the
law enacted itself.*

### Two small calls

- **Read surface is a subcommand**, not a verb —
  **`government docket [<institution>]`** (the *prefer subcommands*
  rule; `government` is already the posted-law reading surface).
- **Naming.** The constitutionally correct term is **Journal** (US
  Art. I §5, *"Each House shall keep a Journal of its Proceedings"*) —
  nice pedigree for the [amendment
  walk](./amendment-library-slate.md), but it collides badly with
  *journalism* at exactly the point the two concepts meet. **Keep
  "docket"**; record "Journal" as lineage.

## Prose ⊗ clause authority — **RESOLVED**: they cover different ground

**(User, 2026-07-31.)** The question dissolves once you see that
prose and clauses are **not two views of one thing**.

Real statutes contain operative provisions, definitions,
**standards** ("reasonable," "due care," "good faith"), purpose, and
exceptions — and those differ in enforceability *by nature*. So:

> **Clauses are what the machine can enforce. Prose is what only a
> person can judge.** Neither is authoritative "over" the other,
> because they are not saying the same thing.

### This is the manifesto's fork, one level down

Chapter 1's split — *"what can be enforced by code, shall be; the
rest needs a person to judge"* — **is** the clause/prose split inside
a statute. Clauses are the code arm; prose-only provisions are the
judgment arm. Same fork, applied to legislative drafting.

Which makes the legislature's drafting choice a real one with a real
name in jurisprudence — **rules versus standards**:

| Drafted as | Becomes | Properties |
|---|---|---|
| **a clause** | a **rule** | self-executing, uniform, incorruptible, **rigid — no discretion** |
| **prose only** | a **standard** | contextual, flexible, **requires a court** — so it admits discretion, and therefore bias |

A tradeoff lawyers spend semesters on, here made **mechanical**:
choose a clause and the world enforces it identically for everyone
forever; choose a standard and you have created work for the courts
and room for judgment. The legislature *feels* the choice, provision
by provision.

### Values are interpolated, never restated

The commonest divergence is a number appearing twice. Kill it at the
root — **the prose renders clause values** via the shipped
`ProseApi` Liquid templating:

> *"…shall be liable to a fine of `{{ clauses.penalty.fine }}`."*

The prose **cannot** contradict the clause on a value because it does
not contain one. One source of truth, existing machinery.

### Genuine overlap-divergence is a *defect*, not an ambiguity

When prose and clause really do purport to say the same thing and
disagree, the honest answer is not a precedence rule — **something is
broken**, and the system should say so:

- **The machine does what the clause says** — a *fact about the
  world*, not a legal truth.
- **A court can rule the enforcement erroneous**, because the law is
  what the polity enacted, not what the runtime executed.
- **Remedy follows**, and the legislature must correct the clause.

Exactly how real systems handle administrative error: an agency
misapplies a statute, a court says it was wrong, the person is made
whole, the rule is fixed. Nobody pretends the agency's behavior *was*
the law.

> **The clause governs the machine. The polity governs the law. A
> divergence is an error with a remedy — not an ambiguity resolved by
> hierarchy.**

### Two supports

- **Non-operative notes are legitimate and must be marked.** A
  plain-language summary of a clause is genuinely useful (real codes
  carry editorial notes) — flagged non-operative so commentary is
  never mistaken for law.
- **The codification lint gains a second job.** Beyond contradictions
  *between* provisions, it flags a provision *internally*:
  - **a clause with no prose statement** — ⚠ **invisible law**:
    enforced but unstated, precisely what posted-law exists to
    prevent. Guard this hardest.
  - **a prose obligation with no clause and no standard** —
    unenforceable law that reads as enforceable.

  Both are drafting defects, caught **before** enactment rather than
  after someone is fined.


## Sunsets — expiry, and what it does to power

**The problem:** codes accrete. Everyone adds, nobody repeals, and
the statute book fills with provisions no one has defended in
decades.

**Default stays "persist" — but instrument type decides**, and the
taxonomy tells us which:

| Instrument | Default |
|---|---|
| **appropriation** | **sunsets** — budgets are inherently periodic |
| **emergency powers** | **sunsets** — already the roster's design |
| **charter** | **sunsets** (renewable) — historically limited-term; a real lever on guilds and corpos |
| **prohibition**, **parameter** | **persists** — a murder statute lapsing by inattention is absurd; a vanishing tax rate is chaos |

Plus: **any law may carry an explicit sunset**, chosen at drafting.

**Expiry must be loudly visible — and this is where the press earns
its keep.** The Code shows *"expires in X"*; pending lapses surface
as a feed item; and **"twelve provisions lapse next month" is a
story** that drives legislative attention. Without something making
expiry visible, **sunsets fail silently** — enforcement simply stops
one day and nobody knows why.

**Renewal is an enactment**, so it lands on the Roll with its own
deliberation. The history then shows a law renewed five times, each
with its argument attached: *this provision has been defended,
repeatedly, by these people.*

### The magic

> **Repeal requires effort. Lapse requires only indifference.**

A law nobody cares enough to renew simply dies — nobody has to spend
capital fighting it. A democratic filter that costs nothing, and the
opposite of repeal, which always needs a champion.

### The honest counterweight

**A sunset inverts status-quo bias.** Normally inertia protects a
law; with a sunset, inertia kills it. That is a **transfer of power
to whoever can block renewal** — a minority that could not repeal
something can simply refuse to renew it. Exactly the dynamic behind
real budget shutdowns.

> **A polity adopting sunsets thinks it is doing hygiene. It is
> redistributing power.** The world should let them discover that
> honestly.

**Mechanically free:** expiry is a derived status from the Roll plus
the clock, so *"as it stood"* already handles it — on date X, was
this in force? — enactment-and-expiry arithmetic.

**Cross-module note:** with sunsets in play, an executive **veto of a
renewal** is far more powerful than a veto of an enactment, because
the status quo is already death — see
[amendment-library-slate](./amendment-library-slate.md) § the
executive veto.


## The founding corpus — what ships on the books

**The test, because shipping a law is shipping policy:**

> **Ship what the world cannot function without. Never ship what the
> polity would enjoy arguing about.** Shipping a law on a contested
> question does not merely bias the debate — it **steals** it.

### What must ship

**A. The bootstrap** — the reception act itself, and the charters
(the Compact's, Terminus's). Without these nothing has authority;
the charter declares how further law is made, so it is the
recursion's base case.

**B. A minimal criminal code — and the argument is tier
discipline.** If in-fiction theft has no in-fiction law, in-fiction
theft gets handled by **meta moderation** — precisely the layer
confusion [prison-slate](./prison-slate.md) forbids. The minimum
exists so **in-fiction harms have in-fiction remedies on day one**,
keeping meta moderation for real conduct only.

The filter keeps it small: **does the kernel already prevent it?** If
yes, no law. Consent already gates violence; title already gates
transfer. What remains is what the kernel *permits* but a society
should not — taking from an unlocked room, obtaining by deception,
wage theft, destruction of another's property. Short, and it stays
short.

**C. Institutional authorization** — Terminus ships a watch, armed
guards, a reserved prison site; without enabling acts the world is
incoherent (guards acting without authority). Coherence, not policy.
*(Considered and passed on: shipping them **unauthorized** as a
deliberate grievance for the first legislature — genuinely
interesting, but it reads as an oversight.)*

**D. Procedural minimums** — no case can be brought without
procedure. ⚠ But **the contested knobs are not minimums**: burden of
proof and standing are genuine value choices and belong in the
amendment roster, never shipped as defaults dressed as plumbing.

### What must not ship

Gun law · facility access · taxation · substance prohibition · speech
restrictions · punishment severity · membership rules · zoning
assignments. **Several are explicitly designed *as* the legislature's
material** (the bathroom debate as an obstacle course; the gun
statute-vocabulary so *they* draw the lines). Shipping any would
waste the best content we have.

### Vestigial law as the tutorial

Ship a handful of **obviously dead** statutes — where you may tie a
horse, a fee in an obsolete denomination, a rule about something
that no longer exists. Period-authentic, mildly funny, and
critically **unreadable as our position**. What they buy:

- **Harmless practice at repeal** — the first legislature learns the
  whole machinery (draft, deliberate, tally, codify) at zero stakes
  before touching anything real.
- **A true lesson**: codes are full of dead law, and **cleanup is
  part of governance**.
- The code *feels inherited* rather than authored — the right
  register for received law.

### The rule separating provocation from endorsement

> **Ship the inherited convention, never the considered policy.**

A leftover reads as **history**; a well-drafted modern statute reads
as **our recommendation**. Same clause, opposite meaning — the
difference is entirely in how it presents. (The bathroom slate's
guardrail, generalized.)

### The diegetic frame does the explaining

Received law should come from **the world's own past** — the
Ordinance-era statutes, the old city's ordinances — never from "the
platform." Mechanically `process: founding`; diegetically **"in
force since before the Compact."** Both true, and the fiction carries
it so no player has to think about a developer.

### The volume rule

**Keep the book thin.** Every shipped law is one the polity must live
with or spend effort repealing, and a rich received code turns the
first legislature into a maintenance crew instead of a founding
body. The temptation will be to write more because writing law is
fun — resist it.

> **The emptier the book, the more their own work means.**


## Storage — the tree, because law is jurisdictional

**(User, 2026-07-31, correcting a wrong turn: an intermediate pass
moved the Roll into its own Mongo collection to sidestep a missing
security mechanism. That is choosing an architecture for the wrong
reason — and it left the gap sitting there anyway, just less
visibly.)**

**The organizing principle:**

> **Collections exist because they cut *across* jurisdictions and are
> queried by system. The tree is for things organized by place,
> owner, and division of labor.**

The test that decides it: *would you ever query this across all
jurisdictions?* The bank ledger — constantly (conservation is a
global invariant). Chattel — yes, items move. **Law — almost never.**
You read Terminus's law *in Terminus*; cross-jurisdiction law reads
are **comparative** (the press's table), not operational.

> **Law is definitionally jurisdictional, so law lives in the tree.**

### The Compact exception — principled, not ad hoc

**Compact law is not law *of a place*; it is law *of the platform*.**
Three supports:

- The civics doctrine says **no tier of the fiction is the Compact's
  face**, so hanging its law off a jurisdiction would contradict
  that.
- It must be readable **unconditionally, everywhere, without a
  jurisdiction lookup** — it is the floor, not a local rule.
- Which is exactly the `app_settings` / `world_state` shape.

So Compact law gets its own store, and **the asymmetry states
something true** rather than papering over something.

### The named dependency: a `writers` branch policy
**→ designed in its own slate: [branch-policy-slate](./branch-policy-slate.md)**
(document-store infrastructure, not law — law is merely its first
hard-requirement caller).


The tree currently cannot say the one sentence this needs: *"writes
below here must come through process P."* `DocumentApi.save`'s gate
answers **who owns a path** (self-home → zone → slice-walk), never
**how it was written**.

The minimal way to say it uses vocabulary already shipped — **a
branch write-policy naming an allowed writer module**, which is
`FromModule` (the call-security policy) applied to a **path axis**
instead of a method axis:

> the existing ownership rungs **AND**, if any ancestor declares
> `writers`, the calling module must be one of them.

So each institution's `<extent>/law/**` declares `writers: [LawLogic]`
(⚠ per-institution now, not one root — see branch-policy-slate). A direct
`DocumentApi.save` into a law branch fails **regardless of who owns
the parcel** — the only door is `LawApi.enact`, which performs the
charter check. **The chokepoint becomes a property of the tree**,
not a property of picking a different database.

Two properties worth keeping: it is **additive** (ownership still
governs everything with no policy), and it is **declarative data**,
so a committee can be allowed to set it on their own branch without
being granted code trust.

**And it is wanted beyond law** — a guild's charter branch
(`writers: [GuildLogic]`), CMS go-live records, contract records:
anywhere "only this system writes here" is the real rule. **We were
always going to need this.**

### The residual gap (real, and named)

The chokepoint's **shape** is now expressible; its **check** is still
new work. `LawApi.enact` must answer *"does this satisfy the
institution's declared process?"* — read the charter, learn what
decision occurred, verify it. For Compact law that **depends on the
voting apparatus, which is deferred** (the argument map ships;
decide-by-weight does not).

| Institution | The check | Buildable |
|---|---|---|
| **owner / business** | "is the caller the owner?" | **now** — the access stack answers it |
| **committee** | "is the caller acting on a committee decision?" | **now-ish** — the committee concept ships; the decision record is small |
| **Compact** | "did this pass two of three chambers?" | **waits on the voting machinery** |

### Sibling candidates for the tree

The same principle flags current collections that are
division-of-labor-shaped rather than cross-cutting:

- **`bulletins`** — with [press-slate](./press-slate.md), a feed is
  **per-publisher**; `/feed/<publisher>/` is tree-shaped, and the
  single collection exists mainly because there was exactly one
  publisher (staff). Plural publishers make the tree the better
  home.
- **Per-institution recipe books** — the global `recipes` catalog is
  genuinely cross-cutting reference data, but a **guild's
  proprietary recipes** belong under its branch with a `writers`
  policy. Which gives guilds something real to guard — and industrial
  espionage a target.

## The catalog and adoption — laws are shared, histories are local

**(User: "a catalog of laws that individual parcels just point to and
decorate with their own history… entire collections of laws… most
parcels will run some combination of the same set.")** The
[amendment library](./amendment-library-slate.md) **already works
this way** for constitutional modules ("authored once, vetted, and
parked in the catalog for any community to adopt verbatim; the only
thing saved is the drafting and the footgun-hunting"). This
generalizes it to ordinary law.

```
/compact/law/catalog/theft@v3                    canonical: prose, clauses, DECLARED PARAMETERS
/compact/law/catalog/preset/municipal-standard   a distro: a named set of statutes

<law_events>  0012: adopt catalog/theft@v3 at /domain/terminus/law, fine = 50
/domain/terminus/law/code/theft            DERIVED in-force view
```

- **A parcel's law is mostly references, parameters, and history** —
  never duplicated prose.
- **"Presets are distros" is already the roster's vocabulary**, so a
  *code preset* ("the standard municipal code," "the frontier
  minimum") is the same idea one tier down.
- **Parameters are the payoff.** A statute declares its holes; the
  adoption fills them. So **comparison becomes mechanical** — the
  press can publish *the theft fine across twelve localities* as a
  table, and **Tiebout stops being a theory and becomes a column of
  numbers.**
- **Adoption pins a version.** Auto-update would change a locality's
  law without consent; never updating preserves drafting bugs. So
  **upgrading is a new enactment** — on the Roll, with its own
  deliberation (the pack-seams versioning discipline).
- **Shared text, local history.** An adoption carries the catalog
  ref + version, local parameters, **local enactment history**
  (adopted / amended / renewed / repealed *here*), and local
  deliberation pointers. A dozen localities share one statute and
  each has its own story about it.
- **Divergence forks; it never overlays.** Beyond parameters, a
  locality forks the statute into its own code — visibly, so
  "Terminus runs a *modified* theft statute" is legible.
  Overlay/patch semantics is where content ecosystems go to die
  (the pack-seams lesson, again).

### Jurisdictional vs. proprietary law — both apply

A **government's** code binds by *jurisdiction* (the locality's
address chain); an **owner's** code binds by *property* (house rules,
a guild's internal code). You are subject to city law **and** the
tavern's rules at once — true of life, and it means precedence is
not only Compact-vs-locality but **public-vs-proprietary**. (A shop
cannot legalize what the city forbids; **may the city forbid what the
shop permits?** A real fight, and one for the declared-precedence
relation.)


## The enactment check — one system, three weight resolvers

**(Designed 2026-07-31 — the residual gap named in § Storage.)**

### Three parts

**1. The process declaration** (in the charter) — a closed
vocabulary:

```yaml
process: { kind: sole, holder: <owner ref> }

process:
  kind: body
  proposers: <group>     # eligibility to PROPOSE…
  voters: <group>        # …is separate from eligibility to VOTE
  threshold: majority    # | supermajority | unanimous | quorum+majority
  window: <duration>

process:
  kind: chambers
  chambers: [producer, capital, consumer]
  passRule: 2-of-3
```

**2. The vote records — and the important call: a decision is not a
thing you store, it is a derived state of a set of votes.** You never
write *"the committee decided X."* You write each vote, and passage
**derives**. A stored decision is an *attestation*, and attestations
are claims a chair could fabricate; votes are **acts**. **Nothing to
forge** — and it is the derive-on-read discipline for the seventh
time in this stack.

**3. The check** — where it collapses.

### The unification

Gather the eligible votes, apply the threshold, see if it passes.
**Identical for all three kinds.** Only *who is eligible* and *what a
vote weighs* differ:

| Kind | Eligible | Weight |
|---|---|---|
| **sole** | one holder | 1 |
| **body** | committee members | 1 |
| **chambers** | the three counts | **conviction-weighted standing** |

> **Not three systems — one system with a pluggable
> eligibility-and-weight resolver, two of which are trivial.**

Which reframes the dependency: **Compact law does not wait on a
different mechanism** — and it does not wait on the weighting
either. ⚠ **Corrected below** (§ *Conviction weighting*): the
weighting is **shipped and tested**; what is missing is the
**passage rule**. Committee law and Compact law **share a code path
from day one** rather than being reconciled later.

### Where it lives

Proposals are jurisdictional, so they are tree-shaped and the
[branch policy](./branch-policy-slate.md) already protects them:

```
/domain/terminus/law/proposals/0031             the pending instrument + SNAPSHOTTED process
/domain/terminus/law/proposals/0031/votes/<voter>
```

Votes are written by `LawApi.vote` (which checks eligibility); the
branch's `writers: [LawLogic]` makes that the only door. **The whole
thing composes with the storage and policy design without
amendment.**

### Snapshot the process at proposal time

If the charter changes mid-vote, **the process in force when the
proposal opened governs.** The anti-manipulation choice — otherwise a
body facing defeat could amend its own threshold and **move the
goalposts under a live vote.** Real systems argue about this; a
suspicious polity wants the snapshot, and so do we.

### The pipeline

> **propose → deliberate → vote → threshold met → [veto window] →
> enact → the Roll**

- **Deliberation pointers populate themselves** — the proposal is
  where the forum thread and argument map attach, and they carry
  forward into the enactment record. No extra step.
- **The executive veto slots between passage and enactment**
  ([amendment-library](./amendment-library-slate.md)) — and a
  *return for cause* sends it back to the proposal stage rather than
  killing it, which is exactly the difference between return and
  veto.
- **Refusal must be legible** — calling `enact` on a proposal that
  has not passed says *"4 of 7 required assents,"* never a bare
  denial.

### The veto window — RESOLVED (2026-07-31)

**It is the same window as hold-through.** § *Passage is a crossing*
already requires the tally to still hold when enactment fires, and the
executive already needs time to consider. Same duration scale, same
clock:

> **One window, two gates:** support must **hold**, *and* the
> executive **may act**. **Silence is assent** — which is just the
> pocket-veto exclusion (§ The sweep) restated.

Collapsing them means **the veto adds no latency of its own**, and a
bill that falls back during the window simply does not enact — no veto
needed, and the near-miss is on the docket either way.

#### ⭐ A veto does not kill a bill — it raises its threshold

The bill **stays on the floor and keeps accumulating**; if support
crosses the **override bar**, it enacts over the veto. Which gives:

- **no override ceremony to design** — the override *is* the same
  continuous accumulation against a higher line;
- an override bar in **units we already have** — breadth 3, depth +X,
  or both (§ *Supermajority has two axes*);
- and an honest reading: **a veto makes a law harder, never
  impossible.**

It also gives the amendment library's **two veto flavors** somewhere
real to land: a *technical* objection and a *political* one raise the
bar by **different amounts**, declared on the record — and a PM whose
technical objections keep proving false becomes **visible in the
docket**.

#### Two rails

- **One veto per bill.** The raise persists; a second veto on
  re-crossing is infinite regress.
- **The charter declares which instrument types are vetoable** —
  parameters and appropriations certainly; amendments almost
  certainly not (the open question the amendment library already
  flagged). *Return for cause* is unaffected: it sends a bill back to
  the proposal stage rather than raising its bar, which is exactly the
  difference between **return** and **veto**.

### Deadlock — a real governance problem

A committee whose members all drift away can never meet threshold, so
**the code freezes — and the charter that would fix it requires the
committee.** A genuine constitutional crisis, and real polities have
exactly this (succession failures).

> **Deadlock resolves upward to the chartering authority.**

The Compact chartered the city committee, so a dead committee is
reconstituted by the Compact; the Compact's own deadlock resolves to
the amendment path, with the founder-default as the interim floor —
which is what that pattern is *for*. Better than a timeout or an
auto-dissolve, because **every escape stays inside the governance
structure** instead of inventing an admin override.

### What this makes buildable

| Institution | Resolver | Status |
|---|---|---|
| owner / business | the context actor is the holder | **now** |
| committee | group membership, weight 1 | **now** — the committee concept ships |
| Compact | three counts, conviction-weighted | **needs the weighting only** |


## Conviction weighting — shipped, and what actually remains

> ⚠ **Correction (2026-07-31):** an earlier pass in this slate said
> Compact law "waits on the weighting." **It does not.** The
> conviction substrate is **shipped and tested**
> ([influence.md](../../subsystems/influence.md) § Conviction).

**What exists:** `ConvictionApi` → `ConvictionLogic` with `hold` /
`flip` / `drop` / `abstain` / `positionOf` / `tally` /
`quorumWeight`, over `Position` rows in `positions`, with a
deterministic clock seam and `conviction.buildPeriodSeconds` as the
dial.

```
conviction = clamp01((now − realSince) / buildPeriod)          # linear ramp
tally(stock, target) = Σ standingOf(holder, stock).scalar × conviction × (yea − nay)
```

### Four commitments the shipped math already makes

Load-bearing, and not to be re-litigated by accident:

- **Full weight, no pool** — each position spends the holder's
  *whole* standing scalar; `hold` never consults other targets. You
  are **never rationed** (exactly Ch 3's promise). No strategic
  budgeting across bills.
- **Non-fungible by stock** — the three houses tally
  **independently**; a consumer stake and a producer stake on one
  bill are distinct rows. **Co-equal chambers made structural**
  rather than asserted.
- **Presence and direction are separate** — `abstain` is a
  *present, net-zero* stake counting for quorum at **full standing**
  while contributing 0 to the decision. Elegant solve for a real
  problem: **a founder with a supermajority can decline to take a
  side without starving quorum.**
- **Quorum is conviction-independent** — you do not build conviction
  to show up. Showing up and mattering are different things.

### What was missing: the passage rule — **RESOLVED**, see below

`tally` yields a per-house number; `quorumWeight` yields the
participation numerator. **Nothing yet says "this bill passed."**
Worked through in § The passage rule — which found that the draft
constitution already decides most of it, and that its **reservoir**
premise conflicts with the shipped **full-weight/no-pool** build.

### Passage is a *crossing*, not an election day

**Conviction voting is continuous.** Support accumulates, patience
is the currency, and there is no moment to ambush — that is the
entire anti-buzzer point. So the pipeline above needs one
correction: **"vote" is not a window**, it is an accumulation, and
*"threshold met"* is a **crossing detected on read**. Enactment
remains the discrete event.

**One genuine question — since RESOLVED:** must the tally **still
hold** when enactment fires (after any veto window), or does the
crossing snapshot? Hold-through is truer to conviction's spirit — a
law should not follow from support that existed for an instant — but
it lets a bill slip back. **Settled: hold-through**, with the
crossing recorded either way so near-misses stay visible. See
§ The vote as spectacle → *This confirms hold-through* for the
argument that closed it.

### The bigger remaining gap: **delegation**

The manifesto promises **liquid delegation** — *"hand your standing
to someone you trust, per topic, revocable the instant that trust
runs out."* It does not appear in the shipped conviction surface,
and **a working legislature needs it**: without it every member must
personally hold a position on every question, which is exactly the
attention problem delegation exists to solve.

Real work, with real questions: per-topic scoping, revocation
semantics, cycle prevention, and **how a delegated stake meets the
conviction clock** — does the delegate's hold inherit *your*
`realSince`, or start fresh? (A genuine design question with balance
consequences: inheriting makes delegation instantly powerful;
starting fresh makes it slow to matter.)

> **DESIGNED 2026-07-31 → [cooperative-slate § Delegation, re-derived
> for no-pool](./cooperative-slate.md)** and its sibling § *Synthetic
> constituents*. Headlines: **delegation steers, never transfers** (the
> delegate needs no standing, so the tally is unchanged and an
> institution can be a delegate with **no special case**); the clock
> question resolves to **neither** — `effectiveRealSince =
> max(delegationSince, delegateRealSince)`, derive-on-read, which
> closes the *rent-out-matured-conviction* exploit and extends the
> anti-buzzer property to delegation for free; **explicit position
> overrides**, which is Art. IV §6's *"no caucus binds a member's
> vote"* obtained structurally. And the tie-back to § The roll:
> **delegated positions count for quorum**, so delegation is how a mass
> chamber reaches quorum at all.

> **Sequencing: the passage rule is small and unblocks Compact law
> almost immediately** — now designed in § The passage rule, and
> buildable against the two shipped stocks. **Delegation is the
> substantive remaining build** — and it decides whether a
> legislature scales past the people who enjoy reading bills.
> (No-pool makes delegation *more* load-bearing, not less: with no
> budget to ration, attention is the only scarcity left, and
> delegation is the only relief for it.)

## The vote as spectacle — and the play chamber

**(User, 2026-07-31: "I know it's going to be a spectacle. people are
going to be checking in to see how close the law is to passing… I
guess this is the thesis behind the system.")** The observation is
right and it is load-bearing: a continuous tally is the first
governance surface in the design that is *watchable*. This section
records what that implies, and then what it implies **for the
`consumer` (play) chamber specifically** — the mass constituency,
whose members earn standing by playing and mostly are not
legislators.

### The spectacle object is a countdown, not a gauge

**Conviction voting has a deterministic forecast.** Every position's
`realSince` is known, so the tally's future *under no behavior
change* is exactly computable — not a poll, not a projection with
error bars, arithmetic.

> The readout is not *"62% and rising."* It is **"passes Thursday
> 14:00 unless something changes."**

A bar is a dashboard; a crossing with a clock on it is television.
And it is the form that makes opposition **actionable with a
deadline**, which is what actually produces the checking-in behavior.

### Flip economics — persuasion targets the committed

A flip **restarts the clock**, so converting an opponent removes
their matured weight *and* re-enters them at zero. **A flip is worth
roughly double a fresh recruit**, and the biggest prizes are the
longest-held positions on the other side.

This inverts real campaigning: you do not chase the undecided, you
go after the entrenched. Which is a far better use of an argument
map than a turnout drive, and it makes the map's *attribution* —
who argued what, who holds what — the actual targeting surface.

### The argument map never closes, and must never touch the tally

Because passage is a crossing, there is **no debate-then-vote phase
split** — deliberation and accumulation run together, permanently.
That is safe **because the flip reset self-damps it**: late rhetoric
moves positions, and moved positions start weak.

> **Rail: argument strength is never an input to the arithmetic.**
> The map persuades *people*; people move positions. Same rail as
> *competence buys information, not outcomes* — rhetoric must not be
> a mechanic, or it will be farmed.

Upside: **a law's page is never closed.** Argument continues after
enactment, so repeal campaigns begin exactly where the debate left
off, and the deliberation pointers keep populating themselves.

### Positions are public — and secrecy is a law you can pass

Conviction voting **is** durable public commitment; the argument map
needs attributable claims anyway; and the record-as-evidence
doctrine points the same way. So **public by default.**

Retaliation is a real cost, and the right home for it is **an
enactment, not a kernel property**: a locality may legislate ballot
secrecy. That makes it a **playable amendment** (an
[amendment-library](./amendment-library-slate.md) entry) rather than
an assumption baked in where nobody can argue with it.

### Every stake is a fading number times a growing one

Checked against the shipped substrate: **all three stocks decay in
real time** (`participation.decayHalfLife`, `producer.decayHalfLife`,
renown's half-lives). Conviction, meanwhile, only builds. So:

> **weight = standing (decaying) × conviction (building).**

Two consequences worth having on the record:

1. **The obvious exploit dies unaided.** Park a position, walk away,
   return at maximum conviction — and find your standing decayed out
   from under it. **Conviction rewards patience, never absence.**
2. **Every chamber is structurally a chamber of the currently
   present.** Veterans who left cannot hold the floor. Nobody had to
   design a term limit.

### What this means for the play chamber

| Property | Why it matters to a mass constituency |
|---|---|
| **You never have to attend** | no session, no quorum call, no deadline — the single reason a mass chamber can function at all |
| **Four verbs, no calendar** | `hold` / `flip` / `drop` / `abstain` *is* the entire political interface (no pooling, no allocation — full weight, no pool) |
| **Patience is free** | weight accrues while you do anything else; **the grind is not playing politics** |
| **Presence is the price** | consumer standing = recent play × renown, so the say belongs to people currently in the world |

### The real risk is apathy, not volatility

Spectacle-driven late surges are **already defused** by the flip
reset — which is the prettiest result here: **the drama is real, the
manipulation is not.** You can watch a bill get close and rally
against it; rallying works *slowly*; so excitement never converts
into capture. The mechanic penalizes exactly the behavior spectacle
encourages.

The unsolved one is the opposite failure. `quorumWeight(stock,
target)` sums over **holders**, so a chamber that mostly ignores
politics is run by its own activist fringe. Tolerable for
`producer` (small, engaged); it is *the* problem for `consumer`.
**Likely answer:** a quorum floor as a fraction of the chamber's
**total** standing, tuned low, with **2-of-3 as the real backstop** —
a bill carried only by the play chamber's political fringe still has
to find a second house.

> ⚠ **The mitigation that must not be used: never reward holding a
> position.** Paying `consumer` standing for voting collapses the
> distinction the chamber exists to carry — **play earns the say** —
> and converts the signal into farmed noise. Politics stays unpaid.

### Build notes (both cheap)

- **The gauge is a live MQL subscription.** The subscription layer
  already registers per-`Interactive`, indexes deps, batches
  re-resolve, and diffs — so a live tally in the inspection pane is
  nearly free, with no polling invented.
- **The ticker is the on-ramp.** A bill nearing its crossing is
  *news* — the bulletin/`NewsTickerPane` seam already exists — and
  the stance must be takeable **from the ticker item itself**. Ticker
  → countdown → check-in → stance is the honest funnel.

### This confirms hold-through

The spectacle lens settles the open question above: **the tally must
still hold when enactment fires.** Snapshot-on-crossing means a bill
that grazes its threshold for one instant at 03:00 enacts —
gameable, and terrible television. Hold-through makes *crossing and
falling back* a visible, meaningful near-miss, which is both truer
to conviction's spirit and better drama.

## The passage rule — RESOLVED

### Most of it is already constitutional

[draft-constitution.md](../../governance/draft-constitution.md)
Art. IV §3 is more specific than this slate previously credited:

- a bill **carries in a house** when its weight crosses that house's
  **passage threshold** *and* **holds there through the conviction
  build** — so **hold-through is constitutional**, not an inference;
- it **becomes law on a majority of houses** (both of two; two of
  three);
- a house below **quorum** *cannot legitimately decide*: it
  **abstains**, counting toward neither passage nor blocking;
- and **passage is always measured against the FULL count of
  houses, never a shrunken one** — an abstaining house **must be made
  up by those present** (one sparse house → the other two must both
  assent), so the polity **can never collapse to single-house rule**;
- with **`vote.quorum`** and **`vote.passage_threshold`** already
  named in the *Schedule of Parameters* as **organic law** — which
  confirms the slate's rule that **the numbers are themselves law**
  (`parameter` clauses), so we pick the *shape* and ship a default.

Art. X supplies the tiers: **ordinary** = majority of chambers
(eternity-protected); **organic** = supermajority of the affected
chamber; **constitutional** = supermajority of *every* chamber +
referendum.

### Two ratios over one denominator

`tally` is an absolute magnitude in standing units, so passage needs
a denominator. influence.md points at the right one — `quorumWeight`
is "the participation numerator a passage rule measures against **the
total possible**." Therefore, per stock, per bill:

| Number | Formula | Gate |
|---|---|---|
| **turnout** | `quorumWeight / totalStanding(stock)` | ≥ `vote.quorum`, else the house **abstains** (not competent to decide) |
| **support** | `tally / totalStanding(stock)` | ≥ `vote.passage_threshold`, **held through the build** |

Because `\|tally\| ≤ quorumWeight ≤ totalStanding`, **support is
bounded in [−1, 1]** and is a single number expressing **breadth,
conviction, and agreement at once**. Measuring against the **total**
(not against turnout) is what makes it so: a unanimous-but-new house
and a split-but-matured house both score low, and only broad *and*
patient *and* agreeing support carries.

The threshold arithmetically **subsumes** quorum (support ≥ 0.35
implies turnout ≥ 0.35), yet quorum still does distinct work: it is
**conviction-independent** and it decides **presence**, which is a
different question from **carrying**. A house at 60% turnout and
evenly split *decided and failed*; a house at 3% turnout *was never
competent*, and the others must make it up.

### Supermajority has two axes

**Breadth** (how many houses) and **depth** (how strong within one).
Art. X already uses both without naming them: ordinary = breadth
majority; organic = depth in the affected chamber; constitutional =
breadth 3 + depth everywhere + referendum. Adopt the names; invent
nothing.

### ⚠ The reservoir conflict — constitution vs. shipped build

Art. IV §2 describes a **capped, regenerating reservoir with
continuous allocation**, and flags the reconciliation as *"remains to
be specified."* **The build specified it by removing it:** `hold` is
**full weight, no pool** — every position spends the holder's whole
standing scalar and never consults their other targets.

This is not a detail. **Art. IV §4's entire bill economy depends on
the scarcity the build deleted:**

| §4 mechanism | Under no-pool |
|---|---|
| tabling costs "a minimal **sponsoring allocation**" | free — everyone can sponsor everything |
| a bill lapses when support falls below a **survival floor** (*abandonment*) | support only falls if holders actively `drop`, and nobody bothers |
| **maximum lifespan** + **continuing resolution** | still works — it is a timer, not an economy |

**Recommendation: keep no-pool, rewrite §4.** The argument:

> **A reservoir is a *simulated* scarcity stacked on a real one.** The
> genuine constraint on how many bills you influence is how many you
> can read and form a view about — **attention**, which is real,
> unfakeable, and needs no token.

A budget converts politics into **portfolio management** and rewards
allocating cleverly across bills — swing-voter leverage relocated one
level up, which is exactly the politics conviction weighting exists to
kill. It is also what makes the **play chamber** viable: a mass
constituency will hold a position; it will not manage a budget. And
it puts the attention problem where it belongs — **on delegation**.

The honest cost: without scarcity nothing stops people holding yea on
everything they mildly like. **Measuring against total standing
absorbs it** — if everyone really does hold yea on everything, that is
genuine unanimous turnout, and passing is correct.

**The other half of this conflict lives in
[cooperative-slate § RESOLVED: the kernel's conviction rule
shipped](./cooperative-slate.md)** — that slate had already flagged
the reconciliation as *"to be worked out as the kernel's conviction
rule is specified,"* and it now is. Two findings that belong there but
bear on the passage rule: the reservoir's **two markers split rather
than merge** (permanent honor → the **chronicle**; current voice →
**standing**, which is already a decayed rate), and **no-pool is what
keeps passage scale-invariant** — `support = tally / totalStanding`
compares standing only to standing, so no absolute magnitude ever
enters the rule.

Consequences to fold into §4:

1. **Bills lapse by time, not starvation** — maximum lifespan +
   continuing resolution survive; only *abandonment* dies.
2. **Sponsorship gates on eligibility, not allocation** — a
   charter-declared right to table, or a minimum standing band.
   Better anyway: legislated per institution instead of priced.
3. **Proposal spam stops being a mechanic problem** — proposals are
   documents in a governed branch, so the **`writers` policy** and the
   charter already say who may table, and the ticker only surfaces
   bills near a crossing.

### Enactment is a latch

The continuous-tally framing invites a wrong reading: that a law falls
when its support goes negative. **It must not** — nothing could be
relied on. **Enactment closes the instrument and zeroes the ledger for
that target.** Repeal is a *new* instrument accumulating from zero,
which also kills the exploit where a matured opposition bloc repeals a
law the instant it passes. Persistence stays the default; lapse
requires an explicit sunset clause.

### Emergencies never accelerate the legislature

With a build period, even unanimity takes time. That is **deliberate
government, not a defect**, and the fix is the one real institutions
use — already present in § Sunsets: the legislature **pre-authorizes
an office to act**, and the authorization **sunsets by type**. Never
an expedited-vote mechanic.

### Buildable today

The `capital` faucet is deferred, so `totalStanding('capital')` is
**zero → turnout zero → the house abstains → the other two must both
assent.** That is precisely Art. IV §3's rule with **no special
case**: the passage rule degrades correctly to the two shipped stocks,
and can ship before the fund chamber exists.

## The roll — disenfranchisement by inactivity

**(User, 2026-07-31: "you get disenfranchised after a prolonged
period of inactivity. you don't lose your standing and you can become
enfranchised again if you reactivate… without that I foresee quorums
getting lowered and lowered over time as the consumer and labor pool
loses interest.")** Proposed as an **amendment**, which is the right
frame — see also
[amendment-library-slate](./amendment-library-slate.md).

### The failure it insures against

`totalStanding(stock)` counts everyone who has standing, not everyone
who is here. As a long-running game churns, the denominator fills with
people who left, turnout falls for reasons that have nothing to do
with the bill, and **the only available remedy becomes lowering
`vote.quorum`** — a **one-way ratchet**, because the small group that
benefits from a low quorum is the group empowered to keep it low.

> **Better to shrink the electorate to the people who are here than to
> keep lowering the bar until anyone can clear it.**

The correction belongs on the **denominator**, where it is automatic
and politically neutral, not on the **threshold**, where it is
discretionary and irreversible.

### Why decay does not already solve it

Standing decays in real time, so an individual ghost fades — but decay
is **asymptotic** and its half-lives are tuned for *influence*, not
for *roll maintenance*. The aggregate is what bites: a world with a
churned population many times its active one accumulates a **ghost
mass** that can approach or exceed the live electorate. **Decay
handles the individual; only a roll handles the aggregate.**

Which is exactly the user's separation: **this is a roll operation,
not a standing operation.**

### The safeguards are the whole design

Disenfranchisement is *the* historically abused mechanism — every real
voter-roll purge is justified as administrative hygiene and has been
used as suppression. So:

| Rule | Why |
|---|---|
| **declared in law**, never hardcoded — a `parameter` (the window) + a `structural` clause (the mechanism) | amendable and repealable; the legislature owns it |
| **restoration is automatic and immediate on return** — never an application, never a review, **never a discretionary act** | the instant a purge requires someone's *decision*, it is a suppression tool. **Load-bearing.** |
| **notice before removal**, with a window | fair warning (the posted-law principle) — and good retention design besides |
| **affects the roll and nothing else** — not standing, not chronicle, not property, not office, not employment | anything more is a punishment, and this is not one |

### Decay must keep running — or it reopens park-and-return

⚠ "You don't lose your standing" must mean *not stripped*, **not
exempt from decay.** If being off the roll froze decay, the
park-and-return exploit that decay quietly killed would come back.

The right shape falls out, and it is a good one:

> **Re-enfranchisement is instant; re-empowerment is earned.**

You return to the roll the moment you play, but your standing has
decayed, so practical weight rebuilds as you participate. That lets
the purge be maximally generous — instant, automatic, ungatekept —
**without** creating a return-and-swing exploit, because standing
recovery is the real brake. Held positions should **suspend with the
conviction clock frozen** (not drop) and restore intact, for the same
reason: no punishment, no free accrual.

### Cheap to build, and per-stock

**Derive-on-read, house pattern:** `enfranchised(subject, stock)` =
*has activity within the window*, read off the ledgers that already
carry `realAt`. **No stored roll, no purge job, no migration** — a
predicate and a denominator change.

And it should be **per stock**, because the stocks measure different
things: someone who plays daily but has made nothing in a year is
enfranchised in **Play** and not in **Make**. Consistent with the
already-accepted rule that **every chamber is a chamber of the
currently present**.

### Presumptive enrollment beats opt-in registration

The alternative — you are on the roll because you *registered*, and
registration lapses — is superficially more honest (nobody is
*removed*). It fails worse: a mass chamber where nobody registers has
a tiny roll **from day one**, so the fringe governs immediately rather
than eventually. And registration barriers are themselves a famous
suppression mechanism. **Presumptive enrollment with automatic
restoration** starts legitimate and degrades slowly; opt-in starts
degraded.

### The real prize: it makes the quorum number honest

Today `turnout` conflates **"people didn't vote"** with **"people
aren't here"** — politically opposite readings. Mass abstention is a
*signal* (a legitimacy crisis); mass absence is *churn* (an operations
problem). Separating them turns a low turnout number from noise into
**actionable information**.

> **The amendment is not only insurance. It is what makes turnout
> measure the thing it claims to measure.**

### Why it is excellent pedagogy

Voter-roll maintenance is genuinely necessary **and** genuinely
abused, and the whole fight is *"how long is prolonged, and who
decides?"* The game version makes the trade visceral: set the window
too long and quorum rots; too short and you disenfranchise the
**seasonal player** — someone who plays hard in winter and vanishes in
summer, a sympathetic and entirely real case. **That is the argument
the legislature should be having**, and it is a first-rate
amendment-library entry.

## Worked example: the turnpike trust (2026-07-31)

The [freight slate](./freight-slate.md)'s turnpike trust turned out to
be the **first concrete enterprise that lives inside this whole stack**,
and it exercises four of its parts at once. Recorded here because it is
the best available sanity-check that the instrument taxonomy does real
work:

| Piece of the trust | Instrument / mechanism |
|---|---|
| the **rate schedule** | a **`parameter` clause** in the locality's law — so **raising your rates requires passing a bill** |
| **"shall keep the road in good repair"** | a **`directive`** — *requires implementation*, so it needs **inspection**, and the road inspector is a real executive function (Art. V §6) |
| **dissolution when the debt is repaid** | a **sunset** — and the historical scandal is that trusts kept being **renewed** |
| the trust's **lobbying** | a **caucus publishing a platform** (§ *Synthetic constituents* in cooperative-slate) |

Two things it demonstrates that argument alone could not:

- **The directive/self-executing split is not bookkeeping.** A
  maintenance obligation *cannot* self-execute, so the taxonomy
  correctly forces an enforcement mechanism into existence — and the
  claim stays **checkable** rather than rhetorical, because road quality
  is a *number* (exit `speed`).
- ⭐ **Sunsets bite in the direction the slate predicted.** *"The trust
  that won't die"* is the concentrated-beneficiary problem exactly: the
  trust lobbies hard for renewal while the diffuse beneficiaries of
  lapse do not show up. **No authoring required.**

## Open questions (for requirements)

1. ~~Prose ⊗ clause authority~~ — **RESOLVED above** (different
   ground; rules-vs-standards; interpolated values; divergence is a
   defect with a remedy). What remains is the **authoring tooling**:
   the templating helpers, and the lint's exact checks.
2. **The clause vocabulary's closed set** — which `kind`s exist, and
   the discipline that keeps it small (coining a clause kind is
   coining a mechanic).
3. ~~Conflict detection~~ · 4. ~~Codification vs. chronology~~ —
   **both RESOLVED above**: the Roll is authoritative and
   append-only, the Code is derived and cached, and conflicts
   surface as a lint at codification.
5. ~~The enactment check~~ · ~~the passage rule~~ — **both RESOLVED
   above** (one check, three weight resolvers; two ratios over
   `totalStanding`; breadth ⊗ depth; enactment latches; emergencies
   pre-authorize rather than accelerate). **Delegation** is the one
   substantive remainder. Two things that must go to requirements as
   *decisions*, not notes: **(a) the reservoir conflict** — the draft
   constitution's Art. IV §2 pool vs. the shipped full-weight/no-pool
   build, with Art. IV §4's sponsoring allocation and survival floor
   needing a rewrite either way; **(b) the disenfranchisement
   amendment** — the inactivity window, and the rail that restoration
   is never discretionary.
6. **Citation format** — the player-facing way to reference a law in
   argument, testimony, and contract clauses.
7. ~~The received-law corpus~~ — **RESOLVED above** (bootstrap +
   minimal criminal code + institutional authorization + procedural
   minimums; never the contested questions; vestigial law as the
   repeal tutorial; thin by rule). What remains is **drafting the
   actual corpus**, which is content work.
8. ~~Sunset and review~~ — **RESOLVED above** (persist by default;
   appropriations / emergency powers / charters sunset by type; any
   law may carry one; visibility is the press's job; lapse is a
   legitimate outcome; and it redistributes power).
