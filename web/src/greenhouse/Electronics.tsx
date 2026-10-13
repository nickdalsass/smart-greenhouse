import { useMemo } from "react";
import { CatmullRomCurve3, Vector3 } from "three";
import {
  DHT,
  DHT_CABLE,
  PI,
  PLATE,
  RELAY,
  SENSOR_BLADE,
  SENSORS,
  SOIL_TOP_Y,
} from "./config";
import { Label } from "./Label";
import { useWoodMap } from "./woodMap";

type ElectronicsProps = {
  showLabels: boolean;
};

function MoistureSensor({
  position,
  label,
  showLabels,
}: {
  position: [number, number, number];
  label: string;
  showLabels: boolean;
}) {
  const [, bladeH] = SENSOR_BLADE.size;
  const bladeCenterY =
    SOIL_TOP_Y - SENSOR_BLADE.buried + bladeH / 2 - position[1];
  const headY = bladeCenterY + bladeH / 2 + 0.5;

  return (
    <group position={position}>
      <mesh position={[0, bladeCenterY, 0]} castShadow>
        <boxGeometry args={SENSOR_BLADE.size} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, headY, 0]} castShadow>
        <boxGeometry args={[0.9, 1.0, 0.15]} />
        <meshStandardMaterial color="#2d6a4f" roughness={0.6} />
      </mesh>
      <mesh position={[0, headY + 0.55, 0.12]}>
        <boxGeometry args={[0.25, 0.2, 0.2]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} />
      </mesh>
      <Label position={[0, headY + 1.4, 0]} show={showLabels}>
        {label}
      </Label>
    </group>
  );
}

export function Electronics({ showLabels }: ElectronicsProps) {
  const woodMap = useWoodMap();
  const sensorCable = useMemo(
    () => new CatmullRomCurve3(DHT_CABLE.map((p) => new Vector3(...p))),
    [],
  );

  return (
    <group name="electronics">
      <mesh position={PLATE.position} castShadow receiveShadow>
        <boxGeometry args={PLATE.size} />
        <meshStandardMaterial
          map={woodMap}
          color="#c4a574"
          roughness={0.85}
          metalness={0.02}
        />
      </mesh>

      <group position={PI.position}>
        <mesh castShadow>
          <boxGeometry args={PI.size} />
          <meshStandardMaterial color="#2b2b2b" roughness={0.55} />
        </mesh>
        {/* Status LED facing into the greenhouse (+Z) */}
        <mesh position={[0.9, 0.8, PI.size[2] / 2 + 0.02]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial
            color="#3ddc84"
            emissive="#3ddc84"
            emissiveIntensity={0.8}
          />
        </mesh>
        <mesh position={[-1.4, -0.9, PI.size[2] / 2 + 0.01]}>
          <boxGeometry args={[0.9, 0.35, 0.08]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.6} roughness={0.35} />
        </mesh>
        <Label position={[0, 2.0, 0.8]} show={showLabels}>
          Pi
        </Label>
      </group>

      <group position={RELAY.position}>
        <mesh castShadow>
          <boxGeometry args={RELAY.size} />
          <meshStandardMaterial color="#1e5a9c" roughness={0.45} />
        </mesh>
        <Label position={[1.4, 0.2, 0.6]} show={showLabels}>
          Relay
        </Label>
      </group>

      <group position={DHT.position}>
        <mesh castShadow>
          <boxGeometry args={DHT.size} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.7} />
        </mesh>
        {[-0.25, 0, 0.25].map((x, i) => (
          <mesh key={i} position={[x, 0, DHT.size[2] / 2 + 0.01]}>
            <boxGeometry args={[0.08, 0.7, 0.02]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        ))}
        <Label position={[1.2, 0.2, 0.6]} show={showLabels}>
          DHT
        </Label>
      </group>

      <mesh>
        <tubeGeometry args={[sensorCable, 24, 0.08, 6, false]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.6} />
      </mesh>

      {SENSORS.map((s) => (
        <MoistureSensor
          key={s.id}
          position={s.position}
          label={s.label}
          showLabels={showLabels}
        />
      ))}
    </group>
  );
}
