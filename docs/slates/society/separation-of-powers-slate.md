# Separation of powers slate — law, code, and law == code

> **Status: UNBUILT** — talked through with the owner 2026-11-18, out of the
> [tech-tree-slate](./tech-tree-slate.md)'s finding that **code is reality** and the law and the
> curriculum describe it (§§ 6a–6d there). The owner: *"I kinda wanna use this as a jumping-off point
> to actually start drilling into the governance design for real — what are the various inputs and
> outputs for the different bodies within the different branches."*
> **Left:** the procedure law — its classes, its classifier, its emergency window (§ 6) · every merge
> carrying its class and authority (§ 7) · the law states (§ 3) and their record · the veto, the
> override and no confidence (§ 4) · the court as code review — judges' credential, deference,
> standing, the remedy (§ 5) · institutions founded by statute (§ 2)
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

## Cross-references

- [tech-tree-slate](./tech-tree-slate.md) — code is reality; the annotation palette; the amendment
  diff; the receipt
- [legal-code-slate](./legal-code-slate.md) — law as content, received law, `<extent>/law/`
- [executive-slate](./executive-slate.md) — the executive log (authority invoked, sunset) and
  emergency acts, which § 6's classes would fill
- [courts-slate](./courts-slate.md) — cases between persons, the pool, the docket
- [compact-political-science](../../compact-political-science.md) — the three chambers as three tallies
- [measurement.md](../../measurement.md) — the entrenchment tiers
