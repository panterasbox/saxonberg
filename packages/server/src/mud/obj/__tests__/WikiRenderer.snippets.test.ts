/**
 * Pipeline stage 2 — snippet expansion.
 *
 * Gates acceptance criteria **16** (`{{Snippet|param=value}}` expands
 * with substitution), **17** (a self-including snippet and a
 * mutually-including pair BOTH fail inline rather than hanging),
 * **18** (a snippet cannot reach live game state except via a
 * component), **47** (the same, from the budget's side), **57** (a
 * snippet is an ordinary page) and **58** (a missing parameter with no
 * default renders a visible marker, never empty).
 *
 * The 17/47 tests are the ones that matter most: the failure mode this
 * whole layer guards against is not a wrong answer, it is a request
 * that never returns.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import WikiRenderer from '../WikiRenderer';
import { Idea } from '../../lib/stuff/Idea';
import { AccessApi } from '../../api/access';
import { AppApi } from '../../api/app';
import { ShellApi } from '../../api/shell';
import { ExecutionContextApi } from '../../api/execution-context';
import { Snippets } from '../../lib/wiki/Snippet';
import { ProxyApi } from '../../api/proxy';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

class Principal extends Idea {}

let renderer: WikiRenderer;
let reader: Stuff;

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
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
  vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(3 as unknown as never);
  renderer = makeStuff(() => new WikiRenderer());
  reader = makeStuff(() => new Principal()) as unknown as Stuff;
});

/** Render `body` against a fixed snippet library. */
async function render(
  body: string,
  snippets: Record<string, string> = {},
): Promise<string> {
  return ExecutionContextApi.runRoot(null, 'wiki.read', async () => {
    ExecutionContextApi.tagActingAuthor(reader);
    const result = await raw().render(body, {
      resolveSnippet: async (name) =>
        snippets[name.trim().toLowerCase()] ?? null,
    });
    return result.body;
  });
}

describe('expansion and substitution (16)', () => {
  it('expands a snippet with no parameters', async () => {
    expect(await render('{{Hello}}', { hello: 'world' })).toBe('world');
  });

  it('substitutes a NAMED parameter', async () => {
    expect(
      await render('{{Infobox|class=hardwood}}', {
        infobox: 'class: {{{class}}}',
      }),
    ).toBe('class: hardwood');
  });

  it('substitutes POSITIONAL parameters, 1-indexed', async () => {
    expect(
      await render('{{Pair|first|second}}', { pair: '{{{1}}} then {{{2}}}' }),
    ).toBe('first then second');
  });

  it('mixes positional and named', async () => {
    expect(
      await render('{{Infobox|Oak|class=hardwood}}', {
        infobox: '{{{1}}} is {{{class}}}',
      }),
    ).toBe('Oak is hardwood');
  });

  it('uses a default when no argument is given', async () => {
    expect(await render('{{Box}}', { box: '{{{class|unknown}}}' })).toBe(
      'unknown',
    );
  });

  it('an argument beats the default', async () => {
    expect(
      await render('{{Box|class=oak}}', { box: '{{{class|unknown}}}' }),
    ).toBe('oak');
  });

  it('a snippet body may contain markup, and it is REAL markup', async () => {
    const out = await render('{{Bold|x}}', { bold: '<strong>{{{1}}}</strong>' });
    expect(out).toBe('<strong>x</strong>');
  });

  it('expands several invocations in one body', async () => {
    const out = await render('{{A}} and {{B}}', { a: 'one', b: 'two' });
    expect(out).toBe('one and two');
  });

  it('expands inside nested markup', async () => {
    const out = await render('<list><li>{{A}}</li></list>', { a: 'x' });
    expect(out).toBe('<list><li>x</li></list>');
  });

  it('a value containing `=` keeps it — only the FIRST names a key', async () => {
    const out = await render('{{Box|eq=a=b}}', { box: '{{{eq}}}' });
    expect(out).toBe('a=b');
  });

  it('snippets COMPOSE — one may invoke another', async () => {
    const out = await render('{{Outer}}', {
      outer: 'before {{Inner}} after',
      inner: 'MIDDLE',
    });
    expect(out).toBe('before MIDDLE after');
  });

  it('an argument may itself be an invocation', async () => {
    const out = await render('{{Wrap|{{Inner}}}}', {
      wrap: '[{{{1}}}]',
      inner: 'x',
    });
    expect(out).toBe('[x]');
  });
});

describe('⚠ a missing parameter is VISIBLE, never empty (58)', () => {
  it('renders a marker naming the parameter', async () => {
    // Silently-empty parameters are how wiki snippets rot: the page
    // looks fine, the data is gone, and nobody notices for a year.
    const out = await render('{{Box}}', { box: 'class: {{{class}}}' });
    expect(out).toBe('class: {{{class}}}');
    expect(out).not.toBe('class: ');
  });

  it('the marker names the parameter an author has to supply', async () => {
    const out = await render('{{Box}}', { box: '{{{density}}}' });
    expect(out).toContain('density');
    expect(Snippets.missingMarker('density')).toBe('{{{density}}}');
  });
});

describe('⭐ bounds: neither cycle can hang the render (17, 47)', () => {
  it('a SELF-including snippet fails inline, naming the loop', async () => {
    const out = await render('{{Loop}}', { loop: 'a {{Loop}} b' });
    expect(out).toContain('[wiki:');
    expect(out).toContain('cycle');
    expect(out).toContain('loop');
  });

  it('a MUTUALLY-including PAIR fails inline', async () => {
    // The one a depth cap alone would miss if the pair alternated
    // shallowly — the name stack catches it on the first repeat.
    const out = await render('{{A}}', { a: '{{B}}', b: '{{A}}' });
    expect(out).toContain('[wiki:');
    expect(out).toContain('cycle');
    expect(out).toContain('a → b → a');
  });

  it('a three-way cycle prints the whole chain', async () => {
    // "There is a loop" without saying where is not actionable.
    const out = await render('{{A}}', { a: '{{B}}', b: '{{C}}', c: '{{A}}' });
    expect(out).toContain('a → b → c → a');
  });

  it('the rest of the page still renders around a cycle', async () => {
    const out = await render('before {{Loop}} after', {
      loop: '{{Loop}}',
    });
    expect(out).toContain('before');
    expect(out).toContain('after');
  });

  it('the DEPTH cap stops a deep non-cyclic chain', async () => {
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === 'wiki.render.snippetDepth' ? '3' : '',
    );
    const chain: Record<string, string> = {};
    for (let i = 0; i < 10; i++) chain[`s${i}`] = `{{S${i + 1}}}`;
    chain.s10 = 'bottom';
    const out = await render('{{S0}}', chain);
    expect(out).toContain('[wiki:');
    expect(out).toContain('too deep');
  });

  it('the TOTAL cap stops a shallow but enormous fan-out', async () => {
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === 'wiki.render.maxSnippets' ? '5' : '',
    );
    const out = await render('{{A}}{{A}}{{A}}{{A}}{{A}}{{A}}{{A}}', {
      a: 'x',
    });
    expect(out).toContain('budget exhausted');
  });

  it('an expansion bomb is stopped WHILE it inflates', async () => {
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === 'wiki.render.maxOutputChars' ? '200' : '',
    );
    const out = await render('{{Big}}', { big: 'x'.repeat(5000) });
    expect(out).toContain('[wiki:');
    expect(out).toContain('characters');
  });

  it('a legitimate deep-but-bounded chain still renders', async () => {
    const chain: Record<string, string> = {
      a: '{{B}}',
      b: '{{C}}',
      c: 'bottom',
    };
    expect(await render('{{A}}', chain)).toBe('bottom');
  });
});

describe('⭐ the capability line (18)', () => {
  it('a snippet cannot reach game state — it can only compose text', async () => {
    // The boundary is structural: expansion is string substitution
    // plus a re-parse, and there is nothing in that path that could
    // reach state even if a snippet asked.
    //
    // A snippet CAN emit a component tag — that is D6, and it is
    // fine — but emitting one buys nothing: the tag goes to stage 4
    // like any other, which resolves only registered modules. Having
    // been produced by a snippet does not privilege it. Here nothing
    // is registered, so it is an ordinary unknown-component error.
    const out = await render('{{Evil}}', {
      evil: '<composition of="/obj/material/oak"/>',
    });
    expect(out).toContain('unknown component');
    expect(out).toContain('composition');
  });

  it('an unknown snippet is a named inline error, not silence', async () => {
    const out = await render('{{Nope}}');
    expect(out).toContain('[wiki:');
    expect(out).toContain("no snippet 'Nope'");
  });
});

describe('what expansion must NOT touch', () => {
  it('leaves `<code>` alone — an author must be able to show the syntax', async () => {
    const out = await render('<code>{{Hello}}</code>', { hello: 'world' });
    expect(out).toBe('<code>{{Hello}}</code>');
  });

  it('leaves `<pre>` alone for the same reason', async () => {
    const out = await render('<pre>{{Hello}}</pre>', { hello: 'world' });
    expect(out).toBe('<pre>{{Hello}}</pre>');
  });

  it('an unclosed {{ stays literal', async () => {
    expect(await render('{{unclosed and then prose')).toBe(
      '{{unclosed and then prose',
    );
  });

  it('a bare {{{x}}} outside a snippet is left alone, not read as {{ + {x', async () => {
    expect(await render('{{{x}}}')).toBe('{{{x}}}');
  });

  it('does nothing when no resolver is supplied', async () => {
    const out = await ExecutionContextApi.runRoot(null, 'r', async () => {
      ExecutionContextApi.tagActingAuthor(reader);
      return (await raw().render('{{Hello}}')).body;
    });
    expect(out).toBe('{{Hello}}');
  });
});

describe('expansion runs BEFORE the gate', () => {
  it('a snippet inside an over-ceiling section is deleted with it', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    const out = await render('<spoiler level="2">{{Secret}}</spoiler>', {
      secret: 'the twist',
    });
    expect(out).toBe('');
    expect(out).not.toContain('twist');
  });

  it('⭐ a snippet CANNOT lower the level of what encloses it', async () => {
    // The MAXIMUM rule holds through expansion: a snippet emitting a
    // level-0 tag inside a level-2 section is still level 2, so a
    // snippet is not a way to smuggle content out of a gated section.
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    const out = await render('<spoiler level="2">{{Sneaky}}</spoiler>', {
      sneaky: '<spoiler level="0">smuggled</spoiler>',
    });
    expect(out).not.toContain('smuggled');
  });

  it('a snippet may RAISE a level, and that is honoured', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    const out = await render('open {{Reveal}}', {
      reveal: '<spoiler level="3">hidden</spoiler>',
    });
    expect(out).toBe('open ');
  });
});

describe('Snippets — the pure syntax', () => {
  it('finds an invocation and its arguments', () => {
    const hit = Snippets.findInvocation('x {{Box|a|k=v}} y');
    expect(hit?.name).toBe('Box');
    expect(hit?.positional).toEqual(['a']);
    expect(hit?.named).toEqual({ k: 'v' });
    expect('x {{Box|a|k=v}} y'.slice(hit!.start, hit!.end)).toBe(
      '{{Box|a|k=v}}',
    );
  });

  it('splits arguments at TOP-LEVEL pipes only', () => {
    const hit = Snippets.findInvocation('{{A|{{B|inner}}|x}}');
    expect(hit?.positional).toEqual(['{{B|inner}}', 'x']);
  });

  it('skips a parameter reference rather than reading it as an invocation', () => {
    expect(Snippets.findInvocation('{{{x}}}')).toBeNull();
  });

  it('returns null for an unclosed invocation', () => {
    expect(Snippets.findInvocation('{{Unclosed')).toBeNull();
  });

  it('ignores an empty name', () => {
    expect(Snippets.findInvocation('{{}}')).toBeNull();
  });

  it('substitute leaves unrelated braces alone', () => {
    const hit = Snippets.findInvocation('{{A}}')!;
    expect(Snippets.substitute('a { b } c', hit)).toBe('a { b } c');
  });
});
