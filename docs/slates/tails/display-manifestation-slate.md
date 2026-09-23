# Display manifestation — a screen shows content; the content knows how it renders

> **Status: PARTIAL** — the three-arm `DisplayKind`, prose as a real
> arm and `shows` shipped 2026-08-30 (MR !206) →
> [display.md](../../subsystems/display.md)
> **Left:** driver policy off the closed `pairing` enum and onto
> `AccessApi.can` · the network / channel / guide addressing layer ·
> multiple simultaneous sources per screen · one shared wire shape for
> display projection (video push / card push / prose-read stay three
> mechanisms)
> **Size:** a wave

*Design slate, 2026-08-30, from the libations review (MR !206). The
founder, on the substrate I shipped in D12: **"DisplayMixin is all over
the place… it's conflating a lot of things and none of them are super
well defined."** Correct. This document is written **before** the
context compact deliberately, so the design survives in the repo rather
than in a conversation summary — the same rule every other ruling in
this review followed.*

## ⚠ `pairing` is a fourth kernel list

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

### Consequences worth stating

- **One projection, one wire shape.** "The display you can see shows X"
  becomes a single per-viewer projection carrying a discriminated kind,
  rather than `cockpit.watch` for one arm and `CardApi.push` for another.
  The `display` marker on `WatchTarget` stops being an inference. Still
  open — [display.md](../../subsystems/display.md) § *What the client
  changed* confirms this consolidation "stays open, and would be its own
  build."
- **Driver policy leaves the kernel enum.** Either authored on the row,
  or expressed through `AccessApi.can(actor, action, resource)` — which
  is already the project's answer to "who may do this to that."

## ⚠ Open questions the build must answer

1. **Does prose project per-viewer, or is it an ordinary scene message?**
   — Answered: neither. Prose does not project at all — see
   [display.md](../../subsystems/display.md) §§ *Prose has no projection,
   and that is the finding* and the `teleport` verb entry.
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
