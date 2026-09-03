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
import { CommandController } from '../../command/CommandController';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { EventApi } from '../../../api/event';
import { ShadowApi } from '../../../api/shadow';
import { CardApi } from '../../../api/card';
import { CommandApi } from '../../../api/command';
import { CommandDefinition } from '../../command/CommandDefinition';
import LookController from '../../../platform/idea/cmd/perception/LookController';
import { Mml } from '../../../api/mml';
import { ContainmentApi } from '../../../api/containment';
import { EmploymentApi } from '../../../api/employment';
import { BankingApi } from '../../../api/banking';
import { MqlSubscriptionApi } from '../../../api/mql-subscription';
import EventRegistry from '../../../platform/idea/EventRegistry';
import Interactive from '../../../platform/idea/Interactive';
import Avatar from '../../../platform/agent/Avatar';
import SingletonCartesianLocation from '../../../platform/location/SingletonCartesianLocation';
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
async function makeViewer(name: string, room: SingletonCartesianLocation): Promise<Viewer> {
  seq += 1;
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName(name);
  stampTemplatePathForTest(avatar, `/platform/agent/Avatar/${name.toLowerCase()}`);
  ContainmentApi.move(avatar, room);
  const interactive = await StuffApi.create(
    () => new Interactive(`sock-${seq}`, `sess-${seq}`, { _id: `u${seq}` } as never),
  );
  interactive.transferTo(avatar);
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

/**
 * The implicit-screen ladder is `CommandController.resolveScreen` — the
 * fallback a verb uses when the command named no screen. A one-method
 * controller is the honest seam: it is where the ladder actually lives.
 */
class LadderProbe extends CommandController {
  execute(): void {}
  run(actor: Stuff) {
    return this.resolveScreen(actor as never);
  }
}

function resolveScreenFor(actor: Stuff) {
  return makeStuff(() => new LadderProbe()).run(actor);
}

describe('DisplayMixin — a display drives itself', () => {
  let booth: SingletonCartesianLocation;
  let cellar: SingletonCartesianLocation;

  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    CardApi._clearAllForTesting();
    const reg = await StuffApi.create(() => new EventRegistry());
    stampTemplatePathForTest(reg, '/platform/idea/EventRegistry');
    EventApi._setRegistryForTesting(reg);
    booth = await StuffApi.create(() => new SingletonCartesianLocation());
    booth.setShortDescription('the booth');
    cellar = await StuffApi.create(() => new SingletonCartesianLocation());
    cellar.setShortDescription('the cellar');
  });

  describe('mayDrive — the four pairings', () => {
    it('held: whoever carries it', async () => {
      const a = await makeViewer('Ann', booth);
      const b = await makeViewer('Bob', booth);
      const tablet = await StuffApi.create(() => new Tablet());
      tablet.setPairing('held');
      ContainmentApi.move(tablet, a.avatar);
      expect(await tablet.mayDrive(a.avatar)).toBe(true);
      expect(await tablet.mayDrive(b.avatar)).toBe(false);
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
      expect(await tv.mayDrive(a.avatar)).toBe(true);
      expect(await tv.mayDrive(b.avatar)).toBe(false);
    });

    it('staff: a position at the principal, never a bare holder', async () => {
      const biz = await makeBusiness();
      const keeper = await makeViewer('Mara', booth);
      const thief = await makeViewer('Tom', booth);
      biz.appoint(keeper.avatar, 'keeper');
      const tablet = await StuffApi.create(() => new Tablet());
      tablet.setPairing('staff');
      tablet.setPrincipal(BIZ);
      ContainmentApi.move(tablet, thief.avatar);
      expect(await tablet.mayDrive(keeper.avatar)).toBe(true);
      expect(await tablet.mayDrive(thief.avatar)).toBe(false);
    });

    it('open: anyone in reach, nobody elsewhere', async () => {
      const here = await makeViewer('Ann', booth);
      const away = await makeViewer('Bob', cellar);
      const board = await StuffApi.create(() => new Screen());
      board.setPairing('open');
      ContainmentApi.move(board, booth);
      expect(await board.mayDrive(here.avatar)).toBe(true);
      expect(await board.mayDrive(away.avatar)).toBe(false);
    });
  });

  describe('resolveFor — the ladder', () => {
    it('a held screen wins, whatever its pairing (the thief reads the sheet)', async () => {
      const thief = await makeViewer('Tom', booth);
      const tablet = await StuffApi.create(() => new Tablet());
      tablet.setPairing('staff');
      tablet.setPrincipal(BIZ);
      ContainmentApi.move(tablet, thief.avatar);
      const r = await resolveScreenFor(thief.avatar);
      expect(r?.display.stuffId).toBe(tablet.stuffId);
      expect(r?.mode).toBe('hand');
    });

    it('then a screen in sight you may drive; nothing from another room by hand', async () => {
      const a = await makeViewer('Ann', booth);
      const tv = await StuffApi.create(() => new Screen());
      tv.setPairing('open');
      ContainmentApi.move(tv, booth);
      expect((await resolveScreenFor(a.avatar))?.display.stuffId).toBe(tv.stuffId);
      const b = await makeViewer('Bob', cellar);
      expect(await resolveScreenFor(b.avatar)).toBeNull();
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
      biz.appoint(attuned as unknown as Stuff, 'keeper');
      biz.appoint(deaf as unknown as Stuff, 'keeper');
      const r = await resolveScreenFor(attuned as unknown as Stuff);
      expect(r?.display.stuffId).toBe(tablet.stuffId);
      expect(r?.mode).toBe('mind');
      expect(await resolveScreenFor(deaf as unknown as Stuff)).toBeNull();
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
      tablet.show({ kind: 'card', cardId: 'who', key: 'who' });
      expect(a.cards().length).toBe(1);
      expect(b.cards().length).toBe(1);
      expect(c.cards().length).toBe(0);
      expect(a.cards()[0]!.title).toBe(tablet.getPresentation());
    });

    it('a video writes each viewer\'s cockpit.watch with the display marker; clear empties it', async () => {
      const a = await makeViewer('Ann', booth);
      const c = await makeViewer('Cy', cellar);
      const tv = await StuffApi.create(() => new Screen());
      tv.setPairing('open');
      tv.setShortDescription('the booth TV');
      ContainmentApi.move(tv, booth);
      tv.show({
        kind: 'video',
        target: { platform: 'twitch', channel: 'shroud' },
        label: 'Twitch #shroud',
      });
      expect(a.watched()?.display?.stuffId).toBe(tv.stuffId);
      expect(a.watched()?.display?.label).toBe(tv.getPresentation());
      expect(c.watched()).toBeNull();
      tv.clear();
      expect(a.watched()).toBeNull();
    });

    it('`shows` is a policy over kinds: a card-only tablet refuses a video', async () => {
      const tablet = await StuffApi.create(() => new Tablet());
      tablet.setShows(['card']);
      expect(() =>
        tablet.show({
          kind: 'video',
          target: { platform: 'twitch', channel: 'x' },
          label: 'x',
        }),
      ).toThrow(/does not show/);
    });

    // ⭐ The third arm. Prose is ordinary game text the client already
    // renders, so it has no projection to push — it is READ off the
    // screen, per viewer, at look time. What proves the arm is real is
    // therefore the ABSENCE of a push plus the presence of a read: a
    // card would have landed on the rail, and this does not.
    it('prose pushes nothing and is read off the screen instead', async () => {
      const a = await makeViewer('Ann', booth);
      const board = await StuffApi.create(() => new Screen());
      board.setPairing('open');
      board.setShortDescription('the specials board');
      ContainmentApi.move(board, booth);
      board.show({
        kind: 'prose',
        body: Mml.compose`Tonight: the old fashioned.`,
      });
      expect(a.cards().length).toBe(0);
      expect(a.watched()).toBeNull();
      const read = await board.readScreen(a.avatar as unknown as Stuff);
      expect(read?.toString()).toContain('Tonight: the old fashioned.');
    });

    // ⭐ The WIRING, not just the read: `look <screen>` is how prose
    // reaches a player, so the controller has to actually call
    // `readScreen`. Asserting the mixin method in isolation would prove
    // a renderer nobody invokes.
    it('look <screen> renders the prose it shows', async () => {
      const viewer = await makeViewer('Lena', booth);
      const board = await StuffApi.create(() => new Screen());
      board.setShortDescription('the specials board');
      board.setKeywords(['board']);
      ContainmentApi.move(board, booth);
      board.show({
        kind: 'prose',
        body: Mml.compose`Tonight: the old fashioned.`,
      });
      const controller = makeStuff(() => new LookController());
      await controller.execute(
        { target: { stuff: board as unknown as Stuff, raw: 'board' } } as never,
        CommandApi.createCommandContext({
          commandGiver: viewer.avatar as never,
          location: booth as never,
          commandText: 'look board',
          executionId: 'display-look',
          commandId: 'display-look',
          verb: 'look',
          command: CommandDefinition.fromYaml(
            'verbs: [look]\ncontroller: NoopController\ndescription: stub\nopens_card: subject\n',
            '<test>',
          ),
        }),
      );
      const said = JSON.stringify(viewer.envelopes);
      expect(said).toContain('Tonight: the old fashioned.');
    });

    it('a video reads as a one-line "Showing" off the screen; a dark screen reads null', async () => {
      const tv = await StuffApi.create(() => new Screen());
      tv.setPairing('open');
      ContainmentApi.move(tv, booth);
      const viewer = await makeViewer('Vi', booth);
      const self = viewer.avatar as unknown as Stuff;
      expect(await tv.readScreen(self)).toBeNull();
      tv.show({
        kind: 'video',
        target: { platform: 'twitch', channel: 'shroud' },
        label: 'Twitch #shroud',
      });
      expect((await tv.readScreen(self))?.toString()).toContain('Twitch #shroud');
    });
  });

  // ⭐ The reads are ROOM-scoped, not world-scoped. `sees()` always
  // required the viewer to be in the display's room, so the room's
  // containment subtree is the complete candidate set — a world scan was
  // only ever a slower way to the same answer, and it sat on
  // `Mobile.traverse`/`teleport`, i.e. on every step any actor takes.
  describe('the reads are bounded by the room', () => {
    it('viewersOf sees only the display\'s own room — not a viewer elsewhere holding their own screen', async () => {
      const near = await makeViewer('Nell', booth);
      const far = await makeViewer('Fen', cellar);
      const farTablet = await StuffApi.create(() => new Tablet());
      farTablet.setPairing('held');
      ContainmentApi.move(farTablet, far.avatar);

      const tv = await StuffApi.create(() => new Screen());
      tv.setPairing('open');
      ContainmentApi.move(tv, booth);

      const ids = tv.viewersOf().map((v: { stuffId: string }) => v.stuffId);
      expect(ids).toContain(near.avatar.stuffId);
      expect(ids).not.toContain(far.avatar.stuffId);
    });

    it('refreshViewer projects only the displays in the viewer\'s own room', async () => {
      const cy = await makeViewer('Cy', cellar);
      // A lit screen in the OTHER room.
      const boothTv = await StuffApi.create(() => new Screen());
      boothTv.setPairing('open');
      ContainmentApi.move(boothTv, booth);
      boothTv.show({ kind: 'card', cardId: 'who', key: 'who' });
      expect(cy.cards().length).toBe(0);

      cy.avatar.refreshDisplays();
      expect(cy.cards().length).toBe(0);

      // Same screen, same viewer, once they share a room.
      ContainmentApi.move(boothTv, cellar);
      cy.avatar.refreshDisplays();
      expect(cy.cards().length).toBe(1);
    });
  });

  describe('arrival and departure', () => {
    it('walking in shows what the screen shows; walking out clears it', async () => {
      const tv = await StuffApi.create(() => new Screen());
      tv.setPairing('open');
      ContainmentApi.move(tv, booth);
      tv.show({
        kind: 'video',
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
