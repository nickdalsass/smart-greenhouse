import { ContactShadows } from "@react-three/drei";
import { Beds } from "./Beds";
import { Electronics } from "./Electronics";
import { Ground } from "./Ground";
import { Plants } from "./Plants";
import { Structure } from "./Structure";
import { Water } from "./Water";
import { Wires } from "./Wires";
import { GRASS_RADIUS } from "./config";
import type { BedKey } from "./views";

type GreenhouseProps = {
  showRoof: boolean;
  showLabels: boolean;
  wateringBeds?: BedKey[];
  onEnterInside?: () => void;
  onSelectBed?: (bed: BedKey) => void;
};

export function Greenhouse({
  showRoof,
  showLabels,
  wateringBeds,
  onEnterInside,
  onSelectBed,
}: GreenhouseProps) {
  return (
    <group name="greenhouse">
      <Ground />
      <Structure showRoof={showRoof} onEnterInside={onEnterInside} />
      <Beds onSelectBed={onSelectBed} />
      <Plants />
      <Electronics showLabels={showLabels} />
      <Wires />
      <Water showLabels={showLabels} wateringBeds={wateringBeds} />
      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.55}
        scale={GRASS_RADIUS * 1.1}
        blur={4}
        far={60}
        color="#000000"
      />
    </group>
  );
}
