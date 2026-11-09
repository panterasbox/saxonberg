/**
 * Switching OBS's scene from the overlay (broadcast-ready D14).
 *
 * Three routes, in order, and never silent:
 *
 * 1. **The browser source itself** — `window.obsstudio.setCurrentScene`,
 *    present when the source's *Page permissions* are *Advanced access to
 *    OBS*. No network, no password.
 * 2. **obs-websocket** — `VITE_OBS_WS_URL` (+ `VITE_OBS_WS_PASSWORD`), the
 *    v5 protocol spoken over a raw WebSocket (Hello → Identify with the
 *    auth challenge → `SetCurrentProgramScene`). No dependency.
 * 3. **Neither** — nothing switches, and `applyScene` says why so the page
 *    can show it in a corner.
 */

/** The `window.obsstudio` surface an Advanced-access source gets. */
interface ObsStudio {
  setCurrentScene?: (name: string) => void;
  getCurrentScene?: (cb: (scene: { name: string }) => void) => void;
}

declare global {
  interface Window {
    obsstudio?: ObsStudio;
  }
}

/** How a scene request went. */
export type SceneResult =
  | { ok: true; via: 'browser-source' | 'obs-websocket' }
  | { ok: false; why: string };

/** sha256, base64 — the v5 auth step. */
async function sha256b64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  let bin = '';
  for (const b of new Uint8Array(digest)) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** One request over obs-websocket v5, then close. */
function viaObsWebsocket(url: string, password: string, scene: string): Promise<SceneResult> {
  return new Promise((resolve) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(url, 'obswebsocket.json');
    } catch (err) {
      resolve({ ok: false, why: `obs-websocket: ${String(err)}` });
      return;
    }
    const done = (r: SceneResult) => {
      resolve(r);
      try {
        ws.close();
      } catch {
        /* already closed */
      }
    };
    const timer = setTimeout(() => done({ ok: false, why: 'obs-websocket: no answer' }), 5000);
    ws.onerror = () => {
      clearTimeout(timer);
      done({ ok: false, why: `obs-websocket: cannot reach ${url}` });
    };
    ws.onmessage = async (ev) => {
      const msg = JSON.parse(String(ev.data)) as { op: number; d: Record<string, unknown> };
      if (msg.op === 0) {
        // Hello → Identify (with auth when the server asks for it).
        const auth = msg.d.authentication as { challenge: string; salt: string } | undefined;
        const d: Record<string, unknown> = { rpcVersion: 1 };
        if (auth) {
          const secret = await sha256b64(password + auth.salt);
          d.authentication = await sha256b64(secret + auth.challenge);
        }
        ws.send(JSON.stringify({ op: 1, d }));
      } else if (msg.op === 2) {
        // Identified → the one request.
        ws.send(
          JSON.stringify({
            op: 6,
            d: {
              requestType: 'SetCurrentProgramScene',
              requestId: 'rodney-scene',
              requestData: { sceneName: scene },
            },
          }),
        );
      } else if (msg.op === 7) {
        clearTimeout(timer);
        const status = msg.d.requestStatus as { result: boolean; comment?: string };
        done(
          status.result
            ? { ok: true, via: 'obs-websocket' }
            : { ok: false, why: `obs-websocket: ${status.comment ?? 'refused'}` },
        );
      }
    };
    ws.onclose = (ev) => {
      clearTimeout(timer);
      // 4009 = authentication failed.
      if (ev.code === 4009) resolve({ ok: false, why: 'obs-websocket: wrong password' });
    };
  });
}

/** Ask OBS to show `scene`. Resolves with how, or why not. */
export async function applyScene(scene: string): Promise<SceneResult> {
  const obs = window.obsstudio;
  if (obs?.setCurrentScene) {
    obs.setCurrentScene(scene);
    return { ok: true, via: 'browser-source' };
  }
  const url = import.meta.env.VITE_OBS_WS_URL;
  if (url) return viaObsWebsocket(url, import.meta.env.VITE_OBS_WS_PASSWORD ?? '', scene);
  return {
    ok: false,
    why: window.obsstudio
      ? 'scene switch off: give this source Advanced access to OBS'
      : 'scene switch off: not in OBS, and no VITE_OBS_WS_URL',
  };
}
