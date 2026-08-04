/**
 * Pipeline stage 1 — the **article dialect**.
 *
 * An article body is markdown. Stage 1 runs
 * `Mml.markdownToMml(body, undefined, { longForm: true })` before
 * parsing, which is what makes `# Heading` a heading rather than a
 * literal hash. The dialect itself is unit-tested in
 * `api/mml/__tests__/mml.longform.test.ts`; **this file asserts the
 * wiring** — that the renderer uses it, that MML tags survive the
 * conversion so an author can mix markdown and `<spoiler>` /
 * `<composition/>` in one text, and that the two things the dialect
 * must NOT do (pass unknown tags, rewrite the stored source) it
 * doesn't.
 *
 * ⚠ The tag passthrough is the security-relevant half. A component
 * name becomes a module basename, so the charset rule in
 * `api/mml/tags.ts` is a boundary, not a nicety — anything that isn't
 * a known tag or a well-formed component name must come out as
 * escaped text.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import WikiRenderer from '../WikiRenderer';
import { Idea } from '../../lib/stuff/Idea';
import { AccessApi } from '../../api/access';
import { AppApi } from '../../api/app';
import { ShellApi } from '../../api/shell';
import { ExecutionContextApi } from '../../api/execution-context';
import { ProxyApi } from '../../api/proxy';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { LinkTarget, RenderOptions } from '../../lib/wiki/render';

class Principal extends Idea {}

let renderer: WikiRenderer;
let reader: Stuff;

/** See the sibling suites: the gate is asserted once, through the proxy. */
function raw(): WikiRenderer {
  return ProxyApi.unwrap(
    renderer as unknown as Stuff,
  ) as unknown as WikiRenderer;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true); // ceiling 3
  vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(3 as unknown as never);
  renderer = makeStuff(() => new WikiRenderer());
  reader = makeStuff(() => new Principal()) as unknown as Stuff;
});

async function render(body: string, opts: RenderOptions = {}): Promise<string> {
  return ExecutionContextApi.runRoot(null, 'wiki.read', async () => {
    ExecutionContextApi.tagActingAuthor(reader);
    const result = await raw().render(body, opts);
    return result.body;
  });
}

describe('the renderer parses the ARTICLE dialect, not the chat one', () => {
  it('turns a markdown heading into <h1>, with its sticky anchor', async () => {
    expect(await render('# Overview {#top}')).toBe(
      '<h1 anchor="top">Overview</h1>',
    );
  });

  it('derives an anchor from the text when none is written', async () => {
    const out = await render('## Known Uses');
    expect(out).toContain('<h2');
    expect(out).toContain('Known Uses');
  });

  it('nests a list by indentation — a chat-dialect exclusive', async () => {
    expect(await render('- one\n- two\n  - nested')).toBe(
      '<list><li>one</li><li>two<list><li>nested</li></list></li></list>',
    );
  });

  it('builds a pipe table', async () => {
    const out = await render('| a | b |\n| --- | --- |\n| 1 | 2 |');
    expect(out).toBe(
      '<table><tr><th>a</th><th>b</th></tr><tr><td>1</td><td>2</td></tr></table>',
    );
  });

  it('still carries the shared inline subset (bold, code)', async () => {
    expect(await render('a **bold** and `code` word')).toBe(
      'a <strong>bold</strong> and <code>code</code> word',
    );
  });
});

describe('markdown and MML tags mix in one body', () => {
  it('passes a <spoiler> through, and it still GATES', async () => {
    // The tag survives conversion (so the author can write it) and is
    // then read by stage 5 like any other — this is the whole reason
    // the passthrough exists.
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    const out = await render(
      '## Ending\n\nThe hero <spoiler level="2">dies</spoiler> at dawn.',
    );
    expect(out).toContain('<h2');
    expect(out).not.toContain('dies');
  });

  it('passes a self-closing component tag through to stage 4', async () => {
    // Unresolvable here (no module), so the renderer emits its inline
    // "unknown component" error — which is itself the proof the tag
    // reached stage 4 as a TAG. Had the passthrough not fired, the
    // body would have arrived at stage 4 as escaped text and no
    // component lookup would have happened at all.
    const out = await render('<nonesuch of="/obj/gear/Sword"/>');
    expect(out).toContain('unknown component');
    expect(out).toContain('nonesuch');
  });

  it('resolves [[Page]] links written inside markdown prose', async () => {
    const oak: LinkTarget = { handle: 'main:oak', title: 'Oak' };
    const out = await render('- see [[oak]] for more', {
      resolveLink: async (ref: string) =>
        ref.trim().toLowerCase() === 'oak' ? oak : null,
    });
    expect(out).toContain('<li>');
    expect(out).toContain('main:oak');
  });
});

describe('what the passthrough must NOT let through', () => {
  it('escapes a tag that is neither known nor a legal component name', async () => {
    // `SCRIPT` fails the component charset rule (it is not lowercase
    // kebab), so it must arrive as text.
    const out = await render('before <SCRIPT src="x">alert()</SCRIPT> after');
    expect(out).toContain('&lt;');
    expect(out).not.toContain('<script');
  });

  it('leaves a `<` in ordinary prose escaped', async () => {
    expect(await render('a < b and c > d')).toBe('a &lt; b and c &gt; d');
  });

  it('treats a code span as opaque — no tag is born inside one', async () => {
    const out = await render('write `<spoiler level="1">x</spoiler>` to hide');
    expect(out).toContain('&lt;spoiler');
    expect(out).toContain('<code>');
  });
});

describe('the stored source is the author’s own text', () => {
  it('redactSource returns the markdown unconverted', async () => {
    // History, diff and the edit box all ride redactSource. If it
    // returned MML the author would be editing a translation of what
    // they wrote — which is why the conversion lives at render time.
    const body = '# Title\n\n- a\n- b';
    const out = await ExecutionContextApi.runRoot(null, 'wiki.read', () => {
      ExecutionContextApi.tagActingAuthor(reader);
      return raw().redactSource(body);
    });
    expect(out).toBe(body);
  });
});
