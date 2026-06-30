# Social inspection — requirements

The player-facing **inspection surface** over the shipped identity &
social-perception substrate: a `who` roster of who's online, a
`profile`/`finger` card for inspecting another player, and a `score`/`me`
self-dashboard — all governed by a **disclosure-dial** privacy model
(presence always public, country unconditional, per-observer fidelity
raised by recognition). This build adds **no new subsystem**: every data
source already exists (recognition/belief, connection-origin, contacts,
the social-graph presence relay, the standing Apis). What's missing is the
read surface and the one disclosure setting that gates it. Seeded by
[social-inspection-slate](../slates/tails/social-inspection-slate.md).

## Goals

- **A `who` roster** lists every online player, lensed per-viewer
  (`RecognitionApi.describe`), with country always shown, supporting
  relationship-scoped filters and density aggregation at scale.
- **A `profile <player>` / `finger` card** shows one player's full
  identity set — the char-gen selections (species, sex, pronouns, name
  surface, aspiration, bio, portrait) plus the attribution accreted since
  (flavor status line, chronicle prologue/deeds, country, newness,
  outward standing) — redacted by *their* disclosure dial and *your*
  recognition of them per the tier table below. A stranger's card is real
  but heavily redacted.
- **A `score` / `me` self-dashboard** is the same card unredacted, plus a
  read-only digest of the player's own standing bands (renown / influence
  / competence / traits) that links out to the existing detail verbs.
- **An idle timer** tracks per-session inactivity so `who`/`profile`
  status distinguishes an active player from a parked one.
- **A disclosure model** where presence is unconditionally public,
  country is unconditionally visible, and the one tunable soft attribute
  (status detail) is governed by a per-attribute disclosure threshold —
  proving the "offer-without-friction" dial pattern with one real
  consumer, while `introduce`/recognition does the name-gating.
- **A live "Who's Online" cockpit pane** fed off the presence deltas the
  relay already emits, with clickable rows that hover-preview
  `profile <name>`.
- **One shared viewer-aware composer** so `who` rows, the `profile` card,
  and any future live pane share a single redaction seam.

## Non-goals

- **Live per-viewer `profile` pane.** Deferred to a follow-on. The
  per-viewer subscribed-projection pattern is confirmed to exist
  (`Container.contents` reads `(stuff, viewer)`), so this is a clean later
  addition; v1 renders `profile` as command output only.
- **Invisibility / "appear offline" / conditional perception.** Presence
  is a public fact in v1. Hiding existence is a privileged, per-pair,
  earned capability (slate's Deferred section), not a setting.
- **Moderation / blocking / muting** — comms-slate (`foes`-style drop).
- **City/region geo and the developer-gated IP read** —
  [connection-origin-slate](../slates/tails/connection-origin-slate.md)
  tail.
- **New standing measurement.** This build only *reads bands*; it adds no
  renown/influence/competence/trait mechanics.
- **Precise "member since" date** — coarse newness only (below).
- **Cross-account / cross-character identity federation** — far-future.
- **The notification & display-policy (attention) surface** — the sibling
  [social-graph-slate](../slates/tails/social-graph-slate.md); this build
  is the *inspection* surface and only *reuses* that layer's occupant
  lensing.

## Surface decisions

### Build scope — commands + the live `who` pane

The full server command surface (`who` / `profile` / `score`, the
disclosure model, the privacy setting) **and** the live "Who's Online"
cockpit pane. The pane rides presence deltas that already exist (low
risk). The live `profile` pane is deferred — it would bet on the
per-viewer MQL projection, and command/refresh `profile` delivers the
value without that bet.

### Presence is unconditionally public

If you are online you are on the `who` list, to everyone. No hide-flag.
What varies is **fidelity per (observer, observed) pair**, via the
existing recognition lens — a stranger row reads "a tall stranger — from
Brazil," a recognized row reads "Duncan — from Brazil."

### Country is unconditional

Country of origin (`ConnectionApi.originOf`) shows on every card and every
roster row, to everyone, always — no `privacy.showCountry`, no recognition
gate. Load-bearing world-fact given the political premise.

### Card contents & redaction tiers

The card surfaces the full char-gen identity set plus the attribution
accreted since, routed through three redaction tiers. **All perceived
identity is read through the perception/recognition layer
(`RecognitionApi.describe` / `getPresentation` / `salientFeatures`), never
raw mixin getters** — so disguise (`Disguisable`) and recognition state
are honored automatically and nothing leaks. The self-card reads raw (you
know yourself) and shows everything.

| Field | Source | Stranger | Recognized | Self |
|---|---|---|---|---|
| Perceived description (header) | `RecognitionApi.describe` / `salientFeatures` (disguise-aware) | ✓ "a tall human woman" | ✓ | ✓ |
| Name surface (honorific, name, surname, suffix, alternate names) | `NamedMixin` | — (hidden) | ✓ | ✓ |
| Portrait | `identity.portrait` setting + fallback chain | generic/disguised | real | real |
| Pronouns | `GenderedMixin.pronouns` | ✓ | ✓ | ✓ |
| Species | `OrganismMixin` (perceived) | ✓ | ✓ | ✓ |
| Sex | `SexedMixin` (perceived) | ✓ | ✓ | ✓ |
| Apparent age / lifecycle stage | `OrganismMixin` | ✓ coarse | ✓ | ✓ |
| Flavor status / "doing" line | `StatusMixin.getStatus()` | ✓ (rides presentation) | ✓ | ✓ |
| Aspiration (char-gen origin) | `PersonaMixin.aspiration` | — | ✓ | ✓ |
| Bio | `PersonaMixin.bio` | — | ✓ | ✓ |
| Chronicle prologue + notable deeds | `ChronicleApi.entriesFor` | — | ✓ prologue + public deeds | ✓ |
| Country | `ConnectionApi.originOf` | ✓ always | ✓ | ✓ |
| Coarse newness | `User.createdAt` | ✓ | ✓ | ✓ |
| Presence status (active/idle/engaged/reconnecting) | session (below) | online only¹ | ✓ | ✓ |
| Renown band | `Band.fromScalar(RenownApi.renownOf)` | ✓ | ✓ | ✓ |
| Competence band(s) | `AdvancementApi.bandFor` | ✓ | ✓ | ✓ |
| Influence bands (play/make/fund) | `InfluenceApi.bandOf` | — | — | ✓ digest |
| Traits | `TraitApi.positionsFor` | — | — | ✓ digest |
| Your label for them | observer's `ContactsMixin` | your annotation | your annotation | — |
| Your regard / compatibility | `RegardApi` (observer-owned) | your annotation | your annotation | — |

¹ Granular presence status gated by `privacy.showStatus` (below); bare
online always shows.

The tier split follows the model: **physical/observable** facts (species,
sex, pronouns, age, flavor line, perceived description) show to anyone who
can perceive the body, disguise-permitting; **persona** facts (proper
name, aspiration, bio, chronicle) are recognition-gated — a stranger is
"a tall human woman from Brazil," recognition unlocks "Dr. Mara Voss, the
healer." **Account/world facts** (country, newness, presence) attach to
the connection, not the body, so they show regardless of recognition.
**Renown and competence are always-outward** (the explicit decision below
— fame and observable skill precede acquaintance). **Influence and raw
traits are self-only.** **Observer-owned reads** (your contacts label,
your regard) are *your* annotation on their card, never part of their
disclosure. v1 recognition is two-tier (stranger vs recognized);
progressive field-by-field unlock is a later refinement.

### Privacy is a disclosure dial, not hide-flags

A privacy setting is the *floor* of what a stranger receives without
friction; it never reaches "nobody." v1 ships exactly one tunable soft
attribute:

- `privacy.showStatus: 'anyone' | 'contacts+'` (default `anyone`) — gates
  whether the **granular** status word (engaged / idle) is offered to
  strangers. Bare *online* is always shown (presence is public); a
  curtained player simply reads as online with no further detail.

Name is **always** recognition-gated (not a setting) — `introduce` is how
you raise a specific person above the floor. Species-as-presented is **not**
a separate setting — it rides the existing disguise / `getPresentation` /
recognition machinery. The threshold vocabulary (`anyone` / `contacts+`,
extensible to `introduced+`) is laid down as the dial substrate even
though v1 has one consumer.

This is distinct from `social.verbosity`, which points the other way
(observer's inbound noise preference, not the observed's outbound
disclosure).

### Presence status = active / idle / engaged / reconnecting

> **Disambiguation.** This *presence status* (a session-liveness word) is
> distinct from the `StatusMixin` **flavor line** ("Mara, watching the
> empty road") that rides `getPresentation`. The card shows both: the
> flavor line in the description header, the presence status as a separate
> liveness indicator. `privacy.showStatus` gates the *presence* word only.

Presence status is derived, in display-precedence order: **reconnecting**
(the
connection-loss machine) > **engaged** (`EngagedMixin` state) > **idle**
(inactivity past a threshold) > **active**. Bare presence (you are online
at all) is always public; the *granular* status word is the piece
`privacy.showStatus` gates.

The **idle timer** is the one net-new piece of plumbing. Nothing tracks
last input today, so:

- Add a transient `lastInputAt: Date` to `Interactive` — in-memory,
  never persisted, the sibling of the existing `connectedAt` — refreshed
  on each command dispatch (the `CommandGiverMixin` dispatch tail, the
  same seam participation events already tap).
- **Idle is derived, not stored.** A player is idle when
  `now - lastInputAt` exceeds the threshold; no idle *event*, no idle
  field — the status composer computes it on read.
- The threshold is an operator knob, not a constant: a `social.idleAfter`
  **AppSetting** (seconds; default ~300), per the app-settings
  single-source-knob pattern.

v1 ships idle as a single tier (active vs idle); a longer "away" tier and
a manual `away`/`back` verb are a natural later addition, not in scope.

### Renown shows outward on others' cards

| Measure | Self-card | Others' card |
|---|---|---|
| Renown | band | **band** (reputation is inherently outward) |
| Competence | band | **band** (observable skill) |
| Influence (play/make/fund) | band | self only |
| Traits | band | self only; others get *your* compatibility/regard read |

Renown is a scalar from `RenownApi.renownOf`; the card derives a
qualitative band via `Band.fromScalar` (the pattern `StandingController`
already uses), never showing the number.

### Coarse newness only

The card shows a coarse "new arrival" cue for very new accounts (derived
from `User.createdAt`, looked up from the Avatar's player), nothing
precise. Always visible, no gating. No precise join date in v1.

### `finger` ships as an alias

`finger` is a YAML alias for `profile` — free, and a recognizable MUD
affordance.

### `who` reuses the social-graph density aggregation

At scale `who` reuses the shipped occupant-lensing density tiers (collapse
like-strangers to counts) rather than always enumerating or inventing a
second aggregator.

### `who` filters narrow only on already-public facts

`who --here`, `who --friends`, `who --group <g>` (relationship-scoped) and
`who --country <c>`. The country filter is legitimate precisely because
country is unconditionally public — it leaks nothing the roster doesn't
already show. The rule is simply "filters can only narrow on what's
already on the card," so no special enumeration guard is needed.

### Self-dashboard hides empty standing lines

`score` digests the four standing measures but omits lines the player has
no signal in, rather than showing empty bands.

## Constraints

- **Module taxonomy.** The two new read seams — a `PresenceApi` (online
  roster accessor) and a `ProfileApi` (the `composeCard(viewer, target)`
  composer) — follow the Api + logic-singleton pattern (thin gated
  forwarding shell + `*Logic` where protection is needed), end with
  `SecurityApi.decorateApiClass`, and do **not** become free-floating
  helpers. The shared composer is the single redaction chokepoint.
- **Viewer from context, never a parameter.** Command controllers resolve
  the viewer as `context.commandGiver`; subscribed projections receive the
  authenticated subscriber via the framework `read(stuff, viewer)`
  signature. The acting viewer is never a caller-supplied, spoofable arg
  (project rule: gated APIs derive the principal from context).
- **Perceived identity routes through the perception layer — never raw
  getters.** For any viewer other than self, the card's name and physical
  fields come from `RecognitionApi.describe` / `getPresentation` /
  `salientFeatures`, so `Disguisable` masking and recognition state are
  honored. Reading `NamedMixin.getName()` / `OrganismMixin.getSpecies()`
  directly for another viewer would leak through disguise and recognition
  — a card-composer bug, not an option. The two "status" concepts are
  distinct: `StatusMixin` flavor line (rides presentation) vs the session
  presence status (`privacy.showStatus`-gated).
- **Read-only verbs.** All three verbs are read-only, in the
  `StandingController` mold (`MessageApi.scene(actor).topic(...).send()`),
  returning `void` with outcome on the dispatch-response envelope.
- **Reuse, don't duplicate.** Naming via `RecognitionApi.describe`
  (proper-name-vs-description handled there — `NamedMixin` is proper-names
  only); country via `ConnectionApi.originOf`; bands via
  `InfluenceApi.bandOf` / `AdvancementApi.bandFor` / `TraitApi.positionsFor`
  / `Band.fromScalar(RenownApi.renownOf(...))`; density collapse via the
  shipped occupant lens; presence deltas via the existing relay events.
- **`privacy.*` settings** via the static-`settings`-on-mixin pattern that
  `social.verbosity` uses (EnvironmentMixin schema-on-owner), on the social
  mixin (`NotifyPolicyMixin` or a sibling) — no new settings mechanism.
- **Client owns zero command semantics.** The live `who` pane renders
  server-projected rows; clickable rows preview `profile <name>` in the
  command bar (the global clickables-preview-their-command rule) and issue
  it on click — the client never composes the card itself.
- **`who` at scale is a bounded scan.** `PresenceApi.online()` is a cheap
  filter over `PlayerApi.getAllAvatars()`; the live pane rides existing
  presence deltas (no new event firehose).
- **The idle timer touches one hot path.** `lastInputAt` is refreshed at
  the `CommandGiverMixin` dispatch tail (a transient `Date` assignment —
  negligible) and is transient/in-memory like `connectedAt` (never
  persisted, no Hydrator field). Idle is derived on read against the
  `social.idleAfter` AppSetting — no idle event, no stored idle state, no
  timer-per-player.

## Acceptance criteria

- `who` lists every online player, each row viewer-lensed with country
  appended; `--here` / `--friends` / `--group` / `--country` filters work;
  at high occupancy like-strangers collapse via the shipped density tiers.
- `profile <player>` and `finger <player>` render the card with the
  full field set per the tier table: char-gen identity (species, sex,
  pronouns, name surface, aspiration, bio, portrait) + accreted
  attribution (flavor status line, chronicle prologue/deeds, country,
  newness, renown + competence bands). Name and persona are
  recognition-gated (stranger ⇒ salient-feature description, no name/bio);
  perceived physicality is disguise-aware (routed through
  `RecognitionApi.describe`, not raw getters); country/newness/renown show
  regardless; presence status gated by `privacy.showStatus`. Profiling a
  stranger works and is correctly redacted.
- `score`, `me`, and bare `profile` render the self-card fully unredacted
  plus the standing digest (renown / influence / competence / traits
  bands, empty lines hidden), each digest line hover-previewing its detail
  verb (`standing` / `traits` / `competence` / `chronicle`).
- `privacy.showStatus` is a settable per-character setting that observably
  changes whether a stranger sees the engaged/busy detail.
- A live "Who's Online" cockpit pane updates from presence deltas
  (login / reconnect / logout / disconnect); rows are clickable and
  hover-preview `profile <name>`.
- The viewer-aware card/row composition lives behind `ProfileApi` /
  `PresenceApi` following the Api + logic-singleton pattern; viewer is
  derived from context; `lint:gates` passes.
- A player who issues no commands past `social.idleAfter` is derived as
  idle in `who`/`profile`; any command resets them to active.
- Tests cover: per-viewer redaction (stranger vs recognized), the
  `privacy.showStatus` threshold, renown scalar→band rendering, the `who`
  filters, density collapse, coarse-newness derivation, and idle
  derivation against the `social.idleAfter` threshold.
- The finalize sweep graduates the surviving design into
  `docs/subsystems/` (the inspection surface folded into
  `social-graph.md`, or a dedicated subsystem doc), and the slate is
  updated/retired per the workflow retirement rules.

## Cross-references

- **Seeding slate:**
  [social-inspection-slate](../slates/tails/social-inspection-slate.md)
- **Sibling slate (disjoint scope):**
  [social-graph-slate](../slates/tails/social-graph-slate.md) — the
  attention surface (notification + display policy)
- **Substrate consumed:**
  [social-graph.md](../subsystems/social-graph.md) (presence relay,
  occupant lensing, `ConnectionApi.originOf`, `social.*` settings),
  [belief.md](../subsystems/belief.md) (`RecognitionApi.describe`,
  recognition / regard),
  [inspection-pane.md](../subsystems/inspection-pane.md) +
  [mql-subscription.md](../subsystems/mql-subscription.md) (the
  per-viewer projection path),
  [influence.md](../subsystems/influence.md) /
  [renown.md](../subsystems/renown.md) /
  [advancement.md](../subsystems/advancement.md) /
  [trait.md](../subsystems/trait.md) (band reads)
- **Connection-origin tail:**
  [connection-origin-slate](../slates/tails/connection-origin-slate.md)
  (country v1 shipped; IP/city deferred there)
