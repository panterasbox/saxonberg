# Visual arts slate — the real piece, and everything around it

> **Status: UNBUILT** — framed 2026-10-31 with the owner during the paint
> requirements, as the sibling of the [performance slate](./performance-slate.md)
> for a visual medium. Not a priority (*"we'll get to it eventually"*). What
> ships: the painted object itself, once the paint build lands (a canvas or panel
> as a good with coats, color and fade; [faces.md](../../subsystems/faces.md));
> `react`, which batches an audience's reactions
> ([reactions.md](../../subsystems/reactions.md)); `tip`; renown's reception
> signals ([renown.md](../../subsystems/renown.md)); the reference model for
> media, `Visible.illustration` and `MediaAsset`
> ([media.md](../../subsystems/media.md)), whose player-sourced and embedded
> half is *"not yet built"*; the display's projection rule
> ([display.md](../../subsystems/display.md)); `write` on a surface that bears
> marks.
> **Left:** the piece as the artist's own digitized work (image and video) ·
> how a player contributes media, and its moderation · the piece attached to a
> physical object · exhibition: hanging, lighting, the gallery, the show ·
> what a piece affords an audience in the web client · audience capture as
> measurement in three layers · the artist-authored metadata library and the
> audience as its check · the visual arts Disciplines · the economy: sale,
> commission, the dealer, the patron
> **Size:** a build (client-led, on the performance slate's pattern)

## 0. The owner's frame

*"We have real humans behind the wheel capable of real art. So our job is not to
generate art for the artist; they still do that on whatever terms they want, so
long as it can eventually be digitized. This means image and video basically.
The game's job is then to model everything around the piece. How is it being
exhibited, what does it afford the audience? The audience then can interact with
the piece in the web client, providing measurable feedback to the artist and the
game engine. So audience capture is the other role we play here. … We model
everything around the piece but not the content of the piece itself."*

The performance slate decided the same thing for music: the performance happens
off the page, and the game supplies the fiction around it and the measurement of
it. This slate is that decision for anything you look at.

## 1. ⭐⭐⭐ The piece is the artist's, and it is never generated **[DECIDED — the owner]**

- **The content is a real image or video** the artist made, by any means, and
  brought into the game. The engine never makes, edits or judges it.
- **It hangs on a physical object.** A painting is a canvas or panel the paint
  build made (`paint canvas`), so its physical life is paint's — the lake
  fades in sun, the tempera cures, the lead white was a dose to whoever ground
  it. A print, a photograph and a film need their own objects; the
  [paper and printing slate](./paper-and-printing-slate.md) owns the print.
- ⚠ **The object and the piece can disagree.** A fugitive pigment fades the
  object while the uploaded image stays bright. Whether the engine renders the
  object's age over the image (a filter the client applies) or leaves the
  image untouched and says it in words is open (§ 7.3).

## 2. ⭐⭐ Getting a piece into the world

Nothing today lets a player contribute media. That is the largest piece of this
build, and it is cross-cutting — the same path serves a portrait for a
character, a photograph in a newspaper and a film in a cinema:

- **Upload or embed**, carried as a reference the client renders, never by the
  server ([media.md](../../subsystems/media.md)'s own principle).
- **Moderation** — a public world that shows a player's image to other players
  needs a policy for what may be shown and a way to take it down. Who decides is
  a governance question (lens 7), and its entrenchment tier is part of the design.
- **Provenance** — who brought it in, when, and onto which object; the
  [provenance ledger](../../subsystems/provenance.md) already records authorship.

## 3. ⭐⭐ Exhibition — what the game models around the piece

- **Hanging** — a piece hangs where something can take it: a wall, an easel, a
  frame in a window. The room decides whether it can be seen (light, the
  viewer's position), as [perception](../../subsystems/perception.md) already
  does for anything visible.
- **The show** — a gallery, a salon, a market stall, a church wall; an opening
  is an event with a before, a during and an after, on the performance slate's
  § 2.
- **What the audience is shown** — the piece in the web client when they look at
  it, at the size and framing the exhibition gives it.

## 4. ⭐⭐⭐ Audience capture — measurement in three layers **[DECIDED by the performance slate]**

| layer | what | how |
|---|---|---|
| **the engine measures** | that a piece **was seen** — who looked, for how long, who came back | the look and its duration |
| **the subject values** | reception — reactions, tips, return visits | `react`, `tip`, renown's reception signals |
| **people judge** | quality | juries, critics, the festival's judged class |

⚠ **NPCs never judge or buy for the art.** They cannot see it; an NPC purchase
would be content-blind money. The performance slate's rule, unchanged.

## 5. ⭐⭐ The metadata library — the artist says, the audience checks

- **The artist authors metadata** about the piece from a common vocabulary
  (subject, medium, depicted place or person, mood, a content advisory), so
  the game can file, search and route the piece without looking at it.
- **The game does not validate it.** Deriving content from an image is not the
  engine's job (an LLM could, and we should not need one).
- **The audience is the check.** The artist has little reason to lie, and where
  they do, viewers can dispute a tag; a dispute is evidence, not a verdict.
  How disputes resolve is open (§ 7.4).

## 6. Lens pass

1. **Pedagogy** — the visual arts Disciplines, exercised by exhibiting for an
   audience; the material side of a painting (pigments, binders, lightfastness)
   is paint's and teaches through the object.
2. **Expression** — ⭐ the piece is wholly the artist's; the engine never
   judges it.
3. **Immersion** — the opening, the hush in the gallery, the piece across a lit
   room. **Participation** — artist, critic, dealer, collector, the gallery
   keeper, the forger (a copy is a different object with a claimed piece).
4. **Values** — quality has no derivable answer; people judge it. What may be
   shown is a values question the polity decides (§ 2).
5. **Continuity** — the same exhibition from the cave wall to the screen; a
   film is a piece like a canvas.
6. **Economy** — sale, commission (a [contract](../../subsystems/contract.md)),
   the dealer's cut, admission; no NPC buyers for the art.
7. **Governance** — the moderation policy and its appeal; obscenity law;
   public art commissioned by a polity.

## 7. Open

1. **The upload path and its moderation** — the client flow, size limits, who
   reviews, the takedown and its appeal.
2. **Which objects can bear a piece** — the painted panel first; a print, a
   photograph, a screen showing a film.
3. **The object's age against the image** — render the fade, or describe it.
4. **Metadata disputes** — how a viewer contests a tag and what follows.
5. **Copies and forgeries** — a copy is a new object claiming the same piece;
   whether the game can tell, and who can.
