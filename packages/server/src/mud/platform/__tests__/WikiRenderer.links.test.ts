/**
 * Pipeline stage 3 — `[[Page]]` resolution.
 *
 * Gates acceptance criterion **22**: `[[Page]]` resolves, renders a
 * **redlink** when absent, and follows aliases.
 *
 * The resolver is injected (`RenderOptions.resolveLink`) rather than
 * imported, so the renderer never depends on the registry — the two
 * singletons would otherwise import each other, and the seam also lets
 * these tests drive link resolution with no database at all.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import WikiRenderer from '../idea/WikiRenderer';
import { Idea } from '../../lib/stuff/Idea';
import { AccessApi } from '../../api/access';
import { AppApi } from '../../api/app';
import { ShellApi } from '../../api/shell';
import { ExecutionContextApi } from '../../api/execution-context';
import { ProxyApi } from '../../api/proxy';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { LinkTarget } from '../../lib/wiki/render';

class Principal extends Idea {}

let renderer: WikiRenderer;
let reader: Stuff;

/** A resolver over a fixed name→target map, aliases included. */
function resolverOver(
  pages: Record<string, LinkTarget>,
): (ref: string) => Promise<LinkTarget | null> {
  return async (ref: string) => pages[ref.trim().toLowerCase()] ?? null;
}

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
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true); // ceiling 3
  vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(3 as unknown as never);
  renderer = makeStuff(() => new WikiRenderer());
  reader = makeStuff(() => new Principal()) as unknown as Stuff;
});

async function render(
  body: string,
  pages: Record<string, LinkTarget> = {},
): Promise<string> {
  return ExecutionContextApi.runRoot(null, 'wiki.read', async () => {
    ExecutionContextApi.tagActingAuthor(reader);
    const result = await raw().render(body, {
      resolveLink: resolverOver(pages),
    });
    return result.body;
  });
}

const OAK: LinkTarget = { handle: 'main:oak', title: 'Oak' };

describe('[[Page]] resolution (22)', () => {
  it('resolves an existing page to a clickable link', async () => {
    expect(await render('see [[oak]] for more', { oak: OAK })).toBe(
      'see <link href="mudcmd:wiki main:oak">Oak</link> for more',
    );
  });

  it('uses the page TITLE, not the reference an author typed', async () => {
    // The link reads as the thing, so renaming a page's title improves
    // every link to it without touching a single body.
    expect(await render('[[oak]]', { oak: OAK })).toContain('>Oak<');
  });

  it('honours an explicit label with [[Page|label]]', async () => {
    expect(await render('made of [[oak|oak wood]]', { oak: OAK })).toBe(
      'made of <link href="mudcmd:wiki main:oak">oak wood</link>',
    );
  });

  it('⭐ renders a REDLINK when the page does not exist', async () => {
    const out = await render('nobody wrote [[mimic]] yet');
    // Red, and clickable straight into creating it: a wiki grows
    // because the reader who noticed the gap becomes the author.
    expect(out).toContain('<color value="red">');
    expect(out).toContain('mudcmd:wiki create mimic');
    expect(out).toContain('>mimic<');
  });

  it('⚠ the <color> nests INSIDE the <link>, not around it', async () => {
    // Not cosmetic. The client's clickable-affordance span sets its own
    // colour and a WRAPPING `<color>` loses to it ("the inner color
    // wins", per MmlRenderer) — so nested the other way round a redlink
    // renders in the ordinary link colour and a reader cannot tell the
    // page is unwritten, which defeats the whole mechanism. Caught by
    // driving it in a browser, not by any unit test.
    const out = await render('[[mimic]]');
    expect(out).toBe(
      '<link href="mudcmd:wiki create mimic">' +
        '<color value="red">mimic</color></link>',
    );
    expect(out.indexOf('<link')).toBeLessThan(out.indexOf('<color'));
  });

  it('a redlink keeps an explicit label', async () => {
    const out = await render('[[mimic|that thing]]');
    expect(out).toContain('>that thing<');
    expect(out).toContain('mudcmd:wiki create mimic');
  });

  it('follows an ALIAS — the resolver answers, the renderer does not care', async () => {
    // An alias is just another name the resolver knows; the renderer
    // links to the target's canonical handle either way.
    const out = await render('[[oak-wood]]', {
      'oak-wood': OAK,
    });
    expect(out).toContain('mudcmd:wiki main:oak');
    expect(out).toContain('>Oak<');
  });

  it('resolves a namespaced reference', async () => {
    const out = await render('[[lore:ordinance]]', {
      'lore:ordinance': { handle: 'lore:ordinance', title: 'The Ordinance' },
    });
    expect(out).toContain('mudcmd:wiki lore:ordinance');
    expect(out).toContain('>The Ordinance<');
  });

  it('resolves several links in one run of text', async () => {
    const out = await render('[[oak]] and [[pine]] and [[oak]]', {
      oak: OAK,
      pine: { handle: 'main:pine', title: 'Pine' },
    });
    expect((out.match(/<link/g) ?? []).length).toBe(3);
  });

  it('resolves inside nested markup', async () => {
    const out = await render('<list><li>see [[oak]]</li></list>', {
      oak: OAK,
    });
    expect(out).toBe(
      '<list><li>see <link href="mudcmd:wiki main:oak">Oak</link></li></list>',
    );
  });

  it('leaves the surrounding text exactly as it was', async () => {
    const out = await render('before [[oak]] after', { oak: OAK });
    expect(out.startsWith('before ')).toBe(true);
    expect(out.endsWith(' after')).toBe(true);
  });
});

describe('what link resolution must NOT touch', () => {
  it('leaves `<code>` alone — an author must be able to SHOW the syntax', async () => {
    const out = await render('<code>[[oak]]</code>', { oak: OAK });
    expect(out).toBe('<code>[[oak]]</code>');
  });

  it('leaves `<pre>` alone for the same reason', async () => {
    const out = await render('<pre>[[oak]]</pre>', { oak: OAK });
    expect(out).toBe('<pre>[[oak]]</pre>');
  });

  it('an unclosed [[ does not swallow the rest of the article', async () => {
    const out = await render('oops [[ and then a whole paragraph');
    expect(out).toBe('oops [[ and then a whole paragraph');
  });

  it('an empty [[]] is left as text', async () => {
    expect(await render('[[]]')).toBe('[[]]');
  });

  it('does nothing at all when no resolver is supplied', async () => {
    // Wave 2's behaviour: with no injected resolver the stage is a
    // documented no-op rather than a half-resolution.
    const out = await ExecutionContextApi.runRoot(null, 'r', async () => {
      ExecutionContextApi.tagActingAuthor(reader);
      return (await raw().render('[[oak]]')).body;
    });
    expect(out).toBe('[[oak]]');
  });

  it('a body with no [[ is returned untouched, resolver or not', async () => {
    const body = 'plain <em>prose</em> with brackets [not a link]';
    expect(await render(body, { oak: OAK })).toBe(body);
  });
});

describe('links interact correctly with the gate', () => {
  it('a link inside an over-ceiling section is deleted with it', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    const out = await render('<spoiler level="2">[[oak]]</spoiler>', {
      oak: OAK,
    });
    expect(out).toBe('');
    expect(out).not.toContain('oak');
  });

  it('⭐ stage 3 runs BEFORE the gate, so a redlink cannot leak a name', async () => {
    // The redlink names the page an author referenced. If linkification
    // ran after gating, a deleted section's redlink would still be in
    // the tree; running before means it is deleted along with it.
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    const out = await render('<spoiler level="3">[[the-secret-boss]]</spoiler>');
    expect(out).not.toContain('secret');
  });
});
