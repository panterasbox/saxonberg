# Policing slate — crime and law enforcement, from both ends

**Captured 2026-07-31**, from a Terminus design conversation. The
brief: we want law enforcement *and* a criminal element in the
fiction — for **immersion**, and to understand how enforcement plays
**from both ends** (police and criminal) for **both players and
NPCs**.

This is the institutional half. Its upstream sibling is
[enforcement-slate](./enforcement-slate.md) (modes, the evidence
firewall, testimony, the intrinsic/social split); its downstream
sibling is [prison-slate](./prison-slate.md) (custody, the three
tiers). Also rides [civics.md](../../subsystems/civics.md)
(departments as Businesses, seats as positions),
[behavior.md](../../subsystems/behavior.md) (the brains),
[belief.md](../../subsystems/belief.md),
[accountability.md](../../subsystems/accountability.md),
[chattel.md](../../subsystems/chattel.md) (why property crime is
real), [press-slate](./press-slate.md) (the other detector).

---

# Part I — Crime

## Organized vs. ordinary: the difference is governance, not violence

**Ordinary crime** is opportunistic, individual, discontinuous — no
relationship between today's pickpocket and tomorrow's.

**Organized crime is a persistent institution**, and what makes it
*organized* is that it **provides services**: protection, dispute
resolution, credit, distribution of prohibited goods, employment.

> **Organized crime is unlicensed governance.** It grows where the
> legitimate state does not reach or has abdicated, and from inside
> it looks like order.

(The real sociology — Gambetta on the Sicilian mafia as private
protection where the state failed, Skarbek on prison gangs as
governance — not a metaphor.) For a governance game this is
load-bearing:

- **Gang strength indexes state failure** in a district — a readout,
  not a spawn table.
- **Closing the governance gap beats arrests**, because the gang's
  product then has a competitor.
- It is genuinely non-obvious: most people think organized crime
  means violence; violence is the enforcement arm of a business
  mostly about **monopoly and services**.

**A gang is therefore a Business that commits crimes** — the shipped
Business Idea gives positions, roster, wages; territory it *operates
on* rather than owns; and relationships with the legitimate economy
at both ends. So **enforcement changes their economics rather than
deleting them** (patrol the corner and they move; squeeze the fence
and margins collapse), and **they recruit where there is no work** —
emergent from a real labor market and real rent, never a scripted
lesson.

## The insulation structure — mechanically true here

Both hierarchies exist to separate **the person who benefits from
the act**: street level takes the risk, the crew boss holds
territory, the boss commits no crimes at all.

**Our data model makes this true by construction**: the
accountability ledger records **acts and actors**, and the boss
performs no acts. So *"we can catch the corner, we cannot touch the
top"* **emerges** — and pushes the legislature toward inventing
something conspiracy-shaped, which is a genuine civil-liberties
dilemma (RICO-style law is powerful *and* dangerous). **A
first-rate amendment-roster entry the world will demand rather than
us proposing.**

**Investigation bites at the periphery** — the fence, the launderer,
the front business, the official on the take. That is where crime
touches the legitimate economy, and where the chain-of-title and the
ledgers can see it.

**And chattel chain-of-title is what makes property crime
interesting**: stolen goods are *identifiable*, so the criminal's
problem is not taking the thing but **laundering the provenance**.
Fencing becomes a real profession with a real risk premium;
recovered goods are returnable to a provable owner; investigators
have a thread.

## Corpos and white-collar crime

Corpos are the ideal vector: a **mark** that can be leveraged, an
approval rating that absorbs damage, and scale enough that a small
skim across many transactions is invisible. The substrates supply
the crimes — embezzlement/fraud (banking), breach and inducement
(contracts), title fraud (chattel/parcel), **wage theft**
(employment), consignment fraud (retail), attribution theft
(provenance).

**Precision worth keeping: you cannot forge the record, but you can
enter lies into it.** A false ledger entry made honestly-as-a-record
is still a lie — the testimony model applied to business records,
and most of what white-collar crime actually is.

**The deepest point: the worst corpo behavior is usually legal.**

> **Organized crime is governance without license. Corpo malfeasance
> is license without accountability.**

Gangs do illegal things because they are excluded from the legal
system; corpos do harmful things *through* it because they help
write it. So the interesting corpo crime is **regulatory** —
capturing the rules that govern you, externalizing costs onto people
who did not choose them (the honest-world thesis exactly), operating
where the law has not yet named the harm. Structural, not cynical,
and the world poses it without arguing it. *(Resonance: the moral
axis's evil pole is named **capture**; the term of art for a corpo
owning its regulator is **regulatory capture**.)*

**The detection asymmetry — different crimes need different
institutions.** Police catch what someone **saw**; journalists catch
what is **in the books**. A beat constable will never find a skim; a
reporter reading ledgers will never see a mugging. **The press is
therefore not decorative to the crime system — it is the only
detector for an entire class of it.**

**The story only this world can produce:** a reporter *computing*
total value moved by every gang theft this year against one corpo's
skim, and publishing the comparison. Impossible in reality (the data
does not exist), trivial here (the ledgers are real), and it teaches
the most counterintuitive fact about crime.

## Is crime evil, or chaotic? Neither — it is a *social* fact

The [alignment](./alignment-slate.md) model is **asymmetric**: the
vertical axis (Good─Neutral─Evil, *presence vs. capture*) derives
from **deeds**, is monist, and has a right answer; the horizontal
(Lawful─Chaotic) derives from the **governance record**, is
**god-less and pluralist**, and *both poles are Good* — "the gods
have no opinion on how you'd organize the polity."

> **Alignment is intrinsic; crime is social.** Opposite sides of the
> enforcement slate's firewall. **Crime never moves alignment
> because it is crime** — only through what the act actually did to
> people.

**Required, not merely tidy:** the design assumes localities can
legislate badly (that is what exit and Tiebout are *for*). If crime
auto-flagged evil, we would be asserting **law = morality**, which
is precisely the claim a governance game must never make.

The demonstrations:

- **Organized crime is intensely *lawful* in structure** — hierarchy,
  codes, internal enforcement — while unlawful to the polity.
  Unlawful ≠ chaotic.
- **Corpo regulatory capture is lawful and can be deeply evil** —
  entirely through institutions, squarely on the capture pole.
- **A riot is chaotic**, and its morality depends on what it does.
- **The crown case — civil disobedience**: breaking an unjust law
  openly and accepting the penalty is *a crime*, is *good* (it
  undoes capture), and is arguably **lawful in stance** (engaging
  the governance record publicly to change it). One act, three axes,
  all independent.

**So: sometimes either, sometimes neither, and the world declines to
answer for you.** You can break the law and be good; you can obey it
and be evil.

---

# Part II — Police

## The aesthetic arc — each mode is an argument

| Mode | Aesthetic | Argument |
|---|---|---|
| **The watch** (medieval) | a neighbor with a lantern; hue and cry | **policing is everyone's duty** — amateur, communal, unpaid |
| **Thief-takers** (17th–18th c.) | a mercenary who recovers your goods for a fee | **policing is a market** — famously corrupt |
| **Peelers** (1829) | uniformed, salaried, *identifiable*, mostly unarmed, preventive | **policing by consent** — "the police are the public and the public are the police" |
| **Detective bureau** (mid-19th) | plainclothes, investigative | controversial *because* plainclothes reads as secret police |
| **Motorized professional** (20th) | the patrol car, response-time metrics | efficiency — and the moment police **left the neighborhood** |
| **Militarized** (late 20th–) | armor, surplus gear | the public as a threat environment |

**Terminus is Peelers** — not for period flavor, but because that
aesthetic *carries the argument we want interrogated*: consent,
minimum force, prevention over detection, deliberately identifiable
rather than secret. The credential-locked sidearm as an **escalation
rather than a default** (per [ranged-slate](../tails/ranged-slate.md)) is
the same design, on the street.

**"Everything in between" is the Tiebout axis** — other modes become
**other localities**: the frontier runs the hue and cry, a corpo
enclave runs thief-takers (private security paid by the protected),
an authoritarian district runs plainclothes. Players feel the
difference by walking between them.

## What "police" encompasses (a bundle nobody knows is a bundle)

1. Patrol / presence · 2. Response · 3. Investigation · 4. Custody ·
5. **Order maintenance** · 6. **Service** · 7. Regulatory inspection

**5 and 6 are most of it.** Most police work is not crime — it is
order and service. The biggest thing cop shows get wrong, and free
realism *and* free pedagogy: a constable whose day is mostly an
argument over a stall boundary is truer and more interesting than
one hunting murderers.

**What is NOT in the bundle:** prosecution (a separate office with
separate discretion), judgment (sortition juries), confinement (the
prison). Separation of function *within* the executive. And **item 7
links to the press slate** — the instrument certifier is police
work, which broadens "police" into *the executive's enforcement arm
generally*.

## Organization

Civics already carries **`departments` as Business templatePaths**
and **seats as employment positions**, so a watch is literally a
Business with a roster:

- **Constable** — beat, presence, first response *(the one players
  meet)*
- **Sergeant** — assigns beats, supervises, first-line discipline
- **Inspector** — investigation; inherits the plainclothes
  controversy
- **Market inspector** — the regulatory arm
- **Commissioner** — policy, **answerable to the committee or mayor**

## The aesthetic target — the constable you know by name

The Peelian ideal, the opposite of the anonymous patrol car, and in
a text world with per-viewer belief and recognition it is genuinely
achievable: a named officer who knows your face, greets you, and
notices when something is off. **Policing as a relationship rather
than an encounter** — which is exactly what makes the authoritarian
contrast (anonymous, masked, unaccountable) legible.

**Assemblable from shipped brains today:** `patrols` + `wary` +
`greets` + `introduces`, plus the `sentry` use-of-force ladder from
the ranged slate.

---

# Part III — The commissioner ↔ committee policy hook

**The centerpiece, and the hook already exists, deliberately
inert:** the civics `Government` carries **`charter` — a
document-store path, *"pointer only in v1: nothing reads it yet, no
StoredDocument is seeded — deferred."*** Use-of-force policy is what
makes the charter **readable**, and it is the charter's first
consumer.

## Three tiers — and the middle one is the pedagogical prize

| Tier | Sets | Violating it means |
|---|---|---|
| **Kernel** | what is physically possible | nothing — it is physics |
| **Law** (locality legislation) | what is **permitted** | a **crime** → the courts |
| **Policy** (the commissioner's order) | what is **instructed** | a **job matter** → discipline, dismissal |

**"Legal but against policy" is a real category almost everyone
conflates**, and it is where most actual police accountability
happens — breach policy without breaking law and you are fired, not
charged. It also lets a department be **stricter than the law
allows**, which is true of real departments and is how a
commissioner exercises leadership.

## The mechanism: resolve-on-read, never push

Policy must **not** be baked into brain config. The brain
**resolves the governing policy at act time** — the same shape as
`formationPathOf` and the jurisdiction coverage walk: resolve where
I am → find the government → read its charter → get the policy in
force.

- **Change the policy and the next beat differs** — no migration, no
  respawn, no pending state. *That* is "watch legislation become
  street behavior," and it is the shipped derive-on-read discipline
  doing the work.
- **Different districts police differently by construction**,
  because policy resolves through the same longest-prefix chain as
  jurisdiction. **Tiebout at neighborhood scale.**

## The policy vocabulary (small and closed, because it must execute)

| Field | Sets |
|---|---|
| **`escalationCeiling`** | how far up the sentry ladder (presence → voice → hands → less-lethal → lethal) an officer is authorized to go |
| **`stopThreshold`** | what belief-state justifies stopping someone |
| **`searchAuthority`** | may they search, and on what |
| **`pursuit`** | do they follow across a boundary |
| **`dutyToAid`** | must they render aid after force |
| **`reporting`** | what must land on the ledger |

**`stopThreshold` is the sharpest dial in the whole design.** Belief
is already per-viewer and graded, so a policy can say *"stop someone
you believe committed a crime"* or *"stop someone who looks out of
place"* — **literally the reasonable-suspicion debate, as a number
the committee sets.** Lower it and clearance rises **and innocent
players get stopped.** Nobody has to argue about stop-and-frisk; the
district that adopts it feels it, including the people who voted for
it.

## The loop — every link shipped or designed

> **committee → appoints commissioner → issues policy → constables
> resolve it → acts land on the accountability ledger → press /
> courts / committee read the ledger → law changes or the
> commissioner is replaced.**

Two details that make it real:

- **The record carries the policy version in force at the time**, so
  review asks *"was this within policy as it stood?"* — which makes
  retroactive policy changes visible instead of laundering them.
- **The ledger exposes the gap between written policy and actual
  practice.** How often did constables escalate past the ceiling?
  **Computable**, a press story, and the thing that most often stays
  invisible in reality.

## Failure modes to build for

- **The commissioner who will not discipline** becomes the
  committee's problem — which requires the committee to *notice*,
  which requires someone reading the ledger. (Why the press is not
  decoration.)
- **The captured committee** writes policy for whoever bought it.
- **Civilian review** — does the polity create an oversight body
  independent of the department? A live real-world argument, and a
  first-rate **amendment-roster module**, because both
  configurations would genuinely behave differently here.

---

# Part IV — Dynamics and pedagogy

## The dynamics that fall out

- **Presence deters, and crime *displaces*** — patrol the square and
  it moves to the alley. Emergent, and it teaches that enforcement
  relocates crime before it reduces it.
- **Response time is geography** — safety becomes a map, and that
  map is a budget decision.
- **Familiarity is an information advantage** — the constable who
  knows the neighborhood has better belief-state, mechanically.
- **Over-policing is a real, felt cost** — high patrol density and a
  low stop threshold means *innocent players get stopped*. The
  tradeoff made visceral rather than argued, and the honest
  counterweight to "more police = more safety."

## The pedagogy — what everyone learned from cop shows

The misconceptions worth targeting, in order of damage:

1. **Clearance rates are high.** On TV crimes get solved; in reality
   most never are — and the evidence firewall makes that honest: no
   witness, no trace, no case.
2. **The suspect is the perpetrator.** Our belief system produces
   **honest misidentification naturally** (the hooded figure at
   dusk), so sometimes the obvious suspect simply did not do it.
3. **Rights are obstacles.** Cop shows frame warrants and process as
   friction the hero routes around.

> **The thesis: you learn why rights matter by needing them.**
> Because honest error is a real category here, **players will be
> wrongly suspected** — accused by a witness who genuinely believed
> it. The first time that happens, due process stops being civics
> homework and becomes the thing between you and a sentence you did
> not earn. No lecture does that.

Two more: **most crime is property crime, not violence** (what the
petty-crime texture layer should reflect), and **prosecutorial
discretion is where the real power sits** — who gets charged is a
choice made by a person, under-understood precisely because it is
undramatic. Here it would be an office with a name and a record.

## Rails (standing)

- **Petty crime against players must be recoverable** — a pickpocket
  taking coin is texture; a pickpocket taking a masterwork blade
  teaches people to carry nothing. NPC petty crime targets the
  fungible, never the precious.
- **The meta guardrail stands**: in-fiction crime is in-fiction;
  harassment is an account matter, always
  ([prison-slate](./prison-slate.md)).
- **Consent is geographic** — the city is policed, the wilds are
  not; danger is authored geography
  ([ranged-slate](../tails/ranged-slate.md)).
- **"Wanted" is belief, never a flag** — see below.

## Open questions (for requirements)

1. **"Wanted" as belief** — the design position is that there is no
   global wanted state: *specific people believe you did it*
   (per-viewer, foggy, evadeable by disguise, decaying, clearable by
   acquittal). Needs its exact shape — how belief spreads between
   officers, and what "cleared" does to it.
2. **The charter document schema** — how policy is authored in the
   CMS, versioned, and rendered readable to players (posted law is
   a hard requirement per the enforcement slate).
3. **Prosecutorial discretion's home** — is charging an office, and
   who holds it?
4. **Gang content shape** — territory representation, the fence's
   mechanics, the recruiting pipeline, and how a gang's "business"
   is expressed without becoming a quest-giver.
5. **Civilian review module** — the amendment's exact powers
   (subpoena? binding findings? budget?).
6. **The order-maintenance loop** — the constable's actual day, since
   it is most of the job and none of the drama.
7. **The charter petition** — what a gang must show to be chartered,
   who decides, and what regulation attaches on the other side.
8. **Credential-to-serve** — whether the policing Discipline is a
   hiring requirement, and at what band; the staffing-vs-training
   tradeoff is the committee's.
9. **Whistle response mechanics** — how many constables answer, from
   how far, how fast, and whether a false whistle is an offense (it
   should be).
10. **Restraint and arrest** — the actual custody handoff into the
    prison slate's intake, and what a resisted arrest looks like
    without becoming a damage race.

---

# Part V — The Gray: a worked gang, in a real district

> ⭐⭐ **BUILD DECIDED 2026-09-03** (the threat-model pass). The Gray is
> the realm's answer to *where is there real risk* — and the answer is
> **economic, never violent**, per the locked constraint below. Two things
> came out of that pass and belong here:
>
> **1. ⚠⚠ Its substrate gate is the LENDING TIER, which is unbuilt.** The
> credit loop is the engine — *no bank access → the gang lends → you cannot
> repay → you work it off → the shakedown corner is where collection
> happens* — and the Counting-Houses will not lend to a flophouse resident
> with no standing. Banking ships two-tier money, custodial banks and
> settlement; **lending is deferred.** Without it the Gray is a district
> with a mood and no mechanism. Every locality pulls exactly one piece of
> substrate (Rejection the `stocks:` fix, Hinkley `knock`, Heart's Delight
> **winter**) — ⭐ **the Gray pulls lending.**
>
> **2. ⭐⭐⭐ Exclusion and the Gray are one system from two ends.** The
> threat pass made *exclusion* an explicit sanction (a declaration by an
> authority over a parcel extent — see
> [settlement-model.md § 9](../../settlement-model.md)). Someone excluded
> from the legitimate economy still needs **credit, work, protection and
> arbitration** — precisely the four services this outfit sells. So:
>
> > **Every exclusion creates a customer for the gang.**
>
> Which is the same shape as the enforcement-dynamics table below already
> has (*squeeze the fence → worse for residents*). **The two builds want to
> land together**, and neither should be scoped without the other.
>
> ⚠ And exclusion is constrained so it stays in this register: it may
> refuse **service · shelter · trade · employment**, and may **never**
> touch presence or speech — *the aether reaches everywhere.*
>
> **3. ⭐⭐⭐ WAREHOUSES SHRINK THE GRAY — and whoever scopes this build
> needs to know it.** `freight-slate`'s warehouseman is a **bailee** who
> **issues a receipt**, and *a warehouse receipt is a document of title* —
> therefore **collateral.** The credit loop below turns entirely on the
> Counting-Houses refusing to lend to a resident with *"no standing and no
> collateral"*; receipts hand the legitimate economy a way to lend to
> precisely those people.
>
> That is this slate's own enforcement table — *"open credit access → the
> loan business collapses"* — arriving as a **shipping decision rather than
> a thought experiment.** ⚠ So the freight build is not adjacent to the
> crime build: **it is a lever on it**, and building warehouses without
> intending that is how the Gray gets accidentally defunded.
>
> Full chain: [settlement-model.md § 11](../../settlement-model.md) +
> [venue-and-supply-slate § 6c](./venue-and-supply-slate.md).

**The district is already authored for this.** From
[terminus-city.md](../../staging/terminus-city.md) §3:

> **The Gray** — shady edge (poor/informal, not lethal):
> fence/pawnshop, flophouse, manhole/dead-drop (underground seam),
> shakedown corner. *gray economy + underground.*

With a **locked constraint** that shapes everything (§1): *"danger is
economic/social — shakedowns, the corpo squeeze, the Gray — not
lethal. Lethal combat faces outward."* **This is not a mob of
murderers.** It is a business whose pressure is financial and social
— the harder and better version.

**And the governance gap is the city's own premise:** Terminus was
built by people who wanted no governance, and the young polity is
*retroactively* trying to govern it. So the Gray is not a district
where the state **failed** — it is one the state **has not reached
yet**, and the gang got there first. The state's arrival is a live
conflict, not a restoration.

## What the gang sells — four services the city doesn't provide *there*

1. **Protection** — the watch's beat does not cover it.
2. **Arbitration** — nobody hauls a stolen barrow across the water to
   the Forum.
3. **Credit** — *the engine*. The Counting-Houses will not lend to a
   flophouse resident with no standing and no collateral. The gang
   will.
4. **Work** — when you cannot get on at the dockers' hall, the Gray
   is what is hiring.

**The credit loop is the economy in miniature:** no bank access → the
gang lends → you cannot repay → you work it off → **the shakedown
corner is where collection happens.** And note where that lands:
**debt you work off is the test case for the "no irrevocable
contract" amendment** (the 13A gap in the walk). *The gang does not
merely live in the constitutional gaps — it manufactures the
constitutional question.*

## Roster, and the periphery where it touches the legitimate world

Street level (collectors, lookouts, runners) takes the risk; a corner
boss holds a block; **the top commits no acts** — and per the
ledger's shape that insulation is *real*, not narrative.

The interesting people are the **periphery**, most of which the
district already lists: **the fence/pawnshop** (laundering provenance
— the chattel chain is their actual problem), **the flophouse
keeper** (sees everything, says nothing), **a constable on the
take**, and one worth adding — **a clerk in the Counting-Houses** who
moves money that should not move.

## Predator *and* instrument (the nuance that makes it good)

The gang squeezes the Gray's residents. It also does **the corpos'
deniable work**, and Terminus supplies the thread: **the dockers'
hall is at Wharfside.** A corpo that wants a strike broken does not
send its own security — it hires muscle from across the way.
Historically exact (the docks, the Pinkertons), it binds **labor,
corpos, and crime into one story**, and it refuses the lazy reading:
the gang is not only poor people preying on poorer ones, it is **the
deniable arm of people with towers in the Counting-Houses.**

Three-way corpo relationship: some **use** them, some **prey** on
them (the squeeze), and the Terraces' private-security HQ
**competes** with them.

## Enforcement dynamics — including one counterintuitive result

| Pressure | Result |
|---|---|
| patrol the shakedown corner | collection **moves indoors** to the flophouse |
| arrest street level | **replaced next week**; the boss untouched |
| **squeeze the fence** | ⚠ **worse for residents** — cash flow drops, so debt collection gets harsher |
| open credit access to the Gray | **the loan business collapses** |
| reform docks hiring | **recruitment dries up** |

> **Enforcement displaces. Governance dissolves.**

The third row is the one to design for, because it is the real
lesson: **well-meaning enforcement can worsen life for exactly the
people it is meant to protect.**

## Five ways to play it, all live

- **Resident** — the shakedown, the loan offer, protection that
  genuinely works. Pay, resist, report, or join.
- **Criminal** — collections, fencing, working off debt, climbing.
  The actual gameplay is managing **belief** (who saw you) and
  **provenance** (laundering the chain).
- **Constable** — patrol, investigate, and the discretion question
  with no clean answer: *do you charge the collector who is working
  off his own debt?*
- **Journalist** — the corpo link is the story; follow the deniable
  muscle back to whoever hired it.
- **Legislator** — the gang is an argument *for* something: more
  watch, a credit union, docks hiring reform. Each a real policy
  with real and different effects.

**And the honest bit underneath: from inside, the gang is the
employer of last resort.** People join because it is the job
available — which our alignment model handles correctly, since crime
does not move the moral axis. **A collector who never hurts anyone
and a collector who breaks fingers are doing the same job with
different souls**, and the world can tell the difference even when
the law cannot.

**Naming** is the owner's (the staging doc marks district names
provisional). Directions that fit: the **fog off the confluence**
(the city's signature) or the **manhole/dead-drop seam**. Historically
these outfits are named *by other people* — after a street or a boss
— and rarely call themselves anything grand.

---

# Part VI — Disciplines, guilds, and the kit

## A guild is chartered; a gang is not

**That is the entire difference**, and it maps exactly onto
*unlicensed governance*: a gang is a guild nobody chartered — or one
that was **denied** a charter. (Guilds are *chartered-not-derived*
per the guild slate, which is what makes this clean.)

**Which produces the best piece of gameplay in the area: the Gray's
outfit can petition for one.** A "dockworkers' benevolent
association," a "mutual aid society" — historically exactly how this
went. Charter them and they are regulated, taxed, and answerable;
refuse and they stay outside, unchanged, and now with a grievance.
**No clean answer, which is what makes it a real vote.**

## Policing is a Discipline; crime is not

**Policing: yes**, by the study.com test (criminal justice is among
the most common online degree programs, assessments included). And
that is not a technicality — it *is* the professionalization
argument: Peel's reform was about making policing a profession
rather than a rotating duty. So the Discipline's existence is the
reform, and it hands the committee another dial: **may the credential
be required to serve?** Requiring it means better-trained and
harder-to-staff; waiving it means a watch drawn from the
neighborhood. Both are real positions — another Tiebout axis.

**Crime: no — and there must not be one**, for the same reason crime
does not touch alignment: **crime is a legal status, not a skill.**
What exists are **dual-use competences**:

| Competence | Serves |
|---|---|
| **stealth** (shipped) | the thief *and* the scout |
| **lockcraft** | the burglar *and* the locksmith |
| **forensics / records** | the detective, the auditor, *and* the forger |
| **appraisal** | the fence *and* the honest broker |

Nobody's transcript says "criminal." It says what they can **do**,
and the law says whether this use was permitted — the
intrinsic/social split holding at the competence layer.

**And it gives guilds a real function: gatekeeping dangerous skill.**
A locksmiths' guild controls who learns what burglars need — a
genuine historical guild role, an obvious lever for the
[instrumentation slate](./instrumentation-slate.md)'s certification
thread, and a fine source of conflict when the guild refuses
someone.

## The levelling mechanic — police don't need to win, they need to not lose

**The reframe that solves "how do guards constrain very powerful
players":** a constable who survives thirty seconds and gets a
whistle off has done the job *completely*. That converts every
encounter from a stat check into a **clock**, and clocks do not care
how powerful you are.

> **You are not fighting a constable. You are fighting the response
> time of a department.**

**The whistle is the mechanic, and it is already shipped** — the
Audible push (the University Avenue referee whistle, ~110 dB,
carrying rooms away with directional arrival), now with the
distance-honest falloff from the [ranged slate](../tails/ranged-slate.md).
Beat the guard and you have accomplished nothing except starting a
timer in a district where every other constable knows the direction.
Peelian-authentic (the Met's whistle predates the radio and did
exactly this), it makes *response time is geography* mechanically
real, and **it scales against any power level because it is not a
contest.**

## The kit — denial, not damage

| Item | Counters | How |
|---|---|---|
| **whistle** | everything | summons; starts the clock |
| **restraints** | the fight continuing | the arrest mechanic — custody, not damage |
| **net / less-lethal** | raw power | **a net does not care about your hit points**; restraint conditions do not scale |
| **lantern** | concealment | light defeats hiding (shipped substrate) |
| **shield** | ranged and reach | portable cover |
| **suppression** | casters | magic's own suppression seam |
| **the uniform** | ambiguity | **not armor — identification**; the authority signal belief reads |
| **the warrant credential** | escalation | authorizes force; unlocks the sidearm |

Plus **coordination**: guards run formations and most players do not.
The `vanguard` shape (screen + interception) is precisely how three
constables handle one very strong person **without anyone being a
damage sponge**.

**And the real deterrent is not the encounter — it is the
aftermath.** You can win the fight and lose everything: witnesses,
belief-state, a name on the ledger, a district where the constable
knows your face. That is the actual power of the state, and it costs
**no combat balance whatsoever**.

**The criminal's kit is the mirror image** — hood and dark clothes
(concealment/disguise), picks and a pry bar, something to *carry
loot in* (encumbrance is real), and a fence relationship that is not
gear at all. The symmetry is the point:

> **The criminal's gear is about not being seen. The constable's is
> about summoning and stopping. Neither is about damage.**

Crime is a **perception-and-tempo game from both ends**.

## Aesthetics — multi-genre without incoherence

**Function is universal; skin is local** — the kit is a set of
*capabilities* with per-locality manifestations, the same thinking
as the pack-seams capability vocabulary:

| Function | Skins |
|---|---|
| **summon** | brass whistle · signal horn · aether alert · flare · a rune that flashes |
| **restrain** | cord · manacles · a binding sigil · a stasis cuff |
| **less-lethal** | baton · net · stun rod · sleep dart |
| **illuminate** | lantern · torch · lamp |
| **identify** | uniform · tabard · badge · armband · a visible mark |

**(User, 2026-07-31: the game is explicitly and aggressively
multi-genre — a medieval guard with a laser pistol is not out of
bounds artistically; but not every area welcomes anachronism, and
that is a content decision.)** So the **anachronism policy is a
locality content decision**, exactly like every other local
variation. Two things fall out that make it better than merely
permitted:

- **Kit tech level becomes legible district character.** You read a
  neighborhood by what its constables carry — the Aevex Quarter's
  watch in augment-era gear, the Gray's with a stick and a horn.
  Environmental storytelling with zero prose.
- **The kit is a budget line.** The committee buys it, so
  **equipment disparity between districts is a visible fiscal
  outcome**, and *"do we buy the stun rods?"* is a real vote with a
  real militarization argument attached. The Terraces can afford a
  well-equipped watch; the Gray gets what is left over — honest, and
  precisely the inequality the district exists to show.
