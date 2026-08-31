/**
 * check-schema-docs — each of the six assertions, with a fixture that
 * VIOLATES it and an assertion that the gate fails.
 *
 * ⭐ A gate with no failing fixture is a gate nobody has proved. Every
 * test here builds a small tree that is wrong in exactly one way and
 * checks that the gate names it.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { audit, collectionNameSites } from '../check-schema-docs';
import { Collections } from '../../src/mud/lib/persistence/Collections';

const temps: string[] = [];
afterEach(() => {
  while (temps.length > 0) rmSync(temps.pop()!, { recursive: true, force: true });
});

/** The doc every fixture starts from: correct in every respect. */
function goodDoc(overrides: Record<string, string> = {}): string {
  const fields: Record<string, string> = {
    collection: 'wiki',
    owner: 'WikiPage',
    subsystem: 'wiki.md',
    summary: 'The encyclopedia current page state.',
    purpose: 'One row per article, and the reveal model applies here.',
    sandbox: 'pass',
    reset: 'wipe',
    ...overrides,
  };
  return (
    Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n') + '\nindexes: []\n'
  );
}

/**
 * A one-collection world: one schema doc, one source file declaring the
 * owning class, one subsystem doc. `checkGenerated: false` because a
 * fixture tree has no generated tables to compare against — assertion 2
 * is proved separately, by `gen-schema --check` and by the real run.
 */
function world(opts: {
  docs?: Record<string, string>;
  source?: string;
  subsystems?: string[];
}) {
  const root = mkdtempSync(join(tmpdir(), 'schema-gate-'));
  temps.push(root);
  const schemaDir = join(root, 'schema');
  const srcRoot = join(root, 'src');
  const subsystemsDir = join(root, 'subsystems');
  mkdirSync(schemaDir);
  mkdirSync(srcRoot);
  mkdirSync(subsystemsDir);

  const docs = opts.docs ?? { 'wiki.yaml': goodDoc() };
  for (const [file, body] of Object.entries(docs)) {
    writeFileSync(join(schemaDir, file), body, 'utf-8');
  }
  writeFileSync(
    join(srcRoot, 'WikiPage.ts'),
    opts.source ??
      "import { Collections } from './Collections';\n" +
        'export class WikiPage {\n' +
        '  static collectionName = Collections.Wiki;\n' +
        '}\n',
    'utf-8'
  );
  for (const name of opts.subsystems ?? ['wiki.md']) {
    writeFileSync(join(subsystemsDir, name), '# doc\n', 'utf-8');
  }
  return {
    schemaDir,
    srcRoot,
    persistenceDir: root,
    subsystemsDir,
    checkGenerated: false,
  };
}

/** Findings, but only for the collections this fixture world declares. */
function relevant(findings: { assertion: string; detail: string }[]) {
  // The gate is total over `Collections`, so a one-collection fixture
  // legitimately reports the other 47 as undescribed. Those are noise
  // here; each test asserts on the ONE thing it broke.
  return findings.filter((f) => !/has no schema doc/.test(f.detail));
}

describe('check-schema-docs — the six assertions', () => {
  it('passes a world that is right in every respect', () => {
    expect(relevant(audit(world({})))).toEqual([]);
  });

  it('1 · a doc for a collection that is not in the vocabulary fails', () => {
    const findings = relevant(
      audit(
        world({
          docs: {
            'wiki.yaml': goodDoc(),
            'sprockets.yaml': goodDoc({
              collection: 'sprockets',
              owner: 'none',
              subsystem: 'wiki.md',
            }),
          },
        })
      )
    );
    expect(findings.map((f) => f.detail).join('\n')).toMatch(
      /sprockets.*names no collection in the vocabulary/s
    );
  });

  it('1 · a doc whose filename disagrees with its `collection` fails', () => {
    const findings = relevant(
      audit(world({ docs: { 'chattel.yaml': goodDoc() } }))
    );
    expect(findings.map((f) => f.detail).join('\n')).toMatch(
      /the filename must be the collection name/
    );
  });

  it('1 · deleting a doc fails (the real tree, one collection short)', () => {
    // The complement of the fixture worlds above: over the REAL
    // vocabulary, a missing doc is reported by name.
    const findings = audit(world({ docs: {} }));
    expect(findings.map((f) => f.detail).join('\n')).toMatch(
      /wiki has no schema doc/
    );
  });

  it('3 · a `collectionName` written as a string literal fails', () => {
    const findings = relevant(
      audit(
        world({
          source:
            'export class WikiPage {\n' +
            "  static collectionName = 'wiki';\n" +
            '}\n',
        })
      )
    );
    const detail = findings.map((f) => f.detail).join('\n');
    expect(detail).toMatch(/WikiPage\.collectionName = 'wiki'/);
    expect(detail).toMatch(/name the enum member, not the string/);
  });

  it('3 · `Collections.NotAMember` fails', () => {
    const findings = relevant(
      audit(
        world({
          source:
            'export class WikiPage {\n' +
            '  static collectionName = Collections.Sprockets;\n' +
            '}\n',
        })
      )
    );
    expect(findings.map((f) => f.detail).join('\n')).toMatch(
      /not a member of the enum/
    );
  });

  it('4 · an `owner` no class backs fails', () => {
    const findings = relevant(
      audit(world({ docs: { 'wiki.yaml': goodDoc({ owner: 'Encyclopedia' }) } }))
    );
    expect(findings.map((f) => f.detail).join('\n')).toMatch(
      /names owner `Encyclopedia`, but the class whose collectionName is wiki is WikiPage/
    );
  });

  it('4 · `owner: none` on a collection a class DOES write fails', () => {
    const findings = relevant(
      audit(world({ docs: { 'wiki.yaml': goodDoc({ owner: 'none' }) } }))
    );
    expect(findings.map((f) => f.detail).join('\n')).toMatch(
      /says `owner: none`, but WikiPage declares/
    );
  });

  it('5 · a `subsystem` that names no real doc fails', () => {
    const findings = relevant(audit(world({ subsystems: ['banking.md'] })));
    expect(findings.map((f) => f.detail).join('\n')).toMatch(
      /names `wiki\.md`, which is not a file under docs\/subsystems\//
    );
  });

  it('6 · a placeholder summary fails even though it parses', () => {
    const findings = relevant(
      audit(world({ docs: { 'wiki.yaml': goodDoc({ summary: 'TODO' }) } }))
    );
    expect(findings.map((f) => f.detail).join('\n')).toMatch(
      /placeholder `summary`/
    );
  });

  it('6 · a placeholder purpose fails', () => {
    const findings = relevant(
      audit(world({ docs: { 'wiki.yaml': goodDoc({ purpose: 'TODO' }) } }))
    );
    expect(findings.map((f) => f.detail).join('\n')).toMatch(
      /placeholder `purpose`/
    );
  });
});

describe('2 · the generated tables are current', () => {
  it('fails when a generated file does not match the docs', () => {
    // Point the gate at the REAL schema docs but an empty directory in
    // place of `mud/lib/persistence/`: the three files it expects to find
    // there are absent, which is the same comparison a stale file fails.
    const empty = mkdtempSync(join(tmpdir(), 'schema-gen-'));
    temps.push(empty);
    const findings = audit({
      schemaDir: join(__dirname, '../../src/schema'),
      srcRoot: join(__dirname, '../../src'),
      persistenceDir: empty,
      subsystemsDir: join(__dirname, '../../../../docs/subsystems'),
      checkGenerated: true,
    });
    const detail = findings
      .filter((f) => f.assertion.startsWith('2 ·'))
      .map((f) => f.detail)
      .join('\n');
    expect(detail).toMatch(/Collections\.ts is out of date/);
    expect(detail).toMatch(/CollectionPolicy\.ts is out of date/);
    expect(detail).toMatch(/ResetPolicy\.ts is out of date/);
    expect(detail).toMatch(/pnpm gen:schema/);
  });
});

describe('the source scan is file-scoped', () => {
  it('reads each class from its own file, never a neighbour', () => {
    const root = mkdtempSync(join(tmpdir(), 'schema-scan-'));
    temps.push(root);
    writeFileSync(
      join(root, 'A.ts'),
      'export class A {\n  static collectionName = Collections.Wiki;\n}\n'
    );
    writeFileSync(
      join(root, 'B.ts'),
      "export class B {\n  static collectionName = 'wiki';\n}\n"
    );
    const sites = collectionNameSites([join(root, 'A.ts'), join(root, 'B.ts')]);
    expect(sites).toHaveLength(2);
    expect(sites.find((s) => s.className === 'A')?.member).toBe('Wiki');
    // ⚠ B's literal is NOT resolved against A's declaration — it stays
    // unresolved, which is what makes it reportable.
    expect(sites.find((s) => s.className === 'B')?.member).toBeNull();
  });
});

describe('the real tree', () => {
  it('has no `static collectionName` written as a string literal', () => {
    // Acceptance criterion 9, asserted directly rather than through the
    // gate's report — this is the state the build put the tree into.
    expect(audit().filter((f) => f.assertion.startsWith('3 ·'))).toEqual([]);
  });

  it('describes every collection in the vocabulary', () => {
    expect(audit()).toEqual([]);
    expect(Object.values(Collections).length).toBe(48);
  });
});
