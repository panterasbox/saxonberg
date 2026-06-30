# Cockpit composition — the layout grammar

A short design reference every cockpit **layout** is built against, so the
client is one consistent system rather than a pile of bespoke screens.
Layouts (`world` / `forum` / `livestream-viewer` / `streamer` / `builder` /
…) are *variations on this grammar*, not exceptions to it. See the
[client-cockpit slate](./slates/tails/client-cockpit-slate.md) and the
[cockpit-layouts subsystem doc](./subsystems/cockpit-layouts.md).

## The laws (truisms every layout obeys)

1. **Never blind.** A terminal showing live game output is present and
   legible in *every* layout. This is the load-bearing promise — it's what
   makes the no-modal rule (law 6) possible.
2. **Chrome is fixed; content is fluid.** The status header (top), the
   command bar(s) (bottom of their terminal), and the layout/mode indicators
   are constant, fixed-size regions in the *same position every layout* —
   the *matte*. Everything between is fluid panes — the *frame*. Constant
   chrome is muscle memory (consistent framing across a series).
3. **The split encodes hierarchy — so it is rarely 50/50.** A 50/50 split
   asserts two things matter equally, which is almost never true and reads as
   subjectless. Choose the split from *what is the subject right now* (see
   Canonical splits).
4. **Fixed-ratio content sizes first.** A livestream embed is 16:9 — it
   claims a 16:9 box in the focal area and the fluid panes fill the
   remainder. Never stretch fixed-ratio content; flex the layout around it.
5. **The terminal has a legibility floor.** Its share is "whatever the
   subject leaves," but never below readable (a min height ≈ N lines / min
   width). Law 1 with teeth.
6. **No modals.** A would-be modal is routed to one of two tiers (Layouts /
   Summoned panes) so it never blanks the screen or blocks input. A modal is
   just a layout or pane that forgot to keep a terminal.

## Canonical splits (the compositional "breakpoints")

Every pane arrangement is one of these. Tie the choice to hierarchy, not to
pixels.

| Split | Ratio | Use |
|---|---|---|
| **Focal** | ~62/38 (golden) or a clean 2:1 | one subject pane + one support. Default for content layouts (video, editor). |
| **Even** | 50/50 | only when two panes are genuine peers. Rare. |
| **Monitor** | ~75/25, or a slim rail/strip | a dominant work surface + a glance terminal. |
| **Single** | 100% + a fixed rail | the terminal *is* the subject (world layout + the inspection rail). |

Terminal size is therefore **derived**: the subject claims its
hierarchy-appropriate share, the terminal fills the rest, floored at
legible. World ≈ dominant terminal; livestream-viewer ≈ the leftover around
a 16:9 video; builder ≈ a monitor strip beside the editor; forum ≈ a
sidecar.

## Responsive tiers

Mobile is **out of scope**, but the grammar must not hard-code desktop-pixel
grids — so a future mobile pass (and small laptops today) get a clean
collapse for free. Three tiers:

- **compact** — panes stack / a rail collapses to a toggle. (Also the
  small-screen path.)
- **standard** — the canonical side-by-side.
- **wide** — room for a third column / a wider focal.

Use flex + percentages + `min-width`/`min-height`; never fixed desktop-px
column grids that cannot stack.

## Command bars (one per terminal; mode is per-bar)

- **A command bar is pinned to the bottom of its terminal.** Input lives
  with its output. Multiple terminals ⇒ **multiple bars**.
- **Mode is per-bar, not per-player.** Because terminals are topic-filtered,
  a single global input mode is wrong — the chat terminal's bar wants chat
  scope while the game bar is plain. Each bar carries its own scope; a bar's
  scope may be **layout-set** (a hardwired chat bar) or **user-set** (`mode`
  issued from that bar). Submissions carry a **bar id** (context, not a
  client rewrite); the server holds per-bar mode and the interpreter prepends
  *that bar's* prefix. See the cockpit-layouts subsystem doc's input-mode
  section.
- **Mode renders as an inline, uneditable prefix — not a pill.** A moded bar
  shows the prefix as a non-editable `<span>` *inside* the bar, styled
  **identically** to typed text, with the editable input as the tail — so it
  reads as one continuous command line and looks exactly like you typed the
  whole thing (you can't backspace over the prefix; it's a separate element).
  The input holds only the tail; the span is **display-only** (mirrors
  `cockpit.inputModes[barId]`), so what's shown equals what the server
  prepends. The prefix **hides when the input is exempt** (starts with `/` or
  `mode`), so the bar always shows what will actually dispatch (and typing
  `/` teaches the escape). Closing the mode is a small **`✕` at the bar's
  edge** (chrome, not the editable field) that sends `mode off`, plus Esc.

## The ghost command line + click model

Clicking any affordance in the UI previews-then-sends a real command — this
is *the* on-ramp from point-and-click to the CLI, so it is load-bearing.
Under per-bar mode it cannot live *in* a command bar (a moded bar would
prepend its prefix, so the preview would lie about what sends, and with N
bars there is no single bar to preview into). So preview lives in a
dedicated **ghost command line**:

- A fixed, always-on strip styled **as a command line** (mono, a `>` glyph) —
  *not* peripheral status chrome — placed **adjacent to the primary command
  bar** so the "this is a thing you could type" lesson survives. It shows the
  **exact** command a hovered affordance would run.

The gestures:

| Gesture | Effect |
|---|---|
| **Hover** | the ghost line shows the exact command (passive teaching). In-progress bar input is left untouched. |
| **Click** | runs it immediately, **unmoded** — affordance submissions carry **no `barId`**, so no bar's mode prefix ever applies. Preview == send. |
| **Copy** (shift-click + the right-click "Copy command" entry) | command → clipboard (with a "copied: …" flash). Paste into whichever bar you want, explicitly. Replaces shift-click-loads-a-bar (no honest target under N bars). |
| **Right-click** | menu of alternative commands; each previews in the ghost line on hover, runs on click, copies via "Copy command". |

**The consistent rule:** *auto-actions (hover / click) are unmoded; anything
routed through a command bar — typed or pasted — obeys that bar's mode*
(its inline prefix visible, `/` escapes). Pasting a copied command into a bar is the
explicit "make it mine" path — and restores the teaching moment of the
command landing where you type, on the user's reach rather than on every
hover.

*Touch:* hover doesn't exist; the ghost line is a desktop affordance — mobile
uses tap = preview + run (per the slate). Out of scope, not designed against.

## Modals → panes (two tiers)

The no-modal rule (law 6) routes every would-be-modal into one of two tiers,
both of which keep a terminal on screen:

- **Layout tier** — big, sticky, you are *in* it (builder, livestream-viewer,
  forum, …). Entered via the `layout` verb / the Views menu. Server-
  authoritative.
- **Summoned-pane tier** — transient things that share the screen with the
  current layout's terminal and never block input: item/detail (the
  **inspection pane** is the existing proof), confirmations (the prompt
  stack does this inline), and **settings**. The replacement for "pop a
  modal" is "fill a pane slot; the terminal stays beside it."

Known modal candidates and their tier: detail/inspection → done (inspection
pane); confirm → done (prompt stack); character creation → its own flow;
**settings** (notifications, env/user vars) → summoned pane (the first new
consumer of this tier).
