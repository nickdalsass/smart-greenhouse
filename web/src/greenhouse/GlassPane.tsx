import { DoubleSide, type Shape } from "three";
import { GLASS, GLASS_T } from "./config";

type BoxPaneProps = {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
};

type ShapePaneProps = {
  shape: Shape;
  position: [number, number, number];
  rotation?: [number, number, number];
};

/**
 * Stable panes: write depth, no fog (fog was eating them at angles),
 * low env so they don’t flash while orbiting.
 */
function GlassMaterial() {
  return (
    <meshStandardMaterial
      color={GLASS.color}
      transparent
      opacity={GLASS.opacity}
      depthWrite
      depthTest
      side={DoubleSide}
      roughness={0.28}
      metalness={0}
      envMapIntensity={0.05}
      fog={false}
      polygonOffset
      polygonOffsetFactor={-1}
      polygonOffsetUnits={-1}
    />
  );
}

/** Flat rectangular glass pane. */
export function GlassPane({ args, position, rotation }: BoxPaneProps) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      renderOrder={2}
      raycast={() => undefined}
    >
      <boxGeometry args={args} />
      <GlassMaterial />
    </mesh>
  );
}

/** Extruded Shape glass (gable ends). */
export function GlassShape({ shape, position, rotation }: ShapePaneProps) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      renderOrder={2}
      raycast={() => undefined}
    >
      <extrudeGeometry args={[shape, { depth: GLASS_T, bevelEnabled: false }]} />
      <GlassMaterial />
    </mesh>
  );
}
