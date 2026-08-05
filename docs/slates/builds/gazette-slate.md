# Gazette slate — the state's publishing arm, and the road to a press

**Captured 2026-08-02**, in preparation for the video series and the
rebuilt homepage. The user's framing, and it is the load-bearing one:

> **System news is just the publishing arm of the state.**

Which means the shipped bulletin feed is not a staff tool that happens to
look like news — it is **publisher #1**, and building it as such is what
stops the small thing from foreclosing the large one.

> **Status: sequencing plan. Wave 0 is launch-critical and independently
> shippable; Waves 1–2 wait on build-1's refactor.**

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

## ⚠ The launch problem, stated precisely

**Nothing published today is visible to anyone arriving from the video.**
Four independent gates, all verified against the source:

| | |
|---|---|
| the live fan | `BulletinLogic.fanFeedImpl` → `PlayerApi.getAllAvatars()` — **requires an Avatar** |
| the initial window | rides `ConnectionEstablishedPayload.bulletinWindow` — **post-auth** |
| the archive | `GET /api/bulletins/archive` is **`requireAuth`** |
| the pane | `NewsTickerPane`, a right-column tab in `WorldLayout` — **the post-login cockpit** |

**You cannot see the news without logging in.** That is the whole of the
launch gap, and it is small.

## ⭐⭐⭐ The seams are already cut

The bulletin build anticipated this. From its own non-goals:

- **`BulletinRealm` is `ooc | world`** — the OOC/diegetic split exists as a
  field today;
- *"No divergent render per realm — a **diegetic in-world gazette can ride
  later as a consumer**";*
- *"No new authorization axis — a grantable **herald** community-manager
  axis is deferred."*

So the gazette and its publishing seat were both left as named holes.

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

# Wave 0 — make it visible. Launch-critical.

**Days, not weeks. Independently shippable; does not wait on the refactor.**

- **A public, unauthenticated read of the `ooc` realm only.** Either a new
  route or a realm-scoped variant of the archive.
- ⚠ **Keep `world` behind auth.** Once it is diegetic it may want per-viewer
  lensing, and exposing it now forecloses that. **The OOC realm is already
  documented as "identical for every viewer, no per-viewer lensing"** — that
  is exactly what makes it safe to serve publicly, and the reason not to
  extend the same treatment to `world`.
- **CORS for the Pages origin** if the homepage is a consumer.
- **A pre-login surface** — see the open question below.
- ⚠ **Graceful degradation is mandatory.** The demo box is underpowered with
  known leaks; the surface must look deliberate when the feed is **empty or
  unreachable**, not broken. An empty feed on the marketing site is worse
  than no feed.
- ⚠ **Bulletins must survive the nightly wipe.** *(User: "if we need to
  protect bulletins we can.")* A public feed that empties every night is a
  liability rather than a signal — so **the `bulletins` collection is
  exempted from the reset** as part of this wave.

**Non-goals for Wave 0:** no publisher model, no offices, no lensing, no
docket. It is a read path and a surface.

---

# ~~Wave 1 — the gazette~~ · **STRUCK, and partly built**

> **Struck by the organizations build (2026-08).** What Wave 1 asked for
> was *a publisher that is a held, handed-over, visible seat rather than
> `AccessApi.isAuthor`*. That is now built — but **not as an Office**, and
> the correction is worth more than the wave was.

**What shipped instead** ([press.md](../../subsystems/press.md),
[employment.md](../../subsystems/employment.md)):

- ⭐ **The publisher is an ORGANIZATION, and the publisher's authority is
  a POSITION on it** — not an Office. The seat/staff line turns out to be
  whether *a constitutional document points at the position*: a
  Communications Director serves at pleasure and is prescribed by nothing,
  so minting an Office for one would have been a category error. An
  earlier draft of that cycle proposed exactly that, and catching it is
  what produced the whole organization substrate.
- ⭐ **Appointment and exercise are different powers.** Holding a
  publisher's appointing authority lets you *fill* the position, never
  exercise it. Wave 1's instinct — *authority to publish is held and
  handed over* — was right; what it missed is that the holding and the
  handing-over are two different rights.
- **Scoped by ORGANIZATION rather than by locality.** A locality's press
  office is an organization whose appointing authority is
  `{kind: 'seat', …}`; that branch is built and unit-tested, and the first
  municipal one authors itself as content. *"The Saxonberg gazette"* is
  still a scope, not a label — the scope is just the publisher rather than
  the place.
- **Attribution moved off the author string** in the direction Wave 1
  named: the *document* is owned by the publishing organization; the
  person is recorded in the payload and **never shown** on the anonymous
  surface. The organization is the speaker.
- **`/feed/<publisher>/` in the document tree landed early**, from Wave 2's
  list rather than this one — the storage sort rule made it the right
  place regardless of which wave paid for it.

**What Wave 1 asked for and is still NOT built**, deliberately:

- ⭐ **The events-not-significance rule enforced structurally.** Nothing
  today makes a state feed *incapable* of editorialising. This is the
  single most valuable unbuilt thing on this slate and it survives intact.
- ⭐ **The docket** — unedited, chronological, complete, deliberately
  boring. Still the missing middle layer, still what makes journalism
  necessary rather than decorative.
- Locality-scoped gazettes as shipped content.

⚠ **The OOC realm stays exactly as it is** — operator announcements are
genuinely out-of-character and must not be dragged into the fiction. This
held: `realm` is still a field, it just derives from the publisher now
rather than being typed per release, so **nobody can claim to speak
in-fiction on an operator's feed**.

---

# Wave 2 — the press

**Already designed in [press-slate](./press-slate.md). Do not re-derive it
here.** The shape it needs from this slate:

- `/feed/<publisher>/` in the document tree — **the Compact runs the default
  publisher; players run others**;
- subscription, so a ticker is *a thing you subscribe to* rather than a board
  you read;
- the inline **stance** action a publisher's ticker may carry;
- the three source paths and the recording instrument, per that slate.

⚠ **This is a genuinely large build and must not be sized off Wave 1's
momentum.**

---

## Open questions

1. ⭐ **Where does Wave 0 land — the client start screen, the homepage, or
   both?** They are different jobs: the start screen needs a pre-auth
   payload; the homepage needs CORS and a fetch, and gives video traffic a
   much stronger *"this is alive"* signal. *Leans **both**, homepage first,
   because that is where the launch traffic lands.*
2. **Does the public read reuse the archive route with a forced
   `realm=ooc`, or get its own endpoint?** *Leans its own* — a route whose
   entire contract is "public, OOC only" is harder to widen by accident.
3. **Does the gazette publish automatically from governance events, or does
   a seat-holder press publish?** ⚠ Automatic is the **omniscient-feed
   trap** press-slate warns about. *Leans: the docket is automatic and
   complete; the gazette is published by a person holding a seat.*
4. **Is the docket a new surface or a projection of existing ledgers?**
   *Leans projection* — the record already exists; the docket is a
   chronological read of it with no editorial layer.
5. **What does a locality without a seated herald publish?** Probably
   nothing, and that absence should be visible — *a locality with no gazette
   is a fact about that locality.*
