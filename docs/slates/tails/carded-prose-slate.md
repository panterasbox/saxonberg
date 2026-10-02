# Carded-prose slate — the card is handed the prose and renders the fields instead

> **Status: UNBUILT** — the whole card surface shipped: the feed, the one
> inspection card laid out by `StuffKind`, the single birth path, pinned
> vs live, the sweep →
> [card-surface.md](../../subsystems/card-surface.md)
> **Left:** ⚠ any room-level line `LookController` composes into the room
> body is **invisible to a browser player** — the floor-puddle summary
> since the bulk build, and the help-wanted notice until it was split out
> of the body (trades-and-labor). ⭐ **And the SUBJECT body has the same
> shape** (`lookAtTarget` cards and `meta({ carded })` exactly as
> `lookAtLocation` does) — which puts the **drill-in** on this list;
> see below. The general answer is a card that
> renders the prose it was handed; the alternative is a rule that room
> body = fields only, and nothing may be appended to it.
> ⭐⭐ **And it is now a BLOCKER, 2026-10-02** — every new card body
> [client-vocabulary-slate](../builds/client-vocabulary-slate.md) wants
> (image-first, list-of-images, a pack-shipped view) is built on the
> assumption that the card is a *superset* of the prose, and it is not.
> ⭐ Cheaper than this slate implies, too: `prose` already arrives at the
> client — `store/cardFeedSlice.ts:211` reads `c.prose` to decide
> *visibility* and never renders it. **The data is on the wire and in the
> store; this is a client render, not a protocol change.**
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

---

## ⭐ The subject body has the same shape — and the drill-in rides it

Added 2026-09-28 by the placement build's sweep. **Found statically,
not by driving** — the browser walk that would have confirmed it was
blocked on a Chrome profile another process held, and this is written
down rather than assumed either way.

`lookAtTarget` does what `lookAtLocation` does: opens a `subject`
card with the composed `body` as `prose`, marks the frame
`carded`, and sends the same body as `toSelf`. So anything appended
to a *subject* body is subject to the identical suppression.

⚠ **The drill-in is appended to a subject body:**

```
── On it: a shaker, a muddler and a strainer.
── Hanging from it: a prime cut of meat.
```

And the card cannot make up for it in one specific case:
**`ContainerMixin` declares a `contents` card projection;
`PlacingMixin` declares none.** So for a host that is a Container
(a chest, an icebox) the card shows what is inside and the loss is
cosmetic — but for a `Fitting`, which is `Placing` and **not** a
Container (the back-bar, the well, a meat hook), there is no field
carrying what is placed on it at all.

⚠⚠ **The consequence, stated plainly:** `look hook` on the wire says
*"── Hanging from it: a prime cut of meat"*, and a browser player may
see the hook's description and nothing else. That is not a
regression — the back-bar's `On it:` line has had this shape since
the crafting build — but the placement build's acceptance criterion
3 (*a ham hangs from a hook … is found by examining the hook*) is
proven on the wire and **not confirmed in a client**.

Two ways out, and they are this slate's existing fork:

1. the general answer — a card that renders the prose it was handed;
2. ⭐ the narrow one, which may be worth doing first because it is
   *better* than prose either way: **give `PlacingMixin` a card
   projection**, one field per member, mirroring
   `ContainerMixin.contents`. A hook's card would then list what
   hangs from it, and the drill-in prose becomes the transcript's
   copy rather than the only copy.

Either fixes the placement drill-in; only (1) fixes the floor puddle.
