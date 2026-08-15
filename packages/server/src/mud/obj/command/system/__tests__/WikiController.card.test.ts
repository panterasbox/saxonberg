/**
 * The `publication.wiki` side-channel — the structured twin of what
 * `wiki <page>` sends to the scroll, and the wiki card's only source.
 *
 * ⭐ **The frame carries the body that was already rendered.** That is
 * the whole security argument for having a card at all: the payload
 * inherits the render pipeline's gate rather than re-deriving it, so
 * there is no second path along which over-capability content could
 * reach a client (criterion 24). A card fed from the SOURCE would be
 * exactly that second path, and the leak would be invisible from the
 * scroll, which would still look correct.
 *
 * Everything else here is the card's raw material: the outline (public
 * structure — anchors and heading text), the frontmatter, and
 * `mayEdit`, which is a display hint the verb re-checks on arrival.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WikiController from '../WikiController';
import WikiRegistry from '../../../WikiRegistry';
import WikiRenderer from '../../../WikiRenderer';
import WikiNamespaceZone from '../../../WikiNamespaceZone';
import { Idea } from '../../../../lib/stuff/Idea';
import { CommandApi, type CommandModel } from '../../../../api/command';
import type { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { MessageApi } from '../../../../api/message';
import { AccessApi } from '../../../../api/access';
import { AppApi } from '../../../../api/app';
import { PlayerApi } from '../../../../api/player';
import { ShellApi } from '../../../../api/shell';
import { StuffApi } from '../../../../api/stuff';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { TemplatePaths } from '../../../../lib/paths';
import { installWikiTestDb, type WikiTestDb } from '../../../../lib/wiki/__tests__/wiki-test-db';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { WikiPageFrame } from '@saxonberg/types';
import type { Stuff } from '../../../../lib/stuff/Stuff';

class Principal extends Idea {}

interface SentFrame {
  topic: string;
  /** `meta.carded` — set when the frame's content is also on a card. */
  carded?: true;
  body: string;
  payload: unknown;
}

let db: WikiTestDb;
let registry: WikiRegistry;
let renderer: WikiRenderer;
let zone: WikiNamespaceZone;
let giver: Stuff;
let frames: SentFrame[];

/** The `publication.wiki` frames sent so far, newest last. */
function pageFrames(): WikiPageFrame[] {
  return frames
    .filter((f) => f.topic === 'publication.wiki')
    .map((f) => f.payload as WikiPageFrame);
}

/** The last pushed page frame. */
function lastPage(): WikiPageFrame {
  const all = pageFrames();
  expect(all.length).toBeGreaterThan(0);
  return all[all.length - 1]!;
}

async function run(model: Partial<CommandModel>): Promise<void> {
  const ctrl = makeStuff(() => new WikiController());
  const ctx = CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: null,
    commandText: 'wiki',
    executionId: 'e',
    commandId: 'c',
    verb: 'wiki',
    command: { verbs: ['wiki'] } as unknown as CommandDefinition,
  });
  await ExecutionContextApi.runRoot(null, 'wiki.cmd', async () => {
    ExecutionContextApi.tagActingAuthor(giver);
    await ctrl.execute(model as never, ctx);
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  db = installWikiTestDb();
  db.reset();
  frames = [];
  // Unlike the sibling suites' mock, this one records the TOPIC and
  // the PAYLOAD — they are what this file is about.
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const frame: SentFrame = { topic: '', body: '', payload: undefined };
    const b: Record<string, unknown> = {};
    b.topic = (t: string) => {
      frame.topic = t;
      return b;
    };
    // ⭐ `meta({ carded: true })` — the marker the `shell.result`
    // filter reads. Recorded so a test can assert the read's prose
    // says it is duplicated on a card.
    b.meta = (partial: Record<string, unknown>) => {
      if (partial.carded === true) frame.carded = true;
      return b;
    };
    b.toSelf = (body: unknown, payload?: unknown) => {
      frame.body = String(body);
      frame.payload = payload;
      return b;
    };
    b.send = () => {
      frames.push({ ...frame });
    };
    return b as never;
  });
  registry = makeStuff(() => new WikiRegistry());
  renderer = makeStuff(() => new WikiRenderer());
  zone = makeStuff(() => new WikiNamespaceZone());
  giver = makeStuff(() => new Principal()) as unknown as Stuff;
  vi.spyOn(StuffApi, 'singleton').mockImplementation(
    async (path: string) =>
      (path === TemplatePaths.wikiRegistry
        ? registry
        : path === TemplatePaths.wikiRenderer
          ? renderer
          : zone) as never,
  );
  vi.spyOn(zone, 'lookupField').mockResolvedValue(null);
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
  vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(3 as unknown as never);
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(true);
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

/** An article with two anchored sections and some frontmatter. */
async function seedArticle(): Promise<void> {
  await run({
    subcommand: 'create',
    page: 'oak',
    title: 'Oak',
    body: '# Oak {#oak}\n\nA dense hardwood.\n\n## Uses {#uses}\n\nFurniture.',
    tag: 'material,wood',
  });
}

describe('a read pushes the card its article', () => {
  it('sends one `publication.wiki` frame alongside the prose', async () => {
    await seedArticle();
    frames = [];
    await run({ subcommand: 'read', page: 'oak' });

    expect(pageFrames()).toHaveLength(1);
    expect(frames.some((f) => f.topic === 'shell.result')).toBe(true);
    const page = lastPage();
    expect(page.kind).toBe('wiki-page');
    expect(page.handle).toBe('main:oak');
    expect(page.title).toBe('Oak');
    expect(page.rev).toBe(1);
  });

  it('⭐ carries the RENDERED body, not the source', async () => {
    await seedArticle();
    frames = [];
    await run({ subcommand: 'read', page: 'oak' });

    const page = lastPage();
    // Rendered: the markdown heading has become a tag. Had the frame
    // carried the source, the card would be holding text the gate
    // never saw.
    expect(page.body).toContain('<h1');
    expect(page.body).not.toContain('# Oak');
  });

  it('⭐ over-capability content is absent from the PAYLOAD too', async () => {
    // The one that matters. The card is a second surface; if the
    // payload were built from the source it would be a second leak,
    // and the scroll would still look right.
    await run({
      subcommand: 'create',
      page: 'secrets',
      title: 'Secrets',
      body: 'open prose <spoiler level="3">THE TWIST</spoiler> tail',
    });
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    frames = [];
    await run({ subcommand: 'read', page: 'secrets' });

    const page = lastPage();
    expect(page.body).toContain('open prose');
    expect(page.body).not.toContain('THE TWIST');
    expect(page.body).not.toContain('spoiler');
  });

  it('carries the outline — anchors and heading text', async () => {
    await seedArticle();
    frames = [];
    await run({ subcommand: 'read', page: 'oak' });

    expect(lastPage().sections).toEqual([
      { level: 1, anchor: 'oak', title: 'Oak' },
      { level: 2, anchor: 'uses', title: 'Uses' },
    ]);
  });

  it('carries the frontmatter the card displays', async () => {
    await seedArticle();
    frames = [];
    await run({ subcommand: 'read', page: 'oak' });

    const page = lastPage();
    expect(page.tags).toEqual(['material', 'wood']);
    expect(page.updatedBy).toBeTruthy();
    expect(typeof page.updatedAt).toBe('number');
  });

  it('answers `mayEdit`, so the card does not draw a refused affordance', async () => {
    await seedArticle();
    frames = [];
    await run({ subcommand: 'read', page: 'oak' });
    expect(lastPage().mayEdit).toBe(true);
  });

  it('pushes nothing when there is no page — a miss is an invitation', async () => {
    frames = [];
    await run({ subcommand: 'read', page: 'nothing-here' });
    expect(pageFrames()).toHaveLength(0);
  });
});

describe('a preview says it is one', () => {
  it('flags the frame, and its outline comes from the DRAFT', async () => {
    // Otherwise the card's outline describes the saved page while its
    // body shows the unsaved one.
    await seedArticle();
    frames = [];
    await run({
      subcommand: 'preview',
      page: 'oak',
      body: '# Oak {#oak}\n\n## Rewritten {#rewritten}\n\nnew text',
    });

    const page = lastPage();
    expect(page.preview).toBe(true);
    expect(page.sections.map((s) => s.anchor)).toEqual(['oak', 'rewritten']);
    expect(page.body).toContain('new text');
  });

  it('does not change what the page serves', async () => {
    await seedArticle();
    await run({ subcommand: 'preview', page: 'oak', body: 'draft only' });
    frames = [];
    await run({ subcommand: 'read', page: 'oak' });

    const page = lastPage();
    expect(page.preview).toBeUndefined();
    expect(page.rev).toBe(1);
    expect(page.body).toContain('dense hardwood');
  });
});
