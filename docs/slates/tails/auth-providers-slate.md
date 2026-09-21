# Auth providers & account linking slate (working doc)

> **Status: PARTIAL** — Waves 1+2 shipped and grown beyond the original
> proposal: Google, Twitch **and Kick** are co-equal login providers
> (three FK fields, not the two this slate designed for), token
> encryption, link/unlink with collision-refusal, and — beyond this
> slate's own scope — incremental chat-scope reauth all shipped →
> [connection.md](../../subsystems/connection.md) § The Cast, § Phase 1
> **Left:** account merge · provider-side token revocation · YouTube as
> a linkable/login provider (a `@`-seed still rejects
> `character-youtube`) · LLM name-refraction
> **Size:** a tail

The original proposal generalized the Google-only auth spine into a
multi-provider one and added `TwitchProfile`. That work, and more than
it anticipated (Kick as a full third provider, incremental chat-scope
reauth), has shipped — see
[connection.md](../../subsystems/connection.md) for the current shape.
What remains below is the genuinely open residue.

See also:

- [docs/subsystems/connection.md](../../subsystems/connection.md) — the
  login/logout, WebSocket-upgrade, and session lifecycle this hooks.
- [docs/slates/persistence-architecture-slate.md](../builds/persistence-architecture-slate.md)
  — `Document` (plain JSON, no Stuff) is what `GoogleProfile` / `User` /
  `TwitchProfile` all are.
- [char-gen.md](../../subsystems/char-gen.md) *(shipped; slate retired)* — char-gen is
  **provider-agnostic** (free-text given + roster-defaulted surname); the
  provider name becomes a char-gen *input* only at the deferred
  LLM-refraction stage.
- [docs/slates/chat-slate.md](./chat-slate.md) — the **Twitch chat relay**
  (downstream of this keystone) extends the `Channel` substrate with an
  external-backed channel.
- [docs/deployment.md](../../deployment.md) — secrets via SSM Parameter
  Store (`SecureString`) / local `.env`; the token-encryption key lives
  here alongside `GOOGLE_CLIENT_SECRET` / `SESSION_SECRET`.

---

## What shipped

The Principle, data model, spine generalization, token storage &
encryption, scopes, linking & collisions, and no-char-gen-coupling
designs this slate proposed all shipped essentially as designed (Kick
later joined as a third co-equal provider, not anticipated here) — see
[connection.md](../../subsystems/connection.md) § The Cast and § Phase 1
for the current shape, including the account-merge refusal ("refuse,
don't merge," unchanged from this slate's call) and the
`EncryptedStringMarshaller` that resolved the open
CryptoApi-vs-field-marshaller call in favor of the marshaller. The
**Twitch chat relay** named below as downstream also shipped —
incremental `user:write:chat` reauth via `/auth/twitch/reauth`, see
[streaming.md](../../subsystems/streaming.md).

## Left

- **Account merge.** Still explicitly refused, not built — two
  `playerIds` sets are never reconciled. This is a "won't build without
  a real reason" call the code embodies (`Application.linkProvider`
  refuses a collision outright), not a scheduled piece of work; revisit
  only if a real player collision makes it one.
- **Provider-side token revocation.** `unlinkProvider` deletes the local
  `*Profile` Document (and its encrypted tokens) but never calls the
  provider's own revoke endpoint — the token stays valid at Twitch/Kick
  until it expires or the player revokes it themselves from their
  provider account settings.
- **YouTube as a linkable/login provider.** Still unbuilt: no
  `YouTubeProfile`, no OAuth login/link route. `YoutubeClient` /
  `YoutubeRelayReader` exist only for the **streaming** side (reading a
  channel's live chat via API key), not account login — a `@`-seed
  still rejects `character-youtube`
  (`packages/server/src/mud/lib/streaming/StreamerTarget.ts`). Whether
  it eventually grows `GoogleProfile` (this slate's original guess) or
  needs its own profile Document the way Kick did is still open.
- **LLM name-refraction.** Still only reserved: `session.authProvider`
  exists and is threaded through, but nothing reads it as a char-gen
  input yet, and the platform has no LLM seam to feed. Needs
  `authProvider` exposed to char-gen + the platform's first LLM
  integration.
