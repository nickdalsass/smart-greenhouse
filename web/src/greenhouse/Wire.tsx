import { useMemo } from "react";
import { CatmullRomCurve3, Vector3, type Vector3Tuple } from "three";
import { WIRE_RADIUS } from "./config";

type WireProps = {
  points: Vector3Tuple[];
  color: string;
  radius?: number;
};

export function Wire({ points, color, radius = WIRE_RADIUS }: WireProps) {
  const curve = useMemo(
    () => new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
    [points],
  );

  return (
    <mesh>
      <tubeGeometry args={[curve, Math.max(points.length * 8, 24), radius, 8, false]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.1} />
    </mesh>
  );
}
