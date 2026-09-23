# Social inspection slate (working doc)

> **Status: PARTIAL** — the feature merged: `who` (with `--here`/
> `--friends`/`--country`), `profile`/`finger`, `score`/`me`,
> `SocialApi.composeRow`/`composeCard`, `privacy.showStatus`, the
> new-arrival badge, and the static `who` card →
> [card-surface.md](../../subsystems/card-surface.md) +
> [cockpit.md](../../subsystems/cockpit.md) (⚠ the disclosure model is
> documented nowhere — handed off to social-graph.md via the ledger)
> **Left:** the `who --group <g>` filter · the `privacy.showSpecies`
> threshold (Q2) · the `profile` card rendered into the inspection card
> with a per-viewer subscribable projection (Q6 — no `opens_card` today) ·
> `who` at scale (Q7) · deferred: invisibility as per-pair fidelity
> floored to zero (⚠ check against concealment.md)
> **Size:** a tail

The player-facing **inspection surface** over the identity & social
substrate: a `who` roster of who's online, a `profile`/`finger` card for
inspecting another player, and a `score`/`me` self-dashboard. Plus the
**disclosure model** that governs what one player learns about another.

The framing insight: a MUD `who` list and a `finger`/`score` card are
the oldest social affordances there are, but this game has no admin
levels and a *per-viewer* identity substrate — so "who can see what about
whom" can't be a tier or a hide-flag. **Privacy here is a disclosure
dial, not a wall:** presence is always public, and what varies is the
*fidelity* a given observer receives, raised case-by-case by the
relationship.

See also:

- [docs/subsystems/social-graph.md](../../subsystems/social-graph.md) —
  the shipped attention layer: presence relay (the four in-world
  transitions), per-viewer occupant lensing, `ConnectionApi.originOf`
  country, the `social.*` settings home. This slate consumes all of it.
- [docs/subsystems/belief.md](../../subsystems/belief.md) —
  `RecognitionApi.describe` (the viewer-aware naming hook), the
  recognition / regard realms. The per-pair fidelity engine.
- [docs/slates/tails/social-graph-slate.md](./social-graph-slate.md) —
  the sibling tail (notification + display policy). Disjoint scope; this
  slate is the *inspection* surface, that one is the *attention* surface.
- [docs/slates/tails/recognition-slate.md](./recognition-slate.md) —
  `introduce` and the recognition substrate the disclosure model anchors
  on.
- [docs/subsystems/card-surface.md](../../subsystems/card-surface.md)
  — the MQL-subscription-backed right-column card the `profile` card
  renders into.
- [docs/subsystems/influence.md](../../subsystems/influence.md),
  [renown.md](../../subsystems/renown.md),
  [advancement.md](../../subsystems/advancement.md),
  [trait.md](../../subsystems/trait.md) — the measured-standing verbs the
  self-dashboard digests and links out to.

---

## Principle — three kinds of "values about a person" — shipped as designed (`ProfileLogic.composeCard`: identity facts by disclosure · outward standing bands · private opinion never on the subject's card); the table is in the compaction ledger's handoff for social-graph.md.

---

## The disclosure model (the heart of this slate)

Shipped as designed — presence always public (`who.yaml`), fidelity per (observer, observed) pair via `describeFor`, `privacy.showStatus` = `anyone | contacts+` as the disclosure FLOOR (`NotifyPolicyMixin`), country pinned public with no setting, inbound `social.verbosity` distinct from the outbound dial. The five points are in the compaction ledger's handoff for social-graph.md.

### Settings shape (sketch)

Soft attributes only — country is not here. Each names the tier that
unlocks it; default low-friction.

```yaml
privacy.showStatus:  'anyone' | 'contacts+'         # idle / away / engaged
privacy.showSpecies: 'anyone' | 'introduced+'       # species-as-presented*
# (country has no entry — always 'anyone', non-overridable)
```

\* species-as-presented may simply ride the existing disguise /
`getPresentation` machinery rather than a dedicated threshold; flag in
open questions.

The threshold vocabulary (`anyone` / `introduced+` / `contacts+`) is the
relationship ladder; it composes with the per-pair recognition state
rather than replacing it. Name gating is *always* recognition (you can't
"offer your name without friction" to a stranger and still have it mean
anything — that's what `introduce` is for).

---

## The verb surface

### `who` — the roster

- **Filters narrow only on already-public facts.** `who --here`,
  `who --friends`, `who --group <g>` (relationship-scoped), and
  `who --country <c>` — the last is legitimate precisely *because*
  country is unconditionally public, so it leaks nothing the roster
  doesn't already show. No special enumeration-guard needed; the rule is
  simply "filters can only narrow on what's already on the card."
- Stranger collapse / density aggregation is the social-graph occupant
  lens's job; `who` reuses it rather than reinventing it.

---

## Server design — shipped in a different shape: `WhoController` + `ProfileController` (`score`/`me` alias onto it), the one redaction seam is **`SocialApi.composeCard` / `composeRow`** on `ProfileLogic` (not a `ProfileApi`), the online set is **`SocialApi.online()`** (no `PresenceApi`), and `privacy.showStatus` lives on `NotifyPolicyMixin`'s settings.

---

## Client design

- ~~`who` — a live card~~ — superseded: `who` ships as a **static** card with a refresh, because nothing wakes on connect/disconnect and a live `who` would be permanently wrong while looking right → [card-surface.md § Inspection is ONE row](../../subsystems/card-surface.md).
- **`profile` — the inspection card.** Render the card into the existing
  right-column inspection card (already MQL-subscription-backed and
  cardinality-polymorphic). The honest tradeoff:
  - *Refresh-button card* — cheapest, bespoke, no subscription.
  - *Inspection-card render* — reuses what's there and gets **live for
    free**, at the cost of making the projection **per-viewer** so
    redaction (recognition gating the name, disclosure gating soft
    fields) resolves correctly through the subscription — the
    viewer-aware-query / Shadow seam.
  - **Lean:** render through the inspection card and build the card
    renderer viewer-aware from the start, so live is the default and
    "refresh" is the degraded path if the per-viewer projection proves
    fiddly. Same renderer either way.

---

## Deferred — invisibility

Explicitly **not** part of this slate, and explicitly **not** a flag.
Hiding your presence is a privileged, conditional, *per-pair* capability:
"can X perceive Y right now" resolved subjectively, derived from
capabilities / disguise / stealth mechanics / observer state — not a
boolean you set. With no traditional admin levels, the permission has to
be **relational and earned**, not tiered, which makes it a
conditional-perception problem, not a setting.

The architecture here is the right substrate to grow it from later:
**"invisible to X" is just per-pair fidelity floored to zero for a
specific pair, gated by something privileged.** Per-pair fidelity already
being the norm is what makes that a small addition rather than a new
axis. Park it.

---

## Open questions

1. **Standing split on others' cards** — renown + competence-band shown,
   influence + raw-traits self-only (lean, table above). Pull renown
   behind recognition too, or keep it always-outward?
2. **Species-as-presented** — a dedicated `privacy.showSpecies`
   threshold, or does it just ride the existing disguise /
   `getPresentation` machinery (lean: ride existing)?
3. **`finger` alias** — ship the classic MUD `finger` as an alias for
   `profile`, or is it too archaic to bother (lean: ship it, it's free)?
4. **Account age / "member since"** — surface on the card? Cheap signal
   of newness; mild fingerprint. Lean: yes, coarse ("new" / a join date).
5. **Idle / away derivation** — is there a last-input timestamp to derive
   idle from, or does `status` only distinguish online/engaged? May need
   a cheap idle clock if `privacy.showStatus` is to mean anything.
6. **Live profile per-viewer subscription** — is the viewer-aware-query /
   Shadow seam robust enough to drive a redacted projection through an
   MQL subscription, or do we ship refresh-button v1 and upgrade later?
7. **`who` at scale** — a 200-online server: does `who` reuse the
   social-graph density aggregation (collapse strangers to counts), or
   always enumerate? Lean: reuse the aggregation.
8. **Self-dashboard scope** — does `score` digest *all four* standing
   measures, or only the ones a player has any signal in (hide empty
   lines)? Lean: hide empties.

---

## Build order (sketch)

**Wave 2 — the live client cards.**

- `PresenceApi.online()` thin accessor over the scan, privacy-filtered.
- Live "Who's Online" card off presence deltas.
- `profile` card into the inspection card; per-viewer subscribable
  projection (or refresh-button fallback per Q6).
- Clickable / command-previewing rows.

**Deferred** — invisibility (conditional perception), cross-character /
account-level identity federation, server-defined institutional badges on
the card.

---

## What this slate does NOT cover

- **Recognition mechanics** — recognition-slate / belief.md (substrate
  this consumes).
- **Notification & display policy** — social-graph-slate (the sibling
  tail; the attention surface, disjoint from this inspection surface).
- **The standing measures themselves** — renown / influence / advancement
  / trait subsystems. This slate only *reads bands* and links out.
- **Invisibility / stealth / conditional perception** — deferred, above.
- **Moderation / blocking** — comms-slate (`foes`-style drop).
- **Cross-account / cross-character identity** — far-future federation.
