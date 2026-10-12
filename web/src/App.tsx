import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { GreenhouseScene } from "./scene/GreenhouseScene";
import { Overlay } from "./Overlay";

export default function App() {
  const [selectedBed, setSelectedBed] = useState<number | null>(null);

  return (
    <div className="app">
      <div className="canvas-wrap">
        <Canvas
          camera={{ position: [5.5, 3.2, 7.2], fov: 42 }}
          dpr={[1, 1.75]}
        >
          <color attach="background" args={["#07110c"]} />
          <fog attach="fog" args={["#07110c", 10, 22]} />
          <ambientLight intensity={0.35} />
          <directionalLight
            position={[6, 10, 3]}
            intensity={1.35}
            color="#f2ffe0"
          />
          <directionalLight
            position={[-4, 3, -2]}
            intensity={0.35}
            color="#7ec8a3"
          />
          <Environment preset="forest" environmentIntensity={0.35} />
          <GreenhouseScene onSelectBed={setSelectedBed} />
          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.45}
            scale={14}
            blur={2.5}
            far={6}
          />
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={4}
            maxDistance={14}
            maxPolarAngle={Math.PI / 2.08}
            target={[0, 1, 0]}
          />
        </Canvas>
      </div>
      <Overlay selectedBed={selectedBed} />
    </div>
  );
}
