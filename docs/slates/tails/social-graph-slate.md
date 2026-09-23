# Social graph slate (working doc)

> **Status: PARTIAL** — bucket storage (contacts.md) and Wave 3 (notify
> policy, display lensing, presence relay) shipped →
> [social-graph.md](../../subsystems/social-graph.md)
> **Left:** message-restyle live wiring (needs a sync contacts
> fast-path) · recognition-gated bucketing (deferred to the
> recognition-family build) · account-level bucket federation across
> characters · comms trust-tiered message policy (foes drop / friends
> bypass filters — comms-slate territory, untouched) · bucket-scale
> persistence follow-on · bucket-membership-change events
> **Size:** a tail

Working slate for the social-graph layer — notification rules and
bucket-keyed display verbosity over named lists of other characters.
Built on top of recognition; consumed by comms.

The framing insight: in a busy social space, recognition isn't
just "who do I know" — it's **attention management**. Strangers
go *more* ambiguous in a crowded room so the people who matter
stand out. Buckets are how the player tells the framework who
matters.

See also:

- [docs/slates/tails/social-inspection-slate.md](./social-inspection-slate.md)
  — the **sibling tail**: the player-facing *inspection* surface (`who`
  roster, `profile`/`finger` card, `score` self-dashboard) and the
  disclosure-dial privacy model. Disjoint scope — this slate is the
  *attention* surface (notification + display policy), that one is the
  *inspection* surface.
- [docs/subsystems/contacts.md](../../subsystems/contacts.md) — the
  **shipped** bucket storage + membership-verb layer (`ContactsMixin`,
  `contacts` verb suite, `ContactsGroupProvider`). This slate's
  Wave-1/Wave-2 work landed here.
- [docs/slates/recognition-slate.md](../tails/recognition-slate.md) — the
  substrate this slate builds on (recognition gating for `contacts add`
  is still deferred to that build — see Build order below). Bucket data
  itself lives on `ContactsMixin`, not the recognition record (the
  original sketch's plan; superseded).
- [docs/slates/comms-slate.md](../tails/comms-slate.md)
  — consumes bucket assignments for trust-tiered messaging.
- [docs/vision.md](../../vision.md) — the social/educational
  positioning that motivates this layer.
- [docs/subsystems/shell-environment.md](../../subsystems/shell-environment.md)
  — `EnvironmentMixin` keyspace; `social.*` settings live here.

---

## What this stresses for existing slates

### Comms slate

The bucket assignment is a primary input to comms
policy. A `foes` bucket member's messages drop; a `friends`
bucket member's bypass profanity filters. See
[comms-slate.md](../tails/comms-slate.md).

### Persistence framework

Buckets per player at scale (a player with 50 user-defined
buckets, 500 known actors): substantial state. Same persistence
considerations as recognition; flagged for follow-on.

---

## Open questions

Q1 (foes-onEnterRoom), Q3 (multi-bucket conflict), Q4 (aggregation
grouping), Q6 (default-bucket for new recognized actors), Q8 (max
rules/buckets), Q9 (server-defined institutional buckets), and Q10
(notification-channel routing) are resolved — see
[social-graph.md](../../subsystems/social-graph.md) §§ "The reserved
baseline", "ruleFor, strict ordered first-match", "Similarity
grouping", "The rule store", "Policy subject", and "Presence frames
render inline" respectively. Still open:

5. **Cross-server / cross-character bucket sharing** — a
   player on multiple characters may want shared friends list.
   Lean per-character v1; account-level federation v2.
7. **Bucket events** (`onAddedToBucket`, `onRemoved`) — fire
   to the target? Probably no — buckets are private state of
   the bucketer.

---

## Build order

Wave 1 (bucket substrate) and Wave 2 (bucket verbs) shipped as
`ContactsMixin` + the `contacts` verb suite — see
[contacts.md](../../subsystems/contacts.md). Wave 3 (notification +
display policy) shipped in a different, richer shape — see
[social-graph.md](../../subsystems/social-graph.md). Of Wave 4's three
items, two already shipped as part of Wave 3's actual scope: custom
per-rule display treatment (`notify <ref> --render/--boost/--color`)
and rule-priority adjustment (`notify <ref> --above/--below`) — see
social-graph.md § "The `notify` verb". Still open:

- Recognition gating (you can't bucket a stranger) is deferred to the
  recognition-family build; v1 `contacts add` is online-resolution only.
- Account-level bucket federation across characters (per-character v1
  today).
- Message-restyle live wiring — `styleMessageFor` exists and is tested
  but the live message path doesn't consult it yet (needs a sync
  contacts-fast-path); see social-graph.md § "A flagged deferral".

---

## What this slate does NOT cover

- **Recognition mechanics** — recognition-slate.
- **Trust-tiered moderation** — comms slate.
- **Cross-account social graphs** — beyond per-character.
- **Group-formation gameplay** (forming a study group with
  shared state) — game-layer; this slate provides the
  per-player categorization.
- **Federated / cross-server social graphs** — far-future.
- **Server-defined institutional roles** as buckets — touched
  briefly; out of band for v1.
- **Notification rate-limiting algorithms** — gate at the
  surface level; specific algorithms are implementation.
