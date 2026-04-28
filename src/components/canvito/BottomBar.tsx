import { StickyNote, Timer, Subtitles, Minus, Plus, LayoutGrid, Maximize2, Maximize, Undo2, Redo2 } from "lucide-react";
import { useEditor } from "./editor-context";

export function BottomBar() {
  const { zoom, setZoom, fitToScreen, pages, undo, redo, canUndo, canRedo } = useEditor();

  return (
    <footer className="sticky bottom-0 z-50 flex h-12 shrink-0 items-center justify-between gap-2 overflow-hidden border-t border-white/10 bg-cyber-bar px-2 text-white sm:px-3">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--electric-blue)] to-transparent opacity-60" />

      {/* Left */}
      <div className="flex min-w-0 shrink-0 items-center gap-1">
        <div className="mr-1 flex shrink-0 items-center gap-0.5 border-r border-white/10 pr-1 sm:mr-2 sm:gap-1 sm:pr-2">
          <button 
            onClick={undo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z)"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button 
            onClick={redo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Y)"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <FootBtn icon={StickyNote} label="Notas" />
        <FootBtn icon={Timer} label="Temporizador" />
        <FootBtn icon={Subtitles} label="Legendas" />

        <div className="ml-2 hidden rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-white/80 lg:block">
          {pages.length} {pages.length === 1 ? "página" : "páginas"}
        </div>
      </div>

      {/* Right - zoom + view */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2 md:gap-3">
        <button
          onClick={() => setZoom(Math.max(10, zoom - 10))}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <div className="relative flex w-20 min-w-0 shrink items-center sm:w-28 md:w-32 lg:w-44">
          <input
            type="range"
            min={10}
            max={400}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="cyber-slider w-full"
          />
        </div>

        <button
          onClick={() => setZoom(Math.min(400, zoom + 10))}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <span className="w-10 shrink-0 text-center text-xs font-medium tabular-nums text-white/80 sm:w-12">
          {zoom}%
        </span>

        <button
          onClick={fitToScreen}
          title="Ajustar à tela"
          className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white md:inline-flex"
        >
          <Maximize className="h-3.5 w-3.5" />
          Ajustar
        </button>

        <div className="mx-1 hidden h-5 w-px bg-white/15 md:block" />

        <div className="hidden items-center gap-1 md:flex">
          <FootBtn icon={LayoutGrid} />
          <FootBtn icon={Maximize2} />
        </div>
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
            var(--electric-blue) ${((zoom - 10) / 390) * 100}%,
            oklch(1 0 0 / 0.15) ${((zoom - 10) / 390) * 100}%,
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
    <button className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-1 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:px-2">
      <Icon className="h-3.5 w-3.5" />
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
