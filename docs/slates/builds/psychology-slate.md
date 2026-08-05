# Psychology slate — the profession that reads you, and why disclosure IS discovery

**Captured 2026-08-04.** It started as a *rights* question — the
manifesto appendix work asked whether you may see your own trait
position, and who owns that data — and turned into a vocation:

> **User: "this suggests a new industry/vocation/discipline: psychology.
> I'm not sure how it'd work without seeming contrived, but if you want
> to know your traits you go to therapy. There's a real pedagogy to that
> and it's honest."**

And then the mechanic that makes it more than flavour:

> ⭐⭐⭐⭐ **User: "you have this personal record that's private (the engine
> reads it but not other players directly). Choosing to share that record
> with your therapist is an actual mechanic, and if we can bind it
> mechanically to trait discovery that's even better. **You only discover
> what you choose to reveal.** There's more than pedagogy — there's legal,
> political and economic tie-ins as well (it started political even)."**

> **Status: design conversation, captured. Not requirements.**

Related: [trait.md](../../subsystems/trait.md) (**the shipped substrate —
17 opposed pairs, `disposition_events`, derive-on-read `TraitPosition`;
read it first**), [mind-slate](./mind-slate.md) (*"state is a
relationship, not a readout"* — this is that, staffed),
[harm.md](../../subsystems/harm.md) (the medic vertical this is the
mental sibling of), [pharma-slate](./pharma-slate.md) (the credence-good
frame), [enforcement-slate](./enforcement-slate.md) (the evidence
firewall; testimony as claims), [insurance-slate](./insurance-slate.md),
[content-packs-slate](./content-packs-slate.md) (sink trades),
[vocations.md](../../vocations.md).

---

# ⭐⭐⭐ Why it is not contrived: you cannot read yourself

The obvious objection is that *"go somewhere to see your character
sheet"* is the classic MMO trainer contrivance. The answer is that the
constraint here is **the real one**:

> **You cannot read yourself. Another person can.**

People are systematically poor at self-assessment and considerably better
at reading others. That asymmetry is **why the profession exists**, and
it makes the second person *necessary* rather than convenient.

⭐ It also inverts the usual instinct: **a stat sheet showing your own
personality would be the UNREALISTIC feature.** The engine already
derives `TraitPosition` and shows nobody — so privacy is the default and
costs nothing. **The build is not "hide it." The build is "let you
disclose it."**

---

# ⭐⭐⭐⭐ Disclosure IS discovery — the load-bearing mechanic

Your `disposition_events` are your behavioural record. You choose **which
slice** to disclose; the reading is built from that slice and nothing
else.

- disclose your combat history → learn about wrath, courage
- disclose your social history → learn about trust, guile
- ⭐ **withhold the embarrassing part → get an incomplete reading**

> ⭐⭐⭐⭐⭐ **Therapy works only to the extent you are honest with your
> therapist.** That is not a game mechanic dressed as psychology — it is
> the central truth of the practice, made mechanical.

**And it must not be punitive.** Withholding is not cheating and carries
no penalty; you simply learn less. The cost is the thing you did not find
out, which is exactly the real cost.

⭐ This also answers the appendix's open ruling — *"can you see your own
trait position?"* — **without a permission flag.** It is not a right
granted or withheld; it is a relationship you build and a disclosure you
choose.

---

# A READING, not a readout

The other half of avoiding vending-machine therapy: **do not print
numbers.**

> Not *"your wrath is 0.72"* but *"you escalate when you are cornered —
> I have watched you do it three times."*

Interpretation: partial, improvable across sessions, and **contestable**.
You do not receive an authoritative record of yourself; you receive a
professional opinion you may disagree with — which quietly answers the
data-rights question from the other side.

---

# ⭐⭐ A player vocation, not an NPC service

This is what turns a feature into a system:

- ⭐⭐ **consent becomes playable** — disclosing to another *player* is
  the digital-rights question made concrete, and it behaves like medical
  records: voluntary, scoped, confidential by norm
- **a social skill the record can evidence** — the lounge's *"where soft
  skills get evidenced"* finally has a discipline attached
- **a person cannot be farmed** the way a vendor can

## The mechanism: a scoped disclosure grant

The shape already exists — `UseGrant` on parcels is scoped, revocable and
time-bounded. A **disclosure grant** is the same object pointed at a
slice of `disposition_events`: *which domain, which period, to whom,
until when.*

⭐ **Revocable, and the revocation is the interesting part** — you can
end a therapeutic relationship and take your disclosure back, but you
cannot unsee what was read.

## ⭐ The therapist's file is a real object

A reading, if recorded, lands in **the practitioner's records — not in
your public record.** That matters:

- it is a **record about you, held by someone else** — the `beliefs`
  problem again, now deliberate instead of accidental
- it creates the artifact that **privilege protects and a court might
  want**

⚠ **Nothing a reading produces should write to your transcript or
chronicle.** The moment a therapist's opinion becomes part of your public
record, disclosure stops being safe and the whole mechanic collapses.

---

# The four tie-ins

## Political — where it started

**Consent vs. compulsion** is the whole fight. May a court order
disclosure? May an employer require an assessment before hiring? May a
locality condition residency on one?

⭐ It also makes the *"who counts"* question concrete: **if traits can be
demanded, they become a discrimination vector** — which is the
equal-protection module with something specific to bite on.

## ⭐⭐ Legal — privilege, and a conflict CLASS rather than a special case

Therapist–client privilege is a real, specific construct, and it is
**the same shape as the press module's source protection**: a
professional confidence opposing an accused's right to confront.

> ⭐⭐⭐ The amendment library currently lists *source protection ⊗
> confrontation* as its **only** catalog-level conflict entry. This is a
> second instance — which means it is not a special case but **a CLASS:
> privileged relationships versus the confrontation right.**

Generalizing it is worth more than either entry alone.

Also live: **capacity** (is someone fit to hold an office, sign a
contract?), and the evidence firewall — *testimony is claims, not
queries* — which a practitioner's reading fits exactly, being an opinion
rather than a database lookup.

## ⭐⭐ Economic — the second credence good

[pharma-slate](./pharma-slate.md) established the frame: **a credence
good is one whose quality you cannot verify even after consuming it, so
it demands institutions** — licensing, malpractice, professional bodies.

> **Psychology is the second credence good, and a purer one.** You cannot
> check whether the reading was any good. Ever.

Which makes the institutional apparatus *necessary* rather than
decorative, and gives the discipline somewhere to go beyond skill level.

Also: **insurance** ([insurance-slate](./insurance-slate.md) — *the record
makes actuarial science playable*) has an ugly and entirely real
connection here, and **employment screening** is the live dystopia.

## Pedagogical

Not *"personality is measurable"* — that is the shallow reading. The
lesson is:

> ⭐⭐ **The measurement of persons is a PRACTICE WITH ETHICS, and the
> ethics are the whole difference.** Care and profiling are the same
> skill; consent is what separates them.

---

# ⚠ Guardrails

| | |
|---|---|
| **never a progression gate** | traits drive behaviour whether or not you know them. Knowing is for *your* understanding — the odometer rule, exactly |
| **not detect-alignment** | if a reading is a tactical edge in social conflict, the discipline is an intelligence tool and the care framing is cosmetic |
| **slow and relational** | one session must not produce a full picture. Therapy that resolves in a transaction is the trivialising version — and given the accuracy standard [mind-slate](./mind-slate.md) sets, that is the failure mode to design against hardest |
| **no penalty for withholding** | or disclosure becomes coerced by mechanics rather than chosen |

---

# Open questions

1. **Can a practitioner read WITHOUT a grant, at reduced fidelity?**
   Observing someone in play is how real impressions form. *Leans yes but
   vague* — impressions from behaviour you witnessed, versus a reading
   from a disclosed record. That preserves the asymmetry without making
   the grant pointless.
2. ⚠ **Is the practitioner's file discoverable by a court?** The
   privilege question in one sentence. **Deciding it establishes the
   conflict class** above.
3. **Does the discipline confer anything besides reading?** Treatment —
   the [mind-slate](./mind-slate.md) stress/mood axis — is the obvious
   second half, and probably the larger one.
4. **Self-disclosure to an NPC practitioner at launch?** A player
   vocation needs players. ⚠ An NPC therapist is the cold-start answer
   and also the trivialising risk — the reading must stay a reading.
5. **What stops a practitioner publishing what they learned?** Norm,
   mechanic, or law? *Leans law, enforced by reputation* — which is the
   most realistic and the most playable.
