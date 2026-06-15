import { useEffect, useState } from 'react';

/**
 * Countdown to an absolute "away until" timestamp. The server (saxonberg) will
 * eventually push `awayUntil` over WebSocket; for now it reads a `?until=<epoch_ms>`
 * URL param (so OBS/tests can set it) and falls back to a 15-minute demo.
 *
 * Ticking is purely local off the absolute target — no per-second network churn,
 * and it survives reconnects because the target is absolute.
 */
export interface AwayTimer {
  remainingMs: number;
  label: string; // mm:ss (or h:mm:ss)
  expired: boolean;
  urgent: boolean; // < 60s remaining
}

function resolveTarget(): number {
  const param = new URLSearchParams(window.location.search).get('until');
  const parsed = param ? Number(param) : NaN;
  if (Number.isFinite(parsed)) return parsed;
  return Date.now() + 15 * 60 * 1000;
}

function format(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function useAwayTimer(): AwayTimer {
  const [target] = useState(resolveTarget);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, target - now);
  return {
    remainingMs,
    label: format(remainingMs),
    expired: remainingMs <= 0,
    urgent: remainingMs > 0 && remainingMs < 60 * 1000,
  };
}
