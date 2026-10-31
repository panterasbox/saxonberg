import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Texture } from 'three';
import Flag from '../../engine/Flag';
import Wind from '../../engine/Wind';
import { windModifiers } from '../../engine/windModifiers';
import applyWindForceToCloth from '../../engine/applyWindForceToCloth';
import applyGravityToCloth from '../../engine/applyGravityToCloth';
import { Side, TIME_STEP } from '../../engine/constants';
import { BANNER_SIZE, paintBanner, type BannerFace } from './bannerTexture';

interface BannerProps extends BannerFace {
  position?: [number, number, number];
  /** Offsets this banner's gusts so two banners never move in lockstep. */
  phase?: number;
}

/**
 * A brand banner — a hanging cloth (ported flagwaver engine) on a brass
 * crossbar with finials, its face painted from a brand mark. Renders nothing
 * until the face is painted (fonts and the SVG load first).
 */
export default function Banner({ markUrl, wordmark, position = [0, 0, 0], phase = 0 }: BannerProps) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let painted: Texture | null = null;
    paintBanner({ markUrl, wordmark }).then((t) => {
      if (cancelled) t.dispose();
      else setTexture((painted = t));
    });
    return () => {
      cancelled = true;
      painted?.dispose();
    };
  }, [markUrl, wordmark]);

  if (!texture) return null;
  return <HangingCloth texture={texture} position={position} phase={phase} />;
}

function HangingCloth({
  texture,
  position,
  phase,
}: {
  texture: Texture;
  position: [number, number, number];
  phase: number;
}) {
  const { flag, wind } = useMemo(() => {
    const flag = new Flag({
      width: BANNER_SIZE.width,
      height: BANNER_SIZE.height,
      granularity: 15,
      mass: 0.4, // heavy felt — resists wind, same gravity drape
      texture,
      pinEdge: Side.TOP,
    });
    const wind = new Wind({
      speed: 4.0,
      directionFn: windModifiers.hangingBannerDirection,
      speedFn: windModifiers.gustySpeed,
    });
    return { flag, wind };
  }, [texture]);

  const acc = useRef(-phase);
  useFrame((_, delta) => {
    acc.current += Math.min(delta, 0.1);
    let steps = 0;
    while (acc.current >= TIME_STEP && steps < 5) {
      wind.update();
      applyWindForceToCloth(flag.cloth, wind, flag.object);
      applyGravityToCloth(flag.cloth, flag.object);
      flag.simulate(TIME_STEP);
      acc.current -= TIME_STEP;
      steps++;
    }
    flag.render();
  });

  const rodLength = flag.cloth.width + 0.26;

  return (
    <group position={position}>
      <primitive object={flag.object} />

      {/* Crossbar — brass, the design system's accent. Cylinder's native axis
          is Y; rotate to horizontal. */}
      <mesh position={[0, 0.0, -0.03]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.028, 0.028, rodLength, 20]} />
        <meshStandardMaterial color={'#8a6d1f'} metalness={0.85} roughness={0.35} />
      </mesh>

      {/* Finials at each end. */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (rodLength / 2), 0.0, -0.03]}>
          <sphereGeometry args={[0.05, 20, 20]} />
          <meshStandardMaterial color={'#c9a227'} metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
