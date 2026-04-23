import { Plus, ChevronDown } from "lucide-react";

export function Canvas({ zoom }: { zoom: number }) {
  const size = 540 * (zoom / 100);

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

      <div className="relative flex flex-1 items-center justify-center overflow-auto p-8">
        <div className="flex flex-col items-center gap-6">
          {/* Paper */}
          <div
            className="relative bg-white shadow-canvas transition-[width,height] duration-200"
            style={{ width: size, height: size }}
          >
            {/* corner indicators */}
            <CornerDot className="-left-1 -top-1" />
            <CornerDot className="-right-1 -top-1" />
            <CornerDot className="-bottom-1 -left-1" />
            <CornerDot className="-bottom-1 -right-1" />
          </div>

          {/* Add page */}
          <div className="flex w-full max-w-[420px] items-stretch gap-1">
            <button className="group flex flex-1 items-center justify-center gap-2 rounded-lg border border-[oklch(0.7_0.02_250)] bg-white/80 px-4 py-2.5 text-sm font-medium text-[var(--background)] backdrop-blur transition-all hover:border-[var(--neon-violet)] hover:bg-white hover:text-[var(--neon-violet)] hover:shadow-[0_0_16px_oklch(0.55_0.28_295/0.25)]">
              <Plus className="h-4 w-4" />
              Adicionar página
            </button>
            <button className="flex items-center justify-center rounded-lg border border-[oklch(0.7_0.02_250)] bg-white/80 px-2 text-[var(--background)] backdrop-blur transition-all hover:border-[var(--neon-violet)] hover:text-[var(--neon-violet)]">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CornerDot({ className }: { className?: string }) {
  return (
    <span
      className={`absolute h-2 w-2 rounded-full bg-[var(--electric-blue)] shadow-[0_0_8px_var(--electric-blue)] ${className ?? ""}`}
    />
  );
}
