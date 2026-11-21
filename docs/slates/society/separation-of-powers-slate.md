# Separation of powers slate — law, code, and law == code

> **Status: UNBUILT** — talked through with the owner 2026-11-18, out of the
> [tech-tree-slate](./tech-tree-slate.md)'s finding that **code is reality** and the law and the
> curriculum describe it (§§ 6a–6d there). The owner: *"I kinda wanna use this as a jumping-off point
> to actually start drilling into the governance design for real — what are the various inputs and
> outputs for the different bodies within the different branches."*
> ⭐ **2026-11-20 (§ 7s): grants delegate, titles convey** — the fix to § 7l's revocation gap; the city
> provides the lot, the holder fills it in (class 4); the first statute book (the Procedure Act, the Title
> Act, the Terminus Charter) cited from the code.
> ⭐ **2026-11-20 (§ 7r): who directs enforcement** — the Sergeant at Arms (the floor), the High
> Constable (the executive's Constabulary), the Clerk of the Court (elected by every citizen, the second
> election); the four top seats incompatible; one report desk.
> ⭐ **2026-11-20 (§ 7q): stand the Compact up first** — capital standing only, the vote as the
> early-adopter incentive, the Speakers as leaders who certify their houses' counts and hold a sealed
> namespace, the first election (Speaker of the Capital House), the monthly jobs report, rules A–D on
> the seal.
> **Left:** the procedure law — its classes, its classifier, its emergency window (§ 6) · every merge
> carrying its class and authority (§ 7) · the law states (§ 3) and their record · the veto, the
> override and no confidence (§ 4) · the court as code review — judges' credential, deference,
> standing, the remedy (§ 5) · institutions founded by statute (§ 2) · the commoner's procedure —
> `bill` and its subcommands, the second, the bill's states and record (§ 7a) · the legislator's
> reports — the diff, the fiscal arithmetic, affected counts, conflicts, watches, the agenda (§ 7b) ·
> the secret-ballot list · the counsel office's LLM staff (§ 7c) · the budget committee (§ 7d) · the
> executive's codification orders and status (§ 7e) · the closed toolkit (§ 7f) · the bounty board,
> escrow and the independent central bank (§ 7g) · the standing formula and allowances (§ 7h) · the
> court's case flow — the clerk's checks, LLM staff, sortition panels and the high court, the ruling
> window, outcomes, opinions attached to clauses (§ 7j) · committees as groups with grants — carving,
> paths for every operation, per-collection tools, the DBA seat, sovereignty and the Compact's appeal,
> public duties and private protections (§ 7l) · the interface — `bill`, `law`, `office`, `committee`,
> `directive`, `job`, `allowance`, the enforcement verbs, `case`, and their cards (§ 7m) · the person
> docket — five kinds of matter, epistemic evidence in the fiction, judge and jury, Tier A due process,
> interim rules, closed sentences, the record (§ 7o)
> **Size:** a design pass, then the procedure law as received law, then the record and the merge
> gate as a build

## 0. The ask **[the owner, 2026-11-18]**

*"We have this idea of laws being YAML so they can express some 'code', but we also want to maintain
separation of powers. The legislature writes the laws/rules but the executive writes the code."*

And the line that governs this slate: *"legislative → law, executive → code, judicial → law == code.
The court's main job is code review and making sure the laws it cites actually justify the code."*

## 1. ⭐⭐⭐ Three outputs **[DECIDED — the owner]**

| branch | writes | its question |
|---|---|---|
| **legislature** | law | what should be true? |
| **executive** | code | what *is* true? |
| **judiciary** | law == code | is what is true authorized by what should be? |
| *the university — not a branch* | courses | teaches the law and the code it describes; lags; no veto ([tech-tree-slate](./tech-tree-slate.md) § 9) |

Code is reality, so the executive holds the most dangerous power by construction. Separation of powers
here means **bounding that pen**, and letting the other branches act on reality without writing code.

## 2. ⭐⭐ The executive is institutions, not a code arm **[DECIDED — the owner]**

*"The executive doesn't have a code arm — it's institutions filled by wizards and non-wizards alike,
depending on what the institution's mandate is."*

- **The legislature founds institutions by statute** — the mandate, the seats, each seat's
  qualifications, the budget. That is the legislature's main input to the executive.
- **Writing code is one possible output of an institution whose mandate includes it.** A seat that
  writes TypeScript requires the **wizard bit as a qualification**, as a surgeon's seat requires a
  license; a records office or a tax collector has no such seat.
- **The wizard bit is a credential, not a branch.** Wizards hold seats and answer to their
  institution's mandate like anyone else.
- **One chief executive, the PM**, holds the veto (§ 4), seated by the legislature by headcount
  (§ 7e).
- **The executive is not only code** — it is enforcement of any kind, through a closed toolkit the
  legislature grants, and a human part that decides (§ 7e).

## 3. ⭐⭐⭐ The legislature decides anything, anytime; reality's compliance is a separate fact **[DECIDED — the owner]**

*"The legislature needs to be able to make any kind of decision it wants anytime it wants."* So the
executive's vocabulary of clause kinds **never limits what the legislature may say**. A law is in force
on enactment, whatever it says, and is in one of these states:

| state | meaning |
|---|---|
| **enacted, codified** | the code does what the law says |
| **enacted, uncodified** | in force, nothing enforces it yet — the executive's work, visible to everyone |
| **enacted, contradicted** | the code does something else — noncompliance, for the court |
| **enacted, not yet taught** | the university's lag |

- **A typed clause is never logic** — a value, a selection among built behaviors, or a scope. If YAML
  could express conditions and control flow, the legislature would be writing code.
- **Existing slots decide only whether a law is self-executing** — whether it takes effect in reality
  on enactment. The legislature may write a clause shape nobody has built yet; the executive codifies
  it. **The executive decides how fast reality catches up, never what the law may say.**
- **A realm's law that contradicts kernel physics** is enacted and uncodifiable by that realm: kernel
  code is the platform's, so the realm petitions upstream or forks (the AGPL is the check).

## 4. ⭐⭐ The veto, the override, and no confidence **[DECIDED — the owner]**

- **Bills carry on 2 of 3 tallies** — the three chambers, which are three measures of the same crowd
  ([compact-political-science](../../compact-political-science.md)).
- **The PM may veto. An override takes 3 of 3.** A veto turns a majority law into one every kind of
  influence must agree on — a real power.
- ⭐ **The check on lag is the PM's seat.** Slow-walking codification is a veto with no override, so
  **the legislature can unseat the PM by the same 3 of 3**. The owner: *"a veto override is probably
  preferable to a no-confidence vote"* — override a specific veto first; remove the PM when the lag is
  chronic.
- **Refined in § 7e:** the PM is seated by headcount, so the matching removal is **constructive
  no-confidence** (a rival who wins a headcount majority replaces the PM); the 3-of-3 removal stays as
  the legislature's brake.
- The record shows how long each law has sat *enacted, uncodified*, so a stall is public.

## 5. ⭐⭐⭐ The court is code review **[DECIDED — the owner]**

*"The court's main job is code review and making sure the laws it cites actually justify the code."*

The real-world analog is **administrative law**: an agency's rule must cite the statute that
authorizes it, and a court asks whether the rule exceeds that authority (*ultra vires*). Here every
code change is executive action, and its `@law` / `@clause` annotations are its claimed authority
([tech-tree-slate](./tech-tree-slate.md) § 6b). The court asks:

1. **Is authority cited?** Behavior-changing code with no citation acts without authority.
2. **Does the cited law justify this code?** Code can cite a real law and do more than it permits.
3. **Does the code implement it faithfully**, or contradict the law it cites?

- **What comes before the court is mechanical: the projection diff.** A change that moves no clause,
  law or tier is behavior-neutral and needs no authority; a change that shows in the diff is
  executive action.
- **The remedy for ultra vires code is to strike it** — revert it.
- **Judges must read code.** They need not hold the wizard bit (write access) — the source is public
  — but they need the **competence** to read it against the law: a university credential. The loop
  closes: the university teaches the law and the code it describes; judges have shown they can read
  both.
- **Typed clauses are easy to review; prose is where judgment lives.** A rate of 0.04 matches the code
  or it does not; *"a reasonable rate"* needs interpretation.
- **Receipts are evidence** of what the code does ([tech-tree-slate](./tech-tree-slate.md) § 6d).
- ⭐ **We already run a version of this** — the MR review rounds, the review questions and the
  pre-merge sweep are an informal judiciary. This makes it a branch with a law to review against.
- **The court's other cases** — disputes between persons, crimes — remain
  ([courts-slate](./courts-slate.md)), but they are not its main job.

### Where the court's powers come from **[OPEN — the owner]**

*"The courts are gonna need to figure out exactly what their powers are, Marbury v. Madison style, or
we need amendments for it in the manifesto."*

- **The Marbury path** works only if **the court gets no powers in code**: the court that decided
  *Marbury* had no army, and its power existed because the other branches honored it. The platform
  supplies the raw material for a court to claim power — a docket, published rulings, evidence (the
  projection, receipts), and a place for a ruling to sit beside the law it interprets.
- **The manifesto path** writes the powers down, possibly enforced in code — better taken after a
  court has tried and we have seen where it sticks.

## 6. ⭐⭐⭐ The procedure law — routine work under standing authority **[LEAN — a draft]**

The owner: *"It probably depends on the change, and we'll have to come up with law that describes
this. People have to be able to make routine fixes to code or content without going through
democratic machinery. But we don't ever want anyone operating outside the law."*

**Standing authority** — law that authorizes whole classes of change in advance, as an administrative
procedure act does. Nobody votes on a pothole repair, and the pothole crew still acts under law.

| class | covers | authority | review |
|---|---|---|---|
| **1. Neutral** | the projection diff is empty — refactors, performance, tests | the institution's mandate | none |
| **2. Compliance fix** | brings code into line with the law it already cites | the cited law itself — fixing a contradiction is *more* lawful | after merge, on challenge |
| **3. Delegated discretion** | tuning a parameter within a range the statute grants | the statute's grant | after merge, on challenge |
| **4. Content in your extent** | rows and places by the extent's holder, within its covenants | title to the extent | after merge, on challenge |
| **5. New authority** | new law-bearing behavior, a new law, a moved tier, anything no statute already covers | an enactment or directive, **first** | before merge |
| **6. Emergency** | security and data-loss fixes that cannot wait | the emergency clause | merges now, reviewed promptly after, **expires** unless ratified |

Classes 1–4 are the routine path: no democratic machinery, and never outside the law.

- ⭐ **This is the first statute** — received law, in force at founding, amendable like any other.
  The legislature tightens it (more classes reviewed before merge) or loosens it (wider discretion
  ranges): **the dial for how much the executive does without asking.**
- **It can apply to us now**, as a norm before any polity sits: our MRs carry a class and a citation,
  so the record starts at the platform's founding.

## 7. ⭐⭐ Never outside the law, mechanically **[LEAN]**

- **Every merge carries its class and its authority.** A change that claims no class does not merge
  — a wall, on the executive itself.
- **The projection diff proposes the class**: empty → 1; a clause value moving within its stated
  range → 3; a new `@law` → 5. The author may argue another; **a misclassification is exactly what a
  challenge is for** (*"sold as a compliance fix, but it is new behavior"*).
- **The classifier is executive code, so the court reviews it too.** A classifier that waves new
  behavior through as class 2 is itself ultra vires.

## 7a. ⭐⭐⭐ The legislature, step by step — a procedure any commoner can follow **[DECIDED in shape — the owner]**

The owner: *"We're a ways off from building the whole governance GUI, but we can talk about the
command interface and the kinds of documents or data they generate, and how we make rules of procedure
that can be followed by any commoner — because the legislature is every user in the game."*

**What runs today:** no bill or vote verb exists. The **conviction engine** does, with no verb on it
([influence.md](../../subsystems/influence.md) § Conviction): you hold a position yea or nay, its
weight is your standing in each stock times a conviction that builds the longer you hold it unbroken,
and standing decays while you are away — so only the present carry the floor.

⭐⭐ **So the legislature is continuous.** No sessions, no floor time, no Robert's Rules. A bill sits on
the docket and the crowd's held positions carry it or do not. Nothing to show up for on time.

### The whole procedure, on one card

> Anyone may write a bill. Anyone may file it; it reaches the floor once another player seconds it.
> Support it or oppose it; your voice grows the longer you hold it. A bill passes when two of the three
> tallies carry it. The Prime Minister then has *N* days to veto. A vetoed bill still becomes law if all
> three tallies carry it.

If it does not fit on one card it is too complicated. **The card is itself a law** — the procedure
law (§ 6), received at founding and amendable.

### The steps

1. **Draft** — `bill draft` starts a private document in your home.
   - **Prose is the default and always enough** — any law can be said.
   - ⭐ **Typed clauses come from forms, not YAML.** Each slot the executive has built is a form
     (*"set the fine for ___ to [number]"*, *"these nodes do not operate in [extent]"*), so **the
     executive's slot vocabulary is the commoner's palette of forms**. A clause with no form stays
     prose, and the bill is a directive automatically.
   - **A duplicate check while drafting** (§ 7c) — *"there is already a bill like this on the floor;
     second it instead?"* — advises, never refuses.
2. **File** — `bill file` publishes it; the text is frozen. It waits, public, in a *seeking a second*
   list.
3. ⭐ **Second** **[DECIDED — the owner]** — *"no bill goes to the floor without at least a second …
   it matters in a game where these things are on the record."* `bill second <bill>` moves it to the
   floor.
   - **A second means *this deserves the floor*, not *I support it*** — the seconder may oppose, so a
     commoner will second a bill they disagree with but think deserves a hearing.
   - **Against alts:** a **different player**, not another character of yours (one account, one
     second); the seconder **must hold standing**, which is earned by being present and contributing
     and decays, so a throwaway character can second nothing; and **the second is on the record by
     name**, permanently.
   - It is also the spam filter: filing is free, the floor takes a second person with standing — no
     gatekeeper, no insiders' co-sponsor quota.
4. **Deliberate** — each bill has a discussion thread.
   - ⭐ **A filed bill is immutable; an amendment is a new version** filed beside it. A text that
     changed under a held position would have you backing something you never read. **Positions
     belong to a version and do not carry over**; voters move between versions.
5. **Hold positions** — `bill support <bill>`, `bill oppose <bill>`, `bill drop <bill>`. One command
   holds you in all three tallies, because the chambers are dimensions of one person; splitting
   (yea in labor, nay in capital) is allowed by the engine as an advanced option.
6. **Pass** — when 2 of 3 tallies cross the threshold, the bill is **passed** and goes to the PM. No
   vote is called; it crosses.
   ⚠ **Refined 2026-11-20 (§ 7q):** the crossing is computed, but **each house's Speaker certifies its
   count** (with a deadline, then the Clerk, then certified-by-default) — a binding result needs a
   driver.
7. **The PM** — `bill sign` or `bill veto <bill> <reason>`, within *N* game days. ⭐ **Silence
   enacts**: if the PM does nothing the bill becomes law when the window closes. A pocket veto would
   hand the PM a slow-walk here too.
8. ⭐ **Override** — a vetoed bill **stays on the floor with the same positions.** Nobody re-votes;
   the bar rises to 3 of 3. A veto does not kill a bill — it raises the threshold on the vote already
   in progress.
9. **Enact** — the bill produces new versions of the laws it amends, with a snapshot of the tallies
   at the crossing, the PM's signature, silence or override, and each clause's state — codified (it
   filled an existing slot) or uncodified (a directive for the executive) (§ 3).
10. **Lapse** — a bill ignored on the filed list or the floor lapses after a while. No gatekeeper;
    an ignored bill disappears.

### What a bill is, at every point

A bill is **immutable text** (fixed at filing) + **an append-only event log** + **live numbers
derived on read** (tallies, conviction — never stored), except **snapshots at decision moments**, so
the record shows exactly what carried it.

| stage | what it adds |
|---|---|
| **draft** | author, prose, clauses, target laws; private; editable |
| **filed** | id, version, parent version (if an amendment), filed-at, ballot type (§ 7b); text frozen; computed: the diff against current law, and each clause self-executing or a directive |
| **seconded** | the seconder, when |
| **floor** | live positions → three derived tallies; the thread |
| **passed** | the tallies' snapshot at the crossing; the PM's window and its deadline |
| **signed · enacted by silence · vetoed** | the PM's act or the window closing; a veto carries its reason |
| **overridden** | the snapshot of the 3-of-3 crossing |
| **enacted** | the law versions it produced; codification state per clause |
| **lapsed** | from filed or floor; when and why |

## 7b. ⭐⭐⭐ What a legislator needs to do the job **[DECIDED in shape]**

The owner: *"What do actual assembly members and congresspeople and city councilmembers need to
actually do their jobs, and does it manifest in our game anywhere?"* Real legislators are surrounded
by offices producing a handful of documents. Grouped by the question each answers:

| question | the real thing | ours |
|---|---|---|
| **What does it do?** | the text; a redline against current law (the House's Ramseyer rule); a plain digest (California's Legislative Counsel's Digest, CRS summaries) | ⭐ the diff against current law is **generated** — exact for typed clauses, a text diff for prose; each clause links to the course on the law it changes; the digest is written (§ 7c) |
| **What does it cost, whom does it touch?** | fiscal notes, CBO scores; regulatory, environmental and equity impact statements | ⭐ **the engine measured the past**: fines issued at the current rate last month and the static arithmetic at the new rate; the faucets and sinks a clause touches ([tech-tree-slate](./tech-tree-slate.md) § 6b); how many people and places exercised the code recently, as aggregates only |
| **Can it be done; will it hold?** | agency comments; the Statement of Administration Policy (where veto threats come from); counsel opinions | each clause computed self-executing or directive; **the PM's signed statement** before passage, so a veto threat is visible; mechanical conflict checks — a clause touching Tier A is void on its face, contradicting typed clauses are detectable; prose conflicts need people |
| **Who is for it, against it; where is it heading?** | whip counts, recorded votes, lobbying disclosures | tallies per chamber over time, as a chart; competing versions side by side; the seconder; the capital tally *is* money's open chamber, so who holds capital stake is the disclosure |
| **What is coming; what needs me now?** | calendars, whip notices, deadlines | the docket sorted by momentum; alerts when a bill nears passing, a PM window closes, a bill nears lapse; ⭐ **watches** — bills touching your extent, your trade, a law you hold a credential in (*"this bill amends the cooling law, which runs your coolbox"* is derivable because clauses cite laws and laws cite code) |
| **Where did this come from?** | legislative history, prior bills, committee reports | the event log; the amended law's history; earlier bills that tried the same and lapsed or were vetoed |
| **Testimony** | hearings | the bill's thread, ⭐ with **credentials shown on comments when presented** — someone who passed the course on the law being amended is visibly someone who knows; nothing gated, only legible |

⭐⭐ **Two kinds of report** — the measurement doctrine applied to legislation:

| kind | made by | character |
|---|---|---|
| **derived** | the engine — diffs, fiscal arithmetic, affected counts, conflicts, tallies, history | neutral by construction; **measures, never predicts** (*"340 players paid this fine last month"*, never *"this will reduce crime"*) |
| **authored** | people and institutions — digests, the PM's statement, counsel opinions, testimony, press | signed; partisan by nature; on the record |

**Where it manifests today:** running — the conviction engine (no verb), forums for threads, `notify`
for attention, the press for publishing positions. Designed, unbuilt — credentials and presentation,
the faucet and sink annotations, receipts. New — the bill and law documents, the generated diff, the
fiscal arithmetic, the affected counts, the conflict checks, watches over laws, the agenda.

### Public positions; secret ballot by law **[DECIDED — the owner]**

*"I think they are public, but certain bills can be done by secret ballot. We may want legislation
around which."*

- **Public by default** — the accountability.
- **The procedure law lists which kinds of bill are secret.** Lean: **votes that judge a person** —
  unseating the PM, confirmations, removal from a seat — where retaliation is the real risk (the UK
  Commons elects its Speaker by secret ballot). Policy stays public.
- **The ballot type is fixed at filing**, part of the immutable bill, from the procedure law's
  classes.
- ⭐ **Continuous voting makes the secret ballot unusually strong:** a position can be flipped any
  time, so a bought vote cannot be enforced, and under a secret ballot the buyer cannot even check.
  Secrecy protects against being *watched*; it cannot stop someone showing their own screen, and does
  not need to.

## 7c. ⭐⭐ The legislature's staff — LLMs, run once per bill **[DECIDED in shape — the owner]**

*"I suspect we'll want to lean heavily on LLMs here, being wary of the costs. But they're so good at
this sort of thing, and I don't think it needs to scale to huge numbers at least for a while. Even
filing a bill, I figure you'd want an agent to tell you if there's already another bill like it on the
floor — that's cheap anti-spam."*

⭐ **Immutability makes it cheap:** a filed bill never changes, so each analysis runs once and is
cached forever.

| when | job | model |
|---|---|---|
| drafting | **duplicate check** — similarity search over open bills, then a cheap model confirms | Haiku |
| filing | the plain-language digest | Sonnet |
| filing | conflict check on prose against current law and pending bills | Sonnet |
| filing | the fiscal note's narrative around the engine's arithmetic | Sonnet |

- **The duplicate check advises, never refuses** — a soft limit.
- **LLM output is authored, not measured**: a judgment, signed by the legislature's counsel office
  whose seats it fills, on the record and contestable. The engine's numbers stay the neutral layer
  underneath.
- **The office is staff, not members.** Agents may hold staff seats because staff never vote — the
  *no NPC weight* rule holds ([guild-slate](./guild-slate.md)).

## 7d. ⭐⭐ Committees, and the budget committee **[DECIDED — the owner: one is needed; makeup LEAN]**

*"Do we need a budget committee? Absolutely. Who should sit on it? Capital stakeholders? Labor?
Consumers? Some codified makeup of all three? Capital actually seems like it should have the most say
here, but who's to say exactly?"*

- **The legislature has its own institutions**, apart from the executive's, as real legislatures
  keep CRS, CBO and Legislative Counsel — founded by statute. ⚠ Unusual here because the legislature
  is **one large, unsegmented pool counted three purposefully opposed ways**: a committee is a subset
  of people, and the chambers are not.
- ⭐ **Seats elected by each tally.** Capital elects its members by capital-weighted support, labor by
  labor's, consumers by consumers'. The committee embodies the three-way opposition without splitting
  the crowd; the same person can win a capital seat and lose a labor one.
- ⭐ **Seats held continuously, like positions** **[LEAN]** — a seat goes to whoever holds the most
  conviction-weighted support in its tally right now, so seats are contested the way bills are. The
  alternative is periodic elections.
- **How much say capital gets** — two real traditions pull opposite ways: *capital pays, so capital
  decides* (the stakeholder argument); *the purse checks power, so it belongs to the many* (revenue
  bills originate in the lower house in the UK and the US precisely so the money-holders do not
  control them). **[LEAN]** **The founding statute sets the ratio as a typed clause**, with a drafted
  default (for example 3 capital : 2 labor : 2 consumer) — the legislature's to change; the right
  answer is a political fight, not ours to settle.
- **The committee proposes and the floor decides**: the budget still needs 2 of 3 on the floor, so a
  capital-heavy committee passes nothing alone.
- **It produces** the budget bill (revenue clauses and appropriations to institutions) and fiscal
  reports; its staff is the scorekeeper — the engine's arithmetic plus LLM analysis (§ 7c).
- **Committees report; they do not gate** **[LEAN]** — with every player a legislator — **except
  that budget bills originate in the budget committee**, as US revenue bills must originate in the
  House. Anyone may file an amendment to the budget once it is on the floor.

## 7e. ⭐⭐⭐ The executive, step by step **[DECIDED in shape — the owner]**

### Seating the PM — by headcount **[DECIDED — the owner]**

*"The PM is seated by the leg. I'm not sure if it's 3/3 chambers or a simple majority of the entire
body. I like the latter, for reasons that are maybe just cultural bias as an American, but the
asymmetry with how bills are actually passed might be a problem if the two have to work together."*

- ⭐ **The asymmetry is the meaning.** The three chambers count **contribution**, weighted by
  standing; the PM is the one office counted by **persons** — one player, one vote. So **the veto is
  the persons' check on the weighted legislature**, and the 3-of-3 override says that when every kind
  of contribution agrees, it beats the headcount — the shape of a nationally elected US president
  facing a Senate weighted by state. Divided government is the cost; silence enacting and an override
  needing no new vote soften it.
- **A headcount is what alts attack:** one account, one vote, with a standing floor — the same
  defense as the second.
- **Seating and removal by the same count** — **constructive no-confidence** (the German rule): a rival
  who wins a headcount majority replaces the PM. **The 3-of-3 removal stays as the legislature's
  brake** (§ 4). A vote that judges a person, so a secret ballot (§ 7b).

### 1. Enactment lands; every clause gets an owner

- ⭐ **Routing is derived from the toolkit:** a clause goes to the institution holding the tools it
  needs — a clause needing fines goes to whoever holds the fine tool. Derivable, not decided. A bill
  may also name an institution; an unowned clause shows on the record.
- **Self-executing clauses take effect on enactment, or on an effective date** the bill sets — a clean
  cutover for a fine changed mid-case or a rate mid-month. The owning institution builds nothing but
  answers for the clause working; if it does not, that is a compliance fix (class 2).

### 2. Directives become codification orders

The owning institution answers each order with one of:

| response | meaning | goes to |
|---|---|---|
| **a plan** | how it will codify it, ⭐ **its reading of the clause**, an estimate, the cost against its appropriation | the record; the legislature sees it |
| **unfunded** | it can be done; there is no money for it | the legislature — fund it or live with the lag |
| **infeasible here** | it contradicts kernel physics | the legislature, a petition upstream; the court may test the claim |

- ⭐ **The plan is where the executive's interpretation is written down.** A prose clause must be read
  somehow before it is built; when the code reaches the court, *did the executive read the law
  reasonably?* has a document to answer it.
- ⭐ **This is our own workflow.** Requirements say what the product needs, the plan what the code
  needs: a directive *is* a requirements document handed down by the legislature, and the institution
  writes the plan. `/requirements` and `/plan` are the executive's pipeline, run without a
  legislature.

### 3. Who does the work

- **Seat-holders**, under their mandate — wizards for code, others for content and data.
- **Or the bounty board** (below) — work posted for any wizard or worldcrafter.
- **Accountability follows the merge, not the author.** A seat-holder signs the merge as the executive
  act; a contractor writes code and the institution answers for it.

### 4. The merge request is where the bill leaves the executive

It carries its class (class 5 — the enactment is now its authority), the clauses it codifies, the plan
and its interpretation, and the projection diff — and goes to the court.

### 5. Status, visible the whole time

> assigned → planned → in progress → (blocked: unfunded · infeasible · awaiting upstream) → submitted
> → codified

The legislator's *can it be done?* answered live (§ 7b), and the slow-walk made concrete — a clause
long at *planned* is visible, and chronic lag is what no-confidence is for.

### 6. What the PM does

Assigns what routing cannot; **sets priorities across directives** (real discretion: which law is
codified first); issues statements, veto threats included; vetoes; appoints seat-holders —
**confirmation depends on the appointment** (the owner), set by each institution's founding statute.

**What the executive produces:** assignment records · plans · unfunded and infeasible reports · work
contracts · merge requests · a log entry for every act, naming the authority invoked
([executive-slate](./executive-slate.md)'s log).

## 7f. ⭐⭐⭐ The closed toolkit, and the human executive **[DECIDED — the owner]**

*"This is very pointed towards code changes, but that's not the executive's only mandate. It's law
enforcement of any kind, and not all laws can be enforced by code. That said, my recommendation for
most legislatures is they describe a closed set of tools the executive can use that they're accountable
to … wizards may still use the eval command for off-the-books operations, but the idea is if the
toolkit is good enough they won't want to. Still, there's a part of the executive that's very human,
and you need that represented in these ideas somewhere."*

- **The legislature enumerates the executive's tools by law**, as typed tools: issue a fine, revoke a
  license, bar from an extent, seize, appoint, spend an appropriation, post a contract, mint (by the
  monetary rule), merge code (by class). **Each tool states who may use it, on whose authority, how
  it is logged, and how it is appealed.**
- ⭐⭐ **It mirrors the legislature's side.** The legislature writes typed clauses from slots the
  executive built; the executive acts with typed tools the legislature granted. **Each branch's
  vocabulary is the other's to define, and the court checks both.**
- **A new institution is a statute naming its mandate and its tools** — the ordinary case, no code. A
  *new tool* needs executive code (class 5).
- ⚠ **Each tool says whether it is diegetic.** A watchman's fine or a bailiff's seizure acts inside
  the fiction and must look like an in-world act by a person in the world; a merge or a ledger mint
  acts outside it.
- **Every tool that judges a person** (fine, bar, seize, revoke) carries a named criterion and an
  appeal to the court, as part of its definition in law.
- **Off the books.** A wizard can still `eval` — code is reality, and nothing stops it. But eval in a
  live world, doing what a tool covers, is an act outside the law; logged, it is reviewable. ⭐ **The
  toolkit's completeness is the measure of success**: good enough that nobody wants eval.
- ⭐ **The human executive is discretion** — when to use a tool and on whom (prosecutorial discretion),
  mercy, emergencies, talking to people, investigating, presence; what neither NPCs nor code can do.
  **Discretion chooses among tools and is logged; it never invents a tool.** A human executive is
  someone deciding, not someone with extra powers.

## 7g. ⭐⭐⭐ The bounty board, the purse and the mint **[DECIDED in shape — the owner]**

*"Some kind of bounty board for other wizards and worldcrafters to pick up work that the legislature is
adding to the docket — that's interesting. It can't pay in anything but zorkmids, but that's okay,
because in our economy everyone needs zorkmids, even the privileged. Actually the one person who
doesn't really is the head of the executive, because they can take control of the CB anytime they like
and mint as much money as their heart desires until they're unseated. So that's a bit of a problem if
the executive is also paying for work to be completed."*

- **The legislature holds the purse.** A bounty is appropriated in the bill and **escrowed on
  enactment**; the executive never holds that money.
- ⭐⭐ **Payment releases when the court accepts the work** — when the clause reaches *codified*. Every
  bounty touches all three branches: the legislature funds it, the executive assigns and merges, the
  court's acceptance pays. **No single branch can pay a favor.**
- **The central bank is its own institution under a monetary rule** **[DECIDED — the owner]**, not
  the PM's instrument. Minting is a tool, bounded by the rule and logged with its authority; a mint
  outside the rule is a removable offense with the evidence attached — central-bank independence.
- **The bounty board** is the directives with escrowed bounties, open to every wizard and
  worldcrafter, paid in zorkmids.
- **Zorkmids and standing stay separate.** The bounty is the legislature's appropriation, set by vote —
  its purse to use as it likes. Standing is by formula (§ 7h), so capital setting bounty sizes never
  sets anyone's labor standing, and the chambers stay apart.

## 7h. ⭐⭐⭐ Standing for the Compact's work — by formula; discretion only from allowances **[DECIDED in shape — the owner]**

*"Whoever fulfills these contracts should earn it — it's labor for the Compact, and if that shouldn't
earn labor standing, what should? But how it's all awarded is the thing we have to figure out."* And:
*"While I do think there is a place in the game for standing to be awarded on a purely discretionary
basis, I want that sort of thing to come out of fixed allowances that are pointed at specific targets,
not just some free-for-all. Besides that, I think most standing should attempt to be awarded by
formula, independent of any human discretion."*

⭐⭐⭐ **The principle: a formula wherever the engine can measure the outcome; an allowance where it
cannot. Allowances are fixed, aimed at a named target, and logged — never open-ended.** The
measurement doctrine applied to rewards. The proportion between the two falls out of how measurable
an institution's work is: codification is nearly all formula, the street watch mostly allowance.

### The formula for codification work — units the worker cannot size

- **The unit is the clause, and the legislature defined it.** A contractor cannot inflate their work by
  writing more code; nobody counts code — the projection counts clauses codified.
- **It pays on durability**: a clause counts once codified *and* past the challenge window. Work struck
  down earns nothing.
- **The split is a contract term, not a judgment.** A crew declares its split when it claims (*60/40*),
  by agreement, before the work. Consent up front, not discretion after. (The owner: share of authored
  work *"is still kinda subjective."*)
- ⭐ **A share of the period's labor standing, divided by formula** **[DECIDED — lens 6]** — not a
  fixed number. Scale-invariant like the tallies, no tuning burden; many trivial clauses dilute each
  other and mint nothing extra.
- ⭐ **A clause's weight is its support at enactment × a waiting multiplier** **[DECIDED — lens 1]**.
  A player can compute a bounty's standing *before* claiming it: support at enactment and waiting time
  are both known then; measured use after codification is not, so it is out. Support at enactment is
  the polity's own valuation, ungameable after the fact; the multiplier draws labor to neglected
  clauses — the slow-walk solved from the labor side.

> each period: your standing = the pool × Σ(your declared share × the clause's weight) ÷ Σ(all weights)

- **Clawback: none, except fraud found by the court** **[DECIDED — lens 7]** (work misrepresented to
  win a bounty). Taking standing back needs a criterion, and decay already handles stale awards.
- **Conflicts of interest are disclosed, not forbidden** — a legislator who drafted a directive and
  claims its bounty shows on both.
- **Salaried seats earn the same standing** for codification work as a contractor **[LEAN]** — the same
  labor.

### Allowances — the human work

- **The law creates each allowance with a size, a target and a holder** — *"the PM may award up to N
  labor standing per period for emergency response"*; *"the Watch's captain, up to M, for street
  patrol."*
- **Each award is logged, names its recipient and gives its reason; an unspent allowance lapses** —
  no stockpiling across administrations.
- **Not receiving an award is not appealable; misusing an allowance (rewarding cronies) is
  reviewable**, because every award carries its reason.

## 7i. Lens pass on the executive

1. **Pedagogy** — real doctrine on a working instance: enumerated powers, prosecutorial discretion,
   central-bank independence, constructive no-confidence, procurement, escrow. Routing by tools is
   derivable; a formula lets a player compute their own reward from public data — **lens 1 chose the
   clause weight**.
2. **Expression** — a new institution is a statute (no code); a new tool is the bespoke case through
   class 5; the bounty board opens law-building to every wizard and worldcrafter.
3. **3a Immersion** — ⚠ each tool must say whether it is diegetic. **3b Participation** — a coalition
   funding bounties its members claim (disclosed); a populist PM against a weighted legislature; a PM
   leaning on the central bank — real politics, nothing scripted.
4. **Values** — the multiplier, the pool share and each institution's allowance have no derivable
   answer: the law sets them, and we draft defaults *(grain)*.
5. **Continuity** — tools in law outlive any PM; allowances lapse each period; the monetary rule binds
   every PM.
6. **Economy** — the docket's directives make demand for wizard labor before any bounty exists; **lens
   6 chose the pool as a share**. ⚠ Escrow needs treasury revenue.
7. **Governance** — every person-judging tool carries a criterion and an appeal; allowance misuse is
   reviewable; constructive no-confidence is a secret ballot; **lens 7 chose no clawback but for
   fraud**.

| question | answer | chosen by |
|---|---|---|
| PM seating | headcount (one account, one vote, a standing floor); constructive no-confidence; 3-of-3 removal as the brake | the owner |
| the central bank | an independent institution under a monetary rule | the owner |
| clause weight | support at enactment × a waiting multiplier | lens 1 |
| the pool | a share of the period's labor standing | lens 6 |
| the split | declared by the crew when it claims | lenses 1, 7 |
| clawback | none, except fraud found by the court | lens 7 |
| tools | each says whether it is diegetic; each that judges a person has an appeal | lenses 3a, 7 |

## 7j. ⭐⭐⭐ The court, step by step **[DECIDED in shape]**

The bill arrives as the executive left it (§ 7e): a merge request carrying its class, the clauses it
codifies, the plan and its interpretation, and the projection diff.

### 1. Two ways a case starts

- **Automatically, before merge** — every class 5 change opens a case by itself. Nobody has to bring
  it.
- **On challenge, after merge** — for classes 2–4 and emergency changes (§ 6). ⭐ **Anyone may file; a
  challenge needs a second to reach the docket** **[DECIDED — lens 7]**, exactly like a bill (§ 7a): a
  different player, with standing, on the record. The right to challenge stays open to all, and the
  second keeps it from becoming harassment.

### 2. The clerk — mechanical checks first

Before any person reads anything, the engine checks:

- every changed behavior cites a clause;
- each typed clause's value matches what the code's `@clause` annotation carries;
- nothing touches Tier A;
- the claimed class matches the projection diff (§ 7).

**A failure goes straight back to the executive** — no judge is needed for *you forgot to cite
authority*. It works like CI, and the thing it checks is the law. The checks are public, so anyone
can tell in advance whether a merge request will pass them.

### 3. The court's staff — LLMs, once per case

As with the legislature's counsel (§ 7c), over documents that never change: a plain-language summary of
the diff; a comparison of the plan's reading against the prose; ⭐ **flags for scope creep** — where the
code does more than the clause it cites. Advisory and signed, never a ruling.

### 4. Judges — sortition from the credentialed **[DECIDED — lens 1]**

Judges must read code against law — a university credential in law and wizardry, not the wizard bit
(§ 5).

- **A panel is drawn by lot for each case** from everyone holding the credential. Independence (no
  appointing power to capture); *no one sits on every committee*; and ⭐ many players get the hands-on
  experience of reading code against law — lens 1 chose it over a few appointed judges who would keep
  that experience to themselves.
- **Mechanical exclusions**: the code's authors and contractors, the bill's author and seconder,
  members of the institution that wrote it, whoever claimed the bounty.
- **The cost is consistency**, so **a standing high court** with a few seats hears appeals and sets
  **precedent** that binds later panels — and is the court that would make the Marbury moment, claiming
  in a ruling what its powers are (§ 5).
- ⚠ **The small-pool problem**: early on the credentialed pool may be tiny. A widening rule — a lesser
  credential qualifies, or the high court sits as the panel — until it grows.

### 5. Proceedings — continuous and written

- **The executive's plan is its brief** — the interpretation was written down at planning (§ 7e).
- **Amicus filings are open to anyone**, credentials shown when presented, as testimony on bills.
- ⭐ **A ruling window; a silent court approves** **[DECIDED — lens 2]**. If review could stall a merge
  indefinitely, every builder's work would wait on the court's attention and delay would become a veto
  — the same rule as the PM's window (§ 7a). A court that rubber-stamps by silence still faces
  challenges after merge.

### 6. Outcomes

| ruling | meaning | what happens |
|---|---|---|
| **approved** | cited, justified, faithful | the executive merges; the clause is codified; the durability window starts |
| **remanded** | the code exceeds its authority, or the reading is unreasonable | back to the executive with findings; it fixes and resubmits |
| **gap found** | the law does not say enough to justify any version of this | a report to the legislature — ⭐ **the court never fills a gap itself**; that would be legislating |
| **struck** *(after merge only)* | merged code is ultra vires | a revert, if the court holds that power (§ 5) |

**No partial approvals**: code rarely separates cleanly, so a remand with findings is more honest than
an order striking part of it.

### 7. The opinion goes into the law

A ruling is a document: the questions, a finding per clause, the reasoning, dissents, the precedent it
cites. Published, and attached to the clauses it interpreted.

- ⭐ **The law card shows the rulings under each clause** — real annotated codes print the court
  decisions under each section.
- ⭐ **Rulings attach to clauses, not code lines** **[DECIDED — lens 5]**, so they survive refactors.
  When a clause is amended, rulings on the old version become history: still taught, no longer
  controlling.
- ⭐⭐ **Interpretation settles prose over time.** A ruling's reading of ambiguous prose controls until
  the legislature amends; the legislature may then convert the settled reading into a typed clause. The
  court and the legislature harden the law together, one case at a time.
- **The university teaches case law** — the curriculum follows the whole record (§ 9), rulings
  included.

### 8. The loop closes

Approval → the executive merges → the clause is codified → the durability window passes → **the
escrowed bounty releases and standing is awarded** (§§ 7g–7h) → the course updates. Legislature,
executive, court, reality, university — each step leaves a document, and no branch can skip the
others.

**The case record:** filed → clerk check (returned, or passed) → panel drawn → briefing and amicus →
ruled (approved · remanded · gap found · struck) → appealed? → final. **Documents:** the case, the
clerk's report, the plan as brief, amicus filings, the opinion and dissents, the order, a precedent
index.

**The court's other docket** — people appealing fines, bars and seizures (§ 7f) — runs on the same
machinery: its own pass.

### 9. Judging is labor **[DECIDED in shape — lens 6]**

By § 7h's principle, judging earns labor standing **by formula**: the unit is **the case**, which the
executive's submission defines and the judge cannot size, weighted as the codified clauses it reviewed
are. Paid from **the court's own appropriation**, so the court never depends on the executive for
money. The clerk is nearly free and the LLM staff run once per case; panel time is the real cost,
bounded by the ruling window.

## 7k. Lens pass on the court

1. **Pedagogy** — judicial review, ultra vires, stare decisis, annotated codes and sortition on a
   working instance; the clerk's checks derivable in advance; rulings with reasoning become curriculum;
   **lens 1 chose sortition**.
2. **Expression** — precedent lowers a builder's uncertainty; the clerk catches cheap mistakes before
   a judge's time is spent; **lens 2 chose silence-approves**.
3. **3a Immersion** — ⚠ code review is meta-governance, out of fiction; the docket for people (a
   magistrate fining you in Terminus) is partly inside it. Same machinery, so each case states its side,
   as each tool does (§ 7f). **3b Participation** — players as judges, amici, challengers; a court
   claiming broad powers in its own ruling is the Marbury story, meant to be possible. ⭐ **A case to
   anticipate:** a realm's court finds that a *platform* upgrade — our kernel code — violates realm law.
   It cannot revert kernel code, but it can order the realm's executive not to deploy that version: a
   legal route to forking, and a real check on us.
4. **Values** — deference, the high court's seating, and the revert power have no derivable answer.
5. **Continuity** — rulings attach to clauses and survive refactors; amended clauses turn their rulings
   into taught history; precedent persists across panels and versions.
6. **Economy** — judging earns standing by formula, per case, from the court's own appropriation;
   demand came first (every class 5 merge needs a case).
7. **Governance** — the criterion is the three questions, the appeal is the high court, the exclusions
   are mechanical; **lens 7 chose open standing with a second**. ⚠ **Who judges the judges** — random
   panels dissolve after each case; high-court seats need a removal path, probably the legislature's 3
   of 3.

| question | answer | lens |
|---|---|---|
| panels | sortition from the credentialed, mechanical exclusions | 1 |
| a silent court | approves when the window closes | 2 |
| standing to challenge | anyone files; a second from another player with standing dockets it | 7 |
| rulings | attach to clauses, not code; an amended clause's rulings become history | 5 |
| judging | labor standing by formula, per case, from the court's own appropriation | 6 |

## 7l. ⭐⭐⭐ Committees are groups with grants — one primitive for every branch **[DECIDED — the owner]**

The owner: *"Legislative committees and subdivision committees are basically the same thing. Private
parcels, which is most of them, govern themselves. Someone at the top level, `/terminus/`, can carve up
the rest of the tree however they want, and at any depth can form a committee granted write access to
that code. Committees are shaped by what they have access to, and that should be abstracted to whatever
artifacts or operations we want to bind, whether it's a budget or a city block or whatever."*

A **committee is a group plus grants**; a grant binds the group to artifacts and operations. *Power is
write access to an extent* describes the whole government, not only land.

| what it looks like | the same thing, as grants |
|---|---|
| a private parcel | a committee of one, granted its subtree |
| a city block | a committee granted the block's subtree, and its code if its seats are wizards |
| the budget committee | a committee granted origination on the budget lines (§ 7d) |
| an executive institution | a committee granted tools — fine, bar, merge code under a subtree, spend a line (§ 7f) |
| a court panel | ⭐ a committee granted ruling on one case — formed by lot, dissolved by its ruling (§ 7j) |
| the legislature | the root committee: everyone, over the realm's root |

- ⭐ **Founding an institution by statute *is* forming a committee with grants** (§ 2). Making law and
  carving the tree are one act; whoever holds a scope may subdivide it at any depth.
- **No escalation:** you may grant only a subset of what you hold. **The grantor may revoke**, on the
  record, with a reason, and **a revocation is appealable** — it judges the people on the committee.
- **A committee's UI is derived from its grants** — what you see and can do is exactly what you are
  bound to. Nobody designs a *budget committee screen*; a new kind of committee needs no code.

### Path everything — the operations, never the rows **[DECIDED — the owner]**

*"Yes, path everything — that's why we have three different trees that all mirror each other. But the
other Mongo collections have to stay keyed how they are."*

- **The three mirrored trees** — content, documents, source — are addressed by path, and the access
  machinery already answers by longest prefix. Every bindable thing joins them: budget lines, tools,
  dockets, law.

```
/world/terminus/…                     the city — places, content, code
/world/terminus/law/…                 its statutes
/world/terminus/treasury/budget/…     budget lines
/world/terminus/tools/fine            a tool
/world/terminus/docket/…              cases in its jurisdiction
```

- ⭐ **The other collections keep their keys; their *operations* get paths.** Correcting the bank
  ledger is not write access to `bank_ledger` — it is a named tool (*reverse an entry*, the ledger being
  append-only) with its own grant. Rows stay keyed; operations live in the namespace.
- ⭐ **Each collection declares its closed set of operations** — *"specific tools for specific
  operations on all the different Mongo collections, rather than letting operators write raw queries."*
  Each collection's authored schema doc (`packages/server/src/schema/<collection>.yaml`) is the natural
  home: reverse an entry, merge duplicate accounts, purge a person's data, export. **A new operation is
  class 5** — a new power over data is reviewed before merge.
- **An operation that touches a person** — purging their data, merging their accounts, reversing their
  entry — **produces a notice and an appeal**, as the enforcement tools do (§ 7f).
- **Domain over the collections is a separate grant axis** from the trees — the platform's executive
  grants it; no extent does.
- ⭐ **The DBA is a seat — the `eval` of data.** *"We probably want like one DBA-type that can do whatever
  Mongo stuff they need."* Raw access for what the tools do not cover; every raw operation logged with its
  actor, and one that does what a tool covers shows as acting outside a tool. **Confirmed by the
  legislature** — the most powerful seat after the PM, and it touches every person's data.

### Sovereignty, private courts, and the Compact's appeal **[DECIDED — the owner]**

*"I do think private courts can exist, but they're kind of their own fiction. The fact is the Terminus
committee is all three branches for the extent it controls. But yes, you can always appeal to the
Compact no matter where you are, public or private. It's just that private parcelholders can and should
get certain protections public ones don't."*

- ⭐ **An extent's top committee is sovereign over its extent** — all three branches. How it divides
  itself (a legislature, an executive, a court, or none of that) is its own constitution. **Separation of
  powers is the Compact's design for itself and a default we recommend; the engine does not enforce
  it.**
- **Private courts exist as their own fiction** — a manor court, a guild's tribunal: committees with
  ruling grants over their own extent, and no special engine power.
- ⭐⭐⭐ **What the engine enforces: appeal to the Compact is always available, everywhere, public or
  private.** With no-escalation, it is **Tier A and enforced by code** — walls, not norms.

### Public duties, private protections **[DECIDED in shape — the owner]**

Public power carries **duties**; private holding carries **protections** — the state-action line.

| | public extents (a polity's committee) | private parcels |
|---|---|---|
| **records** | open — every act logged and public | private |
| **judging a person** | due process: a notice, the clause, an appeal, every time | house rules; no clause required |
| **access** | equal — may not bar arbitrarily | ⭐ **the right to exclude** (*Cedar Point Nursery v. Hassid*, 2021) |
| **entry and search by public power** | — | ⭐ **a warrant** (the Fourth Amendment) |
| **taking** | — | ⭐ **never without compensation** (the takings clause) |
| **appeal to the Compact** | always; full review | always; but only against **the Compact's own law** — otherwise the owner gets deference |

A visitor barred from a private parcel may appeal and wins only if the bar broke the Compact's own law;
*the owner gave no reason* is not a ground. The same bar from a public square needs a clause and gets full
review.

## 7m. ⭐⭐⭐ The interface — every branch's commands, cards and documents **[DECIDED in shape]**

The owner: *"I just want to make sure we've actually thought through the UI for all of it — that's what I
started with for the legislature and it somehow got dropped … the whole tools-for-executive got kinda
handwaved. What are the actual tools they need? I'm sure we can anticipate most of this without waiting
for laws to be passed. Same thing with the courts."*

**Already live, and reused:** `office` (list · assign · vacate), `committee` (show · channel),
`treasury` (the Minister of Finance's book · appropriate), `reserve` (the central bank governor's supply
· set · a recorded override), `job` (post · claim · complete · fulfill), `git` (diff · log · publish ·
revert), `standing`, `forum`, `press`, `notify`, `pack`, `config`, `eval`, `wallet freeze`, `title
transfer`. Conventions: an institution is a noun with subcommands; one view, one word; every thing has an
inspection card.

### The legislature — every player

**`bill`** — the commoner's whole job.

| subcommand | does |
|---|---|
| `bill draft [title]` | starts a private draft; opens the clause forms |
| `bill clause <draft> <form>` | adds a typed clause from a slot's form (*"set the fine for loitering to ___"*) |
| `bill amend <bill>` | starts a draft that is a new version of a filed bill |
| `bill file <draft>` | freezes it, runs the duplicate check, lists it as seeking a second |
| `bill second <bill>` | moves it to the floor |
| `bill support · oppose · drop <bill>` | holds, flips or drops your position in all three tallies |
| `bill list [floor · seeking · passed · mine · watched]` | the docket, sorted by momentum |
| `bill show <bill>` | the bill card |
| `bill watch <bill>` | alerts on changes |
| `bill sign · veto · statement <bill>` | the PM's acts, gated by the seat **[LEAN — one noun is easier to learn]** |

**The bill card**, in sections you open one at a time: the digest · the text · **the diff against current
law** · clauses, each self-executing or directive with the institution it routes to · the fiscal note
(measured) · affected people and places (aggregates) · conflicts · **tallies over time** · positions (or
totals only, under a secret ballot) · the seconder · other versions · the thread · the PM's statement ·
the timeline.

**`law`** — what is in force.

| subcommand | does |
|---|---|
| `law show <law>` | the law card: text; per clause its tier, state (codified · uncodified · contradicted · taught), owning committee, **the rulings under it** (§ 7j), history, course |
| `law list [extent]` | the code, by field |
| `law diff <law> <version>` | how it changed |
| `law watch <law>` | *anything amending the cooling law* |

**Elected seats** — the PM, committee seats — on **`office`**: `office list`, `office show <office>`,
`office stand <office>` (candidacy), `office back <office> <person>` (a position for a person — also how a
rival unseats the PM by constructive no-confidence, § 7e), `office drop`. **`standing`** gains your
positions.

### Committees — any branch, any depth

`committee` (exists) becomes the one verb for carving (§ 7l): `committee show [scope]` (who holds this,
granted what) · `committee list` · `committee form <name> <grants>` · `committee grant · revoke
<committee> <grant>` · `committee log <committee>` (every act, with the authority invoked).

### The executive — by tool

**The codification queue** — `directive` (`order` is the retail verb):

| subcommand | does |
|---|---|
| `directive list [committee]` | the queue, with status and age |
| `directive show <d>` | the clause, its plan, status, bounty |
| `directive assign <d> <committee>` | the PM routing what the toolkit could not |
| `directive plan <d>` | attaches the plan — with its interpretation |
| `directive block <d> unfunded · infeasible · upstream <reason>` | a report back to the legislature |
| `directive post <d>` | to the bounty board, as a `job` with escrow |
| `directive submit <d>` | links the merge request — the handoff to the court |

**The bounty board** is `job`: `job claim <job> split <who:share,…>` declares the crew's split; completion
is automatic on codification (§ 7h).

**Money:** `treasury` (the books, appropriations as enacted) · `reserve` (the governor, under the monetary
rule) · **`allowance show · award <person> <amount> <reason>`** — discretionary standing from a fixed,
targeted allowance, logged (§ 7h).

**Code and content:** `git publish` gains `class <n>` and `under <clause>` and **refuses without both**; a
class 6 publish auto-files its ratification bill and starts its expiry clock · `git revert` · `pack` ·
`config set` for parameters within a delegated range (class 3) — Tier C values come from enactments, never
from `config`.

**Collections:** each collection's declared operations, as tools; the DBA's raw access, logged (§ 7l).

**Enforcement on persons** — diegetic, top-level verbs, each producing **a notice to the person**: what
was done, under which clause, and the appeal.

| verb | does |
|---|---|
| `fine <person> <clause>` | the amount comes from the clause, never typed in |
| `license grant · revoke <person> <license>` | |
| `bar <person> <extent> <clause> [until]` | exclusion from an extent |
| `seize <item> <clause>` | into custody, never to the seizer |
| `wallet freeze` | exists |
| `warrant` · `summon` | requests to the court — search, arrest, appearance |

**Statements:** `bill statement` for the PM; `press` for everything else. **Off the books:** `eval` is
logged with its actor; in a live world, doing what a tool covers, it shows as acting outside a tool.

### The court

**`case`**

| subcommand | does |
|---|---|
| `case list [mine · panel · open]` | the docket |
| `case show <case>` | the case card |
| `case file <target>` | a challenge — to a merge, a notice, an act |
| `case second <case>` | dockets it |
| `case brief <case>` | an amicus filing, credentials shown when presented |
| `case find <case> <clause> justified · exceeds · contradicts` | **a judge's finding, clause by clause** |
| `case rule <case> approve · remand · gap · strike` | each judge's vote; the panel's majority decides |
| `case opinion · dissent <case>` | attaches the reasoning |
| `case appeal <case>` | to the high court — or, from any extent's court, to the Compact |
| `case recuse <case>` | a conflict the mechanical exclusions missed |

**The case card — a judge's workspace:** the clerk's report (✓ or ✗ per mechanical check) · the staff's
summary and scope-creep flags · **each clause beside the code that cites it**, with a slot for each
judge's finding · the plan as brief · amicus filings · the projection diff · the ruling window's deadline.
Being drawn for a panel arrives by `notify`; precedent shows on `law show`. The docket for persons uses
the same verb, with a notice as the target.

### The documents

| branch | documents |
|---|---|
| legislature | bill versions; positions (the shipped table); bill events; law versions; enactment records with tally snapshots |
| executive | committee records and grants; directives, plans, block reports; jobs with escrow; merges with class and authority; notices to persons; allowance awards; the committee log |
| court | cases; clerk reports; briefs; per-clause findings; opinions, dissents, orders; the precedent index |

## 7n. Lens pass on committees and the interface

1. **Pedagogy** — one primitive makes civics derivable: anywhere, `committee show` says who governs here
   and what they may do. Real doctrine: the state-action line, the warrant requirement, the takings
   clause, the right to exclude; per-collection operations teach data stewardship. **Lenses 1 and 2 chose
   UI derived from grants.** ⚠ A commoner meets several nouns — `bill`, `law`, `office`, `committee`,
   `case` — and the enforcement verbs; each needs a one-card help like the procedure card (§ 7a).
2. **Expression** — the ordinary case is carving (grants, no code): a neighborhood watch, a guild court, a
   block association. The bespoke case is a new tool or collection operation (class 5). Private courts
   need no engine work.
3. **3a Immersion** — ⭐ **one flag everywhere**: committees, tools and cases each declare whether they are
   inside the fiction or outside it (the Terminus council fiction-facing, the Compact meta). ⭐ **The
   enforcement verbs stay top-level** — acts a person performs in the world; *fine him* reads in the
   fiction where *enforce fine him* never would. **3b Participation** — players found institutions nobody
   designed, and each sovereign extent picks its constitution, one with no separation at all included. A
   top holder who never carves is politics, not a defect.
4. **Values** — the protections list, the owner's deference on appeal, and recommending separation as a
   default have no derivable answer.
5. **Continuity** — rows keep their keys, operations carry paths. ⚠ **Grants bind to paths, and content
   gets rewritten** — the credential's problem again: a grant must move with the **title**, not the old
   path, or rewriting the world orphans its government.
6. **Economy** — ⭐ the protections are what make private investment worth it: exclusion and no taking
   without compensation are why anyone builds on land they hold. Budget lines as paths let any committee be
   granted spending with no separate money system. ⚠ Compensation needs treasury revenue.
7. **Governance** — no-escalation and the Compact's appeal are Tier A and code-enforced; a revocation is
   logged with its reason and appealable; operations on a person's records give notice and appeal; the DBA
   is confirmed by the legislature with raw operations logged; a new collection operation is class 5.

| question | answer | lens |
|---|---|---|
| a committee's UI | derived from its grants | 1, 2 |
| in or out of fiction | one flag on every committee, tool and case | 3a |
| enforcement verbs | top-level, diegetic | 3a |
| no escalation; appeal to the Compact | Tier A, enforced by code | 7 |
| revoking a grant | logged with its reason; appealable | 7 |
| operations on a person's records | a notice and an appeal | 7 |
| the DBA | confirmed by the legislature; raw operations logged | 7 |
| a new collection operation | class 5 | 7 |

## 7o. ⭐⭐⭐ The person docket **[DECIDED in shape]**

The court's other docket (§ 7j): cases that judge a person. Three questions shape it, and they differ
from code review — **whose harm is it** (the fiction's, or a real person's)? **what counts as
evidence** (what someone perceived, or what the engine knows)? **who decides facts, and who decides
law?**

### Five kinds of matter, one `case` verb

| kind | brought by | the question | example |
|---|---|---|---|
| **appeal of a notice** | the person | did the clause justify this act against me? | contesting a fine or a bar (§ 7f) |
| **criminal** | a prosecutor's seat (executive) | did they break the law? | theft; assault outside the bar's rules |
| **civil** | a person | do they owe me? | a breached contract, damaged goods, a boundary |
| **warrant** | the executive, one-sided | is there cause to search, arrest or summon? | searching a private parcel (§ 7l) |
| **conduct** | anyone | did they harm a real person? | harassment, cheating, abuse of a seat |

An appeal of a notice is code review's three questions applied to an act. The rest are new.

### ⭐⭐⭐ In-fiction justice uses only what someone could know **[DECIDED — lens 1]**

Players are *meant* to commit crimes in the fiction (the owner's PvP stance), and catching them is the
game — witnesses, forensics, the deduction the university's story arc is built on. The engine knows
everything; the harm ledger records every injury exactly. An in-fiction court that read it would solve
every crime at once and end the investigation play — the receipt's invariant again (*no omniscient trace
in the fiction*, [tech-tree-slate](./tech-tree-slate.md) § 6d).

- **In-fiction cases are epistemic.** Admissible: witness testimony, receipts banded to what each
  witness knew, physical evidence gathered by forensics, documents. **Never the engine's ledger.** A
  perfect crime can go unpunished, and that is correct — the price of keeping investigation learnable.
- ~~**Out-of-fiction conduct cases may use everything.**~~ ⛔ **Corrected 2026-11-18**
  ([moderation-slate](./moderation-slate.md) § 23): conduct evidence is **what was delivered to
  someone, disclosed by their report**, plus **the platform's logs of the accused's acts against the
  platform** (cheating, exploits, botting) — never undelivered speech, never a private conversation
  nobody reported. *Everything* would have made the conduct track a surveillance system.
- **Every case carries the in-or-out flag, set at filing by the clerk** — neither party can launder a
  fiction grievance into the conduct track to reach the omniscient evidence; a misfiling is appealable.
- ⭐ **Conduct cases never appear in the fiction** — a real harassment case is not dramatized in the
  world. ⚠ **Refined** (moderation-slate § 23): **the case** is out of fiction (heard on the stream,
  naming the character or handle, never the person); **the remedy** may be in it (prison is a place);
  **the record** never feeds it.
- ⭐ **NPCs may testify, never sit on a jury** **[DECIDED — lens 3a]**. An NPC's testimony is what it
  perceived and believes — epistemic, admissible. Judging is a person's act: no NPC weight
  ([guild-slate](./guild-slate.md)).

### Who decides **[DECIDED — lens 1]**

- **A judge decides the law; a jury decides the facts.** The judge (or a panel) by lot from the
  credentialed, as in code review; **the jury by lot from players with standing** — lay people. *Did they
  do it?* is a question for peers. Mechanical exclusions: the parties, their alts (one account), anyone
  with a recent stake. ⭐ The jury is how ordinary players learn the law by doing it — Tocqueville's
  *free school*.
- **Jury duty is labor** — standing by formula, per case (§ 7h).
- **Counsel is a profession** — players holding a law credential represent parties, paid by the party or
  appointed and paid by the court.
- **Jury nullification stays possible** — a jury may acquit in the face of the law.

### Due process — Tier A **[DECIDED — lens 7]**

Every person case gets **notice** (the clause or charge), **the evidence**, **a response** (in writing by
default; in-fiction, **a hearing** in a courtroom as a place — a conversation in a room, which a text
world does cheaply and well), **a standard of proof** (beyond reasonable doubt for criminal; more likely
than not for civil and appeals — defaults the polity may set), and **appeal** — to the high court, and
from any private or extent court to the Compact (§ 7l). **No polity can repeal these.**

- **Warrants are one-sided**, so the person is notified after execution and may challenge the warrant
  then.

### While a case is pending **[DECIDED — lens 7]**

The code docket's *a silent court approves* does not fit persons: nobody should be punished by the
court's slowness, and flooding the court with appeals should not erase every penalty. **Each tool
declares its interim rule** — a fine is **escrowed** pending appeal, neither paid nor forgiven; a bar
**stands** (it is for safety) unless the court lifts it; a seizure stays in custody. **An unruled case
escalates to the high court** rather than deciding itself. ⚠ **Refined** (moderation-slate § 23):
**every interim rule includes an expiry** — a hold lapses unless the case is heard (habeas corpus as a
rule) — and **nothing an appeal cannot fully undo happens before judgment**.

### Sentences — a closed list **[DECIDED in shape]**

Typed in law with ranges, as sentencing guidelines are; a court cannot invent one: fines and
restitution · a bar from an extent · revoking a license · confiscation · public labor (never profit for a
private party) · jail, in game time. ⚠ **Jail obeys *never strand a player*** — the help system still
works, and sentences are bounded (Tier A). A polity's penal philosophy — rehabilitative or harsh — is
these typed clauses.

- ⭐ **No standing penalties** **[DECIDED — lens 7, from the measurement doctrine]**. Standing *measures*
  contribution; a court that cut it would falsify the measure, breaking *the engine measures, the polity
  imposes*. Courts impose through sentences. **Abuse of a seat can cost the seat.**
- ⭐ **Fine revenue goes to the general treasury, never to the institution that levied it**
  **[DECIDED — lens 6]** — otherwise policing becomes a revenue business (the US Justice Department's
  2015 Ferguson report). Fines help close the treasury's revenue gap (§ 7g) through the general fund.

### The record **[DECIDED — lens 5]**

- **In-fiction convictions are public in the fiction** — reputation; NPCs and players may come to learn
  of it — with **expungement after a period**, so the record does not follow someone forever. **They stay
  in their realm.**
- **Conduct records are private** to the person, the Compact and future conduct cases — and **follow the
  account**, across realms: harassing real people is the platform's business wherever it happens.

### The interface

The same `case` verb (§ 7m), plus:

| subcommand | does |
|---|---|
| `case charge <person> <clause>` | a prosecutor's seat files a criminal case |
| `case sue <person> <claim>` | a civil case |
| `case respond <case>` | the accused's or defendant's answer |
| `case counsel <case> <person>` | retains or appoints counsel |
| `case evidence <case> add <item or receipt>` | submits evidence — what you perceived, or what you hold |
| `case verdict <case>` | a juror's finding of fact |
| `case sentence <case> <sentence>` | the judge, from the clause's list and range |

Every notice card carries an **appeal** action: `case file` with the notice attached.

### Lens pass

1. **Pedagogy** — criminal, civil and administrative law, burdens of proof, judge and jury, due process,
   warrants, sentencing guidelines, expungement; **lens 1 chose epistemic evidence in the fiction and lay
   juries.**
2. **Expression** — authors build crimes, mysteries and private tribunals with no engine work; a polity's
   penal philosophy is typed clauses.
3. **3a Immersion** — a courtroom as a place; conduct cases never in the fiction; **NPCs testify, never
   judge.** **3b Participation** — crime, detection and lawyering as play and trade; a polity may write a
   bad law (the Compact's appeal is the floor) and a jury may nullify.
4. **Values** — what counts as a crime, the standards of proof, the sentence ranges and the expungement
   period are the polity's law, with drafted defaults.
5. **Continuity** — in-fiction records stay in their realm; conduct records follow the account; sentences
   in game time survive any epoch.
6. **Economy** — counsel a profession; jury duty standing by formula; fines to the general treasury;
   public labor never private profit.
7. **Governance** — due process Tier A; interim rules per tool and escalation; no standing penalties; the
   clerk owns the track flag.

| question | answer | lens |
|---|---|---|
| evidence in the fiction | epistemic only, never the engine's ledger | 1 |
| evidence in conduct cases | everything, the engine's logs included | 1, 7 |
| fact and law | lay juries by lot from players with standing; credentialed judges | 1 |
| NPCs | testify from what they perceived; never jurors | 3a |
| records | in-fiction in the realm; conduct with the account | 5 |
| fines | to the general treasury, never the levying institution | 6 |
| due process | Tier A — notice, evidence, response, appeal; bounded jail that never strands | 7 |
| pending cases | interim rule per tool; an unruled case escalates | 7 |
| standing | never a penalty; abuse of a seat can cost the seat | 7 |

## 7p. ⭐⭐⭐ Where power actually lives — the pen and scarce value — and the clone policy **[DECIDED in shape — the owner]**

### The pen

The owner: *"Something you really need to understand about power in this game, which you keep missing,
is that all power in a digital domain is derived by write access — write access to the code, the
content, and the data. Any office of the mayor or otherwise that you create and fill, be it with
players or NPCs, exists only as a proxy to the real person with power, which is the person who holds
the pen. That doesn't mean we need to give every office write authority, but some we do, and the ones
we don't need to reflect the actual power structure of the game."*

- ⭐⭐⭐ **An office is a proxy; the power is the pen.** Some offices *carry* a pen because they hold grants
  (§ 7l). The rest exist to represent, persuade or perform, and **must say so**.
- **NPC officials are proxies of their authors.** An NPC writes nothing; its "decisions" are the policy
  whoever holds the pen authored.
- **The pens, deepest first:** code (wizards only, forever — code is reality) · content (extent holders) ·
  data (the per-collection operations and the DBA seat).
- ⭐ **Every office shows its pen** **[DECIDED — lens 1]** — its grants (paths and operations), its purse
  (which budget line or account), and **who holds the title behind it** if it holds nothing; an office
  with no grants says so in plain words. The discoverability line every space carries (moderation-slate
  § 23 — who moderates here, where appeals go) gains a third line: **who holds the pen here.** Derived
  from grants, out-of-fiction UI ([saxonberg-city-slate](../world/saxonberg-city-slate.md) § 8b shows it
  building by building).

### Scarce value — the second kind of power

The owner: *"You can also accrue power through the acquisition of any de facto or de jure scarce
resources. This means zorkmids. It also means the ability to just clone up any commodities or anything
else you want into the game, which is just a stand-in for value, because zorkmids are actually tightly
controlled in this regard. This isn't exactly the same kind of power as the pen, but it's not nothing in
our system."*

- **Zorkmids are tightly controlled** — only the reserve and the treasury mint, by rule; *no authored
  field may create money* ([institutions-slate](./institutions-slate.md)).
- **Cloning a commodity is minting value with the pen** — where the two kinds of power meet, so it is
  accounted.

### ⭐⭐⭐ The clone policy

The owner: *"Hopefully most of it only occurs in sandboxed environments, but people troubleshooting live
content may need to clone stuff — that's just part of the job. Or the courts may want to clone things as
restitution … even if you lock it down, people may find other ways to artificially get stuff into the
game, and at least with clone it's deliberate."*

**Locking clone down pushes people to worse routes** — `eval`, raw database writes, exploits. **The honest
door should be the easiest one**, so nobody wants the others (the toolkit's principle, § 7f). Every clone
is an act under the procedure law (§ 6):

| what is cloned | where | authority | review |
|---|---|---|---|
| anything | **your sandbox circle** | none | none — contained; it dies with the circle |
| scenery, fixtures, test props — anything without market value | live, **in your extent** | title to the extent (class 4) | on challenge |
| **a good with market value** | live | ⭐ **must cite one**: a **court order** (restitution, citing the case) · a **compliance fix** (restoring what a bug destroyed, class 2) · a **directive** · an **allowance** — a fixed, targeted, logged budget of value an office may mint at its discretion (event prizes, a troubleshooter's spare stock), the discretionary-standing principle (§ 7h) | a **goods faucet**, always recorded |

- ⭐ **A value clone without a cited authority refuses** **[DECIDED — lens 7]** — a wall on the executive,
  like a merge without a class.
- **What counts as value is computed** **[DECIDED — lens 1]**: a good has value if the engine has seen it
  trade. A lamppost does not; a crate of copper does.
- ⭐ **Every value clone is a goods faucet on the record** **[DECIDED — lens 6]** — who, under what
  authority, what template, how many, its value at current market prices: the faucet map
  ([tech-tree-slate](./tech-tree-slate.md) § 6b's `@faucet`), public, naming seats — *goods faucets, never
  money faucets* made checkable.
- **Allowances for value clones lapse unspent** **[DECIDED — lens 6]** — no office stockpiles minting power.
- ⭐ **Every cloned good carries its mint stamp** **[DECIDED — lens 7]** — its durable ownership identity
  records *minted by clone, by this seat, under this authority*. An unauthorized clone is **traceable
  wherever it went, and seizable** — seizure a tool with notice and appeal, so a good-faith buyer gets a
  hearing. The stamp is meta provenance, never in-fiction knowledge: a character cannot tell its copper
  came from a clone.
- ⭐⭐ **Clone never creates money** **[DECIDED — lens 7]** — a coin template refuses clone everywhere but the
  reserve's own minting tool. ⚠ **Open today:** the clone pipeline is on the money gate's allow-list
  (banking.md: *a template authored with `quantity: 1000000` clones into a fortune*), so the wall does not
  exist yet. It belongs on the reserved list's machinery layer (moderation-slate § 23) and **closes before
  launch** ([money-integrity-slate](../tech-debt/money-integrity-slate.md) § A).
- **The other routes stay what they are:** `eval` and raw database writes are logged as acting outside a
  tool; duplicating through a bug is an attack on the machinery, on the reserved list. **Clone is the one
  door both easy and legitimate.**
- **A polity may limit value clones in its extent by law** — a covenant.

### Lens pass

1. **Pedagogy** — every office showing its pen makes the real power structure derivable, the lesson the
   owner named for Saxonberg; the faucet map teaches where value comes from; value is computed.
2. **Expression** — testing and troubleshooting stay free (sandbox, scenery); value clones have legitimate
   routes, so nobody reaches for `eval` to do their job; plaques derive from grants.
3. **3a Immersion** — the pen plaque is out-of-fiction UI; the mint stamp never feeds the fiction.
   **3b Participation** — a real mayoral election, if the office carries the pen; the paper reporting the
   faucet map; a polity limiting clones by covenant.
4. **Values** — allowance sizes and holders; how much pen a capital's mayor carries (home rule).
5. **Continuity** — the mint stamp travels through every trade; plaques read live grants.
6. **Economy** — every value clone a recorded goods faucet; allowances lapse.
7. **Governance** — a value clone cites its authority or refuses; unauthorized clones are traceable and
   seizable with notice and appeal; clone never creates money, and the coin gap closes before launch.

## 7q. ⭐⭐⭐ Standing the Compact up first — capital standing, the Speakers, and the seal **[DECIDED — the owner, 2026-11-20; lens pass]**

The owner: *"the first thing I want to get running before any shops or even the banks and corpos is
the Compact. Labor and consumer demand aren't there yet but capital demand is, which means we have a
legislature that can make rulings … that doesn't stop us from being able to stand that up and start
it working before there's a line of actual game content. In fact that's probably what we should be
doing."*

### Only capital standing is minted, for now

- *"We're not minting anything but capital standing for a while. I don't want to mint any consumer or
  labor standing until everything's in place and we can balance it and have a meta conversation …
  and then actually have some kind of schedule of where standing comes from, so it's not just 'from
  everything and everywhere'."* Capital standing's source is known: **dollars**. Its rate shape
  (linear or not), decay, offering amounts and windows are still being balanced, but enough is
  settled to start issuing it.
- **A door fee may come** — revenue that mints no standing. *"The capital chamber isn't the only
  source of revenue but the only one that generates standing."*
- ⭐ **The early-adopter incentive is the vote, not the standing**: *"what can they vote on is
  anything."* People come to vote; voters step into offices — *"only if that office is supporting the
  machinery they've already signed up for, which is why the vote is actually still important even
  with me as dictator."*
- ⚠ **The legal gate** (founding offering; business-model: incorporate before round 1): patrons may be
  members with zero capital weight until the lawyer's read; the floor does not wait, capital standing
  does.

### Binding law under a founder **[DECIDED]**

*"I can reject anything I want legislatively but if a law actually passes I should probably respect
it, especially if it's one I voted on myself."* The veto stays as § 4 and § 7a designed it (*`bill
veto <bill> <reason>` within N days; silence enacts; override 3 of 3*), with one rule added:
⭐ **the founder cannot veto a bill they took a position on.** Abstaining keeps the veto; voting spends
it. Discretion gets a shape people can plan around, and abstentions become visible choices to let the
floor decide.

### Capital demand becomes labor demand — the monthly jobs report **[DECIDED]**

Voting on anything makes the institutions need hands: bills → a clerk and counsel; the budget → the
budget committee's capital seats; moderation → moderators (every hold makes a case); cases → the
courts' panels and clerk; the public channels → the Post's moderators, then its editor. **These seats
mint no labor standing** (the rule above); a seat is filled for the pen it carries. (Zorkmid stipends
from the treasury: open.)

⭐ **The monthly jobs report** — published by the Compact's press office (`/compact/press`, public,
`ooc`), **generated from the record**: per institution, openings (`headcount − holders`), filled this
month and by whom, candidacies waiting, and ⭐ **the load beside each seat** (open cases per
moderator, bills per clerk, cases awaiting a panel). Headcount is each appointing authority's;
**staffing ratios** (*one moderator per N open cases*) are exactly the kind of law the floor can pass
early, binding on whoever appoints. The front page's Make line is the report's headline
([front-page-slate](../client/front-page-slate.md)).

### The Speaker of the Capital House — leadership, and a sacred trust

⚠ **One floor, not three** (Art. IV §3: *one central floor of bills … no originating house*). A Speaker
has no floor to run. The owner: *"each chamber gets counted separately so someone needs to execute
that count and follow through on its result. This is a command line interface. Commands need drivers
and this isn't a job for an NPC; it's the actual government that makes binding decisions for the
entire platform. So it's maybe ceremonial but it's a sacred trust."* And: *"what I think this person
provides is just one word that summarizes everything: leadership."*

**The duties** — the count is code and re-derivable by any member (Art. VII §2); **declaring** it is the
Speaker's:

1. **Certify the house's tally on every bill** — *carried · not carried · lapsed* — on the record,
   recomputable by anyone. This **refines § 7a step 6** (*"no vote is called; it crosses"*): the
   crossing is computed; the house's certification is what makes it count.
2. **Certify the house's quorum** (a house below quorum abstains, Art. IV §3) as part of each count.
3. **Keep the roll** — who counts as an active member — derived from standing, certified with each count.
4. **Present the house's assent** — enough houses certified, the bill is law and presented; **the
   veto window starts there.**
5. **Certify the house's part in the big counts** — investiture, constructive no-confidence (Art. V
   §2), amendments (Art. X).
6. **Lead the house's internal organization** (Art. IV §6) — bylaws, officers, rules committee,
   deliberation norms, the house's own elections.
7. ⭐ **Charter house committees** — *"just because there's a single body doesn't mean it always acts
   together … the capital speaker can charter a committee only filled with seats voted on by capital
   standing, thus only represented by capital interests … it can act collectively and that alone is
   a kind of power."* A committee is a group with grants over paths (§ 7l); its seats are filled by
   the house's own tally (the budget committee's mechanism, § 7d); its grants are carved from the
   Speaker's namespace; caucus positions bind no one.
8. ⭐⭐ **The pen: `/compact/legislature/capital/`** — *"no one else but the Speaker gets to decide
   until the Speaker themselves says otherwise, not even the founder. It's just a namespace right
   now."* The **seat holds the title**, so the namespace, its seals and its committees pass to the
   next Speaker untouched.
9. ⭐⭐ **The seal** — *"the speaker can carve up that namespace however they want and more
   importantly, seal it and make it private. This lets the chambers hold information from each other
   even though they act as a single body. But all of this requires trust boundaries and the speaker
   position(s) are at the top of that. That's not just ceremony and why I want to actually have a real
   election."*
10. **The ceremonial face** — the oath; results read where the public sees them (the show; the
    Assembly hall in Saxonberg).

**Failure and its answers:** a **false certification** is visible (recount), void (Art. VII §3), and
grounds for removal. ⭐ **Sitting on a count** is the real abuse of a ceremonial office, so each
certification has a **deadline**: missed → the **Clerk of the House** (the Speaker's appointee)
certifies → missed again → **the count certifies itself at the deadline, on the record, marked
certified-by-default** (the one place code drives, because otherwise a ceremonial office holds a veto
nobody gave it) **[DECIDED — the owner accepted the recommendation]**. No Speaker yet → **caretaker
governance** (Art. XI): the founder certifies, publicly, until the first Speaker is seated.
**Neutrality** — whether a Speaker allocates on bills they certify (the Commons tradition) — is the
house's first bylaw.

### The first election — Speaker of the Capital House **[DECIDED — the owner]**

*"It's not an assignment, it's our first election."*

1. **The trigger, written and public**: at least **N members** of the Capital House **and** at least
   **X** total capital standing (both — members alone could be many with little at stake; standing
   alone, three big patrons). N and X: open.
2. **Nominations** — any Capital House member stands, with a statement.
3. ⭐ **The founder's declaration** — *"of course I'll abstain … my promise to abstain is contingent on
   seeing the nominees."* Between the close of nominations and the vote, the founder declares **on the
   record** whether they abstain — discretion made a public act, never a hidden override.
4. **The vote** — a fixed window, capital-weighted, under interim bylaws the founder sets as caretaker
   (the first Speaker's house may rewrite them).
5. **The count** — certified by the founder, the last one the founder certifies for that house; the
   Speaker is seated and takes the namespace.

Afterwards the seat is **held continuously**, challengeable by a house successor (the rest of the
Compact's pattern). On the front page: *be part of the first Speaker vote* — waiting (*opens at N
members and X standing — now n and x*), open, closed (front-page-slate).

### The seal's game theory **[DECIDED — the owner accepted the recommendations; B open]**

- **A seal hides intentions, never the vote** — counts and allocations are re-derivable (Art. VII §2).
  ⭐ **Conviction voting makes secrets short-lived**: weight builds only the longer it rests, so to win
  you commit early and visibly — sealed strategy buys only the time *before* commitment, which is
  where negotiation happens. Deals need privacy (the 1787 convention met in secret; open legislative
  committees grandstand more and compromise less).
- **What goes wrong at scale**: **brokers** (one person with standing and sealed access in several
  houses sees several hands); **leaks** (a seal holds against the platform, never people — inner rooms
  stay small; a leak is a story and the Post gets a beat); **cross-house cartels** (two Speakers
  sharing a sealed room against the third — the tobacco problem Art. IV records, made easier to form
  quietly); **the operator** (if people believe the founder reads sealed data at the machine layer,
  everything collapses into the founder seeing every hand).
- ⭐⭐ **Rule A — who is in the room is public; what is said is not.** Every sealed path's grant list is
  on the record (*seal, don't hide*, applied to people). Cartels can still form, never unseen.
  **Invariant, tier A** (Art. VII's record integrity) — lenses 1, 7.
- **Rule B — allegiance** — **[OPEN, the owner's: lens 4]**: sealed access in **one house's inner
  rooms at a time** (three class parties; keeps the Compact's three-way tension; brokers cannot exist;
  cross-house coalitions negotiated between Speakers) — **lean** — or **any number, publicly** (fluid
  coalitions; visible brokers).
- ⭐ **Rule C — seals expire by default**, the house able to extend; the default period is organic
  law (the Schedule of Parameters). Bargaining now, accountability later — the Fed releases full
  transcripts five years on; Madison's notes were published after his death — and the sealed history
  of the first laws becomes curriculum. Lenses 1, 5.
- ⭐ **Rule D — the operator.** At the permission layer the seal holds against everyone, the founder's
  in-platform accounts included; at the machine layer the operator holds the database. So: **disclose
  now** (in the oath and on the Speaker's page — the seal protects against everyone in the platform;
  the operator promises not to read sealed data at the machine layer), and **encrypt** with keys the
  operator does not hold **before the legislature controls real money or before 1.0, whichever comes
  first**. ⚠⚠ **Rules C and D collide**: an expiring seal needs a working key at expiry, possibly years
  and several Speakers later, so **key custody must outlive the people** — the key split among the
  house's officers so any few can recover it (Shamir's secret sharing). A requirement on D, not an
  option. Lenses 5, 6.
- **Likely at scale**: three house parties with small inner circles (under B's lean); Speakers as
  the real brokers, their grant lists showing it; a press beat on who is in which room; leaks as
  weapons, revoked access the only penalty (access is the currency); **the first scandal a cartel** —
  discovered, not suspected, under rule A.

### Lens pass

1. **Pedagogy** — presiding officers and neutrality; ⭐ **certification as the vulnerable ceremonial
   moment** (January 6, 2021 attacked a count's certification, not the count — the deadline fallback
   is the lesson); secret deliberation vs sunshine laws (1787); bargaining under hidden information;
   coalitions and cartels; cryptography and key custody; archives and declassification. Derivable:
   every count recomputable, every grant list readable. Chose rules A and C.
2. **Expression** — no code per committee (a group with grants), the namespace is documents, bylaws are
   text; each house organizes differently (Art. IV §6). Neutral on B.
3. **3a** — the Assembly hall, the oath, closed sessions as ordinary fiction made real. **3b** — the
   Speaker, the Clerk, committee members, the grant-list beat, the leaker, the whistleblower; the
   unwanted outcomes (cabals, cartels, a Speaker sitting on counts or sealing forever, leaks) each
   have an answer above.
4. **Values** — rule B (open); the founder's conditional abstention, public; neutrality as the house's
   first bylaw.
5. **Continuity** — the office outlives its holder; key custody must too (C × D). Chose C and D.
6. **Economy** — produces binding decisions and the bargaining behind them; consumes the Speaker's
   unpaid time (the seat's pay is its pen); the scarce good is access to sealed rooms; demand first by
   construction (the trigger); encryption a real build cost, hence a deadline.
7. **Governance** — removing a Speaker judges a person: criterion = a false certification (by recount)
   or missed deadlines; appeal = the judiciary (Art. VI); by the house naming a successor. **Tier A**:
   rule A, and the certification duty with its deadline fallback. **Organic law**: C's default period,
   the deadlines. **House bylaws**: officers, neutrality, committees. Encryption: executive
   implementation, judicial conformance.

### What has to be built

1. **The floor** (§ 7a) — bills as Subjects, the second, positions per stock, the survival floor and
   lifespan. The big piece.
2. **The tally per house with quorum** — the built conviction substrate over allocations on bills; the
   roll derived from standing.
3. **A `chamber` verb** (`house` is banking's): `chamber` (your house — members, quorum, the Speaker,
   counts awaiting certification) · `chamber count <bill>` (anyone) · `chamber certify <bill>` (the
   Speaker or Clerk) · `chamber roll`.
4. **Certification records** in the governance record, with deadlines and the fallback, and `verify`
   (record-integrity slate) recomputing any count at its certified moment.
5. **Presentment** — certifications that make a law start the veto window; the no-veto-after-voting
   rule.
6. **The Speaker seat with real grants** — certify, appoint the Clerk, publish for the house — and
   **an office as a title holder** over `/compact/legislature/<house>/`.
7. **Sealing in the document tree** — contents hidden, existence and grant lists recorded, the
   founder's in-platform accounts excluded unless granted; expiry by default.
8. **House committees** chartered by the Speaker, seats filled by the house's tally.
9. **The election as a record** — trigger, nominations, the founder's declaration, the vote, the
   certification, seating.
10. **Capital standing** — the founding offering's windows and rate lock, behind the legal gate.
11. **The monthly jobs report**, generated from the record.
12. **The disclosure** of the machine-layer limit now; **encryption with split key custody** by the
    deadline.

Elections, polls and the whip count as one kind of question: [voting-slate](./voting-slate.md).

### Open

1. **Rule B — allegiance** (the owner's).
2. **N and X** — the first election's trigger.
3. **Zorkmid stipends** for office holders.
4. **The seal-expiry default period.**
5. **The certification deadline.**

## 7r. ⭐⭐⭐ Who directs enforcement — the Sergeant at Arms, the High Constable, the Clerk of the Court **[DECIDED — the owner, 2026-11-20]**

The owner: *"the Compact itself has chat and forum subjects that need moderation and that's like
bills on the floor … as soon as we set up the ability to introduce a bill, it's gonna need moderators
for the conversation that report to the Compact, not to the press. And then we need moderators too for
general reports — DMs, says or emotes or any kind of harassment the first-line moderators can't handle
… so that's a separate staff with a separate reporting structure."* This splits moderation-slate § 24's
single *Compact* launch team. **American names throughout.**

### The bodies, and who they report to

| institution | reports to | handles | its head |
|---|---|---|---|
| **the Saxonberg Post** | its stakeholders (founder default) | its sections and public channels | **Editor in Chief** |
| **the show** | the show's committee (the founder manages it) | stream chat, in game and on each carrier | — |
| **the floor** | **the legislature — the three Speakers jointly** | bill threads; the floor's forums and chat | ⭐ **Sergeant at Arms** |
| **the Constabulary** | **the executive** | reports with no local home (a DM belongs to no channel — § 23's lowest common holder is the root), escalations from first-line teams, the reserved list | ⭐ **High Constable** |
| **the court** | **the judiciary** | appeals and cases | ⭐ **Clerk of the Court** |

### The Sergeant at Arms — order on the floor

Order in a chamber is the legislature's own business, never the executive's: the presiding officer keeps
it (the Commons Speaker names a member; the US Speaker calls to order) and the **Sergeant at Arms**
enforces it — an officer of the legislature, not the government (the Commons has had one since 1415).
**One floor and three Speakers**, so **the Speakers jointly appoint and oversee** the Sergeant at Arms,
who leads the **floor deputies**; the founder appoints as caretaker until then, and **a Speaker seated
first decides** in the meantime.

- **Content-neutral** — time, place and manner, never viewpoint (§ 24).
- **Bounded by its reach** — removal from the floor's Subjects at most (§ 23).
- ⭐ **Floor privilege** — debate answers **only to the floor's own officers**; the Constabulary cannot
  sanction a member for what they said on the floor, the **reserved list** excepted (it always goes to
  the root). The precedent: the English Bill of Rights 1689, art. 9; the US Speech or Debate Clause.
- **The floor's seats open the moment a bill can be introduced.**

### The High Constable — keeping the peace, never content

The owner, rejecting *Commissioner of Conduct* as too Orwellian: *"it's content moderation … approving
consumer content is basically censorship, which is why finding a good name for it is hard and Orwell
ruined all the good words."* **The office polices how people treat each other — harassment, threats,
disruption — never what anyone says or makes.** Approving content is the court's, and only for labor's
content. ⭐ **A constable keeps the peace and serves process** — exactly a hold: stop the harm, hand the
matter on; never judge, never vet speech. American history: **New York City's High Constable**
(1802–1844, Jacob Hays throughout), the chief of the city's peacekeepers before a police department
existed. The office is **the Constabulary**; its officers **constables**. (*The Department of Decorum*
was the satirical alternative.)

- An **enforcement institution** of the executive (Art. V §5), chartered by the legislature; its acts
  are **holds** (moderation § 14a); anything over the line becomes a case.
- ⭐ **Tenure** — *"never the personal instrument of the Prime Minister"* (Art. V §5): **appointed by the
  PM, confirmed by the floor** (confirmations are on the secret-ballot list, § 7b); **removable by the
  PM only with written public reasons and a notice period during which the floor can object** — the US
  inspectors-general removal rule (30 days' notice), borrowed. The PM can fix a bad High Constable;
  firing a good one costs something in public. **It binds the founder as acting PM.**
- (*Inspector General* is a different, later seat — a **watchdog over every body's moderators**:
  reversal rates, complaints about seats. Worth having once there are enough enforcers to watch.)

### The Clerk of the Court — a sacred trust, elected by every citizen

The Clerk decides nothing but **drives the court's commands** — draws juries by verifiable lot, files
rulings, keeps the docket — a public trust like a Speaker's certification. The owner, rejecting
selection by lot: *"I described the office as a sacred trust like I described the speaker's role
despite being ceremonial. Would you select a speaker by lot? I don't think so."* And *"the court is
everyone, just like the legislature is"* — there is no standing body of judges to appoint anyone.

- ⭐ **Elected by every citizen, one member one vote** — standing counts for nothing. The constitution's
  own principle: when the jury pool is the citizenry it is egalitarian, *"influence and reputation
  counting for nothing"* (Art. VI §4). The American precedent: clerks of court are elected officials in
  much of the US (every Florida county elects its Clerk of the Circuit Court). The pattern:

  | office | chosen by | weight |
  |---|---|---|
  | a house's Speaker | that house | its standing |
  | the Prime Minister | the floor | a majority of houses |
  | **the Clerk of the Court** | **every citizen** | **one person, one vote** |

- **A fixed term** — a sacred trust wants stability; **removal never by the court the Clerk runs** — by
  the floor, for cause (the impeachment model). The election machinery is the voting slate's, counted by
  heads ([voting-slate](./voting-slate.md)).
- **Bootstrap:** the founder is the court's pool of one, hearing appeals on stream as content and doing
  the Clerk's work, labelled honestly (Art. VI at a pool of one, operator-overridable). Independence
  meanwhile rests on disclosure and every case heard in public.
- ⭐ **The second election** (the owner): the Clerk of the Court is elected **after the Speaker of the
  Capital House**, unless the other two Speakers' elections come first; its timing is the founder's,
  and it is due no later than **the court widening beyond the founder** — the first sortition panel, or
  a ratified due-process right (Art. VI §5).

### The four top seats are incompatible **[DECIDED]**

**Sergeant at Arms, Editor in Chief, High Constable, Clerk of the Court — nobody holds two at once.**
The real rule: the US Constitution's Incompatibility Clause (Art. I §6) bars anyone holding a federal
office from sitting in Congress; most parliaments bar officials and judges from the legislature —
because one person in two such offices joins powers the system keeps apart. The press seat matters most:
an Editor in Chief holding a state seat would be the state reporting on itself. These seats **direct
enforcement; they never make rules** — the Compact does.

**Rank-and-file moderators may serve several bodies** (the owner: *"most mods will work in more than one
office for a little while"*), each act taken from one seat and logged under it (§ 24) — **and must know
each body's rules**. The same holds for private moderators in guilds and businesses. The show's
moderators and the game's will overlap; they are still different bodies with different authority.

### One report desk, two back offices **[DECIDED — lens 2]**

A player should not need to know which institution they need: **one `report` command and desk** takes
everything; intake routes **reports to the Constabulary** and **appeals to the court** (a moderator
never hears an appeal of their own action, moderation § 14). The routing goes on the record, so nobody
loses a complaint by misfiling it.

### What to advertise now

Three seats, **each posted by the body that appoints it**, so the different authorities show from the
start:

| seat | posted by | selection |
|---|---|---|
| **Sergeant at Arms** | the Compact's press office, for the legislature | the founder as caretaker; a seated Speaker if one exists first; the three Speakers once all houses run |
| **Editor in Chief of the Saxonberg Post** | the Saxonberg Post | its stakeholders (the founder, by default) |
| **High Constable** | the Office of the Prime Minister | appointed by the PM; confirmed by the floor once it can confirm |

**Every posting says:** which body the seat belongs to and its rules; that **the seat directs
enforcement and never makes rules**; that **the four top seats are incompatible**; that moderators under
any of them **may serve several teams**, one seat per act, under that body's rules; and that
**everyone is restaffed** by the proper appointing authority once all three houses run. The Clerk of
the Court is **not** advertised — it is elected. On the front page, the three are the Make line's open
seats, ranked by load in the monthly jobs report (§ 7q).

### Open

1. The Clerk's term length and the tenure threshold for voting.
2. The High Constable's notice period.
3. When the Inspector General seat is created.

## 7s. ⭐⭐⭐ Who authors a business — titles, grants, and the first statute book **[DECIDED — the owner, 2026-11-20; lens pass]**

The owner, asking where the show's content and authority come from: *"either the taxonomy is wrong or we
have to be able to attach controls that someone at the top of the tree is bound to with regard to their
descendants."*

### Where versus who — and the fix to § 7l

**A path says where something is; a title says who holds the pen.** Authority resolves by title,
longest prefix first (parcel.md: chain of title, `subdivide`, `transfer`), so a business at
`/world/terminus/…` under its own title is the business's, though the path runs through Terminus.
Businesses live **with their place** in the locality's tree (shipped: `/world/terminus/hearthworks`,
`…/hearts-delight/…`, `…/hollow-mere/idea/ice-company`) — never under `/corpo/`, which is the handful of
megacorps. Home directories are the sandbox, unpublished and unprivileged; nothing public is served from
one.

⭐ **The gap:** § 7l said *"a private parcel is a committee of one, granted its subtree"* and *"the grantor
may revoke"* — Terminus could revoke a business's premises. **Grants delegate; titles convey:**

| | **grant** (delegation) | **title** (property) |
|---|---|---|
| is | a parent lending part of its authority | a parent conveying property |
| the parent may | revoke, on the record, appealably | **only** what private protections allow |
| fits | a city block's committee, a public office, an institution | a business's premises, a home, a private parcel |

**A parent is bound toward a titled descendant by the private protections** (§ 7l: the right to exclude, a
warrant before public power enters, no taking without compensation, appeal to the Compact always) **and
the Compact's law — and by nothing else.** Its public law still applies inside its borders: zoning (land
use resolves by `landUseOf`), local conduct rules that add to the code and never subtract, its covenants.
Whether a city's committee plays that out as a fiction of town government is its own choice.

### Where content comes from, and how it is reviewed

- **The city provides the lot; the holder fills it in.** The city subdivides from its plat (the settlement
  model's plat book; Hinkley's lane ships), sold through **Mayfield & Co.** (one realty office fronts
  every plat book — holding.md D14), with its boundaries, frontage and zoning, and may offer a building
  shell (`FloorplanWarren`, the plan on the owner's row). Everything inside is authored **under the
  holder's title**. **Hiring** someone to build is a sub-grant of the holder's parcel — authority always
  flows from the title.
- **Review** — the procedure law's **class 4** (§ 6): *content in your extent, by the extent's holder,
  within its covenants; authority: title; review: after merge, on challenge.* Two things lift it out:
  **levers** (prices on NPC businesses, NPC demand, faucets — the authors'-conflict rule sends them to
  governance when the author has a stake) and **code** (the wizards' pen; class 1 if it changes no law,
  **class 5 — reviewed before merge** — if it adds law-bearing behavior).

### The founder on both sides

Today the founder holds Terminus's title by default (caretaker) **and** is a business in it. Written
honestly: *as founder I hold Terminus's pen; as Bobalu Smallberries I am a business in it*; every act names
its seat. ⚠ **Self-dealing on the founder's own premises** (lens 7): a committee setting terms for ground
it conveys to its own holder is a lever with a stake — so the founder takes premises **on the published
terms anyone gets, on the record**, never special ones.

### The statute book — start it now **[DECIDED]**

`docs/compact/law/`, beside the draft constitution and the founding charter. Three statutes, **received
law** the founder enacts under Art. XI and the legislature may amend:

1. **The Procedure Act** — § 6 as statute text; every merge carries its class and authority; its first
   reader is the merge check.
2. **The Title Act** — grants delegate, titles convey; subdivide and transfer; the private protections;
   what a parent may and may not do to a titled descendant.
3. **The Terminus Charter** — the city's grant from the Compact: its extent, its public-law powers
   (zoning, local conduct additions, covenants) and its public duties. ⭐ Because *no escalation — grant
   only a subset* (§ 7l), **the charter is a Dillon's Rule charter** (a city has only the powers expressly
   granted), against **home rule** (every power not denied) — a real lesson and the legislature's to change.

⭐ **The code cites them** — the tech-tree slate's annotation palette (§ 6b: inert, typed decorators behind
an import gate, each shipping with its first reader): `ParcelRegistry.subdivide` / `transfer` carry
`@law(Laws.TitleAct)`, the protections `@clause` statics, the merge check reads each MR's class and
citation. Law, code and the link between them, on the record from the first statute.

### Lens pass

1. **Pedagogy** — property law (title against license, takings, *Cedar Point*, the warrant); administrative
   law (the Procedure Act); municipal law (Dillon's Rule against home rule); the code citing its statutes
   so law becomes curriculum. **Chose** the statute book with citations.
2. **Expression** — a business is rows under a title; crew are positions; house rules a document; lots
   from a plat; every business and every streamer the same path. **Chose** the lot from the plat, filled by
   the holder.
3. **3a** — a realtor selling city ground; a studio seen from the street; the founder as an ordinary
   tenant in town. **3b** — realtor, hired builders, constables, a show's crew; the unwanted (a committee
   leaning on its parcels, a landlord gouging, the founder on both sides) each answered.
4. **Values** — titles convey; protections bind the parent.
5. **Continuity** — caretaker enactments become received law, amendable after handover; a business's
   records belong to it, not to the founder's seat.
6. **Economy** — a business employing a crew (labor demand), a lease, a lot sale into the city treasury;
   paid by the founder in zorkmids as a player; crew wages the business's choice (the Terminus Gazette's
   editor already sits at zero).
7. **Governance** — grants against titles closes § 7l's revocation gap (the Title Act); self-dealing on
   the founder's premises answered by published terms.

## 8. Lens pass

1. **Pedagogy** — the government is legible as a system a student can derive: three outputs, one
   record, one test (*does the law justify the code?*). Administrative law, the veto and judicial
   review are real doctrine taught on a working instance.
2. **Expression** — routine work (classes 1–4) needs no machinery, so authors and wizards build
   freely; the legislature can say anything, so the polity's expressive range is never the
   executive's to narrow.
3. **3a Immersion** — the record, the docket and the procedure law are out-of-fiction governance
   (the meta layer); the fiction's own governments sit on the same shape. **3b Participation** —
   every branch has real work: the legislature's statutes, the institutions' seats, the court's
   review. Players can do something we did not want — repeal the procedure law's grants, unseat a PM.
4. **Values** — how much the executive may do without asking (the procedure law's dial), and
   deference on ambiguous prose, have no right answer; the polity decides.
5. **Continuity** — the record starts now, under the procedure law as a norm, and carries through
   every version; the amendment diff makes each change of reality a recorded act.
6. **Economy** — routine work stays cheap; class 5 and the court cost time, which is the price of a
   change to what is true. Who pays judges and institutions is the budget's question.
7. **Governance** — the court names its criterion (the cited law), the remedy (revert) and the
   appeal; the PM answers to 3 of 3; the procedure law is itself amendable.

## 9. Open

1. **The court's powers** — the Marbury path or a manifesto amendment (§ 5).
2. **The emergency window** — a game week, say, forces ratification; too short and fixes are reverted
   while the legislature is idle.
3. **Who owns the classifier's rules** — lean: in the procedure law as typed clauses, so the
   legislature sets them and the executive only implements.
4. **Deference** — on ambiguous prose, whose reading wins: the executive's (*Chevron*) or the court's
   (*Loper Bright*, 2024)?
5. **Standing** — who brings a challenge after merge: anyone affected, any legislator, the court on
   its own motion.
6. **Can the veto reach a self-executing law?** It probably must, or the legislature routes around the
   veto by legislating only values into existing slots.
7. **Is there a deadline on codification?** A founding statute could set one, turning a slow-walk
   into a breach of mandate the court can find.
8. **The carrying threshold** — a share of present standing, how high, and a floor of total standing
   so a handful of people cannot carry an empty room (§ 7a).
9. **The PM's window *N*** and the lapse periods (§ 7a).
10. **Which bills are secret ballot** — the procedure law's list (§ 7b).
11. **Committees gate or report** — lean report, budget origination the exception (§ 7d).
12. **Continuous committee seats or periodic elections** (§ 7d).
13. **The budget committee's default ratio** — capital-heavy, or a Commons-style purse (§ 7d).
14. **Treasury revenue** — taxes, fees, fines, and whether seigniorage reaches the treasury, by rule
    only, or the PM's mint loophole returns through the treasury (§ 7g).
15. **Which tools are diegetic**, and how an out-of-fiction tool shows in the world (§ 7f).
16. **The waiting multiplier's curve** — how fast a neglected clause's weight rises (§ 7h).
17. **Open procurement** — can anyone claim a bounty, or only those an institution vets? The court
    reviews every merge either way (§ 7g; the owner: *"more later"*).
18. **Seating the high court** — by the PM with confirmation, by the tallies, or by lot from the
    credentialed (§ 7j).
19. **Removing a high-court judge** — probably the legislature's 3 of 3 (§ 7k).
20. **The small-pool rule** for the early game (§ 7j).
21. **Grants that survive content rewrites** — bind to the title, not the path (§ 7n).
22. **The private protections and the owner's deference** — warrant, compensation, exclusion: the right
    three, or more? (§ 7l)
23. **Funding compensation for a taking** — waits on treasury revenue (§ 7n).
24. **Drafting beyond `bill clause`** — does drafting need a real editor? Plausibly the first governance
    GUI piece worth building (§ 7m).
25. **Default standards of proof** per kind of case (§ 7o).
26. **The expungement period and the default sentence ranges** (§ 7o).
27. **Counsel for someone who cannot pay** — appointed and paid by the court? (§ 7o)
28. **Who prosecutes on a private parcel** — the owner, or the extent's prosecutor? (§ 7o)
29. **How the conduct track meets the moderation and prison slates** (§ 7o).
30. **Allowances for value clones** — their sizes and which offices hold one (§ 7p).
31. **The coin gap** — closing clone's path to money before launch (§ 7p).

## Cross-references

- [tech-tree-slate](./tech-tree-slate.md) — code is reality; the annotation palette; the amendment
  diff; the receipt
- [legal-code-slate](./legal-code-slate.md) — law as content, received law, `<extent>/law/`
- [executive-slate](./executive-slate.md) — the executive log (authority invoked, sunset) and
  emergency acts, which § 6's classes would fill
- [courts-slate](./courts-slate.md) — cases between persons, the pool, the docket
- [compact-political-science](../../compact-political-science.md) — the three chambers as three tallies
- [measurement.md](../../measurement.md) — the entrenchment tiers
