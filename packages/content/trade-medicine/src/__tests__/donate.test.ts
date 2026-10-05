/**
 * `donate` (blood build D8/D10) — the gift credit and its asymmetry. A
 * PLAYER giving THEIR OWN blood earns a public renown reaction; an NPC
 * giving earns nothing (plumbing); giving somebody else's unit earns
 * nothing. `RenownApi.append` is the credit's observable signal (it is
 * only reached on the credit path); the disposition half of the credit is
 * proven by the W2 graft test, and the full fold by the W6 drive.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DonateController from '../idea/cmd/medical/DonateController';
import BloodWindow from '../thing/BloodWindow';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import { HasInteractiveMixin } from '@saxonberg/server/mud/lib/connection/HasInteractive';
import Chest from '@saxonberg/server/mud/platform/thing/Chest';
import Receptacle from '@saxonberg/server/mud/platform/thing/Receptacle';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { RenownApi } from '@saxonberg/server/mud/api/renown';
import { ScheduleApi } from '@saxonberg/server/mud/api/schedule';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
  withRootContext,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';

class TestPlayer extends HasInteractiveMixin(Character) {
  static override _mixinName = 'TestPlayer';
}
class TestNpc extends Character {}

const BLOOD_MATERIAL = '/stuff/idea/material/tissue/blood';
let seq = 0;

function silence(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}
const ctxFor = (actor: unknown): CommandContext =>
  ({ commandGiver: actor, location: null, note: vi.fn() } as unknown as CommandContext);

function seedBloodMaterial(): Material {
  const existing = StuffApi.findByTemplatePath<Material>(BLOOD_MATERIAL);
  if (existing) return existing;
  const m = makeStuff(() => new Material());
  m.setTags(['tissue', 'blood', 'liquid', 'organic']);
  stampTemplatePathForTest(m, BLOOD_MATERIAL);
  return m;
}

function bag(donorId: string): Stuff {
  const b = makeStuff(() => new Receptacle());
  (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(0.5, 'L'));
  const slot = BulkableApi.slotFor(b, undefined)!;
  slot.setMaterial(seedBloodMaterial());
  slot.setAmount(Quantity.of(0.45, 'L'));
  slot.setPayload({
    blood: { speciesPath: '', system: '', type: 'O', labelled: true, donorIdentityPath: donorId },
  });
  return b as unknown as Stuff;
}

function windowWithVault(): BloodWindow {
  const vault = makeStuff(() => new Chest());
  stampTemplatePathForTest(vault, `/world/x/thing/vault-${seq++}`);
  const w = makeStuff(() => new BloodWindow());
  stampTemplatePathForTest(w, `/world/x/thing/window-${seq++}`);
  w.setVaultPaths([vault.getTemplatePath()!]);
  return w;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  seq = 0;
  silence();
  vi.spyOn(RenownApi, 'append').mockResolvedValue(undefined);
  vi.spyOn(ScheduleApi, 'schedule').mockReturnValue({ cancel: () => {} } as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

async function runDonate(giver: Stuff, b: Stuff, w: BloodWindow): Promise<void> {
  ContainmentApi.move(b as Stuff & Containable, giver as Stuff & Container);
  await withRootContext(giver, 'donate', () =>
    makeStuff(() => new DonateController()).execute(
      { bag: { stuff: b } as unknown as MqlOneResult, window: { stuff: w } as unknown as MqlOneResult },
      ctxFor(giver),
    ),
  );
}

describe('donate — the gift credit', () => {
  it('⭐ a player giving their OWN blood earns a renown reaction', async () => {
    const giver = makeStuff(() => new TestPlayer());
    stampTemplatePathForTest(giver, '/platform/agent/Avatar/donor-p');
    const w = windowWithVault();
    await runDonate(giver, bag(giver.getIdentityPath()!), w);
    expect(RenownApi.append).toHaveBeenCalledWith(
      expect.objectContaining({ subject: giver.getIdentityPath(), kind: 'reaction' }),
    );
  });

  it('an NPC giving earns nothing (plumbing)', async () => {
    const giver = makeStuff(() => new TestNpc());
    stampTemplatePathForTest(giver, '/platform/agent/Avatar/donor-npc');
    const w = windowWithVault();
    await runDonate(giver, bag(giver.getIdentityPath()!), w);
    expect(RenownApi.append).not.toHaveBeenCalled();
  });

  it("a player giving someone ELSE's unit earns nothing", async () => {
    const giver = makeStuff(() => new TestPlayer());
    stampTemplatePathForTest(giver, '/platform/agent/Avatar/donor-p2');
    const w = windowWithVault();
    await runDonate(giver, bag('/who/somebody-else'), w);
    expect(RenownApi.append).not.toHaveBeenCalled();
  });
});
