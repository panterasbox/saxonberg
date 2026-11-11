# The show — format and weekly process

The weekly livestream: **Bobalu Smallberries**, founder of **Pantera's Box**, home of
**Saxonberg**. Three distinct layers: the person and the show · the org · the project.
Saturdays, 10 a.m. (tentative), about two hours, on Twitch and YouTube
([broadcast-ready-slate](../slates/builds/broadcast-ready-slate.md) for the tooling).

Weekly rundowns live beside this file as `YYYY-MM-DD.md`.

## Why the show exists **[DECIDED 2026-11-11 — the owner]**

*"I also have zero interest in being a full time livestreamer, this is merely a way for me
to make content for the project and this is the medium I feel I'm strongest in. the
livestream is a way to funnel people into the platform as well which includes its funding
model."*

- **It is a recording session that happens to be live.** Starting from zero audience at a
  low-traffic hour, nearly everyone will meet the show through **clips on YouTube**. Design
  for the clips; the live chat is a bonus.
- **The owner's style:** a degree in Film and TV, improvisational comedy on stage, and
  speech and debate in high school. *"the show should follow a strict format just so it's
  easy to slot things into place and I know what to expect from week to week without having
  to hyperscrutinize all the content."* So the structure is fixed, the content improvised:
  long-form improv's shape, extemp's prepared case, television's rundown.

## ⭐⭐⭐ The posture: unapologetically AI-built **[DECIDED — the owner]**

*"this project is unapologetically AI built, almost to an 'in your face' degree. from the
creation of the git repo we've used claude for everything, the entire human interface for
the game is also the AI interface … all the pedagogy and the real systems, none of that could
have been built without AI. I'm just not that smart or knowledgeable about every single domain
this game touches. No one is. So you'd need either a massive org designing the thing, or one
guy with AI. There really is no in between, this game is a game that could have only been
made with AI. Maybe the first of its kind … So if the livestream inherits that posture, I'm
totally okay with it."*

- **The AI is in the cast, not hidden in the production.** The agent appears on screen as
  the owner's debate opponent (The Fork) and scene partner (Live Design).
- **The answer to "AI slop" is receipts, not apology.** Show the rigor: the lenses, the
  verified figures, the real science, the agent corrected on air. Every commit is co-authored
  by Claude; the show leans into it.
- **The claim, phrased so it holds:** *this game could only have been made with an AI or a
  massive org.* "First of its kind" is said as *maybe*.

## The rundown — fixed every week

| time | segment | what fills it | clips as |
|---|---|---|---|
| 0:00 | **Pre-show** | standby screen, music, warm-up | not clipped |
| 0:05 | **Cold open** | the week's one-line hook, a 60-second bit | a Short |
| 0:07 | **This Week** | what shipped, demoed in the game (a staged scene) | devlog clip |
| 0:20 | **The Real Science** | one real-world fact behind a system, sourced | Shorts + a long clip |
| 0:32 | ⭐ **The Fork** | one design decision, **argued both sides: the owner against the agent**, case cards, rebuttals, then the verdict and which lens decided it | the signature segment |
| 0:45 | **Break** | standby or b-roll | not clipped |
| 0:50 | **Live Design** | improv's *"can I get a suggestion"*: a prompt from chat, Reddit or the backlog, designed live with the agent while the whiteboard draws | long clip |
| 1:10 | **Under the Hood** | one architecture idea, code on screen | developer clip |
| 1:22 | **The Rotating Slot** | In the News ([media-responses.md](../media-responses.md)) · Court Day ([moderation § 14a](../slates/builds/moderation-slate.md), once a realm runs) · Playtest | varies |
| 1:30 | **Mailbag** | questions from chat, Reddit, Discord | grab bag |
| 1:40 | **Close** | callbacks to the cold open, next week's tease, the offering's status when one is open ([giving-slate § Offerings](../slates/builds/giving-slate.md)) | not clipped |

**The rules:**

- **Any segment may go dark; the order never changes.** Nothing for Under the Hood this week
  means it is skipped, not reshuffled.
- **Every segment has one shape:** a hook in the first fifteen seconds, one idea, the payoff
  visible on screen. A segment that needs "as I said earlier" will not clip.
- **Long clips run 8–12 minutes; Shorts 30–60 seconds**, cut from inside a segment, one per
  segment where possible.
- **The callback close:** return to the cold open's bit at the end.
- **Cue cards, never a script:** three beats per segment.

## The weekly process

| when | who | what |
|---|---|---|
| **Thursday night** | the agent | **The week digest:** merged MRs, slates, design conversations, Reddit and media notes → 2–3 candidates per segment |
| **Friday** (the owner works from home) | together, ~1 hour | **The booking meeting:** the owner picks one item per segment |
| **Friday after** | the agent | **The assets** (below), and the rundown page `docs/shows/YYYY-MM-DD.md` |
| **Saturday** | the owner | **The show.** One chapter button per segment |
| **After the show** | the agent | **Post:** YouTube chapter timestamps, a Descript cut list, clip titles, descriptions and thumbnail text, Shorts candidates, notes back into the docs |
| **After that** | the owner | **The edit** in Descript |

`/showprep` runs Thursday night through Friday; `/showpost` runs after the show.

### The assets, per segment

- a **title card** ([slide-generator.py](../compact/manifesto/slide-generator.py), the
  manifesto videos' generator);
- **diagrams** pre-drawn for the whiteboard;
- **illustrations** in the house style ([media.md](../subsystems/media.md));
- This Week: a **staged demo scene** in the game, set with the drive tooling;
- The Real Science: a **one-pager**, every fact verified and sourced;
- The Fork: **case cards**, three points for each side, the agent's side marked;
- the **lower-third text** and the **chapter titles**, preloaded so the chapter button
  advances to the next segment.

## Tooling owed **[LEAN — builds, not yet slated]**

- **The chapter command:** one act records the timestamp, updates the lower third, drops a
  Twitch stream marker, and appends to the chapter log, which becomes the YouTube chapters
  and the cut list. A Stream Deck button through pblive.
- **The whiteboard:** a browser source (served by Rodney) that renders whatever the agent
  writes to it, so diagrams draw live on stream.
- **Local recording with separate tracks** (screen and camera; OBS's Source Record plugin),
  so reframing for vertical Shorts is easy.
- **Editing:** Descript stays the editor. An auto-clipper (Opus Clip, Vizard, Eklipse) is a
  second opinion for Shorts; the chapter log drives the cuts. Check the tools' current state
  before adopting one; the market moves fast.
