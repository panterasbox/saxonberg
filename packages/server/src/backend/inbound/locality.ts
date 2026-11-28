/**
 * Locality facts — a crumb's civic tooltip (navigation card W8).
 *
 * One inbound op: `locality-facts { requestId, address }` → one
 * `locality-facts-result { requestId, address, facts }`. It answers ONLY
 * for a Locality the asker's own map holds a claim for: a place you have
 * not been gets the same `null` as no such place, so the request cannot be
 * used to learn the world.
 *
 * What it says, all through reads that exist: the government most local to
 * the address and its seats with who holds them (a name, never a path), and
 * whether you live under it; and the sky where you stand — every crumb is a
 * Locality covering where you stand, so its weather is yours. The sky is
 * the hedged tell anyone can read (`skyReadFor`), never the procedural
 * forecast: a glance does not do a reading's job.
 *
 * ⚠ A read, not a dispatch: nothing runs, nothing is learned or written.
 */

import { ExecutionContextApi } from '../../mud/api/execution-context';
import { GovernmentApi } from '../../mud/api/government';
import { MixinApi } from '../../mud/api/mixin';
import { NavigationApi } from '../../mud/api/navigation';
import { StuffApi } from '../../mud/api/stuff';
import { WeatherApi } from '../../mud/api/weather';
import type { Stuff } from '../../mud/lib/stuff/Stuff';
import type { Sensor } from '../../mud/lib/message/Sensor';
import type {
  LocalityFacts,
  LocalityFactsMessage,
  LocalityFactsResultEnvelope,
} from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handleLocalityFacts: InboundHandler = async (ctx, message) => {
  const payload = message.payload as LocalityFactsMessage | undefined;
  if (!payload || typeof payload.requestId !== 'string' || typeof payload.address !== 'string') {
    return;
  }
  const holder = ctx.interactive.getHolder();
  if (!holder || !MixinApi.isSensor(holder)) return;
  const viewer = holder as Stuff & Sensor;
  const address = payload.address.trim().replace(/^\/+|\/+$/g, '').slice(0, 200);

  const facts = address
    ? await ExecutionContextApi.runRoot(null, 'navigation.locality-facts', async () => {
        ExecutionContextApi.tagActingAuthor(viewer);
        // ⚠ One answer for *no such place*, *a place you have not been* and
        // a failure: `null`, never a reason.
        return factsFor(viewer, address).catch(() => null);
      }, { acting: { actor: viewer } })
    : null;

  const template: Omit<LocalityFactsResultEnvelope, 'frameId'> = {
    type: 'locality-facts-result',
    requestId: payload.requestId,
    address: payload.address,
    facts,
  };
  viewer.onEnvelope(template);
};

async function factsFor(viewer: Stuff, address: string): Promise<LocalityFacts | null> {
  // The map's OWNER key — a guest's map is a session map.
  const key = MixinApi.isCartographer(viewer) ? viewer.mapOwnerKey() : viewer.getIdentityPath();
  if (!key) return null;
  // ⭐ The gate: your own map holds this Locality.
  const docs = await NavigationApi.readMap(key, address);
  const held = docs.some((d) => d.claims.some((c) => c.kind === 'locality' && c.place === address));
  if (!held) return null;

  const government = await GovernmentApi.governmentAt(address);
  const seats = government
    ? (await GovernmentApi.seatsOf(government.key)).map((view) => ({
        seat: view.seat.label,
        holder: view.holder === null ? null : nameOf(view.holder),
      }))
    : [];
  const resident = government !== null && GovernmentApi.residentOf(viewer).some((g) => g.key === government.key);

  let forecast: string | undefined;
  const place = MixinApi.isContainable(viewer) ? viewer.getEnclosingPlace() : null;
  if (place) {
    const sky = await WeatherApi.skyReadFor(place).catch(() => null);
    if (sky) forecast = `${sky.cloudForm.replace(/-/g, ' ')}${sky.presageFront ? ' — a front may be moving in' : ''}`;
  }
  return {
    ...(government ? { government: { key: government.key, name: government.name } } : {}),
    seats,
    resident,
    ...(forecast ? { forecast } : {}),
  };
}

/**
 * A seat holder by their live presentation, else *someone*. ⛔ Never a path
 * or its tail: a holder's path is an identity, and this rides the wire.
 */
function nameOf(holderPath: string): string {
  // ⚠ A lookup that fails (more than one live match) costs this one name,
  // never the whole tooltip.
  try {
    const live = StuffApi.findByTemplatePath(holderPath);
    return live ? String(live.getPresentation()) : 'someone';
  } catch {
    return 'someone';
  }
}
