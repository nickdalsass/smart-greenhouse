import {
  WIRE_COLORS,
  WIRE_S1,
  WIRE_S2,
  WIRE_S3,
  WIRE_VALVE,
} from "./config";
import { Wire } from "./Wire";

export function Wires() {
  return (
    <group name="wires">
      <Wire points={WIRE_S1} color={WIRE_COLORS.S1} />
      <Wire points={WIRE_S2} color={WIRE_COLORS.S2} />
      <Wire points={WIRE_S3} color={WIRE_COLORS.S3} />
      <Wire points={WIRE_VALVE} color={WIRE_COLORS.valve} />
    </group>
  );
}
