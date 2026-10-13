import type { CanvasTexture } from "three";
import { BED_BOARD_T, BEDS, PINE, SOIL, SOIL_TOP_Y } from "./config";
import { useSolidClick } from "./solidClick";
import type { BedKey } from "./views";
import { useWoodMap } from "./woodMap";

function WoodBoard({
  args,
  position,
  woodMap,
}: {
  args: [number, number, number];
  position: [number, number, number];
  woodMap: CanvasTexture;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial
        map={woodMap}
        color={PINE.color}
        roughness={PINE.roughness}
        metalness={0.02}
      />
    </mesh>
  );
}

function RaisedBed({
  bedKey,
  center,
  size,
  woodMap,
  onSelect,
}: {
  bedKey: BedKey;
  center: [number, number, number];
  size: [number, number, number];
  woodMap: CanvasTexture;
  onSelect?: (bed: BedKey) => void;
}) {
  const [w, h, d] = size;
  const t = BED_BOARD_T;
  const innerW = w - 2 * t;
  const innerD = d - 2 * t;
  const soilH = SOIL_TOP_Y;
  const soilLocalY = SOIL_TOP_Y - center[1] - soilH / 2;
  const click = useSolidClick(() => onSelect?.(bedKey));

  return (
    <group position={center} {...(onSelect ? click : {})}>
      <WoodBoard args={[w, h, t]} position={[0, 0, d / 2 - t / 2]} woodMap={woodMap} />
      <WoodBoard args={[w, h, t]} position={[0, 0, -d / 2 + t / 2]} woodMap={woodMap} />
      <WoodBoard
        args={[t, h, d - 2 * t]}
        position={[w / 2 - t / 2, 0, 0]}
        woodMap={woodMap}
      />
      <WoodBoard
        args={[t, h, d - 2 * t]}
        position={[-w / 2 + t / 2, 0, 0]}
        woodMap={woodMap}
      />
      <mesh position={[0, soilLocalY, 0]} receiveShadow>
        <boxGeometry args={[innerW, soilH, innerD]} />
        <meshStandardMaterial color={SOIL.color} roughness={SOIL.roughness} />
      </mesh>
      {/* Easy hit target over the soil */}
      <mesh position={[0, SOIL_TOP_Y - center[1] + 0.5, 0]}>
        <boxGeometry args={[innerW, 1, innerD]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Beds({ onSelectBed }: { onSelectBed?: (bed: BedKey) => void }) {
  const woodMap = useWoodMap();
  return (
    <group name="beds">
      {(["back", "left", "right"] as BedKey[]).map((key) => (
        <RaisedBed
          key={key}
          bedKey={key}
          center={BEDS[key].center}
          size={[...BEDS[key].size]}
          woodMap={woodMap}
          onSelect={onSelectBed}
        />
      ))}
    </group>
  );
}
