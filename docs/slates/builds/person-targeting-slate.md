# Person targeting slate — naming someone from afar, and acting on someone who isn't there

> **Status: UNBUILT** — designed at high level 2026-10-26 with the owner. What ships
> ([mql-grammar.md](../../mql-grammar.md), [mql.md](../../subsystems/mql.md)): the `online` seed
> and filter (every connected command-giver); bracketed filters (`[capability.…]`, `[class.…]`,
> `[mixin.…]`); `$$` (the previous query); `#id`; ⛔ no `world` seed; ⭐ *"resolving a query is
> never a permission"* — the verb's gate refuses. Durable identity — every player's minted
> identity path ([identity.md](../../subsystems/identity.md)); contacts stored by it
> ([contacts.md](../../subsystems/contacts.md), whose `add` is online-only, its offline answer
> deferred); the belief store's per-viewer record of who you have met
> ([belief.md](../../subsystems/belief.md)); shell variables
> ([shell-environment.md](../../subsystems/shell-environment.md)).
> **Left:** `$name` bound to an expression · an identity literal · `[group.…]` and `[contacts.…]`
> filters · ⭐ group names — committees and studios named by the extent they hold (public or private
> by who manages it), official groups by bare name, social groups within their creator · verb default scopes for people · ⭐ verbs declare a body or a person target · the person
> handle and records-only reach · per-record permissions
> **Size:** a build

## 0. The problem **[DECIDED — the owner]**

*"The main way to do this right now is the `online` predicate that just is a list of all the
avatars. … `here:i:bobalu` is usually fine because what are the chances of another Bobalu being in
the same room with me? But `online:bobalu` will match any Bobalu. `online:bobalu smallberries`
would work and that's good to keep in our back pocket, but maybe we can do better. I've rejected
giving people unique usernames or handles because I don't like the competition it creates in a
crowded namespace."*

And: *"'watch bobalu's livestream' when I'm not logged on is totally fine, but 'murder bobalu'
while I'm not logged on is not so fine. So there's implied permissions at work here … the target is
'the idea of a person', not an actual person."*

`online` stays for now (*"'online' is fine for now"*).

## 1. ⭐⭐ `$name` binds to an expression **[DECIDED — the owner]**

The owner: *"`$name` should bind to an expression, and that expression gets you the identity. Don't
want to confuse the two."*

- **`$bobalu` holds an expression**, re-evaluated each time it is used, like a shell alias; evaluating
  it yields the target.
- ⭐ **One kind of expression names an identity directly** — an **identity literal** — for when a
  player wants *this exact person, always*.
- **Player-defined only.** The owner: *"I don't want to use variables for everything, and I'd prefer to
  keep the builtins to things like `$$` that don't compete for keywords."* No auto-binding (it would
  put names into the player's space they did not choose); the only builtins are non-word tokens like
  `$$`.

## 2. ⭐⭐⭐ Groups and lists are filters, not seeds **[DECIDED — the owner]**

The owner worried that new seeds would make the grammar too complicated and *"compete with the keyword
space for content developers to put on their objects."* MQL already has a space that cannot collide
with content keywords: **the bracketed filters**. Group and list membership go there:

```
online:[group.streamers]:bobalu      a Bobalu who is a registered streamer
online:[contacts.friends]:bobalu     a Bobalu in my friends list
peers:[group.party]                  my party members in this room
```

- **No new reserved words** — an object named *friends* never collides with `[contacts.friends]`.
- **No new seeds** — these filter a set already named (`online`, `peers`, `here`).
- **The prefix keeps sources apart** — a group and a contacts list with the same name stay distinct
  (`group.` against `contacts.`).
- ⭐ **The common case needs none of it — the verb carries the context.** Command definitions already
  declare a default scope (`lift` defaults to things with the `load` capability), so **`watch`'s
  default is `online:[group.streamers]`**, and `watch bobalu` finds the streaming Bobalu with nothing
  typed.

## 2a. ⭐⭐⭐ What a group's name is **[DECIDED for now — the owner]**

The owner: *"do groups have keywords like that? Are they unique? I suppose we have to have like
'official' groups if 'wizards' and 'archwizards' work the way they do."*

### What exists ([grouping.md](../../subsystems/grouping.md), [parcel.md](../../subsystems/parcel.md))

- **Managed groups share one global namespace** — a `Group` document's name is unique (the
  database enforces it), and anyone may `group make <name>`, first come.
- **Official groups already exist as an owner kind** — `system` (seeded by a content pack, owned by
  nobody: `wizards`, `archwizards`, `streamers`, `lounge`), `office` (owned by a government seat;
  handing over the seat hands over the group), and `player`.
- **Contacts lists** are labels unique per owner; **parties** are referenced by path.

⚠ Global unique names for player-made groups is the crowded namespace the owner rejected for
handles — **squatting** (the first to make `book-club` owns the name forever) and
**impersonation** (a player-made `moderators` that `[group.moderators]` would resolve to).

### Most groups are committees and studios — named by what they hold

The owner: *"most groups will probably be parcel committees, private and public, and studios — a
team of players working on one content extent."*

- **A parcel committee** is the group holding a parcel's title — a parcel's owner may be a group, a
  player or an organization, and *title is what makes a body a committee*
  ([document-store.md](../../subsystems/document-store.md)); the
  [committee slate](./committee-slate.md) adds seats and how it decides.
- **A studio** is a group holding title over a **`/studio/<group>`** workspace — the multiseat
  `/home`. When the team works on a content extent, that extent's title goes to the same group, so
  ⭐ **the studio is that extent's committee**: one group, two titles.
- ⭐ **So they are named by the extent they hold** — parcel paths are already unique and are never
  raced at runtime (an extent is claimed by subdividing or transferring title, through governance,
  never by typing a name first): *the Rejection committee*, *the Delight studio*.

### ⭐ Public and private is who manages the parcel

The owner: *"private and public have to do with the parcel management — is it managed by the state
or a private committee."*

- **Public** — the state manages it: the committee is owned by a government seat (`office`), or is a
  government organization (the executive already holds the platform's own branch this way).
- **Private** — a private committee: a player-made group, or a company (a corpo organization).

Nothing new is needed — the owner kind and the organization kind already say which.

### The three cases

| group | named by | example |
|---|---|---|
| ⭐ **a committee or studio** — most groups | the extent it holds title over; public or private by who manages it | *the Rejection committee* (public — the Rejection council's seat); *the Delight studio* (private) |
| **official** — system or office, holding no parcel | a bare name, claimed at pack install (a conflict surfaces then, between authors) or by governance | `streamers`, `wizards` |
| **social** — holding no parcel (a book club), the minority | within its creator, like a contacts list | *Bobalu's book-club* |

- **Lookup checks your own memberships first**, then the official groups — `[group.book-club]` usually
  needs nothing more; two of your groups sharing a name prompts; a non-member names it fully.
- **The display always says which**, so a player-made group never reads as official. The owner: *"I
  don't really love making players have to keep track of what kind of group is which, but I suppose
  we're already doing that with owner kind"* — naming by extent is what keeps most of that out of the
  player's head.
- **Changes `group make`** — a social group no longer reserves its name for everyone.

## 3. ⭐⭐⭐ A body, or a person **[DECIDED — the owner]**

Each verb declares what kind of target it needs:

| the verb needs | examples | an absent person? |
|---|---|---|
| **a body**, physically present | attack, hug, hand them something, pick their pocket | ⛔ no — nobody is there |
| **a person** — their records, their relationships | tell or mail (held until they return), watch their stream, read their public record, pay them, vote for them, sue them, add them as a contact, send a gift to their home | ✅ yes |

Not a permissions matrix — **the honest physics**: you cannot stab someone who is not there, but you
can write them a letter. MQL resolves a person; the verb decides whether it needs the body.

### The person handle

- **Minted on demand from an identity** — load on use, never a scan of all players.
- ⭐ **It touches records, never the body** — the mailbox, the ledger, the streaming profile, a
  delivery waiting at their home, the chronicle. A delivery waits for the real body to collect it (the
  [credit](../../subsystems/credit.md) Arrival Note and the
  [record layer](../../subsystems/record-layer.md)'s stored frames are the precedents); nothing writes
  into a saved body that is not loaded, so there is no merge with a snapshot.
- **An offline streamer** — the stream belongs to the streamer's record (their platform channels), not
  their body, so watching someone not signed in reads the registry.
- **Bounded lookup** — finding a person by name searches only bounded sets: your bindings, a list, a
  group, the streamer registry, who is here, who is online. No *every player who ever existed* — for the
  reason there is no `world` seed.
- This also answers contacts' deferred offline `add`.

## 4. ⭐⭐⭐ Who may do what to a person's records **[DECIDED — the owner]**

The owner: *"that still needs a permissions structure — what can wizards do vs non-wizards, and who
can they do it on?"*

- ⛔ **Never a new wizard check** — wizard means trust to write TypeScript and confers no power over
  people; a wizard's verbs reach a person exactly as anyone's do.
- **Capability is title over a resource, or a seat** — never a tier.

Per record, who may do what; present or absent changes nothing — only body against record does:

| who | may | examples |
|---|---|---|
| **the person themselves** | everything on their own records | contacts, ledger, mail, settings |
| **anyone** | what the records expose to the public | send mail or a gift (held until they return); watch their stream; read their public renown and chronicle; pay them |
| **people they have let in** | what that consent covers | friends see where they are; a party sees their condition |
| **a seat with jurisdiction** | what that office's law says — recorded, appealable | a court's judgment or fine; the bank under its posted terms; the registrar's residency record; a moderation seat muting or banning under the Compact's conduct process |
| **nobody** | the body of someone not there | attack, take, touch |

**Wizards** — their real reach is code, handled as a code-trust problem (review, the AGPL, the
[privacy slate](./privacy-slate.md)'s *a malicious wizard can write a shadow that snoops — enforcement is
manual*). A wizard acting on a person as a moderator holds the moderation seat, and the seat is what is
recorded and appealed.

## 5. The lens pass

1. **Pedagogy** — none directly; the letter and the stab teach the difference between a record and a
   body.
2. **Expression** — a player's own names for people; verbs that know who they are looking for.
3. **Immersion** — mail that waits; a gift on the doorstep. **Participation** — reaching people across
   time, not only across the room.
4. **Values** — no global handles, so no competition for names; consent for what friends see; nobody
   touches an absent body.
5. **Continuity** — the same targets on any client.
6. **Economy** — paying the absent; deliveries.
7. **Governance** — ⭐ seats with jurisdiction over records, recorded and appealable; wizardness confers
   nothing.

## 6. Open

1. **The identity literal's syntax.**
2. **Which verbs need a body** — a census of the verb list.
3. **What each record exposes** — the public face of mailbox, ledger, chronicle, streaming profile.
4. **Which seats hold jurisdiction over which records.**
5. **The name `online`** — kept for now.
6. **Existing global group names** — what happens to player groups that already hold one.
7. **The syntax** for naming a social group fully, and an extent's committee.
