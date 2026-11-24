/**
 * BroadcastApp — the broadcaster's app (stream arrival D17): installed on a
 * phone you carry, it lends you `program` and `rodney`, anywhere you go.
 *
 * ⭐ The verbs are the app's, not the body's. The body keeps the RUN — the
 * phase, the timers, the program it cites — because that is state, not an
 * affordance: a broadcaster whose phone dies mid-stream is still on air and
 * cannot steer until they charge it or reach a broadcast desk. A person
 * without the app, not at a desk, has neither verb.
 *
 * Reaches its bearer through the device (`CommandLogic.lendHostedApps`,
 * D16); a device that will not run still lends the verb so it can say why.
 * Row: `/platform/idea/app/broadcast` (`published: true` — in the store).
 */

import App from './App';
import { TemplatePaths } from '../../lib/paths';
import type { CommandContributions } from '../../api/command';

export default class BroadcastApp extends App {
  static readonly TEMPLATE_PATH = TemplatePaths.broadcastApp;

  /** Its verbs, served to whoever bears the device it runs on (D16). */
  static commandContributions: CommandContributions = {
    self: ['platform/cmd/stream/rodney.yaml', 'platform/cmd/stream/program.yaml'],
    peers: [],
    environment: [],
  };
}
