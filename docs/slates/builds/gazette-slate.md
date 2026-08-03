# Gazette slate — the state's publishing arm, and the road to a press

**Captured 2026-08-02**, in preparation for the video series and the
rebuilt homepage. The user's framing, and it is the load-bearing one:

> **System news is just the publishing arm of the state.**

Which means the shipped bulletin feed is not a staff tool that happens to
look like news — it is **publisher #1**, and building it as such is what
stops the small thing from foreclosing the large one.

> **Status: sequencing plan. Wave 0 is launch-critical and independently
> shippable; Waves 1–2 wait on build-1's refactor.**

Related: [bulletin.md](../../subsystems/bulletin.md) (**shipped — what
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

# Wave 1 — the gazette

**The reframe made real: `world` stops being a chip on a staff feed and
becomes the state's publication.**

- **The publisher is an OFFICE, not a person.** The deferred *herald* axis
  becomes a **seat** on the Office substrate, so authority to publish is
  held, handed over, and visible — rather than being `AccessApi.isAuthor`.
- **Scoped to a LOCALITY.** Saxonberg exists now
  ([saxonberg-city-slate](./saxonberg-city-slate.md)), and civics already
  does Locality-declared jurisdiction — so *"the Saxonberg gazette"* is a
  scope, not a label, and a second locality's gazette costs nothing.
- ⭐ **The events-not-significance rule enforced structurally**, not by
  convention. Whatever the state feed can emit should be *incapable* of
  editorialising — that constraint is what leaves room for a press.
- **The docket** — the missing middle layer. Unedited, chronological,
  complete, deliberately boring. Cheap to build, and **it is what makes
  journalism necessary rather than decorative.**
- Attribution moves from a stored `author` string toward the office that
  published, which is the honest form once a seat exists.

⚠ **The OOC realm stays exactly as it is** — operator announcements are
genuinely out-of-character and must not be dragged into the fiction. **Two
things wearing one name is fine as long as the split stays a field.**

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
