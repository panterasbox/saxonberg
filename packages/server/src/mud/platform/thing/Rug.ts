/**
 * Rug — a textile floor covering, laid `on` a floor (cleanliness D15).
 *
 * ⭐ It gathers what a floor gathers — crumbs, grit, the mud off boots —
 * and it is not swept or scrubbed: it is taken up and BEATEN. `beat rug`
 * knocks the debris out of it by time alone.
 */

import Good from '../../lib/stuff/Good';
import { SoilableMixin } from '../../lib/cleanliness/Soilable';
import type { CommandContributions } from '../../api/command';

export default class Rug extends SoilableMixin(Good) {
  static commandContributions: CommandContributions = {
    environment: ['platform/cmd/inventory/beat.yaml'],
    peers: ['platform/cmd/inventory/beat.yaml'],
  };
}
