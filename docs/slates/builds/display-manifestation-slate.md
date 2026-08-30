# Display manifestation — a screen shows content; the content knows how it renders

*Design slate, 2026-08-30, from the libations review (MR !206). The
founder, on the substrate I shipped in D12: **"DisplayMixin is all over
the place… it's conflating a lot of things and none of them are super
well defined."** Correct. This document is written **before** the
context compact deliberately, so the design survives in the repo rather
than in a conversation summary — the same rule every other ruling in
this review followed.*

## The founder's model, which is the right one

> There is a notion of a **display** in the game: any screen, anywhere.
> The **contents** of that screen can manifest in a number of ways.
>
> - **Video** rendered in the client — live, or prerecorded. The game
>   *may* model broadcast or other networks to organise content, but
>   **video is video**.
> - **A card** — most akin to a mobile app, with controls and feedback.
> - **Prose** — it just renders as text, like any other game interaction.
>
> In the world all three are happening on screens. Depending on the
> content, they manifest in **different components in the client**.

## What shipped instead — four axes fused into one mixin

`DisplayMixin` (`lib/display/Display.ts`) currently carries all of:

| # | axis | how it shipped | verdict |
|---|---|---|---|
| 1 | **the screen as an object** | a Thing with a location, look-at | ✅ legitimately the mixin's job, and thin |
| 2 | **authority** — who may drive | `pairing: held\|remote\|staff\|open` + `principal` + `remote` | ⚠ an access policy, unrelated to content; and a **closed kernel enum** |
| 3 | **what is showing** | `showing: DisplaySource \| null` | ✅ fine as state |
| 4 | **how the client renders it** | *not modelled* — two hardcoded paths | ❌ the actual gap |

And `sourcePolicy: 'any' \| 'cards' \| 'streams'` straddles 2 and 4: a
**permission field whose values are rendering kinds**.

### The gap, precisely

There are two hardcoded manifestation paths and no third:

- a `stream` source writes the viewer's `cockpit.watch` clientState;
- a `card` source calls `CardApi.push`;
- **prose has no arm at all.**

### ⭐ The symptom that proves it

**The TPA terminal's departures board is prose, and it ships as a card
containing prose.** Not because a board is an app with controls and
feedback — it plainly is not — but because *card was the only non-video
arm that existed*. The third manifestation is not under-modelled; it is
absent, and its one real instance is wearing a costume.

The second inference: the client decides a display is *shared* by
sniffing a `display` marker bolted onto `WatchTarget`.

### ⚠ And `pairing` is a fourth kernel list

A closed four-value enum the kernel owns, so a pack that wants a fifth
pairing edits the kernel. That is structurally identical to three things
this same review deleted — `ToolCapability`'s verb table, the closed
`Technique` union, `GENERIC_*_MATERIAL` — under the rule *when a
peripheral thing needs a central list edited, the list is in the wrong
place*. See [antipatterns.md](../../antipatterns.md).

## The decomposition

```
Screen (Thing)            location, look-at — thin
  ├─ driver policy        who may change it: authored, not a kernel enum
  └─ showing → Content

Content                   carries its KIND, which decides the client component
  ├─ video    live | recorded   → the video surface
  ├─ card     an app: controls + feedback → the card rail
  └─ prose    ordinary game text → the text stream

Network / channel         OPTIONAL, LATER: how content is organised and found
                          (a guide, a feed) — addressing, never rendering
```

**The one move that unlocks it:** make the kind **explicit, carried, and
total across three arms**, and let the client dispatch on it — instead of
two bespoke mechanisms plus a fudge. A screen then stops declaring *"I do
cards"*; it shows content, and **the content knows how it manifests**.
`sourcePolicy` becomes an honest policy over kinds *if* a venue actually
needs one, rather than being the mechanism.

### Consequences worth stating

- **One projection, one wire shape.** "The display you can see shows X"
  becomes a single per-viewer projection carrying a discriminated kind,
  rather than `cockpit.watch` for one arm and `CardApi.push` for another.
  The `display` marker on `WatchTarget` stops being an inference.
- **Prose becomes real**, and the terminal board stops pretending. This
  is the acceptance test for the whole change.
- **Video stays dumb.** Live vs prerecorded is a property of the content;
  networks and guides are a *later* addressing layer that sits above it
  and changes nothing here. `watch <handle> on <tv>` remains v1.
- **Driver policy leaves the kernel enum.** Either authored on the row,
  or expressed through `AccessApi.can(actor, action, resource)` — which
  is already the project's answer to "who may do this to that."

## Scope

**This MR (!206), because the founder asked for it here:**

1. The three-arm content kind, explicit and total.
2. Prose as a real arm, and the terminal board moved onto it — the
   acceptance test.
3. `sourcePolicy` untangled: a policy over kinds, not the mechanism.
4. The client dispatching on the carried kind rather than inferring.

**Deferred, with reasons:**

- **The network / channel layer.** Addressing, not rendering; nothing
  needs a guide yet.
- **Driver policy off the kernel enum.** Real, and the same finding as
  three others this review — but it is an *access* change, and bundling
  it with a rendering change would make both harder to review. Its own
  commit at least; possibly its own build.

## ⚠ Open questions the build must answer

1. **Does prose project per-viewer, or is it an ordinary scene message?**
   A board everyone in reach can read may just be `MessageApi.scene`,
   in which case the "prose arm" is *thinner than a mechanism* — it is
   the display choosing not to use one. That would be the best outcome
   and should be tested first.
2. **What happens when a viewer cannot render a kind?** A text client
   and a video source; an interactive card pushed to something with no
   rail. The kind being explicit is what makes this answerable at all.
3. **Is `showing` one slot or many?** A screen showing a card *and* a
   ticker is a real thing. One slot is the current assumption and may be
   wrong.
4. **Where does the driver policy live** once it leaves the enum — an
   authored predicate on the row, or an `AccessApi` action?

## Cross-references

[display.md](../../subsystems/display.md) (what shipped; the mixin is
the subject since `DisplayApi` was deleted) ·
[card-surface.md](../../subsystems/card-surface.md) (the card arm's
birth path) · [streaming.md](../../subsystems/streaming.md) +
[cockpit.md](../../subsystems/cockpit.md) (the video arm and
`cockpit.watch`) · [messaging.md](../../subsystems/messaging.md) (the
prose arm's likely mechanism) ·
[access.md](../../subsystems/access.md) (where driver policy may belong)
· [antipatterns.md](../../antipatterns.md) (the kernel-list rule).
