# Client surface — design handoff (2026-10-30)

Comps from a design session, 2026-10-20 → 2026-10-30, against
`panterasbox/saxonberg@9550937c6`. They sit beside the 2026-08 handoff in
[`../handoff/`](../handoff/README.md) and keep its design system (ink
tokens; Spectral, Public Sans, Newsreader, Plex Mono; 3px radius).

**Read the slates first. They are the decisions; these frames illustrate them.**

- [client-surface-slate.md](../../slates/builds/client-surface-slate.md) —
  layout, width classes, the feed and the workspace, lifecycle, terminals
  as cards, the inspection card, the phone, and the bugs to file.
- [illustration-slate.md](../../slates/builds/illustration-slate.md) —
  images: one per row, declared shape, authored state only, the style
  guide still open.

## How to open

Each `.dc.html` is a self-contained page that runs on `support.js` (copied
from `../handoff/`, the same runtime family). Serve the folder statically
(`npx serve .`, or any static server) and open a file. The frames are
references to recreate in `packages/client/` with its React and
styled-components patterns, **not code to copy**. `canvas.json` is the
canvas layout the frames were arranged on (positions, titles, notes).

Several frames are thin wrappers that mount a shared component with
different props:

- `Main.dc.html` — the explore layout (props: viewport, state, panel)
- `Terminals.dc.html` — multiple-terminal scenes
- `Phone.dc.html` — phone screens
- `Inspect.dc.html` — the inspection card (prop: specimen)
- `Card.dc.html` — the old unit-card block used by the layout frames

## The frames

### Explore — 1920 × 970 and 1440 × 790 (browser maximized)

| file | shows |
|---|---|
| `Main.dc.html` | 1920 default: terminal column 704 (text ≤ 42rem), two units as a workspace, the Recent trail, the tray |
| `Medium-1920.dc.html` | a landscape card across the top of the terminal column |
| `Full-1920.dc.html` | full: a card takes the stage, the terminal is a strip, other cards as chips |
| `Default-1440.dc.html` · `Medium-1440.dc.html` · `Full-1440.dc.html` | the same at laptop width: one unit, a feed |

⚠ These frames predate later decisions. Read them for **geometry**, not
content:
- The left panel is drawn as chrome. Per the slate, it is a region that
  holds cards.
- Card bodies are gray bars.
- The Zone card in the full frame is illustrative.

### Multiple terminals — every terminal is a card

| file | shows |
|---|---|
| `Terminals.dc.html` | chat · 1920: the room as primary, a DM terminal at unit width, the member list |
| `Terminals-explore.dc.html` | explore: an unfiltered primary, a `#dairy` sidecar, a `#newcomers` ticker at line width |
| `Terminals-watch.dc.html` | watch: video over the game terminal in the terminal column, stream chat as a unit terminal |
| `Terminals-build.dc.html` | build, panel shut: two measure-width terminals side by side (everything, and a diagnostics lens) |
| `Terminals-chat-1440.dc.html` | chat · 1440: one unit, a collapsed member list over a DM terminal |

In the channel list, the brass "primary" tag = what the primary terminal
shows; "›_ open" = open as its own terminal card.

### Phone — 390 × 844, chat first

`Phone.dc.html` (chat), `Phone-typing.dc.html` (keyboard, suggestion strip,
reply chip), `Phone-longpress.dc.html` (react, reply, tell, look — each
showing its command), `Phone-channels.dc.html` (the drawer),
`Phone-explore.dc.html` (the only place with a button bar).

### The inspection card — real rows, real strings

Built from the specimen trace in [`specimens/`](specimens/SPECIMEN-SHEET.md):
22 content rows traced statically from YAML through the code that turns
them into words, with file:line citations. Every line on these cards is
what the server says today for that row, **unless it is blue and italic,
with a blue-dashed gutter stripe: proposed, needing server work** (named in
the slate).

| file | shows |
|---|---|
| `Inspect-glance.dc.html` | glance chips: the name, then the first section |
| `Inspect.dc.html` | the pint, served — square image |
| `Inspect-pinthover.dc.html` | the pint, hovering the Bulkable stripe; the quiet row open |
| `Inspect-gin.dc.html` | Crowsfoot gin on the back-bar — tall image |
| `Inspect-backbar.dc.html` | the back-bar, a Placing host with identical bottles grouped — wide image |
| `Inspect-knife.dc.html` | the belt knife, pip rows — square image |
| `Inspect-corpse.dc.html` | a corpse — no image (whose body it is is runtime) |
| `Inspect-agent.dc.html` | Dave, to a stranger — tall image, three-quarter length in costume |
| `Inspect-player.dc.html` | another player, to a stranger — their species' image |
| `Inspect-location.dc.html` | Dave's Bar at unit, cut to fit — wide image |
| `Inspect-detail.dc.html` | Dave's Bar › the photos, behind the breadcrumb |
| `Inspect-medium.dc.html` | Dave's Bar at medium |
| `Inspect-oak.dc.html` | oak, an Idea — no image (Materials aren't Visible); its facts are all proposed |

**The gutter**:
- Solid stripe = a mixin. Dotted = a class's own augmenter (Character,
  Weapon, CraftVessel) or a `look`-controller line. Blue dashes = proposed.
- The header's stripes are Perceptible and Containable (Addressable for
  places).
- Stripe colors are hashed from the source name, as the terminal hashes
  topics. A stable palette may read better.

## Placeholders, not decisions

- **Branch marks are letters** (L · A · T · I) until the icon set is
  designed (card-ux-brief § 8, open item 3).
- **Image plates are paper boxes** captioned with what would be drawn and
  the declared shape. The style guide is unwritten.
- **Tooltip prose** for each interface is illustrative. Today's mixin help
  topics take their summary from the first member's doc comment, so a real
  mixin-level summary is needed.
- **Names in the layout and terminal frames** (Maren Vask, Bramble, Ada,
  Tomas, stream handles) are sample people; the inspection frames use
  content from the repo.
