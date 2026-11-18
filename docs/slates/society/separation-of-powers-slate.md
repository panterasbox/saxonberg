# Separation of powers slate — law, code, and law == code

> **Status: UNBUILT** — talked through with the owner 2026-11-18, out of the
> [tech-tree-slate](./tech-tree-slate.md)'s finding that **code is reality** and the law and the
> curriculum describe it (§§ 6a–6d there). The owner: *"I kinda wanna use this as a jumping-off point
> to actually start drilling into the governance design for real — what are the various inputs and
> outputs for the different bodies within the different branches."*
> **Left:** the procedure law — its classes, its classifier, its emergency window (§ 6) · every merge
> carrying its class and authority (§ 7) · the law states (§ 3) and their record · the veto, the
> override and no confidence (§ 4) · the court as code review — judges' credential, deference,
> standing, the remedy (§ 5) · institutions founded by statute (§ 2) · the commoner's procedure —
> `bill` and its subcommands, the second, the bill's states and record (§ 7a) · the legislator's
> reports — the diff, the fiscal arithmetic, affected counts, conflicts, watches, the agenda (§ 7b) ·
> the secret-ballot list · the counsel office's LLM staff (§ 7c) · the budget committee (§ 7d)
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
- **One chief executive, the PM**, holds the veto (§ 4).

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

## Cross-references

- [tech-tree-slate](./tech-tree-slate.md) — code is reality; the annotation palette; the amendment
  diff; the receipt
- [legal-code-slate](./legal-code-slate.md) — law as content, received law, `<extent>/law/`
- [executive-slate](./executive-slate.md) — the executive log (authority invoked, sunset) and
  emergency acts, which § 6's classes would fill
- [courts-slate](./courts-slate.md) — cases between persons, the pool, the docket
- [compact-political-science](../../compact-political-science.md) — the three chambers as three tallies
- [measurement.md](../../measurement.md) — the entrenchment tiers
