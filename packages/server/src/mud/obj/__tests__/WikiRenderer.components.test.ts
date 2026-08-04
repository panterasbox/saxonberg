/**
 * Pipeline stage 4 — component resolution.
 *
 * Gates acceptance criteria **13** (an unknown component renders an
 * inline error, not a broken page), **14** (a component exceeding the
 * budget is cut off with a diagnostic), **15** (adding a component is
 * adding a FILE — no registration edit), **48** (the per-component
 * timeout), **49** (⭐ no component can trigger a page render),
 * **54** (⭐ a component receives no reader identity and no capability
 * ceiling), **55** (a throwing component yields an inline error naming
 * it, and the rest of the page still renders) and **56** (a component
 * returning a raw string is refused).
 *
 * Criteria 49 and 54 are the load-bearing ones. If components could
 * gate, the reveal model would be enforced in N places by N people;
 * if a component could re-enter the renderer, recursion would be
 * bounded rather than impossible.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import WikiRenderer from '../WikiRenderer';
import { Idea } from '../../lib/stuff/Idea';
import { AccessApi } from '../../api/access';
import { AppApi } from '../../api/app';
import { HelpApi } from '../../api/help';
import { ShellApi } from '../../api/shell';
import { StuffApi } from '../../api/stuff';
import { ExecutionContextApi } from '../../api/execution-context';
import { SecurityError } from '../../lib/security/errors';
import { ProxyApi } from '../../api/proxy';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { ComponentContext } from '../../lib/wiki/render';
import type { MmlNode } from '../../api/mml';
import { component as infobox } from '../../lib/wiki/components/infobox';
import { component as image } from '../../lib/wiki/components/image';
import { component as help } from '../../lib/wiki/components/help';

class Principal extends Idea {}

let renderer: WikiRenderer;
let reader: Stuff;

/**
 * The throwaway fixtures. Registered by pointing `resolveExport` at
 * this map — which is exactly how a real component resolves (by path,
 * per invocation), just without touching disk.
 */
const FIXTURES: Record<string, unknown> = {};

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
  for (const k of Object.keys(FIXTURES)) delete FIXTURES[k];
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
  vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(3 as unknown as never);
  vi.spyOn(StuffApi, 'resolveExport').mockImplementation(
    async (path: string, exportName: string) => {
      if (exportName !== 'component') return null;
      return FIXTURES[path] ?? null;
    },
  );
  renderer = makeStuff(() => new WikiRenderer());
  reader = makeStuff(() => new Principal()) as unknown as Stuff;
});

/** Drop a component at its resolved path — the "adding a file" act. */
function register(name: string, impl: unknown): void {
  FIXTURES[`/lib/wiki/components/${name}`] = impl;
}

async function render(body: string): Promise<string> {
  return ExecutionContextApi.runRoot(null, 'wiki.read', async () => {
    ExecutionContextApi.tagActingAuthor(reader);
    return (await raw().render(body)).body;
  });
}

async function renderFull(body: string) {
  return ExecutionContextApi.runRoot(null, 'wiki.read', async () => {
    ExecutionContextApi.tagActingAuthor(reader);
    return raw().render(body);
  });
}

/** The minimal component shape: a named class-expression. */
function fixture(
  render: (
    props: Readonly<Record<string, string>>,
    children: readonly MmlNode[],
    ctx: ComponentContext,
  ) => readonly MmlNode[] | Promise<readonly MmlNode[]>,
  extra: Record<string, unknown> = {},
): unknown {
  const cls = class Fixture {
    static render = render;
  };
  Object.assign(cls, extra);
  return cls;
}

const textNode = (t: string): MmlNode => ({ kind: 'text', text: t });

describe('resolution (15)', () => {
  it('⭐ adding a component is adding a FILE — no registration edit', async () => {
    // Nothing was registered anywhere: the tag resolves to a module
    // path and the module is loaded per invocation, the brain pattern.
    register('widget', fixture(() => [textNode('WIDGET')]));
    expect(await render('<widget/>')).toBe('WIDGET');
  });

  it('resolves by the TAG name, at the components path', async () => {
    const spy = vi.mocked(StuffApi.resolveExport);
    register('widget', fixture(() => [textNode('x')]));
    await render('<widget/>');
    expect(spy).toHaveBeenCalledWith('/lib/wiki/components/widget', 'component');
  });

  it('passes attributes through as props', async () => {
    register(
      'echo',
      fixture((props) => [textNode(JSON.stringify(props))]),
    );
    const out = await render('<echo a="1" b="two"/>');
    expect(out).toContain('&quot;a&quot;:&quot;1&quot;');
  });

  it('passes RAW, unresolved children — the component decides', async () => {
    register(
      'wrap',
      fixture((_p, children) => [
        { kind: 'tag', tag: 'strong', attrs: {}, children: [...children] },
      ]),
    );
    expect(await render('<wrap>inner</wrap>')).toBe('<strong>inner</strong>');
  });

  it('a component may DROP its children', async () => {
    register('eat', fixture(() => [textNode('ate it')]));
    expect(await render('<eat>gone</eat>')).toBe('ate it');
  });

  it('an async component is awaited', async () => {
    register(
      'slow',
      fixture(async () => [textNode('eventually')]),
    );
    expect(await render('<slow/>')).toBe('eventually');
  });

  it('grammar tags are never treated as components', async () => {
    const spy = vi.mocked(StuffApi.resolveExport);
    await render('<strong>x</strong><h2>y</h2><table><tr><td>z</td></tr></table>');
    expect(spy).not.toHaveBeenCalled();
  });

  it('a name that could escape its directory is left as literal markup', async () => {
    // The charset rule runs BEFORE resolution, so `../` never becomes
    // part of a module path in the first place.
    const spy = vi.mocked(StuffApi.resolveExport);
    await render('<a.b/><a_b/>');
    expect(spy).not.toHaveBeenCalled();
  });

  it('resolves a component nested inside markup', async () => {
    register('w', fixture(() => [textNode('W')]));
    expect(await render('<list><li><w/></li></list>')).toBe(
      '<list><li>W</li></list>',
    );
  });
});

describe('failure is inline, never fatal (13, 55)', () => {
  it('an unknown component renders an inline error, not a broken page', async () => {
    const out = await render('before <nosuch/> after');
    expect(out).toContain('before');
    expect(out).toContain('after');
    expect(out).toContain('unknown component &lt;nosuch&gt;');
  });

  it('⭐ a THROWING component names itself, and the page still renders', async () => {
    register(
      'boom',
      fixture(() => {
        throw new Error('kaboom');
      }),
    );
    const out = await render('before <boom/> after');
    expect(out).toContain('&lt;boom&gt; failed');
    expect(out).toContain('kaboom');
    expect(out).toContain('before');
    expect(out).toContain('after');
  });

  it('one broken widget does not stop the others', async () => {
    register(
      'boom',
      fixture(() => {
        throw new Error('x');
      }),
    );
    register('ok', fixture(() => [textNode('FINE')]));
    const out = await render('<boom/><ok/>');
    expect(out).toContain('FINE');
  });

  it('a failure is reported on the result, not only in the body', async () => {
    register(
      'boom',
      fixture(() => {
        throw new Error('x');
      }),
    );
    const result = await renderFull('<boom/>');
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toContain('boom');
  });
});

describe('⭐ nodes, never a raw string (56)', () => {
  it('refuses a component that returns a string', async () => {
    // A string would bypass sanitisation entirely — `'<script>'` would
    // be parsed as markup rather than escaped as text. That is the
    // whole reason the contract says "returns MML nodes".
    register('bad', fixture((() => '<strong>raw</strong>') as never));
    const out = await render('<bad/>');
    expect(out).toContain('returned a string, not MML nodes');
    expect(out).not.toContain('<strong>raw</strong>');
  });

  it('refuses a component that returns an object', async () => {
    register('bad', fixture((() => ({ kind: 'nope' })) as never));
    expect(await render('<bad/>')).toContain('not MML nodes');
  });

  it('refuses an array containing a non-node', async () => {
    register('bad', fixture((() => [textNode('ok'), 'raw']) as never));
    expect(await render('<bad/>')).toContain('not MML nodes');
  });

  it('accepts an empty node array — a component may render nothing', async () => {
    register('quiet', fixture(() => []));
    expect(await render('a<quiet/>b')).toBe('ab');
  });
});

describe('⭐ components annotate; they never gate (54)', () => {
  it('the context carries NO reader and NO ceiling', async () => {
    let seen: ComponentContext | null = null;
    register(
      'spy',
      fixture((_p, _c, ctx) => {
        seen = ctx;
        return [];
      }),
    );
    await render('<spy/>');
    const ctx = seen! as ComponentContext;
    const keys = Object.keys(ctx);
    // The ABSENCE is the assertion. A component that never learns what
    // the reader may see cannot leak, however buggy it is — which is
    // what keeps the reveal model to exactly one gate.
    expect(keys).not.toContain('reader');
    expect(keys).not.toContain('ceiling');
    expect(keys).not.toContain('appetite');
    expect(keys).not.toContain('viewer');
    expect(keys.sort()).toEqual(['budget']);
  });

  it('carries the pageId when the render named one — an id, not a reader', async () => {
    let seen: ComponentContext | null = null;
    register(
      'spy',
      fixture((_p, _c, ctx) => {
        seen = ctx;
        return [];
      }),
    );
    await ExecutionContextApi.runRoot(null, 'r', async () => {
      ExecutionContextApi.tagActingAuthor(reader);
      await raw().render('<spy/>', { pageId: 'page-1' });
    });
    expect((seen! as ComponentContext).pageId).toBe('page-1');
  });

  it('a component’s DECLARED FLOOR is honoured (C3)', async () => {
    // For a component whose very PRESENCE is a reveal.
    register(
      'secret',
      fixture(() => [textNode('the twist')], { spoilerFloor: 3 }),
    );
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    const out = await render('open <secret/>');
    expect(out).toBe('open ');
    expect(out).not.toContain('twist');
  });

  it('a floor MAXes with the enclosing level, never lowers it', async () => {
    register('low', fixture(() => [textNode('x')], { spoilerFloor: 0 }));
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    expect(await render('<spoiler level="2"><low/></spoiler>')).toBe('');
  });

  it('a component with no floor is not wrapped at all', async () => {
    register('plain', fixture(() => [textNode('x')]));
    expect(await render('<plain/>')).toBe('x');
  });
});

describe('⭐ no component can trigger a page render (49)', () => {
  it('a component re-entering the renderer takes a SecurityError', async () => {
    // A GATE, not a depth counter: `render`/`redactSource` admit only
    // the controller and the registry, and `/lib/wiki/components/*` is
    // in neither list. There is no depth at which recursion becomes
    // allowed.
    let caught: unknown = null;
    register(
      'recurse',
      fixture(async () => {
        try {
          // Through the PROXY — which is what a real component would
          // hold, and what the gate intercepts.
          await renderer.render('anything');
        } catch (err) {
          caught = err;
        }
        return [];
      }),
    );
    await render('<recurse/>');
    expect(caught).toBeInstanceOf(SecurityError);
  });

  it('redactSource is closed to a component too', async () => {
    let caught: unknown = null;
    register(
      'recurse',
      fixture(async () => {
        try {
          await renderer.redactSource('anything');
        } catch (err) {
          caught = err;
        }
        return [];
      }),
    );
    await render('<recurse/>');
    expect(caught).toBeInstanceOf(SecurityError);
  });
});

describe('the budget bounds components (14, 48)', () => {
  it('the component count is enforced, and the breach is inline', async () => {
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === 'wiki.render.maxComponents' ? '2' : '',
    );
    register('w', fixture(() => [textNode('W')]));
    const out = await render('<w/><w/><w/><w/>');
    expect(out).toContain('[wiki:');
    expect(out).toContain('component budget exhausted');
  });

  it('a slow component is cut off, and the page still renders', async () => {
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === 'wiki.render.componentTimeoutMs' ? '20' : '',
    );
    register(
      'slow',
      fixture(() => new Promise<readonly MmlNode[]>(() => {})),
    );
    const out = await render('before <slow/> after');
    expect(out).toContain('exceeded 20ms');
    expect(out).toContain('before');
    expect(out).toContain('after');
  });

  it('a component reads the budget but cannot spend it (D-5)', async () => {
    // The pipeline charges; the component consults. Self-charging
    // would make every bound advisory, and a component is untrusted
    // input's executor.
    let remaining = -1;
    register(
      'peek',
      fixture((_p, _c, ctx) => {
        remaining = ctx.budget.getRemainingComponents();
        return [];
      }),
    );
    await render('<peek/>');
    // One has been charged (this one), by the pipeline, before the
    // component ever ran.
    expect(remaining).toBe(99);
  });
});

describe('the shipped components', () => {
  const ctx: ComponentContext = {
    budget: { getRemainingComponents: () => 10 } as never,
  };

  describe('<infobox> — pure presentation, reaching nothing', () => {
    it('renders a titled table of its attributes', () => {
      const out = infobox.render(
        { title: 'Oak', class: 'hardwood' },
        [],
        ctx,
      );
      const node = out[0] as Extract<MmlNode, { kind: 'tag' }>;
      expect(node.tag).toBe('table');
      expect(node.children).toHaveLength(2);
    });

    it('does not render `title` as a data row', () => {
      const out = infobox.render({ title: 'Oak' }, [], ctx);
      const table = out[0] as Extract<MmlNode, { kind: 'tag' }>;
      expect(table.children).toHaveLength(1);
    });

    it('uses its children rather than dropping them', () => {
      // Silently dropping authored content is what makes a widget
      // untrustworthy.
      const out = infobox.render({ a: '1' }, [textNode('caption')], ctx);
      expect(JSON.stringify(out)).toContain('caption');
    });

    it('renders nothing at all when given nothing', () => {
      expect(infobox.render({}, [], ctx)).toEqual([]);
    });
  });

  describe('<image> — a key, and no upload path', () => {
    it('emits the bucket-relative key the client already resolves', () => {
      const out = image.render({ key: 'materials/oak.png' }, [], ctx);
      const node = out[0] as Extract<MmlNode, { kind: 'tag' }>;
      expect(node.tag).toBe('image');
      expect(node.attrs.key).toBe('materials/oak.png');
    });

    it('carries alt text when given', () => {
      const out = image.render({ key: 'k', alt: 'a cross-section' }, [], ctx);
      const node = out[0] as Extract<MmlNode, { kind: 'tag' }>;
      expect(node.attrs.alt).toBe('a cross-section');
    });

    it('refuses a key that tries to escape the bucket', () => {
      // The client joins the key to a base URL, so `../` is a request
      // to fetch something the bucket was not meant to serve.
      for (const key of ['../secret', '/etc/passwd', 'https://evil/x']) {
        expect(JSON.stringify(image.render({ key }, [], ctx))).toContain(
          'bucket-relative',
        );
      }
    });

    it('refuses an empty key', () => {
      expect(JSON.stringify(image.render({}, [], ctx))).toContain('needs a key');
    });

    it('⚠ defines NO upload path — the wiki references by key only (40)', () => {
      // Three producers want one bucket; the route and the S3
      // credentials live in the backend tier, which the mudlib may not
      // reach at all. This is the whole of the wiki's media side.
      const source = image.toString();
      expect(source).not.toMatch(/upload|s3|putObject|multipart/i);
    });
  });

  describe('<help> — the first component that reads a live source', () => {
    it('transcludes a verb’s help topic', () => {
      vi.spyOn(HelpApi, 'commandTopic').mockReturnValue({
        id: 'command.plant',
        title: 'plant',
        body: 'Put a seed in the ground.',
      } as never);
      const out = help.render({ verb: 'plant' }, [], ctx);
      expect(JSON.stringify(out)).toContain('Put a seed in the ground.');
      expect(JSON.stringify(out)).toContain('plant');
    });

    it('⭐ is never stale — it reads at render time', () => {
      const spy = vi
        .spyOn(HelpApi, 'commandTopic')
        .mockReturnValue({ id: 'x', title: 'v1', body: 'first' } as never);
      expect(JSON.stringify(help.render({ verb: 'p' }, [], ctx))).toContain(
        'first',
      );
      spy.mockReturnValue({ id: 'x', title: 'v2', body: 'second' } as never);
      // No edit to any article, and every article quoting it updated.
      expect(JSON.stringify(help.render({ verb: 'p' }, [], ctx))).toContain(
        'second',
      );
    });

    it('names a verb that no longer exists rather than rendering blank', () => {
      vi.spyOn(HelpApi, 'commandTopic').mockReturnValue(null);
      expect(JSON.stringify(help.render({ verb: 'gone' }, [], ctx))).toContain(
        "no help for 'gone'",
      );
    });

    it('refuses an empty verb', () => {
      expect(JSON.stringify(help.render({}, [], ctx))).toContain('needs a verb');
    });
  });
});

describe('⭐ stage order, asserted BY OBSERVATION', () => {
  it('a snippet emitting a component emitting a [[link]] leaves the link unresolved', async () => {
    // The plan's R-2 test. If the stages ran in any other order this
    // would silently produce a different (and wrong) result rather
    // than crashing — which is exactly why it is asserted by watching
    // the output rather than by reading the code.
    //
    // 2 (snippets) → 3 (links) → 4 (components). A component's OUTPUT
    // therefore misses stage 3, so its `[[link]]` stays literal. This
    // is a documented limitation, not an accident; the fix, if it ever
    // becomes unacceptable, is re-running stage 3 — a stage BODY
    // change, not a new stage.
    register('emit', fixture(() => [textNode('[[oak]]')]));
    const out = await ExecutionContextApi.runRoot(null, 'r', async () => {
      ExecutionContextApi.tagActingAuthor(reader);
      const r = await raw().render('{{Wrapper}}', {
        resolveSnippet: async (n) =>
          n.toLowerCase() === 'wrapper' ? '<emit/>' : null,
        resolveLink: async () => ({ handle: 'main:oak', title: 'Oak' }),
      });
      return r.body;
    });
    // The snippet expanded (stage 2 ran) and the component resolved
    // (stage 4 ran) — but the link it produced is still literal,
    // proving stage 3 ran between them.
    expect(out).toBe('[[oak]]');
    expect(out).not.toContain('<link');
  });

  it('a [[link]] in a SNIPPET body does resolve — stage 2 precedes 3', async () => {
    const out = await ExecutionContextApi.runRoot(null, 'r', async () => {
      ExecutionContextApi.tagActingAuthor(reader);
      const r = await raw().render('{{Wrapper}}', {
        resolveSnippet: async () => '[[oak]]',
        resolveLink: async () => ({ handle: 'main:oak', title: 'Oak' }),
      });
      return r.body;
    });
    expect(out).toBe('<link href="mudcmd:wiki main:oak">Oak</link>');
  });

  it('a snippet emitting a COMPONENT does resolve — stage 2 precedes 4 (D6)', async () => {
    register('emit', fixture(() => [textNode('RESOLVED')]));
    const out = await ExecutionContextApi.runRoot(null, 'r', async () => {
      ExecutionContextApi.tagActingAuthor(reader);
      const r = await raw().render('{{Wrapper}}', {
        resolveSnippet: async () => '<emit/>',
      });
      return r.body;
    });
    expect(out).toBe('RESOLVED');
  });
});
