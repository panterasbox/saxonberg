# Chat slate (working doc)

> **Status: architecture set, a few forks leaned.** The channel system —
> "our own chat app inside the game." Graduates the *channels* half of
> the comms slate into its own subsystem. Chat is the rich end of the
> implant transport; comms owns the conversation primitive and the
> transport, chat owns the channel model on top.

Working slate for **chat channels** — guild chat, party lines, global
bands, help, trade, ad-hoc groups, DMs-as-the-degenerate-case. It's
genuinely a chat app (Discord/Slack/IRC feature surface) crossed with the
MUD channel heritage — but with one twist that tames the whole thing:
**most channels aren't created, they're *projected* from the world's
social structures.**

The load-bearing decisions:

1. **One conversation primitive + a facet model — not a list of channel
   types.** The type explosion ("persistent vs ad-hoc, group-derived vs
   created vs synthesized, roled vs flat…") is a *cross-product of
   orthogonal axes*. Model the axes, not the types.

2. **Channels are mostly a projection over the grouping facade.** Unlike
   Discord (users create servers), here a guild *is* a group and
   *affords* a channel; a party forms → party chat materializes →
   disbands → it's gone. **Groups are primary; channels fall out of
   them.** You never author "guild chat" — it's emergent. This is the
   single idea that turns "build a chat app" into "a thin projection
   layer over social structures + a few standalone channels."

3. **Membership ≠ subscription.** Two separate per-player states:
   *membership/eligibility* (often **derived** — you're in guild chat
   because you're in the guild) and *subscription/tuning* (per-player:
   tuned in/out + notification level). You can't leave a mandatory
   channel, but you can always mute it — because mute is subscription,
   not membership.

4. **Chat is conversation; Mudlog is the game narrating.** Game-event
   feeds (combat log, deaths, world events, trade ticker) are **not**
   chat channels — they're `MudlogApi` + its topic landscape, which
   already exists and *is* the feed substrate. Chat is agents talking to
   agents. Don't conflate the two. (The client console can render a
   Mudlog buffer beside a chat buffer; underneath they're separate.)

5. **All channels are diegetic** (liberal diegesis): help = a *mentor
   frequency*, global = the *common band*, a player channel = a *private
   frequency*. No IC/OOC axis, no `isIC` property, no OOC infrastructure.
   Every channel is a frequency on the universal implant.

6. **No channel-as-verb.** `chat <channel> <message>` — not the MUD
   `gossip hello` idiom.

See also:

- [comms-slate.md](../tails/comms-slate.md) — the **implant transport** chat
  rides, the conversation primitive (DM/group/channel as one shape), and
  directed speech. Chat is the channel-rich end of comms' implant family.
- [grouping subsystem](../../subsystems/grouping.md) — **the grouping facade
  channels project over** (the `GroupApi` membership/role source;
  guilds/parties/cohorts/managed groups all behind it). The key
  dependency: groups are primary, chat is a projection over them.
- [social-graph-slate.md](../builds/social-graph-slate.md) — personal buckets
  (friends/classmates); *one source* into the grouping facade, not the
  facade itself.
- [augmentation-slate.md](../tails/augmentation-slate.md) — the device carrying every
  channel; history framed as its storage.
- [emotes-slate.md](../tails/emotes-slate.md) — sibling expression channel; the
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

## Principle

1. **Facets, not types.** A channel is the one conversation primitive
   configured along a few axes (below).
2. **Projection over the grouping facade.** Groups are primary; channels
   are their affordance. Standalone + ad-hoc channels are the minority.
3. **Membership ≠ subscription.** Eligibility (often derived) vs tuning
   (always yours).
4. **Chat ≠ Mudlog.** Agents conversing vs the game narrating events.
5. **All diegetic** (liberally interpreted).

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

There is deliberately **no feed-channel kind** — game-event feeds are
`MudlogApi`/topics (decision 4).

---

## Membership ≠ subscription (the two-layer split)

- **Membership / eligibility** — are you in the channel's audience? For
  projected channels this is **derived** (computed from the group/place),
  not stored. Generally locked (you can't leave guild chat without
  leaving the guild).
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

A projected channel may not even be a heavy object — an affordance on the
group + the override layer + the per-player subscription rows. Lifetime
is the group's: group dies → channel dies.

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

---

## Command surface

- **Post:** `chat <channel> <message>` — channel required first, rest
  greedy (unambiguous, same shape as `tell <target> <msg>`). **No
  channel-as-verb** (`gossip hello` rejected).
- **Manage:** reserved subcommands — `chat list`, `chat join/leave <ch>`,
  `chat mute/unmute <ch>`, `chat history <ch>`, `chat who <ch>`,
  `chat make <name>`. Reserved words checked first; anything else →
  (channel, message). Only constraint: a channel can't be named a
  reserved subcommand. Matches the framework's existing subcommand style
  (`measure <field>`, `prompt cancel`).
- Per-player short aliases ride the existing alias system.

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
- **Threads / reactions** → the **[reactions slate](../tails/reactions-slate.md)**
  owns these. Chat only
  provides the stable **gutter message-id** they (and mentions, and edit)
  all depend on — the one piece of plumbing chat shares with reactions.

---

## Player-created channels (lifecycle)

The one truly user-authored kind. Guardrails MUDs learned the hard way:

- **Succession** — owner leaves → transfer to most-senior remaining
  mod/member; if none, **dissolve**.
- **Abandonment GC** — empty channel (no members) → reaped after a grace
  period (or archived).
- **Limits** — a modest per-player creation cap (anti-squatting).
- **Naming** — uniqueness rules, no impersonating system channels,
  reserved words blocked.

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
- **Party line (group-projected, ephemeral):** party forms → party chat
  materializes; disbands → gone. No one authored it.
- **Global band (standalone):** `chat global anyone selling iron?` —
  open-join, moderated, diegetically "the common band."
- **Help (standalone, diegetic):** a "mentor frequency" — fiction-wrapped,
  no OOC bracket.
- **Player channel:** `chat make raid-night` → you own it, invite friends;
  you leave → transfers to a mod or dissolves; empty → GC'd.
- **DM (ad-hoc):** `tell iffy …` — the 2-member degenerate (comms slate).

---

## Open questions

Most forks are leaned; these remain:

1. **Channel language gating.** Does the comms (ii) lean (implant comms
   are language-bound) apply to channels? *Lean: players share common, so
   not in practice v1; a per-channel language is possible content.*
2. **Anonymity / pseudonyms** on channels — identified-by-default (it's
   your implant), but anonymous channels are a possible fork.
3. **`@channel`/`@here` permission model** details (who, rate limits).
4. **Edit-trail for moderation** — deferred to the moderation control
   plane; confirm at requirements.
5. **Cross-posting / channel bridging** — almost certainly out; flag if
   wanted.

---

## Build order

Depends on comms (conversation primitive + implant transport) and the
the grouping facade (groups to project from) existing first.

**Wave 1 — the core.** Group-projection over the implant conversation
primitive; the membership/subscription split + notification levels; the
four-kind taxonomy; `chat <channel> <message>` + the management
subcommands; basic projected/overlay roles; the history ring;
all-diegetic (no IC/OOC axis).

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
- The **`chat <channel> <message>`** post surface + the reserved-word
  management subcommands (no channel-as-verb).
- **History/catch-up** (bounded backlog + ring + retention) and the
  **offline mention inbox**.
- **Discovery-via-projection** + directory + `chat who`.
- The **message model**: mentions (+ `@channel` permission), announcement
  mode, per-channel edit (self-only) / delete (self+mod) + "(edited)"
  marker, and the shared gutter message-id (reactions deferred).
- **All-diegetic** (no IC/OOC axis); **player-channel lifecycle/GC**.
- The clean **Mudlog separation**.
- Tests: a guild member is auto-eligible but can mute; a channel mute
  doesn't drop guild membership; an unauthorized poster is refused on an
  announcement channel; a tuned-out player misses ambient but gets
  offline mentions; an abandoned player channel is GC'd; editPolicy is
  honored per channel.

Reactions/threads, the moderation control plane, anonymity, and channel
language gating wait for their own work.
