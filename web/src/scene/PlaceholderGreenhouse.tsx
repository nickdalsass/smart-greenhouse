import { type ThreeEvent } from "@react-three/fiber";

const BEDS = [
  { bedId: 1, position: [-1.7, 0.28, 0.15] as const, color: "#6b4a32" },
  { bedId: 2, position: [0, 0.28, 0.15] as const, color: "#5e4030" },
  { bedId: 3, position: [1.7, 0.28, 0.15] as const, color: "#744f36" },
];

type Props = {
  onSelectBed?: (bedId: number) => void;
};

/** Stand-in geometry until the Blender glTF is ready. */
export function PlaceholderGreenhouse({ onSelectBed }: Props) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color="#0c1a12" roughness={0.95} />
      </mesh>

      {/* path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1.6]}>
        <planeGeometry args={[1.1, 2.8]} />
        <meshStandardMaterial color="#1c2a20" roughness={1} />
      </mesh>

      {/* glass volume */}
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[6.8, 3.1, 4.2]} />
        <meshPhysicalMaterial
          color="#c8e8d4"
          transmission={0.65}
          thickness={0.4}
          roughness={0.15}
          metalness={0}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* roof ridge */}
      <mesh position={[0, 3.15, 0]}>
        <boxGeometry args={[6.9, 0.06, 4.3]} />
        <meshStandardMaterial color="#2a3d30" metalness={0.4} roughness={0.45} />
      </mesh>

      {/* posts */}
      {[
        [-3.2, 1.5, -1.9],
        [3.2, 1.5, -1.9],
        [-3.2, 1.5, 1.9],
        [3.2, 1.5, 1.9],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[0.08, 3, 0.08]} />
          <meshStandardMaterial color="#3a4f40" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}

      {BEDS.map(({ bedId, position, color }) => (
        <group key={bedId} position={position}>
          <mesh
            castShadow
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onSelectBed?.(bedId);
            }}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default";
            }}
          >
            <boxGeometry args={[1.35, 0.55, 2.35]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
          {/* soil */}
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[1.2, 0.12, 2.15]} />
            <meshStandardMaterial color="#2a1c14" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
