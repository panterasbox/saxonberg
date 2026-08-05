# Wizard duty slate — law suggested by the technology itself

**Captured 2026-08-04**, as the last dimension of the law-source hunt:

> **User: "law informed by the technology. These are restraints on
> wizards as a privilege… wizards can do all sorts of stuff just because
> they can write code. We can't monitor all of it, and **runtime guards
> only really guard good faith engagement.** If a wizard wanted to snoop
> or impersonate another user they could do it perfectly and there's not
> much we can do to catch it. This is Jesse Schell's 4th corner of the
> tetrahedron."**

⭐ The framing earns its place: in the Elemental Tetrad, **Technology is
the corner the player never sees** — it makes the other three possible
and is invisible until it fails. **The law it suggests has the same
property: nobody notices it until it is violated.**

> **Status: design conversation, captured. Not requirements.** The
> honest version, deliberately — the reassuring version would be worse
> than useless here.

Related: [call-security.md](../../subsystems/call-security.md),
[access.md](../../subsystems/access.md) (the code-trust lockdown; the six
orthogonal axes), [branch-policy-slate](./branch-policy-slate.md) (*better
a visible override than an imaginary guarantee*),
[record-integrity-slate](./record-integrity-slate.md) (**anchoring beats
chaining** — the one mechanism that survives),
[balance-slate](./balance-slate.md) (the PM chain; the ops seat; the
inalienable floor), [sandbox.md](../../subsystems/sandbox.md),
[rerecord-appendix-plan](../../manifesto/rerecord-appendix-plan.md).

---

# ⭐ The premise, stated without comfort

> **Runtime guards constrain code that goes THROUGH the framework. A
> wizard has left the framework by definition.**

Call-security, the proxy, the code-naming gate — all of it is a
**coordination device**, not a defence, against someone who can write
TypeScript. It prevents accidents, constrains protowizards, and makes
intent legible. **It does not prevent a wizard.**

The project half-knows this: branch-policy already says *"anyone who can
run arbitrary code can already write anything — a gate pretending
otherwise is theater."*

⚠ **But that concerns DELIBERATE overrides, which emit an event.** The
covert case — snooping, impersonation — **produces no event to log**, and
that is a different problem the corpus has not addressed.

## ⭐⭐ And the case that matters most here is not snooping

**It is fabrication.** The entire value proposition is an unforgeable
record; a wizard can write a chronicle entry, mint standing, or forge a
transcript.

> **The record is unforgeable relative to players. It is NOT unforgeable
> relative to operators.**

True of every system — your bank can edit your balance — but a project
that sells *the record is the point* should **say it** rather than let it
be discovered.

---

# ⭐⭐⭐⭐ The law the technology suggests: constrain by DUTY

Converges exactly with the corporate-governance mining:

> **When you cannot constrain by structure, you constrain by duty.**

Doctors, lawyers, accountants and sysadmins are **licensed rather than
sandboxed** — prevention is impossible, so the profession substitutes
duty, audit and disbarment.

> ⭐⭐⭐ **Wizardry is a fiduciary role, not a permission.**

The enforcement path already ships: **the PM may revoke any wizard**
([balance-slate](./balance-slate.md)). What is missing is the **duty**,
the **process**, and ⚠ the **safe harbour** — without which nobody sane
accepts the role.

## ⭐⭐ A wizard is a wizard regardless of position

> **User's call: "a wizard is a wizard regardless of their position."**

The duty attaches to **the capability, never the title** — which keeps
the axes orthogonal exactly as access.md already has them, and produces
two consequences worth stating:

- ⭐⭐ **There is no "acting in my official capacity" defence.** A PM who
  snoops cannot answer *"I was doing ops."* The duty is personal and
  constant. **That forecloses the commonest real-world excuse.**
- **It binds upward.** The founder, the PM and the ops officer are bound
  by it while holding code-trust, on the same terms as anyone else.

### ⚠ And the recursion has an answer, up to a point

*Who disbars the person who holds the revocation power?* Institutionally:
**remove the officeholder politically (a conviction crossing), and the
successor disbars them.** That is how it works for a real chief executive
— you are not prosecuted by your own department; you are removed, and
then you are.

⚠⚠ **But at launch the founder is the only archwizard, holds the seat by
default, and controls the infrastructure. There is nobody to remove
them.** The honest answer is not an institutional one:

> ⭐⭐⭐ **The founder's constraint is the AGPL. If the founder abuses it,
> you fork and self-host.** Exit is the check that survives when no
> institutional check exists.

Which is already the thesis — *the dial from operator to republic; you
can leave and take it with you.* **So "who watches the founder" answers
"nobody — you leave," and that is a better answer than a pretend one.**

---

# ⭐⭐⭐ Carve-outs: prohibition is the wrong shape

> **User: "we may need carve-outs for snooping — it can't be abolished,
> because the game has bugs and you need to troubleshoot things sometimes
> from a player's perspective. Same with impersonation to a lesser
> degree; we even have an `su` command designed somewhere to switch users
> in the current shell."**

Correct, and it reshapes the duty. Sysadmins read your data and support
impersonates customers because **that is the job**. The control was never
*"don't."*

> ⭐⭐⭐ **Not WHETHER, but WHY — and did you say so.**

**HIPAA is the exact model:** you may read a chart for treatment, payment
or operations; reading your neighbour's is a firing offence. **Same act,
different purpose** — declared, not inferred.

## ⭐⭐ Break-glass already is the corpus's vocabulary

branch-policy: *"the wizard axis **breaks glass**, and the override is
logged loudly."*

> **Extend break-glass from WRITES to READS and IMPERSONATION.**

| | |
|---|---|
| the act | **stays available** — never blocked |
| the purpose | **declared**, at use |
| the log | **conspicuous**, not quiet |
| the check | ⭐ **reviewed AFTER, never approved before** |

⭐ **Approval-before is the trap.** You need this at 3am with the thing
broken, so an approval gate fails exactly when it is needed. Hospitals
landed on break-glass for precisely this reason.

## ⭐⭐⭐⭐ `su` should be AGENCY, not identity substitution

The danger in `su` is not reading — it is that **an act taken while su'd
writes to the target's record.** A wizard reproducing a bug could post
messages, spend money, or mint chronicle entries *as the player*.

[agency-slate](./agency-slate.md) already answers it:

> **Authority from the principal, attribution to the agent.**

So `su` should not make you *become* the player — it should make you
their **agent**. Every act then carries both: the player's authority, the
wizard's name.

> ⭐⭐⭐ **Impersonation stops being perfect BY CONSTRUCTION.** The record
> reads *"Alice's account, acted by wizard Bob"* — because attribution is
> a separate field from authority, not a courtesy.

⭐ It costs nothing new: **`su` becomes a consumer of agency** rather
than its own mechanism, and the scariest capability becomes an auditable
one.

## ⭐⭐⭐ The meta-design that makes it hold

A wizard can still bypass `su` and write code that acts as the player
directly. Unpreventable. But:

> **Make the sanctioned path so convenient that using anything else is
> itself evidence of intent.**

That is how security actually works — do not block the bad path; make the
good path frictionless and treat **deviation as the signal**. And
deviation is exactly what external anchoring can catch.

## ⚠ The honest limit, and why it is acceptable

> **Break-glass is a GOOD-FAITH instrument.** It does not catch a hostile
> wizard — nothing does. It makes a good-faith wizard's actions
> **legible**, which makes a hostile one's **conspicuous by contrast.**

State that rather than overselling it.

## ⭐ The asymmetry psychology makes uncomfortable

**You cannot read yourself — but a wizard can read you.**
`disposition_events`, `beliefs`, and specifically **the slice you
deliberately withheld** from your therapist
([psychology-slate](./psychology-slate.md)).

⚠ That deserves naming out loud rather than being discovered, and it
argues for the **strong** break-glass on that data:

> **The subject is notified their record was accessed — by whom, when,
> and for what stated reason.** Some medical systems do exactly this.

A hostile wizard suppresses the notice. Again: **not who it is for.**

---

# The mechanisms, ranked by whether they survive a hostile wizard

| | Mechanism | Survives? |
|---|---|---|
| ⭐⭐ | **External anchoring** ([record-integrity-slate](./record-integrity-slate.md)) | ✅ **if the anchor is genuinely outside.** A wizard can forge a record; they cannot forge an anchor they do not control. ⭐ **Forgery becomes DETECTABLE rather than preventable** — which is the whole shift |
| ⭐⭐ | **Clients as witnesses** | ✅ a player's client saw what it was sent. ⚠ *Server-authoritative still holds* — the client is not **authoritative**, it is **a witness the operator does not control** |
| | **Just-in-time elevation** | ◐ a wizard is not *always* a wizard; elevate per task and log the elevation, so *"why were you elevated at 3am"* has an answer |
| | **Two-person rule** on the worst acts | ◐ right for ledger surgery or minting; absurd everywhere else |
| | **Public wizard roster** | ◐ the population is known and small, so suspicion has a short list |
| ⭐ | **Disbarment** | ✅ **the actual deterrent** — permanent and reputational in a small community |

> ⚠ **The honest limit: an operator can defeat any IN-SYSTEM control.**
> Only external anchors, external witnesses and consequence remain.
> Everything else is comfort.

---

# ⭐⭐ The video: "The people who can see everything"

Every platform has them. Almost none talk about it.

> **Saying plainly what the operator can do — and therefore what you
> cannot promise — is a rare and disproportionately credible move**, to an
> audience that has watched platforms abuse exactly this.

It is also directly on the market thesis: a community adopting this needs
to know the operator's reach, and **telling them beats being caught.**

⭐ Register: this is the one appendix that should *argue*, not just
describe — because the argument is **an admission**, and admissions
persuade in a way descriptions cannot.

---

# ⚠⚠ Axis hygiene — `requiresWizard` is doing work that is not its job

**Captured 2026-08-04**, found while designing
[credit-slate](./credit-slate.md).

> **User: "none of this shit should be using `requiresWizard` anyway,
> that's for exactly one thing — writing TypeScript code."**

⭐ **The correction already has a precedent in the codebase.** banking.md:
*"`reserve` is now Governor-gated… no longer `requiresWizard`: minting money
is a **monetary-authority act, not a code-trust one**."* That re-gating is
the template; it was simply never generalized.

**Every `requiresWizard` call site, classified:**

| Verb | Really code-trust? |
|---|---|
| `author/eval` — run a code snippet | ✅ **yes** — the axis exists for this |
| `author/reload` — hot-reload a template/instance | ✅ yes |
| `system/git` — engine source VCS | ✅ yes |
| `author/pack` — reconcile a content pack | ◐ borderline — packs may name `class:`, which *is* code-trust |
| `author/practice` — record an advancement deed | ⚠ **no** — a dev/debug harness |
| `system/config` — app settings | ⚠ **no** — an *administrative* axis (PM / ops) |
| `banking/house` — venue P&L + payroll | ⚠ **no** — **ownership.** Should ride `AccessApi.can` / parcel title. banking.md consciously parked it: *"(`house` stays operator-gated.)"* |
| `provision` / `unprovision` — dorm leasing | ⚠⚠ **no** — pure property + agency |

> ⭐⭐ **The tell: four of the eight are standing in for an axis that
> exists.** `house` wants title, `provision` wants agency, `config` wants an
> office. `requiresWizard` is being used as a generic *"an adult should do
> this"* gate — which is exactly the conflation
> [access.md](../../subsystems/access.md)'s six orthogonal axes exist to
> prevent, and exactly what the wizard-duty argument above depends on
> staying clean. **A duty attaches to a capability; it cannot if the
> capability means four different things.**

## ⚠⚠⚠ And one of them is a probable live defect

`provision` carries verb-level `requiresWizard`; **Katie is deliberately not
a wizard** (`KatieProvisioning.test` asserts `isWizard(katie) === false`);
her intake dialogue `dispatch`es `provision $player`. The authorization was
moved to `execute()` (`isDormsAgent` — *wizard OR agent of the dorms owner*,
the **correct** predicate) on the belief that a forced dispatch skips YAML
validators. **It does not** — proven by experiment 2026-08-04, see
[npc-dialogue.md § dispatch](../../subsystems/npc-dialogue.md).

⚠ **The fix is the re-gate, NOT deleting the validator.** An earlier
suggestion to "just drop `requiresWizard` from the verb" was the wrong
shape: it leaves the verb ungated at the YAML layer and keeps treating the
axis as noise. **`provision` should carry a dorms-agent/ownership validator
that says what it means** — the same move `reserve` already made.

⭐ Needs **live-driving**, not another green test: the existing test calls
`isDormsAgent` directly and never dispatches through the chain.

# Open questions

1. **Snooping and impersonation: one duty or two?** Real law splits them;
   *leans one duty of loyalty* at this scale. ⚠ Note both are
   **carve-outs, not prohibitions** — see above.
0. ⭐ **Does `su` land on agency before or after agency itself is built?**
   `su` is the most compelling first consumer, which argues for
   co-designing them rather than shipping `su` on a bespoke path that
   later has to be unpicked.
2. ⚠ **What is the safe harbour?** Without a business-judgment equivalent
   the role is unfillable — a wizard who breaks something in good faith
   must not be treated as one who snooped.
3. **Is the duty written into the constitution, or into the wizard grant
   itself?** *Leans the grant* — you accept it when you take the
   capability, which makes it a condition rather than an external rule.
4. ⭐ **Does JIT elevation buy enough to be worth the friction?** It is
   the only listed mechanism that changes daily practice, and the honest
   answer may be no at this scale.
5. ⚠ **Do clients actually retain enough to witness anything?** The idea
   only works if the client keeps a local log worth comparing — otherwise
   it is a nice property nobody can exercise.
