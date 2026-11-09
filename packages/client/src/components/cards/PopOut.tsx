/**
 * PopOut — any card in its own chromeless window (broadcast-ready D13, W5).
 *
 * ⭐ **Document Picture-in-Picture, not a second client.** The card's own
 * React subtree is moved into a `documentPictureInPicture.requestWindow()`
 * window through a portal: the same JS realm, the same socket, the same
 * store — so it stays the server's card, updating live, and every control
 * in it still sends through the ordinary bus. Chrome gives one such
 * window per tab, chromeless and always on top: what a streamer parks on
 * the monitor the audience does not see.
 *
 * ⚠ Why not the installed PWA window (the requirements' lean, verified
 * and found to be a different thing): a standalone app window is a
 * separate document with its own WebSocket — a second `Interactive` —
 * and a card belongs to ONE Interactive (`CardApi` takes the first), so
 * the card cannot be there. The manifest still ships, for the MAIN
 * client to run chromeless under the display capture.
 *
 * Styles: styled-components inject into the PiP document's own head
 * (`StyleSheetManager target`), the global sheets are copied rule by
 * rule, and the root's CSS variables (the theme ground) are carried over,
 * so the card looks the same in its window. Closing the window returns
 * the card in place. Where the API is missing, `open` answers with the
 * reason and the card stays where it is (never silent).
 */

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { StyleSheetManager } from "styled-components";

/** The slice of the Document PiP API this uses. */
interface DocumentPictureInPicture {
  requestWindow(opts?: { width?: number; height?: number }): Promise<Window>;
}

function pipApi(): DocumentPictureInPicture | null {
  const api = (window as unknown as { documentPictureInPicture?: DocumentPictureInPicture })
    .documentPictureInPicture;
  return api ?? null;
}

/** Can this browser pop a card out at all? */
export function canPopOut(): boolean {
  return pipApi() !== null;
}

/** Copy the main document's sheets and theme variables into `win`. */
function carryStyles(win: Window): void {
  const doc = win.document;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join("\n");
      const style = doc.createElement("style");
      style.textContent = css;
      doc.head.appendChild(style);
    } catch {
      // A cross-origin sheet (a web font's) cannot be read; link it.
      if (sheet.href) {
        const link = doc.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        doc.head.appendChild(link);
      }
    }
  }
  doc.documentElement.style.cssText = document.documentElement.style.cssText;
  doc.body.style.margin = "0";
  doc.body.style.background = getComputedStyle(document.body).background;
  doc.body.style.color = getComputedStyle(document.body).color;
}

/**
 * One card's pop-out state: the PiP window while it is open, `open()` to
 * pop out (resolving to null, or the reason it could not), `close()` to
 * return it.
 */
export function usePopOut(title: string): {
  win: Window | null;
  open: () => Promise<string | null>;
  close: () => void;
} {
  const [win, setWin] = useState<Window | null>(null);

  const open = useCallback(async (): Promise<string | null> => {
    const api = pipApi();
    if (!api) return "This browser cannot pop a card out (Document Picture-in-Picture is Chrome 116+).";
    try {
      const w = await api.requestWindow({ width: 420, height: 640 });
      carryStyles(w);
      w.document.title = title;
      w.addEventListener("pagehide", () => setWin(null), { once: true });
      setWin(w);
      return null;
    } catch (err) {
      return `The card could not pop out: ${String(err)}`;
    }
  }, [title]);

  const close = useCallback(() => {
    setWin((w) => {
      w?.close();
      return null;
    });
  }, []);

  // A card that unmounts takes its window with it.
  useEffect(() => () => win?.close(), [win]);

  return { win, open, close };
}

/** Render `children` into the pop-out window, styled there. */
export function PopOutPortal({
  win,
  children,
}: {
  win: Window;
  children: React.ReactNode;
}): React.ReactElement {
  return createPortal(
    <StyleSheetManager target={win.document.head}>
      <div data-testid="popout-root" style={{ minHeight: "100vh" }}>
        {children}
      </div>
    </StyleSheetManager>,
    win.document.body,
  );
}
