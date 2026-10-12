import { useGLTF } from "@react-three/drei";

const MODEL_PATH = "/models/greenhouse.glb";

/**
 * Loads the Blender export. Export as glTF Binary (.glb), Y-up, apply
 * transforms, keep poly count modest. Name bed meshes bed_1 / bed_2 / bed_3
 * if you want click mapping later.
 */
export function GlbGreenhouse() {
  const { scene } = useGLTF(MODEL_PATH);
  return <primitive object={scene} />;
}

useGLTF.preload(MODEL_PATH);
