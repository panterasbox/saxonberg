# Social graph slate (working doc)

Working slate for the social-graph layer — friends, foes,
custom buckets, notification rules, and bucket-keyed display
verbosity. Built on top of recognition; consumed by
communication policy.

The framing insight: in a busy social space, recognition isn't
just "who do I know" — it's **attention management**. Strangers
go *more* ambiguous in a crowded room so the people who matter
stand out. Buckets are how the player tells the framework who
matters.

See also:

- [docs/recognition-slate.md](./recognition-slate.md) — the
  substrate this slate builds on. Bucket data lives on
  recognition records.
- [docs/communication-policy-slate.md](./communication-policy-slate.md)
  — consumes bucket assignments for trust-tiered messaging.
- [docs/vision.md](./vision.md) — the social/educational
  positioning that motivates this layer.
- [docs/subsystems/shell-environment.md](./subsystems/shell-environment.md)
  — `EnvironmentMixin` keyspace; `social.*` settings live here.

---

## Principle

Three things this slate provides:

1. **Buckets** — categorize known actors. System-defined
   (`friends`, `foes`) plus user-defined arbitrary names
   (`classmates`, `study-group`, `lab-partners`).
2. **Notification policies** — per-bucket rules for what
   triggers a player-facing notification (connect, enter room,
   message, activity).
3. **Display policies** — per-bucket verbosity in DescribeApi
   v2 step 4. Friends get full names; strangers collapse into
   counts.

The result: **a 200-player tavern renders as a manageable
social scene** because the framework knows whose attention to
spend on.

---

## Bucket shape

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
[communication-policy-slate.md](./communication-policy-slate.md).

### User-defined buckets

Arbitrary names, arbitrary policies. Examples:

```
classmates       — fellow students from a course
study-group      — current project team
lab-partners     — chemistry-lab cohort
faculty          — instructors / staff
guildmates       — fictional-affiliation peers
```

Players manage via verbs:

- `bucket create classmates`
- `bucket add Bob to classmates`
- `bucket remove Bob from classmates`
- `bucket delete classmates`
- `bucket policy classmates onMessage=full`

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

### Communication policy slate

The bucket assignment is a primary input to communication-
policy. A `foes` bucket member's messages drop; a `friends`
bucket member's bypass profanity filters. See
[communication-policy-slate.md](./communication-policy-slate.md).

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

**Wave 1** — substrate.

- `SocialBucket` shape + `viewer.socialGraph` field.
- System-defined buckets created on player creation.
- `SocialGraphApi` (assign, remove, list, get-policy).

**Wave 2** — bucket verbs + management.

- `bucket` verb family (create, add, remove, list, policy).
- Verbs require `recognized` state for the target (you can't
  bucket a stranger).

**Wave 3** — notification + display policy integration.

- DescribeApi v2 step 4: bucket-aware rendering.
- Density-aware aggregation in the MML composer.
- Notification surfaces (banner, highlight, summary).
- `social.verbosity` setting in EnvironmentMixin keyspace.

**Wave 4** — power-user features (post v1).

- Custom display policies per-bucket.
- Bucket priority adjustment.
- Account-level bucket federation across characters.

---

## What this slate does NOT cover

- **Recognition mechanics** — recognition-slate.
- **Trust-tiered moderation** — communication-policy slate.
- **Cross-account social graphs** — beyond per-character.
- **Group-formation gameplay** (forming a study group with
  shared state) — game-layer; this slate provides the
  per-player categorization.
- **Federated / cross-server social graphs** — far-future.
- **Server-defined institutional roles** as buckets — touched
  briefly; out of band for v1.
- **Notification rate-limiting algorithms** — gate at the
  surface level; specific algorithms are implementation.
