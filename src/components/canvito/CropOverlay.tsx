import { useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Check, X } from "lucide-react";
import { useEditor } from "./editor-context";
import * as fabric from "fabric";

export function CropOverlay() {
  const { activeCanvas, setIsCropping, executeCrop } = useEditor();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const activeObject = activeCanvas?.getActiveObject();
  
  if (!activeObject || !(activeObject instanceof fabric.FabricImage)) {
    return null;
  }

  const img = activeObject as fabric.FabricImage;
  const originalElement = img.getElement() as HTMLImageElement;
  const imageSrc = originalElement.src;

  // We need to calculate the position of the overlay relative to the viewport
  // to position the floating buttons. For now, we'll use a fixed position or centered UI.
  
  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (croppedAreaPixels) {
      await executeCrop(croppedAreaPixels);
    }
  };

  const handleCancel = () => {
    setIsCropping(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative h-[80vh] w-[80vw] overflow-hidden rounded-xl border border-white/10 bg-[#121212]">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={undefined}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          showGrid={true}
          classes={{
            containerClassName: "bg-black/20",
            cropAreaClassName: "border-2 border-[var(--neon-cyan)] shadow-[0_0_20px_rgba(0,255,243,0.3)]",
          }}
        />
        
        {/* Actions Group */}
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/60 p-2 backdrop-blur-md border border-white/10 shadow-2xl">
          <button
            onClick={handleCancel}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-110 active:scale-95"
            title="Cancelar"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="h-6 w-px bg-white/20" />
          <button
            onClick={handleConfirm}
            className="flex h-10 px-6 items-center gap-2 rounded-full bg-[var(--neon-violet)] text-white font-bold shadow-[0_0_15px_oklch(0.55_0.28_295/0.5)] transition-all hover:shadow-[0_0_25px_oklch(0.55_0.28_295/0.8)] hover:scale-105 active:scale-95"
          >
            <Check className="h-5 w-5" />
            <span>Confirmar Recorte</span>
          </button>
        </div>

        {/* Zoom Slider */}
        <div className="absolute top-6 right-6 flex flex-col items-center gap-2 rounded-xl bg-black/40 p-3 backdrop-blur-md border border-white/10">
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 w-24 accent-[var(--neon-cyan)]"
          />
          <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Zoom</span>
        </div>
      </div>
    </div>
  );
}
