# Client slate — the rebuild, and the server work hidden inside it

**Captured 2026-08-06**, from the Claude Design handoff committed at
`c03100dd` (`docs/design_handoff/` — 23 interactive `.dc.html` screens +
three cross-cutting markdown docs). The handoff was produced by reading
the real server source, so its designs are grounded rather than
aspirational; what it does *not* do is sequence itself against this
repo's own conventions, and it makes one recommendation that the build
in flight has already answered better.

> **Status: design surface for a multi-wave client cycle.** Nothing here
> is scoped for one build. The waves in § 7 are the proposed cut; each
> gets its own requirements + plan.
>
> **✅ Wave 0 + Track C shipped as S1 "figures on the wire"** (MR !172) —
> see [messaging.md](../../subsystems/messaging.md) (the `<quantity>`
> tag), [topics.md](../../subsystems/topics.md) (the five facets) and
> [mql-subscription.md](../../subsystems/mql-subscription.md) (the live
> standing figures + the `durableKey` witness). Three corrections it
> forced are folded into §§ 4.1, 4.2 and 6 below.

> **The decision that frames everything: server *subsystem* work stops
> after the ranged/affordance build; the server work that remains is all
> in service of the client.** "Client freeze on the server" is not
> literal — § 4 is four server tracks, and two of them are blocking.

Related: [client-shell.md](../../subsystems/client-shell.md),
[cockpit-layouts.md](../../subsystems/cockpit-layouts.md),
[message-rendering.md](../../subsystems/message-rendering.md),
[inspection-pane.md](../../subsystems/inspection-pane.md),
[messaging.md](../../subsystems/messaging.md),
[topics.md](../../subsystems/topics.md),
[prompt.md](../../subsystems/prompt.md),
[command-routing.md](../../subsystems/command-routing.md);
tails: [client-shell-slate](../tails/client-shell-slate.md),
[client-cockpit-slate](../tails/client-cockpit-slate.md),
[console-filtering-slate](../tails/console-filtering-slate.md),
[prompt-stack-slate](../tails/prompt-stack-slate.md),
[message-rendering-slate](../tails/message-rendering-slate.md),
[affordance-verb-slate](../tails/affordance-verb-slate.md).

---

## 1 · Why this slate exists at all

The handoff is 23 files of interactive HTML. They cannot be diffed,
searched, or retired, they carry no links into `docs/subsystems/`, and
they will drift from the code inside a month. They are **reference art**
and should stay that.

What has to live in repo vocabulary is the set of **decisions** they
encode — because those get re-litigated once per wave otherwise. That is
§ 3. Pixels, copy and interaction detail stay in the `.dc.html`; this
slate points at them and does not restate them.

The handoff's own reading order still holds: `DESIGN-SYSTEM.md` and
`CONVENTIONS.md` before any screen.

---

## 2 · The one-line summary of the change

Not a restyle. Three things at once:

| | From | To |
|---|---|---|
| **Dress** | VS Code dark (`#1e1e1e`, `#4ec9b0`, `#007acc`), Source Serif/Sans/Code Pro | The civic frame — ink/marble, Old Glory blue + red, Spectral / Public Sans / Newsreader / Plex Mono |
| **Architecture** | Five peer layouts (`world`, `forum`, `livestream-viewer`, `streamer`, `builder`) | `one frame → modes → layouts → panes` |
| **Honesty** | Implicit | An enforced convention: never render a figure the server did not send |

The dress is mechanical and touches everything. The architecture is a
**wire contract change** (§ 4.4). The honesty rule is the one that
changes what the *server* has to ship (§ 4.3).

---

## 3 · The governing decisions

Six. Each is a rule that decides cases, not a preference.

### 3.1 ⭐⭐ Never render a figure the server did not send

The demo wipes nightly, which buys latitude on *persistence* and none on
*figures*. A plausible fake is indistinguishable from a bug, and the
central claim of this product is that its numbers are real.

Three states that must look nothing alike:

| State | Rendering |
|---|---|
| **live** | Normal. No decoration. The only state that shows a number. |
| **empty** | A real zero — `—` plus a reason. Not a stamp. |
| **not wired** | Hatched ground, dashed border, `╌╌` where the value goes. |

Order of preference when an endpoint is missing: **(1)** ship the
surface and hatch the value — the layout is judgeable without the
number and wiring it later is one line; **(2)** cut the widget, when it
says nothing without its data (charts, leaderboards, sparklines);
**(3)** seed the world so the real endpoint answers. **Never hardcode,
including "just for now."**

Two carve-outs: **prose never hedges** (a room description does not
carry an engineering stamp — if a thing cannot be described yet, it is
not in the room yet), and **commands refuse honestly** in the machine
voice (`not built yet — renown is designed but has no endpoint`).

Corollary that bites immediately: **the honesty rule is what makes § 4.3
blocking.** A design that would have quietly shipped a plausible number
now has to either get a real endpoint or visibly admit it has none.

### 3.2 Derive every figure from the data that produces it

A count beside a list is computed from that list; a caption beside a
chart reads the chart's own array. The handoff records violating this
five times in one session, every instance invisible until checked.

Same shape one level up: **controls branch on the state their copy
describes.** If the panel says a character cannot be taken out, the
Enter button cannot be live.

### 3.3 `one frame → modes → layouts → panes`

- **Modes** are the front doors — Chat, Play, Watch, and the Build /
  Govern ascent. They answer *what am I here to do*.
- **Layouts** demote to **savable pane arrangements inside a mode**.
- **Panes** are the shared bricks.

What makes it one client rather than five apps: the persistent shell,
and the **command bar present in every mode**, because every pane
speaks the same bus.

Existing layout components map onto modes rather than being deleted —
`WorldLayout` becomes Play's default layout, the livestream layouts
become Watch's. **This is a wire change, not a refactor** — see § 4.4.

### 3.4 ⭐⭐ A pane is held by a condition, never by recency

The single best idea in the handoff, and the thing that makes a pane
*feed* tractable where a pane *list* would not be.

`InspectionPane`'s one focus slot becomes a feed of frames with
structured payloads. What bounds that feed is not age — it is whether
you can still act on the thing:

| Hold | Held while | Released when |
|---|---|---|
| `unanswered` | it owes a reply | answered |
| `here` | you are here | you left |
| `present` | they are still in the room | they left |
| `inReach` | in reach | out of reach |
| `carried` | on you | not carried |

The header says which, and a manual pin overrides the decision either
way. **Nothing that is still actionable ever leaves**, which removes
the race between the room, a drilled object, and an open form competing
for one slot — the exact failure the single slot has today.

### 3.5 The command line is never silent

Every click sends a command, and the interface shows which. Desktop
previews the target in the **status bar** (browser-style) on hover;
mobile has no hover, so the **command sheet** shows the verbatim command
instead. `GhostCommandLine` moves out of the command bar into the global
status bar, and the command bar then shows only what you are composing.

This is a restatement of the shipped axiom — *the client owns zero
command semantics* ([cockpit-layouts.md](../../subsystems/cockpit-layouts.md))
— at the interaction layer. It binds hardest on **reactions**, the most
used interaction in the product and the last place it should lapse.

Its other face is the **pedagogical dividend**: clicks teach the command
line, and (§ 4.2) naming mixins on real objects teaches the authoring
palette. By the time someone opens the Studio the vocabulary is already
familiar.

### 3.6 Mobile is not desktop with a narrower column

One rule decides every case: **interleave what is causally related,
switch what is independent.**

- Panes are caused by what you just did → inline in the feed, not a
  second column.
- Routed feeds are independent streams → a switcher.
- Prompts are demands on you → keep a slot, never hidden.
- The widget shelf wraps on desktop; on a phone it becomes a pull-down,
  because every row it takes is a row the feed loses.

One consequence is load-bearing rather than cosmetic: **the
copy-to-Attention routing rule stops being a convenience on a phone and
becomes the safety net**, because World may not be the feed you are
looking at. It ships on by default, and turning it off should say what
it costs.

Safe areas: 62px top, 34px bottom; tap targets never below 44px
(`min-height`, with weight controlled by padding, never by shrinking the
box).

### 3.7 Registers are mode-scoped, not frame-scoped

Civic is the default and covers nearly everything, **the terminal
included**. Narrative is *not* a theme over the terminal — the terminal
is the one constant across every mode, so it never carries a mode's
dress; world prose keeps the serif voice on the neutral ground. **Plates**
— an author-supplied illustration in a paper mount, hairline border,
italic caption, inline in the feed — are the only warm surface. That is
where the storybook lives, and nowhere else.

---

## 4 · ⚠ The server work hidden inside the handoff

Four tracks. The handoff names three and misses the fourth, which is the
biggest.

### 4.1 Track A — MML + topics redesign  *(mostly additive)*

`MML and Topics - Redesign Spec.dc.html` is a server proposal, not a
client screen. Its argument: both vocabularies record *what the server
emits* rather than *what a person attends to*, because client support
was built to test server behaviour.

Verified against the tree: **90 topic seed rows**
(`src/mud/seeds/obj/Topic/`), **34 entries in `KNOWN_TAGS`**
(`api/mml/tags.ts`).

| # | Change | Wire |
|---|---|---|
| 1 | ~~`<measure …>`~~ → **`<quantity>`, extended** — ✅ shipped | **Additive** — old clients see the flattened prose unchanged |
| 2 | Five topic facets — `address` · `actor` · `weight` · `audience` · `durable` — on the seed schema and `TopicDescriptor` | **Additive** fields on an existing type |
| 3 | Retire `world.emote`; fold `direction` into `exit` | Breaking, single-emitter each |
| 4 | The renames — `world.perception.measurement.*` (15) → `world.measure.<channel>` (8); `system.shell.*` (13) → `author.shell` (1); `system.commands.*` → `system.registry.*`; `system.auth\|connection\|session` → one subtree. ~90 → ~60 | Breaking; alias map for one release |
| 5 | Rewrite topic `label`/`description` in player voice | Content only |

⭐ **`<measure>` was never a new tag.** `Quantity.buildMarkup` had been
emitting `<quantity unit value tag>` since the quantity substrate
landed, and every measurement controller already routed through it — so
the spec's proposal was this tag missing four attributes and any
registration. Shipping both would have been two tags for one affordance,
the test the spec applies to everything else. It was extended in place;
`buildMarkup` is a single chokepoint, so ~25 call sites were untouched.
The tag was also in **no** vocabulary, which made its name resolve as a
wiki component module path — a latent bug the registration closed.

Two things worth pulling forward:

- **`<measure>` must never be inert.** It is a factual claim about the
  world on the server's authority, exactly like `speech`. A player who
  could type it into chat could forge instrument data — worse than
  misattributing words, because the whole premise is that the numbers
  are real. `KNOWN_TAGS` + `flatten` only; out of every passthrough
  policy.
- **The rename cost is at its lifetime minimum today**, and tree shape
  *is* UI shape: facets fix cross-cutting queries (*everything addressed
  to me*), only the tree fixes subtree mutes (*everything about the air
  in here*). Both halves are needed.

Open, for the server side: is the `item`/`object` split
portable-vs-fixed or historical? What is `msg` for, distinct from
`speech` and `chan`? Should `communicative` join the facets and go on
the wire? Does the measurement channel list match the engine's own
channel enum — it should be one list in one place.

### 4.2 ⭐⭐⭐ Track B — affordance resolution, **and the correction**

The spec's § 6.3 proposes adding `static affords` beside `fieldMeta` on
every verb-conferring mixin, collected up the prototype chain.

**Do not build that.** `build/affordance-scope` has just made
`static commandContributions` **directional and recursive**, named from
the declaring object's point of view:

```
self         me
inventory    everything nested INSIDE me, at any depth   (recursive)
environment  my container CHAIN, outward, at any depth   (recursive)
peers        my siblings, and one PASSABLE exit away
```

That is the same job, already authored across the whole tree, already
introspectable, and now carrying reach semantics `affords` does not
have. Adding `affords` beside it would be **a second taxonomy describing
what a first taxonomy already knows** — which is precisely the reason
§ 6.3 gives for rejecting its own earlier `kind` registry. The argument
was right; it just stopped one step short of the existing answer.

So Track B reduces to:

| # | Change | Wire |
|---|---|---|
| 6 | ~~`static affords`~~ → **use `commandContributions`**; the collector already exists | — |
| 7 | Emit the `mx` digest on affordance tags — the object's composed mixins | Additive attribute; ignored by old clients |
| 8 | Collapse `item` + `object` → `thing`; retire `name` | Breaking; alias during migration |
| 9 | **The affordance resolver** — verbs for `(id, viewer, now)` with an enabled flag and a reason | New endpoint; no frame change |
| — | *(S1 note)* `via` provenance is already solved: `ctx.commandSource` names the object that afforded a verb, so an instrument identifies itself on every reading without per-controller wiring | shipped |
| 10 | Sixth facet `affordance` on topics — `live` / `decays` / `permanent` | Additive field |

**Why MML must not carry the verb list**, and why the split is
principled rather than a compromise:

- *Bloat* — twenty tagged nouns × a dozen verbs is a frame many times
  the size of its own prose.
- *Staleness* — a frame sits in scrollback forever; a door tagged
  `unlock` ten minutes ago is now a lie.
- *Viewer-dependence* — the true menu is a function of `(id, viewer,
  now)`, and MML is a snapshot of *then*.

**A mixin set is stable; its state is volatile.** So put the stable half
in the markup and resolve the volatile half live: the radial opens
*immediately* on the mixin-derived skeleton (no round-trip, no spinner),
the resolver runs in parallel, unavailable verbs dim with their reason
(*"locked"*, *"needs Smithing 2"*), newly available ones fill in. The
file-manager right-click pattern. `mudref:` is already the plumbing;
the resolver is what's missing.

**Category slots are fixed** — perception north, manipulation east,
social west, movement south — so muscle memory survives a menu whose
verbs you have never seen. The geometry must not reflow to fit the
available verbs.

Track B's item 10 is what stops a long scrollback from being a
minefield of dead links: today every affordance in history looks equally
live.

Open: how wide is the `mx` digest — every composed mixin (honest,
wordy, and pedagogically better because `Chattel` and `Constructed`
teach something even though they afford nothing) or only those that
confer verbs (compact, covers the menu)? Should `fieldMeta.spoiler` gate
the digest — a creature's `Combustible` is a weakness, and the reveal
model already runs on values. Should the resolver return verbs the
viewer *cannot yet* use, greyed with their requirement?

### 4.3 ⚠ Track C — the unwired read-APIs  *(blocking, per § 3.1)*

The handoff's own audit of everything it designed, against what the
server can answer today:

| Live | Not wired |
|---|---|
| Command grammar, verb specs, arity | Standing — play / make / fund |
| MML tags, topics, gutter numbers | Renown |
| Reactions, emotes, the pile | Traits, competence digest |
| Chat history, press archive, help search | The practice record |
| Forums: subjects, surfaces, argument lens | Wiki search, forum search |
| Git panel: status, diff, publish, revert | Durable clips + attestation |
| Streaming: watch, tune, standby | Per-player frame store |
| Prompts: stack, validation, compose | *(partial)* notification policy + ping variants |

Every "not wired" row is a ledger that **already exists** with no read
surface — `participation_events`, `renown_events`, `disposition_events`,
`transcripts`. This is projection work, not new substrate, which is why
it fits inside a client cycle at all.

Two of these are bigger than a read API and should not be smuggled in as
one:

- **Per-player frame store.** There is no general one. Chat channels and
  the press archive keep their own history; ordinary world frames are
  retained for you nowhere. So the client buffer is *the only copy* —
  clearing site data destroys it, and a second device starts empty.
  **Whether that is acceptable is a product decision, not a UI one.**
- **Durable clips + attestation.** Storage is a mailbox (delete to make
  room, never expires — a dispute can take weeks and a retention window
  would erase evidence exactly while it is being argued); attestation is
  the thing on a clock (a rolling chain of frame hashes, cheap, reaching
  back only so far). Filing a report attests automatically rather than
  offering the choice. See [attestation-slate](./attestation-slate.md)
  and `Output Logging.dc.html` — deferred by the handoff, and it should
  stay deferred.

### 4.4 ⚠⚠ Track D — the cockpit contract change  *(not in the handoff)*

The handoff calls `one frame → modes → layouts → panes` a client
architecture change. It is not only that. Today:

- `cockpit.layout` is a **server-authoritative `clientState` key** on
  `HasInteractiveMixin`, with `LayoutName` / `LAYOUT_NAMES` exported
  from `@saxonberg/types` so the verb's validator and the client
  registry can never drift. Siblings: `cockpit.inputModes`,
  `cockpit.watch`, `console.tabs`, `console.activeTab`.
- `layout <name>` is the **only** way to change layout, following the
  write → save → push commit triple.
- `InspectionPane`'s single slot is fed by **two MQL subscriptions**
  ([inspection-pane.md](../../subsystems/inspection-pane.md)).

Demoting layouts under modes means: a new `cockpit.mode` axis with its
own vocabulary and verb; `LAYOUT_NAMES` becomes per-mode arrangements
rather than five peers; and the pane feed replaces one subscription slot
with an N-pane subscription set whose lifetime is governed by the § 3.4
hold conditions — which are **server-side facts** (*are they still
here*, *is it still in reach*), not client guesses.

**This is the wave that has to be designed carefully rather than
executed.** It is also the one that decides whether the shipped axiom
survives: *the client owns zero command semantics.* A mode switch is a
real command on the wire, or the axiom is gone.

---

## 5 · What in `packages/client` is superseded

Current tree: 131 files, ~28k LOC. **In-place**, not greenfield — the
CMS/Monaco/studio cluster is a large fraction of the client and almost
orthogonal to the restyle; dragging it through a rewrite buys nothing.

| Existing | Status |
|---|---|
| `styles/faces.ts` — Source Serif / Sans / Code Pro | Faces change to Spectral / Public Sans / Newsreader / Plex Mono. The three-voice model is **kept** and extended to four. Request Newsreader **without** the `opsz` axis — with it the face silently fails to load and falls back to Times. |
| The VS Code dark palette | Replaced wholesale by the civic tokens. Mechanical, touches everything, which is why it is step 1. |
| `GhostCommandLine.tsx` | Hover preview moves to the global status bar (§ 3.5). |
| `InspectionPane.tsx` | Becomes the pane feed (§ 3.4). |
| `layouts/` (`LAYOUT_REGISTRY`) | Layouts demote under modes (§ 3.3, § 4.4). Components map over; the registry's *level* changes. |

Worth verifying first, per the handoff's own list: whether `TabStrip`
filter tabs already read topic facets or hardcode topic strings (they
must run on facets, or "quiet" is a sixty-path list that drifts);
whether the client has any notion of *account* separate from *character*
(character select assumes one account owns many); whether
`prompt.format` is already rendered client-side (the design treats it as
a Liquid template the player owns).

---

## 6 · Decisions the handoff makes that are worth keeping as rules

Short list, because these are the ones a later wave will otherwise
re-argue:

- **Standing splits by level, and it is load-bearing.** *Make* and
  *Fund* are things the **person** does → account-level. *Play* accrues
  by living in the world → per-character, and the only standing that can
  diverge across characters of one account.
- **A reaction is an ordinary emote carrying `inReactionTo`.** No
  parallel dispatch, no second data model — so there is no reaction UI,
  only an emote UI that sometimes points at an earlier act. The tally is
  **not** the threshold: the count always accrues, `suppressFanOut`
  governs only the prose line. Channel modes default from audience size
  rather than being hand-set.
- **The routing catch-all cannot be deleted.** Every frame must land
  somewhere; in a world where a frame can be *you are on fire*, a lost
  message is not a cosmetic bug. `move` stops; `copy` continues — which
  is how a tell reaches Attention *and* still lands in World.
- **A prompt remembers who asked.** Cancelling is not dismissing a
  dialog — it rejects the awaiting command with `PromptCancelledError`,
  so the button must say which command dies. Validation failure is not
  dismissal: the prompt stays alive and the UI must never clear the
  answer. `foreground: false` joins the stack without seizing the slot.
- **Search needs a CLI equivalent to stay honest to the axiom**, and
  `search` is already the in-world perception verb — so this wants its
  own word. `recall` is free.
- **Engagement: render what is already recorded, do not invent a
  mechanic.** The practice record (a portrait of a career — colour is
  the *trade*, not the intensity) is recommended; the standing curve
  pairs with it but reads as a guilt meter if put on the front door; the
  chronicle is the deepest hook and the slowest, and on day one reads as
  an empty trophy case. Explicitly **not**: login streaks, a season
  pass, minted achievements — each contradicts standing, which measures
  what you did.

---

### ⚠⚠ One widget in the handoff's catalogue must NOT be built

`Global Chrome.dc.html`'s shelf catalogue lists **`traits` — "your most
pronounced trait right now"** as a pinnable widget. **Do not build it.**

The psychology vocation rests on self-other asymmetry — *you cannot read
yourself; another person can* — which is why the profession exists at
all. A pinned, always-on readout of your own personality is the stat
sheet that makes the therapist unnecessary. S1 therefore ships four live
standing figures, not five, and a guard test forbids any subscribable
field name matching `trait|disposition|personality`.

⚠ The `score` and `traits` **verbs** do self-report today, which
contradicts the psychology slate's premise that "the engine derives
`TraitPosition` and shows nobody, so privacy is free". That is a
pre-existing product decision the psychology build has to make. The
distinction S1 drew, and which the client should keep: **a verb you
choose to type is an act; a pinned readout is ambient.** Only the second
is a stat sheet.

## 7 · Proposed wave cut

Ordered so each ships independently. The handoff's build order is a good
*client* order; this interleaves the server tracks it does not sequence.

| Wave | What | Depends on |
|---|---|---|
| ~~**0**~~ ✅ | **Shipped as S1** — the extended `<quantity>`, the five facets, ledger witnesses, and the live standing figures (Track C folded in). | done |
| **1** | **Foundation** — civic tokens, four-voice type, the unbuilt-state convention (hatch / stamp / `╌╌`), global chrome (top bar + status bar). Mechanical, touches everything. | 0 (facets, for the filter surface) |
| **2** | **Arrival** — front door, intake, lounge, character select, + mobile. The launch path, and the one wave a stranger sees. | 1 |
| **3** | Track A steps 3–5 + Track B — renames behind an alias map, `thing` collapse, `mx` digest, the affordance resolver, the `affordance` facet. | 1 |
| **4** | **Play surface** — the two feeds, the pane feed and its hold policy, focus chain, filters + routing, prompt system, mobile live client. The biggest wave. | 3, and Track D designed |
| **5** | Track D — modes axis, layout demotion, pane subscription set. **Design before scheduling.** | 4's requirements |
| **6** | **Social** — reactions/emotes, forums + wiki, livestream. | 4 |
| **7** | **Authoring** — CMS editor, help panel, git panel restyled into the frame. | 1 |
| ~~**—**~~ ✅ | Track C — **done for standing**: the read Apis already existed; what was missing was a structured channel, now `subscribableFields` + the `durableKey` witness. Search, clips and the frame store remain. | partly done |

Deferred, designed but not scheduled: output logging / clips /
attestation (§ 4.3); engagement patterns beyond the practice record;
notifications — designed only as a stub, and `NotifyPolicy` /
`NotifyRule` should be read before the UI is designed, because what
belongs in that tray is *whatever the receiver said they wanted*, not
everything that happened.

---

## 8 · Open questions

1. **Per-player frame store — yes or no?** (§ 4.3). Product decision.
   Everything about search scope, a second device, and "your backlog is
   bigger than the server's copy" falls out of it.
2. **Does a mode switch stay a real command on the wire?** (§ 4.4). If
   yes, Track D is a verb + a `clientState` axis and the axiom holds. If
   no, the axiom is gone and that should be said out loud rather than
   discovered.
3. **`item` / `object` — portable-vs-fixed, or historical?** Decides
   keep-or-collapse in Track A/B, and the spec's own answer (collapse to
   `thing`, because portability is *state*, not kind) depends on the
   resolver existing first.
4. **How wide is the `mx` digest** (§ 4.2) — the honest full list or the
   verb-conferring subset?
5. **Do the four faces get licensed/self-hosted, or ride Google Fonts?**
   The handoff ships a `<link>`. A self-hosted subset is the usual
   answer for a product that claims to be auditable, and it is a
   one-time cost best paid in Wave 1.
