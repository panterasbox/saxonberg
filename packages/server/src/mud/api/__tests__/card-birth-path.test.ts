/**
 * ⭐⭐ **One birth path** (AC 1).
 *
 * A card exists because a **command** caused the server to push it.
 * The client no longer infers one from a changed query result, and it
 * cannot ask for one either.
 *
 * ⚠ **The strongest guarantee here is not a grep — it is the wire.**
 * `MqlSubscribeMessage` carries no field that could name a card; the
 * only thing a client may still open for itself is the widget shelf's
 * `chrome: 'self'` subscription, which is not a card. A source scan
 * cannot be defeated by a clever call site; a missing protocol field
 * cannot be used at all. The scans below are the second line.
 *
 * ⚠ Every scan asserts a COUNT. A guard that can pass by matching
 * nothing is not a guard (testing.md check 1).
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import { CARD_IDS } from '@saxonberg/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(HERE, '..', '..', '..');
const CLIENT_SRC = join(SERVER_SRC, '..', '..', 'client', 'src');

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === 'dist') continue;
        walk(full);
        continue;
      }
      if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
  };
  walk(root);
  return out;
}

describe('a card is born on the server, or not at all', () => {
  it('⭐ the wire cannot name a card — only the one chrome subscription', () => {
    const typesFile = join(
      SERVER_SRC,
      '..',
      '..',
      'types',
      'src',
      'index.ts',
    );
    const text = readFileSync(typesFile, 'utf8');
    const start = text.indexOf('export interface MqlSubscribeMessage');
    expect(start).toBeGreaterThan(-1);
    const end = text.indexOf('\n}', start);
    const body = text.slice(start, end);

    // The one field a client may still name.
    expect(body).toContain("chrome?: 'self'");
    // …and nothing that would name a card.
    for (const forbidden of ['card?:', 'subject?:', 'hold?:', 'holdSubject?:']) {
      expect(body, `MqlSubscribeMessage must not carry ${forbidden}`).not.toContain(
        forbidden,
      );
    }
    // Not even by value: no CardId ever reaches this message.
    expect(body).not.toContain('CardId');
  });

  it('every server-side mint goes through CardApi.open or CardApi.push', () => {
    const files = sourceFiles(join(SERVER_SRC, 'mud')).filter(
      (f) => !f.includes('__tests__'),
    );
    expect(files.length).toBeGreaterThan(500);

    const sites: string[] = [];
    for (const file of files) {
      const rel = relative(SERVER_SRC, file).replace(/\\/g, '/');
      // The substrate itself is where minting is IMPLEMENTED.
      if (rel === 'mud/obj/CardRegistry.ts') continue;
      if (rel === 'mud/obj/api/CardLogic.ts') continue;
      if (rel === 'mud/api/card.ts') continue;
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/CardApi\.(open|push)\(/g)) {
        sites.push(`${rel}:${m[1]}`);
      }
      /*
       * ⚠ Nothing outside the substrate touches the registry directly.
       * The gate already refuses it at runtime; this catches an attempt
       * at review time, where it is cheaper to explain.
       */
      expect(text, `${rel} must not reach the CardRegistry directly`).not.toMatch(
        /findByTemplatePath<[^>]*CardRegistry/,
      );
    }

    /*
     * The shipped mint sites, by name — five controllers (six calls;
     * `look` opens two) plus the prompt substrate. Asserted as a set so
     * a new one is a deliberate edit here rather than a silent
     * widening.
     */
    expect(sites.sort()).toEqual(
      [
        'mud/obj/command/perception/LookController.ts:open',
        'mud/obj/command/perception/LookController.ts:open',
        'mud/obj/command/social/WhoController.ts:open',
        'mud/obj/command/system/HelpController.ts:open',
        'mud/obj/command/system/PressController.ts:open',
        'mud/obj/command/system/WikiController.ts:open',
      ].sort(),
    );
  });

  it('⚠ every `opens_card:` names a real card, and every mint is declared', () => {
    const cmdRoot = join(SERVER_SRC, 'mud', 'cmd');
    const yamls: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (entry.endsWith('.yaml')) yamls.push(full);
      }
    };
    walk(cmdRoot);
    expect(yamls.length).toBeGreaterThan(50);

    const declared = new Set<string>();
    for (const file of yamls) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/^opens_card:\s*(.+)$/gm)) {
        const raw = m[1]!.trim();
        const ids = raw.startsWith('[')
          ? raw.slice(1, -1).split(',').map((x) => x.trim())
          : [raw];
        for (const id of ids) {
          expect(
            (CARD_IDS as readonly string[]).includes(id),
            `${relative(SERVER_SRC, file)} declares unknown card '${id}'`,
          ).toBe(true);
          declared.add(id);
        }
      }
    }
    // The six command-opened rows. `prompt` is PUSHED (there is no
    // verb for being asked a question), and the three authoring rows
    // get their verbs in the Wave 7 phase.
    expect([...declared].sort()).toEqual(
      ['help', 'news', 'place', 'subject', 'who', 'wiki'].sort(),
    );
  });

  it('the CLIENT never writes into the card set except from a card-* envelope', () => {
    const files = sourceFiles(CLIENT_SRC).filter(
      (f) => !f.includes('__tests__'),
    );
    expect(files.length).toBeGreaterThan(50);

    /*
     * ⚠ The store's own mutators are the seam. Only the envelope
     * handler in `useCardFeed` may call them — every other caller would
     * be the client inventing a card, which is the inference this build
     * retires.
     */
    const writers: string[] = [];
    for (const file of files) {
      const rel = relative(CLIENT_SRC, file).replace(/\\/g, '/');
      if (rel === 'store/cardFeedSlice.ts') continue;
      const text = readFileSync(file, 'utf8');
      if (/\.(openCard|closeCard|setCardRecords|setCardPinnedState)\(/.test(text)) {
        writers.push(rel);
      }
    }
    expect(writers).toEqual(['components/cards/useCardFeed.ts']);
  });
});
