/**
 * PickMode — while a "Ring what?" prompt is open, every noun on screen
 * answers it.
 *
 * ⭐ The prompt still offers its own list (what is in reach and fits);
 * this makes everything ELSE that names a thing a way to answer too, so
 * the player who clicked `ring` on a card can click the tip jar in that
 * same card and never leave it for the terminal.
 *
 * A noun takes part by carrying `data-stuff-id` (the terminal's names,
 * card titles, a card's chips, `EntityName`). While a pick-one prompt is
 * pending the page carries `data-picking`, which lights every such noun
 * up and gives it a crosshair; one capturing click listener turns a click
 * on one into the prompt's answer — the thing's `#id`, exact — instead of
 * its usual command. The server re-checks the pick exactly as if it had
 * been typed, so a noun that does not fit is refused in words, never
 * silently accepted. Outside a prompt nouns behave as they always do.
 */

import React from "react";
import { createGlobalStyle } from "styled-components";
import { useStore } from "../store/index";
import { tokens } from "./ui";
import { answerPrompt } from "../store/promptAnswer";

/**
 * The pick highlight. ⚠ Mounted ONCE in `main.tsx`, outside StrictMode —
 * a `createGlobalStyle` inside it is injected and then silently removed
 * (styled-components #3601, the GlobalFonts note). It matches only while
 * the page carries `data-picking`, so being always mounted costs nothing.
 */
export const PickStyle = createGlobalStyle`
  body[data-picking] [data-stuff-id] {
    cursor: crosshair;
    outline: 1px dashed ${tokens.color.fgEmphasis};
    outline-offset: 1px;
    border-radius: 2px;
  }
  body[data-picking] [data-stuff-id]:hover {
    outline-style: solid;
    background: ${tokens.color.accentWash};
  }
`;

/** The newest pending pick-one prompt — the question a click answers. */
function newestPick(prompts: ReturnType<typeof useStore.getState>["prompts"]) {
  for (let i = prompts.length - 1; i >= 0; i--) {
    const p = prompts[i]!;
    if (p.kind === "mql-object") return p;
  }
  return null;
}

function usePickPrompt(): { promptId: string; label: string } | null {
  // Primitives, so the selector is stable between renders.
  const promptId = useStore((s) => newestPick(s.prompts)?.promptId ?? null);
  const label = useStore((s) => newestPick(s.prompts)?.label ?? "");
  return React.useMemo(() => (promptId ? { promptId, label } : null), [promptId, label]);
}

export function PickMode(): React.ReactElement | null {
  const pick = usePickPrompt();

  React.useEffect(() => {
    if (!pick) return undefined;
    document.body.dataset.picking = pick.label;
    const onClick = (e: MouseEvent): void => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-stuff-id]");
      const stuffId = el?.dataset.stuffId;
      if (!el || !stuffId) return;
      e.preventDefault();
      e.stopPropagation();
      answerPrompt(pick.promptId, stuffId, el.textContent?.trim() || undefined);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      delete document.body.dataset.picking;
      document.removeEventListener("click", onClick, true);
    };
  }, [pick]);

  return null;
}
