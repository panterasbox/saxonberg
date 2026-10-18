# Text-to-speech slate — a ▶ on authored prose, never the buffer

> **Status: UNBUILT** — captured 2026-10-18. What it rides ships: MML's
> semantic structure (the server marks what is prose), `Mml.flatten`
> (markup → clean linear text), per-viewer perception-filtered rendering,
> server-held client state for preferences →
> [message-rendering.md](../../subsystems/message-rendering.md),
> [card-surface.md](../../subsystems/card-surface.md)
> **Left:** a ▶ on authored prose only (card prose sections, prose
> terminal frames) · browser speech first · cached cloud voices later ·
> sentence highlight, one voice at a time, settings
> **Size:** a tail

**Captured 2026-10-18**, in the live usability pass: *a button you can
click for any long prose — a long description — and it reads it to you.
What I don't want is something that narrates the entire terminal buffer,
lists and stats and all.*

## Only prose gets a ▶ — decided by markup, never by guessing

The server already marks what is what, so the rule is the markup's:

- **Readable** — authored prose: long descriptions, detail text, signs
  and books, NPC speech, wiki and help bodies, forum posts.
- **Never readable** — exits, the *you also see* list, chips, stats,
  tables, the composition strip, command echoes, a `query` result.

In practice a ▶ sits on the **prose sections of cards** (the Location
card's description, a Thing's details) and on **terminal frames whose
content is prose**.

**What it reads is what the player sees** — per-viewer,
perception-filtered, flattened to plain words by `Mml.flatten`; links
read as their words, and emphasis becomes a slight pause, never symbols
read aloud.

## The engine — browser first, cloud voices behind the same button

1. **First: the browser's own `speechSynthesis`** (Web Speech API) —
   free, no server work, and Chrome and Edge ship decent natural voices.
   Ship it and learn whether people use it.
2. **Later: a cloud voice** (OpenAI, ElevenLabs, Polly), behind the same
   ▶. It costs per character — but **authored prose is static**, so its
   audio is rendered **once per text, cached by content hash**, and
   served as a file: paying once per room description is cheap; paying
   per playback is not. Prose that is not static (NPC speech, a forum
   post) stays on the browser voice, or renders on demand and caches the
   same way.

## Small things that make it pleasant

- **Highlight the sentence being read.**
- **One voice at a time** — pressing ▶ elsewhere stops the current one.
- **Settings**: voice, rate, and an **off-by-default** *read arriving
  room descriptions*, held as server-side client state like every other
  preference.
- **Interface, not fiction** — never gated by anything in-world, the
  same as streams.

## Non-goals

- **Narrating the buffer** — lists, stats, chips, echoes.
- **Replacing screen readers.** It complements them; the semantic markup
  and ARIA labels still have to be right, and a missing one is still a
  bug.
