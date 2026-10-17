import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { SRGBColorSpace, TextureLoader } from 'three';
import Flag from '../../engine/Flag';
import Wind from '../../engine/Wind';
import { windModifiers } from '../../engine/windModifiers';
import applyWindForceToCloth from '../../engine/applyWindForceToCloth';
import applyGravityToCloth from '../../engine/applyGravityToCloth';
import { Side, TIME_STEP } from '../../engine/constants';

/**
 * The Pantera's Box banner — a hanging cloth (ported flagwaver engine) on a
 * brass crossbar with finials. Tuned calm: low wind, heavy cloth, slow gusts.
 */
export default function Banner({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const albedo = useLoader(TextureLoader, '/banner-albedo.png');

  const { flag, wind } = useMemo(() => {
    albedo.colorSpace = SRGBColorSpace;
    albedo.anisotropy = 16;
    const flag = new Flag({
      width: 1.0,
      height: 1.78,
      granularity: 15,
      mass: 0.4, // heavy felt — resists wind, same gravity drape
      texture: albedo,
      pinEdge: Side.TOP,
    });
    const wind = new Wind({
      speed: 4.0, // calmer than the original 6.5, with a little more life
      directionFn: windModifiers.hangingBannerDirection,
      speedFn: windModifiers.gustySpeed,
    });
    return { flag, wind };
  }, [albedo]);

  const acc = useRef(0);
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

  const rodLength = flag.cloth.width + 0.3;

  return (
    <group position={position}>
      <primitive object={flag.object} />

      {/* Crossbar the banner hangs from — aged brass, echoing the monastery's
          armillary sphere. Cylinder's native axis is Y; rotate to horizontal. */}
      <mesh position={[0, 0.0, -0.03]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, rodLength, 20]} />
        <meshStandardMaterial color={'#6b5524'} metalness={0.85} roughness={0.35} />
      </mesh>

      {/* Finials at each end. */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (rodLength / 2), 0.0, -0.03]}>
          <sphereGeometry args={[0.055, 20, 20]} />
          <meshStandardMaterial color={'#7a6230'} metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
