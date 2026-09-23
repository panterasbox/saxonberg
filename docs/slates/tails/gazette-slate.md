# Gazette slate — the state's publishing arm, and the road to a press

> **Status: PARTIAL** — Wave 0 shipped in full (anonymous press room,
> `GET /api/press/releases`, the nightly-wipe exemption, the start-
> screen pre-login surface), and Wave 1 was struck by the organizations
> build (publisher = organization, authority = position) →
> [press.md](../../subsystems/press.md)
> **Left:** locality-scoped gazettes as shipped content (Wave 2, the
> press industry, is worked in press-slate, not here; the docket and
> the events-not-significance rule are tracked solely there too —
> see [press-slate](../builds/press-slate.md) § *The structural threat*)
> **Size:** a tail, riding press-slate's build (Wave 0 and Wave 1's
> shippable substrate are both done; the only remaining item of
> gazette's own is a small content-seeding task on substrate press-slate
> already designs)

**Captured 2026-08-02**, in preparation for the video series and the
rebuilt homepage. The user's framing, and it is the load-bearing one:

> **System news is just the publishing arm of the state.**

Which means the shipped bulletin feed is not a staff tool that happens to
look like news — it is **publisher #1**, and building it as such is what
stops the small thing from foreclosing the large one.

Related: [press.md](../../subsystems/press.md) (**shipped — what
exists today**), [press-slate](../builds/press-slate.md) (**the industry design;
Wave 2 is already worked there — do not re-derive it**),
[civics.md](../../subsystems/civics.md) (Locality-declared jurisdiction,
seats-as-positions), [governance.md](../../subsystems/governance.md) (the
Office substrate), [saxonberg-city-slate](../builds/saxonberg-city-slate.md) (the
locality to scope to), [forums.md](../../subsystems/forums.md) (where
two-way deliberation lives), [legal-code-slate](../builds/legal-code-slate.md)
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

The events-not-significance rule, the three-layer record/docket/ticker
split, and the "the state publishes to a PLACE, a publisher pushes to
PEOPLE" argument that follows from it all now live in one place —
[press-slate](../builds/press-slate.md) § *The structural threat: an
auto-generated ticker* (including the subsection absorbed from this
slate during the cluster-merge pass). Nothing left to say here that
isn't said there.

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

- The events-not-significance rule and the docket are tracked in
  [press-slate](../builds/press-slate.md) § *The structural threat* now, not
  here (moved during the cluster-merge pass — both were the same open
  item this slate was carrying redundantly).
- Locality-scoped gazettes as shipped content. This one is gazette's
  own — press-slate designs the vocation generally, not per-locality
  state press.

---

# Wave 2 — the press

Already designed in full in [press-slate](../builds/press-slate.md) — subscription,
the inline stance action, the three source paths, and the recording
instrument all live there; nothing to re-derive here. ⚠ **It is a
genuinely large build and must not be sized off Wave 1's momentum.**

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
3. Moved to [press-slate](../builds/press-slate.md) § *Open questions*, item 8
   (the docket-new-surface-vs-projection question) during the
   cluster-merge pass.
4. Resolved: a seat-holder (position-holder) publishes; there is no
   automatic-publish path — `mayPublishAs`/`holdsPublishingPosition` in
   [press.md](../../subsystems/press.md) § *The entitlement*. The
   docket-is-automatic half of this question is unaffected and remains
   tracked under Wave 1's "still NOT built" list above.
5. Resolved: an organization with no comms director publishes nothing,
   and that absence is the intended, visible behavior —
   [press.md](../../subsystems/press.md) § *The appointing authority
   appoints. The position publishes.*
