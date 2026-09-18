/**
 * Trowel — what you dig bait with. The instrument affords `dig`
 * (`capabilities: [digging]`); the ground you dig is a declared
 * argument, and what it costs the ground is the soil's own ledger.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class Trowel extends ToolItem {
  static commandContributions: CommandContributions = {
    self: [],
    peers: [],
    // `environment` = whoever holds it.
    environment: ['trade/fishing/cmd/fishing/dig.yaml'],
  };

  constructor() {
    super();
    this.capabilities = ['digging'];
  }
}
