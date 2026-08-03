/**
 * MML **article dialect** — headings, nested lists, tables, spoilers,
 * and the tree round-trip the wiki's redaction path depends on.
 *
 * Gates acceptance criterion **23** (headings, nested lists and tables
 * round-trip, and each defines `flatten`) and the plan's **R-8**
 * (`serialize` must be a real inverse of `parseTree`, or
 * `redactSource` silently rewrites bodies it was only meant to
 * filter).
 *
 * The chat dialect's own behaviour is pinned in `mml.corpus.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { Mml, type MmlNode } from '../mml';

const article = (src: string): string =>
  Mml.markdownToMml(src, undefined, { longForm: true }).toString();

describe('article dialect — headings', () => {
  it('parses # / ## / ### into h1 / h2 / h3', () => {
    expect(article('# Title')).toBe('<h1>Title</h1>');
    expect(article('## Uses')).toBe('<h2>Uses</h2>');
    expect(article('### Detail')).toBe('<h3>Detail</h3>');
  });

  it('stops at three levels — #### is prose', () => {
    expect(article('#### too deep')).toBe('#### too deep');
  });

  it('carries a sticky anchor from the {#id} suffix', () => {
    expect(article('## Uses {#uses}')).toBe('<h2 anchor="uses">Uses</h2>');
  });

  it('round-trips heading + anchor through flatten', () => {
    const src = '## Working Oak {#working}';
    const mml = article(src);
    expect(Mml.flatten(mml)).toBe(src);
    expect(article(Mml.flatten(mml))).toBe(mml);
  });

  it('the anchor survives a rewording of the heading text (criterion 45)', () => {
    const before = article('## Uses {#uses}');
    const after = article('## What It Is Good For {#uses}');
    const anchorOf = (m: string) => /anchor="([^"]*)"/.exec(m)?.[1];
    expect(anchorOf(before)).toBe('uses');
    expect(anchorOf(after)).toBe('uses');
  });

  it('parses inline emphasis inside a heading', () => {
    expect(article('## The **hard** part')).toBe(
      '<h2>The <strong>hard</strong> part</h2>',
    );
  });
});

describe('article dialect — nested lists', () => {
  it('nests an indented item inside the previous item', () => {
    expect(article('- one\n  - inner\n- two')).toBe(
      '<list><li>one<list><li>inner</li></list></li><li>two</li></list>',
    );
  });

  it('nests arbitrarily deep', () => {
    expect(article('- a\n  - b\n    - c')).toBe(
      '<list><li>a<list><li>b<list><li>c</li></list></li></list></li></list>',
    );
  });

  it('decides ordered-ness per level', () => {
    expect(article('- bullet\n  1. first\n  2. second')).toBe(
      '<list><li>bullet<list ordered="true"><li>first</li>' +
        '<li>second</li></list></li></list>',
    );
  });

  it('a flat list is identical to the chat dialect', () => {
    expect(article('- one\n- two')).toBe(Mml.markdownToMml('- one\n- two').toString());
  });

  it('flatten re-indents nested items so depth survives', () => {
    const mml = article('- one\n  - inner\n- two');
    expect(Mml.flatten(mml)).toBe('- one\n  - inner\n- two');
  });

  it('round-trips a nested list through flatten', () => {
    const src = '- a\n  - b\n    - c';
    expect(Mml.flatten(article(src))).toBe(src);
  });
});

describe('article dialect — tables', () => {
  it('parses a header row plus body rows', () => {
    expect(article('| Property | Value |\n| --- | --- |\n| Density | 0.75 |')).toBe(
      '<table><tr><th>Property</th><th>Value</th></tr>' +
        '<tr><td>Density</td><td>0.75</td></tr></table>',
    );
  });

  it('treats a headerless run as all-td', () => {
    expect(article('| a | b |\n| c | d |')).toBe(
      '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>',
    );
  });

  it('accepts and discards GFM alignment markers', () => {
    expect(article('| a |\n| :---: |\n| b |')).toBe(
      '<table><tr><th>a</th></tr><tr><td>b</td></tr></table>',
    );
  });

  it('parses inline emphasis inside a cell', () => {
    expect(article('| **bold** |')).toBe(
      '<table><tr><td><strong>bold</strong></td></tr></table>',
    );
  });

  it('round-trips a table through flatten', () => {
    const src = '| Property | Value |\n| --- | --- |\n| Density | 0.75 |';
    const mml = article(src);
    // flatten re-emits the canonical separator spacing.
    expect(article(Mml.flatten(mml))).toBe(mml);
  });

  it('a quote run immediately after a table is still a quote (R-1)', () => {
    expect(article('| a |\n> quoted')).toBe(
      '<table><tr><td>a</td></tr></table>\n<blockquote>quoted</blockquote>',
    );
  });
});

describe('article dialect — inline links work mid-line', () => {
  it('resolves a link that follows a space', () => {
    // The chat dialect leaves this literal (pinned in the corpus); the
    // article dialect narrows the sentinel passthrough so it matches.
    expect(article('see [X](mudcmd:look%20x) here')).toBe(
      'see <link href="mudcmd:look%20x">X</link> here',
    );
  });

  it('still protects code sentinels', () => {
    expect(article('text `code` more')).toBe('text <code>code</code> more');
  });

  it('resolves mid-line emphasis', () => {
    expect(article('a **b** c')).toBe('a <strong>b</strong> c');
  });
});

describe('Mml.heading / table / spoiler composers', () => {
  it('heading emits the level and optional anchor', () => {
    expect(Mml.heading(2, 'Uses').toString()).toBe('<h2>Uses</h2>');
    expect(Mml.heading(2, 'Uses', 'uses').toString()).toBe(
      '<h2 anchor="uses">Uses</h2>',
    );
  });

  it('heading escapes a raw string body', () => {
    expect(Mml.heading(1, 'a < b').toString()).toBe('<h1>a &lt; b</h1>');
  });

  it('table emits th for the first row when header is set', () => {
    expect(Mml.table([['A', 'B'], ['1', '2']], true).toString()).toBe(
      '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>',
    );
  });

  it('spoiler carries its level', () => {
    expect(Mml.spoiler(2, 'the twist').toString()).toBe(
      '<spoiler level="2">the twist</spoiler>',
    );
  });

  it('spoiler flattens to its CONTENT, not a marker', () => {
    // Flatten is a failsafe projection of an ALREADY-GATED body: over
    // -ceiling content is deleted before it gets here, so what remains
    // is content the reader may see. Hiding it in flatten would blank
    // exactly the surfaces with no client to un-hide it.
    expect(Mml.flatten('<spoiler level="2">the twist</spoiler>')).toBe('the twist');
  });
});

describe('every long-form tag defines flatten (criterion 23)', () => {
  const CASES: ReadonlyArray<readonly [string, string]> = [
    ['<h1>A</h1>', '# A'],
    ['<h2>A</h2>', '## A'],
    ['<h3>A</h3>', '### A'],
    ['<h2 anchor="a">A</h2>', '## A {#a}'],
    ['<table><tr><th>A</th></tr><tr><td>b</td></tr></table>', '| A |\n| --- |\n| b |'],
    ['<tr><td>x</td></tr>', '| x |'],
    ['<th>x</th>', 'x'],
    ['<td>x</td>', 'x'],
    ['<spoiler level="1">x</spoiler>', 'x'],
  ];

  it.each(CASES)('flatten(%j)', (markup, expected) => {
    expect(Mml.flatten(markup)).toBe(expected);
  });

  it('no grammar tag falls through to the unknown-tag default', () => {
    // The default arm emits children verbatim, which is right for
    // identity tags and WRONG for anything structural — a table that
    // fell through would flatten to run-together cell text. Assert
    // every structural tag produces something other than bare children.
    const structural = ['h1', 'h2', 'h3', 'table', 'tr', 'list', 'li', 'blockquote'];
    for (const tag of structural) {
      const markup =
        tag === 'table'
          ? '<table><tr><td>x</td></tr></table>'
          : tag === 'tr'
            ? '<tr><td>x</td></tr>'
            : `<${tag}>x</${tag}>`;
      expect(Mml.flatten(markup)).not.toBe('x');
    }
  });
});

describe('Mml.isKnownTag / componentCandidate — the D-8 split', () => {
  it('grammar tags are known', () => {
    for (const t of ['strong', 'h2', 'table', 'spoiler', 'name', 'link']) {
      expect(Mml.isKnownTag(t)).toBe(true);
      expect(Mml.componentCandidate(t)).toBe(false);
    }
  });

  it('is case-insensitive', () => {
    expect(Mml.isKnownTag('H2')).toBe(true);
  });

  it('an unknown safe name is a component candidate', () => {
    for (const t of ['composition', 'infobox', 'image', 'help', 'a-b']) {
      expect(Mml.isKnownTag(t)).toBe(false);
      expect(Mml.componentCandidate(t)).toBe(true);
    }
  });

  it('a name that could escape its directory is NOT a candidate', () => {
    // The component name becomes a module basename, so these are the
    // ones that matter: they must fail the charset rule, not be
    // sanitised downstream.
    for (const t of ['../secret', 'a/b', 'a.b', '/abs', 'a_b', '3', '', 'a b']) {
      expect(Mml.componentCandidate(t)).toBe(false);
    }
  });

  it('case is folded, matching the parser (which lowercases tags)', () => {
    expect(Mml.componentCandidate('Infobox')).toBe(true);
    expect(Mml.componentCandidate('INFOBOX')).toBe(true);
  });
});

describe('parseTree / serialize round-trip (R-8)', () => {
  const BODIES = [
    'plain text',
    '<strong>x</strong>',
    '<h2 anchor="uses">Uses</h2>',
    '<list><li>a<list><li>b</li></list></li></list>',
    '<table><tr><th>A</th></tr><tr><td>b</td></tr></table>',
    '<spoiler level="3">hidden</spoiler>',
    'text with &lt;escaped&gt; brackets',
    '<image key="oak.png"/>',
    '<link href="mudcmd:look%20x">X</link>',
    'a <em>b</em> c <strong>d</strong> e',
    '',
  ];

  it.each(BODIES)('serialize(parseTree(%j)) is byte-exact', (body) => {
    expect(Mml.serialize(Mml.parseTree(body))).toBe(body);
  });

  it.each(BODIES)('the tree round-trip holds for %j', (body) => {
    const once = Mml.parseTree(body);
    const twice = Mml.parseTree(Mml.serialize(once));
    expect(twice).toEqual(once);
  });

  it('serialize is idempotent on its own output', () => {
    // The property `redactSource` actually needs: filtering a body
    // twice cannot keep changing it.
    for (const body of BODIES) {
      const once = Mml.serialize(Mml.parseTree(body));
      expect(Mml.serialize(Mml.parseTree(once))).toBe(once);
    }
  });

  it('normalises a non-canonical body rather than corrupting it', () => {
    // `&apos;` decodes to `'`, which `escapeText` deliberately does not
    // re-escape. The output differs from the input by design; what
    // must hold is that it means the same thing and is then stable.
    const src = "it&apos;s";
    const out = Mml.serialize(Mml.parseTree(src));
    expect(out).toBe("it's");
    expect(Mml.serialize(Mml.parseTree(out))).toBe(out);
  });

  it('parseTree exposes the node shape the pipeline resolves over', () => {
    const tree = Mml.parseTree('<h2 anchor="a">Hi</h2>');
    expect(tree).toHaveLength(1);
    const node = tree[0] as Extract<MmlNode, { kind: 'tag' }>;
    expect(node.kind).toBe('tag');
    expect(node.tag).toBe('h2');
    expect(node.attrs.anchor).toBe('a');
    expect(node.children).toEqual([{ kind: 'text', text: 'Hi' }]);
  });
});
