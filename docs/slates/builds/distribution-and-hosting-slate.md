# Distribution & hosting slate — Steam, self-hosting, and the managed realm

> **Status: UNBUILT** — designed at high level 2026-10-19 with the owner, out of
> a question about discovery (*"it might be very hard for general audiences to
> discover this game"*). Production is one box running `docker compose` against
> Mongo Atlas, sign-in is Google only, and the web client is the only client.
> **Left:** the Steam client (an Electron shell over the same bundle) · Steam
> sign-in on the server · the realm directory in the client's front door · a
> self-hosting container (Mongo inside, local sign-in, optional integrations off)
> · a free local-server tool app on Steam · ⭐⭐ **realm portability** (export and
> import of realm STATE, which ends the drop-the-database doctrine) · the live
> changelog from git into the press ticker · Valve's policy checks
> **Size:** a build program — several builds; the order is § 9

## 0. The frame

The owner wants to run a community of their own on the platform — *"use the game
to do it. eat our own dogfood"* — and possibly to let the client choose among
*"a central directory of games that are running some version of the platform …
whether ours is there or not."* Steam is the channel: *"steam is a great platform
for getting your game out there especially if its really niche like ours is
gonna be."*

## 1. ⭐⭐ The business is managed hosting **[DECIDED — already documented]**

[platform-business-model.md](../../study-com/platform-business-model.md) § 2
names it: **managed operations** — the copyright holder runs the infrastructure
and updates, a community brings its capital, labor and users. The owner,
2026-10-19: *"me set up shop on aws or whatever running servers for people at
the cost of the hosting plus markup for my labor … most people don't have the
resiliency in their environment that a game like this demands. so they'll pay
someone to manage it and who better than the person who created the platform."*

Everything in this slate serves that: Steam is discovery, self-hosting is the
on-ramp, portability is what makes the managed offer trustworthy.

## 2. Steam: price and Early Access **[DECIDED]**

- ⭐ **Early Access, for a very long time** (*"it'd be EA for a very very long
  time"*). Long Early Access is accepted on Steam; what reviewers punish is one
  that stops changing. The changelog (§ 8) is the proof of motion.
- **A small price, $2–5, not free-to-play** (*"FTP has such a stink on it"*).
  ⭐ It also puts a price on throwaway accounts, and a world governed by the
  Compact — earned standing, votes that count — is where throwaway accounts do
  the most harm (lens 7). **The web client stays free**: the price buys the
  Steam packaging, never the engine, which keeps faith with the AGPL.
- ⚠ **Population before listing.** An empty multiplayer world gets reviewed as
  dead, permanently. The community runs on the web first; Steam comes when it
  can hold a population.

## 3. The Steam client — packaging, not a fork **[LEAN]**

- **Electron over the same Vite bundle.** The web client stays the source of
  truth; the desktop build is a shell (Chromium + Node, ~100–150 MB). Steam
  carries distribution and updates. `steamworks.js` for the bindings. Tauri is
  lighter but has the less-trodden road to Steam.
- ⭐ **Sign-in is the server's work.** Google refuses OAuth inside an embedded
  browser, and a Steam player expects to be signed in already. The server gains
  a Steam provider: the client presents a session ticket, the server validates
  it with Valve, and the account links like any other provider.
- **The overlay** has historically been unreliable over Electron's renderer;
  optional, but noticed when missing.

## 4. ⭐ The realm directory **[LEAN]**

One Steam app named for the platform, whose **front door lists realms** — ours
the default, *connect to another realm* beside it. Server browsers are ordinary
on Steam, and it makes the listing the platform's storefront, not one game's.

- ⚠ **Listed, not discovered.** A realm Valve objects to can cost the whole
  listing, so the directory is **opt-in against a published standard** (the
  Compact's content rules are the natural one). Managed realms meet it by being
  managed.
- **Version compatibility** — a realm advertises its platform version and packs;
  the client says plainly when it cannot connect.
- Lens 3b's question — *can the polity do something we did not want?* — applies
  to the directory itself: who removes a listed realm, on what criterion, with
  what appeal (lens 7). **Open.**

## 5. Self-hosting — the container **[LEAN]**

Production already runs `docker compose` (`deploy/prod/`), and local config is
already `.env`, so most of the container exists. What a stranger would hit:

- **Mongo inside the compose file**, not Atlas.
- ⭐ **Sign-in a home server controls** — today every self-hoster would have to
  register their own Google OAuth app. A local account option, plus Steam
  tickets for the Steam build.
- **Optional integrations off cleanly when no keys are given** — image
  generation (already an authoring tool, not a runtime service:
  [content-packs-slate](./content-packs-slate.md) *packs ship bytes and
  receipts*), the streaming transports, anything external.
- **Backups and upgrades a hobbyist can run** — and the honest statement of what
  they do not get (the resiliency the managed service sells).

## 6. The local-server tool app **[LEAN]**

A **free "Dedicated Server" app in Steam's Tools library** — an established
pattern. It is the on-ramp the owner named (*"could even be an on ramp to a more
market-driven solution for them instead"*): ⭐ one button, **move my realm to
managed hosting**, which is § 7.

## 7. ⭐⭐⭐ Realm portability — the thing everything else needs **[DECIDED in shape]**

**Export and import of a realm's state**, as one artifact. It pays three times:

1. **Upgrades without wipes** — the platform's own releases.
2. **Self-hosted → managed**, the on-ramp of § 6.
3. ⭐ **Managed → anywhere.** Being able to leave is what makes the managed offer
   trustworthy for an AGPL project.

What moves is **only realm state**, because the pack/realm line already carries
the rest ([pack-vs-realm boundary](../../subsystems/content-packs.md): a pack
ships creative output, never state). Content — including what a player authored
and merged through git — is versioned and reconciled by the pack installer
already. The portable set is characters, holdings and parcels, the bank ledger,
chattel and where things sit, the records.

⚠ **This is not federation.** The [antecedents slate](./antecedents-slate.md)
Phase B says the ledger, parcels and standing **never** cross between instances
— *"importing them is counterfeiting."* That holds between **different
sovereigns**. A realm moving hosts is **the same sovereign**, and everything
moves. The export must carry the realm's identity so the two cases cannot be
confused.

⭐⭐ **It ends the drop-the-database doctrine.** *No migrations ever* is right
while there are no players. When the community opens — not when Steam does —
realm state must survive releases: **announced, scheduled wipes for early
Early Access** (predictable wipes are an accepted contract), then real
migrations once the world holds what people would be angry to lose.

## 8. The live changelog **[DECIDED]**

The owner: *"we're gonna hook right into git (and possibly gitlab) so we're
constantly aware about how content is shifting, being added, removed, etc as it
happens in real time. that's something players can watch too as well as just
being able to participate in the compact."*

A merged change already carries who authored it (provenance), what it touched
(its pack) and whom it credits (the standing mint). Rendered through the
[press](../../subsystems/press.md) ticker, it is the patch notes **in the
fiction's own channel** — *"a brickfield opened in the Delight valley; the
Compact ratified the customs schedule"* — and watching the world change and
taking part in the Compact become one activity. On Steam the same stream feeds
the store page's announcements, which is what makes a long Early Access visibly
alive.

## 9. Order

1. **The community on the web** — dogfood; the population exists first.
2. **Realm portability + the end of drop-the-database** (§ 7) — needed the day
   real players exist, Steam or not.
3. **The live changelog** (§ 8).
4. **The self-hosting container** (§ 5).
5. **Steam sign-in + the Electron client** (§ 3), listed as Early Access.
6. **The realm directory** (§ 4) and **the local-server tool app** (§ 6).

## 10. Lens pass

1. **Pedagogy** — none directly; it widens who reaches the Disciplines.
2. **Expression** — every realm is an author's work; the directory makes a
   community's world findable; a self-hosted realm is the fullest bespoke case.
3. **Immersion** — the changelog stays in the fiction. **Participation** —
   watching content land beside the Compact that governs it.
4. **Values** — paid against free (decided: a small price, web free); openness
   against the listing's survival (the directory standard).
5. **Continuity** — a realm survives its host and the platform's releases; that
   is portability.
6. **Economy** — managed hosting is the revenue; the Steam price is packaging;
   the local server is the funnel.
7. **Governance** — who delists a realm, by what criterion, with what appeal;
   the price as a check on throwaway accounts.

## 11. Open

1. **Valve's purchase rule.** Valve generally requires in-game purchases to go
   through Steam's wallet. Check where *giving is the first act of play* —
   donations through the streaming platforms — falls before listing.
2. **AI-generated content disclosure** — Steam requires it, including content
   made during play; the image pipeline counts.
3. **Player-made content** — the store page states the Compact as the answer.
4. **The directory's governance** (§ 4) — who decides, how a realm appeals.
5. **Managed-hosting pricing and tiers** — the hosting cost plus labor; what a
   tier buys (backups, uptime, upgrades, support).
6. **The dual license** (platform-business-model § 3) — counsel before any deal.
