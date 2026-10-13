import { Html } from "@react-three/drei";

export function Label({
  children,
  position,
  show,
}: {
  children: string;
  position: [number, number, number];
  show: boolean;
}) {
  if (!show) return null;
  // No distanceFactor — fixed screen size so labels don't blow up up close
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <div className="scene-label">{children}</div>
    </Html>
  );
}
