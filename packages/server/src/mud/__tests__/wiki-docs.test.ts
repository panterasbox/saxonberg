/**
 * The wiki's documentation claims, checked rather than asserted in a
 * commit message.
 *
 * Gates acceptance criteria **30** (`docs/subsystems/wiki.md` owns the
 * model, the component/snippet contract, the permission anchoring and
 * the markup additions), **31** (`CLAUDE.md` gains a map entry and two
 * collection lines; `architecture.md` gains the wiki-component
 * category — ⚠ and **no mixin**, since `DocumentedMixin` was withdrawn
 * in D7) and **40** (the wiki references media by key only and defines
 * no upload path of its own).
 *
 * Doc tests are usually a smell — a test asserting prose is a test
 * asserting a snapshot of somebody's writing. These check *structural*
 * claims only: that a named file exists, that an index points at it,
 * and that a section covering a named concern is present. Those are
 * the claims that go stale silently, and the ones a reviewer cannot
 * spot the absence of.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const REPO = new URL('../../../../../', import.meta.url);

function read(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, REPO)), 'utf8');
}

describe('docs/subsystems/wiki.md owns its subsystem (30)', () => {
  const doc = read('docs/subsystems/wiki.md');

  it('exists and is substantial', () => {
    expect(doc.length).toBeGreaterThan(6000);
  });

  it.each([
    ['the page model', /## The page model/],
    ['the typed subject', /typed subject/i],
    ['the reveal model', /## ⭐ The reveal model/],
    ['the render pipeline', /## The render pipeline/],
    ['the component contract', /## Components and snippets/],
    ['permission anchoring', /## Permissions/],
    ['the markup additions', /## Markup additions/],
    ['deletion + purge', /## Deletion/],
    ['maintenance', /## Maintenance/],
    ['the collections', /## Collections/],
  ])('covers %s', (_label, pattern) => {
    expect(doc).toMatch(pattern);
  });

  it('records the three carve-outs it does NOT own', () => {
    // Media ingest, the search port, durable notification. Naming them
    // is what keeps somebody from re-implementing one inside the wiki.
    expect(doc).toMatch(/## What this build does NOT do/);
    expect(doc).toMatch(/[Mm]edia ingest/);
    expect(doc).toMatch(/search port/);
    expect(doc).toMatch(/[Dd]urable notification/);
  });

  it('records the inert-@CallSecurity-on-a-Document trap', () => {
    // The single most surprising constraint in the build, and the
    // reason behaviour is not on WikiPage. Somebody WILL try to move
    // it there.
    expect(doc).toMatch(/INERT on a `Document`/);
  });

  it('records that AccessApi.can ignores its action argument', () => {
    // A test expecting read and edit to differ would otherwise be
    // written, and would fail mysteriously.
    expect(doc).toMatch(/ignores its `action` argument/);
  });
});

describe('the index entries (31)', () => {
  const claude = read('CLAUDE.md');

  it('CLAUDE.md gains a documentation-map entry', () => {
    expect(claude).toMatch(/\[wiki\.md\]\(\.\/docs\/subsystems\/wiki\.md\)/);
  });

  it('the map entry is ONE line, per the map’s own rule', () => {
    // "Map entries are ONE-LINE pointers by design — a build that grows
    // a subsystem expands the DOC, never this blurb."
    const line = claude
      .split('\n')
      .find((l) => l.includes('](./docs/subsystems/wiki.md)'));
    expect(line).toBeDefined();
    expect(line!.trimStart().startsWith('- [')).toBe(true);
  });

  it('both collections have an authored schema doc', () => {
    // ⚠ This assertion moved. It used to check CLAUDE.md's per-collection
    // orientation list, which the schema-docs build DELETED rather than
    // grew to 48 — it covered 28 of 48 and was misleading by omission.
    // The stronger home is the authored doc itself, which `pnpm
    // lint:schema` makes total over the vocabulary: a collection with no
    // doc fails the build AND the boot.
    for (const collection of ['wiki', 'wiki_revisions']) {
      const doc = read(`packages/server/src/schema/${collection}.yaml`);
      expect(doc).toMatch(new RegExp(`^collection: ${collection}$`, 'm'));
      expect(doc).toMatch(/^subsystem: wiki\.md$/m);
      expect(doc).toMatch(/^summary: /m);
    }
  });

  it('architecture.md gains the wiki-component category', () => {
    const arch = read('docs/architecture.md');
    expect(arch).toMatch(/wiki components/);
    expect(arch).toMatch(/lib\/wiki\/components\/<name>\.ts/);
  });

  it('sandbox.md records the two collections’ policy', () => {
    const sandbox = read('docs/subsystems/sandbox.md');
    // PASS, beside `domain` — the wiki is authored truth and a
    // communications surface, not gameplay state, so there is nothing
    // for the sandbox to contain.
    expect(sandbox).toMatch(/`wiki` \/ `wiki_revisions` → PASS/);
    expect(sandbox).toMatch(
      /PASS \(unmarked\)\*\* \| `domain`.*`wiki`, `wiki_revisions`/,
    );
  });

  it('messaging.md records the long-form additions', () => {
    const messaging = read('docs/subsystems/messaging.md');
    expect(messaging).toMatch(/static heading\(/);
    expect(messaging).toMatch(/two dialects/);
  });

  it('⚠ NO mixin was added — DocumentedMixin was withdrawn in D7', () => {
    // The requirements' criterion 31 originally said "`Mixins` registry
    // gains `Documented`". D7 withdrew it, and the corrected criterion
    // says the opposite. Assert the absence, in the registry itself.
    const mixin = read('packages/server/src/mud/lib/mixin.ts');
    expect(mixin).not.toMatch(/Documented:/);
    expect(mixin).not.toMatch(/WikiMixin/);
  });
});

describe('⚠ the wiki defines no media upload path (40)', () => {
  it('the image component references by KEY only', () => {
    const src = read('packages/server/src/mud/lib/wiki/components/image.ts');
    expect(src).not.toMatch(/putObject|multipart|presign|uploadUrl/i);
    // And it says WHY, so the next person does not add one here.
    expect(src).toMatch(/does NOT do/i);
    expect(src).toMatch(/shared media-ingest surface/);
  });

  it('nothing under lib/wiki reaches for S3 or an upload route', () => {
    // The import boundary would refuse it anyway — `lib/**` may not
    // import outside `src/mud/` — but the absence is worth asserting
    // where somebody would think to add it.
    for (const f of [
      'render.ts',
      'RenderBudget.ts',
      'WikiPage.ts',
      'WikiRevision.ts',
      'Snippet.ts',
      'Section.ts',
      'SourceDiff.ts',
    ]) {
      const src = read(`packages/server/src/mud/lib/wiki/${f}`);
      expect(src, f).not.toMatch(/\bs3\b|aws-sdk|putObject/i);
    }
  });
});
