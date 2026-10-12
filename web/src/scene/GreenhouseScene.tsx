import { PlaceholderGreenhouse } from "./PlaceholderGreenhouse";
// import { GlbGreenhouse } from "./GlbGreenhouse";

/**
 * Swap to the Blender model:
 * 1. Export → web/public/models/greenhouse.glb
 * 2. Set USE_GLB = true and uncomment GlbGreenhouse
 */
const USE_GLB = false;

type Props = {
  onSelectBed?: (bedId: number) => void;
};

export function GreenhouseScene({ onSelectBed }: Props) {
  if (USE_GLB) {
    // return <GlbGreenhouse />;
  }

  return <PlaceholderGreenhouse onSelectBed={onSelectBed} />;
}
