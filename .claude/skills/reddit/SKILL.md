---
name: reddit
description: Run a short Reddit pass for the owner (u/Bobalu_Smallberries) — scan fresh threads in our subreddits, draft one or two short comments in the owner's voice, post only on "post it", and check replies to earlier comments. Use when the owner types /reddit or asks for a Reddit pass. Runs in the local logged-in chrome-devtools browser; never a cloud job.
---

# Reddit pass

The owner builds Reddit karma by **contributing to conversations**, never
by promoting. A pass is meant to take a few minutes and a small slice of
tokens, so it can run daily. ⭐ **Karma comes from early comments in fresh
threads**: a comment in a thread's first few hours gets read; a comment a
day later does not. One good comment a pass is plenty. Bursts from a
low-karma account look like spam.

Read the memory file `reddit-participation.md` first: it holds the log of
what has been posted and the owner's latest feedback.

## The rules

- **Scope and posture:** the tiers below. ⛔ Not Claude or AI-coding
  subreddits, not roguelike subs, not venting or support subs, not
  partisan politics (civics yes, elections no), not AI pile-on threads,
  not showcase posts that only want feedback on someone's own project.
- **The test for a thread:** can we say something it is missing *because
  we had to model it*? Building a simulation forced us to decide how a
  system really works; that is the credential, not expertise in the
  subject.
- **Value carries tone.** If a reader spots the AI help and still walks
  away with something useful, that is a win. The owner does not hide the
  help, but the comment must be worth reading.
- **Only where the comment is relevant.** Read the post and the top
  comments first. Say plainly when a thread is not worth it.
- **The voice:** short, one point, the owner's tempo. Plain and casual,
  no tidy lists of three, no summary line at the end. Around 50–100
  words. The owner does not hide that an agent helps, but the comment
  must sound like them.
- **Say something the thread has not said.** Draw on the design docs
  (moderation, prison, magic, economy, the Compact, the bestiary …) for
  the angle, and verify any figure against the doc.
- **No links in a first comment.** A link comes only in a second comment,
  once someone has engaged, and only to our own docs.
- ⛔ **Post only when the owner says "post it"** (or approves a specific
  draft). Never post, vote, reply or message on your own.
- ⛔ Never suggest the owner's comment be dressed up as anything it is not
  (no fake personal anecdotes, no claimed credentials).

## The tiers, and two postures

| tier | posture | subreddits |
|---|---|---|
| **Home** | answer | MUD, gamedesign, RPGdesign, truegaming, worldbuilding, magicbuilding, MMORPG |
| **Audience** | answer, and watch for openings | dwarffortress, RimWorld, paradoxplaza, CrusaderKings, CitiesSkylines |
| **Ideas** | answer, carefully | GAMETHEORY, PoliticalScience, edtech, instructionaldesign, education, typescript (architecture questions only) |
| **Trades** | **ask only** | chosen from what we are designing that week: nursing, Beekeeping, Blacksmith, Homebrewing, Sourdough, Pottery, farming … |
| **Openings** | answer, a link allowed | "looking for a game like…" posts in MUD, gamingsuggestions, MMORPG |

- **Answer mode** (Home, Audience, Ideas): give a design take the thread
  lacks.
- **Ask mode** (Trades): a game designer answering nurses is slop; asking
  them a sharp question is a gift. Only when our design genuinely needs
  the answer, and say plainly what it is for: *"I'm building a sim where
  an untreated wound gets worse. What do new nurses most often get wrong
  about triage, the thing you'd want a game to teach?"* The owner names
  the week's design topic, or the pass skips this tier.
- **Openings:** someone asking for a game like ours is the one place a
  first comment may carry a link, because they asked. Check the
  subreddit's rules on self-promotion first.
- ⭐ The Audience tier is where the players are: everything-sim and
  politics-sim fans. *"Like Dwarf Fortress, but multiplayer, and the
  players run the government"* is a pitch they would hear, but only in an
  Openings thread or when someone asks.

### Architecture threads are in scope

Most of the week's work is systems architecture, and the synthesis has no
forum, so **give each community the one slice it cares about** (the
stream and the site carry the whole):

- **MUD builders:** "the world is inspectable and programmable from
  inside" is LPMud's and MOO's founding idea; we are that tradition with
  modern tooling (typed code, call-security, generated docs, content
  packs). r/MUD's Building & Design threads are ours.
- **Modders:** RimWorld and Factorio modders reverse-engineer and patch a
  closed codebase; content packs as the platform's front door, not a
  hack, is a point they feel. Watch the modding threads in the Audience
  tier.
- **r/typescript:** worked answers to real questions (typing a mixin
  factory so narrowing works, Proxy-based call security, sealing a
  method with a decorator). We did not invent the patterns; share the
  solution, not a pitch.
- **Usability is game design too:** how a text game's command vocabulary
  scales to hundreds of verbs without collisions is a real question, and
  the verb-collision ladder is an unusual answer.

## Be a good citizen: a light footprint

The owner: *"I don't want to pile too much onto the browser session, they
probably have bot detection and even if they don't I just wanna be a good
citizen here."*

- **At most about 8 page loads to scout a pass**, paced **4–5 seconds**
  apart, plus only the threads actually read.
- **Rotate by weekday.** Every pass scouts the Home tier's 3 busiest
  (gamedesign, MUD, worldbuilding) plus that day's rotation:

  | day | rotation |
  |---|---|
  | Mon | RPGdesign, truegaming, MMORPG |
  | Tue | dwarffortress, RimWorld |
  | Wed | GAMETHEORY, PoliticalScience, typescript |
  | Thu | paradoxplaza, CrusaderKings, CitiesSkylines |
  | Fri | magicbuilding, edtech, instructionaldesign |
  | Sat | gamingsuggestions (Openings), MMORPG |
  | Sun | Trades, only if the owner names a topic; else RPGdesign, truegaming |

- No votes, no follows, no subscribing, no clicking around: read, draft,
  and post only what the owner approved.
- If Reddit starts refusing pages, stop the pass and say so. Never work
  around a block.

## The pass

### 0. The browser

- Use the chrome-devtools MCP. **Check whether it is already logged in
  before asking the owner to log in** (`list_pages`, then look for the
  user menu or read `u/` on the page).
- If `new_page` fails because the profile is locked, another window's
  MCP server holds the browser. Ask the owner before closing it, unless
  they have said the other agents are done with it.
- ⚠ Reddit refuses `.json` endpoints (403) after a few scripted fetches.
  **Read the page DOM instead**, and pace requests 4–5 seconds
  apart.

### 1. Replies first

Open `https://www.reddit.com/user/Bobalu_Smallberries/comments/` and
check each recent comment for replies and score. A reply is a
conversation to continue, and it is where a second comment with a link
can go. Report any reply before scouting.

### 2. Scout

For the Home three plus the day's rotation, fetch `https://www.reddit.com/r/<sub>/new/`
and read the server-rendered posts:

```js
async () => {
  const rotation = {1:["RPGdesign","truegaming","MMORPG"], 2:["dwarffortress","RimWorld"],
    3:["GAMETHEORY","PoliticalScience","typescript"], 4:["paradoxplaza","CrusaderKings","CitiesSkylines"],
    5:["magicbuilding","edtech","instructionaldesign"], 6:["gamingsuggestions","MMORPG"],
    0:["RPGdesign","truegaming"]};
  const subs = ["gamedesign","MUD","worldbuilding", ...rotation[new Date().getDay()]];
  const out = {}; const now = Date.now();
  for (const s of subs) {
    await new Promise(r => setTimeout(r, 4500));
    const r = await fetch(`https://www.reddit.com/r/${s}/new/`, {credentials: 'include'});
    if (r.status !== 200) { out[s] = {status: r.status}; break; }
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    out[s] = [...doc.querySelectorAll('shreddit-post')].map(p => ({
      t: p.getAttribute('post-title')?.slice(0, 100),
      n: +p.getAttribute('comment-count'),
      ageH: Math.round((now - Date.parse(p.getAttribute('created-timestamp'))) / 36e5 * 10) / 10,
      link: p.getAttribute('permalink'),
    })).filter(p => p.ageH <= 12);
  }
  return out;
}
```

Keep threads **under about 6 hours old** (12 at most) that are
discussions, not promotions or help requests we cannot answer, and any
"looking for a game like…" post (an Openings thread, whatever its
subreddit). Pick the 2–3 best. On Sunday, if the owner named a design
topic, find one Trades thread worth a question instead.

### 3. Read the candidates

Comments load lazily: `navigate_page` to the thread, wait ~3 seconds,
then read the post body (`shreddit-post [slot="text-body"]`) and the
comments (`shreddit-comment`: `author`, `depth`, `[slot="comment"]`).
Note whether the original poster is replying, since an active poster
means a live thread.

### 4. Draft

One or two drafts, each under the voice rules, with one line on why the
thread and what angle the thread is missing. List what was skipped and
why in a line each.

### 5. Post on "post it"

1. `navigate_page` to the thread; take a snapshot to a file in the
   scratchpad and find the comment box (`textbox multiline` under the
   post's action bar).
2. `click` it, take a fresh snapshot, then `type_text` paragraph by
   paragraph, pressing `Enter` between them (a blank line appears).
3. Read the box back with `document.activeElement.innerText` and check it
   matches the approved draft exactly.
4. Click **Comment**, wait ~4 seconds, and confirm a `shreddit-comment`
   by `Bobalu_Smallberries` is on the page. Report its permalink.

### 6. Record

Append to `reddit-participation.md`: the date, the subreddit, the
thread, the comment's id, its point in a phrase, and any feedback the
owner gave on the draft.
