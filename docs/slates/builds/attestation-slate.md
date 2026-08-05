# Attestation slate — review as a tool, so the process can be anyone's

**Captured 2026-08-05**, out of the grid thread. The question *"who checks
that a parcel's power declaration is honest?"* turned out to be a general
governance question wearing a utility costume.

> **User: "a lot of this sounds like code/content review, which is built
> into the whole SDLC. But also a lot of it is private committee-owned code
> under the 9th and 10th. Committees probably want their own review, so it
> needs to be generalized so anyone can adopt the process — **or at least
> the tools do, and the process is marked by tool use.**"**

> **Status: design conversation, captured. Not requirements.** ⭐ The last
> clause is the whole design and it is the user's own: **build tools that
> leave marks; let any group compose a process out of them.**

Related: [cms.md](../../subsystems/cms.md) (⭐⭐ **the save / go-live split —
the natural gate**), [git-workflow.md](../../subsystems/git-workflow.md),
[branch-policy-slate](./branch-policy-slate.md) (⭐ *`writers` narrows an
already-permitted write, never widens* — the guard),
[provenance.md](../../subsystems/provenance.md) (`authoring_events` — the
adjacent ledger), [governance.md](../../subsystems/governance.md),
[civics.md](../../subsystems/civics.md),
[balance-slate](./balance-slate.md) (the reserved-matter line),
[grid-slate](./grid-slate.md) (the first consumer),
[content-packs-slate](./content-packs-slate.md) (⭐ *a pack is a unit of
REVIEW* — the other consumer, already named).

---

# ⭐⭐⭐⭐ The primitive

> **"X reviewed Y at time T and said Z."**

Append-only, derive-on-read, no workflow state — the same shape as every
other ledger in this system (`authoring_events`, `renown_events`,
`disposition_events`, `accountability_events`, the chronicle).

**And that is the entire mechanism.** There is no review *object* with a
status field, no queue, no state machine, because:

> ⭐⭐⭐ **A PROCESS is just a POLICY OVER REQUIRED ATTESTATIONS.**
> *"No go-live without two attestations from members of group G."*

Which means the tool is universal and the process is local — exactly the
brief.

## Why this shape and not a workflow

| A workflow | An attestation ledger |
|---|---|
| has states, so somebody owns the transitions | ⭐ has **facts**, so anybody can compute a verdict |
| encodes one process | encodes **none**; every group writes its own predicate |
| must be extended for a new consumer | a new consumer writes a new predicate over the same rows |
| ⚠ a stuck item is a support ticket | there is nothing to get stuck |

⭐ It is also the **only** shape that survives federalism: the Compact and a
locality committee cannot share a workflow, but they can trivially share a
ledger and disagree about the predicate.

---

# ⭐⭐ How it generalizes across the 9th/10th line

| Who | Their policy | Enforced where |
|---|---|---|
| **The Compact** — the constitutional SDLC | judiciary attestation before a law's build goes live (Art. VI verification) | the Compact's own branch |
| **A locality committee** | *"two of our members must sign"* | ⭐ **their own branch, their own call** |
| **A private parcel holder** | *"nobody but me"* — or nothing at all | their extent |
| **A content pack** | *"a maintainer signs the release"* | the pack's extent |

⚠ **The guard already exists and is load-bearing:**
[branch-policy-slate](./branch-policy-slate.md) — **`writers` narrows an
already-permitted write, never widens.**

> ⭐⭐⭐ **A committee may REQUIRE review on its own ground. It may never
> RELAX the Compact's floor.** That single asymmetry is what makes
> "anyone can adopt the process" safe.

---

# ⭐⭐ The gate already exists: save vs. go-live

[cms.md](../../subsystems/cms.md) already splits **save** (authoring) from
**go-live** (publication).

> **The attestation is a condition on go-live.** So review is not a new
> workflow bolted on — it is a **predicate on an existing transition**, and
> the transition already has a home, a UI and a security model.

⭐ That also means the *un*-reviewed state is already expressible and already
harmless: saved-not-live. Nothing is blocked while a review is pending,
because pending is not a state — it is simply the absence of a row.

---

# What an attestation carries

Deliberately thin — this is a **fact**, not a form:

| field | |
|---|---|
| **subject** | what was reviewed (a path extent, a pack version, a commit) |
| **attestor** | derived from context, never a parameter (the standing rule) |
| **assertion** | ⭐ a small closed vocabulary, not free text |
| **time** | when |
| **note** | optional, human, non-load-bearing |

⚠ **The assertion vocabulary must be closed**, for the reason every
vocabulary here is closed: a predicate cannot be written over free text.
*Leans:* `approves` · `objects` · `notes` — with **`objects` non-blocking by
default**, because a blocking objection is a *policy* choice (some groups
will want a veto, most will want a signal).

⭐ **Attestations are never retracted, only superseded** — same as every
append-only ledger here. A reviewer who changes their mind writes a second
row, and the predicate reads the latest.

---

# ⭐ Why this is worth building beyond the grid

The grid raised it, but it has waiting consumers already named elsewhere:

- ⭐⭐ **Content packs** — `content-packs-slate` already defines a pack as *"a
  unit of **REVIEW**"* and the showroom as *"the **review artifact** — a
  reviewer walks the showroom instead of reading a YAML diff."* **It has
  been missing the verb for review this whole time.**
- **The constitutional SDLC** — Art. VI's judiciary verification is
  literally *"did this build do what the law asked,"* which is an
  attestation with constitutional weight.
- **Wizard duty** — [wizard-duty-slate](./wizard-duty-slate.md)'s
  break-glass wants *"reviewed AFTER, never approved before."* ⭐ An
  attestation ledger is precisely a review-after instrument.
- **Parcel/land development** — certificates of occupancy, inspections, the
  grid declaration.
- **Provenance** — `authoring_events` records *who made it*; this records
  *who vouched for it*. Adjacent, and deliberately separate.

---

# Open questions

1. ⭐ **One collection or a facet of `authoring_events`?** *Leans its own* —
   authorship and endorsement are different claims about the same object,
   and merging them would make "who wrote this" and "who blessed this"
   ambiguous. ⚠ But per the standing rule, check whether the existing ledger
   already fits before minting a second.
2. ⚠ **Is the predicate authored as data or as code?** Data keeps it
   content-writable (a committee edits its own policy without a wizard);
   code is more expressive. *Leans data with a closed grammar* — the same
   choice `commandContributions` and branch policy already made.
3. **Does an attestation cost anything?** A free signature is a rubber
   stamp. ⚠ But charging for review makes it a toll. *Leans free, with the
   attestor's name on it forever* — reputation is the price.
4. ⭐ **Does the Compact require review of anything at launch?** *Leans no* —
   the tool ships inert, localities adopt it as they discover they want it,
   and **that adoption is itself the signal that a community has matured.**
5. ⚠ **What happens to live content when its attestation is superseded by an
   objection?** *Leans nothing automatic* — the same observe-first instinct
   as impound-on-claim. **A withdrawn blessing is evidence, not an
   eviction.**
