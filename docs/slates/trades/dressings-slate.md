# Dressings — a bandage that stays on, soaks through, and is changed

> **Status: UNBUILT · opened 2026-10-18 from the cleanliness MR review (!380).**
> **Left:** the dressing as a covering ON the wound · care derived from the
> dressing's state, not stored · weeping wounds soil it over days · when it
> is changed and who notices · the nurse's round.
> **Size:** a tail (of harm + blood + cleanliness).

## What ships (cleanliness, !380)

- `treat <wound> with <bandage>` **consumes** the bandage
  (`StuffApi.destruct`) and writes a `careQuality` onto the wound once. There
  is no dressing ON anybody, so nothing soaks through and nothing is ever
  changed.
- The dressing's quality at the moment of treatment IS its clean tier (raw
  0.3, washed 0.6, sanitised 0.8, boiled 1); sepsis seeds from the worst of
  the hands, the dressing short of disinfected, the instrument (D14, B23).
  A competent nurse boils a raw bandage first.
- ⭐ An external bleed **stains** what covers the wound (B44): the innermost
  layer at the site (the skin when bare), with the bleeder's own blood, and
  a heavy bleed drips on the floor. So the pieces a dressing needs to be a
  real covering already exist.

## The design to build

1. **The dressing stays.** Applying a bandage puts it ON the wound's body
   part as its innermost covering — a `Bandage` is already Soilable and has
   a clean tier — instead of destroying it. Removing it is `remove`
   (carefully, gloved: the doffing rule already moves what is on a dirty
   thing to the hands that pull it).
2. **Care is derived, never stored.** The wound's care reads the dressing
   it is under NOW — its tier and its soil band — so a dressing that soaks
   through stops protecting, and a filthy one starts seeding infection. The
   stored `careQuality` goes.
3. **What soils it.** A bleed under it (the B44 deposit lands on it first —
   it is the innermost layer); a WEEPING wound — a burn or a caustic
   injury's exudate, which shipped as plasma loss and lands nowhere today;
   time open to the room (dust, the hands that touch it).
4. **When to change it** — derived: when its band reaches *soiled*, or on
   the follow-up date medicine already writes to the patient's calendar
   (`assess` never leaks it). The loop: off carefully, boil it or a fresh
   one, re-dress; the boil pot, the laundry and the clinic all get work.
5. **The nurse's round** — the nurses brain checks each patient's dressing
   and changes a soiled one (it already boils a raw bandage).

## Lens notes

- **1 pedagogy** — the daily dressing change is the actual practice; a
  soaked dressing being worse than none is the lesson.
- **3a immersion** — a bandage that vanishes on application is the fiction
  betraying itself.
- **6 economy** — bandages become a consumable a clinic RE-USES (boiled) or
  buys new; the laundry and the boil pot are its sinks.

## Related

`docs/subsystems/harm.md` (the medic vertical), `blood.md`,
`cleanliness.md` (§ The clean tiers; the bleeding stain).
