# Social inspection slate (working doc)

The player-facing **inspection surface** over the identity & social
substrate: a `who` roster of who's online, a `profile`/`finger` card for
inspecting another player, and a `score`/`me` self-dashboard. Plus the
**disclosure model** that governs what one player learns about another.

> **Status: design captured, not built.** This is a tail of the shipped
> identity & social-perception substrate (recognition + belief +
> connection-origin + contacts + the social-graph attention layer). It
> adds **no new subsystem** — every data source already exists; what's
> missing is the player-facing read surface and the disclosure dial that
> gates it. Next step: `/requirements`.

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
- [docs/subsystems/inspection-pane.md](../../subsystems/inspection-pane.md)
  — the MQL-subscription-backed right-column pane the `profile` card
  renders into.
- [docs/subsystems/influence.md](../../subsystems/influence.md),
  [renown.md](../../subsystems/renown.md),
  [advancement.md](../../subsystems/advancement.md),
  [trait.md](../../subsystems/trait.md) — the measured-standing verbs the
  self-dashboard digests and links out to.

---

## Principle — three kinds of "values about a person"

The load-bearing distinction (and the reason this is *not* one fat
`score` command): there are three different kinds of fact about a person,
with three different owners and three different privacy semantics.

| Layer | Examples | Owner | Privacy semantics |
|---|---|---|---|
| **Identity facts** | persona/name-as-presented, species-as-presented, country of origin, account age, online/idle status | The person | Disclosure dial (below). Country exempt — always public. |
| **Measured standing** | renown, influence (play/make/fund), competence, traits | The world (derived) | Outward measures public; internal measures self-only. |
| **Private opinion** | your regard for them, your contacts label for them | *The observer* | Always private to the observer; never on the subject's card. |

The codebase already votes for keeping these separate — there is no
monolithic score verb; there are `standing`, `traits`, `competence`,
`chronicle`, each a thin per-subsystem self-view. This slate adds the
**identity-facts surface** (the card + the roster) and a self-dashboard
that *digests and links to* the standing verbs rather than absorbing
them. Private opinion stays on the observer's side.

---

## The disclosure model (the heart of this slate)

Privacy is **not** a set of hide-flags. The model:

1. **Presence is a public fact.** If you are online, you are on the `who`
   list. Always. There is no "appear offline" toggle. Hiding your
   *existence* is a future, privileged, conditional capability
   (invisibility — see Deferred), never an ordinary setting.

2. **Fidelity is per-(observer, observed) pair.** What a given viewer
   sees about you is a function of the *relationship* — have they been
   introduced to you (recognition), are you in their contacts, do you
   share a group — layered over a baseline. A stranger sees you as "a
   tall stranger — from Brazil"; someone you've introduced yourself to
   sees "Duncan — from Brazil." Same presence row, different resolution.
   This is exactly the `RecognitionApi.describe` lens, applied to the
   roster and the card.

3. **Privacy is what you offer *without friction*.** A privacy setting is
   the *floor* of disclosure — what any stranger gets by default. It
   never reaches "nobody," and it is not a per-field boolean. The shape
   is a **per-attribute disclosure threshold**: each soft attribute names
   the relationship tier that unlocks it (`anyone` / `introduced+` /
   `contacts+`). Raising a specific person above the floor is an *act* —
   which is what `introduce` already is.

   > **`introduce` is the first disclosure consumer because it *is* the
   > model in miniature.** Disclosure is an act you direct at someone
   > (handing them your name); the "setting" is just the default for
   > everyone you haven't performed that act toward.

4. **Country is exempt — pinned at maximum, non-overridable.** Given the
   political premise of the game, country of origin is load-bearing
   world-fact, not a personal detail to curtain. It shows on every card
   and every roster line, to everyone, always. No `privacy.showCountry`.

5. **Inbound vs outbound — don't conflate.** `social.verbosity` (shipped)
   is the *observer's* preference for how much presence-noise they
   receive. The disclosure dial is the *observed's* control over how much
   of themselves others receive. Same surface area, opposite directions.
   They are distinct settings.

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

| Verb | Target | What it is |
|---|---|---|
| `who` | server-wide | The online roster, lensed per-viewer. Always lists every online player; fidelity varies by relationship. |
| `profile <player>` (alias `finger`) | another player | Their identity card, redacted by their disclosure dial + your recognition of them. |
| `score` / `me` / `profile` (no arg) | yourself | The same card, fully unredacted, **plus the standing digest** — the MUD `score`, identity-anchored. |

### `who` — the roster

- **Always lists every online player.** No hide. Each row lensed through
  `RecognitionApi.describe` (known by name, strangers by salient
  features), with country always appended.
- **Filters narrow only on already-public facts.** `who --here`,
  `who --friends`, `who --group <g>` (relationship-scoped), and
  `who --country <c>` — the last is legitimate precisely *because*
  country is unconditionally public, so it leaks nothing the roster
  doesn't already show. No special enumeration-guard needed; the rule is
  simply "filters can only narrow on what's already on the card."
- Stranger collapse / density aggregation is the social-graph occupant
  lens's job; `who` reuses it rather than reinventing it.

### `profile <player>` / `finger` — the card

One card renderer, redacted by target:

- **Name / persona** — gated by *recognition*. Stranger ⇒ "a tall
  stranger" (salient features), recognized ⇒ their name. You *can*
  profile a stranger; the card is real but heavily redacted, and
  recognition progressively unlocks fields.
- **Country** — always shown.
- **Soft identity facts** (status, species-as-presented) — gated by their
  disclosure dial against your relationship tier.
- **Outward standing** — renown band + competence band (observable
  reputation / skill). See the standing-split decision below.
- **Your private read** — your regard / contacts label for them appears
  as *your* annotation on the card (layer 3 — observer-owned, never part
  of their disclosure).

### `score` / `me` — the self-dashboard

The same card on yourself, nothing redacted, plus a **read-only standing
digest**: band-level summaries of renown / influence / competence /
traits, each line linking out (hover-previews `standing`, `traits`,
`competence`, `chronicle`). It is the MUD `score`, but it *digests and
points to* the detail verbs — it does not reimplement them. Identity
stays identity; advancement stays in its own verbs.

### The standing split — what shows on *others'* cards

Recommended default (open to revision):

| Measure | On self-card | On others' card |
|---|---|---|
| Renown | band | **band** (reputation is inherently outward) |
| Competence | band | **band** (observable skill — "a skilled bartender") |
| Influence (play/make/fund) | band | **self only** (political/economic standing isn't others' business) |
| Traits | band | **self only**; others instead get *your* compatibility read (the regard-baseline layer-3 read), never their internal estimate |

---

## Server design

- **Three controllers under `social/`** (presence is social-graph's
  turf): `WhoController`, `ProfileController`, and `score`/`me` as YAML
  aliasing onto `ProfileController` with a self-default target. All
  read-only, in the `StandingController` mold (single-token, zero/one
  arg, `MessageApi.scene(actor).topic(...).send()`).
- **Data sources (all shipped):**
  - online set → `PlayerApi.getAllAvatars()` for v1; **promote a thin
    `PresenceApi.online()` accessor** once the live `who` pane needs a
    single privacy-filtered read rather than every consumer re-scanning.
  - country → `ConnectionApi.originOf(playerId) → { country? }`.
  - viewer-aware naming → `RecognitionApi.describe(viewer, target)`.
  - standing bands → `RenownApi` / `InfluenceApi` / `AdvancementApi`
    (bands-only) / `TraitApi`.
- **New `privacy.*` settings** via the static-`settings`-on-mixin pattern
  `social.verbosity` already uses (`NotifyPolicyMixin` / EnvironmentMixin
  schema-on-owner). Likely a sibling or the same mixin.
- **The card is one viewer-aware composer** — the redaction logic lives
  in one place (a `ProfileApi.composeCard(viewer, target)` style seam,
  the cardinality-one sibling of the social-graph occupant formatter), so
  `who` rows, the `profile` card, and the live pane all share it.

---

## Client design

- **`who` — a live pane.** A "Who's Online" cockpit pane, fed off the
  presence deltas the relay already emits (`PlayerLoggedIn` /
  `Reconnected` / `LoggedOut` / `Disconnected`). Rows are the viewer-lensed
  roster. This is the consumer that justifies promoting
  `PresenceApi.online()`.
- **`profile` — the inspection pane.** Render the card into the existing
  right-column inspection pane (already MQL-subscription-backed and
  cardinality-polymorphic). The honest tradeoff:
  - *Refresh-button pane* — cheapest, bespoke, no subscription.
  - *Inspection-pane render* — reuses what's there and gets **live for
    free**, at the cost of making the projection **per-viewer** so
    redaction (recognition gating the name, disclosure gating soft
    fields) resolves correctly through the subscription — the
    viewer-aware-query / Shadow seam.
  - **Lean:** render through the inspection pane and build the card
    renderer viewer-aware from the start, so live is the default and
    "refresh" is the degraded path if the per-viewer projection proves
    fiddly. Same renderer either way.
- **Clickable, command-previewing.** Every name in the `who` roster is
  clickable and **hover-previews `profile <name>`** in the command bar;
  standing-digest lines on the self-card hover-preview `standing` /
  `traits` / etc. (the global "clickables preview their command" rule).

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

**Wave 1 — the card + the roster, command-only.**

- `ProfileApi.composeCard(viewer, target)` viewer-aware composer (the one
  redaction seam), reading recognition + country + the standing bands.
- `WhoController` (rides `getAllAvatars()` + the composer), `who` filters.
- `ProfileController` + `score`/`me` self-alias.
- `privacy.*` settings (status, species threshold) on the social mixin.
- Country pinned unconditional; the standing-split default.

**Wave 2 — the live client panes.**

- `PresenceApi.online()` thin accessor over the scan, privacy-filtered.
- Live "Who's Online" pane off presence deltas.
- `profile` card into the inspection pane; per-viewer subscribable
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
