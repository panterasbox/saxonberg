# Author typography slate (working doc)

> **Status: shape proposed, unbuilt; downstream of rich surfaces.** The
> sibling of the shipped terminal typography
> ([message-rendering.md](../../subsystems/message-rendering.md)):
> where that work governs the *engine-chosen* functional faces in the
> transcript stream, this one governs the *author-chosen* distinctive
> faces on the **richer GUI surfaces** (item/object cards, rendered
> books & letters, signage, lesson/content surfaces, the inspection
> pane). Rides the shipped message-rendering theme engine but depends on
> rich surfaces that aren't all built yet, so it's a later cycle.

The driver: content authors want to make a specific piece of content
*distinctive* — a haunted letter that reads as handwriting, a fantasy
monument in inscriptional caps, a typewritten dossier. But uncurated
font freedom is chaos: a thousand mismatched faces blasting the player
as they navigate, fighting the house storybook aesthetic. The balance:
**a small, curated, named palette authors opt content into — never raw
font-family strings.**

See also:

- [terminal typography](../../subsystems/message-rendering.md) (shipped) —
  the sibling. That work owns the transcript stream (functional faces,
  register split); this one owns rich-surface content typography. The
  **stream stays neutral**; distinctiveness lives only here.
- [message-rendering.md](../../subsystems/message-rendering.md) /
  [message-rendering-slate.md](./message-rendering-slate.md) — a font
  token is a **treatment** on the theme engine, same mechanism as the
  per-register font. Reader-sovereignty (plain-mode override) applies.
- [media.md](../../subsystems/media.md) — the house **storybook
  illustration aesthetic** the palette must stay inside. The curation
  rule keys off this: a display face belongs only if it would belong in
  an illustrated storybook.
- [client-cockpit-slate.md](./client-cockpit-slate.md) /
  [client-shell-slate.md](./client-shell-slate.md) — the rich surfaces
  (content-surface viewer, inspection pane, cards) the palette renders
  *on*. Some don't fully exist yet — the dependency that defers this.

---

## Principle

**Distinctiveness is seasoning, not the meal.** Defaults are neutral;
authors reach for a palette token to flavor a *specific* piece of
content. Three rules enforce balance by design, not willpower:

1. **Authors pick a named *role*, not a font family.** Content carries a
   token (`display: "typewriter"`, `display: "blackletter"`), the client
   maps token → face. Bounds the universe to the tokens the platform
   mints; lets the actual face be swapped later without touching content;
   makes injecting an arbitrary face impossible.
2. **Scoped to rich surfaces, never the stream.** The token palette
   applies on cards, rendered books/letters, signage, lesson/content
   surfaces, the inspection pane. The streaming transcript stays the
   functional faces (terminal-typography slate), always, for legibility
   and calm. *Narration about a letter* stays neutral serif; the
   *letter you pick up and read* can be handwriting.
3. **Bounded + lazy-loaded.** ~6–10 tokens covers an enormous range and
   stays curated. A display face's woff2 ships only when content actually
   uses it — distinctiveness stays cheap. The palette grows by the
   platform minting a token, never by an author naming a family.

---

## The curation rule (house aesthetic)

Every token must read as if it belongs in an **illustrated storybook**
(the shipped image house style — see [media.md](../../subsystems/media.md)).
Favor warm/classic display faces; reject harsh techno/novelty ones.
Author distinctiveness stays *inside* the house aesthetic rather than
fighting it. All faces free/OFL, self-hosted (the
terminal-typography slate's licensing decision applies).

A starter palette (illustrative, all OFL):

| Token | Feel | Candidate face |
|---|---|---|
| `typewriter` | notes, evidence, dossiers | Courier Prime / Special Elite |
| `handwriting` | personal letters | Caveat |
| `script` | elegant / formal letters | Tangerine |
| `inscription` | fantasy titles, monuments | Cinzel |
| `blackletter` | gothic signage, ominous (sparingly) | UnifrakturMaguntia |
| `poster` | warnings, broadsheets | Alfa Slab One / Oswald |

---

## Open questions

1. **Token vocabulary + count.** Which roles ship first; how the set is
   governed (developer-minted only, lean). Where the token→face map
   lives (theme config alongside the functional-face theme).
2. **Authoring surface.** How an author applies a token — an MML
   attribute on a content region? A field on the content object? Ties to
   the message-rendering layout/styling vocabulary and the CMS.
3. **Which rich surfaces first.** Gated on those surfaces existing;
   rendered books/letters are the most natural first consumer.
4. **Reader override.** Plain-mode collapses display tokens to the
   neutral face (reader sovereignty) — confirm the failsafe text is
   always complete (it is, by the message-rendering flatten discipline).
5. **Loading discipline.** Subset + per-use lazy load; ceiling on how
   many display faces one scene/page may pull.

---

## What this slate does NOT cover

- **The transcript functional faces / register split** →
  [message-rendering.md](../../subsystems/message-rendering.md) (shipped).
- **The theme/selector→treatment mechanism** → message-rendering. A font
  token is one treatment on it.
- **The rich surfaces themselves** (content viewer, cards, rendered
  objects) → cockpit / client-shell / content slates. This is the
  typography layer *on* them.
- **The house visual language proper** (color, layout, illustration
  style) → deferred design; this stays inside whatever it becomes.
