import { useState, useEffect } from "react";
import { Link2, Link2Off, X } from "lucide-react";
import { useEditor } from "./editor-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

export function ResizeModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { artboard, setArtboard } = useEditor();
  const [width, setWidth] = useState(artboard.width);
  const [height, setHeight] = useState(artboard.height);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [scale, setScale] = useState(100);

  // Update local state when modal opens
  useEffect(() => {
    if (open) {
      setWidth(artboard.width);
      setHeight(artboard.height);
      setScale(100);
    }
  }, [open, artboard]);

  const handleWidthChange = (val: string) => {
    const newWidth = parseInt(val) || 0;
    if (lockAspectRatio) {
      const ratio = artboard.height / artboard.width;
      setHeight(Math.round(newWidth * ratio));
    }
    setWidth(newWidth);
    setScale(Math.round((newWidth / artboard.width) * 100));
  };

  const handleHeightChange = (val: string) => {
    const newHeight = parseInt(val) || 0;
    if (lockAspectRatio) {
      const ratio = artboard.width / artboard.height;
      setWidth(Math.round(newHeight * ratio));
    }
    setHeight(newHeight);
    setScale(Math.round((newHeight / artboard.height) * 100));
  };

  const handleScaleChange = (val: number[]) => {
    const newScale = val[0];
    setScale(newScale);
    const factor = newScale / 100;
    setWidth(Math.round(artboard.width * factor));
    setHeight(Math.round(artboard.height * factor));
  };

  const handleApply = () => {
    setArtboard({ width, height });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--neon-violet)] bg-[#1A1625] text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold tracking-tight text-[var(--neon-cyan)]">
              Redimensionar Canvas
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Largura (px)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[var(--neon-cyan)] focus:ring-1 focus:ring-[var(--neon-cyan)] transition-all"
              />
            </div>
            <div className="space-y-2 relative">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Altura (px)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={height}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[var(--neon-cyan)] focus:ring-1 focus:ring-[var(--neon-cyan)] transition-all"
                />
                <button
                  onClick={() => setLockAspectRatio(!lockAspectRatio)}
                  className={`p-2 rounded-md transition-colors ${lockAspectRatio ? 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10' : 'text-white/30 hover:text-white/50'}`}
                >
                  {lockAspectRatio ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Escala</label>
              <span className="text-xs font-mono text-[var(--neon-cyan)]">{scale}%</span>
            </div>
            <Slider
              value={[scale]}
              min={1}
              max={200}
              step={1}
              onValueChange={handleScaleChange}
              className="py-4"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-md border border-white/20 bg-white/5 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="px-6 py-2 rounded-md bg-white text-sm font-bold text-[var(--background)] shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-[1.02] active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
