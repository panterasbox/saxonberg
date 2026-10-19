# The Washer at the Ford — folklore over the dying clock

> **Status: UNBUILT · CUT from the cleanliness build 2026-10-17 (user).**
> **Left:** whom she names (the dying now, or the recently dead) · the index
> of who is dying · how she says it.
> **Size:** a tail (of mortality + npc-dialogue).

Out of the cleanliness requirements (§ 17, cut at planning; retired with
the build — [cleanliness.md](../../subsystems/cleanliness.md) is the live doc).

## The idea

The *bean-nighe* of Scottish and Irish folklore: at a ford at night a woman
washes a bloodstained shroud, and if you ask her whose it is she names the
person about to die. Here it would be true by mechanism. At the Delight
Road ford she names **someone who is dying right now**, anywhere in the
realm; if nobody is, she is washing nothing. ⭐ It is lens 2's bespoke case:
content over a mechanism that already exists, with no code of its own.

## Why it was cut (what planning found)

- **The dying state is minutes long.** `Vitals.beginDying` opens a
  90–600 s window ([mortality.md](../../subsystems/mortality.md)), so on
  almost every visit she would be washing nothing.
- **Nothing indexes who is dying.** The only realm-wide read is
  `StuffApi.findByMixin`, which covers loaded bodies only and is gated behind
  the `RegistryWideReaders` ratchet. Load-on-use wants a maintained index
  instead: add at `beginDying`, drop at stabilise, relieve or die.
- **Dialogue has no dynamic text.** Tree-dialogue `say` lines are static.
  Naming someone needs a `DialogueEffectRegistry` effect (the
  `bank-circle` precedent in `BankCounter.ts`) or a witness brain.

## Open

1. **Whom she names.** The dying now (rare and uncanny), or failing that the
   recently dead (frequent, but mourning instead of foretelling).
2. **The index.** It has a second consumer in waiting (a medic's *who needs
   me*, a priest's last rites), which is the argument for building it as
   mortality substrate rather than as hers.
3. **The ford needs water** you can see, if she washes in it. The Delight
   Road ford has no drawable water today (cleanliness grounding).
