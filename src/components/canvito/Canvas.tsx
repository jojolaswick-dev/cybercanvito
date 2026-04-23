import { useEffect, useRef } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { useEditor } from "./editor-context";

export function Canvas() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const { registerCanvas } = useEditor();

  useEffect(() => {
    registerCanvas(canvasElRef.current, wrapperRef.current);
    return () => registerCanvas(null, null);
  }, [registerCanvas]);

  return (
    <div className="relative flex flex-1 flex-col bg-[var(--canvas-bg)]">
      {/* Subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(oklch(0.75 0.02 250) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Fabric workspace wrapper – this IS the gray container managed by the engine */}
      <div ref={wrapperRef} className="relative flex-1 overflow-hidden">
        <canvas ref={canvasElRef} />
      </div>

      {/* Add page button overlays the bottom of the workspace */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <div className="pointer-events-auto flex items-stretch gap-1">
          <button className="group flex items-center justify-center gap-2 rounded-lg border border-[oklch(0.7_0.02_250)] bg-white/85 px-4 py-2.5 text-sm font-medium text-[var(--background)] backdrop-blur transition-all hover:border-[var(--neon-violet)] hover:bg-white hover:text-[var(--neon-violet)] hover:shadow-[0_0_16px_oklch(0.55_0.28_295/0.25)]">
            <Plus className="h-4 w-4" />
            Adicionar página
          </button>
          <button className="flex items-center justify-center rounded-lg border border-[oklch(0.7_0.02_250)] bg-white/85 px-2 text-[var(--background)] backdrop-blur transition-all hover:border-[var(--neon-violet)] hover:text-[var(--neon-violet)]">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
