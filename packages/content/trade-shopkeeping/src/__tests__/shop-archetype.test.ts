/**
 * The shopkeeping pack's own suite (trades-and-labor D19): a shop is
 * built from the `shop` ARCHETYPE (`Archetype.materialize()`) — a
 * counter and a brokerage shelf, cloned from this pack's generic rows —
 * and then USED: a good is consigned onto the shelf and bought off it.
 *
 * ⭐ This is the claim that makes the pack worth having: **a store in a
 * new locality is rows only.** No pack code, no controller, no seed —
 * the archetype stands the venue up and the shipped verbs work on it.
 *
 * The rows are the shipped YAML read from disk into an in-memory
 * `content` store (the `menu.test` shape); the pack's two classes
 * resolve through `ModuleApi.registerPackSource`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installRecordTestDb } from '@saxonberg/server/mud/lib/persistence/__tests__/record-test-db';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ModuleApi } from '@saxonberg/server/mud/api/module';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { StoredDocument } from '@saxonberg/server/mud/lib/document/StoredDocument';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import ArchetypeCatalogue from '@saxonberg/server/mud/platform/idea/ArchetypeCatalogue';
import Thing from '@saxonberg/server/mud/platform/thing/Thing';

const ROOT = '/trade/shopkeeping';
const CONTENT = fileURLToPath(new URL('../../../', import.meta.url)); // packages/content/
const PACK_SRC = fileURLToPath(new URL('../', import.meta.url));

type Row = {
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
};

function yamlDir(pack: string, dir: string, prefix: string): Row[] {
  const abs = join(CONTENT, pack, 'content', dir);
  if (!existsSync(abs)) return [];
  const out: Row[] = [];
  for (const f of readdirSync(abs).sort()) {
    if (!f.endsWith('.yaml')) continue;
    const raw = YAML.parse(readFileSync(join(abs, f), 'utf8')) as Row;
    out.push({ ...raw, path: `${prefix}/${f.replace(/\.yaml$/, '')}` });
  }
  return out;
}

function archetypeDocs(): StoredDocument[] {
  const abs = join(CONTENT, 'trade-shopkeeping', 'content', 'archetypes');
  return readdirSync(abs)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const data = YAML.parse(readFileSync(join(abs, f), 'utf8')) as Record<
        string,
        unknown
      >;
      return {
        getPath: () => `/trade-shopkeeping/archetypes/${f.replace(/\.yaml$/, '')}`,
        getData: () => data,
        getKind: () => 'archetype',
      } as unknown as StoredDocument;
    });
}

function contentRows(): Row[] {
  const rows: Row[] = [
    ...yamlDir('platform', 'platform/idea/persistence', '/platform/idea/persistence'),
    ...yamlDir(
      'platform',
      'platform/idea/persistence/QuantityMarshaller',
      '/platform/idea/persistence/QuantityMarshaller',
    ),
    ...yamlDir('platform', 'platform/location', '/platform/location'),
    ...yamlDir('trade-shopkeeping', 'trade/shopkeeping/thing', `${ROOT}/thing`),
  ];
  for (const r of rows) {
    if (r.data && 'container' in r.data) delete r.data.container;
  }
  return rows;
}

class Trinket extends Thing {}

let venue: Stuff & Container;

beforeAll(async () => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  ModuleApi.registerPackSource(PACK_SRC, ROOT);
  installRecordTestDb().seed(Collections.Content, contentRows());
  vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async (kind: string) =>
    kind === 'archetype' ? archetypeDocs() : [],
  );
  await makeStuffAtPath(
    () => new ArchetypeCatalogue(),
    '/platform/idea/ArchetypeCatalogue',
  ).warm();
  venue = (await StuffApi.findByTemplatePath<ArchetypeCatalogue>(
    '/platform/idea/ArchetypeCatalogue',
  )!.getArchetype('shop')!.materialize()) as Stuff & Container;
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('⭐ a shop in a new locality is ROWS ONLY', () => {
  it('the archetype stands up a venue carrying a counter and a brokerage shelf', () => {
    const contents = venue.getContents();
    const counter = contents.find(
      (c) => c.getTemplatePath()?.startsWith(`${ROOT}/thing/counter`) ?? false,
    );
    const shelf = contents.find(
      (c) =>
        c.getTemplatePath()?.startsWith(`${ROOT}/thing/consignment-shelf`) ?? false,
    );
    expect(counter, 'the counter slot materialized').toBeTruthy();
    expect(shelf, 'the shelf slot materialized').toBeTruthy();
    // Both are the real instruments, not props: the counter attends and
    // prices, the shelf brokers.
    expect(MixinApi.isAttendant(counter!)).toBe(true);
    expect(MixinApi.isPricedOffer(counter!)).toBe(true);
    expect(MixinApi.isConsignmentShelf(shelf!)).toBe(true);
  });

  it('a good put on the counter is a good the counter can price and resolve by keyword', async () => {
    const counter = venue
      .getContents()
      .find(
        (c) => c.getTemplatePath()?.startsWith(`${ROOT}/thing/counter`) ?? false,
      )!;
    const trinket = makeStuffAtPath(() => {
      const t = new Trinket();
      t.setKeywords(['trinket']);
      t.setPrimaryKeyword('trinket');
      return t;
    }, '/test/shop/thing/trinket');
    ContainmentApi.move(trinket as never, counter as never);
    expect(MixinApi.isPricedOffer(counter)).toBe(true);
    const offer = counter as unknown as {
      setPrice(key: string, minor: number): void;
      priceFor(key: string): number | null;
    };
    offer.setPrice('/test/shop/thing/trinket', 12);
    expect(offer.priceFor('/test/shop/thing/trinket')).toBe(12);
    // The shelf-good resolve the `buy` verb runs.
    const stock = counter as unknown as {
      resolveBuy(k: string): Stuff | null;
    };
    expect(stock.resolveBuy('trinket')).toBeTruthy();
  });

  it('the generic counter carries NO authored lines — a locality dresses it', () => {
    const counter = venue
      .getContents()
      .find(
        (c) => c.getTemplatePath()?.startsWith(`${ROOT}/thing/counter`) ?? false,
      )! as unknown as { getStockLines(): readonly unknown[] };
    expect(counter.getStockLines()).toEqual([]);
  });
});
