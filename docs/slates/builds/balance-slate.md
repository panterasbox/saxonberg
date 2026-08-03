# Balance slate — what the legislature actually governs, what a law looks like, and who enforces it

**Captured 2026-08-02.** The question that opened it:

> **User: "what can private parcel holders do on their own authority and
> what is prescribed by the Compact? … it's back to federalism and our
> version of the 10th amendment. The solution has to empower private
> content developers but also give the legislature authority over the
> rules of the game and all of it has to be enforced by the executive."**

And the correction that reframed the whole thing, one turn in:

> ⭐⭐⭐⭐⭐ **User: "it's not just physical crossings, it's any state that
> is changed by the locality and consumed outside of it. Which is all
> reputation and discipline, the entire advancement axis. This makes the
> legislature's main job establishing balance. It's interstate commerce
> but for every resource and economy in the game, of which there are
> many."**

> **Status: design conversation, captured. Not requirements. The
> mechanisms it needs are mostly shipped or already slated — the net-new
> artifacts are a list, a predicate, and one field.**

---

## ⚠ Already decided elsewhere — do NOT re-derive

This slate assumes all of the following and adds to it. Read them first;
nothing here restates them.

| Artifact | What it already settles |
|---|---|
| [legal-code-slate](./legal-code-slate.md) | instrument taxonomy (type IS its consumer), the Roll → Code → clause index, prose ⊗ clause, the enactment pipeline, the docket + its sweep, conviction weighting, the passage rule, *enactment has no human actor* |
| [branch-policy-slate](./branch-policy-slate.md) | `writers` as data-sourced `FromModule`; **narrows never widens**; nearest-wins; self-amendment; the wizard hatch stated honestly |
| [stewardship-slate](./stewardship-slate.md) | the allowance cascade (Compact → locality → parcel), the closed-six land use, *zoning governs land use, never self-expression* |
| [amendment-library-slate](./amendment-library-slate.md) | kernel/module split; governance choices as legos |
| [zoning-slate](./zoning-slate.md) | **industrial is defined by what LEAVES** — the externality test this generalizes |
| [enforcement-slate](./enforcement-slate.md) · [policing-slate](./policing-slate.md) | the evidence firewall; testimony as claims not queries; crime social, alignment intrinsic |
| [press-slate](./press-slate.md) | the three layers; **events, never significance** |
| [parcel.md](../../subsystems/parcel.md) | title stored outside content (the governing security invariant); `ownerOf`; the coverage trie; `landUse`/`area`; `subdivide`/`transfer` |
| [access.md](../../subsystems/access.md) | `can`/`canMutateZone`; the code-trust lockdown; **committee = the title-holding group** |
| [civics.md](../../subsystems/civics.md) · [governance.md](../../subsystems/governance.md) | Locality-declared jurisdiction; the Office substrate; seats-as-positions |

---

# Part 1 — What is reserved

## ⭐⭐⭐⭐⭐ Every global ledger is a currency, and every parcel that writes to one is a mint

The user's reframe, taken to its conclusion. A training dummy that grants
swordsmanship exports nothing physical — but the competence it writes is
read **everywhere**. That parcel is minting a global currency inside a
local jurisdiction.

So count the mints:

| Ledger | Chokepoint? |
|---|---|
| `bank_ledger` | ✅ `postTransaction`, conservation-enforced ([banking.md](../../subsystems/banking.md)) |
| `transcripts` (competence) | ❌ |
| `renown_events` | ❌ |
| `participation_events` | ❌ |
| `producer_events` | ❌ **— this one is voting weight** |
| `disposition_events` (traits) | ❌ |
| `chronicles` | ❌ |
| `authoring_events` | ❌ |
| `accountability_events` | ❌ |
| `positions` | ❌ |

> ⭐⭐⭐⭐ **Money already solved this. Nine other ledgers have the identical
> problem and no chokepoint** — and `producer_events` is the one that
> elects the government. *A parcel that can mint producer standing can
> mint votes.*

Which is why balance is not a game-design chore delegated to a designer.
It is **monetary policy for nine currencies**, and it is the legislature's
actual job.

## The test — and a sharpening

"Consumed outside" is *nearly* the rule but slightly too wide: if
everything read from elsewhere is reserved, holders have nothing and the
9th/10th promise is hollow.

> ⭐⭐⭐ **The test is not "is it read outside." It is "does it ADD to a
> global scale."** A ledger you can accumulate into is a currency. A fact
> you can read is just content.

Your fiction, your place, your stuff, your room descriptions — **yours**,
however widely read. **Only the ledgers are federal.**

## ⭐⭐⭐⭐ The enumeration is not philosophical — it is the collection list

Which makes the reserved list mechanically checkable rather than a matter
of argument:

> **The set of reserved matters IS the set of append-only,
> cross-jurisdiction ledgers.** If a build adds a collection that
> accumulates across localities, **it has added a reserved matter** — and
> that becomes a design-review question at the time, not a discovery
> three years later.

The two axes this decomposes into are, notably, the two the US
Constitution enumerates in Art. I §8: **commerce among the several
states** (externality — what leaves) and **coinage + the standard of
weights and measures** (commensurability — what must mean the same thing
everywhere for a portable record to be legible). Plus the copyright
clause, which the project already holds un-fused as `authoring_events`.

## ⭐⭐⭐⭐ Federalism is already built — it is the longest-prefix walk

The finding nobody was looking for. Jurisdiction (civics), title
(`ownerOf`), land use, the allowance cascade, and branch `writers` policy
all resolve **identically**: nearest claimant wins, unclaimed inherits
upward.

That is not five mechanisms. It is **one topology used five times**.

> **A holder's authority is not a grant handed down. It is the interval
> of the tree they hold — and the Compact's interval is the root.**

## ⭐⭐⭐⭐ Supremacy needs no second walk

The obvious objection: nearest-wins is the *wrong direction* for reserved
matters. A locality declaring its own coinage would win by prefix.

But no root-wins resolver is needed:

> **A law on a reserved matter is VOID AT CODIFICATION.** It never enters
> the clause index, so ordinary nearest-wins resolution is already
> correct. **Constitutionality is a write-time predicate, not a read-time
> precedence rule.**

Which is also the legal truth — an unconstitutional law is not overridden,
it is void *ab initio*. And it collapses the build to **one list and one
predicate in the codification lint** (which already exists, for
conflicts). Every shipped resolver stays untouched. Same shape as
branch-policy's *validate at set time*.

## ⭐⭐⭐ Capability fails closed. Authority fails open.

The 9th amendment, and the half that actually empowers content
developers.

> **You may not call what you were not given. You may do what you were
> not forbidden.**

The security substrate must fail closed — `AccessApi.can`, the code-trust
lockdown, `writers`. The **political** substrate must fail open, or you
get a permission-slip culture where nothing gets built and every holder
waits on a grant.

They are safely separable because the project already separates them:
capability is `can()`, authority is law, and **law ships with no teeth by
default**. So the residual clause is not prose anyone must enforce — **the
fail-open default IS the residual clause.**

## ⚠ Three tiers, not two

A correction to the opening framing worth keeping in front:

> **The Compact is NOT ultimate authority over what the code does.** It is
> authority over the rules of the game. The runtime is wizard-gated and
> out of fiction.

| Tier | Governed by |
|---|---|
| the **runtime** | wizards; out of fiction; the sandbox doctrine's one axis nothing opens |
| the **Compact** | the polity — the rules of the game |
| the **holder** | themselves, over everything unreserved |

> ⭐⭐⭐ **No law can make you a wizard.** Otherwise the legislature has a
> legal path to code-trust and the capture-resistance claim evaporates.
> (See Part 6 for the succession form of the same rule.)

---

# Part 2 — What a law looks like

## ⚠ Pseudocode is the trap

Three reasons, and the third is fatal:

1. only the ~5% who code can write it — the polity is disenfranchised by
   the medium;
2. whoever writes the interpreter holds the real power;
3. ⭐ **it duplicates the engine.** A law reading `competence += 0.1 *
   difficulty` is a second implementation, and it will drift from the
   first.

## ⭐⭐⭐⭐⭐ A statute is a constraint on a meter, never a procedure

> **The engine computes; the law bounds.** Anything that must *do*
> something is a **directive** — a work order for the executive — not a
> self-executing clause.

Which yields three law shapes, sorted by **what reads them** (extending
legal-code's *type IS its consumer*):

| Shape | Read by | Interpretation | Example |
|---|---|---|---|
| **parameter** | the runtime | none | `vote.quorum = 0.3` |
| **bound** ⬅ **missing today** | the docket sweep | arithmetic | competence mint ≤ 4.0 band-fractions / player-hour |
| **standard** | people | judgment | *"content must not be deceptive"* |

**The middle row does not exist in the corpus and it is the entire balance
layer.**

## The bound, concretely — a form, not a program

```yaml
matter:     advancement.competence     # from the closed enumeration
scope:      /domain/hinkley/**
class:      novice                     # the declared audience (Part 3)
bound:      <= 1.0 band-fractions per player-hour
measure:    transcripts, 7-day trailing
on-breach:  throttle
```

Fillable by anyone. It names a **matter** from the enumeration, a
**meter the engine already produces**, and a **number**. It reimplements
nothing.

## ⭐⭐⭐ The precedent exists — it is regulatory, not constitutional

The substrate combination is genuinely novel; **the law shape is not.**
Basel III capital adequacy is a ratio. Clean Air standards are
concentrations. Spectrum allocation is a band. **Modern administrative law
is overwhelmingly bounds on measured quantities**, precisely because that
is the only kind of rule that can be checked.

> ⭐⭐⭐⭐ **We are not teaching people to write a criminal code. We are
> teaching them to be a REGULATOR.** That is arithmetic plus tradeoffs —
> teachable, and squarely inside the econ pedagogy the college slate
> already wants.

## Two hard constraints that fall out

### ⭐⭐⭐ A matter cannot be legislated until it is metered

You cannot bound what you do not measure. So the legislature's reach is
bounded by the **instrumentation**, not by ambition, and *adding a meter*
is an engine release — constitutional scale. Self-limiting in the right
direction, and it makes
[instrumentation-slate](./instrumentation-slate.md) politically
load-bearing rather than plumbing.

### ⭐⭐⭐⭐ A bound that needs exemptions is measured in the wrong unit

The general rule, and the answer to most of the targeting problem
(Part 3). A novice zone granting fast progress and a veteran zone granting
slow progress look wildly different in raw transcript entries — and
**identical measured in fraction-of-a-band**, because Competence is
already banded and derive-on-read ([advancement.md](../../subsystems/advancement.md)).
The engine has already normalized the curve.

⚠ **Reach for the unit before reaching for the carve-out.** Every
exemption is a lobbying surface — a thing someone campaigns for.

---

# Part 3 — Targeted content

> **User: "bounds need to be dynamic enough to accommodate content
> directed at specific players — veteran vs newbie, but there could be
> other dimensions. This can't be seen as preferential… I suspect the
> completely universal stuff is pretty limited."**

Correct, and it breaks a flat-rate model. It decomposes into three
problems and only the third is new.

## 1. Most apparent targeting is a different MATTER

Dave's Bar mints renown and participation. A delve mints competence in a
combat Discipline. **They are not competing for the same bound** — the
`matter` field already separates them. Much of what reads as *"this is for
a different audience"* is actually *"this is on a different ledger,"* and
that is free.

## 2. Genuine mixed use — subdivide, plus the accessory-use doctrine

- **The declaration is a class PER MATTER** — a small map, not a scalar,
  and not a new "mixed" category. A tavern that is also a shop declares on
  two ledgers and conflicts on neither.
- **Mixed on one matter is what `subdivide` is for.** A building with a
  novice floor and a veteran basement is **two parcels**, and that already
  ships. It is also what real zoning does — one lot does not get two
  principal uses; you split the lot.
- ⭐ **The de minimis case needs the accessory-use doctrine** (zoning has
  had it for a century): *a use subordinate and customarily incidental to
  the principal use needs no declaration of its own.* Otherwise selling
  one apple makes you commercial. A threshold: below X% of the parcel's
  minting on that matter, it rides the principal declaration.

## ⭐⭐⭐ 3. Targeting is zoning

For genuinely different content that no unit unifies, the shipped
mechanism is the right one:

> **A parcel declares its class from a closed vocabulary, and the bound is
> written against the declaration.** Exactly land use — capability +
> ceiling, closed engine vocabulary, assignment local and political.

⚠ **The brake must be that the axis vocabulary is closed engine code.**
Assignment is political; **adding an axis is an engine release.**
Otherwise *"I need a new targeting dimension"* becomes the exemption
generator under another name. Start with **one** axis (progression tier).
The likeliest second is **solo vs. group**, since party content genuinely
cannot be rate-matched to solo content in any unit.

⚠ **Residual, honestly:** content targeted at a dimension the engine does
not measure **cannot be a declared class**, by the same rule that says an
unmetered matter cannot be legislated. That will bite. The answer is
instrumentation, not an exception.

## ⭐⭐⭐⭐⭐ Undeclared ground mints nothing

> **User: "that stuff was somewhat discretionary before, but if it
> determines balance parameters now there's public interest embedded in
> the data — and it requires people actually use the parcel model the way
> we're hoping."**

The sharpest observation in the session. `landUse` and `area` are declared
at provision and explicitly **not policed** today. The moment they set
balance parameters, **non-declaration is an exploit and misdeclaration is
an offense** — and neither is fixed by hoping.

The fix inverts the incentive rather than policing it:

> ⭐⭐⭐⭐⭐ **Undeclared ground mints nothing.** Declaring is not paperwork
> asked of people for the public good — **it is how you turn your parcel
> on.** Nobody needs to want the system to work; they need their content
> to function.

And this is not new doctrine — it is the argument parcel.md **already
makes** for `landUse`:

> *"⚠ `wild` admits nothing, and that default is load-bearing. Were `wild`
> to admit cultivation, it would be legal on every branch nobody thought
> to zone."*

Same argument, new axis. It is also **capability-fails-closed /
authority-fails-open doing exactly its job**: the capability side fails
closed *so that* the political side can safely fail open.

**Misdeclaration then handles itself.** The declaration is a *claim*, and
the sweep already measures who is actually present. Claiming novice tier
while serving veterans is a **metered mismatch**, not an investigation. No
new machinery.

⚠ **Localities need the same medicine** — they are pure addressing today
and allocate nothing. If jurisdiction becomes load-bearing for balance,
the incentive to declare has to be the same one.

## ⭐⭐⭐⭐ Particular legislation is legitimate. Particular EXEMPTION is the abuse.

An earlier draft proposed a **special-legislation prohibition** (many
state constitutions flatly ban laws aimed at a named person or place).
**Rejected, correctly:**

> **User: "we've been using 'nerf that NPC 10 units' as a literal example
> in our marketing material. We've said the legislature writes laws from
> the abstract to the particular so long as they can be enforced."**

A flat prohibition bans the headline feature. That was a bad rule, not a
misplaced one. The real asymmetry:

> ⭐⭐⭐⭐ **Nerfing a named NPC imposes a BURDEN on a named target — the
> legislature doing its job. Granting a named parcel a higher mint rate
> confers a BENEFIT on a named target — that is capture.**

And unlike the prohibition, it is **mechanically checkable**: does this
instrument make the target's bound *tighter* or *looser* than its class
default? **Tighter passes normally. Looser is a special benefit** and
needs the higher bar — supermajority, sunset, or compensation. All
**module**, all amendment-library shaped (the user's call).

> **The holder's protection against being nerfed was never a prohibition.
> It is COMPENSATION** — the `appropriation` instrument, which the
> taxonomy already has. Consistent with the rest: quarantine not
> confiscation, price your own retroactivity.

---

# Part 4 — Detection and adjudication

## ⭐⭐⭐⭐ Detection is not a police function — it is the docket sweep

> **You do not detect violations. You measure rates.** A breach is a ratio
> crossing a declared line — **structurally identical** to a bill crossing
> its threshold.

Same machinery, same skip-test proof, same idempotent state comparison,
same collection. A breach entry sits next to an enactment entry **because
they are the same event shape.** Free, and — the load-bearing part —
**non-discretionary**. *Nobody decides to investigate you.*

## ⭐⭐⭐ The machine throttles; it never punishes

Breaches are frequently innocent (a streamer's parcel genuinely got 10×
traffic this week).

> **Automatic detection → automatic proportionate response → human
> adjudication only for the exception.** A throttle is not a sanction; it
> is **the bound doing its job**. The actual sanction (quarantine)
> requires a human.

A false positive costs you throughput, never your parcel. **Fail-safe.**

## Adjudication splits by law shape

| Shape | Adjudicated by | The question |
|---|---|---|
| **parameter** | nobody — impossible to violate | — |
| **bound** | court, **on exception only** | not *"did you exceed"* (arithmetic) but *"should you be excused"* (judgment) |
| **standard** | court, always | pure judgment; the venire pool primitive |

The rules-vs-standards fork from legal-code, now with the middle term
where all the balance work actually lives.

## ⭐⭐⭐⭐ The standing ladder

An earlier draft said *"the detection is public, so anyone can bring the
case."* **Overshot** — user pushback: *"you can't say any random schmo is
representing the people, not like an elected or appointed official has a
mandate to."* Correct.

But there is a wrinkle that matters: **balance violations are exactly the
injury type standing doctrine excludes.** If a parcel over-mints
competence, everyone is harmed slightly and nobody particularly — a
**generalized grievance**, which courts reject. So requiring injury-in-fact
collapses enforcement onto the executive alone, arriving at the capture
risk from the other direction.

Hence a ladder, and rung 3 is the valve:

| Who | When | Analogue |
|---|---|---|
| **the supervising office** | any breach — the default | prosecution; the mandate is real, since the seat is filled by the same conviction process as everything else |
| **an injured party** | your over-minting concretely devalued *their* position on that ledger | private civil suit, injury-in-fact |
| **a relator — anyone** | ⭐ **only after the office has publicly DECLINED** | qui tam (False Claims Act) / statutory citizen suits |

> ⭐⭐⭐⭐ **Not "anyone can sue." "Anyone can sue if the office won't."**

The office gets first refusal — and because **the declination lands on the
docket**, an executive that systematically declines is *visible*. That is
what keeps it honest.

It also puts the press in its correct role, which an earlier draft
inflated:

> ⭐⭐⭐ **The press has no standing. It has PUBLICITY.** A journalist
> reading the docket is not a litigant — they are **what makes declination
> expensive.**

⚠ **The relator's share is a live question.** Qui tam pays a cut, which is
what makes it work in reality **and** what generates nuisance suits. A
money bounty here would get farmed and collides with the shipped rail
*never reward holding a position*. **Lean: credit and renown, not coin** —
the relator's name on the docket entry. Consistent with standing being
earned rather than bought, and it fails soft if abused.

⭐ **A defence bar is a real vocation.** If the office can bring a case,
the holder needs representation — genuine unmet demand, a real skill
(reading the record), real stakes. For [vocations.md](../../vocations.md),
not for this build.

---

# Part 5 — Retroactivity: new statute over already-published content

## ⭐⭐⭐⭐ Existing content is a NONCONFORMING USE

Zoning already has the doctrine, in vocabulary the project already uses:

| Rule | Here |
|---|---|
| **it continues** | nothing you built stops working — *this is the promise that makes people build at all* |
| **it may not expand** | you cannot add more of the now-noncompliant thing |
| ⭐ **it conforms on the next substantial alteration** | **the next `saveTemplate` runs the current lint** |
| **no retroactive blame** | the breach ledger starts at enactment — Art. I §9, here just *"the sweep begins when the law does"* |

⭐ **The conform-on-touch rung is nearly free**, because
`TemplateApi.saveTemplate` is *already* a universal chokepoint — the
code-trust gate lives there. **The CMS save path is the compliance
boundary.**

And the notification path already exists: a compliance failure surfaces as
a **diagnostic on the holder's own content**
([diagnostics.md](../../subsystems/diagnostics.md)), in the `errors` pane
they already use.

## When grandfathering cannot apply

Sometimes continuation is the very thing being stopped — the parcel is
minting votes at 100× and that is the point of the statute.

> ⭐⭐⭐ **A statute that cannot grandfather must declare its own sunset
> window and its own compensation.** No silent breakage — and the cost of
> breaking someone's work is paid by the legislature that chose to break
> it, out of `appropriation`.

**Making the legislature price its own retroactivity** keeps disruption
possible but expensive, which is the correct incentive. It is the takings
clause, and it costs one existing instrument type.

## ⚠ The sneaky third case — old law, new engine

Not new law over old content: **an engine release that changes what a
meter means.** Every bound written against it silently re-scopes.

> **An engine release that redefines a meter must lapse-or-migrate every
> bound written against it, visibly on the docket.** Silent re-scoping is
> the one failure mode that would make the whole record untrustworthy.

---

# Part 6 — The institution

## ⭐⭐⭐ Regulatory in shape, prosecutorial in nothing

> **User: "enforcement is executive not legislative isn't it? Some kinda
> DOJ, isn't that the model? Or is it more corporate, some kinda
> regulatory body?"**

**DOJ is the wrong shape.** Prosecution is discretionary, adversarial,
case-by-case and punitive. What is actually being enforced is *a bound on
a meter, measured continuously, with a throttle as the automatic
response.* That is **supervision**. Basel is the closest fit: the ratio is
in law, the supervisor monitors, breach triggers automatic consequences,
and only the exceptional case goes adversarial.

But "regulatory agency" carries the hazard to design against:

> ⭐⭐⭐⭐ **The office supervises. It does NOT make rules.** No delegated
> rulemaking — that is what makes real agencies powerful, and it collapses
> the legislature into the executive. The bound comes from the
> legislature, the meter from the engine; the office's only discretion is
> **whether to bring the exception case**, and the relator rung checks
> even that.

## ⚠⚠ The PM: two hats, never one office

The deferred Prime Minister in access.md sits atop **operator/root →
archwizards → wizards** — the *code-trust* chain, out of fiction. The PM
who seats a cabinet is a **diegetic** head of government.

> ⚠⚠ **If those are the same seat, the fiction's executive inherits
> code-trust by SUCCESSION.** That is *no law can make you a wizard*
> defeated from the other direction — no law needed, just an appointment.

They are the same person at launch (founder-default, and fine). But it
must be **two hats, never one office**, or the succession rule quietly
becomes the escalation path. The companion rule to Part 1's:

> **No law can make you a wizard, and NO OFFICE MAY INHERIT CODE-TRUST.**

## ⭐⭐⭐ Removal, not confirmation, is the lever — and conviction already provides it

Appointment power without removal power is weak. **Removal is where
control lives** — the whole unitary-executive fight turns on for-cause
removal protection. So the question is never *"does the legislature
confirm"* but *"can the PM fire the supervisor for enforcing against the
PM's allies."*

**Fixed terms are foreign to this substrate** — conviction is continuous,
there are no election days. Instead:

> ⭐⭐⭐⭐ **Removal requires a conviction crossing, like everything else.
> The build period IS the tenure protection.** You cannot remove the
> supervisor in a bad week; you must hold the position long enough for it
> to mature.

**Settled shape:** PM-appointed · legislative confirmation as an ordinary
vote (free — same enactment path, different resolver) · **removal only by
a crossing** · **its own conviction question**, not riding the PM's (user's
call — it is what makes removal-by-crossing mean anything).

## The inflation risk — and why we are NOT building an independent regulator

> ⚠ **A legislature of players will vote itself faster progression.** That
> is inflation, and it is the most predictable failure mode of player
> governance.

The three chambers are the designed answer, and the fund chamber is a
better anchor than first credited: **its standing is the only one tied to
a signal from outside the game.** Three honest weaknesses, specific to
this question:

1. ⚠ **The timescale is inverted.** Faster progression feels good
   immediately; churn shows up months later; conviction build periods are
   days. Textbook **time-inconsistency** — precisely why central banks were
   made independent. *The mechanism is right, the clock is wrong.*
2. ⚠ **Play + make are not natural opponents here.** Players want richer
   progression; content makers largely want their content to feel
   rewarding. Fund is the only likely objector and **2-of-3 outvotes it.**
   The check is weakest exactly where it is needed.
3. ⭐⭐ **Patronage is not equity, and that cuts against the guard.**
   *(User: "we're not actually representing capital, we're only
   representing patronage, since you don't have equity — but that's what
   it's supposed to simulate.")* **An equity holder is exposed to terminal
   value; a patron is exposed to this month's enjoyment.** Confirmed
   mechanically rather than by analogy: **fund standing decays in real
   time**, so it is a *flow* measure. It structurally cannot hold a long
   horizon.

### ⭐⭐⭐⭐⭐ But patronage is a worse steward and a BETTER SENSOR

Equity can be trapped — a locked-in owner votes badly for years.
**Patronage cancels.** The signal is short-horizoned but it is *current*
and *fast*, which is exactly what the timescale problem needs.

> ⭐⭐⭐⭐⭐ **So do not ask the fund chamber to RESIST inflation by voting.
> Ask it to REVEAL inflation before the churn arrives.** Publish total
> fund standing as a **trend** — bad progression policy then has a
> **leading** indicator instead of a lagging one, patronage turns down
> weeks before anyone quits, it is already a computed number, and the
> gazette already exists to carry it.

That converts *"build an institution to restrain the polity"* into *"make
the consequence visible before the vote matures"* — which is this
project's actual thesis, and roughly free.

### ⭐⭐⭐ Therefore: ship the cheap version

For a polity that might be twelve people, an insulated office with removal
protections is heavy apparatus against a risk that two cheap things
already cover:

1. ⭐⭐⭐⭐ **The asymmetric ratchet — loosening is always the harder act.**
   Structural, no institution, and it is **the same rule as
   particular-exemption**, so one principle covers self-dealing in both
   directions. It also fails toward a *deflationary* world, which is
   recoverable; runaway inflation is not.
2. **The fund-standing trend, published.** Leading indicator, free, and it
   hands the press the story.
3. **The supervisor is an ordinary cabinet seat**, insulated by the build
   period rather than a special regime.

> **Independence stays an amendment-library MODULE for when the polity is
> big enough that it is a live problem. Ship the cheap version; the
> expensive one is an entry, not a default.**

---

# Part 7 — Teaching it, and disclosure

## ⭐⭐⭐⭐ The tutorial for governance is a THERMOSTAT, not a civics lesson

> **User: "we have to teach people how to actually govern this game, and
> if we don't know ourselves we can't design a system that's intuitive."**

If someone's first encounter with legislation is *"draft a statute,"* they
are lost. If it is:

> *"This locality mints competence at 4.0/hr. This proposal moves it to
> 3.5. Here are the ten parcels affected. It passes Thursday 14:00 unless
> something changes."*

— that is legible to anyone, and the countdown half already exists.

**One bound, one number, a visible effect, a reversible decision.**

Which argues for shipping the founding statutes **already in bound form**
as received law (`enactment.process: founding`), so the first governing act
anyone performs is an **amendment**, not a draft.

⭐ And the honest pitch: balance is contested, unglamorous and never
finished — good for retention, it is a permanent job — but it means you
are selling **"you run the economy,"** not *"you write the laws."*

## Disclosure — positions, not standing (and what that cannot hold)

Settled: **positions are public; standing is not.** Delegation confirms the
cut — **accountability needs DIRECTION, not MAGNITUDE.** Since delegation
steers rather than transfers, the delegate's displayed position is their
own and that is the whole audit surface.

⚠ **But the split leaks.** Positions public + tally public ⇒
**differencing recovers individual standing** (a solo flip moves the tally
by exactly twice that person's weight). Not an attack — subtraction. And
**do not reach for banding**: *band never defends.*

> ⚠⚠ **In a polity of a few dozen, NOTHING AGGREGATE IS PRIVATE.** Small
> population + frequent observation defeats aggregation generally.
> Aggregation must never be load-bearing for privacy here.

The leak bites in one place — fund standing is ~proportional to money
spent — and the right response is to reframe rather than plug:

> ⭐⭐⭐ **The private thing is the PAYMENT, not the political weight.**
> *"Bob paid $40"* is a financial fact and stays in the ledger. *"Bob
> carries weight w in the fund chamber"* is a **political** fact — and in a
> polity where money buys voice, **that is precisely what the polity is
> entitled to know.** Campaign-finance disclosure exists for this reason;
> concealed money-derived influence is the failure mode.

**Adopt disclosure deliberately and say so**, rather than promising a
privacy that differencing quietly removes. The **aggregate trend gauge** is
untouched by this — chamber health as a published number is a different
artifact from per-person weight, and stays aggregate.

### The delegation graph — a ratification knob with a one-way hinge

*(User: "personally I like public, but probably I'm in the minority. Either
way this is something that can be configured easily during ratification.")*

Agreed, and it should **extend the existing ballot-secrecy
amendment-library entry** rather than mint a sibling — it is the same
question one level up.

Lean: **received weight public** (or you cannot see who the real power
brokers are); **the edges private** (delegation is trust in a *person*,
more socially loaded than a stance, and a public graph invites *"why are
you backing them"*). Stated as a **norm, not a guarantee** — at this scale
a solo delegation change is visible by subtraction anyway.

> ⚠⚠ **The one asymmetry that must be written into the entry: this
> ratchets ONE WAY.** Private → public is a switch. Public → private is
> not — what has been observed stays observed. **So the reversible
> direction is the safe default even for someone who prefers public**: ship
> private-by-default, and a polity that wants public gets there in one act,
> losing nothing and keeping the option that cannot be recovered later.

---

# What is actually net-new (the build surface)

Small, which is the argument for doing it:

| # | Artifact | Size |
|---|---|---|
| 1 | **The enumeration** — the closed list of reserved matters (== the cross-jurisdiction ledgers) | a list |
| 2 | **The validity predicate** in the codification lint (void-at-write) | a predicate |
| 3 | **The `bound` instrument** — the missing middle law shape | the real work |
| 4 | **The class-per-matter declaration** on `ParcelRecord`, beside `landUse` | one field |
| 5 | **Undeclared ⇒ mints nothing** — the fail-closed capability default | a default |
| 6 | **Breach entries in the docket sweep** — reuses the shipped skip-test | small |
| 7 | **Quarantine** — closing a crossing; nothing can do this today | new |
| 8 | **Conform-on-`saveTemplate`** — the compliance boundary at an existing chokepoint | small |
| 9 | **Lapse-on-amendment** for bounds whose meter was redefined | small |

⚠ **Sequencing:** #1–#2 are meaningless without #3, and #3 is meaningless
without meters that exist. **The instrumentation gates everything here** —
see the Part 2 constraint.

# Open questions

1. **Does the class-per-matter declaration ride `landUse`'s row or a
   sibling field?** *Leans same row* — same act, same politics, same audit
   path.
2. **Accessory-use threshold: a constant or a parameter?** Parameter makes
   it legislable (right) but is also a dial someone will aim at a rival's
   side business.
3. **Is the throttle visible to the PLAYER or only the holder?** A player
   whose competence silently stops accruing will report a bug. *Leans
   visible and named* — *"this ground has reached its rate"* — which also
   makes the politics felt at the point of contact.
4. **Does `on-breach` need a vocabulary at all, or is throttle always the
   answer?** More remedies is more expressive; every entry is a lever
   someone will aim at a rival.
5. **Bound per-parcel, per-locality, or per-player?** Per-parcel is
   checkable and targets the actual mint; per-player is what balance
   actually cares about but is gameable by spreading across parcels.
   *Leans: bound the parcel, MEASURE per-player* — the ratio is the honest
   unit.
6. **Relator's share — credit only, or is that too weak to motivate?**
7. **Who staffs the courts** for the exception cases in a twelve-person
   polity? The venire pool primitive exists; the population may not.
