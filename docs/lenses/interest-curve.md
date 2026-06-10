# Lens: The Interest Curve

> Part of the [design lenses](./README.md) set. Combines Schell's Lens
> of the Interest Curve and Lens of the Hook. Lenses named from *A Book
> of Lenses*; questions paraphrased, analysis our own.
>
> **Layer interrogated: the game** (the authored first-session arc).

## The lens

Plot the player's interest against time and you get a curve. A good one
opens with a *hook* — a spike that grabs attention before the player is
invested — settles a little, then rises through a series of ups and
downs to a peak near the end. The questions: what's my hook? Does
interest rise overall, or sag in the middle? Where are the peaks and
valleys, and are they where I want them?

> **From the book.** Schell's claim is that almost any well-shaped
> experience — a game, a story, a theme-park ride — traces the same
> curve, and that you can *draw* it and critique it like any other
> artifact. The hook matters disproportionately: you have to earn
> interest before you've earned trust, so the opening spike buys you the
> patience for everything after.[^aogd-icv]

## Why our design prompts it

Because the onboarding sequence is, almost literally, an authored
interest curve — and we have it beat-by-beat. The
[onboarding](../slates/onboarding-slate.md) /
[lounge](../slates/lounge-slate.md) /
[eternal-university](../slates/eternal-university-slate.md) arc is a
deliberate escalation, which means it can be plotted, critiqued, and
tuned exactly as this lens intends.

## What the design answers

Plotting the first-session curve:

- **Hook** — char-gen is fast and welcoming, then you spawn into the
  **lounge with people already there** and can talk immediately. The
  hook is *social presence*, not spectacle — you're somewhere, with
  others, instantly.
- **Rise to an early peak** — campus arrival lands **"you're in for
  anything"**: an unmistakable campus that announces it's "nowhere
  real." This is the awe spike, the world revealing its strangeness.
- **Sustained middle with variation** — the guided walk (signs, the
  greeter, Dr. Limen's voice), then a concrete novelty beat: installing
  a **demo augment** at the Health Center. Learn-by-doing keeps the
  middle from sagging.
- **Climax** — the **dorm room you author**, "the first thing you make
  that's yours." The session ends on agency and ownership.

The design also handles the lens's subtler demand well:
**first-login-only**. Returning players skip the scripted curve — you
don't replay a hook, and the lounge provides their (social) re-entry
beat instead.

## Tensions & risks

- **Two different peaks, and the big one comes early.** The *awe* peak
  (campus arrival) is front-loaded; the *agency* peak (dorm authoring)
  is the quieter, more personal close. That's a defensible inversion of
  the classic rise-to-biggest-spectacle curve — ending on ownership is
  emotionally right for a game about becoming — but it should be a
  *chosen* shape, not an accident, and the stretch between the two peaks
  has to not sag.
- **The handoff cliff.** This lens is about the *whole* experience;
  onboarding is one arc. What's the interest beat immediately *after*
  the dorm? If a beautifully-curved 20-minute onboarding drops into an
  undesigned "now what?", the curve cliffs at the worst moment — right
  after you've maximized investment. The post-onboarding curve (the
  ongoing game loop) is largely undesigned and is the real risk here.
- **Skippable means curve-less for the informed.** An informed player
  blows through the scripted beats, getting no authored curve. That's
  fine *if* the lounge hook works without the scripted spectacle — but
  it means the hook for veterans rests entirely on social presence, so
  that beat has to carry real weight.

## Implications

1. **Name the two peaks and design the span between them.** Awe at
   arrival, agency at the dorm — make the inversion deliberate, and
   ensure the guided-walk middle has enough variation (the demo augment
   is one beat; check there are enough) to hold interest across the
   stretch.
2. **Design the handoff, explicitly.** The single highest-leverage gap
   this lens exposes: the beat *after* dorm authoring. Onboarding must
   hand off to the game's ongoing interest curve, or it cliffs at peak
   investment. This is a real design task, not a detail.
3. **Validate the veteran hook.** Confirm the lounge social landing
   hooks returning players without the scripted beats — for them it's
   the *only* hook there is.
4. **Plot it for real.** This is the rare lens you can literally draw.
   Sketch the curve, mark the beats, and use it to find the sag — the
   doc has the beats; the curve is one diagram away.

---

[^aogd-icv]: Jesse Schell, *The Art of Game Design: A Book of Lenses*
    (CRC Press) — the **Lens of the Interest Curve** and the **Lens of
    the Hook**, from the chapter "Experiences Can Be Judged by Their
    Interest Curves." Cited by lens and chapter; page numbers omitted
    (edition-dependent).
