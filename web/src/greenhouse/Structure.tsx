import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Path, Shape, type Group } from "three";
import {
  DOOR_H,
  DOOR_OPEN_RAD,
  DOOR_W,
  DOOR_Y0,
  EXT_HALF_X,
  EXT_HALF_Z,
  EXT_L,
  EXT_W,
  GABLE_GLASS_Z,
  GABLE_POINTS,
  GLASS_T,
  INT_L,
  METAL,
  PITCH,
  RIDGE_H,
  ROOF_PANE_W,
  ROOF_PANE_X,
  ROOF_PANE_Y,
  SIDE_GLASS_H,
  SIDE_GLASS_X,
  SIDE_GLASS_Y,
  WALL_H,
  WALL_T,
} from "./config";
import { GlassPane, GlassShape } from "./GlassPane";
import { useSolidClick } from "./solidClick";

type StructureProps = {
  showRoof: boolean;
  onEnterInside?: () => void;
};

function MetalMat() {
  return (
    <meshStandardMaterial
      color={METAL.color}
      metalness={METAL.metalness}
      roughness={METAL.roughness}
      envMapIntensity={METAL.envMapIntensity}
    />
  );
}

function Bar({
  args,
  position,
  rotation,
}: {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <MetalMat />
    </mesh>
  );
}

function RoofPaneFrame({
  widthAlongSlope,
  length,
  center,
  rotationZ,
}: {
  widthAlongSlope: number;
  length: number;
  center: [number, number, number];
  rotationZ: number;
}) {
  const t = WALL_T;
  const w = widthAlongSlope;
  const l = length;
  return (
    <group position={center} rotation={[0, 0, rotationZ]}>
      <Bar args={[w, t, t]} position={[0, 0, -l / 2 + t / 2]} />
      <Bar args={[w, t, t]} position={[0, 0, l / 2 - t / 2]} />
      <Bar args={[t, t, l]} position={[-w / 2 + t / 2, 0, 0]} />
      <Bar args={[t, t, l]} position={[w / 2 - t / 2, 0, 0]} />
    </group>
  );
}

/** Aluminum-framed glass door — click leaf to open/close; click opening to enter. */
function FrontDoor({ onEnterInside }: { onEnterInside?: () => void }) {
  const t = WALL_T;
  const z = GABLE_GLASS_Z;
  const hingeX = -DOOR_W / 2;
  const midY = DOOR_Y0 + DOOR_H / 2;

  const [open, setOpen] = useState(true);
  const pivot = useRef<Group>(null);
  const angle = useRef(DOOR_OPEN_RAD);
  const invalidate = useThree((s) => s.invalidate);

  const doorClick = useSolidClick(() => {
    setOpen((v) => !v);
    invalidate();
  });
  const enterClick = useSolidClick(() => {
    onEnterInside?.();
    invalidate();
  });

  useFrame((_, dt) => {
    const target = open ? DOOR_OPEN_RAD : 0;
    const next = MathUtils.damp(angle.current, target, 10, dt);
    if (Math.abs(next - angle.current) < 1e-4 && Math.abs(next - target) < 1e-3) {
      angle.current = target;
      if (pivot.current) pivot.current.rotation.y = target;
      return;
    }
    angle.current = next;
    if (pivot.current) pivot.current.rotation.y = next;
    invalidate();
  });

  return (
    <group name="door">
      <Bar args={[t, DOOR_H, t]} position={[hingeX, midY, z]} />
      <Bar args={[t, DOOR_H, t]} position={[DOOR_W / 2, midY, z]} />
      <Bar
        args={[DOOR_W + t, t, t]}
        position={[0, DOOR_Y0 + DOOR_H - t / 2, z]}
      />

      <group ref={pivot} position={[hingeX, midY, z]} rotation={[0, DOOR_OPEN_RAD, 0]}>
        <group position={[DOOR_W / 2, 0, 0]} {...doorClick}>
          <Bar args={[DOOR_W, t, t]} position={[0, DOOR_H / 2 - t / 2, 0]} />
          <Bar args={[DOOR_W, t, t]} position={[0, -DOOR_H / 2 + t / 2, 0]} />
          <Bar args={[t, DOOR_H - 2 * t, t]} position={[-DOOR_W / 2 + t / 2, 0, 0]} />
          <Bar args={[t, DOOR_H - 2 * t, t]} position={[DOOR_W / 2 - t / 2, 0, 0]} />
          <Bar args={[DOOR_W - 2 * t, t * 0.75, t]} position={[0, 0, 0]} />
          <GlassPane
            args={[DOOR_W - 2 * t, DOOR_H / 2 - 1.5 * t, GLASS_T]}
            position={[0, DOOR_H / 4, 0]}
          />
          <GlassPane
            args={[DOOR_W - 2 * t, DOOR_H / 2 - 1.5 * t, GLASS_T]}
            position={[0, -DOOR_H / 4, 0]}
          />
          <mesh position={[DOOR_W / 2 - 1.2, 0, 0.55]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.9, 12]} />
            <MetalMat />
          </mesh>
          <mesh>
            <boxGeometry args={[DOOR_W, DOOR_H, 1.2]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </group>

      {open && onEnterInside && (
        <mesh position={[0, midY, z - 5]} {...enterClick}>
          <boxGeometry args={[DOOR_W * 0.9, DOOR_H * 0.92, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export function Structure({ showRoof, onEnterInside }: StructureProps) {
  const hx = EXT_HALF_X;
  const hz = EXT_HALF_Z;
  const postY = WALL_H / 2;

  const backGable = useMemo(() => {
    const s = new Shape();
    const [first, ...rest] = GABLE_POINTS;
    s.moveTo(first[0], first[1]);
    for (const [x, y] of rest) s.lineTo(x, y);
    s.closePath();
    return s;
  }, []);

  const frontGable = useMemo(() => {
    const s = backGable.clone();
    const hole = new Path();
    hole.moveTo(-DOOR_W / 2, DOOR_Y0);
    hole.lineTo(DOOR_W / 2, DOOR_Y0);
    hole.lineTo(DOOR_W / 2, DOOR_Y0 + DOOR_H);
    hole.lineTo(-DOOR_W / 2, DOOR_Y0 + DOOR_H);
    hole.closePath();
    s.holes.push(hole);
    return s;
  }, [backGable]);

  const rafterLen = Math.hypot(hx, RIDGE_H - WALL_H);
  const rafterMidY = (WALL_H + RIDGE_H) / 2;

  // Front base rail split around the doorway
  const sideRailW = (EXT_W - DOOR_W) / 2 - WALL_T;

  return (
    <group name="structure">
      {(
        [
          [hx - WALL_T / 2, postY, hz - WALL_T / 2],
          [-hx + WALL_T / 2, postY, hz - WALL_T / 2],
          [hx - WALL_T / 2, postY, -hz + WALL_T / 2],
          [-hx + WALL_T / 2, postY, -hz + WALL_T / 2],
        ] as [number, number, number][]
      ).map((p, i) => (
        <Bar key={`post-${i}`} args={[WALL_T, WALL_H, WALL_T]} position={p} />
      ))}

      {/* Base rails — front split for door */}
      <Bar
        args={[sideRailW, WALL_T, WALL_T]}
        position={[-(DOOR_W / 2 + sideRailW / 2), WALL_T / 2, hz - WALL_T / 2]}
      />
      <Bar
        args={[sideRailW, WALL_T, WALL_T]}
        position={[DOOR_W / 2 + sideRailW / 2, WALL_T / 2, hz - WALL_T / 2]}
      />
      <Bar args={[EXT_W - 2 * WALL_T, WALL_T, WALL_T]} position={[0, WALL_T / 2, -hz + WALL_T / 2]} />
      <Bar args={[WALL_T, WALL_T, EXT_L - 2 * WALL_T]} position={[hx - WALL_T / 2, WALL_T / 2, 0]} />
      <Bar args={[WALL_T, WALL_T, EXT_L - 2 * WALL_T]} position={[-hx + WALL_T / 2, WALL_T / 2, 0]} />

      <Bar
        args={[EXT_W - 2 * WALL_T, WALL_T, WALL_T]}
        position={[0, WALL_H - WALL_T / 2, hz - WALL_T / 2]}
      />
      <Bar
        args={[EXT_W - 2 * WALL_T, WALL_T, WALL_T]}
        position={[0, WALL_H - WALL_T / 2, -hz + WALL_T / 2]}
      />
      <Bar
        args={[WALL_T, WALL_T, EXT_L - 2 * WALL_T]}
        position={[hx - WALL_T / 2, WALL_H - WALL_T / 2, 0]}
      />
      <Bar
        args={[WALL_T, WALL_T, EXT_L - 2 * WALL_T]}
        position={[-hx + WALL_T / 2, WALL_H - WALL_T / 2, 0]}
      />

      <Bar args={[WALL_T, WALL_T, EXT_L]} position={[0, RIDGE_H, 0]} />

      {(
        [
          { z: hz - WALL_T / 2, xSign: 1 },
          { z: hz - WALL_T / 2, xSign: -1 },
          { z: -hz + WALL_T / 2, xSign: 1 },
          { z: -hz + WALL_T / 2, xSign: -1 },
        ] as const
      ).map(({ z, xSign }, i) => (
        <Bar
          key={`rafter-${i}`}
          args={[rafterLen, WALL_T, WALL_T]}
          position={[(xSign * hx) / 2, rafterMidY, z]}
          rotation={[0, 0, xSign * -PITCH]}
        />
      ))}

      <GlassPane
        args={[GLASS_T, SIDE_GLASS_H, INT_L]}
        position={[SIDE_GLASS_X, SIDE_GLASS_Y, 0]}
      />
      <GlassPane
        args={[GLASS_T, SIDE_GLASS_H, INT_L]}
        position={[-SIDE_GLASS_X, SIDE_GLASS_Y, 0]}
      />

      <GlassShape
        shape={frontGable}
        position={[0, 0, GABLE_GLASS_Z - GLASS_T / 2]}
      />
      <GlassShape
        shape={backGable}
        position={[0, 0, -GABLE_GLASS_Z - GLASS_T / 2]}
      />

      <FrontDoor onEnterInside={onEnterInside} />

      {showRoof && (
        <group name="roof">
          <GlassPane
            args={[ROOF_PANE_W, GLASS_T, EXT_L]}
            position={[-ROOF_PANE_X, ROOF_PANE_Y, 0]}
            rotation={[0, 0, PITCH]}
          />
          <GlassPane
            args={[ROOF_PANE_W, GLASS_T, EXT_L]}
            position={[ROOF_PANE_X, ROOF_PANE_Y, 0]}
            rotation={[0, 0, -PITCH]}
          />
          <RoofPaneFrame
            widthAlongSlope={ROOF_PANE_W}
            length={EXT_L}
            center={[-ROOF_PANE_X, ROOF_PANE_Y, 0]}
            rotationZ={PITCH}
          />
          <RoofPaneFrame
            widthAlongSlope={ROOF_PANE_W}
            length={EXT_L}
            center={[ROOF_PANE_X, ROOF_PANE_Y, 0]}
            rotationZ={-PITCH}
          />
        </group>
      )}

    </group>
  );
}
