# Chat slate (working doc)

> **Status: PARTIAL** — the v1 core shipped (Channel Document, the three
> kinds, ChannelCatalogue, the Subject retrofit, party + committee chat as
> *bound* channels, `chat anonymity`) →
> [chat.md](../../subsystems/chat.md)
> **Left:** the role overlay (projected rank + stored overlay; only
> `owner` gates today) · the channel config block (`editPolicy` ·
> per-channel `retention` · `postPermission` · default notification level ·
> topic) · notification levels + the sane projection default · mentions
> (`@name`/`@here`/`@channel` + the permission) + the offline inbox ·
> guild/zone projection + the moderation override layer + the cached
> derived set · edit/delete + the "(edited)" marker · pinned +
> announcement mode · directory search + presence notices · the bounded
> backlog on tune-in · succession / abandonment GC / the creation cap ·
> per-channel spam throttles · the two anonymity seams (disguise on a
> `permitted` channel · an authored `anonymity:` on a seeded subject) ·
> the generative-axes model (a place / an activity binding — unverified
> against the three-kinds decision) · regional channels (a zone-scoped
> channel — Q6, absorbed from comms) · `retention: 'logged'` + `chat_log`
> and the `ordered` procedure's discipline (the chat-surface extensions
> absorbed from forums, with their bounds/vocabulary questions Q7–Q8)
> **Size:** a wave

Working slate for **chat channels** — guild chat, party lines, global
bands, help, trade, ad-hoc groups, DMs-as-the-degenerate-case. It's
genuinely a chat app (Discord/Slack/IRC feature surface) crossed with the
MUD channel heritage — but with one twist that tames the whole thing:
**most channels aren't created, they're *projected* from the world's
social structures.**

The load-bearing decisions shipped — see [chat.md](../../subsystems/chat.md):
three fixed kinds rather than a facet model (superseded — § Three channel
kinds), channels consume the grouping facade (§ Chat consumes the group
substrate; party chat is a *bound* channel — § Bound channels),
membership ≠ subscription (§ Membership ≠ subscription), chat ≠ Mudlog and
all-diegetic (the intro), `chat <channel> <message>` with no channel-as-verb
(§ Verb shape and the fallthrough flag).

See also:

- [comms-slate.md](../tails/comms-slate.md) — the **implant transport** chat
  rides, the conversation primitive (DM/group/channel as one shape), and
  directed speech. Chat is the channel-rich end of comms' implant family.
- [grouping subsystem](../../subsystems/grouping.md) — **the grouping facade
  channels project over** (the `GroupApi` membership/role source;
  guilds/parties/cohorts/managed groups all behind it). The key
  dependency: groups are primary, chat is a projection over them.
- [social-graph-slate.md](../tails/social-graph-slate.md) — personal buckets
  (friends/classmates); *one source* into the grouping facade, not the
  facade itself.
- [augmentation-slate.md](../tails/augmentation-slate.md) — the device carrying every
  channel; history framed as its storage.
- [emotes-slate.md](../builds/emotes-slate.md) — sibling expression channel; the
  reactions hook (`tags`) and the gutter message-id are shared.
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) —
  **`MudlogApi` + topics: the game-event feed, explicitly NOT chat.**
  The Scene composer delivers chat messages like any other.
- [message-rendering-slate.md](../tails/message-rendering-slate.md) — **how a
  channel line renders**: the tagged-complete-string model (`[Gossip]` is
  a `<chan>` label that flattens whole + reflows to a column), per-channel
  color as a stylesheet rule, channel stylesheets, markdown.
- [client-cockpit-slate.md](../tails/client-cockpit-slate.md) /
  [console-filtering-slate.md](../tails/console-filtering-slate.md) — rendering:
  per-conversation buffers/tabs, topic filtering, the gutter message-ids.
- [npc-dialogue-slate.md](../tails/npc-dialogue-slate.md) — remote NPCs reachable
  via implant DM; in-channel NPCs are a content matter.
- [docs/design-philosophy.md](../../design-philosophy.md) — liberal diegesis;
  Principle 3 (layered presentation) for provenance rendering.

---

## The generative axes

| Axis | Values |
|---|---|
| **Membership source** | stored set · **derived projection** · open-join · ad-hoc |
| **Binding** | untethered · a group · a place (zone/room) · an activity (instance/class/event) |
| **Lifetime** | persistent · tied-to-binding's-lifecycle · ephemeral |
| **Role model** | flat · projected-from-binding · own overlay |
| **Config** | the per-channel config block (below), projected-with-override |

The four channel **kinds** these generate:

| Kind | Audience from | Notes |
|---|---|---|
| **group-projected** | a social group (guild/party/cohort/**zone**) | the bulk; membership + roles derived; lifecycle = the group's |
| **standalone** | open-join or place-derived | global, help, trade; owns its membership + roles |
| **player-created** | a player | owned; GC'd when abandoned (§ Lifecycle) |
| **ad-hoc** (DM/group) | implicit, by addressing | ephemeral; the comms conversation primitive |

*(Announcement/broadcast is **not** a kind — it's a `postPermission`
config value: post restricted to admins, members read.)*

---

## Membership ≠ subscription (the two-layer split)

- **Subscription / tuning** — are you actively listening, and how loudly?
  **Stored per-player-per-channel**: tuned in/out + a notification level
  (`all / mentions-only / ambient / silent`). Always yours, even on a
  mandatory channel.

When a channel auto-projects onto you (you join a guild), it arrives
**tuned-in at a sane default level** (mentions-only or ambient — never
all-ping), and you tune *up* the few you care about. This is the
**notification-overload** defense: dozens of projected channels stay
quiet until you opt them louder.

---

## Projection + override (the derived-membership mechanism)

A projected channel is a **live view** over a group/place, not a stored
member list — but moderation needs to mute/ban on the *channel* without
touching the *group*. So the channel carries a thin **override layer**:

> **effective audience = (derived members) ∪ (stored adds) − (stored bans/mutes)**

99% of the time the override is empty (pure projection); moderation
writes to it. Same pattern for roles (projected from group rank, with a
stored overlay) and for config (group defaults + per-channel override).

*(Superseded by the code: a bound channel IS a `Channel` Document on a
Subject bound to the group's `GroupRef`, minted with the party and
disbanded with it — chat.md § Bound channels.)*

**Perf:** cache the derived set; dirty it on the group/place membership-
change events the grouping facade emits (`GroupApi.onMembershipChange`).
Never recompute
per message.

---

## Roles & permissions

Lean permission set per member: `post · invite · manage (config/rename) ·
moderate (mute/kick) · admin (delete/grant-roles)`. Two sources (mirroring
membership):

- **Projected** — group rank → channel role (guild officer → moderator).
- **Stored overlay** — standalone/player channels carry their own owner +
  mods.

The key subtlety: a channel **moderate** action writes to the *override
layer* (mute/ban this person *here*), distinct from a group action (kick
from the guild). A guild officer can silence a spammer in guild chat
without expelling them from the guild.

---

## The channel config block

Every channel carries config, **projected-with-override** like membership
and roles (group defaults + per-channel override):

- **`editPolicy`** — `none` / `delete-window` (retract-only) / `full-edit`.
  *Per-channel because channels span a spectrum:* ephemeral gossip is
  utterance-like (no/low edit); a persistent planning or announcements
  channel is document-like (edit useful). *Default `delete-window`*;
  persistent channels opt up, ad-hoc may sit at `none`.
- **`retention`** — history/ring-buffer depth (the implant's storage
  depth). A firehose global keeps little; guild keeps more.
- **`postPermission`** — `open` / `announcement` (admins-only).
- **default notification level** — the level a channel projects in at.
- **name / topic / description**.
- **the role overlay**.

### Absorbed from forums-slate — Chat surface (`retention: 'logged'` + `procedure`)

*Verbatim from forums-slate § Part 0 › Data model (cluster pass: the
channel config is chat's). Vocabulary as written there; what shipped is
`Channel.subject` and the `procedure` FLAG as `'open' | 'ordered'`
(`'ordered'` behavior deferred) — chat.md § Since forums cycle-1,
forums.md § The four surfaces. `retention: 'logged'` + `chat_log` and the
ordered discipline itself are the open part; the two open questions that
ride them are Q7–Q8 below.*

- **Chat surface** — the existing `Channel`, extended to carry a `subject`
  ref, a **`retention`** policy (`'ring'` default, the ephemeral 200-buffer of
  today; `'logged'` — every frame persisted to a `chat_log` collection), and a
  **`procedure`** mode (`'free'` default; `'rules-of-order'` — a recognized-
  speaker / motion-and-second discipline for digital deliberation). Ephemeral
  subjects default chat to `logged` (so the synchronous floor debate is
  captured complete and sealed into the archive) and may opt into
  `rules-of-order`; standing high-volume chat stays `ring` / `free`. (Chat-
  subsystem extensions, not new machinery; `procedure` is a parked surface
  policy — design deferred.)

---

## History, catch-up, offline

- **Bounded backlog on tune-in**, not a replay: the last few lines + a
  "you missed N" marker. `chat history <ch>` for the full ring. Replaying
  everything every tune-in is overload.
- **Retention is per-channel** (config) — framed as implant storage depth.
- **Mentions-while-away survive offline** → a persistent inbox. Ambient
  chatter does not (the ring is best-effort/ephemeral).

---

## Discovery & presence

- **Projected channels auto-appear** — joining the guild surfaces guild
  chat; most channels need no discovery at all (the projection payoff).
- **Directory** for standalone/player channels — `chat list` / search by
  name/topic.
- **Presence** — `chat who <ch>` shows tuned-and-present members; tune
  join/leave notices on small channels, off by default on big ones.

---

## Message model

- **Mentions** — `@name`, `@here`, `@channel` drive notification
  escalation + the offline inbox. `@channel`/`@here` are a *permission*
  (not everyone can mass-ping).
- **Pins / announcements** — `postPermission: announcement` (admins post,
  members read).
- **Edit / delete** — per the `editPolicy` config; **edit is self-only**
  (mods don't rewrite words), **delete is self + moderator**; edited
  messages show an **"(edited)"** marker. Edit-trail-for-moderation
  (catching edit-to-hide-abuse) is heavier → deferred to the moderation
  control plane; v1 keeps just the marker + mod-delete.
- *Threads / reactions shipped; the shared message-id is `meta.commandId`
  (chat.md § Posting, reactions.md).*

---

## Player-created channels (lifecycle)

The one truly user-authored kind. Guardrails MUDs learned the hard way:

- **Succession** — owner leaves → transfer to most-senior remaining
  mod/member; if none, **dissolve**.
- **Abandonment GC** — empty channel (no members) → reaped after a grace
  period (or archived).
- **Limits** — a modest per-player creation cap (anti-squatting).

---

## Hard problems (named so the build expects them)

- **Proliferation** — every group projecting a channel = dozens fast.
  Mitigated by sane default notification levels (§ two-layer split), the
  projection model (no manual management), and the unread/priority view.
- **Projection perf** — cache derived membership, dirty on group-change
  events; never per-post.
- **Moderation override** — the effective-membership math must let channel
  moderation work without group changes.
- **Spam / rate-limiting** — per-channel post throttles (partly the
  moderation subsystem).
- **Abandoned player channels** — GC (above).

---

## Worked scenarios

- **Guild chat (group-projected):** join a guild → guild chat appears,
  tuned at mentions-only. `chat guild on the way` posts to every tuned
  member. An officer mutes a spammer → override layer, guild membership
  untouched.
- *Party line · global band · help — shipped: chat.md § Bound channels,
  § Three channel kinds, § Bootstrap and seeding.*
- **Player channel:** `chat make raid-night` → you own it, invite friends;
  you leave → transfers to a mod or dissolves; empty → GC'd.
- *DM (ad-hoc) — shipped: comms.md § Implant — dm / tell.*

---

## Open questions

Most forks are leaned; these remain:

1. **Channel language gating.** Does the comms (ii) lean (implant comms
   are language-bound) apply to channels? *Lean: players share common, so
   not in practice v1; a per-channel language is possible content.*
2. *Resolved: `chat anonymity <name> permit|forbid` + `--anon` — chat.md
   § `anonymity`.*
3. **`@channel`/`@here` permission model** details (who, rate limits).
4. **Edit-trail for moderation** — deferred to the moderation control
   plane; confirm at requirements.
5. **Cross-posting / channel bridging** — almost certainly out; flag if
   wanted.

*Absorbed from comms-slate — Open questions Q3 (cluster pass: chat owns
the place-binding axis, § The generative axes):*

6. **Regional channels.** A channel scoped to a zone (a bridge between
   acoustic locality and implant networks)? Worth considering.

*Absorbed from forums-slate — Open questions (the chat-surface
extensions; the design is § The channel config block › Absorbed from
forums-slate):*

7. **Procedure mode (`rules-of-order`)** — the digital deliberation discipline
   (recognized speaker, motion/second/amend). Parked: vocabulary + enforcement
   TBD; default `free`.
8. **Chat-log bounds** — does a `logged` chat have any cap / pruning; can a
   standing subject opt into `logged`; archived-log storage/retention.

---

## Build order

*Wave 1 shipped → chat.md. Its notification levels and projected/overlay
roles did not ship and are carried in the sections above.*

**Wave 2 — config, moderation, player channels.** The channel config
block (edit/retention/post-permission); the moderation override layer;
player-created channels + lifecycle/GC; directory/discovery;
presence/roster.

**Wave 3 — the rich surface.** Mentions + offline inbox; announcement
mode polish; richer notification routing. (Threads/reactions land via the
reactions slate, sharing the gutter message-id.)

---

## What this slate does NOT cover

- **The implant transport + device** → comms + implant slates. Chat is
  the channel model on top.
- **Acoustic speech** (say/whisper/shout) → comms (sound slate for reach).
- **Game-event feeds** → `MudlogApi` + topics. Explicitly not chat.
- **Reactions / threads machinery** → reactions slate. Chat provides only
  the gutter message-id.
- **The moderation control plane** — chat surfaces channel identity + the
  override layer; the moderator tooling/sanitizer is the moderation
  subsystem.
- **Social-graph / group definitions** — consumed as the projection
  source, not defined here.
- **Client console / buffer rendering** → cockpit + console-filtering
  slates.

---

## Once shaped into formal requirements

This slate boils down to:

- The **facet model + four-kind taxonomy** generated from one
  conversation primitive; **channels-as-projection-over-the-grouping-facade**.
- The **membership ≠ subscription** split (derived eligibility + override
  layer; per-player tuning + notification levels + sane projection
  defaults).
- **Projection + override** for membership, **roles** (projected + stored
  overlay), and the **config block** (editPolicy / retention /
  postPermission / notification default / name+topic / roles), each
  projected-with-override; the perf strategy (cache + dirty on group
  events).
- **History/catch-up** (bounded backlog + ring + retention) and the
  **offline mention inbox**.
- **Discovery-via-projection** + directory + `chat who`.
- The **message model**: mentions (+ `@channel` permission), announcement
  mode, per-channel edit (self-only) / delete (self+mod) + "(edited)"
  marker, and the shared gutter message-id (reactions deferred).
- **All-diegetic** (no IC/OOC axis); **player-channel lifecycle/GC**.
- Tests: a guild member is auto-eligible but can mute; a channel mute
  doesn't drop guild membership; an unauthorized poster is refused on an
  announcement channel; a tuned-out player misses ambient but gets
  offline mentions; an abandoned player channel is GC'd; editPolicy is
  honored per channel.

Reactions/threads, the moderation control plane, anonymity, and channel
language gating wait for their own work.

---

## ⭐ Tails from the presentation build (2026-09-11)

Chat anonymity shipped → [chat.md § `anonymity`](../../subsystems/chat.md),
[presentation.md](../../subsystems/presentation.md). Two seams remain.

- **`permitted` + plain still consults the disguise.** A poster who is
  neither anonymous nor on a forbidding channel renders `concise`, which
  is a *declarative* form — it does not ask whether the reader could see
  through a hood. That is deliberate (a channel is not looking at you, it
  is reading what you typed) but it means a disguised speaker's channel
  line and their room line can disagree. The attach point is one line in
  `ChannelCatalogue.postToChannel` for the case where a visible change is
  allowed to show.
- ⚠ **A seeded subject cannot author its `anonymity:` — and not merely
  for scope.** `PackLogic.ensureSurface` applies its `mint()` closure
  **only when the row is new**; an existing row gets `archived`, `name`
  and `description` and nothing else. So an authored `anonymity:` would
  be a one-time default that silently diverges from the YAML forever
  after: edit the row, reinstall, nothing happens. That is a worse
  authoring surface than none, and *"does the row or the owner win on
  reinstall?"* is a real question nobody has decided. ⭐ The attach point
  is the `mint()` in `PackLogic.ts` **plus** the matching field on
  `renderSubjectRow`'s preimage — both, or reconcile sees a permanent
  diff. Nothing shipped wants a non-default value today, and `chat
  anonymity` is the player-facing path.
