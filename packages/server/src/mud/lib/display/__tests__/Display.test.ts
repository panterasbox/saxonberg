/**
 * The display substrate (D12): the four pairing policies, the resolver
 * ladder (held → in sight → by mind), the projection rule (a card to
 * every perceiving viewer in the room, never to one elsewhere; a stream
 * into every such viewer's `cockpit.watch` with the display marker), and
 * the arrival/departure hook. The thief case — the house tablet in a
 * non-staff hand shows the sheet, the seat stays the wallet's — is
 * `HouseStockCard.test.ts` + `HouseAccount.test.ts`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DisplayApi } from '../../../api/display';
import { StuffApi } from '../../../api/stuff';
import { EventApi } from '../../../api/event';
import { ShadowApi } from '../../../api/shadow';
import { CardApi } from '../../../api/card';
import { ConnectionApi } from '../../../api/connection';
import { ContainmentApi } from '../../../api/containment';
import { EmploymentApi } from '../../../api/employment';
import { BankingApi } from '../../../api/banking';
import { MqlSubscriptionApi } from '../../../api/mql-subscription';
import EventRegistry from '../../../platform/idea/EventRegistry';
import Interactive from '../../../platform/idea/Interactive';
import Avatar from '../../../platform/agent/Avatar';
import Room from '../../../platform/location/Room';
import Tablet from '../../../platform/thing/Tablet';
import Screen from '../../../platform/thing/Screen';
import Remote from '../../../platform/thing/Remote';
import BusinessEntity from '../../../platform/idea/Business';
import Thing from '../../stuff/Thing';
import { SlottedMixin } from '../../slot/Slotted';
import { EmployedMixin } from '../../employment/Employed';
import { AetherMixin } from '../../message/Aether';
import { SensorMixin } from '../../message/Sensor';
import { NamedMixin } from '../../description/Named';
import { OrganismMixin } from '../../species/Organism';
import { ContainerMixin } from '../../spatial/Container';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Species from '../../../platform/idea/species/Species';
import AetherImplant from '../../../platform/thing/AetherImplant';
import type { FieldMeta } from '../../mixin';
import type { Stuff } from '../../stuff/Stuff';
import type { WatchTarget } from '@saxonberg/types';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

const BIZ = '/stuff/test/display/business';
const REMOTE = '/stuff/test/display/remote';

interface Viewer {
  avatar: Avatar;
  interactive: Interactive;
  envelopes: { type: string; [k: string]: unknown }[];
  watched(): WatchTarget | null;
  cards(): { type: string; [k: string]: unknown }[];
}

let seq = 0;
async function makeViewer(name: string, room: Room): Promise<Viewer> {
  seq += 1;
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName(name);
  stampTemplatePathForTest(avatar, `/platform/agent/Avatar/${name.toLowerCase()}`);
  ContainmentApi.move(avatar, room);
  const interactive = await StuffApi.create(
    () => new Interactive(`sock-${seq}`, `sess-${seq}`, { _id: `u${seq}` } as never),
  );
  ConnectionApi.transfer(interactive, avatar);
  const envelopes: { type: string; [k: string]: unknown }[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as never);
  });
  vi.spyOn(avatar, 'pushClientStateUpdate').mockImplementation(() => {});
  return {
    avatar,
    interactive,
    envelopes,
    watched: () => avatar.getClientState<WatchTarget | null>('cockpit.watch') ?? null,
    cards: () => envelopes.filter((e) => e.type === 'card-opened'),
  };
}

async function makeBusiness(): Promise<BusinessEntity> {
  const biz = makeStuffAtPath(() => new BusinessEntity(), BIZ);
  biz.proprietorPath = '';
  biz.positions = [
    { key: 'keeper', label: 'keeping the bar', wageRate: 0, confers: [], purchases: true },
  ];
  biz.banksAt = BankingApi.defaultCustodianBank();
  return biz;
}

/** An embodied, attunable actor (the DmController fixture's shape). */
class Actor extends EmployedMixin(
  SlottedMixin(
    ContainerMixin(AetherMixin(SensorMixin(NamedMixin(OrganismMixin(Thing))))),
  ),
) {
  static fieldMeta: FieldMeta = {};
  override staticSlots = [{ name: 'cranial', accepts: 'SlottableMixin' as const }];
}
function makeActor(name: string, attuned: boolean): Actor {
  seq += 1;
  const biped = makeStuffAtPath(() => new BodyPlan(), `/stuff/idea/species/BodyPlan/display-${seq}`);
  biped.setSensoryPorts([{ modality: 'vision', count: 2, position: 'frontal' }]);
  biped.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const species = makeStuffAtPath(() => new Species(), `/stuff/idea/species/animalia/display-${seq}`);
  species.setBodyPlan(biped);
  const actor = makeStuffAtPath(() => new Actor(), `/stuff/test/display/actor-${seq}`);
  actor.setSpecies(species);
  actor.setName(name);
  if (attuned) actor.occupy(makeStuff(() => new AetherImplant()), 'cranial');
  return actor;
}

describe('DisplayApi', () => {
  let booth: Room;
  let cellar: Room;

  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    CardApi._clearAllForTesting();
    const reg = await StuffApi.create(() => new EventRegistry());
    stampTemplatePathForTest(reg, '/platform/idea/EventRegistry');
    EventApi._setRegistryForTesting(reg);
    booth = await StuffApi.create(() => new Room());
    booth.setShortDescription('the booth');
    cellar = await StuffApi.create(() => new Room());
    cellar.setShortDescription('the cellar');
  });

  describe('mayDrive — the four pairings', () => {
    it('held: whoever carries it', async () => {
      const a = await makeViewer('Ann', booth);
      const b = await makeViewer('Bob', booth);
      const tablet = await StuffApi.create(() => new Tablet());
      tablet.setPairing('held');
      ContainmentApi.move(tablet, a.avatar);
      expect(await DisplayApi.mayDrive(a.avatar, tablet)).toBe(true);
      expect(await DisplayApi.mayDrive(b.avatar, tablet)).toBe(false);
    });

    it('remote: whoever carries the paired remote', async () => {
      const a = await makeViewer('Ann', booth);
      const b = await makeViewer('Bob', booth);
      const tv = await StuffApi.create(() => new Screen());
      tv.setPairing('remote');
      tv.setRemote(REMOTE);
      ContainmentApi.move(tv, booth);
      const remote = makeStuffAtPath(() => new Remote(), REMOTE);
      ContainmentApi.move(remote, a.avatar);
      expect(await DisplayApi.mayDrive(a.avatar, tv)).toBe(true);
      expect(await DisplayApi.mayDrive(b.avatar, tv)).toBe(false);
    });

    it('staff: a position at the principal, never a bare holder', async () => {
      const biz = await makeBusiness();
      const keeper = await makeViewer('Mara', booth);
      const thief = await makeViewer('Tom', booth);
      EmploymentApi.hire(biz, keeper.avatar, 'keeper');
      const tablet = await StuffApi.create(() => new Tablet());
      tablet.setPairing('staff');
      tablet.setPrincipal(BIZ);
      ContainmentApi.move(tablet, thief.avatar);
      expect(await DisplayApi.mayDrive(keeper.avatar, tablet)).toBe(true);
      expect(await DisplayApi.mayDrive(thief.avatar, tablet)).toBe(false);
    });

    it('open: anyone in reach, nobody elsewhere', async () => {
      const here = await makeViewer('Ann', booth);
      const away = await makeViewer('Bob', cellar);
      const board = await StuffApi.create(() => new Screen());
      board.setPairing('open');
      ContainmentApi.move(board, booth);
      expect(await DisplayApi.mayDrive(here.avatar, board)).toBe(true);
      expect(await DisplayApi.mayDrive(away.avatar, board)).toBe(false);
    });
  });

  describe('resolveFor — the ladder', () => {
    it('a held screen wins, whatever its pairing (the thief reads the sheet)', async () => {
      const thief = await makeViewer('Tom', booth);
      const tablet = await StuffApi.create(() => new Tablet());
      tablet.setPairing('staff');
      tablet.setPrincipal(BIZ);
      ContainmentApi.move(tablet, thief.avatar);
      const r = await DisplayApi.resolveFor(thief.avatar);
      expect(r?.display.stuffId).toBe(tablet.stuffId);
      expect(r?.mode).toBe('hand');
    });

    it('then a screen in sight you may drive; nothing from another room by hand', async () => {
      const a = await makeViewer('Ann', booth);
      const tv = await StuffApi.create(() => new Screen());
      tv.setPairing('open');
      ContainmentApi.move(tv, booth);
      expect((await DisplayApi.resolveFor(a.avatar))?.display.stuffId).toBe(tv.stuffId);
      const b = await makeViewer('Bob', cellar);
      expect(await DisplayApi.resolveFor(b.avatar)).toBeNull();
    });

    it('then a paired screen anywhere, by mind — only with an active attunement', async () => {
      const biz = await makeBusiness();
      const tablet = await StuffApi.create(() => new Tablet());
      tablet.setPairing('staff');
      tablet.setPrincipal(BIZ);
      ContainmentApi.move(tablet, booth);
      const attuned = makeActor('Mara', true);
      const deaf = makeActor('Augie', false);
      ContainmentApi.move(attuned, cellar);
      ContainmentApi.move(deaf, cellar);
      EmploymentApi.hire(biz, attuned as unknown as Stuff, 'keeper');
      EmploymentApi.hire(biz, deaf as unknown as Stuff, 'keeper');
      const r = await DisplayApi.resolveFor(attuned as unknown as Stuff);
      expect(r?.display.stuffId).toBe(tablet.stuffId);
      expect(r?.mode).toBe('mind');
      expect(await DisplayApi.resolveFor(deaf as unknown as Stuff)).toBeNull();
    });
  });

  describe('show — the projection rule', () => {
    it('a card goes to every viewer who sees the screen and to nobody elsewhere', async () => {
      const a = await makeViewer('Ann', booth);
      const b = await makeViewer('Bob', booth);
      const c = await makeViewer('Cy', cellar);
      const tablet = await StuffApi.create(() => new Tablet());
      tablet.setPairing('held');
      ContainmentApi.move(tablet, a.avatar);
      DisplayApi.show(tablet, { kind: 'card', cardId: 'who', key: 'who' });
      expect(a.cards().length).toBe(1);
      expect(b.cards().length).toBe(1);
      expect(c.cards().length).toBe(0);
      expect(a.cards()[0]!.title).toBe(tablet.getPresentation());
    });

    it('a stream writes each viewer\'s cockpit.watch with the display marker; clear empties it', async () => {
      const a = await makeViewer('Ann', booth);
      const c = await makeViewer('Cy', cellar);
      const tv = await StuffApi.create(() => new Screen());
      tv.setPairing('open');
      tv.setShortDescription('the booth TV');
      ContainmentApi.move(tv, booth);
      DisplayApi.show(tv, {
        kind: 'stream',
        target: { platform: 'twitch', channel: 'shroud' },
        label: 'Twitch #shroud',
      });
      expect(a.watched()?.display?.stuffId).toBe(tv.stuffId);
      expect(a.watched()?.display?.label).toBe(tv.getPresentation());
      expect(c.watched()).toBeNull();
      DisplayApi.clear(tv);
      expect(a.watched()).toBeNull();
    });

    it('a source policy refuses the other kind', async () => {
      const tablet = await StuffApi.create(() => new Tablet());
      tablet.setSourcePolicy('cards');
      expect(() =>
        DisplayApi.show(tablet, {
          kind: 'stream',
          target: { platform: 'twitch', channel: 'x' },
          label: 'x',
        }),
      ).toThrow(/does not show/);
    });
  });

  describe('arrival and departure', () => {
    it('walking in shows what the screen shows; walking out clears it', async () => {
      const tv = await StuffApi.create(() => new Screen());
      tv.setPairing('open');
      ContainmentApi.move(tv, booth);
      DisplayApi.show(tv, {
        kind: 'stream',
        target: { platform: 'kick', channel: 'xqc' },
        label: 'Kick #xqc',
      });
      const late = await makeViewer('Lou', cellar);
      expect(late.watched()).toBeNull();
      late.avatar.teleport(booth, { silent: true });
      expect(late.watched()?.display?.stuffId).toBe(tv.stuffId);
      late.avatar.teleport(cellar, { silent: true });
      expect(late.watched()).toBeNull();
    });

    it('a personal watch is not cleared by leaving a room', async () => {
      const v = await makeViewer('Lou', cellar);
      const personal: WatchTarget = { platform: 'twitch', channel: 'mine' };
      v.avatar.setClientState('cockpit.watch', personal);
      v.avatar.teleport(booth, { silent: true });
      expect(v.watched()).toEqual(personal);
    });
  });
});
