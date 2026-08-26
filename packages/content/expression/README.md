# expression

The starter emote roster — the `emote` document kind, one file per verb
under `content/emotes/<verb>.yaml`, installed at `/expression/emotes/<verb>`
(owned by the pack root `/expression`, stamped `sourcePack: expression`).

One Liquid template per emote; slot kinds = `stuff` (MQL-resolved at
scope `'online'`) or `free` (raw text). The bare emote with no target is
the default register; the target / manner clauses extend it via Liquid
conditionals. `searchTerms` are catalogue lookup words for `soul search`
— they never dispatch (`;hi` does nothing; `soul search hi` finds `greet`).

The basename IS the key: a file whose `verb:` disagrees with its name
fails the pack at `read`. Edits an author makes with `soul edit` are kept
by the three-way reconcile (`kept`); a changed pack file over an
unchanged row updates silently; both changed is a conflict for
`pack diff` / `pack resolve`.

## Roster by section

- **Greetings** — wave, bow, nod, salute, greet
- **Joy / approval** — smile, laugh, grin, cheer, clap, applaud
- **Displeasure** — frown, scowl, glare, sigh, groan, cry
- **Surprise / startle** — gasp, blink, stare, shrug
- **Playful** — wink, poke, hug, kiss, dance, spin
- **Abstraction / agreement** — agree, disagree, ponder, think, smirk, yawn, chuckle
