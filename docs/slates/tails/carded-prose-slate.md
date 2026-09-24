# Carded-prose slate — the card is handed the prose and renders the fields instead

> **Status: UNBUILT** — the whole card surface shipped: the feed, the one
> inspection card laid out by `StuffKind`, the single birth path, pinned
> vs live, the sweep →
> [card-surface.md](../../subsystems/card-surface.md)
> **Left:** ⚠ any room-level line `LookController` composes into the room
> body is **invisible to a browser player** — the floor-puddle summary
> since the bulk build, and the help-wanted notice until it was split out
> of the body (trades-and-labor). The general answer is a card that
> renders the prose it was handed; the alternative is a rule that room
> body = fields only, and nothing may be appended to it.
> **Size:** a tail.

---

## What happens

`LookController.lookAtLocation` composes a room body — name, description,
any engine lines, exits, contents — then:

```ts
const opened = CardApi.open(context, 'subject', {
  prose: body,                      // ← the whole composed body
  subjectId: location.stuffId,
});
const scene = MessageApi.scene(actor).topic('sense.survey');
if (opened) scene.meta({ carded: opened });   // ← "also on a card"
scene.toSelf(body).send();
```

The client suppresses prose marked `carded` and shows the card instead.
But the `subject` card's source is

```ts
source: { kind: 'mql', query: '$subject', cardinality: 'one', fields: 'detail' }
```

— an **MQL field projection of the room**. It re-derives the description,
exits, contents and interfaces from the subject's own fields and **never
renders the `prose` it was handed**.

So anything the controller *composed* rather than read off a field is
handed to the card, ignored, suppressed from the transcript, and lost.

## ⭐ How it was found, and why nothing caught it

The trades-and-labor build added a derived help-wanted notice to the room
body, following the floor-puddle line as its precedent — which the plan
named explicitly (*"the puddle precedent exactly"*). Nine unit tests and
a 14/14 wire drive passed, because:

- a **controller test** captures the `toSelf` body, where the notice is;
- the **wire drive** asserts the envelope, where the notice is.

Both read the wire. Neither reads what a browser renders. The live drive
typed `look` in the general store, searched the rendered DOM for
`HELP WANTED`, and got nothing — while `apply` in the same room refused
with *"They ask for 2 completed gigs; you have 0"*, proving the read
itself was fine and only the rendering was missing.

⚠ **The floor-puddle line has the same problem and still has it.** A
puddle pooling on the floor is composed into the room body exactly the
same way (`BulkableApi.floorPuddleSummary`), so a browser player has
never seen one.

## The two answers

1. **The card renders the prose it was handed.** `CardApi.open` already
   receives the full composed body, and the card's own doc says the id
   *"lets the client re-show the prose when a named view filters this
   kind out of the feed"* — so the prose is already understood to be the
   authoritative render. This is the smaller change and it fixes the
   puddle for free.
2. **Room body = fields only, by rule.** Nothing may be appended to a
   carded body; a line that is not a field of the subject rides its own
   uncarded scene. That is what trades-and-labor did for the notice —
   ⭐ and it reads *better* there, because a card on a wall is something
   you NOTICE rather than part of the room's description. But as a
   general rule it needs a gate, or the next appended line is lost the
   same way.

⭐ They are not exclusive: (1) is the safety net, (2) is the discipline.
Doing (1) alone leaves composed lines rendering in two places; doing (2)
alone leaves the trap armed for whoever appends next.

## Cross-references

- [card-surface.md](../../subsystems/card-surface.md) — the feed, the inspection card, the birth path
- [bulk.md](../../subsystems/bulk.md) — `floorPuddleSummary`, the line that is still invisible
- [employment.md](../../subsystems/employment.md) — `noticesAt`, the line that was split out
- [testing.md](../../testing.md) — the two tiers, and why both missed this
