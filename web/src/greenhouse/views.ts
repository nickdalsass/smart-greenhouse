import { BEDS, SOIL_TOP_Y } from "./config";

export type BedKey = keyof typeof BEDS;
export type SceneView = "outside" | "inside" | BedKey;

export type ViewPreset = {
  position: [number, number, number];
  target: [number, number, number];
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
};

export const OUTSIDE_VIEW: ViewPreset = {
  position: [100, 72, 115],
  target: [0, 12, 0],
  minDistance: 110,
  maxDistance: 170,
  minPolarAngle: 0.35,
  maxPolarAngle: Math.PI / 2 - 0.08,
};

export const INSIDE_VIEW: ViewPreset = {
  position: [0, 13, 5],
  target: [0, 11, -6],
  minDistance: 2.5,
  maxDistance: 11,
  minPolarAngle: 0.55,
  maxPolarAngle: Math.PI / 2 + 0.35,
};

/** Top-down look at a bed — tight crop, little tilt so walls stay out of frame. */
export function bedTopView(bed: BedKey): ViewPreset {
  const [cx, , cz] = BEDS[bed].center;
  const [bw, , bd] = BEDS[bed].size;
  const span = Math.max(bw, bd);
  const height = span * 0.52 + 10;
  return {
    position: [cx, height, cz + 0.01],
    target: [cx, SOIL_TOP_Y, cz],
    minDistance: height * 0.92,
    maxDistance: height * 1.08,
    minPolarAngle: 0.02,
    maxPolarAngle: 0.22,
  };
}

export function presetFor(view: SceneView): ViewPreset {
  if (view === "outside") return OUTSIDE_VIEW;
  if (view === "inside") return INSIDE_VIEW;
  return bedTopView(view);
}

/** Overlay bedId: left=1, back=2, right=3 */
export function bedIdFor(bed: BedKey): number {
  return bed === "left" ? 1 : bed === "back" ? 2 : 3;
}

export function bedKeyFor(id: number): BedKey | null {
  if (id === 1) return "left";
  if (id === 2) return "back";
  if (id === 3) return "right";
  return null;
}
