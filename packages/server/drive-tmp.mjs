/**
 * A headless live drive over the WebSocket — the mine, end to end,
 * against the running server. No browser: the client surface is covered
 * by its own suite; what needs driving is the WORLD.
 */
import WebSocket from 'ws';

const SERVER = 'http://localhost:2010';
const handle = process.argv[2] ?? `drive-${Date.now()}`;
const start = process.argv[3] ?? '/world/rejection/location/pithead-yard';
const script = JSON.parse(process.argv[4] ?? '[]');

const login = await fetch(`${SERVER}/auth/test-login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ handle, withCharacter: true, startLocation: start, wizard: process.env.WIZ === '1' }),
});
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
if (!login.ok) { console.error('LOGIN FAILED', login.status, await login.text()); process.exit(1); }

const ws = new WebSocket(`${SERVER.replace('http', 'ws')}/ws`, { headers: { cookie } });
const out = [];
let i = 0;
let idle = null;

function bump() {
  clearTimeout(idle);
  idle = setTimeout(next, 1200);
}
function next() {
  if (i >= script.length) { ws.close(); return; }
  const cmd = script[i++];
  // `wait <ms>` is the harness's own, not the game's: an engaged act runs
  // over game time and the socket has to stay open for it.
  const w = /^wait (\d+)$/.exec(cmd);
  if (w) {
    out.push(`\n… waiting ${w[1]}ms`);
    clearTimeout(idle);
    idle = setTimeout(next, Number(w[1]));
    return;
  }
  out.push(`\n$ ${cmd}`);
  ws.send(JSON.stringify({ type: 'command', payload: { text: cmd, barId: 'main' } }));
  bump();
}
// The roster: a with-character account lands there, and the client's
// Enter button sends `play <playerId>`. The id arrives in the roster
// envelope, so we read it rather than guessing.
let entered = false;
ws.on('open', () => {});
ws.on('message', (raw) => {
  let m; try { m = JSON.parse(String(raw)); } catch { return; }
  if (!entered) {
    const hit = /"playerId"\s*:\s*"([^"]+)"/.exec(String(raw));
    if (hit) {
      entered = true;
      out.push(`(entering as ${hit[1]})`);
      ws.send(JSON.stringify({ type: 'command', payload: { text: `play ${hit[1]}` } }));
      setTimeout(next, 3500);
      return;
    }
  }
  // Dump whatever carries prose: the envelope shape varies by kind.
  const seen = [];
  const walk = (v, d) => {
    if (d > 6 || v == null) return;
    if (typeof v === 'string') { if (v.length > 1) seen.push(v); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x, d + 1); return; }
    if (typeof v === 'object') {
      for (const k of ['mml', 'text', 'body', 'message', 'prose', 'frames', 'notes', 'summary']) {
        if (k in v) walk(v[k], d + 1);
      }
    }
  };
  if (m.topic === 'shell.control') { bump(); return; }
  const body = typeof m.body === 'string' ? m.body : '';
  walk(m, 0);
  let text = (body + '\n' + seen.join('\n')).trim();
  if (!text && process.env.RAW) text = '[raw] ' + String(raw).slice(0, 600);
  const clean = text.replace(/<[^>]+>/g, '');
  if (clean && out[out.length - 1] !== clean) out.push(clean);
  bump();
});
ws.on('close', () => { console.log(out.join('\n')); process.exit(0); });
ws.on('error', (e) => { console.error('WS ERROR', e.message); process.exit(1); });
setTimeout(() => { console.log(out.join('\n')); process.exit(0); }, 120000);
