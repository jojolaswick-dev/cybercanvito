import { StickyNote, Timer, Subtitles, Minus, Plus, LayoutGrid, Maximize2, Files } from "lucide-react";

export function BottomBar({
  zoom,
  setZoom,
}: {
  zoom: number;
  setZoom: (n: number) => void;
}) {
  return (
    <footer className="relative z-30 flex h-11 items-center justify-between border-t border-white/10 bg-cyber-bar px-3 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--electric-blue)] to-transparent opacity-60" />

      {/* Left */}
      <div className="flex items-center gap-1">
        <FootBtn icon={StickyNote} label="Notas" />
        <FootBtn icon={Timer} label="Temporizador" />
        <FootBtn icon={Subtitles} label="Legendas" />
      </div>

      {/* Right - zoom + view */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setZoom(Math.max(10, zoom - 10))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <div className="relative flex w-44 items-center">
          <input
            type="range"
            min={10}
            max={200}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="cyber-slider w-full"
          />
        </div>

        <button
          onClick={() => setZoom(Math.min(200, zoom + 10))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <span className="w-10 text-center text-xs font-medium tabular-nums text-white/80">
          {zoom}%
        </span>

        <div className="mx-1 h-5 w-px bg-white/15" />

        <FootBtn icon={Files} label="Páginas" />
        <span className="text-xs text-white/60">1/1</span>
        <FootBtn icon={LayoutGrid} />
        <FootBtn icon={Maximize2} />
      </div>

      <style>{`
        .cyber-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            var(--neon-violet) 0%,
            var(--electric-blue) ${((zoom - 10) / 190) * 100}%,
            oklch(1 0 0 / 0.15) ${((zoom - 10) / 190) * 100}%,
            oklch(1 0 0 / 0.15) 100%
          );
          outline: none;
        }
        .cyber-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 999px;
          background: white;
          border: 2px solid var(--electric-blue);
          box-shadow: 0 0 10px var(--electric-blue);
          cursor: pointer;
        }
        .cyber-slider::-moz-range-thumb {
          height: 14px;
          width: 14px;
          border-radius: 999px;
          background: white;
          border: 2px solid var(--electric-blue);
          box-shadow: 0 0 10px var(--electric-blue);
          cursor: pointer;
        }
      `}</style>
    </footer>
  );
}

function FootBtn({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label?: string;
}) {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white">
      <Icon className="h-3.5 w-3.5" />
      {label && <span>{label}</span>}
    </button>
  );
}
