# Grouping & access-control slate (working doc)

> **Status: architecture set, forks leaned.** The master grouping layer
> that sits *under* chat (and many other consumers): a facade that
> synthesizes groups from heterogeneous sources behind one uniform
> membership interface, a writable managed-group subsystem feeding it,
> ad-hoc groups, the management-verb strategy, and how access control
> rides groups. Chat is *a* consumer, not the owner.

Working slate for **grouping** — the shared, objective "who is in group
X" layer. Distinct from the [social-graph slate](./social-graph-slate.md),
which is *personal* ("who matters to **me**" — friends/classmates for
attention/notification/display). A player's friends-bucket is one
*source* into this facade; a guild is another; a managed team another.

The load-bearing decisions:

1. **A facade is the only thing consumers see.** `GroupApi` exposes a
   uniform read interface over every group, addressed by a typed
   `groupRef`. Consumers (chat, access control, targeting, effects) never
   know or care whether a group is a guild, a managed team, a zone's
   occupants, or a DM set.

2. **Providers plug in behind the facade.** Each source implements the
   read interface; writable sources add CRUD. **New sources slot in
   without touching any consumer** — that's the whole point.

3. **One writable group subsystem, two lifetimes.** *Managed* groups
   (persistent, named, roled) and *ad-hoc* groups (ephemeral, unnamed —
   DM/group sets) are the same mechanism at different lifetimes.
   Synthesized groups are **read-only projections** (manage them by
   managing their source).

4. **Access control has two faces, kept separate.** *Control over groups*
   (who may manage a writable group) vs *control via groups* (groups as
   the permission subject in consumers). The facade supplies membership +
   role; **permission policy stays per-consumer** — no universal
   permission engine.

5. **Manage groups, not channels.** Because consumers *project* groups
   (a channel's audience = its backing group), membership management
   collapses into group management. One `group` verb vocabulary over any
   writable group; subscription/self-service (tune/mute) is the separate
   lightweight layer. That's how management exists "at all levels"
   without verb sprawl.

See also:

- [chat-slate.md](./chat-slate.md) — the first big consumer; channels
  *project* groups through this facade. (chat-slate's "projection over
  the social graph" means **this facade**, of which social-graph buckets
  are one source.)
- [social-graph-slate.md](./social-graph-slate.md) — personal buckets
  (friends/foes/classmates); a **source** into the facade, not the same
  layer. Owns the viewer-lens / notification / display; the facade only
  reads its membership.
- [comms-slate.md](./comms-slate.md) — the conversation primitive
  (DM/group) whose audience an ad-hoc group *is*.
- [access-slate.md](./access-slate.md) — **the authorization layer**;
  *control-via-groups* lives there (group-role is one of its capability
  sources via `GroupApi`). This slate provides membership+role; access
  decides policy.
- [docs/subsystems/call-security.md](../subsystems/call-security.md) —
  the existing capability/policy machinery the access layer builds on.
- [docs/subsystems/persistence.md](../subsystems/persistence.md) —
  managed groups are a `Persistable` collection.
- [docs/ref-shapes.md](../ref-shapes.md) — the `groupRef` shape follows
  the reference-shape conventions.
- [docs/design-philosophy.md](../design-philosophy.md) — keep it lean
  (no premature universal-permission abstraction).

---

## Principle

1. **Facade over sources.** Consumers depend on one uniform group
   interface; the variety of sources hides behind it.
2. **Synthesized vs managed vs ad-hoc.** Most groups are read-only
   projections of systems that exist anyway; a minority are explicitly
   managed; the ephemeral tail is ad-hoc.
3. **Membership + role from the facade; policy per-consumer.** Don't
   centralize permission logic.
4. **Manage groups, not their projections.** Verb economy comes from one
   group vocabulary + the membership/subscription split.

---

## The layers

```
CONSUMERS   chat · access-control · targeting · group-effects · social-graph display …
                 │  membersOf · groupsOf · isMember · rolesOf · onMembershipChange
                 ▼
   GROUPING FACADE  (GroupApi; groupRef = source:id; dispatches to providers)
                 │
   ┌─────────────┼──────────────────────────┬────────────────────────┐
   ▼             ▼                            ▼                        ▼
SYNTHESIZED    MANAGED GROUPS             AD-HOC GROUPS           PREDICATE/DYNAMIC
(read-only)    (writable, persistent,     (writable, ephemeral,   (read-only, live
guild · party ·  named, roles — CRUD)      unnamed — DM sets)      query) [future]
zone · faction ·
friends-bucket ·
cohort · online
```

---

## The facade — `GroupApi`

The single surface consumers use. A `groupRef` is typed —
`(source, id)`: `guild:dragons`, `managed:raid-team-42`,
`friends:<player>`, `zone:duncan-hall`, `party:abc`, `dm:<id>`. The
facade dispatches by `source` to the right provider.

```ts
// read surface (all consumers)
GroupApi.membersOf(ref): Iterable<Stuff>          // resolves the source
GroupApi.groupsOf(player): Iterable<GroupRef>     // reverse index across sources
GroupApi.isMember(player, ref): boolean
GroupApi.roleOf(player, ref): Role | null         // if the source has roles
GroupApi.onMembershipChange(ref, cb): Handle      // for consumer cache invalidation
```

`GroupApi` is the **sanctioned cross-cutting-Api case** (no natural Stuff
host — the dispatcher, chat, access control all consult it; like
`SoulApi`). Ends with `SecurityApi.decorateApiClass(GroupApi)`.

`onMembershipChange` is what lets chat (and other projectors) cache a
derived member set and dirty it on change rather than recomputing per
use.

`roleOf` returns a **coarse common role** (owner/admin/member — enough
for generic consumers to ask "is this person privileged here?"). Sources
keep their *rich* role models internally (guild ranks, party leader,
teacher/student); a consumer that needs the rich role talks to the source
directly. Uniform interface, source-specific depth — the recurring
pattern.

---

## The provider model

Each source registers a provider implementing a small interface:

```ts
interface GroupProvider {
  source: string;                       // 'guild', 'managed', 'zone', …
  members(id): Iterable<Stuff>;
  roleOf?(player, id): Role | null;
  isMember?(player, id): boolean;       // default: scan members
  // writable providers add:
  add?(id, player, role?): void;
  remove?(id, player): void;
  setRole?(id, player, role): void;
  create?(spec): id;
  destroy?(id): void;
}
```

Provider kinds:

| Kind | Writable? | Examples | Notes |
|---|---|---|---|
| **synthesized** | no | guild, party, zone, faction, cohort, online, friends-bucket | a *view* over another system; manage via that system |
| **managed** | yes | a player/admin team, a teacher's section | the writable subsystem (below) |
| **ad-hoc** | yes (ephemeral) | DM / group-DM participant sets | runtime-only, often unnamed |
| **predicate/dynamic** *(future)* | no | "everyone in zone X with rep > Y" | a live query (MQL-backed); slots in without consumer changes |

The facade's value: a consumer written against `GroupApi` automatically
works with sources that don't exist yet (the predicate provider is the
proof case).

**Unify the *interface*, not the *storage*.** The tempting DRY move —
"store every member-set as a generic `Group`" — is wrong. A guild's
membership is so entangled with ranks/bank-access/approval that forcing
it into a generic `members: Map` buys nothing and constrains the guild's
modeling. The facade already unifies the *read* side, so consumers don't
care how a source stores its members. So **self-managed sources own
their storage and just implement the provider interface**; the generic
managed `Group` (below) is *only* for cases that have nothing else — the
"membership is the whole entity" cases. That's what keeps the managed
subsystem from becoming a forced substrate for everything.

---

## Which model for which use case

The deciding question — *is membership the whole entity, or one facet of
something richer?* — plus the personal/shared and stored/computed splits,
sorts every grouping need into one of four homes:

**Decision tree:**

1. **Per-viewer / personal?** (my friends, my ignore list) →
   **social-graph** (model C). Owns its own semantics (notification,
   display); projects as `friends:<viewer>`.
2. Else (shared/objective) — **is membership the *whole* entity, or a
   *facet* of a richer one** (ranks, bank, loot rules, governance,
   lifecycle)?
   - **Whole entity** (a named member-set + simple roles) → **generic
     managed group** (model A). Free CRUD + verbs.
   - **Facet of a richer entity** → **self-managed source** (model B).
     Owns storage + governance verbs; projects via the provider interface.
3. Or **purely computed** from world state? (in this zone, online,
   rep > X) → **computed projection** (read-only provider, no storage).

**The catalog:**

| Use case | Model | Why |
|---|---|---|
| **Guild** | B — self-managed | ranks, bank, halls, approval, alliances; membership is one facet. `guild kick`, never `group remove`. |
| **Party / raid** | B — self-managed (ephemeral) | leader, loot, ready-check, instance binding — managerial surface beyond membership. |
| **Faction / allegiance** | B *or* computed | formal join → B; rep-threshold → computed. |
| **Friends / foes / buckets** | C — social-graph | per-viewer; own notification + display policy. |
| **Ignore / block** | C — social-graph | per-viewer negative group. |
| **Teacher's section / cohort** | A — managed (→ B later) | a named roster today; graduates to B if a `Course` entity grows assignments/grades. |
| **Player team / study group** | A — managed | just a member-set the player owns — the bread-and-butter of model A. |
| **Ad-hoc DM / group** | A @ ephemeral | the short-lifetime end of the same writable mechanism. |
| **Staff / mods** | call-security (+ A if a staff *channel*) | it's a permission tier, not really a group; don't reflexively make every tier a group. |
| **Channel allowed-set** | *(not a new group)* | a *reference* to a backing group + override (below). |
| **Channel listeners** | *(not a group)* | per-player subscription state. |
| **Zone / room occupants** | computed projection | live, no storage. |
| **Online / everyone** | computed / universal | live. |
| **Combat / instance participants** | activity-bound (ad-hoc or computed) | tied to an activity's lifecycle. |
| **Predicate segment** *(future)* | computed | live query. |

So model A (the generic managed subsystem) is for **purely-a-member-set**
cases — player teams, sections, ad-hoc DMs — a real, useful set
(especially the education vertical). Everything with domain surface is
self-managed (B); personal lists are social-graph (C); the rest is
computed.

**Two boundary cases to watch:** *section/cohort* sits on A↔B and
graduates if courses get domain surface; *staff/mods* is a permission
tier best modeled via call-security, with a managed group only if it also
needs a channel.

---

## The managed-group subsystem (the writable input)

The one source that's explicitly CRUD'd — `Group extends Persistable`
(`collectionName = 'groups'`), like the emote catalog precedent:

```ts
class Group extends Persistable {
  static collectionName = 'groups';
  name: string;                     // 'raid-team', 'section-a'
  owner: PlayerRef;
  members: Map<PlayerRef, Role>;    // stored membership + per-member role
  // optional config (e.g. affords-a-channel flag)
}
```

- Its own **management role model** (`owner / admin / member`) — *control
  over the group* (who may add/remove/rename/delete). Separate from any
  consumer's permissions.
- Backs **player-created chat channels** (a channel projects a managed
  group) and a teacher's roster, a raid team, etc.
- `onMembershipChange` fires on every CRUD so projectors stay fresh.

## Ad-hoc groups (ephemeral writable)

Same writable mechanism, ephemeral + usually unnamed: DM (2), group-DM
(N), a transient selection. Created implicitly by addressing (comms'
conversation primitive). Runtime-only (not a `Group` document) — lifetime
ends when the conversation does. A managed group is just an ad-hoc group
that got named and persisted.

---

## Access control — two faces

- **Control *over* groups** — who may manage a writable group's
  membership/roles. Lives in the managed subsystem (its owner/admin/member
  roles) and in source systems (guild ranks govern guild-group changes).
- **Control *via* groups** — groups as the **subject** of permissions in
  a consumer: "guild officers can post announcements," "section-A members
  can read this." The facade supplies *(membership, role)*; **each
  consumer maps role → its own permissions** (chat's post/moderate/admin
  is one instance; a future doc/resource system maps differently).

**Lean: no universal permission engine.** Facade gives subject + role;
policy is per-consumer. If a shared "grant = (groupRef, role) → capability"
pattern repeats across three consumers, extract it then — and prefer
wiring into the existing **call-security capabilities** over a parallel
system.

---

## Management verbs — tamed by uniformity

One `group` verb family over any *writable* group, by ref:

- `group make <name>` · `group delete <ref>` · `group rename`
- `group add <who> [<ref>]` · `group remove <who> [<ref>]`
- `group role <who> <role> [<ref>]` · `group invite` / `group kick`
- `group list` · `group who <ref>`

Source systems keep thin domain verbs (`guild promote`, `party kick`) but
**share this vocabulary**; synthesized groups are read-only (the verbs
refuse, pointing you at the source). The economy comes from three things:

1. **Manage groups, not channels** — a channel's audience *is* its
   backing group, so there's no separate channel-membership surface.
2. **Membership vs subscription** — *membership* (who's allowed) is gated
   group-management; *subscription* (tune/mute, self-service) is the
   lightweight layer players touch constantly. Different verbs, different
   gates.
3. **Most groups need no management at all** — they're synthesized
   (projection); you manage their source, rarely.

---

## Consumers (brief)

- **Chat** — a channel *consumes* a group; it does not *produce* a new
  one. A channel's **allowed-set is a reference** to a backing group
  (`backingGroup: groupRef`) + the override layer (channel-specific
  guest-adds / bans) — never a new "channel-allowed" group type. An
  **open-join channel** (global, trade) has *no* backing group at all:
  allowed = everyone minus a ban-list; only subscription matters.
  **Listening** (who's tuned) is per-player subscription state, never a
  group. A player-created channel = make a model-A managed group *and* a
  channel referencing it (born together; the group is just a normal
  managed group).
- **Access control** — permission subjects (above).
- **Targeting / effects** *(future)* — "buff the party," MQL seeds over a
  group, AoE-by-group.
- **Social-graph display** — reads bucket membership it also *provides*
  (a personal-group source it owns).

---

## Worked scenarios

- **Guild chat audience:** `GroupApi.membersOf(guild:dragons)` →
  the guild system's roster (synthesized, read-only). Chat caches it,
  dirties on `onMembershipChange`. You can't `group remove` from it —
  you `guild kick` (the source).
- **A teacher's section:** `group make section-a` (managed) → add students
  → project a channel + grant section-a read on materials. One managed
  group, two consumers.
- **A DM:** `tell iffy …` → an ad-hoc 2-member group, runtime-only,
  gone when the conversation lapses.
- **Friends as a group:** `GroupApi.membersOf(friends:<me>)` reads the
  social-graph friends bucket — usable anywhere a group is (e.g. a
  "friends" chat, a friends-only effect) without social-graph knowing.
- **Dynamic segment (future):** `predicate:in-combat` resolves live; a
  consumer written today against `GroupApi` uses it unchanged.

---

## What this stresses

- **Chat** — re-grounds "projection over the social graph" onto *this
  facade*; channel audience/roles/config project a `groupRef`.
- **social-graph** — becomes a **provider** (personal buckets exposed as
  groups); keeps owning lens/notification/display.
- **Guild / party systems** (may not exist yet) — providers; they own
  their membership + domain verbs, share the `group` vocabulary.
- **call-security** — the likely home for *control-via-groups* checks.
- **Persistence** — a new `groups` collection (`Group extends
  Persistable`); `Collections` enum entry.
- **Command framework** — the `group` verb family + subcommands.
- **MQL** *(future)* — groups as query seeds / the predicate provider.

---

## Open questions

1. **Access control: shared vs per-consumer.** *Lean per-consumer policy
   + facade-supplies-role*, extract a shared `grant` only if it repeats;
   prefer call-security over a new engine. Confirm at requirements.
2. **Managed vs ad-hoc: one subsystem or two?** *Lean one* (lifetime
   facet: persisted+named vs runtime+unnamed).
3. **Group↔channel coupling.** Does a managed group *always* afford a
   channel, or opt-in? *Lean opt-in (a flag); not every team wants chat.*
4. **`groupRef` shape** — string (`source:id`) vs typed object; how it
   interns/resolves. Follows ref-shapes.
5. **Reverse index (`groupsOf`) cost** — querying "all groups a player is
   in" across many providers; needs each provider to answer cheaply or a
   maintained index.
6. **Role vocabulary** — *Resolved:* the facade exposes a **coarse common
   role** (owner/admin/member); sources keep rich roles internally and
   consumers needing them talk to the source (see the facade section).
   Detail open: the exact coarse set.
7. **Predicate/dynamic groups** — the query language (MQL?), recompute
   vs cache, who may define them. Deferred; the facade reserves the
   provider slot.
8. **Nested / composite groups** — a group of groups (a faction of
   guilds; "all my sections")? Possible facade feature; defer unless
   needed.

---

## Build order

**Wave 1 — facade + managed + ad-hoc.** `GroupApi` (read interface +
`groupRef` + provider registry + `onMembershipChange`); the managed-group
`Persistable` subsystem with its owner/admin/member roles + the `group`
verb family; ad-hoc groups for DMs. Wire **one** synthesized provider
end-to-end (zone or online) to prove the model.

**Wave 2 — real synthesized providers + consumers.** Guild/party/friends-
bucket providers as those systems land; chat re-grounded to project via
the facade; control-via-groups in chat (role→permission).

**Wave 3 — depth.** The predicate/dynamic provider; nested/composite
groups; a shared `grant` primitive if access-control patterns have
repeated; targeting/effects consumers.

---

## What this slate does NOT cover

- **The consumers' own logic** — chat's channel model (chat-slate),
  access-control *policy* (per-consumer), targeting/effects.
- **Personal buckets / recognition / notification / display** →
  social-graph + recognition slates. The facade only *reads* bucket
  membership.
- **Guild / party domain systems** — providers; their internals are their
  own (deferred) systems.
- **A universal permission engine** — explicitly avoided; policy is
  per-consumer, possibly via call-security.
- **The implant/comms transport** — orthogonal; grouping is about *who*,
  transport is about *how the message travels*.

---

## Once shaped into formal requirements

This slate boils down to:

- **`GroupApi`** — the uniform read interface (`membersOf / groupsOf /
  isMember / roleOf / onMembershipChange`), the `groupRef` shape, the
  provider registry; the sanctioned cross-cutting Api.
- The **provider model** (synthesized read-only / managed writable /
  ad-hoc / predicate-future) + the provider interface; **unify the
  interface, not the storage** (self-managed sources own their storage).
- The **model-selection criterion** (the decision tree: personal →
  social-graph; whole-entity → managed; facet → self-managed; computed →
  projection) + the use-case catalog (guild/party = B; sections/teams/DMs
  = A; friends = C; staff = call-security; channel allowed-set = a
  backing-group *reference*, not a new group).
- The **managed-group subsystem** (`Group extends Persistable`, the
  `groups` collection, owner/admin/member roles, CRUD).
- **Ad-hoc groups** as the ephemeral writable case (DM sets).
- **Access control's two faces** — control-over (managed roles) and
  control-via (facade role → per-consumer policy); the no-universal-engine
  lean.
- The **`group` management verb family** + the manage-groups-not-channels
  / membership-vs-subscription economy.
- Chat re-grounded as a facade consumer; social-graph as a provider.
- Tests: a consumer resolves members of a guild (synthesized) and a
  managed group identically; a managed CRUD fires `onMembershipChange`; a
  synthesized group refuses `group remove`; an ad-hoc DM group resolves
  and lapses; role flows from facade to a consumer's permission check.

Predicate/dynamic groups, nested groups, a shared grant primitive, and
the targeting/effects consumers wait for their own waves.
