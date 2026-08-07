# Conventions

Rules that cut across every screen. Each was arrived at by getting it wrong
first, so they are worth reading before building rather than after.

## 1 — Never render a figure the server did not send

The demo wipes nightly, which buys latitude on *persistence* and none on
*figures*. A plausible fake is indistinguishable from a bug, and this game's
central claim is that its numbers are real.

Three states must look nothing alike:

| State | Rendering |
|---|---|
| **live** | Normal. No decoration. The only state that shows a number. |
| **empty** | A real zero — `—` plus a reason. Not a stamp. |
| **not wired** | Hatched ground, dashed border, `╌╌` where the value goes. |

Order of preference when an endpoint is missing: (1) ship the surface, hatch the
value; (2) cut the widget if it says nothing without data; (3) seed the world so
the real endpoint answers. **Never hardcode**, including "just for now".

Carve-outs: **prose never hedges** (if a thing cannot be described yet, it is not
in the room yet), and **commands refuse honestly** in the machine voice.

See `Unbuilt States.dc.html` for the full convention and a per-feature audit.

## 2 — Derive every figure from the data that produces it

A count next to a list must be computed from that list. A caption next to a
chart must read the chart's own array. This was violated five times in one
design session; every instance was a number asserted beside data that did not
produce it, and every instance was invisible until someone checked.

## 3 — Controls must branch on the state their copy describes

If a panel says a character cannot be taken out, the Enter button cannot be
live. Derive control state from the same flag that drives the copy.

## 4 — Standing splits by level, and it is load-bearing

- **Make** (you build) and **Fund** (you pay) are things the *person* does →
  **account-level**. There is no reason to author or fund as one character.
- **Play** accrues by living in the world → **per-character**, and the only
  standing that can diverge across characters of one account.

## 5 — The command line is never silent

Every click sends a command, and the interface shows which. Desktop previews the
target in the **status bar** (browser-style) on hover; mobile has no hover, so
the **command sheet** shows the verbatim command instead. The most-used
interaction in the product — reacting — is the last place this should lapse.

## 6 — Mobile is not desktop with a narrower column

The rule that decides each case: **interleave what is causally related, switch
what is independent.**

- Panes are caused by what you just did → inline in the feed, not a second column.
- Routed feeds are independent streams → a switcher.
- Prompts are demands on you → keep a slot, never hidden.
- The widget shelf wraps on desktop; on a phone it becomes a **pull-down**,
  because every row it takes is a row the feed loses.

Safe areas: 62px top, 34px bottom. Sticky footers bleed `margin-bottom:-34px`
with `padding-bottom:42px` so their surface reaches the edge while content
clears the home indicator.

## 7 — Registers are mode-scoped, not frame-scoped

Do not alternate grounds down a feed. The terminal is the one constant across
every mode and keeps a neutral ground everywhere; only illustrations get paper.
