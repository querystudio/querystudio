import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function FpsCounter() {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const loop = (time: number) => {
      frameCount++;
      const elapsed = time - lastTime;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        frameCount = 0;
        lastTime = time;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-2 top-2 z-50 flex items-center justify-center rounded bg-black/50 px-2 py-1 text-xs font-mono text-white backdrop-blur-sm"
      )}
    >
      <span className={cn(fps < 30 ? "text-red-400" : fps < 55 ? "text-yellow-400" : "text-green-400")}>
        {fps}
      </span>
      <span className="ml-1 text-muted-foreground">FPS</span>
    </div>
  );
}
