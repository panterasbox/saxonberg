/**
 * PhysicPlant — a physic-garden plant that affords its OWN harvest
 * (clinical-medicine D10). A bare `Plant` is harvested through a Cultivable
 * host (a bed / pot / Panel); a plant standing in a walled physic garden
 * has no such host, so it carries the affordance itself (the `Bole`
 * "affords its own cross-cut" pattern) — `harvest` narrows on GrowingMixin,
 * which `Plant` composes, so a `harvest greywort` binds it.
 */

import Plant from '@saxonberg/server/mud/platform/thing/Plant';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class PhysicPlant extends Plant {
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/inventory/harvest.yaml'],
    environment: [],
  };
}
