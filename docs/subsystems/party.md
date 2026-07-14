# party — the party operational core

The **party** is the operational unit that feeds combat friend-from-foe:
a named, ownable roster of combatants (players + hired mercenaries) that
fight as one side. It is the party half of the multi-party combat cycle
(the combat half is [combat.md](./combat.md)); the two are joined by one
narrow seam.

## The governing decision: a party owns its own membership

A party is **not** a managed `Group`. The grouping subsystem
([grouping.md](./grouping.md)) is a *facade* (`GroupApi`) over several
`GroupProvider` sources — most consumers (chat especially) read a
`GroupRef` audience whose membership comes from a provider, not from a
`groups` collection. The party follows that grain: it stores its **own**
roster on the `Party` document and registers a **fourth provider**
(`party:<id>`), so a `party:<id>` `GroupRef` resolves through `GroupApi`
exactly like `managed:<id>` — but the members come from the party, not a
minted managed group. There is exactly one membership store, and no
group↔party two-store sync.

*(This overrides the party-slate's original "back a party with a managed
Group" sketch: reaching for `GroupApi` to *store* membership is the
anti-pattern the cycle corrected — most chat membership already comes
from sources other than a managed store.)*

## The Party document

`Party` (`lib/party/Party.ts`, the `parties` collection) mirrors the
`Group` document — the true precedent for a persisted, owned roster — plus
combat/leadership fields:

| field | meaning |
|---|---|
| `name` | human-readable, unique-indexed |
| `founderId` / `captainId` | founder of record / current leader (succession repoints `captainId`) |
| `memberIds` | durable member refs — an Avatar `playerId`, a Mercenary `templatePath` |
| `combatSide` | the alignment key members share; `''` = the party's own `party:<id>` (the default) |
| `durable` | ad-hoc (in-memory) vs durable (persisted) |
| `channelRef` | the party chat channel's name, or `''` |

Modelled as a **`Document`** (not a `Stuff`): a runtime-created,
player-owned, durable roster is exactly what documents are for; `Stuff`
persists via templates (seeded) or the holder-snapshot spine (host state),
neither of which fits. Membership mutations go through
`addMember`/`removeMember`; the captain is the single source of leadership
authority (`captainId`), so per-member tactic roles are deferred to
combat-tactics-slate.

## Two lifetimes over one primitive

- **Ad-hoc** (`durable=false`) — held only in the `PartyRegistry`
  in-memory map, never `.save()`d, gone on restart, auto-disbands when it
  empties.
- **Durable** (`durable=true`) — persisted as a `parties` row so name +
  roster + captain survive a restart, re-materialized into the registry at
  boot, and **not** destroyed on empty (it goes dormant; `muster`
  re-activates it, `standdown` sends it dormant).

A member may sit on **many** parties' rosters (`memberIds`) but has exactly
one **`activePartyId`** at a time (the one-active-party rule, rejected at
`form`/`accept`).

## Membership on the actor: `PartyMemberMixin`

`PartyMemberMixin` (`lib/party/PartyMember.ts`, the `Employed` sparse-field
precedent) is composed on **`Avatar`** and on the hireable **`Mercenary`**
(`= PartyMemberMixin(NPC)`) — deliberately **not** the base `Character`, so
a plain townsperson or beast carries no party machinery and resolves
`solo` for free. It is a dumb store of two pointers — `activePartyId`
(persisted) and `pendingInvitePartyId` (transient) — with `ApiOnly`-gated
setters (only `PartyApi`/`PartyLogic` write them).

## The registry + the provider

`PartyRegistry` (`obj/PartyRegistry.ts`, a boot-manifest singleton, depends
on `GroupRegistry`) holds the in-memory map of **active** parties — the
**synchronous** read path combat's seam needs — and at boot (a) warms
durable parties from the `parties` collection and (b) registers the
`PartyGroupProvider` (`lib/party/PartyGroupProvider.ts`) with the shared
`GroupRegistry`. The provider resolves `party:<id>` → the party's own
roster → online Avatars (the `ManagedGroupProvider` shape; Mercenary
templatePath members are roster entries, not chat recipients). **Party
chat** is then just a `Channel` whose `Subject.groupRef = 'party:<id>'`
(minted via `ChatApi.createBoundChannel`, which binds the ref without
minting a managed group).

## The combat seam (the crux)

Combat asks the party subsystem exactly **two** pure, synchronous, gated
statics on `PartyApi` — and nothing else (it never touches membership, the
captain, or the roster):

```ts
PartyApi.sideOf(combatant): SideRef      // NEVER null
PartyApi.areAllied(a, b): boolean        // sideOf(a) === sideOf(b)
```

`sideOf` is a **three-rung resolution chain** (mirroring the codebase's
`ownerOf` walk):

1. **party** (de jure — Avatar / Mercenary): an active party's
   `combatSide`. Captain-settable, so "the captain sets the side" falls
   out, and "two parties ally into one side" is reachable later (point
   both `combatSide`s at one key) without reshaping the seam.
2. **owner** (de facto — pet / companion): a pet derives its side from its
   *owner's* `sideOf`. A **seam only** — pets are unbuilt this cycle;
   `sideOf` is structured to admit the rung when they land.
3. **solo**: `solo:<templatePath>` — a side of one. Two distinct solos are
   never allied, so today's 1v1 (two partyless combatants) is the
   degenerate case.

Combat reads `sideOf` **once** at session-open / join and **freezes** it on
the combatant's graph node (sides are per-session; the party persists). The
dependency is one-way (combat → party; party never imports combat), so no
cycle.

## The `party` verb + `PartyApi`

`PartyApi`/`PartyLogic` (`/obj/api/party`) own the seam + the lifecycle:
`form` · `invite` · `accept` · `enlist` (the merc-hire path, no accept
handshake) · `leave` · `kick` · `disband` · `transfer` · `setSide` ·
`muster` · `standDown` · `partiesOf` · `activePartyOf`. The `party` verb
(`cmd/social/party.yaml` + `PartyController`, afforded by
`PartyMemberMixin`) is a thin translator over them.

## Cross-references

- [combat.md](./combat.md) — the consumer of the seam (multi-party fight).
- [grouping.md](./grouping.md) — the facade the `party:` provider plugs
  into.
- [chat.md](./chat.md) — party chat is a bound `Channel` (consumer, not a
  new store).
- [employment.md](./employment.md) — the `Business`/`BusinessEntity`
  mixin+entity precedent the Party/Mercenary shape mirrors.

## Deferred

Party economic/reputation facets, tactic-preset roles (combat-tactics-slate),
party morale (Thesis 13), the client party pane, coordinated party-retreat
(rout/rally) and pursuit (wayfaring), and an NPC-vs-NPC **crew** standup (a
durable-party seeder so two NPCs share a side without a live player forming
the party) — the 2v1 demonstrator (you + a recruited Mercenary vs the
duelist) exercises the full seam without it.
