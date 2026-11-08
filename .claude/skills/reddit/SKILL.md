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

- **Scope:** games (MUDs, MMOs, RPGs, game design, worldbuilding,
  magic systems) and education / learning science. ⛔ Not Claude or
  AI-coding subreddits. ⛔ Not roguelikes.
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

## The pass

### 0. The browser

- Use the chrome-devtools MCP. **Check whether it is already logged in
  before asking the owner to log in** (`list_pages`, then look for the
  user menu or read `u/` on the page).
- If `new_page` fails because the profile is locked, another window's
  MCP server holds the browser. Ask the owner before closing it, unless
  they have said the other agents are done with it.
- ⚠ Reddit refuses `.json` endpoints (403) after a few scripted fetches.
  **Read the page DOM instead**, and pace requests about 2–3 seconds
  apart.

### 1. Replies first

Open `https://www.reddit.com/user/Bobalu_Smallberries/comments/` and
check each recent comment for replies and score. A reply is a
conversation to continue, and it is where a second comment with a link
can go. Report any reply before scouting.

### 2. Scout

For each subreddit in the list, fetch `https://www.reddit.com/r/<sub>/new/`
and read the server-rendered posts:

```js
async () => {
  const subs = ["MUD","MMORPG","gamedesign","RPGdesign","worldbuilding",
                "magicbuilding","truegaming","edtech","instructionaldesign"];
  const out = {};
  for (const s of subs) {
    await new Promise(r => setTimeout(r, 2500));
    const html = await (await fetch(`https://www.reddit.com/r/${s}/new/`,
                                     {credentials: 'include'})).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    out[s] = [...doc.querySelectorAll('shreddit-post')].map(p => ({
      t: p.getAttribute('post-title')?.slice(0, 100),
      n: +p.getAttribute('comment-count'),
      sc: +p.getAttribute('score'),
      at: p.getAttribute('created-timestamp'),
      link: p.getAttribute('permalink'),
    }));
  }
  return out;
}
```

Keep threads **under about 6 hours old** (12 at most) that are
discussions, not promotions or help requests we cannot answer. Pick the
2–3 best.

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
