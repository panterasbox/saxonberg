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
import { CARD_IDS, SHIPPED_ARRANGEMENT_CARDS } from '@saxonberg/types';

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
      for (const m of text.matchAll(/CardApi\.(open|push|applyArrangement)\(/g)) {
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
     * ⭐ Every shipped mint site, by name.
     *
     * Eight controllers open cards directly (nine calls — `look` opens
     * two). Three more apply an ARRANGEMENT: `cockpit mode`, `cockpit
     * layout`, and — new here — `Avatar.enter`, which is what made a
     * saved workspace something you can simply return to rather than
     * something you have to switch modes twice to get back. And the
     * prompt substrate PUSHES, because a question is the one card
     * nobody types a command to get. And `sense` opens one because
     * ARRIVAL auto-senses — walking into a room is how most room cards
     * are born, and nobody types a command for that either.
     *
     * Asserted as a SET so a new one is a deliberate edit here rather
     * than a silent widening.
     */
    expect(sites.sort()).toEqual(
      [
        'mud/obj/Avatar.ts:applyArrangement',
        'mud/obj/api/PromptLogic.ts:push',
        'mud/obj/command/author/CmsController.ts:open',
        'mud/obj/command/author/StudioController.ts:open',
        'mud/obj/command/perception/LookController.ts:open',
        'mud/obj/command/perception/LookController.ts:open',
        'mud/obj/command/perception/SenseController.ts:open',
        'mud/obj/command/shell/CockpitModeController.ts:applyArrangement',
        'mud/obj/command/shell/LayoutController.ts:applyArrangement',
        'mud/obj/command/social/WhoController.ts:open',
        'mud/obj/command/system/GitController.ts:open',
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
    /*
     * Every row a command opens. `prompt` is the one that is PUSHED —
     * there is no verb for being asked a question — and it is the only
     * one absent here.
     */
    expect([...declared].sort()).toEqual(
      [
        'cms',
        'git',
        'help',
        'news',
        'studio',
        'subject',
        'who',
        'wiki',
      ].sort(),
    );
  });

  /**
   * ⚠⚠ **Found by DRIVING.** A verb whose card is reachable only by an
   * arrangement contradicts the governing rule; a verb-level validator
   * makes it exactly that for anyone the validator refuses.
   *
   * `press` carried `requiresPublisher` at VERB level, so a player
   * holding no publishing position was refused *"there is nobody you
   * can press as"* for a bare `press` — a publishing answer to a
   * reading question. The gate moved to the publishing SUBCOMMANDS.
   */
  it('⚠⚠ no card-opening verb is gated by a verb-level validator its READ does not need', () => {
    const press = readFileSync(
      join(SERVER_SRC, 'mud', 'cmd', 'system', 'press.yaml'),
      'utf8',
    );
    // The verb itself gates nothing — bare `press` is the read.
    expect(press).toMatch(/^validators: \[\]$/m);
    // …and each publishing subcommand carries the gate itself. Three,
    // asserted as a count: a gate that quietly moved to two of three
    // would be a hole.
    expect(
      [...press.matchAll(/requiresPublisher/g)].length,
      'post / edit / retract must each carry the publisher gate',
    ).toBe(3);
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

/**
 * ⭐⭐ **Every declared card kind has a way to be BORN.**
 *
 * The site list above enumerates eleven mint sites by name and would
 * have gone on passing forever with a card kind that had none — which
 * is exactly what happened: `prompt` was a full catalogue row with a
 * settle path, a client body and five green tests, and **`CardApi.push`
 * had zero production callers**. The card could not exist. Found by
 * driving `wiki create`: the prompt strip opened and the feed stayed
 * empty.
 *
 * ⚠ The list and this are different questions — *is every mint
 * accounted for* versus *is every kind reachable* — and a build needs
 * both. This one is the harder half to notice missing.
 */
describe('a declared card is a reachable card', () => {
  it('⭐ every CardId is minted by a command or shipped in an arrangement', () => {
    const files = sourceFiles(join(SERVER_SRC, 'mud')).filter(
      (f) => !f.includes('__tests__'),
    );
    const born = new Set<string>();

    // Named in a shipped arrangement — pushed at login / mode switch.
    for (const byArrangement of Object.values(SHIPPED_ARRANGEMENT_CARDS)) {
      for (const list of Object.values(byArrangement)) {
        for (const id of list) born.add(id);
      }
    }

    // Minted directly by server code.
    for (const file of files) {
      const rel = relative(SERVER_SRC, file).replace(/\\/g, '/');
      if (rel === 'mud/obj/CardRegistry.ts') continue;
      if (rel === 'mud/obj/api/CardLogic.ts') continue;
      if (rel === 'mud/api/card.ts') continue;
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(
        /CardApi\.(?:open|push)\(\s*[A-Za-z0-9_.]+\s*,\s*['"]([a-z]+)['"]/g,
      )) {
        born.add(m[1]!);
      }
    }

    const orphans = CARD_IDS.filter((id) => !born.has(id));
    expect(
      orphans,
      `these card kinds are declared but nothing can open them: ${orphans.join(', ')}`,
    ).toEqual([]);
    // ⚠ A scan that matched nothing would pass identically.
    expect(born.size).toBeGreaterThanOrEqual(CARD_IDS.length);
  });
});
