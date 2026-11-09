/**
 * The rules table — the feed decides the OBS scene and its layers
 * (broadcast-ready D14). ⭐ Data, not code: edit the rows.
 *
 * The game names a scene only as a reason row's hint (`reason.scene`),
 * which overrides the phase's default. The four scenes are the ones
 * `docs/obs-setup.md` builds: Starting · Live · Away · Ending.
 *
 * ⚠ A privacy cover is the ABSENCE of a source — the Away scene has no
 * display, no camera and no microphone. Nothing here draws a cover.
 */

import type { StreamPhase, StreamReason, StreamForeground } from './wire';

export type SceneName = 'Starting' | 'Live' | 'Away' | 'Ending';

/** The phase → scene table. Offline holds Away: nothing of the desktop. */
export const SCENE_BY_PHASE: Readonly<Record<StreamPhase, SceneName>> = {
  starting: 'Starting',
  live: 'Live',
  standby: 'Away',
  ending: 'Ending',
  offline: 'Away',
};

/** The layers a scene can carry over the frame. */
export type Layer = 'game-summary';

/** What the rules need to read. */
export interface RuleInput {
  phase: StreamPhase;
  reason: StreamReason | null;
  foreground: StreamForeground | null;
}

/** The scene for a phase, a reason's hint winning when it names one. */
export function sceneFor(input: Pick<RuleInput, 'phase' | 'reason'>): string {
  const hint = input.reason?.scene?.trim();
  if (hint) return hint;
  return SCENE_BY_PHASE[input.phase];
}

/**
 * The layers on top of the scene: live with the streamer's Saxonberg not
 * in front → a game summary, so the audience still sees the world.
 */
export function layersFor(input: RuleInput): Layer[] {
  const layers: Layer[] = [];
  if (input.phase === 'live' && input.foreground !== null && input.foreground !== 'saxonberg') {
    layers.push('game-summary');
  }
  return layers;
}
