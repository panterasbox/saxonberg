# Signalling — a hail is the act, not a target

> **Status: UNBUILT** — opened 2026-11-20 (owner, in the listing-resolution
> conversation: *"why isn't the act just the act"*).
> **Left:** everything — the visible emission at range (the horizon run
> backwards) · signalling instruments as goods · `hail` rebuilt as an
> emission · receivers that decide (the harbor office's watch, a crew,
> the sea's passers-by) · ashore signalling · the family (lighthouse, fog
> horn, a bell rung for a wreck, a gun) · the open questions below.
> **Size:** a build.

## Where this came from

The listing-resolution census found `hail`'s two hand-rolled matchers
(`Hailable.answersTo` by substring; `HailController`'s contact list by
substring) and first tried to give them an MQL home. The owner asked the
better question: `call` was rebuilt as **a noise you make** (its
controller's header records why — a targeted `call <animal>` let a mute
player call, a deaf animal hear and a shut door mean nothing), and the
targeting problem simply stopped existing. **`hail` is still in the old
shape** — the player picks a contact from a list the controller builds,
and hands it the message. It should be the same move.

⭐ The general lesson is recorded in the
[mql-anchors-slate](./mql-anchors-slate.md): *an MQL expression nobody
can resolve may be hiding content nobody modelled.*

## What `hail` does today

`HailController` (`platform/idea/cmd/social/HailController.ts`) — from
aboard a craft only:

1. the craft's frame names the places that answer a hail near her
   position (`Frame.hailables` → `HailableMixin` places — a harbor office
   inside the bar); a word one answers to (`hail office`, by substring of
   its hail name, or an exact keyword) reaches it, and its
   `answerHail(craft, caller)` replies (a berth at a named quay, or the
   roads and why);
2. else the sails in signal range (`Expanse.contactsFrom(craft, giver,
   'signal', hour)`) — real ships, or **seeded traffic** (the sea's
   deterministic field of passers-by, not Stuff) — by substring of the
   contact's name; a real ship's people are told, a passer-by "dips her
   colours in answer and stands on".

Signal range is `expanse.signalRangeNm`, regardless of height, and
*"a signal is heard and unaffected"* by weather (expanse.md) — though
flags are seen, not heard.

## The model: a hail is an emission

You **make a signal with something**; **whoever perceives it decides**.
The name you signal is content (the way the name you call is), and each
receiver asks *is that me?* by the shared naming rule.

| how | channel | range | what it needs |
|---|---|---|---|
| voice, a speaking trumpet | sound | close — alongside, across a harbor | the acoustic model `call`/`shout` use (`SoundSource`, `AudienceGather`) |
| a horn, a gun | sound | far; mostly *look at me* | the same, louder |
| flags by day, a lamp by night | **sight** | as far as somebody can see you | ⚠ **nothing yet** — a visible emission at range |
| radio (later epochs: *hailing on channel 16*) | the aether | anyone tuned | the aether build (`aether-devices.md`) |

- **A crew** seeing her name in your flags knows she is hailed, and
  answers.
- **The harbor office keeps a watch** on the water; whoever has the watch
  sees the signal, and the office answers in its own terms (a berth at a
  named quay; the roads, and why — the office shut, too little water over
  the bar for her draft until the flood).
- **Seeded traffic** is part of the sea's field: a passing collier that
  sees you dips her colours. The sea saw it, so nothing needs to be made
  queryable.
- **Ashore works for free** — a signal station on a headland flies its
  flags and the passing ship sees them. Nothing needs a deck.

## What is missing

1. **A visible emission at range — the horizon run backwards.** Sound has
   a full emission model; sight at range is pull-only (`horizonFor` is
   *you looking*; *"Pull, never push … push comes only from emitters that
   announce themselves"*, expanse.md). A flag or a lamp needs *whose
   horizon am I on*. The pieces exist: the visual-range formula
   (`1.17 (√h_obs + √h_tgt)` nm), eye height, the weather cutting sight
   (`expanse.visibility.<type>`), an unlit craft unseen by night
   (`Positioned.isLitByNight`), the kept skyline.
2. **Instruments as goods.** Signal flags (textiles, dye), a signal lamp
   (glass, oil — the energy pack's lamp oil), a horn, a speaking trumpet,
   a signal gun. Whether you can hail at night is whether you carry a
   lamp. Lens 6: a chandler sells them; lens 5: each epoch's instrument
   answers the same act.
3. **Receivers that decide.** The watch — the shipped `keeps-watch` brain
   (water pack) and `HorizonWatch` — is the natural receiver: a watch
   that perceives a signal is what makes an office or a crew answer. A
   place with nobody on watch does not answer.

## The family

The same emission model serves, with no new verb each: a **lighthouse**
(a light that announces itself, seen at range by night), a **fog horn**
(sound where sight fails), **a bell rung for a wreck**, **a gun** (a
salute, a distress signal, a harbor's noon gun), a **beacon fire**.

## Open questions

- **A code.** Real flags spell in a code (one flag a letter, hoists a
  phrase). Is the signal's content plain words, or a learnable code a
  `signalling` Discipline reads (lens 1 — a sailor who knows the code
  reads more, faster; one who does not sees *"a hoist of flags"*)?
- **Weather.** Flags are seen, so fog and rain should cut them (today a
  signal is "unaffected"); a horn is heard through fog — which is why fog
  horns exist.
- **Who may answer for a place** — the watch's holder, an NPC on shift
  (employment's call), or the office's own hook.
- **Radio** — in a later epoch, hailing is an aether act; does `hail` with
  a radio aboard become a `dm` to the vessel, or stay its own verb?

## What retires

`HailableMixin.answersTo` (substring), the contact substring match in
`HailController`, and the controller's target list — the receivers
decide. `Frame.hailables` becomes *who keeps a watch within sight*.

## Related

- [ships-and-harbors-slate](../trades/ships-and-harbors-slate.md),
  [harbor.md](../../subsystems/harbor.md), [expanse.md](../../subsystems/expanse.md)
  (§ Sight and traffic), [perception.md](../../subsystems/perception.md).
- [mql-anchors-slate](./mql-anchors-slate.md) — where this was found.
- `CallController` — the precedent: a call is a sound, and whatever hears
  it decides.
