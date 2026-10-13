/** All scene dimensions in inches. 1 unit = 1 inch. Y up. */

export const EXT_W = 48.5;
export const EXT_L = 71;
export const INT_W = 46.5;
export const INT_L = 69;
export const WALL_T = 1;

export const WALL_H = 24;
export const RISE = 14;
export const PITCH = Math.atan(RISE / (EXT_W / 2));
export const RIDGE_H = WALL_H + RISE; // 38

export const GLASS_T = 0.25;
export const SIDE_GLASS_H = 22;
export const SIDE_GLASS_Y = 12;
export const SIDE_GLASS_X = 23.75;
export const GABLE_GLASS_Z = 35;
export const ROOF_PANE_W = 28;
export const ROOF_PANE_Y = 31;
export const ROOF_PANE_X = 12.125;

/** Gable pentagon in local XY (inches). */
export const GABLE_POINTS: [number, number][] = [
  [-23.25, 1],
  [23.25, 1],
  [23.25, 24],
  [0, 37.4],
  [-23.25, 24],
];

export const BED_DEPTH = 12;
export const BED_H = 8;
export const BED_BOARD_T = 0.75;
export const SOIL_TOP_Y = 7;

export const INT_HALF_X = INT_W / 2; // 23.25
export const INT_HALF_Z = INT_L / 2; // 34.5
export const EXT_HALF_X = EXT_W / 2; // 24.25
export const EXT_HALF_Z = EXT_L / 2; // 35.5

export const METAL = {
  color: "#b8c2cc",
  metalness: 0.7,
  roughness: 0.38,
  envMapIntensity: 0.35,
} as const;

export const PINE = {
  color: "#9a7349",
  roughness: 0.72,
} as const;

export const SOIL = {
  color: "#3b2a1e",
  roughness: 1,
} as const;

export const GLASS = {
  color: "#eaf6fa",
  // ponytail: std material + opacity — transmission was too heavy
  opacity: 0.32,
} as const;

/** Front door (inches), hinged on the left, opens outward. */
export const DOOR_W = 28;
export const DOOR_H = 22;
export const DOOR_Y0 = 1;
export const DOOR_OPEN_RAD = -1.85; // ~−106° swung open

export type SensorId = "S1" | "S2" | "S3";

export const SENSORS: {
  id: SensorId;
  bed: "back" | "left" | "right";
  position: [number, number, number];
  label: string;
}[] = [
  // Left side of back bed — clear of the centerline valve/manifold
  { id: "S1", bed: "back", position: [-7.5, SOIL_TOP_Y, -28.5], label: "Bed 2" },
  { id: "S2", bed: "left", position: [-17.25, SOIL_TOP_Y, -9.5], label: "Bed 1" },
  { id: "S3", bed: "right", position: [17.25, SOIL_TOP_Y, -9.5], label: "Bed 3" },
];

export const BEDS = {
  back: {
    center: [0, 4, -28.5] as [number, number, number],
    size: [22.5, BED_H, BED_DEPTH] as [number, number, number],
  },
  left: {
    center: [-17.25, 4, -9.5] as [number, number, number],
    size: [BED_DEPTH, BED_H, 50] as [number, number, number],
  },
  right: {
    center: [17.25, 4, -9.5] as [number, number, number],
    size: [BED_DEPTH, BED_H, 50] as [number, number, number],
  },
} as const;

/** Mount board on back wall, left of the solenoid (valve at x=0). Thin in Z. */
export const PLATE = {
  // Shorter vertically (trimmed from the bottom); top stays near the Pi/DHT
  size: [14, 10, 0.5] as [number, number, number],
  position: [-9.5, 14.5, -33.85] as [number, number, number],
};

export const PI = {
  size: [4.2, 3, 1.2] as [number, number, number],
  position: [-12.2, 15, -33.0] as [number, number, number],
};

export const RELAY = {
  size: [1.5, 1.5, 0.8] as [number, number, number],
  position: [-8.85, 14.85, -33.0] as [number, number, number],
};

export const DHT = {
  size: [1.0, 1.0, 0.6] as [number, number, number],
  position: [-6.2, 16, -33.15] as [number, number, number],
};

export const DHT_CABLE: [number, number, number][] = [
  [-6.2, 16, -33.15],
  [-8.5, 16.2, -32.6],
  [-11, 15.5, -32.8],
  [-12.2, 15, -33.0],
];

export const SENSOR_BLADE = {
  size: [0.9, 3.9, 0.06] as [number, number, number],
  buried: 2.5,
};

export const WIRE_COLORS = {
  S1: "#f2c200",
  S2: "#2fb344",
  S3: "#2f7bff",
  valve: "#e03131",
} as const;

export const WIRE_RADIUS = 0.12;

export const WIRE_S1: [number, number, number][] = [
  [-7.5, 8.4, -28.5],
  [-7.5, 9.5, -29.5],
  [-10, 10, -31],
  [-12, 11.5, -32.5],
  [-12.2, 14, -33.0],
];

// Skirt the outer side of the left bed — clear of flowers
export const WIRE_S2: [number, number, number][] = [
  [-17.25, 8.4, -9.5],
  [-19.2, 10.2, -9.5],
  [-20.2, 11.2, -9.5],
  [-20.2, 11.2, -26],
  [-16, 12, -31.5],
  [-13.2, 13, -32.5],
  [-12.2, 14.2, -33.0],
];

// Skirt the outer side of the right bed — clear of flowers
export const WIRE_S3: [number, number, number][] = [
  [17.25, 8.4, -9.5],
  [20.4, 10.2, -9.5],
  [22.0, 11.2, -9.5],
  [22.0, 11.2, -26],
  [11.5, 12, -31.5],
  [0, 12.5, -32.3],
  [-8, 13.5, -32.8],
  [-12.2, 14.5, -33.0],
];

export const WIRE_VALVE: [number, number, number][] = [
  // Exit the relay’s +X face (toward the valve) — not through the front
  [-8.05, 14.85, -33.0],
  [-5.5, 14.85, -32.4],
  [-2, 14.75, -32],
  [0, 14.8, -31.8],
];

export const HOSE: [number, number, number][] = [
  // Tip past the grass fade — vanishes into the void
  [55, 0.2, -200],
  [38, 0.3, -150],
  [20, 0.5, -90],
  [6, 0.5, -60],
  [0, 3, -42],
  [0, 13, -36.5],
];

export const HOSE_RADIUS = 0.5;
export const BULKHEAD = {
  position: [0, 13, -35] as [number, number, number],
  radius: 0.6,
  length: 3, // z -36.5 → -33.5
};

export const VALVE = {
  body: [0, 13, -31.8] as [number, number, number],
  bodySize: [1.8, 1.8, 3.5] as [number, number, number],
  coil: [0, 14.8, -31.8] as [number, number, number],
  coilRadius: 0.8,
  coilHeight: 2,
};

export const POLY_RADIUS = 0.3;
export const MANIFOLD = {
  position: [0, 9.5, -30] as [number, number, number],
  radius: 0.45,
  length: 2,
};

export const OUTLET: [number, number, number][] = [
  [0, 13, -30],
  [0, 9.5, -30],
];

// Level bed runs just above the board tops (boards end at y=BED_H=8)
export const DRIP_Y = 8.6;

// Feed + run split so bed runs stay straight (2-pt tube) and drips sit on them
export const DRIP_BACK_FEED: [number, number, number][] = [
  [0, 9.5, -30],
  [0, DRIP_Y, -30],
  [0, DRIP_Y, -31.5],
];
export const DRIP_BACK_RUN: [number, number, number][] = [
  [-9, DRIP_Y, -31.5],
  [9, DRIP_Y, -31.5],
];

// Side runs start farther forward (no backmost drip at z=-30)
export const DRIP_LEFT_FEED: [number, number, number][] = [
  [-1, 9.5, -30],
  [-14.5, 9.5, -30],
  [-14.5, 9.5, -24],
  [-14.5, DRIP_Y, -24],
];
export const DRIP_LEFT_RUN: [number, number, number][] = [
  [-14.5, DRIP_Y, -24],
  [-14.5, DRIP_Y, 10],
];

export const DRIP_RIGHT_FEED: [number, number, number][] = [
  [1, 9.5, -30],
  [14.5, 9.5, -30],
  [14.5, 9.5, -24],
  [14.5, DRIP_Y, -24],
];
export const DRIP_RIGHT_RUN: [number, number, number][] = [
  [14.5, DRIP_Y, -24],
  [14.5, DRIP_Y, 10],
];

export const DRIP_EMITTER_SPACING = 6;

/**
 * Grassy island under greenhouse + hose (hose runs past fade ~z=-200).
 * Center nudged toward the hose so the fade starts after the run is visible.
 */
export const GRASS_CENTER: [number, number, number] = [4, 0, -22];
export const GRASS_RADIUS = 115;
/** Solid grass until this fraction of radius; then fade to void. */
export const GRASS_FADE_START = 0.58;
