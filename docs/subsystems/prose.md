# Prose Templating

`ProseApi` (`mud/api/prose.ts`) is the rendering layer for any prose
that lives outside source — schema-declared settings, CMS-authored
room/NPC/item descriptions, future prompts, future combat narration.
It turns a string template with `{{ var }}` placeholders, `{% if %}`
conditionals, and `| filter` chains into a finished `Mml` fragment.

Built on [LiquidJS](https://liquidjs.com/), the same Liquid dialect
used by Shopify, Jekyll, and GitHub Pages — well-established syntax,
sandboxed by construction, no `eval`, no filesystem access by default.

## Where it sits

`Mml` and `ProseApi` are orthogonal concerns:

- **`Mml`** answers "what semantic markup wraps this fragment?" —
  `<name>`, `<location>`, `<direction>`, eventual CSS/layout.
- **`ProseApi`** answers "given this template and these vars, what
  string should I produce, and which conditional segments survive?"

A prose-producing path uses both: `ProseApi` decides what fragments
to splice in, `Mml` provides the markup wrappers.

| Use ProseApi when | Use `Mml.compose` when |
|---|---|
| Players might want to override the verbiage | The output is dev-owned and structural |
| Authors / scripts override per-room or per-object | The block has multi-line layout |
| Prose has multiple audience variants (self / target / witness) | Inline tagged-template prose is fine |
| Stable one-liner with interpolation slots | E.g. `LookController`, `InventoryController` |

## Mml-aware output

The Liquid engine is configured with a custom output handler that
mirrors `Mml.compose`'s interpolation rules:

- `Mml` fragments emit verbatim (already escaped).
- Strings, numbers, booleans are five-entity escaped via `Mml.escape`.
- `null` / `undefined` (including missing variables) → empty string.
- Objects with `toMml()` are unwrapped; non-`Mml` returns are escaped.

So you can pass a pre-rendered `Mml.name(actor)` as a variable and it
threads through the template without double-escaping. The render
output is wrapped via `Mml.fromMarkup` so callers receive a real
`Mml` value.

## Surface

```typescript
class Prose {
  static parse(source: string): Prose;          // compile once
  render(vars: Record<string, unknown>): Mml;   // execute many times
  toString(): string;                           // raw source
}

class ProseApi {
  static format(source: string, vars: Record<string, unknown>): Mml;
  static registerFilter(name: string, fn: FilterFn): void;
}
```

`Prose.parse` for hot paths where the template is constant (the
movement-message defaults, prompts) — compiling once and rendering
many times skips re-parsing on each call. `ProseApi.format` is the
one-shot convenience for ad-hoc renders.

## Engine configuration

```typescript
new Liquid({
  strictVariables: false,        // missing var → ''
  strictFilters:   true,         // unknown filter → throws
  ownPropertyOnly: true,         // never resolve through prototype chain
  outputEscape:    outputEscapeMmlAware,
});
```

`strictVariables: false` matches the previous `Mml.format` semantics —
typos in variable names render empty rather than blowing up at render
time. `strictFilters: true` does the opposite for filters: an unknown
filter is almost always a typo, and silently dropping a filter chain
produces hard-to-debug output.

`ownPropertyOnly: true` is a sandboxing choice — variable resolution
never walks the prototype chain, so a passed-in object can't expose
unintended methods or fields.

File-loading tags (`{% include %}`, `{% render %}`, `{% layout %}`)
work only with a filesystem root, which we never configure — referring
to them throws.

## Default filters

Registered at module init in `prose.ts`. All take an input from the
left side of the pipe and may take additional positional arguments.

Filter inputs are narrowed at the call site via `MixinApi.is*`
predicates so a Stuff missing the relevant mixin renders empty rather
than producing malformed markup. The narrowing is per-filter:

| Filter | Required composition |
|---|---|
| `name`, `item`, `location`, `object`, `article` | `Named` or `Visible` |
| `pronoun`, `possessive` | `Gendered` |
| `direction` | non-empty string (no Stuff) |
| `cap` | any non-null value (coerced to string) |

### Mml vocabulary

`{{ stuff | name }}`, `{{ stuff | item }}`, `{{ stuff | location }}`,
`{{ stuff | object }}` — wrap a Named-or-Visible Stuff's display name
in the corresponding `<name>` / `<item>` / `<location>` / `<object>`
markup with `stuff-id` attribution. Equivalent to calling
`Mml.name(stuff)` etc. directly.

`{{ direction | direction }}` — wraps a raw direction string in
`<direction>` markup. Note the filter shadows the variable name; both
are spelled the same.

### Grammar (`GrammarApi`)

`{{ text | cap }}` — capitalize the first character. Operates on raw
strings only; passing an `Mml` fragment will cap the leading `<` and
mangle the markup.

`{{ stuff | pronoun }}` / `{{ stuff | pronoun: 'obj' }}` — return a
pronoun for a `Gendered` stuff. Default kind is `'subj'`; other kinds
are `'obj'`, `'poss'`, `'reflex'`. The pronoun set is selected from
the `Pronouns` enum (`He` / `She` / `They` / `It` / `Ze`) on
`GenderedMixin.pronouns`. Non-Gendered stuff renders empty.
`GrammarApi.pronoun()` (called directly from TS) falls back to neuter
on non-Gendered input rather than empty.

`{{ stuff | possessive }}` — alias for `pronoun: 'poss'`.

`{{ stuff | article }}` — return `'a'` or `'an'` for a Named-or-Visible
Stuff based on a vowel-onset heuristic against the display name.
Phonetic exceptions (`an honest`, `a unicorn`) need per-stuff
overrides; not handled in v1.

## Authoring patterns

**Conditional segment** — render a piece only when a var is present:

```
You arrive{% if direction %} from the {{ direction }}{% endif %}.
```

**Conditional with else**:

```
{% if combat %}[fighting]{% else %}[idle]{% endif %}
```

**Filter chain** — mix grammar and Mml vocabulary:

```
{{ actor | pronoun: 'subj' | cap }} attacks {{ target | name }}.
```

**Per-audience movement message** (canonical example, in
`MobileMixin`):

```
You arrive{% if direction %} from the {{ direction }}{% endif %}.
{{ mover }} arrives{% if direction %} from the {{ direction }}{% endif %}.
```

The directional/bland split that used to require two settings keys
collapses into a single template using `{% if direction %}`.

## Registering custom filters

```typescript
ProseApi.registerFilter('shout', (v) => String(v).toUpperCase());
```

Filter functions take `(input, ...args)`. Any return value is run
through the Mml-aware output handler — return an `Mml` fragment to
emit markup verbatim, return a raw string to get five-entity escaping.

## What we're NOT using (yet)

LiquidJS supports much more than we currently exercise:

- **Loops** (`{% for x in list %}`) — useful for prompt status
  effects, party listing, inventory rendering. Available, just unused
  today.
- **Math filters** (`divided_by`, `times`, `round`, etc.) — relevant
  if/when prompts grow numeric thresholds.
- **`{% capture %}`** — assign a rendered block to a local. Available
  but no use case yet.

These are all enabled; they just don't appear in current templates.

## Cross-references

- [messaging.md](./messaging.md) — `Mml`, Scene composer, where
  `ProseApi`-rendered fragments end up
- [shell-environment.md](./shell-environment.md) — settings keyspace
  that hosts most player-overridable templates today
