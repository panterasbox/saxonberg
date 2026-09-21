# Gazette slate — the state's publishing arm, and the road to a press

> **Status: PARTIAL** — Wave 0 shipped in full (anonymous press room,
> `GET /api/press/releases`, the nightly-wipe exemption, the start-
> screen pre-login surface), and Wave 1 was struck by the organizations
> build (publisher = organization, authority = position) →
> [press.md](../../subsystems/press.md)
> **Left:** the docket — unedited, chronological, complete · the
> events-not-significance rule enforced structurally · locality-scoped
> gazettes as shipped content · Wave 2, the press industry (worked in
> press-slate, not here)
> **Size:** a build (Wave 0 and Wave 1's shippable substrate are both
> done; the docket alone — a cross-jurisdictional, append-only event
> index — is not a tail, and Wave 2 is press-slate's own build)

**Captured 2026-08-02**, in preparation for the video series and the
rebuilt homepage. The user's framing, and it is the load-bearing one:

> **System news is just the publishing arm of the state.**

Which means the shipped bulletin feed is not a staff tool that happens to
look like news — it is **publisher #1**, and building it as such is what
stops the small thing from foreclosing the large one.

Related: [press.md](../../subsystems/press.md) (**shipped — what
exists today**), [press-slate](./press-slate.md) (**the industry design;
Wave 2 is already worked there — do not re-derive it**),
[civics.md](../../subsystems/civics.md) (Locality-declared jurisdiction,
seats-as-positions), [governance.md](../../subsystems/governance.md) (the
Office substrate), [saxonberg-city-slate](./saxonberg-city-slate.md) (the
locality to scope to), [forums.md](../../subsystems/forums.md) (where
two-way deliberation lives), [legal-code-slate](./legal-code-slate.md)
(the `/feed/<publisher>/` tree candidate).

---

## ⚠ The launch problem — RESOLVED

> **SHIPPED · DOCUMENTED.** The gap this section diagnosed (nothing
> published was visible without logging in) is closed: `GET
> /api/press/releases` is an anonymous route and `PressRoom.tsx` reads
> it from the client start screen. See
> [press.md](../../subsystems/press.md) § *The anonymous press room* and
> § *The client*. `world`-realm content still requires auth, unaffected.
> The seams the old bulletin build left for this (`BulletinRealm`
> `ooc | world`, the deferred herald axis) are also both resolved — see
> § *A press office is not a newsroom* (the herald seat, struck rather
> than built) and § *`PublisherMixin`* (`realm` derives from the
> publisher now, not typed per-release).

## ⭐⭐⭐⭐ And press-slate already protects the vocation

The rule that makes building system news *well* safe rather than
cannibalising:

> **The default feed reports EVENTS, never SIGNIFICANCE.** *"Bill X crossed
> threshold in the Play chamber"* — never *"Landmark arms bill advances."*
> **The machine can report facts; only a person can say why it matters —
> and that sentence is the job description.**

Plus the three-layer split this slate inherits:

| Layer | Character | State |
|---|---|---|
| **the record** | queryable, complete, **never pushed** | largely shipped (ledgers, MQL) |
| **the docket** | *unedited* chronological events; public, boring, complete | ⚠ **missing — the gap** |
| **the ticker** | **a publication, therefore it has a publisher** | shipped as one hard-coded publisher |

> **Nobody reads the Federal Register — that is the point, and precisely why
> journalism exists.**

### ⭐⭐⭐ And the docket being PULL is by design, not a concession

**(Revised 2026-08-02, after decomposing the Substack form — see
[press-slate § What a publication is](./press-slate.md).)**

An earlier pass framed the state's output as a **wire service** feeding
the press, on a newspaper analogy. **The analogy was wrong** — Substack has
no issues and the unit is a post. The distinction that survives is
simpler, and it is about **direction**:

> **The state publishes to a PLACE. A publisher pushes to PEOPLE.**

A state that pushes to everyone is either propaganda or noise. So the
gazette being a surface you **go to** is **correct**, not a limitation —
and the press is **what comes to you about it.**

⭐ **This is also why system news is genuinely the smallest part**: it is
the only one of the three layers that needs no delivery machinery at
all.

---

# ~~Wave 0~~ · SHIPPED

> **SHIPPED · DOCUMENTED**, in full. The anonymous `GET
> /api/press/releases` route, the auth-gated `world` realm, "no CORS
> change needed" (single-origin + `credentials: true` already covers
> it), the start-screen `PressRoom.tsx` pre-login surface, its three-
> terminal-state graceful degradation, and the `documents` collection's
> reset exemption for `kind: 'release'` (`packages/server/src/schema/
> documents.yaml` § *reset*) are all shipped and documented — see
> [press.md](../../subsystems/press.md) §§ *The anonymous press room*,
> *The client*, and *No CORS change is needed*.

---

# Wave 1 — still open

> **SHIPPED · DOCUMENTED, otherwise.** Wave 1 asked for *a publisher
> that is a held, handed-over, visible seat rather than
> `AccessApi.isAuthor`*, and it shipped — struck by the organizations
> build, and **not as an Office**. The full account (publisher = ORG,
> authority = a POSITION on it and not an Office; appointment vs
> exercise as different powers; scoped by organization not locality;
> attribution off the author string; `/feed/<publisher>/` landed early)
> is in [press.md](../../subsystems/press.md) §§ *The three decisions*
> and *A press office is not a newsroom* — do not re-derive it here.
> The OOC-realm-stays-as-is guarantee also shipped (`realm` now derives
> from the publisher).

**What Wave 1 asked for and is still NOT built**, deliberately:

- ⭐ **The events-not-significance rule enforced structurally.** Nothing
  today makes a state feed *incapable* of editorialising. This is the
  single most valuable unbuilt thing on this slate and it survives intact.
- ⭐ **The docket** — unedited, chronological, complete, deliberately
  boring. Still the missing middle layer, still what makes journalism
  necessary rather than decorative.
- Locality-scoped gazettes as shipped content.

---

# Wave 2 — the press

**Already designed in [press-slate](./press-slate.md). Do not re-derive it
here.** The shape it needs from this slate (the `/feed/<publisher>/`
part of this list already shipped — see
[press.md](../../subsystems/press.md) § *A release lives in the
document tree*):

- subscription, so a ticker is *a thing you subscribe to* rather than a board
  you read;
- the inline **stance** action a publisher's ticker may carry;
- the three source paths and the recording instrument, per that slate.

⚠ **This is a genuinely large build and must not be sized off Wave 1's
momentum.**

---

## Open questions

1. Resolved (for now): landed on the client start screen only
   (`PressRoom.tsx`). Homepage/panterasbox.com is an explicit non-goal
   today — [press.md](../../subsystems/press.md) § *Non-goals* ("no
   panterasbox.com consumer — the surface is the start screen"). Reopen
   if the homepage integration becomes wanted.
2. Resolved: its own endpoint (`GET /api/press/releases`), not a flag on
   the archive — [press.md](../../subsystems/press.md) § *The anonymous
   press room*.
3. **Is the docket a new surface or a projection of existing ledgers?**
   *Leans projection* — the record already exists; the docket is a
   chronological read of it with no editorial layer. Still open — the
   docket itself is unbuilt.
4. Resolved: a seat-holder (position-holder) publishes; there is no
   automatic-publish path — `mayPublishAs`/`holdsPublishingPosition` in
   [press.md](../../subsystems/press.md) § *The entitlement*. The
   docket-is-automatic half of this question is unaffected and remains
   tracked under Wave 1's "still NOT built" list above.
5. Resolved: an organization with no comms director publishes nothing,
   and that absence is the intended, visible behavior —
   [press.md](../../subsystems/press.md) § *The appointing authority
   appoints. The position publishes.*
