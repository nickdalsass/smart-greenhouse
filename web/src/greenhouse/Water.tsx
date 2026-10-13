import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Vector3Tuple,
} from "three";
import {
  BULKHEAD,
  DRIP_BACK_FEED,
  DRIP_BACK_RUN,
  DRIP_EMITTER_SPACING,
  DRIP_LEFT_FEED,
  DRIP_LEFT_RUN,
  DRIP_RIGHT_FEED,
  DRIP_RIGHT_RUN,
  HOSE,
  HOSE_RADIUS,
  MANIFOLD,
  OUTLET,
  POLY_RADIUS,
  SOIL_TOP_Y,
  VALVE,
} from "./config";
import { Label } from "./Label";
import { Wire } from "./Wire";
import type { BedKey } from "./views";

type WaterProps = {
  showLabels: boolean;
  /** Which beds are watering — wire to API later. */
  wateringBeds?: BedKey[];
};

function emittersAlong(from: Vector3Tuple, to: Vector3Tuple, spacing: number): Vector3Tuple[] {
  const [x0, y0, z0] = from;
  const [x1, y1, z1] = to;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return [];
  const out: Vector3Tuple[] = [];
  for (let i = 0; i * spacing <= len + 1e-6; i++) {
    const t = (i * spacing) / len;
    out.push([x0 + dx * t, y0 + dy * t, z0 + dz * t]);
  }
  return out;
}

const DROPS_PER_EMITTER = 3;
const DRIP_CYCLE = 0.95; // seconds per droplet

/** Falling drips — only mounted while the bed is watering. */
function DripEmitter({
  position,
  index,
}: {
  position: Vector3Tuple;
  index: number;
}) {
  const group = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  // Form on the underside of the poly tube; land on soil
  const y0 = -POLY_RADIUS;
  const fall = position[1] + y0 - SOIL_TOP_Y;

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const mesh = g.children[i] as Mesh;
      const mat = mesh.material as MeshStandardMaterial;
      const phase = (t / DRIP_CYCLE + i / DROPS_PER_EMITTER + index * 0.17) % 1;

      if (phase < 0.22) {
        // Hang and swell at the emitter
        const grow = phase / 0.22;
        mesh.visible = true;
        mesh.position.set(0, y0, 0);
        mesh.scale.setScalar(0.4 + grow * 0.85);
        mat.opacity = 0.5 + grow * 0.4;
      } else if (phase < 0.82) {
        // Fall with gravity ease-in; stretch into a teardrop
        const u = (phase - 0.22) / 0.6;
        mesh.visible = true;
        mesh.position.set(0, y0 - fall * u * u, 0);
        mesh.scale.set(0.6 - u * 0.15, 0.85 + u * 1.1, 0.6 - u * 0.15);
        mat.opacity = 0.9;
      } else {
        // Flatten into a wet spot on the soil
        const u = (phase - 0.82) / 0.18;
        mesh.visible = u < 0.9;
        mesh.position.set(0, y0 - fall, 0);
        mesh.scale.set(1 + u * 1.8, 0.2, 1 + u * 1.8);
        mat.opacity = 0.65 * (1 - u);
      }
    }
    invalidate();
  });

  return (
    <group ref={group} position={position}>
      {Array.from({ length: DROPS_PER_EMITTER }, (_, i) => (
        <mesh key={i} visible={false}>
          <sphereGeometry args={[0.32, 10, 10]} />
          <meshStandardMaterial
            color="#5eb0ff"
            roughness={0.12}
            metalness={0.05}
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function ValveCoil({ active }: { active: boolean }) {
  const mat = useRef<MeshStandardMaterial>(null);
  const invalidate = useThree((s) => s.invalidate);

  useFrame(({ clock }) => {
    const m = mat.current;
    if (!m) return;
    if (!active) {
      m.emissive.setHex(0x000000);
      m.emissiveIntensity = 0;
      m.color.set("#1a1a1a");
      return;
    }
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 6);
    m.color.set("#1a1a1a");
    m.emissive.set("#ff6b2d");
    m.emissiveIntensity = 0.4 + pulse * 0.9;
    invalidate();
  });

  return (
    <mesh position={VALVE.coil} castShadow>
      <cylinderGeometry args={[VALVE.coilRadius, VALVE.coilRadius, VALVE.coilHeight, 20]} />
      <meshStandardMaterial ref={mat} color="#1a1a1a" roughness={0.55} />
    </mesh>
  );
}

export function Water({ showLabels, wateringBeds = [] }: WaterProps) {
  const hose = useMemo(
    () => new CatmullRomCurve3(HOSE.map((p) => new Vector3(...p))),
    [],
  );

  const drips = useMemo(
    () => ({
      back: emittersAlong(DRIP_BACK_RUN[0], DRIP_BACK_RUN[1], DRIP_EMITTER_SPACING),
      left: emittersAlong(DRIP_LEFT_RUN[0], DRIP_LEFT_RUN[1], DRIP_EMITTER_SPACING),
      right: emittersAlong(DRIP_RIGHT_RUN[0], DRIP_RIGHT_RUN[1], DRIP_EMITTER_SPACING),
    }),
    [],
  );

  const active = new Set(wateringBeds);
  const valveOn = wateringBeds.length > 0;

  return (
    <group name="water">
      <mesh>
        <tubeGeometry args={[hose, 96, HOSE_RADIUS, 12, false]} />
        <meshStandardMaterial color="#2f7d3a" roughness={0.7} />
      </mesh>
      <Label position={[0, 13, -40]} show={showLabels}>
        Hose
      </Label>

      <mesh position={BULKHEAD.position} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[BULKHEAD.radius, BULKHEAD.radius, BULKHEAD.length, 20]} />
        <meshStandardMaterial color="#b5893b" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={BULKHEAD.position} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[BULKHEAD.radius + 0.15, 0.08, 8, 24]} />
        <meshStandardMaterial color="#b5893b" metalness={0.9} roughness={0.3} />
      </mesh>

      <mesh position={VALVE.body} castShadow>
        <boxGeometry args={VALVE.bodySize} />
        <meshStandardMaterial color="#b5893b" metalness={0.85} roughness={0.3} />
      </mesh>
      <ValveCoil active={valveOn} />
      <Label position={[2.2, 15.2, -31.8]} show={showLabels}>
        Valve
      </Label>

      <Wire points={OUTLET} color="#1a1a1a" radius={POLY_RADIUS} />

      <mesh position={MANIFOLD.position} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[MANIFOLD.radius, MANIFOLD.radius, MANIFOLD.length, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.55} />
      </mesh>

      <Wire points={DRIP_BACK_FEED} color="#1a1a1a" radius={POLY_RADIUS} />
      <Wire points={DRIP_BACK_RUN} color="#1a1a1a" radius={POLY_RADIUS} />
      <Wire points={DRIP_LEFT_FEED} color="#1a1a1a" radius={POLY_RADIUS} />
      <Wire points={DRIP_LEFT_RUN} color="#1a1a1a" radius={POLY_RADIUS} />
      <Wire points={DRIP_RIGHT_FEED} color="#1a1a1a" radius={POLY_RADIUS} />
      <Wire points={DRIP_RIGHT_RUN} color="#1a1a1a" radius={POLY_RADIUS} />

      {active.has("back") &&
        drips.back.map((p, i) => (
          <DripEmitter key={`b-${i}`} position={p} index={i} />
        ))}
      {active.has("left") &&
        drips.left.map((p, i) => (
          <DripEmitter key={`l-${i}`} position={p} index={i} />
        ))}
      {active.has("right") &&
        drips.right.map((p, i) => (
          <DripEmitter key={`r-${i}`} position={p} index={i} />
        ))}
    </group>
  );
}
