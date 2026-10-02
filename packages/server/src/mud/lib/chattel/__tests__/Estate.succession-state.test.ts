/**
 * ⭐ The estate's succession state round-trips on its own host.
 *
 * `escheatedAt` and `beneficiary` used to be declared on `Avatar`
 * while `EstateMixin` carried `static fieldMeta = {}` — the mixin that
 * behaves on them held none of them. They are on the mixin now, and
 * composing it claims *this host's goods can escheat and pass to a
 * beneficiary*, which is the same claim holding them already made.
 *
 * ⚠⚠ THE TRAP THIS TEST FOUND, on its first run. `captureState` runs
 * a layer's `captureSlice` **or** its declared `fieldMeta` — never
 * both. `EstateMixin` has a `captureSlice`, so the two fields were
 * declared, visible to `getAllPersistentFields`, and **silently never
 * written**. They ride the slice now. A getter check would have
 * passed; only a capture → store → materialize proof catches it.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EstateMixin } from '../Estate';
import { PersistableMixin } from '../../persistence/Persistable';
import { Idea } from '../../stuff/Idea';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { Document } from '../../persistence/Document';
import { PersistableApi } from '../../../api/persistable';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { ParcelApi } from '../../../api/parcel';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import {
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class EstateHost extends PersistableMixin(
  EstateMixin(Idea),
) {}

let snapshots: Record<string, unknown>[] = [];

describe('⭐ the estate holds its own succession state', () => {
  beforeEach(() => {
    snapshots = [];
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
      if (col !== 'holder_snapshots') return [];
      return snapshots.filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      );
    });
    const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
      if (col !== 'holder_snapshots') return 'id';
      const i = snapshots.findIndex(
        (d) => d.scope === doc.scope && d.owner === doc.owner,
      );
      if (i >= 0) {
        snapshots[i] = { ...doc, _id: snapshots[i]!._id };
        return snapshots[i]!._id as string;
      }
      const _id = String(snapshots.length + 1);
      snapshots.push({ ...doc, _id });
      return _id;
    });
    vi.spyOn(PersistenceManager, 'get').mockReturnValue({
      isConnected: () => true,
      save,
      find,
      findById: vi.fn(),
      delete: vi.fn(),
    } as unknown as PersistenceManager);
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({
      kind: 'group',
      name: 'lounge',
    });
    makeStuffAtPath(
      () => new TemplateApplier(),
      TemplateApplier.templatePath,
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⚠⚠ they are NOT declared fields — a slice-bearing layer never contributes its own', () => {
    // The thing that looks right and is wrong. If someone "fixes" this
    // by adding them to `EstateMixin.fieldMeta`, they stop persisting
    // and nothing else fails.
    const fields = MixinApi.getAllPersistentFields(EstateHost);
    expect(fields).not.toContain('escheatedAt');
    expect(fields).not.toContain('beneficiary');
  });

  it('both fields survive capture → holder_snapshots → materialize', async () => {
    const key = '/platform/agent/Avatar/estate-1';
    const host = makeStuffAtPath(() => new EstateHost(), key);
    host.setEscheatedAt(1_700_000_000_000);
    host.setBeneficiary('/platform/agent/Avatar/heir-1');

    await PersistableApi.capture(host, key);
    expect(JSON.stringify(snapshots)).toContain('"beneficiary"');
    expect(JSON.stringify(snapshots)).toContain('/platform/agent/Avatar/heir-1');

    StuffApi.unregister(host);
    const reborn = makeStuffAtPath(() => new EstateHost(), key);
    await PersistableApi.materialize(reborn, key);

    expect(reborn.getEscheatedAt()).toBe(1_700_000_000_000);
    expect(reborn.getBeneficiary()).toBe('/platform/agent/Avatar/heir-1');
  });

  it('the setters keep their per-field invariants', () => {
    const host = makeStuffAtPath(
      () => new EstateHost(),
      '/platform/agent/Avatar/estate-2',
    );
    host.setEscheatedAt(-5);
    expect(host.getEscheatedAt()).toBe(0);
    host.setEscheatedAt(10.7);
    expect(host.getEscheatedAt()).toBe(10);
    host.setBeneficiary('  /platform/agent/Avatar/heir-2  ');
    expect(host.getBeneficiary()).toBe('/platform/agent/Avatar/heir-2');
  });

  it('a never-escheated host records its defaults and no entries', async () => {
    const key = '/platform/agent/Avatar/estate-3';
    const host = makeStuffAtPath(() => new EstateHost(), key);
    await PersistableApi.capture(host, key);
    expect(JSON.stringify(snapshots)).toContain('"entries":[]');
    expect(JSON.stringify(snapshots)).toContain('"beneficiary":""');
  });
});
