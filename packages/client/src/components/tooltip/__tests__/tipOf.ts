/**
 * Test helper: what an element's tooltip says. Focus opens it (keyboard
 * opens at once), so no timers are needed; the document is read from the
 * stack and the stack is cleared. Returns the words a reader sees — the
 * name, else the prose — and the command, or `null` for no tooltip.
 */

import { act } from "react";
import { fireEvent } from "@testing-library/react";
import { useStore } from "../../../store/index";

export function tipOf(el: Element): { text: string | null; command?: string } | null {
  act(() => {
    fireEvent.focus(el);
  });
  const doc = useStore.getState().tipStack.at(-1)?.doc ?? null;
  act(() => useStore.getState().closeAllTips());
  if (!doc) return null;
  return {
    text: doc.header?.name ?? doc.prose ?? doc.miss ?? null,
    ...(doc.command ? { command: doc.command } : {}),
  };
}
