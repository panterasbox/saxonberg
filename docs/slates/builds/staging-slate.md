# Staging slate — restaging authored content at runtime, by the story's own clock

> **Status: UNBUILT** — designed at high level 2026-10-31 with the owner. What ships: `StagedMixin`
> (`props:` · `cast:` · `costume:`, applied **once, at birth**, deliberately not count-aware); the
> singleton branch (the one instance, never moved once placed); cast never captured, re-seeded on
> restore; `ResettableMixin` and residency's reset sweep (`resetsWhilePresent`, single-flight; the
> store's `Stock` its one consumer); eviction re-cloning a cold object from its template
> ([residency.md](../../subsystems/residency.md)); employment's call (`regulars | rota`), roster
> tick and off-shift `Offstage` room ([employment.md](../../subsystems/employment.md)); one
> deliberation beat per agent with `Urgency` ([behavior.md](../../subsystems/behavior.md)); the
> Cast/Extra rungs ([identity.md](../../subsystems/identity.md)); *"anything staged gets restaged"*
> ([emergency-services](./emergency-services-slate.md), 2026-10-28). Restaging today happens only
> at a reboot — and, by accident, whenever residency evicts a cold staged place.
> **Left:** the Staging Idea (parts, nesting, cadence) · a member's identity as (staging, part),
> stamped on the instance · restaging as reconciliation, wherever a part now is · named sets ·
> the part policies (recall · remint · release · prevent) · strays · the four statuses (on stage ·
> in the wings · on loan · gone) · claims and the call sheet · the unavailable-actor fallbacks ·
> casting permission · the wings as null, the brain asleep, entrances and exits as behavior ·
> the wings census · `Offstage` retired · `StagedMixin` as the one-node shorthand · employment's
> shift as a claim · restaging unobserved or diegetically · staged state across a reboot
> **Size:** a build

Siblings: [stage-and-simulation](./stage-and-simulation-slate.md) (§ 5: *staging in place — the
same zone, NPCs swapped — is the same machinery without the exit*; this slate is that machinery) ·
[emergency-services](./emergency-services-slate.md) (the restaged NPC beside its own corpse) ·
[pace](./pace-slate.md) (the cadences a restage runs on) ·
[household-lifecycle](./household-lifecycle-slate.md) (where people go home to).

## 0. The ask **[DECIDED — the owner]**

*"In the old LPMud days there was just a backend timer set to 30 minutes or so that kicked in and
called reset() in every object … for complex things you end up writing some governor object and
just that one object resets all the others. … I don't want to think of this in terms of 'reset'.
There are two classes of content in the game, staged content and persistent content. Your house
is persistent — it remembers its condition and requires upkeep. A staged building may remember its
condition, but only until it's restaged, at which point its condition goes back to what was
authored. … We need something that happens at runtime on a cadence we choose and is localized to
just one segment of the authored content."*

And the shape of the question: *"What do content authors need from the game to tell the stories
they want to tell?"* — including *"a few different configurations, all staged, but specifically
chosen when re-staging: 're-stage for climax' vs act 1, scene 1, which is basically what we're
doing everywhere today. Maybe this is all pointing to a new Idea class that basically exists to
compose each and every staged scene, like a warren does for locations."*

## 1. ⭐⭐⭐ Identity, not location **[LEAN — the core; the owner has not objected]**

The LPMud reset was *fill this room with what the author listed* — and so an NPC who wandered off
was duplicated, and a sword taken from the altar came back while the first was still in a pack.
**Every staged thing knows which staging minted it, and as what part** — `(staging, part)`,
stamped on the instance (`PropSpec`'s `as:` is already the part's name). **Restaging is the
staging reconciling its own parts, wherever they are now**, never "everything in this room":

- **present and on its mark** → restore its authored state;
- **present but elsewhere** → the same instance, recalled or walked home — never a second;
- **gone** → its policy (§ 4).

There cannot be two blacksmiths: the second blacksmith would be the same part, and the part
exists. The singleton branch already behaves this way; this generalizes it.

## 2. ⭐⭐ The Staging — an Idea that composes **[DECIDED — the owner's instinct; the shape LEAN]**

*"Staged isn't one captured state, it's an assemblage of many captured states."*

- **A Staging owns parts** — a place, a container, an NPC, the vessel the NPC carries, a door's
  state, any combination; ownership is the stamp, not containment.
- **Stagings nest** — a zone's staging holds room stagings holds the counter's. Nesting follows
  the authored story, not containment, which also answers *"zones nest, just not along containment
  lines."* Restaging a node restages its subtree; a cadence set on a node is inherited below it.
- **`StagedMixin` is the shorthand** — a room's `props:` / `cast:` is a one-node staging the room
  declares inline. Today's content keeps its meaning; an explicit Staging row is for more than one
  set, or a region larger than a room.
- **Persistent content is never a part.** A player's avatar, their goods, a holding, chattel under
  title — no staging minted them, so no restage reaches them. **Mixed places are solved by
  construction**: a staging touches only what it owns.
- ⚠ The name *Staging* is a placeholder. *Scene* is taken (`MessageApi.scene`, the composer).

## 3. ⭐⭐ Named sets — restaging *to* something **[DECIDED — the owner]**

A Staging holds several **sets**; one is the default — *act 1, scene 1*, everything today. A set
says which parts are present, where, and in what state (the door barred in the climax, open in
act 1; the cultist on stage in one, in the wings in another). **Restaging to a set reconciles
toward it as a diff** — only what differs changes. It is triggered by a **cadence**, an **event**
(a story beat, a brain's decision, a quest step) or a **command** from whoever holds title to the
content — a seat or a title, never a wizard check. *Reset* becomes *stage direction*.

⚠ Open: whether sets are a menu (any set, any time) or a sequence (acts with transitions).

## 4. ⭐⭐ What happens to a part that leaves — the policies **[DECIDED — the owner adds prevent]**

Each part declares what a restage does once it has left the staging's hands:

| policy | means | e.g. |
|---|---|---|
| **recall** | it comes home | cast; the chair dragged into the hall |
| **remint** | if it is not on its mark, a fresh one appears there | the inn's lamp; a quest's reward |
| **release** | once taken it is the taker's, and the staging forgets it | the sword on the altar; a shop's goods |
| **prevent** | it may not leave the stage at all | ⭐ the owner's addition — mostly NPCs; sometimes a Thing |

- **Prevent** has two shapes, both already in the engine: an NPC's brain never routes out and
  every exit refuses it; a Thing is refused at the staging's boundary — *"the candle belongs to the
  chapel"* — the honest-refusal pattern, a gate the staging contributes to `canTraverse`. ⭐ A
  Thing an **NPC** carries is simple; one a **player** carries is the tricky case — the lean: the
  player may pick it up and use it inside, and is refused at the door, so nothing is ever taken
  back out of an inventory later.
- **Faucets are the author's call** — the owner: *"I'm okay with faucets in the game provided they
  don't fuck up the entire economy and you actually have to engage with content to get whatever
  they're spitting out. A quest reward isn't a faucet, it's content. … Only the author can answer
  that."* So remint carries no engine veto; the author records it on the part.
- **Strays** — something foreign left in a staged place (a player's knife on the tavern floor) is
  no part of it. Each staging names one rule for strays: leave it, sweep it to a lost-and-found,
  or leave it for a janitor NPC (the cleanliness build's attendants are that job).

## 5. ⭐⭐⭐ An actor two stories want **[DECIDED — the owner's ask; the model LEAN]**

The owner: *"If you stage an NPC in a shop that needs to go to the bank once a week, the shop can be
entirely staged, and once a week it just accounts for the NPC leaving its scope for a while. …
They're in another story being told on another stage. … At some point there will be boundaries
that need to be respected — you can't write content for everything, you've got to divide and
conquer. … What do you do when settings both need the same actor at the same time?"*

### Only persons conflict

An **Extra** is a role — *a teller*, *a guard* — so two stagings that each want one each get their
own. Only a **Cast** member — Joe, a person — can be wanted in two places. The conflict is about
persons, and a person is exactly who should decide.

### A part's four statuses, from its home staging

| status | means | what a restage does |
|---|---|---|
| **on stage** | where the scene wants it | restores its state |
| **in the wings** | not on any stage — § 6 | blocks it in when called |
| **on loan** | held by another staging's story | leaves it alone, and knows where it is |
| **gone** | destroyed, or released | the part's policy |

*On loan* is the bank trip: the shop does not know what *"Joe goes to the bank"* contains — only
that Joe is on loan to it, so it neither recalls him nor mints a second Joe.

### Claims, and the call sheet

**A claim** is the record of a loan — which staging holds the actor, in what window (weekly; until
the story ends), at what **urgency** (the shipped bands). Every Cast member has a **call sheet**:
the claims on them. ⭐ **Employment's shift is a claim** — its call, roster tick and coverage become
one consumer of this, not a special case beside it.

### When two claims collide

1. **The actor decides.** Each claim is a candidate in the actor's one deliberation beat, ranked by
   the urgency its author set — the shipped arbitration point, and the agent's choice rather than
   an engine scheduler's. (The alternative, a strict priority among stagings, is more predictable
   and less expressive; recorded, not chosen.)
2. **The staging that loses copes, by the part's declared fallback** — *hold* (the scene waits:
   "back soon"), *understudy* (an Extra plays the role — a role only, never a person), *cut* (play
   it without them), *summon* (ask the holding staging to release them early; it and the actor may
   say no).
3. **Casting permission** — a staging may only claim an actor it has been allowed to cast; the
   actor's home staging, or the title holder of that content, grants it. *A staging requests, never
   takes.* That is the divide-and-conquer boundary, and governance's rule that someone always
   answers for an NPC.

## 6. ⭐⭐ The wings — null, asleep, and rare **[DECIDED — the owner]**

`Offstage` turned out to be a parking lot: a one-row `Locale` with a marker that forbids exits, one
per `Business`, where the roster tick teleports off-shift staff. The owner: *"Why aren't we using
null environment for that? … The Location only matters if you need to move a bunch of things into
the same place together."*

- **The wings are null.** Null is already legitimate (*"content nobody put in the world"*,
  [spatial.md](../../subsystems/spatial.md)); a `Behaved` NPC vetoes eviction; employment already
  copes with a hand who has no room; what the actor carries stays with them; nothing in the world
  reaches null. *Where is Joe?* is answered by the staging's record — *in the wings of the shop* —
  which a room never could.
- **In the wings, the brain sleeps** until called — no deliberating from nowhere, and nothing paid
  while waiting.
- **Entrances and exits are behavior, never teleports** — an actor walks out an exit and drops to
  null out of sight, and comes on the same way. The closing-time blink goes.
- ⛔ **`Offstage` retires** — the class, the mixin, `Business.offstage`, its ~35 content rows and
  the roster's relocation.

### ⭐⭐ Judicious — business first **[DECIDED — the owner]**

*"Most NPCs should just have business, like any actor in a scene has. The situations where we truly
want to remove them from the entire scene should be rare, and not just an escape hatch to writing
the content the actor actually is asking for."*

- **An actor with nothing to do is given business** — wiping the counter, restocking, arguing with a
  supplier — which the behavior system exists to author.
- **The end of a shift is not the wings.** The shopkeeper goes **home** — a room in the world, a
  stage he is part of — so the retired `Offstage` rows migrate to *somewhere to go*, not to null.
- **The wings are for a story that genuinely has no place yet** — the villain before the entrance,
  the courier in a story nobody has written.
- **Friction, by the project's own tool** — a part sent to the wings **states why** (one authored
  line), and a **census** counts them, today's number gated as the ceiling once stagings ship.
- The lens: **participation** — people with somewhere to be leave room to be met; people who blink
  out leave holes where play should be.

## 7. When a restage happens

- **Unobserved, or diegetically** — `resetsWhilePresent` defaults to false for a reason: a scene
  rearranging itself in front of a player betrays the fiction. A restage waits until no one can
  perceive the place, or plays out through the world (cast walk out and back in; things replaced
  while nobody looks).
- **On game time** — one arrow (MTC); a cadence per staging: a dungeon each game-day, a festival
  square each season.
- ⚠ **Across a reboot — open, the lean stated.** If stagings carry their own cadence, a staged
  building that *remembers its condition until restaged* must survive a deploy — staged state
  captured like persistent state, with a different lifetime. Otherwise every deploy restages the
  world, and deploy timing is a gameplay fact. **Lean: capture it** (the simulation lens — the world
  must not depend on when the code ships), which also ends the accidental restage on eviction.

## 8. The lens pass

1. **Pedagogy** — none directly; it is the authoring substrate every taught scenario sits on.
2. **Expression** ⭐ — sets, nesting and policies are rows: an author tells *act 1* and *the
   climax* with no code, and divides a world between authors by casting permission.
3. **Immersion** — restaging unobserved or through the world; no blink-outs. **Participation** ⭐ —
   actors with business and somewhere to be; the wings rare.
4. **Values** — the faucet is the author's call, recorded on the part.
5. **Continuity** — a part answers the same commands across sets and epochs; only its arrangement
   changes.
6. **Economy** — release by default for anything ownable; remint is a declared, visible choice.
7. **Governance** — restaging by a seat or a title; casting is requested, never taken; someone
   answers for every actor.

## 9. Open

1. **Identity as the core** — `(staging, part)` on the instance; the rest hangs on it.
2. **Sets** — a menu or a sequence of acts.
3. **Prevent, for what a player carries** — refused at the door (the lean), or let out and recalled.
4. **Arbitration** — the actor's urgency-ranked beat (the lean) or a strict staging priority.
5. **Contested roles** — whether two stagings may ever contest an Extra (*"the only guard on
   duty"*) or always get their own.
6. **Reboots** — capture staged state (the lean) or keep restaging the world at every deploy.
7. **The name** — *Staging* is a placeholder.
