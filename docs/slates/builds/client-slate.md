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
[cockpit.md](../../subsystems/cockpit.md),
[message-rendering.md](../../subsystems/message-rendering.md),
[card-surface.md](../../subsystems/card-surface.md),
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
| **Dress** ✅ | VS Code dark (`#1e1e1e`, `#4ec9b0`, `#007acc`), Source Serif/Sans/Code Pro | The civic frame — ink/marble, Old Glory blue + red, Spectral / Public Sans / Newsreader / Plex Mono. **Shipped in Build A**; see [message-rendering.md § The custom-property colour layer](../../subsystems/message-rendering.md) |
| **Architecture** | Five peer layouts (`world`, `forum`, `livestream-viewer`, `streamer`, `builder`) | `one frame → modes → layouts → cards` |
| **Honesty** | Implicit | An enforced convention: never render a figure the server did not send |

The dress is mechanical and touches everything. The architecture is a
**wire contract change** (§ 4.4). The honesty rule is the one that
changes what the *server* has to ship (§ 4.3).

---

## 3 · The governing decisions

Six. Each is a rule that decides cases, not a preference.

### 3.1 ⭐⭐ Never render a figure the server did not send

> ⚠⚠ **The nightly wipe this paragraph argues from did not exist** —
> found 2026-08-13 while scoping Wave 2. No cron, no CI job, no script,
> and [deployment.md](../../deployment.md) documents durable Mongo Atlas
> persistence. The assumption had propagated into
> [client-shell.md](../../subsystems/client-shell.md) § 3.1,
> [message-rendering.md](../../subsystems/message-rendering.md) (as
> justification for retiring a vocabulary with no alias) and
> [gazette-slate](./gazette-slate.md) (which records a requirement that
> bulletins survive it). **Resolved by building it**: the wipe lands in
> the server build after Wave 2. Until it does, no surface may state it
> — see [arrival-requirements](../../requirements/arrival-requirements.md)
> decision 9, which ships the mechanism and withholds the claim.
>
> ⭐ Worth keeping as a lesson independent of the outcome: **a factual
> premise stated once in a governing paragraph gets cited, not
> re-checked.** Three documents inherited this one without anybody
> looking for the cron job.

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

### 3.3 `one frame → modes → layouts → cards`

- **Modes** are the front doors — Chat, Play, Watch, and the Build /
  Govern ascent. They answer *what am I here to do*.
- **Layouts** demote to **savable card arrangements inside a mode**.
- **Cards** are the shared bricks.

What makes it one client rather than five apps: the persistent shell,
and the **command bar present in every mode**, because every card
speaks the same bus.

Existing layout components map onto modes rather than being deleted —
`WorldLayout` becomes Play's default layout, the livestream layouts
become Watch's. **This is a wire change, not a refactor** — see § 4.4.

### 3.4 ⭐⭐ A card is held by a condition, never by recency

The single best idea in the handoff, and the thing that makes a card
*feed* tractable where a card *list* would not be.

`InspectionCard`'s one focus slot becomes a feed of frames with
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
command semantics* ([cockpit.md](../../subsystems/cockpit.md))
— at the interaction layer. It binds hardest on **reactions**, the most
used interaction in the product and the last place it should lapse.

Its other face is the **pedagogical dividend**: clicks teach the command
line, and (§ 4.2) naming mixins on real objects teaches the authoring
palette. By the time someone opens the Studio the vocabulary is already
familiar.

### 3.6 Mobile is not desktop with a narrower column

One rule decides every case: **interleave what is causally related,
switch what is independent.**

- Cards are caused by what you just did → inline in the feed, not a
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
(`src/mud/seeds/platform/idea/Topic/`), **34 entries in `KNOWN_TAGS`**
(`api/mml/tags.ts`).

| # | Change | Wire |
|---|---|---|
| 1 | ~~`<measure …>`~~ → **`<quantity>`, extended** — ✅ shipped | **Additive** — old clients see the flattened prose unchanged |
| 2 | Five topic facets — `address` · `actor` · `weight` · `audience` · `durable` — on the seed schema and `TopicDescriptor` | **Additive** fields on an existing type |
| 3 | Retire `world.emote`; fold `direction` into `exit` | ✅ shipped in S2 (the corpus replacement) |
| 4 | ~~The renames~~ → **the corpus was REPLACED** — ✅ shipped in S2. 89 seeds deleted, 36 authored: 7 roots, 29 leaves, two levels. No alias map. | Breaking; done |
| 5 | Rewrite topic `label`/`description` in player voice | ✅ shipped in S2 (folded in — doing it twice was the waste) |

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

> **STATUS — ✅ SHIPPED as S2 MR B.** Items 8 and 9 are built; 6 was
> already answered by `commandContributions`, 7 was cut, 10 shipped in
> MR A. See [messaging.md § The identity tags](../../subsystems/messaging.md)
> and [command-routing.md § Affordance resolution](../../subsystems/command-routing.md).
>
> Two things the build corrected in this section:
> - **Item 8's "alias during migration" did not happen, and should not
>   have.** There is no playerbase to protect and the retired tags had
>   no consumers; an alias would have kept a dead vocabulary alive for
>   nobody. The retirement is total, asserted by a source scan.
> - **Retiring `name` was not a rename.** 195 emitters used it because
>   it let them *not* say what the referent was — a fact none of them
>   could know. The answer is `Mml.actor`, resolved per viewer at render
>   time, not a hand-classification of 195 sites.

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
| 7 | ~~Emit the `mx` digest on affordance tags~~ — **CUT**. See below. | — |
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

### ⭐ Why the `mx` digest was cut

The question was going to be *how wide* — every composed mixin, or only
the verb-conferring ones. It turned out to be neither, because the
premise of putting composition in MML at all was false.

**The split rested on "a mixin set is stable; its state is volatile."**
It is not stable: `MixinApi.getActiveMixins` unions in augments,
implants, species innates and on-shift conferral. Composition changes at
runtime, so a digest sitting in scrollback goes stale in exactly the way
this section refuses to let the *verb* list go stale. The three
arguments above — bloat, staleness, viewer-dependence — apply verbatim
to the digest. The reasoning stopped one step short of itself.

Two more, either sufficient alone:

- **Redundant with the key beside it.** The frame already carries
  `stuff-id`; the resolver is a function of `(id, viewer, now)`, and so
  is composition.
- **It can drift irreconcilably.** `ProseLogic` registers an `item`
  Liquid filter, wiki content is hand-authored, and `Mml.fromMarkup` is
  public — so hand-written `<thing mx="…">` is reachable and nothing
  could ever reconcile it against the object.

A bitvector was considered: 149 registered mixins means ~25 fixed
base64 characters on every tagged noun — *longer* than the sparse list
for the common object — plus a version-locked index registry shared with
the client. Worst of both.

**Composition rides the resolver instead**, cached per `stuff-id`. A
cold radial waits one local round-trip; warm opens are instant. No MML
change, no encoding problem, no drift.

Still open: should the resolver return verbs the viewer *cannot yet*
use, greyed with their requirement? (Decided yes for S2 — the reason
strings already exist, one per validator.)

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

The handoff calls `one frame → modes → layouts → cards` a client
architecture change. It is not only that. Today:

- `cockpit.layout` is a **server-authoritative `clientState` key** on
  `HasInteractiveMixin`, with `LayoutName` / `LAYOUT_NAMES` exported
  from `@saxonberg/types` so the verb's validator and the client
  registry can never drift. Siblings: `cockpit.inputModes`,
  `cockpit.watch`, `console.tabs`, `console.activeTab`.
- `layout <name>` is the **only** way to change layout, following the
  write → save → push commit triple.
- `InspectionCard`'s single slot is fed by **two MQL subscriptions**
  ([card-surface.md](../../subsystems/card-surface.md)).

Demoting layouts under modes means: a new `cockpit.mode` axis with its
own vocabulary and verb; `LAYOUT_NAMES` becomes per-mode arrangements
rather than five peers; and the card feed replaces one subscription slot
with an N-card subscription set whose lifetime is governed by the § 3.4
hold conditions — which are **server-side facts** (*are they still
here*, *is it still in reach*), not client guesses.

**This is the wave that has to be designed carefully rather than
executed.** It is also the one that decides whether the shipped axiom
survives: *the client owns zero command semantics.* A mode switch is a
real command on the wire, or the axiom is gone.

### ✅ SHIPPED as S3 — and the axiom held

MRs !177 / !178 / !179. What landed, and the four things a client build
should know:

- **One `cockpit` verb** with subcommands (`mode` / `layout` / `cli` /
  `card` / `style`); `layout` / `style` / `mode` were absorbed and
  **deleted**. `applyInputMode`'s exemption moved from the literal
  `'mode'` to `'cockpit'`, which lets it finally state its rule:
  *interface control is not world input.*
- ⭐⭐ **The server owns the card vocabulary AND what a card IS.** A
  client sends `{ card: "inspect" }` and nothing else — the catalogue
  (`lib/connection/Cards.ts`) supplies query, cardinality, field set,
  dependency flags and hold. `InspectionCard.tsx` used to send
  `query: "$focus"`, which was the client holding a server semantic.
  ⚠ **The catalogue ships TWO entries.** Every card the 23 screens want
  needs one — a one-line server addition, but a real per-card
  dependency to plan around rather than discover.
- ⚠⚠ **Arrangements ship storage and vocabulary, NOT behaviour.**
  `save` captures the open cards by durable name, `recall` sets the
  active arrangement — and nothing opens or closes a card in response,
  on either side. ⭐ The undecided half: the server cannot tell a client
  to open a subscription (the client always initiates), so either that
  mechanism gets invented or **the client reads the arrangement and
  opens the named cards itself** — which works with what exists and
  preserves *client initiates, server owns the vocabulary*. **Decide
  this before the card feed is built.**
- **`cockpit.layout` survives as a compatibility projection** painted
  from (mode, arrangement) so the SHIPPED client keeps working. The
  rebuild does not read it; it dies with the old client.

⚠ The hold conditions are five and closed (`unanswered` · `here` ·
`present` · `inReach` · `carried`), each declaring what wakes it. A
sixth — "while the fight lasts", "while you are on shift" — is a design
conversation, not a map edit: see
[affordance-suggestion-slate](./affordance-suggestion-slate.md) and the
attention question it opens.

---

## 5 · What in `packages/client` is superseded

Current tree: 131 files, ~28k LOC. **In-place**, not greenfield — the
CMS/Monaco/studio cluster is a large fraction of the client and almost
orthogonal to the restyle; dragging it through a rewrite buys nothing.

| Existing | Status |
|---|---|
| ✅ `styles/faces.ts` — Source Serif / Sans / Code Pro | **SHIPPED (Build A).** Spectral / Public Sans / Newsreader / Plex Mono; the three-voice model kept and extended to four with `display`, which maps to no transcript topic. Six woff2, not seven — Spectral is static upstream (400 + 500 as real files, and 500 must be real or the engraved weight rounds away) while Public Sans is one variable file declared `font-weight: 100 900`. Newsreader requested **without** the `opsz` axis, and `globalFonts.test.tsx` now bans the axis in a tuple position. |
| ✅ The VS Code dark palette | **SHIPPED (Build A)** as the `--sx-*` custom-property ground: a 44-role vocabulary in `styles/ground.ts`, one `ground` record of hex per theme, and `tokens.color` / `tokens.palette` / `Theme.palette` all reduced to `var()` references. Zero call sites changed. Four guard tests plus an e2e drive. |
| `GhostCommandLine.tsx` | Hover preview moves to the global status bar (§ 3.5). ⚠ Note the input-prefix surface it sits beside is now `cockpit cli` (not `cockpit scope`), bare invocation REPORTS rather than clears, and prefixes are genuinely per-command-line — verified with two lines prefixed independently. |
| `InspectionCard.tsx` | Becomes the card feed (§ 3.4). ⚠ Already **half-moved**: it opens `card: "inspect"` / `card: "location"` by name rather than sending MQL, so the subscription half is done and the N-card feed is what remains. |
| `layouts/` (`LAYOUT_REGISTRY`) | Layouts demote under modes (§ 3.3, § 4.4) — **done server-side**; the client still swaps its whole frame off the `cockpit.layout` compatibility key. Components map over; the registry's *level* changes. |

### ✅ The three "verify first" items — answered 2026-08-11

Checked against the tree so a build does not have to rediscover them.

1. **Facets vs topic strings — better than either option this slate
   offered.** The S2 facets ARE plumbed into the client: the store
   resolves `address` / `actor` / `weight` / `audience` / `durable` /
   `affordance` per topic, with the *same* ancestor inheritance and the
   same conservative `FACET_FLOOR` the server's `TopicCatalogue` uses —
   and a comment saying why ("the two resolvers must agree or the client
   renders a frame the server classified differently").

   ⚠ But the **filter SURFACE does not use them**. `FilterDrawer` toggles
   per-leaf and per-family **topic paths**, so "quiet" really is a
   path list that drifts. `TabStrip` does not touch topics at all — its
   tabs are user-named client-side filters.

   ⭐ So this is a **UI change, not a plumbing change**: the data a facet
   rule needs is already in the store. That is a materially smaller job
   than the slate assumed.

2. **No account/character split client-side.** `accountId` does not
   exist in the client; the only "account" references are the account
   *menu*. Character select currently assumes the session, not an
   account that owns many characters. ⚠ MR C's roster work is the
   server half of this (`lastSeen`, play standing, last location,
   practice per entry) — the client half is unbuilt, and Wave 2 owns it.

3. **`prompt.format` is not rendered client-side.** No reference
   anywhere in `packages/client`. The design treats it as a Liquid
   template the player owns, so this is net-new in Wave 4.

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
| ~~**1**~~ ✅ | **Foundation — CLOSED 2026-08-12.** Civic tokens, four-voice type, the unbuilt-state convention (hatch / stamp / `╌╌`), global chrome desktop AND phone. **Shipped as three builds — see § 7.1.** | done |
| ~~**2**~~ ✅ | **Arrival — SHIPPED 2026-08-13.** Front door, intake, character select, + mobile; the char-gen payload generalized; account-level Make standing. ⚠ **The lounge is CUT** — see § 7.2. | done |
| **2.5** | ⭐ **The read surfaces** — one SERVER build batching every remaining endpoint the 23 screens need, so waves 4/6/7 are pure client. See § 7.2. | 2 |
| ~~**3**~~ ✅ | **Track A + B shipped as S2** — MR A the topic corpus + the four-part totality gate + the `affordance` facet; MR B the `thing`/`actor` tag collapse + `CommandApi.resolveAffordances`. | 1 |
| **4** | **Play surface** — the two feeds, the card feed and its hold policy, focus chain, filters + routing, prompt system, mobile live client. The biggest wave. | 3, and 5 (Track D — now SHIPPED, so unblocked) |
| ~~**5**~~ ✅ | **Track D shipped as S3** (MRs !177 / !178 / !179) — the one `cockpit` verb, the mode × arrangement axes, the legacy layout migration, and a **server-owned card catalogue**: the client opens a card BY NAME and the server supplies the query. ⚠ Arrangements ship **storage, not behaviour** — nothing opens or closes a card on recall, on either side. | done |
| ~~**6**~~ ✅ | **Social — SHIPPED 2026-08-15.** Reactions + the emote picker, the forum client learning the Subject model, honest wiki search, the livestream tuned rail, and the `cockpit.layout` retirement. ⚠ It was **not** "almost pure client": four server gaps and one drift, listed below. | 4 ✅ |
| **7** | ⭐ **Authoring** — CMS editor, help panel, git panel restyled into the frame. | 1 |
| ~~**—**~~ ✅ | Track C — **done for standing**: the read Apis already existed; what was missing was a structured channel, now `subscribableFields` + the `durableKey` witness. Search, clips and the frame store remain. | partly done |

### 7.1 Wave 1 cut into three builds — sized 2026-08-11

Wave 1 is three build sessions, not one. The boundaries are where they
are for reasons worth keeping:

| Build | Ships | Requirements |
|---|---|---|
| ✅ **A — civic ground** — **SHIPPED 2026-08-11** | theme-aware colour, Ink + Marble + civic `high-contrast`, four voices + the `display` role, the `ink`/`marble` rename across client+server+yaml, the three honest-state primitives. **Zero features.** | shipped — see [message-rendering.md](../../subsystems/message-rendering.md) § The custom-property colour layer + § Font-by-register, and [client-shell.md](../../subsystems/client-shell.md) § The honest-state primitives |
| ✅ **B — honest chrome** — **SHIPPED 2026-08-11** | desktop top bar (seal, connection chip + popover, identity, the nine-row shelf), the status bar replacing `GhostCommandLine`, and the server work: the `self` card, `CardDefinition.fields` widening, `cockpit shelf` + `cockpit.shelf`, `RenownApi.measuredRenownOf`. ⚠ **The read-only mode indicator is CUT** — see below. | shipped — see [client-shell.md](../../subsystems/client-shell.md) §§ The top bar / The widget shelf / The status bar / The connection popover, [cockpit.md](../../subsystems/cockpit.md) § `cockpit shelf`, [mql-subscription.md](../../subsystems/mql-subscription.md) § The card catalogue's field sets |
| ✅ **C — chrome on a phone** — **SHIPPED 2026-08-12** | the mobile *inversion* — two-row bar, no status bar, the shelf leaves the bar for a pull-down + shelf screen, the command sheet, a dropped socket claiming the first row, safe areas; plus `cockpit shelf first`, the round-trip heartbeat and the retry countdown. ⚠ **The held-commands queue and the notification bell are CUT** — see below. | shipped — see [client-shell.md](../../subsystems/client-shell.md) §§ The server owns what is shown / The mobile bar / The command sheet, and [cockpit.md](../../subsystems/cockpit.md) § `first`, and the glance-line |

#### ⭐ **WAVE 1 IS CLOSED.** Wave 2 (Arrival) is unblocked.

⭐ **C's governing sentence: *a bar that wraps has nowhere to wrap
to*.** Desktop's shelf grows a second row when you pin too much and the
page absorbs it; on a phone every row the chrome takes is a row the feed
loses, and the feed is the app. So the shelf leaves the bar entirely and
becomes a pull-down: **same catalogue, same order, different
disclosure.**

⭐ **The server owns what is shown; the viewport owns how it is
disclosed.** `cockpit.shelf` is identical on both form factors. There is
deliberately no `cockpit.formFactor` — the server cannot know a
viewport, so such a key would be a fake *fact*, the same failure one
level up that cut B's read-only indicator.

⭐ **The glance-line is the HEAD of the shelf, not a second key** — which
made *choosing what rides the bar* into *reordering*, and produced
`cockpit shelf first`. A desktop improvement too: shelf order had been
unchangeable since B.

⭐⭐ **B's round-trip hatch reason was WRONG, and C retires it.** It said
nothing measured round trip and a ping/pong would have to be written;
the protocol existed end to end and nothing called it. A reason pointing
at the wrong place is worse than no reason — it is confidently
actionable and false — so the retired string is now guarded by a test
that greps the client source. This is the hatch-doctrine failure the
three-category table exists to prevent, occurring anyway, and it is the
strongest argument yet for that table.

⚠ **The held-commands queue is CUT, not deferred.** The art's 6D shows
*"2 commands held · retry in 4 s"* with a footer naming the commands it
kept. **No such queue exists** — `WebSocketClient.send()` logs an error
and drops the message. Building one is an offline queue with ordering,
expiry and replay-safety questions (*is `north` still the right command
forty seconds later?*), which is a real feature deserving its own
requirements rather than a chrome build's side effect. ⭐ What the
dropped row says instead is the inversion: **commands sent now will not
arrive**. The art comforts; the truth is bleaker and strictly more
useful, and it is the sentence that makes the queue's absence *visible*
rather than silently wrong. A test asserts no "held" count renders.
Recorded here so 6D is not later read as an unmet promise.

⚠ **The notification bell is CUT for the second time**, on the same
grounds as in B: what belongs in that tray is whatever the receiver
*said* they wanted, which wants `NotifyPolicy` read first, and nothing
about a smaller screen changes what is behind it. It gets no permanent
slot in the scarcest row on the screen.

⚠ **`CharGenStage` and the world layout are untouched.** The viewport
switch is scoped to the in-world phase: mobile intake is Wave 2 with its
own art, and `WorldLayout`'s fixed `22rem` rail — which makes the
document 698px wide at a 390px viewport — belongs to Wave 4, where the
feed itself is owned. Both were left alone deliberately rather than
half-built.

⭐⭐ **SIX bugs found by driving a real browser, none of which a fully
green suite could see.** The first two came from Playwright, the rest
only from a real phone emulation:

1. `inset: 0` plus padding under content-box made a full-bleed surface
   18px too wide and scrolled the page sideways.
2. `context.setOffline(true)` does **not** close an already-open
   WebSocket, so the dropped-row spec asserted a state it never reached.
3. ⭐⭐ **The mobile bar never opened the `self` subscription** — it
   does not render `Shelf`, where that `useEffect` lived — so every
   glance-line figure was empty forever. Eleven green tests seeded the
   store directly and were structurally blind to *does anything ask?*
4. ⭐⭐ **Under the mobile viewport model an overflowing document widens
   the ICB**, which `position: fixed` resolves against — so the shelf
   screen rendered at 728px in a 390px viewport with its close button
   and every action off-screen and **unreachable**. Playwright's plain
   `viewport` is a narrow DESKTOP context where this cannot happen;
   `isMobile: true` is the difference.
5. **The right-column cards bypassed the command sheet**, taking the raw
   send — so one screen had two rules for the same tap.
6. ⭐⭐ **The client never reconnected after a server restart** — the
   standup-deploy path the backoff exists for — because `App`'s connect
   effect raced the loop and the chain was lost. Pre-existing; the retry
   countdown is what made it legible, and *a countdown is a promise*.

⚠ The governing lesson, third time it has been paid for: **jsdom has no
layout, and a narrow desktop window is not a phone.** B's overflowing
`＋ widget` menu taught half of it; this build taught the other half.

⚠ **Build B's read-only mode indicator was CUT, not deferred — it has no
source.** This line promised one; investigation during planning found
nothing for it to indicate. The only read-only principal in the system
is the livestream broadcast feed, which
[livestream.md](../../subsystems/livestream.md) records as having *"no
`Interactive` at all"* — an out-of-band overlay socket that never
receives `connection-established`, absent from the connection registry,
and with no reference anywhere in `packages/client`. Nor is there a
read-only `CockpitMode`: `watch` is a mode, but a watching player holds
a full `Interactive` and can act.

Building one would have meant inventing a read-only session state to
justify a chip — the interface leading the model, which is the honesty
failure one level up: not a fake figure but a fake capability. **If a
read-only React session is genuinely wanted** — a spectator link, a
shared-screen mode, a suspended account that can read but not act —
that is a real feature with server work and wants its own requirements.
Recorded here so this line is not later read as an unmet promise; the
full rationale is in
[client-shell.md](../../subsystems/client-shell.md) § The read-only mode
indicator.

⭐ **B's shelf is mostly hatched, and that is the deliverable.** Three of
nine rows have a live server read; the other six name one of three
distinct reasons (the account-level gap, the missing-field gap, the
not-about-you gap). A shelf showing nine confident numbers would be
lying about six of them.

⚠ **But the DEFAULT pins only the three wired rows** — corrected on
review. *Never default-pin a widget that does not do anything yet.* A
principle is not a product: six dead boxes on first login is bad even
when each one explains itself honestly. The convention moved to the
`＋ widget` menu, which carries every reason in visible text at the
moment a player is actually asking.

⭐ **The token sweep is nearly free, and "mechanical, touches everything"
was wrong.** 1468 `tokens.*` reference sites over only **44 distinct
token paths**, and every use is CSS-valued — interpolated into a
styled-components template or passed as a `$tint`/`$tone` prop into one
(audited: no inline `style={{}}`, no SVG `fill=`, no comparison, no colour
math). So the tokens keep their names and become `var(--sx-*)` strings and
**zero call sites change**. ⚠ The cost is a new silent-failure mode — a
missing custom property drops the CSS declaration with no type error — so
a test asserting every referenced `--sx-*` is defined by every theme is
load-bearing, not hygiene.

⭐⭐ **Marble is not a nice-to-have; it is the only thing that tests the
mechanism.** A theme-aware colour layer with one theme is untested by
construction — nothing distinguishes resolve-at-render-time from
read-a-constant-at-import. Which is also why it cannot be "added later
once we're sure": being sure is what it provides.

⚠ **The honest-state primitives are a prerequisite for Wave 2, not a
companion to the chrome** — character select renders per-character
figures (MR C shipped `lastSeen`, play standing, last location, practice
per roster entry), so Arrival needs live/empty/not-wired to exist. That
is why they sit in A rather than B, and the accepted cost is that A ships
them with no consumer; B is their first.

⚠ **Wave 1 is not client-only.** The theme vocabulary is server-owned
(`StyleController.KNOWN_THEMES`), pinning must be a real command or § 3.5's
axiom lapses on the chrome that advertises it, and the shelf needs a card
catalogue entry.

⭐ **One card entry feeds the whole shelf, not one per figure** — every
shelf figure is a field on the viewer's own Avatar. `self` joins `CardId`;
`CardDefinition.fields` widens from `'ref' | 'detail'` to `FieldSet |
FieldAlias`, because neither alias carries standing (`REF_FIELDS` /
`DETAIL_FIELDS` are object-description fields) while the subscribe path
already accepts an explicit name list.

⚠ **Three standing figures are live, not four.**
`Avatar.subscribableFields` ships `playStanding`, `makeStanding` and
`renown` — no `fundStanding`, no competence digest. So most of
`Global Chrome.dc.html`'s shelf catalogue hatches, which is what makes the
shelf the right first consumer of the honesty convention. The shelf is
also the **first client consumer of S1's wire at all**: `packages/client`
has two subscription call sites today, both `InspectionCard` cards, and
nothing reads a standing field.

⚠⚠ **`makeStanding` was a *level* collision, not a missing figure** —
it read per-character while § 6 / CONVENTIONS #4 call Make
account-level, and labelling it account-level in the shelf would have
rendered a claim the server could not back: the honesty rule applied to
a level rather than a value.

✅ **RESOLVED in Wave 2.** The account roll-up shipped, the field joined
`CARDS.self`, and the shelf row went live — all in one commit, because
splitting them would have meant either a wrong-level number on the wire
or a computed number nobody painted. ⚠ The hatch category `level`,
whose only member this was, is **retired**: its sentence named a gap
that had been closed, and *a reason pointing at the wrong place is worse
than no reason.* Found by driving a browser, not by the suite.

✅ **Open question 5 (fonts) — CLOSED by precedent, not decided.**
`GlobalFonts.ts` already self-hosts subset OFL woff2 from `public/fonts/`
and `globalFonts.test.tsx` asserts the `src` URLs are relative, so the
handoff's Google Fonts `<link>` would be a regression. Build A generated
the subsets (six files, four families) and **recorded the procedure** in
`message-rendering.md` § Font-by-register typography — it had been tribal
knowledge, traceable only to a commit message describing the result.

---

#### ⭐ **WAVE 2 IS CLOSED.** What it settled, beyond its own screens

- ⭐⭐ **The char-gen payload is generic**, projected from
  `EnrollController`'s `FIELDS` table. A new intake concept is **one
  table entry**. This is the change [char-gen.md](../../subsystems/char-gen.md)
  argued for, taken at the moment it was cheapest, and it makes the
  lineage model mostly a server change.
- ⭐⭐ **Two rules the analysis had not anticipated**, and they are what
  makes "additive" true rather than merely claimed: a field the client's
  screen config does not name **still renders**, and a field whose
  `kind` it cannot draw **renders hatched**. Without them a
  server-added field would be invisible while still gating `enroll
  confirm` through `missing` — a dead Continue button with nothing
  explaining it. *The honest-state rule turned on the intake's own
  extensibility.*
- ⭐ **Account-level Make standing shipped**, ending the level collision
  Build B recorded. Sum, not max or mean — *the account is the subject,
  so distributing work across bodies must not move the figure*, and sum
  is the only combinator with that property. `CARDS.self` gained
  `makeStanding` in the same commit as the arithmetic, which was the
  condition its absence had been recorded against.
- ⚠ **`standingForHost` returns `undefined`** for an unresolvable
  account and no caller may substitute a per-character figure. A
  deliberate behaviour change: a body with no account used to print a
  band, and that band was a per-character number wearing an
  account-level label.
- ⚠⚠ **The nightly wipe did not exist** (§ 3.1's box). Found while
  scoping this wave.
- ⚠⚠ **A shipped guest-menu string promised what the product refuses.**
  *"Sign in to save"* implied a guest session carries over; a guest is
  `anon:<nanoid>` with no persisted `User` and there is no conversion
  path. ⭐ Worse than a wrong figure, because the player **acts** on it —
  they keep playing believing the work is banked. Now *"Sign in to start
  a character"*. Conversion is **refused, not deferred**: building it
  would make the front door's own promise false.
- ⚠ **The in-world rail collapse came forward from Wave 4**, because the
  arrival path terminates in the world and an arrival that delivers you
  somewhere broken has not arrived. **Collapse only** — the play-surface
  redesign is untouched.
- ⚠ **Still cut:** the lounge (both halves), `retire`/`restore`/
  `rename`/`appearance`, an offline-notice source for *Since you left*,
  and Fund standing. Each renders with its own reason rather than being
  omitted.

### ⚠⚠ 7.15 the mocks were audited by TEXT, not by SIGHT — ✅ DEBT CLEARED

Recorded 2026-08-13 during Wave 2; **Wave 1's three mocks were rendered
and diffed on 2026-08-14** — findings at the end of this section.

**The `.dc.html` files were read by extracting their text and never
opened in a browser.** Stripped text preserves *what words appear* and
destroys *how they are arranged* — so a one-page form was built as a
five-screen wizard, a banded hero was built as a two-column rail, and a
three-column workspace was built as a single centred column. All three
were caught only when the user looked at the built screens.

⭐ **The method fix, for every wave from here:** render the mock and
compare by eye. The files are React walkthroughs — pin the phase flag
in a scratch copy to reach panels behind a step (`isDoor` / `isIntake`
/ `isLounge` in *Arrival — First 60 Seconds*). Reading the source text
is a supplement, never the audit.

⭐ Waves 4, 6 and 7 are unbuilt, so their mocks carry no debt — only the
method rule above.

#### The Wave 1 audit — done 2026-08-14

`Global Chrome.dc.html`, `Global Chrome - Mobile.dc.html` and
`Unbuilt States.dc.html` were served over HTTP, rendered, every menu and
pull-down opened, and diffed against the live client driven at both form
factors. **It came back nearly clean** — the prediction held: Build C
paid visual attention by driving, and Wave 1's *content* decisions were
argued from written rules in this slate rather than from pixels, so
text-reading cost far less here than it did in Wave 2, where the mocks
carry the layouts themselves.

**Two real defects, both fixed:**

1. ⚠⚠ **An `empty` chip's tooltip said "not wired".** `Figure` built its
   `title` as a second copy of the sentence with the state hardcoded,
   so `RENOWN —` (the server answered; nothing recorded) told every
   pointer user it had no endpoint. These are the two states the
   convention says must **look nothing alike**, and on a chip the
   tooltip is the only place either reason surfaces. The `aria-label`
   builder had all three states right — nothing read the other
   attribute. Now one builder feeds both.
2. ⚠ **The desktop shelf menu labelled every unpinned row `—`**, which
   is the empty-figure glyph, where the art says `add`. `MAKE` made it
   concrete: it went live in Wave 2, and a live-but-unpinned row has no
   reason line, so it sat under a bare `—` reading as *more* broken
   than the hatched rows around it. The phone's shelf screen already
   named its actions (`pin` / `to bar` / `remove`); this was the
   desktop half catching up.

**Four departures from the art, examined and KEPT.** Recording them so
the next reader does not re-open them:

| Art | Shipped | Why it stands |
|---|---|---|
| notification bell + badge | folded into the account menu | cut twice, on the record — the tray's classification belongs to `NotifyPolicy`, and a badge over an unclassified count is a figure nobody measured |
| status bar right region `here:forge · 1,240 frames` | `click to send`, nothing at rest | nothing counts frames and `here:` has no subscription; painting them in the one surface that advertises honesty is the violation it exists to prevent |
| 52px left nav rail (◆ ▭ ▶) | the `Views` menu | same job, and migrating the frame off `cockpit.layout` is an explicit Wave 4 non-goal |
| feed gutter of register names (ROOM · SAY · TELL) | `GutterStripe`, hue hashed from topic family | a fixed three-label set predates the facet-based topic taxonomy; the stripe carries the same distinction over the vocabulary that actually shipped |

⚠ **Two art elements are cut and stay cut**, both already on the record
in § 7's Build C row: the held-commands queue on a dropped socket
(mock 6D's `held› true rim · quench axle`), and the mobile feed's
per-frame timestamps.

⭐ **One place the live client is BETTER than the art, and it is worth
naming**: the connection popover hatches `frames behind` with *"nothing
measures it — needs a server sequence number"*. The mock printed
`frames behind 0`, which is the plausible fake its sibling document
exists to forbid. The convention beat the drawing.

### ⚠ 7.16 Wave 6 was NOT "almost pure client" — 2026-08-15

This slate said every server half was already shipped. Rendering the four
reference screens and auditing them against the tree found otherwise.
Recorded so Wave 7's identical claim gets checked rather than believed.

**Four server gaps:**

1. **The emote catalogue had no player-readable surface.** `soul list` is
   gated `requiresCoreAccess` — the authoring face. The client's picker
   palette was a hardcoded six-entry `{ verb, emoji }` array. Fixed with
   `SoulApi.snapshot()` on the connection payload.
2. **The forum Subject model was server-only.** `packages/client` had
   ZERO references to the four surface names. Fixed with a fourth
   subscription scope, `subjects`.
3. **No structured tuned-target state.** The rail had only a bare
   `tune`'s prose to read. Fixed with `cockpit.tuned`.
4. **`SHIPPED_ARRANGEMENT_CARDS` is keyed by mode alone**, so `watch`'s
   two arrangements are inexpressible. ⚠ **Not fixed** — nothing in Wave
   6 needed to fill it, and re-keying an empty map is churn. ✅ **CLOSED
   by the card-surface build**: filling the map is what expired the
   churn argument, and it is now keyed `(mode, arrangement)`.

**One drift:** `act.combat` was reactable server-side and the client
never offered it, because `REACTABLE_PREFIXES` claimed to mirror
`REACTABLE_TOPICS` and had stopped.

⭐⭐ **And one finding that was WRONG.** The requirements doc first
reported `StreamEmbed` as Twitch/YouTube-only. It handles Kick; the
*file's header comment* was stale. The audit read the comment instead of
the switch below it — the same failure mode as § 7.15's mocks-by-text,
one level down. **A stale comment is worse than no comment: confidently
actionable and false.**

**Two mock features with no server half**, both cut rather than hatched:
the wiki's `OFFICIAL` page-standing badge (an unbuilt *governance*
feature — "adopted by the Make chamber" — not an unwired read), and its
three derived blocks (*what it affords* / *seen in play* / *composed
by*). Four hatches on one page reads as a broken page.

**One mock that is simply stale:** it badges the Argument surface
`reserved`. The ordered organizer shipped in forums cycle 2. Only the
ordered CHAT surface is parked.

### ⭐⭐ 7.17 What the LIVE DRIVE found that the suite could not

Four defects, none visible to any test, all found by driving the built
client. Three share one shape: **a test compared the client's output to
the client's own assumption.**

1. ⚠⚠ **Reacting from the GUI had never worked.** The composed command
   carried a `;` sigil (`react --msg 22 ;wave`). `;` marks an emote only
   at the START of a line; mid-line it separates statements, so the
   server saw `react --msg 22` — an arity failure — followed by `wave`.
   The SHIPPED `ReactionBar` had composed exactly that for every chip.
   **The most-used interaction in the product, broken, with a green
   suite**, because every test asserted the client's string against
   itself and never against the parser.
2. ⚠⚠ **The subject rail was silently unsubscribed.** The inbound WS
   handler kept its own literal list of scope kinds and returned
   silently on the new one. The rail rendered *"No subjects you can see
   yet"* over four subjects that existed. ⭐ **An honest empty state is
   indistinguishable from a dropped message** — which is what lets this
   class of bug survive.
3. ⚠ **Glyph-less emotes drew empty grid cells.** Mongo returns an
   explicit `null` for an omitted optional field; every fixture had used
   `undefined`. The test data was not the shape the database holds.
4. ⚠ **`Avatar.enter` began resolving a template**, breaking a
   deliberate "enter is pure ceremony" assertion — caught by the suite,
   unlike the other three.

⭐ The generalisation worth keeping: **a green suite tells you the
client is self-consistent, not that it works.** Wave 4 learned that a
component test proves rendering and never wiring; this wave adds that a
client-side test proves neither the WIRE nor the PARSER. The only thing
that found any of these was opening the app and using it.

**Open, and deliberately so:** the coalesced *"7 people reacted to what
you said"* line. Where a client-composed sentence lives without
impersonating server prose or reviving the notification surface Wave 1C
cut is a real design question.

### 7.2 The program resequenced — 2026-08-13

Decided while scoping Wave 2, when the remaining waves were sequenced as
a program rather than one at a time. Three changes to § 7's table.

⭐ **The efficiency lever is not "more per wave".** Wave 2's three
screens are touched by no other wave, and that isolation is what makes
them cheap. Pulling Wave 4 material forward would make two waves share
components and slow both. The lever is elsewhere: **waves 6 and 7 are
already almost pure client** — reactions, forums, wiki, livestream, CMS,
help and git all have shipped server halves — while Wave 4 does not.

So a **server build (2.5) sits between Arrival and the Play surface**,
batching every remaining read surface into one pass. What it carries:

- **Card catalogue entries.** The catalogue ships **three** (`inspect`,
  `location`, `self`); every card across the 23 screens needs one. This
  is the item most likely to stall a client wave mid-flight, and § 4.4
  already flagged it as "a real per-card dependency to plan around
  rather than discover".
- **The per-player frame store** — open question 1, **ANSWERED: yes**
  (2026-08-13). Everything about search scope, a second device, and
  "your backlog is bigger than the server's copy" falls out of it, which
  is why it could not stay open past Wave 4's planning.
- **`prompt.format` rendering** — no reference anywhere in
  `packages/client`; net-new.
- **Wiki search and forum search** — both "not wired" in § 4.3's audit.
- **The nightly wipe** (§ 3.1's box).
- Whatever else § 4.3's *not wired* column still lists at that point.

⚠ **Still to decide before the card feed is built** (§ 4.4's undecided
half): does the client read an arrangement and open the named cards
itself? That remains open and belongs to Wave 4's requirements — the
server build does not settle it, because it is a question about who
initiates, not about which endpoint exists.

⚠ **The lounge is cut from Wave 2 entirely** — both halves. Its client
half is Wave 4's play surface (the art's lounge panel is a play-surface
mock, so a pass built in Wave 2 would be discarded or would constrain
Wave 4); its content half — the pizza-as-tally, the waiter, the order
console, the departures board — is listed **deferred** in
[location.md](../../subsystems/location.md) and belongs to the
lounge-revisit slate.

Deferred, designed but not scheduled: output logging / clips /
attestation (§ 4.3); engagement patterns beyond the practice record;
notifications — designed only as a stub, and `NotifyPolicy` /
`NotifyRule` should be read before the UI is designed, because what
belongs in that tray is *whatever the receiver said they wanted*, not
everything that happened.

### ✅ 7.18 Wave 7 — the card surface — SHIPPED (`build/card-surface`)

The last client wave, and it does four things that only make sense
together.

**One birth path.** A card exists because a **command** caused the
server to push it. The client's focus-watching inference retires, and —
stronger than any guard — `MqlSubscribeMessage` loses every field that
could name a card. It keeps exactly one: `chrome: 'self'`, the widget
shelf's subscription, which is not a card. *A source scan can be
defeated by a clever call site; a missing protocol field cannot be used
at all.*

**One lifetime axis.** Pinned, or aged out of a relevance window. The
four spatial holds are retired (each cost a wake); `unanswered`'s
guarantee — *nothing still actionable ever leaves* — moves onto the
pinned axis, where a prompt card opens pinned and auto-releases when
answered.

**Liveness is scoped to ATTENTION.** Static by default, stamped with
when, carrying a refresh. The one live row is the **inspection** card,
and only the NEWEST one holds a subscription — opening another demotes
its predecessor to an ordinary snapshot. ⚠ Shipping it live at all was
a deviation from the plan, which marked every row static while its own
driving script drove "the one live card"; a `live` field nothing reads
is indistinguishable from a broken one.

⭐⭐ **And inspection is ONE card.** A room, a person, an object and an
idea are `StuffKind`s of the card's subject, laid out differently by the
body — not four cards, and not the two (`place` + `subject`) the build
shipped mid-flight. The tell was a command view reading `opens_card:
[place, subject]`: `look` takes one target, that target is exactly one
kind of thing, and a verb declaring it opens one of two kinds of card is
a verb reporting that the model is not unified.

**The switcher dies.** `Inspect · Who's Online · News · Wiki` was four
hand-written surfaces with their own data paths in a tab strip; it
existed *because* the only way a card could be born was a focus change,
and none of the other three is one. So did the CMS's own four-tab mode
bar. Both are one feed now.

⭐⭐ **And one finding that changed a decision.** The requirements keyed
the `shell.result` filter on the **topic** `shell.result`, on the
premise that *every structured command result already carries it*. The
per-card prose audit the plan required falsified the premise: `look`'s
two cards ride `sense.survey`, which twelve other verbs share. A topic
key would either miss `look` entirely or silence all twelve. The filter
keys on a per-frame `meta.carded` marker instead — exact by
construction, because the producer that opens the card is the producer
that stamps the frame.

⭐⭐ **And the live drive found four defects a green suite could not**,
two of them the same shape as § 7.17's: a rule implemented in one of two
render paths. Two cards of one kind rendered the *same* pin command; the
phone ignored both feed filters (and the per-viewport override's whole
payoff is on the phone); the news card was unreachable by command
because a verb-level validator answered a reading question with a
publishing refusal; and `cms`/`studio` did not exist as verbs at all,
because a command YAML nothing CONTRIBUTES is not reachable. Full
account in [card-surface.md § What the live drive
found](../../subsystems/card-surface.md).

⭐⭐⭐ **And then the whole model was rejected and redone.** *"We're
clearly not on the same page as far as the experience we're trying to
create."* Four changes, each with a symptom no green suite could see:
the feed became a **LOG** (dedup-on-command made asking twice look like
the command had done nothing at all); liveness moved onto **attention**;
inspection collapsed to **one card**; and `meta.carded` became a fact
rather than a promise. Underneath all of it, one substrate fix — **a
relative query (`here`, `$focus`, `person`) can never back a card about
a THING**, because it re-answers against the asker, which is how a card
about the lounge silently became a card about the bar.

⚠ **What Wave 7 ships unfinished, and it is worth naming for the next
client build:** no tables, no forms, no interactive cards — the widest
gap between what a card is *for* and what it does; and fixed `All` +
`Look` tabs where the design wants **tagging**, which needs a fuller set
of card kinds to form a tag library around.

**The residue § 7.16–7.17 recorded:** the wiki-search hatch is closed
(it cited an audit that was already stale — *the hatch was written from
a table rather than from the tree*); the action row can now tell
subject-afforded from actor-afforded; `BlueprintSeeder` reconciles
rather than warning forever. Three items are **recorded rather than
closed**, with reasons, in
[card-surface.md](../../subsystems/card-surface.md): `chat on`'s rail
wake, the radial's `stuffId` on transcript nouns, and the `HERE`-rows
`something` — whose requirements framing turned out to be **wrong** (the
two gates answer different questions; the likely defect is the light
band of ordinary rooms).

---

## 8 · Open questions

1. ~~**Per-player frame store — yes or no?**~~ (§ 4.3) ✅ **ANSWERED:
   yes** (2026-08-13). The server retains a player's frames; the client
   buffer stops being the only copy. It lands in the **2.5 server
   build** (§ 7.2) with its own storage and retention design, because
   search scope, the second-device story and "your backlog" all depend
   on it and Wave 4 would otherwise stall on the question.
2. ~~**Does a mode switch stay a real command on the wire?**~~ (§ 4.4)
   **ANSWERED: yes** — and verified by driving a browser, not just by
   test. `cockpit mode watch streamer` is an ordinary command; the whole
   frame switches on it. Track D is a verb plus a `clientState` axis,
   and **the axiom holds**: every clickable still previews exactly what
   it sends.
3. **`item` / `object` — portable-vs-fixed, or historical?** Decides
   keep-or-collapse in Track A/B, and the spec's own answer (collapse to
   `thing`, because portability is *state*, not kind) depends on the
   resolver existing first.
4. **How wide is the `mx` digest** (§ 4.2) — the honest full list or the
   verb-conferring subset?
5. ~~**Do the four faces get licensed/self-hosted, or ride Google
   Fonts?**~~ ✅ **CLOSED by precedent (Build A, MR !182)** — not
   decided. `GlobalFonts.ts` already self-hosted subset OFL woff2 and
   `globalFonts.test.tsx` already asserted the `src` URLs are relative,
   so the handoff's `<link>` would have been a *regression*. Six files
   ship (Spectral is static so 400 + 500 are real faces; Public Sans is
   one variable file), and the subsetting procedure is recorded in
   [message-rendering.md](../../subsystems/message-rendering.md)
   § Font-by-register typography — it had been traceable only to a
   commit message describing the result.
