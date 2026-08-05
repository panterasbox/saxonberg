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

# Open questions

1. **Snooping and impersonation: one duty or two?** Real law splits them;
   *leans one duty of loyalty* at this scale.
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
