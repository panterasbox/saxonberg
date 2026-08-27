/**
 * TemplateApi.saveTemplate → authorship ledger (the attribution end-to-end).
 * The author is NEVER passed — it is derived from the dispatched execution
 * context (`ExecutionContextApi.getActingAuthor`). Covers:
 *   - a save dispatched as an Avatar (the CMS/`runRoot` shape) attributes the
 *     row to that Avatar's templatePath;
 *   - the author is NOT spoofable from the `data` blob;
 *   - an unattributable context records nothing — no acting principal, or a
 *     non-Avatar principal (e.g. today's pre-contract CMS Root = Backend, or
 *     a system save).
 *
 * `withRootContext(target, …)` plants the Root frame whose principal
 * `getActingAuthor` reads — exactly how the CMS dispatches "as an avatar".
 * Mongo is faked collection-aware (domain + authoring_events).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateApi } from '../template';
import { ProvenanceApi } from '../provenance';
import { ExecutionContextApi } from '../execution-context';
import { WorldClockApi } from '../worldclock';
import { StuffApi } from '../stuff';
import { Idea } from '../../lib/stuff/Idea';
import {
  makeStuffAtPath,
  withRootContext,
} from '../../lib/security/__tests__/test-setup';
import {
  Collections,
  PersistenceManager,
} from '../../../backend/PersistenceManager';

class FakeAvatar extends Idea {}

let stores: Map<string, Record<string, unknown>[]>;
let nextId = 1;

function col(name: string): Record<string, unknown>[] {
  let a = stores.get(name);
  if (!a) {
    a = [];
    stores.set(name, a);
  }
  return a;
}

const LEAF = '/lib/location/CartesianLocation';
const PATH = '/world/gallery/mural';
const ALICE = '/obj/Avatar/alice';

beforeEach(() => {
  stores = new Map();
  nextId = 1;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (c: string, q: Record<string, unknown>) =>
      col(c).filter((d) =>
        Object.entries(q).every(([k, v]) =>
          typeof v === 'string' ? d[k] === v : true
        )
      ) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? String(nextId++);
      col(c).push({ ...doc, _id: id });
      return id;
    }
  );
  WorldClockApi._setNowProviderForTesting(() => 4242);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('TemplateApi.saveTemplate authorship (context-derived)', () => {
  it('attributes the save to the tagged acting Avatar (CMS/runRoot shape)', async () => {
    const avatar = makeStuffAtPath(() => new FakeAvatar(), ALICE);
    await withRootContext(null, 'cms.write', () => {
      ExecutionContextApi.tagActingAuthor(avatar);
      return TemplateApi.saveTemplate(PATH, LEAF, {});
    });

    const ledger = col(Collections.AuthoringEvents);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]!.path).toBe(PATH);
    expect(ledger[0]!.author).toBe(ALICE);
    expect(await ProvenanceApi.authorOf(PATH)).toBe(ALICE);
  });

  it('does NOT read the author from the client-controlled data blob', async () => {
    const avatar = makeStuffAtPath(() => new FakeAvatar(), ALICE);
    await withRootContext(null, 'cms.write', () => {
      ExecutionContextApi.tagActingAuthor(avatar);
      return TemplateApi.saveTemplate(PATH, LEAF, {
        author: '/obj/Avatar/impostor',
        createdByPlayerId: 'evil',
      });
    });
    expect(await ProvenanceApi.authorOf(PATH)).toBe(ALICE); // context wins
  });

  it('records nothing when there is no acting principal (programmatic save)', async () => {
    await TemplateApi.saveTemplate(PATH, LEAF, {});
    expect(col(Collections.AuthoringEvents)).toHaveLength(0);
    expect(await ProvenanceApi.authorOf(PATH)).toBeNull();
  });

  it('records nothing when no acting author is tagged (e.g. pre-contract CMS / system)', async () => {
    // A REST boundary that has not yet tagged its avatar — a safe no-op
    // (today's CMS dispatches without the tag) until the contract lands.
    await withRootContext(null, 'cms.write', () =>
      TemplateApi.saveTemplate(PATH, LEAF, {})
    );
    expect(col(Collections.AuthoringEvents)).toHaveLength(0);
  });
});
