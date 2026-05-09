# ScryMixin

At-a-distance perception verbs on `ShelledCharacter`. Sister of
`AuthorMixin` and `WorkspaceMixin` — the remaining shell-tier mixin
in the slate.

The mixin owns no state, no settings, no env vars v1 — its value is
the verb contributions and the structural marker that backs
`MixinApi.isScry`. The capability seam lives on instruments
(`Scryable` interface in `lib/perception/Scryable.ts`), not on the
actor.

Composition: applied to `ShelledCharacter` after `AuthorMixin`.

## Verbs

| Verb | Args | Notes |
|---|---|---|
| `scry` | `<target>` (object), `--with <instrument>` | Capability resolution: privilege bit (deferred, always false v1) → `--with` instrument → auto-resolve from accessible Scryable items → fail with "you have no means to scry from here". |
| `locate` | `<target>` (object) | Walks containment chain from target outward; reports as `name` + `in: a > b > Zone`. |

## Capability seam

`mud/lib/perception/Scryable.ts`:

```ts
interface Scryable {
  readonly _isScryable: boolean;
  canScryFor(target: Stuff): VetoResult;
}
```

Instruments (mirrors, crystal balls, telescopes) implement the
interface. The verb's auto-resolver walks the avatar's environment
+ inventory looking for a Scryable whose `canScryFor(target)`
returns `{ ok: true }` — first match wins.

`ScryFocus` is a sister interface for "remember what we last looked
at" — declared now to claim the shape; v1 ships no consumer.

## See also

- [shell-workspace.md](./shell-workspace.md) — sister mixin
- [shell-author.md](./shell-author.md) — sister mixin (`teleport`
  is admin/world-manipulation, not at-a-distance perception)
- `MobileMixin.goto` — locomotion-of-self, lives on `MobileMixin`
