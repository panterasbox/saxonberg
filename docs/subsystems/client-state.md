# Client state substrate

The substrate for **client UI state persisted server-side** — the
third persistence category in Saxonberg, distinct from settings and
PropertiedMixin. Console foundations was the first consumer; theme
preferences, notification settings, keybinds, channel mutes, saved
MQL queries, and onboarding flags will land on the same substrate
as they ship.

## What client state is — and isn't

**IS**: configuration the client mutates through UI gestures, stored
durably on the server because that's where the player's identity
lives. Tabs, theme, notification prefs, keybinds, channel mutes,
saved MQL queries, onboarding flags.

**NOT settings.** `settings` are player-tunable knobs configured via
the `settings` shell command. Different UX surface, different
vocabulary, different validation pipeline. Console tabs aren't
something a player runs `settings set console.tabs '[...]'` on from
the shell. Per
[[feedback-settings-vs-propertied-vs-client-state]].

**NOT generic Stuff properties.** `PropertiedMixin` is composed onto
every Stuff in the world. Widening its surface with client-cares
flags pollutes a universal substrate with a narrow concern. Per
[[feedback-dont-widen-substrate-for-narrow-concerns]],
`ClientStateMixin` is composed only where a client actually attaches
(Avatar today; mobile / admin tools / future cockpit variants
tomorrow). Coins, NPCs, doors never compose it.

**NOT arbitrary code state.** Values mutated by world logic belong
on `PropertiedMixin` or as typed fields on a domain class. Client
state is for state the server holds **on behalf of UIs**.

## ClientStateMixin

`lib/client/ClientState.ts` — composed onto `Avatar` (and any
future Stuff that has a client attached).

- Persistent field `_clientState: Record<string, unknown>` —
  single slot holding every authored / mutated key.
- `getClientState<T>(key): T` — returns the stored value if present
  else the schema default. Throws when the key is not declared in
  any contributing schema.
- `setClientState(key, value): void` — validates the key against
  the aggregated schema chain (rejects unknown keys; runs the
  entry's optional validator), then writes into `_clientState`.
- `snapshotClientState(): Record<string, unknown>` — dense snapshot:
  every declared key carries either its stored value or its default.
  Fed to the client on session-establish.
- `static getClientStateSchema(hostCtor)` — walks the constructor's
  prototype chain and concatenates every own `clientStateSchema`
  array. Used by wire-handler validation paths that want to inspect
  the schema without an instance.

## Schema-on-mixin contribution

Each feature contributes its keys via a small per-feature mixin
declaring `static clientStateSchema: ClientStateSchemaEntry[]`. The
walker reads each layer's *own* schema (`hasOwnProperty`) so
inherited entries don't double-count, and throws on duplicate keys
across layers — a key may only be declared once in the host's chain.

```ts
export function ConsoleClientStateMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class extends Base {
    static _mixinName = 'ConsoleClientStateMixin';
    static clientStateSchema: ClientStateSchemaEntry[] = [
      { key: 'console.tabs', defaultValue: [{ name: 'All', muted: [] }] },
      { key: 'console.activeTab', defaultValue: 'All' },
    ];
  };
}
```

Each entry can optionally carry a `validator: (value) => true | string`
predicate. v1 ships every entry without a validator — the cockpit
is the only client and we trust it. When third-party clients become
real, each entry gains its validator function and the wire handler
rejects values that fail.

The mixin composes onto Avatar above `ClientStateMixin` so the
walker sees both layers:

```ts
const AvatarBase = PostRegistrationMixin(
  HasInteractiveMixin(
    ConsoleClientStateMixin(ClientStateMixin(ShelledCharacter)),
  ),
);
```

## Wire surface

**Server → client on session-establish.**
`ConnectionEstablishedPayload.clientState: Record<string, unknown>`
ships the dense snapshot from `avatar.snapshotClientState()` in
the welcome scene.

**Client → server anytime.**
`{ type: 'client-state-write', payload: { key, value } }` — single
generic inbound message. `Application.processUserMessage` routes
the case to `handleClientStateWrite`, which validates the key
via `avatar.setClientState` (which itself walks the aggregated
schema chain), then calls `avatar.save()`. Concurrent saves race
the periodic autosave timer — MongoDB last-write-wins handles the
race.

**This is the only new inbound path for client state.** Future
features (theme, notifications, keybinds) reuse this same wire path.
They only contribute new schema entries via their own mixin; no
feature-specific wire messages. Per
[[feedback-no-premature-registries]] + the codebase's existing
dispatcher pattern, the handler stays inline in Application's
processUserMessage rather than factoring to its own file.

## Feature contribution pattern

```
1. Write the schema mixin under lib/client/<feature>ClientState.ts.
2. Compose it onto Avatar above ClientStateMixin.
3. (Client) Read state via typed selectors on the clientState
   slice in the Zustand store.
4. (Client) For mutations, expose pure feature actions that call
   setLocalClientState (optimistic) and
   websocketClient.sendClientStateWrite (durable). See
   client/src/store/consoleActions.ts as the canonical example.
```

Schema-on-mixin gives each feature its own ownership scope — the
console feature's keys live with the console mixin, and the
walker assembles the effective schema for the host at lookup time.

## Contrast with adjacent substrates

| Substrate | Purpose | Where composed | Storage shape |
|---|---|---|---|
| `EnvironmentMixin` (settings) | Player-tunable knobs via the `settings` command | Avatar + a few others | Persistent + session stores |
| `PropertiedMixin` | Universal per-Stuff key/value bag | Every Stuff in the world | Transient or saved props per-Stuff |
| `ClientStateMixin` | UI state the server holds on behalf of a client | Only where a client attaches (Avatar) | Single `_clientState` JSON bag |

See [[shell-environment]] for settings; [[properties]] for
PropertiedMixin.

## Liveness

v1 ships no mid-session live updates. Changes a client writes
become visible to the next session-establish (typically the next
login). For multi-device coherence — a player who edits tabs on
laptop and wants their phone to see the change immediately — the
substrate could grow `client-state-changed` push envelopes; that's
a v2 conversation, not a v1 cost.
