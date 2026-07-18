# Ch 1 — Storyboard (build-states mapped to narration)

> **Pilot for the re-record visual pass.** This is the model for Ch 2–7. It turns
> [rerecord-ch1.md](./rerecord-ch1.md)'s cue sheet into a **timed build**: each beat is
> not one static slide but a sequence of **reveal states**, and every state is triggered
> by a specific phrase in the narration — so the picture is never ahead of or behind the
> voice. Fixes the two problems from video 1 (slides confusing until narration caught up /
> sitting too long) and the cam-overlay collision.

## The two production rules (apply to every chapter)

**Rule 1 — cam keep-out (small bottom-right corner).** The presenter PiP is a **~20%-width
overlay (maybe smaller)** in the bottom-right — so only a **small corner** needs to stay
clear, not a quarter. Resolution-independent: **no load-bearing element past ~78% width AND
~76% height** (the lower-right ~22%×24% corner, sized for a 20% cam + a little buffer;
shrink further if the cam's smaller). Reference px: **x>1500, y>820 at 1080p**;
**x>3000, y>1640 at 4K** (the `background.png` is 3840×2160). That leaves the whole frame
usable *except* that little corner — content just shouldn't crowd into it.

```
 ┌───────────────────────────────────────┐
 │  ASSEMBLY RAIL (thin, top edge)        │  ← beat glyphs accrue here
 │                                        │
 │     HERO / current build               │
 │     (uses most of the frame)           │
 │                              ┌─────────┤
 │                              │ CAM PiP │  ← small keep-out (~20%)
 └──────────────────────────────┴─────────┘
```

**Rule 2 — progressive reveal.** A beat = an ordered list of **states**. Each state adds
or changes one thing, on a verbatim **trigger phrase**. In production (Descript/Excalidraw)
each state is a separate frame of the same canvas; the cut happens *on the word*. A state
holds only as long as its phrase — nothing sits complete-and-static while the voice is
still on part one.

## Layout system for Ch 1 (the "assemble the machine" spine)

Ch 1 is cumulative by design. To get "the whole apparatus by the Close" **without**
crowding each beat (crowding = the read-ahead confusion we're killing):

- A slim **assembly rail** along the **top edge**. When a beat finishes, its piece shrinks
  into a small dimmed glyph on the rail. By the Close the rail holds all seven glyphs.
- The **hero zone** (center-left) always shows only the *current* beat's build, large and
  clear. Prior beats are the dimmed rail, not live clutter.
- At the **Close** the rail's glyphs descend and assemble into the full machine (center-
  left), then the **dial** appears on it. Bottom-right stays clear throughout.

## Style (matches video 1's actual theme — blue/white, NOT chalkboard)

Video 1 settled on a **blue theme**, so this whole pass matches it (don't revert to the
old dark-chalkboard palette):

- **Export transparent.** The Excalidraw assets are exported as **transparent PNGs** —
  **no background fill in the Excalidraw file.** The **blue gradient** and the **logo title
  card** are a **background layer in Descript**, composited *behind* the transparent slide
  art. So author the art to read against blue, but never draw the blue into the slide.
- **Title cards / brand:** royal-blue **waving-flag** background with the white
  **three-interlocking-rings** logo (see `background.png`) — handled in the editor, not an
  Excalidraw asset.
- Hand-drawn Excalidraw stroke style stays.
- **⚠ The background is textured** (fabric folds, brighter diagonal streaks). Keep white
  strokes **bold**, and where a key label crosses a bright fold, give it a subtle dark
  halo/outline so it never washes out. Bold white always wins; thin gray always loses.

**Brand motif — the three rings ARE the three forces.** The logo is three interlocking
rings, which is exactly labor / capital / consumer: co-equal, interlocked, none separable.
Lean on it: draw the **three forces (①) and the three chambers (④) as three interlocking
white rings**, echoing the mark. Then the mechanics fall out visually — **"2 of 3 to
pass"** = two rings lit green; **"none can capture the others"** = you can't pull one ring
free; **"the same crowd counted three ways"** = one crowd feeding three linked rings. The
title-card logo and the content become one visual language.
- **Primary text & strokes: white / near-white, ALWAYS.** ⚠ **Never gray for text** —
  gray-on-blue was hard to read in video 1. This is a hard legibility rule.
- **Semantic accents (sparingly):** **green** = go / enforced / positive (use a *bright*
  mint/lime that reads on blue, not a dark forest green); **red/coral** = blocked / can't /
  negative (a warm coral reads better on blue than a pure red, which vibrates). **Amber**
  ok for a "lit / unanswered" highlight.
- **"Dimmed / inert / neutral"** (the old gray job): do it with **reduced-opacity white or
  a light steel-blue tint** — never dark gray. It must still be readable, just de-emphasized.

Keep per-slide element count low; label sparingly.

---

## Beat 0 — why this exists  *(~40s; corner)*

| # | Trigger phrase (verbatim) | On screen | Layout / cam |
|---|---|---|---|
| 0.1 | "Ever since people started gathering online, they've had to govern themselves — a livestreamer and their chat, a Discord and its mods" | Two familiar community glyphs fade in: a **livestream+chat** and a **Discord server**. | Center-left, side by side. Bottom-right clear. |
| 0.2 | "the tools all work one way: one person, or a handful, decides everything" | A single **mod hammer / one hand** drops over both, spokes to every lever; the crowd (dots) has no lines back. | Hand centered above the two glyphs. |
| 0.3 | "That works when a place is small; it breaks as it grows" | Crowd dots **multiply**; the single hand's spokes **stretch and crack** (red). | Crowd expands left→center, never into bottom-right. |
| 0.4 | "a way to govern that scales, and that balances a community's forces instead of concentrating all the power" | The cracked one-hand rig **slides out**; a **balanced-forces** glyph slides in (three nodes on a level beam, green). | Swap happens center; new rig center-left. |
| 0.5 | "It's built as a **game**, because a game is the one thing that reliably gets people to show up" | A **game/world** icon anchors under the new rig; a "show up + care" pulse of dots flows *toward* it. | Icon center-left. |
| 0.6 | "Here's the whole thing, end to end." | Everything dims to the **empty assembly rail** at top; hero zone clears — ready to build. | Rail appears top edge. |

---

## Beat ① — what it is  *(~55s; no-face)*

| # | Trigger phrase | On screen | Layout / cam |
|---|---|---|---|
| ①.1 | "It's a game — and, at its heart, a **government**." | Two words stamp in: **GAME** + **GOVERNMENT** (equals sign between). Rail glyph #1 (a tiny ⚖/controller) seeds. | Center. |
| ①.2 | "in EVE Online, players built corporations, alliances, and an economy... an economist to study it" | An **EVE-style emergent society** sketch (nodes: corps / alliances / market), tagged "emerged on its own." | Center-left cluster. |
| ①.3 | "This one builds the government in on purpose. It's a modern **MUD** — a text-based world, like a text MMO" | EVE sketch dims; a **genre card**: "modern MUD · text world · built-in gov." | Card center-left. |
| ①.4 | "three kinds of contributor: **labor**... **capital**... and **consumers**" | **Three interlocking white rings** draw in one by one (the logo motif, introduced here): **labor** (make) / **capital** (fund) / **consumer** (play) — spine word on each ring, gloss under. | Interlocked cluster, center, left-of-cam. |
| ①.5 | "the machine enforces them directly: you can't walk through a wall, you can't spend money you don't have" | A figure **bounces off a wall** (red); a coin purchase **blocked** (red). | Left-center. |
| ①.6 | "But some rules can't reduce to code; they need a person to judge. Hold onto that split" | A **fork** splits the flow: left branch "machine-enforced" (green gear), right branch "needs a human" (a figure in **steel-blue**, still legible — not gray). | Fork center-left; hold as beat's parting image. Rail glyph #1 locks. |

---

## Beat ② — a proposal  *(~20s; no-face)*

| # | Trigger phrase | On screen | Layout / cam |
|---|---|---|---|
| ②.1 | "Say you want to change something — a rule, the way the world works" | A single figure with a **lightbulb/idea slip**. | Left. |
| ②.2 | "you propose it yourself, on one open floor where every proposal goes" | One wide **open floor** (a platform); the slip is **dropped onto it** — not handed to an authority off to the side (a struck-out "petition an official" arrow). | Floor spans center-left, well clear of bottom-right. |
| ②.3 | "Anyone can put one down, and the community decides" | Several more hands drop slips onto the same floor; caption "the community decides." Rail glyph #2 (a floor/slip) seeds. | Hands enter from left/top. |

---

## Beat ③ — it gets argued  *(~20s; no-face)*

| # | Trigger phrase | On screen | Layout / cam |
|---|---|---|---|
| ③.1 | "First it's argued — not upvoted, *argued* — on a surface that organizes claims by how they answer each other" | The dropped proposal **grows a small claim-map**: spine + support/object/answer edges. An "upvote" thumb appears then is **struck out** (red). | Map center-left, grows leftward. |
| ③.2 | "An objection nobody has answered stays lit until someone does." | One objection node **glows/lit** (amber), unanswered. | Within the map. |
| ③.3 | "Structured, not a mob." | Beside the tidy map, a **scribbled mob** blob appears and is **crossed out** (red). Rail glyph #3 (claim-map) locks. | Mob blob center, struck. |

---

## Beat ④ — three chambers decide  *(~50s; no-face)*

| # | Trigger phrase | On screen | Layout / cam |
|---|---|---|---|
| ④.1 | "Each of those three forces — **labor**, **capital**, and the **consumer** — gets its own **chamber**" | The three forces resolve into three **chambers**, drawn as the **three interlocking rings** (the logo motif returns), labeled labor / capital / consumer. | Ring-cluster top-center, left of cam. |
| ④.2 | "none can outvote the other two: a law needs a majority of chambers, two of the three" | **Two of the three rings light green → PASS**; one alone stays unlit (no pass). The interlock makes "can't capture just one" literal — a tug can't pull a single ring free. | On the ring-cluster. |
| ④.3 | "These aren't three tribes — everyone makes, funds, and plays... the same crowd counted three ways" | **One crowd** below fans **three tally-lines** up into the three linked rings (same dots, three counts). | Crowd center, tallies rise left-of-cam. |
| ④.4 | "your **standing** — is *earned* by contributing and *given to you by others*... you spend it by holding a position over time" | A **standing token** is **handed to a figure by other hands** (not minted from nowhere); then shown **held on a position** over a little clock. | Center-left inset. |
| ④.5 | "**capital** — money — earns a real voice, but only in its own chamber: never a vote in the other two, never an advantage out in the world" | A **capital coin** moves *its* chamber (green), then **bounces off** the other two chambers and off a "the world" glyph (red walls). | Coin path stays center/left; ricochets never cross into bottom-right. Rail glyph #4 (three chambers) locks. |

---

## Beat ⑤ — three branches build it  *(~55s; HERO, no-face)*

| # | Trigger phrase | On screen | Layout / cam |
|---|---|---|---|
| ⑤.1 | "a law here *is* a change to the code the world runs on — and the three branches... run like the lifecycle of building software" | An empty **left-to-right pipeline** rail appears: three stations. | Pipeline sits in the **top ~55%** (above the keep-out entirely), so it can run **full width**, left→right. |
| ⑤.2 | "The legislature writes the **requirement** — what should be true." | Station 1 fills: **legislature = requirement** (a spec card "what should be true"). | Left station. |
| ⑤.3 | "The executive **builds it**, to one rule: *what can be enforced by code, shall be*... and the rest... is the executive's real work" | Station 2 fills: **executive = build**; a small **code/human split** inside it (green gear + gray figure). | Middle station. |
| ⑤.4 | "a court **reviews** the work: where it wrote code, the court reads it... where a human made the call, the court hears the appeal" | Station 3 fills: **judiciary = review**, with **two faces** (a ✓ code-review lens + a scales/appeal). | Right station (ends before cam). |
| ⑤.5 | "Requirements, build, review: governing this world is shipping software." | Whole pipeline **lights green**; caption "governing is shipping software." Rail glyph #5 (the pipeline) locks. | Full pipeline glows. |

---

## Beat ⑥ — and all of it is written down  *(~20s; no-face)*

| # | Trigger phrase | On screen | Layout / cam |
|---|---|---|---|
| ⑥.1 | "written to a record no one can quietly rewrite" | A **tamper-evident chain** of entries (proposal · counts · code · ruling) links up; a tamper attempt **cracks the whole chain visibly** (red). | Chain runs along center-left. |
| ⑥.2 | "Not 'trust us, the vote was honest.' Check it yourself." | A figure **re-derives a count** straight from the chain (raw → matches). Rail glyph #6 (the chain) locks. | Inset center-left. |

---

## Close — the dial  *(~40s; HERO, pull back to wide)*

| # | Trigger phrase | On screen | Layout / cam |
|---|---|---|---|
| C.1 | "And none of it is all-or-nothing. This isn't one game — it's a machine any community can pick up, a Discord, a guild, a stream" | **Pull back:** the six rail glyphs **descend and assemble** into the full machine (floor → argument → chambers → branches → record). **Ghosted** other communities (Discord/guild/stream) sit around it, each about to adopt it. | Assembled machine sits **center-left**; ghost communities upper/left. **Nothing enters bottom-right.** |
| C.2 | "a **dial** that turns from *one operator deciding everything* to *a full republic*" | A large **dial** appears on the machine, arc labeled *operator → republic*. | Dial center-left, the focal element. |
| C.3 | "It starts at the operator end... one founder holding all of it" | Needle sits at **operator** end; a single founder figure holds all levers (steel-blue, de-emphasized but readable). | Needle left of arc. |
| C.4 | "it opens up as far, and as fast, as that founder chooses; nobody is forced" | Needle sweeps partway toward **republic**; a "not forced" note — the hand on the dial is the founder's own. | Needle mid-arc. |
| C.5 | "The structure doesn't make you give it away — it just makes it safe to. That's what the rest of this is about." | Final card holds; six **deep-dive hand-forward** ticks around the machine (→ Ch 2–7). | Card center-left; ticks avoid bottom-right. |

---

## Production notes

- **~34 reveal states across ~5:30** → a change roughly every **~10 s**, tracking the
  natural clause rhythm. No state should outlast its trigger phrase by more than a beat.
- **Each state = one Excalidraw frame** of the same canvas (additive). Export frames in
  order; in Descript the cut fires **on the trigger word**. Never pre-roll a state.
- **Transparent export + identical dimensions.** Every frame exports as a **transparent
  PNG at the exact same canvas size**, so successive reveal-states overlay pixel-perfect on
  the blue background (a reveal that shifted the crop would make the whole picture jump).
  Use **invisible corner anchors** (two transparent dots at fixed opposite corners, present
  in every state) to pin the export bounds identical across all frames of a beat.
- **Cam check per frame:** before exporting, confirm nothing load-bearing sits in the small
  bottom-right corner (x>1500, y>820 at 1080p / x>3000, y>1640 at 4K). Because the keep-out
  is *only* that corner, anything in the **top ~3/4 of the frame is clear at any width** —
  the sole watch-point is content that drops into the **lower band on the right** (mainly
  the Close assembly). Rail (top) and most builds are inherently safe.
- **Rail glyphs** (locked at each beat's end): ①⚖ · ② floor · ③ claim-map · ④ chambers ·
  ⑤ pipeline · ⑥ chain → all six assemble at the Close. (Beat 0 is the pre-title, no glyph.)
- Next step after sign-off: render these as `.excalidraw` frame files, then batch Ch 2–7
  storyboards on this same model.
