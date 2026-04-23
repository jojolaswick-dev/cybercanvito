import { useEffect, useRef, useState } from "react";
import { ImagePlus, Plus } from "lucide-react";
import type * as fabric from "fabric";
import { useEditor } from "./editor-context";

export function Canvas() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const { registerCanvas, addImageFromFile, openImagePicker, canvas, addPage } = useEditor();
  const [isDragging, setIsDragging] = useState(false);
  const [hasObjects, setHasObjects] = useState(false);

  useEffect(() => {
    registerCanvas(canvasElRef.current, wrapperRef.current);
    return () => registerCanvas(null, null);
  }, [registerCanvas]);

  // Track whether the artboard already has user content (to hide the central CTA)
  useEffect(() => {
    if (!canvas) return;
    const update = () => {
      // Count non-artboard objects
      const count = canvas
        .getObjects()
        .filter((o) => !(o as fabric.Object & { isArtboard?: boolean }).isArtboard).length;
      setHasObjects(count > 0);
    };
    update();
    canvas.on("object:added", update);
    canvas.on("object:removed", update);
    return () => {
      canvas.off("object:added", update);
      canvas.off("object:removed", update);
    };
  }, [canvas]);

  // Drag & drop handlers — must preventDefault on dragover to enable drop
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    if (!isDragging) setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide overlay when leaving the wrapper itself
    if (e.currentTarget === e.target) setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer?.files ?? []);
    const images = files.filter((f) => f.type.startsWith("image/"));
    images.forEach((f) => addImageFromFile(f));

    // Fallback: dragged image from another tab (URL)
    if (images.length === 0) {
      const url = e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain");
      if (url && /^https?:\/\//.test(url)) {
        // call indirectly via file path? use addImageFromFile-equivalent via context
        // use openImagePicker fallback only if URL load is needed — skip for now
        void url;
      }
    }
  };

  // Block the whole document from opening a dropped file in a new tab if user
  // misses the wrapper. Scoped to lifetime of this component.
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

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
      <div
        ref={wrapperRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="relative flex-1 overflow-hidden"
      >
        <canvas ref={canvasElRef} />

        {/* Central "+ Adicionar Imagem" CTA — visible while artboard is empty */}
        {!hasObjects && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <button
              type="button"
              onClick={openImagePicker}
              className="pointer-events-auto group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[oklch(0.7_0.05_280)] bg-white/40 px-8 py-6 text-[var(--background)] backdrop-blur-sm transition-all hover:border-[var(--neon-violet)] hover:bg-white/70 hover:shadow-[0_0_24px_oklch(0.55_0.28_295/0.35)]"
            >
              <ImagePlus className="h-7 w-7 text-[var(--neon-violet)]" />
              <span className="text-sm font-semibold">+ Adicionar Imagem</span>
              <span className="text-xs text-[oklch(0.45_0.02_270)]">
                Clique ou arraste uma imagem para o papel
              </span>
            </button>
          </div>
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[oklch(0.55_0.28_295/0.08)] ring-2 ring-inset ring-[var(--neon-violet)]">
            <div className="rounded-xl bg-white/90 px-5 py-3 text-sm font-semibold text-[var(--neon-violet)] shadow-[0_0_24px_oklch(0.55_0.28_295/0.4)]">
              Solte a imagem para inserir no papel
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
