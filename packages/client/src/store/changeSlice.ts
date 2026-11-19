/**
 * changeSlice — what last changed each live surface, and WHY
 * (navigation-server review).
 *
 * ⭐⭐ The owner's concern: a card or a pane that changes on its own is
 * magic — the player cannot tell why it changed, or why it sometimes does
 * not. The server answers that on every push: a `subscription-delta`
 * carries `causes`, the ids of the command(s) whose work produced it — the
 * same id the prose of that command carries (`meta.commandId` /
 * `meta.causingCommandId`). So a change is tied to a line in scrollback:
 * yours, or one somebody else's command made that you saw. A change whose
 * command sent you no line is one whose cause you did not see; a change
 * with no command is the clock.
 *
 * A SURFACE is one thing that can change: a card (`card:<instanceId>`) or
 * a navigator section (`nav:<section>`). The slice keeps only the last
 * change per surface — a mark, not a history (scrollback is the history).
 */

export interface SurfaceChange {
  /** When it changed (client clock, ms). */
  at: number;
  /** The causing command ids; empty: no command did it. */
  causes: string[];
}

export interface ChangeSlice {
  surfaceChanges: Record<string, SurfaceChange>;
  noteSurfaceChange: (surface: string, causes: readonly string[] | undefined) => void;
}

export const createChangeSlice = (
  set: (
    partial: Partial<ChangeSlice> | ((state: ChangeSlice) => Partial<ChangeSlice>),
  ) => void,
): ChangeSlice => ({
  surfaceChanges: {},
  noteSurfaceChange: (surface, causes) =>
    set((s) => ({
      surfaceChanges: {
        ...s.surfaceChanges,
        [surface]: { at: Date.now(), causes: [...(causes ?? [])] },
      },
    })),
});
