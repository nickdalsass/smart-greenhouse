import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Box3, Group, Object3D, Quaternion, Vector3 } from "three";
import { BEDS, BED_BOARD_T, SOIL_TOP_Y } from "./config";

const FLOWER_PATH = "/models/plants/low_poly_flowers_pack_game_ready.glb";

/** Scene inches — roughly bed-scale blooms. */
const TARGET_HEIGHT = 7;

/** Sink slightly into soil so they don’t look like they’re hovering. */
const BURY = 0.35;

function rnd(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Keep pack world orientation (Y-up). Offset using the *source* world
 * bounding box so the base sits on y=0, then scale to TARGET_HEIGHT.
 */
function makeTemplate(source: Object3D): Group {
  source.updateWorldMatrix(true, true);

  const worldBox = new Box3().setFromObject(source);
  const size = worldBox.getSize(new Vector3());
  const center = worldBox.getCenter(new Vector3());
  const height = Math.max(size.y, 1e-6);

  const clone = source.clone(true);
  clone.traverse((obj) => {
    obj.visible = true;
    if ((obj as Object3D & { isMesh?: boolean }).isMesh) {
      const mesh = obj as Object3D & {
        castShadow: boolean;
        receiveShadow: boolean;
      };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  const pos = new Vector3();
  const quat = new Quaternion();
  const scl = new Vector3();
  source.matrixWorld.decompose(pos, quat, scl);
  clone.position.copy(pos);
  clone.quaternion.copy(quat);
  clone.scale.copy(scl);
  clone.matrixAutoUpdate = true;

  const placed = new Group();
  placed.add(clone);
  placed.position.set(-center.x, -worldBox.min.y, -center.z);
  placed.updateMatrixWorld(true);

  const wrap = new Group();
  wrap.add(placed);
  wrap.scale.setScalar(TARGET_HEIGHT / height);
  return wrap;
}

type Placement = {
  position: [number, number, number];
  rotationY: number;
  scale: number;
  templateIndex: number;
};

function placementsForBed(
  bedKey: keyof typeof BEDS,
  count: number,
  seedOffset: number,
  templateCount: number,
): Placement[] {
  const bed = BEDS[bedKey];
  const [bw, , bd] = bed.size;
  const margin = BED_BOARD_T + 1.5;
  const out: Placement[] = [];

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const jitter = (rnd(seedOffset + i * 3) - 0.5) * 1.2;
    const jitter2 = (rnd(seedOffset + i * 7) - 0.5) * 0.9;
    let x: number;
    let z: number;

    if (bedKey === "back") {
      const half = bw / 2 - margin;
      x = bed.center[0] - half + t * half * 2 + jitter * 0.25;
      z = bed.center[2] + jitter2 * 0.4;
    } else {
      const half = bd / 2 - margin;
      x = bed.center[0] + jitter2 * 0.35;
      z = bed.center[2] - half + t * half * 2 + jitter * 0.2;
    }

    out.push({
      position: [x, SOIL_TOP_Y - BURY, z],
      rotationY: rnd(seedOffset + i * 11) * Math.PI * 2,
      scale: 0.9 + rnd(seedOffset + i * 13) * 0.2,
      // Walk through every flower in the pack, not just one
      templateIndex: (seedOffset + i) % templateCount,
    });
  }
  return out;
}

function FlowerInstance({
  template,
  placement,
}: {
  template: Group;
  placement: Placement;
}) {
  const obj = useMemo(() => {
    const c = template.clone(true) as Group;
    c.rotation.set(0, placement.rotationY, 0);
    c.scale.multiplyScalar(placement.scale);
    return c;
  }, [template, placement]);

  return <primitive object={obj} position={placement.position} />;
}

export function Plants() {
  const { scene } = useGLTF(FLOWER_PATH);
  const invalidate = useThree((s) => s.invalidate);

  const templates = useMemo(() => {
    // Prefer RootNode children = every flower variant in the pack
    const root =
      scene.getObjectByName("RootNode") ??
      scene.children[0]?.children[0]?.children[0];
    const sources =
      root && root.children.length > 0
        ? [...root.children]
        : (() => {
            const found: Object3D[] = [];
            scene.traverse((obj) => {
              if (
                obj.parent?.name === "RootNode" ||
                /^Cylinder(\.\d+)?$/.test(obj.name)
              ) {
                found.push(obj);
              }
            });
            return found;
          })();

    return sources.map((node) => makeTemplate(node));
  }, [scene]);

  const placements = useMemo(() => {
    if (templates.length === 0) return [] as Placement[];
    const n = templates.length;
    // Enough slots that every variant appears at least once across the beds
    const perSide = Math.max(n, 7);
    return [
      ...placementsForBed("back", Math.max(5, Math.ceil(n * 0.4)), 0, n),
      ...placementsForBed("left", perSide, 17, n),
      ...placementsForBed("right", perSide, 41, n),
    ];
  }, [templates]);

  useEffect(() => {
    invalidate();
  }, [templates, placements, invalidate]);

  if (templates.length === 0) return null;

  return (
    <group name="plants">
      {placements.map((p, i) => (
        <FlowerInstance
          key={i}
          template={templates[p.templateIndex]}
          placement={p}
        />
      ))}
    </group>
  );
}

useGLTF.preload(FLOWER_PATH);
