# Deep links slate — a link carries an intent, never a command

> **Status: UNBUILT** — designed at high level 2026-10-26 with the owner. What ships: `watch`
> (a stream's video in the focal embed) and the cockpit's `watch` mode with its **viewer**
> arrangement ([streaming.md](../../subsystems/streaming.md),
> [cockpit.md](../../subsystems/cockpit.md)); the anonymous guest, one button from the front door
> ([client-shell.md](../../subsystems/client-shell.md)); sign in with Twitch and Kick. No link
> into the game exists.
> **Left:** the intent route and its closed set · the confirm card · link-only argument rules
> (watch targets limited to registered streamers) · arriving signed out (guest, or sign in with
> Twitch) · link previews · the later intents (visit, join, read, claim, invite, open a card)
> **Size:** a build — small; the watch intent first

## 0. The ask **[DECIDED — the owner]**

*"We're gonna need a way to hot-link someone to the game that will automatically put them in
'livestream viewer' mode or whatever and tune into the specified livestream from the link.
There's probably other applications too, but that's the one I'm concerned about right now. Maybe
prompt them first, to prevent malicious people sending links that run arbitrary commands."*

## 1. ⭐⭐⭐ Intents, never commands **[DECIDED — the owner]**

A link that runs arbitrary commands is a classic attack — *"click to see my stream"* that really
runs `give all to scammer`. So:

- **A link names one of a small, closed set of intents**, and each intent has a handler on the
  server that checks its own arguments. **A URL never holds a command.**
  - `/go/watch/bobalu` → the **watch** intent, for the streamer *bobalu*.
- **It always shows a confirm card first** — *"This link wants to put you in viewer mode and watch
  Bobalu. [Watch] [No thanks]"*. A purely read-only intent may later skip it; the prompt is the
  default.
- ⭐ **Arguments from a link are stricter than typed ones** — a watch target from a link must be a
  **registered streamer** ([streamer registry](./streamer-registry-slate.md)); otherwise a link
  could frame any video or site inside our client, which is phishing with our name on it. `watch`
  typed by hand stays open.

## 2. ⭐⭐ Arriving signed out **[DECIDED — the owner]**

The front door offers the lowest-friction path:

- ⭐ **watch as a guest** — at once, nothing to create;
- **sign in with Twitch** — which also links the account the [giving slate](./giving-slate.md)
  attributes subs to: the *claim your standing* pitch of the stream's lower third
  ([broadcast-ready](./broadcast-ready-slate.md)) lives here.

## 3. Link previews **[DECIDED]**

The watch page carries link-preview tags, so wherever someone pastes it — Discord included — it
previews as *"Bobalu is live in Saxonberg"*, with the stream's thumbnail.

## 4. The intents to come **[LEAN]**

| intent | does |
|---|---|
| **watch** | viewer mode on a registered streamer — first |
| visit | open a place's card, or travel there where that is free |
| join | a public channel |
| read | a release or a forum thread |
| ⭐ claim | attribute held patronage to the signed-in account (the giving slate) |
| invite | accept a party or guild invitation |
| ⭐ open a card | a pop-out card is a link to one card ([card-ux-brief](../../card-ux-brief.md) § 4) — the same mechanism |

## 5. The lens pass

1. **Pedagogy** — none.
2. **Expression** — any streamer can hand out a link to their world.
3. **Immersion** — the link lands you in the world, not on a web page. **Participation** — the
   viewer becomes a guest becomes a player.
4. **Values** — no command in a URL; consent before every change; no foreign frame in our client.
5. **Continuity** — the same intents serve the web, Discord and the Steam client.
6. **Economy** — the funnel from a stream to the world, and to claimed standing.
7. **Governance** — none.

## 6. Open

1. **Which intents may skip the confirm card.**
2. **The URL shape** — `/go/<intent>/<arg>`, or another.
3. **Guest limits** — what a guest arriving by link may do beyond watching (chat? reactions?).
