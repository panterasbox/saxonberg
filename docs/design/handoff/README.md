# Saxonberg client — design handoff

Built across one design session against `panterasbox/saxonberg@master`. Every
screen here was grounded by reading the real server source; where a design
depends on something that does not exist yet, it says so rather than faking it.

## How to use this

Each `.dc.html` file is a **design reference that runs in a browser** — open it,
click it, it is interactive. It is **not production code to copy**. Recreate it
in `packages/client/` using that package's React + styled-components patterns.

Read `DESIGN-SYSTEM.md` and `CONVENTIONS.md` first. They cut across every screen
and will save re-deriving the same rules per file.

## Build order

Ordered so each step ships independently and nothing blocks on later work.

### 1 — Foundation (do this first; everything else assumes it)
| What | Reference |
|---|---|
| Tokens: ink/marble palette, Old Glory red/blue | `DESIGN-SYSTEM.md` |
| Type: Spectral / Public Sans / Newsreader / Plex Mono | `DESIGN-SYSTEM.md` |
| The unbuilt-state convention (hatch, stamp, `╌╌`) | `Unbuilt States.dc.html` |
| Global chrome: top bar + status bar | `Global Chrome.dc.html` |

### 2 — Arrival (launch path)
| What | Reference |
|---|---|
| Front door, intake, lounge | `Arrival - First 60 Seconds.dc.html` |
| Mobile equivalents | `Arrival - Mobile.dc.html` |
| Character select + practice record | `Character Select.dc.html` |
| Mobile | `Character Select - Mobile.dc.html` |

### 3 — The play surface
| What | Reference |
|---|---|
| General play, focus chain, card feed | `Explore - Two Feeds.dc.html`, `Play Surface - General.dc.html` |
| Verb affordances from mixins | `Mixin-Derived Affordances.dc.html` |
| Prompt system (stack, validation, compose) | `Prompt System.dc.html` |
| Filters, search scopes | `Filters and Search.dc.html` |
| Feed routing (move/copy rules) | `Feed Routing.dc.html` |
| Mobile live client | `Mobile - Live Client.dc.html` |

### 4 — Social
| What | Reference |
|---|---|
| Reactions and emotes | `Reactions and Emotes.dc.html`, `Reactions - Mobile.dc.html` |
| Forums (subjects, surfaces) + wiki | `Apps - Forums and Wiki.dc.html` |
| Livestream | `Livestream.dc.html` |

### 5 — Authoring
| What | Reference |
|---|---|
| CMS editor, help panel, git panel | `CMS - Authoring.dc.html` |

### 6 — Server-side
| What | Reference |
|---|---|
| MML + topic redesign spec | `MML and Topics - Redesign Spec.dc.html` |

Not a client task. It is a printable proposal for the server work — facet-based
topics, the `<measure>` tag, mixin-derived affordances.

## Deferred, designed but not scheduled
- Output logging / clips / attestation — `Output Logging.dc.html`
- Engagement patterns beyond the practice record — `Engagement Patterns.dc.html`
- Notifications — designed only as a stub. `NotifyPolicy.ts` / `NotifyRule.ts`
  exist server-side and should be read before designing the UI.
