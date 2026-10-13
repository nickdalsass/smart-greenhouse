import { useMemo } from "react";
import {
  CanvasTexture,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import {
  EXT_HALF_X,
  EXT_HALF_Z,
  GRASS_CENTER,
  GRASS_FADE_START,
  GRASS_RADIUS,
} from "./config";

/** Soft pad around the building — flat under / just outside the walls. */
const PAD_X = EXT_HALF_X + 3;
const PAD_Z = EXT_HALF_Z + 3;
const ROLL_BLEND = 14; // inches to ramp from flat → full roll

function makeGrassMap() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#3d6b32";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 4 + Math.random() * 18;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = Math.random();
    const col =
      tone < 0.35
        ? "rgba(28,55,24,0.35)"
        : tone < 0.7
          ? "rgba(90,140,55,0.28)"
          : "rgba(55,100,40,0.22)";
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle =
      Math.random() > 0.5
        ? "rgba(20,40,16,0.35)"
        : "rgba(140,190,70,0.22)";
    ctx.fillRect(x, y, 1 + Math.random(), 1 + Math.random() * 2);
  }

  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = RepeatWrapping;
  map.wrapT = RepeatWrapping;
  map.repeat.set(6, 6);
  map.anisotropy = 4;
  map.needsUpdate = true;
  return map;
}

function makeFadeMap() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.5 * GRASS_FADE_START,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.5, "#ffffff");
  g.addColorStop(0.72, "#888888");
  g.addColorStop(0.88, "#222222");
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const map = new CanvasTexture(canvas);
  map.needsUpdate = true;
  return map;
}

/** Layered sines — cheap rolling terrain. */
function bump(x: number, z: number) {
  return (
    Math.sin(x * 0.055) * Math.cos(z * 0.048) * 2.4 +
    Math.sin(x * 0.12 + 1.7) * Math.cos(z * 0.11 - 0.4) * 1.1 +
    Math.sin(x * 0.28 + z * 0.19) * 0.45 +
    Math.sin(x * 0.5) * Math.sin(z * 0.42) * 0.2
  );
}

function rollAmount(worldX: number, worldZ: number) {
  // 0 inside greenhouse pad, 1 well outside — only then does terrain roll
  const ox = Math.max(0, Math.abs(worldX) - PAD_X) / ROLL_BLEND;
  const oz = Math.max(0, Math.abs(worldZ) - PAD_Z) / ROLL_BLEND;
  return Math.min(1, Math.hypot(ox, oz));
}

function makeTerrain() {
  const segs = 72;
  const geo = new PlaneGeometry(GRASS_RADIUS * 2, GRASS_RADIUS * 2, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const [cx, , cz] = GRASS_CENTER;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z) / GRASS_RADIUS;
    if (r > 1) {
      pos.setY(i, 0);
      continue;
    }
    const edge = Math.max(0, 1 - r * r);
    const outside = rollAmount(x + cx, z + cz);
    pos.setY(i, bump(x, z) * outside * outside * edge * edge);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Grassy disc on gentle hills — fades to the void past the hose. */
export function Ground() {
  const { map, alphaMap, geometry } = useMemo(
    () => ({
      map: makeGrassMap(),
      alphaMap: makeFadeMap(),
      geometry: makeTerrain(),
    }),
    [],
  );

  return (
    <mesh
      name="grass"
      geometry={geometry}
      position={GRASS_CENTER}
      receiveShadow
    >
      <meshStandardMaterial
        map={map}
        alphaMap={alphaMap}
        color="#5a8f45"
        roughness={0.95}
        metalness={0}
        transparent
        depthWrite={false}
        alphaTest={0.02}
      />
    </mesh>
  );
}
