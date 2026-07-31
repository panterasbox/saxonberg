// ProseLogic — the hot-reloadable logic singleton behind ProseApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Liquid } from 'liquidjs';
import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { Mml } from '../../api/mml';
import { GrammarApi, type PronounKind } from '../../api/grammar';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import { Prose, type FilterFn } from '../../lib/prose/Prose';
import type { CompiledProse } from '../../api/prose';

const ProseApiCallers = SecurityPolicies.FromModule('/api/prose#ProseApi');

/**
 * ProseLogic — the hot-reloadable logic singleton behind
 * {@link ProseApi}.
 *
 * Lives at `/obj/api/prose` (a stateless `Stuff` singleton, no backing
 * `Template`); `ProseApi`'s public statics forward here via
 * `StuffApi.singletonSync`.
 *
 * **The Liquid engine and the default filter set live here**, not in
 * `lib/prose/Prose.ts`: `liquidjs` is a dependency outside `src/mud/`,
 * so only the Api tier may import it (docs/architecture.md § The import
 * boundary). `Prose` keeps the value-object half — a source string, an
 * opaque compiled handle, and the Mml-typed render surface — and reaches
 * back through `ProseApi` for compile / render / registerFilter.
 *
 * **Reload caveat.** The memoised engine is module state in a
 * hot-reloadable module, so `dest /obj/api/prose` builds a fresh engine
 * and any filter installed through `ProseApi.registerFilter` is gone
 * (before the engine moved here it lived in the non-reloadable
 * `lib/prose/Prose.ts` and survived). Nothing in-tree registers a filter
 * today — the default set is rebuilt by `engine()` either way — so this
 * bites only an author who has registered one at runtime: re-register
 * after a reload. Making them survive wants a durable filter registry,
 * which is more machinery than the current zero callers justify.
 *
 * Each method carries the `FromModule` gate **per method** (a
 * class-level default would also deny the inherited `Stuff`/`Idea`
 * framework methods the framework itself invokes).
 *
 * @internal
 */
@Unshadowable
export class ProseLogic extends ApiLogic {
  /** See {@link ProseApi.format}. */
  @CallSecurity(ProseApiCallers)
  public format(source: string, vars: Record<string, unknown>): Mml {
    return Prose.parse(source).render(vars);
  }

  /** See {@link ProseApi.registerFilter}. */
  @CallSecurity(ProseApiCallers)
  public registerFilter(name: string, fn: FilterFn): void {
    engine().registerFilter(name, fn);
  }

  /** See {@link ProseApi.compile}. */
  @CallSecurity(ProseApiCallers)
  public compile(source: string): CompiledProse {
    // Box into the opaque handle. Safe by construction: `CompiledProse`
    // has no structure, so the only value that can reach `renderCompiled`
    // is one this line produced.
    return engine().parse(source) as unknown as CompiledProse;
  }

  /** See {@link ProseApi.renderCompiled}. */
  @CallSecurity(ProseApiCallers)
  public renderCompiled(
    compiled: CompiledProse,
    vars: Record<string, unknown>,
  ): string {
    // Unbox — see `compile`; nothing else mints a CompiledProse.
    const rendered = engine().renderSync(
      compiled as unknown as ReturnType<Liquid['parse']>,
      vars,
    );
    return String(rendered ?? '');
  }
}

function outputEscapeMmlAware(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Mml) return value.toString();
  if (typeof value === 'object' && value !== null) {
    const toMml = (value as { toMml?: () => unknown }).toMml;
    if (typeof toMml === 'function') {
      const fragment = toMml.call(value);
      return fragment instanceof Mml
        ? fragment.toString()
        : Mml.escape(String(fragment));
    }
  }
  return Mml.escape(String(value));
}

/**
 * Narrow an unknown Liquid input to a Stuff. Filters operating on a
 * Stuff use this as the first gate; non-Stuff inputs render empty.
 * Filters that need a more specific shape (Gendered for pronouns,
 * Named for proper-name rendering) layer a `MixinApi` predicate on
 * top.
 */
function asStuff(v: unknown): Stuff | null {
  return v && typeof v === 'object' && 'stuffId' in (v as object)
    ? (v as Stuff)
    : null;
}

/** Memoized shared engine; built on first use by {@link engine}. */
let _engine: Liquid | null = null;

/**
 * Lazily construct the shared prose engine and register the default
 * filter set on it. Lazy-init keeps this module free of module-scope
 * statements (the no-free-standing-statements rule) at the cost of
 * one null-check per parse/render.
 */
function engine(): Liquid {
  if (_engine) return _engine;
  const built = new Liquid({
    strictVariables: false,
    strictFilters: true,
    ownPropertyOnly: true,
    outputEscape: outputEscapeMmlAware,
  });

  // `| name` is strict — Named only. A non-Named stuff has no proper
  // name to render, so the filter renders empty rather than wrapping a
  // fallback string in a `<name>` tag (which would lie about identity).
  built.registerFilter('name', (v) => {
    const s = asStuff(v);
    return s && MixinApi.isNamed(s) ? Mml.name(s) : '';
  });

  // `| item`, `| location`, `| object` accept any Stuff. The underlying
  // `Mml.*` factories already drop to a sensible last-stitch fallback
  // (`'an item'`, `'somewhere'`, `'something'`) via
  // `Stuff.getPresentation()` when neither Named nor Visible is
  // present — so the filter is the right place to let that fallback
  // surface rather than swallowing the call.
  built.registerFilter('item', (v) => {
    const s = asStuff(v);
    return s ? Mml.item(s) : '';
  });
  built.registerFilter('location', (v) => {
    const s = asStuff(v);
    return s ? Mml.location(s) : '';
  });
  built.registerFilter('object', (v) => {
    const s = asStuff(v);
    return s ? Mml.object(s) : '';
  });
  built.registerFilter('direction', (v) =>
    v == null || v === '' ? '' : Mml.direction(String(v)),
  );

  // Grammar filters.
  built.registerFilter('cap', (v) =>
    v == null ? '' : GrammarApi.cap(String(v)),
  );
  built.registerFilter('pronoun', (v, kind) => {
    const s = asStuff(v);
    if (!s || !MixinApi.isGendered(s)) return '';
    return GrammarApi.pronoun(s, (kind ?? 'subj') as PronounKind);
  });
  built.registerFilter('possessive', (v) => {
    const s = asStuff(v);
    return s && MixinApi.isGendered(s) ? GrammarApi.possessive(s) : '';
  });
  // `| article` accepts any Stuff; `GrammarApi.article` already returns
  // `'a'` as the last-stitch default when the display name is missing.
  built.registerFilter('article', (v) => {
    const s = asStuff(v);
    return s ? GrammarApi.article(s) : '';
  });

  // Quantity rendering. Two flavors:
  //   - `quantity`           — tag-flavored markup (the default for
  //                            prose; inner text is the registered tag
  //                            string, or the canonical format for
  //                            tagless units).
  //   - `quantity_canonical` — canonical-flavored markup (instrument
  //                            and analyze readouts; inner text is
  //                            always the canonical "<n> <unit>"
  //                            form).
  // Both produce `<quantity unit value [tag]>inner</quantity>` markup.
  built.registerFilter('quantity', (v) => {
    if (v && typeof v === 'object' && 'toMml' in (v as object)) {
      const fragment = (v as { toMml: () => unknown }).toMml();
      return fragment instanceof Mml ? fragment : '';
    }
    return '';
  });
  built.registerFilter('quantity_canonical', (v) => {
    if (v && typeof v === 'object' && 'formatMml' in (v as object)) {
      const fragment = (v as { formatMml: () => unknown }).formatMml();
      return fragment instanceof Mml ? fragment : '';
    }
    return '';
  });

  _engine = built;
  return built;
}

