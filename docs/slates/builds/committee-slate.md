# Committee slate — three questions, a menu, and nothing below the seam

> **Status: UNBUILT, and five slates already depend on it.**
> ⭐ `scarcity-slate` (two reporting committees) · `llm-economy-slate`
> (the token appropriation's committee) · `client-parcel-slate` (the
> client committee) · `attribution-slate` § 9 (the seam) ·
> `feedback-slate` (parcel committees allocate) — **all reference
> committees, none defines one.**
> **Left:** the three-question facade · per-committee **seats**
> (generalising `OFFICE_APPARATUS`) · the model menu as rows · the
> optional `answerableFor` resolver + its shipped implementations · the
> binding-authority act list · the appeal-exhausted assertion and its
> record
> **Size:** ⭐ **a build, and smaller than it looks** — most of it is
> generalising shipped Office machinery and writing a short facade.

**Captured 2026-10-04.**

> **User: "they're supposed to self-organize but we might need at least a
> 'speaker' role… committees can be very large or very small and can be
> very flat or have many subdivisions and layers. that's why I want them
> to self-compose."**

---

## 1. What `ownerOf` actually answers — and what it does not

⚠ **A correction to earlier passes**, which leaned on
`ParcelApi.ownerOf` as though it resolved responsibility. It does not.

`ownerOf(path)` is a **two-rung chain** returning `ParcelOwner | null`
and **failing closed** ([parcel.md](../../subsystems/parcel.md)):

1. **explicit parcel title** — `coveringParcelOf(path)`, longest-prefix;
2. **self-home identity** — a path under `/home/<key>/` → that player;
3. otherwise **`null`** — *nobody holds what nobody claimed.*

> ⭐ So it answers exactly one question: **who holds title, and therefore
> who may write here.** Parcels are owned by **groups with admins and
> members**, so the most it can say is *who belongs to the committee that
> can write to this path.*
>
> ⚠ **It says nothing about who, inside that committee, is answerable for
> a given piece of content.** Git logs and the authoring ledger tell a
> story — **and the story currently has to be read by a person.**

## 2. ⭐⭐⭐ The facade is THREE questions — and (c) was never the commons'

An earlier draft proposed four, including *given a path, who is
answerable?* **That requirement was wrong**, and walking its consumers is
what shows it:

| consumer | actually resolves at |
|---|---|
| the content **fingerprint** (`attribution-slate` § 10) | ⭐ **the parcel** — a content review, reviewed internally |
| the **publish gate** | ⭐ **the committee** applies; who drafted it is internal |
| the **mint ledger** | a **player**, derived at `StuffApi.clone` — no map needed |
| a **breaker incident** | ⭐⭐ **the template** → its parcel; who fixes it is internal |

> ⭐⭐⭐ **Every one resolves at the parcel. Nothing in the commons ever
> needs to LOOK UP a responsible person.**
>
> It needs to be **told** one (the speaker) and to **check** one at write
> time (`isWizard` **and** title, per-write). Neither is a lookup.

**So the facade is three questions, and nothing beyond them:**

| | the question | needed by |
|---|---|---|
| **a** | ⭐ **who speaks for us?** | the seam, when a grant is breached — it needs an addressable party |
| **b** | ⭐ **who may bind us?** | accepting a grant · **acknowledging a re-rate** (the cost-basis pin) · signing a publish application |
| **c** | **is internal appeal exhausted?** | before a dispute reaches the executive |

⭐⭐ **Internal responsibility is UNSPECIFIED by the Compact.** A committee
may use a subdivision, a resolver, a spreadsheet, or nothing — which is
what *"they self-organize"* should have meant in the first place.

## 3. ⭐⭐ Speaker already exists, and so does seat→membership

[governance.md](../../subsystems/governance.md) — two things better than
expected:

> *"**permissions → members are appointed by whoever holds the owning
> seat.**"*

**The seat → membership relation is already modelled.** And
`OFFICE_APPARATUS`'s five authored seats include **three Speakers**
(producer, capital and consumer houses), so *speaker* is established
office vocabulary rather than a new concept.

⭐ One shipped property to copy wholesale: `vacate(office)` **deletes the
row**, and *"absence of a row = the founder default holds the seat."*
**That is the never-vacant answer for a committee that empties out** —
the same mandate-reverts-to-the-executive rule `client-parcel-slate § 6`
arrived at independently.

⚠ **Two gaps:** those five are **constitutional** seats, so
**per-committee seats are the generalisation**; and *"every v1 office is
singular"* with juries deferred (*"a jury is a selection from a pool, not
a seat"*) — so ⚠ **a sortition-based committee model is blocked on the
jury pool.**

## 4. The menu — and the three axes that generate it

Models differ on **how authority is acquired · how it is distributed ·
who benefits.** Any structure is a point in that space, so **a custom
model is a point nobody pre-named.**

| model | acquired | distributed | benefits |
|---|---|---|---|
| ⭐ **sole proprietor** | owned | n/a | self |
| **collective** | membership | flat | members |
| ⭐⭐ **corporate / board** | appointed, delegated down | hierarchical | members |
| ⭐⭐ **municipal** | elected by district | ⭐ hierarchical, **and districts map onto `subdivide`** | residents |
| ⭐ **guild** | demonstrated work | **by craft, not geography** | members — and `guild-slate`'s *claims mustered not bought* already prices breadth in people |
| **cooperative** | membership | ⭐ one member one vote **regardless of contribution** | members → `cooperative-slate` |
| ⭐⭐ **trust / stewardship** | appointed steward | the steward acts alone | ⭐ **beneficiaries who do not administer** — the right shape for a memorial, an archive, commons-held content → `stewardship-slate` |
| ⚠ **sortition** | drawn by lot | rotating | members | *(blocked — § 3)* |

⭐ **Three already have slates elsewhere**, written for other purposes —
so the menu is partly authored already.

### ⭐⭐⭐ Sole proprietor is the DEFAULT

Most parcels are one person, and forcing structure on them would be
absurd. Speaker = them, binder = them, responsibility = all of it.
**The three facade questions have trivial answers and nobody fills in a
form.**

## 5. ⭐⭐⭐ Internal division: `subdivide` first, a resolver only for the residue

> **User: "the responsibility map just seems like you're doing grouping
> and subcommittees by a different name… it seems like you'd just want to
> create a new parcel."**

⭐ Correct, and conceded: **a path-keyed responsibility map IS
subdivision, implemented worse.** A sub-parcel brings **title,
chain-of-title, `canAtPath`, its own grant lines and its own committee** —

> **A sub-parcel is strictly more powerful than a responsibility entry:
> responsibility PLUS authority PLUS accounting.**

### ⭐ The decision rule

> **Does the sub-group need its own grant?**
> **Yes → `subdivide`.** **No → it is internal, and the Compact does not
> care how.**

### ⚠ But path-extent is only ONE organizing principle

> **User: "that means we're marrying yourself to organizations whose
> organizing principles resolve to path extents… that's fine but its an
> imposition."**

And the principles that *don't* fit are the most natural ways content
teams actually divide work:

| principle | path-shaped? |
|---|---|
| **by territory** — *you own the north wing* | ✅ municipal; fits parcels perfectly |
| ⭐⭐ **by craft** — *you do NPCs, I do rooms, she does items* | ⛔ **interleaved throughout the tree** |
| ⭐⭐ **by lifecycle** — *I write, you review, she publishes* | ⛔ a **process** partition over the same paths |
| **by shift** | ⛔ |
| **by subsystem** — *anything touching combat* | ⛔ cross-cutting |

⚠ And the cross-cutting case — *three members sharing one locality* — is
the **common** case for a small team, not an edge case.

### ⭐ So the optional resolver imposes an INTERFACE, not a principle

```
answerableFor(path) → member
```

The committee supplies the implementation; ⭐⭐ **the commons never calls
it** (§ 2). And the ready-made ones cover the table without anybody
writing code:

| resolver | handles |
|---|---|
| **single** | sole proprietor, trivially |
| **by prefix** | territorial |
| ⭐ **by branch** | *by craft* — `<root>/<branch>/` plus the four branch predicates make *"all agents answer to X"* expressible without a prefix |
| **by author** | reads `authoring_events` — whoever wrote it maintains it |
| **by publish state** | lifecycle |

> ⭐⭐ **The resolvers are rows. The common ones ship. A custom one is
> authored.** So the imposition reduces to **one function signature**, on
> a facility a committee may ignore entirely.

## 6. ⭐⭐ The pattern, named — because this is the sixth instance

Six times in one design thread, the answer has been **a closed facade
over a row-extensible vocabulary**:

| | the facade | the rows |
|---|---|---|
| the client | `SaxonbergClient`'s import list | modes, cards, destinations |
| illustration | the style row's required fields | the style gallery |
| feedback | one axis at the commons seam | the parcel's own menu |
| the client again | `CardId` → rows | a pack's cards |
| this slate | three questions | the model menu |
| this slate | `answerableFor` | the resolvers |

> ⭐⭐⭐ **At six it is not coincidence — it is what *self-compose within a
> common interface* always takes here.** Which means the mechanism is
> proven five times over before this build starts.

## 7. Governance layering (from `attribution-slate` § 9)

| level | enforcer | against | failure mode |
|---|---|---|---|
| **the seam** | ⭐ the **executive** | quotas the **legislature** allocated | the land-compute ladder: flag → target → grace → dormancy. Visible, procedural, appealable |
| **inside** | ⭐ the holder's committee(s), at any depth | their own policy, **within the grant** | ⭐⭐ **the holder's problem and the holder's remedy** |

> ⭐⭐⭐ **As many committees as the holder wants, zero of which the Compact
> names.** The grant is to a **path**; accountability is to **whoever
> holds that path.** ⭐⭐ And **internal mismanagement is invisible until it
> breaches the seam** — correct (autonomy) *and* self-limiting (the
> aggregate shows at the boundary, and then it is the executive's).

## 8. Open questions

1. ⚠ **Does the commons verify appeal-exhaustion, or only record the
   assertion?** Verifying internal process is exactly the reaching-in the
   recursion rule forbids. ⭐ Instinct: **take the assertion and record
   who made it**, which makes a false one **a nameable act rather than a
   prevented one** — the camera again.
2. ⭐ **Do per-committee seats reuse the Office substrate or shadow it?**
   Reuse keeps one vocabulary and one `vacate` semantics; ⚠ but
   `OFFICE_APPARATUS` is a closed authored list of **constitutional**
   seats, and a per-committee seat is a different animal that must not
   dilute it.
3. **Is a model binding once adopted?** A committee that silently changes
   shape makes (a) and (b) unreliable at the seam. ⭐ Instinct: **the
   model is a declared row and changing it is a bindable act** — which is
   (b) governing its own definition.
4. ⚠ **Does anything force a large committee to publish a resolver?**
   § 2 says the commons never needs it — but a 40-member committee with
   no internal map is one where *nobody* is answerable in practice, and
   that is a real failure the commons cannot see by construction.

## Cross-refs

- [attribution-slate.md](./attribution-slate.md) — § 9's layering (lifted
  here), and the grant the committee is accountable for.
- [scarcity-slate.md](./scarcity-slate.md) § 8 — **a committee is a
  camera, not a wall**, and the two reporting committees.
- [llm-economy-slate.md](./llm-economy-slate.md) — the token
  appropriation's committee, and the **cost-basis pin** that needs a
  binding authority (facade **b**).
- [client-parcel-slate.md](./client-parcel-slate.md) § 6 — the client
  committee's three-sentence charter, the **capacity-not-criterion** rule
  for composition, and the mandate reverting to the executive.
- [feedback-slate.md](./feedback-slate.md) — parcel committees as
  allocators, and the self-endorsement gate that reads title + membership.
- [governance.md](../../subsystems/governance.md) — the Office substrate,
  `OFFICE_APPARATUS`, `vacate`, and *members are appointed by whoever
  holds the owning seat*.
- [parcel.md](../../subsystems/parcel.md) — `ownerOf`'s two rungs,
  `subdivide`, `transfer`, chain-of-title.
- [land-compute-and-license.md](./land-compute-and-license.md) —
  subsidiarity, the recursing dial, *below the seam the commons doesn't
  reach in*.
