# Social graph slate (working doc)

Working slate for the social-graph layer — notification rules and
bucket-keyed display verbosity over named lists of other characters.
Built on top of recognition; consumed by comms.

> **Status: Wave 3 SHIPPED — the attention-management layer is built.**
> See [docs/subsystems/social-graph.md](../../subsystems/social-graph.md).
> The storage *substrate* shipped earlier as `ContactsMixin`; **Wave 3**
> now delivers the feature this slate is really about — per-*group*
> **notification policy** (the `notify` verb + the presence fan-out),
> per-viewer **display verbosity / density-aware aggregation** (the
> "200-player tavern renders manageably" thesis), the strict
> ordered-first-match `ruleFor` resolution, and the named-color highlight.
> A post-review rework reshaped the notification half: presence renders as
> an **ordinary inline message frame** (no toast/queue; the surface vocab
> collapsed `banner`/`log-only` → `show`|`silent`), over **four
> in-world-gated transitions** (login / reconnect / disconnect / logout),
> with a **per-character customizable Liquid line** (`social.presenceFormat`)
> and **country of origin shipped** (the connection-origin slate's country
> v1). One seam stays a flagged deferral (see Wave 3 below + the subsystem
> doc): the **message-restyle live wiring** (the method exists + is tested
> but isn't yet consulted by the live message path — needs a sync
> contacts-fast-path). **Recognition-state coupling** (consent friending,
> recognition-gated bucketing) remains the next build. Stays in `builds/`
> for Wave 4.

**Storage half SHIPPED.** The bucket *storage* + *membership
verbs* this slate originally proposed (`SocialBucket` shape,
`SocialGraphApi`, the `bucket` verb family) shipped as `ContactsMixin`
— per-Avatar named lists of durable identifiers, the `contacts` verb
suite, and a uniform `GroupApi` read surface. See
[docs/subsystems/contacts.md](../../subsystems/contacts.md). This slate
**no longer owns that layer**; it continues for what's NOT built: the
per-bucket **notification policy**, the per-viewer **display
verbosity / density-aware aggregation** (the "200-player tavern
renders manageably" thesis), and **recognition-state coupling**.
Where sections below describe bucket storage or `bucket *` verbs as
new work, read them as describing the now-shipped `ContactsMixin`
substrate (labels are the buckets); the live design is the policy +
lensing layer those sections wrap.

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
  substrate this slate builds on. Bucket data lives on
  recognition records.
- [docs/slates/comms-slate.md](../tails/comms-slate.md)
  — consumes bucket assignments for trust-tiered messaging.
- [docs/vision.md](../../vision.md) — the social/educational
  positioning that motivates this layer.
- [docs/subsystems/shell-environment.md](../../subsystems/shell-environment.md)
  — `EnvironmentMixin` keyspace; `social.*` settings live here.

---

## Principle

Three things, of which only the **first is built**:

1. **Buckets** — categorize known actors. **SHIPPED as
   `ContactsMixin` (see contacts.md)**: per-Avatar named lists of
   durable identifiers, arbitrary labels (`friends`, `study-group`,
   `lab-partners`, …), managed via the `contacts` verb suite. This
   slate no longer owns that layer. The two remaining are the live
   design:
2. **Notification policies** — per-bucket rules for what
   triggers a player-facing notification (connect, enter room,
   message, activity).
3. **Display policies** — per-bucket verbosity in DescribeApi
   v2 step 4. Friends get full names; strangers collapse into
   counts.

The result: **a 200-player tavern renders as a manageable
social scene** because the framework knows whose attention to
spend on.

> **Buckets are a *private attention lens*, never a reputation
> input.** Membership is unilateral self-declaration, so it carries
> no objective signal about anyone but its owner — it shapes *how
> you see the world* (verbosity, notifications), never another
> player's standing. Renown aggregates only over **objective
> `Group`s** (`GroupApi`), not contacts. See
> [reputation-slate](../builds/reputation-slate.md).

---

## Bucket shape

> **SHIPPED — see contacts.md.** The bucket storage + membership
> verbs landed as `ContactsMixin`: a single `_contacts: ContactEntry[]`
> persistent field of durable-identifier entries, with `addContact` /
> `removeContact` / `contactsByLabel` / `contactLabels` /
> `clearContactLabel` / `renameContactLabel` / `allContacts` as the
> method surface, and a `ContactsGroupProvider` exposing each label as
> a `contacts:<ownerPlayerId>:<label>` group ref. Labels ARE the
> buckets; there is no reserved label vocabulary in the shipped layer.
> The `SocialBucket` / `viewer.socialGraph` shapes below are the
> original sketch, retained as the conceptual model the
> notification-policy + display-policy sections (which are NOT built)
> hang off of. Read the `notification` / `display` fields as the
> *remaining* design, keyed by contact label.

```ts
interface SocialBucket {
  name: string;                       // 'friends', 'foes', 'classmates'
  members: Set<Stuff>;                // recognized targets in this bucket
  notification: NotificationPolicy;
  display: DisplayPolicy;
  isSystem: boolean;                  // 'friends'/'foes' are system; others user-defined
}

viewer.socialGraph: {
  buckets: Map<string, SocialBucket>;
  defaultBucket: string;              // for unrecognized actors; usually 'everyone-else'
}
```

A target can be in multiple buckets. Bucket assignments are
stored on the recognition record (`record.bucket: string` —
single primary bucket) plus a denormalized `members: Set` on
each bucket for fast iteration.

If a target's primary bucket assignment is ambiguous (in
multiple), display rules use most-specific-by-priority; the
player can promote one bucket as primary.

### System-defined buckets

Always present, can't be deleted:

| Bucket | Purpose | Default policy |
|---|---|---|
| `friends` | Player-marked friends | High verbosity, all notifications |
| `foes` | Blocked / muted | All notifications dropped, messages hidden |
| `everyone-else` | Default for recognized non-bucketed | Standard verbosity, minimal notifications |
| `strangers` | Unrecognized actors | Aggregate counts in dense rendering |

`foes` doubles as the moderation block-list — see
[comms-slate.md](../tails/comms-slate.md).

### User-defined buckets

Arbitrary names, arbitrary policies. Examples:

```
classmates       — fellow students from a course
study-group      — current project team
lab-partners     — chemistry-lab cohort
faculty          — instructors / staff
guildmates       — fictional-affiliation peers
```

Players manage these via the **shipped `contacts` verb suite** (see
contacts.md) — `contacts add`, `contacts remove`, `contacts show`,
`contacts list`, `contacts clear`, `contacts rename`. The original
`bucket create` / `bucket add` / `bucket policy` family the slate
proposed is what that suite *became*; the only piece not yet built is
the `policy` subcommand (`onMessage=full`-style notification tuning),
which is this slate's live notification-policy work below. Labels are
created implicitly by the first `contacts add` to them — there is no
`bucket create` / `bucket delete`.

---

## Notification policy

Per-bucket rules for events. The policy maps event types to
surfaces:

```ts
interface NotificationPolicy {
  onConnect:    'banner' | 'log-only' | 'silent';
  onDisconnect: 'banner' | 'log-only' | 'silent';
  onEnterRoom:  'highlight' | 'log-only' | 'silent';
  onLeaveRoom:  'log-only' | 'silent';
  onMessage:    'full' | 'summary' | 'drop';
  onActivity:   'highlight' | 'log-only' | 'silent';   // notable activities
  onProximity:  'silent' | 'log-only';                  // came near you
}
```

System defaults:

| Bucket | Connect | EnterRoom | Message | Activity |
|---|---|---|---|---|
| `friends` | banner | highlight | full | highlight |
| `foes` | silent | silent | drop | silent |
| `classmates` (user-default) | log-only | log-only | full | log-only |
| `everyone-else` | silent | silent | full | silent |
| `strangers` | silent | silent | full | silent |

Surfaces:

- **`banner`** — top-of-screen notification, unmissable.
- **`highlight`** — inline message with prominent rendering
  (color, sound).
- **`full`** — rendered in normal channel.
- **`summary`** — aggregated ("3 friends commented on the
  course channel").
- **`log-only`** — recorded in player's activity log; not
  rendered in real-time.
- **`silent`** / **`drop`** — not surfaced at all.

Rate-limiting layer: even highlight-and-banner surfaces have
per-source-per-time-window caps to prevent notification spam.

---

## Display policy — bucket-keyed verbosity

DescribeApi v2 step 4 reads display policy when rendering a
target in a multi-occupant room.

```ts
interface DisplayPolicy {
  nameRendering: 'name' | 'feature-string' | 'count-only' | 'hidden';
  highlightStyle?: string;     // MML semantic-tag attribute
  priority: number;             // sort order in room descriptions
  boostInDense: boolean;        // surface this target even when noise high
}
```

System defaults:

| Bucket | Name rendering | Priority | Boost in dense |
|---|---|---|---|
| `friends` | name + decoration | 0 (top) | yes |
| `foes` | name (with foe-marker) | 1 | yes (you want to see them) |
| `classmates` (user-default) | name | 2 | yes |
| `everyone-else` | name | 5 | no |
| `strangers` | feature-string OR count-only (depends on density) | 10 | no |

### Density-aware rendering

The room's actor count determines verbosity for low-priority
buckets:

- **Few actors (<10)** — every actor rendered fully.
- **Medium (10-30)** — `everyone-else` named; `strangers` in
  feature-strings.
- **Dense (30-100)** — `strangers` aggregated to counts;
  `everyone-else` named; `friends`/`classmates` boosted.
- **Very dense (>100)** — only friends/foes/classmates named;
  strangers and others as `(N others present)`.

The aggregation collapses *like* targets — strangers of similar
species/clothing render as one group ("12 dwarves in red
robes"), not generic "47 others."

### Player-tunable verbosity

A `social.verbosity` setting per-player:

```yaml
social.verbosity: 'minimal' | 'standard' | 'verbose'
```

`minimal` aggregates aggressively even at low density. `verbose`
names every actor regardless. `standard` is the density-aware
default above.

Server-side default per deployment: `standard`. Educational
deployments may default differently per the social context.

---

## Worked scenario — a busy tavern

Setup: Mara walks into a tavern with 47 actors. Mara's social
graph has Bob and Sarah as `friends`; 8 known classmates; the
rest are strangers or known-but-uncategorized.

### Default rendering (standard verbosity)

```
You enter The Salty Dog.

You see your friends Bob and Sarah at the bar. Among the
classmates here are Tom, Anna, and Pete (and 5 others). The
mead-merchant from yesterday is by the door.

(35 other patrons are here.)
```

The aggregated "35 other patrons" is MQL-queryable
(`look at patrons`, `talk to mead-merchant`). The named friends
boost above the noise.

### Verbose mode

```
You enter The Salty Dog.

You see Bob, Sarah, Tom, Anna, Pete, [list continues for all 8
classmates], the mead-merchant from yesterday, [feature-strings
for each of 35 strangers].
```

A wall of text, but available if the player wants it.

### Enter event

A new actor walks in:

- **Friend Greg enters**: banner → *"Greg has arrived at The
  Salty Dog."*
- **Classmate Vincent enters**: highlight inline → *"Vincent
  walks in from the south door."*
- **Stranger enters**: silent (not surfaced unless player looks
  again).
- **Foe enters**: silent (per `foes.notification.onConnect:
  silent`)... actually, here the player might want a warning.

Hmm — `foes` policy default for `onEnterRoom` should perhaps be
`highlight` or `banner` (you want to know they're around). The
default table above had `silent` for foes; reconsider in open
questions.

---

## What this stresses for existing slates

### Recognition slate

Buckets are stored on the recognition record (`record.bucket`).
Recognition slate references social-graph but doesn't depend on
it; bucket assignments are nullable; missing bucket falls
through to `everyone-else` default.

### Comms slate

The bucket assignment is a primary input to comms
policy. A `foes` bucket member's messages drop; a `friends`
bucket member's bypass profanity filters. See
[comms-slate.md](../tails/comms-slate.md).

### Messaging subsystem (api/mml.ts)

The MML composer reads display policy when rendering a scene.
Bucket-aware rendering is a function the composer calls;
result is the rendered MML.

### Persistence framework

Buckets per player at scale (a player with 50 user-defined
buckets, 500 known actors): substantial state. Same persistence
considerations as recognition; flagged for follow-on.

### Settings framework

`social.verbosity` lives in the EnvironmentMixin keyspace;
fits the existing pattern.

---

## Open questions

1. **Foes-onEnterRoom default** — silent (don't add to noise)
   or highlight (you want awareness)? Lean highlight.
2. **Bucket assignment storage** — primarily on recognition
   record (single bucket) or on bucket's member set (multi-
   membership)? Lean record-side primary; bucket-side
   denormalized for iteration.
3. **Multi-bucket conflict** — Bob is friend AND classmate.
   Which display policy wins? Lean priority order; lower
   `priority` number wins (friends top).
4. **Aggregation grouping** — "12 dwarves in red robes" vs "12
   strangers." How aggressive is similarity grouping? Lean
   author-friendly: same species + same most-distinctive-
   wearable groups.
5. **Cross-server / cross-character bucket sharing** — a
   player on multiple characters may want shared friends list.
   Lean per-character v1; account-level federation v2.
6. **Default-bucket for new recognized actors** —
   `everyone-else` (lean) or `strangers` (until first
   acknowledgment)? Probably `everyone-else` once recognized.
7. **Bucket events** (`onAddedToBucket`, `onRemoved`) — fire
   to the target? Probably no — buckets are private state of
   the bucketer.
8. **Maximum buckets per player** — soft cap for sanity?
   Probably 50 user-defined.
9. **Server-defined buckets** for institutional roles —
   "faculty", "students", "staff"? Out of band; server admin
   sets up. Could compose with player-defined buckets.
10. **Notification-channel routing** — banner vs log-only
    might map to different output streams (a notifications
    channel vs the main chat). Client-side rendering concern;
    flag for client UI design.

---

## Build order

**Wave 1 — substrate. SHIPPED as `ContactsMixin` (contacts.md).**

- ~~`SocialBucket` shape + `viewer.socialGraph` field~~ → shipped as
  `ContactsMixin._contacts` on `Character`.
- ~~System-defined buckets created on player creation~~ → labels are
  generic strings created on first `contacts add`; no reserved set.
- ~~`SocialGraphApi` (assign, remove, list, get-policy)~~ → the
  `Contacts` method surface + `ContactsGroupProvider` read path.

**Wave 2 — bucket verbs + management. SHIPPED as the `contacts`
verb suite (contacts.md).**

- ~~`bucket` verb family (create, add, remove, list, policy)~~ →
  `contacts add/remove/show/list/clear/rename`. The `policy`
  subcommand is the one piece deferred to Wave 3 below.
- Recognition gating (you can't bucket a stranger) is deferred to the
  recognition-family build; v1 `contacts add` is online-resolution only.

**Wave 3 — notification + display policy integration. SHIPPED.** See
[docs/subsystems/social-graph.md](../../subsystems/social-graph.md). What
landed (with the design refined past the original sketch above):

- ~~DescribeApi v2 step 4: bucket-aware rendering~~ → the per-viewer
  `SocialApi.composeOccupants` formatter, a sibling of
  `RecognitionApi.describe` one cardinality up, wired at the single
  `LookController` occupant seam (look + arrival).
- ~~Density-aware aggregation in the MML composer~~ → the four-tier
  density table + `(species, worn-feature)` similarity grouping, the
  collapsed line a targetable `mudq:` MQL-seed handle.
- ~~Notification surfaces (banner, highlight, summary)~~ → the net-new
  `PlayerLoggedIn`/`PlayerLoggedOut` fan-out (reverse-keyed,
  rate-limited, MQL-excluded, privacy-gated) → `world.social.presence`
  frames → the client `NotificationQueue`; message restyle implemented +
  tested (live wiring deferred — see banner).
- ~~`social.verbosity` setting~~ → declared `static settings` on
  `NotifyPolicyMixin` (schema-on-owner).
- **Beyond the sketch:** policy keyed on **any `GroupRef`** (not just
  contacts); **strict ordered first-match with positional authority**
  replacing the "priority integer" / "max salience" rules; the dedicated
  **`notify` verb** (not a `bucket policy` subcommand); the
  `NotifyPolicyMixin` per-character store (sibling of `_contacts`); named
  theme-palette **`color`** tokens; and the thin **settings card** over
  `notify` (every control previews+issues its command).

Two deferrals carried out of Wave 3 (flagged in the subsystem doc):
**message-restyle live wiring** (`styleMessageFor` exists + is tested but
the live message path doesn't consult it yet — needs a sync
contacts-fast-path for the multi-recipient async-`ruleFor` wall) and the
reserved **`country?` geo seam** (payload field reserved, populated once
the connection-origin substrate lands).

Several Wave-3 open questions above are now resolved: **Q1**
(foes-onEnterRoom) is moot — movement is not a notification event; **Q3**
(multi-bucket conflict) → strict ordered first-match, list order is
precedence; **Q4** (aggregation grouping) → `(species, most-distinctive
worn feature)`; **Q8** (max rules) → soft cap 50 at set-time; **Q10**
(channel routing) → banner→queue, log-only→quiet inline, silent→unsent.

**Wave 4** — power-user features (post v1).

- Custom display policies per-bucket.
- Bucket priority adjustment.
- Account-level bucket federation across characters.

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
