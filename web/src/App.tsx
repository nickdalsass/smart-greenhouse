import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { DoorClosed, DoorOpen, Droplets, House, Tags } from "lucide-react";
import { Greenhouse } from "./greenhouse/Greenhouse";
import {
  bedIdFor,
  bedKeyFor,
  OUTSIDE_VIEW,
  presetFor,
  type BedKey,
  type SceneView,
} from "./greenhouse/views";
import { Overlay } from "./Overlay";

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`tool-btn${active ? " is-active" : ""}${disabled ? " is-disabled" : ""}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      <span className="tool-btn-label">{label}</span>
    </button>
  );
}

const VOID = "#050a08";
const INTRO_FROM: [number, number, number] = [155, 105, 175];
const INTRO_MS = 1700;

type OrbitLike = {
  target: { set: (x: number, y: number, z: number) => void };
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  enablePan: boolean;
  enabled: boolean;
  update: () => void;
};

function ViewRig({ view, enabled }: { view: SceneView; enabled: boolean }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as OrbitLike | null;

  useEffect(() => {
    if (!enabled) return;
    const preset = presetFor(view);
    camera.position.set(...preset.position);
    if (controls) {
      controls.target.set(...preset.target);
      controls.minDistance = preset.minDistance;
      controls.maxDistance = preset.maxDistance;
      controls.minPolarAngle = preset.minPolarAngle;
      controls.maxPolarAngle = preset.maxPolarAngle;
      controls.enablePan = false;
      controls.update();
    }
    invalidate();
  }, [view, enabled, camera, controls, invalidate]);

  return null;
}

/** Ease camera in once Suspense content is mounted. */
function SceneIntro({ onDone }: { onDone: () => void }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as OrbitLike | null;
  const started = useRef<number | null>(null);
  const finished = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    camera.position.set(...INTRO_FROM);
    if (controls) {
      controls.target.set(...OUTSIDE_VIEW.target);
      controls.enabled = false;
      controls.update();
    }
    invalidate();
  }, [camera, controls, invalidate]);

  useFrame(() => {
    if (finished.current) return;
    if (started.current == null) started.current = performance.now();
    const t = Math.min(1, (performance.now() - started.current) / INTRO_MS);
    const e = 1 - (1 - t) ** 3;
    const [fx, fy, fz] = INTRO_FROM;
    const [tx, ty, tz] = OUTSIDE_VIEW.position;
    camera.position.set(
      fx + (tx - fx) * e,
      fy + (ty - fy) * e,
      fz + (tz - fz) * e,
    );
    controls?.update();
    invalidate();
    if (t >= 1) {
      finished.current = true;
      if (controls) controls.enabled = true;
      onDoneRef.current();
    }
  });

  return null;
}

function InvalidateOnToggle({
  showLabels,
  showRoof,
  view,
  watering,
}: {
  showLabels: boolean;
  showRoof: boolean;
  view: SceneView;
  watering: boolean;
}) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [showLabels, showRoof, view, watering, invalidate]);
  return null;
}

export default function App() {
  const [showLabels, setShowLabels] = useState(false);
  const [showRoof, setShowRoof] = useState(true);
  const [view, setView] = useState<SceneView>("outside");
  const [watering, setWatering] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  const onIntroDone = useCallback(() => setIntroDone(true), []);
  const onSceneReady = useCallback(() => setSceneReady(true), []);

  const preset = presetFor(view);
  const insideLike = view !== "outside";
  const inBed = view === "back" || view === "left" || view === "right";
  const selectedBed = inBed ? bedIdFor(view) : null;

  const wateringBeds: BedKey[] = watering
    ? view === "back" || view === "left" || view === "right"
      ? [view]
      : ["back", "left", "right"]
    : [];

  const liveFrame = watering || (sceneReady && !introDone);

  return (
    <div className="app">
      <div className={`canvas-wrap${sceneReady ? " is-ready" : ""}`}>
        <Canvas
          frameloop={liveFrame ? "always" : "demand"}
          shadows
          camera={{ position: INTRO_FROM, fov: 35 }}
          dpr={[1, 1.75]}
        >
          <color attach="background" args={[VOID]} />
          <fog attach="fog" args={[VOID, 160, 340]} />

          <ambientLight intensity={0.7} color="#fff0d0" />
          <hemisphereLight
            intensity={0.55}
            color="#ffe39a"
            groundColor="#2a3520"
          />
          <directionalLight
            castShadow
            intensity={3.2}
            position={[70, 110, 55]}
            color="#ffd24a"
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0002}
            shadow-normalBias={0.035}
            shadow-camera-far={300}
            shadow-camera-left={-70}
            shadow-camera-right={70}
            shadow-camera-top={70}
            shadow-camera-bottom={-70}
          />
          <directionalLight
            intensity={1.0}
            position={[-40, 60, 30]}
            color="#ffc05a"
          />
          <pointLight
            position={[20, 45, 25]}
            intensity={1.6}
            distance={200}
            decay={2}
            color="#ffd978"
          />

          <Environment preset="warehouse" environmentIntensity={0.18} />
          <Suspense fallback={null}>
            <Greenhouse
              showRoof={inBed ? false : showRoof}
              showLabels={showLabels}
              wateringBeds={wateringBeds}
              onEnterInside={() => setView("inside")}
              onSelectBed={
                view === "outside" ? undefined : (bed: BedKey) => setView(bed)
              }
            />
            <ReadyMark onReady={onSceneReady} />
            {sceneReady && !introDone && <SceneIntro onDone={onIntroDone} />}
          </Suspense>
          <OrbitControls
            makeDefault
            enabled={introDone}
            target={preset.target}
            enableDamping
            dampingFactor={0.06}
            enablePan={false}
            minDistance={preset.minDistance}
            maxDistance={preset.maxDistance}
            minPolarAngle={preset.minPolarAngle}
            maxPolarAngle={preset.maxPolarAngle}
          />
          <ViewRig view={view} enabled={introDone} />
          <InvalidateOnToggle
            showLabels={showLabels}
            showRoof={showRoof}
            view={view}
            watering={watering}
          />
        </Canvas>
      </div>

      <Overlay
        selectedBed={selectedBed}
        onSelectBed={(id) => {
          if (selectedBed === id) {
            setView("inside");
            return;
          }
          const key = bedKeyFor(id);
          if (key) setView(key);
        }}
      />

      <div className="tool-rail" role="toolbar" aria-label="Scene controls">
        <ToolButton
          label="Labels"
          active={showLabels}
          onClick={() => setShowLabels((v) => !v)}
        >
          <Tags size={18} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton
          label="Roof"
          active={showRoof && !inBed}
          disabled={insideLike}
          onClick={() => setShowRoof((v) => !v)}
        >
          <House size={18} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton
          label={view === "outside" ? "Inside" : inBed ? "Inside" : "Outside"}
          active={insideLike}
          onClick={() => {
            if (view === "outside") setView("inside");
            else if (inBed) setView("inside");
            else setView("outside");
          }}
        >
          {view === "inside" ? (
            <DoorClosed size={18} strokeWidth={1.75} />
          ) : (
            <DoorOpen size={18} strokeWidth={1.75} />
          )}
        </ToolButton>
        <ToolButton
          label="Water"
          active={watering}
          onClick={() => setWatering((v) => !v)}
        >
          <Droplets size={18} strokeWidth={1.75} />
        </ToolButton>
      </div>
    </div>
  );
}

function ReadyMark({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}
