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
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <span className="scene-label">{children}</span>
    </Html>
  );
}
