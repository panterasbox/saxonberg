# Wizard bar slate — the process the duty needs

**Captured 2026-08-12**, out of a conversation that started on code
hosting and turned into what a wizard *is*:

> **User: "no matter where you are in the game, some wizard or wizards
> have absolute authority over the code running in that parcel and can
> use that authority with limited oversight… the point is a guild just
> for wizards is a little bit of an oddball. It's definitely a statement
> on what we believe wizardry to mean."**

[wizard-duty-slate](./wizard-duty-slate.md) established the law —
**wizardry is a fiduciary role, not a permission** — and named exactly
what was missing: the **duty**, the **process**, and ⚠ the **safe
harbour**. Enforcement already ships (the PM may revoke any wizard). This
slate is the **process**, and it argues the safe harbour is the product.

> **Status: design conversation, captured. Not requirements.** Nearly
> every dial below ships with a default rather than a decision — see
> *§ Almost all of this is configuration*, which is the point of the
> slate as much as the institution is.

Related: [wizard-duty-slate](./wizard-duty-slate.md) (**the parent** —
the premise, break-glass, the recursion, the mechanism ranking),
[guild-slate](./guild-slate.md) (§ *Wizards and the Worldwrights* — the
credential-never-clearance wall this leans on),
[balance-slate](./balance-slate.md) (the PM chain; **burden ok /
exemption = capture**), [access.md](../../subsystems/access.md) (the six
orthogonal axes; `isWizard` as a fact about a *principal*),
[record-integrity-slate](./record-integrity-slate.md) (anchoring),
[agency-slate](./agency-slate.md) (`su` as agency),
[land-compute-and-license](./land-compute-and-license.md) (the
necessity-kernel test this slate applies to itself).

---

# ⭐⭐⭐ It is a bar, not a guild — and that is what stops it being an oddball

The unease in the capture quote is **correct about guilds and wrong about
this institution**, and the corpus already split them:

| | The Worldwrights | The bar |
|---|---|---|
| what it is over | a **craft** — scripting, template-craft, dialogue-craft, lore | a **clearance** — the `isWizard` code-trust bit |
| members | **majority non-wizard by construction** — associates script, members are protowizard authors | only holders of the bit |
| under which law | **realm** ⊕ meta — one of the two sanctioned membrane-straddles (commissions in realm money ⊕ producer influence) | **meta-state only. No straddle at all** |
| what it confers | recognition, the interior, a training budget | ⭐ **nothing** |
| what it imposes | dues, calls, teaching duty | duty, disclosure, disbarment |

> ⭐⭐⭐ **A guild for wizards would be an oddball. A guild for
> worldwrighting is not, and it is already designed.** The Worldwrights
> are a hall and a ladder for the *labor*; the bar is a licensing body
> for the *capability*. Keeping them apart is what stops either from
> being strange.

The wall between them is [guild-slate](./guild-slate.md)'s, unchanged and
load-bearing: **guild rank never confers `isWizard`.** A Worldwrights'
mastership is evidence an archwizard consults — *the bar exam, not the
judgeship*. An in-world social process must never mint out-of-fiction
root access.

## ⭐⭐ The test that keeps the bar clean

[balance-slate](./balance-slate.md), applied directly:

> **A body that imposes BURDEN on its members is fine. A body that grants
> them EXEMPTION is capture.**

So the bar admits, examines, publishes, hears complaints and disbars —
and confers **no in-world advantage whatsoever**: no title, no rate, no
access, no standing, no priority. ⭐ **If it ever begins conferring one,
that is the tell that it has gone wrong**, and it is a cheap thing to
watch for because the list of conferrals is short and authored.

⚠ Note the asymmetry that makes this necessary and that no other guild
has: **every other guild's power is in-world; this one's members hold a
capability that comes from outside the fiction.** That is precisely why
its only legitimate business is duty.

## ⭐⭐ And it is not a caste — do not name the complement

The conversation reached for *"we need a name for this class"* (the
non-wizards). ⭐ **The request is the tell.**

> **Once you have a word for the other 99%, you have built a caste.**

The MUD tradition proved it — `wizard`/`mortal` is why those worlds felt
feudal — and it is the same essentialism [species-slate](./species-slate.md)
already rules out (*difference that COSTS is character; difference that
RANKS is essentialism*).

⭐ **The corpus has managed without one, and that is not an accident.**
[access.md](../../subsystems/access.md) has `isWizard` as **a fact about
a principal** — a property of an authenticated session, orthogonal to any
character competence. There is no complement to name because it is not a
division of persons. You do not need a word for *"non-electrician."*

**If prose needs something:** `player` for the fiction (a wizard *acting
as a wizard* is not playing — true, and useful), and **trusted / gated**
for the engineering — whether the security framework is authoritative
over what you do. Descriptive, not social, and it does not survive being
turned into an identity.

---

# What the bar does — four functions and one product

The four are ordinary professional-body machinery, and deliberately so;
the interesting one is the fifth row.

| Function | Shape | Leans on |
|---|---|---|
| **Admit** | an examination against a stated standard, plus the archwizard's flip of the bit — **two separate acts, in that order, neither sufficient alone** | guild-slate's wall |
| **Publish** | the roster is public — who holds the bit, since when | wizard-duty § mechanisms (*"suspicion has a short list"*) |
| **Hear** | a complaint process any player can start, whose input is the break-glass record | wizard-duty § break-glass |
| **Disbar** | recommend or revoke (⭐ **the dial** — see below) | the PM revocation that already ships |
| ⭐⭐ **Safe harbour** | **the actual product** — a stated standard under which a wizard who breaks something in good faith is not treated as one who snooped | wizard-duty open Q2 |

> ⭐⭐⭐ **The safe harbour is why the institution exists at all.** Without
> it the role is unfillable — the parent slate says so plainly. A bar
> that only punishes recruits nobody; a bar that *defines what good-faith
> practice looks like* is the thing that makes accepting the capability
> rational. **Build it in that order:** the standard first, the
> discipline second, because the second is meaningless without the first.

⚠ **The hearing input problem, stated honestly:** the complaint process
consumes break-glass records, and break-glass is a **good-faith
instrument** (parent slate). So the bar adjudicates well over careless
and unlucky wizards and **not at all** over a hostile one. That is not a
defect to design away; it is the same limit the parent already named, and
the bar does not change it.

---

# ⭐⭐ Almost all of this is configuration, not kernel

**Captured because it was a live correction in the conversation** — the
first pass framed *"is the bar advisory or binding at launch?"* as a
founding decision about the meaning of wizardry, and got back:

> **User: "this feels like configuration not kernel level stuff."**

Correct, and [land-compute-and-license](./land-compute-and-license.md)
already said so: *almost none* of these regimes is constitutional, even
the firewall floor is chosen, **"Ch 7's amendment-roster logic all the
way down."** The operative test:

> ⭐⭐ **Can it be added later by amendment?** Yes ⇒ **configuration**:
> ship a default, say why, keep building. No ⇒ **kernel**, and it has to
> be right now.

Applied to everything in this slate:

| Question | Verdict | Default and why |
|---|---|---|
| Advisory or binding disbarment? | **dial** | ⭐ **advisory.** Strengthening is an amendment; weakening is a scandal — so take the weaker claim when the direction of change is asymmetric |
| Examination standard, rank ladder, admission floor | **dial** | authored, like any charter |
| Does the bar hear player complaints or only peer referrals? | **dial** | player-initiable; cheaper to narrow later than to widen |
| Two-person rule on ledger surgery / minting | **dial** | off; revisit when there is a second archwizard |
| JIT elevation | **dial** | off (parent slate: *the honest answer may be no at this scale*) |
| Whether the duty rides the constitution or the grant | **dial** | the grant — parent Q3 already leans it |

⚠ Two things in this design **fail** the test and are therefore the only
parts that must be right before there is a second wizard:

1. ⭐⭐⭐ **Evidence not captured is gone.** Whether a wizard's *reads* and
   *impersonations* emit a conspicuous record is not retro-fittable — the
   unrecorded acts have already happened, and no later amendment
   reconstitutes them. This is engine-physics, below the constitution,
   and it is the parent slate's break-glass extension. **The bar is
   worthless without it and it is worth something without the bar.**
2. ⭐⭐⭐ **Entangled namespaces do not come apart by policy.** Two live
   instances: an in-world social process minting `isWizard` (the
   credential-never-clearance wall), and — from the same conversation —
   coupling the in-game power grid to the compute meter. Both are cheap
   to keep separate now and unfixable later, because once the
   entanglement exists every downstream act depends on it.

> ⭐⭐ **That is the whole kernel here: what the engine makes un-erasable,
> and which namespaces it refuses to entangle.** Everything else is a
> preset.

---

# ⚠ What the bar does not fix

Inherited from the parent, restated so this slate cannot be read as
solving it:

- **An operator defeats any in-system control.** Only external anchors,
  external witnesses and consequence remain.
- **The recursion still bottoms out in exit.** *Who disbars the
  revoker?* — institutionally, remove them politically and the successor
  disbars them; **at launch the founder is the only archwizard and owns
  the box, so the honest answer is the AGPL: fork and self-host.** A bar
  does not change this. What it does change is that the answer stops
  being *the founder's discretion* the moment there is a second
  archwizard to hold the process — which is an argument for authoring it
  **before** it is needed, not after.
- ⭐ **It is a good-faith instrument.** It makes a good-faith wizard
  legible, which makes a hostile one conspicuous by contrast. Say that
  rather than overselling it.

---

# Open questions

1. ⭐ **Does the bar admit, or does the University certify?** Both
   institutions exist and both plausibly own the examination — a peer
   body that self-regulates vs. an examining institution with a
   transcript that already ships. **Leans University-examines /
   bar-admits** (the transcript is evidence; admission is a judgment),
   but this is genuinely unsettled and it changes what gets built.
2. ⚠ **What is the safe harbour's actual text?** Named as the product
   above and still unwritten. A business-judgment-rule equivalent is the
   obvious model; whether it protects *breaking things* only, or also
   *misjudging a break-glass purpose*, is the substance.
3. **Does a disbarred wizard keep their Worldwrights membership?** The
   wall says yes by construction — losing a clearance is not losing a
   craft — but it will feel wrong to somebody, and the felt-wrongness is
   worth answering out loud rather than by architecture.
4. ⭐ **Is the roster the whole transparency surface, or does the bar
   publish its hearings?** Publication is the remedy the vocations
   register prescribes for assessed-pays conflicts; a disciplinary body
   is not quite that class, but it is close enough to ask.
5. ⚠ **Does the bar exist before there is anyone but the founder in it?**
   An institution of one is theater. The counter-argument is Q's above —
   authoring it while it costs nothing is precisely how it is ready when
   it does.
