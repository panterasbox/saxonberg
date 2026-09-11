/**
 * ResidenceCatalogue — the residence system's roster of itself.
 *
 * Three claims carry the whole design, and each has a way of being
 * quietly wrong:
 *
 *   1. ⭐ **The roster derives from the ROW SHAPE, not from a class.** An
 *      institution is any row that authors `data.parentExtent`. Deriving
 *      by class would miss `DormWarren` — eternal-university's, straight
 *      off the kernel's `OuterWarren` — so the test stands an
 *      institution the pack does not own and expects it found.
 *   2. **Live-only.** A row whose instance is not standing is not in the
 *      answer; that is exactly the population the world walk returned,
 *      and a memo of ROWS that forgot to check would quietly widen it.
 *   3. **Innermost first.** A building inside a district is only
 *      resolvable if the longer extent answers before the shorter one.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ResidenceCatalogue, {
  RESIDENCE_CATALOGUE_PATH,
} from '../idea/ResidenceCatalogue';
import PlatBook from '../idea/PlatBook';
import { OuterWarren } from '@saxonberg/server/mud/lib/location/OuterWarren';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Attachment } from '@saxonberg/server/mud/lib/location/Warren';

const CAMPUS = '/world/eternal/duncan-hall/dorms';
const HOUSE = '/world/terminus/mayfield-row/seznick-house';
const DISTRICT = '/world/terminus/mayfield-row';
const HILLS = '/world/terminus/hinkley-hills';

const DORM_ROW = '/world/eternal/duncan-hall/idea/dorm-warren';
const HOUSE_ROW = '/world/terminus/mayfield-row/seznick-house/building';
const DISTRICT_ROW = '/world/terminus/mayfield-row/idea/district-warren';
const BOOK_ROW = '/world/terminus/hinkley-hills/idea/plat-book';
const GHOST_ROW = '/world/nowhere/idea/never-stood-up';

/**
 * A stand-in institution. `TestInstitution` is deliberately NOT one of
 * the residence pack's own classes — it stands in for `DormWarren`,
 * which belongs to another pack entirely.
 */
class TestInstitution extends OuterWarren {
  public standing: (Stuff & Container)[] = [];
  override holdings(): (Stuff & Container)[] {
    return this.standing;
  }
  protected async standUpHolding(): Promise<Stuff & Container> {
    throw new Error('unused');
  }
  protected circulationTemplateFor(): string | null {
    return null;
  }
  protected async wireCirculationNode(): Promise<void> {}
  protected async entryEdgeFor(): Promise<null> {
    return null;
  }
  protected occupantsOf(): (Stuff & Container)[] {
    return [];
  }
  protected async createMember(): Promise<Stuff & Container> {
    throw new Error('unused');
  }
  async admitArrival(): Promise<void> {}
  protected attachmentFor(): Attachment {
    throw new Error('unused');
  }
  protected async reconcile(): Promise<void> {}
  protected async wireHostFixtures(): Promise<void> {}
  protected async unwireHostFixtures(): Promise<void> {}
}

let rows: Array<Record<string, unknown>>;

/**
 * A store that answers the ONE query the catalogue makes —
 * `{ 'data.parentExtent': { $exists: true } }` — and nothing else, so a
 * change of query shape fails here rather than silently returning
 * everything.
 */
function installStore(): void {
  rows = [];
  const find = vi.fn(async (collection: string, q: Record<string, unknown>) => {
    if (collection !== 'content') return [];
    const field = Object.keys(q)[0];
    if (field !== 'data.parentExtent') return [];
    return rows.filter(
      (r) => (r.data as Record<string, unknown> | undefined)?.parentExtent,
    );
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save: vi.fn(async () => 'x'),
    find,
    findById: vi.fn(async () => null),
    delete: vi.fn(async () => {}),
    isConnected: () => true,
  } as unknown as PersistenceManager);
}

function row(path: string, parentExtent: string): void {
  rows.push({ _id: path, path, class: path, data: { parentExtent } });
}

function institutionAt(path: string, keys: string[]): TestInstitution {
  const w = makeStuffAtPath(() => new TestInstitution(), path);
  w.standing = keys.map(
    (k) => ({ holdingKey: () => k }) as unknown as Stuff & Container,
  );
  return w;
}

const catalogue = (): ResidenceCatalogue =>
  makeStuffAtPath(() => new ResidenceCatalogue(), RESIDENCE_CATALOGUE_PATH);

describe('ResidenceCatalogue', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installStore();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('finds an institution whose class belongs to another pack', async () => {
    row(DORM_ROW, CAMPUS);
    institutionAt(DORM_ROW, []);
    const found = await catalogue().institutions();
    expect(found).toHaveLength(1);
    expect(found[0]!.getTemplatePath()).toBe(DORM_ROW);
  });

  it('leaves out a row whose instance is not standing', async () => {
    row(DORM_ROW, CAMPUS);
    row(GHOST_ROW, '/world/nowhere');
    institutionAt(DORM_ROW, []);
    const found = await catalogue().institutions();
    expect(found.map((w) => w.getTemplatePath())).toEqual([DORM_ROW]);
  });

  it('answers innermost first when extents nest', async () => {
    row(HOUSE_ROW, HOUSE);
    row(DISTRICT_ROW, DISTRICT);
    institutionAt(HOUSE_ROW, []);
    institutionAt(DISTRICT_ROW, []);
    const covering = await catalogue().institutionsCovering(`${HOUSE}/unit-1`);
    expect(covering.map((w) => w.getTemplatePath())).toEqual([
      HOUSE_ROW,
      DISTRICT_ROW,
    ]);
  });

  it('covers nothing when no extent contains the key', async () => {
    row(DORM_ROW, CAMPUS);
    institutionAt(DORM_ROW, []);
    expect(await catalogue().institutionsCovering('/world/elsewhere/x')).toEqual(
      [],
    );
    expect(await catalogue().institutionsCovering('')).toEqual([]);
  });

  it('reads the holdings under an extent, and only those', async () => {
    row(DORM_ROW, CAMPUS);
    row(HOUSE_ROW, HOUSE);
    institutionAt(DORM_ROW, [`${CAMPUS}/f1-r1`, `${CAMPUS}/f1-r2`]);
    institutionAt(HOUSE_ROW, [`${HOUSE}/unit-1`]);
    const under = await catalogue().holdingsUnder(CAMPUS);
    const keys = under.map((h) =>
      (h as unknown as { holdingKey(): string }).holdingKey(),
    );
    expect(keys.sort()).toEqual([`${CAMPUS}/f1-r1`, `${CAMPUS}/f1-r2`]);
    expect(await catalogue().holdingsUnder('')).toEqual([]);
  });

  it('separates plat books from institutions on the same query', async () => {
    row(DORM_ROW, CAMPUS);
    row(BOOK_ROW, HILLS);
    institutionAt(DORM_ROW, []);
    makeStuffAtPath(() => new PlatBook(), BOOK_ROW);
    const c = catalogue();
    expect((await c.institutions()).map((w) => w.getTemplatePath())).toEqual([
      DORM_ROW,
    ]);
    expect((await c.platBooks()).map((b) => b.getTemplatePath())).toEqual([
      BOOK_ROW,
    ]);
  });
});
