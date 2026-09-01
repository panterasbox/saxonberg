# Company & capital — entity form, IP posture, and the capital-markets question

> **Status: design synthesis, captured 2026-08-31. Not requirements, and
> not legal advice.** A meta-doc over the *company* rather than the
> engine. It records four decisions and one long argument: what entity
> holds the work, what IP posture protects it, whether the capital
> chamber could ever be real equity, and what the Compact would have to
> survive if it were.
>
> Provenance: an incorporation question that turned into a
> capital-markets question. Figures and statutes are as understood on
> the capture date; anything with a dollar sign needs re-checking before
> it is relied on.

See also — the design this sits over:
[measurement.md](./measurement.md) (the three layers; entrenchment tiers
A/B/C) · [compact-political-science.md](./compact-political-science.md) ·
[subsystems/governance.md](./subsystems/governance.md) (offices, seats,
founder-default holders) ·
[subsystems/influence.md](./subsystems/influence.md) (the three-stock
contract) · [positioning.md](./positioning.md) (the outward claim this
doc backs) ·
[slates/builds/standing-mint-slate.md](./slates/builds/standing-mint-slate.md)
· [slates/builds/balance-slate.md](./slates/builds/balance-slate.md).

---

## Part 0 — The finding: the thesis is testable now, and equity would contaminate the test

The hypothesis is that **consumer voice delivered through gameplay
outcompetes unconstrained firms in the same vertical**. That is
answerable today, at zero securities cost, inside an ordinary LLC, using
non-economic governance units.

Add real equity and the result becomes unreadable — a win could be the
voice or could be the novelty of being the crowdfunded company. The
variable you care about is the only one you would have confounded.

⭐ **So the sequence is fixed: the cheap experiment is the gate.** It is
also what makes the expensive one fundable later, because nobody funds
*"we think governance is a moat"* and plenty of people fund *"here is our
retention curve against the incumbent's."*

Everything below is the map for after that gate, plus the small number
of things that are cheap now and impossible to retrofit.

---

## Part 1 — The entity

**Decision: a single-member LLC named for the studio, with Saxonberg as
a product it owns.** One entity can hold unlimited brands; there is no
filing for "having a product," and no added cost for the parent/product
shape.

- Formation runs a few hundred dollars plus the state's annual fee.
- ⚠ Apostrophes in entity names are handled inconsistently by Secretary
  of State filing systems. Be ready to file the legal name without one
  and brand with it. The legal name is plumbing.
- A **DBA** is needed only to contract or take money *as* Saxonberg — a
  bank account, an invoice. Skip until that is true.
- ⚠ **Do not reach for a Series LLC.** It is the obvious fit for
  "one parent, many products" and it is a trap: untested in many courts,
  not respected by every state, and it solves a problem that does not
  exist until products have genuinely different liability profiles or
  different owners.

**Post-formation checklist, in order:**

1. EIN (free, IRS, minutes).
2. Operating agreement — yes, even single-member. It is part of what
   preserves the liability shield.
3. Business bank account.
4. ⭐ **Founder IP assignment.** A one-page document transferring
   copyright in the codebase from the natural person to the LLC. It is
   boring, free, and routinely skipped — and without it the entity owns
   a bank account rather than Saxonberg.
5. Set the copyright holder in `LICENSE` and the `author`/`license`
   fields in `package.json`. ⚠ As of capture, **no copyright holder is
   named anywhere in the repo** — the AGPL text carries only the FSF's
   own boilerplate line. Default ownership is therefore the natural
   person, which is fine until step 4 happens and wrong afterward.

⚠⚠ **The highest-risk item is not on that list.** Employment agreements
commonly assign inventions related to the employer's line of business,
and the day job is edtech while the project is an educational platform.
State carve-outs (California Labor Code §2870 and its analogues) protect
off-hours work on own equipment that is *unrelated* to the employer's
business — and "unrelated" is doing enormous load-bearing work here.
**Get a written acknowledgment before forming anything.** Incorporating
is the act that makes the ownership question concrete and discoverable.
That signature is worth more than every other choice in this doc.

---

## Part 2 — IP posture: publish, don't patent

### Patents: no

Three reasons stack, and any one is sufficient.

- **Cost.** A real software patent runs $15–30k through issuance and
  takes two to four years. Attorney drafting dominates; micro-entity
  USPTO fees are trivial by comparison.
- **§101.** Since *Alice v. CLS Bank* (2014), software claims die as
  abstract ideas. Rules for organizing human activity — which is what
  most of the interesting design *is* — are the most reliably rejected
  category there is.
- **The door is already mostly shut.** Most of the world requires
  **absolute novelty**: any public disclosure before filing ends
  patentability, no grace period. That is gone for everything published.
  The US grace period is one year from the author's own disclosure, and
  the repo has been public since 2026-01-14 (first commit 2026-01-11).

### ⭐ Publishing *is* the defense

Patents require novelty, and novelty is destroyed by prior public
disclosure. A public repo with ordered timestamps is textbook **prior
art**: every design published in `docs/` is now unpatentable by anyone,
permanently, including us. This is a recognized strategy (defensive
publication) that the project has been executing by accident since
January.

Two honest limits:

- Prior art is not self-executing. Examiners search patent databases and
  academic literature, not GitLab. A bad patent can still issue, and
  invalidating one costs six figures. Prior art makes you *win*; it does
  not make you not get sued.
- ⚠ **A private repo creates no prior art.** Repo visibility is a
  load-bearing IP decision, not a preference. It is currently public.
  Keep it that way.

### What the AGPL already does

**AGPL-3.0 §11 is an explicit patent grant** with a retaliation clause:
contributors license their patent claims to downstream users, and
asserting a patent against a user over the covered work terminates the
asserter's own license. MIT and BSD have *no* patent grant at all. The
license choice already bought what people normally pay lawyers for.

### The Compact specifically

It is the least vulnerable artifact in the project, and vulnerable in a
way IP law does not address.

- **Not patentable** — a governance structure is a method of organizing
  human activity; *Alice* step one.
- **Not ownable as a system** — 17 USC §102(b) and *Baker v. Selden*:
  copyright protects the expression, never the system it describes. The
  prose of `measurement.md` is copyrighted on authorship. The *idea* of
  three entrenchment tiers is free to the world on publication, and no
  filing anywhere changes that.

⭐ **The real risk is not enclosure but a defanged fork** — someone takes
the design, strips the A-tier commitments that cost money, and ships it.
That is legal and nothing prevents it. Trademark stops them using the
name; AGPL §13 forces them to publish the modified source because they
run it as a network service. Neither prevents the fork.

**And that is the design, not a gap in it.** `measurement.md` says tier B
is amendable by whoever ships the code and the AGPL is the check — the
check it provides is **daylight, not prevention**. A defanged fork must
publish its own defanging. Same posture as the resilience doctrine:
friction and visibility, detect evasion rather than prevent it.

### Trademark, when it matters

The USPTO fee is roughly $350 per class, and a platform plausibly wants
Class 9 (downloadable software), 41 (entertainment/online games), and 42
(SaaS) — so three classes is over $1,000 in government fees before any
attorney.

⭐ **Spend it on Saxonberg, not on the studio name.** Saxonberg is
arbitrary and distinctive: a strong mark that registers easily. A studio
name that puns on two heavily-registered marks is a weaker mark and a
plausible §2(d) likelihood-of-confusion refusal in exactly the class you
would want. This is not a reason to rename anything — state entity names
clear a far lower bar than federal marks, and holding companies commonly
carry names nobody ever registers. It is a reason to aim the budget at
the product.

Common-law rights arise from use in commerce for free. Pre-launch, the
domain plus actual use carries most of the protection.

### Cheap things worth doing

1. Keep the repo public. Already true; highest value of anything here.
2. A **DCO** sign-off line if outsiders start contributing — free, no CLA
   ceremony, and it keeps the copyright chain clean for the assignment
   in Part 1.
3. **Technical Disclosure Commons** (free) for anything genuinely novel,
   which puts prior art where examiners actually look.
4. **OIN** and **LOT Network** membership — both free at this scale, both
   worth ten minutes *once there is revenue*. Neither is urgent.

---

## Part 3 — Could the capital chamber be real equity?

Not crazy. Expensive, slow, and mostly legal-shaped. The barriers, in
the order they bite:

**Howey, immediately.** Capital standing is currently not a security
because there is no profit expectation. Real equity is a security by
definition — no analysis required, and the whole apparatus attaches at
once.

**Issuance is solved.** This is the part everyone assumes is impossible.
**Reg CF** (JOBS Act 2012, live 2016) permits equity sales to
non-accredited strangers — roughly $5M per twelve months, through a
registered portal, on a Form C, with annual Form C-AR reporting.
Realistic cost is 5–7% to the portal plus $5–20k in legal and
accounting; financial-statement burden scales with raise size, from
officer-certified through CPA-reviewed to audited. **Reg A+** is the next
rung (up to ~$75M, audited financials, ongoing reporting, $50–150k).

⭐ So *"if we were allowed to try"* has an answer: **we are, and have been
since 2016.** The carve-out exists because somebody already made this
argument and won.

**Then §12(g), which nobody sees coming.** At $10M in assets and 2,000
holders of record (or 500 non-accredited holders), a company becomes a
full Exchange Act reporting company — 10-Ks, 10-Qs, proxy rules, SOX.
That is a seven-figure annual load. Rule **12g-6** conditionally excludes
Reg CF securities from the holder count if the issuer stays current on
its annual reports, uses a registered transfer agent, and stays under
$25M in assets. Real, and narrow.

⚠ The other common dodge is a **crowd SPV** — thousands of investors hold
interests in one vehicle that occupies one line on the cap table. Clean
legally, and it **guts the design**: the SPV's manager votes, not the
members. That builds a capital chamber with one seat in it.

**Liquidity is where it actually breaks.** Reg CF shares are locked for
twelve months. After that they can trade only on a registered **ATS**,
which is thin, costly to list on, and not ours to control. Running our
own venue means becoming a broker-dealer or an exchange: FINRA
membership, net capital, AML/KYC, mid-six-figures minimum.

> ⭐⭐ **The capital chamber can never have a live order book inside the
> game.** That is not a constraint to engineer around; it is the
> definition of a regulated market.

⚠ **Tokenization does not help.** A tokenized security is still a
security (the DAO Report, Telegram, LBRY). Wyoming's DAO LLC and Utah's
LLD solve *entity and liability*, not securities — a different problem.

### The ladder

1. **Now, ~$0** — non-economic governance units in the operating
   agreement. No economic claim means no profit expectation, which very
   likely means not a security at all. ⭐ **This is the thing actually
   wanted**: the capital chamber's interesting property was never the
   dividend, it was that the vote binds. A binding vote costs a
   well-drafted operating agreement.
2. **On revenue** — convert to a Delaware PBC, multi-class stock, a Reg
   CF round with a real transfer agent and the 12g-6 exclusion.
3. **Liquidity** — an ATS listing eventually, maybe. Never our own book.
4. **Endgame** — a perpetual purpose trust, so the win cannot be sold.

---

## Part 4 — The unwaivable floor, and why it does not threaten the Compact

For a Delaware corporation the genuinely unwaivable core is four things:

| Floor | Source |
|---|---|
| Don't defraud | Rule 10b-5; Exchange Act §29(a) voids any waiver |
| Duty of loyalty | §102(b)(7) exculpates *care* only — never loyalty, bad faith, or improper personal benefit |
| Books and records | DGCL §220 inspection survives any charter provision |
| Somebody gets elected | §211 annual meeting; §141(k) removal |

Everything else is private ordering — Delaware is famously enabling.
Non-voting classes, class-specific vetoes, supermajority locks, tracking
stock: all available.

⭐ **None of the four fight the thesis.** Don't lie, don't self-deal, show
your books, let people choose representatives — a Compact that could not
survive those would be a bad Compact. The friction with real equity is
**overhead** (reporting, transfer agency, audits), which is a cost
problem, not a values problem.

**The PBC is the load-bearing piece.** DGCL §§361–368; §365(b) states
that directors do not breach duty by balancing pecuniary interest
against the stated public benefit. Without that wrapper, a director who
honors an A-tier commitment at the expense of returns is personally
exposed. With it, they are doing their job.

⚠ The residue that is **imposed rather than chosen**: shareholders get
statutory rights no constitution can waive (inspection, appraisal,
derivative suits, votes on mergers and charter changes), and directors
carry duties the Compact cannot override. A real-equity version has a
thin legal layer above everything whether or not one is designed. The
PBC is how that layer is made thin and aligned. **It is not a second
jurisdiction** — see Part 8.

---

## Part 5 — Forward-compatibility: exactly one thing

Mostly **do not build for this**. Speculative compatibility code is junk
by the project's own standing rule, and this is a contingency that may
never be taken.

⭐ There is one property that is free now and impossible to retrofit:
**keep the provenance of standing separable.** If capital standing is
ever collapsed into one undifferentiated scalar blending patronage,
contribution, and governance weight, it can never afterward be split
into "this portion is a security and this portion is not." You would be
unwinding a number with no seams.

**This is already solved by accident.** Everything is event-sourced —
`renown_events`, `participation_events`, `producer_events`,
`disposition_events` — and derived on read. Provenance is inherent to
that architecture.

> So the whole of the forward-compatibility work is a prohibition:
> **never collapse the event ledgers into a stored total as an
> optimization.** The derive-on-read discipline *is* the forward
> compatibility.

The second retrofit that would hurt is identity — securities require
knowing who holds them, and a pseudonymous polity cannot issue to
pseudonyms. Identity providers are already modeled as login providers,
so a seam exists. Do not build more than that.

---

## Part 6 — How invariant are these invariants?

Much less than they look, and the history cuts our way.

- ⭐ **Adam Smith was on this side.** *Wealth of Nations* Book V argues
  joint-stock companies with hired managers will be badly run, since
  managers "being the managers rather of other people's money than of
  their own, it cannot well be expected that they should watch over it
  with the same anxious vigilance." The principal–agent problem, stated
  two centuries early, as an argument *against* the form.
- **The unconstrained corporation is the anomaly.** For most of the
  modern era corporations were **special charters** — granted by a
  legislature, for a stated public purpose, revocable, time-limited. The
  Bubble Act banned unchartered joint-stock companies from 1720 to 1825.
  General incorporation statutes are mid-19th century; Delaware's is
  1899. Limited liability arrived unevenly enough that California had
  proportional shareholder liability until 1931.
- **Shareholder primacy is a norm, not a law.** *Dodge v. Ford* (1919) is
  a Michigan decision modern Delaware courts rarely follow; the business
  judgment rule gives boards enormous latitude. Friedman's 1970 essay
  did more to establish primacy as an expectation than any court did as
  doctrine.
- **Federal securities law is ~92 years old** — the '33 and '34 Acts are
  direct scar tissue from 1929; blue-sky laws start with Kansas in 1911.

⭐ **And it is still moving toward us.** Maryland's PBC statute is 2010,
Delaware's 2013, now 40+ states. Reg CF went live in 2016 and its cap
rose from $1M to $5M in 2021. Steward-ownership structures are gaining
recognition. People have been saying *maybe there is a better way* for
fifteen years and the law has been slowly agreeing.

⚠⚠ **The one genuinely invariant thing is not legal at all: capital is
mobile and goes where it is less constrained.** No charter fixes that.
The only answer is the one the design already gives — **the constraint
has to be the product.**

## Would it actually hold up? The evidence, both directions

The honest baseline first: **a constrained firm loses to an unconstrained
firm whenever the constraint is not also the product.** In a commodity
market, caring about a second thing is a handicap, and the co-operative
movement's record in tech is mostly failure — Resonate, Diaspora, Ello.
Any version of this thesis that skips that sentence is selling something.

The exception is narrow and worth understanding exactly, because it is
the whole bet:

- ⭐⭐ **Vanguard** is the cleanest case in existence. It is owned by its
  own funds — i.e. by its customers — which is why it can run at cost,
  which is why it won the largest asset-management market on earth. **A
  competitor structurally cannot copy it without dissolving itself.** The
  ownership structure *was* the moat, not a constraint on one.
- **Stocksy** — artist-owned photo co-operative, real revenue, works. The
  small version of the same argument.
- **Green Bay Packers** — community-owned for roughly a century.
  Grandfathered and unrepeatable in its own league, but social proof that
  the *shape* holds together over long time horizons.

For us the "constraint is the product" case is at least arguable: we sell
a governed world to people who want to be governed well, and a competitor
who strips the Compact is selling a different, worse thing. That is the
claim [positioning.md](./positioning.md) is careful to state as ambition
rather than fact.

### ⚠⚠ The failure mode is winning, not losing

The historical pattern is not *constrained firm gets outcompeted*. It is
**constrained firm succeeds and then converts** — every mutual insurer
that demutualized, every co-operative bank that IPO'd, with Craigslist
staying private as the conspicuous exception.

The pressure never comes from competitors. It comes from inside, the
moment someone can capture the accumulated value. **Which is the entire
reason the ladder in Part 3 ends at a perpetual purpose trust**: not to
make selling out unwise, but to make it impossible.

### The literature, and one actionable note

This has a name — **exit-to-community (E2C)** — and a body of work behind
it, principally **Nathan Schneider's**. Worth reading before any of Part 3
is acted on.

⭐ Schneider is already on the parked manifesto-outreach list. *"I am
building a thing and thinking about E2C structure"* is a materially
better approach than a manifesto pitch, and it is the one question in
this document where the right expert is already a known contact.

---

## Part 7 — Does the Compact hold when a chamber has a financial stake?

Under patronage, voice is the **end**: you pay, you are heard, the
transaction closes, and interests align because nothing sits downstream
of the vote.

Under equity, voice becomes a **means**. If profit comes from selling
scarce content at a premium, the capital chamber acquires a direct
interest in making content scarcer and pricier — the shareholders' vote
and the players' interest diverge exactly where the money is. That is
not hypothetical; it is the whole history of live-service monetization,
with a formal mechanism attached.

⭐ **The design's answer is that the equilibrium is tripartite, not
bipartite.** Capital may want scarcity, but capital does not build
anything. Makers do, they have their own preferences, and their standing
is issued by something other than capital. This is roughly why craft
guilds constrained merchant capital and why open-source projects resist
enclosure: the people who can do the work have exit, and their
reputation is not issued by the funder.

⚠⚠ **The load-bearing assumption is that standing must not be purchasable
by capital, directly or indirectly** — which is already named as the
ballgame in the standing-mint slate. The leak is not the obvious one:

> **Capital does not need to outvote labor. It needs to select labor.**
> It funds the conditions of making — tools, workshops, the practicum,
> commissions — and over a long enough run the median maker preference
> drifts toward whoever got funded. No vote is ever lost. This is how
> regulatory capture actually works: not bribery, career pipelines.

⭐ **The counter is already in the design: standing is a rate, not a
total.** A capital-selected maker must keep being chosen by somebody to
stay high-standing. If the quantity driving that rate is consumer
reception rather than patronage, the selection loop closes against
capital. **That property is more load-bearing than any entrenchment
clause**, and protecting it is the real work.

### Delegation, and the constituency that is not in the room

Liquid delegation is a better answer to apathy than most, with one known
failure: **delegation concentrates**. The German Pirate Party's
LiquidFeedback produced super-delegates holding enormous proxy weight,
and it became the scandal that helped end the experiment.

That is survivable — a concentrated delegate is at least revocable,
which apathy is not. But the realistic equilibrium of liquid delegation
is **a professional delegate class**: representation rebuilt, with
instant recall. Genuinely better than a legislature; just worth knowing
it is the attractor, because it means a consumer caucus is not a
supplement to delegation, it is what delegation becomes.

⚠⚠ **The harder problem no mechanism touches: the priced-out consumer is
not in the room.** Activist consumers in any game community skew toward
high-hours, high-spend players. Someone driven off by scarce, costly
content does not join a caucus about it — they leave, and leaving is
what removes them from the franchise. The consumer bloc will
systematically advocate for the wrong consumer, in perfectly good faith.
Selection on the dependent variable, and delegation cannot fix it
because you cannot delegate a vote you no longer hold.

⭐ **The measurement doctrine is the likely answer, not a voting
mechanism.** The engine measures; the polity decides what it is worth.
So **publish churn** — who left, at what price point, at what content
threshold. The absent constituency gets represented by a statistic the
chambers are obliged to look at rather than by a seat. Consistent with
*the state aggregates, never reports*, and it is the only way to give
voice to people whose defining property is that they are gone.

---

## Part 8 — One engine, two configurations

⚠ **A standing jurisdiction split — company governance separate from
world governance — was proposed during this conversation and withdrawn.**
It is wrong for the consumer product: if the world is a separate
jurisdiction from the company, the world is a toy, and the gamification
thesis dies. Recorded here so it is not re-proposed.

But the *configuration axis* is real and already shipped.
`office_holders` is sparse with **founder-default holders** — absence of
a handoff **is** the autocracy. An institutional deployment simply never
hands off a seat, and the Compact runs identically. Nothing needs to be
built or conceded.

⭐ **For education, autocracy at the platform layer is required, not a
compromise.** An institution cannot let students vote on grading policy,
data retention, or access — FERPA, minors, accreditation, liability. A
school that delegated those would be doing something wrong. Students
govern the fiction; the institution governs the platform; nobody gives
anything up. **And the fiction being genuinely self-governed is what
makes it pedagogically real rather than a worksheet.**

Which reframes the institutional pitch: **the Compact is not a governance
ask, it is the curriculum.** A buyer need not believe in consumer
democracy at all — only that students learning political science by
*operating* a government, with the evidence landing in a transcript, is
worth money. That is the practicum thesis, and it is a far easier sell
than *give your customers a vote*.

### ⚠⚠ How this actually dies: disuse, not rejection

If institutional customers are the revenue, feature requests come from
institutions, and institutions want control. Five years of that and the
delegation paths, election machinery, and seat handoffs are all still in
the codebase with nothing having ever exercised them.

**This failure mode already has a precedent in this project.** `feel` and
`taste` had never once run, because no body plan granted touch — a
feature whose enabling data is absent fails closed and silent. Seat
handoff is the same shape at much higher stakes: nothing in an
autocratic deployment ever populates `office_holders`, so nothing ever
proves the handoff works.

⭐ **Mitigation, cheap and worth doing from the start: keep one deployment
where seats actually change hands, and put a handoff through CI.** Not
for the customer — for us, so the path the company is eventually going to
bet on has been executing the whole time.

---

## Part 9 — What this doc does not decide

- **Whether to take the equity path at all.** Part 0 says the gate comes
  first; this is a map, not a commitment.
- **Which state.** Home-state LLC is the default; Delaware only pays off
  with investors and adds a foreign-qualification filing.
- **When to convert to a PBC.** Coupled to the first real revenue, not
  to a date.
- **The employment disclosure sequence.** Flagged in Part 1, deliberately
  not resolved here.
