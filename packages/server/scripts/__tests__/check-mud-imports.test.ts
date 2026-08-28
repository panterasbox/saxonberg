/**
 * check-mud-imports' pack tier (content-packs, D4 — the pack import
 * profile): what the server's `exports` map cannot see. A pack file
 * importing `fs`, a logic singleton (`platform/idea/api/MagicLogic` —
 * blocked in the map), a relative escape out of its src/, or another
 * pack it does not depend on is refused; the exported kernel surface,
 * `@saxonberg/types`, its own src/ and a declared pack dependency pass.
 */

import { describe, it, expect } from 'vitest';
import { packImportRefusal, exportServes, type PackImportContext } from '../check-mud-imports';

const EXPORTS = {
  './mud/lib/*': './src/mud/lib/*.ts',
  './mud/api/*': './src/mud/api/*.ts',
  './mud/api/mql/*': null,
  './mud/platform/idea/*': './src/mud/platform/idea/*.ts',
  './mud/platform/idea/api/*': null,
  './test-bootstrap': './src/test-bootstrap.ts',
};
const CTX: PackImportContext = {
  pack: { id: 'arcana', srcDir: '/proj/packages/content/arcana/src' },
  dependsOn: ['platform'],
  serverExports: EXPORTS,
};
const FILE = '/proj/packages/content/arcana/src/thing/Wand.ts';

describe('exportServes', () => {
  it('longest key wins; a null target blocks', () => {
    expect(exportServes(EXPORTS, './mud/lib/stuff/Thing')).toBe(true);
    expect(exportServes(EXPORTS, './mud/api/magic')).toBe(true);
    expect(exportServes(EXPORTS, './mud/api/mql/lexer')).toBe(false);
    expect(exportServes(EXPORTS, './mud/platform/idea/api/MagicLogic')).toBe(false);
    expect(exportServes(EXPORTS, './backend/Application')).toBe(false);
    expect(exportServes(EXPORTS, './test-bootstrap')).toBe(true);
  });
});

describe('check-mud-imports.packImportRefusal', () => {
  it('the exported kernel surface, the types package and the pack\'s own src/ pass', () => {
    expect(packImportRefusal(FILE, '@saxonberg/server/mud/lib/stuff/Thing', CTX)).toBeNull();
    expect(packImportRefusal(FILE, '@saxonberg/server/mud/api/magic', CTX)).toBeNull();
    expect(packImportRefusal(FILE, '@saxonberg/types', CTX)).toBeNull();
    expect(packImportRefusal(FILE, './Scroll', CTX)).toBeNull();
    expect(packImportRefusal(FILE, '../idea/material/PotionMaterial', CTX)).toBeNull();
  });

  it('a Node built-in is refused', () => {
    expect(packImportRefusal(FILE, 'fs', CTX)).toMatch(/no Node built-ins/);
    expect(packImportRefusal(FILE, 'node:path', CTX)).toMatch(/no Node built-ins/);
  });

  it('a logic singleton is refused — the exports map blocks platform/idea/api', () => {
    expect(packImportRefusal(FILE, '@saxonberg/server/mud/platform/idea/api/MagicLogic', CTX)).toMatch(
      /not in @saxonberg\/server's exports map/,
    );
    expect(packImportRefusal(FILE, '@saxonberg/server/backend/Application', CTX)).toMatch(/exports map/);
  });

  it('a relative escape out of the pack src/ is refused', () => {
    expect(packImportRefusal(FILE, '../../../../server/src/mud/lib/stuff/Thing', CTX)).toMatch(/escapes the pack/);
  });

  it('a pack-to-pack import needs the dependency line', () => {
    expect(packImportRefusal(FILE, '@saxonberg/content-platform/src/thing/X', CTX)).toBeNull();
    expect(packImportRefusal(FILE, '@saxonberg/content-arcane-library/src/thing/GlowlightMote', CTX)).toMatch(
      /not in arcana's package.json dependencies/,
    );
  });
});
