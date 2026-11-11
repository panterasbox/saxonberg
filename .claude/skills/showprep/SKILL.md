---
name: showprep
description: Prepare the owner's weekly livestream — the week digest, the booking meeting, the assets and the rundown page. Use Thursday night through Friday, or when the owner types /showprep or asks to prep the show.
---

# Show prep

Read `docs/shows/README.md` first: it is the format, the posture and the process. This
skill runs the **Thursday-night digest**, the **Friday booking meeting** and the **asset
build**, and ends with the rundown page at `docs/shows/YYYY-MM-DD.md` (the show's
Saturday date).

## 1. The week digest (no input from the owner)

Gather what happened since the last show:

- `git log --merges --since="<last show date>" origin/master` — the merged MRs, by title;
- slates and docs changed in that window (`git diff --stat <since>..origin/master -- docs/`);
- the memory files touched this week (design conversations, decisions);
- `reddit-participation.md` and `docs/media-responses.md` entries since the last show.

Propose **2–3 candidates for each segment** of the rundown, one line each with why it clips.
Fit candidates to the segment's shape:

| segment | a good candidate |
|---|---|
| Cold open | a one-line surprise from the week |
| This Week | something shipped that can be **shown** in the game |
| The Real Science | a real-world fact a system models, checkable and sourced |
| The Fork | a decision with two honest sides and a lens that decided it |
| Live Design | an open question small enough to design in 20 minutes |
| Under the Hood | one architecture idea with code worth showing |
| Rotating slot | a media piece, a court case, or a playtest |
| Mailbag | questions gathered from chat, Reddit, Discord |

## 2. The booking meeting (with the owner, ~1 hour)

Present the candidates; the owner picks one per segment, or darks a segment. **Their pick is
final.** Record it.

## 3. The assets

For each booked segment:

- **Title card** — `docs/compact/manifesto/slide-generator.py`.
- **Diagrams** for the whiteboard, as SVG.
- **Illustrations** in the house style (`docs/subsystems/media.md`), only where they earn it.
- **This Week:** stage the demo scene in the game with the drive tooling; write the exact
  commands to run on air.
- **The Real Science:** a one-pager; verify every fact and figure against a source and cite
  it. Never ship an unverified number on air.
- **The Fork:** case cards, three points per side; mark which side the agent argues. Give
  the agent's side its strongest honest case — a straw man fails the posture.
- **Lower thirds** and **chapter titles**, one per segment, in rundown order.

Assets go to the folder Rodney serves to OBS (ask the owner for the path the first time and
record it in the README).

## 4. The rundown page

`docs/shows/YYYY-MM-DD.md`: for each segment, its time, its title, its cue card (**three
beats, never lines**), its assets and its chapter title. Darked segments are listed as dark.
Commit it on a design branch and merge it through GitLab like any design doc.

## The voice

Cue cards in the owner's tempo: short, plain, a hook first. The owner improvises from beats;
anything scripted gets in their way.
