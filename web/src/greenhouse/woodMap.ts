import { useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/** Procedural pine grain — same map the raised beds use. */
export function useWoodMap() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#8b6239";
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 8; i++) {
      const y0 = (i / 8) * size;
      ctx.fillStyle =
        i % 2 === 0 ? "rgba(55,35,18,0.12)" : "rgba(255,220,170,0.06)";
      ctx.fillRect(0, y0, size, size / 8);
    }

    for (let i = 0; i < 48; i++) {
      const y = (i / 48) * size;
      ctx.strokeStyle = `rgba(40,24,12,${0.07 + (i % 4) * 0.03})`;
      ctx.lineWidth = 1 + (i % 3) * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 6) {
        ctx.lineTo(
          x,
          y + Math.sin(x * 0.04 + i * 0.7) * 2.2 + Math.sin(x * 0.01) * 1.2,
        );
      }
      ctx.stroke();
    }

    for (let k = 0; k < 5; k++) {
      const kx = 40 + ((k * 97) % 180);
      const ky = 30 + ((k * 53) % 200);
      const g = ctx.createRadialGradient(kx, ky, 1, kx, ky, 10 + (k % 3) * 3);
      g.addColorStop(0, "rgba(60,35,15,0.45)");
      g.addColorStop(1, "rgba(60,35,15,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 8, 5, k * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.repeat.set(2.5, 1.2);
    map.anisotropy = 4;
    map.needsUpdate = true;
    return map;
  }, []);
}
