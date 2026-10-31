import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Show } from '../../hooks/useShow';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';
import { PANELS, type PanelRow } from './panels';
import type { ShowProfile } from '../../show/profiles';

/** The lower third's box: 1520 × 225 under the content area. */
export const LOWER_THIRD = { width: 1520, height: 225, crawl: 48 } as const;

/** Crawl speed in px/s — fast enough to move, slow enough to read at 720p. */
const CRAWL_SPEED = 120;

/**
 * Smooth weighted round-robin: each eligible row gains its weight, the
 * richest takes the turn and pays the total back. Over a cycle each row gets
 * turns in proportion to its weight, spread out rather than bunched.
 */
function pickNext(rows: PanelRow[], credit: Map<string, number>): PanelRow | null {
  if (rows.length === 0) return null;
  const total = rows.reduce((n, r) => n + r.weight, 0);
  let best: PanelRow | null = null;
  for (const r of rows) {
    const c = (credit.get(r.key) ?? 0) + r.weight;
    credit.set(r.key, c);
    if (!best || c > (credit.get(best.key) ?? 0)) best = r;
  }
  if (best) credit.set(best.key, (credit.get(best.key) ?? 0) - total);
  return best;
}

function Rotation({
  show,
  profile,
  height,
}: {
  show: Show;
  profile: ShowProfile;
  height: number;
}) {
  const ofShow = PANELS.filter((p) => profile.panels.includes(p.key));
  const eligible = ofShow.filter((p) => p.when(show));
  const eligibleKeys = eligible.map((p) => p.key).join(',');
  const [turn, setTurn] = useState<{ row: PanelRow; started: number } | null>(null);

  useEffect(() => {
    const rows = ofShow.filter((p) => p.when(show));
    // Fresh credit per plan, so the heaviest row (join) always opens it.
    const credit = new Map<string, number>();
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      const row = pickNext(rows, credit);
      if (!row) return;
      setTurn({ row, started: Date.now() });
      timer = setTimeout(advance, row.seconds * 1000);
    };
    advance();
    return () => clearTimeout(timer);
    // Re-plan only when which panels are eligible changes, not on every value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleKeys]);

  return (
    <div style={{ position: 'relative', height, padding: '0 40px', boxSizing: 'border-box' }}>
      {turn && (
        <>
          <div key={turn.started} style={{ height: '100%', animation: 'rodney-fade-in 600ms ease-out' }}>
            {turn.row.render(show)}
          </div>
          {/* The hairline showing time left in this turn. */}
          <div
            key={`bar-${turn.started}`}
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              height: 3,
              width: '100%',
              background: palette.accent,
              transformOrigin: 'left',
              animation: `rodney-drain ${turn.row.seconds}s linear forwards`,
            }}
          />
        </>
      )}
    </div>
  );
}

function Crawl({ items }: { items: string[] }) {
  const text = useMemo(() => items.join('     ◆     '), [items]);
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    setWidth(ref.current?.scrollWidth ?? 0);
  }, [text]);

  // One copy scrolls from the right edge until it has fully left on the left.
  const distance = LOWER_THIRD.width + width;
  return (
    <div
      style={{
        height: LOWER_THIRD.crawl,
        overflow: 'hidden',
        position: 'relative',
        background: palette.bg.sunken,
        borderTop: `1px solid ${palette.line}`,
      }}
    >
      <div
        ref={ref}
        key={text}
        style={{
          position: 'absolute',
          top: 0,
          left: LOWER_THIRD.width,
          height: LOWER_THIRD.crawl,
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          fontFamily: FACE_STACKS.chrome,
          fontSize: 26,
          color: palette.text.fg,
          animation: width
            ? `rodney-crawl ${distance / CRAWL_SPEED}s linear infinite`
            : undefined,
          ['--crawl-distance' as string]: `-${distance}px`,
        }}
      >
        {text}
      </div>
    </div>
  );
}

/**
 * The lower third: the rotation over the crawl. ⭐ The rotation wins any
 * squeeze — the crawl hides when it has nothing to say and the rotation grows
 * back to the full 225.
 */
export default function LowerThird({ show, profile }: { show: Show; profile: ShowProfile }) {
  const crawling = show.crawl.length > 0;
  return (
    <div
      style={{
        width: LOWER_THIRD.width,
        height: LOWER_THIRD.height,
        background: palette.bg.surface,
        borderTop: `1px solid ${palette.line}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes rodney-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes rodney-drain { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @keyframes rodney-crawl { from { transform: translateX(0); } to { transform: translateX(var(--crawl-distance)); } }
      `}</style>
      <Rotation
        show={show}
        profile={profile}
        height={crawling ? LOWER_THIRD.height - LOWER_THIRD.crawl : LOWER_THIRD.height}
      />
      {crawling && <Crawl items={show.crawl} />}
    </div>
  );
}
