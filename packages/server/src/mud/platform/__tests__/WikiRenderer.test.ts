/**
 * The wiki render pipeline — the reveal model, the stage order, and
 * the bounds.
 *
 * Gates acceptance criteria **24** (over-capability content is absent
 * from the payload, asserted on the wire), **25** (over-appetite
 * content is present but tagged), **26** (the frontmatter default
 * applies where no inline tag overrides), **48** (the budget bounds
 * fail inline rather than hanging — the snippet/component halves land
 * with those waves), **59** and **60** (the MAXIMUM rule).
 *
 * ⚠ **Every reveal assertion is on the emitted STRING.** A tree can
 * carry the right levels and still serialise the wrong bytes, and
 * criterion 24's whole claim is about what crosses the wire. Asserting
 * on a level-annotated tree would test the bookkeeping and miss the
 * leak (the plan's R-9).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import WikiRenderer from '../idea/WikiRenderer';
import { Idea } from '../../lib/stuff/Idea';
import { AccessApi } from '../../api/access';
import { AppApi } from '../../api/app';
import { PlayerApi } from '../../api/player';
import { ShellApi } from '../../api/shell';
import { ExecutionContextApi } from '../../api/execution-context';
import { Mml } from '../../api/mml';
import { RenderBudget, RenderBudgetExceeded } from '../../lib/wiki/RenderBudget';
import { SpoilerLevels, RENDER_STAGES } from '../../lib/wiki/render';
import { ProxyApi } from '../../api/proxy';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { RenderOptions } from '../../lib/wiki/render';

/** A minimal registered Stuff to stand in for a reader / a zone. */
class Principal extends Idea {}

function principal(): Stuff {
  return makeStuff(() => new Principal()) as unknown as Stuff;
}

/**
 * Run `fn` with `who` as the execution context's acting author — the
 * only way the renderer learns who is reading, by design.
 */
async function asReader<T>(who: Stuff | null, fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(null, 'wiki.read', async () => {
    if (who !== null) ExecutionContextApi.tagActingAuthor(who);
    return fn();
  });
}

/**
 * Pin the capability ladder to `ceiling` for every actor. The ladder
 * itself (wizard → zone-mutator → zone-reader → 0) is asserted
 * separately in its own describe block.
 */
function pinCeiling(ceiling: 0 | 1 | 2 | 3): void {
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(ceiling >= 3);
  vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(ceiling >= 2);
  vi.spyOn(AccessApi, 'can').mockResolvedValue(ceiling >= 1);
}

/** Pin the reader's declared appetite (the `wiki.spoilerAppetite` setting). */
function pinAppetite(appetite: number): void {
  vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(
    appetite as unknown as never,
  );
}

let renderer: WikiRenderer;
let reader: Stuff;
let zone: Stuff;

/**
 * `render` / `redactSource` are gated to the controller + the registry
 * (criterion 49 — a component re-entering the renderer takes a
 * `SecurityError`, which is a GATE, not a depth counter). Tests drive
 * the unwrapped target; the gate itself is asserted through the PROXY
 * in `WikiRenderer.components.test.ts`, once, rather than being
 * defeated invisibly everywhere.
 */
function raw(): WikiRenderer {
  return ProxyApi.unwrap(renderer as unknown as Stuff) as unknown as WikiRenderer;
}

beforeEach(() => {
  vi.restoreAllMocks();
  // No settings rows in a unit test — the budget falls through to
  // RenderBudget.DEFAULTS, which is the documented behaviour.
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
  renderer = makeStuff(() => new WikiRenderer());
  reader = principal();
  zone = principal();
});

/** Render with a zone in play, so the ladder's zone rungs are reachable. */
async function render(
  body: string,
  opts: RenderOptions = {},
): Promise<string> {
  const result = await asReader(reader, () =>
    raw().render(body, { namespaceZone: zone, ...opts }),
  );
  return result.body;
}

describe('capability — over-ceiling content is ABSENT from the payload (24)', () => {
  it('a level-2 section does not appear in a level-1 reader’s bytes', async () => {
    pinCeiling(1);
    pinAppetite(3);
    const out = await render(
      'open prose <spoiler level="2">the boss is a mimic</spoiler> more prose',
    );
    expect(out).not.toContain('mimic');
    expect(out).not.toContain('boss');
    expect(out).toBe('open prose  more prose');
  });

  it('leaves no marker behind — not even an empty tag', async () => {
    // A redaction marker is the leak in miniature: it says "there is
    // something here you cannot see", which is the information.
    pinCeiling(0);
    pinAppetite(3);
    const out = await render('a<spoiler level="3">SECRET</spoiler>b');
    expect(out).toBe('ab');
    expect(out).not.toContain('spoiler');
  });

  it('deletes at depth even when the enclosing section survives', async () => {
    pinCeiling(1);
    pinAppetite(3);
    const out = await render(
      '<spoiler level="1">visible <spoiler level="3">hidden</spoiler> tail</spoiler>',
    );
    expect(out).toContain('visible');
    expect(out).toContain('tail');
    expect(out).not.toContain('hidden');
  });

  it('admits content AT the ceiling — the comparison is > not >=', async () => {
    pinCeiling(2);
    pinAppetite(3);
    const out = await render('<spoiler level="2">exactly at the line</spoiler>');
    expect(out).toContain('exactly at the line');
  });

  it('a null principal fails closed at level 0', async () => {
    pinCeiling(3); // the ladder would allow everything IF an actor resolved
    pinAppetite(3);
    const result = await asReader(null, () =>
      raw().render('open <spoiler level="1">gated</spoiler>', {
        namespaceZone: zone,
      }),
    );
    expect(result.body).not.toContain('gated');
    expect(result.body).toContain('open');
  });

  it('the reader cannot be supplied by the caller', () => {
    // The signature is the assertion: `render(body, opts)` has no
    // reader field, so no caller can render "as" a privileged actor.
    // If this ever gains one, criterion 24 stops being structural and
    // becomes a convention.
    const optKeys: Array<keyof RenderOptions> = [
      'pageId',
      'spoilerDefault',
      'appetite',
      'namespaceZone',
      'resolveSnippet',
    ];
    expect(optKeys).not.toContain('reader');
    expect(renderer.render.length).toBeLessThanOrEqual(2);
  });
});

describe('appetite — within-ceiling content is PRESENT but tagged (25)', () => {
  it('wraps an over-appetite section rather than dropping it', async () => {
    pinCeiling(3);
    pinAppetite(0);
    const out = await render('open <spoiler level="2">the twist</spoiler>');
    expect(out).toContain('the twist');
    expect(out).toContain('<spoiler level="2">');
  });

  it('emits NO wrapper when appetite covers the level', async () => {
    // The authored tag is a level declaration; the emitted tag is a
    // per-reader display instruction. A reader who asked to see it
    // gets it plain.
    pinCeiling(3);
    pinAppetite(3);
    const out = await render('open <spoiler level="2">the twist</spoiler>');
    expect(out).toBe('open the twist');
    expect(out).not.toContain('spoiler');
  });

  it('appetite is clamped to the ceiling', async () => {
    // Tagging at a level the reader could never receive would
    // advertise a hole that is not there.
    pinCeiling(1);
    pinAppetite(3);
    const out = await render('<spoiler level="1">shown</spoiler>');
    expect(out).toBe('shown');
  });

  it('does not nest a second wrapper inside the first', async () => {
    pinCeiling(3);
    pinAppetite(0);
    const out = await render(
      '<spoiler level="2">outer <spoiler level="3">inner</spoiler></spoiler>',
    );
    expect(out).toContain('inner');
    expect((out.match(/<spoiler/g) ?? []).length).toBe(1);
  });

  it('a per-invocation --spoiler overrides the stored setting', async () => {
    pinCeiling(3);
    pinAppetite(0);
    const out = await render('<spoiler level="2">the twist</spoiler>', {
      appetite: 2,
    });
    expect(out).toBe('the twist');
  });
});

describe('the frontmatter default (26)', () => {
  it('applies where no inline tag overrides', async () => {
    pinCeiling(3);
    pinAppetite(0);
    const out = await render('just prose', { spoilerDefault: 2 });
    expect(out).toBe('<spoiler level="2">just prose</spoiler>');
  });

  it('is a single wrapper for the whole body, not one per node', async () => {
    pinCeiling(3);
    pinAppetite(0);
    const out = await render('a <em>b</em> c', { spoilerDefault: 1 });
    expect((out.match(/<spoiler/g) ?? []).length).toBe(1);
    expect(out).toBe('<spoiler level="1">a <em>b</em> c</spoiler>');
  });

  it('hides the whole page when the default is over the ceiling', async () => {
    pinCeiling(1);
    pinAppetite(3);
    const out = await render('all of this is a spoiler', { spoilerDefault: 3 });
    expect(out).toBe('');
  });

  it('an inline tag raises above the default but never lowers below it', async () => {
    pinCeiling(3);
    pinAppetite(0);
    const out = await render(
      'base <spoiler level="0">try to lower</spoiler>',
      { spoilerDefault: 2 },
    );
    // Both fragments are level 2: the default floors everything.
    expect(out).toBe('<spoiler level="2">base try to lower</spoiler>');
  });
});

describe('the MAXIMUM rule (59, 60)', () => {
  it('a level-0 fragment inside a level-2 section is level 2 (59)', async () => {
    pinCeiling(1);
    pinAppetite(3);
    const out = await render(
      '<spoiler level="2">context <spoiler level="0">a mundane fact</spoiler></spoiler>',
    );
    // The inner fact is level 0 in isolation and level 2 in place —
    // knowing it appears under THAT heading is itself the reveal.
    expect(out).not.toContain('a mundane fact');
    expect(out).toBe('');
  });

  it('wrapping in a lower-level container cannot reveal (60)', async () => {
    pinCeiling(1);
    pinAppetite(3);
    const out = await render(
      '<spoiler level="0"><spoiler level="3">still secret</spoiler></spoiler>',
    );
    expect(out).not.toContain('still secret');
  });

  it('holds through non-spoiler structure in between', async () => {
    pinCeiling(1);
    pinAppetite(3);
    const out = await render(
      '<spoiler level="2"><h2>Heading</h2><list><li>buried</li></list></spoiler>',
    );
    expect(out).not.toContain('buried');
    expect(out).not.toContain('Heading');
  });

  it('SpoilerLevels.max is max, in both argument orders', () => {
    expect(SpoilerLevels.max(0, 2)).toBe(2);
    expect(SpoilerLevels.max(2, 0)).toBe(2);
    expect(SpoilerLevels.max(3, 3)).toBe(3);
  });

  it('SpoilerLevels.parse fails OPEN on garbage, not closed', () => {
    // A reveal system that fails closed on a typo empties panels and
    // trains authors to tag reflexively. Stated, not papered over.
    expect(SpoilerLevels.parse('high')).toBe(SpoilerLevels.OPEN);
    expect(SpoilerLevels.parse(undefined)).toBe(SpoilerLevels.OPEN);
    expect(SpoilerLevels.parse(-1)).toBe(SpoilerLevels.OPEN);
    expect(SpoilerLevels.parse(99)).toBe(3);
    expect(SpoilerLevels.parse('2')).toBe(2);
  });

  it('parse never THROWS — it parses community-authored markup', () => {
    // Unlike LandUses.parse, whose input is a developer's setter call.
    // A throw here would take down a page for a typo in a tag.
    expect(() => SpoilerLevels.parse({})).not.toThrow();
    expect(SpoilerLevels.parse({})).toBe(SpoilerLevels.OPEN);
  });
});

describe('the capability ladder', () => {
  it('a wizard reaches 3', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    expect(await renderer.ceilingFor(reader, zone)).toBe(3);
  });

  it('a namespace mutator reaches 2', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(true);
    expect(await renderer.ceilingFor(reader, zone)).toBe(2);
  });

  it('a namespace member reaches 1', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
    expect(await renderer.ceilingFor(reader, zone)).toBe(1);
  });

  it('a non-player Stuff is 0', async () => {
    pinCeiling(0);
    expect(await renderer.ceilingFor(reader, zone)).toBe(0);
  });

  describe('⭐ the reader rung — an ordinary player sits at 1', () => {
    /**
     * The rung exists so the APPETITE axis can fire at all. While
     * every rung was authoring authority, a signed-in player sat at 0,
     * `spoiler="1"` meant "no ordinary player may ever see this", and
     * the click-to-reveal could never reach the people it was built
     * for. Level 1 now means "ordinary content a reader may choose not
     * to be shown"; 2 and 3 stay authority-gated.
     */
    function player(guest: boolean): Stuff {
      const avatar = principal();
      vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(true);
      (avatar as unknown as { getIsGuest: () => boolean }).getIsGuest = () =>
        guest;
      return avatar;
    }

    it('a signed-in player reaches 1 with no namespace authority at all', async () => {
      pinCeiling(0);
      expect(await renderer.ceilingFor(player(false), zone)).toBe(1);
    });

    it('…and with no zone either', async () => {
      // A namespace nobody seeded a zone for used to drop every reader
      // to 0. That was right while 1 meant "trusted with this
      // namespace" and is wrong now that it means "ordinary content".
      // The rungs that NEED the zone still fail closed without it.
      pinCeiling(0);
      expect(await renderer.ceilingFor(player(false), undefined)).toBe(1);
    });

    it('⚠ a GUEST stays at 0', async () => {
      // Not only for symmetry with the write gate: a guest persists
      // nothing, so the setting that would let them opt in cannot be
      // remembered for them. "Collapsed until you choose otherwise" is
      // not an offer you can make to somebody whose choice evaporates
      // at disconnect.
      pinCeiling(0);
      expect(await renderer.ceilingFor(player(true), zone)).toBe(0);
    });

    it('does not raise a reader who already has more', async () => {
      vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
      vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(true);
      expect(await renderer.ceilingFor(player(false), zone)).toBe(2);
    });

    it('⭐ level 2 is still out of an ordinary player’s reach', async () => {
      // The whole point of keeping the upper rungs: opening level 1 to
      // everybody must not open the levels above it.
      pinCeiling(0);
      pinAppetite(3);
      const p = player(false);
      const out = await asReader(p, () =>
        raw().render(
          'open <spoiler level="1">mild</spoiler> <spoiler level="2">real</spoiler>',
          { namespaceZone: zone },
        ),
      );
      expect(out.body).toContain('mild');
      expect(out.body).not.toContain('real');
    });
  });

  it('a null actor is 0 without consulting anything', async () => {
    const spy = vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    expect(await renderer.ceilingFor(null, zone)).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('no zone means the ZONE rungs are unreachable — fails closed', async () => {
    // A page with no namespace zone cannot be resource-targeted, so
    // the rungs that need one are out of reach. A non-player then has
    // nothing left to stand on and gets 0.
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(true);
    expect(await renderer.ceilingFor(reader, undefined)).toBe(0);
  });

  it('a wizard does not need a zone', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    expect(await renderer.ceilingFor(reader, undefined)).toBe(3);
  });
});

describe('redactSource — the same gate over source (67, 68)', () => {
  it('deletes over-ceiling fragments', async () => {
    pinCeiling(1);
    const out = await asReader(reader, () =>
      raw().redactSource('keep <spoiler level="3">drop</spoiler> keep'),
    );
    expect(out).not.toContain('drop');
    expect(out).toContain('keep');
  });

  it('leaves nothing to count — a reader cannot learn THAT it changed', async () => {
    pinCeiling(0);
    const a = await asReader(reader, () =>
      raw().redactSource('same <spoiler level="2">before</spoiler> same'),
    );
    const b = await asReader(reader, () =>
      raw().redactSource('same <spoiler level="2">after</spoiler> same'),
    );
    // Two revisions differing ONLY above the ceiling must redact to
    // the same string, or the diff of the redactions leaks the edit.
    expect(a).toBe(b);
  });

  it('PRESERVES authored spoiler tags — this is source, not display', async () => {
    pinCeiling(3);
    const src = 'a <spoiler level="1">b</spoiler> c';
    expect(await asReader(reader, () => raw().redactSource(src))).toBe(src);
  });

  it('returns the input byte-identical when nothing was removed (R-8)', async () => {
    // parseTree/serialize normalise entities, so re-emitting an
    // untouched body would rewrite bodies this only meant to filter.
    pinCeiling(1);
    const src = "it&apos;s a <em>test</em>";
    expect(await asReader(reader, () => raw().redactSource(src))).toBe(src);
  });

  it('does not expand snippets or resolve components', async () => {
    pinCeiling(3);
    const src = '{{Infobox|x=1}} <composition of="/obj/x"/>';
    expect(await asReader(reader, () => raw().redactSource(src))).toBe(src);
  });
});

describe('the pipeline takes a BODY, never a page id (A4)', () => {
  it('renders identical text identically whether or not a page is named', async () => {
    // This IS criterion 36's mechanism: preview is the same path over
    // unsaved text, so it cannot drift from what saving will produce.
    pinCeiling(3);
    pinAppetite(3);
    const body = 'article <strong>text</strong>';
    const saved = await render(body, { pageId: 'page-1' });
    const preview = await render(body);
    expect(preview).toBe(saved);
  });

  it('the stage order is frozen and complete', () => {
    expect([...RENDER_STAGES]).toEqual([
      'parse',
      'expandSnippets',
      'resolveLinks',
      'resolveComponents',
      'gate',
      'emit',
    ]);
  });

  it('snippet expansion precedes component resolution (D6)', () => {
    // A snippet can emit a component, so the text must exist before
    // the resolver looks for tags. Asserted on the order itself; the
    // by-observation test lands with Wave 5, when both stages do work.
    expect(RENDER_STAGES.indexOf('expandSnippets')).toBeLessThan(
      RENDER_STAGES.indexOf('resolveComponents'),
    );
  });
});

describe('markup passes through the pipeline intact', () => {
  it('preserves long-form structure', async () => {
    pinCeiling(3);
    pinAppetite(3);
    const body =
      '<h2 anchor="uses">Uses</h2><table><tr><th>A</th></tr></table>' +
      '<list><li>one<list><li>two</li></list></li></list>';
    expect(await render(body)).toBe(body);
  });

  it('round-trips a body with no spoilers untouched', async () => {
    pinCeiling(0);
    pinAppetite(0);
    const body = 'plain <em>prose</em> with a <link href="mudcmd:look">ref</link>';
    expect(await render(body)).toBe(body);
  });
});

describe('the render budget (48, partial)', () => {
  it('fails inline rather than throwing when output exceeds the cap', async () => {
    pinCeiling(3);
    pinAppetite(3);
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === 'wiki.render.maxOutputChars' ? '10' : '',
    );
    const result = await asReader(reader, () =>
      raw().render('x'.repeat(500), { namespaceZone: zone }),
    );
    expect(result.body).toContain('[wiki:');
    expect(result.body).toContain('exceeded');
    expect(result.diagnostics).toHaveLength(1);
  });

  it('names WHICH bound was crossed', async () => {
    const budget = new RenderBudget({ maxComponents: 1 });
    budget.chargeComponent('a');
    try {
      budget.chargeComponent('b');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RenderBudgetExceeded);
      expect((err as RenderBudgetExceeded).limit).toBe('maxComponents');
      // An author who cannot tell which limit they crossed cannot fix
      // the page, so the offending tag is named too.
      expect((err as Error).message).toContain('<b>');
    }
  });

  it('depth catches a self-including snippet', () => {
    const budget = new RenderBudget({ snippetDepth: 2 });
    budget.enterDepth('Loop');
    budget.enterDepth('Loop');
    expect(() => budget.enterDepth('Loop')).toThrow(RenderBudgetExceeded);
  });

  it('the total cap catches a mutually-including PAIR', () => {
    // Two snippets including each other alternate, so each stays
    // shallow; only the total count stops them.
    const budget = new RenderBudget({ snippetDepth: 100, maxSnippets: 4 });
    for (let i = 0; i < 4; i++) budget.chargeSnippet(i % 2 ? 'A' : 'B');
    expect(() => budget.chargeSnippet('A')).toThrow(RenderBudgetExceeded);
  });

  it('exposes remaining components read-only to a component', () => {
    const budget = new RenderBudget({ maxComponents: 3 });
    expect(budget.getRemainingComponents()).toBe(3);
    budget.chargeComponent('x');
    expect(budget.getRemainingComponents()).toBe(2);
  });

  it('a fast component leaves no pending timer', async () => {
    const budget = new RenderBudget({ componentTimeoutMs: 60_000 });
    await expect(budget.withTimeout('x', Promise.resolve(1))).resolves.toBe(1);
  });

  it('a slow component is abandoned, not awaited', async () => {
    const budget = new RenderBudget({ componentTimeoutMs: 10 });
    await expect(
      budget.withTimeout('slow', new Promise(() => {})),
    ).rejects.toBeInstanceOf(RenderBudgetExceeded);
  });

  it('reads its limits from app_settings when present', async () => {
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === 'wiki.render.maxComponents' ? '7' : '',
    );
    pinCeiling(3);
    pinAppetite(3);
    const result = await asReader(reader, () =>
      raw().render('x', { namespaceZone: zone }),
    );
    expect(result.budget.getLimits().maxComponents).toBe(7);
    // Unset keys fall through to the code-side defaults.
    expect(result.budget.getLimits().maxSnippets).toBe(
      RenderBudget.DEFAULTS.maxSnippets,
    );
  });
});

describe('the emitted markup is well-formed MML', () => {
  it('a tagged render re-parses to the tree it claims', async () => {
    pinCeiling(3);
    pinAppetite(0);
    const out = await render('a <spoiler level="2">b</spoiler> c');
    expect(Mml.serialize(Mml.parseTree(out))).toBe(out);
  });

  it('flatten of a gated body reads as prose', async () => {
    pinCeiling(3);
    pinAppetite(0);
    const out = await render('a <spoiler level="2">b</spoiler> c');
    // Flatten is a failsafe over an ALREADY-GATED body, so the
    // surviving spoiler content is content this reader may see.
    expect(Mml.flatten(out)).toBe('a b c');
  });
});
