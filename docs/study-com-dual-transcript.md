# The dual transcript — claim vs deed, side by side

> **Status: design/sketch, aspirational.** A concrete integration idea:
> alongside Study.com's **official ACE transcript** (and its Credly
> badge), the game emits **its own transcript** — co-produced from the
> same credential event — and the *comparison between the two* is itself
> the product. Grounded in the verified Study platform
> ([study-com-platform-reality.md](./study-com-platform-reality.md)) and
> Saxonberg's existing `Transcript` / `chronicle` substrates. Nothing here
> has run against a live Study.com environment. It **changes nothing**
> about Study's transcript or Credly pipeline — it runs beside them.

---

## 1. You already have two transcripts — they answer different questions

- **Study's official transcript** — the accredited, ACE-recognized record
  that transfers to partner institutions: `Academic_Transcript_Request` →
  `Transcript_Review_Decision` → `Transcript_Partner_Delivery_Rule`
  (with `Transcript_Partner_Grade_Scale_Entry` for grade mapping), plus
  the `Credly_Badge_Template_Data` badge and `Certificate_For_Course`.
  It answers **"what did you complete and pass?"** In Saxonberg's own
  vocabulary it is a **`claim` ledger** — attested: you studied it and
  passed the instrument.
- **Saxonberg's transcript** — the `Transcript` (append-only evidence
  ledger) + `chronicle` (deed/claim identity ledger), with derive-on-read
  **competence bands** ([advancement.md](./subsystems/advancement.md),
  [chronicle.md](./subsystems/chronicle.md)). It answers **"what have you
  demonstrated you can do?"** It is a **`deed` ledger** — witnessed,
  applied, earned in play.

So the two transcripts are the **claim ledger vs the deed ledger** — the
exact deed/claim split already built into the chronicle. "Generate our own
transcript" is therefore **not new tech**: it is presenting the Transcript
you already keep, rendered as a document.

## 2. Co-production — "at the same time they cut theirs"

The credential event that produces Study's official transcript
(`Credit_Progress` → pass the proctored final → `Academic_Transcript_Request`)
is the **same event** that arrives on the integration's credential feed as
an inbound `LearningEvent` and mints the game `claim` row
([study-com-integration-spec.md](./study-com-integration-spec.md) §6.1).
So at the instant Study cuts the accredited transcript, the game can cut
its **transcript snapshot + a comparison view** off the same trigger. No
new hook — it rides the feed the integration already needs.

## 3. The comparison — a 2×2 where every cell is useful

Rows/columns are the two provenance kinds for the **same Discipline**:
Study's **claim** (passed?) × the game's **deed** (demonstrated?).

|  | **Deed strong** (game demonstrates it) | **Deed weak / absent** |
|---|---|---|
| **Claim strong** (passed) | ✅ **Corroborated** — passed *and* performs. An independent, applied, hard-to-game signal backing the credential. | ⚠️ **Over-attested** — passed the open-book final but can't do it in-world. A cheap tell the credential isn't backed by capability. |
| **Claim absent** (not passed) | 🎯 **Latent credit** — demonstrably competent, hasn't sat the exam. "You're already doing this — the exam is 20 minutes." | — (untrained; nothing to compare) |

**The ⚠️ cell already has a home on Study's side.** There is a real
`Transcript_Caution` (+ `Transcript_Caution_Email`,
`Transcript_Review_Decision`) construct — Study **already flags integrity
concerns on transcripts and routes them to human review.** The
over-attestation divergence feeds that existing path; the integration is a
new *signal into a mechanism they already run*, not a new mechanism.

## 4. Why each cell is a business argument (grounded in their concerns)

- **Corroborated →** the credibility asset for the ACE / academic-partner
  stakeholders, and sharpest **post-proctoring-removal**: Study's strongest
  signal is now an identity-verified open-book final
  ([platform-reality §6](./study-com-platform-reality.md)), and a deed
  transcript is a second, independent, *applied* signal that **raises the
  credential's value without touching the instrument**. This is the
  strategy doc's "mirror with receipts" made concrete — not "I completed a
  course" but "I completed it *and here are the witnessed demonstrations.*"
- **Latent credit →** the conversion / anti-stall-churn lead: someone
  already performing in-world who hasn't claimed the credit is the warmest
  possible nudge to *finish* — completion being the metric their 2025
  product motion targets.
- **Over-attested →** a low-friction integrity signal into the existing
  `Transcript_Caution` review — framed as **diagnostic, not accusatory**
  (§5).

## 5. Guardrails (so it neither over-promises nor becomes a weapon)

- **Scope it to what the game models.** The deed transcript corroborates
  thermodynamics, nursing judgment, the scenario verticals — it is
  **silent** on a history course the world can't exercise. It is a
  **partial, domain-scoped corroboration**, never a full shadow
  transcript. Say so; don't imply the game can second-guess every
  credential.
- **Divergence is a flag to review, not a verdict.** "Passed but can't do
  it in-world" may mean the game's model is narrow, not that the learner
  cheated. It feeds `Transcript_Caution`-style **human review**, never an
  automated accusation. (Study runs `AI_Detection_Result` too — integrity
  is already a live concern, which is why the signal is welcome, but it
  must stay gentle.)
- **Never an accredited substitute.** The game transcript is a
  **capability portfolio**, explicitly *not* the ACE credential, and
  issues no credit. The honesty rails hold: practice scales, it does not
  replace the accredited instrument; a course never gates a capability
  outright; real money/credit never buys a deed. Two artifacts — one
  accredited (theirs), one corroborating (ours) — side by side, never
  competing.

## 6. What it looks like, and what it costs

**Looks like:** per Discipline, a row showing the **band**, the **deed
evidence** (N witnessed demonstrations, at what difficulty), the **claim
evidence** (which Study courses/exams fed it), and the provenance mix — a
document that reads **capability**, rendered next to Study's official
transcript that reads **completion**, with the match/mismatch highlighted
per row.

**Costs:** near-zero new substrate. The `Transcript` + `chronicle` already
exist (derive-on-read, deed/claim). The dual transcript is a
**derive-on-read view** that partitions a Discipline's evidence by
provenance (deed vs claim) and renders it beside the Study credential
events already flowing on the feed, plus the per-row comparison. The
co-trigger rides the credential feed. So it is a **view + a feed hook**,
not a subsystem — and it turns the deed/claim distinction the chronicle
already draws into a customer-facing artifact.

## 7. Open questions

- **Rendering surface** — is the comparison shown to the *learner* (a
  motivational "here's what you can prove"), to *Study* (the caution /
  conversion signals), or both? Likely both, with different framings.
- **How is a deed "matched" to a Study credential?** via the same
  Discipline↔`Concept`/`ExamTaxonomyNode` crosswalk as the rest of the
  integration ([platform-reality §3](./study-com-platform-reality.md)); a
  credential with no modeled Discipline simply has no deed column (honest
  silence, §5).
- **Caution threshold** — how large a claim/deed gap warrants a
  `Transcript_Caution` review, and who owns that policy (it's Study's
  transcript, so Study's rule). Propose; don't set it for them.
